import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
  timeline: false,
  animation: false,
  baseLayerPicker: false,
  sceneModePicker: false,
});

// Height-based colorization: colors cycle through the rainbow every 10 metres.
const heightShader = new Cesium.CustomShader({
  lightingModel: Cesium.LightingModel.UNLIT,
  fragmentShaderText: `
void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
    float height = length(fsInput.attributes.positionWC) - 6378137.0;

    // Cycle through the rainbow every 10 metres
    float t = mod(height, 10.0) / 10.0;

    // Blue → cyan → green → yellow → red → back to blue
    vec3 c0 = vec3(0.0, 0.0, 1.0); // blue
    vec3 c1 = vec3(0.0, 1.0, 1.0); // cyan
    vec3 c2 = vec3(0.0, 1.0, 0.0); // green
    vec3 c3 = vec3(1.0, 1.0, 0.0); // yellow
    vec3 c4 = vec3(1.0, 0.0, 0.0); // red

    vec3 color;
    if      (t < 0.25) color = mix(c0, c1, t * 4.0);
    else if (t < 0.50) color = mix(c1, c2, (t - 0.25) * 4.0);
    else if (t < 0.75) color = mix(c2, c3, (t - 0.50) * 4.0);
    else               color = mix(c3, c4, (t - 0.75) * 4.0);

    material.diffuse = color;
}
`,
});

// Classification-based colorization: splats are tinted according to a
// per-feature classification code stored in the first two bytes of the
// property table texture (16-bit little-endian integer).
// Requires a dataset that contains EXT_structural_metadata classification data.
const classificationShader = new Cesium.CustomShader({
  fragmentShaderText: `
void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {
    int classification = fsInput.attributes.featureId_0;
 
    if (classification != 0) {
        vec3 palette[10];
        palette[0] = vec3(1.0, 0.0, 0.0); // red
        palette[1] = vec3(1.0, 0.5, 0.0); // orange
        palette[2] = vec3(1.0, 1.0, 0.0); // yellow
        palette[3] = vec3(0.0, 1.0, 0.0); // green
        palette[4] = vec3(0.0, 1.0, 0.5); // spring green
        palette[5] = vec3(0.0, 1.0, 1.0); // cyan
        palette[6] = vec3(0.0, 0.5, 1.0); // azure
        palette[7] = vec3(0.0, 0.0, 1.0); // blue
        palette[8] = vec3(0.5, 0.0, 1.0); // violet
        palette[9] = vec3(1.0, 0.0, 1.0); // magenta
 
        vec3 labelColor = palette[int(mod(float(classification - 1), 10.0))];
        material.diffuse = mix(material.diffuse, labelColor, 0.5);
    }
}
`,
});

// Position the (non-georeferenced) tileset at the substation location
const substationPosition = Cesium.Cartesian3.fromDegrees(
  4.665889, // longitude
  45.250167, // latitude
  100.0, // height in metres
);
const modelMatrix =
  Cesium.Transforms.eastNorthUpToFixedFrame(substationPosition);

let tileset;
try {
  tileset = await Cesium.Cesium3DTileset.fromUrl(
    "/LocalData/Gaussians/Substation/tileset.json",
    { modelMatrix },
  );
  viewer.scene.primitives.add(tileset);
  viewer.zoomTo(
    tileset,
    new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(0.0),
      Cesium.Math.toRadians(-25.0),
      200.0,
    ),
  );
} catch (error) {
  console.log(`Error loading tileset: ${error}`);
}

Sandcastle.addToolbarMenu([
  {
    text: "Original",
    onselect: function () {
      tileset.customShader = undefined;
    },
  },

  {
    text: "Height",
    onselect: function () {
      tileset.customShader = heightShader;
    },
  },
  {
    text: "Classification",
    onselect: function () {
      tileset.customShader = classificationShader;
    },
  },
]);
