# Patch Releases

Occasionally, we need to release versions of CesiumJS prior to our typical [monthly train releases](../README.md). This can arise because of a critical regression or compatibility issue with the published dependency versions. When this is necessary, we publish a **patch** release[^1]. Tools like npm which use Semantic Versioning will usually use this new version of the package the next time a user runs `npm install` without the user needing to opt-in.

[^1]: See ["About semantic versioning" on docs.npmjs.com](https://docs.npmjs.com/about-semantic-versioning)

## Publishing a patch version

This process is based on an abbreviated version of the [monthly release guide](../README.md). Familiarity with our typical release process is recommended, but not required.

### 1. Create a new branch from the base tag

If no additional commits (besides the intended patch fix) have been merged into `main` since the monthly release, you may create a new branch from `main` and skip step 2. Otherwise, proceed with the steps below.

- Checkout a git tag for the base branch– i.e., use `1.123` in place of `<git-tag>` for the previous monthly release, or `1.123.1` for a subsequent patches applied in the same month.
- From this branch, create a new branch with any unique `<branch-name>`.

#### Commands

```sh
git checkout <git-tag>
git checkout -b <branch-name>
```

### 2. Cherry pick relevant commits

- Use [`git-cherry-pick`](https://git-scm.com/docs/git-cherry-pick) one or more times to apply select commits to the current branch
- As necessary, resolve any merge conflicts, add, and continue.

#### Commands

```sh
git cherry-pick <commit-hash>
```

### 3. Bump the release version

Use [npm `version` with the `patch` command](https://docs.npmjs.com/cli/v11/commands/npm-version) to bump the version of each workspace and the root package– e.g., `npm version patch --no-git-tag-version`

#### Commands

```sh
npm version patch --ws --no-git-tag-version
npm version patch --no-git-tag-version
```

### 4. Update `CHANGES.md`

- In [`CHANGES.md`](../../../CHANGES.md), create a new header with the version string of root package from the previous step and the date of the release— e.g., if the version string from the previous step is `1.123.1`, `CHANGES.md` should read:

```md
# Change Log

## 1.123.1 - 2025-07-15

### @cesium/engine

...
```

- Move any relevant items in the list to the new header in `CHANGES.md`.
- Delete any empty headers.
- Ensure each change is nested in the section for the relevant workspace.
- Commit any staged changed and push to your branch.

### 5. Release build and sanity test

While the full extent of typical release testing is not required, at minimum, create a release build and run the release tests.

- Make sure the repository is clean `git clean -d -x -f --exclude="/Specs/e2e/*-snapshots/"`. **This will delete all files not already in the repository, excluding end to end testing snapshots.**
- Run `npm install`.
- Make sure `ThirdParty.json` is up to date by running `npm run build-third-party`. If there are any changes, verify and commit them.
- Create the release zip `npm run make-zip`.
- Run tests against the release `npm run test -- --failTaskOnError --release`.
- Run [Sandcastle](http://localhost:8080/Apps/Sandcastle/index.html) and verify functionality from the patch is working as expected.

### 6. Push and tag the release commit

- Push your commits to the _current_ branch.
- Create and push a [tag](https://git-scm.com/book/en/v2/Git-Basics-Tagging), e.g., if the version string from previous steps is `1.123.1`, run:
  - `git tag -a 1.123.1 -m "1.123.1 release"`
  - `git push origin 1.123.1` (this assumes origin is the primary cesium repository; do not use `git push --tags` as it pushes all tags from all remotes you have on your system)

#### Commands

```sh
git push
git tag -a <version-tag> -m "<release-description>"
git push origin <version-tag>
```

### 7. Publish

#### a. Publish to npm

Continue with the normal `publish` command; There is no need to tag this differently than a typical release version.

- Use `npm publish --ws` in the repository root to publish the workspaces.
- Use `npm publish` to publish the root package.

#### b. Publish to the website

**_Often, as is the case with issues arising from published dependency versions, a patch release only needs to be published to npm and does not need to be deployed to cesium.com. If that is the case, skip step 7b and proceed to step 8._**

- Check out the `cesium.com` branch.
- Merge the new release tag into the `cesium.com` branch with `git merge origin <tag-name> --ff-only`.
- Push the branch with `git push`. CI will deploy the hosted release, Sandcastle, and the updated doc.

### 8. Port the updates back to `main`

It's important that the latest version info goes back into the `main` branch to streamline future releases.

- Checkout `main` and pull the latest updates:
  - `git checkout main`
  - `git pull`
- Checkout your patch release branch:
  - `git checkout <release-branch>`
- [Optional] Create a new branch to perform the merge:
  - `git checkout -b <branch-name>`
- Merge `main`, resolving any conflicts, particularly in `CHANGES.md`. Ensure the patch release _is_ included in the release notes, and ensure the specific patch fix descriptions are only listed once under the patch release.
  - `git merge main`
  - `git add .`
  - `git diff main`
- Commit and push your changes:
  - `git commit -m "sync version info"`
  - `git push --set-upstream origin <branch-name>`
- Open a new PR with the **priority - next release** label

### 9. Announce the release

Once the packages have been successfully published to npm, notify the interested developers that the release has been completed. This may include adding a comment to relevant GitHub issues that a fix has been published.
