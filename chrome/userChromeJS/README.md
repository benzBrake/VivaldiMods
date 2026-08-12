# 文件说明

| 文件名                        | 作用                                                                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| activateTabOnHover.ac.js      | 自动激活鼠标指向标签页（兼容 Vivaldi 8 垂直标签栏）                                                                                 |
| chromeDevtools_Button.ac.js   | 侧边栏 DevTools 按钮：优先连`localhost:9222` 远程调试端口自动打开 `window.html` 的 DevTools，不可用时回退 `vivaldi://inspect` |
| test/menuTest_Button.ac.js    | 侧边栏 Popupset 菜单测试按钮，覆盖注册、助记键、级联子菜单、VAlert 通知、锚定/坐标定位和菜单项右键；`test` 目录不会由安装脚本复制               |
| modsManager.ac.js             | 侧边栏增加一个统一管理 CSS / JS Mods 的按钮与浮层                                                                                   |
| rightClickOpenClipboard.ac.js | 右键普通或堆叠新增标签按钮，访问 URL 或用默认搜索引擎搜索剪贴板内容                                                                 |
| rightClickTabToClose.ac.js    | 右击时模拟中键关闭标签页，复用 Vivaldi 原生的新标签页和标签堆叠逻辑                                                                 |
| customBookmarksBar.ac.js      | 在原生书签栏下方增加自绘书签栏；按 Vivaldi 8.1 的显示与排序偏好渲染书签项，使用隔离的 `userchrome-custom-bookmarks-bar-*` class 复刻原生样式，并提供 URL 新建书签、原生/自绘书签跨层级拖放、含“全部打开”的文件夹 Popupset、溢出菜单、设置弹窗及带助记键的项目/空白区域右键操作 |
| Toggle_Bookmarksbar.ac.js     | 双击地址栏显示/隐藏书签栏（兼容 Vivaldi 8.1 的动态地址栏）                                                                          |
| undoCloseTab_Button.ac.js     | 在标签栏右侧工具栏增加撤销关闭标签页按钮，适配新版标签栏容器与异步重建                                                              |

## userChrome.js 公共 API

本目录下的脚本默认运行在 `chrome/userChrome.js` 提供的 UC Loader 环境中，可直接复用以下公共 API。`$` 由 Loader 在普通 Mod 前加载的 `chrome/utils/domQuery.ac.js` 提供。

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

### `window.VAlert.show(message, options?)`

`VAlert` 由 `chrome/utils/alert.ac.js` 提供，并在普通 Mod 注入前加载。在 Vivaldi 内容区下方显示非阻塞通知：默认右下角，右侧垂直标签栏时自动切换到左下角。

- `message`: 通知正文
- `options.type`: `info | success | warn | error`
- `options.duration`: 停留毫秒数，默认 `3000`；传 `0` 时保持显示直到手动关闭；鼠标悬停时暂停自动关闭，移开后按剩余时长继续计时
- `options.title`: 可选标题
- `options.closable`: 是否显示关闭按钮，默认 `true`
- `options.onClick`: 点击整条通知时触发，触发后自动关闭当前通知
- `options.buttons`: 右对齐操作按钮数组，项格式为 `{ text, action, close?, variant? }`；`action(event, notification)` 执行按钮操作，默认关闭通知，`close: false` 可保留通知。`variant` 支持 `default | primary | success | warning | danger`，未指定或无效时使用 `default`；空文本或非函数回调会被忽略
- `options.button`: `buttons` 的单按钮兼容写法
- `options.undo` / `options.undoText`: 撤销按钮兼容写法，等价于一个 `button`
- `options.id`: 非空字符串或数字；相同 ID 更新已有通知并按新的 `duration` 重新计时
- `options.messageId`: `id` 的兼容别名；同时传入时优先使用 `id`

示例：

```js
VAlert.show('设置已保存');

VAlert.show('需要重启 Vivaldi 后生效', {
    type: 'warn',
    duration: 5000
});

VAlert.show('下载完成', {
    id: 'download-complete',
    type: 'success'
});

VAlert.show('后台标签页已打开', {
    buttons: [{
        text: '撤销',
        action() {
            // 执行撤销操作
        }
    }]
});

VAlert.show('需要选择操作', {
    buttons: [
        { text: '稍后', action: () => {}, close: false, variant: 'default' },
        { text: '立即处理', action: () => {}, variant: 'primary' },
        { text: '删除', action: () => {}, variant: 'danger' }
    ]
});

VAlert.show('点击打开 Mod 管理器', {
    title: '提示',
    onClick(event, notification) {
        console.log(notification.id);
    }
});
```

### `window.userChrome_js.modal`

全局单例 modal，用于 Vivaldi 内置界面的表单和确认操作。调用 `modal.open(options)` 返回 `Promise<FormData|null>`：点击确定返回原生 `FormData`，点击取消、标题栏关闭、遮罩、按 `Escape` 或被新的 modal 替换时返回 `null`。`modal.close(reason?)` 主动关闭当前实例。

```js
const content = userChrome_js.createElement('div');
content.appendChild(userChrome_js.createElement('input', {
    name: 'value',
    required: true
}));

const result = await userChrome_js.modal.open({
    title: '示例设置',
    content,
    defaultSize: { width: 480, height: 320 },
    resizable: false,
    backdropBlur: 2,
    validate(formData) {
        return formData.get('value') ? '' : '值不能为空。';
    }
});
if (result) {
    console.log(result.get('value'));
}
```

