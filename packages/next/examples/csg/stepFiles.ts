/**
 * The STEP files the CSG sample imports (plan §13.33): NIST's public-domain
 * test models the dev server serves at /step-samples/ (`npm run setup`
 * fetches them; scripts/stepSamples.mjs pins the same files), or a file the
 * user picks or drops.
 */

export interface StepSample {
  /** As NIST names it. */
  name: string;
  /** In /step-samples/. */
  file: string;
  description: string;
}

export const STEP_SAMPLES: readonly StepSample[] = [
  {
    name: "FTC-11",
    file: "nist_ftc_11_asme1_rb.stp",
    description: "a thin 63 mm ring with rounded edges",
  },
  {
    name: "FTC-06",
    file: "nist_ftc_06_asme1_rd.stp",
    description: "a block with a notched top and small holes",
  },
  {
    name: "FTC-10",
    file: "nist_ftc_10_asme1_rb.stp",
    description: "a plate with a pocket, slots and mounting lugs",
  },
  {
    name: "CTC-05",
    file: "nist_ctc_05_asme1_rd.stp",
    description: "a flanged base with bolt holes and a stepped post",
  },
];

const MAGIC = "ISO-10303-21";

/** Whether the bytes begin as a STEP file does (a dev server with no such folder answers with its home page). */
export function isStepFile(bytes: Uint8Array): boolean {
  const head = new TextDecoder().decode(bytes.subarray(0, 64)).trimStart();
  return head.startsWith(MAGIC);
}

/** A sample's bytes from the dev server; throws saying why it couldn't. */
export async function fetchStepSample(
  file: string,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const response = await fetch(
    `/step-samples/${file}`,
    signal ? { signal } : {},
  );
  if (!response.ok) {
    throw new Error(`${file}: HTTP ${response.status}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!isStepFile(bytes)) {
    throw new Error(
      `${file} isn't there: npm run setup fetches NIST's models and the dev server serves them`,
    );
  }
  return bytes;
}
