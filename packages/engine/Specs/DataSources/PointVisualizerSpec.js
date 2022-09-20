import {
  BoundingSphere,
  Cartesian3,
  Color,
  defined,
  DistanceDisplayCondition,
  Ellipsoid,
  Event,
  JulianDate,
  NearFarScalar,
  BoundingSphereState,
  ConstantProperty,
  EntityCluster,
  EntityCollection,
  PointGraphics,
  PointVisualizer,
  BillboardCollection,
  HeightReference,
  PointPrimitiveCollection,
} from "../../index.js";;

import createScene from "../../../../Specs/createScene.js";;

describe(
  "DataSources/PointVisualizer",
  function () {
    let scene;
    let entityCluster;
    let visualizer;

    beforeAll(function () {
      scene = createScene();
      scene.globe = {
        ellipsoid: Ellipsoid.WGS84,
        _surface: {},
        imageryLayersUpdatedEvent: new Event(),
        terrainProviderChanged: new Event(),
      };

      scene.globe.getHeight = function () {
        return 0.0;
      };

      scene.globe.destroy = function () {};

      scene.globe._surface.updateHeight = function () {};

      Object.defineProperties(scene.globe, {
        terrainProvider: {
          set: function (value) {
            this.terrainProviderChanged.raiseEvent(value);
          },
        },
      });
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    beforeEach(function () {
      entityCluster = new EntityCluster();
      entityCluster._initialize(scene);
    });

    afterEach(function () {
      if (defined(visualizer)) {
        visualizer = visualizer.destroy();
      }
      entityCluster.destroy();
    });

    it("constructor throws if no scene is passed.", function () {
      const entityCollection = new EntityCollection();
      expect(function () {
        return new PointVisualizer(undefined, entityCollection);
      }).toThrowDeveloperError();
    });

    it("constructor throws if no entityCollection is passed.", function () {
      expect(function () {
        return new PointVisualizer(entityCluster, undefined);
      }).toThrowDeveloperError();
    });

    it("update throws if no time specified.", function () {
      const entityCollection = new EntityCollection();
      visualizer = new PointVisualizer(entityCluster, entityCollection);
      expect(function () {
        visualizer.update();
      }).toThrowDeveloperError();
    });

    it("isDestroy returns false until destroyed.", function () {
      const entityCollection = new EntityCollection();
      visualizer = new PointVisualizer(entityCluster, entityCollection);
      expect(visualizer.isDestroyed()).toEqual(false);
      visualizer.destroy();
      expect(visualizer.isDestroyed()).toEqual(true);
      visualizer = undefined;
    });

    it("removes the listener from the entity collection when destroyed", function () {
      const entityCollection = new EntityCollection();
      visualizer = new PointVisualizer(entityCluster, entityCollection);
      expect(entityCollection.collectionChanged.numberOfListeners).toEqual(1);
      visualizer.destroy();
      expect(entityCollection.collectionChanged.numberOfListeners).toEqual(0);
      visualizer = undefined;
    });

    it("object with no point does not create a pointPrimitive.", function () {
      const entityCollection = new EntityCollection();
      visualizer = new PointVisualizer(entityCluster, entityCollection);

      const testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = new ConstantProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      visualizer.update(JulianDate.now());
      expect(scene.primitives.length).toEqual(0);
    });

    it("object with no position does not create a pointPrimitive.", function () {
      const entityCollection = new EntityCollection();
      visualizer = new PointVisualizer(entityCluster, entityCollection);

      const testObject = entityCollection.getOrCreateEntity("test");
      const point = (testObject.point = new PointGraphics());
      point.show = new ConstantProperty(true);

      visualizer.update(JulianDate.now());
      expect(scene.primitives.length).toEqual(0);
    });

    it("A PointGraphics causes a PointPrimitive to be created and updated.", function () {
      const time = JulianDate.now();

      const entityCollection = new EntityCollection();
      visualizer = new PointVisualizer(entityCluster, entityCollection);

      const entity = entityCollection.add({
        position: new Cartesian3(1234, 5678, 9101112),
        point: {
          show: true,
          color: new Color(0.1, 0.2, 0.3, 0.4),
          outlineColor: new Color(0.5, 0.6, 0.7, 0.8),
          outlineWidth: 9,
          pixelSize: 10,
          scaleByDistance: new NearFarScalar(11, 12, 13, 14),
          distanceDisplayCondition: new DistanceDisplayCondition(10.0, 100.0),
          disableDepthTestDistance: 10.0,
        },
      });
      const point = entity.point;

      visualizer.update(time);

      const pointPrimitiveCollection = entityCluster._pointCollection;
      expect(pointPrimitiveCollection).toBeInstanceOf(PointPrimitiveCollection);
      expect(pointPrimitiveCollection.length).toEqual(1);
      const pointPrimitive = pointPrimitiveCollection.get(0);

      expect(pointPrimitive.show).toEqual(point.show.getValue(time));
      expect(pointPrimitive.position).toEqual(entity.position.getValue(time));
      expect(pointPrimitive.scaleByDistance).toEqual(
        point.scaleByDistance.getValue(time)
      );
      expect(pointPrimitive.color).toEqual(point.color.getValue(time));
      expect(pointPrimitive.outlineColor).toEqual(
        point.outlineColor.getValue(time)
      );
      expect(pointPrimitive.outlineWidth).toEqual(
        point.outlineWidth.getValue(time)
      );
      expect(pointPrimitive.distanceDisplayCondition).toEqual(
        point.distanceDisplayCondition.getValue(time)
      );
      expect(pointPrimitive.disableDepthTestDistance).toEqual(
        point.disableDepthTestDistance.getValue(time)
      );

      point.color = new Color(0.15, 0.16, 0.17, 0.18);
      point.outlineColor = new Color(0.19, 0.2, 0.21, 0.22);
      point.pixelSize = 23;
      point.outlineWidth = 24;
      point.scaleByDistance = new NearFarScalar(25, 26, 27, 28);
      point.distanceDisplayCondition = new DistanceDisplayCondition(
        1000.0,
        1000000.0
      );
      point.disableDepthTestDistance = 20.0;

      visualizer.update(time);

      expect(pointPrimitive.show).toEqual(point.show.getValue(time));
      expect(pointPrimitive.position).toEqual(entity.position.getValue(time));
      expect(pointPrimitive.scaleByDistance).toEqual(
        point.scaleByDistance.getValue(time)
      );
      expect(pointPrimitive.color).toEqual(point.color.getValue(time));
      expect(pointPrimitive.outlineColor).toEqual(
        point.outlineColor.getValue(time)
      );
      expect(pointPrimitive.outlineWidth).toEqual(
        point.outlineWidth.getValue(time)
      );
      expect(pointPrimitive.distanceDisplayCondition).toEqual(
        point.distanceDisplayCondition.getValue(time)
      );
      expect(pointPrimitive.disableDepthTestDistance).toEqual(
        point.disableDepthTestDistance.getValue(time)
      );

      point.show = false;
      visualizer.update(time);
      expect(pointPrimitive.show).toEqual(point.show.getValue(time));
    });

    it("A PointGraphics on terrain causes a Billboard to be created and updated.", function () {
      const time = JulianDate.now();

      const entityCollection = new EntityCollection();
      visualizer = new PointVisualizer(entityCluster, entityCollection);

      const entity = entityCollection.add({
        position: new Cartesian3(1234, 5678, 9101112),
        point: {
          show: true,
          color: new Color(0.1, 0.2, 0.3, 0.4),
          outlineColor: new Color(0.5, 0.6, 0.7, 0.8),
          outlineWidth: 9,
          pixelSize: 10,
          scaleByDistance: new NearFarScalar(11, 12, 13, 14),
          distanceDisplayCondition: new DistanceDisplayCondition(10.0, 100.0),
          disableDepthTestDistance: 10.0,
          heightReference: HeightReference.CLAMP_TO_GROUND,
        },
      });
      const point = entity.point;

      visualizer.update(time);

      const billboardCollection = entityCluster._billboardCollection;
      expect(billboardCollection).toBeInstanceOf(BillboardCollection);
      expect(billboardCollection.length).toEqual(1);
      const billboard = billboardCollection.get(0);

      expect(billboard.show).toEqual(point.show.getValue(time));
      expect(billboard.position).toEqual(entity.position.getValue(time));
      expect(billboard.scaleByDistance).toEqual(
        point.scaleByDistance.getValue(time)
      );
      expect(billboard.distanceDisplayCondition).toEqual(
        point.distanceDisplayCondition.getValue(time)
      );
      expect(billboard.disableDepthTestDistance).toEqual(
        point.disableDepthTestDistance.getValue(time)
      );
      //expect(billboard.color).toEqual(point.color.getValue(time));
      //expect(billboard.outlineColor).toEqual(point.outlineColor.getValue(time));
      //expect(billboard.outlineWidth).toEqual(point.outlineWidth.getValue(time));

      point.color = new Color(0.15, 0.16, 0.17, 0.18);
      point.outlineColor = new Color(0.19, 0.2, 0.21, 0.22);
      point.pixelSize = 23;
      point.outlineWidth = 24;
      point.scaleByDistance = new NearFarScalar(25, 26, 27, 28);
      point.distanceDisplayCondition = new DistanceDisplayCondition(
        1000.0,
        1000000.0
      );
      point.disableDepthTestDistance = 20.0;

      visualizer.update(time);

      expect(billboard.show).toEqual(point.show.getValue(time));
      expect(billboard.position).toEqual(entity.position.getValue(time));
      expect(billboard.scaleByDistance).toEqual(
        point.scaleByDistance.getValue(time)
      );
      expect(billboard.distanceDisplayCondition).toEqual(
        point.distanceDisplayCondition.getValue(time)
      );
      expect(billboard.disableDepthTestDistance).toEqual(
        point.disableDepthTestDistance.getValue(time)
      );
      //expect(billboard.color).toEqual(point.color.getValue(time));
      //expect(billboard.outlineColor).toEqual(point.outlineColor.getValue(time));
      //expect(billboard.outlineWidth).toEqual(point.outlineWidth.getValue(time));

      point.show = false;
      visualizer.update(time);
      expect(billboard.show).toEqual(point.show.getValue(time));
    });

    it("Reuses primitives when hiding one and showing another", function () {
      const time = JulianDate.now();
      const entityCollection = new EntityCollection();
      visualizer = new PointVisualizer(entityCluster, entityCollection);

      const testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = new ConstantProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      testObject.point = new PointGraphics();
      testObject.point.show = new ConstantProperty(true);

      visualizer.update(time);

      const pointPrimitiveCollection = entityCluster._pointCollection;
      expect(pointPrimitiveCollection.length).toEqual(1);

      testObject.point.show = new ConstantProperty(false);

      visualizer.update(time);

      expect(pointPrimitiveCollection.length).toEqual(1);

      const testObject2 = entityCollection.getOrCreateEntity("test2");
      testObject2.position = new ConstantProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      testObject2.point = new PointGraphics();
      testObject2.point.show = new ConstantProperty(true);

      visualizer.update(time);
      expect(pointPrimitiveCollection.length).toEqual(1);
    });

    it("clear hides pointPrimitives.", function () {
      const entityCollection = new EntityCollection();
      visualizer = new PointVisualizer(entityCluster, entityCollection);
      const testObject = entityCollection.getOrCreateEntity("test");
      const time = JulianDate.now();

      testObject.position = new ConstantProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      const point = (testObject.point = new PointGraphics());
      point.show = new ConstantProperty(true);
      visualizer.update(time);

      const pointPrimitiveCollection = entityCluster._pointCollection;
      expect(pointPrimitiveCollection.length).toEqual(1);
      const bb = pointPrimitiveCollection.get(0);

      visualizer.update(time);
      //Clearing won't actually remove the pointPrimitive because of the
      //internal cache used by the visualizer, instead it just hides it.
      entityCollection.removeAll();
      expect(bb.show).toEqual(false);
      expect(bb.id).toBeUndefined();
    });

    it("Visualizer sets entity property.", function () {
      const entityCollection = new EntityCollection();
      visualizer = new PointVisualizer(entityCluster, entityCollection);

      const testObject = entityCollection.getOrCreateEntity("test");
      const time = JulianDate.now();
      const point = (testObject.point = new PointGraphics());

      testObject.position = new ConstantProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      point.show = new ConstantProperty(true);

      visualizer.update(time);

      const pointPrimitiveCollection = entityCluster._pointCollection;
      expect(pointPrimitiveCollection.length).toEqual(1);
      const bb = pointPrimitiveCollection.get(0);
      expect(bb.id).toEqual(testObject);
    });

    it("Computes bounding sphere.", function () {
      const entityCollection = new EntityCollection();
      visualizer = new PointVisualizer(entityCluster, entityCollection);

      const testObject = entityCollection.getOrCreateEntity("test");
      const time = JulianDate.now();
      const point = (testObject.point = new PointGraphics());

      testObject.position = new ConstantProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      point.show = new ConstantProperty(true);

      visualizer.update(time);

      const result = new BoundingSphere();
      const state = visualizer.getBoundingSphere(testObject, result);

      expect(state).toBe(BoundingSphereState.DONE);
      expect(result.center).toEqual(testObject.position.getValue());
      expect(result.radius).toEqual(0);
    });

    it("Fails bounding sphere for entity without pointPrimitive.", function () {
      const entityCollection = new EntityCollection();
      const testObject = entityCollection.getOrCreateEntity("test");
      visualizer = new PointVisualizer(entityCluster, entityCollection);
      visualizer.update(JulianDate.now());
      const result = new BoundingSphere();
      const state = visualizer.getBoundingSphere(testObject, result);
      expect(state).toBe(BoundingSphereState.FAILED);
    });

    it("Compute bounding sphere throws without entity.", function () {
      const entityCollection = new EntityCollection();
      visualizer = new PointVisualizer(entityCluster, entityCollection);
      const result = new BoundingSphere();
      expect(function () {
        visualizer.getBoundingSphere(undefined, result);
      }).toThrowDeveloperError();
    });

    it("Compute bounding sphere throws without result.", function () {
      const entityCollection = new EntityCollection();
      const testObject = entityCollection.getOrCreateEntity("test");
      visualizer = new PointVisualizer(entityCluster, entityCollection);
      expect(function () {
        visualizer.getBoundingSphere(testObject, undefined);
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
