// 3D Tiles styles with string comparisons, against CesiumJS 1.x's
// `Cesium3DTileStyle` as the oracle: each feature of a small batch table
// is styled by 1.x (in JavaScript, on its strings) and by a `FeatureStyle`
// (compiled to WGSL over string ids, here run as JavaScript: the compiled
// expressions only use operators, `select` and the vector constructors).
// The GPU shows what the compiled expressions say, so agreement here is
// agreement in the render; test/featureStrings.test.ts covers the upload.
import Cesium3DTileStyle from "cesium-engine-oracle/Scene/Cesium3DTileStyle.js";
import Color from "cesium-oracle/Color.js";
import { describe, expect, it } from "vitest";
import {
  FeatureStyle,
  type FeatureStyleOptions,
} from "../src/scene/FeatureStyle.ts";
import { stringIds } from "../src/scene/stringIds.ts";

type Row = Record<string, string | number | null | undefined>;

/** A batch table of a few streets and buildings (a property can be missing). */
const ROWS: Row[] = [
  { name: "Main St", kind: "road", height: 0, "building:name": "Hall" },
  { name: "Oak Ave", kind: "road", height: 0 },
  { name: "Main St", kind: "school", height: 12 },
  { name: "Elm Ct", kind: "park", height: 0, "building:name": "Tower" },
  { name: "", kind: "tower", height: 80 },
  { kind: "hospital", height: 30, "building:name": "Hall" },
  { name: "Oak Ave", height: 7 },
  { name: "Pine Rd", kind: "tower", height: 14, alias: "Pine Rd" },
  // A number where the others have strings (1.x: never equal to one).
  { name: 3, kind: "road", height: 5 },
  // A null value (a property's noData): not equal to any string, as missing.
  { name: null, kind: null, height: 40 },
];

