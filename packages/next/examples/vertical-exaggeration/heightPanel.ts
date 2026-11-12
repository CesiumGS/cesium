import {
  HAZE,
  RAMP_TOP,
  rampGradient,
  type HeightKey,
  type HeightVisuals,
} from "./heightVisuals.ts";

const INTERVALS = [100, 250, 500, 1000] as const;
/** Legend labels: every 1,000 m of the ramp. */
const LABELS = [0, 1000, 2000, 3000, 4000] as const;

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, unknown> = {},
  ...children: Array<Node | string>
): HTMLElementTagNameMap[K] => {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...children);
  return e;
};

/** "true" or "drawn", the keys' two radio buttons. */
function keyed(
  name: string,
  get: () => HeightKey,
  set: (key: HeightKey) => void,
): HTMLElement {
  const radio = (key: HeightKey, text: string) => {
    const input = el("input", {
      type: "radio",
      name,
      value: key,
      checked: get() === key,
      onchange: () => input.checked && set(key),
    });
    return el("label", { className: "vex-key" }, input, text);
  };
  return el(
    "div",
    { className: "vex-keyed", role: "radiogroup" },
    el("span", {}, "Keyed to"),
    radio("true", "true height"),
    radio("drawn", "drawn height"),
  );
}

export interface HeightPanel {
  readonly root: HTMLElement;
  /** The legend's note follows the exaggeration in force. */
  refresh(): void;
}

/**
 * The "Height visuals" section: a tint with its legend, contours, and a
 * haze, each lookup with its key. `changed` hears every change, for the URL
 * and a new frame.
 */
export function createHeightPanel(
  visuals: HeightVisuals,
  factor: () => number,
  changed: () => void,
): HeightPanel {
  const state = visuals.state;
  const apply = (next: Parameters<HeightVisuals["set"]>[0]) => {
    visuals.set(next);
    refresh();
    changed();
  };

  const tintBox = el("input", {
    type: "checkbox",
    checked: state.tint,
    onchange: () => apply({ tint: tintBox.checked }),
  });
  const interval = el(
    "select",
    {
      ariaLabel: "Contour interval",
      onchange: () => apply({ contours: Number(interval.value) }),
    },
    el("option", { value: "0" }, "none"),
    ...INTERVALS.map((m) =>
      el(
        "option",
        { value: String(m) },
        `every ${m.toLocaleString("en-US")} m`,
      ),
    ),
  );
  interval.value = String(state.contours);
  const hazeBox = el("input", {
    type: "checkbox",
    checked: state.haze,
    onchange: () => apply({ haze: hazeBox.checked }),
  });
  const amount = el("input", {
    type: "range",
    min: "0.25",
    max: "4",
    step: "0.05",
    value: String(state.hazeAmount),
    ariaLabel: "Haze density",
    oninput: () => apply({ hazeAmount: Number(amount.value) }),
  });

  const ramp = el("div", { className: "vex-ramp" });
  ramp.style.background = rampGradient();
  const ticks = el(
    "div",
    { className: "vex-ticks" },
    ...LABELS.map((m) => {
      const tick = el("span", {}, m.toLocaleString("en-US"));
      tick.style.left = `${(m / RAMP_TOP) * 100}%`;
      return tick;
    }),
  );
  const legendNote = el("p", { className: "vex-note" });
  const hazeNote = el("p", { className: "vex-note" });
  const legend = el(
    "div",
    { className: "vex-legend" },
    el("div", { className: "vex-legend-title" }, "Height, m"),
    ramp,
    ticks,
  );

  const refresh = () => {
    const k = factor();
    const metres = (m: number) =>
      `${(Math.round(m * 10) / 10).toLocaleString("en-US")} m`;
    legendNote.textContent =
      state.lookup === "true"
        ? "The legend's metres are above the ellipsoid, true: the 1,000 m band is at 1,000 m at every exaggeration."
        : `The legend's metres are drawn: at ×${k.toFixed(1)}, the 1,000 m band is at ${metres(1000 / k)} true, and everything above ${metres(RAMP_TOP / k)} true is white.`;
    legendNote.hidden = !state.tint && state.contours === 0;
    legend.hidden = !state.tint;
    hazeNote.textContent =
      state.hazeKey === "true"
        ? `The density thins with true height (to 1/e in ${HAZE.scaleHeight.toLocaleString("en-US")} m): the same air over the same ground at every exaggeration, along a path drawn ×${k.toFixed(1)} as long.`
        : `The density thins with drawn height: at ×${k.toFixed(1)} the air above ${metres(HAZE.scaleHeight / k)} true height is as thin as ${HAZE.scaleHeight.toLocaleString("en-US")} m above the valley floor was, and the summits stand in near-vacuum.`;
    hazeNote.hidden = !state.haze;
  };

  const root = el(
    "div",
    { className: "vex-visuals" },
    el("h3", {}, "Height visuals"),
    el(
      "p",
      { className: "vex-note" },
      "A colour ramp, a contour line and the air's density are lookups by height, and a height is a fact about the ground, not about the picture. Set the exaggeration to ×5 to ×10 and switch each key.",
    ),
    el("label", {}, "Hypsometric tint", tintBox),
    keyed(
      "vex-lookup",
      () => state.lookup,
      (lookup) => apply({ lookup }),
    ),
    legend,
    legendNote,
    el("label", {}, "Contours", interval),
    el("label", {}, "Height haze", hazeBox),
    keyed(
      "vex-haze",
      () => state.hazeKey,
      (hazeKey) => apply({ hazeKey }),
    ),
    el("label", { className: "slider" }, "Density", amount),
    hazeNote,
    el(
      "p",
      { className: "vex-note" },
      "What to look at: keyed to true height, the bands and the fog's top follow the same ground whatever the slider says. Keyed to drawn height they slide down the slopes as heights stretch (the 1,000 m band at ×10 is 100 m of real height), and the haze drains out of the valley. Lighting, shadows and the haze's path length are geometry, so they are drawn either way.",
    ),
  );
  refresh();
  return { root, refresh };
}
