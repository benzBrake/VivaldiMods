// ==UserScript==
// @name            customBookmarksBar.ac.js
// @name:zh-CN      customBookmarksBar.ac.js
// @description     Add a custom bookmark bar below Vivaldi's native bookmark bar
// @description:zh-CN 在 Vivaldi 原生书签栏下方增加自绘书签栏
// @license         MIT License
// @compatibility   Vivaldi 8.1
// @version         20260723
// @charset         UTF-8
// @homepageURL     https://github.com/benzBrake/VivaldiMods/tree/main/chrome/userChromeJS
// ==/UserScript==
(() => {
    'use strict';

    const LOG_PREFIX = '[customBookmarksBar]';
    const INSTANCE_KEY = '__userChromeCustomBookmarksBar';
    const STYLE_ID = 'userchrome-custom-bookmarks-bar-style';
    const BAR_SELECTOR = '.bookmark-bar';
    const MOUNT_CLASS = 'userchrome-custom-bookmarks-mounted';
    const ROW_ID = 'userchrome-custom-bookmarks-bar';
    const ROW_LABEL = '自绘书签栏';
    const BOOKMARKS_FOLDER_PREF = 'vivaldi.bookmarks.bar.folder_ids';
    const BOOKMARKS_DISPLAY_PREF = 'vivaldi.bookmarks.bar.display';
    const DEFAULT_FOLDER_ID = '1';
    const SEPARATOR_URL = 'http://bookmark.placeholder.url/';
    const FOLDER_POPUP_PREFIX = 'userchrome-bookmarks-folder:';
    const OVERFLOW_POPUP_ID = 'userchrome-bookmarks-overflow';
    const REFRESH_DELAY = 120;
    const MOUNT_DELAY = 120;
    const FOLDER_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 16 16" class="folder-icon"><g class="fill-override"><svg width="16" height="16" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M2.35717 3.36075C2.13323 3.58693 2.00515 3.89221 2 4.21203V11.7872C1.99441 11.9479 2.02163 12.1081 2.07996 12.2577C2.13828 12.4073 2.22648 12.5431 2.33904 12.6568C2.4516 12.7705 2.58613 12.8596 2.73425 12.9185C2.88237 12.9774 3.04091 13.0049 3.2 12.9993H12.8C13.1167 12.9941 13.4189 12.8647 13.6428 12.6385C13.8668 12.4123 13.9948 12.1071 14 11.7872L14 6C14 5.5 13.5 5 13 5H8L6.8 3H3.2C2.88334 3.0052 2.5811 3.13457 2.35717 3.36075ZM2.99939 11.822L3 11.8046V4.22318C3.00223 4.16171 3.02741 4.10511 3.06779 4.06432C3.10773 4.02398 3.15929 4.00208 3.21161 4H6.24589L7.5 6H12.8C12.9105 6 13 6.08796 13 6.19842C13 7.13107 13 11.0636 13 11.7761C12.9978 11.8376 12.9726 11.8942 12.9322 11.935C12.8923 11.9753 12.8407 11.9972 12.7884 11.9993H3.18227L3.16455 11.9999C3.14406 12.0006 3.12343 11.9971 3.10383 11.9893C3.08421 11.9815 3.06567 11.9694 3.04966 11.9533C3.03364 11.9371 3.02051 11.9171 3.01165 11.8944C3.00278 11.8717 2.99853 11.847 2.99939 11.822Z"></path><path fill-rule="evenodd" d="M2.99939 11.822L3 11.8046V4.22318C3.00223 4.16171 3.02741 4.10511 3.06779 4.06432C3.10773 4.02398 3.15929 4.00208 3.21161 4H6.24589L7.5 6H12.8C12.9105 6 13 6.08796 13 6.19842C13 7.13107 13 11.0636 13 11.7761C12.9978 11.8376 12.9726 11.8942 12.9322 11.935C12.8923 11.9753 12.8407 11.9972 12.7884 11.9993H3.18227L3.16455 11.9999C3.14406 12.0006 3.12343 11.9971 3.10383 11.9893C3.08421 11.9815 3.06567 11.9694 3.04967 11.9533C3.03364 11.9371 3.02051 11.9171 3.01165 11.8944C3.00278 11.8717 2.99853 11.847 2.99939 11.822Z" fill-opacity="0.1"></path></svg></g></svg>';
    const OVERFLOW_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.92429 3.07574C3.68997 2.84142 3.31007 2.84142 3.07576 3.07574C2.84145 3.31005 2.84145 3.68995 3.07576 3.92426L7.1515 8L3.07576 12.0757C2.84145 12.3101 2.84145 12.6899 3.07576 12.9243C3.31007 13.1586 3.68997 13.1586 3.92429 12.9243L8.84855 8L3.92429 3.07574Z" fill="currentColor"></path><path d="M8.92429 3.07574C8.68997 2.84142 8.31007 2.84142 8.07576 3.07574C7.84145 3.31005 7.84145 3.68995 8.07576 3.92426L12.1515 8L8.07576 12.0757C7.84145 12.3101 7.84145 12.6899 8.07576 12.9243C8.31007 13.1586 8.68997 13.1586 8.92429 12.9243L13.8486 8L8.92429 3.07574Z" fill="currentColor"></path></svg>';

    if (window[INSTANCE_KEY]) {
        console.info(LOG_PREFIX, 'Script instance already exists.');
        return;
    }

    const createElement = window.userChrome_js.createElement.bind(window.userChrome_js);

    const state = {
        host: null,
        row: null,
        items: null,
        moreButton: null,
        emptyState: null,
        hostObserver: null,
        resizeObserver: null,
        nativeChevron: null,
        nativeChevronObserver: null,
        stopAddedNodeObserver: null,
        mountTimer: null,
        refreshTimer: null,
        refreshInFlight: false,
        refreshAgain: false,
        requestId: 0,
        data: {
            folderIds: [],
            displayMode: 'default',
            roots: [],
            topLevel: [],
            relevantIds: new Set(),
            signature: ''
        },
        buttons: [],
        hiddenNodes: [],
        overflowKey: '',
        folderPopups: new Map(),
        overflowPopup: null,
        activePopupController: null,
        bookmarkListeners: [],
        prefListener: null,
        runtimeListenersAttached: false,
        importing: false
    };

    window[INSTANCE_KEY] = state;

    function log (message, details) {
        if (typeof details === 'undefined') {
            console.info(LOG_PREFIX, message);
        } else {
            console.info(LOG_PREFIX, message, details);
        }
    }

    function warn (message, details) {
        if (typeof details === 'undefined') {
            console.warn(LOG_PREFIX, message);
        } else {
            console.warn(LOG_PREFIX, message, details);
        }
    }

    function reportError (message, error) {
        console.error(LOG_PREFIX, message, error);
    }

    function getMenuApi () {
        return window.userChrome_js && window.userChrome_js.menu;
    }

    function getBookmarksApi () {
        return window.chrome && window.chrome.bookmarks;
    }

    function ensureStyle () {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = createElement('style', {
            id: STYLE_ID,
            innerHTML: `
            .${MOUNT_CLASS} {
                display: flex !important;
                flex-direction: column !important;
                align-items: stretch !important;
                height: auto !important;
                max-height: none !important;
                min-height: 0 !important;
            }

            .${MOUNT_CLASS} > .observer {
                flex: 0 0 auto !important;
                min-height: 0 !important;
            }

            #${ROW_ID} {
                --userchrome-bookmark-row-height: 28px;
                display: flex;
                flex: 0 0 var(--userchrome-bookmark-row-height);
                align-items: stretch;
                min-width: 0;
                width: 100%;
                height: var(--userchrome-bookmark-row-height);
                box-sizing: border-box;
                border-top: 1px solid var(--colorBorder, rgba(0, 0, 0, 0.1));
                background: var(--colorBg, #fff);
                color: var(--colorFg, #222);
                font: inherit;
            }

            #${ROW_ID} .bookmark-item.folder:focus,
            #${ROW_ID} .bookmark-item.folder:focus-visible,
            #${ROW_ID} .bookmark-item.folder:focus-within {
                outline: none !important;
                box-shadow: none !important;
            }

            #${ROW_ID} .userchrome-bookmark-empty {
                display: inline-flex;
                align-items: center;
                min-width: 0;
                padding: 0 10px;
                color: var(--colorFgFaded, rgba(34, 34, 34, 0.62));
                font-size: 12px;
                white-space: nowrap;
            }

            `
        });
        document.head.appendChild(style);
        log('Injected bookmark bar style.');
    }

    function unwrapPreference (result, fallback) {
        if (result && typeof result === 'object' && Object.prototype.hasOwnProperty.call(result, 'value')) {
            return typeof result.value === 'undefined' ? fallback : result.value;
        }
        return typeof result === 'undefined' ? fallback : result;
    }

    async function readPreference (path, fallback) {
        const prefs = window.vivaldi && window.vivaldi.prefs;
        if (!prefs || typeof prefs.get !== 'function') {
            warn('vivaldi.prefs.get is unavailable.', { path, fallback });
            return fallback;
        }

        try {
            const result = await prefs.get(path);
            const value = unwrapPreference(result, fallback);
            log('Read preference.', { path, value });
            return value;
        } catch (error) {
            reportError('Failed to read preference: ' + path, error);
            return fallback;
        }
    }

    function normalizeFolderIds (value) {
        let values = value;
        if (typeof values === 'string') {
            try {
                const parsed = JSON.parse(values);
                values = Array.isArray(parsed) ? parsed : [values];
            } catch (error) {
                values = [values];
            }
        }
        if (!Array.isArray(values)) {
            values = [DEFAULT_FOLDER_ID];
        }

        const folderIds = [];
        values.forEach(function (id) {
            const normalized = String(id || '').trim();
            if (normalized && !folderIds.includes(normalized)) {
                folderIds.push(normalized);
            }
        });

        return folderIds.length ? folderIds : [DEFAULT_FOLDER_ID];
    }

    function normalizeDisplayMode (value) {
        const modes = ['default', 'text', 'icon', 'iconexceptfolders'];
        return modes.includes(value) ? value : 'default';
    }

    function getBookmarkError () {
        const runtime = window.chrome && window.chrome.runtime;
        return runtime && runtime.lastError ? runtime.lastError : null;
    }

    function callBookmarksApi (methodName, args) {
        const api = getBookmarksApi();
        if (!api || typeof api[methodName] !== 'function') {
            return Promise.reject(new Error('chrome.bookmarks.' + methodName + ' is unavailable.'));
        }

        return new Promise(function (resolve, reject) {
            let settled = false;
            function finish (callback, value) {
                if (settled) {
                    return;
                }
                settled = true;
                callback(value);
            }

            function handleResult (result) {
                const lastError = getBookmarkError();
                if (lastError) {
                    finish(reject, new Error(lastError.message || String(lastError)));
                    return;
                }
                finish(resolve, result);
            }

            try {
                let result;
                try {
                    result = api[methodName](...args, handleResult);
                } catch (callbackError) {
                    warn('Callback form of chrome.bookmarks.' + methodName + ' failed; trying Promise form.', {
                        args,
                        error: callbackError
                    });
                    result = api[methodName](...args);
                }
                if (result && typeof result.then === 'function') {
                    result.then(handleResult).catch(function (error) {
                        finish(reject, error);
                    });
                }
            } catch (error) {
                finish(reject, error);
            }
        });
    }

    function getBookmarkSubTree (id) {
        return callBookmarksApi('getSubTree', [id]);
    }

    function createBookmark (details) {
        return callBookmarksApi('create', [details]);
    }

    function cloneBookmarkNode (node) {
        const children = Array.isArray(node && node.children)
            ? node.children.map(cloneBookmarkNode)
            : [];
        return {
            id: String(node && typeof node.id !== 'undefined' ? node.id : ''),
            title: typeof (node && node.title) === 'string' ? node.title : '',
            url: typeof (node && node.url) === 'string' ? node.url : '',
            children: children
        };
    }

    function collectRelevantIds (node, ids) {
        if (!node || !node.id) {
            return;
        }
        ids.add(node.id);
        node.children.forEach(function (child) {
            collectRelevantIds(child, ids);
        });
    }

    function getNodeLabel (node, emptyLabel) {
        const title = String(node && node.title || '').trim();
        if (title) {
            return title;
        }
        if (node && node.url) {
            try {
                return new URL(node.url).hostname || node.url;
            } catch (error) {
                return node.url;
            }
        }
        return emptyLabel || '未命名书签';
    }

    function isSeparatorBookmark (node) {
        return Boolean(node
            && node.url === SEPARATOR_URL
            && /^-{3,}$/.test(String(node.title || '').trim()));
    }

    function getBookmarkDataSignature (folderIds, displayMode, roots) {
        return JSON.stringify({
            folderIds: folderIds,
            displayMode: displayMode,
            roots: roots
        });
    }

    async function loadBookmarkData (reason) {
        const requestId = ++state.requestId;
        const api = getBookmarksApi();
        if (!api || typeof api.getSubTree !== 'function') {
            warn('Bookmarks API is unavailable; custom bar will not render.', {
                hasChrome: Boolean(window.chrome),
                hasBookmarks: Boolean(api),
                methods: api ? Object.keys(api) : []
            });
            return false;
        }

        const configuredFolderIds = normalizeFolderIds(await readPreference(
            BOOKMARKS_FOLDER_PREF,
            [DEFAULT_FOLDER_ID]
        ));
        const displayMode = normalizeDisplayMode(await readPreference(
            BOOKMARKS_DISPLAY_PREF,
            'default'
        ));
        const roots = [];

        log('Loading bookmark roots.', {
            reason,
            folderIds: configuredFolderIds,
            displayMode
        });

        for (const folderId of configuredFolderIds) {
            try {
                const result = await getBookmarkSubTree(folderId);
                const rawRoot = Array.isArray(result) ? result[0] : result;
                if (!rawRoot) {
                    warn('Bookmark root returned no node.', { folderId, result });
                    continue;
                }
                const root = cloneBookmarkNode(rawRoot);
                roots.push(root);
                log('Loaded bookmark root.', {
                    folderId,
                    title: root.title,
                    childCount: root.children.length
                });
            } catch (error) {
                reportError('Failed to load bookmark root: ' + folderId, error);
            }
        }

        if (requestId !== state.requestId) {
            log('Discarded stale bookmark load.', { requestId });
            return false;
        }

        const relevantIds = new Set();
        roots.forEach(function (root) {
            collectRelevantIds(root, relevantIds);
        });

        const topLevel = [];
        roots.forEach(function (root) {
            topLevel.push(...root.children);
        });

        // Only rebuild DOM when the bookmark snapshot actually changed, so open menus stay open.
        const signature = getBookmarkDataSignature(configuredFolderIds, displayMode, roots);
        const changed = signature !== state.data.signature;

        state.data = {
            folderIds: configuredFolderIds,
            displayMode: displayMode,
            roots: roots,
            topLevel: topLevel,
            relevantIds: relevantIds,
            signature: signature
        };

        log('Bookmark data ready.', {
            rootCount: roots.length,
            topLevelCount: topLevel.length,
            relevantCount: relevantIds.size,
            changed: changed
        });
        return changed;
    }

    function findBookmarkBar () {
        const bars = Array.from(document.querySelectorAll(BAR_SELECTOR));
        return bars.find(function (bar) {
            return bar instanceof HTMLElement && bar.isConnected;
        }) || null;
    }

    function findNativeChevron () {
        if (!state.host) {
            return null;
        }

        return Array.from(state.host.querySelectorAll('.bookmarkbarItem.chevron')).find(function (chevron) {
            return chevron instanceof HTMLElement
                && (!state.row || !state.row.contains(chevron));
        }) || null;
    }

    function isNativeChevronVisible () {
        const chevron = state.nativeChevron;
        if (!chevron || !chevron.isConnected || chevron.hidden) {
            return false;
        }

        const style = window.getComputedStyle(chevron);
        return style.display !== 'none'
            && style.visibility !== 'hidden'
            && chevron.getClientRects().length > 0;
    }

    function observeNativeChevron () {
        const nativeChevron = findNativeChevron();
        if (state.nativeChevron === nativeChevron) {
            return;
        }

        const previousChevron = state.nativeChevron;
        if (state.resizeObserver && previousChevron) {
            state.resizeObserver.unobserve(previousChevron);
        }

        if (state.nativeChevronObserver) {
            state.nativeChevronObserver.disconnect();
            state.nativeChevronObserver = null;
        }

        state.nativeChevron = nativeChevron;
        if (nativeChevron) {
            if (state.resizeObserver) {
                state.resizeObserver.observe(nativeChevron);
            }
            state.nativeChevronObserver = new MutationObserver(function () {
                requestAnimationFrame(layoutOverflow);
            });
            state.nativeChevronObserver.observe(nativeChevron, {
                attributes: true,
                attributeFilter: ['class', 'hidden', 'style']
            });
        }

        requestAnimationFrame(layoutOverflow);
    }

    function getMenuItemId (prefix, node) {
        return prefix + String(node.id || '').replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    function createEmptyMenuItem (label) {
        return {
            id: 'empty',
            label: label,
            disabled: true
        };
    }

    function getFaviconUrl (url) {
        return 'chrome://favicon/size/16@1x/' + encodeURIComponent(url);
    }

    function createBookmarkMenuItems (nodes) {
        const items = nodes.map(function (node) {
            if (isSeparatorBookmark(node)) {
                return { type: 'separator' };
            }

            const label = getNodeLabel(node, '未命名文件夹');
            if (node.url) {
                return {
                    id: getMenuItemId('bookmark-', node),
                    label: label,
                    icon: getFaviconUrl(node.url),
                    onSelect: function (selection) {
                        return openBookmark(node, selection && selection.event);
                    }
                };
            }

            return {
                id: getMenuItemId('folder-', node),
                label: label,
                children: createFolderMenuItems(node)
            };
        });

        return items.length ? items : [createEmptyMenuItem('（空文件夹）')];
    }

    function createFolderMenuItems (folder) {
        return [
            {
                id: getMenuItemId('add-bookmark-', folder),
                label: '添加书签到此处',
                onSelect: function () {
                    return addCurrentPageToFolder(folder);
                }
            },
            { type: 'separator' },
            ...createBookmarkMenuItems(folder.children)
        ];
    }

    // Registered menu controllers retain DOM; dispose them before replacing bookmark data or the host row.
    function disposePopupControllers () {
        if (state.activePopupController && typeof state.activePopupController.close === 'function') {
            try {
                state.activePopupController.close('bookmarks-refresh');
            } catch (error) {
                reportError('Failed to close active bookmark popup.', error);
            }
        }
        state.activePopupController = null;

        state.folderPopups.forEach(function (controller) {
            try {
                controller.unregister();
            } catch (error) {
                reportError('Failed to unregister folder popup.', error);
            }
        });
        state.folderPopups.clear();

        if (state.overflowPopup) {
            try {
                state.overflowPopup.unregister();
            } catch (error) {
                reportError('Failed to unregister overflow popup.', error);
            }
            state.overflowPopup = null;
        }
        state.overflowKey = '';
    }

    function ensureFolderPopup (node) {
        const menu = getMenuApi();
        if (!menu || typeof menu.register !== 'function') {
            warn('Popupset menu API is unavailable.', { nodeId: node.id });
            return null;
        }

        const popupId = FOLDER_POPUP_PREFIX + node.id;
        if (state.folderPopups.has(popupId)) {
            return state.folderPopups.get(popupId);
        }

        try {
            const controller = menu.register({
                id: popupId,
                ariaLabel: getNodeLabel(node, '文件夹'),
                items: createFolderMenuItems(node)
            });
            if (!controller) {
                warn('Popup registration returned no controller.', { popupId });
                return null;
            }
            state.folderPopups.set(popupId, controller);
            log('Registered folder popup.', {
                popupId,
                childCount: node.children.length
            });
            return controller;
        } catch (error) {
            reportError('Failed to register folder popup: ' + popupId, error);
            return null;
        }
    }

    function ensureOverflowPopup () {
        const menu = getMenuApi();
        const hiddenNodes = state.hiddenNodes.slice();
        if (!menu || typeof menu.register !== 'function' || !hiddenNodes.length) {
            return null;
        }

        const key = hiddenNodes.map(function (node) {
            return node.id;
        }).join(',');
        if (state.overflowPopup && state.overflowKey === key) {
            return state.overflowPopup;
        }

        if (state.overflowPopup) {
            try {
                state.overflowPopup.unregister();
            } catch (error) {
                reportError('Failed to replace overflow popup.', error);
            }
            state.overflowPopup = null;
        }

        try {
            const controller = menu.register({
                id: OVERFLOW_POPUP_ID,
                ariaLabel: '更多书签',
                items: createBookmarkMenuItems(hiddenNodes)
            });
            if (!controller) {
                warn('Overflow popup registration returned no controller.');
                return null;
            }
            state.overflowPopup = controller;
            state.overflowKey = key;
            log('Registered overflow popup.', { hiddenCount: hiddenNodes.length });
            return controller;
        } catch (error) {
            reportError('Failed to register overflow popup.', error);
            return null;
        }
    }

    function getVisibleToolbarButtons () {
        const visibleButtons = state.buttons
            .filter(function (entry) {
                return entry.interactive && !entry.element.hidden;
            })
            .map(function (entry) {
                return entry.element;
            });
        if (!state.moreButton.hidden) {
            visibleButtons.push(state.moreButton);
        }
        return visibleButtons;
    }

    function setButtonFocus (index) {
        const visibleButtons = getVisibleToolbarButtons();
        if (!visibleButtons.length) {
            return;
        }

        const normalizedIndex = ((index % visibleButtons.length) + visibleButtons.length) % visibleButtons.length;
        state.buttons.forEach(function (entry) {
            if (entry.interactive) {
                entry.element.tabIndex = -1;
            }
        });
        state.moreButton.tabIndex = -1;
        visibleButtons[normalizedIndex].tabIndex = 0;
        visibleButtons[normalizedIndex].focus({ preventScroll: true });
    }

    function attachToolbarKeyboardNavigation (button) {
        button.addEventListener('keydown', function (event) {
            const visibleButtons = getVisibleToolbarButtons();
            const currentIndex = visibleButtons.indexOf(button);
            if (currentIndex === -1) {
                return;
            }

            if (event.key === 'ArrowRight') {
                event.preventDefault();
                setButtonFocus(currentIndex + 1);
            } else if (event.key === 'ArrowLeft') {
                event.preventDefault();
                setButtonFocus(currentIndex - 1);
            } else if (event.key === 'Home') {
                event.preventDefault();
                setButtonFocus(0);
            } else if (event.key === 'End') {
                event.preventDefault();
                setButtonFocus(visibleButtons.length - 1);
            }
        });
    }

    function createBookmarkButton (node, index) {
        const label = getNodeLabel(node, '未命名文件夹');
        const button = createElement('button', {
            type: 'button',
            class: 'bookmark-item' + (node.url ? '' : ' folder'),
            'data-bookmark-id': node.id,
            'data-kind': node.url ? 'link' : 'folder',
            tabindex: index === 0 ? 0 : -1,
            'aria-label': label,
            title: node.url ? getNodeLabel(node, '未命名书签') + '\n' + node.url : label
        });

        // Parse the selected static SVG without adding a wrapper to Vivaldi's toolbar DOM.
        const iconTemplate = createElement('template', { innerHTML: FOLDER_ICON_SVG });
        const icon = iconTemplate.content.firstElementChild;
        const title = createElement('span', {
            class: 'title',
            innerText: label
        });

        button.appendChild(icon);
        button.appendChild(title);

        if (!node.url) {
            button.setAttribute('aria-haspopup', 'menu');
            button.setAttribute('aria-expanded', 'false');
        }

        button.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            if (node.url) {
                void openBookmark(node, event);
            } else {
                openFolder(node, button);
            }
        });

        button.addEventListener('auxclick', function (event) {
            if (event.button !== 1) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            if (node.url) {
                void openBookmark(node, event);
            } else {
                openFolder(node, button);
            }
        });

        if (!node.url) {
            button.addEventListener('pointerenter', function () {
                if (!hasActiveFolderPopup() || state.activePopupController === ensureFolderPopup(node)) {
                    return;
                }
                openFolder(node, button);
            });
        }

        attachToolbarKeyboardNavigation(button);
        return button;
    }

    function createBookmarkSeparator (node) {
        const button = createElement('button', {
            'data-id': node.id,
            'data-offset': '0',
            title: node.title,
            tabindex: -1,
            class: 'bookmarkbarItem',
            draggable: 'true'
        });
        button.appendChild(createElement('span', { class: 'separator' }));
        return button;
    }

    function hasActiveFolderPopup () {
        for (const controller of state.folderPopups.values()) {
            if (controller === state.activePopupController) {
                return true;
            }
        }
        return false;
    }

    function openFolder (node, button) {
        const controller = ensureFolderPopup(node);
        if (!controller) {
            return;
        }

        const popup = controller.open({
            anchor: button,
            restoreFocus: button,
            onClose: function (reason) {
                if (button.isConnected) {
                    button.setAttribute('aria-expanded', 'false');
                }
                if (state.activePopupController === controller) {
                    state.activePopupController = null;
                }
                log('Folder popup closed.', { id: node.id, reason });
            }
        });
        if (!popup) {
            warn('Folder popup did not open.', { id: node.id });
            return;
        }
        state.activePopupController = controller;
        button.setAttribute('aria-expanded', 'true');
        log('Folder popup opened.', { id: node.id, childCount: node.children.length });
    }

    function parseVivExtData (tab) {
        if (!tab || !tab.vivExtData) {
            return {};
        }
        try {
            return typeof tab.vivExtData === 'string'
                ? JSON.parse(tab.vivExtData)
                : tab.vivExtData;
        } catch (error) {
            reportError('Failed to parse active tab vivExtData.', error);
            return {};
        }
    }

    async function createBookmarkTab (activeTab, url, activate) {
        const createProperties = { active: Boolean(activate) };
        if (activeTab && typeof activeTab.windowId === 'number') {
            createProperties.windowId = activeTab.windowId;
        }

        const activeData = parseVivExtData(activeTab);
        const newTabData = {};
        if (typeof activeData.workspaceId !== 'undefined') {
            newTabData.workspaceId = activeData.workspaceId;
        }
        if (Object.keys(newTabData).length) {
            createProperties.vivExtData = JSON.stringify(newTabData);
        }

        const tab = await chrome.tabs.create(createProperties);
        if (!tab || typeof tab.id !== 'number') {
            throw new Error('chrome.tabs.create did not return a tab.');
        }

        await chrome.tabs.update(tab.id, {
            url: url,
            active: Boolean(activate)
        });
        return tab;
    }

    async function openBookmark (node, event) {
        const tabsApi = window.chrome && window.chrome.tabs;
        if (!tabsApi || typeof tabsApi.query !== 'function' || typeof tabsApi.update !== 'function') {
            warn('chrome.tabs API is unavailable; cannot open bookmark.', { id: node.id });
            return;
        }

        const inputEvent = event || {};
        const newTabRequested = inputEvent.button === 1
            || inputEvent.ctrlKey === true
            || inputEvent.metaKey === true
            || inputEvent.shiftKey === true;
        const activateNewTab = inputEvent.shiftKey === true;
        const mode = newTabRequested
            ? (activateNewTab ? 'new-active-tab' : 'new-background-tab')
            : 'current-tab';

        log('Opening bookmark.', { id: node.id, url: node.url, mode });

        try {
            const activeTabs = await tabsApi.query({ active: true, currentWindow: true });
            const activeTab = activeTabs && activeTabs[0];
            if (!newTabRequested && activeTab && typeof activeTab.id === 'number') {
                await tabsApi.update(activeTab.id, { url: node.url, active: true });
                return;
            }

            await createBookmarkTab(activeTab, node.url, activateNewTab);
        } catch (error) {
            reportError('Failed to open bookmark: ' + node.id, error);
        }
    }

    async function addCurrentPageToFolder (folder) {
        const tabsApi = window.chrome && window.chrome.tabs;
        const bookmarksApi = getBookmarksApi();
        if (!tabsApi || typeof tabsApi.query !== 'function' || !bookmarksApi || typeof bookmarksApi.create !== 'function') {
            warn('Required API is unavailable; cannot add bookmark to folder.', {
                folderId: folder && folder.id,
                tabsQuery: Boolean(tabsApi && typeof tabsApi.query === 'function'),
                bookmarksCreate: Boolean(bookmarksApi && typeof bookmarksApi.create === 'function')
            });
            return;
        }

        try {
            const activeTabs = await tabsApi.query({ active: true, currentWindow: true });
            const activeTab = activeTabs && activeTabs[0];
            const url = activeTab && typeof activeTab.url === 'string' ? activeTab.url : '';
            if (!activeTab || !url) {
                warn('No bookmarkable active tab found.', { folderId: folder.id, activeTab });
                return;
            }

            const title = String(activeTab.title || url).trim() || url;
            const bookmark = await createBookmark({
                parentId: String(folder.id),
                title: title,
                url: url
            });
            log('Added current page to bookmark folder.', {
                folderId: folder.id,
                bookmarkId: bookmark && bookmark.id,
                url: url
            });
        } catch (error) {
            reportError('Failed to add current page to bookmark folder: ' + folder.id, error);
        }
    }

    function openOverflowMenu () {
        const button = state.moreButton;
        const controller = ensureOverflowPopup();
        if (!button || button.hidden || !controller) {
            return;
        }

        const popup = controller.open({
            anchor: button,
            restoreFocus: button,
            onClose: function (reason) {
                if (button.isConnected) {
                    button.setAttribute('aria-expanded', 'false');
                }
                if (state.activePopupController === controller) {
                    state.activePopupController = null;
                }
                log('Overflow popup closed.', { reason });
            }
        });
        if (!popup) {
            warn('Overflow popup did not open.');
            return;
        }
        state.activePopupController = controller;
        button.setAttribute('aria-expanded', 'true');
        log('Overflow popup opened.', { hiddenCount: state.hiddenNodes.length });
    }

    function getItemWidthTotal (entries, count) {
        let total = 0;
        for (let index = 0; index < count; index += 1) {
            total += entries[index].element.offsetWidth;
        }
        if (count > 1) {
            total += (count - 1) * 2;
        }
        return total;
    }

    function updateRovingTabIndex () {
        state.buttons.forEach(function (entry) {
            if (entry.interactive) {
                entry.element.tabIndex = -1;
            }
        });
        state.moreButton.tabIndex = -1;

        const firstVisible = state.buttons.find(function (entry) {
            return entry.interactive && !entry.element.hidden;
        });
        if (firstVisible) {
            firstVisible.element.tabIndex = 0;
        } else if (!state.moreButton.hidden) {
            state.moreButton.tabIndex = 0;
        }
    }

    function layoutOverflow () {
        if (!state.row || !state.items || !state.moreButton || !state.row.isConnected) {
            return;
        }

        // Measure with every item visible first, then move only the trailing items into the overflow menu.
        state.buttons.forEach(function (entry) {
            entry.element.hidden = false;
        });
        state.moreButton.hidden = true;
        state.hiddenNodes = [];

        const allWidth = getItemWidthTotal(state.buttons, state.buttons.length);
        const rowWidth = state.row.clientWidth;
        if (allWidth <= rowWidth) {
            if (state.overflowPopup) {
                try {
                    state.overflowPopup.unregister();
                } catch (error) {
                    reportError('Failed to remove unused overflow popup.', error);
                }
                state.overflowPopup = null;
            }
            state.overflowKey = '';
            // Mirror the native toolbar chevron even when this row has no hidden bookmarks.
            state.moreButton.hidden = !isNativeChevronVisible();
            updateRovingTabIndex();
            return;
        }

        // Keep this row's overflow entry in step with Vivaldi's native bookmark-bar chevron.
        // The native chevron can change independently when Vivaldi rebuilds or resizes its toolbar.
        if (!isNativeChevronVisible()) {
            updateRovingTabIndex();
            return;
        }

        state.moreButton.hidden = false;
        const availableWidth = Math.max(0, rowWidth - state.moreButton.offsetWidth - 2);
        let visibleCount = state.buttons.length;
        while (visibleCount > 0 && getItemWidthTotal(state.buttons, visibleCount) > availableWidth) {
            visibleCount -= 1;
        }

        state.buttons.forEach(function (entry, index) {
            entry.element.hidden = index >= visibleCount;
        });
        state.hiddenNodes = state.buttons.slice(visibleCount).map(function (entry) {
            return entry.node;
        });

        const nextOverflowKey = state.hiddenNodes.map(function (node) {
            return node.id;
        }).join(',');
        if (nextOverflowKey !== state.overflowKey && state.overflowPopup) {
            try {
                state.overflowPopup.unregister();
            } catch (error) {
                reportError('Failed to update overflow popup.', error);
            }
            state.overflowPopup = null;
        }
        state.overflowKey = nextOverflowKey;
        updateRovingTabIndex();
        log('Calculated bookmark overflow.', {
            rowWidth,
            visibleCount,
            hiddenCount: state.hiddenNodes.length
        });
    }

    function renderBookmarkBar () {
        if (!ensureMount('render')) {
            return;
        }

        disposePopupControllers();
        state.row.dataset.display = state.data.displayMode;
        state.items.replaceChildren();
        state.buttons = [];
        state.hiddenNodes = [];
        state.moreButton.hidden = true;

        if (!state.data.topLevel.length) {
            const empty = createElement('span', {
                class: 'userchrome-bookmark-empty',
                innerText: '暂无书签'
            });
            state.items.appendChild(empty);
            state.emptyState = empty;
            updateRovingTabIndex();
            requestAnimationFrame(layoutOverflow);
            log('Rendered an empty bookmark bar.');
            return;
        }

        state.emptyState = null;
        state.data.topLevel.forEach(function (node, index) {
            const separator = isSeparatorBookmark(node);
            const element = separator
                ? createBookmarkSeparator(node)
                : createBookmarkButton(node, index);
            state.items.appendChild(element);
            state.buttons.push({ node, element, interactive: !separator });
        });

        updateRovingTabIndex();
        requestAnimationFrame(layoutOverflow);
        log('Rendered bookmark bar.', {
            itemCount: state.buttons.length,
            displayMode: state.data.displayMode
        });
    }

    function unmount (reason) {
        if (state.hostObserver) {
            state.hostObserver.disconnect();
            state.hostObserver = null;
        }
        if (state.resizeObserver) {
            state.resizeObserver.disconnect();
            state.resizeObserver = null;
        }
        if (state.nativeChevronObserver) {
            state.nativeChevronObserver.disconnect();
            state.nativeChevronObserver = null;
        }

        disposePopupControllers();
        if (state.row) {
            state.row.remove();
        }
        if (state.host) {
            state.host.classList.remove(MOUNT_CLASS);
        }

        state.host = null;
        state.row = null;
        state.items = null;
        state.moreButton = null;
        state.emptyState = null;
        state.nativeChevron = null;
        state.buttons = [];
        state.hiddenNodes = [];
        log('Unmounted custom bookmark bar.', { reason });
    }

    function ensureMount (reason) {
        const host = findBookmarkBar();
        if (!host) {
            if (state.host || state.row) {
                unmount('native bookmark bar unavailable');
            }
            return false;
        }

        if (state.host === host && state.row && state.row.isConnected) {
            return true;
        }
        if (state.host && state.host !== host) {
            unmount('native bookmark bar replaced');
        }

        ensureStyle();
        host.classList.add(MOUNT_CLASS);

        Array.from(host.children).forEach(function (child) {
            if (child.id === ROW_ID && child !== state.row) {
                child.remove();
            }
        });

        // Mount beside Vivaldi's native observer so the custom row survives its dynamic toolbar rebuilds.
        const row = createElement('div', {
            id: ROW_ID,
            role: 'toolbar',
            'aria-label': ROW_LABEL
        });
        const items = createElement('div', { class: 'observer' });
        const moreButton = createElement('button', {
            type: 'button',
            class: 'bookmarkbarItem chevron',
            'aria-label': '更多书签',
            'aria-haspopup': 'menu',
            'aria-expanded': 'false',
            title: '更多书签',
            innerHTML: OVERFLOW_ICON_SVG
        });
        moreButton.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            openOverflowMenu();
        });
        attachToolbarKeyboardNavigation(moreButton);

        row.appendChild(items);
        row.appendChild(moreButton);

        const observer = Array.from(host.children).find(function (child) {
            return child.classList && child.classList.contains('observer');
        });
        if (observer && observer.nextSibling) {
            host.insertBefore(row, observer.nextSibling);
        } else {
            host.appendChild(row);
        }

        state.host = host;
        state.row = row;
        state.items = items;
        state.moreButton = moreButton;
        state.hostObserver = new MutationObserver(function (mutations) {
            const nativeToolbarChanged = mutations.some(function (mutation) {
                return !state.row
                    || !(mutation.target === state.row || state.row.contains(mutation.target));
            });
            if (!nativeToolbarChanged) {
                return;
            }
            observeNativeChevron();
            requestAnimationFrame(layoutOverflow);
            if (!state.row || !state.row.isConnected) {
                scheduleMount('custom row removed by native UI');
            }
        });
        state.hostObserver.observe(host, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'hidden', 'style']
        });

        if (typeof ResizeObserver === 'function') {
            state.resizeObserver = new ResizeObserver(function () {
                observeNativeChevron();
                requestAnimationFrame(layoutOverflow);
            });
            state.resizeObserver.observe(row);
            state.resizeObserver.observe(host);
        } else {
            warn('ResizeObserver is unavailable; overflow will update on render only.');
        }

        observeNativeChevron();

        log('Mounted custom bookmark bar.', {
            reason,
            hostClass: host.className,
            observerFound: Boolean(observer),
            positionClass: document.body && document.body.className
        });
        return true;
    }

    function scheduleMount (reason) {
        if (state.mountTimer) {
            return;
        }
        state.mountTimer = setTimeout(function () {
            state.mountTimer = null;
            const host = findBookmarkBar();
            const needsRender = state.host !== host || !state.row || !state.row.isConnected;
            if (ensureMount(reason) && needsRender && state.data.topLevel.length) {
                renderBookmarkBar();
            }
        }, MOUNT_DELAY);
    }

    function isRelevantEvent (type, first, second) {
        const relevantIds = state.data.relevantIds;
        if (!relevantIds.size) {
            return true;
        }
        if (type === 'created') {
            return relevantIds.has(String(second && second.parentId));
        }
        if (type === 'removed') {
            return relevantIds.has(String(first)) || relevantIds.has(String(second && second.parentId));
        }
        if (type === 'moved') {
            return relevantIds.has(String(first))
                || relevantIds.has(String(second && second.parentId))
                || relevantIds.has(String(second && second.oldParentId));
        }
        if (type === 'reordered') {
            return relevantIds.has(String(first));
        }
        return relevantIds.has(String(first));
    }

    function scheduleRefresh (reason, force) {
        // Imports emit many transient bookmark events; wait for onImportEnded before rebuilding.
        if (state.importing && !force) {
            log('Skipped bookmark refresh during import.', { reason });
            return;
        }
        if (state.refreshTimer) {
            return;
        }

        state.refreshTimer = setTimeout(async function () {
            state.refreshTimer = null;
            if (state.refreshInFlight) {
                state.refreshAgain = true;
                return;
            }

            state.refreshInFlight = true;
            try {
                const loaded = await loadBookmarkData(reason);
                if (loaded) {
                    ensureMount('refresh');
                    renderBookmarkBar();
                }
            } catch (error) {
                reportError('Bookmark refresh failed.', error);
            } finally {
                state.refreshInFlight = false;
                if (state.refreshAgain) {
                    state.refreshAgain = false;
                    scheduleRefresh('queued refresh', true);
                }
            }
        }, force ? 0 : REFRESH_DELAY);
    }

    function attachBookmarkEvent (eventName, type, handler) {
        const api = getBookmarksApi();
        const event = api && api[eventName];
        if (!event || typeof event.addListener !== 'function') {
            warn('Bookmark event is unavailable.', { eventName });
            return;
        }
        event.addListener(handler);
        state.bookmarkListeners.push({ event, handler });
        log('Attached bookmark event.', { eventName });
    }

    function attachRuntimeListeners () {
        if (state.runtimeListenersAttached) {
            return;
        }
        state.runtimeListenersAttached = true;

        attachBookmarkEvent('onCreated', 'created', function (id, node) {
            if (isRelevantEvent('created', id, node)) {
                scheduleRefresh('bookmark created');
            }
        });
        attachBookmarkEvent('onRemoved', 'removed', function (id, info) {
            if (isRelevantEvent('removed', id, info)) {
                scheduleRefresh('bookmark removed');
            }
        });
        attachBookmarkEvent('onChanged', 'changed', function (id) {
            if (isRelevantEvent('changed', id)) {
                scheduleRefresh('bookmark changed');
            }
        });
        attachBookmarkEvent('onMoved', 'moved', function (id, info) {
            if (isRelevantEvent('moved', id, info)) {
                scheduleRefresh('bookmark moved');
            }
        });
        attachBookmarkEvent('onChildrenReordered', 'reordered', function (id) {
            if (isRelevantEvent('reordered', id)) {
                scheduleRefresh('bookmark children reordered');
            }
        });
        attachBookmarkEvent('onImportBegan', 'import-began', function () {
            state.importing = true;
            log('Bookmark import began.');
        });
        attachBookmarkEvent('onImportEnded', 'import-ended', function () {
            state.importing = false;
            log('Bookmark import ended.');
            scheduleRefresh('bookmark import ended', true);
        });

        const prefs = window.vivaldi && window.vivaldi.prefs;
        if (prefs && prefs.onChanged && typeof prefs.onChanged.addListener === 'function') {
            state.prefListener = function (...args) {
                const first = args[0];
                const path = typeof first === 'string'
                    ? first
                    : first && first.path;
                if (path === BOOKMARKS_FOLDER_PREF || path === BOOKMARKS_DISPLAY_PREF) {
                    log('Bookmark preference changed.', { path, args });
                    scheduleRefresh('bookmark preference changed', true);
                }
            };
            prefs.onChanged.addListener(state.prefListener);
            log('Attached bookmark preference listener.');
        } else {
            warn('vivaldi.prefs.onChanged is unavailable; preference refresh uses focus and DOM events.');
        }

        window.addEventListener('focus', function () {
            scheduleRefresh('window focus');
            scheduleMount('window focus');
        });
        window.addEventListener('resize', function () {
            requestAnimationFrame(layoutOverflow);
        });
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) {
                scheduleRefresh('document visible');
                scheduleMount('document visible');
            }
        });

        if (window.userChrome_js && typeof window.userChrome_js.observeAddedNodes === 'function') {
            state.stopAddedNodeObserver = window.userChrome_js.observeAddedNodes(function (element) {
                if (!element || element.id === ROW_ID || (element.closest && element.closest('#' + ROW_ID))) {
                    return;
                }
                const isBookmarkBarChange = element.matches && element.matches(BAR_SELECTOR + ', ' + BAR_SELECTOR + ' .observer');
                const containsBookmarkBar = element.querySelector && element.querySelector(BAR_SELECTOR + ', ' + BAR_SELECTOR + ' .observer');
                if (isBookmarkBarChange || containsBookmarkBar) {
                    scheduleMount('bookmark bar DOM changed');
                    scheduleRefresh('bookmark bar DOM changed');
                }
            });
            log('Attached shared added-node observer.');
        } else {
            warn('userChrome_js.observeAddedNodes is unavailable.');
        }
    }

    async function init () {
        log('Initializing custom bookmark bar.');
        log('Runtime API availability.', {
            bookmarksGetSubTree: Boolean(getBookmarksApi() && typeof getBookmarksApi().getSubTree === 'function'),
            tabsQuery: Boolean(window.chrome && window.chrome.tabs && typeof window.chrome.tabs.query === 'function'),
            menuRegister: Boolean(getMenuApi() && typeof getMenuApi().register === 'function'),
            menuOpenPopup: Boolean(getMenuApi() && typeof getMenuApi().openPopup === 'function')
        });
        ensureStyle();
        attachRuntimeListeners();
        scheduleMount('initial');

        const loaded = await loadBookmarkData('initial');
        if (loaded) {
            ensureMount('initial data loaded');
            renderBookmarkBar();
        }
    }

    init().catch(function (error) {
        reportError('Initialization failed.', error);
    });
})();
