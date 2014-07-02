/*global defineSuite*/
defineSuite([
        'DynamicScene/EllipseGeometryUpdater',
        'Core/Cartesian3',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/JulianDate',
        'Core/ShowGeometryInstanceAttribute',
        'Core/TimeInterval',
        'Core/TimeIntervalCollection',
        'DynamicScene/ColorMaterialProperty',
        'DynamicScene/ConstantPositionProperty',
        'DynamicScene/ConstantProperty',
        'DynamicScene/DynamicEllipse',
        'DynamicScene/DynamicObject',
        'DynamicScene/GridMaterialProperty',
        'DynamicScene/SampledPositionProperty',
        'DynamicScene/SampledProperty',
        'DynamicScene/TimeIntervalCollectionProperty',
        'Scene/PrimitiveCollection'
    ], function(
        EllipseGeometryUpdater,
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        JulianDate,
        ShowGeometryInstanceAttribute,
        TimeInterval,
        TimeIntervalCollection,
        ColorMaterialProperty,
        ConstantPositionProperty,
        ConstantProperty,
        DynamicEllipse,
        DynamicObject,
        GridMaterialProperty,
        SampledPositionProperty,
        SampledProperty,
        TimeIntervalCollectionProperty,
        PrimitiveCollection) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var time = JulianDate.now();

    function createBasicEllipse() {
        var ellipse = new DynamicEllipse();
        ellipse.semiMajorAxis = new ConstantProperty(2);
        ellipse.semiMinorAxis = new ConstantProperty(1);

        var dynamicObject = new DynamicObject();
        dynamicObject.position = new ConstantPositionProperty(Cartesian3.ZERO);
        dynamicObject.ellipse = ellipse;
        return dynamicObject;
    }

    it('Constructor sets expected defaults', function() {
        var dynamicObject = new DynamicObject();
        var updater = new EllipseGeometryUpdater(dynamicObject);

        expect(updater.isDestroyed()).toBe(false);
        expect(updater.dynamicObject).toBe(dynamicObject);
        expect(updater.isClosed).toBe(false);
        expect(updater.fillEnabled).toBe(false);
        expect(updater.fillMaterialProperty).toBe(undefined);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.hasConstantFill).toBe(true);
        expect(updater.hasConstantOutline).toBe(true);
        expect(updater.outlineColorProperty).toBe(undefined);
        expect(updater.isDynamic).toBe(false);
        expect(updater.isOutlineVisible(time)).toBe(false);
        expect(updater.isFilled(time)).toBe(false);
        updater.destroy();
        expect(updater.isDestroyed()).toBe(true);
    });

    it('No geometry available when ellipse is undefined ', function() {
        var dynamicObject = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(dynamicObject);
        dynamicObject.ellipse = undefined;

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('No geometry available when semiMajorAxis is undefined', function() {
        var dynamicObject = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(dynamicObject);
        dynamicObject.ellipse.semiMajorAxis = undefined;

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('No geometry available when semiMinorAxis is undefined', function() {
        var dynamicObject = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(dynamicObject);
        dynamicObject.ellipse.semiMinorAxis = undefined;

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('No geometry available when not filled or outline.', function() {
        var dynamicObject = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(dynamicObject);
        dynamicObject.ellipse.fill = new ConstantProperty(false);
        dynamicObject.ellipse.outline = new ConstantProperty(false);

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('Values correct when using default graphics', function() {
        var dynamicObject = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(dynamicObject);

        expect(updater.isClosed).toBe(false);
        expect(updater.fillEnabled).toBe(true);
        expect(updater.fillMaterialProperty).toEqual(ColorMaterialProperty.fromColor(Color.WHITE));
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.hasConstantFill).toBe(true);
        expect(updater.hasConstantOutline).toBe(true);
        expect(updater.outlineColorProperty).toBe(undefined);
        expect(updater.isDynamic).toBe(false);
    });

    it('Ellipse material is correctly exposed.', function() {
        var dynamicObject = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(dynamicObject);
        dynamicObject.ellipse.material = new GridMaterialProperty(Color.BLUE);
        expect(updater.fillMaterialProperty).toBe(dynamicObject.ellipse.material);
    });

    it('Settings extrudedHeight causes geometry to be closed.', function() {
        var dynamicObject = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(dynamicObject);
        dynamicObject.ellipse.extrudedHeight = new ConstantProperty(1000);
        expect(updater.isClosed).toBe(true);
    });

    it('A time-varying position causes geometry to be dynamic', function() {
        var dynamicObject = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(dynamicObject);
        dynamicObject.position = new SampledPositionProperty();
        dynamicObject.position.addSample(time, Cartesian3.ZERO);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying semiMinorAxis causes geometry to be dynamic', function() {
        var dynamicObject = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(dynamicObject);
        dynamicObject.ellipse.semiMinorAxis = new SampledProperty(Number);
        dynamicObject.ellipse.semiMinorAxis.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying semiMajorAxis causes geometry to be dynamic', function() {
        var dynamicObject = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(dynamicObject);
        dynamicObject.ellipse.semiMajorAxis = new SampledProperty(Number);
        dynamicObject.ellipse.semiMajorAxis.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying rotation causes geometry to be dynamic', function() {
        var dynamicObject = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(dynamicObject);
        dynamicObject.ellipse.rotation = new SampledProperty(Number);
        dynamicObject.ellipse.rotation.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying height causes geometry to be dynamic', function() {
        var dynamicObject = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(dynamicObject);
        dynamicObject.ellipse.height = new SampledProperty(Number);
        dynamicObject.ellipse.height.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying extrudedHeight causes geometry to be dynamic', function() {
        var dynamicObject = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(dynamicObject);
        dynamicObject.ellipse.extrudedHeight = new SampledProperty(Number);
        dynamicObject.ellipse.extrudedHeight.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying granularity causes geometry to be dynamic', function() {
        var dynamicObject = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(dynamicObject);
        dynamicObject.ellipse.granularity = new SampledProperty(Number);
        dynamicObject.ellipse.granularity.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying stRotation causes geometry to be dynamic', function() {
        var dynamicObject = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(dynamicObject);
        dynamicObject.ellipse.stRotation = new SampledProperty(Number);
        dynamicObject.ellipse.stRotation.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying numberOfVerticalLines causes geometry to be dynamic', function() {
        var dynamicObject = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(dynamicObject);
        dynamicObject.ellipse.numberOfVerticalLines = new SampledProperty(Number);
        dynamicObject.ellipse.numberOfVerticalLines.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    function validateGeometryInstance(options) {
        var dynamicObject = new DynamicObject();
        dynamicObject.position = new ConstantPositionProperty(options.center);

        var ellipse = new DynamicEllipse();
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
        dynamicObject.ellipse = ellipse;

        var updater = new EllipseGeometryUpdater(dynamicObject);

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
        }
    }

    it('Creates expected per-color geometry', function() {
        validateGeometryInstance({
            center : new Cartesian3(4, 5, 6),
            rotation : 1,
            semiMajorAxis : 3,
            semiMinorAxis : 2,
            show : true,
            material : ColorMaterialProperty.fromColor(Color.RED),
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

        var dynamicObject = createBasicEllipse();
        dynamicObject.ellipse.fill = fill;
        dynamicObject.ellipse.material = colorMaterial;
        dynamicObject.ellipse.outline = outline;
        dynamicObject.ellipse.outlineColor = outlineColor;

        var updater = new EllipseGeometryUpdater(dynamicObject);

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
        //This test is mostly a smoke screen for now.
        var time1 = new JulianDate(0, 0);
        var time2 = new JulianDate(1, 0);
        var time3 = new JulianDate(2, 0);

        function makeProperty(value1, value2) {
            var property = new TimeIntervalCollectionProperty();
            property.intervals.addInterval(new TimeInterval({
                start : time1,
                stop : time2,
                isStopIncluded : false,
                data : value1
            }));
            property.intervals.addInterval(new TimeInterval({
                start : time2,
                stop : time3,
                isStopIncluded : false,
                data : value2
            }));
            return property;
        }

        var ellipse = new DynamicEllipse();
        ellipse.semiMajorAxis = makeProperty(2, 12);
        ellipse.semiMinorAxis = makeProperty(1, 11);
        ellipse.outline = makeProperty(true, false);
        ellipse.fill = makeProperty(false, true);

        var dynamicObject = new DynamicObject();
        dynamicObject.availability = new TimeIntervalCollection();
        dynamicObject.availability.addInterval(new TimeInterval({
            start : time1,
            stop : time3,
            isStopIncluded : false
        }));
        dynamicObject.position = makeProperty(Cartesian3.UNIT_Z, Cartesian3.UNIT_Y);
        dynamicObject.ellipse = ellipse;

        var updater = new EllipseGeometryUpdater(dynamicObject);
        var primitives = new PrimitiveCollection();
        var dynamicUpdater = updater.createDynamicUpdater(primitives);
        expect(dynamicUpdater.isDestroyed()).toBe(false);
        expect(primitives.length).toBe(0);
        dynamicUpdater.update(time1);
        expect(primitives.length).toBe(1);
        dynamicUpdater.destroy();
        expect(primitives.length).toBe(0);
        updater.destroy();
    });

    it('geometryChanged event is raised when expected', function() {
        var dynamicObject = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(dynamicObject);
        var listener = jasmine.createSpy('listener');
        updater.geometryChanged.addEventListener(listener);

        dynamicObject.position = new ConstantPositionProperty(Cartesian3.UNIT_Z);
        expect(listener.callCount).toEqual(1);

        dynamicObject.ellipse.semiMajorAxis = new ConstantProperty(82);
        expect(listener.callCount).toEqual(2);

        dynamicObject.availability = new TimeIntervalCollection();
        expect(listener.callCount).toEqual(3);

        dynamicObject.ellipse.semiMajorAxis = undefined;
        expect(listener.callCount).toEqual(4);

        //Since there's no valid geometry, changing another property should not raise the event.
        dynamicObject.ellipse.semiMinorAxis = undefined;

        //Modifying an unrelated property should not have any effect.
        dynamicObject.viewFrom = new ConstantProperty(Cartesian3.UNIT_X);
        expect(listener.callCount).toEqual(4);

        dynamicObject.ellipse.semiMajorAxis = new SampledProperty(Number);
        dynamicObject.ellipse.semiMinorAxis = new SampledProperty(Number);
        expect(listener.callCount).toEqual(5);
    });

    it('createFillGeometryInstance throws if object is not filled', function() {
        var dynamicObject = new DynamicObject();
        var updater = new EllipseGeometryUpdater(dynamicObject);
        expect(function() {
            return updater.createFillGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createFillGeometryInstance throws if no time provided', function() {
        var dynamicObject = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(dynamicObject);
        expect(function() {
            return updater.createFillGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws if object is not outlined', function() {
        var dynamicObject = new DynamicObject();
        var updater = new EllipseGeometryUpdater(dynamicObject);
        expect(function() {
            return updater.createOutlineGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws if no time provided', function() {
        var dynamicObject = createBasicEllipse();
        dynamicObject.ellipse.outline = new ConstantProperty(true);
        var updater = new EllipseGeometryUpdater(dynamicObject);
        expect(function() {
            return updater.createOutlineGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if not dynamic', function() {
        var dynamicObject = createBasicEllipse();
        var updater = new EllipseGeometryUpdater(dynamicObject);
        expect(function() {
            return updater.createDynamicUpdater(new PrimitiveCollection());
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if primitives undefined', function() {
        var dynamicObject = createBasicEllipse();
        dynamicObject.ellipse.semiMajorAxis = new SampledProperty(Number);
        dynamicObject.ellipse.semiMajorAxis.addSample(time, 4);
        var updater = new EllipseGeometryUpdater(dynamicObject);
        expect(updater.isDynamic).toBe(true);
        expect(function() {
            return updater.createDynamicUpdater(undefined);
        }).toThrowDeveloperError();
    });

    it('dynamicUpdater.update throws if no time specified', function() {
        var dynamicObject = createBasicEllipse();
        dynamicObject.ellipse.semiMajorAxis = new SampledProperty(Number);
        dynamicObject.ellipse.semiMajorAxis.addSample(time, 4);
        var updater = new EllipseGeometryUpdater(dynamicObject);
        var dynamicUpdater = updater.createDynamicUpdater(new PrimitiveCollection());
        expect(function() {
            dynamicUpdater.update(undefined);
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no DynamicObject supplied', function() {
        expect(function() {
            return new EllipseGeometryUpdater(undefined);
        }).toThrowDeveloperError();
    });
});