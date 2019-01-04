# VSCode Guide

1. Install [VSCode](https://code.visualstudio.com/).

2. If you haven't already, install `gulp-cli` globally, with
`npm install -g gulp-cli` from a bash prompt.  This does not require
administrative rights, and places a `gulp` shim into your path that will
invoke a copy of gulp from the local project folder.  This is needed for
VSCode's build tasks to work with CesiumJS.

3. Click `File -> Open Folder...` and open the CesiumJS root folder.

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

## VSCode Extensions (mostly optional)

Click on the extensions icon, or press CTRL-SHIFT-X to see the list of installed
VSCode extensions.  While we don't officially endorse any particular 3rd-party
extension, there are some that appear to be quite useful to CesiumJS.  Just enter
the desired extension name in the search box and click install.  You will need to
restart VSCode after you are done installing extensions.

* **[eslint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)**
by Dirk Baeumer -- This extension picks up on CesiumJS's own eslint settings,
and will warn of any violations.  The CesiumJS main repository should pass eslint
using the CesiumJS eslint settings with no warnings and no errors.  Proposed
contributions to CesiumJS that introduce eslint warnings will need to be corrected
before they are accepted.

* **[Shader languages support for VS Code](https://marketplace.visualstudio.com/items?itemName=slevesque.shader)**
by slevesque -- This extension provides syntax highlighting for CesiumJS's shader code.

* **[glTF Extension for VS Code](https://marketplace.visualstudio.com/items?itemName=cesium.gltf-vscode)**
by CesiumJS.org -- This extension adds features for previewing and editing 3D models in glTF files.

## VSCode Tasks and Files

You can launch any of CesiumJS's npm tasks from within VSCode by pressing
CTRL-P and typing `task ` (with a trailing space).  Autocomplete will
offer the list of npm tasks for you to run.  The first time you do this,
allow a moment for it to read the available tasks from the gulpfile.

You can also jump to any source file with the same CTRL-P keypress
followed by the name of the file.

## Building CesiumJS

CesiumJS has a number of GLSL shaders and auto-generated files that must be
built before CesiumJS can be used.  The simplest way in VSCode is to type
`CTRL-P` `task build` to trigger a single build.

You can also start the build watcher with `CTRL-P` `task build-watch`.  This
leaves a watcher running until you exit VSCode, that will automatically
update any shaders or auto-generated files to reflect changes to CesiumJS as
you save them.

Keep in mind that `build-watch` will quietly terminate when
you quit VSCode, so should be restarted manually on next launch.
