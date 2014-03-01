/*global defineSuite*/
defineSuite([
         'DynamicScene/DynamicPathVisualizer',
         'Specs/createScene',
         'Specs/destroyScene',
         'DynamicScene/ConstantProperty',
         'Core/Cartesian3',
         'Core/Color',
         'Core/JulianDate',
         'DynamicScene/DynamicObjectCollection',
         'DynamicScene/DynamicPath',
         'DynamicScene/SampledPositionProperty'
     ], function(
         DynamicPathVisualizer,
         createScene,
         destroyScene,
         ConstantProperty,
         Cartesian3,
         Color,
         JulianDate,
         DynamicObjectCollection,
         DynamicPath,
         SampledPositionProperty) {
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
            return new DynamicPathVisualizer();
        }).toThrowDeveloperError();
    });

    it('constructor sets expected parameters and adds no primitives to scene.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPathVisualizer(scene, dynamicObjectCollection);
        expect(visualizer.getScene()).toEqual(scene);
        expect(visualizer.getDynamicObjectCollection()).toEqual(dynamicObjectCollection);
        expect(scene.primitives.length).toEqual(0);
    });

    it('update throws if no time specified.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPathVisualizer(scene, dynamicObjectCollection);
        expect(function() {
            visualizer.update();
        }).toThrowDeveloperError();
    });

    it('update does nothing if no dynamicObjectCollection.', function() {
        visualizer = new DynamicPathVisualizer(scene);
        visualizer.update(new JulianDate());
    });

    it('isDestroy returns false until destroyed.', function() {
        visualizer = new DynamicPathVisualizer(scene);
        expect(visualizer.isDestroyed()).toEqual(false);
        visualizer.destroy();
        expect(visualizer.isDestroyed()).toEqual(true);
        visualizer = undefined;
    });

    it('object with no path does not create one.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPathVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new ConstantProperty([new Cartesian3(1234, 5678, 9101112), new Cartesian3(5678, 1234, 1101112)]);
        visualizer.update(new JulianDate());
        expect(scene.primitives.length).toEqual(0);
    });

    it('object with no position does not create a polyline.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPathVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        var path = testObject.path = new DynamicPath();
        path.show = new ConstantProperty(true);

        visualizer.update(new JulianDate());
        expect(scene.primitives.length).toEqual(0);
    });

    it('A DynamicPath causes a primtive to be created and updated.', function() {
        var times = [new JulianDate(0, 0), new JulianDate(1, 0)];
        var updateTime = new JulianDate(0.5, 0);
        var positions = [new Cartesian3(1234, 5678, 9101112), new Cartesian3(5678, 1234, 1101112)];

        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPathVisualizer(scene, dynamicObjectCollection);

        expect(scene.primitives.length).toEqual(0);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        var position = new SampledPositionProperty();
        testObject.position = position;
        position.addSamples(times, positions);

        var path = testObject.path = new DynamicPath();
        path.show = new ConstantProperty(true);
        path.color = new ConstantProperty(new Color(0.8, 0.7, 0.6, 0.5));
        path.width = new ConstantProperty(12.5);
        path.outlineColor = new ConstantProperty(new Color(0.1, 0.2, 0.3, 0.4));
        path.outlineWidth = new ConstantProperty(2.5);
        path.leadTime = new ConstantProperty(25);
        path.trailTime = new ConstantProperty(10);

        visualizer.update(updateTime);

        expect(scene.primitives.length).toEqual(1);

        var polylineCollection = scene.primitives.get(0);
        var primitive = polylineCollection.get(0);
        expect(primitive.getPositions()[0]).toEqual(testObject.position.getValue(updateTime.addSeconds(-path.trailTime.getValue())));
        expect(primitive.getPositions()[1]).toEqual(testObject.position.getValue(updateTime));
        expect(primitive.getPositions()[2]).toEqual(testObject.position.getValue(updateTime.addSeconds(path.leadTime.getValue())));
        expect(primitive.getShow()).toEqual(testObject.path.show.getValue(updateTime));
        expect(primitive.getWidth()).toEqual(testObject.path.width.getValue(updateTime));

        var material = primitive.getMaterial();
        expect(material.uniforms.color).toEqual(testObject.path.color.getValue(updateTime));
        expect(material.uniforms.outlineColor).toEqual(testObject.path.outlineColor.getValue(updateTime));
        expect(material.uniforms.outlineWidth).toEqual(testObject.path.outlineWidth.getValue(updateTime));

        path.show = new ConstantProperty(false);
        visualizer.update(updateTime);
        expect(primitive.getShow()).toEqual(testObject.path.show.getValue(updateTime));
    });

    it('clear hides primitives.', function() {
        var times = [new JulianDate(0, 0), new JulianDate(1, 0)];
        var updateTime = new JulianDate(0.5, 0);
        var positions = [new Cartesian3(1234, 5678, 9101112), new Cartesian3(5678, 1234, 1101112)];

        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPathVisualizer(scene, dynamicObjectCollection);

        expect(scene.primitives.length).toEqual(0);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        var position = new SampledPositionProperty();
        testObject.position = position;
        position.addSamples(times, positions);

        var path = testObject.path = new DynamicPath();
        path.show = new ConstantProperty(true);
        path.color = new ConstantProperty(new Color(0.8, 0.7, 0.6, 0.5));
        path.width = new ConstantProperty(12.5);
        path.outlineColor = new ConstantProperty(new Color(0.1, 0.2, 0.3, 0.4));
        path.outlineWidth = new ConstantProperty(2.5);
        path.leadTime = new ConstantProperty(25);
        path.trailTime = new ConstantProperty(10);

        visualizer.update(updateTime);

        expect(scene.primitives.length).toEqual(1);

        var polylineCollection = scene.primitives.get(0);
        var primitive = polylineCollection.get(0);

        visualizer.update(updateTime);
        //Clearing won't actually remove the primitive because of the
        //internal cache used by the visualizer, instead it just hides it.
        dynamicObjectCollection.removeAll();
        expect(primitive.getShow()).toEqual(false);
    });

    it('Visualizer sets dynamicObject property.', function() {
        var times = [new JulianDate(0, 0), new JulianDate(1, 0)];
        var updateTime = new JulianDate(0.5, 0);
        var positions = [new Cartesian3(1234, 5678, 9101112), new Cartesian3(5678, 1234, 1101112)];

        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPathVisualizer(scene, dynamicObjectCollection);

        expect(scene.primitives.length).toEqual(0);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        var position = new SampledPositionProperty();
        testObject.position = position;
        position.addSamples(times, positions);

        var path = testObject.path = new DynamicPath();
        path.show = new ConstantProperty(true);
        path.color = new ConstantProperty(new Color(0.8, 0.7, 0.6, 0.5));
        path.width = new ConstantProperty(12.5);
        path.outlineColor = new ConstantProperty(new Color(0.1, 0.2, 0.3, 0.4));
        path.outlineWidth = new ConstantProperty(2.5);
        path.leadTime = new ConstantProperty(25);
        path.trailTime = new ConstantProperty(10);

        visualizer.update(updateTime);
        var polylineCollection = scene.primitives.get(0);
        var primitive = polylineCollection.get(0);
        expect(primitive.id).toEqual(testObject);
    });

    it('setDynamicObjectCollection removes old objects and add new ones.', function() {
        var times = [new JulianDate(0, 0), new JulianDate(1, 0)];
        var updateTime = new JulianDate(0.5, 0);
        var positions = [new Cartesian3(1234, 5678, 9101112), new Cartesian3(5678, 1234, 1101112)];

        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPathVisualizer(scene, dynamicObjectCollection);

        expect(scene.primitives.length).toEqual(0);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        var position = new SampledPositionProperty();
        testObject.position = position;
        position.addSamples(times, positions);

        var path = testObject.path = new DynamicPath();
        path.show = new ConstantProperty(true);
        path.color = new ConstantProperty(new Color(0.8, 0.7, 0.6, 0.5));
        path.width = new ConstantProperty(12.5);
        path.outlineColor = new ConstantProperty(new Color(0.1, 0.2, 0.3, 0.4));
        path.outlineWidth = new ConstantProperty(2.5);
        path.leadTime = new ConstantProperty(25);
        path.trailTime = new ConstantProperty(10);

        visualizer.update(updateTime);

        var dynamicObjectCollection2 = new DynamicObjectCollection();
        var testObject2 = dynamicObjectCollection2.getOrCreateObject('test2');
        var position2 = new SampledPositionProperty();
        testObject2.position = position;
        position2.addSamples(times, positions);

        var path2 = testObject2.path = new DynamicPath();
        path2.show = new ConstantProperty(true);
        path2.color = new ConstantProperty(new Color(0.8, 0.7, 0.6, 0.5));
        path2.width = new ConstantProperty(12.5);
        path2.outlineColor = new ConstantProperty(new Color(0.1, 0.2, 0.3, 0.4));
        path2.outlineWidth = new ConstantProperty(2.5);
        path2.leadTime = new ConstantProperty(25);
        path2.trailTime = new ConstantProperty(10);

        expect(scene.primitives.length).toEqual(1);
        var polylineCollection = scene.primitives.get(0);
        expect(polylineCollection.length).toEqual(1);
        var primitive = polylineCollection.get(0);
        expect(primitive.id).toEqual(testObject);

        visualizer.setDynamicObjectCollection(dynamicObjectCollection2);
        visualizer.update(updateTime);
        expect(scene.primitives.length).toEqual(1);
        polylineCollection = scene.primitives.get(0);
        primitive = polylineCollection.get(0);
        expect(primitive.id).toEqual(testObject2);
    });
}, 'WebGL');