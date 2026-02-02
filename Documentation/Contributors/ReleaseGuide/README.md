# CesiumJS Release Guide

We release CesiumJS on the first workday of every month.

- [**Release Schedule**](./ReleaseSchedule.md): The upcoming monthly release schedule and the developer responsible for managing each release
- [**Patch Release Guide**](./PatchReleases/README.md): If and how to publish a patch release[^1] ahead of the regular monthly release, typically used in the case of a significant regression or an issue with published dependency versions.
- [**Prerelease Guide**](./Prereleases/README.md): If and how to publish a tagged prerelease[^2] ahead of the regular monthly release, typically used for internal testing.

[^1]: See ["About semantic versioning" on docs.npmjs.com](https://docs.npmjs.com/about-semantic-versioning)

[^2]: See ["Adding dist-tags to packages" on docs.npmjs.com](https://docs.npmjs.com/adding-dist-tags-to-packages)

## Motivation

There is no one release manager; instead, [our community shares the responsibility](https://community.cesium.com/t/cesium-releases/45). Any committer can create the release for a given month, and at any point, they can pass the responsibility to someone else, or someone else can ask for it. This spreads knowledge, avoids stratification, avoids a single point of failure, and is beautifully unstructured.

The remainder of this guide exists to make that shared release ownership clear, repeatable, and low-stress.

## Release prep (the week before)

1. **Update outdated npm dependencies**
   - List outdated dependencies with [`npm outdated`](https://docs.npmjs.com/cli/v8/commands/npm-outdated):
     - Run `npm install`, then `npm outdated`
   - For each outdated dependency, if any:
     - Check against the [`dependencies` label](https://github.com/CesiumGS/cesium/issues?q=is%3Aissue+is%3Aopen+label%3Adependencies) for any known compatibility issues or specifics on pinned versions. Skip the dependency update if it is still incompatible.
     - To increment a dependency, check out a new branch. Run `npm install <packagename>@latest` and verify the update.
     - If an update is incompatible, open a new issue tagged with the `dependencies` label
     - If an update can be resolved, commit the changes and open a PR for review
   - Update PRs should be merged before starting the release process

> [!IMPORTANT]
> We pin an exact version of **`prettier`**. If the version of `prettier` should be incremented, use an exact version by running `npm install prettier@latest --save-exact`.
>
> If you run `npm install prettier@latest` without the `--save-exact` argument, remove the `^` in `package.json`.
>
> It's recommended to commit the package update and a separate commit for any automated formatting updates to streamline PR reviews.

<!-- markdownlint-disable MD029 -->

2. **Check [`priority - next release` issues and PRs](https://github.com/CesiumGS/cesium/labels/priority%20-%20next%20release).** Work with the team to ensure accountability for priority items—this can be done via the "CesiumJS" channel in Teams.
   - Ask the team if there are any items _not_ tagged with the `priority - next release` label that should be tagged
   - For any outstanding items, collaborate with the team to assign accountability

3. **Check the [`remove in <version>` issues](https://github.com/CesiumGS/cesium/labels?q=remove)**
   - Search the codebase for any versioned deprecations and, if present, ensure a corresponding tagged issue exists for each
   - Open a PR to address each item scheduled for removal in the next release, if any

4. Ensure you've generated valid [end-to-end testing snapshots](../TestingGuide/README.md) against a previous release tag with `npm run test-e2e-update`

5. Start thinking ahead about visuals or screenshots for the release blog post. If needed, start to prepare any supporting data, assets, or examples.

<!-- markdownlint-enable MD029 -->

## Access and permissions

To release CesiumJS, you'll need access to the following resources. Check with admins that you have the correct permissions before starting the release process for the first time.

- "CesiumJS" Cesium ion team
- "cesiumdev" ArcGIS Developer account
- "CesiumGS" npm org
- protected branch permissions for the `cesium` repo

## Release testing and packaging

### Housekeeping

1. Verify there are no open [`priority - next release` issues or PRs](https://github.com/CesiumGS/cesium/labels/priority%20-%20next%20release)
2. Verify there are no open issues tagged with the [`remove in <version>` label](https://github.com/CesiumGS/cesium/labels?q=remove). Then, delete the label and create a new label with the next highest `remove in <version>` relative to the existing labels.
3. Make sure you are using the latest drivers for your video card
4. Ensure you've generated valid [end-to-end testing snapshots](../TestingGuide/README.md) against a previous release tag with `npm run test-e2e-update`

### Prepare release updates

1. Pull down the latest `main` branch and run `npm install`

2. Update the Cesium ion demo token in `Ion.js` with a new token from the CesiumJS ion team account. Delete the token from two releases ago.
   - New tokens should have _only_ `read` and `geocode` permissions
   - Tokens are named like this: `1.85 Release - Delete on November 1st, 2021`

3. Update the ArcGIS Developer API key in `ArcGisMapService.js` with a new API key from the [CesiumJS ArcGIS Developer account](https://cejixlif5tkzw83b.maps.arcgis.com/home/organization.html)
   - Sign in with Bitwarden
   - In the top navigation bar, click the **Content** tab
   - Click **New Item** → **Developer Credentials** → **API key credentials**
   - Select an expiration date to the day after the next release. Do not specify any referrer URLs.
   - Enable permissions for **Static maps**
   - Do not grant access to view specific items
   - Set the title. Titles are named like this: `1.85 Release - Delete on November 1st, 2021`.
   - Review the summary and generate API key. On the result screen, copy the API key and paste content in `ArcGisMapService.js`.
   - Return to the **Content** tab and **Delete** the key from the previous release

4. Proofread [`CHANGES.md`](../../../CHANGES.md)
   - Verify the date of the release
   - Order items roughly by prominence or popularity
   - Provide a link to the relevant issue or PR for each item, if possible
   - Ensure each change is in the section for the relevant workspace
   - Check for consistency with spelling, casing, tense, and punctuation

5. Based on `CHANGES.md`, update each workspace version following the rules of [semantic versioning](https://semver.org/), e.g.,
   `npm version minor -w @cesium/engine --no-git-tag-version`. This includes `@cesium/sandcastle`.

> [!IMPORTANT]
>
> #### Versioning rules
>
> - If a workspace incremented a version of any dependencies, at minimum a new patch version of that workspace is required.
> - Following the above rule, incrementing a workspace version will require an ensuing version bump in dependent workspaces—for example, `CHANGES.md` reports changes only in `@cesium/engine`, but the required version increment for `@cesium/engine` will also require a version increment for `@cesium/widgets`.

<!-- markdownlint-disable MD029 -->

6. Update the version in the root `package.json` with `npm version minor --no-git-tag-version`. The version should match that in `CHANGES.md`.

7. Commit local changes

<!-- markdownlint-enable MD029 -->

### Package and verify release

> [!IMPORTANT]
> _Follow these instructions exactly. Do not switch branches or otherwise manipulate your local clone at any point in the process unless instructed to do so. If you need to switch branches for whatever reason, start this section over again from step 1._

1. Clean up local artifacts with `git clean`:
   - **This will delete all files not already in the repository**
   - Run `git clean -dxf --exclude="/Specs/e2e/*-snapshots/"` to exclude end-to-end testing snapshots

2. Run `npm install`

3. Make sure `ThirdParty.json` is up to date by running `npm run build-third-party`. If there are any changes, verify and commit them.

4. Create the release zip with `npm run make-zip`

5. Run tests against the release target with `npm run test -- --failTaskOnError --release`. There should be no failing tests except those already documented [in an issue with the **test failure** label](https://github.com/CesiumGS/cesium/issues?q=is%3Aissue%20state%3Aopen%20label%3A%22test%20failure%22).
   - Test in all browsers with the `--browsers` flag, i.e., `--browsers Firefox,Chrome`
   - Alternatively, test with the browser Spec Runner by starting a local server (`npm start -- --production`) and browsing to `http://localhost:8080/Specs/SpecRunner.html?built=true&release=true`

6. Run end-to-end tests against the release target with `npm run test-e2e-release`, or in multiple browsers with `npm run test-e2e-release-all`

7. Unpack the release zip to the directory of your choice and start the server with `npm install` and then `npm start`. Browse to [`http://localhost:8080`](http://localhost:8080) and confirm that the home page loads and all links work.
   - Verify the [documentation](http://localhost:8080/Build/Documentation/index.html) loads
   - Verify the [Hello World](http://localhost:8080/Apps/HelloWorld.html) app loads
   - Verify the [Cesium Viewer](http://localhost:8080/Apps/CesiumViewer/index.html) app loads
   - Run [Sandcastle](http://localhost:8080/Apps/Sandcastle2/index.html) in the browser of your choice and spot test examples
     - Remove the default Showcases filter to see all examples (Click **Labels** > **Showcases**)
     - Verify the more interactive examples. Use all UI elements—like buttons, toggles, and sliders—to ensure everything works as expected.

8. If any of the above steps fail, post a message to the **CesiumJS** channel in Teams to figure out what needs to be fixed before we can release. **Do NOT proceed to the next step until issues are resolved.**

9. Push your commits to main with `git push`

### Publish release

1. Create and push a [tag](https://git-scm.com/book/en/v2/Git-Basics-Tagging), e.g.,
   - `git tag -a 1.121 -m "1.121 release"`
   - `git push origin 1.121` (This assumes origin is the primary cesium repository. Do not use `git push --tags` as it pushes all tags from all remotes you have on your system.)

2. Publish the release to GitHub
   - Open https://github.com/CesiumGS/cesium/releases/new
   - Select the tag pushed in the previous step
   - Enter "CesiumJS 1.xx" for the title
   - Include date, list of highlights, and link to `CHANGES.md` (`https://github.com/CesiumGS/cesium/blob/1.xx/CHANGES.md`) in the description
     - Look at a [previous release](https://github.com/CesiumGS/cesium/releases/tag/1.79) for an example
     - Don't use emoji, headings, or other extraneous formatting
   - Attach the `Cesium-1.xx` release zip file
   - Publish the release

3. Authenticate your npm account with `npm login`. (The first time you do this, you will need to authorize the machine using `npm adduser`.)

4. Use `npm publish -w <WORKSPACE>` in the repository root (not the unzipped file directory) to publish the workspaces. Repeat this step for each updated workspace, in the following order:
   - `npm publish -w @cesium/engine`
   - `npm publish -w @cesium/widgets`

5. Publish the top-level `cesium` package to npm by running `npm publish` in the repository root (not the unzipped file directory)

6. Check out the `cesium.com` branch. Merge the new release tag into the `cesium.com` branch with `git merge origin <tag-name>`. CI will deploy the hosted release, Sandcastle, and the updated doc upon pushing updates to the branch.

> [!NOTE]
> Check the version of deployed CesiumJS in [Sandcastle](https://sandcastle.cesium.com/) in the top right of the page.
> **It may take up to 30 minutes for the new version of CesiumJS to be live on cesium.com after CI has completed.**

### Announcements and next steps

1. Coordinate with the Comms team to add highlights to the monthly blog post
2. After the `cesium.com` branch is live on cesium.com, comment in the `Communications` channel in Teams to notify Comms that the release is done
3. Continue to the [Cesium Analytics release](https://github.com/CesiumGS/cesium-analytics/tree/main/Documentation/ReleaseGuide)
