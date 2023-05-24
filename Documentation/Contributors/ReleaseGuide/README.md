# Release Guide

We release Cesium on the first work day of every month. [This file](../../../.slackbot.yml) outlines the release schedule and the developer responsible for each month's release.

There is no release manager; instead, our community shares the responsibility. Any committer can create the release for a given month, and at any point, they can pass the responsibility to someone else, or someone else can ask for it. This spreads knowledge, avoids stratification, avoids a single point of failure, and is beautifully unstructured ([more info](https://community.cesium.com/t/cesium-releases/45)).

## One week before release

1. Check for any outdated dependencies with `npm outdated`.
2. If one or more dependencies are outdated, checkout a new branch and run `npm install <packagename>@latest` for each package to increment the version.
3. Verify each update. If an update can be resolved, open a PR with your changes. If an update is incompatable, open an issue.
4. Check the [`priority - next release` issues](https://github.com/CesiumGS/cesium/issues?q=is%3Aopen+is%3Aissue+label%3A%22priority+-+next+release%22) and [`priority - next release` pull requests](https://github.com/CesiumGS/cesium/pulls?q=is%3Apr+is%3Aopen+label%3A"priority+-+next+release"). If there are any outstanding items, post a message to the `#cesiumjs` channel in Slack to figure out what needs to be addressed before we can release.
5. Merge [`cesium` to `cesium-analytics`](https://github.com/CesiumGS/cesium-analytics/wiki/Merging-between-Cesium-Analytics-and-CesiumJS) and address any conflicts. Doing this before the release helps detect problems sooner.

## Release testing and packaging

**Follow these instructions exactly. Do not switch branches or otherwise manipulate your local clone at any point in the process unless instructed to do so. If you need to switch branches for whatever reason, you must start the entire process over again.**

1. Verify there are no [`priority - next release` issues](https://github.com/CesiumGS/cesium/issues?q=is%3Aopen+is%3Aissue+label%3A%22priority+-+next+release%22) or [`priority - next release` pull requests](https://github.com/CesiumGS/cesium/pulls?q=is%3Apr+is%3Aopen+label%3A"priority+-+next+release").
2. Verify there are no [`remove in [this version number]` issues](https://github.com/CesiumGS/cesium/labels). Delete the label. Create a new label with the next highest `remove in [version]` relative to the existing labels.
3. Make sure you are using the latest drivers for your video card.
4. Pull down the latest `main` branch and run `npm install`.
5. Update the Cesium ion demo token in `Ion.js` with a new token from the CesiumJS ion team account with read and geocode permissions. These tokens are named like this: `1.85 Release - Delete on November 1st, 2021`. Delete the token from 2 releases ago.
6. Update the ArcGIS Developer API key in `ArcGisMapService.js` with a new API key from the CesiumJS ArcGIS Developer account. These API keys are named like this: `1.85 Release - Delete on November 1st, 2021`. Delete the API key from 2 releases ago.
7. Update the Google Maps Platform API key in `GoogleMaps.js` with a new API key from Cesium's Google Cloud Console. These API keys are named like this: `CesiumJS 1.85 Release - Delete on November 1st, 2021`. Ensure the new key is restricted to the Map Tiles API. Delete the API key from 2 releases ago.
8. Proofread [`CHANGES.md`](../../../CHANGES.md) with the date of the release. Adjust the order of changes so that prominent/popular changes come first. Ensure each change is in the section for the relevant workspace.
9. Based on `CHANGES.md`, update each workspace version following the rules of [semantic versioning](https://semver.org/), e.g.,
   - `npm version minor -w @cesium/engine --no-git-tag-version`
10. Update the version in `package.json` to match, e.g. `1.14.0` -> `1.15.0`.
11. Commit these changes.
12. Make sure the repository is clean `git clean -d -x -f`. **This will delete all files not already in the repository.**
13. Run `npm install`.
14. Make sure `ThirdParty.json` is up to date by running `npm run build-third-party`. If there are any changes, verify and commit them.
15. Create the release zip `npm run make-zip`.
16. Run tests against the release `npm run test -- --failTaskOnError --release`. Test **in all browsers** with the `--browsers` flag (i.e. `--browsers Firefox,Chrome`). Alternatively, test with the browser Spec Runner by starting a local server (`npm start`) and browsing to http://localhost:8080/Specs/SpecRunner.html?built=true&release=true.
17. Unpack the release zip to the directory of your choice and start the server by running `npm install` and then `npm start`
18. Browse to http://localhost:8080 and confirm that the home page loads as expected and all links work.
19. Verify that the [documentation](http://localhost:8080/Build/Documentation/index.html) built correctly
20. Make sure [Hello World](http://localhost:8080/Apps/HelloWorld.html) loads.
21. Make sure [Cesium Viewer](http://localhost:8080/Apps/CesiumViewer/index.html) loads.
22. Run [Sandcastle](http://localhost:8080/Apps/Sandcastle/index.html) on the browser of your choice (or multiple browsers if you are up for it). Switch to the `All` tab and run through every demo to make sure they all work. Actually play with each of the buttons and sliders on each demo to ensure everything works as expected.
23. If any of the above steps fail, post a message to the `#cesiumjs` channel in Slack to figure out what needs to be fixed before we can release. **Do NOT proceed to the next step until issues are resolved.**
24. Push your commits to main
    - `git push`
25. Create and push a [tag](https://git-scm.com/book/en/v2/Git-Basics-Tagging), e.g.,
    - `git tag -a 1.1 -m "1.1 release"`
    - `git push origin 1.1` (this assumes origin is the primary cesium repository, do not use `git push --tags` as it pushes all tags from all remotes you have on your system.)
26. Publish the release zip file to GitHub
    - https://github.com/CesiumGS/cesium/releases/new
    - Select the tag you use pushed
    - Enter 'CesiumJS 1.xx' for the title
    - Include date, list of highlights and link to CHANGES.md (https://github.com/CesiumGS/cesium/blob/1.xx/CHANGES.md) as the description
      - Look at a [previous release](https://github.com/CesiumGS/cesium/releases/tag/1.79) for an example. Don't use emoji, headings, or other formatting
    - Attach the `Cesium-1.xx` release zip file
    - Publish the release
27. Publish to npm by running `npm publish` in the repository root (not the unzipped file directory) (the first time you do this, you will need to authorize the machine using `npm adduser`)
28. Use `npm publish -w <WORKSPACE>` in the repository root (not the unzipped file directory) to publish the workspace. Repeat this step for each **updated** workspace, in the following order:
    - `npm publish -w @cesium/engine`
    - `npm publish -w @cesium/widgets`
29. Check out the `cesium.com` branch. Merge the new release tag into the `cesium.com` branch `git merge origin <tag-name>`. CI will deploy the hosted release, Sandcastle, and the updated doc when you push the branch up.
30. After the `cesium.com` branch is live on cesium.com, comment in the `#comms-chat` slack channel to notify comms that the release is done so they can add these highlights and publish the monthly blog post
    - Note, it may take a little while for the new version of CesiumJS to be live on cesium.com (~30 minutes after the branch builds). You can check the version of Cesium in [sandcastle](https://sandcastle.cesium.com/) by looking at the tab above the cesium pane.
31. Update the version of CesiumJS used in the Cesium Workshop: https://github.com/CesiumGS/cesium-workshop/blob/main/index.html#L13-L14
32. Continue to the [Cesium Analytics release](https://github.com/CesiumGS/cesium-analytics/blob/main/Documentation/Contributors/AnalyticsReleaseGuide/README.md)
