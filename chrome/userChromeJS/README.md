# 文件说明

| 文件名                      | 作用                                       |
| --------------------------- | ------------------------------------------ |
| activateTabOnHover.ac.js    | 自动激活鼠标指向标签页                     |
| chromeDevtools_Button.ac.js | 侧边栏 DevTools 按钮：优先连 `localhost:9222` 远程调试端口自动打开 `window.html` 的 DevTools，不可用时回退 `vivaldi://inspect` |
| global-media-controls.ac.js | 侧边栏增加一个全局播放控制面板             |
| modsManager.ac.js           | 侧边栏增加一个统一管理 CSS / JS Mods 的按钮与浮层 |
| rightClickTabToClose.ac.js  | 右击关闭标签页                             |
| Toggle_Bookmarksbar.ac.js   | 双击地址栏显示/隐藏书签栏                  |
| undoCloseTab_Button.ac.js   | 在垃圾桶旁边增加一个撤销关闭标签页的按钮   |

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
