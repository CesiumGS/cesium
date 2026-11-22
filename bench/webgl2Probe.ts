// The device probe's report (CS-35): which device an engine would draw with
// here and why, what the WebGL 2 probe read from this context (limits against
// the floor, the extensions the renderer cares about, the framebuffers it
// built and checked), the same probe run in a worker, and an engine made with
// the option and persona chosen, clearing a canvas, with the inspector over
// it. The report is plain JSON to copy back: it is how a real device's facts
// reach the WebGL 2 personas (docs/superpowers/plans/2026-11-13-webgl2-renderer.md,
// section 8, "Measuring on real devices").
//
// Design: one column on a phone, two from 900 px; the choice first, the
// facts below it, the engine beside them. Every verdict is text and a mark,
// never color alone; both themes follow the system's.
import { attachInspector, inspectEngine } from "../packages/ui/src/index.ts";
import { Engine } from "../packages/core/src/scene/Engine.ts";
import {
  chooseDevice,
  forgetProbes,
  probeWebgpu,
  type DeviceChoice,
  type RendererOption,
  type Webgl2Probe,
  type WebgpuProbe,
} from "../packages/core/src/scene/deviceChoice.ts";
import {
  PROBED_FRAMEBUFFERS,
  LIMIT_NAMES,
  WEBGL2_FLOOR,
  type Webgl2Facts,
  type Webgl2Limits,
} from "../packages/core/src/profile/webgl2Facts.ts";
import { webgl2Personas } from "../packages/core/src/profile/personas.ts";
import { CanvasTarget } from "../packages/core/src/scene/renderTarget.ts";
import { probeWebgl2 } from "../packages/core/src/webgl2/probe.ts";

/** The extensions the plan's steps depend on (CS-43), with what each is for. */
const EXTENSIONS: readonly [string, string][] = [
  ["EXT_color_buffer_float", "HDR targets (the floor)"],
  ["EXT_clip_control", "reversed-z depth; else logarithmic"],
  ["WEBGL_multi_draw", "one call a batch; else one per record"],
  ["EXT_float_blend", "32-bit moments"],
  ["OES_texture_float_linear", "hardware filtering of float textures"],
  ["EXT_disjoint_timer_query_webgl2", "GPU time"],
  ["WEBGL_compressed_texture_s3tc", "BC1 to BC3 blocks"],
  ["EXT_texture_compression_bptc", "BC7 blocks"],
  ["WEBGL_compressed_texture_astc", "ASTC blocks"],
  ["WEBGL_compressed_texture_etc", "ETC2 blocks"],
  ["WEBGL_debug_renderer_info", "the unmasked renderer"],
];

interface Report {
  userAgent: string;
  platform: string;
  devicePixelRatio: number;
  crossOriginIsolated: boolean;
  main: { webgpu: WebgpuProbe; webgl2: Webgl2Probe };
  worker:
    { webgpu: WebgpuProbe; webgl2: Webgl2Probe } | { error: string } | null;
  choice: { auto: string };
}

type Child = Node | string | undefined | false;

/** A small element builder: text only ever goes in as text. */
function h(
  tag: string,
  attrs: Record<string, string> = {},
  ...children: Child[]
): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  for (const child of children) {
    if (child !== undefined && child !== false) {
      el.append(child);
    }
  }
  return el;
}

const mark = (ok: boolean, yes = "yes", no = "no") =>
  h(
    "span",
    { class: ok ? "ok" : "bad" },
    h("span", { class: "mark", "aria-hidden": "true" }, ok ? "✓" : "✕"),
    ok ? yes : no,
  );

function facts(rows: [string, Child][]): HTMLElement {
  return h(
    "dl",
    {},
    ...rows.flatMap(([k, v]) => [h("dt", {}, k), h("dd", {}, v)]),
  );
}

function table(head: string[], rows: Child[][]): HTMLElement {
  return h(
    "table",
    {},
    h("thead", {}, h("tr", {}, ...head.map((c) => h("th", {}, c)))),
    h(
      "tbody",
      {},
      ...rows.map((r) =>
        h(
          "tr",
          {},
          ...r.map((c, i) => h("td", i === 1 ? { class: "num" } : {}, c)),
        ),
      ),
    ),
  );
}

