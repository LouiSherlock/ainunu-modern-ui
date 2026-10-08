import cssText from "data-text:./detail.css"

import {
  bootstrap,
  clean,
  collectCrumbs,
  crumbsNav,
  h,
  icon,
  type IconName,
  type Link
} from "~lib/core"
import { hashHue, parseTitle, titleTags } from "~lib/title"
import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: [
    // @site-matches:detail:start
    "https://video.ainunu.com/c/*",
    "http://video.ainunu.com/c/*",
    "https://video.ainunu.org/c/*",
    "http://video.ainunu.org/c/*"
    // @site-matches:detail:end
  ],
  run_at: "document_start"
}

// Article pages, e.g. /c/movie/rihan/202609/19333.html, /c/zongyi/202608/19191.html
const DETAIL_PATH = /^\/c\/[\w-]+\/(?:[\w-]+\/)*\d+\/\d+\.html$/

const PEOPLE_KEYS = /导演|编剧|主演|演员|嘉宾|主持|配音/
const SYNOPSIS_KEYS = /简介|剧情|内容/

const CHANNEL_ICONS: Record<string, IconName> = {
  movie: "film",
  dsj: "tv",
  zongyi: "mic"
}

interface Field {
  key: string
  value: string
}

/* ---------------- parsing ---------------- */

/** Text lines of an element, split on <br> and block boundaries. */
function textLines(el: Element) {
  const out: string[] = []
  let cur = ""
  const flush = () => {
    out.push(cur)
    cur = ""
  }
  const walk = (node: Node) => {
    node.childNodes.forEach((c) => {
      if (c.nodeName === "BR") flush()
      else if (c.nodeType === Node.TEXT_NODE) cur += c.textContent
      else if (c.nodeType === Node.ELEMENT_NODE && c.nodeName !== "SCRIPT") {
        const block = /^(P|DIV|LI|UL|H\d)$/.test(c.nodeName)
        if (block) flush()
        walk(c)
        if (block) flush()
      }
    })
  }
  walk(el)
  flush()
  return out.map((s) => s.replace(/\u00a0/g, " ").trim()).filter(Boolean)
}

/** `◎译　　名　怪化猫` → { key: "译名", value: "怪化猫" } */
function parseField(line: string): Field {
  const tokens = line.replace(/^◎\s*/, "").split(/[\s\u3000]+/).filter(Boolean)
  let key = ""
  let i = 0
  if (tokens[0]?.length > 1) {
    key = tokens[0]
    i = 1
  } else {
    while (
      i < tokens.length &&
      tokens[i].length === 1 &&
      /[\u4e00-\u9fa5]/.test(tokens[i]) &&
      key.length < 4
    )
      key += tokens[i++]
  }
  return { key: key.replace(/[:：]$/, ""), value: tokens.slice(i).join(" ") }
}

const splitList = (v: string) =>
  v
    .split(/\s*[/／、,，|]\s*/)
    .map((s) => s.trim())
    .filter(Boolean)

