// The format version each derived dataset records (scripts/dataFormats.mjs):
// what counts as current, out of date and missing, the plain sentence a reader
// gives, and the pinned key names of every persisted format.
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  STORE_FORMAT,
  storeFormatProblem,
} from "../examples/frames-explorer/host.ts";
import { loadFrameData } from "../packages/next/src/ephemeris/loadFrameData.ts";
import {
  parseManifest,
  SKY_PACK_BUILD_COMMAND,
  SKY_PACK_FORMAT,
} from "../packages/core/src/atmosphere/skyPack.ts";
import {
  FRAMES_DATA_FORMAT,
  framesDataFormatProblem,
} from "../packages/next/src/ephemeris/framesDataFormat.ts";
import {
  DATASETS,
  FORMAT_FILE,
  SETUP_COMMAND,
  adoptFormat1,
  datasetStatus,
  overrideStatus,
  recordedFormat,
  writeFormat,
  type DatasetName,
} from "../scripts/dataFormats.mjs";
import { datasetsReadBy, outOfDateReason } from "../scripts/dataStatus.mjs";
import { frameManifest } from "../scripts/frameData.mjs";
import { designManifest, wantedManifest } from "../scripts/designTiles.mjs";
import { keyPaths, PINNED_KEYS } from "./dataFormatKeys.ts";

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "data-formats-"));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const writeJson = (name: string, json: unknown) =>
  writeFileSync(join(root, name), JSON.stringify(json));

describe("what a store records", () => {
  it("is current when it records the format this code reads", () => {
    writeJson("manifest.json", { format: SKY_PACK_FORMAT });
    expect(datasetStatus("sky", root)).toEqual({
      name: "sky",
      state: "current",
      found: SKY_PACK_FORMAT,
      expected: SKY_PACK_FORMAT,
    });
  });

  it("is out of date when it records an older format, naming the dataset and the command", () => {
    writeJson("manifest.json", { format: 1 });
    const status = datasetStatus("sky", root);
    expect(status).toMatchObject({ state: "outOfDate", found: 1, expected: 2 });
    expect((status as { message: string }).message).toBe(
      "sky pack: out of date, run `npm run sky -- build` (built as format 1, this code reads format 2).",
    );
  });

  it("reads a store with no record as format 1, what stores held before records began", () => {
    writeJson("manifest.json", { span: [2000, 2050], files: [] });
    expect(datasetStatus("frames", root).state).toBe(
      DATASETS.frames.format === 1 ? "current" : "outOfDate",
    );
    // A pack from before format 2 has no escape: format 1 is not 2.
    expect(datasetStatus("sky", root).state).toBe("outOfDate");
  });

  it("is out of date when its manifest can't be parsed", () => {
    writeFileSync(join(root, "manifest.json"), "{ not json");
    expect(datasetStatus("frames", root)).toMatchObject({
      state: "outOfDate",
      message: expect.stringContaining("manifest.json is not valid JSON"),
    });
  });

  it("is missing, not out of date, when nothing of it is there", () => {
    expect(datasetStatus("frames", root).state).toBe("missing");
    expect(datasetStatus("occt", undefined).state).toBe("missing");
    expect(datasetStatus("sky", join(root, "no-such-pack")).state).toBe(
      "missing",
    );
  });

  it("reads a folder with no record as format 1, and setup writes that record", () => {
    mkdirSync(join(root, "build"));
    expect(datasetStatus("occt", join(root, "build")).state).toBe("current");
    adoptFormat1("occt", join(root, "build"));
    expect(recordedFormat("occt", join(root, "build"))).toEqual({ found: 1 });
    // Format 1 is what it is: current while this code reads 1, and older the
    // day the code moves on.
    expect(datasetStatus("occt", join(root, "build")).state).toBe(
      DATASETS.occt.format === 1 ? "current" : "outOfDate",
    );
  });

  it("writes the current format beside what it built, and never over a record", () => {
    writeFormat("smlib", root);
    expect(JSON.parse(readFileSync(join(root, FORMAT_FILE), "utf8"))).toEqual({
      format: DATASETS.smlib.format,
    });
    writeFileSync(join(root, FORMAT_FILE), '{"format":0}');
    adoptFormat1("smlib", root);
    expect(recordedFormat("smlib", root)).toEqual({ found: 0 });
    expect(datasetStatus("smlib", root).state).toBe("outOfDate");
  });

  it("never calls a folder the person pointed an environment variable at out of date", () => {
    expect(overrideStatus("occt").state).toBe("current");
  });

  it("names the command that builds it", () => {
    expect(DATASETS.sky.command).toBe(SKY_PACK_BUILD_COMMAND);
    for (const [name, dataset] of Object.entries(DATASETS)) {
      if (name !== "sky") {
        expect(dataset.command).toBe(SETUP_COMMAND);
      }
    }
  });

  it("says how a frames manifest of another format is out of date", () => {
    expect(framesDataFormatProblem({ format: FRAMES_DATA_FORMAT })).toBe(
      undefined,
    );
    // No `format`: written before formats were recorded, so format 1.
    expect(framesDataFormatProblem({ files: [] })).toBe(undefined);
    expect(framesDataFormatProblem({ format: "1" })).toBe(
      "frames data: out of date, run `npm run setup` (its format is not a number, this code reads format 1).",
    );
    expect(framesDataFormatProblem({ format: 0 })).toBe(
      "frames data: out of date, run `npm run setup` (built as format 0, this code reads format 1).",
    );
    // Both readers agree with the registry.
    expect(DATASETS.frames.format).toBe(FRAMES_DATA_FORMAT);
    expect(DATASETS.sky.format).toBe(SKY_PACK_FORMAT);
  });
});

