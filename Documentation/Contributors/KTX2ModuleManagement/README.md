## Updating the KTX2 Transcoder Module

We use a custom build of the `msc_basis_transcoder` tool in Khronos's [KTX-Software](https://github.com/KhronosGroup/KTX-Software/) project to allow for IE11 compatability.

Updating the transcoder requires building both the web assembly version and Javascript fallback.

These directions were written against https://github.com/KhronosGroup/KTX-Software/commit/78790b5ea9c9f432a8e877fbc8cfd977617bb775.

### Web Assembly Build

Follow the instructions at https://github.com/KhronosGroup/KTX-Software/blob/master/BUILDING.md#webemscripten.

You will need a make tool as well as emscripten.

- Preferably, use Linux or [the Linux Subsystem for Windows 10](https://docs.microsoft.com/en-us/windows/wsl/install-win10) and `make` to build.
- Optionally, [MSYS2](http://www.msys2.org/). Follow installation instructions and add the path to MSYS2's usr/bin to your `PATH`. For example, if the path is `C:\msys64\usr\bin`, run `PATH=%PATH%;C:\msys64\usr\bin`.

### Javascript fallback build

As of this writing, `KTX-Software` does not provide an official configuration parameter for configuring the build to Javascript/asm.js instead of web assembly. An issue is open here: https://github.com/KhronosGroup/KTX-Software/issues/332

You will need to edit the project's `CMakeLists.txt` to include the required configuration flags.

1. Make a separate build directory for the Javascript fallback.
2. in `KTX-Software/CMakeLists.txt`, locate the variable `KTX_EMC_LINK_FLAGS`
3. add emscripten flags `WASM=0`, `LEGACY_VM_SUPPORT=1`, and `--memory-init-file 0`, ie.

```
set(
    KTX_EMC_LINK_FLAGS
    --bind
    "SHELL:--source-map-base ./"
    "SHELL:-s ALLOW_MEMORY_GROWTH=1"
    "SHELL:-s ASSERTIONS=0"
    "SHELL:-s MALLOC=emmalloc"
    "SHELL:-s MODULARIZE=1"
    "SHELL:-s FULL_ES3=1"
    "SHELL:-s WASM=0" # for asm.js
    "SHELL:-s LEGACY_VM_SUPPORT=1" # for asm.js
    "SHELL: --memory-init-file 0" # for asm.js
)
```

4. Configure and build in the new directory. Be aware that the directions in the `KTX-Software` assume directory names, make sure to use the new directory, ie.

```bash
cd path/to/new/build/dir && cmake .. -G "Unix Makefiles" -DCMAKE_TOOLCHAIN_FILE="path/to/emsdk/Emscripten.cmake" && cmake --build
```

### Adding to Cesium

Note that both builds will produce a file called `msc_basis_transcoder.js`. Rename the web assembly version (the smaller file with a corresponding `msc_basis_transcoder.wasm`) before placing both in `Source/ThirdParty/Workers`.

Place `msc_basis_transcoder.wasm` in `Source/ThirdParty`.
