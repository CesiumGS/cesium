/*global defineSuite*/
defineSuite([
        'DataSources/EllipsoidGeometryUpdater',
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
        'DataSources/EllipsoidGraphics',
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
        EllipsoidGeometryUpdater,
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
        EllipsoidGraphics,
        Entity,
        GridMaterialProperty,
        SampledPositionProperty,
        SampledProperty,
        TimeIntervalCollectionProperty,
        PrimitiveCollection,
        createDynamicGeometryBoundingSphereSpecs,
        createDynamicProperty,
        createScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var time = JulianDate.now();
    var scene;

    beforeEach(function() {
        scene = createScene();
    });

    afterEach(function() {
        scene.destroyForSpecs();
    });

    function createBasicEllipsoid() {
        var ellipsoid = new EllipsoidGraphics();
        ellipsoid.radii = new ConstantProperty(new Cartesian3(1, 2, 3));

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(Cartesian3.fromDegrees(0, 0, 0));
        entity.ellipsoid = ellipsoid;
        return entity;
    }

    it('Constructor sets expected defaults', function() {
        var entity = new Entity();
        var updater = new EllipsoidGeometryUpdater(entity, scene);

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

    it('No geometry available when ellipsoid is undefined ', function() {
        var entity = createBasicEllipsoid();
        var updater = new EllipsoidGeometryUpdater(entity, scene);
        entity.ellipsoid = undefined;

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('No geometry available when radii is undefined', function() {
        var entity = createBasicEllipsoid();
        var updater = new EllipsoidGeometryUpdater(entity, scene);
        entity.ellipsoid.radii = undefined;

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('No geometry available when not filled or outline.', function() {
        var entity = createBasicEllipsoid();
        var updater = new EllipsoidGeometryUpdater(entity, scene);
        entity.ellipsoid.fill = new ConstantProperty(false);
        entity.ellipsoid.outline = new ConstantProperty(false);

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('Values correct when using default graphics', function() {
        var entity = createBasicEllipsoid();
        var updater = new EllipsoidGeometryUpdater(entity, scene);

        expect(updater.fillEnabled).toBe(true);
        expect(updater.fillMaterialProperty).toEqual(new ColorMaterialProperty(Color.WHITE));
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.hasConstantFill).toBe(true);
        expect(updater.hasConstantOutline).toBe(true);
        expect(updater.outlineColorProperty).toBe(undefined);
        expect(updater.outlineWidth).toBe(1.0);
        expect(updater.isDynamic).toBe(false);
    });

    it('Ellipsoid material is correctly exposed.', function() {
        var entity = createBasicEllipsoid();
        var updater = new EllipsoidGeometryUpdater(entity, scene);
        entity.ellipsoid.material = new GridMaterialProperty(Color.BLUE);
        expect(updater.fillMaterialProperty).toBe(entity.ellipsoid.material);
    });

    it('A time-varying outlineWidth causes geometry to be dynamic', function() {
        var entity = createBasicEllipsoid();
        var updater = new EllipsoidGeometryUpdater(entity, scene);
        entity.ellipsoid.outlineWidth = new SampledProperty(Number);
        entity.ellipsoid.outlineWidth.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying position causes geometry to be dynamic', function() {
        var entity = createBasicEllipsoid();
        var updater = new EllipsoidGeometryUpdater(entity, scene);
        entity.position = new SampledPositionProperty();
        entity.position.addSample(time, Cartesian3.ZERO);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying radii causes geometry to be dynamic', function() {
        var entity = createBasicEllipsoid();
        var updater = new EllipsoidGeometryUpdater(entity, scene);
        entity.ellipsoid.radii = new SampledProperty(Cartesian3);
        entity.ellipsoid.radii.addSample(time, new Cartesian3(1, 2, 3));
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying stackPartitions causes geometry to be dynamic', function() {
        var entity = createBasicEllipsoid();
        var updater = new EllipsoidGeometryUpdater(entity, scene);
        entity.ellipsoid.stackPartitions = new SampledProperty(Number);
        entity.ellipsoid.stackPartitions.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying slicePartitions causes geometry to be dynamic', function() {
        var entity = createBasicEllipsoid();
        var updater = new EllipsoidGeometryUpdater(entity, scene);
        entity.ellipsoid.slicePartitions = new SampledProperty(Number);
        entity.ellipsoid.slicePartitions.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying subdivisions causes geometry to be dynamic', function() {
        var entity = createBasicEllipsoid();
        var updater = new EllipsoidGeometryUpdater(entity, scene);
        entity.ellipsoid.subdivisions = new SampledProperty(Number);
        entity.ellipsoid.subdivisions.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    function validateGeometryInstance(options) {
        var entity = new Entity();
        entity.position = new ConstantPositionProperty(options.position);
        entity.orientation = new ConstantProperty(options.orientation);

        var ellipsoid = new EllipsoidGraphics();
        ellipsoid.show = new ConstantProperty(options.show);
        ellipsoid.fill = new ConstantProperty(options.fill);
        ellipsoid.material = options.material;
        ellipsoid.outline = new ConstantProperty(options.outline);
        ellipsoid.outlineColor = new ConstantProperty(options.outlineColor);
        ellipsoid.numberOfVerticalLines = new ConstantProperty(options.numberOfVerticalLines);
        ellipsoid.radii = new ConstantProperty(options.radii);
        ellipsoid.stackPartitions = new ConstantProperty(options.stackPartitions);
        ellipsoid.slicePartitions = new ConstantProperty(options.slicePartitions);
        ellipsoid.subdivisions = new ConstantProperty(options.subdivisions);
        entity.ellipsoid = ellipsoid;

        var updater = new EllipsoidGeometryUpdater(entity, scene);

        var instance;
        var geometry;
        var attributes;
        if (options.fill) {
            instance = updater.createFillGeometryInstance(time);
            geometry = instance.geometry;
            expect(geometry._center).toEqual(options.center);
            expect(geometry._radii).toEqual(options.radii);
            expect(geometry._stackPartitions).toEqual(options.stackPartitions);
            expect(geometry._slicePartitions).toEqual(options.slicePartitions);

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
            expect(geometry._center).toEqual(options.center);
            expect(geometry._radii).toEqual(options.radii);
            expect(geometry._stackPartitions).toEqual(options.stackPartitions);
            expect(geometry._slicePartitions).toEqual(options.slicePartitions);
            expect(geometry._subdivisions).toEqual(options.subdivisions);

            attributes = instance.attributes;
            expect(attributes.color.value).toEqual(ColorGeometryInstanceAttribute.toValue(options.outlineColor));
            expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(options.fill));
        }
    }

    it('Creates expected per-color geometry', function() {
        validateGeometryInstance({
            position : new Cartesian3(4, 5, 6),
            orientation : Quaternion.IDENTITY,
            radii : new Cartesian3(1, 2, 3),
            show : true,
            material : new ColorMaterialProperty(Color.RED),
            fill : true,
            outline : true,
            outlineColor : Color.BLUE,
            stackPartitions : 32,
            slicePartitions : 64,
            subdivisions : 15
        });
    });

    it('Creates expected per-material geometry', function() {
        validateGeometryInstance({
            position : new Cartesian3(4, 5, 6),
            orientation : Quaternion.IDENTITY,
            radii : new Cartesian3(1, 2, 3),
            show : true,
            material : new GridMaterialProperty(),
            fill : true,
            outline : true,
            outlineColor : Color.BLUE,
            stackPartitions : 32,
            slicePartitions : 64,
            subdivisions : 15
        });
    });

    it('Correctly exposes outlineWidth', function() {
        var entity = createBasicEllipsoid();
        entity.ellipsoid.outlineWidth = new ConstantProperty(8);
        var updater = new EllipsoidGeometryUpdater(entity, scene);
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

        var entity = createBasicEllipsoid();
        entity.ellipsoid.fill = fill;
        entity.ellipsoid.material = colorMaterial;
        entity.ellipsoid.outline = outline;
        entity.ellipsoid.outlineColor = outlineColor;

        var updater = new EllipsoidGeometryUpdater(entity, scene);

        var instance = updater.createFillGeometryInstance(time2);
        var attributes = instance.attributes;
        expect(attributes.color.value).toEqual(ColorGeometryInstanceAttribute.toValue(colorMaterial.color.getValue(time2)));
        expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(fill.getValue(time2)));

        instance = updater.createOutlineGeometryInstance(time2);
        attributes = instance.attributes;
        expect(attributes.color.value).toEqual(ColorGeometryInstanceAttribute.toValue(outlineColor.getValue(time2)));
        expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(outline.getValue(time2)));
    });

    it('dynamic ellipsoid creates and updates', function() {
        var ellipsoid = new EllipsoidGraphics();
        ellipsoid.show = createDynamicProperty(true);
        ellipsoid.radii = createDynamicProperty(new Cartesian3(1, 2, 3));
        ellipsoid.outline = createDynamicProperty(true);
        ellipsoid.fill = createDynamicProperty(true);

        var entity = new Entity();
        entity.position = createDynamicProperty(Cartesian3.fromDegrees(0, 0, 0));
        entity.orientation = createDynamicProperty(Quaternion.IDENTITY);
        entity.ellipsoid = ellipsoid;

        var updater = new EllipsoidGeometryUpdater(entity, scene);
        var primitives = new PrimitiveCollection();

        var dynamicUpdater = updater.createDynamicUpdater(primitives);
        expect(dynamicUpdater.isDestroyed()).toBe(false);
        expect(primitives.length).toBe(0);

        dynamicUpdater.update(time);
        expect(primitives.length).toBe(2); //Ellipsoid always has both fill and outline primitives regardless of setting
        expect(primitives.get(0).show).toBe(true);
        expect(primitives.get(1).show).toBe(true);

        ellipsoid.show.setValue(false);
        dynamicUpdater.update(time);
        expect(primitives.get(0).show).toBe(false);
        expect(primitives.get(1).show).toBe(false);
        expect(primitives.length).toBe(2);

        dynamicUpdater.destroy();
        expect(primitives.length).toBe(0);
        updater.destroy();
    });

    it('dynamic ellipsoid is hidden if missing required values', function() {
        var ellipsoid = new EllipsoidGraphics();
        ellipsoid.show = createDynamicProperty(true);
        ellipsoid.radii = createDynamicProperty(new Cartesian3(1, 2, 3));
        ellipsoid.outline = createDynamicProperty(true);
        ellipsoid.fill = createDynamicProperty(true);

        var entity = new Entity();
        entity.position = createDynamicProperty(Cartesian3.fromDegrees(0, 0, 0));
        entity.ellipsoid = ellipsoid;

        var updater = new EllipsoidGeometryUpdater(entity, scene);
        var primitives = scene.primitives;

        var dynamicUpdater = updater.createDynamicUpdater(primitives);
        dynamicUpdater.update(time);
        expect(primitives.length).toBe(2); //Ellipsoid always has both fill and outline primitives regardless of setting

        scene.initializeFrame();
        scene.render();

        //no position
        entity.position.setValue(undefined);
        dynamicUpdater.update(time);
        expect(primitives.get(0).show).toBe(false);
        expect(primitives.get(1).show).toBe(false);
        expect(primitives.length).toBe(2);

        //no radii
        entity.position.setValue(Cartesian3.fromDegrees(0, 0, 0));
        ellipsoid.radii.setValue(undefined);
        dynamicUpdater.update(time);
        expect(primitives.get(0).show).toBe(false);
        expect(primitives.get(1).show).toBe(false);
        expect(primitives.length).toBe(2);

        //everything valid again
        ellipsoid.radii.setValue(new Cartesian3(1, 2, 3));
        dynamicUpdater.update(time);
        expect(primitives.get(0).show).toBe(true);
        expect(primitives.get(1).show).toBe(true);
        expect(primitives.length).toBe(2);

        dynamicUpdater.destroy();
        expect(primitives.length).toBe(0);
        updater.destroy();
    });

    it('dynamic ellipsoid fast path updates attributes', function() {
        var ellipsoid = new EllipsoidGraphics();
        ellipsoid.show = createDynamicProperty(true);
        ellipsoid.radii = createDynamicProperty(new Cartesian3(1, 2, 3));
        ellipsoid.outline = createDynamicProperty(true);
        ellipsoid.fill = createDynamicProperty(true);
        ellipsoid.outlineColor = createDynamicProperty(Color.BLUE);
        ellipsoid.material = new ColorMaterialProperty(Color.RED);

        var entity = new Entity();
        entity.position = createDynamicProperty(Cartesian3.fromDegrees(0, 0, 0));
        entity.orientation = createDynamicProperty(Quaternion.IDENTITY);
        entity.ellipsoid = ellipsoid;

        var updater = new EllipsoidGeometryUpdater(entity, scene);
        var primitives = scene.primitives;

        var dynamicUpdater = updater.createDynamicUpdater(primitives);
        dynamicUpdater.update(time);
        expect(primitives.length).toBe(2); //Ellipsoid always has both fill and outline primitives regardless of setting

        scene.initializeFrame();
        scene.render();

        ellipsoid.fill.setValue(false);
        ellipsoid.outline.setValue(false);
        ellipsoid.outlineColor = createDynamicProperty(Color.YELLOW);
        ellipsoid.material = new ColorMaterialProperty(Color.ORANGE);
        dynamicUpdater.update(time);

        var attributes = primitives.get(0).getGeometryInstanceAttributes(entity);
        expect(attributes.show[0]).toEqual(0);
        expect(primitives.get(0).appearance.material.uniforms.color).toEqual(ellipsoid.material.color.getValue());

        attributes = primitives.get(1).getGeometryInstanceAttributes(entity);
        expect(attributes.show[0]).toEqual(0);
        expect(attributes.color).toEqual(ColorGeometryInstanceAttribute.toValue(ellipsoid.outlineColor.getValue()));
    });

    it('geometryChanged event is raised when expected', function() {
        var entity = createBasicEllipsoid();
        var updater = new EllipsoidGeometryUpdater(entity, scene);

        var listener = jasmine.createSpy('listener');
        updater.geometryChanged.addEventListener(listener);

        entity.position = new ConstantPositionProperty(Cartesian3.UNIT_Z);
        expect(listener.callCount).toEqual(1);

        entity.ellipsoid.radii = new ConstantProperty(new Cartesian3(1, 2, 3));
        expect(listener.callCount).toEqual(2);

        entity.availability = new TimeIntervalCollection();
        expect(listener.callCount).toEqual(3);

        entity.ellipsoid.radii = undefined;
        expect(listener.callCount).toEqual(4);

        //Modifying an unrelated property should not have any effect.
        entity.viewFrom = new ConstantProperty(Cartesian3.UNIT_X);
        expect(listener.callCount).toEqual(4);

        entity.ellipsoid.radii = new SampledProperty(Cartesian3);
        expect(listener.callCount).toEqual(5);
    });

    it('createFillGeometryInstance throws if object is not filled', function() {
        var entity = new Entity();
        var updater = new EllipsoidGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createFillGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createFillGeometryInstance throws if no time provided', function() {
        var entity = createBasicEllipsoid();
        var updater = new EllipsoidGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createFillGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws if object is not outlined', function() {
        var entity = new Entity();
        var updater = new EllipsoidGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createOutlineGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws if no time provided', function() {
        var entity = createBasicEllipsoid();
        entity.ellipsoid.outline = new ConstantProperty(true);
        var updater = new EllipsoidGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createOutlineGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if not dynamic', function() {
        var entity = createBasicEllipsoid();
        var updater = new EllipsoidGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createDynamicUpdater(new PrimitiveCollection());
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if primitives undefined', function() {
        var entity = createBasicEllipsoid();
        entity.ellipsoid.radii = new SampledProperty(Number);
        entity.ellipsoid.radii.addSample(time, 4);
        var updater = new EllipsoidGeometryUpdater(entity, scene);
        expect(updater.isDynamic).toBe(true);
        expect(function() {
            return updater.createDynamicUpdater(undefined);
        }).toThrowDeveloperError();
    });

    it('dynamicUpdater.update throws if no time specified', function() {
        var entity = createBasicEllipsoid();
        entity.ellipsoid.radii = new SampledProperty(Number);
        entity.ellipsoid.radii.addSample(time, 4);
        var updater = new EllipsoidGeometryUpdater(entity, scene);
        var dynamicUpdater = updater.createDynamicUpdater(new PrimitiveCollection());
        expect(function() {
            dynamicUpdater.update(undefined);
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no Entity supplied', function() {
        expect(function() {
            return new EllipsoidGeometryUpdater(undefined, scene);
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no scene supplied', function() {
        var entity = createBasicEllipsoid();
        expect(function() {
            return new EllipsoidGeometryUpdater(entity, undefined);
        }).toThrowDeveloperError();
    });

    var entity = createBasicEllipsoid();
    entity.ellipsoid.radii = createDynamicProperty(new Cartesian3(1, 2, 3));
    createDynamicGeometryBoundingSphereSpecs(EllipsoidGeometryUpdater, entity, entity.ellipsoid, function() {
        return scene;
    });
});