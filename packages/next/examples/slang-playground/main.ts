import { CustomShader, type ModelInstance } from "../../src/index.ts";
import type { ExampleContext } from "../types.ts";

/**
 * The Slang playground: custom shader stages written in Slang, compiled in
 * the page as you type (the Slang WebAssembly build, in a worker:
 * `CustomShader.fromSlang`) and drawn on a model.
 *
 * A shader imports the `cesium` module (the custom shader contract,
 * src/shaders/cesium.slang) and defines `vertexMain`, `fragmentMain` or
 * both. `fsInput.time` and `vsInput.time` are seconds since the engine
 * started, so the view renders continuously while this example is open.
 * Compiling keeps the last shader that compiled: an error shows below the
 * editor and the model keeps drawing the last good one.
 */

/** Where the models stand: a field outside Philadelphia. */
const SITE = { longitude: -75.1652, latitude: 39.9526 };

const MODELS: Array<[string, string]> = [
  ["Milk truck", "CesiumMilkTruck/glTF-Draco/CesiumMilkTruck.gltf"],
  ["Duck", "Duck/glTF-Draco/Duck.gltf"],
  ["Boom box", "BoomBox/glTF/BoomBox.gltf"],
  ["Buildings", "BuildingsMetadata/glTF/buildings-metadata.gltf"],
];

const PRESETS: Record<string, string> = {
  "Rim glow": `import cesium;

// A glow where the surface turns away from the camera, pulsing in time.
public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float3 toCamera = normalize(-fsInput.positionEC);
  float rim = 1.0 - saturate(dot(toCamera, normalize(fsInput.normal)));
  float pulse = 0.5 + 0.5 * sin(fsInput.time * 3.0);
  material.emissive += float3(0.2, 0.6, 1.0) * pow(rim, 3.0) * (0.5 + pulse) * 4.0;
}
`,
  "Height bands": `import cesium;

float3 hue(float h) {
  float3 k = float3(0.0, 2.0 / 3.0, 1.0 / 3.0);
  return saturate(abs(frac(h + k) * 6.0 - 3.0) - 1.0);
}

// Bands of color by height above the ellipsoid, a band every half meter,
// sliding up over time.
public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float height = length(fsInput.positionWC) - 6369000.0;
  float band = frac(height * 2.0 - fsInput.time * 0.25);
  material.baseColor = lerp(material.baseColor, hue(band), 0.7);
}
`,
  "Toon steps": `import cesium;

// Flat steps of the material's color by how much the surface faces up,
// unlit, with dark edges where it turns away from the camera.
public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float3 up = normalize(fsInput.positionWC);
  float3 n = normalize(fsInput.normal);
  float light = floor(saturate(dot(n, up) * 0.5 + 0.5) * 4.0) / 4.0;
  float3 toCamera = normalize(-fsInput.positionEC);
  float edge = step(0.25, dot(toCamera, n));
  material.baseColor = material.baseColor * (0.35 + 0.65 * light) * edge;
  material.unlit = true;
}
`,
  Normals: `import cesium;

// The shading normal as a color (Earth-fixed axes), unlit.
public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  material.baseColor = normalize(fsInput.normal) * 0.5 + 0.5;
  material.unlit = true;
}
`,
  "Vertex wave": `import cesium;

// A wave running through the model: each vertex moves along its normal.
public void vertexMain(VertexInput vsInput, inout VertexOutput vsOutput) {
  float phase = vsInput.positionMC.x * 4.0 + vsInput.time * 4.0;
  vsOutput.positionMC = vsInput.positionMC + vsInput.normalMC * sin(phase) * 0.05;
}

public void fragmentMain(FragmentInput fsInput, inout MaterialOutput material) {
  float phase = fsInput.positionMC.x * 4.0 + fsInput.time * 4.0;
  material.baseColor *= 0.6 + 0.4 * sin(phase);
}
`,
};

const SLANG_URL = "/slang-wasm/slang-wasm.js";

