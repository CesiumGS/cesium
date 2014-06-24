/*global defineSuite*/
defineSuite([
        'DynamicScene/PolylineGeometryUpdater',
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
        'DynamicScene/DynamicPolyline',
        'DynamicScene/GridMaterialProperty',
        'DynamicScene/PropertyArray',
        'DynamicScene/SampledPositionProperty',
        'DynamicScene/SampledProperty',
        'DynamicScene/TimeIntervalCollectionProperty',
        'Scene/PrimitiveCollection'
    ], function(
        PolylineGeometryUpdater,
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
        DynamicPolyline,
        GridMaterialProperty,
        PropertyArray,
        SampledPositionProperty,
        SampledProperty,
        TimeIntervalCollectionProperty,
        PrimitiveCollection) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var time = JulianDate.now();

    function createBasicPolyline() {
        var polyline = new DynamicPolyline();
        var dynamicObject = new DynamicObject();
        dynamicObject.vertexPositions = new ConstantProperty(Ellipsoid.WGS84.cartographicArrayToCartesianArray([new Cartographic(0, 0, 0), new Cartographic(1, 0, 0), new Cartographic(1, 1, 0), new Cartographic(0, 1, 0)]));
        dynamicObject.polyline = polyline;
        return dynamicObject;
    }

    it('Constructor sets expected defaults', function() {
        var dynamicObject = new DynamicObject();
        var updater = new PolylineGeometryUpdater(dynamicObject);

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

    it('No geometry available when polyline is undefined ', function() {
        var dynamicObject = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(dynamicObject);
        dynamicObject.polyline = undefined;

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('No geometry available when not shown.', function() {
        var dynamicObject = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(dynamicObject);
        dynamicObject.polyline.show = new ConstantProperty(false);

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('Values correct when using default graphics', function() {
        var dynamicObject = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(dynamicObject);

        expect(updater.isClosed).toBe(false);
        expect(updater.fillEnabled).toBe(true);
        expect(updater.fillMaterialProperty).toEqual(ColorMaterialProperty.fromColor(Color.WHITE));
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.hasConstantFill).toBe(true);
        expect(updater.hasConstantOutline).toBe(true);
        expect(updater.outlineColorProperty).toBe(undefined);
        expect(updater.isDynamic).toBe(false);
    });

    it('Polyline material is correctly exposed.', function() {
        var dynamicObject = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(dynamicObject);
        dynamicObject.polyline.material = new ColorMaterialProperty();
        expect(updater.fillMaterialProperty).toBe(dynamicObject.polyline.material);
    });

    it('A time-varying vertexPositions causes geometry to be dynamic', function() {
        var dynamicObject = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(dynamicObject);
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

    it('A time-varying width causes geometry to be dynamic', function() {
        var dynamicObject = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(dynamicObject);
        dynamicObject.polyline.width = new SampledProperty(Number);
        dynamicObject.polyline.width.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    function validateGeometryInstance(options) {
        var dynamicObject = createBasicPolyline();

        var polyline = dynamicObject.polyline;
        polyline.show = new ConstantProperty(options.show);
        polyline.material = options.material;

        polyline.width = new ConstantProperty(options.width);

        var updater = new PolylineGeometryUpdater(dynamicObject);

        var instance;
        var geometry;
        var attributes;
        instance = updater.createFillGeometryInstance(time);
        geometry = instance.geometry;
        expect(geometry._width).toEqual(options.width);

        attributes = instance.attributes;
        if (options.material instanceof ColorMaterialProperty) {
            expect(attributes.color.value).toEqual(ColorGeometryInstanceAttribute.toValue(options.material.color.getValue(time)));
        } else {
            expect(attributes.color).toBeUndefined();
        }
        expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(options.show));
    }

    it('Creates expected per-color geometry', function() {
        validateGeometryInstance({
            show : true,
            material : ColorMaterialProperty.fromColor(Color.RED),
            width : 3
        });
    });

    it('Creates expected per-material geometry', function() {
        validateGeometryInstance({
            show : true,
            material : new GridMaterialProperty(),
            width : 4
        });
    });

    it('Attributes have expected values at creation time', function() {
        var time1 = new JulianDate(0, 0);
        var time2 = new JulianDate(10, 0);
        var time3 = new JulianDate(20, 0);

        var show = new TimeIntervalCollectionProperty();
        show.intervals.addInterval(new TimeInterval({
            start : time1,
            stop : time2,
            data : false
        }));
        show.intervals.addInterval(new TimeInterval({
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

        var dynamicObject = createBasicPolyline();
        dynamicObject.polyline.show = show;
        dynamicObject.polyline.material = colorMaterial;

        var updater = new PolylineGeometryUpdater(dynamicObject);

        var instance = updater.createFillGeometryInstance(time2);
        var attributes = instance.attributes;
        expect(attributes.color.value).toEqual(ColorGeometryInstanceAttribute.toValue(colorMaterial.color.getValue(time2)));
        expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(show.getValue(time2)));
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

        var dynamicObject = createBasicPolyline();

        var polyline = dynamicObject.polyline;
        polyline.width = makeProperty(2, 12);
        polyline.show = makeProperty(true, false);

        dynamicObject.availability = new TimeIntervalCollection();
        dynamicObject.availability.addInterval(new TimeInterval({
            start : time1,
            stop : time3,
            isStopIncluded : false
        }));

        var updater = new PolylineGeometryUpdater(dynamicObject);
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
        var dynamicObject = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(dynamicObject);
        var listener = jasmine.createSpy('listener');
        updater.geometryChanged.addEventListener(listener);

        dynamicObject.vertexPositions = new ConstantProperty(Ellipsoid.WGS84.cartographicArrayToCartesianArray([new Cartographic(0, 0, 0), new Cartographic(1, 0, 0)]));
        expect(listener.callCount).toEqual(1);

        dynamicObject.polyline.width = new ConstantProperty(82);
        expect(listener.callCount).toEqual(2);

        dynamicObject.availability = new TimeIntervalCollection();
        expect(listener.callCount).toEqual(3);

        dynamicObject.vertexPositions = undefined;
        expect(listener.callCount).toEqual(4);

        //Since there's no valid geometry, changing another property should not raise the event.
        dynamicObject.polyline.width = undefined;

        //Modifying an unrelated property should not have any effect.
        dynamicObject.viewFrom = new ConstantProperty(Cartesian3.UNIT_X);
        expect(listener.callCount).toEqual(4);
    });

    it('createFillGeometryInstance throws if object is not shown', function() {
        var dynamicObject = new DynamicObject();
        var updater = new PolylineGeometryUpdater(dynamicObject);
        expect(function() {
            return updater.createFillGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createFillGeometryInstance throws if no time provided', function() {
        var dynamicObject = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(dynamicObject);
        expect(function() {
            return updater.createFillGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws', function() {
        var dynamicObject = new DynamicObject();
        var updater = new PolylineGeometryUpdater(dynamicObject);
        expect(function() {
            return updater.createOutlineGeometryInstance();
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if not dynamic', function() {
        var dynamicObject = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(dynamicObject);
        expect(function() {
            return updater.createDynamicUpdater(new PrimitiveCollection());
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if primitives undefined', function() {
        var dynamicObject = createBasicPolyline();
        dynamicObject.polyline.width = new SampledProperty(Number);
        dynamicObject.polyline.width.addSample(time, 4);
        var updater = new PolylineGeometryUpdater(dynamicObject);
        expect(updater.isDynamic).toBe(true);
        expect(function() {
            return updater.createDynamicUpdater(undefined);
        }).toThrowDeveloperError();
    });

    it('dynamicUpdater.update throws if no time specified', function() {
        var dynamicObject = createBasicPolyline();
        dynamicObject.polyline.width = new SampledProperty(Number);
        dynamicObject.polyline.width.addSample(time, 4);
        var updater = new PolylineGeometryUpdater(dynamicObject);
        var dynamicUpdater = updater.createDynamicUpdater(new PrimitiveCollection());
        expect(function() {
            dynamicUpdater.update(undefined);
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no DynamicObject supplied', function() {
        expect(function() {
            return new PolylineGeometryUpdater(undefined);
        }).toThrowDeveloperError();
    });
});