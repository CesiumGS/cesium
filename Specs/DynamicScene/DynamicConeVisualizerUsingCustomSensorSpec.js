/*global defineSuite*/
defineSuite([
        'DynamicScene/DynamicConeVisualizerUsingCustomSensor',
        'Core/Cartesian3',
        'Core/Color',
        'Core/JulianDate',
        'Core/Math',
        'Core/Matrix3',
        'Core/Matrix4',
        'Core/Quaternion',
        'DynamicScene/ColorMaterialProperty',
        'DynamicScene/ConstantProperty',
        'DynamicScene/DynamicCone',
        'DynamicScene/DynamicObjectCollection',
        'Specs/createScene',
        'Specs/destroyScene'
    ], function(
        DynamicConeVisualizerUsingCustomSensor,
        Cartesian3,
        Color,
        JulianDate,
        CesiumMath,
        Matrix3,
        Matrix4,
        Quaternion,
        ColorMaterialProperty,
        ConstantProperty,
        DynamicCone,
        DynamicObjectCollection,
        createScene,
        destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var scene;
    var visualizer;

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        destroyScene(scene);
    });

    afterEach(function() {
        visualizer = visualizer && visualizer.destroy();
    });

    it('constructor throws if no scene is passed.', function() {
        expect(function() {
            return new DynamicConeVisualizerUsingCustomSensor();
        }).toThrowDeveloperError();
    });

    it('update throws if no time specified.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicConeVisualizerUsingCustomSensor(scene, dynamicObjectCollection);
        expect(function() {
            visualizer.update();
        }).toThrowDeveloperError();
    });

    it('isDestroy returns false until destroyed.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicConeVisualizerUsingCustomSensor(scene, dynamicObjectCollection);
        expect(visualizer.isDestroyed()).toEqual(false);
        visualizer.destroy();
        expect(visualizer.isDestroyed()).toEqual(true);
        visualizer = undefined;
    });

    it('object with no cone does not create a primitive.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicConeVisualizerUsingCustomSensor(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.orientation = new ConstantProperty(new Quaternion(0, 0, 0, 1));
        visualizer.update(JulianDate.now());
        expect(scene.primitives.length).toEqual(0);
    });

    it('object with no position does not create a primitive.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicConeVisualizerUsingCustomSensor(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.orientation = new ConstantProperty(new Quaternion(0, 0, 0, 1));
        var cone = testObject.cone = new DynamicCone();
        cone.maximumClockAngle = new ConstantProperty(1);
        cone.outerHalfAngle = new ConstantProperty(1);
        visualizer.update(JulianDate.now());
        expect(scene.primitives.length).toEqual(0);
    });

    it('object with no orientation does not create a primitive.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicConeVisualizerUsingCustomSensor(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        var cone = testObject.cone = new DynamicCone();
        cone.maximumClockAngle = new ConstantProperty(1);
        cone.outerHalfAngle = new ConstantProperty(1);
        visualizer.update(JulianDate.now());
        expect(scene.primitives.length).toEqual(0);
    });

    it('A DynamicCone causes a ComplexConicSensor to be created and updated.', function() {
        var time = JulianDate.now();
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicConeVisualizerUsingCustomSensor(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.orientation = new ConstantProperty(new Quaternion(0, 0, Math.sin(CesiumMath.PI_OVER_FOUR), Math.cos(CesiumMath.PI_OVER_FOUR)));

        var cone = testObject.cone = new DynamicCone();
        cone.minimumClockAngle = new ConstantProperty(0.1);
        cone.maximumClockAngle = new ConstantProperty(0.2);
        cone.innerHalfAngle = new ConstantProperty(0.3);
        cone.outerHalfAngle = new ConstantProperty(0.4);
        cone.intersectionColor = new ConstantProperty(new Color(0.1, 0.2, 0.3, 0.4));
        cone.intersectionWidth = new ConstantProperty(0.5);
        cone.showIntersection = new ConstantProperty(true);
        cone.radius = new ConstantProperty(123.5);
        cone.show = new ConstantProperty(true);

        cone.outerMaterial = new ColorMaterialProperty();
        visualizer.update(time);

        expect(scene.primitives.length).toEqual(1);
        var c = scene.primitives.get(0);
        expect(c.minimumClockAngle).toEqual(testObject.cone.minimumClockAngle.getValue(time));
        expect(c.maximumClockAngle).toEqual(testObject.cone.maximumClockAngle.getValue(time));
        expect(c.innerHalfAngle).toEqual(testObject.cone.innerHalfAngle.getValue(time));
        expect(c.outerHalfAngle).toEqual(testObject.cone.outerHalfAngle.getValue(time));
        expect(c.intersectionColor).toEqual(testObject.cone.intersectionColor.getValue(time));
        expect(c.intersectionWidth).toEqual(testObject.cone.intersectionWidth.getValue(time));
        expect(c.showIntersection).toEqual(testObject.cone.showIntersection.getValue(time));
        expect(c.radius).toEqual(testObject.cone.radius.getValue(time));
        expect(c.show).toEqual(testObject.cone.show.getValue(time));
        expect(c.material.uniforms).toEqual(testObject.cone.outerMaterial.getValue(time));
        expect(c.modelMatrix).toEqual(Matrix4.fromRotationTranslation(Matrix3.fromQuaternion(testObject.orientation.getValue(time)), testObject.position.getValue(time)));

        cone.show.value = false;
        visualizer.update(time);
        expect(c.show).toEqual(testObject.cone.show.getValue(time));
    });

    it('IntersectionColor is set correctly with multiple cones.', function() {
        var time = JulianDate.now();
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicConeVisualizerUsingCustomSensor(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.orientation = new ConstantProperty(new Quaternion(0, 0, 0, 1));

        var testObject2 = dynamicObjectCollection.getOrCreateObject('test2');
        testObject2.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        testObject2.orientation = new ConstantProperty(new Quaternion(0, 0, 0, 1));

        var cone = testObject.cone = new DynamicCone();
        cone.intersectionColor = new ConstantProperty(new Color(0.1, 0.2, 0.3, 0.4));

        var cone2 = testObject2.cone = new DynamicCone();
        cone2.intersectionColor = new ConstantProperty(new Color(0.4, 0.3, 0.2, 0.1));

        visualizer.update(time);

        expect(scene.primitives.length).toEqual(2);
        var c = scene.primitives.get(0);
        expect(c.intersectionColor).toEqual(testObject.cone.intersectionColor.getValue(time));

        c = scene.primitives.get(1);
        expect(c.intersectionColor).toEqual(testObject2.cone.intersectionColor.getValue(time));
    });

    it('An empty DynamicCone causes a ComplexConicSensor to be created with CZML defaults.', function() {
        var time = JulianDate.now();
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicConeVisualizerUsingCustomSensor(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.orientation = new ConstantProperty(new Quaternion(0, 0, 0, 1));

        testObject.cone = new DynamicCone();
        visualizer.update(time);

        expect(scene.primitives.length).toEqual(1);
        var c = scene.primitives.get(0);
        expect(c.minimumClockAngle).toEqual(0.0);
        expect(c.maximumClockAngle).toEqual(CesiumMath.TWO_PI);
        expect(c.innerHalfAngle).toEqual(0);
        expect(c.outerHalfAngle).toEqual(Math.PI);
        expect(isFinite(c.radius)).toEqual(false);
        expect(c.show).toEqual(true);
    });

    it('clear hides cones.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicConeVisualizerUsingCustomSensor(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.orientation = new ConstantProperty(new Quaternion(0, 0, 0, 1));
        var cone = testObject.cone = new DynamicCone();
        cone.maximumClockAngle = new ConstantProperty(1);
        cone.outerHalfAngle = new ConstantProperty(1);

        var time = JulianDate.now();
        expect(scene.primitives.length).toEqual(0);
        visualizer.update(time);
        expect(scene.primitives.length).toEqual(1);
        expect(scene.primitives.get(0).show).toEqual(true);
        dynamicObjectCollection.removeAll();
        visualizer.update(time);
        expect(scene.primitives.length).toEqual(1);
        expect(scene.primitives.get(0).show).toEqual(false);
    });

    it('Visualizer sets dynamicObject property.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicConeVisualizerUsingCustomSensor(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.orientation = new ConstantProperty(new Quaternion(0, 0, 0, 1));
        var cone = testObject.cone = new DynamicCone();
        cone.maximumClockAngle = new ConstantProperty(1);
        cone.outerHalfAngle = new ConstantProperty(1);

        var time = JulianDate.now();
        visualizer.update(time);
        expect(scene.primitives.get(0).id).toEqual(testObject);
    });
}, 'WebGL');
