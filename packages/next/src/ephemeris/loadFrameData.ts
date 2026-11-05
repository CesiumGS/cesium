import { EarthOrientationParameters } from "../time/eop.ts";
import { LeapSeconds } from "../time/leapSeconds.ts";
import { Ephemeris } from "./Ephemeris.ts";

/** Everything the frames layer needs, loaded from the store `npm run setup` fills. */
export interface FrameData {
  leapSeconds: LeapSeconds;
  eop: EarthOrientationParameters;
  ephemeris: Ephemeris;
  /**
   * Staleness notices: the leap-second table is past its expiry, or the EOP
   * table ends before now so its samples are degraded. Empty when current.
   */
  warnings: string[];
}

interface ManifestEntry {
  file: string;
  role: string;
  sha256: string;
}

const SETUP_HINT =
  "run `npm run setup` (it fills the store the dev server serves at /frames-data/; FRAMES_DATA_DIR moves the store)";

const ROLES = ["planets", "moon", "leapSeconds", "eop"] as const;
type Role = (typeof ROLES)[number];

const hex = (bytes: ArrayBuffer): string =>
  Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");

async function fetchOk(url: string, what: string): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw new Error(
      `frames data: could not fetch ${what} (${url}); ${SETUP_HINT}`,
      { cause },
    );
  }
  return response;
}

async function loadManifest(base: string): Promise<Map<Role, ManifestEntry>> {
  const url = `${base}manifest.json`;
  const response = await fetchOk(url, "manifest.json");
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
  for (const role of ROLES) {
    if (!entries.has(role)) {
      throw new Error(
        `frames data: manifest.json has no "${role}" entry; ${SETUP_HINT}`,
      );
    }
  }
  return entries;
}

async function loadFile(
  base: string,
  entry: ManifestEntry,
): Promise<ArrayBuffer> {
  const url = `${base}${encodeURIComponent(entry.file)}`;
  const response = await fetchOk(url, entry.file);
  if (!response.ok) {
    throw new Error(
      `frames data: ${entry.file} is listed in manifest.json but ${url} returned ${response.status}; re-run \`npm run setup\``,
    );
  }
  const bytes = await response.arrayBuffer();
  const digest = hex(await crypto.subtle.digest("SHA-256", bytes));
  if (digest !== entry.sha256) {
    throw new Error(
      `frames data: ${entry.file} does not match its SHA-256 in manifest.json (the file is corrupt or changed); re-run \`npm run setup\``,
    );
  }
  return bytes;
}

/**
 * Load the leap-second table, Earth orientation parameters and ephemeris that
 * `npm run setup` wrote: fetch `manifest.json`, then the four role files in
 * parallel, each checked against its SHA-256. Rejects with a message saying to
 * run setup when the store is missing or incomplete.
 *
 * Data past its validity is not an error here (an instant outside the data is
 * handled where it is used), but `warnings` says so, and each warning is also
 * logged once.
 */
export async function loadFrameData(
  baseUrl = "/frames-data/",
): Promise<FrameData> {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const manifest = await loadManifest(base);
  const [planets, moon, leap, eop] = await Promise.all(
    ROLES.map((role) => loadFile(base, manifest.get(role)!)),
  );
  const decode = (bytes: ArrayBuffer | undefined): string =>
    new TextDecoder().decode(bytes);

  const leapSeconds = LeapSeconds.fromIers(decode(leap));
  const earthOrientation = EarthOrientationParameters.fromCelestrakCsv(
    decode(eop),
  );
  const ephemeris = Ephemeris.fromPacks(planets!, moon!);

  const now = Date.now();
  const warnings: string[] = [];
  if (leapSeconds.isExpired(now)) {
    warnings.push(
      `frames data: the leap-second table expired on ${new Date(leapSeconds.expires).toISOString().slice(0, 10)}; UTC conversions after a newly announced leap second would be off by a second. Re-run \`npm run setup\` to refresh it.`,
    );
  }
  if (earthOrientation.last < now) {
    warnings.push(
      `frames data: the Earth orientation table ends on ${new Date(earthOrientation.last).toISOString().slice(0, 10)}, before now; later instants use degraded samples. Re-run \`npm run setup\` to refresh it.`,
    );
  }
  for (const warning of warnings) {
    console.warn(warning);
  }
  return { leapSeconds, eop: earthOrientation, ephemeris, warnings };
}
