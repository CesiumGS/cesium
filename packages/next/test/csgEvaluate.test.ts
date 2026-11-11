// The kernel worker's `evaluate` request (plan §13.33, the CSG sample), in
// process over fake kernels that record their calls (the real ones are in
// test/data/csgKernels.test.ts): a recipe is folded left to right in each
// kernel's own way, leaves are made, placed and tagged in that order, every
// solid made is freed whether the request finishes, fails or is superseded,
// and the result carries the leaves' tags.
import { describe, expect, it } from "vitest";
import { boxBrep } from "../examples/brep-first-look/fixtures.ts";
import { KernelSession, STEP_NEEDS_OCCT } from "../examples/csg/evaluator.ts";
import { KernelCancelled, KernelClient } from "../src/brep/kernelClient.ts";
import type { Placement, SolidRecipe } from "../src/brep/kernelProtocol.ts";
import type { OcctKernel, OcctSolid } from "../src/brep/occt.ts";
import type { SmlibKernel, SmlibSolid } from "../src/brep/smlib.ts";
import { loopback } from "./kernelLoopback.ts";

/** A fake solid: named, recorded in the log when made and freed, idempotent to delete. */
class Log {
  readonly calls: string[] = [];
  private made = 0;
  readonly live = new Set<string>();
  solid(what: string) {
    const name = `${what}#${++this.made}`;
    this.live.add(name);
    this.calls.push(`make ${name}`);
    return {
      name,
      delete: () => {
        this.live.delete(name);
      },
    };
  }
}

type Fake = { name: string; delete(): void };

function fakeSmlib(log: Log, hooks: { failBoolean?: boolean } = {}) {
  const make = (what: string) => () => log.solid(what) as unknown as SmlibSolid;
  return {
    box: make("box"),
    cylinder: make("cylinder"),
    sphere: make("sphere"),
    cone: make("cone"),
    torus: make("torus"),
    place: (solid: Fake, placement: Placement) => {
      log.calls.push(`place ${solid.name} ${JSON.stringify(placement)}`);
      return solid;
    },
    tag: (solid: Fake, tag: number) => {
      log.calls.push(`tag ${solid.name} ${tag}`);
    },
    // Consumes b and changes a in place, as SMLib does.
    boolean: (operation: string, a: Fake, b: Fake) => {
      log.calls.push(`${operation} ${a.name} ${b.name}`);
      if (hooks.failBoolean) {
        a.delete();
        b.delete();
        throw new Error("SMLib: the boolean failed");
      }
      b.delete();
      return a;
    },
    toForm: (solid: Fake) => {
      log.calls.push(`convert ${solid.name}`);
      return { form: boxBrep(), faceTags: Int32Array.of(1, 2, 3, 3, 4, 2) };
    },
  } as unknown as SmlibKernel;
}

function fakeOcct(log: Log) {
  const make = (what: string) => () => log.solid(what) as unknown as OcctSolid;
  return {
    box: make("box"),
    cylinder: make("cylinder"),
    sphere: make("sphere"),
    cone: make("cone"),
    torus: make("torus"),
    // A new solid; the one given is deleted.
    place: (solid: Fake, placement: Placement) => {
      log.calls.push(`place ${solid.name} ${JSON.stringify(placement)}`);
      solid.delete();
      return log.solid("placed") as unknown as OcctSolid;
    },
    tag: (solid: Fake, tag: number) => {
      log.calls.push(`tag ${solid.name} ${tag}`);
      return solid;
    },
    // A new solid; the operands stay for the caller.
    boolean: (operation: string, a: Fake, b: Fake) => {
      log.calls.push(`${operation} ${a.name} ${b.name}`);
      return log.solid(operation) as unknown as OcctSolid;
    },
    toForm: (solid: Fake) => {
      log.calls.push(`convert ${solid.name}`);
      return { form: boxBrep(), faceTags: Int32Array.of(1, 2, 3, 3, 4, 2) };
    },
    // Two solids, so the part is a fuse.
    importStep: () => [
      log.solid("step") as unknown as OcctSolid,
      log.solid("step") as unknown as OcctSolid,
    ],
    clone: (solid: Fake) => {
      log.calls.push(`clone ${solid.name}`);
      return log.solid("clone") as unknown as OcctSolid;
    },
  } as unknown as OcctKernel;
}

