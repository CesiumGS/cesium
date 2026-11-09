/**
 * The observer's controls over a view: its exposure, the scattering of light in an
 * eye or a lens, the looks on the picture, and the sky data it draws. Plain DOM, for
 * any app, as the credits and the time controls are.
 *
 * Every control is under a heading that says what it is. Physics follows from the
 * scene's light (the exposure). A model is a stated model of an eye or a lens (glare,
 * the eye's limit for faint stars). A look is taste: it changes the picture, not the
 * light. A look can't pass for physics.
 *
 * Sliders run right for brighter. The exposure's slider holds the negative of its
 * EV100, so its right end is EV100 −12 and its left end is 18; its label and
 * readout are in EV100 ("EV100 −3.0"), which stays the API's unit.
 */
import {
  astrophotoCurveStage,
  cameraGlare,
  eyeGlare,
  eyeLimitStage,
  type Exposure,
  type GlareSettings,
  type GlareTier,
  type ObserverReadout,
  type SkyPackManifest,
  type ToneMapping,
  type View,
} from "@cesium/next";

export type ObserverPanelSection = "exposure" | "optics" | "look" | "sky";

export interface ObserverPanelOptions {
  /** The sections to show, in this order (default all four). */
  sections?: readonly ObserverPanelSection[];
  /**
   * The sky data in use, for the "Sky data" section: a pack's manifest, or
   * undefined for 1.x's star map. Read every refresh (`Viewer.skyPackManifest`).
   */
  sky?: () => SkyPackManifest | undefined;
}

export interface ObserverPanelHandle {
  readonly element: HTMLElement;
  /** Brings the controls up to date with the view now (also done every 200 ms). */
  refresh(): void;
  /** Removes the panel and its listeners. */
  dispose(): void;
}

/** What a control is, as its section's tag says. */
export type ObserverControlKind = "physics" | "model" | "look";

// ---------------------------------------------------------------- the numbers

/** The slider's ends, EV100: 18 at the left (darker), −12 at the right (brighter). */
export const EV100_DARKEST = 18;
export const EV100_BRIGHTEST = -12;
/** Eye and metered compensation, stops. */
const COMPENSATION = 3;
const MINUS = "−";

/** A number with a true minus sign, to `digits` places. */
export function signed(value: number, digits = 1, plus = false): string {
  const text = Math.abs(value).toFixed(digits);
  const zero = Number(text) === 0;
  if (value < 0 && !zero) {
    return `${MINUS}${text}`;
  }
  return plus && !zero ? `+${text}` : text;
}

/** "EV100 −3.0", or "≈ EV100 14.2" where it's an equivalent. */
export function ev100Text(ev100: number, equivalent = false): string {
  return `${equivalent ? "≈ " : ""}EV100 ${signed(ev100)}`;
}

/** The slider's value for an EV100: its negative, so right is brighter. */
export const sliderFromEv100 = (ev100: number): number => -ev100;
/** The EV100 a slider's value stands for. */
export const ev100FromSlider = (value: number): number => -value;

type Mode = "eye" | "fixed" | "metered" | "scale";

/** Which of the exposure's modes `exposure` is. */
export function exposureMode(exposure: Exposure): Mode {
  if ("eye" in exposure) {
    return "eye";
  }
  if ("auto" in exposure) {
    return "metered";
  }
  return "scale" in exposure ? "scale" : "fixed";
}

/** The readout's text: an EV100, or that a plain scale has none. */
export function readoutText(readout: ObserverReadout): string {
  return readout.ev100 === undefined
    ? "no units"
    : ev100Text(readout.ev100, readout.equivalent);
}

const TIER_NAMES: Readonly<Record<GlareTier | "auto", string>> = {
  auto: "Automatic",
  full: "Full",
  reduced: "Reduced",
  sources: "Sources only",
  off: "Off",
};

const APERTURES: ReadonlyArray<[string, string]> = [
  ["round", "Round"],
  ["vanes", "Four vanes"],
  ["hex", "Hexagon"],
  ["blades7", "Seven blades"],
];

const TONE_MAPS: ReadonlyArray<[ToneMapping, string]> = [
  ["pbrNeutral", "PBR Neutral"],
  ["agx", "AgX"],
  ["aces", "ACES (as 1.x)"],
];

/** Common scenes' EV100, to set the fixed slider by. */
const REFERENCES: ReadonlyArray<[string, number]> = [
  ["Direct sun", 15],
  ["Overcast", 12],
  ["Interior", 7],
  ["Night sky", -6],
];

const EYE_LIMIT = "eye-point-limit";
const ASTRO = "astrophoto-curve";

