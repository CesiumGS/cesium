import {
  CustomShader,
  DAYLIGHT_SUN_ILLUMINANCE,
  DEFAULT_SKY,
  Ellipsoid,
  eastNorthUpToFixedFrame,
  fromDegrees,
  mat4,
  vec3,
  type GltfAsset,
  type MeshData,
  type ModelInstance,
  type SkyOptions,
} from "../../src/index.ts";
import type { GlobeKind } from "../../widgets/index.ts";
import type { ExampleContext } from "../types.ts";
import { createContractView, createSlangEditor } from "./editor.ts";
import { CONTRACT, SlangLanguageServer } from "./languageServer.ts";
import { FIRST_PRESET, PRESETS } from "./presets.ts";
import { plane, sphere } from "./shapes.ts";

/**
 * The Slang playground, a small lookdev tool: custom shader stages written
 * in Slang, compiled in the page as you type (the Slang WebAssembly build,
 * in a worker: `CustomShader.fromSlang`) and drawn on a model on a stage
 * of its own: no globe by default, a background color, studio light from
 * a procedural environment, orbit controls around the model.
 *
 * A shader imports the `cesium` module (the custom shader contract,
 * src/shaders/cesium.slang) and defines `vertexMain`, `fragmentMain` or
 * both. `fsInput.time` and `vsInput.time` are seconds since the engine
 * started, so the view renders continuously while this example is open.
 * The editor is CodeMirror with the Slang language server (completion,
 * hover, diagnostics as you type); compiling keeps the last shader that
 * compiled, so an error leaves the model drawing the last good one.
 */

/** Where the stage stands: a field outside Philadelphia. */
const SITE = { longitude: -75.1652, latitude: 39.9526 };
const SLANG_URL = "/slang-wasm/slang-wasm.js";
const SPECS = "/specs-data/Models/glTF-2.0/";
const KHRONOS =
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/";
const DEG = Math.PI / 180;

type Target =
  | { kind: "shape"; mesh: () => MeshData; scale: number }
  | { kind: "url"; url: string };

/** The models, by group; Khronos's load from GitHub when chosen. */
const MODELS: Array<[group: string, items: Array<[string, Target]>]> = [
  [
    "Shapes",
    [
      ["Sphere", { kind: "shape", mesh: () => sphere(), scale: 1 }],
      ["Plane", { kind: "shape", mesh: () => plane(), scale: 2 }],
      [
        "Torus",
        { kind: "url", url: `${SPECS}TorusQuantized/glTF/TorusQuantized.gltf` },
      ],
      [
        "Box",
        { kind: "url", url: `${SPECS}BoxTextured/glTF/BoxTextured.gltf` },
      ],
    ],
  ],
  [
    "Repository samples",
    [
      [
        "Milk truck",
        {
          kind: "url",
          url: `${SPECS}CesiumMilkTruck/glTF-Draco/CesiumMilkTruck.gltf`,
        },
      ],
      ["Boom box", { kind: "url", url: `${SPECS}BoomBox/glTF/BoomBox.gltf` }],
      [
        "Cesium Man",
        { kind: "url", url: `${SPECS}CesiumMan/glTF/CesiumMan.gltf` },
      ],
      ["Duck", { kind: "url", url: `${SPECS}Duck/glTF-Draco/Duck.gltf` }],
      [
        "Buildings (features)",
        {
          kind: "url",
          url: `${SPECS}BuildingsMetadata/glTF/buildings-metadata.gltf`,
        },
      ],
      [
        "Clearcoat box",
        { kind: "url", url: `${SPECS}BoxClearcoat/glTF/BoxClearcoat.gltf` },
      ],
    ],
  ],
  [
    "Khronos samples (from GitHub)",
    [
      [
        "Damaged helmet",
        {
          kind: "url",
          url: `${KHRONOS}DamagedHelmet/glTF-Binary/DamagedHelmet.glb`,
        },
      ],
      [
        "Flight helmet",
        { kind: "url", url: `${KHRONOS}FlightHelmet/glTF/FlightHelmet.gltf` },
      ],
      [
        "Water bottle",
        {
          kind: "url",
          url: `${KHRONOS}WaterBottle/glTF-Binary/WaterBottle.glb`,
        },
      ],
      [
        "Lantern",
        { kind: "url", url: `${KHRONOS}Lantern/glTF-Binary/Lantern.glb` },
      ],
      [
        "Sci-fi helmet",
        { kind: "url", url: `${KHRONOS}SciFiHelmet/glTF/SciFiHelmet.gltf` },
      ],
    ],
  ],
];

