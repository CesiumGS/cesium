# Slang Prototype

## Prerequisites

- [Download slangc](https://github.com/shader-slang/slang/releases) and make accessible to your system (edit PATH, etc.).
- Install [SPIRV-Cross](https://github.com/KhronosGroup/SPIRV-Cross) for your specific system. On macOS, this looks like `brew install spirv-cross`

## Notes

- Cannot target GLSL 300 ES directly via Slang, only desktop GLSL.
- To solve this, we target SPIRV from the Slang.
- From SPIRV, we can create GLSL 300 ES.
- Some names and structures get mangled in a way that is not useable by CesiumJS. Therefore, a `postprocess-slang-glsl.sh` script has been created to clean up the shader output into a useable state.
- Flow: Slang -> slangc -> SPIRV -> spirv-cross -> GLSL 300 ES -> postprocess-slang-glsl.sh -> GLSL 300 ES shader useable by CesiumJS.

## Test

- Replace CESIUM_DIR with the directory of your local copy of the CesiumJS repository.
- Issue the following commands:

```bash
cd CESIUM_DIR/packages/engine/Source/Shaders/PostProcessStages
slangc Brightness.slang -profile spirv_1_5 -o Brightness.spv
spirv-cross Brightness.spv --es --version 300 --stage frag --output Brightness.frag
CESIUM_DIR/scripts/postprocess-slang-glsl.sh Brightness.frag
cp Brightness.frag Brightness.glsl
cd CESIUM_DIR
npm run build && npm run start
```

- Go to the server in your web browser. Navigate to `/Apps/Sandcastle2/index.html?id=post-processing`.
- Toggle Brightness on and move the slider back and forth. Observe that the Slang -> GLSL process worked!

## WebGPU

- See `CESIUM_DIR/packages/engine/Source/Shaders/WebGPUTest.slang`
