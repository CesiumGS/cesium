/*global defineSuite*/
defineSuite([
        'DataSources/CylinderGeometryUpdater',
        'Core/Cartesian3',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/JulianDate',
        'Core/Quaternion',
        'Core/ShowGeometryInstanceAttribute',
        'Core/TimeInterval',
        'Core/TimeIntervalCollection',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantPositionProperty',
        'DataSources/ConstantProperty',
        'DataSources/CylinderGraphics',
        'DataSources/Entity',
        'DataSources/GridMaterialProperty',
        'DataSources/SampledPositionProperty',
        'DataSources/SampledProperty',
        'DataSources/TimeIntervalCollectionProperty',
        'Scene/PrimitiveCollection',
        'Specs/createDynamicGeometryBoundingSphereSpecs',
        'Specs/createDynamicProperty',
        'Specs/createScene'
    ], function(
        CylinderGeometryUpdater,
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        JulianDate,
        Quaternion,
        ShowGeometryInstanceAttribute,
        TimeInterval,
        TimeIntervalCollection,
        ColorMaterialProperty,
        ConstantPositionProperty,
        ConstantProperty,
        CylinderGraphics,
        Entity,
        GridMaterialProperty,
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

    function createBasicCylinder() {
        var cylinder = new CylinderGraphics();
        cylinder.length = new ConstantProperty(1000);
        cylinder.topRadius = new ConstantProperty(1000);
        cylinder.bottomRadius = new ConstantProperty(1000);

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(Cartesian3.fromDegrees(0, 0, 0));
        entity.cylinder = cylinder;
        return entity;
    }

    it('Constructor sets expected defaults', function() {
        var entity = new Entity();
        var updater = new CylinderGeometryUpdater(entity, scene);

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
        expect(updater.isDynamic).toBe(false);
        expect(updater.isOutlineVisible(time)).toBe(false);
        expect(updater.isFilled(time)).toBe(false);
        updater.destroy();
        expect(updater.isDestroyed()).toBe(true);
    });

    it('No geometry available when cylinder is undefined ', function() {
        var entity = createBasicCylinder();
        var updater = new CylinderGeometryUpdater(entity, scene);
        entity.cylinder = undefined;

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('No geometry available when topRadius is undefined', function() {
        var entity = createBasicCylinder();
        var updater = new CylinderGeometryUpdater(entity, scene);
        entity.cylinder.topRadius = undefined;

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('No geometry available when bottomRadius is undefined', function() {
        var entity = createBasicCylinder();
        var updater = new CylinderGeometryUpdater(entity, scene);
        entity.cylinder.bottomRadius = undefined;

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('No geometry available when not filled or outline.', function() {
        var entity = createBasicCylinder();
        var updater = new CylinderGeometryUpdater(entity, scene);
        entity.cylinder.fill = new ConstantProperty(false);
        entity.cylinder.outline = new ConstantProperty(false);

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('Values correct when using default graphics', function() {
        var entity = createBasicCylinder();
        var updater = new CylinderGeometryUpdater(entity, scene);

        expect(updater.isClosed).toBe(true);
        expect(updater.fillEnabled).toBe(true);
        expect(updater.fillMaterialProperty).toEqual(new ColorMaterialProperty(Color.WHITE));
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.hasConstantFill).toBe(true);
        expect(updater.hasConstantOutline).toBe(true);
        expect(updater.outlineColorProperty).toBe(undefined);
        expect(updater.outlineWidth).toBe(1.0);
        expect(updater.isDynamic).toBe(false);
    });

    it('Cylinder material is correctly exposed.', function() {
        var entity = createBasicCylinder();
        var updater = new CylinderGeometryUpdater(entity, scene);
        entity.cylinder.material = new GridMaterialProperty(Color.BLUE);
        expect(updater.fillMaterialProperty).toBe(entity.cylinder.material);
    });

    it('A time-varying outline width causes geometry to be dynamic', function() {
        var entity = createBasicCylinder();
        var updater = new CylinderGeometryUpdater(entity, scene);
        entity.cylinder.outlineWidth = new SampledProperty(Number);
        entity.cylinder.outlineWidth.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying position causes geometry to be dynamic', function() {
        var entity = createBasicCylinder();
        var updater = new CylinderGeometryUpdater(entity, scene);
        entity.position = new SampledPositionProperty();
        entity.position.addSample(time, Cartesian3.ZERO);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying bottomRadius causes geometry to be dynamic', function() {
        var entity = createBasicCylinder();
        var updater = new CylinderGeometryUpdater(entity, scene);
        entity.cylinder.bottomRadius = new SampledProperty(Number);
        entity.cylinder.bottomRadius.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying topRadius causes geometry to be dynamic', function() {
        var entity = createBasicCylinder();
        var updater = new CylinderGeometryUpdater(entity, scene);
        entity.cylinder.topRadius = new SampledProperty(Number);
        entity.cylinder.topRadius.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying length causes geometry to be dynamic', function() {
        var entity = createBasicCylinder();
        var updater = new CylinderGeometryUpdater(entity, scene);
        entity.cylinder.length = new SampledProperty(Number);
        entity.cylinder.length.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying numberOfVerticalLines causes geometry to be dynamic', function() {
        var entity = createBasicCylinder();
        var updater = new CylinderGeometryUpdater(entity, scene);
        entity.cylinder.numberOfVerticalLines = new SampledProperty(Number);
        entity.cylinder.numberOfVerticalLines.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    function validateGeometryInstance(options) {
        var entity = new Entity();
        entity.position = new ConstantPositionProperty(options.position);
        entity.orientation = new ConstantProperty(options.orientation);

        var cylinder = new CylinderGraphics();
        cylinder.show = new ConstantProperty(options.show);
        cylinder.fill = new ConstantProperty(options.fill);
        cylinder.material = options.material;
        cylinder.outline = new ConstantProperty(options.outline);
        cylinder.outlineColor = new ConstantProperty(options.outlineColor);
        cylinder.numberOfVerticalLines = new ConstantProperty(options.numberOfVerticalLines);

        cylinder.length = new ConstantProperty(options.length);
        cylinder.topRadius = new ConstantProperty(options.topRadius);
        cylinder.bottomRadius = new ConstantProperty(options.bottomRadius);
        entity.cylinder = cylinder;

        var updater = new CylinderGeometryUpdater(entity, scene);

        var instance;
        var geometry;
        var attributes;
        if (options.fill) {
            instance = updater.createFillGeometryInstance(time);
            geometry = instance.geometry;
            expect(geometry._topRadius).toEqual(options.topRadius);
            expect(geometry._bottomRadius).toEqual(options.bottomRadius);
            expect(geometry._length).toEqual(options.length);

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
            expect(geometry._topRadius).toEqual(options.topRadius);
            expect(geometry._bottomRadius).toEqual(options.bottomRadius);
            expect(geometry._length).toEqual(options.length);
            expect(geometry._numberOfVerticalLines).toEqual(options.numberOfVerticalLines);

            attributes = instance.attributes;
            expect(attributes.color.value).toEqual(ColorGeometryInstanceAttribute.toValue(options.outlineColor));
            expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(options.fill));
        }
    }

    it('Creates expected per-color geometry', function() {
        validateGeometryInstance({
            position : new Cartesian3(4, 5, 6),
            orientation : Quaternion.IDENTITY,
            length : 1,
            topRadius : 3,
            bottomRadius : 2,
            show : true,
            material : new ColorMaterialProperty(Color.RED),
            fill : true,
            outline : true,
            outlineColor : Color.BLUE,
            numberOfVerticalLines : 15
        });
    });

    it('Creates expected per-material geometry', function() {
        validateGeometryInstance({
            position : new Cartesian3(4, 5, 6),
            orientation : Quaternion.IDENTITY,
            length : 1,
            topRadius : 3,
            bottomRadius : 2,
            show : true,
            material : new GridMaterialProperty(),
            fill : true,
            outline : true,
            outlineColor : Color.BLUE,
            numberOfVerticalLines : 15
        });
    });

    it('Correctly exposes outlineWidth', function() {
        var entity = createBasicCylinder();
        entity.cylinder.outlineWidth = new ConstantProperty(8);
        var updater = new CylinderGeometryUpdater(entity, scene);
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

        var entity = createBasicCylinder();
        entity.cylinder.fill = fill;
        entity.cylinder.material = colorMaterial;
        entity.cylinder.outline = outline;
        entity.cylinder.outlineColor = outlineColor;

        var updater = new CylinderGeometryUpdater(entity, scene);

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
        var entity = createBasicCylinder();
        entity.show = false;
        entity.cylinder.fill = true;
        var updater = new CylinderGeometryUpdater(entity, scene);
        var instance = updater.createFillGeometryInstance(new JulianDate());
        var attributes = instance.attributes;
        expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(false));
    });

    it('createOutlineGeometryInstance obeys Entity.show is false.', function() {
        var entity = createBasicCylinder();
        entity.show = false;
        entity.cylinder.outline = true;
        var updater = new CylinderGeometryUpdater(entity, scene);
        var instance = updater.createFillGeometryInstance(new JulianDate());
        var attributes = instance.attributes;
        expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(false));
    });

    it('dynamic updater sets properties', function() {
        var cylinder = new CylinderGraphics();
        cylinder.show = createDynamicProperty(true);
        cylinder.topRadius = createDynamicProperty(2);
        cylinder.bottomRadius = createDynamicProperty(1);
        cylinder.length = createDynamicProperty(3);
        cylinder.outline = createDynamicProperty(true);
        cylinder.fill = createDynamicProperty(true);

        var entity = new Entity();
        entity.position = createDynamicProperty(Cartesian3.UNIT_Z);
        entity.orientation = createDynamicProperty(Quaternion.IDENTITY);
        entity.cylinder = cylinder;

        var updater = new CylinderGeometryUpdater(entity, scene);
        var primitives = new PrimitiveCollection();
        var dynamicUpdater = updater.createDynamicUpdater(primitives);
        expect(primitives.length).toBe(0);

        dynamicUpdater.update(JulianDate.now());
        expect(primitives.length).toBe(2);
        expect(dynamicUpdater.isDestroyed()).toBe(false);

        expect(dynamicUpdater._options.id).toBe(entity);
        expect(dynamicUpdater._options.topRadius).toEqual(cylinder.topRadius.getValue());
        expect(dynamicUpdater._options.bottomRadius).toEqual(cylinder.bottomRadius.getValue());

        entity.show = false;
        dynamicUpdater.update(JulianDate.now());
        expect(primitives.length).toBe(0);
        entity.show = true;

        cylinder.show.setValue(false);
        dynamicUpdater.update(JulianDate.now());
        expect(primitives.length).toBe(0);

        cylinder.show.setValue(true);
        cylinder.fill.setValue(false);
        dynamicUpdater.update(JulianDate.now());
        expect(primitives.length).toBe(1);

        cylinder.fill.setValue(true);
        cylinder.outline.setValue(false);
        dynamicUpdater.update(JulianDate.now());
        expect(primitives.length).toBe(1);

        cylinder.length.setValue(undefined);
        dynamicUpdater.update(JulianDate.now());
        expect(primitives.length).toBe(0);

        dynamicUpdater.destroy();
        expect(primitives.length).toBe(0);
        updater.destroy();
    });

    it('geometryChanged event is raised when expected', function() {
        var entity = createBasicCylinder();
        var updater = new CylinderGeometryUpdater(entity, scene);
        var listener = jasmine.createSpy('listener');
        updater.geometryChanged.addEventListener(listener);

        entity.position = new ConstantPositionProperty(Cartesian3.UNIT_Z);
        expect(listener.calls.count()).toEqual(1);

        entity.cylinder.topRadius = new ConstantProperty(82);
        expect(listener.calls.count()).toEqual(2);

        entity.availability = new TimeIntervalCollection();
        expect(listener.calls.count()).toEqual(3);

        entity.cylinder.topRadius = undefined;
        expect(listener.calls.count()).toEqual(4);

        //Since there's no valid geometry, changing another property should not raise the event.
        entity.cylinder.bottomRadius = undefined;

        //Modifying an unrelated property should not have any effect.
        entity.viewFrom = new ConstantProperty(Cartesian3.UNIT_X);
        expect(listener.calls.count()).toEqual(4);

        entity.cylinder.topRadius = new SampledProperty(Number);
        entity.cylinder.bottomRadius = new SampledProperty(Number);
        expect(listener.calls.count()).toEqual(5);
    });

    it('createFillGeometryInstance throws if object is not filled', function() {
        var entity = new Entity();
        var updater = new CylinderGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createFillGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createFillGeometryInstance throws if no time provided', function() {
        var entity = createBasicCylinder();
        var updater = new CylinderGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createFillGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws if object is not outlined', function() {
        var entity = new Entity();
        var updater = new CylinderGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createOutlineGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws if no time provided', function() {
        var entity = createBasicCylinder();
        entity.cylinder.outline = new ConstantProperty(true);
        var updater = new CylinderGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createOutlineGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if not dynamic', function() {
        var entity = createBasicCylinder();
        var updater = new CylinderGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createDynamicUpdater(new PrimitiveCollection());
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if primitives undefined', function() {
        var entity = createBasicCylinder();
        entity.cylinder.topRadius = createDynamicProperty(4);
        var updater = new CylinderGeometryUpdater(entity, scene);
        expect(updater.isDynamic).toBe(true);
        expect(function() {
            return updater.createDynamicUpdater(undefined);
        }).toThrowDeveloperError();
    });

    it('dynamicUpdater.update throws if no time specified', function() {
        var entity = createBasicCylinder();
        entity.cylinder.topRadius = createDynamicProperty(4);
        var updater = new CylinderGeometryUpdater(entity, scene);
        var dynamicUpdater = updater.createDynamicUpdater(new PrimitiveCollection());
        expect(function() {
            dynamicUpdater.update(undefined);
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no Entity supplied', function() {
        expect(function() {
            return new CylinderGeometryUpdater(undefined, scene);
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no scene supplied', function() {
        var entity = createBasicCylinder();
        expect(function() {
            return new CylinderGeometryUpdater(entity, undefined);
        }).toThrowDeveloperError();
    });

    var entity = createBasicCylinder();
    entity.cylinder.topRadius = createDynamicProperty(4);
    createDynamicGeometryBoundingSphereSpecs(CylinderGeometryUpdater, entity, entity.cylinder, function() {
        return scene;
    });
}, 'WebGL');
