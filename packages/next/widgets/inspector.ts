/**
 * The inspector overlay (docs/design/benchmark-analysis-and-experience.md, Inspector): a panel over an engine's
 * view showing what it draws, streams and holds, from any `Inspectable`.
 * Plain DOM, no framework, so any app can attach it (as 1.x's
 * CesiumInspector was a widget, not core). Collapsed, it is one summary
 * line; expanded: problems, the frame (CPU and GPU time over the last 30 s,
 * the geometry it submitted), streaming (rates, load, requests), the content
 * pipeline and mix, memory, the GPU's facts, the last pick and the recorder.
 *
 * The layout never depends on the values. Values change; structure changes
 * only when a feature turns on or the viewer opens or closes a section.
 * Every row, cell and table slot is always there (an empty one shows "—" or
 * is muted), numbers are tabular and right-aligned in cells of fixed width
 * and fixed decimals, and every fixed explanation sits behind a small "i"
 * button that shows it in the tooltip on hover and keyboard focus. State
 * (zero, warning, pinned) is carried in `data-*` attributes, never in the
 * class list, so `test/inspectorStable.test.ts` can compare skeletons.
 *
 * Charts follow the data-viz rules: a stat for a single value, a stacked bar
 * with direct labels for part-to-whole, aligned horizontal bars on one scale
 * to compare magnitudes, line or area sparklines over a shared time axis and
 * crosshair for change. Text stays in text colors; marks carry the data
 * colors; status colors come with an icon.
 *
 * Time: the charts record at 4 Hz for 30 s and, from the engine's per-tick
 * feed, every tick for the last 300. Hovering a chart freezes the display
 * (data keeps recording); a click pins the moment under the pointer to its
 * tick; the Frame section's Pause button freezes it and the arrow keys step.
 * Frozen or pinned, the charts read per tick.
 */
import { GPU_GROUPS, align, gpuWindow, untimedMs } from "./gpuGroups.ts";
import type {
  ContentMix,
  Inspectable,
  InspectorSnapshot,
  PickInfo,
  TickEvent,
} from "./inspectable.ts";

export interface InspectorOptions {
  /**
   * Start expanded; by default as it was last left (else collapsed: the
   * summary line only).
   */
  expanded?: boolean;
  /** Snapshot interval, ms (default 250). */
  interval?: number;
  /**
   * The corner it sits in (default top left). At the bottom it opens
   * upward, the summary line staying put at the bottom, and it clears the
   * credits and time controls that share the bottom edge.
   */
  placement?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Where open sections and expansion are remembered (localStorage key prefix). */
  storageKey?: string;
}

export interface InspectorHandle {
  readonly element: HTMLElement;
  /** Takes a snapshot now. */
  refresh(): void;
  setExpanded(expanded: boolean): void;
  /** Shows a pick result (undefined: nothing at that pixel). */
  showPick(pick: PickInfo | undefined): void;
  dispose(): void;
}

/** 30 s of history at 4 Hz. */
const HISTORY = 120;
/** The per-tick ring: the last ticks the charts can read one by one. */
const TICKS = 300;

const SECTIONS = [
  ["problems", "Problems"],
  ["frame", "Frame"],
  ["streaming", "Streaming"],
  ["pipeline", "Content pipeline"],
  ["memory", "Memory"],
  ["gpu", "GPU"],
  ["pick", "Pick"],
  ["record", "Record"],
] as const;
export type SectionKey = (typeof SECTIONS)[number][0];

/** What each section's "i" button says (nothing in the live panel repeats it). */
const SECTION_INFO: Partial<Record<SectionKey, string>> = {
  frame:
    "Charts show the last 30 s, newest at the right; hover one to freeze it and read every chart at that moment, click to pin the moment to its tick. Frozen, they read tick by tick. Each sparkline is on its own scale (shape, not size); the share bars compare passes on one scale. Dashed lines: 16.7 and 33.3 ms (60 and 30 fps). Untimed is the GPU frame less timed passes, while the GPU is busy back to back. Share: of the frame, averaged over the window.",
  streaming:
    "Sparklines show the last 30 s on their own scales (shape, not size). Hover one to freeze it and read every chart at that moment.",
  memory:
    "Sparklines show the last 30 s on their own scales (shape, not size). Bars fill against the budget or capacity; a warning icon appears past 90%.",
  record:
    "Writes one row per tick, and each GPU time under the tick it belongs to, through the dev server. Follow it with tail -F ~/.cesium-bench/inspector/latest.csv.",
};

type Series =
  | "cache"
  | "targets"
  | "inFlight"
  | "window"
  | "received"
  | "prefetch"
  | "uploadQueue"
  | "decode"
  | "frames"
  | "cpu";

type Win = "frame" | "slow";

/** A moment under the pointer or pinned: when, and the tick if it has one. */
export interface Cursor {
  t: number;
  tick?: number;
}

/** What one tick of the engine looked like (`TickEvent`, stamped on arrival). */
export interface TickEntry {
  tick: number;
  t: number;
  rendering: boolean;
  why: readonly string[];
  cpuMs: number;
  gpu?: {
    ms: number;
    passes: Array<[string, number]>;
    untimed: number;
    inFrame: number;
    between: number;
  };
}

/** The 4 Hz window the Streaming and Memory charts read. */
export interface SlowWin {
  n: number;
  /** Samples that are real (the rest is padding before the first). */
  valid: number;
  times: number[];
  series: Record<Series, number[]>;
}

/** The window the Frame charts read: 4 Hz samples live, ticks when frozen or pinned. */
export interface FrameWin {
  n: number;
  valid: number;
  times: number[];
  /** Tick ids (-1: padding); only when the window reads per tick. */
  ticks?: number[];
  detail?: Array<TickEntry | undefined>;
  /** Whether a tick has a GPU sample (per-tick windows). */
  measured?: boolean[];
  cpu: number[];
  fps: number[];
  passes: Map<string, number[]>;
  order: string[];
  untimed: number[];
  inFrame: number[];
  between: number[];
}

/** Everything the section builders read: pure, so a test can render it. */
export interface InspectorView {
  snap: InspectorSnapshot;
  frame: FrameWin;
  slow: SlowWin;
  cursor?: Cursor;
  pinned?: boolean;
  lastMove?: LastMove;
  moving?: boolean;
  closedGroups?: ReadonlySet<string>;
  gpuShare?: boolean;
}

export interface LastMove {
  ms: number;
  requests?: number;
  bytes?: number;
}

/** The sample a cursor points at in a window, if it is still in it. */
export function indexIn(
  w: { n: number; times: number[]; ticks?: number[] },
  c: Cursor | undefined,
): number | undefined {
  if (!c) {
    return undefined;
  }
  if (c.tick !== undefined && w.ticks) {
    const i = w.ticks.lastIndexOf(c.tick);
    return i < 0 ? undefined : i;
  }
  let first = -1;
  let last = -1;
  for (let i = 0; i < w.n; i++) {
    if (w.ticks && w.ticks[i]! < 0) {
      continue;
    }
    first = first < 0 ? i : first;
    last = i;
  }
  if (first < 0) {
    return undefined;
  }
  const step =
    first === last ? 1 : (w.times[last]! - w.times[first]!) / (last - first);
  let best = first;
  let distance = Infinity;
  for (let i = first; i <= last; i++) {
    const d = Math.abs(w.times[i]! - c.t);
    if (d < distance) {
      distance = d;
      best = i;
    }
  }
  return distance > 2 * step ? undefined : best;
}

