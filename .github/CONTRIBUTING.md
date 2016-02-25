Thanks for contributing to Cesium.  You rock!  Are you

* [submitting an issue](#submitting-an-issue),
* [getting started contributing](#getting-started-contributing), or
* [opening a pull request](#opening-a-pull-request)?

# Submitting an Issue

When you [submit a new issue](https://github.com/AnalyticalGraphicsInc/cesium/issues/new), the issue's comment are initialized with instructions.

# Getting Started Contributing

Everyone is welcome to contribute to Cesium!

In addition to contributing core Cesium code, we appreciate many types of contributions:

* Being active on the [Cesium forum](http://cesiumjs.org/forum.html) by answering questions and providing input on Cesium's direction.
* Showcasing your Cesium apps on the [demos page](http://cesiumjs.org/demos.html) or writing a guest post blog on the [Cesium blog](http://cesiumjs.org/blog.html).  To do either, contact [Sarah Chow](http://cesiumjs.org/team/SarahChow.html), schow@agi.com.
* Writing tutorials, creating examples, and improving the reference documentation.  See the issues labeled [doc](https://github.com/AnalyticalGraphicsInc/cesium/labels/doc).
* Submitting issues as [described above](#submitting-an-issue).
* Triaging issues.  Browse the [issues](https://github.com/AnalyticalGraphicsInc/cesium/issues) and comment on issues that are no longer reproducible or on issues which you have additional information.
* Creating ecosystem projects for [glTF](https://github.com/KhronosGroup/glTF/issues/456), [CZML](https://github.com/AnalyticalGraphicsInc/cesium/wiki/CZML-Guide), and [3D Tiles](https://github.com/AnalyticalGraphicsInc/3d-tiles).

For ideas for Cesium code contributions, see:

* issues labeled [beginner](https://github.com/AnalyticalGraphicsInc/cesium/labels/beginner) and
* issues labeled [roadmap](https://github.com/AnalyticalGraphicsInc/cesium/labels/roadmap).

See the [Build Guide](Documentation/Contributors/BuildGuide/README.md) for how to build and run Cesium on your system.

Always feel free to introduce yourself on the [Cesium forum](http://cesiumjs.org/forum.html) to brainstorm ideas and ask for guidance.

# Opening a Pull Request

We love pull requests.  We strive to promptly review them, provide feedback, and merge.  Interest in Cesium is at an all-time high so the core team is busy.  Following the tips in this guide will help your pull request get merged quickly.

> If you plan to make a major change, please start a new thread on the [Cesium forum](http://cesiumjs.org/forum.html) first.  Pull requests for small features and bug fixes can generally just be opened without discussion on the forum.

## Contributor License Agreement (CLA)

Before we can merge a pull request, we require a signed Contributor License Agreement.  There is a CLA for:

* [individuals](http://www.agi.com/licenses/individual-cla-agi-v1.0.txt) and 
* [corporations](http://www.agi.com/licenses/corporate-cla-agi-v1.0.txt).

This only needs to be completed once.  The CLA ensures you retain copyright to your contributions, and we have the right to use them and incorporate them into Cesium using the [Apache 2.0 License](LICENSE.md).

Please email a completed CLA with all fields filled in to [cla@agi.com](mailto:cla@agi.com).  Related questions are also welcome.

## Pull Request Guidelines

Our code is our lifeblood so maintaining Cesium's high code quality is important to us.

* Review the [Contributor Guides](Documentation/Contributors/README.md).  In addition to Cesium-specific topics, they contain a lot of general software development best practices.
* If this is your first contribution to Cesium, add your name to [CONTRIBUTORS.md](https://github.com/AnalyticalGraphicsInc/cesium/blob/master/CONTRIBUTORS.md).
* **Pull request tips**
   * If your pull request fixes an existing issue, include a link to the issue in the description (like this: [#1](https://github.com/AnalyticalGraphicsInc/cesium/issues/1)).  Likewise, if your pull request fixes an issue reported on the Cesium forum, include a link to the thread.
   * If your pull request needs additional work, include a [task list](https://github.com/blog/1375%0A-task-lists-in-gfm-issues-pulls-comments).
   * Once you are done making new commits to address feedback, add a comment to the pull request such as `"this is ready"` since GitHub doesn't notify us about commits.
* **Code and tests**
   * Follow the [Coding Guide](Documentation/Contributors/CodingGuide/README.md).
   * Verify your code passes [JSHint](http://www.jshint.com/).  Run JSHint for all of Cesium with `npm run jsHint` or automatically run JSHint when files are saved with `npm run jsHint-watch`.  See the [Build Guide](Documentation/Contributors/BuildGuide/README.md).
   * Verify that all tests pass, and write new tests with excellent code coverage for new code.  Follow the [Testing Guide](Documentation/Contributors/TestingGuide/README.md).
   * If you added new identifiers to the Cesium API:
      * Update [CHANGES.md](CHANGES.md).
      * Include reference documentation with code examples.  Follow the [Documentation Guide](Documentation/Contributors/DocumentationGuide/README.md).
      * If the change is significant, add a new [Sandcastle](http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html) example or extend and existing one.
   * If you added third-party libraries, including new version of existing libraries, update [LICENSE.md](LICENSE.md).  Mention it in [CHANGES.md](CHANGES.md).  If you plan to add a third-party library, start a new thread on the [Cesium forum](http://cesiumjs.org/forum.html) first.

Don't worry if the above guidelines are a lot to remember, when you create a pull request, the comment is initialized with the above pull request guidelines as a reminder.