// ==UserScript==
// @name            customBookmarksBar.ac.js
// @name:zh-CN      customBookmarksBar.ac.js
// @description     Add a custom bookmark bar below Vivaldi's native bookmark bar
// @description:zh-CN 在 Vivaldi 原生书签栏下方增加自绘书签栏
// @license         MIT License
// @compatibility   Vivaldi 8.1
// @version         20260724.10
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
    const FOLDER_POPUP_PREFIX = 'userchrome-bookmarks-folder:';
    const MORE_POPUP_ID = 'userchrome-bookmarks-more';
    const MORE_BUTTON_ID = 'userchrome-custom-bookmarks-more';
    const BOOKMARK_POPUP_CLASS = 'userchrome-bookmark-popup-menu';
    const CONTEXT_MENU_CLASS = 'userchrome-bookmark-context-menu';
    const BOOKMARK_BAR_CONTEXT_MENU_CLASS = 'userchrome-bookmark-bar-context-menu';
    const BOOKMARK_BAR_CONTEXT_MENU_PENDING_CLASS = 'userchrome-bookmark-bar-context-menu-pending';
    const DIALOG_ID = 'userchrome-bookmark-dialog';
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
        more: 'userchrome-custom-bookmarks-bar-more'
    });
    const CLIPBOARD_KEY = 'USERCHROME_BOOKMARK_CLIPBOARD';
    const CLIPBOARD_VERSION = 1;
    const REFRESH_DELAY = 120;
    const MOUNT_DELAY = 120;
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
        folderPopups: new Map(),
        morePopup: null,
        activePopupController: null,
        dialog: null,
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
                max-width: 120px;
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
                height: 28px;
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
                height: 28px;
                flex: 0 0 auto;
                background-color: transparent;
                position: relative;
                transition: width 50ms linear 50ms;
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
                font-size: 14px;
                line-height: 1.3;
            }

            #userchrome-menu-root .${CONTEXT_MENU_CLASS} .userchrome-menu-shortcut {
                margin-left: 14px;
                color: inherit;
                font-size: 13px;
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
                margin: 4px 0;
                background: color-mix(in srgb, var(--colorBorder, rgba(0, 0, 0, 0.16)) 78%, transparent);
            }

            #userchrome-menu-root .${CONTEXT_MENU_CLASS} .userchrome-menu-separator[data-contextmenu="true"] {
                margin: 0;
                background: linear-gradient(
                    to bottom,
                    transparent 4px,
                    color-mix(in srgb, var(--colorBorder, rgba(0, 0, 0, 0.16)) 78%, transparent) 4px,
                    color-mix(in srgb, var(--colorBorder, rgba(0, 0, 0, 0.16)) 78%, transparent) 5px,
                    transparent 5px
                );
            }

            #${DIALOG_ID} {
                position: fixed;
                inset: 0;
                z-index: 2147483647;
                width: min(480px, calc(100vw - 32px));
                max-width: 480px;
                padding: 0;
                overflow: hidden;
                border: 1px solid var(--colorBorder, rgba(0, 0, 0, 0.2));
                border-radius: 12px;
                background: var(--colorBg, #fff);
                color: var(--colorFg, #222);
                box-shadow: 0 22px 64px rgba(0, 0, 0, 0.34);
                font: inherit;
            }

            #${DIALOG_ID}::backdrop {
                background: rgba(0, 0, 0, 0.38);
                backdrop-filter: blur(2px);
            }

            #${DIALOG_ID} .userchrome-bookmark-dialog-form {
                display: flex;
                flex-direction: column;
                max-height: min(680px, calc(100vh - 40px));
            }

            #${DIALOG_ID} .userchrome-bookmark-dialog-header {
                padding: 20px 22px 12px;
            }

            #${DIALOG_ID} .userchrome-bookmark-dialog-title {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                line-height: 1.3;
            }

            #${DIALOG_ID} .userchrome-bookmark-dialog-message {
                margin: 8px 0 0;
                color: var(--colorFgFaded, rgba(34, 34, 34, 0.68));
                font-size: 13px;
                line-height: 1.5;
            }

            #${DIALOG_ID} .userchrome-bookmark-dialog-fields {
                display: grid;
                gap: 14px;
                padding: 8px 22px 20px;
                overflow: auto;
            }

            #${DIALOG_ID} .userchrome-bookmark-dialog-field {
                display: grid;
                gap: 6px;
            }

            #${DIALOG_ID} .userchrome-bookmark-dialog-label {
                font-size: 13px;
                font-weight: 500;
            }

            #${DIALOG_ID} :is(input, select) {
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

            #${DIALOG_ID} :is(input, select):focus {
                border-color: var(--colorAccentBg, #006dcc);
                box-shadow: 0 0 0 2px color-mix(in srgb, var(--colorAccentBg, #006dcc) 28%, transparent);
            }

            #${DIALOG_ID} .userchrome-bookmark-dialog-error {
                min-height: 18px;
                margin: -4px 22px 0;
                color: var(--colorErrorBg, #c42b1c);
                font-size: 12px;
                line-height: 1.4;
            }

            #${DIALOG_ID} .userchrome-bookmark-dialog-actions {
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                padding: 14px 22px 18px;
                border-top: 1px solid var(--colorBorder, rgba(0, 0, 0, 0.14));
                background: var(--colorBgAlphaHeavy, var(--colorBg, #fff));
            }

            #${DIALOG_ID} .userchrome-bookmark-dialog-actions button {
                min-width: 78px;
                min-height: 34px;
                padding: 6px 14px;
                border: 1px solid var(--colorBorder, rgba(0, 0, 0, 0.2));
                border-radius: 6px;
                background: var(--colorBgIntense, var(--colorBg, #fff));
                color: var(--colorFg, #222);
                font: inherit;
                cursor: pointer;
            }

            #${DIALOG_ID} .userchrome-bookmark-dialog-actions .primary {
                border-color: var(--colorAccentBg, #006dcc);
                background: var(--colorAccentBg, #006dcc);
                color: var(--colorAccentFg, #fff);
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
        const wrapper = createElement('label', { class: 'userchrome-bookmark-dialog-field' });
        wrapper.appendChild(createElement('span', {
            class: 'userchrome-bookmark-dialog-label',
            innerText: field.label
        }));

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
                value: field.value || '',
                autocomplete: 'off',
                spellcheck: 'false'
            });
            if (field.placeholder) {
                control.placeholder = field.placeholder;
            }
        }
        if (field.required) {
            control.required = true;
        }
        wrapper.appendChild(control);
        return wrapper;
    }

    function ensureDialog () {
        if (state.dialog && state.dialog.isConnected) {
            return state.dialog;
        }
        const existing = document.getElementById(DIALOG_ID);
        if (existing) {
            existing.remove();
        }
        state.dialog = createElement('dialog', { id: DIALOG_ID });
        document.body.appendChild(state.dialog);
        return state.dialog;
    }

    function showDialog (options) {
        const dialog = ensureDialog();
        if (dialog.open) {
            dialog.close('replace');
        }

        return new Promise(function (resolve) {
            const form = createElement('form', {
                class: 'userchrome-bookmark-dialog-form',
                method: 'dialog'
            });
            const header = createElement('header', { class: 'userchrome-bookmark-dialog-header' });
            header.appendChild(createElement('h2', {
                class: 'userchrome-bookmark-dialog-title',
                innerText: options.title
            }));
            if (options.message) {
                header.appendChild(createElement('p', {
                    class: 'userchrome-bookmark-dialog-message',
                    innerText: options.message
                }));
            }
            form.appendChild(header);

            const configuredFields = options.fields || [];
            let error = null;
            if (configuredFields.length) {
                const fields = createElement('div', { class: 'userchrome-bookmark-dialog-fields' });
                configuredFields.forEach(function (field) {
                    fields.appendChild(createDialogField(field));
                });
                form.appendChild(fields);

                error = createElement('div', {
                    class: 'userchrome-bookmark-dialog-error',
                    role: 'alert'
                });
                form.appendChild(error);
            }

            const actions = createElement('footer', { class: 'userchrome-bookmark-dialog-actions' });
            const cancel = createElement('button', {
                type: 'button',
                innerText: '取消'
            });
            const submit = createElement('button', {
                type: 'submit',
                class: 'primary',
                innerText: options.submitLabel || '保存'
            });
            if (options.danger) {
                submit.style.background = 'var(--colorErrorBg, #c42b1c)';
                submit.style.borderColor = 'var(--colorErrorBg, #c42b1c)';
                submit.style.color = 'var(--colorErrorFg, #fff)';
            }
            actions.appendChild(cancel);
            actions.appendChild(submit);
            form.appendChild(actions);
            dialog.replaceChildren(form);

            let settled = false;
            function finish (value) {
                if (settled) {
                    return;
                }
                settled = true;
                dialog.removeEventListener('cancel', onCancel);
                dialog.removeEventListener('close', onClose);
                resolve(value);
            }
            function onCancel (event) {
                event.preventDefault();
                dialog.close('cancel');
            }
            function onClose () {
                finish(null);
            }

            cancel.addEventListener('click', function () {
                dialog.close('cancel');
            });
            dialog.addEventListener('cancel', onCancel);
            dialog.addEventListener('close', onClose);
            form.addEventListener('submit', function (event) {
                event.preventDefault();
                const data = {};
                configuredFields.forEach(function (field) {
                    const control = form.elements.namedItem(field.name);
                    data[field.name] = control ? String(control.value || '').trim() : '';
                });
                const validationMessage = typeof options.validate === 'function'
                    ? options.validate(data)
                    : '';
                if (validationMessage) {
                    if (error) {
                        error.innerText = validationMessage;
                    }
                    return;
                }
                finish(data);
                dialog.close('submit');
            });

            dialog.showModal();
            const firstControl = form.querySelector('input, select, button');
            if (firstControl) {
                requestAnimationFrame(function () {
                    firstControl.focus();
                    if (typeof firstControl.select === 'function') {
                        firstControl.select();
                    }
                });
            }
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
        if (isFolderNode(node)) {
            snapshot.children = node.children.map(createClipboardSnapshot);
        }
        return snapshot;
    }

    function writeBookmarkClipboard (mode, node) {
        const payload = {
            version: CLIPBOARD_VERSION,
            mode: mode,
            sourceId: node.id,
            sourceDescendantIds: Array.from(getNodeDescendantIds(node)),
            snapshot: createClipboardSnapshot(node),
            timestamp: Date.now()
        };
        try {
            localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(payload));
            notify(mode === 'cut' ? '已剪切书签项目。' : '已复制书签项目。', 'success');
        } catch (error) {
            reportError('Failed to write bookmark clipboard.', error);
            notify('无法写入书签剪贴板。', 'error');
        }
    }

    function clearBookmarkClipboard () {
        try {
            localStorage.removeItem(CLIPBOARD_KEY);
        } catch (error) {
            reportError('Failed to clear bookmark clipboard.', error);
        }
    }

    function readBookmarkClipboard () {
        try {
            const raw = localStorage.getItem(CLIPBOARD_KEY);
            if (!raw) {
                return null;
            }
            const payload = JSON.parse(raw);
            if (!payload
                || payload.version !== CLIPBOARD_VERSION
                || !['cut', 'copy'].includes(payload.mode)
                || typeof payload.sourceId !== 'string'
                || !payload.snapshot
                || !Array.isArray(payload.sourceDescendantIds)) {
                clearBookmarkClipboard();
                return null;
            }
            return payload;
        } catch (error) {
            reportError('Failed to read bookmark clipboard.', error);
            clearBookmarkClipboard();
            return null;
        }
    }

    function canPasteIntoFolder (folder, clipboard) {
        if (!folder || folder.url || !clipboard) {
            return false;
        }
        return clipboard.mode !== 'cut'
            || (clipboard.sourceId !== folder.id && !clipboard.sourceDescendantIds.includes(folder.id));
    }

    async function cloneSnapshotIntoFolder (snapshot, parentId) {
        const details = {
            parentId: String(parentId),
            title: String(snapshot.title || '')
        };
        if (snapshot.url) {
            details.url = snapshot.url;
        }
        const created = await createBookmark(details);
        const createdId = created && created.id;
        try {
            if (!snapshot.url && Array.isArray(snapshot.children) && createdId) {
                for (const child of snapshot.children || []) {
                    await cloneSnapshotIntoFolder(child, createdId);
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
                    clearBookmarkClipboard();
                    notify('剪切的书签项目已不存在。', 'warn');
                    return;
                }
                const source = Array.isArray(sourceResult) ? sourceResult[0] : sourceResult;
                if (!source) {
                    clearBookmarkClipboard();
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
                clearBookmarkClipboard();
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
                children: createFolderMenuItems(node),
                onContextMenu: function (selection) {
                    openBookmarkContextMenu(node, selection.position, selection.element);
                }
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
                label: '添加当前标签页',
                shortcut: 'A',
                onSelect: function () {
                    return addCurrentPageToFolder(folder);
                }
            },
            { type: 'separator' },
            {
                id: 'new-bookmark',
                label: '新建书签',
                shortcut: 'N',
                onSelect: function () {
                    return createNewBookmark(folder);
                }
            },
            {
                id: 'new-folder',
                label: '新建文件夹',
                shortcut: 'F',
                onSelect: function () {
                    return createNewFolder(folder);
                }
            }
        ];

        if (isManualSorting(state.data.sorting)) {
            items.push({
                id: 'new-separator',
                label: '新增分隔线',
                shortcut: 'S',
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
                label: '排序',
                shortcut: 'O',
                children: createBookmarkSortMenuItems()
            },
            { type: 'separator' },
            {
                id: 'paste',
                label: '粘贴',
                shortcut: 'P',
                disabled: !canPasteIntoFolder(folder, clipboard),
                onSelect: function () {
                    return pasteIntoFolder(folder);
                }
            }
        );
        return items;
    }

    function createOpenContextItems (node) {
        return [
            {
                id: 'open-new-tab',
                label: '在新标签中打开',
                shortcut: 'O',
                onSelect: function () {
                    return openNodeInMode(node, 'new-tab');
                }
            },
            {
                id: 'open-background-tab',
                label: '在后台标签中打开',
                shortcut: 'I',
                onSelect: function () {
                    return openNodeInMode(node, 'new-background-tab');
                }
            },
            {
                id: 'open-current-tab',
                label: '打开',
                shortcut: 'E',
                onSelect: function () {
                    return openNodeInMode(node, 'current-tab');
                }
            },
            { type: 'separator' },
            {
                id: 'open-new-window',
                label: '在新窗口中打开',
                shortcut: 'N',
                onSelect: function () {
                    return openNodeInMode(node, 'new-window');
                }
            },
            {
                id: 'open-incognito-window',
                label: '在新建隐身窗口中打开',
                shortcut: 'P',
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
                    label: '添加当前标签页',
                    shortcut: 'A',
                    onSelect: function () {
                        return addCurrentPageToFolder(node);
                    }
                },
                { type: 'separator' },
                {
                    id: 'new-bookmark',
                    label: '新建书签',
                    shortcut: 'B',
                    onSelect: function () {
                        return createNewBookmark(node);
                    }
                },
                {
                    id: 'new-folder',
                    label: '新建文件夹',
                    shortcut: 'F',
                    onSelect: function () {
                        return createNewFolder(node);
                    }
                }
            );
            if (isManualSorting(state.data.sorting)) {
                items.push({
                    id: 'new-separator',
                    label: '新增分隔线',
                    shortcut: 'S',
                    onSelect: function () {
                        return createSeparator(node);
                    }
                });
            }
            items.push(
                { type: 'separator' },
                {
                    id: 'edit',
                    label: '编辑',
                    shortcut: 'D',
                    onSelect: function () {
                        return editNode(node, false);
                    }
                },
                {
                    id: 'rename',
                    label: '重命名',
                    shortcut: 'R',
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
                    label: '编辑',
                    shortcut: 'D',
                    onSelect: function () {
                        return editNode(node, false);
                    }
                },
                {
                    id: 'rename',
                    label: '重命名',
                    shortcut: 'R',
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
                label: '剪切',
                shortcut: 'C',
                onSelect: function () {
                    writeBookmarkClipboard('cut', node);
                }
            },
            {
                id: 'copy',
                label: '复制',
                shortcut: 'C',
                onSelect: function () {
                    writeBookmarkClipboard('copy', node);
                }
            }
        );
        if (folder) {
            const clipboard = readBookmarkClipboard();
            items.push({
                id: 'paste',
                label: '粘贴',
                shortcut: 'T',
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
                label: '删除',
                shortcut: 'L',
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
            const controller = menu.register({
                id: popupId,
                ariaLabel: getNodeLabel(node, '文件夹'),
                className: BOOKMARK_POPUP_CLASS,
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
            const controller = menu.register({
                id: MORE_POPUP_ID,
                ariaLabel: '更多书签',
                className: BOOKMARK_POPUP_CLASS,
                items: createBookmarkMenuItems(hiddenNodes)
            });
            if (!controller) {
                warn('More popup registration returned no controller.');
                return null;
            }
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
                if (!hasActiveFolderPopup() || state.activePopupController === ensureFolderPopup(node)) {
                    return;
                }
                openFolder(node, button);
            });
        }

        attachBookmarkContextMenu(button, node);
        attachToolbarKeyboardNavigation(button);
        return button;
    }

    function createBookmarkSeparator (node) {
        const button = createElement('button', {
            'data-id': node.id,
            'data-offset': '0',
            title: node.title,
            tabindex: -1,
            class: BOOKMARK_BAR_CLASSES.item + ' ' + BOOKMARK_BAR_CLASSES.separatorItem,
            draggable: 'true'
        });
        button.appendChild(createElement('span', { class: BOOKMARK_BAR_CLASSES.separator }));
        button.setAttribute('aria-label', '书签分隔线');
        attachBookmarkContextMenu(button, node);
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
        const requestedMode = newTabRequested
            ? (activateNewTab ? 'new-active-tab' : 'new-background-tab')
            : 'current-tab';
        const mode = requestedMode === 'new-active-tab' ? 'new-tab' : requestedMode;

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
        }

        state.host = null;
        state.row = null;
        state.items = null;
        state.moreButton = null;
        state.emptyState = null;
        state.buttons = [];
        state.hiddenNodes = [];
        if (state.dialog && state.dialog.open) {
            state.dialog.close('bookmarks-unmount');
        }
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
        attachRowEventBoundary(row);
        attachBookmarkBarContextMenu(row);
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
                    || path === BOOKMARKS_SORTING_PREF) {
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
