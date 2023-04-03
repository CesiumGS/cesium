import {
  Cartesian3,
  HeadingPitchRoll,
  HeadingPitchRange,
  Transforms,
  PostProcessStageLibrary,
} from "../../index.js";

import createCanvas from "../../../../Specs/createCanvas.js";
import createScene from "../../../../Specs/createScene.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";
import ViewportPrimitive from "../../../../Specs/ViewportPrimitive.js";
import loadAndZoomToModelAsync from "./Model/loadAndZoomToModelAsync.js";

describe(
  "Scene/PostProcessStageLibrary",
  function () {
    const boxTexturedUrl =
      "./Data/Models/glTF-2.0/BoxTextured/glTF/BoxTextured.gltf";

    let scene;
    let originalBloomBrightness;

    beforeAll(function () {
      scene = createScene({
        canvas: createCanvas(3, 3),
      });

      originalBloomBrightness =
        scene.postProcessStages.bloom.uniforms.brightness;
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      scene.postProcessStages.removeAll();
      scene.primitives.removeAll();

      scene.postProcessStages.fxaa.enabled = false;
      scene.postProcessStages.bloom.enabled = false;
      scene.postProcessStages.bloom.uniforms.brightness = originalBloomBrightness;
      scene.postProcessStages.ambientOcclusion.enabled = false;
      scene.renderForSpecs();
    });

    it("black and white", function () {
      const fs =
        "void main() { \n" +
        "    out_FragColor = vec4(1.0, 0.0, 0.0, 1.0); \n" +
        "} \n";
      scene.primitives.add(new ViewportPrimitive(fs));

      expect(scene).toRenderAndCall(function (rgba) {
        for (let i = 0; i < 3; ++i) {
          for (let j = 0; j < 3; ++j) {
            const k = i * 4 * 3 + 4 * j;
            expect(rgba[k]).toEqual(255);
            expect(rgba[k + 1]).toEqual(0);
            expect(rgba[k + 2]).toEqual(0);
            expect(rgba[k + 3]).toEqual(255);
          }
        }
      });

      scene.postProcessStages.add(
        PostProcessStageLibrary.createBlackAndWhiteStage()
      );
      scene.renderForSpecs();
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeGreaterThan(0);
        expect(rgba[1]).toEqual(rgba[0]);
        expect(rgba[2]).toEqual(rgba[0]);
        expect(rgba[3]).toEqual(255);

        for (let i = 0; i < 3; ++i) {
          for (let j = 0; j < 3; ++j) {
            const k = i * 4 * 3 + 4 * j;
            expect(rgba[k]).toEqual(rgba[0]);
            expect(rgba[k + 1]).toEqual(rgba[1]);
            expect(rgba[k + 2]).toEqual(rgba[2]);
            expect(rgba[k + 3]).toEqual(rgba[3]);
          }
        }
      });
    });

    it("per-feature black and white", function () {
      return loadAndZoomToModelAsync(
        {
          url: boxTexturedUrl,
        },
        scene
      ).then(function (model) {
        const stage = scene.postProcessStages.add(
          PostProcessStageLibrary.createBlackAndWhiteStage()
        );
        stage.selected = [];

        return pollToPromise(function () {
          scene.renderForSpecs();
          return stage.ready;
        }).then(function () {
          let color;
          expect(scene).toRenderAndCall(function (rgba) {
            color = rgba;
            expect(rgba[1]).toEqual(rgba[0]);
            expect(rgba[2]).toEqual(rgba[0]);
            expect(rgba[3]).toEqual(255);
          });

          stage.selected = [model];
          expect(scene).toRenderAndCall(function (rgba) {
            expect(rgba).not.toEqual(color);
          });
        });
      });
    });

    it("brightness", function () {
      const fs =
        "void main() { \n" +
        "    out_FragColor = vec4(vec3(0.25), 1.0); \n" +
        "} \n";
      scene.primitives.add(new ViewportPrimitive(fs));

      let red;
      let green;
      let blue;
      expect(scene).toRenderAndCall(function (rgba) {
        for (let i = 0; i < 3; ++i) {
          for (let j = 0; j < 3; ++j) {
            const k = i * 4 * 3 + 4 * j;
            expect(rgba[k]).toEqualEpsilon(Math.floor(255 * 0.25), 1.0);
            expect(rgba[k + 1]).toEqual(rgba[k]);
            expect(rgba[k + 2]).toEqual(rgba[k]);
            expect(rgba[k + 3]).toEqual(255);
          }
        }

        red = rgba[0];
        green = rgba[1];
        blue = rgba[2];
      });

      scene.postProcessStages.add(
        PostProcessStageLibrary.createBrightnessStage()
      );
      scene.renderForSpecs();
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).not.toEqual(red);
        expect(rgba[1]).not.toEqual(green);
        expect(rgba[2]).not.toEqual(blue);
        expect(rgba[3]).toEqual(255);

        for (let i = 0; i < 3; ++i) {
          for (let j = 0; j < 3; ++j) {
            const k = i * 4 * 3 + 4 * j;
            expect(rgba[k]).toEqual(rgba[0]);
            expect(rgba[k + 1]).toEqual(rgba[1]);
            expect(rgba[k + 2]).toEqual(rgba[2]);
            expect(rgba[k + 3]).toEqual(rgba[3]);
          }
        }
      });
    });

    it("night vision", function () {
      const fs =
        "void main() { \n" +
        "    out_FragColor = vec4(1.0, 0.0, 0.0, 1.0); \n" +
        "} \n";
      scene.primitives.add(new ViewportPrimitive(fs));

      expect(scene).toRenderAndCall(function (rgba) {
        for (let i = 0; i < 3; ++i) {
          for (let j = 0; j < 3; ++j) {
            const k = i * 4 * 3 + 4 * j;
            expect(rgba[k]).toEqual(255);
            expect(rgba[k + 1]).toEqual(0);
            expect(rgba[k + 2]).toEqual(0);
            expect(rgba[k + 3]).toEqual(255);
          }
        }
      });

      scene.postProcessStages.add(
        PostProcessStageLibrary.createNightVisionStage()
      );
      scene.renderForSpecs();
      expect(scene).toRenderAndCall(function (rgba) {
        for (let i = 0; i < 3; ++i) {
          for (let j = 0; j < 3; ++j) {
            const k = i * 4 * 3 + 4 * j;
            expect(rgba[k]).toEqual(0);
            expect(rgba[k + 1]).toBeGreaterThan(0);
            expect(rgba[k + 2]).toEqual(0);
            expect(rgba[k + 3]).toEqual(255);
          }
        }
      });
    });

    it("depth view", function () {
      if (!scene.context.depthTexture) {
        return;
      }

      const fs =
        "void main() { \n" +
        "    out_FragColor = vec4(1.0, 0.0, 0.0, 1.0); \n" +
        "} \n";
      scene.primitives.add(new ViewportPrimitive(fs));

      expect(scene).toRenderAndCall(function (rgba) {
        for (let i = 0; i < 3; ++i) {
          for (let j = 0; j < 3; ++j) {
            const k = i * 4 * 3 + 4 * j;
            expect(rgba[k]).toEqual(255);
            expect(rgba[k + 1]).toEqual(0);
            expect(rgba[k + 2]).toEqual(0);
            expect(rgba[k + 3]).toEqual(255);
          }
        }
      });

      scene.postProcessStages.add(
        PostProcessStageLibrary.createDepthViewStage()
      );
      scene.renderForSpecs();
      expect(scene).toRenderAndCall(function (rgba) {
        for (let i = 0; i < 3; ++i) {
          for (let j = 0; j < 3; ++j) {
            const k = i * 4 * 3 + 4 * j;
            expect(rgba[k]).toEqual(255);
            expect(rgba[k + 1]).toEqual(255);
            expect(rgba[k + 2]).toEqual(255);
            expect(rgba[k + 3]).toEqual(255);
          }
        }
      });
    });

    it("blur", function () {
      const fs =
        "void main() { \n" +
        "    out_FragColor = all(equal(floor(gl_FragCoord.xy), vec2(1.0, 1.0))) ? vec4(1.0, 0.0, 0.0, 1.0) : vec4(0.0, 0.0, 1.0, 1.0); \n" +
        "} \n";
      scene.primitives.add(new ViewportPrimitive(fs));

      expect(scene).toRenderAndCall(function (rgba) {
        for (let i = 0; i < 3; ++i) {
          for (let j = 0; j < 3; ++j) {
            if (i === 1 && j === 1) {
              continue;
            }
            const k = i * 4 * 3 + 4 * j;
            expect(rgba[k]).toEqual(0);
            expect(rgba[k + 1]).toEqual(0);
            expect(rgba[k + 2]).toEqual(255);
            expect(rgba[k + 3]).toEqual(255);
          }
        }

        expect(rgba[16]).toEqual(255);
        expect(rgba[17]).toEqual(0);
        expect(rgba[18]).toEqual(0);
        expect(rgba[19]).toEqual(255);
      });

      scene.postProcessStages.add(PostProcessStageLibrary.createBlurStage());
      scene.renderForSpecs();
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[16]).toBeGreaterThan(0);
        expect(rgba[17]).toEqual(0);
        expect(rgba[18]).toBeGreaterThan(0);
        expect(rgba[19]).toEqual(255);
      });
    });

    it("blur uniforms", function () {
      const blur = PostProcessStageLibrary.createBlurStage();
      expect(blur.uniforms.delta).toEqual(1.0);
      expect(blur.uniforms.sigma).toEqual(2.0);
      expect(blur.uniforms.stepSize).toEqual(1.0);

      blur.uniforms.delta = 2.0;
      blur.uniforms.sigma = 3.0;
      blur.uniforms.stepSize = 2.0;

      expect(blur.uniforms.delta).toEqual(2.0);
      expect(blur.uniforms.sigma).toEqual(3.0);
      expect(blur.uniforms.stepSize).toEqual(2.0);
    });

    it("depth of field", function () {
      if (!scene.context.depthTexture) {
        return;
      }

      const origin = Cartesian3.fromDegrees(-123.0744619, 44.0503706, 100.0);
      const modelMatrix = Transforms.headingPitchRollToFixedFrame(
        origin,
        new HeadingPitchRoll()
      );

      return loadAndZoomToModelAsync(
        {
          url: boxTexturedUrl,
          // Ensure the texture loads every time
          incrementallyLoadTextures: false,
          modelMatrix: modelMatrix,
        },
        scene
      ).then(function () {
        // The range is chosen carefully here. If it's too small and log depth
        // is off, the model may clip out of view. If it is too large, the
        // background will be visible in the 3x3 canvas and the color checks
        // below will fail.
        scene.camera.lookAt(origin, new HeadingPitchRange(0.0, 0.0, 1.5));

        // Render without depth of field
        let originalColor;
        expect(scene).toRenderAndCall(function (rgba) {
          originalColor = rgba;
          for (let i = 0; i < rgba.length; i += 4) {
            expect(rgba[i]).toBeGreaterThan(0);
            expect(rgba[i + 1]).toBeGreaterThan(0);
            expect(rgba[i + 2]).toBeGreaterThan(0);
            expect(rgba[i + 3]).toEqual(255);
          }
        });

        // Render with depth of field and compare
        scene.postProcessStages.add(
          PostProcessStageLibrary.createDepthOfFieldStage()
        );
        scene.renderForSpecs();
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual(originalColor);
          for (let i = 0; i < rgba.length; i += 4) {
            expect(rgba[i]).toBeGreaterThan(0);
            expect(rgba[i + 1]).toBeGreaterThan(0);
            expect(rgba[i + 2]).toBeGreaterThan(0);
            expect(rgba[i + 3]).toEqual(255);
          }
        });
      });
    });

    it("depth of field uniforms", function () {
      const dof = PostProcessStageLibrary.createDepthOfFieldStage();
      expect(dof.uniforms.focalDistance).toEqual(5.0);
      expect(dof.uniforms.delta).toEqual(1.0);
      expect(dof.uniforms.sigma).toEqual(2.0);
      expect(dof.uniforms.stepSize).toEqual(1.0);

      dof.uniforms.focalDistance = 6.0;
      dof.uniforms.delta = 2.0;
      dof.uniforms.sigma = 3.0;
      dof.uniforms.stepSize = 2.0;

      expect(dof.uniforms.focalDistance).toEqual(6.0);
      expect(dof.uniforms.delta).toEqual(2.0);
      expect(dof.uniforms.sigma).toEqual(3.0);
      expect(dof.uniforms.stepSize).toEqual(2.0);
    });

    it("ambient occlusion", function () {
      if (!scene.context.depthTexture) {
        return;
      }

      scene.postProcessStages.ambientOcclusion.enabled = true;
      scene.postProcessStages.ambientOcclusion.uniforms.ambientOcclusionOnly = true;
      scene.renderForSpecs();
      expect(scene).toRenderAndCall(function (rgba) {
        for (let i = 0; i < rgba.length; i += 4) {
          expect(rgba[i]).toEqual(255);
          expect(rgba[i + 1]).toEqual(255);
          expect(rgba[i + 2]).toEqual(255);
          expect(rgba[i + 3]).toEqual(255);
        }
      });
    });

    it("ambient occlusion uniforms", function () {
      const ao = PostProcessStageLibrary.createAmbientOcclusionStage();
      expect(ao.uniforms.ambientOcclusionOnly).toEqual(false);
      expect(ao.uniforms.intensity).toEqual(3.0);
      expect(ao.uniforms.bias).toEqual(0.1);
      expect(ao.uniforms.lengthCap).toEqual(0.26);
      expect(ao.uniforms.stepSize).toEqual(1.95);
      expect(ao.uniforms.frustumLength).toEqual(1000.0);
      expect(ao.uniforms.randomTexture).not.toBeDefined();
      expect(ao.uniforms.delta).toEqual(1.0);
      expect(ao.uniforms.sigma).toEqual(2.0);
      expect(ao.uniforms.blurStepSize).toEqual(0.86);

      ao.uniforms.ambientOcclusionOnly = true;
      ao.uniforms.intensity = 4.0;
      ao.uniforms.bias = 0.2;
      ao.uniforms.lengthCap = 0.3;
      ao.uniforms.stepSize = 2.0;
      ao.uniforms.frustumLength = 1001.0;
      ao.uniforms.delta = 2.0;
      ao.uniforms.sigma = 3.0;
      ao.uniforms.blurStepSize = 2.0;

      expect(ao.uniforms.ambientOcclusionOnly).toEqual(true);
      expect(ao.uniforms.intensity).toEqual(4.0);
      expect(ao.uniforms.bias).toEqual(0.2);
      expect(ao.uniforms.lengthCap).toEqual(0.3);
      expect(ao.uniforms.stepSize).toEqual(2.0);
      expect(ao.uniforms.frustumLength).toEqual(1001.0);
      expect(ao.uniforms.delta).toEqual(2.0);
      expect(ao.uniforms.sigma).toEqual(3.0);
      expect(ao.uniforms.blurStepSize).toEqual(2.0);
    });

    it("bloom", function () {
      const origin = Cartesian3.fromDegrees(-123.0744619, 44.0503706, 100.0);
      const modelMatrix = Transforms.headingPitchRollToFixedFrame(
        origin,
        new HeadingPitchRoll()
      );

      return loadAndZoomToModelAsync(
        {
          url: boxTexturedUrl,
          // Ensure the texture loads every time
          incrementallyLoadTextures: false,
          modelMatrix: modelMatrix,
        },
        scene
      ).then(function () {
        // The range is chosen carefully here. If it's too small and log depth
        // is off, the model may clip out of view. If it is too large, the
        // background will be visible in the 3x3 canvas and the color checks
        // below will fail.
        scene.camera.lookAt(origin, new HeadingPitchRange(0.0, 0.0, 1.5));

        // Render without bloom
        let originalColor;
        expect(scene).toRenderAndCall(function (rgba) {
          originalColor = rgba;
          for (let i = 0; i < rgba.length; i += 4) {
            expect(rgba[i]).toBeGreaterThan(0);
            expect(rgba[i + 1]).toBeGreaterThan(0);
            expect(rgba[i + 2]).toBeGreaterThan(0);
            expect(rgba[i + 3]).toEqual(255);
          }
        });

        // Render with bloom and compare
        const bloom = scene.postProcessStages.bloom;
        bloom.enabled = true;
        // increase the brightness to make the difference more noticeable
        bloom.uniforms.brightness = 0.5;
        scene.renderForSpecs();
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual(originalColor);
          for (let i = 0; i < rgba.length; i += 4) {
            expect(rgba[i]).toBeGreaterThan(0);
            expect(rgba[i + 1]).toBeGreaterThan(0);
            expect(rgba[i + 2]).toBeGreaterThan(0);
            expect(rgba[i + 3]).toEqual(255);
          }
        });
      });
    });

    it("bloom uniforms", function () {
      const bloom = PostProcessStageLibrary.createBloomStage();
      expect(bloom.uniforms.glowOnly).toEqual(false);
      expect(bloom.uniforms.contrast).toEqual(128.0);
      expect(bloom.uniforms.brightness).toEqual(-0.3);
      expect(bloom.uniforms.delta).toEqual(1.0);
      expect(bloom.uniforms.sigma).toEqual(2.0);
      expect(bloom.uniforms.stepSize).toEqual(1.0);

      bloom.uniforms.glowOnly = true;
      bloom.uniforms.contrast = 0.0;
      bloom.uniforms.brightness = 3.0;
      bloom.uniforms.delta = 2.0;
      bloom.uniforms.sigma = 3.0;
      bloom.uniforms.stepSize = 2.0;

      expect(bloom.uniforms.glowOnly).toEqual(true);
      expect(bloom.uniforms.contrast).toEqual(0.0);
      expect(bloom.uniforms.brightness).toEqual(3.0);
      expect(bloom.uniforms.delta).toEqual(2.0);
      expect(bloom.uniforms.sigma).toEqual(3.0);
      expect(bloom.uniforms.stepSize).toEqual(2.0);
    });
  },
  "WebGL"
);
