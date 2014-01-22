/*global defineSuite*/
defineSuite([
         'DynamicScene/DynamicPolygonVisualizer',
         'Specs/createScene',
         'Specs/destroyScene',
         'DynamicScene/ConstantProperty',
         'Core/Cartesian3',
         'Core/Color',
         'Core/JulianDate',
         'DynamicScene/DynamicEllipse',
         'DynamicScene/DynamicPolygon',
         'DynamicScene/DynamicObjectCollection',
         'DynamicScene/ColorMaterialProperty'
     ], function(
         DynamicPolygonVisualizer,
         createScene,
         destroyScene,
         ConstantProperty,
         Cartesian3,
         Color,
         JulianDate,
         DynamicEllipse,
         DynamicPolygon,
         DynamicObjectCollection,
         ColorMaterialProperty) {
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
            return new DynamicPolygonVisualizer();
        }).toThrowDeveloperError();
    });

    it('constructor sets expected parameters and adds collection to scene.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPolygonVisualizer(scene, dynamicObjectCollection);
        expect(visualizer.getScene()).toEqual(scene);
        expect(visualizer.getDynamicObjectCollection()).toEqual(dynamicObjectCollection);
        expect(scene.getPrimitives().getLength()).toEqual(0);
    });

    it('update throws if no time specified.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPolygonVisualizer(scene, dynamicObjectCollection);
        expect(function() {
            visualizer.update();
        }).toThrowDeveloperError();
    });

    it('update does nothing if no dynamicObjectCollection.', function() {
        visualizer = new DynamicPolygonVisualizer(scene);
        visualizer.update(new JulianDate());
    });

    it('isDestroy returns false until destroyed.', function() {
        visualizer = new DynamicPolygonVisualizer(scene);
        expect(visualizer.isDestroyed()).toEqual(false);
        visualizer.destroy();
        expect(visualizer.isDestroyed()).toEqual(true);
        visualizer = undefined;
    });

    it('object with no polygon does not create one.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPolygonVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.vertexPositions = new ConstantProperty([new Cartesian3(1234, 5678, 9101112), new Cartesian3(5678, 1234, 1101112), new Cartesian3(1234, 5678, 910111)]);
        visualizer.update(new JulianDate());
        expect(scene.getPrimitives().getLength()).toEqual(0);
    });

    it('object with no vertexPosition does not create a polygon.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPolygonVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        var polygon = testObject.polygon = new DynamicPolygon();
        polygon.show = new ConstantProperty(true);

        visualizer.update(new JulianDate());
        expect(scene.getPrimitives().getLength()).toEqual(0);
    });

    it('object with ellipse and no position does not create a polygon.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPolygonVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.ellipse = new DynamicEllipse();
        var polygon = testObject.polygon = new DynamicPolygon();
        polygon.show = new ConstantProperty(true);

        visualizer.update(new JulianDate());
        expect(scene.getPrimitives().getLength()).toEqual(0);
    });

    it('object with ellipse and position properties and no ellipse properties does not create positions.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPolygonVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.ellipse = new DynamicEllipse();
        var polygon = testObject.polygon = new DynamicPolygon();
        polygon.show = new ConstantProperty(true);

        visualizer.update(new JulianDate());
        expect(scene.getPrimitives().getLength()).toEqual(1);
        var primitive = scene.getPrimitives().get(0);
        expect(primitive.getPositions()).toBeUndefined();
    });

    it('DynamicPolygon with ellipse and position creates a primitive and updates it.', function() {
        var time = new JulianDate();

        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPolygonVisualizer(scene, dynamicObjectCollection);
        expect(scene.getPrimitives().getLength()).toEqual(0);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new ConstantProperty(new Cartesian3(1234, 5678, 9101112));
        var polygon = testObject.polygon = new DynamicPolygon();
        polygon.show = new ConstantProperty(true);
        polygon.material = new ColorMaterialProperty();

        var ellipse = testObject.ellipse = new DynamicEllipse();
        ellipse.rotation = new ConstantProperty(0);
        ellipse.semiMajorAxis = new ConstantProperty(1000);
        ellipse.semiMinorAxis = new ConstantProperty(1000);
        visualizer.update(new JulianDate());

        expect(scene.getPrimitives().getLength()).toEqual(1);

        var primitive = scene.getPrimitives().get(0);

        visualizer.update(time);
        expect(primitive.show).toEqual(testObject.polygon.show.getValue(time));
        expect(primitive.material.uniforms).toEqual(testObject.polygon.material.getValue(time));
        expect(primitive.getPositions().length > 0);

    });

    it('A DynamicPolygon causes a primtive to be created and updated.', function() {
        var time = new JulianDate();

        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPolygonVisualizer(scene, dynamicObjectCollection);

        expect(scene.getPrimitives().getLength()).toEqual(0);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.vertexPositions = new ConstantProperty([new Cartesian3(1234, 5678, 9101112), new Cartesian3(5678, 1234, 1101112), new Cartesian3(1234, 5678, 910111)]);

        var polygon = testObject.polygon = new DynamicPolygon();
        polygon.show = new ConstantProperty(true);
        polygon.material = new ColorMaterialProperty();

        visualizer.update(time);

        expect(scene.getPrimitives().getLength()).toEqual(1);

        var primitive = scene.getPrimitives().get(0);

        visualizer.update(time);
        expect(primitive.show).toEqual(testObject.polygon.show.getValue(time));
        expect(primitive.material.uniforms).toEqual(testObject.polygon.material.getValue(time));

        testObject.vertexPositions = new ConstantProperty([new Cartesian3(5678, 1234, 1101112), new Cartesian3(1234, 5678, 9101112), new Cartesian3(1234, 5678, 910111)]);
        polygon.material = new ColorMaterialProperty();

        visualizer.update(time);
        expect(primitive.show).toEqual(testObject.polygon.show.getValue(time));
        expect(primitive.material.uniforms).toEqual(testObject.polygon.material.getValue(time));

        polygon.show = new ConstantProperty(false);
        visualizer.update(time);
        expect(primitive.show).toEqual(testObject.polygon.show.getValue(time));
    });

    it('clear hides primitives.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPolygonVisualizer(scene, dynamicObjectCollection);
        expect(scene.getPrimitives().getLength()).toEqual(0);
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        var time = new JulianDate();

        testObject.vertexPositions = new ConstantProperty([new Cartesian3(5678, 1234, 1101112), new Cartesian3(1234, 5678, 9101112), new Cartesian3(1234, 5678, 910111)]);
        var polygon = testObject.polygon = new DynamicPolygon();
        polygon.show = new ConstantProperty(true);
        visualizer.update(time);

        expect(scene.getPrimitives().getLength()).toEqual(1);
        var primitive = scene.getPrimitives().get(0);

        visualizer.update(time);
        //Clearing won't actually remove the primitive because of the
        //internal cache used by the visualizer, instead it just hides it.
        dynamicObjectCollection.removeAll();
        expect(primitive.show).toEqual(false);
    });

    it('Visualizer sets dynamicObject property.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicPolygonVisualizer(scene, dynamicObjectCollection);

        expect(scene.getPrimitives().getLength()).toEqual(0);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');

        var time = new JulianDate();
        var polygon = testObject.polygon = new DynamicPolygon();

        testObject.vertexPositions = new ConstantProperty([new Cartesian3(5678, 1234, 1101112), new Cartesian3(1234, 5678, 9101112), new Cartesian3(1234, 5678, 910111)]);
        polygon.show = new ConstantProperty(true);

        visualizer.update(time);
        expect(scene.getPrimitives().getLength()).toEqual(1);
        var primitive = scene.getPrimitives().get(0);
        expect(primitive.dynamicObject).toEqual(testObject);
    });

    it('setDynamicObjectCollection removes old objects and add new ones.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.vertexPositions = new ConstantProperty([new Cartesian3(5678, 1234, 1101112), new Cartesian3(1234, 5678, 9101112), new Cartesian3(1234, 5678, 910111)]);
        testObject.polygon = new DynamicPolygon();
        testObject.polygon.show = new ConstantProperty(true);

        var dynamicObjectCollection2 = new DynamicObjectCollection();
        var testObject2 = dynamicObjectCollection2.getOrCreateObject('test2');
        testObject2.vertexPositions = new ConstantProperty([new Cartesian3(1234, 5678, 9101112), new Cartesian3(5678, 1234, 1101112), new Cartesian3(1234, 5678, 910111)]);
        testObject2.polygon = new DynamicPolygon();
        testObject2.polygon.show = new ConstantProperty(true);

        visualizer = new DynamicPolygonVisualizer(scene, dynamicObjectCollection);

        var time = new JulianDate();

        visualizer.update(time);
        expect(scene.getPrimitives().getLength()).toEqual(1);
        var primitive = scene.getPrimitives().get(0);
        expect(primitive.dynamicObject).toEqual(testObject);

        visualizer.setDynamicObjectCollection(dynamicObjectCollection2);
        visualizer.update(time);
        expect(scene.getPrimitives().getLength()).toEqual(1);
        primitive = scene.getPrimitives().get(0);
        expect(primitive.dynamicObject).toEqual(testObject2);
    });
}, 'WebGL');