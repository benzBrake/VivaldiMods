// ==UserScript==
// @name            moveKissTranslatorToAddressBar.uc.js
// @description     移动简约翻译按钮到地址栏
// @author          Ryan
// @license         MIT License
// @compatibility   Vivaldi 6
// @version         0.0.1
// @charset         UTF-8
// @homepageURL     https://github.com/benzBrake/VivaldiMods/tree/main/chrome/userChromeJS
// ==/UserScript==
(function() {
    let kissIcon = document.querySelector(".bdiifdefkgmcblbcghdlonllpjhhjgof.ExtensionIcon");
    if (!kissIcon) {
        return;
    }

    document.querySelector(".UrlBar-UrlFieldWrapper").nextElementSibling.appendChild(kissIcon);

    addStyle(`.UrlBar-UrlFieldWrapper+.toolbar-insideinput>.pageload {
        order: 1;
    }
    
    .UrlBar-UrlFieldWrapper+.toolbar-insideinput>.ExtensionIcon {
        order: 5;
    }
    
    .UrlBar-UrlFieldWrapper+.toolbar-insideinput>div:not(.pageload):not(.ExtensionIcon) {
        order: 9
    }`);

    function addStyle(css, isObject = false) {
        if (isObject) {
            css = Object.entries(css).map(([key, value]) => `${key}: ${value};`).join(' ');
        }
        let head = document.head || document.getElementsByTagName('head')[0];
        let style = document.createElement('style');
        style.appendChild(document.createTextNode(css));
        head.appendChild(style);
    }
})();