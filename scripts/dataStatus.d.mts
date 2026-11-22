import type { DatasetName, DatasetStatus } from "./dataFormats.mjs";
/** The status of every dataset, as this machine's stores hold them now. */
export function datasetStatuses(): DatasetStatus[];
/** The datasets whose store was built in another format than this code reads. */
export function outOfDateDatasets(): DatasetStatus[];
/** The datasets a data test with this source reads. */
export function datasetsReadBy(source: string): DatasetName[];
/**
 * Why a data test with this source can't run, as one line, or undefined if
 * every dataset it reads is current (or missing).
 */
export function outOfDateReason(
  source: string,
  statuses?: DatasetStatus[],
): string | undefined;
