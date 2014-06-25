/*global defineSuite*/
defineSuite([
        'DynamicScene/PolygonGeometryUpdater',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/Ellipsoid',
        'Core/JulianDate',
        'Core/ShowGeometryInstanceAttribute',
        'Core/TimeInterval',
        'Core/TimeIntervalCollection',
        'DynamicScene/ColorMaterialProperty',
        'DynamicScene/ConstantProperty',
        'DynamicScene/DynamicObject',
        'DynamicScene/DynamicPolygon',
        'DynamicScene/GridMaterialProperty',
        'DynamicScene/PropertyArray',
        'DynamicScene/SampledPositionProperty',
        'DynamicScene/SampledProperty',
        'DynamicScene/TimeIntervalCollectionProperty',
        'Scene/PrimitiveCollection'
    ], function(
        PolygonGeometryUpdater,
        Cartesian3,
        Cartographic,
        Color,
        ColorGeometryInstanceAttribute,
        Ellipsoid,
        JulianDate,
        ShowGeometryInstanceAttribute,
        TimeInterval,
        TimeIntervalCollection,
        ColorMaterialProperty,
        ConstantProperty,
        DynamicObject,
        DynamicPolygon,
        GridMaterialProperty,
        PropertyArray,
        SampledPositionProperty,
        SampledProperty,
        TimeIntervalCollectionProperty,
        PrimitiveCollection) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var time = JulianDate.now();

    function createBasicPolygon() {
        var polygon = new DynamicPolygon();
        var dynamicObject = new DynamicObject();
        dynamicObject.vertexPositions = new ConstantProperty(Ellipsoid.WGS84.cartographicArrayToCartesianArray([new Cartographic(0, 0, 0), new Cartographic(1, 0, 0), new Cartographic(1, 1, 0), new Cartographic(0, 1, 0)]));
        dynamicObject.polygon = polygon;
        return dynamicObject;
    }

    it('Constructor sets expected defaults', function() {
        var dynamicObject = new DynamicObject();
        var updater = new PolygonGeometryUpdater(dynamicObject);

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

    it('No geometry available when polygon is undefined ', function() {
        var dynamicObject = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(dynamicObject);
        dynamicObject.polygon = undefined;

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('No geometry available when not filled or outline.', function() {
        var dynamicObject = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(dynamicObject);
        dynamicObject.polygon.fill = new ConstantProperty(false);
        dynamicObject.polygon.outline = new ConstantProperty(false);

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('Values correct when using default graphics', function() {
        var dynamicObject = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(dynamicObject);

        expect(updater.isClosed).toBe(false);
        expect(updater.fillEnabled).toBe(true);
        expect(updater.fillMaterialProperty).toEqual(ColorMaterialProperty.fromColor(Color.WHITE));
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.hasConstantFill).toBe(true);
        expect(updater.hasConstantOutline).toBe(true);
        expect(updater.outlineColorProperty).toBe(undefined);
        expect(updater.isDynamic).toBe(false);
    });

    it('Polygon material is correctly exposed.', function() {
        var dynamicObject = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(dynamicObject);
        dynamicObject.polygon.material = new GridMaterialProperty(Color.BLUE);
        expect(updater.fillMaterialProperty).toBe(dynamicObject.polygon.material);
    });

    it('Settings extrudedHeight causes geometry to be closed.', function() {
        var dynamicObject = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(dynamicObject);
        dynamicObject.polygon.extrudedHeight = new ConstantProperty(1000);
        expect(updater.isClosed).toBe(true);
    });

    it('A time-varying vertexPositions causes geometry to be dynamic', function() {
        var dynamicObject = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(dynamicObject);
        var point1 = new SampledPositionProperty();
        point1.addSample(time, new Cartesian3());
        var point2 = new SampledPositionProperty();
        point2.addSample(time, new Cartesian3());
        var point3 = new SampledPositionProperty();
        point3.addSample(time, new Cartesian3());

        dynamicObject.vertexPositions = new PropertyArray();
        dynamicObject.vertexPositions.setValue([point1, point2, point3]);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying height causes geometry to be dynamic', function() {
        var dynamicObject = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(dynamicObject);
        dynamicObject.polygon.height = new SampledProperty(Number);
        dynamicObject.polygon.height.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying extrudedHeight causes geometry to be dynamic', function() {
        var dynamicObject = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(dynamicObject);
        dynamicObject.polygon.extrudedHeight = new SampledProperty(Number);
        dynamicObject.polygon.extrudedHeight.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying granularity causes geometry to be dynamic', function() {
        var dynamicObject = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(dynamicObject);
        dynamicObject.polygon.granularity = new SampledProperty(Number);
        dynamicObject.polygon.granularity.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying stRotation causes geometry to be dynamic', function() {
        var dynamicObject = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(dynamicObject);
        dynamicObject.polygon.stRotation = new SampledProperty(Number);
        dynamicObject.polygon.stRotation.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying perPositionHeight causes geometry to be dynamic', function() {
        var dynamicObject = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(dynamicObject);
        dynamicObject.polygon.perPositionHeight = new SampledProperty(Number);
        dynamicObject.polygon.perPositionHeight.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    function validateGeometryInstance(options) {
        var dynamicObject = createBasicPolygon();

        var polygon = dynamicObject.polygon;
        polygon.show = new ConstantProperty(options.show);
        polygon.fill = new ConstantProperty(options.fill);
        polygon.material = options.material;
        polygon.outline = new ConstantProperty(options.outline);
        polygon.outlineColor = new ConstantProperty(options.outlineColor);
        polygon.perPositionHeight = new ConstantProperty(options.perPositionHeight);

        polygon.stRotation = new ConstantProperty(options.stRotation);
        polygon.height = new ConstantProperty(options.height);
        polygon.extrudedHeight = new ConstantProperty(options.extrudedHeight);
        polygon.granularity = new ConstantProperty(options.granularity);

        var updater = new PolygonGeometryUpdater(dynamicObject);

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
            material : ColorMaterialProperty.fromColor(Color.RED),
            height : 431,
            extrudedHeight : 123,
            granularity : 0.97,
            stRotation : 12,
            fill : true,
            outline : true,
            outlineColor : Color.BLUE,
            perPositionHeight : true
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
            perPositionHeight : false
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

        var dynamicObject = createBasicPolygon();
        dynamicObject.polygon.fill = fill;
        dynamicObject.polygon.material = colorMaterial;
        dynamicObject.polygon.outline = outline;
        dynamicObject.polygon.outlineColor = outlineColor;

        var updater = new PolygonGeometryUpdater(dynamicObject);

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

        var dynamicObject = createBasicPolygon();

        var polygon = dynamicObject.polygon;
        polygon.height = makeProperty(2, 12);
        polygon.extrudedHeight = makeProperty(1, 11);
        polygon.outline = makeProperty(true, false);
        polygon.fill = makeProperty(false, true);

        dynamicObject.availability = new TimeIntervalCollection();
        dynamicObject.availability.addInterval(new TimeInterval({
            start : time1,
            stop : time3,
            isStopIncluded : false
        }));

        var updater = new PolygonGeometryUpdater(dynamicObject);
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
        var dynamicObject = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(dynamicObject);
        var listener = jasmine.createSpy('listener');
        updater.geometryChanged.addEventListener(listener);

        dynamicObject.vertexPositions = new ConstantProperty([]);
        expect(listener.callCount).toEqual(1);

        dynamicObject.polygon.height = new ConstantProperty(82);
        expect(listener.callCount).toEqual(2);

        dynamicObject.availability = new TimeIntervalCollection();
        expect(listener.callCount).toEqual(3);

        dynamicObject.vertexPositions = undefined;
        expect(listener.callCount).toEqual(4);

        //Since there's no valid geometry, changing another property should not raise the event.
        dynamicObject.polygon.height = undefined;

        //Modifying an unrelated property should not have any effect.
        dynamicObject.viewFrom = new ConstantProperty(Cartesian3.UNIT_X);
        expect(listener.callCount).toEqual(4);
    });

    it('createFillGeometryInstance throws if object is not filled', function() {
        var dynamicObject = new DynamicObject();
        var updater = new PolygonGeometryUpdater(dynamicObject);
        expect(function() {
            return updater.createFillGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createFillGeometryInstance throws if no time provided', function() {
        var dynamicObject = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(dynamicObject);
        expect(function() {
            return updater.createFillGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws if object is not outlined', function() {
        var dynamicObject = new DynamicObject();
        var updater = new PolygonGeometryUpdater(dynamicObject);
        expect(function() {
            return updater.createOutlineGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws if no time provided', function() {
        var dynamicObject = createBasicPolygon();
        dynamicObject.polygon.outline = new ConstantProperty(true);
        var updater = new PolygonGeometryUpdater(dynamicObject);
        expect(function() {
            return updater.createOutlineGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if not dynamic', function() {
        var dynamicObject = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(dynamicObject);
        expect(function() {
            return updater.createDynamicUpdater(new PrimitiveCollection());
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if primitives undefined', function() {
        var dynamicObject = createBasicPolygon();
        dynamicObject.polygon.height = new SampledProperty(Number);
        dynamicObject.polygon.height.addSample(time, 4);
        var updater = new PolygonGeometryUpdater(dynamicObject);
        expect(updater.isDynamic).toBe(true);
        expect(function() {
            return updater.createDynamicUpdater(undefined);
        }).toThrowDeveloperError();
    });

    it('dynamicUpdater.update throws if no time specified', function() {
        var dynamicObject = createBasicPolygon();
        dynamicObject.polygon.height = new SampledProperty(Number);
        dynamicObject.polygon.height.addSample(time, 4);
        var updater = new PolygonGeometryUpdater(dynamicObject);
        var dynamicUpdater = updater.createDynamicUpdater(new PrimitiveCollection());
        expect(function() {
            dynamicUpdater.update(undefined);
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no DynamicObject supplied', function() {
        expect(function() {
            return new PolygonGeometryUpdater(undefined);
        }).toThrowDeveloperError();
    });
});