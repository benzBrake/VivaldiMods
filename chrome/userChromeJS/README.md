# 文件说明

| 文件名                      | 作用                                       |
| --------------------------- | ------------------------------------------ |
| activateTabOnHover.ac.js    | 自动激活鼠标指向标签页（兼容 Vivaldi 8 垂直标签栏） |
| chromeDevtools_Button.ac.js | 侧边栏 DevTools 按钮：优先连 `localhost:9222` 远程调试端口自动打开 `window.html` 的 DevTools，不可用时回退 `vivaldi://inspect` |
| global-media-controls.ac.js | 侧边栏增加一个全局播放控制面板             |
| modsManager.ac.js           | 侧边栏增加一个统一管理 CSS / JS Mods 的按钮与浮层 |
| rightClickOpenClipboard.ac.js | 右键普通或堆叠新增标签按钮，访问 URL 或用默认搜索引擎搜索剪贴板内容 |
| rightClickTabToClose.ac.js  | 右击时模拟中键关闭标签页，复用 Vivaldi 原生的新标签页和标签堆叠逻辑 |
| Toggle_Bookmarksbar.ac.js   | 双击地址栏显示/隐藏书签栏（兼容 Vivaldi 8.1 的动态地址栏） |
| undoCloseTab_Button.ac.js   | 在标签栏右侧工具栏增加撤销关闭标签页按钮，适配新版标签栏容器与异步重建 |

`rightClickOpenClipboard.ac.js` 面向 Vivaldi 8.1 的 `.button-toolbar.newtab` DOM 结构，使用 `paste` 事件读取剪贴板，并依赖 `chrome.tabs`、`vivaldi.searchEngines` 及标签 `vivExtData` 创建和导航标签页。脚本会保留当前工作区；从标签堆叠区域新增时还会继承当前堆叠归属。

## userChrome.js 公共 API

本目录下的脚本默认运行在 `chrome/userChrome.js` 提供的 UC Loader 环境中，可直接复用以下公共 API。

### `window.$(selector, context?)`

轻量 DOM 查询辅助函数，返回类 jQuery 风格包装对象。

- 支持 `each()`、`find()`、`closest()`、`hasClass()`、`addClass()`、`removeClass()`、`toggleClass()`
- 支持 `on()`、`off()`、`trigger()`、`get()`
- 适合当前仓库里针对 Vivaldi UI DOM 的选择、委托和快捷操作

示例：

```js
$('#tabs-container .tab-strip').on('contextmenu', '[role="tab"]', closeTab);
```

委托事件解绑时，需传入注册时相同的事件名、选择器和处理函数引用：

```js
const closeTab = function (event) {
    // ...
};
const tabStrip = $('#tabs-container .tab-strip');

tabStrip.on('contextmenu', '[role="tab"]', closeTab);
tabStrip.off('contextmenu', '[role="tab"]', closeTab);
```

### `window.userChrome_js.observeAddedNodes(callback)`

监听 Vivaldi UI 中新增的元素。内部使用一个共享的 `MutationObserver`，不会改写浏览器的 DOM 原型。

- `callback(element, mutationRecord)`：每个新增元素在插入 DOM 后调用一次
- 返回取消监听的函数；不再需要监听时可调用它释放观察器

示例：

```js
const stopObserving = userChrome_js.observeAddedNodes((element) => {
    if (element.matches('.tab-header')) {
        element.addEventListener('mouseover', onHover);
    }
});

// stopObserving();
```

### `window.userChrome_js.alert(message, options?)`

在浏览器右下角显示非阻塞通知。

- `message`: 通知正文
- `options.type`: `info | success | warn | error`
- `options.duration`: 停留毫秒数，默认 `3000`；传 `0` 时保持显示直到手动关闭
- `options.title`: 可选标题
- `options.closable`: 是否显示关闭按钮，默认 `true`
- `options.onClick`: 点击整条通知时触发，触发后自动关闭当前通知

示例：

