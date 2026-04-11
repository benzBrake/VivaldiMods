# AGENTS.md

## 仓库定位

这个仓库里的脚本和样式用于 **Vivaldi 浏览器内置界面**，目标是修改 Vivaldi UI，不是 Firefox 的 `userChrome.js` / `userChrome.css` 用户样式方案。

虽然仓库里保留了 `chrome/userChrome.js` 这个历史命名，但这里的含义是 **Vivaldi UI Mod Loader**。请不要把它理解成 Firefox 社区常说的 userChrome 机制。

## 加载机制

- `chrome/userChrome.js` 是入口 loader。
- 它会扫描 `chrome/` 目录，并注入脚本和样式文件。
- 样式通过 `<link rel="stylesheet">` 注入。
- 脚本通过动态创建 `<script>` 标签注入。
- 当前仓库约定中，`chrome/userChrome.js` 自身不会作为 mod 再次注入。

这意味着这里的开发方式更接近“给 Vivaldi 自带界面挂载脚本和样式”，而不是 Firefox profile 下覆盖 `userChrome.css` 的工作流。

## 目录约定

- `chrome/userChromeJS/`
  存放行为脚本。新增脚本默认放这里，沿用 `.ac.js` 命名。
- `chrome/styles/`
  存放直接修改 Vivaldi 界面的样式。
- `chrome/legacy/`
  存放“仿 Firefox 外观”的 Vivaldi 资源。这里只是视觉风格借鉴，不代表仓库整体是 Firefox 适配项目。
- `**/deprecated/`
  存放已废弃或不再推荐扩展的内容。除非用户明确要求维护兼容，否则不要继续在这些目录里新增功能。

## 编写约束

- 写脚本时，默认面向 Vivaldi 内置界面的 DOM 结构工作。
- 优先复用现有 `chrome/userChrome.js` 提供的加载方式和全局 `$` 辅助函数。
- 允许使用仓库当前已有风格里的 `chrome.*`、`vivaldi.*`、DOM 事件监听和动态注入方式。
- 写样式时，选择器应面向 Vivaldi UI，而不是 Firefox 的 `userChrome.css` 约定。
- 修改时优先保持现有目录结构、命名风格和注入方式一致。

## 明确不要做的事

- 不要把这里的脚本解释成 Firefox `userChrome.js` 脚本。
- 不要建议 Firefox profile 安装路径。
- 不要建议 `userChrome.css` 覆盖流程。
- 不要引导使用 `about:config`、`toolkit.legacyUserProfileCustomizations.stylesheets` 等 Firefox 专属做法。
- 不要把本仓库误判成普通网页前端项目或浏览器扩展打包项目。

## 协作说明

- 新增脚本时，默认放到 `chrome/userChromeJS/*.ac.js`。
- 新增样式时，默认放到 `chrome/styles/*.css`。
- 新增仿 Firefox 风格但仍服务于 Vivaldi 的样式，可放到 `chrome/legacy/*`。
- 改动说明优先写清：
  - 影响的是哪个 Vivaldi UI 区域。
  - 依赖了哪些选择器、DOM 结构、`chrome.*` 或 `vivaldi.*` API。
  - 主要适配哪个 Vivaldi 大版本。
- AI 在新增、删除、重命名、移动或明显调整脚本/样式时，必须同步检查并更新对应子目录的 `README.md`。
- 目录与 README 的默认对应关系如下：
  - `chrome/userChromeJS/` 对应 `chrome/userChromeJS/README.md`
  - `chrome/styles/` 对应 `chrome/styles/README.md`
  - `chrome/legacy/` 对应 `chrome/legacy/README.md`
- 如果变更影响文件清单、文件名、用途说明或目录分类，不能只改代码，必须同时更新对应 README。

## 提交前检查

- 每次准备 commit 时，都要检查本次变更里是否包含脚本或样式文件的新增、删除、重命名、迁移或用途变化。
- 只要 `chrome/userChromeJS/`、`chrome/styles/`、`chrome/legacy/` 或其下级目录有相关变动，就要核对对应 `README.md` 是否已经同步。
- 如果 README 未同步，先补齐文档，再提交。
- 提交说明里应简要反映这次脚本/样式变更影响了哪个区域，以及 README 是否已更新。

## 安装背景

仓库内容最终会被复制到 Vivaldi 安装目录下的 `resources/vivaldi` 中，并通过修改 `window.html` 引入：

```html
<script src="chrome/userChrome.js"></script>
```

因此这里的文件是直接作用于 Vivaldi 自带界面资源的补丁式内容，不是 Firefox profile hack，也不是独立运行的网页应用。

## Git 提交规范

### 提交信息格式

本项目遵循自定义的 Conventional Commits 格式规范：

```
<type>(<scope>): <filename> <subject>

<body>
```

### 格式要求

1. **类型 (type)**：使用 Conventional Commits 标准类型
   - `feat` - 新功能
   - `fix` - 缺陷修复
   - `docs` - 文档变更
   - `refactor` - 代码重构
   - `style` - 代码格式调整
   - `test` - 测试相关
   - `chore` - 构建/工具配置

2. **作用域 (scope)**：使用文件扩展名或技术栈
   - `(JS)` - JavaScript 文件
   - `(CSS)` - CSS 样式文件
   - `(DOC)` - 文档文件
   - 其他扩展名如 `(JSON)`、`(HTML)` 等

3. **文件名 (filename)**：必须包含，放在作用域后面
   - 示例：`TabPlus.uc.js`、`StatusBar.uc.js`、`tab_busy_thinking.css`

4. **主题 (subject)**：简短描述变更内容（中文）

5. **正文 (body)**（可选）：
   - 使用列表格式
   - 每项以 `-` 开头
   - 使用动词开头的祈使句
   - 详细说明变更内容

### 示例

```bash
# JavaScript 文件修复
fix(JS): TabPlus.uc.js 修复 Firefox 149+ 搜索服务初始化失败问题

- 新增 initSearchService 异步方法，兼容新版 ESM 搜索服务
- 修复右键新标签按钮搜索时 Services.search 未定义的错误
- 版本号更新至 1.1.1

# CSS 文件新功能
feat(CSS): UserStyles/tab_busy_thinking.css 添加标签页载入中显示"thinking..."样式

# JavaScript 文件重构
refactor(JS): KeyChanger 代码整理与安全增强

# 文档更新
feat(DOC): UserTools/README.md 更新下载链接
```

### 重要说明

- **文件名必须包含**在提交信息中，位于作用域之后
- 提交信息使用**中文**描述
- 遵循 Conventional Commits 规范，但添加了强制文件名要求
- 对于多文件变更，可选择主要文件或分别提交
