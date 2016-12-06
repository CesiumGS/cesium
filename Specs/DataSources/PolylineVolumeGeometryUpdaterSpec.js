/*global defineSuite*/
defineSuite([
        'DataSources/PolylineVolumeGeometryUpdater',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/CornerType',
        'Core/DistanceDisplayCondition',
        'Core/DistanceDisplayConditionGeometryInstanceAttribute',
        'Core/JulianDate',
        'Core/ShowGeometryInstanceAttribute',
        'Core/TimeInterval',
        'Core/TimeIntervalCollection',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantProperty',
        'DataSources/Entity',
        'DataSources/GridMaterialProperty',
        'DataSources/PolylineVolumeGraphics',
        'DataSources/SampledProperty',
        'DataSources/TimeIntervalCollectionProperty',
        'Scene/PrimitiveCollection',
        'Scene/ShadowMode',
        'Specs/createDynamicGeometryBoundingSphereSpecs',
        'Specs/createDynamicProperty',
        'Specs/createScene'
    ], function(
        PolylineVolumeGeometryUpdater,
        Cartesian2,
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        CornerType,
        DistanceDisplayCondition,
        DistanceDisplayConditionGeometryInstanceAttribute,
        JulianDate,
        ShowGeometryInstanceAttribute,
        TimeInterval,
        TimeIntervalCollection,
        ColorMaterialProperty,
        ConstantProperty,
        Entity,
        GridMaterialProperty,
        PolylineVolumeGraphics,
        SampledProperty,
        TimeIntervalCollectionProperty,
        PrimitiveCollection,
        ShadowMode,
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

    var shape = [new Cartesian2(-1, -1), new Cartesian2(1, -1), new Cartesian2(1, 1), new Cartesian2(1, -1)];

    function createBasicPolylineVolume() {
        var polylineVolume = new PolylineVolumeGraphics();
        polylineVolume.positions = new ConstantProperty(Cartesian3.fromDegreesArray([
            0, 0,
            1, 0,
            1, 1,
            0, 1
        ]));
        polylineVolume.shape = new ConstantProperty(shape);
        var entity = new Entity();
        entity.polylineVolume = polylineVolume;
        return entity;
    }

    it('Constructor sets expected defaults', function() {
        var entity = new Entity();
        var updater = new PolylineVolumeGeometryUpdater(entity, scene);

        expect(updater.isDestroyed()).toBe(false);
        expect(updater.entity).toBe(entity);
        expect(updater.isClosed).toBe(true);
        expect(updater.fillEnabled).toBe(false);
        expect(updater.fillMaterialProperty).toBe(undefined);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.hasConstantFill).toBe(true);
        expect(updater.hasConstantOutline).toBe(true);
        expect(updater.outlineColorProperty).toBe(undefined);
        expect(updater.outlineWidth).toBe(1.0);
        expect(updater.shadowsProperty).toBe(undefined);
        expect(updater.distanceDisplayConditionProperty).toBe(undefined);
        expect(updater.isDynamic).toBe(false);
        expect(updater.isOutlineVisible(time)).toBe(false);
        expect(updater.isFilled(time)).toBe(false);
        updater.destroy();
        expect(updater.isDestroyed()).toBe(true);
    });

    it('No geometry available when polylineVolume is undefined ', function() {
        var entity = createBasicPolylineVolume();
        var updater = new PolylineVolumeGeometryUpdater(entity, scene);
        entity.polylineVolume = undefined;

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('No geometry available when not filled or outline.', function() {
        var entity = createBasicPolylineVolume();
        var updater = new PolylineVolumeGeometryUpdater(entity, scene);
        entity.polylineVolume.fill = new ConstantProperty(false);
        entity.polylineVolume.outline = new ConstantProperty(false);

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('Values correct when using default graphics', function() {
        var entity = createBasicPolylineVolume();
        var updater = new PolylineVolumeGeometryUpdater(entity, scene);

        expect(updater.fillEnabled).toBe(true);
        expect(updater.fillMaterialProperty).toEqual(new ColorMaterialProperty(Color.WHITE));
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.hasConstantFill).toBe(true);
        expect(updater.hasConstantOutline).toBe(true);
        expect(updater.outlineColorProperty).toBe(undefined);
        expect(updater.outlineWidth).toBe(1.0);
        expect(updater.shadowsProperty).toEqual(new ConstantProperty(ShadowMode.DISABLED));
        expect(updater.distanceDisplayConditionProperty).toEqual(new ConstantProperty(new DistanceDisplayCondition()));
        expect(updater.isDynamic).toBe(false);
    });

    it('PolylineVolume material is correctly exposed.', function() {
        var entity = createBasicPolylineVolume();
        var updater = new PolylineVolumeGeometryUpdater(entity, scene);
        entity.polylineVolume.material = new GridMaterialProperty(Color.BLUE);
        expect(updater.fillMaterialProperty).toBe(entity.polylineVolume.material);
    });

    it('A time-varying outlineWidth causes geometry to be dynamic', function() {
        var entity = createBasicPolylineVolume();
        var updater = new PolylineVolumeGeometryUpdater(entity, scene);
        entity.polylineVolume.outlineWidth = createDynamicProperty(1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying positions causes geometry to be dynamic', function() {
        var entity = createBasicPolylineVolume();
        var updater = new PolylineVolumeGeometryUpdater(entity, scene);
        entity.polylineVolume.positions = createDynamicProperty(Cartesian3.fromRadiansArray([0, 0, 1, 0, 1, 1, 0, 1]));
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying shape causes geometry to be dynamic', function() {
        var entity = createBasicPolylineVolume();
        var updater = new PolylineVolumeGeometryUpdater(entity, scene);
        entity.polylineVolume.shape = createDynamicProperty(shape);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying granularity causes geometry to be dynamic', function() {
        var entity = createBasicPolylineVolume();
        var updater = new PolylineVolumeGeometryUpdater(entity, scene);
        entity.polylineVolume.granularity = createDynamicProperty(1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying cornerType causes geometry to be dynamic', function() {
        var entity = createBasicPolylineVolume();
        var updater = new PolylineVolumeGeometryUpdater(entity, scene);
        entity.polylineVolume.cornerType = new TimeIntervalCollectionProperty();
        entity.polylineVolume.cornerType.intervals.addInterval(new TimeInterval({
            start : JulianDate.now(),
            stop : JulianDate.now(),
            data : CornerType.ROUNDED
        }));
        expect(updater.isDynamic).toBe(true);
    });

    function validateGeometryInstance(options) {
        var entity = createBasicPolylineVolume();

        var polylineVolume = entity.polylineVolume;
        polylineVolume.show = new ConstantProperty(options.show);
        polylineVolume.fill = new ConstantProperty(options.fill);
        polylineVolume.material = options.material;
        polylineVolume.outline = new ConstantProperty(options.outline);
        polylineVolume.outlineColor = new ConstantProperty(options.outlineColor);
        polylineVolume.cornerType = new ConstantProperty(options.cornerType);

        polylineVolume.shape = new ConstantProperty(options.shape);
        polylineVolume.granularity = new ConstantProperty(options.granularity);
        polylineVolume.distanceDisplayCondition = options.distanceDisplayCondition;

        var updater = new PolylineVolumeGeometryUpdater(entity, scene);

        var instance;
        var geometry;
        var attributes;
        if (options.fill) {
            instance = updater.createFillGeometryInstance(time);
            geometry = instance.geometry;
            expect(geometry._shape).toEqual(options.shape);
            expect(geometry._granularity).toEqual(options.granularity);

            attributes = instance.attributes;
            if (options.material instanceof ColorMaterialProperty) {
                expect(attributes.color.value).toEqual(ColorGeometryInstanceAttribute.toValue(options.material.color.getValue(time)));
            } else {
                expect(attributes.color).toBeUndefined();
            }
            expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(options.fill));
            if (options.distanceDisplayCondition) {
                expect(attributes.distanceDisplayCondition.value).toEqual(DistanceDisplayConditionGeometryInstanceAttribute.toValue(options.distanceDisplayCondition));
            }
        }

        if (options.outline) {
            instance = updater.createOutlineGeometryInstance(time);
            geometry = instance.geometry;
            expect(geometry._shape).toEqual(options.shape);
            expect(geometry._granularity).toEqual(options.granularity);
            expect(geometry._cornerType).toEqual(options.cornerType);

            attributes = instance.attributes;
            expect(attributes.color.value).toEqual(ColorGeometryInstanceAttribute.toValue(options.outlineColor));
            expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(options.fill));
            if (options.distanceDisplayCondition) {
                expect(attributes.distanceDisplayCondition.value).toEqual(DistanceDisplayConditionGeometryInstanceAttribute.toValue(options.distanceDisplayCondition));
            }
        }
    }

    it('Creates expected per-color geometry', function() {
        validateGeometryInstance({
            show : true,
            material : new ColorMaterialProperty(Color.RED),
            shape : shape,
            granularity : 0.97,
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
            shape : shape,
            granularity : 0.97,
            fill : true,
            outline : true,
            outlineColor : Color.BLUE,
            cornerType : CornerType.BEVELED
        });
    });

    it('Creates expected distance display condition geometry', function() {
        validateGeometryInstance({
            show : true,
            material : new ColorMaterialProperty(Color.RED),
            shape : shape,
            granularity : 0.97,
            fill : true,
            outline : true,
            outlineColor : Color.BLUE,
            cornerType : CornerType.MITERED,
            distanceDisplayCondition : new DistanceDisplayCondition(10.0, 100.0)
        });
    });

    it('Correctly exposes outlineWidth', function() {
        var entity = createBasicPolylineVolume();
        entity.polylineVolume.outlineWidth = new ConstantProperty(8);
        var updater = new PolylineVolumeGeometryUpdater(entity, scene);
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

        var entity = createBasicPolylineVolume();
        entity.polylineVolume.fill = fill;
        entity.polylineVolume.material = colorMaterial;
        entity.polylineVolume.outline = outline;
        entity.polylineVolume.outlineColor = outlineColor;

        var updater = new PolylineVolumeGeometryUpdater(entity, scene);

        var instance = updater.createFillGeometryInstance(time2);
        var attributes = instance.attributes;
        expect(attributes.color.value).toEqual(ColorGeometryInstanceAttribute.toValue(colorMaterial.color.getValue(time2)));
        expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(fill.getValue(time2)));

        instance = updater.createOutlineGeometryInstance(time2);
        attributes = instance.attributes;
        expect(attributes.color.value).toEqual(ColorGeometryInstanceAttribute.toValue(outlineColor.getValue(time2)));
        expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(outline.getValue(time2)));
    });

    it('createFillGeometryInstance obeys Entity.show is false.', function() {
        var entity = createBasicPolylineVolume();
        entity.show = false;
        entity.polylineVolume.fill = true;
        var updater = new PolylineVolumeGeometryUpdater(entity, scene);
        var instance = updater.createFillGeometryInstance(new JulianDate());
        var attributes = instance.attributes;
        expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(false));
    });

    it('createOutlineGeometryInstance obeys Entity.show is false.', function() {
        var entity = createBasicPolylineVolume();
        entity.show = false;
        entity.polylineVolume.outline = true;
        var updater = new PolylineVolumeGeometryUpdater(entity, scene);
        var instance = updater.createFillGeometryInstance(new JulianDate());
        var attributes = instance.attributes;
        expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(false));
    });

    it('dynamic updater sets properties', function() {
        var polylineVolume = new PolylineVolumeGraphics();
        polylineVolume.positions = createDynamicProperty(Cartesian3.fromRadiansArray([
            0, 0,
            1, 0,
            1, 1,
            0, 1
        ]));
        polylineVolume.show = createDynamicProperty(true);
        polylineVolume.shape = createDynamicProperty(shape);
        polylineVolume.outline = createDynamicProperty(true);
        polylineVolume.fill = createDynamicProperty(true);
        polylineVolume.granularity = createDynamicProperty(2);
        polylineVolume.cornerType = createDynamicProperty(CornerType.MITERED);

        var entity = new Entity();
        entity.polylineVolume = polylineVolume;

        var updater = new PolylineVolumeGeometryUpdater(entity, scene);
        var primitives = new PrimitiveCollection();
        var dynamicUpdater = updater.createDynamicUpdater(primitives);
        expect(dynamicUpdater.isDestroyed()).toBe(false);
        expect(primitives.length).toBe(0);

        dynamicUpdater.update(time);
        expect(primitives.length).toBe(2);

        var options = dynamicUpdater._options;
        expect(options.id).toEqual(entity);
        expect(options.polylinePositions).toEqual(polylineVolume.positions.getValue());
        expect(options.shapePositions).toEqual(polylineVolume.shape.getValue());
        expect(options.granularity).toEqual(polylineVolume.granularity.getValue());
        expect(options.cornerType).toEqual(polylineVolume.cornerType.getValue());

        entity.show = false;
        dynamicUpdater.update(JulianDate.now());
        expect(primitives.length).toBe(0);
        entity.show = true;

        //If a dynamic show returns false, the primitive should go away.
        polylineVolume.show.setValue(false);
        dynamicUpdater.update(time);
        expect(primitives.length).toBe(0);

        polylineVolume.show.setValue(true);
        dynamicUpdater.update(time);
        expect(primitives.length).toBe(2);

        //If a dynamic position returns undefined, the primitive should go away.
        polylineVolume.positions.setValue(undefined);
        dynamicUpdater.update(time);
        expect(primitives.length).toBe(0);

        dynamicUpdater.destroy();
        updater.destroy();
    });

    it('geometryChanged event is raised when expected', function() {
        var entity = createBasicPolylineVolume();
        var updater = new PolylineVolumeGeometryUpdater(entity, scene);
        var listener = jasmine.createSpy('listener');
        updater.geometryChanged.addEventListener(listener);

        entity.polylineVolume.positions = new ConstantProperty([]);
        expect(listener.calls.count()).toEqual(1);

        entity.polylineVolume.shape = new ConstantProperty(shape);
        expect(listener.calls.count()).toEqual(2);

        entity.availability = new TimeIntervalCollection();
        expect(listener.calls.count()).toEqual(3);

        entity.polylineVolume.positions = undefined;
        expect(listener.calls.count()).toEqual(4);

        //Since there's no valid geometry, changing another property should not raise the event.
        entity.polylineVolume.shape = undefined;

        //Modifying an unrelated property should not have any effect.
        entity.viewFrom = new ConstantProperty(Cartesian3.UNIT_X);
        expect(listener.calls.count()).toEqual(4);
    });

    it('createFillGeometryInstance throws if object is not filled', function() {
        var entity = new Entity();
        var updater = new PolylineVolumeGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createFillGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createFillGeometryInstance throws if no time provided', function() {
        var entity = createBasicPolylineVolume();
        var updater = new PolylineVolumeGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createFillGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws if object is not outlined', function() {
        var entity = new Entity();
        var updater = new PolylineVolumeGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createOutlineGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws if no time provided', function() {
        var entity = createBasicPolylineVolume();
        entity.polylineVolume.outline = new ConstantProperty(true);
        var updater = new PolylineVolumeGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createOutlineGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if not dynamic', function() {
        var entity = createBasicPolylineVolume();
        var updater = new PolylineVolumeGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createDynamicUpdater(new PrimitiveCollection());
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if primitives undefined', function() {
        var entity = createBasicPolylineVolume();
        entity.polylineVolume.outlineWidth = createDynamicProperty(1);
        var updater = new PolylineVolumeGeometryUpdater(entity, scene);
        expect(updater.isDynamic).toBe(true);
        expect(function() {
            return updater.createDynamicUpdater(undefined);
        }).toThrowDeveloperError();
    });

    it('dynamicUpdater.update throws if no time specified', function() {
        var entity = createBasicPolylineVolume();
        entity.polylineVolume.outlineWidth = createDynamicProperty(1);
        var updater = new PolylineVolumeGeometryUpdater(entity, scene);
        var dynamicUpdater = updater.createDynamicUpdater(new PrimitiveCollection());
        expect(function() {
            dynamicUpdater.update(undefined);
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no Entity supplied', function() {
        expect(function() {
            return new PolylineVolumeGeometryUpdater(undefined, scene);
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no scene supplied', function() {
        var entity = createBasicPolylineVolume();
        expect(function() {
            return new PolylineVolumeGeometryUpdater(entity, undefined);
        }).toThrowDeveloperError();
    });

    var entity = createBasicPolylineVolume();
    entity.polylineVolume.shape = createDynamicProperty(shape);
    createDynamicGeometryBoundingSphereSpecs(PolylineVolumeGeometryUpdater, entity, entity.polylineVolume, function() {
        return scene;
    });
}, 'WebGL');
