// ==UserScript==
// @name            userChrome.js
// @description     Vivaldi Mods Loader
// @license         MIT License
// @compatibility   Vivaldi 7.9
// @version         0.1.0
// @charset         UTF-8
// @homepageURL     https://github.com/benzBrake/VivaldiMods
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
                this.addEventListener(event, function (e) {
                    const potentialElements = this.querySelectorAll(selectorOrHandler);
                    let target = e.target;
                    while (target && target !== this) {
                        if ([...potentialElements].includes(target)) {
                            handler.call(target, e);
                            break;
                        }
                        target = target.parentNode;
                    }
                });
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
                const delegatedHandler = function (e) {
                    const potentialElements = element.querySelectorAll(selectorOrHandler);
                    let target = e.target;
                    while (target && target !== element) {
                        if ([...potentialElements].includes(target)) {
                            handler.call(target, e);
                            break;
                        }
                        target = target.parentNode;
                    }
                };
                element.removeEventListener(event, delegatedHandler);
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

    window.userChrome_js = {
        scripts: [],
        styles: [],
        mods: [],
        styleNodes: {},
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
                    window.userChrome_js.injectMods();
                }, 300);
            } catch (error) {
                console.error('[userChrome.js] Initialization failed.', error);
            }
        },
        async findModsDirectory(directory) {
            const entries = await readEntriesAsync(directory);
            for (const entry of entries) {
                if (entry.isDirectory && entry.name === MODS_DIRECTORY_NAME) {
                    return entry;
                }
            }
            return null;
        },
        async listMods(directory) {
            console.log('getMods: ' + normalizePath(directory.fullPath));
            const entries = await readEntriesAsync(directory);

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
                loaded: false
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
            const container = document.body || document.documentElement;
            if (!container) {
                console.warn('[userChrome.js] Injection container is unavailable.');
                return;
            }

            this.scripts.forEach((mod) => {
                if (!mod.enabled || mod.loaded) {
                    return;
                }

                console.log('Injecting script: ' + mod.relativePath);
                const script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = mod.path;
                script.dataset.userchromeId = mod.id;
                script.onload = function () {
                    mod.loaded = true;
                };
                container.appendChild(script);
            });

            this.styles.forEach((mod) => {
                if (!mod.enabled) {
                    return;
                }
                this.enableStyleMod(mod);
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

    const appendChild = Element.prototype.appendChild;
    Element.prototype.appendChild = function () {
        const customEvent = new CustomEvent('appendChild', { detail: arguments });
        document.dispatchEvent(customEvent);
        return appendChild.apply(this, arguments);
    };

    window.userChrome_js.init();
})();
