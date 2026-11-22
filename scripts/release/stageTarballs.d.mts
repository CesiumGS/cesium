/** The only branch the `npm` environment may deploy from. */
export const RELEASE_BRANCH: string;

/** The variable the owner sets on the `npm` environment, and its value. */
export const GATE: { name: string; value: string };

/** Why the release gate is shut, or undefined when the owner has opened it. */
export function gateProblem(env: Record<string, string | undefined>): string | undefined;

/** Why the GitHub environment `npm` (the REST API's JSON) doesn't guard the release. */
export function environmentProblems(environment: unknown, branchPolicies?: unknown): string[];

/** Why an earlier run of release.yml, staged or staging this version, keeps this one from staging. */
export function earlierStagingProblem(earlier: unknown): string | undefined;

/** Why this process can't stage: undefined only in GitHub Actions with an OIDC token. */
export function runnerProblem(env: Record<string, string | undefined>): string | undefined;

/** `folder`, at its real location, when strictly inside a scratch folder; throws otherwise. */
export function scratchFolder(folder: string, env?: Record<string, string | undefined>): string;

/** Bytes' SHA-256, in hex. */
export function sha256(bytes: Uint8Array): string;

/** A release manifest, as `stage.mjs --pack` writes it. */
export interface ReleaseManifest {
  version: string;
  tag: string;
  packages: { name: string; version: string; file: string; sha256: string }[];
}

/** The problems with a release manifest and its tarballs. */
export function tarballProblems(
  manifest: ReleaseManifest,
  bytes: (file: string) => Uint8Array,
  inner: (file: string) => Record<string, any>,
  options?: { dryRun?: boolean },
): string[];

/** `npm stage publish`'s arguments for one tarball. */
export function stageArgs(file: string, tag: string, dryRun: boolean): string[];

/** Checks and stages every tarball in `from`; returns what it staged. */
export function stageTarballs(
  from: string,
  expectedSha256: string | undefined,
  options?: {
    dryRun?: boolean;
    env?: Record<string, string | undefined>;
    environment?: unknown;
    branchPolicies?: unknown;
    earlier?: unknown;
    log?: (line: string) => void;
    npm?: (args: string[], cwd: string) => void;
  },
): string[];
