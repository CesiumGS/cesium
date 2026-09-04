# basis_transcoder build

Cesium uses a vendored build of the
[Basis Universal](https://github.com/BinomialLLC/basis_universal) transcoder.
The current upstream build still uses Emscripten runtime code generation, which
requires `'unsafe-eval'` under a strict Content Security Policy.

Cesium builds the JavaScript wrapper with:

```text
-s DYNAMIC_EXECUTION=0
```

This disables Emscripten's runtime JavaScript generation while preserving the
transcoder's behavior. It allows KTX2 transcoding to run in a worker with
`'wasm-unsafe-eval'` instead of the broader `'unsafe-eval'` permission.

An upstream fix has been requested in
[issue #13617](https://github.com/CesiumGS/cesium/issues/13617). Until an
upstream build includes the equivalent setting, keep this flag when rebuilding
the vendored JavaScript wrapper. The existing `basis_transcoder.wasm` file
should not be replaced as part of this change.

## Reproducing

Use the pinned Basis Universal source revision and Emscripten toolchain:

```sh
git clone --branch v1_15_update2 --depth 1 \
  https://github.com/BinomialLLC/basis_universal.git
cd basis_universal/webgl/transcoder
mkdir -p build && cd build

docker run --rm -v "$PWD/../../..":/src -w /src/webgl/transcoder/build \
  emscripten/emsdk:2.0.17 bash -c \
  'emcmake cmake -DCMAKE_EXE_LINKER_FLAGS="-s DYNAMIC_EXECUTION=0" .. && make -j2'
```

Copy the generated `basis_transcoder.js` into this directory. Do not replace
the existing `.wasm` file.

Verify that the generated wrapper contains no runtime code generation:

```sh
grep -c 'new Function(' basis_transcoder.js
```
