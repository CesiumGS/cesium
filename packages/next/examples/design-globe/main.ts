// Design coordinates on the globe (plan 4b Task 18; DESIGN.md): a 50 km
// highway designed in California State Plane, drawn two ways, rigidly at
// one anchor as most viewers place a model, or reprojected through its CRS
// at every vertex, with a morph between them; and a portfolio of sites,
// each in its own country's CRS and height system.
//
// `run` returns its panel at once and loads afterwards, each step a named
// item in the status (page.ts `nextLoading`): the corridor's two tilesets
// (they draw, and morph, before PROJ is in: the morph needs only their
// tiles), the generator's answers, then PROJ, the grid catalog and the
// corridor's grid, through which `georeferenceTileset` places each tileset
// from its own declaration. Only then do picks give design coordinates, and
// the whiskers, the anchor ring and the sag chart appear. A portfolio site
// loads the same way when it's flown to.
//
// Seams for the next tasks: the measure tool (Task 19) takes `pickAt`, the
// sites' placements and `params.snap`; the checks, the tour and the toggles
// (Task 20) take the answers, the sag samples and `actions`.
import { createElement } from "react";
import {
  type Alignment,
  Alignment as AlignmentClass,
} from "../../src/engineering/alignment.ts";
import { compoundParts, crsUnits } from "../../src/engineering/crs.ts";
import { georeferenceTileset } from "../../src/engineering/georeferenceTileset.ts";
import { pickDesign } from "../../src/engineering/pick.ts";
import type { TilesetPlacement } from "../../src/engineering/placement.ts";
import {
  gridSource,
  loadGrids,
  loadProj,
  type GridSource,
  type ProjApi,
} from "../../src/engineering/proj.ts";
import { Ellipsoid } from "../../src/math/ellipsoid.ts";
import type { Tileset3D } from "../../src/streaming/Tileset3D.ts";
import type { ExampleContext, ExampleRun } from "../types.ts";
import { loadAnswers, type Answers } from "./answers.ts";
import { ANCHOR_STATION, CORRIDOR_ALIGNMENT } from "./corridor.ts";
import { fixed, unitSymbol } from "./measureModel.ts";
import {
  AnchorRing,
  CameraMoves,
  Whiskers,
  hexLinear,
  reducedMotion,
  sagSamples,
  type Framing,
  type SagSample,
} from "./overlays.ts";
import {
  EXAGGERATION,
  GRID_MODELS,
  MORPH_MS,
  SITES,
  cursorReadout,
  errorText,
  formatParams,
  morphValue,
  nextLoading,
  parseParams,
  retargetMorph,
  rigidVerdict,
  type LoadEvent,
  type LoadItem,
  type MorphTween,
  type PageParams,
  type Placement,
  type SiteEntry,
} from "./page.ts";
import { Panel } from "./panel/Panel.tsx";
import type {
  CursorView,
  LiveValues,
  PanelActions,
  PanelModel,
  SagView,
  SiteView,
} from "./panel/model.ts";
import { PlacementPair, type PairLook } from "./placementPair.ts";

/** Where the store's design-globe directory is served. */
const STORE = "/frames-data/design-globe/";
const PROJ_BASE = "/frames-data/proj/";
const GRID_BASE = "/proj-grids/";
const SETUP = "npm run setup -- --skip-build";
const deg = Math.PI / 180;

/**
 * The opening shot's camera, about the point midway between where rigid
 * draws the centreline and where it is: across the road from its left, at
 * about the rigid deck's height, so the rigid road stands in the air against
 * the sky with the true one on the ground below it. Heading relative to the
 * alignment's azimuth there.
 */
const OPENING_VIEW = { heading: -95 * deg, pitch: -3.5 * deg, range: 180 };
/** "Fly along": about 24 km in 24 s, slow enough for the tiles to keep up. */
const ALONG_MS = 24_000;

/** The placements' colours (DESIGN.md "On the globe"): orange rigid, cyan true. */
export const RIGID_HEX = "#fc9252";
export const REPROJECTED_HEX = "#3bcddc";
const LOOK: PairLook = {
  rigidTint: hexLinear("#ffc8a0"),
  reprojectedTint: hexLinear("#a8eef4"),
  rigidLine: hexLinear(RIGID_HEX),
  reprojectedLine: hexLinear(REPROJECTED_HEX),
  // The generator's one material (scripts/designTiles/gltf.mjs).
  baseColor: [0.45, 0.45, 0.43, 1],
};

/** What one site has loaded. */
interface SiteRuntime {
  readonly entry: SiteEntry;
  rigid?: Tileset3D;
  reprojected?: Tileset3D;
  rigidPlacement?: TilesetPlacement;
  reprojectedPlacement?: TilesetPlacement;
  pair?: PlacementPair;
  /** The loads under way (cleared on failure, so Retry runs them again). */
  tiles?: Promise<void>;
  frame?: Promise<void>;
  view?: Pick<SiteView, "frame" | "story">;
}

