# utils

存放供 Loader 或其他 Mod 显式引用的工具资源。

## 加载规则

`chrome/utils/` 会被 Loader 排除，不会作为独立 Mod 自动注入。工具文件必须由调用方显式加载或引用，避免产生隐式执行顺序和重复初始化。

工具代码不应直接依赖某个具体 Mod 的私有变量；跨 Mod 能力应通过明确的全局工具对象或 `window.userChrome_js` 公共 API 提供。

## 工具脚本

`userChrome.js` 会在普通 Mod 注入前按文件名顺序显式加载 `chrome/utils/` 下的 JavaScript 工具。工具脚本不会出现在 Mod 管理器中，也不参与 Mod 启用状态管理。

| 文件名 | 作用 |
| --- | --- |
| `alert.ac.js` | 提供全局 `VAlert.show(message, options?)` 非阻塞通知 API |
| `domQuery.ac.js` | 提供全局 `window.$(selector, context?)` 轻量 DOM 查询与事件辅助 API |

### `window.$(selector, context?)`

返回类 jQuery 风格包装对象，用于操作 Vivaldi 内置界面的 DOM。支持 `each()`、`find()`、`closest()`、`hasClass()`、`addClass()`、`removeClass()`、`toggleClass()`、`on()`、`off()`、`trigger()` 和 `get()`。

委托事件解绑时，需传入注册时相同的事件名、选择器和处理函数引用：

```js
const closeTab = function (event) {
    // ...
};
const tabStrip = $('#tabs-container .tab-strip');

tabStrip.on('contextmenu', '[role="tab"]', closeTab);
tabStrip.off('contextmenu', '[role="tab"]', closeTab);
```

### `window.VAlert.show(message, options?)`

通知优先挂载到 Vivaldi 的 `#webview-container` 内容区下方：默认右下角，使用右侧垂直标签栏时切换到左下角，避免遮挡标签栏。支持 `info`、`success`、`warn`、`error` 类型；`duration` 默认 `3000` 毫秒，传入 `0` 时保持显示；还支持 `title`、`closable` 和 `onClick`。自动关闭通知在鼠标悬停时暂停计时，移开后按剩余时长继续计时。返回通知对象可通过 `.close()` 手动关闭。

可传入非空字符串或数字 `id`（或兼容别名 `messageId`）合并重复通知。相同 ID 会更新已有通知的内容和选项，并按新的 `duration` 重新计时；未传 ID 时每次调用都会创建独立通知。两者同时传入时优先使用 `id`：

```js
VAlert.show('下载完成', {
    id: 'download-complete',
    type: 'success'
});
```
