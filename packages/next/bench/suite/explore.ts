import publicCatalog from "./catalog/public.json";
import type {
  Dataset,
  EngineConfig,
  Pose,
  RenderSettings,
  Scenario,
  Scene,
} from "./schema.ts";
import { Ellipsoid } from "../../src/index.ts";
import {
  type Adapter,
  cameraScript,
  LegacyAdapter,
  NextAdapter,
  type RunSpec,
  sunDirection,
} from "./suite.ts";

/**
 * Dyno's explorer (plan §16.9, Explore): a catalog scene live in one or
 * two engine configurations side by side, for looking, not measuring (the
 * engines share one GPU and main thread).
 *
 * - Camera path: both cameras on the scene's benchmark camera path; scrub
 *   it or play it.
 * - Free flight: fly either engine with the mouse (1.x's camera controls,
 *   2.0's GlobeController); with "Link cameras" the other follows.
 * - Pause streaming: keep what is selected and loaded now and fly around
 *   it (1.x `debugFreezeFrame`, 2.0 `Tileset3D.freezeSelection`).
 *
 * State lives in Dyno's URL (scene, left, right, t, cesium), so a report
 * can link to a place on a scene's camera path.
 */

// CesiumJS 1.x, a page global, injected on demand.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped global
declare const Cesium: any;

const catalog = publicCatalog as unknown as {
  datasets: Dataset[];
  scenes: Scene[];
  scenarios: Scenario[];
  configs: EngineConfig[];
  render?: RenderSettings;
};

/** Categorical slots 1 and 2 (dark surface), as in the reports. */
const COLORS = ["#3987e5", "#d95926"];
export const EXPLORE_KEYS = ["scene", "left", "right", "t", "cesium"];

/**
 * A configuration by id: the catalog's, or a released 1.x build named the
 * way runs name it ("1.x@1.146.0"), so reports can link here.
 */
function configById(id: string): EngineConfig | undefined {
  const found = catalog.configs.find((c) => c.id === id);
  const release = /^1\.x@(\d+\.\d+\.\d+)$/.exec(id);
  if (found || !release) {
    return found;
  }
  const config: EngineConfig = {
    ...catalog.configs.find((c) => c.engine === "1.x")!,
    id,
    cesium: release[1]!,
  };
  catalog.configs.push(config);
  return config;
}

/** The 1.x build a configuration needs: "repo" or an exact version. */
const buildOf = (config: EngineConfig | undefined) =>
  config?.engine === "1.x" ? (config.cesium ?? "repo") : undefined;

/** The 1.x build in this page, if any (a global: one per page). */
let cesiumBuild: string | undefined;

