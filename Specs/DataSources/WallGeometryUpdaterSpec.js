/*global defineSuite*/
defineSuite([
        'DynamicScene/WallGeometryUpdater',
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
        'DynamicScene/DynamicWall',
        'DynamicScene/GridMaterialProperty',
        'DynamicScene/PropertyArray',
        'DynamicScene/SampledPositionProperty',
        'DynamicScene/SampledProperty',
        'DynamicScene/TimeIntervalCollectionProperty',
        'Scene/PrimitiveCollection'
    ], function(
        WallGeometryUpdater,
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
        DynamicWall,
        GridMaterialProperty,
        PropertyArray,
        SampledPositionProperty,
        SampledProperty,
        TimeIntervalCollectionProperty,
        PrimitiveCollection) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var time = new JulianDate(0, 0);
    var time2 = new JulianDate(1, 0);
    var time3 = new JulianDate(2, 0);

    function createBasicWall() {
        var wall = new DynamicWall();
        var dynamicObject = new DynamicObject();
        dynamicObject.vertexPositions = new ConstantProperty(Ellipsoid.WGS84.cartographicArrayToCartesianArray([new Cartographic(0, 0, 0), new Cartographic(1, 0, 0), new Cartographic(1, 1, 0), new Cartographic(0, 1, 0)]));
        dynamicObject.wall = wall;
        return dynamicObject;
    }

    it('Constructor sets expected defaults', function() {
        var dynamicObject = new DynamicObject();
        var updater = new WallGeometryUpdater(dynamicObject);

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

    it('No geometry available when wall is undefined ', function() {
        var dynamicObject = createBasicWall();
        var updater = new WallGeometryUpdater(dynamicObject);
        dynamicObject.wall = undefined;

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('No geometry available when not filled or outline.', function() {
        var dynamicObject = createBasicWall();
        var updater = new WallGeometryUpdater(dynamicObject);
        dynamicObject.wall.fill = new ConstantProperty(false);
        dynamicObject.wall.outline = new ConstantProperty(false);

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('Values correct when using default graphics', function() {
        var dynamicObject = createBasicWall();
        var updater = new WallGeometryUpdater(dynamicObject);

        expect(updater.isClosed).toBe(false);
        expect(updater.fillEnabled).toBe(true);
        expect(updater.fillMaterialProperty).toEqual(ColorMaterialProperty.fromColor(Color.WHITE));
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.hasConstantFill).toBe(true);
        expect(updater.hasConstantOutline).toBe(true);
        expect(updater.outlineColorProperty).toBe(undefined);
        expect(updater.isDynamic).toBe(false);
    });

    it('Wall material is correctly exposed.', function() {
        var dynamicObject = createBasicWall();
        var updater = new WallGeometryUpdater(dynamicObject);
        dynamicObject.wall.material = new GridMaterialProperty(Color.BLUE);
        expect(updater.fillMaterialProperty).toBe(dynamicObject.wall.material);
    });

    it('A time-varying vertexPositions causes geometry to be dynamic', function() {
        var dynamicObject = createBasicWall();
        var updater = new WallGeometryUpdater(dynamicObject);
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

    it('A time-varying minimumHeights causes geometry to be dynamic', function() {
        var dynamicObject = createBasicWall();
        var updater = new WallGeometryUpdater(dynamicObject);
        dynamicObject.wall.minimumHeights = new TimeIntervalCollectionProperty();
        dynamicObject.wall.minimumHeights.intervals.addInterval(new TimeInterval({
            start : time,
            stop : time2,
            data : []
        }));
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying maximumHeights causes geometry to be dynamic', function() {
        var dynamicObject = createBasicWall();
        var updater = new WallGeometryUpdater(dynamicObject);
        dynamicObject.wall.maximumHeights = new TimeIntervalCollectionProperty();
        dynamicObject.wall.maximumHeights.intervals.addInterval(new TimeInterval({
            start : time,
            stop : time2,
            data : []
        }));
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying granularity causes geometry to be dynamic', function() {
        var dynamicObject = createBasicWall();
        var updater = new WallGeometryUpdater(dynamicObject);
        dynamicObject.wall.granularity = new SampledProperty(Number);
        dynamicObject.wall.granularity.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    function validateGeometryInstance(options) {
        var dynamicObject = createBasicWall();

        var wall = dynamicObject.wall;
        wall.material = options.material;
        wall.show = new ConstantProperty(options.show);
        wall.fill = new ConstantProperty(options.fill);
        wall.minimumHeights = new ConstantProperty(options.minimumHeights);
        wall.maximumHeights = new ConstantProperty(options.maximumHeights);
        wall.outline = new ConstantProperty(options.outline);
        wall.outlineColor = new ConstantProperty(options.outlineColor);
        wall.granularity = new ConstantProperty(options.granularity);

        var updater = new WallGeometryUpdater(dynamicObject);

        var instance;
        var geometry;
        var attributes;
        if (options.fill) {
            instance = updater.createFillGeometryInstance(time);
            geometry = instance.geometry;
            expect(geometry._granularity).toEqual(options.granularity);
            expect(geometry._minimumHeights).toEqual(options.minimumHeights);
            expect(geometry._maximumHeights).toEqual(options.maximumHeights);

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
            expect(geometry._granularity).toEqual(options.granularity);
            expect(geometry._minimumHeights).toEqual(options.minimumHeights);
            expect(geometry._maximumHeights).toEqual(options.maximumHeights);

            attributes = instance.attributes;
            expect(attributes.color.value).toEqual(ColorGeometryInstanceAttribute.toValue(options.outlineColor));
            expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(options.fill));
        }
    }

    it('Creates expected per-color geometry', function() {
        validateGeometryInstance({
            show : true,
            material : ColorMaterialProperty.fromColor(Color.RED),
            minimumHeights : [0, 1, 2, 3],
            maximumHeights : [4, 5, 6, 7],
            granularity : 0.97,
            fill : true,
            outline : true,
            outlineColor : Color.BLUE
        });
    });

    it('Creates expected per-material geometry', function() {
        validateGeometryInstance({
            show : true,
            material : new GridMaterialProperty(),
            minimumHeights : [0, 1, 2, 3],
            maximumHeights : [4, 5, 6, 7],
            granularity : 0.97,
            fill : true,
            outline : true,
            outlineColor : Color.BLUE
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

        var dynamicObject = createBasicWall();
        dynamicObject.wall.fill = fill;
        dynamicObject.wall.material = colorMaterial;
        dynamicObject.wall.outline = outline;
        dynamicObject.wall.outlineColor = outlineColor;

        var updater = new WallGeometryUpdater(dynamicObject);

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
        function makeProperty(value1, value2) {
            var property = new TimeIntervalCollectionProperty();
            property.intervals.addInterval(new TimeInterval({
                start : time,
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

        var dynamicObject = createBasicWall();

        var wall = dynamicObject.wall;
        wall.show = makeProperty(true, false);
        wall.minimumHeights = makeProperty([1, 2, 3, 4], [5, 6, 7, 8]);
        wall.maximumHeights = makeProperty([2, 3, 4, 5], [6, 7, 8, 9]);
        wall.granularity = makeProperty(1, 2);
        wall.fill = makeProperty(false, true);
        wall.outline = makeProperty(true, false);
        wall.outlineColor = makeProperty(Color.RED, Color.BLUE);

        dynamicObject.availability = new TimeIntervalCollection();
        dynamicObject.availability.addInterval(new TimeInterval({
            start : time,
            stop : time3,
            isStopIncluded : false
        }));

        var updater = new WallGeometryUpdater(dynamicObject);
        var primitives = new PrimitiveCollection();
        var dynamicUpdater = updater.createDynamicUpdater(primitives);
        expect(dynamicUpdater.isDestroyed()).toBe(false);
        expect(primitives.length).toBe(0);
        dynamicUpdater.update(time);
        expect(primitives.length).toBe(1);
        dynamicUpdater.destroy();
        expect(primitives.length).toBe(0);
        updater.destroy();
    });

    it('geometryChanged event is raised when expected', function() {
        var dynamicObject = createBasicWall();
        var updater = new WallGeometryUpdater(dynamicObject);
        var listener = jasmine.createSpy('listener');
        updater.geometryChanged.addEventListener(listener);

        dynamicObject.vertexPositions = new ConstantProperty([]);
        expect(listener.callCount).toEqual(1);

        dynamicObject.wall.granularity = new ConstantProperty(82);
        expect(listener.callCount).toEqual(2);

        dynamicObject.availability = new TimeIntervalCollection();
        expect(listener.callCount).toEqual(3);

        dynamicObject.vertexPositions = undefined;
        expect(listener.callCount).toEqual(4);

        //Since there's no valid geometry, changing another property should not raise the event.
        dynamicObject.wall.granularity = undefined;

        //Modifying an unrelated property should not have any effect.
        dynamicObject.viewFrom = new ConstantProperty(Cartesian3.UNIT_X);
        expect(listener.callCount).toEqual(4);
    });

    it('createFillGeometryInstance throws if object is not filled', function() {
        var dynamicObject = new DynamicObject();
        var updater = new WallGeometryUpdater(dynamicObject);
        expect(function() {
            return updater.createFillGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createFillGeometryInstance throws if no time provided', function() {
        var dynamicObject = createBasicWall();
        var updater = new WallGeometryUpdater(dynamicObject);
        expect(function() {
            return updater.createFillGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws if object is not outlined', function() {
        var dynamicObject = new DynamicObject();
        var updater = new WallGeometryUpdater(dynamicObject);
        expect(function() {
            return updater.createOutlineGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws if no time provided', function() {
        var dynamicObject = createBasicWall();
        dynamicObject.wall.outline = new ConstantProperty(true);
        var updater = new WallGeometryUpdater(dynamicObject);
        expect(function() {
            return updater.createOutlineGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if not dynamic', function() {
        var dynamicObject = createBasicWall();
        var updater = new WallGeometryUpdater(dynamicObject);
        expect(function() {
            return updater.createDynamicUpdater(new PrimitiveCollection());
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if primitives undefined', function() {
        var dynamicObject = createBasicWall();
        dynamicObject.wall.granularity = new SampledProperty(Number);
        dynamicObject.wall.granularity.addSample(time, 4);
        var updater = new WallGeometryUpdater(dynamicObject);
        expect(updater.isDynamic).toBe(true);
        expect(function() {
            return updater.createDynamicUpdater(undefined);
        }).toThrowDeveloperError();
    });

    it('dynamicUpdater.update throws if no time specified', function() {
        var dynamicObject = createBasicWall();
        dynamicObject.wall.granularity = new SampledProperty(Number);
        dynamicObject.wall.granularity.addSample(time, 4);
        var updater = new WallGeometryUpdater(dynamicObject);
        var dynamicUpdater = updater.createDynamicUpdater(new PrimitiveCollection());
        expect(function() {
            dynamicUpdater.update(undefined);
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no DynamicObject supplied', function() {
        expect(function() {
            return new WallGeometryUpdater(undefined);
        }).toThrowDeveloperError();
    });
});