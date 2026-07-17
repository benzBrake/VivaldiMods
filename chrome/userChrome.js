// ==UserScript==
// @name            userChrome.js
// @description     Vivaldi Mods Loader
// @license         MIT License
// @compatibility   Vivaldi 8.1
// @version         0.1.0
// @charset         UTF-8
// @homepageURL     https://github.com/benzBrake/VivaldiMods
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
            current: null
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
                    overflow: auto;
                    border: 1px solid var(--colorBorder, rgba(0, 0, 0, 0.2));
                    border-radius: 6px;
                    background: var(--colorBg, #fff);
                    color: var(--colorFg, #222);
                    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.24);
                    pointer-events: auto;
                }

                #${MENU_ROOT_ID} .userchrome-menu-item {
                    display: grid;
                    grid-template-columns: 16px minmax(0, 1fr) auto;
                    column-gap: 8px;
                    align-items: center;
                    width: 100%;
                    min-height: 30px;
                    padding: 5px 8px;
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
                #${MENU_ROOT_ID} .userchrome-menu-item:focus-visible {
                    background: var(--colorHighlightBg, rgba(0, 102, 204, 0.16));
                    color: var(--colorHighlightFg, inherit);
                    outline: none;
                }

                #${MENU_ROOT_ID} .userchrome-menu-item:disabled {
                    color: var(--colorFgFaded, rgba(34, 34, 34, 0.45));
                    cursor: default;
                }

                #${MENU_ROOT_ID} .userchrome-menu-item:disabled:hover {
                    background: transparent;
                }

                #${MENU_ROOT_ID} .userchrome-menu-check {
                    width: 16px;
                    font-size: 14px;
                    font-weight: 700;
                    line-height: 1;
                    text-align: center;
                }

                #${MENU_ROOT_ID} .userchrome-menu-label {
                    min-width: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                #${MENU_ROOT_ID} .userchrome-menu-shortcut {
                    margin-left: 18px;
                    color: var(--colorFgFaded, rgba(34, 34, 34, 0.65));
                    font-size: 12px;
                    white-space: nowrap;
                }

                #${MENU_ROOT_ID} .userchrome-menu-separator {
                    height: 1px;
                    margin: 4px 6px;
                    background: var(--colorBorder, rgba(0, 0, 0, 0.16));
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

        function normalizeOptions(options) {
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

            if (!Array.isArray(options.items)) {
                throw new TypeError('Menu items must be an array.');
            }

            const items = options.items.map(function (item, index) {
                if (!item || typeof item !== 'object') {
                    throw new TypeError('Menu item at index ' + index + ' must be an object.');
                }

                if (item.type === 'separator') {
                    return { type: 'separator' };
                }

                if (typeof item.label !== 'string') {
                    throw new TypeError('Menu item at index ' + index + ' requires a string label.');
                }

                return {
                    id: typeof item.id === 'string' ? item.id : '',
                    type: item.type === 'checkbox' ? 'checkbox' : 'item',
                    label: item.label,
                    checked: item.type === 'checkbox' && item.checked === true,
                    disabled: item.disabled === true,
                    shortcut: typeof item.shortcut === 'string' ? item.shortcut : '',
                    onSelect: typeof item.onSelect === 'function' ? item.onSelect : null
                };
            });

            if (!items.some(function (item) {
                return item.type !== 'separator';
            })) {
                throw new TypeError('Menu requires at least one non-separator item.');
            }

            return {
                anchor: hasAnchor ? options.anchor : null,
                position: hasPosition ? { x: position.x, y: position.y } : null,
                items: items,
                ariaLabel: typeof options.ariaLabel === 'string' && options.ariaLabel.trim()
                    ? options.ariaLabel.trim()
                    : '菜单',
                restoreFocus: options.restoreFocus instanceof HTMLElement
                    ? options.restoreFocus
                    : (hasAnchor ? options.anchor : null),
                onClose: typeof options.onClose === 'function' ? options.onClose : null
            };
        }

        function getFocusableItems(current) {
            return current.itemElements.filter(function (entry) {
                return !entry.item.disabled;
            });
        }

        function focusItem(current, index) {
            const focusableItems = getFocusableItems(current);
            if (!focusableItems.length) {
                return;
            }

            const normalizedIndex = ((index % focusableItems.length) + focusableItems.length) % focusableItems.length;
            current.focusedIndex = normalizedIndex;
            focusableItems[normalizedIndex].element.focus();
        }

        function restoreFocus(current) {
            const target = current.options.restoreFocus;
            if (target && target.isConnected && typeof target.focus === 'function') {
                target.focus({ preventScroll: true });
            }
        }

        function invokeSelect(current, entry, event) {
            if (entry.item.disabled || !state.current || state.current !== current) {
                return;
            }

            close('select');
            if (!entry.item.onSelect) {
                return;
            }

            try {
                Promise.resolve(entry.item.onSelect({
                    id: entry.item.id,
                    checked: entry.item.type === 'checkbox' ? !entry.item.checked : entry.item.checked,
                    previousChecked: entry.item.checked,
                    event: event
                })).catch(function (error) {
                    console.error('[userChrome.menu] Item callback failed.', error);
                });
            } catch (error) {
                console.error('[userChrome.menu] Item callback failed.', error);
            }
        }

        function positionMenu(current) {
            if (!current || !current.element.isConnected) {
                return;
            }

            if (current.options.anchor && !current.options.anchor.isConnected) {
                close('anchor-removed', false);
                return;
            }

            const menu = current.element;
            menu.style.visibility = 'hidden';
            menu.style.left = '0px';
            menu.style.top = '0px';

            const rect = menu.getBoundingClientRect();
            const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
            const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
            let x;
            let y;

            if (current.options.anchor) {
                const anchorRect = current.options.anchor.getBoundingClientRect();
                x = anchorRect.left;
                y = anchorRect.bottom;
                if (y + rect.height > viewportHeight - MENU_VIEWPORT_MARGIN) {
                    y = anchorRect.top - rect.height;
                }
                if (x + rect.width > viewportWidth - MENU_VIEWPORT_MARGIN) {
                    x = anchorRect.right - rect.width;
                }
            } else {
                x = current.options.position.x;
                y = current.options.position.y;
                if (x + rect.width > viewportWidth - MENU_VIEWPORT_MARGIN) {
                    x -= rect.width;
                }
                if (y + rect.height > viewportHeight - MENU_VIEWPORT_MARGIN) {
                    y -= rect.height;
                }
            }

            x = Math.max(MENU_VIEWPORT_MARGIN, Math.min(x, viewportWidth - rect.width - MENU_VIEWPORT_MARGIN));
            y = Math.max(MENU_VIEWPORT_MARGIN, Math.min(y, viewportHeight - rect.height - MENU_VIEWPORT_MARGIN));
            menu.style.left = Math.round(x) + 'px';
            menu.style.top = Math.round(y) + 'px';
            menu.style.visibility = '';
        }

        function handleKeydown(event) {
            const current = state.current;
            if (!current) {
                return;
            }

            const focusableItems = getFocusableItems(current);
            if (event.key === 'Escape') {
                event.preventDefault();
                close('escape');
                return;
            }
            if (event.key === 'Tab') {
                close('tab');
                return;
            }
            if (!focusableItems.length) {
                return;
            }

            if (event.key === 'ArrowDown') {
                event.preventDefault();
                focusItem(current, current.focusedIndex + 1);
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                focusItem(current, current.focusedIndex - 1);
            } else if (event.key === 'Home') {
                event.preventDefault();
                focusItem(current, 0);
            } else if (event.key === 'End') {
                event.preventDefault();
                focusItem(current, focusableItems.length - 1);
            }
        }

        function handleOutsideInteraction(event) {
            const current = state.current;
            if (!current) {
                return;
            }

            const eventPath = typeof event.composedPath === 'function' ? event.composedPath() : null;
            if (eventPath ? eventPath.includes(current.element) : current.element.contains(event.target)) {
                return;
            }

            close('outside', false);
        }

        function close(reason, shouldRestoreFocus) {
            const current = state.current;
            if (!current) {
                return;
            }

            state.current = null;
            document.removeEventListener('keydown', handleKeydown, true);
            window.removeEventListener('pointerdown', handleOutsideInteraction, true);
            window.removeEventListener('mousedown', handleOutsideInteraction, true);
            window.removeEventListener('resize', current.reposition);
            window.removeEventListener('scroll', current.reposition, true);
            if (current.anchorObserver) {
                current.anchorObserver.disconnect();
            }
            current.element.remove();

            if (shouldRestoreFocus !== false) {
                restoreFocus(current);
            }

            if (current.options.onClose) {
                try {
                    current.options.onClose(reason || 'close');
                } catch (error) {
                    console.error('[userChrome.menu] Close callback failed.', error);
                }
            }
        }

        function open(options) {
            const normalizedOptions = normalizeOptions(options);
            const root = ensureRoot();
            if (!root) {
                return null;
            }

            close('replace', false);

            const menu = document.createElement('div');
            menu.className = 'userchrome-menu';
            menu.setAttribute('role', 'menu');
            menu.setAttribute('aria-label', normalizedOptions.ariaLabel);

            const current = {
                options: normalizedOptions,
                element: menu,
                itemElements: [],
                focusedIndex: 0,
                reposition: null,
                anchorObserver: null
            };

            normalizedOptions.items.forEach(function (item) {
                if (item.type === 'separator') {
                    const separator = document.createElement('div');
                    separator.className = 'userchrome-menu-separator';
                    separator.setAttribute('role', 'separator');
                    menu.appendChild(separator);
                    return;
                }

                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'userchrome-menu-item';
                button.setAttribute('role', item.type === 'checkbox' ? 'menuitemcheckbox' : 'menuitem');
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
                check.textContent = item.type === 'checkbox' && item.checked ? '✓' : '';
                const label = document.createElement('span');
                label.className = 'userchrome-menu-label';
                label.textContent = item.label;
                const shortcut = document.createElement('span');
                shortcut.className = 'userchrome-menu-shortcut';
                shortcut.textContent = item.shortcut;

                button.appendChild(check);
                button.appendChild(label);
                button.appendChild(shortcut);
                const entry = { item: item, element: button };
                button.addEventListener('focus', function () {
                    const focusableItems = getFocusableItems(current);
                    current.focusedIndex = focusableItems.indexOf(entry);
                });
                button.addEventListener('click', function (event) {
                    invokeSelect(current, entry, event);
                });
                menu.appendChild(button);
                current.itemElements.push(entry);
            });

            current.reposition = function () {
                positionMenu(current);
            };
            root.appendChild(menu);
            state.current = current;
            if (current.options.anchor && typeof MutationObserver === 'function') {
                current.anchorObserver = new MutationObserver(function () {
                    if (state.current !== current) {
                        current.anchorObserver.disconnect();
                        return;
                    }
                    if (!current.options.anchor.isConnected) {
                        close('anchor-removed', false);
                    }
                });
                current.anchorObserver.observe(document.documentElement, {
                    childList: true,
                    subtree: true
                });
            }
            document.addEventListener('keydown', handleKeydown, true);
            // 在 window 捕获阶段监听，避免 Vivaldi UI 的 document 事件处理拦截菜单外点击。
            window.addEventListener('pointerdown', handleOutsideInteraction, true);
            // 兼容未派发 PointerEvent 的鼠标输入环境；重复事件会因菜单已关闭而被忽略。
            window.addEventListener('mousedown', handleOutsideInteraction, true);
            window.addEventListener('resize', current.reposition);
            window.addEventListener('scroll', current.reposition, true);
            positionMenu(current);

            requestAnimationFrame(function () {
                if (state.current === current) {
                    focusItem(current, 0);
                }
            });

            return {
                close: function (reason) {
                    if (state.current === current) {
                        close(reason || 'close');
                    }
                }
            };
        }

        return {
            open: open,
            close: function (reason) {
                close(reason || 'close');
            }
        };
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
