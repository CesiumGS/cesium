/*global defineSuite*/
defineSuite([
        'DataSources/PointVisualizer',
        'Core/Cartesian3',
        'Core/Color',
        'Core/JulianDate',
        'Core/NearFarScalar',
        'DataSources/ConstantProperty',
        'DataSources/EntityCollection',
        'DataSources/PointGraphics',
        'Scene/BillboardCollection',
        'Specs/createScene',
        'Specs/destroyScene'
    ], function(
        PointVisualizer,
        Cartesian3,
        Color,
        JulianDate,
        NearFarScalar,
        ConstantProperty,
        EntityCollection,
        PointGraphics,
        BillboardCollection,
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
            return new PointVisualizer();
        }).toThrowDeveloperError();
    });

    it('constructor adds collection to scene.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new PointVisualizer(scene, entityCollection);
        expect(scene.primitives.length).toEqual(1);
        var billboardCollection = scene.primitives.get(0);
        expect(billboardCollection instanceof BillboardCollection).toEqual(true);
    });

    it('update throws if no time specified.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new PointVisualizer(scene, entityCollection);
        expect(function() {
            visualizer.update();
        }).toThrowDeveloperError();
    });

    it('isDestroy returns false until destroyed.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new PointVisualizer(scene, entityCollection);
        expect(visualizer.isDestroyed()).toEqual(false);
        visualizer.destroy();
        expect(visualizer.isDestroyed()).toEqual(true);
        visualizer = undefined;
    });

    it('removes the listener from the entity collection when destroyed', function() {
        var entityCollection = new EntityCollection();
        var visualizer = new PointVisualizer(scene, entityCollection);
        expect(entityCollection.collectionChanged.numberOfListeners).toEqual(1);
        visualizer = visualizer.destroy();
        expect(entityCollection.collectionChanged.numberOfListeners).toEqual(0);
    });

    it('object with no point does not create a billboard.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new PointVisualizer(scene, entityCollection);

        var testObject = entityCollection.getOrCreateEntity('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        visualizer.update(JulianDate.now());
        var billboardCollection = scene.primitives.get(0);
        expect(billboardCollection.length).toEqual(0);
    });

    it('object with no position does not create a billboard.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new PointVisualizer(scene, entityCollection);

        var testObject = entityCollection.getOrCreateEntity('test');
        var point = testObject.point = new PointGraphics();
        point.show = new ConstantProperty(true);

        visualizer.update(JulianDate.now());
        var billboardCollection = scene.primitives.get(0);
        expect(billboardCollection.length).toEqual(0);
    });

    it('A PointGraphics causes a Billboard to be created and updated.', function() {
        var time = JulianDate.now();

        var entityCollection = new EntityCollection();
        visualizer = new PointVisualizer(scene, entityCollection);

        var billboardCollection = scene.primitives.get(0);
        expect(billboardCollection.length).toEqual(0);

        var testObject = entityCollection.getOrCreateEntity('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));

        var point = testObject.point = new PointGraphics();
        point.show = new ConstantProperty(true);
        point.color = new ConstantProperty(new Color(0.8, 0.7, 0.6, 0.5));
        point.pixelSize = new ConstantProperty(12.5);
        point.outlineColor = new ConstantProperty(new Color(0.1, 0.2, 0.3, 0.4));
        point.outlineWidth = new ConstantProperty(2.5);
        point.scaleByDistance = new ConstantProperty(new NearFarScalar());

        visualizer.update(time);

        expect(billboardCollection.length).toEqual(1);

        var bb = billboardCollection.get(0);

        visualizer.update(time);
        expect(bb.show).toEqual(testObject.point.show.getValue(time));
        expect(bb.position).toEqual(testObject.position.getValue(time));
        expect(bb.scaleByDistance).toEqual(testObject.point.scaleByDistance.getValue(time));
        expect(bb._visualizerColor).toEqual(testObject.point.color.getValue(time));
        expect(bb._visualizerOutlineColor).toEqual(testObject.point.outlineColor.getValue(time));
        expect(bb._visualizerOutlineWidth).toEqual(testObject.point.outlineWidth.getValue(time));
        expect(bb._visualizerPixelSize).toEqual(testObject.point.pixelSize.getValue(time));

        //There used to be a caching but with point visualizers.
        //In order to verify it actually detect changes properly, we modify existing values
        //here rather than creating new ones.
        new Cartesian3(5678, 1234, 1293434).clone(testObject.position.value);
        new Color(0.1, 0.2, 0.3, 0.4).clone(point.color.value);
        point.pixelSize.value = 2.5;
        new Color(0.5, 0.6, 0.7, 0.8).clone(point.outlineColor.value);
        point.outlineWidth.value = 12.5;

        visualizer.update(time);
        expect(bb.show).toEqual(testObject.point.show.getValue(time));
        expect(bb.position).toEqual(testObject.position.getValue(time));
        expect(bb.scaleByDistance).toEqual(testObject.point.scaleByDistance.getValue(time));
        expect(bb._visualizerColor).toEqual(testObject.point.color.getValue(time));
        expect(bb._visualizerOutlineColor).toEqual(testObject.point.outlineColor.getValue(time));
        expect(bb._visualizerOutlineWidth).toEqual(testObject.point.outlineWidth.getValue(time));
        expect(bb._visualizerPixelSize).toEqual(testObject.point.pixelSize.getValue(time));

        point.show = new ConstantProperty(false);
        visualizer.update(time);
        expect(bb.show).toEqual(testObject.point.show.getValue(time));
    });

    it('clear hides billboards.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new PointVisualizer(scene, entityCollection);
        var billboardCollection = scene.primitives.get(0);
        expect(billboardCollection.length).toEqual(0);
        var testObject = entityCollection.getOrCreateEntity('test');
        var time = JulianDate.now();

        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        var point = testObject.point = new PointGraphics();
        point.show = new ConstantProperty(true);
        visualizer.update(time);

        expect(billboardCollection.length).toEqual(1);
        var bb = billboardCollection.get(0);

        visualizer.update(time);
        //Clearing won't actually remove the billboard because of the
        //internal cache used by the visualizer, instead it just hides it.
        entityCollection.removeAll();
        expect(bb.show).toEqual(false);
    });

    it('Visualizer sets entity property.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new PointVisualizer(scene, entityCollection);

        var billboardCollection = scene.primitives.get(0);
        expect(billboardCollection.length).toEqual(0);

        var testObject = entityCollection.getOrCreateEntity('test');

        var time = JulianDate.now();
        var point = testObject.point = new PointGraphics();

        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        point.show = new ConstantProperty(true);

        visualizer.update(time);
        expect(billboardCollection.length).toEqual(1);
        var bb = billboardCollection.get(0);
        expect(bb.id).toEqual(testObject);
    });
}, 'WebGL');