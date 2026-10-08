import cssText from "data-text:./list.css"
import type { PlasmoCSConfig } from "plasmo"

import {
  bootstrap,
  clean,
  collectCrumbs,
  crumbsNav,
  h,
  icon,
  type Link
} from "~lib/core"
import { pager, pagerKeys, type PageInfo } from "~lib/pager"
import { hashHue, parseTitle, titleTags, type TitleInfo } from "~lib/title"

export const config: PlasmoCSConfig = {
  matches: [
    // @site-matches:tags:start
    "https://video.ainunu.com/tags.php*",
    "http://video.ainunu.com/tags.php*",
    "https://video.ainunu.org/tags.php*",
    "http://video.ainunu.org/tags.php*"
    // @site-matches:tags:end
  ],
  run_at: "document_start"
}

const TAGS_PATH = /^\/tags\.php$/
const WEEK = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]

interface TagEntry extends TitleInfo {
  href: string
  date: string
  region: Link | null
  featured: boolean
}

interface TagData {
  title: string
  crumbs: Link[]
  items: TagEntry[]
  page: PageInfo
}

function parseEntry(el: Element): TagEntry | null {
  const links = Array.from(el.querySelectorAll<HTMLAnchorElement>("a[href]"))
  const link = links[0]
  if (!link) return null

  const regionLink = links.find((a) => a !== link)
  const raw = clean(link.textContent)
  const date = clean(el.textContent).match(/\d{4}-\d{2}-\d{2}/)?.[0] || ""

  return {
    href: link.href,
    date,
    region: regionLink
      ? { text: clean(regionLink.textContent), href: regionLink.href }
      : null,
    featured: !!link.querySelector("font[color]"),
    ...parseTitle(raw)
  }
}

function collect(): TagData | null {
  const list = document.querySelector(".content .list")
  if (!list) return null

  const items = Array.from(list.children)
    .map(parseEntry)
    .filter((item): item is TagEntry => !!item)
  if (!items.length) return null

  const pagelist = document.querySelector(".pagelist")
  const pageInfo = clean(pagelist?.querySelector(".pageinfo")?.textContent)
  const totals = pageInfo.match(/共\s*(\d+)\s*页\s*\/\s*(\d+)\s*条/)
  const currentFromUrl = location.search.match(/\/(\d+)\/?$/)?.[1]
  const current =
    Number(clean(pagelist?.querySelector(".thisclass")?.textContent)) ||
    Number(currentFromUrl) ||
    1
  const linkedPages = Array.from(
    pagelist?.querySelectorAll<HTMLAnchorElement>("a[href]") ?? []
  )
    .map((a) => Number(new URL(a.href).pathname.match(/\/(\d+)\/?$/)?.[1]))
    .filter((page) => page > 0)
  const total = Math.max(Number(totals?.[1]) || 0, current, ...linkedPages)
  const count = Number(totals?.[2]) || items.length
  const pageRoute = location.search.replace(/\/\d+\/?$/, "/")
  const title = clean(document.title.split("_")[0]) || "标签内容"

  return {
    title,
    crumbs: collectCrumbs(),
    items,
    page: {
      current,
      total,
      summary: `共 ${count.toLocaleString()} 条 · 第 ${current} / ${total} 页`,
      url: (page: number) => `${location.pathname}${pageRoute}${page}/`
    }
  }
}

function dateLabel(date: string) {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return { main: "日期未知", sub: "" }

  const [, yearText, monthText, dayText] = match
  const dateValue = new Date(
    Number(yearText),
    Number(monthText) - 1,
    Number(dayText)
  )
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - dateValue.getTime()) / 86400000)
  const monthDay = `${dateValue.getMonth() + 1}月${dateValue.getDate()}日`
  const main =
    dateValue.getFullYear() === today.getFullYear()
      ? monthDay
      : `${dateValue.getFullYear()}年${monthDay}`

  if (diff === 0)
    return { main: "今天", sub: `${monthDay} · ${WEEK[dateValue.getDay()]}` }
  if (diff === 1)
    return { main: "昨天", sub: `${monthDay} · ${WEEK[dateValue.getDay()]}` }
  return { main, sub: WEEK[dateValue.getDay()] }
}

