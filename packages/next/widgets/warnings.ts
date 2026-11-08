/**
 * A small notice over an engine view for what the view gets wrong without
 * saying so otherwise: the frames data that didn't load, or is out of date
 * (plan 5a's call 33). Collapsed, one line at the top left: an attention
 * icon, the latest warning's summary and how many there are. Opened, the list in full. Dismissed, it hides until the next
 * warning. Plain DOM, themed by the same --cesium-ui-* properties as the
 * credits and the time controls; nothing is built until the first warning.
 */

/** One warning: its message in full, and a few words for the collapsed line. */
export interface NoticeWarning {
  readonly message: string;
  /** Default: the message (truncated, in full in its tooltip). */
  readonly summary?: string;
}

/** What the notice lists: each warning, in order. */
export interface WarningsHandle {
  /** The warnings to list; a new one shows a dismissed notice again. */
  set(warnings: readonly NoticeWarning[]): void;
  dispose(): void;
}

/** Attaches the notice over `element` (positioned relative to it). */
export function attachWarnings(element: HTMLElement): WarningsHandle {
  let parts: ReturnType<typeof build> | undefined;
  let shown = 0;
  let dismissed = 0;

  const build = () => {
    injectStyle();
    const root = document.createElement("div");
    root.className = "cesium-warnings";
    for (const type of ["pointerdown", "pointerup", "wheel", "dblclick"]) {
      root.addEventListener(type, (e) => e.stopPropagation());
    }
    const bar = document.createElement("div");
    bar.className = "cw-bar";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "cw-toggle";
    toggle.setAttribute("aria-expanded", "false");
    const icon = document.createElement("span");
    icon.className = "cw-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = ATTENTION_ICON; // a constant: no data reaches it
    const summary = document.createElement("span");
    summary.className = "cw-summary";
    const count = document.createElement("span");
    count.className = "cw-count";
    toggle.append(icon, summary, count);
    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.className = "cw-dismiss";
    dismiss.setAttribute("aria-label", "Dismiss warnings");
    dismiss.title = "Dismiss";
    dismiss.innerHTML = CLOSE_ICON; // a constant
    bar.append(toggle, dismiss);
    const panel = document.createElement("div");
    panel.className = "cw-panel";
    panel.id = `cesium-warnings-${++notices}`;
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", "Warnings");
    panel.hidden = true;
    toggle.setAttribute("aria-controls", panel.id);
    const list = document.createElement("ul");
    list.className = "cw-list";
    panel.append(list);
    // Announced as it changes, politely: it never takes focus.
    const live = document.createElement("div");
    live.className = "cw-live";
    live.setAttribute("role", "status");
    root.append(bar, panel, live);
    element.append(root);

    const setOpen = (open: boolean) => {
      panel.hidden = !open;
      toggle.setAttribute("aria-expanded", String(open));
    };
    toggle.addEventListener("click", () => setOpen(panel.hidden !== false));
    dismiss.addEventListener("click", () => {
      setOpen(false);
      dismissed = shown;
      root.hidden = true;
    });
    const outside = (e: PointerEvent) => {
      if (!panel.hidden && !root.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !panel.hidden) {
        setOpen(false);
        toggle.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return {
      root,
      toggle,
      summary,
      count,
      list,
      live,
      setOpen,
      dispose: () => {
        document.removeEventListener("pointerdown", outside);
        document.removeEventListener("keydown", escape);
        root.remove();
      },
    };
  };

  return {
    set(warnings) {
      if (warnings.length === 0) {
        if (parts) {
          parts.setOpen(false);
          parts.root.hidden = true;
        }
        shown = dismissed = 0;
        return;
      }
      parts ??= build();
      const last = warnings[warnings.length - 1]!;
      const latest = last.summary ?? last.message;
      parts.summary.textContent = latest;
      parts.toggle.title = last.message;
      parts.count.textContent =
        warnings.length > 1 ? `${warnings.length} warnings` : "";
      parts.count.hidden = warnings.length < 2;
      parts.list.replaceChildren(
        ...warnings.map(({ message, summary }) => {
          const li = document.createElement("li");
          if (summary) {
            const title = document.createElement("div");
            title.className = "cw-item-title";
            title.textContent = summary;
            li.append(title);
          }
          const detail = document.createElement("div");
          detail.className = "cw-item-detail";
          detail.textContent = message;
          li.append(detail);
          return li;
        }),
      );
      if (warnings.length > shown) {
        parts.live.textContent = `Warning: ${latest}`;
      }
      shown = warnings.length;
      parts.root.hidden = dismissed >= shown;
    },
    dispose() {
      parts?.dispose();
      parts = undefined;
    },
  };
}

let notices = 0;

// StrataKit's attention icon shape (a triangle with a bar and a dot), 16 px.
const ATTENTION_ICON =
  '<svg viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" d="M8 1.5c.4 0 .8.2 1 .6l6.3 11.2c.4.8-.1 1.7-1 1.7H1.7c-.9 0-1.4-.9-1-1.7L7 2.1c.2-.4.6-.6 1-.6zm0 4a.8.8 0 0 0-.8.8v3.4a.8.8 0 0 0 1.6 0V6.3A.8.8 0 0 0 8 5.5zm0 6.3a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8z"/></svg>';
const CLOSE_ICON =
  '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M3.8 3.1 8 7.3l4.2-4.2.7.7L8.7 8l4.2 4.2-.7.7L8 8.7l-4.2 4.2-.7-.7L7.3 8 3.1 3.8z"/></svg>';

const STYLE_ID = "cesium-warnings-style";

function injectStyle(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.append(style);
}

// The credits' and time controls' --cesium-ui-* properties (StrataKit's dark
// theme by default): the same surface, border, radius, shadow and type, so
// the notice reads as one of the view's overlays. Attention is StrataKit's
// dark attention icon color. Top left, where nothing else of the Viewer's
// sits, under the inspector.
const CSS = `
.cesium-warnings {
  --cw-surface: var(--cesium-ui-surface, oklch(26.92% 0.008 268.32));
  --cw-raised: var(--cesium-ui-surface-raised, oklch(30.5% 0.009 268.32));
  --cw-border: var(--cesium-ui-border, oklch(100% 0 0 / 0.08));
  --cw-text: var(--cesium-ui-text, oklch(99.06% 0.002 247.84));
  --cw-text-muted: var(--cesium-ui-text-muted, oklch(79.56% 0.008 241.69));
  --cw-icon: var(--cesium-ui-icon, oklch(85.95% 0.006 255.48));
  --cw-hover: var(--cesium-ui-hover, oklch(100% 0 0 / 0.06));
  --cw-pressed: var(--cesium-ui-pressed, oklch(100% 0 0 / 0.1));
  --cw-attention: var(--cesium-ui-attention, oklch(69.31% 0.129 79.75));
  --cw-focus: var(--cesium-ui-focus, #8cc4ff);
  --cw-font: var(--cesium-ui-font, "InterVariable", "Inter", system-ui, sans-serif);
  --cw-shadow: var(--cesium-ui-shadow, 0 1px 0 oklch(0% 0 0 / 0.08), 0 4px 12px -2px oklch(0% 0 0 / 0.4));
  position: absolute; top: 8px; left: 8px; z-index: 2;
  max-width: min(440px, calc(100% - 16px));
  display: flex; flex-direction: column; align-items: flex-start; gap: 6px;
  font: 400 12px/16px var(--cw-font); color: var(--cw-text);
}
.cesium-warnings[hidden] { display: none; }
.cesium-warnings:has(.cw-panel:not([hidden])) { z-index: 3; }
.cesium-warnings button { font: inherit; color: inherit; }
.cesium-warnings .cw-bar {
  display: flex; align-items: center; gap: 2px; max-width: 100%; box-sizing: border-box;
  height: 36px; padding: 0 4px; border-radius: 8px;
  border: 1px solid var(--cw-border); background: var(--cw-surface); box-shadow: var(--cw-shadow);
}
.cesium-warnings .cw-toggle {
  display: flex; align-items: center; gap: 8px; min-width: 0; height: 28px; padding: 0 6px;
  border: none; border-radius: 4px; background: none; cursor: pointer; text-align: left;
}
.cesium-warnings .cw-icon { flex: none; display: grid; place-items: center; color: var(--cw-attention); }
.cesium-warnings .cw-icon svg { display: block; }
.cesium-warnings .cw-summary { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cesium-warnings .cw-count { flex: none; color: var(--cw-text-muted); white-space: nowrap; }
.cesium-warnings .cw-count[hidden] { display: none; }
.cesium-warnings .cw-dismiss {
  flex: none; display: grid; place-items: center; width: 28px; height: 28px; padding: 0;
  border: none; border-radius: 4px; background: none; color: var(--cw-icon); cursor: pointer;
}
.cesium-warnings .cw-toggle:hover, .cesium-warnings .cw-dismiss:hover { background: var(--cw-hover); }
.cesium-warnings .cw-toggle:active, .cesium-warnings .cw-dismiss:active,
.cesium-warnings .cw-toggle[aria-expanded="true"] { background: var(--cw-pressed); }
.cesium-warnings button:focus-visible { outline: 2px solid var(--cw-focus); outline-offset: -2px; }
.cesium-warnings .cw-panel {
  box-sizing: border-box; max-width: 100%; max-height: 240px; overflow-y: auto; padding: 12px;
  border: 1px solid var(--cw-border); border-radius: 8px;
  background: var(--cw-raised); box-shadow: var(--cw-shadow);
  scrollbar-width: thin; scrollbar-color: var(--cw-border) transparent;
}
.cesium-warnings .cw-panel[hidden] { display: none; }
.cesium-warnings .cw-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 10px; }
.cesium-warnings .cw-list li { display: flex; flex-direction: column; gap: 2px; overflow-wrap: anywhere; }
.cesium-warnings .cw-list li + li { padding-top: 10px; border-top: 1px solid var(--cw-border); }
.cesium-warnings .cw-item-title { color: var(--cw-text); font-weight: 600; }
.cesium-warnings .cw-item-detail { color: var(--cw-text-muted); }
.cesium-warnings .cw-live {
  position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap;
}
`;
