// ==UserScript==
// @name            rightClickTabToClose.uc.js
// @description     右键关闭标签页
// @license         MIT License
// @compatibility   Vivaldi 6
// @version         20240309
// @charset         UTF-8
// @homepageURL     https://github.com/benzBrake/VivaldiMods/tree/main/chrome/userChromeJS
// @note            20240309 支持关闭标签分组，修复不兼容关闭最后一个标签页不关闭窗口
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
                    let keepWindowOpenAfterLastTabClosed = await vivaldi.prefs.get('vivaldi.tabs.never_close_last');
                    let currentId = tab.id.replace(/^tab-/g, "");
                    let homePage = await vivaldi.prefs.get('vivaldi.homepage');
                    let tabs = await chrome.tabs.query({ currentWindow: true });
                    let isLastTabEl = tab.closest('.tab-strip').querySelectorAll(':scope>span').length === 1; // 是否为最后一个 Tab
                    if (keepWindowOpenAfterLastTabClosed && isLastTabEl) {
                        // 创建新标签页，并删除此标签页以外的标签页，包括标签栈
                        const lastTab = await chrome.tabs.create({ url: homePage });
                        await chrome.tabs.remove(tabs.filter(t => t.id !== lastTab.id).map(t => t.id));
                    } else {
                        if (tab.parentNode.classList.contains("is-substack")) {
                            tabs = tabs.filter(t => {
                                return JSON.parse(t.vivExtData).group == currentId;
                            });
                            if (tabs.length > 0) {
                                chrome.tabs.remove(tabs.map(t => t.id));
                            }
                        } else {
                            chrome.tabs.remove(Number(currentId));
                        }
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