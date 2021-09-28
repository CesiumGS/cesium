import { Cartesian2 } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { Cartesian4 } from "../../Source/Cesium.js";
import { CesiumTerrainProvider } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { combine } from "../../Source/Cesium.js";
import { Credit } from "../../Source/Cesium.js";
import { defaultValue } from "../../Source/Cesium.js";
import { defined } from "../../Source/Cesium.js";
import { DistanceDisplayCondition } from "../../Source/Cesium.js";
import { Ellipsoid } from "../../Source/Cesium.js";
import { Event } from "../../Source/Cesium.js";
import { FeatureDetection } from "../../Source/Cesium.js";
import { HeadingPitchRange } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { Matrix3 } from "../../Source/Cesium.js";
import { Matrix4 } from "../../Source/Cesium.js";
import { PerspectiveFrustum } from "../../Source/Cesium.js";
import { PrimitiveType } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { Transforms } from "../../Source/Cesium.js";
import { WebGLConstants } from "../../Source/Cesium.js";
import { Pass } from "../../Source/Cesium.js";
import { RenderState } from "../../Source/Cesium.js";
import { ShaderSource } from "../../Source/Cesium.js";
import { Axis } from "../../Source/Cesium.js";
import { ClippingPlane } from "../../Source/Cesium.js";
import { ClippingPlaneCollection } from "../../Source/Cesium.js";
import { ColorBlendMode } from "../../Source/Cesium.js";
import { DracoLoader } from "../../Source/Cesium.js";
import { HeightReference } from "../../Source/Cesium.js";
import { Model } from "../../Source/Cesium.js";
import { ModelAnimationLoop } from "../../Source/Cesium.js";
import { DepthFunction } from "../../Source/Cesium.js";
import createScene from "../createScene.js";
import pollToPromise from "../pollToPromise.js";
import { when } from "../../Source/Cesium.js";
import ModelOutlineLoader from "../../Source/Scene/ModelOutlineLoader.js";

