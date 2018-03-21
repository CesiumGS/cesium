define([
        'Core/Color',
        'Core/JulianDate',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantProperty',
        'DataSources/GridMaterialProperty',
        'DataSources/SampledProperty',
        'Scene/GroundPrimitive',
        'Scene/PrimitiveCollection'
    ], function(
        Color,
        JulianDate,
        ColorMaterialProperty,
        ConstantProperty,
        GridMaterialProperty,
        SampledProperty,
        GroundPrimitive,
        PrimitiveCollection) {
    'use strict';

    function createGeometryUpdaterGroundGeometrySpecs(Updater, geometryPropertyName, createEntity, createDynamicEntity, getScene) {
        var time = JulianDate.now();

        it('A time-varying color causes ground geometry to be dynamic', function() {
            var entity = createEntity();
            var color = new SampledProperty(Color);
            color.addSample(time, Color.WHITE);
            entity[geometryPropertyName].material = new ColorMaterialProperty(color);
            var updater = new Updater(entity, getScene());

            expect(updater.isDynamic).toBe(true);
        });

        it('Checks that an entity without height and extrudedHeight and with a color material is on terrain', function() {
            var entity = createEntity();
            var geometry = entity[geometryPropertyName];
            geometry.height = undefined;
            geometry.outline = new ConstantProperty(true);

            var updater = new Updater(entity, getScene());

            if (GroundPrimitive.isSupported(getScene())) {
                expect(updater.onTerrain).toBe(true);
                expect(updater.outlineEnabled).toBe(false);
            } else {
                expect(updater.onTerrain).toBe(false);
                expect(updater.outlineEnabled).toBe(true);
            }
        });

        it('Checks that an entity with height isn\'t on terrain', function() {
            var entity = createEntity();
            entity[geometryPropertyName].height = new ConstantProperty(1);

            var updater = new Updater(entity, getScene());

            expect(updater.onTerrain).toBe(false);
        });

        it('Checks that an entity with extrudedHeight isn\'t on terrain', function() {
            var entity = createEntity();
            var geometry = entity[geometryPropertyName];
            geometry.height = undefined;
            geometry.extrudedHeight = new ConstantProperty(1);

            var updater = new Updater(entity, getScene());

            expect(updater.onTerrain).toBe(false);
        });

        it('Checks that an entity with a non-color material isn\'t on terrain', function() {
            var entity = createEntity();
            var geometry = entity[geometryPropertyName];
            geometry.height = undefined;
            geometry.material = new GridMaterialProperty(Color.BLUE);

            var updater = new Updater(entity, getScene());

            expect(updater.onTerrain).toBe(false);
        });

        it('fill is true sets onTerrain to true', function() {
            var entity = createEntity();
            entity[geometryPropertyName].fill = true;
            var updater = new Updater(entity, getScene());
            if (GroundPrimitive.isSupported(getScene())) {
                expect(updater.onTerrain).toBe(true);
            } else {
                expect(updater.onTerrain).toBe(false);
            }
        });

        it('fill is false sets onTerrain to false', function() {
            var entity = createEntity();
            entity[geometryPropertyName].fill = false;
            var updater = new Updater(entity, getScene());
            expect(updater.onTerrain).toBe(false);
        });

        it('a defined height sets onTerrain to false', function() {
            var entity = createEntity();
            var geometry = entity[geometryPropertyName];
            geometry.fill = true;
            geometry.height = 0;
            var updater = new Updater(entity, getScene());
            expect(updater.onTerrain).toBe(false);
        });

        it('a defined extrudedHeight sets onTerrain to false', function() {
            var entity = createEntity();
            var geometry = entity[geometryPropertyName];
            geometry.fill = true;
            geometry.extrudedHeight = 12;
            var updater = new Updater(entity, getScene());
            expect(updater.onTerrain).toBe(false);
        });

        it('color material sets onTerrain to true', function() {
            var entity = createEntity();
            var geometry = entity[geometryPropertyName];
            geometry.fill = true;
            geometry.material = new ColorMaterialProperty(Color.WHITE);
            var updater = new Updater(entity, getScene());
            if (GroundPrimitive.isSupported(getScene())) {
                expect(updater.onTerrain).toBe(true);
            } else {
                expect(updater.onTerrain).toBe(false);
            }
        });

        it('non-color material sets onTerrain to false', function() {
            var entity = createEntity();
            var geometry = entity[geometryPropertyName];
            geometry.fill = true;
            geometry.material = new GridMaterialProperty();
            var updater = new Updater(entity, getScene());
            expect(updater.onTerrain).toBe(false);
        });

        it('dynamic updater on terrain', function() {
            var entity = createDynamicEntity();

            var updater = new Updater(entity, getScene());
            var primitives = new PrimitiveCollection();
            var groundPrimitives = new PrimitiveCollection();
            var dynamicUpdater = updater.createDynamicUpdater(primitives, groundPrimitives);
            expect(dynamicUpdater.isDestroyed()).toBe(false);
            expect(primitives.length).toBe(0);
            expect(groundPrimitives.length).toBe(0);

            dynamicUpdater.update(time);

            if (GroundPrimitive.isSupported(getScene())) {
                expect(primitives.length).toBe(0);
                expect(groundPrimitives.length).toBe(1);
            } else {
                expect(primitives.length).toBe(2);
                expect(groundPrimitives.length).toBe(0);
            }

            dynamicUpdater.destroy();
            updater.destroy();
        });
    }

    return createGeometryUpdaterGroundGeometrySpecs;
});
