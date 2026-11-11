import {
  Cartesian3,
  PostProcessStageLibrary,
  TemporalAntiAliasingStage,
} from "../../index.js";
import createScene from "../../../../Specs/createScene.js";

describe(
  "Scene/TemporalAntiAliasingStage",
  function () {
    let scene;

    beforeAll(function () {
      scene = createScene();
      scene.postProcessStages.fxaa.enabled = false;
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      scene.postProcessStages.removeAll();
      scene.primitives.removeAll();
    });

    it("constructs with defaults", function () {
      const stage = new TemporalAntiAliasingStage();
      expect(stage.name).toBeDefined();
      expect(stage.feedback).toEqual(0.98);
      expect(stage.progressive).toBe(false);
      expect(stage.historyFloat).toBe(false);
      expect(stage.maxProgressiveFrames).toEqual(256);
      expect(stage.enabled).toBe(true);
      expect(stage.ready).toBe(false);
      stage.destroy();
    });

    it("uses a float history by default in progressive mode", function () {
      const stage = new TemporalAntiAliasingStage({ progressive: true });
      expect(stage.progressive).toBe(true);
      expect(stage.historyFloat).toBe(true);
      stage.destroy();

      const halfStage = new TemporalAntiAliasingStage({
        progressive: true,
        historyFloat: false,
      });
      expect(halfStage.historyFloat).toBe(false);
      halfStage.destroy();
    });

    it("throws with invalid options", function () {
      expect(function () {
        return new TemporalAntiAliasingStage({ feedback: "0.9" });
      }).toThrowDeveloperError();
    });

    it("is created by PostProcessStageLibrary", function () {
      const stage = PostProcessStageLibrary.createTemporalAntiAliasingStage({
        progressive: true,
        maxProgressiveFrames: 64,
      });
      expect(stage instanceof TemporalAntiAliasingStage).toBe(true);
      expect(stage.maxProgressiveFrames).toEqual(64);
      stage.destroy();
    });

    it("renders and accumulates while the camera is still", function () {
      const stage = scene.postProcessStages.add(
        new TemporalAntiAliasingStage({ progressive: true }),
      );
      scene.camera.setView({
        destination: new Cartesian3(1.0e7, 0.0, 0.0),
      });

      scene.renderForSpecs();
      expect(stage.ready).toBe(true);

      scene.renderForSpecs();
      scene.renderForSpecs();
      expect(stage._frameCount).toBeGreaterThan(0);
      expect(stage.outputTexture).toBeDefined();

      scene.camera.moveForward(1.0e5);
      scene.renderForSpecs();
      expect(stage._frameCount).toEqual(0);
    });

    it("renders as regular TAA when progressive is off", function () {
      const stage = scene.postProcessStages.add(
        new TemporalAntiAliasingStage(),
      );
      scene.camera.setView({
        destination: new Cartesian3(1.0e7, 0.0, 0.0),
      });
      scene.renderForSpecs();
      scene.renderForSpecs();
      expect(stage.ready).toBe(true);
      expect(stage.outputTexture).toBeDefined();
    });

    it("is destroyed", function () {
      const stage = new TemporalAntiAliasingStage();
      expect(stage.isDestroyed()).toBe(false);
      stage.destroy();
      expect(stage.isDestroyed()).toBe(true);
    });
  },
  "WebGL",
);
