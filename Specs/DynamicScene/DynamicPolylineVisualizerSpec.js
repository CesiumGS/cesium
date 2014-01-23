/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicPolylineVisualizer',
             'Specs/createScene',
             'Specs/destroyScene',
             'DynamicScene/ConstantProperty',
             'DynamicScene/DynamicEllipse',
             'DynamicScene/DynamicPolyline',
             'DynamicScene/DynamicObjectCollection',
             'DynamicScene/DynamicObject',
             'DynamicScene/ColorMaterialProperty',
             'Core/JulianDate',
             'Core/Cartesian2',
             'Core/Cartesian3',
             'Scene/Scene'
            ], function(
              DynamicPolylineVisualizer,
              createScene,
              destroyScene,
              ConstantProperty,
              DynamicEllipse,
              DynamicPolyline,
              DynamicObjectCollection,
              DynamicObject,
              ColorMaterialProperty,
              JulianDate,
              Cartesian2,
              Cartesian3,
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
            return new DynamicPolylineVisualizer();
        }).toThrowDeveloperError();
    });

    it('constructor sets expected parameters and adds collection to scene.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPolylineVisualizer(scene, dynamicObjectCollection);
        expect(visualizer.getScene()).toEqual(scene);
        expect(visualizer.getDynamicObjectCollection()).toEqual(dynamicObjectCollection);
        expect(scene.getPrimitives().getLength()).toEqual(1);
    });

    it('update throws if no time specified.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPolylineVisualizer(scene, dynamicObjectCollection);
        expect(function() {
            visualizer.update();
        }).toThrowDeveloperError();
    });

    it('update does nothing if no dynamicObjectCollection.', function() {
        visualizer = new DynamicPolylineVisualizer(scene);
        visualizer.update(new JulianDate());
    });

    it('isDestroy returns false until destroyed.', function() {
        visualizer = new DynamicPolylineVisualizer(scene);
        expect(visualizer.isDestroyed()).toEqual(false);
        visualizer.destroy();
        expect(visualizer.isDestroyed()).toEqual(true);
        visualizer = undefined;
    });

    it('object with no polyline does not create one.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPolylineVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.vertexPositions = new ConstantProperty([new Cartesian3(1234, 5678, 9101112), new Cartesian3(5678, 1234, 1101112)]);
        visualizer.update(new JulianDate());
        expect(scene.getPrimitives().getLength()).toEqual(1);
        var polylineCollection = scene.getPrimitives().get(0);
        expect(polylineCollection.getLength()).toEqual(0);
    });

    it('object with no vertexPosition does not create a polyline.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPolylineVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        var polyline = testObject.polyline = new DynamicPolyline();
        polyline.show = new ConstantProperty(true);

        visualizer.update(new JulianDate());
        expect(scene.getPrimitives().getLength()).toEqual(1);
        var polylineCollection = scene.getPrimitives().get(0);
        expect(polylineCollection.getLength()).toEqual(0);
    });

    it('object with ellipse and no position does not create a polyline.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPolylineVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.ellipse = new DynamicEllipse();
        var polyline = testObject.polyline = new DynamicPolyline();
        polyline.show = new ConstantProperty(true);

        visualizer.update(new JulianDate());
        expect(scene.getPrimitives().getLength()).toEqual(1);
        var polylineCollection = scene.getPrimitives().get(0);
        expect(polylineCollection.getLength()).toEqual(0);
    });

    it('object with ellipse and position properties and no ellipse properties does not create positions.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPolylineVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.ellipse = new DynamicEllipse();
        var polyline = testObject.polyline = new DynamicPolyline();
        polyline.show = new ConstantProperty(true);

        visualizer.update(new JulianDate());
        expect(scene.getPrimitives().getLength()).toEqual(1);
        var polylineCollection = scene.getPrimitives().get(0);
        var primitive = polylineCollection.get(0);
        expect(primitive.getPositions().length).toEqual(0);
    });

    it('DynamicPolyline with ellipse and position creates a primitive and updates it.', function() {
        var time = new JulianDate();

        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPolylineVisualizer(scene, dynamicObjectCollection);
        expect(scene.getPrimitives().getLength()).toEqual(1);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        var polyline = testObject.polyline = new DynamicPolyline();
        polyline.show = new ConstantProperty(true);

        var ellipse = testObject.ellipse = new DynamicEllipse();
        ellipse.rotation = new ConstantProperty(0);
        ellipse.semiMajorAxis = new ConstantProperty(1000);
        ellipse.semiMinorAxis = new ConstantProperty(1000);
        visualizer.update(new JulianDate());

        expect(scene.getPrimitives().getLength()).toEqual(1);
        var polylineCollection = scene.getPrimitives().get(0);
        expect(polylineCollection.getLength()).toEqual(1);
        var primitive = polylineCollection.get(0);
        expect(primitive.getPositions().length).toBeGreaterThan(0);


        visualizer.update(time);
        expect(scene.getPrimitives().getLength()).toEqual(1);
        polylineCollection = scene.getPrimitives().get(0);
        primitive = polylineCollection.get(0);
        expect(primitive.getShow()).toEqual(testObject.polyline.show.getValue(time));
        expect(primitive.getPositions().length > 0);

    });

    it('A DynamicPolyline causes a primtive to be created and updated.', function() {
        var time = new JulianDate();

        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPolylineVisualizer(scene, dynamicObjectCollection);

        expect(scene.getPrimitives().getLength()).toEqual(1);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.vertexPositions = new ConstantProperty([new Cartesian3(1234, 5678, 9101112), new Cartesian3(5678, 1234, 1101112)]);

        var polyline = testObject.polyline = new DynamicPolyline();
        polyline.show = new ConstantProperty(true);
        polyline.material = new ColorMaterialProperty();
        polyline.width = new ConstantProperty(12.5);

        visualizer.update(time);

        expect(scene.getPrimitives().getLength()).toEqual(1);

        var polylineCollection = scene.getPrimitives().get(0);
        var primitive = polylineCollection.get(0);
        visualizer.update(time);
        expect(primitive.getShow()).toEqual(testObject.polyline.show.getValue(time));
        expect(primitive.getPositions()).toEqual(testObject.vertexPositions.getValue(time));
        expect(primitive.getWidth()).toEqual(testObject.polyline.width.getValue(time));

        var material = primitive.getMaterial();
        expect(material.uniforms).toEqual(testObject.polyline.material.getValue(time));

        testObject.vertexPositions = new ConstantProperty([new Cartesian3(5678, 1234, 1101112), new Cartesian3(1234, 5678, 9101112)]);
        polyline.material = new ColorMaterialProperty();
        polyline.width = new ConstantProperty(2.5);

        visualizer.update(time);
        expect(primitive.getShow()).toEqual(testObject.polyline.show.getValue(time));
        expect(primitive.getPositions()).toEqual(testObject.vertexPositions.getValue(time));
        expect(primitive.getWidth()).toEqual(testObject.polyline.width.getValue(time));

        material = primitive.getMaterial();
        expect(material.uniforms).toEqual(testObject.polyline.material.getValue(time));

        polyline.show = new ConstantProperty(false);
        visualizer.update(time);
        expect(primitive.getShow()).toEqual(testObject.polyline.show.getValue(time));
    });

    it('clear hides primitives.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPolylineVisualizer(scene, dynamicObjectCollection);
        expect(scene.getPrimitives().getLength()).toEqual(1);
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        var time = new JulianDate();

        testObject.vertexPositions = new ConstantProperty([new Cartesian3(5678, 1234, 1101112), new Cartesian3(1234, 5678, 9101112)]);
        var polyline = testObject.polyline = new DynamicPolyline();
        polyline.show = new ConstantProperty(true);
        visualizer.update(time);

        var polylineCollection = scene.getPrimitives().get(0);
        expect(polylineCollection.getLength()).toEqual(1);
        var primitive = polylineCollection.get(0);

        visualizer.update(time);
        //Clearing won't actually remove the primitive because of the
        //internal cache used by the visualizer, instead it just hides it.
        dynamicObjectCollection.removeAll();
        expect(primitive.getShow()).toEqual(false);
    });

    it('Visualizer sets dynamicObject property.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPolylineVisualizer(scene, dynamicObjectCollection);

        expect(scene.getPrimitives().getLength()).toEqual(1);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');

        var time = new JulianDate();
        var polyline = testObject.polyline = new DynamicPolyline();

        testObject.vertexPositions = new ConstantProperty([new Cartesian3(5678, 1234, 1101112), new Cartesian3(1234, 5678, 9101112)]);
        polyline.show = new ConstantProperty(true);

        visualizer.update(time);
        var polylineCollection = scene.getPrimitives().get(0);
        expect(polylineCollection.getLength()).toEqual(1);
        var primitive = polylineCollection.get(0);
        expect(primitive.dynamicObject).toEqual(testObject);
    });

    it('setDynamicObjectCollection removes old objects and add new ones.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.vertexPositions = new ConstantProperty([new Cartesian3(5678, 1234, 1101112), new Cartesian3(1234, 5678, 9101112)]);
        testObject.polyline = new DynamicPolyline();
        testObject.polyline.show = new ConstantProperty(true);

        var dynamicObjectCollection2 = new DynamicObjectCollection();
        var testObject2 = dynamicObjectCollection2.getOrCreateObject('test2');
        testObject2.vertexPositions = new ConstantProperty([new Cartesian3(1234, 5678, 9101112), new Cartesian3(5678, 1234, 1101112)]);
        testObject2.polyline = new DynamicPolyline();
        testObject2.polyline.show = new ConstantProperty(true);

        visualizer = new DynamicPolylineVisualizer(scene, dynamicObjectCollection);

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
        primitive = polylineCollection.get(0);
        expect(primitive.dynamicObject).toEqual(testObject2);
    });
}, 'WebGL');