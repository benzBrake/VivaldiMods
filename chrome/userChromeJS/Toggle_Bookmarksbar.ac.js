// ==UserScript==
// @name            Toggle_Bookmarksbar.ac.js
// @description     双击地址栏显示/隐藏书签栏
// @license         MIT License
// @compatibility   Vivaldi 8.1
// @version         20260715.2
// @charset         UTF-8
// @homepageURL     https://github.com/benzBrake/VivaldiMods/tree/main/chrome/userChromeJS
// ==/UserScript==
(() => {
    const BOOKMARKS_BAR_VISIBLE_PREF = 'vivaldi.bookmarks.bar.visible';
    const URL_FIELD_WRAPPER_SELECTOR = '.UrlBar-UrlFieldWrapper';

    document.addEventListener('dblclick', async (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (!target || !target.closest(URL_FIELD_WRAPPER_SELECTOR)) {
            return;
        }

        const preference = await vivaldi.prefs.get(BOOKMARKS_BAR_VISIBLE_PREF);
        const visible = preference && typeof preference === 'object'
            ? preference.value
            : preference;

        await vivaldi.prefs.set({
            path: BOOKMARKS_BAR_VISIBLE_PREF,
            value: !visible
        });
    }, true);
})();
