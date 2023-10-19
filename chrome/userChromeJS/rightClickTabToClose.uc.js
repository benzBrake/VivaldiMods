// ==UserScript==
// @name            activateTabOnHover.uc.js
// @description     激活鼠标指向标签页
// @license         MIT License
// @compatibility   Vivaldi 6
// @version         0.0.1
// @charset         UTF-8
// @homepageURL     https://github.com/benzBrake/VivaldiMods/tree/main/chrome/userChromeJS
// ==/UserScript==
(function activateTab(tabContainer) {
    // 绑定事件
    function bindEvent(tabContainer) {
        tabContainer.addEventListener("contextmenu", (e) => {
            let tab = e.target.closest('.tab');
            if (tab) {
                if (
                    !e.shiftKey &&
                    !e.ctrlKey
                ) {
                    e.stopPropagation();
                    e.preventDefault();
                    const id = Number(tab.id.replace(/^\D+/g, ""));
                    let removing = chrome.tabs.remove(id);
                    removing.then(function() {
                        console.log("remove tab: " + id);
                    });
                }
            }
        });
    }

    bindEvent(tabContainer);

    // 调整标签位置后重新绑定事件
    let appendChild = Element.prototype.appendChild;
    Element.prototype.appendChild = function () {
        if (
            arguments[0].tagName === "DIV" &&
            arguments[0].classList.contains("tabbar-wrapper")
        ) {
            bindEvent(arguments[0].querySelector('#tabs-container .tab-strip'));
        }
        return appendChild.apply(this, arguments);
    };
})(document.querySelector('#tabs-container .tab-strip'));
