# userStyles

存放直接修改 Vivaldi 内置界面的 UserStyle。普通样式放在本目录，仿 Firefox 外观的兼容样式放在 `legacy/`。

## 文件说明

| 文件名                         | 说明                     |
| --------------------------- | ---------------------- |
| blur_bookmark_bar_items.css | 模糊书签工具栏文字，鼠标经过时显示      |
| centered_bookmarks_toolbar.css | 居中显示书签工具栏           |
| sort_extensions_icons.css   | 调整扩展图标顺序，隐藏的在前，一直显示的在后 |
| tab_close_over_favicon.css  | 标签关闭按钮显示在 Favicon 上方   |
| topmenu_in_tabsbar.css      | 在标签栏右侧显示横向菜单栏（如有）      |

## Legacy

`legacy/` 仅表示视觉风格来源，不代表这些样式用于 Firefox，也不改变它们作为 Vivaldi CSS Mod 的加载方式。

| 文件名                | 说明                        |
| --------------------- | --------------------------- |
| appbutton_orange.css  | Vivaldi 按钮仿 Firefox 橙色 |
| fx_boomark_folder.css | 书签文件夹改用 Firefox 同款 |
| fx_like_buttons.css   | 按钮图标仿 Firefox          |
