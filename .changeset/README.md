# Changesets

A changeset is a short file here that says what one change does for users. Changesets (`@changesets/cli`) reads them when a release record is written, and turns them into each package's `CHANGELOG.md`.

- **One per change.** Add it in the same commit that closes the work item. It names the packages, the bump (major, minor or patch) and one or two sentences written for users: `npx changeset --minor @cesium/core -m "…"` (`--major`, `--minor` and `--patch` each take a comma-separated list), or `npx changeset` to be asked.
- **Nothing for users** (tests, docs, the bench): `npx changeset --empty`.
- **CI checks it.** A pull request that changes a package under `packages/` without a changeset fails (`npm run changeset:check -- --base <ref>`).
- **The stable packages are one `fixed` group** in `config.json`: they release together at one version. A package under `packages/` outside that group is on the experimental line, numbered from the stable version by `scripts/release/lines.mjs`.

The release itself is in `docs/design/repository-build-and-release.md`, under "Releases".
