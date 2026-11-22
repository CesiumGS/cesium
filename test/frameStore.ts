// A frames store served by a stubbed `fetch` (as test/frameCatalog.test.ts
// and test/viewerFrameData.test.ts serve theirs): synthetic DE440-shaped
// packs (TDB -200 s to 200 s around J2000), a short EOP table and a
// leap-second excerpt, with every request and its signal recorded.
import { vi } from "vitest";
import { pack } from "./syntheticPacks.ts";

export const STORE = "/frames-data/";
const MJD_UNIX_EPOCH = 40587;

function eopText(startMjd: number, days: number): string {
  const rows = ["DATE,MJD,X,Y,UT1-UTC,LOD,DPSI,DEPS,DX,DY,DAT,DATA_TYPE"];
  for (let i = 0; i < days; i++) {
    const mjd = startMjd + i;
    const date = new Date((mjd - MJD_UNIX_EPOCH) * 86_400_000)
      .toISOString()
      .slice(0, 10);
    rows.push(`${date},${mjd},0.1,0.3,0.6,0.5,0,0,0.0001,-0.0002,32,O`);
  }
  return `${rows.join("\n")}\n`;
}

const LEAP_TEXT = `#  File expires on 28 December 2030
#    MJD        Date        TAI-UTC (s)
 51179.0    1  1 1999       32
 53736.0    1  1 2006       33
 54832.0    1  1 2009       34
 56109.0    1  7 2012       35
 57204.0    1  7 2015       36
 57754.0    1  1 2017       37
`;

const bytesOf = (data: string | Uint8Array): ArrayBuffer => {
  const u8 =
    typeof data === "string" ? new TextEncoder().encode(data) : data.slice();
  return u8.buffer as ArrayBuffer;
};

async function sha256(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

const ROLES: Record<string, string> = {
  "planets.pack": "planets",
  "moon.pack": "moon",
  "EOP-All.csv": "eop",
  "Leap_Second.dat": "leapSeconds",
};

/** The store's data files (the manifest lists them). */
export const DATA_FILES = Object.keys(ROLES);

/** One request the stubbed `fetch` saw. */
export interface StoreRequest {
  readonly url: string;
  readonly signal: AbortSignal | undefined;
}

/**
 * Stubs `fetch` with the store at `STORE` (and 404 for anything else);
 * returns the requests as they come. Unstub with `vi.unstubAllGlobals()`.
 */
export async function serveFrameStore(): Promise<StoreRequest[]> {
  const files: Record<string, ArrayBuffer> = {
    "planets.pack": bytesOf(
      pack("SPK", ["sun", "emb", "moon"], "ICRF", "position"),
    ),
    "moon.pack": bytesOf(pack("PCK", ["moonPa"], "MOON_PA", "euler")),
    "EOP-All.csv": bytesOf(eopText(51534, 21)),
    "Leap_Second.dat": bytesOf(LEAP_TEXT),
  };
  const manifest = {
    files: await Promise.all(
      Object.entries(files).map(async ([file, bytes]) => ({
        file,
        role: ROLES[file]!,
        sha256: await sha256(bytes),
      })),
    ),
  };
  const requests: StoreRequest[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      const signal = init?.signal ?? undefined;
      requests.push({ url, signal });
      signal?.throwIfAborted();
      if (url === `${STORE}manifest.json`) {
        return new Response(JSON.stringify(manifest));
      }
      const bytes = url.startsWith(STORE)
        ? files[url.slice(STORE.length)]
        : undefined;
      return bytes
        ? new Response(bytes.slice(0))
        : new Response("not found", { status: 404 });
    }),
  );
  return requests;
}

/** How many times each store URL was asked for. */
export function fetchCounts(
  requests: readonly StoreRequest[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const { url } of requests) {
    if (url.startsWith(STORE)) {
      counts[url.slice(STORE.length)] =
        (counts[url.slice(STORE.length)] ?? 0) + 1;
    }
  }
  return counts;
}

/** One task: what `setTimeout(0)` scheduled before it has run. */
export const nextTask = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));
