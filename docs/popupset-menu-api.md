# Popupset 风格菜单 API

## 背景

`chrome/userChrome.js` 同时提供动态菜单和 popupset 风格的常驻菜单模型。旧的 `window.userChrome_js.menu.open(options)` 每次打开时创建菜单 DOM，关闭时移除；`register()` 注册的菜单则常驻在 `#userchrome-menu-root` 中，打开和关闭只切换显示状态。

动态模型继续服务已有的简单菜单，注册模型提供静态子菜单和级联打开行为，为后续重绘书签工具栏提供基础设施。

这里的目标不是在 Vivaldi 中使用 Firefox XUL。Vivaldi 内置界面运行在 Chromium 环境里，等价实现应使用标准 DOM、ARIA 角色和普通事件监听来模拟 popupset 的组织方式。

## 设计目标

- 菜单注册后常驻在统一容器中，打开和关闭只改变显示状态。
- 支持单层菜单和静态声明的子菜单。
- 同一时间只允许一组 popup 链打开。
- 保留锚点定位、坐标定位、外部点击关闭、键盘导航和焦点恢复。
- API 名称贴近 popupset 的概念，但实现保持 Vivaldi/DOM 友好。
- 暂不展开书签工具栏重绘；本规格只定义菜单基础能力。

## DOM 结构

当前实现使用标准 DOM，不使用自定义标签或 Web Components。

```html
<div id="userchrome-menu-root">
    <div class="userchrome-menu" role="menu" data-popup-id="menu-test-popup" hidden>
        <button class="userchrome-menu-item" role="menuitem" type="button">
            <span class="userchrome-menu-check" aria-hidden="true"></span>
            <span class="userchrome-menu-label">普通菜单项</span>
            <span class="userchrome-menu-shortcut">Ctrl+R</span>
            <span class="userchrome-menu-arrow" aria-hidden="true"></span>
        </button>
    </div>
</div>
```

使用的语义：

- popupset 容器：`#userchrome-menu-root`
- 菜单节点：`.userchrome-menu[role="menu"][data-popup-id]`
- 菜单项：`button.userchrome-menu-item`
- 普通项：`role="menuitem"`
- 勾选项：`role="menuitemcheckbox"`，并同步 `aria-checked`
- 子菜单触发项：`role="menuitem"`，并设置 `aria-haspopup="menu"` 和 `aria-expanded`
- 分隔项：`role="separator"`

## 公共 API

### `userChrome_js.menu.register(options)`

注册或替换一个常驻菜单。

```js
userChrome_js.menu.register({
    id: 'menu-test-popup',
    ariaLabel: '菜单测试',
    items: [
        {
            id: 'refresh',
            label: '刷新',
            shortcut: 'Ctrl+R',
            onSelect(selection) {
                window.location.reload();
            }
        }
    ]
});
```

参数：

- `id: string`：菜单唯一标识。重复注册同一个 `id` 时替换旧菜单。
- `ariaLabel?: string`：菜单可访问名称。
- `items: MenuItem[]`：菜单项列表。

返回控制器对象：

```js
{
    id: string,
    element: HTMLElement,
    unregister(): void,
    open(options): void,
    close(reason?: string): void
}
```

### `userChrome_js.menu.unregister(id)`

移除已注册菜单。如果该菜单正在打开，应先关闭当前 popup 链。

```js
userChrome_js.menu.unregister('menu-test-popup');
```

### `userChrome_js.menu.openPopup(id, options)`

打开已注册菜单。

```js
userChrome_js.menu.openPopup('menu-test-popup', {
    anchor: button
});

userChrome_js.menu.openPopup('menu-test-popup', {
    position: { x: event.clientX, y: event.clientY }
});
```

`options` 必须且只能提供一种定位方式：

- `{ anchor: HTMLElement }`：菜单锚定到元素下方。
- `{ position: { x: number, y: number } }`：菜单锚定到视口坐标。

### `userChrome_js.menu.closePopup(reason?)`

关闭当前打开的 popup 链。

```js
userChrome_js.menu.closePopup('manual');
```

### `userChrome_js.menu.getPopup(id)`

返回已注册菜单 DOM 节点。主要用于调试、测试或高级脚本接入。

```js
const popup = userChrome_js.menu.getPopup('menu-test-popup');
```

### 兼容 API

`userChrome_js.menu.open(options)` 保持原有调用方式：传入 `items` 以及 `anchor` 或 `position`，关闭时自动移除动态菜单 DOM。动态菜单也复用相同的静态 `children` 和级联交互实现。

`userChrome_js.menu.close(reason?)` 保留为关闭当前 popup 链的兼容入口，行为与 `closePopup(reason?)` 一致。

## 菜单项类型

```js
/**
 * @typedef {Object} MenuItem
 * @property {string} [id]
 * @property {'item'|'checkbox'|'separator'} [type]
 * @property {string} [label]
 * @property {boolean} [checked]
 * @property {boolean} [disabled]
 * @property {string} [shortcut]
 * @property {MenuItem[]} [children]
 * @property {(selection: MenuSelection) => void|Promise<void>} [onSelect]
 */
```

普通项：

```js
{
    id: 'open',
    label: '打开',
    onSelect() {
        console.log('open');
    }
}
```

勾选项：

```js
{
    id: 'compact-mode',
    type: 'checkbox',
    label: '紧凑模式',
    checked: true,
    onSelect(selection) {
        console.log(selection.checked);
    }
}
```

