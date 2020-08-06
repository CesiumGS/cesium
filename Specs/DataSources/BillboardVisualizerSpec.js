import { BoundingRectangle } from "../../Source/Cesium.js";
import { BoundingSphere } from "../../Source/Cesium.js";
import { Cartesian2 } from "../../Source/Cesium.js";
import { Cartesian3 } from "../../Source/Cesium.js";
import { Color } from "../../Source/Cesium.js";
import { defined } from "../../Source/Cesium.js";
import { DistanceDisplayCondition } from "../../Source/Cesium.js";
import { JulianDate } from "../../Source/Cesium.js";
import { NearFarScalar } from "../../Source/Cesium.js";
import { BillboardGraphics } from "../../Source/Cesium.js";
import { BillboardVisualizer } from "../../Source/Cesium.js";
import { BoundingSphereState } from "../../Source/Cesium.js";
import { ConstantProperty } from "../../Source/Cesium.js";
import { EntityCluster } from "../../Source/Cesium.js";
import { EntityCollection } from "../../Source/Cesium.js";
import { HeightReference } from "../../Source/Cesium.js";
import { HorizontalOrigin } from "../../Source/Cesium.js";
import { VerticalOrigin } from "../../Source/Cesium.js";
import createGlobe from "../createGlobe.js";
import createScene from "../createScene.js";
import pollToPromise from "../pollToPromise.js";

