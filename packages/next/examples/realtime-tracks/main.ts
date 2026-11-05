import {
  Ellipsoid,
  PointSource,
  VectorLayer,
  cartographic,
  fromDegrees,
  vec3,
  type VectorStyleDocument,
} from "../../src/index.ts";
import type { ExampleContext } from "../types.ts";

/**
 * Real-time tracks: vehicles reported by a feed, as a database or a
 * message stream would send them, over the terrain around Boulder,
 * Colorado.
 *
 * A worker stands in for the feed: it keeps each vehicle's position,
 * course and speed, moves them on (dead reckoning, with turns), and sends
 * records in slices, as many a second as a stream would carry. Each slice
 * goes to the GPU as one typed array (`PointSource.update`); there the
 * vehicles move between their last two reports, clamp to the terrain the
 * view draws, and are drawn by the style below: symbols from afar, trucks
 * up close. The style is the vector styling language (3D Tiles styling's
 * successor draft), compiled to the GPU, so its parameters (the switch
 * distance, the symbols' size) change without a frame's CPU work per
 * vehicle.
 */

const SITE = { longitude: -105.25, latitude: 40.02, height: 1650 };
const COUNTS = [1_000, 10_000, 100_000, 1_000_000, 10_000_000];
/** Area across (km). */
const AREAS = [5, 20, 100, 400];
const RATES = [1, 2, 5, 10];
/** Trucks shown at once, the nearest. */
const TRUCKS = 10_000;
const AFFILIATIONS = ["friend", "hostile", "neutral", "unknown"] as const;

/** The style: symbols beyond the switch distance, trucks within it. */
const STYLE: VectorStyleDocument = {
  extensionsUsed: ["EXT_models"],
  parameters: {
    switchDistance: {
      label: "Trucks within",
      default: 500,
      options: [
        { label: "None (all symbols)", value: 0 },
        { label: "250 m", value: 250 },
        { label: "500 m", value: 500 },
        { label: "1 km", value: 1000 },
        { label: "2 km", value: 2000 },
        { label: `All (the nearest ${TRUCKS.toLocaleString()})`, value: 1e9 },
      ],
    },
    symbolSize: {
      label: "Symbol size (px)",
      default: 14,
      min: 4,
      max: 32,
      step: 1,
    },
    outline: { label: "Outlines", default: true },
  },
  resources: {
    // MIL-STD-2525's friendly frame: a rectangle 3:2.
    friendFrame: { kind: "symbol", path: "M -1 -0.67 H 1 V 0.67 H -1 Z" },
    truck: {
      kind: "model",
      uri: "/specs-data/Models/glTF-2.0/CesiumMilkTruck/glTF-Draco/CesiumMilkTruck.gltf",
    },
  },
  scales: {
    affiliationFill: {
      type: "categorical",
      range: {
        friend: "#80e0ff",
        hostile: "#ff8080",
        neutral: "#aaffaa",
        unknown: "#ffff80",
      },
    },
  },
  layers: [
    {
      id: "symbols",
      filter: "${view.distance} >= ${param.switchDistance}",
      shape:
        "match(${affiliation}, 'friend', 'friendFrame', 'hostile', 'diamond', 'neutral', 'square', 'circle')",
      size: "${param.symbolSize} * 1px",
      // Standing on the vehicle's place (bottom-centered): centered, the
      // ground in front of it would hide its lower half.
      placement: { offset: [0, "${param.symbolSize} * -0.5px"] },
      fill: { color: "scale('affiliationFill', ${affiliation})" },
      // Thinner on small symbols (an eighth of their size, 0.75–1.5 px):
      // a full outline would be most of a few-pixel symbol. Splatted ones
      // (6 px and under) draw none.
      outline: {
        color: "#000000",
        width:
          "${param.outline} ? min(1.5, max(0.75, ${param.symbolSize} / 8)) : 0",
      },
    },
    {
      id: "trucks",
      filter: "${view.distance} < ${param.switchDistance}",
      shape: "model('truck')",
      heading: "${heading}",
    },
  ],
};

/**
 * The feed, in a worker: vehicles as rows (x, y, course, speed factor,
 * turn rate), moved on and sent in slices of at most `BUDGET / rate`, the
 * records a stream carries a second. Self-contained: it runs from its
 * source text.
 */
