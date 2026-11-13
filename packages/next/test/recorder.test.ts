import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MAX_RECORD_BYTES,
  checkBody,
  framePath,
  isPng,
  parseTick,
  pathInside,
  recordFileName,
  sanitizePageId,
} from "../scripts/vitePluginRecord.ts";
import {
  RECORD_COLUMNS,
  RECORD_HEADER,
  RowBuffer,
  formatNumber,
  gpuRow,
  parseFrames,
  tickRow,
} from "../widgets/recorderRows.ts";

const cells = (row: string) => row.split(",");
const col = (row: string, name: (typeof RECORD_COLUMNS)[number]) =>
  cells(row)[RECORD_COLUMNS.indexOf(name)];

describe("recorder rows", () => {
  it("keeps the columns stable and every row as wide as the header", () => {
    expect(RECORD_HEADER).toBe(RECORD_COLUMNS.join(","));
    expect(RECORD_COLUMNS.slice(0, 5)).toEqual([
      "kind",
      "t_ms",
      "tick",
      "state",
      "why",
    ]);
    const t = tickRow({ t: 1, tick: 1, rendering: true, why: [] });
    const g = gpuRow(2, 1, 3, { a: 1 });
    expect(cells(t)).toHaveLength(RECORD_COLUMNS.length);
    expect(cells(g)).toHaveLength(RECORD_COLUMNS.length);
  });

  it("files a late GPU row under the tick that drew it", () => {
    const buffer = new RowBuffer();
    buffer.push(tickRow({ t: 10, tick: 5, rendering: true, why: ["camera"] }));
    buffer.push(tickRow({ t: 30, tick: 8, rendering: false, why: ["wake"] }));
    buffer.push(
      gpuRow(31, 5, 1.2345678, { opaque: 0.9, "glare.sources": 0.3 }),
    );
    const rows = buffer.take().trim().split("\n");
    expect(col(rows[2]!, "kind")).toBe("gpu");
    expect(col(rows[2]!, "tick")).toBe("5");
    expect(col(rows[2]!, "gpu_ms")).toBe("1.235");
    expect(col(rows[2]!, "passes")).toBe("opaque=0.9 glare.sources=0.3");
    expect(buffer.take()).toBe("");
  });

  it("writes numbers plainly", () => {
    expect(formatNumber(12)).toBe("12");
    expect(formatNumber(0.00001)).toBe("0");
    expect(formatNumber(-0.0001)).toBe("0");
    expect(formatNumber(1.5)).toBe("1.5");
    expect(formatNumber(1e21 / 1e9)).toBe("1000000000000");
    expect(formatNumber(Number.NaN)).toBe("");
    const row = tickRow({
      t: 5,
      tick: 2,
      rendering: false,
      why: ["wake", "tiles"],
      cacheBytes: 3 * 1048576,
      cpuMs: 4,
    });
    expect(col(row, "why")).toBe("wake+tiles");
    expect(col(row, "cache_mb")).toBe("3");
    expect(col(row, "cpu_ms")).toBe("");
    expect(col(row, "state")).toBe("idle");
  });

  it("parses frame modes", () => {
    const every = parseFrames("every:10")!;
    expect([every(10), every(11), every(20)]).toEqual([true, false, true]);
    const at = parseFrames("at:120,240")!;
    expect([at(120), at(240), at(121)]).toEqual([true, true, false]);
    expect(parseFrames("every:0")).toBeUndefined();
    expect(parseFrames("../x")).toBeUndefined();
    expect(parseFrames(null)).toBeUndefined();
  });
});

describe("record endpoint", () => {
  it("sanitizes page ids and keeps files inside the folder", () => {
    expect(sanitizePageId("../../etc/passwd")).toBe("______etc_passwd");
    expect(sanitizePageId("")).toBe("page");
    expect(sanitizePageId("a".repeat(100))).toHaveLength(32);
    const dir = mkdtempSync(join(tmpdir(), "rec-"));
    expect(pathInside(dir, "../x.csv")).toBeUndefined();
    expect(pathInside(dir, "a/b.csv")).toBeUndefined();
    expect(pathInside(dir, "ok.csv")).toBe(join(dir, "ok.csv"));
    const name = recordFileName(new Date("2026-11-12T10:20:30.456Z"), "a/b");
    expect(name).toBe("2026-11-12T10-20-30Z-a_b.csv");
    expect(framePath(dir, name, 7)).toBe(
      join(dir, "2026-11-12T10-20-30Z-a_b", "frame-7.png"),
    );
    expect(existsSync(dir)).toBe(true);
    expect(readFileSync).toBeDefined();
  });

  it("limits the size and accepts only rows of numbers and short names", () => {
    const ok = tickRow({ t: 1, tick: 1, rendering: true, why: ["camera"] });
    expect(checkBody(`${ok}\n${ok}\n`)).toEqual([ok, ok]);
    expect(checkBody("x".repeat(MAX_RECORD_BYTES + 1))).toBe("body too large");
    expect(checkBody("")).toBe("no rows");
    expect(checkBody("1,2,3")).toBe("wrong number of columns");
    const bad = cells(ok);
    bad[4] = "<script>";
    expect(checkBody(bad.join(","))).toMatch(/not a number/);
    bad[4] = "x".repeat(601);
    expect(checkBody(bad.join(","))).toMatch(/not a number/);
  });

  it("checks ticks and PNG bytes", () => {
    expect(parseTick("120")).toBe(120);
    expect(parseTick("-1")).toBeUndefined();
    expect(parseTick("../1")).toBeUndefined();
    expect(
      isPng(
        Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]),
      ),
    ).toBe(true);
    expect(isPng(Uint8Array.from([1, 2, 3]))).toBe(false);
  });
});
