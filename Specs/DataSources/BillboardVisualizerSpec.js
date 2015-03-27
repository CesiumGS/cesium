/*global defineSuite*/
defineSuite([
        'DataSources/BillboardVisualizer',
        'Core/BoundingRectangle',
        'Core/BoundingSphere',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Color',
        'Core/JulianDate',
        'Core/NearFarScalar',
        'DataSources/BillboardGraphics',
        'DataSources/BoundingSphereState',
        'DataSources/ConstantProperty',
        'DataSources/EntityCollection',
        'Scene/BillboardCollection',
        'Scene/HorizontalOrigin',
        'Scene/VerticalOrigin',
        'Specs/createScene',
        'Specs/pollToPromise'
    ], function(
        BillboardVisualizer,
        BoundingRectangle,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Color,
        JulianDate,
        NearFarScalar,
        BillboardGraphics,
        BoundingSphereState,
        ConstantProperty,
        EntityCollection,
        BillboardCollection,
        HorizontalOrigin,
        VerticalOrigin,
        createScene,
        pollToPromise) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var scene;
    var visualizer;

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    afterEach(function() {
        visualizer = visualizer && visualizer.destroy();
    });

    it('constructor throws if no scene is passed.', function() {
        expect(function() {
            return new BillboardVisualizer();
        }).toThrowDeveloperError();
    });

    it('update throws if no time specified.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new BillboardVisualizer(scene, entityCollection);
        expect(function() {
            visualizer.update();
        }).toThrowDeveloperError();
    });

    it('isDestroy returns false until destroyed.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new BillboardVisualizer(scene, entityCollection);
        expect(visualizer.isDestroyed()).toEqual(false);
        visualizer.destroy();
        expect(visualizer.isDestroyed()).toEqual(true);
        visualizer = undefined;
    });

    it('removes the listener from the entity collection when destroyed', function() {
        var entityCollection = new EntityCollection();
        var visualizer = new BillboardVisualizer(scene, entityCollection);
        expect(entityCollection.collectionChanged.numberOfListeners).toEqual(1);
        visualizer = visualizer.destroy();
        expect(entityCollection.collectionChanged.numberOfListeners).toEqual(0);
    });

    it('object with no billboard does not create a billboard.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new BillboardVisualizer(scene, entityCollection);

        var testObject = entityCollection.getOrCreateEntity('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        visualizer.update(JulianDate.now());
        expect(scene.primitives.length).toEqual(0);
    });

    it('object with no position does not create a billboard.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new BillboardVisualizer(scene, entityCollection);

        var testObject = entityCollection.getOrCreateEntity('test');
        var billboard = testObject.billboard = new BillboardGraphics();
        billboard.show = new ConstantProperty(true);
        billboard.image = new ConstantProperty('Data/Images/Blue.png');

        visualizer.update(JulianDate.now());
        expect(scene.primitives.length).toEqual(0);
    });

    it('object with no image does not create a billboard.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new BillboardVisualizer(scene, entityCollection);

        var testObject = entityCollection.getOrCreateEntity('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        var billboard = testObject.billboard = new BillboardGraphics();
        billboard.show = new ConstantProperty(true);

        visualizer.update(JulianDate.now());
        expect(scene.primitives.length).toEqual(0);
    });

    it('A BillboardGraphics causes a Billboard to be created and updated.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new BillboardVisualizer(scene, entityCollection);

        var testObject = entityCollection.getOrCreateEntity('test');

        var time = JulianDate.now();
        var billboard = testObject.billboard = new BillboardGraphics();
        var bb;

        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        billboard.show = new ConstantProperty(true);
        billboard.color = new ConstantProperty(new Color(0.5, 0.5, 0.5, 0.5));
        billboard.image = new ConstantProperty('Data/Images/Blue.png');
        billboard.imageSubRegion = new ConstantProperty(new BoundingRectangle(0, 0, 1, 1));
        billboard.eyeOffset = new ConstantProperty(new Cartesian3(1.0, 2.0, 3.0));
        billboard.scale = new ConstantProperty(12.5);
        billboard.rotation = new ConstantProperty(1.5);
        billboard.alignedAxis = new ConstantProperty(Cartesian3.UNIT_Z);
        billboard.horizontalOrigin = new ConstantProperty(HorizontalOrigin.RIGHT);
        billboard.verticalOrigin = new ConstantProperty(VerticalOrigin.TOP);
        billboard.pixelOffset = new ConstantProperty(new Cartesian2(3, 2));
        billboard.width = new ConstantProperty(15);
        billboard.height = new ConstantProperty(5);
        billboard.scaleByDistance = new ConstantProperty(new NearFarScalar());
        billboard.translucencyByDistance = new ConstantProperty(new NearFarScalar());
        billboard.pixelOffsetScaleByDistance = new ConstantProperty(new NearFarScalar(1.0, 0.0, 3.0e9, 0.0));

        visualizer.update(time);

        var billboardCollection = scene.primitives.get(0);
        expect(billboardCollection.length).toEqual(1);

        bb = billboardCollection.get(0);

        return pollToPromise(function() {
            visualizer.update(time);
            return bb.show; //true once the image is loaded.
        }).then(function() {
            expect(bb.position).toEqual(testObject.position.getValue(time));
            expect(bb.color).toEqual(testObject.billboard.color.getValue(time));
            expect(bb.eyeOffset).toEqual(testObject.billboard.eyeOffset.getValue(time));
            expect(bb.scale).toEqual(testObject.billboard.scale.getValue(time));
            expect(bb.rotation).toEqual(testObject.billboard.rotation.getValue(time));
            expect(bb.alignedAxis).toEqual(testObject.billboard.alignedAxis.getValue(time));
            expect(bb.horizontalOrigin).toEqual(testObject.billboard.horizontalOrigin.getValue(time));
            expect(bb.verticalOrigin).toEqual(testObject.billboard.verticalOrigin.getValue(time));
            expect(bb.width).toEqual(testObject.billboard.width.getValue(time));
            expect(bb.height).toEqual(testObject.billboard.height.getValue(time));
            expect(bb.scaleByDistance).toEqual(testObject.billboard.scaleByDistance.getValue(time));
            expect(bb.translucencyByDistance).toEqual(testObject.billboard.translucencyByDistance.getValue(time));
            expect(bb.pixelOffsetScaleByDistance).toEqual(testObject.billboard.pixelOffsetScaleByDistance.getValue(time));
            expect(bb._imageSubRegion).toEqual(testObject.billboard.imageSubRegion.getValue(time));

            billboard.show = new ConstantProperty(false);

            return pollToPromise(function() {
                visualizer.update(time);
                return !bb.show;
            });
        });
    });

    it('Reuses primitives when hiding one and showing another', function() {
        var time = JulianDate.now();
        var entityCollection = new EntityCollection();
        visualizer = new BillboardVisualizer(scene, entityCollection);

        var testObject = entityCollection.getOrCreateEntity('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.billboard = new BillboardGraphics();
        testObject.billboard.image = new ConstantProperty('Data/Images/Blue.png');
        testObject.billboard.show = new ConstantProperty(true);

        visualizer.update(time);

        var billboardCollection = scene.primitives.get(0);
        expect(billboardCollection.length).toEqual(1);

        testObject.billboard.show = new ConstantProperty(false);

        visualizer.update(time);

        expect(billboardCollection.length).toEqual(1);

        var testObject2 = entityCollection.getOrCreateEntity('test2');
        testObject2.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        testObject2.billboard = new BillboardGraphics();
        testObject2.billboard.image = new ConstantProperty('Data/Images/Blue.png');
        testObject2.billboard.show = new ConstantProperty(true);

        visualizer.update(time);
        expect(billboardCollection.length).toEqual(1);
    });

    it('clear hides billboards.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new BillboardVisualizer(scene, entityCollection);

        var testObject = entityCollection.getOrCreateEntity('test');

        var time = JulianDate.now();
        var billboard = testObject.billboard = new BillboardGraphics();

        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        billboard.show = new ConstantProperty(true);
        billboard.image = new ConstantProperty('Data/Images/Blue.png');
        visualizer.update(time);

        var billboardCollection = scene.primitives.get(0);
        expect(billboardCollection.length).toEqual(1);
        var bb = billboardCollection.get(0);

        return pollToPromise(function() {
            visualizer.update(time);
            return bb.show;
        }).then(function() {
            //Clearing won't actually remove the billboard because of the
            //internal cache used by the visualizer, instead it just hides it.
            entityCollection.removeAll();
            expect(bb.show).toEqual(false);
        });
    });

    it('Visualizer sets entity property.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new BillboardVisualizer(scene, entityCollection);

        var testObject = entityCollection.getOrCreateEntity('test');
        var time = JulianDate.now();
        var billboard = testObject.billboard = new BillboardGraphics();

        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        billboard.show = new ConstantProperty(true);
        billboard.image = new ConstantProperty('Data/Images/Blue.png');
        visualizer.update(time);

        var billboardCollection = scene.primitives.get(0);
        expect(billboardCollection.length).toEqual(1);
        var bb = billboardCollection.get(0);
        expect(bb.id).toEqual(testObject);
    });

    it('Computes bounding sphere.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new BillboardVisualizer(scene, entityCollection);

        var testObject = entityCollection.getOrCreateEntity('test');
        var time = JulianDate.now();
        var billboard = testObject.billboard = new BillboardGraphics();

        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        billboard.show = new ConstantProperty(true);
        billboard.image = new ConstantProperty('Data/Images/Blue.png');
        visualizer.update(time);

        var result = new BoundingSphere();
        var state = visualizer.getBoundingSphere(testObject, result);

        expect(state).toBe(BoundingSphereState.DONE);
        expect(result.center).toEqual(testObject.position.getValue());
        expect(result.radius).toEqual(0);
    });

    it('Fails bounding sphere for entity without billboard.', function() {
        var entityCollection = new EntityCollection();
        var testObject = entityCollection.getOrCreateEntity('test');
        visualizer = new BillboardVisualizer(scene, entityCollection);
        visualizer.update(JulianDate.now());
        var result = new BoundingSphere();
        var state = visualizer.getBoundingSphere(testObject, result);
        expect(state).toBe(BoundingSphereState.FAILED);
    });

    it('Compute bounding sphere throws without entity.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new BillboardVisualizer(scene, entityCollection);
        var result = new BoundingSphere();
        expect(function() {
            visualizer.getBoundingSphere(undefined, result);
        }).toThrowDeveloperError();
    });

    it('Compute bounding sphere throws without result.', function() {
        var entityCollection = new EntityCollection();
        var testObject = entityCollection.getOrCreateEntity('test');
        visualizer = new BillboardVisualizer(scene, entityCollection);
        expect(function() {
            visualizer.getBoundingSphere(testObject, undefined);
        }).toThrowDeveloperError();
    });
}, 'WebGL');
