/*global defineSuite*/
defineSuite([
        'DataSources/WallGeometryUpdater',
        'Core/Cartesian3',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/JulianDate',
        'Core/ShowGeometryInstanceAttribute',
        'Core/TimeInterval',
        'Core/TimeIntervalCollection',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantProperty',
        'DataSources/Entity',
        'DataSources/GridMaterialProperty',
        'DataSources/PropertyArray',
        'DataSources/SampledPositionProperty',
        'DataSources/SampledProperty',
        'DataSources/TimeIntervalCollectionProperty',
        'DataSources/WallGraphics',
        'Scene/PrimitiveCollection',
        'Specs/createDynamicGeometryBoundingSphereSpecs',
        'Specs/createDynamicProperty',
        'Specs/createScene'
    ], function(
        WallGeometryUpdater,
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        JulianDate,
        ShowGeometryInstanceAttribute,
        TimeInterval,
        TimeIntervalCollection,
        ColorMaterialProperty,
        ConstantProperty,
        Entity,
        GridMaterialProperty,
        PropertyArray,
        SampledPositionProperty,
        SampledProperty,
        TimeIntervalCollectionProperty,
        WallGraphics,
        PrimitiveCollection,
        createDynamicGeometryBoundingSphereSpecs,
        createDynamicProperty,
        createScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var time;
    var time2;
    var time3;
    var scene;

    beforeAll(function() {
        scene = createScene();
        time = new JulianDate(0, 0);
        time2 = new JulianDate(10, 0);
        time3 = new JulianDate(20, 0);
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    function createBasicWall() {
        var wall = new WallGraphics();
        wall.positions = new ConstantProperty(Cartesian3.fromRadiansArray([
            0, 0,
            1, 0,
            1, 1,
            0, 1
        ]));
        var entity = new Entity();
        entity.wall = wall;
        return entity;
    }

    it('Constructor sets expected defaults', function() {
        var entity = new Entity();
        var updater = new WallGeometryUpdater(entity, scene);

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
        expect(updater.isDynamic).toBe(false);
        expect(updater.isOutlineVisible(time)).toBe(false);
        expect(updater.isFilled(time)).toBe(false);
        updater.destroy();
        expect(updater.isDestroyed()).toBe(true);
    });

    it('No geometry available when wall is undefined ', function() {
        var entity = createBasicWall();
        var updater = new WallGeometryUpdater(entity, scene);
        entity.wall = undefined;

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('No geometry available when not filled or outline.', function() {
        var entity = createBasicWall();
        var updater = new WallGeometryUpdater(entity, scene);
        entity.wall.fill = new ConstantProperty(false);
        entity.wall.outline = new ConstantProperty(false);

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('Values correct when using default graphics', function() {
        var entity = createBasicWall();
        var updater = new WallGeometryUpdater(entity, scene);

        expect(updater.isClosed).toBe(false);
        expect(updater.fillEnabled).toBe(true);
        expect(updater.fillMaterialProperty).toEqual(new ColorMaterialProperty(Color.WHITE));
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.hasConstantFill).toBe(true);
        expect(updater.hasConstantOutline).toBe(true);
        expect(updater.outlineColorProperty).toBe(undefined);
        expect(updater.outlineWidth).toBe(1.0);
        expect(updater.isDynamic).toBe(false);
    });

    it('Wall material is correctly exposed.', function() {
        var entity = createBasicWall();
        var updater = new WallGeometryUpdater(entity, scene);
        entity.wall.material = new GridMaterialProperty(Color.BLUE);
        expect(updater.fillMaterialProperty).toBe(entity.wall.material);
    });

    it('A time-varying outlineWidth causes geometry to be dynamic', function() {
        var entity = createBasicWall();
        var updater = new WallGeometryUpdater(entity, scene);
        entity.wall.outlineWidth = new SampledProperty(Number);
        entity.wall.outlineWidth.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying positions causes geometry to be dynamic', function() {
        var entity = createBasicWall();
        var updater = new WallGeometryUpdater(entity, scene);
        var point1 = new SampledPositionProperty();
        point1.addSample(time, new Cartesian3());
        var point2 = new SampledPositionProperty();
        point2.addSample(time, new Cartesian3());
        var point3 = new SampledPositionProperty();
        point3.addSample(time, new Cartesian3());

        entity.wall.positions = new PropertyArray();
        entity.wall.positions.setValue([point1, point2, point3]);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying minimumHeights causes geometry to be dynamic', function() {
        var entity = createBasicWall();
        var updater = new WallGeometryUpdater(entity, scene);
        entity.wall.minimumHeights = new TimeIntervalCollectionProperty();
        entity.wall.minimumHeights.intervals.addInterval(new TimeInterval({
            start : time,
            stop : time2,
            data : []
        }));
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying maximumHeights causes geometry to be dynamic', function() {
        var entity = createBasicWall();
        var updater = new WallGeometryUpdater(entity, scene);
        entity.wall.maximumHeights = new TimeIntervalCollectionProperty();
        entity.wall.maximumHeights.intervals.addInterval(new TimeInterval({
            start : time,
            stop : time2,
            data : []
        }));
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying granularity causes geometry to be dynamic', function() {
        var entity = createBasicWall();
        var updater = new WallGeometryUpdater(entity, scene);
        entity.wall.granularity = new SampledProperty(Number);
        entity.wall.granularity.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    function validateGeometryInstance(options) {
        var entity = createBasicWall();

        var wall = entity.wall;
        wall.material = options.material;
        wall.show = new ConstantProperty(options.show);
        wall.fill = new ConstantProperty(options.fill);
        wall.minimumHeights = new ConstantProperty(options.minimumHeights);
        wall.maximumHeights = new ConstantProperty(options.maximumHeights);
        wall.outline = new ConstantProperty(options.outline);
        wall.outlineColor = new ConstantProperty(options.outlineColor);
        wall.granularity = new ConstantProperty(options.granularity);

        var updater = new WallGeometryUpdater(entity, scene);

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
            material : new ColorMaterialProperty(Color.RED),
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

    it('Correctly exposes outlineWidth', function() {
        var entity = createBasicWall();
        entity.wall.outlineWidth = new ConstantProperty(8);
        var updater = new WallGeometryUpdater(entity, scene);
        expect(updater.outlineWidth).toBe(8);
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

        var entity = createBasicWall();
        entity.wall.fill = fill;
        entity.wall.material = colorMaterial;
        entity.wall.outline = outline;
        entity.wall.outlineColor = outlineColor;

        var updater = new WallGeometryUpdater(entity, scene);

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
        var entity = createBasicWall();
        entity.show = false;
        entity.wall.fill = true;
        var updater = new WallGeometryUpdater(entity, scene);
        var instance = updater.createFillGeometryInstance(new JulianDate());
        var attributes = instance.attributes;
        expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(false));
    });

    it('createOutlineGeometryInstance obeys Entity.show is false.', function() {
        var entity = createBasicWall();
        entity.show = false;
        entity.wall.outline = true;
        var updater = new WallGeometryUpdater(entity, scene);
        var instance = updater.createFillGeometryInstance(new JulianDate());
        var attributes = instance.attributes;
        expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(false));
    });

    it('dynamic updater sets properties', function() {
        var wall = new WallGraphics();
        wall.positions = createDynamicProperty(Cartesian3.fromRadiansArray([0, 0, 1, 0, 1, 1, 0, 1]));
        wall.show = createDynamicProperty(true);
        wall.minimumHeights = createDynamicProperty([1, 2, 3, 4]);
        wall.maximumHeights = createDynamicProperty([2, 3, 4, 5]);
        wall.granularity = createDynamicProperty(1);
        wall.fill = createDynamicProperty(true);
        wall.outline = createDynamicProperty(true);
        wall.outlineColor = createDynamicProperty(Color.RED);

        var entity = new Entity();
        entity.wall = wall;

        var updater = new WallGeometryUpdater(entity, scene);
        var primitives = new PrimitiveCollection();
        var dynamicUpdater = updater.createDynamicUpdater(primitives);
        expect(dynamicUpdater.isDestroyed()).toBe(false);
        expect(primitives.length).toBe(0);

        dynamicUpdater.update(time);
        expect(primitives.length).toBe(2);

        var options = dynamicUpdater._options;
        expect(options.id).toEqual(entity);
        expect(options.positions).toEqual(wall.positions.getValue());
        expect(options.minimumHeights).toEqual(wall.minimumHeights.getValue());
        expect(options.maximumHeights).toEqual(wall.maximumHeights.getValue());
        expect(options.granularity).toEqual(wall.granularity.getValue());

        entity.show = false;
        dynamicUpdater.update(JulianDate.now());
        expect(primitives.length).toBe(0);
        entity.show = true;

        //If a dynamic show returns false, the primitive should go away.
        wall.show.setValue(false);
        dynamicUpdater.update(time);
        expect(primitives.length).toBe(0);

        wall.show.setValue(true);
        dynamicUpdater.update(time);
        expect(primitives.length).toBe(2);

        //If a dynamic position returns undefined, the primitive should go away.
        wall.positions.setValue(undefined);
        dynamicUpdater.update(time);
        expect(primitives.length).toBe(0);

        dynamicUpdater.destroy();
        updater.destroy();
    });

    it('geometryChanged event is raised when expected', function() {
        var entity = createBasicWall();
        var updater = new WallGeometryUpdater(entity, scene);
        var listener = jasmine.createSpy('listener');
        updater.geometryChanged.addEventListener(listener);

        entity.wall.positions = new ConstantProperty([]);
        expect(listener.calls.count()).toEqual(1);

        entity.wall.granularity = new ConstantProperty(82);
        expect(listener.calls.count()).toEqual(2);

        entity.availability = new TimeIntervalCollection();
        expect(listener.calls.count()).toEqual(3);

        entity.wall.positions = undefined;
        expect(listener.calls.count()).toEqual(4);

        //Since there's no valid geometry, changing another property should not raise the event.
        entity.wall.granularity = undefined;

        //Modifying an unrelated property should not have any effect.
        entity.viewFrom = new ConstantProperty(Cartesian3.UNIT_X);
        expect(listener.calls.count()).toEqual(4);
    });

    it('createFillGeometryInstance throws if object is not filled', function() {
        var entity = new Entity();
        var updater = new WallGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createFillGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createFillGeometryInstance throws if no time provided', function() {
        var entity = createBasicWall();
        var updater = new WallGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createFillGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws if object is not outlined', function() {
        var entity = new Entity();
        var updater = new WallGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createOutlineGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws if no time provided', function() {
        var entity = createBasicWall();
        entity.wall.outline = new ConstantProperty(true);
        var updater = new WallGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createOutlineGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if not dynamic', function() {
        var entity = createBasicWall();
        var updater = new WallGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createDynamicUpdater(new PrimitiveCollection());
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if primitives undefined', function() {
        var entity = createBasicWall();
        entity.wall.granularity = new SampledProperty(Number);
        entity.wall.granularity.addSample(time, 4);
        var updater = new WallGeometryUpdater(entity, scene);
        expect(updater.isDynamic).toBe(true);
        expect(function() {
            return updater.createDynamicUpdater(undefined);
        }).toThrowDeveloperError();
    });

    it('dynamicUpdater.update throws if no time specified', function() {
        var entity = createBasicWall();
        entity.wall.granularity = new SampledProperty(Number);
        entity.wall.granularity.addSample(time, 4);
        var updater = new WallGeometryUpdater(entity, scene);
        var dynamicUpdater = updater.createDynamicUpdater(new PrimitiveCollection());
        expect(function() {
            dynamicUpdater.update(undefined);
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no Entity supplied', function() {
        expect(function() {
            return new WallGeometryUpdater(undefined);
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no scene supplied', function() {
        var entity = createBasicWall();
        expect(function() {
            return new WallGeometryUpdater(entity, undefined);
        }).toThrowDeveloperError();
    });

    var entity = createBasicWall();
    entity.wall.granularity = createDynamicProperty(1);
    createDynamicGeometryBoundingSphereSpecs(WallGeometryUpdater, entity, entity.wall, function() {
        return scene;
    });
});