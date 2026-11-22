// CS-49: Cesium IR's versioned JSON form. Every program in the test suite
// round-trips through it to the same shape key (and the same literal values,
// the sign of zero included); malformed files are refused with the right
// message; the schema validates every fixture and every written document;
// and a minor version stays readable by an older reader.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EXTENSIONS,
  IR_VERSION,
  IrFormatError,
  OPS,
  evaluate,
  programFromDocument,
  programToDocument,
  readProgram,
  shapeKey,
  writeProgram,
  type ExtensionTable,
  type Program,
  type Value,
} from "../packages/core/src/ir/index.ts";
import { wgslCases } from "../packages/core/src/ir/wgslCases.ts";
import { corpus } from "./irCorpus.ts";
import { validateSchema } from "./irJsonSchema.ts";

const SRC = join(import.meta.dirname, "../packages/core/src/ir");
const FIXTURES = join(import.meta.dirname, "fixtures/irJson");

const load = (path: string): unknown =>
  JSON.parse(readFileSync(join(FIXTURES, path), "utf8"));
const schema = JSON.parse(
  readFileSync(join(SRC, "cesium-ir-0.1.schema.json"), "utf8"),
) as Record<string, unknown>;

/** Values as bit patterns, so -0 and NaN compare exactly. */
const bits = (v: unknown): string =>
  JSON.stringify(v, (_k, x: unknown) =>
    typeof x === "number" && (Object.is(x, -0) || !Number.isFinite(x))
      ? String(x)
      : x,
  );

const refusal = (text: string, options?: Parameters<typeof readProgram>[1]) => {
  try {
    readProgram(text, options);
  } catch (error) {
    expect(error).toBeInstanceOf(IrFormatError);
    return error as IrFormatError;
  }
  throw new Error("the file was accepted");
};
const refusalOf = (doc: unknown, options?: Parameters<typeof readProgram>[1]) =>
  refusal(JSON.stringify(doc), options);
// The rules that apply from 1.0 (a minor stays readable) have no build that
// reads as 1.0 yet, so those tests read as it through an option.
const AS_1_0 = { readsVersion: "cesium-ir/1.0" };

const programs = corpus();

describe("every program in the test suite round-trips through JSON", () => {
  it("covers the suite's programs", () => {
    // The emitter's cases, the spike's, the built-ins', the samples', and the
    // passes' outputs on them.
    expect(programs.length).toBeGreaterThan(150);
    expect(new Set(programs.map((p) => p.name)).size).toBe(programs.length);
  });

  it("gives the same shape key, the same program and the same listing", () => {
    for (const { name, program } of programs) {
      const text = writeProgram(program);
      const back = readProgram(text);
      expect(shapeKey(back), name).toBe(shapeKey(program));
      // Literal values too (the shape key leaves them out), and zeros' signs.
      expect(bits(back), name).toBe(bits(program));
      // The text is a function of the program.
      expect(writeProgram(back), name).toBe(text);
    }
  });

  it("evaluates to the same values, on every row of every emitter case", () => {
    for (const c of wgslCases()) {
      const back = readProgram(writeProgram(c.program));
      for (const row of c.rows) {
        const inputs: Record<string, Value> = { ...c.uniforms, ...row };
        expect(bits(evaluate(back, inputs)), c.name).toBe(
          bits(evaluate(c.program, inputs)),
        );
      }
    }
  });

  it("keeps the values a JSON number can't hold", () => {
    const p = readProgram(
      readFileSync(join(FIXTURES, "specials.json"), "utf8"),
    );
    const values = p.eqns.map((e) => e.value);
    expect(Object.is(values[3], -0)).toBe(true);
    expect(bits(values[4])).toBe('["NaN","-Infinity"]');
    expect(bits(values[5])).toBe('[0.1,"Infinity",1e+21]');
    // And writes them back as the file has them.
    expect(programToDocument(p)).toEqual(load("specials.json"));
  });

  it("pins the written form of the spike's style program", () => {
    const style = programs.find((p) => p.name === "spike style")!.program;
    const doc = programToDocument(style);
    expect(doc.format).toBe("cesium-ir/0.1");
    expect(doc.vocabulary).toBe("KHR_interactivity");
    expect(doc.extensions).toEqual([]);
    // Leaves carry no operands; everything else names earlier equations.
    for (const e of doc.equations) {
      expect("args" in e).toBe(!["input", "const", "literal"].includes(e.op));
    }
    expect(doc.outputs.map((o) => o.name)).toEqual(
      style.outputs.map((o) => o.name),
    );
  });

  it("writes only programs of its own version", () => {
    const p = programs[0]!.program;
    expect(() => programToDocument({ ...p, version: "cesium-ir/1.0" })).toThrow(
      "can't write a program of version 'cesium-ir/1.0'; this writer writes 'cesium-ir/0.1'",
    );
  });
});

