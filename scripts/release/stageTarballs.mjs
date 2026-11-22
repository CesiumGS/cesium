// The release workflow's publishing step (CS-613; CS-889): stages the
// tarballs that `scripts/release/stage.mjs --pack` made and checked, with
// `npm stage publish`, through npm's trusted publishing (the job's OIDC
// identity; no token), so nothing is live until a maintainer approves each
// staged version with 2FA on npm, the umbrella last.
//
//   node scripts/release/stageTarballs.mjs --from <dir> --manifest-sha256 <hex>
//     --environment <the npm environment's JSON> [--dry-run]
//
// It runs in release.yml's `publish` job, the only one with `id-token:
// write`, which runs no `npm ci` and no build, so it imports nothing
// outside Node and this folder's lines.mjs. Before it stages anything, it
// checks, and stops on the first failure:
// 1. it runs in GitHub Actions with an OIDC token to ask for, so no local
//    login ever stages;
// 2. the owner's release gate: the GitHub environment `npm`, read through
//    the REST API by the job (`--environment`), has a required reviewer
//    and a deployment-branch policy; and its variable CESIUM_RELEASE_GATE
//    is `reviewed` (the design's checklist, "Releases", step 1). GitHub
//    creates a missing environment with no reviewer and no variables, so a
//    missing gate fails closed. The variable alone isn't enough: `vars.`
//    falls back to a repository's or an organization's variable;
// 3. `<dir>/release.json`'s SHA-256 is the one the packing job reported;
// 4. each tarball's SHA-256 is the one release.json lists, its
//    package.json names that package and version, and it isn't private;
// 5. the versions and the dist-tag agree with scripts/release/lines.mjs.
// `--dry-run` skips checks 1 and 2, passes `--dry-run` to npm and reports a
// private package instead of refusing it, so the path can be tried on a
// machine. A failure partway leaves the packages before it staged; the
// message names them, for the owner to reject before rerunning.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { distTag, pairedVersion, parseVersion } from "./lines.mjs";

/** The variable the owner sets on the `npm` environment, and its value. */
export const GATE = { name: "CESIUM_RELEASE_GATE", value: "reviewed" };

/**
 * Why the gate is shut, or undefined when the owner has opened it. The
 * variable is a second, weaker guard: `vars.` falls back to a repository's
 * or an organization's variable of the same name, so environmentProblems
 * is the real check.
 */
export function gateProblem(env) {
  const value = env[GATE.name];
  if (value === GATE.value) {
    return undefined;
  }
  return `${GATE.name} is ${value === undefined || value === "" ? "not set" : `${JSON.stringify(value)}, not ${JSON.stringify(GATE.value)}`}. The owner sets it to "${GATE.value}" on the GitHub environment \`npm\` once that environment has the owner as its required reviewer: step 1 of "What the owner sets up outside the repository" in docs/design/repository-build-and-release.md`;
}

/**
 * Why the GitHub environment `npm`, as the REST API returns it (`GET
 * /repos/{owner}/{repo}/environments/npm`), doesn't guard the release: it
 * must have a required-reviewers rule with at least one reviewer, and a
 * deployment-branch policy. An empty list when it does.
 * @param {any} environment the API's JSON, or undefined when it couldn't be read
 */
