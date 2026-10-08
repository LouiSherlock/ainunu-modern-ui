import { h, icon, isTyping } from "./core"

export interface PageInfo {
  current: number
  total: number
  summary?: string
  url: (n: number) => string
}

export function pager(page: PageInfo) {
  const { current, total, url } = page
  if (total <= 1) return null

  const nums: (number | null)[] = []
  const add = (n: number) => {
    if (n >= 1 && n <= total && !nums.includes(n)) nums.push(n)
  }
  add(1)
  if (current - 2 > 2) nums.push(null)
  for (let n = current - 2; n <= current + 2; n++) add(n)
  if (current + 2 < total - 1) nums.push(null)
  add(total)

  const arrow = (n: number, dir: "left" | "right", label: string) =>
    n >= 1 && n <= total
      ? h("a", { class: "nu-page-btn nu-page-arrow", href: url(n), "aria-label": label }, icon(dir), h("span", {}, label))
      : h("span", { class: "nu-page-btn nu-page-arrow is-disabled", "aria-disabled": "true" }, icon(dir), h("span", {}, label))

  const jump = h("input", {
    class: "nu-page-input",
    type: "number",
    min: "1",
    max: String(total),
    placeholder: String(current),
    "aria-label": "跳转页码"
  })
  const go = () => {
    const n = Math.round(Number(jump.value))
    if (n >= 1 && n <= total && n !== current) location.href = url(n)
  }
  jump.addEventListener("keydown", (e) => {
    if (e.key === "Enter") go()
  })

  return h(
    "nav",
    { class: "nu-container nu-pager", "aria-label": "分页" },
    h(
      "div",
      { class: "nu-pager-main" },
      arrow(current - 1, "left", "上一页"),
      h(
        "div",
        { class: "nu-page-nums" },
        nums.map((n) =>
          n === null
            ? h("span", { class: "nu-page-gap" }, "…")
            : n === current
              ? h("span", { class: "nu-page-btn is-current", "aria-current": "page" }, String(n))
              : h("a", { class: "nu-page-btn", href: url(n) }, String(n))
        )
      ),
      arrow(current + 1, "right", "下一页")
    ),
    h(
      "div",
      { class: "nu-pager-jump" },
      "前往",
      jump,
      "页",
      h("button", { class: "nu-page-go", type: "button", onclick: go }, "跳转"),
      h("span", { class: "nu-pager-hint" }, h("kbd", {}, "←"), h("kbd", {}, "→"), " 翻页")
    ),
    page.summary
      ? h("p", { class: "nu-page-sub nu-pager-summary" }, page.summary)
      : null
  )
}

/** ←/→ page navigation */
export function pagerKeys(page: PageInfo) {
  document.addEventListener("keydown", (e) => {
    if (isTyping(e) || e.altKey || e.ctrlKey || e.metaKey) return
    const { current, total, url } = page
    if (e.key === "ArrowLeft" && current > 1) location.href = url(current - 1)
    if (e.key === "ArrowRight" && current < total) location.href = url(current + 1)
  })
}
