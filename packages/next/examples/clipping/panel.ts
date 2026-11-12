import { planeAxes, planeOffset, type SectionState } from "./sections.ts";
import type { V3 } from "./site.ts";

/** What the panel's switches hold besides the section itself. */
export interface PanelModel {
  readonly state: SectionState;
  caps: { instant: boolean; hatch: boolean; exact: boolean; color: string };
  split: boolean;
  secondClipped: boolean;
}

/** What the panel asks the example to do. */
export interface PanelActions {
  /** A clip's shapes, switches or keeps changed. */
  clipChanged(): void;
  /** A kind of cap was switched. */
  capsChanged(): void;
  /** The cap colour changed. */
  colorChanged(): void;
  sectionView(): void;
  resetView(): void;
  setSplit(on: boolean): void;
  secondClipChanged(): void;
  curvedChanged(): void;
}

/** A plane's offset along its normal is measured from here. */
export const PIVOT: V3 = [0, 0, 0];

export const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, unknown> = {},
  ...children: Array<Node | string>
): HTMLElementTagNameMap[K] => {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...children);
  return e;
};

/** A readout list: a term and its value a row, the values set by name. */
function readout(...names: string[]) {
  const values = new Map<string, HTMLElement>();
  const root = el("dl");
  for (const name of names) {
    const value = el("dd");
    values.set(name, value);
    root.append(el("dt", {}, name), value);
  }
  return {
    root,
    set(name: string, text: string) {
      values.get(name)!.textContent = text;
    },
  };
}

/**
 * The panel's controls, in the gallery's plain-element style. `sync` writes
 * the section's numbers back into them when a handle in the view moved it.
 */
