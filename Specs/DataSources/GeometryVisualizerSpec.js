/*global defineSuite*/
defineSuite([
        'DataSources/GeometryVisualizer',
        'Core/Cartesian3',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/JulianDate',
        'Core/ShowGeometryInstanceAttribute',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantPositionProperty',
        'DataSources/ConstantProperty',
        'DataSources/EllipseGeometryUpdater',
        'DataSources/EllipseGraphics',
        'DataSources/Entity',
        'DataSources/EntityCollection',
        'DataSources/GridMaterialProperty',
        'DataSources/SampledProperty',
        'DataSources/StaticGeometryPerMaterialBatch',
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
        EllipseGeometryUpdater,
        EllipseGraphics,
        Entity,
        EntityCollection,
        GridMaterialProperty,
        SampledProperty,
        StaticGeometryPerMaterialBatch,
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
        var objects = new EntityCollection();
        var visualizer = new GeometryVisualizer(EllipseGeometryUpdater, scene, objects);
        expect(visualizer.update(time)).toBe(true);
        expect(scene.primitives.length).toBe(0);
        expect(visualizer.isDestroyed()).toBe(false);
        visualizer.destroy();
        expect(visualizer.isDestroyed()).toBe(true);
    });

    it('Creates and removes static color open geometry', function() {
        var objects = new EntityCollection();
        var visualizer = new GeometryVisualizer(EllipseGeometryUpdater, scene, objects);

        var ellipse = new EllipseGraphics();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.material = new ColorMaterialProperty();

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        entity.ellipse = ellipse;
        objects.add(entity);

        waitsFor(function() {
            scene.initializeFrame();
            var isUpdated = visualizer.update(time);
            scene.render(time);
            return isUpdated;
        });

        runs(function() {
            var primitive = scene.primitives.get(0);
            var attributes = primitive.getGeometryInstanceAttributes(entity);
            expect(attributes).toBeDefined();
            expect(attributes.show).toEqual(ShowGeometryInstanceAttribute.toValue(true));
            expect(attributes.color).toEqual(ColorGeometryInstanceAttribute.toValue(Color.WHITE));
            expect(primitive.appearance).toBeInstanceOf(EllipseGeometryUpdater.perInstanceColorAppearanceType);
            expect(primitive.appearance.closed).toBe(false);

            objects.remove(entity);
        });

        waitsFor(function() {
            scene.initializeFrame();
            expect(visualizer.update(time)).toBe(true);
            scene.render(time);
            return scene.primitives.length === 0;
        });

        runs(function(){
            visualizer.destroy();
        });
    });

    it('Creates and removes static material open geometry', function() {
        var objects = new EntityCollection();
        var visualizer = new GeometryVisualizer(EllipseGeometryUpdater, scene, objects);

        var ellipse = new EllipseGraphics();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.material = new GridMaterialProperty();

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        entity.ellipse = ellipse;
        objects.add(entity);

        waitsFor(function() {
            scene.initializeFrame();
            var isUpdated = visualizer.update(time);
            scene.render(time);
            return isUpdated;
        });

        runs(function() {
            var primitive = scene.primitives.get(0);
            var attributes = primitive.getGeometryInstanceAttributes(entity);
            expect(attributes).toBeDefined();
            expect(attributes.show).toEqual(ShowGeometryInstanceAttribute.toValue(true));
            expect(attributes.color).toBeUndefined();
            expect(primitive.appearance).toBeInstanceOf(EllipseGeometryUpdater.materialAppearanceType);
            expect(primitive.appearance.closed).toBe(false);

            objects.remove(entity);
        });

        waitsFor(function() {
            scene.initializeFrame();
            expect(visualizer.update(time)).toBe(true);
            scene.render(time);
            return scene.primitives.length === 0;
        });

        runs(function(){
            visualizer.destroy();
        });
    });

    it('Creates and removes static color closed geometry', function() {
        var objects = new EntityCollection();
        var visualizer = new GeometryVisualizer(EllipseGeometryUpdater, scene, objects);

        var ellipse = new EllipseGraphics();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.material = new ColorMaterialProperty();
        ellipse.extrudedHeight = new ConstantProperty(1000);

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        entity.ellipse = ellipse;
        objects.add(entity);

        waitsFor(function() {
            scene.initializeFrame();
            var isUpdated = visualizer.update(time);
            scene.render(time);
            return isUpdated;
        });

        runs(function() {
            var primitive = scene.primitives.get(0);
            var attributes = primitive.getGeometryInstanceAttributes(entity);
            expect(attributes).toBeDefined();
            expect(attributes.show).toEqual(ShowGeometryInstanceAttribute.toValue(true));
            expect(attributes.color).toEqual(ColorGeometryInstanceAttribute.toValue(Color.WHITE));
            expect(primitive.appearance).toBeInstanceOf(EllipseGeometryUpdater.perInstanceColorAppearanceType);
            expect(primitive.appearance.closed).toBe(true);

            objects.remove(entity);
        });

        waitsFor(function() {
            scene.initializeFrame();
            expect(visualizer.update(time)).toBe(true);
            scene.render(time);
            return scene.primitives.length === 0;
        });

        runs(function(){
            visualizer.destroy();
        });
    });

    it('Creates and removes static material closed geometry', function() {
        var objects = new EntityCollection();
        var visualizer = new GeometryVisualizer(EllipseGeometryUpdater, scene, objects);

        var ellipse = new EllipseGraphics();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.material = new GridMaterialProperty();
        ellipse.extrudedHeight = new ConstantProperty(1000);

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        entity.ellipse = ellipse;
        objects.add(entity);

        waitsFor(function() {
            scene.initializeFrame();
            var isUpdated = visualizer.update(time);
            scene.render(time);
            return isUpdated;
        });

        runs(function() {
            var primitive = scene.primitives.get(0);
            var attributes = primitive.getGeometryInstanceAttributes(entity);
            expect(attributes).toBeDefined();
            expect(attributes.show).toEqual(ShowGeometryInstanceAttribute.toValue(true));
            expect(attributes.color).toBeUndefined();
            expect(primitive.appearance).toBeInstanceOf(EllipseGeometryUpdater.materialAppearanceType);
            expect(primitive.appearance.closed).toBe(true);

            objects.remove(entity);
        });

        waitsFor(function() {
            scene.initializeFrame();
            expect(visualizer.update(time)).toBe(true);
            scene.render(time);
            return scene.primitives.length === 0;
        });

        runs(function(){
            visualizer.destroy();
        });
    });

    it('Creates and removes static outline geometry', function() {
        var objects = new EntityCollection();
        var visualizer = new GeometryVisualizer(EllipseGeometryUpdater, scene, objects);

        var ellipse = new EllipseGraphics();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.outline = new ConstantProperty(true);
        ellipse.outlineColor = new ConstantProperty(Color.BLUE);
        ellipse.fill = new ConstantProperty(false);

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        entity.ellipse = ellipse;
        objects.add(entity);

        waitsFor(function() {
            scene.initializeFrame();
            var isUpdated = visualizer.update(time);
            scene.render(time);
            return isUpdated;
        });

        runs(function() {
            var primitive = scene.primitives.get(0);
            var attributes = primitive.getGeometryInstanceAttributes(entity);
            expect(attributes).toBeDefined();
            expect(attributes.show).toEqual(ShowGeometryInstanceAttribute.toValue(true));
            expect(attributes.color).toEqual(ColorGeometryInstanceAttribute.toValue(Color.BLUE));
            expect(primitive.appearance).toBeInstanceOf(EllipseGeometryUpdater.perInstanceColorAppearanceType);

            objects.remove(entity);
        });

        waitsFor(function() {
            scene.initializeFrame();
            expect(visualizer.update(time)).toBe(true);
            scene.render(time);
            return scene.primitives.length === 0;
        });

        runs(function(){
            visualizer.destroy();
        });
    });

    it('Correctly handles geometry changing batches', function() {
        var objects = new EntityCollection();
        var visualizer = new GeometryVisualizer(EllipseGeometryUpdater, scene, objects);

        var ellipse = new EllipseGraphics();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.material = new ColorMaterialProperty();

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        entity.ellipse = ellipse;
        objects.add(entity);

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
            attributes = primitive.getGeometryInstanceAttributes(entity);
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
            attributes = primitive.getGeometryInstanceAttributes(entity);
            expect(attributes).toBeDefined();
            expect(attributes.show).toEqual(ShowGeometryInstanceAttribute.toValue(true));
            expect(attributes.color).toBeUndefined();
            expect(primitive.appearance).toBeInstanceOf(EllipseGeometryUpdater.materialAppearanceType);

            objects.remove(entity);
            scene.initializeFrame();
            expect(visualizer.update(time)).toBe(true);
            scene.render(time);

            expect(scene.primitives.length).toBe(0);

            visualizer.destroy();
        });

    });

    it('Creates and removes dynamic geometry', function() {
        var objects = new EntityCollection();
        var visualizer = new GeometryVisualizer(EllipseGeometryUpdater, scene, objects);

        var ellipse = new EllipseGraphics();
        ellipse.semiMajorAxis = new SampledProperty(Number);
        ellipse.semiMajorAxis.addSample(time, 2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.material = new ColorMaterialProperty();

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        entity.ellipse = ellipse;
        objects.add(entity);

        scene.initializeFrame();
        expect(visualizer.update(time)).toBe(true);
        scene.render(time);
        objects.remove(entity);
        scene.initializeFrame();
        expect(visualizer.update(time)).toBe(true);
        scene.render(time);
        expect(scene.primitives.length).toBe(0);
        visualizer.destroy();
    });

    it('Constructor throws without type', function() {
        var objects = new EntityCollection();
        expect(function() {
            return new GeometryVisualizer(undefined, scene, objects);
        }).toThrowDeveloperError();
    });

    it('Constructor throws without scene', function() {
        var objects = new EntityCollection();
        expect(function() {
            return new GeometryVisualizer(EllipseGeometryUpdater, undefined, objects);
        }).toThrowDeveloperError();
    });

    it('Update throws without time parameter', function() {
        var visualizer = new GeometryVisualizer(EllipseGeometryUpdater, scene, new EntityCollection());
        expect(function() {
            visualizer.update(undefined);
        }).toThrowDeveloperError();
    });

    it('removes the listener from the entity collection when destroyed', function() {
        var entityCollection = new EntityCollection();
        var visualizer = new GeometryVisualizer(EllipseGeometryUpdater, scene, entityCollection);
        expect(entityCollection.collectionChanged.numberOfListeners).toEqual(1);
        visualizer = visualizer.destroy();
        expect(entityCollection.collectionChanged.numberOfListeners).toEqual(0);
    });

    it('StaticGeometryPerMaterialBatch handles shared material being invalidated', function() {
        var batch = new StaticGeometryPerMaterialBatch(scene.primitives, EllipseGeometryUpdater.materialAppearanceType, false);

        var ellipse = new EllipseGraphics();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.material = new GridMaterialProperty();

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        entity.ellipse = ellipse;

        var ellipse2 = new EllipseGraphics();
        ellipse2.semiMajorAxis = new ConstantProperty(3);
        ellipse2.semiMinorAxis = new ConstantProperty(2);
        ellipse2.material = new GridMaterialProperty();

        var entity2 = new Entity();
        entity2.position = new ConstantPositionProperty(new Cartesian3(1234, 5678, 9101112));
        entity2.ellipse = ellipse2;

        var updater = new EllipseGeometryUpdater(entity);
        var updater2 = new EllipseGeometryUpdater(entity2);
        batch.add(time, updater);
        batch.add(time, updater2);

        waitsFor(function() {
            scene.initializeFrame();
            var isUpdated = batch.update(time);
            scene.render(time);
            return isUpdated;
        });

        runs(function() {
            expect(scene.primitives.length).toEqual(1);
            ellipse.material.cellAlpha = new ConstantProperty(0.5);
        });

        waitsFor(function() {
            scene.initializeFrame();
            var isUpdated = batch.update(time);
            scene.render(time);
            return isUpdated;
        });

        runs(function() {
            expect(scene.primitives.length).toEqual(2);
            batch.removeAllPrimitives();
        });
    });
}, 'WebGL');