function feedWorker() {
  const BUDGET = 2_500_000;
  const ROW = 5;
  let n = 0;
  let half = 10000;
  let rows = new Float32Array(0);
  let rate = 10;
  let speed = 15;
  let turning = 20;
  let paused = false;
  let cursor = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  const post = (message: unknown, transfer: Transferable[] = []) =>
    (self as unknown as Worker).postMessage(message, transfer);
  /** Vehicles a tick, and the seconds between a vehicle's reports. */
  const plan = () => {
    const per = Math.min(n, Math.max(1, Math.ceil(BUDGET / rate)));
    return { per, interval: Math.ceil(n / per) / rate };
  };
  const tick = () => {
    if (paused || n === 0) {
      return;
    }
    const { per, interval } = plan();
    const first = cursor;
    const count = Math.min(per, n - first);
    const out = new Float32Array(count * 4);
    for (let k = 0; k < count; k++) {
      const o = (first + k) * ROW;
      // A course that wanders (the turn rate drifts within ±turning).
      let turn = rows[o + 4]! + (Math.random() * 2 - 1) * turning * 0.3;
      turn = Math.max(-turning, Math.min(turning, turn));
      rows[o + 4] = turn;
      let h = rows[o + 2]! + turn * interval;
      const v = speed * rows[o + 3]!;
      const r = (h * Math.PI) / 180;
      let x = rows[o]! + v * interval * Math.sin(r);
      let y = rows[o + 1]! + v * interval * Math.cos(r);
      // Turned back at the area's edge.
      if (Math.abs(x) > half) {
        x = Math.sign(x) * half;
        h = 360 - h;
      }
      if (Math.abs(y) > half) {
        y = Math.sign(y) * half;
        h = 180 - h;
      }
      h = ((h % 360) + 360) % 360;
      rows[o] = x;
      rows[o + 1] = y;
      rows[o + 2] = h;
      out[k * 4] = x;
      out[k * 4 + 1] = y;
      out[k * 4 + 2] = 0;
      out[k * 4 + 3] = h;
    }
    cursor = (first + count) % n;
    post({ type: "samples", first, data: out, ...plan() }, [out.buffer]);
  };
  const restart = () => {
    if (timer !== undefined) {
      clearInterval(timer);
    }
    timer = setInterval(tick, 1000 / rate);
  };
  self.onmessage = (e: MessageEvent) => {
    const m = e.data;
    if (m.type === "start") {
      n = m.count;
      half = m.half;
      rate = m.rate;
      speed = m.speed;
      turning = m.turning;
      paused = m.paused;
      cursor = 0;
      rows = new Float32Array(n * ROW);
      // The first query: every vehicle's row and properties, in chunks.
      const CHUNK = 1 << 20;
      for (let first = 0; first < n; first += CHUNK) {
        const count = Math.min(CHUNK, n - first);
        const samples = new Float32Array(count * 4);
        const props = new Float32Array(count * m.stride);
        const words = new Uint32Array(props.buffer);
        for (let k = 0; k < count; k++) {
          const o = (first + k) * ROW;
          rows[o] = (Math.random() * 2 - 1) * half;
          rows[o + 1] = (Math.random() * 2 - 1) * half;
          rows[o + 2] = Math.random() * 360;
          rows[o + 3] = 0.5 + Math.random();
          rows[o + 4] = 0;
          samples[k * 4] = rows[o]!;
          samples[k * 4 + 1] = rows[o + 1]!;
          samples[k * 4 + 3] = rows[o + 2]!;
          const r = Math.random();
          words[k * m.stride + m.affiliation] =
            r < 0.55 ? 0 : r < 0.7 ? 1 : r < 0.9 ? 2 : 3;
        }
        post({ type: "properties", first, data: props }, [props.buffer]);
        post({ type: "samples", first, data: samples, ...plan() }, [
          samples.buffer,
        ]);
      }
      restart();
    } else if (m.type === "config") {
      speed = m.speed;
      turning = m.turning;
      paused = m.paused;
      if (m.rate !== rate) {
        rate = m.rate;
        restart();
      }
      post({ type: "plan", ...plan() });
    } else if (m.type === "stop" && timer !== undefined) {
      clearInterval(timer);
    }
  };
}