export function environmentProblems(environment) {
  if (!isObject(environment) || environment.name !== "npm") {
    return [
      `the GitHub environment \`npm\` couldn't be read (${isObject(environment) ? `got ${JSON.stringify(environment.name ?? environment.message)}` : "no JSON"}); the publish job reads it with its own token, which needs read access to the repository`,
    ];
  }
  const problems = [];
  const rules = Array.isArray(environment.protection_rules) ? environment.protection_rules : [];
  const reviewers = rules
    .filter((rule) => isObject(rule) && rule.type === "required_reviewers")
    .flatMap((rule) => (Array.isArray(rule.reviewers) ? rule.reviewers : []));
  if (reviewers.length === 0) {
    problems.push("the environment `npm` has no required reviewer");
  }
  const policy = environment.deployment_branch_policy;
  if (
    !isObject(policy) ||
    !(policy.protected_branches === true || policy.custom_branch_policies === true) ||
    !rules.some((rule) => isObject(rule) && rule.type === "branch_policy")
  ) {
    problems.push("the environment `npm` lets any branch deploy; limit it to the 2.0 branch");
  }
  return problems;
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Why this process can't stage, or undefined when it runs in GitHub
 * Actions with an OIDC token to ask for: no local login ever stages.
 */
export function runnerProblem(env) {
  if (env.GITHUB_ACTIONS === "true" && `${env.ACTIONS_ID_TOKEN_REQUEST_URL ?? ""}` !== "") {
    return undefined;
  }
  return "it stages only in release.yml's publish job (GITHUB_ACTIONS and ACTIONS_ID_TOKEN_REQUEST_URL set), never from a machine; use --dry-run to try the path here";
}

/**
 * A path's real location: its nearest existing ancestor through
 * `realpath`, with the rest of the path joined on, so a symbolic link
 * anywhere along it is followed.
 */
function realLocation(path) {
  let head = resolve(path);
  const rest = [];
  for (;;) {
    try {
      return join(realpathSync(head), ...rest);
    } catch {
      const parent = dirname(head);
      if (parent === head) {
        return join(head, ...rest);
      }
      rest.unshift(basename(head));
      head = parent;
    }
  }
}

/**
 * `folder`, at its real location, when it lies strictly inside a scratch
 * folder: the system's temporary folder, or the runner's `RUNNER_TEMP` in
 * GitHub Actions only. The release's tarballs are written and read there.
 * A symbolic link along the path is followed before the comparison, so one
 * planted in a shared temporary folder can't send the writes elsewhere.
 * Throws otherwise, and for a scratch folder itself.
 */
export function scratchFolder(folder, env = process.env) {
  const roots = [tmpdir(), env.GITHUB_ACTIONS === "true" ? env.RUNNER_TEMP : undefined]
    .filter((root) => typeof root === "string" && root !== "")
    .map((root) => realLocation(root));
  const target = realLocation(`${folder}`);
  if (!roots.some((root) => target.startsWith(`${root}${sep}`))) {
    throw new Error(
      `${target} isn't a folder inside a scratch folder (${[...new Set(roots)].join(" or ")}); the release's tarballs live only there`,
    );
  }
  return target;
}

/** A file's SHA-256, in hex. */
export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * The problems with a release manifest and its tarballs (an empty list
 * when none). `inner(file)` reads a tarball's package.json.
 * @param {{ version: string, tag: string, packages: { name: string, version: string, file: string, sha256: string }[] }} manifest
 * @param {(file: string) => Buffer} bytes a tarball's bytes
 * @param {(file: string) => Record<string, any>} inner a tarball's package.json
 * @param {{ dryRun?: boolean }} [options]
 */
export function tarballProblems(manifest, bytes, inner, options = {}) {
  const problems = [];
  const { version, tag, packages } = manifest;
  if (!parseVersion(version ?? "")) {
    return [`release.json's version ${JSON.stringify(version)} isn't one`];
  }
  if (tag !== distTag(version)) {
    problems.push(`release.json's tag is ${tag}, not ${distTag(version)} for ${version}`);
  }
  const paired = pairedVersion(version);
  if (!Array.isArray(packages) || packages.length === 0) {
    return [...problems, "release.json lists no packages"];
  }
  for (const p of packages) {
    if (basename(p.file) !== p.file || !p.file.endsWith(".tgz")) {
      problems.push(`${p.name}: ${JSON.stringify(p.file)} isn't a tarball's file name`);
      continue;
    }
    if (p.version !== version && p.version !== paired) {
      problems.push(`${p.name}@${p.version} is at neither ${version} nor its paired ${paired}`);
    }
    const sum = sha256(bytes(p.file));
    if (sum !== p.sha256) {
      problems.push(`${p.file}'s SHA-256 is ${sum}, not the ${p.sha256} release.json lists`);
      continue;
    }
    const m = inner(p.file);
    if (m.name !== p.name || m.version !== p.version) {
      problems.push(`${p.file} holds ${m.name}@${m.version}, not ${p.name}@${p.version}`);
    }
    if (m.private && !options.dryRun) {
      problems.push(`${p.name} is private; npm won't stage it, and making it public is the owner's step`);
    }
  }
  return problems;
}

/** `npm stage publish`'s arguments for one tarball. */
export function stageArgs(file, tag, dryRun) {
  return [
    "stage",
    "publish",
    `./${file}`,
    "--tag",
    tag,
    "--access",
    "public",
    "--ignore-scripts",
    ...(dryRun ? ["--dry-run"] : []),
  ];
}

/**
 * Checks and stages every tarball in `from`, in release.json's order.
 * Throws on the first failure, naming what it had already staged.
 */
export function stageTarballs(from, expectedSha256, options = {}) {
  const {
    dryRun = false,
    env = process.env,
    environment,
    log = console.log,
    npm = runNpm,
  } = options;
  if (!dryRun) {
    const runner = runnerProblem(env);
    if (runner) {
      throw new Error(`nothing staged: ${runner}`);
    }
    const guard = environmentProblems(environment);
    if (guard.length > 0) {
      throw new Error(
        `the release gate is shut: ${guard.join("; ")}. Step 1 of "What the owner sets up outside the repository" in docs/design/repository-build-and-release.md`,
      );
    }
    const gate = gateProblem(env);
    if (gate) {
      throw new Error(`the release gate is shut: ${gate}`);
    }
  }
  const text = readFileSync(join(from, "release.json"));
  if (!/^[0-9a-f]{64}$/.test(expectedSha256 ?? "") || sha256(text) !== expectedSha256) {
    throw new Error(
      `release.json's SHA-256 is ${sha256(text)}, not the ${JSON.stringify(expectedSha256)} the packing job reported`,
    );
  }
  const manifest = JSON.parse(text.toString("utf8"));
  const problems = tarballProblems(
    manifest,
    (file) => readFileSync(join(from, file)),
    (file) =>
      JSON.parse(
        execFileSync("tar", ["-xzOf", join(from, file), "package/package.json"], {
          encoding: "utf8",
          maxBuffer: 16 << 20,
        }),
      ),
    { dryRun },
  );
  if (problems.length > 0) {
    throw new Error(`the tarballs fail ${problems.length} check(s):\n  ${problems.join("\n  ")}`);
  }
  const staged = [];
  for (const p of manifest.packages) {
    log(`stage: ${p.name}@${p.version} under ${manifest.tag}${dryRun ? " (dry run)" : ""}`);
    try {
      npm(stageArgs(p.file, manifest.tag, dryRun), from);
    } catch (error) {
      throw new Error(
        `staging ${p.name}@${p.version} failed (${error instanceof Error ? error.message : error}). ${staged.length > 0 ? `Already staged: ${staged.join(", ")}; reject each on npm (\`npm stage list\`, then \`npm stage reject <id>\`, with 2FA), then rerun the workflow` : "Nothing was staged before it; rerun the workflow once the cause is fixed"}`,
        { cause: error },
      );
    }
    staged.push(`${p.name}@${p.version}`);
  }
  log(
    `stage: ${staged.length} packages staged at ${manifest.version} under ${manifest.tag}${dryRun ? " (dry run: nothing published)" : "; approve each on npm with 2FA, the umbrella last"}`,
  );
  return staged;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

function runNpm(args, cwd) {
  execFileSync("npm", args, { cwd, stdio: "inherit" });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const option = (flag) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const from = option("--from");
  if (!from) {
    console.error("stageTarballs: --from <dir> is required");
    process.exit(2);
  }
  try {
    const environmentFile = option("--environment");
    stageTarballs(scratchFolder(from), option("--manifest-sha256"), {
      dryRun: args.includes("--dry-run"),
      environment: environmentFile ? readJson(scratchFolder(environmentFile)) : undefined,
    });
  } catch (error) {
    console.error(`stageTarballs: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}
