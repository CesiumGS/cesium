// Builds refuse a sky data pack that isn't cleared (§13.29): the plugin, its
// presence in each build config, a guard on what the repository tracks, and
// the dev route's fixed names. Every fixture is synthetic.
import { execFileSync } from "node:child_process";
import { closeSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  BACKGROUND_MAGIC,
  POINTS_MAGIC,
  isPackBinary,
} from "../src/atmosphere/skyPack.ts";
import {
  skyPackDevRoute,
  skyPackGuard,
  skyPackResponse,
} from "../scripts/vitePluginSkyPack.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const binary = (magic: string) => {
  const bytes = new Uint8Array(64);
  bytes.set(new TextEncoder().encode(magic));
  return bytes;
};

const manifest = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    format: 1,
    name: "synthetic",
    distributable: false,
    points: { file: "points.bin", count: 1, floatsPerStar: 8 },
    background: { file: "background.bin", size: 1, levels: 1 },
    ...over,
  });

const CLEARANCE = { by: "A. Person", date: "2026-11-08", note: "reviewed" };

type Bundle = Record<
  string,
  | { type: "asset"; fileName: string; source: string | Uint8Array }
  | { type: "chunk"; fileName: string; code: string }
>;

function bundle(files: Record<string, string | Uint8Array>): Bundle {
  return Object.fromEntries(
    Object.entries(files).map(([fileName, source]) => [
      fileName,
      { type: "asset", fileName, source },
    ]),
  );
}

/** Runs the guard's `generateBundle`; returns its error's message, if any. */
function run(files: Bundle): string | undefined {
  const hook = skyPackGuard().generateBundle as (
    this: { error(message: string): never },
    options: object,
    bundle: Bundle,
  ) => void;
  try {
    hook.call(
      {
        error: (message: string) => {
          throw new Error(message);
        },
      },
      {},
      files,
    );
  } catch (error) {
    return (error as Error).message;
  }
  return undefined;
}

describe("skyPackGuard", () => {
  it("refuses an uncleared manifest, naming its file", () => {
    const message = run(
      bundle({
        "assets/pack-1.json": manifest(),
        "assets/points-2.bin": binary(POINTS_MAGIC),
      }),
    );
    expect(message).toContain("assets/pack-1.json");
    expect(message).toContain("synthetic");
    expect(message).toContain("§13.29");
  });

  it("refuses a manifest with no flag", () => {
    const json = JSON.parse(manifest());
    delete json.distributable;
    expect(run(bundle({ "m.json": JSON.stringify(json) }))).toContain("m.json");
  });

  it("refuses distributable: true with no complete clearance", () => {
    for (const clearance of [undefined, {}, { ...CLEARANCE, note: " " }]) {
      const over = { distributable: true, ...(clearance ? { clearance } : {}) };
      expect(
        run(bundle({ "m.json": manifest(over) })),
        String(clearance),
      ).toContain("m.json");
    }
  });

  it("refuses a point file renamed, with no manifest beside it", () => {
    expect(run(bundle({ "assets/x.dat": binary(POINTS_MAGIC) }))).toContain(
      "assets/x.dat",
    );
    expect(run(bundle({ "assets/y.dat": binary(BACKGROUND_MAGIC) }))).toContain(
      "assets/y.dat",
    );
  });

  it("refuses an uncleared manifest under another name", () => {
    expect(run(bundle({ "assets/notes-9.json": manifest() }))).toContain(
      "assets/notes-9.json",
    );
  });

  it("refuses a pack inlined as base64 in a chunk", () => {
    const encoded = Buffer.from(binary(POINTS_MAGIC)).toString("base64");
    const files: Bundle = {
      "assets/main.js": {
        type: "chunk",
        fileName: "assets/main.js",
        code: `const u="data:application/octet-stream;base64,${encoded}";`,
      },
    };
    expect(run(files)).toContain("assets/main.js");
  });

  it("passes a bundle with no pack", () => {
    expect(
      run(
        bundle({
          "index.html": "<html></html>",
          "assets/a.json": JSON.stringify({ format: 1 }),
          "assets/a.png": new Uint8Array([137, 80, 78, 71]),
        }),
      ),
    ).toBeUndefined();
  });

  it("passes a cleared fixture", () => {
    expect(
      run(
        bundle({
          "pack.json": manifest({ distributable: true, clearance: CLEARANCE }),
          "points.bin": binary(POINTS_MAGIC),
          "background.bin": binary(BACKGROUND_MAGIC),
        }),
      ),
    ).toBeUndefined();
  });
});

