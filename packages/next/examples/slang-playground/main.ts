import {
  CustomShader,
  DAYLIGHT_SUN_ILLUMINANCE,
  Ellipsoid,
  eastNorthUpToFixedFrame,
  fromDegrees,
  mat4,
  vec3,
  type MeshData,
  type ModelPlacement,
  type ModelResource,
  type ShaderControl,
  type SkyOptions,
} from "../../src/index.ts";
import type { ExampleContext } from "../types.ts";
import { createContractView, createSlangEditor } from "./editor.ts";
import { CONTRACT, SlangLanguageServer } from "./languageServer.ts";
import { FIRST_PRESET, NEW_SHADER, PRESETS } from "./presets.ts";
import { plane, sphere } from "./shapes.ts";

/**
 * The Slang playground, a small lookdev tool: custom shader stages written
 * in Slang, compiled in the page as you type (the Slang WebAssembly build,
 * in a worker: `CustomShader.fromSlang`) and drawn on a model on a stage
 * of its own: no globe, no timeline or credits, a background color, studio
 * light from a procedural environment and a key light, orbit controls
 * around the model.
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
const ENVIRONMENTS: Record<string, SkyOptions> = {
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
};

const BACKGROUNDS: Record<string, string> = {
  Charcoal: "#24262b",
  Black: "#000000",
  Grey: "#7a7d84",
  White: "#f2f2f2",
};

/**
 * The key light (the sun, set by direction at the stage, not by the clock):
 * azimuth and elevation in degrees, illuminance in lux.
 */
const KEYS: Record<
  string,
  { azimuth: number; elevation: number; illuminance: number }
> = {
  "Key light": {
    azimuth: 135,
    elevation: 40,
    illuminance: DAYLIGHT_SUN_ILLUMINANCE,
  },
  "Soft key": {
    azimuth: 135,
    elevation: 40,
    illuminance: DAYLIGHT_SUN_ILLUMINANCE * 0.25,
  },
  "Top light": {
    azimuth: 180,
    elevation: 85,
    illuminance: DAYLIGHT_SUN_ILLUMINANCE,
  },
  "Back light": {
    azimuth: 330,
    elevation: 20,
    illuminance: DAYLIGHT_SUN_ILLUMINANCE,
  },
  Off: { azimuth: 135, elevation: 40, illuminance: 0 },
};

const STORAGE = "dyno.slangPlayground";

