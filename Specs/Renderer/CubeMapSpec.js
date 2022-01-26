import { Cartesian3 } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { defined } from "../../Source/Cesium.js";
import { PixelFormat } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { ClearCommand } from "../../Source/Cesium.js";
import { ContextLimits } from "../../Source/Cesium.js";
import { CubeMap } from "../../Source/Cesium.js";
import { PixelDatatype } from "../../Source/Cesium.js";
import { Sampler } from "../../Source/Cesium.js";
import { Texture } from "../../Source/Cesium.js";
import { TextureMagnificationFilter } from "../../Source/Cesium.js";
import { TextureMinificationFilter } from "../../Source/Cesium.js";
import { TextureWrap } from "../../Source/Cesium.js";
import createContext from "../createContext.js";
import { when } from "../../Source/Cesium.js";

describe(
  "Renderer/CubeMap",
  function () {
    let context;
    let cubeMap;

    function expectCubeMapFaces(options) {
      const cubeMap = options.cubeMap;
      const expectedColors = options.expectedColors;

      const fs =
        "uniform samplerCube u_texture;" +
        "uniform mediump vec3 u_direction;" +
        "void main() { gl_FragColor = textureCube(u_texture, normalize(u_direction)); }";

      let faceDirections = options.faceDirections;
      if (!defined(faceDirections)) {
        faceDirections = [
          new Cartesian3(1.0, 0.0, 0.0), // +X
          new Cartesian3(-1.0, 0.0, 0.0), // -X
          new Cartesian3(0.0, 1.0, 0.0), // +Y
          new Cartesian3(0.0, -1.0, 0.0), // -Y
          new Cartesian3(0.0, 0.0, 1.0), // +Z
          new Cartesian3(0.0, 0.0, -1.0), // -Z
        ];
      }

      const uniformMap = {
        direction: undefined,

        u_texture: function () {
          return cubeMap;
        },
        u_direction: function () {
          return this.direction;
        },
      };

      for (let i = 0; i < 6; ++i) {
        uniformMap.direction = faceDirections[i];
        expect({
          context: context,
          fragmentShader: fs,
          uniformMap: uniformMap,
          epsilon: options.epsilon,
        }).contextToRender(expectedColors[i]);
      }
    }

    let greenImage;
    let blueImage;
    let blueAlphaImage;
    let blueOverRedImage;
    let red16x16Image;
    let gammaImage;
    let customColorProfileImage;

    let supportsImageBitmapOptions;

    beforeAll(function () {
      context = createContext();
      supportsImageBitmapOptions = Resource.supportsImageBitmapOptions();

      const promises = [];
      promises.push(
        Resource.fetchImage("./Data/Images/Green.png").then(function (result) {
          greenImage = result;
        })
      );
      promises.push(
        Resource.fetchImage("./Data/Images/Blue.png").then(function (result) {
          blueImage = result;
        })
      );
      promises.push(
        Resource.fetchImage("./Data/Images/BlueAlpha.png").then(function (
          result
        ) {
          blueAlphaImage = result;
        })
      );
      promises.push(
        Resource.fetchImage("./Data/Images/BlueOverRed.png").then(function (
          result
        ) {
          blueOverRedImage = result;
        })
      );
      promises.push(
        Resource.fetchImage("./Data/Images/Red16x16.png").then(function (
          result
        ) {
          red16x16Image = result;
        })
      );
      promises.push(
        Resource.fetchImage("./Data/Images/Gamma.png").then(function (result) {
          gammaImage = result;
        })
      );
      promises.push(
        Resource.fetchImage("./Data/Images/CustomColorProfile.png").then(
          function (result) {
            customColorProfileImage = result;
          }
        )
      );

      return when.all(promises);
    });

    afterAll(function () {
      context.destroyForSpecs();
    });

    afterEach(function () {
      cubeMap = cubeMap && cubeMap.destroy();
    });

    it("gets the pixel format", function () {
      cubeMap = new CubeMap({
        context: context,
        width: 16,
        height: 16,
      });

      expect(cubeMap.pixelFormat).toEqual(PixelFormat.RGBA);
      expect(cubeMap.positiveX.pixelFormat).toEqual(PixelFormat.RGBA);
      expect(cubeMap.negativeX.pixelFormat).toEqual(PixelFormat.RGBA);
      expect(cubeMap.positiveY.pixelFormat).toEqual(PixelFormat.RGBA);
      expect(cubeMap.negativeY.pixelFormat).toEqual(PixelFormat.RGBA);
      expect(cubeMap.positiveZ.pixelFormat).toEqual(PixelFormat.RGBA);
      expect(cubeMap.negativeZ.pixelFormat).toEqual(PixelFormat.RGBA);
    });

    it("gets the pixel datatype", function () {
      cubeMap = new CubeMap({
        context: context,
        width: 16,
        height: 16,
      });

      expect(cubeMap.pixelDatatype).toEqual(PixelDatatype.UNSIGNED_BYTE);
      expect(cubeMap.positiveX.pixelDatatype).toEqual(
        PixelDatatype.UNSIGNED_BYTE
      );
      expect(cubeMap.negativeX.pixelDatatype).toEqual(
        PixelDatatype.UNSIGNED_BYTE
      );
      expect(cubeMap.positiveY.pixelDatatype).toEqual(
        PixelDatatype.UNSIGNED_BYTE
      );
      expect(cubeMap.negativeY.pixelDatatype).toEqual(
        PixelDatatype.UNSIGNED_BYTE
      );
      expect(cubeMap.positiveZ.pixelDatatype).toEqual(
        PixelDatatype.UNSIGNED_BYTE
      );
      expect(cubeMap.negativeZ.pixelDatatype).toEqual(
        PixelDatatype.UNSIGNED_BYTE
      );
    });

    it("sets a sampler", function () {
      cubeMap = new CubeMap({
        context: context,
        width: 16,
        height: 16,
      });

      const sampler = new Sampler({
        wrapS: TextureWrap.REPEAT,
        wrapT: TextureWrap.MIRRORED_REPEAT,
        minificationFilter: TextureMinificationFilter.NEAREST,
        magnificationFilter: TextureMagnificationFilter.NEAREST,
      });
      cubeMap.sampler = sampler;

      const s = cubeMap.sampler;
      expect(s.wrapS).toEqual(sampler.wrapS);
      expect(s.wrapT).toEqual(sampler.wrapT);
      expect(s.minificationFilter).toEqual(sampler.minificationFilter);
      expect(s.magnificationFilter).toEqual(sampler.magnificationFilter);
    });

    it("gets width and height", function () {
      cubeMap = new CubeMap({
        context: context,
        width: 16,
        height: 16,
      });

      expect(cubeMap.width).toEqual(16);
      expect(cubeMap.height).toEqual(16);
    });

    it("gets size in bytes", function () {
      cubeMap = new CubeMap({
        context: context,
        width: 16,
        height: 16,
      });

      expect(cubeMap.sizeInBytes).toEqual(256 * 4 * 6);
    });

    it("gets flip Y", function () {
      cubeMap = new CubeMap({
        context: context,
        width: 16,
        height: 16,
        flipY: true,
      });

      expect(cubeMap.flipY).toEqual(true);
    });

    it("draws with a cube map", function () {
      cubeMap = new CubeMap({
        context: context,
        source: {
          positiveX: blueImage,
          negativeX: greenImage,
          positiveY: blueImage,
          negativeY: greenImage,
          positiveZ: blueImage,
          negativeZ: greenImage,
        },
      });

      expectCubeMapFaces({
        cubeMap: cubeMap,
        expectedColors: [
          [0, 0, 255, 255], // +X is blue
          [0, 255, 0, 255], // -X is green
          [0, 0, 255, 255], // +Y is blue
          [0, 255, 0, 255], // -Y is green
          [0, 0, 255, 255], // +Z is blue
          [0, 255, 0, 255], // -Z is green
        ],
      });
    });

    it("draws with a cube map with premultiplied alpha", function () {
      cubeMap = new CubeMap({
        context: context,
        source: {
          positiveX: blueAlphaImage,
          negativeX: blueAlphaImage,
          positiveY: blueAlphaImage,
          negativeY: blueAlphaImage,
          positiveZ: blueAlphaImage,
          negativeZ: blueAlphaImage,
        },
        preMultiplyAlpha: true,
      });
      expect(cubeMap.preMultiplyAlpha).toEqual(true);

      expectCubeMapFaces({
        cubeMap: cubeMap,
        epsilon: 1,
        expectedColors: [
          [0, 0, 127, 255], // +X
          [0, 0, 127, 255], // -X
          [0, 0, 127, 255], // +Y
          [0, 0, 127, 255], // -Y
          [0, 0, 127, 255], // +Z
          [0, 0, 127, 255], // -Z
        ],
      });
    });

    it("draws with a cube map while ignoring color profiles", function () {
      if (!supportsImageBitmapOptions) {
        return;
      }

      cubeMap = new CubeMap({
        context: context,
        source: {
          positiveX: gammaImage,
          negativeX: customColorProfileImage,
          positiveY: gammaImage,
          negativeY: customColorProfileImage,
          positiveZ: gammaImage,
          negativeZ: customColorProfileImage,
        },
        skipColorSpaceConversion: true,
      });

      expectCubeMapFaces({
        cubeMap: cubeMap,
        epsilon: 1,
        expectedColors: [
          [0, 136, 0, 255], // +X
          [0, 136, 0, 255], // -X
          [0, 136, 0, 255], // +Y
          [0, 136, 0, 255], // -Y
          [0, 136, 0, 255], // +Z
          [0, 136, 0, 255], // -Z
        ],
      });
    });

    it("draws with a cube map while allowing color profiles", function () {
      if (!supportsImageBitmapOptions) {
        return;
      }

      cubeMap = new CubeMap({
        context: context,
        source: {
          positiveX: gammaImage,
          negativeX: customColorProfileImage,
          positiveY: gammaImage,
          negativeY: customColorProfileImage,
          positiveZ: gammaImage,
          negativeZ: customColorProfileImage,
        },
        skipColorSpaceConversion: false,
      });

      expectCubeMapFaces({
        cubeMap: cubeMap,
        epsilon: 1,
        expectedColors: [
          [0, 59, 0, 255], // +X
          [193, 0, 0, 255], // -X
          [0, 59, 0, 255], // +Y
          [193, 0, 0, 255], // -Y
          [0, 59, 0, 255], // +Z
          [193, 0, 0, 255], // -Z
        ],
      });
    });

    it("draws the context default cube map", function () {
      expectCubeMapFaces({
        cubeMap: context.defaultCubeMap,
        expectedColors: [
          [255, 255, 255, 255], // +X
          [255, 255, 255, 255], // -X
          [255, 255, 255, 255], // +Y
          [255, 255, 255, 255], // -Y
          [255, 255, 255, 255], // +Z
          [255, 255, 255, 255], // -Z
        ],
      });
    });

    it("creates a cube map with typed arrays", function () {
      cubeMap = new CubeMap({
        context: context,
        source: {
          positiveX: {
            width: 1,
            height: 1,
            arrayBufferView: new Uint8Array([0, 255, 255, 255]),
          },
          negativeX: {
            width: 1,
            height: 1,
            arrayBufferView: new Uint8Array([0, 0, 255, 255]),
          },
          positiveY: {
            width: 1,
            height: 1,
            arrayBufferView: new Uint8Array([0, 255, 0, 255]),
          },
          negativeY: {
            width: 1,
            height: 1,
            arrayBufferView: new Uint8Array([255, 0, 0, 255]),
          },
          positiveZ: {
            width: 1,
            height: 1,
            arrayBufferView: new Uint8Array([255, 0, 255, 255]),
          },
          negativeZ: {
            width: 1,
            height: 1,
            arrayBufferView: new Uint8Array([255, 255, 0, 255]),
          },
        },
      });

      expectCubeMapFaces({
        cubeMap: cubeMap,
        expectedColors: [
          [0, 255, 255, 255], // +X
          [0, 0, 255, 255], // -X
          [0, 255, 0, 255], // +Y
          [255, 0, 0, 255], // -Y
          [255, 0, 255, 255], // +Z
          [255, 255, 0, 255], // -Z
        ],
      });
    });

    it("creates a cube map with floating-point textures", function () {
      if (!context.floatingPointTexture) {
        return;
      }

      const positiveXColor = new Color(0.0, 1.0, 1.0, 1.0);
      const negativeXColor = new Color(0.0, 0.0, 1.0, 1.0);
      const positiveYColor = new Color(0.0, 1.0, 0.0, 1.0);
      const negativeYColor = new Color(1.0, 0.0, 0.0, 1.0);
      const positiveZColor = new Color(1.0, 0.0, 1.0, 1.0);
      const negativeZColor = new Color(1.0, 1.0, 0.0, 1.0);

      cubeMap = new CubeMap({
        context: context,
        source: {
          positiveX: {
            width: 1,
            height: 1,
            arrayBufferView: new Float32Array([
              positiveXColor.red,
              positiveXColor.green,
              positiveXColor.blue,
              positiveXColor.alpha,
            ]),
          },
          negativeX: {
            width: 1,
            height: 1,
            arrayBufferView: new Float32Array([
              negativeXColor.red,
              negativeXColor.green,
              negativeXColor.blue,
              negativeXColor.alpha,
            ]),
          },
          positiveY: {
            width: 1,
            height: 1,
            arrayBufferView: new Float32Array([
              positiveYColor.red,
              positiveYColor.green,
              positiveYColor.blue,
              positiveYColor.alpha,
            ]),
          },
          negativeY: {
            width: 1,
            height: 1,
            arrayBufferView: new Float32Array([
              negativeYColor.red,
              negativeYColor.green,
              negativeYColor.blue,
              negativeYColor.alpha,
            ]),
          },
          positiveZ: {
            width: 1,
            height: 1,
            arrayBufferView: new Float32Array([
              positiveZColor.red,
              positiveZColor.green,
              positiveZColor.blue,
              positiveZColor.alpha,
            ]),
          },
          negativeZ: {
            width: 1,
            height: 1,
            arrayBufferView: new Float32Array([
              negativeZColor.red,
              negativeZColor.green,
              negativeZColor.blue,
              negativeZColor.alpha,
            ]),
          },
        },
        pixelDatatype: PixelDatatype.FLOAT,
      });

      expectCubeMapFaces({
        cubeMap: cubeMap,
        expectedColors: [
          [0, 255, 255, 255], // +X
          [0, 0, 255, 255], // -X
          [0, 255, 0, 255], // +Y
          [255, 0, 0, 255], // -Y
          [255, 0, 255, 255], // +Z
          [255, 255, 0, 255], // -Z
        ],
      });
    });

    it("creates a cube map with floating-point textures and linear filtering", function () {
      if (!context.floatingPointTexture) {
        return;
      }

      const positiveXColor = new Color(0.0, 1.0, 1.0, 1.0);
      const negativeXColor = new Color(0.0, 0.0, 1.0, 1.0);
      const positiveYColor = new Color(0.0, 1.0, 0.0, 1.0);
      const negativeYColor = new Color(1.0, 0.0, 0.0, 1.0);
      const positiveZColor = new Color(1.0, 0.0, 1.0, 1.0);
      const negativeZColor = new Color(1.0, 1.0, 0.0, 1.0);

      cubeMap = new CubeMap({
        context: context,
        source: {
          positiveX: {
            width: 1,
            height: 1,
            arrayBufferView: new Float32Array([
              positiveXColor.red,
              positiveXColor.green,
              positiveXColor.blue,
              positiveXColor.alpha,
            ]),
          },
          negativeX: {
            width: 1,
            height: 1,
            arrayBufferView: new Float32Array([
              negativeXColor.red,
              negativeXColor.green,
              negativeXColor.blue,
              negativeXColor.alpha,
            ]),
          },
          positiveY: {
            width: 1,
            height: 1,
            arrayBufferView: new Float32Array([
              positiveYColor.red,
              positiveYColor.green,
              positiveYColor.blue,
              positiveYColor.alpha,
            ]),
          },
          negativeY: {
            width: 1,
            height: 1,
            arrayBufferView: new Float32Array([
              negativeYColor.red,
              negativeYColor.green,
              negativeYColor.blue,
              negativeYColor.alpha,
            ]),
          },
          positiveZ: {
            width: 1,
            height: 1,
            arrayBufferView: new Float32Array([
              positiveZColor.red,
              positiveZColor.green,
              positiveZColor.blue,
              positiveZColor.alpha,
            ]),
          },
          negativeZ: {
            width: 1,
            height: 1,
            arrayBufferView: new Float32Array([
              negativeZColor.red,
              negativeZColor.green,
              negativeZColor.blue,
              negativeZColor.alpha,
            ]),
          },
        },
        pixelDatatype: PixelDatatype.FLOAT,
        sampler: new Sampler({
          wrapS: TextureWrap.CLAMP_TO_EDGE,
          wrapT: TextureWrap.CLAMP_TO_EDGE,
          minificationFilter: TextureMinificationFilter.LINEAR,
          magnificationFilter: TextureMagnificationFilter.LINEAR,
        }),
      });

      const fs =
        "uniform samplerCube u_texture;" +
        "void main() { gl_FragColor = textureCube(u_texture, normalize(vec3(1.0, 1.0, 0.0))); }";

      const uniformMap = {
        u_texture: function () {
          return cubeMap;
        },
      };

      if (!context.textureFloatLinear) {
        expect({
          context: context,
          fragmentShader: fs,
          uniformMap: uniformMap,
          epsilon: 1,
        }).contextToRender(positiveYColor.toBytes());
      } else {
        Color.multiplyByScalar(positiveXColor, 1.0 - 0.5, positiveXColor);
        Color.multiplyByScalar(positiveYColor, 0.5, positiveYColor);
        const color = Color.add(positiveXColor, positiveYColor, positiveXColor);
        expect({
          context: context,
          fragmentShader: fs,
          uniformMap: uniformMap,
          epsilon: 1,
        }).contextToRender(color.toBytes());
      }
    });

    it("creates a cube map with half floating-point textures", function () {
      if (!context.halfFloatingPointTexture) {
        return;
      }

      const positiveXFloats = [12902, 13926, 14541, 15360];
      const negativeXFloats = [13926, 12902, 14541, 15360];
      const positiveYFloats = [14541, 13926, 12902, 15360];
      const negativeYFloats = [12902, 14541, 13926, 15360];
      const positiveZFloats = [13926, 14541, 12902, 15360];
      const negativeZFloats = [14541, 12902, 13926, 15360];

      const positiveXColor = new Color(0.2, 0.4, 0.6, 1.0);
      const negativeXColor = new Color(0.4, 0.2, 0.6, 1.0);
      const positiveYColor = new Color(0.6, 0.4, 0.2, 1.0);
      const negativeYColor = new Color(0.2, 0.6, 0.4, 1.0);
      const positiveZColor = new Color(0.4, 0.6, 0.2, 1.0);
      const negativeZColor = new Color(0.6, 0.2, 0.4, 1.0);

      cubeMap = new CubeMap({
        context: context,
        source: {
          positiveX: {
            width: 1,
            height: 1,
            arrayBufferView: new Uint16Array(positiveXFloats),
          },
          negativeX: {
            width: 1,
            height: 1,
            arrayBufferView: new Uint16Array(negativeXFloats),
          },
          positiveY: {
            width: 1,
            height: 1,
            arrayBufferView: new Uint16Array(positiveYFloats),
          },
          negativeY: {
            width: 1,
            height: 1,
            arrayBufferView: new Uint16Array(negativeYFloats),
          },
          positiveZ: {
            width: 1,
            height: 1,
            arrayBufferView: new Uint16Array(positiveZFloats),
          },
          negativeZ: {
            width: 1,
            height: 1,
            arrayBufferView: new Uint16Array(negativeZFloats),
          },
        },
        pixelDatatype: PixelDatatype.HALF_FLOAT,
      });

      expectCubeMapFaces({
        cubeMap: cubeMap,
        expectedColors: [
          positiveXColor.toBytes(),
          negativeXColor.toBytes(),
          positiveYColor.toBytes(),
          negativeYColor.toBytes(),
          positiveZColor.toBytes(),
          negativeZColor.toBytes(),
        ],
      });
    });

    it("creates a cube map with half floating-point textures and linear filtering", function () {
      if (!context.halfFloatingPointTexture) {
        return;
      }

      const positiveXFloats = [12902, 13926, 14541, 15360];
      const negativeXFloats = [13926, 12902, 14541, 15360];
      const positiveYFloats = [14541, 13926, 12902, 15360];
      const negativeYFloats = [12902, 14541, 13926, 15360];
      const positiveZFloats = [13926, 14541, 12902, 15360];
      const negativeZFloats = [14541, 12902, 13926, 15360];

      const positiveXColor = new Color(0.2, 0.4, 0.6, 1.0);
      const positiveYColor = new Color(0.6, 0.4, 0.2, 1.0);

      cubeMap = new CubeMap({
        context: context,
        source: {
          positiveX: {
            width: 1,
            height: 1,
            arrayBufferView: new Uint16Array(positiveXFloats),
          },
          negativeX: {
            width: 1,
            height: 1,
            arrayBufferView: new Uint16Array(negativeXFloats),
          },
          positiveY: {
            width: 1,
            height: 1,
            arrayBufferView: new Uint16Array(positiveYFloats),
          },
          negativeY: {
            width: 1,
            height: 1,
            arrayBufferView: new Uint16Array(negativeYFloats),
          },
          positiveZ: {
            width: 1,
            height: 1,
            arrayBufferView: new Uint16Array(positiveZFloats),
          },
          negativeZ: {
            width: 1,
            height: 1,
            arrayBufferView: new Uint16Array(negativeZFloats),
          },
        },
        pixelDatatype: PixelDatatype.HALF_FLOAT,
        sampler: new Sampler({
          wrapS: TextureWrap.CLAMP_TO_EDGE,
          wrapT: TextureWrap.CLAMP_TO_EDGE,
          minificationFilter: TextureMinificationFilter.LINEAR,
          magnificationFilter: TextureMagnificationFilter.LINEAR,
        }),
      });

      const fs =
        "uniform samplerCube u_texture;" +
        "void main() { gl_FragColor = textureCube(u_texture, normalize(vec3(1.0, 1.0, 0.0))); }";

      const uniformMap = {
        u_texture: function () {
          return cubeMap;
        },
      };

      if (!context.textureHalfFloatLinear) {
        expect({
          context: context,
          fragmentShader: fs,
          uniformMap: uniformMap,
          epsilon: 1,
        }).contextToRender(positiveYColor.toBytes());
      } else {
        Color.multiplyByScalar(positiveXColor, 1.0 - 0.5, positiveXColor);
        Color.multiplyByScalar(positiveYColor, 0.5, positiveYColor);
        const color = Color.add(positiveXColor, positiveYColor, positiveXColor);
        expect({
          context: context,
          fragmentShader: fs,
          uniformMap: uniformMap,
          epsilon: 1,
        }).contextToRender(color.toBytes());
      }
    });

    it("creates a cube map with typed arrays and images", function () {
      cubeMap = new CubeMap({
        context: context,
        source: {
          positiveX: blueImage,
          negativeX: greenImage,
          positiveY: {
            width: 1,
            height: 1,
            arrayBufferView: new Uint8Array([0, 255, 0, 255]),
          },
          negativeY: {
            width: 1,
            height: 1,
            arrayBufferView: new Uint8Array([255, 0, 0, 255]),
          },
          positiveZ: {
            width: 1,
            height: 1,
            arrayBufferView: new Uint8Array([0, 0, 255, 255]),
          },
          negativeZ: {
            width: 1,
            height: 1,
            arrayBufferView: new Uint8Array([255, 255, 0, 255]),
          },
        },
      });

      expectCubeMapFaces({
        cubeMap: cubeMap,
        expectedColors: [
          [0, 0, 255, 255], // +X
          [0, 255, 0, 255], // -X
          [0, 255, 0, 255], // +Y
          [255, 0, 0, 255], // -Y
          [0, 0, 255, 255], // +Z
          [255, 255, 0, 255], // -Z
        ],
      });
    });

    it("copies to a cube map", function () {
      cubeMap = new CubeMap({
        context: context,
        width: 1,
        height: 1,
      });
      cubeMap.positiveX.copyFrom({ source: blueImage });
      cubeMap.negativeX.copyFrom({ source: greenImage });
      cubeMap.positiveY.copyFrom({ source: blueImage });
      cubeMap.negativeY.copyFrom({ source: greenImage });
      cubeMap.positiveZ.copyFrom({ source: blueImage });
      cubeMap.negativeZ.copyFrom({ source: greenImage });

      expectCubeMapFaces({
        cubeMap: cubeMap,
        expectedColors: [
          [0, 0, 255, 255], // +X
          [0, 255, 0, 255], // -X
          [0, 0, 255, 255], // +Y
          [0, 255, 0, 255], // -Y
          [0, 0, 255, 255], // +Z
          [0, 255, 0, 255], // -Z
        ],
      });
    });

    it("copies from a typed array", function () {
      cubeMap = new CubeMap({
        context: context,
        width: 1,
        height: 1,
      });
      cubeMap.positiveX.copyFrom({
        source: {
          width: 1,
          height: 1,
          arrayBufferView: new Uint8Array([0, 255, 255, 255]),
        },
      });
      cubeMap.negativeX.copyFrom({
        source: {
          width: 1,
          height: 1,
          arrayBufferView: new Uint8Array([0, 0, 255, 255]),
        },
      });
      cubeMap.positiveY.copyFrom({
        source: {
          width: 1,
          height: 1,
          arrayBufferView: new Uint8Array([0, 255, 0, 255]),
        },
      });
      cubeMap.negativeY.copyFrom({
        source: {
          width: 1,
          height: 1,
          arrayBufferView: new Uint8Array([255, 0, 0, 255]),
        },
      });
      cubeMap.positiveZ.copyFrom({
        source: {
          width: 1,
          height: 1,
          arrayBufferView: new Uint8Array([255, 0, 255, 255]),
        },
      });
      cubeMap.negativeZ.copyFrom({
        source: {
          width: 1,
          height: 1,
          arrayBufferView: new Uint8Array([255, 255, 0, 255]),
        },
      });

      expectCubeMapFaces({
        cubeMap: cubeMap,
        expectedColors: [
          [0, 255, 255, 255], // +X
          [0, 0, 255, 255], // -X
          [0, 255, 0, 255], // +Y
          [255, 0, 0, 255], // -Y
          [255, 0, 255, 255], // +Z
          [255, 255, 0, 255], // -Z
        ],
      });
    });

    it("sub copies images to a cube map", function () {
      cubeMap = new CubeMap({
        context: context,
        width: 2,
        height: 2,
      });
      cubeMap.positiveX.copyFrom({
        source: {
          width: 1,
          height: 1,
          arrayBufferView: new Uint8Array([0, 255, 255, 255]),
        },
      });
      cubeMap.negativeX.copyFrom({
        source: {
          width: 1,
          height: 1,
          arrayBufferView: new Uint8Array([0, 0, 255, 255]),
        },
      });
      cubeMap.positiveY.copyFrom({
        source: {
          width: 1,
          height: 1,
          arrayBufferView: new Uint8Array([0, 255, 0, 255]),
        },
      });
      cubeMap.negativeY.copyFrom({
        source: {
          width: 1,
          height: 1,
          arrayBufferView: new Uint8Array([255, 0, 0, 255]),
        },
      });
      cubeMap.positiveZ.copyFrom({
        source: {
          width: 1,
          height: 1,
          arrayBufferView: new Uint8Array([255, 0, 255, 255]),
        },
      });
      cubeMap.negativeZ.copyFrom({
        source: {
          width: 1,
          height: 1,
          arrayBufferView: new Uint8Array([0, 255, 0, 255]),
        },
        xOffset: 1,
        yOffset: 0,
      });

      const negativeZDirection = new Cartesian3(0.25, 0.0, -1.0);
      Cartesian3.normalize(negativeZDirection, negativeZDirection);

      expectCubeMapFaces({
        cubeMap: cubeMap,
        expectedColors: [
          [0, 64, 64, 255], // +X
          [0, 0, 64, 255], // -X
          [0, 64, 0, 255], // +Y
          [64, 0, 0, 255], // -Y
          [64, 0, 64, 255], // +Z
          [0, 32, 0, 255], // -Z
        ],
        faceDirections: [
          new Cartesian3(1.0, 0.0, 0.0), // +X
          new Cartesian3(-1.0, 0.0, 0.0), // -X
          new Cartesian3(0.0, 1.0, 0.0), // +Y
          new Cartesian3(0.0, -1.0, 0.0), // -Y
          new Cartesian3(0.0, 0.0, 1.0), // +Z
          negativeZDirection, // -Z
        ],
      });
    });

    it("sub copies array buffers to a cube map", function () {
      cubeMap = new CubeMap({
        context: context,
        width: 2,
        height: 2,
      });
      cubeMap.positiveX.copyFrom({
        source: blueImage,
      });
      cubeMap.negativeX.copyFrom({
        source: greenImage,
      });
      cubeMap.positiveY.copyFrom({
        source: blueImage,
      });
      cubeMap.negativeY.copyFrom({
        source: greenImage,
      });
      cubeMap.positiveZ.copyFrom({
        source: blueImage,
      });
      cubeMap.negativeZ.copyFrom({
        source: greenImage,
        xOffset: 1,
        yOffset: 0,
      });

      const negativeZDirection = new Cartesian3(0.25, 0.0, -1.0);
      Cartesian3.normalize(negativeZDirection, negativeZDirection);

      expectCubeMapFaces({
        cubeMap: cubeMap,
        expectedColors: [
          [0, 0, 64, 255], // +X
          [0, 64, 0, 255], // -X
          [0, 0, 64, 255], // +Y
          [0, 64, 0, 255], // -Y
          [0, 0, 64, 255], // +Z
          [0, 32, 0, 255], // -Z
        ],
        faceDirections: [
          new Cartesian3(1.0, 0.0, 0.0), // +X
          new Cartesian3(-1.0, 0.0, 0.0), // -X
          new Cartesian3(0.0, 1.0, 0.0), // +Y
          new Cartesian3(0.0, -1.0, 0.0), // -Y
          new Cartesian3(0.0, 0.0, 1.0), // +Z
          negativeZDirection, // -Z
        ],
      });
    });

    it("copies from the framebuffer", function () {
      const cxt = createContext({
        webgl: {
          alpha: true, // Seems to be required for copyFromFramebuffer()
        },
      });

      cubeMap = new CubeMap({
        context: cxt,
        width: 1,
        height: 1,
      });
      cubeMap.positiveX.copyFrom({ source: blueImage });

      const fs =
        "uniform samplerCube u_cubeMap;" +
        "void main() { gl_FragColor = textureCube(u_cubeMap, vec3(1.0, 0.0, 0.0)); }";

      const uniformMap = {
        u_cubeMap: function () {
          return cubeMap;
        },
      };

      // +X is blue
      expect({
        context: cxt,
        fragmentShader: fs,
        uniformMap: uniformMap,
      }).contextToRender([0, 0, 255, 255]);

      // Clear framebuffer to red and copy to +X face
      const clearCommand = new ClearCommand({
        color: new Color(1.0, 0.0, 0.0, 1.0),
      });

      clearCommand.execute(cxt);
      expect(cxt).toReadPixels([255, 0, 0, 255]);
      cubeMap.positiveX.copyFromFramebuffer();

      ClearCommand.ALL.execute(cxt);
      expect(cxt).toReadPixels([0, 0, 0, 0]);

      // +X is red now
      expect({
        context: cxt,
        fragmentShader: fs,
        uniformMap: uniformMap,
      }).contextToRender([255, 0, 0, 255]);

      cxt.destroyForSpecs();
    });

    it("draws with a cube map and a texture", function () {
      cubeMap = new CubeMap({
        context: context,
        source: {
          positiveX: greenImage,
          negativeX: greenImage,
          positiveY: greenImage,
          negativeY: greenImage,
          positiveZ: greenImage,
          negativeZ: greenImage,
        },
      });

      let texture = new Texture({
        context: context,
        source: blueImage,
      });

      const fs =
        "uniform samplerCube u_cubeMap;" +
        "uniform sampler2D u_texture;" +
        "void main() { gl_FragColor = textureCube(u_cubeMap, vec3(1.0, 0.0, 0.0)) + texture2D(u_texture, vec2(0.0)); }";

      const uniformMap = {
        u_cubeMap: function () {
          return cubeMap;
        },
        u_texture: function () {
          return texture;
        },
      };

      expect({
        context: context,
        fragmentShader: fs,
        uniformMap: uniformMap,
      }).contextToRender([0, 255, 255, 255]);

      texture = texture.destroy();
    });

    it("generates mipmaps", function () {
      cubeMap = new CubeMap({
        context: context,
        source: {
          positiveX: blueImage,
          negativeX: greenImage,
          positiveY: blueImage,
          negativeY: greenImage,
          positiveZ: blueImage,
          negativeZ: greenImage,
        },
      });

      cubeMap.generateMipmap();
      cubeMap.sampler = new Sampler({
        minificationFilter: TextureMinificationFilter.NEAREST_MIPMAP_LINEAR,
      });

      const fs =
        "uniform samplerCube u_cubeMap;" +
        "void main() { gl_FragColor = textureCube(u_cubeMap, vec3(1.0, 0.0, 0.0)); }";

      const uniformMap = {
        u_cubeMap: function () {
          return cubeMap;
        },
      };

      expect({
        context: context,
        fragmentShader: fs,
        uniformMap: uniformMap,
      }).contextToRender([0, 0, 255, 255]);
    });

    it("gets size in bytes for mipmap", function () {
      cubeMap = new CubeMap({
        context: context,
        source: {
          positiveX: red16x16Image,
          negativeX: red16x16Image,
          positiveY: red16x16Image,
          negativeY: red16x16Image,
          positiveZ: red16x16Image,
          negativeZ: red16x16Image,
        },
      });
      cubeMap.generateMipmap();

      // Allow for some leniency with the sizeInBytes approximation
      expect(cubeMap.sizeInBytes).toEqualEpsilon(
        (16 * 16 + 8 * 8 + 4 * 4 + 2 * 2 + 1) * 4 * 6,
        10
      );
    });

    it("destroys", function () {
      const c = new CubeMap({
        context: context,
        width: 16,
        height: 16,
      });

      expect(c.isDestroyed()).toEqual(false);
      c.destroy();
      expect(c.isDestroyed()).toEqual(true);
    });

    it("fails to create (options)", function () {
      expect(function () {
        cubeMap = new CubeMap();
      }).toThrowDeveloperError();
    });

    it("fails to create (source)", function () {
      expect(function () {
        cubeMap = new CubeMap({
          context: context,
        });
      }).toThrowDeveloperError();
    });

    it("fails to create (width, no height)", function () {
      expect(function () {
        cubeMap = new CubeMap({
          context: context,
          width: 16,
        });
      }).toThrowDeveloperError();
    });

    it("fails to create (width != height)", function () {
      expect(function () {
        cubeMap = new CubeMap({
          context: context,
          width: 16,
          height: 32,
        });
      }).toThrowDeveloperError();
    });

    it("fails to create (small width)", function () {
      expect(function () {
        cubeMap = new CubeMap({
          context: context,
          width: 0,
          height: 0,
        });
      }).toThrowDeveloperError();
    });

    it("fails to create (large width)", function () {
      expect(function () {
        cubeMap = new CubeMap({
          context: context,
          width: ContextLimits.maximumCubeMapSize + 1,
          height: ContextLimits.maximumCubeMapSize + 1,
        });
      }).toThrowDeveloperError();
    });

    it("fails to create (PixelFormat)", function () {
      expect(function () {
        cubeMap = new CubeMap({
          context: context,
          width: 16,
          height: 16,
          pixelFormat: "invalid PixelFormat",
        });
      }).toThrowDeveloperError();
    });

    it("throws during creation if pixel format is depth or depth-stencil", function () {
      expect(function () {
        cubeMap = new CubeMap({
          context: context,
          width: 16,
          height: 16,
          pixelFormat: PixelFormat.DEPTH_COMPONENT,
        });
      }).toThrowDeveloperError();
    });

    it("throws during creation if pixelDatatype is FLOAT, and OES_texture_float is not supported", function () {
      if (!context.floatingPointTexture) {
        expect(function () {
          cubeMap = new CubeMap({
            context: context,
            width: 16,
            height: 16,
            pixelDatatype: PixelDatatype.FLOAT,
          });
        }).toThrowDeveloperError();
      }
    });

    it("throws during creation if pixelDatatype is HALF_FLOAT, and OES_texture_half_float is not supported", function () {
      if (!context.halfFloatingPointTexture) {
        expect(function () {
          cubeMap = new CubeMap({
            context: context,
            width: 16,
            height: 16,
            pixelDatatype: PixelDatatype.HALF_FLOAT,
          });
        }).toThrowDeveloperError();
      }
    });

    it("fails to create (pixelDatatype)", function () {
      expect(function () {
        cubeMap = new CubeMap({
          context: context,
          width: 16,
          height: 16,
          pixelFormat: PixelFormat.RGBA,
          pixelDatatype: "invalid pixelDatatype",
        });
      }).toThrowDeveloperError();
    });

    it("fails to create (source)", function () {
      expect(function () {
        cubeMap = new CubeMap({
          context: context,
          source: {},
        });
      }).toThrowDeveloperError();
    });

    it("fails to create (source width and height)", function () {
      expect(function () {
        cubeMap = new CubeMap({
          context: context,
          source: {
            positiveX: greenImage, // 1x1
            negativeX: greenImage, // 1x1
            positiveY: greenImage, // 1x1
            negativeY: greenImage, // 1x1
            positiveZ: greenImage, // 1x1
            negativeZ: blueOverRedImage, // 1x2
          },
        });
      }).toThrowDeveloperError();
    });

    it("fails to copy from no options", function () {
      cubeMap = new CubeMap({
        context: context,
        width: 16,
        height: 16,
      });

      expect(function () {
        cubeMap.positiveX.copyFrom();
      }).toThrowDeveloperError();
    });

    it("fails to copy from no image (source)", function () {
      cubeMap = new CubeMap({
        context: context,
        width: 16,
        height: 16,
      });

      expect(function () {
        cubeMap.positiveX.copyFrom({
          xOffset: 0,
          yOffset: 0,
        });
      }).toThrowDeveloperError();
    });

    it("fails to copy from an image (xOffset)", function () {
      cubeMap = new CubeMap({
        context: context,
        width: 16,
        height: 16,
      });
      const image = new Image();

      expect(function () {
        cubeMap.positiveY.copyFrom({
          source: image,
          xOffset: -1,
        });
      }).toThrowDeveloperError();
    });

    it("fails to copy from an image (yOffset)", function () {
      cubeMap = new CubeMap({
        context: context,
        width: 16,
        height: 16,
      });
      const image = new Image();

      expect(function () {
        cubeMap.positiveZ.copyFrom({
          source: image,
          xOffset: 0,
          yOffset: -1,
        });
      }).toThrowDeveloperError();
    });

    it("fails to copy from an image (width)", function () {
      cubeMap = new CubeMap({
        context: context,
        width: 16,
        height: 16,
      });
      const image = new Image();
      image.width = 16 + 1;

      expect(function () {
        cubeMap.negativeX.copyFrom({
          source: image,
        });
      }).toThrowDeveloperError();
    });

    it("fails to copy from an image (height)", function () {
      cubeMap = new CubeMap({
        context: context,
        width: 16,
        height: 16,
      });
      const image = new Image();
      image.height = 16 + 1;

      expect(function () {
        cubeMap.negativeY.copyFrom({
          source: image,
        });
      }).toThrowDeveloperError();
    });

    it("fails to copy from the framebuffer (invalid data type)", function () {
      if (context.floatingPointTexture) {
        cubeMap = new CubeMap({
          context: context,
          width: 1,
          height: 1,
          pixelDatatype: PixelDatatype.FLOAT,
        });

        expect(function () {
          cubeMap.positiveX.copyFromFramebuffer();
        }).toThrowDeveloperError();
      }
    });

    it("fails to copy from the framebuffer (xOffset)", function () {
      cubeMap = new CubeMap({
        context: context,
        width: 1,
        height: 1,
      });

      expect(function () {
        cubeMap.positiveX.copyFromFramebuffer(-1);
      }).toThrowDeveloperError();
    });

    it("fails to copy from the framebuffer (yOffset)", function () {
      cubeMap = new CubeMap({
        context: context,
        width: 1,
        height: 1,
      });

      expect(function () {
        cubeMap.positiveY.copyFromFramebuffer(0, -1);
      }).toThrowDeveloperError();
    });

    it("fails to copy from the framebuffer (framebufferXOffset)", function () {
      cubeMap = new CubeMap({
        context: context,
        width: 1,
        height: 1,
      });

      expect(function () {
        cubeMap.positiveZ.copyFromFramebuffer(0, 0, -1);
      }).toThrowDeveloperError();
    });

    it("fails to copy from the framebuffer (framebufferYOffset)", function () {
      cubeMap = new CubeMap({
        context: context,
        width: 1,
        height: 1,
      });

      expect(function () {
        cubeMap.negativeX.copyFromFramebuffer(0, 0, 0, -1);
      }).toThrowDeveloperError();
    });

    it("fails to copy from the framebuffer (width)", function () {
      cubeMap = new CubeMap({
        context: context,
        width: 1,
        height: 1,
      });

      expect(function () {
        cubeMap.negativeY.copyFromFramebuffer(0, 0, 0, 0, cubeMap.width + 1);
      }).toThrowDeveloperError();
    });

    it("fails to copy from the framebuffer (height)", function () {
      cubeMap = new CubeMap({
        context: context,
        width: 1,
        height: 1,
      });

      expect(function () {
        cubeMap.negativeZ.copyFromFramebuffer(
          0,
          0,
          0,
          0,
          0,
          cubeMap.height + 1
        );
      }).toThrowDeveloperError();
    });

    it("fails to copy from the framebuffer (FLOAT", function () {
      if (!context.floatingPointTexture) {
        return;
      }

      cubeMap = new CubeMap({
        context: context,
        width: 1,
        height: 1,
        pixelDatatype: PixelDatatype.FLOAT,
      });

      expect(function () {
        cubeMap.negativeX.copyFromFramebuffer(0, 0, 0, 0, 0, 0);
      }).toThrowDeveloperError();
    });

    it("fails to copy from the framebuffer (HALF_FLOAT", function () {
      if (!context.halfFloatingPointTexture) {
        return;
      }

      cubeMap = new CubeMap({
        context: context,
        width: 1,
        height: 1,
        pixelDatatype: PixelDatatype.HALF_FLOAT,
      });

      expect(function () {
        cubeMap.negativeX.copyFromFramebuffer(0, 0, 0, 0, 0, 0);
      }).toThrowDeveloperError();
    });

    it("fails to generate mipmaps (width)", function () {
      cubeMap = new CubeMap({
        context: context,
        width: 3,
        height: 3,
      });

      expect(function () {
        cubeMap.generateMipmap();
      }).toThrowDeveloperError();
    });

    it("fails to generate mipmaps (hint)", function () {
      cubeMap = new CubeMap({
        context: context,
        width: 16,
        height: 16,
      });

      expect(function () {
        cubeMap.generateMipmap("invalid hint");
      }).toThrowDeveloperError();
    });

    it("fails to destroy", function () {
      const c = new CubeMap({
        context: context,
        width: 16,
        height: 16,
      });
      c.destroy();

      expect(function () {
        c.destroy();
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
