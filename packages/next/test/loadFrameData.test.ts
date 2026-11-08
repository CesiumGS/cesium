import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadFrameData,
  loadFrameRoles,
} from "../src/ephemeris/loadFrameData.ts";
import { LeapSeconds } from "../src/time/leapSeconds.ts";
import { COUNT, INIT, LEN, pack } from "./syntheticPacks.ts";

const MJD_UNIX_EPOCH = 40587;

const planets = pack("SPK", ["sun", "emb", "moon"], "ICRF", "position");
const moonPa = pack("PCK", ["moonPa"], "MOON_PA", "euler");

// A leap-second excerpt; `expires` is the file's stated expiry.
const leapText = (expires: string) => `#  File expires on ${expires}
#    MJD        Date        TAI-UTC (s)
 57204.0    1  7 2015       36
 57754.0    1  1 2017       37
`;

// Daily EOP rows from `startMjd`, `days` of them.
function eopText(startMjd: number, days: number): string {
  const rows = ["DATE,MJD,X,Y,UT1-UTC,LOD,DPSI,DEPS,DX,DY,DAT,DATA_TYPE"];
  for (let i = 0; i < days; i++) {
    const mjd = startMjd + i;
    const date = new Date((mjd - MJD_UNIX_EPOCH) * 86_400_000)
      .toISOString()
      .slice(0, 10);
    rows.push(`${date},${mjd},0.1,0.3,0.1,0.5,0,0,0.0001,-0.0002,37,O`);
  }
  return `${rows.join("\n")}\n`;
}

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

interface Store {
  files: Record<string, ArrayBuffer>;
  manifest: { files: { file: string; role: string; sha256: string }[] };
}

async function store(leap: string, eop: string): Promise<Store> {
  const files: Record<string, ArrayBuffer> = {
    "planets.pack": bytesOf(planets),
    "moon.pack": bytesOf(moonPa),
    "Leap_Second.dat": bytesOf(leap),
    "EOP-All.csv": bytesOf(eop),
  };
  const roles: Record<string, string> = {
    "planets.pack": "planets",
    "moon.pack": "moon",
    "Leap_Second.dat": "leapSeconds",
    "EOP-All.csv": "eop",
  };
  const entries = await Promise.all(
    Object.entries(files).map(async ([file, bytes]) => ({
      file,
      role: roles[file]!,
      sha256: await sha256(bytes),
    })),
  );
  return { files, manifest: { files: entries } };
}

function serve(s: Store, base = "/frames-data/") {
  const requested: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      requested.push(input);
      const name = input.slice(base.length);
      if (name === "manifest.json") {
        return new Response(JSON.stringify(s.manifest));
      }
      const bytes = s.files[name];
      return bytes
        ? new Response(bytes.slice(0))
        : new Response("not found", { status: 404 });
    }),
  );
  return requested;
}

const NOW = Date.UTC(2026, 10, 5);
const nowMjd = NOW / 86_400_000 + MJD_UNIX_EPOCH;

