/**
 * The inspector overlay (plan §16.9, Inspector): a panel over an engine's
 * view showing what it draws, streams and holds, from any `Inspectable`.
 * Plain DOM, no framework, so any app can attach it (as 1.x's
 * CesiumInspector was a widget, not core). Collapsed, it is one summary
 * line; expanded, the debug viewer's panels: problems, frame, streaming
 * (with the load timeline and the cost of the last move), the content
 * pipeline and content mix, memory, the GPU, the last 30 seconds, and the
 * last pick.
 *
 * Panels follow the data-viz rules: stat tiles for single values, meters
 * for a value against a limit, horizontal bars to compare magnitudes (the
 * slowest stage emphasized), one stacked bar for part-to-whole, small
 * multiples for history. Text stays in text colors; marks carry the data
 * colors.
 */
import type {
  ContentMix,
  Inspectable,
  InspectorSnapshot,
  MemoryRow,
  PickInfo,
} from "./inspectable.ts";

export interface InspectorOptions {
  /**
   * Start expanded; by default as it was last left (else collapsed: the
   * summary line only).
   */
  expanded?: boolean;
  /** Snapshot interval, ms (default 250). */
  interval?: number;
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

const SECTIONS = [
  ["problems", "Problems"],
  ["frame", "Frame"],
  ["streaming", "Streaming"],
  ["pipeline", "Content pipeline"],
  ["memory", "Memory"],
  ["gpu", "GPU"],
  ["history", "Last 30 s"],
  ["pick", "Pick"],
] as const;
type SectionKey = (typeof SECTIONS)[number][0];

type Series =
  | "cache"
  | "targets"
  | "inFlight"
  | "window"
  | "received"
  | "uploadQueue"
  | "decode"
  | "frames"
  | "cpu"
  | "gpu";

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
  root.className = "cesium-inspector";
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
  for (const [key, title] of SECTIONS) {
    const details = document.createElement("details");
    details.className = "ci-section";
    details.open = opened[key] ?? (key !== "gpu" && key !== "memory");
    const s = document.createElement("summary");
    s.textContent = title;
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
  root.append(header, body);
  element.append(root);

  // History, frame rate and the last move are derived across snapshots.
  const history: Record<Series, number[]> = {
    cache: [],
    targets: [],
    inFlight: [],
    window: [],
    received: [],
    uploadQueue: [],
    decode: [],
    frames: [],
    cpu: [],
    gpu: [],
  };
  const push = (series: Series, value: number) => {
    const s = history[series];
    s.push(value);
    if (s.length > HISTORY) {
      s.shift();
    }
  };
  let last: InspectorSnapshot | undefined;
  let lastAt = performance.now();
  let framesPerSecond: number | undefined;
  let cameraKey = "";
  let move:
    { stoppedAt: number; requests?: number; bytes?: number } | undefined;
  let lastMove: LastMove | undefined;
  let hover: number | undefined;
  let shownError: string | undefined;

  const historyEl = bodies.get("history")!;
  historyEl.addEventListener("pointermove", (e) => {
    const plot = historyEl.querySelector("svg");
    if (!plot) {
      return;
    }
    const rect = plot.getBoundingClientRect();
    const f = (e.clientX - rect.left) / rect.width;
    hover = f < 0 || f > 1 ? undefined : Math.round(f * (HISTORY - 1));
    renderHistory();
  });
  historyEl.addEventListener("pointerleave", () => {
    hover = undefined;
    renderHistory();
  });

  let expanded = false;
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

  const set = (key: SectionKey, html: string | undefined) => {
    sections.get(key)!.hidden = html === undefined;
    if (html !== undefined) {
      bodies.get(key)!.innerHTML = html;
    }
  };

  function renderHistory(): void {
    if (expanded && last) {
      set("history", historyHtml(history, last, hover));
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
    }
    const received = snap.tiles?.received?.bytes;
    const lastReceived = last?.tiles?.received?.bytes;
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
    push("uploadQueue", snap.tiles?.window?.uploadQueue ?? 0);
    push("decode", snap.pipeline?.stages.decode?.p50 ?? 0);
    push("frames", framesPerSecond ?? 0);
    // While idle no frame time is spent: the lines drop to zero.
    const drawing = framesPerSecond === undefined || framesPerSecond > 0;
    push("cpu", drawing ? (snap.frame?.cpuMs ?? 0) : 0);
    push("gpu", drawing ? (snap.frame?.gpuMs ?? 0) : 0);

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

    summary.innerHTML = summaryLine(snap, expanded);
    root.dataset.state = snap.state;
    const error = snap.problems?.errors[0];
    if (error !== undefined && error !== shownError) {
      sections.get("problems")!.open = true;
    }
    shownError = error;
    if (!expanded) {
      return;
    }
    const problems = snap.problems;
    set(
      "problems",
      problems && problems.errors.length + problems.warnings.length > 0
        ? problemsHtml(problems)
        : undefined,
    );
    set("frame", frameHtml(snap, framesPerSecond));
    set(
      "streaming",
      snap.tiles
        ? streamingHtml(
            snap.tiles,
            snap.camera ? { lastMove, move } : undefined,
          )
        : undefined,
    );
    set(
      "pipeline",
      snap.pipeline && (snap.pipeline.samples > 0 || snap.pipeline.content)
        ? pipelineHtml(snap.pipeline)
        : undefined,
    );
    set("memory", snap.memory ? memoryHtml(snap.memory) : undefined);
    set("gpu", snap.gpu ? gpuHtml(snap.gpu) : undefined);
    renderHistory();
  }
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
      root.remove();
    },
  };
}

