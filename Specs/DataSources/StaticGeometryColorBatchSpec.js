defineSuite([
    'DataSources/StaticGeometryColorBatch',
    'Core/Cartesian3',
    'Core/Color',
    'Core/JulianDate',
    'DataSources/CallbackProperty',
    'DataSources/EllipseGeometryUpdater',
    'DataSources/Entity',
    'DataSources/PolylineGeometryUpdater',
    'Scene/PerInstanceColorAppearance',
    'Scene/PolylineColorAppearance',
    'Scene/ShadowMode',
    'Specs/createScene',
    'Specs/pollToPromise'
], function(
    StaticGeometryColorBatch,
    Cartesian3,
    Color,
    JulianDate,
    CallbackProperty,
    EllipseGeometryUpdater,
    Entity,
    PolylineGeometryUpdater,
    PerInstanceColorAppearance,
    PolylineColorAppearance,
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

    it('updates color attribute after rebuilding geometry primitive', function() {
        var batch = new StaticGeometryColorBatch(scene.primitives, PerInstanceColorAppearance, undefined, false, ShadowMode.DISABLED);

        var entity = new Entity({
            position : new Cartesian3(1234, 5678, 9101112),
            ellipse : {
                semiMajorAxis : 2,
                semiMinorAxis : 1,
                show : new CallbackProperty(function() {
                    return true;
                }, false),
                material : Color.RED,
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

            entity.ellipse.material = Color.GREEN;
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

    it('updates color attribute after rebuilding polyline primitive', function() {
        var batch = new StaticGeometryColorBatch(scene.primitives, PolylineColorAppearance, undefined, false, ShadowMode.DISABLED);

        var entity = new Entity({
            polyline : {
                positions : [Cartesian3.fromDegrees(0.0, 0.0), Cartesian3.fromDegrees(0.0, 1.0)],
                material : Color.RED
            }
        });

        var updater = new PolylineGeometryUpdater(entity, scene);
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

            entity.polyline.material = Color.GREEN;
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
});