/** Environment light (a procedural sky, cd/m²) for lookdev. */
const ENVIRONMENTS: Record<string, SkyOptions | "atmosphere"> = {
  Studio: {
    zenith: [9000, 9000, 9000],
    horizon: [6500, 6500, 6500],
    ground: [1500, 1500, 1500],
  },
  Sunset: {
    zenith: [1500, 2200, 4200],
    horizon: [9000, 5200, 2600],
    ground: [700, 550, 450],
  },
  Overcast: {
    zenith: [6000, 6100, 6300],
    horizon: [5200, 5300, 5500],
    ground: [1800, 1800, 1800],
  },
  Dark: {
    zenith: [600, 600, 700],
    horizon: [400, 400, 450],
    ground: [120, 120, 120],
  },
  "Sky (atmosphere)": "atmosphere",
};

const BACKGROUNDS: Record<string, string | "atmosphere"> = {
  Charcoal: "#24262b",
  Black: "#000000",
  Grey: "#7a7d84",
  White: "#f2f2f2",
  "Sky (atmosphere)": "atmosphere",
};

const SUNS: Record<string, number | "atmosphere"> = {
  "Key light": DAYLIGHT_SUN_ILLUMINANCE,
  "Soft key": DAYLIGHT_SUN_ILLUMINANCE * 0.25,
  Off: 0,
  "Time of day (atmosphere)": "atmosphere",
};

const GLOBES: Record<string, GlobeKind> = {
  Off: false,
  Ellipsoid: "ellipsoid",
  Terrain: "terrain",
};

const STORAGE = "dyno.slangPlayground";

