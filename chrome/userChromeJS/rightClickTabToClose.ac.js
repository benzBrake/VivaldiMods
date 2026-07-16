// ==UserScript==
// @name            rightClickTabToClose.uc.js
// @description     右键关闭标签页
// @license         MIT License
// @compatibility   Vivaldi 8
// @version         20260715.2
// @charset         UTF-8
// @homepageURL     https://github.com/benzBrake/VivaldiMods/tree/main/chrome/userChromeJS
// @note            20241023 跟随 userChrome.js 更新
// @note            20240309 支持关闭标签分组，修复不兼容关闭最后一个标签页不关闭窗口
// @note            20260715 使用 Vivaldi 原生中键关闭逻辑，兼容最后一个标签页
// ==/UserScript==
(function () {
    function dispatchMiddleClick(target, sourceEvent) {
        const eventOptions = {
            bubbles: true,
            cancelable: true,
            composed: true,
            view: window,
            button: 1,
            buttons: 4,
            clientX: sourceEvent.clientX,
            clientY: sourceEvent.clientY,
            screenX: sourceEvent.screenX,
            screenY: sourceEvent.screenY
        };

        target.dispatchEvent(new MouseEvent('mousedown', eventOptions));
        target.dispatchEvent(new MouseEvent('mouseup', eventOptions));
        target.dispatchEvent(new MouseEvent('auxclick', eventOptions));
    }

    function closeTab (event) {
        if (
            event.shiftKey ||
            event.ctrlKey
        ) return;
        const tab = $(event.target).closest('[role="tab"]');
        if (!tab.length) {
            return;
        }
        event.stopPropagation();
        event.preventDefault();
        dispatchMiddleClick(event.target, event);
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
