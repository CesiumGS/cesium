/**
 * Data attribution over an engine view, as 1.x shows it: the attributions
 * a provider requires on screen (ion's non-collapsible ones: logos and
 * notices) in a compact bar at the bottom left, and a "Data attribution"
 * panel listing the rest (collapsible notices, then the data credits of the
 * tiles on screen, most frequent first). Plain DOM beside the inspector,
 * for any app.
 *
 * ion's attribution HTML is parsed, not injected: only logo images, link
 * URLs (http and https) and text are carried over.
 */

/** What the view must credit now. */
export interface CreditSource {
  /**
   * Provider attributions (ion's HTML: logos, links, notices); collapsible
   * ones may be listed behind "Data attribution" instead of on screen.
   */
  attributions: ReadonlyArray<{ html: string; collapsible?: boolean }>;
  /** Data credits of the content on screen. */
  credits: readonly string[];
}

export interface CreditsHandle {
  readonly element: HTMLElement;
  dispose(): void;
}

/** Attaches the credits over `element` (positioned relative to it). */
export function attachCredits(
  element: HTMLElement,
  source: () => CreditSource,
  options: { interval?: number } = {},
): CreditsHandle {
  injectStyle();
  const root = document.createElement("div");
  root.className = "cesium-credits";
  for (const type of ["pointerdown", "pointerup", "wheel", "dblclick"]) {
    root.addEventListener(type, (e) => e.stopPropagation());
  }
  const bar = document.createElement("div");
  bar.className = "cc-bar";
  const logos = document.createElement("span");
  logos.className = "cc-logos";
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "cc-toggle";
  toggle.setAttribute("aria-expanded", "false");
  toggle.hidden = true;
  bar.append(logos, toggle);
  const panel = document.createElement("div");
  panel.className = "cc-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Data attribution");
  panel.hidden = true;
  const title = document.createElement("div");
  title.className = "cc-title";
  title.textContent = "Data attribution";
  const list = document.createElement("ul");
  list.className = "cc-list";
  panel.append(title, list);
  root.append(bar, panel);
  element.append(root);

  const setOpen = (open: boolean) => {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  };
  // `hidden` may also be "until-found", which is hidden too.
  toggle.addEventListener("click", () => setOpen(panel.hidden !== false));
  const outside = (e: PointerEvent) => {
    if (!panel.hidden && !root.contains(e.target as Node)) {
      setOpen(false);
    }
  };
  const escape = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
    }
  };
  document.addEventListener("pointerdown", outside);
  document.addEventListener("keydown", escape);

  let key = "";
  const refresh = () => {
    const { attributions, credits } = source();
    const next = JSON.stringify([attributions, credits]);
    if (next === key) {
      return;
    }
    key = next;
    logos.replaceChildren();
    list.replaceChildren();
    // Several ion assets each bring the ion logo and notice: show each once.
    const seen = new Set<string>();
    const row = (content: Node | string, key: string, href?: string) => {
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      const li = document.createElement("li");
      li.append(href ? link(href, content) : content);
      list.append(li);
    };
    for (const { html, collapsible } of attributions) {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const text = doc.body.textContent?.trim();
      const href = safeLink(
        doc.querySelector("a")?.getAttribute("href") ?? null,
      );
      if (collapsible) {
        // Behind "Data attribution", as 1.x lists it.
        if (text) {
          row(text, text, href);
        }
        continue;
      }
      for (const img of doc.querySelectorAll("img")) {
        // Remote logos, data URIs and the engine's own bundled ones.
        const raw = img.getAttribute("src") ?? "";
        const src = /^data:image\//i.test(raw)
          ? raw
          : new URL(raw, location.href).href;
        if (!/^(https?:|data:image\/)/i.test(src) || seen.has(src)) {
          continue;
        }
        seen.add(src);
        const logo = document.createElement("img");
        logo.src = src;
        logo.alt = img.getAttribute("alt") ?? img.getAttribute("title") ?? "";
        logo.title = logo.alt;
        const href = safeLink(img.closest("a")?.getAttribute("href") ?? null);
        logos.append(href ? link(href, logo) : logo);
      }
      if (!text || seen.has(text)) {
        continue;
      }
      // A required notice stays on screen, truncated when long (the full
      // text in its tooltip).
      seen.add(text);
      const inline = inlineText(doc);
      inline.title = text;
      logos.append(inline);
    }
    for (const credit of credits) {
      row(credit, credit);
    }
    const count = list.childElementCount;
    toggle.hidden = count === 0;
    toggle.textContent = `Data attribution (${count})`;
    root.hidden = logos.childElementCount === 0 && count === 0;
    if (count === 0) {
      setOpen(false);
    }
  };
  refresh();
  const timer = setInterval(refresh, options.interval ?? 500);

  return {
    element: root,
    dispose() {
      clearInterval(timer);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      root.remove();
    },
  };
}

