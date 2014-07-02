/*global defineSuite*/
defineSuite([
        'DynamicScene/GeometryVisualizer',
        'Core/Cartesian3',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/JulianDate',
        'Core/ShowGeometryInstanceAttribute',
        'DynamicScene/ColorMaterialProperty',
        'DynamicScene/ConstantPositionProperty',
        'DynamicScene/ConstantProperty',
        'DynamicScene/DynamicEllipse',
        'DynamicScene/DynamicObject',
        'DynamicScene/DynamicObjectCollection',
        'DynamicScene/EllipseGeometryUpdater',
        'DynamicScene/GridMaterialProperty',
        'DynamicScene/SampledProperty',
        'Specs/createScene',
        'Specs/destroyScene'
    ], function(
        GeometryVisualizer,
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        JulianDate,
        ShowGeometryInstanceAttribute,
        ColorMaterialProperty,
        ConstantPositionProperty,
        ConstantProperty,
        DynamicEllipse,
        DynamicObject,
        DynamicObjectCollection,
        EllipseGeometryUpdater,
        GridMaterialProperty,
        SampledProperty,
        createScene,
        destroyScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var time = JulianDate.now();

    var scene;
    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        destroyScene(scene);
    });

    it('Can create and destroy', function() {
        var objects = new DynamicObjectCollection();
        var visualizer = new GeometryVisualizer(EllipseGeometryUpdater, scene, objects);
        expect(visualizer.update(time)).toBe(true);
        expect(scene.primitives.length).toBe(0);
        expect(visualizer.isDestroyed()).toBe(false);
        visualizer.destroy();
        expect(visualizer.isDestroyed()).toBe(true);
    });

    it('Creates and removes static color open geometry', function() {
        var objects = new DynamicObjectCollection();
        var visualizer = new GeometryVisualizer(EllipseGeometryUpdater, scene, objects);

        var ellipse = new DynamicEllipse();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.material = new ColorMaterialProperty();

        var dynamicObject = new DynamicObject();
        dynamicObject.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        dynamicObject.ellipse = ellipse;
        objects.add(dynamicObject);

        waitsFor(function() {
            scene.initializeFrame();
            var isUpdated = visualizer.update(time);
            scene.render(time);
            return isUpdated;
        });

        runs(function() {
            var primitive = scene.primitives.get(0);
            var attributes = primitive.getGeometryInstanceAttributes(dynamicObject);
            expect(attributes).toBeDefined();
            expect(attributes.show).toEqual(ShowGeometryInstanceAttribute.toValue(true));
            expect(attributes.color).toEqual(ColorGeometryInstanceAttribute.toValue(Color.WHITE));
            expect(primitive.appearance).toBeInstanceOf(EllipseGeometryUpdater.perInstanceColorAppearanceType);
            expect(primitive.appearance.closed).toBe(false);

            objects.remove(dynamicObject);
            scene.initializeFrame();
            expect(visualizer.update(time)).toBe(true);
            scene.render(time);

            expect(scene.primitives.length).toBe(0);

            visualizer.destroy();
        });
    });

    it('Creates and removes static material open geometry', function() {
        var objects = new DynamicObjectCollection();
        var visualizer = new GeometryVisualizer(EllipseGeometryUpdater, scene, objects);

        var ellipse = new DynamicEllipse();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.material = new GridMaterialProperty();

        var dynamicObject = new DynamicObject();
        dynamicObject.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        dynamicObject.ellipse = ellipse;
        objects.add(dynamicObject);

        waitsFor(function() {
            scene.initializeFrame();
            var isUpdated = visualizer.update(time);
            scene.render(time);
            return isUpdated;
        });

        runs(function() {
            var primitive = scene.primitives.get(0);
            var attributes = primitive.getGeometryInstanceAttributes(dynamicObject);
            expect(attributes).toBeDefined();
            expect(attributes.show).toEqual(ShowGeometryInstanceAttribute.toValue(true));
            expect(attributes.color).toBeUndefined();
            expect(primitive.appearance).toBeInstanceOf(EllipseGeometryUpdater.materialAppearanceType);
            expect(primitive.appearance.closed).toBe(false);

            objects.remove(dynamicObject);
            scene.initializeFrame();
            expect(visualizer.update(time)).toBe(true);
            scene.render(time);

            expect(scene.primitives.length).toBe(0);

            visualizer.destroy();
        });
    });

    it('Creates and removes static color closed geometry', function() {
        var objects = new DynamicObjectCollection();
        var visualizer = new GeometryVisualizer(EllipseGeometryUpdater, scene, objects);

        var ellipse = new DynamicEllipse();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.material = new ColorMaterialProperty();
        ellipse.extrudedHeight = new ConstantProperty(1000);

        var dynamicObject = new DynamicObject();
        dynamicObject.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        dynamicObject.ellipse = ellipse;
        objects.add(dynamicObject);

        waitsFor(function() {
            scene.initializeFrame();
            var isUpdated = visualizer.update(time);
            scene.render(time);
            return isUpdated;
        });

        runs(function() {
            var primitive = scene.primitives.get(0);
            var attributes = primitive.getGeometryInstanceAttributes(dynamicObject);
            expect(attributes).toBeDefined();
            expect(attributes.show).toEqual(ShowGeometryInstanceAttribute.toValue(true));
            expect(attributes.color).toEqual(ColorGeometryInstanceAttribute.toValue(Color.WHITE));
            expect(primitive.appearance).toBeInstanceOf(EllipseGeometryUpdater.perInstanceColorAppearanceType);
            expect(primitive.appearance.closed).toBe(true);

            objects.remove(dynamicObject);
            scene.initializeFrame();
            expect(visualizer.update(time)).toBe(true);
            scene.render(time);

            expect(scene.primitives.length).toBe(0);

            visualizer.destroy();
        });
    });

    it('Creates and removes static material closed geometry', function() {
        var objects = new DynamicObjectCollection();
        var visualizer = new GeometryVisualizer(EllipseGeometryUpdater, scene, objects);

        var ellipse = new DynamicEllipse();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.material = new GridMaterialProperty();
        ellipse.extrudedHeight = new ConstantProperty(1000);

        var dynamicObject = new DynamicObject();
        dynamicObject.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        dynamicObject.ellipse = ellipse;
        objects.add(dynamicObject);

        waitsFor(function() {
            scene.initializeFrame();
            var isUpdated = visualizer.update(time);
            scene.render(time);
            return isUpdated;
        });

        runs(function() {
            var primitive = scene.primitives.get(0);
            var attributes = primitive.getGeometryInstanceAttributes(dynamicObject);
            expect(attributes).toBeDefined();
            expect(attributes.show).toEqual(ShowGeometryInstanceAttribute.toValue(true));
            expect(attributes.color).toBeUndefined();
            expect(primitive.appearance).toBeInstanceOf(EllipseGeometryUpdater.materialAppearanceType);
            expect(primitive.appearance.closed).toBe(true);

            objects.remove(dynamicObject);
            scene.initializeFrame();
            expect(visualizer.update(time)).toBe(true);
            scene.render(time);

            expect(scene.primitives.length).toBe(0);

            visualizer.destroy();
        });
    });

    it('Creates and removes static outline geometry', function() {
        var objects = new DynamicObjectCollection();
        var visualizer = new GeometryVisualizer(EllipseGeometryUpdater, scene, objects);

        var ellipse = new DynamicEllipse();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.outline = new ConstantProperty(true);
        ellipse.outlineColor = new ConstantProperty(Color.BLUE);
        ellipse.fill = new ConstantProperty(false);

        var dynamicObject = new DynamicObject();
        dynamicObject.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        dynamicObject.ellipse = ellipse;
        objects.add(dynamicObject);

        waitsFor(function() {
            scene.initializeFrame();
            var isUpdated = visualizer.update(time);
            scene.render(time);
            return isUpdated;
        });

        runs(function() {
            var primitive = scene.primitives.get(0);
            var attributes = primitive.getGeometryInstanceAttributes(dynamicObject);
            expect(attributes).toBeDefined();
            expect(attributes.show).toEqual(ShowGeometryInstanceAttribute.toValue(true));
            expect(attributes.color).toEqual(ColorGeometryInstanceAttribute.toValue(Color.BLUE));
            expect(primitive.appearance).toBeInstanceOf(EllipseGeometryUpdater.perInstanceColorAppearanceType);

            objects.remove(dynamicObject);
            scene.initializeFrame();
            expect(visualizer.update(time)).toBe(true);
            scene.render(time);

            expect(scene.primitives.length).toBe(0);

            visualizer.destroy();
        });
    });

    it('Correctly handles geometry changing batches', function() {
        var objects = new DynamicObjectCollection();
        var visualizer = new GeometryVisualizer(EllipseGeometryUpdater, scene, objects);

        var ellipse = new DynamicEllipse();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.material = new ColorMaterialProperty();

        var dynamicObject = new DynamicObject();
        dynamicObject.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        dynamicObject.ellipse = ellipse;
        objects.add(dynamicObject);

        waitsFor(function() {
            scene.initializeFrame();
            var isUpdated = visualizer.update(time);
            scene.render(time);
            return isUpdated;
        });

        var primitive;
        var attributes;

        runs(function() {
            primitive = scene.primitives.get(0);
            attributes = primitive.getGeometryInstanceAttributes(dynamicObject);
            expect(attributes).toBeDefined();
            expect(attributes.show).toEqual(ShowGeometryInstanceAttribute.toValue(true));
            expect(attributes.color).toEqual(ColorGeometryInstanceAttribute.toValue(Color.WHITE));
            expect(primitive.appearance).toBeInstanceOf(EllipseGeometryUpdater.perInstanceColorAppearanceType);

            ellipse.material = new GridMaterialProperty();
        });

        waitsFor(function() {
            scene.initializeFrame();
            var isUpdated = visualizer.update(time);
            scene.render(time);
            return isUpdated;
        });

        runs(function() {
            primitive = scene.primitives.get(0);
            attributes = primitive.getGeometryInstanceAttributes(dynamicObject);
            expect(attributes).toBeDefined();
            expect(attributes.show).toEqual(ShowGeometryInstanceAttribute.toValue(true));
            expect(attributes.color).toBeUndefined();
            expect(primitive.appearance).toBeInstanceOf(EllipseGeometryUpdater.materialAppearanceType);

            objects.remove(dynamicObject);
            scene.initializeFrame();
            expect(visualizer.update(time)).toBe(true);
            scene.render(time);

            expect(scene.primitives.length).toBe(0);

            visualizer.destroy();
        });

    });

    it('Creates and removes dynamic geometry', function() {
        var objects = new DynamicObjectCollection();
        var visualizer = new GeometryVisualizer(EllipseGeometryUpdater, scene, objects);

        var ellipse = new DynamicEllipse();
        ellipse.semiMajorAxis = new SampledProperty(Number);
        ellipse.semiMajorAxis.addSample(time, 2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.material = new ColorMaterialProperty();

        var dynamicObject = new DynamicObject();
        dynamicObject.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        dynamicObject.ellipse = ellipse;
        objects.add(dynamicObject);

        scene.initializeFrame();
        expect(visualizer.update(time)).toBe(true);
        scene.render(time);
        objects.remove(dynamicObject);
        scene.initializeFrame();
        expect(visualizer.update(time)).toBe(true);
        scene.render(time);
        expect(scene.primitives.length).toBe(0);
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

    it('Update throws without time parameter', function() {
        var visualizer = new GeometryVisualizer(EllipseGeometryUpdater, scene, new DynamicObjectCollection());
        expect(function() {
            visualizer.update(undefined);
        }).toThrowDeveloperError();
    });
}, 'WebGL');
