/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicPyramidVisualizer',
             'Core/Matrix3',
             'Core/Matrix4',
             '../Specs/createScene',
             '../Specs/destroyScene',
             '../Specs/MockProperty',
             'DynamicScene/DynamicPyramid',
             'DynamicScene/DynamicObjectCollection',
             'DynamicScene/DynamicObject',
             'Scene/ColorMaterial',
             'Core/JulianDate',
             'Core/Quaternion',
             'Core/Cartesian3',
             'Core/Spherical',
             'Core/Color',
             'Scene/Scene'
            ], function(
              DynamicPyramidVisualizer,
              Matrix3,
              Matrix4,
              createScene,
              destroyScene,
              MockProperty,
              DynamicPyramid,
              DynamicObjectCollection,
              DynamicObject,
              ColorMaterial,
              JulianDate,
              Quaternion,
              Cartesian3,
              Spherical,
              Color,
              Scene) {
    "use strict";
    /*global it,expect,beforeEach,afterEach,waitsFor,runs*/

    var scene;
    var visualizer;

    beforeEach(function() {
        scene = createScene();
    });

    afterEach(function() {
        visualizer = visualizer && visualizer.destroy();
        destroyScene(scene);
    });

    it('constructor throws if no scene is passed.', function() {
        expect(function() {
            return new DynamicPyramidVisualizer();
        }).toThrow();
    });

    it('constructor sets expected parameters.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPyramidVisualizer(scene, dynamicObjectCollection);
        expect(visualizer.getScene()).toEqual(scene);
        expect(visualizer.getDynamicObjectCollection()).toEqual(dynamicObjectCollection);
    });

    it('update throws if no time specified.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPyramidVisualizer(scene, dynamicObjectCollection);
        expect(function() {
            visualizer.update();
        }).toThrow();
    });

    it('update does nothing if no dynamicObjectCollection.', function() {
        visualizer = new DynamicPyramidVisualizer(scene);
        visualizer.update(new JulianDate());
    });

    it('isDestroy returns false until destroyed.', function() {
        visualizer = new DynamicPyramidVisualizer(scene);
        expect(visualizer.isDestroyed()).toEqual(false);
        visualizer.destroy();
        expect(visualizer.isDestroyed()).toEqual(true);
        visualizer = undefined;
    });

    it('object with no pyramid does not create a primitive.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPyramidVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.orientation = new MockProperty(new Quaternion(0, 0, 0, 1));
        visualizer.update(new JulianDate());
        expect(scene.getPrimitives().getLength()).toEqual(0);
    });

    it('object with no position does not create a primitive.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPyramidVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.orientation = new MockProperty(new Quaternion(0, 0, 0, 1));
        var pyramid = testObject.pyramid = new DynamicPyramid();
        pyramid.directions = new MockProperty([new Spherical(0, 0, 0), new Spherical(1, 0, 0), new Spherical(2, 0, 0), new Spherical(3, 0, 0)]);
        visualizer.update(new JulianDate());
        expect(scene.getPrimitives().getLength()).toEqual(0);
    });

    it('object with no orientation does not create a primitive.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPyramidVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
        var pyramid = testObject.pyramid = new DynamicPyramid();
        pyramid.directions = new MockProperty([new Spherical(0, 0, 0), new Spherical(1, 0, 0), new Spherical(2, 0, 0), new Spherical(3, 0, 0)]);
        visualizer.update(new JulianDate());
        expect(scene.getPrimitives().getLength()).toEqual(0);
    });

    it('A DynamicPyramid causes a CustomSensor to be created and updated.', function() {
        var time = new JulianDate();
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPyramidVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.orientation = new MockProperty(new Quaternion(0, 0, 0, 1));

        var pyramid = testObject.pyramid = new DynamicPyramid();
        pyramid.directions = new MockProperty([new Spherical(0, 0, 0), new Spherical(1, 0, 0), new Spherical(2, 0, 0), new Spherical(3, 0, 0)]);
        pyramid.intersectionColor = new MockProperty(new Color(0.1, 0.2, 0.3, 0.4));
        pyramid.showIntersection = new MockProperty(true);
        pyramid.radius = new MockProperty(123.5);
        pyramid.show = new MockProperty(true);
        pyramid.material = new MockProperty(new ColorMaterial(Color.RED));
        visualizer.update(time);

        expect(scene.getPrimitives().getLength()).toEqual(1);
        var p = scene.getPrimitives().get(0);
        expect(p.intersectionColor).toEqual(testObject.pyramid.intersectionColor.getValue(time));
        expect(p.showIntersection).toEqual(testObject.pyramid.showIntersection.getValue(time));
        expect(p.radius).toEqual(testObject.pyramid.radius.getValue(time));
        expect(p.show).toEqual(testObject.pyramid.show.getValue(time));
        expect(p.material).toEqual(testObject.pyramid.material.getValue(time));
        expect(p.modelMatrix).toEqual(new Matrix4(Matrix3.fromQuaternion(testObject.orientation.getValue(time).conjugate()), testObject.position.getValueCartesian(time)));

        pyramid.show.value = false;
        visualizer.update(time);
        expect(p.show).toEqual(testObject.pyramid.show.getValue(time));
    });

    it('clear hides pyramids.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPyramidVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.orientation = new MockProperty(new Quaternion(0, 0, 0, 1));
        var pyramid = testObject.pyramid = new DynamicPyramid();
        pyramid.directions = new MockProperty([new Spherical(0, 0, 0), new Spherical(1, 0, 0), new Spherical(2, 0, 0), new Spherical(3, 0, 0)]);

        var time = new JulianDate();
        expect(scene.getPrimitives().getLength()).toEqual(0);
        visualizer.update(time);
        expect(scene.getPrimitives().getLength()).toEqual(1);
        expect(scene.getPrimitives().get(0).show).toEqual(true);
        dynamicObjectCollection.clear();
        visualizer.update(time);
        expect(scene.getPrimitives().getLength()).toEqual(1);
        expect(scene.getPrimitives().get(0).show).toEqual(false);
    });

    it('Visualizer sets dynamicObject property.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPyramidVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.orientation = new MockProperty(new Quaternion(0, 0, 0, 1));
        var pyramid = testObject.pyramid = new DynamicPyramid();
        pyramid.directions = new MockProperty([new Spherical(0, 0, 0), new Spherical(1, 0, 0), new Spherical(2, 0, 0), new Spherical(3, 0, 0)]);

        var time = new JulianDate();
        visualizer.update(time);
        expect(scene.getPrimitives().get(0).dynamicObject).toEqual(testObject);
    });

    it('setDynamicObjectCollection removes old objects and add new ones.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.orientation = new MockProperty(new Quaternion(0, 0, 0, 1));
        var pyramid = testObject.pyramid = new DynamicPyramid();
        pyramid.directions = new MockProperty([new Spherical(0, 0, 0), new Spherical(1, 0, 0), new Spherical(2, 0, 0), new Spherical(3, 0, 0)]);

        var dynamicObjectCollection2 = new DynamicObjectCollection();
        var testObject2 = dynamicObjectCollection2.getOrCreateObject('test2');
        testObject2.position = new MockProperty(new Cartesian3(5678, 9101112, 1234));
        testObject2.orientation = new MockProperty(new Quaternion(1, 0, 0, 0));
        var pyramid2 = testObject2.pyramid = new DynamicPyramid();
        pyramid2.directions = new MockProperty([new Spherical(3, 0, 0), new Spherical(2, 0, 0), new Spherical(1, 0, 0), new Spherical(0.5, 0, 0)]);

        visualizer = new DynamicPyramidVisualizer(scene, dynamicObjectCollection);

        var time = new JulianDate();

        visualizer.update(time);
        expect(scene.getPrimitives().getLength()).toEqual(1);
        var pyramidPrimitive = scene.getPrimitives().get(0);
        expect(pyramidPrimitive.dynamicObject).toEqual(testObject);

        visualizer.setDynamicObjectCollection(dynamicObjectCollection2);
        visualizer.update(time);
        expect(scene.getPrimitives().getLength()).toEqual(1);
        pyramidPrimitive = scene.getPrimitives().get(0);
        expect(pyramidPrimitive.dynamicObject).toEqual(testObject2);
    });
});