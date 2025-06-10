# VivaldiMods

Vivaldi 自定义内容收藏夹

目前我的 Vivaldi 版本：**7.0.3495.6 (Stable channel) （64 位）** 

## userChrome.js

Vivaldi 的 UC Loader(UC 环境)，用于载入`.css`和`.ac.js`。我出于私心命名为`userChrome.js`了

### 安装方法

### 手动

1. 下载本仓库

2. 然后把所有内容都放到`Vivaldi安装目录\版本号（比如6.2.3105.58）\resources\vivaldi`下

3. 修改`window.html`，在`</body>`后面加入`<script src="chrome/userChrome.js"></script>`

### 自动（仅 Windows）

1. 下载本仓库
2. 双击 installhooks.bat
3. 如果提示找不到 vivaldi 路径可以手动指定 vivaldi.exe 路径，先右键并点击**在此处打开命令提示符**，然后执行下面的命令（假设你的 Vivaldi 安装到 D:\Soft\Vivaldi）
   
   ```batch
   installhoot.bat "D:\Soft\Vivaldi\Application\vivaldi.exe"
   ```

## userChrome.js

userChrome.js 提供了额外的`$`函数，操作 DOM 可以方便一点

## 题外话

### 为什么脚本后缀名为 .ac.js

与 .uc.js 和 userscript 区分