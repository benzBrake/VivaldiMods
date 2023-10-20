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
    if (kissIcon) {
        document.querySelector(".UrlBar-UrlFieldWrapper").nextElementSibling.appendChild(kissIcon);
    }
})();