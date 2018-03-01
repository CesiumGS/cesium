defineSuite([
    'DataSources/StaticOutlineGeometryBatch',
    'Core/Cartesian3',
    'Core/Color',
    'Core/JulianDate',
    'DataSources/CallbackProperty',
    'DataSources/EllipseGeometryUpdater',
    'DataSources/Entity',
    'Scene/ShadowMode',
    'Specs/createScene',
    'Specs/pollToPromise'
], function(
    StaticOutlineGeometryBatch,
    Cartesian3,
    Color,
    JulianDate,
    CallbackProperty,
    EllipseGeometryUpdater,
    Entity,
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
});