export async function run({ viewer, panel, signal }: ExampleContext) {
  const { engine, world, view } = viewer;
  const ellipsoid = Ellipsoid.WGS84;

  // The viewer is this example's own (destroyed when it's left), so what
  // it changes here needs no restoring.
  // Lookdev, not the globe: no timeline (the key light is set by
  // direction) and no credits (the stage shows no attributed data).
  viewer.creditsShown = false;
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
    background: pick(BACKGROUNDS, read("background") ?? "Charcoal", "Charcoal"),
    environment: pick(ENVIRONMENTS, read("environment") ?? "Studio", "Studio"),
    key: pick(KEYS, read("key") ?? "Key light", "Key light"),
    turntable: read("turntable") === "1",
  };
  /** The key light, by direction at the stage (after framing moves it). */
  const applyKey = () => {
    const key = KEYS[settings.key]!;
    viewer.setSun(key.azimuth, key.elevation);
    view.lighting.sunIlluminance = key.illuminance;
  };
  const applyStage = () => {
    view.background = "color";
    view.clearColor = srgbToLinear(BACKGROUNDS[settings.background]!);
    view.lighting.environment = "procedural";
    engine.environment.setSky(ENVIRONMENTS[settings.environment]!);
    applyKey();
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
    | { kind: "model"; key: string; placement: ModelPlacement; url: string }
    | {
        kind: "shape";
        key: string;
        mesh: ReturnType<typeof world.addMesh>;
        material: number;
        transform: ReturnType<typeof world.addTransform>;
        draw: ReturnType<typeof world.addDraw>;
        radius: number;
      }
    | undefined;
  /**
   * The model on the stage, as a handle (`viewer.loadModel`): its shader
   * changes in place (`setShader`), and it is released when another model
   * takes the stage.
   */
  const models = new Map<string, Promise<ModelResource>>();
  const releaseModel = (url: string) => {
    void models.get(url)?.then(
      (m) => m.release(),
      () => {},
    );
    models.delete(url);
  };
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

  /** Removes what was placed, releasing its model unless it is `keepUrl`'s. */
  const removePlaced = (old: typeof placed, keepUrl?: string) => {
    if (old?.kind === "model") {
      old.placement.remove();
      if (old.url !== keepUrl) {
        releaseModel(old.url);
      }
    } else if (old?.kind === "shape") {
      world.removeDraw(old.draw);
      world.removeTransform(old.transform);
      world.removeMaterial(old.material);
      world.removeMesh(old.mesh);
    }
    if (old === placed) {
      placed = undefined;
    }
  };

  const focus = () => {
    if (placed?.kind === "model") {
      viewer.zoomTo(placed.placement, 35 * DEG, -20 * DEG);
    } else if (placed?.kind === "shape") {
      const m = stageMatrix(placed.radius);
      const center = vec3.vec3(m[12], m[13], m[14]);
      viewer.zoomTo(
        { center, radius: placed.radius * 1.2 },
        35 * DEG,
        -20 * DEG,
      );
    }
    // The key light's direction is at what is framed.
    applyKey();
  };

  /** Places the current model with the current shader (uploads cached). */
  let placing = Promise.resolve();
  let framedFor: string | undefined;
  /** What is on the stage now, to go back to when a new model fails. */
  let shown: { customUrl: string | undefined; modelName: string } | undefined;
  /** What place() is loading, for its error. */
  let attempt = "";
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
        attempt = target.kind === "url" ? target.url : modelName;
        showModelError(undefined);
        // The same thing on the stage: only its shader changes, in place.
        if (placed?.key === key) {
          if (placed.kind === "model") {
            placed.placement.setShader(shader);
          } else {
            world.setDrawShader(placed.draw, shader);
          }
          return;
        }
        if (target.kind === "shape") {
          let data = shapes.get(modelName);
          if (!data) {
            data = target.mesh();
            shapes.set(modelName, data);
          }
          const previous = placed;
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
          placed = {
            kind: "shape",
            key,
            mesh,
            material,
            transform,
            draw,
            radius,
          };
          removePlaced(previous);
        } else {
          let loading = models.get(target.url);
          if (!loading) {
            loading = viewer.loadModel(target.url);
            models.set(target.url, loading);
          }
          let model: ModelResource;
          try {
            model = await loading;
          } catch (e) {
            models.delete(target.url);
            throw e;
          }
          if (signal.aborted) {
            return;
          }
          // The new placement before the old one goes: no empty frame.
          const previous = placed;
          placed = {
            kind: "model",
            key,
            placement: model.place({
              modelMatrix: stageMatrix(0),
              ...(shader ? { shader } : {}),
            }),
            url: target.url,
          };
          removePlaced(previous, target.url);
        }
        shown = { customUrl, modelName };
        if (framedFor !== key) {
          framedFor = key;
          focus();
        }
      })
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : String(e);
        const where = attempt.startsWith("blob:") ? "the file" : attempt;
        showModelError(
          /failed to fetch|networkerror|load failed/i.test(message)
            ? `${where} couldn't be fetched: the address may be wrong, or the server down or not allowing cross-origin requests (CORS).`
            : `${where}: ${message}`,
        );
        // Back to what is shown, so the next compile doesn't load the
        // failing model again (and show the same error again).
        if (shown) {
          if (customUrl !== shown.customUrl && customUrl?.startsWith("blob:")) {
            URL.revokeObjectURL(customUrl);
          }
          customUrl = shown.customUrl;
          modelName = shown.modelName;
          modelSelect.value = modelName;
        }
      }));

  // Turntable: the model turns about its up axis, 20° a second.
  let last = performance.now();
  let raf = requestAnimationFrame(function turn(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (settings.turntable && placed) {
      spin += dt * 20 * DEG;
      if (placed.kind === "model") {
        placed.placement.setTransform(stageMatrix(0));
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

  const status = { compile: el("span", {}) };
  // Errors where they're seen: the compiler's in a list under the editor
  // (each a link to its line), the model's as a banner over the view.
  const errorBox = el("div", { className: "slang-errors", role: "alert" });
  errorBox.hidden = true;
  const viewError = el("div", { className: "slang-view-error", role: "alert" });
  viewError.hidden = true;
  viewer.container.append(viewError);
  let viewErrorTimer: ReturnType<typeof setTimeout> | undefined;
  const showModelError = (message: string | undefined) => {
    clearTimeout(viewErrorTimer);
    viewError.hidden = !message;
    viewError.replaceChildren();
    if (message) {
      viewError.append(
        el("span", {}, `Could not load the model. ${message}`),
        el(
          "button",
          {
            type: "button",
            title: "Dismiss",
            onclick: () => showModelError(undefined),
          },
          "×",
        ),
      );
      viewErrorTimer = setTimeout(() => showModelError(undefined), 10_000);
    }
  };
  const showCompileErrors = (
    errors: Array<{ line: number; message: string }>,
    raw: string | undefined,
    kept: boolean,
  ) => {
    errorBox.hidden = raw === undefined;
    if (raw === undefined) {
      errorBox.replaceChildren();
      return;
    }
    const count = Math.max(errors.length, 1);
    errorBox.replaceChildren(
      el(
        "div",
        { className: "slang-errors-title" },
        `${count} error${count === 1 ? "" : "s"}`,
        kept ? " · the model keeps the last shader that compiled" : "",
      ),
      ...(errors.length
        ? errors.map(({ line, message }) =>
            el(
              "button",
              {
                type: "button",
                className: "slang-error",
                title: "Go to the line",
                onclick: () => editor.goTo(line),
              },
              el("span", { className: "slang-error-line" }, `Line ${line}`),
              message,
            ),
          )
        : [el("pre", { className: "slang-error-raw" }, raw)]),
    );
  };
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
  // Shown while the editor holds a new shader (no preset).
  presetSelect.prepend(el("option", { value: "", hidden: true }, "New shader"));
  presetSelect.value = firstPreset;
  // "New": a blank stage (the model's own material), the preset cleared.
  const newButton = el(
    "button",
    {
      type: "button",
      title: "Start a new shader: the model's own material, unchanged",
      onclick: () => {
        const text = editor.text();
        const edited =
          text !== NEW_SHADER && !PRESETS.some((p) => p.code === text);
        write("preset", "");
        presetSelect.value = "";
        // One edit in the editor's history: undo brings the old text back.
        editor.setText(NEW_SHADER);
        void compile().then(() => {
          if (edited) {
            status.compile.textContent +=
              " · Cmd/Ctrl-Z brings back your edits";
          }
        });
      },
    },
    "New",
  );
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
    key: "background" | "environment" | "key",
  ) =>
    el(
      "label",
      {},
      label,
      select(Object.keys(table), settings[key], (v) => {
        settings[key] = v;
        write(key, v);
        applyStage();
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

  // ------------------------------------------------------------ parameters
  // The shader's declared uniforms (`[Slider(…)] uniform float x;`, the
  // cesium module's attributes) as controls: set on the shader as they
  // change, no recompile. Values are kept by name across compiles (and
  // visits) until the shader changes that uniform's type or default.
  // Floating over the view's bottom left, collapsible (kept per visit):
  // tuned while watching the model, not read beside the code.
  const params = el("div", { className: "slang-params" });
  params.hidden = true;
  viewer.container.append(params);
  let paramsOpen = read("paramsOpen") !== "0";
  type Kept = { type: string; default: string; value: number | number[] };
  const kept = new Map<string, Kept>(
    Object.entries(
      ((): Record<string, Kept> => {
        try {
          return JSON.parse(read("values") ?? "{}") as Record<string, Kept>;
        } catch {
          return {};
        }
      })(),
    ),
  );
  const keep = () => write("values", JSON.stringify(Object.fromEntries(kept)));
  let paramsFor = "";
  /** The shader's controls: kept values applied, the panel made again if new. */
  const applyControls = (next: CustomShader) => {
    for (const c of next.controls) {
      const was = kept.get(c.name);
      const fallback = JSON.stringify(c.value);
      if (
        was &&
        was.type === c.type &&
        was.default === fallback &&
        sameShape(was.value, c.value)
      ) {
        next.setUniform(c.name, was.value);
      } else {
        kept.set(c.name, { type: c.type, default: fallback, value: c.value });
      }
    }
    keep();
    const signature = JSON.stringify(next.controls);
    if (signature !== paramsFor) {
      paramsFor = signature;
      renderControls(next.controls);
    }
  };
  const setValue = (name: string, value: number | number[]) => {
    const k = kept.get(name);
    if (k) {
      k.value = value;
      keep();
    }
    shader?.setUniform(name, value);
  };
  const renderControls = (controls: readonly ShaderControl[]) => {
    params.hidden = controls.length === 0;
    if (!controls.length) {
      params.replaceChildren();
      return;
    }
    const rows = controls.map((c) => {
      const value = kept.get(c.name)?.value ?? c.value;
      return el(
        "div",
        { className: "slang-field slang-param" },
        el("span", { title: c.name }, c.label),
        controlFor(c, value),
      );
    });
    const body = el("div", { className: "slang-params-body" }, ...rows);
    body.hidden = !paramsOpen;
    const toggle = el(
      "button",
      {
        type: "button",
        className: "slang-params-toggle",
        ariaExpanded: String(paramsOpen),
        onclick: () => {
          paramsOpen = !paramsOpen;
          write("paramsOpen", paramsOpen ? "1" : "0");
          body.hidden = !paramsOpen;
          reset.hidden = !paramsOpen;
          toggle.ariaExpanded = String(paramsOpen);
        },
      },
      el("span", { className: "slang-params-chevron", ariaHidden: "true" }),
      `Parameters (${controls.length})`,
    );
    const reset = el(
      "button",
      {
        type: "button",
        className: "slang-params-reset",
        title: "Every parameter back to the shader's default",
        onclick: () => {
          for (const c of controls) {
            setValue(c.name, c.value);
          }
          renderControls(controls);
        },
      },
      "Reset",
    );
    reset.hidden = !paramsOpen;
    params.replaceChildren(
      el("div", { className: "slang-params-header" }, toggle, reset),
      body,
    );
  };
  const controlFor = (c: ShaderControl, value: number | number[]) => {
    if (c.kind === "toggle") {
      return el("input", {
        type: "checkbox",
        checked: Number(value) !== 0,
        onchange: (e: Event) =>
          setValue(c.name, (e.target as HTMLInputElement).checked ? 1 : 0),
      });
    }
    if (c.kind === "color") {
      const v = value as number[];
      return el("input", {
        type: "color",
        value: linearToHex(v),
        oninput: (e: Event) => {
          const rgb = srgbToLinear((e.target as HTMLInputElement).value);
          setValue(c.name, v.length === 4 ? [...rgb, v[3]!] : rgb);
        },
      });
    }
    if (c.kind === "slider") {
      const shown = el("output", {}, format(Number(value), c));
      const range = el("input", {
        type: "range",
        min: String(c.min),
        max: String(c.max),
        step: String(c.step),
        value: String(value),
        oninput: () => {
          const v = Number(range.value);
          shown.textContent = format(v, c);
          setValue(c.name, v);
        },
      });
      return el("span", { className: "slang-row" }, range, shown);
    }
    // No attribute: a number per component.
    const values = Array.isArray(value) ? [...value] : [Number(value)];
    return el(
      "span",
      { className: "slang-row" },
      ...values.map((v, i) =>
        el("input", {
          type: "number",
          step: c.type === "f32" || c.type.startsWith("vec") ? "0.01" : "1",
          value: String(v),
          oninput: (e: Event) => {
            values[i] = Number((e.target as HTMLInputElement).value);
            setValue(c.name, values.length === 1 ? values[0]! : [...values]);
          },
        }),
      ),
    );
  };
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
      el(
        "div",
        { className: "slang-field" },
        "Preset",
        el("span", { className: "slang-row" }, presetSelect, newButton),
      ),
      el(
        "div",
        { className: "slang-field" },
        "Model",
        el(
          "span",
          { className: "slang-row" },
          modelSelect,
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
      ),
      el(
        "div",
        { className: "slang-row slang-url" },
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
        stageControl("Background", BACKGROUNDS, "background"),
        stageControl("Environment light", ENVIRONMENTS, "environment"),
        stageControl("Key light", KEYS, "key"),
        el("label", {}, "Turntable", turntable),
      ),
    ),
    editorHost,
    errorBox,
    el("p", { className: "slang-status" }, status.compile),
    contractDetails,
    el("details", {}, el("summary", {}, "Generated WGSL"), wgsl),
    el(
      "p",
      { className: "slang-help" },
      "Stages against the cesium module (vertexMain, fragmentMain). Declare a uniform with [Slider(…)], [Color(…)] or [Toggle(…)] for a control in Parameters. Completion (Ctrl-Space), hover, errors and go to definition (Cmd/Ctrl-click, F12) come from the Slang language server; Cmd/Ctrl-Enter compiles now. Drag orbits, right- or shift-drag pans, the wheel zooms.",
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
      applyControls(next);
      showCompileErrors(
        editor.setCompileErrors(undefined, source),
        undefined,
        false,
      );
      wgsl.textContent = next.code;
      status.compile.textContent = `Compiled in ${(performance.now() - started).toFixed(0)} ms · ${(next.code.length / 1024).toFixed(1)} KB of WGSL`;
      await place();
    } catch (e) {
      if (mine !== generation || signal.aborted) {
        return;
      }
      const raw = e instanceof Error ? e.message : String(e);
      showCompileErrors(editor.setCompileErrors(raw, source), raw, !!shader);
      status.compile.textContent = "";
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
  applyStage();
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
    removePlaced(placed);
    for (const url of [...models.keys()]) {
      releaseModel(url);
    }
    server?.dispose();
    editor.destroy();
    contract.destroy();
    if (customUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(customUrl);
    }
    panel.replaceChildren();
    clearTimeout(viewErrorTimer);
    viewError.remove();
    params.remove();
  };
}

/** A kept value (from storage) shaped as the control's: numbers only. */
function sameShape(kept: unknown, value: number | number[]): boolean {
  if (typeof value === "number") {
    return typeof kept === "number" && Number.isFinite(kept);
  }
  return (
    Array.isArray(kept) &&
    kept.length === value.length &&
    kept.every((v) => typeof v === "number" && Number.isFinite(v))
  );
}

/** A slider's value as shown: integers whole, floats to two places. */
function format(value: number, c: ShaderControl): string {
  return c.type === "f32" ? value.toFixed(2) : String(Math.round(value));
}

/** Linear RGB as "#rrggbb" (sRGB), for a color input. */
function linearToHex(rgb: number[]): string {
  const c = (v: number) => {
    const x = Math.min(Math.max(v, 0), 1);
    const s = x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055;
    return Math.round(s * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${c(rgb[0] ?? 0)}${c(rgb[1] ?? 0)}${c(rgb[2] ?? 0)}`;
}

/** "#rrggbb" (sRGB) as linear RGB. */
function srgbToLinear(hex: string): [number, number, number] {
  const c = (i: number) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return [c(0), c(1), c(2)];
}
