import { readWithProgress, type LoadProgress } from "../io/readWithProgress.ts";
import { EarthOrientationParameters } from "../time/eop.ts";
import { LeapSeconds } from "../time/leapSeconds.ts";
import { Ephemeris } from "./Ephemeris.ts";

/** A staleness notice from `loadFrameData`, by kind, with a message for people. */
export interface FrameDataWarning {
  /**
   * `leapSecondsExpired`: the leap-second table is past its expiry, so a newly
   * announced leap second would be missed. `eopEnded`: the EOP table ends
   * before now, so later samples are degraded.
   */
  kind: "leapSecondsExpired" | "eopEnded";
  message: string;
}

/** Everything the frames layer needs, loaded from the store `npm run setup` fills. */
export interface FrameData {
  /**
   * The store's `Leap_Second.dat` when it expires after the built-in table
   * (`LeapSeconds.builtIn()`, NAIF naif0012.tls); otherwise, or when the store
   * has none, the built-in table.
   */
  leapSeconds: LeapSeconds;
  eop: EarthOrientationParameters;
  ephemeris: Ephemeris;
  /**
   * Staleness notices: the leap-second table is past its expiry, or the EOP
   * table ends before now so its samples are degraded. Empty when current.
   */
  warnings: FrameDataWarning[];
}

interface ManifestEntry {
  file: string;
  role: string;
  sha256: string;
}

const SETUP_HINT =
  "run `npm run setup` (it fills the store the dev server serves at /frames-data/; FRAMES_DATA_DIR moves the store)";

/** A kind of frame data file in the store, by its role in `manifest.json`. */
export type FrameDataRole = "planets" | "moon" | "eop" | "leapSeconds";

/** Roles the store must have; `leapSeconds` is optional (there is a built-in table). */
const ROLES = ["planets", "moon", "eop"] as const;
type Role = FrameDataRole;

/** Options for loading frame data: cancel it, and watch each file arrive. */
export interface FrameDataLoadOptions {
  /** Aborting rejects with the signal's reason and starts no further fetch. */
  signal?: AbortSignal;
  onProgress?: LoadProgress;
}

/**
 * The manifest roles whose files `loadFrameData` fetches (and reports through
 * `onProgress`): the required ones and the optional leap-second table.
 */
export const FRAME_DATA_ROLES: readonly Role[] = [...ROLES, "leapSeconds"];

const hex = (bytes: ArrayBuffer): string =>
  Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");

async function fetchOk(
  url: string,
  what: string,
  signal: AbortSignal | undefined,
): Promise<Response> {
  signal?.throwIfAborted();
  let response: Response;
  try {
    response = await fetch(url, signal ? { signal } : undefined);
  } catch (cause) {
    if (signal?.aborted) {
      throw signal.reason;
    }
    throw new Error(
      `frames data: could not fetch ${what} (${url}); ${SETUP_HINT}`,
      { cause },
    );
  }
  return response;
}

async function loadManifest(
  base: string,
  signal: AbortSignal | undefined,
): Promise<Map<Role, ManifestEntry>> {
  const url = `${base}manifest.json`;
  const response = await fetchOk(url, "manifest.json", signal);
  if (!response.ok) {
    throw new Error(
      `frames data: ${url} returned ${response.status}; ${SETUP_HINT}`,
    );
  }
  let parsed: { files?: ManifestEntry[] };
  try {
    parsed = (await response.json()) as { files?: ManifestEntry[] };
  } catch (cause) {
    throw new Error(
      `frames data: ${url} is not valid JSON (the store may be stale or the server may serve another page); ${SETUP_HINT}`,
      { cause },
    );
  }
  const entries = new Map<Role, ManifestEntry>();
  for (const entry of parsed.files ?? []) {
    entries.set(entry.role as Role, entry);
  }
  return entries;
}

async function loadFile(
  base: string,
  entry: ManifestEntry,
  onProgress: LoadProgress | undefined,
  signal: AbortSignal | undefined,
): Promise<ArrayBuffer> {
  const url = `${base}${encodeURIComponent(entry.file)}`;
  const response = await fetchOk(url, entry.file, signal);
  if (!response.ok) {
    throw new Error(
      `frames data: ${entry.file} is listed in manifest.json but ${url} returned ${response.status}; re-run \`npm run setup\``,
    );
  }
  let bytes: ArrayBuffer;
  try {
    bytes = await readWithProgress(
      response,
      onProgress &&
        ((received, total) => onProgress(entry.file, received, total)),
    );
  } catch (cause) {
    if (signal?.aborted) {
      throw signal.reason;
    }
    throw new Error(
      `frames data: reading ${entry.file} (${url}) failed: ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    );
  }
  const digest = hex(await crypto.subtle.digest("SHA-256", bytes));
  if (digest !== entry.sha256) {
    throw new Error(
      `frames data: ${entry.file} does not match its SHA-256 in manifest.json (the file is corrupt or changed); re-run \`npm run setup\``,
    );
  }
  return bytes;
}

