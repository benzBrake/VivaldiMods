# VivaldiMods

Vivaldi 自定义内容收藏夹

## userChrome.js

Vivaldi 的 UC Loader(UC 环境)，用于载入`.css`和`.as.js`。我出于私心命名为`userChrome.js`了

### 安装方法

1. 下载本仓库

2. 然后把所有内容都放到`Vivaldi安装目录\版本号（比如6.2.3105.58）\resources\vivaldi`下
3. 修改`window.html`，在`</body>`后面加入`<script src="userChrome.js"></script>`

## 题外话

### 为什么脚本后缀名为 .ac.js

与 .us.js 和 userscript 区分