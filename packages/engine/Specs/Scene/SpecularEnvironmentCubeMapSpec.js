import {
  Cartesian3,
  defined,
  ComputeEngine,
  Pass,
  SpecularEnvironmentCubeMap,
} from "../../index.js";

import createContext from "../../../../Specs/createContext.js";
import createFrameState from "../../../../Specs/createFrameState.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";

describe(
  "Scene/SpecularEnvironmentCubeMap",
  function () {
    let context;
    let computeEngine;
    let cubeMap;

    const environmentMapUrl =
      "./Data/EnvironmentMap/kiara_6_afternoon_2k_ibl.ktx2";

    const fsCubeMap =
      "uniform samplerCube cubeMap;" +
      "uniform vec3 direction;" +
      "uniform float mipLevel;" +
      "void main() {" +
      "   vec4 rgba = czm_textureCube(cubeMap, direction, mipLevel);" +
      "   out_FragColor = vec4(rgba.rgb, 1.0);" +
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
      cubeMap = cubeMap && cubeMap.destroy();
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

    function sampleCubeMap(cubeMap, direction, mipLevel, callback) {
      expect({
        context: context,
        fragmentShader: fsCubeMap,
        uniformMap: {
          cubeMap: function () {
            return cubeMap._texture;
          },
          direction: function () {
            return direction;
          },
          mipLevel: function () {
            return mipLevel;
          },
        },
      }).contextToRenderAndCall(callback);
    }

    it("correctly samples the given cube map at all mip levels", async function () {
      if (!SpecularEnvironmentCubeMap.isSupported(context)) {
        return;
      }

      cubeMap = new SpecularEnvironmentCubeMap(environmentMapUrl);
      const frameState = createFrameState(context);

      await pollToPromise(function () {
        // We manually call update and execute the commands
        // because calling scene.renderForSpecs does not
        // actually execute these commands, and we need
        // to get the output of the texture.
        cubeMap.update(frameState);
        executeCommands(frameState);

        return cubeMap.ready;
      });
      const directions = {
        positiveX: new Cartesian3(1, 0, 0),
        negativeX: new Cartesian3(-1, 0, 0),
        positiveY: new Cartesian3(0, 1, 0),
        negativeY: new Cartesian3(0, -1, 0),
        positiveZ: new Cartesian3(0, 0, 1),
        negativeZ: new Cartesian3(0, 0, -1),
      };
      const directionalColors = [
        {
          positiveX: new Uint8Array([17, 21, 37, 255]),
          negativeX: new Uint8Array([60, 45, 28, 255]),
          positiveY: new Uint8Array([9, 14, 31, 255]),
          negativeY: new Uint8Array([72, 56, 36, 255]),
          positiveZ: new Uint8Array([9, 9, 6, 255]),
          negativeZ: new Uint8Array([30, 23, 13, 255]),
        },
        {
          positiveX: new Uint8Array([77, 82, 101, 255]),
          negativeX: new Uint8Array([41, 36, 36, 255]),
          positiveY: new Uint8Array([15, 18, 36, 255]),
          negativeY: new Uint8Array([92, 72, 44, 255]),
          positiveZ: new Uint8Array([17, 16, 15, 255]),
          negativeZ: new Uint8Array([48, 38, 26, 255]),
        },
        {
          positiveX: new Uint8Array([150, 159, 187, 255]),
          negativeX: new Uint8Array([38, 38, 50, 255]),
          positiveY: new Uint8Array([42, 45, 65, 255]),
          negativeY: new Uint8Array([90, 72, 45, 255]),
          positiveZ: new Uint8Array([44, 46, 57, 255]),
          negativeZ: new Uint8Array([50, 44, 41, 255]),
        },
        {
          positiveX: new Uint8Array([255, 255, 255, 255]),
          negativeX: new Uint8Array([34, 34, 46, 255]),
          positiveY: new Uint8Array([165, 167, 194, 255]),
          negativeY: new Uint8Array([81, 63, 38, 255]),
          positiveZ: new Uint8Array([161, 165, 186, 255]),
          negativeZ: new Uint8Array([48, 43, 43, 255]),
        },
        {
          positiveX: new Uint8Array([255, 255, 255, 255]),
          negativeX: new Uint8Array([33, 33, 43, 255]),
          positiveY: new Uint8Array([255, 255, 255, 255]),
          negativeY: new Uint8Array([78, 61, 38, 255]),
          positiveZ: new Uint8Array([255, 255, 255, 255]),
          negativeZ: new Uint8Array([50, 45, 48, 255]),
        },
        {
          positiveX: new Uint8Array([255, 255, 255, 255]),
          negativeX: new Uint8Array([33, 32, 40, 255]),
          positiveY: new Uint8Array([255, 255, 255, 255]),
          negativeY: new Uint8Array([72, 56, 35, 255]),
          positiveZ: new Uint8Array([255, 255, 255, 255]),
          negativeZ: new Uint8Array([48, 43, 46, 255]),
        },
        {
          positiveX: new Uint8Array([255, 255, 255, 255]),
          negativeX: new Uint8Array([34, 32, 39, 255]),
          positiveY: new Uint8Array([255, 255, 255, 255]),
          negativeY: new Uint8Array([67, 53, 34, 255]),
          positiveZ: new Uint8Array([255, 255, 255, 255]),
          negativeZ: new Uint8Array([46, 41, 45, 255]),
        },
        {
          positiveX: new Uint8Array([255, 255, 255, 255]),
          negativeX: new Uint8Array([41, 37, 44, 255]),
          positiveY: new Uint8Array([214, 214, 220, 255]),
          negativeY: new Uint8Array([115, 106, 96, 255]),
          positiveZ: new Uint8Array([214, 212, 213, 255]),
          negativeZ: new Uint8Array([105, 100, 101, 255]),
        },
      ];

      for (
        let mipLevel = 0;
        mipLevel <= cubeMap.maximumMipmapLevel;
        mipLevel++
      ) {
        for (const key in directions) {
          if (directions.hasOwnProperty(key)) {
            const direction = directions[key];
            const expectedColor = directionalColors[mipLevel][key];

            sampleCubeMap(cubeMap, direction, mipLevel, function (
              cubeMapColor
            ) {
              expect(cubeMapColor).toEqualEpsilon(expectedColor, 1);
            });
          }
        }
      }
    });

    it("caches cubemap textures", function () {
      if (!SpecularEnvironmentCubeMap.isSupported(context)) {
        return;
      }

      const cubeMap = new SpecularEnvironmentCubeMap(environmentMapUrl);
      const frameState = createFrameState(context);

      return pollToPromise(function () {
        cubeMap.update(frameState);
        return cubeMap.ready;
      })
        .then(function () {
          const cubeMap2 = new SpecularEnvironmentCubeMap(environmentMapUrl);
          cubeMap2.update(frameState);
          expect(cubeMap2.ready).toEqual(true);
          expect(cubeMap.texture).toEqual(cubeMap2.texture);
          cubeMap2.destroy();
        })
        .finally(function () {
          cubeMap.destroy();
        });
    });

    it("raises error event when environment map fails to load.", function () {
      if (!SpecularEnvironmentCubeMap.isSupported(context)) {
        return;
      }

      const cubeMap = new SpecularEnvironmentCubeMap("http://invalid.url");
      const frameState = createFrameState(context);
      let error;

      const removeListener = cubeMap.errorEvent.addEventListener((e) => {
        error = e;
        expect(cubeMap.ready).toEqual(false);
        removeListener();
      });

      return pollToPromise(
        function () {
          cubeMap.update(frameState);
          return defined(error);
        },
        { timeout: 10000 }
      );
    });
  },
  "WebGL"
);
