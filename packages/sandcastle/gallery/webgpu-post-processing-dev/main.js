import * as Cesium from "cesium";

// Create Cesium Viewer
const viewer = new Cesium.Viewer("cesiumContainer");

// Check WebGPU support
if (!navigator.gpu) {
  alert("WebGPU not supported");
} else {
  // Create a red screen WebGPU post-process stage
  const redScreenStage = new Cesium.WebGPUPostProcessStage({
    viewer: viewer,
    name: "RedScreen",
    fragmentShader: `
      @fragment
      fn main(@location(0) uv: vec2f) -> @location(0) vec4f {
        return vec4f(1.0, 0.0, 0.0, 0.5);
      }
    `,
  });

  console.log("WebGPU stage created:", redScreenStage);
}
