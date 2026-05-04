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
#ifdef HAS_PROPERTY_TABLE
    int featureId = fsInput.attributes.featureId_0;

    ivec2 texSize = textureSize(u_propertyTableTexture, 0);
    int texW = texSize.x;
    ivec2 texCoord = ivec2(featureId % texW, featureId / texW);
    vec4 texel = texelFetch(u_propertyTableTexture, texCoord, 0);

    // Decode 16-bit classification code from R (low byte) and G (high byte)
    int classification = int(texel.r * 255.0 + 0.5)
                       + int(texel.g * 255.0 + 0.5) * 256;

    if (classification != 0) {
        vec3 labelColor;
        if      (classification == 1) labelColor = vec3(0.1, 1.0, 1.0); // Unclassified
        else if (classification == 2) labelColor = vec3(0.3, 0.8, 0.3); // Ground
        else if (classification == 3) labelColor = vec3(0.6, 0.4, 0.2); // Low vegetation
        else if (classification == 4) labelColor = vec3(1.0, 0.3, 0.3); // Medium vegetation
        else if (classification == 5) labelColor = vec3(0.2, 0.5, 1.0); // Building
        else {
            // Unique hue for any other classification code (golden-angle spacing)
            float hue = float(classification) * 2.399963;
            labelColor = vec3(
                0.5 + 0.5 * cos(hue),
                0.5 + 0.5 * cos(hue + 2.094),
                0.5 + 0.5 * cos(hue + 4.189)
            );
        }
        material.diffuse = mix(material.diffuse, labelColor, 0.5);
    }
#endif
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
