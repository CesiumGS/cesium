defineSuite([
        'DataSources/PlaneGeometryUpdater',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/DistanceDisplayCondition',
        'Core/DistanceDisplayConditionGeometryInstanceAttribute',
        'Core/JulianDate',
        'Core/Plane',
        'Core/ShowGeometryInstanceAttribute',
        'Core/TimeInterval',
        'Core/TimeIntervalCollection',
        'DataSources/PlaneGraphics',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantPositionProperty',
        'DataSources/ConstantProperty',
        'DataSources/Entity',
        'DataSources/GridMaterialProperty',
        'DataSources/SampledProperty',
        'DataSources/TimeIntervalCollectionProperty',
        'Scene/PrimitiveCollection',
        'Scene/ShadowMode',
        'Specs/createDynamicGeometryBoundingSphereSpecs',
        'Specs/createDynamicProperty',
        'Specs/createScene'
    ], function(
        PlaneGeometryUpdater,
        Cartesian2,
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        DistanceDisplayCondition,
        DistanceDisplayConditionGeometryInstanceAttribute,
        JulianDate,
        Plane,
        ShowGeometryInstanceAttribute,
        TimeInterval,
        TimeIntervalCollection,
        PlaneGraphics,
        ColorMaterialProperty,
        ConstantPositionProperty,
        ConstantProperty,
        Entity,
        GridMaterialProperty,
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

    function createBasicPlane() {
        var planeGraphics = new PlaneGraphics();
        planeGraphics.plane = new ConstantProperty(new Plane(Cartesian3.UNIT_X, 0.0));
        planeGraphics.dimensions = new ConstantProperty(new Cartesian2(1.0, 2.0));
        var entity = new Entity();
        entity.position = new ConstantPositionProperty(Cartesian3.fromDegrees(0, 0, 0));
        entity.plane = planeGraphics;
        return entity;
    }

    it('Constructor sets expected defaults', function() {
        var entity = new Entity();
        var updater = new PlaneGeometryUpdater(entity, scene);

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
        expect(updater.shadowsProperty).toBe(undefined);
        expect(updater.distanceDisplayConditionProperty).toBe(undefined);
        expect(updater.isDynamic).toBe(false);
        expect(updater.isOutlineVisible(time)).toBe(false);
        expect(updater.isFilled(time)).toBe(false);
        updater.destroy();
        expect(updater.isDestroyed()).toBe(true);
    });

    it('No geometry available when plane is undefined ', function() {
        var entity = createBasicPlane();
        var updater = new PlaneGeometryUpdater(entity, scene);
        entity.plane = undefined;

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('No geometry available when not filled or outline.', function() {
        var entity = createBasicPlane();
        var updater = new PlaneGeometryUpdater(entity, scene);
        entity.plane.fill = new ConstantProperty(false);
        entity.plane.outline = new ConstantProperty(false);

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('Values correct when using default graphics', function() {
        var entity = createBasicPlane();
        var updater = new PlaneGeometryUpdater(entity, scene);

        expect(updater.isClosed).toBe(false);
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

    it('Plane material is correctly exposed.', function() {
        var entity = createBasicPlane();
        var updater = new PlaneGeometryUpdater(entity, scene);
        entity.plane.material = new GridMaterialProperty(Color.BLUE);
        expect(updater.fillMaterialProperty).toBe(entity.plane.material);
    });

    it('A time-varying outlineWidth causes geometry to be dynamic', function() {
        var entity = createBasicPlane();
        var updater = new PlaneGeometryUpdater(entity, scene);
        entity.plane.outlineWidth = createDynamicProperty();
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying plane causes geometry to be dynamic', function() {
        var entity = createBasicPlane();
        var updater = new PlaneGeometryUpdater(entity, scene);
        entity.plane.plane = createDynamicProperty();

        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying dimensions causes geometry to be dynamic', function() {
        var entity = createBasicPlane();
        var updater = new PlaneGeometryUpdater(entity, scene);
        entity.plane.dimensions = createDynamicProperty();

        expect(updater.isDynamic).toBe(true);
    });

    function validateGeometryInstance(options) {
        var entity = createBasicPlane();

        var plane = entity.plane;
        plane.show = new ConstantProperty(options.show);
        plane.fill = new ConstantProperty(options.fill);
        plane.material = options.material;
        plane.outline = new ConstantProperty(options.outline);
        plane.outlineColor = new ConstantProperty(options.outlineColor);
        plane.plane = new ConstantProperty(options.plane);
        plane.dimensions = new ConstantProperty(options.dimensions);
        plane.distanceDisplayCondition = options.distanceDisplayCondition;

        var updater = new PlaneGeometryUpdater(entity, scene);

        var instance;
        var attributes;
        if (options.fill) {
            instance = updater.createFillGeometryInstance(time);

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
            fill : true,
            outline : true,
            outlineColor : Color.BLUE,
            plane : new Plane(Cartesian3.UNIT_X, 0.0),
            dimensions : new Cartesian2(1.0, 2.0)
        });
    });

    it('Creates expected per-material geometry', function() {
        validateGeometryInstance({
            show : true,
            material : new GridMaterialProperty(),
            fill : true,
            outline : true,
            outlineColor : Color.BLUE,
            plane : new Plane(Cartesian3.UNIT_X, 0.0),
            dimensions : new Cartesian2(1.0, 2.0)
        });
    });

    it('Creates expected distance display condition geometry', function() {
        validateGeometryInstance({
            show : true,
            material : new ColorMaterialProperty(Color.RED),
            fill : true,
            outline : true,
            outlineColor : Color.BLUE,
            plane : new Plane(Cartesian3.UNIT_X, 0.0),
            dimensions : new Cartesian2(1.0, 2.0),
            distanceDisplayCondition : new DistanceDisplayCondition(10.0, 100.0)
        });
    });

    it('Correctly exposes outlineWidth', function() {
        var entity = createBasicPlane();
        entity.plane.outlineWidth = new ConstantProperty(8);
        var updater = new PlaneGeometryUpdater(entity, scene);
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

        var entity = createBasicPlane();
        entity.plane.fill = fill;
        entity.plane.material = colorMaterial;
        entity.plane.outline = outline;
        entity.plane.outlineColor = outlineColor;

        var updater = new PlaneGeometryUpdater(entity, scene);

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
        var entity = createBasicPlane();
        entity.show = false;
        entity.plane.fill = true;
        var updater = new PlaneGeometryUpdater(entity, scene);
        var instance = updater.createFillGeometryInstance(new JulianDate());
        var attributes = instance.attributes;
        expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(false));
    });

    it('createOutlineGeometryInstance obeys Entity.show is false.', function() {
        var entity = createBasicPlane();
        entity.show = false;
        entity.plane.outline = true;
        var updater = new PlaneGeometryUpdater(entity, scene);
        var instance = updater.createFillGeometryInstance(new JulianDate());
        var attributes = instance.attributes;
        expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(false));
    });

    it('dynamic updater sets properties', function() {
        var entity = new Entity();
        entity.position = new ConstantPositionProperty(Cartesian3.fromDegrees(0, 0, 0));
        var planeGraphics = new PlaneGraphics();
        entity.plane = planeGraphics;

        planeGraphics.show = createDynamicProperty(true);
        planeGraphics.plane = createDynamicProperty(new Plane(Cartesian3.UNIT_X, 0.0));
        planeGraphics.dimensions = createDynamicProperty(new Cartesian3(1.0, 2.0));
        planeGraphics.outline = createDynamicProperty(true);
        planeGraphics.fill = createDynamicProperty(true);

        var updater = new PlaneGeometryUpdater(entity, scene);
        var primitives = new PrimitiveCollection();
        var dynamicUpdater = updater.createDynamicUpdater(primitives);
        expect(primitives.length).toBe(0);

        dynamicUpdater.update(JulianDate.now());
        expect(primitives.length).toBe(2);
        expect(dynamicUpdater.isDestroyed()).toBe(false);

        expect(dynamicUpdater._options.id).toBe(entity);
        expect(dynamicUpdater._options.plane).toEqual(planeGraphics.plane.getValue());
        expect(dynamicUpdater._options.dimensions).toEqual(planeGraphics.dimensions.getValue());

        entity.show = false;
        dynamicUpdater.update(JulianDate.now());
        expect(primitives.length).toBe(0);
        entity.show = true;

        planeGraphics.show.setValue(false);
        dynamicUpdater.update(JulianDate.now());
        expect(primitives.length).toBe(0);

        planeGraphics.show.setValue(true);
        planeGraphics.fill.setValue(false);
        dynamicUpdater.update(JulianDate.now());
        expect(primitives.length).toBe(1);

        planeGraphics.fill.setValue(true);
        planeGraphics.outline.setValue(false);
        dynamicUpdater.update(JulianDate.now());
        expect(primitives.length).toBe(1);

        dynamicUpdater.destroy();
        expect(primitives.length).toBe(0);
        updater.destroy();
    });

    it('geometryChanged event is raised when expected', function() {
        var entity = createBasicPlane();
        var updater = new PlaneGeometryUpdater(entity, scene);
        var listener = jasmine.createSpy('listener');
        updater.geometryChanged.addEventListener(listener);

        entity.plane.dimensions = new ConstantProperty();
        expect(listener.calls.count()).toEqual(1);

        entity.availability = new TimeIntervalCollection();
        expect(listener.calls.count()).toEqual(2);

        entity.plane.dimensions = undefined;
        expect(listener.calls.count()).toEqual(3);

        //Since there's no valid geometry, changing another property should not raise the event.
        entity.plane.height = undefined;

        //Modifying an unrelated property should not have any effect.
        entity.viewFrom = new ConstantProperty(Cartesian3.UNIT_X);
        expect(listener.calls.count()).toEqual(3);
    });

    it('createFillGeometryInstance throws if object is not filled', function() {
        var entity = new Entity();
        var updater = new PlaneGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createFillGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createFillGeometryInstance throws if no time provided', function() {
        var entity = createBasicPlane();
        var updater = new PlaneGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createFillGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws if object is not outlined', function() {
        var entity = new Entity();
        var updater = new PlaneGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createOutlineGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws if no time provided', function() {
        var entity = createBasicPlane();
        entity.plane.outline = new ConstantProperty(true);
        var updater = new PlaneGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createOutlineGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if not dynamic', function() {
        var entity = createBasicPlane();
        var updater = new PlaneGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createDynamicUpdater(new PrimitiveCollection());
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if primitives undefined', function() {
        var entity = createBasicPlane();
        entity.plane.dimensions = createDynamicProperty(new Cartesian2(1.0, 2.0
        ));
        var updater = new PlaneGeometryUpdater(entity, scene);
        expect(updater.isDynamic).toBe(true);
        expect(function() {
            return updater.createDynamicUpdater(undefined);
        }).toThrowDeveloperError();
    });

    it('dynamicUpdater.update throws if no time specified', function() {
        var entity = createBasicPlane();
        entity.plane.dimensions = createDynamicProperty(new Cartesian2(1.0, 2.0));
        var updater = new PlaneGeometryUpdater(entity, scene);
        var dynamicUpdater = updater.createDynamicUpdater(new PrimitiveCollection());
        expect(function() {
            dynamicUpdater.update(undefined);
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no Entity supplied', function() {
        expect(function() {
            return new PlaneGeometryUpdater(undefined, scene);
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no scene supplied', function() {
        var entity = createBasicPlane();
        expect(function() {
            return new PlaneGeometryUpdater(entity, undefined);
        }).toThrowDeveloperError();
    });

    var entity = createBasicPlane();
    entity.plane.plane = createDynamicProperty(new Plane(Cartesian3.UNIT_X, 0.0));
    entity.plane.dimensions = createDynamicProperty(new Cartesian2(1.0, 2.0));
    createDynamicGeometryBoundingSphereSpecs(PlaneGeometryUpdater, entity, entity.plane, function() {
        return scene;
    });
}, 'WebGL');
