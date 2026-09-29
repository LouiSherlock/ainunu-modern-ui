import cssText from "data-text:./resource.css"

import {
  bootstrap,
  clean,
  crumbsNav,
  h,
  icon,
  type Common,
  type IconName
} from "~lib/core"
import { parseTitle, titleTags } from "~lib/title"
import type { PlasmoCSConfig } from "plasmo"

// Download pages linked from the detail pages' "查看资源页面" button,
// e.g. https://t.got06.com/oumei-dy/Rj8VHG.html
export const config: PlasmoCSConfig = {
  matches: ["https://*.got06.com/*", "http://*.got06.com/*"],
  run_at: "document_start"
}

const SITE = "https://video.ainunu.com"

const CHANNELS: { re: RegExp; text: string; path: string; icon: IconName }[] = [
  { re: /-dy$|^movie/, text: "电影", path: "/c/movie/", icon: "film" },
  { re: /-dsj$|^dsj/, text: "电视剧", path: "/c/dsj/", icon: "tv" },
  { re: /zongyi/, text: "综艺节目", path: "/c/zongyi/", icon: "mic" }
]
const REGIONS: Record<string, string> = {
  oumei: "欧美",
  rihan: "日韩",
  neidi: "内地",
  gangtai: "港台"
}

interface Provider {
  name: string
  key: string
  mark: string
}

const PROVIDERS: (Provider & { re: RegExp })[] = [
  { re: /pan\.baidu\.com|yun\.baidu\.com/i, name: "百度网盘", key: "baidu", mark: "百" },
  { re: /quark\.cn/i, name: "夸克网盘", key: "quark", mark: "夸" },
  { re: /pan\.xunlei\.com/i, name: "迅雷云盘", key: "xunlei", mark: "迅" },
  { re: /alipan\.com|aliyundrive\.com/i, name: "阿里云盘", key: "ali", mark: "阿" },
  { re: /(^|\.)115(cdn)?\.com/i, name: "115网盘", key: "p115", mark: "115" },
  { re: /123pan|123684|123865|123912/i, name: "123云盘", key: "p123", mark: "123" },
  { re: /drive\.uc\.cn|fast\.uc\.cn/i, name: "UC网盘", key: "uc", mark: "UC" },
  { re: /^magnet:/i, name: "磁力链接", key: "magnet", mark: "磁" },
  { re: /^ed2k:/i, name: "电驴链接", key: "ed2k", mark: "驴" },
  { re: /^thunder:/i, name: "迅雷链接", key: "xunlei", mark: "迅" }
]

const QUALITY =
  /4K|2160p|1080p|720p|BD|HD|蓝光|高清|更新至|全集|完结|^第.+[集期]$|[双三]语|国语|粤语|英语|日语|韩语|中字|双字/i

interface Res {
  href: string
  text: string
  provider: Provider
}

interface Group {
  label: string
  size: string
  provider: Provider | null
  links: Res[]
}

/* ---------------- parsing ---------------- */

function providerOf(href: string, text = ""): Provider {
  let host = href
  try {
    const u = new URL(href)
    if (/^https?:$/.test(u.protocol)) host = u.hostname
  } catch {
    /* keep raw */
  }
  const hit = PROVIDERS.find((p) => p.re.test(host))
  if (hit) return hit
  const byName = PROVIDERS.find((p) => text.includes(p.name))
  if (byName) return byName
  return { name: text || host, key: "other", mark: (text || host).slice(0, 1).toUpperCase() }
}

/** `穿普拉达的女王2 国英双语 1080pBD` → name + tags */
function parseHeadline(raw: string) {
  const tokens = raw.split(/\s+/).filter(Boolean)
  let i = tokens.findIndex((t, n) => n > 0 && QUALITY.test(t))
  if (i < 0) i = tokens.length
  const name = tokens.slice(0, i).join(" ") || raw
  return parseTitle(`《${name}》${tokens.slice(i).map((t) => `[${t}]`).join("")}`)
}

function fileTags(label: string) {
  const tags: string[] = []
  const res = label.match(/4K|2160p|1080p|720p/i)?.[0]
  if (res) tags.push(res.toUpperCase().replace("2160P", "4K"))
  if (/BD|蓝光/i.test(label)) tags.push("蓝光")
  else if (/HD|高清/i.test(label)) tags.push("高清")
  const codec = label.match(/H\.?26[45]|HEVC|x26[45]/i)?.[0]
  if (codec) tags.push(codec.toUpperCase().replace(".", "").replace("HEVC", "H265"))
  const lang = label.match(/国粤英三语|国英双语|国粤双语|中英双字|[双三]语|国语|粤语|中字|双字/)?.[0]
  if (lang) tags.push(lang)
  const ext = label.match(/\.(mp4|mkv|avi|ts|rmvb|iso)\b/i)?.[1]
  if (ext) tags.push(ext.toUpperCase())
  return tags
}

