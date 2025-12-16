import * as Cesium from "cesium";

// Create Cesium Viewer
const viewer = new Cesium.Viewer("cesiumContainer");

// Check WebGPU support
if (!navigator.gpu) {
  alert("WebGPU not supported");
} else {
  // Load the WGSL shader from the generated file
  // Path is relative to the root (where bucket.html is served from)
  const response = await fetch("../../SampleData/wgsl/red-frag.wgsl");
  const fragmentShader = await response.text();

  // Create a red screen WebGPU post-process stage
  const redScreenStage = new Cesium.WebGPUPostProcessStage({
    viewer: viewer,
    name: "RedScreen",
    fragmentShader: fragmentShader,
  });

  console.log("WebGPU stage created:", redScreenStage);
}
