import {
  CanvasTarget,
  Ellipsoid,
  Engine,
  InspectController,
  createBox,
  createSurfacePatch,
  eastNorthUpToFixedFrame,
  fromDegrees,
  mat4,
  resolveIonAsset,
  vec3,
  type DrawHandle,
  type FeatureValue,
  type Tileset3D,
  type View,
  type ViewLink,
  type World,
} from "../src/index.ts";

/**
 * Demo viewer for the 2.0 PoC: loads sample glTF models, 3D Tiles content
 * (public samples or a private ion asset) or a synthetic city into one world,
 * with inspection navigation, lighting controls, picking with feature
 * properties and live stats. Selections are deep-linkable:
 *   ?model=<Specs path> | ?tileset=<Specs path> | ?asset=<ion id> | ?scene=city
 */

const ellipsoid = Ellipsoid.WGS84;
const deg = Math.PI / 180;
const SITE = fromDegrees(-75.1652, 39.9526, 0);

/** Khronos and Cesium sample models in Specs/Data/Models/glTF-2.0. */
const MODELS = [
  "CesiumMilkTruck/glTF-Draco/CesiumMilkTruck.gltf",
  "BoomBox/glTF/BoomBox.gltf",
  "Duck/glTF-Draco/Duck.gltf",
  "BuildingsMetadata/glTF/buildings-metadata.gltf",
  "TorusQuantized/glTF/TorusQuantized.gltf",
  "BoxTexturedKtx2Basis/glTF/BoxTexturedKtx2Basis.gltf",
  "MeshoptCubeTest/glTF-Meshopt/MeshoptCubeTest.gltf",
  "BoxVertexColors/glTF/BoxVertexColors.gltf",
  "UnlitTest/glTF/UnlitTest.gltf",
  "TwoSidedPlane/glTF/TwoSidedPlane.gltf",
  "BoxCutout/glTF/BoxCutout.gltf",
  "Box/glTF/Box.gltf",
];

/** Public tilesets in Specs/Data/Cesium3DTiles. */
const TILESETS = [
  "Batched/BatchedWithBatchTable/tileset.json",
  "Batched/BatchedWithBatchTableBinary/tileset.json",
  "Batched/BatchedWithTransformBox/tileset.json",
  "Batched/BatchedColors/tileset.json",
  "Batched/BatchedTextured/tileset.json",
];

type Source =
  | { kind: "model"; path: string }
  | { kind: "tileset"; path: string }
  | { kind: "ion"; asset: number }
  | { kind: "city" };

const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;

function sourceFromUrl(): Source {
  const params = new URLSearchParams(location.search);
  const model = params.get("model");
  const tileset = params.get("tileset");
  const asset = params.get("asset");
  if (model) {
    return { kind: "model", path: model };
  }
  if (tileset) {
    return { kind: "tileset", path: tileset };
  }
  if (asset) {
    return { kind: "ion", asset: Number(asset) };
  }
  if (params.get("scene") === "city") {
    return { kind: "city" };
  }
  return { kind: "model", path: MODELS[0]! };
}

function sourceToQuery(source: Source): string {
  switch (source.kind) {
    case "model":
      return `?model=${source.path}`;
    case "tileset":
      return `?tileset=${source.path}`;
    case "ion":
      return `?asset=${source.asset}`;
    case "city":
      return "?scene=city";
  }
}

function label(path: string): string {
  return path.split("/")[path.includes("/glTF") ? 0 : 1] ?? path;
}

/**
 * Coarse ellipsoid for context (the real globe is M3). Patches in one
 * latitude row are rotations of each other about the polar axis, so each
 * row is one mesh drawn 32 times: one batch (indirect draw) per row.
 */
