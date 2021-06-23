import { Cartesian2 } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { loadKTX2 } from "../../Source/Cesium.js";
import { PixelFormat } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { ClearCommand } from "../../Source/Cesium.js";
import { ContextLimits } from "../../Source/Cesium.js";
import { PixelDatatype } from "../../Source/Cesium.js";
import { Sampler } from "../../Source/Cesium.js";
import { Texture } from "../../Source/Cesium.js";
import { TextureMagnificationFilter } from "../../Source/Cesium.js";
import { TextureMinificationFilter } from "../../Source/Cesium.js";
import { TextureWrap } from "../../Source/Cesium.js";
import createContext from "../createContext.js";
import { when } from "../../Source/Cesium.js";

describe(
  "Renderer/Texture",
  function () {
    var context;
    var greenImage;
    var blueImage;
    var blueAlphaImage;
    var blueOverRedImage;
    var blueOverRedFlippedImage;
    var red16x16Image;

    var greenKTX2Image;
    var greenBasisKTX2Image;

    var fs =
      "uniform sampler2D u_texture;" +
      "void main() { gl_FragColor = texture2D(u_texture, vec2(0.0)); }";
    var fsLuminanceAlpha =
      "uniform sampler2D u_texture;" +
      "void main() { gl_FragColor = vec4(texture2D(u_texture, vec2(0.0)).ra, 0.0, 1.0); }";
    var texture;
    var uniformMap = {
      u_texture: function () {
        return texture;
      },
    };

    beforeAll(function () {
      context = createContext();
      var promises = [];
      promises.push(
        Resource.fetchImage("./Data/Images/Green.png").then(function (image) {
          greenImage = image;
        })
      );
      promises.push(
        Resource.fetchImage("./Data/Images/Blue.png").then(function (image) {
          blueImage = image;
        })
      );
      promises.push(
        Resource.fetchImage("./Data/Images/BlueAlpha.png").then(function (
          image
        ) {
          blueAlphaImage = image;
        })
      );
      promises.push(
        Resource.fetchImage("./Data/Images/BlueOverRed.png").then(function (
          image
        ) {
          blueOverRedImage = image;
        })
      );
      // Load this image as an ImageBitmap
      promises.push(
        Resource.fetchImage({
          url: "./Data/Images/BlueOverRed.png",
          preferImageBitmap: true,
        }).then(function (image) {
          blueOverRedFlippedImage = image;
        })
      );
      promises.push(
        Resource.fetchImage("./Data/Images/Red16x16.png").then(function (
          image
        ) {
          red16x16Image = image;
        })
      );
      promises.push(
        loadKTX2("./Data/Images/Green4x4.ktx2").then(function (image) {
          greenKTX2Image = image;
        })
      );

      promises.push(
        loadKTX2("./Data/Images/Green4x4_ETC1S.ktx2").then(function (image) {
          greenBasisKTX2Image = image;
        })
      );

      return when.all(promises);
    });

    afterAll(function () {
      context.destroyForSpecs();
    });

    afterEach(function () {
      texture = texture && texture.destroy();
    });

    it("has expected default values for pixel format and datatype", function () {
      texture = new Texture({
        context: context,
        source: blueImage,
      });

      expect(texture.id).toBeDefined();
      expect(texture.pixelFormat).toEqual(PixelFormat.RGBA);
      expect(texture.pixelDatatype).toEqual(PixelDatatype.UNSIGNED_BYTE);
    });

    it("can create a texture from the framebuffer", function () {
      var command = new ClearCommand({
        color: Color.RED,
      });
      command.execute(context);

      texture = Texture.fromFramebuffer({
        context: context,
      });

      var expectedWidth = context.canvas.clientWidth;
      var expectedHeight = context.canvas.clientHeight;
      expect(texture.width).toEqual(expectedWidth);
      expect(texture.height).toEqual(expectedHeight);
      expect(texture.sizeInBytes).toEqual(
        expectedWidth *
          expectedHeight *
          PixelFormat.componentsLength(texture.pixelFormat)
      );

      command.color = Color.WHITE;
      command.execute(context);
      expect(context).toReadPixels([255, 255, 255, 255]);

      expect({
        context: context,
        fragmentShader: fs,
        uniformMap: uniformMap,
      }).contextToRender([255, 0, 0, 255]);
    });

    it("can copy from the framebuffer", function () {
      texture = new Texture({
        context: context,
        source: blueImage,
        pixelFormat: PixelFormat.RGB,
      });

      // Render blue
      expect({
        context: context,
        fragmentShader: fs,
        uniformMap: uniformMap,
      }).contextToRender([0, 0, 255, 255]);

      // Clear to red
      var command = new ClearCommand({
        color: Color.RED,
      });
      command.execute(context);
      expect(context).toReadPixels(Color.RED.toBytes());

      texture.copyFromFramebuffer();

      var expectedWidth = context.canvas.clientWidth;
      var expectedHeight = context.canvas.clientHeight;
      expect(texture.width).toEqual(expectedWidth);
      expect(texture.height).toEqual(expectedHeight);
      expect(texture.sizeInBytes).toEqual(
        expectedWidth *
          expectedHeight *
          PixelFormat.componentsLength(texture.pixelFormat)
      );

      // Clear to white
      command.color = Color.WHITE;
      command.execute(context);
      expect(context).toReadPixels(Color.WHITE.toBytes());

      // Render red
      expect({
        context: context,
        fragmentShader: fs,
        uniformMap: uniformMap,
      }).contextToRender([255, 0, 0, 255]);
    });

    it("draws the expected texture color", function () {
      texture = new Texture({
        context: context,
        source: blueImage,
        pixelFormat: PixelFormat.RGBA,
      });

      expect({
        context: context,
        fragmentShader: fs,
        uniformMap: uniformMap,
      }).contextToRender([0, 0, 255, 255]);
    });

    it("cannot flip texture when using ImageBitmap", function () {
      var topColor = new Color(0.0, 0.0, 1.0, 1.0);
      var bottomColor = new Color(1.0, 0.0, 0.0, 1.0);

      return Resource.supportsImageBitmapOptions().then(function (
        supportsImageBitmapOptions
      ) {
        if (supportsImageBitmapOptions) {
          // When imageBitmapOptions is supported, flipY on texture upload is ignored.
          bottomColor = topColor;
        }

        texture = new Texture({
          context: context,
          source: blueOverRedFlippedImage,
          pixelFormat: PixelFormat.RGBA,
          flipY: false,
        });

        expect({
          context: context,
          fragmentShader: fs,
          uniformMap: uniformMap,
        }).contextToRender(topColor.toBytes());

        // Flip the texture.
        texture = new Texture({
          context: context,
          source: blueOverRedFlippedImage,
          pixelFormat: PixelFormat.RGBA,
          flipY: true,
        });

        expect({
          context: context,
          fragmentShader: fs,
          uniformMap: uniformMap,
        }).contextToRender(bottomColor.toBytes());
      });
    });

    it("draws the expected floating-point texture color", function () {
      if (!context.floatingPointTexture) {
        return;
      }

      var color = new Color(0.2, 0.4, 0.6, 1.0);
      var floats = new Float32Array([
        color.red,
        color.green,
        color.blue,
        color.alpha,
      ]);

      texture = new Texture({
        context: context,
        pixelFormat: PixelFormat.RGBA,
        pixelDatatype: PixelDatatype.FLOAT,
        source: {
          width: 1,
          height: 1,
          arrayBufferView: floats,
        },
      });

      expect(texture.sizeInBytes).toEqual(16);

      expect({
        context: context,
        fragmentShader: fs,
        uniformMap: uniformMap,
      }).contextToRender(color.toBytes());
    });

    it("draws the expected floating-point texture color with linear filtering", function () {
      if (!context.floatingPointTexture) {
        return;
      }

      var color0 = new Color(0.2, 0.4, 0.6, 1.0);
      var color1 = new Color(0.1, 0.3, 0.5, 1.0);
      var floats = new Float32Array([
        color0.red,
        color0.green,
        color0.blue,
        color0.alpha,
        color1.red,
        color1.green,
        color1.blue,
        color1.alpha,
      ]);

      texture = new Texture({
        context: context,
        pixelFormat: PixelFormat.RGBA,
        pixelDatatype: PixelDatatype.FLOAT,
        source: {
          width: 2,
          height: 1,
          arrayBufferView: floats,
        },
        sampler: new Sampler({
          wrapS: TextureWrap.CLAMP_TO_EDGE,
          wrapT: TextureWrap.CLAMP_TO_EDGE,
          minificationFilter: TextureMinificationFilter.LINEAR,
          magnificationFilter: TextureMagnificationFilter.LINEAR,
        }),
      });

      expect(texture.sizeInBytes).toEqual(32);

      var fs =
        "uniform sampler2D u_texture;" +
        "void main() { gl_FragColor = texture2D(u_texture, vec2(0.5, 0.0)); }";

      if (!context.textureFloatLinear) {
        expect({
          context: context,
          fragmentShader: fs,
          uniformMap: uniformMap,
          epsilon: 1,
        }).contextToRender(color1.toBytes());
      } else {
        Color.multiplyByScalar(color0, 1.0 - 0.5, color0);
        Color.multiplyByScalar(color1, 0.5, color1);
        Color.add(color0, color1, color1);
        expect({
          context: context,
          fragmentShader: fs,
          uniformMap: uniformMap,
        }).contextToRender(color1.toBytes());
      }
    });

    it("draws the expected half floating-point texture color", function () {
      if (!context.halfFloatingPointTexture) {
        return;
      }

      var color = new Color(0.2, 0.4, 0.6, 1.0);
      var floats = new Uint16Array([12902, 13926, 14541, 15360]);

      texture = new Texture({
        context: context,
        pixelFormat: PixelFormat.RGBA,
        pixelDatatype: PixelDatatype.HALF_FLOAT,
        source: {
          width: 1,
          height: 1,
          arrayBufferView: floats,
        },
        flipY: false,
      });

      expect(texture.sizeInBytes).toEqual(8);

      expect({
        context: context,
        fragmentShader: fs,
        uniformMap: uniformMap,
      }).contextToRender(color.toBytes());
    });

    it("draws the expected half floating-point texture color with linear filtering", function () {
      if (!context.halfFloatingPointTexture) {
        return;
      }

      var color0 = new Color(0.2, 0.4, 0.6, 1.0);
      var color1 = new Color(0.1, 0.3, 0.5, 1.0);
      var floats = new Uint16Array([
        12902,
        13926,
        14541,
        15360,
        11878,
        13517,
        14336,
        15360,
      ]);

      texture = new Texture({
        context: context,
        pixelFormat: PixelFormat.RGBA,
        pixelDatatype: PixelDatatype.HALF_FLOAT,
        source: {
          width: 2,
          height: 1,
          arrayBufferView: floats,
        },
        flipY: false,
      });

      expect(texture.sizeInBytes).toEqual(16);

      var fs =
        "uniform sampler2D u_texture;" +
        "void main() { gl_FragColor = texture2D(u_texture, vec2(0.5, 0.0)); }";

      if (!context.textureHalfFloatLinear) {
        expect({
          context: context,
          fragmentShader: fs,
          uniformMap: uniformMap,
          epsilon: 1,
        }).contextToRender(color1.toBytes());
      } else {
        Color.multiplyByScalar(color0, 1.0 - 0.5, color0);
        Color.multiplyByScalar(color1, 0.5, color1);
        Color.add(color0, color1, color1);
        expect({
          context: context,
          fragmentShader: fs,
          uniformMap: uniformMap,
        }).contextToRender(color1.toBytes());
      }
    });

    it("draws the expected Basis compressed texture color", function () {
      if (!context.supportsBasis) {
        return;
      }

      texture = new Texture({
        context: context,
        pixelFormat: greenBasisKTX2Image.internalFormat,
        source: {
          width: greenBasisKTX2Image.width,
          height: greenBasisKTX2Image.height,
          arrayBufferView: greenBasisKTX2Image.bufferView,
        },
      });

      expect(texture.sizeInBytes).toBe(16);

      expect({
        context: context,
        fragmentShader: fs,
        uniformMap: uniformMap,
      }).contextToRender([2, 255, 2, 255]);
    });

    it("draws the expected KTX2 uncompressed texture color", function () {
      texture = new Texture({
        context: context,
        pixelFormat: greenKTX2Image.internalFormat,
        source: {
          width: greenKTX2Image.width,
          height: greenKTX2Image.height,
          arrayBufferView: greenKTX2Image.bufferView,
        },
      });

      expect(texture.sizeInBytes).toBe(48);

      expect({
        context: context,
        fragmentShader: fs,
        uniformMap: uniformMap,
      }).contextToRender([0, 255, 24, 255]);
    });

    it("renders with premultiplied alpha", function () {
      var cxt = createContext({
        webgl: {
          alpha: true,
        },
      });
      var texture = new Texture({
        context: cxt,
        source: blueAlphaImage,
        pixelFormat: PixelFormat.RGBA,
        preMultiplyAlpha: true,
      });
      var uniformMap = {
        u_texture: function () {
          return texture;
        },
      };

      expect(texture.preMultiplyAlpha).toEqual(true);
      expect({
        context: cxt,
        fragmentShader: fs,
        uniformMap: uniformMap,
        epsilon: 1,
      }).contextToRender([0, 0, 127, 127]);

      texture.destroy();
      cxt.destroyForSpecs();
    });

    it("draws textured blue and red points", function () {
      texture = new Texture({
        context: context,
        source: blueOverRedImage,
        pixelFormat: PixelFormat.RGBA,
      });

      var fragmentShaderSource = "";
      fragmentShaderSource += "uniform sampler2D u_texture;";
      fragmentShaderSource += "uniform mediump vec2 u_txCoords;";
      fragmentShaderSource +=
        "void main() { gl_FragColor = texture2D(u_texture, u_txCoords); }";

      var txCoords;
      var um = {
        u_texture: function () {
          return texture;
        },
        u_txCoords: function () {
          return txCoords;
        },
      };

      // Blue on top
      txCoords = new Cartesian2(0.5, 0.75);
      expect({
        context: context,
        fragmentShader: fragmentShaderSource,
        uniformMap: um,
      }).contextToRender([0, 0, 255, 255]);

      // Red on bottom
      txCoords = new Cartesian2(0.5, 0.25);
      expect({
        context: context,
        fragmentShader: fragmentShaderSource,
        uniformMap: um,
      }).contextToRender([255, 0, 0, 255]);
    });

    it("draws the expected luminance texture color", function () {
      var color = new Color(0.6, 0.6, 0.6, 1.0);
      var arrayBufferView = new Uint8Array([153]);

      texture = new Texture({
        context: context,
        pixelFormat: PixelFormat.LUMINANCE,
        pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
        source: {
          width: 1,
          height: 1,
          arrayBufferView: arrayBufferView,
        },
        flipY: false,
      });

      expect({
        context: context,
        fragmentShader: fs,
        uniformMap: uniformMap,
      }).contextToRender(color.toBytes());
    });

    it("draws the expected luminance alpha texture color", function () {
      var color = new Color(0.6, 0.8, 0.0, 1.0);
      var arrayBufferView = new Uint8Array([153, 204]);

      texture = new Texture({
        context: context,
        pixelFormat: PixelFormat.LUMINANCE_ALPHA,
        pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
        source: {
          width: 1,
          height: 1,
          arrayBufferView: arrayBufferView,
        },
        flipY: false,
      });

      expect({
        context: context,
        fragmentShader: fsLuminanceAlpha,
        uniformMap: uniformMap,
      }).contextToRender(color.toBytes());
    });

    it("can be created from a typed array", function () {
      var bytes = new Uint8Array([0, 255, 0, 255]);

      texture = new Texture({
        context: context,
        pixelFormat: PixelFormat.RGBA,
        pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
        source: {
          width: 1,
          height: 1,
          arrayBufferView: bytes,
        },
      });

      expect(texture.width).toEqual(1);
      expect(texture.height).toEqual(1);
      expect(texture.sizeInBytes).toEqual(4);

      expect({
        context: context,
        fragmentShader: fs,
        uniformMap: uniformMap,
      }).contextToRender([0, 255, 0, 255]);
    });

    it("can copy from a typed array", function () {
      texture = new Texture({
        context: context,
        pixelFormat: PixelFormat.RGBA,
        pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
        width: 1,
        height: 1,
      });

      var bytes = new Uint8Array(Color.NAVY.toBytes());
      texture.copyFrom({
        width: 1,
        height: 1,
        arrayBufferView: bytes,
      });

      expect(texture.width).toEqual(1);
      expect(texture.height).toEqual(1);
      expect(texture.sizeInBytes).toEqual(4);

      expect({
        context: context,
        fragmentShader: fs,
        uniformMap: uniformMap,
      }).contextToRender(Color.NAVY.toBytes());
    });

    it("can copy from a DOM element", function () {
      texture = new Texture({
        context: context,
        pixelFormat: PixelFormat.RGB,
        pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
        width: blueImage.width,
        height: blueImage.height,
      });

      texture.copyFrom(blueImage);

      expect({
        context: context,
        fragmentShader: fs,
        uniformMap: uniformMap,
        epsilon: 1,
      }).contextToRender([0, 0, 255, 255]);
    });

    it("can replace a subset of a texture", function () {
      texture = new Texture({
        context: context,
        source: blueOverRedImage,
        pixelFormat: PixelFormat.RGBA,
      });

      var fragmentShaderSource = "";
      fragmentShaderSource += "uniform sampler2D u_texture;";
      fragmentShaderSource += "uniform mediump vec2 u_txCoords;";
      fragmentShaderSource +=
        "void main() { gl_FragColor = texture2D(u_texture, u_txCoords); }";

      var txCoords;
      var um = {
        u_texture: function () {
          return texture;
        },
        u_txCoords: function () {
          return txCoords;
        },
      };

      // Blue on top
      txCoords = new Cartesian2(0.5, 0.75);
      expect({
        context: context,
        fragmentShader: fragmentShaderSource,
        uniformMap: um,
      }).contextToRender([0, 0, 255, 255]);

      // Red on bottom
      txCoords = new Cartesian2(0.5, 0.25);
      expect({
        context: context,
        fragmentShader: fragmentShaderSource,
        uniformMap: um,
      }).contextToRender([255, 0, 0, 255]);

      // After copy...
      texture.copyFrom(greenImage, 0, 1);

      // Now green on top
      txCoords = new Cartesian2(0.5, 0.75);
      expect({
        context: context,
        fragmentShader: fragmentShaderSource,
        uniformMap: um,
      }).contextToRender(Color.LIME.toBytes());

      // Still red on bottom
      txCoords = new Cartesian2(0.5, 0.25);
      expect({
        context: context,
        fragmentShader: fragmentShaderSource,
        uniformMap: um,
      }).contextToRender([255, 0, 0, 255]);
    });

    it("can generate mipmaps", function () {
      texture = new Texture({
        context: context,
        source: red16x16Image,
        pixelFormat: PixelFormat.RGBA,
        sampler: new Sampler({
          minificationFilter: TextureMinificationFilter.NEAREST_MIPMAP_LINEAR,
        }),
      });
      texture.generateMipmap();
      expect(texture.sizeInBytes).toEqualEpsilon(
        (16 * 16 + 8 * 8 + 4 * 4 + 2 * 2 + 1) * 4,
        1
      );

      expect({
        context: context,
        fragmentShader: fs,
        uniformMap: uniformMap,
      }).contextToRender([255, 0, 0, 255]);
    });

    it("can set a sampler property", function () {
      texture = new Texture({
        context: context,
        source: blueImage,
        pixelFormat: PixelFormat.RGBA,
      });

      var sampler = new Sampler({
        wrapS: TextureWrap.REPEAT,
        wrapT: TextureWrap.MIRRORED_REPEAT,
        minificationFilter: TextureMinificationFilter.NEAREST,
        magnificationFilter: TextureMagnificationFilter.NEAREST,
        maximumAnisotropy: 2.0,
      });
      texture.sampler = sampler;

      var s = texture.sampler;
      expect(s.wrapS).toEqual(sampler.wrapS);
      expect(s.wrapT).toEqual(sampler.wrapT);
      expect(s.minificationFilter).toEqual(sampler.minificationFilter);
      expect(s.magnificationFilter).toEqual(sampler.magnificationFilter);
      expect(s.maximumAnisotropy).toEqual(2.0);
    });

    it("can set sampler at construction", function () {
      texture = new Texture({
        context: context,
        source: blueImage,
        pixelFormat: PixelFormat.RGBA,
        sampler: new Sampler({
          wrapS: TextureWrap.REPEAT,
          wrapT: TextureWrap.MIRRORED_REPEAT,
          minificationFilter: TextureMinificationFilter.NEAREST,
          magnificationFilter: TextureMagnificationFilter.NEAREST,
          maximumAnisotropy: 2.0,
        }),
      });

      var s = texture.sampler;
      expect(s.wrapS).toEqual(TextureWrap.REPEAT);
      expect(s.wrapT).toEqual(TextureWrap.MIRRORED_REPEAT);
      expect(s.minificationFilter).toEqual(TextureMinificationFilter.NEAREST);
      expect(s.magnificationFilter).toEqual(TextureMagnificationFilter.NEAREST);
      expect(s.maximumAnisotropy).toEqual(2.0);
    });

    it("can get width and height", function () {
      texture = new Texture({
        context: context,
        source: blueOverRedImage,
        pixelFormat: PixelFormat.RGBA,
      });

      expect(texture.width).toEqual(1);
      expect(texture.height).toEqual(2);
    });

    it("can get whether Y is flipped", function () {
      texture = new Texture({
        context: context,
        source: blueOverRedImage,
        pixelFormat: PixelFormat.RGBA,
        flipY: true,
      });

      expect(texture.flipY).toEqual(true);
    });

    it("can get the dimensions of a texture", function () {
      texture = new Texture({
        context: context,
        width: 64,
        height: 16,
      });

      expect(texture.dimensions).toEqual(new Cartesian2(64, 16));
    });

    function expectTextureByteSize(
      width,
      height,
      pixelFormat,
      pixelDatatype,
      expectedSize
    ) {
      texture = new Texture({
        context: context,
        width: width,
        height: height,
        pixelFormat: pixelFormat,
        pixelDatatype: pixelDatatype,
      });
      expect(texture.sizeInBytes).toBe(expectedSize);
      texture = texture && texture.destroy();
    }

    it("can get the size in bytes of a texture", function () {
      // Depth textures
      if (context.depthTexture) {
        expectTextureByteSize(
          16,
          16,
          PixelFormat.DEPTH_COMPONENT,
          PixelDatatype.UNSIGNED_SHORT,
          256 * 2
        );
        expectTextureByteSize(
          16,
          16,
          PixelFormat.DEPTH_COMPONENT,
          PixelDatatype.UNSIGNED_INT,
          256 * 4
        );
        expectTextureByteSize(
          16,
          16,
          PixelFormat.DEPTH_STENCIL,
          PixelDatatype.UNSIGNED_INT_24_8,
          256 * 4
        );
      }

      // Uncompressed formats
      expectTextureByteSize(
        16,
        16,
        PixelFormat.ALPHA,
        PixelDatatype.UNSIGNED_BYTE,
        256
      );
      expectTextureByteSize(
        16,
        16,
        PixelFormat.RGB,
        PixelDatatype.UNSIGNED_BYTE,
        256 * 3
      );
      expectTextureByteSize(
        16,
        16,
        PixelFormat.RGBA,
        PixelDatatype.UNSIGNED_BYTE,
        256 * 4
      );
      expectTextureByteSize(
        16,
        16,
        PixelFormat.LUMINANCE,
        PixelDatatype.UNSIGNED_BYTE,
        256
      );
      expectTextureByteSize(
        16,
        16,
        PixelFormat.LUMINANCE_ALPHA,
        PixelDatatype.UNSIGNED_BYTE,
        256 * 2
      );
    });

    it("can be destroyed", function () {
      var t = new Texture({
        context: context,
        source: blueImage,
        pixelFormat: PixelFormat.RGBA,
      });

      expect(t.isDestroyed()).toEqual(false);
      t.destroy();
      expect(t.isDestroyed()).toEqual(true);
    });

    it("throws when creating a texture without a options", function () {
      expect(function () {
        texture = new Texture();
      }).toThrowDeveloperError();
    });

    it("throws when creating a texture without a source", function () {
      expect(function () {
        texture = new Texture({
          context: context,
        });
      }).toThrowDeveloperError();
    });

    it("throws when creating a texture with width and no height", function () {
      expect(function () {
        texture = new Texture({
          context: context,
          width: 16,
        });
      }).toThrowDeveloperError();
    });

    it("throws when creating a texture with height and no width", function () {
      expect(function () {
        texture = new Texture({
          context: context,
          height: 16,
        });
      }).toThrowDeveloperError();
    });

    it("throws when creating a texture with zero width", function () {
      expect(function () {
        texture = new Texture({
          context: context,
          width: 0,
          height: 16,
        });
      }).toThrowDeveloperError();
    });

    it("throws when creating a texture with width larger than the maximum texture size", function () {
      expect(function () {
        texture = new Texture({
          context: context,
          width: ContextLimits.maximumTextureSize + 1,
          height: 16,
        });
      }).toThrowDeveloperError();
    });

    it("throws when creating a texture with zero height", function () {
      expect(function () {
        texture = new Texture({
          context: context,
          width: 16,
          height: 0,
        });
      }).toThrowDeveloperError();
    });

    it("throws when creating a texture with height larger than the maximum texture size", function () {
      expect(function () {
        texture = new Texture({
          context: context,
          width: 16,
          height: ContextLimits.maximumTextureSize + 1,
        });
      }).toThrowDeveloperError();
    });

    it("throws when creating a texture with an invalid pixel format", function () {
      expect(function () {
        texture = new Texture({
          context: context,
          source: blueImage,
          pixelFormat: "invalid PixelFormat",
        });
      }).toThrowDeveloperError();
    });

    it("throws when creating a texture with an invalid pixel datatype", function () {
      expect(function () {
        texture = new Texture({
          context: context,
          source: blueImage,
          pixelFormat: PixelFormat.RGBA,
          pixelDatatype: "invalid pixelDatatype",
        });
      }).toThrowDeveloperError();
    });

    it("throws when creating if pixelFormat is DEPTH_COMPONENT and pixelDatatype is not UNSIGNED_SHORT or UNSIGNED_INT", function () {
      expect(function () {
        texture = new Texture({
          context: context,
          pixelFormat: PixelFormat.DEPTH_COMPONENT,
          pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
        });
      }).toThrowDeveloperError();
    });

    it("throws when creating if pixelFormat is DEPTH_STENCIL and pixelDatatype is not UNSIGNED_INT_24_8", function () {
      expect(function () {
        texture = new Texture({
          context: context,
          pixelFormat: PixelFormat.DEPTH_STENCIL,
          pixelDatatype: PixelDatatype.UNSIGNED_BYTE,
        });
      }).toThrowDeveloperError();
    });

    it("throws when creating if pixelFormat is DEPTH_COMPONENT or DEPTH_STENCIL, and source is provided", function () {
      expect(function () {
        texture = new Texture({
          context: context,
          source: blueImage,
          pixelFormat: PixelFormat.DEPTH_COMPONENT,
          pixelDatatype: PixelDatatype.UNSIGNED_SHORT,
        });
      }).toThrowDeveloperError();
    });

    it("throws when creating if pixelFormat is DEPTH_COMPONENT or DEPTH_STENCIL, and WEBGL_depth_texture is not supported", function () {
      if (!context.depthTexture) {
        expect(function () {
          texture = new Texture({
            context: context,
            width: 1,
            height: 1,
            pixelFormat: PixelFormat.DEPTH_COMPONENT,
            pixelDatatype: PixelDatatype.UNSIGNED_SHORT,
          });
        }).toThrowDeveloperError();
      }
    });

    it("throws when creating if pixelDatatype is FLOAT, and OES_texture_float is not supported", function () {
      if (!context.floatingPointTexture) {
        expect(function () {
          texture = new Texture({
            context: context,
            width: 1,
            height: 1,
            pixelFormat: PixelFormat.RGBA,
            pixelDatatype: PixelDatatype.FLOAT,
          });
        }).toThrowDeveloperError();
      }
    });

    it("throws when creating if pixelDatatype = HALF_FLOAT, and OES_texture_half_float is not supported", function () {
      if (!context.halfFloatingPointTexture) {
        expect(function () {
          texture = new Texture({
            context: context,
            width: 1,
            height: 1,
            pixelFormat: PixelDatatype.RGBA,
            pixelDatatype: PixelDatatype.HALF_FLOAT,
          });
        }).toThrowDeveloperError();
      }
    });

    it("throws when creating compressed texture and the array buffer source is undefined", function () {
      expect(function () {
        texture = new Texture({
          context: context,
          width: 4,
          height: 4,
          pixelFormat: PixelFormat.RGBA_DXT3,
        });
      }).toThrowDeveloperError();
    });

    it("throws when creating from the framebuffer with an invalid pixel format", function () {
      expect(function () {
        texture = Texture.fromFramebuffer({
          context: context,
          pixelFormat: "invalid PixelFormat",
        });
      }).toThrowDeveloperError();
    });

    it("throws when creating from the framebuffer if PixelFormat is DEPTH_COMPONENT or DEPTH_STENCIL", function () {
      expect(function () {
        texture = Texture.fromFramebuffer({
          context: context,
          pixelFormat: PixelFormat.DEPTH_COMPONENT,
        });
      }).toThrowDeveloperError();
    });

    it("throws when creating from the framebuffer with a negative framebufferXOffset", function () {
      expect(function () {
        texture = Texture.fromFramebuffer({
          context: context,
          pixelFormat: PixelFormat.RGB,
          framebufferXOffset: -1,
        });
      }).toThrowDeveloperError();
    });

    it("throws when creating from the framebuffer with a negative framebufferYOffset", function () {
      expect(function () {
        texture = Texture.fromFramebuffer({
          context: context,
          pixelFormat: PixelFormat.RGB,
          framebufferXOffset: 0,
          framebufferYOffset: -1,
        });
      }).toThrowDeveloperError();
    });

    it("throws when creating from the framebuffer with a width greater than the canvas clientWidth", function () {
      expect(function () {
        texture = Texture.fromFramebuffer({
          context: context,
          pixelFormat: PixelFormat.RGB,
          framebufferXOffset: 0,
          framebufferYOffset: 0,
          width: context.canvas.clientWidth + 1,
        });
      }).toThrowDeveloperError();
    });

    it("throws when creating from the framebuffer with a height greater than the canvas clientHeight", function () {
      expect(function () {
        texture = Texture.fromFramebuffer({
          context: context,
          pixelFormat: PixelFormat.RGB,
          framebufferXOffset: 0,
          framebufferYOffset: 0,
          width: 1,
          height: context.canvas.clientHeight + 1,
        });
      }).toThrowDeveloperError();
    });

    it("throws when copying to a texture from the framebuffer with a DEPTH_COMPONENT or DEPTH_STENCIL pixel format", function () {
      if (context.depthTexture) {
        texture = new Texture({
          context: context,
          width: 1,
          height: 1,
          pixelFormat: PixelFormat.DEPTH_COMPONENT,
          pixelDatatype: PixelDatatype.UNSIGNED_SHORT,
        });

        expect(function () {
          texture.copyFromFramebuffer();
        }).toThrowDeveloperError();
      }
    });

    it("throws when copying to a texture from the framebuffer with a compressed pixel format", function () {
      if (context.supportsBasis) {
        texture = new Texture({
          context: context,
          width: greenBasisKTX2Image.width,
          height: greenBasisKTX2Image.height,
          pixelFormat: greenBasisKTX2Image.internalFormat,
          source: {
            arrayBufferView: greenBasisKTX2Image.bufferView,
          },
        });

        expect(function () {
          texture.copyFromFramebuffer();
        }).toThrowDeveloperError();
      }
    });

    it("throws when copying to a texture from the framebuffer with a FLOAT pixel data type", function () {
      if (context.floatingPointTexture) {
        texture = new Texture({
          context: context,
          width: 1,
          height: 1,
          pixelFormat: PixelFormat.RGBA,
          pixelDatatype: PixelDatatype.FLOAT,
        });

        expect(function () {
          texture.copyFromFramebuffer();
        }).toThrowDeveloperError();
      }
    });

    it("throws when copying to a texture from the framebuffer with a HALF_FLOAT pixel data type", function () {
      if (context.halfFloatingPointTexture) {
        texture = new Texture({
          context: context,
          width: 1,
          height: 1,
          pixelFormat: PixelFormat.RGBA,
          pixelDatatype: PixelDatatype.HALF_FLOAT,
        });

        expect(function () {
          texture.copyFromFramebuffer();
        }).toThrowDeveloperError();
      }
    });

    it("throws when copying from the framebuffer with a negative xOffset", function () {
      texture = new Texture({
        context: context,
        source: blueImage,
      });

      expect(function () {
        texture.copyFromFramebuffer(-1);
      }).toThrowDeveloperError();
    });

    it("throws when copying from the framebuffer with a negative yOffset", function () {
      texture = new Texture({
        context: context,
        source: blueImage,
      });

      expect(function () {
        texture.copyFromFramebuffer(0, -1);
      }).toThrowDeveloperError();
    });

    it("throws when copying from the framebuffer with a negative framebufferXOffset", function () {
      texture = new Texture({
        context: context,
        source: blueImage,
      });

      expect(function () {
        texture.copyFromFramebuffer(0, 0, -1);
      }).toThrowDeveloperError();
    });

    it("throws when copying from the framebuffer with a negative framebufferYOffset", function () {
      texture = new Texture({
        context: context,
        source: blueImage,
      });

      expect(function () {
        texture.copyFromFramebuffer(0, 0, 0, -1);
      }).toThrowDeveloperError();
    });

    it("throws when copying from the framebuffer with a larger width", function () {
      texture = new Texture({
        context: context,
        source: blueImage,
      });

      expect(function () {
        texture.copyFromFramebuffer(0, 0, 0, 0, texture.width + 1);
      }).toThrowDeveloperError();
    });

    it("throws when copying from the framebuffer with a larger height", function () {
      texture = new Texture({
        context: context,
        source: blueImage,
      });

      expect(function () {
        texture.copyFromFramebuffer(0, 0, 0, 0, 0, texture.height + 1);
      }).toThrowDeveloperError();
    });

    it("throws when copying to a texture with a DEPTH_COMPONENT or DEPTH_STENCIL pixel format", function () {
      if (context.depthTexture) {
        texture = new Texture({
          context: context,
          width: 1,
          height: 1,
          pixelFormat: PixelFormat.DEPTH_COMPONENT,
          pixelDatatype: PixelDatatype.UNSIGNED_SHORT,
        });

        expect(function () {
          texture.copyFrom({
            arrayBufferView: new Uint16Array([0]),
            width: 1,
            height: 1,
          });
        }).toThrowDeveloperError();
      }
    });

    it("throws when copyFrom is not given a source", function () {
      texture = new Texture({
        context: context,
        source: blueImage,
      });

      expect(function () {
        texture.copyFrom();
      }).toThrowDeveloperError();
    });

    it("throws when copyFrom is given a negative xOffset", function () {
      texture = new Texture({
        context: context,
        source: blueImage,
      });

      expect(function () {
        texture.copyFrom(blueImage, -1);
      }).toThrowDeveloperError();
    });

    it("throws when copyFrom is given a negative yOffset", function () {
      texture = new Texture({
        context: context,
        source: blueImage,
      });

      expect(function () {
        texture.copyFrom(blueImage, 0, -1);
      }).toThrowDeveloperError();
    });

    it("throws when copyFrom is given a source with larger width", function () {
      texture = new Texture({
        context: context,
        source: blueImage,
      });
      var image = new Image();
      image.width = blueImage.width + 1;

      expect(function () {
        texture.copyFrom(image);
      }).toThrowDeveloperError();
    });

    it("throws when copyFrom is given a source with larger height", function () {
      texture = new Texture({
        context: context,
        source: blueImage,
      });
      var image = new Image();
      image.height = blueImage.height + 1;

      expect(function () {
        texture.copyFrom(image);
      }).toThrowDeveloperError();
    });

    it("throws when copyFrom is given a source with a compressed pixel format", function () {
      if (context.supportsBasis) {
        texture = new Texture({
          context: context,
          width: greenBasisKTX2Image.width,
          height: greenBasisKTX2Image.height,
          pixelFormat: greenBasisKTX2Image.internalFormat,
          source: {
            arrayBufferView: greenBasisKTX2Image.bufferView,
          },
        });

        var image = new Image();
        expect(function () {
          texture.copyFrom(image);
        }).toThrowDeveloperError();
      }
    });

    it("throws when generating mipmaps with a DEPTH_COMPONENT or DEPTH_STENCIL pixel format", function () {
      if (context.depthTexture) {
        texture = new Texture({
          context: context,
          width: 1,
          height: 1,
          pixelFormat: PixelFormat.DEPTH_COMPONENT,
          pixelDatatype: PixelDatatype.UNSIGNED_SHORT,
        });

        expect(function () {
          texture.generateMipmap();
        }).toThrowDeveloperError();
      }
    });

    it("throws when generating mipmaps with a compressed pixel format", function () {
      if (context.supportsBasis) {
        texture = new Texture({
          context: context,
          width: greenBasisKTX2Image.width,
          height: greenBasisKTX2Image.height,
          pixelFormat: greenBasisKTX2Image.internalFormat,
          source: {
            arrayBufferView: greenBasisKTX2Image.bufferView,
          },
        });

        expect(function () {
          texture.generateMipmap();
        }).toThrowDeveloperError();
      }
    });

    it("throws when generating mipmaps with a non-power of two width", function () {
      texture = new Texture({
        context: context,
        width: 3,
        height: 2,
      });

      expect(function () {
        texture.generateMipmap();
      }).toThrowDeveloperError();
    });

    it("throws when generating mipmaps with a non-power of two height", function () {
      texture = new Texture({
        context: context,
        width: 2,
        height: 3,
      });

      expect(function () {
        texture.generateMipmap();
      }).toThrowDeveloperError();
    });

    it("throws when generating mipmaps with an invalid hint", function () {
      texture = new Texture({
        context: context,
        source: blueImage,
      });

      expect(function () {
        texture.generateMipmap("invalid hint");
      }).toThrowDeveloperError();
    });

    it("throws when destroy is called after destroying", function () {
      var t = new Texture({
        context: context,
        source: blueImage,
        pixelFormat: PixelFormat.RGBA,
      });

      t.destroy();

      expect(function () {
        t.destroy();
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
