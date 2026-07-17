// ==UserScript==
// @name            rightClickOpenClipboard.ac.js
// @description     右键新增标签按钮访问或搜索剪贴板内容
// @license         MIT License
// @compatibility   Vivaldi 8.1
// @version         20260717
// @charset         UTF-8
// @homepageURL     https://github.com/benzBrake/VivaldiMods/tree/main/chrome/userChromeJS
// @note            支持普通新增标签和标签堆叠内的新增子标签按钮
// ==/UserScript==
(function () {
    const NEW_TAB_BUTTON_SELECTOR = '.button-toolbar.newtab';
    const TABBAR_SELECTOR = '#tabs-tabbar-container';
    const ALLOWED_PROTOCOLS = new Set([
        'http:',
        'https:',
        'ftp:',
        'file:',
        'vivaldi:',
        'chrome:'
    ]);
    const boundTabbars = new WeakSet();

    function showError(message, error) {
        console.warn('[rightClickOpenClipboard]', message, error || '');
        const detail = error && error.message ? ' ' + error.message : '';
        userChrome_js.alert(message + detail, {
            type: 'warn',
            duration: 5000
        });
    }

    // Vivaldi 的 UI 自身通过 paste 事件读取剪贴板，而不是 Clipboard API。
    // 这必须在右键事件仍在处理时同步完成，否则 document 会失去焦点。
    function readClipboardText() {
        let text = '';
        let receivedText = false;

        function onPaste(event) {
            const clipboardData = event.clipboardData;
            if (!clipboardData || !clipboardData.types || clipboardData.types.indexOf('text/plain') === -1) {
                return;
            }

            text = clipboardData.getData('text/plain');
            receivedText = true;
            event.preventDefault();
        }

        document.addEventListener('paste', onPaste, true);
        try {
            document.execCommand('paste');
        } finally {
            document.removeEventListener('paste', onPaste, true);
        }

        return receivedText ? text : '';
    }

    function getUrlFromClipboard(text) {
        const value = text.trim();
        if (!value || /\s/.test(value)) {
            return null;
        }

        if (isBareHost(value)) {
            try {
                return new URL('https://' + value).href;
            } catch (error) {
                return null;
            }
        }

        try {
            const parsed = new URL(value);
            return ALLOWED_PROTOCOLS.has(parsed.protocol) ? parsed.href : null;
        } catch (error) {
            return null;
        }
    }

    function isBareHost(value) {
        const ipv4Pattern = '(?:25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]?\\d)){3}';
        const hostWithPath = '(?::\\d{1,5})?(?:[/?#].*)?';
        const localHostPattern = new RegExp('^(?:localhost|' + ipv4Pattern + ')' + hostWithPath + '$', 'i');
        if (localHostPattern.test(value) || /^\[[0-9a-f:.]+\](?::\d{1,5})?(?:[/?#].*)?$/i.test(value)) {
            return true;
        }

        if (/^[a-z][a-z\d+.-]*:/i.test(value)) {
            return false;
        }

        const utilities = window.vivaldi && window.vivaldi.utilities;
        if (!utilities || typeof utilities.getUrlFragments !== 'function') {
            return false;
        }

        try {
            // 与 Vivaldi 地址栏保持一致：只有能解析出公共后缀的裸主机才视为 URL。
            return Boolean(utilities.getUrlFragments(value).tld);
        } catch (error) {
            console.warn('[rightClickOpenClipboard] Failed to inspect URL fragments.', error);
            return false;
        }
    }

    function urlsMatch(first, second) {
        try {
            return new URL(first).href === new URL(second).href;
        } catch (error) {
            return first === second;
        }
    }

    async function activateExistingTab(url) {
        const tabs = await chrome.tabs.query({ currentWindow: true });
        const existingTab = tabs.find(function (tab) {
            return tab.url && urlsMatch(tab.url, url);
        });

        if (!existingTab) {
            return false;
        }

        await chrome.tabs.update(existingTab.id, {
            active: true,
            highlighted: true
        });
        return true;
    }

    function getVivExtData(tab) {
        if (!tab || !tab.vivExtData) {
            return {};
        }

        try {
            return typeof tab.vivExtData === 'string'
                ? JSON.parse(tab.vivExtData)
                : tab.vivExtData;
        } catch (error) {
            console.warn('[rightClickOpenClipboard] Failed to parse vivExtData.', error);
            return {};
        }
    }

    function isStackNewTabButton(button) {
        return Boolean(button.closest('#tabs-subcontainer'));
    }

    async function createTab(button) {
        const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const createProperties = { active: true };
        const activeTab = activeTabs[0];
        if (activeTab) {
            createProperties.windowId = activeTab.windowId;

            // Vivaldi 内部的新标签实现也通过 vivExtData 传递工作区和堆叠归属。
            const activeTabData = getVivExtData(activeTab);
            const newTabData = {};
            if (typeof activeTabData.workspaceId !== 'undefined') {
                newTabData.workspaceId = activeTabData.workspaceId;
            }
            if (isStackNewTabButton(button) && activeTabData.group) {
                newTabData.group = activeTabData.group;
                createProperties.pinned = Boolean(activeTab.pinned);
            }
            if (Object.keys(newTabData).length) {
                createProperties.vivExtData = JSON.stringify(newTabData);
            }
        }

        const tab = await chrome.tabs.create(createProperties);
        if (!tab || typeof tab.id !== 'number') {
            throw new Error('chrome.tabs.create did not return a tab.');
        }

        return tab;
    }

    async function getSearchRequest(query, incognito) {
        const searchEngines = (window.vivaldi && window.vivaldi.searchEngines) || chrome.searchEngines;
        if (!searchEngines || typeof searchEngines.getTemplateUrls !== 'function') {
            throw new Error('vivaldi.searchEngines is unavailable.');
        }

        const searchEngineData = await searchEngines.getTemplateUrls();
        const guid = incognito ? searchEngineData.defaultPrivate : searchEngineData.defaultSearch;
        if (!guid) {
            throw new Error('No default search engine is configured.');
        }

        const request = await searchEngines.getSearchRequest(guid, query);
        if (!request || !request.url) {
            throw new Error('The default search engine did not return a search request.');
        }

        return request;
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, function (character) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[character];
        });
    }

    function createPostNavigationUrl(request) {
        const parameters = new URLSearchParams(String(request.postParams));
        const inputs = [];
        parameters.forEach(function (value, name) {
            inputs.push('<input type="hidden" name="' + escapeHtml(name) + '" value="' + escapeHtml(value) + '">');
        });

        const enctype = request.contentType === 'multipart/form-data'
            ? 'multipart/form-data'
            : 'application/x-www-form-urlencoded';
        const page = '<!doctype html><meta charset="utf-8"><form id="search" method="post" enctype="' + enctype + '" action="' +
            escapeHtml(request.url) + '">' + inputs.join('') + '</form><script>document.getElementById("search").submit();</script>';
        return 'data:text/html;charset=utf-8,' + encodeURIComponent(page);
    }

    async function navigateTab(tab, request) {
        const url = request.postParams ? createPostNavigationUrl(request) : request.url;
        await chrome.tabs.update(tab.id, {
            url: url,
            active: true
        });
    }

    async function openClipboardContent(button, text) {
        const url = getUrlFromClipboard(text);
        if (url) {
            if (await activateExistingTab(url)) {
                return;
            }

            const tab = await createTab(button);
            await navigateTab(tab, { url: url });
            return;
        }

        const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const request = await getSearchRequest(text, Boolean(activeTabs[0] && activeTabs[0].incognito));
        const tab = await createTab(button);
        await navigateTab(tab, request);
    }

    async function onNewTabContextMenu(event) {
        const target = event.target;
        const button = target && typeof target.closest === 'function'
            ? target.closest(NEW_TAB_BUTTON_SELECTOR)
            : null;
        if (!button || !event.currentTarget.contains(button)) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const text = readClipboardText().trim();
        if (!text) {
            try {
                await createTab(button);
            } catch (error) {
                showError('无法创建新标签页。', error);
            }
            return;
        }

        try {
            await openClipboardContent(button, text);
        } catch (error) {
            showError('无法打开剪贴板内容。', error);
        }
    }

    function bindTabbar(tabbar) {
        if (boundTabbars.has(tabbar)) {
            return;
        }

        boundTabbars.add(tabbar);
        tabbar.addEventListener('contextmenu', onNewTabContextMenu, true);
    }

    function bindTabbars(root) {
        if (!root) {
            return;
        }

        if (root.matches && root.matches(TABBAR_SELECTOR)) {
            bindTabbar(root);
        }
        if (root.querySelectorAll) {
            root.querySelectorAll(TABBAR_SELECTOR).forEach(bindTabbar);
        }
    }

    bindTabbars(document);
    userChrome_js.observeAddedNodes(bindTabbars);
})();
