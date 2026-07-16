// ==UserScript==
// @name            undoCloseTab_Button.ac.js
// @description     增加撤销关闭标签的功能
// @license         MIT License
// @compatibility   Vivaldi 7.9
// @version         20260716
// @charset         UTF-8
// @homepageURL     https://github.com/benzBrake/VivaldiMods/tree/main/chrome/userChromeJS
// ==/UserScript==
(() => {
    const restoreWindows = false;
    let createTimer = null;

    const getInsertionPoint = () => {
        // Vivaldi 近期已移除 .toggle-trash。优先挂到标签栏右侧的工具栏容器，
        // 并保留上层容器回退，以适配标签栏位置、同步按钮和垃圾桶的不同配置。
        const selectors = [
            '#tabs-tabbar-container .sync-and-trash-container',
            '#tabs-tabbar-container .toolbar-tabbar-after',
            '#tabs-tabbar-container .tabbar-wrapper',
            '#tabs-tabbar-container'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                return element;
            }
        }

        return null;
    };

    const createButton = () => {
        if ($('.button-toolbar.undo-close-tab').length) return;
        const insertionPoint = getInsertionPoint();
        if (!insertionPoint) return;
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
                    else
                        // sessions 为空（如刚重启浏览器），从 history 读取最近一条且非当前已打开的
                        chrome.history.search({ text: '', maxResults: 20 }, items => {
                            chrome.tabs.query({}, tabs => {
                                const openUrls = new Set(tabs.map(t => t.url));
                                const match = items.find(h => h.url && !openUrls.has(h.url));
                                if (match)
                                    chrome.tabs.create({ url: match.url });
                            });
                        });
                });
            }
        });
        btn.innerHTML = `<span class="button-icon override"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px"><path fill="none" d="M0 0h24v24H0z"/><path d="M5.828 7l2.536 2.536L6.95 10.95 2 6l4.95-4.95 1.414 1.414L5.828 5H13a8 8 0 1 1 0 16H4v-2h9a6 6 0 1 0 0-12H5.828z"/></svg></span>`;
        wrapper.appendChild(btn);
        insertionPoint.appendChild(wrapper);
    };

    const scheduleCreateButton = () => {
        clearTimeout(createTimer);
        createTimer = setTimeout(createButton, 0);
    };

    scheduleCreateButton();

    // 标签栏可能在脚本加载后异步挂载或整体重建。只要标签栏内有节点变动，
    // 就确认按钮仍在；防抖后不会因 React 的连续渲染重复插入。
    userChrome_js.observeAddedNodes(function (insertElement) {
        if (!insertElement || typeof insertElement.matches !== 'function') return;
        if (insertElement.matches('#tabs-tabbar-container')
            || insertElement.closest('#tabs-tabbar-container')) {
            scheduleCreateButton();
        }
    });
})();
