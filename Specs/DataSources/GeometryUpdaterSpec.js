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
            return new GeometryUpdater({
                entity : undefined,
                scene : scene,
                geometryOptions : {},
                geometryPropertyName : 'box',
                observedPropertyNames  : ['availability', 'box']
            });
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no scene supplied', function() {
        expect(function() {
            return new GeometryUpdater({
                entity : new Entity(),
                scene : undefined,
                geometryOptions : {},
                geometryPropertyName : 'box',
                observedPropertyNames  : ['availability', 'box']
            });
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no geometryOptions supplied', function() {
        expect(function() {
            return new GeometryUpdater({
                entity : new Entity(),
                scene : scene,
                geometryOptions : undefined,
                geometryPropertyName : 'box',
                observedPropertyNames  : ['availability', 'box']
            });
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no geometryPropertyName supplied', function() {
        expect(function() {
            return new GeometryUpdater({
                entity : new Entity(),
                scene : scene,
                geometryOptions : {},
                geometryPropertyName : undefined,
                observedPropertyNames  : ['availability', 'box']
            });
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no observedPropertyNames supplied', function() {
        expect(function() {
            return new GeometryUpdater({
                entity : new Entity(),
                scene : scene,
                geometryOptions : {},
                geometryPropertyName : 'box',
                observedPropertyNames  : undefined
            });
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if not dynamic', function() {
        var updater = new GeometryUpdater({
            entity : new Entity(),
            scene : scene,
            geometryOptions : {},
            geometryPropertyName : 'box',
            observedPropertyNames  : ['availability', 'box']
        });
        expect(function() {
            return updater.createDynamicUpdater(new PrimitiveCollection(), new PrimitiveCollection());
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if primitives undefined', function() {
        var updater = new GeometryUpdater({
            entity : new Entity(),
            scene : scene,
            geometryOptions : {},
            geometryPropertyName : 'box',
            observedPropertyNames  : ['availability', 'box']
        });
        updater._dynamic = true;
        expect(function() {
            return updater.createDynamicUpdater(undefined, new PrimitiveCollection());
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if groundPrimitives undefined', function() {
        var updater = new GeometryUpdater({
            entity : new Entity(),
            scene : scene,
            geometryOptions : {},
            geometryPropertyName : 'box',
            observedPropertyNames  : ['availability', 'box']
        });
        updater._dynamic = true;
        expect(function() {
            return updater.createDynamicUpdater(new PrimitiveCollection(), undefined);
        }).toThrowDeveloperError();
    });
});
