import listCss from "data-text:./list.css"
import searchCss from "data-text:./search.css"

import { bootstrap, clean, h, icon, type Child, type Link } from "~lib/core"
import { pager, pagerKeys, type PageInfo } from "~lib/pager"
import { hashHue, parseTitle, titleTags, type TitleInfo } from "~lib/title"
import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: [
    // @site-matches:search:start
    "https://video.ainunu.com/plus/search.php*",
    "http://video.ainunu.com/plus/search.php*",
    "https://video.ainunu.org/plus/search.php*",
    "http://video.ainunu.org/plus/search.php*"
    // @site-matches:search:end
  ],
  run_at: "document_start"
}

const CHANNELS: Record<string, string> = {
  movie: "电影",
  dsj: "电视剧",
  zongyi: "综艺"
}

interface Result extends TitleInfo {
  href: string
  channel: string
  region: Link | null
  date: string
  snippet: string
}

/* ---------------- parsing ---------------- */

/** `◎别 名 反斗奇兵4◎片 名 Toy Story 4...` → `别名：反斗奇兵4 · 片名：Toy Story 4…` */
function formatSnippet(raw: string) {
  let s = clean(raw)
  const cut = /(\.{3}|…)$/.test(s)
  s = s.replace(/(\.{3}|…)$/, "").trim()
  if (!s) return ""
  s = s
    .split("◎")
    .map(clean)
    .filter(Boolean)
    .map((p) => p.replace(/^(\S)\s+(\S)\s+/, "$1$2：").replace(/^(\S{2,4})\s+/, "$1："))
    .join(" · ")
  return cut ? `${s}…` : s
}

function parseResult(div: Element): Result | null {
  const link = div.querySelector<HTMLAnchorElement>(":scope > a[href]")
  if (!link) return null
  const fonts = div.querySelectorAll(":scope > font")
  const meta = fonts[fonts.length - 1]
  const regionA = meta?.querySelector<HTMLAnchorElement>("a[href]")
  const path = new URL(link.href).pathname
  return {
    href: link.href,
    channel: path.split("/")[2] || "",
    region: regionA ? { text: clean(regionA.textContent), href: regionA.href } : null,
    date: clean(meta?.textContent).match(/\d{4}-\d{2}-\d{2}/)?.[0] || "",
    snippet: fonts.length > 1 ? formatSnippet(fonts[0].textContent || "") : "",
    ...parseTitle(clean(link.textContent))
  }
}

function collect() {
  const list = document.querySelector(".content .list")
  if (!list) return null

  const keyword =
    clean(document.querySelector(".floatleft strong")?.textContent) ||
    clean(document.querySelector<HTMLInputElement>('form[name="formsearch"] input[name="keyword"]')?.value)

  const items = Array.from(list.children)
    .map(parseResult)
    .filter((r): r is Result => !!r)

  const pagelist = document.querySelector(".pagelist")
  const nums = Array.from(pagelist?.querySelectorAll("b") ?? []).map(
    (b) => Number(clean(b.textContent)) || 0
  )
  const template =
    Array.from(pagelist?.querySelectorAll<HTMLAnchorElement>("a[href*='PageNo=']") ?? [])[0]
      ?.href || ""
  const current = Number(new URLSearchParams(location.search).get("PageNo")) || 1
  const page: PageInfo = {
    current,
    total: template ? Math.max(nums[1] || 1, current) : 1,
    url: (n: number) => template.replace(/PageNo=\d+/, `PageNo=${n}`)
  }

  return { keyword, items, count: nums[0] || items.length, page }
}

type Data = NonNullable<ReturnType<typeof collect>>

/* ---------------- components ---------------- */