export async function run({ viewer, panel, signal }: ExampleContext) {
  const { engine, world, view } = viewer;
  const ellipsoid = Ellipsoid.WGS84;

  // What this example changes, restored when it's left.
  const restore = {
    renderMode: engine.renderMode,
    background: view.background,
    clearColor: view.clearColor,
    lighting: { ...view.lighting },
    controls: viewer.controls,
  };
  // Shaders animate with `time`: render every frame while open.
  engine.renderMode = "continuous";
  viewer.setControls("orbit");

  const el = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    props: Record<string, unknown> = {},
    ...children: Array<Node | string>
  ): HTMLElementTagNameMap[K] => {
    const e = Object.assign(document.createElement(tag), props);
    e.append(...children);
    return e;
  };
  const select = (
    options: string[] | Array<[group: string, names: string[]]>,
    value: string,
    onChange: (v: string) => void,
  ) => {
    const s = el("select", { onchange: () => onChange(s.value) });
    for (const o of options) {
      if (typeof o === "string") {
        s.append(el("option", { value: o, selected: o === value }, o));
      } else {
        s.append(
          el(
            "optgroup",
            { label: o[0] },
            ...o[1].map((n) =>
              el("option", { value: n, selected: n === value }, n),
            ),
          ),
        );
      }
    }
    return s;
  };
  const read = (key: string): string | undefined => {
    try {
      return localStorage.getItem(`${STORAGE}.${key}`) ?? undefined;
    } catch {
      return undefined;
    }
  };
  const write = (key: string, value: string) => {
    try {
      localStorage.setItem(`${STORAGE}.${key}`, value);
    } catch {
      // Not kept: this visit only.
    }
  };
  const pick = <T>(table: Record<string, T>, key: string, fallback: string) =>
    key in table ? key : fallback;

  // ------------------------------------------------------------ the stage
  const settings = {
    globe: pick(GLOBES, read("globe") ?? "Off", "Off"),
    background: pick(BACKGROUNDS, read("background") ?? "Charcoal", "Charcoal"),
    environment: pick(ENVIRONMENTS, read("environment") ?? "Studio", "Studio"),
    sun: pick(SUNS, read("sun") ?? "Key light", "Key light"),
    turntable: read("turntable") === "1",
  };
  const applyStage = async () => {
    await viewer.setGlobe(GLOBES[settings.globe]!);
    const background = BACKGROUNDS[settings.background]!;
    if (background === "atmosphere") {
      view.background = "atmosphere";
    } else {
      view.background = "color";
      view.clearColor = srgbToLinear(background);
    }
    const environment = ENVIRONMENTS[settings.environment]!;
    if (environment === "atmosphere") {
      view.lighting.environment = "atmosphere";
    } else {
      view.lighting.environment = "procedural";
      engine.environment.setSky(environment);
    }
    view.lighting.sunIlluminance = SUNS[settings.sun]!;
    engine.requestRender();
  };

  // ------------------------------------------------------------ the model
  const targets = new Map(MODELS.flatMap(([, items]) => items));
  let modelName = read("model") ?? "Sphere";
  if (!targets.has(modelName)) {
    modelName = "Sphere";
  }
  let customUrl: string | undefined;
  const origin = ellipsoid.cartographicToCartesian(
    fromDegrees(SITE.longitude, SITE.latitude, 0),
    vec3.vec3(),
  );
  const frame = eastNorthUpToFixedFrame(origin, ellipsoid, mat4.mat4());
  let spin = 0;

  /** What's on the stage: a placed glTF, or a shape's draw. */
  let placed:
    | { kind: "model"; instance: ModelInstance }
    | {
        kind: "shape";
        mesh: ReturnType<typeof world.addMesh>;
        material: number;
        transform: ReturnType<typeof world.addTransform>;
        draw: ReturnType<typeof world.addDraw>;
        radius: number;
      }
    | undefined;
  const assets = new Map<string, Promise<GltfAsset>>();
  const shapes = new Map<string, MeshData>();

  /** The stage's matrix: standing at the site, turned by the turntable. */
  const stageMatrix = (lift: number) => {
    const turn = mat4.mat4();
    const c = Math.cos(spin);
    const s = Math.sin(spin);
    turn[0] = c;
    turn[1] = s;
    turn[4] = -s;
    turn[5] = c;
    turn[14] = lift;
    return mat4.multiply(mat4.mat4(), frame, turn);
  };

  const removePlaced = () => {
    if (placed?.kind === "model") {
      viewer.remove(placed.instance);
    } else if (placed?.kind === "shape") {
      world.removeDraw(placed.draw);
      world.removeTransform(placed.transform);
      world.removeMaterial(placed.material);
      world.removeMesh(placed.mesh);
    }
    placed = undefined;
  };

  const focus = () => {
    if (placed?.kind === "model") {
      viewer.zoomTo(placed.instance, 35 * DEG, -20 * DEG);
    } else if (placed?.kind === "shape") {
      const m = stageMatrix(placed.radius);
      const center = vec3.vec3(m[12], m[13], m[14]);
      viewer.zoomTo(
        { center, radius: placed.radius * 1.2 },
        35 * DEG,
        -20 * DEG,
      );
    }
  };

  /** Places the current model with the current shader (uploads cached). */
  let placing = Promise.resolve();
  let framedFor: string | undefined;
  const place = () =>
    (placing = placing
      .then(async () => {
        const target: Target | undefined =
          customUrl !== undefined
            ? { kind: "url", url: customUrl }
            : targets.get(modelName);
        if (!target || signal.aborted) {
          return;
        }
        const key = customUrl ?? modelName;
        status.model.textContent = "";
        if (target.kind === "shape") {
          let data = shapes.get(modelName);
          if (!data) {
            data = target.mesh();
            shapes.set(modelName, data);
          }
          removePlaced();
          const mesh = world.addMesh(data);
          const material = world.addMaterial({
            baseColor: [0.8, 0.8, 0.8, 1],
            metallic: 0,
            roughness: 0.45,
          });
          const radius = target.scale;
          const transform = world.addTransform(stageMatrix(radius));
          const draw = world.addDraw({
            mesh,
            transform,
            material,
            doubleSided: modelName === "Plane",
            ...(shader ? { shader } : {}),
          });
          placed = { kind: "shape", mesh, material, transform, draw, radius };
        } else {
          let asset = assets.get(target.url);
          if (!asset) {
            asset = engine.loadGltf(target.url);
            assets.set(target.url, asset);
          }
          const loaded = await asset;
          if (signal.aborted) {
            return;
          }
          removePlaced();
          const instance = await viewer.addModel(loaded, {
            modelMatrix: stageMatrix(0),
            ...(shader ? { shader } : {}),
          });
          placed = { kind: "model", instance };
        }
        if (framedFor !== key) {
          framedFor = key;
          focus();
        }
      })
      .catch((e: unknown) => {
        status.model.textContent = `Could not load the model: ${e instanceof Error ? e.message : String(e)}`;
      }));

  // Turntable: the model turns about its up axis, 20° a second.
  let last = performance.now();
  let raf = requestAnimationFrame(function turn(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (settings.turntable && placed) {
      spin += dt * 20 * DEG;
      if (placed.kind === "model") {
        world.setTransform(placed.instance.transform, stageMatrix(0));
      } else {
        world.setTransform(placed.transform, stageMatrix(placed.radius));
      }
    }
    raf = requestAnimationFrame(turn);
  });

  // ------------------------------------------------------------ the panel
  const served = await fetch(SLANG_URL, { method: "HEAD" })
    .then(
      (r) =>
        r.ok && !(r.headers.get("content-type") ?? "").includes("text/html"),
    )
    .catch(() => false);
  const server = served ? new SlangLanguageServer(SLANG_URL) : undefined;

  const status = { compile: el("span", {}), model: el("span", {}) };
  const wgsl = el("pre", { className: "slang-wgsl" });
  const urlInput = el("input", {
    type: "url",
    placeholder: "https://…/model.glb (CORS-enabled glTF or glb)",
  });
  const fileInput = el("input", {
    type: "file",
    accept: ".glb,model/gltf-binary",
  });
  fileInput.hidden = true;
  fileInput.onchange = () => {
    const file = fileInput.files?.[0];
    if (file) {
      // A glb is self-contained; a .gltf's other files can't come along.
      customUrl = URL.createObjectURL(file);
      void place();
    }
  };
  const presetGroups: Array<[string, string[]]> = [];
  for (const p of PRESETS) {
    let group = presetGroups.find(([g]) => g === p.group);
    if (!group) {
      group = [p.group, []];
      presetGroups.push(group);
    }
    group[1].push(p.name);
  }
  const firstPreset = read("preset") ?? FIRST_PRESET;
  const presetSelect = select(presetGroups, firstPreset, (name) => {
    const preset = PRESETS.find((p) => p.name === name);
    if (preset) {
      write("preset", name);
      editor.setText(preset.code);
      void compile();
    }
  });
  const modelSelect = select(
    MODELS.map(([g, items]): [string, string[]] => [g, items.map(([n]) => n)]),
    modelName,
    (name) => {
      modelName = name;
      customUrl = undefined;
      write("model", name);
      void place();
    },
  );
  const stageControl = (
    label: string,
    table: Record<string, unknown>,
    key: "globe" | "background" | "environment" | "sun",
  ) =>
    el(
      "label",
      {},
      label,
      select(Object.keys(table), settings[key], (v) => {
        settings[key] = v;
        write(key, v);
        void applyStage();
      }),
    );
  const turntable = el("input", {
    type: "checkbox",
    checked: settings.turntable,
    onchange: () => {
      settings.turntable = turntable.checked;
      write("turntable", turntable.checked ? "1" : "0");
    },
  });

  const editorHost = el("div", { className: "slang-editor" });
  // The contract reference (Shadertoy's "Shader Inputs"): what
  // `import cesium;` declares, where go to definition and the hover's link
  // land in it.
  const contractHost = el("div", { className: "slang-contract" });
  const contractDetails = el(
    "details",
    {},
    el("summary", {}, "Contract: import cesium"),
    contractHost,
  );
  const contract = createContractView(contractHost, CONTRACT);
  const showContract = (line: number) => {
    contractDetails.open = true;
    contract.show(line);
    contractDetails.scrollIntoView({ block: "nearest" });
  };
  panel.append(
    el(
      "div",
      { className: "slang-toolbar" },
      el("label", {}, "Preset", presetSelect),
      el("label", {}, "Model", modelSelect),
      el(
        "div",
        { className: "slang-row" },
        urlInput,
        el(
          "button",
          {
            type: "button",
            onclick: () => {
              if (urlInput.value.trim()) {
                customUrl = urlInput.value.trim();
                void place();
              }
            },
          },
          "Load URL",
        ),
        el(
          "button",
          { type: "button", onclick: () => fileInput.click() },
          "Open .glb…",
        ),
        el(
          "button",
          {
            type: "button",
            onclick: focus,
            title: "Frame the model, orbiting around it",
          },
          "Focus",
        ),
      ),
      fileInput,
    ),
    el(
      "details",
      { className: "slang-stage" },
      el("summary", {}, "Stage"),
      el(
        "div",
        { className: "slang-toolbar" },
        stageControl("Globe", GLOBES, "globe"),
        stageControl("Background", BACKGROUNDS, "background"),
        stageControl("Environment light", ENVIRONMENTS, "environment"),
        stageControl("Sun", SUNS, "sun"),
        el("label", {}, "Turntable", turntable),
      ),
    ),
    editorHost,
    el("p", { className: "slang-status" }, status.compile, " ", status.model),
    contractDetails,
    el("details", {}, el("summary", {}, "Generated WGSL"), wgsl),
    el(
      "p",
      { className: "slang-help" },
      "Stages against the cesium module (vertexMain, fragmentMain). Completion (Ctrl-Space), hover, errors and go to definition (Cmd/Ctrl-click, F12) come from the Slang language server; Cmd/Ctrl-Enter compiles now. Drag orbits, right- or shift-drag pans, the wheel zooms.",
    ),
  );

  // ------------------------------------------------------------ compiling
  let shader: CustomShader | undefined;
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const compile = async () => {
    clearTimeout(timer);
    const mine = ++generation;
    const started = performance.now();
    status.compile.textContent = "Compiling…";
    const source = editor.text();
    write("source", source);
    try {
      const next = await CustomShader.fromSlang(source, {
        slangUrl: SLANG_URL,
        label: "playground",
      });
      if (mine !== generation || signal.aborted) {
        return;
      }
      shader = next;
      editor.setCompileErrors(undefined);
      wgsl.textContent = next.code;
      status.compile.textContent = `Compiled in ${(performance.now() - started).toFixed(0)} ms · ${(next.code.length / 1024).toFixed(1)} KB of WGSL`;
      await place();
    } catch (e) {
      if (mine !== generation || signal.aborted) {
        return;
      }
      editor.setCompileErrors(e instanceof Error ? e.message : String(e));
      status.compile.textContent = shader
        ? "Errors, marked in the editor: the model keeps the last shader that compiled."
        : "Errors, marked in the editor.";
    }
  };
  const editor = createSlangEditor(editorHost, {
    text:
      read("source") ??
      PRESETS.find((p) => p.name === firstPreset)?.code ??
      PRESETS[0]!.code,
    server,
    onChange: () => {
      clearTimeout(timer);
      timer = setTimeout(() => void compile(), 400);
    },
    onCompile: () => void compile(),
    onShowContract: showContract,
  });

  // The stage and the model before the gallery shows the view.
  await applyStage();
  if (!served) {
    status.compile.textContent =
      "The Slang WebAssembly build isn't served here: run `npm run setup --workspace @cesium/next` (it fetches it) and restart the dev server.";
    await place();
  } else {
    await compile();
    if (!placed) {
      await place();
    }
  }
  await placing;

  return () => {
    generation++;
    clearTimeout(timer);
    cancelAnimationFrame(raf);
    removePlaced();
    server?.dispose();
    editor.destroy();
    contract.destroy();
    if (customUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(customUrl);
    }
    engine.renderMode = restore.renderMode;
    view.background = restore.background;
    view.clearColor = restore.clearColor;
    Object.assign(view.lighting, restore.lighting);
    engine.environment.setSky(DEFAULT_SKY);
    viewer.setControls(restore.controls);
    panel.replaceChildren();
  };
}

/** "#rrggbb" (sRGB) as linear RGB. */
function srgbToLinear(hex: string): [number, number, number] {
  const c = (i: number) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return [c(0), c(1), c(2)];
}
