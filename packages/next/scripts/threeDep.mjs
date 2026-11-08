// USGS 3DEP ground heights for the design globe's one-off design steps
// (scripts/corridorGround.mjs, scripts/corridorDaylight.mjs): NAVD88 metres
// from the public 3DEP elevation service, no token. Plain `fetch` with a
// timeout, a cap on the reply's size, no redirects, and retries.

/**
 * USGS's 3DEP elevation service (the same seamless 3DEP DEM the Elevation
 * Point Query Service reads), whose getSamples answers many points at once.
 */
export const SERVICE =
  "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/getSamples";
/** Per request. */
const TIMEOUT_MS = 60_000;
/** A reply is about 200 bytes a point; anything past this is refused. */
const MAX_BYTES = 64 * 1024;
/** Points per request at most (about 40 KB of reply). */
export const MAX_BATCH = 200;

/** The reply's body as text, refusing more than MAX_BYTES. */
async function cappedText(response) {
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    bytes += value.byteLength;
    if (bytes > MAX_BYTES) {
      await reader.cancel();
      throw new Error(`3DEP: a reply over ${MAX_BYTES} bytes`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * 3DEP's ground heights at `points` ({ longitude, latitude }, degrees),
 * NAVD88 metres, in order; at most MAX_BATCH points.
 */
export async function groundHeights(points) {
  if (points.length === 0 || points.length > MAX_BATCH) {
    throw new RangeError(`3DEP: 1 to ${MAX_BATCH} points a request`);
  }
  const url = new URL(SERVICE);
  url.search = new URLSearchParams({
    geometry: JSON.stringify({
      points: points.map((p) => [
        Number(p.longitude.toFixed(7)),
        Number(p.latitude.toFixed(7)),
      ]),
      spatialReference: { wkid: 4326 },
    }),
    geometryType: "esriGeometryMultipoint",
    returnFirstValueOnly: "true",
    f: "json",
  }).toString();
  for (let attempt = 1; ; attempt++) {
    if (attempt > 1) {
      await new Promise((resolve) => setTimeout(resolve, 3_000 * attempt));
    }
    try {
      const response = await fetch(url, {
        redirect: "error",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new Error(`3DEP: HTTP ${response.status}`);
      }
      const reply = JSON.parse(await cappedText(response));
      // Filled, not sparse: `some` below skips an array's holes.
      const heights = Array.from(points, () => undefined);
      for (const sample of reply.samples ?? []) {
        const value = Number(sample.value);
        if (
          Number.isInteger(sample.locationId) &&
          sample.locationId >= 0 &&
          sample.locationId < points.length &&
          Number.isFinite(value) &&
          value > -100 &&
          value < 9_000
        ) {
          heights[sample.locationId] = value;
        }
      }
      if (heights.some((h) => h === undefined)) {
        throw new Error("3DEP: a point without a ground height");
      }
      return heights;
    } catch (error) {
      if (attempt >= 5) {
        throw error;
      }
      console.warn(`  retrying a batch: ${error.message}`);
    }
  }
}
