/*global defineSuite*/
defineSuite([
        'DataSources/PolygonGeometryUpdater',
        'Core/Cartesian3',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/JulianDate',
        'Core/PolygonHierarchy',
        'Core/ShowGeometryInstanceAttribute',
        'Core/TimeInterval',
        'Core/TimeIntervalCollection',
        'DataSources/CheckerboardMaterialProperty',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantProperty',
        'DataSources/Entity',
        'DataSources/GridMaterialProperty',
        'DataSources/PolygonGraphics',
        'DataSources/PropertyArray',
        'DataSources/SampledPositionProperty',
        'DataSources/SampledProperty',
        'DataSources/TimeIntervalCollectionProperty',
        'Scene/PrimitiveCollection',
        'Specs/createDynamicGeometryBoundingSphereSpecs',
        'Specs/createDynamicProperty',
        'Specs/createScene'
    ], function(
        PolygonGeometryUpdater,
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        JulianDate,
        PolygonHierarchy,
        ShowGeometryInstanceAttribute,
        TimeInterval,
        TimeIntervalCollection,
        CheckerboardMaterialProperty,
        ColorMaterialProperty,
        ConstantProperty,
        Entity,
        GridMaterialProperty,
        PolygonGraphics,
        PropertyArray,
        SampledPositionProperty,
        SampledProperty,
        TimeIntervalCollectionProperty,
        PrimitiveCollection,
        createDynamicGeometryBoundingSphereSpecs,
        createDynamicProperty,
        createScene) {
    'use strict';

    var scene;
    var time;

    beforeAll(function() {
        scene = createScene();
        time = JulianDate.now();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    function createBasicPolygon() {
        var polygon = new PolygonGraphics();
        polygon.hierarchy = new ConstantProperty(new PolygonHierarchy(Cartesian3.fromRadiansArray([
            0, 0,
            1, 0,
            1, 1,
            0, 1
        ])));
        polygon.height = new ConstantProperty(0);
        var entity = new Entity();
        entity.polygon = polygon;
        return entity;
    }

    function createBasicPolygonWithoutHeight() {
        var polygon = new PolygonGraphics();
        polygon.hierarchy = new ConstantProperty(new PolygonHierarchy(Cartesian3.fromRadiansArray([
            0, 0,
            1, 0,
            1, 1,
            0, 1
        ])));
        var entity = new Entity();
        entity.polygon = polygon;
        return entity;
    }

    it('Constructor sets expected defaults', function() {
        var entity = new Entity();
        var updater = new PolygonGeometryUpdater(entity, scene);

        expect(updater.isDestroyed()).toBe(false);
        expect(updater.entity).toBe(entity);
        expect(updater.isClosed).toBe(false);
        expect(updater.fillEnabled).toBe(false);
        expect(updater.fillMaterialProperty).toBe(undefined);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.hasConstantFill).toBe(true);
        expect(updater.hasConstantOutline).toBe(true);
        expect(updater.outlineColorProperty).toBe(undefined);
        expect(updater.outlineWidth).toBe(1.0);
        expect(updater.isDynamic).toBe(false);
        expect(updater.onTerrain).toBe(false);
        expect(updater.isOutlineVisible(time)).toBe(false);
        expect(updater.isFilled(time)).toBe(false);
        updater.destroy();
        expect(updater.isDestroyed()).toBe(true);
    });

    it('No geometry available when polygon is undefined ', function() {
        var entity = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(entity, scene);
        entity.polygon = undefined;

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('No geometry available when not filled or outline.', function() {
        var entity = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(entity, scene);
        entity.polygon.fill = new ConstantProperty(false);
        entity.polygon.outline = new ConstantProperty(false);

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('Values correct when using default graphics', function() {
        var entity = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(entity, scene);

        expect(updater.isClosed).toBe(false);
        expect(updater.fillEnabled).toBe(true);
        expect(updater.fillMaterialProperty).toEqual(new ColorMaterialProperty(Color.WHITE));
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.hasConstantFill).toBe(true);
        expect(updater.hasConstantOutline).toBe(true);
        expect(updater.outlineColorProperty).toBe(undefined);
        expect(updater.outlineWidth).toBe(1.0);
        expect(updater.isDynamic).toBe(false);
    });

    it('Polygon material is correctly exposed.', function() {
        var entity = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(entity, scene);
        entity.polygon.material = new GridMaterialProperty(Color.BLUE);
        expect(updater.fillMaterialProperty).toBe(entity.polygon.material);
    });

    it('Settings extrudedHeight causes geometry to be closed.', function() {
        var entity = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(entity, scene);
        entity.polygon.extrudedHeight = new ConstantProperty(1000);
        expect(updater.isClosed).toBe(true);
    });

    it('Settings extrudedHeight and closeTop false causes geometry to be open.', function() {
        var entity = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(entity, scene);
        entity.polygon.extrudedHeight = new ConstantProperty(1000);
        entity.polygon.closeTop = false;
        expect(updater.isClosed).toBe(false);
    });

    it('Settings extrudedHeight and closeBottom false causes geometry to be open.', function() {
        var entity = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(entity, scene);
        entity.polygon.extrudedHeight = new ConstantProperty(1000);
        entity.polygon.closeBottom = false;
        expect(updater.isClosed).toBe(false);
    });

    it('A time-varying outlineWidth causes geometry to be dynamic', function() {
        var entity = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(entity, scene);
        entity.polygon.outlineWidth = new SampledProperty(Number);
        entity.polygon.outlineWidth.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying positions causes geometry to be dynamic', function() {
        var entity = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(entity, scene);
        var point1 = new SampledPositionProperty();
        point1.addSample(time, new Cartesian3());
        var point2 = new SampledPositionProperty();
        point2.addSample(time, new Cartesian3());
        var point3 = new SampledPositionProperty();
        point3.addSample(time, new Cartesian3());

        entity.polygon.hierarchy = new PropertyArray();
        entity.polygon.hierarchy.setValue([point1, point2, point3]);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying height causes geometry to be dynamic', function() {
        var entity = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(entity, scene);
        entity.polygon.height = new SampledProperty(Number);
        entity.polygon.height.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying extrudedHeight causes geometry to be dynamic', function() {
        var entity = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(entity, scene);
        entity.polygon.extrudedHeight = new SampledProperty(Number);
        entity.polygon.extrudedHeight.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying granularity causes geometry to be dynamic', function() {
        var entity = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(entity, scene);
        entity.polygon.granularity = new SampledProperty(Number);
        entity.polygon.granularity.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying stRotation causes geometry to be dynamic', function() {
        var entity = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(entity, scene);
        entity.polygon.stRotation = new SampledProperty(Number);
        entity.polygon.stRotation.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying perPositionHeight causes geometry to be dynamic', function() {
        var entity = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(entity, scene);
        entity.polygon.perPositionHeight = new SampledProperty(Number);
        entity.polygon.perPositionHeight.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    function validateGeometryInstance(options) {
        var entity = createBasicPolygon();

        var polygon = entity.polygon;
        polygon.show = new ConstantProperty(options.show);
        polygon.fill = new ConstantProperty(options.fill);
        polygon.material = options.material;
        polygon.outline = new ConstantProperty(options.outline);
        polygon.outlineColor = new ConstantProperty(options.outlineColor);
        polygon.perPositionHeight = new ConstantProperty(options.perPositionHeight);
        polygon.closeTop = new ConstantProperty(options.closeTop);
        polygon.closeBottom = new ConstantProperty(options.closeBottom);

        polygon.stRotation = new ConstantProperty(options.stRotation);
        polygon.height = new ConstantProperty(options.height);
        polygon.extrudedHeight = new ConstantProperty(options.extrudedHeight);
        polygon.granularity = new ConstantProperty(options.granularity);

        var updater = new PolygonGeometryUpdater(entity, scene);

        var instance;
        var geometry;
        var attributes;
        if (options.fill) {
            instance = updater.createFillGeometryInstance(time);
            geometry = instance.geometry;
            expect(geometry._stRotation).toEqual(options.stRotation);
            expect(geometry._height).toEqual(options.height);
            expect(geometry._granularity).toEqual(options.granularity);
            expect(geometry._extrudedHeight).toEqual(options.extrudedHeight);
            expect(geometry._closeTop).toEqual(options.closeTop);
            expect(geometry._closeBottom).toEqual(options.closeBottom);

            attributes = instance.attributes;
            if (options.material instanceof ColorMaterialProperty) {
                expect(attributes.color.value).toEqual(ColorGeometryInstanceAttribute.toValue(options.material.color.getValue(time)));
            } else {
                expect(attributes.color).toBeUndefined();
            }
            expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(options.fill));
        }

        if (options.outline) {
            instance = updater.createOutlineGeometryInstance(time);
            geometry = instance.geometry;
            expect(geometry._height).toEqual(options.height);
            expect(geometry._granularity).toEqual(options.granularity);
            expect(geometry._extrudedHeight).toEqual(options.extrudedHeight);
            expect(geometry._perPositionHeight).toEqual(options.perPositionHeight);

            attributes = instance.attributes;
            expect(attributes.color.value).toEqual(ColorGeometryInstanceAttribute.toValue(options.outlineColor));
            expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(options.fill));
        }
    }

    it('Creates expected per-color geometry', function() {
        validateGeometryInstance({
            show : true,
            material : new ColorMaterialProperty(Color.RED),
            height : 431,
            extrudedHeight : 123,
            granularity : 0.97,
            stRotation : 12,
            fill : true,
            outline : true,
            outlineColor : Color.BLUE,
            perPositionHeight : false,
            closeTop: true,
            closeBottom: false
        });
    });

    it('Creates expected per-material geometry', function() {
        validateGeometryInstance({
            show : true,
            material : new GridMaterialProperty(),
            height : 431,
            extrudedHeight : 123,
            granularity : 0.97,
            stRotation : 12,
            fill : true,
            outline : true,
            outlineColor : Color.BLUE,
            perPositionHeight : false,
            closeTop: false,
            closeBottom: true
        });
    });

    it('Correctly exposes outlineWidth', function() {
        var entity = createBasicPolygon();
        entity.polygon.outlineWidth = new ConstantProperty(8);
        var updater = new PolygonGeometryUpdater(entity, scene);
        expect(updater.outlineWidth).toBe(8);
    });

    it('Attributes have expected values at creation time', function() {
        var time1 = new JulianDate(0, 0);
        var time2 = new JulianDate(10, 0);
        var time3 = new JulianDate(20, 0);

        var fill = new TimeIntervalCollectionProperty();
        fill.intervals.addInterval(new TimeInterval({
            start : time1,
            stop : time2,
            data : false
        }));
        fill.intervals.addInterval(new TimeInterval({
            start : time2,
            stop : time3,
            isStartIncluded : false,
            data : true
        }));

        var colorMaterial = new ColorMaterialProperty();
        colorMaterial.color = new SampledProperty(Color);
        colorMaterial.color.addSample(time, Color.YELLOW);
        colorMaterial.color.addSample(time2, Color.BLUE);
        colorMaterial.color.addSample(time3, Color.RED);

        var outline = new TimeIntervalCollectionProperty();
        outline.intervals.addInterval(new TimeInterval({
            start : time1,
            stop : time2,
            data : false
        }));
        outline.intervals.addInterval(new TimeInterval({
            start : time2,
            stop : time3,
            isStartIncluded : false,
            data : true
        }));

        var outlineColor = new SampledProperty(Color);
        outlineColor.addSample(time, Color.BLUE);
        outlineColor.addSample(time2, Color.RED);
        outlineColor.addSample(time3, Color.YELLOW);

        var entity = createBasicPolygon();
        entity.polygon.fill = fill;
        entity.polygon.material = colorMaterial;
        entity.polygon.outline = outline;
        entity.polygon.outlineColor = outlineColor;

        var updater = new PolygonGeometryUpdater(entity, scene);

        var instance = updater.createFillGeometryInstance(time2);
        var attributes = instance.attributes;
        expect(attributes.color.value).toEqual(ColorGeometryInstanceAttribute.toValue(colorMaterial.color.getValue(time2)));
        expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(fill.getValue(time2)));

        instance = updater.createOutlineGeometryInstance(time2);
        attributes = instance.attributes;
        expect(attributes.color.value).toEqual(ColorGeometryInstanceAttribute.toValue(outlineColor.getValue(time2)));
        expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(outline.getValue(time2)));
    });

    it('Checks that an entity without height and extrudedHeight and with a color material is on terrain', function() {
        var entity = createBasicPolygon();
        entity.polygon.height = undefined;
        entity.polygon.outline = new ConstantProperty(true);

        var updater = new PolygonGeometryUpdater(entity, scene);

        expect(updater.onTerrain).toBe(true);
        expect(updater.outlineEnabled).toBe(false);
    });

    it('Checks that an entity with height isn\'t on terrain', function() {
        var entity = createBasicPolygon();
        entity.polygon.height = new ConstantProperty(1);

        var updater = new PolygonGeometryUpdater(entity, scene);

        expect(updater.onTerrain).toBe(false);
    });

    it('Checks that an entity with extrudedHeight isn\'t on terrain', function() {
        var entity = createBasicPolygon();
        entity.polygon.height = undefined;
        entity.polygon.extrudedHeight = new ConstantProperty(1);

        var updater = new PolygonGeometryUpdater(entity, scene);

        expect(updater.onTerrain).toBe(false);
    });

    it('Checks that an entity with a non-color material isn\'t on terrain', function() {
        var entity = createBasicPolygon();
        entity.polygon.height = undefined;
        entity.polygon.material = new GridMaterialProperty(Color.BLUE);

        var updater = new PolygonGeometryUpdater(entity, scene);

        expect(updater.onTerrain).toBe(false);
    });

    it('Checks that a polygon with per position heights isn\'t on terrain', function() {
        var entity = createBasicPolygon();
        entity.polygon.height = undefined;
        entity.polygon.perPositionHeight = new ConstantProperty(true);

        var updater = new PolygonGeometryUpdater(entity, scene);

        expect(updater.onTerrain).toBe(false);
    });

    it('Checks that a polygon without per position heights is on terrain', function() {
        var entity = createBasicPolygon();
        entity.polygon.height = undefined;
        entity.polygon.perPositionHeight = new ConstantProperty(false);

        var updater = new PolygonGeometryUpdater(entity, scene);

        expect(updater.onTerrain).toBe(true);
    });

    it('createFillGeometryInstance obeys Entity.show is false.', function() {
        var entity = createBasicPolygon();
        entity.show = false;
        entity.polygon.fill = true;
        var updater = new PolygonGeometryUpdater(entity, scene);
        var instance = updater.createFillGeometryInstance(new JulianDate());
        var attributes = instance.attributes;
        expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(false));
    });

    it('createOutlineGeometryInstance obeys Entity.show is false.', function() {
        var entity = createBasicPolygon();
        entity.show = false;
        entity.polygon.outline = true;
        var updater = new PolygonGeometryUpdater(entity, scene);
        var instance = updater.createFillGeometryInstance(new JulianDate());
        var attributes = instance.attributes;
        expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(false));
    });

    it('dynamic updater sets properties', function() {
        var polygon = new PolygonGraphics();
        polygon.hierarchy = createDynamicProperty(new PolygonHierarchy(Cartesian3.fromRadiansArray([
                                                                                                       0, 0,
                                                                                                       1, 0,
                                                                                                       1, 1,
                                                                                                       0, 1
                                                                                                   ])));
        polygon.show = createDynamicProperty(true);
        polygon.height = createDynamicProperty(3);
        polygon.extrudedHeight = createDynamicProperty(2);
        polygon.outline = createDynamicProperty(true);
        polygon.fill = createDynamicProperty(true);
        polygon.perPositionHeight = createDynamicProperty(false);
        polygon.granularity = createDynamicProperty(2);
        polygon.stRotation = createDynamicProperty(1);
        polygon.closeTop = createDynamicProperty(false);
        polygon.closeBottom = createDynamicProperty(false);

        var entity = new Entity();
        entity.polygon = polygon;

        var updater = new PolygonGeometryUpdater(entity, scene);
        var primitives = new PrimitiveCollection();
        var groundPrimitives = new PrimitiveCollection();
        var dynamicUpdater = updater.createDynamicUpdater(primitives);
        expect(dynamicUpdater.isDestroyed()).toBe(false);
        expect(primitives.length).toBe(0);
        expect(groundPrimitives.length).toBe(0);

        dynamicUpdater.update(time);
        expect(primitives.length).toBe(2);
        expect(groundPrimitives.length).toBe(0);

        var options = dynamicUpdater._options;
        expect(options.id).toEqual(entity);
        expect(options.polygonHierarchy).toEqual(polygon.hierarchy.getValue());
        expect(options.height).toEqual(polygon.height.getValue());
        expect(options.extrudedHeight).toEqual(polygon.extrudedHeight.getValue());
        expect(options.perPositionHeight).toEqual(polygon.perPositionHeight.getValue());
        expect(options.granularity).toEqual(polygon.granularity.getValue());
        expect(options.stRotation).toEqual(polygon.stRotation.getValue());
        expect(options.closeTop).toEqual(polygon.closeTop.getValue());
        expect(options.closeBottom).toEqual(polygon.closeBottom.getValue());

        entity.show = false;
        dynamicUpdater.update(JulianDate.now());
        expect(primitives.length).toBe(0);
        expect(groundPrimitives.length).toBe(0);
        entity.show = true;

        //If a dynamic show returns false, the primitive should go away.
        polygon.show.setValue(false);
        dynamicUpdater.update(time);
        expect(primitives.length).toBe(0);
        expect(groundPrimitives.length).toBe(0);

        polygon.show.setValue(true);
        dynamicUpdater.update(time);
        expect(primitives.length).toBe(2);
        expect(groundPrimitives.length).toBe(0);

        //If a dynamic position returns undefined, the primitive should go away.
        polygon.hierarchy.setValue(undefined);
        dynamicUpdater.update(time);
        expect(primitives.length).toBe(0);
        expect(groundPrimitives.length).toBe(0);

        dynamicUpdater.destroy();
        updater.destroy();
    });

    it('dynamic updater on terrain', function() {
        var polygon = new PolygonGraphics();
        polygon.hierarchy = createDynamicProperty(new PolygonHierarchy(Cartesian3.fromRadiansArray([
                                                                                                       0, 0,
                                                                                                       1, 0,
                                                                                                       1, 1,
                                                                                                       0, 1
                                                                                                   ])));
        polygon.show = createDynamicProperty(true);
        polygon.outline = createDynamicProperty(true);
        polygon.fill = createDynamicProperty(true);
        polygon.granularity = createDynamicProperty(2);
        polygon.stRotation = createDynamicProperty(1);

        var entity = new Entity();
        entity.polygon = polygon;

        var updater = new PolygonGeometryUpdater(entity, scene);
        var primitives = new PrimitiveCollection();
        var groundPrimitives = new PrimitiveCollection();
        var dynamicUpdater = updater.createDynamicUpdater(primitives, groundPrimitives);
        expect(dynamicUpdater.isDestroyed()).toBe(false);
        expect(primitives.length).toBe(0);
        expect(groundPrimitives.length).toBe(0);

        dynamicUpdater.update(time);
        expect(primitives.length).toBe(0);
        expect(groundPrimitives.length).toBe(1);

        dynamicUpdater.destroy();
        updater.destroy();
    });

    it('geometryChanged event is raised when expected', function() {
        var entity = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(entity, scene);
        var listener = jasmine.createSpy('listener');
        updater.geometryChanged.addEventListener(listener);

        entity.polygon.hierarchy = new ConstantProperty([]);
        expect(listener.calls.count()).toEqual(1);

        entity.polygon.height = new ConstantProperty(82);
        expect(listener.calls.count()).toEqual(2);

        entity.availability = new TimeIntervalCollection();
        expect(listener.calls.count()).toEqual(3);

        entity.polygon.hierarchy = undefined;
        expect(listener.calls.count()).toEqual(4);

        //Since there's no valid geometry, changing another property should not raise the event.
        entity.polygon.height = undefined;

        //Modifying an unrelated property should not have any effect.
        entity.viewFrom = new ConstantProperty(Cartesian3.UNIT_X);
        expect(listener.calls.count()).toEqual(4);
    });

    it('createFillGeometryInstance throws if object is not filled', function() {
        var entity = new Entity();
        var updater = new PolygonGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createFillGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createFillGeometryInstance throws if no time provided', function() {
        var entity = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createFillGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws if object is not outlined', function() {
        var entity = new Entity();
        var updater = new PolygonGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createOutlineGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws if no time provided', function() {
        var entity = createBasicPolygon();
        entity.polygon.outline = new ConstantProperty(true);
        var updater = new PolygonGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createOutlineGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if not dynamic', function() {
        var entity = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createDynamicUpdater(new PrimitiveCollection());
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if primitives undefined', function() {
        var entity = createBasicPolygon();
        entity.polygon.height = new SampledProperty(Number);
        entity.polygon.height.addSample(time, 4);
        var updater = new PolygonGeometryUpdater(entity, scene);
        expect(updater.isDynamic).toBe(true);
        expect(function() {
            return updater.createDynamicUpdater(undefined);
        }).toThrowDeveloperError();
    });

    it('dynamicUpdater.update throws if no time specified', function() {
        var entity = createBasicPolygon();
        entity.polygon.height = new SampledProperty(Number);
        entity.polygon.height.addSample(time, 4);
        var updater = new PolygonGeometryUpdater(entity, scene);
        var dynamicUpdater = updater.createDynamicUpdater(new PrimitiveCollection());
        expect(function() {
            dynamicUpdater.update(undefined);
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no Entity supplied', function() {
        expect(function() {
            return new PolygonGeometryUpdater(undefined, scene);
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no scene supplied', function() {
        var entity = createBasicPolygon();
        expect(function() {
            return new PolygonGeometryUpdater(entity, undefined);
        }).toThrowDeveloperError();
    });

    it('fill is true sets onTerrain to true', function() {
        var entity = createBasicPolygonWithoutHeight();
        entity.polygon.fill = true;
        var updater = new PolygonGeometryUpdater(entity, scene);
        expect(updater.onTerrain).toBe(true);
    });

    it('fill is false sets onTerrain to false', function() {
        var entity = createBasicPolygonWithoutHeight();
        entity.polygon.fill = false;
        var updater = new PolygonGeometryUpdater(entity, scene);
        expect(updater.onTerrain).toBe(false);
    });

    it('a defined height sets onTerrain to false', function() {
        var entity = createBasicPolygonWithoutHeight();
        entity.polygon.fill = true;
        entity.polygon.height = 0;
        var updater = new PolygonGeometryUpdater(entity, scene);
        expect(updater.onTerrain).toBe(false);
    });

    it('a defined extrudedHeight sets onTerrain to false', function() {
        var entity = createBasicPolygonWithoutHeight();
        entity.polygon.fill = true;
        entity.polygon.extrudedHeight = 12;
        var updater = new PolygonGeometryUpdater(entity, scene);
        expect(updater.onTerrain).toBe(false);
    });

    it('perPositionHeight is true sets onTerrain to false', function() {
        var entity = createBasicPolygonWithoutHeight();
        entity.polygon.fill = true;
        entity.polygon.perPositionHeight = true;
        var updater = new PolygonGeometryUpdater(entity, scene);
        expect(updater.onTerrain).toBe(false);
    });

    it('color material sets onTerrain to true', function() {
        var entity = createBasicPolygonWithoutHeight();
        entity.polygon.fill = true;
        entity.polygon.material = new ColorMaterialProperty(Color.WHITE);
        var updater = new PolygonGeometryUpdater(entity, scene);
        expect(updater.onTerrain).toBe(true);
    });

    it('non-color material sets onTerrain to false', function() {
        var entity = createBasicPolygonWithoutHeight();
        entity.polygon.fill = true;
        entity.polygon.material = new CheckerboardMaterialProperty();
        var updater = new PolygonGeometryUpdater(entity, scene);
        expect(updater.onTerrain).toBe(false);
    });

    var entity = createBasicPolygon();
    entity.polygon.extrudedHeight = createDynamicProperty(2);
    createDynamicGeometryBoundingSphereSpecs(PolygonGeometryUpdater, entity, entity.polygon, function() {
        return scene;
    });
}, 'WebGL');
