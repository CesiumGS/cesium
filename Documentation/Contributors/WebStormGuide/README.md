# WebStorm Guide

Install [WebStorm](https://www.jetbrains.com/webstorm/).

While it's a commercial IDE, it's pretty cheap and there's a 30-day free trial.

WebStorm requires very little configuration out of the box.  Just browse to and open the WebStorm project included with Cesium.  Most things a Web Developer would want are built-in.  Whenever you open a file that has a plugin available, such as `md`, `glsl`, or `.gitignore`, WebStorm will ask if you want to install it.  Simply say yes and off you go.  While most of us still use `git` on the command-line, WebStorm includes excellent tools for merging, diffing, and managing branches as well.

### Gulp Integration

Cesium's build scripts use gulp.  WebStorm has excellent gulp integration for running tasks from the IDE.  Just right-click on `gulpfile.js` in the Project tree and select `Show Gulp Tasks`, now you can double click on any task to run it.  Even better, perpetual tasks like `build-watch` and `jsHint-watch`
will get their own output tab that automatically updates.

### WebStorm Plugins

[Jump Source Spec](https://github.com/AnalyticalGraphicsInc/cesium-webstorm-plugin) is a plugin that allows users to easily jump between source and spec files.

### WebStorm Shortcuts

* `Ctrl-Shift-A` - search for settings, shortcuts, or anything else you want to do.
* `Ctrl-Shift-N` - search and open files in the workspace.
* `Ctrl-ALT-L` - auto-format an entire file or the selected block of code.
* `Ctrl-Shift-F` - bring up the global find dialog.
* `ALT-Shift-K` - jump between source and spec file.