// ---------------------------------------------------------------------- DOM

let serial = 0;

type Attrs = Record<string, string | number | boolean | undefined>;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  attrs: Attrs = {},
  ...children: Array<Node | string>
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) {
      continue;
    }
    node.setAttribute(name, value === true ? "" : String(value));
  }
  node.append(...children);
  return node;
}

/** Sets text only when it changed, so a refresh doesn't touch the page. */
function setText(node: Node, text: string): void {
  if (node.textContent !== text) {
    node.textContent = text;
  }
}

interface Row {
  /** The control, for a refresh to set. */
  set(): void;
  element: HTMLElement;
}

/**
 * Attaches the observer's controls to `container`, over `view`. Edits go to
 * `view.observer`; edits made there from outside show within 200 ms.
 */
export function attachObserverPanel(
  container: HTMLElement,
  view: View,
  options: ObserverPanelOptions = {},
): ObserverPanelHandle {
  injectStyle();
  const id = `co${++serial}`;
  const sections = options.sections ?? ["exposure", "optics", "look", "sky"];
  const root = el("div", "cesium-observer");
  root.setAttribute("data-observer-panel", "");
  const rows: Row[] = [];
  const removers: Array<() => void> = [];
  const listen = <T extends Event>(
    target: EventTarget,
    type: string,
    handler: (event: T) => void,
  ) => {
    target.addEventListener(type, handler as EventListener);
    removers.push(() =>
      target.removeEventListener(type, handler as EventListener),
    );
  };

  const exposure = (): Exposure => view.observer.exposure;
  const mode = (): Mode => exposureMode(exposure());
  const edit = (patch: Partial<typeof view.observer>) => {
    view.observer = patch;
    refresh();
  };
  const glare = (): GlareSettings =>
    view.observer.glare ?? {
      tier: "auto",
      veil: null,
      spikes: null,
    };

  // ----------------------------------------------------- the building blocks

  /** A section: a heading, its tag, a line saying what the tag means, and a body. */
  const section = (
    key: ObserverPanelSection,
    title: string,
    kind: ObserverControlKind | "data",
    tag: string,
    lede: string,
  ) => {
    const heading = `${id}-${key}`;
    const body = el("div", "co-body");
    const node = el(
      "section",
      "co-section",
      {
        "data-section": key,
        "data-kind": kind,
        "aria-labelledby": heading,
      },
      el(
        "header",
        "co-head",
        {},
        el("h3", "co-title", { id: heading }, title),
        el("span", `co-tag co-${kind}`, { "data-tag": kind }, tag),
      ),
      el("p", "co-lede", {}, lede),
      body,
    );
    return { node, body };
  };

  /** A labelled row with a value on its right, whose width doesn't move. */
  const head = (label: string, forId: string, width: string) => {
    const out = el("output", "co-value", { for: forId });
    out.style.minWidth = width;
    const labelNode = el("label", "co-label", { for: forId }, label);
    return {
      node: el("div", "co-line", {}, labelNode, out),
      out,
    };
  };

  /** A switch: a checkbox with a label and one line under it. */
  const toggle = (
    control: string,
    label: string,
    hint: string,
    get: () => boolean,
    put: (on: boolean) => void,
    disabled: () => boolean = () => false,
  ) => {
    const inputId = `${id}-${control}`;
    const input = el("input", "co-switch", {
      type: "checkbox",
      id: inputId,
      role: "switch",
      "data-control": control,
    });
    const hintId = `${inputId}-hint`;
    input.setAttribute("aria-describedby", hintId);
    listen(input, "change", () => put(input.checked));
    const node = el(
      "div",
      "co-toggle",
      {},
      input,
      el(
        "label",
        "co-toggle-label",
        { for: inputId },
        el("span", "co-toggle-name", {}, label),
        el("span", "co-hint", { id: hintId }, hint),
      ),
    );
    rows.push({
      element: node,
      set() {
        input.checked = get();
        input.disabled = disabled();
        node.setAttribute("data-disabled", String(input.disabled));
      },
    });
    return node;
  };

  /**
   * A slider that runs right for brighter or more. `shown` is its internal value
   * (the one the input holds), `text` its readout, `valuetext` for assistive tech.
   */
  const slider = (spec: {
    control: string;
    label: string;
    min: number;
    max: number;
    step: number;
    /** What a page or shift-arrow moves, in the input's units. */
    big: number;
    get: () => number;
    put: (value: number) => void;
    text: (value: number) => string;
    width: string;
    ticks?: readonly number[];
    /** Visible ticks: how many intervals the track is divided into. */
    intervals?: number;
    className?: string;
    disabled?: () => boolean;
  }) => {
    const inputId = `${id}-${spec.control}`;
    const { node: line, out } = head(spec.label, inputId, spec.width);
    const input = el("input", `co-range ${spec.className ?? ""}`.trim(), {
      type: "range",
      id: inputId,
      min: spec.min,
      max: spec.max,
      step: spec.step,
      "data-control": spec.control,
    });
    input.value = String(spec.get());
    let ticks: HTMLElement | undefined;
    if (spec.ticks) {
      const listId = `${inputId}-ticks`;
      ticks = el(
        "datalist",
        "",
        { id: listId },
        ...spec.ticks.map((t) => el("option", "", { value: t })),
      );
      input.setAttribute("list", listId);
    }
    const put = (value: number) => {
      const clamped = Math.min(Math.max(value, spec.min), spec.max);
      input.value = String(clamped);
      spec.put(clamped);
    };
    listen(input, "input", () => put(Number(input.value)));
    // Arrow keys move one step, Shift or a page one `big`, Home and End to the
    // ends: the same in every browser, and always right for brighter.
    listen<KeyboardEvent>(input, "keydown", (event) => {
      const direction =
        event.key === "ArrowRight" || event.key === "ArrowUp"
          ? 1
          : event.key === "ArrowLeft" || event.key === "ArrowDown"
            ? -1
            : 0;
      const page =
        event.key === "PageUp" ? 1 : event.key === "PageDown" ? -1 : 0;
      if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        put(event.key === "Home" ? spec.min : spec.max);
        return;
      }
      if (direction === 0 && page === 0) {
        return;
      }
      event.preventDefault();
      const move =
        page !== 0
          ? page * spec.big
          : direction * (event.shiftKey ? spec.big : spec.step);
      put(Math.round((Number(input.value) + move) / spec.step) * spec.step);
    });
    const set = () => {
      const value = spec.get();
      if (document.activeElement !== input || input.value !== String(value)) {
        input.value = String(value);
      }
      const text = spec.text(value);
      setText(out, text);
      input.setAttribute("aria-valuetext", text);
      input.disabled = spec.disabled?.() ?? false;
    };
    rows.push({ element: line, set });
    const track = el(
      "div",
      `co-track${spec.intervals ? ` co-ticks-${spec.intervals}` : ""}`,
      {},
      input,
    );
    return { line, input, track, ticks, set };
  };

  /** A select with a label. */
  const select = (
    control: string,
    label: string,
    choices: ReadonlyArray<readonly [string, string]>,
    get: () => string,
    put: (value: string) => void,
    disabled: () => boolean = () => false,
  ) => {
    const inputId = `${id}-${control}`;
    const input = el("select", "co-select", {
      id: inputId,
      "data-control": control,
    });
    for (const [value, text] of choices) {
      input.append(el("option", "", { value }, text));
    }
    listen(input, "change", () => put(input.value));
    const node = el(
      "div",
      "co-field",
      {},
      el("label", "co-label", { for: inputId }, label),
      input,
    );
    rows.push({
      element: node,
      set() {
        if (input.value !== get()) {
          input.value = get();
        }
        input.disabled = disabled();
      },
    });
    return node;
  };

  // --------------------------------------------------------------- exposure

  const built: Partial<Record<ObserverPanelSection, HTMLElement>> = {};

  const exposureSection = () => {
    const s = section(
      "exposure",
      "Exposure",
      "physics",
      "Physics",
      "How much of the scene's light reaches the image, as a camera or an eye takes it.",
    );
    const modes: ReadonlyArray<[Mode, string]> = [
      ["eye", "Eye"],
      ["fixed", "Camera, fixed"],
      ["metered", "Camera, metered"],
    ];
    const group = el("div", "co-segments", {
      role: "radiogroup",
      "aria-label": "Exposure",
    });
    const buttons = new Map<Mode, HTMLButtonElement>();
    for (const [value, label] of modes) {
      const button = el(
        "button",
        "co-segment",
        {
          type: "button",
          role: "radio",
          "aria-checked": "false",
          "data-control": `exposure.mode.${value}`,
        },
        label,
      );
      listen(button, "click", () => chooseMode(value));
      buttons.set(value, button);
      group.append(button);
    }
    // A radiogroup moves with the arrow keys, and only the chosen one tabs.
    listen<KeyboardEvent>(group, "keydown", (event) => {
      const step =
        event.key === "ArrowRight" || event.key === "ArrowDown"
          ? 1
          : event.key === "ArrowLeft" || event.key === "ArrowUp"
            ? -1
            : 0;
      if (step === 0) {
        return;
      }
      event.preventDefault();
      const at = modes.findIndex(([m]) => m === mode());
      const next =
        modes[(Math.max(at, 0) + step + modes.length) % modes.length]!;
      chooseMode(next[0]);
      buttons.get(next[0])!.focus();
    });
    const chooseMode = (next: Mode) => {
      if (next === mode()) {
        return;
      }
      const old = exposure();
      const compensation =
        "compensation" in old && old.compensation !== undefined
          ? { compensation: old.compensation }
          : {};
      const readout = view.readout();
      view.observer = {
        exposure:
          next === "eye"
            ? { eye: true, ...compensation }
            : next === "metered"
              ? { auto: true, ...compensation }
              : {
                  ev100: Math.min(
                    Math.max(readout.ev100 ?? 15, EV100_BRIGHTEST),
                    EV100_DARKEST,
                  ),
                },
      };
      refresh();
    };
    s.body.append(group);
    const plain = el(
      "p",
      "co-note",
      {},
      "This view's exposure is a plain scale, with no units, so it has no EV100. Choose a mode to give it one.",
    );
    s.body.append(plain);

    // Fixed: one slider, in EV100, right for brighter.
    const ev = slider({
      control: "exposure.ev100",
      label: "Exposure",
      min: sliderFromEv100(EV100_DARKEST),
      max: sliderFromEv100(EV100_BRIGHTEST),
      step: 0.1,
      big: 1,
      className: "co-brightness",
      width: "9ch",
      get: () => {
        const e = exposure();
        return "ev100" in e ? sliderFromEv100(e.ev100) : sliderFromEv100(15);
      },
      put: (value) => edit({ exposure: { ev100: ev100FromSlider(value) } }),
      text: (value) => ev100Text(ev100FromSlider(value)),
      ticks: Array.from({ length: 11 }, (_, i) => -18 + 3 * i),
      intervals: 10,
    });
    const evEnds = el(
      "div",
      "co-ends",
      { "aria-hidden": "true" },
      el("span", "", {}, `Darker \u00b7 EV100 ${EV100_DARKEST}`),
      el("span", "co-ends-mid", {}, "tick = 3 stops"),
      el("span", "", {}, `Brighter \u00b7 EV100 ${signed(EV100_BRIGHTEST, 0)}`),
    );
    const references = el("div", "co-chips", {
      role: "group",
      "aria-label": "Exposure for common scenes",
    });
    for (const [label, value] of REFERENCES) {
      const chip = el(
        "button",
        "co-chip",
        { type: "button", "data-control": `exposure.reference.${label}` },
        `${label} ${signed(value, 0)}`,
      );
      listen(chip, "click", () => edit({ exposure: { ev100: value } }));
      references.append(chip);
    }
    const evHint = el(
      "p",
      "co-hint co-block",
      {},
      "Right is brighter. A higher EV100 expects a brighter scene, so it lets in less light.",
    );
    const fixed = el(
      "div",
      "co-group",
      { "data-group": "fixed" },
      ev.line,
      ev.track,
      ...(ev.ticks ? [ev.ticks] : []),
      evEnds,
      references,
      evHint,
    );

    // The eye's and the meter's: compensation, in stops.
    const comp = slider({
      control: "exposure.compensation",
      label: "Compensation",
      min: -COMPENSATION,
      max: COMPENSATION,
      step: 0.1,
      big: 1,
      className: "co-brightness",
      width: "11ch",
      get: () => {
        const e = exposure();
        return "compensation" in e && e.compensation !== undefined
          ? e.compensation
          : 0;
      },
      put: (value) => {
        const e = exposure();
        if ("eye" in e) {
          edit({ exposure: { ...e, compensation: value } });
        } else if ("auto" in e) {
          edit({ exposure: { ...e, compensation: value } });
        }
      },
      text: (value) => `${signed(value, 1, true)} stops`,
      ticks: [-3, -2, -1, 0, 1, 2, 3],
      intervals: 6,
    });
    const compHint = el(
      "p",
      "co-hint co-block",
      {},
      "Right is brighter. It moves the exposure, in stops, from where the eye or the meter put it.",
    );
    const compGroup = el(
      "div",
      "co-group",
      { "data-group": "compensation" },
      comp.line,
      comp.track,
      ...(comp.ticks ? [comp.ticks] : []),
      el(
        "div",
        "co-ends",
        { "aria-hidden": "true" },
        el("span", "", {}, "Darker (−3)"),
        el("span", "", {}, "Brighter (+3)"),
      ),
      compHint,
    );

    // What the observer is doing now.
    const nowOut = el("output", "co-value co-now", {
      "data-readout": "exposure",
    });
    nowOut.style.minWidth = "14ch";
    const nowLine = el(
      "div",
      "co-line co-readout",
      {},
      el("span", "co-label", {}, "Now"),
      nowOut,
    );
    const adaptOut = el("output", "co-value co-adapt", {
      "data-readout": "adaptation",
    });
    adaptOut.style.minWidth = "22ch";
    const adaptLine = el(
      "div",
      "co-line co-readout",
      {},
      el("span", "co-label", {}, "Adapted to"),
      adaptOut,
    );
    s.body.append(fixed, compGroup, nowLine, adaptLine);
    rows.push({
      element: s.node,
      set() {
        const m = mode();
        for (const [value, button] of buttons) {
          const on = value === m;
          button.setAttribute("aria-checked", String(on));
          button.tabIndex = on || (m === "scale" && value === "eye") ? 0 : -1;
        }
        plain.hidden = m !== "scale";
        fixed.hidden = m !== "fixed";
        compGroup.hidden = m !== "eye" && m !== "metered";
        const readout = view.readout();
        setText(nowOut, readoutText(readout));
        adaptLine.hidden = m !== "eye";
        if (readout.cones !== undefined && readout.rods !== undefined) {
          setText(
            adaptOut,
            `${cd(readout.cones)} cones, ${cd(readout.rods)} rods`,
          );
        } else {
          setText(adaptOut, "not measured yet");
        }
      },
    });
    return s.node;
  };

  // ----------------------------------------------------------------- optics

  const opticsSection = () => {
    const s = section(
      "optics",
      "Optics",
      "model",
      "Model",
      "Light scattered inside an eye or a lens. A model of the observer: not the scene's light, and not a look.",
    );
    const setGlare = (patch: Partial<GlareSettings>) => {
      const e = exposure();
      const base =
        view.observer.glare ?? ("eye" in e ? eyeGlare() : cameraGlare());
      edit({ glare: { ...base, ...patch } });
    };
    const defaults = () => ("eye" in exposure() ? eyeGlare() : cameraGlare());
    s.body.append(
      toggle(
        "optics.veil",
        "Veil",
        "Light spread across the image around bright things, as in an eye or a lens.",
        () => glare().veil !== null,
        (on) =>
          setGlare({
            veil: on ? (defaults().veil ?? { share: 0.2 }) : null,
          }),
      ),
    );
    const veilShare = slider({
      control: "optics.veil.share",
      label: "Veil share",
      min: 0,
      max: 50,
      step: 1,
      big: 10,
      width: "6ch",
      get: () => Math.round((glare().veil?.share ?? 0.2) * 100),
      put: (value) => setGlare({ veil: { share: value / 100 } }),
      text: (value) => `${value} %`,
      disabled: () => glare().veil === null,
    });
    s.body.append(veilShare.line, veilShare.track);
    s.body.append(
      toggle(
        "optics.spikes",
        "Spikes",
        "Diffraction spikes from a lens's aperture. A camera's; the eye has none here.",
        () => glare().spikes !== null,
        (on) =>
          setGlare({
            spikes: on
              ? (defaults().spikes ??
                cameraGlare().spikes ?? {
                  aperture: "vanes",
                  share: 0.05,
                  extent: 3,
                })
              : null,
          }),
      ),
    );
    s.body.append(
      select(
        "optics.aperture",
        "Aperture",
        APERTURES,
        () => glare().spikes?.aperture ?? "vanes",
        (value) => {
          const spikes = glare().spikes;
          if (spikes) {
            setGlare({
              spikes: {
                ...spikes,
                aperture: value as NonNullable<typeof spikes>["aperture"],
              },
            });
          }
        },
        () => glare().spikes === null,
      ),
    );
    const tierChoices = Object.entries(TIER_NAMES) as Array<[string, string]>;
    s.body.append(
      select(
        "optics.tier",
        "Quality",
        tierChoices,
        () => glare().tier,
        (value) => setGlare({ tier: value as GlareTier | "auto" }),
      ),
    );
    const tierOut = el("p", "co-hint co-block co-tier", {
      "data-readout": "tier",
    });
    s.body.append(tierOut);
    s.body.append(
      toggle(
        "optics.eyeLimit",
        "Faint-star limit of the eye",
        "Stars too faint for the eye's adaptation drop out. The eye only.",
        () => view.observer.stages.some((stage) => stage.name === EYE_LIMIT),
        (on) => {
          const rest = view.observer.stages.filter(
            (stage) => stage.name !== EYE_LIMIT,
          );
          edit({ stages: on ? [...rest, eyeLimitStage()] : rest });
        },
        () => mode() !== "eye",
      ),
    );
    rows.push({
      element: s.node,
      set() {
        const g = view.readout().glare;
        const set = glare();
        let text: string;
        if (!set.veil && !set.spikes) {
          text = "No veil or spikes are on, so nothing is drawn.";
        } else if (!g) {
          text = "Drawn at the next render.";
        } else {
          text = `In use: ${TIER_NAMES[g.tier].toLowerCase()}, because ${g.reason}.`;
        }
        setText(tierOut, text);
      },
    });
    return s.node;
  };

  // ------------------------------------------------------------------- look

  const lookSection = () => {
    const s = section(
      "look",
      "Look",
      "look",
      "Look",
      "Taste. These change the picture, not the light the scene gives.",
    );
    s.body.append(
      select(
        "look.toneMapping",
        "Tone mapping (a look)",
        TONE_MAPS,
        () => view.observer.toneMapping,
        (value) => edit({ toneMapping: value as ToneMapping }),
      ),
      el(
        "p",
        "co-hint co-block",
        {},
        "How exposed light becomes display color. A look: it changes the picture, not the light.",
      ),
      toggle(
        "look.astrophoto",
        "Astrophoto curve (a look)",
        "Lifts faint detail the way astrophotographers stretch it. A look: it changes the picture, not the light.",
        () => view.observer.stages.some((stage) => stage.name === ASTRO),
        (on) => {
          const rest = view.observer.stages.filter(
            (stage) => stage.name !== ASTRO,
          );
          edit({ stages: on ? [...rest, astrophotoCurveStage()] : rest });
        },
      ),
    );
    return s.node;
  };

  // -------------------------------------------------------------------- sky

  const skySection = () => {
    const s = section(
      "sky",
      "Sky data",
      "data",
      "Data",
      "Where the stars and the background come from.",
    );
    const name = el("p", "co-pack-name", { "data-readout": "pack" });
    const badge = el("p", "co-warning", {
      "data-readout": "cleared",
      role: "note",
    });
    const creditsNode = el("ul", "co-credits", { "data-readout": "credits" });
    s.body.append(name, badge, creditsNode);
    let shown: string | undefined;
    rows.push({
      element: s.node,
      set() {
        const pack = options.sky?.();
        const key = pack
          ? JSON.stringify([pack.name, pack.distributable, pack.credits])
          : "";
        if (key === shown) {
          return;
        }
        shown = key;
        if (!pack) {
          setText(name, "1.x's star map");
          badge.hidden = true;
          creditsNode.replaceChildren();
          return;
        }
        setText(name, pack.name);
        badge.hidden = pack.distributable;
        setText(badge, pack.distributable ? "" : "Not cleared: local use only");
        creditsNode.replaceChildren(
          ...pack.credits.map((credit) => {
            const li = el("li", "");
            // Text, never parsed as HTML.
            li.textContent = credit;
            return li;
          }),
        );
      },
    });
    return s.node;
  };

  const builders: Record<ObserverPanelSection, () => HTMLElement> = {
    exposure: exposureSection,
    optics: opticsSection,
    look: lookSection,
    sky: skySection,
  };
  for (const key of sections) {
    built[key] = builders[key]();
    root.append(built[key]!);
  }

  // ----------------------------------------------------------------- upkeep

  let frozen = false;
  function refresh(): void {
    if (frozen) {
      return;
    }
    for (const row of rows) {
      row.set();
    }
  }
  container.append(root);
  refresh();
  // The readout moves as the eye adapts and the meter settles, and an edit made
  // from outside shows too: both within 200 ms.
  const timer = setInterval(refresh, 200);
  return {
    element: root,
    refresh,
    dispose() {
      if (frozen) {
        return;
      }
      frozen = true;
      clearInterval(timer);
      for (const remove of removers) {
        remove();
      }
      removers.length = 0;
      root.remove();
    },
  };
}

