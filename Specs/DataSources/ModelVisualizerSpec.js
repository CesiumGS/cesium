import { BoundingSphere } from "../../Source/Cesium.js";
import { Cartesian2 } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { defined } from "../../Source/Cesium.js";
import { DistanceDisplayCondition } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { Matrix4 } from "../../Source/Cesium.js";
import { Quaternion } from "../../Source/Cesium.js";
import { Resource } from "../../Source/Cesium.js";
import { Transforms } from "../../Source/Cesium.js";
import { BoundingSphereState } from "../../Source/Cesium.js";
import { ConstantPositionProperty } from "../../Source/Cesium.js";
import { ConstantProperty } from "../../Source/Cesium.js";
import { EntityCollection } from "../../Source/Cesium.js";
import { ModelGraphics } from "../../Source/Cesium.js";
import { ModelVisualizer } from "../../Source/Cesium.js";
import { NodeTransformationProperty } from "../../Source/Cesium.js";
import { ClippingPlane } from "../../Source/Cesium.js";
import { ClippingPlaneCollection } from "../../Source/Cesium.js";
import { Globe } from "../../Source/Cesium.js";
import createScene from "../createScene.js";
import pollToPromise from "../pollToPromise.js";

describe(
  "DataSources/ModelVisualizer",
  function () {
    var boxUrl = "./Data/Models/Box/CesiumBoxTest.gltf";
    var boxArticulationsUrl =
      "./Data/Models/Box-Articulations/Box-Articulations.gltf";

    var scene;
    var visualizer;

    beforeAll(function () {
      scene = createScene();
      scene.globe = new Globe();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      if (defined(visualizer)) {
        visualizer = visualizer.destroy();
      }
    });

    it("constructor throws if no scene is passed.", function () {
      expect(function () {
        return new ModelVisualizer();
      }).toThrowDeveloperError();
    });

    it("update throws if no time specified.", function () {
      var entityCollection = new EntityCollection();
      visualizer = new ModelVisualizer(scene, entityCollection);
      expect(function () {
        visualizer.update();
      }).toThrowDeveloperError();
    });

    it("isDestroy returns false until destroyed.", function () {
      var entityCollection = new EntityCollection();
      visualizer = new ModelVisualizer(scene, entityCollection);
      expect(visualizer.isDestroyed()).toEqual(false);
      visualizer.destroy();
      expect(visualizer.isDestroyed()).toEqual(true);
      visualizer = undefined;
    });

    it("removes the listener from the entity collection when destroyed", function () {
      var entityCollection = new EntityCollection();
      visualizer = new ModelVisualizer(scene, entityCollection);
      expect(entityCollection.collectionChanged.numberOfListeners).toEqual(1);
      visualizer.destroy();
      expect(entityCollection.collectionChanged.numberOfListeners).toEqual(0);
      visualizer = undefined;
    });

    it("object with no model does not create one.", function () {
      var entityCollection = new EntityCollection();
      visualizer = new ModelVisualizer(scene, entityCollection);

      var testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = new ConstantProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      visualizer.update(JulianDate.now());
      expect(scene.primitives.length).toEqual(0);
    });

    it("object with no position does not create a model.", function () {
      var entityCollection = new EntityCollection();
      visualizer = new ModelVisualizer(scene, entityCollection);

      var testObject = entityCollection.getOrCreateEntity("test");
      var model = (testObject.model = new ModelGraphics());
      model.uri = new ConstantProperty(boxUrl);

      visualizer.update(JulianDate.now());
      expect(scene.primitives.length).toEqual(0);
    });

    it("A ModelGraphics causes a primitive to be created and updated.", function () {
      var time = JulianDate.now();
      var entityCollection = new EntityCollection();
      visualizer = new ModelVisualizer(scene, entityCollection);

      var model = new ModelGraphics();
      model.show = new ConstantProperty(true);
      model.scale = new ConstantProperty(2);
      model.minimumPixelSize = new ConstantProperty(24.0);
      model.uri = new ConstantProperty(boxUrl);
      model.distanceDisplayCondition = new ConstantProperty(
        new DistanceDisplayCondition(10.0, 100.0)
      );

      var translation = new Cartesian3(1.0, 2.0, 3.0);
      var rotation = new Quaternion(0.0, 0.707, 0.0, 0.707);
      var scale = new Cartesian3(2.0, 2.0, 2.0);
      var nodeTransforms = {
        Mesh: new NodeTransformationProperty({
          translation: new ConstantProperty(translation),
          rotation: new ConstantProperty(rotation),
          scale: new ConstantProperty(scale),
        }),
      };
      model.nodeTransformations = nodeTransforms;

      var clippingPlanes = new ClippingPlaneCollection({
        planes: [new ClippingPlane(Cartesian3.UNIT_X, 0.0)],
      });
      model.clippingPlanes = new ConstantProperty(clippingPlanes);

      model.imageBasedLightingFactor = new ConstantProperty(
        new Cartesian2(0.5, 0.5)
      );
      model.lightColor = new ConstantProperty(new Color(1.0, 1.0, 0.0, 1.0));

      var testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = new ConstantPositionProperty(
        Cartesian3.fromDegrees(1, 2, 3)
      );
      testObject.model = model;

      visualizer.update(time);

      expect(scene.primitives.length).toEqual(1);

      var primitive = scene.primitives.get(0);
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
      expect(primitive.imageBasedLightingFactor).toEqual(
        new Cartesian2(0.5, 0.5)
      );
      expect(primitive.lightColor).toEqual(new Color(1.0, 1.0, 0.0, 1.0));

      // wait till the model is loaded before we can check node transformations
      return pollToPromise(function () {
        scene.render();
        return primitive.ready;
      }).then(function () {
        visualizer.update(time);

        var node = primitive.getNode("Mesh");
        expect(node).toBeDefined();

        var transformationMatrix = Matrix4.fromTranslationQuaternionRotationScale(
          translation,
          rotation,
          scale
        );
        expect(node.matrix).toEqual(transformationMatrix);
      });
    });

    it("can apply model articulations", function () {
      var time = JulianDate.now();
      var entityCollection = new EntityCollection();
      visualizer = new ModelVisualizer(scene, entityCollection);

      var model = new ModelGraphics();
      model.uri = new ConstantProperty(boxArticulationsUrl);

      var articulations = {
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

      var testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = new ConstantPositionProperty(
        Cartesian3.fromDegrees(1, 2, 3)
      );
      testObject.model = model;

      visualizer.update(time);

      expect(scene.primitives.length).toEqual(1);

      var primitive = scene.primitives.get(0);

      // wait till the model is loaded before we can check articulations
      return pollToPromise(function () {
        scene.render();
        return primitive.ready;
      }).then(function () {
        visualizer.update(time);

        var node = primitive.getNode("Root");
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
      });
    });

    it("A ModelGraphics with a Resource causes a primitive to be created.", function () {
      var time = JulianDate.now();
      var entityCollection = new EntityCollection();
      visualizer = new ModelVisualizer(scene, entityCollection);

      var model = new ModelGraphics();
      model.show = new ConstantProperty(true);
      model.uri = new ConstantProperty(
        new Resource({
          url: boxUrl,
        })
      );

      var testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = new ConstantPositionProperty(
        Cartesian3.fromDegrees(1, 2, 3)
      );
      testObject.model = model;

      visualizer.update(time);

      expect(scene.primitives.length).toEqual(1);

      var primitive = scene.primitives.get(0);

      // wait till the model is loaded before we can check node transformations
      return pollToPromise(function () {
        scene.render();
        return primitive.ready;
      }).then(function () {
        visualizer.update(time);

        var node = primitive.getNode("Mesh");
        expect(node).toBeDefined();
      });
    });

    it("removing removes primitives.", function () {
      var entityCollection = new EntityCollection();
      visualizer = new ModelVisualizer(scene, entityCollection);

      var model = new ModelGraphics();
      model.uri = new ConstantProperty(boxUrl);

      var time = JulianDate.now();
      var testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = new ConstantProperty(
        new Cartesian3(5678, 1234, 1101112)
      );
      testObject.model = model;
      visualizer.update(time);

      expect(scene.primitives.length).toEqual(1);
      visualizer.update(time);
      entityCollection.removeAll();
      visualizer.update(time);
      expect(scene.primitives.length).toEqual(0);
    });

    it("Visualizer sets id property.", function () {
      var entityCollection = new EntityCollection();
      visualizer = new ModelVisualizer(scene, entityCollection);

      var time = JulianDate.now();
      var testObject = entityCollection.getOrCreateEntity("test");
      var model = new ModelGraphics();
      testObject.model = model;

      testObject.position = new ConstantProperty(
        new Cartesian3(5678, 1234, 1101112)
      );
      model.uri = new ConstantProperty(boxUrl);
      visualizer.update(time);

      var modelPrimitive = scene.primitives.get(0);
      expect(modelPrimitive.id).toEqual(testObject);
    });

    it("Computes bounding sphere.", function () {
      var entityCollection = new EntityCollection();
      visualizer = new ModelVisualizer(scene, entityCollection);

      var time = JulianDate.now();
      var testObject = entityCollection.getOrCreateEntity("test");
      var model = new ModelGraphics();
      testObject.model = model;

      testObject.position = new ConstantProperty(
        new Cartesian3(5678, 1234, 1101112)
      );
      model.uri = new ConstantProperty(boxUrl);
      visualizer.update(time);

      var modelPrimitive = scene.primitives.get(0);
      var result = new BoundingSphere();
      var state = visualizer.getBoundingSphere(testObject, result);
      expect(state).toBe(BoundingSphereState.PENDING);

      return pollToPromise(function () {
        scene.render();
        state = visualizer.getBoundingSphere(testObject, result);
        return state !== BoundingSphereState.PENDING;
      }).then(function () {
        expect(state).toBe(BoundingSphereState.DONE);
        var expected = BoundingSphere.transform(
          modelPrimitive.boundingSphere,
          modelPrimitive.modelMatrix,
          new BoundingSphere()
        );
        expect(result).toEqual(expected);
      });
    });

    it("Fails bounding sphere for entity without billboard.", function () {
      var entityCollection = new EntityCollection();
      var testObject = entityCollection.getOrCreateEntity("test");
      visualizer = new ModelVisualizer(scene, entityCollection);
      visualizer.update(JulianDate.now());
      var result = new BoundingSphere();
      var state = visualizer.getBoundingSphere(testObject, result);
      expect(state).toBe(BoundingSphereState.FAILED);
    });

    it("Fails bounding sphere when model fails to load.", function () {
      var entityCollection = new EntityCollection();
      visualizer = new ModelVisualizer(scene, entityCollection);

      var time = JulianDate.now();
      var testObject = entityCollection.getOrCreateEntity("test");
      var model = new ModelGraphics();
      testObject.model = model;

      testObject.position = new ConstantProperty(
        new Cartesian3(5678, 1234, 1101112)
      );
      model.uri = new ConstantProperty("/path/to/incorrect/file");
      visualizer.update(time);

      var result = new BoundingSphere();
      var state = visualizer.getBoundingSphere(testObject, result);
      expect(state).toBe(BoundingSphereState.PENDING);
      return pollToPromise(function () {
        scene.render();
        state = visualizer.getBoundingSphere(testObject, result);
        return state !== BoundingSphereState.PENDING;
      }).then(function () {
        expect(state).toBe(BoundingSphereState.FAILED);
      });
    });

    it("Compute bounding sphere throws without entity.", function () {
      var entityCollection = new EntityCollection();
      visualizer = new ModelVisualizer(scene, entityCollection);
      var result = new BoundingSphere();
      expect(function () {
        visualizer.getBoundingSphere(undefined, result);
      }).toThrowDeveloperError();
    });

    it("Compute bounding sphere throws without result.", function () {
      var entityCollection = new EntityCollection();
      var testObject = entityCollection.getOrCreateEntity("test");
      visualizer = new ModelVisualizer(scene, entityCollection);
      expect(function () {
        visualizer.getBoundingSphere(testObject, undefined);
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