describe("loadFrameData", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("says to run setup, naming FRAMES_DATA_DIR, when manifest.json is 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 404 })),
    );
    const error = await loadFrameData("/frames-data/").catch((e: Error) => e);
    expect((error as Error).message).toContain("npm run setup");
    expect((error as Error).message).toContain("FRAMES_DATA_DIR");
  });

  it("says to run setup when the fetch itself fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    await expect(loadFrameData()).rejects.toThrow(
      /npm run setup.*FRAMES_DATA_DIR/,
    );
  });

  it("says so when the server answers with a page that is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<!doctype html>")),
    );
    await expect(loadFrameData()).rejects.toThrow(
      /not valid JSON.*npm run setup/,
    );
  });

  it("loads the four files, and the span matches the packs", async () => {
    const s = await store(
      leapText("28 June 2027"),
      eopText(Math.floor(nowMjd) - 5, 400),
    );
    const requested = serve(s);
    const data = await loadFrameData("/frames-data/");
    expect(data.ephemeris.span).toEqual([INIT, INIT + COUNT * LEN]);
    expect(data.leapSeconds.expires).toBe(Date.UTC(2027, 5, 28));
    expect(data.leapSeconds.taiMinusUtc(NOW)).toBe(37);
    expect(data.eop.last).toBeGreaterThan(NOW);
    expect(data.warnings).toEqual([]);
    expect(console.warn).not.toHaveBeenCalled();
    expect(requested.sort()).toEqual(
      [
        "/frames-data/EOP-All.csv",
        "/frames-data/Leap_Second.dat",
        "/frames-data/manifest.json",
        "/frames-data/moon.pack",
        "/frames-data/planets.pack",
      ].sort(),
    );
  });

  it("normalizes a base URL without a trailing slash", async () => {
    const s = await store(
      leapText("28 June 2027"),
      eopText(Math.floor(nowMjd), 400),
    );
    const requested = serve(s, "/other/");
    await loadFrameData("/other");
    expect(requested).toContain("/other/manifest.json");
  });

  it("uses the store's leap-second table when it expires after the built-in one", async () => {
    const s = await store(
      leapText("28 December 2027"),
      eopText(Math.floor(nowMjd), 400),
    );
    serve(s);
    const data = await loadFrameData();
    expect(data.leapSeconds.expires).toBe(Date.UTC(2027, 11, 28));
    expect(data.leapSeconds).not.toBe(LeapSeconds.builtIn());
  });

  it("uses the built-in table when the store's expires no later", async () => {
    for (const expires of ["28 June 2025", "28 June 2027"]) {
      const s = await store(
        leapText(expires),
        eopText(Math.floor(nowMjd), 400),
      );
      serve(s);
      const data = await loadFrameData();
      expect(data.leapSeconds).toBe(LeapSeconds.builtIn());
      expect(data.warnings).toEqual([]);
    }
  });

  it("uses the built-in table when the manifest has no leapSeconds entry", async () => {
    const s = await store(
      leapText("28 December 2027"),
      eopText(Math.floor(nowMjd), 400),
    );
    s.manifest.files = s.manifest.files.filter((f) => f.role !== "leapSeconds");
    const requested = serve(s);
    const data = await loadFrameData();
    expect(data.leapSeconds).toBe(LeapSeconds.builtIn());
    expect(requested).not.toContain("/frames-data/Leap_Second.dat");
  });

  it("warns when every leap-second table has expired", async () => {
    const later = Date.UTC(2028, 0, 1);
    vi.setSystemTime(later);
    const laterMjd = later / 86_400_000 + MJD_UNIX_EPOCH;
    const s = await store(leapText("28 June 2025"), eopText(laterMjd - 5, 400));
    serve(s);
    const data = await loadFrameData();
    expect(data.warnings).toHaveLength(1);
    expect(data.warnings[0]!.kind).toBe("leapSecondsExpired");
    expect(data.warnings[0]!.message).toContain(
      "leap-second table expired on 2027-06-28",
    );
    expect(console.warn).toHaveBeenCalledWith(data.warnings[0]!.message);
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it("warns when the EOP table ends in the past", async () => {
    const s = await store(leapText("28 June 2027"), eopText(57751, 6));
    serve(s);
    const data = await loadFrameData();
    expect(data.warnings).toHaveLength(1);
    expect(data.warnings[0]!.kind).toBe("eopEnded");
    expect(data.warnings[0]!.message).toContain(
      "Earth orientation table ends on 2017-01-03",
    );
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it("names a listed file the server lacks", async () => {
    const s = await store(
      leapText("28 June 2027"),
      eopText(Math.floor(nowMjd), 400),
    );
    delete s.files["moon.pack"];
    serve(s);
    await expect(loadFrameData()).rejects.toThrow(/moon\.pack.*npm run setup/);
  });

  it("names a role the manifest lacks", async () => {
    const s = await store(
      leapText("28 June 2027"),
      eopText(Math.floor(nowMjd), 400),
    );
    s.manifest.files = s.manifest.files.filter((f) => f.role !== "eop");
    serve(s);
    await expect(loadFrameData()).rejects.toThrow(/"eop".*npm run setup/);
  });

  it("rejects a file whose SHA-256 differs from the manifest", async () => {
    const s = await store(
      leapText("28 June 2027"),
      eopText(Math.floor(nowMjd), 400),
    );
    s.files["Leap_Second.dat"] = bytesOf(leapText("28 June 2028"));
    serve(s);
    await expect(loadFrameData()).rejects.toThrow(
      /Leap_Second\.dat.*SHA-256.*npm run setup/,
    );
  });
});

/** A response whose body arrives in `chunk`-byte pieces, with or without a Content-Length. */
function streamed(
  bytes: ArrayBuffer,
  {
    chunk = 1000,
    length = true,
    failAfter,
  }: {
    chunk?: number;
    length?: boolean;
    failAfter?: number;
  } = {},
): Response {
  const u8 = new Uint8Array(bytes);
  let offset = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (failAfter !== undefined && offset >= failAfter) {
        controller.error(new TypeError("network error"));
        return;
      }
      if (offset >= u8.length) {
        controller.close();
        return;
      }
      controller.enqueue(u8.slice(offset, offset + chunk));
      offset += chunk;
    },
  });
  return new Response(body, {
    headers: length ? { "Content-Length": String(u8.length) } : {},
  });
}

