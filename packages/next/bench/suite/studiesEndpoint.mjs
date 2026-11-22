// Dyno's dev server's study endpoints (CS-404), for the Studies page
// (CS-405). They follow CS-358's fixes for the dev server's file endpoints:
// a bounded body, no path from the request (an id is checked against the
// study id pattern and resolved inside work/studies/), no error detail from
// the file system in a response, and writes only from Dyno's own pages.
//
//   GET  /bench-results/studies/index.json[?all=1]   the list (all: other local branches too)
//   GET  /bench-results/studies/<id>[?branch=b]      a study, its evidence and its verdict so far
//   POST /bench-results/studies/<id>                  { op, … }: note, attach, verdict,
//                                                     abandon or reopen, validated as the CLI
//                                                     validates, written into this worktree
//
// A POST must carry `X-Dyno-Study: 1` (a cross-origin page would need a
// preflight, never granted), JSON, and at most MAX_STUDY_BODY bytes.
import {
  abandonStudy,
  attachRuns,
  checkStudy,
  concludeStudy,
  listStudies,
  noteStudy,
  readStudy,
  reopenStudy,
  studiesDirectory,
  studyFile,
  STUDY_ID,
} from "./studies.mjs";
import {
  citationWarnings,
  computeVerdict,
  evidenceRows,
  loadEvidence,
} from "./studyVerdict.mjs";

/** The largest body a write accepts, bytes. */
export const MAX_STUDY_BODY = 64 * 1024;
/** The longest text field, characters, and the most citations or runs. */
export const MAX_TEXT = 4000;
export const MAX_LIST = 50;
export const STUDY_HEADER = "x-dyno-study";
const OPS = ["note", "attach", "verdict", "abandon", "reopen"];

/** A refusal whose message is safe to send. */
class Refusal extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Whether a write comes from Dyno's own pages (see vitePluginRecord's fromOwnPage). */
export function fromDyno(headers) {
  if (headers[STUDY_HEADER] !== "1") {
    return false;
  }
  const site = headers["sec-fetch-site"];
  if (site !== undefined && site !== "same-origin") {
    return false;
  }
  const origin = headers.origin;
  if (typeof origin === "string" && typeof headers.host === "string") {
    try {
      return new URL(origin).host === headers.host;
    } catch {
      return false;
    }
  }
  return true;
}

const text = (body, key, { required = false } = {}) => {
  const v = body[key];
  if (v === undefined || v === null || v === "") {
    if (required) {
      throw new Refusal(400, `${key}: required`);
    }
    return undefined;
  }
  if (typeof v !== "string" || v.length > MAX_TEXT) {
    throw new Refusal(
      400,
      `${key}: a string of at most ${MAX_TEXT} characters`,
    );
  }
  return v;
};

const list = (body, key) => {
  const v = body[key] ?? [];
  if (!Array.isArray(v) || v.length > MAX_LIST) {
    throw new Refusal(400, `${key}: a list of at most ${MAX_LIST}`);
  }
  return v;
};

/** The study's id from the request's path, or a refusal. */
function idFrom(path, root) {
  const id = decodeURIComponentSafe(
    path.replace(/^\/+/, "").replace(/\.json$/, ""),
  );
  if (!id || !STUDY_ID.test(id) || !studyFile(studiesDirectory(root), id)) {
    throw new Refusal(400, "not a study id");
  }
  return id;
}

function decodeURIComponentSafe(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return "";
  }
}

/** A study as the page reads it. */
function studyView(root, id, { branch, results }) {
  const study = readStudy(root, id, branch ? { branch } : {});
  const check = checkStudy(study, { file: `${id}.md` });
  const evidence = loadEvidence(study.fm, { results });
  const verdict = computeVerdict(study.fm, evidence);
  return {
    id,
    path: study.path,
    branch: study.branch,
    study: study.fm,
    sections: study.sections,
    errors: check.errors,
    warnings: check.warnings,
    evidence: evidenceRows(evidence),
    computed: {
      outcome: verdict.outcome,
      holds_for: verdict.holds_for,
      reasons: verdict.reasons,
      warnings: verdict.warnings,
      settle: verdict.settle,
      excluded: verdict.excluded,
      readout: verdict.readout,
    },
  };
}

