import * as Cesium from "cesium";
import Sandcastle from "Sandcastle";

const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain(),
});
const scene = viewer.scene;
scene.globe.depthTestAgainstTerrain = false;

let tileset;
try {
  // MAXAR OWT Muscatatuk photogrammetry dataset with property textures
  // containing horizontal and vertical uncertainty
  tileset = await Cesium.Cesium3DTileset.fromIonAssetId(2342602);
  viewer.scene.primitives.add(tileset);
  viewer.zoomTo(tileset);
} catch (error) {
  console.log(`Error loading tileset: ${error}`);
}

const shaders = {
  NO_TEXTURE: undefined,
  UNCERTAINTY_CE90: new Cesium.CustomShader({
    fragmentShaderText: `
        void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)
        {
          int horizontalUncertainty = fsInput.metadata.r3dm_uncertainty_ce90sum;
          material.diffuse = vec3(float(horizontalUncertainty) / 255.0);
        }
      `,
  }),
  UNCERTAINTY_LE90: new Cesium.CustomShader({
    fragmentShaderText: `
        void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)
        {
          int verticalUncertainty = fsInput.metadata.r3dm_uncertainty_le90sum;
          material.diffuse = vec3(float(verticalUncertainty) / 255.0);
        }
      `,
  }),
  // combined uncertainty
  UNCERTAINTY: new Cesium.CustomShader({
    fragmentShaderText: `
        void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)
        {
          int uncertainty = fsInput.metadata.r3dm_uncertainty_ce90sum + fsInput.metadata.r3dm_uncertainty_le90sum;
          material.diffuse = vec3(float(uncertainty) / 255.0);
        }
      `,
  }),
};

Sandcastle.addDefaultToolbarMenu([
  {
    text: "Horizontal Uncertainty",
    onselect: function () {
      tileset.customShader = shaders.UNCERTAINTY_CE90;
    },
  },
  {
    text: "Vertical Uncertainty",
    onselect: function () {
      tileset.customShader = shaders.UNCERTAINTY_LE90;
    },
  },
  {
    text: "Combined Uncertainty",
    onselect: function () {
      tileset.customShader = shaders.UNCERTAINTY;
    },
  },
  {
    text: "No Uncertainty",
    onselect: function () {
      tileset.customShader = shaders.NO_TEXTURE;
    },
  },
]);
tileset.customShader = shaders.UNCERTAINTY_CE90;
