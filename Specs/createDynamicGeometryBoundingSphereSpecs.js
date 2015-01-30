/*global define*/
define([
        'Core/BoundingSphere',
        'Core/JulianDate',
        'Core/Math',
        'DataSources/BoundingSphereState'
    ], function(
        BoundingSphere,
        JulianDate,
        CesiumMath,
        BoundingSphereState) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var time = new JulianDate();
    function createDynamicGeometryBoundingSphereSpecs(Updater, entity, graphics, getScene) {
        it('Computes dynamic geometry bounding sphere for fill.', function() {
            var scene = getScene();
            var updater = new Updater(entity, scene);
            graphics.fill = true;
            graphics.outline = false;
            var dynamicUpdater = updater.createDynamicUpdater(scene.primitives);
            dynamicUpdater.update(time);

            var state;
            var result = new BoundingSphere();
            waitsFor(function() {
                scene.initializeFrame();
                scene.render();
                state = dynamicUpdater.getBoundingSphere(entity, result);
                return state !== BoundingSphereState.PENDING;
            });

            runs(function() {
                var primitive = scene.primitives.get(0);
                expect(state).toBe(BoundingSphereState.DONE);
                var attributes = primitive.getGeometryInstanceAttributes(entity);
                expect(result).toEqualEpsilon(BoundingSphere.transform(attributes.boundingSphere, primitive.modelMatrix, new BoundingSphere()), CesiumMath.EPSILON6);

                updater.destroy();
                scene.primitives.removeAll();
            });
        });

        it('Computes dynamic geometry bounding sphere for outline.', function() {
            var scene = getScene();
            var updater = new Updater(entity, scene);
            graphics.fill = false;
            graphics.outline = true;

            var dynamicUpdater = updater.createDynamicUpdater(scene.primitives);
            dynamicUpdater.update(time);

            var state;
            var result = new BoundingSphere();
            waitsFor(function() {
                scene.initializeFrame();
                scene.render();
                state = dynamicUpdater.getBoundingSphere(entity, result);
                return state !== BoundingSphereState.PENDING;
            });

            runs(function() {
                var primitive = scene.primitives.get(0);
                expect(state).toBe(BoundingSphereState.DONE);
                var attributes = primitive.getGeometryInstanceAttributes(entity);
                expect(result).toEqualEpsilon(BoundingSphere.transform(attributes.boundingSphere, primitive.modelMatrix, new BoundingSphere()), CesiumMath.EPSILON6);

                updater.destroy();
                scene.primitives.removeAll();
            });
        });

        it('Compute dynamic geometry bounding sphere throws without entity.', function() {
            var scene = getScene();
            var updater = new Updater(entity, scene);
            var dynamicUpdater = updater.createDynamicUpdater(scene.primitives);

            var result = new BoundingSphere();
            expect(function() {
                dynamicUpdater.getBoundingSphere(undefined, result);
            }).toThrowDeveloperError();

            updater.destroy();
            scene.primitives.removeAll();
        });

        it('Compute dynamic geometry bounding sphere throws without result.', function() {
            var scene = getScene();
            var updater = new Updater(entity, scene);
            var dynamicUpdater = updater.createDynamicUpdater(scene.primitives);

            expect(function() {
                dynamicUpdater.getBoundingSphere(entity, undefined);
            }).toThrowDeveloperError();

            updater.destroy();
            scene.primitives.removeAll();
        });
    }

    return createDynamicGeometryBoundingSphereSpecs;
});
