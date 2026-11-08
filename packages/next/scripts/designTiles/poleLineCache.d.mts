/** A sampling date, as the generated file's comment states it. */
export const SAMPLED_DATE: RegExp;
/** A lidar height, ODN metres: finite, within what Great Britain's ground spans. */
export function lidarHeight(v: unknown): v is number;
/** The cache's date and cells, checked; throws for anything else. */
export function checkedCache(
  json: unknown,
  path: string,
): { sampled: string; cells: Record<string, number[]> };
