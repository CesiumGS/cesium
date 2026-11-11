// The NIST STEP samples' fetcher (scripts/stepSamples.mjs), offline: a zip made
// here stands in for NIST's, so the extraction and the integrity checks run
// without the network or the store.
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateRawSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  STEP_DATASET,
  ensureStepSamples,
  stepSamplesNotice,
  unzipMembers,
  verifyStepSamples,
} from "../scripts/stepSamples.mjs";

const sha256 = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");

/** A zip of the members, each deflated (or stored, if `stored`), with the central directory a reader needs. */
function zipOf(
  members: ReadonlyArray<[string, Uint8Array]>,
  stored = false,
): Buffer {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const [name, data] of members) {
    const body = stored ? Buffer.from(data) : deflateRawSync(data);
    const nameBytes = Buffer.from(name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(stored ? 0 : 8, 8);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(stored ? 0 : 8, 10);
    entry.writeUInt32LE(body.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(nameBytes.length, 28);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, nameBytes);
    parts.push(local, nameBytes, body);
    offset += local.length + nameBytes.length + body.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(members.length, 8);
  end.writeUInt16LE(members.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, directory, end]);
}

const FOLDER = "NIST-PMI-STEP-Files/AP203 geometry only/";
const files = [
  ["a.stp", new TextEncoder().encode("ISO-10303-21;\n".repeat(50))],
  ["b.stp", new TextEncoder().encode("ISO-10303-21;\nDATA;\n")],
] as const;
const samples = files.map(([file, data]) => ({
  file,
  bytes: data.length,
  sha256: sha256(data),
}));

describe("unzipMembers", () => {
  it("reads deflated and stored members, ignoring the rest", () => {
    for (const stored of [false, true]) {
      const zip = zipOf(
        [
          ["other/", new Uint8Array()],
          ["other/readme.txt", new TextEncoder().encode("not wanted")],
          ...files.map(([f, d]) => [FOLDER + f, d] as [string, Uint8Array]),
        ],
        stored,
      );
      const read = unzipMembers(zip, [`${FOLDER}b.stp`, `${FOLDER}a.stp`]);
      expect([...read.keys()].sort()).toEqual([
        `${FOLDER}a.stp`,
        `${FOLDER}b.stp`,
      ]);
      expect(new Uint8Array(read.get(`${FOLDER}a.stp`)!)).toEqual(
        new Uint8Array(files[0][1]),
      );
    }
  });

  it("throws on a missing member and on bytes that aren't a zip", () => {
    const zip = zipOf([["x", new Uint8Array([1])]]);
    expect(() => unzipMembers(zip, ["y"])).toThrow(/no member y/);
    expect(() => unzipMembers(new Uint8Array(100), ["x"])).toThrow(/zip/);
  });
});

describe("ensureStepSamples", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "step-ensure-"));
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const zip = zipOf(files.map(([f, d]) => [FOLDER + f, d]));
  const dataset = {
    ...STEP_DATASET,
    bytes: zip.length,
    sha256: sha256(zip),
  };
  const serving =
    (body: Uint8Array): typeof fetch =>
    async () =>
      new Response(body as BodyInit, { status: 200 });

  it("keeps only the pinned files, with a NOTICE, and checks them again next time", async () => {
    const store = join(root, "store");
    const log: string[] = [];
    await ensureStepSamples((line) => log.push(line), {
      dataset,
      samples,
      store,
      fetch: serving(zip),
    });
    verifyStepSamples(store, samples);
    expect(readFileSync(join(store, "NOTICE.txt"), "utf8")).toBe(
      stepSamplesNotice(dataset, samples),
    );
    expect(existsSync(`${store}.partial`)).toBe(false);
    expect(existsSync(join(store, "NIST-PMI-STEP-Files.zip"))).toBe(false);
    // A second call needs no network.
    await ensureStepSamples(() => undefined, {
      dataset,
      samples,
      store,
      fetch: () => Promise.reject(new Error("must not fetch")),
    });
  });

  it("refuses a zip with the wrong hash, leaving no store", async () => {
    const store = join(root, "store");
    const other = Buffer.from(zip);
    other[10] = other[10]! ^ 1;
    await expect(
      ensureStepSamples(() => undefined, {
        dataset,
        samples,
        store,
        fetch: serving(other),
      }),
    ).rejects.toThrow(/SHA-256 mismatch/);
    expect(existsSync(store)).toBe(false);
    expect(existsSync(`${store}.partial`)).toBe(false);
  });

  it("refuses a file that differs from its pin inside a zip that is the pinned one", async () => {
    const store = join(root, "store");
    const bent = samples.map((s, i) =>
      i === 1 ? { ...s, sha256: "0".repeat(64) } : s,
    );
    await expect(
      ensureStepSamples(() => undefined, {
        dataset,
        samples: bent,
        store,
        fetch: serving(zip),
      }),
    ).rejects.toThrow(/b\.stp: SHA-256 mismatch/);
    expect(existsSync(store)).toBe(false);
    expect(existsSync(`${store}.partial`)).toBe(false);
  });
});