export function createPanel(
  root: HTMLElement,
  model: PanelModel,
  actions: PanelActions,
) {
  const { state } = model;
  const syncs: Array<() => void> = [];

  const toggle = (
    label: string,
    get: () => boolean,
    set: (on: boolean) => void,
    hint?: string,
  ) => {
    const input = el("input", { type: "checkbox" });
    input.checked = get();
    input.onchange = () => set(input.checked);
    syncs.push(() => {
      input.checked = get();
    });
    return el("label", hint ? { title: hint } : {}, label, input);
  };

  const segmented = <T extends string>(
    label: string,
    choices: ReadonlyArray<readonly [T, string]>,
    get: () => T,
    set: (value: T) => void,
  ) => {
    const buttons = choices.map(([value, text]) => {
      const button = el("button", { type: "button" }, text);
      button.onclick = () => {
        set(value);
        paint();
      };
      return [value, button] as const;
    });
    const paint = () => {
      for (const [value, button] of buttons) {
        button.setAttribute("aria-pressed", String(value === get()));
      }
    };
    syncs.push(paint);
    paint();
    return el(
      "div",
      { className: "cl-field" },
      el("span", {}, label),
      el("div", { className: "cl-segmented" }, ...buttons.map((b) => b[1])),
    );
  };

  const slider = (
    label: string,
    range: { min: number; max: number; step: number },
    get: () => number,
    set: (value: number) => void,
    format: (value: number) => string,
  ) => {
    const out = el("output");
    const input = el("input", {
      type: "range",
      min: String(range.min),
      max: String(range.max),
      step: String(range.step),
      ariaLabel: label,
    });
    const paint = () => {
      input.value = String(get());
      out.textContent = format(get());
    };
    input.oninput = () => {
      set(Number(input.value));
      out.textContent = format(get());
    };
    syncs.push(paint);
    paint();
    return el("label", { className: "slider" }, label, input, out);
  };

  const meters = (m: number) => `${m.toFixed(1)} m`;
  const degrees = (d: number) => `${d.toFixed(0)}°`;

  const capReadout = readout(
    "GPU caps",
    "B-rep caps",
    "Mesh caps",
    "Section lines",
    "Rebuilt in",
  );
  const pickReadout = readout(
    "Drawn",
    "Exact, clipped",
    "Exact, whole",
    "On the cap",
  );
  const pickHint = el(
    "p",
    {},
    "Click a surface in either view. A pick passes through what the view's clips remove.",
  );
  const contentNotes = el("p", { className: "cl-note" });
  const capNote = el("p", { className: "cl-note", hidden: true });
  const colorInput = el("input", { type: "color", value: model.caps.color });
  colorInput.oninput = () => {
    model.caps.color = colorInput.value;
    actions.colorChanged();
  };

  const clipChanged = () => actions.clipChanged();

  root.append(
    el("h3", {}, "Section plane"),
    toggle(
      "Plane",
      () => state.plane.on,
      (on) => {
        state.plane.on = on;
        clipChanged();
      },
    ),
    toggle(
      "Second plane, at 90° (a corner)",
      () => state.plane.second,
      (on) => {
        state.plane.second = on;
        clipChanged();
      },
      "A second plane through the same point, square to the first, so the two combine as a union or an intersection.",
    ),
    slider(
      "Offset",
      { min: -60, max: 90, step: 0.1 },
      () => planeOffset(state, PIVOT),
      (value) => {
        const { n } = planeAxes(state.plane.heading, state.plane.tilt);
        const move = value - planeOffset(state, PIVOT);
        state.plane.center = [
          state.plane.center[0] + n[0] * move,
          state.plane.center[1] + n[1] * move,
          state.plane.center[2] + n[2] * move,
        ];
        clipChanged();
      },
      meters,
    ),
    slider(
      "Heading",
      { min: 0, max: 359, step: 1 },
      () => Math.round(state.plane.heading),
      (value) => {
        state.plane.heading = value;
        clipChanged();
      },
      degrees,
    ),
    slider(
      "Tilt",
      { min: 0, max: 90, step: 1 },
      () => Math.round(state.plane.tilt),
      (value) => {
        state.plane.tilt = value;
        clipChanged();
      },
      degrees,
    ),
    segmented(
      "Keep",
      [
        ["inside", "Inside"],
        ["outside", "Outside"],
      ],
      () => state.planeKeeps,
      (value) => {
        state.planeKeeps = value;
        clipChanged();
      },
    ),
    segmented(
      "Combine",
      [
        ["union", "Union"],
        ["intersection", "Intersection"],
      ],
      () => state.combine,
      (value) => {
        state.combine = value;
        clipChanged();
      },
    ),
    el(
      "p",
      {},
      "Inside is the side the arrow points away from. With one plane there is nothing to combine.",
    ),

    el("h3", {}, "Clip box"),
    toggle(
      "Box",
      () => state.box.on,
      (on) => {
        state.box.on = on;
        clipChanged();
      },
    ),
    segmented(
      "Keep",
      [
        ["inside", "Inside"],
        ["outside", "Outside"],
      ],
      () => state.boxKeeps,
      (value) => {
        state.boxKeeps = value;
        clipChanged();
      },
    ),
    el(
      "p",
      {},
      "A box is a set of its own, so it works with the plane: a view keeps what every set it uses keeps.",
    ),

    el("h3", {}, "Caps"),
    toggle(
      "Instant caps (drawn by the GPU)",
      () => model.caps.instant,
      (on) => {
        model.caps.instant = on;
        actions.capsChanged();
      },
      "Counts the solids' surfaces behind the cut in every pixel and draws the cap where the count is odd: it follows a handle in the same frame, whatever the content.",
    ),
    toggle(
      "Hatched",
      () => model.caps.hatch,
      (on) => {
        model.caps.hatch = on;
        actions.capsChanged();
      },
    ),
    toggle(
      "Exact caps (b-rep sections, mesh loops)",
      () => model.caps.exact,
      (on) => {
        model.caps.exact = on;
        actions.capsChanged();
      },
      "Geometry rebuilt as a handle moves (the b-rep in a worker): a frame or several behind it, but real faces and polygons that picks and measurements can ask. Under instant caps they lie behind them.",
    ),
    el("label", {}, "Cap colour", colorInput),
    capReadout.root,
    capNote,

    el("h3", {}, "Views"),
    el(
      "div",
      { className: "buttons" },
      el(
        "button",
        { type: "button", onclick: actions.sectionView },
        "Section view",
      ),
      el(
        "button",
        { type: "button", onclick: actions.resetView },
        "Reset view",
      ),
    ),
    el(
      "p",
      {},
      "Section view looks square at the cut from the removed side through a long, narrow lens (2°, from a few kilometres): the engine has no orthographic camera yet (plan 5d, tasks 14 and 15), and this differs from one by under a percent across the content. Reset view brings the normal lens back.",
    ),
    toggle(
      "Split screen: a second view",
      () => model.split,
      (on) => actions.setSplit(on),
      "A second camera on the right half. It doesn't use the clips, so it shows the content whole.",
    ),
    toggle(
      "The second view clips too",
      () => model.secondClipped,
      (on) => {
        model.secondClipped = on;
        actions.secondClipChanged();
      },
    ),

    el("h3", {}, "Curved clip"),
    toggle(
      "Plane in a design frame, bent by a reprojection",
      () => state.curved,
      (on) => {
        state.curved = on;
        actions.curvedChanged();
      },
      "The plane is named in a frame that a reprojection waves away from ITRF. Neither the content's frame nor the view's reaches it rigidly, so the engine cuts along a signed distance fitted per draw.",
    ),

    el("h3", {}, "F-reps"),
    el(
      "p",
      {},
      "Not here yet: the engine has no drawn f-rep to cut. Distance fields answer clipped ray queries (sdfGeometry), and an f-rep's caps are the section of its field. They go where marked in main.ts.",
    ),

    el("h3", {}, "Picked point"),
    pickHint,
    pickReadout.root,

    el("h3", {}, "Content"),
    contentNotes,
  );

  const sync = () => {
    for (const s of syncs) {
      s();
    }
  };
  return {
    sync,
    capReadout,
    pickReadout,
    setContent: (text: string) => {
      contentNotes.textContent = text;
    },
    setCapNote: (text: string | undefined) => {
      capNote.hidden = text === undefined;
      capNote.textContent = text ?? "";
    },
  };
}
