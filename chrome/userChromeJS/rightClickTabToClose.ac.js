// ==UserScript==
// @name            rightClickTabToClose.uc.js
// @description     右键关闭标签页
// @license         MIT License
// @compatibility   Vivaldi 6
// @version         20241023
// @charset         UTF-8
// @homepageURL     https://github.com/benzBrake/VivaldiMods/tree/main/chrome/userChromeJS
// @note            20241023 跟随 userChrome.js 更新
// @note            20240309 支持关闭标签分组，修复不兼容关闭最后一个标签页不关闭窗口
// ==/UserScript==
(function () {
    async function getTabs (options = {}, filter) {
        Object.assign(options, {
            currentWindow: true
        });
        tabs = await chrome.tabs.query(options);
        tabs = tabs.filter(tab => {
            let extData = JSON.parse(tab.vivExtData);
            return !("panelId" in extData);
        });
        if (typeof filter === "function") tabs = tabs.filter(filter);
        return tabs;
    }

    async function switchToTab (id) {
        return await chrome.tabs.update(id, { active: true, highlighted: true });
    }

    async function closeTab (event) {
        if (
            event.shiftKey ||
            event.ctrlKey
        ) return;
        const tab = $(event.target).closest('[role="tab"]');
        const tabPosition = tab.closest('.tab-position');
        if (!tab.length || !tabPosition.length) {
            return;
        }
        event.stopPropagation();
        event.preventDefault();
        const currentId = tab[0].id.replace(/^tab-/g, "");
        let toBeRemoved = [];
        if (tabPosition.hasClass('is-substack')) {
            let tabs = await getTabs();
            tabs = tabs.filter(t =>
                JSON.parse(t.vivExtData).group == currentId
            );
            toBeRemoved = tabs.map(t => t.id);
        } else {
            toBeRemoved = [Number(currentId)];
        }
        console.log(toBeRemoved);
        let existsTabs = await getTabs();
        let keepWindowOpenAfterLastTabClosed = await vivaldi.prefs.get('vivaldi.tabs.never_close_last');
        if (existsTabs.length === toBeRemoved.length && keepWindowOpenAfterLastTabClosed) {
            let homePage = await vivaldi.prefs.get('vivaldi.homepage');
            await chrome.tabs.create({ url: homePage });
        }
        await chrome.tabs.remove(toBeRemoved);
        let tabs = await getTabs({ active: true });
        if (tabs.length) {
            await switchToTab(tabs[0].id);
        } else {
            let tabs = await getTabs();
            await switchToTab(tabs[0].id);
        }
    }

    $('#tabs-container .tab-strip').on('contextmenu', '[role="tab"]', closeTab);
    $('#tabs-subcontainer .tab-strip').on('contextmenu', '[role="tab"]', closeTab);

    // 调整标签位置后重新绑定事件
    $(document).on('appendChild', function (event) {
        const insertElement = event.detail[0];
        if (!insertElement) return;
        if (insertElement.tagName !== "DIV") return;
        if (insertElement.classList.contains("tabbar-wrapper")
        ) {
            $('#tabs-container .tab-strip', insertElement).on('contextmenu', '[role="tab"]', closeTab);
        } else if (insertElement.id === "tabs-subcontainer") {
            $('.tab-strip', insertElement).on('contextmenu', '[role="tab"]', closeTab);
        }
    });
})();