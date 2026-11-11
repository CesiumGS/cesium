// The kernel worker's host with the real kernels (plan §13.33), behind a
// loopback with a worker's structured clone and transfer: SMLib's and Open
// CASCADE's booleans and a NIST STEP file come back as the forms the kernels
// make directly, measured; every Open CASCADE handle the host made is freed,
// also when a request is superseded half way.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { RECIPES } from "../../examples/brep-first-look/kernels.ts";
import { formBounds } from "../../src/brep/formBounds.ts";
import { prepareGpuPatches } from "../../src/brep/gpuPatches.ts";
import { KernelCancelled, KernelClient } from "../../src/brep/kernelClient.ts";
import { OcctKernel, type OcctModule } from "../../src/brep/occt.ts";
import { SmlibKernel, type SmlibModule } from "../../src/brep/smlib.ts";
import { validateBrep } from "../../src/brep/validate.ts";
import { occtDirectory } from "../../scripts/occtTools.mjs";
import { smlibDirectory } from "../../scripts/smlibTools.mjs";
import { stepSamplesDirectory } from "../../scripts/stepSamples.mjs";
import { loopback } from "../kernelLoopback.ts";
import { trackHandles } from "./occtHandles.ts";

let oc: OcctModule;
let smlibModule: SmlibModule;

beforeAll(async () => {
  const occt = occtDirectory();
  const smlib = smlibDirectory();
  if (!occt || !smlib) {
    throw new Error(
      "No OCCT or SMLib build: run npm run setup --workspace @cesium/next",
    );
  }
  const imported = (await import(
    pathToFileURL(join(occt, "replicad_single.js")).href
  )) as { default: () => Promise<OcctModule> };
  oc = await imported.default();
  smlibModule = await (
    (await import(pathToFileURL(join(smlib, "smlib.mjs")).href)) as {
      default: () => Promise<SmlibModule>;
    }
  ).default();
}, 60_000);

const tracker = () => trackHandles(oc);

function setup() {
  const handles = tracker();
  const client = new KernelClient({
    createWorker: () =>
      loopback({
        loadOcct: async () => new OcctKernel(handles.module),
        loadSmlib: async () => new SmlibKernel(smlibModule),
      }),
  });
  return { client, handles };
}

describe("the kernel worker with the real kernels", () => {
  for (const kernel of ["smlib", "occt"] as const) {
    it.each(RECIPES.map((recipe) => recipe))(
      `${kernel}: $name comes back valid, measured and tagged`,
      async (recipe) => {
        const { client, handles } = setup();
        const made = await client.boolean(
          kernel,
          {
            operation: recipe.operation,
            a: recipe.inputs[0],
            b: recipe.inputs[1],
          },
          { validate: true },
        );
        const { form, bounds, problems, faceTags } = made.result;
        expect(problems).toEqual([]);
        expect(validateBrep(form)).toEqual([]);
        expect(bounds).toEqual(formBounds(form));
        expect(faceTags!.length).toBe(form.faceSurface.length);
        expect(new Set(faceTags)).toEqual(new Set([1, 2]));
        expect(made.booleanMs).toBeGreaterThan(0);
        client.dispose();
        expect(handles.describe()).toEqual([]);
      },
      60_000,
    );
  }

  it("imports CTC-05 as one measured form, and leaves no OCCT handle alive", async () => {
    const { client, handles } = setup();
    const file = join(stepSamplesDirectory()!, "nist_ctc_05_asme1_rd.stp");
    const stages: string[] = [];
    const imported = await client.importStep(
      new Uint8Array(readFileSync(file)),
      { validate: true, prepare: true, onStage: (s) => stages.push(s) },
    );
    expect(imported.forms.length).toBe(1);
    const { form, bounds, problems, patches } = imported.forms[0]!;
    expect(form.faceSurface.length).toBe(208);
    expect(patches!.faces.length).toBe(208);
    expect(patches!.spans.length).toBe(prepareGpuPatches(form).spans.length);
    expect(bounds).toEqual(formBounds(form));
    expect(problems).toEqual(validateBrep(form));
    // The NIST part is 0.527 m by 0.559 m by 0.483 m.
    expect(bounds.max[2]! - bounds.min[2]!).toBeCloseTo(0.4826, 3);
    expect(stages).toContain("Importing STEP…");
    client.dispose();
    expect(handles.describe()).toEqual([]);
  }, 120_000);

  it("frees the solids of an import that a new request supersedes", async () => {
    const { client, handles } = setup();
    await client.load("occt");
    const file = join(stepSamplesDirectory()!, "nist_ftc_11_asme1_rb.stp");
    const recipe = RECIPES[0]!;
    const first = client.importStep(new Uint8Array(readFileSync(file)));
    const second = client.boolean("occt", {
      operation: recipe.operation,
      a: recipe.inputs[0],
      b: recipe.inputs[1],
    });
    await expect(first).rejects.toBeInstanceOf(KernelCancelled);
    await second;
    client.dispose();
    expect(handles.describe()).toEqual([]);
  }, 60_000);

  it("reports a file that isn't STEP as an error", async () => {
    const { client, handles } = setup();
    await expect(
      client.importStep(new TextEncoder().encode("not a step file")),
    ).rejects.toThrow();
    client.dispose();
    expect(handles.describe()).toEqual([]);
  }, 60_000);
});
