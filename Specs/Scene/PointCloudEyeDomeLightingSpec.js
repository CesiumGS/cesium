import { Cartesian3 } from "../../Source/Cesium.js";
import { Cesium3DTileStyle } from "../../Source/Cesium.js";
import { HeadingPitchRange } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { PerspectiveFrustum } from "../../Source/Cesium.js";
import { PointCloudEyeDomeLighting } from "../../Source/Cesium.js";
import Cesium3DTilesTester from "../Cesium3DTilesTester.js";
import createScene from "../createScene.js";

describe(
  "Scene/PointCloudEyeDomeLighting",
  function () {
    let scene;
    const centerLongitude = -1.31968;
    const centerLatitude = 0.698874;

    const pointCloudNoColorUrl =
      "./Data/Cesium3DTiles/PointCloud/PointCloudNoColor/tileset.json";

    function setCamera(longitude, latitude) {
      // Point the camera to the center of the tile
      const center = Cartesian3.fromRadians(longitude, latitude, 5.0);
      scene.camera.lookAt(center, new HeadingPitchRange(0.0, -1.57, 5.0));
    }

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      const camera = scene.camera;
      camera.frustum = new PerspectiveFrustum();
      camera.frustum.aspectRatio =
        scene.drawingBufferWidth / scene.drawingBufferHeight;
      camera.frustum.fov = CesiumMath.toRadians(60.0);

      setCamera(centerLongitude, centerLatitude);
    });

    afterEach(function () {
      scene.primitives.removeAll();
    });

    it("adds a clear command and a post-processing draw call", function () {
      if (!PointCloudEyeDomeLighting.isSupported(scene.frameState.context)) {
        return;
      }

      return Cesium3DTilesTester.loadTileset(scene, pointCloudNoColorUrl).then(
        function (tileset) {
          tileset.pointCloudShading.eyeDomeLighting = true;

          scene.renderForSpecs();
          const originalLength = scene.frameState.commandList.length;

          tileset.pointCloudShading.attenuation = true;
          scene.renderForSpecs();
          const newLength = scene.frameState.commandList.length;
          expect(newLength).toEqual(originalLength + 2);
        }
      );
    });

    it("does not change commands for pick calls", function () {
      if (!PointCloudEyeDomeLighting.isSupported(scene.frameState.context)) {
        return;
      }

      return Cesium3DTilesTester.loadTileset(scene, pointCloudNoColorUrl).then(
        function (tileset) {
          tileset.pointCloudShading.eyeDomeLighting = true;

          scene.pickForSpecs();
          const originalLength = scene.frameState.commandList.length;

          tileset.pointCloudShading.attenuation = true;
          scene.pickForSpecs();
          const newLength = scene.frameState.commandList.length;
          expect(newLength).toEqual(originalLength);
        }
      );
    });

    it("works when point cloud shader changes", function () {
      if (!PointCloudEyeDomeLighting.isSupported(scene.frameState.context)) {
        return;
      }

      return Cesium3DTilesTester.loadTileset(scene, pointCloudNoColorUrl).then(
        function (tileset) {
          tileset.pointCloudShading.attenuation = true;
          tileset.pointCloudShading.eyeDomeLighting = true;

          scene.renderForSpecs();

          tileset.pointCloudShading.eyeDomeLighting = false;

          scene.renderForSpecs();

          tileset.style = new Cesium3DTileStyle({
            color: "color('red')",
          });

          return tileset.style.readyPromise.then(function () {
            scene.renderForSpecs();

            // Forces destroyed shaders to be released
            scene.context.shaderCache.destroyReleasedShaderPrograms();

            tileset.pointCloudShading.eyeDomeLighting = true;

            scene.renderForSpecs();

            expect(scene.frameState.commandList.length).toBe(3);
          });
        }
      );
    });
  },
  "WebGL"
);
