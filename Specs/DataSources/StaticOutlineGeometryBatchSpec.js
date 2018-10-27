defineSuite([
        'DataSources/StaticOutlineGeometryBatch',
        'Core/Cartesian3',
        'Core/Color',
        'Core/DistanceDisplayCondition',
        'Core/JulianDate',
        'Core/Math',
        'Core/TimeInterval',
        'Core/TimeIntervalCollection',
        'DataSources/CallbackProperty',
        'DataSources/EllipseGeometryUpdater',
        'DataSources/Entity',
        'DataSources/TimeIntervalCollectionProperty',
        'Scene/ShadowMode',
        'Specs/createScene',
        'Specs/pollToPromise'
    ], function(
        StaticOutlineGeometryBatch,
        Cartesian3,
        Color,
        DistanceDisplayCondition,
        JulianDate,
        CesiumMath,
        TimeInterval,
        TimeIntervalCollection,
        CallbackProperty,
        EllipseGeometryUpdater,
        Entity,
        TimeIntervalCollectionProperty,
        ShadowMode,
        createScene,
        pollToPromise) {
    'use strict';

    var time = JulianDate.now();
    var scene;
    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    it('updates color attribute after rebuilding primitive', function() {
        var batch = new StaticOutlineGeometryBatch(scene.primitives, scene, false, ShadowMode.DISABLED);

        var entity = new Entity({
            position : new Cartesian3(1234, 5678, 9101112),
            ellipse : {
                semiMajorAxis : 2,
                semiMinorAxis : 1,
                show : new CallbackProperty(function() {
                    return true;
                }, false),
                outline : true,
                outlineColor : Color.RED,
                height : 0
            }
        });

        var updater = new EllipseGeometryUpdater(entity, scene);
        batch.add(time, updater);

        return pollToPromise(function() {
            scene.initializeFrame();
            var isUpdated = batch.update(time);
            scene.render(time);
            return isUpdated;
        }).then(function() {
            expect(scene.primitives.length).toEqual(1);
            var primitive = scene.primitives.get(0);
            var attributes = primitive.getGeometryInstanceAttributes(entity);
            expect(attributes.color).toEqual([255, 0, 0, 255]);

            entity.ellipse.outlineColor = Color.GREEN;
            updater._onEntityPropertyChanged(entity, 'ellipse');
            batch.remove(updater);
            batch.add(time, updater);
            return pollToPromise(function() {
                scene.initializeFrame();
                var isUpdated = batch.update(time);
                scene.render(time);
                return isUpdated;
            }).then(function() {
                expect(scene.primitives.length).toEqual(1);
                var primitive = scene.primitives.get(0);
                var attributes = primitive.getGeometryInstanceAttributes(entity);
                expect(attributes.color).toEqual([0, 128, 0, 255]);
                batch.removeAllPrimitives();
            });
        });
    });

    it('updates with sampled color out of range', function() {
        var validTime = JulianDate.fromIso8601('2018-02-14T04:10:00+1100');
        var color = new TimeIntervalCollectionProperty();
        color.intervals.addInterval(TimeInterval.fromIso8601({
            iso8601: '2018-02-14T04:00:00+1100/2018-02-14T04:15:00+1100',
            data: Color.RED
        }));
        var entity = new Entity({
            availability: new TimeIntervalCollection([TimeInterval.fromIso8601({iso8601: '2018-02-14T04:00:00+1100/2018-02-14T04:30:00+1100'})]),
            position : new Cartesian3(1234, 5678, 9101112),
            ellipse: {
                semiMajorAxis : 2,
                semiMinorAxis : 1,
                extrudedHeight: 20,
                outline : true,
                outlineColor : color
            }
        });

        var batch = new StaticOutlineGeometryBatch(scene.primitives, scene, false, ShadowMode.DISABLED);

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
            expect(attributes.color).toEqual([255, 0, 0, 255]);

            batch.update(time);
            scene.render(time);

            primitive = scene.primitives.get(0);
            attributes = primitive.getGeometryInstanceAttributes(entity);
            expect(attributes.color).toEqual([255, 255, 255, 255]);

            batch.removeAllPrimitives();
        });
    });

    it('updates with sampled distance display condition out of range', function() {
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
                extrudedHeight: 20,
                outline : true,
                outlineColor : Color.RED,
                distanceDisplayCondition : ddc
            }
        });

        var batch = new StaticOutlineGeometryBatch(scene.primitives, scene, false, ShadowMode.DISABLED);

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
        var batch = new StaticOutlineGeometryBatch(scene.primitives, scene, false, ShadowMode.DISABLED);

        function buildEntity() {
            return new Entity({
                position : new Cartesian3(1234, 5678, 9101112),
                ellipse : {
                    semiMajorAxis : 2,
                    semiMinorAxis : 1,
                    height : 0,
                    outline : true,
                    outlineColor : Color.RED.withAlpha(0.5)
                }
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

    it('has correct show attribute after rebuilding primitive', function() {
        var batch = new StaticOutlineGeometryBatch(scene.primitives, scene, false, ShadowMode.DISABLED);

        function buildEntity() {
            return new Entity({
                position : new Cartesian3(1234, 5678, 9101112),
                ellipse : {
                    semiMajorAxis : 2,
                    semiMinorAxis : 1,
                    height : 0,
                    outline : true,
                    outlineColor : Color.RED.withAlpha(0.5)
                }
            });
        }

        function renderScene() {
            scene.initializeFrame();
            var isUpdated = batch.update(time);
            scene.render(time);
            return isUpdated;
        }

        var entity1 = buildEntity();
        var updater1 = new EllipseGeometryUpdater(entity1, scene);
        batch.add(time, updater1);

        var entity2 = buildEntity();
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
