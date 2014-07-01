/*global defineSuite*/
defineSuite([
        'DynamicScene/RectangleGeometryUpdater',
        'Core/Cartesian3',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/JulianDate',
        'Core/Rectangle',
        'Core/ShowGeometryInstanceAttribute',
        'Core/TimeInterval',
        'Core/TimeIntervalCollection',
        'DynamicScene/ColorMaterialProperty',
        'DynamicScene/ConstantProperty',
        'DynamicScene/DynamicObject',
        'DynamicScene/DynamicRectangle',
        'DynamicScene/GridMaterialProperty',
        'DynamicScene/SampledProperty',
        'DynamicScene/TimeIntervalCollectionProperty',
        'Scene/PrimitiveCollection'
    ], function(
        RectangleGeometryUpdater,
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        JulianDate,
        Rectangle,
        ShowGeometryInstanceAttribute,
        TimeInterval,
        TimeIntervalCollection,
        ColorMaterialProperty,
        ConstantProperty,
        DynamicObject,
        DynamicRectangle,
        GridMaterialProperty,
        SampledProperty,
        TimeIntervalCollectionProperty,
        PrimitiveCollection) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var time = new JulianDate(0, 0);
    var time2 = new JulianDate(10, 0);
    var time3 = new JulianDate(20, 0);

    function createBasicRectangle() {
        var rectangle = new DynamicRectangle();
        var dynamicObject = new DynamicObject();
        dynamicObject.rectangle = rectangle;
        dynamicObject.rectangle.coordinates = new ConstantProperty(new Rectangle(0, 0, 1, 1));
        return dynamicObject;
    }

    it('Constructor sets expected defaults', function() {
        var dynamicObject = new DynamicObject();
        var updater = new RectangleGeometryUpdater(dynamicObject);

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

    it('No geometry available when rectangle is undefined ', function() {
        var dynamicObject = createBasicRectangle();
        var updater = new RectangleGeometryUpdater(dynamicObject);
        dynamicObject.rectangle = undefined;

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('No geometry available when not filled or outline.', function() {
        var dynamicObject = createBasicRectangle();
        var updater = new RectangleGeometryUpdater(dynamicObject);
        dynamicObject.rectangle.fill = new ConstantProperty(false);
        dynamicObject.rectangle.outline = new ConstantProperty(false);

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('Values correct when using default graphics', function() {
        var dynamicObject = createBasicRectangle();
        var updater = new RectangleGeometryUpdater(dynamicObject);

        expect(updater.isClosed).toBe(false);
        expect(updater.fillEnabled).toBe(true);
        expect(updater.fillMaterialProperty).toEqual(ColorMaterialProperty.fromColor(Color.WHITE));
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.hasConstantFill).toBe(true);
        expect(updater.hasConstantOutline).toBe(true);
        expect(updater.outlineColorProperty).toBe(undefined);
        expect(updater.isDynamic).toBe(false);
    });

    it('Rectangle material is correctly exposed.', function() {
        var dynamicObject = createBasicRectangle();
        var updater = new RectangleGeometryUpdater(dynamicObject);
        dynamicObject.rectangle.material = new GridMaterialProperty(Color.BLUE);
        expect(updater.fillMaterialProperty).toBe(dynamicObject.rectangle.material);
    });

    it('Properly detects closed geometry.', function() {
        var dynamicObject = createBasicRectangle();
        var updater = new RectangleGeometryUpdater(dynamicObject);
        dynamicObject.rectangle.extrudedHeight = new ConstantProperty(1000);
        expect(updater.isClosed).toBe(false);
        dynamicObject.rectangle.closeBottom = new ConstantProperty(true);
        expect(updater.isClosed).toBe(false);
        dynamicObject.rectangle.closeTop = new ConstantProperty(true);
        expect(updater.isClosed).toBe(true);
    });

    it('A time-varying coordinates causes geometry to be dynamic', function() {
        var dynamicObject = createBasicRectangle();
        var updater = new RectangleGeometryUpdater(dynamicObject);
        dynamicObject.rectangle.coordinates = new SampledProperty(Rectangle);
        dynamicObject.rectangle.coordinates.addSample(JulianDate.now(), new Rectangle());
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying height causes geometry to be dynamic', function() {
        var dynamicObject = createBasicRectangle();
        var updater = new RectangleGeometryUpdater(dynamicObject);
        dynamicObject.rectangle.height = new SampledProperty(Number);
        dynamicObject.rectangle.height.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying extrudedHeight causes geometry to be dynamic', function() {
        var dynamicObject = createBasicRectangle();
        var updater = new RectangleGeometryUpdater(dynamicObject);
        dynamicObject.rectangle.extrudedHeight = new SampledProperty(Number);
        dynamicObject.rectangle.extrudedHeight.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying granularity causes geometry to be dynamic', function() {
        var dynamicObject = createBasicRectangle();
        var updater = new RectangleGeometryUpdater(dynamicObject);
        dynamicObject.rectangle.granularity = new SampledProperty(Number);
        dynamicObject.rectangle.granularity.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying stRotation causes geometry to be dynamic', function() {
        var dynamicObject = createBasicRectangle();
        var updater = new RectangleGeometryUpdater(dynamicObject);
        dynamicObject.rectangle.stRotation = new SampledProperty(Number);
        dynamicObject.rectangle.stRotation.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying closeTop causes geometry to be dynamic', function() {
        var dynamicObject = createBasicRectangle();
        var updater = new RectangleGeometryUpdater(dynamicObject);
        dynamicObject.rectangle.closeTop = new TimeIntervalCollectionProperty();
        dynamicObject.rectangle.closeTop.intervals.addInterval(new TimeInterval({
            start : time,
            stop : time2,
            data : false
        }));
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying closeBottom causes geometry to be dynamic', function() {
        var dynamicObject = createBasicRectangle();
        var updater = new RectangleGeometryUpdater(dynamicObject);
        dynamicObject.rectangle.closeBottom = new TimeIntervalCollectionProperty();
        dynamicObject.rectangle.closeBottom.intervals.addInterval(new TimeInterval({
            start : time,
            stop : time2,
            data : false
        }));
        expect(updater.isDynamic).toBe(true);
    });

    function validateGeometryInstance(options) {
        var dynamicObject = createBasicRectangle();

        var rectangle = dynamicObject.rectangle;
        rectangle.show = new ConstantProperty(options.show);
        rectangle.fill = new ConstantProperty(options.fill);
        rectangle.material = options.material;
        rectangle.outline = new ConstantProperty(options.outline);
        rectangle.outlineColor = new ConstantProperty(options.outlineColor);
        rectangle.rotation = new ConstantProperty(options.rotation);
        rectangle.stRotation = new ConstantProperty(options.stRotation);
        rectangle.height = new ConstantProperty(options.height);
        rectangle.extrudedHeight = new ConstantProperty(options.extrudedHeight);
        rectangle.granularity = new ConstantProperty(options.granularity);
        rectangle.closeTop = new ConstantProperty(options.closeTop);
        rectangle.closeBottom = new ConstantProperty(options.closeBottom);

        var updater = new RectangleGeometryUpdater(dynamicObject);

        var instance;
        var geometry;
        var attributes;
        if (options.fill) {
            instance = updater.createFillGeometryInstance(time);
            geometry = instance.geometry;
            expect(geometry._rotation).toEqual(options.rotation);
            expect(geometry._stRotation).toEqual(options.stRotation);
            expect(geometry._surfaceHeight).toEqual(options.height);
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
            expect(geometry._surfaceHeight).toEqual(options.height);
            expect(geometry._granularity).toEqual(options.granularity);
            expect(geometry._extrudedHeight).toEqual(options.extrudedHeight);

            attributes = instance.attributes;
            expect(attributes.color.value).toEqual(ColorGeometryInstanceAttribute.toValue(options.outlineColor));
            expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(options.fill));
        }
    }

    it('Creates expected per-color geometry', function() {
        validateGeometryInstance({
            show : true,
            material : ColorMaterialProperty.fromColor(Color.RED),
            height : 431,
            extrudedHeight : 123,
            granularity : 0.97,
            rotation : 1,
            stRotation : 12,
            fill : true,
            outline : true,
            outlineColor : Color.BLUE,
            closeTop : false,
            closeBottom : true
        });
    });

    it('Creates expected per-material geometry', function() {
        validateGeometryInstance({
            show : true,
            material : new GridMaterialProperty(),
            height : 431,
            extrudedHeight : 123,
            granularity : 0.97,
            rotation : 1,
            stRotation : 12,
            fill : true,
            outline : true,
            outlineColor : Color.BLUE,
            closeTop : false,
            closeBottom : true
        });
    });

    it('Attributes have expected values at creation time', function() {
        var fill = new TimeIntervalCollectionProperty();
        fill.intervals.addInterval(new TimeInterval({
            start : time,
            stop : time2,
            data : false
        }));
        fill.intervals.addInterval(new TimeInterval({
            start : time2,
            stop : time3,
            isStartIncluded : false,
            data : false
        }));

        var colorMaterial = new ColorMaterialProperty();
        colorMaterial.color = new SampledProperty(Color);
        colorMaterial.color.addSample(time, Color.YELLOW);
        colorMaterial.color.addSample(time2, Color.BLUE);
        colorMaterial.color.addSample(time3, Color.RED);

        var outline = new TimeIntervalCollectionProperty();
        outline.intervals.addInterval(new TimeInterval({
            start : time,
            stop : time2,
            data : false
        }));
        outline.intervals.addInterval(new TimeInterval({
            start : time2,
            stop : time3,
            isStartIncluded : false,
            data : false
        }));

        var outlineColor = new SampledProperty(Color);
        outlineColor.addSample(time, Color.BLUE);
        outlineColor.addSample(time2, Color.RED);
        outlineColor.addSample(time3, Color.YELLOW);

        var dynamicObject = createBasicRectangle();
        dynamicObject.rectangle.fill = fill;
        dynamicObject.rectangle.material = colorMaterial;
        dynamicObject.rectangle.outline = outline;
        dynamicObject.rectangle.outlineColor = outlineColor;

        var updater = new RectangleGeometryUpdater(dynamicObject);

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

        var dynamicObject = createBasicRectangle();

        var rectangle = dynamicObject.rectangle;
        rectangle.height = makeProperty(2, 12);
        rectangle.extrudedHeight = makeProperty(1, 11);
        rectangle.outline = makeProperty(true, false);
        rectangle.fill = makeProperty(false, true);

        dynamicObject.availability = new TimeIntervalCollection();
        dynamicObject.availability.addInterval(new TimeInterval({
            start : time1,
            stop : time3,
            isStopIncluded : false
        }));

        var updater = new RectangleGeometryUpdater(dynamicObject);
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
        var dynamicObject = createBasicRectangle();
        var updater = new RectangleGeometryUpdater(dynamicObject);
        var listener = jasmine.createSpy('listener');
        updater.geometryChanged.addEventListener(listener);

        dynamicObject.rectangle.height = new ConstantProperty(82);
        expect(listener.callCount).toEqual(1);

        dynamicObject.availability = new TimeIntervalCollection();
        expect(listener.callCount).toEqual(2);

        dynamicObject.rectangle.coordinates = undefined;
        expect(listener.callCount).toEqual(3);

        //Since there's no valid geometry, changing another property should not raise the event.
        dynamicObject.rectangle.height = undefined;

        //Modifying an unrelated property should not have any effect.
        dynamicObject.viewFrom = new ConstantProperty(Cartesian3.UNIT_X);
        expect(listener.callCount).toEqual(3);
    });

    it('createFillGeometryInstance throws if object is not filled', function() {
        var dynamicObject = new DynamicObject();
        var updater = new RectangleGeometryUpdater(dynamicObject);
        expect(function() {
            return updater.createFillGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createFillGeometryInstance throws if no time provided', function() {
        var dynamicObject = createBasicRectangle();
        var updater = new RectangleGeometryUpdater(dynamicObject);
        expect(function() {
            return updater.createFillGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws if object is not outlined', function() {
        var dynamicObject = new DynamicObject();
        var updater = new RectangleGeometryUpdater(dynamicObject);
        expect(function() {
            return updater.createOutlineGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws if no time provided', function() {
        var dynamicObject = createBasicRectangle();
        dynamicObject.rectangle.outline = new ConstantProperty(true);
        var updater = new RectangleGeometryUpdater(dynamicObject);
        expect(function() {
            return updater.createOutlineGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if not dynamic', function() {
        var dynamicObject = createBasicRectangle();
        var updater = new RectangleGeometryUpdater(dynamicObject);
        expect(function() {
            return updater.createDynamicUpdater(new PrimitiveCollection());
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if primitives undefined', function() {
        var dynamicObject = createBasicRectangle();
        dynamicObject.rectangle.height = new SampledProperty(Number);
        dynamicObject.rectangle.height.addSample(time, 4);
        var updater = new RectangleGeometryUpdater(dynamicObject);
        expect(updater.isDynamic).toBe(true);
        expect(function() {
            return updater.createDynamicUpdater(undefined);
        }).toThrowDeveloperError();
    });

    it('dynamicUpdater.update throws if no time specified', function() {
        var dynamicObject = createBasicRectangle();
        dynamicObject.rectangle.height = new SampledProperty(Number);
        dynamicObject.rectangle.height.addSample(time, 4);
        var updater = new RectangleGeometryUpdater(dynamicObject);
        var dynamicUpdater = updater.createDynamicUpdater(new PrimitiveCollection());
        expect(function() {
            dynamicUpdater.update(undefined);
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no DynamicObject supplied', function() {
        expect(function() {
            return new RectangleGeometryUpdater(undefined);
        }).toThrowDeveloperError();
    });
});