/** A small store: `get` the current value; listeners told once per frame. */
function createStore<T>(initial: T) {
  let value = initial;
  const listeners = new Set<() => void>();
  let queued = 0;
  return {
    get: () => value,
    set(next: T) {
      if (next === value) {
        return;
      }
      value = next;
      if (queued === 0) {
        queued = requestAnimationFrame(() => {
          queued = 0;
          for (const l of [...listeners]) {
            l();
          }
        });
      }
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    dispose: () => cancelAnimationFrame(queued),
  };
}

const isAbort = (e: unknown) =>
  e instanceof DOMException && e.name === "AbortError";
const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e));
/** What the frames store doesn't have (setup not run). */
class MissingError extends Error {}
/** A fetch the store didn't have. */
const isMissing = (e: unknown) =>
  e instanceof MissingError ||
  /\b404\b|Not Found|: not JSON$/.test(messageOf(e));

/** Text that goes into an HTML credit: escaped (catalog fields are data). */
const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

export function run(context: ExampleContext): ExampleRun {
  const { viewer, scope, signal } = context;
  const token = context.accessToken;
  /** The token never enters what the page shows. */
  const scrub = (text: string) =>
    token !== undefined && token.length >= 8
      ? text.split(token).join("[redacted]")
      : text;
  let disposed = false;
  scope.defer(() => {
    disposed = true;
  });

  // The HUD over the canvas: the cursor readout, the legend, the anchor's label.
  const hud = document.createElement("div");
  hud.className = "dg-hud-host";
  viewer.container.append(hud);
  scope.defer(() => hud.remove());

  viewer.view.camera.near = 0.1;
  const corridorAlignment: Alignment = new AlignmentClass(CORRIDOR_ALIGNMENT);

  // ------------------------------------------------------------ state
  let params: PageParams = parseParams(context.params);
  let loading: readonly LoadItem[] = [];
  let ghost = true;
  let exaggerate = false;
  let tween: MorphTween = {
    from: params.mode === "reprojected" ? 1 : 0,
    to: params.mode === "reprojected" ? 1 : 0,
    start: 0,
    duration: 0,
  };
  let morphing = false;
  let answers: Answers | undefined;
  let samples: readonly SagSample[] | undefined;
  let cursor: CursorView = {
    text: cursorReadout({ mode: params.mode, morphing: false, exaggeration: 1 })
      .text,
    muted: false,
  };
  let alongStation: number | undefined;
  let anchorPoint: Float64Array | undefined;
  const sites = new Map<string, SiteRuntime>(
    SITES.map((entry) => [entry.id, { entry }]),
  );
  const corridor = sites.get("corridor")!;

  const live = createStore<LiveValues>({});
  scope.defer(() => live.dispose());
  /** The panel's model: made once everything it reads is declared (below). */
  const model: { store?: ReturnType<typeof createStore<PanelModel>> } = {};
  const refresh = () => {
    if (!disposed) {
      model.store?.set(buildModel());
    }
  };
  const report = (event: LoadEvent) => {
    const next = nextLoading(loading, {
      ...event,
      ...("detail" in event && { detail: scrub(event.detail ?? "") }),
    } as LoadEvent);
    if (next !== loading) {
      loading = next;
      refresh();
    }
  };

  function exaggeration(): number {
    return exaggerate ? EXAGGERATION : 1;
  }
  function morphT(): number {
    return morphValue(tween, performance.now());
  }

  // ------------------------------------------------------------ camera
  /**
   * The clock at 10:30 local solar time on the 2026 September equinox, at
   * a body-fixed point's longitude, paused: every site is seen in the same
   * mid-morning light, the sun to the east and high enough for relief.
   */
  function daylight(at: ArrayLike<number>): void {
    const longitude = Math.atan2(at[1]!, at[0]!);
    const hours = 10.5 - longitude / deg / 15;
    viewer.clock.time = Date.UTC(2026, 8, 23) + hours * 3_600_000;
    viewer.clock.mode = "paused";
  }

  const camera = new CameraMoves(viewer, () => {
    if (!camera.flying && alongStation !== undefined) {
      endAlong();
    }
    refresh();
  });
  scope.defer(() => camera.stop());

  /** The opening shot: low and oblique near the far end, both placements in view. */
  function openingShot(a: Answers): Framing | undefined {
    const p =
      a.points.find((q) => q.nearKm === 20) ??
      a.points.reduce((x, y) => (y.displayError > x.displayError ? y : x));
    if (p === undefined) {
      return undefined;
    }
    const center = p.bodyFixed.map((v, k) => (v + p.rigidDisplayed[k]!) / 2);
    return {
      center,
      ...OPENING_VIEW,
      heading: corridorAlignment.azimuthAt(p.station) + OPENING_VIEW.heading,
    };
  }

  /** The corridor's point at `station` on the centreline, true, by the samples. */
  function corridorAt(station: number): Float64Array | undefined {
    if (samples === undefined || samples.length < 2) {
      return undefined;
    }
    const first = samples[0]!.station;
    const step = samples[1]!.station - first;
    const i = Math.max(
      0,
      Math.min(samples.length - 2, Math.floor((station - first) / step)),
    );
    const a = samples[i]!;
    const b = samples[i + 1]!;
    const f = Math.max(
      0,
      Math.min(1, (station - a.station) / (b.station - a.station)),
    );
    // Halfway between the placements, so both stay in view.
    return Float64Array.from([0, 1, 2], (k) => {
      const mid = (s: SagSample) => (s.truth[k]! + s.rigid[k]!) / 2;
      return mid(a) + (mid(b) - mid(a)) * f;
    });
  }

  /** Down the corridor from the far end to the anchor, the error read live. */
  function flyAlong(): void {
    if (answers === undefined || samples === undefined) {
      return;
    }
    const from =
      answers.points.find((q) => q.nearKm === 20)?.station ??
      corridorAlignment.endStation;
    const to = answers.anchorStation;
    const first = framingAlong(from, 0);
    if (first === undefined) {
      return;
    }
    const along = () => {
      alongStation = from;
      camera.run(
        (u) => {
          const station = from + (to - from) * u;
          alongStation = station;
          live.set({ ...live.get(), station });
          return framingAlong(station, u)!;
        },
        reducedMotion() ? 0 : ALONG_MS,
        { done: endAlong },
      );
    };
    // To the far end first, unless the camera is there.
    camera.flyTo(first, along);
  }

  /** The flight along ended (arrived, or the user took the camera). */
  function endAlong(): void {
    if (alongStation !== undefined) {
      alongStation = undefined;
      live.set({ ...live.get(), station: undefined });
      refresh();
    }
  }

  /**
   * The camera along the corridor at `station`, `u` of the way to the
   * anchor: across the road at the rigid deck's height at first, rising as
   * the gap closes so the anchor ring shows from above at the end.
   */
  function framingAlong(station: number, u: number): Framing | undefined {
    const center = corridorAt(station);
    const k = u * u;
    return center === undefined
      ? undefined
      : {
          center,
          heading: corridorAlignment.azimuthAt(station) + OPENING_VIEW.heading,
          pitch: OPENING_VIEW.pitch + (-30 * deg - OPENING_VIEW.pitch) * k,
          range: OPENING_VIEW.range + (420 - OPENING_VIEW.range) * k,
        };
  }

  // -------------------------------------------------------------- morph
  let morphFrame = 0;
  /** Gives the morph's `t` and the exaggeration to every pair and the whiskers. */
  function applyMorph(): void {
    const t = morphT();
    const k = exaggeration();
    const settled = t === tween.to;
    for (const site of sites.values()) {
      site.pair?.setState({
        t,
        morphing: !settled,
        exaggeration: k,
        ghost,
      });
    }
    whiskers?.set(t, k);
    viewer.engine.requestRender();
    if (morphing !== !settled) {
      morphing = !settled;
      updateCursor(undefined);
      refresh();
    }
    if (!settled && morphFrame === 0) {
      morphFrame = requestAnimationFrame(() => {
        morphFrame = 0;
        if (!disposed) {
          applyMorph();
        }
      });
    }
  }
  scope.defer(() => cancelAnimationFrame(morphFrame));

  function setMode(mode: Placement): void {
    if (mode === params.mode && tween.to === (mode === "rigid" ? 0 : 1)) {
      return;
    }
    params = { ...params, mode };
    context.setParams(formatParams(params));
    tween = retargetMorph(
      tween,
      mode === "rigid" ? 0 : 1,
      performance.now(),
      reducedMotion() ? 0 : MORPH_MS,
    );
    applyMorph();
    refresh();
  }

  // --------------------------------------------------------- the globe
  let whiskers: Whiskers | undefined;
  let ring: AnchorRing | undefined;
  scope.defer(() => {
    whiskers?.dispose();
    ring?.dispose();
  });

  /**
   * Whether the store has a tileset at `path`: a dev server answers a
   * missing file with its own page, so the answer must be JSON.
   */
  async function isTileset(path: string): Promise<boolean> {
    const r = await fetch(`${STORE}${path}tileset.json`, {
      method: "HEAD",
      signal,
    }).catch(() => undefined);
    return (
      r !== undefined &&
      r.ok &&
      /json/.test(r.headers.get("Content-Type") ?? "")
    );
  }

  /** Adds a site's tilesets (both placements where it has them). */
  function loadTiles(site: SiteRuntime): Promise<void> {
    site.tiles ??= (async () => {
      const id = `tiles:${site.entry.id}`;
      report({
        type: "start",
        id,
        label: `${site.entry.name}: tiles`,
      });
      const add = (path: string) =>
        viewer.addTileset(`${STORE}${path}tileset.json`, {
          retainGeometry: true,
        });
      try {
        const { tilesets } = site.entry;
        let pair = tilesets.reprojected
          ? { rigid: tilesets.rigid, reprojected: tilesets.reprojected }
          : undefined;
        if (pair === undefined && tilesets.pair !== undefined) {
          // The scale ladder's pair, when setup has written it (Task 17b).
          if (await isTileset(tilesets.pair.reprojected)) {
            pair = tilesets.pair;
          }
        }
        if (!(await isTileset(pair?.rigid ?? tilesets.rigid))) {
          throw new MissingError(`${STORE}${pair?.rigid ?? tilesets.rigid}`);
        }
        const [rigid, reprojected] = await Promise.all([
          add(pair?.rigid ?? tilesets.rigid),
          pair ? add(pair.reprojected) : undefined,
        ]);
        if (disposed) {
          viewer.remove(rigid);
          if (reprojected) {
            viewer.remove(reprojected);
          }
          return;
        }
        site.rigid = rigid;
        scope.defer(() => viewer.remove(rigid));
        if (reprojected !== undefined) {
          site.reprojected = reprojected;
          scope.defer(() => viewer.remove(reprojected));
          // The farthest a vertex moves, in the rigid tiles' model units
          // (US survey feet for the corridor), at the largest exaggeration:
          // 40 m of error at most anywhere on the ladder (Task 17b's table).
          site.pair = new PlacementPair(
            viewer.world,
            rigid,
            reprojected,
            LOOK,
            (40 * EXAGGERATION) / 0.3,
          );
          scope.defer(() => site.pair?.dispose());
          applyMorph();
        }
        watchTiles(site, id);
      } catch (error) {
        site.tiles = undefined;
        if (isAbort(error) || disposed) {
          return;
        }
        report(
          isMissing(error)
            ? {
                type: "missing",
                id,
                detail: `${site.entry.name}'s tilesets aren't in the frames store. Generate them once, in packages/next: ${SETUP}`,
              }
            : {
                type: "error",
                id,
                detail: `${site.entry.name}'s tiles didn't load: ${messageOf(error)}`,
              },
        );
        throw error;
      }
    })();
    return site.tiles;
  }

  /** The tiles' item: fetching with bytes until the first view is in. */
  function watchTiles(site: SiteRuntime, id: string): void {
    const step = () => {
      if (disposed) {
        return;
      }
      const sets = [site.rigid, site.reprojected].filter(
        (t): t is Tileset3D => t !== undefined,
      );
      const received = sets.reduce((n, t) => n + t.stats.bytesReceived, 0);
      const settled = sets.every(
        (t) => t.firstContentAt !== undefined && t.idle,
      );
      if (settled) {
        const tiles = sets.reduce((n, t) => n + t.stats.loaded, 0);
        report({
          type: "progress",
          id,
          file: "tiles",
          received,
        });
        report({
          type: "ready",
          id,
          detail: `${tiles} tiles in view${sets.length > 1 ? ", both placements" : ""}`,
        });
        return;
      }
      report({ type: "progress", id, file: "tiles", received });
      setTimeout(step, 250);
    };
    step();
  }

  // ---------------------------------------------- PROJ, the catalog, grids
  let proj: Promise<ProjApi> | undefined;
  let catalog: Promise<GridSource> | undefined;

  function loadPROJ(): Promise<ProjApi> {
    proj ??= (async () => {
      report({ type: "start", id: "proj", label: "PROJ" });
      try {
        const api = await loadProj({
          base: PROJ_BASE,
          onProgress: (file, received, total) =>
            report({
              type: "progress",
              id: "proj",
              file,
              received,
              ...(total !== undefined && { total }),
            }),
        });
        report({
          type: "ready",
          id: "proj",
          detail: "WebAssembly and proj.db, verified",
        });
        return api;
      } catch (error) {
        proj = undefined;
        report(
          isMissing(error)
            ? {
                type: "missing",
                id: "proj",
                detail: `PROJ isn't in the frames store. Run once, in packages/next: ${SETUP}`,
              }
            : {
                type: "error",
                id: "proj",
                detail: `PROJ didn't load: ${messageOf(error)}. If the frames store isn't set up yet, run ${SETUP} in packages/next.`,
              },
        );
        throw error;
      }
    })();
    return proj;
  }

  function loadCatalog(): Promise<GridSource> {
    catalog ??= (async () => {
      report({ type: "start", id: "catalog", label: "Grid catalog" });
      try {
        const source = await gridSource({
          base: GRID_BASE,
          onProgress: (file, received, total) =>
            report({
              type: "progress",
              id: "catalog",
              file,
              received,
              ...(total !== undefined && { total }),
            }),
        });
        report({
          type: "ready",
          id: "catalog",
          detail: `PROJ-data ${source.catalog.version}, verified`,
        });
        return source;
      } catch (error) {
        catalog = undefined;
        report({
          type: "error",
          id: "catalog",
          detail: `The grid catalog didn't load from ${GRID_BASE}: ${messageOf(error)}`,
        });
        throw error;
      }
    })();
    return catalog;
  }

  /** The site's grids, each its own item with bytes, then its placements. */
  function loadFrame(site: SiteRuntime): Promise<void> {
    site.frame ??= (async () => {
      try {
        const [api, source] = await Promise.all([loadPROJ(), loadCatalog()]);
        await loadTiles(site);
        const names = site.entry.grids;
        await Promise.all(
          names.map(async (name) => {
            const id = `grid:${name}`;
            const label = `${GRID_MODELS[name] ?? name} grid`;
            report({ type: "start", id, label });
            try {
              await loadGrids(api, source, [name], {
                onProgress: (file, received, total) =>
                  report({
                    type: "progress",
                    id,
                    file,
                    received,
                    ...(total !== undefined && { total }),
                  }),
              });
              const entry = source.catalog.get(name);
              report({
                type: "ready",
                id,
                ...(entry && { detail: `${entry.agency}, verified` }),
              });
            } catch (error) {
              report({
                type: "error",
                id,
                detail: `${name} didn't load from ${GRID_BASE}: ${messageOf(error)}`,
              });
              throw error;
            }
          }),
        );
        if (disposed) {
          return;
        }
        const placeId = `frame:${site.entry.id}`;
        report({
          type: "start",
          id: placeId,
          label: `${site.entry.name}: placements`,
        });
        try {
          const options = { proj: api, grids: source };
          const placed = await Promise.all(
            [site.rigid, site.reprojected].map((t) =>
              t ? georeferenceTileset(t, options) : undefined,
            ),
          );
          const [first, second] = placed;
          for (const p of [first, second]) {
            if (p?.mode === "rigid") {
              site.rigidPlacement = p;
            } else if (p?.mode === "reprojected") {
              site.reprojectedPlacement = p;
            }
          }
          report({
            type: "ready",
            id: placeId,
            detail: "placed from each tileset's own declaration",
          });
        } catch (error) {
          report({
            type: "error",
            id: placeId,
            detail: messageOf(error),
          });
          throw error;
        }
        siteReady(site, api);
      } catch (error) {
        site.frame = undefined;
        if (!isAbort(error) && !disposed) {
          console.warn(scrub(messageOf(error)));
        }
      }
    })();
    return site.frame;
  }

  /** A site's frame is in: its panel facts, and the corridor's evidence. */
  function siteReady(site: SiteRuntime, api: ProjApi): void {
    const placement = site.rigidPlacement ?? site.reprojectedPlacement;
    if (placement === undefined) {
      return;
    }
    const frame = placement.frame;
    const units = crsUnits(api, site.entry.crs);
    const parts = compoundParts(api, site.entry.crs);
    const symbol = unitSymbol(units.horizontalUnitName);
    const accuracy =
      frame.operation.accuracy !== undefined
        ? `±${fixed(frame.operation.accuracy, 3)} m, as PROJ states the operation`
        : "PROJ states no accuracy for this operation";
    const fallback =
      frame.fallback !== undefined
        ? `${frame.fallback.model} fallback: design heights are read as ${frame.fallback.model} heights; ${frame.fallback.sigma !== undefined ? `±${frame.fallback.sigma} m` : "its offset from the real height system is not stated"}`
        : undefined;
    let edge: number | undefined;
    let extent = site.entry.extent;
    const rigid = site.rigidPlacement;
    if (
      site.entry.id === "corridor" &&
      site.rigidPlacement &&
      site.reprojectedPlacement
    ) {
      samples = sagSamples(
        corridorAlignment,
        site.rigidPlacement,
        site.reprojectedPlacement,
        1000,
      );
      edge = Math.max(...samples.map((s) => s.error));
      // Along the alignment, not across: a highway's extent is its length.
      extent = corridorAlignment.length * frame.units.metersPerUnit;
      buildCorridorEvidence(site);
    } else if (rigid !== undefined && site.entry.corners) {
      edge = Math.max(...site.entry.corners.map((c) => rigid.displayError(c)));
      const shown = site.entry.corners.map((c) => rigid.displayed(c));
      extent = Math.max(
        ...shown.flatMap((a) =>
          shown.map((b) =>
            Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!),
          ),
        ),
      );
    }
    const verdict = edge === undefined ? undefined : rigidVerdict(edge);
    site.view = {
      frame: {
        horizontal: parts?.horizontal.name ?? site.entry.codes,
        ...(parts?.vertical && { vertical: parts.vertical.name }),
        units: `${units.horizontalUnitName} (${symbol})`,
        accuracy,
        credits: frame.gridCredits,
        ...(fallback && { fallback }),
      },
      ...(edge !== undefined &&
        verdict !== undefined && {
          story: {
            extent: `${
              extent >= 1000
                ? `${fixed(extent / 1000, 1)} km`
                : `${fixed(extent, 0)} m`
            } ${site.entry.id === "corridor" ? "long" : "across"}`,
            edgeError: errorText(edge),
            acceptable: verdict.acceptable,
            verdict: verdict.text,
          },
        }),
    };
    // The grids' credits, with the data credits (bottom left).
    if (frame.gridCredits.length > 0) {
      viewer.addAttributions(
        site,
        frame.gridCredits.map((c) => ({
          html: `Grids: ${escapeHtml(c)}`,
          collapsible: true,
        })),
      );
      scope.defer(() => viewer.addAttributions(site, []));
    }
    refresh();
  }

  /** The whiskers and the anchor ring. */
  function buildCorridorEvidence(site: SiteRuntime): void {
    if (
      samples === undefined ||
      !site.rigidPlacement ||
      !site.reprojectedPlacement
    ) {
      return;
    }
    whiskers?.dispose();
    whiskers = new Whiskers(viewer.world, samples, 40 * EXAGGERATION + 1);
    const station = answers?.anchorStation ?? ANCHOR_STATION;
    const [e, n] = corridorAlignment.pointAt(station, 0);
    anchorPoint = site.reprojectedPlacement.displayed([
      e!,
      n!,
      corridorAlignment.elevationAt(station),
    ]);
    ring?.dispose();
    ring = new AnchorRing(viewer.world, anchorPoint, 30);
    applyMorph();
  }

  // ---------------------------------------------------------- picking
  /** Every loaded site's tilesets, for picks. */
  const pickable = () =>
    [...sites.values()].flatMap((s) =>
      [s.rigid, s.reprojected].filter((t): t is Tileset3D => t !== undefined),
    );

  /**
   * A design pick at CSS pixel (x, y) of the view (Task 15), and the site it
   * hit: the seam the measure tool (Task 19) takes.
   */
  async function pickAt(x: number, y: number) {
    const hit = await pickDesign(viewer.view, x, y, pickable());
    const site = [...sites.values()].find(
      (s) =>
        hit?.tileset !== undefined &&
        (s.rigid === hit.tileset || s.reprojected === hit.tileset),
    );
    return { hit, site };
  }

  let picking = false;
  /** The readout says why there are no design coordinates (moving, exaggerated). */
  let cursorBlocked = false;
  let pendingPick: [number, number] | undefined;
  function updateCursor(at: [number, number] | undefined): void {
    if (at !== undefined) {
      pendingPick = at;
    }
    const base = cursorReadout({
      mode: params.mode,
      morphing,
      exaggeration: params.mode === "rigid" ? exaggeration() : 1,
    });
    if (!base.design) {
      cursor = { text: base.text, muted: true };
      cursorBlocked = true;
      refresh();
      return;
    }
    if (cursorBlocked) {
      // Settled again: the readout waits for the next pick.
      cursorBlocked = false;
      cursor = { text: base.text, muted: false };
      refresh();
    }
    if (picking || pendingPick === undefined) {
      return;
    }
    const [x, y] = pendingPick;
    pendingPick = undefined;
    picking = true;
    void pickAt(x, y)
      .then(({ hit, site }) => {
        // A pick from before a morph or the exaggeration began says nothing now.
        if (disposed || cursorBlocked) {
          return;
        }
        const design = hit?.design;
        const rigid = site?.rigidPlacement;
        if (design === undefined || site === undefined) {
          cursor = {
            text:
              hit === undefined
                ? cursorReadout({
                    mode: params.mode,
                    morphing,
                    exaggeration: 1,
                  }).text
                : site === undefined
                  ? "No design model here."
                  : "This site's frame is still loading: no design coordinates yet.",
            muted: hit === undefined || site === undefined,
          };
          return;
        }
        const d = design.design;
        const frame = design.engineeringFrame;
        let station: number | undefined;
        let offset: number | undefined;
        const alignment = frame.alignments[0];
        if (alignment !== undefined) {
          try {
            const so = alignment.stationOffset(d);
            if (
              so.station >= alignment.startStation &&
              so.station <= alignment.endStation
            ) {
              station = so.station;
              offset = so.offset;
            }
          } catch {
            // No station off the alignment's ends: none is shown.
          }
        }
        const error = rigid?.displayError(d) ?? 0;
        const symbol = unitSymbol(frame.units.horizontalUnitName);
        const read = cursorReadout({
          mode: params.mode,
          morphing,
          exaggeration: 1,
          hit: {
            error,
            ...(station !== undefined && { station }),
            ...(offset !== undefined && { offset }),
          },
        });
        const vertical = site.view?.frame?.vertical;
        cursor = {
          text: read.text,
          coordinates: `E ${fixed(d[0]!, 2)}  N ${fixed(d[1]!, 2)} ${symbol}  ·  H ${fixed(d[2]!, 2)} ${vertical ?? symbol}`,
          tolerance: `pick ±${errorText(hit!.tolerance)} (one pixel there)`,
          muted: false,
        };
      })
      .catch(() => {
        // A pick that fails (the view resized away) shows nothing new.
      })
      .finally(() => {
        picking = false;
        refresh();
        if (pendingPick !== undefined) {
          updateCursor(undefined);
        }
      });
  }
  const onMove = (e: PointerEvent) => {
    if (e.buttons !== 0) {
      return;
    }
    const r = viewer.canvas.getBoundingClientRect();
    updateCursor([e.clientX - r.left, e.clientY - r.top]);
  };
  viewer.canvas.addEventListener("pointermove", onMove, { signal });

  // ----------------------------------------------------- the frame loop
  let frame = 0;
  let lastCamera = -1;
  let lastPickCamera = -1;
  const tick = () => {
    if (disposed) {
      return;
    }
    for (const site of sites.values()) {
      site.pair?.sweep();
      if (site.pair?.takeChanged()) {
        viewer.engine.requestRender();
      }
    }
    const cam = viewer.view.camera;
    // The camera moved: what was under the cursor no longer is.
    if (cam.version !== lastPickCamera) {
      lastPickCamera = cam.version;
      if (cursor.coordinates !== undefined) {
        cursor = {
          text: cursorReadout({ mode: params.mode, morphing, exaggeration: 1 })
            .text,
          muted: false,
        };
        refresh();
      }
    }
    // The anchor's label, when the camera moved.
    if (cam.version !== lastCamera && anchorPoint !== undefined) {
      lastCamera = cam.version;
      // Only in front of the camera, above the anchor's horizon and near.
      const to = [0, 1, 2].map((k) => cam.position[k]! - anchorPoint![k]!);
      const up = new Float64Array(3);
      Ellipsoid.WGS84.geodeticSurfaceNormal(anchorPoint, up);
      const seen =
        Math.hypot(to[0]!, to[1]!, to[2]!) < 60_000 &&
        to[0]! * up[0]! + to[1]! * up[1]! + to[2]! * up[2]! > 0;
      const px = seen ? viewer.view.toPixel(anchorPoint) : undefined;
      const anchor = px ? { x: px[0]!, y: px[1]! } : undefined;
      live.set({ ...live.get(), ...{ anchor } });
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  scope.defer(() => cancelAnimationFrame(frame));

  // ---------------------------------------------------------- the model
  function siteSummary(entry: SiteEntry): string {
    const models = entry.models.join(" + ");
    return `${entry.codes}  ·  ${models}`;
  }

  function buildModel(): PanelModel {
    const selected = sites.get(params.site) ?? corridor;
    const paired = selected.pair !== undefined;
    const twoTilesets =
      paired || selected.entry.tilesets.reprojected !== undefined;
    const t = morphT();
    const solid: Placement = t >= 0.5 ? "reprojected" : "rigid";
    const worst =
      samples !== undefined
        ? Math.max(...samples.map((s) => s.error))
        : undefined;
    const isCorridor = selected === corridor;
    const sag: SagView | undefined =
      isCorridor &&
      samples !== undefined &&
      answers !== undefined &&
      worst !== undefined
        ? (() => {
            const max = samples.reduce((a, b) => (b.error > a.error ? b : a));
            return {
              points: samples.map((s) => [s.station, s.error] as const),
              anchorStation: answers.anchorStation,
              startStation: corridorAlignment.startStation,
              endStation: corridorAlignment.endStation,
              max: max.error,
              maxStation: max.station,
              caption: `Rigid is exact at the anchor and ${errorText(max.error)} off at the far end; reprojected draws every vertex through ${corridor.entry.codes}, to its PROJ round trip.`,
            };
          })()
        : undefined;
    const siteViews: SiteView[] = SITES.map((entry) => {
      const s = sites.get(entry.id)!;
      return {
        id: entry.id,
        name: entry.name,
        place: entry.place,
        summary: siteSummary(entry),
        selected: entry.id === params.site,
        busy:
          (s.tiles !== undefined || s.frame !== undefined) &&
          s.view === undefined,
        paired:
          entry.tilesets.reprojected !== undefined || s.pair !== undefined,
        ...(entry.fallback && { fallback: `${entry.fallback} fallback` }),
        ...(s.view?.frame && { frame: s.view.frame }),
        ...(s.view?.story && { story: s.view.story }),
      };
    });
    const anchorStation = answers?.anchorStation ?? ANCHOR_STATION;
    const anchor = `station ${Math.floor(anchorStation / 100)}+${String(Math.round(anchorStation % 100)).padStart(2, "0")}`;
    const solidText = !twoTilesets
      ? "Rigid: this site's one tileset"
      : solid === "rigid"
        ? `Rigid, anchored at ${isCorridor ? anchor : "its middle"}`
        : `Reprojected through ${selected.entry.codes}`;
    return {
      loading,
      mode: params.mode,
      morphing,
      ghost,
      exaggerate,
      exaggeration: EXAGGERATION,
      switchable: paired,
      ...(!paired && {
        switchNote: twoTilesets
          ? "The switch works once both placements' tiles are in."
          : "This site has one tileset, rigid, until its reprojected twin is generated (the scale ladder). Its rigid error is in its story below.",
      }),
      ...(sag && { sag }),
      flyAlong: !isCorridor
        ? "hidden"
        : camera.flying && alongStation !== undefined
          ? "running"
          : samples
            ? "ready"
            : "unavailable",
      sites: siteViews,
      cursor,
      legend: {
        solid,
        solidText,
        ...(ghost &&
          paired && {
            ghostText:
              solid === "rigid"
                ? "Reprojected, where it truly is (ghost)"
                : "Rigid, where one transform puts it (ghost)",
          }),
        ...(isCorridor &&
          whiskers &&
          worst !== undefined &&
          t < 1 && { whiskers: { min: "0 m", max: errorText(worst) } }),
        anchor: isCorridor && ring !== undefined,
        exaggeration: paired ? exaggeration() : 1,
      },
    };
  }

  // -------------------------------------------------------- the actions
  const actions: PanelActions = {
    setMode,
    setGhost(on) {
      ghost = on;
      applyMorph();
      refresh();
    },
    setExaggerate(on) {
      exaggerate = on;
      applyMorph();
      updateCursor(undefined);
      refresh();
    },
    flyAlong,
    stopFlight: () => camera.stop(),
    selectSite(id) {
      const site = sites.get(id);
      if (site === undefined) {
        return;
      }
      params = { ...params, site: id };
      context.setParams(formatParams(params));
      refresh();
      void loadTiles(site)
        .then(() => {
          const t = site.rigid;
          if (t !== undefined && params.site === id && !disposed) {
            flyToTileset(t, id === "corridor");
          }
          refresh();
          return loadFrame(site);
        })
        .catch(() => {})
        .finally(refresh);
    },
    retry() {
      for (const site of sites.values()) {
        if (site === corridor || site.entry.id === params.site) {
          void loadTiles(site)
            .then(() => loadFrame(site))
            .catch(() => {})
            .finally(refresh);
        }
      }
    },
  };

  /** Flies to a tileset: its root sphere, framed low and oblique. */
  function flyToTileset(tileset: Tileset3D, corridorShot: boolean): void {
    if (corridorShot && answers !== undefined) {
      const f = openingShot(answers);
      if (f) {
        daylight(f.center);
        camera.flyTo(f);
        return;
      }
    }
    const volume = tileset.root.volume;
    const sphere = volume.sphere;
    daylight(sphere.center);
    camera.flyTo({
      center: sphere.center,
      heading: -35 * deg,
      pitch: -28 * deg,
      range: Math.max(150, sphere.radius * 4.5),
    });
  }

  // -------------------------------------------------------- deep links
  scope.defer(
    context.watchParams((next) => {
      const p = parseParams(next);
      if (p.mode !== params.mode) {
        setMode(p.mode);
      }
      if (p.site !== params.site) {
        actions.selectSite(p.site);
      }
      params = { ...params, snap: p.snap };
      refresh();
    }),
  );

  const store = createStore<PanelModel>(buildModel());
  model.store = store;
  scope.defer(() => store.dispose());

  // ------------------------------------------------------------ startup
  // The corridor first: its tiles draw and morph before PROJ is in.
  void loadTiles(corridor).catch(() => {});
  void loadAnswers(`${STORE}answers.json`, signal)
    .then((a) => {
      if (disposed) {
        return;
      }
      answers = a;
      // The opening shot (DESIGN.md "The story"): true scale, near the far end.
      if (params.site === "corridor") {
        const f = openingShot(a);
        if (f) {
          daylight(f.center);
          camera.cut(f);
        }
      }
      refresh();
    })
    .catch((error: unknown) => {
      if (isAbort(error) || disposed) {
        return;
      }
      report({
        type: "start",
        id: "answers",
        label: "The generator's answers",
      });
      report(
        isMissing(error)
          ? {
              type: "missing",
              id: "answers",
              detail: `The design globe's answers aren't in the frames store. Run once, in packages/next: ${SETUP}`,
            }
          : { type: "error", id: "answers", detail: messageOf(error) },
      );
    });
  void loadFrame(corridor);
  if (params.site !== "corridor") {
    actions.selectSite(params.site);
  }
  // Before the answers arrive, frame the corridor from above its middle.
  {
    const center = new Float64Array(3);
    Ellipsoid.WGS84.cartographicToCartesian(
      { longitude: -122.02 * deg, latitude: 37.76 * deg, height: 200 },
      center,
    );
    viewer.controller.focus(center, 0, -50 * deg, 60_000);
  }

  return {
    dispose: () => {
      disposed = true;
      camera.stop();
    },
    panel: createElement(Panel, {
      source: store,
      live,
      actions,
      hud,
    }),
  };
}