function serveStreamed(
  s: Store,
  options: Parameters<typeof streamed>[1] = {},
): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      const name = input.slice("/frames-data/".length);
      if (name === "manifest.json") {
        return new Response(JSON.stringify(s.manifest));
      }
      return streamed(s.files[name]!, options);
    }),
  );
}

describe("loadFrameData's onProgress (R9)", () => {
  type Call = [item: string, received: number, total: number | undefined];

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const byItem = (calls: Call[]) => {
    const out = new Map<string, Call[]>();
    for (const c of calls) {
      out.set(c[0], [...(out.get(c[0]) ?? []), c]);
    }
    return out;
  };

  it("reports each file's bytes in order against its Content-Length", async () => {
    const s = await store(
      leapText("28 June 2027"),
      eopText(Math.floor(nowMjd), 400),
    );
    serveStreamed(s);
    const calls: Call[] = [];
    const data = await loadFrameData("/frames-data/", (...c) => calls.push(c));
    expect(data.eop.last).toBeGreaterThan(NOW);
    const files = byItem(calls);
    expect([...files.keys()].sort()).toEqual(
      ["EOP-All.csv", "Leap_Second.dat", "moon.pack", "planets.pack"].sort(),
    );
    for (const [file, list] of files) {
      const size = s.files[file]!.byteLength;
      expect(list[0]![1], file).toBe(0);
      for (let i = 1; i < list.length; i++) {
        expect(list[i]![1]).toBeGreaterThanOrEqual(list[i - 1]![1]);
      }
      expect(list.every((c) => c[2] === size)).toBe(true);
      expect(list.at(-1)![1]).toBe(size);
    }
    // The EOP table is several chunks long, so it reports more than twice.
    expect(files.get("EOP-All.csv")!.length).toBeGreaterThan(3);
  });

  it("reports no total when the response states no Content-Length", async () => {
    const s = await store(
      leapText("28 June 2027"),
      eopText(Math.floor(nowMjd), 400),
    );
    serveStreamed(s, { length: false });
    const calls: Call[] = [];
    await loadFrameData("/frames-data/", (...c) => calls.push(c));
    expect(calls.length).toBeGreaterThan(4);
    expect(calls.every((c) => c[2] === undefined)).toBe(true);
    const eop = byItem(calls).get("EOP-All.csv")!;
    expect(eop.at(-1)![1]).toBe(s.files["EOP-All.csv"]!.byteLength);
  });

  it("rejects, never hangs, when a body fails part way", async () => {
    const s = await store(
      leapText("28 June 2027"),
      eopText(Math.floor(nowMjd), 400),
    );
    serveStreamed(s, { failAfter: 2000 });
    const calls: Call[] = [];
    await expect(
      loadFrameData("/frames-data/", (...c) => calls.push(c)),
    ).rejects.toThrow(/network error/);
    expect(calls.length).toBeGreaterThan(0);
  });
});

