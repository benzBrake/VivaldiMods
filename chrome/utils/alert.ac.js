// ==UserScript==
// @name            VAlert
// @description     Vivaldi UI 全局非阻塞通知 API
// @license         MIT License
// @compatibility   Vivaldi 8.1
// @version         0.3.0
// @charset         UTF-8
// ==/UserScript==
(() => {
    if (window.VAlert && typeof window.VAlert.show === 'function') {
        return;
    }

    const ALERT_STYLE_ID = 'userchrome-alert-style';
    const ALERT_CONTAINER_ID = 'userchrome-alert-container';
    const ALERT_POSITION_LEFT_CLASS = 'userchrome-alert-position-left';
    const ALERT_POSITION_RIGHT_CLASS = 'userchrome-alert-position-right';
    const ALERT_DEFAULT_DURATION = 3000;
    const ALERT_TYPES = ['info', 'success', 'warn', 'error'];
    let alertContainer = null;
    let alertMountTimer = null;
    let alertQueue = [];
    let alertCounter = 0;
    const activeAlertsByKey = new Map();
    let alertPositionObserver = null;
    let alertPositionRefreshPending = false;
    let alertPositionResizeListening = false;
    const alertPositionTargets = new WeakSet();

    function sanitizeOptions(message, options) {
        const normalizedMessage = typeof message === 'string' ? message.trim() : String(message || '').trim();
        const settings = options && typeof options === 'object' ? options : {};
        const type = ALERT_TYPES.includes(settings.type) ? settings.type : 'info';
        const duration = Number.isFinite(settings.duration) ? Math.max(0, settings.duration) : ALERT_DEFAULT_DURATION;
        return {
            message: normalizedMessage,
            title: typeof settings.title === 'string' ? settings.title.trim() : '',
            type: type,
            duration: duration,
            closable: settings.closable !== false,
            onClick: typeof settings.onClick === 'function' ? settings.onClick : null,
            dedupeKey: getAlertDedupeKey(settings.id) || getAlertDedupeKey(settings.messageId)
        };
    }

    function getAlertDedupeKey(value) {
        if (typeof value === 'string') {
            const normalized = value.trim();
            return normalized ? normalized : null;
        }

        return typeof value === 'number' && Number.isFinite(value) ? String(value) : null;
    }

    function createElement(tag, attrs) {
        const element = document.createElement(tag);
        Object.keys(attrs || {}).forEach(function (attr) {
            switch (attr) {
                case 'innerText':
                case 'innerHTML':
                    element[attr] = attrs[attr];
                    break;
                case 'style':
                    if (attrs[attr] && typeof attrs[attr] === 'object') {
                        Object.keys(attrs[attr]).forEach(function (property) {
                            element.style.setProperty(property, attrs[attr][property]);
                        });
                    }
                    break;
                default:
                    if (attr.startsWith('on') && typeof attrs[attr] === 'function') {
                        element.addEventListener(attr.substring(2), attrs[attr]);
                    } else {
                        element.setAttribute(attr, attrs[attr]);
                    }
            }
        });
        return element;
    }

    function getAlertHost() {
        return document.getElementById('webview-container') || document.body || document.documentElement;
    }

    function ensureAlertHostPosition(host) {
        if (!host || host.id !== 'webview-container' || getComputedStyle(host).position !== 'static') {
            return;
        }

        host.style.position = 'relative';
    }

    function getTabBarSide() {
        const browser = document.getElementById('browser');
        const tabBar = document.getElementById('tabs-tabbar-container');
        const wrapper = tabBar && tabBar.closest('.auto-hide-wrapper');

        if ((tabBar && tabBar.classList.contains('left'))
            || (wrapper && wrapper.classList.contains('left'))
            || (browser && browser.classList.contains('tabs-left'))) {
            return 'left';
        }

        if ((tabBar && tabBar.classList.contains('right'))
            || (wrapper && wrapper.classList.contains('right'))
            || (browser && browser.classList.contains('tabs-right'))) {
            return 'right';
        }

        return null;
    }

    function updateAlertPosition() {
        if (!alertContainer) {
            return;
        }

        const alertSide = getTabBarSide() === 'right' ? 'left' : 'right';
        alertContainer.classList.remove(ALERT_POSITION_LEFT_CLASS, ALERT_POSITION_RIGHT_CLASS);
        alertContainer.classList.add(alertSide === 'left'
            ? ALERT_POSITION_LEFT_CLASS
            : ALERT_POSITION_RIGHT_CLASS);
    }

    function observeAlertPositionTarget(target) {
        if (!target || !alertPositionObserver || alertPositionTargets.has(target)) {
            return;
        }

        alertPositionTargets.add(target);
        alertPositionObserver.observe(target, {
            attributes: true,
            attributeFilter: ['class']
        });
    }

    function refreshAlertPosition() {
        const host = getAlertHost();
        const tabBar = document.getElementById('tabs-tabbar-container');

        if (alertContainer && alertContainer.isConnected && host && alertContainer.parentElement !== host) {
            ensureAlertHostPosition(host);
            host.appendChild(alertContainer);
            alertContainer.dataset.host = host.id === 'webview-container' ? 'webview' : 'document';
        }

        observeAlertPositionTarget(document.getElementById('browser'));
        observeAlertPositionTarget(tabBar);
        observeAlertPositionTarget(tabBar && tabBar.closest('.auto-hide-wrapper'));
        updateAlertPosition();
    }

    function scheduleAlertPositionRefresh() {
        if (alertPositionRefreshPending) {
            return;
        }

        alertPositionRefreshPending = true;
        requestAnimationFrame(function () {
            alertPositionRefreshPending = false;
            refreshAlertPosition();
        });
    }

    function ensureAlertPositioning() {
        if (!alertPositionObserver && typeof MutationObserver === 'function') {
            alertPositionObserver = new MutationObserver(scheduleAlertPositionRefresh);
            if (document.documentElement) {
                alertPositionObserver.observe(document.documentElement, {
                    childList: true,
                    subtree: true
                });
            }
        }

        if (!alertPositionResizeListening) {
            alertPositionResizeListening = true;
            window.addEventListener('resize', updateAlertPosition, { passive: true });
        }

        refreshAlertPosition();
    }

    function ensureAlertStyle() {
        if (document.getElementById(ALERT_STYLE_ID)) {
            return true;
        }

        if (!document.head) {
            return false;
        }

        const style = document.createElement('style');
        style.id = ALERT_STYLE_ID;
        style.textContent = `
            #${ALERT_CONTAINER_ID} {
                position: fixed;
                right: 20px;
                bottom: 20px;
                z-index: 2147483647;
                display: flex;
                flex-direction: column;
                align-items: stretch;
                gap: 10px;
                width: min(360px, calc(100vw - 32px));
                pointer-events: none;
            }

            #${ALERT_CONTAINER_ID}[data-host='webview'] {
                position: absolute;
            }

            #${ALERT_CONTAINER_ID}.${ALERT_POSITION_LEFT_CLASS} {
                right: auto;
                left: 20px;
            }

            #${ALERT_CONTAINER_ID}.${ALERT_POSITION_RIGHT_CLASS} {
                right: 20px;
                left: auto;
            }

            #${ALERT_CONTAINER_ID} .userchrome-alert {
                position: relative;
                display: flex;
                flex-direction: column;
                gap: 6px;
                padding: 12px 40px 12px 14px;
                border: 1px solid var(--colorBorder, rgba(0, 0, 0, 0.16));
                border-radius: 12px;
                background: var(--colorBg, rgba(255, 255, 255, 0.96));
                color: var(--colorFg, #222);
                box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2);
                backdrop-filter: blur(10px);
                opacity: 0;
                transform: translateY(8px);
                transition: opacity 160ms ease, transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
                pointer-events: auto;
            }

            #${ALERT_CONTAINER_ID} .userchrome-alert.is-visible {
                opacity: 1;
                transform: translateY(0);
            }

            #${ALERT_CONTAINER_ID} .userchrome-alert.is-closing {
                opacity: 0;
                transform: translateY(10px);
            }

            #${ALERT_CONTAINER_ID} .userchrome-alert[data-type='info'] {
                border-left: 4px solid #2563eb;
            }

            #${ALERT_CONTAINER_ID} .userchrome-alert[data-type='success'] {
                border-left: 4px solid #2e7d32;
            }

            #${ALERT_CONTAINER_ID} .userchrome-alert[data-type='warn'] {
                border-left: 4px solid #b26a00;
            }

            #${ALERT_CONTAINER_ID} .userchrome-alert[data-type='error'] {
                border-left: 4px solid #c62828;
            }

            #${ALERT_CONTAINER_ID} .userchrome-alert.is-clickable {
                cursor: pointer;
            }

            #${ALERT_CONTAINER_ID} .userchrome-alert.is-clickable:hover,
            #${ALERT_CONTAINER_ID} .userchrome-alert.is-clickable:focus-visible {
                border-color: var(--colorHighlightBg, rgba(37, 99, 235, 0.4));
                box-shadow: 0 18px 44px rgba(0, 0, 0, 0.24);
                outline: none;
            }

            #${ALERT_CONTAINER_ID} .userchrome-alert-title {
                margin: 0;
                font-size: 13px;
                font-weight: 700;
                line-height: 1.35;
            }

            #${ALERT_CONTAINER_ID} .userchrome-alert-message {
                margin: 0;
                font-size: 12px;
                line-height: 1.5;
                word-break: break-word;
            }

            #${ALERT_CONTAINER_ID} .userchrome-alert-close {
                position: absolute;
                top: 8px;
                right: 8px;
                width: 24px;
                height: 24px;
                padding: 0;
                border: none;
                border-radius: 999px;
                background: transparent;
                color: inherit;
                font-size: 16px;
                line-height: 1;
                cursor: pointer;
                opacity: 0.72;
            }

            #${ALERT_CONTAINER_ID} .userchrome-alert-close:hover,
            #${ALERT_CONTAINER_ID} .userchrome-alert-close:focus-visible {
                background: rgba(0, 0, 0, 0.08);
                opacity: 1;
                outline: none;
            }
        `;
        document.head.appendChild(style);
        return true;
    }

    function ensureAlertContainer() {
        if (alertContainer && alertContainer.isConnected) {
            const host = getAlertHost();
            if (host && alertContainer.parentElement !== host) {
                ensureAlertHostPosition(host);
                host.appendChild(alertContainer);
                alertContainer.dataset.host = host.id === 'webview-container' ? 'webview' : 'document';
            }
            updateAlertPosition();
            return alertContainer;
        }

        const host = getAlertHost();
        if (!ensureAlertStyle() || !host) {
            return null;
        }

        ensureAlertHostPosition(host);

        alertContainer = document.getElementById(ALERT_CONTAINER_ID);
        if (!alertContainer) {
            alertContainer = document.createElement('section');
            alertContainer.id = ALERT_CONTAINER_ID;
            alertContainer.setAttribute('aria-live', 'polite');
            alertContainer.setAttribute('aria-atomic', 'false');
        }

        if (alertContainer.parentElement !== host) {
            host.appendChild(alertContainer);
        }

        alertContainer.dataset.host = host.id === 'webview-container' ? 'webview' : 'document';
        ensureAlertPositioning();
        return alertContainer;
    }

    function scheduleAlertFlush() {
        if (alertMountTimer) {
            return;
        }

        alertMountTimer = setTimeout(function () {
            alertMountTimer = null;
            flushAlertQueue();
        }, 120);
    }

    function flushAlertQueue() {
        const container = ensureAlertContainer();
        if (!container) {
            if (alertQueue.length) {
                scheduleAlertFlush();
            }
            return;
        }

        while (alertQueue.length) {
            const notification = alertQueue.shift();
            if (!notification || notification.closed) {
                continue;
            }

            container.appendChild(notification.element);
            requestAnimationFrame(function () {
                notification.element.classList.add('is-visible');
            });
        }
    }

    function closeAlert(notification) {
        if (!notification || notification.closed) {
            return;
        }

        notification.closed = true;
        if (notification.dedupeKey && activeAlertsByKey.get(notification.dedupeKey) === notification) {
            activeAlertsByKey.delete(notification.dedupeKey);
        }

        if (notification.timerId !== null) {
            clearTimeout(notification.timerId);
            notification.timerId = null;
        }

        alertQueue = alertQueue.filter(function (queued) {
            return queued !== notification;
        });

        const teardown = function () {
            if (notification.element && notification.element.parentNode) {
                notification.element.parentNode.removeChild(notification.element);
            }
        };

        if (!notification.element || !notification.element.isConnected) {
            teardown();
            return;
        }

        notification.element.classList.remove('is-visible');
        notification.element.classList.add('is-closing');
        setTimeout(teardown, 180);
    }

    function updateAlertElement(notification) {
        const element = notification.element;
        const visible = element.classList.contains('is-visible');
        element.className = 'userchrome-alert';
        element.dataset.type = notification.type;
        element.setAttribute('role', notification.onClick ? 'button' : 'status');

        if (visible) {
            element.classList.add('is-visible');
        }

        if (notification.onClick) {
            element.classList.add('is-clickable');
            element.tabIndex = 0;
        } else {
            element.removeAttribute('tabindex');
        }

        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }

        if (notification.title) {
            element.appendChild(createElement('p', {
                class: 'userchrome-alert-title',
                innerText: notification.title
            }));
        }

        element.appendChild(createElement('p', {
            class: 'userchrome-alert-message',
            innerText: notification.message
        }));

        if (notification.closable) {
            element.appendChild(createElement('button', {
                class: 'userchrome-alert-close',
                type: 'button',
                'aria-label': '关闭通知',
                innerText: '×',
                onclick: function (event) {
                    event.stopPropagation();
                    closeAlert(notification);
                }
            }));
        }
    }

    function createAlertElement(notification) {
        const element = document.createElement('article');
        notification.element = element;

        const triggerClick = function (event) {
            if (!notification.onClick) {
                return;
            }

            try {
                notification.onClick(event, notification);
            } catch (error) {
                console.error('[VAlert] Alert onClick failed.', error);
            }
            closeAlert(notification);
        };

        element.addEventListener('click', function (event) {
            if (event.target && event.target.closest('.userchrome-alert-close')) {
                return;
            }
            triggerClick(event);
        });

        element.addEventListener('keydown', function (event) {
            if (!notification.onClick || (event.key !== 'Enter' && event.key !== ' ')) {
                return;
            }
            event.preventDefault();
            triggerClick(event);
        });

        updateAlertElement(notification);
        return element;
    }

    function resetAlertTimer(notification) {
        if (notification.timerId !== null) {
            clearTimeout(notification.timerId);
            notification.timerId = null;
        }

        if (notification.duration > 0) {
            notification.timerId = setTimeout(function () {
                closeAlert(notification);
            }, notification.duration);
        }
    }

    function updateAlert(notification, settings) {
        notification.title = settings.title;
        notification.message = settings.message;
        notification.type = settings.type;
        notification.duration = settings.duration;
        notification.closable = settings.closable;
        notification.onClick = settings.onClick;
        updateAlertElement(notification);
        resetAlertTimer(notification);
        return notification;
    }

    function show(message, options) {
        const settings = sanitizeOptions(message, options);
        if (!settings.message) {
            return null;
        }

        const existing = settings.dedupeKey && activeAlertsByKey.get(settings.dedupeKey);
        if (existing && !existing.closed) {
            return updateAlert(existing, settings);
        }

        if (settings.dedupeKey) {
            activeAlertsByKey.delete(settings.dedupeKey);
        }

        const notification = {
            id: ++alertCounter,
            dedupeKey: settings.dedupeKey,
            title: settings.title,
            message: settings.message,
            type: settings.type,
            duration: settings.duration,
            closable: settings.closable,
            onClick: settings.onClick,
            timerId: null,
            closed: false,
            element: null
        };

        notification.close = function () {
            closeAlert(notification);
        };

        notification.element = createAlertElement(notification);
        if (notification.dedupeKey) {
            activeAlertsByKey.set(notification.dedupeKey, notification);
        }
        alertQueue.push(notification);
        flushAlertQueue();

        if (!notification.element.isConnected) {
            scheduleAlertFlush();
        }

        resetAlertTimer(notification);

        return notification;
    }

    window.VAlert = Object.freeze({ show: show });
})();
