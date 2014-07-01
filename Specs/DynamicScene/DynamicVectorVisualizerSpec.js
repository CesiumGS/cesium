/*global defineSuite*/
defineSuite([
        'DynamicScene/DynamicVectorVisualizer',
        'Core/Cartesian3',
        'Core/Color',
        'Core/JulianDate',
        'DynamicScene/ConstantPositionProperty',
        'DynamicScene/ConstantProperty',
        'DynamicScene/DynamicObjectCollection',
        'DynamicScene/DynamicVector',
        'Specs/createScene',
        'Specs/destroyScene'
    ], function(
        DynamicVectorVisualizer,
        Cartesian3,
        Color,
        JulianDate,
        ConstantPositionProperty,
        ConstantProperty,
        DynamicObjectCollection,
        DynamicVector,
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
            return new DynamicVectorVisualizer();
        }).toThrowDeveloperError();
    });

    it('constructor adds collection to scene.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicVectorVisualizer(scene, dynamicObjectCollection);
        expect(scene.primitives.length).toEqual(1);
    });

    it('update throws if no time specified.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicVectorVisualizer(scene, dynamicObjectCollection);
        expect(function() {
            visualizer.update();
        }).toThrowDeveloperError();
    });

    it('isDestroy returns false until destroyed.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicVectorVisualizer(scene, dynamicObjectCollection);
        expect(visualizer.isDestroyed()).toEqual(false);
        visualizer.destroy();
        expect(visualizer.isDestroyed()).toEqual(true);
        visualizer = undefined;
    });

    it('object with no vector does not create one.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicVectorVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        visualizer.update(JulianDate.now());
        expect(scene.primitives.length).toEqual(1);
        var polylineCollection = scene.primitives.get(0);
        expect(polylineCollection.length).toEqual(0);
    });

    it('object with no vertexPosition does not create a vector.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicVectorVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        var vector = testObject.vector = new DynamicVector();
        vector.show = new ConstantProperty(true);

        visualizer.update(JulianDate.now());
        expect(scene.primitives.length).toEqual(1);
        var polylineCollection = scene.primitives.get(0);
        expect(polylineCollection.length).toEqual(0);
    });

    it('A DynamicVector causes a primtive to be created and updated.', function() {
        var time = JulianDate.now();

        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicVectorVisualizer(scene, dynamicObjectCollection);

        expect(scene.primitives.length).toEqual(1);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));

        var vector = testObject.vector = new DynamicVector();
        vector.show = new ConstantProperty(true);
        vector.color = new ConstantProperty(new Color(0.8, 0.7, 0.6, 0.5));
        vector.width = new ConstantProperty(12.5);
        vector.length = new ConstantProperty(13.5);
        vector.direction = new ConstantProperty(new Cartesian3(1, 2, 3));

        visualizer.update(time);

        expect(scene.primitives.length).toEqual(1);

        var polylineCollection = scene.primitives.get(0);
        var primitive = polylineCollection.get(0);
        visualizer.update(time);
        expect(primitive.show).toEqual(testObject.vector.show.getValue(time));
        expect(primitive.positions).toEqual([testObject.position.getValue(time), Cartesian3.add(testObject.position.getValue(time), Cartesian3.multiplyByScalar(Cartesian3.normalize(vector.direction.getValue(time), new Cartesian3()), vector.length.getValue(time), new Cartesian3()), new Cartesian3())]);
        expect(primitive.width).toEqual(testObject.vector.width.getValue(time));

        var material = primitive.material;
        expect(material.uniforms.color).toEqual(testObject.vector.color.getValue(time));

        testObject.position = new ConstantProperty(new Cartesian3(5678, 1234, 1101112));
        vector.color = new ConstantProperty(new Color(0.1, 0.2, 0.3, 0.4));
        vector.width = new ConstantProperty(2.5);

        visualizer.update(time);
        expect(primitive.show).toEqual(testObject.vector.show.getValue(time));

        expect(primitive.positions).toEqual([testObject.position.getValue(time), Cartesian3.add(testObject.position.getValue(time), Cartesian3.multiplyByScalar(Cartesian3.normalize(vector.direction.getValue(time), new Cartesian3()), vector.length.getValue(time), new Cartesian3()), new Cartesian3())]);
        expect(primitive.width).toEqual(testObject.vector.width.getValue(time));

        material = primitive.material;
        expect(material.uniforms.color).toEqual(testObject.vector.color.getValue(time));

        vector.show = new ConstantProperty(false);
        visualizer.update(time);
        expect(primitive.show).toEqual(testObject.vector.show.getValue(time));
    });

    it('clear hides primitives.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicVectorVisualizer(scene, dynamicObjectCollection);
        expect(scene.primitives.length).toEqual(1);
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        var time = JulianDate.now();

        testObject.position = new ConstantProperty(new Cartesian3(5678, 1234, 1101112));
        var vector = testObject.vector = new DynamicVector();
        vector.show = new ConstantProperty(true);
        vector.color = new ConstantProperty(new Color(0.8, 0.7, 0.6, 0.5));
        vector.width = new ConstantProperty(12.5);
        vector.length = new ConstantProperty(13.5);
        vector.direction = new ConstantProperty(new Cartesian3(1, 2, 3));
        visualizer.update(time);

        var polylineCollection = scene.primitives.get(0);
        expect(polylineCollection.length).toEqual(1);
        var primitive = polylineCollection.get(0);

        visualizer.update(time);
        //Clearing won't actually remove the primitive because of the
        //internal cache used by the visualizer, instead it just hides it.
        dynamicObjectCollection.removeAll();
        expect(primitive.show).toEqual(false);
    });

    it('Visualizer sets dynamicObject property.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicVectorVisualizer(scene, dynamicObjectCollection);

        expect(scene.primitives.length).toEqual(1);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');

        var time = JulianDate.now();
        var vector = testObject.vector = new DynamicVector();

        testObject.position = new ConstantProperty(new Cartesian3(5678, 1234, 1101112));
        vector.show = new ConstantProperty(true);
        vector.color = new ConstantProperty(new Color(0.8, 0.7, 0.6, 0.5));
        vector.width = new ConstantProperty(12.5);
        vector.length = new ConstantProperty(13.5);
        vector.direction = new ConstantProperty(new Cartesian3(1, 2, 3));

        visualizer.update(time);
        var polylineCollection = scene.primitives.get(0);
        expect(polylineCollection.length).toEqual(1);
        var primitive = polylineCollection.get(0);
        expect(primitive.id).toEqual(testObject);
    });
}, 'WebGL');
