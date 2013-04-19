This document describes how we merge pull requests.  See the [Contributor's Guide](https://github.com/AnalyticalGraphicsInc/cesium/wiki/Contributor%27s-Guide) for how to get the code and setup a development environment, and see [CONTRIBUTORS.md](CONTRIBUTORS.md) for the current list of contributors.

## License

We love pull requests.  We promptly [review](https://github.com/AnalyticalGraphicsInc/cesium/wiki/Code-Review-Tips) them, provide feedback, and merge.  We use the [Apache 2.0 License](LICENSE.md).  Before we can merge a pull request, we require either:

* A signed [Contributor License Agreement](http://producingoss.com/en/copyright-assignment.html#copyright-assignment-cla) (CLA).  This can be emailed to cla@agi.com, and only needs to be completed once.  The CLA ensures you retain copyright to your contributions, and we have the right to use them and incorporate them into Cesium.  There is a CLA for [individuals](http://www.agi.com/licenses/individual-cla-agi-v1.0.txt) and [corporations](http://www.agi.com/licenses/corporate-cla-agi-v1.0.txt).  Please email completed CLAs and related questions to [cla@agi.com](mailto:cla@agi.com).

or

* Every commit is signed-off on to indicate agreement to the Developer Certificate of Origin (DCO).  The DCO was originally developed for the Linux kernel, and its text is here: [SubmittingPatches](https://github.com/wking/signed-off-by/blob/ab5bce80ad2259b47202b28905efff0d04032709/Documentation/SubmittingPatches).  Like the CLA, you retain copyright to your contributions, and we have the right to use them and incorporate them into Cesium.  A commit with a sign-off has a line like the following at the bottom:

```
Signed-off-by: First-name Last-name <email-address>
```

To sign-off on commits, first make sure your name and email are setup with git:

```
git config --global --add user.name "First-name Last-name"
git config --global --add user.email "email-address"
```

Then include the `-s` option with every commit, e.g.,

```
git commit -s -m 'commit message as usual`
```

## Development Best Practices

To keep our code quality high, please make sure:
* Your code follows the [coding conventions](https://github.com/AnalyticalGraphicsInc/cesium/wiki/JavaScript-Coding-Conventions).
* Your code passes [JSHint](http://www.jshint.com/).  We use the JSHint Eclipse plugin so it runs automatically when we save.  You can also run the `jsHint` Ant task from the command line.
* To include tests with excellent code coverage for new features.  We use [Jasmine](http://pivotal.github.com/jasmine/) for writing tests.  Run them by browsing to [http://localhost:8080/Specs/SpecRunner.html](http://localhost:8080/Specs/SpecRunner.html).  Verify all new and existing tests pass.  For bonus points, test Chrome, Firefox, and other browsers supporting WebGL.
* To update [LICENSE.md](LICENSE.md) if third-party libraries were added/updated/removed, including new version of existing libraries.  Mention it in [CHANGES.md](CHANGES.md).

If new public classes, functions, or properties were added, also:
   * Include reference documentation with code examples.  Check out the [best practices](https://github.com/AnalyticalGraphicsInc/cesium/wiki/Documentation-Best-Practices).
   * Update [CHANGES.md](CHANGES.md).
   * If the change is significant, add a new [Sandcastle](http://cesium.agi.com/Cesium/Apps/Sandcastle/index.html) example or extend and existing one.
