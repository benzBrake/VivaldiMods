// ==UserScript==
// @name            chromeDevtools_Button.ac.js
// @description     侧边栏增加 Chrome DevTools 按钮
// @license         MIT License
// @compatibility   Vivaldi 6
// @version         20241026
// @charset         UTF-8
// @homepageURL     https://github.com/benzBrake/VivaldiMods/tree/main/chrome/userChromeJS
// ==/UserScript==
(() => {
    let wrapper = userChrome_js.createElement('div', {
        class: 'button-toolbar panel-clickoutside-ignore'
    });
    let btn = userChrome_js.createElement('button', {
        name: 'ChromeDevTools',
        title: '打开 Chrome DevTools',
        type: "button",
        'aria-label': 'Open DevTools',
        tabindex: -1,
        onclick: async (e) => {
            e.preventDefault();
            // 在新标签页中打开 vivaldi:inspect/#apps
            await chrome.tabs.create({
                url: 'vivaldi:inspect/#apps',
                active: true
            });
        },
        innerHTML: `<span class="button-icon override"><svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor" style="width:16px;height:16px"><path d="M2 1a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h5v-1H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v7a1 1 0 0 1-.885.994l.446.445c.113.114.205.242.275.38A2.001 2.001 0 0 0 16 10V3a2 2 0 0 0-2-2H2zm6.598 6.01A.5.5 0 0 0 8 7.5v7a.5.5 0 0 0 .91.287l1.57-2.246 2.944.453a.499.499 0 0 0 .43-.848l-5-5a.499.499 0 0 0-.256-.136zM9 8.707l3.066 3.066-1.74-.267a.5.5 0 0 0-.486.207L9 12.914V8.707z"/></svg></span>`
    });
    wrapper.appendChild(btn);
    let panel = document.querySelector('#panels-container #switch .toolbar');
    panel.insertBefore(wrapper, panel.lastChild);
})()