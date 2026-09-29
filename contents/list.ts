import cssText from "data-text:./list.css"

import {
  bootstrap,
  clean,
  collectCrumbs,
  crumbsNav,
  h,
  icon,
  storage,
  type IconName,
  type Link
} from "~lib/core"
import { pager, pagerKeys } from "~lib/pager"
import { hashHue, parseTitle, titleTags } from "~lib/title"
import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://video.ainunu.com/c/*", "http://video.ainunu.com/c/*"],
  run_at: "document_start"
}

// Channel / sub-category list pages only, e.g. /c/movie/, /c/movie/oumei/list_2.html
// (detail pages look like /c/movie/oumei/202607/19135.html and are left untouched)
const LIST_PATH =
  /^\/c\/[\w-]+\/(?:[\w-]+\/)?(?:list_(?:\d+_)?\d+\.html|index\.html?)?$/

interface Entry {
  href: string
  date: string
  region: Link | null
  name: string
  desc: string
  res: string
  src: string
  status: string
  langs: string[]
  infos: string[]
  featured: boolean
}

const CHANNEL_ICONS: Record<string, IconName> = {
  movie: "film",
  dsj: "tv",
  zongyi: "mic"
}

const WEEK = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]

/* ---------------- parsing ---------------- */

function parseEntry(li: Element): Entry | null {
  const link = li.querySelector<HTMLAnchorElement>("a.title")
  if (!link) return null
  const regionA = Array.from(li.querySelectorAll<HTMLAnchorElement>("a")).find(
    (a) => a !== link
  )
  return {
    href: link.href,
    date: clean(li.querySelector(".right")?.textContent),
    region: regionA
      ? { text: clean(regionA.textContent), href: regionA.href }
      : null,
    featured: !!link.querySelector("font[color]"),
    ...parseTitle(clean(link.textContent))
  }
}

function collect() {
  const items = Array.from(document.querySelectorAll(".content ul.list > li"))
    .map(parseEntry)
    .filter((e): e is Entry => !!e)
  if (!items.length) return null

  const path = location.pathname
  const pageBase = path.replace(/(list_[^/]*|index\.html?)$/, "")
  const channelKey = path.split("/")[2] || ""
  const channelBase = `/c/${channelKey}/`

  const crumbs = collectCrumbs()

  // Pagination
  const pagelist = document.querySelector(".pagelist")
  const current =
    Number(clean(pagelist?.querySelector(".thisclass")?.textContent)) || 1
  const strongs = Array.from(
    pagelist?.querySelectorAll(".pageinfo strong") ?? []
  ).map((s) => Number(clean(s.textContent)) || 0)
  const linkNums = Array.from(pagelist?.querySelectorAll("a") ?? [])
    .map((a) => Number(a.getAttribute("href")?.match(/(\d+)\.html/)?.[1]))
    .filter((n) => n > 0)
  const totalPages = Math.max(strongs[0] || 0, current, ...linkNums)
  const prefix =
    Array.from(pagelist?.querySelectorAll("a") ?? [])
      .map((a) => a.getAttribute("href")?.match(/(list_(?:\d+_)?)\d+\.html/)?.[1])
      .find(Boolean) || "list_"

  // Sub-categories: derived from item regions, remembered per channel across pages
  const subKey = `nu-subcats:${channelBase}`
  let subs: Link[] = []
  try {
    subs = JSON.parse(storage.get(localStorage, subKey) || "[]")
  } catch {
    subs = []
  }
  for (const e of items) {
    if (!e.region) continue
    const p = new URL(e.region.href).pathname
    if (p !== channelBase && p.startsWith(channelBase) && !subs.some((s) => s.href === p))
      subs.push({ text: e.region.text, href: p })
  }
  storage.set(localStorage, subKey, JSON.stringify(subs))

  const channelName =
    crumbs.find((c) => new URL(c.href).pathname === channelBase)?.text ||
    channelKey
  const title = crumbs.length ? crumbs[crumbs.length - 1].text : channelName

  return {
    items,
    crumbs,
    title,
    channelBase,
    pageBase,
    icon: CHANNEL_ICONS[channelKey] || "film",
    subs,
    page: {
      current,
      total: totalPages,
      count: strongs[1] || 0,
      url: (n: number) =>
        n <= 1 ? pageBase : `${pageBase}${prefix}${n}.html`
    }
  }
}

type Data = NonNullable<ReturnType<typeof collect>>

/* ---------------- components ---------------- */

function dateLabel(date: string) {
  const d = new Date(`${date}T00:00:00`)
  if (Number.isNaN(d.getTime())) return { main: date, sub: "" }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
  const md = `${d.getMonth() + 1}月${d.getDate()}日`
  const withYear =
    d.getFullYear() === today.getFullYear() ? md : `${d.getFullYear()}年${md}`
  if (diff === 0) return { main: "今天", sub: `${md} · ${WEEK[d.getDay()]}` }
  if (diff === 1) return { main: "昨天", sub: `${md} · ${WEEK[d.getDay()]}` }
  return { main: withYear, sub: WEEK[d.getDay()] }
}

