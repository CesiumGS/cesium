import * as Cesium from "cesium";

// Create Cesium Viewer
const viewer = new Cesium.Viewer("cesiumContainer");

// Check WebGPU support
if (!navigator.gpu) {
  alert("WebGPU not supported");
} else {
  // Create an advanced WebGPU post-process stage with true post-processing
  const advancedStage = new Cesium.WebGPUPostProcessStageAdvance({
    viewer: viewer,
    name: "RedChannelOnly",
    fragmentShader: `
      @group(0) @binding(0) var cesiumScene: texture_2d<f32>;
      @group(0) @binding(1) var sceneSampler: sampler;

      @fragment
      fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
        // Sample the Cesium scene (true post-processing!)
        let sceneColor = textureSample(cesiumScene, sceneSampler, uv);
        
        // Only keep the red channel
        return vec4f(sceneColor.r, 0.0, 0.0, 1.0);
      }
    `,
  });

  console.log("Advanced WebGPU stage created:", advancedStage);
}
