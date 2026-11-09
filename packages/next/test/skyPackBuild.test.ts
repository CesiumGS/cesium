// The script that builds a sky pack locally (scripts/skyPack.mjs and
// scripts/skyPack/): the EXR reader, peaks, calibration, the hybrid, colors
// and a whole build. Every fixture is synthetic, made here; no network.
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { afterAll, describe, expect, it } from "vitest";
import {
  parseManifest,
  readBackground,
  readPoints,
} from "../src/atmosphere/skyPack.ts";
import { buildPack } from "../scripts/skyPack.mjs";
import { floatToHalf } from "../scripts/skyPack/background.mjs";
import {
  direction,
  fitFluxCurve,
  luminanceOf,
  mergeHybrid,
  starColor,
} from "../scripts/skyPack/calibrate.mjs";
import { readExr } from "../scripts/skyPack/exr.mjs";
import { findPeaks, xOfRa, yOfDec } from "../scripts/skyPack/peaks.mjs";
import { RECIPES } from "../scripts/skyPack/recipes.mjs";

const work = mkdtempSync(join(tmpdir(), "sky-pack-build-"));
afterAll(() => rmSync(work, { recursive: true, force: true }));

/** An EXR with channels B, G and R as half floats, ZIP-compressed (or not). */
function writeExr(
  width: number,
  height: number,
  rgb: [Float32Array, Float32Array, Float32Array],
  compression = 3,
): Uint8Array {
  const attr = (name: string, type: string, value: Uint8Array) => {
    const head = Buffer.from(`${name}\0${type}\0`, "latin1");
    const size = Buffer.alloc(4);
    size.writeInt32LE(value.length);
    return Buffer.concat([head, size, value]);
  };
  const channels = Buffer.concat([
    ...["B", "G", "R"].map((n) => {
      const b = Buffer.alloc(16);
      b.writeInt32LE(1, 0); // half
      b.writeInt32LE(1, 8);
      b.writeInt32LE(1, 12);
      return Buffer.concat([Buffer.from(`${n}\0`), b]);
    }),
    Buffer.from([0]),
  ]);
  const window = Buffer.alloc(16);
  window.writeInt32LE(width - 1, 8);
  window.writeInt32LE(height - 1, 12);
  const header = Buffer.concat([
    Buffer.from([0x76, 0x2f, 0x31, 0x01, 2, 0, 0, 0]),
    attr("channels", "chlist", channels),
    attr("compression", "compression", Buffer.from([compression])),
    attr("dataWindow", "box2i", window),
    Buffer.from([0]),
  ]);
  const per = compression === 3 ? 16 : 1;
  const blocks: Buffer[] = [];
  for (let y0 = 0; y0 < height; y0 += per) {
    const rows = Math.min(per, height - y0);
    const raw = Buffer.alloc(rows * 3 * width * 2);
    let p = 0;
    for (let r = 0; r < rows; r++) {
      for (const channel of [rgb[2], rgb[1], rgb[0]]) {
        for (let x = 0; x < width; x++, p += 2) {
          raw.writeUInt16LE(floatToHalf(channel[(y0 + r) * width + x]!), p);
        }
      }
    }
    let data: Buffer = raw;
    if (compression !== 0) {
      const t = Buffer.alloc(raw.length);
      const half = (raw.length + 1) >> 1;
      // Reorder: even bytes first, then odd.
      for (let i = 0, k = 0; k < raw.length; i++) {
        t[i] = raw[k++]!;
        if (k < raw.length) {
          t[half + i] = raw[k++]!;
        }
      }
      for (let i = t.length - 1; i > 0; i--) {
        t[i] = (t[i]! - t[i - 1]! + 128) & 255;
      }
      data = deflateSync(t);
    }
    const head = Buffer.alloc(8);
    head.writeInt32LE(y0, 0);
    head.writeInt32LE(data.length, 4);
    blocks.push(Buffer.concat([head, data]));
  }
  const table = Buffer.alloc(blocks.length * 8);
  let at = header.length + table.length;
  blocks.forEach((b, i) => {
    table.writeUInt32LE(at, i * 8);
    at += b.length;
  });
  return Buffer.concat([header, table, ...blocks]);
}

function plane(width: number, height: number) {
  return [0, 1, 2].map(() => new Float32Array(width * height)) as [
    Float32Array,
    Float32Array,
    Float32Array,
  ];
}

