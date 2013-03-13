/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicLabelVisualizer',
             'Specs/createScene',
             'Specs/destroyScene',
             'Specs/MockProperty',
             'DynamicScene/DynamicLabel',
             'DynamicScene/DynamicObjectCollection',
             'DynamicScene/DynamicObject',
             'Core/JulianDate',
             'Core/Cartesian2',
             'Core/Cartesian3',
             'Core/Color',
             'Scene/Scene',
             'Scene/LabelCollection',
             'Scene/HorizontalOrigin',
             'Scene/VerticalOrigin',
             'Scene/LabelStyle'
            ], function(
              DynamicLabelVisualizer,
              createScene,
              destroyScene,
              MockProperty,
              DynamicLabel,
              DynamicObjectCollection,
              DynamicObject,
              JulianDate,
              Cartesian2,
              Cartesian3,
              Color,
              Scene,
              LabelCollection,
              HorizontalOrigin,
              VerticalOrigin,
              LabelStyle) {
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
            return new DynamicLabelVisualizer();
        }).toThrow();
    });

    it('constructor sets expected parameters and adds collection to scene.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicLabelVisualizer(scene, dynamicObjectCollection);
        expect(visualizer.getScene()).toEqual(scene);
        expect(visualizer.getDynamicObjectCollection()).toEqual(dynamicObjectCollection);
        var labelCollection = scene.getPrimitives().get(0);
        expect(labelCollection instanceof LabelCollection).toEqual(true);
    });

    it('update throws if no time specified.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicLabelVisualizer(scene, dynamicObjectCollection);
        expect(function() {
            visualizer.update();
        }).toThrow();
    });

    it('update does nothing if no dynamicObjectCollection.', function() {
        visualizer = new DynamicLabelVisualizer(scene);
        visualizer.update(new JulianDate());
    });

    it('isDestroy returns false until destroyed.', function() {
        visualizer = new DynamicLabelVisualizer(scene);
        expect(visualizer.isDestroyed()).toEqual(false);
        visualizer.destroy();
        expect(visualizer.isDestroyed()).toEqual(true);
        visualizer = undefined;
    });

    it('object with no label does not create a label.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicLabelVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
        visualizer.update(new JulianDate());
        var labelCollection = scene.getPrimitives().get(0);
        expect(labelCollection.getLength()).toEqual(0);
    });

    it('object with no position does not create a label.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicLabelVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        var label = testObject.label = new DynamicLabel();
        label.show = new MockProperty(true);
        label.text = new MockProperty('lorum ipsum');

        visualizer.update(new JulianDate());
        var labelCollection = scene.getPrimitives().get(0);
        expect(labelCollection.getLength()).toEqual(0);
    });

    it('object with no text does not create a label.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicLabelVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
        var label = testObject.label = new DynamicLabel();
        label.show = new MockProperty(true);

        visualizer.update(new JulianDate());
        var labelCollection = scene.getPrimitives().get(0);
        expect(labelCollection.getLength()).toEqual(0);
    });

    it('A DynamicLabel causes a label to be created and updated.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicLabelVisualizer(scene, dynamicObjectCollection);

        var labelCollection = scene.getPrimitives().get(0);
        expect(labelCollection.getLength()).toEqual(0);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');

        var time = new JulianDate();
        var label = testObject.label = new DynamicLabel();
        var l;

        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
        label.text = new MockProperty('a');
        label.font = new MockProperty('sans serif');
        label.style = new MockProperty(LabelStyle.FILL);
        label.fillColor = new MockProperty(new Color(0.5, 0.8, 0.6, 0.7));
        label.outlineColor = new MockProperty(new Color(0.4, 0.3, 0.2, 0.1));
        label.outlineWidth = new MockProperty(4.5);
        label.horizontalOrigin = new MockProperty(HorizontalOrigin.RIGHT);
        label.verticalOrigin = new MockProperty(VerticalOrigin.TOP);
        label.eyeOffset = new MockProperty(new Cartesian3(1.0, 2.0, 3.0));
        label.pixelOffset = new MockProperty(new Cartesian2(3, 2));
        label.scale = new MockProperty(12.5);
        label.show = new MockProperty(true);

        visualizer.update(time);

        expect(labelCollection.getLength()).toEqual(1);

        l = labelCollection.get(0);

        visualizer.update(time);
        expect(l.getPosition()).toEqual(testObject.position.getValueCartesian(time));
        expect(l.getText()).toEqual(testObject.label.text.getValue(time));
        expect(l.getFont()).toEqual(testObject.label.font.getValue(time));
        expect(l.getStyle()).toEqual(testObject.label.style.getValue(time));
        expect(l.getFillColor()).toEqual(testObject.label.fillColor.getValue(time));
        expect(l.getOutlineColor()).toEqual(testObject.label.outlineColor.getValue(time));
        expect(l.getOutlineWidth()).toEqual(testObject.label.outlineWidth.getValue(time));
        expect(l.getHorizontalOrigin()).toEqual(testObject.label.horizontalOrigin.getValue(time));
        expect(l.getVerticalOrigin()).toEqual(testObject.label.verticalOrigin.getValue(time));
        expect(l.getEyeOffset()).toEqual(testObject.label.eyeOffset.getValue(time));
        expect(l.getPixelOffset()).toEqual(testObject.label.pixelOffset.getValue(time));
        expect(l.getScale()).toEqual(testObject.label.scale.getValue(time));
        expect(l.getShow()).toEqual(testObject.label.show.getValue(time));

        testObject.position = new MockProperty(new Cartesian3(5678, 1234, 1293434));
        label.text = new MockProperty('b');
        label.font = new MockProperty('serif');
        label.style = new MockProperty(LabelStyle.FILL_AND_OUTLINE);
        label.fillColor = new MockProperty(new Color(0.1, 0.2, 0.3, 0.4));
        label.outlineColor = new MockProperty(new Color(0.8, 0.7, 0.6, 0.5));
        label.outlineWidth = new MockProperty(0.5);
        label.horizontalOrigin = new MockProperty(HorizontalOrigin.CENTER);
        label.verticalOrigin = new MockProperty(VerticalOrigin.BOTTOM);
        label.eyeOffset = new MockProperty(new Cartesian3(3.0, 1.0, 2.0));
        label.pixelOffset = new MockProperty(new Cartesian2(2, 3));
        label.scale = new MockProperty(2.5);
        label.show = new MockProperty(true);

        visualizer.update(time);
        expect(l.getPosition()).toEqual(testObject.position.getValueCartesian(time));
        expect(l.getText()).toEqual(testObject.label.text.getValue(time));
        expect(l.getFont()).toEqual(testObject.label.font.getValue(time));
        expect(l.getStyle()).toEqual(testObject.label.style.getValue(time));
        expect(l.getFillColor()).toEqual(testObject.label.fillColor.getValue(time));
        expect(l.getOutlineColor()).toEqual(testObject.label.outlineColor.getValue(time));
        expect(l.getOutlineWidth()).toEqual(testObject.label.outlineWidth.getValue(time));
        expect(l.getHorizontalOrigin()).toEqual(testObject.label.horizontalOrigin.getValue(time));
        expect(l.getVerticalOrigin()).toEqual(testObject.label.verticalOrigin.getValue(time));
        expect(l.getEyeOffset()).toEqual(testObject.label.eyeOffset.getValue(time));
        expect(l.getPixelOffset()).toEqual(testObject.label.pixelOffset.getValue(time));
        expect(l.getScale()).toEqual(testObject.label.scale.getValue(time));
        expect(l.getShow()).toEqual(testObject.label.show.getValue(time));

        label.show = new MockProperty(false);
        visualizer.update(time);
    });

    it('clear hides labels.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicLabelVisualizer(scene, dynamicObjectCollection);

        var labelCollection = scene.getPrimitives().get(0);
        expect(labelCollection.getLength()).toEqual(0);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');

        var time = new JulianDate();
        var label = testObject.label = new DynamicLabel();

        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
        label.show = new MockProperty(true);
        label.text = new MockProperty('lorum ipsum');
        visualizer.update(time);

        expect(labelCollection.getLength()).toEqual(1);
        var l = labelCollection.get(0);
        expect(l.getShow()).toEqual(true);

        //Clearing won't actually remove the label because of the
        //internal cache used by the visualizer, instead it just hides it.
        dynamicObjectCollection.clear();
        visualizer.update(time);
        expect(l.getShow()).toEqual(false);
    });

    it('Visualizer sets dynamicObject property.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicLabelVisualizer(scene, dynamicObjectCollection);

        var labelCollection = scene.getPrimitives().get(0);
        expect(labelCollection.getLength()).toEqual(0);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');

        var time = new JulianDate();
        var label = testObject.label = new DynamicLabel();

        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
        label.show = new MockProperty(true);
        label.text = new MockProperty('lorum ipsum');
        visualizer.update(time);
        expect(labelCollection.getLength()).toEqual(1);
        var l = labelCollection.get(0);
        expect(l.dynamicObject).toEqual(testObject);
    });

    it('setDynamicObjectCollection removes old objects and add new ones.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.label = new DynamicLabel();
        testObject.label.show = new MockProperty(true);
        testObject.label.text = new MockProperty('lorum ipsum');

        var dynamicObjectCollection2 = new DynamicObjectCollection();
        var testObject2 = dynamicObjectCollection2.getOrCreateObject('test2');
        testObject2.position = new MockProperty(new Cartesian3(5678, 9101112, 1234));
        testObject2.label = new DynamicLabel();
        testObject2.label.show = new MockProperty(true);
        testObject2.label.text = new MockProperty('the quick brown');

        visualizer = new DynamicLabelVisualizer(scene, dynamicObjectCollection);

        var time = new JulianDate();
        var labelCollection = scene.getPrimitives().get(0);

        visualizer.update(time);
        expect(labelCollection.getLength()).toEqual(1);
        var l = labelCollection.get(0);
        expect(l.dynamicObject).toEqual(testObject);

        visualizer.setDynamicObjectCollection(dynamicObjectCollection2);
        visualizer.update(time);
        expect(labelCollection.getLength()).toEqual(1);
        l = labelCollection.get(0);
        expect(l.dynamicObject).toEqual(testObject2);
    });
}, 'WebGL');