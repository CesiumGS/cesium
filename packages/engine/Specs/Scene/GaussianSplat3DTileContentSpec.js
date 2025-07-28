import {
  PerspectiveFrustum,
  Math as CesiumMath,
  ResourceCache,
  RequestScheduler,
  HeadingPitchRange,
  GaussianSplat3DTileContent,
  ModelUtility,
  VertexAttributeSemantic,
} from "../../index.js";

import Cesium3DTilesTester from "../../../../Specs/Cesium3DTilesTester.js";
import createScene from "../../../../Specs/createScene.js";

describe(
  "Scene/GaussianSplat3DTileContent",
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

    it("loads Gaussian Splat content", function () {
      return Cesium3DTilesTester.loadTileset(scene, tilesetUrl, options).then(
        function (tileset) {
          scene.camera.lookAt(
            tileset.boundingSphere.center,
            new HeadingPitchRange(0.0, -1.57, tileset.boundingSphere.radius),
          );

          return Cesium3DTilesTester.waitForTileContentReady(
            scene,
            tileset.root,
          ).then(function (tile) {
            const content = tile.content;
            expect(content).toBeDefined();
            expect(content instanceof GaussianSplat3DTileContent).toBe(true);

            const splatPrimitive = content.splatPrimitive;
            expect(splatPrimitive).toBeDefined();
            expect(splatPrimitive.attributes.length).toBeGreaterThan(0);
            const positions = ModelUtility.getAttributeBySemantic(
              splatPrimitive,
              VertexAttributeSemantic.POSITION,
            ).typedArray;

            const rotations = ModelUtility.getAttributeBySemantic(
              splatPrimitive,
              VertexAttributeSemantic.ROTATION,
            ).typedArray;

            const scales = ModelUtility.getAttributeBySemantic(
              splatPrimitive,
              VertexAttributeSemantic.SCALE,
            ).typedArray;

            const colors = ModelUtility.getAttributeBySemantic(
              splatPrimitive,
              VertexAttributeSemantic.COLOR,
            ).typedArray;

            expect(positions.length).toBeGreaterThan(0);
            expect(rotations.length).toBeGreaterThan(0);
            expect(scales.length).toBeGreaterThan(0);
            expect(colors.length).toBeGreaterThan(0);
          });
        },
      );
    });
    it("Create and destroy GaussianSplat3DTileContent", async function () {
      const tileset = await Cesium3DTilesTester.loadTileset(
        scene,
        tilesetUrl,
        options,
      );
      scene.camera.lookAt(
        tileset.boundingSphere.center,
        new HeadingPitchRange(0.0, -1.57, tileset.boundingSphere.radius),
      );
      const tile = await Cesium3DTilesTester.waitForTileContentReady(
        scene,
        tileset.root,
      );

      scene.primitives.remove(tileset);
      expect(tileset.isDestroyed()).toBe(true);
      expect(tile.isDestroyed()).toBe(true);
      expect(tile.content).toBeUndefined();
    });
  },
  "WebGL",
);
