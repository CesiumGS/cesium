import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer");

const colorShader = new Cesium.CustomShader({
  lightingModel: Cesium.LightingModel.UNLIT,
  fragmentShaderText: `
            // Color tiles by distance to the camera
            void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)
            {
                material.diffuse = vec3(0.0, 0.0, 1.0);
                material.diffuse.g = -fsInput.attributes.positionEC.z / 1.0e4;
            }`,
});

let tileset = null;
try {
  tileset = await Cesium.Cesium3DTileset.fromIonAssetId(75343, {
    customShader: colorShader,
  });
  viewer.scene.primitives.add(tileset);
} catch (error) {
  console.log(`Error loading tileset: ${error}`);
}

const initialPosition = Cesium.Cartesian3.fromDegrees(
  -74.01881302800248,
  40.69114333714821,
  753,
);
const initialOrientation = new Cesium.HeadingPitchRoll.fromDegrees(
  21.27879878293835,
  -21.34390550872461,
  0.0716951918898415,
);
viewer.scene.camera.setView({
  destination: initialPosition,
  orientation: initialOrientation,
  endTransform: Cesium.Matrix4.IDENTITY,
});

const options = [
  {
    text: "Color",
    onselect: function () {
      tileset.customShader = colorShader;
    },
  },
  {
    text: "Stripes",
    onselect: function () {
      tileset.customShader = new Cesium.CustomShader({
        uniforms: {
          // elapsed time in seconds for animation
          u_time: {
            type: Cesium.UniformType.FLOAT,
            value: 0,
          },
          // user-defined texture
          u_stripes: {
            type: Cesium.UniformType.SAMPLER_2D,
            value: new Cesium.TextureUniform({
              url: "../../SampleData/cesium_stripes.png",
            }),
          },
        },
        // Apply the texture to the model, but move the texture coordinates
        // a bit over time so it's animated.
        fragmentShaderText: `
                  void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)
                  {
                      vec2 texCoord = vec2(fsInput.attributes.positionMC.y / 100., 0.) + 0.01 * vec2(czm_frameNumber, 0.0);
                      material.diffuse = texture(u_stripes, texCoord).rgb;
                  }`,
      });
    },
  },
  {
    text: "None",
    onselect: function () {
      tileset.customShader = null;
    },
  },
];

Sandcastle.addToolbarMenu(options);
