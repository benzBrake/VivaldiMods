# utils

存放供 Loader 或其他 Mod 显式引用的工具资源。

## 加载规则

`chrome/utils/` 会被 Loader 排除，不会作为独立 Mod 自动注入。工具文件必须由调用方显式加载或引用，避免产生隐式执行顺序和重复初始化。

工具代码不应直接依赖某个具体 Mod 的私有变量；跨 Mod 能力应通过 `window.userChrome_js` 公共 API 提供。
