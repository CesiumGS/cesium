import {
  PerspectiveFrustum,
  Math as CesiumMath,
  ResourceCache,
  RequestScheduler,
  HeadingPitchRange,
  GaussianSplat3DTileContent,
} from "../../index.js";

import Cesium3DTilesTester from "../../../../Specs/Cesium3DTilesTester.js";
import createScene from "../../../../Specs/createScene.js";

describe(
  "Scene/GaussianSplatPrimitive",
  function () {
    const tilesetUrl = "./Data/Cesium3DTiles/GaussianSplats/tower/tileset.json";

    let scene;
    let options;

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      RequestScheduler.clearForSpecs();
      scene.morphTo3D(0.0);

      const camera = scene.camera;
      camera.frustum = new PerspectiveFrustum();
      camera.frustum.aspectRatio =
        scene.drawingBufferWidth / scene.drawingBufferHeight;
      camera.frustum.fov = CesiumMath.toRadians(60.0);

      options = {
        cullRequestsWhileMoving: false,
        maximumScreenSpaceError: 1,
      };
    });

    afterEach(function () {
      scene.primitives.removeAll();
      ResourceCache.clearForSpecs();
    });

    it("load a Gaussian Splat tileset", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl, options).then(
        function (tileset) {
          scene.camera.lookAt(
            tileset.boundingSphere.center,
            new HeadingPitchRange(0.0, -1.57, tileset.boundingSphere.radius),
          );
          expect(tileset.hasExtension("3DTILES_content_gltf")).toBe(true);
          expect(
            tileset.isGltfExtensionUsed("KHR_spz_gaussian_splats_compression"),
          ).toBe(true);
          expect(
            tileset.isGltfExtensionRequired(
              "KHR_spz_gaussian_splats_compression",
            ),
          ).toBe(true);

          return Cesium3DTilesTester.waitForTileContent(
            scene,
            tileset.root,
          ).then(function (tile) {
            expect(tile.content).toBeDefined();
            expect(tile.content instanceof GaussianSplat3DTileContent).toBe(
              true,
            );
          });
        },
      );
    });
  },
  "WebGL",
);
