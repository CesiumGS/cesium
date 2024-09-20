import {
  Atmosphere,
  Axis,
  Cartesian2,
  Cartesian3,
  Cesium3DTileStyle,
  CesiumTerrainProvider,
  ClassificationType,
  ClippingPlane,
  ClippingPlaneCollection,
  ClippingPolygon,
  ClippingPolygonCollection,
  Color,
  ColorBlendMode,
  Credit,
  CustomShader,
  defaultValue,
  defined,
  DirectionalLight,
  DistanceDisplayCondition,
  DynamicAtmosphereLightingType,
  DracoLoader,
  Ellipsoid,
  FeatureDetection,
  Globe,
  Fog,
  HeadingPitchRange,
  HeadingPitchRoll,
  HeightReference,
  ImageBasedLighting,
  JobScheduler,
  JulianDate,
  Math as CesiumMath,
  Matrix3,
  Matrix4,
  Model,
  ModelFeature,
  ModelSceneGraph,
  ModelUtility,
  Pass,
  PrimitiveType,
  Resource,
  ResourceCache,
  RuntimeError,
  ShaderProgram,
  ShadowMode,
  SpecularEnvironmentCubeMap,
  SplitDirection,
  StyleCommandsNeeded,
  SunLight,
  Transforms,
  WireframeIndexGenerator,
} from "../../../index.js";
import createScene from "../../../../../Specs/createScene.js";
import pollToPromise from "../../../../../Specs/pollToPromise.js";
import loadAndZoomToModelAsync from "./loadAndZoomToModelAsync.js";

