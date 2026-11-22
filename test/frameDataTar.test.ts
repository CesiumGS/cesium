// The frame-data script's tar reader and previous-manifest reader.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { extractTar, readPreviousFiles } from "../scripts/frameData.mjs";

/** One ustar entry with the size field written as given. */
function entry(name: string, content: string, sizeField?: string): Buffer {
  const header = Buffer.alloc(512);
  header.write(name, 0, "utf8");
  header.write(
    sizeField ?? `${content.length.toString(8).padStart(11, "0")}\0`,
    124,
  );
  header.write("0", 156);
  const body = Buffer.alloc(Math.ceil(content.length / 512) * 512);
  body.write(content, 0, "utf8");
  return Buffer.concat([header, body]);
}

const archive = (...entries: Buffer[]) =>
  gzipSync(Buffer.concat([...entries, Buffer.alloc(1024)]));

describe("extractTar", () => {
  it("reads a well-formed entry", () => {
    const files = extractTar(archive(entry("a.txt", "hello")), ["a.txt"]);
    expect(Buffer.from(files.get("a.txt")!).toString()).toBe("hello");
  });

  it("refuses a negative or non-octal size", () => {
    for (const field of ["-0000000010\0", "00000000089\0", "12z\0", "1e3\0"]) {
      expect(() =>
        extractTar(archive(entry("a.txt", "hello", field)), ["a.txt"]),
      ).toThrow(/bad size/);
    }
  });
});

describe("readPreviousFiles", () => {
  const withManifest = (text: string | undefined) => {
    const dir = mkdtempSync(join(tmpdir(), "frames-manifest-"));
    try {
      if (text !== undefined) {
        writeFileSync(join(dir, "manifest.json"), text);
      }
      return readPreviousFiles(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };

  it("defaults a missing, unreadable or file-less manifest to []", () => {
    expect(withManifest(undefined)).toEqual([]);
    expect(withManifest("not json")).toEqual([]);
    expect(withManifest("{}")).toEqual([]);
    expect(withManifest('{"files": null}')).toEqual([]);
  });

  it("returns the entries of a manifest", () => {
    expect(withManifest('{"files": [{"file": "a"}]}')).toEqual([{ file: "a" }]);
  });
});
