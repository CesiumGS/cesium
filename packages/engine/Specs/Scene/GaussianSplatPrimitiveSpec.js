import {
  PerspectiveFrustum,
  Math as CesiumMath,
  ResourceCache,
  RequestScheduler,
  HeadingPitchRange,
  Cartesian3,
  GaussianSplat3DTileContent,
  Matrix4,
  Transforms,
} from "../../index.js";
import GaussianSplatPrimitive from "../../Source/Scene/GaussianSplatPrimitive.js";

import Cesium3DTilesTester from "../../../../Specs/Cesium3DTilesTester.js";
import createScene from "../../../../Specs/createScene.js";
import createCanvas from "../../../../Specs/createCanvas.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";

describe(
  "Scene/GaussianSplatPrimitive",
  function () {
    const sphericalHarmonicUrl =
      "./Data/Cesium3DTiles/GaussianSplats/sh_unit_cube/tileset.json";

    let scene;
    let options;
    let camera;

    const canvassize = { width: 512, height: 512 };
    const samplePosition =
      ((canvassize.width / 2) * canvassize.height + canvassize.width / 2) * 4;

    beforeAll(function () {
      const canvas = createCanvas(canvassize.width, canvassize.height);
      scene = createScene({ canvas });
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      RequestScheduler.clearForSpecs();
      scene.morphTo3D(0.0);

      camera = scene.camera;
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

    it("loads a Gaussian splats tileset", async function () {
      const tileset = await Cesium3DTilesTester.loadTileset(
        scene,
        sphericalHarmonicUrl,
        options,
      );
      scene.camera.lookAt(
        tileset.boundingSphere.center,
        new HeadingPitchRange(0.0, -1.57, tileset.boundingSphere.radius),
      );
      expect(tileset.hasExtension("3DTILES_content_gltf")).toBe(true);
      expect(
        tileset.isGltfExtensionUsed("KHR_gaussian_splatting_compression_spz_2"),
      ).toBe(true);
      expect(tileset.isGltfExtensionRequired("KHR_gaussian_splatting")).toBe(
        true,
      );
      expect(
        tileset.isGltfExtensionRequired(
          "KHR_gaussian_splatting_compression_spz_2",
        ),
      ).toBe(true);

      const tile = await Cesium3DTilesTester.waitForTileContentReady(
        scene,
        tileset.root,
      );

      expect(tile.content).toBeDefined();
      expect(tile.content instanceof GaussianSplat3DTileContent).toBe(true);
    });

    it("loads a Gaussian splats tileset and toggles visibility", async function () {
      const tileset = await Cesium3DTilesTester.loadTileset(
        scene,
        sphericalHarmonicUrl,
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

      expect(tile.content).toBeDefined();

      const gsPrim = tileset.gaussianSplatPrimitive;
      expect(gsPrim).toBeDefined();

      await pollToPromise(function () {
        scene.renderForSpecs();
        return gsPrim._dirty === false && gsPrim._sorterPromise === undefined;
      });
      scene.renderForSpecs();
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[samplePosition + 0]).not.toBe(0);
        expect(rgba[samplePosition + 1]).not.toBe(0);
        expect(rgba[samplePosition + 2]).not.toBe(0);
      });

      tileset.show = false;
      scene.renderForSpecs();
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[samplePosition + 0]).toBe(0);
        expect(rgba[samplePosition + 1]).toBe(0);
        expect(rgba[samplePosition + 2]).toBe(0);
      });
    });

    // it("retries pending snapshot sorting when sorter is temporarily unavailable", function () {
    //   const tileset = {
    //     show: true,
    //     splitDirection: 0,
    //     modelMatrix: Matrix4.IDENTITY,
    //     boundingSphere: undefined,
    //     _modelMatrixChanged: false,
    //     _selectedTiles: [],
    //     tileLoad: {
    //       addEventListener: function () {},
    //     },
    //     tileVisible: {
    //       addEventListener: function () {},
    //     },
    //     update: function () {},
    //   };
    //   const gsPrim = new GaussianSplatPrimitive({ tileset: tileset });
    //   gsPrim._rootTransform = Matrix4.IDENTITY;

    //   // Force the pending-snapshot TEXTURE_READY path deterministically.
    //   // This validates "unavailable sorter -> keep TEXTURE_READY -> retry next frame"
    //   // without depending on async texture generation timing.
    //   const fakeTexture = {
    //     destroy: function () {},
    //   };
    //   gsPrim._pendingSnapshot = {
    //     generation: gsPrim._splatDataGeneration,
    //     positions: new Float32Array([0.0, 0.0, 0.0, 1.0, 0.0, 0.0]),
    //     rotations: new Float32Array([0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0]),
    //     scales: new Float32Array([1.0, 1.0, 1.0, 1.0, 1.0, 1.0]),
    //     colors: new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255]),
    //     shData: undefined,
    //     sphericalHarmonicsDegree: 0,
    //     shCoefficientCount: 0,
    //     numSplats: 2,
    //     indexes: undefined,
    //     gaussianSplatTexture: fakeTexture,
    //     sphericalHarmonicsTexture: undefined,
    //     lastTextureWidth: 1,
    //     lastTextureHeight: 1,
    //     state: "SORTING",
    //   };
    //   gsPrim._pendingSortPromise = undefined;
    //   gsPrim._pendingSort = undefined;
    //   gsPrim._sorterPromise = undefined;
    //   gsPrim._sorterState = 0;
    //   gsPrim._dirty = false;
    //   gsPrim._needsSnapshotRebuild = false;
    //   gsPrim._selectedTileSet = new Set();
    //   gsPrim._selectedTilesStableFrames = 2;

    //   const frameState = {
    //     frameNumber: 1,
    //     camera: {
    //       viewMatrix: Matrix4.clone(Matrix4.IDENTITY, new Matrix4()),
    //       positionWC: Cartesian3.clone(Cartesian3.ZERO, new Cartesian3()),
    //       directionWC: Cartesian3.clone(Cartesian3.UNIT_Z, new Cartesian3()),
    //     },
    //     commandList: [],
    //     passes: {
    //       pick: false,
    //     },
    //   };

    //   gsPrim.update(frameState);

    //   expect(gsPrim._pendingSnapshot).toBeDefined();
    //   expect(gsPrim._pendingSnapshot.state).toBe("TEXTURE_READY");
    //   expect(gsPrim._pendingSortPromise).toBeUndefined();
    //   gsPrim.destroy();
    // });

    it("Check Spherical Harmonic specular on a Gaussian splats tileset", async function () {
      const tileset = await Cesium3DTilesTester.loadTileset(
        scene,
        sphericalHarmonicUrl,
        options,
      );

      const boundingSphere = tileset.boundingSphere;
      const yellowish = new HeadingPitchRange(
        CesiumMath.toRadians(231),
        CesiumMath.toRadians(-75),
        tileset.boundingSphere.radius / 10,
      );
      const orangeish = new HeadingPitchRange(
        CesiumMath.toRadians(2),
        CesiumMath.toRadians(-76),
        tileset.boundingSphere.radius / 10,
      );
      const purplish = new HeadingPitchRange(
        CesiumMath.toRadians(100),
        CesiumMath.toRadians(66),
        tileset.boundingSphere.radius / 10,
      );
      const targetOrange = { red: 210, green: 156, blue: 98 };
      const targetYellow = { red: 189, green: 173, blue: 97 };
      const targetPurple = { red: 127, green: 80, blue: 141 };

      tileset.show = true;

      const enu = Transforms.eastNorthUpToFixedFrame(boundingSphere.center);

      scene.camera.lookAtTransform(enu, yellowish);

      await Cesium3DTilesTester.waitForTileContentReady(scene, tileset.root);

      const gsPrim = tileset.gaussianSplatPrimitive;
      await pollToPromise(function () {
        scene.renderForSpecs();
        return gsPrim._dirty === false && gsPrim._sorterPromise === undefined;
      });

      for (let i = 0; i < 100; ++i) {
        scene.renderForSpecs();
      }

      scene.renderForSpecs();
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[samplePosition + 0]).toBeCloseTo(targetYellow.red, -1);
        expect(rgba[samplePosition + 1]).toBeCloseTo(targetYellow.green, -1);
        expect(rgba[samplePosition + 2]).toBeCloseTo(targetYellow.blue, -1);
      });

      scene.camera.lookAtTransform(enu, orangeish);

      await Cesium3DTilesTester.waitForTileContentReady(scene, tileset.root);
      await pollToPromise(function () {
        scene.renderForSpecs();
        return gsPrim._dirty === false && gsPrim._sorterState === 0;
      });

      scene.renderForSpecs();
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[samplePosition + 0]).toBeCloseTo(targetOrange.red, -1);
        expect(rgba[samplePosition + 1]).toBeCloseTo(targetOrange.green, -1);
        expect(rgba[samplePosition + 2]).toBeCloseTo(targetOrange.blue, -1);
      });
      scene.camera.lookAtTransform(enu, purplish);

      await Cesium3DTilesTester.waitForTileContentReady(scene, tileset.root);
      await pollToPromise(function () {
        scene.renderForSpecs();
        return gsPrim._dirty === false && gsPrim._sorterState === 0;
      });

      scene.renderForSpecs();
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[samplePosition + 0]).toBeCloseTo(targetPurple.red, -1);
        expect(rgba[samplePosition + 1]).toBeCloseTo(targetPurple.green, -1);
        expect(rgba[samplePosition + 2]).toBeCloseTo(targetPurple.blue, -1);
      });
    });
  },
  "WebGL",
);