/** Attaches an inspector over `element` (positioned relative to it). */
export function attachInspector(
  element: HTMLElement,
  source: Inspectable,
  options: InspectorOptions = {},
): InspectorHandle {
  injectStyle();
  const interval = options.interval ?? 250;
  const storageKey = options.storageKey ?? "cesium-inspector";
  const root = document.createElement("div");
  const placement = options.placement ?? "top-left";
  root.className = `cesium-inspector${placement.endsWith("right") ? " right" : ""}${
    placement.startsWith("bottom") ? " bottom" : ""
  }`;
  // The panel is for reading and clicking, not for the camera underneath.
  for (const type of ["pointerdown", "pointerup", "wheel", "dblclick"]) {
    root.addEventListener(type, (e) => e.stopPropagation());
  }

  const header = document.createElement("button");
  header.type = "button";
  header.className = "ci-header";
  const swatch = document.createElement("span");
  swatch.className = "ci-swatch";
  if (source.color) {
    swatch.style.background = source.color;
  } else {
    swatch.hidden = true;
  }
  const name = document.createElement("span");
  name.className = "ci-name";
  name.textContent = source.name;
  const summary = document.createElement("span");
  summary.className = "ci-summary";
  const chevron = document.createElement("span");
  chevron.className = "ci-chevron";
  chevron.setAttribute("aria-hidden", "true");
  header.append(swatch, name, summary, chevron);

  const body = document.createElement("div");
  body.className = "ci-body";
  const bodies = new Map<SectionKey, HTMLElement>();
  const sections = new Map<SectionKey, HTMLDetailsElement>();
  const opened = read<Partial<Record<SectionKey, boolean>>>(
    `${storageKey}.sections`,
    {},
  );
  /** Each chart section's readout slot (the moment under the cursor), and Frame's pause switch. */
  const readouts: HTMLElement[] = [];
  let pauseButton: HTMLButtonElement | undefined;
  for (const [key, title] of SECTIONS) {
    const details = document.createElement("details");
    details.className = "ci-section";
    details.open = opened[key] ?? (key !== "gpu" && key !== "memory");
    const s = document.createElement("summary");
    s.append(document.createTextNode(title));
    const bar = document.createElement("span");
    bar.className = "ci-sumbar";
    if (key === "frame" || key === "streaming" || key === "memory") {
      const readout = document.createElement("span");
      readout.className = "ci-readout";
      readout.dataset.on = "0";
      readouts.push(readout);
      bar.append(readout);
    }
    if (key === "frame") {
      pauseButton = document.createElement("button");
      pauseButton.type = "button";
      pauseButton.className = "ci-pausebtn";
      pauseButton.textContent = "Pause";
      pauseButton.setAttribute("aria-pressed", "false");
      pauseButton.title = "Freeze the charts; then ← and → step, Shift for ten";
      bar.append(pauseButton);
    }
    const text = SECTION_INFO[key];
    if (text) {
      bar.insertAdjacentHTML("beforeend", info(text, `section-${key}`));
    }
    if (bar.childElementCount > 0) {
      s.append(bar);
    }
    const content = document.createElement("div");
    content.className = "ci-content";
    details.append(s, content);
    details.addEventListener("toggle", () => {
      opened[key] = details.open;
      write(`${storageKey}.sections`, opened);
    });
    body.append(details);
    bodies.set(key, content);
    sections.set(key, details);
  }
  sections.get("pick")!.hidden = true;
  // Buttons in a summary are for pressing, not for folding the section.
  body.addEventListener("click", (e) => {
    if ((e.target as Element | null)?.closest?.(".ci-sumbar")) {
      e.preventDefault();
    }
  });

  // Recording (development builds of 2.0): a switch, and what it has written.
  const recordable = source.record;
  const recordBody = bodies.get("record")!;
  sections.get("record")!.hidden = !recordable;
  let recordCells:
    | Record<"state" | "rows" | "images" | "file" | "error", HTMLElement>
    | undefined;
  let recordSwitch: HTMLButtonElement | undefined;
  let frameButton: HTMLButtonElement | undefined;
  if (recordable) {
    recordSwitch = document.createElement("button");
    recordSwitch.type = "button";
    recordSwitch.className = "ci-switch";
    recordSwitch.setAttribute("role", "switch");
    recordSwitch.innerHTML =
      '<span class="ci-switch-track"><span class="ci-switch-knob"></span></span><span>Record every tick to a CSV</span>';
    frameButton = document.createElement("button");
    frameButton.type = "button";
    frameButton.className = "ci-button";
    frameButton.textContent = "Save the next tick's image";
    const grid = document.createElement("div");
    grid.className = "ci-kv";
    const cell = (label: string) => {
      const k = document.createElement("span");
      k.textContent = label;
      const v = document.createElement("span");
      v.className = "ci-num ci-vtext";
      grid.append(k, v);
      return v;
    };
    recordCells = {
      state: cell("State"),
      rows: cell("Rows"),
      images: cell("Images"),
      file: cell("File"),
      error: cell("Server"),
    };
    recordBody.append(recordSwitch, frameButton, grid);
    recordSwitch.addEventListener("click", () => {
      if (recordable.active) {
        recordable.stop();
      } else {
        recordable.start();
      }
      refreshRecord();
    });
    frameButton.addEventListener("click", () => {
      recordable.captureNext();
      refreshRecord();
    });
  }
  function refreshRecord(): void {
    if (!recordable || !recordSwitch || !frameButton || !recordCells) {
      return;
    }
    const on = recordable.active;
    const st = recordable.status();
    recordSwitch.setAttribute("aria-checked", String(on));
    frameButton.disabled = !on;
    recordCells.state.textContent = on
      ? "Recording"
      : st.rows > 0
        ? "Stopped"
        : "Off";
    recordCells.rows.textContent = count(st.rows);
    recordCells.images.textContent = count(st.frames);
    recordCells.file.textContent = st.file ?? "—";
    recordCells.file.title = st.file ?? "";
    recordCells.error.textContent = st.error ?? "OK";
    recordCells.error.title = st.error ?? "";
    recordCells.error.dataset.warn = st.error ? "1" : "0";
  }
  refreshRecord();
  root.append(header, body);
  element.append(root);

  // History (4 Hz), the frame rate and the last move are derived across snapshots.
  const history: Record<Series, number[]> = {
    cache: [],
    targets: [],
    inFlight: [],
    window: [],
    received: [],
    prefetch: [],
    uploadQueue: [],
    decode: [],
    frames: [],
    cpu: [],
  };
  const times: number[] = [];
  const push = (series: Series, value: number) => {
    const s = history[series];
    s.push(value);
    if (s.length > HISTORY) {
      s.shift();
    }
  };
  /** Each GPU pass's time, in the frame's order (`FrameSnapshot.gpuPasses`). */
  const passHistory = new Map<string, number[]>();
  /**
   * The rows' order, stable: a pass missing from a frame (it didn't run,
   * or took too little to list) keeps its row instead of dropping to the
   * end; a new pass goes after the one it followed.
   */
  const passOrder: string[] = [];
  /** What no timestamp covers, per refresh (`untimedMs`). */
  const untimedHistory: number[] = [];
  /** The untimed share's two parts: inside the frame's markers, and between frames. */
  const inFrameHistory: number[] = [];
  const betweenHistory: number[] = [];
  /** GPU groups the viewer folded away (all open by default). */
  const closedGroups = new Set<string>();
  /** The GPU chart as shares of the frame rather than milliseconds. */
  let gpuShare = read<boolean>(`${storageKey}.gpuShare`, false) === true;
  const pushPasses = (
    passes: Array<[string, number]> | undefined,
    drawing: boolean,
  ) => {
    const now = new Map(passes ?? []);
    // Passes seen before, then new ones, as the frame orders them.
    (passes ?? []).forEach(([pass], i) => {
      if (!passHistory.has(pass)) {
        passHistory.set(pass, []);
      }
      if (!passOrder.includes(pass)) {
        const before = i > 0 ? passOrder.indexOf(passes![i - 1]![0]) : -1;
        passOrder.splice(before + 1, 0, pass);
      }
    });
    for (const [pass, series] of passHistory) {
      series.push(drawing ? (now.get(pass) ?? 0) : 0);
      if (series.length > HISTORY) {
        series.shift();
      }
      // A pass that stopped running for the whole window: dropped.
      if (series.length === HISTORY && series.every((v) => v === 0)) {
        passHistory.delete(pass);
        const at = passOrder.indexOf(pass);
        if (at >= 0) {
          passOrder.splice(at, 1);
        }
      }
    }
  };

  // The engine's per-tick feed, newest last.
  const ring: TickEntry[] = [];
  const unsubscribe = source.ticks?.((e: TickEvent) => {
    if (e.kind === "tick") {
      ring.push({
        tick: e.tick,
        t: performance.now(),
        rendering: e.rendering,
        why: e.why,
        cpuMs: e.cpuMs,
      });
      if (ring.length > TICKS) {
        ring.shift();
      }
    } else {
      // A GPU result arrives a few ticks after the tick it belongs to.
      for (let i = ring.length - 1; i >= 0; i--) {
        if (ring[i]!.tick === e.tick) {
          ring[i]!.gpu = {
            ms: e.ms,
            passes: e.passes,
            untimed: finite(untimedMs(e.intervalMs, e.ms)),
            inFrame: finite(e.inFrameUntimedMs),
            between: finite(e.betweenFramesMs),
          };
          break;
        }
        if (ring[i]!.tick < e.tick) {
          break;
        }
      }
    }
  });

  let last: InspectorSnapshot | undefined;
  let lastAt = performance.now();
  let framesPerSecond: number | undefined;
  /** When a frame last rendered, and the smoothed time between frames, ms. */
  let lastFrameAt = 0;
  let frameIntervalMs = 0;
  let cameraKey = "";
  let move:
    { stoppedAt: number; requests?: number; bytes?: number } | undefined;
  let lastMove: LastMove | undefined;
  let expanded = false;

  // ---- time: one state for every chart
  /** The Pause button's. */
  let paused = false;
  /** The pointer is over a chart. */
  let hovering = false;
  /** A click pinned the moment under the cursor. */
  let pinned = false;
  let cursor: Cursor | undefined;
  /** The windows frozen when the display stopped, and when. */
  let frozen: { frame: FrameWin; slow: SlowWin } | undefined;
  let frozenAt = 0;
  /** The windows the charts show now (what a pointer position means). */
  let shown: { frame: FrameWin; slow: SlowWin } | undefined;
  let lastY = 0;

  const slowWindow = (): SlowWin => ({
    n: HISTORY,
    valid: Math.min(times.length, HISTORY),
    times: alignTimes(times, HISTORY, 1000 / 4),
    series: Object.fromEntries(
      (Object.keys(history) as Series[]).map((k) => [
        k,
        align(history[k], HISTORY),
      ]),
    ) as Record<Series, number[]>,
  });
  const liveFrameWindow = (): FrameWin => ({
    n: HISTORY,
    valid: Math.min(times.length, HISTORY),
    times: alignTimes(times, HISTORY, 1000 / 4),
    cpu: align(history.cpu, HISTORY),
    fps: align(history.frames, HISTORY),
    passes: passHistory,
    order: passOrder,
    untimed: untimedHistory,
    inFrame: inFrameHistory,
    between: betweenHistory,
  });
  const tickWindow = (): FrameWin => {
    const entries = ring.slice(-TICKS);
    const pad = TICKS - entries.length;
    const first = entries[0]?.t ?? performance.now();
    const win: FrameWin = {
      n: TICKS,
      valid: entries.length,
      times: [
        ...Array.from({ length: pad }, (_, i) => first - (pad - i) * 16),
        ...entries.map((e) => e.t),
      ],
      ticks: [
        ...new Array<number>(pad).fill(-1),
        ...entries.map((e) => e.tick),
      ],
      detail: [...new Array<undefined>(pad).fill(undefined), ...entries],
      measured: [
        ...new Array<boolean>(pad).fill(false),
        ...entries.map((e) => e.gpu !== undefined),
      ],
      cpu: [
        ...new Array<number>(pad).fill(0),
        ...entries.map((e) => (e.rendering ? e.cpuMs : 0)),
      ],
      fps: [],
      passes: new Map(),
      order: [],
      untimed: [
        ...new Array<number>(pad).fill(0),
        ...entries.map((e) => e.gpu?.untimed ?? 0),
      ],
      inFrame: [
        ...new Array<number>(pad).fill(0),
        ...entries.map((e) => e.gpu?.inFrame ?? 0),
      ],
      between: [
        ...new Array<number>(pad).fill(0),
        ...entries.map((e) => e.gpu?.between ?? 0),
      ],
    };
    let prevRender: number | undefined;
    win.fps = [
      ...new Array<number>(pad).fill(0),
      ...entries.map((e) => {
        if (!e.rendering) {
          return 0;
        }
        const v =
          prevRender === undefined ? 0 : 1000 / Math.max(1, e.t - prevRender);
        prevRender = e.t;
        return v;
      }),
    ];
    for (const name of passOrder) {
      if (entries.some((e) => e.gpu?.passes.some(([p]) => p === name))) {
        win.order.push(name);
      }
    }
    for (const e of entries) {
      for (const [p] of e.gpu?.passes ?? []) {
        if (!win.order.includes(p)) {
          win.order.push(p);
        }
      }
    }
    for (const name of win.order) {
      win.passes.set(name, [
        ...new Array<number>(pad).fill(0),
        ...entries.map(
          (e) => e.gpu?.passes.find(([p]) => p === name)?.[1] ?? 0,
        ),
      ]);
    }
    return win;
  };
  const buildWindows = (perTick: boolean) => ({
    frame: perTick && ring.length > 0 ? tickWindow() : liveFrameWindow(),
    slow: slowWindow(),
  });
  const windows = () => {
    if (paused || hovering) {
      if (!frozen) {
        frozen = buildWindows(true);
        frozenAt = performance.now();
      }
      return frozen;
    }
    frozen = undefined;
    return buildWindows(pinned);
  };

  // One tooltip beside the crosshair with every chart's value at the
  // moment, one for the "i" buttons and status icons.
  /** Detail the rows can't show, beside the panel (never over a chart). */
  const detail = document.createElement("div");
  detail.className = "ci-detail";
  detail.hidden = true;
  element.append(detail);
  const infoTip = document.createElement("div");
  infoTip.className = "ci-tip ci-tip-prose";
  infoTip.hidden = true;
  infoTip.setAttribute("role", "tooltip");
  root.append(infoTip);

  const showInfo = (el: HTMLElement) => {
    const text = el.dataset.info;
    if (!text) {
      return;
    }
    infoTip.textContent = text;
    infoTip.hidden = false;
    const box = root.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const left = Math.min(
      Math.max(0, r.left - box.left - 8),
      Math.max(0, box.width - infoTip.offsetWidth),
    );
    infoTip.style.left = `${left}px`;
    const below = r.bottom - box.top + 4;
    infoTip.style.top = `${
      below + infoTip.offsetHeight > box.height
        ? Math.max(0, r.top - box.top - infoTip.offsetHeight - 4)
        : below
    }px`;
  };
  const hideInfo = () => {
    infoTip.hidden = true;
  };
  root.addEventListener("pointerover", (e) => {
    const el = (e.target as Element | null)?.closest?.<HTMLElement>(
      "[data-info]",
    );
    if (el) {
      showInfo(el);
    }
  });
  root.addEventListener("pointerout", (e) => {
    const el = (e.target as Element | null)?.closest?.("[data-info]");
    if (el && !el.contains(e.relatedTarget as Node | null)) {
      hideInfo();
    }
  });
  root.addEventListener("focusin", (e) => {
    const el = (e.target as Element | null)?.closest?.<HTMLElement>(
      "[data-info]",
    );
    if (el) {
      showInfo(el);
    }
  });
  root.addEventListener("focusout", hideInfo);

  const releasePin = () => {
    pinned = false;
    if (!hovering && !paused) {
      cursor = undefined;
    }
  };

  const cursorKey = (c: Cursor | undefined) =>
    c ? `${c.tick ?? ""}@${c.t}` : "";
  const hoverAt = (plot: Element, e: PointerEvent) => {
    lastY = e.clientY;
    const win =
      plot.getAttribute("data-win") === "frame" ? shown?.frame : shown?.slow;
    if (!win) {
      return;
    }
    const rect = plot.getBoundingClientRect();
    const f = (e.clientX - rect.left) / Math.max(1, rect.width);
    const before = `${hovering}${cursorKey(cursor)}`;
    if (!pinned) {
      const i = Math.min(win.n - 1, Math.max(0, Math.round(f * (win.n - 1))));
      const tick = (win as FrameWin).ticks?.[i];
      cursor =
        tick !== undefined && tick < 0
          ? undefined
          : { t: win.times[i]!, ...(tick !== undefined ? { tick } : {}) };
    }
    hovering = true;
    if (before !== `${hovering}${cursorKey(cursor)}`) {
      render(false);
    }
  };
  const hoverOff = () => {
    if (!hovering) {
      return;
    }
    hovering = false;
    if (!pinned && !paused) {
      cursor = undefined;
    }
    render(false);
  };
  root.addEventListener("pointermove", (e) => {
    const plot = (e.target as Element | null)?.closest?.("svg[data-plot]");
    if (plot) {
      hoverAt(plot, e);
    } else {
      hoverOff();
    }
  });
  root.addEventListener("pointerleave", hoverOff);
  body.addEventListener("click", (e) => {
    const plot = (e.target as Element | null)?.closest?.("svg[data-plot]");
    if (!plot) {
      return;
    }
    if (pinned) {
      releasePin();
    } else if (cursor) {
      pinned = true;
    }
    render(false);
  });
  root.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideInfo();
      if (pinned) {
        releasePin();
        render(false);
      }
      return;
    }
    if (paused && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      const win = shown?.frame;
      if (!win) {
        return;
      }
      e.preventDefault();
      const delta = (e.key === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 10 : 1);
      const at = indexIn(win, cursor) ?? win.n - 1;
      let i = Math.min(win.n - 1, Math.max(0, at + delta));
      while (i < win.n - 1 && win.ticks && win.ticks[i]! < 0) {
        i++;
      }
      const tick = win.ticks?.[i];
      cursor = { t: win.times[i]!, ...(tick !== undefined ? { tick } : {}) };
      render(false);
    }
  });
  pauseButton?.addEventListener("click", (e) => {
    e.stopPropagation();
    paused = !paused;
    if (!paused && !hovering && !pinned) {
      cursor = undefined;
    }
    render(false);
  });
  bodies.get("frame")!.addEventListener(
    "toggle",
    (e) => {
      const el = e.target as HTMLDetailsElement;
      const name = el.dataset.group;
      if (name !== undefined) {
        if (el.open) {
          closedGroups.delete(name);
        } else {
          closedGroups.add(name);
        }
      }
    },
    true,
  );
  bodies.get("frame")!.addEventListener("click", (e) => {
    const button = (e.target as Element | null)?.closest?.("[data-gpu-scale]");
    if (button instanceof HTMLElement) {
      gpuShare = button.dataset.gpuScale === "share";
      write(`${storageKey}.gpuShare`, gpuShare);
      render(false);
    }
  });

  const setExpanded = (on: boolean) => {
    expanded = on;
    root.classList.toggle("expanded", on);
    header.setAttribute("aria-expanded", String(on));
    header.title = on ? "Collapse the inspector" : "Expand the inspector";
  };
  setExpanded(options.expanded ?? read(`${storageKey}.expanded`, false));
  header.addEventListener("click", () => {
    setExpanded(!expanded);
    write(`${storageKey}.expanded`, expanded);
    refresh();
  });

  /** Sets a section's content, keeping the keyboard focus on its button across the redraw. */
  const set = (key: SectionKey, html: string | undefined) => {
    sections.get(key)!.hidden = html === undefined;
    if (html === undefined) {
      return;
    }
    const content = bodies.get(key)!;
    const active = document.activeElement;
    const focus =
      active instanceof HTMLElement && content.contains(active)
        ? active.dataset.focus
        : undefined;
    content.innerHTML = html;
    if (focus) {
      content
        .querySelector<HTMLElement>(`[data-focus="${cssEscape(focus)}"]`)
        ?.focus({ preventScroll: true });
    }
  };

  const CHART_SECTIONS: SectionKey[] = ["frame", "streaming", "memory"];

  /** Draws the sections (the ones with charts only when `all` is false). */
  function render(all: boolean): void {
    updateBar();
    if (!expanded || !last) {
      return;
    }
    const w = windows();
    shown = w;
    // A pinned moment that scrolled out of its window is let go.
    if (
      pinned &&
      indexIn(w.frame.ticks ? w.frame : w.slow, cursor) === undefined
    ) {
      releasePin();
    }
    const html = renderSections({
      snap: last,
      frame: w.frame,
      slow: w.slow,
      ...(cursor && (hovering || pinned || paused) ? { cursor } : {}),
      pinned,
      lastMove,
      moving: move !== undefined,
      closedGroups,
      gpuShare,
    });
    for (const key of all
      ? (Object.keys(html) as SectionKey[])
      : CHART_SECTIONS) {
      if (key !== "pick" && key !== "record") {
        set(key, html[key]);
      }
    }
    updateReadout();
  }

  let frozenText = "";
  function updateBar(): void {
    const frozenNow = paused || hovering;
    frozenText = frozenNow
      ? `paused · ${((performance.now() - frozenAt) / 1000).toFixed(1)} s behind live`
      : "";
    if (pauseButton) {
      pauseButton.textContent = paused ? "Live" : "Pause";
      pauseButton.setAttribute("aria-pressed", String(paused));
    }
  }

  function updateReadout(): void {
    const w = shown;
    const moment = hovering || pinned || paused ? cursor : undefined;
    let text = frozenText;
    let full = frozenText;
    detail.hidden = true;
    if (moment && w && expanded) {
      const fi = indexIn(w.frame, moment);
      const entry = fi !== undefined ? w.frame.detail?.[fi] : undefined;
      const label = momentLabel(w.frame, moment, pinned, entry);
      text = label;
      full = label;
      // Detail the rows can't show: group values and the tick's passes.
      const legend = [
        ...body.querySelectorAll<HTMLElement>(".ci-glegend [data-tip]"),
      ];
      if (legend.length > 0 || entry) {
        detail.replaceChildren();
        const add = (cls: string, a: string, b?: string) => {
          const r = document.createElement("div");
          r.className = cls;
          if (b === undefined) {
            r.textContent = a;
          } else {
            const v = document.createElement("strong");
            v.textContent = a;
            const n = document.createElement("span");
            n.textContent = b;
            r.append(v, n);
          }
          detail.append(r);
        };
        add("ci-detail-head", label);
        for (const row of legend) {
          add(
            "ci-detail-row",
            row.dataset.tipValue ?? "—",
            row.dataset.tip ?? "",
          );
        }
        if (w.frame.detail) {
          const gpu = entry?.gpu;
          add(
            "ci-detail-head",
            gpu ? `GPU ${gpu.ms.toFixed(2)} ms by pass` : "GPU: not measured",
          );
          for (const [pass, v] of gpu?.passes ?? []) {
            add("ci-detail-row", v.toFixed(2), pass);
          }
        }
        // Beside the inspector on the side with room, level with the pointer;
        // with none (a narrow view) it docks into the header's readout.
        detail.hidden = false;
        const er = element.getBoundingClientRect();
        const rr = root.getBoundingClientRect();
        const width = detail.offsetWidth;
        const left =
          er.right - rr.right - 8 >= width
            ? rr.right - er.left + 8
            : rr.left - er.left - 8 >= width
              ? rr.left - er.left - 8 - width
              : undefined;
        if (left === undefined) {
          detail.hidden = true;
          const gpu = entry?.gpu;
          full = `${label}${gpu ? ` · GPU ${gpu.ms.toFixed(2)} ms` : ""}`;
          text = full;
        } else {
          detail.style.left = `${left}px`;
          const y = hovering && lastY ? lastY : rr.top + rr.height / 2;
          detail.style.top = `${Math.max(0, Math.min(y - er.top - detail.offsetHeight / 2, er.height - detail.offsetHeight))}px`;
        }
      }
    }
    for (const r of readouts) {
      r.textContent = text;
      r.title = full;
      r.dataset.on = text ? "1" : "0";
    }
  }

  function refresh(): void {
    const snap = source.snapshot();
    const now = performance.now();
    const seconds = Math.max(1e-3, (now - lastAt) / 1000);
    if (
      snap.frame?.framesRendered !== undefined &&
      last?.frame?.framesRendered !== undefined
    ) {
      framesPerSecond =
        (snap.frame.framesRendered - last.frame.framesRendered) / seconds;
      const rendered = snap.frame.framesRendered - last.frame.framesRendered;
      if (rendered > 0) {
        const interval = (now - lastAt) / rendered;
        frameIntervalMs =
          frameIntervalMs > 0
            ? frameIntervalMs * 0.7 + interval * 0.3
            : interval;
        lastFrameAt = now;
      }
    }
    const received = snap.tiles?.received?.bytes;
    const lastReceived = last?.tiles?.received?.bytes;
    times.push(now);
    if (times.length > HISTORY) {
      times.shift();
    }
    push("cache", snap.tiles?.cache?.bytes ?? 0);
    push("targets", snap.gpu?.renderTargetBytes ?? 0);
    push("inFlight", snap.tiles?.loading ?? 0);
    push("window", snap.tiles?.window?.max ?? 0);
    push(
      "received",
      received !== undefined && lastReceived !== undefined
        ? Math.max(0, received - lastReceived) / seconds
        : 0,
    );
    // Prefetch's share of the bytes received since the last snapshot.
    const prefetched = (x: InspectorSnapshot | undefined) =>
      x?.tiles?.purposes?.find((p) => p.label === "Prefetch")?.bytes;
    const prefetchNow = prefetched(snap);
    const prefetchLast = prefetched(last);
    push(
      "prefetch",
      received !== undefined &&
        lastReceived !== undefined &&
        received > lastReceived &&
        prefetchNow !== undefined &&
        prefetchLast !== undefined
        ? (prefetchNow - prefetchLast) / (received - lastReceived)
        : 0,
    );
    push("uploadQueue", snap.tiles?.window?.uploadQueue ?? 0);
    push("decode", snap.pipeline?.stages.decode?.p50 ?? 0);
    push("frames", framesPerSecond ?? 0);
    // While idle no frame time is spent: the lines drop to zero. Idle is no
    // frame for longer than the recent frames took (a sample with no frame
    // finished in it, as at a few frames a second, is not idle).
    const drawing =
      framesPerSecond === undefined ||
      framesPerSecond > 0 ||
      now - lastFrameAt < Math.max(500, 2.5 * frameIntervalMs);
    push("cpu", drawing ? (snap.frame?.cpuMs ?? 0) : 0);
    pushPasses(snap.frame?.gpuPasses, drawing);
    untimedHistory.push(
      drawing
        ? finite(
            untimedMs(
              snap.frame?.gpuIntervalMs,
              snap.frame?.gpuMs ?? Number.NaN,
            ),
          )
        : 0,
    );
    if (untimedHistory.length > HISTORY) {
      untimedHistory.shift();
    }
    inFrameHistory.push(
      drawing ? finite(snap.frame?.gpuInFrameUntimedMs ?? 0) : 0,
    );
    betweenHistory.push(
      drawing ? finite(snap.frame?.gpuBetweenFramesMs ?? 0) : 0,
    );
    if (inFrameHistory.length > HISTORY) {
      inFrameHistory.shift();
      betweenHistory.shift();
    }

    // The last move: from when the camera stopped until streaming settled,
    // with the requests and bytes it cost where the engine counts them (an
    // L1′-style number, live).
    if (snap.camera && snap.tiles) {
      const key = snap.camera.map((v) => v.toFixed(3)).join();
      const received = snap.tiles.received;
      if (key !== cameraKey) {
        if (cameraKey) {
          move ??= {
            stoppedAt: now,
            ...(received
              ? { requests: received.requests, bytes: received.bytes }
              : {}),
          };
          move.stoppedAt = now;
        }
        cameraKey = key;
      } else if (move && snap.state === "settled") {
        lastMove = {
          ms: now - move.stoppedAt,
          ...(received && move.requests !== undefined
            ? {
                requests: received.requests - move.requests,
                bytes: received.bytes - move.bytes!,
              }
            : {}),
        };
        move = undefined;
      }
    }
    last = snap;
    lastAt = now;

    summary.innerHTML = summaryHtml(snap, expanded);
    const reason = problemsReason(snap);
    if (reason) {
      header.setAttribute("aria-description", reason);
    } else {
      header.removeAttribute("aria-description");
    }
    if (recordable?.active || expanded) {
      refreshRecord();
    }
    root.dataset.state = snap.state;
    const error = snap.problems?.errors[0];
    if (error !== undefined && error !== shownError) {
      sections.get("problems")!.open = true;
    }
    shownError = error;
    if (!expanded) {
      return;
    }
    render(true);
  }
  let shownError: string | undefined;
  refresh();
  const timer = setInterval(refresh, interval);

  return {
    element: root,
    refresh,
    setExpanded,
    showPick(pick) {
      const details = sections.get("pick")!;
      details.hidden = false;
      details.open = true;
      bodies.get("pick")!.innerHTML = pickHtml(pick);
    },
    dispose() {
      clearInterval(timer);
      unsubscribe?.();
      detail.remove();
      root.remove();
    },
  };
}

