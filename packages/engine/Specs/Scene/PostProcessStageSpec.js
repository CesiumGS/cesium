import {
  BoundingRectangle,
  Color,
  defined,
  HeadingPitchRange,
  Math as CesiumMath,
  PixelFormat,
  PixelDatatype,
  PostProcessStage,
  PostProcessStageSampleMode,
} from "../../index.js";;

import createScene from "../../../../Specs/createScene.js";;
import pollToPromise from "../../../../Specs/pollToPromise.js";
import loadAndZoomToModel from "./Model/loadAndZoomToModel.js";

describe(
  "Scene/PostProcessStage",
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

    it("constructs", function () {
      const fragmentShader =
        "uniform vec4 color; void main() { gl_FragColor = color; }";
      const uniforms = { color: Color.clone(Color.RED) };
      const textureScale = 0.5;
      const forcePowerOfTwo = true;
      const sampleMode = PostProcessStageSampleMode.LINEAR;
      const pixelFormat = PixelFormat.RGB;
      const pixelDatatype = PixelDatatype.UNSIGNED_INT;
      const clearColor = Color.clone(Color.BLUE);
      const scissorRectangle = new BoundingRectangle(0, 0, 5, 5);
      const name = "wonka vision";

      const stage = new PostProcessStage({
        fragmentShader: fragmentShader,
        uniforms: uniforms,
        textureScale: textureScale,
        forcePowerOfTwo: forcePowerOfTwo,
        sampleMode: sampleMode,
        pixelFormat: pixelFormat,
        pixelDatatype: pixelDatatype,
        clearColor: clearColor,
        scissorRectangle: scissorRectangle,
        name: name,
      });
      expect(stage.fragmentShader).toEqual(fragmentShader);
      expect(stage.uniforms.color).toBeDefined();
      expect(stage.textureScale).toEqual(textureScale);
      expect(stage.forcePowerOfTwo).toEqual(forcePowerOfTwo);
      expect(stage.sampleMode).toEqual(sampleMode);
      expect(stage.pixelFormat).toEqual(stage.pixelFormat);
      expect(stage.pixelDatatype).toEqual(pixelDatatype);
      expect(stage.clearColor).toEqual(clearColor);
      expect(stage.scissorRectangle).toEqual(scissorRectangle);
      expect(stage.name).toEqual(name);
      expect(stage.outputTexture).not.toBeDefined();
    });

    it("default constructs", function () {
      const fragmentShader = "void main() { gl_FragColor = vec4(1.0); }";

      const stage = new PostProcessStage({
        fragmentShader: fragmentShader,
      });
      expect(stage.fragmentShader).toEqual(fragmentShader);
      expect(stage.uniforms).not.toBeDefined();
      expect(stage.textureScale).toEqual(1.0);
      expect(stage.forcePowerOfTwo).toEqual(false);
      expect(stage.sampleMode).toEqual(PostProcessStageSampleMode.NEAREST);
      expect(stage.pixelFormat).toEqual(PixelFormat.RGBA);
      expect(stage.pixelDatatype).toEqual(PixelDatatype.UNSIGNED_BYTE);
      expect(stage.clearColor).toEqual(Color.BLACK);
      expect(stage.scissorRectangle).toEqual(new BoundingRectangle());
      expect(stage.name).toBeDefined();
      expect(stage.outputTexture).not.toBeDefined();
    });

    it("throws without fragment shader", function () {
      expect(function () {
        return new PostProcessStage();
      }).toThrowDeveloperError();
    });

    it("throws with invalid texture scale", function () {
      const fs = "void main() { gl_FragColor = vec4(1.0); }";
      expect(function () {
        return new PostProcessStage({
          fragmentShader: fs,
          textureScale: -1.0,
        });
      }).toThrowDeveloperError();
      expect(function () {
        return new PostProcessStage({
          fragmentShader: fs,
          textureScale: 2.0,
        });
      }).toThrowDeveloperError();
    });

    it("throws if pixel format is not a color format", function () {
      expect(function () {
        return new PostProcessStage({
          fragmentShader: "void main() { gl_FragColor = vec4(1.0); }",
          pixelFormat: PixelFormat.DEPTH_STENCIL,
        });
      }).toThrowDeveloperError();
    });

    it("executes", function () {
      expect(scene).toRender([0, 0, 0, 255]);
      scene.postProcessStages.add(
        new PostProcessStage({
          fragmentShader:
            "void main() { gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0); }",
        })
      );
      scene.renderForSpecs(); // render one frame so the stage is ready
      expect(scene).toRender([255, 255, 0, 255]);
    });

    it("can use a texture uniform", function () {
      expect(scene).toRender([0, 0, 0, 255]);
      const stage = scene.postProcessStages.add(
        new PostProcessStage({
          fragmentShader:
            "uniform sampler2D texture; varying vec2 v_textureCoordinates; void main() { gl_FragColor = texture2D(texture, v_textureCoordinates); }",
          uniforms: {
            texture: "./Data/Images/Green2x2.png",
          },
        })
      );
      return pollToPromise(function () {
        scene.renderForSpecs();
        return stage.ready;
      }).then(function () {
        expect(scene).toRender([0, 255, 0, 255]);
        stage.uniforms.texture = "./Data/Images/Blue2x2.png";
        return pollToPromise(function () {
          scene.renderForSpecs();
          return stage.ready;
        }).then(function () {
          expect(scene).toRender([0, 0, 255, 255]);
        });
      });
    });

    it("can use a image uniform", function () {
      let ready = false;
      const image = new Image();
      image.src = "./Data/Images/Blue2x2.png";
      image.onload = function () {
        ready = true;
      };

      return pollToPromise(function () {
        return ready;
      }).then(function () {
        expect(scene).toRender([0, 0, 0, 255]);
        const stage = scene.postProcessStages.add(
          new PostProcessStage({
            fragmentShader:
              "uniform sampler2D texture; void main() { gl_FragColor = texture2D(texture, vec2(0.5)); }",
            uniforms: {
              texture: image,
            },
          })
        );
        return pollToPromise(function () {
          scene.renderForSpecs();
          return stage.ready;
        }).then(function () {
          expect(scene).toRender([0, 0, 255, 255]);
        });
      });
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

      const stage = s.postProcessStages.add(
        new PostProcessStage({
          fragmentShader:
            "uniform sampler2D depthTexture; void main() { gl_FragColor = vec4(1.0); }",
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

    it("per-feature post process stage", function () {
      // This model gets clipped if log depth is disabled, so zoom out
      // the camera just a little
      const offset = new HeadingPitchRange(0, -CesiumMath.PI_OVER_FOUR, 2);

      return loadAndZoomToModel(
        {
          url: "./Data/Models/glTF-2.0/BoxTextured/glTF/BoxTextured.gltf",
          offset: offset,
          incrementallyLoadTextures: false,
        },
        scene
      ).then(function (model) {
        const fs =
          "uniform sampler2D colorTexture; \n" +
          "varying vec2 v_textureCoordinates; \n" +
          "void main() { \n" +
          "    if (czm_selected(v_textureCoordinates)) { \n" +
          "        gl_FragColor = texture2D(colorTexture, v_textureCoordinates); \n" +
          "    } else { \n" +
          "        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); \n" +
          "    } \n" +
          "} \n";
        const stage = scene.postProcessStages.add(
          new PostProcessStage({
            fragmentShader: fs,
          })
        );
        stage.selected = [];
        return pollToPromise(function () {
          scene.renderForSpecs();
          return stage.ready;
        }).then(function () {
          expect(scene).toRender([255, 0, 0, 255]);
          stage.selected = [model];
          expect(scene).toRenderAndCall(function (rgba) {
            expect(rgba).not.toEqual([255, 0, 0, 255]);
          });
        });
      });
    });

    it("destroys", function () {
      const stage = new PostProcessStage({
        fragmentShader: "void main() { gl_FragColor = vec4(1.0); }",
      });
      expect(stage.isDestroyed()).toEqual(false);
      stage.destroy();
      expect(stage.isDestroyed()).toEqual(true);
    });
  },
  "WebGL"
);
