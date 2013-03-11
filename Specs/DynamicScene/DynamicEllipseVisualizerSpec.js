/*global defineSuite*/
defineSuite([
             'DynamicScene/DynamicEllipseVisualizer',
             'Core/Matrix3',
             'Core/Matrix4',
             'Specs/createScene',
             'Specs/destroyScene',
             'Specs/MockProperty',
             'DynamicScene/DynamicEllipse',
             'DynamicScene/DynamicObjectCollection',
             'DynamicScene/DynamicObject',
             'Scene/Material',
             'Core/JulianDate',
             'Core/Cartesian3',
             'Core/Color',
             'Scene/Scene'
            ], function(
              DynamicEllipseVisualizer,
              Matrix3,
              Matrix4,
              createScene,
              destroyScene,
              MockProperty,
              DynamicEllipse,
              DynamicObjectCollection,
              DynamicObject,
              Material,
              JulianDate,
              Cartesian3,
              Color,
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
            return new DynamicEllipseVisualizer();
        }).toThrow();
    });

    it('constructor sets expected parameters.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicEllipseVisualizer(scene, dynamicObjectCollection);
        expect(visualizer.getScene()).toEqual(scene);
        expect(visualizer.getDynamicObjectCollection()).toEqual(dynamicObjectCollection);
    });

    it('update throws if no time specified.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicEllipseVisualizer(scene, dynamicObjectCollection);
        expect(function() {
            visualizer.update();
        }).toThrow();
    });

    it('update does nothing if no dynamicObjectCollection.', function() {
        visualizer = new DynamicEllipseVisualizer(scene);
        visualizer.update(new JulianDate());
    });

    it('isDestroy returns false until destroyed.', function() {
        visualizer = new DynamicEllipseVisualizer(scene);
        expect(visualizer.isDestroyed()).toEqual(false);
        visualizer.destroy();
        expect(visualizer.isDestroyed()).toEqual(true);
        visualizer = undefined;
    });

    it('object with no ellipse does not create a primitive.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicEllipseVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
        visualizer.update(new JulianDate());
        expect(scene.getPrimitives().getLength()).toEqual(0);
    });

    it('object with no position does not create a primitive.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicEllipseVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        var ellipse = testObject.ellipse = new DynamicEllipse();
        ellipse.semiMajorAxis = new MockProperty(1.0);
        ellipse.semiMinorAxis = new MockProperty(1.0);
        ellipse.bearing = new MockProperty(1.0);

        visualizer.update(new JulianDate());
        expect(scene.getPrimitives().getLength()).toEqual(0);
    });

    it('object with no semiMajorAxis does not create a primitive.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicEllipseVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.ellipse = new DynamicEllipse();
        testObject.ellipse.semiMinorAxis = new MockProperty(1.0);
        testObject.ellipse.bearing = new MockProperty(1.0);
        visualizer.update(new JulianDate());

        expect(scene.getPrimitives().getLength()).toEqual(0);
    });

    it('object with no semiMinorAxis does not create a primitive.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicEllipseVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.ellipse = new DynamicEllipse();
        testObject.ellipse.semiMajorAxis = new MockProperty(1.0);
        testObject.ellipse.bearing = new MockProperty(1.0);
        visualizer.update(new JulianDate());

        expect(scene.getPrimitives().getLength()).toEqual(0);
    });

    it('object with no bearing does not create a primitive.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicEllipseVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));

        testObject.ellipse = new DynamicEllipse();
        testObject.ellipse.semiMajorAxis = new MockProperty(1.0);
        testObject.ellipse.semiMinorAxis = new MockProperty(1.0);
        visualizer.update(new JulianDate());
        expect(scene.getPrimitives().getLength()).toEqual(0);
    });

    it('A DynamicEllipse causes a EllipsePrimitive to be created and updated.', function() {
        var time = new JulianDate();
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicEllipseVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
        testObject.semiMajorAxis = new MockProperty(1);
        testObject.semiMinorAxis = new MockProperty(2);
        testObject.bearing = new MockProperty(3);

        var ellipse = testObject.ellipse = new DynamicEllipse();

        ellipse.semiMajorAxis = new MockProperty(1);
        ellipse.semiMinorAxis = new MockProperty(2);
        ellipse.bearing = new MockProperty(3);
        ellipse.show = new MockProperty(true);

        var redMaterial = Material.fromType(scene.getContext(), Material.ColorType);
        redMaterial.uniforms.color = Color.RED;
        ellipse.material = new MockProperty(redMaterial);
        visualizer.update(time);

        //we created a polylinecollection and also a polygon with a material for the inner color
        expect(scene.getPrimitives().getLength()).toEqual(2);
        expect(scene.getPrimitives().get(0).getLength()).toEqual(1);
        var p = scene.getPrimitives().get(0).get(0);
        expect(p.getShow()).toEqual(testObject.ellipse.show.getValue(time));

        ellipse.show.value = false;
        visualizer.update(time);
        expect(p.getShow()).toEqual(testObject.ellipse.show.getValue(time));
    });

    it('clear hides ellipses.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicEllipseVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
        var ellipse = testObject.ellipse = new DynamicEllipse();
        ellipse.semiMajorAxis = new MockProperty(1);
        ellipse.semiMinorAxis = new MockProperty(2);
        ellipse.bearing = new MockProperty(3);

        var time = new JulianDate();
        expect(scene.getPrimitives().getLength()).toEqual(0);

        visualizer.update(time);
        expect(scene.getPrimitives().getLength()).toEqual(2);
        expect(scene.getPrimitives().get(0).get(0).getShow()).toEqual(true);
        dynamicObjectCollection.clear();
        visualizer.update(time);
        expect(scene.getPrimitives().getLength()).toEqual(2);
        expect(scene.getPrimitives().get(0).get(0).getShow()).toEqual(false);
    });

    it('Visualizer sets dynamicObject property.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        visualizer = new DynamicEllipseVisualizer(scene, dynamicObjectCollection);

        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
        var ellipse = testObject.ellipse = new DynamicEllipse();
        ellipse.semiMajorAxis = new MockProperty(1);
        ellipse.semiMinorAxis = new MockProperty(2);
        ellipse.bearing = new MockProperty(3);

        var time = new JulianDate();
        visualizer.update(time);
        expect(scene.getPrimitives().get(0).get(0).dynamicObject).toEqual(testObject);
    });

    it('setDynamicObjectCollection removes old objects and add new ones.', function() {
        var dynamicObjectCollection = new DynamicObjectCollection();
        var testObject = dynamicObjectCollection.getOrCreateObject('test');
        testObject.position = new MockProperty(new Cartesian3(1234, 5678, 9101112));
        var ellipse = testObject.ellipse = new DynamicEllipse();
        ellipse.semiMajorAxis = new MockProperty(1);
        ellipse.semiMinorAxis = new MockProperty(2);
        ellipse.bearing = new MockProperty(3);

        var dynamicObjectCollection2 = new DynamicObjectCollection();
        var testObject2 = dynamicObjectCollection2.getOrCreateObject('test2');
        testObject2.position = new MockProperty(new Cartesian3(5678, 9101112, 1234));
        var ellipse2 = testObject2.ellipse = new DynamicEllipse();
        ellipse2.semiMajorAxis = new MockProperty(4);
        ellipse2.semiMinorAxis = new MockProperty(5);
        ellipse2.bearing = new MockProperty(6);

        visualizer = new DynamicEllipseVisualizer(scene, dynamicObjectCollection);

        var time = new JulianDate();

        visualizer.update(time);
        expect(scene.getPrimitives().getLength()).toEqual(2);
        expect(scene.getPrimitives().get(0).getLength()).toEqual(1);
        var ellipsePrimitive = scene.getPrimitives().get(0).get(0);
        expect(ellipsePrimitive.dynamicObject).toEqual(testObject);

        visualizer.setDynamicObjectCollection(dynamicObjectCollection2);
        visualizer.update(time);
        expect(scene.getPrimitives().getLength()).toEqual(2);
        expect(scene.getPrimitives().get(0).getLength()).toEqual(1);
        ellipsePrimitive = scene.getPrimitives().get(0).get(0);
        expect(ellipsePrimitive.dynamicObject).toEqual(testObject2);
    });
}, 'WebGL');