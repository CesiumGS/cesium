import {
  CanvasTarget,
  Ellipsoid,
  Engine,
  InspectController,
  createBox,
  createSurfacePatch,
  eastNorthUpToFixedFrame,
  fromDegrees,
  ionDefaults,
  BingImagery,
  mat4,
  resolveIonAsset,
  resolveITwinIModel,
  STAGES,
  summarizeContent,
  vec3,
  type ContentSummary,
  type ContentTotals,
  type DrawHandle,
  type Stage,
  type StageStats,
  type FeatureValue,
  type IonAttribution,
  type Tileset3D,
  type View,
  type ViewLink,
  type World,
} from "../src/index.ts";
import ionSource from "../../engine/Source/Core/Ion.js?raw";

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

/**
 * CesiumJS's public evaluation token, read from the 1.x source (kept current
 * by the repo's token workflow) rather than copied here.
 */
const defaultIonToken = /defaultAccessToken =\s*"([^"]+)"/.exec(ionSource)?.[1];

/** Public ion 3D Tiles assets (all from the Sandcastle gallery). */
const ION_ASSETS = [
  ["2275207", "Google Photorealistic 3D Tiles"],
  ["96188", "Cesium OSM Buildings"],
  ["75343", "New York City buildings"],
  ["40866", "Photogrammetry sample"],
  ["69380", "Photogrammetry (3D Tiles Compare)"],
  ["2464651", "BIM design model"],
  ["2887123", "Architectural design model"],
  ["2887129", "Architectural design site"],
  ["4665927", "Design model with edge visibility"],
  ["1670818", "Proposed building (Clipping Regions)"],
] as const;

/** Public demo iModels (the iModel mesh export Sandcastle). */
const IMODELS = [
  ["669dde67-eb69-4e0b-bcf2-f722eee94746", "Station (design model)"],
  ["f856f57d-3d28-4265-9c4f-5e60c0662c15", "Station surroundings"],
] as const;

let comboCount = 0;
/**
 * Combo box: a text input that takes a pasted id, with a list of known ids
 * under it, filtered by what's typed (name or id). Arrow keys move, Enter
 * picks or loads what was typed, Escape closes; picking loads. The box
 * keeps the bare id (so pasting one is obvious); `nameEl`, outside it,
 * names a known id. Returns `sync()` for values set from code.
 */
function combo(
  input: HTMLInputElement,
  options: ReadonlyArray<readonly [string, string]>,
  onLoad: () => void,
  nameEl: HTMLElement,
): () => void {
  const sync = () => {
    const name = options.find(([id]) => id === input.value.trim())?.[1];
    nameEl.textContent = name ? `· ${name}` : "";
  };
  const list = document.createElement("ul");
  list.className = "combo-list";
  list.id = `combo-list-${++comboCount}`;
  list.setAttribute("role", "listbox");
  list.hidden = true;
  // The chevron: shows there is a list, and opens or closes it.
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "combo-toggle";
  toggle.tabIndex = -1;
  toggle.setAttribute("aria-label", "Show known ids");
  toggle.setAttribute("aria-expanded", "false");
  toggle.innerHTML =
    '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  input.after(toggle);
  // The list spans the whole row (input and its button), not just the input.
  (input.closest(".combo-row") ?? input.parentElement!).append(list);
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-controls", list.id);
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  let shown: Array<readonly [string, string]> = [];
  let active = -1;
  const render = () => {
    list.replaceChildren();
    if (shown.length === 0) {
      const empty = document.createElement("li");
      empty.className = "combo-empty";
      empty.textContent = "No match: press Enter to load this id";
      list.append(empty);
    }
    shown.forEach(([id, name], i) => {
      const item = document.createElement("li");
      item.className = "combo-option";
      item.id = `${list.id}-${i}`;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(i === active));
      const n = document.createElement("span");
      n.className = "name";
      n.textContent = name;
      const v = document.createElement("span");
      v.className = "id";
      v.textContent = id;
      item.append(n, v);
      // mousedown: before the input's blur closes the list.
      item.addEventListener("mousedown", (e) => {
        e.preventDefault();
        pick(i);
      });
      list.append(item);
    });
    if (active >= 0) {
      input.setAttribute("aria-activedescendant", `${list.id}-${active}`);
      list.children[active]?.scrollIntoView({ block: "nearest" });
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  };
  const open = (filter: boolean) => {
    const q = filter ? input.value.trim().toLowerCase() : "";
    shown = options.filter(
      ([id, name]) => !q || id.includes(q) || name.toLowerCase().includes(q),
    );
    active = -1;
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-expanded", "true");
    render();
  };
  const close = () => {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  };
  const pick = (i: number) => {
    input.value = shown[i]![0];
    sync();
    close();
    onLoad();
  };
  // mousedown: keep focus in the input (its blur would close the list).
  toggle.addEventListener("mousedown", (e) => {
    e.preventDefault();
    if (!list.hidden) {
      close();
    } else if (document.activeElement !== input) {
      input.focus(); // opens the list
    } else {
      open(false);
    }
  });
  input.addEventListener("focus", () => open(false));
  input.addEventListener("click", () => list.hidden && open(false));
  input.addEventListener("input", () => {
    sync();
    open(true);
  });
  input.addEventListener("blur", close);
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (list.hidden) {
        open(false);
      }
      const n = shown.length;
      if (n > 0) {
        active =
          e.key === "ArrowDown" ? (active + 1) % n : (active - 1 + n) % n;
        render();
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (!list.hidden && active >= 0) {
        pick(active);
      } else {
        close();
        onLoad();
      }
    } else if (e.key === "Escape") {
      close();
    }
  });
  return sync;
}

type Source =
  | { kind: "model"; path: string }
  | { kind: "tileset"; path: string }
  | { kind: "ion"; asset: number }
  | { kind: "imodel"; id: string }
  | { kind: "city" };

const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;

function sourceFromUrl(): Source {
  const params = new URLSearchParams(location.search);
  const model = params.get("model");
  const tileset = params.get("tileset");
  const asset = params.get("asset");
  const imodel = params.get("imodel");
  if (model) {
    return { kind: "model", path: model };
  }
  if (tileset) {
    return { kind: "tileset", path: tileset };
  }
  if (asset) {
    return { kind: "ion", asset: Number(asset) };
  }
  if (imodel) {
    return { kind: "imodel", id: imodel };
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
    case "imodel":
      return `?imodel=${source.id}`;
    case "city":
      return "?scene=city";
  }
}