/** `CSS.escape` where there is a CSS global, else a plain quote guard (tests). */
function cssEscape(value: string): string {
  const css = (globalThis as { CSS?: { escape?: (v: string) => string } }).CSS;
  return css?.escape ? css.escape(value) : value.replace(/["\\]/g, "\\$&");
}

/** `times` right-aligned to `n`, the padding spaced `step` ms before the first. */
function alignTimes(
  times: readonly number[],
  n: number,
  step: number,
): number[] {
  const out = times.slice(-n);
  const first = out[0] ?? performance.now();
  const pad = n - out.length;
  return [
    ...Array.from({ length: pad }, (_, i) => first - (pad - i) * step),
    ...out,
  ];
}

/**
 * The header readout's text for a moment: pinned or not, the tick, how long
 * before the window's newest sample, and why the tick ran. Its slot has a
 * fixed width (the text is cut with an ellipsis, the whole in its title).
 */
export function momentLabel(
  w: { times: number[]; n: number },
  c: Cursor,
  pinned: boolean,
  entry?: { tick: number; rendering: boolean; why: readonly string[] },
): string {
  const end = w.times[w.n - 1] ?? c.t;
  return [
    pinned ? "pinned" : "",
    entry ? `tick ${entry.tick}` : "",
    `${((end - c.t) / 1000).toFixed(1)} s ago`,
    entry ? (entry.why.length ? entry.why.join("+") : "no wake") : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

// ------------------------------------------------------------- sections

/** Every section's HTML for a view (undefined: the section has nothing to show). */
export function renderSections(
  v: InspectorView,
): Record<SectionKey, string | undefined> {
  const s = v.snap;
  const problems = s.problems;
  return {
    problems:
      problems && problems.errors.length + problems.warnings.length > 0
        ? problemsHtml(problems)
        : undefined,
    frame: frameHtml(v),
    streaming: s.tiles ? streamingHtml(v) : undefined,
    pipeline:
      s.pipeline && (s.pipeline.samples > 0 || s.pipeline.content)
        ? pipelineHtml(s.pipeline)
        : undefined,
    memory:
      s.memory || s.tiles?.cache || s.gpu?.renderTargetBytes !== undefined
        ? memoryHtml(v)
        : undefined,
    gpu: s.gpu ? gpuHtml(s.gpu) : undefined,
    pick: undefined,
    record: undefined,
  };
}

const problemsReason = (s: InspectorSnapshot): string | undefined => {
  const n = s.problems
    ? s.problems.errors.length + s.problems.warnings.length
    : 0;
  return n > 0
    ? `${n} ${s.problems!.errors.length > 0 ? "problem" : "warning"}${n === 1 ? "" : "s"}: see Problems`
    : undefined;
};

/**
 * The header's segments: collapsed, the headline numbers; always, a status
 * icon, the streaming state and its two counts, each in a cell of its own
 * width so a change in one never moves another.
 */
export function summaryHtml(s: InspectorSnapshot, expanded: boolean): string {
  const cells: string[] = [];
  if (!expanded) {
    if (s.frame?.cpuMs !== undefined) {
      cells.push(
        `<span class="ci-cell ci-c-ms">CPU <b class="ci-num">${ms2(s.frame.cpuMs)}</b></span>`,
        `<span class="ci-cell ci-c-ms">GPU <b class="ci-num">${s.frame.gpuMs !== undefined ? ms2(s.frame.gpuMs) : "—"}</b></span>`,
      );
    }
    if (s.tiles) {
      cells.push(
        `<span class="ci-cell ci-c-tiles"><b class="ci-num">${count(s.tiles.drawn)}</b> tiles</span>`,
      );
    }
  }
  cells.push(status(problemsReason(s)));
  cells.push(
    `<span class="ci-chip ci-statechip" data-state="${s.state}"><span class="ci-dot"></span>${s.state}</span>`,
  );
  const flight = s.tiles?.loading;
  const queue = s.tiles?.window?.uploadQueue;
  cells.push(
    `<span class="ci-cell ci-c-count" data-zero="${flight ? 0 : 1}"><b class="ci-num">${flight !== undefined ? count(flight) : "—"}</b> in flight</span>`,
    `<span class="ci-cell ci-c-count" data-zero="${queue ? 0 : 1}"><b class="ci-num">${queue !== undefined ? count(queue) : "—"}</b> to upload</span>`,
  );
  return cells.join("");
}

const KIND_LABELS: Record<string, string> = {
  terrain: "Terrain tiles",
  meshes: "Meshes (3D Tiles)",
  instanced: "Instanced models",
  patches: "Patches, B-reps",
  billboards: "Billboards, labels",
  lines: "Lines, vectors",
  points: "Point clouds",
};

/** What the frame submitted, by kind: every kind has its row, an unused one muted. */
function geometryHtml(
  geometry: NonNullable<NonNullable<InspectorSnapshot["frame"]>["geometry"]>,
  hidden?: { draws: number; triangles: number },
): string {
  const what = (k: (typeof geometry)[number]) =>
    [
      k.triangles > 0 ? `${count(k.triangles)} tris` : "",
      k.points > 0 ? `${count(k.points)} pts` : "",
      k.segments > 0 ? `${count(k.segments)} segs` : "",
    ]
      .filter(Boolean)
      .join(" · ") || "—";
  return table(
    ["Submitted", "Draws", "Geometry"],
    ["n1", "n3"],
    [
      ...geometry.map((k) => {
        const label = KIND_LABELS[k.kind] ?? k.kind;
        return {
          zero: k.draws === 0,
          cells: [escape(label), count(k.draws), what(k)],
          title: `${label}: ${what(k)}`,
        };
      }),
      // Present while the view culls by occlusion (a feature, not a value).
      ...(hidden
        ? [
            {
              zero: hidden.draws === 0,
              cells: [
                "Hidden by occlusion",
                count(hidden.draws),
                hidden.triangles > 0 ? `${count(hidden.triangles)} tris` : "—",
              ],
              title:
                "Submitted, then left undrawn because the view's own depth hid them (a tick or two late)",
            },
          ]
        : []),
    ],
    "geometry",
    "Counted before GPU culling; patch triangles aren't counted. A kind with no draws this frame is muted.",
  );
}

/** A table with fixed column widths: `cols` name the numeric columns' width classes. */
function table(
  head: string[],
  cols: string[],
  rows: Array<{ cells: string[]; zero?: boolean; title?: string }>,
  key: string,
  infoText?: string,
): string {
  return (
    `<table class="ci-geometry"><colgroup><col>${cols.map((c) => `<col class="${c}">`).join("")}</colgroup>` +
    `<thead><tr>${head
      .map(
        (h, i) =>
          `<th>${h}${i === 0 && infoText ? info(infoText, `table-${key}`) : ""}</th>`,
      )
      .join("")}</tr></thead><tbody>${rows
      .map(
        (r) =>
          `<tr data-zero="${r.zero ? 1 : 0}"${r.title ? ` title="${escape(r.title)}"` : ""}>${r.cells
            .map((c, i) => `<td${i > 0 ? ' class="ci-num"' : ""}>${c}</td>`)
            .join("")}</tr>`,
      )
      .join("")}</tbody></table>`
  );
}

/** CPU-side GPU work since the frame before, as small tables. */
function workHtml(
  w: NonNullable<NonNullable<InspectorSnapshot["frame"]>["work"]>,
): string {
  const rows: Array<[string, string, string]> = [
    ["Buffer writes", count(w.uploadCalls), mb(w.uploadBytes)],
    ["Texture writes", count(w.textureCalls), mb(w.textureBytes)],
    ["Copies encoded", count(w.copyCalls), mb(w.copyBytes)],
    ["Resources created", count(w.createdCount), mb(w.createdBytes)],
    ["Submits", count(w.submits), "—"],
    ["mapAsync", count(w.mapCalls), "—"],
  ];
  // The three largest, always three slots.
  const top = (
    title: string,
    list: Array<[string, number, number]>,
    key: string,
  ) =>
    table(
      [title, "Calls", "Bytes"],
      ["n1", "n2"],
      [0, 1, 2].map((i) => {
        const e = list[i];
        return {
          zero: e === undefined,
          cells: e ? [escape(e[0]), count(e[2]), mb(e[1])] : ["—", "—", "—"],
          ...(e ? { title: `${e[0]}: ${mb(e[1])}` } : {}),
        };
      }),
      key,
    );
  return (
    table(
      ["GPU work since the last frame", "Calls", "Bytes"],
      ["n1", "n2"],
      rows.map(([k, calls, bytes]) => ({ cells: [k, calls, bytes] })),
      "work",
    ) +
    top("Largest writes", w.uploadBy, "writes") +
    top("Largest created", w.createdBy, "created")
  );
}

/** Frame: the rate and CPU time over the same axis as the GPU's, then the GPU, then what was submitted. */
function frameHtml(v: InspectorView): string {
  const f = v.snap.frame ?? {};
  const w = v.frame;
  const ci = indexIn(w, v.cursor);
  const tickMode = w.ticks !== undefined;
  const label = tickMode ? `${TICKS} ticks` : "30 s";
  const unmeasured =
    ci !== undefined && w.measured !== undefined && !w.measured[ci];
  const cpuRows = [
    f.framesRendered !== undefined
      ? sparkRow({
          name: "Frames / s",
          values: w.fps,
          valid: w.valid,
          fmt: fixed0,
          ci,
          win: "frame",
          cursor: v,
          color: "var(--ci-text)",
        })
      : "",
    sparkRow({
      name: "CPU / frame (ms)",
      values: w.cpu,
      valid: w.valid,
      fmt: ms2,
      ci,
      win: "frame",
      cursor: v,
      color: "var(--ci-text)",
      key: `<i class="ci-key" style="background:var(--ci-text)"></i>`,
      share: true,
    }),
    f.rendering
      ? valueRow("Rendering", escape(f.rendering), { share: true })
      : "",
  ].join("");
  let html = `<div class="ci-ptable">${pHead("Time", label, true)}${cpuRows}</div>`;

  // GPU: stacked chart, legend, table.
  if (w.passes.size > 0 || f.gpuMs !== undefined) {
    html += gpuTimeHtml(v, ci, unmeasured, label);
  }
  const timing: string[] = [];
  const t = (name: string, text: string | undefined, title?: string) => {
    if (text !== undefined) {
      timing.push(
        valueRow(name, text, { share: true, ...(title ? { title } : {}) }),
      );
    }
  };
  if (f.gpuMs !== undefined) {
    t("GPU / frame (ms)", ms2(f.gpuMs));
    t("GPU span (ms)", f.gpuSpanMs !== undefined ? ms2(f.gpuSpanMs) : "—");
    t(
      "GPU busy (ms)",
      f.gpuIntervalMs !== undefined ? ms2(f.gpuIntervalMs) : "—",
      f.gpuIntervalMs === undefined
        ? "The GPU idled between frames"
        : "Time between frames finishing while the GPU was busy back to back",
    );
    t("GPU latency (ms)", f.gpuWallMs !== undefined ? ms2(f.gpuWallMs) : "—");
  } else {
    t("GPU / frame", "not exposed");
  }
  if (f.triangles !== undefined && f.trianglesPerPixel !== undefined) {
    t("Triangles / pixel", fixed(f.trianglesPerPixel, 2));
  }
  if (f.intervalMs !== undefined) {
    t("Frame interval (ms)", ms2(f.intervalMs));
  }
  if (f.raysCast !== undefined) {
    t("Rays cast", count(f.raysCast), "Since the last frame");
  }
  // The job system (main-thread apply phase and queues): fixed rows while it
  // exists, so values never move the layout.
  if (f.jobs) {
    const j = f.jobs;
    t("Jobs applied", `${ms2(j.applyMs)} ms · ${j.applied} this tick`);
    t(
      "Jobs queued",
      `${j.queued} queued · ${j.running} running · ${j.waiting} to apply · ${j.slicing} progressive`,
    );
    t("Job memory", escape(j.memory));
  }
  html += `<div class="ci-ptable ci-ptable-plain">${timing.join("")}</div>`;
  if (f.geometry) {
    html += geometryHtml(f.geometry, f.hiddenByOcclusion);
  }
  if (f.work) {
    html += workHtml(f.work);
  }
  return html;
}

/** The header of a table of rows: names, a chart column, now and mean. */
function pHead(first: string, window: string, share: boolean): string {
  return (
    `<div class="ci-prow ci-phead${share ? "" : " ci-nos"}"><span></span><span>${escape(first)}</span>` +
    `<span data-info="Each chart is on its own scale: it shows shape, not size. The share bars compare on one scale.">${escape(window)}</span>` +
    `<span>now</span><span>mean</span>${share ? "<span>share</span>" : ""}</div>`
  );
}

/**
 * One row of the time tables: key, name (with its "i"), a sparkline, the
 * value at the cursor (else the latest) and the mean, every cell always there.
 */
function sparkRow(o: {
  name: string;
  values: number[];
  valid: number;
  fmt: (v: number) => string;
  ci: number | undefined;
  win: Win;
  cursor: { cursor?: Cursor | undefined; pinned?: boolean | undefined };
  color?: string;
  limit?: number[];
  key?: string;
  share?: boolean;
  info?: string;
  titleAttr?: string;
}): string {
  const n = o.values.length;
  const at = o.values[o.ci ?? n - 1] ?? 0;
  const recent = o.values.slice(Math.max(0, n - Math.max(1, o.valid)));
  const mean = recent.length
    ? recent.reduce((a, b) => a + b, 0) / recent.length
    : 0;
  const plot = lineSvg(
    o.values,
    o.color ?? "var(--ci-series-1)",
    64,
    14,
    o.win,
    o.ci,
    !!o.cursor.pinned,
    o.limit,
  );
  return prow({
    key: o.key ?? "",
    name: o.name,
    plot,
    now: o.fmt(at),
    mean: o.fmt(mean),
    share: o.share ? "" : undefined,
    tip: [o.name, o.fmt(at)],
    ...(o.info ? { info: o.info } : {}),
    ...(o.titleAttr ? { title: o.titleAttr } : {}),
  });
}

/** A row with only a value (in the "now" column, under the charts' values). */
function valueRow(
  name: string,
  text: string,
  o: { info?: string; title?: string; share?: boolean; zero?: boolean } = {},
): string {
  return prow({
    key: "",
    name,
    plot: "",
    now: text,
    mean: "",
    share: o.share ? "" : undefined,
    zero: !!o.zero,
    ...(o.info ? { info: o.info } : {}),
    ...(o.title ? { title: o.title } : {}),
  });
}

function prow(o: {
  cls?: string;
  key: string;
  name: string;
  plot: string;
  now: string;
  mean: string;
  /** The share bar's HTML when the table has the column ("" for an empty cell). */
  share: string | undefined;
  info?: string;
  title?: string;
  zero?: boolean;
  tip?: [string, string];
}): string {
  return `<div class="ci-prow ${o.share === undefined ? "ci-nos " : ""}${o.cls ?? ""}"${o.zero ? ' data-zero="1"' : ' data-zero="0"'}${
    o.tip
      ? ` data-tip="${escape(o.tip[0])}" data-tip-value="${escape(o.tip[1])}"`
      : ""
  }>${o.key || "<span></span>"}<span class="ci-pname"${o.title ? ` title="${escape(o.title)}"` : ""}><span class="ci-ptext">${escape(o.name)}</span>${
    o.info ? info(o.info, `row-${o.name}`) : ""
  }</span>${o.plot || "<span></span>"}<span class="ci-num ci-now">${o.now}</span><span class="ci-num ci-mean">${o.mean}</span>${
    o.share === undefined ? "" : o.share || "<span></span>"
  }</div>`;
}

/** A group's color token, and a shade of it for its `k`th pass. */
const groupColor = (name: string) =>
  `var(--ci-series-${GPU_GROUPS.indexOf(name as never) + 1})`;
const PASS_SHADES = [1, 0.72, 0.5, 0.34];
const shade = (k: number) => PASS_SHADES[k % PASS_SHADES.length]!;

/** A plot's crosshair at `ci`, always in the markup (hidden without one). */
function crossLine(
  n: number,
  w: number,
  h: number,
  ci: number | undefined,
  pinned: boolean,
): string {
  const x = (((ci ?? 0) / Math.max(1, n - 1)) * w).toFixed(1);
  return `<line class="ci-cross" data-pin="${pinned ? 1 : 0}" x1="${x}" y1="0" x2="${x}" y2="${h}" visibility="${ci === undefined ? "hidden" : "visible"}" />`;
}

const plotOpen = (win: Win, n: number, w: number, h: number) =>
  `<svg data-plot data-win="${win}" data-n="${n}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">`;

/**
 * Bands stacked bottom up, as SVG polygons over `w` × `h`: each band's
 * values a sample, scaled so `top` is the full height. `share` divides each
 * sample by its column's sum (a 100% stack). A 1px gap in the panel's
 * color separates the bands.
 */
function stackSvg(
  bands: ReadonlyArray<{
    series: number[];
    fill: string;
    opacity?: number;
    hatch?: boolean;
  }>,
  w: number,
  h: number,
  top: number,
  share: boolean,
  win: Win,
  ci: number | undefined,
  pinned: boolean,
  extra = "",
): string {
  const n = Math.max(2, bands[0]?.series.length ?? 0);
  const x = (i: number) => ((i / (n - 1)) * w).toFixed(1);
  const sums = new Array<number>(n).fill(0);
  for (const b of bands) {
    b.series.forEach((v, i) => (sums[i]! += v));
  }
  const scale = (i: number) =>
    share ? (sums[i]! > 0 ? 1 / sums[i]! : 0) : top > 0 ? 1 / top : 0;
  const y = (v: number) => (h - Math.min(1, v) * (h - 1)).toFixed(1);
  const lower = new Array<number>(n).fill(0);
  const polygons = bands.map((b) => {
    const upper = Array.from(
      { length: n },
      (_, i) => lower[i]! + (b.series[i] ?? 0) * scale(i),
    );
    const pts = [
      ...upper.map((v, i) => `${x(i)},${y(v)}`),
      ...lower.map((v, i) => `${x(i)},${y(v)}`).reverse(),
    ].join(" ");
    lower.splice(0, n, ...upper);
    const fill = b.hatch ? "url(#ci-hatch)" : b.fill;
    return `<polygon class="ci-band" points="${pts}" style="fill:${fill};fill-opacity:${b.opacity ?? 1}" />`;
  });
  return (
    `${plotOpen(
      win,
      n,
      w,
      h,
    )}<defs><pattern id="ci-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">` +
    `<rect width="4" height="4" fill="var(--ci-grid)" /><line x1="0" y1="0" x2="0" y2="4" stroke="var(--ci-muted)" stroke-width="1.5" /></pattern></defs>` +
    `<line class="ci-base" x1="0" y1="${h - 0.5}" x2="${w}" y2="${h - 0.5}" />${polygons.join("")}${extra}${crossLine(n, w, h, ci, pinned)}</svg>`
  );
}

/** One series as a line on its own scale, in `color` (a limit, if any, as a thin line). */
function lineSvg(
  series: number[],
  color: string,
  w: number,
  h: number,
  win: Win,
  ci: number | undefined,
  pinned: boolean,
  limit?: number[],
): string {
  const n = Math.max(2, series.length);
  const max = Math.max(1e-6, ...series, ...(limit ?? []));
  const x = (i: number) => ((i / (n - 1)) * w).toFixed(1);
  const y = (v: number) => (h - 1 - (v / max) * (h - 3)).toFixed(1);
  const pts = series.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  return (
    `${plotOpen(
      win,
      n,
      w,
      h,
    )}<line class="ci-base" x1="0" y1="${h - 0.5}" x2="${w}" y2="${h - 0.5}" />${
      limit
        ? `<polyline class="ci-limit" points="${limit.map((v, i) => `${x(i)},${y(v)}`).join(" ")}" />`
        : ""
    }<polygon class="ci-area" style="fill:${color}" points="${pts} ${w},${h - 1} 0,${h - 1}" />` +
    `<polyline class="ci-line" style="stroke:${color}" points="${pts}" />${crossLine(n, w, h, ci, pinned)}` +
    `<circle class="ci-mark" r="2.4" cx="${x(ci ?? 0)}" cy="${y(series[ci ?? 0] ?? 0)}" visibility="${ci === undefined ? "hidden" : "visible"}" style="fill:${color}" /></svg>`
  );
}

/** A round number at or above `v`, for the chart's scale. */
function niceCeil(v: number): number {
  if (!(v > 0)) {
    return 1;
  }
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 2.5, 5, 10].find((m) => m * p >= v) ?? 10) * p;
}

/**
 * The GPU time over the window. On top, the groups stacked over time on
 * one millisecond scale (or as shares of the frame: `share`), with the
 * untimed remainder hatched on top and the 60 and 30 fps frame times as
 * reference lines; its legend, a fixed grid, gives each group's time at the
 * moment shown. Below, a table: a row a group (its passes stacked, in
 * shades of its color, so their mix shows over time) and a row a pass (its
 * own line, on its own scale, for shape), each with its time now, its mean
 * over the window, and a bar of its share of the frame on one common scale.
 */
function gpuTimeHtml(
  v: InspectorView,
  ci: number | undefined,
  unmeasured: boolean,
  label: string,
): string {
  const w = v.frame;
  const closed = v.closedGroups ?? new Set<string>();
  const share = !!v.gpuShare;
  const pinned = !!v.pinned;
  const win = gpuWindow(w.passes, w.order, w.untimed, w.n);
  const at = (series: number[]) => series[ci ?? series.length - 1] ?? 0;
  const val = (series: number[]) => (unmeasured ? "—" : ms2(at(series)));
  const top = niceCeil(Math.max(...win.total));
  const bands = [
    ...win.groups.map((g) => ({ series: g.series, fill: groupColor(g.name) })),
    { series: win.untimed.series, fill: "var(--ci-muted)", hatch: true },
  ];
  const W = 300;
  const H = 64;
  // The 60 and 30 fps lines are always in the markup; one off the scale is hidden.
  const budget = [16.7, 33.3]
    .map((ms) => {
      const y = (H - Math.min(1, ms / top) * (H - 1)).toFixed(1);
      return `<line class="ci-budget" visibility="${share || ms >= top ? "hidden" : "visible"}" x1="0" y1="${y}" x2="${W}" y2="${y}" />`;
    })
    .join("");
  const chart =
    `<div class="ci-gpu-head"><span class="ci-gtotal">GPU frame <strong class="ci-num">${val(win.total)} ms</strong></span>` +
    `<span class="ci-seg" role="group" aria-label="Scale">` +
    `<button type="button" data-gpu-scale="ms" data-focus="scale-ms" aria-pressed="${!share}">ms</button>` +
    `<button type="button" data-gpu-scale="share" data-focus="scale-share" aria-pressed="${share}">share</button></span>` +
    `<span class="ci-muted ci-grange">${share ? "0–100%" : `0–${top} ms`}</span></div>` +
    `<div class="ci-gpu-chart">${stackSvg(bands, W, H, top, share, "frame", ci, pinned, budget)}</div>`;
  // A fixed grid: every group, in order, with the untimed share last.
  const legendItem = (
    name: string,
    key: string,
    series: number[] | undefined,
  ) =>
    `<span class="ci-litem" data-tip="${escape(name)}" data-tip-value="${series ? (unmeasured ? "—" : `${val(series)} ms`) : "—"}">${key}<span class="ci-ltext">${escape(name)}</span><b class="ci-num">${series ? val(series) : "—"}</b></span>`;
  const legend = `<div class="ci-glegend">${[
    ...GPU_GROUPS.map((name) => {
      const g = win.groups.find((x) => x.name === name);
      return legendItem(
        name,
        `<i class="ci-key" style="background:${groupColor(name)}"></i>`,
        g?.series ?? new Array<number>(w.n).fill(0),
      );
    }),
    legendItem(
      "Untimed",
      `<i class="ci-key ci-key-hatch"></i>`,
      win.untimed.series,
    ),
  ].join("")}</div>`;

  const base = win.totalMean || 1;
  const bar = (mean: number, color: string, opacity = 1) =>
    `<span class="ci-share" data-info="${((mean / base) * 100).toFixed(1)}% of the frame on average"><span style="inline-size:${Math.min(100, (mean / base) * 100).toFixed(1)}%;background:${color};opacity:${opacity}"></span></span>`;
  const SW = 64;
  const SH = 14;
  const row = (
    cls: string,
    key: string,
    name: string,
    plot: string,
    series: number[],
    mean: number,
    shareBar: string,
    title?: string,
  ) =>
    prow({
      cls,
      key,
      name,
      plot,
      now: val(series),
      mean: ms2(mean),
      share: shareBar,
      ...(title ? { title } : {}),
    });
  const groups = win.groups.map((g) => {
    const color = groupColor(g.name);
    const stacked = stackSvg(
      g.passes.map((p, k) => ({
        series: p.series,
        fill: color,
        opacity: shade(k),
      })),
      SW,
      SH,
      g.max,
      false,
      "frame",
      ci,
      pinned,
    );
    const summary = row(
      "ci-pgroup",
      `<i class="ci-key" style="background:${color}"></i>`,
      g.name,
      stacked,
      g.series,
      g.mean,
      bar(g.mean, color),
    );
    const passRows = g.passes.map((p, k) =>
      row(
        "",
        `<i class="ci-key" style="background:${color};opacity:${shade(k)}"></i>`,
        p.name,
        lineSvg(p.series, color, SW, SH, "frame", ci, pinned),
        p.series,
        p.mean,
        bar(p.mean, color, shade(k)),
        p.name,
      ),
    );
    return `<details class="ci-group"${closed.has(g.name) ? "" : " open"} data-group="${escape(g.name)}"><summary>${summary}</summary>${passRows.join("")}</details>`;
  });
  const untimedRow = row(
    "ci-pgroup ci-pflat",
    `<i class="ci-key ci-key-hatch"></i>`,
    "Untimed",
    lineSvg(win.untimed.series, "var(--ci-muted)", SW, SH, "frame", ci, pinned),
    win.untimed.series,
    win.untimed.mean,
    bar(win.untimed.mean, "var(--ci-muted)"),
  );
  const sub = (name: string, tip: string, values: number[]) => {
    const series = align(values, w.n);
    const mean = series.reduce((a, b) => a + b, 0) / series.length;
    return prow({
      cls: "ci-psub",
      key: `<i class="ci-key ci-key-hatch" style="opacity:.55"></i>`,
      name,
      plot: lineSvg(series, "var(--ci-muted)", SW, SH, "frame", ci, pinned),
      now: val(series),
      mean: ms2(mean),
      share: bar(mean, "var(--ci-muted)", 0.6),
      info: tip,
    });
  };
  const subRows =
    sub(
      "in frame, between passes",
      "Inside the frame's first and last marker, not covered by a timed pass: copies, clears, work the driver adds between passes.",
      w.inFrame,
    ) +
    sub(
      "between frames",
      "From the previous frame's last marker to this frame's first, less timed passes in the gap: the GPU waiting for the next submit (the main thread busy), or work in other submits (uploads, copies) that takes no timestamp.",
      w.between,
    );
  return `${chart}${legend}<div class="ci-ptable">${pHead("GPU time (ms)", label, true)}${groups.join("")}${untimedRow}${subRows}</div>`;
}

const finite = (v: number) => (Number.isFinite(v) ? v : 0);

function streamingHtml(v: InspectorView): string {
  const t = v.snap.tiles!;
  const s = v.slow;
  const ci = indexIn(s, v.cursor);
  const row = (
    name: string,
    series: Series,
    fmt: (n: number) => string,
    extra: { limit?: number[]; info?: string } = {},
  ) =>
    sparkRow({
      name,
      values: s.series[series],
      valid: s.valid,
      fmt,
      ci,
      win: "slow",
      cursor: v,
      ...extra,
    });
  // Headline numbers as stats.
  const tiles: string[] = [];
  tiles.push(
    tile(
      "Drawn",
      count(t.drawn),
      t.perView
        ? t.perView.map(([n, c]) => `${escape(n)} ${count(c)}`).join(" · ")
        : t.known !== undefined
          ? `of ${count(t.known)} known`
          : "",
    ),
  );
  if (t.undrawn !== undefined) {
    tiles.push(
      tile(
        "Can't draw",
        count(t.undrawn),
        t.undrawn > 0 ? "see Problems" : "",
        "",
        undefined,
        t.undrawn === 0,
      ),
    );
  }
  if (t.cache) {
    const c = t.cache;
    const limit =
      c.budget !== undefined ? c.budget + (c.overflow ?? 0) : undefined;
    const fraction = limit ? c.bytes / limit : 0;
    tiles.push(
      tile(
        "Tile cache",
        mb(c.bytes),
        c.budget !== undefined
          ? `budget ${mb(c.budget)}${c.overflow ? ` + ${mb(c.overflow)}` : ""}`
          : "",
        limit ? meter(fraction, c.budget! / limit) : "",
        fraction > 0.9 ? "Near the budget (over 90%)" : undefined,
      ),
    );
  }
  if (t.sse) {
    tiles.push(
      tile(
        "Max SSE",
        `${t.sse.maximum} px`,
        [
          t.sse.adjusted !== undefined
            ? `${fixed(t.sse.adjusted, 1)} memory-adjusted`
            : "",
          t.sse.placeholders !== undefined
            ? `${t.sse.placeholders} mixed-LOD`
            : "",
        ]
          .filter(Boolean)
          .join(" · "),
      ),
    );
  }
  let html = `<div class="ci-tiles">${tiles.join("")}</div>`;

  // Rates: one row each, with its chart.
  const w = t.window;
  const rows = [
    row("In flight", "inFlight", fixed0, {
      ...(w ? { limit: s.series.window } : {}),
      info: w
        ? `Requests in flight, against the request window (the dashed line, now ${w.max}): ${w.adaptive ? "adaptive" : "fixed"}${w.protocol ? `, ${w.protocol}` : ""}.`
        : "Content requests in flight.",
    }),
  ];
  if (w?.uploadQueue !== undefined) {
    rows.push(
      row("To upload", "uploadQueue", fixed0, {
        info: "Loaded content waiting for its GPU upload.",
      }),
    );
  }
  if (t.received) {
    rows.push(
      row("Received (MB/s)", "received", (b) => fixed(b / MB, 2), {
        info: "Bytes received per second, from the totals below.",
      }),
    );
  }
  if (t.purposes) {
    rows.push(
      row("Prefetch share", "prefetch", (f) => `${fixed(f * 100, 0)}%`, {
        info: "Prefetch's share of the bytes received since the last sample.",
      }),
    );
  }
  rows.push(
    row("Decode p50 (ms)", "decode", (n) => fixed(n, 1), {
      info: "The median decode time of recent loads (see Content pipeline).",
    }),
  );
  const wasted = (t.purposes ?? []).reduce(
    (n, p) => n + (p.unused ?? 0) + (p.canceled ?? 0),
    0,
  );
  const values: string[] = [];
  if (w?.canceled !== undefined) {
    values.push(
      valueRow("Canceled", count(w.canceled), { zero: w.canceled === 0 }),
    );
  }
  if (t.purposes) {
    values.push(
      valueRow("Evicted undrawn or canceled", count(wasted), {
        zero: wasted === 0,
        info: "Loads evicted without ever being drawn, or canceled, since loading began.",
      }),
    );
  }
  if (t.load) {
    const total = t.load.phases.reduce((sum, p) => sum + p.ms, 0);
    values.push(
      valueRow(
        t.load.settled ? "Load time (settled)" : "Load time (so far)",
        duration(total),
      ),
    );
  }
  if (t.received) {
    values.push(
      valueRow("Requests", count(t.received.requests)),
      valueRow("Received", mb(t.received.bytes)),
    );
  }
  html += `<div class="ci-ptable ci-nos-table">${pHead("Streaming", "30 s", false)}${rows.join("")}${values.join("")}</div>`;

  if (t.load) {
    html += stacked(
      "Load phases",
      "How long loading spent in each phase, in order: resolving the endpoint, the root tileset, to the first content, then to settled.",
      "load",
      t.load.phases.map((p) => ({
        label: p.label,
        value: p.ms,
        text: duration(p.ms),
      })),
    );
  }
  if (t.purposes) {
    // Bytes by what they were for; "drawn" is how many of those loads a
    // view has drawn so far (the rest are in flight, waiting, canceled or
    // evicted unused).
    html += stacked(
      "Requests by purpose",
      "Bytes received by what the requests were for. Drawn: how many of those loads a view has drawn so far; the rest are in flight, waiting, canceled or evicted unused.",
      "purposes",
      t.purposes.map((p) => ({
        label: p.label,
        value: p.bytes,
        text: `${mb(p.bytes)} · ${count(p.drawn)}/${count(p.requests)}`,
      })),
    );
  }
  if (v.snap.camera) {
    const m = v.lastMove;
    html += `<div class="ci-ptable ci-nos-table">${[
      valueRow(
        m
          ? "Last move settled in"
          : v.moving
            ? "Last move (settling)"
            : "Last move",
        m ? duration(m.ms) : "—",
        {
          info: "From when the camera stopped until streaming settled, and what it cost.",
          zero: !m,
        },
      ),
      valueRow(
        "Move requests",
        m?.requests !== undefined ? count(m.requests) : "—",
        { zero: m?.requests === undefined },
      ),
      valueRow("Move bytes", m?.bytes !== undefined ? mb(m.bytes) : "—", {
        zero: m?.bytes === undefined,
      }),
    ].join("")}</div>`;
  }
  return html;
}

const STAGE_NAMES: Record<string, string> = {
  queued: "Queued",
  network: "Network",
  worker: "Worker wait",
  decode: "Decode",
  uploadWait: "Upload wait",
  upload: "Upload",
};

function pipelineHtml(p: NonNullable<InspectorSnapshot["pipeline"]>): string {
  let html = "";
  // Every known stage has its row (a missing one reads "—"), on one scale.
  const keys = [
    ...Object.keys(STAGE_NAMES),
    ...Object.keys(p.stages).filter((k) => !(k in STAGE_NAMES)),
  ];
  const present = keys.filter((k) => p.stages[k]);
  const max = Math.max(1e-6, ...present.map((k) => p.stages[k]!.p95));
  const slowest = present.reduce<string | undefined>(
    (a, b) => (a === undefined || p.stages[b]!.p50 > p.stages[a]!.p50 ? b : a),
    undefined,
  );
  html += chartTitle(
    "Where load time goes",
    `Bars: the median (p50) time of each stage; the tick: the 95th percentile. All on one scale. ${p.note ? p.note : `Over the last ${p.samples} loads.`} The slowest stage is highlighted.`,
    "stages",
  );
  html += keys
    .map((stage) => {
      const s = p.stages[stage];
      const label = STAGE_NAMES[stage] ?? stage;
      const tip = s
        ? s.p95 !== s.p50
          ? `${label}: p50 ${duration(s.p50)}, p95 ${duration(s.p95)}`
          : `${label}: ${duration(s.p50)}`
        : `${label}: no samples`;
      return (
        `<div class="ci-hbar" data-zero="${s ? 0 : 1}" data-info="${escape(tip)}"><span>${escape(label)}</span>` +
        `<span class="ci-hbar-plot"><span class="ci-hbar-bar" data-accent="${stage === slowest ? 1 : 0}" style="width:${pct(s ? s.p50 / max : 0)}"></span><span class="ci-hbar-tick" data-zero="${s && s.p95 !== s.p50 ? 0 : 1}" style="left:${pct(s ? s.p95 / max : 0)}"></span></span><span class="ci-num">${s ? duration(s.p50) : "—"}</span></div>`
      );
    })
    .join("");
  if (p.content) {
    html += contentHtml(p.content);
  }
  return html;
}

const IMAGE_TYPES = ["jpeg", "png", "webp", "ktx2"] as const;

/** Content mix: counts as stats, decoded bytes as one stacked bar, image types in fixed cells. */
function contentHtml(c: ContentMix): string {
  const geometry = [
    c.lines > 0 ? `${count(c.lines)} lines` : "",
    c.points > 0 ? `${count(c.points)} points` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const byType = new Map<string, number>();
  for (const [type, n] of Object.entries(c.images)) {
    const k = type.replace("image/", "").toLowerCase();
    const key = (IMAGE_TYPES as readonly string[]).includes(k) ? k : "other";
    byType.set(key, (byType.get(key) ?? 0) + n);
  }
  const cells = [...IMAGE_TYPES, "other"]
    .map((k) => {
      const n = byType.get(k) ?? 0;
      return `<span class="ci-icell" data-zero="${n > 0 ? 0 : 1}">${k.toUpperCase()} <b class="ci-num">${count(n)}</b></span>`;
    })
    .join("");
  return `<div class="ci-tiles">${tile("Triangles", count(c.triangles), geometry)}${tile(
    "Features",
    count(c.features),
    c.formats ? escape(c.formats) : "",
  )}</div>${stacked(
    "Decoded bytes",
    "Geometry and texture bytes held by resident content, after decoding.",
    "decoded",
    [
      { label: "Geometry", value: c.geometryBytes, text: mb(c.geometryBytes) },
      { label: "Textures", value: c.textureBytes, text: mb(c.textureBytes) },
    ],
  )}<div class="ci-icells" aria-label="Texture images by type">${cells}</div>`;
}

function memoryHtml(v: InspectorView): string {
  const s = v.snap;
  const w = v.slow;
  const ci = indexIn(w, v.cursor);
  const row = (name: string, series: Series) =>
    sparkRow({
      name: `${name} (MB)`,
      values: w.series[series],
      valid: w.valid,
      fmt: (b) => fixed(b / MB, 1),
      ci,
      win: "slow",
      cursor: v,
    });
  const charts: string[] = [];
  if (s.tiles?.cache) {
    charts.push(row("Tile cache", "cache"));
  }
  if (s.gpu?.renderTargetBytes !== undefined) {
    charts.push(row("Render targets", "targets"));
  }
  const rows = (s.memory ?? []).map((r) => {
    const value = (n: number) => (r.unit === "bytes" ? mb(n) : count(n));
    const text =
      r.text ??
      (r.capacity !== undefined
        ? `${value(r.used)} of ${value(r.capacity)}`
        : value(r.used));
    const fraction = r.capacity ? r.used / r.capacity : undefined;
    const near = fraction !== undefined && fraction > 0.9;
    return `<div class="ci-meter"><div class="ci-meter-head"><span class="ci-mlabel"><span class="ci-ptext">${escape(r.label)}</span>${
      r.detail ? info(r.detail, `mem-${r.label}`) : ""
    }</span><span class="ci-num ci-mtext" title="${escape(text)}">${escape(text)}</span>${status(
      near
        ? `${r.label} is near its limit (${fixed((fraction ?? 0) * 100, 0)}%)`
        : undefined,
    )}</div>${meter(fraction ?? 0, undefined, fraction === undefined)}</div>`;
  });
  return `${
    charts.length
      ? `<div class="ci-ptable ci-nos-table">${pHead("Held", "30 s", false)}${charts.join("")}</div>`
      : ""
  }${rows.join("")}`;
}

/** The GPU section: the device and why it was chosen, then its adapter, facts and limits. */
export function gpuHtml(g: NonNullable<InspectorSnapshot["gpu"]>): string {
  const l = g.limits;
  const w = g.webgl2;
  return kv(
    [
      // The device, and why it was chosen: whichever device runs.
      ["Device", g.device ? escape(g.device) : ""],
      ["Adapter", g.adapter ? escape(g.adapter) : ""],
      // A WebGL 2 device's facts, under WebGL's names.
      ["WebGL", w ? escape(w.version) : ""],
      [
        "Backend",
        w
          ? `${w.backend ? escape(w.backend) : "unknown"}${w.software ? " · software renderer" : ""}`
          : "",
      ],
      ["Emulating", w?.emulating ? escape(w.emulating) : ""],
      ["MAX_TEXTURE_SIZE", w ? `${w.maxTextureSize}` : ""],
      ["MAX_ARRAY_TEXTURE_LAYERS", w ? `${w.maxArrayTextureLayers}` : ""],
      ["MAX_SAMPLES", w ? `${w.maxSamples}` : ""],
      ["MAX_UNIFORM_BLOCK_SIZE", w ? `${w.maxUniformBlockSize / 1024} KB` : ""],
      ["Extensions", w ? `${w.extensions}` : ""],
      // Binding counts the engine fits (the tier), then capacities it grows
      // into (docs/design/gpu-limits-and-capacities.md), a short row each.
      ["Limits tier", l ? escape(l.tier) : ""],
      ["Storage / stage", l ? `${l.storageBuffersPerStage}` : ""],
      ["Textures / stage", l ? `${l.sampledTexturesPerStage}` : ""],
      ["Bind groups", l ? `${l.bindGroups}` : ""],
      ["Largest binding", l ? mb(l.storageBindingBytes) : ""],
      ["Array layers", l ? `${l.textureArrayLayers}` : ""],
      ["Canvas", g.canvas ? `${g.canvas[0]} × ${g.canvas[1]}` : ""],
      [
        "Views",
        g.views !== undefined
          ? `${g.views}${g.batches !== undefined ? ` · ${g.batches} batches each` : ""}`
          : "",
      ],
    ].filter(([, v]) => v) as [string, string][],
  );
}

function problemsHtml(p: { errors: string[]; warnings: string[] }): string {
  return `<ul class="ci-problems">${[
    ...p.errors.map(
      (e) => `<li class="error"><strong>✖ Error</strong> ${escape(e)}</li>`,
    ),
    ...p.warnings.map(
      (w) => `<li><strong>⚠ Warning</strong> ${escape(w)}</li>`,
    ),
  ].join("")}</ul>`;
}

function pickHtml(pick: PickInfo | undefined): string {
  if (!pick) {
    return `<div class="ci-note">nothing at this pixel</div>`;
  }
  const rows = Object.entries(pick.properties ?? {})
    .map(
      ([k, v]) =>
        `<tr><th>${escape(k)}</th><td>${escape(formatValue(v))}</td></tr>`,
    )
    .join("");
  return `<div class="ci-pick-name">${escape(pick.name ?? "(unnamed)")}</div>${
    pick.featureId !== undefined
      ? `<div class="ci-note">feature ${pick.featureId}</div>`
      : ""
  }${rows ? `<table class="ci-props">${rows}</table>` : ""}`;
}

// ------------------------------------------------------------- pieces

function kv(rows: [string, string][]): string {
  return `<div class="ci-kv">${rows.map(([k, v]) => `<span>${k}</span><span class="ci-num ci-vtext" title="${escape(v.replace(/<[^>]*>/g, ""))}">${v}</span>`).join("")}</div>`;
}

/** The "i" button: its text shows in the tooltip on hover and on keyboard focus. */
function info(text: string, key: string): string {
  return `<button type="button" class="ci-info" data-info="${escape(text)}" data-focus="${escape(key)}" aria-label="${escape(text)}">i</button>`;
}

/** A status icon in its reserved cell: empty, or a warning whose reason is its tooltip. */
function status(reason: string | undefined): string {
  return reason
    ? `<span class="ci-status" data-on="1" data-info="${escape(reason)}" role="img" aria-label="${escape(reason)}">⚠</span>`
    : `<span class="ci-status" data-on="0"></span>`;
}

/** Stat tile: label (and a status slot), value, optional meter, a one-line note slot. */
function tile(
  label: string,
  value: string,
  note = "",
  extra = "",
  warn?: string,
  zero = false,
): string {
  return `<div class="ci-tile" data-zero="${zero ? 1 : 0}"><div class="ci-tile-label"><span>${label}</span>${status(warn)}</div><div class="ci-tile-value">${value}</div>${extra}<div class="ci-note ci-tile-note" title="${escape(note.replace(/<[^>]*>/g, ""))}">${note}</div></div>`;
}

/** A meter: fill against a limit (warning near it), with an optional marker. */
function meter(fraction: number, marker?: number, none = false): string {
  return `<span class="ci-track" data-none="${none ? 1 : 0}"><span class="ci-fill" data-warn="${fraction > 0.9 ? 1 : 0}" style="width:${pct(fraction)}"></span><span class="ci-marker" data-zero="${marker === undefined ? 1 : 0}" style="left:${pct(marker ?? 0)}"></span></span>`;
}

const chartTitle = (text: string, infoText: string, key: string) =>
  `<div class="ci-chart-title"><span>${escape(text)}</span>${info(infoText, `chart-${key}`)}</div>`;

/**
 * One stacked bar (part-to-whole of a moment) and its legend as rows of
 * swatch, label, value. Every part has its segment (a zero one is hidden)
 * and its tooltip.
 */
function stacked(
  title: string,
  infoText: string,
  key: string,
  parts: Array<{ label: string; value: number; text: string }>,
): string {
  const total = parts.reduce((sum, p) => sum + p.value, 0) || 1;
  const cls = (i: number) => `s${Math.min(i + 1, 6)}`;
  return `${chartTitle(title, infoText, key)}<div class="ci-stack">${parts
    .map(
      (p, i) =>
        `<span class="${cls(i)}" data-zero="${p.value > 0 ? 0 : 1}" style="flex-grow:${p.value / total}" data-info="${escape(`${p.label}: ${p.text.replace(/<[^>]*>/g, "")}`)}"></span>`,
    )
    .join("")}</div><div class="ci-lrows">${parts
    .map(
      (p, i) =>
        `<div class="ci-lrow"><i class="ci-key ${cls(i)}"></i><span class="ci-ltext">${escape(p.label)}</span><span class="ci-num">${p.text}</span></div>`,
    )
    .join("")}</div>`;
}

const MB = 1048576;
const pct = (f: number) => `${(Math.min(Math.max(f, 0), 1) * 100).toFixed(2)}%`;
/** Fixed decimals per metric: milliseconds 2, megabytes 1, rates and counts whole. */
const fixed = (v: number, d: number) =>
  Number.isFinite(v) ? v.toFixed(d) : "—";
const fixed0 = (v: number) => fixed(v, 0);
const ms2 = (v: number) => fixed(v, 2);
const duration = (v: number) =>
  v < 1000 ? `${v.toFixed(1)} ms` : `${(v / 1000).toFixed(1)} s`;
const mb = (bytes: number) => `${(bytes / MB).toFixed(1)} MB`;
const count = (n: number) => Math.round(n).toLocaleString("en-US");

function formatValue(value: unknown): string {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toPrecision(6);
  }
  if (typeof value === "bigint" || typeof value === "string") {
    return String(value);
  }
  return JSON.stringify(value) ?? String(value);
}

function escape(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}

function read<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : (JSON.parse(value) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked: nothing is remembered.
  }
}

// ------------------------------------------------------------- style

const STYLE_ID = "cesium-inspector-style";

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
.cesium-inspector {
  --ci-bg: rgba(13, 13, 13, 0.84);
  --ci-border: #383835;
  --ci-text: #c3c2b7;
  --ci-strong: #f0efec;
  --ci-muted: #8d8c84;
  --ci-grid: #2c2c2a;
  --ci-series-1: #3987e5;
  --ci-series-2: #d95926;
  --ci-series-3: #199e70;
  --ci-series-4: #c98500;
  --ci-series-5: #9b6fe0;
  --ci-series-6: #d0507f;
  --ci-good: #5cc08a;
  --ci-warning: #fab219;
  --ci-bad: #ef6c5a;
  position: absolute;
  left: 8px;
  top: 8px;
  max-height: calc(100% - 16px);
  /* A fixed width, collapsed or open: what the header shows never moves it. */
  width: 480px;
  max-width: calc(100% - 16px);
  display: flex;
  flex-direction: column;
  background: var(--ci-bg);
  border: 1px solid var(--ci-border);
  border-radius: 6px;
  color: var(--ci-text);
  font: 12px/1.45 system-ui, sans-serif;
  backdrop-filter: blur(4px);
  /* Topmost of the viewer's overlays (credits and time controls at 2, an app's own below them). */
  z-index: 5;
}
.cesium-inspector.expanded { width: 360px; }
.cesium-inspector.right { left: auto; right: 8px; }
/* At the bottom it opens upward: the summary line stays at the bottom edge and the sections stack above it. */
/* It leaves the top 60 px free for an app's own controls in the corner above. */
.cesium-inspector.bottom { top: auto; bottom: 8px; max-height: calc(100% - 68px); flex-direction: column-reverse; }
.cesium-inspector.bottom.expanded .ci-header { border-top: 1px solid var(--ci-border); border-radius: 0 0 6px 6px; }
/* Above the credits bar and the time controls (36 px high at 8 px) when the viewer shows them. */
:has(> .cesium-credits:not([hidden]), > .cesium-time:not([hidden])) > .cesium-inspector.bottom { bottom: 52px; max-height: calc(100% - 112px); }
.cesium-inspector .ci-header {
  all: unset;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  cursor: pointer;
  border-radius: 6px;
  white-space: nowrap;
  min-width: 0;
}
.cesium-inspector .ci-header:focus-visible { outline: 2px solid var(--ci-series-1); outline-offset: -2px; }
.cesium-inspector .ci-swatch { inline-size: 10px; block-size: 10px; border-radius: 2px; flex: none; }
.cesium-inspector .ci-name { color: var(--ci-strong); font-weight: 600; flex: none; }
.cesium-inspector .ci-summary {
  display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;
  font-variant-numeric: tabular-nums; overflow: hidden;
}
/* Fixed cells: the number right-aligned in its own width, the unit after it. */
.cesium-inspector .ci-cell { display: inline-flex; gap: 3px; flex: none; }
.cesium-inspector .ci-cell b { font-weight: 500; text-align: right; }
.cesium-inspector .ci-c-ms b { min-inline-size: 6ch; }
.cesium-inspector .ci-c-tiles b { min-inline-size: 5ch; }
.cesium-inspector .ci-c-count b { min-inline-size: 4ch; }
.cesium-inspector .ci-cell[data-zero="1"] b { color: var(--ci-muted); }
/* A status icon has its cell whether or not it shows. */
.cesium-inspector .ci-status { display: inline-block; flex: none; inline-size: 2ch; text-align: center; color: var(--ci-warning); }
.cesium-inspector .ci-chip {
  display: inline-block; flex: none; box-sizing: content-box; padding: 0 6px; border-radius: 9px;
  border: 1px solid var(--ci-border); font-size: 11px; line-height: 16px; white-space: nowrap; text-align: left;
}
.cesium-inspector .ci-statechip { inline-size: 9ch; }
.cesium-inspector .ci-dot {
  display: inline-block; inline-size: 7px; block-size: 7px; border-radius: 50%;
  margin-inline-end: 4px; background: var(--ci-series-1);
}
.cesium-inspector .ci-statechip[data-state="settled"] .ci-dot { background: var(--ci-good); }
.cesium-inspector .ci-statechip[data-state="paused"] .ci-dot { background: var(--ci-muted); }
.cesium-inspector .ci-chevron {
  margin-inline-start: auto; inline-size: 6px; block-size: 6px;
  border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg) translateY(-2px); flex: none;
}
.cesium-inspector.expanded .ci-chevron { transform: rotate(-135deg) translateY(-1px); }
.cesium-inspector .ci-body {
  display: none; overflow-y: auto; padding: 0 8px 6px;
  /* A thin scrollbar in the panel's colors, not the page's. */
  scrollbar-width: thin; scrollbar-color: #4a4a46 transparent;
}
.cesium-inspector.expanded .ci-body { display: block; }
.cesium-inspector .ci-section { border-top: 1px solid var(--ci-border); }
.cesium-inspector .ci-section > summary {
  cursor: pointer; padding: 5px 0; color: var(--ci-strong); font-weight: 600;
  font-size: 11px; letter-spacing: 0.02em; text-transform: uppercase; min-block-size: 16px;
}
/* The title bar's controls: the "i", and on Frame the pause state. */
.cesium-inspector .ci-sumbar { float: right; display: inline-flex; align-items: center; gap: 6px; text-transform: none; letter-spacing: 0; font-weight: 400; }
.cesium-inspector .ci-readout { inline-size: 26ch; box-sizing: border-box; padding: 0 6px; border-radius: 9px; border: 1px solid var(--ci-warning); background: rgba(250, 178, 25, 0.12); color: var(--ci-strong); font-size: 11px; line-height: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-variant-numeric: tabular-nums; visibility: hidden; }
.cesium-inspector .ci-readout[data-on="1"] { visibility: visible; }
.cesium-inspector .ci-mark { stroke: var(--ci-strong); stroke-width: 1; vector-effect: non-scaling-stroke; }
.ci-detail { position: absolute; z-index: 6; inline-size: 230px; box-sizing: border-box; pointer-events: none; padding: 6px 8px; border-radius: 6px; font: 11px/1.45 system-ui, sans-serif; color: #c3c2b7; background: rgba(13, 13, 13, 0.92); border: 1px solid #383835; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5); }
.ci-detail[hidden] { display: none; }
.ci-detail-head { color: #8d8c84; margin: 2px 0; overflow-wrap: anywhere; }
.ci-detail-row { display: flex; gap: 8px; }
.ci-detail-row strong { min-inline-size: 7ch; text-align: right; color: #f0efec; font-weight: 600; font-variant-numeric: tabular-nums; }
.cesium-inspector .ci-pausebtn {
  all: unset; box-sizing: border-box; inline-size: 7ch; text-align: center; cursor: pointer;
  font-size: 11px; line-height: 16px; border: 1px solid var(--ci-border); border-radius: 4px; color: var(--ci-strong);
}
.cesium-inspector .ci-pausebtn:hover { border-color: var(--ci-muted); }
.cesium-inspector .ci-pausebtn[aria-pressed="true"] { background: var(--ci-grid); border-color: var(--ci-warning); }
.cesium-inspector .ci-pausebtn:focus-visible, .cesium-inspector .ci-info:focus-visible { outline: 2px solid var(--ci-series-1); outline-offset: 1px; }
.cesium-inspector .ci-info {
  all: unset; box-sizing: border-box; flex: none; display: inline-grid; place-items: center; cursor: help;
  inline-size: 13px; block-size: 13px; border-radius: 50%; border: 1px solid var(--ci-muted);
  color: var(--ci-muted); font: italic 600 9px/1 Georgia, serif; text-transform: none;
}
.cesium-inspector .ci-info:hover { color: var(--ci-strong); border-color: var(--ci-strong); }
.cesium-inspector .ci-content { padding-bottom: 6px; }
.cesium-inspector .ci-num { font-variant-numeric: tabular-nums; color: var(--ci-strong); text-align: right; }
.cesium-inspector [data-zero="1"] > .ci-num, .cesium-inspector .ci-prow[data-zero="1"] .ci-num, .cesium-inspector tr[data-zero="1"] td, .cesium-inspector .ci-icell[data-zero="1"] b, .cesium-inspector .ci-tile[data-zero="1"] .ci-tile-value { color: var(--ci-muted); }
.cesium-inspector .ci-note { color: var(--ci-muted); font-size: 11px; }
.cesium-inspector .ci-tip {
  position: absolute; z-index: 1; pointer-events: none; white-space: nowrap;
  padding: 6px 8px; border-radius: 4px; font-size: 11px;
  background: var(--ci-bg); border: 1px solid var(--ci-border);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5); backdrop-filter: blur(6px);
}
.cesium-inspector .ci-tip.ci-tip-prose { white-space: normal; max-inline-size: 240px; z-index: 2; background: #151514; }
.cesium-inspector .ci-tip[hidden] { display: none; }
.cesium-inspector .ci-tip-when { color: var(--ci-muted); margin-bottom: 3px; }
.cesium-inspector .ci-tip-row { display: flex; gap: 8px; }
.cesium-inspector .ci-tip-row strong {
  min-width: 64px; text-align: right; color: var(--ci-strong);
  font-weight: 600; font-variant-numeric: tabular-nums;
}
.cesium-inspector .ci-tip-row span { color: var(--ci-text); }
.cesium-inspector .ci-kv { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 2px 12px; }
.cesium-inspector .ci-kv .ci-num { text-align: right; }
.cesium-inspector .ci-vtext { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cesium-inspector .ci-vtext[data-warn="1"] { color: var(--ci-warning); }
.cesium-inspector .ci-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; margin-bottom: 8px; }
.cesium-inspector .ci-tile { min-width: 0; }
.cesium-inspector .ci-tile-label { display: flex; align-items: center; justify-content: space-between; color: var(--ci-muted); font-size: 11px; }
.cesium-inspector .ci-tile-value { color: var(--ci-strong); font-size: 15px; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cesium-inspector .ci-tile-note { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-block-size: 1.45em; }
.cesium-inspector .ci-track {
  position: relative; display: block; block-size: 4px; margin: 3px 0;
  background: var(--ci-grid); border-radius: 2px;
}
.cesium-inspector .ci-track[data-none="1"] { display: none; }
.cesium-inspector .ci-fill { position: absolute; inset: 0 auto 0 0; background: var(--ci-series-1); border-radius: 2px; }
.cesium-inspector .ci-fill[data-warn="1"] { background: var(--ci-warning); }
.cesium-inspector .ci-marker { position: absolute; top: -2px; bottom: -2px; inline-size: 1px; background: var(--ci-strong); }
.cesium-inspector .ci-marker[data-zero="1"] { display: none; }
.cesium-inspector .ci-chart-title { display: flex; align-items: center; gap: 6px; color: var(--ci-text); margin: 6px 0 4px; }
.cesium-inspector .ci-stack { display: flex; gap: 2px; block-size: 8px; margin-bottom: 4px; }
.cesium-inspector .ci-stack > span { border-radius: 2px; min-inline-size: 2px; }
.cesium-inspector .ci-stack > span[data-zero="1"] { display: none; }
.cesium-inspector .s1 { background: var(--ci-series-1); }
.cesium-inspector .s2 { background: var(--ci-series-2); }
.cesium-inspector .s3 { background: var(--ci-series-3); }
.cesium-inspector .s4 { background: var(--ci-series-4); }
.cesium-inspector .s5 { background: var(--ci-series-5); }
.cesium-inspector .s6 { background: var(--ci-series-6); }
/* Legends are grids of swatch, label, value: nothing wraps. */
.cesium-inspector .ci-lrows { margin-bottom: 8px; }
.cesium-inspector .ci-lrow { display: grid; grid-template-columns: 8px minmax(0, 1fr) 22ch; gap: 6px; align-items: center; font-size: 11px; }
.cesium-inspector .ci-ltext { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cesium-inspector .ci-key { inline-size: 8px; block-size: 8px; border-radius: 2px; }
.cesium-inspector i.ci-key { display: inline-block; flex: none; }
.cesium-inspector .ci-key-hatch { background: repeating-linear-gradient(45deg, var(--ci-muted) 0 1.5px, var(--ci-grid) 1.5px 3px); }
.cesium-inspector .ci-hbar { display: grid; grid-template-columns: 76px 1fr 7ch; align-items: center; gap: 8px; }
.cesium-inspector .ci-hbar[data-zero="1"] { color: var(--ci-muted); }
.cesium-inspector .ci-hbar-plot { position: relative; block-size: 8px; }
.cesium-inspector .ci-hbar-bar { position: absolute; inset: 0 auto 0 0; background: var(--ci-muted); border-radius: 2px; }
.cesium-inspector .ci-hbar-bar[data-accent="1"] { background: var(--ci-series-1); }
.cesium-inspector .ci-hbar-tick { position: absolute; top: -1px; bottom: -1px; inline-size: 2px; background: var(--ci-strong); }
.cesium-inspector .ci-hbar-tick[data-zero="1"] { display: none; }
.cesium-inspector .ci-meter { margin-bottom: 4px; }
.cesium-inspector .ci-meter-head { display: grid; grid-template-columns: minmax(0, 1fr) auto 2ch; gap: 8px; align-items: center; }
.cesium-inspector .ci-mlabel { display: flex; align-items: center; gap: 4px; min-width: 0; }
.cesium-inspector .ci-mtext { white-space: nowrap; }
.cesium-inspector .ci-geometry { inline-size: 100%; border-collapse: collapse; margin-top: 6px; table-layout: fixed; }
.cesium-inspector .ci-geometry col.n1 { inline-size: 7ch; }
.cesium-inspector .ci-geometry col.n2 { inline-size: 10ch; }
.cesium-inspector .ci-geometry col.n3 { inline-size: 19ch; }
.cesium-inspector .ci-geometry th { text-align: start; font-weight: 400; color: var(--ci-muted); font-size: 11px; padding: 0 0 2px; white-space: nowrap; }
.cesium-inspector .ci-geometry th:first-child { display: flex; align-items: center; gap: 6px; }
.cesium-inspector .ci-geometry td { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cesium-inspector .ci-geometry th:not(:first-child), .cesium-inspector .ci-geometry td.ci-num { text-align: right; padding-inline-start: 8px; }
.cesium-inspector .ci-gpu-head { display: flex; align-items: center; gap: 8px; margin: 6px 0 4px; color: var(--ci-muted); font-size: 11px; }
.cesium-inspector .ci-gtotal { color: var(--ci-text); inline-size: 17ch; white-space: nowrap; }
.cesium-inspector .ci-gtotal strong { font-weight: 500; }
.cesium-inspector .ci-grange { margin-inline-start: auto; inline-size: 11ch; text-align: right; white-space: nowrap; }
.cesium-inspector .ci-seg { display: inline-flex; border: 1px solid var(--ci-border); border-radius: 4px; overflow: hidden; }
.cesium-inspector .ci-seg button {
  font: inherit; font-size: 10px; color: var(--ci-muted); background: transparent;
  border: 0; padding: 1px 6px; cursor: pointer;
}
.cesium-inspector .ci-seg button + button { border-inline-start: 1px solid var(--ci-border); }
.cesium-inspector .ci-seg button[aria-pressed="true"] { color: var(--ci-strong); background: var(--ci-grid); }
.cesium-inspector .ci-seg button:focus-visible { outline: 2px solid var(--ci-series-1); outline-offset: -2px; }
.cesium-inspector .ci-gpu-chart svg { display: block; inline-size: 100%; block-size: 64px; }
.cesium-inspector .ci-band { stroke: #0d0d0d; stroke-width: 1; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
.cesium-inspector .ci-budget { stroke: var(--ci-muted); stroke-width: 1; stroke-dasharray: 3 3; opacity: 0.6; vector-effect: non-scaling-stroke; }
.cesium-inspector .ci-glegend { display: grid; grid-template-columns: 1fr 1fr; gap: 1px 14px; margin: 5px 0 8px; font-size: 11px; color: var(--ci-text); }
.cesium-inspector .ci-litem { display: grid; grid-template-columns: 8px minmax(0, 1fr) 6ch; gap: 6px; align-items: center; }
.cesium-inspector .ci-ptable { font-size: 11px; }
.cesium-inspector .ci-ptable + .ci-geometry, .cesium-inspector .ci-ptable-plain { margin-top: 6px; }
.cesium-inspector .ci-nos-table { margin-bottom: 8px; }
.cesium-inspector .ci-prow {
  display: grid; grid-template-columns: 10px minmax(0, 1fr) 64px 7ch 7ch 42px;
  gap: 6px; align-items: center; min-block-size: 18px;
}
.cesium-inspector .ci-prow.ci-nos { grid-template-columns: 10px minmax(0, 1fr) 64px 7ch 7ch; }
.cesium-inspector .ci-prow svg { display: block; inline-size: 64px; block-size: 14px; }
.cesium-inspector .ci-prow > .ci-num { text-align: right; white-space: nowrap; }
.cesium-inspector .ci-prow .ci-mean { color: var(--ci-muted); }
.cesium-inspector .ci-pname { display: flex; align-items: center; gap: 4px; min-width: 0; color: var(--ci-text); }
.cesium-inspector .ci-ptext { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cesium-inspector .ci-phead { color: var(--ci-muted); font-size: 10px; min-block-size: 14px; border-bottom: 1px solid var(--ci-border); margin-bottom: 2px; }
.cesium-inspector .ci-phead > span:nth-child(n + 4) { text-align: right; }
.cesium-inspector .ci-pgroup .ci-pname { color: var(--ci-strong); font-weight: 600; }
.cesium-inspector .ci-group > summary { list-style: none; cursor: pointer; }
.cesium-inspector .ci-group > summary::-webkit-details-marker { display: none; }
.cesium-inspector .ci-group > summary .ci-pname::before {
  content: ""; display: inline-block; flex: none; inline-size: 4px; block-size: 4px; margin: 0 4px 2px 1px;
  border-right: 1.5px solid var(--ci-muted); border-bottom: 1.5px solid var(--ci-muted); transform: rotate(-45deg);
}
.cesium-inspector .ci-group[open] > summary .ci-pname::before { transform: rotate(45deg); }
.cesium-inspector .ci-group > summary:focus-visible { outline: 2px solid var(--ci-series-1); outline-offset: 1px; border-radius: 2px; }
.cesium-inspector .ci-group > .ci-prow .ci-pname { padding-inline-start: 13px; }
.cesium-inspector .ci-group + .ci-group, .cesium-inspector .ci-group + .ci-pflat { border-top: 1px solid var(--ci-grid); }
.cesium-inspector .ci-share { position: relative; block-size: 6px; background: var(--ci-grid); border-radius: 2px; overflow: hidden; }
.cesium-inspector .ci-share > span { position: absolute; inset: 0 auto 0 0; border-radius: 2px; }
.cesium-inspector .ci-icells { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; font-size: 11px; margin-bottom: 8px; }
.cesium-inspector .ci-icell { white-space: nowrap; color: var(--ci-text); }
.cesium-inspector .ci-icell[data-zero="1"] { color: var(--ci-muted); }
.cesium-inspector .ci-line { fill: none; stroke: var(--ci-series-1); stroke-width: 1.5; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
.cesium-inspector .ci-area { fill: var(--ci-series-1); opacity: 0.12; }
.cesium-inspector .ci-limit { fill: none; stroke: var(--ci-muted); stroke-width: 1; stroke-dasharray: 2 2; vector-effect: non-scaling-stroke; }
.cesium-inspector .ci-base { stroke: var(--ci-grid); stroke-width: 1; vector-effect: non-scaling-stroke; }
.cesium-inspector .ci-cross { stroke: var(--ci-muted); stroke-width: 1; vector-effect: non-scaling-stroke; }
.cesium-inspector .ci-cross[data-pin="1"] { stroke: var(--ci-strong); stroke-width: 1.5; }
.cesium-inspector svg[data-plot] { cursor: crosshair; }
.cesium-inspector .ci-problems { margin: 0; padding: 0; list-style: none; }
.cesium-inspector .ci-problems li { color: var(--ci-text); margin-bottom: 4px; }
.cesium-inspector .ci-problems strong { color: var(--ci-warning); margin-inline-end: 4px; }
.cesium-inspector .ci-problems li.error strong { color: var(--ci-bad); }
.cesium-inspector .ci-switch {
  all: unset; box-sizing: border-box; display: flex; align-items: center; gap: 8px;
  cursor: pointer; color: var(--ci-strong); padding: 2px 0;
}
.cesium-inspector .ci-switch:focus-visible, .cesium-inspector .ci-button:focus-visible { outline: 2px solid var(--ci-series-1); outline-offset: 2px; }
.cesium-inspector .ci-switch-track {
  position: relative; inline-size: 28px; block-size: 16px; flex: none;
  border-radius: 8px; background: var(--ci-grid); border: 1px solid var(--ci-border);
}
.cesium-inspector .ci-switch-knob {
  position: absolute; inset: 2px auto 2px 2px; inline-size: 10px; border-radius: 50%;
  background: var(--ci-muted); transition: transform 0.12s ease, background 0.12s ease;
}
.cesium-inspector .ci-switch[aria-checked="true"] .ci-switch-track { background: rgba(239, 108, 90, 0.25); border-color: var(--ci-bad); }
.cesium-inspector .ci-switch[aria-checked="true"] .ci-switch-knob { transform: translateX(12px); background: var(--ci-bad); }
.cesium-inspector .ci-button {
  all: unset; box-sizing: border-box; margin: 6px 0 4px; padding: 3px 8px; cursor: pointer;
  border: 1px solid var(--ci-border); border-radius: 4px; color: var(--ci-strong); font-size: 11px;
}
.cesium-inspector .ci-button:hover:not(:disabled) { border-color: var(--ci-muted); }
.cesium-inspector .ci-button:disabled { opacity: 0.45; cursor: default; }
@media (prefers-reduced-motion: reduce) { .cesium-inspector .ci-switch-knob { transition: none; } }
.cesium-inspector .ci-pick-name { color: var(--ci-strong); font-weight: 600; }
.cesium-inspector .ci-props { border-collapse: collapse; margin-top: 4px; inline-size: 100%; }
.cesium-inspector .ci-props th { text-align: left; font-weight: normal; color: var(--ci-muted); padding: 1px 8px 1px 0; vertical-align: top; }
.cesium-inspector .ci-props td { color: var(--ci-strong); word-break: break-word; }
`;
