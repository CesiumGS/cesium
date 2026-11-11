// The kernel worker's protocol, client and host (plan §13.33), in-process: a
// `KernelHost` behind a loopback with a real worker's structured clone and
// transfer, over fake kernels (the real ones are in test/data). The form's
// buffers move, requests report stages, a new request supersedes the old one
// and frees what it held, a failing kernel is an error the page can read, and
// a view into a kernel's heap is copied, never detached.
import { describe, expect, it } from "vitest";
import { boxBrep } from "../examples/brep-first-look/fixtures.ts";
import { KernelCancelled, KernelClient } from "../src/brep/kernelClient.ts";
import { transferable, type KernelForm } from "../src/brep/kernelProtocol.ts";
import type { OcctKernel, OcctSolid } from "../src/brep/occt.ts";
import type { SmlibKernel, SmlibSolid } from "../src/brep/smlib.ts";
import { formBounds } from "../src/brep/formBounds.ts";
import { packGpuPatches, prepareGpuPatches } from "../src/brep/gpuPatches.ts";
import { loopback, type Loopback } from "./kernelLoopback.ts";

/** Counts the solids a fake kernel makes and the ones deleted. */
class Ledger {
  made = 0;
  deleted = 0;
  solid() {
    this.made++;
    let done = false;
    return {
      delete: () => {
        if (!done) {
          done = true;
          this.deleted++;
        }
      },
    };
  }
  get live() {
    return this.made - this.deleted;
  }
}

/** An Open CASCADE with just what the host calls; each solid is the box. */
function fakeOcct(ledger: Ledger, hooks: { onImport?: () => void } = {}) {
  const make = () => ledger.solid() as unknown as OcctSolid;
  return {
    box: make,
    cylinder: make,
    sphere: make,
    torus: make,
    tag: (solid: OcctSolid) => solid,
    boolean: make,
    importStep: () => {
      hooks.onImport?.();
      return [make(), make()];
    },
    toForm: () => ({
      form: boxBrep(),
      faceTags: Int32Array.of(1, 1, 2, 2, -1, 1),
    }),
  } as unknown as OcctKernel;
}

function fakeSmlib(ledger: Ledger) {
  const make = () => ledger.solid() as unknown as SmlibSolid;
  return {
    box: make,
    cylinder: make,
    sphere: make,
    torus: make,
    tag: () => undefined,
    // Consumes b and changes a in place, as SMLib does.
    boolean: (_: string, a: SmlibSolid, b: SmlibSolid) => {
      b.delete();
      return a;
    },
    toForm: () => ({
      form: boxBrep(),
      faceTags: Int32Array.of(1, 2, 1, 2, 1, 2),
    }),
  } as unknown as SmlibKernel;
}

const job = {
  operation: "difference" as const,
  a: {
    kind: "box" as const,
    origin: [0, 0, 0] as const,
    size: [1, 1, 1] as const,
  },
  b: {
    kind: "cylinder" as const,
    base: [0.5, 0.5, -1] as const,
    radius: 0.2,
    height: 3,
  },
};

/** A client over a loopback, which the test can reach. */
function setup(ledger: Ledger, hooks?: Parameters<typeof fakeOcct>[1]) {
  let port: Loopback | undefined;
  let occtLoads = 0;
  const client = new KernelClient({
    createWorker: () =>
      (port = loopback({
        loadOcct: async () => {
          occtLoads++;
          return fakeOcct(ledger, hooks);
        },
        loadSmlib: async () => fakeSmlib(ledger),
      })),
  });
  return { client, port: () => port!, occtLoads: () => occtLoads };
}