describe(
  "Scene/Model",
  function () {
    var boxUrl = "./Data/Models/Box/CesiumBoxTest.gltf";
    var boxNoTechniqueUrl = "./Data/Models/Box/CesiumBoxTest-NoTechnique.gltf";
    var boxNoIndicesUrl = "./Data/Models/Box-NoIndices/box-noindices.gltf";
    var texturedBoxUrl =
      "./Data/Models/Box-Textured/CesiumTexturedBoxTest.gltf";
    var texturedBoxSeparateUrl =
      "./Data/Models/Box-Textured-Separate/CesiumTexturedBoxTest.gltf";
    var texturedBoxBasePathUrl =
      "./Data/Models/Box-Textured-BasePath/CesiumTexturedBoxTest.gltf";
    var texturedBoxKTX2Url =
      "./Data/Models/Box-Textured-KTX2-Basis/CesiumTexturedBoxTest.gltf";
    var texturedBoxKTX2MipmapUrl =
      "./Data/Models/Box-Textured-KTX2-Mipmap/CheckerboardTexturedBoxTest.gltf";
    var texturedBoxCustomUrl =
      "./Data/Models/Box-Textured-Custom/CesiumTexturedBoxTest.gltf";
    var texturedBoxKhrBinaryUrl =
      "./Data/Models/Box-Textured-Binary/CesiumTexturedBoxTest.glb";
    var texturedBoxTextureTransformUrl =
      "./Data/Models/Box-Texture-Transform/CesiumTexturedBoxTest.gltf";
    var texturedBoxWebpUrl =
      "./Data/Models/Box-Textured-Webp/CesiumBoxWebp.gltf";
    var boxRtcUrl = "./Data/Models/Box-RTC/Box.gltf";
    var boxEcefUrl = "./Data/Models/Box-ECEF/ecef.gltf";
    var boxWithUnusedMaterial = "./Data/Models/BoxWithUnusedMaterial/Box.gltf";
    var boxArticulationsUrl =
      "./Data/Models/Box-Articulations/Box-Articulations.gltf";

    var cesiumAirUrl = "./Data/Models/CesiumAir/Cesium_Air.gltf";
    var cesiumAir_0_8Url = "./Data/Models/CesiumAir/Cesium_Air_0_8.gltf";
    var animBoxesUrl = "./Data/Models/anim-test-1-boxes/anim-test-1-boxes.gltf";
    var riggedFigureUrl =
      "./Data/Models/rigged-figure-test/rigged-figure-test.gltf";
    var riggedSimpleUrl = "./Data/Models/rigged-simple/rigged-simple.gltf";
    var boxConstantUrl = "./Data/Models/MaterialsCommon/BoxConstant.gltf";
    var boxLambertUrl = "./Data/Models/MaterialsCommon/BoxLambert.gltf";
    var boxBlinnUrl = "./Data/Models/MaterialsCommon/BoxBlinn.gltf";
    var boxPhongUrl = "./Data/Models/MaterialsCommon/BoxPhong.gltf";
    var boxNoLightUrl = "./Data/Models/MaterialsCommon/BoxNoLight.gltf";
    var boxAmbientLightUrl =
      "./Data/Models/MaterialsCommon/BoxAmbientLight.gltf";
    var boxDirectionalLightUrl =
      "./Data/Models/MaterialsCommon/BoxDirectionalLight.gltf";
    var boxPointLightUrl = "./Data/Models/MaterialsCommon/BoxPointLight.gltf";
    var boxSpotLightUrl = "./Data/Models/MaterialsCommon/BoxSpotLight.gltf";
    var boxTransparentUrl = "./Data/Models/MaterialsCommon/BoxTransparent.gltf";
    var boxColorUrl = "./Data/Models/Box-Color/Box-Color.gltf";
    var boxUint32Indices =
      "./Data/Models/Box-Uint32Indices/Box-Uint32Indices.gltf";
    var boxQuantizedUrl =
      "./Data/Models/WEB3DQuantizedAttributes/Box-Quantized.gltf";
    var boxColorQuantizedUrl =
      "./Data/Models/WEB3DQuantizedAttributes/Box-Color-Quantized.gltf";
    var boxScalarQuantizedUrl =
      "./Data/Models/WEB3DQuantizedAttributes/Box-Scalar-Quantized.gltf";
    var milkTruckQuantizedUrl =
      "./Data/Models/WEB3DQuantizedAttributes/CesiumMilkTruck-Quantized.gltf";
    var milkTruckQuantizedMismatchUrl =
      "./Data/Models/WEB3DQuantizedAttributes/CesiumMilkTruck-Mismatch-Quantized.gltf";
    var duckQuantizedUrl =
      "./Data/Models/WEB3DQuantizedAttributes/Duck-Quantized.gltf";
    var riggedSimpleQuantizedUrl =
      "./Data/Models/WEB3DQuantizedAttributes/RiggedSimple-Quantized.gltf";
    var CesiumManUrl = "./Data/Models/MaterialsCommon/Cesium_Man.gltf";
    var interpolationTestUrl =
      "./Data/Models/InterpolationTest/InterpolationTest.glb";

    var boomBoxUrl = "./Data/Models/PBR/BoomBox/BoomBox.gltf";
    var boomBoxPbrSpecularGlossinessUrl =
      "./Data/Models/PBR/BoomBoxSpecularGlossiness/BoomBox.gltf";
    var boomBoxPbrSpecularGlossinessDefaultsUrl =
      "./Data/Models/PBR/BoomBoxSpecularGlossiness/BoomBox-Default.gltf";
    var boomBoxPbrSpecularGlossinessNoTextureUrl =
      "./Data/Models/PBR/BoomBoxSpecularGlossiness/BoomBox-NoTexture.gltf";
    var boxPbrUrl = "./Data/Models/PBR/Box/Box.gltf";
    var boxPbrUnlitUrl = "./Data/Models/PBR/BoxUnlit/BoxUnlit.gltf";
    var boxAnimatedPbrUrl = "./Data/Models/PBR/BoxAnimated/BoxAnimated.gltf";
    var boxInterleavedPbrUrl =
      "./Data/Models/PBR/BoxInterleaved/BoxInterleaved.gltf";
    var riggedSimplePbrUrl = "./Data/Models/PBR/RiggedSimple/RiggedSimple.gltf";
    var animatedMorphCubeUrl =
      "./Data/Models/PBR/AnimatedMorphCube/AnimatedMorphCube.gltf";
    var twoSidedPlaneUrl = "./Data/Models/PBR/TwoSidedPlane/TwoSidedPlane.gltf";
    var vertexColorTestUrl =
      "./Data/Models/PBR/VertexColorTest/VertexColorTest.gltf";
    var emissiveUrl = "./Data/Models/PBR/BoxEmissive/BoxEmissive.gltf";
    var dracoCompressedModelUrl =
      "./Data/Models/DracoCompression/CesiumMilkTruck/CesiumMilkTruck.gltf";
    var dracoCompressedModelWithAnimationUrl =
      "./Data/Models/DracoCompression/CesiumMan/CesiumMan.gltf";
    var dracoCompressedModelWithLinesUrl =
      "./Data/Models/DracoCompression/BoxWithLines/BoxWithLines.gltf";
    var dracoBoxVertexColorsRGBUrl =
      "./Data/Models/DracoCompression/BoxVertexColorsDracoRGB.gltf";
    var dracoBoxVertexColorsRGBAUrl =
      "./Data/Models/DracoCompression/BoxVertexColorsDracoRGBA.gltf";
    var multiUvTestUrl = "./Data/Models/MultiUVTest/MultiUVTest.glb";

    var boxGltf2Url = "./Data/Models/Box-Gltf-2/Box.gltf";
    var boxGltf2WithTechniquesUrl =
      "./Data/Models/Box-Gltf-2-Techniques/Box.gltf";

    var boxBackFaceCullingUrl =
      "./Data/Models/Box-Back-Face-Culling/Box-Back-Face-Culling.gltf";

    var texturedBoxModel;
    var cesiumAirModel;
    var animBoxesModel;
    var riggedFigureModel;

    var scene;
    var primitives;

    beforeAll(function () {
      scene = createScene();
      primitives = scene.primitives;

      var modelPromises = [];
      modelPromises.push(
        loadModel(texturedBoxUrl).then(function (model) {
          texturedBoxModel = model;
        })
      );
      modelPromises.push(
        loadModel(cesiumAirUrl, {
          minimumPixelSize: 1,
          maximumScale: 200,
          asynchronous: false,
        }).then(function (model) {
          cesiumAirModel = model;
        })
      );
      modelPromises.push(
        loadModel(animBoxesUrl, {
          scale: 2.0,
        }).then(function (model) {
          animBoxesModel = model;
        })
      );
      modelPromises.push(
        loadModel(riggedFigureUrl).then(function (model) {
          riggedFigureModel = model;
        })
      );
      modelPromises.push(FeatureDetection.supportsWebP.initialize());

      return when.all(modelPromises);
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      scene.morphTo3D(0.0);

      var camera = scene.camera;
      camera.frustum = new PerspectiveFrustum();
      camera.frustum.aspectRatio =
        scene.drawingBufferWidth / scene.drawingBufferHeight;
      camera.frustum.fov = CesiumMath.toRadians(60.0);
    });

    function addZoomTo(model) {
      model.zoomTo = function (zoom) {
        zoom = defaultValue(zoom, 4.0);

        var camera = scene.camera;
        var center = Matrix4.multiplyByPoint(
          model.modelMatrix,
          model.boundingSphere.center,
          new Cartesian3()
        );
        var r =
          zoom * Math.max(model.boundingSphere.radius, camera.frustum.near);
        camera.lookAt(center, new HeadingPitchRange(0.0, 0.0, r));
      };
    }

    function loadModel(url, options) {
      options = combine(options, {
        modelMatrix: Transforms.eastNorthUpToFixedFrame(
          Cartesian3.fromDegrees(0.0, 0.0, 100.0)
        ),
        url: url,
        id: url,
        show: false,
      });

      var model = primitives.add(Model.fromGltf(options));
      addZoomTo(model);

      return pollToPromise(
        function () {
          // Render scene to progressively load the model
          scene.renderForSpecs();
          return model.ready;
        },
        { timeout: 10000 }
      )
        .then(function () {
          return model;
        })
        .otherwise(function () {
          return when.reject(model);
        });
    }

    function loadModelJson(gltf, options) {
      options = defaultValue(options, defaultValue.EMPTY_OBJECT);
      options = combine(options, {
        modelMatrix: Transforms.eastNorthUpToFixedFrame(
          Cartesian3.fromDegrees(0.0, 0.0, 100.0)
        ),
        gltf: gltf,
        show: defaultValue(options.show, false),
      });

      var model = primitives.add(new Model(options));
      addZoomTo(model);

      return pollToPromise(
        function () {
          // Render scene to progressively load the model
          scene.renderForSpecs();
          return model.ready;
        },
        { timeout: 10000 }
      ).then(function () {
        return model;
      });
    }

    function verifyRender(model) {
      expect(model.ready).toBe(true);

      expect({
        scene: scene,
        time: JulianDate.fromDate(new Date("January 1, 2014 12:00:00 UTC")),
      }).toRenderAndCall(function (rgba) {
        expect(rgba).toEqual([0, 0, 0, 255]);
      });

      expect(scene).toRender([0, 0, 0, 255]);
      model.show = true;
      model.zoomTo();

      expect({
        scene: scene,
        time: JulianDate.fromDate(new Date("January 1, 2014 12:00:00 UTC")),
      }).toRenderAndCall(function (rgba) {
        expect(rgba).not.toEqual([0, 0, 0, 255]);
      });

      model.show = false;
    }

    it("fromGltf throws without options", function () {
      expect(function () {
        Model.fromGltf();
      }).toThrowDeveloperError();
    });

    it("fromGltf throws without options.url", function () {
      expect(function () {
        Model.fromGltf({});
      }).toThrowDeveloperError();
    });

    it("sets model properties", function () {
      var modelMatrix = Transforms.eastNorthUpToFixedFrame(
        Cartesian3.fromDegrees(0.0, 0.0, 100.0)
      );

      expect(texturedBoxModel.gltf).toBeDefined();
      expect(texturedBoxModel.basePath).toEqual(
        "./Data/Models/Box-Textured/CesiumTexturedBoxTest.gltf"
      );
      expect(texturedBoxModel.show).toEqual(false);
      expect(texturedBoxModel.modelMatrix).toEqual(modelMatrix);
      expect(texturedBoxModel.scale).toEqual(1.0);
      expect(texturedBoxModel.minimumPixelSize).toEqual(0.0);
      expect(texturedBoxModel.maximumScale).toBeUndefined();
      expect(texturedBoxModel.id).toEqual(texturedBoxUrl);
      expect(texturedBoxModel.allowPicking).toEqual(true);
      expect(texturedBoxModel.activeAnimations).toBeDefined();
      expect(texturedBoxModel.ready).toEqual(true);
      expect(texturedBoxModel.asynchronous).toEqual(true);
      expect(texturedBoxModel.releaseGltfJson).toEqual(false);
      expect(texturedBoxModel.cacheKey).toBeDefined();
      expect(texturedBoxModel.cacheKey).not.toContain(
        "Data/Models/Box-Textured/CesiumTexturedBoxTest.gltf"
      );
      expect(texturedBoxModel.debugShowBoundingVolume).toEqual(false);
      expect(texturedBoxModel.debugWireframe).toEqual(false);
      expect(texturedBoxModel.distanceDisplayCondition).toBeUndefined();
      expect(texturedBoxModel.silhouetteColor).toEqual(Color.RED);
      expect(texturedBoxModel.silhouetteSize).toEqual(0.0);
      expect(texturedBoxModel.color).toEqual(Color.WHITE);
      expect(texturedBoxModel.colorBlendMode).toEqual(ColorBlendMode.HIGHLIGHT);
      expect(texturedBoxModel.colorBlendAmount).toEqual(0.5);
      expect(texturedBoxModel.credit).toBeUndefined();
    });

    it("preserves query string in url", function () {
      var params = "?param1=1&param2=2";
      var url = texturedBoxUrl + params;
      var model = Model.fromGltf({
        url: url,
      });
      expect(model.basePath).toEndWith(params);
    });

    it("fromGltf takes a base path", function () {
      var url = texturedBoxBasePathUrl;
      var basePath = "./Data/Models/Box-Textured-Separate/";
      var model = Model.fromGltf({
        url: url,
        basePath: basePath,
      });
      expect(model.basePath).toEndWith(basePath);
      expect(model._cacheKey).toEndWith(basePath);
    });

    it("fromGltf takes Resource as url and basePath parameters", function () {
      spyOn(Resource._Implementations, "loadWithXhr").and.callThrough();

      var url = new Resource({
        url: texturedBoxUrl,
      });
      var basePath = new Resource({
        url: "./Data/Models/Box-Textured-Separate/",
      });
      var model = Model.fromGltf({
        url: url,
        basePath: basePath,
      });
      expect(model._resource).toEqual(basePath);
      expect(Resource._Implementations.loadWithXhr.calls.argsFor(0)[0]).toEqual(
        url.url
      );
    });

    it("fromGltf takes a credit", function () {
      var url = texturedBoxBasePathUrl;
      var model = Model.fromGltf({
        url: url,
        credit: "This is my model credit",
      });
      expect(model.credit).toBeInstanceOf(Credit);
    });

    it("renders", function () {
      verifyRender(texturedBoxModel);
    });

    it("renders in CV", function () {
      scene.morphToColumbusView(0.0);
      verifyRender(texturedBoxModel);
    });

    it("renders in 2D", function () {
      scene.morphTo2D(0.0);
      verifyRender(texturedBoxModel);
    });

    it("renders in 2D over the IDL", function () {
      return when(loadModel(texturedBoxUrl)).then(function (model) {
        model.modelMatrix = Transforms.eastNorthUpToFixedFrame(
          Cartesian3.fromDegrees(180.0, 0.0, 100.0)
        );
        scene.morphTo2D(0.0);
        verifyRender(model);
      });
    });

    it("renders RTC in 2D", function () {
      return loadModel(boxRtcUrl, {
        modelMatrix: Matrix4.IDENTITY,
        minimumPixelSize: 1,
      }).then(function (m) {
        scene.morphTo2D(0.0);
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("renders ECEF in 2D", function () {
      return loadModel(boxEcefUrl, {
        modelMatrix: Matrix4.IDENTITY,
        minimumPixelSize: undefined,
      }).then(function (m) {
        scene.morphTo2D(0.0);
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("renders RTC in CV", function () {
      return loadModel(boxRtcUrl, {
        modelMatrix: Matrix4.IDENTITY,
        minimumPixelSize: 1,
      }).then(function (m) {
        scene.morphToColumbusView(0.0);
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("renders ECEF in CV", function () {
      return loadModel(boxEcefUrl, {
        modelMatrix: Matrix4.IDENTITY,
        minimumPixelSize: undefined,
      }).then(function (m) {
        scene.morphToColumbusView(0.0);
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("does not render during morph", function () {
      var commandList = scene.frameState.commandList;
      var model = texturedBoxModel;
      model.show = true;
      model.cull = false;
      expect(model.ready).toBe(true);

      scene.renderForSpecs();
      expect(commandList.length).toBeGreaterThan(0);

      scene.morphTo2D(1.0);
      scene.renderForSpecs();
      expect(commandList.length).toBe(0);
      scene.completeMorph();
      model.show = false;
    });

    it("renders x-up model", function () {
      return Resource.fetchJson(boxEcefUrl).then(function (gltf) {
        // Model data is z-up. Edit the transform to be z-up to x-up.
        gltf.nodes.node_transform.matrix = Matrix4.pack(
          Axis.Z_UP_TO_X_UP,
          new Array(16)
        );

        return loadModelJson(gltf, {
          modelMatrix: Matrix4.IDENTITY,
          upAxis: Axis.X,
        }).then(function (m) {
          verifyRender(m);
          expect(m.upAxis).toBe(Axis.X);
          primitives.remove(m);
        });
      });
    });

    it("renders y-up model", function () {
      return Resource.fetchJson(boxEcefUrl).then(function (gltf) {
        // Model data is z-up. Edit the transform to be z-up to y-up.
        gltf.nodes.node_transform.matrix = Matrix4.pack(
          Axis.Z_UP_TO_Y_UP,
          new Array(16)
        );

        return loadModelJson(gltf, {
          modelMatrix: Matrix4.IDENTITY,
          upAxis: Axis.Y,
        }).then(function (m) {
          verifyRender(m);
          expect(m.upAxis).toBe(Axis.Y);
          primitives.remove(m);
        });
      });
    });

    it("renders z-up model", function () {
      return Resource.fetchJson(boxEcefUrl).then(function (gltf) {
        // Model data is z-up. Edit the transform to be the identity.
        gltf.nodes.node_transform.matrix = Matrix4.pack(
          Matrix4.IDENTITY,
          new Array(16)
        );

        return loadModelJson(gltf, {
          modelMatrix: Matrix4.IDENTITY,
          upAxis: Axis.Z,
        }).then(function (m) {
          verifyRender(m);
          expect(m.upAxis).toBe(Axis.Z);
          primitives.remove(m);
        });
      });
    });

    it("renders x-forward model", function () {
      return Resource.fetchJson(boxPbrUrl).then(function (gltf) {
        return loadModelJson(gltf, {
          forwardAxis: Axis.X,
        }).then(function (m) {
          verifyRender(m);
          expect(m.forwardAxis).toBe(Axis.X);
          primitives.remove(m);
        });
      });
    });

    it("renders z-forward model", function () {
      return Resource.fetchJson(boxEcefUrl).then(function (gltf) {
        return loadModelJson(gltf, {
          forwardAxis: Axis.Z,
        }).then(function (m) {
          verifyRender(m);
          expect(m.forwardAxis).toBe(Axis.Z);
          primitives.remove(m);
        });
      });
    });

    it("detects glTF 1.0 models as x-forward", function () {
      return Resource.fetchJson(boxEcefUrl).then(function (gltf) {
        return loadModelJson(gltf).then(function (m) {
          verifyRender(m);
          expect(m.forwardAxis).toBe(Axis.X);
          primitives.remove(m);
        });
      });
    });

    it("detects glTF 2.0 models as z-forward", function () {
      return Resource.fetchJson(boxPbrUrl).then(function (gltf) {
        return loadModelJson(gltf).then(function (m) {
          verifyRender(m);
          expect(m.forwardAxis).toBe(Axis.Z);
          primitives.remove(m);
        });
      });
    });

    it("resolves readyPromise", function () {
      return texturedBoxModel.readyPromise.then(function (model) {
        verifyRender(model);
      });
    });

    it("rejects readyPromise on error", function () {
      return Resource.fetchJson(boomBoxUrl).then(function (gltf) {
        gltf.images[0].uri = "invalid.png";
        var model = primitives.add(
          new Model({
            gltf: gltf,
          })
        );

        scene.renderForSpecs();

        return model.readyPromise
          .then(function (model) {
            fail("should not resolve");
          })
          .otherwise(function (error) {
            expect(model.ready).toEqual(false);
            primitives.remove(model);
          });
      });
    });

    it("renders from glTF", function () {
      // Simulate using procedural glTF as opposed to loading it from a file
      return loadModelJson(texturedBoxModel.gltf).then(function (model) {
        verifyRender(model);
        primitives.remove(model);
      });
    });

    it("applies the right render state", function () {
      spyOn(RenderState, "fromCache").and.callThrough();

      // Simulate using procedural glTF as opposed to loading it from a file
      return loadModelJson(texturedBoxModel.gltf).then(function (model) {
        var rs = {
          cull: {
            enabled: true,
          },
          depthTest: {
            enabled: true,
            func: DepthFunction.LESS_OR_EQUAL,
          },
          depthMask: true,
          blending: {
            enabled: false,
            equationRgb: WebGLConstants.FUNC_ADD,
            equationAlpha: WebGLConstants.FUNC_ADD,
            functionSourceRgb: WebGLConstants.ONE,
            functionSourceAlpha: WebGLConstants.ONE,
            functionDestinationRgb: WebGLConstants.ONE_MINUS_SRC_ALPHA,
            functionDestinationAlpha: WebGLConstants.ONE_MINUS_SRC_ALPHA,
          },
        };

        expect(RenderState.fromCache).toHaveBeenCalledWith(rs);
        primitives.remove(model);
      });
    });

    it("renders bounding volume", function () {
      texturedBoxModel.debugShowBoundingVolume = true;
      verifyRender(texturedBoxModel);
      texturedBoxModel.debugShowBoundingVolume = false;
    });

    it("renders in wireframe", function () {
      expect(scene).toRender([0, 0, 0, 255]);

      texturedBoxModel.show = true;
      texturedBoxModel.debugWireframe = true;
      texturedBoxModel.zoomTo();
      scene.renderForSpecs();

      var commands = texturedBoxModel._nodeCommands;
      var length = commands.length;
      for (var i = 0; i < length; ++i) {
        expect(commands[i].command.primitiveType).toEqual(PrimitiveType.LINES);
      }

      texturedBoxModel.show = false;
      texturedBoxModel.debugWireframe = false;
    });

    it("renders with distance display condition", function () {
      expect(scene).toRender([0, 0, 0, 255]);

      var center = Matrix4.getTranslation(
        texturedBoxModel.modelMatrix,
        new Cartesian3()
      );
      var near = 10.0;
      var far = 100.0;

      texturedBoxModel.show = true;
      texturedBoxModel.distanceDisplayCondition = new DistanceDisplayCondition(
        near,
        far
      );

      var frameState = scene.frameState;
      var commands = frameState.commandList;

      frameState.camera.lookAt(
        center,
        new HeadingPitchRange(0.0, 0.0, far + 10.0)
      );
      frameState.camera.lookAtTransform(Matrix4.IDENTITY);
      frameState.commandList = [];
      texturedBoxModel.update(frameState);
      expect(frameState.commandList.length).toEqual(0);

      frameState.camera.lookAt(
        center,
        new HeadingPitchRange(0.0, 0.0, (far + near) * 0.5)
      );
      frameState.camera.lookAtTransform(Matrix4.IDENTITY);
      frameState.commandList = [];
      texturedBoxModel.update(frameState);
      expect(frameState.commandList.length).toBeGreaterThan(0);

      frameState.camera.lookAt(
        center,
        new HeadingPitchRange(0.0, 0.0, near - 1.0)
      );
      frameState.camera.lookAtTransform(Matrix4.IDENTITY);
      frameState.commandList = [];
      texturedBoxModel.update(frameState);
      expect(frameState.commandList.length).toEqual(0);

      scene.frameState.commandList = commands;
      texturedBoxModel.show = false;
      texturedBoxModel.distanceDisplayCondition = undefined;
    });

    it("renders with spherical harmonics", function () {
      if (!scene.highDynamicRangeSupported) {
        return;
      }

      return loadModel(boomBoxUrl).then(function (m) {
        m.scale = 20.0; // Source model is very small, so scale up a bit

        var L00 = new Cartesian3(
          0.692622075009195,
          0.4543516001819,
          0.36910172299235
        ); // L00, irradiance, pre-scaled base
        var L1_1 = new Cartesian3(
          0.289407068366422,
          0.16789310162658,
          0.106174907004792
        ); // L1-1, irradiance, pre-scaled base
        var L10 = new Cartesian3(
          -0.591502034778913,
          -0.28152432317119,
          0.124647554708491
        ); // L10, irradiance, pre-scaled base
        var L11 = new Cartesian3(
          0.34945458117126,
          0.163273486841657,
          -0.03095643545207
        ); // L11, irradiance, pre-scaled base
        var L2_2 = new Cartesian3(
          0.22171176447426,
          0.11771991868122,
          0.031381053430064
        ); // L2-2, irradiance, pre-scaled base
        var L2_1 = new Cartesian3(
          -0.348955284677868,
          -0.187256994042823,
          -0.026299717727617
        ); // L2-1, irradiance, pre-scaled base
        var L20 = new Cartesian3(
          0.119982671127227,
          0.076784552175028,
          0.055517838847755
        ); // L20, irradiance, pre-scaled base
        var L21 = new Cartesian3(
          -0.545546043202299,
          -0.279787444030397,
          -0.086854000285261
        ); // L21, irradiance, pre-scaled base
        var L22 = new Cartesian3(
          0.160417569726332,
          0.120896423762313,
          0.121102528320197
        ); // L22, irradiance, pre-scaled base
        m.sphericalHarmonicCoefficients = [
          L00,
          L1_1,
          L10,
          L11,
          L2_2,
          L2_1,
          L20,
          L21,
          L22,
        ];

        scene.highDynamicRange = true;
        verifyRender(m);
        primitives.remove(m);
        scene.highDynamicRange = false;
      });
    });

    it("renders with specular environment map", function () {
      if (!scene.highDynamicRangeSupported) {
        return;
      }

      return loadModel(boomBoxUrl).then(function (m) {
        m.scale = 20.0; // Source model is very small, so scale up a bit
        m.specularEnvironmentMaps =
          "./Data/EnvironmentMap/kiara_6_afternoon_2k_ibl.ktx2";

        return pollToPromise(function () {
          scene.highDynamicRange = true;
          scene.render();
          scene.highDynamicRange = false;
          return (
            defined(m._specularEnvironmentMapAtlas) &&
            m._specularEnvironmentMapAtlas.ready
          );
        }).then(function () {
          scene.highDynamicRange = true;
          verifyRender(m);
          primitives.remove(m);
          scene.highDynamicRange = false;
        });
      });
    });

    it("distanceDisplayCondition throws when ner >= far", function () {
      expect(function () {
        texturedBoxModel.distanceDisplayCondition = new DistanceDisplayCondition(
          100.0,
          10.0
        );
      }).toThrowDeveloperError();
    });

    it("getNode throws when model is not loaded", function () {
      var m = new Model();
      expect(function () {
        return m.getNode("gltf-node-name");
      }).toThrowDeveloperError();
    });

    it("getNode throws when name is not provided", function () {
      expect(function () {
        return texturedBoxModel.getNode();
      }).toThrowDeveloperError();
    });

    it("getNode returns undefined when node does not exist", function () {
      expect(
        texturedBoxModel.getNode("name-of-node-that-does-not-exist")
      ).not.toBeDefined();
    });

    it("getNode returns a node", function () {
      var node = texturedBoxModel.getNode("Mesh");
      expect(node).toBeDefined();
      expect(node.name).toEqual("Mesh");
      expect(node.id).toEqual(0);
      expect(node.show).toEqual(true);

      // Change node transform and render
      expect(texturedBoxModel._cesiumAnimationsDirty).toEqual(false);
      node.matrix = Matrix4.fromUniformScale(1.01, new Matrix4());
      expect(texturedBoxModel._cesiumAnimationsDirty).toEqual(true);

      verifyRender(texturedBoxModel);

      expect(texturedBoxModel._cesiumAnimationsDirty).toEqual(false);

      node.matrix = Matrix4.fromUniformScale(1.0, new Matrix4());
    });

    it("getMesh throws when model is not loaded", function () {
      var m = new Model();
      expect(function () {
        return m.getMesh("gltf-mesh-name");
      }).toThrowDeveloperError();
    });

    it("getMesh throws when name is not provided", function () {
      expect(function () {
        return texturedBoxModel.getMesh();
      }).toThrowDeveloperError();
    });

    it("getMesh returns undefined when mesh does not exist", function () {
      expect(
        texturedBoxModel.getMesh("name-of-mesh-that-does-not-exist")
      ).not.toBeDefined();
    });

    it("getMesh returns a mesh", function () {
      var mesh = texturedBoxModel.getMesh("Mesh");
      expect(mesh).toBeDefined();
      expect(mesh.name).toEqual("Mesh");
      expect(mesh.id).toEqual(0);
      expect(mesh.materials[0].name).toEqual("Texture");
    });

    it("getMaterial throws when model is not loaded", function () {
      var m = new Model();
      expect(function () {
        return m.getMaterial("gltf-material-name");
      }).toThrowDeveloperError();
    });

    it("getMaterial throws when name is not provided", function () {
      expect(function () {
        return texturedBoxModel.getMaterial();
      }).toThrowDeveloperError();
    });

    it("getMaterial returns undefined when mesh does not exist", function () {
      expect(
        texturedBoxModel.getMaterial("name-of-material-that-does-not-exist")
      ).not.toBeDefined();
    });

    it("getMaterial returns a material", function () {
      var material = texturedBoxModel.getMaterial("Texture");
      expect(material).toBeDefined();
      expect(material.name).toEqual("Texture");
      expect(material.id).toEqual(0);
    });

    it("ModelMaterial.setValue throws when name is not provided", function () {
      var material = texturedBoxModel.getMaterial("Texture");
      expect(function () {
        material.setValue();
      }).toThrowDeveloperError();
    });

    it("ModelMaterial.setValue sets a scalar uniform value", function () {
      var material = texturedBoxModel.getMaterial("Texture");
      material.setValue("shininess", 12.34);
      expect(material.getValue("shininess")).toEqual(12.34);
    });

    it("ModelMaterial.setValue sets a Cartesian4 uniform value", function () {
      var material = texturedBoxModel.getMaterial("Texture");
      var specular = new Cartesian4(0.25, 0.5, 0.75, 1.0);
      material.setValue("specular", specular);
      expect(material.getValue("specular")).toEqual(specular);
    });

    it("ModelMaterial.getValue throws when name is not provided", function () {
      var material = texturedBoxModel.getMaterial("Texture");
      expect(function () {
        material.getValue();
      }).toThrowDeveloperError();
    });

    it("ModelMaterial.getValue returns undefined when uniform value does not exist", function () {
      var material = texturedBoxModel.getMaterial("Texture");
      expect(
        material.getValue("name-of-parameter-that-does-not-exist")
      ).not.toBeDefined();
    });

    it("boundingSphere throws when model is not loaded", function () {
      var m = new Model();
      expect(function () {
        return m.boundingSphere;
      }).toThrowDeveloperError();
    });

    it("boundingSphere returns the bounding sphere", function () {
      var boundingSphere = texturedBoxModel.boundingSphere;
      expect(boundingSphere.center).toEqualEpsilon(
        new Cartesian3(0.0, 0.0, 0.0),
        CesiumMath.EPSILON3
      );
      expect(boundingSphere.radius).toEqualEpsilon(0.866, CesiumMath.EPSILON3);
    });

    it("boundingSphere returns the bounding sphere when scale property is set", function () {
      var originalScale = texturedBoxModel.scale;
      texturedBoxModel.scale = 10;

      var boundingSphere = texturedBoxModel.boundingSphere;
      expect(boundingSphere.center).toEqualEpsilon(
        new Cartesian3(0.0, 0.0, 0.0),
        CesiumMath.EPSILON3
      );
      expect(boundingSphere.radius).toEqualEpsilon(8.66, CesiumMath.EPSILON3);

      texturedBoxModel.scale = originalScale;
    });

    it("boundingSphere returns the bounding sphere when maximumScale is reached", function () {
      var originalScale = texturedBoxModel.scale;
      var originalMaximumScale = texturedBoxModel.maximumScale;
      texturedBoxModel.scale = 20;
      texturedBoxModel.maximumScale = 10;

      var boundingSphere = texturedBoxModel.boundingSphere;
      expect(boundingSphere.center).toEqualEpsilon(
        new Cartesian3(0.0, 0.0, 0.0),
        CesiumMath.EPSILON3
      );
      expect(boundingSphere.radius).toEqualEpsilon(8.66, CesiumMath.EPSILON3);

      texturedBoxModel.scale = originalScale;
      texturedBoxModel.maximumScale = originalMaximumScale;
    });

    it("boundingSphere returns the bounding sphere when modelMatrix has non-uniform scale", function () {
      var originalMatrix = Matrix4.clone(texturedBoxModel.modelMatrix);
      Matrix4.multiplyByScale(
        texturedBoxModel.modelMatrix,
        new Cartesian3(2, 5, 10),
        texturedBoxModel.modelMatrix
      );

      var boundingSphere = texturedBoxModel.boundingSphere;
      expect(boundingSphere.center).toEqualEpsilon(
        new Cartesian3(0.0, 0.0, 0.0),
        CesiumMath.EPSILON3
      );
      expect(boundingSphere.radius).toEqualEpsilon(8.66, CesiumMath.EPSILON3);

      texturedBoxModel.modelMatrix = originalMatrix;
    });

    it("destroys", function () {
      return loadModel(boxUrl).then(function (m) {
        expect(m.isDestroyed()).toEqual(false);
        primitives.remove(m);
        expect(m.isDestroyed()).toEqual(true);
      });
    });

    it("destroys attached ClippingPlaneCollections", function () {
      return loadModel(boxUrl).then(function (model) {
        var clippingPlanes = new ClippingPlaneCollection({
          planes: [new ClippingPlane(Cartesian3.UNIT_X, 0.0)],
        });
        model.clippingPlanes = clippingPlanes;
        expect(model.isDestroyed()).toEqual(false);
        expect(clippingPlanes.isDestroyed()).toEqual(false);
        primitives.remove(model);
        expect(model.isDestroyed()).toEqual(true);
        expect(clippingPlanes.isDestroyed()).toEqual(true);
      });
    });

    it("throws a DeveloperError when given a ClippingPlaneCollection attached to another Model", function () {
      var clippingPlanes;
      return loadModel(boxUrl)
        .then(function (model1) {
          clippingPlanes = new ClippingPlaneCollection({
            planes: [new ClippingPlane(Cartesian3.UNIT_X, 0.0)],
          });
          model1.clippingPlanes = clippingPlanes;

          return loadModel(boxUrl);
        })
        .then(function (model2) {
          expect(function () {
            model2.clippingPlanes = clippingPlanes;
          }).toThrowDeveloperError();
        });
    });

    it("destroys ClippingPlaneCollections that are detached", function () {
      var clippingPlanes;
      return loadModel(boxUrl).then(function (model1) {
        clippingPlanes = new ClippingPlaneCollection({
          planes: [new ClippingPlane(Cartesian3.UNIT_X, 0.0)],
        });
        model1.clippingPlanes = clippingPlanes;
        expect(clippingPlanes.isDestroyed()).toBe(false);

        model1.clippingPlanes = undefined;
        expect(clippingPlanes.isDestroyed()).toBe(true);

        primitives.remove(model1);
      });
    });

    it("rebuilds shaders when clipping planes change state", function () {
      spyOn(Model, "_getClippingFunction").and.callThrough();

      return loadModel(boxUrl).then(function (model) {
        model.show = true;

        var clippingPlanes = new ClippingPlaneCollection({
          planes: [new ClippingPlane(Cartesian3.UNIT_X, 0.0)],
          unionClippingRegions: false,
        });
        model.clippingPlanes = clippingPlanes;

        scene.renderForSpecs();
        expect(Model._getClippingFunction.calls.count()).toEqual(1);

        clippingPlanes.unionClippingRegions = true;

        scene.renderForSpecs();
        expect(Model._getClippingFunction.calls.count()).toEqual(2);

        primitives.remove(model);
      });
    });

    it("rebuilds shaders when color requires coloring shader code", function () {
      spyOn(Model, "_modifyShaderForColor").and.callThrough();

      return loadModel(boxUrl).then(function (model) {
        model.show = true;

        model.color = Color.LIME;

        scene.renderForSpecs();
        expect(Model._modifyShaderForColor.calls.count()).toEqual(1);

        primitives.remove(model);
      });
    });

    ///////////////////////////////////////////////////////////////////////////

    it("Throws because of invalid extension", function () {
      return Resource.fetchJson(boxUrl).then(function (gltf) {
        gltf.extensionsRequired = ["NOT_supported_extension"];
        var model = primitives.add(
          new Model({
            gltf: gltf,
          })
        );

        expect(function () {
          scene.renderForSpecs();
        }).toThrowRuntimeError();
        primitives.remove(model);
      });
    });

    it("Throws because of invalid extension", function () {
      return Resource.fetchJson(boxUrl).then(function (gltf) {
        gltf.extensionsRequired = ["CESIUM_binary_glTF"];
        var model = primitives.add(
          new Model({
            gltf: gltf,
          })
        );

        expect(function () {
          scene.renderForSpecs();
        }).toThrowRuntimeError();
        primitives.remove(model);
      });
    });

    it("Throws for EXT_texture_webp if browser does not support WebP", function () {
      var supportsWebP = FeatureDetection.supportsWebP._result;
      FeatureDetection.supportsWebP._result = false;
      return Resource.fetchJson(texturedBoxWebpUrl).then(function (gltf) {
        gltf.extensionsRequired = ["EXT_texture_webp"];
        var model = primitives.add(
          new Model({
            gltf: gltf,
          })
        );

        expect(function () {
          scene.renderForSpecs();
        }).toThrowRuntimeError();
        primitives.remove(model);
        FeatureDetection.supportsWebP._result = supportsWebP;
      });
    });

    it("loads a glTF v0.8 model", function () {
      return loadModel(cesiumAir_0_8Url, {
        minimumPixelSize: 1,
      }).then(function (m) {
        // Verify that the version has been updated
        expect(m.gltf.asset.version).toEqual("2.0");

        // Verify that rotation is converted from
        // Axis-Angle (1,0,0,0) to Quaternion (0,0,0,1)
        var rotation = m.gltf.nodes[2].rotation;
        expect(rotation).toEqual([0.0, 0.0, 0.0, 1.0]);

        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads a glTF 2.0 model", function () {
      return loadModel(boxGltf2Url).then(function (m) {
        verifyRender(m);
        m.show = true;
        m.luminanceAtZenith = undefined;

        expect({
          scene: scene,
          time: JulianDate.fromDate(new Date("January 1, 2014 12:00:00 UTC")),
        }).toRenderAndCall(function (rgba) {
          expect(rgba).toEqualEpsilon([179, 9, 9, 255], 5); // Red
        });

        primitives.remove(m);
      });
    });

    it("loads a glTF 2.0 model with showOutline set as false", function () {
      spyOn(ModelOutlineLoader, "outlinePrimitives");
      return loadModel(boxGltf2Url, {
        showOutline: false,
      }).then(function (m) {
        expect(ModelOutlineLoader.outlinePrimitives).not.toHaveBeenCalled();
        primitives.remove(m);
      });
    });

    it("loads a glTF 2.0 model with techniques_webgl extension", function () {
      return loadModel(boxGltf2WithTechniquesUrl).then(function (m) {
        verifyRender(m);
        m.show = true;
        expect(scene).toRender([204, 0, 0, 255]); // Red
        primitives.remove(m);
      });
    });

    it("loads a glTF 2.0 model with AGI_articulations extension", function () {
      return loadModel(boxArticulationsUrl).then(function (m) {
        verifyRender(m);

        m.setArticulationStage("SampleArticulation MoveX", 1.0);
        m.setArticulationStage("SampleArticulation MoveY", 2.0);
        m.setArticulationStage("SampleArticulation MoveZ", 3.0);
        m.setArticulationStage("SampleArticulation Yaw", 4.0);
        m.setArticulationStage("SampleArticulation Pitch", 5.0);
        m.setArticulationStage("SampleArticulation Roll", 6.0);
        m.setArticulationStage("SampleArticulation Size", 0.9);
        m.setArticulationStage("SampleArticulation SizeX", 0.8);
        m.setArticulationStage("SampleArticulation SizeY", 0.7);
        m.setArticulationStage("SampleArticulation SizeZ", 0.6);
        m.applyArticulations();

        var node = m.getNode("Root");
        expect(node.useMatrix).toBe(true);

        var expected = [
          0.7147690483240505,
          -0.04340611926232735,
          -0.0749741046529782,
          0,
          -0.06188330295778636,
          0.05906797312763484,
          -0.6241645867602773,
          0,
          0.03752515582279579,
          0.5366347296529127,
          0.04706410108373541,
          0,
          1,
          3,
          -2,
          1,
        ];

        expect(node.matrix).toEqualEpsilon(expected, CesiumMath.EPSILON14);

        primitives.remove(m);
      });
    });

    it("loads a glTF model with unused material", function () {
      return loadModel(boxWithUnusedMaterial).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads a glTF model that doesn't have a technique", function () {
      return loadModel(boxNoTechniqueUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads a glTF model that doesn't have indices", function () {
      return loadModel(boxNoIndicesUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("renders texturedBoxCustom (all uniform semantics)", function () {
      return loadModel(texturedBoxCustomUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("renders a model with the KHR_binary_glTF extension", function () {
      return loadModel(texturedBoxKhrBinaryUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads a model with the KHR_binary_glTF extension as an ArrayBuffer using new Model", function () {
      return Resource.fetchArrayBuffer(texturedBoxKhrBinaryUrl).then(function (
        arrayBuffer
      ) {
        return loadModelJson(arrayBuffer).then(function (model) {
          verifyRender(model);
          primitives.remove(model);
        });
      });
    });

    it("loads a model with the KHR_binary_glTF extension as an Uint8Array using new Model", function () {
      return Resource.fetchArrayBuffer(texturedBoxKhrBinaryUrl).then(function (
        arrayBuffer
      ) {
        return loadModelJson(new Uint8Array(arrayBuffer)).then(function (
          model
        ) {
          verifyRender(model);
          primitives.remove(model);
        });
      });
    });

    it("Throws because of an invalid Binary glTF header - magic", function () {
      var arrayBuffer = new ArrayBuffer(20);
      expect(function () {
        return new Model({
          gltf: arrayBuffer,
        });
      }).toThrowRuntimeError();
    });

    it("Throws because of an invalid Binary glTF header - version", function () {
      var arrayBuffer = new ArrayBuffer(20);
      var bytes = new Uint8Array(arrayBuffer);
      bytes[0] = "g".charCodeAt(0);
      bytes[1] = "l".charCodeAt(0);
      bytes[2] = "T".charCodeAt(0);
      bytes[3] = "F".charCodeAt(0);

      expect(function () {
        return new Model({
          gltf: arrayBuffer,
        });
      }).toThrowRuntimeError();
    });

    it("renders a model with the CESIUM_RTC extension", function () {
      return loadModel(boxRtcUrl, {
        modelMatrix: Matrix4.IDENTITY,
        minimumPixelSize: 1,
      }).then(function (m) {
        var bs = m.boundingSphere;
        expect(
          bs.center.equalsEpsilon(
            new Cartesian3(6378137.0, 0.0, 0.0),
            CesiumMath.EPSILON14
          )
        );
        var radius = Math.sqrt(0.5 * 0.5 * 3);
        expect(bs.radius).toEqualEpsilon(radius, CesiumMath.EPSILON14);

        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("renders textured box with external resources: .glsl, .bin, and .png files", function () {
      return loadModel(texturedBoxSeparateUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("renders textured box with embedded KTX2 texture", function () {
      if (!scene.context.supportsBasis) {
        return;
      }
      return loadModel(texturedBoxKTX2Url, {
        incrementallyLoadTextures: false,
      }).then(function (m) {
        verifyRender(m);
        expect(Object.keys(m._rendererResources.textures).length).toBe(1);
        primitives.remove(m);
      });
    });

    it("renders textured box with embedded KTX2 texture with mipmap", function () {
      if (!scene.context.supportsBasis) {
        return;
      }
      var gl = scene.context._gl;
      spyOn(gl, "compressedTexImage2D").and.callThrough();
      return loadModel(texturedBoxKTX2MipmapUrl, {
        incrementallyLoadTextures: false,
      }).then(function (m) {
        verifyRender(m);
        expect(gl.compressedTexImage2D.calls.count()).toEqual(9);
        expect(Object.keys(m._rendererResources.textures).length).toBe(1);
        primitives.remove(m);
      });
    });

    it("renders textured box with KHR_texture_transform extension", function () {
      return loadModel(texturedBoxTextureTransformUrl, {
        incrementallyLoadTextures: false,
      }).then(function (m) {
        verifyRender(m);
        expect(Object.keys(m._rendererResources.textures).length).toBe(1);
        primitives.remove(m);
      });
    });

    it("renders textured box with WebP texture", function () {
      if (!FeatureDetection.supportsWebP()) {
        return;
      }
      return loadModel(texturedBoxWebpUrl, {
        incrementallyLoadTextures: false,
      }).then(function (m) {
        verifyRender(m);
        expect(Object.keys(m._rendererResources.textures).length).toBe(1);
        primitives.remove(m);
      });
    });

    ///////////////////////////////////////////////////////////////////////////

    it("loads cesiumAir", function () {
      expect(cesiumAirModel.minimumPixelSize).toEqual(1);
      expect(cesiumAirModel.maximumScale).toEqual(200);
      expect(cesiumAirModel.asynchronous).toEqual(false);
    });

    it("renders cesiumAir (has translucency)", function () {
      verifyRender(cesiumAirModel);
    });

    it("renders cesiumAir with per-node show (root)", function () {
      expect(scene).toRender([0, 0, 0, 255]);

      var commands = cesiumAirModel._nodeCommands;
      var i;
      var length;

      cesiumAirModel.show = true;
      cesiumAirModel.zoomTo();

      cesiumAirModel.getNode("Cesium_Air").show = false;
      expect(scene).toRender([0, 0, 0, 255]);

      length = commands.length;
      for (i = 0; i < length; ++i) {
        expect(commands[i].show).toEqual(false);
      }

      cesiumAirModel.getNode("Cesium_Air").show = true;
      expect(scene).notToRender([0, 0, 0, 255]);

      length = commands.length;
      for (i = 0; i < length; ++i) {
        expect(commands[i].show).toEqual(true);
      }

      cesiumAirModel.show = false;
    });

    it("renders cesiumAir with per-node show (non-root)", function () {
      cesiumAirModel.show = true;
      cesiumAirModel.zoomTo();

      var commands = cesiumAirModel._nodeCommands;
      var i;
      var length;

      var commandsPropFalse = 0;
      var commandsPropTrue = 0;

      cesiumAirModel.getNode("Prop").show = false;
      scene.renderForSpecs();

      length = commands.length;
      for (i = 0; i < length; ++i) {
        commandsPropFalse += commands[i].show ? 1 : 0;
      }

      cesiumAirModel.getNode("Prop").show = true;
      scene.renderForSpecs();

      length = commands.length;
      for (i = 0; i < length; ++i) {
        commandsPropTrue += commands[i].show ? 1 : 0;
      }

      cesiumAirModel.show = false;

      // Prop node has one mesh with two primitives
      expect(commandsPropFalse).toEqual(commandsPropTrue - 2);
    });

    it("picks cesiumAir", function () {
      if (FeatureDetection.isInternetExplorer()) {
        // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
        return;
      }

      cesiumAirModel.show = true;
      cesiumAirModel.zoomTo();

      expect(scene).toPickAndCall(function (result) {
        expect(result.primitive).toEqual(cesiumAirModel);
        expect(result.id).toEqual(cesiumAirUrl);
        expect(result.node).toBeDefined();
        expect(result.mesh).toBeDefined();
      });

      cesiumAirModel.show = false;
    });

    it("cesiumAir is picked with a new pick id", function () {
      if (FeatureDetection.isInternetExplorer()) {
        // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
        return;
      }

      var oldId = cesiumAirModel.id;
      cesiumAirModel.id = "id";
      cesiumAirModel.show = true;
      cesiumAirModel.zoomTo();

      expect(scene).toPickAndCall(function (result) {
        expect(result.primitive).toEqual(cesiumAirModel);
        expect(result.id).toEqual("id");
      });

      cesiumAirModel.id = oldId;
      cesiumAirModel.show = false;
    });

    it("cesiumAir is not picked (show === false)", function () {
      cesiumAirModel.zoomTo();

      expect(scene).notToPick();
    });

    ///////////////////////////////////////////////////////////////////////////

    it("renders animBoxes without animation", function () {
      verifyRender(animBoxesModel);
    });

    it("adds and removes all animations", function () {
      var animations = animBoxesModel.activeAnimations;
      expect(animations.length).toEqual(0);

      var spyAdd = jasmine.createSpy("listener");
      animations.animationAdded.addEventListener(spyAdd);
      var a = animations.addAll();
      expect(animations.length).toEqual(2);
      expect(spyAdd.calls.count()).toEqual(2);
      expect(spyAdd.calls.argsFor(0)[0]).toBe(animBoxesModel);
      expect(spyAdd.calls.argsFor(0)[1]).toBe(a[0]);
      expect(spyAdd.calls.argsFor(1)[0]).toBe(animBoxesModel);
      expect(spyAdd.calls.argsFor(1)[1]).toBe(a[1]);
      animations.animationAdded.removeEventListener(spyAdd);

      expect(animations.contains(a[0])).toEqual(true);
      expect(animations.get(0)).toEqual(a[0]);
      expect(animations.contains(a[1])).toEqual(true);
      expect(animations.get(1)).toEqual(a[1]);

      var spyRemove = jasmine.createSpy("listener");
      animations.animationRemoved.addEventListener(spyRemove);
      animations.removeAll();
      expect(animations.length).toEqual(0);
      expect(spyRemove.calls.count()).toEqual(2);
      expect(spyRemove.calls.argsFor(0)[0]).toBe(animBoxesModel);
      expect(spyRemove.calls.argsFor(0)[1]).toBe(a[0]);
      expect(spyRemove.calls.argsFor(1)[0]).toBe(animBoxesModel);
      expect(spyRemove.calls.argsFor(1)[1]).toBe(a[1]);
      animations.animationRemoved.removeEventListener(spyRemove);
    });

    it("addAll throws when model is not loaded", function () {
      var m = new Model();
      expect(function () {
        return m.activeAnimations.addAll();
      }).toThrowDeveloperError();
    });

    it("addAll throws when multiplier is less than or equal to zero.", function () {
      expect(function () {
        return animBoxesModel.activeAnimations.addAll({
          multiplier: 0.0,
        });
      }).toThrowDeveloperError();
    });

    it("adds and removes an animation", function () {
      var animations = animBoxesModel.activeAnimations;
      expect(animations.length).toEqual(0);

      var spyAdd = jasmine.createSpy("listener");
      animations.animationAdded.addEventListener(spyAdd);
      var a = animations.add({
        name: "animation_1",
      });
      expect(a).toBeDefined();
      expect(a.name).toEqual("animation_1");
      expect(a.startTime).not.toBeDefined();
      expect(a.delay).toEqual(0.0);
      expect(a.stopTime).not.toBeDefined();
      expect(a.removeOnStop).toEqual(false);
      expect(a.multiplier).toEqual(1.0);
      expect(a.reverse).toEqual(false);
      expect(a.loop).toEqual(ModelAnimationLoop.NONE);
      expect(a.start).toBeDefined();
      expect(a.update).toBeDefined();
      expect(a.stop).toBeDefined();
      expect(spyAdd).toHaveBeenCalledWith(animBoxesModel, a);
      animations.animationAdded.removeEventListener(spyAdd);

      expect(animations.contains(a)).toEqual(true);
      expect(animations.get(0)).toEqual(a);

      var spyRemove = jasmine.createSpy("listener");
      animations.animationRemoved.addEventListener(spyRemove);
      expect(animations.remove(a)).toEqual(true);
      expect(animations.remove(a)).toEqual(false);
      expect(animations.remove()).toEqual(false);
      expect(animations.contains(a)).toEqual(false);
      expect(animations.length).toEqual(0);
      expect(spyRemove).toHaveBeenCalledWith(animBoxesModel, a);
      animations.animationRemoved.removeEventListener(spyRemove);
    });

    it("adds an animation by index", function () {
      var animations = animBoxesModel.activeAnimations;
      expect(animations.length).toEqual(0);

      var spyAdd = jasmine.createSpy("listener");
      animations.animationAdded.addEventListener(spyAdd);
      var a = animations.add({
        index: 1,
      });
      expect(a).toBeDefined();
      expect(a.name).toEqual("animation_1");
      animations.remove(a);
    });

    it("add throws when name and index are not defined", function () {
      var m = new Model();
      expect(function () {
        return m.activeAnimations.add();
      }).toThrowDeveloperError();
    });

    it("add throws when index is invalid", function () {
      var m = new Model();
      expect(function () {
        return m.activeAnimations.add({
          index: -1,
        });
      }).toThrowDeveloperError();
      expect(function () {
        return m.activeAnimations.add({
          index: 2,
        });
      }).toThrowDeveloperError();
    });

    it("add throws when model is not loaded", function () {
      var m = new Model();
      expect(function () {
        return m.activeAnimations.add({
          name: "animation_1",
        });
      }).toThrowDeveloperError();
    });

    it("add throws when name is invalid.", function () {
      expect(function () {
        return animBoxesModel.activeAnimations.add({
          name: "animation-does-not-exist",
        });
      }).toThrowDeveloperError();
    });

    it("add throws when multiplier is less than or equal to zero.", function () {
      expect(function () {
        return animBoxesModel.activeAnimations.add({
          name: "animation_1",
          multiplier: 0.0,
        });
      }).toThrowDeveloperError();
    });

    it("get throws without an index", function () {
      var m = new Model();
      expect(function () {
        return m.activeAnimations.get();
      }).toThrowDeveloperError();
    });

    it("contains(undefined) returns false", function () {
      expect(animBoxesModel.activeAnimations.contains(undefined)).toEqual(
        false
      );
    });

    it("raises animation start, update, and stop events when removeOnStop is true", function () {
      var time = JulianDate.fromDate(new Date("January 1, 2014 12:00:00 UTC"));
      var animations = animBoxesModel.activeAnimations;
      var a = animations.add({
        name: "animation_1",
        startTime: time,
        removeOnStop: true,
      });

      var spyStart = jasmine.createSpy("listener");
      a.start.addEventListener(spyStart);

      var spyUpdate = jasmine.createSpy("listener");
      a.update.addEventListener(spyUpdate);

      var stopped = false;
      a.stop.addEventListener(function (model, animation) {
        stopped = true;
      });
      var spyStop = jasmine.createSpy("listener");
      a.stop.addEventListener(spyStop);

      animBoxesModel.show = true;

      return pollToPromise(
        function () {
          scene.renderForSpecs(time);
          time = JulianDate.addSeconds(time, 1.0, time, new JulianDate());
          return stopped;
        },
        { timeout: 10000 }
      ).then(function () {
        expect(spyStart).toHaveBeenCalledWith(animBoxesModel, a);

        expect(spyUpdate.calls.count()).toEqual(5);
        expect(spyUpdate.calls.argsFor(0)[0]).toBe(animBoxesModel);
        expect(spyUpdate.calls.argsFor(0)[1]).toBe(a);
        expect(spyUpdate.calls.argsFor(0)[2]).toEqualEpsilon(
          0.0,
          CesiumMath.EPSILON14
        );
        expect(spyUpdate.calls.argsFor(1)[2]).toEqualEpsilon(
          1.0,
          CesiumMath.EPSILON14
        );
        expect(spyUpdate.calls.argsFor(2)[2]).toEqualEpsilon(
          2.0,
          CesiumMath.EPSILON14
        );
        expect(spyUpdate.calls.argsFor(3)[2]).toEqualEpsilon(
          3.0,
          CesiumMath.EPSILON14
        );
        expect(spyUpdate.calls.argsFor(4)[2]).toEqualEpsilon(
          3.708, // Expect animation to have reached its final value.
          CesiumMath.EPSILON3
        );

        expect(spyStop).toHaveBeenCalledWith(animBoxesModel, a);
        expect(animations.length).toEqual(0);
        animBoxesModel.show = false;
      });
    });

    it("animates with a delay", function () {
      var time = JulianDate.fromDate(new Date("January 1, 2014 12:00:00 UTC"));

      var animations = animBoxesModel.activeAnimations;
      var a = animations.add({
        name: "animation_1",
        startTime: time,
        delay: 1.0,
      });

      var spyStart = jasmine.createSpy("listener");
      a.start.addEventListener(spyStart);

      animBoxesModel.show = true;
      scene.renderForSpecs(time); // Does not fire start
      scene.renderForSpecs(JulianDate.addSeconds(time, 1.0, new JulianDate()));

      expect(spyStart.calls.count()).toEqual(1);

      expect(animations.remove(a)).toEqual(true);
      animBoxesModel.show = false;
    });

    it("animates with an explicit stopTime", function () {
      var time = JulianDate.fromDate(new Date("January 1, 2014 12:00:00 UTC"));
      var stopTime = JulianDate.fromDate(
        new Date("January 1, 2014 12:00:01 UTC")
      );

      var animations = animBoxesModel.activeAnimations;
      var a = animations.add({
        name: "animation_1",
        startTime: time,
        stopTime: stopTime,
      });

      var spyUpdate = jasmine.createSpy("listener");
      a.update.addEventListener(spyUpdate);

      animBoxesModel.show = true;
      scene.renderForSpecs(time);
      scene.renderForSpecs(JulianDate.addSeconds(time, 1.0, new JulianDate()));
      scene.renderForSpecs(JulianDate.addSeconds(time, 2.0, new JulianDate()));

      expect(spyUpdate.calls.count()).toEqual(3);
      expect(spyUpdate.calls.argsFor(0)[2]).toEqualEpsilon(
        0.0,
        CesiumMath.EPSILON14
      );
      expect(spyUpdate.calls.argsFor(1)[2]).toEqualEpsilon(
        1.0,
        CesiumMath.EPSILON14
      );
      expect(spyUpdate.calls.argsFor(2)[2]).toEqualEpsilon(
        1.0,
        CesiumMath.EPSILON14
      );
      expect(animations.remove(a)).toEqual(true);
      animBoxesModel.show = false;
    });

    it("animates with a multiplier", function () {
      var time = JulianDate.fromDate(new Date("January 1, 2014 12:00:00 UTC"));
      var animations = animBoxesModel.activeAnimations;
      var a = animations.add({
        name: "animation_1",
        startTime: time,
        multiplier: 1.5,
      });

      var spyUpdate = jasmine.createSpy("listener");
      a.update.addEventListener(spyUpdate);

      animBoxesModel.show = true;
      scene.renderForSpecs(time);
      scene.renderForSpecs(JulianDate.addSeconds(time, 1.0, new JulianDate()));
      scene.renderForSpecs(JulianDate.addSeconds(time, 2.0, new JulianDate()));

      expect(spyUpdate.calls.count()).toEqual(3);
      expect(spyUpdate.calls.argsFor(0)[2]).toEqualEpsilon(
        0.0,
        CesiumMath.EPSILON14
      );
      expect(spyUpdate.calls.argsFor(1)[2]).toEqualEpsilon(
        1.5,
        CesiumMath.EPSILON14
      );
      expect(spyUpdate.calls.argsFor(2)[2]).toEqualEpsilon(
        3.0,
        CesiumMath.EPSILON14
      );
      expect(animations.remove(a)).toEqual(true);
      animBoxesModel.show = false;
    });

    it("finishes an animation after the stop time", function () {
      var time = JulianDate.fromDate(new Date("January 1, 2014 12:00:00 UTC"));
      var stopTime = JulianDate.fromDate(
        new Date("January 1, 2014 12:00:01 UTC")
      );

      var animations = animBoxesModel.activeAnimations;
      var a = animations.add({
        name: "animation_1",
        startTime: time,
        stopTime: stopTime,
      });

      var spyUpdate = jasmine.createSpy("listener");
      a.update.addEventListener(spyUpdate);

      animBoxesModel.show = true;
      scene.renderForSpecs(time);
      scene.renderForSpecs(JulianDate.addSeconds(time, 0.5, new JulianDate())); // Midpoint of designated interval
      scene.renderForSpecs(JulianDate.addSeconds(time, 2.0, new JulianDate())); // Past designated stop time

      expect(spyUpdate.calls.count()).toEqual(3);
      expect(spyUpdate.calls.argsFor(0)[2]).toEqualEpsilon(
        0.0,
        CesiumMath.EPSILON14
      );
      expect(spyUpdate.calls.argsFor(1)[2]).toEqualEpsilon(
        0.5,
        CesiumMath.EPSILON14
      );
      expect(spyUpdate.calls.argsFor(2)[2]).toEqualEpsilon(
        1.0, // Expect clamping to designated stop time.
        CesiumMath.EPSILON14
      );
      expect(animations.remove(a)).toEqual(true);
      animBoxesModel.show = false;
    });

    it("finishes an animation after it runs off the end", function () {
      var time = JulianDate.fromDate(new Date("January 1, 2014 12:00:00 UTC"));
      var animations = animBoxesModel.activeAnimations;
      var a = animations.add({
        name: "animation_1",
        startTime: time,
      });

      var spyUpdate = jasmine.createSpy("listener");
      a.update.addEventListener(spyUpdate);

      animBoxesModel.show = true;
      scene.renderForSpecs(time);
      scene.renderForSpecs(JulianDate.addSeconds(time, 0.5, new JulianDate())); // Somewhere inside animation
      scene.renderForSpecs(JulianDate.addSeconds(time, 10.0, new JulianDate())); // Way past end of animation

      expect(spyUpdate.calls.count()).toEqual(3);
      expect(spyUpdate.calls.argsFor(0)[2]).toEqualEpsilon(
        0.0,
        CesiumMath.EPSILON14
      );
      expect(spyUpdate.calls.argsFor(1)[2]).toEqualEpsilon(
        0.5,
        CesiumMath.EPSILON14
      );
      expect(spyUpdate.calls.argsFor(2)[2]).toEqualEpsilon(
        3.708, // Expect animation to have reached its final value.
        CesiumMath.EPSILON3
      );
      expect(animations.remove(a)).toEqual(true);
      animBoxesModel.show = false;
    });

    it("halts an animation before the start time", function () {
      var time = JulianDate.fromDate(new Date("January 1, 2014 12:00:00 UTC"));
      var stopTime = JulianDate.fromDate(
        new Date("January 1, 2014 12:00:01 UTC")
      );

      var animations = animBoxesModel.activeAnimations;
      var a = animations.add({
        name: "animation_1",
        startTime: time,
        stopTime: stopTime,
      });

      var spyUpdate = jasmine.createSpy("listener");
      a.update.addEventListener(spyUpdate);

      animBoxesModel.show = true;
      scene.renderForSpecs(time);
      scene.renderForSpecs(JulianDate.addSeconds(time, 0.5, new JulianDate())); // Midpoint of animation
      scene.renderForSpecs(JulianDate.addSeconds(time, -1.0, new JulianDate())); // Before start of animation

      expect(spyUpdate.calls.count()).toEqual(3);
      expect(spyUpdate.calls.argsFor(0)[2]).toEqualEpsilon(
        0.0,
        CesiumMath.EPSILON14
      );
      expect(spyUpdate.calls.argsFor(1)[2]).toEqualEpsilon(
        0.5,
        CesiumMath.EPSILON14
      );
      expect(spyUpdate.calls.argsFor(2)[2]).toEqualEpsilon(
        0.0,
        CesiumMath.EPSILON14
      );
      expect(animations.remove(a)).toEqual(true);
      animBoxesModel.show = false;
    });

    it("animates in reverse", function () {
      var time = JulianDate.fromDate(new Date("January 1, 2014 12:00:00 UTC"));
      var animations = animBoxesModel.activeAnimations;
      var a = animations.add({
        name: "animation_1",
        startTime: time,
        reverse: true,
      });

      var spyUpdate = jasmine.createSpy("listener");
      a.update.addEventListener(spyUpdate);

      animBoxesModel.show = true;
      scene.renderForSpecs(time);
      scene.renderForSpecs(JulianDate.addSeconds(time, 1.0, new JulianDate()));
      scene.renderForSpecs(JulianDate.addSeconds(time, 2.0, new JulianDate()));
      scene.renderForSpecs(JulianDate.addSeconds(time, 3.0, new JulianDate()));

      expect(spyUpdate.calls.count()).toEqual(4);
      expect(spyUpdate.calls.argsFor(0)[2]).toEqualEpsilon(
        3.708,
        CesiumMath.EPSILON3
      );
      expect(spyUpdate.calls.argsFor(1)[2]).toEqualEpsilon(
        2.708,
        CesiumMath.EPSILON3
      );
      expect(spyUpdate.calls.argsFor(2)[2]).toEqualEpsilon(
        1.708,
        CesiumMath.EPSILON3
      );
      expect(spyUpdate.calls.argsFor(3)[2]).toEqualEpsilon(
        0.708,
        CesiumMath.EPSILON3
      );
      expect(animations.remove(a)).toEqual(true);
      animBoxesModel.show = false;
    });

    it("animates with REPEAT", function () {
      var time = JulianDate.fromDate(new Date("January 1, 2014 12:00:00 UTC"));
      var animations = animBoxesModel.activeAnimations;
      var a = animations.add({
        name: "animation_1",
        startTime: time,
        loop: ModelAnimationLoop.REPEAT,
      });

      var spyUpdate = jasmine.createSpy("listener");
      a.update.addEventListener(spyUpdate);

      animBoxesModel.show = true;
      for (var i = 0; i < 8; ++i) {
        scene.renderForSpecs(JulianDate.addSeconds(time, i, new JulianDate()));
      }

      expect(spyUpdate.calls.count()).toEqual(8);
      expect(spyUpdate.calls.argsFor(0)[2]).toEqualEpsilon(
        0.0,
        CesiumMath.EPSILON3
      );
      expect(spyUpdate.calls.argsFor(1)[2]).toEqualEpsilon(
        1.0,
        CesiumMath.EPSILON3
      );
      expect(spyUpdate.calls.argsFor(2)[2]).toEqualEpsilon(
        2.0,
        CesiumMath.EPSILON3
      );
      expect(spyUpdate.calls.argsFor(3)[2]).toEqualEpsilon(
        3.0,
        CesiumMath.EPSILON3
      );
      expect(spyUpdate.calls.argsFor(4)[2]).toEqualEpsilon(
        0.291,
        CesiumMath.EPSILON3
      ); // Repeat with duration of ~3.7
      expect(spyUpdate.calls.argsFor(5)[2]).toEqualEpsilon(
        1.291,
        CesiumMath.EPSILON3
      );
      expect(spyUpdate.calls.argsFor(6)[2]).toEqualEpsilon(
        2.291,
        CesiumMath.EPSILON3
      );
      expect(spyUpdate.calls.argsFor(7)[2]).toEqualEpsilon(
        3.291,
        CesiumMath.EPSILON3
      );
      expect(animations.remove(a)).toEqual(true);
      animBoxesModel.show = false;
    });

    it("animates with MIRRORED_REPEAT", function () {
      var time = JulianDate.fromDate(new Date("January 1, 2014 12:00:00 UTC"));
      var animations = animBoxesModel.activeAnimations;
      var a = animations.add({
        name: "animation_1",
        startTime: time,
        loop: ModelAnimationLoop.MIRRORED_REPEAT,
      });

      var spyUpdate = jasmine.createSpy("listener");
      a.update.addEventListener(spyUpdate);

      animBoxesModel.show = true;
      for (var i = 0; i < 8; ++i) {
        scene.renderForSpecs(JulianDate.addSeconds(time, i, new JulianDate()));
      }

      expect(spyUpdate.calls.count()).toEqual(8);
      expect(spyUpdate.calls.argsFor(0)[2]).toEqualEpsilon(
        0.0,
        CesiumMath.EPSILON3
      );
      expect(spyUpdate.calls.argsFor(1)[2]).toEqualEpsilon(
        1.0,
        CesiumMath.EPSILON3
      );
      expect(spyUpdate.calls.argsFor(2)[2]).toEqualEpsilon(
        2.0,
        CesiumMath.EPSILON3
      );
      expect(spyUpdate.calls.argsFor(3)[2]).toEqualEpsilon(
        3.0,
        CesiumMath.EPSILON3
      );
      expect(spyUpdate.calls.argsFor(4)[2]).toEqualEpsilon(
        3.416,
        CesiumMath.EPSILON3
      ); // Mirror repeat with duration of 3.6
      expect(spyUpdate.calls.argsFor(5)[2]).toEqualEpsilon(
        2.416,
        CesiumMath.EPSILON3
      );
      expect(spyUpdate.calls.argsFor(6)[2]).toEqualEpsilon(
        1.416,
        CesiumMath.EPSILON3
      );
      expect(spyUpdate.calls.argsFor(7)[2]).toEqualEpsilon(
        0.416,
        CesiumMath.EPSILON3
      );
      expect(animations.remove(a)).toEqual(true);
      animBoxesModel.show = false;
    });

    it("animates and renders", function () {
      return loadModel(animBoxesUrl, {
        scale: 2.0,
      }).then(function (m) {
        var node = m.getNode("inner_box");
        var time = JulianDate.fromDate(
          new Date("January 1, 2014 12:00:00 UTC")
        );
        var animations = m.activeAnimations;
        var a = animations.add({
          name: "animation_1",
          startTime: time,
        });

        expect(node.matrix).toEqual(Matrix4.IDENTITY);
        var previousMatrix = Matrix4.clone(node.matrix);

        m.zoomTo();

        for (var i = 1; i < 4; ++i) {
          var t = JulianDate.addSeconds(time, i, new JulianDate());
          expect({
            scene: scene,
            time: t,
          }).toRender([0, 0, 0, 255]);

          m.show = true;
          expect({
            scene: scene,
            time: t,
          }).notToRender([0, 0, 0, 255]);
          m.show = false;

          expect(node.matrix).not.toEqual(previousMatrix);
          previousMatrix = Matrix4.clone(node.matrix);
        }

        expect(animations.remove(a)).toEqual(true);
        primitives.remove(m);
      });
    });

    it("does not animate when there are no animations", function () {
      var animations = animBoxesModel.activeAnimations;
      expect(animations.length).toEqual(0);
      expect(animations.update()).toEqual(false);
    });

    it("animates a single keyframe", function () {
      return Resource.fetchJson(animBoxesUrl).then(function (gltf) {
        gltf.accessors["animAccessor_0"].count = 1;
        gltf.accessors["animAccessor_1"].count = 1;

        return loadModelJson(gltf).then(function (m) {
          m.show = true;
          var node = m.getNode("inner_box");
          var time = JulianDate.fromDate(
            new Date("January 1, 2014 12:00:00 UTC")
          );
          var animations = m.activeAnimations;
          animations.add({
            name: "animation_0",
            startTime: time,
          });

          expect(node.matrix).toEqual(Matrix4.IDENTITY);
          var previousMatrix = Matrix4.clone(node.matrix);

          for (var i = 1; i < 4; ++i) {
            var t = JulianDate.addSeconds(time, i, new JulianDate());
            scene.renderForSpecs(t);
            expect(node.matrix).toEqual(previousMatrix);
          }
          primitives.remove(m);
        });
      });
    });

    it("animates with STEP interpolation", function () {
      return loadModel(interpolationTestUrl).then(function (model) {
        var time = JulianDate.fromDate(
          new Date("January 1, 2014 12:00:00 UTC")
        );

        model.show = true;
        var animations = model.activeAnimations;
        var a = animations.add({
          name: "Step Translation",
          startTime: time,
        });

        var animatedNode = model.getNode("Cube.006");

        scene.renderForSpecs(time);
        expect(animatedNode.matrix[13]).toEqualEpsilon(
          6.665,
          CesiumMath.EPSILON3
        );

        scene.renderForSpecs(
          JulianDate.addSeconds(time, 0.5, new JulianDate())
        );
        expect(animatedNode.matrix[13]).toEqualEpsilon(
          10.0,
          CesiumMath.EPSILON14
        );

        scene.renderForSpecs(
          JulianDate.addSeconds(time, 1.0, new JulianDate())
        );
        expect(animatedNode.matrix[13]).toEqualEpsilon(
          6.0,
          CesiumMath.EPSILON14
        );

        scene.renderForSpecs(
          JulianDate.addSeconds(time, 2.0, new JulianDate())
        );
        expect(animatedNode.matrix[13]).toEqualEpsilon(
          6.0,
          CesiumMath.EPSILON14
        );

        expect(animations.remove(a)).toEqual(true);
        primitives.remove(model);
      });
    });

    it("animates with LINEAR interpolation", function () {
      return loadModel(interpolationTestUrl).then(function (model) {
        var time = JulianDate.fromDate(
          new Date("January 1, 2014 12:00:00 UTC")
        );

        model.show = true;
        var animations = model.activeAnimations;
        var a = animations.add({
          name: "Linear Translation",
          startTime: time,
        });

        var animatedNode = model.getNode("Cube.009");

        scene.renderForSpecs(time);
        expect(animatedNode.matrix[13]).toEqualEpsilon(
          6.621,
          CesiumMath.EPSILON3
        );

        scene.renderForSpecs(
          JulianDate.addSeconds(time, 0.5, new JulianDate())
        );
        expect(animatedNode.matrix[13]).toEqualEpsilon(
          9.2,
          CesiumMath.EPSILON3
        );

        scene.renderForSpecs(
          JulianDate.addSeconds(time, 1.0, new JulianDate())
        );
        expect(animatedNode.matrix[13]).toEqualEpsilon(
          7.6,
          CesiumMath.EPSILON3
        );

        scene.renderForSpecs(
          JulianDate.addSeconds(time, 2.0, new JulianDate())
        );
        expect(animatedNode.matrix[13]).toEqualEpsilon(
          6.0,
          CesiumMath.EPSILON14
        );

        expect(animations.remove(a)).toEqual(true);
        primitives.remove(model);
      });
    });

    ///////////////////////////////////////////////////////////////////////////

    it("renders riggedFigure without animation", function () {
      verifyRender(riggedFigureModel);
    });

    it("renders riggedFigure with animation (skinning)", function () {
      var time = JulianDate.fromDate(new Date("January 1, 2014 12:00:00 UTC"));
      var animations = riggedFigureModel.activeAnimations;
      animations.addAll({
        startTime: time,
      });

      riggedFigureModel.zoomTo();

      for (var i = 0; i < 6; ++i) {
        var t = JulianDate.addSeconds(time, 0.25 * i, new JulianDate());
        expect({
          scene: scene,
          time: t,
        }).toRender([0, 0, 0, 255]);

        riggedFigureModel.show = true;
        expect({
          scene: scene,
          time: t,
        }).notToRender([0, 0, 0, 255]);
        riggedFigureModel.show = false;
      }

      animations.removeAll();
      riggedFigureModel.show = false;
    });

    it("renders riggedSimple", function () {
      return loadModel(riggedSimpleUrl).then(function (m) {
        expect(m).toBeDefined();
        verifyRender(m);
      });
    });

    it("should load a model where WebGL shader optimizer removes an attribute (linux)", function () {
      var url = "./Data/Models/test-shader-optimize/test-shader-optimize.gltf";
      return loadModel(url).then(function (m) {
        expect(m).toBeDefined();
        primitives.remove(m);
      });
    });

    it("releaseGltfJson releases glTF JSON when constructed with fromGltf", function () {
      return loadModel(boxUrl, {
        releaseGltfJson: true,
      }).then(function (m) {
        expect(m.releaseGltfJson).toEqual(true);
        expect(m.gltf).not.toBeDefined();

        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("releaseGltfJson releases glTF JSON when constructed with Model constructor function", function () {
      return loadModelJson(texturedBoxModel.gltf, {
        releaseGltfJson: true,
        incrementallyLoadTextures: false,
        asynchronous: true,
      }).then(function (m) {
        expect(m.releaseGltfJson).toEqual(true);
        expect(m.gltf).not.toBeDefined();

        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("Models are cached with fromGltf (1/2)", function () {
      var key = "a-cache-key";

      // This cache for this model is initially empty
      var gltfCache = Model._gltfCache;
      expect(gltfCache[key]).not.toBeDefined();

      var modelRendererResourceCache =
        scene.context.cache.modelRendererResourceCache;
      expect(modelRendererResourceCache[key]).not.toBeDefined();

      // Use a custom cache key to avoid conflicting with previous tests
      var promise = loadModel(boxUrl, {
        cacheKey: key,
      });

      expect(gltfCache[key]).toBeDefined();
      expect(gltfCache[key].count).toEqual(1);
      expect(gltfCache[key].ready).toEqual(false);

      // This is a cache hit, but the JSON request is still pending.
      // In the test below, the cache hit occurs after the request completes.
      var promise2 = loadModel(boxUrl, {
        cacheKey: key,
      });

      expect(gltfCache[key].count).toEqual(2);

      return when.all([promise, promise2], function (models) {
        var m = models[0];
        var m2 = models[1];

        // Render scene to progressively load the model
        scene.renderForSpecs();

        // glTF JSON cache set ready once the JSON was downloaded
        expect(gltfCache[key].ready).toEqual(true);

        expect(modelRendererResourceCache[key]).toBeDefined();
        expect(modelRendererResourceCache[key].count).toEqual(2);
        expect(modelRendererResourceCache[key].ready).toEqual(true);

        verifyRender(m);
        verifyRender(m2);

        primitives.remove(m);
        expect(gltfCache[key].count).toEqual(1);
        expect(modelRendererResourceCache[key].count).toEqual(1);

        primitives.remove(m2);
        expect(gltfCache[key]).not.toBeDefined();
        expect(modelRendererResourceCache[key]).not.toBeDefined();
      });
    });

    it("Models are cached with fromGltf (2/2)", function () {
      var key = "a-cache-key";

      // This cache for this model is initially empty
      var gltfCache = Model._gltfCache;
      expect(gltfCache[key]).not.toBeDefined();

      // Use a custom cache key to avoid conflicting with previous tests
      var promise = loadModel(boxUrl, {
        cacheKey: key,
      });

      expect(gltfCache[key]).toBeDefined();
      expect(gltfCache[key].count).toEqual(1);
      expect(gltfCache[key].ready).toEqual(false);

      return promise.then(function (m) {
        // Render scene to progressively load the model
        scene.renderForSpecs();

        // Cache hit after JSON request completed.
        var m2;
        loadModel(boxUrl, {
          cacheKey: key,
        }).then(function (model) {
          m2 = model;
        });

        expect(gltfCache[key].ready).toEqual(true);
        expect(gltfCache[key].count).toEqual(2);

        verifyRender(m);
        verifyRender(m2);

        primitives.remove(m);
        expect(gltfCache[key].count).toEqual(1);

        primitives.remove(m2);
        expect(gltfCache[key]).not.toBeDefined();
      });
    });

    it("Cache with a custom cacheKey the Model Constructor (1/2)", function () {
      var key = "a-cache-key";

      // This cache for this model is initially empty
      var gltfCache = Model._gltfCache;
      expect(gltfCache[key]).not.toBeDefined();

      var modelRendererResourceCache =
        scene.context.cache.modelRendererResourceCache;
      expect(modelRendererResourceCache[key]).not.toBeDefined();

      var m = primitives.add(
        new Model({
          gltf: texturedBoxModel.gltf,
          modelMatrix: Transforms.eastNorthUpToFixedFrame(
            Cartesian3.fromDegrees(0.0, 0.0, 100.0)
          ),
          show: false,
          cacheKey: key,
          incrementallyLoadTextures: false,
          asynchronous: true,
        })
      );
      addZoomTo(m);

      expect(gltfCache[key]).toBeDefined();
      expect(gltfCache[key].count).toEqual(1);
      expect(gltfCache[key].ready).toEqual(true);

      return pollToPromise(
        function () {
          // Render scene to progressively load the model
          scene.renderForSpecs();

          expect(modelRendererResourceCache[key]).toBeDefined();
          expect(modelRendererResourceCache[key].count).toEqual(1);
          expect(modelRendererResourceCache[key].ready).toEqual(m.ready);

          return m.ready;
        },
        { timeout: 10000 }
      ).then(function () {
        verifyRender(m);

        primitives.remove(m);
        expect(gltfCache[key]).not.toBeDefined();
        expect(modelRendererResourceCache[key]).not.toBeDefined();
      });
    });

    it("Cache with a custom cacheKey when using the Model Constructor (2/2)", function () {
      var key = "a-cache-key";
      var key3 = "another-cache-key";

      // This cache for these keys is initially empty
      var gltfCache = Model._gltfCache;
      expect(gltfCache[key]).not.toBeDefined();
      expect(gltfCache[key3]).not.toBeDefined();

      var modelRendererResourceCache =
        scene.context.cache.modelRendererResourceCache;
      expect(modelRendererResourceCache[key]).not.toBeDefined();
      expect(modelRendererResourceCache[key3]).not.toBeDefined();

      var m = primitives.add(
        new Model({
          gltf: texturedBoxModel.gltf,
          modelMatrix: Transforms.eastNorthUpToFixedFrame(
            Cartesian3.fromDegrees(0.0, 0.0, 100.0)
          ),
          show: false,
          cacheKey: key,
          asynchronous: true,
        })
      );
      addZoomTo(m);

      expect(gltfCache[key]).toBeDefined();
      expect(gltfCache[key].count).toEqual(1);
      expect(gltfCache[key].ready).toEqual(true);

      // Should be cache hit.  Not need to provide glTF.
      var m2 = primitives.add(
        new Model({
          modelMatrix: Transforms.eastNorthUpToFixedFrame(
            Cartesian3.fromDegrees(0.0, 0.0, 100.0)
          ),
          show: false,
          cacheKey: key,
          asynchronous: true,
        })
      );
      addZoomTo(m2);

      expect(gltfCache[key].count).toEqual(2);

      // Should be cache miss.
      var m3 = primitives.add(
        new Model({
          gltf: texturedBoxModel.gltf,
          modelMatrix: Transforms.eastNorthUpToFixedFrame(
            Cartesian3.fromDegrees(0.0, 0.0, 100.0)
          ),
          show: false,
          cacheKey: key3,
          asynchronous: true,
        })
      );
      addZoomTo(m3);

      expect(gltfCache[key3]).toBeDefined();
      expect(gltfCache[key3].count).toEqual(1);
      expect(gltfCache[key3].ready).toEqual(true);

      return pollToPromise(
        function () {
          // Render scene to progressively load the model
          scene.renderForSpecs();

          if (m.ready && m2.ready && m3.ready) {
            expect(modelRendererResourceCache[key]).toBeDefined();
            expect(modelRendererResourceCache[key].count).toEqual(2);

            expect(modelRendererResourceCache[key3]).toBeDefined();
            expect(modelRendererResourceCache[key3].count).toEqual(1);

            return true;
          }

          return false;
        },
        { timeout: 10000 }
      ).then(function () {
        verifyRender(m);
        verifyRender(m2);
        verifyRender(m3);

        primitives.remove(m);
        primitives.remove(m2);
        expect(gltfCache[key]).not.toBeDefined();
        expect(modelRendererResourceCache[key]).not.toBeDefined();

        primitives.remove(m3);
        expect(gltfCache[key3]).not.toBeDefined();
        expect(modelRendererResourceCache[key3]).not.toBeDefined();
      });
    });

    it("Loads with incrementallyLoadTextures set to true", function () {
      return loadModelJson(texturedBoxModel.gltf, {
        incrementallyLoadTextures: true,
        show: true,
      }).then(function (m) {
        // Get the rendered color of the model before textures are loaded
        var loadedColor;

        m.zoomTo();
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual([0, 0, 0, 255]);
          loadedColor = rgba;
        });

        return pollToPromise(
          function () {
            // Render scene to progressively load textures
            scene.renderForSpecs();
            // Textures have finished loading
            return m.pendingTextureLoads === 0;
          },
          { timeout: 10000 }
        ).then(function () {
          expect(scene).notToRender(loadedColor);
          primitives.remove(m);
        });
      });
    });

    it("Loads with incrementallyLoadTextures set to false", function () {
      return loadModelJson(texturedBoxModel.gltf, {
        incrementallyLoadTextures: false,
        show: true,
      }).then(function (m) {
        // Get the rendered color of the model before textures are loaded
        var loadedColor;

        m.zoomTo();
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual([0, 0, 0, 255]);
          loadedColor = rgba;
        });

        return pollToPromise(
          function () {
            // Render scene to progressively load textures (they should already be loaded)
            scene.renderForSpecs();
            // Textures have finished loading
            return !defined(m._loadResources);
          },
          { timeout: 10000 }
        ).then(function () {
          expect(scene).toRender(loadedColor);
          primitives.remove(m);
        });
      });
    });

    it("loads a glTF with KHR_materials_common using the constant lighting model", function () {
      return loadModel(boxConstantUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads a glTF with KHR_materials_common using the lambert lighting model", function () {
      return loadModel(boxLambertUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads a glTF with KHR_materials_common using the blinn lighting model", function () {
      return loadModel(boxBlinnUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads a glTF with KHR_materials_common using the phong lighting model", function () {
      return loadModel(boxPhongUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads a glTF with KHR_materials_common using a black ambient/directional light", function () {
      return loadModel(boxNoLightUrl).then(function (m) {
        // Verify that we render a black model because lighting is completely off
        expect(m.ready).toBe(true);
        expect(scene).toRender([0, 0, 0, 255]);
        m.show = true;
        m.zoomTo();
        expect(scene).toRender([0, 0, 0, 255]);
        m.show = false;

        primitives.remove(m);
      });
    });

    it("loads a glTF with KHR_materials_common using an ambient light", function () {
      return loadModel(boxAmbientLightUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads a glTF with KHR_materials_common using a directional light", function () {
      return loadModel(boxDirectionalLightUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads a glTF with KHR_materials_common using a point light", function () {
      return loadModel(boxPointLightUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads a glTF with KHR_materials_common using a spot light", function () {
      return loadModel(boxSpotLightUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads a glTF with KHR_materials_common that has skinning", function () {
      return loadModel(CesiumManUrl).then(function (m) {
        // Face CesiumMan towards the camera. See https://github.com/CesiumGS/cesium/pull/8958#issuecomment-644352798
        m.modelMatrix = Matrix4.multiply(
          m.modelMatrix,
          Axis.Y_UP_TO_X_UP,
          new Matrix4()
        );
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads a glTF with KHR_materials_common that has transparency", function () {
      return loadModel(boxTransparentUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads a glTF with WEB3D_quantized_attributes POSITION and NORMAL", function () {
      return loadModel(boxQuantizedUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads a glTF with WEB3D_quantized_attributes and accessor.normalized", function () {
      return loadModel(boxQuantizedUrl).then(function (m) {
        verifyRender(m);
        var gltf = m.gltf;
        var accessors = gltf.accessors;
        var normalAccessor = accessors[2];
        var positionAccessor = accessors[1];
        normalAccessor.normalized = true;
        positionAccessor.normalized = true;
        var decodeMatrixArray =
          normalAccessor.extensions.WEB3D_quantized_attributes.decodeMatrix;
        var decodeMatrix = new Matrix4();
        Matrix4.unpack(decodeMatrixArray, 0, decodeMatrix);
        Matrix4.multiplyByUniformScale(decodeMatrix, 65535.0, decodeMatrix);
        Matrix4.pack(decodeMatrix, decodeMatrixArray);
        decodeMatrixArray =
          positionAccessor.extensions.WEB3D_quantized_attributes.decodeMatrix;
        Matrix4.unpack(decodeMatrixArray, 0, decodeMatrix);
        Matrix4.multiplyByUniformScale(decodeMatrix, 65535.0, decodeMatrix);
        Matrix4.pack(decodeMatrix, decodeMatrixArray);
        primitives.remove(m);
        return loadModelJson(gltf, {}).then(function (m) {
          verifyRender(m);
          primitives.remove(m);
        });
      });
    });

    it("loads a glTF with WEB3D_quantized_attributes POSITION and NORMAL where primitives with different accessors use the same shader", function () {
      return loadModel(milkTruckQuantizedUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads a glTF with WEB3D_quantized_attributes POSITION, TEXCOORD and NORMAL where one primitive is quantized and the other is not, but both use the same shader", function () {
      return loadModel(milkTruckQuantizedMismatchUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads a glTF with WEB3D_quantized_attributes TEXCOORD", function () {
      return loadModel(duckQuantizedUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads a glTF with WEB3D_quantized_attributes JOINT and WEIGHT", function () {
      return loadModel(riggedSimpleQuantizedUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads a glTF 2.0 without textures", function () {
      return loadModel(boxPbrUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads a glTF 2.0 with textures", function () {
      return loadModel(boomBoxUrl).then(function (m) {
        m.scale = 20.0; // Source model is very small, so scale up a bit
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads a glTF 2.0 with node animation", function () {
      return loadModel(boxAnimatedPbrUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads a glTF 2.0 with node animations set to unclamped", function () {
      return loadModel(boxAnimatedPbrUrl, {
        clampAnimations: false,
      }).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads a glTF 2.0 with skinning", function () {
      return loadModel(riggedSimplePbrUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads a glTF 2.0 with morph targets", function () {
      return loadModel(animatedMorphCubeUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads a glTF 2.0 with alphaMode set to OPAQUE", function () {
      return Resource.fetchJson(boxPbrUrl).then(function (gltf) {
        gltf.materials[0].alphaMode = "OPAQUE";

        return loadModelJson(gltf).then(function (m) {
          verifyRender(m);
          primitives.remove(m);
        });
      });
    });

    it("loads a glTF 2.0 with alphaMode set to MASK", function () {
      return Resource.fetchJson(boxPbrUrl).then(function (gltf) {
        gltf.materials[0].alphaMode = "MASK";
        gltf.materials[0].alphaCutoff = 0.5;

        return loadModelJson(gltf).then(function (m) {
          verifyRender(m);
          primitives.remove(m);
        });
      });
    });

    it("loads a glTF 2.0 with alphaMode set to BLEND", function () {
      return Resource.fetchJson(boxPbrUrl).then(function (gltf) {
        gltf.materials[0].alphaMode = "BLEND";

        return loadModelJson(gltf).then(function (m) {
          verifyRender(m);
          primitives.remove(m);
        });
      });
    });

    it("loads a glTF 2.0 with interleaved vertex attributes", function () {
      return loadModel(boxInterleavedPbrUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    function checkDoubleSided(model, doubleSided) {
      var camera = scene.camera;
      var center = Matrix4.multiplyByPoint(
        model.modelMatrix,
        model.boundingSphere.center,
        new Cartesian3()
      );
      var range = 4.0 * model.boundingSphere.radius;

      camera.lookAt(
        center,
        new HeadingPitchRange(0, -CesiumMath.PI_OVER_TWO, range)
      );
      expect(scene).notToRender([0, 0, 0, 255]);
      camera.lookAt(
        center,
        new HeadingPitchRange(0, CesiumMath.PI_OVER_TWO, range)
      );
      if (doubleSided) {
        expect(scene).notToRender([0, 0, 0, 255]);
      } else {
        expect(scene).toRender([0, 0, 0, 255]);
      }
    }

    function checkVertexColors(model) {
      model.zoomTo();
      // Blue plane
      scene.camera.moveLeft(0.5);
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toEqual(0);
        expect(rgba[1]).toEqual(0);
        expect(rgba[2]).toEqual(255);
      });
      // Red plane
      scene.camera.moveRight(1.0);
      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toEqual(255);
        expect(rgba[1]).toEqual(0);
        expect(rgba[2]).toEqual(0);
      });
    }

    it("loads a glTF 2.0 with doubleSided set to false", function () {
      return Resource.fetchJson(twoSidedPlaneUrl).then(function (gltf) {
        gltf.materials[0].doubleSided = false;
        return loadModelJson(gltf).then(function (m) {
          m.show = true;
          checkDoubleSided(m, false);
          primitives.remove(m);
        });
      });
    });

    it("loads a glTF 2.0 with doubleSided set to true", function () {
      return loadModel(twoSidedPlaneUrl).then(function (m) {
        m.show = true;
        checkDoubleSided(m, true);
        primitives.remove(m);
      });
    });

    it("loads a glTF 2.0 with vertex colors", function () {
      return loadModel(vertexColorTestUrl, {
        forwardAxis: Axis.X,
      }).then(function (m) {
        m.show = true;
        checkVertexColors(m);
        primitives.remove(m);
      });
    });

    it("loads a glTF 2.0 with an emissive texture and no normals", function () {
      return loadModel(emissiveUrl).then(function (model) {
        model.show = true;
        model.zoomTo();
        expect(scene).toRenderAndCall(function (rgba) {
          // Emissive texture is red
          expect(rgba[0]).toBeGreaterThan(20);
          expect(rgba[1]).toBeLessThan(20);
          expect(rgba[2]).toBeLessThan(20);
        });

        primitives.remove(model);
      });
    });

    function testBoxSideColors(m) {
      var rotateX = Matrix3.fromRotationX(CesiumMath.toRadians(90.0));
      var rotateY = Matrix3.fromRotationY(CesiumMath.toRadians(90.0));
      var rotateZ = Matrix3.fromRotationZ(CesiumMath.toRadians(90.0));

      // Each side of the cube should be a different color
      var oldPixelColor;

      expect(scene).toRenderAndCall(function (rgba) {
        expect(rgba).not.toEqual([0, 0, 0, 255]);
        oldPixelColor = rgba;
      });

      for (var i = 0; i < 6; i++) {
        var rotate = rotateZ;
        if (i % 3 === 0) {
          rotate = rotateX;
        } else if ((i - 1) % 3 === 0) {
          rotate = rotateY;
        }
        Matrix4.multiplyByMatrix3(m.modelMatrix, rotate, m.modelMatrix);

        //eslint-disable-next-line no-loop-func
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual([0, 0, 0, 255]);
          expect(rgba).not.toEqual(oldPixelColor);
          oldPixelColor = rgba;
        });
      }
    }

    it("loads a gltf with normalized color attributes", function () {
      return loadModel(boxColorUrl).then(function (m) {
        expect(m.ready).toBe(true);
        expect(scene).toRender([0, 0, 0, 255]);
        m.show = true;
        m.zoomTo();
        testBoxSideColors(m);
        primitives.remove(m);
      });
    });

    it("loads a gltf with uint32 indices", function () {
      var context = scene.context;
      if (context._elementIndexUint) {
        return loadModel(boxUint32Indices).then(function (m) {
          verifyRender(m);
          primitives.remove(m);
        });
      }
    });

    it("throws runtime error when loading a gltf with uint32 indices if OES_element_index_uint is disabled", function () {
      var context = scene.context;
      var uint32Supported = context._elementIndexUint;
      context._elementIndexUint = false;

      var model = primitives.add(
        Model.fromGltf({
          url: boxUint32Indices,
        })
      );

      return pollToPromise(
        function () {
          // Render scene to progressively load the model
          scene.renderForSpecs();
          return model.ready;
        },
        { timeout: 10000 }
      )
        .then(function () {
          fail("should not resolve");
        })
        .otherwise(function (e) {
          expect(e).toBeDefined();
          primitives.remove(model);
          context._elementIndexUint = uint32Supported;
        });
    });

    it("loads a gltf with WEB3D_quantized_attributes COLOR", function () {
      return loadModel(boxColorQuantizedUrl).then(function (m) {
        expect(m.ready).toBe(true);
        expect(scene).toRender([0, 0, 0, 255]);
        m.show = true;
        m.zoomTo();
        testBoxSideColors(m);
        primitives.remove(m);
      });
    });

    it("loads a gltf with WEB3D_quantized_attributes SCALAR attribute", function () {
      return loadModel(boxScalarQuantizedUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads with custom vertex attributes, vertexShader, fragmentShader, and uniform map", function () {
      function vertexShaderLoaded(vs) {
        var renamedSource = ShaderSource.replaceMain(vs, "czm_old_main");
        var newMain =
          "attribute vec4 a_color;\n" +
          "varying vec4 v_color;\n" +
          "void main()\n" +
          "{\n" +
          "    czm_old_main();\n" +
          "    v_color = a_color;\n" +
          "}";
        return renamedSource + "\n" + newMain;
      }

      function fragmentShaderLoaded(fs) {
        fs =
          "uniform float u_value;\n" +
          "varying vec4 v_color;\n" +
          "void main()\n" +
          "{\n" +
          "    gl_FragColor = u_value * v_color;\n" +
          "}";
        return fs;
      }

      function uniformMapLoaded(uniformMap) {
        return combine(uniformMap, {
          u_value: function () {
            return 1.0;
          },
        });
      }

      var precreatedAttributes = {
        a_color: {
          index: 0, // updated in Model
          componentsPerAttribute: 4,
          value: [1.0, 1.0, 1.0, 1.0],
        },
      };

      var options = {
        show: true,
        precreatedAttributes: precreatedAttributes,
        vertexShaderLoaded: vertexShaderLoaded,
        fragmentShaderLoaded: fragmentShaderLoaded,
        uniformMapLoaded: uniformMapLoaded,
      };

      return loadModelJson(texturedBoxModel.gltf, options).then(function (
        model
      ) {
        model.zoomTo();
        expect(scene).toRender([255, 255, 255, 255]);
        primitives.remove(model);
      });
    });

    it("loads a glTF with KHR_draco_mesh_compression extension", function () {
      return loadModel(dracoCompressedModelUrl, {
        dequantizeInShader: false,
      }).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads a glTF with KHR_draco_mesh_compression extension with integer attributes", function () {
      return loadModel(dracoCompressedModelWithAnimationUrl, {
        dequantizeInShader: false,
        forwardAxis: Axis.X,
      }).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads a glTF with KHR_draco_mesh_compression extension and LINES attributes", function () {
      return loadModel(dracoCompressedModelWithLinesUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads multiple draco models from cache without decoding", function () {
      var initialModel;
      var decoder = DracoLoader._getDecoderTaskProcessor();
      return loadModel(dracoCompressedModelUrl)
        .then(function (m) {
          verifyRender(m);
          initialModel = m;
          spyOn(decoder, "scheduleTask");
          return loadModel(dracoCompressedModelUrl);
        })
        .then(function (m) {
          verifyRender(m);
          expect(decoder.scheduleTask).not.toHaveBeenCalled();
          primitives.remove(m);
          primitives.remove(initialModel);
        });
    });

    it("error decoding a draco compressed glTF causes model loading to fail", function () {
      var decoder = DracoLoader._getDecoderTaskProcessor();
      spyOn(decoder, "scheduleTask").and.returnValue(
        when.reject({ message: "my error" })
      );

      var model = primitives.add(
        Model.fromGltf({
          url: dracoCompressedModelUrl,
          dequantizeInShader: false,
        })
      );

      return pollToPromise(
        function () {
          scene.renderForSpecs();
          return model._state === 3; // FAILED
        },
        { timeout: 10000 }
      ).then(function () {
        model.readyPromise
          .then(function (e) {
            fail("should not resolve");
          })
          .otherwise(function (e) {
            expect(e).toBeDefined();
            expect(e.message).toEqual(
              "Failed to load model: ./Data/Models/DracoCompression/CesiumMilkTruck/CesiumMilkTruck.gltf\nmy error"
            );
            primitives.remove(model);
          });
      });
    });

    xit("loads a draco compressed glTF and dequantizes in the shader", function () {
      return loadModel(dracoCompressedModelUrl, {
        dequantizeInShader: true,
      }).then(function (m) {
        verifyRender(m);

        var atrributeData = m._decodedData["0.primitive.0"].attributes;
        expect(atrributeData["POSITION"].quantization).toBeDefined();
        expect(atrributeData["TEXCOORD_0"].quantization).toBeDefined();
        expect(atrributeData["NORMAL"].quantization).toBeDefined();
        expect(atrributeData["NORMAL"].quantization.octEncoded).toBe(true);

        primitives.remove(m);
      });
    });

    xit("loads a draco compressed glTF and dequantizes in the shader, skipping generic attributes", function () {
      return loadModel(dracoCompressedModelWithAnimationUrl, {
        dequantizeInShader: true,
        forwardAxis: Axis.X,
      }).then(function (m) {
        verifyRender(m);

        var atrributeData = m._decodedData["0.primitive.0"].attributes;
        expect(atrributeData["POSITION"].quantization).toBeDefined();
        expect(atrributeData["TEXCOORD_0"].quantization).toBeDefined();
        expect(atrributeData["NORMAL"].quantization).toBeDefined();
        expect(atrributeData["JOINTS_0"].quantization).toBeUndefined();

        primitives.remove(m);
      });
    });

    it("loads draco compressed glTF with RGBA per-vertex color", function () {
      return loadModel(dracoBoxVertexColorsRGBAUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads draco compressed glTF with RGB per-vertex color", function () {
      return loadModel(dracoBoxVertexColorsRGBUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("loads a glTF with multiple texCoords", function () {
      return loadModel(multiUvTestUrl).then(function (m) {
        verifyRender(m);
        primitives.remove(m);
      });
    });

    it("does not issue draw commands when ignoreCommands is true", function () {
      return loadModel(texturedBoxUrl, {
        ignoreCommands: true,
      }).then(function (m) {
        expect(m.ready).toBe(true);
        m.show = true;

        m.zoomTo();
        m.update(scene.frameState);
        expect(scene.frameState.commandList.length).toEqual(0);

        m.show = false;
        primitives.remove(m);
      });
    });

    it("does not issue draw commands when the model is out of view and cull is true", function () {
      return loadModel(texturedBoxUrl, {
        cull: true,
      }).then(function (m) {
        expect(m.ready).toBe(true);
        m.show = true;

        // Look at the model
        m.zoomTo();
        scene.renderForSpecs();
        expect(scene.frustumCommandsList.length).not.toEqual(0);

        // Move the model out of view
        m.modelMatrix = Matrix4.fromTranslation(
          new Cartesian3(100000.0, 0.0, 0.0)
        );
        scene.renderForSpecs();
        expect(scene.frustumCommandsList.length).toEqual(0);

        m.show = false;
        primitives.remove(m);
      });
    });

    it("issues draw commands when the model is out of view and cull is false", function () {
      return loadModel(texturedBoxUrl, {
        cull: false,
      }).then(function (m) {
        expect(m.ready).toBe(true);
        m.show = true;

        // Look at the model
        m.zoomTo();
        scene.renderForSpecs();
        expect(scene.frustumCommandsList.length).not.toEqual(0);

        // Move the model out of view
        m.modelMatrix = Matrix4.fromTranslation(
          new Cartesian3(10000000000.0, 0.0, 0.0)
        );
        scene.renderForSpecs();
        expect(scene.frustumCommandsList.length).not.toEqual(0);

        m.show = false;
        primitives.remove(m);
      });
    });

    it("renders with a color", function () {
      return loadModel(boxUrl).then(function (model) {
        model.show = true;
        model.zoomTo();

        // Model is originally red
        var sourceColor;
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba[0]).toBeGreaterThan(0);
          expect(rgba[1]).toEqual(0);
          sourceColor = rgba;
        });

        // Check MIX
        model.colorBlendMode = ColorBlendMode.MIX;
        model.color = Color.LIME;

        model.colorBlendAmount = 0.0;
        expect(scene).toRender(sourceColor);

        model.colorBlendAmount = 0.5;
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba[0]).toBeGreaterThan(0);
          expect(rgba[1]).toBeGreaterThan(0);
        });

        model.colorBlendAmount = 1.0;
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba[0]).toEqual(0);
          expect(rgba[1]).toEqual(255);
        });

        // Check REPLACE
        model.colorBlendMode = ColorBlendMode.REPLACE;
        model.colorBlendAmount = 0.5; // Should have no effect
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba[0]).toEqual(0);
          expect(rgba[1]).toEqual(255);
        });

        // Check HIGHLIGHT
        model.colorBlendMode = ColorBlendMode.HIGHLIGHT;
        model.color = Color.DARKGRAY;
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba[0]).toBeGreaterThan(0);
          expect(rgba[0]).toBeLessThan(255);
          expect(rgba[1]).toEqual(0);
          expect(rgba[2]).toEqual(0);
        });

        // Check alpha
        model.colorBlendMode = ColorBlendMode.REPLACE;
        model.color = Color.fromAlpha(Color.LIME, 0.5);
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba[0]).toEqual(0);
          expect(rgba[1]).toBeLessThan(255);
          expect(rgba[1]).toBeGreaterThan(0);
        });

        // No commands are issued when the alpha is 0.0
        model.color = Color.fromAlpha(Color.LIME, 0.0);
        scene.renderForSpecs();
        var commands = scene.frameState.commandList;
        expect(commands.length).toBe(0);

        primitives.remove(model);
      });
    });

    it("renders with the KHR_materials_unlit extension", function () {
      return loadModel(boxPbrUnlitUrl).then(function (model) {
        model.show = true;
        model.zoomTo();
        // We expect to see the base color when unlit
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba[0]).toEqual(0);
          expect(rgba[1]).toEqual(255);
          expect(rgba[2]).toEqual(0);
        });

        primitives.remove(model);
      });
    });

    it("renders with the KHR_materials_pbrSpecularGlossiness extension", function () {
      return loadModel(boomBoxPbrSpecularGlossinessUrl).then(function (model) {
        model.show = false;
        model.zoomTo(2.0);

        var originalColor;
        expect(scene).toRenderAndCall(function (rgba) {
          originalColor = rgba;
        });

        model.show = true;

        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual(originalColor);
        });

        primitives.remove(model);
      });
    });

    it("renders with the KHR_materials_pbrSpecularGlossiness extension with defaults", function () {
      return loadModel(boomBoxPbrSpecularGlossinessDefaultsUrl).then(function (
        model
      ) {
        model.show = false;
        model.zoomTo(2.0);

        var originalColor;
        expect(scene).toRenderAndCall(function (rgba) {
          originalColor = rgba;
        });

        model.show = true;

        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual(originalColor);
        });

        primitives.remove(model);
      });
    });

    it("renders with the KHR_materials_pbrSpecularGlossiness extension when no textures are found", function () {
      return loadModel(boomBoxPbrSpecularGlossinessNoTextureUrl).then(function (
        model
      ) {
        model.show = false;
        model.zoomTo(2.0);

        var originalColor;
        expect(scene).toRenderAndCall(function (rgba) {
          originalColor = rgba;
        });

        model.show = true;

        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual(originalColor);
        });

        primitives.remove(model);
      });
    });

    it("silhouetteSupported", function () {
      expect(Model.silhouetteSupported(scene)).toBe(true);
      scene.context._stencilBits = 0;
      expect(Model.silhouetteSupported(scene)).toBe(false);
      scene.context._stencilBits = 8;
    });

    it("renders with a silhouette", function () {
      return loadModel(boxUrl).then(function (model) {
        model.show = true;
        model.zoomTo();

        var commands = scene.frameState.commandList;

        // No silhouette
        model.silhouetteSize = 0.0;
        scene.renderForSpecs();
        expect(commands.length).toBe(1);
        expect(commands[0].renderState.stencilTest.enabled).toBe(false);
        expect(commands[0].pass).toBe(Pass.OPAQUE);

        // Opaque silhouette
        model.silhouetteSize = 1.0;
        scene.renderForSpecs();
        expect(commands.length).toBe(2);
        expect(commands[0].renderState.stencilTest.enabled).toBe(true);
        expect(commands[0].pass).toBe(Pass.OPAQUE);
        expect(commands[1].renderState.stencilTest.enabled).toBe(true);
        expect(commands[1].pass).toBe(Pass.OPAQUE);

        // Translucent silhouette
        model.silhouetteColor = Color.fromAlpha(Color.GREEN, 0.5);
        scene.renderForSpecs();
        expect(commands.length).toBe(2);
        expect(commands[0].renderState.stencilTest.enabled).toBe(true);
        expect(commands[0].pass).toBe(Pass.OPAQUE);
        expect(commands[1].renderState.stencilTest.enabled).toBe(true);
        expect(commands[1].pass).toBe(Pass.TRANSLUCENT);

        // Invisible silhouette. The model is rendered normally.
        model.silhouetteColor = Color.fromAlpha(Color.GREEN, 0.0);
        scene.renderForSpecs();
        expect(commands.length).toBe(1);
        expect(commands[0].renderState.stencilTest.enabled).toBe(false);
        expect(commands[0].pass).toBe(Pass.OPAQUE);

        // Invisible model with no silhouette. No commands.
        model.color = Color.fromAlpha(Color.WHITE, 0.0);
        model.silhouetteColor = Color.GREEN;
        model.silhouetteSize = 0.0;
        scene.renderForSpecs();
        expect(commands.length).toBe(0);

        // Invisible model with silhouette. Model command is stencil-only.
        model.silhouetteSize = 1.0;
        scene.renderForSpecs();
        expect(commands.length).toBe(2);
        expect(commands[0].renderState.colorMask).toEqual({
          red: false,
          green: false,
          blue: false,
          alpha: false,
        });
        expect(commands[0].renderState.depthMask).toEqual(false);
        expect(commands[0].renderState.stencilTest.enabled).toBe(true);
        expect(commands[0].pass).toBe(Pass.OPAQUE);
        expect(commands[1].renderState.stencilTest.enabled).toBe(true);
        expect(commands[1].pass).toBe(Pass.OPAQUE);

        // Translucent model with opaque silhouette. Silhouette is placed in the translucent pass.
        model.color = Color.fromAlpha(Color.WHITE, 0.5);
        scene.renderForSpecs();
        expect(commands.length).toBe(2);
        expect(commands[0].renderState.stencilTest.enabled).toBe(true);
        expect(commands[0].pass).toBe(Pass.TRANSLUCENT);
        expect(commands[1].renderState.stencilTest.enabled).toBe(true);
        expect(commands[1].pass).toBe(Pass.TRANSLUCENT);

        // Model with translucent commands with silhouette
        model.color = Color.WHITE;
        model._nodeCommands[0].command.pass = Pass.TRANSLUCENT;
        scene.renderForSpecs();
        expect(commands.length).toBe(2);
        expect(commands[0].renderState.stencilTest.enabled).toBe(true);
        expect(commands[0].pass).toBe(Pass.TRANSLUCENT);
        expect(commands[1].renderState.stencilTest.enabled).toBe(true);
        expect(commands[1].pass).toBe(Pass.TRANSLUCENT);
        model._nodeCommands[0].command.pass = Pass.OPAQUE; // Revert change

        // Translucent model with translucent silhouette.
        model.color = Color.fromAlpha(Color.WHITE, 0.5);
        model.silhouetteColor = Color.fromAlpha(Color.GREEN, 0.5);
        scene.renderForSpecs();
        expect(commands.length).toBe(2);
        expect(commands[0].renderState.stencilTest.enabled).toBe(true);
        expect(commands[0].pass).toBe(Pass.TRANSLUCENT);
        expect(commands[1].renderState.stencilTest.enabled).toBe(true);
        expect(commands[1].pass).toBe(Pass.TRANSLUCENT);

        model.color = Color.WHITE;
        model.silhouetteColor = Color.GREEN;

        // Load a second model
        return loadModel(boxUrl).then(function (model2) {
          model2.show = true;
          model2.silhouetteSize = 1.0;
          scene.renderForSpecs();
          expect(commands.length).toBe(4);
          expect(commands[0].renderState.stencilTest.enabled).toBe(true);
          expect(commands[0].pass).toBe(Pass.OPAQUE);
          expect(commands[1].renderState.stencilTest.enabled).toBe(true);
          expect(commands[1].pass).toBe(Pass.OPAQUE);
          expect(commands[2].renderState.stencilTest.enabled).toBe(true);
          expect(commands[2].pass).toBe(Pass.OPAQUE);
          expect(commands[3].renderState.stencilTest.enabled).toBe(true);
          expect(commands[3].pass).toBe(Pass.OPAQUE);

          var reference1 = commands[0].renderState.stencilTest.reference;
          var reference2 = commands[2].renderState.stencilTest.reference;
          expect(reference2).toEqual(reference1 + 1);

          primitives.remove(model);
          primitives.remove(model2);
        });
      });
    });

    it("renders with imageBaseLightingFactor", function () {
      return loadModel(boxPbrUrl).then(function (model) {
        model.show = true;
        model.zoomTo();
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual([0, 0, 0, 255]);
          model.imageBasedLightingFactor = new Cartesian2(0.0, 0.0);
          expect(scene).notToRender(rgba);

          primitives.remove(model);
        });
      });
    });

    it("renders with lightColor", function () {
      return loadModel(boxPbrUrl).then(function (model) {
        model.show = true;
        model.zoomTo();

        var sceneArgs = {
          scene: scene,
          time: JulianDate.fromDate(new Date("January 1, 2014 23:00:00 UTC")),
        };

        expect(sceneArgs).toRenderAndCall(function (rgba) {
          expect(rgba).toEqualEpsilon([131, 9, 9, 255], 5);
        });

        model.imageBasedLightingFactor = new Cartesian2(0.0, 0.0);
        expect(sceneArgs).toRenderAndCall(function (rgba) {
          expect(rgba).toEqualEpsilon([102, 9, 9, 255], 5);
        });

        model.lightColor = new Cartesian3(5.0, 5.0, 5.0);
        expect(sceneArgs).toRenderAndCall(function (rgba) {
          expect(rgba).toEqualEpsilon([164, 16, 16, 255], 5);
        });

        primitives.remove(model);
      });
    });

    it("Updates clipping planes when clipping planes are enabled", function () {
      return loadModel(boxUrl).then(function (model) {
        model.show = true;
        model.zoomTo();

        var gl = scene.frameState.context._gl;
        spyOn(gl, "texImage2D").and.callThrough();

        scene.renderForSpecs();
        var callsBeforeClipping = gl.texImage2D.calls.count();

        model.clippingPlanes = new ClippingPlaneCollection({
          planes: [new ClippingPlane(Cartesian3.UNIT_X, 0.0)],
        });

        model.update(scene.frameState);
        scene.renderForSpecs();
        // When clipping planes are created, we expect two calls to texImage2D
        // (one for initial creation, and one for copying the data in)
        // because clipping planes is stored inside a texture.
        expect(gl.texImage2D.calls.count() - callsBeforeClipping).toEqual(2);

        primitives.remove(model);
      });
    });

    it("Clipping planes selectively disable rendering", function () {
      return loadModel(boxUrl).then(function (model) {
        model.show = true;
        model.zoomTo();

        var modelColor;
        model.update(scene.frameState);
        expect(scene).toRenderAndCall(function (rgba) {
          modelColor = rgba;
        });

        var plane = new ClippingPlane(Cartesian3.UNIT_X, 0.0);
        model.clippingPlanes = new ClippingPlaneCollection({
          planes: [plane],
        });

        model.update(scene.frameState);
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual(modelColor);
        });

        plane.distance = 10.0;
        model.update(scene.frameState);
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).toEqual(modelColor);
        });

        primitives.remove(model);
      });
    });

    it("Clipping planes apply edge styling", function () {
      return loadModel(boxUrl).then(function (model) {
        model.show = true;
        model.zoomTo();

        var modelColor;
        model.update(scene.frameState);
        expect(scene).toRenderAndCall(function (rgba) {
          modelColor = rgba;
        });

        var plane = new ClippingPlane(Cartesian3.UNIT_X, 0.0);
        model.clippingPlanes = new ClippingPlaneCollection({
          planes: [plane],
          edgeWidth: 5.0,
          edgeColor: Color.BLUE,
        });

        model.update(scene.frameState);
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual(modelColor);
        });

        plane.distance = 5.0;
        model.update(scene.frameState);
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).toEqual([0, 0, 255, 255]);
        });

        primitives.remove(model);
      });
    });

    it("Clipping planes union regions", function () {
      return loadModel(boxUrl).then(function (model) {
        model.show = true;
        model.zoomTo();

        var modelColor;
        model.update(scene.frameState);
        expect(scene).toRenderAndCall(function (rgba) {
          modelColor = rgba;
        });

        model.clippingPlanes = new ClippingPlaneCollection({
          planes: [
            new ClippingPlane(Cartesian3.UNIT_Z, 5.0),
            new ClippingPlane(Cartesian3.UNIT_X, 0.0),
          ],
          unionClippingRegions: true,
        });

        model.update(scene.frameState);
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual(modelColor);
        });

        model.clippingPlanes.unionClippingRegions = false;
        model.update(scene.frameState);
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).toEqual(modelColor);
        });

        primitives.remove(model);
      });
    });

    it("gets triangle count", function () {
      expect(texturedBoxModel.trianglesLength).toBe(12);
      expect(cesiumAirModel.trianglesLength).toBe(5984);
    });

    it("gets memory usage", function () {
      // Texture is originally 211*211 but is scaled up to 256*256 to support its minification filter and then is mipmapped
      var expectedTextureMemory = Math.floor(256 * 256 * 4 * (4 / 3));
      var expectedGeometryMemory = 840;
      var options = {
        cacheKey: "memory-usage-test",
        incrementallyLoadTextures: false,
      };
      return loadModel(texturedBoxUrl, options).then(function (model) {
        // The first model owns the resources
        expect(model.geometryByteLength).toBe(expectedGeometryMemory);
        expect(model.texturesByteLength).toBe(expectedTextureMemory);
        expect(model.cachedGeometryByteLength).toBe(0);
        expect(model.cachedTexturesByteLength).toBe(0);

        return loadModel(texturedBoxUrl, options).then(function (model) {
          // The second model is sharing the resources, so its memory usage is reported as 0
          expect(model.geometryByteLength).toBe(0);
          expect(model.texturesByteLength).toBe(0);
          expect(model.cachedGeometryByteLength).toBe(expectedGeometryMemory);
          expect(model.cachedTexturesByteLength).toBe(expectedTextureMemory);
        });
      });
    });

    it("renders box when back face culling is disabled", function () {
      return loadModel(boxBackFaceCullingUrl).then(function (model) {
        expect(model.ready).toBe(true);
        model.show = true;

        // Look at the model
        model.zoomTo();

        expect({
          scene: scene,
          time: JulianDate.fromDate(new Date("January 1, 2014 12:00:00 UTC")),
        }).toRenderAndCall(function (rgba) {
          expect(rgba).toEqual([0, 0, 0, 255]);
        });

        model.backFaceCulling = false;

        expect({
          scene: scene,
          time: JulianDate.fromDate(new Date("January 1, 2014 12:00:00 UTC")),
        }).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual([0, 0, 0, 255]);
        });

        primitives.remove(model);
      });
    });

    describe("height referenced model", function () {
      function createMockGlobe() {
        var globe = {
          callback: undefined,
          removedCallback: false,
          ellipsoid: Ellipsoid.WGS84,
          update: function () {},
          render: function () {},
          getHeight: function () {
            return 0.0;
          },
          _surface: {
            tileProvider: {
              ready: true,
            },
            _tileLoadQueueHigh: [],
            _tileLoadQueueMedium: [],
            _tileLoadQueueLow: [],
            _debug: {
              tilesWaitingForChildren: 0,
            },
          },
          imageryLayersUpdatedEvent: new Event(),
          destroy: function () {},
        };

        globe.beginFrame = function () {};

        globe.endFrame = function () {};

        globe.terrainProviderChanged = new Event();
        Object.defineProperties(globe, {
          terrainProvider: {
            set: function (value) {
              this.terrainProviderChanged.raiseEvent(value);
            },
          },
        });

        globe._surface.updateHeight = function (position, callback) {
          globe.callback = callback;
          return function () {
            globe.removedCallback = true;
            globe.callback = undefined;
          };
        };

        return globe;
      }

      it("explicitly constructs a model with height reference", function () {
        scene.globe = createMockGlobe();
        return loadModelJson(texturedBoxModel.gltf, {
          heightReference: HeightReference.CLAMP_TO_GROUND,
          scene: scene,
        }).then(function (model) {
          expect(model.heightReference).toEqual(
            HeightReference.CLAMP_TO_GROUND
          );
          primitives.remove(model);
        });
      });

      it("set model height reference property", function () {
        scene.globe = createMockGlobe();
        return loadModelJson(texturedBoxModel.gltf, {
          scene: scene,
        }).then(function (model) {
          model.heightReference = HeightReference.CLAMP_TO_GROUND;
          expect(model.heightReference).toEqual(
            HeightReference.CLAMP_TO_GROUND
          );
          primitives.remove(model);
        });
      });

      it("creating with a height reference creates a height update callback", function () {
        scene.globe = createMockGlobe();
        return loadModelJson(texturedBoxModel.gltf, {
          heightReference: HeightReference.CLAMP_TO_GROUND,
          position: Cartesian3.fromDegrees(-72.0, 40.0),
          scene: scene,
        }).then(function (model) {
          expect(scene.globe.callback).toBeDefined();
          primitives.remove(model);
        });
      });

      it("set height reference property creates a height update callback", function () {
        scene.globe = createMockGlobe();
        return loadModelJson(texturedBoxModel.gltf, {
          position: Cartesian3.fromDegrees(-72.0, 40.0),
          scene: scene,
          show: true,
        }).then(function (model) {
          model.heightReference = HeightReference.CLAMP_TO_GROUND;
          expect(model.heightReference).toEqual(
            HeightReference.CLAMP_TO_GROUND
          );
          scene.renderForSpecs();
          expect(scene.globe.callback).toBeDefined();
          primitives.remove(model);
        });
      });

      it("updates the callback when the height reference changes", function () {
        scene.globe = createMockGlobe();
        return loadModelJson(texturedBoxModel.gltf, {
          heightReference: HeightReference.CLAMP_TO_GROUND,
          position: Cartesian3.fromDegrees(-72.0, 40.0),
          scene: scene,
          show: true,
        }).then(function (model) {
          expect(scene.globe.callback).toBeDefined();

          model.heightReference = HeightReference.RELATIVE_TO_GROUND;
          scene.renderForSpecs();
          expect(scene.globe.removedCallback).toEqual(true);
          expect(scene.globe.callback).toBeDefined();

          scene.globe.removedCallback = false;
          model.heightReference = HeightReference.NONE;
          scene.renderForSpecs();
          expect(scene.globe.removedCallback).toEqual(true);
          expect(scene.globe.callback).not.toBeDefined();

          primitives.remove(model);
        });
      });

      it("changing the position updates the callback", function () {
        scene.globe = createMockGlobe();
        return loadModelJson(texturedBoxModel.gltf, {
          heightReference: HeightReference.CLAMP_TO_GROUND,
          position: Cartesian3.fromDegrees(-72.0, 40.0),
          scene: scene,
          show: true,
        }).then(function (model) {
          expect(scene.globe.callback).toBeDefined();

          var matrix = Matrix4.clone(model.modelMatrix);
          var position = Cartesian3.fromDegrees(-73.0, 40.0);
          matrix[12] = position.x;
          matrix[13] = position.y;
          matrix[14] = position.z;

          model.modelMatrix = matrix;
          scene.renderForSpecs();

          expect(scene.globe.removedCallback).toEqual(true);
          expect(scene.globe.callback).toBeDefined();

          primitives.remove(model);
        });
      });

      it("callback updates the position", function () {
        scene.globe = createMockGlobe();
        return loadModelJson(texturedBoxModel.gltf, {
          heightReference: HeightReference.CLAMP_TO_GROUND,
          position: Cartesian3.fromDegrees(-72.0, 40.0),
          scene: scene,
          show: true,
        }).then(function (model) {
          expect(scene.globe.callback).toBeDefined();
          scene.renderForSpecs();

          scene.globe.callback(Cartesian3.fromDegrees(-72.0, 40.0, 100.0));
          var matrix = model._clampedModelMatrix;
          var clampedPosition = new Cartesian3(
            matrix[12],
            matrix[13],
            matrix[14]
          );
          var cartographic = scene.globe.ellipsoid.cartesianToCartographic(
            clampedPosition
          );
          expect(cartographic.height).toEqualEpsilon(
            100.0,
            CesiumMath.EPSILON9
          );

          primitives.remove(model);
        });
      });

      it("removes the callback on destroy", function () {
        scene.globe = createMockGlobe();
        return loadModelJson(texturedBoxModel.gltf, {
          heightReference: HeightReference.CLAMP_TO_GROUND,
          position: Cartesian3.fromDegrees(-72.0, 40.0),
          scene: scene,
          show: true,
        }).then(function (model) {
          expect(scene.globe.callback).toBeDefined();
          scene.renderForSpecs();

          primitives.remove(model);
          scene.renderForSpecs();
          expect(scene.globe.callback).toBeUndefined();
        });
      });

      it("changing the terrain provider", function () {
        scene.globe = createMockGlobe();
        return loadModelJson(texturedBoxModel.gltf, {
          heightReference: HeightReference.CLAMP_TO_GROUND,
          position: Cartesian3.fromDegrees(-72.0, 40.0),
          scene: scene,
        }).then(function (model) {
          expect(model._heightChanged).toBe(false);

          var terrainProvider = new CesiumTerrainProvider({
            url: "made/up/url",
            requestVertexNormals: true,
          });

          scene.terrainProvider = terrainProvider;

          expect(model._heightChanged).toBe(true);
        });
      });

      it("height reference without a scene rejects", function () {
        scene.globe = createMockGlobe();
        return loadModelJson(texturedBoxModel.gltf, {
          heightReference: HeightReference.CLAMP_TO_GROUND,
          position: Cartesian3.fromDegrees(-72.0, 40.0),
          show: true,
        }).otherwise(function (error) {
          expect(error.message).toEqual(
            "Height reference is not supported without a scene and globe."
          );
        });
      });

      it("changing height reference without a scene throws DeveloperError", function () {
        scene.globe = createMockGlobe();
        return loadModelJson(texturedBoxModel.gltf, {
          position: Cartesian3.fromDegrees(-72.0, 40.0),
          show: true,
        }).then(function (model) {
          model.heightReference = HeightReference.CLAMP_TO_GROUND;

          expect(function () {
            return scene.renderForSpecs();
          }).toThrowDeveloperError();

          primitives.remove(model);
        });
      });

      it("height reference without a globe rejects", function () {
        scene.globe = undefined;
        return loadModelJson(texturedBoxModel.gltf, {
          heightReference: HeightReference.CLAMP_TO_GROUND,
          position: Cartesian3.fromDegrees(-72.0, 40.0),
          scene: scene,
          show: true,
        }).otherwise(function (error) {
          expect(error.message).toEqual(
            "Height reference is not supported without a scene and globe."
          );
        });
      });

      it("changing height reference without a globe throws DeveloperError", function () {
        scene.globe = undefined;
        return loadModelJson(texturedBoxModel.gltf, {
          position: Cartesian3.fromDegrees(-72.0, 40.0),
          show: true,
        }).then(function (model) {
          model.heightReference = HeightReference.CLAMP_TO_GROUND;

          expect(function () {
            return scene.renderForSpecs();
          }).toThrowDeveloperError();

          primitives.remove(model);
        });
      });
    });
  },
  "WebGL"
);
