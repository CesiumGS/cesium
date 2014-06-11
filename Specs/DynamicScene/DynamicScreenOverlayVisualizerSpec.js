/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicScreenOverlayVisualizer',
             'Specs/createScene',
             'Specs/destroyScene',
             'Specs/MockProperty',
             'DynamicScene/DynamicScreenOverlay',
             'DynamicScene/DynamicObjectCollection',
             'DynamicScene/DynamicObject',
             'Scene/Material',
             'Core/BoundingRectangle',
             'Core/JulianDate',
             'Core/Cartesian2',
             'Core/Color',
             'Scene/Scene'
            ], function(
              DynamicScreenOverlayVisualizer,
              createScene,
              destroyScene,
              MockProperty,
              DynamicScreenOverlay,
              DynamicObjectCollection,
              DynamicObject,
              Material,
              BoundingRectangle,
              JulianDate,
              Cartesian2,
              Color,
              Scene) {
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
            return new DynamicScreenOverlayVisualizer();
        }).toThrow();
    });

    it('constructor sets expected parameters.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicScreenOverlayVisualizer(scene, dynamicObjectCollection);
        expect(visualizer.getScene()).toEqual(scene);
        expect(visualizer.getDynamicObjectCollection()).toEqual(dynamicObjectCollection);
    });

    it('update throws if no time specified.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicScreenOverlayVisualizer(scene, dynamicObjectCollection);
        expect(function() {
            visualizer.update();
        }).toThrow();
    });

    it('update does nothing if no dynamicObjectCollection.', function() {
        visualizer = new DynamicScreenOverlayVisualizer(scene);
        visualizer.update(new JulianDate());
    });

    it('isDestroy returns false until destroyed.', function() {
        visualizer = new DynamicScreenOverlayVisualizer(scene);
        expect(visualizer.isDestroyed()).toEqual(false);
        visualizer.destroy();
        expect(visualizer.isDestroyed()).toEqual(true);
        visualizer = undefined;
    });

    it('object with no screenOverlay does not create a primitive.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicScreenOverlayVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian2(1234, 5678));
        testObject.width = new MockProperty(10);
        testObject.height = new MockProperty(10);
        visualizer.update(new JulianDate());
        expect(scene.getPrimitives().getLength()).toEqual(0);
    });

    it('object with no position does not create a primitive.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicScreenOverlayVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.width = new MockProperty(10);
        testObject.height = new MockProperty(10);
        testObject.screenOverlay = new DynamicScreenOverlay();
        visualizer.update(new JulianDate());
        expect(scene.getPrimitives().getLength()).toEqual(0);
    });

    it('object with no width does not create a primitive.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicScreenOverlayVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian2(1, 2));
        testObject.height = new MockProperty(10);
        testObject.screenOverlay = new DynamicScreenOverlay();
        visualizer.update(new JulianDate());
        expect(scene.getPrimitives().getLength()).toEqual(0);
    });

    it('object with no height does not create a primitive.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicScreenOverlayVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian2(1, 2));
        testObject.width = new MockProperty(10);
        testObject.screenOverlay = new DynamicScreenOverlay();
        visualizer.update(new JulianDate());
        expect(scene.getPrimitives().getLength()).toEqual(0);
    });

    it('A DynamicScreenOverlay causes a ViewportQuad to be created and updated.', function() {
        var time = new JulianDate();
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicScreenOverlayVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian2(1234, 5678));
        testObject.width = new MockProperty(10);
        testObject.height = new MockProperty(10);

        var screenOverlay = testObject.screenOverlay = new DynamicScreenOverlay();
        screenOverlay.position = new MockProperty(new Cartesian2(1111, 2222));
        screenOverlay.width = new MockProperty(456);
        screenOverlay.height = new MockProperty(789);
        screenOverlay.show = new MockProperty(true);
        var redMaterial = Material.fromType(scene.getContext(), Material.ColorType);
        redMaterial.uniforms.color = Color.RED;
        screenOverlay.material = new MockProperty(redMaterial);
        visualizer.update(time);

        expect(scene.getPrimitives().getLength()).toEqual(1);
        var p = scene.getPrimitives().get(0);
        var rectangle = new BoundingRectangle(
                testObject.screenOverlay.position.getValue(time).x,
                testObject.screenOverlay.position.getValue(time).y,
                testObject.screenOverlay.width.getValue(time),
                testObject.screenOverlay.height.getValue(time));
        expect(p.rectangle).toEqual(rectangle);
        expect(p.show).toEqual(testObject.screenOverlay.show.getValue(time));
        expect(p.material).toEqual(testObject.screenOverlay.material.getValue(time));

        screenOverlay.show.value = false;
        visualizer.update(time);
        expect(p.show).toEqual(testObject.screenOverlay.show.getValue(time));
    });

    it('clear hides screenOverlays.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicScreenOverlayVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian2(1234, 5678));
        testObject.width = new MockProperty(10);
        testObject.height = new MockProperty(10);
        var screenOverlay = testObject.screenOverlay = new DynamicScreenOverlay();
        screenOverlay.position = new MockProperty(new Cartesian2(1, 2));
        screenOverlay.width = new MockProperty(456);
        screenOverlay.height = new MockProperty(789);

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
        visualizer = new DynamicScreenOverlayVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian2(1234, 5678));
        testObject.width = new MockProperty(10);
        testObject.height = new MockProperty(10);
        var screenOverlay = testObject.screenOverlay = new DynamicScreenOverlay();
        screenOverlay.position = new MockProperty(new Cartesian2(1, 2));
        screenOverlay.width = new MockProperty(456);
        screenOverlay.height = new MockProperty(789);

        var time = new JulianDate();
        visualizer.update(time);
        expect(scene.getPrimitives().get(0).dynamicObject).toEqual(testObject);
    });

    it('setDynamicObjectCollection removes old objects and add new ones.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian2(1234, 5678));
        testObject.width = new MockProperty(10);
        testObject.height = new MockProperty(10);
        var screenOverlay = testObject.screenOverlay = new DynamicScreenOverlay();
        screenOverlay.position = new MockProperty(new Cartesian2(1, 2));
        screenOverlay.width = new MockProperty(456);
        screenOverlay.height = new MockProperty(789);

        var dynamicObjectCollection2 = new DynamicObjectCollection();
        var testObject2 = dynamicObjectCollection2.getOrCreateObject('test2');
        testObject2.position = new MockProperty(new Cartesian2(5678, 9101112));
        testObject2.width = new MockProperty(11);
        testObject2.height = new MockProperty(11);
        var screenOverlay2 = testObject2.screenOverlay = new DynamicScreenOverlay();
        screenOverlay2.position = new MockProperty(new Cartesian2(4, 5));
        screenOverlay2.width = new MockProperty(444);
        screenOverlay2.height = new MockProperty(555);

        visualizer = new DynamicScreenOverlayVisualizer(scene, dynamicObjectCollection);

        var time = new JulianDate();

        visualizer.update(time);
        expect(scene.getPrimitives().getLength()).toEqual(1);
        var screenOverlayPrimitive = scene.getPrimitives().get(0);
        expect(screenOverlayPrimitive.dynamicObject).toEqual(testObject);

        visualizer.setDynamicObjectCollection(dynamicObjectCollection2);
        visualizer.update(time);
        expect(scene.getPrimitives().getLength()).toEqual(1);
        screenOverlayPrimitive = scene.getPrimitives().get(0);
        expect(screenOverlayPrimitive.dynamicObject).toEqual(testObject2);
    });
}, 'WebGL');