/** Small DOM helpers and number formats shared by the example's panel and scenes. */

export const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, unknown> = {},
  ...children: Array<Node | string>
): HTMLElementTagNameMap[K] => {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...children);
  return e;
};

const NF = new Intl.NumberFormat("en-US");

/** Metres, to a metre. */
export const metres = (m: number): string => `${NF.format(Math.round(m))} m`;

export const signed = (text: string, value: number): string =>
  value < 0 ? `−${text.replace("-", "")}` : text;

/** A length with the unit that fits it. */
export function length(m: number, digits = 1): string {
  const a = Math.abs(m);
  if (!Number.isFinite(m)) {
    return "–";
  }
  if (a < 1e-9) {
    return "0 m";
  }
  if (a >= 10_000) {
    return `${signed((m / 1000).toFixed(digits), m)} km`;
  }
  if (a >= 100) {
    return `${signed(NF.format(Math.round(m)), m)} m`;
  }
  if (a >= 1) {
    return `${signed(m.toFixed(2), m)} m`;
  }
  if (a >= 0.001) {
    return `${signed((m * 1000).toFixed(1), m)} mm`;
  }
  return `${signed((m * 1e6).toFixed(0), m)} µm`;
}

/** Degrees, to `digits` places. */
export const degrees = (rad: number, digits = 4): string =>
  `${((rad * 180) / Math.PI).toFixed(digits)}°`;

export const number = (x: number, digits = 3): string =>
  Number.isFinite(x) ? x.toFixed(digits) : "–";

/** A labelled range input with its value shown beside it. */
export interface Slider {
  readonly root: HTMLLabelElement;
  readonly input: HTMLInputElement;
  set(value: number): void;
}

export function slider(
  label: string,
  options: {
    min: number;
    max: number;
    step: number;
    value: number;
    format?: (value: number) => string;
  },
  onInput: (value: number) => void,
): Slider {
  const format = options.format ?? ((v: number) => String(v));
  const out = el("output");
  const input = el("input", {
    type: "range",
    min: String(options.min),
    max: String(options.max),
    step: String(options.step),
    value: String(options.value),
    ariaLabel: label,
  });
  const show = () => {
    out.textContent = format(Number(input.value));
  };
  input.oninput = () => {
    show();
    onInput(Number(input.value));
  };
  show();
  return {
    root: el("label", { className: "slider" }, label, input, out),
    input,
    set(value) {
      input.value = String(value);
      show();
    },
  };
}

export function checkbox(
  label: string,
  checked: boolean,
  onChange: (on: boolean) => void,
): { root: HTMLLabelElement; input: HTMLInputElement } {
  const input = el("input", { type: "checkbox", checked });
  input.onchange = () => onChange(input.checked);
  return { root: el("label", {}, label, input), input };
}

export function button(
  label: string,
  onClick: () => void,
  props: Record<string, unknown> = {},
): HTMLButtonElement {
  return el("button", { type: "button", onclick: onClick, ...props }, label);
}

/** A table of true values beside the drawn ones, rows set by name. */
export interface TrueDrawnTable {
  readonly root: HTMLTableElement;
  set(row: string, trueText: string, drawnText: string): void;
  clear(): void;
}

export function trueDrawnTable(
  rows: readonly string[],
  heads: readonly [string, string] = ["True", "Drawn"],
): TrueDrawnTable {
  const cells = new Map<string, [HTMLElement, HTMLElement]>();
  const body = el("tbody");
  for (const name of rows) {
    const t = el("td", { className: "true" });
    const d = el("td", { className: "drawn" });
    cells.set(name, [t, d]);
    body.append(el("tr", {}, el("th", { scope: "row" }, name), t, d));
  }
  const head = el(
    "thead",
    {},
    el(
      "tr",
      {},
      el("td"),
      el("th", { scope: "col" }, heads[0]),
      el("th", { scope: "col" }, heads[1]),
    ),
  );
  return {
    root: el("table", { className: "tgx-table" }, head, body),
    set(row, trueText, drawnText) {
      const [t, d] = cells.get(row)!;
      t.textContent = trueText;
      d.textContent = drawnText;
    },
    clear() {
      for (const [t, d] of cells.values()) {
        t.textContent = d.textContent = "–";
      }
    },
  };
}

/** A term and its value a row, the values set by name. */
export function readoutList(...names: string[]) {
  const values = new Map<string, HTMLElement>();
  const root = el("dl");
  for (const name of names) {
    const value = el("dd", {}, "–");
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

/** An error's message with an ion access token scrubbed out of it. */
export const messageOf = (
  error: unknown,
  accessToken: string | undefined,
): string => {
  const text = error instanceof Error ? error.message : String(error);
  return accessToken !== undefined && accessToken.length >= 8
    ? text.split(accessToken).join("[redacted]")
    : text;
};