function webgpuCard(p: WebgpuProbe): HTMLElement {
  return h(
    "section",
    { class: "card", "aria-labelledby": "h-webgpu" },
    h("h2", { id: "h-webgpu" }, "WebGPU"),
    h(
      "p",
      { class: "verdict" },
      p.ok ? mark(true, "Available") : mark(false, "", "Unavailable"),
    ),
    p.ok ? undefined : h("p", { class: "reason" }, p.reason),
  );
}

function limitsTable(f: Webgl2Facts): HTMLElement {
  const floorKeys = Object.keys(WEBGL2_FLOOR) as (keyof typeof WEBGL2_FLOOR)[];
  const rows = (Object.keys(f.limits) as (keyof Webgl2Limits)[]).map((key) => {
    const floor = (WEBGL2_FLOOR as Record<string, number>)[key];
    const meets = floor === undefined || f.limits[key] >= floor;
    return [
      LIMIT_NAMES[key],
      String(f.limits[key]),
      floor === undefined ? "not required" : `at least ${floor}`,
      floorKeys.includes(key as never) ? mark(meets, "meets", "below") : "",
    ];
  });
  return table(["Limit", "Value", "Floor", ""], rows);
}

function webgl2Card(p: Webgl2Probe, heading = "WebGL 2"): HTMLElement {
  const card = h("section", { class: "card" }, h("h2", {}, heading));
  card.append(
    h(
      "p",
      { class: "verdict" },
      p.ok ? mark(true, "Meets the floor") : mark(false, "", "Below the floor"),
    ),
  );
  if (!p.ok) {
    card.append(
      h("ul", {}, ...p.missing.map((m) => h("li", { class: "bad" }, m))),
    );
  }
  const f = p.facts;
  if (!f) {
    return card;
  }
  card.append(
    facts([
      ["Version", f.version],
      ["Renderer", f.glRenderer],
      [
        "Unmasked",
        f.unmasked
          ? `${f.unmasked.vendor} · ${f.unmasked.renderer}`
          : "blocked by the browser",
      ],
      ["ANGLE backend", f.angleBackend ?? "none named"],
      [
        "Software renderer",
        f.software ? "yes (run and reported, never refused)" : "no",
      ],
      ["failIfMajorPerformanceCaveat", f.failIfMajorPerformanceCaveat],
    ]),
    limitsTable(f),
    table(
      ["Extension", "", "For"],
      EXTENSIONS.map(([name, why]) => [
        name,
        mark(f.extensions.includes(name), "present", "absent"),
        why,
      ]),
    ),
    table(
      ["Framebuffer", "", "Status"],
      PROBED_FRAMEBUFFERS.map((name) => {
        const fb = f.framebuffers.find((x) => x.name === name);
        return [
          name,
          fb ? mark(fb.complete, "complete", "incomplete") : "?",
          fb?.status ?? "not checked",
        ];
      }),
    ),
    h(
      "p",
      { class: "note" },
      `${f.extensions.length} extensions listed in all.`,
    ),
  );
  return card;
}

function choiceCard(choice: DeviceChoice | string): HTMLElement {
  const card = h(
    "section",
    { class: "card" },
    h("h2", {}, 'Choice for renderer "auto"'),
  );
  if (typeof choice === "string") {
    card.append(
      h("p", { class: "verdict" }, mark(false, "", "No device can run here")),
      h("p", { class: "reason" }, choice),
    );
  } else {
    card.append(
      h(
        "p",
        { class: "verdict" },
        choice.renderer === "webgpu" ? "WebGPU" : "WebGL 2",
      ),
      h("p", { class: "reason" }, choice.reason),
    );
  }
  return card;
}

/** The report's JSON, for a person to copy back. */
async function collect(): Promise<Report> {
  forgetProbes();
  const [webgpu, webgl2] = await Promise.all([probeWebgpu(), probeWebgl2()]);
  const worker = await probeInWorker();
  let auto: string;
  try {
    const choice = await chooseDevice(
      {},
      { webgpu: async () => webgpu, webgl2: async () => webgl2 },
    );
    auto = `${choice.renderer}: ${choice.reason}`;
  } catch (error) {
    auto = error instanceof Error ? error.message : String(error);
  }
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    devicePixelRatio: devicePixelRatio,
    crossOriginIsolated: self.crossOriginIsolated,
    main: { webgpu, webgl2 },
    worker,
    choice: { auto },
  };
}

