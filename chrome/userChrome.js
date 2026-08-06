// ==UserScript==
// @name            userChrome.js
// @description     Vivaldi Mods Loader
// @license         MIT License
// @compatibility   Vivaldi 8.1
// @version         0.2.6
// @charset         UTF-8
// @homepageURL     https://github.com/benzBrake/VivaldiMods
// @note            20260806 增加全局 modal API
// @note            20260725 修复长菜单分隔线收缩并统一使用 border-bottom 绘制
// @note            20260724 菜单标签增加 Windows 风格助记键语法和按键分发
// @note            20260724 收紧菜单项间距并禁止菜单横向滚动
// @note            20260723 菜单项增加右键回调、自定义样式类和可恢复叠菜单
// @note            20260722 增加常驻 popup 注册与静态级联子菜单 API
// @note            20260717 增加自绘弹出菜单 menu API
// @note            20260414 增加全局通知 alert API
// @note            20260410 增加 ModManager 状态管理与条件注入
// @note            20241023 增加 $ 函数
// @note            20240412 Promise 化改造
// @note            20240308 修改载入顺序
// @note            20231019 fix: 重复载入脚本
// ==/UserScript==
(async function () {
    if (window.userChrome_js) return;

    const MODS_DIRECTORY_NAME = 'chrome';
    const MODS_SCRIPT_EXTENSION = '.js';
    const MODS_STYLE_EXTENSION = '.css';
    const MODS_SKIP_DIRS = ['deprecated'];
    const MODS_SKIP_LIST = ['userChrome.js'];
    const MODS_INTERNAL_IDS = ['userChromeJS/modsManager.ac.js'];
    const MODS_STATE_KEY = 'USERCHROME_MODS_STATE';
    const MODS_STATE_VERSION = 1;
    const MODS_CHANGED_EVENT = 'userChrome.mods.changed';
    const ALERT_STYLE_ID = 'userchrome-alert-style';
    const ALERT_CONTAINER_ID = 'userchrome-alert-container';
    const ALERT_DEFAULT_DURATION = 3000;
    const ALERT_TYPES = ['info', 'success', 'warn', 'error'];
    const MENU_STYLE_ID = 'userchrome-menu-style';
    const MENU_ROOT_ID = 'userchrome-menu-root';
    const MENU_VIEWPORT_MARGIN = 8;
    const MODAL_STYLE_ID = 'userchrome-modal-style';
    const MODAL_ID = 'userchrome-modal';
    const delegatedEventListeners = new WeakMap();

    function addDelegatedEventListener(element, event, selector, handler, listener) {
        const listeners = delegatedEventListeners.get(element) || [];
        listeners.push({ event, selector, handler, listener });
        delegatedEventListeners.set(element, listeners);
    }

    function removeDelegatedEventListeners(element, event, selector, handler) {
        const listeners = delegatedEventListeners.get(element) || [];
        const remainingListeners = [];

        listeners.forEach(function (listenerInfo) {
            if (listenerInfo.event === event && listenerInfo.selector === selector && listenerInfo.handler === handler) {
                element.removeEventListener(event, listenerInfo.listener);
            } else {
                remainingListeners.push(listenerInfo);
            }
        });

        if (remainingListeners.length) {
            delegatedEventListeners.set(element, remainingListeners);
        } else {
            delegatedEventListeners.delete(element);
        }
    }

    function $(selector, context) {
        context = context || document;
        this.elements = [];
        if (typeof selector === 'string') {
            if (selector === 'document') {
                this.elements = [document];
            } else {
                this.elements = [...context.querySelectorAll(selector)];
            }
        } else if (selector instanceof Document) {
            this.elements = [selector];
        } else if (selector instanceof HTMLElement) {
            this.elements = [selector];
        }

        Object.defineProperty(this, 'length', {
            get: function () {
                return this.elements.length;
            },
            configurable: true
        });

        const handler = {
            get: function (target, prop) {
                if (typeof prop === 'string' && !isNaN(prop)) {
                    return target.elements[prop];
                }
                return target[prop];
            }
        };

        return new Proxy(this, handler);
    }

    $.prototype.each = function (callback) {
        this.elements.forEach(function (el, index) {
            callback.call(el, index, el);
        });
        return this;
    };

    $.prototype.find = function (selector) {
        const results = [];
        this.each(function () {
            results.push(...this.querySelectorAll(selector));
        });
        this.elements = results;
        return this;
    };

    $.prototype.closest = function (selector) {
        const closestElements = [];
        this.each(function () {
            let current = this;
            while (current) {
                if (current.matches(selector)) {
                    closestElements.push(current);
                    break;
                }
                current = current.parentElement;
            }
        });
        const obj = new $();
        obj.elements = closestElements;
        return obj;
    };

    $.prototype.hasClass = function (className) {
        let hasClass = false;
        this.each(function () {
            if (this.classList.contains(className)) {
                hasClass = true;
            }
        });
        return hasClass;
    };

    $.prototype.addClass = function (className) {
        return this.each(function () {
            this.classList.add(className);
        });
    };

    $.prototype.removeClass = function (className) {
        return this.each(function () {
            this.classList.remove(className);
        });
    };

    $.prototype.toggleClass = function (className) {
        return this.each(function () {
            this.classList.toggle(className);
        });
    };

    $.prototype.on = function (event, selectorOrHandler, handler) {
        if (typeof selectorOrHandler === 'string' && typeof handler === 'function') {
            return this.each(function () {
                const element = this;
                const delegatedHandler = function (e) {
                    const potentialElements = this.querySelectorAll(selectorOrHandler);
                    let target = e.target;
                    while (target && target !== this) {
                        if ([...potentialElements].includes(target)) {
                            handler.call(target, e);
                            break;
                        }
                        target = target.parentNode;
                    }
                };
                element.addEventListener(event, delegatedHandler);
                addDelegatedEventListener(element, event, selectorOrHandler, handler, delegatedHandler);
            });
        }

        if (typeof selectorOrHandler === 'function') {
            return this.each(function () {
                this.addEventListener(event, selectorOrHandler);
            });
        }

        throw new TypeError('Handler must be a function');
    };

    $.prototype.off = function (event, selectorOrHandler, handler) {
        return this.each(function () {
            const element = this;

            if (!event) {
                const clone = element.cloneNode(true);
                element.parentNode.replaceChild(clone, element);
                return;
            }

            if (typeof selectorOrHandler === 'string' && typeof handler === 'function') {
                removeDelegatedEventListeners(element, event, selectorOrHandler, handler);
            } else if (typeof selectorOrHandler === 'function') {
                element.removeEventListener(event, selectorOrHandler);
            } else {
                throw new TypeError('Handler must be a function');
            }
        });
    };

    $.prototype.trigger = function (eventName, detail) {
        const event = new CustomEvent(eventName, {
            bubbles: true,
            cancelable: true,
            detail: detail
        });
        return this.each(function () {
            this.dispatchEvent(event);
        });
    };

    $.prototype.get = function (index) {
        return this.elements[index];
    };

    window.$ = function (selector, context) {
        return new $(selector, context);
    };

    function createDefaultState() {
        return {
            version: MODS_STATE_VERSION,
            disabled: {}
        };
    }

    function sanitizeState(state) {
        const nextState = createDefaultState();
        if (!state || typeof state !== 'object') {
            return nextState;
        }

        if (state.disabled && typeof state.disabled === 'object') {
            Object.keys(state.disabled).forEach(function (id) {
                if (state.disabled[id] === true) {
                    nextState.disabled[id] = true;
                }
            });
        }

        return nextState;
    }

    function normalizePath(path) {
        return String(path || '').replace('/crxfs/', '').replace(/^\/+/, '');
    }

    function toModId(path) {
        return normalizePath(path).replace(new RegExp('^' + MODS_DIRECTORY_NAME + '/'), '');
    }

    function compareEntries(first, second) {
        const firstName = String(first.name || '').toLowerCase();
        const secondName = String(second.name || '').toLowerCase();
        return firstName.localeCompare(secondName, 'en', {
            numeric: true,
            sensitivity: 'base'
        });
    }

    function isStorageAvailable() {
        return !!(chrome && chrome.storage && chrome.storage.local);
    }

    function storageGetAsync(key) {
        return new Promise(function (resolve, reject) {
            if (!isStorageAvailable()) {
                reject(new Error('chrome.storage.local is unavailable.'));
                return;
            }

            chrome.storage.local.get([key], function (result) {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve(result ? result[key] : undefined);
            });
        });
    }

    function storageSetAsync(payload) {
        return new Promise(function (resolve, reject) {
            if (!isStorageAvailable()) {
                reject(new Error('chrome.storage.local is unavailable.'));
                return;
            }

            chrome.storage.local.set(payload, function () {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve();
            });
        });
    }

    function waitForCondition(condition, callback, timeout) {
        setTimeout(function wait() {
            const result = typeof condition === 'function' ? condition() : condition;
            if (result) {
                callback(result);
                return;
            }
            setTimeout(wait, timeout || 300);
        }, timeout || 300);
    }

    function getPreferredLocales() {
        const locales = [];
        const primary = (chrome && chrome.i18n && typeof chrome.i18n.getUILanguage === 'function')
            ? chrome.i18n.getUILanguage()
            : (navigator.language || 'en-US');

        function pushLocale(value) {
            if (!value) {
                return;
            }

            const normalized = String(value).replace('_', '-');
            const lower = normalized.toLowerCase();
            if (!locales.includes(lower)) {
                locales.push(lower);
            }

            const base = lower.split('-')[0];
            if (base && !locales.includes(base)) {
                locales.push(base);
            }
        }

        pushLocale(primary);
        pushLocale(document.documentElement && document.documentElement.lang);
        pushLocale('en-US');
        pushLocale('en');
        return locales;
    }

    function getLocalizedValue(metadata, key) {
        if (!metadata || typeof metadata !== 'object') {
            return '';
        }

        const locales = getPreferredLocales();
        const metadataKeys = Object.keys(metadata);
        for (const locale of locales) {
            const matchKey = metadataKeys.find(function (candidate) {
                const normalizedCandidate = candidate.toLowerCase();
                return normalizedCandidate === (key + ':' + locale).toLowerCase();
            });
            if (matchKey && metadata[matchKey]) {
                return metadata[matchKey];
            }
        }

        return metadata[key] || '';
    }

    function readEntryText(entry, maxChars) {
        return new Promise(function (resolve) {
            if (!entry || !entry.isFile || typeof entry.file !== 'function') {
                resolve('');
                return;
            }

            entry.file(function (file) {
                try {
                    const blob = typeof maxChars === 'number' ? file.slice(0, maxChars) : file;
                    const reader = new FileReader();
                    reader.onload = function () {
                        resolve(typeof reader.result === 'string' ? reader.result : '');
                    };
                    reader.onerror = function () {
                        resolve('');
                    };
                    reader.readAsText(blob);
                } catch (error) {
                    console.warn('[userChrome.js] Failed to read mod file.', entry.fullPath, error);
                    resolve('');
                }
            }, function () {
                resolve('');
            });
        });
    }

    function parseKeyValueMetadata(text, commentPrefix, startMarker, endMarker) {
        const metadata = {};
        if (!text) {
            return metadata;
        }

        const startIndex = text.indexOf(startMarker);
        const endIndex = text.indexOf(endMarker, startIndex + startMarker.length);
        if (startIndex === -1 || endIndex === -1) {
            return metadata;
        }

        const block = text.slice(startIndex, endIndex + endMarker.length);
        block.split(/\r?\n/).forEach(function (line) {
            const normalized = line.replace(commentPrefix, '').trim();
            const match = normalized.match(/^@([^\s]+)\s+(.+)$/);
            if (!match) {
                return;
            }

            const key = match[1];
            const value = match[2].trim();
            if (!value) {
                return;
            }

            if (key === 'note') {
                metadata.notes = metadata.notes || [];
                metadata.notes.push(value);
                return;
            }

            metadata[key] = value;
        });

        return metadata;
    }

    function parseCssMetadata(text) {
        const metadata = {};
        if (!text) {
            return metadata;
        }

        const match = text.match(/\/\*([\s\S]*?)\*\//);
        if (!match) {
            return metadata;
        }

        const lines = match[1].split(/\r?\n/);
        const plainLines = [];
        lines.forEach(function (line) {
            const normalized = line.replace(/^\s*\*\s?/, '').trim();
            if (!normalized) {
                return;
            }

            if (normalized === '==UserStyle==' || normalized === '==/UserStyle==') {
                return;
            }

            const tagMatch = normalized.match(/^@([^\s]+)\s+(.+)$/);
            if (tagMatch) {
                const key = tagMatch[1];
                const value = tagMatch[2].trim();
                if (key === 'note') {
                    metadata.notes = metadata.notes || [];
                    metadata.notes.push(value);
                } else {
                    metadata[key] = value;
                }
                return;
            }

            plainLines.push(normalized);
        });

        if (plainLines.length) {
            metadata.description = metadata.description || plainLines[0];
        }

        return metadata;
    }

    async function parseModMetadata(entry, type) {
        const text = await readEntryText(entry, 4096);
        if (!text) {
            return {};
        }

        if (type === 'js') {
            return parseKeyValueMetadata(text, /^\s*\/\/\s?/, '==UserScript==', '==/UserScript==');
        }

        if (type === 'css') {
            return parseCssMetadata(text);
        }

        return {};
    }

    function sanitizeAlertOptions(message, options) {
        const normalizedMessage = typeof message === 'string' ? message.trim() : String(message || '').trim();
        const settings = options && typeof options === 'object' ? options : {};
        const type = ALERT_TYPES.includes(settings.type) ? settings.type : 'info';
        const duration = Number.isFinite(settings.duration) ? Math.max(0, settings.duration) : ALERT_DEFAULT_DURATION;
        return {
            message: normalizedMessage,
            title: typeof settings.title === 'string' ? settings.title.trim() : '',
            type: type,
            duration: duration,
            closable: settings.closable !== false,
            onClick: typeof settings.onClick === 'function' ? settings.onClick : null
        };
    }

    function createMenuApi() {
        const state = {
            root: null,
            registry: new Map(),
            registrationLocks: new Set(),
            current: null,
            dynamicCounter: 0
        };

        function ensureStyle() {
            if (document.getElementById(MENU_STYLE_ID) || !document.head) {
                return !!document.getElementById(MENU_STYLE_ID);
            }

            const style = document.createElement('style');
            style.id = MENU_STYLE_ID;
            style.textContent = `
                #${MENU_ROOT_ID} {
                    position: fixed;
                    inset: 0;
                    z-index: 2147483646;
                    pointer-events: none;
                }

                #${MENU_ROOT_ID} .userchrome-menu {
                    position: fixed;
                    display: flex;
                    flex-direction: column;
                    box-sizing: border-box;
                    min-width: min(192px, calc(100vw - ${MENU_VIEWPORT_MARGIN * 2}px));
                    max-width: min(360px, calc(100vw - ${MENU_VIEWPORT_MARGIN * 2}px));
                    max-height: min(480px, calc(100vh - ${MENU_VIEWPORT_MARGIN * 2}px));
                    padding: 4px;
                    overflow-x: hidden;
                    overflow-y: auto;
                    border: 1px solid var(--colorBorder, rgba(0, 0, 0, 0.2));
                    border-radius: 6px;
                    background: var(--colorBg, #fff);
                    color: var(--colorFg, #222);
                    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.24);
                    pointer-events: auto;
                }

                #${MENU_ROOT_ID} .userchrome-menu[hidden] {
                    display: none !important;
                }

                #${MENU_ROOT_ID} .userchrome-menu-item {
                    display: grid;
                    grid-template-columns: 16px minmax(0, 1fr) auto 14px;
                    column-gap: 8px;
                    align-items: center;
                    box-sizing: border-box;
                    width: 100%;
                    min-height: 28px;
                    padding: 3px 8px;
                    border: 0;
                    border-radius: 4px;
                    background: transparent;
                    color: inherit;
                    font: inherit;
                    font-size: 13px;
                    line-height: 1.35;
                    text-align: left;
                    cursor: pointer;
                }

                #${MENU_ROOT_ID} .userchrome-menu-item:hover,
                #${MENU_ROOT_ID} .userchrome-menu-item:focus-visible,
                #${MENU_ROOT_ID} .userchrome-menu-item[aria-expanded="true"] {
                    background: var(--colorHighlightBg, rgba(0, 102, 204, 0.16));
                    color: var(--colorHighlightFg, inherit);
                    outline: none;
                }

                #${MENU_ROOT_ID} .userchrome-menu-item:disabled {
                    color: var(--colorFgFaded, rgba(34, 34, 34, 0.45));
                    cursor: default;
                }

                #${MENU_ROOT_ID} .userchrome-menu-item:disabled:hover,
                #${MENU_ROOT_ID} .userchrome-menu-item:disabled[aria-expanded="true"] {
                    background: transparent;
                }

                #${MENU_ROOT_ID} .userchrome-menu-check {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 16px;
                    height: 16px;
                    font-size: 14px;
                    font-weight: 700;
                    line-height: 1;
                    text-align: center;
                }

                #${MENU_ROOT_ID} .userchrome-menu-icon {
                    display: block;
                    width: 16px;
                    height: 16px;
                    object-fit: contain;
                }

                #${MENU_ROOT_ID} .userchrome-menu-label {
                    min-width: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                #${MENU_ROOT_ID} .userchrome-menu-accesskey {
                    text-decoration: underline;
                    text-decoration-thickness: 1px;
                    text-underline-offset: 2px;
                }

                #${MENU_ROOT_ID} .userchrome-menu-shortcut {
                    margin-left: 18px;
                    color: var(--colorFgFaded, rgba(34, 34, 34, 0.65));
                    font-size: 12px;
                    white-space: nowrap;
                }

                #${MENU_ROOT_ID} .userchrome-menu-arrow {
                    width: 14px;
                    color: var(--colorFgFaded, rgba(34, 34, 34, 0.65));
                    text-align: center;
                }

                #${MENU_ROOT_ID} .userchrome-menu-separator {
                    position: relative;
                    flex: 0 0 9px;
                    height: 9px;
                    margin: 0 6px;
                }

                #${MENU_ROOT_ID} .userchrome-menu-separator::after {
                    content: '';
                    position: absolute;
                    top: 4px;
                    right: 0;
                    left: 0;
                    border-bottom: 1px solid var(--colorBorder, rgba(0, 0, 0, 0.16));
                    pointer-events: none;
                }
            `;
            document.head.appendChild(style);
            return true;
        }

        function ensureRoot() {
            if (state.root && state.root.isConnected) {
                return state.root;
            }

            if (!ensureStyle() || !document.body) {
                return null;
            }

            const root = document.createElement('div');
            root.id = MENU_ROOT_ID;
            document.body.appendChild(root);
            state.root = root;
            return root;
        }

        function normalizeClassName(value) {
            if (typeof value !== 'string') {
                return '';
            }
            return value.split(/\s+/).filter(function (token) {
                return /^[a-zA-Z_-][a-zA-Z0-9_-]*$/.test(token);
            }).join(' ');
        }

        function parseMenuLabel(value) {
            const localizedAccessKey = /\(&([a-zA-Z0-9])\)$/.exec(value);
            if (localizedAccessKey) {
                const label = value.slice(0, localizedAccessKey.index).replace(/&&/g, '&');
                const accessKey = localizedAccessKey[1];
                const displayLabel = label + '(' + accessKey + ')';
                return {
                    label: label,
                    displayLabel: displayLabel,
                    accessKey: accessKey.toLocaleUpperCase(),
                    accessKeyIndex: label.length + 1
                };
            }

            let displayLabel = '';
            let accessKey = '';
            let accessKeyIndex = -1;
            for (let index = 0; index < value.length; index += 1) {
                const character = value[index];
                if (character !== '&') {
                    displayLabel += character;
                    continue;
                }

                const nextCharacter = value[index + 1];
                if (nextCharacter === '&') {
                    displayLabel += '&';
                    index += 1;
                } else if (!accessKey && /^[a-zA-Z0-9]$/.test(nextCharacter || '')) {
                    accessKey = nextCharacter.toLocaleUpperCase();
                    accessKeyIndex = displayLabel.length;
                    displayLabel += nextCharacter;
                    index += 1;
                } else {
                    displayLabel += character;
                }
            }

            return {
                label: displayLabel,
                displayLabel: displayLabel,
                accessKey: accessKey,
                accessKeyIndex: accessKeyIndex
            };
        }

        function renderMenuLabel(element, item) {
            if (!item.accessKey || item.accessKeyIndex < 0) {
                element.textContent = item.displayLabel;
                return;
            }

            element.appendChild(document.createTextNode(item.displayLabel.slice(0, item.accessKeyIndex)));
            const accessKey = document.createElement('span');
            accessKey.className = 'userchrome-menu-accesskey';
            accessKey.textContent = item.displayLabel[item.accessKeyIndex];
            element.appendChild(accessKey);
            element.appendChild(document.createTextNode(item.displayLabel.slice(item.accessKeyIndex + 1)));
        }

        function normalizeItems(items, parentPath, allowEmpty) {
            if (!Array.isArray(items)) {
                throw new TypeError('Menu items must be an array.');
            }

            const normalizedItems = items.map(function (item, index) {
                if (!item || typeof item !== 'object') {
                    throw new TypeError('Menu item at index ' + index + ' must be an object.');
                }

                if (item.type === 'separator') {
                    return {
                        id: typeof item.id === 'string' ? item.id : '',
                        type: 'separator',
                        onContextMenu: typeof item.onContextMenu === 'function' ? item.onContextMenu : null
                    };
                }

                if (typeof item.label !== 'string') {
                    throw new TypeError('Menu item at index ' + index + ' requires a string label.');
                }

                const parsedLabel = parseMenuLabel(item.label);
                const path = parentPath.concat(index);
                const children = item.children === undefined
                    ? []
                    : normalizeItems(item.children, path, true);

                return {
                    id: typeof item.id === 'string' ? item.id : '',
                    type: item.type === 'checkbox' ? 'checkbox' : 'item',
                    label: parsedLabel.label,
                    displayLabel: parsedLabel.displayLabel,
                    accessKey: parsedLabel.accessKey,
                    accessKeyIndex: parsedLabel.accessKeyIndex,
                    checked: item.type === 'checkbox' && item.checked === true,
                    disabled: item.disabled === true,
                    icon: typeof item.icon === 'string' ? item.icon : '',
                    shortcut: typeof item.shortcut === 'string' ? item.shortcut : '',
                    children: children,
                    onSelect: typeof item.onSelect === 'function' ? item.onSelect : null,
                    onContextMenu: typeof item.onContextMenu === 'function' ? item.onContextMenu : null
                };
            });

            if (!normalizedItems.length && allowEmpty) {
                return normalizedItems;
            }

            if (!normalizedItems.some(function (item) {
                return item.type !== 'separator';
            })) {
                throw new TypeError('Menu requires at least one non-separator item.');
            }

            return normalizedItems;
        }

        function normalizeRegistration(options) {
            if (!options || typeof options !== 'object') {
                throw new TypeError('Menu registration options must be an object.');
            }
            if (typeof options.id !== 'string' || !options.id.trim()) {
                throw new TypeError('Registered menu requires a non-empty string id.');
            }

            return {
                id: options.id.trim(),
                ariaLabel: typeof options.ariaLabel === 'string' && options.ariaLabel.trim()
                    ? options.ariaLabel.trim()
                    : '菜单',
                className: normalizeClassName(options.className),
                items: normalizeItems(options.items, [])
            };
        }

        function normalizeOpenOptions(options, requireItems) {
            if (!options || typeof options !== 'object') {
                throw new TypeError('Menu options must be an object.');
            }

            const hasAnchor = options.anchor instanceof HTMLElement;
            const position = options.position;
            const hasPosition = Boolean(position
                && Number.isFinite(position.x)
                && Number.isFinite(position.y));
            if (hasAnchor === hasPosition) {
                throw new TypeError('Menu requires exactly one anchor or position option.');
            }

            const normalized = {
                anchor: hasAnchor ? options.anchor : null,
                position: hasPosition ? { x: position.x, y: position.y } : null,
                restoreFocus: options.restoreFocus instanceof HTMLElement
                    ? options.restoreFocus
                    : (hasAnchor ? options.anchor : null),
                onClose: typeof options.onClose === 'function' ? options.onClose : null,
                preserveCurrent: options.preserveCurrent === true
            };

            if (requireItems) {
                normalized.ariaLabel = typeof options.ariaLabel === 'string' && options.ariaLabel.trim()
                    ? options.ariaLabel.trim()
                    : '菜单';
                normalized.items = normalizeItems(options.items, []);
                normalized.className = normalizeClassName(options.className);
            }

            return normalized;
        }

        function createMenuEntry(id, ariaLabel, className, items, dynamic) {
            const entry = {
                id: id,
                ariaLabel: ariaLabel,
                className: className,
                items: items,
                dynamic: dynamic === true,
                menus: [],
                rootMenu: null,
                element: null,
                controller: null
            };

            entry.rootMenu = createMenuElement(entry, items, [], null, null);
            entry.element = entry.rootMenu.element;
            return entry;
        }

        function createMenuElement(entry, items, path, parentMenu, parentItem) {
            const menu = document.createElement('div');
            menu.className = 'userchrome-menu'
                + (parentMenu ? ' userchrome-menu-submenu' : '')
                + (entry.className ? ' ' + entry.className : '');
            menu.setAttribute('role', 'menu');
            menu.setAttribute('aria-label', parentItem ? parentItem.item.label : entry.ariaLabel);
            menu.setAttribute('data-popup-id', entry.id);
            menu.setAttribute('data-popup-path', path.join('.'));
            menu.hidden = true;

            const meta = {
                entry: entry,
                element: menu,
                items: items,
                path: path,
                parentMenu: parentMenu,
                parentItem: parentItem,
                itemElements: [],
                focusedIndex: 0
            };
            entry.menus.push(meta);

            items.forEach(function (item, index) {
                if (item.type === 'separator') {
                    const separator = document.createElement('div');
                    separator.className = 'userchrome-menu-separator';
                    separator.setAttribute('role', 'separator');
                    const separatorEntry = {
                        item: item,
                        element: separator,
                        menu: meta,
                        submenu: null,
                        index: index
                    };
                    if (item.onContextMenu) {
                        separator.dataset.contextmenu = 'true';
                        separator.addEventListener('contextmenu', function (event) {
                            event.preventDefault();
                            event.stopPropagation();
                            invokeContextMenu(state.current, separatorEntry, event);
                        });
                    }
                    menu.appendChild(separator);
                    return;
                }

                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'userchrome-menu-item';
                button.setAttribute('role', item.type === 'checkbox' ? 'menuitemcheckbox' : 'menuitem');
                button.setAttribute('label', item.label);
                button.setAttribute('aria-label', item.label);
                button.tabIndex = -1;
                button.disabled = item.disabled;
                if (item.type === 'checkbox') {
                    button.setAttribute('aria-checked', String(item.checked));
                }
                if (item.disabled) {
                    button.setAttribute('aria-disabled', 'true');
                }

                const check = document.createElement('span');
                check.className = 'userchrome-menu-check';
                check.setAttribute('aria-hidden', 'true');
                if (item.icon) {
                    const icon = document.createElement('img');
                    icon.className = 'userchrome-menu-icon';
                    icon.alt = '';
                    icon.src = item.icon;
                    icon.addEventListener('error', function () {
                        icon.remove();
                    }, { once: true });
                    check.appendChild(icon);
                } else {
                    check.textContent = item.type === 'checkbox' && item.checked ? '✓' : '';
                }
                const label = document.createElement('span');
                label.className = 'userchrome-menu-label';
                renderMenuLabel(label, item);
                const shortcut = document.createElement('span');
                shortcut.className = 'userchrome-menu-shortcut';
                shortcut.textContent = item.shortcut;
                const arrow = document.createElement('span');
                arrow.className = 'userchrome-menu-arrow';
                arrow.setAttribute('aria-hidden', 'true');

                button.appendChild(check);
                button.appendChild(label);
                button.appendChild(shortcut);
                button.appendChild(arrow);
                const itemEntry = {
                    item: item,
                    element: button,
                    menu: meta,
                    submenu: null,
                    index: index
                };

                if (item.children.length) {
                    button.setAttribute('aria-haspopup', 'menu');
                    button.setAttribute('aria-expanded', 'false');
                    arrow.textContent = '>';
                }

                button.addEventListener('focus', function () {
                    const focusableItems = getFocusableItems(meta);
                    meta.focusedIndex = focusableItems.indexOf(itemEntry);
                    if (!state.current || state.current.entry !== entry) {
                        return;
                    }
                    state.current.activeMenu = meta;
                    if (state.current.suppressFocusOpen === itemEntry) {
                        state.current.suppressFocusOpen = null;
                        return;
                    }
                    if (item.children.length && !item.disabled) {
                        openSubmenu(state.current, meta, itemEntry, false);
                    } else {
                        closeSubmenusAfter(state.current, meta);
                    }
                });
                button.addEventListener('pointerenter', function () {
                    if (!state.current || state.current.entry !== entry) {
                        return;
                    }
                    if (item.disabled) {
                        state.current.activeMenu = meta;
                        closeSubmenusAfter(state.current, meta);
                        return;
                    }
                    if (item.children.length) {
                        openSubmenu(state.current, meta, itemEntry, false);
                    } else {
                        state.current.activeMenu = meta;
                        closeSubmenusAfter(state.current, meta);
                    }
                });
                button.addEventListener('click', function (event) {
                    if (item.children.length && !item.disabled) {
                        event.preventDefault();
                        openSubmenu(state.current, meta, itemEntry, true);
                        return;
                    }
                    invokeSelect(state.current, itemEntry, event);
                });
                if (item.onContextMenu) {
                    button.addEventListener('contextmenu', function (event) {
                        event.preventDefault();
                        event.stopPropagation();
                        invokeContextMenu(state.current, itemEntry, event);
                    });
                }

                menu.appendChild(button);
                meta.itemElements.push(itemEntry);

                if (item.children.length) {
                    itemEntry.submenu = createMenuElement(entry, item.children, path.concat(index), meta, itemEntry);
                    menu.appendChild(itemEntry.submenu.element);
                }
            });

            return meta;
        }

        function getFocusableItems(menu) {
            return menu ? menu.itemElements.filter(function (entry) {
                return !entry.item.disabled;
            }) : [];
        }

        function focusItem(menu, index) {
            const focusableItems = getFocusableItems(menu);
            if (!focusableItems.length) {
                return;
            }

            const normalizedIndex = ((index % focusableItems.length) + focusableItems.length) % focusableItems.length;
            menu.focusedIndex = normalizedIndex;
            if (state.current) {
                state.current.activeMenu = menu;
            }
            focusableItems[normalizedIndex].element.focus();
        }

        function restoreFocus(current) {
            const target = current.options.restoreFocus;
            if (target && target.isConnected && typeof target.focus === 'function') {
                target.focus({ preventScroll: true });
            }
        }

        function closeSubmenusAfter(current, menu) {
            if (!current || !menu) {
                return;
            }

            const menuIndex = current.chain.indexOf(menu);
            if (menuIndex === -1) {
                return;
            }

            while (current.chain.length > menuIndex + 1) {
                const child = current.chain.pop();
                child.element.hidden = true;
                child.element.style.visibility = '';
                if (child.parentItem) {
                    child.parentItem.element.setAttribute('aria-expanded', 'false');
                }
            }
        }

        function openSubmenu(current, menu, itemEntry, focusFirst) {
            if (!current
                || state.current !== current
                || current.entry !== itemEntry.menu.entry
                || !itemEntry.submenu
                || itemEntry.item.disabled) {
                return;
            }

            closeSubmenusAfter(current, menu);
            const submenu = itemEntry.submenu;
            submenu.element.hidden = false;
            itemEntry.element.setAttribute('aria-expanded', 'true');
            current.chain.push(submenu);
            current.activeMenu = focusFirst ? submenu : menu;
            positionChain(current);

            if (focusFirst) {
                requestAnimationFrame(function () {
                    if (state.current === current && current.chain.includes(submenu)) {
                        focusItem(submenu, 0);
                    }
                });
            }
        }

        function invokeSelect(current, itemEntry, event) {
            if (!current || state.current !== current || itemEntry.item.disabled || itemEntry.item.children.length) {
                return;
            }

            const callback = itemEntry.item.onSelect;
            close('select');
            if (!callback) {
                return;
            }

            try {
                Promise.resolve(callback({
                    id: itemEntry.item.id,
                    checked: itemEntry.item.type === 'checkbox' ? !itemEntry.item.checked : itemEntry.item.checked,
                    previousChecked: itemEntry.item.checked,
                    event: event
                })).catch(function (error) {
                    console.error('[userChrome.menu] Item callback failed.', error);
                });
            } catch (error) {
                console.error('[userChrome.menu] Item callback failed.', error);
            }
        }

        function getContextMenuPosition(event, element) {
            const hasMousePosition = event
                && Number.isFinite(event.clientX)
                && Number.isFinite(event.clientY)
                && (event.button === 2 || event.clientX !== 0 || event.clientY !== 0);
            if (hasMousePosition) {
                return { x: event.clientX, y: event.clientY };
            }

            const rect = element.getBoundingClientRect();
            return {
                x: Math.round(Math.min(rect.right, rect.left + 24)),
                y: Math.round(rect.top + Math.min(rect.height, 24))
            };
        }

        function invokeContextMenu(current, itemEntry, event, position) {
            if (!current
                || state.current !== current
                || !itemEntry
                || current.entry !== itemEntry.menu.entry
                || itemEntry.item.disabled
                || !itemEntry.item.onContextMenu) {
                return;
            }
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }

            const callback = itemEntry.item.onContextMenu;
            const contextPosition = position || getContextMenuPosition(event, itemEntry.element);
            const selection = {
                id: itemEntry.item.id,
                event: event,
                element: itemEntry.element,
                position: contextPosition
            };

            try {
                Promise.resolve(callback(selection)).catch(function (error) {
                    console.error('[userChrome.menu] Item context callback failed.', error);
                });
            } catch (error) {
                console.error('[userChrome.menu] Item context callback failed.', error);
            }
        }

        function positionMenu(menu, x, y) {
            if (!menu || !menu.element.isConnected) {
                return;
            }

            const element = menu.element;
            element.hidden = false;
            element.style.visibility = 'hidden';
            element.style.left = '0px';
            element.style.top = '0px';

            const rect = element.getBoundingClientRect();
            const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
            const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
            x = Math.max(MENU_VIEWPORT_MARGIN, Math.min(x, viewportWidth - rect.width - MENU_VIEWPORT_MARGIN));
            y = Math.max(MENU_VIEWPORT_MARGIN, Math.min(y, viewportHeight - rect.height - MENU_VIEWPORT_MARGIN));
            element.style.left = Math.round(x) + 'px';
            element.style.top = Math.round(y) + 'px';
            element.style.visibility = '';
        }

        function positionChain(current) {
            if (!current || !current.entry.element.isConnected) {
                return;
            }

            if (current.options.anchor && !current.options.anchor.isConnected) {
                close('anchor-removed', false);
                return;
            }

            const rootMenu = current.chain[0];
            const rootElement = rootMenu.element;
            rootElement.hidden = false;
            rootElement.style.visibility = 'hidden';
            rootElement.style.left = '0px';
            rootElement.style.top = '0px';
            const rootRect = rootElement.getBoundingClientRect();
            const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
            const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
            let x;
            let y;

            if (current.options.anchor) {
                const anchorRect = current.options.anchor.getBoundingClientRect();
                x = anchorRect.left;
                y = anchorRect.bottom;
                if (y + rootRect.height > viewportHeight - MENU_VIEWPORT_MARGIN) {
                    y = anchorRect.top - rootRect.height;
                }
                if (x + rootRect.width > viewportWidth - MENU_VIEWPORT_MARGIN) {
                    x = anchorRect.right - rootRect.width;
                }
            } else {
                x = current.options.position.x;
                y = current.options.position.y;
                if (x + rootRect.width > viewportWidth - MENU_VIEWPORT_MARGIN) {
                    x -= rootRect.width;
                }
                if (y + rootRect.height > viewportHeight - MENU_VIEWPORT_MARGIN) {
                    y -= rootRect.height;
                }
            }

            positionMenu(rootMenu, x, y);

            for (let index = 1; index < current.chain.length; index += 1) {
                const menu = current.chain[index];
                const parentItem = menu.parentItem;
                if (!parentItem || !parentItem.element.isConnected) {
                    continue;
                }

                const parentRect = parentItem.element.getBoundingClientRect();
                menu.element.hidden = false;
                menu.element.style.visibility = 'hidden';
                menu.element.style.left = '0px';
                menu.element.style.top = '0px';
                const menuRect = menu.element.getBoundingClientRect();
                let childX = parentRect.right;
                let childY = parentRect.top;
                if (childX + menuRect.width > viewportWidth - MENU_VIEWPORT_MARGIN) {
                    childX = parentRect.left - menuRect.width;
                }
                if (childY + menuRect.height > viewportHeight - MENU_VIEWPORT_MARGIN) {
                    childY = viewportHeight - menuRect.height - MENU_VIEWPORT_MARGIN;
                }
                positionMenu(menu, childX, childY);
            }
        }

        function handleKeydown(event) {
            const current = state.current;
            if (!current) {
                return;
            }

            const activeMenu = current.activeMenu || current.chain[0];
            const focusableItems = getFocusableItems(activeMenu);
            const activeEntry = focusableItems.find(function (entry) {
                return entry.element === document.activeElement;
            });

            if ((event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))
                && activeEntry
                && activeEntry.item.onContextMenu) {
                event.preventDefault();
                invokeContextMenu(current, activeEntry, event, getContextMenuPosition(null, activeEntry.element));
                return;
            }

            if (event.key === 'Escape') {
                event.preventDefault();
                close('escape');
                return;
            }
            if (event.key === 'Tab') {
                close('tab');
                return;
            }
            if (event.key === 'ArrowLeft') {
                if (activeMenu.parentMenu && activeMenu.parentItem) {
                    event.preventDefault();
                    closeSubmenusAfter(current, activeMenu.parentMenu);
                    current.activeMenu = activeMenu.parentMenu;
                    current.suppressFocusOpen = activeMenu.parentItem;
                    activeMenu.parentItem.element.focus();
                }
                return;
            }
            if (event.key === 'ArrowRight') {
                if (activeEntry && activeEntry.submenu && !activeEntry.item.disabled) {
                    event.preventDefault();
                    openSubmenu(current, activeMenu, activeEntry, true);
                }
                return;
            }
            if (event.key === 'Enter' || event.key === ' ') {
                if (activeEntry) {
                    event.preventDefault();
                    activeEntry.element.click();
                }
                return;
            }
            if (!focusableItems.length) {
                return;
            }

            if (!event.ctrlKey
                && !event.altKey
                && !event.metaKey
                && !event.isComposing
                && event.key.length === 1) {
                const accessKey = event.key.toLocaleUpperCase();
                const matches = focusableItems.filter(function (entry) {
                    return entry.item.accessKey === accessKey;
                });
                if (matches.length === 1) {
                    event.preventDefault();
                    matches[0].element.click();
                    return;
                }
                if (matches.length > 1) {
                    event.preventDefault();
                    const activeMatchIndex = matches.findIndex(function (entry) {
                        return entry.element === document.activeElement;
                    });
                    const nextMatch = matches[(activeMatchIndex + 1) % matches.length];
                    closeSubmenusAfter(current, activeMenu);
                    current.suppressFocusOpen = nextMatch;
                    focusItem(activeMenu, focusableItems.indexOf(nextMatch));
                    return;
                }
            }

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                focusItem(activeMenu, activeMenu.focusedIndex + 1);
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                focusItem(activeMenu, activeMenu.focusedIndex - 1);
            } else if (event.key === 'Home') {
                event.preventDefault();
                focusItem(activeMenu, 0);
            } else if (event.key === 'End') {
                event.preventDefault();
                focusItem(activeMenu, focusableItems.length - 1);
            }
        }

        function handleOutsideInteraction(event) {
            const current = state.current;
            if (!current) {
                return;
            }

            const eventPath = typeof event.composedPath === 'function' ? event.composedPath() : null;
            let containingSession = current;
            while (containingSession) {
                const isInside = containingSession.chain.some(function (menu) {
                    return eventPath
                        ? eventPath.includes(menu.element)
                        : menu.element.contains(event.target);
                });
                if (isInside) {
                    break;
                }
                containingSession = containingSession.previous;
            }

            if (containingSession === current) {
                return;
            }

            if (!containingSession) {
                closeAll('outside', false);
                return;
            }

            while (state.current && state.current !== containingSession) {
                close('outside', false);
            }
        }

        function hideEntryMenus(entry) {
            entry.menus.forEach(function (menu) {
                menu.element.hidden = true;
                menu.element.style.visibility = '';
                menu.element.style.left = '';
                menu.element.style.top = '';
                menu.itemElements.forEach(function (itemEntry) {
                    if (itemEntry.submenu) {
                        itemEntry.element.setAttribute('aria-expanded', 'false');
                    }
                });
            });
        }

        function deactivateSession(current) {
            document.removeEventListener('keydown', handleKeydown, true);
            window.removeEventListener('pointerdown', handleOutsideInteraction, true);
            window.removeEventListener('mousedown', handleOutsideInteraction, true);
            if (!current) {
                return;
            }

            window.removeEventListener('resize', current.reposition);
            window.removeEventListener('scroll', current.reposition, true);
            if (current.anchorObserver) {
                current.anchorObserver.disconnect();
                current.anchorObserver = null;
            }
            current.suspended = true;
        }

        function activateSession(current) {
            state.current = current;
            current.suspended = false;
            document.addEventListener('keydown', handleKeydown, true);
            // 在 window 捕获阶段监听，避免 Vivaldi UI 的 document 事件处理拦截菜单外点击。
            window.addEventListener('pointerdown', handleOutsideInteraction, true);
            // 兼容未派发 PointerEvent 的鼠标输入环境；重复事件会因菜单已关闭而被忽略。
            window.addEventListener('mousedown', handleOutsideInteraction, true);
            window.addEventListener('resize', current.reposition);
            window.addEventListener('scroll', current.reposition, true);

            if (current.options.anchor && typeof MutationObserver === 'function') {
                current.anchorObserver = new MutationObserver(function () {
                    if (state.current === current && !current.options.anchor.isConnected) {
                        close('anchor-removed', false);
                    }
                });
                current.anchorObserver.observe(document.documentElement, {
                    childList: true,
                    subtree: true
                });
            }
        }

        function disposeSession(current) {
            if (!current || current.closed) {
                return false;
            }

            current.closed = true;
            current.suspended = false;
            hideEntryMenus(current.entry);
            if (current.entry.dynamic) {
                current.entry.element.remove();
            }
            return true;
        }

        function notifySessionClosed(current, reason) {
            if (!current || !current.options.onClose) {
                return;
            }

            try {
                current.options.onClose(reason || 'close');
            } catch (error) {
                console.error('[userChrome.menu] Close callback failed.', error);
            }
        }

        function canResumeSession(current) {
            if (!current || current.closed || !current.entry.element.isConnected) {
                return false;
            }
            if (!current.entry.dynamic && state.registry.get(current.entry.id) !== current.entry) {
                return false;
            }
            return !current.options.anchor || current.options.anchor.isConnected;
        }

        function resumeSession(previous) {
            let candidate = previous;
            while (candidate) {
                const next = candidate.previous;
                if (canResumeSession(candidate)) {
                    activateSession(candidate);
                    positionChain(candidate);
                    return candidate;
                }

                const closeReason = candidate.entry.element.isConnected
                    && candidate.options.anchor
                    && !candidate.options.anchor.isConnected
                    ? 'anchor-removed'
                    : 'unregister';
                candidate.previous = null;
                if (disposeSession(candidate)) {
                    notifySessionClosed(candidate, closeReason);
                }
                candidate = next;
            }

            state.current = null;
            return null;
        }

        function close(reason, shouldRestoreFocus) {
            const current = state.current;
            if (!current) {
                return;
            }

            deactivateSession(current);
            state.current = null;
            const previous = current.previous;
            current.previous = null;
            disposeSession(current);
            resumeSession(previous);

            if (shouldRestoreFocus !== false) {
                restoreFocus(current);
            }
            notifySessionClosed(current, reason);
        }

        function closeAll(reason, shouldRestoreFocus) {
            const top = state.current;
            if (!top) {
                return;
            }

            deactivateSession(top);
            state.current = null;
            const closedSessions = [];
            let current = top;
            while (current) {
                const previous = current.previous;
                current.previous = null;
                if (disposeSession(current)) {
                    closedSessions.push(current);
                }
                current = previous;
            }

            if (shouldRestoreFocus !== false) {
                restoreFocus(top);
            }
            closedSessions.forEach(function (session) {
                notifySessionClosed(session, reason);
            });
        }

        function closeSession(target, reason, shouldRestoreFocus) {
            if (!target || target.closed) {
                return false;
            }
            if (state.current === target) {
                close(reason, shouldRestoreFocus);
                return true;
            }

            let child = state.current;
            while (child && child.previous !== target) {
                child = child.previous;
            }
            if (!child) {
                return false;
            }

            child.previous = target.previous;
            target.previous = null;
            if (disposeSession(target)) {
                notifySessionClosed(target, reason);
            }
            return true;
        }

        function closeEntrySession(entry, reason, shouldRestoreFocus) {
            let current = state.current;
            while (current) {
                if (current.entry === entry) {
                    return closeSession(current, reason, shouldRestoreFocus);
                }
                current = current.previous;
            }
            return false;
        }

        function openEntry(entry, options) {
            const root = ensureRoot();
            if (!root) {
                return null;
            }

            let previous = null;
            if (options.preserveCurrent && state.current && state.current.entry !== entry) {
                previous = state.current;
                deactivateSession(previous);
                state.current = null;
            } else {
                closeAll('replace', false);
            }
            root.appendChild(entry.element);
            hideEntryMenus(entry);

            const current = {
                entry: entry,
                options: options,
                chain: [entry.menus[0]],
                activeMenu: entry.menus[0],
                suppressFocusOpen: null,
                reposition: null,
                anchorObserver: null,
                previous: previous,
                suspended: false,
                closed: false
            };
            entry.element.hidden = false;

            current.reposition = function () {
                positionChain(current);
            };
            activateSession(current);
            positionChain(current);

            requestAnimationFrame(function () {
                if (state.current === current) {
                    focusItem(current.chain[0], 0);
                }
            });

            return {
                close: function (reason) {
                    closeSession(current, reason || 'close', true);
                }
            };
        }

        function createController(entry) {
            const controller = {
                id: entry.id,
                element: entry.element,
                open: function (options) {
                    if (state.registry.get(entry.id) !== entry) {
                        return null;
                    }
                    return openEntry(entry, normalizeOpenOptions(options, false));
                },
                close: function (reason) {
                    closeEntrySession(entry, reason || 'close', true);
                },
                unregister: function () {
                    if (state.registry.get(entry.id) === entry) {
                        unregister(entry.id);
                    }
                }
            };
            return controller;
        }

        function register(options) {
            const normalized = normalizeRegistration(options);
            if (state.registrationLocks.has(normalized.id)) {
                throw new Error('Menu registration is already in progress: ' + normalized.id);
            }
            const root = ensureRoot();
            if (!root) {
                return null;
            }

            state.registrationLocks.add(normalized.id);
            try {
                if (state.registry.has(normalized.id)) {
                    unregister(normalized.id, 'replace');
                }

                const entry = createMenuEntry(
                    normalized.id,
                    normalized.ariaLabel,
                    normalized.className,
                    normalized.items,
                    false
                );
                root.appendChild(entry.element);
                entry.controller = createController(entry);
                state.registry.set(entry.id, entry);
                return entry.controller;
            } finally {
                state.registrationLocks.delete(normalized.id);
            }
        }

        function unregister(id, reason) {
            const entry = state.registry.get(id);
            if (!entry) {
                return false;
            }

            state.registry.delete(id);
            closeEntrySession(entry, reason || 'unregister', false);
            entry.element.remove();
            return true;
        }

        function openPopup(id, options) {
            const entry = state.registry.get(id);
            if (!entry) {
                throw new Error('Unknown registered menu: ' + id);
            }
            return openEntry(entry, normalizeOpenOptions(options, false));
        }

        function open(options) {
            const normalized = normalizeOpenOptions(options, true);
            const id = '__dynamic-menu-' + (++state.dynamicCounter);
            const entry = createMenuEntry(
                id,
                normalized.ariaLabel,
                normalized.className,
                normalized.items,
                true
            );
            return openEntry(entry, normalized);
        }

        return {
            open: open,
            close: function (reason) {
                close(reason || 'close');
            },
            register: register,
            unregister: unregister,
            openPopup: openPopup,
            closePopup: function (reason) {
                close(reason || 'close');
            },
            getPopup: function (id) {
                const entry = state.registry.get(id);
                return entry ? entry.element : null;
            }
        };
    }

    function normalizeModalDimension(value, fallback, minimum) {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return Math.max(minimum, Math.round(value)) + 'px';
        }
        if (typeof value === 'string' && /^(?:\d+(?:\.\d+)?px|\d+(?:\.\d+)?(?:vw|vh)|min\([^;{}]+\)|calc\([^;{}]+\))$/.test(value.trim())) {
            return value.trim();
        }
        return fallback;
    }

    function normalizeModalOptions(options) {
        const source = options && typeof options === 'object' ? options : {};
        const defaultSize = source.defaultSize && typeof source.defaultSize === 'object'
            ? source.defaultSize
            : {};
        const className = typeof source.className === 'string'
            ? source.className.split(/\s+/).filter((value) => /^[a-zA-Z0-9_-]+$/.test(value)).join(' ')
            : '';
        return {
            title: typeof source.title === 'string' ? source.title : '',
            message: typeof source.message === 'string' ? source.message : '',
            content: source.content instanceof HTMLElement ? source.content : null,
            confirmLabel: typeof source.confirmLabel === 'string' && source.confirmLabel ? source.confirmLabel : '确定',
            cancelLabel: typeof source.cancelLabel === 'string' && source.cancelLabel ? source.cancelLabel : '取消',
            showClose: source.showClose !== false,
            danger: source.danger === true,
            className,
            width: normalizeModalDimension(defaultSize.width, 'min(480px, calc(100vw - 32px))', 240),
            height: normalizeModalDimension(defaultSize.height, 'auto', 160),
            resizable: source.resizable === true,
            backdropBlur: Number.isFinite(source.backdropBlur) ? Math.max(0, source.backdropBlur) : 2,
            restoreFocus: source.restoreFocus instanceof HTMLElement ? source.restoreFocus : null,
            validate: typeof source.validate === 'function' ? source.validate : null
        };
    }

    function createModalApi() {
        const state = {
            dialog: null,
            active: null
        };

        function ensureStyle() {
            if (document.getElementById(MODAL_STYLE_ID) || !document.head) {
                return !!document.getElementById(MODAL_STYLE_ID);
            }
            const style = document.createElement('style');
            style.id = MODAL_STYLE_ID;
            style.textContent = `
                #${MODAL_ID} {
                    position: fixed;
                    z-index: 2147483647;
                    box-sizing: border-box;
                    width: var(--userchrome-modal-width);
                    height: var(--userchrome-modal-height);
                    max-width: calc(100vw - 32px);
                    max-height: calc(100vh - 32px);
                    min-width: 240px;
                    min-height: 160px;
                    padding: 0;
                    overflow: hidden;
                    border: 1px solid var(--colorBorder, rgba(0, 0, 0, 0.2));
                    border-radius: 12px;
                    background: var(--colorBg, #fff);
                    color: var(--colorFg, #222);
                    box-shadow: 0 22px 64px rgba(0, 0, 0, 0.34);
                    font: inherit;
                }
                #${MODAL_ID}.userchrome-modal-resizable { resize: both; }
                #${MODAL_ID}::backdrop {
                    background: rgba(0, 0, 0, 0.38);
                    backdrop-filter: blur(var(--userchrome-modal-backdrop-blur));
                }
                #${MODAL_ID} .userchrome-modal-form {
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                    height: 100%;
                    max-height: inherit;
                }
                #${MODAL_ID} .userchrome-modal-header {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    flex: 0 0 auto;
                    padding: 18px 20px 12px;
                }
                #${MODAL_ID} .userchrome-modal-heading { min-width: 0; flex: 1 1 auto; }
                #${MODAL_ID} .userchrome-modal-title {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                    line-height: 1.3;
                }
                #${MODAL_ID} .userchrome-modal-message {
                    margin: 8px 0 0;
                    color: var(--colorFgFaded, rgba(34, 34, 34, 0.68));
                    font-size: 13px;
                    line-height: 1.5;
                }
                #${MODAL_ID} .userchrome-modal-close {
                    flex: 0 0 auto;
                    width: 28px;
                    height: 28px;
                    padding: 0;
                    border: 0;
                    border-radius: 999px;
                    background: transparent;
                    color: inherit;
                    font-size: 20px;
                    line-height: 1;
                    cursor: pointer;
                }
                #${MODAL_ID} .userchrome-modal-close:hover,
                #${MODAL_ID} .userchrome-modal-close:focus-visible { background: var(--colorBgAlphaHeavier, rgba(0, 0, 0, 0.08)); outline: none; }
                #${MODAL_ID} .userchrome-modal-content {
                    flex: 1 1 auto;
                    min-height: 0;
                    overflow: auto;
                    padding: 8px 20px 20px;
                }
                #${MODAL_ID} .userchrome-modal-error {
                    flex: 0 0 auto;
                    min-height: 18px;
                    padding: 0 20px 4px;
                    color: var(--colorErrorBg, #c42b1c);
                    font-size: 12px;
                    line-height: 1.4;
                }
                #${MODAL_ID} .userchrome-modal-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 8px;
                    flex: 0 0 auto;
                    padding: 14px 20px 18px;
                    border-top: 1px solid var(--colorBorder, rgba(0, 0, 0, 0.14));
                    background: var(--colorBgAlphaHeavy, var(--colorBg, #fff));
                }
                #${MODAL_ID} .userchrome-modal-actions button {
                    min-width: 78px;
                    min-height: 34px;
                    padding: 6px 14px;
                    border: 1px solid var(--colorBorder, rgba(0, 0, 0, 0.2));
                    border-radius: 6px;
                    background: var(--colorBgIntense, var(--colorBg, #fff));
                    color: var(--colorFg, #222);
                    font: inherit;
                    cursor: pointer;
                }
                #${MODAL_ID} .userchrome-modal-actions .primary {
                    border-color: var(--colorAccentBg, #006dcc);
                    background: var(--colorAccentBg, #006dcc);
                    color: var(--colorAccentFg, #fff);
                }
                #${MODAL_ID} .userchrome-modal-actions .danger {
                    border-color: var(--colorErrorBg, #c42b1c);
                    background: var(--colorErrorBg, #c42b1c);
                    color: var(--colorErrorFg, #fff);
                }
            `;
            document.head.appendChild(style);
            return true;
        }

        function ensureDialog() {
            if (state.dialog && state.dialog.isConnected) {
                return state.dialog;
            }
            if (!ensureStyle() || !document.body) {
                return null;
            }
            const existing = document.getElementById(MODAL_ID);
            if (existing) existing.remove();
            state.dialog = document.createElement('dialog');
            state.dialog.id = MODAL_ID;
            document.body.appendChild(state.dialog);
            return state.dialog;
        }

        function settle(active, value) {
            if (!active || active.settled) return;
            active.settled = true;
            active.resolve(value);
            if (active.options.restoreFocus && active.options.restoreFocus.isConnected) {
                active.options.restoreFocus.focus();
            }
            if (state.active === active) state.active = null;
        }

        function close(reason) {
            const active = state.active;
            if (!active) return false;
            const dialog = active.dialog;
            settle(active, null);
            if (dialog.open) dialog.close(reason || 'close');
            return true;
        }

        function open(options) {
            const normalized = normalizeModalOptions(options);
            if (!normalized.content) {
                throw new TypeError('Modal content must be an HTMLElement.');
            }
            const dialog = ensureDialog();
            if (!dialog) return Promise.resolve(null);
            close('replace');

            dialog.className = normalized.className;
            dialog.classList.toggle('userchrome-modal-resizable', normalized.resizable);
            dialog.style.setProperty('--userchrome-modal-width', normalized.width);
            dialog.style.setProperty('--userchrome-modal-height', normalized.height);
            dialog.style.setProperty('--userchrome-modal-backdrop-blur', normalized.backdropBlur + 'px');

            const form = document.createElement('form');
            form.className = 'userchrome-modal-form';
            form.method = 'dialog';
            const header = document.createElement('header');
            header.className = 'userchrome-modal-header';
            const heading = document.createElement('div');
            heading.className = 'userchrome-modal-heading';
            if (normalized.title) {
                const title = document.createElement('h2');
                title.className = 'userchrome-modal-title';
                title.textContent = normalized.title;
                heading.appendChild(title);
            }
            if (normalized.message) {
                const message = document.createElement('p');
                message.className = 'userchrome-modal-message';
                message.textContent = normalized.message;
                heading.appendChild(message);
            }
            header.appendChild(heading);
            if (normalized.showClose) {
                const closeButton = document.createElement('button');
                closeButton.type = 'button';
                closeButton.className = 'userchrome-modal-close';
                closeButton.setAttribute('aria-label', '关闭');
                closeButton.textContent = '×';
                closeButton.addEventListener('click', () => close('close'));
                header.appendChild(closeButton);
            }
            form.appendChild(header);
            const content = document.createElement('div');
            content.className = 'userchrome-modal-content';
            content.appendChild(normalized.content);
            form.appendChild(content);
            const error = document.createElement('div');
            error.className = 'userchrome-modal-error';
            error.setAttribute('role', 'alert');
            form.appendChild(error);
            const actions = document.createElement('footer');
            actions.className = 'userchrome-modal-actions';
            const cancelButton = document.createElement('button');
            cancelButton.type = 'button';
            cancelButton.textContent = normalized.cancelLabel;
            cancelButton.addEventListener('click', () => close('cancel'));
            const confirmButton = document.createElement('button');
            confirmButton.type = 'submit';
            confirmButton.className = normalized.danger ? 'danger' : 'primary';
            confirmButton.textContent = normalized.confirmLabel;
            actions.append(cancelButton, confirmButton);
            form.appendChild(actions);
            dialog.replaceChildren(form);

            return new Promise((resolve) => {
                const active = { dialog, options: normalized, resolve, settled: false };
                state.active = active;
                const onCancel = (event) => {
                    event.preventDefault();
                    close('cancel');
                };
                const onClick = (event) => {
                    if (event.target === dialog) close('backdrop');
                };
                const onClose = () => {
                    settle(active, null);
                    cleanup();
                };
                const cleanup = () => {
                    dialog.removeEventListener('cancel', onCancel);
                    dialog.removeEventListener('click', onClick);
                    dialog.removeEventListener('close', onClose);
                    if (state.active === active) state.active = null;
                };
                dialog.addEventListener('cancel', onCancel);
                dialog.addEventListener('click', onClick);
                dialog.addEventListener('close', onClose);
                form.addEventListener('submit', async (event) => {
                    event.preventDefault();
                    if (active.settled) return;
                    if (!form.checkValidity()) {
                        form.reportValidity();
                        return;
                    }
                    const formData = new FormData(form);
                    let validation = '';
                    try {
                        validation = normalized.validate ? await normalized.validate(formData, form) : '';
                    } catch (validationError) {
                        console.error('[userChrome.js] Modal validation failed.', validationError);
                        validation = '输入内容无效，请检查后重试。';
                    }
                    if (validation) {
                        error.textContent = String(validation);
                        return;
                    }
                    settle(active, formData);
                    if (dialog.open) dialog.close('submit');
                });
                dialog.showModal();
                requestAnimationFrame(() => {
                    const first = form.querySelector('input, select, textarea, button');
                    if (first) first.focus();
                });
            });
        }

        return { open, close };
    }

    window.userChrome_js = {
        scripts: [],
        styles: [],
        mods: [],
        styleNodes: {},
        injectionPromise: null,
        addedNodeCallbacks: new Set(),
        addedNodeObserver: null,
        alertContainer: null,
        alertMountTimer: null,
        alertQueue: [],
        alertCounter: 0,
        menu: createMenuApi(),
        modal: createModalApi(),
        state: createDefaultState(),
        storageReady: true,
        async init() {
            try {
                const rootDirectory = await getPackageDirectoryEntryAsync();
                const directory = await this.findModsDirectory(rootDirectory);

                if (!directory) {
                    console.warn('[userChrome.js] Mods directory not found:', MODS_DIRECTORY_NAME);
                    return;
                }

                await this.listMods(directory);
                await this.loadState();
                this.applyStateToMods();
                await this.cleanupState();

                waitForCondition(function () {
                    return document.head && document.body;
                }, function () {
                    window.userChrome_js.injectMods().catch(function (error) {
                        console.error('[userChrome.js] Mod injection failed.', error);
                    });
                }, 300);
            } catch (error) {
                console.error('[userChrome.js] Initialization failed.', error);
            }
        },
        async findModsDirectory(directory) {
            const entries = (await readEntriesAsync(directory)).sort(compareEntries);
            for (const entry of entries) {
                if (entry.isDirectory && entry.name === MODS_DIRECTORY_NAME) {
                    return entry;
                }
            }
            return null;
        },
        async listMods(directory) {
            console.log('getMods: ' + normalizePath(directory.fullPath));
            const entries = (await readEntriesAsync(directory)).sort(compareEntries);

            for (const entry of entries) {
                if (entry.isDirectory) {
                    if (!MODS_SKIP_DIRS.includes(entry.name)) {
                        await this.listMods(entry);
                    }
                    continue;
                }

                if (!MODS_SKIP_LIST.includes(entry.name)) {
                    await this.addMod(entry);
                }
            }
        },
        async addMod(mod) {
            const normalizedPath = normalizePath(mod.fullPath);
            const normalizedName = mod.name.toLowerCase();
            let type = null;

            if (normalizedName.endsWith(MODS_SCRIPT_EXTENSION)) {
                type = 'js';
            } else if (normalizedName.endsWith(MODS_STYLE_EXTENSION)) {
                type = 'css';
            }

            if (!mod.isFile || !type) {
                return;
            }

            const id = toModId(normalizedPath);
            const metadata = await parseModMetadata(mod, type);
            const displayName = getLocalizedValue(metadata, 'name') || mod.name;
            const description = getLocalizedValue(metadata, 'description') || '';
            const modMeta = {
                id: id,
                path: normalizedPath,
                relativePath: id,
                name: mod.name,
                displayName: displayName,
                type: type,
                internal: MODS_INTERNAL_IDS.includes(id),
                description: description,
                compatibility: metadata.compatibility || '',
                version: metadata.version || '',
                homepageURL: metadata.homepageURL || '',
                notes: Array.isArray(metadata.notes) ? metadata.notes.slice() : [],
                enabled: true,
                loaded: false,
                loading: false
            };

            console.log('addMod(' + type.toUpperCase() + '): ' + modMeta.path);

            this.mods.push(modMeta);
            if (type === 'js') {
                this.scripts.push(modMeta);
            } else {
                this.styles.push(modMeta);
            }
        },
        async loadState() {
            try {
                this.state = sanitizeState(await storageGetAsync(MODS_STATE_KEY));
                this.storageReady = true;
            } catch (error) {
                this.state = createDefaultState();
                this.storageReady = false;
                console.warn('[userChrome.js] Failed to read mod state. Falling back to session defaults.', error);
            }
        },
        applyStateToMods() {
            const disabled = this.state.disabled || {};
            this.mods.forEach(function (mod) {
                mod.enabled = mod.internal || disabled[mod.id] !== true;
            });
        },
        async cleanupState() {
            const validIds = {};
            let shouldSave = false;

            this.mods.forEach(function (mod) {
                if (!mod.internal) {
                    validIds[mod.id] = true;
                }
            });

            Object.keys(this.state.disabled).forEach((id) => {
                if (!validIds[id]) {
                    delete this.state.disabled[id];
                    shouldSave = true;
                }
            });

            if (shouldSave) {
                await this.persistState();
            }
        },
        async persistState() {
            if (!this.storageReady) {
                return false;
            }

            try {
                this.state = sanitizeState(this.state);
                await storageSetAsync({
                    [MODS_STATE_KEY]: this.state
                });
                return true;
            } catch (error) {
                this.storageReady = false;
                console.warn('[userChrome.js] Failed to persist mod state.', error);
                return false;
            }
        },
        injectMods() {
            if (this.injectionPromise) {
                return this.injectionPromise;
            }

            this.injectionPromise = this.runInjection().finally(() => {
                this.injectionPromise = null;
            });
            return this.injectionPromise;
        },
        async runInjection() {
            const container = document.body || document.documentElement;
            if (!container) {
                console.warn('[userChrome.js] Injection container is unavailable.');
                return;
            }

            this.styles.forEach((mod) => {
                if (!mod.enabled) {
                    return;
                }
                this.enableStyleMod(mod);
            });

            for (const mod of this.scripts) {
                await this.enableScriptMod(mod, container);
            }
        },
        enableScriptMod(mod, container) {
            if (!mod.enabled || mod.loaded || mod.loading) {
                return Promise.resolve(mod.loaded);
            }

            console.log('Injecting script: ' + mod.relativePath);
            mod.loading = true;

            return new Promise(function (resolve) {
                const script = document.createElement('script');
                script.type = 'text/javascript';
                script.async = false;
                script.src = mod.path;
                script.dataset.userchromeId = mod.id;
                script.onload = function () {
                    mod.loading = false;
                    mod.loaded = true;
                    resolve(true);
                };
                script.onerror = function () {
                    mod.loading = false;
                    console.error('[userChrome.js] Failed to load script:', mod.relativePath);
                    resolve(false);
                };

                try {
                    container.appendChild(script);
                } catch (error) {
                    mod.loading = false;
                    console.error('[userChrome.js] Failed to inject script:', mod.relativePath, error);
                    resolve(false);
                }
            });
        },
        enableStyleMod(mod) {
            const currentNode = this.styleNodes[mod.id];
            if (currentNode && currentNode.isConnected) {
                mod.loaded = true;
                return currentNode;
            }

            console.log('Injecting style: ' + mod.relativePath);
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = mod.path;
            link.dataset.userchromeId = mod.id;
            document.head.appendChild(link);
            this.styleNodes[mod.id] = link;
            mod.loaded = true;
            return link;
        },
        disableStyleMod(mod) {
            const link = this.styleNodes[mod.id];
            if (link && link.parentNode) {
                link.parentNode.removeChild(link);
            }
            this.styleNodes[mod.id] = null;
            mod.loaded = false;
        },
        getMods() {
            return this.mods.map((mod) => ({
                id: mod.id,
                path: mod.path,
                relativePath: mod.relativePath,
                name: mod.name,
                displayName: mod.displayName,
                type: mod.type,
                internal: mod.internal,
                description: mod.description,
                compatibility: mod.compatibility,
                version: mod.version,
                homepageURL: mod.homepageURL,
                notes: Array.isArray(mod.notes) ? mod.notes.slice() : [],
                enabled: mod.enabled,
                loaded: mod.type === 'css' ? !!(this.styleNodes[mod.id] && this.styleNodes[mod.id].isConnected) : mod.loaded
            }));
        },
        async setModEnabled(id, enabled) {
            const mod = this.mods.find(function (item) {
                return item.id === id;
            });

            if (!mod) {
                return null;
            }

            if (mod.internal) {
                return {
                    id: mod.id,
                    type: mod.type,
                    enabled: true,
                    applied: false,
                    restartRequired: false,
                    persisted: true
                };
            }

            const nextEnabled = !!enabled;
            mod.enabled = nextEnabled;

            if (nextEnabled) {
                delete this.state.disabled[id];
            } else {
                this.state.disabled[id] = true;
            }

            const persisted = await this.persistState();
            let applied = false;
            let restartRequired = false;

            if (mod.type === 'css') {
                if (nextEnabled) {
                    this.enableStyleMod(mod);
                } else {
                    this.disableStyleMod(mod);
                }
                applied = true;
            } else {
                restartRequired = true;
            }

            const result = {
                id: mod.id,
                type: mod.type,
                enabled: nextEnabled,
                applied: applied,
                restartRequired: restartRequired,
                persisted: persisted
            };

            this.emitChange(result);
            return result;
        },
        async resetModState() {
            const hadScriptOverrides = this.scripts.some(function (mod) {
                return !mod.internal && mod.enabled === false;
            });

            this.state = createDefaultState();
            this.mods.forEach((mod) => {
                mod.enabled = true;
                if (mod.type === 'css') {
                    this.enableStyleMod(mod);
                }
            });

            const persisted = await this.persistState();
            const result = {
                reset: true,
                persisted: persisted,
                restartRequired: hadScriptOverrides,
                mods: this.getMods()
            };

            this.emitChange(result);
            return result;
        },
        emitChange(detail) {
            window.dispatchEvent(new CustomEvent(MODS_CHANGED_EVENT, {
                detail: detail
            }));
        },
        ensureAddedNodeObserver() {
            if (this.addedNodeObserver) {
                return true;
            }

            const root = document.documentElement;
            if (!root || typeof MutationObserver !== 'function') {
                return false;
            }

            this.addedNodeObserver = new MutationObserver((records) => {
                const callbacks = Array.from(this.addedNodeCallbacks);
                records.forEach((record) => {
                    record.addedNodes.forEach((node) => {
                        if (node.nodeType !== 1) {
                            return;
                        }

                        callbacks.forEach((callback) => {
                            try {
                                callback(node, record);
                            } catch (error) {
                                console.error('[userChrome.js] Added-node callback failed.', error);
                            }
                        });
                    });
                });
            });
            this.addedNodeObserver.observe(root, {
                childList: true,
                subtree: true
            });
            return true;
        },
        observeAddedNodes(callback) {
            if (typeof callback !== 'function') {
                throw new TypeError('Added-node callback must be a function');
            }

            this.addedNodeCallbacks.add(callback);
            if (!this.ensureAddedNodeObserver()) {
                this.addedNodeCallbacks.delete(callback);
                console.warn('[userChrome.js] MutationObserver is unavailable.');
                return function () {};
            }

            return () => {
                this.addedNodeCallbacks.delete(callback);
                if (this.addedNodeCallbacks.size || !this.addedNodeObserver) {
                    return;
                }

                this.addedNodeObserver.disconnect();
                this.addedNodeObserver = null;
            };
        },
        ensureAlertStyle() {
            if (document.getElementById(ALERT_STYLE_ID)) {
                return true;
            }

            if (!document.head) {
                return false;
            }

            const style = document.createElement('style');
            style.id = ALERT_STYLE_ID;
            style.textContent = `
                #${ALERT_CONTAINER_ID} {
                    position: fixed;
                    right: 20px;
                    bottom: 20px;
                    z-index: 2147483647;
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    gap: 10px;
                    width: min(360px, calc(100vw - 32px));
                    pointer-events: none;
                }

                #${ALERT_CONTAINER_ID} .userchrome-alert {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    padding: 12px 40px 12px 14px;
                    border: 1px solid var(--colorBorder, rgba(0, 0, 0, 0.16));
                    border-radius: 12px;
                    background: var(--colorBg, rgba(255, 255, 255, 0.96));
                    color: var(--colorFg, #222);
                    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2);
                    backdrop-filter: blur(10px);
                    opacity: 0;
                    transform: translateY(8px);
                    transition: opacity 160ms ease, transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
                    pointer-events: auto;
                }

                #${ALERT_CONTAINER_ID} .userchrome-alert.is-visible {
                    opacity: 1;
                    transform: translateY(0);
                }

                #${ALERT_CONTAINER_ID} .userchrome-alert.is-closing {
                    opacity: 0;
                    transform: translateY(10px);
                }

                #${ALERT_CONTAINER_ID} .userchrome-alert[data-type='info'] {
                    border-left: 4px solid #2563eb;
                }

                #${ALERT_CONTAINER_ID} .userchrome-alert[data-type='success'] {
                    border-left: 4px solid #2e7d32;
                }

                #${ALERT_CONTAINER_ID} .userchrome-alert[data-type='warn'] {
                    border-left: 4px solid #b26a00;
                }

                #${ALERT_CONTAINER_ID} .userchrome-alert[data-type='error'] {
                    border-left: 4px solid #c62828;
                }

                #${ALERT_CONTAINER_ID} .userchrome-alert.is-clickable {
                    cursor: pointer;
                }

                #${ALERT_CONTAINER_ID} .userchrome-alert.is-clickable:hover,
                #${ALERT_CONTAINER_ID} .userchrome-alert.is-clickable:focus-visible {
                    border-color: var(--colorHighlightBg, rgba(37, 99, 235, 0.4));
                    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.24);
                    outline: none;
                }

                #${ALERT_CONTAINER_ID} .userchrome-alert-title {
                    margin: 0;
                    font-size: 13px;
                    font-weight: 700;
                    line-height: 1.35;
                }

                #${ALERT_CONTAINER_ID} .userchrome-alert-message {
                    margin: 0;
                    font-size: 12px;
                    line-height: 1.5;
                    word-break: break-word;
                }

                #${ALERT_CONTAINER_ID} .userchrome-alert-close {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    width: 24px;
                    height: 24px;
                    padding: 0;
                    border: none;
                    border-radius: 999px;
                    background: transparent;
                    color: inherit;
                    font-size: 16px;
                    line-height: 1;
                    cursor: pointer;
                    opacity: 0.72;
                }

                #${ALERT_CONTAINER_ID} .userchrome-alert-close:hover,
                #${ALERT_CONTAINER_ID} .userchrome-alert-close:focus-visible {
                    background: rgba(0, 0, 0, 0.08);
                    opacity: 1;
                    outline: none;
                }
            `;
            document.head.appendChild(style);
            return true;
        },
        ensureAlertContainer() {
            if (this.alertContainer && this.alertContainer.isConnected) {
                return this.alertContainer;
            }

            if (!this.ensureAlertStyle() || !document.body) {
                return null;
            }

            const container = document.createElement('section');
            container.id = ALERT_CONTAINER_ID;
            container.setAttribute('aria-live', 'polite');
            container.setAttribute('aria-atomic', 'false');
            document.body.appendChild(container);
            this.alertContainer = container;
            return container;
        },
        scheduleAlertFlush() {
            if (this.alertMountTimer) {
                return;
            }

            this.alertMountTimer = setTimeout(() => {
                this.alertMountTimer = null;
                this.flushAlertQueue();
            }, 120);
        },
        flushAlertQueue() {
            const container = this.ensureAlertContainer();
            if (!container) {
                if (this.alertQueue.length) {
                    this.scheduleAlertFlush();
                }
                return;
            }

            while (this.alertQueue.length) {
                const notification = this.alertQueue.shift();
                if (!notification || notification.closed) {
                    continue;
                }

                container.appendChild(notification.element);
                requestAnimationFrame(function () {
                    notification.element.classList.add('is-visible');
                });
            }
        },
        closeAlert(notification) {
            if (!notification || notification.closed) {
                return;
            }

            notification.closed = true;

            if (notification.timerId) {
                clearTimeout(notification.timerId);
                notification.timerId = null;
            }

            this.alertQueue = this.alertQueue.filter(function (queued) {
                return queued !== notification;
            });

            const teardown = function () {
                if (notification.element && notification.element.parentNode) {
                    notification.element.parentNode.removeChild(notification.element);
                }
            };

            if (!notification.element || !notification.element.isConnected) {
                teardown();
                return;
            }

            notification.element.classList.remove('is-visible');
            notification.element.classList.add('is-closing');
            setTimeout(teardown, 180);
        },
        createAlertElement(notification) {
            const element = document.createElement('article');
            element.className = 'userchrome-alert';
            element.dataset.type = notification.type;
            element.setAttribute('role', 'status');

            if (notification.onClick) {
                element.classList.add('is-clickable');
                element.setAttribute('role', 'button');
                element.tabIndex = 0;
            }

            if (notification.title) {
                element.appendChild(this.createElement('p', {
                    class: 'userchrome-alert-title',
                    innerText: notification.title
                }));
            }

            element.appendChild(this.createElement('p', {
                class: 'userchrome-alert-message',
                innerText: notification.message
            }));

            if (notification.closable) {
                element.appendChild(this.createElement('button', {
                    class: 'userchrome-alert-close',
                    type: 'button',
                    'aria-label': '关闭通知',
                    innerText: '×',
                    onclick: (event) => {
                        event.stopPropagation();
                        this.closeAlert(notification);
                    }
                }));
            }

            if (notification.onClick) {
                const triggerClick = (event) => {
                    try {
                        notification.onClick(event, notification);
                    } catch (error) {
                        console.error('[userChrome.js] Alert onClick failed.', error);
                    }
                    this.closeAlert(notification);
                };

                element.addEventListener('click', function (event) {
                    if (event.target && event.target.closest('.userchrome-alert-close')) {
                        return;
                    }
                    triggerClick(event);
                });

                element.addEventListener('keydown', function (event) {
                    if (event.key !== 'Enter' && event.key !== ' ') {
                        return;
                    }
                    event.preventDefault();
                    triggerClick(event);
                });
            }

            return element;
        },
        alert(message, options) {
            const settings = sanitizeAlertOptions(message, options);
            if (!settings.message) {
                return null;
            }

            const notification = {
                id: ++this.alertCounter,
                title: settings.title,
                message: settings.message,
                type: settings.type,
                duration: settings.duration,
                closable: settings.closable,
                onClick: settings.onClick,
                timerId: null,
                closed: false,
                element: null
            };

            notification.close = () => {
                this.closeAlert(notification);
            };

            notification.element = this.createAlertElement(notification);
            this.alertQueue.push(notification);
            this.flushAlertQueue();

            if (!notification.element.isConnected) {
                this.scheduleAlertFlush();
            }

            if (notification.duration > 0) {
                notification.timerId = setTimeout(() => {
                    this.closeAlert(notification);
                }, notification.duration);
            }

            return notification;
        },
        createElement(tag, attrs) {
            const el = document.createElement(tag);
            for (const attr in attrs) {
                switch (attr) {
                    case 'testContent':
                    case 'innerText':
                    case 'innerHTML':
                        el[attr] = attrs[attr];
                        break;
                    case 'style':
                        if (typeof attrs[attr] === 'object') {
                            const styles = attrs[attr];
                            for (const style in styles) {
                                el.style.setProperty(style, styles[style]);
                            }
                        }
                        break;
                    default:
                        if (attr.startsWith('on') && typeof attrs[attr] === 'function') {
                            el.addEventListener(attr.substring(2), attrs[attr]);
                        } else {
                            el.setAttribute(attr, attrs[attr]);
                        }
                }
            }
            return el;
        }
    };

    function getPackageDirectoryEntryAsync() {
        return new Promise(function (resolve, reject) {
            chrome.runtime.getPackageDirectoryEntry(function (entry) {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                    return;
                }
                resolve(entry);
            });
        });
    }

    function readEntriesAsync(directory) {
        return new Promise(function (resolve, reject) {
            const reader = directory.createReader();
            const entries = [];

            function readNextBatch() {
                reader.readEntries(function (batch) {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                        return;
                    }

                    if (!batch.length) {
                        resolve(entries);
                        return;
                    }

                    entries.push(...batch);
                    readNextBatch();
                });
            }

            readNextBatch();
        });
    }

    window.userChrome_js.init();
})();