function collect() {
  const content = document.querySelector(".content")
  const titleEl = content?.querySelector(".biaoti")
  const body = content?.querySelector(".zhengwen")
  if (!content || !titleEl || !body) return null

  const title = parseTitle(clean(titleEl.textContent))
  const updated = clean(content.querySelector(".submit")?.textContent).replace(
    /^[^:：]*[:：]\s*/,
    ""
  )

  const img = body.querySelector<HTMLImageElement>("img[src]")
  const poster = img ? img.src : ""

  const skip = ".videolist, #adcontentbottom, .fenye, script"
  const resources: Link[] = []
  const addResource = (a: HTMLAnchorElement, fallback: string) => {
    const href = a.getAttribute("href") || ""
    if (!href || /^javascript:/i.test(href) || href.startsWith("#")) return
    if (resources.some((r) => r.href === a.href)) return
    resources.push({ text: clean(a.textContent) || fallback, href: a.href })
  }
  body
    .querySelectorAll<HTMLAnchorElement>(".videolist a[href]")
    .forEach((a) => addResource(a, "资源页面"))
  body.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((a) => {
    if (a.closest(skip)) return
    if (/^(magnet|ed2k|thunder|ftp):|pan\.|drive\.|aliyundrive|quark/i.test(a.href))
      addResource(a, "下载链接")
  })

  // Walk the article text: ◎ fields first, then the synopsis
  const blocks = Array.from(body.children).filter((el) => !el.matches(skip))
  const fields: Field[] = []
  const synopsis: string[] = []
  let inSynopsis = false
  for (const block of blocks) {
    for (const line of textLines(block)) {
      if (line.startsWith("◎")) {
        const f = parseField(line)
        if (SYNOPSIS_KEYS.test(f.key)) {
          inSynopsis = true
          if (f.value) synopsis.push(f.value)
        } else if (f.key) {
          inSynopsis = false
          fields.push(f)
        }
      } else if (inSynopsis || !fields.length) {
        synopsis.push(line)
      } else {
        // Continuation of a multi-line field (usually the cast list)
        const last = fields[fields.length - 1]
        last.value = last.value
          ? `${last.value}${PEOPLE_KEYS.test(last.key) ? " / " : " "}${line}`
          : line
      }
    }
  }

  const get = (re: RegExp) =>
    fields.find((f) => re.test(f.key) && f.value)?.value || ""

  // The source often breaks lines mid-sentence; re-join those into paragraphs
  const paragraphs = synopsis.reduce<string[]>((out, line) => {
    const prev = out[out.length - 1]
    if (prev && !/[。！？!?…”」』）)~～.]$/.test(prev)) out[out.length - 1] = prev + line
    else out.push(line)
    return out
  }, [])

  // Nothing structured: keep a sanitized copy of the original article
  let prose: HTMLElement | null = null
  if (!fields.length && !synopsis.length) {
    prose = body.cloneNode(true) as HTMLElement
    prose.querySelectorAll(`${skip}, img, style, iframe`).forEach((n) => n.remove())
    prose.querySelectorAll("*").forEach((n) => {
      n.removeAttribute("style")
      n.removeAttribute("class")
      n.removeAttribute("id")
      Array.from(n.attributes).forEach((a) => {
        if (/^on/i.test(a.name)) n.removeAttribute(a.name)
      })
    })
    if (!clean(prose.textContent)) prose = null
  }

  const crumbs = collectCrumbs()
  const channelKey = location.pathname.split("/")[2] || ""
  const category = crumbs.length > 1 ? crumbs[crumbs.length - 1] : null

  const rating = get(/豆瓣评分|评分|IMDb/i).match(/\d+(?:\.\d+)?/)?.[0] || ""
  const year =
    get(/年代|年份|上映|首播/).match(/\d{4}/)?.[0] ||
    title.desc.match(/(?:19|20)\d{2}/)?.[0] ||
    ""

  return {
    title,
    updated,
    poster,
    resources,
    fields,
    synopsis: paragraphs,
    prose,
    crumbs,
    category,
    icon: CHANNEL_ICONS[channelKey] || "film",
    rating,
    year,
    region: get(/产地|国家|地区/),
    length: get(/片长|时长/),
    episodes: get(/集数/),
    platform: get(/平台|电视台|播出/),
    genres: splitList(get(/类别|类型/)).slice(0, 8),
    original: get(/^片名$|原名/),
    aka: get(/译名|又名/)
  }
}

type Data = NonNullable<ReturnType<typeof collect>>

/* ---------------- components ---------------- */

function posterEl(data: Data) {
  const hue = hashHue(data.title.name)
  const fallback = () =>
    h(
      "div",
      { class: "nu-detail-fallback", style: `--hue:${hue}` },
      h("span", {}, data.title.name.slice(0, 4))
    )
  if (!data.poster) return h("figure", { class: "nu-detail-poster" }, fallback())

  const img = h("img", {
    src: data.poster,
    alt: data.title.name,
    decoding: "async"
  })
  const fig = h("figure", { class: "nu-detail-poster is-loading" }, img)
  img.addEventListener("load", () => fig.classList.remove("is-loading"))
  img.addEventListener("error", () => {
    fig.classList.remove("is-loading")
    img.replaceWith(fallback())
    document.querySelector(".nu-detail-bg")?.remove()
  })
  return fig
}

function copyButton(href: string) {
  const label = h("span", {}, "复制链接")
  const btn = h(
    "button",
    { class: "nu-btn nu-btn--ghost nu-btn--static", type: "button" },
    icon("copy"),
    label
  )
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(href)
      label.textContent = "已复制"
    } catch {
      window.prompt("复制下面的链接：", href)
      return
    }
    btn.classList.add("is-done")
    window.setTimeout(() => {
      label.textContent = "复制链接"
      btn.classList.remove("is-done")
    }, 1800)
  })
  return btn
}