/** The compiled expression of a stage, as a function of its metadata. */
function expression(code: string, stage: "show" | "color") {
  const pattern =
    stage === "color"
      ? /let c = (.*);\n/
      : /if \((.*)\) \{\n {4}\(\*vsOutput\)\.positionMC/;
  const found = pattern.exec(code)?.[1];
  if (found === undefined) {
    throw new Error(`no ${stage} stage in ${code}`);
  }
  const javascript = found
    .replace(/(?:vs|fs)Input\.metadata\./g, "m.")
    .replace(/\b(\d+\.?\d*(?:e[+-]?\d+)?)f\b/g, "$1");
  return new Function(
    "m",
    "select",
    "vec4f",
    "styleHsl",
    "styleRound",
    "styleLinear",
    `return ${javascript};`,
  ) as (m: Record<string, number>, ...helpers: unknown[]) => boolean | number[];
}

/** A vector that answers to its swizzles, as WGSL's do. */
class Vec extends Array<number> {
  get r() {
    return this[0]!;
  }
  get g() {
    return this[1]!;
  }
  get b() {
    return this[2]!;
  }
  get a() {
    return this[3]!;
  }
}
const helpers = [
  (f: unknown, t: unknown, c: boolean) => (c ? t : f),
  (...v: number[]) => Vec.from(v.length === 1 ? [v[0], v[0], v[0], v[0]] : v),
  (h: number, s: number, l: number, a: number) => {
    const c = new Color();
    Color.fromHsl(h % 1, s, l, a, c);
    return Vec.from([c.red, c.green, c.blue, c.alpha]);
  },
  (x: number) => Math.floor(x + 0.5),
  // As the helper: sRGB as written to linear, the alpha as it is.
  (c: number[]) => Vec.from([...c.slice(0, 3).map((v) => v ** 2.2), c[3]]),
] as const;

/** 1.x and 2.0 style `rows` with `options`: what each says per feature. */
function styled(
  options: FeatureStyleOptions,
  rows: Row[] = ROWS,
  /** What 1.x is given, where it differs. */
  oracle: FeatureStyleOptions = options,
) {
  const old = new Cesium3DTileStyle({
    ...(oracle.show !== undefined ? { show: oracle.show } : {}),
    ...(oracle.color !== undefined ? { color: oracle.color } : {}),
    ...(oracle.defines ? { defines: oracle.defines } : {}),
  });
  const style = new FeatureStyle(options);
  const code = style.shader.code;
  const fields = style.shader.named.properties;
  const show =
    options.show !== undefined ? expression(code, "show") : undefined;
  const color =
    options.color !== undefined ? expression(code, "color") : undefined;
  // The tiles hold their strings' ids (World.uploadTable); numbers as
  // they are, and 0 where a property is missing.
  const held = new Set<string>();
  const ids = (row: Row) =>
    Object.fromEntries(
      Object.entries(fields).map(([field, property]) => {
        const value = row[property];
        if (typeof value === "string") {
          held.add(value);
          return [field, stringIds.retain(value)];
        }
        return [field, value ?? 0];
      }),
    );
  try {
    return rows.map((row) => {
      const feature = {
        getProperty: (name: string) => row[name],
        getPropertyInherited: (name: string) => row[name],
      };
      const m = ids(row);
      const result: {
        show: [boolean, boolean] | undefined;
        color: [number[], number[]] | undefined;
      } = { show: undefined, color: undefined };
      if (show) {
        result.show = [
          old.show.evaluate(feature) as boolean,
          // Hidden when the compiled test says so.
          !show(m, ...helpers) as boolean,
        ];
      }
      if (color) {
        const c = old.color.evaluateColor(feature, new Color());
        // 1.x multiplies the material by the style's color gamma
        // corrected, which is the linear value 2.0 computes.
        result.color = [
          [c.red ** 2.2, c.green ** 2.2, c.blue ** 2.2, c.alpha],
          [...(color(m, ...helpers) as number[])],
        ];
      }
      return result;
    });
  } finally {
    // The tiles unload: their references go.
    for (const value of held) {
      stringIds.release(value);
    }
  }
}

function agree(
  options: FeatureStyleOptions,
  rows: Row[] = ROWS,
  oracle: FeatureStyleOptions = options,
) {
  styled(options, rows, oracle).forEach((r, i) => {
    if (r.show) {
      expect(r.show[1], `show, feature ${i}`).toBe(r.show[0]);
    }
    if (r.color) {
      r.color[0].forEach((v, k) => {
        expect(r.color![1][k], `color, feature ${i}`).toBeCloseTo(v, 5);
      });
    }
  });
}

describe("3D Tiles styles with strings, against 1.x", () => {
  it("shows by a string's equality and inequality", () => {
    agree({ show: "${name} === 'Main St'" });
    agree({ show: "${name} !== 'Main St'" });
    // 1.x has no loose `==` or `!=`; 2.0 reads them as the strict ones.
    agree({ show: "${name} == 'Oak Ave'" }, ROWS, {
      show: "${name} === 'Oak Ave'",
    });
    agree({ show: "${name} != 'Oak Ave'" }, ROWS, {
      show: "${name} !== 'Oak Ave'",
    });
    // The literal first, and a literal no tile has.
    agree({ show: "'Main St' === ${name}" });
    agree({ show: "${kind} === 'nonexistent'" });
    agree({ show: "${kind} !== 'nonexistent'" });
  });

  it("tells a missing property, an empty string and a number from a string", () => {
    // The sixth row has no name, the fifth an empty one, the last a number.
    agree({ show: "${name} === ''" });
    agree({ show: "${name} !== ''" });
    agree({ show: "${name} === 'Main St' || ${name} === 'Oak Ave'" });
    expect(styled({ show: "${name} !== 'x'" }).map((r) => r.show![0])).toEqual(
      ROWS.map(() => true),
    );
  });

  it("colors by conditions on strings, with numbers and defines", () => {
    agree({
      color: {
        conditions: [
          ["${kind} === 'park'", "color('green')"],
          [
            "${kind} === 'school' || ${kind} === 'hospital'",
            "color('#ff8800')",
          ],
          ["${height} > 10 && ${kind} === 'tower'", "rgb(10, 20, 30)"],
          ["${kind} !== 'road'", "hsl(0.6, 0.5, 0.4)"],
          ["true", "color('white', 0.5)"],
        ],
      },
    });
    agree({
      defines: { main: "${name} === 'Main St'", tall: "${height} > 10" },
      show: "${main} || ${tall}",
      color: "${main} ? color('red') : color('blue')",
    });
  });

  it("matches strings to results as 1.x's chain of conditions does", () => {
    // 1.x has no match(): the vector language's, against the same in
    // conditions.
    agree(
      {
        show: "match(${name}, 'Main St', true, 'Oak Ave', true, false)",
        color:
          "match(${kind}, 'park', color('lime'), 'school', color('yellow'), 'tower', color('red'), color('white'))",
      },
      ROWS,
      {
        show: "${name} === 'Main St' || ${name} === 'Oak Ave'",
        color:
          "${kind} === 'park' ? color('lime') : ${kind} === 'school' ? color('yellow') : ${kind} === 'tower' ? color('red') : color('white')",
      },
    );
  });

  it("reads a null value as 1.x does: equal to no string", () => {
    const nullRow = ROWS.length - 1;
    expect(ROWS[nullRow]!.kind).toBeNull();
    const [equal, unequal] = [
      styled({ show: "${kind} === 'park'" }),
      styled({ show: "${kind} !== 'park'" }),
    ];
    expect(equal[nullRow]!.show).toEqual([false, false]);
    expect(unequal[nullRow]!.show).toEqual([true, true]);
    agree({ show: "${name} !== ''" });
  });

  it("differs from 1.x in one case: a null property equals a missing one", () => {
    // The row with a null name and no alias: 1.x's null === undefined is
    // false; both read 0 on the GPU.
    const row = ROWS.length - 1;
    const [old, next] = styled({ show: "${name} === ${alias}" })[row]!.show!;
    expect([old, next]).toEqual([false, true]);
  });

  it("reads properties by the bracket form and compares two string properties", () => {
    agree({ show: "${feature['building:name']} === 'Hall'" });
    agree({ show: "${feature.kind} === 'road'" });
    // Not the null row: null and missing both read 0, so a null property
    // equals a missing one, which 1.x says it doesn't (see below).
    const withoutNull = ROWS.slice(0, -1);
    agree({ show: "${name} === ${alias}" }, withoutNull);
    agree({ show: "${name} !== ${alias}" }, withoutNull);
  });

  it("takes strings of tiles that load after the style", () => {
    // The style's literal is held before any tile has the string.
    const style = new FeatureStyle({ show: "${late} === 'Not Yet'" });
    expect(style.properties).toEqual(["late"]);
    agree({ show: "${late} === 'Not Yet'" }, [
      { late: "Not Yet" },
      { late: "Already" },
    ]);
  });
});

describe("the comparison itself", () => {
  it("fails for a style that differs from 1.x's", () => {
    expect(() =>
      agree({ show: "${name} === 'Main St'" }, ROWS, {
        show: "${name} !== 'Main St'",
      }),
    ).toThrow(/show, feature/);
    expect(() =>
      agree({ color: "color('red')" }, ROWS, { color: "color('blue')" }),
    ).toThrow(/color, feature/);
  });
});

describe("what string styles still refuse", () => {
  it.each([
    ["regExp('^Main').test(${name})", /methods \(\.test\(\)\)/],
    ["${name} =~ regExp('^Main')", /regExp\(\) isn't supported/],
    ["${name} === undefined", /undefined isn't supported/],
    ["isDefined(${name})", /isDefined\(\) isn't supported/],
    ["${name} + ' St' === 'Main St'", /needs numbers|outside color/],
    ["${name} === 'a' + 'b'", /outside color/],
  ])("%s", (show, message) => {
    expect(() => new FeatureStyle({ show })).toThrow(message);
  });
});