function sourceName(source: Source): string {
  switch (source.kind) {
    case "model":
    case "tileset":
      return label(source.path);
    case "ion":
      return (
        ION_ASSETS.find(([id]) => id === String(source.asset))?.[1] ??
        `ion asset ${source.asset}`
      );
    case "imodel":
      return (
        IMODELS.find(([id]) => id === source.id)?.[1] ??
        `iModel ${source.id.slice(0, 8)}…`
      );
    case "city":
      return "Synthetic city";
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
function addGlobe(world: World): DrawHandle[] {
  const draws: DrawHandle[] = [];
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
      draws.push(
        world.addDraw({
          mesh,
          origin: vec3.vec3(
            c * o[0]! - s * o[1]!,
            s * o[0]! + c * o[1]!,
            o[2]!,
          ),
          model,
          radius: patch.radius,
          color: [shade, shade * 1.4, shade * 2.2, 1],
          name: "globe",
        }),
      );
    }
  }
  return draws;
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
  /**
   * The current content, for the status line and the load timeline: name,
   * load start, endpoint resolved, root tileset ready (performance.now()),
   * and for a single model its pipeline.
   */
  interface LoadInfo {
    name: string;
    started: number;
    resolvedAt?: number;
    rootAt?: number;
    model?: {
      summary: ContentSummary;
      networkMs: number;
      decodeMs: number;
      uploadMs: number;
    };
  }
  let loadInfo: LoadInfo | undefined;
  let loadFailed = false;
  /** Why the last load failed, and its own (non-fatal) warnings. */
  let loadError: string | undefined;
  let loadWarnings = new Set<string>();
  let move: { stoppedAt: number; requests: number; bytes: number } | undefined;
  let lastMove: { ms: number; requests: number; bytes: number } | undefined;
  /** The streamed tileset in the current world, if any. */
  let current3dTiles: Tileset3D | undefined;
  let streamed: Tileset3D | undefined;
  /** Cesium World Terrain in the current world, and in the one loading. */
  let currentTerrain: Tileset3D | undefined;
  let nextTerrain: Tileset3D | undefined;
  let groundDraw: DrawHandle | undefined;
  let globeDraws: DrawHandle[] = [];
  /** Attributions the current ion assets require (HTML from ion). */
  let attributions: IonAttribution[] = [];
  let current = sourceFromUrl();
  // ion access token, first found: pasted in the viewer (this session, or
  // remembered on this device), VITE_ION_TOKEN from .env.local, CesiumJS's
  // evaluation token (public assets only). It becomes ionDefaults.accessToken.
  const envIonToken = import.meta.env.VITE_ION_TOKEN as string | undefined;
  const TOKEN_KEY = "viewer.ionToken";
  const storage = (remember: boolean) =>
    remember ? globalThis.localStorage : globalThis.sessionStorage;
  let pastedIonToken: string | undefined;
  try {
    pastedIonToken =
      sessionStorage.getItem(TOKEN_KEY) ??
      localStorage.getItem(TOKEN_KEY) ??
      undefined;
  } catch {
    // Storage unavailable: the pasted token lasts until reload.
  }
  /**
   * With the default token; a public asset that isn't in that account
   * (401/404) retries with CesiumJS's evaluation token, as Sandcastle would
   * load it. A viewer convenience, not engine behavior.
   */
  const resolveIon = async (asset: number) => {
    try {
      return await resolveIonAsset(asset);
    } catch (error) {
      const denied =
        error instanceof Error && /\((401|404)\)/.test(error.message);
      if (
        !denied ||
        !defaultIonToken ||
        ionDefaults.accessToken === defaultIonToken
      ) {
        throw error;
      }
      return resolveIonAsset(asset, { accessToken: defaultIonToken });
    }
  };
  // The ion default imagery (Bing Maps Aerial), with the same token fallback.
  const resolveBing = async () => {
    try {
      return await BingImagery.fromIon(2);
    } catch (error) {
      const denied =
        error instanceof Error && /\((401|404)\)/.test(error.message);
      if (
        !denied ||
        !defaultIonToken ||
        ionDefaults.accessToken === defaultIonToken
      ) {
        throw error;
      }
      return BingImagery.fromIon(2, { accessToken: defaultIonToken });
    }
  };
  const itwinShareKey = import.meta.env.VITE_ITWIN_SHARE_KEY as
    string | undefined;

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
  // Content source tabs: Samples, Cesium ion, iTwin. The selected tab
  // follows what's loaded; switching tabs only shows that source's inputs.
  const tabs = [...document.querySelectorAll<HTMLButtonElement>("[data-pane]")];
  const showPane = (pane: string) => {
    for (const tab of tabs) {
      const on = tab.dataset.pane === pane;
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
      $(`#pane-${tab.dataset.pane}`).hidden = !on;
    }
  };
  for (const tab of tabs) {
    tab.addEventListener("click", () => showPane(tab.dataset.pane!));
    tab.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const i = tabs.indexOf(tab);
        const next =
          tabs[
            (i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length
          ]!;
        showPane(next.dataset.pane!);
        next.focus();
      }
    });
  }
  const paneOf = (source: Source) =>
    source.kind === "ion"
      ? "ion"
      : source.kind === "imodel"
        ? "itwin"
        : "samples";
  // One sample list: glTF models, 3D Tiles, scenes.
  const sampleSelect = $<HTMLSelectElement>("#sample");
  const group = (name: string, entries: Array<[string, string]>) => {
    const g = document.createElement("optgroup");
    g.label = name;
    for (const [value, text] of entries) {
      g.append(new Option(text, value));
    }
    sampleSelect.append(g);
  };
  sampleSelect.append(new Option("Choose a sample…", ""));
  group(
    "glTF models",
    MODELS.map((path) => [`model:${path}`, label(path)]),
  );
  group(
    "3D Tiles (streamed)",
    TILESETS.map((path) => [`tileset:${path}`, label(path)]),
  );
  group("Scenes", [["city", "Synthetic city"]]);
  const sampleValue = (source: Source) =>
    source.kind === "model" || source.kind === "tileset"
      ? `${source.kind}:${source.path}`
      : source.kind === "city"
        ? "city"
        : "";
  const ionInput = $<HTMLInputElement>("#ion-asset");
  const ionButton = $<HTMLButtonElement>("#ion-load");
  const tokenInput = $<HTMLInputElement>("#ion-token");
  const tokenClear = $<HTMLButtonElement>("#ion-token-clear");
  const tokenRemember = $<HTMLInputElement>("#ion-token-remember");
  /** Applies the token precedence and says which one is in use. */
  const applyIonToken = () => {
    ionDefaults.accessToken = pastedIonToken ?? envIonToken ?? defaultIonToken;
    tokenInput.value = pastedIonToken ?? "";
    tokenClear.disabled = pastedIonToken === undefined;
    $("#ion-token-source").textContent = pastedIonToken
      ? "· pasted here"
      : envIonToken
        ? "· from .env.local"
        : "· CesiumJS evaluation token";
  };
  const setIonToken = (token: string | undefined) => {
    pastedIonToken = token;
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
      if (token) {
        storage(tokenRemember.checked).setItem(TOKEN_KEY, token);
      }
    } catch {
      // Storage unavailable.
    }
    applyIonToken();
    if (current.kind === "ion") {
      void load(current);
    }
  };
  try {
    tokenRemember.checked = localStorage.getItem(TOKEN_KEY) !== null;
  } catch {
    // Storage unavailable.
  }
  tokenInput.addEventListener("change", () =>
    setIonToken(tokenInput.value.trim() || undefined),
  );
  tokenClear.addEventListener("click", () => setIonToken(undefined));
  tokenRemember.addEventListener("change", () => setIonToken(pastedIonToken));
  applyIonToken();
  sampleSelect.addEventListener("change", () => {
    const v = sampleSelect.value;
    if (v === "city") {
      void load({ kind: "city" });
    } else if (v.startsWith("model:")) {
      void load({ kind: "model", path: v.slice(6) });
    } else if (v.startsWith("tileset:")) {
      void load({ kind: "tileset", path: v.slice(8) });
    }
  });
  // Combo boxes: paste any id, or pick a known one (picking loads it; Enter
  // loads what was typed).
  // Load acts only on a valid id that isn't what's already loaded: picking
  // from the list loads at once, so the button then disables, and pasting a
  // different id enables it. Nothing loads the same content twice.
  const ionId = () => {
    const asset = Number(ionInput.value.trim());
    return Number.isInteger(asset) && asset > 0 ? asset : undefined;
  };
  const imodelId = () => imodelInput.value.trim() || undefined;
  const syncLoadButtons = () => {
    const ion = ionId();
    ionButton.disabled =
      ion === undefined ||
      (!loadFailed && current.kind === "ion" && current.asset === ion);
    const imodel = imodelId();
    imodelButton.disabled =
      imodel === undefined ||
      (!loadFailed && current.kind === "imodel" && current.id === imodel);
  };
  const loadIon = () => {
    const asset = ionId();
    if (
      asset !== undefined &&
      !(!loadFailed && current.kind === "ion" && current.asset === asset)
    ) {
      void load({ kind: "ion", asset });
    }
  };
  ionInput.addEventListener("input", syncLoadButtons);
  ionButton.addEventListener("click", loadIon);
  const syncIonName = combo(
    ionInput,
    ION_ASSETS,
    loadIon,
    $("#ion-asset-name"),
  );
  const imodelInput = $<HTMLInputElement>("#imodel");
  const imodelButton = $<HTMLButtonElement>("#imodel-load");
  if (!itwinShareKey) {
    imodelInput.disabled = imodelButton.disabled = true;
    $("#imodel-hint").textContent =
      "Set VITE_ITWIN_SHARE_KEY in packages/next/.env.local to load iModels.";
  }
  const loadIModel = () => {
    const id = imodelId();
    if (
      id !== undefined &&
      !(!loadFailed && current.kind === "imodel" && current.id === id)
    ) {
      void load({ kind: "imodel", id });
    }
  };
  imodelInput.addEventListener("input", syncLoadButtons);
  imodelButton.addEventListener("click", loadIModel);
  const syncIModelName = combo(
    imodelInput,
    IMODELS,
    loadIModel,
    $("#imodel-name"),
  );
  $("#frame").addEventListener("click", () => frame());

  // ---------------------------------------------------------------- lighting UI
  const unlit = $<HTMLInputElement>("#unlit");
  const ground = $<HTMLInputElement>("#ground");
  unlit.addEventListener("change", () => void load(current));
  // Tile selection policy: reloads the tileset (selection state is per policy).
  const policySelect = $<HTMLSelectElement>("#policy");
  try {
    const saved = localStorage.getItem("viewer.policy");
    // An unknown saved value (e.g. the former "next") keeps the default.
    if (saved && [...policySelect.options].some((o) => o.value === saved)) {
      policySelect.value = saved;
    }
  } catch {
    // Storage unavailable.
  }
  policySelect.addEventListener("change", () => {
    try {
      localStorage.setItem("viewer.policy", policySelect.value);
    } catch {
      // Ignore.
    }
    if (
      current.kind === "tileset" ||
      current.kind === "ion" ||
      current.kind === "imodel"
    ) {
      void load(current);
    }
  });
  // Maximum screen-space error, on a log2 slider (1–128 px, 1.x default 16).
  // Applied live; the memory-adjusted threshold restarts from it.
  const sseInput = $<HTMLInputElement>("#sse");
  try {
    sseInput.value = localStorage.getItem("viewer.sse") ?? sseInput.value;
  } catch {
    // Storage unavailable.
  }
  const maximumSse = () => Math.round(2 ** Number(sseInput.value) * 10) / 10;
  const updateSse = () => {
    const sse = maximumSse();
    $("#sse-value").textContent = String(sse);
    if (current3dTiles) {
      current3dTiles.selection.maximumScreenSpaceError = sse;
      current3dTiles.selection.memoryAdjustedScreenSpaceError = sse;
    }
    // Selection settings live outside what the engine fingerprints.
    engine.requestRender();
    try {
      localStorage.setItem("viewer.sse", sseInput.value);
    } catch {
      // Ignore.
    }
  };
  sseInput.addEventListener("input", updateSse);
  updateSse();
  // Rendering: on demand by default; continuous on request (profiling,
  // animation work). Remembered on this device.
  const continuous = $<HTMLInputElement>("#continuous");
  try {
    continuous.checked = localStorage.getItem("viewer.continuous") === "1";
  } catch {
    // Storage unavailable.
  }
  const applyRenderMode = () => {
    engine.renderMode = continuous.checked ? "continuous" : "onDemand";
    try {
      localStorage.setItem("viewer.continuous", continuous.checked ? "1" : "0");
    } catch {
      // Ignore.
    }
  };
  continuous.addEventListener("change", applyRenderMode);
  applyRenderMode();
  // Terrain: reloads the scene (terrain lives in each scene's world).
  const terrainToggle = $<HTMLInputElement>("#terrain");
  try {
    terrainToggle.checked = localStorage.getItem("viewer.terrain") === "1";
  } catch {
    // Storage unavailable.
  }
  terrainToggle.addEventListener("change", () => {
    try {
      localStorage.setItem("viewer.terrain", terrainToggle.checked ? "1" : "0");
    } catch {
      // Ignore.
    }
    void load(current);
  });
  const globeToggle = $<HTMLInputElement>("#globe");
  globeToggle.addEventListener("change", () => {
    for (const draw of globeDraws) {
      world.setVisible(draw, globeToggle.checked);
    }
  });
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
    syncLoadButtons();
    const at = new URLSearchParams(location.search).get("at");
    history.replaceState(
      null,
      "",
      sourceToQuery(source) +
        (at && source.kind !== "model" ? `&at=${at}` : ""),
    );
    sampleSelect.value = sampleValue(source);
    showPane(paneOf(source));
    if (source.kind === "imodel") {
      imodelInput.value = source.id;
      syncIModelName();
    }
    if (source.kind === "ion") {
      ionInput.value = String(source.asset);
      syncIonName();
    }
    const status = $("#load-status");
    attributions = [];
    let photorealistic = false;
    const warnings = new Set<string>();
    const started = performance.now();
    const info: LoadInfo = { name: sourceName(source), started };
    loadInfo = undefined;
    loadFailed = false;
    loadError = undefined;
    loadWarnings = warnings;
    lastMove = undefined;
    move = undefined;
    status.textContent = "loading…";
    renderProblems();
    // Size the arenas within the device's storage-binding limit.
    const limit = engine.gpu.device.limits.maxStorageBufferBindingSize;
    const next = engine.createWorld({
      maxDraws: 1 << 16,
      maxMaterials: 1 << 13,
      vertexBytes: Math.min(768 << 20, Math.floor(limit / 4) * 4),
      indexBytes: Math.min(384 << 20, Math.floor(limit / 4) * 4),
    });
    try {
      const nextGlobe = addGlobe(next);
      let placed: { center: Float64Array; radius: number };
      if (source.kind === "city") {
        placed = addCity(next);
      } else if (source.kind === "model") {
        const asset = await engine.loadGltf(
          `/specs-data/Models/glTF-2.0/${source.path}`,
        );
        asset.warnings.forEach((w) => warnings.add(w));
        // Before the upload, which consumes the images.
        const summary = summarizeContent(asset);
        const uploadStart = performance.now();
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
        info.model = {
          summary,
          networkMs: asset.timing?.networkMs ?? 0,
          decodeMs: asset.timing?.decodeMs ?? 0,
          uploadMs: performance.now() - uploadStart,
        };
      } else {
        let url: string;
        let headers: Record<string, string> | undefined;
        if (source.kind === "ion") {
          const resolved = await resolveIon(source.asset);
          if (resolved.type !== "3DTILES") {
            throw new Error(
              resolved.type === "TERRAIN"
                ? `ion asset ${source.asset} is terrain, not 3D Tiles: turn on Cesium World Terrain in View`
                : `ion asset ${source.asset} is ${resolved.type.toLowerCase()}, not 3D Tiles`,
            );
          }
          url = resolved.url;
          headers = resolved.headers;
          attributions = resolved.attributions;
          // Photorealistic tiles from an external provider (Google) are
          // their own terrain: the placeholder ellipsoid would poke through
          // (sea level there is ~30 m below the ellipsoid), so it starts
          // hidden, as 1.x apps hide the globe for Google tiles.
          photorealistic = /tile\.googleapis\.com/.test(resolved.url);
          info.resolvedAt = performance.now();
        } else if (source.kind === "imodel") {
          // iTwin mesh export (signed link, about an hour).
          url = (
            await resolveITwinIModel(source.id, { shareKey: itwinShareKey })
          ).url;
          info.resolvedAt = performance.now();
        } else {
          url = new URL(
            `/specs-data/Cesium3DTiles/${source.path}`,
            location.href,
          ).href;
        }
        // Streamed: per-view selection (Budgeted unless chosen otherwise).
        const tileset = await engine.addTileset(next, url, {
          ...(headers ? { headers } : {}),
          policy: policySelect.value as "legacy1x" | "budgeted",
          maximumScreenSpaceError: maximumSse(),
        });
        info.rootAt = performance.now();
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
      // Terrain (Cesium World Terrain, ion asset 1), except under Google's
      // photorealistic tiles, which are their own terrain.
      if (terrainToggle.checked && !photorealistic) {
        const [ion, imagery] = await Promise.all([
          resolveIon(1),
          resolveBing().catch((error) => {
            warnings.add(
              `imagery: ${error instanceof Error ? error.message : String(error)}`,
            );
            return undefined;
          }),
        ]);
        attributions.push(...ion.attributions);
        if (imagery) {
          attributions.push(...imagery.attributions);
        }
        nextTerrain = await engine.addTerrain(next, ion.url, {
          headers: ion.headers,
          policy: policySelect.value as "legacy1x" | "budgeted",
          ...(imagery ? { imagery } : {}),
        });
        if (token !== loadToken) {
          throw new Error("superseded");
        }
      }
      globeToggle.checked = !photorealistic && !nextTerrain;
      globeDraws = nextGlobe;
      for (const draw of globeDraws) {
        next.setVisible(draw, globeToggle.checked);
      }
      if (current3dTiles) {
        engine.removeTileset(current3dTiles);
      }
      current3dTiles = streamed;
      streamed = undefined;
      if (currentTerrain) {
        engine.removeTileset(currentTerrain);
      }
      currentTerrain = nextTerrain;
      nextTerrain = undefined;
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
      loadInfo = info;
      renderProblems();
    } catch (error) {
      if (streamed) {
        engine.removeTileset(streamed);
        streamed = undefined;
      }
      if (nextTerrain) {
        engine.removeTileset(nextTerrain);
        nextTerrain = undefined;
      }
      engine.removeWorld(next);
      if (error instanceof Error && error.message === "superseded") {
        return;
      }
      if (token === loadToken) {
        loadFailed = true;
        syncLoadButtons();
        const message = error instanceof Error ? error.message : String(error);
        loadError = /arena is full/.test(message)
          ? `${message} The full-detail tileset is larger than the arena; streaming (M2) loads only what the view needs.`
          : message;
        status.innerHTML = `<span class="dot error"></span><span class="status-name">Couldn't load ${escapeHtml(sourceName(source))}</span>`;
        renderProblems();
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

  // ---------------------------------------------------------------- performance
  // Panels follow the data-viz rules: stat tiles for single values, meters
  // for a value against a limit, horizontal bars for comparing magnitudes
  // (the slowest stage emphasized, the rest gray), one stacked bar for
  // part-to-whole, small multiples for history. Text stays in text colors;
  // marks carry the data colors (CSS --series-*).
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
          [
            name,
            tileset.stats.selected.get(Math.log2(engine.viewBit(v))) ?? 0,
          ] as const,
      );
  const MB = 1048576;
  const mb = (bytes: number) =>
    `${(bytes / MB).toFixed(bytes < 10 * MB ? 1 : 0)} MB`;
  const duration = (ms: number) =>
    ms < 1000
      ? `${ms.toFixed(ms < 10 ? 1 : 0)} ms`
      : `${(ms / 1000).toFixed(1)} s`;
  const count = (n: number) =>
    n >= 1e6
      ? `${(n / 1e6).toFixed(1)}M`
      : n >= 1e4
        ? `${(n / 1e3).toFixed(0)}k`
        : n.toLocaleString();
  const pct = (fraction: number) =>
    `${(Math.max(0, Math.min(1, fraction)) * 100).toFixed(2)}%`;

  /** A meter track: fill against a limit; near the limit it turns warning. */
  const track = (fraction: number, options: { marker?: number } = {}) =>
    `<div class="track"><div class="fill${fraction > 0.9 ? " warn" : ""}" style="width:${pct(fraction)}"></div>${
      options.marker !== undefined
        ? `<div class="marker" style="left:${pct(options.marker)}"></div>`
        : ""
    }</div>`;
  const nearLimit = (fraction: number) =>
    fraction > 0.9 ? `<span class="status-warn">⚠ near limit</span>` : "";
  /** Stat tile: label, value, optional sub line and meter. */
  const tile = (label: string, value: string, sub = "", meter = "") =>
    `<div class="tile"><div class="tile-label">${label}</div><div class="tile-value">${value}</div>${meter}${
      sub ? `<div class="tile-sub">${sub}</div>` : ""
    }</div>`;
  /** Meter row for lists: label and value on one line, track below. */
  const meterRow = (label: string, value: string, fraction: number) =>
    `<div class="mrow"><div class="mrow-head"><span>${label}</span><span class="num">${value}</span></div>${track(fraction)}${nearLimit(fraction)}</div>`;
  /** One stacked bar (part-to-whole) with its legend. */
  const stacked = (
    title: string,
    parts: Array<{ label: string; value: number; text: string }>,
  ) => {
    const total = parts.reduce((sum, p) => sum + p.value, 0) || 1;
    return `<div class="chart"><div class="chart-title">${title}</div><div class="stack">${parts
      .filter((p) => p.value > 0)
      .map(
        (p) =>
          `<div class="seg s${parts.indexOf(p) + 1}" style="flex-grow:${p.value / total}" title="${p.label}: ${p.text}"></div>`,
      )
      .join("")}</div><div class="legend">${parts
      .map(
        (p, i) =>
          `<div class="legend-row"><span class="key s${i + 1}"></span><span>${p.label}</span><span class="num">${p.text}</span></div>`,
      )
      .join("")}</div></div>`;
  };

  const STAGE_LABELS: Record<Stage, string> = {
    queued: "Queued",
    network: "Network",
    worker: "Worker wait",
    decode: "Decode",
    uploadWait: "Upload wait",
    upload: "Upload",
  };
  /**
   * Where a load's time goes: one bar per stage (p50), a tick at p95; the
   * slowest stage in the accent color, the rest gray (emphasis).
   */
  const stageBars = (
    stages: Partial<Record<Stage, StageStats>>,
    note: string,
  ) => {
    const shown = STAGES.filter((s) => stages[s] !== undefined);
    const max = Math.max(1e-6, ...shown.map((s) => stages[s]!.p95));
    const slowest = shown.reduce((a, b) =>
      stages[b]!.p50 > stages[a]!.p50 ? b : a,
    );
    return `<div class="chart"><div class="chart-title">Where load time goes <span class="chart-note">${note}</span></div>${shown
      .map((s) => {
        const { p50, p95 } = stages[s]!;
        const tip =
          p95 !== p50
            ? `p50 ${duration(p50)}, p95 ${duration(p95)}`
            : duration(p50);
        return `<div class="hbar" title="${STAGE_LABELS[s]}: ${tip}"><span class="hbar-label">${STAGE_LABELS[s]}</span><span class="hbar-plot"><span class="hbar-bar${s === slowest ? " accent" : ""}" style="width:${pct(p50 / max)}"></span>${
          p95 !== p50
            ? `<span class="hbar-tick" style="left:${pct(p95 / max)}"></span>`
            : ""
        }</span><span class="hbar-value num">${duration(p50)}</span></div>`;
      })
      .join("")}</div>`;
  };
  /** Content mix: counts as tiles, decoded bytes as one stacked bar. */
  const contentMix = (t: ContentSummary | ContentTotals, formats: string) => {
    const images = Object.entries(t.images)
      .filter(([, n]) => n > 0)
      .map(([type, n]) => `${type.replace("image/", "").toUpperCase()} ${n}`)
      .join(" · ");
    const geometry = [
      t.lines > 0 ? `${count(t.lines)} lines` : "",
      t.points > 0 ? `${count(t.points)} points` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    return `<div class="tiles">${tile("Triangles", count(t.triangles), geometry)}${tile(
      "Features",
      count(t.features),
      formats || "",
    )}</div>${stacked("Decoded bytes", [
      {
        label: "Geometry",
        value: t.geometryBytes,
        text: mb(t.geometryBytes),
      },
      { label: "Textures", value: t.textureBytes, text: mb(t.textureBytes) },
    ])}${images ? `<div class="footnote">Images: ${images}</div>` : ""}`;
  };

  // History: small multiples, one series per row, hover for a moment's values.
  const HISTORY = 120; // 30 s at 4 Hz
  const samples = {
    cache: [] as number[],
    targets: [] as number[],
    inFlight: [] as number[],
    window: [] as number[],
    received: [] as number[],
    uploadQueue: [] as number[],
    decode: [] as number[],
    frames: [] as number[],
    cpu: [] as number[],
    gpu: [] as number[],
  };
  const push = (series: number[], value: number) => {
    series.push(value);
    if (series.length > HISTORY) {
      series.shift();
    }
  };
  const historyRows = (): Array<{
    name: string;
    series: number[];
    format: (v: number) => string;
    limit?: number[];
  }> => [
    { name: "Tile cache", series: samples.cache, format: mb },
    { name: "Render targets", series: samples.targets, format: mb },
    {
      name: "Requests in flight",
      series: samples.inFlight,
      format: (v) => v.toFixed(0),
      ...(current3dTiles ? { limit: samples.window } : {}),
    },
    {
      name: "Received",
      series: samples.received,
      format: (v) => `${(v / MB).toFixed(1)} MB/s`,
    },
    {
      name: "Upload queue",
      series: samples.uploadQueue,
      format: (v) => v.toFixed(0),
    },
    { name: "Decode p50", series: samples.decode, format: (v) => duration(v) },
    {
      name: "Frames rendered",
      series: samples.frames,
      format: (v) => `${v.toFixed(0)}/s`,
    },
    {
      name: "CPU frame",
      series: samples.cpu,
      format: (v) => `${v.toFixed(2)} ms`,
    },
    {
      name: "GPU frame",
      series: samples.gpu,
      format: (v) => `${v.toFixed(2)} ms`,
    },
  ];
  const historyCanvas = $<HTMLCanvasElement>("#history");
  const historyTip = $("#history-tip");
  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => css.getPropertyValue(name).trim();
  let hoverIndex: number | undefined;
  historyCanvas.addEventListener("pointermove", (e) => {
    const rect = historyCanvas.getBoundingClientRect();
    hoverIndex = Math.round(
      ((e.clientX - rect.left) / rect.width) * (HISTORY - 1),
    );
    drawHistory();
  });
  historyCanvas.addEventListener("pointerleave", () => {
    hoverIndex = undefined;
    drawHistory();
  });
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
    const rows = historyRows();
    const rowH = h / rows.length;
    const textH = 14 * dpr;
    const ink = token("--ink");
    const muted = token("--muted");
    const grid = token("--grid");
    const accent = token("--series-1");
    // Samples fill from the right: the newest is always at the right edge.
    const xAt = (i: number, n: number) =>
      ((HISTORY - n + i) / (HISTORY - 1)) * w;
    ctx.font = `${11 * dpr}px system-ui, sans-serif`;
    ctx.textBaseline = "top";
    rows.forEach(({ name, series, format, limit }, r) => {
      const top = r * rowH;
      const plotTop = top + textH + 2 * dpr;
      const plotH = rowH - textH - 6 * dpr;
      const max = Math.max(1e-6, ...(limit ?? []), ...series);
      const y = (v: number) => plotTop + plotH - (v / max) * plotH;
      ctx.fillStyle = muted;
      ctx.textAlign = "left";
      ctx.fillText(name, 0, top + 2 * dpr);
      ctx.fillStyle = ink;
      ctx.textAlign = "right";
      const last = series[series.length - 1] ?? 0;
      ctx.fillText(
        limit !== undefined
          ? `${format(last)} of ${limit[limit.length - 1] ?? 0}`
          : format(last),
        w,
        top + 2 * dpr,
      );
      // Baseline and, where there is one, the limit as a hairline.
      ctx.fillStyle = grid;
      ctx.fillRect(0, plotTop + plotH, w, dpr);
      if (limit !== undefined && limit.length > 1) {
        // The window over time, as a hairline reference.
        ctx.beginPath();
        limit.forEach((v, i) =>
          i === 0
            ? ctx.moveTo(xAt(i, limit.length), y(v))
            : ctx.lineTo(xAt(i, limit.length), y(v)),
        );
        ctx.strokeStyle = muted;
        ctx.lineWidth = dpr;
        ctx.stroke();
      }
      if (series.length > 1) {
        ctx.beginPath();
        series.forEach((v, i) =>
          i === 0
            ? ctx.moveTo(xAt(i, series.length), y(v))
            : ctx.lineTo(xAt(i, series.length), y(v)),
        );
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2 * dpr;
        ctx.lineJoin = ctx.lineCap = "round";
        ctx.stroke();
        ctx.lineTo(w, plotTop + plotH);
        ctx.lineTo(xAt(0, series.length), plotTop + plotH);
        ctx.closePath();
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = accent;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });
    // Crosshair and one tooltip with every series at that moment.
    if (hoverIndex === undefined) {
      historyTip.hidden = true;
      return;
    }
    const x = (hoverIndex / (HISTORY - 1)) * w;
    ctx.fillStyle = muted;
    ctx.fillRect(Math.round(x), 0, dpr, h);
    historyTip.replaceChildren();
    const when = document.createElement("div");
    when.className = "tip-when";
    when.textContent = `${((HISTORY - 1 - hoverIndex) / 4).toFixed(1)} s ago`;
    historyTip.append(when);
    for (const { name, series, format } of rows) {
      const i = series.length - HISTORY + hoverIndex;
      const row = document.createElement("div");
      row.className = "tip-row";
      const v = document.createElement("strong");
      v.textContent = i >= 0 && i < series.length ? format(series[i]!) : "—";
      const n = document.createElement("span");
      n.textContent = name;
      row.append(v, n);
      historyTip.append(row);
    }
    historyTip.hidden = false;
    const left = x / dpr;
    historyTip.style.left = `${left > historyCanvas.clientWidth / 2 ? left - historyTip.offsetWidth - 8 : left + 8}px`;
  }

  const adapter = engine.gpu.adapter.info;
  const streamingSection = $("#section-streaming");
  const streamingEl = $("#perf-streaming");
  const pipelineSection = $("#section-pipeline");
  const contentEl = $("#perf-content");
  let lastReceived = 0;
  let lastFrames = 0;
  let framesPerSecond = 0;
  // Last move: from when the camera stopped until streaming went idle, with
  // the requests and bytes the move cost (an L1′-style number, live).
  let cameraKey = "";
  function watchCamera(): void {
    const t = current3dTiles;
    const key = [view, second]
      .filter((v): v is View => v !== undefined)
      .map((v) =>
        [...v.camera.position, ...v.camera.direction]
          .map((x) => x.toFixed(3))
          .join(),
      )
      .join("|");
    const now = performance.now();
    if (key !== cameraKey) {
      if (cameraKey && t) {
        move ??= {
          stoppedAt: now,
          requests: t.stats.requestsTotal,
          bytes: t.stats.bytesReceived,
        };
        move.stoppedAt = now;
      }
      cameraKey = key;
    } else if (move && t?.idle && now - move.stoppedAt > 100) {
      lastMove = {
        ms: now - move.stoppedAt,
        requests: t.stats.requestsTotal - move.requests,
        bytes: t.stats.bytesReceived - move.bytes,
      };
      move = undefined;
    }
    requestAnimationFrame(watchCamera);
  }
  requestAnimationFrame(watchCamera);

  // Problems: the load error, the load's own warnings, and the warnings of
  // the content and terrain tilesets, right under Content. Hidden when
  // there are none; opens when an error appears.
  const problemsSection = $<HTMLDetailsElement>("#section-problems");
  const problemsList = $("#problems-list");
  const problemCount = () => {
    const warnings = new Set([
      ...loadWarnings,
      ...(current3dTiles?.warnings ?? []),
      ...(currentTerrain?.warnings ?? []),
    ]);
    return { error: loadError, warnings: warnings.size, list: [...warnings] };
  };
  let problemsKey = "";
  let shownError: string | undefined;
  function renderProblems(): void {
    const { error, list } = problemCount();
    const key = JSON.stringify([error, list]);
    if (key === problemsKey) {
      return;
    }
    const newError = error !== undefined && error !== shownError;
    shownError = error;
    problemsKey = key;
    problemsList.replaceChildren();
    const item = (kind: "error" | "warning", text: string) => {
      const li = document.createElement("li");
      li.className = kind;
      const label = document.createElement("strong");
      label.textContent = kind === "error" ? "✖ Error" : "⚠ Warning";
      const body = document.createElement("span");
      body.textContent = text;
      li.append(label, body);
      problemsList.append(li);
    };
    if (error) {
      item("error", error);
    }
    for (const warning of list) {
      item("warning", warning);
    }
    const n = (error ? 1 : 0) + list.length;
    problemsSection.hidden = n === 0;
    $("#problems-count").textContent = n > 0 ? `(${n})` : "";
    if (newError) {
      problemsSection.open = true;
    }
  }
  $("#load-status").addEventListener("click", (e) => {
    if ((e.target as Element).closest(".status-warnings")) {
      problemsSection.hidden = false;
      problemsSection.open = true;
      problemsSection.scrollIntoView({ block: "nearest" });
    }
  });
  setInterval(renderProblems, 500);

  function updatePerformance(): void {
    const s = engine.stats;
    framesPerSecond = (s.framesRendered - lastFrames) * 4;
    lastFrames = s.framesRendered;
    const t = current3dTiles;
    const tiles = t?.stats;
    if (loadInfo && !loadFailed) {
      // Streaming state only ("tiles up to date"), kept apart from the
      // renderer's own idle state once rendering is on demand (plan §13.8).
      const state = !t ? "loaded" : t.idle ? "current" : "streaming";
      const detail = !t
        ? "Loaded"
        : t.idle
          ? "Tiles up to date"
          : `Tiles loading · ${t.stats.inFlight} in flight, ${t.stats.uploadQueue} to upload`;
      const warningCount = problemCount().warnings;
      $("#load-status").innerHTML =
        `<span class="dot ${state}"></span><span class="status-name">${escapeHtml(loadInfo.name)}</span><span class="status-state">${detail}</span>${
          warningCount > 0
            ? `<button class="status-warnings" type="button">⚠ ${warningCount} warning${warningCount === 1 ? "" : "s"}</button>`
            : ""
        }`;
    }

    // Streaming: headline tiles, the load timeline, the last move.
    streamingSection.hidden = !tiles;
    if (t && tiles) {
      const views = selectedPerView(t);
      const total = views.reduce((sum, [, n]) => sum + n, 0);
      const cacheLimit = tiles.budget + tiles.overflow;
      const sse = t.selection.maximumScreenSpaceError;
      const tilesHtml = `<div class="tiles">${tile(
        "Selected",
        count(total),
        views.length > 1
          ? views.map(([name, n]) => `${name} ${count(n)}`).join(" · ")
          : `of ${count(tiles.tiles)} known`,
      )}${tile(
        "In flight",
        `${tiles.inFlight} <span class="of">of ${tiles.maxInFlight}</span>`,
        `${tiles.adaptive ? "adaptive" : "fixed"} window${tiles.protocol ? ` · ${tiles.protocol}` : ""} · ${tiles.cancelled} cancelled · ${tiles.uploadQueue} to upload`,
        track(tiles.inFlight / Math.max(1, tiles.maxInFlight)),
      )}${tile(
        "Tile cache",
        mb(tiles.bytes),
        `budget ${mb(tiles.budget)} + ${mb(tiles.overflow)} overflow ${nearLimit(tiles.bytes / cacheLimit)}`,
        track(tiles.bytes / cacheLimit, {
          marker: tiles.budget / cacheLimit,
        }),
      )}${tile(
        "Max SSE",
        `${sse} px`,
        `${tiles.screenSpaceError.toFixed(1)} memory-adjusted · ${tiles.placeholders} mixed-LOD`,
      )}</div>`;
      let timeline = "";
      if (loadInfo) {
        const at = (time: number | undefined) =>
          time === undefined ? undefined : time - loadInfo!.started;
        const now = performance.now() - loadInfo.started;
        const resolve = at(loadInfo.resolvedAt) ?? 0;
        const root = at(loadInfo.rootAt) ?? resolve;
        const first = at(t.firstContentAt);
        const settled = at(t.settledAt);
        const end = settled ?? now;
        const parts = [
          ...(loadInfo.resolvedAt !== undefined
            ? [
                {
                  label: "Resolve endpoint",
                  value: resolve,
                  text: duration(resolve),
                },
              ]
            : []),
          {
            label: "Root tileset",
            value: root - resolve,
            text: duration(root - resolve),
          },
          {
            label: "To first content",
            value: (first ?? end) - root,
            text: first !== undefined ? duration(first - root) : "…",
          },
          {
            label: settled !== undefined ? "To settled" : "Streaming",
            value: first !== undefined ? end - first : 0,
            text: first !== undefined ? duration(end - first) : "…",
          },
        ];
        timeline = stacked(
          `Load: ${settled !== undefined ? `settled in ${duration(settled)}` : `${duration(now)} so far`} <span class="chart-note">${count(tiles.requestsTotal)} requests · ${mb(tiles.bytesReceived)} received</span>`,
          parts,
        );
      }
      const moved = lastMove
        ? tile(
            "Last move settled in",
            duration(lastMove.ms),
            `${count(lastMove.requests)} requests · ${mb(lastMove.bytes)}`,
          )
        : tile("Last move", move ? "Settling…" : "—", "after the camera stops");
      streamingEl.innerHTML = `${tilesHtml + timeline}<div class="tiles">${moved}</div>`;
      renderProblems();
    }

    // Content pipeline: a tileset's recent loads, or the single model.
    const model = loadInfo?.model;
    pipelineSection.hidden = !t && !model;
    if (t) {
      const pipeline = t.pipeline();
      const formats = Object.entries(t.resident.formats)
        .filter(([, n]) => n > 0)
        .map(([f, n]) => `${f} ${count(n)}`)
        .join(" · ");
      contentEl.innerHTML =
        stageBars(
          pipeline.stages,
          `p50 bar · p95 tick · last ${pipeline.samples} loads`,
        ) + contentMix(t.resident, formats);
    } else if (model) {
      const one = (ms: number) => ({ p50: ms, p95: ms });
      contentEl.innerHTML =
        stageBars(
          {
            network: one(model.networkMs),
            decode: one(model.decodeMs),
            upload: one(model.uploadMs),
          },
          "one model",
        ) + contentMix(model.summary, model.summary.format);
    }

    // GPU & memory: what the renderer runs on, then every pool against its cap.
    $("#perf-frame").innerHTML =
      `<div class="kv"><span>Adapter</span><span>${escapeHtml(`${adapter.vendor} ${adapter.architecture}`.trim())}</span>` +
      `<span>Canvas</span><span class="num">${canvas.width} × ${canvas.height}</span>` +
      `<span>Views</span><span class="num">${s.views} · ${s.batches} batches each</span>` +
      `<span>Rendering</span><span>${engine.renderMode === "continuous" ? "continuous" : "on demand"} · ${
        framesPerSecond === 0 ? "idle" : `${framesPerSecond} frames/s`
      }</span></div>`;
    const m = world.memory;
    const targets = engine.renderTargetMemory;
    $("#perf-memory").innerHTML = [
      meterRow(
        "Vertex arena",
        `${mb(m.vertexBytes.used)} of ${mb(m.vertexBytes.capacity)}`,
        m.vertexBytes.used / m.vertexBytes.capacity,
      ),
      meterRow(
        "Index arena",
        `${mb(m.indexBytes.used)} of ${mb(m.indexBytes.capacity)}`,
        m.indexBytes.used / m.indexBytes.capacity,
      ),
      meterRow(
        "Draw records",
        `${count(m.draws.used)} of ${count(m.draws.capacity)}`,
        m.draws.used / m.draws.capacity,
      ),
      meterRow(
        "Materials",
        `${count(m.materials.used)} of ${count(m.materials.capacity)}`,
        m.materials.used / m.materials.capacity,
      ),
      meterRow(
        "Render targets",
        `${mb(targets.residentBytes)} resident · idle cap ${mb(targets.idleBudget)}`,
        targets.residentBytes / (targets.workingSetBytes + targets.idleBudget),
      ),
      `<div class="footnote">Fixed GPU tables: ${mb(m.tableBytes)} (records, lists, indirect args)</div>`,
    ].join("");

    push(samples.cache, tiles?.bytes ?? 0);
    push(samples.targets, targets.residentBytes);
    push(samples.inFlight, tiles?.inFlight ?? 0);
    push(samples.window, tiles?.maxInFlight ?? 0);
    const received = tiles?.bytesReceived ?? 0;
    push(samples.received, Math.max(0, received - lastReceived) * 4);
    lastReceived = received;
    push(samples.uploadQueue, tiles?.uploadQueue ?? 0);
    push(samples.decode, t ? t.pipeline().stages.decode.p50 : 0);
    // While idle no frame time is spent: the lines drop to zero.
    push(samples.frames, framesPerSecond);
    push(samples.cpu, framesPerSecond > 0 ? s.cpuMs : 0);
    push(
      samples.gpu,
      framesPerSecond > 0 && !Number.isNaN(s.gpuMs) ? s.gpuMs : 0,
    );
    drawHistory();
  }
  setInterval(updatePerformance, 250);

  // ---------------------------------------------------------------- credits
  // Provider logos in a compact pill, and a "Data attribution" panel listing
  // every credit: the providers' required notices, then the data credits of
  // the tiles on screen, most frequent first (as 1.x orders them). ion's
  // attribution HTML is parsed, not injected: only logo images, link URLs and
  // text are carried over.
  const logosEl = $("#credit-logos");
  const creditsToggle = $<HTMLButtonElement>("#credits-toggle");
  const creditsPanel = $("#credits-panel");
  const creditsList = $("#credits-list");
  const setCreditsOpen = (open: boolean) => {
    creditsPanel.hidden = !open;
    creditsToggle.setAttribute("aria-expanded", String(open));
  };
  creditsToggle.addEventListener("click", () =>
    setCreditsOpen(creditsPanel.hidden),
  );
  document.addEventListener("pointerdown", (e) => {
    const target = e.target as Node;
    if (
      !creditsPanel.hidden &&
      !creditsPanel.contains(target) &&
      !creditsToggle.contains(target)
    ) {
      setCreditsOpen(false);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      setCreditsOpen(false);
    }
  });
  const safeLink = (href: string | null) =>
    href && /^https?:/i.test(href) ? href : undefined;
  let creditsKey = "";
  setInterval(() => {
    const credits = current3dTiles?.credits() ?? [];
    const key = JSON.stringify([attributions, credits]);
    if (key === creditsKey) {
      return;
    }
    creditsKey = key;
    logosEl.replaceChildren();
    creditsList.replaceChildren();
    // Several ion assets each bring the ion logo and notice: show each once.
    const seen = new Set<string>();
    const link = (href: string, content: Node | string) => {
      const a = document.createElement("a");
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.append(content);
      return a;
    };
    const row = (text: string, href?: string) => {
      if (seen.has(text)) {
        return;
      }
      seen.add(text);
      const li = document.createElement("li");
      li.append(href ? link(href, text) : text);
      creditsList.append(li);
    };
    /** Text with its links (http/https only) and nothing else. */
    const inlineText = (doc: Document) => {
      const span = document.createElement("span");
      span.className = "credit-text";
      const walk = (node: Node) => {
        for (const child of node.childNodes) {
          if (child.nodeType === Node.TEXT_NODE) {
            span.append(child.textContent ?? "");
          } else if (child instanceof Element && child.tagName === "A") {
            const href = safeLink(child.getAttribute("href"));
            const text = child.textContent ?? "";
            span.append(href ? link(href, text) : text);
          } else {
            walk(child);
          }
        }
      };
      walk(doc.body);
      return span;
    };
    for (const { html } of attributions) {
      const doc = new DOMParser().parseFromString(html, "text/html");
      for (const img of doc.querySelectorAll("img")) {
        // Remote logos, data URIs and the engine's own bundled ones.
        const raw = img.getAttribute("src") ?? "";
        const src = /^data:image\//i.test(raw)
          ? raw
          : new URL(raw, location.href).href;
        if (!/^(https?:|data:image\/)/i.test(src) || seen.has(src)) {
          continue;
        }
        seen.add(src);
        const logo = document.createElement("img");
        logo.src = src;
        logo.alt = img.getAttribute("alt") ?? img.getAttribute("title") ?? "";
        logo.title = logo.alt;
        const href = safeLink(img.closest("a")?.getAttribute("href") ?? null);
        logosEl.append(href ? link(href, logo) : logo);
      }
      const text = doc.body.textContent?.trim();
      if (!text || seen.has(text)) {
        continue;
      }
      // Every provider notice stays on screen, whatever ion's collapsible
      // flag says (it marks © OpenStreetMap contributors collapsible, and
      // OSM expects its credit visible); long ones are truncated, with the
      // full text in the tooltip and the panel. Only per-tile data credits
      // live behind "Data attribution".
      const inline = inlineText(doc);
      inline.title = text;
      logosEl.append(inline);
      row(text, safeLink(doc.querySelector("a")?.getAttribute("href") ?? null));
    }
    for (const credit of credits) {
      row(credit);
    }
    const count = creditsList.childElementCount;
    creditsToggle.hidden = count === 0;
    creditsToggle.textContent = `Data attribution (${count})`;
    if (count === 0) {
      setCreditsOpen(false);
    }
  }, 500);

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
