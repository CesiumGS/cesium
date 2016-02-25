(Delete these instructions before hitting **Create**.)

Thanks for contributing to Cesium!

Please review the [instructions for opening a pull request](.github/CONTRIBUTING.md#opening-a-pull-request).  In particular:
* If this is your first contribution to Cesium:
   * Please submit a [Contributor License Agreement (CLA)](.github/CONTRIBUTING.md#contributor-license-agreement-cla).
   * Add your name to [CONTRIBUTORS.md](https://github.com/AnalyticalGraphicsInc/cesium/blob/master/CONTRIBUTORS.md).
* **Pull request tips**
   * If your pull request fixes an existing issue, include a link to the issue in the description (like this: [#1](https://github.com/AnalyticalGraphicsInc/cesium/issues/1)).  Likewise, if your pull request fixes an issue reported on the Cesium forum, include a link to the thread.
   * If your pull request needs additional work, include a [task list](https://github.com/blog/1375%0A-task-lists-in-gfm-issues-pulls-comments).
   * Once you are done making new commits to address feedback, add a comment to the pull request such as `"this is ready"` since GitHub doesn't notify us about commits.
* **Code and tests**
   * Verify that your code follows the [Coding Guide](Documentation/Contributors/CodingGuide/README.md).
   * Verify your code passes JSHint.  Run JSHint for all of Cesium with `npm run jsHint` or automatically run JSHint when files are saved with `npm run jsHint-watch`.  See the [Build Guide](Documentation/Contributors/BuildGuide/README.md).
   * Verify that all tests pass, and write new tests with excellent code coverage for new code.  Follow the [Testing Guide](Documentation/Contributors/TestingGuide/README.md).
   * If you added new identifiers to the Cesium API:
      * Update [CHANGES.md](CHANGES.md).
      * Include reference documentation with code examples.  Follow the [Documentation Guide](Documentation/Contributors/DocumentationGuide/README.md).
      * If the change is significant, add a new [Sandcastle](http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html) example or extend and existing one.
   * If you added third-party libraries, including new version of existing libraries, update [LICENSE.md](LICENSE.md).  Mention it in [CHANGES.md](CHANGES.md).  If you plan to add a third-party library, start a new thread on the [Cesium forum](http://cesiumjs.org/forum.html) first.