// ------------------------------------------------------------- sections

/** Collapsed: the headline numbers; expanded (the sections show them): the state. */
function summaryLine(s: InspectorSnapshot, expanded: boolean): string {
  const parts: string[] = [];
  const problems = s.problems
    ? s.problems.errors.length + s.problems.warnings.length
    : 0;
  if (!expanded) {
    if (s.frame?.cpuMs !== undefined) {
      parts.push(
        `CPU ${ms(s.frame.cpuMs)}${s.frame.gpuMs !== undefined ? ` · GPU ${ms(s.frame.gpuMs)}` : ""}`,
      );
    }
    if (s.tiles) {
      parts.push(`${count(s.tiles.drawn)} tiles`);
    }
  }
  if (problems > 0) {
    parts.push(
      `<span class="ci-warn">⚠ ${problems} ${s.problems!.errors.length > 0 ? "problem" : "warning"}${problems === 1 ? "" : "s"}</span>`,
    );
  }
  const loading =
    s.state === "loading" && s.tiles
      ? `loading · ${s.tiles.loading} in flight${s.tiles.window?.uploadQueue ? `, ${s.tiles.window.uploadQueue} to upload` : ""}`
      : "loading";
  parts.push(
    `<span class="ci-dot"></span>${s.state === "settled" ? "settled" : s.state === "paused" ? "streaming paused" : loading}`,
  );
  return parts.join('<span class="ci-sep">·</span>');
}

function frameHtml(s: InspectorSnapshot, framesPerSecond?: number): string {
  const f = s.frame ?? {};
  const rows: [string, string][] = [
    ["CPU / frame", f.cpuMs !== undefined ? ms(f.cpuMs) : "—"],
    ["GPU / frame", f.gpuMs !== undefined ? ms(f.gpuMs) : "not exposed"],
  ];
  if (f.intervalMs !== undefined) {
    rows.push(["Frame interval", ms(f.intervalMs)]);
  }
  if (f.rendering || framesPerSecond !== undefined) {
    rows.push([
      "Rendering",
      [
        f.rendering ? escape(f.rendering) : "",
        framesPerSecond === undefined
          ? ""
          : framesPerSecond < 0.5
            ? "idle"
            : `${framesPerSecond.toFixed(0)} frames/s`,
      ]
        .filter(Boolean)
        .join(" · "),
    ]);
  }
  return kv(rows);
}

