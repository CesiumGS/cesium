# Updating the Draco JavaScript Decoder Module

We use a custom build of the [Draco](https://github.com/google/draco) decoder JavaScript module to allow for IE11 compatibility.

1. Download and install a make tool.
   - Preferably, use Linux or [the Linux Subsystem for Windows 10](https://docs.microsoft.com/en-us/windows/wsl/install-win10) and `make` to build.
   - Optionally, [MSYS2](http://www.msys2.org/). Follow installation instructions and add the path to MSYS2's usr/bin to your `PATH`. For example, if the path is `C:\msys64\usr\bin`, run `PATH=%PATH%;C:\msys64\usr\bin`.
2. Download (or checkout the tag of) an official [Draco release](https://github.com/google/draco/releases).
3. [Download and install Emscripten](https://kripken.github.io/emscripten-site/docs/getting_started/downloads.html)
4. In a seperate directory, follow the [CMake JavaScript Encoder/Decoder Instructions](https://github.com/google/draco#javascript-encoderdecoder). When running cmake, specify `"Unix Makefiles"` as the target, and including the flag `-DIE_COMPATIBLE=true`, ie.

   ```terminal
   cmake ..\path\to\draco -G "Unix Makefiles" -DCMAKE_TOOLCHAIN_FILE="absolute\path\emscripten\cmake\Modules\Platforms\Emscripten.cmake" -DIE_COMPATIBLE=true
   ```

5. In that directory, build with `make -j`.
6. Copy the output `draco_decoder.js` file to the `Source\ThirdParty\Workers` directory.