function collect() {
  const article = document.querySelector("article.post")
  const body = article?.querySelector(".zhengwen")
  if (!article || !body || !body.querySelector(".videolist a[href]")) return null

  const headline = clean(article.querySelector(".post-title")?.textContent)
  const title = parseHeadline(headline)
  const date = clean(article.querySelector(".post-meta time")?.textContent)
  const tips = [body.querySelector("#tishi")]
    .filter((el): el is Element => !!el)
    .flatMap((el) => {
      const lines: string[] = []
      let cur = ""
      el.childNodes.forEach(function walk(n: Node) {
        if (n.nodeName === "BR" || n.nodeName === "HR") {
          lines.push(cur)
          cur = ""
        } else if (n.nodeType === Node.TEXT_NODE) cur += n.textContent
        else n.childNodes.forEach(walk)
      })
      lines.push(cur)
      return lines.map(clean).filter(Boolean)
    })

  const groups: Group[] = []
  let label = ""
  for (const el of Array.from(body.children)) {
    if (el.id === "tishi" || el.matches("script, style")) continue
    if (el.classList.contains("videolist")) {
      const links = Array.from(el.querySelectorAll<HTMLAnchorElement>("a[href]"))
        .filter((a) => !/^(javascript:|#)/i.test(a.getAttribute("href") || ""))
        .map((a) => {
          const text = clean(a.textContent)
          return { href: a.href, text, provider: providerOf(a.href, text) }
        })
      if (!links.length) continue
      const size = label.match(/[（(]\s*([\d.]+\s*[KMGT]i?B)\s*[）)]/i)?.[1] || ""
      const name = clean(label.replace(/[（(]\s*[\d.]+\s*[KMGT]i?B\s*[）)]/i, ""))
      const labelProvider = PROVIDERS.find((p) => name === p.name) || null
      groups.push({
        label: name || `资源 ${groups.length + 1}`,
        size,
        provider: labelProvider,
        links
      })
      label = ""
    } else {
      const text = clean(el.textContent)
      if (text) label = text
    }
  }
  if (!groups.length) return null

  const slug = location.pathname.split("/")[1] || ""
  const channel = CHANNELS.find((c) => c.re.test(slug)) || null
  const region = REGIONS[slug.split("-")[0]] || ""

  return { title, headline, date, tips, groups, channel, region }
}

type Data = NonNullable<ReturnType<typeof collect>>

/* ---------------- components ---------------- */

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    window.prompt("复制下面的内容：", text)
    return false
  }
}

function flash(btn: HTMLElement, label?: HTMLElement, done = "已复制") {
  const prev = label?.textContent
  btn.classList.add("is-done")
  if (label) label.textContent = done
  window.setTimeout(() => {
    btn.classList.remove("is-done")
    if (label && prev != null) label.textContent = prev
  }, 1600)
}

function providerMark(p: Provider) {
  return h("span", { class: `nu-pmark nu-pmark--${p.key}`, "aria-hidden": "true" }, p.mark)
}

function linkRow(r: Res, group: Group) {
  const isProviderText = !r.text || r.text === r.provider.name
  const main = isProviderText ? r.provider.name : r.text
  let sub = isProviderText || group.provider?.key === r.provider.key ? "" : r.provider.name
  if (r.provider.key === "magnet") {
    const hash = r.href.match(/btih:([a-z0-9]+)/i)?.[1]
    if (hash) sub = `btih · ${hash.slice(0, 8).toUpperCase()}…${hash.slice(-4).toUpperCase()}`
  } else if (!sub && group.provider?.key !== r.provider.key) {
    try {
      sub = new URL(r.href).hostname
    } catch {
      /* ignore */
    }
  }

  const copy = h(
    "button",
    {
      class: "nu-icon-btn nu-res-copy",
      type: "button",
      title: "复制链接",
      "aria-label": `复制${main}链接`
    },
    icon("copy", "nu-i-copy"),
    icon("check", "nu-i-check")
  )
  copy.addEventListener("click", async () => {
    if (await copyText(r.href)) flash(copy)
  })

  return h(
    "div",
    { class: `nu-res-link nu-p--${r.provider.key}` },
    h(
      "a",
      { class: "nu-res-open", href: r.href, target: "_blank", rel: "noopener noreferrer" },
      providerMark(r.provider),
      h(
        "span",
        { class: "nu-res-text" },
        h("strong", {}, main),
        sub ? h("small", {}, sub) : null
      ),
      icon(r.provider.key === "magnet" ? "down" : "external", "nu-res-go")
    ),
    copy
  )
}

function groupCard(g: Group, index: number) {
  const tags = g.provider ? [] : fileTags(g.label)
  return h(
    "section",
    { class: "nu-res-group", style: `--i:${index}` },
    h(
      "header",
      { class: "nu-res-head" },
      g.provider
        ? providerMark(g.provider)
        : h("span", { class: "nu-res-file", "aria-hidden": "true" }, icon("film")),
      h(
        "div",
        { class: "nu-res-meta" },
        h("h2", { class: "nu-res-label" }, g.label),
        tags.length || g.size
          ? h(
              "div",
              { class: "nu-res-tags" },
              g.size ? h("span", { class: "nu-res-size" }, g.size) : null,
              tags.map((t) => h("span", { class: "nu-tag" }, t))
            )
          : null
      ),
      h("span", { class: "nu-res-count" }, `${g.links.length} 个链接`)
    ),
    h("div", { class: "nu-res-links" }, g.links.map((r) => linkRow(r, g)))
  )
}