/** Adds a Gaussian of `amplitude` (σ in x and y) centered at (cx, cy). */
function blob(
  img: Float32Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  amplitude: number,
  sx = 0.8,
  sy = 0.8,
) {
  const rx = Math.ceil(sx * 4);
  const ry = Math.ceil(sy * 4);
  for (let dy = -ry; dy <= ry; dy++) {
    for (let dx = -rx; dx <= rx; dx++) {
      const x = Math.round(cx) + dx;
      const y = Math.round(cy) + dy;
      if (y < 0 || y >= height) {
        continue;
      }
      const v =
        amplitude *
        Math.exp(-0.5 * (((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));
      const i = y * width + ((x + width) % width);
      img[i] = Math.max(img[i]!, v);
    }
  }
}

describe("readExr", () => {
  const w = 40;
  const h = 35; // not a multiple of 16
  const img = plane(w, h);
  for (let i = 0; i < w * h; i++) {
    img[0][i] = (i % 17) / 16;
    img[1][i] = (i % 5) / 8;
    img[2][i] = 0.25;
  }
  const same = (a: Float32Array, b: Float32Array) =>
    a.every((v, i) => Math.abs(v - b[i]!) <= Math.abs(b[i]!) / 1000 + 1e-6);

  it("reads a ZIP half-float image back within rounding", () => {
    const out = readExr(writeExr(w, h, img));
    expect(out.width).toBe(w);
    expect(out.height).toBe(h);
    expect(same(out.channels.R!, img[0])).toBe(true);
    expect(same(out.channels.G!, img[1])).toBe(true);
    expect(same(out.channels.B!, img[2])).toBe(true);
  });

  it("reads an uncompressed one", () => {
    expect(same(readExr(writeExr(w, h, img, 0)).channels.R!, img[0])).toBe(
      true,
    );
  });

  it("refuses PIZ by name", () => {
    expect(() => readExr(writeExr(w, h, img, 4))).toThrow("PIZ");
  });

  it("refuses a claimed 100,000 x 100,000 before allocating", () => {
    const bytes = writeExr(w, h, img);
    // The data window's max x and y, found by its bytes.
    const view = new DataView(bytes.buffer, bytes.byteOffset);
    const text = Buffer.from(bytes).indexOf("dataWindow");
    const at = text + "dataWindow\0box2i\0".length + 4;
    view.setInt32(at + 8, 99_999, true);
    view.setInt32(at + 12, 99_999, true);
    expect(() => readExr(bytes)).toThrow(/refused/);
  });

  it("refuses a bad magic and a truncated file", () => {
    expect(() => readExr(new Uint8Array(16))).toThrow("magic");
    expect(() => readExr(writeExr(w, h, img).slice(0, 80))).toThrow();
  });
});

describe("findPeaks", () => {
  const W = 256;
  const H = 128;
  const at = (ra: number, dec: number, amplitude = 0.5, sx = 0.8, sy = 0.8) => {
    const img = plane(W, H);
    return { img, put: undefined as never, ra, dec, amplitude, sx, sy };
  };
  void at;

  it("finds Gaussians at known RA and Dec within 0.3 texels", () => {
    const lum = new Float32Array(W * H);
    const stars = [
      [100, 20],
      [10, -35],
      [200.3, 60],
      [300, -10.6],
    ];
    for (const [ra, dec] of stars) {
      blob(lum, W, H, xOfRa(ra!, W), yOfDec(dec!, H), 0.4);
    }
    const peaks = findPeaks(lum, W, H);
    expect(peaks).toHaveLength(stars.length);
    for (const [ra, dec] of stars) {
      const p = peaks.find(
        (q) => Math.abs(q.ra - ra!) < 2 && Math.abs(q.dec - dec!) < 2,
      )!;
      expect(p).toBeDefined();
      const dx = (p.ra - ra!) * Math.cos((dec! * Math.PI) / 180) * (W / 360);
      const dy = (p.dec - dec!) * (H / 180);
      expect(Math.hypot(dx, dy)).toBeLessThan(0.3);
    }
  });

  it("counts a flat-topped disc once", () => {
    const lum = new Float32Array(W * H);
    for (let y = 40; y <= 46; y++) {
      for (let x = 100; x <= 106; x++) {
        lum[y * W + x] = 1;
      }
    }
    expect(findPeaks(lum, W, H)).toHaveLength(1);
  });

  it("counts a disc stretched in x at Dec 85 once, two peaks 3 texels apart at the equator twice", () => {
    const stretched = new Float32Array(W * H);
    blob(stretched, W, H, 120, yOfDec(85, H), 0.5, 11.5, 0.8);
    expect(findPeaks(stretched, W, H)).toHaveLength(1);
    const pair = new Float32Array(W * H);
    blob(pair, W, H, 60, yOfDec(0, H), 0.5);
    blob(pair, W, H, 63, yOfDec(0, H), 0.5);
    expect(findPeaks(pair, W, H)).toHaveLength(2);
  });

  it("counts a star on the RA seam once", () => {
    const lum = new Float32Array(W * H);
    blob(lum, W, H, -0.5, 50, 0.4); // between the last column and the first
    const peaks = findPeaks(lum, W, H);
    expect(peaks).toHaveLength(1);
    expect(Math.abs(peaks[0]!.ra - 180)).toBeLessThan(1.5);
  });

  it("gives a color from the channels", () => {
    const rgb = plane(W, H);
    blob(rgb[0], W, H, 50, 50, 0.4);
    blob(rgb[1], W, H, 50, 50, 0.2);
    blob(rgb[2], W, H, 50, 50, 0.1);
    const lum = rgb[0].map(
      (v, i) => 0.2126 * v + 0.7152 * rgb[1][i]! + 0.0722 * rgb[2][i]!,
    );
    const [peak] = findPeaks(lum, W, H, rgb);
    expect(peak!.color![0]).toBeGreaterThan(peak!.color![1]);
    expect(peak!.color![1]).toBeGreaterThan(peak!.color![2]);
  });
});

describe("fitFluxCurve", () => {
  const truth = (f: number) =>
    4 - 2.5 * Math.log10(f) * 1.05 + 0.2 * Math.log10(f) ** 2;
  const random = (() => {
    let s = 7;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  })();

  it("recovers a known non-linear curve within 0.05 magnitudes", () => {
    const pairs = Array.from({ length: 4000 }, () => {
      const f = 10 ** (-1 + random() * 1.8);
      return { flux: f, magnitude: truth(f) };
    });
    const curve = fitFluxCurve(pairs);
    for (const l of [-0.8, -0.5, -0.1, 0.3, 0.6]) {
      expect(Math.abs(curve(10 ** l) - truth(10 ** l))).toBeLessThan(0.05);
    }
  });

  it("is monotone with noisy pairs", () => {
    const pairs = Array.from({ length: 4000 }, () => {
      const f = 10 ** (-1 + random() * 1.8);
      return { flux: f, magnitude: truth(f) + (random() - 0.5) * 0.4 };
    });
    const curve = fitFluxCurve(pairs);
    let last = Infinity;
    for (let l = -1.5; l < 1.5; l += 0.01) {
      const m = curve(10 ** l);
      expect(m).toBeLessThanOrEqual(last + 1e-9);
      last = m;
    }
  });
});

describe("mergeHybrid and starColor", () => {
  const star = (ra: number, dec: number, mag: number) => ({
    dir: direction(ra, dec),
    mag,
    color: [1, 1, 1],
  });

  it("takes a bright star from the catalog only, keeps a faint map star", () => {
    const catalog = [star(10, 10, 2), star(50, 20, 6.9), star(80, 0, 8)];
    const map = [
      star(10, 10.0001, 2.3), // the same bright star
      star(120, 30, 9), // faint, in no catalog
      star(80, 0, 8.1), // the catalog's magnitude 8 star: not used, so the map's stays
    ];
    const merged = mergeHybrid(catalog, map, 7);
    expect(merged.map((s) => s.mag)).toEqual([2, 6.9, 8.1, 9]);
  });

  it("never uses a catalog star at magnitude 8, and sorts brightest first", () => {
    const merged = mergeHybrid(
      [star(0, 0, 8)],
      [star(40, 40, 7.5), star(60, 60, 7.2)],
      7,
    );
    expect(merged.map((s) => s.mag)).toEqual([7.2, 7.5]);
  });

  it("makes B-V 1.85 redder than B-V -0.03, luminance 1", () => {
    const red = starColor(1.85);
    const blue = starColor(-0.03);
    expect(red[0]! / red[2]!).toBeGreaterThan(blue[0]! / blue[2]!);
    expect(Math.abs(luminanceOf(red) - 1)).toBeLessThan(1e-6);
    expect(Math.abs(luminanceOf(blue) - 1)).toBeLessThan(1e-6);
  });
});

describe("buildPack", () => {
  const W = 256;
  const H = 128;
  const N = 120;
  // A grid of stars, each its own amplitude; the catalog's magnitude follows.
  const rgb = plane(W, H);
  const rows = ["id,proper,ra,dec,mag,ci"];
  for (let k = 0; k < N; k++) {
    const x = 8 + (k % 24) * 10;
    const y = 12 + Math.floor(k / 24) * 20;
    const amplitude = 0.02 * 40 ** (k / (N - 1));
    for (const c of rgb) {
      blob(c, W, H, x, y, amplitude);
    }
    const ra = (0.5 - (x + 0.5) / W) * 360;
    const dec = 90 - ((y + 0.5) / H) * 180;
    rows.push(
      `${k},,${(((ra % 360) + 360) % 360) / 15},${dec},${10 - 2.5 * Math.log10(amplitude / 0.02)},0.6`,
    );
  }
  const dir = join(work, "inputs");
  mkdirSync(dir);
  writeFileSync(join(dir, "points.exr"), writeExr(W, H, rgb));
  const sky = plane(64, 32).map((c) => c.fill(0.05)) as ReturnType<
    typeof plane
  >;
  writeFileSync(join(dir, "background.exr"), writeExr(64, 32, sky));
  writeFileSync(join(dir, "catalog.csv"), rows.join("\n"));
  const files = {
    points: join(dir, "points.exr"),
    background: join(dir, "background.exr"),
    catalog: join(dir, "catalog.csv"),
  };

  it("writes a pack that passes the reader's checks, never distributable", () => {
    const outDir = join(work, "pack");
    const manifest = buildPack({ outDir, files, backgroundSize: 4 });
    const parsed = parseManifest(
      JSON.parse(readFileSync(join(outDir, "manifest.json"), "utf8")),
    );
    expect(parsed.distributable).toBe(false);
    expect(parsed.clearance).toBeUndefined();
    expect(parsed.sources.length).toBeGreaterThanOrEqual(3);
    expect(parsed.credits.length).toBeGreaterThan(0);
    // A star within the fit's error of the split (7) can fall between the
    // catalog's and the map's halves.
    expect(manifest.points.count).toBeGreaterThan(N - 6);
    expect(manifest.points.count).toBeLessThanOrEqual(N);
    const bytes = (f: string) => {
      const b = readFileSync(join(outDir, f));
      return b.buffer.slice(
        b.byteOffset,
        b.byteOffset + b.byteLength,
      ) as ArrayBuffer;
    };
    const points = readPoints(bytes("points.bin"), parsed);
    expect(points.length).toBe(manifest.points.count * 8);
    expect(points[3]).toBeGreaterThan(
      points[(manifest.points.count - 1) * 8 + 3]!,
    ); // brightest first
    const faces = readBackground(bytes("background.bin"), parsed);
    expect(faces[0]).toHaveLength(parsed.background.levels);
    expect(parsed.background.meanLuminance).toBeGreaterThan(0);
  });

  it("refuses an output inside the repository", () => {
    expect(() =>
      buildPack({
        outDir: join(process.cwd(), "sky-pack-out"),
        files,
        backgroundSize: 4,
      }),
    ).toThrow("git worktree");
  });

  it("refuses --catalog without --allow-unsettled-terms, and notes a supplied one", () => {
    const outDir = join(work, "pack2");
    expect(() =>
      buildPack({ outDir, files, backgroundSize: 4, catalog: files.catalog }),
    ).toThrow("--allow-unsettled-terms");
    const manifest = buildPack({
      outDir,
      files,
      backgroundSize: 4,
      catalog: files.catalog,
      allowUnsettledTerms: true,
    });
    expect(
      manifest.sources.some((s) => s.name.startsWith("supplied locally")),
    ).toBe(true);
    expect(manifest.distributable).toBe(false);
  });
});

describe("RECIPES", () => {
  it("never mark a pack distributable, and have no raw ESA source", () => {
    for (const recipe of Object.values(RECIPES)) {
      expect(recipe.distributable).toBe(false);
      for (const s of recipe.sources) {
        expect(s.url).not.toMatch(
          /gea\.esac\.esa\.int|cosmos\.esa\.int|cds\.unistra\.fr/,
        );
        expect(s.terms).toMatch(/2026-\d\d-\d\d|same page and date/);
        expect(s.sha256).toMatch(/^[0-9a-f]{64}$/);
        expect(s.bytes).toBeGreaterThan(0);
        expect(s.credit.length).toBeGreaterThan(0);
      }
    }
  });
  it("are not written to say distributable anywhere in the script", () => {
    for (const f of ["scripts/skyPack.mjs", "scripts/skyPack/recipes.mjs"]) {
      const code = readFileSync(join(process.cwd(), f), "utf8");
      expect(code).not.toMatch(/distributable:\s*true|clearance:\s*\{/);
    }
  });
});
