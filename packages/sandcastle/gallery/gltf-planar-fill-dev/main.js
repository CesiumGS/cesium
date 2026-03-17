import * as Cesium from "cesium";

const viewer = new Cesium.Viewer("cesiumContainer", {
  baseLayerPicker: false,
  baseLayer: false,
  terrain: undefined,
  // Workaround for https://github.com/CesiumGS/cesium/issues/13311
  // skyBox.show = false doesn't work, must disable at construction
  skyBox: false,
  skyAtmosphere: false,
});

// Hide the globe so we can see the model against the background color.
// This is important for testing backgroundFill which renders using czm_backgroundColor.
viewer.scene.globe.show = false;
viewer.scene.backgroundColor = Cesium.Color.BLACK;

// Adjust camera controller for model-only viewing (no globe)
const controller = viewer.scene.screenSpaceCameraController;
controller.enableCollisionDetection = false;
controller.minimumZoomDistance = 1.0;
controller.maximumZoomDistance = 5000.0;

// Create legend for planar fill configurations
const legend = document.createElement("div");
legend.style.cssText = `
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px;
  border-radius: 5px;
  font-family: monospace;
  font-size: 11px;
  max-height: calc(100% - 40px);
  overflow-y: auto;
`;

const materials = [
  { color: "#ff0000", wire: "NONE", bg: false, behind: false, fid: 42 },
  { color: "#00ff00", wire: "NONE", bg: false, behind: true, fid: 42 },
  { color: "#0000ff", wire: "NONE", bg: true, behind: false, fid: "—" },
  { color: "#ffff00", wire: "NONE", bg: true, behind: true, fid: "—" },
  { color: "#00ffff", wire: "ALWAYS", bg: false, behind: false, fid: "—" },
  { color: "#ff00ff", wire: "ALWAYS", bg: false, behind: true, fid: 99 },
  { color: "#ff8000", wire: "ALWAYS", bg: true, behind: false, fid: "—" },
  { color: "#8000ff", wire: "ALWAYS", bg: true, behind: true, fid: "—" },
  { color: "#80ff00", wire: "TOGGLE", bg: false, behind: false, fid: "—" },
  { color: "#0080ff", wire: "TOGGLE", bg: false, behind: true, fid: "—" },
  { color: "#ff0080", wire: "TOGGLE", bg: true, behind: false, fid: "—" },
  { color: "#808080", wire: "TOGGLE", bg: true, behind: true, fid: "—" },
  { color: "#cccccc", wire: "—", bg: "—", behind: "—", fid: "—" },
  { color: "#003300", wire: "—", bg: false, behind: false, fid: "42" },
  { color: "#330000", wire: "—", bg: "—", behind: "—", fid: "—" },
];

legend.innerHTML = `
  <div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid #666; padding-bottom: 4px;">
    BENTLEY_materials_planar_fill
  </div>
  <table style="border-collapse: collapse;">
    <tr style="font-weight: bold; border-bottom: 1px solid #444;">
      <td style="padding: 2px 6px;"></td>
      <td style="padding: 2px 6px;">wireframeFill</td>
      <td style="padding: 2px 6px;">bgFill</td>
      <td style="padding: 2px 6px;">behind</td>
      <td style="padding: 2px 6px;">featureId</td>
    </tr>
    ${materials
      .map(
        (m, i) => `
      <tr${i === 12 ? ' style="border-top: 1px solid #444;"' : ""}>
        <td style="padding: 2px 6px;">
          <span style="display: inline-block; width: 12px; height: 12px; background: ${m.color}; border: 1px solid #fff;"></span>
        </td>
        <td style="padding: 2px 6px;">${m.wire}</td>
        <td style="padding: 2px 6px;">${m.bg}</td>
        <td style="padding: 2px 6px;">${m.behind}</td>
        <td style="padding: 2px 6px;">${m.fid}</td>
      </tr>
    `,
      )
      .join("")}
  </table>
  <div style="margin-top: 8px; font-size: 10px; color: #aaa;">
    Row 13: no extension (fallback)<br>
    Row 14: backdrop (behind: false)<br>
    Row 15: backdrop (no extension)
  </div>
`;

// The following .gltf file contains polygons using the BENTLEY_materials_planar_fill extension.
// This extension controls how planar polygon fills are rendered for CAD-style visualization:
// - wireframeFill: controls fill visibility in wireframe mode (0=NONE, 1=ALWAYS, 2=TOGGLE)
// - backgroundFill: when true, renders using the view's background color (invisible mask)
// - behind: when true, renders behind coplanar geometry (useful for hatching)
const modelURL =
  "../../../Specs/Data/Models/glTF-2.0/PlanarFill/glTF/planar-fill-polygons.gltf";

try {
  const model = await Cesium.Model.fromGltfAsync({
    url: modelURL,
  });

  viewer.scene.primitives.add(model);
  document.getElementById("cesiumContainer").appendChild(legend);

  model.readyEvent.addEventListener(() => {
    // Zoom to the model
    viewer.camera.flyToBoundingSphere(model.boundingSphere, {
      duration: 0,
      offset: new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(0.0),
        Cesium.Math.toRadians(-45.0),
        model.boundingSphere.radius * 3.0,
      ),
    });
  });
} catch (error) {
  console.error("Error loading model:", error);
  window.alert(`Error loading model: ${error}`);
}
