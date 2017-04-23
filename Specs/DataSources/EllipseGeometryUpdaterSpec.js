/*global defineSuite*/
defineSuite([
        'DataSources/EllipseGeometryUpdater',
        'Core/Cartesian3',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/DistanceDisplayCondition',
        'Core/DistanceDisplayConditionGeometryInstanceAttribute',
        'Core/JulianDate',
        'Core/ShowGeometryInstanceAttribute',
        'Core/TimeInterval',
        'Core/TimeIntervalCollection',
        'DataSources/CheckerboardMaterialProperty',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantPositionProperty',
        'DataSources/ConstantProperty',
        'DataSources/EllipseGraphics',
        'DataSources/Entity',
        'DataSources/GridMaterialProperty',
        'DataSources/SampledPositionProperty',
        'DataSources/SampledProperty',
        'DataSources/TimeIntervalCollectionProperty',
        'Scene/GroundPrimitive',
        'Scene/PrimitiveCollection',
        'Scene/ShadowMode',
        'Specs/createDynamicGeometryBoundingSphereSpecs',
        'Specs/createDynamicProperty',
        'Specs/createScene'
    ], function(
        EllipseGeometryUpdater,
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        DistanceDisplayCondition,
        DistanceDisplayConditionGeometryInstanceAttribute,
        JulianDate,
        ShowGeometryInstanceAttribute,
        TimeInterval,
        TimeIntervalCollection,
        CheckerboardMaterialProperty,
        ColorMaterialProperty,
        ConstantPositionProperty,
        ConstantProperty,
        EllipseGraphics,
        Entity,
        GridMaterialProperty,
        SampledPositionProperty,
        SampledProperty,
        TimeIntervalCollectionProperty,
        GroundPrimitive,
        PrimitiveCollection,
        ShadowMode,
        createDynamicGeometryBoundingSphereSpecs,
        createDynamicProperty,
        createScene) {
    'use strict';

    var scene;
    var time;
    var groundPrimitiveSupported;

    beforeAll(function() {
        scene = createScene();
        time = JulianDate.now();
        groundPrimitiveSupported = GroundPrimitive.isSupported(scene);
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    function createBasicEllipse() {
        var ellipse = new EllipseGraphics();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);
        ellipse.height = new ConstantProperty(0);

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(Cartesian3.fromDegrees(0, 0, 0));
        entity.ellipse = ellipse;
        return entity;
    }

    function createBasicEllipseWithoutHeight() {
        var ellipse = new EllipseGraphics();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(Cartesian3.fromDegrees(0, 0, 0));
        entity.ellipse = ellipse;
        return entity;
    }


    it('Constructor sets expected defaults', function() {
        var entity = new Entity();
        var updater = new EllipseGeometryUpdater(entity, scene);

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
        expect(updater.distanceDisplayConditionProperty).toBe(undefined);
        expect(updater.isDynamic).toBe(false);
        expect(updater.isOutlineVisible(time)).toBe(false);
        expect(updater.isFilled(time)).toBe(false);
        expect(updater.shadowsProperty).toBe(undefined);
        updater.destroy();
        expect(updater.isDestroyed()).toBe(true);
    });

    it('No geometry available when ellipse is undefined ', function() {
        var entity = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(entity, scene);
        entity.ellipse = undefined;

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('No geometry available when semiMajorAxis is undefined', function() {
        var entity = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(entity, scene);
        entity.ellipse.semiMajorAxis = undefined;

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('No geometry available when semiMinorAxis is undefined', function() {
        var entity = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(entity, scene);
        entity.ellipse.semiMinorAxis = undefined;

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('No geometry available when not filled or outline.', function() {
        var entity = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(entity, scene);
        entity.ellipse.fill = new ConstantProperty(false);
        entity.ellipse.outline = new ConstantProperty(false);

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('Values correct when using default graphics', function() {
        var entity = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(entity, scene);

        expect(updater.isClosed).toBe(false);
        expect(updater.fillEnabled).toBe(true);
        expect(updater.fillMaterialProperty).toEqual(new ColorMaterialProperty(Color.WHITE));
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.hasConstantFill).toBe(true);
        expect(updater.hasConstantOutline).toBe(true);
        expect(updater.outlineColorProperty).toBe(undefined);
        expect(updater.outlineWidth).toBe(1.0);
        expect(updater.isDynamic).toBe(false);
        expect(updater.shadowsProperty).toEqual(new ConstantProperty(ShadowMode.DISABLED));
        expect(updater.distanceDisplayConditionProperty).toEqual(new ConstantProperty(new DistanceDisplayCondition()));
    });

    it('Ellipse material is correctly exposed.', function() {
        var entity = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(entity, scene);
        entity.ellipse.material = new GridMaterialProperty(Color.BLUE);
        expect(updater.fillMaterialProperty).toBe(entity.ellipse.material);
    });

    it('Settings extrudedHeight causes geometry to be closed.', function() {
        var entity = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(entity, scene);
        entity.ellipse.extrudedHeight = new ConstantProperty(1000);
        expect(updater.isClosed).toBe(true);
    });

    it('A time-varying outline width causes geometry to be dynamic', function() {
        var entity = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(entity, scene);
        entity.ellipse.outlineWidth = new SampledProperty(Number);
        entity.ellipse.outlineWidth.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying position causes geometry to be dynamic', function() {
        var entity = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(entity, scene);
        entity.position = new SampledPositionProperty();
        entity.position.addSample(time, Cartesian3.ZERO);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying semiMinorAxis causes geometry to be dynamic', function() {
        var entity = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(entity, scene);
        entity.ellipse.semiMinorAxis = new SampledProperty(Number);
        entity.ellipse.semiMinorAxis.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying semiMajorAxis causes geometry to be dynamic', function() {
        var entity = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(entity, scene);
        entity.ellipse.semiMajorAxis = new SampledProperty(Number);
        entity.ellipse.semiMajorAxis.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying rotation causes geometry to be dynamic', function() {
        var entity = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(entity, scene);
        entity.ellipse.rotation = new SampledProperty(Number);
        entity.ellipse.rotation.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying height causes geometry to be dynamic', function() {
        var entity = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(entity, scene);
        entity.ellipse.height = new SampledProperty(Number);
        entity.ellipse.height.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying extrudedHeight causes geometry to be dynamic', function() {
        var entity = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(entity, scene);
        entity.ellipse.extrudedHeight = new SampledProperty(Number);
        entity.ellipse.extrudedHeight.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying granularity causes geometry to be dynamic', function() {
        var entity = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(entity, scene);
        entity.ellipse.granularity = new SampledProperty(Number);
        entity.ellipse.granularity.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying stRotation causes geometry to be dynamic', function() {
        var entity = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(entity, scene);
        entity.ellipse.stRotation = new SampledProperty(Number);
        entity.ellipse.stRotation.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying numberOfVerticalLines causes geometry to be dynamic', function() {
        var entity = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(entity, scene);
        entity.ellipse.numberOfVerticalLines = new SampledProperty(Number);
        entity.ellipse.numberOfVerticalLines.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying color causes ground geometry to be dynamic', function() {
        var entity = createBasicEllipseWithoutHeight();
        var updater = new EllipseGeometryUpdater(entity, scene);
        var color = new SampledProperty(Color);
        color.addSample(time, Color.WHITE);
        entity.ellipse.material = new ColorMaterialProperty(color);
        expect(updater.isDynamic).toBe(groundPrimitiveSupported);
    });

    function validateGeometryInstance(options) {
        var entity = new Entity();
        entity.position = new ConstantPositionProperty(options.center);

        var ellipse = new EllipseGraphics();
        ellipse.show = new ConstantProperty(options.show);
        ellipse.fill = new ConstantProperty(options.fill);
        ellipse.material = options.material;
        ellipse.outline = new ConstantProperty(options.outline);
        ellipse.outlineColor = new ConstantProperty(options.outlineColor);
        ellipse.numberOfVerticalLines = new ConstantProperty(options.numberOfVerticalLines);

        ellipse.semiMajorAxis = new ConstantProperty(options.semiMajorAxis);
        ellipse.semiMinorAxis = new ConstantProperty(options.semiMinorAxis);
        ellipse.rotation = new ConstantProperty(options.rotation);
        ellipse.stRotation = new ConstantProperty(options.stRotation);
        ellipse.height = new ConstantProperty(options.height);
        ellipse.extrudedHeight = new ConstantProperty(options.extrudedHeight);
        ellipse.granularity = new ConstantProperty(options.granularity);
        ellipse.distanceDisplayCondition = options.distanceDisplayCondition;
        entity.ellipse = ellipse;

        var updater = new EllipseGeometryUpdater(entity, scene);

        var instance;
        var geometry;
        var attributes;
        if (options.fill) {
            instance = updater.createFillGeometryInstance(time);
            geometry = instance.geometry;
            expect(geometry._center).toEqual(options.center);
            expect(geometry._semiMajorAxis).toEqual(options.semiMajorAxis);
            expect(geometry._semiMinorAxis).toEqual(options.semiMinorAxis);
            expect(geometry._rotation).toEqual(options.rotation);
            expect(geometry._stRotation).toEqual(options.stRotation);
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
            if (options.distanceDisplayCondition) {
                expect(attributes.distanceDisplayCondition.value).toEqual(DistanceDisplayConditionGeometryInstanceAttribute.toValue(options.distanceDisplayCondition));
            }
        }

        if (options.outline) {
            instance = updater.createOutlineGeometryInstance(time);
            geometry = instance.geometry;
            expect(geometry._center).toEqual(options.center);
            expect(geometry._semiMajorAxis).toEqual(options.semiMajorAxis);
            expect(geometry._semiMinorAxis).toEqual(options.semiMinorAxis);
            expect(geometry._rotation).toEqual(options.rotation);
            expect(geometry._height).toEqual(options.height);
            expect(geometry._granularity).toEqual(options.granularity);
            expect(geometry._extrudedHeight).toEqual(options.extrudedHeight);
            expect(geometry._numberOfVerticalLines).toEqual(options.numberOfVerticalLines);

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
            center : new Cartesian3(4, 5, 6),
            rotation : 1,
            semiMajorAxis : 3,
            semiMinorAxis : 2,
            show : true,
            material : new ColorMaterialProperty(Color.RED),
            height : 123,
            extrudedHeight : 431,
            granularity : 0.97,
            stRotation : 12,
            fill : true,
            outline : true,
            outlineColor : Color.BLUE,
            numberOfVerticalLines : 15
        });
    });

    it('Creates expected per-material geometry', function() {
        validateGeometryInstance({
            center : new Cartesian3(4, 5, 6),
            rotation : 1,
            semiMajorAxis : 3,
            semiMinorAxis : 2,
            show : true,
            material : new GridMaterialProperty(),
            height : 123,
            extrudedHeight : 431,
            granularity : 0.97,
            stRotation : 12,
            fill : true,
            outline : true,
            outlineColor : Color.BLUE,
            numberOfVerticalLines : 15
        });
    });

    it('Creates expected distance display condition geometry', function() {
        validateGeometryInstance({
            center : new Cartesian3(4, 5, 6),
            rotation : 1,
            semiMajorAxis : 3,
            semiMinorAxis : 2,
            show : true,
            material : new ColorMaterialProperty(Color.RED),
            height : 123,
            extrudedHeight : 431,
            granularity : 0.97,
            stRotation : 12,
            fill : true,
            outline : true,
            outlineColor : Color.BLUE,
            numberOfVerticalLines : 15,
            distanceDisplayCondition : new DistanceDisplayCondition(10.0, 100.0)
        });
    });

    it('Correctly exposes outlineWidth', function() {
        var entity = createBasicEllipse();
        entity.ellipse.outlineWidth = new ConstantProperty(8);
        var updater = new EllipseGeometryUpdater(entity, scene);
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

        var entity = createBasicEllipse();
        entity.ellipse.fill = fill;
        entity.ellipse.material = colorMaterial;
        entity.ellipse.outline = outline;
        entity.ellipse.outlineColor = outlineColor;

        var updater = new EllipseGeometryUpdater(entity, scene);

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
        var entity = createBasicEllipse();
        entity.ellipse.height = undefined;
        entity.ellipse.outline = new ConstantProperty(true);

        var updater = new EllipseGeometryUpdater(entity, scene);

        if (groundPrimitiveSupported) {
            expect(updater.onTerrain).toBe(true);
            expect(updater.outlineEnabled).toBe(false);
        } else {
            expect(updater.onTerrain).toBe(false);
            expect(updater.outlineEnabled).toBe(true);
        }
    });

    it('Checks that an entity with height isn\'t on terrain', function() {
        var entity = createBasicEllipse();
        entity.ellipse.height = new ConstantProperty(1);

        var updater = new EllipseGeometryUpdater(entity, scene);

        expect(updater.onTerrain).toBe(false);
    });

    it('Checks that an entity with extrudedHeight isn\'t on terrain', function() {
        var entity = createBasicEllipse();
        entity.ellipse.height = undefined;
        entity.ellipse.extrudedHeight = new ConstantProperty(1);

        var updater = new EllipseGeometryUpdater(entity, scene);

        expect(updater.onTerrain).toBe(false);
    });

    it('Checks that an entity with a non-color material isn\'t on terrain', function() {
        var entity = createBasicEllipse();
        entity.ellipse.height = undefined;
        entity.ellipse.material = new GridMaterialProperty(Color.BLUE);

        var updater = new EllipseGeometryUpdater(entity, scene);

        expect(updater.onTerrain).toBe(false);
    });

    it('createFillGeometryInstance obeys Entity.show is false.', function() {
        var entity = createBasicEllipse();
        entity.show = false;
        entity.ellipse.fill = true;
        var updater = new EllipseGeometryUpdater(entity, scene);
        var instance = updater.createFillGeometryInstance(new JulianDate());
        var attributes = instance.attributes;
        expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(false));
    });

    it('createOutlineGeometryInstance obeys Entity.show is false.', function() {
        var entity = createBasicEllipse();
        entity.show = false;
        entity.ellipse.outline = true;
        var updater = new EllipseGeometryUpdater(entity, scene);
        var instance = updater.createFillGeometryInstance(new JulianDate());
        var attributes = instance.attributes;
        expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(false));
    });

    it('dynamic updater sets properties', function() {
        var ellipse = new EllipseGraphics();
        ellipse.show = createDynamicProperty(true);
        ellipse.semiMajorAxis = createDynamicProperty(2);
        ellipse.semiMinorAxis = createDynamicProperty(1);
        ellipse.outline = createDynamicProperty(true);
        ellipse.fill = createDynamicProperty(true);
        ellipse.height = createDynamicProperty(1);

        var entity = new Entity();
        entity.position = createDynamicProperty(Cartesian3.UNIT_Z);
        entity.ellipse = ellipse;

        var updater = new EllipseGeometryUpdater(entity, scene);
        var primitives = new PrimitiveCollection();
        var groundPrimitives = new PrimitiveCollection();
        var dynamicUpdater = updater.createDynamicUpdater(primitives, groundPrimitives);
        expect(primitives.length).toBe(0);
        expect(groundPrimitives.length).toBe(0);

        dynamicUpdater.update(JulianDate.now());
        expect(primitives.length).toBe(2);
        expect(groundPrimitives.length).toBe(0);
        expect(dynamicUpdater.isDestroyed()).toBe(false);

        expect(dynamicUpdater._options.id).toBe(entity);
        expect(dynamicUpdater._options.semiMajorAxis).toEqual(ellipse.semiMajorAxis.getValue());
        expect(dynamicUpdater._options.semiMinorAxis).toEqual(ellipse.semiMinorAxis.getValue());

        entity.show = false;
        dynamicUpdater.update(JulianDate.now());
        expect(primitives.length).toBe(0);
        expect(groundPrimitives.length).toBe(0);
        entity.show = true;

        ellipse.show.setValue(false);
        dynamicUpdater.update(JulianDate.now());
        expect(primitives.length).toBe(0);
        expect(groundPrimitives.length).toBe(0);

        ellipse.show.setValue(true);
        ellipse.fill.setValue(false);
        dynamicUpdater.update(JulianDate.now());
        expect(primitives.length).toBe(1);
        expect(groundPrimitives.length).toBe(0);

        ellipse.fill.setValue(true);
        ellipse.outline.setValue(false);
        dynamicUpdater.update(JulianDate.now());
        expect(primitives.length).toBe(1);
        expect(groundPrimitives.length).toBe(0);

        ellipse.semiMajorAxis.setValue(undefined);
        dynamicUpdater.update(JulianDate.now());
        expect(primitives.length).toBe(0);
        expect(groundPrimitives.length).toBe(0);

        dynamicUpdater.destroy();
        expect(primitives.length).toBe(0);
        expect(groundPrimitives.length).toBe(0);
        updater.destroy();
    });

    it('dynamic updater on terrain', function() {
        var ellipse = new EllipseGraphics();
        ellipse.show = createDynamicProperty(true);
        ellipse.semiMajorAxis = createDynamicProperty(2);
        ellipse.semiMinorAxis = createDynamicProperty(1);
        ellipse.outline = createDynamicProperty(true);
        ellipse.fill = createDynamicProperty(true);

        var entity = new Entity();
        entity.position = createDynamicProperty(Cartesian3.UNIT_Z);
        entity.ellipse = ellipse;

        var updater = new EllipseGeometryUpdater(entity, scene);
        var primitives = new PrimitiveCollection();
        var groundPrimitives = new PrimitiveCollection();
        var dynamicUpdater = updater.createDynamicUpdater(primitives, groundPrimitives);
        expect(dynamicUpdater.isDestroyed()).toBe(false);
        expect(primitives.length).toBe(0);
        expect(groundPrimitives.length).toBe(0);

        dynamicUpdater.update(time);

        if (groundPrimitiveSupported) {
            expect(primitives.length).toBe(0);
            expect(groundPrimitives.length).toBe(1);
        } else {
            expect(primitives.length).toBe(2);
            expect(groundPrimitives.length).toBe(0);
        }

        dynamicUpdater.destroy();
        updater.destroy();
    });

    it('geometryChanged event is raised when expected', function() {
        var entity = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(entity, scene);
        var listener = jasmine.createSpy('listener');
        updater.geometryChanged.addEventListener(listener);

        entity.position = new ConstantPositionProperty(Cartesian3.UNIT_Z);
        expect(listener.calls.count()).toEqual(1);

        entity.ellipse.semiMajorAxis = new ConstantProperty(82);
        expect(listener.calls.count()).toEqual(2);

        entity.availability = new TimeIntervalCollection();
        expect(listener.calls.count()).toEqual(3);

        entity.ellipse.semiMajorAxis = undefined;
        expect(listener.calls.count()).toEqual(4);

        //Since there's no valid geometry, changing another property should not raise the event.
        entity.ellipse.semiMinorAxis = undefined;

        //Modifying an unrelated property should not have any effect.
        entity.viewFrom = new ConstantProperty(Cartesian3.UNIT_X);
        expect(listener.calls.count()).toEqual(4);

        entity.ellipse.semiMajorAxis = new SampledProperty(Number);
        entity.ellipse.semiMinorAxis = new SampledProperty(Number);
        expect(listener.calls.count()).toEqual(5);
    });

    it('createFillGeometryInstance throws if object is not filled', function() {
        var entity = new Entity();
        var updater = new EllipseGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createFillGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createFillGeometryInstance throws if no time provided', function() {
        var entity = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createFillGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws if object is not outlined', function() {
        var entity = new Entity();
        var updater = new EllipseGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createOutlineGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws if no time provided', function() {
        var entity = createBasicEllipse();
        entity.ellipse.outline = new ConstantProperty(true);
        var updater = new EllipseGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createOutlineGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if not dynamic', function() {
        var entity = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createDynamicUpdater(new PrimitiveCollection());
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if primitives undefined', function() {
        var entity = createBasicEllipse();
        entity.ellipse.semiMajorAxis = createDynamicProperty(4);
        var updater = new EllipseGeometryUpdater(entity, scene);
        expect(updater.isDynamic).toBe(true);
        expect(function() {
            return updater.createDynamicUpdater(undefined);
        }).toThrowDeveloperError();
    });

    it('dynamicUpdater.update throws if no time specified', function() {
        var entity = createBasicEllipse();
        entity.ellipse.semiMajorAxis = createDynamicProperty(4);
        var updater = new EllipseGeometryUpdater(entity, scene);
        var dynamicUpdater = updater.createDynamicUpdater(new PrimitiveCollection());
        expect(function() {
            dynamicUpdater.update(undefined);
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no Entity supplied', function() {
        expect(function() {
            return new EllipseGeometryUpdater(undefined, scene);
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no scene supplied', function() {
        var entity = createBasicEllipse();
        expect(function() {
            return new EllipseGeometryUpdater(entity, undefined);
        }).toThrowDeveloperError();
    });

    it('fill is true sets onTerrain to true', function() {
        var entity = createBasicEllipseWithoutHeight();
        entity.ellipse.fill = true;
        var updater = new EllipseGeometryUpdater(entity, scene);
        if (groundPrimitiveSupported) {
            expect(updater.onTerrain).toBe(true);
        } else {
            expect(updater.onTerrain).toBe(false);
        }
    });

    it('fill is false sets onTerrain to false', function() {
        var entity = createBasicEllipseWithoutHeight();
        entity.ellipse.fill = false;
        var updater = new EllipseGeometryUpdater(entity, scene);
        expect(updater.onTerrain).toBe(false);
    });

    it('a defined height sets onTerrain to false', function() {
        var entity = createBasicEllipseWithoutHeight();
        entity.ellipse.fill = true;
        entity.ellipse.height = 0;
        var updater = new EllipseGeometryUpdater(entity, scene);
        expect(updater.onTerrain).toBe(false);
    });

    it('a defined extrudedHeight sets onTerrain to false', function() {
        var entity = createBasicEllipseWithoutHeight();
        entity.ellipse.fill = true;
        entity.ellipse.extrudedHeight = 12;
        var updater = new EllipseGeometryUpdater(entity, scene);
        expect(updater.onTerrain).toBe(false);
    });

    it('color material sets onTerrain to true', function() {
        var entity = createBasicEllipseWithoutHeight();
        entity.ellipse.fill = true;
        entity.ellipse.material = new ColorMaterialProperty(Color.WHITE);
        var updater = new EllipseGeometryUpdater(entity, scene);
        if (groundPrimitiveSupported) {
            expect(updater.onTerrain).toBe(true);
        } else {
            expect(updater.onTerrain).toBe(false);
        }
    });

    it('non-color material sets onTerrain to false', function() {
        var entity = createBasicEllipseWithoutHeight();
        entity.ellipse.fill = true;
        entity.ellipse.material = new CheckerboardMaterialProperty();
        var updater = new EllipseGeometryUpdater(entity, scene);
        expect(updater.onTerrain).toBe(false);
    });

    var entity = createBasicEllipse();
    entity.ellipse.semiMajorAxis = createDynamicProperty(4);
    createDynamicGeometryBoundingSphereSpecs(EllipseGeometryUpdater, entity, entity.ellipse, function() {
        return scene;
    });
}, 'WebGL');
