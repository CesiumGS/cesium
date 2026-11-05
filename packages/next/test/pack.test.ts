import { describe, expect, it } from "vitest";
import { chebyshev } from "../src/ephemeris/chebyshev.ts";
import { readPack, writePack } from "../src/ephemeris/pack.ts";
import { readDaf } from "../src/ephemeris/spk.ts";
import { writeSpk } from "./spkWriter.ts";

const INIT = -200;
const LEN = 100;
const COUNT = 4;
const NCOEF = 3;
const RSIZE = 2 + 3 * NCOEF;

// Deterministic, distinct coefficients per record (not a physical polynomial;
// the pack must reproduce whatever the source evaluates to).
function makeRecords(): Float64Array {
  const out = new Float64Array(COUNT * RSIZE);
  for (let i = 0; i < COUNT; i++) {
    out[i * RSIZE] = INIT + (i + 0.5) * LEN;
    out[i * RSIZE + 1] = LEN / 2;
    for (let k = 0; k < 3 * NCOEF; k++) {
      out[i * RSIZE + 2 + k] = (i + 1) * 10 + k * 1.5 - (k % 2) * 7;
    }
  }
  return out;
}

const source = () =>
  readDaf(
    writeSpk({
      kind: "SPK",
      segments: [
        {
          target: 301,
          center: 3,
          frame: 1,
          init: INIT,
          intervalLength: LEN,
          recordSize: RSIZE,
          records: makeRecords(),
        },
      ],
    }),
  ).segments[0]!;

const manifest = {
  format: "cesium-chebyshev-pack/1" as const,
  source: "synthetic.bsp",
  sourceSha256: "0".repeat(64),
  span: ["1999-12-31T00:00:00Z", "2000-01-02T00:00:00Z"] as [string, string],
  derivedFrom: "Derived from synthetic.bsp (test data)",
};

const input = (start: number, end: number) => ({
  segment: source(),
  name: "moon",
  frame: "ICRF" as const,
  kind: "position" as const,
  start,
  end,
});

describe("Chebyshev packs", () => {
  it("round-trips a middle excerpt, matching the source at 20 instants", () => {
    const src = source();
    const bytes = writePack(manifest, [input(-90, 110)]);
    const { manifest: m, data } = readPack(bytes.slice().buffer as ArrayBuffer);
    const seg = m.segments[0]!;
    expect(seg.count).toBe(3); // [-90,110] touches records 1..3 (110 -> record 3)
    expect(m.source).toBe("synthetic.bsp");
    expect(m.sourceSha256).toBe(manifest.sourceSha256);
    expect(m.derivedFrom).toBe(manifest.derivedFrom);
    const a = new Float64Array(6);
    const b = new Float64Array(6);
    for (let i = 0; i < 20; i++) {
      const t = -90 + (200 * i) / 19 - (i === 19 ? 1e-9 : 0);
      chebyshev(src.coefficients(), RSIZE, INIT, LEN, t, a);
      chebyshev(
        data.subarray(seg.offset, seg.offset + seg.count * seg.recordSize),
        seg.recordSize,
        seg.init,
        seg.intervalLength,
        t,
        b,
      );
      expect(Array.from(b)).toEqual(Array.from(a));
    }
  });

  it("keeps the source's record boundaries, moving init by whole intervals", () => {
    const bytes = writePack(manifest, [input(-50, -1)]);
    const { manifest: m } = readPack(bytes.slice().buffer);
    const seg = m.segments[0]!;
    expect(seg.init).toBe(INIT + 1 * LEN);
    expect(seg.count).toBe(1);
    expect([seg.start, seg.end]).toEqual([-50, -1]);
    expect(seg.offset).toBe(0);
  });

  it("lays out several segments in order and clips the span", () => {
    const bytes = writePack(manifest, [input(-1000, 1000), input(0, 50)]);
    const { manifest: m, data } = readPack(bytes.slice().buffer);
    expect(m.segments.map((s) => [s.count, s.offset])).toEqual([
      [4, 0],
      [1, 4 * RSIZE],
    ]);
    expect([m.segments[0]!.start, m.segments[0]!.end]).toEqual([INIT, 200]);
    expect(data.byteOffset % 8).toBe(0);
    expect(data.length).toBe(5 * RSIZE);
  });

  it("throws when the span misses the source segment", () => {
    expect(() => writePack(manifest, [input(500, 600)])).toThrow(
      'pack: segment "moon" does not overlap [start, end]',
    );
  });

  it("rejects bad magic, unknown formats and truncation", () => {
    const good = writePack(manifest, [input(-90, 110)]);
    const bad = good.slice();
    bad[0] = 0x58;
    expect(() => readPack(bad.buffer)).toThrow("pack: not a Chebyshev pack");

    const patched = good.slice();
    const at = new TextDecoder().decode(patched.subarray(8, 400)).indexOf("/1");
    patched[8 + at + 1] = 0x39; // "/1" -> "/9" within the manifest JSON
    expect(() => readPack(patched.buffer)).toThrow(
      'pack: unsupported format "cesium-chebyshev-pack/9"',
    );

    expect(() => readPack(good.slice(0, good.length - 8).buffer)).toThrow(
      /pack: bad segment "moon": .*past the end of the pack/,
    );
    expect(() => readPack(good.slice(0, 20).buffer)).toThrow("pack: truncated");
  });

  describe("validates each segment's layout", () => {
    /** The pack `good` with its manifest JSON edited, records unchanged. */
    const edited = (
      edit: (m: Record<string, unknown>) => void,
    ): ArrayBuffer => {
      const good = writePack(manifest, [input(-90, 110)]);
      const length = new DataView(good.buffer).getUint32(4, true);
      const m = JSON.parse(
        new TextDecoder().decode(good.subarray(8, 8 + length)),
      ) as Record<string, unknown>;
      edit(m);
      const records = good.subarray(Math.ceil((8 + length) / 8) * 8);
      const json = new TextEncoder().encode(JSON.stringify(m));
      const start = Math.ceil((8 + json.length) / 8) * 8;
      const out = new Uint8Array(start + records.length);
      out.set(good.subarray(0, 4));
      new DataView(out.buffer).setUint32(4, json.length, true);
      out.set(json, 8);
      out.set(records, start);
      return out.buffer;
    };
    const segmentEdit =
      (field: string, value: unknown) => (m: Record<string, unknown>) => {
        (m.segments as Record<string, unknown>[])[0]![field] = value;
      };

    it("accepts the unedited pack", () => {
      expect(readPack(edited(() => {})).manifest.segments).toHaveLength(1);
    });

    it.each([
      ["offset", -1, /offset/],
      ["offset", 1.5, /offset/],
      ["count", -1, /count/],
      ["recordSize", 0, /recordSize/],
      ["recordSize", 12, /recordSize/],
      ["recordSize", 11.5, /recordSize/],
      ["intervalLength", 0, /intervalLength/],
      ["intervalLength", -100, /intervalLength/],
      ["start", 1000, /start/],
      ["offset", 1, /past the end of the pack/],
      ["count", 1000, /past the end of the pack/],
    ])("rejects %s = %s", (field, value, why) => {
      expect(() => readPack(edited(segmentEdit(field, value)))).toThrow(
        /^pack: bad segment "moon": /,
      );
      expect(() => readPack(edited(segmentEdit(field, value)))).toThrow(why);
    });

    it("rejects a manifest whose segments is not an array", () => {
      expect(() =>
        readPack(
          edited((m) => {
            m.segments = { moon: 1 };
          }),
        ),
      ).toThrow('pack: bad manifest: "segments" is not an array');
    });
  });
});
