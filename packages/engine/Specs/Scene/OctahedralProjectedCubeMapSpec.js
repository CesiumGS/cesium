import {
  ComputeEngine,
  Pass,
  OctahedralProjectedCubeMap,
} from "../../index.js";;
import { Cartesian3, defined } from "../../index.js";

import createContext from "../../../../Specs/createContext.js";;
import createFrameState from "../createFrameState.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";

describe(
  "Scene/OctahedralProjectedCubeMap",
  function () {
    let context;
    let computeEngine;
    let octahedralMap;

    const environmentMapUrl =
      "./Data/EnvironmentMap/kiara_6_afternoon_2k_ibl.ktx2";
    const fsOctahedralMap =
      "uniform sampler2D projectedMap;" +
      "uniform vec2 textureSize;" +
      "uniform vec3 direction;" +
      "uniform float lod;" +
      "uniform float maxLod;" +
      "void main() {" +
      "   vec3 color = czm_sampleOctahedralProjection(projectedMap, textureSize, direction, lod, maxLod);" +
      "   gl_FragColor = vec4(color, 1.0);" +
      "}";

    const fsCubeMap =
      "uniform samplerCube cubeMap;" +
      "uniform vec3 direction;" +
      "void main() {" +
      "   vec4 rgba = textureCube(cubeMap, direction);" +
      "   gl_FragColor = vec4(rgba.rgb, 1.0);" +
      "}";

    beforeAll(function () {
      context = createContext();
      computeEngine = new ComputeEngine(context);
    });

    afterAll(function () {
      context.destroyForSpecs();
      computeEngine.destroy();
    });

    afterEach(function () {
      octahedralMap = octahedralMap && octahedralMap.destroy();
      context.textureCache.destroyReleasedTextures();
    });

    function executeCommands(frameState) {
      const length = frameState.commandList.length;
      for (let i = 0; i < length; ++i) {
        const command = frameState.commandList[i];
        if (command.pass === Pass.COMPUTE) {
          command.execute(computeEngine);
        } else {
          command.execute(context);
        }
      }
      frameState.commandList.length = 0;
    }

    function sampleOctahedralMap(octahedralMap, direction, lod, callback) {
      expect({
        context: context,
        fragmentShader: fsOctahedralMap,
        uniformMap: {
          projectedMap: function () {
            return octahedralMap.texture;
          },
          textureSize: function () {
            return octahedralMap.texture.dimensions;
          },
          direction: function () {
            return direction;
          },
          lod: function () {
            return lod;
          },
          maxLod: function () {
            return octahedralMap.maximumMipmapLevel;
          },
        },
      }).contextToRenderAndCall(callback);
    }

    function sampleCubeMap(cubeMap, direction, callback) {
      expect({
        context: context,
        fragmentShader: fsCubeMap,
        uniformMap: {
          cubeMap: function () {
            return cubeMap;
          },
          direction: function () {
            return direction;
          },
        },
      }).contextToRenderAndCall(callback);
    }

    function expectCubeMapAndOctahedralMapEqual(octahedralMap, direction, lod) {
      return sampleCubeMap(octahedralMap._cubeMaps[lod], direction, function (
        cubeMapColor
      ) {
        const directionFlipY = direction.clone();
        directionFlipY.y *= -1;

        sampleOctahedralMap(octahedralMap, directionFlipY, lod, function (
          octahedralMapColor
        ) {
          return expect(cubeMapColor).toEqualEpsilon(octahedralMapColor, 6);
        });
      });
    }

    it("creates a packed texture with the right dimensions", function () {
      if (!OctahedralProjectedCubeMap.isSupported(context)) {
        return;
      }

      octahedralMap = new OctahedralProjectedCubeMap(environmentMapUrl);
      const frameState = createFrameState(context);

      return pollToPromise(function () {
        octahedralMap.update(frameState);
        return octahedralMap.ready;
      }).then(function () {
        expect(octahedralMap.texture.width).toEqual(770);
        expect(octahedralMap.texture.height).toEqual(512);
        expect(octahedralMap.maximumMipmapLevel).toEqual(5);
      });
    });

    it("correctly projects the given cube map and all mip levels", function () {
      if (!OctahedralProjectedCubeMap.isSupported(context)) {
        return;
      }

      octahedralMap = new OctahedralProjectedCubeMap(environmentMapUrl);
      const frameState = createFrameState(context);

      return pollToPromise(function () {
        // We manually call update and execute the commands
        // because calling scene.renderForSpecs does not
        // actually execute these commands, and we need
        // to get the output of the texture.
        octahedralMap.update(frameState);
        executeCommands(frameState);

        return octahedralMap.ready;
      }).then(function () {
        const directions = {
          positiveX: new Cartesian3(1, 0, 0),
          negativeX: new Cartesian3(-1, 0, 0),
          positiveY: new Cartesian3(0, 1, 0),
          negativeY: new Cartesian3(0, -1, 0),
          positiveZ: new Cartesian3(0, 0, 1),
          negativeZ: new Cartesian3(0, 0, -1),
        };

        for (
          let mipLevel = 0;
          mipLevel < octahedralMap.maximumMipmapLevel;
          mipLevel++
        ) {
          for (const key in directions) {
            if (directions.hasOwnProperty(key)) {
              const direction = directions[key];

              expectCubeMapAndOctahedralMapEqual(
                octahedralMap,
                direction,
                mipLevel
              );
            }
          }
        }
      });
    });

    it("caches projected textures", function () {
      if (!OctahedralProjectedCubeMap.isSupported(context)) {
        return;
      }

      const projection = new OctahedralProjectedCubeMap(environmentMapUrl);
      const frameState = createFrameState(context);

      return pollToPromise(function () {
        projection.update(frameState);
        return projection.ready;
      })
        .then(function () {
          const projection2 = new OctahedralProjectedCubeMap(environmentMapUrl);
          projection2.update(frameState);
          expect(projection2.ready).toEqual(true);
          expect(projection.texture).toEqual(projection2.texture);
          projection2.destroy();
        })
        .finally(function () {
          projection.destroy();
        });
    });

    it("rejects when environment map fails to load.", function () {
      if (!OctahedralProjectedCubeMap.isSupported(context)) {
        return;
      }

      const projection = new OctahedralProjectedCubeMap("http://invalid.url");
      const frameState = createFrameState(context);
      let error;

      projection.readyPromise
        .then(function () {
          fail("Should not resolve.");
        })
        .catch(function (e) {
          error = e;
          expect(error).toBeDefined();
          expect(projection.ready).toEqual(false);
        });

      return pollToPromise(function () {
        projection.update(frameState);
        return defined(error);
      });
    });
  },
  "WebGL"
);
