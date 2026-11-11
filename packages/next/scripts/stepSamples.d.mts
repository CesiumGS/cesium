// Types for stepSamples.mjs (NIST's public-domain STEP test models, pinned in the store).
export interface StepDataset {
  doi: string;
  title: string;
  version: string;
  url: string;
  bytes: number;
  sha256: string;
  licence: string;
  landing: string;
}
export interface StepSample {
  /** The file's name in the store and in the zip's geometry-only folder. */
  file: string;
  bytes: number;
  sha256: string;
}
export const STEP_DATASET: StepDataset;
export const STEP_SAMPLES: readonly StepSample[];
export function stepSamplesDirectory(): string | undefined;
export function stepSamplesNotice(
  dataset?: StepDataset,
  samples?: readonly StepSample[],
): string;
export function verifyStepSamples(
  directory: string,
  samples?: readonly StepSample[],
): void;
export function unzipMembers(
  zip: Uint8Array,
  names: readonly string[],
): Map<string, Uint8Array>;
export function ensureStepSamples(
  log?: (line: string) => void,
  options?: {
    dataset?: StepDataset;
    samples?: readonly StepSample[];
    store?: string;
    fetch?: typeof fetch;
  },
): Promise<string>;
