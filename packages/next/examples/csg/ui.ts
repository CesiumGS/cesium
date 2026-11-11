/**
 * The CSG sample's panel parts (plain DOM, themed by the gallery's custom
 * properties): element helper, number-and-slider fields that say which phase
 * of an edit they are in, a segmented control, and the example's styles.
 */

/** Where an edit is: a slider moving, a typed value, or the end of either. */
export type Phase = "drag" | "type" | "commit";

export const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, unknown> = {},
  ...children: Array<Node | string>
): HTMLElementTagNameMap[K] => {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...children);
  return e;
};

export interface FieldOptions {
  label: string;
  value: number;
  /** The slider's range; the number field takes any value of at least `floor`. */
  min: number;
  max: number;
  step: number;
  /** The smallest value the number field accepts (default: the slider's min). */
  floor?: number;
  unit?: string;
  /** Called with the new value and where the edit is. */
  onChange(value: number, phase: Phase): void;
}

const decimals = (step: number) =>
  Math.max(0, Math.min(4, Math.ceil(-Math.log10(step))));

/**
 * A slider with a number field beside it. Moving the slider reports `drag`
 * on each move and `commit` on release; typing reports `type` on each
 * keystroke and `commit` on enter or leaving the field.
 */
export function field(options: FieldOptions): HTMLElement {
  const digits = decimals(options.step);
  const slider = el("input", {
    type: "range",
    min: String(options.min),
    max: String(options.max),
    step: String(options.step),
    value: String(options.value),
    ariaLabel: options.label,
  });
  const number = el("input", {
    type: "number",
    step: String(options.step),
    value: options.value.toFixed(digits),
    ariaLabel: `${options.label}, typed`,
  });
  const floor = options.floor ?? options.min;
  slider.addEventListener("input", () => {
    const value = Number(slider.value);
    number.value = value.toFixed(digits);
    options.onChange(value, "drag");
  });
  slider.addEventListener("change", () =>
    options.onChange(Number(slider.value), "commit"),
  );
  const typed = (phase: Phase) => {
    const value = Number(number.value);
    if (number.value === "" || !Number.isFinite(value) || value < floor) {
      return false;
    }
    slider.value = String(value);
    options.onChange(value, phase);
    return true;
  };
  number.addEventListener("input", () => typed("type"));
  number.addEventListener("change", () => {
    if (!typed("commit")) {
      number.value = Number(slider.value).toFixed(digits);
    }
  });
  return el(
    "label",
    { className: "csg-field" },
    el("span", {}, options.label),
    slider,
    el("span", { className: "csg-number" }, number, options.unit ?? ""),
  );
}

/** A row of exclusive buttons. */
export function segmented<T extends string>(
  label: string,
  choices: ReadonlyArray<{ value: T; label: string; title?: string }>,
  current: () => T,
  choose: (value: T) => void,
): { element: HTMLElement; sync(): void; disable(on: boolean): void } {
  const buttons = choices.map((choice) =>
    el(
      "button",
      {
        type: "button",
        title: choice.title ?? choice.label,
        onclick: () => {
          choose(choice.value);
          sync();
        },
      },
      choice.label,
    ),
  );
  const sync = () =>
    buttons.forEach((button, i) =>
      button.setAttribute(
        "aria-pressed",
        String(choices[i]!.value === current()),
      ),
    );
  sync();
  return {
    element: el(
      "div",
      { className: "csg-segmented", role: "group", ariaLabel: label },
      ...buttons,
    ),
    sync,
    disable: (on) => buttons.forEach((button) => (button.disabled = on)),
  };
}

