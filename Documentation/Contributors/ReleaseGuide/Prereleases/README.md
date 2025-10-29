# Prereleases

Occasionally, we need to release incremental, opt-in versions of CesiumJS to npm prior to our typical [monthly train releases](../README.md) for early testing or internal use. When this is necessary, we publish a tagged **prerelease**[^1]. Prereleases are not guaranteed as stable and may not be compatable with official numbered releases.

[^1]: See ["Adding dist-tags to packages" on docs.npmjs.com](https://docs.npmjs.com/adding-dist-tags-to-packages)

## Installing a prerelease

Use a prerelease tag—e.g. `ion`—to install a published prerelease.

```sh
npm install cesium@<tag>
npm install @cesium/engine@<tag>
npm install @cesium/widgets@<tag>
```

For example, if the prerelease tag is `ion`, run the following command to install the latest ion prerelease of the top-level `cesium` npm package.

```sh
npm install cesium@ion
```

## Do we need a prelease?

A prerelease of CesiumJS typically _will not have the level of validation_ that the official monthly numbered release receives. Additionally, [cherry picking commits](https://www.atlassian.com/git/tutorials/cherry-pick) for hot fixes can _complicate commit history and introduce bugs_. Consider if a prerelease is the ideal solution or if [continuous deployment artifacts](../../ContinuousIntegration/README.md#continuous-deployment) will suffice.

## Publishing a prelease

This process is based on an abbreviated version of the [monthly release guide](../README.md). Familiarity with our typical release process is recommended, but not required.

### 1. Create a new branch from the base tag

- Checkout a git tag for the base branch– i.e., use `1.123` in place of `<git-tag>` for the previous monthly release, or `1.123.1-ion.0` for a subsequent prerelease.
- From this branch, create a new branch with any unique `<branch-name>`.

#### Commands

```sh
git checkout <git-tag>
git checkout -b <branch-name>
```

### 2. Cherry pick relevant commits

- Use [`git-cherry-pick`](https://git-scm.com/docs/git-cherry-pick) one or more times to apply select commits to the current branch.
- As necessary, resolve any merge conflicts, add, and continue.

#### Commands

```sh
git cherry-pick <commit-hash>
```

### 3. Bump the prerelease version

Use [npm `version` with the `preid` argument](https://docs.npmjs.com/cli/v11/commands/npm-version#preid) to bump the version of each workspace and the root package– e.g., `npm version prerelease --preid ion --no-git-tag-version`

#### Commands

```sh
npm version prerelease --preid <tag> --ws --no-git-tag-version
npm version prerelease --preid <tag> --no-git-tag-version
```

### 4. Update `CHANGES.md`

- In [`CHANGES.md`](../../../CHANGES.md), create a new header with the version string of root package from the previous step and the date of the release— e.g., if the version string from the previous step is `1.123.1-ion.0`, `CHANGES.md` should read:

```md
# Change Log

## 1.123.1-ion.0 - 2025-07-15

### @cesium/engine

...
```

- Move any relevant items in the list to the new header in `CHANGES.md`.
- Delete any empty headers.
- Ensure each change is nested in the section for the relevant workspace.
- Commit any staged changes and push to your branch.

### 5. Release build and sanity test

While the full extent of typical release testing is not required, at minimum, create a release build and run the release tests.

- Make sure the repository is clean `git clean -d -x -f --exclude="/Specs/e2e/*-snapshots/"`. **This will delete all files not already in the repository, excluding end to end testing snapshots.**
- Run `npm install`.
- Make sure `ThirdParty.json` is up to date by running `npm run build-third-party`. If there are any changes, verify and commit them.
- Create the release zip `npm run make-zip`.
- Run tests against the release `npm run test -- --failTaskOnError --release`.
- Run [Sandcastle](http://localhost:8080/Apps/Sandcastle/index.html) and verify functionality from this prerelease is working as expected.

### 6. Push and tag the release commit

- Push your commits to the _current_ branch.
- Create and push a [tag](https://git-scm.com/book/en/v2/Git-Basics-Tagging), e.g., if the version string from previous steps is `1.123.1-ion.0`, run:
  - `git tag -a 1.123.1-ion.0 -m "1.123.1 ion prerelease"`
  - `git push origin 1.123.1-ion.0` (this assumes origin is the primary cesium repository; do not use `git push --tags` as it pushes all tags from all remotes you have on your system)

#### Commands

```sh
git push
git tag -a <version-tag> -m "<prerelease-description>"
git push origin <version-tag>
```

### 7. Publish to npm

Ensure the prerelease version of each package is not tagged as the `latest` version by [including the `tag` flag](https://docs.npmjs.com/cli/v11/commands/npm-publish#tag)— Ideally the `<tag>` specified here should match the prerelease tag from the version info. For instance, if the version is `1.123.1-ion.0`, use the `ion` tag.

- Use `npm publish --ws --tag <tag>` in the repository root to publish the workspaces.
- Use `npm publish --tag <tag>` to publish the root package.

#### Commands

```sh
npm publish --ws --tag <tag>
npm publish --tag <tag>
```

### 8. Port the updates back to `main`

It's important that the latest version info goes back into the `main` branch to streamline future releases.

- Checkout `main` and pull the latest updates:
  - `git checkout main`
  - `git pull`
- Checkout your prerelease branch:
  - `git checkout <prerelease-branch>`
- [Optional] Create a new branch to perform the merge:
  - `git checkout -b <branch-name>`
- Merge `main`, resolving any conflicts, particularly in `CHANGES.md`. The prerelease section can be removed, and relevant changes moved to the next monthly release. To confirm the merge, do a diff against main. Ideally, only the version info should show as updated.
  - `git merge main`
  - `git add .`
  - `git diff main`
- Commit and push your changes:
  - `git commit -m "sync version info"`
  - `git push --set-upstream origin <branch-name>`
- Open a new PR with the **priority - next release** label

### 9. Announce the prerelease

Once the packages have been successfully published to npm, notify the interested developers that the release has been completed.
