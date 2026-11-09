/**
 * Data attribution over an engine view, as 1.x shows it: the attributions
 * a provider requires on screen (ion's non-collapsible ones: logos and
 * notices) in a compact bar at the bottom left, and a "Data attribution"
 * panel listing the rest (the data credits of the tiles on screen, most
 * frequent first, then collapsible notices). Plain DOM beside the
 * inspector, for any app.
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
  /**
   * Credits kept on screen in the bar, as text (a sky data pack's): never
   * parsed as HTML. They are also listed with `credits`.
   */
  pinned?: readonly string[];
}

export interface CreditsHandle {
  readonly element: HTMLElement;
  /** Whether the credits show (when there are any). */
  readonly shown: boolean;
  /** Shows or hides the credits (shown by default). */
  show(on: boolean): void;
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
  let shown = true;
  const refresh = () => {
    const { attributions, credits, pinned = [] } = source();
    const next = JSON.stringify([attributions, credits, pinned]);
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
        // Behind "Data attribution", logos included, as 1.x lists it.
        const images = logosOf(doc, seen);
        if (images.length > 0 || text) {
          const span = document.createElement("span");
          span.className = "cc-entry";
          span.append(...images, text ?? "");
          row(span, text || images.map((i) => i.textContent).join(), href);
        }
        continue;
      }
      logos.append(...logosOf(doc, seen));
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
    for (const text of pinned) {
      if (!text || seen.has(text)) {
        continue;
      }
      seen.add(text);
      const span = document.createElement("span");
      span.className = "cc-text";
      span.title = text;
      span.append(text); // a text node: markup in it shows as written
      logos.append(span);
    }
    // The data credits come first in the panel, most frequent first, then
    // the providers' collapsible notices (1.x orders by frequency, and
    // providers credit once).
    const notices = [...list.children];
    for (const credit of credits) {
      row(credit, credit);
    }
    list.append(...notices);
    const count = list.childElementCount;
    toggle.hidden = count === 0;
    toggle.textContent = `Data attribution (${count})`;
    root.hidden = !shown || (logos.childElementCount === 0 && count === 0);
    if (count === 0) {
      setOpen(false);
    }
  };
  refresh();
  const timer = setInterval(refresh, options.interval ?? 500);

  return {
    element: root,
    get shown() {
      return shown;
    },
    show(on: boolean) {
      shown = on;
      key = ""; // Redraw, though the credits are the same.
      refresh();
    },
    dispose() {
      clearInterval(timer);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      root.remove();
    },
  };
}

/** An attribution's logos (each once), linked where the HTML links them. */
function logosOf(doc: Document, seen: Set<string>): Node[] {
  const out: Node[] = [];
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
    out.push(href ? link(href, logo) : logo);
  }
  return out;
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

// The same --cesium-ui-* properties as the time controls (their defaults
// follow StrataKit's dark theme): one surface, border, radius and type for
// everything over the view, and one place for an app to theme them.
const CSS = `
.cesium-credits {
  --cc-surface: var(--cesium-ui-surface, oklch(26.92% 0.008 268.32));
  --cc-raised: var(--cesium-ui-surface-raised, oklch(30.5% 0.009 268.32));
  --cc-border: var(--cesium-ui-border, oklch(100% 0 0 / 0.08));
  --cc-text: var(--cesium-ui-text, oklch(99.06% 0.002 247.84));
  --cc-text-muted: var(--cesium-ui-text-muted, oklch(79.56% 0.008 241.69));
  --cc-link: var(--cesium-ui-link, #8cc4ff);
  --cc-focus: var(--cesium-ui-focus, #8cc4ff);
  --cc-font: var(--cesium-ui-font, "InterVariable", "Inter", system-ui, sans-serif);
  --cc-shadow: var(--cesium-ui-shadow, 0 1px 0 oklch(0% 0 0 / 0.08), 0 4px 12px -2px oklch(0% 0 0 / 0.4));
  /* The viewer's overlays: the app's own at 1, credits and time controls at 2, the inspector topmost (5). */
  position: absolute; inset: auto 8px 8px 8px; pointer-events: none; z-index: 2;
  font: 400 11px/16px var(--cc-font); color: var(--cc-text-muted);
}
.cesium-credits[hidden] { display: none; }
/* Open, the list stands over the time controls (the same layer, later in the document), still under the inspector. */
.cesium-credits:has(.cc-panel:not([hidden])) { z-index: 3; }
.cesium-credits .cc-bar {
  display: inline-flex; align-items: center; gap: 10px; max-width: 100%; box-sizing: border-box;
  height: 36px; padding: 0 10px; border-radius: 8px; pointer-events: auto;
  border: 1px solid var(--cc-border); background: var(--cc-surface); box-shadow: var(--cc-shadow);
}
.cesium-credits .cc-logos { display: flex; align-items: center; gap: 8px; min-width: 0; }
/* Logos keep their aspect ratio; notices truncate instead. */
.cesium-credits .cc-logos > a, .cesium-credits .cc-logos > img { flex: none; display: block; }
.cesium-credits .cc-logos img { height: 16px; width: auto; max-width: none; display: block; }
.cesium-credits .cc-text { flex: 0 1 auto; min-width: 0; white-space: nowrap; max-width: 32ch; overflow: hidden; text-overflow: ellipsis; }
.cesium-credits a { color: var(--cc-link); }
.cesium-credits .cc-toggle {
  background: none; border: none; padding: 0; color: var(--cc-text-muted); font: inherit;
  text-decoration: underline dotted; text-underline-offset: 3px; cursor: pointer; white-space: nowrap;
}
.cesium-credits .cc-toggle:hover { color: var(--cc-text); }
.cesium-credits .cc-toggle:focus-visible { outline: 2px solid var(--cc-focus); outline-offset: 2px; }
.cesium-credits .cc-panel {
  position: absolute; left: 0; bottom: 42px; max-width: min(520px, 100%); max-height: 240px;
  overflow-y: auto; padding: 12px; pointer-events: auto; box-sizing: border-box;
  border: 1px solid var(--cc-border); border-radius: 8px;
  background: var(--cc-raised); box-shadow: var(--cc-shadow);
  scrollbar-width: thin; scrollbar-color: var(--cc-border) transparent;
  font-size: 12px; color: var(--cc-text-muted);
}
.cesium-credits .cc-panel[hidden] { display: none; }
.cesium-credits .cc-title { color: var(--cc-text); font-weight: 600; margin-bottom: 6px; }
.cesium-credits .cc-list { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; }
.cesium-credits .cc-entry { display: inline-flex; align-items: center; gap: 6px; }
.cesium-credits .cc-entry img { height: 16px; width: auto; display: block; }
`;