describe("malformed files are refused with the right message", () => {
  const fixtures: [string, string][] = [
    [
      "unknown-major",
      "cesium-ir: unknown version 'cesium-ir/2.0'; this reader reads 'cesium-ir/0.1' only (0.x is experimental: any 0.x release may change the format)",
    ],
    [
      "unlisted-extension",
      "cesium-ir: equation 1 (cesium/search): extension op isn't listed in 'extensions'",
    ],
    [
      "forward-reference",
      "cesium-ir: equation 1 (math/add): operand 1 refers to equation 2, which doesn't come before it (a forward reference)",
    ],
    [
      "type-mismatch",
      "cesium-ir: equation 2 (math/add): declared float2, but its operands give float",
    ],
  ];

  for (const [name, message] of fixtures) {
    it(`${name}: ${message}`, () => {
      const text = readFileSync(
        join(FIXTURES, `malformed/${name}.json`),
        "utf8",
      );
      expect(refusal(text).message).toBe(message);
    });
  }

  it("names the equation and the reason on the error", () => {
    const error = refusal(
      readFileSync(join(FIXTURES, "malformed/type-mismatch.json"), "utf8"),
    );
    expect(error.equation).toBe(2);
    expect(error.op).toBe("math/add");
    expect(error.reason).toBe("declared float2, but its operands give float");
  });

  const base = () =>
    structuredClone(load("malformed/type-mismatch.json")) as {
      equations: Record<string, unknown>[];
      outputs: Record<string, unknown>[];
      inputs: Record<string, unknown>[];
      [key: string]: unknown;
    };

  it("refuses an operand that is its own equation, and one out of range", () => {
    const own = base();
    own.equations[2] = { op: "math/add", args: [0, 2], type: "float" };
    expect(refusalOf(own).message).toBe(
      "cesium-ir: equation 2 (math/add): operand 1 refers to equation 2, which doesn't come before it (a forward reference)",
    );
    const far = base();
    far.equations[2] = { op: "math/add", args: [0, 9], type: "float" };
    expect(refusalOf(far).message).toContain("refers to equation 9");
    const negative = base();
    negative.equations[2] = { op: "math/add", args: [0, -1], type: "float" };
    expect(refusalOf(negative).message).toBe(
      "cesium-ir: equation 2 (math/add): operand 1 isn't an equation number",
    );
  });

  it("re-derives every type: operands, leaves, inputs and lanes", () => {
    const vectors = base();
    vectors.equations[2] = { op: "math/add", args: [0, 1], type: "float" };
    expect(readProgram(JSON.stringify(vectors)).eqns).toHaveLength(3);

    const wrongOperands = base();
    wrongOperands.equations[1] = {
      op: "const",
      type: "float2",
      value: [1, 2],
    };
    wrongOperands.equations[2] = {
      op: "math/add",
      args: [0, 1],
      type: "float",
    };
    expect(refusalOf(wrongOperands).message).toBe(
      "cesium-ir: equation 2 (math/add): math/add needs float operands of one type, got float,float2",
    );

    const constant = base();
    constant.equations[1] = { op: "const", type: "float2", value: 2 };
    expect(refusalOf(constant).message).toBe(
      "cesium-ir: equation 1 (const): declared float2, but its value is float",
    );

    const input = base();
    input.equations[0] = { op: "input", type: "float3", index: 0 };
    expect(refusalOf(input).message).toBe(
      "cesium-ir: equation 0 (input): declared float3, but input 'x' is float",
    );

    const extract = base();
    extract.equations[2] = {
      op: "math/extract3",
      args: [0],
      type: "float",
      index: 1,
    };
    expect(refusalOf(extract).message).toContain(
      "math/extract3 needs a float3 and a component below 3",
    );

    const arity = base();
    arity.equations[2] = { op: "math/add", args: [0], type: "float" };
    expect(refusalOf(arity).message).toBe(
      "cesium-ir: equation 2 (math/add): math/add takes 2 operands, got 1",
    );
  });

  it("refuses what the file's own bookkeeping gets wrong", () => {
    const cases: [string, (d: ReturnType<typeof base>) => void, string][] = [
      [
        "a vocabulary that isn't KHR_interactivity",
        (d) => (d.vocabulary = "other"),
        "cesium-ir: vocabulary 'other' isn't 'KHR_interactivity'",
      ],
      [
        "a format that isn't a version",
        (d) => (d.format = "cesium-ir/one"),
        "cesium-ir: format 'cesium-ir/one' isn't 'cesium-ir/<major>.<minor>'",
      ],
      [
        "an op that is nobody's",
        (d) => (d.equations[2] = { op: "math/foo", args: [0], type: "float" }),
        "cesium-ir: equation 2 (math/foo): unknown op: it isn't in KHR_interactivity and doesn't start with 'cesium/'",
      ],
      [
        "an input index past the inputs",
        (d) => (d.equations[0] = { op: "input", type: "float", index: 4 }),
        "cesium-ir: equation 0 (input): needs an 'index' of an input (the file has 1 inputs)",
      ],
      [
        "an input declared twice",
        (d) => d.inputs.push({ ...d.inputs[0]! }),
        "cesium-ir: input 'x' is declared twice",
      ],
      [
        "a literal with no slot",
        (d) => (d.equations[1] = { op: "literal", type: "float", value: 2 }),
        "cesium-ir: equation 1 (literal): a literal needs a 'slot', its place in the source",
      ],
      [
        "two literals in one slot",
        (d) => {
          d.equations[1] = {
            op: "literal",
            type: "float",
            value: 2,
            slot: "k",
          };
          d.equations[2] = {
            op: "literal",
            type: "float",
            value: 3,
            slot: "k",
          };
        },
        "cesium-ir: equation 2 (literal): literal slot 'k' is already on equation 1",
      ],
      [
        "a value that is no number",
        (d) => (d.equations[1] = { op: "const", type: "float", value: "two" }),
        "cesium-ir: equation 1 (const): needs a 'value': a boolean, a number, or 2 to 4 numbers (-0, NaN, Infinity and -Infinity are text)",
      ],
      [
        "an output past the equations",
        (d) => (d.outputs[0] = { name: "y", id: 3 }),
        "cesium-ir: output 'y' refers to equation 3, which doesn't exist (the file has 3)",
      ],
      [
        "a field the format doesn't have",
        (d) => (d.equations[2]!.hint = "fused"),
        "cesium-ir: equation 2 (math/add): unknown field 'hint' on math/add",
      ],
      [
        "a field on the file the format doesn't have",
        (d) => (d.title = "x"),
        "cesium-ir: unknown field 'title' on the file",
      ],
      [
        "operands on a leaf",
        (d) => (d.equations[1]!.args = []),
        "cesium-ir: equation 1 (const): unknown field 'args' on const",
      ],
    ];
    for (const [what, change, message] of cases) {
      const d = base();
      change(d);
      // The type-mismatch file's own error would come first otherwise.
      if (d.equations[2]!.type === "float2") {
        d.equations[2]!.type = "float";
      }
      expect(refusalOf(d).message, what).toBe(message);
    }
  });

  it("refuses text that isn't JSON, and JSON that isn't a file", () => {
    expect(refusal("{ nope").message).toMatch(/^cesium-ir: isn't valid JSON/);
    expect(refusal("[]").message).toBe("cesium-ir: a file is a JSON object");
    expect(refusal("{}").message).toBe(
      "cesium-ir: the file has no 'format' text",
    );
  });
});

describe("the schema validates every fixture", () => {
  const files = (dir: string) =>
    readdirSync(join(FIXTURES, dir))
      .filter((f) => f.endsWith(".json"))
      .map((f) => join(dir, f));

  it("accepts the valid fixtures", () => {
    for (const file of ["specials.json"]) {
      expect(validateSchema(schema, load(file)), file).toEqual([]);
    }
  });

  it("accepts every document the writer writes for the suite's programs", () => {
    for (const { name, program } of programs) {
      expect(validateSchema(schema, programToDocument(program)), name).toEqual(
        [],
      );
    }
  });

  it("rejects the files that break its shape, and passes the ones only the reader can refuse", () => {
    // The schema checks shape. An unknown major is shape; a forward reference,
    // a type mismatch and an unlisted extension are the reader's to refuse.
    expect(
      validateSchema(schema, load("malformed/unknown-major.json")),
    ).toEqual(['$/format: expected "cesium-ir/0.1"']);
    for (const name of [
      "unlisted-extension",
      "forward-reference",
      "type-mismatch",
    ]) {
      expect(
        validateSchema(schema, load(`malformed/${name}.json`)),
        name,
      ).toEqual([]);
    }
    // The newer-minor file is a 1.7 file: not a 1.0 one.
    expect(
      validateSchema(schema, load("newer-minor.json")).length,
    ).toBeGreaterThan(0);
    expect(files("malformed")).toHaveLength(4);
  });

  it("rejects shapes the format doesn't have", () => {
    const doc = programToDocument(programs[0]!.program) as unknown as {
      equations: Record<string, unknown>[];
      [key: string]: unknown;
    };
    const mutate = (change: (d: typeof doc) => void) => {
      const d = structuredClone(doc);
      change(d);
      return validateSchema(schema, d);
    };
    expect(mutate((d) => (d.extra = 1))).toHaveLength(1);
    expect(mutate((d) => delete d.outputs)).toEqual(["$: missing 'outputs'"]);
    expect(
      mutate((d) => (d.equations[d.equations.length - 1]!.op = "math/nope")),
    ).not.toEqual([]);
    expect(
      mutate((d) => {
        d.equations.push({ op: "math/add", args: [0], type: "float" });
      }),
    ).not.toEqual([]);
    expect(
      mutate((d) => {
        d.equations.push({ op: "const", type: "float", value: "two" });
      }),
    ).not.toEqual([]);
    expect(
      mutate((d) => {
        d.equations.push({ op: "math/extract3", args: [0], type: "float" });
      }),
    ).not.toEqual([]);
  });

  it("names the same ops, with the same arities, as the vocabulary", () => {
    const defs = schema.$defs as Record<string, Record<string, unknown>>;
    const listed = (key: string) =>
      (
        defs[key]!.properties as Record<string, { enum: string[] }>
      ).op!.enum.slice();
    const arities = Object.keys(defs)
      .map((k) => /^op(\d)Equation$/.exec(k))
      .filter((m) => m !== null)
      .map((m) => Number(m![1]));
    const fromSchema: [string, number][] = [];
    for (const arity of arities) {
      for (const op of listed(`op${arity}Equation`)) {
        fromSchema.push([op, arity]);
      }
    }
    for (const op of listed("extractEquation")) {
      fromSchema.push([op, 1]);
    }
    const fromTable = Object.entries(OPS)
      .filter(([name]) => !["input", "const", "literal"].includes(name))
      .map(([name, def]): [string, number] => [name, def.arity]);
    expect(fromSchema.sort()).toEqual(fromTable.sort());
  });

  it("is the schema of the version the writer writes", () => {
    expect(schema.$id).toBe(`${IR_VERSION.replace("/", "-")}.schema.json`);
    const format = (schema.properties as Record<string, { const: string }>)
      .format!;
    expect(format.const).toBe(IR_VERSION);
  });
});

describe("versioning from 1.0: a minor stays readable, a major is refused", () => {
  it("reads a file of a newer minor by what it knows, ignoring added optional fields", () => {
    const p = readProgram(
      readFileSync(join(FIXTURES, "newer-minor.json"), "utf8"),
      AS_1_0,
    );
    expect(p.version).toBe(IR_VERSION);
    expect(evaluate(p, { x: 4 })).toEqual({ y: 8 });
    // Read, it is the program a 1.0 file of the same equations gives.
    const same = structuredClone(load("newer-minor.json")) as Record<
      string,
      unknown
    >;
    same.format = "cesium-ir/1.0";
    delete same.title;
    delete (same.equations as Record<string, unknown>[])[2]!.hint;
    expect(shapeKey(readProgram(JSON.stringify(same), AS_1_0))).toBe(
      shapeKey(p),
    );
  });

  it("refuses, in a newer minor, an op it doesn't know, naming it", () => {
    const doc = structuredClone(load("newer-minor.json")) as {
      equations: Record<string, unknown>[];
    };
    doc.equations[2] = { op: "math/newOpOf17", args: [0, 1], type: "float" };
    expect(refusalOf(doc, AS_1_0).message).toBe(
      "cesium-ir: equation 2 (math/newOpOf17): unknown op: it isn't in KHR_interactivity and doesn't start with 'cesium/'",
    );
    doc.equations[2] = { op: "cesium/newOpOf17", args: [0, 1], type: "float" };
    expect(refusalOf(doc, AS_1_0).message).toBe(
      "cesium-ir: equation 2 (cesium/newOpOf17): extension op isn't listed in 'extensions'",
    );
    const listed = { ...doc, extensions: ["cesium/newOpOf17"] };
    expect(refusalOf(listed, AS_1_0).message).toBe(
      "cesium-ir: extension 'cesium/newOpOf17' isn't known to this reader (it reads cesium-ir/1.0)",
    );
  });

  it("still refuses what is wrong in a newer minor: types, order, the vocabulary", () => {
    const doc = structuredClone(load("newer-minor.json")) as {
      equations: Record<string, unknown>[];
      vocabulary: string;
    };
    doc.equations[2]!.type = "float3";
    expect(refusalOf(doc, AS_1_0).message).toBe(
      "cesium-ir: equation 2 (math/mul): declared float3, but its operands give float",
    );
    const other = structuredClone(load("newer-minor.json")) as {
      vocabulary: string;
    };
    other.vocabulary = "Other";
    expect(refusalOf(other, AS_1_0).message).toBe(
      "cesium-ir: vocabulary 'Other' isn't 'KHR_interactivity'",
    );
  });

  it("refuses any other major, older or newer", () => {
    for (const format of ["cesium-ir/0.1", "cesium-ir/2.0", "cesium-ir/10.3"]) {
      const doc = structuredClone(load("newer-minor.json")) as {
        format: string;
      };
      doc.format = format;
      const major = format.split("/")[1]!.split(".")[0];
      expect(refusalOf(doc, AS_1_0).message).toBe(
        `cesium-ir: unknown major version ${major} (format '${format}'); this reader reads major version 1`,
      );
    }
  });
});

describe("experimental: a 0.x reader reads its own version only", () => {
  const own = () =>
    structuredClone(load("specials.json")) as { format: string };

  it("is at cesium-ir/0.1, and the writer writes it", () => {
    expect(IR_VERSION).toBe("cesium-ir/0.1");
    for (const { name, program } of programs.slice(0, 20)) {
      expect(programToDocument(program).format, name).toBe("cesium-ir/0.1");
    }
  });

  it("reads a file of its own version", () => {
    expect(() => readProgram(JSON.stringify(own()))).not.toThrow();
  });

  it("refuses every other version, older or newer, naming both", () => {
    for (const format of [
      "cesium-ir/0.0",
      "cesium-ir/0.2",
      "cesium-ir/0.10",
      "cesium-ir/1.0",
      "cesium-ir/1.7",
      "cesium-ir/2.0",
    ]) {
      const doc = own();
      doc.format = format;
      expect(refusalOf(doc).message).toBe(
        `cesium-ir: unknown version '${format}'; this reader reads 'cesium-ir/0.1' only (0.x is experimental: any 0.x release may change the format)`,
      );
    }
  });

  it("refuses a newer 0.x file even when it adds nothing the reader lacks", () => {
    const doc = own();
    doc.format = "cesium-ir/0.2";
    expect(refusalOf(doc).reason).toMatch(/^unknown version 'cesium-ir\/0\.2'/);
  });
});

describe("extensions: listed, known and typed", () => {
  // `cesium/clampTo` is a test op: two floats to a float.
  const table: ExtensionTable = {
    "cesium/clampTo": {
      since: "1.0",
      typeOf: (args) => {
        if (args.length !== 2 || args.some((t) => t !== "float")) {
          throw new Error("cesium/clampTo takes two floats");
        }
        return "float";
      },
    },
  };
  const program = (): Program => ({
    version: IR_VERSION,
    inputs: [{ name: "x", type: "float", rate: "vertex" }],
    eqns: [
      { op: "input", args: [], type: "float", index: 0 },
      { op: "const", args: [], type: "float", value: 2 },
      { op: "cesium/clampTo", args: [0, 1], type: "float" },
    ],
    outputs: [{ name: "y", id: 2 }],
  });

  it("this build has none, and its registry file says so", () => {
    expect(Object.keys(EXTENSIONS)).toEqual([]);
    const registry = JSON.parse(
      readFileSync(join(SRC, "extensions.json"), "utf8"),
    ) as { extensions: { name: string; since: string }[] };
    expect(registry.extensions.map((e) => e.name).sort()).toEqual(
      Object.keys(EXTENSIONS).sort(),
    );
  });

  it("writes the list of the extensions a program uses, and reads it back", () => {
    const doc = programToDocument(program(), { extensions: table });
    expect(doc.extensions).toEqual(["cesium/clampTo"]);
    const back = readProgram(JSON.stringify(doc), { extensions: table });
    expect(shapeKey(back)).toBe(shapeKey(program()));
    expect(bits(back)).toBe(bits(program()));
  });

  it("refuses to write an op it doesn't know", () => {
    expect(() => programToDocument(program())).toThrow(
      "cesium-ir: equation 2 (cesium/clampTo): op 'cesium/clampTo' is neither in KHR_interactivity nor a known extension",
    );
  });

  it("refuses a file whose extension this reader doesn't know", () => {
    const text = JSON.stringify(
      programToDocument(program(), { extensions: table }),
    );
    expect(refusal(text).message).toBe(
      "cesium-ir: extension 'cesium/clampTo' isn't known to this reader (it reads cesium-ir/0.1)",
    );
  });

  it("refuses a known extension that isn't listed", () => {
    const doc = programToDocument(program(), { extensions: table });
    const unlisted = { ...doc, extensions: [] };
    expect(refusalOf(unlisted)).toBeInstanceOf(IrFormatError);
    expect(() => programFromDocument(unlisted, { extensions: table })).toThrow(
      "cesium-ir: equation 2 (cesium/clampTo): extension op isn't listed in 'extensions'",
    );
  });

  it("re-derives an extension op's type through its entry", () => {
    const doc = programToDocument(program(), { extensions: table });
    const wrongType = structuredClone(doc) as unknown as {
      equations: Record<string, unknown>[];
    };
    wrongType.equations[2]!.type = "float2";
    expect(() => programFromDocument(wrongType, { extensions: table })).toThrow(
      "cesium-ir: equation 2 (cesium/clampTo): declared float2, but its operands give float",
    );
    const wrongOperands = structuredClone(doc) as unknown as {
      equations: Record<string, unknown>[];
    };
    wrongOperands.equations[2]!.args = [0];
    expect(() =>
      programFromDocument(wrongOperands, { extensions: table }),
    ).toThrow(
      "cesium-ir: equation 2 (cesium/clampTo): cesium/clampTo takes two floats",
    );
  });

  it("a name not starting cesium/ isn't an extension", () => {
    const doc = programToDocument(program(), { extensions: table });
    expect(refusalOf({ ...doc, extensions: ["other/op"] }).message).toBe(
      "cesium-ir: extension \"other/op\" isn't a name starting 'cesium/'",
    );
  });
});