describe(
  "DataSources/BillboardVisualizer",
  function () {
    var scene;
    var entityCluster;
    var visualizer;

    beforeAll(function () {
      scene = createScene();
      scene.globe = createGlobe();
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

    it("constructor throws if no entityCluster is passed.", function () {
      expect(function () {
        return new BillboardVisualizer();
      }).toThrowDeveloperError();
    });

    it("update throws if no time specified.", function () {
      var entityCollection = new EntityCollection();
      visualizer = new BillboardVisualizer(entityCluster, entityCollection);
      expect(function () {
        visualizer.update();
      }).toThrowDeveloperError();
    });

    it("isDestroy returns false until destroyed.", function () {
      var entityCollection = new EntityCollection();
      visualizer = new BillboardVisualizer(entityCluster, entityCollection);
      expect(visualizer.isDestroyed()).toEqual(false);
      visualizer.destroy();
      expect(visualizer.isDestroyed()).toEqual(true);
      visualizer = undefined;
    });

    it("removes the listener from the entity collection when destroyed", function () {
      var entityCollection = new EntityCollection();
      var visualizer = new BillboardVisualizer(entityCluster, entityCollection);
      expect(entityCollection.collectionChanged.numberOfListeners).toEqual(1);
      visualizer.destroy();
      expect(entityCollection.collectionChanged.numberOfListeners).toEqual(0);
    });

    it("object with no billboard does not create a billboard.", function () {
      var entityCollection = new EntityCollection();
      visualizer = new BillboardVisualizer(entityCluster, entityCollection);

      var testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = new ConstantProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      visualizer.update(JulianDate.now());
      expect(entityCluster._billboardCollection).not.toBeDefined();
    });

    it("object with no position does not create a billboard.", function () {
      var entityCollection = new EntityCollection();
      visualizer = new BillboardVisualizer(entityCluster, entityCollection);

      var testObject = entityCollection.getOrCreateEntity("test");
      var billboard = (testObject.billboard = new BillboardGraphics());
      billboard.show = new ConstantProperty(true);
      billboard.image = new ConstantProperty("Data/Images/Blue.png");

      visualizer.update(JulianDate.now());
      expect(entityCluster._billboardCollection).not.toBeDefined();
    });

    it("object with no image does not create a billboard.", function () {
      var entityCollection = new EntityCollection();
      visualizer = new BillboardVisualizer(entityCluster, entityCollection);

      var testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = new ConstantProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      var billboard = (testObject.billboard = new BillboardGraphics());
      billboard.show = new ConstantProperty(true);

      visualizer.update(JulianDate.now());
      expect(entityCluster._billboardCollection).not.toBeDefined();
    });

    it("A BillboardGraphics causes a Billboard to be created and updated.", function () {
      var entityCollection = new EntityCollection();
      visualizer = new BillboardVisualizer(entityCluster, entityCollection);

      var testObject = entityCollection.getOrCreateEntity("test");

      var time = JulianDate.now();
      var billboard = (testObject.billboard = new BillboardGraphics());
      var bb;

      testObject.position = new ConstantProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      billboard.show = new ConstantProperty(true);
      billboard.color = new ConstantProperty(new Color(0.5, 0.5, 0.5, 0.5));
      billboard.image = new ConstantProperty("Data/Images/Blue.png");
      billboard.imageSubRegion = new ConstantProperty(
        new BoundingRectangle(0, 0, 1, 1)
      );
      billboard.eyeOffset = new ConstantProperty(new Cartesian3(1.0, 2.0, 3.0));
      billboard.scale = new ConstantProperty(12.5);
      billboard.rotation = new ConstantProperty(1.5);
      billboard.alignedAxis = new ConstantProperty(Cartesian3.UNIT_Z);
      billboard.heightReference = new ConstantProperty(
        HeightReference.CLAMP_TO_GROUND
      );
      billboard.horizontalOrigin = new ConstantProperty(HorizontalOrigin.RIGHT);
      billboard.verticalOrigin = new ConstantProperty(VerticalOrigin.TOP);
      billboard.pixelOffset = new ConstantProperty(new Cartesian2(3, 2));
      billboard.width = new ConstantProperty(15);
      billboard.height = new ConstantProperty(5);
      billboard.scaleByDistance = new ConstantProperty(new NearFarScalar());
      billboard.translucencyByDistance = new ConstantProperty(
        new NearFarScalar()
      );
      billboard.pixelOffsetScaleByDistance = new ConstantProperty(
        new NearFarScalar(1.0, 0.0, 3.0e9, 0.0)
      );
      billboard.sizeInMeters = new ConstantProperty(true);
      billboard.distanceDisplayCondition = new ConstantProperty(
        new DistanceDisplayCondition(10.0, 100.0)
      );
      billboard.disableDepthTestDistance = new ConstantProperty(10.0);

      visualizer.update(time);

      var billboardCollection = entityCluster._billboardCollection;
      expect(billboardCollection.length).toEqual(1);

      bb = billboardCollection.get(0);

      return pollToPromise(function () {
        visualizer.update(time);
        return bb.show; //true once the image is loaded.
      }).then(function () {
        expect(bb.position).toEqual(testObject.position.getValue(time));
        expect(bb.color).toEqual(testObject.billboard.color.getValue(time));
        expect(bb.eyeOffset).toEqual(
          testObject.billboard.eyeOffset.getValue(time)
        );
        expect(bb.scale).toEqual(testObject.billboard.scale.getValue(time));
        expect(bb.rotation).toEqual(
          testObject.billboard.rotation.getValue(time)
        );
        expect(bb.alignedAxis).toEqual(
          testObject.billboard.alignedAxis.getValue(time)
        );
        expect(bb.heightReference).toEqual(
          testObject.billboard.heightReference.getValue(time)
        );
        expect(bb.horizontalOrigin).toEqual(
          testObject.billboard.horizontalOrigin.getValue(time)
        );
        expect(bb.verticalOrigin).toEqual(
          testObject.billboard.verticalOrigin.getValue(time)
        );
        expect(bb.width).toEqual(testObject.billboard.width.getValue(time));
        expect(bb.height).toEqual(testObject.billboard.height.getValue(time));
        expect(bb.scaleByDistance).toEqual(
          testObject.billboard.scaleByDistance.getValue(time)
        );
        expect(bb.translucencyByDistance).toEqual(
          testObject.billboard.translucencyByDistance.getValue(time)
        );
        expect(bb.pixelOffsetScaleByDistance).toEqual(
          testObject.billboard.pixelOffsetScaleByDistance.getValue(time)
        );
        expect(bb.sizeInMeters).toEqual(
          testObject.billboard.sizeInMeters.getValue(time)
        );
        expect(bb.distanceDisplayCondition).toEqual(
          testObject.billboard.distanceDisplayCondition.getValue(time)
        );
        expect(bb.disableDepthTestDistance).toEqual(
          testObject.billboard.disableDepthTestDistance.getValue(time)
        );
        expect(bb._imageSubRegion).toEqual(
          testObject.billboard.imageSubRegion.getValue(time)
        );

        billboard.show = new ConstantProperty(false);

        return pollToPromise(function () {
          visualizer.update(time);
          return !bb.show;
        });
      });
    });

    it("Display billboard after toggling show", function () {
      var entityCollection = new EntityCollection();
      visualizer = new BillboardVisualizer(entityCluster, entityCollection);

      var testObject = entityCollection.getOrCreateEntity("test");

      var time = JulianDate.now();
      var billboard = (testObject.billboard = new BillboardGraphics());
      var bb;

      testObject.position = new ConstantProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      billboard.show = new ConstantProperty(true);
      billboard.color = new ConstantProperty(new Color(0.5, 0.5, 0.5, 0.5));
      billboard.image = new ConstantProperty("Data/Images/Blue.png");
      billboard.imageSubRegion = new ConstantProperty(
        new BoundingRectangle(0, 0, 1, 1)
      );
      billboard.eyeOffset = new ConstantProperty(new Cartesian3(1.0, 2.0, 3.0));
      billboard.scale = new ConstantProperty(12.5);
      billboard.rotation = new ConstantProperty(1.5);
      billboard.alignedAxis = new ConstantProperty(Cartesian3.UNIT_Z);
      billboard.heightReference = new ConstantProperty(
        HeightReference.CLAMP_TO_GROUND
      );
      billboard.horizontalOrigin = new ConstantProperty(HorizontalOrigin.RIGHT);
      billboard.verticalOrigin = new ConstantProperty(VerticalOrigin.TOP);
      billboard.pixelOffset = new ConstantProperty(new Cartesian2(3, 2));
      billboard.width = new ConstantProperty(15);
      billboard.height = new ConstantProperty(5);
      billboard.scaleByDistance = new ConstantProperty(new NearFarScalar());
      billboard.translucencyByDistance = new ConstantProperty(
        new NearFarScalar()
      );
      billboard.pixelOffsetScaleByDistance = new ConstantProperty(
        new NearFarScalar(1.0, 0.0, 3.0e9, 0.0)
      );
      billboard.sizeInMeters = new ConstantProperty(true);
      billboard.distanceDisplayCondition = new ConstantProperty(
        new DistanceDisplayCondition(10.0, 100.0)
      );
      billboard.disableDepthTestDistance = new ConstantProperty(10.0);

      visualizer.update(time);

      var billboardCollection = entityCluster._billboardCollection;
      expect(billboardCollection.length).toEqual(1);

      bb = billboardCollection.get(0);

      return pollToPromise(function () {
        visualizer.update(time);
        return bb.show; //true once the image is loaded.
      }).then(function () {
        billboard.show = new ConstantProperty(false);

        return pollToPromise(function () {
          visualizer.update(time);
          return !bb.show;
        }).then(function () {
          billboard.show = new ConstantProperty(true);

          return pollToPromise(function () {
            visualizer.update(time);
            return bb.show;
          }).then(function () {
            expect(bb.position).toEqual(testObject.position.getValue(time));
            expect(bb.color).toEqual(testObject.billboard.color.getValue(time));
            expect(bb.eyeOffset).toEqual(
              testObject.billboard.eyeOffset.getValue(time)
            );
            expect(bb.scale).toEqual(testObject.billboard.scale.getValue(time));
            expect(bb.rotation).toEqual(
              testObject.billboard.rotation.getValue(time)
            );
            expect(bb.alignedAxis).toEqual(
              testObject.billboard.alignedAxis.getValue(time)
            );
            expect(bb.heightReference).toEqual(
              testObject.billboard.heightReference.getValue(time)
            );
            expect(bb.horizontalOrigin).toEqual(
              testObject.billboard.horizontalOrigin.getValue(time)
            );
            expect(bb.verticalOrigin).toEqual(
              testObject.billboard.verticalOrigin.getValue(time)
            );
            expect(bb.width).toEqual(testObject.billboard.width.getValue(time));
            expect(bb.height).toEqual(
              testObject.billboard.height.getValue(time)
            );
            expect(bb.scaleByDistance).toEqual(
              testObject.billboard.scaleByDistance.getValue(time)
            );
            expect(bb.translucencyByDistance).toEqual(
              testObject.billboard.translucencyByDistance.getValue(time)
            );
            expect(bb.pixelOffsetScaleByDistance).toEqual(
              testObject.billboard.pixelOffsetScaleByDistance.getValue(time)
            );
            expect(bb.sizeInMeters).toEqual(
              testObject.billboard.sizeInMeters.getValue(time)
            );
            expect(bb.distanceDisplayCondition).toEqual(
              testObject.billboard.distanceDisplayCondition.getValue(time)
            );
            expect(bb.disableDepthTestDistance).toEqual(
              testObject.billboard.disableDepthTestDistance.getValue(time)
            );
            expect(bb.image).toBeDefined();
            expect(bb._imageSubRegion).toEqual(
              testObject.billboard.imageSubRegion.getValue(time)
            );
          });
        });
      });
    });

    it("Reuses primitives when hiding one and showing another", function () {
      var time = JulianDate.now();
      var entityCollection = new EntityCollection();
      visualizer = new BillboardVisualizer(entityCluster, entityCollection);

      var testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = new ConstantProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      testObject.billboard = new BillboardGraphics();
      testObject.billboard.image = new ConstantProperty("Data/Images/Blue.png");
      testObject.billboard.show = new ConstantProperty(true);

      visualizer.update(time);

      var billboardCollection = entityCluster._billboardCollection;
      expect(billboardCollection.length).toEqual(1);

      testObject.billboard.show = new ConstantProperty(false);

      visualizer.update(time);

      expect(billboardCollection.length).toEqual(1);

      var testObject2 = entityCollection.getOrCreateEntity("test2");
      testObject2.position = new ConstantProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      testObject2.billboard = new BillboardGraphics();
      testObject2.billboard.image = new ConstantProperty(
        "Data/Images/Blue.png"
      );
      testObject2.billboard.show = new ConstantProperty(true);

      visualizer.update(time);
      expect(billboardCollection.length).toEqual(1);
    });

    it("clear hides billboards.", function () {
      var entityCollection = new EntityCollection();
      visualizer = new BillboardVisualizer(entityCluster, entityCollection);

      var testObject = entityCollection.getOrCreateEntity("test");

      var time = JulianDate.now();
      var billboard = (testObject.billboard = new BillboardGraphics());

      testObject.position = new ConstantProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      billboard.show = new ConstantProperty(true);
      billboard.image = new ConstantProperty("Data/Images/Blue.png");
      visualizer.update(time);

      var billboardCollection = entityCluster._billboardCollection;
      expect(billboardCollection.length).toEqual(1);
      var bb = billboardCollection.get(0);

      return pollToPromise(function () {
        visualizer.update(time);
        return bb.show;
      }).then(function () {
        //Clearing won't actually remove the billboard because of the
        //internal cache used by the visualizer, instead it just hides it.
        entityCollection.removeAll();
        expect(bb.show).toEqual(false);
        expect(bb.id).toBeUndefined();
      });
    });

    it("Visualizer sets entity property.", function () {
      var entityCollection = new EntityCollection();
      visualizer = new BillboardVisualizer(entityCluster, entityCollection);

      var testObject = entityCollection.getOrCreateEntity("test");
      var time = JulianDate.now();
      var billboard = (testObject.billboard = new BillboardGraphics());

      testObject.position = new ConstantProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      billboard.show = new ConstantProperty(true);
      billboard.image = new ConstantProperty("Data/Images/Blue.png");
      visualizer.update(time);

      var billboardCollection = entityCluster._billboardCollection;
      expect(billboardCollection.length).toEqual(1);
      var bb = billboardCollection.get(0);
      expect(bb.id).toEqual(testObject);
    });

    it("Computes bounding sphere.", function () {
      var entityCollection = new EntityCollection();
      visualizer = new BillboardVisualizer(entityCluster, entityCollection);

      var testObject = entityCollection.getOrCreateEntity("test");
      var time = JulianDate.now();
      var billboard = (testObject.billboard = new BillboardGraphics());

      testObject.position = new ConstantProperty(
        new Cartesian3(1234, 5678, 9101112)
      );
      billboard.show = new ConstantProperty(true);
      billboard.image = new ConstantProperty("Data/Images/Blue.png");
      visualizer.update(time);

      var result = new BoundingSphere();
      var state = visualizer.getBoundingSphere(testObject, result);

      expect(state).toBe(BoundingSphereState.DONE);
      expect(result.center).toEqual(testObject.position.getValue());
      expect(result.radius).toEqual(0);
    });

    it("Fails bounding sphere for entity without billboard.", function () {
      var entityCollection = new EntityCollection();
      var testObject = entityCollection.getOrCreateEntity("test");
      visualizer = new BillboardVisualizer(entityCluster, entityCollection);
      visualizer.update(JulianDate.now());
      var result = new BoundingSphere();
      var state = visualizer.getBoundingSphere(testObject, result);
      expect(state).toBe(BoundingSphereState.FAILED);
    });

    it("Compute bounding sphere throws without entity.", function () {
      var entityCollection = new EntityCollection();
      visualizer = new BillboardVisualizer(entityCluster, entityCollection);
      var result = new BoundingSphere();
      expect(function () {
        visualizer.getBoundingSphere(undefined, result);
      }).toThrowDeveloperError();
    });

    it("Compute bounding sphere throws without result.", function () {
      var entityCollection = new EntityCollection();
      var testObject = entityCollection.getOrCreateEntity("test");
      visualizer = new BillboardVisualizer(entityCluster, entityCollection);
      expect(function () {
        visualizer.getBoundingSphere(testObject, undefined);
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
