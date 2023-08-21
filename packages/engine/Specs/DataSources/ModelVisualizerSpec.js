import {
  BoundingSphere,
  Cartesian2,
  Cartesian3,
  Color,
  defined,
  DistanceDisplayCondition,
  HeightReference,
  JulianDate,
  Math as CesiumMath,
  Matrix4,
  Quaternion,
  Resource,
  Transforms,
  BoundingSphereState,
  ConstantPositionProperty,
  ConstantProperty,
  EntityCollection,
  ModelGraphics,
  ModelVisualizer,
  NodeTransformationProperty,
  ClippingPlane,
  ClippingPlaneCollection,
  CustomShader,
  Globe,
  Cartographic,
  createWorldTerrainAsync,
} from "../../index.js";
import createScene from "../../../../Specs/createScene.js";
import pollToPromise from "../../../../Specs/pollToPromise.js";

describe(
  "DataSources/ModelVisualizer",
  function () {
    const boxUrl = "./Data/Models/glTF-2.0/BoxTextured/glTF/BoxTextured.gltf";
    const boxArticulationsUrl =
      "./Data/Models/glTF-2.0/BoxArticulations/glTF/BoxArticulations.gltf";

    let scene;
    let entityCollection;
    let visualizer;

    beforeAll(function () {
      scene = createScene();
    });

    beforeEach(function () {
      scene.globe = new Globe();
      entityCollection = new EntityCollection();
      visualizer = new ModelVisualizer(scene, entityCollection);
    });

    afterEach(function () {
      visualizer = visualizer && visualizer.destroy();
      entityCollection.removeAll();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    it("constructor throws if no scene is passed", function () {
      expect(function () {
        return new ModelVisualizer(undefined, entityCollection);
      }).toThrowDeveloperError();
    });

    it("constructor throws if no entityCollection is passed", function () {
      expect(function () {
        return new ModelVisualizer(scene, undefined);
      }).toThrowDeveloperError();
    });

    it("update throws if no time specified", function () {
      expect(function () {
        visualizer.update();
      }).toThrowDeveloperError();
    });

    it("isDestroy returns false until destroyed", function () {
      expect(visualizer.isDestroyed()).toEqual(false);
      visualizer.destroy();
      expect(visualizer.isDestroyed()).toEqual(true);
      visualizer = undefined;
    });

    it("removes the listener from the entity collection when destroyed", function () {
      expect(entityCollection.collectionChanged.numberOfListeners).toEqual(1);
      visualizer.destroy();
      expect(entityCollection.collectionChanged.numberOfListeners).toEqual(0);
      visualizer = undefined;
    });

    it("object with no model does not create one", function () {
      const testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = new ConstantProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      visualizer.update(JulianDate.now());
      expect(scene.primitives.length).toEqual(0);
    });

    it("object with no position does not create a model", function () {
      const testObject = entityCollection.getOrCreateEntity("test");
      const model = (testObject.model = new ModelGraphics());
      model.uri = new ConstantProperty(boxUrl);

      visualizer.update(JulianDate.now());
      expect(scene.primitives.length).toEqual(0);
    });

    it("creates and updates a primitive from ModelGraphics", async function () {
      const time = JulianDate.now();

      const model = new ModelGraphics();
      model.show = new ConstantProperty(true);
      model.scale = new ConstantProperty(2);
      model.minimumPixelSize = new ConstantProperty(24.0);
      model.uri = new ConstantProperty(boxArticulationsUrl);
      model.distanceDisplayCondition = new ConstantProperty(
        new DistanceDisplayCondition(10.0, 100.0)
      );

      const translation = new Cartesian3(1.0, 2.0, 3.0);
      const rotation = new Quaternion(0.0, 0.707, 0.0, 0.707);
      const scale = new Cartesian3(2.0, 2.0, 2.0);
      const nodeTransforms = {
        Root: new NodeTransformationProperty({
          translation: new ConstantProperty(translation),
          rotation: new ConstantProperty(rotation),
          scale: new ConstantProperty(scale),
        }),
      };
      model.nodeTransformations = nodeTransforms;

      const clippingPlanes = new ClippingPlaneCollection({
        planes: [new ClippingPlane(Cartesian3.UNIT_X, 0.0)],
      });
      model.clippingPlanes = new ConstantProperty(clippingPlanes);

      const customShader = new CustomShader();
      model.customShader = new ConstantProperty(customShader);

      model.imageBasedLightingFactor = new ConstantProperty(
        new Cartesian2(0.5, 0.5)
      );
      model.lightColor = new ConstantProperty(new Color(1.0, 1.0, 0.0, 1.0));

      const testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = new ConstantPositionProperty(
        Cartesian3.fromDegrees(1, 2, 3)
      );
      testObject.model = model;

      visualizer.update(time);

      let primitive;
      await pollToPromise(function () {
        primitive = scene.primitives.get(0);
        return defined(primitive);
      });

      visualizer.update(time);

      expect(primitive.show).toEqual(true);
      expect(primitive.scale).toEqual(2);
      expect(primitive.minimumPixelSize).toEqual(24.0);
      expect(primitive.modelMatrix).toEqual(
        Transforms.eastNorthUpToFixedFrame(
          Cartesian3.fromDegrees(1, 2, 3),
          scene.globe.ellipsoid
        )
      );
      expect(primitive.distanceDisplayCondition).toEqual(
        new DistanceDisplayCondition(10.0, 100.0)
      );
      expect(primitive.clippingPlanes._planes.length).toEqual(
        clippingPlanes._planes.length
      );
      expect(
        Cartesian3.equals(
          primitive.clippingPlanes._planes[0].normal,
          clippingPlanes._planes[0].normal
        )
      ).toBe(true);
      expect(primitive.clippingPlanes._planes[0].distance).toEqual(
        clippingPlanes._planes[0].distance
      );

      expect(primitive.customShader).toEqual(customShader);

      expect(primitive.imageBasedLighting.imageBasedLightingFactor).toEqual(
        new Cartesian2(0.5, 0.5)
      );

      expect(primitive.lightColor).toEqual(new Cartesian3(1.0, 1.0, 0.0));

      // wait till the model is loaded before we can check node transformations
      await pollToPromise(function () {
        scene.render();
        return primitive.ready;
      });

      visualizer.update(time);

      const node = primitive.getNode("Root");
      expect(node).toBeDefined();

      const transformationMatrix = Matrix4.fromTranslationQuaternionRotationScale(
        translation,
        rotation,
        scale
      );

      Matrix4.multiplyTransformation(
        node.originalMatrix,
        transformationMatrix,
        transformationMatrix
      );

      expect(node.matrix).toEqual(transformationMatrix);
    });

    it("can apply model articulations", async function () {
      const time = JulianDate.now();

      const model = new ModelGraphics();
      model.uri = new ConstantProperty(boxArticulationsUrl);

      const articulations = {
        "SampleArticulation MoveX": 1.0,
        "SampleArticulation MoveY": 2.0,
        "SampleArticulation MoveZ": 3.0,
        "SampleArticulation Yaw": 4.0,
        "SampleArticulation Pitch": 5.0,
        "SampleArticulation Roll": 6.0,
        "SampleArticulation Size": 0.9,
        "SampleArticulation SizeX": 0.8,
        "SampleArticulation SizeY": 0.7,
        "SampleArticulation SizeZ": 0.6,
      };
      model.articulations = articulations;

      const testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = new ConstantPositionProperty(
        Cartesian3.fromDegrees(1, 2, 3)
      );
      testObject.model = model;

      visualizer.update(time);

      let primitive;
      await pollToPromise(function () {
        primitive = scene.primitives.get(0);
        return defined(primitive);
      });

      // wait till the model is loaded before we can check articulations
      await pollToPromise(function () {
        scene.render();
        return primitive.ready;
      });
      visualizer.update(time);

      const node = primitive.getNode("Root");

      const expected = [
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
    });

    it("creates a primitive from ModelGraphics with a Resource", async function () {
      const time = JulianDate.now();

      const model = new ModelGraphics();
      model.show = new ConstantProperty(true);
      model.uri = new ConstantProperty(
        new Resource({
          url: boxArticulationsUrl,
        })
      );

      const testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = new ConstantPositionProperty(
        Cartesian3.fromDegrees(1, 2, 3)
      );
      testObject.model = model;

      visualizer.update(time);

      let primitive;
      await pollToPromise(function () {
        primitive = scene.primitives.get(0);
        return defined(primitive);
      });

      // wait till the model is loaded before we can check node transformations
      await pollToPromise(function () {
        scene.render();
        return primitive.ready;
      });

      visualizer.update(time);

      const node = primitive.getNode("Root");
      expect(node).toBeDefined();
    });

    it("removes primitives on Entity removal", async function () {
      const model = new ModelGraphics();
      model.uri = new ConstantProperty(boxUrl);

      const time = JulianDate.now();
      const testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = new ConstantProperty(
        new Cartesian3(5678, 1234, 1101112)
      );
      testObject.model = model;
      visualizer.update(time);

      let primitive;
      await pollToPromise(function () {
        primitive = scene.primitives.get(0);
        return defined(primitive);
      });

      visualizer.update(time);
      entityCollection.removeAll();
      visualizer.update(time);
      expect(scene.primitives.length).toEqual(0);
    });

    it("sets id property", async function () {
      const time = JulianDate.now();
      const testObject = entityCollection.getOrCreateEntity("test");
      const model = new ModelGraphics();
      testObject.model = model;

      testObject.position = new ConstantProperty(
        new Cartesian3(5678, 1234, 1101112)
      );
      model.uri = new ConstantProperty(boxUrl);
      visualizer.update(time);

      let primitive;
      await pollToPromise(function () {
        primitive = scene.primitives.get(0);
        return defined(primitive);
      });

      expect(primitive.id).toEqual(testObject);
    });

    it("computes bounding sphere", async function () {
      const time = JulianDate.now();
      const testObject = entityCollection.getOrCreateEntity("test");
      const model = new ModelGraphics();
      testObject.model = model;

      testObject.position = new ConstantProperty(
        new Cartesian3(5678, 1234, 1101112)
      );
      model.uri = new ConstantProperty(boxUrl);
      visualizer.update(time);

      let primitive;
      await pollToPromise(function () {
        primitive = scene.primitives.get(0);
        return defined(primitive);
      });

      const result = new BoundingSphere();
      let state = visualizer.getBoundingSphere(testObject, result);
      expect(state).toBe(BoundingSphereState.PENDING);

      await pollToPromise(function () {
        scene.render();
        visualizer.update(time);
        state = visualizer.getBoundingSphere(testObject, result);
        return state !== BoundingSphereState.PENDING;
      });
      expect(state).toBe(BoundingSphereState.DONE);
      const expected = BoundingSphere.clone(
        primitive.boundingSphere,
        new BoundingSphere()
      );
      expect(result).toEqual(expected);
    });

    it("computes bounding sphere with height reference clamp to ground", async function () {
      // Setup a position for the model.
      const position = Cartesian3.fromDegrees(149.515332, -34.984799);
      const positionCartographic = Cartographic.fromCartesian(position);

      // Initialize the Entity and the ModelGraphics.
      const time = JulianDate.now();
      const testObject = entityCollection.getOrCreateEntity("test");
      const model = new ModelGraphics({
        heightReference: HeightReference.CLAMP_TO_GROUND,
      });
      testObject.model = model;
      testObject.position = new ConstantProperty(position);
      model.uri = new ConstantProperty(boxUrl);

      visualizer.update(time);

      // Request the bounding sphere once.
      const result = new BoundingSphere();
      let state = visualizer.getBoundingSphere(testObject, result);
      expect(state).toBe(BoundingSphereState.PENDING);

      // Assign a tiled terrain provider to the globe.
      const globe = scene.globe;
      globe.terrainProvider = await createWorldTerrainAsync();

      const updatedCartographics = await ModelVisualizer._sampleTerrainMostDetailed(
        globe.terrainProvider,
        [positionCartographic]
      );
      const sampledResultCartographic = updatedCartographics[0];
      const sampledResult = globe.ellipsoid.cartographicToCartesian(
        sampledResultCartographic
      );

      const sampleTerrainSpy = spyOn(
        ModelVisualizer,
        "_sampleTerrainMostDetailed"
      ).and.callThrough();

      // Repeatedly request the bounding sphere until it's ready.
      await pollToPromise(function () {
        scene.render();
        visualizer.update(time);
        state = visualizer.getBoundingSphere(testObject, result);
        return state !== BoundingSphereState.PENDING;
      });

      expect(state).toBe(BoundingSphereState.DONE);

      // Ensure that flags and results computed for this model are reset.
      const modelData = visualizer._modelHash[testObject.id];
      expect(modelData.awaitingSampleTerrain).toBe(false);
      expect(modelData.clampedBoundingSphere).toBeUndefined();

      // Ensure that we only sample the terrain once from the visualizer.
      expect(sampleTerrainSpy).toHaveBeenCalledTimes(1);

      // Calculate the distance of the bounding sphere returned from the position returned from sample terrain.
      // Since sampleTerrainMostDetailed isn't always precise, we account for some error.
      const distance = Cartesian3.distance(result.center, sampledResult);
      const errorMargin = 100.0;
      expect(distance).toBeLessThan(errorMargin);
    });

    it("computes bounding sphere with height reference clamp to ground on terrain provider without availability", function () {
      // Setup a position for the model.
      const longitude = CesiumMath.toRadians(149.515332);
      const latitude = CesiumMath.toRadians(-34.984799);
      const height = 1000;
      const position = Cartesian3.fromRadians(longitude, latitude, height);

      // Initialize the Entity and the ModelGraphics.
      const time = JulianDate.now();
      const testObject = entityCollection.getOrCreateEntity("test");
      const model = new ModelGraphics({
        heightReference: HeightReference.CLAMP_TO_GROUND,
      });
      testObject.model = model;
      testObject.position = new ConstantProperty(position);
      model.uri = new ConstantProperty(boxUrl);

      visualizer.update(time);

      // Request the bounding sphere once.
      const result = new BoundingSphere();
      let state = visualizer.getBoundingSphere(testObject, result);
      expect(state).toBe(BoundingSphereState.PENDING);

      // Ensure that the terrain provider does not have availability.
      const globe = scene.globe;
      const terrainProvider = globe.terrainProvider;
      expect(terrainProvider.availability).toBe(undefined);

      // Repeatedly request the bounding sphere until it's ready.
      return pollToPromise(function () {
        scene.render();
        visualizer.update(time);
        state = visualizer.getBoundingSphere(testObject, result);
        return state !== BoundingSphereState.PENDING;
      }).then(() => {
        expect(state).toBe(BoundingSphereState.DONE);
        // Ensure that the clamped position has height set to 0.
        const cartographic = globe.ellipsoid.cartesianToCartographic(
          result.center
        );
        expect(cartographic.height).toEqualEpsilon(0, CesiumMath.EPSILON6);
        expect(cartographic.latitude).toEqualEpsilon(
          latitude,
          CesiumMath.EPSILON6
        );
        expect(cartographic.longitude).toEqualEpsilon(
          longitude,
          CesiumMath.EPSILON6
        );
      });
    });

    it("computes bounding sphere with height reference relative to ground", async function () {
      // Setup a position for the model.
      const heightOffset = 1000.0;
      const position = Cartesian3.fromDegrees(
        149.515332,
        -34.984799,
        heightOffset
      );
      const positionCartographic = Cartographic.fromCartesian(position);

      // Setup a spy so we can track how often sampleTerrain is called.
      const sampleTerrainSpy = spyOn(
        ModelVisualizer,
        "_sampleTerrainMostDetailed"
      ).and.callThrough();

      // Initialize the Entity and the ModelGraphics.
      const time = JulianDate.now();
      const testObject = entityCollection.getOrCreateEntity("test");
      const model = new ModelGraphics({
        heightReference: HeightReference.RELATIVE_TO_GROUND,
      });
      testObject.model = model;
      testObject.position = new ConstantProperty(position);
      model.uri = new ConstantProperty(boxUrl);

      visualizer.update(time);

      // Request the bounding sphere once.
      const result = new BoundingSphere();
      let state = visualizer.getBoundingSphere(testObject, result);
      expect(state).toBe(BoundingSphereState.PENDING);

      // Assign a tiled terrain provider to the globe.
      const globe = scene.globe;
      globe.terrainProvider = await createWorldTerrainAsync();

      const updatedCartographics = await ModelVisualizer._sampleTerrainMostDetailed(
        globe.terrainProvider,
        [positionCartographic]
      );
      const sampledResultCartographic = updatedCartographics[0];
      const sampledResult = globe.ellipsoid.cartographicToCartesian(
        sampledResultCartographic
      );

      // Repeatedly request the bounding sphere until it's ready.
      await pollToPromise(function () {
        scene.render();
        visualizer.update(time);
        state = visualizer.getBoundingSphere(testObject, result);
        return state !== BoundingSphereState.PENDING;
      });
      expect(state).toBe(BoundingSphereState.DONE);

      // Ensure that flags and results computed for this model are reset.
      const modelData = visualizer._modelHash[testObject.id];
      expect(modelData.awaitingSampleTerrain).toBe(false);
      expect(modelData.clampedBoundingSphere).toBeUndefined();

      // Ensure that we only sample the terrain once from the visualizer.
      // We check for 2 calls here because we call it once in the test.
      expect(sampleTerrainSpy).toHaveBeenCalledTimes(2);

      // Calculate the distance of the bounding sphere returned from the position returned from sample terrain.
      // Since sampleTerrainMostDetailed isn't always precise, we account for some error.
      const distance =
        Cartesian3.distance(result.center, sampledResult) - heightOffset;
      const errorMargin = 100.0;
      expect(distance).toBeLessThan(errorMargin);
    });

    it("computes bounding sphere with height reference relative to ground on terrain provider without availability", function () {
      // Setup a position for the model.
      const longitude = CesiumMath.toRadians(149.515332);
      const latitude = CesiumMath.toRadians(-34.984799);
      const height = 1000;
      const position = Cartesian3.fromRadians(longitude, latitude, height);

      // Initialize the Entity and the ModelGraphics.
      const time = JulianDate.now();
      const testObject = entityCollection.getOrCreateEntity("test");
      const model = new ModelGraphics({
        heightReference: HeightReference.RELATIVE_TO_GROUND,
      });
      testObject.model = model;
      testObject.position = new ConstantProperty(position);
      model.uri = new ConstantProperty(boxUrl);

      visualizer.update(time);

      // Request the bounding sphere once.
      const result = new BoundingSphere();
      let state = visualizer.getBoundingSphere(testObject, result);
      expect(state).toBe(BoundingSphereState.PENDING);

      // Ensure that the terrain provider does not have availability.
      const globe = scene.globe;
      const terrainProvider = globe.terrainProvider;
      expect(terrainProvider.availability).toBe(undefined);

      // Repeatedly request the bounding sphere until it's ready.
      return pollToPromise(function () {
        scene.render();
        visualizer.update(time);
        state = visualizer.getBoundingSphere(testObject, result);
        return state !== BoundingSphereState.PENDING;
      }).then(() => {
        const cartographic = globe.ellipsoid.cartesianToCartographic(
          result.center
        );
        expect(cartographic.height).toEqualEpsilon(height, CesiumMath.EPSILON6);
        expect(cartographic.latitude).toEqualEpsilon(
          latitude,
          CesiumMath.EPSILON6
        );
        expect(cartographic.longitude).toEqualEpsilon(
          longitude,
          CesiumMath.EPSILON6
        );
      });
    });

    it("computes bounding sphere where globe is undefined", async function () {
      scene.globe = undefined;

      const time = JulianDate.now();
      const testObject = entityCollection.getOrCreateEntity("test");
      const model = new ModelGraphics();
      testObject.model = model;

      testObject.position = new ConstantProperty(
        new Cartesian3(5678, 1234, 1101112)
      );
      model.uri = new ConstantProperty(boxUrl);
      visualizer.update(time);

      let primitive;
      await pollToPromise(function () {
        primitive = scene.primitives.get(0);
        return defined(primitive);
      });

      const result = new BoundingSphere();
      let state = visualizer.getBoundingSphere(testObject, result);
      expect(state).toBe(BoundingSphereState.PENDING);

      await pollToPromise(function () {
        scene.render();
        visualizer.update(time);
        state = visualizer.getBoundingSphere(testObject, result);
        return state !== BoundingSphereState.PENDING;
      });
      expect(state).toBe(BoundingSphereState.DONE);
      const expected = BoundingSphere.clone(
        primitive.boundingSphere,
        new BoundingSphere()
      );
      expect(result).toEqual(expected);
    });

    it("fails bounding sphere for entity without ModelGraphics", function () {
      const testObject = entityCollection.getOrCreateEntity("test");
      visualizer.update(JulianDate.now());
      const result = new BoundingSphere();
      const state = visualizer.getBoundingSphere(testObject, result);
      expect(state).toBe(BoundingSphereState.FAILED);
    });

    it("fails bounding sphere when model fails to load", async function () {
      const time = JulianDate.now();
      const testObject = entityCollection.getOrCreateEntity("test");
      const model = new ModelGraphics();
      testObject.model = model;

      testObject.position = new ConstantProperty(
        new Cartesian3(5678, 1234, 1101112)
      );
      model.uri = new ConstantProperty("/path/to/incorrect/file");
      visualizer.update(time);

      const result = new BoundingSphere();
      let state = visualizer.getBoundingSphere(testObject, result);
      await pollToPromise(function () {
        scene.render();
        visualizer.update(time);
        state = visualizer.getBoundingSphere(testObject, result);
        return state !== BoundingSphereState.PENDING;
      });

      expect(state).toBe(BoundingSphereState.FAILED);
    });

    it("fails bounding sphere when sampleTerrainMostDetailed fails", async function () {
      // Setup a position for the model.
      const heightOffset = 1000.0;
      const position = Cartesian3.fromDegrees(
        149.515332,
        -34.984799,
        heightOffset
      );

      // Setup a spy so we can track how often sampleTerrain is called.
      const sampleTerrainSpy = spyOn(
        ModelVisualizer,
        "_sampleTerrainMostDetailed"
      ).and.callFake(() => {
        return Promise.reject(404);
      });

      // Initialize the Entity and the ModelGraphics.
      const time = JulianDate.now();
      const testObject = entityCollection.getOrCreateEntity("test");
      const model = new ModelGraphics({
        heightReference: HeightReference.RELATIVE_TO_GROUND,
      });
      testObject.model = model;
      testObject.position = new ConstantProperty(position);
      model.uri = new ConstantProperty(boxUrl);

      visualizer.update(time);

      // Assign a tiled terrain provider to the globe.
      const globe = scene.globe;
      globe.terrainProvider = await createWorldTerrainAsync();

      // Request the bounding sphere once.
      const result = new BoundingSphere();
      let state;

      // Repeatedly request the bounding sphere until it's ready.
      return pollToPromise(function () {
        scene.render();
        visualizer.update(time);
        state = visualizer.getBoundingSphere(testObject, result);
        return state !== BoundingSphereState.PENDING;
      }).then(() => {
        expect(state).toBe(BoundingSphereState.FAILED);

        // Ensure that flags and results computed for this model are reset.
        const modelData = visualizer._modelHash[testObject.id];
        expect(modelData.sampleTerrainFailed).toBe(false);

        // Ensure that we only sample the terrain once from the visualizer.
        expect(sampleTerrainSpy).toHaveBeenCalledTimes(1);
      });
    });

    it("compute bounding sphere throws without entity", function () {
      const result = new BoundingSphere();
      expect(function () {
        visualizer.getBoundingSphere(undefined, result);
      }).toThrowDeveloperError();
    });

    it("compute bounding sphere throws without result", function () {
      const testObject = entityCollection.getOrCreateEntity("test");
      expect(function () {
        visualizer.getBoundingSphere(testObject, undefined);
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