export const CSS = `
.csg-view:focus-visible { outline: 2px solid var(--cesium-ui-focus, Highlight); outline-offset: -2px; }
.csg-view canvas { transition: opacity 160ms; }
.csg-view[data-loading] canvas { opacity: 0.5; }
@media (prefers-reduced-motion: reduce) {
  .csg-view canvas { transition: none; }
  .csg-spinner { animation: none; }
}

/* A load or an evaluation in progress: a card over the view that names the stage. */
.csg-loading {
  position: absolute; inset: 0; z-index: 3;
  display: grid; place-items: center; pointer-events: none;
}
.csg-loading[hidden] { display: none; }
.csg-loading > div {
  display: flex; align-items: center; gap: 10px;
  max-width: calc(100% - 24px); padding: 10px 16px;
  border-radius: 8px;
  background: color-mix(in oklab, Canvas 88%, transparent);
  color: CanvasText;
  border: 1px solid color-mix(in oklab, CanvasText 18%, transparent);
  box-shadow: 0 2px 10px rgb(0 0 0 / 0.18);
  backdrop-filter: blur(8px);
  font: 400 13px/18px var(--cesium-ui-font, system-ui, sans-serif);
}
.csg-spinner {
  flex: none; width: 16px; height: 16px; box-sizing: border-box;
  border-radius: 50%;
  border: 2px solid color-mix(in oklab, CanvasText 22%, transparent);
  border-top-color: var(--cesium-ui-accent, AccentColor);
  animation: csg-spin 0.8s linear infinite;
}
@keyframes csg-spin { to { transform: rotate(360deg); } }

/* A line over the view's bottom: what the kernel is doing, or what failed. */
.csg-status {
  position: absolute; left: 12px; bottom: 12px; z-index: 2; max-width: calc(100% - 24px);
  padding: 4px 10px; border-radius: 6px;
  background: color-mix(in oklab, Canvas 88%, transparent);
  color: CanvasText;
  border: 1px solid color-mix(in oklab, CanvasText 18%, transparent);
  font: 400 12px/16px var(--cesium-ui-font, system-ui, sans-serif);
  pointer-events: none;
}
.csg-status[hidden] { display: none; }
.csg-status[data-bad] { color: var(--stratakit-color-text-critical-base, #cf222e); }

.csg-segmented {
  display: grid; grid-auto-flow: column; grid-auto-columns: 1fr;
  padding: 2px; gap: 2px;
  border-radius: var(--stratakit-radius-md, 6px);
  background: var(--stratakit-color-bg-page-depth, rgb(0 0 0 / 0.06));
  border: 1px solid var(--stratakit-color-border-neutral-base, rgb(0 0 0 / 0.15));
}
:where(.examples-panel) .csg-segmented button {
  border: 0; border-radius: calc(var(--stratakit-radius-md, 6px) - 2px);
  background: transparent; padding: 5px 8px; font-weight: 500;
}
:where(.examples-panel) .csg-segmented button[aria-pressed="true"] {
  background: var(--stratakit-color-bg-accent-base, var(--cesium-ui-accent, AccentColor));
  color: var(--stratakit-color-text-accent-on-base, #fff);
}
.csg-segmented button:disabled { opacity: 0.6; cursor: progress; }

/* The tree: one row per node, indented by depth. */
.csg-tree {
  display: flex; flex-direction: column; gap: 1px;
  flex: none; min-height: 2.2em; max-height: 280px; overflow: auto; padding: 2px;
  border-radius: var(--stratakit-radius-md, 6px);
  background: var(--stratakit-color-bg-page-depth, rgb(0 0 0 / 0.05));
  border: 1px solid var(--stratakit-color-border-neutral-base, rgb(0 0 0 / 0.15));
}
.csg-row {
  display: flex; align-items: center; gap: 6px;
  padding: 3px 6px 3px calc(6px + var(--depth, 0) * 14px);
  border-radius: 4px; cursor: pointer; user-select: none;
}
.csg-row:hover { background: color-mix(in oklab, CanvasText 8%, transparent); }
.csg-row[aria-selected="true"] {
  background: var(--stratakit-color-bg-accent-base, var(--cesium-ui-accent, AccentColor));
  color: var(--stratakit-color-text-accent-on-base, #fff);
}
.csg-row[data-under]:not([aria-selected="true"]) {
  background: color-mix(in oklab, var(--cesium-ui-accent, AccentColor) 18%, transparent);
}
.csg-row:focus-visible { outline: 2px solid var(--cesium-ui-focus, Highlight); outline-offset: -2px; }
.csg-row[data-off] .csg-name { opacity: 0.5; text-decoration: line-through; }
.csg-row input[type="checkbox"] { margin: 0; flex: none; }
.csg-swatch { flex: none; width: 10px; height: 10px; border-radius: 2px; border: 1px solid color-mix(in oklab, CanvasText 30%, transparent); }
.csg-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.csg-badge { flex: none; font-size: 11px; opacity: 0.75; font-variant-numeric: tabular-nums; }
.csg-empty { padding: 8px; opacity: 0.75; }

.csg-tools { display: flex; flex-wrap: wrap; gap: 4px; }
:where(.examples-panel) .csg-tools button { padding: 3px 8px; min-width: 2.2em; }
:where(.examples-panel) .csg-tools button:disabled { opacity: 0.4; cursor: default; }
.csg-tools select { flex: 1; min-width: 7em; }

.csg-field {
  display: grid; grid-template-columns: 6.5em 1fr 5.5em; align-items: center;
  gap: var(--stratakit-space-200, 8px);
}
.csg-field input[type="range"] { min-width: 0; width: 100%; }
.csg-number { display: flex; align-items: center; gap: 3px; white-space: nowrap; }
.csg-number input {
  width: 4.6em; box-sizing: border-box; font: inherit; color: inherit;
  padding: 2px 4px; text-align: right; font-variant-numeric: tabular-nums;
  background: var(--stratakit-color-bg-page-depth, transparent);
  border: 1px solid var(--stratakit-color-border-neutral-base, rgb(0 0 0 / 0.2));
  border-radius: var(--stratakit-radius-sm, 4px);
}
.csg-name-field input {
  flex: 1; min-width: 0; font: inherit; color: inherit; padding: 3px 6px;
  background: var(--stratakit-color-bg-page-depth, transparent);
  border: 1px solid var(--stratakit-color-border-neutral-base, rgb(0 0 0 / 0.2));
  border-radius: var(--stratakit-radius-sm, 4px);
}
.csg-group { display: grid; gap: 4px; }
.csg-group > h4 { margin: 4px 0 0; font-size: 11px; font-weight: 600; opacity: 0.75; }
.csg-toggles { display: grid; grid-template-columns: 1fr 1fr; gap: 4px var(--stratakit-space-300, 12px); }
:where(.examples-panel) .csg-toggles label { justify-content: flex-end; flex-direction: row-reverse; }

.csg-table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.csg-table th, .csg-table td {
  padding: 3px 6px; text-align: left; vertical-align: top;
  border-bottom: 1px solid var(--stratakit-color-border-neutral-muted, rgb(0 0 0 / 0.08));
}
.csg-table th { font-weight: 600; color: var(--stratakit-color-text-neutral-secondary, inherit); }
.csg-table td:last-child { text-align: right; }
.csg-ok { color: var(--stratakit-color-text-positive-base, #1a7f37); }
.csg-bad { color: var(--stratakit-color-text-critical-base, #cf222e); }
.csg-crumbs { display: flex; flex-wrap: wrap; align-items: center; gap: 2px; }
:where(.examples-panel) .csg-crumbs button { padding: 1px 6px; }
.csg-note { font-size: 12px; opacity: 0.8; }
`;
