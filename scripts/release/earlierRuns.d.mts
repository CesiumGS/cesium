/** The workflow file whose runs count. */
export const WORKFLOW: string;

/** The artifact `verify` uploads for a version. */
export function artifactName(version: string): string;

/** One page of a REST list, parsed. */
export type Get = (path: string) => Promise<any>;

/** Every item of a paginated list, page by page to its end; throws on a page that isn't a list. */
export function listAll(get: Get, path: string, key: string): Promise<unknown[]>;

/** One earlier run's publish job, as stageTarballs.mjs's `--earlier` reads it. */
export interface EarlierRun {
  run: number;
  status: string;
  conclusion: string | null;
}

/** Each other run of release.yml on the 2.0 branch, from a push in this repository, that packed `version`. */
export function earlierRuns(options: {
  get: Get;
  repository: string;
  version: string;
  runId: number;
  workflow?: string;
  branch?: string;
}): Promise<EarlierRun[]>;

/** One GET to GitHub's REST API with the job's token (GH_TOKEN), parsed; throws unless it is 200. */
export function restGet(env?: Record<string, string | undefined>): Get;