function highlight(text: string, kw: string): Child[] {
  if (!kw) return [text]
  const re = new RegExp(`(${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig")
  return text
    .split(re)
    .map((part, i) => (i % 2 ? h("mark", { class: "nu-mark" }, part) : part))
    .filter(Boolean)
}

function searchBox(keyword: string) {
  const input = h("input", {
    class: "nu-big-search-input",
    type: "search",
    name: "keyword",
    value: keyword,
    placeholder: "输入片名搜索电影、电视剧、综艺…",
    autocomplete: "off",
    "aria-label": "搜索关键词"
  })
  const form = h(
    "form",
    { class: "nu-big-search", action: "/plus/search.php", method: "get" },
    h("input", { type: "hidden", name: "kwtype", value: "0" }),
    h("input", { type: "hidden", name: "titlekeyword", value: "1" }),
    icon("search", "nu-big-search-icon"),
    input,
    h("button", { class: "nu-big-search-btn", type: "submit" }, "搜索")
  )
  form.addEventListener("submit", (e) => {
    if (!input.value.trim()) {
      e.preventDefault()
      input.focus()
    }
  })
  return form
}

function head(data: Data, results: HTMLElement) {
  const counts = new Map<string, number>()
  for (const r of data.items) counts.set(r.channel, (counts.get(r.channel) || 0) + 1)

  let chips: HTMLElement | null = null
  if (counts.size > 1) {
    const buttons: HTMLButtonElement[] = []
    const select = (key: string, btn: HTMLButtonElement) => {
      buttons.forEach((b) => b.classList.toggle("is-active", b === btn))
      results.querySelectorAll<HTMLElement>(".nu-entry").forEach((el) => {
        el.hidden = !!key && el.dataset.channel !== key
      })
    }
    const make = (key: string, text: string, n: number) => {
      const btn = h(
        "button",
        { class: `nu-chip ${key ? "" : "is-active"}`, type: "button" },
        text,
        h("em", {}, String(n))
      )
      btn.addEventListener("click", () => select(key, btn))
      buttons.push(btn)
      return btn
    }
    chips = h(
      "div",
      { class: "nu-filters" },
      make("", "全部", data.items.length),
      Array.from(counts, ([k, n]) => make(k, CHANNELS[k] || k, n))
    )
  }

  return h(
    "section",
    { class: "nu-container nu-page-head nu-search-head" },
    h("p", { class: "nu-search-kicker" }, icon("search"), "搜索结果"),
    h(
      "h1",
      { class: "nu-page-title" },
      data.keyword ? `“${data.keyword}”` : "全部内容"
    ),
    h(
      "p",
      { class: "nu-page-sub" },
      data.count
        ? `共找到 ${data.count.toLocaleString()} 条相关结果` +
            (data.page.total > 1 ? ` · 第 ${data.page.current} / ${data.page.total} 页` : "")
        : "没有找到相关结果"
    ),
    searchBox(data.keyword),
    chips
  )
}

function resultCard(r: Result, kw: string, index: number) {
  const tags = titleTags(r)
  return h(
    "article",
    {
      class: "nu-entry",
      style: `--hue:${hashHue(r.name)};--i:${Math.min(index, 20)}`,
      "data-channel": r.channel
    },
    h("div", { class: "nu-entry-cover", "aria-hidden": "true" }, icon("film")),
    h(
      "div",
      { class: "nu-entry-main" },
      h(
        "h3",
        { class: "nu-entry-title" },
        h(
          "a",
          { class: "nu-entry-link", href: r.href, title: r.name },
          highlight(r.name, kw)
        )
      ),
      r.desc ? h("p", { class: "nu-entry-desc" }, highlight(r.desc, kw)) : null,
      r.snippet ? h("p", { class: "nu-entry-snippet" }, highlight(r.snippet, kw)) : null,
      tags.length ? h("div", { class: "nu-entry-tags" }, tags) : null
    ),
    h(
      "div",
      { class: "nu-entry-side" },
      h(
        "div",
        { class: "nu-entry-where" },
        CHANNELS[r.channel] ? h("span", { class: "nu-entry-channel" }, CHANNELS[r.channel]) : null,
        r.region ? h("a", { class: "nu-region", href: r.region.href }, r.region.text) : null
      ),
      r.date ? h("time", { class: "nu-entry-date" }, r.date) : null
    )
  )
}

function results(data: Data) {
  if (!data.items.length) {
    return h(
      "section",
      { class: "nu-container nu-section" },
      h(
        "div",
        { class: "nu-search-empty" },
        h("span", { class: "nu-search-empty-icon" }, icon("search")),
        h("h2", {}, "没有找到相关内容"),
        h("p", {}, "试试更短的关键词，或只输入片名中的几个字")
      )
    )
  }
  return h(
    "section",
    { class: "nu-container nu-section nu-list nu-search-results" },
    h(
      "div",
      { class: "nu-entries" },
      data.items.map((r, i) => resultCard(r, data.keyword, i))
    )
  )
}

/* ---------------- mount ---------------- */

bootstrap(listCss + "\n" + searchCss, () => {
  const data = collect()
  if (!data) return null
  pagerKeys(data.page)
  const list = results(data)
  return [head(data, list), list, pager(data.page)]
})
