import {
  Cartesian2,
  Cartesian3,
  Matrix2,
  CustomShader,
  CustomShaderMode,
  LightingModel,
  TextureUniform,
  UniformType,
  VaryingType,
} from "../../../Source/Cesium.js";
import createScene from "../../createScene.js";
import pollToPromise from "../../pollToPromise.js";

describe("Scene/ModelExperimental/CustomShader", function () {
  var emptyVertexShader =
    "void vertexMain(VertexInput vsInput, inout vec3 positionMC) {}";
  var emptyFragmentShader =
    "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material) {}";

  it("constructs with default values", function () {
    var customShader = new CustomShader();

    expect(customShader.mode).toBe(CustomShaderMode.MODIFY_MATERIAL);
    expect(customShader.lightingModel).not.toBeDefined();
    expect(customShader.uniforms).toEqual({});
    expect(customShader.varyings).toEqual({});
    expect(customShader.vertexShaderText).not.toBeDefined();
    expect(customShader.fragmentShaderText).not.toBeDefined();
    expect(customShader.uniformMap).toEqual({});
  });

  it("constructs", function () {
    var customShader = new CustomShader({
      mode: CustomShaderMode.REPLACE_MATERIAL,
      lightingModel: LightingModel.PBR,
      vertexShaderText: emptyVertexShader,
      fragmentShaderText: emptyFragmentShader,
    });

    expect(customShader.mode).toBe(CustomShaderMode.REPLACE_MATERIAL);
    expect(customShader.lightingModel).toBe(LightingModel.PBR);
    expect(customShader.uniforms).toEqual({});
    expect(customShader.varyings).toEqual({});
    expect(customShader.vertexShaderText).toBe(emptyVertexShader);
    expect(customShader.fragmentShaderText).toBe(emptyFragmentShader);
    expect(customShader.uniformMap).toEqual({});
  });

  it("defines uniforms", function () {
    var uniforms = {
      u_time: {
        value: 0,
        type: UniformType.FLOAT,
      },
      u_offset: {
        value: new Cartesian2(1, 2),
        type: UniformType.VEC2,
      },
    };

    var customShader = new CustomShader({
      uniforms: uniforms,
    });

    expect(customShader.uniforms).toBe(uniforms);
    expect(customShader.uniformMap.u_time()).toBe(uniforms.u_time.value);
    expect(customShader.uniformMap.u_offset()).toBe(uniforms.u_offset.value);
  });

  it("setUniform throws for undefined uniformName", function () {
    var customShader = new CustomShader();
    expect(function () {
      return customShader.setUniform(undefined, 45);
    }).toThrowDeveloperError();
  });

  it("setUniform throws for undefined value", function () {
    var customShader = new CustomShader();
    expect(function () {
      return customShader.setUniform("u_time", undefined);
    }).toThrowDeveloperError();
  });

  it("setUniform throws for undeclared uniform", function () {
    var customShader = new CustomShader();
    expect(function () {
      return customShader.setUniform("u_time", 10);
    }).toThrowDeveloperError();
  });

  it("setUniform updates uniform values", function () {
    var uniforms = {
      u_time: {
        value: 0,
        type: UniformType.FLOAT,
      },
      u_offset: {
        value: new Cartesian2(1, 2),
        type: UniformType.VEC2,
      },
    };

    var customShader = new CustomShader({
      uniforms: uniforms,
    });

    expect(customShader.uniformMap.u_time()).toBe(0);
    customShader.setUniform("u_time", 10);
    expect(customShader.uniformMap.u_time()).toBe(10);
  });

  it("setUniform clones vectors", function () {
    var uniforms = {
      u_vector: {
        type: UniformType.VEC3,
        value: new Cartesian3(),
      },
    };

    var customShader = new CustomShader({
      uniforms: uniforms,
    });

    var value = new Cartesian3(1, 0, 0);
    customShader.setUniform("u_vector", value);
    var result = customShader.uniformMap.u_vector();
    expect(result).toEqual(value);
    expect(result).not.toBe(value);
  });

  it("setUniform clones matrices", function () {
    var uniforms = {
      u_matrix: {
        type: UniformType.MAT2,
        value: new Matrix2(),
      },
    };

    var customShader = new CustomShader({
      uniforms: uniforms,
    });

    var value = new Matrix2(2, 0, 0, 2);
    customShader.setUniform("u_matrix", value);
    var result = customShader.uniformMap.u_matrix();
    expect(result).toEqual(value);
    expect(result).not.toBe(value);
  });

  it("declares varyings", function () {
    var varyings = {
      v_dist_from_center: VaryingType.FLOAT,
      v_computedMatrix: VaryingType.MAT4,
    };

    var customShader = new CustomShader({
      varyings: varyings,
    });

    expect(customShader.varyings).toBe(varyings);
  });

  it("detects input variables in the shader text", function () {
    var customShader = new CustomShader({
      vertexShaderText: [
        "void vertexMain(VertexInput vsInput, inout vec3 positionMC)",
        "{",
        "    positionMC += vsInput.attributes.expansion * vsInput.attributes.normalMC;",
        "}",
      ].join("\n"),
      fragmentShaderText: [
        "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)",
        "{",
        "    material.normalEC = normalize(fsInput.attributes.normalEC);",
        "    material.diffuse = fsInput.attributes.color_0;",
        "    material.specular = fsInput.attributes.positionWC / 1.0e6;",
        "}",
      ].join("\n"),
    });

    var expectedVertexVariables = {
      attributeSet: {
        expansion: true,
        normalMC: true,
      },
    };
    var expectedFragmentVariables = {
      attributeSet: {
        normalEC: true,
        color_0: true,
        positionWC: true,
      },
      materialSet: {
        normalEC: true,
        diffuse: true,
        specular: true,
      },
    };

    expect(customShader.usedVariablesVertex).toEqual(expectedVertexVariables);
    expect(customShader.usedVariablesFragment).toEqual(
      expectedFragmentVariables
    );
  });

  describe("variable validation", function () {
    function makeSingleVariableVS(variableName) {
      return new CustomShader({
        vertexShaderText: [
          "void vertexMain(VertexInput vsInput, inout vec3 positionMC)",
          "{",
          "    positionMC = vsInput.attributes." + variableName + ";",
          "}",
        ].join("\n"),
      });
    }

    function makeSingleVariableFS(variableName) {
      return new CustomShader({
        fragmentShaderText: [
          "void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)",
          "{",
          "    material.diffuse = fsInput.attributes." + variableName + ";",
          "}",
        ].join("\n"),
      });
    }

    it("validates position", function () {
      expect(function () {
        return makeSingleVariableVS("position");
      }).toThrowDeveloperError();
      expect(function () {
        return makeSingleVariableVS("positionMC");
      }).not.toThrowDeveloperError();
      expect(function () {
        return makeSingleVariableVS("positionWC");
      }).toThrowDeveloperError();
      expect(function () {
        return makeSingleVariableVS("positionEC");
      }).toThrowDeveloperError();

      expect(function () {
        return makeSingleVariableFS("position");
      }).toThrowDeveloperError();
      expect(function () {
        return makeSingleVariableFS("positionMC");
      }).not.toThrowDeveloperError();
      expect(function () {
        return makeSingleVariableFS("positionWC");
      }).not.toThrowDeveloperError();
      expect(function () {
        return makeSingleVariableFS("positionEC");
      }).not.toThrowDeveloperError();
    });

    it("validates normal", function () {
      expect(function () {
        return makeSingleVariableVS("normal");
      }).toThrowDeveloperError();
      expect(function () {
        return makeSingleVariableVS("normalMC");
      }).not.toThrowDeveloperError();
      expect(function () {
        return makeSingleVariableVS("normalEC");
      }).toThrowDeveloperError();

      expect(function () {
        return makeSingleVariableFS("normal");
      }).toThrowDeveloperError();
      expect(function () {
        return makeSingleVariableFS("normalMC");
      }).toThrowDeveloperError();
      expect(function () {
        return makeSingleVariableFS("normalEC");
      }).not.toThrowDeveloperError();
    });

    it("validates tangent", function () {
      expect(function () {
        return makeSingleVariableVS("tangent");
      }).toThrowDeveloperError();
      expect(function () {
        return makeSingleVariableVS("tangentMC");
      }).not.toThrowDeveloperError();
      expect(function () {
        return makeSingleVariableVS("tangentEC");
      }).toThrowDeveloperError();

      expect(function () {
        return makeSingleVariableFS("tangent");
      }).toThrowDeveloperError();
      expect(function () {
        return makeSingleVariableFS("tangentMC");
      }).toThrowDeveloperError();
      expect(function () {
        return makeSingleVariableFS("tangentEC");
      }).not.toThrowDeveloperError();
    });

    it("validates bitangent", function () {
      expect(function () {
        return makeSingleVariableVS("bitangent");
      }).toThrowDeveloperError();
      expect(function () {
        return makeSingleVariableVS("bitangentMC");
      }).not.toThrowDeveloperError();
      expect(function () {
        return makeSingleVariableVS("bitangentEC");
      }).toThrowDeveloperError();

      expect(function () {
        return makeSingleVariableFS("bitangent");
      }).toThrowDeveloperError();
      expect(function () {
        return makeSingleVariableFS("bitangentMC");
      }).toThrowDeveloperError();
      expect(function () {
        return makeSingleVariableFS("bitangentEC");
      }).not.toThrowDeveloperError();
    });
  });

  // asynchronous code is only needed if texture uniforms are used.
  describe(
    "texture uniforms",
    function () {
      var scene;

      beforeAll(function () {
        scene = createScene();
      });

      afterAll(function () {
        scene.destroyForSpecs();
      });

      var shaders = [];
      afterEach(function () {
        for (var i = 0; i < shaders.length; i++) {
          var shader = shaders[i];
          if (!shader.isDestroyed()) {
            shader.destroy();
          }
        }
        shaders.length = 0;
      });

      var blueUrl = "Data/Images/Blue2x2.png";
      var greenUrl = "Data/Images/Green1x4.png";

      function waitForTextureLoad(customShader, textureId) {
        var textureManager = customShader._textureManager;
        var oldValue = textureManager.getTexture(textureId);
        return pollToPromise(function () {
          scene.renderForSpecs();
          customShader.update(scene.frameState);

          // Check that the texture changed. This allows waitForTextureLoad()
          // to be called multiple times in one promise chain, which is needed
          // for testing setUniform()
          return textureManager.getTexture(textureId) !== oldValue;
        }).then(function () {
          return textureManager.getTexture(textureId);
        });
      }

      it("supports texture uniforms", function () {
        var customShader = new CustomShader({
          vertexShaderText: emptyVertexShader,
          fragmentShaderText: emptyFragmentShader,
          uniforms: {
            u_blue: {
              type: UniformType.SAMPLER_2D,
              value: new TextureUniform({
                url: blueUrl,
              }),
            },
          },
        });
        shaders.push(customShader);
        expect(customShader.uniformMap.u_blue).toBeDefined();
        expect(customShader.uniformMap.u_blue()).not.toBeDefined();

        return waitForTextureLoad(customShader, "u_blue").then(function (
          texture
        ) {
          expect(customShader.uniformMap.u_blue()).toBe(texture);
          expect(texture.width).toBe(2);
          expect(texture.height).toBe(2);
        });
      });

      it("can change texture uniform value", function () {
        var customShader = new CustomShader({
          vertexShaderText: emptyVertexShader,
          fragmentShaderText: emptyFragmentShader,
          uniforms: {
            u_testTexture: {
              type: UniformType.SAMPLER_2D,
              value: new TextureUniform({
                url: blueUrl,
              }),
            },
          },
        });
        shaders.push(customShader);

        return waitForTextureLoad(customShader, "u_testTexture").then(function (
          blueTexture
        ) {
          expect(customShader.uniformMap.u_testTexture()).toBe(blueTexture);
          expect(blueTexture.width).toBe(2);
          expect(blueTexture.height).toBe(2);
          customShader.setUniform(
            "u_testTexture",
            new TextureUniform({
              url: greenUrl,
            })
          );
          return waitForTextureLoad(customShader, "u_testTexture").then(
            function (greenTexture) {
              expect(customShader.uniformMap.u_testTexture()).toBe(
                greenTexture
              );
              expect(greenTexture.width).toBe(1);
              expect(greenTexture.height).toBe(4);
            }
          );
        });
      });

      it("destroys", function () {
        var customShader = new CustomShader({
          vertexShaderText: emptyVertexShader,
          fragmentShaderText: emptyFragmentShader,
          uniforms: {
            u_blue: {
              type: UniformType.SAMPLER_2D,
              value: new TextureUniform({
                url: blueUrl,
              }),
            },
          },
        });
        shaders.push(customShader);

        return waitForTextureLoad(customShader, "u_blue").then(function (
          texture
        ) {
          expect(customShader.isDestroyed()).toBe(false);
          expect(texture.isDestroyed()).toBe(false);

          customShader.destroy();

          expect(customShader.isDestroyed()).toBe(true);
          expect(texture.isDestroyed()).toBe(true);
        });
      });
    },
    "WebGL"
  );
});