```js
userChrome_js.alert('设置已保存');

userChrome_js.alert('需要重启 Vivaldi 后生效', {
    type: 'warn',
    duration: 5000
});

userChrome_js.alert('点击打开 Mod 管理器', {
    title: '提示',
    onClick(event, notification) {
        console.log(notification.id);
    }
});
```

### `window.userChrome_js.menu.open(options)`

打开单层自绘菜单。组件使用标准 DOM 与 WAI-ARIA 语义实现，交互模型参考 Firefox 的菜单行为，但不依赖 Firefox 的 XUL `menu`、`menuitem` 或 `menupopup` 标签，因此可直接用于 Vivaldi 内置界面。

- 必须提供且只能提供一个定位方式：`anchor: HTMLElement`（触发元素下方）或 `position: { x, y }`（鼠标客户端坐标）
- `items` 至少包含一个非分隔项，支持普通项 `{ id, label, disabled?, shortcut?, onSelect }`、勾选项 `{ id, type: 'checkbox', label, checked, disabled?, shortcut?, onSelect }` 和分隔项 `{ type: 'separator' }`
- 可选 `ariaLabel`、`restoreFocus`、`onClose(reason)`；返回值提供 `close(reason?)`
- 选中菜单项时会先关闭菜单并归还焦点，再执行 `onSelect`；勾选项回调参数中的 `checked` 是切换后的值，`previousChecked` 是原值；`shortcut` 仅用于展示
- 支持在 `window` 捕获阶段检测菜单外的指针或鼠标点击并关闭菜单；锚点被移除时会自动关闭。支持 `Escape`、`Tab` 关闭（并保持正常的焦点前进/后退），以及方向键、`Home` / `End`、`Enter` / `Space` 导航

锚定菜单示例：

```js
userChrome_js.menu.open({
    anchor: button,
    ariaLabel: '工具菜单',
    items: [
        {
            id: 'refresh',
            label: '刷新',
            shortcut: 'Ctrl+R',
            onSelect() {
                window.location.reload();
            }
        },
        { type: 'separator' },
        { id: 'unavailable', label: '不可用操作', disabled: true }
    ]
});
```

右键菜单示例：

```js
element.addEventListener('contextmenu', function (event) {
    event.preventDefault();
    userChrome_js.menu.open({
        position: { x: event.clientX, y: event.clientY },
        ariaLabel: '上下文菜单',
        items: [{ id: 'copy', label: '复制', onSelect: copyValue }]
    });
});
```

首版不支持子菜单、HTML 标签、单项加载状态或快捷键分发；需要变化的勾选状态应由调用脚本保存，并在下次打开菜单时重新传入 `checked`。

### `window.userChrome_js.createElement(tag, attrs)`

用于快速创建 DOM 元素。

- 普通属性通过 `setAttribute()` 写入
- `innerText` / `innerHTML` 可直接赋值
- `style` 支持对象形式传入
- `on*` 属性会自动绑定为事件监听器

示例：

```js
const button = userChrome_js.createElement('button', {
    class: 'my-button',
    type: 'button',
    innerText: '点击',
    onclick() {
        userChrome_js.alert('按钮已点击');
    }
});
```

### `window.userChrome_js.getMods()`

返回当前已发现的 mod 列表，包含 `id`、`relativePath`、`type`、`enabled`、`loaded`、`description`、`version` 等信息。

适合需要读取当前 mod 清单或构建管理界面的脚本使用。

### `window.userChrome_js.setModEnabled(id, enabled)`

切换指定 mod 的启用状态。

- CSS mod 会立即在当前窗口生效
- JS mod 需要重启 Vivaldi 后才会重新注入
- 返回结果中包含 `enabled`、`applied`、`restartRequired`、`persisted` 等字段

### `window.userChrome_js.resetModState()`

恢复所有 mod 到默认启用状态，并返回重置结果。

- 如果涉及 JS mod 状态恢复，返回值中的 `restartRequired` 会为 `true`
- 适合管理类脚本调用，不建议普通功能脚本频繁依赖
