// ==UserScript==
// @name            customBookmarksBar.ac.js
// @name:zh-CN      customBookmarksBar.ac.js
// @description     Add a custom bookmark bar below Vivaldi's native bookmark bar
// @description:zh-CN 在 Vivaldi 原生书签栏下方增加自绘书签栏
// @license         MIT License
// @compatibility   Vivaldi 8.1
// @version         20260807.1
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
    const NATIVE_VISIBLE_CLASS = 'userchrome-custom-bookmarks-native-visible';
    const ROW_ID = 'userchrome-custom-bookmarks-bar';
    const ROW_LABEL = '自绘书签栏';
    const ROW_EVENT_BOUNDARY_TYPES = [
        'auxclick',
        'click',
        'contextmenu',
        'dblclick',
        'keydown',
        'keyup',
        'mousedown',
        'mousemove',
        'mouseout',
        'mouseover',
        'mouseup',
        'pointerdown',
        'pointermove',
        'pointerout',
        'pointerover',
        'pointerup',
        'pointercancel',
        'dragstart',
        'dragend',
        'dragenter',
        'dragleave',
        'dragover',
        'drop',
        'touchstart',
        'touchmove',
        'touchend',
        'touchcancel',
        'wheel'
    ];
    const BOOKMARKS_FOLDER_PREF = 'vivaldi.bookmarks.bar.folder_ids';
    const BOOKMARKS_DISPLAY_PREF = 'vivaldi.bookmarks.bar.display';
    const BOOKMARKS_SORTING_PREF = 'vivaldi.bookmarks.bar.sorting';
    const BOOKMARKS_OPEN_IN_NEW_TAB_PREF = 'vivaldi.bookmarks.open_in_new_tab';
    const CUSTOM_SETTINGS_KEY = 'USERCHROME_CUSTOM_BOOKMARKS_BAR_SETTINGS';
    const CUSTOM_SETTINGS_VERSION = 1;
    const DEFAULT_CUSTOM_SETTINGS = Object.freeze({
        rowHeight: 28,
        itemMaxWidth: 120,
        nativeVisible: false
    });
    const DEFAULT_FOLDER_ID = '1';
    const SORT_ORDER = Object.freeze({
        none: 1,
        ascending: 2,
        descending: 3
    });
    const SORT_FIELDS = Object.freeze([
        'manually',
        'title',
        'url',
        'nickname',
        'description',
        'dateAdded'
    ]);
    const SEPARATOR_URL = 'http://bookmark.placeholder.url/';
    const NATIVE_BOOKMARK_MIME = 'vivaldi/x-bookmarks';
    const FOLDER_POPUP_PREFIX = 'userchrome-bookmarks-folder:';
    const MORE_POPUP_ID = 'userchrome-bookmarks-more';
    const MORE_BUTTON_ID = 'userchrome-custom-bookmarks-more';
    const BOOKMARK_POPUP_CLASS = 'userchrome-bookmark-popup-menu';
    const CONTEXT_MENU_CLASS = 'userchrome-bookmark-context-menu';
    const BOOKMARK_BAR_CONTEXT_MENU_CLASS = 'userchrome-bookmark-bar-context-menu';
    const BOOKMARK_BAR_CONTEXT_MENU_PENDING_CLASS = 'userchrome-bookmark-bar-context-menu-pending';
    const BOOKMARK_BAR_CLASSES = Object.freeze({
        item: 'userchrome-custom-bookmarks-bar-item',
        folder: 'userchrome-custom-bookmarks-bar-folder',
        icon: 'userchrome-custom-bookmarks-bar-icon',
        folderIcon: 'userchrome-custom-bookmarks-bar-folder-icon',
        folderFill: 'userchrome-custom-bookmarks-bar-folder-fill',
        title: 'userchrome-custom-bookmarks-bar-title',
        separatorItem: 'userchrome-custom-bookmarks-bar-separator-item',
        separator: 'userchrome-custom-bookmarks-bar-separator',
        empty: 'userchrome-custom-bookmarks-bar-empty',
        folderChevron: 'userchrome-custom-bookmarks-bar-folder-chevron',
        more: 'userchrome-custom-bookmarks-bar-more',
        dragging: 'userchrome-custom-bookmarks-bar-dragging',
        dropBefore: 'userchrome-custom-bookmarks-bar-drop-before',
        dropAfter: 'userchrome-custom-bookmarks-bar-drop-after',
        dropInto: 'userchrome-custom-bookmarks-bar-drop-into'
    });
    const CLIPBOARD_KEY = 'USERCHROME_BOOKMARK_CLIPBOARD';
    const CLIPBOARD_VERSION = 1;
    const REFRESH_DELAY = 120;
    const MOUNT_DELAY = 120;
    const FOLDER_DRAG_OPEN_DELAY = 650;
    const FAVICON_SIZES = [16, 24, 32];
    const FOLDER_ICON_SVG = `<svg width="16" height="16" viewBox="0 0 16 16" class="${BOOKMARK_BAR_CLASSES.icon} ${BOOKMARK_BAR_CLASSES.folderIcon}"><g class="${BOOKMARK_BAR_CLASSES.folderFill}"><svg width="16" height="16" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M2.35717 3.36075C2.13323 3.58693 2.00515 3.89221 2 4.21203V11.7872C1.99441 11.9479 2.02163 12.1081 2.07996 12.2577C2.13828 12.4073 2.22648 12.5431 2.33904 12.6568C2.4516 12.7705 2.58613 12.8596 2.73425 12.9185C2.88237 12.9774 3.04091 13.0049 3.2 12.9993H12.8C13.1167 12.9941 13.4189 12.8647 13.6428 12.6385C13.8668 12.4123 13.9948 12.1071 14 11.7872L14 6C14 5.5 13.5 5 13 5H8L6.8 3H3.2C2.88334 3.0052 2.5811 3.13457 2.35717 3.36075ZM2.99939 11.822L3 11.8046V4.22318C3.00223 4.16171 3.02741 4.10511 3.06779 4.06432C3.10773 4.02398 3.15929 4.00208 3.21161 4H6.24589L7.5 6H12.8C12.9105 6 13 6.08796 13 6.19842C13 7.13107 13 11.0636 13 11.7761C12.9978 11.8376 12.9726 11.8942 12.9322 11.935C12.8923 11.9753 12.8407 11.9972 12.7884 11.9993H3.18227L3.16455 11.9999C3.14406 12.0006 3.12343 11.9971 3.10383 11.9893C3.08421 11.9815 3.06567 11.9694 3.04966 11.9533C3.03364 11.9371 3.02051 11.9171 3.01165 11.8944C3.00278 11.8717 2.99853 11.847 2.99939 11.822Z"></path><path fill-rule="evenodd" d="M2.99939 11.822L3 11.8046V4.22318C3.00223 4.16171 3.02741 4.10511 3.06779 4.06432C3.10773 4.02398 3.15929 4.00208 3.21161 4H6.24589L7.5 6H12.8C12.9105 6 13 6.08796 13 6.19842C13 7.13107 13 11.0636 13 11.7761C12.9978 11.8376 12.9726 11.8942 12.9322 11.935C12.8923 11.9753 12.8407 11.9972 12.7884 11.9993H3.18227L3.16455 11.9999C3.14406 12.0006 3.12343 11.9971 3.10383 11.9893C3.08421 11.9815 3.06567 11.9694 3.04967 11.9533C3.03364 11.9371 3.02051 11.9171 3.01165 11.8944C3.00278 11.8717 2.99853 11.847 2.99939 11.822Z" fill-opacity="0.1"></path></svg></g></svg>`;
    const FOLDER_CHEVRON_SVG = '<svg width="11" height="6" xmlns="http://www.w3.org/2000/svg"><path d="M1.354 4.894a.497.497 0 1 0 .702.702l3.423-3.423L8.9 5.596a.491.491 0 1 0 .695-.695L5.851 1.156a.49.49 0 0 0-.27-.137.496.496 0 0 0-.48.128L1.354 4.894z"></path></svg>';
    const MORE_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.92429 3.07574C3.68997 2.84142 3.31007 2.84142 3.07576 3.07574C2.84145 3.31005 2.84145 3.68995 3.07576 3.92426L7.1515 8L3.07576 12.0757C2.84145 12.3101 2.84145 12.6899 3.07576 12.9243C3.31007 13.1586 3.68997 13.1586 3.92429 12.9243L8.84855 8L3.92429 3.07574Z" fill="currentColor"></path><path d="M8.92429 3.07574C8.68997 2.84142 8.31007 2.84142 8.07576 3.07574C7.84145 3.31005 7.84145 3.68995 8.07576 3.92426L12.1515 8L8.07576 12.0757C7.84145 12.3101 7.84145 12.6899 8.07576 12.9243C8.31007 13.1586 8.68997 13.1586 8.92429 12.9243L13.8486 8L8.92429 3.07574Z" fill="currentColor"></path></svg>';

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
        stopAddedNodeObserver: null,
        mountTimer: null,
        refreshTimer: null,
        refreshInFlight: false,
        refreshAgain: false,
        requestId: 0,
        data: {
            folderIds: [],
            displayMode: 'default',
            sorting: {
                sortOrder: SORT_ORDER.none,
                sortField: 'manually'
            },
            roots: [],
            topLevel: [],
            relevantIds: new Set(),
            signature: ''
        },
        buttons: [],
        hiddenNodes: [],
        moreKey: '',
        drag: {
            sourceType: '',
            operation: '',
            sourceIds: [],
            sourceNodes: [],
            sourceDescendantIds: new Set(),
            sourceElement: null,
            targetId: '',
            targetParentId: '',
            targetIndex: -1,
            targetElement: null,
            position: '',
            folderOpenTimer: null,
            folderOpenId: '',
            folderOpenElement: null,
            moveInFlight: false
        },
        folderPopups: new Map(),
        morePopup: null,
        activePopupController: null,
        settings: { ...DEFAULT_CUSTOM_SETTINGS },
        bookmarkClipboard: null,
        clipboardStorageListener: null,
        bookmarkListeners: [],
        prefListener: null,
        customSettingsStorageListener: null,
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

    function notify (message, type) {
        const alerts = window.userChrome_js && window.userChrome_js.alert;
        if (typeof alerts === 'function') {
            alerts.call(window.userChrome_js, message, { type: type || 'info' });
        } else {
            log(message);
        }
    }

    function ensureStyle () {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = createElement('style', {
            id: STYLE_ID,
            innerHTML: `
            .bookmark-bar[role="toolbar"] > div.observer {
                display: none !important;
            }

            .bookmark-bar[role="toolbar"].${NATIVE_VISIBLE_CLASS} > div.observer {
                display: flex !important;
                flex: 0 0 var(--userchrome-bookmark-row-height, 28px) !important;
                width: 100% !important;
                height: var(--userchrome-bookmark-row-height, 28px) !important;
                min-height: var(--userchrome-bookmark-row-height, 28px) !important;
            }
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
                --userchrome-bookmark-item-max-width: 120px;
                display: flex;
                flex: 0 0 var(--userchrome-bookmark-row-height);
                align-items: stretch;
                min-width: 0;
                width: 100%;
                height: var(--userchrome-bookmark-row-height);
                box-sizing: border-box;
                background-color: inherit;
                color: inherit;
                fill: inherit;
                stroke: inherit;
                font: inherit;
                position: relative;
            }

            #${ROW_ID} > .observer > .${BOOKMARK_BAR_CLASSES.item},
            #${ROW_ID} > .${BOOKMARK_BAR_CLASSES.more} {
                display: inline-flex;
                align-items: center;
                flex: 0 0 auto;
                gap: 6px;
                max-width: var(--userchrome-bookmark-item-max-width);
                box-sizing: border-box;
                padding: 0 6px 0 0;
                margin-left: 0;
                border: 0;
                border-radius: 0;
                background: none;
                color: inherit;
                font: inherit;
                position: relative;
            }

            #${ROW_ID} > .observer > .${BOOKMARK_BAR_CLASSES.item}[hidden],
            #${ROW_ID} > .${BOOKMARK_BAR_CLASSES.more}[hidden] {
                display: none !important;
            }

            .unified-ui #${ROW_ID} > .observer > .${BOOKMARK_BAR_CLASSES.item},
            .unified-ui #${ROW_ID} > .${BOOKMARK_BAR_CLASSES.more} {
                border-radius: var(--radius);
                background-color: transparent;
            }

            .unified-ui #${ROW_ID} > .observer > .${BOOKMARK_BAR_CLASSES.item}:hover,
            .unified-ui #${ROW_ID} > .${BOOKMARK_BAR_CLASSES.more}:hover {
                background-color: var(--colorBgAlphaHeavier);
            }

            .unified-ui #${ROW_ID} > .observer > .${BOOKMARK_BAR_CLASSES.item}:active,
            .unified-ui #${ROW_ID} > .${BOOKMARK_BAR_CLASSES.more}:active {
                background-color: var(--colorBgAlphaHeavy);
            }

            #${ROW_ID} > .observer > .${BOOKMARK_BAR_CLASSES.separatorItem} {
                padding-left: 5px;
            }

            #${ROW_ID} .${BOOKMARK_BAR_CLASSES.separator} {
                height: var(--userchrome-bookmark-row-height);
                border-left: 1px solid var(--colorBorder);
            }

            .color-behind-tabs-off #${ROW_ID} > .observer > .${BOOKMARK_BAR_CLASSES.item},
            .color-behind-tabs-off #${ROW_ID} > .${BOOKMARK_BAR_CLASSES.more} {
                background-color: var(--colorAccentBg);
                color: var(--colorAccentFg);
            }

            .color-behind-tabs-off #${ROW_ID} .${BOOKMARK_BAR_CLASSES.separator} {
                border-left-color: var(--colorAccentBorder);
            }

            .color-behind-tabs-on #${ROW_ID} > .observer > .${BOOKMARK_BAR_CLASSES.item},
            .color-behind-tabs-on #${ROW_ID} > .${BOOKMARK_BAR_CLASSES.more} {
                background-color: var(--colorBg);
            }

            .color-behind-tabs-off #${ROW_ID} > .observer > .${BOOKMARK_BAR_CLASSES.item}:focus-visible,
            .color-behind-tabs-off #${ROW_ID} > .observer > .${BOOKMARK_BAR_CLASSES.item}:hover,
            .color-behind-tabs-off #${ROW_ID} > .${BOOKMARK_BAR_CLASSES.more}:focus-visible,
            .color-behind-tabs-off #${ROW_ID} > .${BOOKMARK_BAR_CLASSES.more}:hover {
                background-color: var(--colorAccentBgDark);
            }

            .color-behind-tabs-on #${ROW_ID} > .observer > .${BOOKMARK_BAR_CLASSES.item}:focus-visible,
            .color-behind-tabs-on #${ROW_ID} > .observer > .${BOOKMARK_BAR_CLASSES.item}:hover,
            .color-behind-tabs-on #${ROW_ID} > .${BOOKMARK_BAR_CLASSES.more}:focus-visible,
            .color-behind-tabs-on #${ROW_ID} > .${BOOKMARK_BAR_CLASSES.more}:hover {
                background-color: var(--colorBgDark);
            }

            #${ROW_ID} > .observer > .${BOOKMARK_BAR_CLASSES.item} img,
            #${ROW_ID} > .observer > .${BOOKMARK_BAR_CLASSES.item} svg,
            #${ROW_ID} > .${BOOKMARK_BAR_CLASSES.more} > svg {
                width: 16px;
                height: 16px;
                flex: 0 0 auto;
                margin: auto 0;
                fill: currentColor;
                stroke: none;
                pointer-events: none;
            }

            #${ROW_ID} > .observer > .${BOOKMARK_BAR_CLASSES.item}:focus-visible img.${BOOKMARK_BAR_CLASSES.icon},
            #${ROW_ID} > .observer > .${BOOKMARK_BAR_CLASSES.item}:hover img.${BOOKMARK_BAR_CLASSES.icon} {
                border-radius: 3px;
                background-color: transparent;
            }

            #${ROW_ID} .${BOOKMARK_BAR_CLASSES.icon} {
                border-radius: 3px;
            }

            #${ROW_ID} .${BOOKMARK_BAR_CLASSES.folderIcon} {
                flex: 0 0 auto;
            }

            #${ROW_ID} > .observer > .${BOOKMARK_BAR_CLASSES.item} span {
                display: flex;
                order: 1;
            }

            #${ROW_ID} > .observer > .${BOOKMARK_BAR_CLASSES.item} .${BOOKMARK_BAR_CLASSES.folderChevron} {
                display: inline-flex;
                flex: 0 0 10px;
                align-items: center;
                justify-content: center;
                width: 10px;
                height: 10px;
            }

            #${ROW_ID} > .observer > .${BOOKMARK_BAR_CLASSES.item} .${BOOKMARK_BAR_CLASSES.folderChevron} > svg {
                width: initial;
                height: initial;
                margin: 0;
                opacity: 0.65;
                rotate: 180deg;
            }

            #${ROW_ID} > .observer > .${BOOKMARK_BAR_CLASSES.item} .${BOOKMARK_BAR_CLASSES.title} {
                display: inline-block;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
                pointer-events: none;
            }

            #${ROW_ID} > .observer > .${BOOKMARK_BAR_CLASSES.item}::before {
                content: '';
                width: 0;
                height: var(--userchrome-bookmark-row-height);
                flex: 0 0 auto;
                background-color: transparent;
                position: relative;
                transition: width 50ms linear 50ms;
            }

            #${ROW_ID} > .observer > .${BOOKMARK_BAR_CLASSES.item}.${BOOKMARK_BAR_CLASSES.dragging} {
                opacity: 0.45;
            }

            #userchrome-menu-root .${BOOKMARK_POPUP_CLASS} > :is(.userchrome-menu-item, .userchrome-menu-separator).${BOOKMARK_BAR_CLASSES.dragging} {
                opacity: 0.45;
            }

            #${ROW_ID} > .observer > .${BOOKMARK_BAR_CLASSES.item}.${BOOKMARK_BAR_CLASSES.dropBefore}::after,
            #${ROW_ID} > .observer > .${BOOKMARK_BAR_CLASSES.item}.${BOOKMARK_BAR_CLASSES.dropAfter}::after {
                content: '';
                width: 2px;
                border-radius: 1px;
                background-color: var(--colorHighlightBg, #006edc);
                pointer-events: none;
                position: absolute;
                z-index: 2;
                inset-block: 3px;
            }

            #${ROW_ID} > .observer > .${BOOKMARK_BAR_CLASSES.item}.${BOOKMARK_BAR_CLASSES.dropBefore}::after {
                inset-inline-start: -1px;
            }

            #${ROW_ID} > .observer > .${BOOKMARK_BAR_CLASSES.item}.${BOOKMARK_BAR_CLASSES.dropAfter}::after {
                inset-inline-end: -1px;
            }

            #userchrome-menu-root .${BOOKMARK_POPUP_CLASS} > :is(.userchrome-menu-item, .userchrome-menu-separator) {
                position: relative;
            }

            #userchrome-menu-root .${BOOKMARK_POPUP_CLASS} > .userchrome-menu-item:disabled {
                pointer-events: none;
            }

            #userchrome-menu-root .${BOOKMARK_POPUP_CLASS} > :is(.userchrome-menu-item, .userchrome-menu-separator).${BOOKMARK_BAR_CLASSES.dropBefore}::before,
            #userchrome-menu-root .${BOOKMARK_POPUP_CLASS} > :is(.userchrome-menu-item, .userchrome-menu-separator).${BOOKMARK_BAR_CLASSES.dropAfter}::before {
                content: '';
                height: 2px;
                border-radius: 1px;
                background-color: var(--colorHighlightBg, #006edc);
                pointer-events: none;
                position: absolute;
                z-index: 3;
                inset-inline: 4px;
            }

            #userchrome-menu-root .${BOOKMARK_POPUP_CLASS} > :is(.userchrome-menu-item, .userchrome-menu-separator).${BOOKMARK_BAR_CLASSES.dropBefore}::before {
                top: -1px;
            }

            #userchrome-menu-root .${BOOKMARK_POPUP_CLASS} > :is(.userchrome-menu-item, .userchrome-menu-separator).${BOOKMARK_BAR_CLASSES.dropAfter}::before {
                bottom: -1px;
            }

            #${ROW_ID}.${BOOKMARK_BAR_CLASSES.dropInto},
            #userchrome-menu-root .${BOOKMARK_POPUP_CLASS}.${BOOKMARK_BAR_CLASSES.dropInto} {
                outline: 2px solid var(--colorHighlightBg, #006edc);
                outline-offset: -3px;
            }

            .active-pane-selection.hasfocus #${ROW_ID} > .observer > .${BOOKMARK_BAR_CLASSES.item}:focus-visible,
            .active-pane-selection.hasfocus #${ROW_ID} > .${BOOKMARK_BAR_CLASSES.more}:focus-visible {
                outline: 2px solid var(--colorHighlightBg);
                outline-offset: -2px;
            }

            #${MORE_BUTTON_ID}.${BOOKMARK_BAR_CLASSES.more} {
                flex: 0 0 28px;
                width: 28px;
                min-width: 28px;
                height: 100%;
                max-width: 28px;
                padding: 0 6px;
                gap: 0;
                position: absolute;
                right: 0;
                top: 0;
                align-self: center;
                stroke-opacity: 0;
            }

            #${MORE_BUTTON_ID}.${BOOKMARK_BAR_CLASSES.more} > svg {
                display: block;
            }

            #${MORE_BUTTON_ID}.${BOOKMARK_BAR_CLASSES.more}::before {
                content: none;
                display: none;
            }

            #browser.break-mode #${ROW_ID} .${BOOKMARK_BAR_CLASSES.item} span,
            #browser.break-mode #${ROW_ID} .${BOOKMARK_BAR_CLASSES.item} img,
            #browser.break-mode #${ROW_ID} .${BOOKMARK_BAR_CLASSES.item} svg,
            #browser.break-mode #${ROW_ID} .${BOOKMARK_BAR_CLASSES.more} svg {
                visibility: hidden;
                pointer-events: none;
            }

            #browser.break-mode #${ROW_ID} .${BOOKMARK_BAR_CLASSES.item},
            #browser.break-mode #${ROW_ID} .${BOOKMARK_BAR_CLASSES.more} {
                background: transparent;
                box-shadow: 1px 0 var(--colorBorder);
                pointer-events: none;
            }

            #${ROW_ID} .${BOOKMARK_BAR_CLASSES.empty} {
                display: inline-flex;
                align-items: center;
                min-width: 0;
                padding: 0 10px;
                color: var(--colorFgFaded, rgba(34, 34, 34, 0.62));
                font-size: 12px;
                white-space: nowrap;
            }

            #userchrome-menu-root .${BOOKMARK_POPUP_CLASS},
            #userchrome-menu-root .${CONTEXT_MENU_CLASS} {
                border-color: color-mix(in srgb, var(--colorBorder, rgba(0, 0, 0, 0.18)) 74%, transparent);
                border-radius: 12px;
                background: var(--colorBg, #fff);
                box-shadow: 0 12px 34px rgba(0, 0, 0, 0.24), 0 2px 8px rgba(0, 0, 0, 0.12);
                scrollbar-width: thin;
            }

            #userchrome-menu-root .${CONTEXT_MENU_CLASS} {
                width: min(276px, calc(100vw - 16px));
                min-width: min(276px, calc(100vw - 16px));
                max-width: min(320px, calc(100vw - 16px));
                max-height: calc(100vh - 16px);
                padding: 12px 6px;
                overflow-x: hidden;
                overflow-y: auto;
                border-radius: 14px;
            }

            #userchrome-menu-root .${CONTEXT_MENU_CLASS} .userchrome-menu-item {
                grid-template-columns: 18px minmax(0, 1fr) auto;
                column-gap: 8px;
                min-height: 30px;
                padding: 3px 10px;
                border-radius: 8px;
                font-size: 13px;
                line-height: 1.3;
            }

            #userchrome-menu-root .${CONTEXT_MENU_CLASS} .userchrome-menu-shortcut {
                margin-left: 14px;
                color: inherit;
                font-size: 12px;
                opacity: 0.82;
            }

            #userchrome-menu-root .${CONTEXT_MENU_CLASS} .userchrome-menu-arrow {
                display: none;
            }

            #userchrome-menu-root .${CONTEXT_MENU_CLASS} .userchrome-menu-item[aria-haspopup="menu"] {
                grid-template-columns: 18px minmax(0, 1fr) auto 14px;
            }

            #userchrome-menu-root .${CONTEXT_MENU_CLASS} .userchrome-menu-item[aria-haspopup="menu"] .userchrome-menu-arrow {
                display: inline-block;
                width: 14px;
                margin-left: 4px;
            }

            #userchrome-menu-root .${CONTEXT_MENU_CLASS}.${BOOKMARK_BAR_CONTEXT_MENU_CLASS} .userchrome-menu-item:focus-visible:not(:hover):not([aria-expanded="true"]) {
                background: transparent;
                color: inherit;
            }

            #userchrome-menu-root .${CONTEXT_MENU_CLASS}.${BOOKMARK_BAR_CONTEXT_MENU_CLASS}.${BOOKMARK_BAR_CONTEXT_MENU_PENDING_CLASS} .userchrome-menu-item:hover:not([aria-expanded="true"]) {
                background: transparent;
                color: inherit;
            }

            #userchrome-menu-root .${CONTEXT_MENU_CLASS} .userchrome-menu-separator {
                margin: 0;
            }

            #userchrome-menu-root .${CONTEXT_MENU_CLASS} .userchrome-menu-separator::after {
                border-bottom-color: color-mix(in srgb, var(--colorBorder, rgba(0, 0, 0, 0.16)) 78%, transparent);
            }

            #userchrome-modal .userchrome-bookmark-dialog-fields {
                display: grid;
                gap: 14px;
            }

            #userchrome-modal .userchrome-bookmark-dialog-field {
                display: grid;
                gap: 6px;
            }

            #userchrome-modal .userchrome-bookmark-dialog-checkbox {
                display: flex;
                grid-template-columns: none;
                align-items: center;
                gap: 10px;
                min-height: 36px;
                cursor: pointer;
                user-select: none;
            }

            #userchrome-modal .userchrome-bookmark-dialog-checkbox .userchrome-bookmark-dialog-label {
                order: 1;
            }

            #userchrome-modal .userchrome-bookmark-dialog-checkbox-control {
                order: 0;
                flex: 0 0 auto;
                width: auto;
                min-width: 0;
                height: auto;
                min-height: 0;
                margin: 0;
                padding: 0;
                border: 0;
                border-radius: 0;
                appearance: auto;
                -webkit-appearance: auto;
                cursor: pointer;
                pointer-events: auto !important;
                user-select: none;
            }

            #userchrome-modal .userchrome-bookmark-dialog-label {
                font-size: 13px;
                font-weight: 500;
            }

            #userchrome-modal .userchrome-bookmark-dialog-fields :is(input:not([type="checkbox"]), select) {
                width: 100%;
                min-height: 36px;
                box-sizing: border-box;
                padding: 7px 10px;
                border: 1px solid var(--colorBorder, rgba(0, 0, 0, 0.24));
                border-radius: 6px;
                outline: none;
                background: var(--colorBgIntense, var(--colorBg, #fff));
                color: var(--colorFg, #222);
                font: inherit;
            }

            #userchrome-modal .userchrome-bookmark-dialog-fields :is(input:not([type="checkbox"]), select):focus {
                border-color: var(--colorAccentBg, #006dcc);
                box-shadow: 0 0 0 2px color-mix(in srgb, var(--colorAccentBg, #006dcc) 28%, transparent);
            }

            #userchrome-modal .userchrome-modal-content {
                position: relative;
                scrollbar-width: thin;
                scrollbar-color: var(--colorBorder, rgba(0, 0, 0, 0.35)) transparent;
            }

            #userchrome-modal .userchrome-modal-content::-webkit-scrollbar {
                width: 8px;
            }

            #userchrome-modal .userchrome-modal-content::-webkit-scrollbar-track {
                background: transparent;
            }

            #userchrome-modal .userchrome-modal-content::-webkit-scrollbar-thumb {
                border: 2px solid transparent;
                border-radius: 999px;
                background-clip: padding-box;
                background-color: var(--colorBorder, rgba(0, 0, 0, 0.35));
            }

            #userchrome-modal .userchrome-modal-content::after {
                content: '';
                position: sticky;
                z-index: 1;
                display: block;
                right: 0;
                bottom: -20px;
                height: 18px;
                margin: 0 -20px -20px;
                pointer-events: none;
                background: linear-gradient(to bottom, transparent, var(--colorBg, #fff) 78%);
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

    async function writePreference (path, value) {
        const prefs = window.vivaldi && window.vivaldi.prefs;
        if (!prefs || typeof prefs.set !== 'function') {
            throw new Error('vivaldi.prefs.set is unavailable for ' + path + '.');
        }
        await prefs.set({ path, value });
        log('Wrote preference.', { path, value });
    }

    function normalizeCustomSettings (value) {
        const source = value && typeof value === 'object' ? value : {};
        const rowHeight = Number(source.rowHeight);
        const itemMaxWidth = Number(source.itemMaxWidth);
        return {
            rowHeight: Number.isFinite(rowHeight)
                ? Math.min(48, Math.max(22, Math.round(rowHeight)))
                : DEFAULT_CUSTOM_SETTINGS.rowHeight,
            itemMaxWidth: Number.isFinite(itemMaxWidth)
                ? Math.min(360, Math.max(60, Math.round(itemMaxWidth)))
                : DEFAULT_CUSTOM_SETTINGS.itemMaxWidth,
            nativeVisible: source.nativeVisible === true
        };
    }

    function getCustomSettingsStorage () {
        const storage = window.chrome && window.chrome.storage;
        return storage && storage.local
            && typeof storage.local.get === 'function'
            && typeof storage.local.set === 'function'
            ? storage.local
            : null;
    }

    async function readCustomSettings () {
        const storage = getCustomSettingsStorage();
        if (!storage) {
            warn('chrome.storage.local is unavailable; using default bookmark bar settings.');
            return { ...DEFAULT_CUSTOM_SETTINGS };
        }
        try {
            const result = await new Promise(function (resolve, reject) {
                let settled = false;
                const finish = function (callback, value) {
                    if (settled) return;
                    settled = true;
                    callback(value);
                };
                const callback = function (value) {
                    const lastError = getBookmarkError();
                    if (lastError) {
                        finish(reject, new Error(lastError.message || String(lastError)));
                    } else {
                        finish(resolve, value || {});
                    }
                };
                try {
                    const pending = storage.get([CUSTOM_SETTINGS_KEY], callback);
                    if (pending && typeof pending.then === 'function') {
                        pending.then(function (value) { finish(resolve, value || {}); }).catch(function (error) { finish(reject, error); });
                    }
                } catch (callbackError) {
                    try {
                        const pending = storage.get([CUSTOM_SETTINGS_KEY]);
                        if (pending && typeof pending.then === 'function') {
                            pending.then(function (value) { finish(resolve, value || {}); }).catch(function (error) { finish(reject, error); });
                        } else {
                            finish(reject, callbackError);
                        }
                    } catch (error) {
                        finish(reject, error);
                    }
                }
            });
            const payload = result && result[CUSTOM_SETTINGS_KEY];
            if (!payload || payload.version !== CUSTOM_SETTINGS_VERSION) {
                return { ...DEFAULT_CUSTOM_SETTINGS };
            }
            return normalizeCustomSettings(payload);
        } catch (error) {
            reportError('Failed to read custom bookmark bar settings.', error);
            return { ...DEFAULT_CUSTOM_SETTINGS };
        }
    }

    async function writeCustomSettings (settings) {
        const storage = getCustomSettingsStorage();
        if (!storage) {
            throw new Error('chrome.storage.local is unavailable.');
        }
        const normalized = normalizeCustomSettings(settings);
        await new Promise(function (resolve, reject) {
            let settled = false;
            const finish = function (callback, value) {
                if (settled) return;
                settled = true;
                callback(value);
            };
            const callback = function () {
                const lastError = getBookmarkError();
                if (lastError) finish(reject, new Error(lastError.message || String(lastError)));
                else finish(resolve);
            };
            try {
                const pending = storage.set({
                    [CUSTOM_SETTINGS_KEY]: {
                        version: CUSTOM_SETTINGS_VERSION,
                        ...normalized
                    }
                }, callback);
                if (pending && typeof pending.then === 'function') {
                    pending.then(function () { finish(resolve); }).catch(function (error) { finish(reject, error); });
                }
            } catch (callbackError) {
                try {
                    const pending = storage.set({
                        [CUSTOM_SETTINGS_KEY]: {
                            version: CUSTOM_SETTINGS_VERSION,
                            ...normalized
                        }
                    });
                    if (pending && typeof pending.then === 'function') {
                        pending.then(function () { finish(resolve); }).catch(function (error) { finish(reject, error); });
                    } else {
                        finish(reject, callbackError);
                    }
                } catch (error) {
                    finish(reject, error);
                }
            }
        });
        state.settings = normalized;
    }

    function applyCustomSettings () {
        if (state.host) {
            state.host.classList.toggle(NATIVE_VISIBLE_CLASS, state.settings.nativeVisible);
            state.host.style.setProperty('--userchrome-bookmark-row-height', state.settings.rowHeight + 'px');
        }
        if (state.row) {
            state.row.style.setProperty('--userchrome-bookmark-item-max-width', state.settings.itemMaxWidth + 'px');
            requestAnimationFrame(layoutMore);
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

    function normalizeSorting (value) {
        const source = value && typeof value === 'object' ? value : {};
        const sortField = SORT_FIELDS.includes(source.sortField) ? source.sortField : 'manually';
        let sortOrder = Number(source.sortOrder);
        if (sortField === 'manually') {
            sortOrder = SORT_ORDER.none;
        } else if (![SORT_ORDER.ascending, SORT_ORDER.descending].includes(sortOrder)) {
            sortOrder = SORT_ORDER.ascending;
        }
        return { sortOrder, sortField };
    }

    function isManualSorting (sorting) {
        return !sorting
            || sorting.sortOrder === SORT_ORDER.none
            || sorting.sortField === 'manually';
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

    function getBookmarkNodes (id) {
        return callBookmarksApi('get', [[String(id)]]);
    }

    function updateBookmark (id, changes) {
        return callBookmarksApi('update', [String(id), changes]);
    }

    function moveBookmark (id, destination) {
        return callBookmarksApi('move', [String(id), destination]);
    }

    function removeBookmark (id) {
        return callBookmarksApi('remove', [String(id)]);
    }

    function removeBookmarkTree (id) {
        return callBookmarksApi('removeTree', [String(id)]);
    }

    function cloneBookmarkNode (node) {
        const children = Array.isArray(node && node.children)
            ? node.children.map(cloneBookmarkNode)
            : [];
        const clone = {
            id: String(node && typeof node.id !== 'undefined' ? node.id : ''),
            title: typeof (node && node.title) === 'string' ? node.title : '',
            parentId: String(node && typeof node.parentId !== 'undefined' ? node.parentId : ''),
            index: Number.isInteger(node && node.index) ? node.index : -1,
            trash: Boolean(node && node.trash),
            children: children
        };
        ['url', 'nickname', 'description'].forEach(function (field) {
            if (node
                && Object.prototype.hasOwnProperty.call(node, field)
                && typeof node[field] === 'string') {
                clone[field] = node[field];
            }
        });
        if (node && Object.prototype.hasOwnProperty.call(node, 'dateAdded')) {
            const dateAdded = Number(node.dateAdded);
            if (Number.isFinite(dateAdded)) {
                clone.dateAdded = dateAdded;
            }
        }
        return clone;
    }

    function getNodeDescendantIds (node) {
        const ids = new Set();
        function visit (entry) {
            if (!entry) {
                return;
            }
            ids.add(String(entry.id));
            entry.children.forEach(visit);
        }
        visit(node);
        return ids;
    }

    function collectFolderOptions (excludedIds) {
        const options = [];
        const excluded = excludedIds || new Set();
        function visit (folder, depth) {
            if (!folder || excluded.has(folder.id)) {
                return;
            }
            options.push({
                id: folder.id,
                label: (depth ? '  '.repeat(depth) + '↳ ' : '') + getNodeLabel(folder, '未命名文件夹')
            });
            folder.children.filter(function (child) {
                return isFolderNode(child);
            }).forEach(function (child) {
                visit(child, depth + 1);
            });
        }
        state.data.roots.forEach(function (root) {
            visit(root, 0);
        });
        return options;
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

    function isFolderNode (node) {
        return Boolean(node && !node.url && Array.isArray(node.children));
    }

    function compareBookmarkSortValues (first, second, sortOrder) {
        if (sortOrder <= SORT_ORDER.none) {
            return 0;
        }
        if (typeof first === 'number' && typeof second === 'number') {
            return sortOrder === SORT_ORDER.ascending ? first - second : second - first;
        }
        if (!first && !second) {
            return 0;
        }
        if (!first) {
            return sortOrder === SORT_ORDER.ascending ? 1 : -1;
        }
        if (!second) {
            return sortOrder === SORT_ORDER.ascending ? -1 : 1;
        }
        const compared = String(first).localeCompare(String(second));
        return sortOrder === SORT_ORDER.ascending ? compared : -compared;
    }

    function compareBookmarkNodes (first, second, sorting) {
        if (first.trash !== second.trash) {
            return first.trash ? 1 : -1;
        }
        const firstFolder = isFolderNode(first);
        const secondFolder = isFolderNode(second);
        if (firstFolder !== secondFolder) {
            return firstFolder ? -1 : 1;
        }

        let sortField = sorting.sortField;
        const firstHasField = Object.prototype.hasOwnProperty.call(first, sortField);
        const secondHasField = Object.prototype.hasOwnProperty.call(second, sortField);
        if (!firstHasField && !secondHasField) {
            sortField = first.title || second.title ? 'title' : 'dateAdded';
        }
        return compareBookmarkSortValues(first[sortField], second[sortField], sorting.sortOrder);
    }

    function sortBookmarkTree (nodes, sorting) {
        if (isManualSorting(sorting)) {
            return nodes;
        }
        nodes.forEach(function (node) {
            if (isFolderNode(node)) {
                sortBookmarkTree(node.children, sorting);
            }
        });
        nodes.sort(function (first, second) {
            return compareBookmarkNodes(first, second, sorting);
        });
        return nodes;
    }

    function createDialogField (field) {
        const wrapper = createElement('label', {
            class: 'userchrome-bookmark-dialog-field'
                + (field.type === 'checkbox' ? ' userchrome-bookmark-dialog-checkbox' : '')
        });

        let control;
        if (field.type === 'select') {
            control = createElement('select', { name: field.name });
            field.options.forEach(function (option) {
                const element = createElement('option', {
                    value: option.value,
                    innerText: option.label
                });
                element.selected = option.value === field.value;
                control.appendChild(element);
            });
        } else {
            control = createElement('input', {
                name: field.name,
                type: field.type || 'text',
                class: field.type === 'checkbox' ? 'userchrome-bookmark-dialog-checkbox-control' : '',
                autocomplete: 'off',
                spellcheck: 'false'
            });
            if (field.type === 'checkbox') {
                control.checked = field.checked === true;
            } else {
                control.value = field.value || '';
            }
            if (field.placeholder) {
                control.placeholder = field.placeholder;
            }
        }
        if (field.required) {
            control.required = true;
        }
        const controlId = 'userchrome-modal-field-' + String(field.name || 'field').replace(/[^a-zA-Z0-9_-]/g, '_');
        control.id = controlId;
        wrapper.setAttribute('for', controlId);
        if (typeof field.min !== 'undefined') {
            control.min = String(field.min);
        }
        if (typeof field.max !== 'undefined') {
            control.max = String(field.max);
        }
        if (typeof field.step !== 'undefined') {
            control.step = String(field.step);
        }
        const label = createElement('span', {
            class: 'userchrome-bookmark-dialog-label',
            innerText: field.label
        });
        if (field.type === 'checkbox') {
            wrapper.appendChild(control);
            wrapper.appendChild(label);
        } else {
            wrapper.appendChild(label);
            wrapper.appendChild(control);
        }
        return wrapper;
    }

    function showDialog (options) {
        const modal = window.userChrome_js && window.userChrome_js.modal;
        if (!modal || typeof modal.open !== 'function') {
            notify('全局 Modal API 尚未加载。', 'error');
            return null;
        }
        const content = createElement('div', { class: 'userchrome-bookmark-dialog-fields' });
        (options.fields || []).forEach(function (field) {
            content.appendChild(createDialogField(field));
        });
        return modal.open({
            title: options.title,
            message: options.message,
            content,
            confirmLabel: options.submitLabel || '保存',
            cancelLabel: '取消',
            danger: options.danger,
            restoreFocus: options.restoreFocus,
            validate: function (formData) {
                const data = {};
                (options.fields || []).forEach(function (field) {
                    data[field.name] = String(formData.get(field.name) || '').trim();
                });
                return typeof options.validate === 'function' ? options.validate(data) : '';
            }
        }).then(function (formData) {
            if (!formData) return null;
            const data = {};
            (options.fields || []).forEach(function (field) {
                data[field.name] = String(formData.get(field.name) || '').trim();
            });
            return data;
        });
    }

    function validateBookmarkUrl (value) {
        if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) {
            return '请输入带协议的完整网址，例如 https://example.com/。';
        }
        try {
            new URL(value);
            return '';
        } catch (error) {
            return '网址格式无效，请检查后重试。';
        }
    }

    function getFolderSelectOptions (excludedIds) {
        return collectFolderOptions(excludedIds).map(function (folder) {
            return { value: folder.id, label: folder.label };
        });
    }

    async function editNode (node, renameOnly) {
        const isFolder = isFolderNode(node);
        const fields = [{
            name: 'title',
            label: '名称',
            value: node.title,
            required: true
        }];
        if (!renameOnly && !isFolder) {
            fields.push({
                name: 'url',
                label: '网址',
                value: node.url,
                required: true
            });
        }
        if (!renameOnly) {
            const excludedIds = isFolder ? getNodeDescendantIds(node) : new Set();
            fields.push({
                name: 'parentId',
                label: '文件夹',
                type: 'select',
                value: node.parentId,
                options: getFolderSelectOptions(excludedIds)
            });
        }

        const data = await showDialog({
            title: renameOnly ? '重命名' : (isFolder ? '编辑文件夹' : '编辑书签'),
            fields: fields,
            validate: function (values) {
                if (!values.title) {
                    return '名称不能为空。';
                }
                return !renameOnly && !isFolder ? validateBookmarkUrl(values.url) : '';
            }
        });
        if (!data) {
            return;
        }

        try {
            const changes = { title: data.title };
            if (!renameOnly && !isFolder) {
                changes.url = data.url;
            }
            await updateBookmark(node.id, changes);
            if (!renameOnly && data.parentId && data.parentId !== node.parentId) {
                await moveBookmark(node.id, { parentId: data.parentId });
            }
            notify(renameOnly ? '已重命名书签项目。' : '已保存书签项目。', 'success');
        } catch (error) {
            reportError('Failed to edit bookmark: ' + node.id, error);
            notify('保存书签项目失败，请查看控制台。', 'error');
        }
    }

    async function createNewBookmark (folder) {
        const data = await showDialog({
            title: '新建书签',
            fields: [
                { name: 'title', label: '名称', value: '', required: true },
                { name: 'url', label: '网址', value: 'https://', required: true }
            ],
            validate: function (values) {
                if (!values.title) {
                    return '名称不能为空。';
                }
                return validateBookmarkUrl(values.url);
            }
        });
        if (!data) {
            return;
        }
        try {
            await createBookmark({ parentId: folder.id, title: data.title, url: data.url });
            notify('已新建书签。', 'success');
        } catch (error) {
            reportError('Failed to create bookmark in folder: ' + folder.id, error);
            notify('新建书签失败，请查看控制台。', 'error');
        }
    }

    async function createNewFolder (folder) {
        const data = await showDialog({
            title: '新建文件夹',
            fields: [{ name: 'title', label: '名称', value: '新建文件夹', required: true }],
            validate: function (values) {
                return values.title ? '' : '名称不能为空。';
            }
        });
        if (!data) {
            return;
        }
        try {
            await createBookmark({ parentId: folder.id, title: data.title });
            notify('已新建书签文件夹。', 'success');
        } catch (error) {
            reportError('Failed to create bookmark folder: ' + folder.id, error);
            notify('新建文件夹失败，请查看控制台。', 'error');
        }
    }

    async function createSeparator (folder) {
        try {
            await createBookmark({
                parentId: folder.id,
                title: '----',
                url: SEPARATOR_URL
            });
            notify('已新增分隔线。', 'success');
        } catch (error) {
            reportError('Failed to create bookmark separator: ' + folder.id, error);
            notify('新增分隔线失败，请查看控制台。', 'error');
        }
    }

    async function confirmDeleteNode (node) {
        const isFolder = isFolderNode(node);
        const data = await showDialog({
            title: isFolder ? '删除文件夹' : (isSeparatorBookmark(node) ? '删除分隔线' : '删除书签'),
            message: isFolder
                ? '此操作会同时删除文件夹“' + getNodeLabel(node, '未命名文件夹') + '”中的全部内容，且无法撤销。'
                : '确定删除“' + getNodeLabel(node, isSeparatorBookmark(node) ? '分隔线' : '未命名书签') + '”吗？此操作无法撤销。',
            fields: [],
            submitLabel: '删除',
            danger: true
        });
        if (!data) {
            return;
        }
        try {
            if (isFolder) {
                await removeBookmarkTree(node.id);
            } else {
                await removeBookmark(node.id);
            }
            notify('已删除书签项目。', 'success');
        } catch (error) {
            reportError('Failed to delete bookmark: ' + node.id, error);
            notify('删除书签项目失败，请查看控制台。', 'error');
        }
    }

    function createClipboardSnapshot (node) {
        const snapshot = {
            title: String(node.title || ''),
            url: String(node.url || '')
        };
        ['nickname', 'description'].forEach(function (field) {
            if (typeof (node && node[field]) === 'string' && node[field]) {
                snapshot[field] = node[field];
            }
        });
        if (isFolderNode(node)) {
            snapshot.children = node.children.map(createClipboardSnapshot);
        }
        return snapshot;
    }

    function normalizeBookmarkClipboard (payload) {
        if (!payload
            || payload.version !== CLIPBOARD_VERSION
            || !['cut', 'copy'].includes(payload.mode)
            || typeof payload.sourceId !== 'string'
            || !payload.snapshot
            || !Array.isArray(payload.sourceDescendantIds)) {
            return null;
        }
        return payload;
    }

    function getBookmarkClipboardStorage () {
        const storage = window.chrome && window.chrome.storage && window.chrome.storage.session;
        return storage
            && typeof storage.get === 'function'
            && typeof storage.set === 'function'
            && typeof storage.remove === 'function'
            ? storage
            : null;
    }

    function getBookmarkClipboardFallbackStorage () {
        try {
            return window.sessionStorage || null;
        } catch (error) {
            reportError('Failed to access session bookmark clipboard storage.', error);
            return null;
        }
    }

    async function loadBookmarkClipboard () {
        const storage = getBookmarkClipboardStorage();
        if (storage) {
            try {
                const stored = await storage.get(CLIPBOARD_KEY);
                const payload = normalizeBookmarkClipboard(stored && stored[CLIPBOARD_KEY]);
                state.bookmarkClipboard = payload;
                if (!payload && stored && Object.prototype.hasOwnProperty.call(stored, CLIPBOARD_KEY)) {
                    await storage.remove(CLIPBOARD_KEY);
                }
                return payload;
            } catch (error) {
                reportError('Failed to load bookmark clipboard from chrome.storage.session.', error);
            }
        }

        const fallback = getBookmarkClipboardFallbackStorage();
        if (!fallback) {
            state.bookmarkClipboard = null;
            return null;
        }
        try {
            const raw = fallback.getItem(CLIPBOARD_KEY);
            const payload = normalizeBookmarkClipboard(raw ? JSON.parse(raw) : null);
            state.bookmarkClipboard = payload;
            if (raw && !payload) {
                fallback.removeItem(CLIPBOARD_KEY);
            }
            return payload;
        } catch (error) {
            reportError('Failed to load bookmark clipboard from sessionStorage.', error);
            state.bookmarkClipboard = null;
            return null;
        }
    }

    async function writeBookmarkClipboard (mode, node) {
        const payload = {
            version: CLIPBOARD_VERSION,
            mode: mode,
            sourceId: node.id,
            sourceDescendantIds: Array.from(getNodeDescendantIds(node)),
            snapshot: createClipboardSnapshot(node),
            timestamp: Date.now()
        };
        state.bookmarkClipboard = payload;

        let persisted = false;
        const storage = getBookmarkClipboardStorage();
        if (storage) {
            try {
                await storage.set({ [CLIPBOARD_KEY]: payload });
                persisted = true;
            } catch (error) {
                reportError('Failed to write bookmark clipboard to chrome.storage.session.', error);
            }
        }
        if (!persisted) {
            const fallback = getBookmarkClipboardFallbackStorage();
            if (fallback) {
                try {
                    fallback.setItem(CLIPBOARD_KEY, JSON.stringify(payload));
                    persisted = true;
                } catch (error) {
                    reportError('Failed to write bookmark clipboard to sessionStorage.', error);
                }
            }
        }
        if (!persisted) {
            warn('Bookmark clipboard is only available in the current Vivaldi window.');
        }
        notify(mode === 'cut' ? '已剪切书签项目。' : '已复制书签项目。', 'success');
    }

    async function clearBookmarkClipboard () {
        state.bookmarkClipboard = null;

        const storage = getBookmarkClipboardStorage();
        if (storage) {
            try {
                await storage.remove(CLIPBOARD_KEY);
            } catch (error) {
                reportError('Failed to clear bookmark clipboard from chrome.storage.session.', error);
            }
        }
        const fallback = getBookmarkClipboardFallbackStorage();
        if (fallback) {
            try {
                fallback.removeItem(CLIPBOARD_KEY);
            } catch (error) {
                reportError('Failed to clear bookmark clipboard from sessionStorage.', error);
            }
        }
    }

    function readBookmarkClipboard () {
        return state.bookmarkClipboard;
    }

    function canPasteIntoFolder (folder, clipboard) {
        if (!folder || folder.url || !clipboard) {
            return false;
        }
        return clipboard.mode !== 'cut'
            || (clipboard.sourceId !== folder.id && !clipboard.sourceDescendantIds.includes(folder.id));
    }

    async function cloneSnapshotIntoFolder (snapshot, parentId, index) {
        const details = {
            parentId: String(parentId),
            title: String(snapshot.title || '')
        };
        if (Number.isInteger(index) && index >= 0) {
            details.index = index;
        }
        ['nickname', 'description'].forEach(function (field) {
            if (typeof snapshot[field] === 'string' && snapshot[field]) {
                details[field] = snapshot[field];
            }
        });
        if (snapshot.url) {
            details.url = snapshot.url;
        }
        const created = await createBookmark(details);
        const createdId = created && created.id;
        try {
            if (!snapshot.url && Array.isArray(snapshot.children) && createdId) {
                for (const child of snapshot.children || []) {
                    await cloneSnapshotIntoFolder(child, createdId, child.index);
                }
            }
            return created;
        } catch (error) {
            if (createdId) {
                try {
                    if (snapshot.url || !Array.isArray(snapshot.children)) {
                        await removeBookmark(createdId);
                    } else {
                        await removeBookmarkTree(createdId);
                    }
                } catch (cleanupError) {
                    reportError('Failed to clean up partial bookmark copy: ' + createdId, cleanupError);
                }
            }
            throw error;
        }
    }

    async function pasteIntoFolder (folder) {
        const clipboard = readBookmarkClipboard();
        if (!canPasteIntoFolder(folder, clipboard)) {
            notify(clipboard ? '不能将文件夹粘贴到自身或其子文件夹中。' : '书签剪贴板为空。', 'warn');
            return;
        }

        try {
            if (clipboard.mode === 'cut') {
                let sourceResult;
                try {
                    sourceResult = clipboard.snapshot.url
                        ? await getBookmarkNodes(clipboard.sourceId)
                        : await getBookmarkSubTree(clipboard.sourceId);
                } catch (sourceError) {
                    await clearBookmarkClipboard();
                    notify('剪切的书签项目已不存在。', 'warn');
                    return;
                }
                const source = Array.isArray(sourceResult) ? sourceResult[0] : sourceResult;
                if (!source) {
                    await clearBookmarkClipboard();
                    notify('剪切的书签项目已不存在。', 'warn');
                    return;
                }
                if (Array.isArray(clipboard.snapshot.children)) {
                    const currentSource = cloneBookmarkNode(source);
                    if (getNodeDescendantIds(currentSource).has(folder.id)) {
                        notify('不能将文件夹粘贴到自身或其子文件夹中。', 'warn');
                        return;
                    }
                }
                await moveBookmark(clipboard.sourceId, { parentId: folder.id });
                await clearBookmarkClipboard();
                notify('已移动书签项目。', 'success');
                return;
            }

            await cloneSnapshotIntoFolder(clipboard.snapshot, folder.id);
            notify('已粘贴书签项目。', 'success');
        } catch (error) {
            reportError('Failed to paste bookmark into folder: ' + folder.id, error);
            notify('粘贴书签项目失败，请查看控制台。', 'error');
        }
    }

    function collectBookmarkUrls (node) {
        const urls = [];
        function visit (entry) {
            if (!entry) {
                return;
            }
            if (entry.url) {
                if (!isSeparatorBookmark(entry)) {
                    urls.push(entry.url);
                }
                return;
            }
            entry.children.forEach(visit);
        }
        visit(node);
        return urls;
    }

    function getBookmarkDataSignature (folderIds, displayMode, sorting, roots) {
        return JSON.stringify({
            folderIds: folderIds,
            displayMode: displayMode,
            sorting: sorting,
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
        const sorting = normalizeSorting(await readPreference(
            BOOKMARKS_SORTING_PREF,
            { sortOrder: SORT_ORDER.none, sortField: 'manually' }
        ));
        const roots = [];

        log('Loading bookmark roots.', {
            reason,
            folderIds: configuredFolderIds,
            displayMode,
            sorting
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
                sortBookmarkTree(root.children, sorting);
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
        const signature = getBookmarkDataSignature(configuredFolderIds, displayMode, sorting, roots);
        const changed = signature !== state.data.signature;

        state.data = {
            folderIds: configuredFolderIds,
            displayMode: displayMode,
            sorting: sorting,
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

    function getFaviconUrl (url, size) {
        return 'chrome://favicon2/?size=' + size + '&pageUrl=' + encodeURIComponent(url);
    }

    function getFaviconSrcset (url) {
        return FAVICON_SIZES.map(function (size) {
            return getFaviconUrl(url, size) + ' ' + size + 'w';
        }).join(',');
    }

    function createBookmarkMenuItems (nodes) {
        const visibleNodes = isManualSorting(state.data.sorting)
            ? nodes
            : nodes.filter(function (node) {
                return !isSeparatorBookmark(node);
            });
        const items = visibleNodes.map(function (node) {
            if (isSeparatorBookmark(node)) {
                return {
                    id: getMenuItemId('separator-', node),
                    type: 'separator',
                    bookmarkNode: node,
                    onContextMenu: function (selection) {
                        openBookmarkContextMenu(node, selection.position, selection.element);
                    }
                };
            }

            const label = getNodeLabel(node, '未命名文件夹');
            if (node.url) {
                return {
                    id: getMenuItemId('bookmark-', node),
                    label: label,
                    icon: getFaviconUrl(node.url, FAVICON_SIZES[0]),
                    bookmarkNode: node,
                    onSelect: function (selection) {
                        return openBookmark(node, selection && selection.event);
                    },
                    onContextMenu: function (selection) {
                        openBookmarkContextMenu(node, selection.position, selection.element);
                    }
                };
            }

            return {
                id: getMenuItemId('folder-', node),
                label: label,
                bookmarkNode: node,
                children: createFolderMenuItems(node),
                onContextMenu: function (selection) {
                    openBookmarkContextMenu(node, selection.position, selection.element);
                }
            };
        });

        return items.length ? items : [createEmptyMenuItem('（空文件夹）')];
    }

    function createFolderMenuItems (folder) {
        const items = [
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

        if (collectBookmarkUrls(folder).length) {
            items.push(
                { type: 'separator' },
                {
                    id: getMenuItemId('open-all-', folder),
                    label: '全部打开',
                    onSelect: function () {
                        return openNodeInMode(folder, 'new-tab');
                    }
                }
            );
        }

        return items;
    }

    function openBookmarkPopupSubmenu (element) {
        if (element.getAttribute('aria-expanded') === 'true') {
            return;
        }
        if (document.activeElement === element) {
            element.dispatchEvent(new FocusEvent('focus'));
        } else {
            element.focus({ preventScroll: true });
        }
    }

    function getBookmarkPopupDropIndex (menuElement, folder, event) {
        const bookmarkElements = Array.from(menuElement.children).filter(function (element) {
            return element instanceof HTMLElement
                && element.dataset.userchromeBookmarkDropTarget === 'true';
        });
        if (!bookmarkElements.length) {
            return 0;
        }

        const firstRect = bookmarkElements[0].getBoundingClientRect();
        return event.clientY < firstRect.top ? 0 : folder.children.length;
    }

    function attachBookmarkPopupDropZone (menuElement, folder) {
        if (!menuElement || !folder) {
            return;
        }

        function isMenuBackgroundEvent (event) {
            const target = event.target instanceof Element ? event.target : null;
            if (!target || target.closest('.userchrome-menu') !== menuElement) {
                return false;
            }
            return !target.closest('[data-userchrome-bookmark-drop-target="true"]');
        }

        function updateTarget (event) {
            if (!isMenuBackgroundEvent(event)) {
                return false;
            }
            const index = getBookmarkPopupDropIndex(menuElement, folder, event);
            return updateBookmarkFolderDropTarget(menuElement, folder, index, event);
        }

        menuElement.addEventListener('dragover', function (event) {
            if (!updateTarget(event)) {
                return;
            }
            event.preventDefault();
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = getBookmarkDropOperation(event) !== 'bookmark-move'
                    ? 'copy'
                    : 'move';
            }
            clearBookmarkFolderOpenTimer();
        });

        menuElement.addEventListener('dragleave', function (event) {
            if (state.drag.targetElement === menuElement
                && (!event.relatedTarget || !menuElement.contains(event.relatedTarget))) {
                if (state.drag.sourceElement) {
                    clearBookmarkDropTarget();
                } else {
                    clearBookmarkDragState(false);
                }
            }
        });

        menuElement.addEventListener('drop', function (event) {
            if (!updateTarget(event)) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            void handleBookmarkDrop(event);
        });
    }

    function decorateBookmarkPopupLevel (menuElement, items, folder) {
        if (!(menuElement instanceof HTMLElement) || !Array.isArray(items)) {
            return;
        }

        attachBookmarkPopupDropZone(menuElement, folder);
        const entryElements = Array.from(menuElement.children).filter(function (element) {
            return element.classList
                && (element.classList.contains('userchrome-menu-item')
                    || element.classList.contains('userchrome-menu-separator'));
        });
        entryElements.forEach(function (element, index) {
            const item = items[index];
            const node = item && item.bookmarkNode;
            if (node) {
                attachBookmarkDragSorting(element, node, {
                    orientation: 'vertical',
                    openFolder: isFolderNode(node)
                        ? function () {
                            openBookmarkPopupSubmenu(element);
                        }
                        : null
                });
            }

            if (!item || !Array.isArray(item.children) || !item.children.length) {
                return;
            }
            const submenu = element.nextElementSibling;
            if (submenu
                && submenu.classList
                && submenu.classList.contains('userchrome-menu-submenu')) {
                decorateBookmarkPopupLevel(submenu, item.children, node || null);
            }
        });
    }

    function getBookmarkBarFolder () {
        return state.data.roots.length ? state.data.roots[0] : null;
    }

    async function updateBookmarkBarSorting (sorting) {
        const normalized = normalizeSorting(sorting);
        try {
            await writePreference(BOOKMARKS_SORTING_PREF, normalized);
            scheduleRefresh('bookmark sorting changed', true);
        } catch (error) {
            reportError('Failed to update bookmark bar sorting.', error);
            notify('更新书签栏排序失败，请查看控制台。', 'error');
        }
    }

    function selectBookmarkSortField (sortField) {
        const current = state.data.sorting;
        const sortOrder = sortField === 'manually'
            ? SORT_ORDER.none
            : (current.sortOrder === SORT_ORDER.none ? SORT_ORDER.ascending : current.sortOrder);
        return updateBookmarkBarSorting({ sortOrder, sortField });
    }

    function createBookmarkSortMenuItems () {
        const sorting = state.data.sorting;
        const fields = [
            { id: 'manual', label: '手动', sortField: 'manually' },
            { id: 'title', label: '按标题', sortField: 'title' },
            { id: 'url', label: '按地址', sortField: 'url' },
            { id: 'nickname', label: '按昵称', sortField: 'nickname' },
            { id: 'description', label: '按描述', sortField: 'description' },
            { id: 'date-added', label: '按创建日期', sortField: 'dateAdded' }
        ];
        const items = fields.map(function (field) {
            return {
                id: 'sort-' + field.id,
                type: 'checkbox',
                label: field.label,
                checked: sorting.sortField === field.sortField,
                onSelect: function () {
                    return selectBookmarkSortField(field.sortField);
                }
            };
        });

        if (!isManualSorting(sorting)) {
            const nextOrder = sorting.sortOrder === SORT_ORDER.ascending
                ? SORT_ORDER.descending
                : SORT_ORDER.ascending;
            items.push(
                { type: 'separator' },
                {
                    id: nextOrder === SORT_ORDER.ascending ? 'sort-ascending' : 'sort-descending',
                    label: nextOrder === SORT_ORDER.ascending ? '升序' : '降序',
                    onSelect: function () {
                        return updateBookmarkBarSorting({
                            sortOrder: nextOrder,
                            sortField: sorting.sortField
                        });
                    }
                }
            );
        }
        return items;
    }

    function createBookmarkBarContextItems (folder) {
        const items = [
            {
                id: 'add-current-page',
                label: '添加当前标签页(&A)',
                onSelect: function () {
                    return addCurrentPageToFolder(folder);
                }
            },
            { type: 'separator' },
            {
                id: 'new-bookmark',
                label: '新建书签(&N)',
                onSelect: function () {
                    return createNewBookmark(folder);
                }
            },
            {
                id: 'new-folder',
                label: '新建文件夹(&F)',
                onSelect: function () {
                    return createNewFolder(folder);
                }
            }
        ];

        if (isManualSorting(state.data.sorting)) {
            items.push({
                id: 'new-separator',
                label: '新增分隔线(&S)',
                onSelect: function () {
                    return createSeparator(folder);
                }
            });
        }

        const clipboard = readBookmarkClipboard();
        items.push(
            { type: 'separator' },
            {
                id: 'sort',
                label: '排序(&O)',
                children: createBookmarkSortMenuItems()
            },
            { type: 'separator' },
            {
                id: 'paste',
                label: '粘贴(&P)',
                disabled: !canPasteIntoFolder(folder, clipboard),
                onSelect: function () {
                    return pasteIntoFolder(folder);
                }
            },
            { type: 'separator' },
            {
                id: 'settings',
                label: '设置(&T)',
                onSelect: openBookmarkBarSettings
            }
        );
        return items;
    }

    async function openBookmarkBarSettings () {
        const modal = window.userChrome_js && window.userChrome_js.modal;
        if (!modal || typeof modal.open !== 'function') {
            notify('全局 Modal API 尚未加载。', 'error');
            return;
        }
        const displayMode = normalizeDisplayMode(await readPreference(BOOKMARKS_DISPLAY_PREF, state.data.displayMode));
        const openInNewTab = await readPreference(BOOKMARKS_OPEN_IN_NEW_TAB_PREF, false);
        const content = createElement('div', { class: 'userchrome-bookmark-dialog-fields' });
        content.appendChild(createDialogField({
            name: 'rowHeight', label: '行高（px）', type: 'number', value: state.settings.rowHeight,
            min: 22, max: 48, step: 1, required: true
        }));
        content.appendChild(createDialogField({
            name: 'itemMaxWidth', label: '项目最大宽度（px）', type: 'number', value: state.settings.itemMaxWidth,
            min: 60, max: 360, step: 1, required: true
        }));
        content.appendChild(createDialogField({
            name: 'nativeVisible',
            label: '显示原生书签工具栏',
            type: 'checkbox',
            checked: state.settings.nativeVisible
        }));
        content.appendChild(createDialogField({
            name: 'displayMode', label: '显示模式', type: 'select', value: displayMode,
            options: [
                { value: 'default', label: '默认（图标与标题）' },
                { value: 'text', label: '仅文本' },
                { value: 'icon', label: '仅图标' },
                { value: 'iconexceptfolders', label: '图标（文件夹显示标题）' }
            ]
        }));
        content.appendChild(createDialogField({
            name: 'openInNewTab', label: '普通左键打开方式', type: 'select', value: openInNewTab === true ? 'new-tab' : 'current-tab',
            options: [
                { value: 'current-tab', label: '当前标签页' },
                { value: 'new-tab', label: '前台新标签页' }
            ]
        }));
        const restoreFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const formData = await modal.open({
            title: '自绘书签栏设置',
            message: '设置会立即应用，并在当前用户配置中保存。',
            content,
            confirmLabel: '确定',
            cancelLabel: '取消',
            defaultSize: { width: 480, height: 520 },
            resizable: true,
            backdropBlur: 2,
            restoreFocus,
            validate: function (data) {
                const rowHeight = Number(data.get('rowHeight'));
                const itemMaxWidth = Number(data.get('itemMaxWidth'));
                if (!Number.isInteger(rowHeight) || rowHeight < 22 || rowHeight > 48) {
                    return '行高必须是 22–48 之间的整数。';
                }
                if (!Number.isInteger(itemMaxWidth) || itemMaxWidth < 60 || itemMaxWidth > 360) {
                    return '项目最大宽度必须是 60–360 之间的整数。';
                }
                return '';
            }
        });
        if (!formData) return;
        const nextSettings = normalizeCustomSettings({
            rowHeight: Number(formData.get('rowHeight')),
            itemMaxWidth: Number(formData.get('itemMaxWidth')),
            nativeVisible: formData.get('nativeVisible') === 'on'
        });
        try {
            await writeCustomSettings(nextSettings);
            await writePreference(BOOKMARKS_DISPLAY_PREF, normalizeDisplayMode(formData.get('displayMode')));
            await writePreference(BOOKMARKS_OPEN_IN_NEW_TAB_PREF, formData.get('openInNewTab') === 'new-tab');
            state.settings = nextSettings;
            applyCustomSettings();
            scheduleRefresh('custom bookmark settings changed', true);
            notify('自绘书签栏设置已保存。', 'success');
        } catch (error) {
            reportError('Failed to save custom bookmark bar settings.', error);
            notify('保存自绘书签栏设置失败，请查看控制台。', 'error');
        }
    }

    function createOpenContextItems (node) {
        return [
            {
                id: 'open-new-tab',
                label: '在新标签中打开(&O)',
                onSelect: function () {
                    return openNodeInMode(node, 'new-tab');
                }
            },
            {
                id: 'open-background-tab',
                label: '在后台标签中打开(&I)',
                onSelect: function () {
                    return openNodeInMode(node, 'new-background-tab');
                }
            },
            {
                id: 'open-current-tab',
                label: '打开(&E)',
                onSelect: function () {
                    return openNodeInMode(node, 'current-tab');
                }
            },
            { type: 'separator' },
            {
                id: 'open-new-window',
                label: '在新窗口中打开(&N)',
                onSelect: function () {
                    return openNodeInMode(node, 'new-window');
                }
            },
            {
                id: 'open-incognito-window',
                label: '在新建隐身窗口中打开(&P)',
                onSelect: function () {
                    return openNodeInMode(node, 'incognito-window');
                }
            }
        ];
    }

    function createBookmarkContextItems (node) {
        const separator = isSeparatorBookmark(node);
        const folder = isFolderNode(node);
        const items = [];
        if (!separator) {
            items.push(...createOpenContextItems(node));
        }
        if (folder) {
            items.push(
                { type: 'separator' },
                {
                    id: 'add-current-page',
                    label: '添加当前标签页(&A)',
                    onSelect: function () {
                        return addCurrentPageToFolder(node);
                    }
                },
                { type: 'separator' },
                {
                    id: 'new-bookmark',
                    label: '新建书签(&B)',
                    onSelect: function () {
                        return createNewBookmark(node);
                    }
                },
                {
                    id: 'new-folder',
                    label: '新建文件夹(&F)',
                    onSelect: function () {
                        return createNewFolder(node);
                    }
                }
            );
            if (isManualSorting(state.data.sorting)) {
                items.push({
                    id: 'new-separator',
                    label: '新增分隔线(&S)',
                    onSelect: function () {
                        return createSeparator(node);
                    }
                });
            }
            items.push(
                { type: 'separator' },
                {
                    id: 'edit',
                    label: '编辑(&D)',
                    onSelect: function () {
                        return editNode(node, false);
                    }
                },
                {
                    id: 'rename',
                    label: '重命名(&R)',
                    onSelect: function () {
                        return editNode(node, true);
                    }
                }
            );
        } else if (!separator) {
            items.push(
                { type: 'separator' },
                {
                    id: 'edit',
                    label: '编辑(&D)',
                    onSelect: function () {
                        return editNode(node, false);
                    }
                },
                {
                    id: 'rename',
                    label: '重命名(&R)',
                    onSelect: function () {
                        return editNode(node, true);
                    }
                }
            );
        }

        if (!separator || items.length) {
            items.push({ type: 'separator' });
        }
        items.push(
            {
                id: 'cut',
                label: '剪切(&C)',
                onSelect: function () {
                    return writeBookmarkClipboard('cut', node);
                }
            },
            {
                id: 'copy',
                label: '复制(&C)',
                onSelect: function () {
                    return writeBookmarkClipboard('copy', node);
                }
            }
        );
        if (folder) {
            const clipboard = readBookmarkClipboard();
            items.push({
                id: 'paste',
                label: '粘贴(&T)',
                disabled: !canPasteIntoFolder(node, clipboard),
                onSelect: function () {
                    return pasteIntoFolder(node);
                }
            });
        }
        items.push(
            { type: 'separator' },
            {
                id: 'delete',
                label: '删除(&L)',
                onSelect: function () {
                    return confirmDeleteNode(node);
                }
            }
        );
        return items;
    }

    function openBookmarkContextMenu (node, position, restoreFocus) {
        const menu = getMenuApi();
        if (!menu || typeof menu.open !== 'function') {
            notify('自绘菜单 API 尚未加载。', 'error');
            return;
        }
        if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) {
            warn('Invalid bookmark context menu position.', { nodeId: node.id, position });
            return;
        }

        try {
            const preserveCurrent = restoreFocus instanceof HTMLElement
                && Boolean(restoreFocus.closest('#userchrome-menu-root'));
            const session = menu.open({
                position: position,
                restoreFocus: restoreFocus instanceof HTMLElement ? restoreFocus : null,
                preserveCurrent: preserveCurrent,
                className: CONTEXT_MENU_CLASS,
                ariaLabel: getNodeLabel(node, isSeparatorBookmark(node) ? '分隔线' : '书签项目') + '右键菜单',
                items: createBookmarkContextItems(node)
            });
            if (!session) {
                throw new Error('Menu root is unavailable.');
            }
            log('Opened bookmark context menu.', {
                id: node.id,
                kind: isSeparatorBookmark(node) ? 'separator' : (node.url ? 'bookmark' : 'folder')
            });
        } catch (error) {
            reportError('Failed to open bookmark context menu: ' + node.id, error);
            notify('打开书签右键菜单失败，请查看控制台。', 'error');
        }
    }

    function openBookmarkBarContextMenu (folder, position, restoreFocus) {
        const menu = getMenuApi();
        if (!menu || typeof menu.open !== 'function') {
            notify('自绘菜单 API 尚未加载。', 'error');
            return;
        }
        if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) {
            warn('Invalid bookmark bar context menu position.', { folderId: folder.id, position });
            return;
        }

        try {
            const updateMenuInteractionMode = function (event) {
                const keyboardMode = event.type === 'keydown';
                document.querySelectorAll('#userchrome-menu-root .' + BOOKMARK_BAR_CONTEXT_MENU_CLASS).forEach(function (element) {
                    element.classList.remove(BOOKMARK_BAR_CONTEXT_MENU_PENDING_CLASS);
                    if (keyboardMode) {
                        element.classList.remove(BOOKMARK_BAR_CONTEXT_MENU_CLASS);
                    }
                });
                window.removeEventListener('pointermove', updateMenuInteractionMode, true);
                if (keyboardMode) {
                    window.removeEventListener('keydown', updateMenuInteractionMode, true);
                }
            };
            const session = menu.open({
                position: position,
                restoreFocus: restoreFocus instanceof HTMLElement ? restoreFocus : null,
                className: CONTEXT_MENU_CLASS
                    + ' ' + BOOKMARK_BAR_CONTEXT_MENU_CLASS
                    + ' ' + BOOKMARK_BAR_CONTEXT_MENU_PENDING_CLASS,
                ariaLabel: '自绘书签栏空白处右键菜单',
                items: createBookmarkBarContextItems(folder),
                onClose: function () {
                    window.removeEventListener('keydown', updateMenuInteractionMode, true);
                    window.removeEventListener('pointermove', updateMenuInteractionMode, true);
                }
            });
            if (!session) {
                throw new Error('Menu root is unavailable.');
            }
            window.addEventListener('keydown', updateMenuInteractionMode, true);
            window.addEventListener('pointermove', updateMenuInteractionMode, true);
            log('Opened bookmark bar context menu.', { folderId: folder.id });
        } catch (error) {
            reportError('Failed to open bookmark bar context menu: ' + folder.id, error);
            notify('打开书签栏右键菜单失败，请查看控制台。', 'error');
        }
    }

    function getElementContextPosition (element) {
        const rect = element.getBoundingClientRect();
        return {
            x: Math.round(Math.min(rect.right, rect.left + 24)),
            y: Math.round(rect.top + Math.min(rect.height, 24))
        };
    }

    function attachBookmarkContextMenu (element, node) {
        element.addEventListener('contextmenu', function (event) {
            event.preventDefault();
            event.stopPropagation();
            openBookmarkContextMenu(node, {
                x: event.clientX,
                y: event.clientY
            }, element);
        });
        element.addEventListener('keydown', function (event) {
            if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            openBookmarkContextMenu(node, getElementContextPosition(element), element);
        });
    }

    function attachBookmarkBarContextMenu (row) {
        row.addEventListener('contextmenu', function (event) {
            const target = event.target instanceof Element ? event.target : null;
            if (!target || target.closest('.' + BOOKMARK_BAR_CLASSES.item + ', .' + BOOKMARK_BAR_CLASSES.more)) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            const folder = getBookmarkBarFolder();
            if (!folder) {
                notify('未找到书签工具栏文件夹。', 'warn');
                return;
            }
            const restoreFocus = document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
            openBookmarkBarContextMenu(folder, {
                x: event.clientX,
                y: event.clientY
            }, restoreFocus);
        });
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

        if (state.morePopup) {
            try {
                state.morePopup.unregister();
            } catch (error) {
                reportError('Failed to unregister more popup.', error);
            }
            state.morePopup = null;
        }
        state.moreKey = '';
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
            const items = createFolderMenuItems(node);
            const controller = menu.register({
                id: popupId,
                ariaLabel: getNodeLabel(node, '文件夹'),
                className: BOOKMARK_POPUP_CLASS,
                items: items
            });
            if (!controller) {
                warn('Popup registration returned no controller.', { popupId });
                return null;
            }
            decorateBookmarkPopupLevel(controller.element, items, node);
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

    function ensureMorePopup () {
        const menu = getMenuApi();
        const hiddenNodes = state.hiddenNodes.slice();
        if (!menu || typeof menu.register !== 'function' || !hiddenNodes.length) {
            return null;
        }

        const key = hiddenNodes.map(function (node) {
            return node.id;
        }).join(',');
        if (state.morePopup && state.moreKey === key) {
            return state.morePopup;
        }

        if (state.morePopup) {
            try {
                state.morePopup.unregister();
            } catch (error) {
                reportError('Failed to replace more popup.', error);
            }
            state.morePopup = null;
        }

        try {
            const items = createBookmarkMenuItems(hiddenNodes);
            const controller = menu.register({
                id: MORE_POPUP_ID,
                ariaLabel: '更多书签',
                className: BOOKMARK_POPUP_CLASS,
                items: items
            });
            if (!controller) {
                warn('More popup registration returned no controller.');
                return null;
            }
            decorateBookmarkPopupLevel(controller.element, items, null);
            state.morePopup = controller;
            state.moreKey = key;
            log('Registered more popup.', { hiddenCount: hiddenNodes.length });
            return controller;
        } catch (error) {
            reportError('Failed to register more popup.', error);
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
        if (!state.moreButton.hasAttribute('hidden')) {
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

            let nextIndex;
            if (event.key === 'ArrowRight') {
                nextIndex = currentIndex + 1;
            } else if (event.key === 'ArrowLeft') {
                nextIndex = currentIndex - 1;
            } else if (event.key === 'Home') {
                nextIndex = 0;
            } else if (event.key === 'End') {
                nextIndex = visibleButtons.length - 1;
            } else {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            setButtonFocus(nextIndex);
        });
    }

    function attachRowEventBoundary (row) {
        const stopPropagation = function (event) {
            event.stopPropagation();
        };
        ROW_EVENT_BOUNDARY_TYPES.forEach(function (eventType) {
            row.addEventListener(eventType, stopPropagation);
        });
    }

    function clearBookmarkFolderOpenTimer () {
        if (state.drag.folderOpenTimer) {
            clearTimeout(state.drag.folderOpenTimer);
        }
        state.drag.folderOpenTimer = null;
        state.drag.folderOpenId = '';
        state.drag.folderOpenElement = null;
    }

    function clearBookmarkDropTarget () {
        if (state.drag.targetElement) {
            state.drag.targetElement.classList.remove(
                BOOKMARK_BAR_CLASSES.dropBefore,
                BOOKMARK_BAR_CLASSES.dropAfter,
                BOOKMARK_BAR_CLASSES.dropInto
            );
        }
        state.drag.targetId = '';
        state.drag.targetParentId = '';
        state.drag.targetIndex = -1;
        state.drag.targetElement = null;
        state.drag.position = '';
    }

    function clearBookmarkDragState (preserveMoveInFlight) {
        const moveInFlight = Boolean(preserveMoveInFlight && state.drag.moveInFlight);
        clearBookmarkFolderOpenTimer();
        clearBookmarkDropTarget();
        if (state.drag.sourceElement) {
            state.drag.sourceElement.classList.remove(BOOKMARK_BAR_CLASSES.dragging);
        }
        state.drag.sourceType = '';
        state.drag.operation = '';
        state.drag.sourceIds = [];
        state.drag.sourceNodes = [];
        state.drag.sourceDescendantIds = new Set();
        state.drag.sourceElement = null;
        state.drag.moveInFlight = moveInFlight;
    }

    function scheduleBookmarkFolderOpen (element, node, open) {
        if (!isFolderNode(node)
            || state.drag.sourceDescendantIds.has(node.id)
            || !state.drag.sourceType
            || typeof open !== 'function') {
            clearBookmarkFolderOpenTimer();
            return;
        }
        if (state.drag.folderOpenId === node.id && state.drag.folderOpenElement === element) {
            return;
        }

        clearBookmarkFolderOpenTimer();
        state.drag.folderOpenId = node.id;
        state.drag.folderOpenElement = element;
        state.drag.folderOpenTimer = setTimeout(function () {
            state.drag.folderOpenTimer = null;
            if (!state.drag.sourceType
                || state.drag.moveInFlight
                || state.drag.folderOpenId !== node.id
                || state.drag.folderOpenElement !== element
                || !element.isConnected) {
                return;
            }
            open();
        }, FOLDER_DRAG_OPEN_DELAY);
    }

    function getDataTransfer (event) {
        return event && event.dataTransfer ? event.dataTransfer : null;
    }

    function getDataTransferTypes (event) {
        const dataTransfer = getDataTransfer(event);
        return dataTransfer && dataTransfer.types
            ? Array.from(dataTransfer.types)
            : [];
    }

    function parseNativeBookmarkIds (event) {
        const dataTransfer = getDataTransfer(event);
        if (!dataTransfer || !getDataTransferTypes(event).includes(NATIVE_BOOKMARK_MIME)) {
            return [];
        }
        try {
            const value = dataTransfer.getData(NATIVE_BOOKMARK_MIME);
            if (!value) {
                return [];
            }
            const raw = JSON.parse(value);
            const values = Array.isArray(raw) ? raw : raw && Array.isArray(raw.ids) ? raw.ids : [];
            return values.map(function (id) {
                return String(id || '').trim();
            }).filter(function (id, index, ids) {
                return Boolean(id) && ids.indexOf(id) === index;
            });
        } catch (error) {
            reportError('Failed to parse native bookmark drag data.', error);
            return [];
        }
    }

    function normalizeDroppedUrl (value) {
        const url = String(value || '').trim();
        if (!url || /^javascript:/i.test(url)) {
            return '';
        }
        try {
            return new URL(url).href;
        } catch (error) {
            return '';
        }
    }

    function getDroppedHtmlData (dataTransfer) {
        if (!dataTransfer || !getDataTransferTypes({ dataTransfer }).includes('text/html')) {
            return { urls: [], titles: [] };
        }
        const html = dataTransfer.getData('text/html');
        if (!html) {
            return { urls: [], titles: [] };
        }
        const container = new DOMParser().parseFromString(html, 'text/html');
        const urls = [];
        const titles = [];
        container.querySelectorAll('a[href]').forEach(function (anchor) {
            const url = normalizeDroppedUrl(anchor.getAttribute('href') || anchor.href);
            if (!url) {
                return;
            }
            urls.push(url);
            const title = String(anchor.textContent || '').trim();
            titles.push(title);
        });
        return { urls, titles };
    }

    function parseExternalBookmarkData (event) {
        const dataTransfer = getDataTransfer(event);
        if (!dataTransfer) {
            return { urls: [], titles: [] };
        }
        const htmlData = getDroppedHtmlData(dataTransfer);
        const uriList = getDataTransferTypes(event).includes('text/uri-list')
            ? String(dataTransfer.getData('text/uri-list') || '')
                .split(/\r?\n/)
                .map(function (line) {
                    return line.trim();
                })
                .filter(function (line) {
                    return line && !line.startsWith('#');
                })
                .map(normalizeDroppedUrl)
                .filter(Boolean)
            : [];
        const urls = uriList.length ? uriList : htmlData.urls;
        if (!urls.length && getDataTransferTypes(event).includes('text/plain')) {
            const plain = String(dataTransfer.getData('text/plain') || '').trim();
            if (plain && !/\s/.test(plain)) {
                let url = normalizeDroppedUrl(plain);
                if (!url && plain.indexOf('.') > 0 && !plain.endsWith('.')) {
                    url = normalizeDroppedUrl('https://' + plain);
                }
                if (url) {
                    urls.push(url);
                }
            }
        }
        let title = '';
        if (getDataTransferTypes(event).includes('vivaldi/x-title')) {
            title = String(dataTransfer.getData('vivaldi/x-title') || '')
                .split(/\r?\n/)
                .map(function (line) {
                    return line.trim();
                })
                .find(Boolean) || '';
        }
        if (!title) {
            title = htmlData.titles.find(Boolean) || '';
        }
        return {
            urls,
            titles: urls.map(function (url, index) {
                return index === 0 ? title || url : url;
            })
        };
    }

    function getBookmarkDropSourceType (event) {
        const types = getDataTransferTypes(event);
        if (types.includes(NATIVE_BOOKMARK_MIME)) {
            return 'bookmark';
        }
        if (types.includes('text/uri-list')
            || types.includes('text/html')
            || types.includes('text/plain')) {
            return 'url';
        }
        return '';
    }

    function getBookmarkDropOperation (event) {
        const sourceType = getBookmarkDropSourceType(event);
        if (sourceType === 'url') {
            return 'url-create';
        }
        if (sourceType === 'bookmark') {
            return event && (event.ctrlKey || event.metaKey)
                ? 'bookmark-copy'
                : 'bookmark-move';
        }
        return '';
    }

    function prepareBookmarkDropSource (event) {
        const sourceType = getBookmarkDropSourceType(event);
        if (!sourceType) {
            return '';
        }
        if (state.drag.sourceType && state.drag.sourceType !== sourceType) {
            if (state.drag.sourceElement) {
                state.drag.sourceElement.classList.remove(BOOKMARK_BAR_CLASSES.dragging);
            }
            state.drag.sourceIds = [];
            state.drag.sourceNodes = [];
            state.drag.sourceDescendantIds = new Set();
            state.drag.sourceElement = null;
        }
        state.drag.sourceType = sourceType;
        state.drag.operation = getBookmarkDropOperation(event);
        if (sourceType === 'bookmark' && !state.drag.sourceIds.length) {
            const sourceIds = parseNativeBookmarkIds(event);
            if (sourceIds.length) {
                state.drag.sourceIds = sourceIds;
            }
        }
        return sourceType;
    }

    function canDropBookmarkInto (parentId, sourceType) {
        if (state.drag.moveInFlight || !parentId || !sourceType) {
            return false;
        }
        if (sourceType === 'url') {
            return true;
        }
        return !state.drag.sourceDescendantIds.has(String(parentId));
    }

    function setBookmarkDropTarget (element, details, event) {
        const sourceType = prepareBookmarkDropSource(event);
        if (!element
            || !canDropBookmarkInto(details.parentId, sourceType)
            || !Number.isInteger(details.index)
            || details.index < 0) {
            clearBookmarkDropTarget();
            return false;
        }

        if (state.drag.targetElement !== element
            || state.drag.targetParentId !== details.parentId
            || state.drag.targetIndex !== details.index
            || state.drag.position !== details.position) {
            clearBookmarkDropTarget();
            state.drag.targetId = details.targetId || '';
            state.drag.targetParentId = String(details.parentId);
            state.drag.targetIndex = details.index;
            state.drag.targetElement = element;
            state.drag.position = details.position;
            state.drag.operation = getBookmarkDropOperation(event);
            element.classList.add(details.position === 'before'
                ? BOOKMARK_BAR_CLASSES.dropBefore
                : (details.position === 'after'
                    ? BOOKMARK_BAR_CLASSES.dropAfter
                    : BOOKMARK_BAR_CLASSES.dropInto));
        }
        return true;
    }

    function getBookmarkDropPosition (element, node, event, orientation, sourceType) {
        const rect = element.getBoundingClientRect();
        if (isFolderNode(node) && !isManualSorting(state.data.sorting)) {
            return 'inside';
        }
        if (orientation === 'vertical') {
            if (sourceType === 'url' && isFolderNode(node)) {
                return 'inside';
            }
            return event.clientY < rect.top + (rect.height / 2) ? 'before' : 'after';
        }

        const rightToLeft = Boolean(state.row && getComputedStyle(state.row).direction === 'rtl');
        const physicalRatio = (event.clientX - rect.left) / Math.max(rect.width, 1);
        const logicalRatio = rightToLeft ? 1 - physicalRatio : physicalRatio;
        if (isFolderNode(node) && isManualSorting(state.data.sorting)) {
            if (logicalRatio <= 1 / 3) {
                return 'before';
            }
            if (logicalRatio > 2 / 3) {
                return 'after';
            }
            return 'inside';
        }
        return logicalRatio < 0.5 ? 'before' : 'after';
    }

    function updateBookmarkNodeDropTarget (element, node, event, orientation) {
        const sourceType = prepareBookmarkDropSource(event);
        if (!sourceType || (sourceType === 'bookmark' && state.drag.sourceIds.includes(node.id))) {
            clearBookmarkDropTarget();
            return false;
        }

        if (!isFolderNode(node) && !isManualSorting(state.data.sorting)) {
            clearBookmarkDropTarget();
            return false;
        }

        const position = getBookmarkDropPosition(element, node, event, orientation, sourceType);
        const parentId = position === 'inside' ? node.id : node.parentId;
        const index = position === 'inside'
            ? 0
            : node.index + (position === 'after' ? 1 : 0);
        if (!parentId || !Number.isInteger(node.index) || node.index < 0) {
            clearBookmarkDropTarget();
            return false;
        }
        return setBookmarkDropTarget(element, {
            targetId: node.id,
            parentId,
            index,
            position
        }, event);
    }

    function updateBookmarkFolderDropTarget (element, folder, index, event) {
        return Boolean(folder) && setBookmarkDropTarget(element, {
            targetId: folder.id,
            parentId: folder.id,
            index: index,
            position: 'inside'
        }, event);
    }

    async function getBookmarkDragNodes (ids) {
        const nodes = [];
        for (const id of ids) {
            const result = await getBookmarkSubTree(id);
            const node = Array.isArray(result) ? result[0] : result;
            if (node) {
                nodes.push(cloneBookmarkNode(node));
            }
        }
        return nodes.filter(function (node) {
            return !nodes.some(function (candidate) {
                return candidate !== node && getNodeDescendantIds(candidate).has(String(node.id));
            });
        });
    }

    async function copyBookmarksFromDrop (nodes, targetParentId, targetIndex) {
        let index = targetIndex;
        for (const node of nodes) {
            await cloneSnapshotIntoFolder(createClipboardSnapshot(node), targetParentId, index);
            index += 1;
        }
    }

    async function moveBookmarksFromDrop (nodes, targetParentId, targetIndex) {
        const targetResult = await getBookmarkSubTree(targetParentId);
        const targetFolder = Array.isArray(targetResult) ? targetResult[0] : targetResult;
        if (!targetFolder || !Array.isArray(targetFolder.children)) {
            throw new Error('The bookmark drop target folder no longer exists.');
        }

        const sourceIds = nodes.map(function (node) {
            return String(node.id);
        });
        const sourceIdSet = new Set(sourceIds);
        const sourceBeforeTarget = targetFolder.children.filter(function (child) {
            return sourceIdSet.has(String(child.id))
                && Number.isInteger(child.index)
                && child.index < targetIndex;
        }).length;
        const insertionIndex = Math.max(0, Math.min(
            targetFolder.children.length - sourceBeforeTarget,
            targetIndex - sourceBeforeTarget
        ));
        const finalIds = targetFolder.children.map(function (child) {
            return String(child.id);
        }).filter(function (id) {
            return !sourceIdSet.has(id);
        });
        finalIds.splice(insertionIndex, 0, ...sourceIds);

        const currentIds = targetFolder.children.map(function (child) {
            return String(child.id);
        });
        for (let index = 0; index < finalIds.length; index += 1) {
            const id = finalIds[index];
            const currentIndex = currentIds.indexOf(id);
            if (currentIndex === index) {
                continue;
            }
            await moveBookmark(id, {
                parentId: String(targetParentId),
                index
            });
            if (currentIndex !== -1) {
                currentIds.splice(currentIndex, 1);
            }
            currentIds.splice(index, 0, id);
        }
    }

    async function createBookmarksFromDrop (dropData, targetParentId, targetIndex) {
        let index = targetIndex;
        for (let itemIndex = 0; itemIndex < dropData.urls.length; itemIndex += 1) {
            await createBookmark({
                parentId: String(targetParentId),
                index,
                title: dropData.titles[itemIndex] || dropData.urls[itemIndex],
                url: dropData.urls[itemIndex]
            });
            index += 1;
        }
    }

    async function handleBookmarkDrop (event) {
        const sourceType = prepareBookmarkDropSource(event);
        const operation = state.drag.operation;
        const externalDropData = sourceType === 'url'
            ? parseExternalBookmarkData(event)
            : null;
        const nativeBookmarkIds = sourceType === 'bookmark'
            ? parseNativeBookmarkIds(event)
            : [];
        const targetId = state.drag.targetId;
        const targetParentId = state.drag.targetParentId;
        const targetIndex = state.drag.targetIndex;
        const position = state.drag.position;

        if (!sourceType || !targetParentId || !position
            || !Number.isInteger(targetIndex) || targetIndex < 0
            || !canDropBookmarkInto(targetParentId, sourceType)) {
            clearBookmarkDragState(false);
            return;
        }

        state.drag.moveInFlight = true;
        clearBookmarkFolderOpenTimer();
        clearBookmarkDropTarget();
        if (state.drag.sourceElement) {
            state.drag.sourceElement.classList.remove(BOOKMARK_BAR_CLASSES.dragging);
        }

        try {
            if (sourceType === 'url') {
                const dropData = externalDropData;
                if (!dropData.urls.length) {
                    throw new Error('The drop did not contain a valid URL.');
                }
                await createBookmarksFromDrop(dropData, targetParentId, targetIndex);
                notify(dropData.urls.length === 1 ? '已添加书签。' : '已添加多个书签。', 'success');
                log('Created bookmarks from URL drag.', {
                    targetId,
                    targetParentId,
                    targetIndex,
                    urlCount: dropData.urls.length,
                    position
                });
            } else {
                const ids = state.drag.sourceElement && state.drag.sourceIds.length
                    ? state.drag.sourceIds
                    : nativeBookmarkIds;
                if (!ids.length) {
                    throw new Error('The native bookmark drop did not contain bookmark IDs.');
                }
                const nodes = state.drag.sourceNodes.length
                    ? state.drag.sourceNodes
                    : await getBookmarkDragNodes(ids);
                if (!nodes.length) {
                    throw new Error('The dragged bookmark nodes no longer exist.');
                }
                const descendantIds = new Set();
                nodes.forEach(function (node) {
                    getNodeDescendantIds(node).forEach(function (id) {
                        descendantIds.add(id);
                    });
                });
                if (descendantIds.has(String(targetParentId))) {
                    notify('不能将文件夹拖到自身或其子文件夹中。', 'warn');
                    return;
                }
                const copy = operation === 'bookmark-copy';
                if (copy) {
                    await copyBookmarksFromDrop(nodes, targetParentId, targetIndex);
                } else {
                    await moveBookmarksFromDrop(nodes, targetParentId, targetIndex);
                }
                notify(copy ? '已复制书签项目。' : '已移动书签项目。', 'success');
                log(copy ? 'Copied bookmarks from drag.' : 'Moved bookmarks from drag.', {
                    sourceIds: ids,
                    targetId,
                    targetParentId,
                    targetIndex,
                    position
                });
            }
            scheduleRefresh('bookmark drag completed', true);
        } catch (error) {
            reportError('Failed to handle bookmark drag.', error);
            notify('拖拽处理书签失败，请查看控制台。', 'error');
            scheduleRefresh('bookmark drag failed', true);
        } finally {
            clearBookmarkDragState(false);
        }
    }

    function beginBookmarkDrag (element, node, event) {
        if (state.drag.moveInFlight
            || !Number.isInteger(node.index)
            || node.index < 0
            || !node.parentId) {
            event.preventDefault();
            return false;
        }

        clearBookmarkDragState(false);
        state.drag.sourceType = 'bookmark';
        state.drag.operation = 'bookmark-move';
        state.drag.sourceIds = [String(node.id)];
        state.drag.sourceNodes = [cloneBookmarkNode(node)];
        state.drag.sourceDescendantIds = getNodeDescendantIds(node);
        state.drag.sourceElement = element;
        element.classList.add(BOOKMARK_BAR_CLASSES.dragging);

        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'copyMove';
            event.dataTransfer.setData(NATIVE_BOOKMARK_MIME, JSON.stringify([String(node.id)]));
            event.dataTransfer.setData('text/plain', node.url || node.title || '');
        }
        return true;
    }

    function attachBookmarkDragSorting (element, node, options) {
        const enabled = isManualSorting(state.data.sorting);
        const settings = options || {};
        const orientation = settings.orientation === 'vertical' ? 'vertical' : 'horizontal';
        element.draggable = enabled;
        element.dataset.userchromeBookmarkDropTarget = 'true';
        if (settings.openFolder && isFolderNode(node)) {
            // The shared menu opens submenus immediately on pointerenter. During a drag,
            // the delayed opener below owns that transition so users can still sort beside a folder.
            element.addEventListener('pointerenter', function (event) {
                if (state.drag.sourceType) {
                    event.stopImmediatePropagation();
                }
            }, true);
        }

        element.addEventListener('dragstart', function (event) {
            beginBookmarkDrag(element, node, event);
        });

        element.addEventListener('dragover', function (event) {
            if (!updateBookmarkNodeDropTarget(element, node, event, orientation)) {
                if (event.dataTransfer) {
                    event.dataTransfer.dropEffect = 'none';
                }
                clearBookmarkFolderOpenTimer();
                return;
            }
            event.preventDefault();
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = getBookmarkDropOperation(event) !== 'bookmark-move'
                    ? 'copy'
                    : 'move';
            }
            if (settings.openFolder && isFolderNode(node)) {
                scheduleBookmarkFolderOpen(element, node, settings.openFolder);
            } else {
                clearBookmarkFolderOpenTimer();
            }
        });

        element.addEventListener('dragleave', function (event) {
            if (!event.relatedTarget || !element.contains(event.relatedTarget)) {
                if (state.drag.targetElement === element) {
                    clearBookmarkDropTarget();
                }
                if (state.drag.folderOpenElement === element) {
                    clearBookmarkFolderOpenTimer();
                }
            }
        });

        element.addEventListener('drop', function (event) {
            if (!updateBookmarkNodeDropTarget(element, node, event, orientation)) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            void handleBookmarkDrop(event);
        });

        element.addEventListener('dragend', function () {
            clearBookmarkDragState(state.drag.moveInFlight);
        });
    }

    function attachBookmarkBarDropZone (row) {
        function isToolbarBackgroundEvent (event) {
            const target = event.target instanceof Element ? event.target : null;
            return Boolean(target
                && !target.closest('.' + BOOKMARK_BAR_CLASSES.item)
                && !target.closest('.' + BOOKMARK_BAR_CLASSES.more));
        }

        function updateTarget (event) {
            if (!isToolbarBackgroundEvent(event)) {
                return false;
            }
            const folder = getBookmarkBarFolder();
            return Boolean(folder)
                && updateBookmarkFolderDropTarget(row, folder, folder.children.length, event);
        }

        row.addEventListener('dragover', function (event) {
            if (!updateTarget(event)) {
                return;
            }
            event.preventDefault();
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = getBookmarkDropOperation(event) !== 'bookmark-move'
                    ? 'copy'
                    : 'move';
            }
            clearBookmarkFolderOpenTimer();
        });

        row.addEventListener('dragleave', function (event) {
            if (!event.relatedTarget || !row.contains(event.relatedTarget)) {
                if (state.drag.sourceElement) {
                    clearBookmarkDropTarget();
                } else {
                    clearBookmarkDragState(false);
                }
            }
        });

        row.addEventListener('drop', function (event) {
            if (!updateTarget(event)) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            void handleBookmarkDrop(event);
        });
    }

    function createBookmarkButton (node, index) {
        const label = getNodeLabel(node, '未命名文件夹');
        const isFolder = !node.url;
        const displayMode = state.data.displayMode;
        const showIcon = displayMode !== 'text';
        const showTitle = displayMode !== 'icon'
            && (displayMode !== 'iconexceptfolders' || isFolder);
        const button = createElement('button', {
            type: 'button',
            class: BOOKMARK_BAR_CLASSES.item + (isFolder ? ' ' + BOOKMARK_BAR_CLASSES.folder : ''),
            'data-bookmark-id': node.id,
            'data-kind': isFolder ? 'folder' : 'link',
            tabindex: index === 0 ? 0 : -1,
            'aria-label': label,
            title: node.url ? getNodeLabel(node, '未命名书签') + '\n' + node.url : label
        });

        if (showIcon) {
            let icon;
            if (node.url) {
                icon = createElement('img', {
                    class: BOOKMARK_BAR_CLASSES.icon,
                    src: getFaviconUrl(node.url, FAVICON_SIZES[0]),
                    srcset: getFaviconSrcset(node.url),
                    sizes: '16px',
                    width: '16',
                    height: '16',
                    alt: '',
                    draggable: 'false',
                    'aria-hidden': 'true'
                });
            } else {
                // Parse the selected static SVG without adding a wrapper to Vivaldi's toolbar DOM.
                const iconTemplate = createElement('template', { innerHTML: FOLDER_ICON_SVG });
                icon = iconTemplate.content.firstElementChild;
            }
            button.appendChild(icon);
        }

        if (showTitle) {
            if (isFolder && displayMode === 'text') {
                button.appendChild(createElement('span', {
                    class: BOOKMARK_BAR_CLASSES.folderChevron,
                    'aria-hidden': 'true',
                    innerHTML: FOLDER_CHEVRON_SVG
                }));
            }
            button.appendChild(createElement('span', {
                class: BOOKMARK_BAR_CLASSES.title,
                innerText: label
            }));
        }

        if (isFolder) {
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
                if (state.drag.sourceType || state.drag.moveInFlight) {
                    return;
                }
                if (!hasActiveFolderPopup() || state.activePopupController === ensureFolderPopup(node)) {
                    return;
                }
                openFolder(node, button);
            });
        }

        attachBookmarkContextMenu(button, node);
        attachToolbarKeyboardNavigation(button);
        attachBookmarkDragSorting(button, node, {
            openFolder: isFolder
                ? function () {
                    openFolder(node, button);
                }
                : null
        });
        return button;
    }

    function createBookmarkSeparator (node) {
        const button = createElement('button', {
            'data-bookmark-id': node.id,
            'data-id': node.id,
            'data-offset': '0',
            title: node.title,
            tabindex: -1,
            class: BOOKMARK_BAR_CLASSES.item + ' ' + BOOKMARK_BAR_CLASSES.separatorItem
        });
        button.appendChild(createElement('span', { class: BOOKMARK_BAR_CLASSES.separator }));
        button.setAttribute('aria-label', '书签分隔线');
        attachBookmarkContextMenu(button, node);
        attachBookmarkDragSorting(button, node);
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

    async function openBookmarkUrls (urls, mode, sourceNode) {
        const tabsApi = window.chrome && window.chrome.tabs;
        const windowsApi = window.chrome && window.chrome.windows;
        if (!urls.length) {
            notify('此文件夹中没有可打开的网址。', 'info');
            return;
        }

        try {
            if (mode === 'new-window' || mode === 'incognito-window') {
                if (!windowsApi || typeof windowsApi.create !== 'function') {
                    throw new Error('chrome.windows.create is unavailable.');
                }
                await windowsApi.create({
                    url: urls,
                    incognito: mode === 'incognito-window',
                    focused: true
                });
                return;
            }

            if (!tabsApi
                || typeof tabsApi.query !== 'function'
                || typeof tabsApi.update !== 'function'
                || typeof tabsApi.create !== 'function') {
                throw new Error('Required chrome.tabs methods are unavailable.');
            }

            const activeTabs = await tabsApi.query({ active: true, currentWindow: true });
            const activeTab = activeTabs && activeTabs[0];
            let startIndex = 0;
            if (mode === 'current-tab' && activeTab && typeof activeTab.id === 'number') {
                await tabsApi.update(activeTab.id, { url: urls[0], active: true });
                startIndex = 1;
            }

            for (let index = startIndex; index < urls.length; index += 1) {
                const activate = (mode === 'new-tab' || (mode === 'current-tab' && !activeTab))
                    && index === startIndex;
                await createBookmarkTab(activeTab, urls[index], activate);
            }
        } catch (error) {
            reportError('Failed to open bookmark URLs.', {
                error,
                mode,
                nodeId: sourceNode && sourceNode.id,
                urlCount: urls.length
            });
            notify('打开书签失败，请查看控制台。', 'error');
        }
    }

    function openNodeInMode (node, mode) {
        return openBookmarkUrls(collectBookmarkUrls(node), mode, node);
    }

    async function openBookmark (node, event) {
        const inputEvent = event || {};
        const newTabRequested = inputEvent.button === 1
            || inputEvent.ctrlKey === true
            || inputEvent.metaKey === true
            || inputEvent.shiftKey === true;
        const activateNewTab = inputEvent.shiftKey === true;
        let mode;
        if (newTabRequested) {
            mode = activateNewTab ? 'new-tab' : 'new-background-tab';
        } else {
            const openInNewTab = await readPreference(BOOKMARKS_OPEN_IN_NEW_TAB_PREF, false);
            mode = openInNewTab === true ? 'new-tab' : 'current-tab';
        }

        log('Opening bookmark.', { id: node.id, url: node.url, mode });
        await openNodeInMode(node, mode);
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

    function openMoreMenu () {
        const button = state.moreButton;
        const controller = ensureMorePopup();
        if (!button || button.hasAttribute('hidden') || !controller) {
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
                log('More popup closed.', { reason });
            }
        });
        if (!popup) {
            warn('More popup did not open.');
            return;
        }
        state.activePopupController = controller;
        button.setAttribute('aria-expanded', 'true');
        log('More popup opened.', { hiddenCount: state.hiddenNodes.length });
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

    function setMoreButtonHidden (hidden) {
        if (hidden) {
            state.moreButton.setAttribute('hidden', '');
        } else {
            state.moreButton.removeAttribute('hidden');
        }
    }

    function syncMoreButtonVisibility () {
        setMoreButtonHidden(state.hiddenNodes.length === 0);
    }

    function measureMoreButtonWidth () {
        const wasHidden = state.moreButton.hasAttribute('hidden');
        state.moreButton.removeAttribute('hidden');
        const width = state.moreButton.offsetWidth;
        setMoreButtonHidden(wasHidden);
        return width;
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
        } else if (!state.moreButton.hasAttribute('hidden')) {
            state.moreButton.tabIndex = 0;
        }
    }

    function layoutMore () {
        if (!state.row || !state.items || !state.moreButton || !state.row.isConnected) {
            return;
        }

        // Measure with every item visible first, then move only the trailing items into the more menu.
        state.buttons.forEach(function (entry) {
            entry.element.hidden = false;
        });
        state.hiddenNodes = [];
        syncMoreButtonVisibility();

        const allWidth = getItemWidthTotal(state.buttons, state.buttons.length);
        const rowWidth = state.row.clientWidth;
        let visibleCount = state.buttons.length;
        if (allWidth > rowWidth) {
            const availableWidth = Math.max(0, rowWidth - measureMoreButtonWidth() - 2);
            while (visibleCount > 0 && getItemWidthTotal(state.buttons, visibleCount) > availableWidth) {
                visibleCount -= 1;
            }
        }

        state.buttons.forEach(function (entry, index) {
            entry.element.hidden = index >= visibleCount;
        });
        state.hiddenNodes = state.buttons.slice(visibleCount).map(function (entry) {
            return entry.node;
        });
        syncMoreButtonVisibility();

        const nextMoreKey = state.hiddenNodes.map(function (node) {
            return node.id;
        }).join(',');
        if (nextMoreKey !== state.moreKey && state.morePopup) {
            try {
                state.morePopup.unregister();
            } catch (error) {
                reportError('Failed to update more popup.', error);
            }
            state.morePopup = null;
        }
        state.moreKey = nextMoreKey;
        updateRovingTabIndex();
        log('Calculated bookmark layout.', {
            rowWidth,
            visibleCount,
            hiddenCount: state.hiddenNodes.length
        });
    }

    function renderBookmarkBar () {
        if (!ensureMount('render')) {
            return;
        }

        clearBookmarkDragState(state.drag.moveInFlight);
        disposePopupControllers();
        state.row.dataset.display = state.data.displayMode;
        state.items.replaceChildren();
        state.buttons = [];
        state.hiddenNodes = [];
        syncMoreButtonVisibility();

        const topLevel = isManualSorting(state.data.sorting)
            ? state.data.topLevel
            : state.data.topLevel.filter(function (node) {
                return !isSeparatorBookmark(node);
            });
        if (!topLevel.length) {
            const empty = createElement('span', {
                class: BOOKMARK_BAR_CLASSES.empty,
                innerText: '暂无书签'
            });
            state.items.appendChild(empty);
            state.emptyState = empty;
            updateRovingTabIndex();
            requestAnimationFrame(layoutMore);
            log('Rendered an empty bookmark bar.');
            return;
        }

        state.emptyState = null;
        topLevel.forEach(function (node, index) {
            const separator = isSeparatorBookmark(node);
            const element = separator
                ? createBookmarkSeparator(node)
                : createBookmarkButton(node, index);
            state.items.appendChild(element);
            state.buttons.push({ node, element, interactive: !separator });
        });

        updateRovingTabIndex();
        requestAnimationFrame(layoutMore);
        log('Rendered bookmark bar.', {
            itemCount: state.buttons.length,
            displayMode: state.data.displayMode
        });
    }

    function unmount (reason) {
        clearBookmarkDragState(false);
        if (state.hostObserver) {
            state.hostObserver.disconnect();
            state.hostObserver = null;
        }
        if (state.resizeObserver) {
            state.resizeObserver.disconnect();
            state.resizeObserver = null;
        }
        disposePopupControllers();
        if (state.row) {
            state.row.remove();
        }
        if (state.host) {
            state.host.classList.remove(MOUNT_CLASS);
            state.host.classList.remove(NATIVE_VISIBLE_CLASS);
            state.host.style.removeProperty('--userchrome-bookmark-row-height');
        }

        state.host = null;
        state.row = null;
        state.items = null;
        state.moreButton = null;
        state.emptyState = null;
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
        host.style.setProperty('--userchrome-bookmark-row-height', state.settings.rowHeight + 'px');
        row.style.setProperty('--userchrome-bookmark-item-max-width', state.settings.itemMaxWidth + 'px');
        attachRowEventBoundary(row);
        attachBookmarkBarContextMenu(row);
        attachBookmarkBarDropZone(row);
        const items = createElement('div', { class: 'observer' });
        const moreButton = createElement('button', {
            id: MORE_BUTTON_ID,
            type: 'button',
            class: BOOKMARK_BAR_CLASSES.more,
            'aria-label': '更多书签',
            'aria-haspopup': 'menu',
            'aria-expanded': 'false',
            title: '更多书签',
            innerHTML: MORE_ICON_SVG
        });
        moreButton.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            openMoreMenu();
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
        host.classList.toggle(NATIVE_VISIBLE_CLASS, state.settings.nativeVisible);
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
            requestAnimationFrame(layoutMore);
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
                requestAnimationFrame(layoutMore);
            });
            state.resizeObserver.observe(row);
            state.resizeObserver.observe(host);
        } else {
            warn('ResizeObserver is unavailable; more menu will update on render only.');
        }

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

        const storage = window.chrome && window.chrome.storage;
        const storageChanged = storage && storage.onChanged;
        if (storageChanged && typeof storageChanged.addListener === 'function') {
            state.clipboardStorageListener = function (changes, areaName) {
                if (areaName !== 'session' || !changes || !changes[CLIPBOARD_KEY]) {
                    return;
                }
                state.bookmarkClipboard = normalizeBookmarkClipboard(changes[CLIPBOARD_KEY].newValue);
            };
            storageChanged.addListener(state.clipboardStorageListener);
            log('Attached bookmark clipboard storage listener.');

            state.customSettingsStorageListener = function (changes, areaName) {
                if (areaName !== 'local' || !changes || !changes[CUSTOM_SETTINGS_KEY]) {
                    return;
                }
                state.settings = normalizeCustomSettings(changes[CUSTOM_SETTINGS_KEY].newValue);
                applyCustomSettings();
                log('Custom bookmark bar settings changed in another window.');
            };
            storageChanged.addListener(state.customSettingsStorageListener);
        } else {
            warn('chrome.storage.onChanged is unavailable; bookmark clipboard is window-local.');
        }

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

        const bookmarksPrivate = window.vivaldi && window.vivaldi.bookmarksPrivate;
        const metaInfoChanged = bookmarksPrivate && bookmarksPrivate.onMetaInfoChanged;
        if (metaInfoChanged && typeof metaInfoChanged.addListener === 'function') {
            const handler = function (id) {
                if (isRelevantEvent('changed', id)) {
                    scheduleRefresh('bookmark metadata changed');
                }
            };
            metaInfoChanged.addListener(handler);
            state.bookmarkListeners.push({ event: metaInfoChanged, handler });
            log('Attached bookmark metadata event.');
        } else {
            warn('vivaldi.bookmarksPrivate.onMetaInfoChanged is unavailable.');
        }

        const prefs = window.vivaldi && window.vivaldi.prefs;
        if (prefs && prefs.onChanged && typeof prefs.onChanged.addListener === 'function') {
            state.prefListener = function (...args) {
                const first = args[0];
                const path = typeof first === 'string'
                    ? first
                    : first && first.path;
                if (path === BOOKMARKS_FOLDER_PREF
                    || path === BOOKMARKS_DISPLAY_PREF
                    || path === BOOKMARKS_SORTING_PREF
                    || path === BOOKMARKS_OPEN_IN_NEW_TAB_PREF) {
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
        window.addEventListener('dragend', function () {
            clearBookmarkDragState(state.drag.moveInFlight);
        }, true);
        window.addEventListener('resize', function () {
            requestAnimationFrame(layoutMore);
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
        state.settings = await readCustomSettings();
        await loadBookmarkClipboard();
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
