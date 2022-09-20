import {
  Color,
  defined,
  PostProcessStage,
  PostProcessStageComposite,
} from "../../../Source/Cesium.js";

import createScene from "../createScene.js";
import pollToPromise from "../pollToPromise.js";

describe(
  "Scene/PostProcessStageComposite",
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
    });

    it("constructs", function () {
      const stage = new PostProcessStage({
        fragmentShader:
          "uniform vec4 color; void main() { gl_FragColor = color; }",
        uniforms: { color: Color.clone(Color.RED) },
      });
      const uniforms = {
        color: {
          get: function () {
            return stage.uniforms.color;
          },
          set: function (value) {
            stage.uniforms.color = value;
          },
        },
      };
      const inputPreviousStageTexture = false;
      const name = "kaleidoscope";

      const composite = new PostProcessStageComposite({
        stages: [stage],
        uniforms: uniforms,
        inputPreviousStageTexture: inputPreviousStageTexture,
        name: name,
      });
      expect(composite.ready).toEqual(false);
      expect(composite.name).toEqual(name);
      expect(composite.enabled).toEqual(true);
      expect(composite.uniforms).toEqual(uniforms);
      expect(composite.inputPreviousStageTexture).toEqual(
        inputPreviousStageTexture
      );
      expect(composite.length).toEqual(1);
    });

    it("default constructs", function () {
      const stage1 = new PostProcessStage({
        fragmentShader: "void main() { gl_FragColor = vec4(1.0); }",
      });
      const stage2 = new PostProcessStage({
        fragmentShader:
          "void main() { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }",
      });
      const composite = new PostProcessStageComposite({
        stages: [stage1, stage2],
      });
      expect(composite.ready).toEqual(false);
      expect(composite.name).toBeDefined();
      expect(composite.enabled).toEqual(true);
      expect(composite.uniforms).not.toBeDefined();
      expect(composite.inputPreviousStageTexture).toEqual(true);
      expect(composite.length).toEqual(2);
    });

    it("throws without stages", function () {
      expect(function () {
        return new PostProcessStageComposite();
      }).toThrowDeveloperError();
      expect(function () {
        return new PostProcessStageComposite({ stages: [] });
      }).toThrowDeveloperError();
    });

    it("gets stages", function () {
      const stage1 = new PostProcessStage({
        fragmentShader: "void main() { gl_FragColor = vec4(1.0); }",
      });
      const stage2 = new PostProcessStage({
        fragmentShader:
          "void main() { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }",
      });
      const composite = new PostProcessStageComposite({
        stages: [stage1, stage2],
      });
      expect(composite.get(0)).toEqual(stage1);
      expect(composite.get(1)).toEqual(stage2);
    });

    it("throws when get index is invalid", function () {
      const stage1 = new PostProcessStage({
        fragmentShader: "void main() { gl_FragColor = vec4(1.0); }",
      });
      const stage2 = new PostProcessStage({
        fragmentShader:
          "void main() { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }",
      });
      const composite = new PostProcessStageComposite({
        stages: [stage1, stage2],
      });
      expect(function () {
        return composite.get(-1);
      }).toThrowDeveloperError();
      expect(function () {
        return composite.get(composite.length + 1);
      }).toThrowDeveloperError();
    });

    it("renders with inputPreviousStageTexture is true", function () {
      const stage1 = new PostProcessStage({
        fragmentShader: "void main() { gl_FragColor = vec4(1.0); }",
      });
      const stage2 = new PostProcessStage({
        fragmentShader:
          "uniform sampler2D colorTexture;\n" +
          "varying vec2 v_textureCoordinates;\n" +
          "void main() {\n" +
          "    vec4 color = texture2D(colorTexture, v_textureCoordinates);\n" +
          "    gl_FragColor = vec4(color.r, 0.0, 1.0, 1.0);\n" +
          "}",
      });
      const composite = new PostProcessStageComposite({
        stages: [stage1, stage2],
      });

      expect(scene).toRender([0, 0, 0, 255]);
      scene.postProcessStages.add(composite);
      scene.renderForSpecs(); // update to ready;
      expect(scene).toRender([255, 0, 255, 255]);
    });

    it("renders with inputPreviousStageTexture is false", function () {
      const stage1 = new PostProcessStage({
        fragmentShader: "void main() { gl_FragColor = vec4(1.0); }",
      });
      const stage2 = new PostProcessStage({
        fragmentShader:
          "uniform sampler2D colorTexture;\n" +
          "varying vec2 v_textureCoordinates;\n" +
          "void main() {\n" +
          "    vec4 color = texture2D(colorTexture, v_textureCoordinates);\n" +
          "    gl_FragColor = vec4(color.r, 0.0, 1.0, 1.0);\n" +
          "}",
      });
      const composite = new PostProcessStageComposite({
        stages: [stage1, stage2],
        inputPreviousStageTexture: false,
      });

      expect(scene).toRender([0, 0, 0, 255]);
      scene.postProcessStages.add(composite);
      scene.renderForSpecs(); // update to ready;
      expect(scene).toRender([0, 0, 255, 255]);
    });

    it("does not run a stage that requires depth textures when depth textures are not supported", function () {
      const s = createScene();
      s.context._depthTexture = false;

      if (defined(s._view.globeDepth)) {
        s._view.globeDepth.destroy();
        s._view.globeDepth = undefined;
        if (defined(s._view.oit)) {
          s._view.oit.destroy();
          s._view.oit = undefined;
        }
      }

      expect(s).toRender([0, 0, 0, 255]);
      // Dummy Stage
      const bgColor = 51; // Choose a factor of 255 to make sure there aren't rounding issues
      s.postProcessStages.add(
        new PostProcessStage({
          fragmentShader: `void main() { gl_FragColor = vec4(vec3(${
            bgColor / 255
          }), 1.0); }`,
        })
      );

      //Stage we expect to not run
      const stage = s.postProcessStages.add(
        new PostProcessStageComposite({
          stages: [
            new PostProcessStage({
              fragmentShader:
                "uniform sampler2D depthTexture; void main() { gl_FragColor = vec4(1.0); }",
            }),
          ],
        })
      );
      return pollToPromise(function () {
        s.renderForSpecs();
        return stage.ready;
      })
        .then(function () {
          expect(s).toRender([bgColor, bgColor, bgColor, 255]);
        })
        .finally(function (e) {
          s.destroyForSpecs();
          if (e) {
            return Promise.reject(e);
          }
        });
    });

    it("destroys", function () {
      const stage1 = new PostProcessStage({
        fragmentShader: "void main() { gl_FragColor = vec4(1.0); }",
      });
      const stage2 = new PostProcessStage({
        fragmentShader:
          "void main() { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }",
      });
      const composite = new PostProcessStageComposite({
        stages: [stage1, stage2],
      });
      expect(stage1.isDestroyed()).toEqual(false);
      expect(stage2.isDestroyed()).toEqual(false);
      expect(composite.isDestroyed()).toEqual(false);
      composite.destroy();
      expect(composite.isDestroyed()).toEqual(true);
      expect(stage1.isDestroyed()).toEqual(true);
      expect(stage2.isDestroyed()).toEqual(true);
    });
  },
  "WebGL"
);