function safeLink(href: string | null): string | undefined {
  return href && /^https?:/i.test(href) ? href : undefined;
}

function link(href: string, content: Node | string): HTMLAnchorElement {
  const a = document.createElement("a");
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.append(content);
  return a;
}

/** Text with its links (http/https only) and nothing else. */
function inlineText(doc: Document): HTMLElement {
  const span = document.createElement("span");
  span.className = "cc-text";
  const walk = (node: Node) => {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        span.append(child.textContent ?? "");
      } else if (child instanceof Element && child.tagName === "A") {
        const href = safeLink(child.getAttribute("href"));
        const text = child.textContent ?? "";
        span.append(href ? link(href, text) : text);
      } else {
        walk(child);
      }
    }
  };
  walk(doc.body);
  return span;
}

const STYLE_ID = "cesium-credits-style";

function injectStyle(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.append(style);
}

const CSS = `
.cesium-credits { position: absolute; inset: auto 8px 8px 8px; pointer-events: none; z-index: 1; font: 11px/1.4 system-ui, sans-serif; }
.cesium-credits[hidden] { display: none; }
.cesium-credits .cc-bar {
  display: inline-flex; align-items: center; gap: 10px; max-width: 100%;
  padding: 4px 8px; border-radius: 6px; pointer-events: auto;
  background: rgba(11, 14, 20, 0.55); backdrop-filter: blur(4px);
}
.cesium-credits .cc-logos { display: flex; align-items: center; gap: 8px; min-width: 0; }
/* Logos keep their aspect ratio; notices truncate instead. */
.cesium-credits .cc-logos > a, .cesium-credits .cc-logos > img { flex: none; display: block; }
.cesium-credits .cc-logos img { height: 16px; width: auto; max-width: none; display: block; }
.cesium-credits .cc-text { flex: 0 1 auto; min-width: 0; color: #c3cad8; white-space: nowrap; max-width: 32ch; overflow: hidden; text-overflow: ellipsis; }
.cesium-credits a { color: #8ab8ff; }
.cesium-credits .cc-toggle {
  background: none; border: none; padding: 0; color: #c3cad8; font: inherit;
  text-decoration: underline dotted; text-underline-offset: 3px; cursor: pointer; white-space: nowrap;
}
.cesium-credits .cc-toggle:hover { color: #fff; }
.cesium-credits .cc-toggle:focus-visible { outline: 2px solid #8ab8ff; outline-offset: 2px; }
.cesium-credits .cc-panel {
  position: absolute; left: 0; bottom: 32px; max-width: min(520px, 100%); max-height: 240px;
  overflow-y: auto; padding: 10px 12px; pointer-events: auto;
  border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px;
  background: rgba(11, 14, 20, 0.94); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  font-size: 12px; color: #aab2c3;
}
.cesium-credits .cc-panel[hidden] { display: none; }
.cesium-credits .cc-title { color: #e6e9ef; font-weight: 600; margin-bottom: 6px; }
.cesium-credits .cc-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; }
`;
