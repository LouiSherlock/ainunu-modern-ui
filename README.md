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

## 安装

### 从源码构建

```bash
pnpm install
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

## 开发

```bash
pnpm dev
```

在浏览器中加载 `build/chrome-mv3-dev` 目录，修改代码后会自动重新构建。

类型检查：

```bash
npx tsc --noEmit -p .
```

## 项目结构

```
├── popup.tsx / popup.css   # 扩展弹窗（开关面板）
├── contents/               # 内容脚本，每个文件对应一类页面
│   ├── home.ts / .css      # 首页
│   ├── list.ts / .css      # 频道列表
│   ├── detail.ts / .css    # 影片详情
│   ├── resource.ts / .css  # 资源下载（got06）
│   └── search.ts / .css    # 搜索结果（复用 list.css）
└── lib/                    # 公共模块
    ├── core.ts             # DOM 工具、图标、页头/页脚、主题、启动流程
    ├── base.css            # 设计变量与公共样式
    ├── settings.ts         # 开关状态（chrome.storage）
    ├── title.ts            # 片名解析与标签提取
    └── pager.ts            # 分页器
```

### 工作原理

1. 内容脚本在页面开始加载时（`document_start`）注入样式，并给 `<html>` 加上 `nu-pending` 类来隐藏原页面。
2. 读取开关状态。关闭时立即恢复原页面；开启时等待 DOM 就绪，解析原页面数据，生成新界面 `#nu-app`，再给 `<html>` 加上 `nu-on` 类来隐藏原始内容。
3. 监听 `chrome.storage` 的变化，在弹窗中切换开关时实时挂载或卸载新界面。
4. 原站使用 GBK 编码，搜索表单通过 `accept-charset="gbk"` 提交，保证中文关键词不乱码。

## 权限说明

| 权限 | 用途 |
| --- | --- |
| `storage` | 保存「美化开关」状态 |
| `host_permissions` | 在目标站点注入内容脚本，并在弹窗中识别当前标签页是否为爱努努站点 |

主题偏好保存在各站点自己的 `localStorage` 中，所以爱努努主站和资源站的主题各自独立。

## 技术栈

- [Plasmo](https://docs.plasmo.com/) 0.90
- TypeScript
- React 18（仅用于弹窗）
- 原生 DOM + CSS（内容脚本不依赖框架，体积小）
