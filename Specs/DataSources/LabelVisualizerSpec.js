/*global defineSuite*/
defineSuite([
        'DataSources/LabelVisualizer',
        'Core/BoundingSphere',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Color',
        'Core/JulianDate',
        'Core/NearFarScalar',
        'DataSources/BoundingSphereState',
        'DataSources/ConstantProperty',
        'DataSources/EntityCollection',
        'DataSources/LabelGraphics',
        'Scene/HorizontalOrigin',
        'Scene/LabelCollection',
        'Scene/LabelStyle',
        'Scene/VerticalOrigin',
        'Specs/createScene'
    ], function(
        LabelVisualizer,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Color,
        JulianDate,
        NearFarScalar,
        BoundingSphereState,
        ConstantProperty,
        EntityCollection,
        LabelGraphics,
        HorizontalOrigin,
        LabelCollection,
        LabelStyle,
        VerticalOrigin,
        createScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

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
            return new LabelVisualizer();
        }).toThrowDeveloperError();
    });

    it('update throws if no time specified.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new LabelVisualizer(scene, entityCollection);
        expect(function() {
            visualizer.update();
        }).toThrowDeveloperError();
    });

    it('isDestroy returns false until destroyed.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new LabelVisualizer(scene, entityCollection);
        expect(visualizer.isDestroyed()).toEqual(false);
        visualizer.destroy();
        expect(visualizer.isDestroyed()).toEqual(true);
        visualizer = undefined;
    });

    it('removes the listener from the entity collection when destroyed', function() {
        var entityCollection = new EntityCollection();
        var visualizer = new LabelVisualizer(scene, entityCollection);
        expect(entityCollection.collectionChanged.numberOfListeners).toEqual(1);
        visualizer = visualizer.destroy();
        expect(entityCollection.collectionChanged.numberOfListeners).toEqual(0);
    });

    it('object with no label does not create a label.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new LabelVisualizer(scene, entityCollection);

        var testObject = entityCollection.getOrCreateEntity('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        visualizer.update(JulianDate.now());
        expect(scene.primitives.get(0)).toBeUndefined();
    });

    it('object with no position does not create a label.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new LabelVisualizer(scene, entityCollection);

        var testObject = entityCollection.getOrCreateEntity('test');
        var label = testObject.label = new LabelGraphics();
        label.show = new ConstantProperty(true);
        label.text = new ConstantProperty('lorum ipsum');

        visualizer.update(JulianDate.now());
        expect(scene.primitives.get(0)).toBeUndefined();
    });

    it('object with no text does not create a label.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new LabelVisualizer(scene, entityCollection);

        var testObject = entityCollection.getOrCreateEntity('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        var label = testObject.label = new LabelGraphics();
        label.show = new ConstantProperty(true);

        visualizer.update(JulianDate.now());
        expect(scene.primitives.get(0)).toBeUndefined();
    });

    it('A LabelGraphics causes a label to be created and updated.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new LabelVisualizer(scene, entityCollection);

        var testObject = entityCollection.getOrCreateEntity('test');

        var time = JulianDate.now();
        var label = testObject.label = new LabelGraphics();
        var l;

        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        label.text = new ConstantProperty('a');
        label.font = new ConstantProperty('sans serif');
        label.style = new ConstantProperty(LabelStyle.FILL);
        label.fillColor = new ConstantProperty(new Color(0.5, 0.8, 0.6, 0.7));
        label.outlineColor = new ConstantProperty(new Color(0.4, 0.3, 0.2, 0.1));
        label.outlineWidth = new ConstantProperty(4.5);
        label.horizontalOrigin = new ConstantProperty(HorizontalOrigin.RIGHT);
        label.verticalOrigin = new ConstantProperty(VerticalOrigin.TOP);
        label.eyeOffset = new ConstantProperty(new Cartesian3(1.0, 2.0, 3.0));
        label.pixelOffset = new ConstantProperty(new Cartesian2(3, 2));
        label.scale = new ConstantProperty(12.5);
        label.show = new ConstantProperty(true);
        label.translucencyByDistance = new ConstantProperty(new NearFarScalar());
        label.pixelOffsetScaleByDistance = new ConstantProperty(new NearFarScalar());

        visualizer.update(time);

        var labelCollection = scene.primitives.get(0);
        expect(labelCollection.length).toEqual(1);

        l = labelCollection.get(0);

        visualizer.update(time);
        expect(l.position).toEqual(testObject.position.getValue(time));
        expect(l.text).toEqual(testObject.label.text.getValue(time));
        expect(l.font).toEqual(testObject.label.font.getValue(time));
        expect(l.style).toEqual(testObject.label.style.getValue(time));
        expect(l.fillColor).toEqual(testObject.label.fillColor.getValue(time));
        expect(l.outlineColor).toEqual(testObject.label.outlineColor.getValue(time));
        expect(l.outlineWidth).toEqual(testObject.label.outlineWidth.getValue(time));
        expect(l.horizontalOrigin).toEqual(testObject.label.horizontalOrigin.getValue(time));
        expect(l.verticalOrigin).toEqual(testObject.label.verticalOrigin.getValue(time));
        expect(l.eyeOffset).toEqual(testObject.label.eyeOffset.getValue(time));
        expect(l.pixelOffset).toEqual(testObject.label.pixelOffset.getValue(time));
        expect(l.scale).toEqual(testObject.label.scale.getValue(time));
        expect(l.show).toEqual(testObject.label.show.getValue(time));
        expect(l.translucencyByDistance).toEqual(testObject.label.translucencyByDistance.getValue(time));
        expect(l.pixelOffsetScaleByDistance).toEqual(testObject.label.pixelOffsetScaleByDistance.getValue(time));

        testObject.position = new ConstantProperty(new Cartesian3(5678, 1234, 1293434));
        label.text = new ConstantProperty('b');
        label.font = new ConstantProperty('serif');
        label.style = new ConstantProperty(LabelStyle.FILL_AND_OUTLINE);
        label.fillColor = new ConstantProperty(new Color(0.1, 0.2, 0.3, 0.4));
        label.outlineColor = new ConstantProperty(new Color(0.8, 0.7, 0.6, 0.5));
        label.outlineWidth = new ConstantProperty(0.5);
        label.horizontalOrigin = new ConstantProperty(HorizontalOrigin.CENTER);
        label.verticalOrigin = new ConstantProperty(VerticalOrigin.BOTTOM);
        label.eyeOffset = new ConstantProperty(new Cartesian3(3.0, 1.0, 2.0));
        label.pixelOffset = new ConstantProperty(new Cartesian2(2, 3));
        label.scale = new ConstantProperty(2.5);
        label.show = new ConstantProperty(true);
        label.translucencyByDistance = new ConstantProperty(new NearFarScalar());
        label.pixelOffsetScaleByDistance = new ConstantProperty(new NearFarScalar());

        visualizer.update(time);
        expect(l.position).toEqual(testObject.position.getValue(time));
        expect(l.text).toEqual(testObject.label.text.getValue(time));
        expect(l.font).toEqual(testObject.label.font.getValue(time));
        expect(l.style).toEqual(testObject.label.style.getValue(time));
        expect(l.fillColor).toEqual(testObject.label.fillColor.getValue(time));
        expect(l.outlineColor).toEqual(testObject.label.outlineColor.getValue(time));
        expect(l.outlineWidth).toEqual(testObject.label.outlineWidth.getValue(time));
        expect(l.horizontalOrigin).toEqual(testObject.label.horizontalOrigin.getValue(time));
        expect(l.verticalOrigin).toEqual(testObject.label.verticalOrigin.getValue(time));
        expect(l.eyeOffset).toEqual(testObject.label.eyeOffset.getValue(time));
        expect(l.pixelOffset).toEqual(testObject.label.pixelOffset.getValue(time));
        expect(l.scale).toEqual(testObject.label.scale.getValue(time));
        expect(l.show).toEqual(testObject.label.show.getValue(time));
        expect(l.translucencyByDistance).toEqual(testObject.label.translucencyByDistance.getValue(time));
        expect(l.pixelOffsetScaleByDistance).toEqual(testObject.label.pixelOffsetScaleByDistance.getValue(time));

        label.show = new ConstantProperty(false);
        visualizer.update(time);
    });

    it('Reuses primitives when hiding one and showing another', function() {
        var time = JulianDate.now();
        var entityCollection = new EntityCollection();
        visualizer = new LabelVisualizer(scene, entityCollection);

        var testObject = entityCollection.getOrCreateEntity('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.label = new LabelGraphics();
        testObject.label.text = new ConstantProperty('a');
        testObject.label.show = new ConstantProperty(true);

        visualizer.update(time);

        var labelCollection = scene.primitives.get(0);
        expect(labelCollection.length).toEqual(1);

        testObject.label.show = new ConstantProperty(false);

        visualizer.update(time);

        expect(labelCollection.length).toEqual(1);

        var testObject2 = entityCollection.getOrCreateEntity('test2');
        testObject2.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        testObject2.label = new LabelGraphics();
        testObject2.label.text = new ConstantProperty('b');
        testObject2.label.show = new ConstantProperty(true);

        visualizer.update(time);
        expect(labelCollection.length).toEqual(1);
    });

    it('clear hides labels.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new LabelVisualizer(scene, entityCollection);

        var testObject = entityCollection.getOrCreateEntity('test');
        var time = JulianDate.now();
        var label = testObject.label = new LabelGraphics();

        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        label.show = new ConstantProperty(true);
        label.text = new ConstantProperty('lorum ipsum');
        visualizer.update(time);

        var labelCollection = scene.primitives.get(0);
        expect(labelCollection.length).toEqual(1);
        var l = labelCollection.get(0);
        expect(l.show).toEqual(true);

        //Clearing won't actually remove the label because of the
        //internal cache used by the visualizer, instead it just hides it.
        entityCollection.removeAll();
        visualizer.update(time);
        expect(l.show).toEqual(false);
    });

    it('Visualizer sets entity property.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new LabelVisualizer(scene, entityCollection);

        var testObject = entityCollection.getOrCreateEntity('test');
        var time = JulianDate.now();
        var label = testObject.label = new LabelGraphics();

        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        label.show = new ConstantProperty(true);
        label.text = new ConstantProperty('lorum ipsum');
        visualizer.update(time);

        var labelCollection = scene.primitives.get(0);
        expect(labelCollection.length).toEqual(1);
        var l = labelCollection.get(0);
        expect(l.id).toEqual(testObject);
    });

    it('Computes bounding sphere.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new LabelVisualizer(scene, entityCollection);

        var testObject = entityCollection.getOrCreateEntity('test');
        var time = JulianDate.now();
        var label = testObject.label = new LabelGraphics();

        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        label.show = new ConstantProperty(true);
        label.text = new ConstantProperty('lorum ipsum');
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
        visualizer = new LabelVisualizer(scene, entityCollection);
        visualizer.update(JulianDate.now());
        var result = new BoundingSphere();
        var state = visualizer.getBoundingSphere(testObject, result);
        expect(state).toBe(BoundingSphereState.FAILED);
    });

    it('Compute bounding sphere throws without entity.', function() {
        var entityCollection = new EntityCollection();
        visualizer = new LabelVisualizer(scene, entityCollection);
        var result = new BoundingSphere();
        expect(function() {
            visualizer.getBoundingSphere(undefined, result);
        }).toThrowDeveloperError();
    });

    it('Compute bounding sphere throws without result.', function() {
        var entityCollection = new EntityCollection();
        var testObject = entityCollection.getOrCreateEntity('test');
        visualizer = new LabelVisualizer(scene, entityCollection);
        expect(function() {
            visualizer.getBoundingSphere(testObject, undefined);
        }).toThrowDeveloperError();
    });
}, 'WebGL');