describe(
  "Scene/Model/Model",
  function () {
    const webglStub = !!window.webglStub;

    const triangleWithoutIndicesUrl =
      "./Data/Models/glTF-2.0/TriangleWithoutIndices/glTF/TriangleWithoutIndices.gltf";
    const animatedTriangleUrl =
      "./Data/Models/glTF-2.0/AnimatedTriangle/glTF/AnimatedTriangle.gltf";
    const animatedTriangleOffset = new HeadingPitchRange(
      CesiumMath.PI / 2.0,
      0,
      2.0
    );

    const boxTexturedGltfUrl =
      "./Data/Models/glTF-2.0/BoxTextured/glTF/BoxTextured.gltf";
    const boxTexturedGlbUrl =
      "./Data/Models/glTF-2.0/BoxTextured/glTF-Binary/BoxTextured.glb";
    const buildingsMetadata =
      "./Data/Models/glTF-2.0/BuildingsMetadata/glTF/buildings-metadata.gltf";

    const boxInstanced =
      "./Data/Models/glTF-2.0/BoxInstanced/glTF/box-instanced.gltf";
    const boxInstancedNoNormalsUrl =
      "./Data/Models/glTF-2.0/BoxInstancedNoNormals/glTF/BoxInstancedNoNormals.gltf";
    const boxUnlitUrl = "./Data/Models/glTF-2.0/UnlitTest/glTF/UnlitTest.gltf";
    const boxArticulationsUrl =
      "./Data/Models/glTF-2.0/BoxArticulations/glTF/BoxArticulations.gltf";
    // prettier-ignore
    const boxArticulationsMatrix = Matrix4.fromRowMajorArray([
      1, 0, 0, 0,
      0, 0, 1, 0,
      0, -1, 0, 0,
      0, 0, 0, 1
    ]);
    const boxWithOffsetUrl =
      "./Data/Models/glTF-2.0/BoxWithOffset/glTF/BoxWithOffset.gltf";

    const microcosm = "./Data/Models/glTF-2.0/Microcosm/glTF/microcosm.gltf";
    const morphPrimitivesTestUrl =
      "./Data/Models/glTF-2.0/MorphPrimitivesTest/glTF/MorphPrimitivesTest.gltf";
    const pointCloudUrl =
      "./Data/Models/glTF-2.0/PointCloudWithRGBColors/glTF-Binary/PointCloudWithRGBColors.glb";
    const twoSidedPlaneUrl =
      "./Data/Models/glTF-2.0/TwoSidedPlane/glTF/TwoSidedPlane.gltf";
    const vertexColorTestUrl =
      "./Data/Models/glTF-2.0/VertexColorTest/glTF/VertexColorTest.gltf";
    const emissiveTextureUrl =
      "./Data/Models/glTF-2.0/BoxEmissive/glTF/BoxEmissive.gltf";
    const boomBoxUrl =
      "./Data/Models/glTF-2.0/BoomBox/glTF-pbrSpecularGlossiness/BoomBox.gltf";
    const boxSpecularUrl =
      "./Data/Models/glTF-2.0/BoxSpecular/glTF/BoxSpecular.gltf";
    const boxAnisotropyUrl =
      "./Data/Models/glTF-2.0/BoxAnisotropy/glTF/BoxAnisotropy.gltf";
    const boxClearcoatUrl =
      "./Data/Models/glTF-2.0/BoxClearcoat/glTF/BoxClearcoat.gltf";
    const riggedFigureUrl =
      "./Data/Models/glTF-2.0/RiggedFigureTest/glTF/RiggedFigureTest.gltf";
    const dracoCesiumManUrl =
      "./Data/Models/glTF-2.0/CesiumMan/glTF-Draco/CesiumMan.gltf";
    const boxCesiumRtcUrl =
      "./Data/Models/glTF-2.0/BoxCesiumRtc/glTF/BoxCesiumRtc.gltf";

    const propertyTextureWithTextureTransformUrl =
      "./Data/Models/glTF-2.0/PropertyTextureWithTextureTransform/glTF/PropertyTextureWithTextureTransform.gltf";
    const featureIdTextureWithTextureTransformUrl =
      "./Data/Models/glTF-2.0/FeatureIdTextureWithTextureTransform/glTF/FeatureIdTextureWithTextureTransform.gltf";

    const fixedFrameTransform = Transforms.localFrameToFixedFrameGenerator(
      "north",
      "west"
    );

    const modelMatrix = Transforms.headingPitchRollToFixedFrame(
      Cartesian3.fromDegrees(-123.0744619, 44.0503706, 0),
      new HeadingPitchRoll(0, 0, 0),
      Ellipsoid.WGS84,
      fixedFrameTransform
    );

    let scene;
    let scene2D;
    let sceneCV;

    beforeAll(function () {
      scene = createScene();

      scene2D = createScene();
      scene2D.morphTo2D(0.0);

      sceneCV = createScene();
      sceneCV.morphToColumbusView(0.0);
    });

    afterAll(function () {
      scene.destroyForSpecs();
      scene2D.destroyForSpecs();
      sceneCV.destroyForSpecs();
    });

    afterEach(function () {
      scene.primitives.removeAll();
      scene2D.primitives.removeAll();
      sceneCV.primitives.removeAll();
      scene.verticalExaggeration = 1.0;
      ResourceCache.clearForSpecs();
    });

    function zoomTo(model, zoom) {
      zoom = defaultValue(zoom, 4.0);

      const camera = scene.camera;
      const center = model.boundingSphere.center;
      const r =
        zoom * Math.max(model.boundingSphere.radius, camera.frustum.near);
      camera.lookAt(center, new HeadingPitchRange(0.0, 0.0, r));
    }

    const scratchBytes = [];
    const defaultDate = JulianDate.fromDate(
      new Date("January 1, 2014 12:00:00 UTC")
    );

    function verifyRender(model, shouldRender, options) {
      expect(model.ready).toBe(true);
      options = defaultValue(options, defaultValue.EMPTY_OBJECT);

      const zoomToModel = defaultValue(options.zoomToModel, true);
      if (zoomToModel) {
        zoomTo(model);
      }

      const backgroundColor = defaultValue(
        options.backgroundColor,
        Color.BLACK
      );

      const targetScene = defaultValue(options.scene, scene);

      targetScene.backgroundColor = backgroundColor;
      const backgroundColorBytes = backgroundColor.toBytes(scratchBytes);

      const time = defaultValue(options.time, defaultDate);

      expect({
        scene: targetScene,
        time: time,
      }).toRenderAndCall(function (rgba) {
        if (shouldRender) {
          expect(rgba).not.toEqual(backgroundColorBytes);
        } else {
          expect(rgba).toEqual(backgroundColorBytes);
        }
      });

      targetScene.backgroundColor = Color.BLACK;
    }

    function verifyDebugWireframe(model, primitiveType, options) {
      options = defaultValue(options, defaultValue.EMPTY_OBJECT);
      const modelHasIndices = defaultValue(options.hasIndices, true);
      const targetScene = defaultValue(options.scene, scene);

      const commandList = targetScene.frameState.commandList;
      const commandCounts = [];
      let i, command;

      targetScene.renderForSpecs();
      for (i = 0; i < commandList.length; i++) {
        command = commandList[i];
        expect(command.primitiveType).toBe(primitiveType);
        if (!modelHasIndices) {
          expect(command.vertexArray.indexBuffer).toBeUndefined();
        }
        commandCounts.push(command.count);
      }

      model.debugWireframe = true;
      expect(model._drawCommandsBuilt).toBe(false);

      targetScene.renderForSpecs();
      for (i = 0; i < commandList.length; i++) {
        command = commandList[i];
        expect(command.primitiveType).toBe(PrimitiveType.LINES);
        expect(command.vertexArray.indexBuffer).toBeDefined();

        const expectedCount = WireframeIndexGenerator.getWireframeIndicesCount(
          primitiveType,
          commandCounts[i]
        );
        expect(command.count).toEqual(expectedCount);
      }

      model.debugWireframe = false;
      expect(model._drawCommandsBuilt).toBe(false);

      targetScene.renderForSpecs();
      for (i = 0; i < commandList.length; i++) {
        command = commandList[i];
        expect(command.primitiveType).toBe(primitiveType);
        if (!modelHasIndices) {
          expect(command.vertexArray.indexBuffer).toBeUndefined();
        }
        expect(command.count).toEqual(commandCounts[i]);
      }
    }

    it("fromGltfAsync throws with undefined options", async function () {
      await expectAsync(Model.fromGltfAsync()).toBeRejectedWithDeveloperError();
    });

    it("fromGltfAsync throws with undefined url", async function () {
      await expectAsync(
        Model.fromGltfAsync({})
      ).toBeRejectedWithDeveloperError();
    });

    it("initializes and renders from Uint8Array", async function () {
      const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
      const buffer = await resource.fetchArrayBuffer();
      const model = await loadAndZoomToModelAsync(
        { gltf: new Uint8Array(buffer) },
        scene
      );
      expect(model.ready).toEqual(true);
      expect(model._sceneGraph).toBeDefined();
      expect(model._resourcesLoaded).toEqual(true);
      verifyRender(model, true);
    });

    it("initializes and renders from JSON object", async function () {
      const resource = Resource.createIfNeeded(boxTexturedGltfUrl);
      const gltf = await resource.fetchJson();
      const model = await loadAndZoomToModelAsync(
        {
          gltf: gltf,
          basePath: boxTexturedGltfUrl,
        },
        scene
      );
      expect(model.ready).toEqual(true);
      expect(model._sceneGraph).toBeDefined();
      expect(model._resourcesLoaded).toEqual(true);
      verifyRender(model, true);
    });

    it("initializes and renders from JSON object with external buffers", async function () {
      const resource = Resource.createIfNeeded(microcosm);
      const gltf = await resource.fetchJson();
      const model = await loadAndZoomToModelAsync(
        {
          gltf: gltf,
          basePath: microcosm,
        },
        scene
      );
      expect(model.ready).toEqual(true);
      expect(model._sceneGraph).toBeDefined();
      expect(model._resourcesLoaded).toEqual(true);
      verifyRender(model, true);
    });

    it("initializes and renders with url", async function () {
      const model = await loadAndZoomToModelAsync(
        {
          url: boxTexturedGltfUrl,
        },
        scene
      );
      expect(model.ready).toEqual(true);
      expect(model._sceneGraph).toBeDefined();
      expect(model._resourcesLoaded).toEqual(true);
      verifyRender(model, true);
    });

    it("calls gltfCallback", async function () {
      let wasCalled = false;
      const model = await loadAndZoomToModelAsync(
        {
          url: boxTexturedGltfUrl,
          gltfCallback: (gltf) => {
            wasCalled = true;
            expect(gltf).toEqual(
              jasmine.objectContaining({
                asset: { generator: "COLLADA2GLTF", version: "2.0" },
              })
            );
          },
        },
        scene
      );
      expect(model.ready).toEqual(true);
      expect(model._sceneGraph).toBeDefined();
      expect(model._resourcesLoaded).toEqual(true);
      expect(wasCalled).toBeTrue();
      verifyRender(model, true);
    });

    it("raises errorEvent when a texture fails to load and incrementallyLoadTextures is true", async function () {
      const resource = Resource.createIfNeeded(boxTexturedGltfUrl);
      const gltf = await resource.fetchJson();
      gltf.images[0].uri = "non-existent-path.png";
      const model = await Model.fromGltfAsync({
        gltf: gltf,
        basePath: boxTexturedGltfUrl,
        incrementallyLoadTextures: true,
      });
      scene.primitives.add(model);
      let finished = false;

      model.errorEvent.addEventListener((e) => {
        expect(e).toBeInstanceOf(RuntimeError);
        expect(e.message).toContain("Failed to load texture");
        expect(e.message).toContain(
          "Failed to load image: non-existent-path.png"
        );
        finished = true;
      });

      return pollToPromise(function () {
        scene.renderForSpecs();
        return model.ready && finished;
      });
    });

    it("raises errorEvent when a texture fails to load and incrementallyLoadTextures is false", async function () {
      const resource = Resource.createIfNeeded(boxTexturedGltfUrl);
      const gltf = await resource.fetchJson();
      gltf.images[0].uri = "non-existent-path.png";
      const model = await Model.fromGltfAsync({
        gltf: gltf,
        basePath: boxTexturedGltfUrl,
        incrementallyLoadTextures: false,
      });
      scene.primitives.add(model);
      let finished = false;

      model.errorEvent.addEventListener((e) => {
        expect(e).toBeInstanceOf(RuntimeError);
        expect(e.message).toContain(
          `Failed to load model: ${boxTexturedGltfUrl}`
        );
        expect(e.message).toContain("Failed to load texture");
        finished = true;
      });

      return pollToPromise(function () {
        scene.renderForSpecs();
        return finished;
      });
    });

    it("raises errorEvent when external buffer fails to load", async function () {
      const resource = Resource.createIfNeeded(boxTexturedGltfUrl);
      const gltf = await resource.fetchJson();
      gltf.buffers[0].uri = "non-existent-path.bin";
      const model = await Model.fromGltfAsync({
        gltf: gltf,
        basePath: boxTexturedGltfUrl,
        incrementallyLoadTextures: false,
      });
      scene.primitives.add(model);
      let finished = false;

      model.errorEvent.addEventListener((e) => {
        expect(e).toBeInstanceOf(RuntimeError);
        expect(e.message).toContain(
          `Failed to load model: ${boxTexturedGltfUrl}`
        );
        expect(e.message).toContain("Failed to load vertex buffer");
        finished = true;
      });

      return pollToPromise(function () {
        scene.renderForSpecs();
        return finished;
      });
    });

    it("loads with asynchronous set to true", async function () {
      const jobSchedulerExecute = spyOn(
        JobScheduler.prototype,
        "execute"
      ).and.callThrough();

      const model = await loadAndZoomToModelAsync(
        {
          gltf: boxTexturedGltfUrl,
          asynchronous: true,
        },
        scene
      );
      const loader = model.loader;
      expect(loader._asynchronous).toBe(true);

      expect(jobSchedulerExecute).toHaveBeenCalled();
    });

    it("loads with asynchronous set to false", async function () {
      const jobSchedulerExecute = spyOn(
        JobScheduler.prototype,
        "execute"
      ).and.callThrough();

      const model = await loadAndZoomToModelAsync(
        {
          gltf: boxTexturedGltfUrl,
          asynchronous: false,
        },
        scene
      );
      const loader = model.loader;
      expect(loader._asynchronous).toBe(false);

      expect(jobSchedulerExecute).not.toHaveBeenCalled();
    });

    it("initializes feature table", async function () {
      const model = await loadAndZoomToModelAsync(
        { gltf: buildingsMetadata },
        scene
      );
      expect(model.ready).toEqual(true);
      expect(model.featureTables).toBeDefined();

      const featureTable = model.featureTables[0];
      expect(featureTable).toBeDefined();

      const featuresLength = featureTable.featuresLength;
      expect(featuresLength).toEqual(10);
      expect(featureTable.batchTexture).toBeDefined();
      expect(featureTable.batchTexture._featuresLength).toEqual(10);

      for (let i = 0; i < featuresLength; i++) {
        const modelFeature = featureTable.getFeature(i);
        expect(modelFeature instanceof ModelFeature).toEqual(true);
        expect(modelFeature._featureId).toEqual(i);
        expect(modelFeature.primitive).toEqual(model);
        expect(modelFeature.featureTable).toEqual(featureTable);
      }

      expect(model._resourcesLoaded).toEqual(true);
    });

    it("sets default properties", async function () {
      const model = await loadAndZoomToModelAsync(
        {
          gltf: boxTexturedGlbUrl,
        },
        scene
      );
      expect(model.show).toEqual(true);
      expect(model.modelMatrix).toEqual(Matrix4.IDENTITY);
      expect(model.scale).toEqual(1.0);
      expect(model.minimumPixelSize).toEqual(0.0);
      expect(model.maximumScale).toBeUndefined();

      expect(model.id).toBeUndefined();
      expect(model.allowPicking).toEqual(true);

      expect(model.enableVerticalExaggeration).toEqual(true);

      expect(model.activeAnimations).toBeDefined();
      expect(model.clampAnimations).toEqual(true);

      expect(model.shadows).toEqual(ShadowMode.ENABLED);
      expect(model.debugShowBoundingVolume).toEqual(false);
      expect(model._enableDebugWireframe).toEqual(false);
      expect(model.debugWireframe).toEqual(false);

      expect(model.cull).toEqual(true);
      expect(model.backFaceCulling).toEqual(true);
      expect(model.opaquePass).toEqual(Pass.OPAQUE);
      expect(model.customShader).toBeUndefined();

      expect(model.heightReference).toEqual(HeightReference.NONE);
      expect(model.scene).toBeUndefined();
      expect(model.distanceDisplayCondition).toBeUndefined();

      expect(model.color).toBeUndefined();
      expect(model.colorBlendMode).toEqual(ColorBlendMode.HIGHLIGHT);
      expect(model.colorBlendAmount).toEqual(0.5);
      expect(model.silhouetteColor).toEqual(Color.RED);
      expect(model.silhouetteSize).toEqual(0.0);

      expect(model._enableShowOutline).toEqual(true);
      expect(model.showOutline).toEqual(true);
      expect(model.outlineColor).toEqual(Color.BLACK);

      expect(model.clippingPlanes).toBeUndefined();
      expect(model.lightColor).toBeUndefined();
      expect(model.imageBasedLighting).toBeDefined();

      expect(model.credit).toBeUndefined();
      expect(model.showCreditsOnScreen).toEqual(false);
      expect(model.splitDirection).toEqual(SplitDirection.NONE);
      expect(model._projectTo2D).toEqual(false);
    });

    it("renders model without indices", async function () {
      const resource = Resource.createIfNeeded(triangleWithoutIndicesUrl);
      const gltf = await resource.fetchJson();
      const model = await loadAndZoomToModelAsync(
        {
          gltf: gltf,
          basePath: triangleWithoutIndicesUrl,
          modelMatrix: Transforms.eastNorthUpToFixedFrame(
            Cartesian3.fromDegrees(0.0, 0.0, 100.0)
          ),
        },
        scene
      );
      // Orient the camera so it doesn't back-face cull the triangle.
      const center = model.boundingSphere.center;
      const range = 4.0 * model.boundingSphere.radius;
      scene.camera.lookAt(
        center,
        new HeadingPitchRange(-CesiumMath.PI_OVER_TWO, 0, range)
      );

      // The triangle's diagonal edge is slightly out of frame.
      scene.camera.moveDown(0.1);

      verifyRender(model, true, {
        zoomToModel: false,
      });
    });

    it("renders model with vertex colors", async function () {
      const resource = Resource.createIfNeeded(vertexColorTestUrl);
      const gltf = await resource.fetchJson();
      await loadAndZoomToModelAsync(
        {
          gltf: gltf,
          basePath: vertexColorTestUrl,
        },
        scene
      );
      const renderOptions = {
        scene: scene,
        time: defaultDate,
      };
      // Move the camera to the blue plane.
      scene.camera.moveLeft(0.5);

      expect(renderOptions).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toEqual(0);
        expect(rgba[1]).toEqual(0);
        expect(rgba[2]).toEqual(255);
        expect(rgba[3]).toEqual(255);
      });

      // Move the camera to the red plane.
      scene.camera.moveRight(1.0);
      expect(renderOptions).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toEqual(255);
        expect(rgba[1]).toEqual(0);
        expect(rgba[2]).toEqual(0);
        expect(rgba[3]).toEqual(255);
      });
    });

    it("renders model with double-sided material", async function () {
      const resource = Resource.createIfNeeded(twoSidedPlaneUrl);
      const gltf = await resource.fetchJson();
      const model = await loadAndZoomToModelAsync(
        {
          gltf: gltf,
          basePath: twoSidedPlaneUrl,
          modelMatrix: Transforms.eastNorthUpToFixedFrame(
            Cartesian3.fromDegrees(0.0, 0.0, 100.0)
          ),
        },
        scene
      );
      const renderOptions = {
        scene: scene,
        time: defaultDate,
      };

      const center = model.boundingSphere.center;
      const range = 4.0 * model.boundingSphere.radius;
      scene.camera.lookAt(
        center,
        new HeadingPitchRange(0, -CesiumMath.PI_OVER_TWO, range)
      );

      // The top of the double-sided plane should render brightly, since
      // its normal is pointing towards the light
      let result;
      expect(renderOptions).toRenderAndCall(function (rgba) {
        expect(rgba).not.toEqual([0, 0, 0, 255]);
        result = rgba;
      });

      scene.camera.lookAt(
        center,
        new HeadingPitchRange(0, CesiumMath.PI_OVER_TWO, range)
      );

      // The bottom of the plane should render darker than the top, since
      // its normal is pointing away from the light.
      expect(renderOptions).toRenderAndCall(function (rgba) {
        expect(rgba).not.toEqual([0, 0, 0, 255]);

        expect(rgba[0]).toBeLessThan(result[0]);
        expect(rgba[1]).toBeLessThan(result[1]);
        expect(rgba[2]).toBeLessThan(result[2]);
        expect(rgba[3]).toEqual(result[3]);
      });
    });

    // This test does not yet work since models without normals are
    // rendered as unlit. See https://github.com/CesiumGS/cesium/issues/6506
    xit("renders model with emissive texture", async function () {
      const resource = Resource.createIfNeeded(emissiveTextureUrl);
      const gltf = await resource.fetchJson();
      await loadAndZoomToModelAsync(
        {
          gltf: gltf,
          basePath: emissiveTextureUrl,
        },
        scene
      );
      const renderOptions = {
        scene: scene,
        time: defaultDate,
      };

      expect(renderOptions).toRenderAndCall(function (rgba) {
        // Emissive texture is red
        expect(rgba[0]).toBeGreaterThan(20);
        expect(rgba[1]).toBeLessThan(20);
        expect(rgba[2]).toBeLessThan(20);
        expect(rgba[3]).toEqual(255);
      });
    });

    it("renders model with the KHR_materials_pbrSpecularGlossiness extension", async function () {
      // This model gets clipped if log depth is disabled, so zoom out
      // the camera just a little
      const offset = new HeadingPitchRange(0, -CesiumMath.PI_OVER_FOUR, 2);

      const resource = Resource.createIfNeeded(boomBoxUrl);
      const gltf = await resource.fetchJson();
      const model = await loadAndZoomToModelAsync(
        {
          gltf: gltf,
          basePath: boomBoxUrl,
          // This model is tiny, so scale it up so it's visible.
          scale: 10.0,
          offset: offset,
        },
        scene
      );
      verifyRender(model, true);
    });

    it("renders model with the KHR_materials_specular extension", async function () {
      const resource = Resource.createIfNeeded(boxSpecularUrl);
      const gltf = await resource.fetchJson();
      const model = await loadAndZoomToModelAsync(
        {
          gltf: gltf,
          basePath: boxSpecularUrl,
        },
        scene
      );
      verifyRender(model, true);
    });

    it("renders model with the KHR_materials_anisotropy extension", async function () {
      const resource = Resource.createIfNeeded(boxAnisotropyUrl);
      const gltf = await resource.fetchJson();
      const model = await loadAndZoomToModelAsync(
        {
          gltf: gltf,
          basePath: boxAnisotropyUrl,
        },
        scene
      );
      verifyRender(model, true);
    });

    it("renders model with the KHR_materials_clearcoat extension", async function () {
      const resource = Resource.createIfNeeded(boxClearcoatUrl);
      const gltf = await resource.fetchJson();
      const model = await loadAndZoomToModelAsync(
        {
          gltf: gltf,
          basePath: boxClearcoatUrl,
        },
        scene
      );
      verifyRender(model, true);
    });

    it("transforms property textures with KHR_texture_transform", async function () {
      const resource = Resource.createIfNeeded(
        propertyTextureWithTextureTransformUrl
      );
      // The texture in the example model contains contains 8x8 pixels
      // with increasing 'red' component values [0 to 64)*3, interpreted
      // as a normalized `UINT8` property.
      // It has a transform with an offset of [0.25, 0.25], and a scale
      // of [0.5, 0.5].
      // Create a custom shader that will render any value that is smaller
      // than 16*3 or larger than 48*3 (i.e. the first two rows of pixels
      // or the last two rows of pixels) as completely red.
      // These pixels should NOT be visible when the transform is applied.
      const customShader = new CustomShader({
        fragmentShaderText: `
          void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)
          {
            float value = float(fsInput.metadata.exampleProperty);
            float i = value * 255.0;
            if (i < 16.0 * 3.0) {
              material.diffuse = vec3(1.0, 0.0, 0.0);
            } else if (i >= 48.0 * 3.0) {
              material.diffuse = vec3(1.0, 0.0, 0.0);
            } else {
              material.diffuse = vec3(0.0, 0.0, 0.0);
            }
          }
          `,
      });

      const gltf = await resource.fetchJson();
      await loadAndZoomToModelAsync(
        {
          gltf: gltf,
          basePath: propertyTextureWithTextureTransformUrl,
          customShader: customShader,
          // This is important to make sure that the property
          // texture is fully loaded when the model is rendered!
          incrementallyLoadTextures: false,
        },
        scene
      );
      const renderOptions = {
        scene: scene,
        time: defaultDate,
      };
      // Move the camera to look at the point (0.1, 0.1) of
      // the plane at a distance of 0.15. (Note that the axes
      // are swapped, apparently - 'x' is the distance)
      scene.camera.position = new Cartesian3(0.15, 0.1, 0.1);
      scene.camera.direction = Cartesian3.negate(
        Cartesian3.UNIT_X,
        new Cartesian3()
      );
      scene.camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
      scene.camera.frustum.near = 0.01;
      scene.camera.frustum.far = 5.0;

      // When the texture transform was applied, then the
      // resulting pixels should be nearly black (or at
      // least not red)
      expect(renderOptions).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeLessThan(50);
        expect(rgba[1]).toBeLessThan(50);
        expect(rgba[2]).toBeLessThan(50);
      });
    });

    it("transforms feature ID textures with KHR_texture_transform", async function () {
      const resource = Resource.createIfNeeded(
        featureIdTextureWithTextureTransformUrl
      );
      // The texture in the example model contains contains 8x8 pixels
      // with increasing 'red' component values [0 to 64)*3.
      // It has a transform with an offset of [0.25, 0.25], and a scale
      // of [0.5, 0.5].
      // Create a custom shader that will render any value that is smaller
      // than 16*3 or larger than 48*3 (i.e. the first two rows of pixels
      // or the last two rows of pixels) as completely red.
      // These pixels should NOT be visible when the transform is applied.
      const customShader = new CustomShader({
        fragmentShaderText: `
        void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)
        {
          int id = fsInput.featureIds.featureId_0;
          if (id < 16 * 3) {
            material.diffuse = vec3(1.0, 0.0, 0.0);
          } else if (id >= 48 * 3) {
            material.diffuse = vec3(1.0, 0.0, 0.0);
          } else {
            material.diffuse = vec3(0.0, 0.0, 0.0);
          }
        }
      `,
      });

      const gltf = await resource.fetchJson();
      await loadAndZoomToModelAsync(
        {
          gltf: gltf,
          basePath: featureIdTextureWithTextureTransformUrl,
          customShader: customShader,
          // This is important to make sure that the feature ID
          // texture is fully loaded when the model is rendered!
          incrementallyLoadTextures: false,
        },
        scene
      );
      const renderOptions = {
        scene: scene,
        time: defaultDate,
      };
      // Move the camera to look at the point (0.1, 0.1) of
      // the plane at a distance of 0.15. (Note that the axes
      // are swapped, apparently - 'x' is the distance)
      //scene.camera.position = new Cartesian3(0.15, 0.1, 0.1);
      scene.camera.position = new Cartesian3(0.15, 0.1, 0.1);
      scene.camera.direction = Cartesian3.negate(
        Cartesian3.UNIT_X,
        new Cartesian3()
      );
      scene.camera.up = Cartesian3.clone(Cartesian3.UNIT_Z);
      scene.camera.frustum.near = 0.01;
      scene.camera.frustum.far = 5.0;

      // When the texture transform was applied, then the
      // resulting pixels should be nearly black (or at
      // least not red)
      expect(renderOptions).toRenderAndCall(function (rgba) {
        expect(rgba[0]).toBeLessThan(50);
        expect(rgba[1]).toBeLessThan(50);
        expect(rgba[2]).toBeLessThan(50);
      });
    });

    it("renders model with morph targets", async function () {
      // This model gets clipped if log depth is disabled, so zoom out
      // the camera just a little
      const offset = new HeadingPitchRange(0, -CesiumMath.PI_OVER_FOUR, 2);

      const resource = Resource.createIfNeeded(morphPrimitivesTestUrl);
      const gltf = await resource.fetchJson();
      const model = await loadAndZoomToModelAsync(
        {
          gltf: gltf,
          basePath: morphPrimitivesTestUrl,
          offset: offset,
        },
        scene
      );
      // The background color must be changed because the model's texture
      // contains black, which can confuse the test.
      const renderOptions = {
        backgroundColor: Color.BLUE,
        zoomToModel: false,
      };

      // Move the camera down slightly so the morphed part is in view.
      scene.camera.moveDown(0.25);

      // The model is a plane made three-dimensional by morph targets.
      // If morph targets aren't supported, the model won't appear in the camera.
      verifyRender(model, true, renderOptions);
    });

    it("renders Draco-compressed model", async function () {
      const model = await loadAndZoomToModelAsync(
        { gltf: dracoCesiumManUrl },
        scene
      );
      verifyRender(model, true);
    });

    it("fails to load with Draco decoding error", async function () {
      DracoLoader._getDecoderTaskProcessor();
      await pollToPromise(function () {
        return DracoLoader._taskProcessorReady;
      });

      const decoder = DracoLoader._getDecoderTaskProcessor();
      spyOn(decoder, "scheduleTask").and.callFake(function () {
        return Promise.reject({ message: "Custom error" });
      });

      const model = scene.primitives.add(
        await Model.fromGltfAsync({
          url: dracoCesiumManUrl,
        })
      );

      let failed = false;
      model.errorEvent.addEventListener((e) => {
        expect(e).toBeInstanceOf(RuntimeError);
        expect(e.message).toContain(
          `Failed to load model: ${dracoCesiumManUrl}`
        );
        expect(e.message).toContain("Failed to load Draco");
        expect(e.message).toContain("Custom error");
        failed = true;
      });

      await pollToPromise(
        function () {
          scene.renderForSpecs();
          return failed;
        },
        { timeout: 10000 }
      );
    });

    it("renders model without animations added", async function () {
      const model = await loadAndZoomToModelAsync(
        {
          gltf: animatedTriangleUrl,
          offset: animatedTriangleOffset,
        },
        scene
      );
      const animationCollection = model.activeAnimations;
      expect(animationCollection).toBeDefined();
      expect(animationCollection.length).toBe(0);

      // Move camera so that the triangle is in view.
      scene.camera.moveDown(0.5);
      verifyRender(model, true, {
        zoomToModel: false,
      });
    });

    it("renders model with animations added", async function () {
      const model = await loadAndZoomToModelAsync(
        {
          gltf: animatedTriangleUrl,
          offset: animatedTriangleOffset,
        },
        scene
      );
      // Move camera so that the triangle is in view.
      scene.camera.moveDown(0.5);

      // The model rotates such that it leaves the view of the camera
      // halfway into its animation.
      const startTime = defaultDate;
      const animationCollection = model.activeAnimations;
      animationCollection.add({
        index: 0,
        startTime: startTime,
      });
      expect(animationCollection.length).toBe(1);
      verifyRender(model, true, {
        zoomToModel: false,
        time: startTime,
      });

      const time = JulianDate.addSeconds(startTime, 0.5, new JulianDate());
      verifyRender(model, false, {
        zoomToModel: false,
        time: time,
      });
    });

    it("renders model with CESIUM_RTC extension", async function () {
      const model = await loadAndZoomToModelAsync(
        {
          gltf: boxCesiumRtcUrl,
        },
        scene
      );
      verifyRender(model, true);
    });

    it("adds animation to draco-compressed model", async function () {
      const model = await loadAndZoomToModelAsync(
        { gltf: dracoCesiumManUrl },
        scene
      );
      verifyRender(model, true);

      const animationCollection = model.activeAnimations;
      const animation = animationCollection.add({
        index: 0,
      });
      expect(animation).toBeDefined();
      expect(animationCollection.length).toBe(1);
    });

    it("renders model with instancing but no normals", async function () {
      // None of the 4 instanced cubes are in the center of the model's bounding
      // sphere, so set up a camera view that focuses in on one of them.
      const offset = new HeadingPitchRange(
        CesiumMath.PI_OVER_TWO,
        -CesiumMath.PI_OVER_FOUR,
        1
      );

      const resource = Resource.createIfNeeded(boxInstancedNoNormalsUrl);
      const gltf = await resource.fetchJson();
      const model = await loadAndZoomToModelAsync(
        {
          gltf: gltf,
          basePath: boxInstancedNoNormalsUrl,
          offset: offset,
        },
        scene
      );
      const renderOptions = {
        zoomToModel: false,
      };

      verifyRender(model, true, renderOptions);
    });

    it("show works", async function () {
      const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
      const buffer = await resource.fetchArrayBuffer();
      const model = await loadAndZoomToModelAsync(
        { gltf: new Uint8Array(buffer), show: false },
        scene
      );
      expect(model.ready).toEqual(true);
      expect(model.show).toEqual(false);
      verifyRender(model, false);

      model.show = true;
      expect(model.show).toEqual(true);
      verifyRender(model, true);
    });

    it("renders in 2D", async function () {
      const model = await loadAndZoomToModelAsync(
        {
          gltf: boxTexturedGlbUrl,
          modelMatrix: modelMatrix,
        },
        scene2D
      );
      expect(model.ready).toEqual(true);
      verifyRender(model, true, {
        zoomToModel: false,
        scene: scene2D,
      });
    });

    it("renders in 2D over the IDL", async function () {
      const model = await loadAndZoomToModelAsync(
        {
          gltf: boxTexturedGlbUrl,
          modelMatrix: Transforms.eastNorthUpToFixedFrame(
            Cartesian3.fromDegrees(180.0, 0.0)
          ),
        },
        scene2D
      );
      expect(model.ready).toEqual(true);
      verifyRender(model, true, {
        zoomToModel: false,
        scene: scene2D,
      });

      model.modelMatrix = Transforms.eastNorthUpToFixedFrame(
        Cartesian3.fromDegrees(-180.0, 0.0)
      );
      verifyRender(model, true, {
        zoomToModel: false,
        scene: scene2D,
      });
    });

    it("renders in CV", async function () {
      const model = await loadAndZoomToModelAsync(
        {
          gltf: boxTexturedGlbUrl,
          modelMatrix: modelMatrix,
        },
        sceneCV
      );
      expect(model.ready).toEqual(true);
      scene.camera.moveBackward(1.0);
      verifyRender(model, true, {
        zoomToModel: false,
        scene: sceneCV,
      });
    });

    it("renders in CV after draw commands are reset", async function () {
      const model = await loadAndZoomToModelAsync(
        {
          gltf: boxTexturedGlbUrl,
          modelMatrix: modelMatrix,
        },
        sceneCV
      );
      expect(model.ready).toEqual(true);
      scene.camera.moveBackward(1.0);
      verifyRender(model, true, {
        zoomToModel: false,
        scene: sceneCV,
      });

      model._drawCommandsBuilt = false;
      verifyRender(model, true, {
        zoomToModel: false,
        scene: sceneCV,
      });
    });

    it("projectTo2D works for 2D", async function () {
      const model = await loadAndZoomToModelAsync(
        {
          gltf: boxTexturedGlbUrl,
          modelMatrix: modelMatrix,
          projectTo2D: true,
          incrementallyLoadTextures: false,
        },
        scene2D
      );
      expect(model.ready).toEqual(true);
      verifyRender(model, true, {
        zoomToModel: false,
        scene: scene2D,
      });
    });

    it("projectTo2D works for CV", async function () {
      const model = await loadAndZoomToModelAsync(
        {
          gltf: boxTexturedGlbUrl,
          modelMatrix: modelMatrix,
          projectTo2D: true,
          incrementallyLoadTextures: false,
        },
        sceneCV
      );
      expect(model.ready).toEqual(true);
      sceneCV.camera.moveBackward(1.0);
      verifyRender(model, true, {
        zoomToModel: false,
        scene: sceneCV,
      });
    });

    it("does not render during morph", async function () {
      const model = await loadAndZoomToModelAsync(
        {
          gltf: boxTexturedGlbUrl,
          modelMatrix: modelMatrix,
          projectTo2D: true,
        },
        scene
      );
      const commandList = scene.frameState.commandList;
      expect(model.ready).toEqual(true);

      scene.renderForSpecs();
      expect(commandList.length).toBeGreaterThan(0);

      scene.morphTo2D(1.0);
      scene.renderForSpecs();
      expect(commandList.length).toBe(0);

      scene.completeMorph();
      scene.morphTo3D(0.0);
      scene.renderForSpecs();
      expect(commandList.length).toBeGreaterThan(0);
    });

    describe("style", function () {
      it("applies style to model with feature table", async function () {
        const model = await loadAndZoomToModelAsync(
          { gltf: buildingsMetadata },
          scene
        );

        // Renders without style.
        verifyRender(model, true);

        // Renders with opaque style.
        model.style = new Cesium3DTileStyle({
          color: {
            conditions: [["${height} > 1", "color('red')"]],
          },
        });
        verifyRender(model, true);
        expect(model._styleCommandsNeeded).toBe(StyleCommandsNeeded.ALL_OPAQUE);

        // Renders with translucent style.
        model.style = new Cesium3DTileStyle({
          color: {
            conditions: [["${height} > 1", "color('red', 0.5)"]],
          },
        });
        verifyRender(model, true);
        expect(model._styleCommandsNeeded).toBe(
          StyleCommandsNeeded.ALL_TRANSLUCENT
        );

        // Does not render with invisible color.
        model.style = new Cesium3DTileStyle({
          color: {
            conditions: [["${height} > 1", "color('red', 0.0)"]],
          },
        });
        verifyRender(model, false);

        // Does not render when style disables show.
        model.style = new Cesium3DTileStyle({
          show: {
            conditions: [["${height} > 1", "false"]],
          },
        });
        verifyRender(model, false);

        // Render when style is removed.
        model.style = undefined;
        verifyRender(model, true);
      });

      it("applies style to model without feature table", async function () {
        const model = await loadAndZoomToModelAsync(
          { gltf: boxTexturedGlbUrl },
          scene
        );

        const renderOptions = {
          scene: scene,
          time: defaultDate,
        };

        // Renders without style.
        let original;
        verifyRender(model, true);
        expect(renderOptions).toRenderAndCall(function (rgba) {
          original = rgba;
        });

        // Renders with opaque style.
        model.style = new Cesium3DTileStyle({
          color: "color('red')",
        });
        verifyRender(model, true);
        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba[0]).toEqual(original[0]);
          expect(rgba[1]).toBeLessThan(original[1]);
          expect(rgba[2]).toBeLessThan(original[2]);
          expect(rgba[3]).toEqual(original[3]);
        });

        // Renders with translucent style.
        model.style = new Cesium3DTileStyle({
          color: "color('red', 0.5)",
        });
        verifyRender(model, true);
        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba[0]).toBeLessThan(original[0]);
          expect(rgba[1]).toBeLessThan(original[1]);
          expect(rgba[2]).toBeLessThan(original[2]);
          expect(rgba[3]).toEqual(original[3]);
        });

        // Does not render with invisible color.
        model.style = new Cesium3DTileStyle({
          color: "color('red', 0.0)",
        });
        verifyRender(model, false, { zoomToModel: false });

        // Does not render when style disables show.
        model.style = new Cesium3DTileStyle({
          show: "false",
        });
        verifyRender(model, false, { zoomToModel: false });

        // Render when style is removed.
        model.style = undefined;
        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba[0]).toEqual(original[0]);
          expect(rgba[1]).toEqual(original[1]);
          expect(rgba[2]).toEqual(original[2]);
          expect(rgba[3]).toEqual(original[3]);
        });
      });
    });

    describe("credits", function () {
      const boxWithCreditsUrl =
        "./Data/Models/glTF-2.0/BoxWithCopyright/glTF/Box.gltf";

      it("initializes with credit", async function () {
        const credit = new Credit("User Credit");
        const resource = Resource.createIfNeeded(boxTexturedGltfUrl);
        const gltf = await resource.fetchJson();
        await loadAndZoomToModelAsync(
          {
            gltf: gltf,
            basePath: boxTexturedGltfUrl,
            credit: credit,
          },
          scene
        );
        scene.renderForSpecs();
        const creditDisplay = scene.frameState.creditDisplay;
        const credits =
          creditDisplay._currentFrameCredits.lightboxCredits.values;
        expect(credits.length).toEqual(1);
        expect(credits[0].credit.html).toEqual("User Credit");
      });

      it("initializes with credit string", async function () {
        const creditString = "User Credit";
        const resource = Resource.createIfNeeded(boxTexturedGltfUrl);
        const gltf = await resource.fetchJson();
        await loadAndZoomToModelAsync(
          {
            gltf: gltf,
            basePath: boxTexturedGltfUrl,
            credit: creditString,
          },
          scene
        );
        scene.renderForSpecs();
        const creditDisplay = scene.frameState.creditDisplay;
        const credits =
          creditDisplay._currentFrameCredits.lightboxCredits.values;
        expect(credits.length).toEqual(1);
        expect(credits[0].credit.html).toEqual(creditString);
      });

      it("gets copyrights from gltf", async function () {
        const resource = Resource.createIfNeeded(boxWithCreditsUrl);
        const gltf = await resource.fetchJson();
        await loadAndZoomToModelAsync(
          {
            gltf: gltf,
            basePath: boxWithCreditsUrl,
          },
          scene
        );
        const expectedCredits = [
          "First Source",
          "Second Source",
          "Third Source",
        ];

        scene.renderForSpecs();
        const creditDisplay = scene.frameState.creditDisplay;
        const credits =
          creditDisplay._currentFrameCredits.lightboxCredits.values;
        expect(credits.length).toEqual(expectedCredits.length);
        for (let i = 0; i < credits.length; i++) {
          expect(credits[i].credit.html).toEqual(expectedCredits[i]);
        }
      });

      it("displays all types of credits", async function () {
        const resource = Resource.createIfNeeded(boxWithCreditsUrl);
        const gltf = await resource.fetchJson();
        const model = await loadAndZoomToModelAsync(
          {
            gltf: gltf,
            basePath: boxWithCreditsUrl,
            credit: "User Credit",
          },
          scene
        );
        model._resourceCredits = [new Credit("Resource Credit")];
        const expectedCredits = [
          "User Credit",
          "Resource Credit",
          "First Source",
          "Second Source",
          "Third Source",
        ];

        scene.renderForSpecs();
        const creditDisplay = scene.frameState.creditDisplay;
        const credits =
          creditDisplay._currentFrameCredits.lightboxCredits.values;
        expect(credits.length).toEqual(expectedCredits.length);
        for (let i = 0; i < credits.length; i++) {
          expect(credits[i].credit.html).toEqual(expectedCredits[i]);
        }
      });

      it("initializes with showCreditsOnScreen", async function () {
        const resource = Resource.createIfNeeded(boxWithCreditsUrl);
        const gltf = await resource.fetchJson();
        await loadAndZoomToModelAsync(
          {
            gltf: gltf,
            basePath: boxWithCreditsUrl,
            credit: "User Credit",
            showCreditsOnScreen: true,
          },
          scene
        );
        const expectedCredits = [
          "User Credit",
          "First Source",
          "Second Source",
          "Third Source",
        ];

        scene.renderForSpecs();
        const creditDisplay = scene.frameState.creditDisplay;
        const credits = creditDisplay._currentFrameCredits.screenCredits.values;
        expect(credits.length).toEqual(expectedCredits.length);
        for (let i = 0; i < credits.length; i++) {
          expect(credits[i].credit.html).toEqual(expectedCredits[i]);
        }
      });

      it("changing showCreditsOnScreen works", async function () {
        const resource = Resource.createIfNeeded(boxWithCreditsUrl);
        const gltf = await resource.fetchJson();
        const model = await loadAndZoomToModelAsync(
          {
            gltf: gltf,
            basePath: boxWithCreditsUrl,
            credit: "User Credit",
            showCreditsOnScreen: false,
          },
          scene
        );
        const expectedCredits = [
          "User Credit",
          "First Source",
          "Second Source",
          "Third Source",
        ];

        scene.renderForSpecs();
        const creditDisplay = scene.frameState.creditDisplay;
        const lightboxCredits =
          creditDisplay._currentFrameCredits.lightboxCredits.values;
        const screenCredits =
          creditDisplay._currentFrameCredits.screenCredits.values;

        expect(lightboxCredits.length).toEqual(expectedCredits.length);
        for (let i = 0; i < lightboxCredits.length; i++) {
          expect(lightboxCredits[i].credit.html).toEqual(expectedCredits[i]);
        }
        expect(screenCredits.length).toEqual(0);

        model.showCreditsOnScreen = true;
        scene.renderForSpecs();
        expect(screenCredits.length).toEqual(expectedCredits.length);
        for (let i = 0; i < screenCredits.length; i++) {
          expect(screenCredits[i].credit.html).toEqual(expectedCredits[i]);
        }
        expect(lightboxCredits.length).toEqual(0);

        model.showCreditsOnScreen = false;
        scene.renderForSpecs();
        expect(lightboxCredits.length).toEqual(expectedCredits.length);
        for (let i = 0; i < lightboxCredits.length; i++) {
          expect(lightboxCredits[i].credit.html).toEqual(expectedCredits[i]);
        }
        expect(screenCredits.length).toEqual(0);
      });

      it("showCreditsOnScreen overrides existing credit setting", async function () {
        const resource = Resource.createIfNeeded(boxTexturedGltfUrl);
        const gltf = await resource.fetchJson();
        await loadAndZoomToModelAsync(
          {
            gltf: gltf,
            basePath: boxTexturedGltfUrl,
            credit: new Credit("User Credit", false),
            showCreditsOnScreen: true,
          },
          scene
        );
        scene.renderForSpecs();
        const creditDisplay = scene.frameState.creditDisplay;
        const credits = creditDisplay._currentFrameCredits.screenCredits.values;
        expect(credits.length).toEqual(1);
        for (let i = 0; i < credits.length; i++) {
          expect(credits[i].credit.html).toEqual("User Credit");
        }
      });
    });

    describe("debugWireframe", function () {
      const triangleStripUrl =
        "./Data/Models/glTF-2.0/TriangleStrip/glTF/TriangleStrip.gltf";
      const triangleFanUrl =
        "./Data/Models/glTF-2.0/TriangleFan/glTF/TriangleFan.gltf";

      let sceneWithWebgl1;

      beforeAll(function () {
        sceneWithWebgl1 = createScene({
          contextOptions: {
            requestWebgl1: true,
          },
        });
      });

      afterEach(function () {
        sceneWithWebgl1.primitives.removeAll();
      });

      afterAll(function () {
        sceneWithWebgl1.destroyForSpecs();
      });

      it("debugWireframe works for WebGL1 if enableDebugWireframe is true", async function () {
        const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
        const buffer = await resource.fetchArrayBuffer();
        const model = await loadAndZoomToModelAsync(
          { gltf: new Uint8Array(buffer), enableDebugWireframe: true },
          sceneWithWebgl1
        );
        verifyDebugWireframe(model, PrimitiveType.TRIANGLES);
      });

      it("debugWireframe does nothing in WebGL1 if enableDebugWireframe is false", async function () {
        const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
        const buffer = await resource.fetchArrayBuffer();
        const model = await loadAndZoomToModelAsync(
          { gltf: new Uint8Array(buffer), enableDebugWireframe: false },
          sceneWithWebgl1
        );
        const commandList = scene.frameState.commandList;
        const commandCounts = [];
        sceneWithWebgl1.renderForSpecs();
        for (let i = 0; i < commandList.length; i++) {
          const command = commandList[i];
          expect(command.primitiveType).toBe(PrimitiveType.TRIANGLES);
          commandCounts.push(command.count);
        }

        model.debugWireframe = true;
        expect(model._drawCommandsBuilt).toBe(false);

        sceneWithWebgl1.renderForSpecs();
        for (let i = 0; i < commandList.length; i++) {
          const command = commandList[i];
          expect(command.primitiveType).toBe(PrimitiveType.TRIANGLES);
          expect(command.count).toEqual(commandCounts[i]);
        }
      });

      it("debugWireframe works for WebGL2", async function () {
        if (!scene.context.webgl2) {
          return;
        }
        const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
        const buffer = await resource.fetchArrayBuffer();
        const model = await loadAndZoomToModelAsync(
          { gltf: new Uint8Array(buffer) },
          scene
        );
        verifyDebugWireframe(model, PrimitiveType.TRIANGLES, {
          scene: scene,
        });
      });

      it("debugWireframe works for model without indices", async function () {
        const model = await loadAndZoomToModelAsync(
          { gltf: triangleWithoutIndicesUrl, enableDebugWireframe: true },
          scene
        );
        verifyDebugWireframe(model, PrimitiveType.TRIANGLES, {
          hasIndices: false,
        });
      });

      it("debugWireframe works for model with triangle strip", async function () {
        const model = await loadAndZoomToModelAsync(
          { gltf: triangleStripUrl, enableDebugWireframe: true },
          scene
        );
        verifyDebugWireframe(model, PrimitiveType.TRIANGLE_STRIP);
      });

      it("debugWireframe works for model with triangle fan", async function () {
        const model = await loadAndZoomToModelAsync(
          { gltf: triangleFanUrl, enableDebugWireframe: true },
          scene
        );
        verifyDebugWireframe(model, PrimitiveType.TRIANGLE_FAN);
      });

      it("debugWireframe ignores points", async function () {
        const model = await loadAndZoomToModelAsync(
          { gltf: pointCloudUrl, enableDebugWireframe: true },
          scene
        );
        scene.renderForSpecs();
        const commandList = scene.frameState.commandList;
        for (let i = 0; i < commandList.length; i++) {
          const command = commandList[i];
          expect(command.primitiveType).toBe(PrimitiveType.POINTS);
          expect(command.vertexArray.indexBuffer).toBeUndefined();
        }

        model.debugWireframe = true;
        for (let i = 0; i < commandList.length; i++) {
          const command = commandList[i];
          expect(command.primitiveType).toBe(PrimitiveType.POINTS);
          expect(command.vertexArray.indexBuffer).toBeUndefined();
        }
      });
    });

    it("debugShowBoundingVolume works", async function () {
      const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
      const buffer = await resource.fetchArrayBuffer();
      const model = await loadAndZoomToModelAsync(
        { gltf: new Uint8Array(buffer), debugShowBoundingVolume: true },
        scene
      );
      scene.renderForSpecs();
      const commandList = scene.frameState.commandList;
      for (let i = 0; i < commandList.length; i++) {
        expect(commandList[i].debugShowBoundingVolume).toBe(true);
      }
      model.debugShowBoundingVolume = false;
      expect(model._debugShowBoundingVolumeDirty).toBe(true);
      scene.renderForSpecs();
      for (let i = 0; i < commandList.length; i++) {
        expect(commandList[i].debugShowBoundingVolume).toBe(false);
      }
    });

    describe("boundingSphere", function () {
      it("boundingSphere throws if model is not ready", async function () {
        const model = await Model.fromGltfAsync({
          url: boxTexturedGlbUrl,
        });
        expect(function () {
          return model.boundingSphere;
        }).toThrowDeveloperError();
      });

      it("boundingSphere works", async function () {
        const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
        const buffer = await resource.fetchArrayBuffer();
        const model = await loadAndZoomToModelAsync(
          { gltf: new Uint8Array(buffer) },
          scene
        );
        const boundingSphere = model.boundingSphere;
        expect(boundingSphere).toBeDefined();
        expect(boundingSphere.center).toEqual(new Cartesian3());
        expect(boundingSphere.radius).toEqualEpsilon(
          0.8660254037844386,
          CesiumMath.EPSILON8
        );
      });

      it("boundingSphere accounts for axis correction", async function () {
        const resource = Resource.createIfNeeded(riggedFigureUrl);
        const gltf = await resource.fetchJson();
        const model = await loadAndZoomToModelAsync({ gltf: gltf }, scene);
        // The bounding sphere should transform from z-forward
        // to x-forward.
        const boundingSphere = model.boundingSphere;
        expect(boundingSphere).toBeDefined();
        expect(boundingSphere.center).toEqualEpsilon(
          new Cartesian3(0.0320296511054039, 0, 0.7249599695205688),
          CesiumMath.EPSILON3
        );
        expect(boundingSphere.radius).toEqualEpsilon(
          0.9484635280120018,
          CesiumMath.EPSILON3
        );
      });

      it("boundingSphere accounts for transform from CESIUM_RTC extension", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxCesiumRtcUrl,
          },
          scene
        );
        const boundingSphere = model.boundingSphere;
        expect(boundingSphere).toBeDefined();
        expect(boundingSphere.center).toEqual(new Cartesian3(6378137, 0, 0));
      });

      it("boundingSphere updates bounding sphere when invoked", async function () {
        const model = await loadAndZoomToModelAsync(
          { gltf: boxTexturedGlbUrl },
          scene
        );
        const expectedRadius = 0.8660254037844386;
        const translation = new Cartesian3(10, 0, 0);
        const modelMatrix = Matrix4.fromTranslation(translation);
        model.modelMatrix = modelMatrix;
        model.scale = 2.0;

        // boundingSphere should still account for the model matrix
        // even though the scene has not yet updated.
        const boundingSphere = model.boundingSphere;
        expect(boundingSphere.center).toEqual(translation);
        expect(boundingSphere.radius).toEqualEpsilon(
          2.0 * expectedRadius,
          CesiumMath.EPSILON8
        );
      });
    });

    describe("reference matrices", function () {
      it("sets IBL transform matrix", async function () {
        if (!scene.highDynamicRangeSupported) {
          return;
        }
        const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
        const buffer = await resource.fetchArrayBuffer();
        const imageBasedLighting = new ImageBasedLighting({
          specularEnvironmentMaps:
            "./Data/EnvironmentMap/kiara_6_afternoon_2k_ibl.ktx2",
        });
        const model = await loadAndZoomToModelAsync(
          {
            gltf: new Uint8Array(buffer),
            imageBasedLighting: imageBasedLighting,
          },
          scene
        );
        await pollToPromise(function () {
          scene.render();
          return (
            defined(imageBasedLighting.specularEnvironmentCubeMap) &&
            imageBasedLighting.specularEnvironmentCubeMap.ready
          );
        });
        expect(model.modelMatrix).toEqual(Matrix4.IDENTITY);
        const { view3D } = scene.context.uniformState;
        const viewRotation = Matrix4.getRotation(view3D, new Matrix3());
        Matrix3.transpose(viewRotation, viewRotation);
        const yUpToZUp = new Matrix3(1, 0, 0, 0, 0, 1, 0, -1, 0);
        const expectedIblTransform = Matrix3.multiply(
          yUpToZUp,
          viewRotation,
          new Matrix3()
        );
        expect(model._iblReferenceFrameMatrix).toEqualEpsilon(
          expectedIblTransform,
          CesiumMath.EPSILON14
        );
      });
    });

    describe("picking and id", function () {
      it("initializes with id", async function () {
        // This model gets clipped if log depth is disabled, so zoom out
        // the camera just a little
        const offset = new HeadingPitchRange(0, -CesiumMath.PI_OVER_FOUR, 2);

        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGlbUrl,
            offset: offset,
            id: boxTexturedGlbUrl,
          },
          scene
        );
        expect(model.id).toBe(boxTexturedGlbUrl);

        const pickIds = model._pickIds;
        expect(pickIds.length).toEqual(1);
        expect(pickIds[0].object.id).toEqual(boxTexturedGlbUrl);
      });

      it("changing id works", async function () {
        // This model gets clipped if log depth is disabled, so zoom out
        // the camera just a little
        const offset = new HeadingPitchRange(0, -CesiumMath.PI_OVER_FOUR, 2);

        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGlbUrl,
            offset: offset,
          },
          scene
        );
        expect(model.id).toBeUndefined();

        const pickIds = model._pickIds;
        expect(pickIds.length).toEqual(1);
        expect(pickIds[0].object.id).toBeUndefined();

        model.id = boxTexturedGlbUrl;
        scene.renderForSpecs();
        expect(pickIds[0].object.id).toBe(boxTexturedGlbUrl);

        model.id = undefined;
        scene.renderForSpecs();
        expect(pickIds[0].object.id).toBeUndefined();
      });

      it("picks box textured", async function () {
        if (FeatureDetection.isInternetExplorer()) {
          // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
          return;
        }

        // This model gets clipped if log depth is disabled, so zoom out
        // the camera just a little
        const offset = new HeadingPitchRange(0, -CesiumMath.PI_OVER_FOUR, 2);

        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGlbUrl,
            offset: offset,
          },
          scene
        );
        expect(scene).toPickAndCall(function (result) {
          expect(result.primitive).toBeInstanceOf(Model);
          expect(result.primitive).toEqual(model);
        });
      });

      it("picks box textured with id", async function () {
        if (FeatureDetection.isInternetExplorer()) {
          // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
          return;
        }

        // This model gets clipped if log depth is disabled, so zoom out
        // the camera just a little
        const offset = new HeadingPitchRange(0, -CesiumMath.PI_OVER_FOUR, 2);

        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGlbUrl,
            offset: offset,
            id: boxTexturedGlbUrl,
          },
          scene
        );
        expect(scene).toPickAndCall(function (result) {
          expect(result.primitive).toBeInstanceOf(Model);
          expect(result.primitive).toEqual(model);
          expect(result.id).toEqual(boxTexturedGlbUrl);
        });
      });

      it("picks box textured with a new id", async function () {
        if (FeatureDetection.isInternetExplorer()) {
          // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
          return;
        }

        // This model gets clipped if log depth is disabled, so zoom out
        // the camera just a little
        const offset = new HeadingPitchRange(0, -CesiumMath.PI_OVER_FOUR, 2);

        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGlbUrl,
            offset: offset,
            id: boxTexturedGlbUrl,
          },
          scene
        );
        expect(scene).toPickAndCall(function (result) {
          expect(result.primitive).toBeInstanceOf(Model);
          expect(result.primitive).toEqual(model);
          expect(result.id).toEqual(boxTexturedGlbUrl);
        });

        model.id = "new id";
        expect(scene).toPickAndCall(function (result) {
          expect(result.primitive).toBeInstanceOf(Model);
          expect(result.primitive).toEqual(model);
          expect(result.id).toEqual("new id");
        });
      });

      it("doesn't pick when allowPicking is false", async function () {
        if (FeatureDetection.isInternetExplorer()) {
          // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
          return;
        }

        // This model gets clipped if log depth is disabled, so zoom out
        // the camera just a little
        const offset = new HeadingPitchRange(0, -CesiumMath.PI_OVER_FOUR, 2);

        await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGlbUrl,
            allowPicking: false,
            offset: offset,
          },
          scene
        );
        expect(scene).toPickAndCall(function (result) {
          expect(result).toBeUndefined();
        });
      });

      it("doesn't pick when model is hidden", async function () {
        if (FeatureDetection.isInternetExplorer()) {
          // Workaround IE 11.0.9.  This test fails when all tests are ran without a breakpoint here.
          return;
        }

        // This model gets clipped if log depth is disabled, so zoom out
        // the camera just a little
        const offset = new HeadingPitchRange(0, -CesiumMath.PI_OVER_FOUR, 2);

        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGlbUrl,
            offset: offset,
          },
          scene
        );
        model.show = false;
        expect(scene).toPickAndCall(function (result) {
          expect(result).toBeUndefined();
        });
      });
    });

    describe("features", function () {
      function setFeaturesWithOpacity(
        featureTable,
        opaqueFeaturesLength,
        translucentFeaturesLength
      ) {
        for (let i = 0; i < opaqueFeaturesLength; i++) {
          const feature = featureTable.getFeature(i);
          feature.color = Color.RED;
        }
        for (
          let i = opaqueFeaturesLength;
          i < opaqueFeaturesLength + translucentFeaturesLength;
          i++
        ) {
          const feature = featureTable.getFeature(i);
          feature.color = Color.RED.withAlpha(0.5);
        }
      }

      it("resets draw commands when the style commands needed are changed", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: buildingsMetadata,
          },
          scene
        );
        const featureTable = model.featureTables[model.featureTableId];

        // Set all features to opaque.
        setFeaturesWithOpacity(featureTable, 10, 0);
        scene.renderForSpecs();
        expect(featureTable.styleCommandsNeededDirty).toEqual(false);
        expect(featureTable._styleCommandsNeeded).toEqual(
          StyleCommandsNeeded.ALL_OPAQUE
        );

        // Set some features to translucent.
        setFeaturesWithOpacity(featureTable, 8, 2);
        scene.renderForSpecs();
        expect(featureTable.styleCommandsNeededDirty).toEqual(true);
        expect(featureTable._styleCommandsNeeded).toEqual(
          StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT
        );

        // Set some more features to translucent.
        setFeaturesWithOpacity(featureTable, 2, 8);
        scene.renderForSpecs();
        expect(featureTable.styleCommandsNeededDirty).toEqual(false);
        expect(featureTable._styleCommandsNeeded).toEqual(
          StyleCommandsNeeded.OPAQUE_AND_TRANSLUCENT
        );

        // Set all features to translucent.
        setFeaturesWithOpacity(featureTable, 0, 10);
        scene.renderForSpecs();
        expect(featureTable.styleCommandsNeededDirty).toEqual(true);
        expect(featureTable._styleCommandsNeeded).toEqual(
          StyleCommandsNeeded.ALL_TRANSLUCENT
        );
      });

      it("selects feature table for instanced feature ID attributes", async function () {
        if (webglStub) {
          return;
        }
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxInstanced,
            instanceFeatureIdLabel: "section",
          },
          scene
        );
        expect(model.featureTableId).toEqual(1);
      });

      it("selects feature table for feature ID textures", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: microcosm,
          },
          scene
        );
        expect(model.featureTableId).toEqual(0);
      });

      it("selects feature table for feature ID attributes", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: buildingsMetadata,
          },
          scene
        );
        expect(model.featureTableId).toEqual(0);
      });

      it("featureIdLabel setter works", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: buildingsMetadata,
          },
          scene
        );
        expect(model.featureIdLabel).toBe("featureId_0");
        model.featureIdLabel = "buildings";
        expect(model.featureIdLabel).toBe("buildings");
        model.featureIdLabel = 1;
        expect(model.featureIdLabel).toBe("featureId_1");
      });

      it("instanceFeatureIdLabel setter works", async function () {
        if (webglStub) {
          return;
        }
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxInstanced,
          },
          scene
        );
        expect(model.instanceFeatureIdLabel).toBe("instanceFeatureId_0");
        model.instanceFeatureIdLabel = "section";
        expect(model.instanceFeatureIdLabel).toBe("section");
        model.instanceFeatureIdLabel = 1;
        expect(model.instanceFeatureIdLabel).toBe("instanceFeatureId_1");
      });
    });

    describe("model matrix", function () {
      it("initializes with model matrix", async function () {
        const translation = new Cartesian3(10, 0, 0);
        const transform = Matrix4.fromTranslation(translation);

        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGlbUrl,
            upAxis: Axis.Z,
            forwardAxis: Axis.X,
            modelMatrix: transform,
          },
          scene
        );
        const sceneGraph = model.sceneGraph;
        scene.renderForSpecs();
        expect(sceneGraph.computedModelMatrix).toEqual(transform);
        expect(model.boundingSphere.center).toEqual(translation);
        verifyRender(model, true);

        expect(sceneGraph.computedModelMatrix).not.toBe(transform);
        expect(model.modelMatrix).not.toBe(transform);
      });

      it("changing model matrix works", async function () {
        const translation = new Cartesian3(10, 0, 0);
        const updateModelMatrix = spyOn(
          ModelSceneGraph.prototype,
          "updateModelMatrix"
        ).and.callThrough();
        const model = await loadAndZoomToModelAsync(
          { gltf: boxTexturedGlbUrl, upAxis: Axis.Z, forwardAxis: Axis.X },
          scene
        );
        verifyRender(model, true);
        const sceneGraph = model.sceneGraph;

        const transform = Matrix4.fromTranslation(translation);
        Matrix4.multiplyTransformation(
          model.modelMatrix,
          transform,
          model.modelMatrix
        );
        scene.renderForSpecs();

        expect(updateModelMatrix).toHaveBeenCalled();
        expect(sceneGraph.computedModelMatrix).toEqual(transform);

        // Keep the camera in-place to confirm that the model matrix moves the model out of view.
        verifyRender(model, false, {
          zoomToModel: false,
        });
      });

      it("changing model matrix affects bounding sphere", async function () {
        const translation = new Cartesian3(10, 0, 0);
        const model = await loadAndZoomToModelAsync(
          { gltf: boxTexturedGlbUrl, upAxis: Axis.Z, forwardAxis: Axis.X },
          scene
        );
        const transform = Matrix4.fromTranslation(translation);
        expect(model.boundingSphere.center).toEqual(Cartesian3.ZERO);

        Matrix4.multiplyTransformation(
          model.modelMatrix,
          transform,
          model.modelMatrix
        );
        scene.renderForSpecs();

        expect(model.boundingSphere.center).toEqual(translation);
      });

      it("changing model matrix in 2D mode works if projectTo2D is false", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGlbUrl,
            modelMatrix: modelMatrix,
          },
          scene2D
        );
        verifyRender(model, true, {
          zoomToModel: false,
          scene: scene2D,
        });

        model.modelMatrix = Matrix4.fromTranslation(new Cartesian3(10, 10, 10));
        verifyRender(model, false, {
          zoomToModel: false,
          scene: scene2D,
        });
      });

      it("changing model matrix in 2D mode throws if projectTo2D is true", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGlbUrl,
            modelMatrix: modelMatrix,
            projectTo2D: true,
          },
          scene2D
        );
        expect(function () {
          model.modelMatrix = Matrix4.IDENTITY;
          scene2D.renderForSpecs();
        }).toThrowDeveloperError();
      });
    });

    describe("height reference", function () {
      beforeEach(() => {
        scene.globe = new Globe();
      });

      afterEach(() => {
        scene.globe = undefined;
      });

      it("initializes with height reference", async function () {
        const position = Cartesian3.fromDegrees(-72.0, 40.0);
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            heightReference: HeightReference.CLAMP_TO_GROUND,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(position),
            scene: scene,
          },
          scene
        );
        expect(model.heightReference).toEqual(HeightReference.CLAMP_TO_GROUND);
        expect(model._scene).toBe(scene);
        expect(model._clampedModelMatrix).toBeDefined();
      });

      it("changing height reference works", async function () {
        const position = Cartesian3.fromDegrees(-72.0, 40.0);
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            heightReference: HeightReference.NONE,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(position),
            scene: scene,
          },
          scene
        );
        expect(model.heightReference).toEqual(HeightReference.NONE);
        expect(model._clampedModelMatrix).toBeUndefined();

        model.heightReference = HeightReference.CLAMP_TO_GROUND;
        expect(model._heightDirty).toBe(true);

        scene.renderForSpecs();
        expect(model.heightReference).toEqual(HeightReference.CLAMP_TO_GROUND);
        expect(model._clampedModelMatrix).toBeDefined();
      });

      it("creates height update callback when initializing with height reference", async function () {
        spyOn(scene, "updateHeight");
        const position = Cartesian3.fromDegrees(-72.0, 40.0);

        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(position),
            heightReference: HeightReference.CLAMP_TO_GROUND,
            scene: scene,
          },
          scene
        );

        expect(model.heightReference).toEqual(HeightReference.CLAMP_TO_GROUND);
        expect(scene.updateHeight).toHaveBeenCalledWith(
          Ellipsoid.WGS84.cartesianToCartographic(position),
          jasmine.any(Function),
          HeightReference.CLAMP_TO_GROUND
        );
      });

      it("creates height update callback after setting height reference", async function () {
        const removeCallback = jasmine.createSpy();
        spyOn(scene, "updateHeight").and.returnValue(removeCallback);
        const position = Cartesian3.fromDegrees(-72.0, 40.0);

        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(position),
            heightReference: HeightReference.NONE,
            scene: scene,
          },
          scene
        );

        model.heightReference = HeightReference.CLAMP_TO_GROUND;
        expect(model.heightReference).toEqual(HeightReference.CLAMP_TO_GROUND);

        scene.renderForSpecs();
        expect(scene.updateHeight).toHaveBeenCalledWith(
          Ellipsoid.WGS84.cartesianToCartographic(position),
          jasmine.any(Function),
          HeightReference.CLAMP_TO_GROUND
        );
      });

      it("removes height update callback after changing height reference", async function () {
        const removeCallback = jasmine.createSpy();
        spyOn(scene, "updateHeight").and.returnValue(removeCallback);
        const position = Cartesian3.fromDegrees(-72.0, 40.0);

        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(position),
            heightReference: HeightReference.CLAMP_TO_GROUND,
            scene: scene,
          },
          scene
        );

        model.heightReference = HeightReference.NONE;
        expect(model.heightReference).toEqual(HeightReference.NONE);

        scene.renderForSpecs();
        expect(removeCallback).toHaveBeenCalled();
      });

      it("updates height reference callback when the height reference changes", async function () {
        const removeCallback = jasmine.createSpy();
        spyOn(scene, "updateHeight").and.returnValue(removeCallback);
        const position = Cartesian3.fromDegrees(-72.0, 40.0);

        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(position),
            heightReference: HeightReference.CLAMP_TO_GROUND,
            scene: scene,
          },
          scene
        );
        expect(scene.updateHeight).toHaveBeenCalledWith(
          Ellipsoid.WGS84.cartesianToCartographic(position),
          jasmine.any(Function),
          HeightReference.CLAMP_TO_GROUND
        );

        model.heightReference = HeightReference.RELATIVE_TO_GROUND;
        scene.renderForSpecs();

        expect(removeCallback).toHaveBeenCalled();
        expect(scene.updateHeight).toHaveBeenCalledWith(
          Ellipsoid.WGS84.cartesianToCartographic(position),
          jasmine.any(Function),
          HeightReference.RELATIVE_TO_GROUND
        );
      });

      it("updates height reference callback when the model matrix changes", async function () {
        const removeCallback = jasmine.createSpy();
        spyOn(scene, "updateHeight").and.returnValue(removeCallback);

        let position = Cartesian3.fromDegrees(-72.0, 40.0);
        const modelMatrix = Transforms.eastNorthUpToFixedFrame(position);
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            modelMatrix: Matrix4.clone(modelMatrix),
            heightReference: HeightReference.CLAMP_TO_GROUND,
            scene: scene,
          },
          scene
        );
        expect(scene.updateHeight).toHaveBeenCalledWith(
          Ellipsoid.WGS84.cartesianToCartographic(position),
          jasmine.any(Function),
          HeightReference.CLAMP_TO_GROUND
        );

        // Modify the model matrix in place
        position = Cartesian3.fromDegrees(-73.0, 40.0);
        model.modelMatrix[12] = position.x;
        model.modelMatrix[13] = position.y;
        model.modelMatrix[14] = position.z;

        scene.renderForSpecs();
        expect(removeCallback).toHaveBeenCalled();
        expect(scene.updateHeight).toHaveBeenCalledWith(
          Ellipsoid.WGS84.cartesianToCartographic(position),
          jasmine.any(Function),
          HeightReference.CLAMP_TO_GROUND
        );
      });

      it("updates height reference callback when the model matrix is set", async function () {
        const removeCallback = jasmine.createSpy();
        spyOn(scene, "updateHeight").and.returnValue(removeCallback);

        let position = Cartesian3.fromDegrees(-72.0, 40.0);
        const modelMatrix = Transforms.eastNorthUpToFixedFrame(position);
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            modelMatrix: Matrix4.clone(modelMatrix),
            heightReference: HeightReference.CLAMP_TO_GROUND,
            scene: scene,
          },
          scene
        );
        expect(scene.updateHeight).toHaveBeenCalledWith(
          Ellipsoid.WGS84.cartesianToCartographic(position),
          jasmine.any(Function),
          HeightReference.CLAMP_TO_GROUND
        );

        position = Cartesian3.fromDegrees(-73.0, 40.0);
        modelMatrix[12] = position.x;
        modelMatrix[13] = position.y;
        modelMatrix[14] = position.z;
        model.modelMatrix = modelMatrix;

        scene.renderForSpecs();
        expect(removeCallback).toHaveBeenCalled();
        expect(scene.updateHeight).toHaveBeenCalledWith(
          Ellipsoid.WGS84.cartesianToCartographic(position),
          jasmine.any(Function),
          HeightReference.CLAMP_TO_GROUND
        );
      });

      it("height reference callback updates the position", async function () {
        let invokeCallback;
        spyOn(scene, "updateHeight").and.callFake(
          (cartographic, updateCallback) => {
            invokeCallback = (height) => {
              cartographic.height = height;
              updateCallback(cartographic);
            };
          }
        );

        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(
              Cartesian3.fromDegrees(-72.0, 40.0)
            ),
            heightReference: HeightReference.CLAMP_TO_GROUND,
            scene: scene,
          },
          scene
        );

        invokeCallback(100.0);

        const matrix = model._clampedModelMatrix;
        const position = new Cartesian3(matrix[12], matrix[13], matrix[14]);
        const cartographic = Ellipsoid.WGS84.cartesianToCartographic(position);
        expect(cartographic.height).toEqualEpsilon(100.0, CesiumMath.EPSILON9);
      });

      it("height reference accounts for change in terrain provider", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(
              Cartesian3.fromDegrees(-72.0, 40.0)
            ),
            heightReference: HeightReference.CLAMP_TO_GROUND,
            scene: scene,
          },
          scene
        );
        expect(model._heightDirty).toBe(false);
        const terrainProvider = new CesiumTerrainProvider({
          url: "made/up/url",
          requestVertexNormals: true,
        });
        scene.terrainProvider = terrainProvider;

        expect(model._heightDirty).toBe(true);
        scene.terrainProvider = undefined;
      });

      it("throws when initializing height reference with no scene", async function () {
        await expectAsync(
          loadAndZoomToModelAsync(
            {
              gltf: boxTexturedGltfUrl,
              modelMatrix: Transforms.eastNorthUpToFixedFrame(
                Cartesian3.fromDegrees(-72.0, 40.0)
              ),
              heightReference: HeightReference.CLAMP_TO_GROUND,
              scene: undefined,
            },
            scene
          )
        ).toBeRejectedWithDeveloperError(
          "Height reference is not supported without a scene."
        );
      });

      it("throws when changing height reference with no scene", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(
              Cartesian3.fromDegrees(-72.0, 40.0)
            ),
            heightReference: HeightReference.NONE,
          },
          scene
        );

        expect(function () {
          model.heightReference = HeightReference.CLAMP_TO_GROUND;
          scene.renderForSpecs();
        }).toThrowDeveloperError();
      });

      it("works when initializing height reference with no globe", function () {
        return expectAsync(
          loadAndZoomToModelAsync(
            {
              gltf: boxTexturedGltfUrl,
              modelMatrix: Transforms.eastNorthUpToFixedFrame(
                Cartesian3.fromDegrees(-72.0, 40.0)
              ),
              heightReference: HeightReference.CLAMP_TO_GROUND,
              scene: scene,
            },
            scene
          )
        ).toBeResolved();
      });

      it("destroys height reference callback", async function () {
        const removeCallback = jasmine.createSpy();
        spyOn(scene, "updateHeight").and.returnValue(removeCallback);

        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGlbUrl,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(
              Cartesian3.fromDegrees(-72.0, 40.0)
            ),
            heightReference: HeightReference.CLAMP_TO_GROUND,
            scene: scene,
          },
          scene
        );

        scene.primitives.remove(model);
        expect(model.isDestroyed()).toBe(true);
        expect(removeCallback).toHaveBeenCalled();
      });
    });

    describe("distance display condition", function () {
      it("initializes with distance display condition", async function () {
        const near = 10.0;
        const far = 100.0;
        const condition = new DistanceDisplayCondition(near, far);
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            distanceDisplayCondition: condition,
          },
          scene
        );
        verifyRender(model, false);
      });

      it("changing distance display condition works", async function () {
        const near = 10.0;
        const far = 100.0;
        const condition = new DistanceDisplayCondition(near, far);
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
          },
          scene
        );
        verifyRender(model, true);

        model.distanceDisplayCondition = condition;
        verifyRender(model, false);

        model.distanceDisplayCondition = undefined;
        verifyRender(model, true);
      });

      it("distanceDisplayCondition works with camera movement", async function () {
        const near = 10.0;
        const far = 100.0;
        const condition = new DistanceDisplayCondition(near, far);
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
          },
          scene
        );
        verifyRender(model, true);

        // Model distance is smaller than near value, should not render
        model.distanceDisplayCondition = condition;
        verifyRender(model, false);

        const frameState = scene.frameState;

        // Model distance is between near and far values, should render
        frameState.camera.lookAt(
          Cartesian3.ZERO,
          new HeadingPitchRange(0.0, 0.0, (far + near) * 0.5)
        );
        verifyRender(model, true, {
          zoomToModel: false,
        });

        // Model distance is greater than far value, should not render
        frameState.camera.lookAt(
          Cartesian3.ZERO,
          new HeadingPitchRange(0.0, 0.0, far + 10.0)
        );
        verifyRender(model, false, {
          zoomToModel: false,
        });
      });

      it("distanceDisplayCondition throws when near >= far", async function () {
        const near = 101.0;
        const far = 100.0;
        const condition = new DistanceDisplayCondition(near, far);
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
          },
          scene
        );
        expect(function () {
          model.distanceDisplayCondition = condition;
        }).toThrowDeveloperError();
      });
    });

    describe("model color", function () {
      it("initializes with model color", async function () {
        const model = await loadAndZoomToModelAsync(
          { gltf: boxTexturedGltfUrl, color: Color.BLACK },
          scene
        );
        verifyRender(model, false);
      });

      it("changing model color works", async function () {
        const model = await loadAndZoomToModelAsync(
          { gltf: boxTexturedGltfUrl },
          scene
        );
        verifyRender(model, true);

        model.color = Color.BLACK;
        verifyRender(model, false);

        model.color = Color.RED;
        verifyRender(model, true);

        model.color = undefined;
        verifyRender(model, true);
      });

      it("renders with translucent color", async function () {
        // This model gets clipped if log depth is disabled, so zoom out
        // the camera just a little
        const offset = new HeadingPitchRange(0, -CesiumMath.PI_OVER_FOUR, 2);

        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            offset: offset,
          },
          scene
        );
        const renderOptions = {
          scene: scene,
          time: defaultDate,
        };

        let result;
        expect(renderOptions).toRenderAndCall(function (rgba) {
          result = rgba;
        });

        model.color = Color.fromAlpha(Color.WHITE, 0.5);
        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba[0]).toBeLessThan(result[0]);
          expect(rgba[1]).toBeLessThan(result[1]);
          expect(rgba[2]).toBeLessThan(result[2]);
          expect(rgba[3]).toBe(255);
        });
      });

      it("doesn't render invisible model", async function () {
        // This model gets clipped if log depth is disabled, so zoom out
        // the camera just a little
        const offset = new HeadingPitchRange(0, -CesiumMath.PI_OVER_FOUR, 2);

        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            color: Color.fromAlpha(Color.BLACK, 0.0),
            offset: offset,
          },
          scene
        );
        verifyRender(model, false);

        // No commands should have been submitted
        const commands = scene.frameState.commandList;
        expect(commands.length).toBe(0);
      });
    });

    // These functions assume that model.color = Color.RED
    function verifyHighlightColor(rgba) {
      expect(rgba[0]).toBeGreaterThan(0);
      expect(rgba[0]).toBeLessThan(255);
      expect(rgba[1]).toEqual(0);
      expect(rgba[2]).toEqual(0);
      expect(rgba[3]).toEqual(255);
    }

    function verifyReplaceColor(rgba) {
      expect(rgba[0]).toEqual(255);
      expect(rgba[1]).toEqual(0);
      expect(rgba[2]).toEqual(0);
      expect(rgba[3]).toEqual(255);
    }

    // Assumes colorBlendAmount = 0.5;
    function verifyMixColor(rgba) {
      expect(rgba[0]).toBeGreaterThan(0);
      expect(rgba[0]).toBeLessThan(255);
      expect(rgba[1]).toBeGreaterThan(0);
      expect(rgba[1]).toBeLessThan(255);
      expect(rgba[2]).toBeGreaterThan(0);
      expect(rgba[2]).toBeLessThan(255);
      expect(rgba[3]).toEqual(255);
    }

    describe("colorBlendMode", function () {
      // This model gets clipped if log depth is disabled, so zoom out
      // the camera just a little
      const offset = new HeadingPitchRange(0, -CesiumMath.PI_OVER_FOUR, 2);

      it("initializes with ColorBlendMode.HIGHLIGHT", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            offset: offset,
            color: Color.RED,
            colorBlendMode: ColorBlendMode.HIGHLIGHT,
          },
          scene
        );
        expect(model.colorBlendMode).toEqual(ColorBlendMode.HIGHLIGHT);

        const renderOptions = {
          scene: scene,
          time: defaultDate,
        };
        expect(renderOptions).toRenderAndCall(function (rgba) {
          verifyHighlightColor(rgba);
        });
      });

      it("initializes with ColorBlendMode.REPLACE", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            offset: offset,
            color: Color.RED,
            colorBlendMode: ColorBlendMode.REPLACE,
          },
          scene
        );
        expect(model.colorBlendMode).toEqual(ColorBlendMode.REPLACE);

        const renderOptions = {
          scene: scene,
          time: defaultDate,
        };
        expect(renderOptions).toRenderAndCall(function (rgba) {
          verifyReplaceColor(rgba);
        });
      });

      it("initializes with ColorBlendMode.MIX", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            offset: offset,
            color: Color.RED,
            colorBlendMode: ColorBlendMode.MIX,
          },
          scene
        );
        expect(model.colorBlendMode).toEqual(ColorBlendMode.MIX);

        const renderOptions = {
          scene: scene,
          time: defaultDate,
        };
        expect(renderOptions).toRenderAndCall(function (rgba) {
          verifyMixColor(rgba);
        });
      });

      it("toggles colorBlendMode", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            offset: offset,
            color: Color.RED,
            colorBlendMode: ColorBlendMode.REPLACE,
          },
          scene
        );
        expect(model.colorBlendMode).toEqual(ColorBlendMode.REPLACE);

        const renderOptions = {
          scene: scene,
          time: defaultDate,
        };
        expect(renderOptions).toRenderAndCall(function (rgba) {
          verifyReplaceColor(rgba);
        });

        model.colorBlendMode = ColorBlendMode.HIGHLIGHT;
        expect(model.colorBlendMode).toEqual(ColorBlendMode.HIGHLIGHT);

        expect(renderOptions).toRenderAndCall(function (rgba) {
          verifyHighlightColor(rgba);
        });

        model.colorBlendMode = ColorBlendMode.MIX;
        expect(model.colorBlendMode).toEqual(ColorBlendMode.MIX);

        expect(renderOptions).toRenderAndCall(function (rgba) {
          verifyMixColor(rgba);
        });
      });
    });

    describe("colorBlendAmount", function () {
      // This model gets clipped if log depth is disabled, so zoom out
      // the camera just a little
      const offset = new HeadingPitchRange(0, -CesiumMath.PI_OVER_FOUR, 2);

      it("initializes with colorBlendAmount", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            offset: offset,
            color: Color.RED,
            colorBlendMode: ColorBlendMode.MIX,
            colorBlendAmount: 1.0,
          },
          scene
        );
        expect(model.colorBlendAmount).toEqual(1.0);

        const renderOptions = {
          scene: scene,
          time: defaultDate,
        };
        // colorBlendAmount = 1.0 is visually equivalent to
        // ColorBlendMode.REPLACE
        expect(renderOptions).toRenderAndCall(function (rgba) {
          verifyReplaceColor(rgba);
        });
      });

      it("changing colorBlendAmount works", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            offset: offset,
          },
          scene
        );
        const renderOptions = {
          scene: scene,
          time: defaultDate,
        };

        let originalColor;
        expect(renderOptions).toRenderAndCall(function (rgba) {
          originalColor = rgba;
        });

        model.color = Color.RED;
        model.colorBlendMode = ColorBlendMode.MIX;
        model.colorBlendAmount = 1.0;
        expect(model.colorBlendAmount).toEqual(1.0);

        // colorBlendAmount = 1.0 is visually equivalent to
        // ColorBlendMode.REPLACE
        expect(renderOptions).toRenderAndCall(function (rgba) {
          verifyReplaceColor(rgba);
        });

        model.colorBlendAmount = 0.5;
        expect(model.colorBlendAmount).toEqual(0.5);
        expect(renderOptions).toRenderAndCall(function (rgba) {
          verifyMixColor(rgba);
        });

        model.colorBlendAmount = 0.0;
        expect(model.colorBlendAmount).toEqual(0.0);
        // colorBlendAmount = 0.0 is visually equivalent to
        // having no color applied to the model.
        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba[0]).toEqual(originalColor[0]);
          expect(rgba[1]).toEqual(originalColor[1]);
          expect(rgba[2]).toEqual(originalColor[2]);
          expect(rgba[3]).toEqual(originalColor[3]);
        });
      });
    });

    describe("silhouette", function () {
      it("initializes with silhouette size", async function () {
        await loadAndZoomToModelAsync(
          { gltf: boxTexturedGltfUrl, silhouetteSize: 1.0 },
          scene
        );
        const commands = scene.frameState.commandList;
        scene.renderForSpecs();
        expect(commands.length).toBe(2);
        expect(commands[0].renderState.stencilTest.enabled).toBe(true);
        expect(commands[0].pass).toBe(Pass.OPAQUE);
        expect(commands[1].renderState.stencilTest.enabled).toBe(true);
        expect(commands[1].pass).toBe(Pass.OPAQUE);
      });

      it("changing silhouette size works", async function () {
        const model = await loadAndZoomToModelAsync(
          { gltf: boxTexturedGltfUrl },
          scene
        );
        const commands = scene.frameState.commandList;
        scene.renderForSpecs();
        expect(commands.length).toBe(1);
        expect(commands[0].renderState.stencilTest.enabled).toBe(false);
        expect(commands[0].pass).toBe(Pass.OPAQUE);

        model.silhouetteSize = 1.0;
        scene.renderForSpecs();
        expect(commands.length).toBe(2);
        expect(commands[0].renderState.stencilTest.enabled).toBe(true);
        expect(commands[0].pass).toBe(Pass.OPAQUE);
        expect(commands[1].renderState.stencilTest.enabled).toBe(true);
        expect(commands[1].pass).toBe(Pass.OPAQUE);

        model.silhouetteSize = 0.0;
        scene.renderForSpecs();
        expect(commands.length).toBe(1);
        expect(commands[0].renderState.stencilTest.enabled).toBe(false);
        expect(commands[0].pass).toBe(Pass.OPAQUE);
      });

      it("silhouette works with translucent color", async function () {
        await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            silhouetteSize: 1.0,
            silhouetteColor: Color.fromAlpha(Color.GREEN, 0.5),
          },
          scene
        );
        const commands = scene.frameState.commandList;
        scene.renderForSpecs();
        expect(commands.length).toBe(2);
        expect(commands[0].renderState.stencilTest.enabled).toBe(true);
        expect(commands[0].pass).toBe(Pass.OPAQUE);
        expect(commands[1].renderState.stencilTest.enabled).toBe(true);
        expect(commands[1].pass).toBe(Pass.TRANSLUCENT);
      });

      it("silhouette is disabled by invisible color", async function () {
        const model = await loadAndZoomToModelAsync(
          { gltf: boxTexturedGltfUrl, silhouetteSize: 1.0 },
          scene
        );
        const commands = scene.frameState.commandList;
        scene.renderForSpecs();
        expect(commands.length).toBe(2);
        expect(commands[0].renderState.stencilTest.enabled).toBe(true);
        expect(commands[0].pass).toBe(Pass.OPAQUE);
        expect(commands[1].renderState.stencilTest.enabled).toBe(true);
        expect(commands[1].pass).toBe(Pass.OPAQUE);

        model.silhouetteColor = Color.fromAlpha(Color.GREEN, 0.0);
        scene.renderForSpecs();
        expect(commands.length).toBe(1);
        expect(commands[0].renderState.stencilTest.enabled).toBe(false);
        expect(commands[0].pass).toBe(Pass.OPAQUE);
      });

      it("silhouette works for invisible model", async function () {
        await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            silhouetteSize: 1.0,
            color: Color.fromAlpha(Color.WHITE, 0.0),
          },
          scene
        );
        const commands = scene.frameState.commandList;
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
        expect(commands[0].pass).toBe(Pass.TRANSLUCENT);
        expect(commands[1].renderState.stencilTest.enabled).toBe(true);
        expect(commands[1].pass).toBe(Pass.TRANSLUCENT);
      });

      it("silhouette works for translucent model", async function () {
        await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            silhouetteSize: 1.0,
            color: Color.fromAlpha(Color.WHITE, 0.5),
          },
          scene
        );
        const commands = scene.frameState.commandList;
        scene.renderForSpecs();
        expect(commands.length).toBe(2);

        // Even though the silhouette color is opaque, the silhouette
        // needs to be placed in the translucent pass.
        expect(commands[0].renderState.stencilTest.enabled).toBe(true);
        expect(commands[0].pass).toBe(Pass.TRANSLUCENT);
        expect(commands[1].renderState.stencilTest.enabled).toBe(true);
        expect(commands[1].pass).toBe(Pass.TRANSLUCENT);
      });

      it("silhouette works for translucent model and translucent silhouette color", async function () {
        await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            silhouetteSize: 1.0,
            color: Color.fromAlpha(Color.WHITE, 0.5),
            silhouetteColor: Color.fromAlpha(Color.RED, 0.5),
          },
          scene
        );
        const commands = scene.frameState.commandList;
        scene.renderForSpecs();
        expect(commands.length).toBe(2);

        expect(commands[0].renderState.stencilTest.enabled).toBe(true);
        expect(commands[0].pass).toBe(Pass.TRANSLUCENT);
        expect(commands[1].renderState.stencilTest.enabled).toBe(true);
        expect(commands[1].pass).toBe(Pass.TRANSLUCENT);
      });

      it("silhouette works for multiple models", async function () {
        await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            silhouetteSize: 1.0,
          },
          scene
        );
        await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            silhouetteSize: 1.0,
          },
          scene
        );
        const commands = scene.frameState.commandList;
        scene.renderForSpecs();
        expect(commands.length).toBe(4);
        for (let i = 0; i < commands.length; i++) {
          const command = commands[i];
          expect(command.renderState.stencilTest.enabled).toBe(true);
          expect(command.pass).toBe(Pass.OPAQUE);
        }

        const reference1 = commands[0].renderState.stencilTest.reference;
        const reference2 = commands[2].renderState.stencilTest.reference;
        expect(reference2).toEqual(reference1 + 1);
      });
    });

    describe("light color", function () {
      it("initializes with light color", async function () {
        const model = await loadAndZoomToModelAsync(
          { gltf: boxTexturedGltfUrl, lightColor: Cartesian3.ZERO },
          scene
        );
        verifyRender(model, false);
      });

      it("changing light color works", async function () {
        const model = await loadAndZoomToModelAsync(
          { gltf: boxTexturedGltfUrl },
          scene
        );
        model.lightColor = Cartesian3.ZERO;
        verifyRender(model, false);

        model.lightColor = new Cartesian3(1.0, 0.0, 0.0);
        verifyRender(model, true);

        model.lightColor = undefined;
        verifyRender(model, true);
      });

      it("light color doesn't affect unlit models", async function () {
        const model = await loadAndZoomToModelAsync(
          { gltf: boxUnlitUrl },
          scene
        );
        const options = {
          zoomToModel: false,
        };
        // Move the camera to face one of the two boxes.
        scene.camera.moveRight(1.0);
        verifyRender(model, true, options);

        model.lightColor = Cartesian3.ZERO;
        verifyRender(model, true, options);
      });
    });

    describe("imageBasedLighting", function () {
      afterEach(function () {
        scene.highDynamicRange = false;
      });

      it("initializes with imageBasedLighting", async function () {
        const ibl = new ImageBasedLighting({
          imageBasedLightingFactor: Cartesian2.ZERO,
          luminanceAtZenith: 0.5,
        });
        const model = await loadAndZoomToModelAsync(
          { gltf: boxTexturedGltfUrl, imageBasedLighting: ibl },
          scene
        );
        expect(model.imageBasedLighting).toBe(ibl);
      });

      it("creates default imageBasedLighting", async function () {
        const model = await loadAndZoomToModelAsync(
          { gltf: boxTexturedGltfUrl },
          scene
        );
        const imageBasedLighting = model.imageBasedLighting;
        expect(imageBasedLighting).toBeDefined();
        expect(
          Cartesian2.equals(
            imageBasedLighting.imageBasedLightingFactor,
            new Cartesian2(1, 1)
          )
        ).toBe(true);
        expect(imageBasedLighting.luminanceAtZenith).toBe(0.2);
        expect(
          imageBasedLighting.sphericalHarmonicCoefficients
        ).toBeUndefined();
        expect(imageBasedLighting.specularEnvironmentMaps).toBeUndefined();
      });

      it("changing imageBasedLighting works", async function () {
        const imageBasedLighting = new ImageBasedLighting({
          imageBasedLightingFactor: Cartesian2.ZERO,
        });
        const model = await loadAndZoomToModelAsync(
          { gltf: boxTexturedGltfUrl },
          scene
        );
        const renderOptions = {
          scene: scene,
          time: defaultDate,
        };

        let result;
        verifyRender(model, true);
        expect(renderOptions).toRenderAndCall(function (rgba) {
          result = rgba;
        });

        model.imageBasedLighting = imageBasedLighting;
        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual(result);
        });
      });

      it("changing imageBasedLightingFactor works", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            imageBasedLighting: new ImageBasedLighting({
              imageBasedLightingFactor: Cartesian2.ZERO,
            }),
          },
          scene
        );
        const renderOptions = {
          scene: scene,
          time: defaultDate,
        };

        let result;
        verifyRender(model, true);
        expect(renderOptions).toRenderAndCall(function (rgba) {
          result = rgba;
        });

        const ibl = model.imageBasedLighting;
        ibl.imageBasedLightingFactor = new Cartesian2(1, 1);
        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual(result);
        });
      });

      it("changing luminanceAtZenith works", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            imageBasedLighting: new ImageBasedLighting({
              luminanceAtZenith: 0.0,
            }),
          },
          scene
        );
        const renderOptions = {
          scene: scene,
          time: defaultDate,
        };

        let result;
        verifyRender(model, true);
        expect(renderOptions).toRenderAndCall(function (rgba) {
          result = rgba;
        });

        const ibl = model.imageBasedLighting;
        ibl.luminanceAtZenith = 0.2;
        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual(result);
        });
      });

      it("changing sphericalHarmonicCoefficients works", async function () {
        if (!scene.highDynamicRangeSupported) {
          return;
        }
        const L00 = new Cartesian3(
          0.692622075009195,
          0.4543516001819,
          0.36910172299235
        ); // L00, irradiance, pre-scaled base
        const L1_1 = new Cartesian3(
          0.289407068366422,
          0.16789310162658,
          0.106174907004792
        ); // L1-1, irradiance, pre-scaled base
        const L10 = new Cartesian3(
          -0.591502034778913,
          -0.28152432317119,
          0.124647554708491
        ); // L10, irradiance, pre-scaled base
        const L11 = new Cartesian3(
          0.34945458117126,
          0.163273486841657,
          -0.03095643545207
        ); // L11, irradiance, pre-scaled base
        const L2_2 = new Cartesian3(
          0.22171176447426,
          0.11771991868122,
          0.031381053430064
        ); // L2-2, irradiance, pre-scaled base
        const L2_1 = new Cartesian3(
          -0.348955284677868,
          -0.187256994042823,
          -0.026299717727617
        ); // L2-1, irradiance, pre-scaled base
        const L20 = new Cartesian3(
          0.119982671127227,
          0.076784552175028,
          0.055517838847755
        ); // L20, irradiance, pre-scaled base
        const L21 = new Cartesian3(
          -0.545546043202299,
          -0.279787444030397,
          -0.086854000285261
        ); // L21, irradiance, pre-scaled base
        const L22 = new Cartesian3(
          0.160417569726332,
          0.120896423762313,
          0.121102528320197
        ); // L22, irradiance, pre-scaled base
        const coefficients = [L00, L1_1, L10, L11, L2_2, L2_1, L20, L21, L22];
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            imageBasedLighting: new ImageBasedLighting({
              sphericalHarmonicCoefficients: coefficients,
            }),
          },
          scene
        );
        scene.highDynamicRange = true;

        const renderOptions = {
          scene: scene,
          time: defaultDate,
        };

        let result;
        verifyRender(model, true);
        expect(renderOptions).toRenderAndCall(function (rgba) {
          result = rgba;
        });

        const ibl = model.imageBasedLighting;
        ibl.sphericalHarmonicCoefficients = undefined;
        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual(result);
        });
      });

      it("changing specularEnvironmentMaps works", async function () {
        if (!scene.highDynamicRangeSupported) {
          return;
        }
        const url = "./Data/EnvironmentMap/kiara_6_afternoon_2k_ibl.ktx2";
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boomBoxUrl,
            scale: 10.0,
            imageBasedLighting: new ImageBasedLighting({
              specularEnvironmentMaps: url,
            }),
          },
          scene
        );
        const ibl = model.imageBasedLighting;

        await pollToPromise(function () {
          scene.render();
          return (
            defined(ibl.specularEnvironmentCubeMap) &&
            ibl.specularEnvironmentCubeMap.ready
          );
        });
        scene.highDynamicRange = true;

        const renderOptions = {
          scene: scene,
          time: defaultDate,
        };

        let result;
        verifyRender(model, true);
        expect(renderOptions).toRenderAndCall(function (rgba) {
          result = rgba;
        });

        ibl.specularEnvironmentMaps = undefined;
        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual(result);
        });
      });

      it("renders when specularEnvironmentMaps aren't supported", async function () {
        spyOn(SpecularEnvironmentCubeMap, "isSupported").and.returnValue(false);

        const model = await loadAndZoomToModelAsync(
          {
            gltf: boomBoxUrl,
            scale: 10.0,
          },
          scene
        );
        expect(scene.specularEnvironmentMapsSupported).toBe(false);
        verifyRender(model, true);
      });
    });

    describe("scale", function () {
      it("initializes with scale", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGlbUrl,
            upAxis: Axis.Z,
            forwardAxis: Axis.X,
            scale: 0.0,
          },
          scene
        );
        scene.renderForSpecs();

        verifyRender(model, false);
        expect(model.boundingSphere.center).toEqual(Cartesian3.ZERO);
        expect(model.boundingSphere.radius).toEqual(0.0);
      });

      it("changing scale works", async function () {
        const updateModelMatrix = spyOn(
          ModelSceneGraph.prototype,
          "updateModelMatrix"
        ).and.callThrough();
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGlbUrl,
            upAxis: Axis.Z,
            forwardAxis: Axis.X,
          },
          scene
        );
        verifyRender(model, true);
        model.scale = 0.0;
        scene.renderForSpecs();
        expect(updateModelMatrix).toHaveBeenCalled();
        verifyRender(model, false);

        model.scale = 1.0;
        scene.renderForSpecs();
        expect(updateModelMatrix).toHaveBeenCalled();
        verifyRender(model, true);
      });

      it("changing scale affects bounding sphere", async function () {
        const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
        const buffer = await resource.fetchArrayBuffer();
        const model = await loadAndZoomToModelAsync(
          {
            gltf: new Uint8Array(buffer),
            scale: 10,
          },
          scene
        );
        scene.renderForSpecs();

        const expectedRadius = 0.866;
        const boundingSphere = model.boundingSphere;
        expect(boundingSphere.center).toEqual(Cartesian3.ZERO);
        expect(boundingSphere.radius).toEqualEpsilon(
          expectedRadius * 10.0,
          CesiumMath.EPSILON3
        );

        model.scale = 0.0;
        scene.renderForSpecs();
        expect(boundingSphere.center).toEqual(Cartesian3.ZERO);
        expect(boundingSphere.radius).toEqual(0.0);

        model.scale = 1.0;
        scene.renderForSpecs();
        expect(boundingSphere.center).toEqual(Cartesian3.ZERO);
        expect(boundingSphere.radius).toEqualEpsilon(
          expectedRadius,
          CesiumMath.EPSILON3
        );
      });

      it("changing scale affects bounding sphere for uncentered models", async function () {
        const resource = Resource.createIfNeeded(boxWithOffsetUrl);
        const buffer = await resource.fetchArrayBuffer();
        const model = await loadAndZoomToModelAsync(
          {
            gltf: new Uint8Array(buffer),
            scale: 10,
          },
          scene
        );
        const expectedRadius = 0.866;
        const expectedCenter = new Cartesian3(5.0, 0.0, 0.0);
        const expectedTranslation = Matrix4.fromTranslation(expectedCenter);
        const axisCorrectionMatrix = ModelUtility.getAxisCorrectionMatrix(
          Axis.Y,
          Axis.Z,
          new Matrix4()
        );
        Matrix4.multiplyTransformation(
          axisCorrectionMatrix,
          expectedTranslation,
          expectedTranslation
        );
        Matrix4.getTranslation(expectedTranslation, expectedCenter);

        const boundingSphere = model.boundingSphere;
        expect(boundingSphere.center).toEqual(
          Cartesian3.multiplyByScalar(expectedCenter, 10.0, new Cartesian3())
        );
        expect(boundingSphere.radius).toEqualEpsilon(
          expectedRadius * 10.0,
          CesiumMath.EPSILON3
        );

        model.scale = 0.0;
        scene.renderForSpecs();
        expect(boundingSphere.center).toEqual(Cartesian3.ZERO);
        expect(boundingSphere.radius).toEqual(0.0);

        model.scale = 1.0;
        scene.renderForSpecs();
        expect(boundingSphere.center).toEqual(expectedCenter);
        expect(boundingSphere.radius).toEqualEpsilon(
          expectedRadius,
          CesiumMath.EPSILON3
        );
      });
    });

    describe("minimumPixelSize", function () {
      it("initializes with minimumPixelSize", async function () {
        const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
        const buffer = await resource.fetchArrayBuffer();
        const model = await loadAndZoomToModelAsync(
          {
            gltf: new Uint8Array(buffer),
            upAxis: Axis.Z,
            forwardAxis: Axis.X,
            minimumPixelSize: 1,
            offset: new HeadingPitchRange(0, 0, 500),
          },
          scene
        );
        const renderOptions = {
          zoomToModel: false,
        };

        const expectedRadius = 0.866;
        scene.renderForSpecs();
        verifyRender(model, true, renderOptions);

        // Verify that minimumPixelSize didn't affect other parameters
        expect(model.scale).toEqual(1.0);
        expect(model.boundingSphere.radius).toEqualEpsilon(
          expectedRadius,
          CesiumMath.EPSILON3
        );
      });

      it("changing minimumPixelSize works", async function () {
        const updateModelMatrix = spyOn(
          ModelSceneGraph.prototype,
          "updateModelMatrix"
        ).and.callThrough();
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGlbUrl,
            upAxis: Axis.Z,
            forwardAxis: Axis.X,
            minimumPixelSize: 1,
            offset: new HeadingPitchRange(0, 0, 500),
          },
          scene
        );
        const renderOptions = {
          zoomToModel: false,
        };

        scene.renderForSpecs();
        expect(updateModelMatrix).toHaveBeenCalled();
        verifyRender(model, true, renderOptions);

        model.minimumPixelSize = 0.0;
        scene.renderForSpecs();
        expect(updateModelMatrix).toHaveBeenCalled();
        verifyRender(model, false, renderOptions);

        model.minimumPixelSize = 1;
        scene.renderForSpecs();
        expect(updateModelMatrix).toHaveBeenCalled();
        verifyRender(model, true, renderOptions);
      });

      it("changing minimumPixelSize doesn't affect bounding sphere or scale", async function () {
        const updateModelMatrix = spyOn(
          ModelSceneGraph.prototype,
          "updateModelMatrix"
        ).and.callThrough();
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGlbUrl,
            upAxis: Axis.Z,
            forwardAxis: Axis.X,
            minimumPixelSize: 1,
            offset: new HeadingPitchRange(0, 0, 500),
          },
          scene
        );
        const expectedRadius = 0.866;
        scene.renderForSpecs();
        expect(updateModelMatrix).toHaveBeenCalled();
        expect(model.scale).toEqual(1.0);
        expect(model.boundingSphere.radius).toEqualEpsilon(
          expectedRadius,
          CesiumMath.EPSILON3
        );

        model.minimumPixelSize = 0.0;
        scene.renderForSpecs();
        expect(updateModelMatrix).toHaveBeenCalled();
        expect(model.scale).toEqual(1.0);
        expect(model.boundingSphere.radius).toEqualEpsilon(
          expectedRadius,
          CesiumMath.EPSILON3
        );

        model.minimumPixelSize = 1;
        scene.renderForSpecs();
        expect(updateModelMatrix).toHaveBeenCalled();
        expect(model.scale).toEqual(1.0);
        expect(model.boundingSphere.radius).toEqualEpsilon(
          expectedRadius,
          CesiumMath.EPSILON3
        );
      });
    });

    describe("maximumScale", function () {
      it("initializes with maximumScale", async function () {
        const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
        const buffer = await resource.fetchArrayBuffer();
        const model = await loadAndZoomToModelAsync(
          {
            gltf: new Uint8Array(buffer),
            upAxis: Axis.Z,
            forwardAxis: Axis.X,
            maximumScale: 0.0,
          },
          scene
        );
        scene.renderForSpecs();
        verifyRender(model, false);
        expect(model.boundingSphere.center).toEqual(Cartesian3.ZERO);
        expect(model.boundingSphere.radius).toEqual(0.0);
      });

      it("changing maximumScale works", async function () {
        const updateModelMatrix = spyOn(
          ModelSceneGraph.prototype,
          "updateModelMatrix"
        ).and.callThrough();
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGlbUrl,
            upAxis: Axis.Z,
            forwardAxis: Axis.X,
            scale: 2.0,
          },
          scene
        );
        scene.renderForSpecs();
        verifyRender(model, true);

        model.maximumScale = 0.0;
        scene.renderForSpecs();
        expect(updateModelMatrix).toHaveBeenCalled();
        verifyRender(model, false);

        model.maximumScale = 1.0;
        scene.renderForSpecs();
        expect(updateModelMatrix).toHaveBeenCalled();
        verifyRender(model, true);
      });

      it("changing maximumScale affects bounding sphere", async function () {
        const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
        const buffer = await resource.fetchArrayBuffer();
        const model = await loadAndZoomToModelAsync(
          {
            gltf: new Uint8Array(buffer),
            scale: 20,
            maximumScale: 10,
          },
          scene
        );
        scene.renderForSpecs();

        const expectedRadius = 0.866;
        const boundingSphere = model.boundingSphere;
        expect(boundingSphere.center).toEqual(Cartesian3.ZERO);
        expect(boundingSphere.radius).toEqualEpsilon(
          expectedRadius * 10.0,
          CesiumMath.EPSILON3
        );

        model.maximumScale = 0.0;
        scene.renderForSpecs();
        expect(boundingSphere.center).toEqual(Cartesian3.ZERO);
        expect(boundingSphere.radius).toEqual(0.0);

        model.maximumScale = 1.0;
        scene.renderForSpecs();
        expect(boundingSphere.center).toEqual(Cartesian3.ZERO);
        expect(boundingSphere.radius).toEqualEpsilon(
          expectedRadius,
          CesiumMath.EPSILON3
        );
      });

      it("changing maximumScale affects minimumPixelSize", async function () {
        const resource = Resource.createIfNeeded(boxTexturedGlbUrl);
        const buffer = await resource.fetchArrayBuffer();
        const model = await loadAndZoomToModelAsync(
          {
            gltf: new Uint8Array(buffer),
            minimumPixelSize: 1,
            maximumScale: 10,
          },
          scene
        );
        scene.renderForSpecs();

        const expectedRadius = 0.866;
        const boundingSphere = model.boundingSphere;
        expect(boundingSphere.center).toEqual(Cartesian3.ZERO);
        expect(boundingSphere.radius).toEqualEpsilon(
          expectedRadius,
          CesiumMath.EPSILON3
        );

        model.maximumScale = 0.0;
        scene.renderForSpecs();
        expect(boundingSphere.center).toEqual(Cartesian3.ZERO);
        expect(boundingSphere.radius).toEqual(0.0);

        model.maximumScale = 10.0;
        scene.renderForSpecs();
        expect(boundingSphere.center).toEqual(Cartesian3.ZERO);
        expect(boundingSphere.radius).toEqualEpsilon(
          expectedRadius,
          CesiumMath.EPSILON3
        );
      });
    });

    it("resets draw commands when vertical exaggeration changes", async function () {
      const model = await loadAndZoomToModelAsync(
        {
          gltf: boxTexturedGltfUrl,
        },
        scene
      );
      const resetDrawCommands = spyOn(
        model,
        "resetDrawCommands"
      ).and.callThrough();
      expect(model.ready).toBe(true);

      scene.verticalExaggeration = 2.0;
      scene.renderForSpecs();
      expect(resetDrawCommands).toHaveBeenCalled();
    });

    it("resets draw commands when enableVerticalExaggeration changes", async function () {
      scene.verticalExaggeration = 2.0;
      const model = await loadAndZoomToModelAsync(
        {
          gltf: boxTexturedGltfUrl,
        },
        scene
      );
      const resetDrawCommands = spyOn(
        model,
        "resetDrawCommands"
      ).and.callThrough();
      expect(model.ready).toBe(true);
      expect(model.hasVerticalExaggeration).toBe(true);

      model.enableVerticalExaggeration = false;

      scene.renderForSpecs();
      expect(resetDrawCommands).toHaveBeenCalled();
      expect(model.hasVerticalExaggeration).toBe(false);
    });

    it("does not issue draw commands when ignoreCommands is true", async function () {
      const model = await loadAndZoomToModelAsync(
        {
          gltf: boxTexturedGltfUrl,
        },
        scene
      );
      expect(model.ready).toBe(true);
      model._ignoreCommands = true;

      scene.renderForSpecs();
      expect(scene.frameState.commandList.length).toEqual(0);
    });

    describe("frustum culling ", function () {
      it("enables frustum culling", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            cull: true,
          },
          scene
        );
        expect(model.cull).toEqual(true);

        // Commands should be submitted while viewing the model.
        scene.renderForSpecs();
        expect(scene.frustumCommandsList.length).toBeGreaterThan(0);

        // Commands should not be submitted when model is out of view.
        model.modelMatrix = Matrix4.fromTranslation(
          new Cartesian3(100.0, 0.0, 0.0)
        );
        scene.renderForSpecs();
        expect(scene.frustumCommandsList.length).toEqual(0);
      });

      it("disables frustum culling", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGltfUrl,
            cull: false,
          },
          scene
        );
        expect(model.cull).toEqual(false);

        // Commands should be submitted while viewing the model.
        scene.renderForSpecs();
        const length = scene.frustumCommandsList.length;
        expect(length).toBeGreaterThan(0);

        // Commands should still be submitted when model is out of view.
        model.modelMatrix = Matrix4.fromTranslation(
          new Cartesian3(0.0, 100.0, 0.0)
        );
        scene.renderForSpecs();
        expect(scene.frustumCommandsList.length).toEqual(length);
      });
    });

    describe("back-face culling", function () {
      const boxBackFaceCullingUrl =
        "./Data/Models/glTF-2.0/BoxBackFaceCulling/glTF/BoxBackFaceCulling.gltf";
      const boxBackFaceCullingOffset = new HeadingPitchRange(
        Math.PI / 2,
        0,
        2.0
      );

      it("enables back-face culling", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxBackFaceCullingUrl,
            backFaceCulling: true,
            offset: boxBackFaceCullingOffset,
          },
          scene
        );
        verifyRender(model, false, {
          zoomToModel: false,
        });
      });

      it("disables back-face culling", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxBackFaceCullingUrl,
            backFaceCulling: false,
            offset: boxBackFaceCullingOffset,
          },
          scene
        );
        verifyRender(model, true, {
          zoomToModel: false,
        });
      });

      it("ignores back-face culling when translucent", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxBackFaceCullingUrl,
            backFaceCulling: true,
            offset: boxBackFaceCullingOffset,
          },
          scene
        );
        verifyRender(model, false, {
          zoomToModel: false,
        });

        model.color = new Color(0, 0, 1.0, 0.5);

        verifyRender(model, true, {
          zoomToModel: false,
        });
      });

      it("toggles back-face culling at runtime", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxBackFaceCullingUrl,
            backFaceCulling: false,
            offset: boxBackFaceCullingOffset,
          },
          scene
        );
        verifyRender(model, true, {
          zoomToModel: false,
        });

        model.backFaceCulling = true;

        verifyRender(model, false, {
          zoomToModel: false,
        });
      });

      it("ignores back-face culling toggles when translucent", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxBackFaceCullingUrl,
            backFaceCulling: false,
            offset: boxBackFaceCullingOffset,
            color: new Color(0, 0, 1.0, 0.5),
          },
          scene
        );
        verifyRender(model, true, {
          zoomToModel: false,
        });

        model.backFaceCulling = true;

        verifyRender(model, true, {
          zoomToModel: false,
        });

        model.backFaceCulling = false;

        verifyRender(model, true, {
          zoomToModel: false,
        });
      });
    });

    it("reverses winding order for negatively scaled models", async function () {
      const model = await loadAndZoomToModelAsync(
        {
          gltf: boxTexturedGlbUrl,
          modelMatrix: Matrix4.fromUniformScale(-1.0),
        },
        scene
      );
      const renderOptions = {
        scene: scene,
        time: defaultDate,
      };

      // The model should look the same whether it has -1.0 scale or 1.0 scale.
      // The initial scale is -1.0. Test switching this at runtime.
      let initialRgba;
      expect(renderOptions).toRenderAndCall(function (rgba) {
        initialRgba = rgba;
      });

      model.modelMatrix = Matrix4.IDENTITY;

      expect(renderOptions).toRenderAndCall(function (rgba) {
        expect(rgba).toEqual(initialRgba);
      });

      model.modelMatrix = Matrix4.fromUniformScale(-1.0);

      expect(renderOptions).toRenderAndCall(function (rgba) {
        expect(rgba).toEqual(initialRgba);
      });
    });

    describe("clipping planes", function () {
      it("throws when given clipping planes attached to another model", async function () {
        const plane = new ClippingPlane(Cartesian3.UNIT_X, 0.0);
        const clippingPlanes = new ClippingPlaneCollection({
          planes: [plane],
        });
        await loadAndZoomToModelAsync(
          { gltf: boxTexturedGlbUrl, clippingPlanes: clippingPlanes },
          scene
        );
        const model = await loadAndZoomToModelAsync(
          { gltf: boxTexturedGlbUrl },
          scene
        );
        expect(function () {
          model.clippingPlanes = clippingPlanes;
        }).toThrowDeveloperError();
      });

      it("updates clipping planes when clipping planes are enabled", async function () {
        const plane = new ClippingPlane(Cartesian3.UNIT_X, 0.0);
        const clippingPlanes = new ClippingPlaneCollection({
          planes: [plane],
        });
        const model = await loadAndZoomToModelAsync(
          { gltf: boxTexturedGlbUrl },
          scene
        );
        const gl = scene.frameState.context._gl;
        spyOn(gl, "texImage2D").and.callThrough();

        scene.renderForSpecs();
        const callsBeforeClipping = gl.texImage2D.calls.count();

        model.clippingPlanes = clippingPlanes;
        scene.renderForSpecs();
        scene.renderForSpecs();
        // When clipping planes are created, we expect two calls to texImage2D
        // (one for initial creation, and one for copying the data in)
        // because clipping planes is stored inside a texture.
        expect(gl.texImage2D.calls.count() - callsBeforeClipping).toEqual(2);
      });

      it("initializes and updates with clipping planes", async function () {
        const plane = new ClippingPlane(Cartesian3.UNIT_X, -2.5);
        const clippingPlanes = new ClippingPlaneCollection({
          planes: [plane],
        });
        const model = await loadAndZoomToModelAsync(
          { gltf: boxTexturedGlbUrl, clippingPlanes: clippingPlanes },
          scene
        );
        verifyRender(model, false);

        model.clippingPlanes = undefined;
        verifyRender(model, true);
      });

      it("updating clipping planes properties works", async function () {
        const direction = Cartesian3.multiplyByScalar(
          Cartesian3.UNIT_X,
          -1,
          new Cartesian3()
        );
        const plane = new ClippingPlane(direction, 0.0);
        const clippingPlanes = new ClippingPlaneCollection({
          planes: [plane],
        });
        const model = await loadAndZoomToModelAsync(
          { gltf: boxTexturedGlbUrl },
          scene
        );
        let modelColor;
        verifyRender(model, true);
        expect(scene).toRenderAndCall(function (rgba) {
          modelColor = rgba;
        });

        // The clipping plane should cut the model in half such that
        // we see the back faces.
        model.clippingPlanes = clippingPlanes;
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual(modelColor);
        });

        plane.distance = 10.0; // Move the plane away from the model
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).toEqual(modelColor);
        });
      });

      it("removing clipping plane from collection works", async function () {
        const plane = new ClippingPlane(Cartesian3.UNIT_X, -2.5);
        const clippingPlanes = new ClippingPlaneCollection({
          planes: [plane],
        });
        const model = await loadAndZoomToModelAsync(
          { gltf: boxTexturedGlbUrl, clippingPlanes: clippingPlanes },
          scene
        );
        verifyRender(model, false);

        clippingPlanes.removeAll();
        verifyRender(model, true);
      });

      it("removing clipping planes collection works", async function () {
        const plane = new ClippingPlane(Cartesian3.UNIT_X, -2.5);
        const clippingPlanes = new ClippingPlaneCollection({
          planes: [plane],
        });
        const model = await loadAndZoomToModelAsync(
          { gltf: boxTexturedGlbUrl, clippingPlanes: clippingPlanes },
          scene
        );
        verifyRender(model, false);

        model.clippingPlanes = undefined;
        verifyRender(model, true);
      });

      it("replacing clipping planes with another collection works", async function () {
        const modelClippedPlane = new ClippingPlane(Cartesian3.UNIT_X, -2.5);
        const modelVisiblePlane = new ClippingPlane(Cartesian3.UNIT_X, 2.5);

        const clippingPlanes = new ClippingPlaneCollection({
          planes: [modelClippedPlane],
        });

        const model = await loadAndZoomToModelAsync(
          { gltf: boxTexturedGlbUrl, clippingPlanes: clippingPlanes },
          scene
        );
        verifyRender(model, false);

        // Replace the clipping plane collection with one that makes the model visible.
        model.clippingPlanes = new ClippingPlaneCollection({
          planes: [modelVisiblePlane],
        });
        verifyRender(model, true);

        // Replace the clipping plane collection with one that clips the model.
        model.clippingPlanes = new ClippingPlaneCollection({
          planes: [modelClippedPlane],
        });
        verifyRender(model, false);
      });

      it("clipping planes apply edge styling", async function () {
        const plane = new ClippingPlane(Cartesian3.UNIT_X, 0);
        const clippingPlanes = new ClippingPlaneCollection({
          planes: [plane],
          edgeWidth: 25.0, // make large enough to show up on the render
          edgeColor: Color.BLUE,
        });

        const model = await loadAndZoomToModelAsync(
          { gltf: boxTexturedGlbUrl },
          scene
        );
        let modelColor;
        verifyRender(model, true);
        expect(scene).toRenderAndCall(function (rgba) {
          modelColor = rgba;
        });

        model.clippingPlanes = clippingPlanes;

        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).toEqual([0, 0, 255, 255]);
        });

        clippingPlanes.edgeWidth = 0.0;
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).toEqual(modelColor);
        });
      });

      it("clipping planes union regions", async function () {
        const clippingPlanes = new ClippingPlaneCollection({
          planes: [
            new ClippingPlane(Cartesian3.UNIT_Z, 5.0),
            new ClippingPlane(Cartesian3.UNIT_X, -2.0),
          ],
          unionClippingRegions: true,
        });
        const model = await loadAndZoomToModelAsync(
          { gltf: boxTexturedGlbUrl },
          scene
        );
        verifyRender(model, true);

        // These planes are defined such that the model is outside their union.
        model.clippingPlanes = clippingPlanes;
        verifyRender(model, false);

        model.clippingPlanes.unionClippingRegions = false;
        verifyRender(model, true);
      });

      it("destroys attached ClippingPlaneCollections", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGlbUrl,
          },
          scene
        );
        const clippingPlanes = new ClippingPlaneCollection({
          planes: [new ClippingPlane(Cartesian3.UNIT_X, 0.0)],
        });

        model.clippingPlanes = clippingPlanes;
        expect(model.isDestroyed()).toEqual(false);
        expect(clippingPlanes.isDestroyed()).toEqual(false);

        scene.primitives.remove(model);
        expect(model.isDestroyed()).toEqual(true);
        expect(clippingPlanes.isDestroyed()).toEqual(true);
      });

      it("destroys ClippingPlaneCollections that are detached", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGlbUrl,
          },
          scene
        );
        const clippingPlanes = new ClippingPlaneCollection({
          planes: [new ClippingPlane(Cartesian3.UNIT_X, 0.0)],
        });
        model.clippingPlanes = clippingPlanes;
        expect(clippingPlanes.isDestroyed()).toBe(false);

        model.clippingPlanes = undefined;
        expect(clippingPlanes.isDestroyed()).toBe(true);
      });
    });

    describe("clipping polygons", () => {
      let polygon;
      beforeEach(() => {
        const positions = Cartesian3.fromRadiansArray([
          -CesiumMath.PI_OVER_TWO,
          -CesiumMath.PI_OVER_TWO,
          CesiumMath.PI_OVER_TWO,
          -CesiumMath.PI_OVER_TWO,
          CesiumMath.PI_OVER_TWO,
          CesiumMath.PI_OVER_TWO,
          -CesiumMath.PI_OVER_TWO,
          CesiumMath.PI_OVER_TWO,
        ]);
        polygon = new ClippingPolygon({ positions });
      });

      it("throws when given clipping planes attached to another model", async function () {
        if (!scene.context.webgl2) {
          return;
        }

        const collection = new ClippingPolygonCollection({
          polygons: [polygon],
        });
        const modelA = await loadAndZoomToModelAsync(
          { gltf: boxTexturedGlbUrl },
          scene
        );
        modelA.clippingPolygons = collection;

        const modelB = await loadAndZoomToModelAsync(
          { gltf: boxTexturedGlbUrl },
          scene
        );

        expect(function () {
          modelB.clippingPolygons = collection;
        }).toThrowDeveloperError();
      });

      it("selectively hides model regions", async function () {
        if (!scene.context.webgl2) {
          return;
        }

        const collection = new ClippingPolygonCollection({
          polygons: [polygon],
        });
        const model = await loadAndZoomToModelAsync(
          { gltf: boxTexturedGlbUrl },
          scene
        );
        model.clippingPolygons = collection;
        verifyRender(model, false);

        model.clippingPolygons = undefined;
        verifyRender(model, true);
      });

      it("inverse works", async function () {
        if (!scene.context.webgl2) {
          return;
        }

        const collection = new ClippingPolygonCollection({
          polygons: [polygon],
        });
        const model = await loadAndZoomToModelAsync(
          { gltf: boxTexturedGlbUrl },
          scene
        );
        let modelColor;
        verifyRender(model, true);
        expect(scene).toRenderAndCall(function (rgba) {
          modelColor = rgba;
        });

        model.clippingPolygons = collection;
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual(modelColor);
        });

        model.clippingPolygons.inverse = true;
        expect(scene).toRenderAndCall(function (rgba) {
          expect(rgba).toEqual(modelColor);
        });
      });

      it("adding polygon to collection works", async function () {
        if (!scene.context.webgl2) {
          return;
        }

        const collection = new ClippingPolygonCollection();
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGlbUrl,
          },
          scene
        );
        model.clippingPolygons = collection;
        verifyRender(model, true);

        collection.add(polygon);
        verifyRender(model, false);
      });

      it("removing polygon from collection works", async function () {
        if (!scene.context.webgl2) {
          return;
        }

        const collection = new ClippingPolygonCollection({
          polygons: [polygon],
        });
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGlbUrl,
          },
          scene
        );
        model.clippingPolygons = collection;
        verifyRender(model, false);

        model.clippingPolygons.remove(polygon);
        verifyRender(model, true);
      });

      it("destroys attached ClippingPolygonCollections", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGlbUrl,
          },
          scene
        );
        const collection = new ClippingPolygonCollection({
          polygons: [polygon],
        });

        model.clippingPolygons = collection;
        expect(model.isDestroyed()).toEqual(false);
        expect(collection.isDestroyed()).toEqual(false);

        scene.primitives.remove(model);
        expect(model.isDestroyed()).toEqual(true);
        expect(collection.isDestroyed()).toEqual(true);
      });

      it("destroys ClippingPolygonCollections that are detached", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxTexturedGlbUrl,
          },
          scene
        );
        const collection = new ClippingPolygonCollection({
          polygons: [polygon],
        });
        model.clippingPolygons = collection;
        expect(collection.isDestroyed()).toBe(false);

        model.clippingPolygons = undefined;
        expect(collection.isDestroyed()).toBe(true);
      });
    });

    it("renders with classificationType", async function () {
      const model = await loadAndZoomToModelAsync(
        {
          url: boxTexturedGltfUrl,
          classificationType: ClassificationType.CESIUM_3D_TILE,
        },
        scene
      );
      expect(model.classificationType).toBe(ClassificationType.CESIUM_3D_TILE);

      // There's nothing to classify, so the model won't render.
      verifyRender(model, false);
    });

    describe("statistics", function () {
      it("gets triangle count", async function () {
        const model = await loadAndZoomToModelAsync(
          { gltf: boxTexturedGltfUrl },
          scene
        );
        const statistics = model.statistics;
        expect(statistics.trianglesLength).toEqual(12);
      });

      it("gets point count", async function () {
        const model = await loadAndZoomToModelAsync(
          { gltf: pointCloudUrl },
          scene
        );
        const statistics = model.statistics;
        expect(statistics.pointsLength).toEqual(2500);
      });

      it("gets memory usage for geometry and textures", async function () {
        const model = await loadAndZoomToModelAsync(
          { gltf: boxTexturedGltfUrl, incrementallyLoadTextures: false },
          scene
        );
        const expectedGeometryMemory = 840;
        // Texture is 256*256 and then is mipmapped
        const expectedTextureMemory = Math.floor(256 * 256 * 4 * (4 / 3));

        const statistics = model.statistics;
        expect(statistics.geometryByteLength).toEqual(expectedGeometryMemory);
        expect(statistics.texturesByteLength).toEqual(expectedTextureMemory);
      });

      it("gets memory usage for property tables", async function () {
        const model = await loadAndZoomToModelAsync(
          { gltf: buildingsMetadata },
          scene
        );
        const expectedPropertyTableMemory = 110;

        const statistics = model.statistics;
        expect(statistics.propertyTablesByteLength).toEqual(
          expectedPropertyTableMemory
        );
      });
    });

    describe("AGI_articulations", function () {
      it("setArticulationStage throws when model is not ready", async function () {
        const model = await Model.fromGltfAsync({
          url: boxArticulationsUrl,
        });

        expect(function () {
          model.setArticulationStage("SampleArticulation MoveX", 10.0);
        }).toThrowDeveloperError();
      });

      it("setArticulationStage throws with invalid value", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxArticulationsUrl,
          },
          scene
        );
        expect(function () {
          model.setArticulationStage("SampleArticulation MoveX", "bad");
        }).toThrowDeveloperError();
      });

      it("applyArticulations throws when model is not ready", async function () {
        const model = await Model.fromGltfAsync({
          url: boxArticulationsUrl,
        });

        expect(function () {
          model.applyArticulations();
        }).toThrowDeveloperError();
      });

      it("applies articulations", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxArticulationsUrl,
          },
          scene
        );
        verifyRender(model, true);

        model.setArticulationStage("SampleArticulation MoveX", 10.0);
        model.applyArticulations();
        verifyRender(model, false);

        model.setArticulationStage("SampleArticulation MoveX", 0.0);
        model.applyArticulations();
        verifyRender(model, true);

        model.setArticulationStage("SampleArticulation Size", 0.0);
        model.applyArticulations();
        verifyRender(model, false);

        model.setArticulationStage("SampleArticulation Size", 1.0);
        model.applyArticulations();
        verifyRender(model, true);
      });
    });

    describe("getNode", function () {
      it("getNode throws when model is not ready", async function () {
        const model = await Model.fromGltfAsync({
          url: boxArticulationsUrl,
        });

        expect(function () {
          model.getNode("Root");
        }).toThrowDeveloperError();
      });

      it("getNode throws when name is undefined", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxArticulationsUrl,
          },
          scene
        );
        expect(function () {
          model.getNode();
        }).toThrowDeveloperError();
      });

      it("getNode returns undefined for nonexistent node", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxArticulationsUrl,
          },
          scene
        );
        const node = model.getNode("I don't exist");
        expect(node).toBeUndefined();
      });

      it("getNode returns a node", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxArticulationsUrl,
          },
          scene
        );
        const node = model.getNode("Root");

        expect(node).toBeDefined();
        expect(node.name).toEqual("Root");
        expect(node.id).toEqual(0);
        expect(node.show).toEqual(true);
        expect(node.matrix).toEqual(boxArticulationsMatrix);
        expect(node.originalMatrix).toEqual(boxArticulationsMatrix);
      });

      it("changing node.show works", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxArticulationsUrl,
          },
          scene
        );
        verifyRender(model, true);
        const node = model.getNode("Root");
        expect(node.show).toEqual(true);

        node.show = false;
        verifyRender(model, false);
      });

      it("changing node.matrix works", async function () {
        const model = await loadAndZoomToModelAsync(
          {
            gltf: boxArticulationsUrl,
          },
          scene
        );
        verifyRender(model, true);
        const node = model.getNode("Root");
        expect(node.matrix).toEqual(boxArticulationsMatrix);
        expect(node.originalMatrix).toEqual(boxArticulationsMatrix);

        node.matrix = Matrix4.fromTranslation(new Cartesian3(10, 0, 0));
        // The model's bounding sphere doesn't account for animations,
        // so the camera will not account for the node's new transform.
        verifyRender(model, false);
      });
    });

    describe("fog", function () {
      const sunnyDate = JulianDate.fromIso8601("2024-01-11T15:00:00Z");
      const darkDate = JulianDate.fromIso8601("2024-01-11T00:00:00Z");

      afterEach(function () {
        scene.atmosphere = new Atmosphere();
        scene.fog = new Fog();
        scene.light = new SunLight();
        scene.camera.switchToPerspectiveFrustum();
      });

      function viewFog(scene, model) {
        // In order for fog to create a visible change, the camera needs to be
        // further away from the model. This would make the box sub-pixel
        // so to make it fill the canvas, use an ortho camera the same
        // width of the box to make the scene look 2D.
        const center = model.boundingSphere.center;
        scene.camera.lookAt(center, new Cartesian3(1000, 0, 0));
        scene.camera.switchToOrthographicFrustum();
        scene.camera.frustum.width = 1;
      }

      it("renders a model in fog", async function () {
        // Move the fog very close to the camera;
        scene.fog.density = 1.0;

        // Increase the brightness to make the fog color
        // stand out more for this test
        scene.atmosphere.brightnessShift = 1.0;

        const model = await loadAndZoomToModelAsync(
          {
            url: boxTexturedGltfUrl,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(
              Cartesian3.fromDegrees(0, 0, 10.0)
            ),
          },
          scene
        );

        viewFog(scene, model);

        const renderOptions = {
          scene,
          time: sunnyDate,
        };

        // First, turn off the fog to capture the original color
        let originalColor;
        scene.fog.enabled = false;
        expect(renderOptions).toRenderAndCall(function (rgba) {
          originalColor = rgba;
          expect(originalColor).not.toEqual([0, 0, 0, 255]);
        });

        // Now turn on fog. The result should be bluish
        // than before due to scattering.
        scene.fog.enabled = true;
        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual([0, 0, 0, 255]);
          expect(rgba).not.toEqual(originalColor);

          // The result should have a bluish tint
          const [r, g, b, a] = rgba;
          expect(b).toBeGreaterThan(r);
          expect(b).toBeGreaterThan(g);
          expect(a).toBe(255);
        });
      });

      it("renders a model in fog (sunlight)", async function () {
        // Move the fog very close to the camera;
        scene.fog.density = 1.0;

        // Increase the brightness to make the fog color
        // stand out more for this test
        scene.atmosphere.brightnessShift = 1.0;

        const model = await loadAndZoomToModelAsync(
          {
            url: boxTexturedGltfUrl,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(
              Cartesian3.fromDegrees(0, 0, 10.0)
            ),
          },
          scene
        );

        // In order for fog to render, the camera needs to be
        // further away from the model. This would make the box sub-pixel
        // so to make it fill the canvas, use an ortho camera the same
        // width of the box to make the scene look 2D.
        const center = model.boundingSphere.center;
        scene.camera.lookAt(center, new Cartesian3(1000, 0, 0));
        scene.camera.switchToOrthographicFrustum();
        scene.camera.frustum.width = 1;

        // Grab the color when dynamic lighting is off for comparison
        scene.atmosphere.dynamicLighting = DynamicAtmosphereLightingType.NONE;
        const renderOptions = {
          scene,
          time: sunnyDate,
        };
        let originalColor;
        expect(renderOptions).toRenderAndCall(function (rgba) {
          originalColor = rgba;
          expect(originalColor).not.toEqual([0, 0, 0, 255]);
        });

        // switch the lighting model to sunlight
        scene.atmosphere.dynamicLighting =
          DynamicAtmosphereLightingType.SUNLIGHT;

        // Render in the sun, it should be a different color than the
        // original
        let sunnyColor;
        expect(renderOptions).toRenderAndCall(function (rgba) {
          sunnyColor = rgba;
          expect(rgba).not.toEqual([0, 0, 0, 255]);
          expect(rgba).not.toEqual(originalColor);
        });

        // Render in the dark, it should be a different color and
        // darker than in sun
        renderOptions.time = darkDate;
        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual(originalColor);
          expect(rgba).not.toEqual(sunnyColor);

          const [sunR, sunG, sunB, sunA] = sunnyColor;
          const [r, g, b, a] = rgba;
          expect(r).toBeLessThan(sunR);
          expect(g).toBeLessThan(sunG);
          expect(b).toBeLessThan(sunB);
          expect(a).toBe(sunA);
        });
      });

      it("renders a model in fog (scene light)", async function () {
        // Move the fog very close to the camera;
        scene.fog.density = 1.0;

        // Increase the brightness to make the fog color
        // stand out more for this test
        scene.atmosphere.brightnessShift = 1.0;

        const model = await loadAndZoomToModelAsync(
          {
            url: boxTexturedGltfUrl,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(
              Cartesian3.fromDegrees(0, 0, 10.0)
            ),
          },
          scene
        );

        viewFog(scene, model);

        // Grab the color when dynamic lighting is off for comparison
        scene.atmosphere.dynamicLighting = DynamicAtmosphereLightingType.NONE;
        const renderOptions = {
          scene,
          time: sunnyDate,
        };
        let originalColor;
        expect(renderOptions).toRenderAndCall(function (rgba) {
          originalColor = rgba;
          expect(originalColor).not.toEqual([0, 0, 0, 255]);
        });

        // Also grab the color in sunlight for comparison
        scene.atmosphere.dynamicLighting =
          DynamicAtmosphereLightingType.SUNLIGHT;
        let sunnyColor;
        expect(renderOptions).toRenderAndCall(function (rgba) {
          sunnyColor = rgba;
          expect(rgba).not.toEqual([0, 0, 0, 255]);
          expect(rgba).not.toEqual(originalColor);
        });

        // Set a light on the scene, but since dynamicLighting is SUNLIGHT,
        // it should have no effect yet
        scene.light = new DirectionalLight({
          direction: new Cartesian3(0, 1, 0),
        });
        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba).toEqual(sunnyColor);
        });

        // Set dynamic lighting to use the scene light, now it should
        // render a different color from the other light sources
        scene.atmosphere.dynamicLighting =
          DynamicAtmosphereLightingType.SCENE_LIGHT;

        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual([0, 0, 0, 255]);
          expect(rgba).not.toEqual(originalColor);
          expect(rgba).not.toEqual(sunnyColor);
        });
      });

      it("adjusts atmosphere light intensity", async function () {
        // Move the fog very close to the camera;
        scene.fog.density = 1.0;

        // Increase the brightness to make the fog color
        // stand out more. We'll use the light intensity to
        // modulate this.
        scene.atmosphere.brightnessShift = 1.0;

        const model = await loadAndZoomToModelAsync(
          {
            url: boxTexturedGltfUrl,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(
              Cartesian3.fromDegrees(0, 0, 10.0)
            ),
          },
          scene
        );

        viewFog(scene, model);

        const renderOptions = {
          scene,
          time: sunnyDate,
        };

        // Grab the original color.
        let originalColor;
        expect(renderOptions).toRenderAndCall(function (rgba) {
          originalColor = rgba;
          expect(rgba).not.toEqual([0, 0, 0, 255]);

          // The result should have a bluish tint from the atmosphere
          const [r, g, b, a] = rgba;
          expect(b).toBeGreaterThan(r);
          expect(b).toBeGreaterThan(g);
          expect(a).toBe(255);
        });

        // Turn down the light intensity
        scene.atmosphere.lightIntensity = 5.0;
        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual([0, 0, 0, 255]);
          expect(rgba).not.toEqual(originalColor);

          // Check that each component (except alpha) is darker than before
          const [oldR, oldG, oldB, oldA] = originalColor;
          const [r, g, b, a] = rgba;
          expect(r).toBeLessThan(oldR);
          expect(g).toBeLessThan(oldG);
          expect(b).toBeLessThan(oldB);
          expect(a).toBe(oldA);
        });
      });

      it("applies a hue shift", async function () {
        // Move the fog very close to the camera;
        scene.fog.density = 1.0;

        // Increase the brightness to make the fog color
        // stand out more for this test
        scene.atmosphere.brightnessShift = 1.0;

        const model = await loadAndZoomToModelAsync(
          {
            url: boxTexturedGltfUrl,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(
              Cartesian3.fromDegrees(0, 0, 10.0)
            ),
          },
          scene
        );

        viewFog(scene, model);

        const renderOptions = {
          scene,
          time: sunnyDate,
        };

        // Grab the original color.
        let originalColor;
        expect(renderOptions).toRenderAndCall(function (rgba) {
          originalColor = rgba;
          expect(rgba).not.toEqual([0, 0, 0, 255]);

          // The result should have a bluish tint from the atmosphere
          const [r, g, b, a] = rgba;
          expect(b).toBeGreaterThan(r);
          expect(b).toBeGreaterThan(g);
          expect(a).toBe(255);
        });

        // Shift the fog color to be reddish
        scene.atmosphere.hueShift = 0.4;
        let redColor;
        expect(renderOptions).toRenderAndCall(function (rgba) {
          redColor = rgba;
          expect(rgba).not.toEqual([0, 0, 0, 255]);
          expect(redColor).not.toEqual(originalColor);

          // Check for a reddish tint
          const [r, g, b, a] = rgba;
          expect(r).toBeGreaterThan(g);
          expect(r).toBeGreaterThan(b);
          expect(a).toBe(255);
        });

        // ...now greenish
        scene.atmosphere.hueShift = 0.7;
        let greenColor;
        expect(renderOptions).toRenderAndCall(function (rgba) {
          greenColor = rgba;
          expect(rgba).not.toEqual([0, 0, 0, 255]);
          expect(greenColor).not.toEqual(originalColor);
          expect(greenColor).not.toEqual(redColor);

          // Check for a greenish tint
          const [r, g, b, a] = rgba;
          expect(g).toBeGreaterThan(r);
          expect(g).toBeGreaterThan(b);
          expect(a).toBe(255);
        });

        // ...and all the way around the color wheel back to bluish
        scene.atmosphere.hueShift = 1.0;
        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual([0, 0, 0, 255]);
          expect(rgba).toEqual(originalColor);
        });
      });

      it("applies a brightness shift", async function () {
        // Move the fog very close to the camera;
        scene.fog.density = 1.0;

        const model = await loadAndZoomToModelAsync(
          {
            url: boxTexturedGltfUrl,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(
              Cartesian3.fromDegrees(0, 0, 10.0)
            ),
          },
          scene
        );

        viewFog(scene, model);

        const renderOptions = {
          scene,
          time: sunnyDate,
        };

        // Grab the original color.
        let originalColor;
        scene.atmosphere.brightnessShift = 1.0;
        expect(renderOptions).toRenderAndCall(function (rgba) {
          originalColor = rgba;
          expect(rgba).not.toEqual([0, 0, 0, 255]);

          // The result should have a bluish tint from the atmosphere
          const [r, g, b, a] = rgba;
          expect(b).toBeGreaterThan(r);
          expect(b).toBeGreaterThan(g);
          expect(a).toBe(255);
        });

        // Turn down the brightness
        scene.atmosphere.brightnessShift = 0.5;
        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual([0, 0, 0, 255]);
          expect(rgba).not.toEqual(originalColor);

          // Check that each component (except alpha) is darker than before
          const [oldR, oldG, oldB, oldA] = originalColor;
          const [r, g, b, a] = rgba;
          expect(r).toBeLessThan(oldR);
          expect(g).toBeLessThan(oldG);
          expect(b).toBeLessThan(oldB);
          expect(a).toBe(oldA);
        });
      });

      it("applies a saturation shift", async function () {
        // Move the fog very close to the camera;
        scene.fog.density = 1.0;

        const model = await loadAndZoomToModelAsync(
          {
            url: boxTexturedGltfUrl,
            modelMatrix: Transforms.eastNorthUpToFixedFrame(
              Cartesian3.fromDegrees(0, 0, 10.0)
            ),
          },
          scene
        );

        viewFog(scene, model);

        const renderOptions = {
          scene,
          time: sunnyDate,
        };

        // Grab the original color.
        let originalColor;
        expect(renderOptions).toRenderAndCall(function (rgba) {
          originalColor = rgba;
          expect(rgba).not.toEqual([0, 0, 0, 255]);

          // The result should have a bluish tint from the atmosphere
          const [r, g, b, a] = rgba;
          expect(b).toBeGreaterThan(r);
          expect(b).toBeGreaterThan(g);
          expect(a).toBe(255);
        });

        // Turn down the saturation all the way
        scene.atmosphere.saturationShift = -1.0;
        expect(renderOptions).toRenderAndCall(function (rgba) {
          expect(rgba).not.toEqual([0, 0, 0, 255]);
          expect(rgba).not.toEqual(originalColor);

          // Check that each component (except alpha) is the same
          // as grey values have R = G = B
          const [r, g, b, a] = rgba;
          expect(g).toBe(r);
          expect(b).toBe(g);
          expect(a).toBe(255);
        });
      });
    });

    it("pick returns position of intersection between ray and model surface", async function () {
      const model = await loadAndZoomToModelAsync(
        {
          url: boxTexturedGltfUrl,
          enablePick: !scene.frameState.context.webgl2,
        },
        scene
      );
      const ray = scene.camera.getPickRay(
        new Cartesian2(
          scene.drawingBufferWidth / 2.0,
          scene.drawingBufferHeight / 2.0
        )
      );

      const expected = new Cartesian3(0.5, 0, 0.5);
      expect(model.pick(ray, scene.frameState)).toEqualEpsilon(
        expected,
        CesiumMath.EPSILON12
      );
    });

    it("destroy works", async function () {
      spyOn(ShaderProgram.prototype, "destroy").and.callThrough();
      const model = await loadAndZoomToModelAsync(
        { gltf: boxTexturedGlbUrl },
        scene
      );
      const resources = model._pipelineResources;
      const loader = model._loader;

      for (let i = 0; i < resources.length; i++) {
        const resource = resources[i];
        if (defined(resource.isDestroyed)) {
          expect(resource.isDestroyed()).toEqual(false);
        }
      }
      expect(loader.isDestroyed()).toEqual(false);
      expect(model.isDestroyed()).toEqual(false);
      scene.primitives.remove(model);
      if (!webglStub) {
        expect(ShaderProgram.prototype.destroy).toHaveBeenCalled();
      }
      for (let i = 0; i < resources.length - 1; i++) {
        const resource = resources[i];
        if (defined(resource.isDestroyed)) {
          expect(resource.isDestroyed()).toEqual(true);
        }
      }
      expect(loader.isDestroyed()).toEqual(true);
      expect(model.isDestroyed()).toEqual(true);
    });

    it("destroy doesn't destroy resources when they're in use", async function () {
      const models = await Promise.all([
        loadAndZoomToModelAsync({ gltf: boxTexturedGlbUrl }, scene),
        loadAndZoomToModelAsync({ gltf: boxTexturedGlbUrl }, scene),
      ]);
      const cacheEntries = ResourceCache.cacheEntries;
      let cacheKey;
      let cacheEntry;

      scene.primitives.remove(models[0]);

      for (cacheKey in cacheEntries) {
        if (cacheEntries.hasOwnProperty(cacheKey)) {
          cacheEntry = cacheEntries[cacheKey];
          expect(cacheEntry.referenceCount).toBeGreaterThan(0);
        }
      }

      scene.primitives.remove(models[1]);

      for (cacheKey in cacheEntries) {
        if (cacheEntries.hasOwnProperty(cacheKey)) {
          cacheEntry = cacheEntries[cacheKey];
          expect(cacheEntry.referenceCount).toBe(0);
        }
      }
    });
  },
  "WebGL"
);
