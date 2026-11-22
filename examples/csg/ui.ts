import { icon, type IconName } from "./icons.ts";

/**
 * The CSG sample's panel parts (plain DOM, themed by the gallery's custom
 * properties): an element helper, icon buttons with tooltips, numeric
 * fields whose label scrubs the value, sliders that say which phase of an
 * edit they are in, a segmented control and a popover.
 */

/** Where an edit is: a value being scrubbed or dragged, a typed value, or the end of either. */
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

export interface IconButtonOptions {
  icon: IconName;
  /** The name, for the tooltip and assistive technology. */
  label: string;
  /** The shortcut, shown in the tooltip. */
  shortcut?: string;
  /** A text beside the icon. */
  text?: string;
  onClick(event: MouseEvent): void;
}

export interface IconButton {
  element: HTMLButtonElement;
  setLabel(label: string): void;
  setPressed(on: boolean | undefined): void;
  setEnabled(on: boolean): void;
}

/** A button with an icon and a tooltip that names it and its shortcut. */
export function iconButton(options: IconButtonOptions): IconButton {
  const element = el(
    "button",
    {
      type: "button",
      className: "csg-btn",
      onclick: (event: MouseEvent) => options.onClick(event),
    },
    icon(options.icon),
    ...(options.text
      ? [el("span", { className: "csg-btn-text" }, options.text)]
      : []),
  );
  const setLabel = (label: string) => {
    element.ariaLabel = label;
    element.dataset.tip = options.shortcut
      ? `${label} (${options.shortcut})`
      : label;
  };
  setLabel(options.label);
  return {
    element,
    setLabel,
    setPressed: (on) =>
      on === undefined
        ? element.removeAttribute("aria-pressed")
        : element.setAttribute("aria-pressed", String(on)),
    setEnabled: (on) => {
      element.disabled = !on;
    },
  };
}

/** A thin rule between groups of buttons. */
export const divider = () =>
  el("span", { className: "csg-divider", role: "separator" });

export interface ScrubOptions {
  label: string;
  value: number;
  /** One pixel of scrubbing, and an arrow key, change the value by this much. */
  step: number;
  /** The smallest value accepted. */
  min?: number;
  max?: number;
  unit?: string;
  /** Called with the new value and where the edit is. */
  onChange(value: number, phase: Phase): void;
}

const decimals = (step: number) =>
  Math.max(0, Math.min(4, Math.ceil(-Math.log10(step))));

export interface Scrub {
  element: HTMLElement;
  /** Shows a value changed from outside (not while it is being typed in). */
  set(value: number): void;
}

/**
 * A number with its label: dragging the label across scrubs the value (shift
 * for a tenth of the step, alt for ten times), typing in the field and the
 * arrow keys change it too. Reports `drag` while scrubbing and `commit` on
 * release; `type` on each keystroke and `commit` on enter or leaving.
 */
export function scrub(options: ScrubOptions): Scrub {
  const digits = decimals(options.step);
  const min = options.min ?? -Infinity;
  const max = options.max ?? Infinity;
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  let value = options.value;
  const number = el("input", {
    type: "number",
    step: String(options.step),
    value: value.toFixed(digits),
    ariaLabel: options.label,
  });
  const label = el(
    "span",
    { className: "csg-scrub", title: "Drag to change" },
    options.label,
  );
  let grab: { x: number; value: number; moved: boolean } | undefined;
  label.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    label.setPointerCapture(event.pointerId);
    grab = { x: event.clientX, value, moved: false };
  });
  label.addEventListener("pointermove", (event) => {
    if (!grab) {
      return;
    }
    const dx = event.clientX - grab.x;
    if (!grab.moved && Math.abs(dx) < 3) {
      return;
    }
    grab.moved = true;
    const fine = event.shiftKey ? 0.1 : event.altKey ? 10 : 1;
    value = clamp(
      Math.round(
        (grab.value + dx * options.step * fine) / (options.step * 0.1),
      ) *
        (options.step * 0.1),
    );
    number.value = value.toFixed(digits);
    options.onChange(value, "drag");
  });
  const release = (event: PointerEvent) => {
    if (!grab) {
      return;
    }
    const { moved } = grab;
    grab = undefined;
    label.releasePointerCapture(event.pointerId);
    if (moved) {
      options.onChange(value, "commit");
    } else {
      number.focus();
      number.select();
    }
  };
  label.addEventListener("pointerup", release);
  label.addEventListener("pointercancel", release);
  const typed = (phase: Phase) => {
    const v = Number(number.value);
    if (number.value === "" || !Number.isFinite(v) || v < min || v > max) {
      return false;
    }
    value = v;
    options.onChange(v, phase);
    return true;
  };
  number.addEventListener("input", () => typed("type"));
  number.addEventListener("change", () => {
    if (!typed("commit")) {
      number.value = value.toFixed(digits);
    }
  });
  number.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      number.blur();
    } else if (event.key === "Escape") {
      number.value = value.toFixed(digits);
      number.blur();
      event.stopPropagation();
    }
  });
  return {
    element: el(
      "label",
      { className: "csg-prop" },
      label,
      el(
        "span",
        { className: "csg-number" },
        number,
        ...(options.unit
          ? [el("span", { className: "csg-unit" }, options.unit)]
          : []),
      ),
    ),
    set: (v) => {
      value = v;
      if (document.activeElement !== number) {
        number.value = v.toFixed(digits);
      }
    },
  };
}

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

/**
 * A card that opens under a button and closes on an outside click or
 * escape. `content` is filled when it opens, so it shows what is current.
 */
export function popover(
  host: HTMLElement,
  anchor: HTMLElement,
  fill: (card: HTMLElement) => void,
): { toggle(): void; close(): void; readonly open: boolean } {
  const card = el("div", {
    className: "csg-popover",
    role: "dialog",
    hidden: true,
  });
  host.append(card);
  let open = false;
  const outside = (event: PointerEvent) => {
    if (
      !card.contains(event.target as Node) &&
      !anchor.contains(event.target as Node)
    ) {
      close();
    }
  };
  const escape = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      close();
      event.stopPropagation();
    }
  };
  const close = () => {
    if (!open) {
      return;
    }
    open = false;
    card.hidden = true;
    anchor.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", outside, true);
    document.removeEventListener("keydown", escape, true);
  };
  const show = () => {
    fill(card);
    const base = host.getBoundingClientRect();
    const at = anchor.getBoundingClientRect();
    card.hidden = false;
    const width = card.offsetWidth;
    card.style.left = `${Math.max(8, Math.min(at.left - base.left, base.width - width - 8))}px`;
    card.style.top = `${at.bottom - base.top + 6}px`;
    open = true;
    anchor.setAttribute("aria-expanded", "true");
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", escape, true);
  };
  return {
    toggle: () => (open ? close() : show()),
    close,
    get open() {
      return open;
    },
  };
}
