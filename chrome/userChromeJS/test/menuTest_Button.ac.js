// ==UserScript==
// @name            menuTest_Button.ac.js
// @description     侧边栏 Popupset 菜单测试按钮，覆盖注册菜单、级联子菜单、锚定/坐标定位与状态重注册
// @license         MIT License
// @compatibility   Vivaldi 8.1
// @version         20260722
// @charset         UTF-8
// @homepageURL     https://github.com/benzBrake/VivaldiMods/tree/main/chrome/userChromeJS
// ==/UserScript==
(() => {
    const BUTTON_CLASS = 'userchrome-menu-test-toggle';
    const POPUP_ID = 'userchrome-menu-test-popup';
    const TOOLBAR_SELECTOR = '#panels-container #switch .toolbar';

    const state = {
        compactMode: false,
        ensureTimer: null,
        lastCloseReason: '尚未关闭',
        previousCloseReason: '尚未关闭',
        openSource: '未知',
        popupController: null
    };

    function notify(message, type) {
        if (window.userChrome_js && typeof window.userChrome_js.alert === 'function') {
            window.userChrome_js.alert(message, { type: type || 'info' });
        }
    }

    function getMenuApi() {
        return window.userChrome_js && window.userChrome_js.menu;
    }

    function createItems() {
        return [
            {
                id: 'notice',
                label: '显示测试通知',
                shortcut: 'Enter',
                onSelect: function () {
                    notify(state.openSource + '菜单项已触发。', 'success');
                }
            },
            {
                id: 'compact-mode',
                type: 'checkbox',
                label: '紧凑模式示例',
                checked: state.compactMode,
                shortcut: 'Ctrl+M',
                onSelect: function (selection) {
                    state.compactMode = selection.checked;
                    registerMenu();
                    notify('紧凑模式示例已' + (state.compactMode ? '启用。' : '关闭。'));
                }
            },
            { type: 'separator' },
            {
                id: 'first-level',
                label: '一级子菜单',
                children: [
                    {
                        id: 'first-level-notice',
                        label: '触发一级菜单项',
                        onSelect: function () {
                            notify('一级子菜单项已触发。', 'success');
                        }
                    },
                    {
                        id: 'second-level',
                        label: '二级子菜单',
                        children: [
                            {
                                id: 'second-level-notice',
                                label: '触发二级菜单项',
                                onSelect: function () {
                                    notify('二级子菜单项已触发。', 'success');
                                }
                            },
                            {
                                id: 'second-level-disabled',
                                label: '禁用的二级菜单项',
                                disabled: true
                            }
                        ]
                    },
                    { type: 'separator' },
                    {
                        id: 'first-level-disabled',
                        label: '禁用的一级菜单项',
                        disabled: true
                    }
                ]
            },
            {
                id: 'popup-status',
                label: '检查常驻 Popup 节点',
                onSelect: function () {
                    const menu = getMenuApi();
                    const popup = menu && typeof menu.getPopup === 'function'
                        ? menu.getPopup(POPUP_ID)
                        : null;
                    notify(
                        popup && popup.isConnected ? '常驻 Popup 节点存在。' : '未找到常驻 Popup 节点。',
                        popup && popup.isConnected ? 'success' : 'error'
                    );
                }
            },
            {
                id: 'close-reason',
                label: '显示上次关闭原因',
                onSelect: function () {
                    notify('上次关闭原因：' + state.previousCloseReason);
                }
            },
            {
                id: 'reregister',
                label: '重新注册测试菜单',
                onSelect: function () {
                    if (registerMenu()) {
                        notify('测试菜单已重新注册。', 'success');
                    }
                }
            },
            { type: 'separator' },
            {
                id: 'disabled',
                label: '禁用菜单项示例',
                disabled: true,
                shortcut: 'Ctrl+D'
            }
        ];
    }

    function registerMenu() {
        const menu = getMenuApi();
        if (!menu || typeof menu.register !== 'function') {
            notify('Popupset 菜单 API 尚未加载。', 'error');
            return false;
        }

        try {
            const controller = menu.register({
                id: POPUP_ID,
                ariaLabel: 'Popupset 菜单测试',
                items: createItems()
            });
            if (!controller) {
                throw new Error('Menu root is unavailable.');
            }
            state.popupController = controller;
            return true;
        } catch (error) {
            console.error('[menuTest_Button] Failed to register popup.', error);
            notify('注册 Popupset 测试菜单失败，请查看控制台。', 'error');
            return false;
        }
    }

    function openMenu(options, button, useController) {
        const menu = getMenuApi();
        if (!menu || typeof menu.openPopup !== 'function' || typeof menu.getPopup !== 'function') {
            notify('Popupset 菜单 API 尚未加载。', 'error');
            return;
        }

        if (!state.popupController || menu.getPopup(POPUP_ID) !== state.popupController.element) {
            if (!registerMenu()) {
                return;
            }
        }

        state.openSource = options.source;
        const openOptions = {
            restoreFocus: button,
            onClose: function (reason) {
                state.previousCloseReason = state.lastCloseReason;
                state.lastCloseReason = reason;
                if (button && button.isConnected) {
                    button.setAttribute('aria-expanded', 'false');
                    button.title = '测试 Popupset 菜单（左键锚定，右键坐标）；上次关闭：' + reason;
                }
            }
        };
        if (options.anchor) {
            openOptions.anchor = options.anchor;
        } else {
            openOptions.position = options.position;
        }

        try {
            const session = useController
                ? state.popupController.open(openOptions)
                : menu.openPopup(POPUP_ID, openOptions);
            if (!session) {
                throw new Error('Menu root is unavailable.');
            }
            if (button) {
                button.setAttribute('aria-expanded', 'true');
            }
        } catch (error) {
            console.error('[menuTest_Button] Failed to open menu.', error);
            if (button) {
                button.setAttribute('aria-expanded', 'false');
            }
            notify('打开 Popupset 测试菜单失败，请查看控制台。', 'error');
        }
    }

    function createToolbarButton() {
        const wrapper = userChrome_js.createElement('div', {
            class: 'button-toolbar panel-clickoutside-ignore ' + BUTTON_CLASS
        });
        const button = userChrome_js.createElement('button', {
            name: 'MenuTest',
            title: '测试 Popupset 菜单（左键锚定，右键坐标）',
            type: 'button',
            'aria-label': '测试 Popupset 菜单',
            'aria-haspopup': 'menu',
            'aria-expanded': 'false',
            tabindex: -1,
            innerHTML: '<span class="button-icon override"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" style="width:16px;height:16px"><path d="M5 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm7 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm7 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm7 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm7 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm7 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm7 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"></path></svg></span>'
        });

        button.addEventListener('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            openMenu({
                anchor: button,
                source: '控制器锚定'
            }, button, true);
        });

        button.addEventListener('contextmenu', function (event) {
            event.preventDefault();
            event.stopPropagation();
            openMenu({
                position: { x: event.clientX, y: event.clientY },
                source: 'API 坐标'
            }, button, false);
        });

        wrapper.appendChild(button);
        return wrapper;
    }

    function ensureToolbarButton() {
        const toolbar = document.querySelector(TOOLBAR_SELECTOR);
        if (!toolbar) {
            return false;
        }

        const buttons = toolbar.querySelectorAll('.' + BUTTON_CLASS);
        if (buttons.length) {
            buttons.forEach(function (button, index) {
                if (index > 0) {
                    button.remove();
                }
            });
            return true;
        }

        toolbar.insertBefore(createToolbarButton(), toolbar.lastChild || null);
        return true;
    }

    function scheduleEnsure() {
        if (state.ensureTimer) {
            return;
        }
        state.ensureTimer = setTimeout(function () {
            state.ensureTimer = null;
            ensureToolbarButton();
        }, 100);
    }

    function mount() {
        registerMenu();

        function waitForToolbar() {
            if (!ensureToolbarButton()) {
                setTimeout(waitForToolbar, 300);
            }
        }

        setTimeout(waitForToolbar, 300);
        userChrome_js.observeAddedNodes(function (element) {
            if (element.matches(TOOLBAR_SELECTOR) || element.querySelector(TOOLBAR_SELECTOR)) {
                scheduleEnsure();
            }
        });
    }

    mount();
})();
