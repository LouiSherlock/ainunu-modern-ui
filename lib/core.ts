import baseCss from "data-text:./base.css"

import { getEnabled, onEnabledChange } from "./settings"

const THEME_KEY = "nu-theme"

export const root = document.documentElement

export const storage = {
  get(store: Storage, key: string) {
    try {
      return store.getItem(key)
    } catch {
      return null
    }
  },
  set(store: Storage, key: string, value: string) {
    try {
      store.setItem(key, value)
    } catch {
      /* ignore */
    }
  }
}

/* ---------------- DOM helpers ---------------- */

export type Child = Node | string | null | undefined | false

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, unknown> = {},
  ...children: (Child | Child[])[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag)
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue
    if (key === "class") el.className = String(value)
    else if (key.startsWith("on") && typeof value === "function")
      el.addEventListener(key.slice(2).toLowerCase(), value as EventListener)
    else el.setAttribute(key, value === true ? "" : String(value))
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue
    el.append(
      typeof child === "string" ? document.createTextNode(child) : child
    )
  }
  return el
}

export const ICONS = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.9-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z"/></svg>',
  search:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  arrow:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg>',
  right:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>',
  close:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  film: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 3v18M17 3v18M3 7.5h4M3 12h18M3 16.5h4M17 7.5h4M17 16.5h4"/></svg>',
  tv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="3"/><path d="m17 2-5 5-5-5"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10a7 7 0 0 1-14 0M12 17v5M8 22h8"/></svg>',
  tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"/><circle cx="7" cy="7" r="1.5"/></svg>',
  calendar:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
  external:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2"/></svg>',
  check:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>',
  clock:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2.8 2.83 5.73 6.33.92-4.58 4.46 1.08 6.3L12 17.24l-5.66 2.97 1.08-6.3L2.84 9.45l6.33-.92L12 2.8Z"/></svg>',
  text: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 11h16M4 16h10"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'
}

export type IconName = keyof typeof ICONS

export function icon(name: IconName, cls = "") {
  const span = h("span", { class: `nu-icon ${cls}`, "aria-hidden": "true" })
  span.innerHTML = ICONS[name]
  return span
}

export const clean = (s: string | null | undefined) =>
  (s || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim()

export const isTyping = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement
  return /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable
}

/* ---------------- shared page data ---------------- */

export function collectCommon() {
  const nav = Array.from(
    document.querySelectorAll<HTMLAnchorElement>("#nav a")
  )
    .map((a) => ({
      text: clean(a.textContent).replace(/\s/g, ""),
      href: a.href
    }))
    .filter((n) => n.text)

  const headStrong = document.querySelector("#headtag strong")
  const backupLink = headStrong?.querySelector<HTMLAnchorElement>("a")
  const backup = backupLink
    ? {
        text: clean(headStrong!.textContent)
          .replace(clean(backupLink.textContent), "")
          .trim(),
        href: backupLink.href,
        label: clean(backupLink.textContent)
      }
    : null

  const logoAlt = document.querySelector<HTMLImageElement>(
    ".head .logo img"
  )?.alt
  return {
    nav,
    backup,
    form: document.querySelector<HTMLFormElement>('form[name="formsearch"]'),
    /** Nav href to highlight; empty = derive from the current path */
    activeHref: "",
    siteName:
      clean(logoAlt) || clean(document.title).split("_").pop() || "爱奴奴"
  }
}

export type Common = ReturnType<typeof collectCommon>

export interface Link {
  text: string
  href: string
}

/** Breadcrumb links from the original "当前位置" bar (the home link has no text). */
export function collectCrumbs(): Link[] {
  return Array.from(document.querySelectorAll<HTMLAnchorElement>(".floatleft a"))
    .map((a, i) => ({
      text: clean(a.textContent) || (i === 0 ? "首页" : ""),
      href: a.href
    }))
    .filter((c) => c.text)
}

/* ---------------- shared components ---------------- */

/** Breadcrumbs; the last item is rendered as the current page unless `current` is given. */
export function crumbsNav(crumbs: Link[], current?: string) {
  const items: (Link | string)[] = current ? [...crumbs, current] : crumbs
  return h(
    "nav",
    { class: "nu-crumbs", "aria-label": "当前位置" },
    items.flatMap((c, i) => [
      i > 0 ? icon("right", "nu-crumb-sep") : null,
      typeof c === "string" || i === items.length - 1
        ? h("span", { "aria-current": "page" }, typeof c === "string" ? c : c.text)
        : h("a", { href: c.href }, c.text)
    ])
  )
}

