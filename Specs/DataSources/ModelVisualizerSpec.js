/*global defineSuite*/
defineSuite([
        'DataSources/ModelVisualizer',
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/JulianDate',
        'Core/Transforms',
        'DataSources/BoundingSphereState',
        'DataSources/ConstantPositionProperty',
        'DataSources/ConstantProperty',
        'DataSources/EntityCollection',
        'DataSources/ModelGraphics',
        'Scene/Globe',
        'Specs/createScene',
        'Specs/pollToPromise'
    ], function(
        ModelVisualizer,
        BoundingSphere,
        Cartesian3,
        JulianDate,
        Transforms,
        BoundingSphereState,
        ConstantPositionProperty,
        ConstantProperty,
        EntityCollection,
        ModelGraphics,
        Globe,
        createScene,
        pollToPromise) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var boxUrl = './Data/Models/Box/CesiumBoxTest.gltf';

    var scene;
    var visualizer;

    beforeAll(function() {
        scene = createScene();
        scene.globe = new Globe();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    afterEach(function() {
        visualizer = visualizer && visualizer.destroy();
    });

    it('constructor throws if no scene is passed.', function() {
        expect(function() {
            return new ModelVisualizer();
        }).toThrowDeveloperError();
    });

    it('update throws if no time specified.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new ModelVisualizer(scene, entityCollection);
        expect(function() {
            visualizer.update();
        }).toThrowDeveloperError();
    });

    it('isDestroy returns false until destroyed.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new ModelVisualizer(scene, entityCollection);
        expect(visualizer.isDestroyed()).toEqual(false);
        visualizer.destroy();
        expect(visualizer.isDestroyed()).toEqual(true);
        visualizer = undefined;
    });

    it('removes the listener from the entity collection when destroyed', function() {
        var entityCollection = new EntityCollection();
        var visualizer = new ModelVisualizer(scene, entityCollection);
        expect(entityCollection.collectionChanged.numberOfListeners).toEqual(1);
        visualizer = visualizer.destroy();
        expect(entityCollection.collectionChanged.numberOfListeners).toEqual(0);
    });

    it('object with no model does not create one.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new ModelVisualizer(scene, entityCollection);

        var testObject = entityCollection.getOrCreateEntity('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        visualizer.update(JulianDate.now());
        expect(scene.primitives.length).toEqual(0);
    });

    it('object with no position does not create a model.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new ModelVisualizer(scene, entityCollection);

        var testObject = entityCollection.getOrCreateEntity('test');
        var model = testObject.model = new ModelGraphics();
        model.uri = new ConstantProperty(boxUrl);

        visualizer.update(JulianDate.now());
        expect(scene.primitives.length).toEqual(0);
    });

    it('A ModelGraphics causes a primitive to be created and updated.', function() {
        var time = JulianDate.now();
        var entityCollection = new EntityCollection();
        visualizer = new ModelVisualizer(scene, entityCollection);

        var model = new ModelGraphics();
        model.show = new ConstantProperty(true);
        model.scale = new ConstantProperty(2);
        model.minimumPixelSize = new ConstantProperty(24.0);
        model.uri = new ConstantProperty(boxUrl);

        var testObject = entityCollection.getOrCreateEntity('test');
        testObject.position = new ConstantPositionProperty(Cartesian3.fromDegrees(1, 2, 3));
        testObject.model = model;

        visualizer.update(time);

        expect(scene.primitives.length).toEqual(1);

        var primitive = scene.primitives.get(0);
        visualizer.update(time);
        expect(primitive.show).toEqual(true);
        expect(primitive.scale).toEqual(2);
        expect(primitive.minimumPixelSize).toEqual(24.0);
        expect(primitive.modelMatrix).toEqual(Transforms.eastNorthUpToFixedFrame(Cartesian3.fromDegrees(1, 2, 3), scene.globe.ellipsoid));
    });

    it('removing removes primitives.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new ModelVisualizer(scene, entityCollection);

        var model = new ModelGraphics();
        model.uri = new ConstantProperty(boxUrl);

        var time = JulianDate.now();
        var testObject = entityCollection.getOrCreateEntity('test');
        testObject.position = new ConstantProperty(new Cartesian3(5678, 1234, 1101112));
        testObject.model = model;
        visualizer.update(time);

        expect(scene.primitives.length).toEqual(1);
        visualizer.update(time);
        entityCollection.removeAll();
        visualizer.update(time);
        expect(scene.primitives.length).toEqual(0);
    });

    it('Visualizer sets id property.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new ModelVisualizer(scene, entityCollection);

        var time = JulianDate.now();
        var testObject = entityCollection.getOrCreateEntity('test');
        var model = new ModelGraphics();
        testObject.model = model;

        testObject.position = new ConstantProperty(new Cartesian3(5678, 1234, 1101112));
        model.uri = new ConstantProperty(boxUrl);
        visualizer.update(time);

        var modelPrimitive = scene.primitives.get(0);
        expect(modelPrimitive.id).toEqual(testObject);
    });

    it('Computes bounding sphere.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new ModelVisualizer(scene, entityCollection);

        var time = JulianDate.now();
        var testObject = entityCollection.getOrCreateEntity('test');
        var model = new ModelGraphics();
        testObject.model = model;

        testObject.position = new ConstantProperty(new Cartesian3(5678, 1234, 1101112));
        model.uri = new ConstantProperty(boxUrl);
        visualizer.update(time);

        var modelPrimitive = scene.primitives.get(0);
        var result = new BoundingSphere();
        var state = visualizer.getBoundingSphere(testObject, result);
        expect(state).toBe(BoundingSphereState.PENDING);

        return pollToPromise(function() {
            scene.render();
            state = visualizer.getBoundingSphere(testObject, result);
            return state !== BoundingSphereState.PENDING;
        }).then(function() {
            expect(state).toBe(BoundingSphereState.DONE);
            var expected = BoundingSphere.transform(modelPrimitive.boundingSphere, modelPrimitive.modelMatrix, new BoundingSphere());
            expect(result).toEqual(expected);
        });
    });

    it('Fails bounding sphere for entity without billboard.', function() {
        var entityCollection = new EntityCollection();
        var testObject = entityCollection.getOrCreateEntity('test');
        visualizer = new ModelVisualizer(scene, entityCollection);
        visualizer.update(JulianDate.now());
        var result = new BoundingSphere();
        var state = visualizer.getBoundingSphere(testObject, result);
        expect(state).toBe(BoundingSphereState.FAILED);
    });

    it('Compute bounding sphere throws without entity.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new ModelVisualizer(scene, entityCollection);
        var result = new BoundingSphere();
        expect(function() {
            visualizer.getBoundingSphere(undefined, result);
        }).toThrowDeveloperError();
    });

    it('Compute bounding sphere throws without result.', function() {
        var entityCollection = new EntityCollection();
        var testObject = entityCollection.getOrCreateEntity('test');
        visualizer = new ModelVisualizer(scene, entityCollection);
        expect(function() {
            visualizer.getBoundingSphere(testObject, undefined);
        }).toThrowDeveloperError();
    });
}, 'WebGL');
