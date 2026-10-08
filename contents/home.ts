import cssText from "data-text:./home.css"

import { bootstrap, clean, h, icon, type IconName } from "~lib/core"
import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: [
    // @site-matches:home:start
    "https://video.ainunu.com/",
    "https://video.ainunu.com/?*",
    "https://video.ainunu.com/index.htm*",
    "http://video.ainunu.com/",
    "http://video.ainunu.com/?*",
    "http://video.ainunu.com/index.htm*",
    "https://video.ainunu.org/",
    "https://video.ainunu.org/?*",
    "https://video.ainunu.org/index.htm*",
    "http://video.ainunu.org/",
    "http://video.ainunu.org/?*",
    "http://video.ainunu.org/index.htm*"
    // @site-matches:home:end
  ],
  run_at: "document_start"
}

interface Item {
  href: string
  img: string
  title: string
  tag: string
  intro: string
  featured: boolean
}

interface Badge {
  text: string
  kind: "bd" | "hd" | "ep" | "end" | "other"
}

const SLIDE_MS = 6000

function badgeOf(tag: string): Badge | null {
  if (!tag) return null
  const t = tag.toUpperCase()
  if (t === "BD") return { text: "蓝光", kind: "bd" }
  if (t === "HD") return { text: "高清", kind: "hd" }
  if (/^\d+$/.test(tag)) return { text: `更新至${Number(tag)}集`, kind: "ep" }
  if (tag.includes("全")) return { text: "已完结", kind: "end" }
  return { text: tag, kind: "other" }
}

function badgeEl(item: Item, extra = "") {
  const b = badgeOf(item.tag)
  return b
    ? h("span", { class: `nu-badge nu-badge--${b.kind} ${extra}` }, b.text)
    : null
}

/* ---------------- parse original DOM ---------------- */

function parseItem(el: Element): Item | null {
  const link = el.querySelector<HTMLAnchorElement>("a[href]")
  const img = el.querySelector<HTMLImageElement>("img")
  if (!link) return null
  const titleLink = el.querySelector(".picshow_title a")
  const raw = clean(titleLink?.textContent || img?.alt || img?.title)
  const m = raw.match(/^(.*?)\s*\[([^\]]+)\]\s*$/)
  return {
    href: link.href,
    img: img?.src || "",
    title: m ? m[1] : raw,
    tag: m ? m[2] : "",
    intro: clean(el.querySelector(".picshow_intro")?.textContent),
    featured: !!titleLink?.querySelector("font[color]")
  }
}

function collect() {
  const focus = document.querySelector(".focus")
  if (!focus) return null
  const anchor = focus.querySelector('a[name="dsj"]')

  // Original layout: picshow rows separated by .clearfix; TV list follows <a name="dsj">
  const groups: Element[][] = [[]]
  for (const child of Array.from(focus.children)) {
    if (child.classList.contains("picshow"))
      groups[groups.length - 1].push(child)
    else if (
      (child.classList.contains("clearfix") || child === anchor) &&
      groups[groups.length - 1].length
    )
      groups.push([])
  }
  const nonEmpty = groups.filter((g) => g.length)
  const isAfterAnchor = (el: Element) =>
    !!anchor &&
    !!(anchor.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)

  const toItems = (els: Element[]) =>
    els.map(parseItem).filter((i): i is Item => !!i)
  const movieGroups = nonEmpty.filter((g) => !isAfterAnchor(g[0]))
  const tvGroups = nonEmpty.filter((g) => isAfterAnchor(g[0]))

  let featured: Item[]
  if (movieGroups.length > 1 && movieGroups[0].length <= 8)
    featured = toItems(movieGroups.shift()!)
  else featured = toItems(movieGroups.flat()).slice(0, 5)

  const genres = Array.from(
    document.querySelectorAll<HTMLAnchorElement>(".pleft_index .fl a")
  ).map((a) => ({ text: clean(a.textContent), href: a.href }))

  return {
    featured,
    movies: toItems(movieGroups.flat()),
    tv: toItems(tvGroups.flat()),
    genres
  }
}

type Data = NonNullable<ReturnType<typeof collect>>

/* ---------------- components ---------------- */

function poster(item: Item, cls = "") {
  const wrap = h("div", { class: `nu-poster ${cls}` })
  const fallback = () => {
    wrap.classList.add("is-broken")
    wrap.prepend(
      h("span", { class: "nu-poster-fallback" }, item.title.slice(0, 8))
    )
  }
  if (!item.img) {
    fallback()
    return wrap
  }
  const img = h("img", {
    src: item.img,
    alt: item.title,
    loading: "lazy",
    decoding: "async",
    referrerpolicy: "no-referrer"
  })
  img.addEventListener("load", () => wrap.classList.add("is-loaded"), {
    once: true
  })
  img.addEventListener(
    "error",
    () => {
      img.remove()
      fallback()
    },
    { once: true }
  )
  wrap.append(img)
  return wrap
}

function card(item: Item, index: number) {
  const p = poster(item)
  p.append(
    h("span", { class: "nu-poster-shade" }),
    icon("play", "nu-card-play"),
    badgeEl(item) || "",
    item.featured ? h("span", { class: "nu-pick" }, "推荐") : ""
  )
  return h(
    "a",
    {
      class: "nu-card",
      href: item.href,
      target: "_blank",
      rel: "noopener",
      title: item.title,
      style: `--i:${Math.min(index, 24)}`
    },
    p,
    h(
      "div",
      { class: "nu-card-body" },
      h("h3", { class: "nu-card-title" }, item.title),
      h("p", { class: "nu-card-intro" }, item.intro || "\u00a0")
    )
  )
}

