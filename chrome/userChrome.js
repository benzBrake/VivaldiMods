// ==UserScript==
// @name            userChrome.js
// @description     Vivaldi Mods Loader
// @license         MIT License
// @compatibility   Vivaldi 6.2
// @version         0.0.4
// @charset         UTF-8
// @homepageURL     https://github.com/benzBrake/VivaldiMods
// @note            20240412 Promise 化改造
// @note            20240308 修改载入顺序
// @note            20231019 fix: 重复载入脚本
// ==/UserScript==
(async function () {
    if (window.userChrome_js) return;

    const MODS_DIRECTORY_NAME = 'chrome';
    const MODS_SCRIPT_EXTENSION = '.js';
    const MODS_STYLE_EXTENSION = '.css';

    window.userChrome_js = {
        scripts: [],
        styles: [],
        async init() {
            const directory = await getPackageDirectoryEntryAsync();
            const entries = await readEntriesAsync(directory);
            for (const e of entries) {
                if (e.isDirectory && e.name === "chrome") {
                    await this.listMods(e);
                }
            }
            setTimeout(function wait() {
                const browser = document.querySelector('browser');
                if (typeof browser !== "undefined") {
                    userChrome_js.injectMods();
                } else {
                    setTimeout(wait, 300);
                }
            }, 300);
        },
        async listMods(directory) {
            console.log("getMods: " + directory.fullPath.replace('/crxfs/', ''));

            const entries = await readEntriesAsync(directory);

            for (const mod of entries) {
                if (mod.isDirectory) {
                    await this.listMods(mod);
                } else {
                    await this.addMod(mod);
                }
            }
        },
        addMod(mod) {
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
        injectMods() {
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

    function getPackageDirectoryEntryAsync() {
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

    function readEntriesAsync(directory) {
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


    function injectStyle(file) {
        console.log("Injecting style: " + file.replace(MODS_DIRECTORY_NAME + '/', ''));
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = file;
        document.getElementsByTagName('head')[0].appendChild(link);
        return link;
    }

    window.userChrome_js.init();
})()
