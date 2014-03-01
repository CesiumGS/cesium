/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicVectorVisualizer',
             'Specs/createScene',
             'Specs/destroyScene',
             'DynamicScene/ConstantProperty',
             'DynamicScene/ConstantPositionProperty',
             'DynamicScene/DynamicEllipse',
             'DynamicScene/DynamicVector',
             'DynamicScene/DynamicObjectCollection',
             'DynamicScene/DynamicObject',
             'Core/JulianDate',
             'Core/Cartesian2',
             'Core/Cartesian3',
             'Core/Color',
             'Scene/Scene'
            ], function(
                    DynamicVectorVisualizer,
                    createScene,
                    destroyScene,
                    ConstantProperty,
                    ConstantPositionProperty,
                    DynamicEllipse,
                    DynamicVector,
                    DynamicObjectCollection,
                    DynamicObject,
                    JulianDate,
                    Cartesian2,
                    Cartesian3,
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
            return new DynamicVectorVisualizer();
        }).toThrowDeveloperError();
    });

    it('constructor sets expected parameters and adds collection to scene.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicVectorVisualizer(scene, dynamicObjectCollection);
        expect(visualizer.getScene()).toEqual(scene);
        expect(visualizer.getDynamicObjectCollection()).toEqual(dynamicObjectCollection);
        expect(scene.primitives.length).toEqual(1);
    });

    it('update throws if no time specified.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicVectorVisualizer(scene, dynamicObjectCollection);
        expect(function() {
            visualizer.update();
        }).toThrowDeveloperError();
    });

    it('update does nothing if no dynamicObjectCollection.', function() {
        visualizer = new DynamicVectorVisualizer(scene);
        visualizer.update(new JulianDate());
    });

    it('isDestroy returns false until destroyed.', function() {
        visualizer = new DynamicVectorVisualizer(scene);
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
        visualizer.update(new JulianDate());
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

        visualizer.update(new JulianDate());
        expect(scene.primitives.length).toEqual(1);
        var polylineCollection = scene.primitives.get(0);
        expect(polylineCollection.length).toEqual(0);
    });

    it('A DynamicVector causes a primtive to be created and updated.', function() {
        var time = new JulianDate();

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
        expect(primitive.getShow()).toEqual(testObject.vector.show.getValue(time));
        expect(primitive.getPositions()).toEqual([testObject.position.getValue(time), Cartesian3.add(testObject.position.getValue(time), Cartesian3.multiplyByScalar(Cartesian3.normalize(vector.direction.getValue(time)), vector.length.getValue(time)))]);
        expect(primitive.getWidth()).toEqual(testObject.vector.width.getValue(time));

        var material = primitive.getMaterial();
        expect(material.uniforms.color).toEqual(testObject.vector.color.getValue(time));

        testObject.position = new ConstantProperty(new Cartesian3(5678, 1234, 1101112));
        vector.color = new ConstantProperty(new Color(0.1, 0.2, 0.3, 0.4));
        vector.width = new ConstantProperty(2.5);

        visualizer.update(time);
        expect(primitive.getShow()).toEqual(testObject.vector.show.getValue(time));

        expect(primitive.getPositions()).toEqual([testObject.position.getValue(time), Cartesian3.add(testObject.position.getValue(time), Cartesian3.multiplyByScalar(Cartesian3.normalize(vector.direction.getValue(time)), vector.length.getValue(time)))]);
        expect(primitive.getWidth()).toEqual(testObject.vector.width.getValue(time));

        material = primitive.getMaterial();
        expect(material.uniforms.color).toEqual(testObject.vector.color.getValue(time));

        vector.show = new ConstantProperty(false);
        visualizer.update(time);
        expect(primitive.getShow()).toEqual(testObject.vector.show.getValue(time));
    });

    it('clear hides primitives.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicVectorVisualizer(scene, dynamicObjectCollection);
        expect(scene.primitives.length).toEqual(1);
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        var time = new JulianDate();

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
        expect(primitive.getShow()).toEqual(false);
    });

    it('Visualizer sets dynamicObject property.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicVectorVisualizer(scene, dynamicObjectCollection);

        expect(scene.primitives.length).toEqual(1);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');

        var time = new JulianDate();
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

    it('setDynamicObjectCollection removes old objects and add new ones.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new ConstantProperty(new Cartesian3(5678, 1234, 1101112));
        testObject.vector = new DynamicVector();
        testObject.vector.show = new ConstantProperty(true);
        testObject.vector.color = new ConstantProperty(new Color(0.8, 0.7, 0.6, 0.5));
        testObject.vector.width = new ConstantProperty(12.5);
        testObject.vector.length = new ConstantProperty(13.5);
        testObject.vector.direction = new ConstantProperty(new Cartesian3(1, 2, 3));

        var dynamicObjectCollection2 = new DynamicObjectCollection();
        var testObject2 = dynamicObjectCollection2.getOrCreateObject('test2');
        testObject2.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        testObject2.vector = new DynamicVector();
        testObject2.vector.show = new ConstantProperty(true);
        testObject2.vector.color = new ConstantProperty(new Color(0.8, 0.7, 0.6, 0.5));
        testObject2.vector.width = new ConstantProperty(12.5);
        testObject2.vector.length = new ConstantProperty(13.5);
        testObject2.vector.direction = new ConstantProperty(new Cartesian3(1, 2, 3));

        visualizer = new DynamicVectorVisualizer(scene, dynamicObjectCollection);

        var time = new JulianDate();

        visualizer.update(time);
        expect(scene.primitives.length).toEqual(1);
        var polylineCollection = scene.primitives.get(0);
        expect(polylineCollection.length).toEqual(1);
        var primitive = polylineCollection.get(0);
        expect(primitive.id).toEqual(testObject);

        visualizer.setDynamicObjectCollection(dynamicObjectCollection2);
        visualizer.update(time);
        expect(scene.primitives.length).toEqual(1);
        primitive = polylineCollection.get(0);
        expect(primitive.id).toEqual(testObject2);
    });
}, 'WebGL');
