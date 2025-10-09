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
import pollToPromise from "../../../../Specs/pollToPromise.js";

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

            const gltfPrimitive = content.gltfPrimitive;
            expect(gltfPrimitive).toBeDefined();
            expect(gltfPrimitive.attributes.length).toBeGreaterThan(0);
            const positions = ModelUtility.getAttributeBySemantic(
              gltfPrimitive,
              VertexAttributeSemantic.POSITION,
            ).typedArray;

            const rotations = ModelUtility.getAttributeBySemantic(
              gltfPrimitive,
              VertexAttributeSemantic.ROTATION,
            ).typedArray;

            const scales = ModelUtility.getAttributeBySemantic(
              gltfPrimitive,
              VertexAttributeSemantic.SCALE,
            ).typedArray;

            const colors = ModelUtility.getAttributeBySemantic(
              gltfPrimitive,
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

    it("Load multiple instances of Gaussian splat tileset and validate transformed attributes", async function () {
      const tileset = await Cesium3DTilesTester.loadTileset(
        scene,
        tilesetUrl,
        options,
      );
      scene.camera.lookAt(
        tileset.boundingSphere.center,
        new HeadingPitchRange(0.0, -1.57, tileset.boundingSphere.radius),
      );

      const tileset2 = await Cesium3DTilesTester.loadTileset(
        scene,
        tilesetUrl,
        options,
      );

      const tile = await Cesium3DTilesTester.waitForTileContentReady(
        scene,
        tileset.root,
      );

      scene.camera.lookAt(
        tileset2.boundingSphere.center,
        new HeadingPitchRange(0.0, -1.57, tileset2.boundingSphere.radius),
      );

      const tile2 = await Cesium3DTilesTester.waitForTileContentReady(
        scene,
        tileset2.root,
      );
      const content = tile.content;
      const content2 = tile2.content;

      expect(content).toBeDefined();
      expect(content instanceof GaussianSplat3DTileContent).toBe(true);
      expect(content2).toBeDefined();
      expect(content2 instanceof GaussianSplat3DTileContent).toBe(true);

      await pollToPromise(function () {
        scene.renderForSpecs();
        return (
          tile.content._transformed === true &&
          tile2.content._transformed === true
        );
      });

      const positions1 = tile.content._positions;
      const positions2 = tile2.content._positions;

      expect(positions1.every((p, i) => p === positions2[i])).toBe(true);

      const rotations1 = tile.content._rotations;
      const rotations2 = tile2.content._rotations;

      expect(rotations1.every((r, i) => r === rotations2[i])).toBe(true);

      const scales1 = tile.content._scales;
      const scales2 = tile2.content._scales;

      expect(scales1.every((s, i) => s === scales2[i])).toBe(true);
    });
  },
  "WebGL",
);

describe(
  "Scene/GaussianSplat3DTileContent_Legacy",
  function () {
    const tilesetUrl =
      "./Data/Cesium3DTiles/GaussianSplats/tower_legacy/tileset.json";

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

            const gltfPrimitive = content.gltfPrimitive;
            expect(gltfPrimitive).toBeDefined();
            expect(gltfPrimitive.attributes.length).toBeGreaterThan(0);
            const positions = ModelUtility.getAttributeBySemantic(
              gltfPrimitive,
              VertexAttributeSemantic.POSITION,
            ).typedArray;

            const rotations = ModelUtility.getAttributeBySemantic(
              gltfPrimitive,
              VertexAttributeSemantic.ROTATION,
            ).typedArray;

            const scales = ModelUtility.getAttributeBySemantic(
              gltfPrimitive,
              VertexAttributeSemantic.SCALE,
            ).typedArray;

            const colors = ModelUtility.getAttributeBySemantic(
              gltfPrimitive,
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
