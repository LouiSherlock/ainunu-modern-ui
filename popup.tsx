import { useEffect, useState } from "react"

import { getEnabled, onEnabledChange, setEnabled } from "~lib/settings"

import "./popup.css"

const SITE = "https://video.ainunu.com/"
const HOSTS = [/(^|\.)ainunu\.com$/, /(^|\.)got06\.com$/]

const PAGES = [
  { name: "首页", hue: 340 },
  { name: "频道列表", hue: 20 },
  { name: "影片详情", hue: 265 },
  { name: "资源下载", hue: 190 },
  { name: "搜索结果", hue: 140 }
]

type TabState = "loading" | "match" | "other"

function IndexPopup() {
  const [on, setOn] = useState<boolean | null>(null)
  const [tab, setTab] = useState<TabState>("loading")

  useEffect(() => {
    getEnabled().then(setOn)
    onEnabledChange(setOn)
    chrome.tabs
      .query({ active: true, currentWindow: true })
      .then(([t]) => {
        let host = ""
        try {
          host = new URL(t?.url || "").hostname
        } catch {
          /* chrome:// etc. */
        }
        setTab(HOSTS.some((re) => re.test(host)) ? "match" : "other")
      })
      .catch(() => setTab("other"))
  }, [])

  const toggle = () => {
    if (on === null) return
    setOn(!on)
    setEnabled(!on)
  }

  const status =
    tab === "loading"
      ? ""
      : tab === "other"
        ? "当前标签页不是爱努努站点"
        : on
          ? "当前页面已美化，实时生效"
          : "当前页面显示原始样式"

  return (
    <div className={`pp ${on ? "is-on" : "is-off"}`}>
      <div className="pp-blob pp-blob--a" />
      <div className="pp-blob pp-blob--b" />
      <div className="pp-blob pp-blob--c" />

      <header className="pp-head">
        <div className="pp-logo">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
          </svg>
        </div>
        <div>
          <h1>Ainunu UI</h1>
          <p>爱努努影视 · 现代界面</p>
        </div>
      </header>

      <section className="pp-card pp-main">
        <div className="pp-main-text">
          <span className="pp-label">美化界面</span>
          <span className="pp-state">
            <i className="pp-dot" />
            {on === null ? "读取中…" : on ? "已开启" : "已关闭"}
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!!on}
          aria-label="开启或关闭美化界面"
          className="pp-switch"
          disabled={on === null}
          onClick={toggle}>
          <span className="pp-knob" />
        </button>
      </section>

      {status && <p className="pp-status">{status}</p>}

      <section className="pp-card pp-list">
        <span className="pp-caption">覆盖页面</span>
        <div className="pp-chips">
          {PAGES.map((p) => (
            <span
              key={p.name}
              className="pp-chip"
              style={{ "--hue": p.hue } as React.CSSProperties}>
              {p.name}
            </span>
          ))}
        </div>
      </section>

      <a className="pp-card pp-link" href={SITE} target="_blank" rel="noreferrer">
        <span>打开爱努努影视</span>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 17 17 7M9 7h8v8" />
        </svg>
      </a>
    </div>
  )
}

export default IndexPopup