支持 `title`、`message`、`content`（必须是 `HTMLElement`）、`confirmLabel`、`cancelLabel`、`showClose`、`danger`、`defaultSize.width/height`、`resizable`、`backdropBlur`、`restoreFocus` 和异步 `validate(formData, form)`。默认尺寸为宽度 `480px`、高度自动；默认不可调整大小，背景模糊 `2px`，显示关闭按钮。

### `window.userChrome_js.menu`

菜单组件使用标准 DOM 与 WAI-ARIA 语义实现，交互模型参考 Firefox 的菜单行为，但不依赖 Firefox 的 XUL `menu`、`menuitem` 或 `menupopup` 标签，因此可直接用于 Vivaldi 内置界面。

#### `menu.register(options)`

注册一个常驻菜单。注册后的菜单 DOM 保留在 `#userchrome-menu-root` 中，打开和关闭只切换显示状态。菜单超过最大高度时纵向滚动；分隔项保留 9px 布局高度，并在中线通过 1px `border-bottom` 绘制，不会被纵向 flex 布局压缩。

```js
const popup = userChrome_js.menu.register({
    id: 'tools-popup',
    ariaLabel: '工具菜单',
    items: [
        {
            id: 'bookmarks',
            label: '书签',
            children: [
                { id: 'home', label: '主页', onSelect: openHome }
            ]
        },
        { type: 'separator' },
        { id: 'refresh', label: '刷新', onSelect: refresh }
    ]
});
```

- `id` 必须是非空字符串；重复注册同一个 id 会替换旧菜单
- `ariaLabel` 可选，默认为 `菜单`
- `className` 可选，只接受由字母、数字、`-` 和 `_` 组成的 CSS 类名，可为空格分隔多个类
- `items` 至少包含一个非分隔项；菜单项支持 `id`、`label`、`icon`、`disabled`、`shortcut`、`onSelect`、`onContextMenu`、`type: 'checkbox'`、`checked` 和静态 `children`；`icon` 为 16px 图标的 URL
- `label` 支持 Windows 风格助记键：英文使用 `&Save As`，中文使用 `另存为(&S)`；`&&` 显示为字面量 `&`
- 助记符不会进入纯文本属性：对应菜单按钮的 `getAttribute('label')` 分别返回 `Save As` 和 `另存为`，且可见助记字母以下划线标识
- `children` 表示子菜单；子菜单项目支持任意层级，但不会异步加载
- 返回控制器 `{ id, element, open(options), close(reason?), unregister() }`

#### `menu.openPopup(id, options)`

打开已注册菜单。`options` 必须提供且只能提供一种定位方式：`anchor: HTMLElement`（锚点下方）或 `position: { x, y }`（视口坐标）。可选 `restoreFocus`、`onClose(reason)` 和 `preserveCurrent`，返回值提供 `close(reason?)`。`preserveCurrent: true` 会暂存当前菜单，新菜单关闭后恢复原菜单。

```js
userChrome_js.menu.openPopup('tools-popup', { anchor: button });
```

#### `menu.unregister(id)`、`menu.closePopup(reason?)`、`menu.getPopup(id)`

- `unregister(id)` 移除常驻菜单；菜单正在显示时会先关闭 popup 链
- `closePopup(reason?)` 关闭当前整组 popup 链；如果它是通过 `preserveCurrent` 叠加的菜单，则恢复被暂存的 popup；`menu.close(reason?)` 是兼容旧 API 的别名
- `getPopup(id)` 返回已注册菜单的顶层 DOM 节点，未注册时返回 `null`

#### `menu.open(options)`（兼容 API）

按旧方式创建一次性菜单。必须提供 `anchor` 或 `position` 之一，以及 `items`；菜单关闭后会自动移除。现有调用方无需迁移，也支持 `restoreFocus`、`onClose(reason)`、`preserveCurrent`、`className` 和静态 `children`。默认打开会替换已有菜单；`preserveCurrent: true` 用于临时叠加菜单。

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

菜单项被选择时会先关闭当前 popup 链并归还焦点，再执行 `onSelect`；勾选项回调参数中的 `checked` 是切换后的值，`previousChecked` 是原值；`shortcut` 仅用于展示。菜单打开时，无 `Ctrl` / `Alt` / `Meta` 修饰的助记字母会在当前层级中生效：唯一匹配项直接执行或展开子菜单，重复匹配项循环聚焦后等待 `Enter`。普通项与分隔项均可提供 `onContextMenu({ id, event, element, position })`，鼠标右键、菜单键和 `Shift+F10` 会阻止浏览器原生菜单并传入菜单项元素及视口坐标，但不会自动关闭原 popup。回调可用 `preserveCurrent: true` 打开临时右键菜单，关闭后恢复原 popup 和来源项目焦点。菜单支持鼠标悬停或点击展开子菜单，以及 `ArrowLeft` / `ArrowRight`、`ArrowUp` / `ArrowDown`、`Home` / `End`、`Enter` / `Space`、`Escape` 和 `Tab` 键盘操作。点击叠菜单之外会关闭整组菜单；窗口滚动/缩放会重新定位，锚点被移除时会关闭相应 popup。

不支持 HTML 菜单项、异步 `childrenProvider` 或全局/组合快捷键分发；变化的勾选状态应由调用脚本保存，并通过重新 `register()` 或 `open()` 传入。

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
        VAlert.show('按钮已点击');
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