function probeInWorker(): Promise<Report["worker"]> {
  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("./webgl2ProbeWorker.ts", import.meta.url), {
        type: "module",
      });
    } catch (error) {
      resolve({
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }
    const timer = setTimeout(() => {
      worker.terminate();
      resolve({ error: "the worker did not answer in 10 s" });
    }, 10_000);
    worker.onmessage = (
      event: MessageEvent<
        NonNullable<Extract<Report["worker"], { webgpu: unknown }>>
      >,
    ) => {
      clearTimeout(timer);
      worker.terminate();
      resolve(event.data);
    };
    worker.onerror = (event) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({ error: event.message || "the worker failed" });
    };
    worker.postMessage("probe");
  });
}

/** The two probes' facts agree, apart from nothing the page and a worker could differ on. */
function agree(report: Report): boolean | undefined {
  const w = report.worker;
  if (!w || "error" in w) {
    return undefined;
  }
  const strip = (p: Webgl2Probe) => JSON.stringify(p.facts ?? p);
  return (
    strip(report.main.webgl2) === strip(w.webgl2) &&
    report.main.webgpu.ok === w.webgpu.ok
  );
}

function workerCard(report: Report): HTMLElement {
  const card = h(
    "section",
    { class: "card" },
    h("h2", {}, "The same probe in a worker"),
  );
  const w = report.worker;
  if (!w) {
    card.append(h("p", { class: "reason" }, "Not run."));
  } else if ("error" in w) {
    card.append(
      h("p", { class: "verdict" }, mark(false, "", "Did not run")),
      h("p", { class: "reason" }, w.error),
    );
  } else {
    const same = agree(report);
    card.append(
      h(
        "p",
        { class: "verdict" },
        mark(same === true, "Agrees with the page", "Differs from the page"),
      ),
      facts([
        [
          "WebGPU",
          w.webgpu.ok ? "available" : `unavailable: ${w.webgpu.reason}`,
        ],
        [
          "WebGL 2",
          w.webgl2.ok
            ? "meets the floor"
            : `below the floor: ${w.webgl2.missing.join("; ")}`,
        ],
      ]),
    );
  }
  return card;
}

// ------------------------------------------------------------------ the engine

interface Running {
  engine: Engine;
  stop(): void;
}

let running: Running | undefined;

async function createEngine(
  stage: HTMLElement,
  status: HTMLElement,
  renderer: RendererOption,
  emulate: string,
): Promise<void> {
  running?.stop();
  running = undefined;
  stage.replaceChildren();
  status.replaceChildren(h("p", { class: "note" }, "Creating the engine…"));
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-label", "The engine's canvas");
  stage.append(canvas);
  try {
    const engine = await Engine.create({
      renderer,
      ...(emulate && { emulate: emulate as keyof typeof webgl2Personas }),
    });
    const world = engine.createWorld();
    engine.addView({
      target: new CanvasTarget(canvas),
      world,
      clearColor: [0.01, 0.07, 0.25],
    });
    engine.start();
    const inspector = attachInspector(
      stage,
      inspectEngine(engine, { name: "Engine", tilesets: () => [] }),
      { placement: "top-left" },
    );
    running = {
      engine,
      stop() {
        inspector.dispose();
        engine.destroy();
      },
    };
    status.replaceChildren(
      h(
        "p",
        { class: "verdict" },
        `${engine.choice.renderer === "webgpu" ? "WebGPU" : "WebGL 2"} engine`,
      ),
      h("p", { class: "reason" }, engine.choice.reason),
      h(
        "p",
        { class: "note" },
        engine.choice.renderer === "webgl2"
          ? "The WebGL 2 renderer clears each view to its background color; it draws no content yet."
          : "The WebGPU renderer draws the default sky.",
      ),
    );
  } catch (error) {
    stage.replaceChildren();
    status.replaceChildren(
      h("p", { class: "verdict" }, mark(false, "", "No engine")),
      h(
        "p",
        { class: "reason" },
        error instanceof Error ? error.message : String(error),
      ),
    );
  }
}

