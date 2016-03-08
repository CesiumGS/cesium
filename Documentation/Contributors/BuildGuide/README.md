# Build Guide

* [Get the Code](#get-the-code)
* [Build the Code](#build-the-code)
* [Build Scripts](#build-scripts)

## Get the Code

* Setup Git if it isn't already ([link](https://help.github.com/articles/set-up-git/#platform-all)).
   * Make sure your SSH keys are configured ([linux](https://help.github.com/articles/generating-ssh-keys#platform-linux) | [mac](https://help.github.com/articles/generating-ssh-keys#platform-mac) | [windows](https://help.github.com/articles/generating-ssh-keys#platform-windows)).
   * Double-check your settings for name and email: `git config --get-regexp user.*`.
   * Recommended Git settings:
      * `git config --global pull.rebase preserve` - when pulling remote changes, rebase your local changes on top of the remote changes, to avoid unnecessary merge commits.
      * `git config --global fetch.prune true` - when fetching remote changes, remove any remote branches that no longer exist on the remote.
* Have commit access to cesium?
   * No
      * Fork [cesium](https://github.com/AnalyticalGraphicsInc/cesium).
      * Use the [GitHub website](https://github.com/AnalyticalGraphicsInc/cesium/branches/all) to delete all branches in your fork except `master`.
      * Clone your fork, e.g., `git clone git@github.com:yourusername/cesium.git`.
      * Make changes in a branch, e.g., `git checkout -b my-feature`.
   * Yes
      * Clone the cesium repo, e.g., `git clone git@github.com:AnalyticalGraphicsInc/cesium.git`
      * Make changes in a branch, e.g., `git checkout -b my-feature`.

## Build the Code

Prerequisites:
 * Install [Node.js](http://nodejs.org/) on your system.

Cesium uses npm modules for development, so after syncing, you need to run `npm install` from the Cesium root directory:

```
npm install
```

Once all modules have been installed, run `npm run build` to actually build the code:

```
npm run build
```

Cesium ships with a simple HTTP server for testing, run `npm start` after building to use it:

```
npm start
```

Then browse to [http://localhost:8080/](http://localhost:8080/).

By default, the server only allows connections from your local machine.  Too allow connections from other machines, pass
the `--public` option to npm. Note the extra `--` is intentional and required by npm.

```
npm start -- --public
```

The development server has a few other options as well, which you can see by pasing the `--help` parameter:

```
npm start -- --help
```

While you can use the editor of your choice to develop Cesium, certain files, such as `glsl` and new tests, require that
the `build` task be executed in order for the changes to take affect.  You can use the `build-watch` script to have this
happen automatically.

## Build Scripts

Cesium uses [gulp](http://gulpjs.com/) for build tasks, but they are all abstracted away by [npm run scripts](https://docs.npmjs.com/cli/run-script).

Specify the target(s) at the command line:

```
npm run [target-name]
```

Here's the full set of scripts and what they do.
   * `build` - A fast, developer-oriented build that prepares the source tree for use as standard [Asynchronous Module Definition (AMD)](https://github.com/amdjs/amdjs-api/wiki/AMD) modules, suitable for running tests and most examples (some Sandcastle examples require running `combine`).  This runs automatically when saving files in Eclipse.
   * `build-watch` - A never-ending task that watches your file system for changes to Cesium and runs `build` on the source code as needed. 
   * `combine` - Runs `build`, plus the [the RequireJS optimizer](http://requirejs.org/docs/optimization.html) to combine Cesium and [the Almond AMD loader](http://requirejs.org/docs/faq-optimization.html#wrap) to produce all-in-one files in the `Build/Cesium` directory that expose the entire Cesium API attached to a single global Cesium object.  This version is useful if you don't want to use the modules directly with a standard AMD loader.
   * `minify` - Runs `combine`, plus [minifies](http://en.wikipedia.org/wiki/Minification_\(programming\)) Cesium.js using [UglifyJS2](https://github.com/mishoo/UglifyJS2) for a smaller deployable file.
   * `combineRelease` - Runs `combine`, plus uses the optimizer to remove debugging code that validates function input and throws DeveloperErrors.  The removed sections are marked with `//>>includeStart('debug', pragmas.debug);` blocks in the code.
   * `minifyRelease` - Runs `minify`, and removes debugging code.
   * `requirejs` - Used internally by the build system and can not be called directly.
   * `buildApps` - Builds the example applications (such as Cesium Viewer) to produce self-contained, minified, deployable versions in the `Build` directory.
   * `generateDocumentation` - Generates HTML documentation in `Build/Documentation` using [JSDoc 3](https://github.com/jsdoc3/jsdoc).
   * `release` - A full release build that creates a shippable product, including building apps and generating documentation.
   * `instrumentForCoverage` - Runs [JSCoverage](http://siliconforks.com/jscoverage/) on the source tree to allow running tests with coverage information.  Use the link in index.html.  Currently Windows only.
   * `jsHint` - Runs [JSHint](http://www.jshint.com/) on the entire source tree.
   * `jsHint-watch` - A never-ending task that watches your file system for changes to Cesium and runs [JSHint](http://www.jshint.com/) on any changed source files.  
   * `makeZipFile` - Builds a zip file containing all release files.  This includes the source tree (suitable for use from an AMD-aware application), plus the combined and minified Cesium.js files, the generated documentation, the test suite, and the example applications (in both built and source form).
   * `clean` - Removes all generated build artifacts.
   * `cloc` - Runs [CLOC](https://github.com/AlDanial/cloc) to count the lines of code on the Source and Specs directories.  This requires [Perl](http://www.perl.org/) to execute.
   * `sortRequires` - Alphabetically sorts the list of required modules in every `js` file.  It also makes sure that the top of every source file uses the same formatting.
   * `test` - Runs all tests with [Karma](http://karma-runner.github.io/0.13/index.html) using the default browser specified in the Karma config file.
   * `test-all` - Runs all tests with [Karma](http://karma-runner.github.io/0.13/index.html) using all browsers installed on the current system.
   * `test-non-webgl` - Runs only non-WebGL tests with [Karma](http://karma-runner.github.io/0.13/index.html).
   * `test-webgl` - Runs only WebGL tests with [Karma](http://karma-runner.github.io/0.13/index.html).
   * `test-webgl-validation` - Runs all tests with [Karma](http://karma-runner.github.io/0.13/index.html) and enables low-level WebGL validation.
   * `test-release` - Runs all tests with [Karma](http://karma-runner.github.io/0.13/index.html) on the minified release version of built Cesium.
