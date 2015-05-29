/*global defineSuite*/
defineSuite([
        'DataSources/PolylineGeometryUpdater',
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/JulianDate',
        'Core/ShowGeometryInstanceAttribute',
        'Core/TimeInterval',
        'Core/TimeIntervalCollection',
        'DataSources/BoundingSphereState',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantProperty',
        'DataSources/Entity',
        'DataSources/GridMaterialProperty',
        'DataSources/PolylineGraphics',
        'DataSources/PropertyArray',
        'DataSources/SampledPositionProperty',
        'DataSources/SampledProperty',
        'DataSources/TimeIntervalCollectionProperty',
        'Scene/Globe',
        'Scene/PrimitiveCollection',
        'Specs/createDynamicProperty',
        'Specs/createScene'
    ], function(
        PolylineGeometryUpdater,
        BoundingSphere,
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        JulianDate,
        ShowGeometryInstanceAttribute,
        TimeInterval,
        TimeIntervalCollection,
        BoundingSphereState,
        ColorMaterialProperty,
        ConstantProperty,
        Entity,
        GridMaterialProperty,
        PolylineGraphics,
        PropertyArray,
        SampledPositionProperty,
        SampledProperty,
        TimeIntervalCollectionProperty,
        Globe,
        PrimitiveCollection,
        createDynamicProperty,
        createScene) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn*/

    var scene;
    beforeAll(function(){
        scene = createScene();
        scene.globe = new Globe();
    });

    afterAll(function(){
        scene.destroyForSpecs();
    });

    beforeEach(function() {
        scene.primitives.removeAll();
    });

    var time = JulianDate.now();

    function createBasicPolyline() {
        var polyline = new PolylineGraphics();
        polyline.positions = new ConstantProperty(Cartesian3.fromRadiansArray([
            0, 0,
            1, 0,
            1, 1,
            0, 1
        ]));
        var entity = new Entity();
        entity.polyline = polyline;
        return entity;
    }

    it('Constructor sets expected defaults', function() {
        var entity = new Entity();
        var updater = new PolylineGeometryUpdater(entity, scene);

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
        var updater = new PolylineGeometryUpdater(entity, scene);
        entity.polyline = undefined;

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('No geometry available when not shown.', function() {
        var entity = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(entity, scene);
        entity.polyline.show = new ConstantProperty(false);

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('Values correct when using default graphics', function() {
        var entity = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(entity, scene);

        expect(updater.isClosed).toBe(false);
        expect(updater.fillEnabled).toBe(true);
        expect(updater.fillMaterialProperty).toEqual(new ColorMaterialProperty(Color.WHITE));
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.hasConstantFill).toBe(true);
        expect(updater.hasConstantOutline).toBe(true);
        expect(updater.outlineColorProperty).toBe(undefined);
        expect(updater.isDynamic).toBe(false);
    });

    it('Polyline material is correctly exposed.', function() {
        var entity = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(entity, scene);
        entity.polyline.material = new ColorMaterialProperty();
        expect(updater.fillMaterialProperty).toBe(entity.polyline.material);
    });

    it('A time-varying positions causes geometry to be dynamic', function() {
        var entity = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(entity, scene);
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
        var updater = new PolylineGeometryUpdater(entity, scene);
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
        var updater = new PolylineGeometryUpdater(entity, scene);
        entity.polyline.followSurface = followSurface;
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying granularity causes geometry to be dynamic', function() {
        var entity = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(entity, scene);
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

        var updater = new PolylineGeometryUpdater(entity, scene);

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
            material : new ColorMaterialProperty(Color.RED),
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

        var updater = new PolylineGeometryUpdater(entity, scene);

        var instance = updater.createFillGeometryInstance(time2);
        var attributes = instance.attributes;
        expect(attributes.color.value).toEqual(ColorGeometryInstanceAttribute.toValue(colorMaterial.color.getValue(time2)));
        expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(show.getValue(time2)));
    });

    it('createFillGeometryInstance obeys Entity.show is false.', function() {
        var entity = createBasicPolyline();
        entity.show = false;
        entity.polyline.fill = true;
        var updater = new PolylineGeometryUpdater(entity, scene);
        var instance = updater.createFillGeometryInstance(new JulianDate());
        var attributes = instance.attributes;
        expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(false));
    });

    it('dynamic updater sets properties', function() {
        var entity = new Entity();
        var polyline = new PolylineGraphics();
        entity.polyline = polyline;

        var time1 = new JulianDate(0, 0);
        var time2 = new JulianDate(10, 0);
        var time3 = new JulianDate(20, 0);

        var width = new SampledProperty(Number);
        width.addSample(time, 1);
        width.addSample(time2, 2);
        width.addSample(time3, 3);

        polyline.show = new ConstantProperty(true);
        polyline.width = width;
        polyline.positions = new ConstantProperty([Cartesian3.fromDegrees(0, 0, 0), Cartesian3.fromDegrees(0, 1, 0)]);
        polyline.material = new ColorMaterialProperty(Color.RED);
        polyline.followSurface = new ConstantProperty(false);
        polyline.granularity = new ConstantProperty(0.001);

        var updater = new PolylineGeometryUpdater(entity, scene);

        var primitives = scene.primitives;
        expect(primitives.length).toBe(0);

        var dynamicUpdater = updater.createDynamicUpdater(primitives);
        expect(dynamicUpdater.isDestroyed()).toBe(false);
        expect(primitives.length).toBe(1);

        dynamicUpdater.update(time2);

        var polylineCollection = primitives.get(0);
        var primitive = polylineCollection.get(0);

        expect(primitive.show).toEqual(true);
        expect(primitive.width).toEqual(2);
        expect(primitive.material.type).toEqual('Color');
        expect(primitive.material.uniforms.color).toEqual(Color.RED);
        expect(primitive.positions.length).toEqual(2);

        polyline.followSurface = new ConstantProperty(true);
        dynamicUpdater.update(time3);

        expect(primitive.width).toEqual(3);
        expect(primitive.positions.length).toBeGreaterThan(2);

        dynamicUpdater.destroy();
        expect(primitives.length).toBe(0);
        updater.destroy();
    });

    it('geometryChanged event is raised when expected', function() {
        var entity = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(entity, scene);
        var listener = jasmine.createSpy('listener');
        updater.geometryChanged.addEventListener(listener);

        entity.polyline.positions = new ConstantProperty(Cartesian3.fromRadiansArray([
            0, 0,
            1, 0
        ]));
        expect(listener.calls.count()).toEqual(1);

        entity.polyline.width = new ConstantProperty(82);
        expect(listener.calls.count()).toEqual(2);

        entity.availability = new TimeIntervalCollection();
        expect(listener.calls.count()).toEqual(3);

        entity.polyline.positions = undefined;
        expect(listener.calls.count()).toEqual(4);

        //Since there's no valid geometry, changing another property should not raise the event.
        entity.polyline.width = undefined;

        //Modifying an unrelated property should not have any effect.
        entity.viewFrom = new ConstantProperty(Cartesian3.UNIT_X);
        expect(listener.calls.count()).toEqual(4);
    });

    it('createFillGeometryInstance throws if object is not shown', function() {
        var entity = new Entity();
        var updater = new PolylineGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createFillGeometryInstance(time);
        }).toThrowDeveloperError();
    });

    it('createFillGeometryInstance throws if no time provided', function() {
        var entity = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createFillGeometryInstance(undefined);
        }).toThrowDeveloperError();
    });

    it('createOutlineGeometryInstance throws', function() {
        var entity = new Entity();
        var updater = new PolylineGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createOutlineGeometryInstance();
        }).toThrowDeveloperError();
    });

    it('createDynamicUpdater throws if not dynamic', function() {
        var entity = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(entity, scene);
        expect(function() {
            return updater.createDynamicUpdater(scene.primitives);
        }).toThrowDeveloperError();
        updater.destroy();
    });

    it('createDynamicUpdater throws if primitives undefined', function() {
        var entity = createBasicPolyline();
        entity.polyline.width = new SampledProperty(Number);
        entity.polyline.width.addSample(time, 4);
        var updater = new PolylineGeometryUpdater(entity, scene);
        expect(updater.isDynamic).toBe(true);
        expect(function() {
            return updater.createDynamicUpdater(undefined);
        }).toThrowDeveloperError();
        updater.destroy();
    });

    it('dynamicUpdater.update throws if no time specified', function() {
        var entity = createBasicPolyline();
        entity.polyline.width = new SampledProperty(Number);
        entity.polyline.width.addSample(time, 4);
        var updater = new PolylineGeometryUpdater(entity, scene);
        var dynamicUpdater = updater.createDynamicUpdater(scene.primitives);
        expect(function() {
            dynamicUpdater.update(undefined);
        }).toThrowDeveloperError();
        updater.destroy();
    });

    it('Constructor throws if no entity supplied', function() {
        expect(function() {
            return new PolylineGeometryUpdater(undefined, scene);
        }).toThrowDeveloperError();
    });

    it('Constructor throws if no scene supplied', function() {
        var entity = new Entity();
        expect(function() {
            return new PolylineGeometryUpdater(entity, undefined);
        }).toThrowDeveloperError();
    });

    it('Computes dynamic geometry bounding sphere for fill.', function() {
        var entity = createBasicPolyline();
        entity.polyline.width = createDynamicProperty(1);

        var updater = new PolylineGeometryUpdater(entity, scene);
        var dynamicUpdater = updater.createDynamicUpdater(scene.primitives);
        dynamicUpdater.update(time);

        var result = new BoundingSphere(0);
        var state = dynamicUpdater.getBoundingSphere(entity, result);
        expect(state).toBe(BoundingSphereState.DONE);

        var primitive = scene.primitives.get(0);
        var line = primitive.get(0);
        expect(result).toEqual(BoundingSphere.fromPoints(line.positions));

        updater.destroy();
        scene.primitives.removeAll();
    });

    it('Fails dynamic geometry bounding sphere for entity without billboard.', function() {
        var entity = createBasicPolyline();
        entity.polyline.width = createDynamicProperty(1);
        var updater = new PolylineGeometryUpdater(entity, scene);
        var dynamicUpdater = updater.createDynamicUpdater(scene.primitives);

        var result = new BoundingSphere();
        var state = dynamicUpdater.getBoundingSphere(entity, result);
        expect(state).toBe(BoundingSphereState.FAILED);

        updater.destroy();
        scene.primitives.removeAll();
    });

    it('Compute dynamic geometry bounding sphere throws without entity.', function() {
        var entity = createBasicPolyline();
        entity.polyline.width = createDynamicProperty(1);
        var updater = new PolylineGeometryUpdater(entity, scene);
        var dynamicUpdater = updater.createDynamicUpdater(scene.primitives);

        var result = new BoundingSphere();
        expect(function() {
            dynamicUpdater.getBoundingSphere(undefined, result);
        }).toThrowDeveloperError();

        updater.destroy();
        scene.primitives.removeAll();
    });

    it('Compute dynamic geometry bounding sphere throws without result.', function() {
        var entity = createBasicPolyline();
        entity.polyline.width = createDynamicProperty(1);
        var updater = new PolylineGeometryUpdater(entity, scene);
        var dynamicUpdater = updater.createDynamicUpdater(scene.primitives);

        expect(function() {
            dynamicUpdater.getBoundingSphere(entity, undefined);
        }).toThrowDeveloperError();

        updater.destroy();
        scene.primitives.removeAll();
    });
});