// --------------------------------------------------------------------- the page

const app = document.getElementById("app")!;

function option(value: string, label: string): HTMLOptionElement {
  const o = document.createElement("option");
  o.value = value;
  o.textContent = label;
  return o;
}

async function main(): Promise<void> {
  const renderer = h("select", { id: "renderer" }) as HTMLSelectElement;
  renderer.append(
    option("auto", "auto"),
    option("webgpu", "webgpu"),
    option("webgl2", "webgl2"),
  );
  const emulate = h("select", { id: "emulate" }) as HTMLSelectElement;
  emulate.append(
    option("", "none"),
    ...Object.keys(webgl2Personas).map((n) => option(n, n)),
  );
  const run = h(
    "button",
    { type: "button", class: "primary" },
    "Run the probe",
  ) as HTMLButtonElement;
  const create = h(
    "button",
    { type: "button" },
    "Create an engine",
  ) as HTMLButtonElement;
  const params = new URLSearchParams(location.search);
  renderer.value = params.get("renderer") ?? "auto";
  emulate.value = params.get("emulate") ?? "";

  const results = h("div", { class: "stack", "aria-live": "polite" });
  const stage = h("div", { class: "stage" });
  const status = h(
    "div",
    {},
    h(
      "p",
      { class: "note" },
      "No engine yet: choose a renderer and press Create an engine.",
    ),
  );
  const jsonBox = h("textarea", {
    readonly: "",
    "aria-label": "The report, as JSON",
    spellcheck: "false",
  }) as HTMLTextAreaElement;
  const copy = h(
    "button",
    { type: "button" },
    "Copy the report",
  ) as HTMLButtonElement;
  const copied = h("span", { class: "note", role: "status" });

  app.replaceChildren(
    h("h1", {}, "Device probe"),
    h(
      "p",
      { class: "lede" },
      "Which device an engine draws with here and why, what this WebGL 2 context offers against the floor, and an engine made with the option you choose. Copy the report back from a real device: it is how its facts reach the personas.",
    ),
    h(
      "div",
      { class: "controls" },
      h("label", {}, "renderer", renderer),
      h("label", {}, "emulate", emulate),
      run,
      create,
    ),
    h(
      "div",
      { class: "grid" },
      h("div", {}, results),
      h(
        "div",
        { class: "stack" },
        h("section", { class: "card" }, h("h2", {}, "Engine"), status, stage),
        h(
          "section",
          { class: "card" },
          h("h2", {}, "Report"),
          h("div", { class: "row" }, copy, copied),
          jsonBox,
        ),
      ),
    ),
  );

  const probe = async () => {
    run.disabled = true;
    results.replaceChildren(h("p", { class: "note" }, "Probing…"));
    try {
      const report = await collect();
      (globalThis as { __webgl2Probe?: Report }).__webgl2Probe = report;
      let choice: DeviceChoice | string;
      try {
        choice = await chooseDevice(
          {},
          {
            webgpu: async () => report.main.webgpu,
            webgl2: async () => report.main.webgl2,
          },
        );
      } catch (error) {
        choice = error instanceof Error ? error.message : String(error);
      }
      results.replaceChildren(
        choiceCard(choice),
        webgpuCard(report.main.webgpu),
        webgl2Card(report.main.webgl2),
        workerCard(report),
      );
      jsonBox.value = JSON.stringify(report, null, 2);
    } finally {
      run.disabled = false;
    }
  };

  run.addEventListener("click", () => void probe());
  create.addEventListener("click", async () => {
    create.disabled = true;
    await createEngine(
      stage,
      status,
      renderer.value as RendererOption,
      emulate.value,
    );
    create.disabled = false;
  });
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(jsonBox.value);
      copied.textContent = "Copied.";
    } catch {
      // A page over plain http (a phone on the network) can't use the clipboard: select the text instead.
      jsonBox.focus();
      jsonBox.select();
      copied.textContent = "Selected: copy it with your device's menu.";
    }
  });
  await probe();
}

void main();