/** Applies a write, as the CLI does. */
function write(root, id, body, results) {
  const op = body.op;
  if (!OPS.includes(op)) {
    throw new Refusal(400, `op: one of ${OPS.join(", ")}`);
  }
  if (op === "note") {
    return noteStudy(root, id, text(body, "text", { required: true }));
  }
  if (op === "attach") {
    const runs = list(body, "runs");
    if (
      !runs.length ||
      runs.some((r) => typeof r !== "string" || r.length > 80)
    ) {
      throw new Refusal(400, "runs: one or more run ids");
    }
    return attachRuns(root, id, runs);
  }
  if (op === "abandon") {
    return abandonStudy(root, id, text(body, "reason", { required: true }));
  }
  if (op === "reopen") {
    return reopenStudy(root, id, text(body, "reason", { required: true }));
  }
  // verdict
  const cites = list(body, "cites").map((c) => {
    if (
      !c ||
      typeof c !== "object" ||
      typeof c.run !== "string" ||
      c.run.length > 80
    ) {
      throw new Refusal(400, "cites: [{ run, showed }]");
    }
    return { run: c.run, showed: text(c, "showed", { required: true }) };
  });
  const study = readStudy(root, id);
  const evidence = loadEvidence(study.fm, {
    results,
    cites: cites.map((c) => c.run),
  });
  const verdict = computeVerdict(study.fm, evidence);
  const outcome = text(body, "outcome") ?? verdict.outcome;
  if (outcome !== "inconclusive" && !cites.length) {
    throw new Refusal(400, "a supported or refuted verdict cites its runs");
  }
  const out = concludeStudy(root, id, {
    computed: verdict.outcome,
    outcome,
    override: text(body, "override"),
    reasoning: text(body, "reasoning"),
    decision: text(body, "decision"),
    cites,
    holdsFor: verdict.holds_for,
    readout: verdict.readout,
  });
  return {
    ...out,
    computed: verdict.outcome,
    warnings: [
      ...verdict.warnings,
      ...citationWarnings(cites, evidence, verdict),
    ],
  };
}

/**
 * Handles one request under the prefix: `path` is what follows it, `query`
 * a URLSearchParams, `body` the raw text (POST). Returns { status, json }.
 * `root` is the repository's top level of the server's own worktree.
 */
export function handleStudies({
  method,
  path,
  query,
  headers = {},
  body,
  root,
  results,
  onError,
}) {
  try {
    if (
      method === "GET" &&
      (path === "/index.json" || path === "/" || path === "")
    ) {
      return {
        status: 200,
        json: {
          studies: listStudies(root, {
            allBranches: query?.get("all") === "1",
          }),
        },
      };
    }
    if (method === "GET") {
      const id = idFrom(path, root);
      const branch = query?.get("branch") ?? undefined;
      if (branch !== undefined && !/^[\w./-]{1,200}$/.test(branch)) {
        throw new Refusal(400, "not a branch name");
      }
      return { status: 200, json: studyView(root, id, { branch, results }) };
    }
    if (method !== "POST") {
      throw new Refusal(405, "GET or POST");
    }
    if (!fromDyno(headers)) {
      throw new Refusal(403, "writes come from Dyno's own pages");
    }
    if (!/^application\/json\b/.test(headers["content-type"] ?? "")) {
      throw new Refusal(415, "a JSON body");
    }
    if (typeof body !== "string" || Buffer.byteLength(body) > MAX_STUDY_BODY) {
      throw new Refusal(413, `a body of at most ${MAX_STUDY_BODY} bytes`);
    }
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new Refusal(400, "not JSON");
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Refusal(400, "a JSON object");
    }
    const id = idFrom(path, root);
    const out = write(root, id, parsed, results);
    return {
      status: 200,
      json: {
        id,
        path: out.path,
        ...(out.computed ? { computed: out.computed } : {}),
        warnings: out.warnings ?? [],
      },
    };
  } catch (error) {
    if (error instanceof Refusal) {
      return { status: error.status, json: { error: error.message } };
    }
    // Never an exception's text in a response (CS-358): a file system
    // error carries paths, and the model's refusals can echo the request.
    // The server's log has the detail; `dyno study show` says why a change
    // doesn't check.
    onError?.(error);
    if (
      error?.code ||
      error instanceof TypeError ||
      error instanceof RangeError
    ) {
      return {
        status: 500,
        json: { error: "the study couldn't be read or written" },
      };
    }
    if (/^no study /.test(String(error?.message))) {
      return { status: 404, json: { error: "no such study" } };
    }
    return {
      status: 400,
      json: {
        error: "refused: the change doesn't check (dyno study show says why)",
      },
    };
  }
}

/**
 * The Vite plugin: mounts the handler at `prefix`, reading at most
 * MAX_STUDY_BODY bytes of a body (more is a 413, and the rest is dropped).
 */
export function studiesEndpoint({
  prefix = "/bench-results/studies",
  root,
  results,
}) {
  return {
    name: "dyno-studies",
    configureServer(server) {
      server.middlewares.use(prefix, (req, res) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        const reply = ({ status, json }) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-store");
          res.setHeader("X-Content-Type-Options", "nosniff");
          res.end(JSON.stringify(json));
        };
        const handle = (body) =>
          reply(
            handleStudies({
              method: req.method,
              path: url.pathname,
              query: url.searchParams,
              headers: req.headers,
              body,
              root,
              results: typeof results === "function" ? results() : results,
              onError: (error) =>
                server.config?.logger?.warn(
                  `studies: ${error?.message ?? error}`,
                ),
            }),
          );
        if (req.method !== "POST") {
          handle(undefined);
          return;
        }
        const chunks = [];
        let size = 0;
        let over = false;
        req.on("data", (chunk) => {
          size += chunk.length;
          if (size > MAX_STUDY_BODY) {
            over = true;
            chunks.length = 0;
            return;
          }
          chunks.push(chunk);
        });
        req.on("end", () => {
          if (over) {
            reply({
              status: 413,
              json: { error: `a body of at most ${MAX_STUDY_BODY} bytes` },
            });
            return;
          }
          handle(Buffer.concat(chunks).toString("utf8"));
        });
      });
    },
  };
}