/**
 * Load only the asked roles' files that `npm run setup` wrote: fetch
 * `manifest.json` once, then those files in parallel, each checked against its
 * SHA-256. Rejects with a message saying to run setup when the store is
 * missing or incomplete, or lacks an asked role. A role the manifest lacks and
 * that is `leapSeconds` is left out of the result (there is a built-in table).
 *
 * `options.signal` cancels the load: it rejects with the signal's reason and no
 * further fetch starts. `options.onProgress` is called as each file arrives.
 */
export async function loadFrameRoles(
  baseUrl: string,
  roles: readonly FrameDataRole[],
  options: FrameDataLoadOptions = {},
): Promise<Partial<Record<FrameDataRole, ArrayBuffer>>> {
  const { signal, onProgress } = options;
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const manifest = await loadManifest(base, signal);
  const wanted = [...new Set(roles)];
  const entries = wanted.flatMap((role) => {
    const entry = manifest.get(role);
    if (!entry && role !== "leapSeconds") {
      throw new Error(
        `frames data: manifest.json has no "${role}" entry; ${SETUP_HINT}`,
      );
    }
    return entry ? [[role, entry] as const] : [];
  });
  const loaded = await Promise.all(
    entries.map(([, entry]) => loadFile(base, entry, onProgress, signal)),
  );
  const out: Partial<Record<FrameDataRole, ArrayBuffer>> = {};
  entries.forEach(([role], i) => {
    out[role] = loaded[i]!;
  });
  return out;
}

/**
 * Load the Earth orientation parameters, ephemeris and leap-second table that
 * `npm run setup` wrote: every role, through `loadFrameRoles`. Rejects with a
 * message saying to run setup when the store is missing or incomplete. The
 * leap-second table is the store's only when it expires after the built-in one.
 *
 * Data past its validity is not an error here (an instant outside the data is
 * handled where it is used), but `warnings` says so, and each warning is also
 * logged once.
 *
 * `options` is a `FrameDataLoadOptions`; a bare `LoadProgress` function still
 * works. `onProgress` is called as each role file arrives, by its file name,
 * with the bytes received and the response's `Content-Length` (R9).
 */
export async function loadFrameData(
  baseUrl = "/frames-data/",
  options: FrameDataLoadOptions | LoadProgress = {},
): Promise<FrameData> {
  const {
    planets,
    moon,
    eop,
    leapSeconds: leap,
  } = await loadFrameRoles(
    baseUrl,
    FRAME_DATA_ROLES,
    typeof options === "function" ? { onProgress: options } : options,
  );
  const decode = (bytes: ArrayBuffer | undefined): string =>
    new TextDecoder().decode(bytes);

  const builtIn = LeapSeconds.builtIn();
  const stored = leap ? LeapSeconds.fromIers(decode(leap)) : undefined;
  const leapSeconds =
    stored && stored.expires > builtIn.expires ? stored : builtIn;
  const earthOrientation = EarthOrientationParameters.fromCelestrakCsv(
    decode(eop),
  );
  const ephemeris = Ephemeris.fromPacks(planets!, moon!);

  const now = Date.now();
  const warnings: FrameDataWarning[] = [];
  if (leapSeconds.isExpired(now)) {
    warnings.push({
      kind: "leapSecondsExpired",
      message: `frames data: the leap-second table expired on ${new Date(leapSeconds.expires).toISOString().slice(0, 10)}; UTC conversions after a newly announced leap second would be off by a second. Re-run \`npm run setup\` to refresh it.`,
    });
  }
  if (earthOrientation.last < now) {
    warnings.push({
      kind: "eopEnded",
      message: `frames data: the Earth orientation table ends on ${new Date(earthOrientation.last).toISOString().slice(0, 10)}, before now; later instants use degraded samples. Re-run \`npm run setup\` to refresh it.`,
    });
  }
  for (const warning of warnings) {
    console.warn(warning.message);
  }
  return { leapSeconds, eop: earthOrientation, ephemeris, warnings };
}
