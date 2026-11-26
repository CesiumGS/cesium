import { Cartesian3 } from "@cesium/core";
import { TemporalAntiAliasingStage } from "../../index.js";
import createScene from "../../../../Specs/createScene.js";
import ViewportPrimitive from "../../../../Specs/ViewportPrimitive.js";

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

    beforeEach(function () {
      scene.camera.setView({
        destination: new Cartesian3(1.0e7, 0.0, 0.0),
      });
    });

    afterEach(function () {
      scene.postProcessStages.removeAll();
      scene.primitives.removeAll();
    });

    // Alternates between black and white every frame, like stochastic noise.
    const flickering =
      "void main() { out_FragColor = vec4(vec3(mod(czm_frameNumber, 2.0)), 1.0); }";
    const magenta = "void main() { out_FragColor = vec4(1.0, 0.0, 1.0, 1.0); }";

    it("uses a float history by default in progressive mode", function () {
      const progressive = new TemporalAntiAliasingStage({ progressive: true });
      expect(progressive.historyFloat).toBe(true);
      progressive.destroy();

      const halfFloat = new TemporalAntiAliasingStage({
        progressive: true,
        historyFloat: false,
      });
      expect(halfFloat.historyFloat).toBe(false);
      halfFloat.destroy();
    });

    it("throws with invalid options", function () {
      expect(function () {
        return new TemporalAntiAliasingStage({ feedback: "0.9" });
      }).toThrowDeveloperError();
    });

    it("averages frames while the camera is still", function () {
      scene.postProcessStages.add(
        new TemporalAntiAliasingStage({ progressive: true }),
      );
      scene.primitives.add(new ViewportPrimitive(flickering));
      for (let i = 0; i < 31; ++i) {
        scene.renderForSpecs();
      }
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(115);
        expect(rgba[0]).toBeLessThan(140);
      });
    });

    it("discards the history when the camera jumps", function () {
      scene.postProcessStages.add(
        new TemporalAntiAliasingStage({ progressive: true }),
      );
      scene.primitives.add(new ViewportPrimitive(flickering));
      for (let i = 0; i < 8; ++i) {
        scene.renderForSpecs();
      }

      scene.camera.moveForward(1.0e5);
      expect(scene).toRenderAndCall(function (rgba) {
        expect([0, 255]).toContain(rgba[0]);
      });
    });

    it("discards the history when disabled", function () {
      const stage = scene.postProcessStages.add(
        new TemporalAntiAliasingStage({ progressive: true }),
      );
      scene.primitives.add(new ViewportPrimitive(flickering));
      for (let i = 0; i < 8; ++i) {
        scene.renderForSpecs();
      }

      stage.enabled = false;
      scene.renderForSpecs();
      stage.enabled = true;
      expect(scene).toRenderAndCall(function (rgba) {
        expect([0, 255]).toContain(rgba[0]);
      });
    });

    it("reprojects the history while the camera moves", function () {
      scene.postProcessStages.add(new TemporalAntiAliasingStage());
      scene.primitives.add(new ViewportPrimitive(magenta));
      for (let i = 0; i < 4; ++i) {
        scene.camera.moveRight(1.0);
        expect(scene).toRender([255, 0, 255, 255]);
      }
    });
  },
  "WebGL",
);
