// ==UserScript==
// @name            userChrome.js
// @description     Vivaldi Mods Loader
// @license         MIT License
// @compatibility   Vivaldi 6.2
// @version         0.0.1
// @charset         UTF-8
// @homepageURL     https://github.com/benzBrake/VivaldiMods
// @note            20231019 fix: 重复载入脚本
// ==/UserScript==
(function () {
    const MODS_DIRECTORY_NAME = 'chrome';
    const MODS_SCRIPT_EXTENSION = '.uc.js';
    const MODS_STYLE_EXTENSION = '.css';

    window.userChrome_js = {
        scripts: [],
        styles: [],
        init() {
            chrome.runtime.getPackageDirectoryEntry(e => {
                e.createReader().readEntries(e => {
                    e.forEach(e => {
                        if (e.isDirectory && MODS_DIRECTORY_NAME === e.name) {
                            this.listMods(e);
                            return;
                        }
                    });
                })
            })
            setTimeout(() => {
                this.injectScripts();
            }, 500)
        },
        listMods(directory) {
            directory.createReader().readEntries(e => {
                e.forEach(mod => {
                    if (mod.isDirectory) {
                        this.listMods(mod)
                    } else {
                        this.injectMod(mod);
                    }
                });
            });
        },
        injectMod(mod) {
            var modPath = mod.fullPath.replace('/crxfs/', '');
            if (mod.isFile) {
                if (mod.name.toLowerCase().endsWith(MODS_SCRIPT_EXTENSION)) {
                    this.scripts.push({
                        path: modPath,
                        loaded: false
                    });
                } else if (mod.name.toLowerCase().endsWith(MODS_STYLE_EXTENSION)) {
                    injectCSS(modPath);
                    this.styles.push({
                        path: modPath,
                        loaded: true
                    });

                }
            }
        },
        injectScripts() {
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
        }
    }

    function injectCSS(file) {
        console.log("Injecting script: " + file.replace(MODS_DIRECTORY_NAME + '/', ''));
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = file;
        document.getElementsByTagName('head')[0].appendChild(link);
    }

    window.userChrome_js.init();
})()
