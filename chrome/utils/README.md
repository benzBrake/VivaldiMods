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

### `window.VAlert.show(message, options?)`

通知优先挂载到 Vivaldi 的 `#webview-container` 内容区下方：默认右下角，使用右侧垂直标签栏时切换到左下角，避免遮挡标签栏。支持 `info`、`success`、`warn`、`error` 类型；`duration` 默认 `3000` 毫秒，传入 `0` 时保持显示；还支持 `title`、`closable` 和 `onClick`。返回通知对象可通过 `.close()` 手动关闭。
