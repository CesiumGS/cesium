We love pull requests.  We strive to promptly review them, provide feedback, and merge.  This document describes how to get yours merged quickly.

## License

We use the [Apache 2.0 License](LICENSE.md).  Before we can merge a pull request, we require a signed Contributor License Agreement.  This can be emailed to cla@agi.com, and only needs to be completed once.  The CLA ensures you retain copyright to your contributions, and we have the right to use them and incorporate them into Cesium.  There is a CLA for:

* [individuals](http://www.agi.com/licenses/individual-cla-agi-v1.0.txt) and 
* [corporations](http://www.agi.com/licenses/corporate-cla-agi-v1.0.txt).

Please email a completed CLA with all fields filled in to [cla@agi.com](mailto:cla@agi.com).  Related questions are also welcome.

## Development Best Practices

To keep our code quality high, please make sure:
* Your code follows the [coding conventions](https://github.com/AnalyticalGraphicsInc/cesium/wiki/JavaScript-Coding-Conventions).
* Your code passes [JSHint](http://www.jshint.com/).  We use the JSHint Eclipse plugin so it runs automatically when we save.  You can also run the `jsHint` Ant task from the command line.
* To include tests with excellent code coverage for new features.  We use [Jasmine](http://pivotal.github.com/jasmine/) for writing tests.  Run them by browsing to [http://localhost:8080/Specs/SpecRunner.html](http://localhost:8080/Specs/SpecRunner.html).  Verify all new and existing tests pass.  For bonus points, test Chrome, Firefox, and other browsers supporting WebGL.
* To update [LICENSE.md](LICENSE.md) if third-party libraries were added/updated/removed, including new version of existing libraries.  Mention it in [CHANGES.md](CHANGES.md).

If new public classes, functions, or properties were added, also:
   * Include reference documentation with code examples.  Check out the [best practices](https://github.com/AnalyticalGraphicsInc/cesium/wiki/Documentation-Best-Practices).
   * Update [CHANGES.md](CHANGES.md).
   * If the change is significant, add a new [Sandcastle](http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html) example or extend and existing one.

## Resources

See the [Contributor's Guide](https://github.com/AnalyticalGraphicsInc/cesium/wiki/Contributor%27s-Guide) for how to get the code and setup a development environment, and see [CONTRIBUTORS.md](CONTRIBUTORS.md) for the current list of contributors.