export async function run({ viewer, panel, signal }: ExampleContext) {
  const { engine } = viewer;
  const renderMode = engine.renderMode;
  // Shaders animate with `time`: render every frame while open.
  engine.renderMode = "continuous";

  const el = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    props: Record<string, unknown> = {},
    ...children: Array<Node | string>
  ): HTMLElementTagNameMap[K] => {
    const e = Object.assign(document.createElement(tag), props);
    e.append(...children);
    return e;
  };

  // ------------------------------------------------------------ the panel
  const editor = el("textarea", {
    spellcheck: false,
    value: PRESETS["Rim glow"]!,
    rows: 18,
  });
  Object.assign(editor.style, {
    width: "100%",
    boxSizing: "border-box",
    minHeight: "260px",
    resize: "vertical",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "12px",
    lineHeight: "1.45",
    tabSize: "2",
    whiteSpace: "pre",
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid var(--stratakit-color-border-neutral-base, #555)",
    background: "var(--stratakit-color-bg-page-depth, #111)",
    color: "inherit",
  });
  const status = el("p", {});
  const error = el("pre", {});
  Object.assign(error.style, {
    margin: "0",
    maxHeight: "140px",
    overflow: "auto",
    whiteSpace: "pre-wrap",
    fontSize: "11px",
    color: "var(--stratakit-color-text-critical-base, #ff6b6b)",
  });
  error.hidden = true;
  const wgsl = el("pre", {});
  Object.assign(wgsl.style, {
    margin: "0",
    maxHeight: "200px",
    overflow: "auto",
    fontSize: "11px",
  });
  const preset = el(
    "select",
    {
      onchange: () => {
        editor.value = PRESETS[preset.value]!;
        void compile();
      },
    },
    ...Object.keys(PRESETS).map((name) => el("option", { value: name }, name)),
  );
  const model = el(
    "select",
    { onchange: () => void place() },
    ...MODELS.map(([name, path]) => el("option", { value: path }, name)),
  );
  // Tab indents instead of leaving the editor.
  editor.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      editor.setRangeText(
        "  ",
        editor.selectionStart,
        editor.selectionEnd,
        "end",
      );
      schedule();
    }
  });
  editor.addEventListener("input", () => schedule());
  panel.append(
    el("label", {}, "Preset", preset),
    el("label", {}, "Model", model),
    editor,
    status,
    error,
    el("details", {}, el("summary", {}, "Generated WGSL"), wgsl),
    el(
      "p",
      {},
      "Slang stages against the cesium module (vertexMain, fragmentMain), compiled in the page by the Slang WebAssembly build. The last shader that compiled keeps drawing.",
    ),
  );

  // ------------------------------------------------------------ compiling
  let shader: CustomShader | undefined;
  let instance: ModelInstance | undefined;
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => void compile(), 400);
  };

  const compile = async () => {
    const mine = ++generation;
    const started = performance.now();
    status.textContent = "Compiling…";
    try {
      const next = await CustomShader.fromSlang(editor.value, {
        slangUrl: SLANG_URL,
        label: "playground",
      });
      if (mine !== generation || signal.aborted) {
        return;
      }
      const ms = performance.now() - started;
      shader = next;
      error.hidden = true;
      wgsl.textContent = next.code;
      status.textContent = `Compiled in ${ms.toFixed(0)} ms · ${(next.code.length / 1024).toFixed(1)} KB of WGSL`;
      await place();
    } catch (e) {
      if (mine !== generation || signal.aborted) {
        return;
      }
      status.textContent = shader
        ? "Error: the model keeps the last shader that compiled."
        : "Error.";
      error.textContent = e instanceof Error ? e.message : String(e);
      error.hidden = false;
    }
  };

  /** The model with the current shader (placed again: the upload is cached). */
  let placing = Promise.resolve();
  let framed = false;
  const place = () =>
    (placing = placing.then(async () => {
      const next = await viewer.addModel(
        `/specs-data/Models/glTF-2.0/${model.value}`,
        {
          at: SITE,
          ...(shader ? { shader } : {}),
        },
      );
      if (signal.aborted) {
        viewer.remove(next);
        return;
      }
      if (instance) {
        viewer.remove(instance);
      }
      instance = next;
      if (!framed) {
        framed = true;
        viewer.zoomTo(next);
      }
    }));

  // The WebAssembly build must be served (npm run setup fetches it).
  const served = await fetch(SLANG_URL, { method: "HEAD" })
    .then(
      (r) =>
        r.ok && !(r.headers.get("content-type") ?? "").includes("text/html"),
    )
    .catch(() => false);
  if (!served) {
    status.textContent =
      "The Slang WebAssembly build isn't served here. Run `npm run setup --workspace @cesium/next` (it fetches it into ~/.cesium-bench/slang-wasm) and restart the dev server.";
    editor.disabled = true;
    await place();
  } else {
    await compile();
    if (!instance) {
      await place();
    }
  }

  return () => {
    generation++;
    clearTimeout(timer);
    if (instance) {
      viewer.remove(instance);
    }
    engine.renderMode = renderMode;
    panel.replaceChildren();
  };
}
