define([
        'Core/BoundingSphere',
        'Core/JulianDate',
        'Core/Math',
        'DataSources/BoundingSphereState',
        'DataSources/EllipsoidGeometryUpdater',
        'Scene/PrimitiveCollection',
        'Specs/createDynamicProperty',
        'Specs/pollToPromise'
    ], function(
        BoundingSphere,
        JulianDate,
        CesiumMath,
        BoundingSphereState,
        EllipsoidGeometryUpdater,
        PrimitiveCollection,
        createDynamicProperty,
        pollToPromise) {
    'use strict';

    function createDynamicGeometryUpdaterSpecs(Updater, geometryPropertyName, createDynamicEntity, getScene) {
        var time = JulianDate.now();

        it('dynamic updater sets properties', function() {
            if (Updater === EllipsoidGeometryUpdater) {
                // Dynamic ellipsoids create primitives a little differently
                // This is covered in EllipsoidGeometryUpdaterSpecs instead
                return;
            }
            var entity = createDynamicEntity();
            var geometry = entity[geometryPropertyName];

            geometry.show = createDynamicProperty(true);
            geometry.outline = createDynamicProperty(true);
            geometry.fill = createDynamicProperty(true);

            var updater = new Updater(entity, getScene());
            var primitives = new PrimitiveCollection();
            var groundPrimitives = new PrimitiveCollection();
            var dynamicUpdater = updater.createDynamicUpdater(primitives, groundPrimitives);
            expect(primitives.length).toBe(0);
            expect(groundPrimitives.length).toBe(0);

            dynamicUpdater.update(JulianDate.now());
            expect(primitives.length).toBe(2);
            expect(groundPrimitives.length).toBe(0);
            expect(dynamicUpdater.isDestroyed()).toBe(false);

            expect(dynamicUpdater._options.id).toBe(entity);

            entity.show = false;
            updater._onEntityPropertyChanged(entity, 'show');
            dynamicUpdater.update(JulianDate.now());
            expect(primitives.length).toBe(0);
            entity.show = true;
            updater._onEntityPropertyChanged(entity, 'show');

            geometry.show.setValue(false);
            updater._onEntityPropertyChanged(entity, 'box');
            dynamicUpdater.update(JulianDate.now());
            expect(primitives.length).toBe(0);

            geometry.show.setValue(true);
            geometry.fill.setValue(false);
            updater._onEntityPropertyChanged(entity, 'box');
            dynamicUpdater.update(JulianDate.now());
            expect(primitives.length).toBe(1);

            geometry.fill.setValue(true);
            geometry.outline.setValue(false);
            updater._onEntityPropertyChanged(entity, 'box');
            dynamicUpdater.update(JulianDate.now());
            expect(primitives.length).toBe(1);

            dynamicUpdater.destroy();
            expect(primitives.length).toBe(0);
            updater.destroy();
        });

        it('Computes dynamic geometry bounding sphere for fill.', function() {
            var scene = getScene();
            var entity = createDynamicEntity();
            var geometry = entity[geometryPropertyName];
            var updater = new Updater(entity, scene);
            geometry.fill = true;
            geometry.outline = false;
            updater._onEntityPropertyChanged(entity, updater._geometryPropertyName);
            var dynamicUpdater = updater.createDynamicUpdater(scene.primitives, scene.groundPrimitives);
            dynamicUpdater.update(time);

            var state;
            var result = new BoundingSphere();

            return pollToPromise(function() {
                scene.initializeFrame();
                scene.render();
                state = dynamicUpdater.getBoundingSphere(result);
                return state !== BoundingSphereState.PENDING;
            }).then(function() {
                var primitive = scene.primitives.get(0);
                expect(state).toBe(BoundingSphereState.DONE);
                var attributes = primitive.getGeometryInstanceAttributes(entity);
                expect(result).toEqualEpsilon(attributes.boundingSphere, CesiumMath.EPSILON6);

                updater.destroy();
                scene.primitives.removeAll();
            });
        });

        it('Computes dynamic geometry bounding sphere for outline.', function() {
            var scene = getScene();
            var entity = createDynamicEntity();
            var geometry = entity[geometryPropertyName];
            var updater = new Updater(entity, scene);
            geometry.fill = false;
            geometry.outline = true;
            updater._onEntityPropertyChanged(entity, updater._geometryPropertyName);

            var dynamicUpdater = updater.createDynamicUpdater(scene.primitives, scene.groundPrimitives);
            dynamicUpdater.update(time);

            var state;
            var result = new BoundingSphere();
            return pollToPromise(function() {
                scene.initializeFrame();
                scene.render();
                state = dynamicUpdater.getBoundingSphere(result);
                return state !== BoundingSphereState.PENDING;
            }).then(function() {
                var primitive = scene.primitives.get(0);
                expect(state).toBe(BoundingSphereState.DONE);
                var attributes = primitive.getGeometryInstanceAttributes(entity);
                expect(result).toEqualEpsilon(attributes.boundingSphere, CesiumMath.EPSILON6);

                updater.destroy();
                scene.primitives.removeAll();
            });
        });

        it('Compute dynamic geometry bounding sphere throws without result.', function() {
            var scene = getScene();
            var entity = createDynamicEntity();
            var updater = new Updater(entity, scene);
            var dynamicUpdater = updater.createDynamicUpdater(scene.primitives, scene.groundPrimitives);

            expect(function() {
                dynamicUpdater.getBoundingSphere(undefined);
            }).toThrowDeveloperError();

            updater.destroy();
            scene.primitives.removeAll();
        });
    }

    return createDynamicGeometryUpdaterSpecs;
});