interface LastMove {
  ms: number;
  requests?: number;
  bytes?: number;
}

function streamingHtml(
  t: NonNullable<InspectorSnapshot["tiles"]>,
  moves: { lastMove: LastMove | undefined; move: unknown } | undefined,
): string {
  const tiles: string[] = [];
  tiles.push(
    tile(
      "Drawn",
      count(t.drawn),
      t.perView
        ? t.perView.map(([n, v]) => `${escape(n)} ${count(v)}`).join(" · ")
        : t.known !== undefined
          ? `of ${count(t.known)} known`
          : "",
    ),
  );
  if (t.window) {
    const w = t.window;
    tiles.push(
      tile(
        "In flight",
        `${t.loading} <span class="ci-of">of ${w.max}</span>`,
        [
          w.adaptive ? "adaptive window" : "fixed window",
          w.protocol ? escape(w.protocol) : "",
          w.cancelled !== undefined ? `${count(w.cancelled)} cancelled` : "",
          w.uploadQueue !== undefined ? `${w.uploadQueue} to upload` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        meter(t.loading / Math.max(1, w.max)),
      ),
    );
  } else {
    tiles.push(tile("In flight", String(t.loading)));
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
          ? `budget ${mb(c.budget)}${c.overflow ? ` + ${mb(c.overflow)} overflow` : ""} ${nearLimit(fraction)}`
          : "",
        limit ? meter(fraction, c.budget! / limit) : "",
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
            ? `${t.sse.adjusted.toFixed(1)} memory-adjusted`
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
  if (t.load) {
    const total = t.load.phases.reduce((sum, p) => sum + p.ms, 0);
    const title = `Load: ${t.load.settled ? `settled in ${duration(total)}` : `${duration(total)} so far`}${
      t.received
        ? ` <span class="ci-note">${count(t.received.requests)} requests · ${mb(t.received.bytes)} received</span>`
        : ""
    }`;
    html += stacked(
      title,
      t.load.phases.map((p) => ({
        label: p.label,
        value: p.ms,
        text: duration(p.ms),
      })),
    );
  } else if (t.received) {
    html += `<div class="ci-note">${count(t.received.requests)} requests · ${mb(t.received.bytes)} received</div>`;
  }
  if (moves) {
    const { lastMove, move } = moves;
    html += `<div class="ci-tiles">${
      lastMove
        ? tile(
            "Last move settled in",
            duration(lastMove.ms),
            lastMove.requests !== undefined
              ? `${count(lastMove.requests)} requests · ${mb(lastMove.bytes!)}`
              : "",
          )
        : tile("Last move", move ? "Settling…" : "—", "after the camera stops")
    }</div>`;
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
  const entries = Object.entries(p.stages);
  if (entries.length > 0 && p.samples > 0) {
    const max = Math.max(1e-6, ...entries.map(([, s]) => s.p95));
    const slowest = entries.reduce((a, b) => (b[1].p50 > a[1].p50 ? b : a))[0];
    html += `<div class="ci-chart-title">Where load time goes <span class="ci-note">${
      p.note ? escape(p.note) : `p50 bar · p95 tick · last ${p.samples} loads`
    }</span></div>`;
    html += entries
      .map(([stage, s]) => {
        const label = STAGE_NAMES[stage] ?? stage;
        const tip =
          s.p95 !== s.p50
            ? `p50 ${duration(s.p50)}, p95 ${duration(s.p95)}`
            : duration(s.p50);
        return (
          `<div class="ci-hbar" title="${escape(label)}: ${tip}"><span>${escape(label)}</span>` +
          `<span class="ci-hbar-plot"><span class="ci-hbar-bar${stage === slowest ? " accent" : ""}" style="width:${pct(s.p50 / max)}"></span>${
            s.p95 !== s.p50
              ? `<span class="ci-hbar-tick" style="left:${pct(s.p95 / max)}"></span>`
              : ""
          }</span><span class="ci-num">${duration(s.p50)}</span></div>`
        );
      })
      .join("");
  }
  if (p.content) {
    html += contentHtml(p.content);
  }
  return html;
}

/** Content mix: counts as tiles, decoded bytes as one stacked bar. */
function contentHtml(c: ContentMix): string {
  const images = Object.entries(c.images)
    .filter(([, n]) => n > 0)
    .map(([type, n]) => `${type.replace("image/", "").toUpperCase()} ${n}`)
    .join(" · ");
  const geometry = [
    c.lines > 0 ? `${count(c.lines)} lines` : "",
    c.points > 0 ? `${count(c.points)} points` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return `<div class="ci-tiles">${tile("Triangles", count(c.triangles), geometry)}${tile(
    "Features",
    count(c.features),
    c.formats ? escape(c.formats) : "",
  )}</div>${stacked("Decoded bytes", [
    { label: "Geometry", value: c.geometryBytes, text: mb(c.geometryBytes) },
    { label: "Textures", value: c.textureBytes, text: mb(c.textureBytes) },
  ])}${images ? `<div class="ci-note">Images: ${escape(images)}</div>` : ""}`;
}

function memoryHtml(rows: MemoryRow[]): string {
  return rows
    .map((r) => {
      const value = (v: number) => (r.unit === "bytes" ? mb(v) : count(v));
      const text =
        r.text ??
        (r.capacity !== undefined
          ? `${value(r.used)} of ${value(r.capacity)}`
          : value(r.used));
      const fraction = r.capacity ? r.used / r.capacity : undefined;
      return `<div class="ci-meter"><div class="ci-meter-head"><span>${escape(r.label)}</span><span class="ci-num">${escape(text)}</span></div>${
        fraction !== undefined ? meter(fraction) + nearLimit(fraction) : ""
      }</div>`;
    })
    .join("");
}

function gpuHtml(g: NonNullable<InspectorSnapshot["gpu"]>): string {
  return kv(
    [
      ["Adapter", g.adapter ? escape(g.adapter) : ""],
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

/** Small multiples, one series per row; hover for a moment's values. */
function historyHtml(
  h: Record<Series, number[]>,
  s: InspectorSnapshot,
  hover: number | undefined,
): string {
  const rows: Array<{
    name: string;
    series: number[];
    format: (v: number) => string;
    limit?: number[];
  }> = [];
  if (s.tiles?.cache) {
    rows.push({ name: "Tile cache", series: h.cache, format: mb });
  }
  if (s.gpu?.renderTargetBytes !== undefined) {
    rows.push({ name: "Render targets", series: h.targets, format: mb });
  }
  if (s.tiles) {
    rows.push({
      name: "Requests in flight",
      series: h.inFlight,
      format: (v) => v.toFixed(0),
      ...(s.tiles.window ? { limit: h.window } : {}),
    });
  }
  if (s.tiles?.received) {
    rows.push({
      name: "Received",
      series: h.received,
      format: (v) => `${(v / MB).toFixed(1)} MB/s`,
    });
  }
  if (s.tiles?.window?.uploadQueue !== undefined) {
    rows.push({
      name: "Upload queue",
      series: h.uploadQueue,
      format: (v) => v.toFixed(0),
    });
  }
  if (s.pipeline?.stages.decode) {
    rows.push({ name: "Decode p50", series: h.decode, format: duration });
  }
  if (s.frame?.framesRendered !== undefined) {
    rows.push({
      name: "Frames rendered",
      series: h.frames,
      format: (v) => `${v.toFixed(0)}/s`,
    });
  }
  rows.push({ name: "CPU frame", series: h.cpu, format: ms });
  if (s.frame?.gpuMs !== undefined) {
    rows.push({ name: "GPU frame", series: h.gpu, format: ms });
  }

  const w = 240;
  const rowH = 20;
  const x = (i: number, n: number) =>
    (((HISTORY - n + i) / (HISTORY - 1)) * w).toFixed(1);
  const html = rows.map(({ name, series, format, limit }) => {
    const max = Math.max(1e-6, ...(limit ?? []), ...series);
    const y = (v: number) => (rowH - 1 - (v / max) * (rowH - 3)).toFixed(1);
    const line = (values: number[]) =>
      values.map((v, i) => `${x(i, values.length)},${y(v)}`).join(" ");
    const at = (values: number[]) =>
      hover !== undefined
        ? values[values.length - HISTORY + hover]
        : values.at(-1);
    const value = at(series);
    const text =
      value === undefined
        ? "—"
        : limit !== undefined
          ? `${format(value)} of ${at(limit) ?? 0}`
          : format(value);
    const area =
      series.length > 1
        ? `<polygon class="ci-area" points="${line(series)} ${w},${rowH - 1} ${x(0, series.length)},${rowH - 1}" />`
        : "";
    const cross =
      hover !== undefined ? ((hover / (HISTORY - 1)) * w).toFixed(1) : "";
    return (
      `<div class="ci-history-row"><div class="ci-history-head"><span>${name}</span><span class="ci-num">${text}</span></div>` +
      `<svg viewBox="0 0 ${w} ${rowH}" preserveAspectRatio="none" aria-hidden="true">` +
      `<line class="ci-base" x1="0" y1="${rowH - 0.5}" x2="${w}" y2="${rowH - 0.5}" />${
        limit && limit.length > 1
          ? `<polyline class="ci-limit" points="${line(limit)}" />`
          : ""
      }${area}${
        series.length > 1
          ? `<polyline class="ci-line" points="${line(series)}" />`
          : ""
      }${
        cross
          ? `<line class="ci-cross" x1="${cross}" y1="0" x2="${cross}" y2="${rowH}" />`
          : ""
      }</svg></div>`
    );
  });
  return `${html.join("")}<div class="ci-note">${
    hover !== undefined
      ? `${((HISTORY - 1 - hover) / 4).toFixed(1)} s ago`
      : "Newest at the right; hover for the values at a moment."
  }</div>`;
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
  return `<div class="ci-kv">${rows.map(([k, v]) => `<span>${k}</span><span class="ci-num">${v}</span>`).join("")}</div>`;
}

/** Stat tile: label, value, optional meter and note. */
function tile(label: string, value: string, note = "", extra = ""): string {
  return `<div class="ci-tile"><div class="ci-tile-label">${label}</div><div class="ci-tile-value">${value}</div>${extra}${note ? `<div class="ci-note">${note}</div>` : ""}</div>`;
}

/** A meter: fill against a limit (warning near it), with an optional marker. */
function meter(fraction: number, marker?: number): string {
  return `<span class="ci-track"><span class="ci-fill${fraction > 0.9 ? " warn" : ""}" style="width:${pct(fraction)}"></span>${
    marker !== undefined
      ? `<span class="ci-marker" style="left:${pct(marker)}"></span>`
      : ""
  }</span>`;
}

const nearLimit = (fraction: number) =>
  fraction > 0.9 ? `<span class="ci-warn">⚠ near limit</span>` : "";

/** One stacked bar (part-to-whole) with its legend. */
function stacked(
  title: string,
  parts: Array<{ label: string; value: number; text: string }>,
): string {
  const total = parts.reduce((sum, p) => sum + p.value, 0) || 1;
  return `<div class="ci-chart-title">${title}</div><div class="ci-stack">${parts
    .map((p, i) =>
      p.value > 0
        ? `<span class="s${i + 1}" style="flex-grow:${p.value / total}" title="${escape(p.label)}: ${p.text}"></span>`
        : "",
    )
    .join("")}</div><div class="ci-legend">${parts
    .map(
      (p, i) =>
        `<span class="ci-key s${i + 1}"></span><span>${escape(p.label)}</span><span class="ci-num">${p.text}</span>`,
    )
    .join("")}</div>`;
}

const MB = 1048576;
const pct = (f: number) => `${(Math.min(Math.max(f, 0), 1) * 100).toFixed(2)}%`;
const ms = (v: number) => `${v.toFixed(2)} ms`;
const duration = (v: number) =>
  v < 1000 ? `${v.toFixed(v < 10 ? 1 : 0)} ms` : `${(v / 1000).toFixed(1)} s`;
const mb = (bytes: number) =>
  `${(bytes / MB).toFixed(bytes < 10 * MB ? 1 : 0)} MB`;
const count = (n: number) =>
  n >= 1e6
    ? `${(n / 1e6).toFixed(1)}M`
    : n >= 1e4
      ? `${(n / 1e3).toFixed(0)}k`
      : n.toLocaleString("en-US");

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
  --ci-good: #5cc08a;
  --ci-warning: #fab219;
  --ci-bad: #ef6c5a;
  position: absolute;
  left: 8px;
  top: 8px;
  max-height: calc(100% - 16px);
  width: max-content;
  max-width: calc(100% - 16px);
  display: flex;
  flex-direction: column;
  background: var(--ci-bg);
  border: 1px solid var(--ci-border);
  border-radius: 6px;
  color: var(--ci-text);
  font: 12px/1.45 system-ui, sans-serif;
  backdrop-filter: blur(4px);
  z-index: 1;
}
.cesium-inspector.expanded { width: 320px; }
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
.cesium-inspector .ci-name { color: var(--ci-strong); font-weight: 600; }
.cesium-inspector .ci-summary {
  display: flex; align-items: center; gap: 5px; min-width: 0;
  font-variant-numeric: tabular-nums; overflow: hidden;
}
.cesium-inspector .ci-sep { color: var(--ci-muted); }
.cesium-inspector .ci-dot {
  display: inline-block; inline-size: 7px; block-size: 7px; border-radius: 50%;
  margin-inline-end: 4px; background: var(--ci-series-1);
}
.cesium-inspector[data-state="settled"] .ci-dot { background: var(--ci-good); }
.cesium-inspector[data-state="paused"] .ci-dot { background: var(--ci-muted); }
.cesium-inspector .ci-warn { color: var(--ci-warning); }
.cesium-inspector .ci-chevron {
  margin-inline-start: auto; inline-size: 6px; block-size: 6px;
  border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg) translateY(-2px); flex: none;
}
.cesium-inspector.expanded .ci-chevron { transform: rotate(-135deg) translateY(-1px); }
.cesium-inspector .ci-body { display: none; overflow-y: auto; padding: 0 8px 6px; }
.cesium-inspector.expanded .ci-body { display: block; }
.cesium-inspector .ci-section { border-top: 1px solid var(--ci-border); }
.cesium-inspector .ci-section > summary {
  cursor: pointer; padding: 5px 0; color: var(--ci-strong); font-weight: 600;
  font-size: 11px; letter-spacing: 0.02em; text-transform: uppercase;
}
.cesium-inspector .ci-content { padding-bottom: 6px; }
.cesium-inspector .ci-num { font-variant-numeric: tabular-nums; color: var(--ci-strong); }
.cesium-inspector .ci-note { color: var(--ci-muted); font-size: 11px; }
.cesium-inspector .ci-kv { display: grid; grid-template-columns: auto 1fr; gap: 2px 12px; }
.cesium-inspector .ci-kv .ci-num { text-align: right; }
.cesium-inspector .ci-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; margin-bottom: 8px; }
.cesium-inspector .ci-tile-label { color: var(--ci-muted); font-size: 11px; }
.cesium-inspector .ci-tile-value { color: var(--ci-strong); font-size: 15px; font-variant-numeric: tabular-nums; }
.cesium-inspector .ci-of { color: var(--ci-muted); font-size: 12px; }
.cesium-inspector .ci-track {
  position: relative; display: block; block-size: 4px; margin: 3px 0;
  background: var(--ci-grid); border-radius: 2px;
}
.cesium-inspector .ci-fill { position: absolute; inset: 0 auto 0 0; background: var(--ci-series-1); border-radius: 2px; }
.cesium-inspector .ci-fill.warn { background: var(--ci-warning); }
.cesium-inspector .ci-marker { position: absolute; top: -2px; bottom: -2px; inline-size: 1px; background: var(--ci-strong); }
.cesium-inspector .ci-chart-title { color: var(--ci-text); margin: 4px 0; }
.cesium-inspector .ci-stack { display: flex; gap: 2px; block-size: 8px; margin-bottom: 4px; }
.cesium-inspector .ci-stack > span { border-radius: 2px; min-inline-size: 2px; }
.cesium-inspector .s1 { background: var(--ci-series-1); }
.cesium-inspector .s2 { background: var(--ci-series-2); }
.cesium-inspector .s3 { background: var(--ci-series-3); }
.cesium-inspector .s4 { background: var(--ci-series-4); }
.cesium-inspector .ci-legend { display: grid; grid-template-columns: 10px 1fr auto; gap: 1px 6px; align-items: center; margin-bottom: 8px; }
.cesium-inspector .ci-legend .ci-num { text-align: right; }
.cesium-inspector .ci-key { inline-size: 8px; block-size: 8px; border-radius: 2px; }
.cesium-inspector .ci-hbar { display: grid; grid-template-columns: 76px 1fr 52px; align-items: center; gap: 8px; }
.cesium-inspector .ci-hbar .ci-num { text-align: right; }
.cesium-inspector .ci-hbar-plot { position: relative; block-size: 8px; }
.cesium-inspector .ci-hbar-bar { position: absolute; inset: 0 auto 0 0; background: var(--ci-muted); border-radius: 2px; }
.cesium-inspector .ci-hbar-bar.accent { background: var(--ci-series-1); }
.cesium-inspector .ci-hbar-tick { position: absolute; top: -1px; bottom: -1px; inline-size: 2px; background: var(--ci-strong); }
.cesium-inspector .ci-meter { margin-bottom: 4px; }
.cesium-inspector .ci-meter-head { display: flex; justify-content: space-between; gap: 8px; }
.cesium-inspector .ci-history-row { margin-bottom: 2px; }
.cesium-inspector .ci-history-head { display: flex; justify-content: space-between; color: var(--ci-muted); font-size: 11px; }
.cesium-inspector .ci-history-row svg { display: block; inline-size: 100%; block-size: 20px; }
.cesium-inspector .ci-line { fill: none; stroke: var(--ci-series-1); stroke-width: 1.5; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
.cesium-inspector .ci-area { fill: var(--ci-series-1); opacity: 0.12; }
.cesium-inspector .ci-limit { fill: none; stroke: var(--ci-muted); stroke-width: 1; vector-effect: non-scaling-stroke; }
.cesium-inspector .ci-base { stroke: var(--ci-grid); stroke-width: 1; vector-effect: non-scaling-stroke; }
.cesium-inspector .ci-cross { stroke: var(--ci-muted); stroke-width: 1; vector-effect: non-scaling-stroke; }
.cesium-inspector .ci-problems { margin: 0; padding: 0; list-style: none; }
.cesium-inspector .ci-problems li { color: var(--ci-text); margin-bottom: 4px; }
.cesium-inspector .ci-problems strong { color: var(--ci-warning); margin-inline-end: 4px; }
.cesium-inspector .ci-problems li.error strong { color: var(--ci-bad); }
.cesium-inspector .ci-pick-name { color: var(--ci-strong); font-weight: 600; }
.cesium-inspector .ci-props { border-collapse: collapse; margin-top: 4px; inline-size: 100%; }
.cesium-inspector .ci-props th { text-align: left; font-weight: normal; color: var(--ci-muted); padding: 1px 8px 1px 0; vertical-align: top; }
.cesium-inspector .ci-props td { color: var(--ci-strong); word-break: break-word; }
`;