export async function run({ viewer, panel, signal }: ExampleContext) {
  const { engine, world } = viewer;
  const ellipsoid = Ellipsoid.WGS84;
  const origin = ellipsoid.cartographicToCartesian(
    fromDegrees(SITE.longitude, SITE.latitude, SITE.height),
    vec3.vec3(),
  );
  const renderMode = engine.renderMode;
  // Vehicles move between reports: render every frame.
  engine.renderMode = "continuous";

  const feed = new Worker(
    URL.createObjectURL(
      new Blob([`(${feedWorker.toString()})()`], { type: "text/javascript" }),
    ),
  );
  const settings = {
    count: 100_000,
    area: 20,
    rate: 10,
    speed: 15,
    turning: 20,
    paused: false,
  };
  let source: PointSource | undefined;
  let layer: VectorLayer | undefined;
  let building = 0;
  const stats = {
    records: 0,
    updateMs: 0,
    since: performance.now(),
    per: 0,
    interval: 0,
  };
  /** The followed vehicle's last two reports, as the GPU moves it. */
  let follow:
    | {
        vehicle: number;
        inputs: number;
        p0: number[];
        p1: number[];
        t1: number;
      }
    | undefined;

  feed.onmessage = (e: MessageEvent) => {
    const m = e.data;
    if (!source || signal.aborted) {
      return;
    }
    if (m.type === "properties") {
      source.setProperties(m.first, m.data);
    } else if (m.type === "samples") {
      const start = performance.now();
      source.delay = m.interval;
      source.update(m.first, m.data);
      stats.updateMs = stats.updateMs * 0.8 + (performance.now() - start) * 0.2;
      stats.records += m.data.length / 4;
      stats.per = m.per;
      stats.interval = m.interval;
      const n = m.data.length / 4;
      if (follow && follow.vehicle >= m.first && follow.vehicle < m.first + n) {
        const k = (follow.vehicle - m.first) * 4;
        const next = Array.from(m.data.subarray(k, k + 4) as Float32Array);
        follow.p0 = followShown() ?? next;
        follow.p1 = next;
        follow.t1 = engine.time;
      }
    } else if (m.type === "plan") {
      stats.per = m.per;
      stats.interval = m.interval;
      source.delay = m.interval;
    }
  };

  // The style's parameters, kept across rebuilds; controls showing them.
  const parameterValues = new Map<string, number | boolean | string>();
  const refreshers: Array<() => void> = [];
  const setParameter = (name: string, value: number | boolean | string) => {
    parameterValues.set(name, value);
    layer?.setParameter(name, value);
  };

  /** A collection of `count` vehicles over `area` km, replacing the last. */
  async function build() {
    const token = ++building;
    const half = (settings.area * 1000) / 2;
    const n = settings.count;
    feed.postMessage({ type: "stop" });
    layer?.destroy();
    source?.destroy();
    layer = undefined;
    follow = undefined;
    // The ground's drop at the edge (the capture is flat).
    const drop = (half * half) / (2 * 6371000);
    const next = new PointSource(engine, world, {
      capacity: n,
      origin,
      properties: { affiliation: { enum: AFFILIATIONS } },
      clamp: {
        halfExtent: half * 1.05,
        size: 4096,
        top: 3000,
        bottom: -(1000 + drop),
      },
    });
    next.count = n;
    source = next;
    const created = await VectorLayer.create(engine, world, {
      source: next,
      style: STYLE,
      slots: Math.min(n, TRUCKS),
    });
    if (token !== building || signal.aborted) {
      created.destroy();
      return;
    }
    layer = created;
    // Symbols as large as the overview's crowd allows (the whole area is
    // in view, whatever its size): 18 px for 1,000 vehicles, 4 px smaller
    // for each tenfold more (the slider overrides).
    parameterValues.set(
      "symbolSize",
      Math.max(3, Math.min(20, Math.round(30 - 4 * Math.log10(n)))),
    );
    for (const [name, value] of parameterValues) {
      layer.setParameter(name, value);
    }
    for (const refresh of refreshers) {
      refresh();
    }
    feed.postMessage({
      type: "start",
      count: n,
      half,
      rate: settings.rate,
      speed: settings.speed,
      turning: settings.turning,
      paused: settings.paused,
      stride: next.stride,
      affiliation: next.layout.affiliation!.offset,
    });
    // The camera stays where it is (the Overview button frames the area).
  }

  /** The ground at `east`, `north` (m from the site), Earth-fixed. */
  function ground(east: number, north: number) {
    const frame = source!.frame;
    const p = vec3.vec3(
      frame[12]! + east * frame[0]! + north * frame[4]!,
      frame[13]! + east * frame[1]! + north * frame[5]!,
      frame[14]! + east * frame[2]! + north * frame[6]!,
    );
    const c = ellipsoid.cartesianToCartographic(p, cartographic())!;
    c.height =
      viewer.globe?.surfaceHeight(c.longitude, c.latitude) ?? SITE.height;
    return ellipsoid.cartographicToCartesian(c, p);
  }

  /** Where the followed vehicle is shown now (as points.slang moves it). */
  function followShown(): number[] | undefined {
    if (!follow || !source || follow.p1.length === 0) {
      return undefined;
    }
    const delay = Math.max(source.delay, 1e-6);
    const a = Math.min(
      1,
      Math.max(0, (engine.time - delay - (follow.t1 - delay)) / delay),
    );
    const [x0, y0, , h0] = follow.p0 as [number, number, number, number];
    const [x1, y1, , h1] = follow.p1 as [number, number, number, number];
    const turn = h1 - h0 - 360 * Math.round((h1 - h0) / 360);
    return [x0 + (x1 - x0) * a, y0 + (y1 - y0) * a, 0, h0 + turn * a];
  }

  function chase() {
    if (!follow) {
      return;
    }
    if (viewer.controller.inputs !== follow.inputs) {
      follow = undefined;
      return;
    }
    const shown = followShown();
    if (shown) {
      viewer.view.camera.lookAt(
        ground(shown[0]!, shown[1]!),
        (shown[3]! * Math.PI) / 180,
        -0.25,
        22,
      );
    }
  }

  /**
   * The whole area, around the site at its height: the same place whether
   * or not terrain has loaded, so the first frames show it and nothing
   * moves once the vehicles arrive.
   */
  function overview() {
    follow = undefined;
    viewer.zoomTo({
      center: origin,
      radius: ((settings.area * 1000) / 2) * 0.9,
    });
  }

  // ------------------------------------------------------------ the panel
  const el = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    props: Record<string, unknown> = {},
    ...children: Array<Node | string>
  ): HTMLElementTagNameMap[K] => {
    const e = Object.assign(document.createElement(tag), props);
    e.append(...children);
    return e;
  };
  const choice = (
    label: string,
    values: number[],
    format: (v: number) => string,
    get: () => number,
    set: (v: number) => void,
  ) => {
    const select = el(
      "select",
      { onchange: () => set(Number(select.value)) },
      ...values.map((v) =>
        el("option", { value: String(v), selected: v === get() }, format(v)),
      ),
    );
    return el("label", {}, label, select);
  };
  const slider = (
    label: string,
    range: { min: number; max: number; step: number },
    get: () => number,
    set: (v: number) => void,
    unit = "",
  ) => {
    const value = el("output", {}, `${get()}${unit}`);
    const input = el("input", {
      type: "range",
      min: String(range.min),
      max: String(range.max),
      step: String(range.step),
      value: String(get()),
      oninput: () => {
        set(Number(input.value));
        value.textContent = `${input.value}${unit}`;
      },
    });
    refreshers.push(() => {
      input.value = String(get());
      value.textContent = `${get()}${unit}`;
    });
    return el("label", { className: "slider" }, label, input, value);
  };
  const sendConfig = () =>
    feed.postMessage({
      type: "config",
      rate: settings.rate,
      speed: settings.speed,
      turning: settings.turning,
      paused: settings.paused,
    });
  const heading = (text: string) => el("h3", {}, text);

  // The style's parameters, as the style declares them.
  const styleControls: HTMLElement[] = [];
  for (const [name, p] of Object.entries(STYLE.parameters ?? {})) {
    const current = () => parameterValues.get(name) ?? p.default;
    if (p.options) {
      const options = p.options.map((o) =>
        typeof o === "object" ? o : { label: String(o), value: o },
      );
      const select = el(
        "select",
        { onchange: () => setParameter(name, Number(select.value)) },
        ...options.map((o) =>
          el(
            "option",
            { value: String(o.value), selected: o.value === current() },
            o.label ?? String(o.value),
          ),
        ),
      );
      styleControls.push(el("label", {}, p.label ?? name, select));
    } else if (typeof p.default === "boolean") {
      const box = el("input", {
        type: "checkbox",
        checked: Boolean(current()),
        onchange: () => setParameter(name, box.checked),
      });
      styleControls.push(el("label", {}, p.label ?? name, box));
    } else {
      styleControls.push(
        slider(
          p.label ?? name,
          { min: p.min ?? 0, max: p.max ?? 100, step: p.step ?? 1 },
          () => Number(current()),
          (v) => setParameter(name, v),
        ),
      );
    }
  }

  const readouts = el("dl");
  const readout = (term: string) => {
    const value = el("dd");
    readouts.append(el("dt", {}, term), value);
    return value;
  };
  const feedOut = readout("Feed");
  const latencyOut = readout("Each vehicle");
  const updateOut = readout("Update");
  const fxaa = el("input", {
    type: "checkbox",
    checked: viewer.view.fxaa,
    onchange: () => {
      viewer.view.fxaa = fxaa.checked;
    },
  });
  const pause = el("input", {
    type: "checkbox",
    onchange: () => {
      settings.paused = pause.checked;
      sendConfig();
    },
  });

  panel.append(
    heading("Scene"),
    choice(
      "Vehicles",
      COUNTS,
      (v) => v.toLocaleString(),
      () => settings.count,
      (v) => {
        settings.count = v;
        void build();
      },
    ),
    choice(
      "Area across",
      AREAS,
      (v) => `${v} km`,
      () => settings.area,
      (v) => {
        settings.area = v;
        void build();
      },
    ),
    heading("Feed"),
    choice(
      "Updates a second",
      RATES,
      (v) => `${v}`,
      () => settings.rate,
      (v) => {
        settings.rate = v;
        sendConfig();
      },
    ),
    slider(
      "Speed",
      { min: 0, max: 60, step: 1 },
      () => settings.speed,
      (v) => {
        settings.speed = v;
        sendConfig();
      },
      " m/s",
    ),
    slider(
      "Turning",
      { min: 0, max: 90, step: 1 },
      () => settings.turning,
      (v) => {
        settings.turning = v;
        sendConfig();
      },
      "°/s",
    ),
    el("label", {}, "Paused", pause),
    heading("Style"),
    ...styleControls,
    // FXAA after tonemapping, on top of 4× MSAA.
    el("label", {}, "FXAA", fxaa),
    el(
      "div",
      { className: "buttons" },
      el(
        "button",
        {
          type: "button",
          onclick: () => {
            if (source?.count) {
              follow = {
                vehicle: Math.floor(Math.random() * source.count),
                inputs: viewer.controller.inputs,
                p0: [],
                p1: [],
                t1: 0,
              };
            }
          },
        },
        "Follow a vehicle",
      ),
      el("button", { type: "button", onclick: overview }, "Overview"),
    ),
    readouts,
    el(
      "p",
      {},
      "Moving the camera stops following; a followed vehicle shows once its next report arrives.",
    ),
  );

  let raf = requestAnimationFrame(function tick() {
    chase();
    raf = requestAnimationFrame(tick);
  });
  const readoutTimer = setInterval(() => {
    const now = performance.now();
    const perSecond = (stats.records * 1000) / (now - stats.since);
    stats.records = 0;
    stats.since = now;
    feedOut.textContent = settings.paused
      ? "paused"
      : `${Math.round(perSecond).toLocaleString()} records/s at ${settings.rate} Hz`;
    latencyOut.textContent = stats.interval
      ? `reported every ${stats.interval.toFixed(1)} s, shown that far behind`
      : "–";
    updateOut.textContent = `${stats.updateMs.toFixed(2)} ms a slice of ${stats.per.toLocaleString()}`;
  }, 500);

  // Framed first: the truck model and the style take seconds to load.
  overview();
  await build();

  return () => {
    building++;
    feed.postMessage({ type: "stop" });
    feed.terminate();
    clearInterval(readoutTimer);
    cancelAnimationFrame(raf);
    layer?.destroy();
    source?.destroy();
    engine.renderMode = renderMode;
    panel.replaceChildren();
  };
}
