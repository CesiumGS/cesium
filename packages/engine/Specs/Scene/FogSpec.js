import { Fog, Math as CesiumMath, SceneMode } from "../../index.js";
import createScene from "../../../../Specs/createScene.js";

describe("Fog", () => {
  describe("update", () => {
    /** @type {Scene} */
    let scene;
    /** @type {Fog} */
    let fog;

    beforeEach(() => {
      fog = new Fog();
      scene = createScene();
    });

    afterEach(function () {
      scene.destroyForSpecs();
    });

    it("disabled when above max height", () => {
      fog.maxHeight = 800000; // default
      const frameState = scene.frameState;

      frameState.camera.positionCartographic.height = 800001;
      fog.update(frameState);
      expect(frameState.fog.enabled)
        .withContext(`at height 800001`)
        .toBeFalse();
      frameState.camera.positionCartographic.height = 5000;
      fog.update(frameState);
      expect(frameState.fog.enabled).withContext(`at height 5000`).toBeTrue();

      fog.maxHeight = 5000;

      frameState.camera.positionCartographic.height = 5001;
      fog.update(frameState);
      expect(frameState.fog.enabled).withContext(`at height 5001`).toBeFalse();
      frameState.camera.positionCartographic.height = 4000;
      fog.update(frameState);
      expect(frameState.fog.enabled).withContext(`at height 4000`).toBeTrue();
    });

    it("passes through expected values unaltered", () => {
      fog.screenSpaceErrorFactor = 11;
      fog.visualDensityScalar = 12;
      fog.minimumBrightness = 13;

      const frameState = scene.frameState;
      frameState.camera.positionCartographic.height = 10000;
      fog.update(frameState);
      console.log(frameState);

      expect(frameState.fog.enabled).toBeTrue();
      expect(frameState.fog.density).toBeGreaterThan(0);

      expect(frameState.fog.sse).toEqual(11);
      expect(frameState.fog.visualDensityScalar).toEqual(12);
      expect(frameState.fog.minimumBrightness).toEqual(13);
    });

    it("density is 0 when not in 3D", () => {
      const frameState = scene.frameState;

      frameState.mode = SceneMode.SCENE2D;
      fog.update(frameState);
      expect(frameState.fog.density).toEqual(0);
    });

    describe("density function", () => {
      beforeEach(() => {
        fog = new Fog();
      });

      it("density is 0 above max height", () => {
        fog.maxHeight = 800000; // default
        const frameState = scene.frameState;

        frameState.camera.positionCartographic.height = 800001;
        fog.update(frameState);
        expect(frameState.fog.density)
          .withContext(`at height 800001`)
          .toEqual(0);
        frameState.camera.positionCartographic.height = 5000;
        fog.update(frameState);
        expect(frameState.fog.density)
          .withContext(`at height 5000`)
          .not.toEqual(0);

        fog.maxHeight = 5000;

        frameState.camera.positionCartographic.height = 5001;
        fog.update(frameState);
        expect(frameState.fog.density).withContext(`at height 5001`).toEqual(0);
        frameState.camera.positionCartographic.height = 4000;
        fog.update(frameState);
        expect(frameState.fog.density)
          .withContext(`at height 4000`)
          .not.toEqual(0);
      });

      function testDensityAtHeight(
        height,
        expectedDensity,
        epsilon = CesiumMath.EPSILON5,
      ) {
        const frameState = scene.frameState;
        frameState.camera.positionCartographic.height = height;
        fog.update(frameState);
        expect(frameState.fog.density)
          .withContext(`at height ${height}`)
          .toEqualEpsilon(expectedDensity, epsilon);
      }

      it("default density, underground", () => {
        testDensityAtHeight(-1, 1.7e-10, CesiumMath.EPSILON11);
        testDensityAtHeight(-10, 1.7e-10, CesiumMath.EPSILON11);
        testDensityAtHeight(-100, 1.7e-10, CesiumMath.EPSILON11);
        testDensityAtHeight(-1000, 1.7e-10, CesiumMath.EPSILON11);
        testDensityAtHeight(-10000, 1.7e-10, CesiumMath.EPSILON11);
      });

      it("default density, close to the ground", () => {
        testDensityAtHeight(1, 1.7e-10, CesiumMath.EPSILON11);
        testDensityAtHeight(10, 1.7e-10, CesiumMath.EPSILON11);
        testDensityAtHeight(20, 1.7e-10, CesiumMath.EPSILON11);
        testDensityAtHeight(50, 1.7e-10, CesiumMath.EPSILON11);
      });

      it("default density, mid heights", () => {
        testDensityAtHeight(100, 1.5e-10, CesiumMath.EPSILON11);
        testDensityAtHeight(1000, 3.9e-11, CesiumMath.EPSILON12);
        testDensityAtHeight(2000, 2.5e-11, CesiumMath.EPSILON12);
        testDensityAtHeight(5000, 1.5e-11, CesiumMath.EPSILON12);
      });

      it("default density, high heights", () => {
        testDensityAtHeight(10000, 1.0e-11, CesiumMath.EPSILON12);
        testDensityAtHeight(100000, 2.5e-12, CesiumMath.EPSILON13);
        testDensityAtHeight(200000, 1.7e-12, CesiumMath.EPSILON13);
        testDensityAtHeight(500000, 9.9e-13, CesiumMath.EPSILON14);
      });

      it("higher density, close to the ground", () => {
        fog.density = 0.005; // over double the default
        testDensityAtHeight(1, 1.4e-9, CesiumMath.EPSILON10);
        testDensityAtHeight(10, 1.4e-9, CesiumMath.EPSILON10);
        testDensityAtHeight(20, 1.4e-9, CesiumMath.EPSILON10);
        testDensityAtHeight(50, 1.4e-9, CesiumMath.EPSILON10);
      });

      it("higher density, mid heights", () => {
        fog.density = 0.005; // over double default
        testDensityAtHeight(100, 1.2e-9, CesiumMath.EPSILON10);
        testDensityAtHeight(1000, 3.2e-10, CesiumMath.EPSILON11);
        testDensityAtHeight(2000, 2.1e-10, CesiumMath.EPSILON11);
        testDensityAtHeight(5000, 1.2e-10, CesiumMath.EPSILON11);
      });

      it("higher density, high heights", () => {
        fog.density = 0.005; // over double default
        testDensityAtHeight(10000, 8.3e-11, CesiumMath.EPSILON12);
        testDensityAtHeight(100000, 2.1e-11, CesiumMath.EPSILON12);
        testDensityAtHeight(200000, 1.4e-11, CesiumMath.EPSILON12);
        testDensityAtHeight(500000, 8.3e-12, CesiumMath.EPSILON13);
      });

      it("heightScalar directly affects density", () => {
        fog.heightScalar = 1;
        testDensityAtHeight(1000, 3.9e-8, CesiumMath.EPSILON9);
        fog.heightScalar = 2;
        testDensityAtHeight(1000, 3.9e-8 * 2, CesiumMath.EPSILON9);
      });
    });
  });
});
