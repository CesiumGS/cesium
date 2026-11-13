/**
 * Development only (`&probe=sse`, `engine.ts`): once the globe's terrain has
 * been idle for a second (or 12 s after load), compares each drawn terrain
 * tile's selection distance (to its drawn bounding volume) with the distance
 * to its drawn surface (its resident vertices, at their drawn heights), and
 * what the screen-space error would have been. Logs one `[probe]` summary line
 * and one `[probe] csv` line. Reads the engine's internals by shape; it
 * changes nothing.
 */
import type { Engine, Tileset3D } from "@cesium/next";
import { routeForward, type Route } from "@cesium/next/frames";

interface Heights {
  u: Uint16Array;
  v: Uint16Array;
  h: Uint16Array;
  minimumHeight: number;
  maximumHeight: number;
}
interface Globe {
  level: number;
  heights?: Heights;
  rectangle: { west: number; south: number; east: number; north: number };
}
interface Probed {
  geometricError: number;
  globe?: Globe;
  parent?: Probed;
  viewState(id: number): { sse: number; distance: number };
}
type HeightRange = (
  min: number,
  max: number,
) => { min: number; max: number } | undefined;
type Views = Array<{
  id: number;
  position: ArrayLike<number>;
  height: number;
  sseDenominator: number;
}>;
type Terrain = Tileset3D & {
  world: {
    tileWarp?(
      anchor: unknown,
      id: number,
    ): { heightRange?: HeightRange } | undefined;
  };
  anchor: unknown;
  update(views: Views): void;
  lastSelected: Map<number, Probed[]>;
  selection: { memoryAdjustedScreenSpaceError: number };
};

let lastIdle = false;
const lastViews = new WeakMap<Terrain, Views>();
/** Fall back to reading at this age (ms) when the terrain never idles. */
const TIMEOUT_MS = 40000;
const A = 6378137;
const E2 = 0.0066943799901413165;

export function startSseProbe(
  engine: Engine,
  tilesets: () => readonly Tileset3D[],
): void {
  const begun = performance.now();
  let idleSince = 0;
  const timer = setInterval(() => {
    const now = performance.now();
    const globes = tilesets().filter((t) => t.isGlobe);
    // The selection inputs are rebuilt every tick: keep the last ones given.
    for (const t of globes as Terrain[]) {
      if (!lastViews.has(t)) {
        lastViews.set(t, []);
        const update = t.update.bind(t);
        t.update = (views) => {
          lastViews.set(t, views);
          update(views);
        };
      }
    }
    const idle = globes.length > 0 && globes.every((t) => t.idle);
    idleSince = idle ? idleSince || now : 0;
    if ((idle && now - idleSince > 1000) || now - begun > TIMEOUT_MS) {
      clearInterval(timer);
      lastIdle = idle;
      const globe = globes[0] as Terrain | undefined;
      console.warn(globe ? report(engine, globe) : "[probe] no globe tileset");
    }
  }, 250);
}

