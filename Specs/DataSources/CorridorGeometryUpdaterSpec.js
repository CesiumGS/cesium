/*global defineSuite*/
defineSuite([
        'DataSources/CorridorGeometryUpdater',
        'Core/Cartesian3',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/CornerType',
        'Core/JulianDate',
        'Core/ShowGeometryInstanceAttribute',
        'Core/TimeInterval',
        'Core/TimeIntervalCollection',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantProperty',
        'DataSources/CorridorGraphics',
        'DataSources/Entity',
        'DataSources/GridMaterialProperty',
        'DataSources/PropertyArray',
        'DataSources/SampledPositionProperty',
        'DataSources/SampledProperty',
        'DataSources/TimeIntervalCollectionProperty',
        'Scene/PrimitiveCollection',
        'Specs/createDynamicGeometryBoundingSphereSpecs',
        'Specs/createDynamicProperty',
        'Specs/createScene'
    ], function(
        CorridorGeometryUpdater,
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        CornerType,
        JulianDate,
        ShowGeometryInstanceAttribute,
        TimeInterval,
        TimeIntervalCollection,
        ColorMaterialProperty,
        ConstantProperty,
        CorridorGraphics,
        Entity,
        GridMaterialProperty,
        PropertyArray,
        SampledPositionProperty,
        SampledProperty,
        TimeIntervalCollectionProperty,
        PrimitiveCollection,
        createDynamicGeometryBoundingSphereSpecs,
        createDynamicProperty,
        createScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var scene;
    var time;

    beforeAll(function() {
        scene = createScene();
        time = JulianDate.now();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    function createBasicCorridor() {
        var corridor = new CorridorGraphics();
        corridor.positions = new ConstantProperty(Cartesian3.fromRadiansArray([
            0, 0,
            1, 0,
            1, 1,
            0, 1
        ]));
        corridor.width = new ConstantProperty(1);
        var entity = new Entity();
        entity.corridor = corridor;
        return entity;
    }

    it('Constructor sets expected defaults', function() {
        var entity = new Entity();
        var updater = new CorridorGeometryUpdater(entity, scene);

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
        expect(updater.isOutlineVisible(time)).toBe(false);
        expect(updater.isFilled(time)).toBe(false);
        updater.destroy();
        expect(updater.isDestroyed()).toBe(true);
    });

    it('No geometry available when corridor is undefined ', function() {
        var entity = createBasicCorridor();
        var updater = new CorridorGeometryUpdater(entity, scene);
        entity.corridor = undefined;

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('No geometry available when not filled or outline.', function() {
        var entity = createBasicCorridor();
        var updater = new CorridorGeometryUpdater(entity, scene);
        entity.corridor.fill = new ConstantProperty(false);
        entity.corridor.outline = new ConstantProperty(false);

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('Values correct when using default graphics', function() {
        var entity = createBasicCorridor();
        var updater = new CorridorGeometryUpdater(entity, scene);

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

    it('Corridor material is correctly exposed.', function() {
        var entity = createBasicCorridor();
        var updater = new CorridorGeometryUpdater(entity, scene);
        entity.corridor.material = new GridMaterialProperty(Color.BLUE);
        expect(updater.fillMaterialProperty).toBe(entity.corridor.material);
    });

    it('Settings extrudedHeight causes geometry to be closed.', function() {
        var entity = createBasicCorridor();
        var updater = new CorridorGeometryUpdater(entity, scene);
        entity.corridor.extrudedHeight = new ConstantProperty(1000);
        expect(updater.isClosed).toBe(true);
    });

    it('A time-varying outlineWidth causes geometry to be dynamic', function() {
        var entity = createBasicCorridor();
        var updater = new CorridorGeometryUpdater(entity, scene);
        entity.corridor.outlineWidth = new SampledProperty(Number);
        entity.corridor.outlineWidth.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying positions causes geometry to be dynamic', function() {
        var entity = createBasicCorridor();
        var updater = new CorridorGeometryUpdater(entity, scene);
        var point1 = new SampledPositionProperty();
        point1.addSample(time, new Cartesian3());
        var point2 = new SampledPositionProperty();
        point2.addSample(time, new Cartesian3());
        var point3 = new SampledPositionProperty();
        point3.addSample(time, new Cartesian3());

        entity.corridor.positions = new PropertyArray();
        entity.corridor.positions.setValue([point1, point2, point3]);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying height causes geometry to be dynamic', function() {
        var entity = createBasicCorridor();
        var updater = new CorridorGeometryUpdater(entity, scene);
        entity.corridor.height = new SampledProperty(Number);
        entity.corridor.height.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying extrudedHeight causes geometry to be dynamic', function() {
        var entity = createBasicCorridor();
        var updater = new CorridorGeometryUpdater(entity, scene);
        entity.corridor.extrudedHeight = new SampledProperty(Number);
        entity.corridor.extrudedHeight.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying granularity causes geometry to be dynamic', function() {
        var entity = createBasicCorridor();
        var updater = new CorridorGeometryUpdater(entity, scene);
        entity.corridor.granularity = new SampledProperty(Number);
        entity.corridor.granularity.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying width causes geometry to be dynamic', function() {
        var entity = createBasicCorridor();
        var updater = new CorridorGeometryUpdater(entity, scene);
        entity.corridor.width = new SampledProperty(Number);
        entity.corridor.width.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying cornerType causes geometry to be dynamic', function() {
        var entity = createBasicCorridor();
        var updater = new CorridorGeometryUpdater(entity, scene);
        entity.corridor.cornerType = new TimeIntervalCollectionProperty();
        entity.corridor.cornerType.intervals.addInterval(new TimeInterval({
            start : JulianDate.now(),
            stop : JulianDate.now(),
            data : CornerType.ROUNDED
        }));
        expect(updater.isDynamic).toBe(true);
    });

    function validateGeometryInstance(options) {
        var entity = createBasicCorridor();

        var corridor = entity.corridor;
        corridor.show = new ConstantProperty(options.show);
        corridor.fill = new ConstantProperty(options.fill);
        corridor.material = options.material;
        corridor.outline = new ConstantProperty(options.outline);
        corridor.outlineColor = new ConstantProperty(options.outlineColor);
        corridor.cornerType = new ConstantProperty(options.cornerType);

        corridor.width = new ConstantProperty(options.width);
        corridor.height = new ConstantProperty(options.height);
        corridor.extrudedHeight = new ConstantProperty(options.extrudedHeight);
        corridor.granularity = new ConstantProperty(options.granularity);

        var updater = new CorridorGeometryUpdater(entity, scene);

        var instance;
        var geometry;
        var attributes;
        if (options.fill) {
            instance = updater.createFillGeometryInstance(time);
            geometry = instance.geometry;
            expect(geometry._width).toEqual(options.width);
            expect(geometry._height).toEqual(options.height);
            expect(geometry._granularity).toEqual(options.granularity);
            expect(geometry._extrudedHeight).toEqual(options.extrudedHeight);

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
            expect(geometry._cornerType).toEqual(options.cornerType);

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
            width : 12,
            fill : true,
            outline : true,
            outlineColor : Color.BLUE,
            cornerType : CornerType.MITERED
        });
    });

    it('Creates expected per-material geometry', function() {
        validateGeometryInstance({
            show : true,
            material : new GridMaterialProperty(),
            height : 431,
            extrudedHeight : 123,
            granularity : 0.97,
            width : 12,
            fill : true,
            outline : true,
            outlineColor : Color.BLUE,
            cornerType : CornerType.BEVELED
        });
    });

    it('Correctly exposes outlineWidth', function() {
        var entity = createBasicCorridor();
        entity.corridor.outlineWidth = new ConstantProperty(8);
        var updater = new CorridorGeometryUpdater(entity, scene);
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

        var entity = createBasicCorridor();
        entity.corridor.fill = fill;
        entity.corridor.material = colorMaterial;
        entity.corridor.outline = outline;
        entity.corridor.outlineColor = outlineColor;

        var updater = new CorridorGeometryUpdater(entity, scene);

        var instance = updater.createFillGeometryInstance(time2);
        var attributes = instance.attributes;
        expect(attributes.color.value).toEqual(ColorGeometryInstanceAttribute.toValue(colorMaterial.color.getValue(time2)));
        expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(fill.getValue(time2)));

        instance = updater.createOutlineGeometryInstance(time2);
        attributes = instance.attributes;
        expect(attributes.color.value).toEqual(ColorGeometryInstanceAttribute.toValue(outlineColor.getValue(time2)));
        expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(outline.getValue(time2)));
    });

    it('dynamic updater sets properties', function() {
        var corridor = new CorridorGraphics();
        corridor.positions = createDynamicProperty(Cartesian3.fromRadiansArray([
            0, 0,
            1, 0,
            1, 1,
            0, 1
        ]));
        corridor.show = createDynamicProperty(true);
        corridor.height = createDynamicProperty(3);
        corridor.extrudedHeight = createDynamicProperty(2);
        corridor.outline = createDynamicProperty(true);
        corridor.fill = createDynamicProperty(true);
        corridor.width = createDynamicProperty(6);
        corridor.granularity = createDynamicProperty(2);
        corridor.cornerType = createDynamicProperty(CornerType.MITERED);

        var entity = new Entity();
        entity.corridor = corridor;

        var updater = new CorridorGeometryUpdater(entity, scene);
        var primitives = new PrimitiveCollection();
        var dynamicUpdater = updater.createDynamicUpdater(primitives);
        expect(dynamicUpdater.isDestroyed()).toBe(false);
        expect(primitives.length).toBe(0);

        dynamicUpdater.update(time);
        expect(primitives.length).toBe(2);

        var options = dynamicUpdater._options;
        expect(options.id).toEqual(entity);
        expect(options.positions).toEqual(corridor.positions.getValue());
        expect(options.height).toEqual(corridor.height.getValue());
        expect(options.extrudedHeight).toEqual(corridor.extrudedHeight.getValue());
        expect(options.width).toEqual(corridor.width.getValue());
        expect(options.granularity).toEqual(corridor.granularity.getValue());
        expect(options.cornerType).toEqual(corridor.cornerType.getValue());

        entity.show = false;
        dynamicUpdater.update(JulianDate.now());
        expect(primitives.length).toBe(0);
        entity.show = true;

        //If a dynamic show returns false, the primitive should go away.
        corridor.show.setValue(false);
        dynamicUpdater.update(time);
        expect(primitives.length).toBe(0);

        corridor.show.setValue(true);
        dynamicUpdater.update(time);
        expect(primitives.length).toBe(2);

        //If a dynamic position returns undefined, the primitive should go away.
        corridor.positions.setValue(undefined);
        dynamicUpdater.update(time);
        expect(primitives.length).toBe(0);

        dynamicUpdater.destroy();
        updater.destroy();
    });

    it('geometryChanged event is raised when expected', function() {
        var entity = createBasicCorridor();
        var updater = new CorridorGeometryUpdater(entity, scene);
        var listener = jasmine.createSpy('listener');
        updater.geometryChanged.addEventListener(listener);

        entity.corridor.positions = new ConstantProperty([]);
        expect(listener.calls.count()).toEqual(1);

        entity.corridor.height = new ConstantProperty(82);
        expect(listener.calls.count()).toEqual(2);

        entity.availability = new TimeIntervalCollection();
        expect(listener.calls.count()).toEqual(3);

        entity.corridor.positions = undefined;
        expect(listener.calls.count()).toEqual(4);

        //Since there's no valid geometry, changing another property should not raise the event.
        entity.corridor.height = undefined;

        //Modifying an unrelated property should not have any effect.
        entity.viewFrom = new ConstantProperty(Cartesian3.UNIT_X);
        expect(listener.calls.count()).toEqual(4);
    });

    it('createFillGeometryInstance throws if object is not filled', function() {
        var entity = new Entity();
        var updater = new CorridorGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createFillGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createFillGeometryInstance throws if no time provided', function() {
        var entity = createBasicCorridor();
        var updater = new CorridorGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createFillGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws if object is not outlined', function() {
        var entity = new Entity();
        var updater = new CorridorGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createOutlineGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws if no time provided', function() {
        var entity = createBasicCorridor();
        entity.corridor.outline = new ConstantProperty(true);
        var updater = new CorridorGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createOutlineGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if not dynamic', function() {
        var entity = createBasicCorridor();
        var updater = new CorridorGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createDynamicUpdater(new PrimitiveCollection());
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if primitives undefined', function() {
        var entity = createBasicCorridor();
        entity.corridor.height = new SampledProperty(Number);
        entity.corridor.height.addSample(time, 4);
        var updater = new CorridorGeometryUpdater(entity, scene);
        expect(updater.isDynamic).toBe(true);
        expect(function() {
            return updater.createDynamicUpdater(undefined);
        }).toThrowDeveloperError();
    });

    it('dynamicUpdater.update throws if no time specified', function() {
        var entity = createBasicCorridor();
        entity.corridor.height = new SampledProperty(Number);
        entity.corridor.height.addSample(time, 4);
        var updater = new CorridorGeometryUpdater(entity, scene);
        var dynamicUpdater = updater.createDynamicUpdater(new PrimitiveCollection());
        expect(function() {
            dynamicUpdater.update(undefined);
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no Entity supplied', function() {
        expect(function() {
            return new CorridorGeometryUpdater(undefined, scene);
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no scene supplied', function() {
        var entity = createBasicCorridor();
        expect(function() {
            return new CorridorGeometryUpdater(entity, undefined);
        }).toThrowDeveloperError();
    });

    var entity = createBasicCorridor();
    entity.corridor.positions = createDynamicProperty(Cartesian3.fromRadiansArray([0, 0, 1, 0, 1, 1, 0, 1]));
    createDynamicGeometryBoundingSphereSpecs(CorridorGeometryUpdater, entity, entity.corridor, function() {
        return scene;
    });
});