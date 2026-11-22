// The earlier runs that packed a version (CS-613), for release.yml's
// `publish` job: stageTarballs.mjs refuses when one of them staged it or
// is staging it (earlierStagingProblem).
//
//   node scripts/release/earlierRuns.mjs --version <version> --out <file>
//
// It lists only this workflow file's runs (`release.yml`) on the 2.0
// branch, from pushes, whose head repository is this one, so no other
// workflow, and no fork's pull request, can name an artifact that makes a
// genuine run refuse. For each other run, it reads that run's artifacts
// named `npm-tarballs-<version>`, and for each run that has one, its
// `publish` jobs, every attempt's. Every list is read page by page, to its
// end; a failed page fails the script, and it writes no file, so the stage
// step refuses. GETs only, with the job's token (GH_TOKEN, `actions:
// read`). It imports nothing outside Node and this folder.
import { renameSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { RELEASE_BRANCH, scratchFolder } from "./stageTarballs.mjs";

/** The workflow file whose runs count. */
export const WORKFLOW = "release.yml";

const PER_PAGE = 100;

/** The artifact `verify` uploads for a version. */
export function artifactName(version) {
  return `npm-tarballs-${version}`;
}

/**
 * Every item of a paginated list, read page by page until a page is short
 * or `total_count` is reached. Throws on a page that isn't a list.
 * @param {(path: string) => Promise<any>} get one page, parsed
 * @param {string} path the list's path, with its query
 * @param {string} key the field that holds the items
 */
export async function listAll(get, path, key) {
  const items = [];
  for (let page = 1; ; page += 1) {
    const sep = path.includes("?") ? "&" : "?";
    const body = await get(`${path}${sep}per_page=${PER_PAGE}&page=${page}`);
    const list = body?.[key];
    if (!Array.isArray(list)) {
      throw new Error(`page ${page} of ${path} has no ${key} list`);
    }
    items.push(...list);
    const total = Number(body.total_count);
    if (list.length < PER_PAGE || (Number.isFinite(total) && items.length >= total)) {
      return items;
    }
  }
}

/**
 * Each other run of release.yml that packed `version`, with its `publish`
 * jobs' states: `[{ run, status, conclusion }]`, as stageTarballs.mjs's
 * `--earlier` reads it. A run that packed the version but has no publish
 * job listed counts by its own status, so one still running refuses too.
 * @param {{ get: (path: string) => Promise<any>, repository: string, version: string, runId: number, workflow?: string, branch?: string }} options
 */
export async function earlierRuns(options) {
  const { get, repository, version, runId, workflow = WORKFLOW, branch = RELEASE_BRANCH } = options;
  if (!/^[\w.-]+\/[\w.-]+$/.test(`${repository}`)) {
    throw new Error(`the repository ${JSON.stringify(repository)} isn't owner/name`);
  }
  const repo = `repos/${repository}`;
  const runs = await listAll(
    get,
    `${repo}/actions/workflows/${encodeURIComponent(workflow)}/runs?branch=${encodeURIComponent(branch)}&event=push&exclude_pull_requests=true`,
    "workflow_runs",
  );
  const ours = runs.filter(
    (r) =>
      isObject(r) &&
      Number.isInteger(r.id) &&
      r.id !== runId &&
      r.head_repository?.full_name === repository &&
      r.event === "push" &&
      r.head_branch === branch,
  );
  const name = artifactName(version);
  const earlier = [];
  for (const run of ours) {
    const artifacts = await listAll(
      get,
      `${repo}/actions/runs/${run.id}/artifacts?name=${encodeURIComponent(name)}`,
      "artifacts",
    );
    // An artifact's workflow_run can be null; this list is the run's own.
    const packed = artifacts.some(
      (a) => isObject(a) && a.name === name && (a.workflow_run === null || a.workflow_run === undefined || a.workflow_run.id === run.id),
    );
    if (!packed) {
      continue;
    }
    const jobs = await listAll(get, `${repo}/actions/runs/${run.id}/jobs?filter=all`, "jobs");
    const publish = jobs.filter((j) => isObject(j) && j.name === "publish");
    if (publish.length === 0) {
      earlier.push({ run: run.id, status: run.status, conclusion: null });
    }
    for (const j of publish) {
      earlier.push({ run: run.id, status: j.status, conclusion: j.conclusion });
    }
  }
  return earlier;
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** One GET to GitHub's REST API with the job's token, parsed; throws unless it is 200. */
export function restGet(env = process.env) {
  const api = env.GITHUB_API_URL || "https://api.github.com";
  return async (path) => {
    const response = await fetch(`${api}/${path}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${env.GH_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (response.status !== 200) {
      throw new Error(`GET ${path}: HTTP ${response.status}`);
    }
    return response.json();
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const option = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const version = option("--version");
  const outArg = option("--out");
  try {
    if (!version || !outArg) {
      throw new Error("--version <version> and --out <file> are required");
    }
    if (!process.env.GH_TOKEN) {
      throw new Error("GH_TOKEN, the job's token, isn't set");
    }
    const earlier = await earlierRuns({
      get: restGet(),
      repository: process.env.GITHUB_REPOSITORY ?? "",
      version,
      runId: Number(process.env.GITHUB_RUN_ID),
    });
    // Only strictly inside a scratch folder (RUNNER_TEMP or the system's).
    const out = scratchFolder(outArg);
    writeFileSync(`${out}.part`, `${JSON.stringify(earlier)}\n`);
    renameSync(`${out}.part`, out);
    console.log(`earlierRuns: ${earlier.length} publish job(s) of earlier runs that packed ${version}`);
  } catch (error) {
    console.log(`earlierRuns: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
