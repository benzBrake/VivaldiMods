// ==UserScript==
// @name            undoCloseTab_Button.ac.js
// @description     增加撤销关闭标签的功能
// @license         MIT License
// @compatibility   Vivaldi 6
// @version         20241026
// @charset         UTF-8
// @homepageURL     https://github.com/benzBrake/VivaldiMods/tree/main/chrome/userChromeJS
// ==/UserScript==
(() => {
    const restoreWindows = false;
    const createButton = () => {
        if ($('.button-toolbar.undo-close-tab').length) return;
        let ins = document.querySelector('.toggle-trash');
        if (!ins) return;
        if (ins.parentNode.classList.contains('drag-area')) {
            ins = ins.parentNode;
        }
        let wrapper = userChrome_js.createElement('div', {
            class: 'button-toolbar undo-close-tab'
        });
        let btn = userChrome_js.createElement('button', {
            name: 'UndoCloseTab',
            title: '打开最近关闭的标签页',
            type: "button",
            'aria-label': '打开最近关闭的标签页',
            tabindex: -1,
            onclick: async (e) => {
                e.preventDefault();
                e.stopPropagation();
                chrome.sessions.getRecentlyClosed({ maxResults: 1 }, sessions => {
                    if (sessions.length && sessions[0].tab)
                        chrome.sessions.restore(sessions[0].tab.sessionId);
                    else if (sessions.length && sessions[0].window && restoreWindows)
                        chrome.sessions.restore(sessions[0].window.sessionId);
                });
            }
        });
        btn.innerHTML = `<span class="button-icon override"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px"><path fill="none" d="M0 0h24v24H0z"/><path d="M5.828 7l2.536 2.536L6.95 10.95 2 6l4.95-4.95 1.414 1.414L5.828 5H13a8 8 0 1 1 0 16H4v-2h9a6 6 0 1 0 0-12H5.828z"/></svg></span>`;
        wrapper.appendChild(btn);
        ins.after(wrapper);
    }

    createButton();

    // 调整标签位置后重新绑定事件
    $(document).on('appendChild', function (event) {
        const insertElement = event.detail[0];
        if (!insertElement) return;
        if (insertElement.tagName !== "DIV") return;
        if (insertElement.classList.contains("toggle-trash")
        ) {
            setTimeout(createButton, 10);
        }
    });
})()