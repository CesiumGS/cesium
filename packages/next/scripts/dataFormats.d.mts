/** The datasets setup and the sky builder write into stores outside the repo. */
export type DatasetName =
  | "sky"
  | "frames"
  | "designTiles"
  | "smlib"
  | "occt"
  | "slangc"
  | "slangWasm"
  | "step";

export interface Dataset {
  /** What a person calls it. */
  label: string;
  /** The format this checkout reads and writes. */
  format: number;
  /** The command that builds it. */
  command: string;
  /** Where a store records the format it was built with. */
  record: { file: string; key: string };
}

export type DatasetStatus =
  | { name: DatasetName; state: "current"; found: number; expected: number }
  | {
      name: DatasetName;
      state: "missing";
      expected: number;
      message: string;
    }
  | {
      name: DatasetName;
      state: "outOfDate";
      found: number;
      expected: number;
      message: string;
    };

export const SETUP_COMMAND: string;
export const FORMAT_FILE: string;
export const DATASETS: Record<DatasetName, Dataset>;
export function recordedFormat(
  name: DatasetName,
  directory: string,
):
  | { found: number }
  | { missing: true }
  | { unrecorded: true }
  | { problem: string };
export function datasetStatus(
  name: DatasetName,
  directory: string | undefined,
): DatasetStatus;
export function isCurrent(
  name: DatasetName,
  directory: string | undefined,
): boolean;
export function writeFormat(name: DatasetName, directory: string): void;
export function adoptFormat1(name: DatasetName, directory: string): void;
export function overrideStatus(name: DatasetName): DatasetStatus;
export const DESIGN_TILES_DIRECTORY: string;
