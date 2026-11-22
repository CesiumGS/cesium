import type { EngineConfig, ExampleScene } from "./schema.ts";

/**
 * The example host's pure parts (exampleDriver.ts runs them in the page):
 * the example's parameters, the host's pose contract, the settle rule and
 * the probe's readings. Apart from the page so Node tests read them.
 */

/** The settle rule's defaults (the α study's). */
export const DEFAULT_HOLD_MS = 3000;
export const DEFAULT_CAP_SECONDS = 120;

/** The example's params: the scene's, then the configuration's `param.` settings, as text. */
export function exampleParams(
  scene: ExampleScene,
  config: Pick<EngineConfig, "param">,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries({
    ...scene.params,
    ...config.param,
  })) {
    if (value !== undefined && value !== "") {
      out[key] = String(value);
    }
  }
  return out;
}

/**
 * The host's pose contract: `camera=lon,lat,height,heading,pitch,range`,
 * degrees and meters, the height above the ellipsoid as drawn. Undefined
 * when absent; an error when malformed.
 */
export function parseCamera(text: string | undefined):
  | {
      longitude: number;
      latitude: number;
      height: number;
      heading: number;
      pitch: number;
      range: number;
    }
  | undefined {
  if (text === undefined) {
    return undefined;
  }
  const n = text.split(",").map((v) => Number(v.trim()));
  if (n.length !== 6 || n.some((v) => !Number.isFinite(v)) || n[5]! <= 0) {
    throw new Error(
      `camera=${text}: write camera=lon,lat,height,heading,pitch,range (degrees and meters, range above 0)`,
    );
  }
  const [longitude, latitude, height, heading, pitch, range] = n as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  return { longitude, latitude, height, heading, pitch, range };
}

/** What the settle rule reads of one tileset. */
export interface TilesetState {
  label: string;
  show: boolean;
  idle: boolean;
  inFlight: number;
  queued: number;
  loading: number;
  imageryBusy: boolean;
  drawn: number;
}

/** Whether a tileset still works on the view (shown, and anything pending). */
export const busy = (t: TilesetState) =>
  t.show &&
  (!t.idle || t.inFlight > 0 || t.queued > 0 || t.loading > 0 || t.imageryBusy);

/** Why the view isn't settled, in words: what each tileset still has. */
export function pendingWords(tilesets: readonly TilesetState[]): string {
  const parts = tilesets.filter(busy).map((t) => {
    const what = [
      t.inFlight ? `${t.inFlight} in flight` : "",
      t.queued ? `${t.queued} queued` : "",
      t.loading ? `${t.loading} loading` : "",
      t.imageryBusy ? "imagery loading" : "",
    ].filter(Boolean);
    return `${t.label} ${what.length ? what.join(", ") : "refining"}`;
  });
  return parts.length ? parts.join("; ") : "the drawn counts kept changing";
}

/**
 * The settle rule (the α study's, generalized): every tileset has nothing
 * in flight, queued or loading, and the drawn triangles and tiles hold
 * for `holdMs`; `capMs` ends the wait as not settled. One observation per
 * poll, in order; returns what was decided, or undefined to keep waiting.
 *
 * When `view.converged({ until: "converged" })` lands (CS-136), the
 * driver calls it with the cap as its timeout instead and records what
 * was still pending, as CS-142 moves the other waits to it.
 */
export function createSettleRule({
  holdMs,
  capMs,
}: {
  holdMs: number;
  capMs: number;
}) {
  let key = "";
  let since: number | undefined;
  return (
    at: number,
    tilesets: readonly TilesetState[],
    triangles: number,
  ):
    | { settled: true; settleMs: number }
    | { settled: false; reason: string }
    | undefined => {
    const quiet = triangles > 0 && !tilesets.some(busy);
    const next = `${triangles}/${tilesets.map((t) => t.drawn).join(",")}`;
    if (!quiet) {
      key = "";
      since = undefined;
    } else if (next !== key) {
      key = next;
      since = at;
    } else if (since !== undefined && at - since >= holdMs) {
      return { settled: true, settleMs: since };
    }
    if (at >= capMs) {
      return {
        settled: false,
        reason: `cap of ${Math.round(capMs / 1000)} s: ${triangles > 0 ? pendingWords(tilesets) : "nothing drawn"}`,
      };
    }
    return undefined;
  };
}

/** `[probe]` lines (widgets/sseProbe.ts) as the stretched-error metrics. */
export function readProbe(text: string): Record<string, number> | undefined {
  const lines = text.split("\n");
  if (!lines[0]?.startsWith("[probe] {")) {
    return undefined;
  }
  const summary = JSON.parse(lines[0].slice("[probe] ".length)) as {
    threshold: number;
  };
  const col = (lines[2] ?? "").split(",").indexOf("sseExact");
  if (col < 0) {
    return undefined;
  }
  const exact = lines
    .slice(3)
    .map((l) => Number(l.split(",")[col]))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  return exact.length
    ? {
        stretchedErrorMax: exact.at(-1)!,
        stretchedErrorP99: exact[Math.floor(0.99 * (exact.length - 1))]!,
        stretchedErrorOver: exact.filter((v) => v > summary.threshold).length,
      }
    : undefined;
}
