import {
  Cartesian3,
  Ellipsoid,
  SceneMode,
  SkyAtmosphere,
} from "../../index.js";

import { Math as CesiumMath } from "../../index.js";

import createScene from "../../../../Specs/createScene.js";

describe(
  "Scene/SkyAtmosphere",
  function () {
    let scene;

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      scene.mode = SceneMode.SCENE3D;
    });

    it("draws sky with camera in atmosphere", function () {
      const s = new SkyAtmosphere();

      expect(scene).toRender([0, 0, 0, 255]);
      scene.render();

      const command = s.update(scene.frameState);
      expect(command).toBeDefined();
      command.execute(scene.context); // Not reliable enough across browsers to test pixels

      s.destroy();
    });

    it("draws sky with camera in space", function () {
      const s = new SkyAtmosphere();

      expect(scene).toRender([0, 0, 0, 255]);
      scene.render();

      const command = s.update(scene.frameState);
      expect(command).toBeDefined();
      command.execute(scene.context); // Not reliable enough across browsers to test pixels

      s.destroy();
    });

    it("draws sky with setDynamicAtmosphereColor set to true", function () {
      const s = new SkyAtmosphere();
      s.setDynamicAtmosphereColor(true, false);

      expect(scene).toRender([0, 0, 0, 255]);
      scene.render();

      const command = s.update(scene.frameState);
      expect(command).toBeDefined();
      expect(s._radiiAndDynamicAtmosphereColor.z).toBe(1);
      command.execute(scene.context); // Not reliable enough across browsers to test pixels

      s.destroy();
    });

    it("draws sky with setDynamicAtmosphereColor set to true using the sun direction", function () {
      const s = new SkyAtmosphere();
      s.setDynamicAtmosphereColor(true, true);

      expect(scene).toRender([0, 0, 0, 255]);
      scene.render();

      const command = s.update(scene.frameState);
      expect(command).toBeDefined();
      expect(s._radiiAndDynamicAtmosphereColor.z).toBe(2);
      command.execute(scene.context); // Not reliable enough across browsers to test pixels

      s.destroy();
    });

    it("draws sky with setDynamicAtmosphereColor set to false", function () {
      const s = new SkyAtmosphere();
      s.setDynamicAtmosphereColor(false, false);

      expect(scene).toRender([0, 0, 0, 255]);
      scene.render();

      const command = s.update(scene.frameState);
      expect(command).toBeDefined();
      expect(s._radiiAndDynamicAtmosphereColor.z).toBe(0);
      command.execute(scene.context); // Not reliable enough across browsers to test pixels

      s.destroy();
    });

    it("draws sky with color correction active", function () {
      const oldSkyAtmosphere = scene.skyAtmosphere;
      const s = new SkyAtmosphere();

      scene.skyAtmosphere = s;
      scene.environmentState.isReadyForAtmosphere = true;

      scene.camera.setView({
        destination: Cartesian3.fromDegrees(-75.5847, 40.0397, 1000.0),
        orientation: {
          heading: -CesiumMath.PI_OVER_TWO,
          pitch: 0.2,
          roll: 0.0,
        },
      });

      let color;
      expect(scene).toRenderAndCall(function (rgba) {
        color = rgba;
        expect(color).not.toEqual([0, 0, 0, 255]);
      });

      // Expect color correction to change the color output.
      s.hueShift = 0.5;
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba).not.toEqual([0, 0, 0, 255]);
        expect(rgba).not.toEqual(color);
      });

      scene.skyAtmosphere = oldSkyAtmosphere;
    });

    it("does not render when show is false", function () {
      const s = new SkyAtmosphere();
      s.show = false;

      expect(scene).toRender([0, 0, 0, 255]);
      scene.render();

      const command = s.update(scene.frameState);
      expect(command).not.toBeDefined();
    });

    it("does not render in 2D", function () {
      const s = new SkyAtmosphere();

      expect(scene).toRender([0, 0, 0, 255]);
      scene.mode = SceneMode.SCENE2D;
      scene.render();

      const command = s.update(scene.frameState);
      expect(command).not.toBeDefined();
    });

    it("does not render without a color pass", function () {
      const s = new SkyAtmosphere();

      scene.frameState.passes.render = false;

      const command = s.update(scene.frameState);
      expect(command).not.toBeDefined();
    });

    it("gets ellipsoid", function () {
      const s = new SkyAtmosphere(Ellipsoid.UNIT_SPHERE);
      expect(s.ellipsoid).toEqual(Ellipsoid.UNIT_SPHERE);
    });

    it("isDestroyed", function () {
      const s = new SkyAtmosphere();
      expect(s.isDestroyed()).toEqual(false);
      s.destroy();
      expect(s.isDestroyed()).toEqual(true);
    });
  },
  "WebGL"
);