function report(engine: Engine, tileset: Terrain): string {
  const sv = lastViews.get(tileset)?.[0];
  const id = sv?.id ?? 0;
  const route = (
    engine.views[0] as unknown as { anchorRoute(a: unknown): Route | undefined }
  ).anchorRoute(tileset.anchor);
  const X = new Float64Array(3);
  const F0 = new Float64Array(3);
  const F1 = new Float64Array(3);
  const DELTA = 2;
  if (!sv) {
    return "[probe] no selection view";
  }
  const p = sv.position;
  const threshold = tileset.selection.memoryAdjustedScreenSpaceError;
  // Per drawn vertex x_i (at its drawn height): d_i, and the exact first-order
  // error |P⊥ J n̂|·ε/d_i·K, with J n̂ = (dh'/dh)·n̂ for a height-scale warp
  // (dh'/dh by central difference of the drawn height). `box` is the distance
  // the selection used: the same vertices' stretch, over that distance.
  const K = sv.height / sv.sseDenominator;
  const surface = (
    tile: Probed,
    box: number,
  ): { d: number; exact: number; stretchOnly: number } => {
    const g = tile.globe;
    const t = g?.heights;
    if (!g || !t) {
      return { d: NaN, exact: NaN, stretchOnly: NaN };
    }
    const eps = tile.geometricError;
    const { west, south, east, north } = g.rectangle;
    let best = Infinity;
    let exact = 0;
    let perp = 0;
    for (let i = 0; i < t.u.length; i++) {
      const lon = west + (t.u[i]! / 32767) * (east - west);
      const lat = south + (t.v[i]! / 32767) * (north - south);
      const h =
        t.minimumHeight +
        (t.h[i]! / 32767) * (t.maximumHeight - t.minimumHeight);
      const s = Math.sin(lat);
      const c = Math.cos(lat);
      const nx = c * Math.cos(lon);
      const ny = c * Math.sin(lon);
      const n = A / Math.sqrt(1 - E2 * s * s);
      X[0] = (n + h) * nx;
      X[1] = (n + h) * ny;
      X[2] = (n * (1 - E2) + h) * s;
      let dx = X[0] - p[0]!;
      let dy = X[1] - p[1]!;
      let dz = X[2] - p[2]!;
      let jx = nx;
      let jy = ny;
      let jz = s;
      if (route) {
        routeForward(route, X, F0);
        X[0] += DELTA * nx;
        X[1] += DELTA * ny;
        X[2] += DELTA * s;
        routeForward(route, X, F1);
        dx = F0[0]! - p[0]!;
        dy = F0[1]! - p[1]!;
        dz = F0[2]! - p[2]!;
        jx = (F1[0]! - F0[0]!) / DELTA;
        jy = (F1[1]! - F0[1]!) / DELTA;
        jz = (F1[2]! - F0[2]!) / DELTA;
      }
      const d = Math.hypot(dx, dy, dz);
      const along = (dx * jx + dy * jy + dz * jz) / d;
      const mag = Math.hypot(jx, jy, jz);
      const perpJ = Math.sqrt(Math.max(0, mag * mag - along * along));
      best = Math.min(best, d);
      exact = Math.max(exact, (perpJ * eps * K) / d);
      perp = Math.max(perp, perpJ);
    }
    return { d: best, exact, stretchOnly: (perp * eps * K) / box };
  };
  const rows = [
    "level,sseBox,sseSurface,sseStretch,sseExact,dBox,dSurface,parentStopSurface,parentStopExact",
  ];
  let stops = 0;
  let stopsExact = 0;
  let known = 0;
  const tiles = (tileset.lastSelected.get(id) ?? []).filter((t) => t.globe);
  for (const tile of tiles) {
    const s = tile.viewState(id);
    const own = surface(tile, s.distance);
    // Fog is off, so sse scales as 1/distance: the error term is unchanged.
    const sseSurface = (s.sse * s.distance) / own.d;
    let stop = "";
    let stopExact = "";
    const parent = tile.parent;
    if (parent?.globe) {
      const ps = parent.viewState(id);
      const pS = surface(parent, ps.distance);
      if (Number.isFinite(pS.d)) {
        stop = (ps.sse * ps.distance) / pS.d <= threshold ? "1" : "0";
        stopExact = pS.exact <= threshold ? "1" : "0";
      }
    }
    known += stop === "" ? 0 : 1;
    stops += stop === "1" ? 1 : 0;
    stopsExact += stopExact === "1" ? 1 : 0;
    rows.push(
      [
        tile.globe!.level,
        s.sse.toFixed(3),
        sseSurface.toFixed(3),
        own.stretchOnly.toFixed(3),
        own.exact.toFixed(3),
        s.distance.toFixed(0),
        own.d.toFixed(0),
        stop,
        stopExact,
      ].join(","),
    );
  }
  const summary = {
    drawn: tiles.length,
    idle: lastIdle,
    seconds: Math.round(performance.now() / 1000),
    threshold,
    routed: route !== undefined,
    parentKnown: known,
    parentWouldStop: stops,
    parentWouldStopExact: stopsExact,
  };
  return `[probe] ${JSON.stringify(summary)}\n[probe] csv\n${rows.join("\n")}`;
}
