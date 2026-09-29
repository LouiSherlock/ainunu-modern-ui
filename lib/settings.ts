export const ENABLED_KEY = "nu-enabled"

export async function getEnabled(): Promise<boolean> {
  try {
    const res = await chrome.storage.local.get(ENABLED_KEY)
    return res[ENABLED_KEY] !== false
  } catch {
    return true
  }
}

export function setEnabled(on: boolean) {
  return chrome.storage.local.set({ [ENABLED_KEY]: on })
}

export function onEnabledChange(cb: (on: boolean) => void) {
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && ENABLED_KEY in changes)
        cb(changes[ENABLED_KEY].newValue !== false)
    })
  } catch {
    /* extension context unavailable */
  }
}
