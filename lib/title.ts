import { clean, h } from "./core"

export interface TitleInfo {
  name: string
  desc: string
  res: string
  src: string
  status: string
  langs: string[]
  infos: string[]
}

/** Splits a DedeCMS title like `《X》[desc][1080pBD高清中英双字]` into its parts. */
export function parseTitle(raw: string): TitleInfo {
  let name = raw
  let rest = ""
  const m = raw.match(/^《(.+?)》(.*)$/)
  if (m) {
    name = m[1]
    rest = m[2]
  } else {
    const i = raw.indexOf("[")
    if (i > 0) {
      name = raw.slice(0, i)
      rest = raw.slice(i)
    }
  }

  const parts: string[] = []
  rest.replace(/\[([^\]]*)\]|([^[\]]+)/g, (_, a?: string, b?: string) => {
    const t = clean(a ?? b)
    if (t) parts.push(t)
    return ""
  })

  const out: TitleInfo = {
    name: clean(name),
    desc: "",
    res: "",
    src: "",
    status: "",
    langs: [],
    infos: []
  }
  for (const part of parts) {
    if (/全集|完结|更新至|^第.+[集期]$|^\d+集$/.test(part)) {
      out.status = /全集|完结/.test(part) ? "已完结" : part
    } else if (/4K|2160p|1080p|720p|BD|HD|TC|TS|蓝光|高清/i.test(part)) {
      const res = part.match(/4K|2160p|1080p|720p/i)?.[0]
      if (res) out.res = res.toUpperCase().replace("2160P", "4K")
      if (/BD|蓝光/i.test(part)) out.src = "蓝光"
      else if (/HD|高清/i.test(part)) out.src = "高清"
      const lang = clean(
        part.replace(/4K|2160p|1080p|720p|BD|HD|蓝光|高清/gi, "")
      )
      if (lang) out.langs.push(lang)
    } else if (/[双三]语|国语|粤语|英语|日语|韩语|中字|双字|字幕|配音/.test(part)) {
      out.langs.push(part)
    } else if (!out.desc) {
      out.desc = part
    } else {
      out.infos.push(part)
    }
  }
  return out
}

/** Quality / status badges followed by language & extra info tags. */
export function titleTags(t: TitleInfo) {
  return [
    t.res ? h("span", { class: "nu-badge nu-badge--res" }, t.res) : null,
    t.src
      ? h(
          "span",
          { class: `nu-badge nu-badge--${t.src === "蓝光" ? "bd" : "hd"}` },
          t.src
        )
      : null,
    t.status
      ? h(
          "span",
          { class: `nu-badge nu-badge--${t.status === "已完结" ? "end" : "ep"}` },
          t.status
        )
      : null,
    ...t.langs.map((l) => h("span", { class: "nu-tag" }, l)),
    ...t.infos.map((l) => h("span", { class: "nu-tag" }, l))
  ].filter((x): x is HTMLSpanElement => !!x)
}

export function hashHue(s: string) {
  let x = 0
  for (const ch of s) x = (x * 31 + ch.charCodeAt(0)) >>> 0
  return x % 360
}