/** Loads a 1.x build once; false when another build is already loaded. */
async function ensureCesium(build: string): Promise<boolean> {
  if (cesiumBuild !== undefined) {
    return cesiumBuild === build;
  }
  const base =
    build === "repo"
      ? "/cesium1x/"
      : `/cesium-release/${build}/package/Build/Cesium/`;
  (globalThis as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = base;
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = `${base}Widgets/widgets.css`;
  document.head.append(css);
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${base}Cesium.js`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`CesiumJS ${build}: not found`));
    document.head.append(script);
  });
  cesiumBuild = build;
  return true;
}

interface Pane {
  config: EngineConfig;
  adapter: Adapter;
  element: HTMLElement;
  hud: HTMLElement;
  color: string;
  cpu: number;
  gpu: number | undefined;
}

const TEMPLATE = `
<div class="explorer">
  <div class="controls">
    <label>Scene <select data-id="scene"></select></label>
    <label>Left <select data-id="left"></select></label>
    <label>Right <select data-id="right"></select></label>
    <button data-id="load">Load</button>
    <span class="status" data-id="status"></span>
  </div>
  <div class="controls">
    <div class="segmented" role="radiogroup" aria-label="Camera">
      <button data-mode="path" role="radio">Camera path</button>
      <button data-mode="free" role="radio">Free flight</button>
    </div>
    <label class="check"><input type="checkbox" data-id="link" checked> Link cameras</label>
    <label class="check"><input type="checkbox" data-id="pause"> Pause streaming</label>
    <label class="check"><input type="checkbox" data-id="colorize"> Color tiles by depth</label>
    <button data-id="measure" title="The command that measures this scene with these engines">Measure this…</button>
    <button data-id="toPath">Back to the path</button>
    <span class="readout" data-id="readout"></span>
  </div>
  <div class="scrub" data-id="scrub">
    <button data-id="play" aria-label="Play or pause the camera path">▶ Play</button>
    <input data-id="progress" type="range" min="0" max="1000" value="0" aria-label="Camera path progress">
    <output data-id="progressLabel">0%</output>
    <label>Speed <select data-id="speed">
      <option value="0.25">¼×</option><option value="0.5">½×</option>
      <option value="1" selected>1×</option><option value="2">2×</option>
    </select></label>
  </div>
  <div class="panes" data-id="panes"></div>
  <p class="hint" data-id="hint"></p>
  <div class="measure" data-id="measureBox" hidden>
    <p>Measure this scene properly (each engine alone, cold cache, repetitions, conditions recorded):</p>
    <pre><code data-id="command"></code></pre>
    <button data-id="copyCommand">Copy</button>
  </div>
  <div id="credits" class="credits"></div>
</div>`;

/**
 * Mounts the explorer in `root`. `state` holds the URL's keys;
 * `onState` gets them back when they change; `reload` is called when a
 * different 1.x build is needed (a page loads one). Returns a function
 * that stops it.
 */
export function mountExplorer(
  root: HTMLElement,
  state: URLSearchParams,
  onState: (params: Record<string, string>) => void,
  reload: (params: Record<string, string>) => void,
): () => void {
  root.innerHTML = TEMPLATE;
  const $ = <T extends Element>(id: string) =>
    root.querySelector<T>(`[data-id="${id}"]`)!;
  const sceneSelect = $<HTMLSelectElement>("scene");
  const leftSelect = $<HTMLSelectElement>("left");
  const rightSelect = $<HTMLSelectElement>("right");
  const progressInput = $<HTMLInputElement>("progress");
  const progressLabel = $<HTMLOutputElement>("progressLabel");
  const playButton = $<HTMLButtonElement>("play");
  const speedSelect = $<HTMLSelectElement>("speed");
  const status = $<HTMLElement>("status");
  const link = $<HTMLInputElement>("link");
  const pause = $<HTMLInputElement>("pause");
  const colorize = $<HTMLInputElement>("colorize");
  const readout = $<HTMLElement>("readout");
  const hint = $<HTMLElement>("hint");

  for (const key of ["left", "right"]) {
    const id = state.get(key);
    if (id) {
      configById(id);
    }
  }
  for (const scene of catalog.scenes) {
    sceneSelect.add(new Option(`${scene.group} · ${scene.title}`, scene.id));
  }
  for (const select of [leftSelect, rightSelect]) {
    if (select === rightSelect) {
      select.add(new Option("none", ""));
    }
    for (const config of catalog.configs) {
      select.add(new Option(config.id, config.id));
    }
  }
  sceneSelect.value = state.get("scene") ?? catalog.scenes[0]!.id;
  leftSelect.value =
    state.get("left") ?? catalog.configs.find((c) => c.engine === "1.x")!.id;
  rightSelect.value =
    state.get("right") ?? catalog.configs.find((c) => c.engine === "2.0")!.id;
  progressInput.value = String(Math.round(Number(state.get("t") ?? 0) * 1000));

  let panes: Pane[] = [];
  let pose: ((progress: number) => Pose) | undefined;
  let mode: "path" | "free" = "path";
  let leader: Pane | undefined;
  let playing = false;
  let duration = 15;
  let generation = 0;
  let stopped = false;
  /** The scene on screen (a different one starts at the path's start). */
  let loadedScene = state.get("scene") ?? undefined;

  const progress = () => Number(progressInput.value) / 1000;
  const params = (): Record<string, string> => {
    const out: Record<string, string> = {
      scene: sceneSelect.value,
      left: leftSelect.value,
      t: progress().toFixed(3),
    };
    if (rightSelect.value) {
      out.right = rightSelect.value;
    }
    const build = [leftSelect.value, rightSelect.value]
      .map((id) => buildOf(configById(id)))
      .find((b) => b && b !== "repo");
    if (build) {
      out.cesium = build;
    }
    return out;
  };

  const setMode = (next: "path" | "free") => {
    mode = next;
    for (const b of root.querySelectorAll<HTMLButtonElement>("[data-mode]")) {
      b.setAttribute("aria-checked", String(b.dataset.mode === mode));
    }
    $<HTMLElement>("scrub").hidden = mode !== "path";
    $<HTMLElement>("toPath").hidden = mode !== "free";
    link.parentElement!.hidden = mode !== "free" || panes.length < 2;
    for (const pane of panes) {
      pane.adapter.setInteractive(mode === "free");
    }
    if (mode === "free") {
      playing = false;
      playButton.textContent = "▶ Play";
    }
    hint.textContent =
      mode === "free"
        ? "Drag to rotate the globe, wheel or right-drag to zoom, middle- or ctrl-drag to tilt, shift-drag to look around. The engine you touch leads when cameras are linked."
        : "Both cameras follow the scene's benchmark camera path. Switch to free flight to fly around and inspect.";
  };

  const leadWith = (pane: Pane) => () => {
    leader = pane;
  };

  async function load(): Promise<void> {
    const scene = catalog.scenes.find((s) => s.id === sceneSelect.value)!;
    const configs = [leftSelect.value, rightSelect.value]
      .filter(Boolean)
      .map((id) => configById(id)!);
    const builds = new Set(configs.map(buildOf).filter(Boolean));
    if (builds.size > 1) {
      status.textContent = "Pick at most one 1.x build (a page loads one).";
      status.className = "status error";
      return;
    }
    const wanted = [...builds][0] as string | undefined;
    if (wanted && !(await ensureCesium(wanted))) {
      reload(params());
      return;
    }
    if (scene.id !== loadedScene) {
      loadedScene = scene.id;
      progressInput.value = "0";
      playing = false;
      playButton.textContent = "▶ Play";
    }
    const mine = ++generation;
    for (const pane of panes) {
      pane.adapter.destroy();
    }
    panes = [];
    leader = undefined;
    pause.checked = false;
    colorize.checked = false;
    const container = $<HTMLElement>("panes");
    container.replaceChildren();
    root.querySelector("#credits")!.replaceChildren();
    status.className = "status";
    status.textContent = "loading…";
    const ids = new Set([
      ...(typeof scene.globe === "object" ? [scene.globe.terrain] : []),
      ...(scene.imagery ? [scene.imagery] : []),
      ...scene.layers.map((l) => l.dataset),
    ]);
    const scenario = catalog.scenarios[0]!;
    duration = scenario.motionSeconds;
    const base = {
      scene,
      datasets: catalog.datasets.filter((d) => ids.has(d.id)),
      scenario,
      // The benchmark's render settings, so what you see is what runs.
      ...(catalog.render ? { render: catalog.render } : {}),
    };
    try {
      pose = await cameraScript({ ...base, config: configs[0]! } as RunSpec);
      for (const [i, config] of configs.entries()) {
        const element = document.createElement("div");
        element.className = "pane";
        const view = document.createElement("div");
        view.className = "view";
        const hud = document.createElement("div");
        hud.className = "hud";
        element.append(view, hud);
        container.append(element);
        const adapter: Adapter =
          config.engine === "1.x" ? new LegacyAdapter() : new NextAdapter();
        await adapter.setup(view, { ...base, config });
        adapter.setSun(sunDirection({ ...base, config } as RunSpec, pose(0)));
        if (mine !== generation || stopped) {
          adapter.destroy();
          return;
        }
        adapter.setCamera(pose(progress()));
        const pane: Pane = {
          config,
          adapter,
          element,
          hud,
          color: COLORS[i]!,
          cpu: 0,
          gpu: undefined,
        };
        // The engine under the pointer leads linked cameras.
        for (const type of ["pointerdown", "wheel"]) {
          element.addEventListener(type, leadWith(pane), {
            capture: true,
            passive: true,
          });
        }
        panes.push(pane);
      }
      setMode(mode);
      status.textContent = "";
      onState(params());
    } catch (e) {
      status.textContent = String(e);
      status.className = "status error";
    }
  }

  const cartographic = { longitude: 0, latitude: 0, height: 0 };
  let last = performance.now();
  let interval = 16.7;
  let frameRequest = 0;
  function tick(now: number): void {
    const dt = now - last;
    last = now;
    interval += (dt - interval) * 0.1;
    if (mode === "path" && playing) {
      let t = progress() + (dt / 1000 / duration) * Number(speedSelect.value);
      if (t >= 1) {
        t = 0;
      }
      progressInput.value = String(Math.round(t * 1000));
    }
    progressLabel.value = `${(progress() * 100).toFixed(1)}%`;
    if (pose && panes.length) {
      if (mode === "path") {
        const p = pose(progress());
        for (const pane of panes) {
          pane.adapter.setCamera(p);
        }
      } else if (link.checked && leader) {
        const p = leader.adapter.getCamera();
        for (const pane of panes) {
          if (pane !== leader) {
            pane.adapter.setCamera(p);
          }
        }
      }
      for (const pane of panes) {
        const cpu = pane.adapter.frame();
        pane.cpu += (cpu - pane.cpu) * 0.1;
        const gpu = pane.adapter.gpuMs();
        if (gpu !== undefined) {
          pane.gpu =
            pane.gpu === undefined ? gpu : pane.gpu + (gpu - pane.gpu) * 0.1;
        }
        hud(pane);
      }
      const camera = (leader ?? panes[0]!).adapter.getCamera();
      const c = Ellipsoid.WGS84.cartesianToCartographic(
        Float64Array.from(camera.position),
        cartographic,
      );
      readout.textContent = c
        ? `camera ${((c.longitude * 180) / Math.PI).toFixed(5)}°, ${((c.latitude * 180) / Math.PI).toFixed(5)}°, ${c.height.toFixed(0)} m`
        : "";
    }
    if (!stopped) {
      frameRequest = requestAnimationFrame(tick);
    }
  }

  function hud(pane: Pane): void {
    const version =
      pane.config.engine === "1.x" ? ` · CesiumJS ${Cesium.VERSION}` : "";
    const stats = pane.adapter.stats();
    const key = document.createElement("span");
    key.className = "key";
    key.style.background = pane.color;
    const name = document.createElement("b");
    name.textContent = `${pane.config.id}${version}`;
    const lines = document.createTextNode(
      `\nCPU / frame  ${pane.cpu.toFixed(2)} ms` +
        `\nGPU / frame  ${pane.gpu === undefined ? "not exposed" : `${pane.gpu.toFixed(2)} ms`}` +
        `\nframe        ${interval.toFixed(1)} ms (shared)` +
        `\ntiles        ${stats.selected} drawn · ${stats.loading} loading` +
        `\n             ${stats.note}` +
        `\n${pause.checked ? "streaming paused" : pane.adapter.settled() ? "settled" : "loading…"}`,
    );
    pane.hud.replaceChildren(key, name, lines);
  }

  playButton.addEventListener("click", () => {
    playing = !playing;
    playButton.textContent = playing ? "❚❚ Pause" : "▶ Play";
    if (!playing) {
      onState(params());
    }
  });
  progressInput.addEventListener("input", () => {
    playing = false;
    playButton.textContent = "▶ Play";
  });
  progressInput.addEventListener("change", () => onState(params()));
  for (const b of root.querySelectorAll<HTMLButtonElement>("[data-mode]")) {
    b.addEventListener("click", () =>
      setMode(b.dataset.mode as "path" | "free"),
    );
  }
  $("toPath").addEventListener("click", () => setMode("path"));
  pause.addEventListener("change", () => {
    for (const pane of panes) {
      pane.adapter.setStreamingPaused(pause.checked);
    }
  });
  colorize.addEventListener("change", () => {
    for (const pane of panes) {
      pane.adapter.setColorizeTiles(colorize.checked);
    }
  });
  $("measure").addEventListener("click", () => {
    const box = $<HTMLElement>("measureBox");
    const ids = [leftSelect.value, rightSelect.value]
      .filter(Boolean)
      .map((id) =>
        catalog.configs.some((c) => c.id === id && !/@/.test(id))
          ? id
          : id.startsWith("1.x@")
            ? "1.x-release"
            : id,
      );
    const release = [leftSelect.value, rightSelect.value].find((id) =>
      id.startsWith("1.x@"),
    );
    $("command").textContent =
      `node packages/next/bench/suite/cli.mjs run --scenes ${sceneSelect.value} --configs ${[...new Set(ids)].join(",")}${release ? ` --cesium ${release.slice(4)}` : ""} --reps 3 --note "explorer: ${sceneSelect.value}"`;
    box.hidden = !box.hidden;
  });
  $("copyCommand").addEventListener("click", () => {
    void navigator.clipboard?.writeText($("command").textContent ?? "");
  });
  $("load").addEventListener("click", () => void load());

  setMode("path");
  frameRequest = requestAnimationFrame(tick);
  void load();
  return () => {
    stopped = true;
    generation++;
    cancelAnimationFrame(frameRequest);
    for (const pane of panes) {
      pane.adapter.destroy();
    }
    panes = [];
  };
}
