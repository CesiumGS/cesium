defineSuite([
        'DataSources/StaticGroundPolylinePerMaterialBatch',
        'Core/ApproximateTerrainHeights',
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/Color',
        'Core/defined',
        'Core/DistanceDisplayCondition',
        'Core/JulianDate',
        'Core/Math',
        'Core/TimeInterval',
        'Core/TimeIntervalCollection',
        'DataSources/BoundingSphereState',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantProperty',
        'DataSources/Entity',
        'DataSources/PolylineOutlineMaterialProperty',
        'DataSources/PolylineGeometryUpdater',
        'DataSources/PolylineGraphics',
        'DataSources/TimeIntervalCollectionProperty',
        'Scene/GroundPolylinePrimitive',
        'Specs/createScene',
        'Specs/pollToPromise'
    ], function(
        StaticGroundPolylinePerMaterialBatch,
        ApproximateTerrainHeights,
        BoundingSphere,
        Cartesian3,
        Color,
        defined,
        DistanceDisplayCondition,
        JulianDate,
        CesiumMath,
        TimeInterval,
        TimeIntervalCollection,
        BoundingSphereState,
        ColorMaterialProperty,
        ConstantProperty,
        Entity,
        PolylineOutlineMaterialProperty,
        PolylineGeometryUpdater,
        PolylineGraphics,
        TimeIntervalCollectionProperty,
        GroundPolylinePrimitive,
        createScene,
        pollToPromise) {
    'use strict';

    var time = JulianDate.now();
    var batch;
    var scene;
    beforeAll(function() {
        scene = createScene();

        return GroundPolylinePrimitive.initializeTerrainHeights();
    });

    afterAll(function() {
        scene.destroyForSpecs();

        GroundPolylinePrimitive._initPromise = undefined;
        GroundPolylinePrimitive._initialized = false;

        ApproximateTerrainHeights._initPromise = undefined;
        ApproximateTerrainHeights._terrainHeights = undefined;
    });

    afterEach(function() {
        if (defined(batch)) {
            batch.removeAllPrimitives();
            batch = undefined;
        }
    });

    function createGroundPolyline() {
        var polyline = new PolylineGraphics();
        polyline.clampToGround = new ConstantProperty(true);
        polyline.positions = new ConstantProperty(Cartesian3.fromDegreesArray([
            0, 0,
            0.1, 0,
            0.1, 0.1,
            0, 0.1
        ]));
        return polyline;
    }

    it('handles shared material being invalidated with geometry', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            // Don't fail if GroundPolylinePrimitive is not supported
            return;
        }

        batch = new StaticGroundPolylinePerMaterialBatch(scene.groundPrimitives, false);

        var polyline1 = createGroundPolyline();
        polyline1.material = new PolylineOutlineMaterialProperty();

        var entity = new Entity({
            polyline : polyline1
        });

        var polyline2 = createGroundPolyline();
        polyline2.material = new PolylineOutlineMaterialProperty();

        var entity2 = new Entity({
            polyline : polyline2
        });

        var updater = new PolylineGeometryUpdater(entity, scene);
        var updater2 = new PolylineGeometryUpdater(entity2, scene);
        batch.add(time, updater);
        batch.add(time, updater2);

        return pollToPromise(function() {
            scene.initializeFrame();
            var isUpdated = batch.update(time);
            scene.render(time);
            return isUpdated;
        }).then(function() {
            expect(scene.groundPrimitives.length).toEqual(1);
            polyline1.material.outlineWidth = new ConstantProperty(0.5);

            return pollToPromise(function() {
                scene.initializeFrame();
                var isUpdated = batch.update(time);
                scene.render(time);
                return isUpdated;
            }).then(function() {
                expect(scene.groundPrimitives.length).toEqual(2);
                batch.removeAllPrimitives();
            });
        });
    });

    it('updates with sampled color out of range', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            // Don't fail if GroundPolylinePrimitive is not supported
            return;
        }

        var validTime = JulianDate.fromIso8601('2018-02-14T04:10:00+1100');
        var color = new TimeIntervalCollectionProperty();
        color.intervals.addInterval(TimeInterval.fromIso8601({
            iso8601: '2018-02-14T04:00:00+1100/2018-02-14T04:15:00+1100',
            data: Color.RED
        }));
        var polyline = createGroundPolyline();
        polyline.material = new ColorMaterialProperty(color);
        var entity = new Entity({
            availability: new TimeIntervalCollection([TimeInterval.fromIso8601({iso8601: '2018-02-14T04:00:00+1100/2018-02-14T04:30:00+1100'})]),
            polyline: polyline
        });

        batch = new StaticGroundPolylinePerMaterialBatch(scene.groundPrimitives, false);

        var updater = new PolylineGeometryUpdater(entity, scene);
        batch.add(validTime, updater);

        return pollToPromise(function() {
            scene.initializeFrame();
            var isUpdated = batch.update(validTime);
            scene.render(validTime);
            return isUpdated;
        }).then(function() {
            expect(scene.groundPrimitives.length).toEqual(1);
            var primitive = scene.groundPrimitives.get(0);
            var attributes = primitive.getGeometryInstanceAttributes(entity);
            expect(attributes.color).toEqual([255, 0, 0, 255]);

            batch.update(time);
            scene.render(time);

            primitive = scene.groundPrimitives.get(0);
            attributes = primitive.getGeometryInstanceAttributes(entity);
            expect(attributes.color).toEqual([255, 255, 255, 255]);

            batch.removeAllPrimitives();
        });
    });

    it('updates with sampled distance display condition out of range', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            // Don't fail if GroundPolylinePrimitive is not supported
            return;
        }
        var validTime = JulianDate.fromIso8601('2018-02-14T04:10:00+1100');
        var ddc = new TimeIntervalCollectionProperty();
        ddc.intervals.addInterval(TimeInterval.fromIso8601({
            iso8601: '2018-02-14T04:00:00+1100/2018-02-14T04:15:00+1100',
            data: new DistanceDisplayCondition(1.0, 2.0)
        }));

        var polyline = createGroundPolyline();
        polyline.distanceDisplayCondition = ddc;
        var entity = new Entity({
            availability: new TimeIntervalCollection([TimeInterval.fromIso8601({iso8601: '2018-02-14T04:00:00+1100/2018-02-14T04:30:00+1100'})]),
            polyline: polyline
        });

        batch = new StaticGroundPolylinePerMaterialBatch(scene.groundPrimitives, false);

        var updater = new PolylineGeometryUpdater(entity, scene);
        batch.add(validTime, updater);

        return pollToPromise(function() {
            scene.initializeFrame();
            var isUpdated = batch.update(validTime);
            scene.render(validTime);
            return isUpdated;
        }).then(function() {
            expect(scene.groundPrimitives.length).toEqual(1);
            var primitive = scene.groundPrimitives.get(0);
            var attributes = primitive.getGeometryInstanceAttributes(entity);
            expect(attributes.distanceDisplayCondition).toEqualEpsilon([1.0, 2.0], CesiumMath.EPSILON6);

            batch.update(time);
            scene.render(time);

            primitive = scene.groundPrimitives.get(0);
            attributes = primitive.getGeometryInstanceAttributes(entity);
            expect(attributes.distanceDisplayCondition).toEqual([0.0, Infinity]);

            batch.removeAllPrimitives();
        });
    });

    it('shows only one primitive while rebuilding primitive', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            // Don't fail if GroundPolylinePrimitive is not supported
            return;
        }

        batch = new StaticGroundPolylinePerMaterialBatch(scene.groundPrimitives, false);

        function buildEntity() {
            var polyline = createGroundPolyline();
            polyline.material = new PolylineOutlineMaterialProperty({
                color : Color.ORANGE,
                outlineWidth : 2,
                outlineColor : Color.BLACK
            });

            return new Entity({
                polyline : polyline
            });
        }

        function renderScene() {
            scene.initializeFrame();
            var isUpdated = batch.update(time);
            scene.render(time);
            return isUpdated;
        }

        var entity1 = buildEntity();
        var entity2 = buildEntity();

        var updater1 = new PolylineGeometryUpdater(entity1, scene);
        var updater2 = new PolylineGeometryUpdater(entity2, scene);

        batch.add(time, updater1);
        return pollToPromise(renderScene)
            .then(function() {
                expect(scene.groundPrimitives.length).toEqual(1);
                var primitive = scene.groundPrimitives.get(0);
                expect(primitive.show).toBeTruthy();
            })
            .then(function() {
                batch.add(time, updater2);
            })
            .then(function() {
                return pollToPromise(function() {
                    renderScene();
                    return scene.groundPrimitives.length === 2;
                });
            })
            .then(function() {
                var showCount = 0;
                expect(scene.groundPrimitives.length).toEqual(2);
                showCount += !!scene.groundPrimitives.get(0).show;
                showCount += !!scene.groundPrimitives.get(1).show;
                expect(showCount).toEqual(1);
            })
            .then(function() {
                return pollToPromise(renderScene);
            })
            .then(function() {
                expect(scene.groundPrimitives.length).toEqual(1);
                var primitive = scene.groundPrimitives.get(0);
                expect(primitive.show).toBeTruthy();

                batch.removeAllPrimitives();
            });
    });

    it('batches entities that both use color materials', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            // Don't fail if GroundPolylinePrimitive is not supported
            return;
        }

        batch = new StaticGroundPolylinePerMaterialBatch(scene.groundPrimitives, false);
        var polyline1 = createGroundPolyline();
        polyline1.material = Color.RED;
        var entity = new Entity({
            polyline : polyline1
        });

        var polyline2 = createGroundPolyline();
        polyline2.material = Color.RED;
        var entity2 = new Entity({
            polyline : polyline2
        });

        var updater = new PolylineGeometryUpdater(entity, scene);
        var updater2 = new PolylineGeometryUpdater(entity2, scene);
        batch.add(time, updater);
        batch.add(time, updater2);

        return pollToPromise(function() {
            scene.initializeFrame();
            var isUpdated = batch.update(time);
            scene.render(time);
            return isUpdated;
        }).then(function() {
            expect(scene.groundPrimitives.length).toEqual(1);

            batch.removeAllPrimitives();
        });
    });

    it('batches entities with the same material but different Z indices separately', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            // Don't fail if GroundPolylinePrimitive is not supported
            return;
        }

        batch = new StaticGroundPolylinePerMaterialBatch(scene.groundPrimitives, false);

        var polyline1 = createGroundPolyline();
        polyline1.material = new PolylineOutlineMaterialProperty();
        polyline1.zIndex = 0;

        var entity = new Entity({
            polyline : polyline1
        });

        var polyline2 = createGroundPolyline();
        polyline2.material = new PolylineOutlineMaterialProperty();
        polyline2.zIndex = 1;

        var entity2 = new Entity({
            polyline : polyline2
        });

        var updater = new PolylineGeometryUpdater(entity, scene);
        var updater2 = new PolylineGeometryUpdater(entity2, scene);
        batch.add(time, updater);
        batch.add(time, updater2);

        return pollToPromise(function() {
            scene.initializeFrame();
            var isUpdated = batch.update(time);
            scene.render(time);
            return isUpdated;
        }).then(function() {
            expect(scene.groundPrimitives.length).toEqual(2);

            batch.removeAllPrimitives();
        });
    });

    it('removes entities', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            // Don't fail if GroundPolylinePrimitive is not supported
            return;
        }

        batch = new StaticGroundPolylinePerMaterialBatch(scene.groundPrimitives, false);

        var polyline1 = createGroundPolyline();
        polyline1.material = new PolylineOutlineMaterialProperty();

        var entity = new Entity({
            polyline : polyline1
        });

        var updater = new PolylineGeometryUpdater(entity, scene);
        batch.add(time, updater);

        return pollToPromise(function() {
            scene.initializeFrame();
            var isUpdated = batch.update(time);
            scene.render(time);
            return isUpdated;
        }).then(function() {
            expect(scene.groundPrimitives.length).toEqual(1);

            batch.remove(updater);

            return pollToPromise(function() {
                scene.initializeFrame();
                var isUpdated = batch.update(time);
                scene.render(time);
                return isUpdated;
            });
        }).then(function() {
            expect(scene.groundPrimitives.length).toEqual(0);
            batch.removeAllPrimitives();
        });
    });

    it('gets bounding spheres', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            // Don't fail if GroundPolylinePrimitive is not supported
            return;
        }

        var resultSphere = new BoundingSphere();
        batch = new StaticGroundPolylinePerMaterialBatch(scene.groundPrimitives, false);

        var polyline1 = createGroundPolyline();
        polyline1.material = new PolylineOutlineMaterialProperty();

        var entity = new Entity({
            polyline : polyline1
        });

        var updater = new PolylineGeometryUpdater(entity, scene);

        var state = batch.getBoundingSphere(updater, resultSphere);
        expect(state).toEqual(BoundingSphereState.FAILED);

        batch.add(time, updater);

        batch.update(time);
        state = batch.getBoundingSphere(updater, resultSphere);
        expect(state).toEqual(BoundingSphereState.PENDING);

        return pollToPromise(function() {
            scene.initializeFrame();
            var isUpdated = batch.update(time);
            scene.render(time);
            return isUpdated;
        }).then(function() {
            expect(scene.groundPrimitives.length).toEqual(1);

            state = batch.getBoundingSphere(updater, resultSphere);
            expect(state).toEqual(BoundingSphereState.DONE);

            batch.removeAllPrimitives();
        });
    });

    it('has correct show attribute after rebuilding primitive', function() {
        if (!GroundPolylinePrimitive.isSupported(scene)) {
            // Don't fail if GroundPolylinePrimitive is not supported
            return;
        }
        batch = new StaticGroundPolylinePerMaterialBatch(scene.groundPrimitives, false);

        function buildEntity() {
            var polyline = createGroundPolyline();
            polyline.material = new PolylineOutlineMaterialProperty({
                color : Color.ORANGE,
                outlineWidth : 2,
                outlineColor : Color.BLACK
            });

            return new Entity({
                polyline : polyline
            });
        }

        function renderScene() {
            scene.initializeFrame();
            var isUpdated = batch.update(time);
            scene.render(time);
            return isUpdated;
        }

        var entity1 = buildEntity();
        var updater1 = new PolylineGeometryUpdater(entity1, scene);
        batch.add(time, updater1);

        var entity2 = buildEntity();
        var updater2 = new PolylineGeometryUpdater(entity2, scene);

        return pollToPromise(renderScene)
            .then(function() {
                expect(scene.groundPrimitives.length).toEqual(1);
                var primitive = scene.groundPrimitives.get(0);
                var attributes = primitive.getGeometryInstanceAttributes(entity1);
                expect(attributes.show).toEqual([1]);

                entity1.show = false;
                updater1._onEntityPropertyChanged(entity1, 'isShowing');
                return pollToPromise(renderScene);
            })
            .then(function() {
                expect(scene.groundPrimitives.length).toEqual(1);
                var primitive = scene.groundPrimitives.get(0);
                var attributes = primitive.getGeometryInstanceAttributes(entity1);
                expect(attributes.show).toEqual([0]);

                batch.add(time, updater2);
                return pollToPromise(renderScene);
            })
            .then(function() {
                expect(scene.groundPrimitives.length).toEqual(1);
                var primitive = scene.groundPrimitives.get(0);
                var attributes = primitive.getGeometryInstanceAttributes(entity1);
                expect(attributes.show).toEqual([0]);

                attributes = primitive.getGeometryInstanceAttributes(entity2);
                expect(attributes.show).toEqual([1]);

                batch.removeAllPrimitives();
            });
    });
});
