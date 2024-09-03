import {
  PostProcessStage,
  PostProcessStageCollection,
  Tonemapper,
} from "../../index.js";

import createScene from "../../../../Specs/createScene.js";
import ViewportPrimitive from "../../../../Specs/ViewportPrimitive.js";

describe(
  "Scene/PostProcessStageCollection",
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
      scene.postProcessStages.fxaa.enabled = false;
      scene.postProcessStages.bloom.enabled = false;
      scene.postProcessStages.ambientOcclusion.enabled = false;
      scene.highDynamicRange = false;
      scene.primitives.removeAll();
    });

    it("constructs", function () {
      const stages = new PostProcessStageCollection();
      expect(stages.ready).toEqual(false);
      expect(stages.fxaa).toBeDefined();
      expect(stages.ambientOcclusion).toBeDefined();
      expect(stages.bloom).toBeDefined();
      expect(stages.length).toEqual(0);
      expect(stages.outputTexture).not.toBeDefined();
    });

    it("adds stages", function () {
      expect(scene).toRender([0, 0, 0, 255]);

      scene.postProcessStages.add(
        new PostProcessStage({
          fragmentShader:
            "void main() { out_FragColor = vec4(1.0, 1.0, 0.0, 1.0); }",
        })
      );
      expect(scene.postProcessStages.length).toEqual(1);

      scene.renderForSpecs();
      expect(scene).toRender([255, 255, 0, 255]);

      scene.postProcessStages.add(
        new PostProcessStage({
          fragmentShader:
            "uniform sampler2D colorTexture;\n" +
            "in vec2 v_textureCoordinates;\n" +
            "void main() {\n" +
            "    vec4 color = texture(colorTexture, v_textureCoordinates);\n" +
            "    out_FragColor = vec4(color.r, 0.0, 1.0, 1.0);\n" +
            "}",
        })
      );
      expect(scene.postProcessStages.length).toEqual(2);

      scene.renderForSpecs();
      expect(scene).toRender([255, 0, 255, 255]);
    });

    it("throws when adding the same stage", function () {
      const stage = new PostProcessStage({
        fragmentShader:
          "void main() { out_FragColor = vec4(1.0, 1.0, 0.0, 1.0); }",
      });
      expect(function () {
        scene.postProcessStages.add(stage);
        scene.postProcessStages.add(stage);
      }).toThrowDeveloperError();
    });

    it("removes a single stage", function () {
      const stage1 = scene.postProcessStages.add(
        new PostProcessStage({
          fragmentShader:
            "void main() { out_FragColor = vec4(1.0, 1.0, 0.0, 1.0); }",
        })
      );
      scene.renderForSpecs();
      expect(scene).toRender([255, 255, 0, 255]);

      scene.postProcessStages.remove(stage1);
      scene.renderForSpecs();
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("removes stages", function () {
      expect(scene).toRender([0, 0, 0, 255]);

      const stage1 = scene.postProcessStages.add(
        new PostProcessStage({
          fragmentShader:
            "void main() { out_FragColor = vec4(1.0, 1.0, 0.0, 1.0); }",
        })
      );
      const stage2 = scene.postProcessStages.add(
        new PostProcessStage({
          fragmentShader:
            "uniform sampler2D colorTexture;\n" +
            "in vec2 v_textureCoordinates;\n" +
            "void main() {\n" +
            "    vec4 color = texture(colorTexture, v_textureCoordinates);\n" +
            "    out_FragColor = vec4(color.r, 0.0, 1.0, 1.0);\n" +
            "}",
        })
      );
      expect(scene.postProcessStages.length).toEqual(2);

      scene.renderForSpecs();
      expect(scene).toRender([255, 0, 255, 255]);

      scene.postProcessStages.remove(stage1);
      expect(scene.postProcessStages.length).toEqual(1);
      expect(scene.postProcessStages.contains(stage1)).toEqual(false);
      expect(scene.postProcessStages.contains(stage2)).toEqual(true);
      expect(stage1.isDestroyed()).toEqual(true);

      scene.renderForSpecs();
      expect(scene).toRender([0, 0, 255, 255]);

      scene.postProcessStages.remove(stage2);
      expect(scene.postProcessStages.length).toEqual(0);
      expect(scene.postProcessStages.contains(stage2)).toEqual(false);
      expect(stage2.isDestroyed()).toEqual(true);

      scene.renderForSpecs();
      expect(scene).toRender([0, 0, 0, 255]);

      expect(scene.postProcessStages.remove(stage1)).toEqual(false);
    });

    it("gets stages at index", function () {
      const stage1 = scene.postProcessStages.add(
        new PostProcessStage({
          fragmentShader:
            "void main() { out_FragColor = vec4(1.0, 1.0, 0.0, 1.0); }",
        })
      );
      const stage2 = scene.postProcessStages.add(
        new PostProcessStage({
          fragmentShader:
            "uniform sampler2D colorTexture;\n" +
            "in vec2 v_textureCoordinates;\n" +
            "void main() {\n" +
            "    vec4 color = texture(colorTexture, v_textureCoordinates);\n" +
            "    out_FragColor = vec4(color.r, 0.0, 1.0, 1.0);\n" +
            "}",
        })
      );
      expect(scene.postProcessStages.length).toEqual(2);

      expect(scene.postProcessStages.get(0)).toEqual(stage1);
      expect(scene.postProcessStages.get(1)).toEqual(stage2);
      expect(scene.postProcessStages.remove(stage1)).toEqual(true);
      expect(scene.postProcessStages.get(0)).toEqual(stage2);
    });

    it("throws when get index is invalid", function () {
      expect(function () {
        return scene.postProcessStages.get(0);
      }).toThrowDeveloperError();

      scene.postProcessStages.add(
        new PostProcessStage({
          fragmentShader:
            "void main() { out_FragColor = vec4(1.0, 1.0, 0.0, 1.0); }",
        })
      );
      expect(function () {
        return scene.postProcessStages.get(-1);
      }).toThrowDeveloperError();
      expect(function () {
        return scene.postProcessStages.get(1);
      }).toThrowDeveloperError();
    });

    it("removes all", function () {
      expect(scene).toRender([0, 0, 0, 255]);

      const stage1 = scene.postProcessStages.add(
        new PostProcessStage({
          fragmentShader:
            "void main() { out_FragColor = vec4(1.0, 1.0, 0.0, 1.0); }",
        })
      );
      const stage2 = scene.postProcessStages.add(
        new PostProcessStage({
          fragmentShader:
            "uniform sampler2D colorTexture;\n" +
            "in vec2 v_textureCoordinates;\n" +
            "void main() {\n" +
            "    vec4 color = texture(colorTexture, v_textureCoordinates);\n" +
            "    out_FragColor = vec4(color.r, 0.0, 1.0, 1.0);\n" +
            "}",
        })
      );
      expect(scene.postProcessStages.length).toEqual(2);

      scene.renderForSpecs();
      expect(scene).toRender([255, 0, 255, 255]);

      scene.postProcessStages.removeAll();
      expect(scene.postProcessStages.length).toEqual(0);
      expect(scene.postProcessStages.contains(stage1)).toEqual(false);
      expect(scene.postProcessStages.contains(stage2)).toEqual(false);
      expect(stage1.isDestroyed()).toEqual(true);
      expect(stage2.isDestroyed()).toEqual(true);

      scene.renderForSpecs();
      expect(scene).toRender([0, 0, 0, 255]);

      expect(scene.postProcessStages.remove(stage1)).toEqual(false);
    });

    it("gets by stage name", function () {
      const stage1 = scene.postProcessStages.add(
        new PostProcessStage({
          fragmentShader:
            "void main() { out_FragColor = vec4(1.0, 1.0, 0.0, 1.0); }",
        })
      );
      const stage2 = scene.postProcessStages.add(
        new PostProcessStage({
          fragmentShader:
            "uniform sampler2D colorTexture;\n" +
            "in vec2 v_textureCoordinates;\n" +
            "void main() {\n" +
            "    vec4 color = texture(colorTexture, v_textureCoordinates);\n" +
            "    out_FragColor = vec4(color.r, 0.0, 1.0, 1.0);\n" +
            "}",
        })
      );

      expect(scene.postProcessStages.getStageByName(stage1.name)).toEqual(
        stage1
      );
      expect(scene.postProcessStages.getStageByName(stage2.name)).toEqual(
        stage2
      );
      expect(
        scene.postProcessStages.getStageByName("invalid")
      ).not.toBeDefined();
    });

    it("gets the output texture by stage name", function () {
      const stage1 = scene.postProcessStages.add(
        new PostProcessStage({
          fragmentShader:
            "void main() { out_FragColor = vec4(1.0, 1.0, 0.0, 1.0); }",
        })
      );
      const stage2 = scene.postProcessStages.add(
        new PostProcessStage({
          fragmentShader:
            "uniform sampler2D colorTexture;\n" +
            "in vec2 v_textureCoordinates;\n" +
            "void main() {\n" +
            "    vec4 color = texture(colorTexture, v_textureCoordinates);\n" +
            "    out_FragColor = vec4(color.r, 0.0, 1.0, 1.0);\n" +
            "}",
        })
      );
      scene.postProcessStages.fxaa.enabled = true;

      scene.renderForSpecs();

      expect(
        scene.postProcessStages.getOutputTexture(stage1.name)
      ).toBeDefined();
      expect(
        scene.postProcessStages.getOutputTexture(stage2.name)
      ).toBeDefined();
      expect(
        scene.postProcessStages.getOutputTexture(
          scene.postProcessStages.fxaa.name
        )
      ).toBeDefined();
      expect(
        scene.postProcessStages.getOutputTexture(
          scene.postProcessStages.fxaa.name
        )
      ).toEqual(scene.postProcessStages.getOutputTexture(stage1.name));

      scene.postProcessStages.remove(stage1);
      expect(
        scene.postProcessStages.getOutputTexture(stage1.name)
      ).not.toBeDefined();
    });

    it("shows correct output when single stage is enabled then disabled", function () {
      const stage = scene.postProcessStages.add(
        new PostProcessStage({
          fragmentShader:
            "void main() { out_FragColor = vec4(1.0, 0.0, 1.0, 1.0); }",
        })
      );
      scene.renderForSpecs();
      expect(scene).toRender([255, 0, 255, 255]);

      stage.enabled = false;

      scene.renderForSpecs();
      expect(scene).toRender([0, 0, 0, 255]);
    });

    it("shows correct output when single stage is disabled then enabled", function () {
      const stage = scene.postProcessStages.add(
        new PostProcessStage({
          fragmentShader:
            "void main() { out_FragColor = vec4(1.0, 0.0, 1.0, 1.0); }",
        })
      );
      stage.enabled = false;

      scene.renderForSpecs();
      expect(scene).toRender([0, 0, 0, 255]);

      stage.enabled = true;

      scene.renderForSpecs();
      expect(scene).toRender([255, 0, 255, 255]);
    });

    it("shows correct output when additional stage is enabled then disabled", function () {
      scene.postProcessStages.add(
        new PostProcessStage({
          fragmentShader:
            "void main() { out_FragColor = vec4(1.0, 0.0, 1.0, 1.0); }",
        })
      );
      const stage = scene.postProcessStages.add(
        new PostProcessStage({
          fragmentShader:
            "void main() { out_FragColor = vec4(0.0, 1.0, 1.0, 1.0); }",
        })
      );

      scene.renderForSpecs();
      expect(scene).toRender([0, 255, 255, 255]);

      stage.enabled = false;

      scene.renderForSpecs();
      expect(scene).toRender([255, 0, 255, 255]);
    });

    it("shows correct output when additional stage is disabled then enabled", function () {
      scene.postProcessStages.add(
        new PostProcessStage({
          fragmentShader:
            "void main() { out_FragColor = vec4(1.0, 0.0, 1.0, 1.0); }",
        })
      );
      const stage = scene.postProcessStages.add(
        new PostProcessStage({
          fragmentShader:
            "void main() { out_FragColor = vec4(0.0, 1.0, 1.0, 1.0); }",
        })
      );
      stage.enabled = false;

      scene.renderForSpecs();
      expect(scene).toRender([255, 0, 255, 255]);

      stage.enabled = true;

      scene.renderForSpecs();
      expect(scene).toRender([0, 255, 255, 255]);
    });

    describe("HDR tonemapping", () => {
      const black = [0, 0, 0, 255];
      const grey = [0.5, 0.5, 0.5, 1.0];
      const white = [4.0, 4.0, 4.0, 1.0];
      const red = [4.0, 0.0, 0.0, 1.0];
      const green = [0.0, 4.0, 0.0, 1.0];
      const blue = [0.0, 0.0, 4.0, 1.0];

      /**
       * @param {Tonemapper} tonemapper
       * @param {number[]} inputFragColor rgba in float values to use in fragment shader
       * @param {number[]} expectedColor rgba in rgb 0-255 to use for expected rendered colors
       */
      function validateTonemapper(tonemapper, inputFragColor, expectedColor) {
        if (!scene.highDynamicRangeSupported) {
          return;
        }

        scene.postProcessStages.tonemapper = tonemapper;

        const inputColorRgb = inputFragColor.map((n) =>
          Math.floor(Math.min(Math.max(n * 255, 0), 255))
        );
        const fs =
          "void main() { \n" +
          `    out_FragColor = vec4(${inputFragColor.join(", ")}); \n` +
          "} \n";
        scene.primitives.add(new ViewportPrimitive(fs));

        // validate we start by rendering the expected color
        expect(scene)
          .withContext(`without HDR`)
          .toRenderAndCall((rgba) => {
            expect(rgba[0])
              .withContext("r")
              .toEqualEpsilon(inputColorRgb[0], 1);
            expect(rgba[1])
              .withContext("g")
              .toEqualEpsilon(inputColorRgb[1], 1);
            expect(rgba[2])
              .withContext("b")
              .toEqualEpsilon(inputColorRgb[2], 1);
            expect(rgba[3]).withContext("a").toEqual(inputColorRgb[3]);
          });
        // toggle HDR on
        scene.highDynamicRange = true;
        // validate we render a DIFFERENT color, not black, and that it matches the expected color
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual(black);
          expect(rgba).withContext(`with HDR`).not.toEqual(inputColorRgb);
          expect(rgba[0]).withContext("r").toEqual(expectedColor[0]);
          expect(rgba[1]).withContext("g").toEqual(expectedColor[1]);
          expect(rgba[2]).withContext("b").toEqual(expectedColor[2]);
          expect(rgba[3]).withContext("a").toEqual(expectedColor[3]);
        });
      }

      describe("Reinhard", () => {
        it("white", () => {
          validateTonemapper(Tonemapper.REINHARD, white, [230, 230, 230, 255]);
        });
        it("grey", () => {
          validateTonemapper(Tonemapper.REINHARD, grey, [155, 155, 155, 255]);
        });
        it("red", () => {
          validateTonemapper(Tonemapper.REINHARD, red, [230, 0, 0, 255]);
        });
        it("green", () => {
          validateTonemapper(Tonemapper.REINHARD, green, [0, 230, 0, 255]);
        });
        it("blue", () => {
          validateTonemapper(Tonemapper.REINHARD, blue, [0, 0, 230, 255]);
        });
      });

      describe("Modified Reinhard", () => {
        it("white", () => {
          // our white point is currently set to 1.0 which means pure white in = pure white out
          // this is a special check the helper cannot account for
          if (!scene.highDynamicRangeSupported) {
            return;
          }

          const fs =
            "void main() { \n" +
            "    out_FragColor = vec4(4.0, 4.0, 4.0, 1.0); \n" +
            "} \n";
          scene.primitives.add(new ViewportPrimitive(fs));

          scene.postProcessStages.tonemapper = Tonemapper.MODIFIED_REINHARD;

          expect(scene).toRender([255, 255, 255, 255]);
          scene.highDynamicRange = true;
          expect(scene).toRenderAndCall(function (rgba) {
            expect(rgba).not.toEqual(black);
            expect(rgba).toEqual([255, 255, 255, 255]);
            expect(rgba[0]).withContext("r").toEqual(255);
            expect(rgba[1]).withContext("g").toEqual(255);
            expect(rgba[2]).withContext("b").toEqual(255);
            expect(rgba[3]).withContext("a").toEqual(255);
          });
          scene.highDynamicRange = false;
        });
        it("grey", () => {
          validateTonemapper(
            Tonemapper.MODIFIED_REINHARD,
            [0.5, 0.5, 0.5, 1.0],
            [186, 186, 186, 255]
          );
        });
        it("red", () => {
          validateTonemapper(
            Tonemapper.MODIFIED_REINHARD,
            [0.5, 0.0, 0.0, 1.0],
            [186, 0, 0, 255]
          );
        });
        it("green", () => {
          validateTonemapper(
            Tonemapper.MODIFIED_REINHARD,
            [0.0, 0.5, 0.0, 1.0],
            [0, 186, 0, 255]
          );
        });
        it("blue", () => {
          validateTonemapper(
            Tonemapper.MODIFIED_REINHARD,
            [0.0, 0.0, 0.5, 1.0],
            [0, 0, 186, 255]
          );
        });
      });

      describe("Filmic", () => {
        it("white", () => {
          validateTonemapper(Tonemapper.FILMIC, white, [236, 236, 236, 255]);
        });
        it("grey", () => {
          validateTonemapper(Tonemapper.FILMIC, grey, [142, 142, 142, 255]);
        });
        it("red", () => {
          validateTonemapper(Tonemapper.FILMIC, red, [236, 0, 0, 255]);
        });
        it("green", () => {
          validateTonemapper(Tonemapper.FILMIC, green, [0, 236, 0, 255]);
        });
        it("blue", () => {
          validateTonemapper(Tonemapper.FILMIC, blue, [0, 0, 236, 255]);
        });
      });

      describe("ACES", () => {
        it("white", () => {
          validateTonemapper(Tonemapper.ACES, white, [245, 245, 245, 255]);
        });
        it("grey", () => {
          validateTonemapper(Tonemapper.ACES, grey, [169, 169, 169, 255]);
        });
        it("red", () => {
          validateTonemapper(Tonemapper.ACES, red, [245, 0, 0, 255]);
        });
        it("green", () => {
          validateTonemapper(Tonemapper.ACES, green, [0, 245, 0, 255]);
        });
        it("blue", () => {
          validateTonemapper(Tonemapper.ACES, blue, [0, 0, 245, 255]);
        });
      });

      describe("PBR Neutral", () => {
        it("white", () => {
          validateTonemapper(Tonemapper.PBR_NEUTRAL, white, [
            253,
            253,
            253,
            255,
          ]);
        });
        it("grey", () => {
          validateTonemapper(Tonemapper.PBR_NEUTRAL, grey, [
            179,
            179,
            179,
            255,
          ]);
        });
        it("red", () => {
          validateTonemapper(Tonemapper.PBR_NEUTRAL, red, [253, 149, 149, 255]);
        });
        it("green", () => {
          validateTonemapper(Tonemapper.PBR_NEUTRAL, green, [
            149,
            253,
            149,
            255,
          ]);
        });
        it("blue", () => {
          validateTonemapper(Tonemapper.PBR_NEUTRAL, blue, [
            149,
            149,
            253,
            255,
          ]);
        });
      });
    });

    it("destroys", function () {
      const stages = new PostProcessStageCollection();
      const stage = stages.add(
        new PostProcessStage({
          fragmentShader: "void main() { out_FragColor = vec4(1.0); }",
        })
      );
      expect(stages.isDestroyed()).toEqual(false);
      stages.destroy();
      expect(stages.isDestroyed()).toEqual(true);
      expect(stage.isDestroyed()).toEqual(true);
    });
  },
  "WebGL"
);
