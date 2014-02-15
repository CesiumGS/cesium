/*global defineSuite*/
defineSuite(['DynamicScene/GeometryVisualizer',
             'DynamicScene/DynamicEllipse',
             'DynamicScene/DynamicObjectCollection',
             'DynamicScene/EllipseGeometryUpdater',
             'DynamicScene/ColorMaterialProperty',
             'DynamicScene/ConstantProperty',
             'DynamicScene/ConstantPositionProperty',
             'DynamicScene/DynamicObject',
             'DynamicScene/GridMaterialProperty',
             'Core/Cartesian3',
             'Core/Color',
             'Core/ColorGeometryInstanceAttribute',
             'Core/ShowGeometryInstanceAttribute',
             'Core/JulianDate',
             'Specs/createScene',
             'Specs/destroyScene'
            ], function(
              GeometryVisualizer,
              DynamicEllipse,
              DynamicObjectCollection,
              EllipseGeometryUpdater,
              ColorMaterialProperty,
              ConstantProperty,
              ConstantPositionProperty,
              DynamicObject,
              GridMaterialProperty,
              Cartesian3,
              Color,
              ColorGeometryInstanceAttribute,
              ShowGeometryInstanceAttribute,
              JulianDate,
              createScene,
              destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var time = new JulianDate();

    var scene;
    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        destroyScene(scene);
    });

    it('Constructor sets expected values', function() {
        var objects = new DynamicObjectCollection();
        var visualizer = new GeometryVisualizer(EllipseGeometryUpdater, scene, objects);
        expect(visualizer.getScene()).toBe(scene);
        expect(visualizer.getDynamicObjectCollection()).toBe(objects);
        visualizer.update(time);
        expect(scene.primitives.length).toBe(0);
        expect(visualizer.isDestroyed()).toBe(false);
        visualizer.destroy();
        expect(visualizer.isDestroyed()).toBe(true);

        visualizer = new GeometryVisualizer(EllipseGeometryUpdater, scene);
        expect(visualizer.getDynamicObjectCollection()).toBeUndefined();
        visualizer.update(time);
        expect(scene.primitives.length).toBe(0);
        visualizer.destroy();
    });

    it('Creates and removes static color primitives', function() {
        var objects = new DynamicObjectCollection();
        var visualizer = new GeometryVisualizer(EllipseGeometryUpdater, scene, objects);

        var ellipse = new DynamicEllipse();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);

        var dynamicObject = new DynamicObject();
        dynamicObject.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        dynamicObject.ellipse = ellipse;
        objects.add(dynamicObject);

        scene.initializeFrame();
        visualizer.update(time);
        scene.render(time);

        expect(scene.primitives.length).toBe(1);

        var primitive = scene.primitives.get(0);
        var attributes = primitive.getGeometryInstanceAttributes(dynamicObject);
        expect(attributes).toBeDefined();
        expect(attributes.show).toEqual(ShowGeometryInstanceAttribute.toValue(true));
        expect(attributes.color).toEqual(ColorGeometryInstanceAttribute.toValue(Color.WHITE));
        expect(primitive.appearance).toBeInstanceOf(EllipseGeometryUpdater.PerInstanceColorAppearanceType);

        objects.remove(dynamicObject);
        scene.initializeFrame();
        visualizer.update(time);
        scene.render(time);

        expect(scene.primitives.length).toBe(0);

        visualizer.destroy();
    });


    it('Correctly handles changing appearance type', function() {
        var objects = new DynamicObjectCollection();
        var visualizer = new GeometryVisualizer(EllipseGeometryUpdater, scene, objects);

        var ellipse = new DynamicEllipse();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);

        var dynamicObject = new DynamicObject();
        dynamicObject.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        dynamicObject.ellipse = ellipse;
        objects.add(dynamicObject);

        scene.initializeFrame();
        visualizer.update(time);
        scene.render(time);

        dynamicObject.ellipse.material = new GridMaterialProperty();

        scene.initializeFrame();
        visualizer.update(time);
        scene.render(time);

        var primitive = scene.primitives.get(0);
        var attributes = primitive.getGeometryInstanceAttributes(dynamicObject);
        expect(attributes).toBeDefined();
        expect(attributes.show).toEqual(ShowGeometryInstanceAttribute.toValue(true));
        expect(attributes.color).toBeUndefined();
        expect(primitive.appearance).toBeInstanceOf(EllipseGeometryUpdater.MaterialAppearanceType);

        visualizer.destroy();
    });

    it('Constructor throws without type', function() {
        var objects = new DynamicObjectCollection();
        expect(function() {
            return new GeometryVisualizer(undefined, scene, objects);
        }).toThrowDeveloperError();
    });

    it('Constructor throws without scene', function() {
        var objects = new DynamicObjectCollection();
        expect(function() {
            return new GeometryVisualizer(EllipseGeometryUpdater, undefined, objects);
        }).toThrowDeveloperError();
    });
}, 'WebGL');