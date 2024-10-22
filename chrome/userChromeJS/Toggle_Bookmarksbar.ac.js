// ==UserScript==
// @name            Toggle_Bookmarksbar.ac.js
// @description     双击地址栏显示/隐藏书签栏
// @license         MIT License
// @compatibility   Vivaldi 6
// @version         20241022
// @charset         UTF-8
// @homepageURL     https://github.com/benzBrake/VivaldiMods/tree/main/chrome/userChromeJS
// ==/UserScript==
(_ => {
    const { vivaldi } = window;
    document.querySelector('.UrlBar-UrlFieldWrapper').addEventListener('dblclick', _ => {
        vivaldi.prefs.get('vivaldi.bookmarks.bar.visible', val => {
            vivaldi.prefs.set({ path: "vivaldi.bookmarks.bar.visible", value: !val });
        })
    })
})()