export function header(data: Common) {
  const path = location.pathname.replace(/index\.html?$/, "")
  const nav = h(
    "nav",
    { class: "nu-nav", "aria-label": "主导航" },
    data.nav.map((n) => {
      let active = false
      try {
        const u = new URL(n.href)
        if (data.activeHref) active = n.href === data.activeHref
        else if (u.origin === location.origin)
          active = u.pathname === "/" ? path === "/" : path.startsWith(u.pathname)
      } catch {
        /* ignore */
      }
      return h("a", { href: n.href, class: active ? "is-active" : "" }, n.text)
    })
  )

  const search = h(
    "div",
    { class: "nu-search" },
    icon("search", "nu-search-icon")
  )
  if (data.form) {
    // Reuse the original form so the site's GBK search submission keeps working
    const form = data.form
    Array.from(form.childNodes).forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) n.remove()
    })
    const input = form.querySelector<HTMLInputElement>('input[name="keyword"]')
    if (input) {
      input.className = "nu-search-input"
      input.removeAttribute("style")
      input.placeholder = "搜索电影、电视剧…"
      input.autocomplete = "off"
    }
    const submit = form.querySelector<HTMLInputElement>('input[type="submit"]')
    if (submit) {
      submit.className = "nu-search-btn"
      submit.value = "搜索"
    }
    form.className = "nu-search-form"
    form.removeAttribute("style")
    search.append(form, h("kbd", { class: "nu-kbd" }, "/"))
  }

  const themeBtn = h(
    "button",
    {
      class: "nu-icon-btn nu-theme-btn",
      type: "button",
      title: "切换主题",
      "aria-label": "切换主题",
      onclick: () => {
        const next = root.dataset.nuTheme === "light" ? "dark" : "light"
        root.dataset.nuTheme = next
        storage.set(localStorage, THEME_KEY, next)
      }
    },
    icon("sun", "nu-sun"),
    icon("moon", "nu-moon")
  )

  const el = h(
    "header",
    { class: "nu-header" },
    h(
      "div",
      { class: "nu-container nu-header-inner" },
      h(
        "a",
        { class: "nu-brand", href: data.nav[0]?.href || "/" },
        h("span", { class: "nu-logo" }, icon("play")),
        h("span", { class: "nu-brand-text" }, data.siteName)
      ),
      nav,
      search,
      themeBtn
    )
  )
  const onScroll = () =>
    el.classList.toggle("is-scrolled", window.scrollY > 8)
  window.addEventListener("scroll", onScroll, { passive: true })
  onScroll()
  return el
}

export function footer(data: Common) {
  return h(
    "footer",
    { class: "nu-footer" },
    h(
      "div",
      { class: "nu-container nu-footer-inner" },
      h("span", {}, `© ${new Date().getFullYear()} ${data.siteName}`),
      data.backup
        ? h(
            "span",
            {},
            "备用地址：",
            h(
              "a",
              { href: data.backup.href, target: "_blank", rel: "noopener" },
              data.backup.label
            )
          )
        : null
    )
  )
}

export function backToTop() {
  const btn = h(
    "button",
    {
      class: "nu-icon-btn nu-top",
      type: "button",
      "aria-label": "返回顶部",
      onclick: () => window.scrollTo({ top: 0, behavior: "smooth" })
    },
    icon("up")
  )
  window.addEventListener(
    "scroll",
    () => btn.classList.toggle("is-visible", window.scrollY > 600),
    { passive: true }
  )
  return btn
}


/* ---------------- bootstrap ---------------- */

/**
 * Applies the theme and hides the original page before first paint, then calls
 * `build` once the DOM is ready. `build` returns the page body (placed between
 * header and footer) or null to leave the original page untouched.
 * Honours the popup on/off switch and reacts to it live.
 */
export function bootstrap(
  pageCss: string,
  build: (common: Common) => Child[] | null,
  overrides: () => Partial<Common> = () => ({})
) {
  const style = document.createElement("style")
  style.id = "nu-style"
  style.textContent = baseCss + "\n" + pageCss
  let failSafe = 0
  let active = false

  const reveal = () => {
    window.clearTimeout(failSafe)
    root.classList.remove("nu-pending")
  }

  const mount = () => {
    if (!active) return
    try {
      if (document.getElementById("nu-app")) return
      const common = { ...collectCommon(), ...overrides() }
      const body = build(common)
      if (!body) return

      const app = h(
        "div",
        { id: "nu-app" },
        header(common),
        h("main", { class: "nu-main" }, body),
        footer(common),
        backToTop()
      )
      document.body.append(app)
      root.classList.add("nu-on")
    } catch (err) {
      console.error("[ainunu-ui] failed to mount", err)
      document.getElementById("nu-app")?.remove()
      root.classList.remove("nu-on")
    } finally {
      reveal()
    }
  }

  const enable = () => {
    if (active) return
    active = true
    root.dataset.nuTheme =
      storage.get(localStorage, THEME_KEY) === "light" ? "light" : "dark"
    if (!style.isConnected) (document.head || root).appendChild(style)
    if (document.readyState === "loading") {
      root.classList.add("nu-pending")
      failSafe = window.setTimeout(reveal, 4000)
      document.addEventListener("DOMContentLoaded", mount, { once: true })
    } else {
      mount()
    }
  }

  const disable = () => {
    active = false
    reveal()
    document.getElementById("nu-app")?.remove()
    root.classList.remove("nu-on")
    delete root.dataset.nuTheme
    style.remove()
  }

  // hide synchronously to avoid a flash of the original page while the
  // (async) setting is read; revealed immediately if the switch is off
  root.classList.add("nu-pending")
  ;(document.head || root).appendChild(style)
  root.dataset.nuTheme =
    storage.get(localStorage, THEME_KEY) === "light" ? "light" : "dark"
  failSafe = window.setTimeout(reveal, 4000)

  getEnabled().then((on) => (on ? enable() : disable()))
  onEnabledChange((on) => (on ? enable() : disable()))

  document.addEventListener("keydown", (e) => {
    if (!active || e.key !== "/" || isTyping(e)) return
    const input = document.querySelector<HTMLInputElement>(
      "#nu-app .nu-search-input"
    )
    if (input) {
      e.preventDefault()
      input.focus()
    }
  })
}
