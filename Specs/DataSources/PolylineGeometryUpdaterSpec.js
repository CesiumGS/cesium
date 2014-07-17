/*global defineSuite*/
defineSuite([
        'DataSources/PolylineGeometryUpdater',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/Ellipsoid',
        'Core/JulianDate',
        'Core/ShowGeometryInstanceAttribute',
        'Core/TimeInterval',
        'Core/TimeIntervalCollection',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantProperty',
        'DataSources/Entity',
        'DataSources/GridMaterialProperty',
        'DataSources/PolylineGraphics',
        'DataSources/PropertyArray',
        'DataSources/SampledPositionProperty',
        'DataSources/SampledProperty',
        'DataSources/TimeIntervalCollectionProperty',
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
        Entity,
        GridMaterialProperty,
        PolylineGraphics,
        PropertyArray,
        SampledPositionProperty,
        SampledProperty,
        TimeIntervalCollectionProperty,
        PrimitiveCollection) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var time = JulianDate.now();

    function createBasicPolyline() {
        var polyline = new PolylineGraphics();
        polyline.positions = new ConstantProperty(Ellipsoid.WGS84.cartographicArrayToCartesianArray([new Cartographic(0, 0, 0), new Cartographic(1, 0, 0), new Cartographic(1, 1, 0), new Cartographic(0, 1, 0)]));
        var entity = new Entity();
        entity.polyline = polyline;
        return entity;
    }

    it('Constructor sets expected defaults', function() {
        var entity = new Entity();
        var updater = new PolylineGeometryUpdater(entity);

        expect(updater.isDestroyed()).toBe(false);
        expect(updater.entity).toBe(entity);
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
        var entity = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(entity);
        entity.polyline = undefined;

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('No geometry available when not shown.', function() {
        var entity = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(entity);
        entity.polyline.show = new ConstantProperty(false);

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('Values correct when using default graphics', function() {
        var entity = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(entity);

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
        var entity = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(entity);
        entity.polyline.material = new ColorMaterialProperty();
        expect(updater.fillMaterialProperty).toBe(entity.polyline.material);
    });

    it('A time-varying positions causes geometry to be dynamic', function() {
        var entity = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(entity);
        var point1 = new SampledPositionProperty();
        point1.addSample(time, new Cartesian3());
        var point2 = new SampledPositionProperty();
        point2.addSample(time, new Cartesian3());
        var point3 = new SampledPositionProperty();
        point3.addSample(time, new Cartesian3());

        entity.polyline.positions = new PropertyArray();
        entity.polyline.positions.setValue([point1, point2, point3]);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying width causes geometry to be dynamic', function() {
        var entity = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(entity);
        entity.polyline.width = new SampledProperty(Number);
        entity.polyline.width.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying followSurface causes geometry to be dynamic', function() {
        var followSurface = new TimeIntervalCollectionProperty();
        followSurface.intervals.addInterval(new TimeInterval({
            start : new JulianDate(0, 0),
            stop : new JulianDate(10, 0),
            data : false
        }));

        var entity = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(entity);
        entity.polyline.followSurface = followSurface;
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying granularity causes geometry to be dynamic', function() {
        var entity = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(entity);
        entity.polyline.granularity = new SampledProperty(Number);
        entity.polyline.granularity.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    function validateGeometryInstance(options) {
        var entity = createBasicPolyline();

        var polyline = entity.polyline;
        polyline.show = new ConstantProperty(options.show);
        polyline.material = options.material;

        polyline.width = new ConstantProperty(options.width);
        polyline.followSurface = new ConstantProperty(options.followSurface);
        polyline.granularity = new ConstantProperty(options.granularity);

        var updater = new PolylineGeometryUpdater(entity);

        var instance;
        var geometry;
        var attributes;
        instance = updater.createFillGeometryInstance(time);
        geometry = instance.geometry;
        expect(geometry._width).toEqual(options.width);
        expect(geometry._followSurface).toEqual(options.followSurface);
        expect(geometry._granularity).toEqual(options.granularity);

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
            width : 3,
            followSurface : false,
            granularity : 1.0
        });
    });

    it('Creates expected per-material geometry', function() {
        validateGeometryInstance({
            show : true,
            material : new GridMaterialProperty(),
            width : 4,
            followSurface : true,
            granularity : 0.5
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

        var entity = createBasicPolyline();
        entity.polyline.show = show;
        entity.polyline.material = colorMaterial;

        var updater = new PolylineGeometryUpdater(entity);

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

        var entity = createBasicPolyline();

        var polyline = entity.polyline;
        polyline.width = makeProperty(2, 12);
        polyline.show = makeProperty(true, false);

        entity.availability = new TimeIntervalCollection();
        entity.availability.addInterval(new TimeInterval({
            start : time1,
            stop : time3,
            isStopIncluded : false
        }));

        var updater = new PolylineGeometryUpdater(entity);
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
        var entity = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(entity);
        var listener = jasmine.createSpy('listener');
        updater.geometryChanged.addEventListener(listener);

        entity.polyline.positions = new ConstantProperty(Ellipsoid.WGS84.cartographicArrayToCartesianArray([new Cartographic(0, 0, 0), new Cartographic(1, 0, 0)]));
        expect(listener.callCount).toEqual(1);

        entity.polyline.width = new ConstantProperty(82);
        expect(listener.callCount).toEqual(2);

        entity.availability = new TimeIntervalCollection();
        expect(listener.callCount).toEqual(3);

        entity.polyline.positions = undefined;
        expect(listener.callCount).toEqual(4);

        //Since there's no valid geometry, changing another property should not raise the event.
        entity.polyline.width = undefined;

        //Modifying an unrelated property should not have any effect.
        entity.viewFrom = new ConstantProperty(Cartesian3.UNIT_X);
        expect(listener.callCount).toEqual(4);
    });

    it('createFillGeometryInstance throws if object is not shown', function() {
        var entity = new Entity();
        var updater = new PolylineGeometryUpdater(entity);
        expect(function() {
            return updater.createFillGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createFillGeometryInstance throws if no time provided', function() {
        var entity = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(entity);
        expect(function() {
            return updater.createFillGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws', function() {
        var entity = new Entity();
        var updater = new PolylineGeometryUpdater(entity);
        expect(function() {
            return updater.createOutlineGeometryInstance();
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if not dynamic', function() {
        var entity = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(entity);
        expect(function() {
            return updater.createDynamicUpdater(new PrimitiveCollection());
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if primitives undefined', function() {
        var entity = createBasicPolyline();
        entity.polyline.width = new SampledProperty(Number);
        entity.polyline.width.addSample(time, 4);
        var updater = new PolylineGeometryUpdater(entity);
        expect(updater.isDynamic).toBe(true);
        expect(function() {
            return updater.createDynamicUpdater(undefined);
        }).toThrowDeveloperError();
    });

    it('dynamicUpdater.update throws if no time specified', function() {
        var entity = createBasicPolyline();
        entity.polyline.width = new SampledProperty(Number);
        entity.polyline.width.addSample(time, 4);
        var updater = new PolylineGeometryUpdater(entity);
        var dynamicUpdater = updater.createDynamicUpdater(new PrimitiveCollection());
        expect(function() {
            dynamicUpdater.update(undefined);
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no Entity supplied', function() {
        expect(function() {
            return new PolylineGeometryUpdater(undefined);
        }).toThrowDeveloperError();
    });
});