function setup(log: Log, hooks?: { failBoolean?: boolean }) {
  return new KernelClient({
    createWorker: () =>
      loopback({
        loadSmlib: async () => fakeSmlib(log, hooks),
        loadOcct: async () => fakeOcct(log),
      }),
  });
}

const box = (tag: number, placement?: Placement): SolidRecipe => ({
  type: "primitive",
  tag,
  primitive: { kind: "box", origin: [0, 0, 0], size: [1, 1, 1] },
  ...(placement ? { placement } : {}),
});

const recipe: SolidRecipe = {
  type: "boolean",
  operation: "difference",
  operands: [
    {
      type: "boolean",
      operation: "union",
      operands: [box(1), box(2, { translate: [1, 0, 0] })],
    },
    box(3),
    box(4, { rotate: [0, 90, 0] }),
  ],
};

describe("the kernel worker's evaluate request", () => {
  it("folds a recipe left to right in SMLib, in place, and frees everything", async () => {
    const log = new Log();
    const client = setup(log);
    const stages: string[] = [];
    const made = await client.evaluate("smlib", recipe, {
      onStage: (s) => stages.push(s),
    });
    expect(log.calls).toEqual([
      "make box#1",
      "tag box#1 1",
      "make box#2",
      'place box#2 {"translate":[1,0,0]}',
      "tag box#2 2",
      "union box#1 box#2",
      "make box#3",
      "tag box#3 3",
      "make box#4",
      'place box#4 {"rotate":[0,90,0]}',
      "tag box#4 4",
      "difference box#1 box#3",
      "difference box#1 box#4",
      "convert box#1",
    ]);
    expect(made.booleans).toBe(3);
    expect(made.kernelMs).toBeGreaterThanOrEqual(0);
    expect(Array.from(made.result.faceTags!)).toEqual([1, 2, 3, 3, 4, 2]);
    expect(stages.filter((s) => /\(\d of 3\)/.test(s))).toEqual([
      "SMLib: union (1 of 3)…",
      "SMLib: difference (2 of 3)…",
      "SMLib: difference (3 of 3)…",
    ]);
    expect(log.live.size).toBe(0);
    client.dispose();
  });

  it("frees Open CASCADE's operands as it goes, and its result", async () => {
    const log = new Log();
    const client = setup(log);
    await client.evaluate("occt", recipe);
    // Each boolean reads its operands, which are then freed, and the next one reads the result.
    expect(log.calls.filter((c) => /^(union|difference)/.test(c))).toEqual([
      "union box#1 placed#3",
      "difference union#4 box#5",
      "difference difference#8 placed#7",
    ]);
    expect(log.calls.at(-1)).toMatch(/^convert difference#/);
    expect(log.live.size).toBe(0);
    client.dispose();
  });

  it("makes a lone leaf and a one-operand node as themselves", async () => {
    const log = new Log();
    const client = setup(log);
    const made = await client.evaluate("smlib", {
      type: "boolean",
      operation: "intersection",
      operands: [box(5)],
    });
    expect(made.booleans).toBe(0);
    expect(log.calls).toEqual(["make box#1", "tag box#1 5", "convert box#1"]);
    expect(log.live.size).toBe(0);
    client.dispose();
  });

  it("rejects a node with no operands and a repeated tag before making anything", async () => {
    const log = new Log();
    const client = setup(log);
    await expect(
      client.evaluate("smlib", {
        type: "boolean",
        operation: "union",
        operands: [],
      }),
    ).rejects.toThrow(/no operands/);
    await expect(
      client.evaluate("smlib", {
        type: "boolean",
        operation: "union",
        operands: [box(1), box(1)],
      }),
    ).rejects.toThrow(/isn't unique/);
    await expect(client.evaluate("smlib", box(0))).rejects.toThrow(
      /isn't unique/,
    );
    expect(log.calls).toEqual([]);
    client.dispose();
  });

  it("frees what it holds when a boolean fails", async () => {
    const log = new Log();
    const client = setup(log, { failBoolean: true });
    await expect(client.evaluate("smlib", recipe)).rejects.toThrow(
      /the boolean failed/,
    );
    expect(log.live.size).toBe(0);
    client.dispose();
  });

  it("is superseded by the next evaluation, and frees what it made", async () => {
    const log = new Log();
    const client = setup(log);
    const first = client.evaluate("occt", recipe);
    const second = client.evaluate("occt", box(9));
    await expect(first).rejects.toBeInstanceOf(KernelCancelled);
    const made = await second;
    expect(made.booleans).toBe(0);
    expect(log.live.size).toBe(0);
    client.dispose();
  });

  it("stops at the next boolean when cancelled part way, freeing the solids it holds", async () => {
    const log = new Log();
    const client = setup(log);
    let cancelled = false;
    const first = client.evaluate("smlib", recipe, {
      onStage: (stage) => {
        if (!cancelled && stage.includes("(1 of 3)")) {
          cancelled = true;
          // A newer request cancels this one at its next stage (the worker is already past this one).
          void client.evaluate("smlib", box(8)).catch(() => undefined);
        }
      },
    });
    await expect(first).rejects.toBeInstanceOf(KernelCancelled);
    await new Promise((resolve) => setTimeout(resolve, 30));
    // The union's stage was past; the next stage stopped it before the last boolean and the conversion.
    expect(
      log.calls.filter((c) => c.startsWith("difference")).length,
    ).toBeLessThan(2);
    expect(log.calls.filter((c) => c.startsWith("convert box#1")).length).toBe(
      0,
    );
    expect(log.live.size).toBe(0);
    client.dispose();
  });
});

describe("STEP parts in the kernel worker", () => {
  const bytes = () => new TextEncoder().encode("ISO-10303-21;");
  const withStep: SolidRecipe = {
    type: "boolean",
    operation: "union",
    operands: [
      box(1),
      { type: "step", tag: 2, step: 5, placement: { translate: [0, 0, 1] } },
    ],
  };

  it("keeps an imported file as one centred part, and builds a recipe's step leaf from a copy of it", async () => {
    const log = new Log();
    const client = setup(log);
    const made = await client.registerStep(5, bytes());
    // Two solids are fused, then the part is centred (one placed solid is left).
    expect(log.calls.slice(0, 2)).toEqual(["make step#1", "make step#2"]);
    expect(log.calls).toContain("union step#1 step#2");
    expect(made.part.solids).toBe(2);
    expect(made.part.size.every((s) => s > 0)).toBe(true);
    const kept = [...log.live];
    expect(kept).toHaveLength(1);

    log.calls.length = 0;
    const result = await client.evaluate("occt", withStep);
    expect(result.booleans).toBe(1);
    // The part itself is only cloned; the clone is placed, then tagged.
    expect(log.calls).toContain(`clone ${kept[0]}`);
    expect(log.calls.some((c) => c.startsWith(`place ${kept[0]}`))).toBe(false);
    expect(log.calls.some((c) => /^tag placed#\d+ 2$/.test(c))).toBe(true);
    expect([...log.live]).toEqual(kept);

    await client.releaseStep(5);
    expect(log.live.size).toBe(0);
    client.dispose();
  });

  it("frees the part when the worker ends, and replaces one under the same key", async () => {
    const log = new Log();
    const client = setup(log);
    await client.registerStep(5, bytes());
    await client.registerStep(5, bytes());
    expect(log.live.size).toBe(1);
    client.dispose();
    expect(log.live.size).toBe(0);
  });

  it("says which part is missing, and frees what the recipe made", async () => {
    const log = new Log();
    const client = setup(log);
    await expect(client.evaluate("occt", withStep)).rejects.toThrow(
      /STEP part 5 isn't loaded/,
    );
    expect(log.live.size).toBe(0);
    client.dispose();
  });

  it("refuses a step leaf in SMLib, before making anything", async () => {
    const log = new Log();
    const client = setup(log);
    await expect(client.evaluate("smlib", withStep)).rejects.toThrow(
      /can't read STEP files/,
    );
    expect(log.calls).toEqual([]);
    client.dispose();
  });

  it("is not superseded by evaluations, and the session refuses SMLib for a step leaf", async () => {
    const log = new Log();
    const client = setup(log);
    const registered = client.registerStep(5, bytes());
    const evaluated = client.evaluate("occt", box(1));
    await Promise.all([registered, evaluated]);
    expect(log.live.size).toBe(1);
    const session = new KernelSession({
      createWorker: () =>
        loopback({
          loadSmlib: async () => fakeSmlib(log),
          loadOcct: async () => fakeOcct(log),
        }),
    });
    await expect(
      session.evaluate("smlib", withStep, { final: false }),
    ).rejects.toThrow(STEP_NEEDS_OCCT);
    session.dispose();
    client.dispose();
  });
});
