import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { splitHigh, splitVec3 } from "../src/math/transforms.ts";

/**
 * Float64 positions reach the GPU as float32 pairs (hi, lo). Two rules keep
 * their precision (CESIUM2_WEBGPU_PLAN.md §3.3, "Precision"):
 *
 * - Shaders combine hi/lo values only through `hiLoDifference` (an offset
 *   between positions, the highs subtracted as integers so relaxed math
 *   can't reassociate them: on an M-series Mac the float form erred
 *   0.45 m) and `hiLoSum` (a coarse absolute position); in Slang only
 *   through `SplitPosition` (common.slang: its `difference` and
 *   `approximate` are those two). Any other arithmetic on them fails
 *   this test.
 * - The CPU splits with `splitVec3`/`splitHigh` only (whole-meter highs).
 *
 * The GPU side of the guarantee is measured by spikes/precision.html
 * (`npm run bench -- precision`), which fails past its bound.
 */

const root = fileURLToPath(new URL("..", import.meta.url));
/** The hi/lo fields shaders see (common.slang View and Transform, rays). */
const SPLIT = /\b(cameraHi|cameraLo|originHi|originLo)\b/;
const HELPERS = /\b(hiLoDifference|hiLoSum|SplitPosition)\s*\(/g;

function files(directory: string, pattern: RegExp): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      return name === "node_modules" || name === "generated"
        ? []
        : files(path, pattern);
    }
    return pattern.test(name) ? [path] : [];
  });
}

/** A helper call's span from its name to its closing parenthesis. */
function withoutHelperCalls(line: string): string {
  let out = line;
  for (;;) {
    HELPERS.lastIndex = 0;
    const m = HELPERS.exec(out);
    if (!m) {
      return out;
    }
    let depth = 0;
    let end = m.index + m[0].length - 1;
    for (; end < out.length; end++) {
      if (out[end] === "(") {
        depth++;
      } else if (out[end] === ")" && --depth === 0) {
        break;
      }
    }
    out = out.slice(0, m.index) + out.slice(end + 1);
  }
}

/** Whether a source line does arithmetic on hi/lo values outside the helpers. */
function misusesSplit(text: string, typescript: boolean): boolean {
  const line = text.replace(/\/\/.*$/, "");
  if (!SPLIT.test(line)) {
    return false;
  }
  // Declarations: struct fields (WGSL `name: vec3f`, Slang `float3 name;`).
  if (
    /^\s*(public\s+)?\w+\s*:\s*vec3f\s*,?\s*$/.test(line) ||
    /^\s*(public\s+)?float3\s+\w+\s*;\s*$/.test(line)
  ) {
    return false;
  }
  // TypeScript reading or writing the layout's words (not WGSL).
  if (typescript && !/`|\b(let|var|fn)\b/.test(line)) {
    return false;
  }
  return SPLIT.test(withoutHelperCalls(line));
}

describe("hi/lo precision", () => {
  it("flags hi/lo arithmetic outside the helpers", () => {
    expect(
      misusesSplit(
        "  let rel = (t.originHi - view.cameraHi) + (t.originLo - view.cameraLo);",
        false,
      ),
    ).toBe(true);
    expect(
      misusesSplit("  let p = view.cameraHi + view.cameraLo;", false),
    ).toBe(true);
    expect(
      misusesSplit(
        "  let rel = hiLoDifference(t.originHi, t.originLo, view.cameraHi, view.cameraLo);",
        false,
      ),
    ).toBe(false);
    expect(
      misusesSplit(
        "  let up = normalize(rel + hiLoSum(view.cameraHi, view.cameraLo));",
        false,
      ),
    ).toBe(false);
    expect(misusesSplit("  cameraHi: vec3f,", false)).toBe(false);
    expect(
      misusesSplit(
        "  return SplitPosition(view.cameraHi, view.cameraLo).approximate();",
        false,
      ),
    ).toBe(false);
    expect(
      misusesSplit("  float3 p = view.cameraHi + view.cameraLo;", false),
    ).toBe(true);
  });

  it("combines split positions only through hiLoDifference and hiLoSum", () => {
    const sources = [
      ...files(join(root, "src"), /\.(wgsl|slang|ts)$/),
      ...files(join(root, "spikes", "slang"), /\.slang$/),
    ];
    const violations: string[] = [];
    for (const path of sources) {
      const lines = readFileSync(path, "utf8").split("\n");
      lines.forEach((text, i) => {
        if (misusesSplit(text, path.endsWith(".ts"))) {
          violations.push(`${relative(root, path)}:${i + 1}: ${text.trim()}`);
        }
      });
    }
    expect(violations).toEqual([]);
  });

  it("splits on the CPU only through splitVec3 and splitHigh", () => {
    // `fround(value - high)` is the low half of a split: written anywhere
    // else, the high half may not be the whole meters the GPU relies on.
    const violations: string[] = [];
    for (const path of files(join(root, "src"), /\.ts$/)) {
      if (path.endsWith(join("math", "transforms.ts"))) {
        continue;
      }
      readFileSync(path, "utf8")
        .split("\n")
        .forEach((text, i) => {
          if (/Math\.fround\(\s*\w+\s*-\s*\w+\s*\)/.test(text)) {
            const high = /Math\.fround\(\s*\w+\s*-\s*(\w+)\s*\)/.exec(text)![1];
            const source = readFileSync(path, "utf8");
            // Allowed when that high came from splitHigh.
            if (!new RegExp(`${high}\\s*=\\s*splitHigh\\(`).test(source)) {
              violations.push(
                `${relative(root, path)}:${i + 1}: ${text.trim()}`,
              );
            }
          }
        });
    }
    expect(violations).toEqual([]);
  });

  it("splits highs on whole meters, the low exact to float32", () => {
    const hi = new Float32Array(3);
    const lo = new Float32Array(3);
    for (const v of [
      [1334173.4567, -4655519.123, 4137747.9],
      [-0.25, 0.75, 12.5],
      [3.84e8 + 0.3, -(2 ** 24) - 0.5, 2 ** 23 + 0.25],
    ]) {
      splitVec3(Float64Array.from(v), hi, 0, lo, 0);
      for (let c = 0; c < 3; c++) {
        expect(Number.isInteger(hi[c]!)).toBe(true);
        expect(hi[c]).toBe(splitHigh(v[c]!));
        expect(Math.abs(hi[c]! + lo[c]! - v[c]!)).toBeLessThan(
          Math.max(1e-6, Math.abs(v[c]!) * 2 ** -46),
        );
      }
    }
  });
});
