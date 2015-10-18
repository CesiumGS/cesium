We love pull requests.  We strive to promptly review them, provide feedback, and merge.  Interest in Cesium is at an all time high so the core team is busy.  Following the tips in this guide will help your pull request get merged quickly.

> If you plan to make a major change, please start a new thread on the [Cesium forum](http://cesiumjs.org/forum.html) first.  Pull requests for small features and bug fixes can generally just be opened without discussion on the forum.

## Contributor License Agreement (CLA)

Before we can merge a pull request, we require a signed Contributor License Agreement.  There is a CLA for:

* [individuals](http://www.agi.com/licenses/individual-cla-agi-v1.0.txt) and 
* [corporations](http://www.agi.com/licenses/corporate-cla-agi-v1.0.txt).

This only needs to be completed once.  The CLA ensures you retain copyright to your contributions, and we have the right to use them and incorporate them into Cesium using the [Apache 2.0 License](LICENSE.md).

Please email a completed CLA with all fields filled in to [cla@agi.com](mailto:cla@agi.com).  Related questions are also welcome.

## Pull Request Guidelines

Our code is our lifeblood so maintaining Cesium's high code quality is important to us.

* If this is your first contribution to Cesium, add your name to [CONTRIBUTORS.md](https://github.com/AnalyticalGraphicsInc/cesium/blob/master/CONTRIBUTORS.md).
* Pull request tips
   * If your pull request fixes an existing issue, include a link to the issue in the description (like this: [#1](https://github.com/AnalyticalGraphicsInc/cesium/issues/1)).  Likewise, if your pull request fixes an issue reported on the Cesium forum, include a link to the thread.
   * If your pull request needs additional work, include a [task list](https://github.com/blog/1375%0A-task-lists-in-gfm-issues-pulls-comments).
   * Once you are done making new commits to address feedback, add a comment to the pull request such as `"this is ready"` since GitHub doesn't notify us about commits.
* Code and tests
   * Follow the [coding conventions](https://github.com/AnalyticalGraphicsInc/cesium/wiki/JavaScript-Coding-Conventions).
   * Verify your code passes [JSHint](http://www.jshint.com/).  We use the JSHint Eclipse plugin so it runs automatically when we save.  You can also run the `jsHint` Ant task from the command line (`./Tools/apache-ant-1.8.2/bin/ant jsHint`).
   * Include tests with excellent code coverage for new features.  We use [Jasmine](http://pivotal.github.com/jasmine/) for writing tests.  Run them by browsing to [http://localhost:8080/Specs/SpecRunner.html](http://localhost:8080/Specs/SpecRunner.html).  Verify all new and existing tests pass.  For bonus points, test Chrome, Firefox, and other browsers supporting WebGL.
   * Update [LICENSE.md](LICENSE.md) if third-party libraries were added/updated/removed, including new version of existing libraries.  Mention it in [CHANGES.md](CHANGES.md).  If you plan to add a third-party library, start a new thread on the [Cesium forum](http://cesiumjs.org/forum.html) first.
   * If new public classes, functions, or properties were added, also:
      * Include reference documentation with code examples.  Check out the [best practices](https://github.com/AnalyticalGraphicsInc/cesium/wiki/Documentation-Best-Practices).
      * Update [CHANGES.md](CHANGES.md).
      * If the change is significant, add a new [Sandcastle](http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html) example or extend and existing one.

## Resources

See the [Contributor's Guide](https://github.com/AnalyticalGraphicsInc/cesium/wiki/Contributor%27s-Guide) for how to get the code and setup a development environment.