function addGlobe(world: World): void {
  const chunksX = 32;
  const chunksY = 16;
  for (let y = 0; y < chunksY; y++) {
    const south = -Math.PI / 2 + (Math.PI * y) / chunksY;
    const patch = createSurfacePatch(
      ellipsoid,
      -Math.PI,
      south,
      -Math.PI + (2 * Math.PI) / chunksX,
      south + Math.PI / chunksY,
      16,
    );
    const mesh = world.addMesh(patch);
    for (let x = 0; x < chunksX; x++) {
      const angle = (2 * Math.PI * x) / chunksX;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      // Rotation about +z (column-major); positions are relative to the origin.
      const model = mat4.mat4();
      model[0] = c;
      model[1] = s;
      model[4] = -s;
      model[5] = c;
      const o = patch.origin;
      const shade = (x + y) % 2 === 0 ? 0.05 : 0.065;
      world.addDraw({
        mesh,
        origin: vec3.vec3(c * o[0]! - s * o[1]!, s * o[0]! + c * o[1]!, o[2]!),
        model,
        radius: patch.radius,
        color: [shade, shade * 1.4, shade * 2.2, 1],
        name: "globe",
      });
    }
  }
}

/** A fine ellipsoid patch under the content, `size` meters across. */
function addGround(
  world: World,
  center: Float64Array,
  size: number,
): DrawHandle | undefined {
  const carto = ellipsoid.cartesianToCartographic(center, fromDegrees(0, 0));
  if (!carto) {
    return undefined;
  }
  const half = size / 2 / ellipsoid.maximumRadius;
  const patch = createSurfacePatch(
    ellipsoid,
    carto.longitude - half / Math.cos(carto.latitude),
    carto.latitude - half,
    carto.longitude + half / Math.cos(carto.latitude),
    carto.latitude + half,
    32,
  );
  return world.addDraw({
    mesh: world.addMesh(patch),
    origin: patch.origin,
    model: mat4.mat4(),
    radius: patch.radius,
    color: [0.11, 0.12, 0.1, 1],
    name: "ground",
  });
}

function addCity(world: World): { center: Float64Array; radius: number } {
  const box = world.addMesh(createBox());
  let seed = 7;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const enu = mat4.mat4();
  const local = mat4.mat4();
  for (let j = 0; j < 12; j++) {
    for (let i = 0; i < 12; i++) {
      const position = ellipsoid.cartographicToCartesian(
        {
          longitude: SITE.longitude + (i - 5.5) * 0.0011 * deg,
          latitude: SITE.latitude + (j - 5.5) * 0.00085 * deg,
          height: 0,
        },
        vec3.vec3(),
      );
      const width = 25 + random() * 30;
      const depth = 25 + random() * 30;
      const height = 15 + random() ** 3 * 220;
      eastNorthUpToFixedFrame(position, ellipsoid, enu);
      mat4.setTranslation(enu, vec3.vec3());
      mat4.fromScale(local, width, depth, height);
      local[14] = height / 2;
      const tint = 0.35 + random() * 0.45;
      world.addDraw({
        mesh: box,
        origin: position,
        model: mat4.multiply(mat4.mat4(), enu, local),
        radius: Math.hypot(width / 2, depth / 2, height / 2) + height / 2,
        color: [tint, tint * 0.92, tint * 0.85, 1],
        name: `building ${j * 12 + i + 1}`,
      });
    }
  }
  return {
    center: ellipsoid.cartographicToCartesian(SITE, vec3.vec3()),
    radius: 700,
  };
}

function sunDirection(
  at: Float64Array,
  azimuthDeg: number,
  elevationDeg: number,
): Float64Array {
  const enu = eastNorthUpToFixedFrame(at, ellipsoid, mat4.mat4());
  const az = azimuthDeg * deg;
  const el = elevationDeg * deg;
  const e = Math.cos(el) * Math.sin(az);
  const n = Math.cos(el) * Math.cos(az);
  const u = Math.sin(el);
  return vec3.normalize(
    vec3.vec3(),
    vec3.vec3(
      enu[0]! * e + enu[4]! * n + enu[8]! * u,
      enu[1]! * e + enu[5]! * n + enu[9]! * u,
      enu[2]! * e + enu[6]! * n + enu[10]! * u,
    ),
  );
}

function formatValue(value: FeatureValue): string {
  if (Array.isArray(value)) {
    return `[${value.join(", ")}]`;
  }
  return value === null ? "(no data)" : String(value);
}

