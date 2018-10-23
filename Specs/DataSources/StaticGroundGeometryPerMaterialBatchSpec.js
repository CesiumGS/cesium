defineSuite([
        'DataSources/StaticGroundGeometryPerMaterialBatch',
        'Core/ApproximateTerrainHeights',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Color',
        'Core/DistanceDisplayCondition',
        'Core/JulianDate',
        'Core/Math',
        'Core/TimeInterval',
        'Core/TimeIntervalCollection',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantPositionProperty',
        'DataSources/ConstantProperty',
        'DataSources/EllipseGeometryUpdater',
        'DataSources/EllipseGraphics',
        'DataSources/Entity',
        'DataSources/GridMaterialProperty',
        'DataSources/PolylineArrowMaterialProperty',
        'DataSources/PolylineGeometryUpdater',
        'DataSources/PolylineGraphics',
        'DataSources/TimeIntervalCollectionProperty',
        'Scene/GroundPrimitive',
        'Scene/MaterialAppearance',
        'Scene/PolylineColorAppearance',
        'Scene/PolylineMaterialAppearance',
        'Specs/createScene',
        'Specs/pollToPromise'
    ], function(
        StaticGroundGeometryPerMaterialBatch,
        ApproximateTerrainHeights,
        Cartesian2,
        Cartesian3,
        Color,
        DistanceDisplayCondition,
        JulianDate,
        CesiumMath,
        TimeInterval,
        TimeIntervalCollection,
        ColorMaterialProperty,
        ConstantPositionProperty,
        ConstantProperty,
        EllipseGeometryUpdater,
        EllipseGraphics,
        Entity,
        GridMaterialProperty,
        PolylineArrowMaterialProperty,
        PolylineGeometryUpdater,
        PolylineGraphics,
        TimeIntervalCollectionProperty,
        GroundPrimitive,
        MaterialAppearance,
        PolylineColorAppearance,
        PolylineMaterialAppearance,
        createScene,
        pollToPromise) {
    'use strict';

    var time = JulianDate.now();
    var scene;
    beforeAll(function() {
        scene = createScene();

        return GroundPrimitive.initializeTerrainHeights();
    });

    afterAll(function() {
        scene.destroyForSpecs();

        // Leave ground primitive uninitialized
        GroundPrimitive._initialized = false;
        GroundPrimitive._initPromise = undefined;
        ApproximateTerrainHeights._initPromise = undefined;
        ApproximateTerrainHeights._terrainHeights = undefined;
    });

    it('handles shared material being invalidated with geometry', function() {
        if (!GroundPrimitive.isSupported(scene) || !GroundPrimitive.supportsMaterials(scene)) {
            // Don't fail if materials on GroundPrimitive not supported
            return;
        }

        var batch = new StaticGroundGeometryPerMaterialBatch(scene.primitives, MaterialAppearance);

        var ellipse = new EllipseGraphics();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.material = new GridMaterialProperty();

        var entity = new Entity({
            position : new Cartesian3(1234, 5678, 9101112),
            ellipse : ellipse
        });

        var ellipse2 = new EllipseGraphics();
        ellipse2.semiMajorAxis = new ConstantProperty(3);
        ellipse2.semiMinorAxis = new ConstantProperty(2);
        ellipse2.material = new GridMaterialProperty();

        var entity2 = new Entity({
            position : new Cartesian3(123, 456, 789),
            ellipse : ellipse2
        });

        var updater = new EllipseGeometryUpdater(entity, scene);
        var updater2 = new EllipseGeometryUpdater(entity2, scene);
        batch.add(time, updater);
        batch.add(time, updater2);

        return pollToPromise(function() {
            scene.initializeFrame();
            var isUpdated = batch.update(time);
            scene.render(time);
            return isUpdated;
        }).then(function() {
            expect(scene.primitives.length).toEqual(1);
            ellipse.material.cellAlpha = new ConstantProperty(0.5);

            return pollToPromise(function() {
                scene.initializeFrame();
                var isUpdated = batch.update(time);
                scene.render(time);
                return isUpdated;
            });
        }).then(function() {
            expect(scene.primitives.length).toEqual(2);
            batch.removeAllPrimitives();
        });
    });

    it('updates with sampled distance display condition out of range', function() {
        if (!GroundPrimitive.isSupported(scene) || !GroundPrimitive.supportsMaterials(scene)) {
            // Don't fail if materials on GroundPrimitive not supported
            return;
        }

        var validTime = JulianDate.fromIso8601('2018-02-14T04:10:00+1100');
        var ddc = new TimeIntervalCollectionProperty();
        ddc.intervals.addInterval(TimeInterval.fromIso8601({
            iso8601: '2018-02-14T04:00:00+1100/2018-02-14T04:15:00+1100',
            data: new DistanceDisplayCondition(1.0, 2.0)
        }));
        var entity = new Entity({
            availability: new TimeIntervalCollection([TimeInterval.fromIso8601({iso8601: '2018-02-14T04:00:00+1100/2018-02-14T04:30:00+1100'})]),
            position : new Cartesian3(1234, 5678, 9101112),
            ellipse: {
                semiMajorAxis : 2,
                semiMinorAxis : 1,
                material : new GridMaterialProperty(),
                distanceDisplayCondition : ddc
            }
        });

        var batch = new StaticGroundGeometryPerMaterialBatch(scene.primitives, MaterialAppearance);

        var updater = new EllipseGeometryUpdater(entity, scene);
        batch.add(validTime, updater);

        return pollToPromise(function() {
            scene.initializeFrame();
            var isUpdated = batch.update(validTime);
            scene.render(validTime);
            return isUpdated;
        }).then(function() {
            expect(scene.primitives.length).toEqual(1);
            var primitive = scene.primitives.get(0);
            var attributes = primitive.getGeometryInstanceAttributes(entity);
            expect(attributes.distanceDisplayCondition).toEqualEpsilon([1.0, 2.0], CesiumMath.EPSILON6);

            batch.update(time);
            scene.render(time);

            primitive = scene.primitives.get(0);
            attributes = primitive.getGeometryInstanceAttributes(entity);
            expect(attributes.distanceDisplayCondition).toEqual([0.0, Infinity]);

            batch.removeAllPrimitives();
        });
    });

    it('shows only one primitive while rebuilding primitive', function() {
        if (!GroundPrimitive.isSupported(scene) || !GroundPrimitive.supportsMaterials(scene)) {
            // Don't fail if materials on GroundPrimitive not supported
            return;
        }

        var batch = new StaticGroundGeometryPerMaterialBatch(scene.primitives, MaterialAppearance);

        function buildEntity(x, y, z) {
            var material = new GridMaterialProperty({
                color : Color.YELLOW,
                cellAlpha : 0.3,
                lineCount : new Cartesian2(8, 8),
                lineThickness : new Cartesian2(2.0, 2.0)
            });

            return new Entity({
                position : new Cartesian3(x, y, z),
                ellipse : {
                    semiMajorAxis : 2,
                    semiMinorAxis : 1,
                    material: material
                }
            });
        }

        function renderScene() {
            scene.initializeFrame();
            var isUpdated = batch.update(time);
            scene.render(time);
            return isUpdated;
        }

        var entity1 = buildEntity(1234, 5678, 9101112);
        var entity2 = buildEntity(123, 456, 789);

        var updater1 = new EllipseGeometryUpdater(entity1, scene);
        var updater2 = new EllipseGeometryUpdater(entity2, scene);

        batch.add(time, updater1);
        return pollToPromise(renderScene)
        .then(function() {
            expect(scene.primitives.length).toEqual(1);
            var primitive = scene.primitives.get(0);
            expect(primitive.show).toBeTruthy();
        })
        .then(function() {
            batch.add(time, updater2);
        })
    .then(function() {
            return pollToPromise(function() {
                renderScene();
                return scene.primitives.length === 2;
            });
        })
        .then(function() {
            var showCount = 0;
            expect(scene.primitives.length).toEqual(2);
            showCount += !!scene.primitives.get(0).show;
            showCount += !!scene.primitives.get(1).show;
            expect(showCount).toEqual(1);
        })
        .then(function() {
            return pollToPromise(renderScene);
        })
        .then(function() {
            expect(scene.primitives.length).toEqual(1);
            var primitive = scene.primitives.get(0);
            expect(primitive.show).toBeTruthy();

            batch.removeAllPrimitives();
        });
    });

    it('batches overlapping entities with the same material separately', function() {
        if (!GroundPrimitive.isSupported(scene) || !GroundPrimitive.supportsMaterials(scene)) {
            // Don't fail if materials on GroundPrimitive not supported
            return;
        }

        var batch = new StaticGroundGeometryPerMaterialBatch(scene.primitives, MaterialAppearance);

        var ellipse = new EllipseGraphics();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.material = new GridMaterialProperty();

        var entity = new Entity({
            position : new Cartesian3(1234, 5678, 9101112),
            ellipse : ellipse
        });

        var ellipse2 = new EllipseGraphics();
        ellipse2.semiMajorAxis = new ConstantProperty(3);
        ellipse2.semiMinorAxis = new ConstantProperty(2);
        ellipse2.material = new GridMaterialProperty();

        var entity2 = new Entity({
            position : new Cartesian3(1234, 5678, 9101112),
            ellipse : ellipse2
        });

        var updater = new EllipseGeometryUpdater(entity, scene);
        var updater2 = new EllipseGeometryUpdater(entity2, scene);
        batch.add(time, updater);
        batch.add(time, updater2);

        return pollToPromise(function() {
            scene.initializeFrame();
            var isUpdated = batch.update(time);
            scene.render(time);
            return isUpdated;
        }).then(function() {
            expect(scene.primitives.length).toEqual(2);

            batch.removeAllPrimitives();
        });
    });

    it('batches nonoverlapping entities that both use color materials', function() {
        if (!GroundPrimitive.isSupported(scene) || !GroundPrimitive.supportsMaterials(scene)) {
            // Don't fail if materials on GroundPrimitive not supported
            return;
        }

        var batch = new StaticGroundGeometryPerMaterialBatch(scene.primitives, MaterialAppearance);
        var entity = new Entity({
            position : new Cartesian3(1234, 5678, 9101112),
            ellipse : {
                semiMajorAxis : 2,
                semiMinorAxis : 1,
                material : Color.RED
            }
        });

        var entity2 = new Entity({
            position : new Cartesian3(123, 456, 789),
            ellipse : {
                semiMajorAxis : 2,
                semiMinorAxis : 1,
                material : Color.BLUE
            }
        });

        var updater = new EllipseGeometryUpdater(entity, scene);
        var updater2 = new EllipseGeometryUpdater(entity2, scene);
        batch.add(time, updater);
        batch.add(time, updater2);

        return pollToPromise(function() {
            scene.initializeFrame();
            var isUpdated = batch.update(time);
            scene.render(time);
            return isUpdated;
        }).then(function() {
            expect(scene.primitives.length).toEqual(1);

            batch.removeAllPrimitives();
        });
    });

    it('has correct show attribute after rebuilding primitive', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        if (!GroundPrimitive.isSupported(scene) || !GroundPrimitive.supportsMaterials(scene)) {
            // Don't fail if materials on GroundPrimitive not supported
            return;
        }

        var batch = new StaticGroundGeometryPerMaterialBatch(scene.primitives, MaterialAppearance);

        function buildEntity(x, y, z) {
            var material = new GridMaterialProperty({
                color : Color.YELLOW,
                cellAlpha : 0.3,
                lineCount : new Cartesian2(8, 8),
                lineThickness : new Cartesian2(2.0, 2.0)
            });

            return new Entity({
                position : new Cartesian3(x, y, z),
                ellipse : {
                    semiMajorAxis : 2,
                    semiMinorAxis : 1,
                    material: material
                }
            });
        }

        function renderScene() {
            scene.initializeFrame();
            var isUpdated = batch.update(time);
            scene.render(time);
            return isUpdated;
        }

        var entity1 = buildEntity(1234, 5678, 9101112);
        var updater1 = new EllipseGeometryUpdater(entity1, scene);
        batch.add(time, updater1);

        var entity2 = buildEntity(123, 456, 789);
        var updater2 = new EllipseGeometryUpdater(entity2, scene);

        return pollToPromise(renderScene)
            .then(function() {
                expect(scene.primitives.length).toEqual(1);
                var primitive = scene.primitives.get(0);
                var attributes = primitive.getGeometryInstanceAttributes(entity1);
                expect(attributes.show).toEqual([1]);

                entity1.show = false;
                updater1._onEntityPropertyChanged(entity1, 'isShowing');
                return pollToPromise(renderScene);
            })
            .then(function() {
                expect(scene.primitives.length).toEqual(1);
                var primitive = scene.primitives.get(0);
                var attributes = primitive.getGeometryInstanceAttributes(entity1);
                expect(attributes.show).toEqual([0]);

                batch.add(time, updater2);
                return pollToPromise(renderScene);
            })
            .then(function() {
                expect(scene.primitives.length).toEqual(1);
                var primitive = scene.primitives.get(0);
                var attributes = primitive.getGeometryInstanceAttributes(entity1);
                expect(attributes.show).toEqual([0]);

                attributes = primitive.getGeometryInstanceAttributes(entity2);
                expect(attributes.show).toEqual([1]);

                batch.removeAllPrimitives();
            });
    });
});