分隔项：

```js
{ type: 'separator' }
```

子菜单项：

```js
{
    id: 'more-tools',
    label: '更多工具',
    children: [
        { id: 'devtools', label: '开发者工具', onSelect: openDevtools },
        { id: 'settings', label: '设置', onSelect: openSettings }
    ]
}
```

选择回调参数为：

```js
{
    id: 'compact-mode',
    checked: true,
    previousChecked: false,
    event: MouseEvent | KeyboardEvent
}
```

## 子菜单行为

子菜单随父菜单一起注册为常驻 DOM，关闭时隐藏，不动态销毁。

打开规则：

- 鼠标悬停到含 `children` 的菜单项时打开其子菜单。
- 键盘焦点在子菜单项上时，按 `ArrowRight` 打开子菜单。
- 打开一个同级子菜单时，关闭之前打开的同级子菜单。
- 普通项或勾选项被选择后，关闭整组 popup 链。

关闭规则：

- 按 `ArrowLeft` 关闭当前子菜单，并把焦点还给父菜单项。
- 按 `Escape` 关闭整组 popup 链，并恢复触发元素焦点。
- 点击 popup 链外部关闭整组 popup 链。
- 锚点元素被移除时关闭整组 popup 链。

定位规则：

- 顶层菜单根据 `anchor` 或 `position` 定位。
- 子菜单优先显示在父菜单项右侧。
- 右侧空间不足时翻转到左侧。
- 垂直方向应尽量与父菜单项顶部对齐；底部溢出时向上修正。
- 所有菜单都应限制在视口边距内。

当前只支持静态 `children`。如果后续书签文件夹数据量过大，可以再扩展懒加载子菜单，例如 `childrenProvider` 或 `onBeforeOpen`。

## 完整示例

```js
(() => {
    const POPUP_ID = 'menu-test-popup';
    let compactMode = false;

    function registerMenu() {
        userChrome_js.menu.register({
            id: POPUP_ID,
            ariaLabel: '菜单测试',
            items: [
                {
                    id: 'notice',
                    label: '显示测试通知',
                    shortcut: 'Enter',
                    onSelect() {
                        userChrome_js.alert('菜单项已触发。', { type: 'success' });
                    }
                },
                {
                    id: 'compact-mode',
                    type: 'checkbox',
                    label: '紧凑模式示例',
                    checked: compactMode,
                    shortcut: 'Ctrl+M',
                    onSelect(selection) {
                        compactMode = selection.checked;
                        registerMenu();
                    }
                },
                { type: 'separator' },
                {
                    id: 'tools',
                    label: '更多工具',
                    children: [
                        {
                            id: 'devtools',
                            label: '打开 DevTools',
                            onSelect() {
                                userChrome_js.alert('这里可以接入 DevTools 按钮逻辑。');
                            }
                        },
                        {
                            id: 'disabled-child',
                            label: '禁用子项',
                            disabled: true
                        }
                    ]
                }
            ]
        });
    }

    registerMenu();

    button.addEventListener('click', function (event) {
        event.preventDefault();
        userChrome_js.menu.openPopup(POPUP_ID, {
            anchor: button
        });
    });

    button.addEventListener('contextmenu', function (event) {
        event.preventDefault();
        userChrome_js.menu.openPopup(POPUP_ID, {
            position: { x: event.clientX, y: event.clientY }
        });
    });
})();
```

## 为什么不用自定义标签

自定义标签能让 DOM 看起来更像 Firefox XUL，例如 `<uc-popupset>`、`<uc-menupopup>`、`<uc-menuitem>`，但当前实现不采用这种方式。

原因：

- 未注册的自定义标签只是 `HTMLUnknownElement`，语义收益有限。
- 注册 Custom Element 会引入升级时机、生命周期回调和重复定义处理。
- Vivaldi 内置界面不是普通网页应用，越少依赖额外平台机制越稳。
- 标准元素配合 `role`、`data-*` 和 class 已经能表达所需结构。
- 当前仓库脚本风格偏向直接 DOM 操作，标准元素更贴近现有代码。

因此当前实现使用标准 DOM + ARIA。如果后续确实需要更强的封装，再考虑把内部实现迁移到 Custom Elements。

## 与书签工具栏重绘的关系

书签工具栏重绘不是本文档的实现范围，但它是这个菜单 API 的重要目标场景。

重绘书签工具栏时，可以把书签栏顶层项目渲染为按钮，把书签文件夹渲染为带 `children` 的菜单项。这样书签文件夹、嵌套文件夹和普通链接都能复用同一套 popupset 与子菜单行为。

本 API 只解决菜单系统的结构、定位和交互问题；书签栏脚本仍需独立处理数据源和顶层按钮渲染。

## 验收要点

- `menu.open(options)` 的原有调用方式和关闭回调保持兼容。
- 注册、替换、打开、关闭和注销常驻菜单时不残留 DOM 或全局监听器。
- 鼠标和键盘均可打开任意层级的静态子菜单。
- 同一时间只显示一条 popup 链，子菜单在视口边缘正确翻转或修正位置。
- 示例代码不依赖 Firefox XUL、`popupset`、`menupopup` 或 `openPopup` 原生实现。
- 文档明确说明 Vivaldi 中使用标准 DOM 模拟 popupset。
- 文档明确说明书签工具栏重绘是后续目标，不在本规格中展开。
