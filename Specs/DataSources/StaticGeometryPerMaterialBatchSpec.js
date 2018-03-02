defineSuite([
    'DataSources/StaticGeometryPerMaterialBatch',
    'Core/Cartesian3',
    'Core/Color',
    'Core/JulianDate',
    'DataSources/ConstantPositionProperty',
    'DataSources/ConstantProperty',
    'DataSources/EllipseGeometryUpdater',
    'DataSources/EllipseGraphics',
    'DataSources/Entity',
    'DataSources/GridMaterialProperty',
    'DataSources/PolylineArrowMaterialProperty',
    'DataSources/PolylineGeometryUpdater',
    'DataSources/PolylineGraphics',
    'Scene/MaterialAppearance',
    'Scene/PolylineMaterialAppearance',
    'Scene/ShadowMode',
    'Specs/createScene',
    'Specs/pollToPromise'
], function(
    StaticGeometryPerMaterialBatch,
    Cartesian3,
    Color,
    JulianDate,
    ConstantPositionProperty,
    ConstantProperty,
    EllipseGeometryUpdater,
    EllipseGraphics,
    Entity,
    GridMaterialProperty,
    PolylineArrowMaterialProperty,
    PolylineGeometryUpdater,
    PolylineGraphics,
    MaterialAppearance,
    PolylineMaterialAppearance,
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

    it('handles shared material being invalidated with geometry', function() {
        var batch = new StaticGeometryPerMaterialBatch(scene.primitives, MaterialAppearance, undefined, false, ShadowMode.DISABLED);

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
            }).then(function() {
                expect(scene.primitives.length).toEqual(2);
                batch.removeAllPrimitives();
            });
        });
    });

    it('handles shared material being invalidated for polyline', function() {
        var batch = new StaticGeometryPerMaterialBatch(scene.primitives, PolylineMaterialAppearance, undefined, false, ShadowMode.DISABLED);

        var polyline = new PolylineGraphics();
        polyline.positions = new ConstantProperty([Cartesian3.fromDegrees(0.0, 0.0), Cartesian3.fromDegrees(0.0, 1.0)]);
        polyline.material = new PolylineArrowMaterialProperty();

        var entity = new Entity();
        entity.polyline = polyline;

        var polyline2 = new PolylineGraphics();
        polyline2.positions = new ConstantProperty([Cartesian3.fromDegrees(0.0, 0.0), Cartesian3.fromDegrees(0.0, 1.0)]);
        polyline2.material = new PolylineArrowMaterialProperty();

        var entity2 = new Entity();
        entity2.polyline = polyline2;

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
            expect(scene.primitives.length).toEqual(1);
            polyline.material.color = new ConstantProperty(Color.RED);

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
    });
});
