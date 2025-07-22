import * as Cesium from "cesium";

// San Miguel model created by Guillermo M. Leal Llaguno. Cleaned up and hosted by Morgan McGuire: http://graphics.cs.williams.edu/data/meshes.xml
const viewer = new Cesium.Viewer("cesiumContainer");

try {
  const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(125737);
  viewer.scene.primitives.add(tileset);
} catch (error) {
  console.log(`Error loading tileset: ${error}`);
}

const initialPosition = new Cesium.Cartesian3(
  -1111583.3721328347,
  -5855888.151574568,
  2262561.444696748,
);
const initialOrientation = new Cesium.HeadingPitchRoll.fromDegrees(
  100.0,
  -15.0,
  0.0,
);
viewer.scene.camera.setView({
  destination: initialPosition,
  orientation: initialOrientation,
  endTransform: Cesium.Matrix4.IDENTITY,
});
