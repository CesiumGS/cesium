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
         'DynamicScene/DynamicPath'
     ], function(
         DynamicPathVisualizer,
         createScene,
         destroyScene,
         ConstantProperty,
         Cartesian3,
         Color,
         JulianDate,
         DynamicObjectCollection,
         DynamicPath) {
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
        }).toThrow();
    });

    it('constructor sets expected parameters and adds no primitives to scene.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPathVisualizer(scene, dynamicObjectCollection);
        expect(visualizer.getScene()).toEqual(scene);
        expect(visualizer.getDynamicObjectCollection()).toEqual(dynamicObjectCollection);
        expect(scene.getPrimitives().getLength()).toEqual(0);
    });

    it('update throws if no time specified.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPathVisualizer(scene, dynamicObjectCollection);
        expect(function() {
            visualizer.update();
        }).toThrow();
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
        expect(scene.getPrimitives().getLength()).toEqual(0);
    });

    it('object with no position does not create a polyline.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPathVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        var path = testObject.path = new DynamicPath();
        path.show = new ConstantProperty(true);

        visualizer.update(new JulianDate());
        expect(scene.getPrimitives().getLength()).toEqual(0);
    });

    it('A DynamicPath causes a primtive to be created and updated.', function() {
        var time = new JulianDate();

        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPathVisualizer(scene, dynamicObjectCollection);

        expect(scene.getPrimitives().getLength()).toEqual(0);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new ConstantProperty([new Cartesian3(1234, 5678, 9101112), new Cartesian3(5678, 1234, 1101112)]);

        var path = testObject.path = new DynamicPath();
        path.show = new ConstantProperty(true);
        path.color = new ConstantProperty(new Color(0.8, 0.7, 0.6, 0.5));
        path.width = new ConstantProperty(12.5);
        path.outlineColor = new ConstantProperty(new Color(0.1, 0.2, 0.3, 0.4));
        path.outlineWidth = new ConstantProperty(2.5);
        path.leadTime = new ConstantProperty(25);
        path.trailTime = new ConstantProperty(10);

        visualizer.update(time);

        expect(scene.getPrimitives().getLength()).toEqual(1);

        var polylineCollection = scene.getPrimitives().get(0);
        var primitive = polylineCollection.get(0);
        expect(testObject.position.lastStart).toEqual(time.addSeconds(-path.trailTime.getValue()));
        expect(testObject.position.lastStop).toEqual(time.addSeconds(path.leadTime.getValue()));
        expect(primitive.getShow()).toEqual(testObject.path.show.getValue(time));
        expect(primitive.getPositions()).toEqual(testObject.position.getValue(time));
        expect(primitive.getWidth()).toEqual(testObject.path.width.getValue(time));

        var material = primitive.getMaterial();
        expect(material.uniforms.color).toEqual(testObject.path.color.getValue(time));
        expect(material.uniforms.outlineColor).toEqual(testObject.path.outlineColor.getValue(time));
        expect(material.uniforms.outlineWidth).toEqual(testObject.path.outlineWidth.getValue(time));

        testObject.position = new ConstantProperty([new Cartesian3(5678, 1234, 1101112), new Cartesian3(1234, 5678, 9101112)]);
        path.color = new ConstantProperty(new Color(0.1, 0.2, 0.3, 0.4));
        path.width = new ConstantProperty(2.5);
        path.outlineColor = new ConstantProperty(new Color(0.5, 0.6, 0.7, 0.8));
        path.outlineWidth = new ConstantProperty(12.5);

        visualizer.update(time);
        expect(primitive.getShow()).toEqual(testObject.path.show.getValue(time));
        expect(primitive.getPositions()).toEqual(testObject.position.getValue(time));
        expect(primitive.getWidth()).toEqual(testObject.path.width.getValue(time));

        expect(material.uniforms.color).toEqual(testObject.path.color.getValue(time));
        expect(material.uniforms.outlineColor).toEqual(testObject.path.outlineColor.getValue(time));
        expect(material.uniforms.outlineWidth).toEqual(testObject.path.outlineWidth.getValue(time));

        path.show = new ConstantProperty(false);
        visualizer.update(time);
        expect(primitive.getShow()).toEqual(testObject.path.show.getValue(time));
    });

    it('clear hides primitives.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPathVisualizer(scene, dynamicObjectCollection);
        expect(scene.getPrimitives().getLength()).toEqual(0);
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        var time = new JulianDate();

        testObject.position = new ConstantProperty([new Cartesian3(5678, 1234, 1101112), new Cartesian3(1234, 5678, 9101112)]);
        var path = testObject.path = new DynamicPath();
        path.show = new ConstantProperty(true);
        path.leadTime = new ConstantProperty(5);
        path.trailTime = new ConstantProperty(5);
        visualizer.update(time);

        var polylineCollection = scene.getPrimitives().get(0);
        expect(polylineCollection.getLength()).toEqual(1);
        var primitive = polylineCollection.get(0);

        visualizer.update(time);
        //Clearing won't actually remove the primitive because of the
        //internal cache used by the visualizer, instead it just hides it.
        dynamicObjectCollection.clear();
        expect(primitive.getShow()).toEqual(false);
    });

    it('Visualizer sets dynamicObject property.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPathVisualizer(scene, dynamicObjectCollection);

        expect(scene.getPrimitives().getLength()).toEqual(0);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');

        var time = new JulianDate();
        var path = testObject.path = new DynamicPath();

        testObject.position = new ConstantProperty([new Cartesian3(5678, 1234, 1101112), new Cartesian3(1234, 5678, 9101112)]);
        path.show = new ConstantProperty(true);
        path.leadTime = new ConstantProperty(5);
        path.trailTime = new ConstantProperty(5);

        visualizer.update(time);
        var polylineCollection = scene.getPrimitives().get(0);
        expect(polylineCollection.getLength()).toEqual(1);
        var primitive = polylineCollection.get(0);
        expect(primitive.dynamicObject).toEqual(testObject);
    });

    it('setDynamicObjectCollection removes old objects and add new ones.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new ConstantProperty([new Cartesian3(5678, 1234, 1101112), new Cartesian3(1234, 5678, 9101112)]);
        testObject.path = new DynamicPath();
        testObject.path.show = new ConstantProperty(true);
        testObject.path.leadTime = new ConstantProperty(5);
        testObject.path.trailTime = new ConstantProperty(5);

        var dynamicObjectCollection2 = new DynamicObjectCollection();
        var testObject2 = dynamicObjectCollection2.getOrCreateObject('test2');
        testObject2.position = new ConstantProperty([new Cartesian3(1234, 5678, 9101112), new Cartesian3(5678, 1234, 1101112)]);
        testObject2.path = new DynamicPath();
        testObject2.path.show = new ConstantProperty(true);
        testObject2.path.leadTime = new ConstantProperty(5);
        testObject2.path.trailTime = new ConstantProperty(5);

        visualizer = new DynamicPathVisualizer(scene, dynamicObjectCollection);

        var time = new JulianDate();

        visualizer.update(time);
        expect(scene.getPrimitives().getLength()).toEqual(1);
        var polylineCollection = scene.getPrimitives().get(0);
        expect(polylineCollection.getLength()).toEqual(1);
        var primitive = polylineCollection.get(0);
        expect(primitive.dynamicObject).toEqual(testObject);

        visualizer.setDynamicObjectCollection(dynamicObjectCollection2);
        visualizer.update(time);
        expect(scene.getPrimitives().getLength()).toEqual(1);
        polylineCollection = scene.getPrimitives().get(0);
        primitive = polylineCollection.get(0);
        expect(primitive.dynamicObject).toEqual(testObject2);
    });
}, 'WebGL');