function hero(data: Data) {
  const t = data.title
  const alt = [data.original, data.aka]
    .flatMap(splitList)
    .filter((n, i, all) => n !== t.name && all.indexOf(n) === i)
    .slice(0, 3)

  const facts = [
    data.rating
      ? h("span", { class: "nu-fact nu-fact--rating" }, icon("star"), data.rating)
      : null,
    data.year ? h("span", { class: "nu-fact" }, data.year) : null,
    data.region ? h("span", { class: "nu-fact" }, data.region) : null,
    data.length ? h("span", { class: "nu-fact" }, data.length) : null,
    data.episodes ? h("span", { class: "nu-fact" }, `${data.episodes.replace(/集$/, "")} 集`) : null,
    data.platform ? h("span", { class: "nu-fact" }, data.platform) : null
  ].filter(Boolean)

  const main = data.resources[0]
  const tags = titleTags(t)

  return h(
    "section",
    { class: "nu-detail-hero" },
    data.poster
      ? h("div", {
          class: "nu-detail-bg",
          style: `background-image:url("${data.poster.replace(/"/g, "%22")}")`,
          "aria-hidden": "true"
        })
      : null,
    h(
      "div",
      { class: "nu-container nu-detail-inner" },
      crumbsNav(data.crumbs, t.name),
      h(
        "div",
        { class: "nu-detail-top" },
        posterEl(data),
        h(
          "div",
          { class: "nu-detail-info" },
          tags.length ? h("div", { class: "nu-detail-tags" }, tags) : null,
          h("h1", { class: "nu-detail-title" }, t.name),
          alt.length ? h("p", { class: "nu-detail-alt" }, alt.join(" · ")) : null,
          facts.length
            ? h("div", { class: "nu-detail-facts" }, facts)
            : t.desc
              ? h("p", { class: "nu-detail-alt" }, t.desc)
              : null,
          data.genres.length
            ? h(
                "div",
                { class: "nu-detail-genres" },
                data.genres.map((g) => h("span", { class: "nu-chip" }, g))
              )
            : null,
          h(
            "div",
            { class: "nu-detail-actions" },
            main
              ? h(
                  "a",
                  {
                    class: "nu-btn nu-btn--primary",
                    href: main.href,
                    target: "_blank",
                    rel: "noopener"
                  },
                  icon("play"),
                  main.text.replace(/^点击/, "")
                )
              : null,
            main ? copyButton(main.href) : null,
            data.category
              ? h(
                  "a",
                  { class: "nu-btn nu-btn--ghost", href: data.category.href },
                  `更多${data.category.text}`,
                  icon("arrow")
                )
              : null
          ),
          data.updated
            ? h(
                "p",
                { class: "nu-detail-updated" },
                icon("clock"),
                `最后更新 ${data.updated}`
              )
            : null
        )
      )
    )
  )
}

function card(title: string, iconName: IconName, ...children: HTMLElement[]) {
  return h(
    "section",
    { class: "nu-card" },
    h("h2", { class: "nu-card-title" }, icon(iconName), title),
    children
  )
}

function synopsisCard(data: Data) {
  if (!data.synopsis.length) return null
  return card(
    "剧情简介",
    "text",
    h(
      "div",
      { class: "nu-synopsis" },
      data.synopsis.map((p) => h("p", {}, p))
    )
  )
}

function resourcesCard(data: Data) {
  if (data.resources.length < 2) return null
  return card(
    "全部资源",
    "external",
    h(
      "div",
      { class: "nu-resources" },
      data.resources.map((r, i) =>
        h(
          "a",
          { class: "nu-resource", href: r.href, target: "_blank", rel: "noopener" },
          h("span", { class: "nu-resource-no" }, String(i + 1).padStart(2, "0")),
          h("span", { class: "nu-resource-text" }, r.text),
          icon("external")
        )
      )
    )
  )
}

function infoCard(data: Data) {
  const rows = data.fields.filter((f) => f.value)
  if (!rows.length) return null
  return card(
    "影片信息",
    "info",
    h(
      "dl",
      { class: "nu-info" },
      rows.map((f) => {
        const people = PEOPLE_KEYS.test(f.key) ? splitList(f.value) : []
        return h(
          "div",
          { class: `nu-info-row ${people.length > 1 ? "is-people" : ""}` },
          h("dt", {}, f.key),
          h(
            "dd",
            {},
            people.length > 1
              ? people.map((p) => h("span", { class: "nu-person" }, p))
              : f.value
          )
        )
      })
    )
  )
}

function bodySection(data: Data) {
  const main = [
    synopsisCard(data),
    resourcesCard(data),
    data.prose
      ? card("详细内容", "text", Object.assign(data.prose, { className: "nu-prose" }))
      : null
  ].filter(Boolean)
  const side = infoCard(data)
  if (!main.length && !side) return null
  return h(
    "div",
    { class: `nu-container nu-detail-body ${side && main.length ? "" : "is-single"}` },
    main.length ? h("div", { class: "nu-detail-main" }, main) : null,
    side ? h("aside", { class: "nu-detail-side" }, side) : null
  )
}

/* ---------------- mount ---------------- */

if (DETAIL_PATH.test(location.pathname)) {
  bootstrap(cssText, () => {
    const data = collect()
    if (!data) return null
    return [hero(data), bodySection(data)]
  })
}
