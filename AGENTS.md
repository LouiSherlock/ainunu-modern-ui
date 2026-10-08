# Agent Guide

## 项目概览

这是一个基于 Plasmo 0.90、TypeScript 和 Manifest V3 的 Chromium 浏览器扩展，用于重绘 `config/sites.json` 中配置的影视主站及 `got06.com` 资源站页面。内容脚本使用原生 DOM 和 CSS；React 18 只用于扩展弹窗。

## 架构与文件归属

- `popup.tsx`、`popup.css`：扩展弹窗 UI；通过 `lib/settings.ts` 读取和更新全局美化开关。
- `contents/home.ts`、`home.css`：首页。
- `contents/list.ts`、`list.css`：频道及子分类列表、条目筛选和分页。
- `contents/detail.ts`、`detail.css`：影片详情页。
- `contents/resource.ts`、`resource.css`：资源站下载页。
- `contents/search.ts`、`search.css`：搜索结果；复用 `list.css` 的基础列表样式。
- `contents/tags.ts`：`/tags.php` 标签结果；解析 `.content .list > div` 并复用频道列表样式和分页器。
- `lib/core.ts`：DOM 构造、图标、公共页头/页脚、原站公共数据采集及内容脚本启动流程。
- `lib/base.css`：主题变量、全局重置、共享布局和通用控件样式。
- `lib/settings.ts`：使用 `chrome.storage.local` 管理扩展开关。
- `lib/sites.ts`：读取影视主站域名清单，供弹窗和资源站链接使用。
- `lib/title.ts`：解析原站标题中的画质、语言、状态和附加信息。
- `lib/pager.ts`：共享分页 UI 和左右方向键翻页。
- `config/sites.json`：影视主站域名的唯一清单。
- `scripts/sync-site-matches.mjs`：在 Plasmo 命令启动前生成静态内容脚本匹配项，并同步主站 `host_permissions`。
- `assets/`：扩展静态资源。`build/` 和 `.plasmo/` 为构建相关目录，不要手动修改生成文件。

## 内容脚本工作方式

Plasmo 根据 `contents/` 下的脚本及其 `PlasmoCSConfig` 注册内容脚本。每个页面脚本负责匹配目标 URL、解析原站 DOM，并构造页面主体；修改页面覆盖范围时，同时检查脚本的 `config.matches` 与原站实际路由。

主站域名维护在 `config/sites.json`。Plasmo 要求 `config.matches` 使用静态字符串，因此修改主站域名清单后，需单独运行 `pnpm sync:sites`（即 `scripts/sync-site-matches.mjs`），更新内容脚本中标记的匹配项和 `package.json` 中精确的主站 `host_permissions`。`pnpm dev`、`pnpm build` 和 `pnpm package` 不会自动同步。不要手改生成区域；资源站域名及其权限仍独立配置在同步脚本和 `contents/resource.ts`。

页面脚本通过 `data-text:` 导入页面 CSS，并调用 `bootstrap(pageCss, build)`。`bootstrap` 注入 `base.css` 和页面 CSS，读取开关与主题，收集公共站点数据，再挂载统一页头、主体、页脚和返回顶部控件。若页面数据不符合预期或 `build` 返回 `null`，应保留原站页面；不要让解析失败留下空白页。

内容脚本用 `h()` 创建原生 DOM，不使用 React。它支持 DOM 节点、字符串和空值子节点；共享图标使用 `icon()`。新增或修改 UI 时沿用 `nu-` CSS 类名前缀，并优先放入对应页面样式文件；跨页面的变量和通用样式放在 `lib/base.css`。

## 修改约定

- 先查看目标页面现有解析器、`config.matches` 和相邻样式，再做局部修改；原站 DOM 选择器属于外部页面结构，缺失时应有稳健回退。
- 保持页面脚本的职责边界：页面解析与组合留在对应 `contents/*.ts`，可复用的逻辑放入 `lib/`。
- 开关状态保存在 `chrome.storage.local`；主题使用当前站点的 `localStorage`。不要混用这两类状态。
- 搜索表单需要保留原站 GBK 提交行为；修改搜索 UI 时检查 `lib/core.ts` 中对原表单的复用逻辑。
- 弹窗遵循现有 React 18 写法；内容脚本维持原生 DOM 实现。
- 遵守 `.prettierrc.mjs`：双引号、无分号、2 空格缩进、80 字符打印宽度，并使用配置的 import 排序插件。
- 不修改 `build/`、`.plasmo/` 等生成产物；依赖变更使用 pnpm，并保持 `pnpm-lock.yaml` 一致。

## 常用命令与验证

```bash
pnpm sync:sites
pnpm dev
pnpm build
pnpm package
npx tsc --noEmit -p .
```

仓库当前未定义独立的 test 或 lint 脚本。完成改动后至少运行 `pnpm build`；若改动涉及类型或共享模块，再运行 TypeScript 检查。
