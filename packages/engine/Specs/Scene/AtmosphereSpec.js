import { Cartesian3, DynamicAtmosphereLightingType } from "../../index.js";

import createScene from "../../../../Specs/createScene";

describe(
  "scene/Atmosphere",
  function () {
    let scene;
    beforeEach(function () {
      scene = createScene();
    });

    afterEach(function () {
      scene.destroyForSpecs();
    });

    it("updates frameState each frame", function () {
      const atmosphere = scene.atmosphere;
      const frameStateAtmosphere = scene.frameState.atmosphere;

      // Render and check that scene.atmosphere updated
      // frameState.atmosphere. For the first frame this should
      // be the default settings.
      scene.renderForSpecs();
      expect(frameStateAtmosphere.hsbShift).toEqual(new Cartesian3());
      expect(frameStateAtmosphere.lightIntensity).toEqual(10.0);
      expect(frameStateAtmosphere.rayleighCoefficient).toEqual(
        new Cartesian3(5.5e-6, 13.0e-6, 28.4e-6)
      );
      expect(frameStateAtmosphere.rayleighScaleHeight).toEqual(10000.0);
      expect(frameStateAtmosphere.mieCoefficient).toEqual(
        new Cartesian3(21e-6, 21e-6, 21e-6)
      );
      expect(frameStateAtmosphere.mieScaleHeight).toEqual(3200.0);
      expect(frameStateAtmosphere.mieAnisotropy).toEqual(0.9);
      expect(frameStateAtmosphere.dynamicLighting).toEqual(
        DynamicAtmosphereLightingType.NONE
      );

      // Now change the settings, render again and check that
      // the frame state was updated.
      atmosphere.hueShift = 0.5;
      atmosphere.saturationShift = -0.5;
      atmosphere.brightnessShift = 0.25;
      atmosphere.lightIntensity = 5.0;
      atmosphere.rayleighCoefficient = new Cartesian3(1.0, 1.0, 1.0);
      atmosphere.rayleighScaleHeight = 1000;
      atmosphere.mieCoefficient = new Cartesian3(2.0, 2.0, 2.0);
      atmosphere.mieScaleHeight = 100;
      atmosphere.mieAnisotropy = 0.5;
      atmosphere.dynamicLighting = DynamicAtmosphereLightingType.SUNLIGHT;

      scene.renderForSpecs();
      expect(frameStateAtmosphere.hsbShift).toEqual(
        new Cartesian3(0.5, -0.5, 0.25)
      );
      expect(frameStateAtmosphere.lightIntensity).toEqual(5.0);
      expect(frameStateAtmosphere.rayleighCoefficient).toEqual(
        new Cartesian3(1.0, 1.0, 1.0)
      );
      expect(frameStateAtmosphere.rayleighScaleHeight).toEqual(1000);
      expect(frameStateAtmosphere.mieCoefficient).toEqual(
        new Cartesian3(2.0, 2.0, 2.0)
      );
      expect(frameStateAtmosphere.mieScaleHeight).toEqual(100.0);
      expect(frameStateAtmosphere.mieAnisotropy).toEqual(0.5);
      expect(frameStateAtmosphere.dynamicLighting).toEqual(
        DynamicAtmosphereLightingType.SUNLIGHT
      );
    });
  },
  "WebGL"
);
