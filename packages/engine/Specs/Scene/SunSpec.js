import {
  BoundingSphere,
  Color,
  SceneMode,
  Sun,
} from "../../index.js";;

import { Math as CesiumMath } from "../../index.js";

import createScene from "../../../../Specs/createScene.js";;

describe(
  "Scene/Sun",
  function () {
    let scene;
    const backgroundColor = [255, 0, 0, 255];

    beforeAll(function () {
      scene = createScene();
      scene.backgroundColor = Color.unpack(backgroundColor);
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      scene.mode = SceneMode.SCENE3D;
    });

    afterEach(function () {
      scene.sun = undefined;
    });

    function viewSun(camera, uniformState) {
      const sunPosition = uniformState.sunPositionWC;
      const bounds = new BoundingSphere(sunPosition, CesiumMath.SOLAR_RADIUS);
      camera.viewBoundingSphere(bounds);
    }

    it("draws in 3D", function () {
      expect(scene).toRender(backgroundColor);
      scene.sun = new Sun();
      scene.sun.glowFactor = 100;
      scene.render();

      viewSun(scene.camera, scene.context.uniformState);
      expect(scene).notToRender(backgroundColor);
    });

    it("draws in Columbus view", function () {
      expect(scene).toRender(backgroundColor);
      scene.mode = SceneMode.COLUMBUS_VIEW;
      scene.sun = new Sun();
      scene.render();

      viewSun(scene.camera, scene.context.uniformState);
      expect(scene).notToRender(backgroundColor);
    });

    it("does not render when show is false", function () {
      expect(scene).toRender(backgroundColor);
      scene.sun = new Sun();
      scene.render();
      scene.sun.show = false;

      viewSun(scene.camera, scene.context.uniformState);
      expect(scene).toRender(backgroundColor);
    });

    it("does not render in 2D", function () {
      expect(scene).toRender(backgroundColor);
      scene.mode = SceneMode.SCENE2D;
      scene.sun = new Sun();
      scene.render();

      viewSun(scene.camera, scene.context.uniformState);
      expect(scene).toRender(backgroundColor);
    });

    it("does not render without a render pass", function () {
      scene.sun = new Sun();
      scene.render();

      viewSun(scene.camera, scene.context.uniformState);
      scene.frameState.passes.render = false;
      const command = scene.sun.update(scene.frameState, scene.view.passState);
      expect(command).not.toBeDefined();
    });

    it("can set glow factor", function () {
      const sun = (scene.sun = new Sun());
      sun.glowFactor = 0.0;
      expect(sun.glowFactor).toEqual(0.0);
      sun.glowFactor = 2.0;
      expect(sun.glowFactor).toEqual(2.0);
    });

    it("draws without lens flare", function () {
      expect(scene).toRender(backgroundColor);
      scene.sun = new Sun();
      scene.sun.glowFactor = 0.0;
      scene.renderForSpecs();

      viewSun(scene.camera, scene.context.uniformState);
      expect(scene).notToRender(backgroundColor);
    });

    it("isDestroyed", function () {
      const sun = new Sun();
      expect(sun.isDestroyed()).toEqual(false);
      sun.destroy();
      expect(sun.isDestroyed()).toEqual(true);
    });
  },
  "WebGL"
);