/** A luminance for the readout: 3 significant figures at most, no exponent below 1e5. */
function cd(value: number): string {
  if (!(value > 0)) {
    return "0 cd/m²";
  }
  const text =
    value >= 100
      ? value.toFixed(0)
      : value >= 1
        ? value.toFixed(1)
        : value.toPrecision(2);
  return `${text} cd/m²`;
}

// -------------------------------------------------------------------- style

const STYLE_ID = "cesium-observer-style";

function injectStyle(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.append(style);
}

// Themed through --cesium-ui-* custom properties, as the credits and the time
// controls are, and otherwise through the host's StrataKit tokens or the system's
// colors, so it follows a light or a dark page by itself. Nothing is sized in
// viewport units: it fills its container at any width.
const CSS = `
.cesium-observer {
  --co-text: var(--cesium-ui-text, var(--stratakit-color-text-neutral-primary, CanvasText));
  --co-muted: var(--cesium-ui-text-muted, var(--stratakit-color-text-neutral-secondary, color-mix(in oklch, CanvasText 68%, Canvas)));
  --co-border: var(--cesium-ui-border, var(--stratakit-color-border-neutral-base, color-mix(in oklch, CanvasText 22%, Canvas)));
  --co-surface: var(--cesium-ui-surface-sunken, color-mix(in oklch, CanvasText 5%, Canvas));
  --co-hover: color-mix(in oklch, var(--co-text) 8%, transparent);
  --co-accent: var(--cesium-ui-accent, var(--stratakit-color-bg-accent-base, AccentColor));
  --co-on-accent: var(--cesium-ui-on-accent, #fff);
  --co-focus: var(--cesium-ui-focus, var(--stratakit-color-border-accent-strong, Highlight));
  --co-physics: light-dark(oklch(46% 0.14 250), oklch(80% 0.1 250));
  --co-model: light-dark(oklch(45% 0.1 75), oklch(82% 0.11 85));
  --co-look: light-dark(oklch(46% 0.15 330), oklch(80% 0.1 330));
  --co-data: var(--co-muted);
  font: 400 13px/18px var(--cesium-ui-font, var(--stratakit-font-family-sans, system-ui, sans-serif));
  color: var(--co-text);
  font-variant-numeric: tabular-nums;
  display: flex; flex-direction: column; gap: 12px; min-width: 0; box-sizing: border-box;
  container-type: inline-size;
}
.cesium-observer *, .cesium-observer *::before, .cesium-observer *::after { box-sizing: border-box; }
.cesium-observer [hidden] { display: none !important; }
.cesium-observer button, .cesium-observer select, .cesium-observer input { font: inherit; color: inherit; }
.cesium-observer .co-section {
  display: flex; flex-direction: column; gap: 8px; min-width: 0;
  padding: 12px; border: 1px solid var(--co-border); border-radius: 8px;
  border-inline-start: 3px solid var(--co-kind, var(--co-border));
}
.cesium-observer .co-section[data-kind="physics"] { --co-kind: var(--co-physics); }
.cesium-observer .co-section[data-kind="model"] { --co-kind: var(--co-model); }
.cesium-observer .co-section[data-kind="look"] { --co-kind: var(--co-look); }
.cesium-observer .co-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.cesium-observer .co-title { margin: 0; font: 600 13px/18px inherit; font-family: inherit; }
.cesium-observer .co-tag {
  flex: none; padding: 1px 8px; border-radius: 999px; font-size: 11px; line-height: 16px;
  border: 1px solid currentColor; color: var(--co-data);
}
.cesium-observer .co-tag.co-physics { color: var(--co-physics); }
.cesium-observer .co-tag.co-model { color: var(--co-model); }
.cesium-observer .co-tag.co-look { color: var(--co-look); }
.cesium-observer .co-lede, .cesium-observer .co-note { margin: 0; color: var(--co-muted); font-size: 12px; line-height: 17px; }
.cesium-observer .co-body { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.cesium-observer .co-group { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.cesium-observer .co-line { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; flex-wrap: wrap; min-width: 0; }
.cesium-observer .co-label { color: var(--co-text); }
.cesium-observer .co-value { display: inline-block; text-align: end; color: var(--co-muted); white-space: nowrap; }
.cesium-observer .co-readout { padding-top: 6px; border-top: 1px dashed var(--co-border); }
.cesium-observer .co-now { color: var(--co-text); font-weight: 600; }
.cesium-observer .co-hint { color: var(--co-muted); font-size: 12px; line-height: 16px; margin: 0; }
.cesium-observer .co-block { display: block; }
.cesium-observer .co-ends { display: flex; justify-content: space-between; gap: 8px; color: var(--co-muted); font-size: 11px; line-height: 14px; }
.cesium-observer .co-ends span:last-child { text-align: end; }
.cesium-observer .co-ends-mid { flex: 1; text-align: center; opacity: 0.8; }
@container (max-width: 330px) { .co-ends-mid { display: none; } }
.cesium-observer .co-track { position: relative; }
.cesium-observer .co-track[class*="co-ticks-"]::after {
  content: ""; position: absolute; inset: auto 8px 0 8px; height: 5px; pointer-events: none;
  color: var(--co-muted); opacity: 0.8;
}
.cesium-observer .co-ticks-10::after { background: repeating-linear-gradient(to right, currentColor 0 1px, transparent 1px calc((100% - 1px) / 10)); }
.cesium-observer .co-ticks-6::after { background: repeating-linear-gradient(to right, currentColor 0 1px, transparent 1px calc((100% - 1px) / 6)); }
.cesium-observer .co-track .co-range { display: block; }
.cesium-observer .co-segments { display: flex; min-width: 0; }
.cesium-observer .co-segment {
  flex: 1 1 0; min-width: 0; min-height: 32px; padding: 0 6px; cursor: pointer; background: none;
  border: 1px solid var(--co-border); margin-inline-start: -1px; overflow-wrap: anywhere;
}
.cesium-observer .co-segment:first-child { border-radius: 6px 0 0 6px; margin-inline-start: 0; }
.cesium-observer .co-segment:last-child { border-radius: 0 6px 6px 0; }
.cesium-observer .co-segment:hover { background: var(--co-hover); }
.cesium-observer .co-segment[aria-checked="true"] {
  background: var(--co-accent); border-color: var(--co-accent); color: var(--co-on-accent); position: relative;
}
.cesium-observer .co-chips { display: flex; flex-wrap: wrap; gap: 4px; }
.cesium-observer .co-chip {
  min-height: 28px; padding: 0 10px; cursor: pointer; background: none; border-radius: 6px;
  border: 1px solid var(--co-border); white-space: nowrap;
}
.cesium-observer .co-chip:hover { background: var(--co-hover); }
.cesium-observer .co-range { width: 100%; min-width: 0; margin: 0; height: 24px; accent-color: var(--co-accent); cursor: pointer; }
.cesium-observer .co-range:disabled { cursor: default; opacity: 0.45; }
.cesium-observer .co-brightness { -webkit-appearance: none; appearance: none; background: transparent; }
.cesium-observer .co-brightness::-webkit-slider-runnable-track {
  height: 6px; border-radius: 3px;
  background: linear-gradient(to right, color-mix(in oklch, var(--co-text) 18%, transparent), color-mix(in oklch, var(--co-text) 70%, transparent));
}
.cesium-observer .co-brightness::-moz-range-track {
  height: 6px; border-radius: 3px;
  background: linear-gradient(to right, color-mix(in oklch, var(--co-text) 18%, transparent), color-mix(in oklch, var(--co-text) 70%, transparent));
}
.cesium-observer .co-brightness::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none; width: 16px; height: 16px; margin-top: -5px; border-radius: 50%;
  background: var(--co-accent); border: 2px solid Canvas;
  box-shadow: 0 0 0 1px var(--co-border);
}
.cesium-observer .co-brightness::-moz-range-thumb {
  width: 12px; height: 12px; border-radius: 50%; background: var(--co-accent); border: 2px solid Canvas;
  box-shadow: 0 0 0 1px var(--co-border);
}
.cesium-observer .co-toggle { display: flex; align-items: flex-start; gap: 8px; min-width: 0; }
.cesium-observer .co-toggle[data-disabled="true"] { opacity: 0.55; }
.cesium-observer .co-switch { flex: none; width: 16px; height: 16px; margin: 1px 0 0; accent-color: var(--co-accent); cursor: pointer; }
.cesium-observer .co-toggle-label { display: flex; flex-direction: column; align-items: flex-start; text-align: start; min-width: 0; cursor: pointer; }
.cesium-observer .co-toggle-name { color: var(--co-text); text-align: start; }
.cesium-observer .co-field { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; }
.cesium-observer .co-select {
  flex: 0 1 60%; min-width: 0; min-height: 28px; padding: 0 6px; border-radius: 6px;
  border: 1px solid var(--co-border); background: Canvas; color-scheme: inherit;
}
.cesium-observer .co-pack-name { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
.cesium-observer .co-warning {
  margin: 0; padding: 4px 8px; border-radius: 6px; font-size: 12px;
  border: 1px solid var(--co-model); color: var(--co-model);
}
.cesium-observer .co-credits { margin: 0; padding-inline-start: 16px; color: var(--co-muted); font-size: 12px; line-height: 16px; overflow-wrap: anywhere; }
.cesium-observer :focus-visible { outline: 2px solid var(--co-focus); outline-offset: 2px; border-radius: 2px; }
@media (prefers-reduced-motion: no-preference) {
  .cesium-observer .co-segment, .cesium-observer .co-chip { transition: background-color 120ms; }
}
`;
