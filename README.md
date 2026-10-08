# Ainunu UI

一个浏览器扩展，把 [爱努努影视 video.ainunu.com](https://video.ainunu.com/) 及其资源下载站改造成现代、精致的界面。它基于 [Plasmo](https://docs.plasmo.com/) 开发，支持 Chrome、Edge 等 Chromium 内核浏览器（Manifest V3）。

## 功能特性

- **全站重绘**：页面加载时先隐藏原站，读取原页面数据后重建界面，不会闪出旧版。原站结构不匹配时自动放弃改造，保留原页面。
- **深色 / 浅色主题**：默认是深色影院风格，可以在右上角一键切换，选择会被记住。
- **弹窗开关**：点击扩展图标，打开 iOS 毛玻璃风格的控制面板，可以一键开启或关闭美化，已打开的页面实时生效，不用刷新。
- **快捷键**：`/` 聚焦搜索框，`←` `→` 翻页。
- **响应式布局**：适配电脑和手机屏幕宽度。

## 覆盖页面

| 页面 | 地址示例 | 改造内容 |
| --- | --- | --- |
| 首页 | `video.ainunu.com/` | 频道分区、影片卡片、清晰度/字幕标签 |
| 频道列表 | `/c/movie/`、`/c/dsj/`、`/c/zongyi/` 及子分类 | 分类筛选、条目卡片、分页器（支持跳页） |
| 影片详情 | `/c/movie/rihan/202609/19333.html` | 模糊海报背景、评分/年份/地区等信息、完整剧情简介、演职员、资源入口、复制链接 |
| 资源下载 | `*.got06.com/...` | 按文件或网盘分组，识别百度、夸克、迅雷、阿里、115、123、UC、磁力、ed2k 等并分色显示；支持单条或全部复制 |
| 搜索结果 | `/plus/search.php?keyword=...` | 大搜索框、关键词高亮、按频道筛选、无结果提示 |
| 标签列表 | `/tags.php?...` | 标签结果卡片、地区与日期信息、本页筛选和分页 |

## 安装

### 从源码构建

```bash
pnpm install
pnpm sync:sites
pnpm build
```

构建产物位于 `build/chrome-mv3-prod`。

1. 打开 `chrome://extensions`（Edge 为 `edge://extensions`）。
2. 开启「开发者模式」。
3. 点击「加载已解压的扩展程序」，选择 `build/chrome-mv3-prod` 目录。

### 打包

```bash
pnpm package
```

它会在 `build/` 下生成可以分发的 zip 压缩包。
如果修改了 `config/sites.json`，先运行 `pnpm sync:sites` 更新静态匹配规则和主机权限，再启动开发或构建命令。

## 开发

```bash
pnpm dev
```

在浏览器中加载 `build/chrome-mv3-dev` 目录，修改代码后会自动重新构建。

类型检查：

```bash
npx tsc --noEmit -p .
```

### 站点域名

主站域名统一维护在 `config/sites.json` 的 `videoHosts` 中。新增镜像域名时添加主机名，例如 `video.ainunu.org`，然后单独运行 `pnpm sync:sites`。该命令会更新首页、频道、详情、搜索和标签页的静态匹配规则，以及 `package.json` 中的主机权限；`pnpm dev`、`pnpm build` 和 `pnpm package` 不会自动执行同步。资源站 `got06.com` 使用独立匹配规则。

## 项目结构

```
├── popup.tsx / popup.css   # 扩展弹窗（开关面板）
├── contents/               # 内容脚本，每个文件对应一类页面
│   ├── home.ts / .css      # 首页
│   ├── list.ts / .css      # 频道列表
│   ├── detail.ts / .css    # 影片详情
│   ├── resource.ts / .css  # 资源下载（got06）
│   ├── search.ts / .css    # 搜索结果（复用 list.css）
│   └── tags.ts             # 标签结果（复用 list.css）
└── lib/                    # 公共模块
    ├── core.ts             # DOM 工具、图标、页头/页脚、主题、启动流程
    ├── base.css            # 设计变量与公共样式
    ├── sites.ts            # 读取统一站点域名配置
    ├── settings.ts         # 开关状态（chrome.storage）
    ├── title.ts            # 片名解析与标签提取
    └── pager.ts            # 分页器
config/sites.json           # 主站域名清单
scripts/sync-site-matches.mjs # 生成 Plasmo 所需的静态匹配规则
```

### 工作原理

1. 内容脚本只匹配配置的影视主站域名和资源站域名，并在页面开始加载时（`document_start`）注入样式。
2. 脚本读取原页面已有的标题、链接、图片和简介等 DOM 内容，在浏览器中创建新界面 `#nu-app`；不修改网站服务器上的页面或数据库。
3. 美化开关关闭时移除新界面并恢复原页面；开启时隐藏旧版页面。弹窗切换开关后，已打开页面会实时响应。
4. 搜索继续使用原站表单提交；原站使用 GBK 编码，因此表单保留 GBK 编码设置，避免中文关键词乱码。

### 对网站和数据的影响

- **不会改写网站数据**：扩展只改变当前浏览器中的页面显示，不会创建、编辑或删除网站上的影片、账号或其他数据。
- **不会上传扩展收集的数据**：当前源码没有向第三方发送页面内容的 `fetch`、`XMLHttpRequest` 或 `sendBeacon` 调用。浏览器仍会像平时一样加载网站自身的页面、图片和资源；搜索、打开影片或下载链接也仍会向对应网站发起正常请求。
- **本地保存少量偏好**：美化开关保存在浏览器扩展的 `chrome.storage.local`；主题和已发现的子分类保存在当前站点的 `localStorage`，不同域名之间相互独立。
- **随时可关闭**：在扩展弹窗关闭美化后，当前页面会移除扩展界面并显示原站页面。

### 权限范围说明

内容脚本和 `host_permissions` 都限制在 `config/sites.json` 中的主站域名及 `*.got06.com` 资源站。修改主站域名清单后运行 `pnpm sync:sites`，同步脚本会生成静态匹配项和精确的主机权限；无需手动编辑生成区域或权限列表。

## 权限说明

| 权限 | 用途 |
| --- | --- |
| `storage` | 保存「美化开关」状态 |
| `host_permissions` | 仅允许配置的影视主站域名，以及 `*.got06.com` 资源站的 HTTP/HTTPS 页面。 |

主题偏好保存在各站点自己的 `localStorage` 中，所以爱努努主站和资源站的主题各自独立。

## 技术栈

- [Plasmo](https://docs.plasmo.com/) 0.90
- TypeScript
- React 18（仅用于弹窗）
- 原生 DOM + CSS（内容脚本不依赖框架，体积小）
