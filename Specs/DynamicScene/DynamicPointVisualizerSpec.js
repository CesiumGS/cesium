/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicPointVisualizer',
             'Specs/createScene',
             'Specs/destroyScene',
             'Specs/MockProperty',
             'DynamicScene/DynamicPoint',
             'DynamicScene/DynamicObjectCollection',
             'Core/JulianDate',
             'Core/Cartesian3',
             'Core/Color',
             'Scene/BillboardCollection'
            ], function(
              DynamicPointVisualizer,
              createScene,
              destroyScene,
              MockProperty,
              DynamicPoint,
              DynamicObjectCollection,
              JulianDate,
              Cartesian3,
              Color,
              BillboardCollection) {
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
            return new DynamicPointVisualizer();
        }).toThrow();
    });

    it('constructor sets expected parameters and adds collection to scene.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPointVisualizer(scene, dynamicObjectCollection);
        expect(visualizer.getScene()).toEqual(scene);
        expect(visualizer.getDynamicObjectCollection()).toEqual(dynamicObjectCollection);
        expect(scene.getPrimitives().getLength()).toEqual(1);
        var billboardCollection = scene.getPrimitives().get(0);
        expect(billboardCollection instanceof BillboardCollection).toEqual(true);
    });

    it('update throws if no time specified.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPointVisualizer(scene, dynamicObjectCollection);
        expect(function() {
            visualizer.update();
        }).toThrow();
    });

    it('update does nothing if no dynamicObjectCollection.', function() {
        visualizer = new DynamicPointVisualizer(scene);
        visualizer.update(new JulianDate());
    });

    it('isDestroy returns false until destroyed.', function() {
        visualizer = new DynamicPointVisualizer(scene);
        expect(visualizer.isDestroyed()).toEqual(false);
        visualizer.destroy();
        expect(visualizer.isDestroyed()).toEqual(true);
        visualizer = undefined;
    });

    it('object with no point does not create a billboard.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPointVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
        visualizer.update(new JulianDate());
        var billboardCollection = scene.getPrimitives().get(0);
        expect(billboardCollection.getLength()).toEqual(0);
    });

    it('object with no position does not create a billboard.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPointVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        var point = testObject.point = new DynamicPoint();
        point.show = new MockProperty(true);

        visualizer.update(new JulianDate());
        var billboardCollection = scene.getPrimitives().get(0);
        expect(billboardCollection.getLength()).toEqual(0);
    });

    it('A DynamicPoint causes a Billboard to be created and updated.', function() {
        var time = new JulianDate();

        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPointVisualizer(scene, dynamicObjectCollection);

        var billboardCollection = scene.getPrimitives().get(0);
        expect(billboardCollection.getLength()).toEqual(0);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));

        var point = testObject.point = new DynamicPoint();
        point.show = new MockProperty(true);
        point.color = new MockProperty(new Color(0.8, 0.7, 0.6, 0.5));
        point.pixelSize = new MockProperty(12.5);
        point.outlineColor = new MockProperty(new Color(0.1, 0.2, 0.3, 0.4));
        point.outlineWidth = new MockProperty(2.5);

        visualizer.update(time);

        expect(billboardCollection.getLength()).toEqual(1);

        var bb = billboardCollection.get(0);

        visualizer.update(time);
        expect(bb.getShow()).toEqual(testObject.point.show.getValue(time));
        expect(bb.getPosition()).toEqual(testObject.position.getValueCartesian(time));
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
        expect(bb.getShow()).toEqual(testObject.point.show.getValue(time));
        expect(bb.getPosition()).toEqual(testObject.position.getValueCartesian(time));
        expect(bb._visualizerColor).toEqual(testObject.point.color.getValue(time));
        expect(bb._visualizerOutlineColor).toEqual(testObject.point.outlineColor.getValue(time));
        expect(bb._visualizerOutlineWidth).toEqual(testObject.point.outlineWidth.getValue(time));
        expect(bb._visualizerPixelSize).toEqual(testObject.point.pixelSize.getValue(time));

        point.show = new MockProperty(false);
        visualizer.update(time);
        expect(bb.getShow()).toEqual(testObject.point.show.getValue(time));
    });

    it('clear hides billboards.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPointVisualizer(scene, dynamicObjectCollection);
        var billboardCollection = scene.getPrimitives().get(0);
        expect(billboardCollection.getLength()).toEqual(0);
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        var time = new JulianDate();

        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
        var point = testObject.point = new DynamicPoint();
        point.show = new MockProperty(true);
        visualizer.update(time);

        expect(billboardCollection.getLength()).toEqual(1);
        var bb = billboardCollection.get(0);

        visualizer.update(time);
        //Clearing won't actually remove the billboard because of the
        //internal cache used by the visualizer, instead it just hides it.
        dynamicObjectCollection.clear();
        expect(bb.getShow()).toEqual(false);
    });

    it('Visualizer sets dynamicObject property.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPointVisualizer(scene, dynamicObjectCollection);

        var billboardCollection = scene.getPrimitives().get(0);
        expect(billboardCollection.getLength()).toEqual(0);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');

        var time = new JulianDate();
        var point = testObject.point = new DynamicPoint();

        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
        point.show = new MockProperty(true);

        visualizer.update(time);
        expect(billboardCollection.getLength()).toEqual(1);
        var bb = billboardCollection.get(0);
        expect(bb.dynamicObject).toEqual(testObject);
    });

    it('setDynamicObjectCollection removes old objects and add new ones.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.point = new DynamicPoint();
        testObject.point.show = new MockProperty(true);

        var dynamicObjectCollection2 = new DynamicObjectCollection();
        var testObject2 = dynamicObjectCollection2.getOrCreateObject('test2');
        testObject2.position = new MockProperty(new Cartesian3(5678, 9101112, 1234));
        testObject2.point = new DynamicPoint();
        testObject2.point.show = new MockProperty(true);

        visualizer = new DynamicPointVisualizer(scene, dynamicObjectCollection);

        var time = new JulianDate();
        var billboardCollection = scene.getPrimitives().get(0);

        visualizer.update(time);
        expect(billboardCollection.getLength()).toEqual(1);
        var bb = billboardCollection.get(0);
        expect(bb.dynamicObject).toEqual(testObject);

        visualizer.setDynamicObjectCollection(dynamicObjectCollection2);
        visualizer.update(time);
        expect(billboardCollection.getLength()).toEqual(1);
        bb = billboardCollection.get(0);
        expect(bb.dynamicObject).toEqual(testObject2);
    });
}, 'WebGL');