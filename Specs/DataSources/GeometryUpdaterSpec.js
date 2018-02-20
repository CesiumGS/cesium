defineSuite([
    'DataSources/GeometryUpdater',
    'DataSources/Entity',
    'Scene/PrimitiveCollection',
    'Specs/createScene'
], function(
    GeometryUpdater,
    Entity,
    PrimitiveCollection,
    createScene) {
    'use strict';

    var scene;

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    it('Constructor throws if no Entity supplied', function() {
        expect(function() {
            return new GeometryUpdater(undefined, scene);
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no scene supplied', function() {
        expect(function() {
            return new GeometryUpdater(new Entity(), undefined);
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if not dynamic', function() {
        var updater = new GeometryUpdater(new Entity(), scene);
        expect(function() {
            return updater.createDynamicUpdater(new PrimitiveCollection(), new PrimitiveCollection());
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if primitives undefined', function() {
        var updater = new GeometryUpdater(new Entity(), scene);
        expect(updater.isDynamic).toBe(true);
        expect(function() {
            return updater.createDynamicUpdater(undefined, new PrimitiveCollection());
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if groundPrimitives undefined', function() {
        var updater = new GeometryUpdater(new Entity(), scene);
        expect(updater.isDynamic).toBe(true);
        expect(function() {
            return updater.createDynamicUpdater(new PrimitiveCollection(), undefined);
        }).toThrowDeveloperError();
    });
});