function pageHead(data: TagData) {
  return h(
    "section",
    { class: "nu-container nu-page-head nu-tags-head" },
    crumbsNav(data.crumbs, data.title),
    h(
      "div",
      { class: "nu-page-title-row" },
      h("span", { class: "nu-page-icon" }, icon("tag")),
      h("div", {}, h("h1", { class: "nu-page-title" }, data.title))
    )
  )
}

function entryCard(entry: TagEntry, index: number) {
  const tags = titleTags(entry)
  return h(
    "article",
    {
      class: "nu-entry",
      style: `--hue:${hashHue(entry.name)};--i:${Math.min(index, 20)}`,
      "data-name":
        `${entry.name} ${entry.desc} ${entry.region?.text || ""}`.toLowerCase()
    },
    h(
      "div",
      { class: "nu-entry-cover", "aria-hidden": "true" },
      icon("film")
    ),
    h(
      "div",
      { class: "nu-entry-main" },
      h(
        "h3",
        { class: "nu-entry-title" },
        h(
          "a",
          {
            class: "nu-entry-link",
            href: entry.href,
            target: "_blank",
            rel: "noopener",
            title: entry.name
          },
          entry.name
        ),
        entry.featured ? h("span", { class: "nu-pick" }, "推荐") : null
      ),
      entry.desc ? h("p", { class: "nu-entry-desc" }, entry.desc) : null,
      tags.length ? h("div", { class: "nu-entry-tags" }, tags) : null
    ),
    h(
      "div",
      { class: "nu-entry-side" },
      entry.region
        ? h(
            "a",
            { class: "nu-region", href: entry.region.href },
            entry.region.text
          )
        : null,
      h("span", { class: "nu-entry-play" }, icon("play"))
    )
  )
}

function listSection(data: TagData) {
  const groups = new Map<string, TagEntry[]>()
  for (const item of data.items) {
    const group = groups.get(item.date) ?? []
    group.push(item)
    groups.set(item.date, group)
  }

  let index = 0
  const groupEls = Array.from(groups, ([date, items]) => {
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
        h("em", {}, `${items.length} 条`)
      ),
      h(
        "div",
        { class: "nu-entries" },
        items.map((item) => entryCard(item, index++))
      )
    )
  })

  const empty = h(
    "p",
    { class: "nu-empty", hidden: true },
    "没有匹配的标签内容"
  )
  const filter = h("input", {
    class: "nu-filter-input",
    type: "search",
    placeholder: "筛选本页…",
    "aria-label": "筛选本页标签内容"
  })
  filter.addEventListener("input", () => {
    const query = filter.value.trim().toLowerCase()
    let any = false
    for (const day of groupEls) {
      let visible = 0
      day.querySelectorAll<HTMLElement>(".nu-entry").forEach((entry) => {
        const show = !query || (entry.dataset.name || "").includes(query)
        entry.hidden = !show
        if (show) visible++
      })
      day.hidden = visible === 0
      any ||= visible > 0
    }
    empty.hidden = any
  })

  return h(
    "section",
    { class: "nu-container nu-section nu-list nu-tags-list" },
    // h(
    //   "div",
    //   { class: "nu-section-head" },
    //   h(
    //     "div",
    //     {},
    //     h("h2", { class: "nu-section-title" }, icon("tag"), "标签内容"),
    //     h(
    //       "p",
    //       { class: "nu-section-sub" },
    //       `本页 ${data.items.length} 条 · 按更新时间排序`
    //     )
    //   ),
    //   h("label", { class: "nu-filter" }, icon("search"), filter)
    // ),
    groupEls,
    empty
  )
}

if (TAGS_PATH.test(location.pathname)) {
  bootstrap(cssText, () => {
    const data = collect()
    if (!data) return null

    pagerKeys(data.page)
    return [pageHead(data), listSection(data), pager(data.page)]
  })
}