describe("KernelClient over a loopback worker", () => {
  it("makes a boolean in either kernel and returns the form, its bounds and the tags", async () => {
    const ledger = new Ledger();
    const { client } = setup(ledger);
    for (const kernel of ["occt", "smlib"] as const) {
      const made = await client.boolean(kernel, job, { validate: true });
      expect(made.result.form.faceSurface.length).toBe(6);
      expect(made.result.bounds).toEqual(formBounds(boxBrep()));
      expect(made.result.problems).toEqual([]);
      expect(made.result.faceTags).toBeInstanceOf(Int32Array);
      expect(made.booleanMs).toBeGreaterThanOrEqual(0);
    }
    // No problems asked for: none sent.
    const plain = await client.boolean("occt", job);
    expect(plain.result.problems).toBeUndefined();
    expect(ledger.live).toBe(0);
    client.dispose();
  });

  it("reports each stage, naming the load only the first time", async () => {
    const { client, occtLoads } = setup(new Ledger());
    const first: string[] = [];
    await client.boolean("occt", job, { onStage: (s) => first.push(s) });
    expect(first).toEqual([
      "Loading Open CASCADE…",
      "Open CASCADE: difference…",
    ]);
    const second: string[] = [];
    await client.boolean("occt", job, { onStage: (s) => second.push(s) });
    expect(second).toEqual(["Open CASCADE: difference…"]);
    expect(occtLoads()).toBe(1);
    client.dispose();
  });

  it("prepares the GPU's patches in the worker: the same words as preparing them here", async () => {
    const { client } = setup(new Ledger());
    const made = await client.boolean("smlib", job, { prepare: true });
    const direct = prepareGpuPatches(made.result.form);
    const patches = made.result.patches!;
    expect(patches.faces.length).toBe(6);
    expect(patches.spans.length).toBe(direct.spans.length);
    // Nets shared between spans stay shared through the clone, so they pack once.
    const packed = packGpuPatches(patches);
    const expected = packGpuPatches(direct);
    expect(packed.words.length).toBe(expected.words.length);
    expect(Array.from(packed.words)).toEqual(Array.from(expected.words));
    // Not asked for: not made.
    expect((await client.boolean("smlib", job)).result.patches).toBeUndefined();
    client.dispose();
  });

  it("imports a STEP file as forms, freeing the kernel's solids, and moves the bytes", async () => {
    const ledger = new Ledger();
    const { client } = setup(ledger);
    const stages: string[] = [];
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const imported = await client.importStep(bytes, {
      onStage: (s) => stages.push(s),
      validate: true,
    });
    expect(imported.forms.length).toBe(2);
    expect(imported.forms.every((f) => f.problems?.length === 0)).toBe(true);
    expect(stages).toEqual([
      "Loading Open CASCADE…",
      "Importing STEP…",
      "Converting 2 solids to B-reps…",
      "Measuring the part…",
      "Checking the form…",
    ]);
    // The buffer moved: the caller's view is detached.
    expect(bytes.byteLength).toBe(0);
    expect(ledger.live).toBe(0);
    client.dispose();
  });

  it("copies a view of part of a larger buffer, whole", async () => {
    const { client } = setup(new Ledger());
    const heap = new ArrayBuffer(64);
    const view = new Uint8Array(heap, 8, 4);
    view.set([1, 2, 3, 4]);
    await client.importStep(view);
    expect(heap.byteLength).toBe(64);
    client.dispose();
  });

  it("supersedes a pending request: the old one rejects, the new one runs, nothing leaks", async () => {
    const ledger = new Ledger();
    const hook: { supersede?: () => void } = {};
    const { client } = setup(ledger, { onImport: () => hook.supersede?.() });
    await client.load("occt");
    let second: ReturnType<typeof client.boolean> | undefined;
    // The import is running (its solids made) when a boolean is requested.
    hook.supersede = () => {
      second = client.boolean("occt", job);
    };
    const first = client.importStep(new Uint8Array([1]));
    await expect(first).rejects.toBeInstanceOf(KernelCancelled);
    await expect(second).resolves.toMatchObject({
      result: { form: { faceSurface: { length: 6 } } },
    });
    expect(ledger.made).toBeGreaterThan(2);
    expect(ledger.live).toBe(0);
    client.dispose();
  });

  it("skips a request cancelled while it waits", async () => {
    const ledger = new Ledger();
    const { client } = setup(ledger);
    await client.load("occt");
    const doomed = client.boolean("occt", job);
    const replacement = client.boolean("occt", job);
    await expect(doomed).rejects.toBeInstanceOf(KernelCancelled);
    await replacement;
    // Only the replacement made solids: a, b and the result.
    expect(ledger.made).toBe(3);
    expect(ledger.live).toBe(0);
    client.dispose();
  });

  it("surfaces a kernel that fails to load, and loads again on the next call", async () => {
    let attempts = 0;
    const ledger = new Ledger();
    const client = new KernelClient({
      createWorker: () =>
        loopback({
          loadOcct: async () => {
            if (++attempts === 1) {
              throw new Error("404 /occt/replicad_single.js");
            }
            return fakeOcct(ledger);
          },
        }),
    });
    await expect(client.boolean("occt", job)).rejects.toThrow(
      "404 /occt/replicad_single.js",
    );
    await expect(client.boolean("occt", job)).resolves.toBeDefined();
    expect(attempts).toBe(2);
    client.dispose();
  });

  it("surfaces a kernel's own error and frees the solids it made", async () => {
    const ledger = new Ledger();
    const client = new KernelClient({
      createWorker: () =>
        loopback({
          loadOcct: async () =>
            ({
              ...fakeOcct(ledger),
              boolean: () => {
                throw new Error("OCCT: difference failed");
              },
            }) as unknown as OcctKernel,
        }),
    });
    await expect(client.boolean("occt", job)).rejects.toThrow(
      "OCCT: difference failed",
    );
    expect(ledger.live).toBe(0);
    client.dispose();
  });

  it("rejects every pending call when the worker fails", async () => {
    const { client, port } = setup(new Ledger());
    const pending = client.load("occt");
    port().fail("script error");
    await expect(pending).rejects.toThrow(
      "the kernel worker failed: script error",
    );
  });

  it("rejects pending calls on dispose, and any after it", async () => {
    const { client, port } = setup(new Ledger());
    const pending = client.boolean("occt", job);
    client.dispose();
    await expect(pending).rejects.toBeInstanceOf(KernelCancelled);
    expect(port().terminated).toBe(true);
    await expect(client.boolean("occt", job)).rejects.toBeInstanceOf(
      KernelCancelled,
    );
  });
});

describe("transferable", () => {
  const part = (form = boxBrep()): KernelForm => ({
    form,
    bounds: formBounds(form),
  });

  it("lists each buffer of a form once, and copies none that it owns", () => {
    const form = boxBrep();
    const { forms, buffers } = transferable([part(form)]);
    expect(forms[0]!.form.vertexPosition).toBe(form.vertexPosition);
    expect(new Set(buffers).size).toBe(buffers.length);
    expect(buffers).toContain(form.vertexPosition.buffer);
    expect(buffers).toContain(form.curves3.points.buffer);
  });

  it("copies a view into a larger buffer, such as a kernel's heap", () => {
    const heap = new ArrayBuffer(1024);
    const view = new Float64Array(heap, 64, 24);
    view.fill(2);
    const form = { ...boxBrep(), vertexPosition: view };
    const { forms, buffers } = transferable([part(form)]);
    const copy = forms[0]!.form.vertexPosition;
    expect(copy).not.toBe(view);
    expect(Array.from(copy)).toEqual(Array.from(view));
    expect(buffers).not.toContain(heap);
    expect(buffers).toContain(copy.buffer);
  });
});
