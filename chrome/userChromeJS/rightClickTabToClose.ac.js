// ==UserScript==
// @name            rightClickTabToClose.uc.js
// @description     右键关闭标签页
// @license         MIT License
// @compatibility   Vivaldi 6
// @version         20240309
// @charset         UTF-8
// @homepageURL     https://github.com/benzBrake/VivaldiMods/tree/main/chrome/userChromeJS
// @note            20240309 支持关闭标签分组
// ==/UserScript==
(function closeTabs(tabContainer, tabSubContainer) {
    // 绑定事件
    function bindEvent(tabContainer) {
        tabContainer.addEventListener("contextmenu", async (e) => {
            let tab = e.target.closest('.tab');
            if (tab) {
                if (
                    !e.shiftKey &&
                    !e.ctrlKey
                ) {
                    e.stopPropagation();
                    e.preventDefault();
                    if (tab.parentNode.classList.contains("is-substack")) {
                        const groupId = tab.id.replace(/^tab-/g, "");
                        let tabs = await chrome.tabs.query({ currentWindow: true });
                        tabs = tabs.filter(t => {
                            return JSON.parse(t.vivExtData).group == groupId;
                        });
                        console.log(tabs);
                        if (tabs.length > 0) {
                            chrome.tabs.remove(tabs.map(t => t.id));
                        }
                    } else {
                        const id = Number(tab.id.replace(/^\D+/g, ""));
                        chrome.tabs.remove(id);
                    }
                }
            }
        });
    }

    bindEvent(tabContainer);
    if (tabSubContainer) {
        bindEvent(tabSubContainer);
    }

    // 调整标签位置后重新绑定事件
    let appendChild = Element.prototype.appendChild;
    Element.prototype.appendChild = function () {
        if (
            arguments[0].tagName === "DIV" &&
            arguments[0].classList.contains("tabbar-wrapper")
        ) {
            bindEvent(arguments[0].querySelector('#tabs-container .tab-strip'));
            if (arguments[0].querySelector('#tabs-subcontainer .tab-strip')) {
                bindEvent(arguments[0].querySelector('#tabs-subcontainer .tab-strip'));
            }
        }
        return appendChild.apply(this, arguments);
    };
})(document.querySelector('#tabs-container .tab-strip'), document.querySelector('#tabs-subcontainer .tab-strip'));