// ==UserScript==
// @name            menuTest_Button.ac.js
// @description     侧边栏 Popupset 菜单测试按钮，覆盖注册菜单、助记键、级联子菜单、VAlert 通知、锚定/坐标定位、菜单项右键与状态重注册
// @license         MIT License
// @compatibility   Vivaldi 8.1
// @version         20260812.2
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
        popupController: null,
        alertDedupeRevision: 0,
        persistentActionCount: 0
    };

    function notify(message, type) {
        if (window.VAlert && typeof window.VAlert.show === 'function') {
            window.VAlert.show(message, { type: type || 'info' });
        }
    }

    function getMenuApi() {
        return window.userChrome_js && window.userChrome_js.menu;
    }

    function openContextTestMenu(selection, sourceLabel) {
        const menu = getMenuApi();
        if (!menu || typeof menu.open !== 'function') {
            notify('动态菜单 API 尚未加载。', 'error');
            return;
        }

        try {
            const session = menu.open({
                position: selection.position,
                restoreFocus: selection.element,
                preserveCurrent: true,
                className: 'userchrome-menu-test-popup',
                ariaLabel: sourceLabel + '右键测试菜单',
                items: [
                    {
                        id: 'return-to-popup',
                        label: '关闭并返回原 Popupset',
                        onSelect: function () {
                            notify(sourceLabel + '右键菜单已关闭，原 Popupset 应保持打开。', 'success');
                        }
                    }
                ]
            });
            if (!session) {
                notify('右键测试菜单打开失败。', 'error');
            }
        } catch (error) {
            console.error('[menuTest_Button] Failed to open context test menu.', error);
            notify('右键测试菜单打开失败，请查看控制台。', 'error');
        }
    }

    function verifyMnemonicLabels() {
        const menu = getMenuApi();
        const popup = menu && typeof menu.getPopup === 'function'
            ? menu.getPopup(POPUP_ID)
            : null;
        const english = popup && popup.querySelector('.userchrome-menu-item[label="Save As"]');
        const chinese = popup && popup.querySelector('.userchrome-menu-item[label="另存为"]');
        const literalAmpersand = popup && popup.querySelector('.userchrome-menu-item[label="Literal & Ampersand"]');
        const englishLabel = english && english.querySelector('.userchrome-menu-label');
        const chineseLabel = chinese && chinese.querySelector('.userchrome-menu-label');
        const literalAmpersandLabel = literalAmpersand
            && literalAmpersand.querySelector('.userchrome-menu-label');
        const englishAccessKey = english && english.querySelector('.userchrome-menu-accesskey');
        const chineseAccessKey = chinese && chinese.querySelector('.userchrome-menu-accesskey');
        const valid = Boolean(
            english
            && chinese
            && literalAmpersand
            && englishLabel
            && chineseLabel
            && literalAmpersandLabel
            && englishAccessKey
            && chineseAccessKey
            && english.getAttribute('label') === 'Save As'
            && chinese.getAttribute('label') === '另存为'
            && englishLabel.textContent === 'Save As'
            && chineseLabel.textContent === '另存为(S)'
            && literalAmpersandLabel.textContent === 'Literal & Ampersand(L)'
            && englishAccessKey.textContent === 'S'
            && chineseAccessKey.textContent === 'S'
            && !popup.querySelector('[labe]')
        );
        notify(
            valid ? '助记键标签属性与显示文本均正确。' : '助记键标签验证失败，请检查 Popupset DOM。',
            valid ? 'success' : 'error'
        );
    }

    function getAlertApi() {
        return window.VAlert && typeof window.VAlert.show === 'function'
            ? window.VAlert
            : null;
    }

    function showAlertTest(message, options) {
        const alert = getAlertApi();
        if (!alert) {
            console.error('[menuTest_Button] VAlert API is unavailable.');
            return null;
        }

        return alert.show(message, options);
    }

    function createVAlertTestItems() {
        return [
            {
                id: 'valert-info',
                label: '普通信息通知',
                onSelect: function () {
                    showAlertTest('这是一条普通信息通知。', {
                        title: 'VAlert 测试',
                        type: 'info'
                    });
                }
            },
            {
                id: 'valert-types',
                label: '四种通知类型',
                onSelect: function () {
                    ['info', 'success', 'warn', 'error'].forEach(function (type) {
                        showAlertTest(type + ' 类型通知。', {
                            title: 'VAlert ' + type,
                            type: type,
                            duration: 5000
                        });
                    });
                }
            },
            { type: 'separator' },
            {
                id: 'valert-button',
                label: '默认关闭操作按钮',
                onSelect: function () {
                    showAlertTest('点击“确认”后，当前通知应关闭。', {
                        title: '单操作按钮',
                        duration: 0,
                        buttons: [{
                            text: '确认',
                            action: function () {
                                notify('VAlert 操作按钮回调已执行。', 'success');
                            }
                        }]
                    });
                }
            },
            {
                id: 'valert-multiple-buttons',
                label: '多操作按钮与保留通知',
                onSelect: function () {
                    state.persistentActionCount = 0;
                    showAlertTest('点击“保持显示”后通知不应关闭。', {
                        title: '多操作按钮',
                        duration: 0,
                        buttons: [
                            {
                                text: '保持显示',
                                close: false,
                                variant: 'default',
                                action: function () {
                                    state.persistentActionCount += 1;
                                    notify('保持显示操作已执行 ' + state.persistentActionCount + ' 次。', 'success');
                                }
                            },
                            {
                                text: '关闭通知',
                                variant: 'danger',
                                action: function () {
                                    notify('关闭操作已执行。', 'success');
                                }
                            }
                        ]
                    });
                }
            },
            {
                id: 'valert-button-colors',
                label: '操作按钮颜色',
                onSelect: function () {
                    showAlertTest('按钮应紧凑右对齐，并分别显示不同颜色。', {
                        title: '颜色变体测试',
                        duration: 0,
                        buttons: [
                            { text: '默认', close: false, variant: 'default', action: function () {} },
                            { text: '主要', close: false, variant: 'primary', action: function () {} },
                            { text: '成功', close: false, variant: 'success', action: function () {} },
                            { text: '警告', close: false, variant: 'warning', action: function () {} },
                            { text: '危险', close: false, variant: 'danger', action: function () {} }
                        ]
                    });
                }
            },
            {
                id: 'valert-card-click',
                label: '整卡点击与按钮隔离',
                onSelect: function () {
                    showAlertTest('点击卡片正文或“按钮操作”，两者应仅触发各自回调。', {
                        title: '点击事件测试',
                        duration: 0,
                        onClick: function () {
                            notify('整卡 onClick 已执行。', 'success');
                        },
                        buttons: [{
                            text: '按钮操作',
                            action: function () {
                                notify('按钮 action 已执行，整卡 onClick 不应执行。', 'success');
                            }
                        }]
                    });
                }
            },
            { type: 'separator' },
            {
                id: 'valert-button-compatibility',
                label: '兼容单个 button',
                onSelect: function () {
                    showAlertTest('此按钮由兼容的 button 选项创建。', {
                        title: 'button 兼容测试',
                        duration: 0,
                        button: {
                            text: '执行',
                            action: function () {
                                notify('兼容 button 回调已执行。', 'success');
                            }
                        }
                    });
                }
            },
            {
                id: 'valert-undo-compatibility',
                label: '兼容 undo / undoText',
                onSelect: function () {
                    showAlertTest('此按钮由兼容的 undo / undoText 选项创建。', {
                        title: '撤销兼容测试',
                        duration: 0,
                        undoText: '撤销测试',
                        undo: function () {
                            notify('兼容 undo 回调已执行。', 'success');
                        }
                    });
                }
            },
            {
                id: 'valert-dedupe',
                label: '重复 ID 更新通知',
                onSelect: function () {
                    state.alertDedupeRevision += 1;
                    showAlertTest('第 ' + state.alertDedupeRevision + ' 次调用会更新同一条通知。', {
                        id: 'userchrome-menu-test-dedupe',
                        title: '去重更新测试',
                        type: state.alertDedupeRevision % 2 ? 'info' : 'success',
                        duration: 0,
                        buttons: [{
                            text: '显示版本号',
                            action: function () {
                                notify('当前去重通知版本：' + state.alertDedupeRevision + '。', 'success');
                            }
                        }]
                    });
                }
            },
            {
                id: 'valert-invalid-buttons',
                label: '过滤无效按钮',
                onSelect: function () {
                    showAlertTest('应只显示一个“有效按钮”。', {
                        title: '按钮校验测试',
                        duration: 0,
                        buttons: [
                            { text: '', action: function () {} },
                            { text: '缺少回调' },
                            { text: '有效按钮', action: function () { notify('有效按钮已执行。', 'success'); } }
                        ]
                    });
                }
            }
        ];
    }

    function createItems() {
        return [
            {
                id: 'notice',
                label: '显示测试通知',
                shortcut: 'Enter',
                onSelect: function () {
                    notify(state.openSource + '菜单项已触发。', 'success');
                },
                onContextMenu: function (selection) {
                    openContextTestMenu(selection, '普通菜单项');
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
            {
                id: 'save-as-english',
                label: '&Save As',
                onSelect: function () {
                    notify('英文助记键菜单项已触发。', 'success');
                }
            },
            {
                id: 'save-as-chinese',
                label: '另存为(&S)',
                onSelect: function () {
                    notify('中文助记键菜单项已触发。', 'success');
                }
            },
            {
                id: 'literal-ampersand',
                label: 'Literal && Ampersand(&L)',
                onSelect: function () {
                    notify('双与号转义菜单项已触发。', 'success');
                }
            },
            {
                id: 'mnemonic-submenu',
                label: '助记键子菜单(&M)',
                children: [
                    {
                        id: 'mnemonic-submenu-action',
                        label: '执行子菜单命令(&R)',
                        onSelect: function () {
                            notify('助记键子菜单项已触发。', 'success');
                        }
                    }
                ]
            },
            {
                id: 'valert-tests',
                label: 'VAlert 通知测试',
                children: createVAlertTestItems()
            },
            {
                id: 'verify-mnemonic-labels',
                label: '检查助记键标签(&V)',
                onSelect: verifyMnemonicLabels
            },
            {
                id: 'context-separator',
                type: 'separator',
                onContextMenu: function (selection) {
                    openContextTestMenu(selection, '分隔项');
                }
            },
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
                className: 'userchrome-menu-test-popup',
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
