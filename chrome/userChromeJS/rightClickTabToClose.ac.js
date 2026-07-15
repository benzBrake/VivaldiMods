// ==UserScript==
// @name            rightClickTabToClose.uc.js
// @description     右键关闭标签页
// @license         MIT License
// @compatibility   Vivaldi 8
// @version         20260715
// @charset         UTF-8
// @homepageURL     https://github.com/benzBrake/VivaldiMods/tree/main/chrome/userChromeJS
// @note            20241023 跟随 userChrome.js 更新
// @note            20240309 支持关闭标签分组，修复不兼容关闭最后一个标签页不关闭窗口
// @note            20260715 关闭最后一个标签页时跟随 Vivaldi 新标签页设置
// ==/UserScript==
(function () {
    const START_PAGE_URL = 'vivaldi://startpage/';

    async function getTabs (options = {}, filter) {
        Object.assign(options, {
            currentWindow: true
        });
        let tabs = await chrome.tabs.query(options);
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

    async function getNewTabCreateProperties () {
        try {
            const newPageType = await vivaldi.prefs.get('vivaldi.tabs.new_page.link');
            switch (newPageType) {
                case 'homepage': {
                    const homePage = await vivaldi.prefs.get('vivaldi.homepage');
                    return { url: typeof homePage === 'string' && homePage ? homePage : START_PAGE_URL };
                }
                case 'blankpage':
                    return { url: 'about:blank' };
                case 'custom': {
                    const customUrl = await vivaldi.prefs.get('vivaldi.tabs.new_page.custom_url');
                    return { url: typeof customUrl === 'string' && customUrl ? customUrl : START_PAGE_URL };
                }
                case 'extension':
                    return {};
                case 'startpage':
                    return { url: START_PAGE_URL };
                default:
                    console.warn('[rightClickTabToClose] Unknown new tab page type:', newPageType);
                    return { url: START_PAGE_URL };
            }
        } catch (error) {
            console.error('[rightClickTabToClose] Failed to read the new tab page preference:', error);
            return { url: START_PAGE_URL };
        }
    }

    async function createReplacementTab () {
        const createProperties = await getNewTabCreateProperties();
        try {
            return await chrome.tabs.create(createProperties);
        } catch (error) {
            console.error('[rightClickTabToClose] Failed to create the configured new tab page:', error);
            if (createProperties.url === START_PAGE_URL) {
                throw error;
            }

            try {
                return await chrome.tabs.create({ url: START_PAGE_URL });
            } catch (fallbackError) {
                console.error('[rightClickTabToClose] Failed to create the fallback start page:', fallbackError);
                throw fallbackError;
            }
        }
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
        let existsTabs = await getTabs();
        let keepWindowOpenAfterLastTabClosed = await vivaldi.prefs.get('vivaldi.tabs.never_close_last');
        if (existsTabs.length === toBeRemoved.length && keepWindowOpenAfterLastTabClosed) {
            await createReplacementTab();
        }
        await chrome.tabs.remove(toBeRemoved);
        let tabs = await getTabs({ active: true });
        if (tabs.length) {
            await switchToTab(tabs[0].id);
        } else {
            tabs = await getTabs();
            if (tabs.length) {
                await switchToTab(tabs[0].id);
            }
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
