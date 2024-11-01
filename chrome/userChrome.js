// ==UserScript==
// @name            userChrome.js
// @description     Vivaldi Mods Loader
// @license         MIT License
// @compatibility   Vivaldi 6.2
// @version         0.0.5
// @charset         UTF-8
// @homepageURL     https://github.com/benzBrake/VivaldiMods
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

    function $ (selector, context) {
        context = context || document; // 默认上下文为 document
        this.elements = [];
        if (typeof selector === 'string') {
            if (selector === "document") {
                this.elements = [document];
            } else {
                this.elements = [...context.querySelectorAll(selector)];
            }
        } else if (selector instanceof Document) {
            this.elements = [selector];
        } else if (selector instanceof HTMLElement) {
            this.elements = [selector];
        }
    }

    // 遍历每个选中的元素
    $.prototype.each = function (callback) {
        this.elements.forEach((el, index) => {
            callback.call(el, index, el);
        });
        return this;
    };

    // 实现 find 功能，指定在当前元素范围内进行选择
    $.prototype.find = function (selector) {
        const results = [];
        this.each(function () {
            results.push(...this.querySelectorAll(selector));
        });
        this.elements = results;
        return this;
    };

    // 获取符合选择器的最近父元素
    $.prototype.closest = function (selector) {
        const closestElements = [];
        this.each(function () {
            let current = this;
            while (current) {
                if (current.matches(selector)) {
                    closestElements.push(current);
                    break;
                }
                current = current.parentElement; // 向上遍历父元素
            }
        });
        let obj = new $();
        obj.elements = closestElements;
        return obj;
    };

    // 检查每个选中元素是否具有指定的类
    $.prototype.hasClass = function (className) {
        let hasClass = false;
        this.each(function () {
            if (this.classList.contains(className)) {
                hasClass = true;
            }
        });
        return hasClass;
    };

    // 添加 class 操作
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

    // 添加事件监听
    $.prototype.on = function (event, handler) {
        return this.each(function () {
            this.addEventListener(event, handler);
        });
    };

    // 移除事件监听
    $.prototype.off = function (event, handler) {
        return this.each(function () {
            this.removeEventListener(event, handler);
        });
    };

    // 触发事件并支持参数
    $.prototype.trigger = function (eventName, detail) {
        const event = new CustomEvent(eventName, {
            bubbles: true,
            cancelable: true,
            detail: detail // 传递的参数
        });
        return this.each(function () {
            this.dispatchEvent(event);
        });
    };

    // 获取元素
    $.prototype.get = function (index) {
        return this.elements[index];
    };

    // 增加 length 属性
    Object.defineProperty($.prototype, 'length', {
        get: function () {
            return this.elements.length;
        }
    });

    // 将工具函数绑定到全局对象
    window.$ = function (selector, context) {
        return new $(selector, context);
    };

    window.userChrome_js = {
        scripts: [],
        styles: [],
        async init () {
            const directory = await getPackageDirectoryEntryAsync();
            const entries = await readEntriesAsync(directory);
            for (const e of entries) {
                if (e.isDirectory && e.name === "chrome") {
                    await this.listMods(e);
                }
            }
            setTimeout(function wait () {
                const browser = document.querySelector('browser');
                if (typeof browser !== "undefined") {
                    userChrome_js.injectMods();
                } else {
                    setTimeout(wait, 300);
                }
            }, 300);
        },
        async listMods (directory) {
            console.log("getMods: " + directory.fullPath.replace('/crxfs/', ''));

            const entries = await readEntriesAsync(directory);

            for (const mod of entries) {
                if (mod.isDirectory && !MODS_SKIP_DIRS.includes(mod.name)) {
                    await this.listMods(mod);
                } else {
                    if (!MODS_SKIP_LIST.includes(mod.name))
                        await this.addMod(mod);
                }
            }
        },
        addMod (mod) {
            var modPath = mod.fullPath.replace('/crxfs/', '');
            if (mod.isFile) {
                if (mod.name.toLowerCase().endsWith(MODS_SCRIPT_EXTENSION)) {
                    console.log("addMod(JS): " + modPath);
                    this.scripts.push({
                        path: modPath,
                        loaded: false
                    });
                } else if (mod.name.toLowerCase().endsWith(MODS_STYLE_EXTENSION)) {
                    console.log("addMod(CSS): " + modPath);
                    this.styles.push({
                        path: modPath,
                        loaded: true
                    });
                }
            }
        },
        injectMods () {
            for (var i = 0; i < this.scripts.length; i++) {
                console.log("Injecting script: " + this.scripts[i].path.replace(MODS_DIRECTORY_NAME + '/', ''));
                if (this.scripts[i].loaded) {
                    continue;
                }
                var script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = this.scripts[i].path;
                script.onload = (function (i) {
                    this.scripts[i].loaded = true;
                }).bind(this, i);
                document.querySelector('body').appendChild(script);
            }
            for (var i = 0; i < this.styles.length; i++) {
                injectStyle(this.styles[i].path);
            }
        }
    }

    function getPackageDirectoryEntryAsync () {
        return new Promise((resolve, reject) => {
            chrome.runtime.getPackageDirectoryEntry((entry) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(entry);
                }
            });
        });
    }

    function readEntriesAsync (directory) {
        return new Promise((resolve, reject) => {
            const reader = directory.createReader();
            reader.readEntries((entries) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(entries);
                }
            });
        });
    }

    function injectStyle (file) {
        console.log("Injecting style: " + file.replace(MODS_DIRECTORY_NAME + '/', ''));
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = file;
        document.getElementsByTagName('head')[0].appendChild(link);
        return link;
    }


    const appendChild = Element.prototype.appendChild;
    Element.prototype.appendChild = function () {
        let customEvent = new CustomEvent('appendChild', { detail: arguments });
        document.dispatchEvent(customEvent);
        return appendChild.apply(this, arguments);
    };

    window.userChrome_js.init();
})()
