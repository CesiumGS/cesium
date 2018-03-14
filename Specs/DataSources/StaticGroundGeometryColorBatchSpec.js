defineSuite([
    'DataSources/StaticGroundGeometryColorBatch',
    'Core/Color',
    'Core/Cartesian3',
    'Core/JulianDate',
    'DataSources/CallbackProperty',
    'DataSources/EllipseGeometryUpdater',
    'DataSources/Entity',
    'Scene/ClassificationType',
    'Scene/GroundPrimitive',
    'Specs/createScene',
    'Specs/pollToPromise'
], function(
    StaticGroundGeometryColorBatch,
    Color,
    Cartesian3,
    JulianDate,
    CallbackProperty,
    EllipseGeometryUpdater,
    Entity,
    ClassificationType,
    GroundPrimitive,
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
        GroundPrimitive._terrainHeights = undefined;
    });

    function computeKey(color) {
        var ui8 = new Uint8Array(color);
        var ui32 = new Uint32Array(ui8.buffer);
        return ui32[0];
    }

    it('updates color attribute after rebuilding primitive', function() {
        if (!GroundPrimitive.isSupported(scene)) {
            return;
        }

        var batch = new StaticGroundGeometryColorBatch(scene.groundPrimitives, ClassificationType.BOTH);
        var entity = new Entity({
            position : new Cartesian3(1234, 5678, 9101112),
            ellipse : {
                semiMajorAxis : 2,
                semiMinorAxis : 1,
                show : new CallbackProperty(function() {
                    return true;
                }, false),
                material : Color.RED
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
            expect(scene.groundPrimitives.length).toEqual(1);
            var primitive = scene.groundPrimitives.get(0);
            var attributes = primitive.getGeometryInstanceAttributes(entity);
            var red = [255, 0, 0, 255];
            var redKey = computeKey(red);
            expect(attributes.color).toEqual(red);

            // Verify we have 1 batch with the key for red
            expect(batch._batches.length).toEqual(1);
            expect(batch._batches.contains(redKey)).toBe(true);
            expect(batch._batches.get(redKey).key).toEqual(redKey);

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
                expect(scene.groundPrimitives.length).toEqual(1);
                var primitive = scene.groundPrimitives.get(0);
                var attributes = primitive.getGeometryInstanceAttributes(entity);
                var green = [0, 128, 0, 255];
                var greenKey = computeKey(green);
                expect(attributes.color).toEqual(green);

                // Verify we have 1 batch with the key for green
                expect(batch._batches.length).toEqual(1);
                expect(batch._batches.contains(greenKey)).toBe(true);
                expect(batch._batches.get(greenKey).key).toEqual(greenKey);

                batch.removeAllPrimitives();
            });
        });
    });
});
