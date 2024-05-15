# Release Guide

We release Cesium on the first work day of every month. [This file](../../../.slackbot.yml) outlines the release schedule and the developer responsible for each month's release.

There is no release manager; instead, our community shares the responsibility. Any committer can create the release for a given month, and at any point, they can pass the responsibility to someone else, or someone else can ask for it. This spreads knowledge, avoids stratification, avoids a single point of failure, and is beautifully unstructured ([more info](https://community.cesium.com/t/cesium-releases/45)).

## One week before release

1. Check for any outdated dependencies with `npm outdated`.
2. If one or more dependencies are outdated, checkout a new branch and run `npm install <packagename>@latest` for each package to increment the version.
3. Verify each update. If an update can be resolved, open a PR with your changes. If an update is incompatible, open an issue.
4. Check the [`priority - next release` issues and PRs](https://github.com/CesiumGS/cesium/labels/priority%20-%20next%20release). If there are any outstanding items, post a message to the `#cesiumjs` channel in Slack to figure out what needs to be addressed before we can release.
5. Ensure you've generated valid [end to end testing snapshots](../TestingGuide/README.md) against a previous release tag with `npm run test-e2e-update`.

## Release testing and packaging

**Follow these instructions exactly. Do not switch branches or otherwise manipulate your local clone at any point in the process unless instructed to do so. If you need to switch branches for whatever reason, you must start the entire process over again.**

1. Verify there are no [`priority - next release` issues and PRs](https://github.com/CesiumGS/cesium/labels/priority%20-%20next%20release).
2. Verify there are no [`remove in [this version number]` issues](https://github.com/CesiumGS/cesium/labels). Delete the label. Create a new label with the next highest `remove in [version]` relative to the existing labels.
3. Make sure you are using the latest drivers for your video card.
4. Ensure you've generated valid [end to end testing snapshots](../TestingGuide/README.md) against a previous release tag with `npm run test-e2e-update`.
5. Pull down the latest `main` branch and run `npm install`.
6. Update the Cesium ion demo token in `Ion.js` with a new token from the CesiumJS ion team account with read and geocode permissions. These tokens are named like this: `1.85 Release - Delete on November 1st, 2021`. Delete the token from 2 releases ago.
7. Update the ArcGIS Developer API key in `ArcGisMapService.js` with a new API key from the CesiumJS ArcGIS Developer account. These API keys are named like this: `1.85 Release - Delete on November 1st, 2021`. Delete the API key from the last release.
8. Proofread [`CHANGES.md`](../../../CHANGES.md) with the date of the release. Adjust the order of changes so that prominent/popular changes come first. Ensure each change is in the section for the relevant workspace.
9. Based on `CHANGES.md`, update each workspace version following the rules of [semantic versioning](https://semver.org/), e.g.,
   - `npm version minor -w @cesium/engine --no-git-tag-version`
10. Update the version in `package.json` to match, e.g. `1.115.0` -> `1.116.0`.
11. Commit these changes.
12. Make sure the repository is clean `git clean -d -x -f --exclude="/Specs/e2e/*-snapshots/"`. **This will delete all files not already in the repository, excluding end to end testing snapshots.**
13. Run `npm install`.
14. Make sure `ThirdParty.json` is up to date by running `npm run build-third-party`. If there are any changes, verify and commit them.
15. Create the release zip `npm run make-zip`.
16. Run tests against the release `npm run test -- --failTaskOnError --release`. Test **in all browsers** with the `--browsers` flag (i.e. `--browsers Firefox,Chrome`). Alternatively, test with the browser Spec Runner by starting a local server (`npm start`) and browsing to http://localhost:8080/Specs/SpecRunner.html?built=true&release=true.
17. Run end to end tests against the release with `npm run test-e2e-release`, or multiple browsers with `npm run test-e2e-release-all`.
18. Unpack the release zip to the directory of your choice and start the server by running `npm install` and then `npm start`
19. Browse to http://localhost:8080 and confirm that the home page loads as expected and all links work.
20. Verify that the [documentation](http://localhost:8080/Build/Documentation/index.html) built correctly
21. Make sure [Hello World](http://localhost:8080/Apps/HelloWorld.html) loads.
22. Make sure [Cesium Viewer](http://localhost:8080/Apps/CesiumViewer/index.html) loads.
23. Run [Sandcastle](http://localhost:8080/Apps/Sandcastle/index.html) on the browser of your choice (or multiple browsers if you are up for it). Switch to the `All` tab and spot test more complicated demos. Actually play with each of the buttons and sliders on each demo to ensure everything works as expected.
24. If any of the above steps fail, post a message to the `#cesiumjs` channel in Slack to figure out what needs to be fixed before we can release. **Do NOT proceed to the next step until issues are resolved.**
25. Push your commits to main
    - `git push`
26. Create and push a [tag](https://git-scm.com/book/en/v2/Git-Basics-Tagging), e.g.,
    - `git tag -a 1.1 -m "1.1 release"`
    - `git push origin 1.1` (this assumes origin is the primary cesium repository, do not use `git push --tags` as it pushes all tags from all remotes you have on your system.)
27. Publish the release zip file to GitHub
    - https://github.com/CesiumGS/cesium/releases/new
    - Select the tag you use pushed
    - Enter 'CesiumJS 1.xx' for the title
    - Include date, list of highlights and link to CHANGES.md (https://github.com/CesiumGS/cesium/blob/1.xx/CHANGES.md) as the description
      - Look at a [previous release](https://github.com/CesiumGS/cesium/releases/tag/1.79) for an example. Don't use emoji, headings, or other formatting
    - Attach the `Cesium-1.xx` release zip file
    - Publish the release
28. Publish to npm by running `npm publish` in the repository root (not the unzipped file directory) (the first time you do this, you will need to authorize the machine using `npm adduser`)
29. Use `npm publish -w <WORKSPACE>` in the repository root (not the unzipped file directory) to publish the workspace. Repeat this step for each **updated** workspace, in the following order:
    - `npm publish -w @cesium/engine`
    - `npm publish -w @cesium/widgets`
30. Check out the `cesium.com` branch. Merge the new release tag into the `cesium.com` branch `git merge origin <tag-name>`. CI will deploy the hosted release, Sandcastle, and the updated doc when you push the branch up.
31. After the `cesium.com` branch is live on cesium.com, comment in the `#comms-chat` slack channel to notify comms that the release is done so they can add these highlights and publish the monthly blog post
    - Note, it may take a little while for the new version of CesiumJS to be live on cesium.com (~30 minutes after the branch builds). You can check the version of Cesium in [sandcastle](https://sandcastle.cesium.com/) by looking at the tab above the cesium pane.
32. Continue to the [Cesium Analytics release](https://github.com/CesiumGS/cesium-analytics/tree/main/Documentation/ReleaseGuide)
