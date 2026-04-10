// ==UserScript==
// @name            modsManager.ac.js
// @description     Vivaldi Mod 管理器，统一管理 CSS / JS 的启用状态
// @license         MIT License
// @compatibility   Vivaldi 6
// @version         20260410
// @charset         UTF-8
// @homepageURL     https://github.com/benzBrake/VivaldiMods/tree/main/chrome/userChromeJS
// ==/UserScript==
(() => {
    const BUTTON_CLASS = 'mods-manager-toggle';
    const PANEL_ID = 'userchrome-mods-manager';
    const STYLE_ID = 'userchrome-mods-manager-style';
    const TOOLBAR_SELECTOR = '#panels-container #switch .toolbar';
    const MODS_CHANGED_EVENT = 'userChrome.mods.changed';

    const state = {
        mounted: false,
        ensuringButton: false,
        dialog: null,
        list: null,
        status: null,
        resetButton: null
    };

    function getManagerApi() {
        return window.userChrome_js;
    }

    function ensureStyle() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            #${PANEL_ID} {
                position: fixed;
                top: 72px;
                left: 64px;
                z-index: 9999;
                width: min(420px, calc(100vw - 96px));
                max-height: calc(100vh - 112px);
                display: none;
                flex-direction: column;
                color: var(--colorFg, #222);
                background: var(--colorBg, #fff);
                border: 1px solid var(--colorBorder, rgba(0, 0, 0, 0.14));
                border-radius: 12px;
                box-shadow: 0 18px 48px rgba(0, 0, 0, 0.2);
                overflow: hidden;
            }

            #${PANEL_ID}.is-open {
                display: flex;
            }

            #${PANEL_ID} .mods-manager-header {
                padding: 14px 16px 12px;
                border-bottom: 1px solid var(--colorBorder, rgba(0, 0, 0, 0.1));
                background: var(--colorBgLightIntense, rgba(0, 0, 0, 0.03));
            }

            #${PANEL_ID} .mods-manager-title {
                margin: 0;
                font-size: 15px;
                font-weight: 600;
            }

            #${PANEL_ID} .mods-manager-subtitle,
            #${PANEL_ID} .mods-manager-status {
                margin: 4px 0 0;
                font-size: 12px;
                line-height: 1.45;
                color: var(--colorFgFaded, rgba(34, 34, 34, 0.72));
            }

            #${PANEL_ID} .mods-manager-status[data-tone='warn'] {
                color: #9a6700;
            }

            #${PANEL_ID} .mods-manager-body {
                overflow: auto;
                padding: 8px 0;
            }

            #${PANEL_ID} .mods-manager-empty {
                padding: 28px 16px;
                font-size: 13px;
                color: var(--colorFgFaded, rgba(34, 34, 34, 0.72));
                text-align: center;
            }

            #${PANEL_ID} .mods-manager-item {
                display: grid;
                grid-template-columns: 1fr auto;
                gap: 12px;
                align-items: center;
                padding: 12px 16px;
            }

            #${PANEL_ID} .mods-manager-item + .mods-manager-item {
                border-top: 1px solid var(--colorBorder, rgba(0, 0, 0, 0.08));
            }

            #${PANEL_ID} .mods-manager-main {
                min-width: 0;
            }

            #${PANEL_ID} .mods-manager-name {
                display: flex;
                align-items: center;
                gap: 8px;
                margin: 0;
                font-size: 13px;
                font-weight: 600;
                line-height: 1.4;
            }

            #${PANEL_ID} .mods-manager-path {
                margin: 4px 0 0;
                font-size: 12px;
                line-height: 1.45;
                color: var(--colorFgFaded, rgba(34, 34, 34, 0.72));
                word-break: break-all;
            }

            #${PANEL_ID} .mods-manager-note {
                margin: 6px 0 0;
                font-size: 12px;
                line-height: 1.45;
                color: var(--colorFgFaded, rgba(34, 34, 34, 0.72));
            }

            #${PANEL_ID} .mods-manager-tag {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 34px;
                height: 20px;
                padding: 0 8px;
                border-radius: 999px;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.04em;
                color: #fff;
            }

            #${PANEL_ID} .mods-manager-tag[data-type='css'] {
                background: #0f766e;
            }

            #${PANEL_ID} .mods-manager-tag[data-type='js'] {
                background: #8a4b08;
            }

            #${PANEL_ID} .mods-manager-switch {
                position: relative;
                width: 42px;
                height: 24px;
                border: none;
                border-radius: 999px;
                padding: 0;
                background: rgba(0, 0, 0, 0.18);
                cursor: pointer;
                transition: background-color 120ms ease;
            }

            #${PANEL_ID} .mods-manager-switch::after {
                content: '';
                position: absolute;
                top: 3px;
                left: 3px;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: #fff;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.28);
                transition: transform 120ms ease;
            }

            #${PANEL_ID} .mods-manager-switch[aria-checked='true'] {
                background: #2e7d32;
            }

            #${PANEL_ID} .mods-manager-switch[aria-checked='true']::after {
                transform: translateX(18px);
            }

            #${PANEL_ID} .mods-manager-footer {
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                padding: 12px 16px 16px;
                border-top: 1px solid var(--colorBorder, rgba(0, 0, 0, 0.1));
                background: var(--colorBgLightIntense, rgba(0, 0, 0, 0.03));
            }

            #${PANEL_ID} .mods-manager-action {
                min-width: 88px;
                min-height: 30px;
                padding: 0 12px;
                border: 1px solid var(--colorBorder, rgba(0, 0, 0, 0.14));
                border-radius: 8px;
                background: var(--colorBg, #fff);
                color: inherit;
                cursor: pointer;
            }

            #${PANEL_ID} .mods-manager-action:hover {
                background: var(--colorBgLightIntense, rgba(0, 0, 0, 0.06));
            }
        `;
        document.head.appendChild(style);
    }

    function createDialog() {
        if (state.dialog && state.dialog.isConnected) {
            return state.dialog;
        }

        ensureStyle();

        const dialog = userChrome_js.createElement('section', {
            id: PANEL_ID,
            class: 'panel-clickoutside-ignore',
            role: 'dialog',
            'aria-label': 'Vivaldi Mod 管理器'
        });

        dialog.innerHTML = `
            <div class="mods-manager-header">
                <h2 class="mods-manager-title">Mod 管理器</h2>
                <p class="mods-manager-subtitle">统一管理当前窗口可见的 Vivaldi UI Mods。CSS 立即生效，JS 需要重启 Vivaldi。</p>
                <p class="mods-manager-status" data-role="status"></p>
            </div>
            <div class="mods-manager-body" data-role="list"></div>
            <div class="mods-manager-footer">
                <button class="mods-manager-action" type="button" data-role="reset">恢复默认</button>
                <button class="mods-manager-action" type="button" data-role="close">关闭</button>
            </div>
        `;

        dialog.addEventListener('click', function (event) {
            if (!(event.target instanceof HTMLElement)) {
                return;
            }

            if (event.target.matches('[data-role="close"]')) {
                closeDialog();
                return;
            }

            if (event.target.matches('[data-role="reset"]')) {
                handleReset();
            }
        });

        dialog.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                closeDialog();
            }
        });

        document.body.appendChild(dialog);
        state.dialog = dialog;
        state.list = dialog.querySelector('[data-role="list"]');
        state.status = dialog.querySelector('[data-role="status"]');
        state.resetButton = dialog.querySelector('[data-role="reset"]');
        return dialog;
    }

    function setStatus(message, tone) {
        if (!state.status) {
            return;
        }
        state.status.textContent = message || '';
        if (tone) {
            state.status.dataset.tone = tone;
        } else {
            delete state.status.dataset.tone;
        }
    }

    function getVisibleMods() {
        const api = getManagerApi();
        if (!api || typeof api.getMods !== 'function') {
            return [];
        }

        return api.getMods().filter(function (mod) {
            return !mod.internal;
        });
    }

    function getStatusSummary(mods) {
        const cssCount = mods.filter(function (mod) {
            return mod.type === 'css';
        }).length;
        const jsCount = mods.length - cssCount;
        return '当前共 ' + mods.length + ' 个可管理 Mod，其中 CSS ' + cssCount + ' 个，JS ' + jsCount + ' 个。';
    }

    function createToggle(mod) {
        const toggle = userChrome_js.createElement('button', {
            class: 'mods-manager-switch',
            type: 'button',
            role: 'switch',
            'aria-checked': String(mod.enabled),
            'aria-label': (mod.enabled ? '禁用 ' : '启用 ') + mod.name,
            onclick: function () {
                handleToggle(mod.id, !mod.enabled, toggle);
            }
        });
        return toggle;
    }

    function renderList() {
        createDialog();
        const mods = getVisibleMods();
        if (!state.list) {
            return;
        }

        state.list.innerHTML = '';
        if (!mods.length) {
            state.list.innerHTML = '<div class="mods-manager-empty">当前没有可管理的 Mod。</div>';
            setStatus('没有检测到可显示的 Mod。');
            return;
        }

        const fragment = document.createDocumentFragment();
        mods.forEach(function (mod) {
            const item = userChrome_js.createElement('div', {
                class: 'mods-manager-item',
                'data-id': mod.id
            });

            const main = userChrome_js.createElement('div', {
                class: 'mods-manager-main'
            });

            const title = userChrome_js.createElement('p', {
                class: 'mods-manager-name'
            });

            const tag = userChrome_js.createElement('span', {
                class: 'mods-manager-tag',
                'data-type': mod.type,
                innerText: mod.type.toUpperCase()
            });

            const name = userChrome_js.createElement('span', {
                innerText: mod.name
            });

            title.appendChild(tag);
            title.appendChild(name);
            main.appendChild(title);
            main.appendChild(userChrome_js.createElement('p', {
                class: 'mods-manager-path',
                innerText: mod.relativePath
            }));

            if (mod.type === 'js') {
                main.appendChild(userChrome_js.createElement('p', {
                    class: 'mods-manager-note',
                    innerText: 'JS 变更会在下次启动 Vivaldi 后生效。'
                }));
            }

            item.appendChild(main);
            item.appendChild(createToggle(mod));
            fragment.appendChild(item);
        });

        state.list.appendChild(fragment);
        setStatus(getStatusSummary(mods));
    }

    async function handleToggle(id, enabled, toggle) {
        const api = getManagerApi();
        if (!api || typeof api.setModEnabled !== 'function') {
            setStatus('当前无法访问 Mod 管理接口。', 'warn');
            return;
        }

        if (toggle) {
            toggle.disabled = true;
        }

        try {
            const result = await api.setModEnabled(id, enabled);
            if (!result) {
                setStatus('没有找到对应的 Mod。', 'warn');
                return;
            }

            renderList();

            if (result.type === 'css') {
                setStatus((result.enabled ? '已启用 ' : '已禁用 ') + id + '，当前窗口已立即更新。');
            } else {
                setStatus((result.enabled ? '已启用 ' : '已禁用 ') + id + '，重启 Vivaldi 后生效。', 'warn');
            }

            if (!result.persisted) {
                setStatus('状态已在当前会话更新，但保存失败，重启后可能恢复默认。', 'warn');
            }
        } catch (error) {
            console.warn('[modsManager] Failed to toggle mod.', error);
            setStatus('切换 Mod 失败，请查看控制台日志。', 'warn');
        } finally {
            if (toggle) {
                toggle.disabled = false;
            }
        }
    }

    async function handleReset() {
        const api = getManagerApi();
        if (!api || typeof api.resetModState !== 'function') {
            setStatus('当前无法重置 Mod 状态。', 'warn');
            return;
        }

        if (state.resetButton) {
            state.resetButton.disabled = true;
        }

        try {
            const result = await api.resetModState();
            renderList();
            if (result && result.restartRequired) {
                setStatus('已恢复默认。CSS 已立即恢复，JS 需要重启 Vivaldi 才会重新注入。', 'warn');
            } else {
                setStatus('已恢复默认，当前窗口中的 CSS 也已同步恢复。');
            }
        } catch (error) {
            console.warn('[modsManager] Failed to reset mod state.', error);
            setStatus('恢复默认失败，请查看控制台日志。', 'warn');
        } finally {
            if (state.resetButton) {
                state.resetButton.disabled = false;
            }
        }
    }

    function openDialog() {
        const dialog = createDialog();
        renderList();
        dialog.classList.add('is-open');
    }

    function closeDialog() {
        if (!state.dialog) {
            return;
        }
        state.dialog.classList.remove('is-open');
    }

    function toggleDialog() {
        const dialog = createDialog();
        if (dialog.classList.contains('is-open')) {
            closeDialog();
        } else {
            openDialog();
        }
    }

    function createToolbarButton() {
        const wrapper = userChrome_js.createElement('div', {
            class: 'button-toolbar panel-clickoutside-ignore ' + BUTTON_CLASS
        });

        const button = userChrome_js.createElement('button', {
            name: 'ModsManager',
            title: '管理 Vivaldi Mods',
            type: 'button',
            'aria-label': '管理 Vivaldi Mods',
            tabindex: -1,
            onclick: function (event) {
                event.preventDefault();
                event.stopPropagation();
                toggleDialog();
            },
            innerHTML: `<span class="button-icon override"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor" style="width:16px;height:16px"><path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3H3V5zm0 6h8v10H5a2 2 0 0 1-2-2V11zm10 0h8v8a2 2 0 0 1-2 2h-6V11zm2 2v2h4v-2h-4zm0 4v2h4v-2h-4z"></path></svg></span>`
        });

        wrapper.appendChild(button);
        return wrapper;
    }

    function ensureToolbarButton() {
        if (state.ensuringButton) {
            return true;
        }

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

        state.ensuringButton = true;
        try {
            toolbar.insertBefore(createToolbarButton(), toolbar.lastChild || null);
        } finally {
            state.ensuringButton = false;
        }
        return true;
    }

    function observeToolbar() {
        if (state.mounted) {
            return;
        }

        state.mounted = true;
        setTimeout(function wait() {
            if (!ensureToolbarButton()) {
                setTimeout(wait, 300);
            }
        }, 300);

        const observer = new MutationObserver(function () {
            ensureToolbarButton();
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        window.addEventListener(MODS_CHANGED_EVENT, function () {
            if (state.dialog && state.dialog.classList.contains('is-open')) {
                renderList();
            }
        });

        document.addEventListener('click', function (event) {
            if (!state.dialog || !state.dialog.classList.contains('is-open')) {
                return;
            }

            const target = event.target;
            if (!(target instanceof Node)) {
                return;
            }

            const button = document.querySelector('.' + BUTTON_CLASS);
            if (state.dialog.contains(target) || (button && button.contains(target))) {
                return;
            }

            closeDialog();
        }, true);
    }

    observeToolbar();
})();
