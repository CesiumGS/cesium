/*global defineSuite*/
defineSuite([
        'DynamicScene/DynamicPyramidVisualizer',
        'Core/Cartesian3',
        'Core/Color',
        'Core/JulianDate',
        'Core/Math',
        'Core/Matrix3',
        'Core/Matrix4',
        'Core/Quaternion',
        'Core/Spherical',
        'DynamicScene/ColorMaterialProperty',
        'DynamicScene/ConstantProperty',
        'DynamicScene/DynamicObjectCollection',
        'DynamicScene/DynamicPyramid',
        'Specs/createScene',
        'Specs/destroyScene'
    ], function(
        DynamicPyramidVisualizer,
        Cartesian3,
        Color,
        JulianDate,
        CesiumMath,
        Matrix3,
        Matrix4,
        Quaternion,
        Spherical,
        ColorMaterialProperty,
        ConstantProperty,
        DynamicObjectCollection,
        DynamicPyramid,
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
            return new DynamicPyramidVisualizer();
        }).toThrowDeveloperError();
    });

    it('update throws if no time specified.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPyramidVisualizer(scene, dynamicObjectCollection);
        expect(function() {
            visualizer.update();
        }).toThrowDeveloperError();
    });

    it('isDestroy returns false until destroyed.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPyramidVisualizer(scene, dynamicObjectCollection);
        expect(visualizer.isDestroyed()).toEqual(false);
        visualizer.destroy();
        expect(visualizer.isDestroyed()).toEqual(true);
        visualizer = undefined;
    });

    it('object with no pyramid does not create a primitive.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPyramidVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.orientation = new ConstantProperty(new Quaternion(0, 0, 0, 1));
        visualizer.update(JulianDate.now());
        expect(scene.primitives.length).toEqual(0);
    });

    it('object with no position does not create a primitive.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPyramidVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.orientation = new ConstantProperty(new Quaternion(0, 0, 0, 1));
        var pyramid = testObject.pyramid = new DynamicPyramid();
        pyramid.directions = new ConstantProperty([new Spherical(0, 0, 0), new Spherical(1, 0, 0), new Spherical(2, 0, 0), new Spherical(3, 0, 0)]);
        visualizer.update(JulianDate.now());
        expect(scene.primitives.length).toEqual(0);
    });

    it('object with no orientation does not create a primitive.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPyramidVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        var pyramid = testObject.pyramid = new DynamicPyramid();
        pyramid.directions = new ConstantProperty([new Spherical(0, 0, 0), new Spherical(1, 0, 0), new Spherical(2, 0, 0), new Spherical(3, 0, 0)]);
        visualizer.update(JulianDate.now());
        expect(scene.primitives.length).toEqual(0);
    });

    it('A DynamicPyramid causes a CustomSensor to be created and updated.', function() {
        var time = JulianDate.now();
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPyramidVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.orientation = new ConstantProperty(new Quaternion(0, 0, Math.sin(CesiumMath.PI_OVER_FOUR), Math.cos(CesiumMath.PI_OVER_FOUR)));

        var pyramid = testObject.pyramid = new DynamicPyramid();
        pyramid.directions = new ConstantProperty([new Spherical(0, 0, 0), new Spherical(1, 0, 0), new Spherical(2, 0, 0), new Spherical(3, 0, 0)]);
        pyramid.intersectionColor = new ConstantProperty(new Color(0.1, 0.2, 0.3, 0.4));
        pyramid.intersectionWidth = new ConstantProperty(0.5);
        pyramid.showIntersection = new ConstantProperty(true);
        pyramid.radius = new ConstantProperty(123.5);
        pyramid.show = new ConstantProperty(true);
        pyramid.material = new ColorMaterialProperty();
        visualizer.update(time);

        expect(scene.primitives.length).toEqual(1);
        var p = scene.primitives.get(0);
        expect(p.intersectionColor).toEqual(testObject.pyramid.intersectionColor.getValue(time));
        expect(p.intersectionWidth).toEqual(testObject.pyramid.intersectionWidth.getValue(time));
        expect(p.showIntersection).toEqual(testObject.pyramid.showIntersection.getValue(time));
        expect(p.radius).toEqual(testObject.pyramid.radius.getValue(time));
        expect(p.show).toEqual(testObject.pyramid.show.getValue(time));
        expect(p.material.uniforms).toEqual(testObject.pyramid.material.getValue(time));
        expect(p.modelMatrix).toEqual(Matrix4.fromRotationTranslation(Matrix3.fromQuaternion(testObject.orientation.getValue(time)), testObject.position.getValue(time)));

        pyramid.show.value = false;
        visualizer.update(time);
        expect(p.show).toEqual(testObject.pyramid.show.getValue(time));
    });

    it('clear hides pyramids.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPyramidVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.orientation = new ConstantProperty(new Quaternion(0, 0, 0, 1));
        var pyramid = testObject.pyramid = new DynamicPyramid();
        pyramid.directions = new ConstantProperty([new Spherical(0, 0, 0), new Spherical(1, 0, 0), new Spherical(2, 0, 0), new Spherical(3, 0, 0)]);

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
        visualizer = new DynamicPyramidVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.orientation = new ConstantProperty(new Quaternion(0, 0, 0, 1));
        var pyramid = testObject.pyramid = new DynamicPyramid();
        pyramid.directions = new ConstantProperty([new Spherical(0, 0, 0), new Spherical(1, 0, 0), new Spherical(2, 0, 0), new Spherical(3, 0, 0)]);

        var time = JulianDate.now();
        visualizer.update(time);
        expect(scene.primitives.get(0).id).toEqual(testObject);
    });
}, 'WebGL');
