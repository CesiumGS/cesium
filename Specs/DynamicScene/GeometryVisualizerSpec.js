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
             'DynamicScene/SampledProperty',
             'Core/Cartesian3',
             'Core/Color',
             'Core/ColorGeometryInstanceAttribute',
             'Core/ShowGeometryInstanceAttribute',
             'Core/JulianDate',
             'Scene/PrimitiveState',
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
              SampledProperty,
              Cartesian3,
              Color,
              ColorGeometryInstanceAttribute,
              ShowGeometryInstanceAttribute,
              JulianDate,
              PrimitiveState,
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
            visualizer.update(time);
            scene.render(time);
            return scene.primitives.get(0)._state === PrimitiveState.COMPLETE;
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
            visualizer.update(time);
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
            visualizer.update(time);
            scene.render(time);
            return scene.primitives.get(0)._state === PrimitiveState.COMPLETE;
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
            visualizer.update(time);
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
            visualizer.update(time);
            scene.render(time);
            return scene.primitives.get(0)._state === PrimitiveState.COMPLETE;
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
            visualizer.update(time);
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
            visualizer.update(time);
            scene.render(time);
            return scene.primitives.get(0)._state === PrimitiveState.COMPLETE;
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
            visualizer.update(time);
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
            visualizer.update(time);
            scene.render(time);
            return scene.primitives.get(0)._state === PrimitiveState.COMPLETE;
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
            visualizer.update(time);
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
            visualizer.update(time);
            scene.render(time);
            return scene.primitives.get(0)._state === PrimitiveState.COMPLETE;
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
            visualizer.update(time);
            scene.render(time);
            return scene.primitives.get(0)._state === PrimitiveState.COMPLETE;
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
            visualizer.update(time);
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

        waitsFor(function() {
            scene.initializeFrame();
            visualizer.update(time);
            scene.render(time);
            return scene.primitives.get(0)._state === PrimitiveState.COMPLETE;
        });

        runs(function() {
            objects.remove(dynamicObject);
            scene.initializeFrame();
            visualizer.update(time);
            scene.render(time);
            expect(scene.primitives.length).toBe(0);
            visualizer.destroy();
        });
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