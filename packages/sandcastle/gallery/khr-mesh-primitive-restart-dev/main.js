import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

// KHR_mesh_primitive_restart allows many line strips, line loops, triangle
// strips, or triangle fans to be batched into a single glTF primitive. The
// primitive's indices accessor may contain inline "restart" values (the
// maximum value for the accessor's component type (0xFF / 0xFFFF /
// 0xFFFFFFFF) to begin a new primitive.
//
// Requires WebGL 2 (PRIMITIVE_RESTART_FIXED_INDEX). Use the context dropdown
// to force a WebGL 1 context, where results vary by browser/GPU backend:
// nothing, corrupted geometry, or even correct rendering.
//
// The sample models below are from the KHR_mesh_primitive_restart proposal:
// https://github.com/KhronosGroup/glTF/pull/2569
// Each contains a single mesh primitive with multiple topologies separated
// by inline restart values.

let viewer;

function createViewer(requestWebgl1) {
  if (Cesium.defined(viewer)) {
    viewer.destroy();
  }
  viewer = new Cesium.Viewer("cesiumContainer", {
    contextOptions: { requestWebgl1: requestWebgl1 },
  });
}

createViewer(false);

const models = {
  "Hilbert Curve (LINE_STRIP, 32-bit indices)": {
    url: "../../SampleData/models/PrimitiveRestart/PrimitiveRestartLineStrip.glb",
    heading: 0.0,
    pitch: -45.0,
  },
  "Line Strips": {
    url: "../../SampleData/models/PrimitiveRestart/primitive-restart-line-strip.glb",
    heading: -90.0,
    pitch: 0.0,
  },
  "Line Loops": {
    url: "../../SampleData/models/PrimitiveRestart/primitive-restart-line-loop.glb",
    heading: -90.0,
    pitch: 0.0,
  },
  "Triangle Strips": {
    url: "../../SampleData/models/PrimitiveRestart/primitive-restart-triangle-strip.glb",
    heading: -90.0,
    pitch: 0.0,
  },
  "Triangle Fans": {
    url: "../../SampleData/models/PrimitiveRestart/primitive-restart-triangle-fan.glb",
    heading: -90.0,
    pitch: 0.0,
  },
};

const origin = Cesium.Cartesian3.fromDegrees(-75.152408, 39.946975, 50.0);
const modelMatrix = Cesium.Transforms.headingPitchRollToFixedFrame(
  origin,
  new Cesium.HeadingPitchRoll(0.0, 0.0, 0.0),
);

let model;
let currentEntry;

async function loadModel(entry) {
  currentEntry = entry;
  if (Cesium.defined(model)) {
    viewer.scene.primitives.remove(model);
    model = undefined;
  }

  try {
    model = viewer.scene.primitives.add(
      await Cesium.Model.fromGltfAsync({
        url: entry.url,
        modelMatrix: modelMatrix,
      }),
    );

    model.readyEvent.addEventListener(() => {
      const camera = viewer.camera;
      const center = model.boundingSphere.center;
      const r = 3.0 * Math.max(model.boundingSphere.radius, 1.0);
      camera.lookAt(
        center,
        new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(entry.heading),
          Cesium.Math.toRadians(entry.pitch),
          r,
        ),
      );
      camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    });
  } catch (error) {
    window.alert(`Error loading model: ${error}`);
  }
}

Sandcastle.addToolbarMenu(
  Object.entries(models).map(([text, entry]) => ({
    text: text,
    onselect: () => loadModel(entry),
  })),
);

Sandcastle.addToolbarMenu([
  {
    text: "WebGL 2 (restart supported)",
    onselect: () => {
      createViewer(false);
      loadModel(currentEntry);
    },
  },
  {
    text: "WebGL 1 (restart unsupported; behavior varies)",
    onselect: () => {
      createViewer(true);
      loadModel(currentEntry);
    },
  },
]);

await loadModel(Object.values(models)[0]);