describe("the build configs", () => {
  /** How many times a config's text lists the guard. */
  const guards = (text: string) =>
    text.match(/\bskyPackGuard\(\)/g)?.length ?? 0;

  it("each lists the guard for its page and its workers", () => {
    // The main and the library configs have a worker plugin list; the
    // handbook's page and its live-engine build have one each.
    for (const file of [
      "vite.config.ts",
      "vite.lib.config.ts",
      "handbook/vite.config.ts",
    ]) {
      expect(guards(readFileSync(join(root, file), "utf8")), file).toBe(2);
    }
  });

  it("the detector flags a config without it", () => {
    expect(guards("plugins: [basisTranscoderEsm()]")).toBe(0);
  });

  it("only the main config has the dev route", () => {
    const has = (file: string) =>
      readFileSync(join(root, file), "utf8").includes("skyPackDevRoute()");
    expect(has("vite.config.ts")).toBe(true);
    expect(has("vite.lib.config.ts")).toBe(false);
    expect(has("handbook/vite.config.ts")).toBe(false);
  });
});

/** Files whose head or JSON is a pack's. */
function packFiles(
  files: ReadonlyArray<{ name: string; head: Uint8Array; json?: unknown }>,
): string[] {
  return files
    .filter(({ head, json }) => {
      if (isPackBinary(head)) {
        return true;
      }
      const o = json as Record<string, unknown> | undefined;
      return (
        !!o &&
        typeof o === "object" &&
        "format" in o &&
        "points" in o &&
        "background" in o
      );
    })
    .map((f) => f.name);
}

describe("the repository", () => {
  it("tracks no pack file and no pack manifest", () => {
    const names = execFileSync("git", ["ls-files", "-z", "."], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 64 << 20,
    })
      .split("\0")
      .filter(Boolean);
    const files = names.flatMap((name) => {
      const path = join(root, name);
      let size: number;
      try {
        size = statSync(path).size;
      } catch {
        return []; // staged for removal
      }
      const head = new Uint8Array(8);
      const fd = openSync(path, "r");
      readSync(fd, head, 0, 8, 0);
      closeSync(fd);
      let json: unknown;
      if (name.endsWith(".json") && size < 8 << 20) {
        try {
          json = JSON.parse(readFileSync(path, "utf8"));
        } catch {
          json = undefined;
        }
      }
      return [{ name, head, json }];
    });
    expect(files.length).toBeGreaterThan(100);
    expect(packFiles(files)).toEqual([]);
  });

  it("the detector flags a planted buffer and a planted manifest", () => {
    expect(
      packFiles([
        { name: "a.dat", head: binary(POINTS_MAGIC).slice(0, 8) },
        {
          name: "b.json",
          head: new Uint8Array(8),
          json: JSON.parse(manifest()),
        },
        { name: "c.json", head: new Uint8Array(8), json: { format: 1 } },
      ]),
    ).toEqual(["a.dat", "b.json"]);
  });
});

describe("the dev route", () => {
  const reads: string[] = [];
  const fs = {
    readFileSync: (path: string) => {
      reads.push(path);
      return new Uint8Array([1, 2, 3]);
    },
  };

  it("serves the three fixed names from the pack's folder", () => {
    for (const name of ["manifest.json", "points.bin", "background.bin"]) {
      reads.length = 0;
      const answer = skyPackResponse(`/sky-pack/${name}`, "/store/p", fs);
      expect(answer?.status).toBe(200);
      expect(reads).toEqual([join("/store/p", name)]);
    }
  });

  it("answers 404 to any other name, and reads no file for it", () => {
    reads.length = 0;
    for (const url of [
      "/sky-pack/../../secret",
      "/sky-pack/other.bin",
      "/sky-pack/%2e%2e/x",
      "/sky-pack/points.bin/../x",
      "/sky-pack/",
      "/sky-pack/constructor",
    ]) {
      expect(skyPackResponse(url, "/store/p", fs)?.status, url).toBe(404);
    }
    expect(reads).toEqual([]);
  });

  it("leaves other URLs alone", () => {
    expect(skyPackResponse("/index.html", "/store/p", fs)).toBeUndefined();
  });

  it("is not in builds", () => {
    expect(skyPackDevRoute().apply).toBe("serve");
  });
});