function hero(items: Item[]) {
  if (!items.length) return null
  let current = 0
  const slides = items.map((item, i) =>
    h(
      "div",
      {
        class: `nu-slide ${i === 0 ? "is-active" : ""}`,
        "aria-hidden": i === 0 ? "false" : "true"
      },
      h(
        "div",
        { class: "nu-slide-bg" },
        item.img
          ? h("img", {
              src: item.img,
              alt: "",
              referrerpolicy: "no-referrer",
              decoding: "async"
            })
          : null
      ),
      h(
        "div",
        { class: "nu-container nu-slide-content" },
        h(
          "div",
          { class: "nu-slide-info" },
          h(
            "div",
            { class: "nu-slide-meta" },
            h("span", { class: "nu-chip nu-chip--glow" }, "精选推荐"),
            badgeEl(item)
          ),
          h("h2", { class: "nu-slide-title" }, item.title),
          item.intro ? h("p", { class: "nu-slide-intro" }, item.intro) : null,
          h(
            "div",
            { class: "nu-slide-actions" },
            h(
              "a",
              {
                class: "nu-btn nu-btn--primary",
                href: item.href,
                target: "_blank",
                rel: "noopener"
              },
              icon("play"),
              "立即查看"
            ),
            h(
              "a",
              { class: "nu-btn nu-btn--ghost", href: "/c/movie/" },
              "浏览更多电影",
              icon("arrow")
            )
          )
        ),
        h(
          "a",
          {
            class: "nu-slide-poster",
            href: item.href,
            target: "_blank",
            rel: "noopener",
            tabindex: "-1"
          },
          poster(item)
        )
      )
    )
  )

  const thumbs = items.map((item, i) =>
    h(
      "button",
      {
        class: `nu-thumb ${i === 0 ? "is-active" : ""}`,
        type: "button",
        title: item.title,
        onclick: () => go(i)
      },
      poster(item, "nu-thumb-poster"),
      h(
        "span",
        { class: "nu-thumb-copy" },
        h("span", { class: "nu-thumb-title" }, item.title),
        h("span", { class: "nu-thumb-subtitle" }, item.intro || "2026高分动画")
      ),
      h("span", {
        class: "nu-thumb-progress",
        style: `--dur:${SLIDE_MS}ms`
      })
    )
  )

  function go(i: number) {
    current = (i + items.length) % items.length
    slides.forEach((s, idx) => {
      s.classList.toggle("is-active", idx === current)
      s.setAttribute("aria-hidden", idx === current ? "false" : "true")
    })
    thumbs.forEach((t, idx) => {
      t.classList.remove("is-active")
      if (idx === current) {
        void t.offsetWidth // restart the progress animation
        t.classList.add("is-active")
      }
    })
  }

  // Auto-advance is driven by the progress bar animation, so hover-pause is pure CSS
  thumbs.forEach((t) =>
    t
      .querySelector(".nu-thumb-progress")!
      .addEventListener("animationend", () => go(current + 1))
  )

  return h(
    "section",
    { class: "nu-hero", "aria-label": "精选推荐" },
    slides,
    h("div", { class: "nu-container nu-thumbs" }, thumbs)
  )
}

function genreBar(data: Data) {
  if (!data.genres.length) return null
  return h(
    "section",
    { class: "nu-container nu-genres" },
    h("span", { class: "nu-genres-label" }, icon("tag"), "按类型浏览"),
    h(
      "div",
      { class: "nu-genres-list" },
      data.genres.map((g) =>
        h(
          "a",
          { class: "nu-chip", href: g.href, target: "_blank", rel: "noopener" },
          g.text
        )
      )
    )
  )
}

function section(opts: {
  id: string
  title: string
  icon: IconName
  more: string
  items: Item[]
}) {
  if (!opts.items.length) return null
  return h(
    "section",
    { class: "nu-container nu-section", id: opts.id },
    h(
      "div",
      { class: "nu-section-head" },
      h(
        "div",
        {},
        h("h2", { class: "nu-section-title" }, icon(opts.icon), opts.title),
        h(
          "p",
          { class: "nu-section-sub" },
          `共 ${opts.items.length} 部 · 持续更新中`
        )
      ),
      h(
        "a",
        { class: "nu-more", href: opts.more, target: "_blank", rel: "noopener" },
        "查看全部",
        icon("arrow")
      )
    ),
    h("div", { class: "nu-grid" }, opts.items.map(card))
  )
}

/* ---------------- mount ---------------- */

bootstrap(cssText, () => {
  const data = collect()
  if (!data || (!data.movies.length && !data.tv.length)) return null
  return [
    hero(data.featured),
    genreBar(data),
    section({
      id: "nu-movie",
      title: "最新电影",
      icon: "film",
      more: "/c/movie/",
      items: data.movies
    }),
    section({
      id: "dsj",
      title: "最新电视剧",
      icon: "tv",
      more: "/c/dsj/",
      items: data.tv
    })
  ]
})
