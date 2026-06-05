import {
  Cartesian3,
  Color,
  CallbackProperty,
  CzmlDataSource,
  DistanceDisplayCondition,
  JulianDate,
  Math as CesiumMath,
  Matrix3,
  Matrix4,
  Quaternion,
  ReferenceFrame,
  TimeInterval,
  TimeIntervalCollection,
  CompositePositionProperty,
  CompositeMaterialProperty,
  ConstantPositionProperty,
  ConstantProperty,
  ColorMaterialProperty,
  EntityCollection,
  PathMode,
  PathGraphics,
  PathVisualizer,
  PolylineGlowMaterialProperty,
  PolylineOutlineMaterialProperty,
  PointGraphics,
  ReferenceProperty,
  SampledProperty,
  SampledPositionProperty,
  CallbackPositionProperty,
  LinearSpline,
  ScaledPositionProperty,
  Transforms,
  TimeIntervalCollectionPositionProperty,
  SceneMode,
} from "../../index.js";

import createScene from "../../../../Specs/createScene.js";

describe(
  "DataSources/PathVisualizer",
  function () {
    let scene;
    let visualizer;

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      visualizer = visualizer && visualizer.destroy();
    });

    function getShownPolylines(sceneArg) {
      const polylineCollection = sceneArg.primitives.get(0);
      const shown = [];
      for (let i = 0; i < polylineCollection.length; i++) {
        const polyline = polylineCollection.get(i);
        if (polyline.show) {
          shown.push(polyline);
        }
      }
      return shown;
    }

    it("constructor throws if no scene is passed.", function () {
      expect(function () {
        return new PathVisualizer();
      }).toThrowDeveloperError();
    });

    it("update throws if no time specified.", function () {
      const entityCollection = new EntityCollection();
      visualizer = new PathVisualizer(scene, entityCollection);
      expect(function () {
        visualizer.update();
      }).toThrowDeveloperError();
    });

    it("isDestroy returns false until destroyed.", function () {
      const entityCollection = new EntityCollection();
      visualizer = new PathVisualizer(scene, entityCollection);
      expect(visualizer.isDestroyed()).toEqual(false);
      visualizer.destroy();
      expect(visualizer.isDestroyed()).toEqual(true);
      visualizer = undefined;
    });

    it("removes the listener from the entity collection when destroyed", function () {
      const entityCollection = new EntityCollection();
      const visualizer = new PathVisualizer(scene, entityCollection);
      expect(entityCollection.collectionChanged.numberOfListeners).toEqual(1);
      visualizer.destroy();
      expect(entityCollection.collectionChanged.numberOfListeners).toEqual(0);
    });

    it("object with no path does not create one.", function () {
      const entityCollection = new EntityCollection();
      visualizer = new PathVisualizer(scene, entityCollection);

      const testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = new ConstantProperty([
        new Cartesian3(1234, 5678, 9101112),
        new Cartesian3(5678, 1234, 1101112),
      ]);
      visualizer.update(JulianDate.now());
      expect(scene.primitives.length).toEqual(0);
    });

    it("object with no position does not create a polyline.", function () {
      const entityCollection = new EntityCollection();
      visualizer = new PathVisualizer(scene, entityCollection);

      const testObject = entityCollection.getOrCreateEntity("test");
      const path = (testObject.path = new PathGraphics());
      path.show = new ConstantProperty(true);

      visualizer.update(JulianDate.now());
      expect(scene.primitives.length).toEqual(0);
    });

    it("adding and removing an entity path without rendering does not crash.", function () {
      const times = [new JulianDate(0, 0), new JulianDate(1, 0)];
      const positions = [
        new Cartesian3(1234, 5678, 9101112),
        new Cartesian3(5678, 1234, 1101112),
      ];

      const entityCollection = new EntityCollection();
      visualizer = new PathVisualizer(scene, entityCollection);

      const position = new SampledPositionProperty();
      position.addSamples(times, positions);

      const testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = position;
      testObject.path = new PathGraphics();

      //Before we fixed the issue, the below remove call would cause a crash
      //when visualizer.update was not called at least once after the entity was added.
      entityCollection.remove(testObject);
    });

    it("A PathGraphics causes a primitive to be created and updated.", function () {
      const times = [new JulianDate(0, 0), new JulianDate(1, 0)];
      const updateTime = new JulianDate(0.5, 0);
      const positions = [
        new Cartesian3(1234, 5678, 9101112),
        new Cartesian3(5678, 1234, 1101112),
      ];

      const entityCollection = new EntityCollection();
      visualizer = new PathVisualizer(scene, entityCollection);

      expect(scene.primitives.length).toEqual(0);

      const testObject = entityCollection.getOrCreateEntity("test");
      const position = new SampledPositionProperty();
      testObject.position = position;
      position.addSamples(times, positions);

      const path = (testObject.path = new PathGraphics());
      path.show = new ConstantProperty(true);
      path.material = new PolylineOutlineMaterialProperty();
      path.material.color = new ConstantProperty(new Color(0.8, 0.7, 0.6, 0.5));
      path.material.outlineColor = new ConstantProperty(
        new Color(0.1, 0.2, 0.3, 0.4),
      );
      path.material.outlineWidth = new ConstantProperty(2.5);
      path.width = new ConstantProperty(12.5);
      path.distanceDisplayCondition = new ConstantProperty(
        new DistanceDisplayCondition(10.0, 20.0),
      );
      path.leadTime = new ConstantProperty(25);
      path.trailTime = new ConstantProperty(10);

      visualizer.update(updateTime);

      expect(scene.primitives.length).toEqual(1);

      const polylineCollection = scene.primitives.get(0);
      const primitive = polylineCollection.get(0);
      expect(primitive.positions[0]).toEqual(
        testObject.position.getValue(
          JulianDate.addSeconds(
            updateTime,
            -path.trailTime.getValue(),
            new JulianDate(),
          ),
        ),
      );
      expect(primitive.positions[1]).toEqual(
        testObject.position.getValue(updateTime),
      );
      expect(primitive.positions[2]).toEqual(
        testObject.position.getValue(
          JulianDate.addSeconds(
            updateTime,
            path.leadTime.getValue(),
            new JulianDate(),
          ),
        ),
      );
      expect(primitive.show).toEqual(testObject.path.show.getValue(updateTime));
      expect(primitive.width).toEqual(
        testObject.path.width.getValue(updateTime),
      );
      expect(primitive.distanceDisplayCondition).toEqual(
        testObject.path.distanceDisplayCondition.getValue(updateTime),
      );

      const material = primitive.material;
      expect(material.uniforms.color).toEqual(
        testObject.path.material.color.getValue(updateTime),
      );
      expect(material.uniforms.outlineColor).toEqual(
        testObject.path.material.outlineColor.getValue(updateTime),
      );
      expect(material.uniforms.outlineWidth).toEqual(
        testObject.path.material.outlineWidth.getValue(updateTime),
      );

      path.show = new ConstantProperty(false);
      visualizer.update(updateTime);
      expect(primitive.show).toEqual(testObject.path.show.getValue(updateTime));
    });

    it("creates primitives when an entity is already in the collection.", function () {
      const times = [new JulianDate(0, 0), new JulianDate(1, 0)];
      const updateTime = new JulianDate(0.5, 0);
      const positions = [
        new Cartesian3(1234, 5678, 9101112),
        new Cartesian3(5678, 1234, 1101112),
      ];

      const entityCollection = new EntityCollection();

      const testObject = entityCollection.getOrCreateEntity("test");
      const position = new SampledPositionProperty();
      testObject.position = position;
      position.addSamples(times, positions);

      const path = (testObject.path = new PathGraphics());
      path.show = new ConstantProperty(true);
      path.material = new PolylineOutlineMaterialProperty();
      path.material.color = new ConstantProperty(new Color(0.8, 0.7, 0.6, 0.5));
      path.material.outlineColor = new ConstantProperty(
        new Color(0.1, 0.2, 0.3, 0.4),
      );
      path.material.outlineWidth = new ConstantProperty(2.5);
      path.width = new ConstantProperty(12.5);
      path.leadTime = new ConstantProperty(25);
      path.trailTime = new ConstantProperty(10);

      visualizer = new PathVisualizer(scene, entityCollection);

      expect(scene.primitives.length).toEqual(0);

      visualizer.update(updateTime);

      expect(scene.primitives.length).toEqual(1);
    });

    it("A custom material can be used.", function () {
      const times = [new JulianDate(0, 0), new JulianDate(1, 0)];
      const updateTime = new JulianDate(0.5, 0);
      const positions = [
        new Cartesian3(1234, 5678, 9101112),
        new Cartesian3(5678, 1234, 1101112),
      ];

      const entityCollection = new EntityCollection();
      visualizer = new PathVisualizer(scene, entityCollection);

      expect(scene.primitives.length).toEqual(0);

      const testObject = entityCollection.getOrCreateEntity("test");
      const position = new SampledPositionProperty();
      testObject.position = position;
      position.addSamples(times, positions);

      const path = (testObject.path = new PathGraphics());
      path.show = new ConstantProperty(true);
      path.material = new PolylineGlowMaterialProperty();
      path.material.color = new ConstantProperty(new Color(0.8, 0.7, 0.6, 0.5));
      path.material.glowPower = new ConstantProperty(0.2);
      path.material.taperPower = new ConstantProperty(0.15);
      path.width = new ConstantProperty(12.5);
      path.leadTime = new ConstantProperty(25);
      path.trailTime = new ConstantProperty(10);

      visualizer.update(updateTime);

      expect(scene.primitives.length).toEqual(1);

      const polylineCollection = scene.primitives.get(0);
      const primitive = polylineCollection.get(0);

      const material = primitive.material;
      expect(material.uniforms.color).toEqual(
        testObject.path.material.color.getValue(updateTime),
      );
      expect(material.uniforms.glowPower).toEqual(
        testObject.path.material.glowPower.getValue(updateTime),
      );
      expect(material.uniforms.taperPower).toEqual(
        testObject.path.material.taperPower.getValue(updateTime),
      );
    });

    it("Reuses primitives when hiding one and showing another", function () {
      const times = [new JulianDate(0, 0), new JulianDate(1, 0)];
      const time = new JulianDate(0.5, 0);
      const positions = [
        new Cartesian3(1234, 5678, 9101112),
        new Cartesian3(5678, 1234, 1101112),
      ];

      const entityCollection = new EntityCollection();
      visualizer = new PathVisualizer(scene, entityCollection);

      let position = new SampledPositionProperty();
      position.addSamples(times, positions);

      const testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = position;
      testObject.path = new PathGraphics();
      testObject.path.show = new ConstantProperty(true);
      testObject.path.leadTime = new ConstantProperty(25);
      testObject.path.trailTime = new ConstantProperty(10);

      visualizer.update(time);

      const polylineCollection = scene.primitives.get(0);
      expect(polylineCollection.length).toEqual(1);

      testObject.path.show = new ConstantProperty(false);

      visualizer.update(time);

      expect(polylineCollection.length).toEqual(1);

      position = new SampledPositionProperty();
      position.addSamples(times, positions);

      const testObject2 = entityCollection.getOrCreateEntity("test2");
      testObject2.position = position;
      testObject2.path = new PathGraphics();
      testObject2.path.show = new ConstantProperty(true);
      testObject2.path.leadTime = new ConstantProperty(25);
      testObject2.path.trailTime = new ConstantProperty(10);

      visualizer.update(time);
      expect(polylineCollection.length).toEqual(1);
    });

    it("Switches from inertial to fixed paths in 2D", function () {
      const times = [new JulianDate(0, 0), new JulianDate(1, 0)];
      const time = new JulianDate(0.5, 0);
      const positions = [
        new Cartesian3(1234, 5678, 9101112),
        new Cartesian3(5678, 1234, 1101112),
      ];

      const position = new SampledPositionProperty(ReferenceFrame.INERTIAL);
      position.addSamples(times, positions);

      const entityCollection = new EntityCollection();
      visualizer = new PathVisualizer(scene, entityCollection);
      const testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = position;
      testObject.path = new PathGraphics();
      testObject.path.leadTime = new ConstantProperty(25);
      testObject.path.trailTime = new ConstantProperty(10);

      visualizer.update(time);

      expect(scene.primitives.length).toEqual(1);

      //They'll be one inertial polyline collection
      const inertialPolylineCollection = scene.primitives.get(0);
      expect(inertialPolylineCollection.length).toEqual(1);
      expect(inertialPolylineCollection.modelMatrix).not.toEqual(
        Matrix4.IDENTITY,
      );

      const inertialLine = inertialPolylineCollection.get(0);
      expect(inertialLine.show).toEqual(true);

      scene.mode = SceneMode.SCENE2D;
      visualizer.update(time);

      //They'll be one inertial polyline collection (with no visible lines)
      //and a new fixed polyline collection.
      expect(scene.primitives.length).toEqual(2);

      const fixedPolylineCollection = scene.primitives.get(1);

      expect(inertialLine.show).toEqual(false);
      expect(fixedPolylineCollection.length).toEqual(1);
      expect(fixedPolylineCollection.modelMatrix).toEqual(Matrix4.IDENTITY);

      const fixedLine = fixedPolylineCollection.get(0);
      expect(fixedLine.show).toEqual(true);
    });

    it("clear hides primitives.", function () {
      const times = [new JulianDate(0, 0), new JulianDate(1, 0)];
      const updateTime = new JulianDate(0.5, 0);
      const positions = [
        new Cartesian3(1234, 5678, 9101112),
        new Cartesian3(5678, 1234, 1101112),
      ];

      const entityCollection = new EntityCollection();
      visualizer = new PathVisualizer(scene, entityCollection);

      expect(scene.primitives.length).toEqual(0);

      const testObject = entityCollection.getOrCreateEntity("test");
      const position = new SampledPositionProperty();
      testObject.position = position;
      position.addSamples(times, positions);

      const path = (testObject.path = new PathGraphics());
      path.show = new ConstantProperty(true);
      path.color = new ConstantProperty(new Color(0.8, 0.7, 0.6, 0.5));
      path.width = new ConstantProperty(12.5);
      path.outlineColor = new ConstantProperty(new Color(0.1, 0.2, 0.3, 0.4));
      path.outlineWidth = new ConstantProperty(2.5);
      path.leadTime = new ConstantProperty(25);
      path.trailTime = new ConstantProperty(10);

      visualizer.update(updateTime);

      expect(scene.primitives.length).toEqual(1);

      const polylineCollection = scene.primitives.get(0);
      const primitive = polylineCollection.get(0);

      visualizer.update(updateTime);
      //Clearing won't actually remove the primitive because of the
      //internal cache used by the visualizer, instead it just hides it.
      entityCollection.removeAll();
      expect(primitive.show).toEqual(false);
      expect(primitive.id).toBeUndefined();
    });

    it("Visualizer sets entity property.", function () {
      const times = [new JulianDate(0, 0), new JulianDate(1, 0)];
      const updateTime = new JulianDate(0.5, 0);
      const positions = [
        new Cartesian3(1234, 5678, 9101112),
        new Cartesian3(5678, 1234, 1101112),
      ];

      const entityCollection = new EntityCollection();
      visualizer = new PathVisualizer(scene, entityCollection);

      expect(scene.primitives.length).toEqual(0);

      const testObject = entityCollection.getOrCreateEntity("test");
      const position = new SampledPositionProperty();
      testObject.position = position;
      position.addSamples(times, positions);

      const path = (testObject.path = new PathGraphics());
      path.show = new ConstantProperty(true);
      path.color = new ConstantProperty(new Color(0.8, 0.7, 0.6, 0.5));
      path.width = new ConstantProperty(12.5);
      path.outlineColor = new ConstantProperty(new Color(0.1, 0.2, 0.3, 0.4));
      path.outlineWidth = new ConstantProperty(2.5);
      path.leadTime = new ConstantProperty(25);
      path.trailTime = new ConstantProperty(10);

      visualizer.update(updateTime);
      const polylineCollection = scene.primitives.get(0);
      const primitive = polylineCollection.get(0);
      expect(primitive.id).toEqual(testObject);
    });

    it("Visualizer destroys primitives when all items are removed.", function () {
      const times = [new JulianDate(0, 0), new JulianDate(1, 0)];
      const updateTime = new JulianDate(0.5, 0);
      const positions = [
        new Cartesian3(1234, 5678, 9101112),
        new Cartesian3(5678, 1234, 1101112),
      ];

      const entityCollection = new EntityCollection();
      visualizer = new PathVisualizer(scene, entityCollection);

      expect(scene.primitives.length).toEqual(0);

      const testObject = entityCollection.getOrCreateEntity("test");
      const position = new SampledPositionProperty();
      testObject.position = position;
      position.addSamples(times, positions);

      const path = (testObject.path = new PathGraphics());
      path.show = new ConstantProperty(true);
      path.color = new ConstantProperty(new Color(0.8, 0.7, 0.6, 0.5));
      path.width = new ConstantProperty(12.5);
      path.outlineColor = new ConstantProperty(new Color(0.1, 0.2, 0.3, 0.4));
      path.outlineWidth = new ConstantProperty(2.5);
      path.leadTime = new ConstantProperty(25);
      path.trailTime = new ConstantProperty(10);

      visualizer.update(updateTime);

      expect(scene.primitives.length).toEqual(1);

      entityCollection.removeAll();
      visualizer.update(updateTime);

      expect(scene.primitives.length).toEqual(0);
    });

    it("subSample works for constant properties", function () {
      const property = new ConstantPositionProperty(
        new Cartesian3(1000, 2000, 3000),
      );
      const start = new JulianDate(0, 0);
      const stop = new JulianDate(1, 0);
      const updateTime = new JulianDate(1, 43200);
      const referenceFrame = ReferenceFrame.FIXED;
      const maximumStep = 10;
      const result = PathVisualizer._subSample(
        property,
        start,
        stop,
        updateTime,
        referenceFrame,
        maximumStep,
      );
      expect(result).toEqual([property._value]);
    });

    it("subSample works for reference properties", function () {
      const property = new ConstantPositionProperty(
        new Cartesian3(1000, 2000, 3000),
      );
      const start = new JulianDate(0, 0);
      const stop = new JulianDate(1, 0);
      const updateTime = new JulianDate(1, 43200);
      const referenceFrame = ReferenceFrame.FIXED;
      const maximumStep = 10;

      const entities = new EntityCollection();
      const targetEntity = entities.getOrCreateEntity("target");
      targetEntity.position = property;

      const referenceProperty = new ReferenceProperty(entities, "target", [
        "position",
      ]);

      const result = PathVisualizer._subSample(
        referenceProperty,
        start,
        stop,
        updateTime,
        referenceFrame,
        maximumStep,
      );
      expect(result).toEqual([property._value]);
    });

    it("subSample works for sampled properties", function () {
      const property = new SampledPositionProperty();

      const start = new JulianDate(0, 0);
      const stop = new JulianDate(1, 0);

      property.addSample(start, new Cartesian3(0, 0, 0));
      property.addSample(stop, new Cartesian3(0, 0, 100));

      let updateTime = new JulianDate(0, 43200);
      const referenceFrame = ReferenceFrame.FIXED;
      let maximumStep = 86400;
      const result = [];

      //A large maximum step causes no sub-smapling.
      PathVisualizer._subSample(
        property,
        start,
        stop,
        updateTime,
        referenceFrame,
        maximumStep,
        result,
      );
      expect(result).toEqual([
        property.getValue(start),
        property.getValue(updateTime),
        property.getValue(stop),
      ]);

      //An evenly spaced maximum step causes equal steps from start to stop
      maximumStep = 28800;
      let expectedStep = 28800;
      PathVisualizer._subSample(
        property,
        start,
        stop,
        updateTime,
        referenceFrame,
        maximumStep,
        result,
      );
      expect(result).toEqual([
        property.getValue(start),
        property.getValue(
          JulianDate.addSeconds(start, expectedStep, new JulianDate()),
        ),
        property.getValue(updateTime),
        property.getValue(
          JulianDate.addSeconds(start, expectedStep * 2, new JulianDate()),
        ),
        property.getValue(stop),
      ]);

      //An maximum step size that is slightly more than halfway between points causes a single step halfway between points
      maximumStep = 43201;
      expectedStep = 43200;
      updateTime = new JulianDate(0, 64800);
      PathVisualizer._subSample(
        property,
        start,
        stop,
        updateTime,
        referenceFrame,
        maximumStep,
        result,
      );
      expect(result).toEqual([
        property.getValue(start),
        property.getValue(
          JulianDate.addSeconds(start, expectedStep, new JulianDate()),
        ),
        property.getValue(updateTime),
        property.getValue(stop),
      ]);

      //An maximum step size that is slightly less than halfway between points causes two steps of the eqaul size to be taken between points
      maximumStep = 43199;
      expectedStep = 28800;
      updateTime = new JulianDate(0, 21600);
      PathVisualizer._subSample(
        property,
        start,
        stop,
        updateTime,
        referenceFrame,
        maximumStep,
        result,
      );
      expect(result).toEqual([
        property.getValue(start),
        property.getValue(updateTime),
        property.getValue(
          JulianDate.addSeconds(start, expectedStep, new JulianDate()),
        ),
        property.getValue(
          JulianDate.addSeconds(start, expectedStep * 2, new JulianDate()),
        ),
        property.getValue(stop),
      ]);
    });

    it("subSample works for interval properties", function () {
      const t1 = new JulianDate(0, 0);
      const t2 = new JulianDate(1, 0);
      const t3 = new JulianDate(2, 0);
      const t4 = new JulianDate(3, 0);

      const property = new TimeIntervalCollectionPositionProperty();
      property.intervals.addInterval(
        new TimeInterval({
          start: t1,
          stop: t2,
          data: new Cartesian3(0, 0, 1),
        }),
      );
      property.intervals.addInterval(
        new TimeInterval({
          start: t2,
          stop: t3,
          isStartIncluded: false,
          isStopIncluded: false,
          data: new Cartesian3(0, 0, 2),
        }),
      );
      property.intervals.addInterval(
        new TimeInterval({
          start: t3,
          stop: t4,
          data: new Cartesian3(0, 0, 3),
        }),
      );

      const updateTime = new JulianDate(1, 43200);
      const referenceFrame = ReferenceFrame.FIXED;
      const maximumStep = 10;
      const result = [];
      PathVisualizer._subSample(
        property,
        t1,
        t4,
        updateTime,
        referenceFrame,
        maximumStep,
        result,
      );
      expect(result).toEqual([
        new Cartesian3(0, 0, 1),
        new Cartesian3(0, 0, 2),
        new Cartesian3(0, 0, 3),
      ]);

      PathVisualizer._subSample(
        property,
        t2,
        t3,
        updateTime,
        referenceFrame,
        maximumStep,
        result,
      );
      expect(result).toEqual([
        new Cartesian3(0, 0, 1),
        new Cartesian3(0, 0, 2),
        new Cartesian3(0, 0, 3),
      ]);

      PathVisualizer._subSample(
        property,
        t1,
        t2,
        updateTime,
        referenceFrame,
        maximumStep,
        result,
      );
      expect(result).toEqual([new Cartesian3(0, 0, 1)]);

      PathVisualizer._subSample(
        property,
        t3,
        t4,
        updateTime,
        referenceFrame,
        maximumStep,
        result,
      );
      expect(result).toEqual([new Cartesian3(0, 0, 3)]);
    });

    it("subSample works for callback position properties", function () {
      const t1 = new JulianDate(0, 0);
      const t2 = new JulianDate(2, 0);
      const updateTime = new JulianDate(1, 1);
      const duration = JulianDate.secondsDifference(t2, t1);
      const spline = new LinearSpline({
        times: [0, 1],
        points: [new Cartesian3(0, 0, 0), new Cartesian3(0, 0, 1)],
      });
      const callback = function (time, result) {
        if (JulianDate.lessThan(time, t1) || JulianDate.greaterThan(time, t2)) {
          return undefined;
        }
        if (result === undefined) {
          result = new Cartesian3();
        }
        const delta = JulianDate.secondsDifference(time, t1);
        return spline.evaluate(delta / duration, result);
      };

      const property = new CallbackPositionProperty(callback, false);

      const referenceFrame = ReferenceFrame.FIXED;
      const maximumStep = 43200;
      const result = [];
      PathVisualizer._subSample(
        property,
        t1,
        t2,
        updateTime,
        referenceFrame,
        maximumStep,
        result,
      );
      expect(result).toEqual([
        property.getValue(t1),
        property.getValue(
          JulianDate.addSeconds(t1, maximumStep, new JulianDate()),
        ),
        property.getValue(
          JulianDate.addSeconds(t1, maximumStep * 2, new JulianDate()),
        ),
        property.getValue(updateTime),
        property.getValue(
          JulianDate.addSeconds(t1, maximumStep * 3, new JulianDate()),
        ),
        property.getValue(
          JulianDate.addSeconds(t1, maximumStep * 4, new JulianDate()),
        ),
      ]);
    });

    function CustomPositionProperty(innerProperty) {
      this.SampledProperty = innerProperty;
      this.isConstant = innerProperty.isConstant;
      this.definitionChanged = innerProperty.definitionChanged;
      this.referenceFrame = innerProperty.referenceFrame;

      this.getValue = function (time, result) {
        return innerProperty.getValue(time, result);
      };

      this.getValueInReferenceFrame = function (time, referenceFrame, result) {
        return innerProperty.getValueInReferenceFrame(
          time,
          referenceFrame,
          result,
        );
      };

      this.equals = function (other) {
        return innerProperty.equals(other);
      };
    }

    it("subSample works for custom properties", function () {
      const t1 = new JulianDate(0, 0);
      const t2 = new JulianDate(1, 0);
      const t3 = new JulianDate(2, 0);
      const t4 = new JulianDate(3, 0);
      const updateTime = new JulianDate(1, 1);

      const sampledProperty = new SampledPositionProperty();
      sampledProperty.addSample(t1, new Cartesian3(0, 0, 1));
      sampledProperty.addSample(t2, new Cartesian3(0, 0, 2));
      sampledProperty.addSample(t3, new Cartesian3(0, 0, 3));
      sampledProperty.addSample(t4, new Cartesian3(0, 0, 4));

      const property = new CustomPositionProperty(sampledProperty);

      const referenceFrame = ReferenceFrame.FIXED;
      const maximumStep = 43200;
      const result = [];
      PathVisualizer._subSample(
        property,
        t1,
        t4,
        updateTime,
        referenceFrame,
        maximumStep,
        result,
      );
      expect(result).toEqual([
        sampledProperty.getValue(t1),
        sampledProperty.getValue(
          JulianDate.addSeconds(t1, maximumStep, new JulianDate()),
        ),
        sampledProperty.getValue(
          JulianDate.addSeconds(t1, maximumStep * 2, new JulianDate()),
        ),
        sampledProperty.getValue(updateTime),
        sampledProperty.getValue(
          JulianDate.addSeconds(t1, maximumStep * 3, new JulianDate()),
        ),
        sampledProperty.getValue(
          JulianDate.addSeconds(t1, maximumStep * 4, new JulianDate()),
        ),
        sampledProperty.getValue(
          JulianDate.addSeconds(t1, maximumStep * 5, new JulianDate()),
        ),
        sampledProperty.getValue(
          JulianDate.addSeconds(t1, maximumStep * 6, new JulianDate()),
        ),
      ]);
    });

    function createCompositeTest(useReferenceProperty) {
      const t1 = new JulianDate(0, 0);
      const t2 = new JulianDate(1, 0);
      const t3 = new JulianDate(2, 0);
      const t4 = new JulianDate(3, 0);
      const t5 = new JulianDate(4, 0);
      const t6 = new JulianDate(5, 0);

      const constantProperty = new ConstantPositionProperty(
        new Cartesian3(0, 0, 1),
      );

      const intervalProperty = new TimeIntervalCollectionPositionProperty();
      intervalProperty.intervals.addInterval(
        new TimeInterval({
          start: t1,
          stop: t2,
          data: new Cartesian3(0, 0, 1),
        }),
      );
      intervalProperty.intervals.addInterval(
        new TimeInterval({
          start: t2,
          stop: t3,
          isStartIncluded: false,
          isStopIncluded: false,
          data: new Cartesian3(0, 0, 2),
        }),
      );
      intervalProperty.intervals.addInterval(
        new TimeInterval({
          start: t1,
          stop: t2,
          data: new Cartesian3(0, 0, 3),
        }),
      );

      const sampledProperty = new SampledPositionProperty();
      sampledProperty.addSample(t1, new Cartesian3(0, 0, 1));
      sampledProperty.addSample(t2, new Cartesian3(0, 0, 2));
      sampledProperty.addSample(t3, new Cartesian3(0, 0, 3));
      sampledProperty.addSample(t4, new Cartesian3(0, 0, 4));

      const entities = new EntityCollection();
      const targetEntity = entities.getOrCreateEntity("target");
      targetEntity.position = new ConstantPositionProperty(
        new Cartesian3(0, 0, 5),
      );
      const referenceProperty = new ReferenceProperty(entities, "target", [
        "position",
      ]);

      const scaledProperty = new ScaledPositionProperty(referenceProperty);

      const property = new CompositePositionProperty();
      property.intervals.addInterval(
        new TimeInterval({
          start: t1,
          stop: t2,
          data: intervalProperty,
        }),
      );
      property.intervals.addInterval(
        new TimeInterval({
          start: t2,
          stop: t3,
          isStartIncluded: false,
          isStopIncluded: false,
          data: constantProperty,
        }),
      );
      property.intervals.addInterval(
        new TimeInterval({
          start: t3,
          stop: t4,
          data: sampledProperty,
        }),
      );
      property.intervals.addInterval(
        new TimeInterval({
          start: t4,
          stop: t5,
          isStartIncluded: false,
          isStopIncluded: true,
          data: referenceProperty,
        }),
      );
      property.intervals.addInterval(
        new TimeInterval({
          start: t5,
          stop: t6,
          isStartIncluded: false,
          isStopIncluded: true,
          data: scaledProperty,
        }),
      );

      const updateTime = new JulianDate(0, 0);
      const referenceFrame = ReferenceFrame.FIXED;
      const maximumStep = 43200;
      const result = [];

      let propertyToTest = property;
      if (useReferenceProperty) {
        const testReference = entities.getOrCreateEntity("testReference");
        testReference.position = property;
        propertyToTest = new ReferenceProperty(entities, "testReference", [
          "position",
        ]);
      }

      PathVisualizer._subSample(
        propertyToTest,
        t1,
        t6,
        updateTime,
        referenceFrame,
        maximumStep,
        result,
      );
      expect(result).toEqual([
        intervalProperty.intervals.get(0).data,
        constantProperty.getValue(t1),
        sampledProperty.getValue(t3),
        sampledProperty.getValue(
          JulianDate.addSeconds(t3, maximumStep, new JulianDate()),
        ),
        sampledProperty.getValue(t4),
        targetEntity.position.getValue(t5),
        scaledProperty.getValue(t6),
      ]);
    }

    it("subSample works for composite properties", function () {
      createCompositeTest(false);
    });

    it("subSample works for composite properties wrapped in reference properties", function () {
      createCompositeTest(true);
    });

    it("computeVvlhTransform returns undefined when no velocity frame can be computed", function () {
      const time = new JulianDate(0, 0);
      const property = new ConstantPositionProperty(
        new Cartesian3(7000000.0, 0.0, 0.0),
      );

      const result = PathVisualizer._computeVvlhTransform(
        time,
        property,
        new Matrix4(),
      );

      expect(result).toBeUndefined();
    });

    it("computeVvlhTransform returns a matrix for moving position properties", function () {
      const property = new SampledPositionProperty();
      const start = new JulianDate(0, 0);
      const stop = new JulianDate(0, 10);

      property.addSample(start, new Cartesian3(7000000.0, 0.0, 0.0));
      property.addSample(stop, new Cartesian3(7000000.0, 10.0, 0.0));

      const result = PathVisualizer._computeVvlhTransform(
        start,
        property,
        new Matrix4(),
      );

      // A valid VVLH transform should be anchored at the current position,
      // align its Z axis with the current radial direction, and form a
      // right-handed basis from the motion-derived frame.
      const rotation = Matrix4.getMatrix3(result, new Matrix3());
      const xAxis = Matrix3.getColumn(rotation, 0, new Cartesian3());
      const yAxis = Matrix3.getColumn(rotation, 1, new Cartesian3());
      const zAxis = Matrix3.getColumn(rotation, 2, new Cartesian3());
      const expectedZAxis = Cartesian3.normalize(
        property.getValue(start, new Cartesian3()),
        new Cartesian3(),
      );
      const expectedXAxis = Cartesian3.normalize(
        Cartesian3.cross(yAxis, zAxis, new Cartesian3()),
        new Cartesian3(),
      );

      expect(result).toBeDefined();
      expect(Matrix4.getTranslation(result, new Cartesian3())).toEqual(
        property.getValue(start),
      );
      expect(zAxis).toEqualEpsilon(expectedZAxis, CesiumMath.EPSILON14);
      expect(xAxis).toEqualEpsilon(expectedXAxis, CesiumMath.EPSILON14);
    });

    it("transformToEntityFrame uses the reference entity orientation when available", function () {
      const time = new JulianDate(0, 0);
      const orientation = Quaternion.fromAxisAngle(
        Cartesian3.UNIT_Z,
        CesiumMath.PI_OVER_TWO,
        new Quaternion(),
      );

      // The world-space offset is (1, 0, 0). Converting it into the reference
      // entity's local frame applies the inverse of the entity orientation,
      // yielding a -90 degree rotation about Z.
      const result = PathVisualizer._transformToEntityFrame(
        time,
        new Cartesian3(2.0, 1.0, 0.0),
        new Cartesian3(1.0, 1.0, 0.0),
        {
          orientation: new ConstantProperty(orientation),
        },
        new Cartesian3(),
      );

      expect(result).toEqualEpsilon(
        new Cartesian3(0.0, -1.0, 0.0),
        CesiumMath.EPSILON14,
      );
    });

    it("transformToEntityFrame returns undefined when the reference frame cannot be computed", function () {
      const time = new JulianDate(0, 0);
      const result = PathVisualizer._transformToEntityFrame(
        time,
        new Cartesian3(2.0, 1.0, 0.0),
        new Cartesian3(1.0, 1.0, 0.0),
        {
          position: new ConstantPositionProperty(new Cartesian3(1.0, 1.0, 0.0)),
        },
        new Cartesian3(),
      );

      expect(result).toBeUndefined();
    });

    function createRelativePathCzml(options) {
      options = options || {};

      const interval =
        options.interval ?? "2023-03-10T17:00:00Z/2023-03-10T17:00:20Z";
      const sat2Availability = options.sat2Availability ?? interval;
      const epoch = "2023-03-10T17:00:00Z";

      const sat1Position = options.sat1Position ?? [
        0, 7000000.0, 1000.0, 0.0, 10, 7000000.0, 1010.0, 0.0, 20, 7000000.0,
        1020.0, 0.0,
      ];
      const sat2Position = options.sat2Position ?? [
        0, 7000000.0, 0.0, 0.0, 10, 7000000.0, 10.0, 0.0, 20, 7000000.0, 20.0,
        0.0,
      ];

      const satellite2 = {
        id: "someEntityId2",
        availability: sat2Availability,
        position: {
          epoch: epoch,
          cartesian: sat2Position,
        },
      };

      if (options.orientation !== undefined) {
        satellite2.orientation = options.orientation;
      }

      return [
        {
          id: "document",
          version: "1.0",
          clock: {
            interval: interval,
            currentTime: epoch,
            multiplier: 1.0,
            range: "CLAMPED",
            step: "SYSTEM_CLOCK_MULTIPLIER",
          },
        },
        {
          id: "someEntityId1",
          availability: interval,
          position: {
            epoch: epoch,
            cartesian: sat1Position,
          },
          path: {
            show: true,
            width: 2,
            resolution: 5,
            leadTime: options.leadTime ?? 0,
            trailTime: options.trailTime ?? 5,
            relativeTo: options.relativeTo ?? "someEntityId2",
          },
        },
        satellite2,
      ];
    }

    it("displays paths relative to another entity", async function () {
      const dataSource = await CzmlDataSource.load(createRelativePathCzml());
      const entityCollection = dataSource.entities;
      const time = JulianDate.fromIso8601("2023-03-10T17:00:08Z");

      scene.mode = SceneMode.SCENE3D;
      visualizer = new PathVisualizer(scene, entityCollection);
      visualizer.update(time);

      const satellite1 = entityCollection.getById("someEntityId1");
      const polylineCollection = scene.primitives.get(0);
      const primitive = polylineCollection.get(0);

      expect(satellite1.path.relativeTo.getValue(time)).toEqual(
        "someEntityId2",
      );
      expect(primitive.show).toEqual(true);
      expect(primitive.positions.length).toBeGreaterThan(1);
      expect(polylineCollection.modelMatrix).not.toEqual(Matrix4.IDENTITY);
    });

    it("displays paths in the FIXED frame", async function () {
      const dataSource = await CzmlDataSource.load(
        createRelativePathCzml({
          relativeTo: "FIXED",
        }),
      );
      const entityCollection = dataSource.entities;
      const time = JulianDate.fromIso8601("2023-03-10T17:00:08Z");

      scene.mode = SceneMode.SCENE3D;
      visualizer = new PathVisualizer(scene, entityCollection);
      visualizer.update(time);

      const satellite1 = entityCollection.getById("someEntityId1");
      const polylineCollection = scene.primitives.get(0);
      const primitive = polylineCollection.get(0);

      expect(satellite1.path.relativeTo.getValue(time)).toEqual("FIXED");
      expect(primitive.show).toEqual(true);
      expect(primitive.positions.length).toBeGreaterThan(1);
      expect(polylineCollection.modelMatrix).toEqual(Matrix4.IDENTITY);
    });

    it("displays paths in the INERTIAL frame", async function () {
      const dataSource = await CzmlDataSource.load(
        createRelativePathCzml({
          relativeTo: "INERTIAL",
        }),
      );
      const entityCollection = dataSource.entities;
      const time = JulianDate.fromIso8601("2023-03-10T17:00:08Z");

      scene.mode = SceneMode.SCENE3D;
      visualizer = new PathVisualizer(scene, entityCollection);
      visualizer.update(time);

      const satellite1 = entityCollection.getById("someEntityId1");
      const polylineCollection = scene.primitives.get(0);
      const primitive = polylineCollection.get(0);
      let toFixed = Transforms.computeIcrfToFixedMatrix(time, new Matrix3());
      if (!toFixed) {
        toFixed = Transforms.computeTemeToPseudoFixedMatrix(
          time,
          new Matrix3(),
        );
      }
      const expectedModelMatrix = Matrix4.fromRotationTranslation(
        toFixed,
        Cartesian3.ZERO,
        new Matrix4(),
      );

      expect(satellite1.path.relativeTo.getValue(time)).toEqual("INERTIAL");
      expect(primitive.show).toEqual(true);
      expect(primitive.positions.length).toBeGreaterThan(1);
      expect(polylineCollection.modelMatrix).toEqual(expectedModelMatrix);
    });

    it("hides relative paths when the reference entity ends early", async function () {
      const dataSource = await CzmlDataSource.load(
        createRelativePathCzml({
          interval: "2023-03-10T17:00:00Z/2023-03-10T17:00:20Z",
          sat2Availability: "2023-03-10T17:00:00Z/2023-03-10T17:00:10Z",
          trailTime: 5,
          sat2Position: [0, 7000000.0, 0.0, 0.0, 10, 7000000.0, 10.0, 0.0],
        }),
      );
      const entityCollection = dataSource.entities;
      const earlyTime = JulianDate.fromIso8601("2023-03-10T17:00:08Z");
      const lateTime = JulianDate.fromIso8601("2023-03-10T17:00:20Z");

      scene.mode = SceneMode.SCENE3D;
      visualizer = new PathVisualizer(scene, entityCollection);

      visualizer.update(earlyTime);
      const polylineCollection = scene.primitives.get(0);
      const primitive = polylineCollection.get(0);
      expect(primitive.show).toEqual(true);

      visualizer.update(lateTime);
      expect(primitive.show).toEqual(false);
    });

    it("shows all interval segments in PORTIONS materialMode", function () {
      const times = [
        JulianDate.fromIso8601("2026-04-01T00:00:00Z"),
        JulianDate.fromIso8601("2026-04-01T00:00:10Z"),
        JulianDate.fromIso8601("2026-04-01T00:00:20Z"),
      ];
      const updateTime = JulianDate.fromIso8601("2026-04-01T00:00:10Z");
      const positions = [
        new Cartesian3(1234, 5678, 9101112),
        new Cartesian3(5678, 1234, 1101112),
        new Cartesian3(6789, 2345, 2101112),
      ];

      const entityCollection = new EntityCollection();
      visualizer = new PathVisualizer(scene, entityCollection);

      const testObject = entityCollection.getOrCreateEntity("test");
      const position = new SampledPositionProperty();
      testObject.position = position;
      position.addSamples(times, positions);

      const path = (testObject.path = new PathGraphics());
      path.show = new ConstantProperty(true);
      path.materialMode = new ConstantProperty(PathMode.PORTIONS);
      path.width = new ConstantProperty(8.0);
      path.leadTime = new ConstantProperty(10);
      path.trailTime = new ConstantProperty(10);

      const material = new CompositeMaterialProperty();
      material.intervals.addInterval(
        TimeInterval.fromIso8601({
          iso8601: "2026-04-01T00:00:00Z/2026-04-01T00:00:10Z",
          data: new ColorMaterialProperty(Color.RED),
        }),
      );
      material.intervals.addInterval(
        TimeInterval.fromIso8601({
          iso8601: "2026-04-01T00:00:10Z/2026-04-01T00:00:20Z",
          data: new ColorMaterialProperty(Color.BLUE),
        }),
      );
      path.material = material;

      visualizer.update(updateTime);

      const shownPolylines = getShownPolylines(scene);
      expect(shownPolylines.length).toEqual(2);

      const shownColors = shownPolylines.map(function (polyline) {
        return polyline.material.uniforms.color;
      });
      expect(
        shownColors.some(function (color) {
          return Color.equals(color, Color.RED);
        }),
      ).toEqual(true);
      expect(
        shownColors.some(function (color) {
          return Color.equals(color, Color.BLUE);
        }),
      ).toEqual(true);
    });

    it("does not create interval segments in WHOLE materialMode", function () {
      const times = [
        JulianDate.fromIso8601("2026-04-01T00:00:00Z"),
        JulianDate.fromIso8601("2026-04-01T00:00:10Z"),
        JulianDate.fromIso8601("2026-04-01T00:00:20Z"),
      ];
      const earlyTime = JulianDate.fromIso8601("2026-04-01T00:00:05Z");
      const lateTime = JulianDate.fromIso8601("2026-04-01T00:00:15Z");
      const positions = [
        new Cartesian3(1234, 5678, 9101112),
        new Cartesian3(5678, 1234, 1101112),
        new Cartesian3(6789, 2345, 2101112),
      ];

      const entityCollection = new EntityCollection();
      visualizer = new PathVisualizer(scene, entityCollection);

      const testObject = entityCollection.getOrCreateEntity("test");
      const position = new SampledPositionProperty();
      testObject.position = position;
      position.addSamples(times, positions);

      const path = (testObject.path = new PathGraphics());
      path.show = new ConstantProperty(true);
      path.materialMode = new ConstantProperty(PathMode.WHOLE);
      path.width = new ConstantProperty(8.0);
      path.leadTime = new ConstantProperty(10);
      path.trailTime = new ConstantProperty(10);

      const material = new CompositeMaterialProperty();
      material.intervals.addInterval(
        TimeInterval.fromIso8601({
          iso8601: "2026-04-01T00:00:00Z/2026-04-01T00:00:10Z",
          data: new ColorMaterialProperty(Color.RED),
        }),
      );
      material.intervals.addInterval(
        TimeInterval.fromIso8601({
          iso8601: "2026-04-01T00:00:10Z/2026-04-01T00:00:20Z",
          data: new ColorMaterialProperty(Color.BLUE),
        }),
      );
      path.material = material;

      visualizer.update(earlyTime);

      const shownPolylines = getShownPolylines(scene);
      expect(shownPolylines.length).toEqual(1);
      expect(shownPolylines[0].material.uniforms.color).toEqual(Color.RED);

      visualizer.update(lateTime);
      expect(shownPolylines.length).toEqual(1);
      expect(shownPolylines[0].material.uniforms.color).toEqual(Color.BLUE);
    });

    it("handles sampled materials in PORTIONS materialMode", function () {
      const times = [
        JulianDate.fromIso8601("2026-04-01T00:00:00Z"),
        JulianDate.fromIso8601("2026-04-01T00:00:10Z"),
        JulianDate.fromIso8601("2026-04-01T00:00:20Z"),
      ];
      const updateTime = JulianDate.fromIso8601("2026-04-01T00:00:10Z");
      const positions = [
        new Cartesian3(1234, 5678, 9101112),
        new Cartesian3(5678, 1234, 1101112),
        new Cartesian3(6789, 2345, 2101112),
      ];

      const sampledColor = new SampledProperty(Color);
      sampledColor.addSample(times[0], Color.RED);
      sampledColor.addSample(times[2], Color.BLUE);

      const entityCollection = new EntityCollection();
      visualizer = new PathVisualizer(scene, entityCollection);

      const testObject = entityCollection.getOrCreateEntity("test");
      const position = new SampledPositionProperty();
      testObject.position = position;
      position.addSamples(times, positions);

      const path = (testObject.path = new PathGraphics());
      path.show = new ConstantProperty(true);
      path.materialMode = new ConstantProperty(PathMode.PORTIONS);
      path.width = new ConstantProperty(8.0);
      path.resolution = new ConstantProperty(5.0);
      path.leadTime = new ConstantProperty(10);
      path.trailTime = new ConstantProperty(10);
      path.material = new ColorMaterialProperty(sampledColor);

      expect(function () {
        visualizer.update(updateTime);
      }).not.toThrow();

      const shownPolylines = getShownPolylines(scene);
      expect(shownPolylines.length).toBeGreaterThan(1);
      expect(shownPolylines[0].material.uniforms.color).toBeDefined();
    });

    it("handles sampled properties within a time-dynamic material in PORTIONS materialMode", function () {
      const times = [
        JulianDate.fromIso8601("2026-04-01T00:00:00Z"),
        JulianDate.fromIso8601("2026-04-01T00:00:10Z"),
        JulianDate.fromIso8601("2026-04-01T00:00:20Z"),
      ];
      const updateTime = JulianDate.fromIso8601("2026-04-01T00:00:10Z");
      const positions = [
        new Cartesian3(1234, 5678, 9101112),
        new Cartesian3(5678, 1234, 1101112),
        new Cartesian3(6789, 2345, 2101112),
      ];

      const firstIntervalColor = new SampledProperty(Color);
      firstIntervalColor.addSample(times[0], Color.RED);
      firstIntervalColor.addSample(times[1], Color.YELLOW);

      const secondIntervalColor = new SampledProperty(Color);
      secondIntervalColor.addSample(times[1], Color.GREEN);
      secondIntervalColor.addSample(times[2], Color.BLUE);

      const material = new CompositeMaterialProperty();
      material.intervals.addInterval(
        TimeInterval.fromIso8601({
          iso8601: "2026-04-01T00:00:00Z/2026-04-01T00:00:10Z",
          data: new ColorMaterialProperty(firstIntervalColor),
        }),
      );
      material.intervals.addInterval(
        TimeInterval.fromIso8601({
          iso8601: "2026-04-01T00:00:10Z/2026-04-01T00:00:20Z",
          data: new ColorMaterialProperty(secondIntervalColor),
        }),
      );

      const entityCollection = new EntityCollection();
      visualizer = new PathVisualizer(scene, entityCollection);

      const testObject = entityCollection.getOrCreateEntity("test");
      const position = new SampledPositionProperty();
      testObject.position = position;
      position.addSamples(times, positions);

      const path = (testObject.path = new PathGraphics());
      path.show = new ConstantProperty(true);
      path.materialMode = new ConstantProperty(PathMode.PORTIONS);
      path.width = new ConstantProperty(8.0);
      path.resolution = new ConstantProperty(5.0);
      path.leadTime = new ConstantProperty(10);
      path.trailTime = new ConstantProperty(10);
      path.material = material;

      visualizer.update(updateTime);

      const shownPolylines = getShownPolylines(scene);
      expect(shownPolylines.length).toBeGreaterThan(1);
      expect(shownPolylines[0].material.uniforms.color).toBeDefined();
    });

    it("switches behavior when materialMode changes over time", function () {
      const times = [
        JulianDate.fromIso8601("2026-04-01T00:00:00Z"),
        JulianDate.fromIso8601("2026-04-01T00:00:10Z"),
        JulianDate.fromIso8601("2026-04-01T00:00:20Z"),
      ];
      const earlyTime = JulianDate.fromIso8601("2026-04-01T00:00:05Z");
      const lateTime = JulianDate.fromIso8601("2026-04-01T00:00:15Z");
      const switchTime = JulianDate.fromIso8601("2026-04-01T00:00:10Z");

      const entityCollection = new EntityCollection();
      visualizer = new PathVisualizer(scene, entityCollection);

      const testObject = entityCollection.getOrCreateEntity("test");
      const position = new SampledPositionProperty();
      position.addSamples(times, [
        new Cartesian3(1234, 5678, 9101112),
        new Cartesian3(5678, 1234, 1101112),
        new Cartesian3(6789, 2345, 2101112),
      ]);
      testObject.position = position;

      const path = (testObject.path = new PathGraphics());
      path.show = new ConstantProperty(true);
      path.materialMode = new CallbackProperty(function (time) {
        return JulianDate.lessThan(time, switchTime)
          ? PathMode.WHOLE
          : PathMode.PORTIONS;
      }, false);
      path.width = new ConstantProperty(8.0);
      path.leadTime = new ConstantProperty(10);
      path.trailTime = new ConstantProperty(10);

      const material = new CompositeMaterialProperty();
      material.intervals.addInterval(
        TimeInterval.fromIso8601({
          iso8601: "2026-04-01T00:00:00Z/2026-04-01T00:00:10Z",
          data: new ColorMaterialProperty(Color.RED),
        }),
      );
      material.intervals.addInterval(
        TimeInterval.fromIso8601({
          iso8601: "2026-04-01T00:00:10Z/2026-04-01T00:00:20Z",
          data: new ColorMaterialProperty(Color.BLUE),
        }),
      );
      path.material = material;

      visualizer.update(earlyTime);
      let shownPolylines = getShownPolylines(scene);
      expect(shownPolylines.length).toEqual(1);

      visualizer.update(lateTime);
      shownPolylines = getShownPolylines(scene);
      expect(shownPolylines.length).toBeGreaterThan(1);
    });

    it("shows no visible segments during uncovered material intervals", function () {
      const times = [
        JulianDate.fromIso8601("2026-04-01T00:00:00Z"),
        JulianDate.fromIso8601("2026-04-01T00:00:10Z"),
        JulianDate.fromIso8601("2026-04-01T00:00:20Z"),
      ];

      const entityCollection = new EntityCollection();
      visualizer = new PathVisualizer(scene, entityCollection);

      const testObject = entityCollection.getOrCreateEntity("test");
      const position = new SampledPositionProperty();
      position.addSamples(times, [
        new Cartesian3(1234, 5678, 9101112),
        new Cartesian3(5678, 1234, 1101112),
        new Cartesian3(6789, 2345, 2101112),
      ]);
      testObject.position = position;

      const path = (testObject.path = new PathGraphics());
      path.show = new ConstantProperty(true);
      path.materialMode = new ConstantProperty(PathMode.PORTIONS);
      path.width = new ConstantProperty(8.0);
      path.leadTime = new ConstantProperty(0.05);
      path.trailTime = new ConstantProperty(0.05);

      const material = new CompositeMaterialProperty();
      material.intervals.addInterval(
        TimeInterval.fromIso8601({
          iso8601: "2026-04-01T00:00:00Z/2026-04-01T00:00:10Z",
          data: new ColorMaterialProperty(Color.RED),
        }),
      );
      material.intervals.addInterval(
        TimeInterval.fromIso8601({
          iso8601: "2026-04-01T00:00:12Z/2026-04-01T00:00:20Z",
          data: new ColorMaterialProperty(Color.BLUE),
        }),
      );
      path.material = material;

      visualizer.update(JulianDate.fromIso8601("2026-04-01T00:00:09Z"));
      expect(getShownPolylines(scene).length).toBeGreaterThan(0);

      visualizer.update(JulianDate.fromIso8601("2026-04-01T00:00:11Z"));
      expect(getShownPolylines(scene).length).toEqual(0);
    });

    it("handles non-positive resolution in PORTIONS materialMode", function () {
      const times = [
        JulianDate.fromIso8601("2026-04-01T00:00:00Z"),
        JulianDate.fromIso8601("2026-04-01T00:00:10Z"),
        JulianDate.fromIso8601("2026-04-01T00:00:20Z"),
      ];
      const updateTime = JulianDate.fromIso8601("2026-04-01T00:00:10Z");

      const sampledColor = new SampledProperty(Color);
      sampledColor.addSample(times[0], Color.RED);
      sampledColor.addSample(times[2], Color.BLUE);

      const entityCollection = new EntityCollection();
      visualizer = new PathVisualizer(scene, entityCollection);

      const testObject = entityCollection.getOrCreateEntity("test");
      const position = new SampledPositionProperty();
      position.addSamples(times, [
        new Cartesian3(1234, 5678, 9101112),
        new Cartesian3(5678, 1234, 1101112),
        new Cartesian3(6789, 2345, 2101112),
      ]);
      testObject.position = position;

      const path = (testObject.path = new PathGraphics());
      path.show = new ConstantProperty(true);
      path.materialMode = new ConstantProperty(PathMode.PORTIONS);
      path.width = new ConstantProperty(8.0);
      path.resolution = new ConstantProperty(0.0);
      path.leadTime = new ConstantProperty(10);
      path.trailTime = new ConstantProperty(10);
      path.material = new ColorMaterialProperty(sampledColor);

      expect(function () {
        visualizer.update(updateTime);
      }).not.toThrow();

      expect(getShownPolylines(scene).length).toBeGreaterThan(0);
    });

    it("clips interval colors to the active lead/trail window", function () {
      const times = [
        JulianDate.fromIso8601("2026-04-01T00:00:00Z"),
        JulianDate.fromIso8601("2026-04-01T00:00:10Z"),
        JulianDate.fromIso8601("2026-04-01T00:00:20Z"),
      ];
      const updateTime = JulianDate.fromIso8601("2026-04-01T00:00:10Z");

      const entityCollection = new EntityCollection();
      visualizer = new PathVisualizer(scene, entityCollection);

      const testObject = entityCollection.getOrCreateEntity("test");
      const position = new SampledPositionProperty();
      position.addSamples(times, [
        new Cartesian3(1234, 5678, 9101112),
        new Cartesian3(5678, 1234, 1101112),
        new Cartesian3(6789, 2345, 2101112),
      ]);
      testObject.position = position;

      const path = (testObject.path = new PathGraphics());
      path.show = new ConstantProperty(true);
      path.materialMode = new ConstantProperty(PathMode.PORTIONS);
      path.width = new ConstantProperty(8.0);
      path.leadTime = new ConstantProperty(2.0);
      path.trailTime = new ConstantProperty(2.0);

      const material = new CompositeMaterialProperty();
      material.intervals.addInterval(
        TimeInterval.fromIso8601({
          iso8601: "2026-04-01T00:00:00Z/2026-04-01T00:00:10Z",
          data: new ColorMaterialProperty(Color.RED),
        }),
      );
      material.intervals.addInterval(
        TimeInterval.fromIso8601({
          iso8601: "2026-04-01T00:00:10Z/2026-04-01T00:00:20Z",
          data: new ColorMaterialProperty(Color.BLUE),
        }),
      );
      path.material = material;

      visualizer.update(updateTime);

      const shownColors = getShownPolylines(scene).map(function (polyline) {
        return polyline.material.uniforms.color;
      });
      expect(
        shownColors.some(function (color) {
          return Color.equals(color, Color.RED);
        }),
      ).toEqual(true);
      expect(
        shownColors.some(function (color) {
          return Color.equals(color, Color.BLUE);
        }),
      ).toEqual(true);
    });

    it("honors interval boundary inclusion in PORTIONS materialMode", function () {
      const t0 = JulianDate.fromIso8601("2026-04-01T00:00:00Z");
      const t10 = JulianDate.fromIso8601("2026-04-01T00:00:10Z");
      const t20 = JulianDate.fromIso8601("2026-04-01T00:00:20Z");

      const entityCollection = new EntityCollection();
      visualizer = new PathVisualizer(scene, entityCollection);

      const testObject = entityCollection.getOrCreateEntity("test");
      const position = new SampledPositionProperty();
      position.addSamples(
        [t0, t10, t20],
        [
          new Cartesian3(1234, 5678, 9101112),
          new Cartesian3(5678, 1234, 1101112),
          new Cartesian3(6789, 2345, 2101112),
        ],
      );
      testObject.position = position;

      const path = (testObject.path = new PathGraphics());
      path.show = new ConstantProperty(true);
      path.materialMode = new ConstantProperty(PathMode.PORTIONS);
      path.width = new ConstantProperty(8.0);
      path.leadTime = new ConstantProperty(0.25);
      path.trailTime = new ConstantProperty(0.25);

      const material = new CompositeMaterialProperty();
      material.intervals.addInterval(
        new TimeInterval({
          start: t0,
          stop: t10,
          isStartIncluded: true,
          isStopIncluded: false,
          data: new ColorMaterialProperty(Color.RED),
        }),
      );
      material.intervals.addInterval(
        new TimeInterval({
          start: t10,
          stop: t20,
          isStartIncluded: true,
          isStopIncluded: true,
          data: new ColorMaterialProperty(Color.BLUE),
        }),
      );
      path.material = material;

      visualizer.update(JulianDate.fromIso8601("2026-04-01T00:00:10.200Z"));

      const shownColors = getShownPolylines(scene).map(function (polyline) {
        return polyline.material.uniforms.color;
      });
      expect(
        shownColors.some(function (color) {
          return Color.equals(color, Color.BLUE);
        }),
      ).toEqual(true);
    });

    it("handles undefined positions at split boundaries in PORTIONS materialMode", function () {
      const t0 = JulianDate.fromIso8601("2026-04-01T00:00:00Z");
      const t10 = JulianDate.fromIso8601("2026-04-01T00:00:10Z");
      const t20 = JulianDate.fromIso8601("2026-04-01T00:00:20Z");
      const intervalProperty = new TimeIntervalCollectionPositionProperty();
      intervalProperty.intervals.addInterval(
        new TimeInterval({
          start: t0,
          stop: t10,
          isStartIncluded: true,
          isStopIncluded: false,
          data: new Cartesian3(1234, 5678, 9101112),
        }),
      );
      intervalProperty.intervals.addInterval(
        new TimeInterval({
          start: t10,
          stop: t20,
          isStartIncluded: false,
          isStopIncluded: true,
          data: new Cartesian3(6789, 2345, 2101112),
        }),
      );

      const entityCollection = new EntityCollection();
      visualizer = new PathVisualizer(scene, entityCollection);

      const testObject = entityCollection.getOrCreateEntity("test");
      testObject.position = intervalProperty;

      const path = (testObject.path = new PathGraphics());
      path.show = new ConstantProperty(true);
      path.materialMode = new ConstantProperty(PathMode.PORTIONS);
      path.width = new ConstantProperty(8.0);
      path.resolution = new ConstantProperty(1.0);
      path.leadTime = new ConstantProperty(10);
      path.trailTime = new ConstantProperty(10);

      const material = new CompositeMaterialProperty();
      material.intervals.addInterval(
        TimeInterval.fromIso8601({
          iso8601: "2026-04-01T00:00:00Z/2026-04-01T00:00:10Z",
          data: new ColorMaterialProperty(Color.RED),
        }),
      );
      material.intervals.addInterval(
        TimeInterval.fromIso8601({
          iso8601: "2026-04-01T00:00:10Z/2026-04-01T00:00:20Z",
          data: new ColorMaterialProperty(Color.BLUE),
        }),
      );
      path.material = material;

      expect(function () {
        visualizer.update(t10);
      }).not.toThrow();

      expect(getShownPolylines(scene).length).toEqual(0);
    });

    it("handles entity availability shorter than material intervals", function () {
      const t0 = JulianDate.fromIso8601("2026-04-01T00:00:00Z");
      const t10 = JulianDate.fromIso8601("2026-04-01T00:00:10Z");
      const t20 = JulianDate.fromIso8601("2026-04-01T00:00:20Z");

      const entityCollection = new EntityCollection();
      visualizer = new PathVisualizer(scene, entityCollection);

      const testObject = entityCollection.getOrCreateEntity("test");
      testObject.availability = new TimeIntervalCollection([
        new TimeInterval({ start: t0, stop: t10 }),
      ]);

      const position = new SampledPositionProperty();
      position.addSamples(
        [t0, t10, t20],
        [
          new Cartesian3(1234, 5678, 9101112),
          new Cartesian3(5678, 1234, 1101112),
          new Cartesian3(6789, 2345, 2101112),
        ],
      );
      testObject.position = position;

      const path = (testObject.path = new PathGraphics());
      path.show = new ConstantProperty(true);
      path.materialMode = new ConstantProperty(PathMode.PORTIONS);
      path.width = new ConstantProperty(8.0);
      path.leadTime = new ConstantProperty(10);
      path.trailTime = new ConstantProperty(10);

      const material = new CompositeMaterialProperty();
      material.intervals.addInterval(
        TimeInterval.fromIso8601({
          iso8601: "2026-04-01T00:00:00Z/2026-04-01T00:00:20Z",
          data: new ColorMaterialProperty(Color.RED),
        }),
      );
      path.material = material;

      visualizer.update(JulianDate.fromIso8601("2026-04-01T00:00:08Z"));
      expect(getShownPolylines(scene).length).toBeGreaterThan(0);

      visualizer.update(JulianDate.fromIso8601("2026-04-01T00:00:15Z"));
      expect(getShownPolylines(scene).length).toBeGreaterThan(0);
    });

    it("cleans up segment visibility when switching material behavior", function () {
      const t0 = JulianDate.fromIso8601("2026-04-01T00:00:00Z");
      const t10 = JulianDate.fromIso8601("2026-04-01T00:00:10Z");
      const t20 = JulianDate.fromIso8601("2026-04-01T00:00:20Z");
      const t30 = JulianDate.fromIso8601("2026-04-01T00:00:30Z");

      const entityCollection = new EntityCollection();
      visualizer = new PathVisualizer(scene, entityCollection);

      const testObject = entityCollection.getOrCreateEntity("test");
      const position = new SampledPositionProperty();
      position.addSamples(
        [t0, t10, t20, t30],
        [
          new Cartesian3(1234, 5678, 9101112),
          new Cartesian3(5678, 1234, 1101112),
          new Cartesian3(6789, 2345, 2101112),
          new Cartesian3(7789, 3345, 2201112),
        ],
      );
      testObject.position = position;

      const path = (testObject.path = new PathGraphics());
      path.show = new ConstantProperty(true);
      path.materialMode = new ConstantProperty(PathMode.PORTIONS);
      path.width = new ConstantProperty(8.0);
      path.resolution = new ConstantProperty(5.0);
      path.leadTime = new ConstantProperty(10);
      path.trailTime = new ConstantProperty(10);

      const sampledColorA = new SampledProperty(Color);
      sampledColorA.addSample(t0, Color.RED);
      sampledColorA.addSample(t10, Color.YELLOW);

      const sampledColorB = new SampledProperty(Color);
      sampledColorB.addSample(t20, Color.GREEN);
      sampledColorB.addSample(t30, Color.BLUE);

      const material = new CompositeMaterialProperty();
      material.intervals.addInterval(
        new TimeInterval({
          start: t0,
          stop: t10,
          data: new ColorMaterialProperty(sampledColorA),
        }),
      );
      material.intervals.addInterval(
        new TimeInterval({
          start: t10,
          stop: t20,
          data: new ColorMaterialProperty(Color.WHITE),
        }),
      );
      material.intervals.addInterval(
        new TimeInterval({
          start: t20,
          stop: t30,
          data: new ColorMaterialProperty(sampledColorB),
        }),
      );
      path.material = material;

      visualizer.update(JulianDate.fromIso8601("2026-04-01T00:00:05Z"));
      expect(getShownPolylines(scene).length).toBeGreaterThan(1);

      visualizer.update(JulianDate.fromIso8601("2026-04-01T00:00:15Z"));
      const shownConstantPolylines = getShownPolylines(scene);
      expect(shownConstantPolylines.length).toBeGreaterThan(0);
      expect(
        shownConstantPolylines.some(function (polyline) {
          return Color.equals(polyline.material.uniforms.color, Color.WHITE);
        }),
      ).toEqual(true);

      visualizer.update(JulianDate.fromIso8601("2026-04-01T00:00:25Z"));
      expect(getShownPolylines(scene).length).toBeGreaterThan(1);
    });

    it("does not crash when a referenced color entity is removed mid-simulation", function () {
      const t0 = JulianDate.fromIso8601("2026-04-01T00:00:00Z");
      const t10 = JulianDate.fromIso8601("2026-04-01T00:00:10Z");
      const t20 = JulianDate.fromIso8601("2026-04-01T00:00:20Z");

      const entityCollection = new EntityCollection();
      visualizer = new PathVisualizer(scene, entityCollection);

      const colorSource = entityCollection.getOrCreateEntity("colorSource");
      const sampledColor = new SampledProperty(Color);
      sampledColor.addSample(t0, Color.RED);
      sampledColor.addSample(t20, Color.BLUE);
      colorSource.point = new PointGraphics({ color: sampledColor });

      const testObject = entityCollection.getOrCreateEntity("test");
      const position = new SampledPositionProperty();
      position.addSamples(
        [t0, t10, t20],
        [
          new Cartesian3(1234, 5678, 9101112),
          new Cartesian3(5678, 1234, 1101112),
          new Cartesian3(6789, 2345, 2101112),
        ],
      );
      testObject.position = position;

      const path = (testObject.path = new PathGraphics());
      path.show = new ConstantProperty(true);
      path.materialMode = new ConstantProperty(PathMode.PORTIONS);
      path.width = new ConstantProperty(8.0);
      path.leadTime = new ConstantProperty(10);
      path.trailTime = new ConstantProperty(10);
      path.material = new ColorMaterialProperty(
        new ReferenceProperty(entityCollection, "colorSource", [
          "point",
          "color",
        ]),
      );

      expect(function () {
        visualizer.update(t10);
      }).not.toThrow();
      expect(getShownPolylines(scene).length).toBeGreaterThan(0);

      entityCollection.removeById("colorSource");

      expect(function () {
        visualizer.update(t10);
      }).not.toThrow();
    });
  },
  "WebGL",
);
