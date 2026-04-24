// Swallow every shortcut the WebView would otherwise use to open DevTools or
// "view source". Registered at capture phase so it beats any app-level handler.
export function installDevtoolsBlocker() {
  const block = (e: KeyboardEvent) => {
    // F12 — DevTools toggle
    if (e.key === "F12") {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const mod = e.ctrlKey || e.metaKey;

    // Ctrl/Cmd + Shift + (I|J|C|K) — DevTools / Console / Inspect / Elements
    if (mod && e.shiftKey) {
      const k = e.key.toUpperCase();
      if (k === "I" || k === "J" || k === "C" || k === "K") {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }

    // Ctrl/Cmd + U — View Source
    if (mod && !e.shiftKey && e.key.toLowerCase() === "u") {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  window.addEventListener("keydown", block, { capture: true });
  // WebView2 "Inspect" entry lives in the context menu.
  window.addEventListener("contextmenu", (e) => e.preventDefault(), {
    capture: true,
  });
}
