/*global defineSuite*/
defineSuite([
        'DynamicScene/DynamicModelVisualizer',
        'Core/Cartesian3',
        'Core/JulianDate',
        'DynamicScene/ConstantPositionProperty',
        'DynamicScene/ConstantProperty',
        'DynamicScene/DynamicModel',
        'DynamicScene/DynamicObjectCollection',
        'Specs/createScene',
        'Specs/destroyScene'
    ], function(
        DynamicModelVisualizer,
        Cartesian3,
        JulianDate,
        ConstantPositionProperty,
        ConstantProperty,
        DynamicModel,
        DynamicObjectCollection,
        createScene,
        destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var duckUrl = './Data/Models/duck/duck.json';

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
            return new DynamicModelVisualizer();
        }).toThrowDeveloperError();
    });

    it('update throws if no time specified.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicModelVisualizer(scene, dynamicObjectCollection);
        expect(function() {
            visualizer.update();
        }).toThrowDeveloperError();
    });

    it('isDestroy returns false until destroyed.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicModelVisualizer(scene, dynamicObjectCollection);
        expect(visualizer.isDestroyed()).toEqual(false);
        visualizer.destroy();
        expect(visualizer.isDestroyed()).toEqual(true);
        visualizer = undefined;
    });

    it('object with no model does not create one.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicModelVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        visualizer.update(JulianDate.now());
        expect(scene.primitives.length).toEqual(0);
    });

    it('object with no position does not create a model.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicModelVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        var model = testObject.model = new DynamicModel();
        model.uri = new ConstantProperty(duckUrl);

        visualizer.update(JulianDate.now());
        expect(scene.primitives.length).toEqual(0);
    });

    it('A DynamicModel causes a primtive to be created and updated.', function() {
        var time = JulianDate.now();
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicModelVisualizer(scene, dynamicObjectCollection);

        var model = new DynamicModel();
        model.show = new ConstantProperty(true);
        model.scale = new ConstantProperty(2);
        model.minimumPixelSize = new ConstantProperty(24.0);
        model.uri = new ConstantProperty(duckUrl);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.model = model;

        visualizer.update(time);

        expect(scene.primitives.length).toEqual(1);

        var primitive = scene.primitives.get(0);
        visualizer.update(time);
        expect(primitive.show).toEqual(true);
        expect(primitive.scale).toEqual(2);
        expect(primitive.minimumPixelSize).toEqual(24.0);
    });

    it('removing removes primitives.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicModelVisualizer(scene, dynamicObjectCollection);

        var model = new DynamicModel();
        model.uri = new ConstantProperty(duckUrl);

        var time = JulianDate.now();
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new ConstantProperty(new Cartesian3(5678, 1234, 1101112));
        testObject.model = model;
        visualizer.update(time);

        expect(scene.primitives.length).toEqual(1);
        visualizer.update(time);
        dynamicObjectCollection.removeAll();
        visualizer.update(time);
        expect(scene.primitives.length).toEqual(0);
    });

    it('Visualizer sets id property.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicModelVisualizer(scene, dynamicObjectCollection);

        var time = JulianDate.now();
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        var model = new DynamicModel();
        testObject.model = model;

        testObject.position = new ConstantProperty(new Cartesian3(5678, 1234, 1101112));
        model.uri = new ConstantProperty(duckUrl);
        visualizer.update(time);

        var modelPrimitive = scene.primitives.get(0);
        expect(modelPrimitive.id).toEqual(testObject);
    });
}, 'WebGL');
