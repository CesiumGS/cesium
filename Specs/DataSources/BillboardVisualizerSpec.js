/*global defineSuite*/
defineSuite([
        'DataSources/BillboardVisualizer',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Color',
        'Core/JulianDate',
        'Core/NearFarScalar',
        'DataSources/BillboardGraphics',
        'DataSources/ConstantProperty',
        'DataSources/EntityCollection',
        'Scene/BillboardCollection',
        'Scene/HorizontalOrigin',
        'Scene/VerticalOrigin',
        'Specs/createScene',
        'Specs/destroyScene'
    ], function(
        BillboardVisualizer,
        Cartesian2,
        Cartesian3,
        Color,
        JulianDate,
        NearFarScalar,
        BillboardGraphics,
        ConstantProperty,
        EntityCollection,
        BillboardCollection,
        HorizontalOrigin,
        VerticalOrigin,
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
            return new BillboardVisualizer();
        }).toThrowDeveloperError();
    });

    it('constructor adds collection to scene.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new BillboardVisualizer(scene, entityCollection);
        var billboardCollection = scene.primitives.get(0);
        expect(billboardCollection instanceof BillboardCollection).toEqual(true);
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
        var billboardCollection = scene.primitives.get(0);
        expect(billboardCollection.length).toEqual(0);
    });

    it('object with no position does not create a billboard.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new BillboardVisualizer(scene, entityCollection);

        var testObject = entityCollection.getOrCreateEntity('test');
        var billboard = testObject.billboard = new BillboardGraphics();
        billboard.show = new ConstantProperty(true);
        billboard.image = new ConstantProperty('Data/Images/Blue.png');

        visualizer.update(JulianDate.now());
        var billboardCollection = scene.primitives.get(0);
        expect(billboardCollection.length).toEqual(0);
    });

    it('object with no image does not create a billboard.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new BillboardVisualizer(scene, entityCollection);

        var testObject = entityCollection.getOrCreateEntity('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        var billboard = testObject.billboard = new BillboardGraphics();
        billboard.show = new ConstantProperty(true);

        visualizer.update(JulianDate.now());
        var billboardCollection = scene.primitives.get(0);
        expect(billboardCollection.length).toEqual(0);
    });

    it('A BillboardGraphics causes a Billboard to be created and updated.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new BillboardVisualizer(scene, entityCollection);

        var billboardCollection = scene.primitives.get(0);
        expect(billboardCollection.length).toEqual(0);

        var testObject = entityCollection.getOrCreateEntity('test');

        var time = JulianDate.now();
        var billboard = testObject.billboard = new BillboardGraphics();
        var bb;

        runs(function() {
            testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
            billboard.show = new ConstantProperty(true);
            billboard.color = new ConstantProperty(new Color(0.5, 0.5, 0.5, 0.5));
            billboard.image = new ConstantProperty('Data/Images/Blue.png');
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

            expect(billboardCollection.length).toEqual(1);

            bb = billboardCollection.get(0);

            waitsFor(function() {
                visualizer.update(time);
                if (bb.show) {
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
                }
                return bb.show; //true once the image is loaded.
            });
        });

        runs(function() {
            billboard.show = new ConstantProperty(false);

            waitsFor(function() {
                visualizer.update(time);
                return !bb.show;
            });
        });
    });

    it('clear hides billboards.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new BillboardVisualizer(scene, entityCollection);

        var billboardCollection = scene.primitives.get(0);
        expect(billboardCollection.length).toEqual(0);

        var testObject = entityCollection.getOrCreateEntity('test');

        var time = JulianDate.now();
        var billboard = testObject.billboard = new BillboardGraphics();

        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        billboard.show = new ConstantProperty(true);
        billboard.image = new ConstantProperty('Data/Images/Blue.png');
        visualizer.update(time);
        expect(billboardCollection.length).toEqual(1);
        var bb = billboardCollection.get(0);

        waitsFor(function() {
            visualizer.update(time);
            if (bb.show) {
                //Clearing won't actually remove the billboard because of the
                //internal cache used by the visualizer, instead it just hides it.
                entityCollection.removeAll();
                expect(bb.show).toEqual(false);
                return true;
            }
            return false;
        });
    });

    it('Visualizer sets entity property.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new BillboardVisualizer(scene, entityCollection);

        var billboardCollection = scene.primitives.get(0);
        expect(billboardCollection.length).toEqual(0);

        var testObject = entityCollection.getOrCreateEntity('test');

        var time = JulianDate.now();
        var billboard = testObject.billboard = new BillboardGraphics();

        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        billboard.show = new ConstantProperty(true);
        billboard.image = new ConstantProperty('Data/Images/Blue.png');
        visualizer.update(time);
        expect(billboardCollection.length).toEqual(1);
        var bb = billboardCollection.get(0);
        expect(bb.id).toEqual(testObject);
    });
}, 'WebGL');