async function main(): Promise<void> {
  const engine = await Engine.create();
  const canvas = $<HTMLCanvasElement>("#main");
  const target = new CanvasTarget(canvas);
  let world = engine.createWorld();
  const view: View = engine.addView({ target, world });
  const controller = new InspectController(view, canvas);
  let overview: View | undefined;
  let overviewLink: ViewLink | undefined;
  /** Split view: a second, independent camera on the right half. */
  let second: View | undefined;
  let secondController: InspectController | undefined;
  let focus = { center: vec3.vec3(), radius: 1 };
  let loadToken = 0;
  /** The streamed tileset in the current world, if any. */
  let current3dTiles: Tileset3D | undefined;
  let streamed: Tileset3D | undefined;
  let groundDraw: DrawHandle | undefined;
  let current = sourceFromUrl();
  const ionToken = import.meta.env.VITE_ION_TOKEN as string | undefined;

  // ---------------------------------------------------------------- panel sections
  // Collapsible sections remember their state (per browser; optional).
  for (const section of document.querySelectorAll<HTMLDetailsElement>(
    "details.section",
  )) {
    const key = `viewer.section.${section.dataset.key}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        section.open = saved === "open";
      }
    } catch {
      // Storage unavailable: defaults apply.
    }
    section.addEventListener("toggle", () => {
      try {
        localStorage.setItem(key, section.open ? "open" : "closed");
      } catch {
        // Ignore.
      }
    });
  }

  // ---------------------------------------------------------------- source UI
  const modelSelect = $<HTMLSelectElement>("#model");
  for (const path of MODELS) {
    modelSelect.add(new Option(label(path), path));
  }
  const tilesetSelect = $<HTMLSelectElement>("#tileset");
  for (const path of TILESETS) {
    tilesetSelect.add(new Option(label(path), path));
  }
  const ionInput = $<HTMLInputElement>("#ion-asset");
  const ionButton = $<HTMLButtonElement>("#ion-load");
  if (!ionToken) {
    ionInput.disabled = ionButton.disabled = true;
    $("#ion-hint").textContent =
      "Set VITE_ION_TOKEN in packages/next/.env.local to load ion assets.";
  }
  modelSelect.addEventListener(
    "change",
    () => void load({ kind: "model", path: modelSelect.value }),
  );
  tilesetSelect.addEventListener(
    "change",
    () => void load({ kind: "tileset", path: tilesetSelect.value }),
  );
  ionButton.addEventListener("click", () => {
    const asset = Number(ionInput.value);
    if (asset > 0) {
      void load({ kind: "ion", asset });
    }
  });
  $("#city").addEventListener("click", () => void load({ kind: "city" }));
  $("#frame").addEventListener("click", () => frame());

  // ---------------------------------------------------------------- lighting UI
  const unlit = $<HTMLInputElement>("#unlit");
  const ground = $<HTMLInputElement>("#ground");
  unlit.addEventListener("change", () => void load(current));
  // The ground is one draw: toggle it in place.
  ground.addEventListener("change", () => {
    if (groundDraw) {
      world.setVisible(groundDraw, ground.checked);
    }
  });
  const bindRange = (id: string, apply: (value: number) => void) => {
    const input = $<HTMLInputElement>(id);
    const out = $(`${id}-value`);
    const update = () => {
      apply(Number(input.value));
      out.textContent = input.value;
    };
    input.addEventListener("input", update);
    update();
  };
  const updateSun = () =>
    vec3.copy(
      engine.sunDirection,
      sunDirection(
        focus.center,
        Number($<HTMLInputElement>("#sun-azimuth").value),
        Number($<HTMLInputElement>("#sun-elevation").value),
      ),
    );
  bindRange("#sun-azimuth", updateSun);
  bindRange("#sun-elevation", updateSun);
  bindRange("#sun-intensity", (v) => (view.lighting.sunIntensity = v));
  bindRange("#diffuse-ibl", (v) => (view.lighting.diffuseIbl = v));
  bindRange("#specular-ibl", (v) => (view.lighting.specularIbl = v));
  bindRange("#exposure", (v) => (view.exposure = v));
  $<HTMLSelectElement>("#encoding").addEventListener("change", (e) => {
    view.outputEncoding = (e.target as HTMLSelectElement).value as
      "srgb" | "gamma2.2";
  });

  // ---------------------------------------------------------------- extra views
  const overviewViewport = () =>
    second
      ? { x: 0.27, y: 0.02, width: 0.21, height: 0.3 }
      : { x: 0.7, y: 0.02, width: 0.28, height: 0.3 };
  const updateIgnore = () => {
    controller.ignore = (x, y) => overview?.contains(x, y) ?? false;
  };
  $<HTMLInputElement>("#overview").addEventListener("change", (e) => {
    if ((e.target as HTMLInputElement).checked) {
      overview = engine.addView({
        target,
        world,
        viewport: overviewViewport(),
      });
      overviewLink = engine.link(view, overview, {
        modes: ["follow", "footprint"],
        followScale: 4,
      });
    } else if (overview) {
      engine.unlink(overviewLink!);
      engine.removeView(overview);
      overview = overviewLink = undefined;
    }
    updateIgnore();
  });
  // Split view: tiles are selected per view from one shared cache and draw
  // table, so the two halves can need different levels of detail.
  $<HTMLInputElement>("#split").addEventListener("change", (e) => {
    if ((e.target as HTMLInputElement).checked) {
      view.viewport = { x: 0, y: 0, width: 0.5, height: 1 };
      second = engine.addView({
        target,
        world,
        viewport: { x: 0.5, y: 0, width: 0.5, height: 1 },
      });
      secondController = new InspectController(second, canvas);
      second.camera.near = view.camera.near;
      secondController.focus(
        controller.target,
        controller.heading + (150 * Math.PI) / 180,
        -0.25,
        controller.range * 0.4,
      );
    } else if (second) {
      secondController!.dispose();
      engine.removeView(second);
      second = secondController = undefined;
      view.viewport = { x: 0, y: 0, width: 1, height: 1 };
    }
    if (overview) {
      overview.viewport = overviewViewport();
    }
  });

  function frame(): void {
    // ?at=lon,lat[,range] looks at a location instead (planet-scale tilesets
    // such as OSM Buildings).
    const at = new URLSearchParams(location.search)
      .get("at")
      ?.split(",")
      .map(Number);
    if (at && at.length >= 2) {
      const target = ellipsoid.cartographicToCartesian(
        fromDegrees(at[0]!, at[1]!, 0),
        vec3.vec3(),
      );
      const range = at[2] ?? 1500;
      vec3.copy(focus.center, target);
      view.camera.near = Math.max(0.05, range * 0.0005);
      controller.focus(target, 35 * deg, -30 * deg, range);
    } else {
      view.camera.near = Math.max(0.005, focus.radius * 0.002);
      controller.focus(focus.center, 35 * deg, -30 * deg, focus.radius * 2.6);
    }
    updateSun();
  }

  // ---------------------------------------------------------------- loading
  async function load(source: Source): Promise<void> {
    const token = ++loadToken;
    current = source;
    const at = new URLSearchParams(location.search).get("at");
    history.replaceState(
      null,
      "",
      sourceToQuery(source) +
        (at && source.kind !== "model" ? `&at=${at}` : ""),
    );
    modelSelect.value = source.kind === "model" ? source.path : "";
    tilesetSelect.value = source.kind === "tileset" ? source.path : "";
    if (source.kind === "ion") {
      ionInput.value = String(source.asset);
    }
    const status = $("#load-status");
    const warnings = new Set<string>();
    const started = performance.now();
    status.textContent = "loading…";
    $("#warnings").textContent = "";
    // Size the arenas within the device's storage-binding limit.
    const limit = engine.gpu.device.limits.maxStorageBufferBindingSize;
    const next = engine.createWorld({
      maxDraws: 1 << 16,
      maxMaterials: 1 << 13,
      vertexBytes: Math.min(768 << 20, Math.floor(limit / 4) * 4),
      indexBytes: Math.min(384 << 20, Math.floor(limit / 4) * 4),
    });
    try {
      addGlobe(next);
      let placed: { center: Float64Array; radius: number };
      if (source.kind === "city") {
        placed = addCity(next);
      } else if (source.kind === "model") {
        const asset = await engine.loadGltf(
          `/specs-data/Models/glTF-2.0/${source.path}`,
        );
        asset.warnings.forEach((w) => warnings.add(w));
        // A model whose nodes already sit at Earth-fixed coordinates
        // (translations of thousands of km, like tile content) is placed
        // as-is; anything else goes into an east-north-up frame at SITE.
        const georeferenced = asset.draws.some(
          (d) => Math.hypot(d.matrix[12]!, d.matrix[13]!, d.matrix[14]!) > 1e6,
        );
        if (georeferenced) {
          warnings.add(
            "georeferenced model: placed at its own Earth-fixed position",
          );
        }
        placed = engine.addModel(
          next,
          asset,
          georeferenced
            ? {
                modelMatrix: mat4.mat4(),
                axes: "3d-tiles",
                unlit: unlit.checked,
              }
            : {
                modelMatrix: eastNorthUpToFixedFrame(
                  ellipsoid.cartographicToCartesian(SITE, vec3.vec3()),
                  ellipsoid,
                  mat4.mat4(),
                ),
                unlit: unlit.checked,
              },
        );
      } else {
        let url: string;
        let headers: Record<string, string> | undefined;
        if (source.kind === "ion") {
          if (!ionToken) {
            throw new Error("No VITE_ION_TOKEN configured");
          }
          const resolved = await resolveIonAsset(source.asset, {
            accessToken: ionToken,
          });
          url = resolved.url;
          headers = resolved.headers;
        } else {
          url = new URL(
            `/specs-data/Cesium3DTiles/${source.path}`,
            location.href,
          ).href;
        }
        // Streamed: Legacy1x selection per view; content loads as needed.
        const tileset = await engine.addTileset(next, url, {
          ...(headers ? { headers } : {}),
        });
        streamed = tileset;
        if (token !== loadToken) {
          throw new Error("superseded");
        }
        // Frame the root's content volume when it has one (publishers often
        // pad the root volume to a power of two).
        const volume = tileset.root.contentVolume ?? tileset.root.volume;
        placed = {
          center:
            volume.kind === "box" ? volume.obb.center : volume.sphere.center,
          radius: volume.sphere.radius,
        };
      }
      if (token !== loadToken) {
        engine.removeWorld(next);
        return;
      }
      // Georeferenced tilesets can sit below the ellipsoid (underground infrastructure): the
      // ground starts hidden for them, shown for placed models and the city.
      ground.checked = source.kind === "model" || source.kind === "city";
      groundDraw = addGround(
        next,
        placed.center,
        source.kind === "city" ? 2000 : Math.max(placed.radius * 8, 50),
      );
      if (groundDraw && !ground.checked) {
        next.setVisible(groundDraw, false);
      }
      if (current3dTiles) {
        engine.removeTileset(current3dTiles);
      }
      current3dTiles = streamed;
      streamed = undefined;
      const old = world;
      world = next;
      view.world = next;
      if (second) {
        second.world = next;
      }
      if (overview) {
        overview.world = next;
      }
      engine.removeWorld(old);
      focus = {
        center: vec3.copy(vec3.vec3(), placed.center),
        radius: placed.radius,
      };
      frame();
      status.textContent = `loaded in ${(performance.now() - started).toFixed(0)} ms`;
      $("#warnings").textContent = [...warnings].join("\n") || "none";
    } catch (error) {
      if (streamed) {
        engine.removeTileset(streamed);
        streamed = undefined;
      }
      engine.removeWorld(next);
      if (error instanceof Error && error.message === "superseded") {
        return;
      }
      if (token === loadToken) {
        const message = error instanceof Error ? error.message : String(error);
        status.textContent = /arena is full/.test(message)
          ? `error: ${message} The full-detail tileset is larger than the arena; streaming (M2) loads only what the view needs.`
          : `error: ${message}`;
      }
    }
  }

  // ---------------------------------------------------------------- picking
  let downAt: [number, number] | undefined;
  canvas.addEventListener(
    "pointerdown",
    (e) => (downAt = [e.clientX, e.clientY]),
  );
  canvas.addEventListener("pointerup", async (e) => {
    if (
      !downAt ||
      Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 3
    ) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    if (overview?.contains(x, y)) {
      return;
    }
    // Pick in whichever view was clicked, in that view's pixels.
    const picked = second?.contains(x, y) ? second : view;
    const area = picked.pixelRect();
    const result = await picked.pick(x - area.x, y - area.y);
    const pick = $("#pick");
    pick.closest("details")!.open = true;
    if (!result) {
      pick.innerHTML = `<span class="hint">nothing at this pixel</span>`;
      return;
    }
    const rows = Object.entries(result.properties ?? {})
      .map(
        ([k, v]) =>
          `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(formatValue(v))}</td></tr>`,
      )
      .join("");
    pick.innerHTML =
      `<div class="pick-name">${escapeHtml(result.name ?? "(unnamed)")}</div>` +
      `<div class="hint">feature ${result.featureId}</div>${
        rows ? `<table>${rows}</table>` : ""
      }`;
  });

  // ---------------------------------------------------------------- memory
  const MB = 1048576;
  const mb = (bytes: number) =>
    `${(bytes / MB).toFixed(bytes < 10 * MB ? 1 : 0)} MB`;
  /** One meter row: label, filled bar (used / capacity), text on top. */
  const meter = (
    label: string,
    used: number,
    capacity: number,
    text: string,
    extra?: { idle: number },
  ) => {
    const pct = capacity > 0 ? Math.min(100, (used / capacity) * 100) : 0;
    const idlePct =
      extra && capacity > 0
        ? Math.min(100 - pct, (extra.idle / capacity) * 100)
        : 0;
    const hot = pct > 90 ? " hot" : "";
    return (
      `<div class="label">${label}</div><div class="bar">` +
      `<div class="fill${hot}" style="width:${pct}%"></div>${
        idlePct > 0
          ? `<div class="fill idle" style="left:${pct}%;width:${idlePct}%"></div>`
          : ""
      }<div class="text">${text}</div></div>`
    );
  };
  const HISTORY = 120; // 30 s at 4 Hz
  const samples = {
    cache: [] as number[],
    targets: [] as number[],
    inFlight: [] as number[],
    cpu: [] as number[],
    gpu: [] as number[],
  };
  const push = (series: number[], value: number) => {
    series.push(value);
    if (series.length > HISTORY) {
      series.shift();
    }
  };
  const historyCanvas = $<HTMLCanvasElement>("#history");
  function drawHistory(): void {
    const dpr = devicePixelRatio || 1;
    const w = Math.round(historyCanvas.clientWidth * dpr);
    const h = Math.round(historyCanvas.clientHeight * dpr);
    if (historyCanvas.width !== w || historyCanvas.height !== h) {
      historyCanvas.width = w;
      historyCanvas.height = h;
    }
    const ctx = historyCanvas.getContext("2d")!;
    ctx.clearRect(0, 0, w, h);
    const rows: Array<[string, number[], string, (v: number) => string]> = [
      ["tile cache", samples.cache, "#3d6fb6", mb],
      ["targets", samples.targets, "#7a5fb0", mb],
      ["in flight", samples.inFlight, "#3a9b8a", (v) => v.toFixed(0)],
      ["cpu ms", samples.cpu, "#d9a441", (v) => v.toFixed(2)],
      ["gpu ms", samples.gpu, "#c4573a", (v) => v.toFixed(2)],
    ];
    const rowH = h / rows.length;
    ctx.font = `${10 * dpr}px ui-monospace, monospace`;
    rows.forEach(([name, series, color, format], r) => {
      const top = r * rowH;
      const max = Math.max(1e-6, ...series);
      ctx.strokeStyle = "#222a3a";
      ctx.beginPath();
      ctx.moveTo(0, top + rowH - 0.5);
      ctx.lineTo(w, top + rowH - 0.5);
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      series.forEach((v, i) => {
        const x = (i / (HISTORY - 1)) * w;
        const y = top + rowH - 3 * dpr - (v / max) * (rowH - 14 * dpr);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      ctx.fillStyle = "#8a93a6";
      const last = series[series.length - 1] ?? 0;
      ctx.fillText(
        `${name} ${format(last)} (max ${format(max)})`,
        4 * dpr,
        top + 11 * dpr,
      );
    });
  }
  function updateMemory(): void {
    const m = world.memory;
    const targets = engine.renderTargetMemory;
    const tiles = current3dTiles?.stats;
    const rows = [
      meter(
        "vertex arena",
        m.vertexBytes.used,
        m.vertexBytes.capacity,
        `${mb(m.vertexBytes.used)} / ${mb(m.vertexBytes.capacity)}`,
      ),
      meter(
        "index arena",
        m.indexBytes.used,
        m.indexBytes.capacity,
        `${mb(m.indexBytes.used)} / ${mb(m.indexBytes.capacity)}`,
      ),
      meter(
        "draw records",
        m.draws.used,
        m.draws.capacity,
        `${m.draws.used} / ${m.draws.capacity} · ${m.batches} batches`,
      ),
      meter(
        "materials",
        m.materials.used,
        m.materials.capacity,
        `${m.materials.used} / ${m.materials.capacity}`,
      ),
      meter(
        "render targets",
        targets.workingSetBytes,
        targets.workingSetBytes + targets.idleBudget,
        `${mb(targets.workingSetBytes)} per frame · ${mb(targets.residentBytes)} resident · idle cap ${mb(targets.idleBudget)}`,
        { idle: targets.residentBytes - targets.workingSetBytes },
      ),
    ];
    if (tiles) {
      rows.push(
        meter(
          "tile cache",
          tiles.bytes,
          tiles.budget,
          `${mb(tiles.bytes)} / ${mb(tiles.budget)} · ${tiles.loaded}/${tiles.tiles} tiles`,
        ),
        meter(
          "requests",
          tiles.inFlight,
          tiles.maxInFlight,
          `${tiles.inFlight} / ${tiles.maxInFlight} in flight · ${tiles.uploadQueue} to upload`,
        ),
      );
    }
    rows.push(
      `<div class="label">GPU tables</div><div class="hint">${mb(m.tableBytes)} fixed (records, instances, lists, args)</div>`,
    );
    $("#memory").innerHTML = rows.join("");
    push(samples.cache, tiles?.bytes ?? 0);
    push(samples.targets, targets.residentBytes);
    push(samples.inFlight, tiles?.inFlight ?? 0);
    push(samples.cpu, engine.stats.cpuMs);
    push(
      samples.gpu,
      Number.isNaN(engine.stats.gpuMs) ? 0 : engine.stats.gpuMs,
    );
    drawHistory();
  }
  setInterval(updateMemory, 250);

  // ---------------------------------------------------------------- stats
  const selectedPerView = (tileset: Tileset3D) =>
    (
      [
        ["main", view],
        ["right", second],
        ["inset", overview],
      ] as const
    )
      .filter(
        (entry): entry is readonly [string, View] => entry[1] !== undefined,
      )
      .map(
        ([name, v]) =>
          `${name} ${tileset.stats.selected.get(Math.log2(engine.viewBit(v))) ?? 0}`,
      )
      .join(", ");
  const adapter = engine.gpu.adapter.info;
  setInterval(() => {
    const s = engine.stats;
    $("#stats").textContent = [
      `adapter      ${`${adapter.vendor} ${adapter.architecture}`.trim()}`,
      `views        ${s.views}`,
      `draw records ${s.draws}`,
      `batches      ${s.batches} (indirect draws per view)`,
      `cpu / frame  ${s.cpuMs.toFixed(2)} ms`,
      `gpu / frame  ${Number.isNaN(s.gpuMs) ? "n/a" : `${s.gpuMs.toFixed(2)} ms`}`,
      `canvas       ${canvas.width}×${canvas.height}`,
      ...(current3dTiles
        ? [
            `tiles        ${current3dTiles.stats.loaded} loaded / ${current3dTiles.stats.tiles} known`,
            `selected     ${selectedPerView(current3dTiles)}`,
            `loading      ${current3dTiles.stats.loading}`,
            `tile cache   ${(current3dTiles.stats.bytes / 1048576).toFixed(1)} MB`,
          ]
        : []),
    ].join("\n");
    if (current3dTiles) {
      $("#warnings").textContent =
        [...current3dTiles.warnings].join("\n") || "none";
    }
  }, 250);

  // A lost device (driver reset, out of memory) can't be recovered yet
  // (M2+ rebuilds worlds from CPU-side sources); say so instead of freezing.
  engine.gpu.events.on("lost", (info) => {
    $("#load-status").textContent =
      `GPU device lost (${info.message || info.reason}); reload the page.`;
  });

  engine.start();
  await load(current);
  Object.assign(globalThis, { engine, view, controller, load });
}

function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  $("#load-status").textContent = String(
    error instanceof Error ? error.message : error,
  );
});