describe("the frames data reader", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  const serving = (manifest: unknown) =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(manifest))),
    );

  it("says a store built in another format is out of date, naming the dataset and the command", async () => {
    serving({ format: 0, files: [] });
    await expect(loadFrameData("/frames-data/")).rejects.toThrow(
      "frames data: out of date, run `npm run setup` (built as format 0, this code reads format 1).",
    );
    serving({ format: 2, files: [] });
    await expect(loadFrameData("/frames-data/")).rejects.toThrow(
      "built as format 2, this code reads format 1",
    );
  });

  it("is read the same way by the frames explorer, which can't import the library's check", () => {
    expect(STORE_FORMAT).toBe(FRAMES_DATA_FORMAT);
    for (const manifest of [
      {},
      { format: 1 },
      { format: 0 },
      { format: 2 },
      { format: "1" },
      null,
    ]) {
      expect(storeFormatProblem(manifest)).toBe(
        framesDataFormatProblem(manifest),
      );
    }
  });

  it("reads a manifest with no format as format 1: it fails on what it lacks, not on its age", async () => {
    serving({ files: [] });
    await expect(loadFrameData("/frames-data/")).rejects.not.toThrow(
      "out of date",
    );
  });
});

describe("data tests whose dataset is out of date", () => {
  const staleSky = () => {
    writeJson("manifest.json", { format: 1 });
    return [datasetStatus("sky", root)];
  };

  it("find the datasets a test reads from its source", () => {
    expect(
      datasetsReadBy('import { chosenPackDirectory } from "skyStore.mjs"'),
    ).toEqual(["sky"]);
    expect(
      datasetsReadBy(
        "occtDirectory(); stepSamplesDirectory(); smlibDirectory()",
      ),
    ).toEqual(["smlib", "occt", "step"]);
  });

  it("are reported as out of date with the command, not as a failure", () => {
    expect(outOfDateReason("chosenPackDirectory()", staleSky())).toBe(
      "sky pack: out of date, run `npm run sky -- build` (built as format 1, this code reads format 2).",
    );
    // A test that reads another dataset runs.
    expect(
      outOfDateReason("framesDataDirectory()", staleSky()),
    ).toBeUndefined();
  });

  it("each name at least one dataset, so none is exempt by accident", () => {
    const dir = join(import.meta.dirname, "data");
    const unnamed = readdirSync(dir)
      .filter((name) => name.endsWith(".test.ts"))
      .filter(
        (name) =>
          datasetsReadBy(readFileSync(join(dir, name), "utf8")).length === 0,
      );
    expect(unnamed).toEqual([]);
  });
});

describe("the persisted formats' key names are pinned", () => {
  const sample = {
    format: SKY_PACK_FORMAT,
    name: "synthetic",
    distributable: true,
    clearance: { by: "A. Person", date: "2026-11-19", note: "reviewed" },
    sources: [{ name: "a", url: "https://x.test/a", credit: "A", terms: "t" }],
    credits: ["Made up"],
    modeled: ["everything"],
    points: { file: "points.bin", count: 10, floatsPerStar: 8 },
    background: {
      file: "background.bin",
      size: 4,
      levels: 3,
      meanLuminance: 1e-4,
      holdsFaintStars: false,
    },
    calibration: { faintConstant: 1 },
  };

  const actualKeys = (): Record<DatasetName | "stamp", string[]> => ({
    // The reader's record: what a pack must say, and what it gives back.
    sky: keyPaths(parseManifest(sample)).filter(
      (path) => !path.startsWith("calibration."),
    ),
    frames: keyPaths(frameManifest([2000, 2050], [])),
    designTiles: (() => {
      writeJson("manifest.json", { files: [] });
      return Object.keys(designManifest(wantedManifest(root), {})).sort();
    })(),
    stamp: (() => {
      writeFormat("occt", root);
      return keyPaths(
        JSON.parse(readFileSync(join(root, FORMAT_FILE), "utf8")),
      );
    })(),
    smlib: [],
    occt: [],
    slangc: [],
    slangWasm: [],
    step: [],
  });

  it.each(["sky", "frames", "designTiles"] as const)(
    "%s: the keys of the current format are the pinned ones (a rename needs a new format number)",
    (name) => {
      const pinned = PINNED_KEYS[name]!;
      const formats = Object.keys(pinned).map(Number);
      // The registry's format is the newest pinned one.
      expect(DATASETS[name].format).toBe(Math.max(...formats));
      expect(actualKeys()[name]).toEqual(pinned[DATASETS[name].format]);
    },
  );

  it("sky: the old spelling is not in the current format, and is not an alias", () => {
    expect(PINNED_KEYS.sky![1]).toContain("modelled");
    expect(PINNED_KEYS.sky![2]).not.toContain("modelled");
    expect(PINNED_KEYS.sky![2]).toContain("modeled");
  });

  it("the stamp beside built files keeps its one key", () => {
    expect(actualKeys().stamp).toEqual(PINNED_KEYS.stamp![1]);
    for (const name of [
      "smlib",
      "occt",
      "slangc",
      "slangWasm",
      "step",
    ] as const) {
      expect(DATASETS[name].record).toEqual({
        file: FORMAT_FILE,
        key: "format",
      });
      expect(DATASETS[name].format).toBe(
        Math.max(...Object.keys(PINNED_KEYS.stamp!).map(Number)),
      );
    }
  });

  it("each dataset records its format under the key the pins name", () => {
    expect(DATASETS.sky.record).toEqual({
      file: "manifest.json",
      key: "format",
    });
    expect(DATASETS.frames.record).toEqual({
      file: "manifest.json",
      key: "format",
    });
    expect(DATASETS.designTiles.record).toEqual({
      file: "manifest.json",
      key: "version",
    });
  });
});