function hero(data: Data) {
  const t = data.title
  const total = data.groups.reduce((n, g) => n + g.links.length, 0)
  const providers = Array.from(
    new Map(data.groups.flatMap((g) => g.links.map((l) => [l.provider.key, l.provider]))).values()
  )

  const crumbs = [{ text: "首页", href: `${SITE}/` }]
  if (data.channel) crumbs.push({ text: data.channel.text, href: SITE + data.channel.path })

  const copyAllLabel = h("span", {}, "复制全部链接")
  const copyAll = h(
    "button",
    { class: "nu-btn nu-btn--ghost nu-btn--static", type: "button" },
    icon("copy"),
    copyAllLabel
  )
  copyAll.addEventListener("click", async () => {
    const text = data.groups
      .map((g) => [`# ${g.label}${g.size ? ` (${g.size})` : ""}`, ...g.links.map((l) => `${l.text || l.provider.name}: ${l.href}`)].join("\n"))
      .join("\n\n")
    if (await copyText(`${t.name}\n\n${text}`)) flash(copyAll, copyAllLabel)
  })

  const tags = [
    ...titleTags(t),
    t.desc ? h("span", { class: "nu-tag" }, t.desc) : null
  ].filter(Boolean)

  return h(
    "section",
    { class: "nu-container nu-res-hero" },
    crumbsNav(crumbs, "资源下载"),
    h(
      "div",
      { class: "nu-res-title-row" },
      h("span", { class: "nu-res-icon" }, icon(data.channel?.icon || "film")),
      h(
        "div",
        { class: "nu-res-title-main" },
        h(
          "p",
          { class: "nu-res-kicker" },
          "资源下载",
          data.region ? h("span", {}, `${data.region}${data.channel?.text || ""}`) : null
        ),
        h("h1", { class: "nu-res-title" }, t.name),
        tags.length ? h("div", { class: "nu-res-title-tags" }, tags) : null
      )
    ),
    h(
      "div",
      { class: "nu-res-stats" },
      h("span", {}, icon("film"), h("b", {}, String(data.groups.length)), " 组资源"),
      h("span", {}, icon("external"), h("b", {}, String(total)), " 个链接"),
      data.date ? h("span", {}, icon("clock"), `更新于 ${data.date.replace(/\./g, "-")}`) : null,
      h(
        "span",
        { class: "nu-res-providers" },
        providers.map((p) => h("span", { title: p.name }, providerMark(p)))
      )
    ),
    h(
      "div",
      { class: "nu-res-actions" },
      copyAll,
      data.channel
        ? h(
            "a",
            { class: "nu-btn nu-btn--ghost", href: SITE + data.channel.path },
            `返回${data.channel.text}`,
            icon("arrow")
          )
        : null
    )
  )
}

function tipsBox(data: Data) {
  const tips = data.tips.length
    ? data.tips
    : ["网盘资源有失效风险，请尽快保存。", "视频内广告与本站无关，请勿轻信。"]
  return h(
    "div",
    { class: "nu-container" },
    h(
      "div",
      { class: "nu-res-tips" },
      icon("info"),
      h("ul", {}, tips.map((t) => h("li", {}, t)))
    )
  )
}

function searchForm() {
  return h(
    "form",
    {
      action: `${SITE}/plus/search.php`,
      method: "get",
      target: "_blank",
      "accept-charset": "gbk"
    },
    h("input", { type: "hidden", name: "kwtype", value: "0" }),
    h("input", { type: "hidden", name: "titlekeyword", value: "1" }),
    h("input", { type: "text", name: "keyword" }),
    h("input", { type: "submit", value: "搜索" })
  )
}

/* ---------------- mount ---------------- */

bootstrap(
  cssText,
  () => {
    const data = collect()
    if (!data) return null
    return [
      hero(data),
      tipsBox(data),
      h(
        "div",
        { class: "nu-container nu-res-groups" },
        data.groups.map((g, i) => groupCard(g, i))
      )
    ]
  },
  (): Partial<Common> => {
    const slug = location.pathname.split("/")[1] || ""
    const channel = CHANNELS.find((c) => c.re.test(slug))
    return {
      nav: [
        { text: "首页", href: `${SITE}/` },
        { text: "电影频道", href: `${SITE}/c/movie/` },
        { text: "电视剧", href: `${SITE}/c/dsj/` },
        { text: "综艺节目", href: `${SITE}/c/zongyi/` }
      ],
      activeHref: channel ? SITE + channel.path : "",
      siteName: "爱努努绿色电影",
      form: searchForm(),
      backup: null,
      warning: ""
    }
  }
)
