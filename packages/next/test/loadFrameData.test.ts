import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadFrameData } from "../src/ephemeris/loadFrameData.ts";
import { writePack } from "../src/ephemeris/pack.ts";
import { readDaf } from "../src/ephemeris/spk.ts";
import { writeSpk } from "./spkWriter.ts";

const INIT = -200;
const LEN = 100;
const COUNT = 4;
const RSIZE = 2 + 3 * 3;
const MJD_UNIX_EPOCH = 40587;

function records(): Float64Array {
  const out = new Float64Array(COUNT * RSIZE);
  for (let i = 0; i < COUNT; i++) {
    out[i * RSIZE] = INIT + (i + 0.5) * LEN;
    out[i * RSIZE + 1] = LEN / 2;
    for (let k = 0; k < 9; k++) {
      out[i * RSIZE + 2 + k] = (i + 1) * 10 + k;
    }
  }
  return out;
}

// Synthetic packs with the segments Ephemeris.fromPacks looks up by name.
function pack(
  kind: "SPK" | "PCK",
  names: string[],
  frame: "ICRF" | "MOON_PA",
  packKind: "position" | "euler",
): Uint8Array {
  const spk = writeSpk({
    kind,
    segments: names.map((_, i) => ({
      target: 10 + i,
      center: 0,
      frame: 1,
      init: INIT,
      intervalLength: LEN,
      recordSize: RSIZE,
      records: records(),
    })),
  });
  const daf = readDaf(spk);
  return writePack(
    {
      format: "cesium-chebyshev-pack/1",
      source: "synthetic.bsp",
      sourceSha256: "0".repeat(64),
      span: ["1999-12-31T00:00:00Z", "2000-01-02T00:00:00Z"],
      derivedFrom: "Derived from synthetic.bsp (test data)",
    },
    names.map((name, i) => ({
      segment: daf.segments[i]!,
      name,
      frame,
      kind: packKind,
      start: INIT,
      end: INIT + COUNT * LEN,
    })),
  );
}

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

  it("warns when the leap-second table has expired", async () => {
    const s = await store(
      leapText("28 June 2025"),
      eopText(Math.floor(nowMjd), 400),
    );
    serve(s);
    const data = await loadFrameData();
    expect(data.warnings).toHaveLength(1);
    expect(data.warnings[0]).toContain(
      "leap-second table expired on 2025-06-28",
    );
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it("warns when the EOP table ends in the past", async () => {
    const s = await store(leapText("28 June 2027"), eopText(57751, 6));
    serve(s);
    const data = await loadFrameData();
    expect(data.warnings).toHaveLength(1);
    expect(data.warnings[0]).toContain(
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
