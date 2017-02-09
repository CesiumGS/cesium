# VSCode Guide

1. Install [VSCode](https://code.visualstudio.com/).

2. Click `File -> Open Folder...` and open the Cesium root folder.

## Shell Integration (optional)

VSCode has an integrated shell, exposed on Windows by pressing CTRL-\` (CTRL-backtick).
You may want to switch this to be a git bash shell by default.  If so, click
File -> Preferences -> Settings... and enter `integrated.shell` into the search
box.  Choose the appropriate key for your operating system, for example
`terminal.integrated.shell.windows` for Windows, and click the edit icon.
The default setting will be copied to your user settings.  The default for
Windows is `"C:\\Windows\\system32\\cmd.exe"`.  Change this to point to your
git bash install.  For example:

```
{
    "terminal.integrated.shell.windows": "C:\\Program Files\\Git\\bin\\bash.exe"
}
```

Note that on Windows, the git bash desktop icon points at a different exe file,
one that forces a separate (non-integrated) window to pop open outside of VSCode.
Make sure you are pointed at the correct exe as shown above, with Git 2.0.0 or
higher installed, to get the correct integrated shell behavior.

## VSCode Plugins (mostly optional)

Click on the extensions icon, or press CTRL-SHIFT-X to see the list of installed
VSCode extensions.  While we don't officially endorse any particular 3rd-party
plugin, there are some that appear to be quite useful to Cesium.  Just enter
the desired plugin name in the search box and click install.  You will need to
restart VSCode after you are done installing plugins.

* **jshint** by Dirk Baeumer -- This plugin picks up on Cesium's own jsHint settings,
and will warn of any violations.  The Cesium main repository should pass jsHint
using the Cesium jsHint settings with no warnings and no errors.  Proposed
contributions to Cesium that introduce jsHint warnings will need to be corrected
before they are accepted.

* **Shader languages support for VS Code** by slevesque -- This plugin provides
syntax highlighting for Cesium's shader code.

* **Prettify JSON** by Mohsen Azimi -- This seems generally useful.

## VSCode Tasks and Files

You can launch any of Cesium's npm tasks from within VSCode by pressing
CTRL-P and typing `task ` (with a trailing space).  Autocomplete will
offer the list of npm tasks for you to run.

You can also jump to any source file with the same CTRL-P keypress
followed by the name of the file.

## Building Cesium

Cesium has a number of GLSL shaders and auto-generated files that must be
built before Cesium can be used.  The simplest way in VSCode is to type
`CTRL-P` `task build` to trigger a build.

There is also a `task build-watch`, but this leaves a little spinner running
in the status bar at the bottom, so is not recommended.  Instead, you can use
the integrated shell (CTRL-backtick) and type `npm run build-watch` to start
the build watcher task, then use CTRL-SHIFT-backtick to open up an additional
integrated shell that is available for separate commands while the build watcher
task is still running.  Keep in mind that this will quietly terminate when
you quit VSCode, so should be restarted manually on next launch.