function pageHead(data: Data) {
  const path = location.pathname
  const activeSub = data.subs.find((s) => path.startsWith(s.href))
  return h(
    "section",
    { class: "nu-container nu-page-head" },
    crumbsNav(data.crumbs),
    h(
      "div",
      { class: "nu-page-title-row" },
      h("span", { class: "nu-page-icon" }, icon(data.icon as IconName)),
      h(
        "div",
        {},
        h("h1", { class: "nu-page-title" }, data.title),
        h(
          "p",
          { class: "nu-page-sub" },
          data.page.count ? `共 ${data.page.count.toLocaleString()} 部作品 · ` : "",
          `第 ${data.page.current} / ${data.page.total} 页`
        )
      )
    ),
    data.subs.length
      ? h(
          "div",
          { class: "nu-filters" },
          h(
            "a",
            {
              class: `nu-chip ${activeSub ? "" : "is-active"}`,
              href: data.channelBase
            },
            "全部"
          ),
          data.subs.map((s) =>
            h(
              "a",
              { class: `nu-chip ${activeSub === s ? "is-active" : ""}`, href: s.href },
              s.text
            )
          )
        )
      : null
  )
}

function entryCard(e: Entry, data: Data, index: number) {
  const regionPath = e.region ? new URL(e.region.href).pathname : ""
  const showRegion =
    e.region && regionPath !== data.pageBase && regionPath !== data.channelBase

  const tags = titleTags(e)

  return h(
    "article",
    {
      class: "nu-entry",
      style: `--hue:${hashHue(e.name)};--i:${Math.min(index, 20)}`,
      "data-name": `${e.name} ${e.desc}`.toLowerCase()
    },
    h("div", { class: "nu-entry-cover", "aria-hidden": "true" }, h("span", {}, e.name.slice(0, 2))),
    h(
      "div",
      { class: "nu-entry-main" },
      h(
        "h3",
        { class: "nu-entry-title" },
        h(
          "a",
          { class: "nu-entry-link", href: e.href, target: "_blank", rel: "noopener", title: e.name },
          e.name
        ),
        e.featured ? h("span", { class: "nu-pick" }, "推荐") : null
      ),
      e.desc ? h("p", { class: "nu-entry-desc" }, e.desc) : null,
      tags.some(Boolean) ? h("div", { class: "nu-entry-tags" }, tags) : null
    ),
    h(
      "div",
      { class: "nu-entry-side" },
      showRegion
        ? h("a", { class: "nu-region", href: e.region!.href }, e.region!.text)
        : null,
      h("span", { class: "nu-entry-play" }, icon("play"))
    )
  )
}

function listSection(data: Data) {
  const groups = new Map<string, Entry[]>()
  for (const e of data.items) {
    const list = groups.get(e.date) ?? []
    list.push(e)
    groups.set(e.date, list)
  }

  let index = 0
  const groupEls = Array.from(groups, ([date, entries]) => {
    const label = dateLabel(date)
    return h(
      "div",
      { class: "nu-day" },
      h(
        "div",
        { class: "nu-day-head" },
        icon("calendar"),
        h("strong", {}, label.main),
        label.sub ? h("span", {}, label.sub) : null,
        h("em", {}, `${entries.length} 部`)
      ),
      h(
        "div",
        { class: "nu-entries" },
        entries.map((e) => entryCard(e, data, index++))
      )
    )
  })

  const empty = h("p", { class: "nu-empty", hidden: true }, "本页没有匹配的作品，试试上方的站内搜索吧")
  const filter = h("input", {
    class: "nu-filter-input",
    type: "search",
    placeholder: "筛选本页…",
    "aria-label": "筛选本页"
  })
  filter.addEventListener("input", () => {
    const q = filter.value.trim().toLowerCase()
    let any = false
    for (const day of groupEls) {
      let visible = 0
      day.querySelectorAll<HTMLElement>(".nu-entry").forEach((el) => {
        const show = !q || (el.dataset.name || "").includes(q)
        el.hidden = !show
        if (show) visible++
      })
      day.hidden = visible === 0
      any ||= visible > 0
    }
    empty.hidden = any
  })

  return h(
    "section",
    { class: "nu-container nu-section nu-list" },
    h(
      "div",
      { class: "nu-section-head" },
      h(
        "div",
        {},
        h("h2", { class: "nu-section-title" }, icon("calendar"), "最近更新"),
        h("p", { class: "nu-section-sub" }, `本页 ${data.items.length} 部 · 按更新时间排序`)
      ),
      h("label", { class: "nu-filter" }, icon("search"), filter)
    ),
    groupEls,
    empty
  )
}

/* ---------------- mount ---------------- */

if (LIST_PATH.test(location.pathname)) {
  bootstrap(cssText, () => {
    const data = collect()
    if (!data) return null

    pagerKeys(data.page)
    return [pageHead(data), listSection(data), pager(data.page)]
  })
}