describe("loadFrameRoles", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetches the manifest and only the asked roles' files", async () => {
    const s = await store(
      leapText("28 June 2027"),
      eopText(Math.floor(nowMjd), 400),
    );
    const requested = serve(s);
    const out = await loadFrameRoles("/frames-data/", ["eop"]);
    expect(requested).toEqual([
      "/frames-data/manifest.json",
      "/frames-data/EOP-All.csv",
    ]);
    expect(Object.keys(out)).toEqual(["eop"]);
    expect(out.eop!.byteLength).toBe(s.files["EOP-All.csv"]!.byteLength);
  });

  it("checks each file against its SHA-256", async () => {
    const s = await store(
      leapText("28 June 2027"),
      eopText(Math.floor(nowMjd), 400),
    );
    s.manifest.files.find((f) => f.role === "eop")!.sha256 = "0".repeat(64);
    serve(s);
    await expect(loadFrameRoles("/frames-data/", ["eop"])).rejects.toThrow(
      /SHA-256/,
    );
  });

  it("rejects with AbortError when aborted from outside while all four fetches are pending, and all four saw it", async () => {
    const s = await store(
      leapText("28 June 2027"),
      eopText(Math.floor(nowMjd), 400),
    );
    const controller = new AbortController();
    const requested: string[] = [];
    const seen: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init?: RequestInit) => {
        requested.push(input);
        if (input.endsWith("manifest.json")) {
          return new Response(JSON.stringify(s.manifest));
        }
        return new Promise<Response>((_, reject) => {
          init!.signal!.addEventListener("abort", () => {
            seen.push(input);
            reject(init!.signal!.reason);
          });
        });
      }),
    );
    const promise = loadFrameRoles(
      "/frames-data/",
      ["planets", "moon", "eop", "leapSeconds"],
      { signal: controller.signal },
    ).catch((e: unknown) => e);
    await vi.waitFor(() => expect(requested).toHaveLength(5));
    controller.abort();
    const error = await promise;
    expect((error as DOMException).name).toBe("AbortError");
    expect(seen.sort()).toEqual(requested.slice(1).sort());
    expect(requested).toHaveLength(5);
  });

  it("rejects with the signal's reason when aborted after the manifest loaded, fetching no file", async () => {
    const s = await store(
      leapText("28 June 2027"),
      eopText(Math.floor(nowMjd), 400),
    );
    const controller = new AbortController();
    const reason = new Error("stop now");
    const requested: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        requested.push(input);
        const response = new Response(JSON.stringify(s.manifest));
        controller.abort(reason);
        return response;
      }),
    );
    const error = await loadFrameRoles("/frames-data/", ["eop"], {
      signal: controller.signal,
    }).catch((e: unknown) => e);
    expect(error).toBe(reason);
    expect(requested).toEqual(["/frames-data/manifest.json"]);
  });

  it("rethrows the signal's reason, not 'not valid JSON', when aborted while the manifest body is read", async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_: string, init?: RequestInit) => {
        const body = new ReadableStream<Uint8Array>({
          start(c) {
            init!.signal!.addEventListener("abort", () =>
              c.error(init!.signal!.reason),
            );
          },
        });
        return new Response(body);
      }),
    );
    const promise = loadFrameRoles("/frames-data/", ["eop"], {
      signal: controller.signal,
    }).catch((e: unknown) => e);
    await new Promise((r) => setTimeout(r, 0));
    controller.abort();
    const error = await promise;
    expect((error as DOMException).name).toBe("AbortError");
  });

  it("aborts the other roles' downloads when one fails", async () => {
    const s = await store(
      leapText("28 June 2027"),
      eopText(Math.floor(nowMjd), 400),
    );
    s.manifest.files.find((f) => f.role === "eop")!.sha256 = "0".repeat(64);
    const aborted: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init?: RequestInit) => {
        const name = input.slice("/frames-data/".length);
        if (name === "manifest.json") {
          return new Response(JSON.stringify(s.manifest));
        }
        if (name === "EOP-All.csv") {
          return new Response(s.files[name]!.slice(0));
        }
        return new Promise<Response>((_, reject) => {
          init!.signal!.addEventListener("abort", () => {
            aborted.push(name);
            reject(init!.signal!.reason);
          });
        });
      }),
    );
    await expect(
      loadFrameRoles("/frames-data/", ["planets", "moon", "eop"]),
    ).rejects.toThrow(/SHA-256/);
    expect(aborted.sort()).toEqual(["moon.pack", "planets.pack"]);
  });

  it("rejects with the signal's reason when already aborted, fetching nothing", async () => {
    const s = await store(
      leapText("28 June 2027"),
      eopText(Math.floor(nowMjd), 400),
    );
    const requested = serve(s);
    const reason = new Error("stop");
    const error = await loadFrameData("/frames-data/", {
      signal: AbortSignal.abort(reason),
    }).catch((e: unknown) => e);
    expect(error).toBe(reason);
    expect(requested).toEqual([]);
  });
});
