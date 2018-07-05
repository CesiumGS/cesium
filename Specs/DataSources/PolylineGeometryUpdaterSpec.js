defineSuite([
        'DataSources/PolylineGeometryUpdater',
        'Core/ApproximateTerrainHeights',
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/DistanceDisplayCondition',
        'Core/DistanceDisplayConditionGeometryInstanceAttribute',
        'Core/GroundPolylineGeometry',
        'Core/JulianDate',
        'Core/PolylinePipeline',
        'Core/ShowGeometryInstanceAttribute',
        'Core/TimeInterval',
        'Core/TimeIntervalCollection',
        'DataSources/BoundingSphereState',
        'DataSources/CallbackProperty',
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
        'Scene/GroundPolylinePrimitive',
        'Scene/ShadowMode',
        'Specs/createDynamicProperty',
        'Specs/createScene',
        'Specs/pollToPromise'
    ], function(
        PolylineGeometryUpdater,
        ApproximateTerrainHeights,
        BoundingSphere,
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        DistanceDisplayCondition,
        DistanceDisplayConditionGeometryInstanceAttribute,
        GroundPolylineGeometry,
        JulianDate,
        PolylinePipeline,
        ShowGeometryInstanceAttribute,
        TimeInterval,
        TimeIntervalCollection,
        BoundingSphereState,
        CallbackProperty,
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
        GroundPolylinePrimitive,
        ShadowMode,
        createDynamicProperty,
        createScene,
        pollToPromise) {
    'use strict';

    var scene;
    beforeAll(function(){
        scene = createScene();
        scene.globe = new Globe();
        return GroundPolylinePrimitive.initializeTerrainHeights();
    });

    afterAll(function(){
        scene.destroyForSpecs();

        GroundPolylinePrimitive._initPromise = undefined;
        GroundPolylinePrimitive._initialized = false;

        ApproximateTerrainHeights._initPromise = undefined;
        ApproximateTerrainHeights._terrainHeights = undefined;
    });

    var time = JulianDate.now();

    var basicPositions = Cartesian3.fromRadiansArray([
            0, 0,
            1, 0,
            1, 1,
            0, 1
    ]);
    function createBasicPolyline() {
        var polyline = new PolylineGraphics();
        polyline.positions = new ConstantProperty(basicPositions);
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
        expect(updater.depthFailMaterialProperty).toBe(undefined);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.hasConstantFill).toBe(true);
        expect(updater.hasConstantOutline).toBe(true);
        expect(updater.outlineColorProperty).toBe(undefined);
        expect(updater.shadowsProperty).toBe(undefined);
        expect(updater.distanceDisplayConditionProperty).toBe(undefined);
        expect(updater.isDynamic).toBe(false);
        expect(updater.clampToGround).toBe(false);
        expect(updater.zIndex).toBe(0);

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
        expect(updater.depthFailMaterialProperty).toBe(undefined);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.hasConstantFill).toBe(true);
        expect(updater.hasConstantOutline).toBe(true);
        expect(updater.outlineColorProperty).toBe(undefined);
        expect(updater.shadowsProperty).toEqual(new ConstantProperty(ShadowMode.DISABLED));
        expect(updater.distanceDisplayConditionProperty).toEqual(new ConstantProperty(new DistanceDisplayCondition()));
        expect(updater.isDynamic).toBe(false);
        expect(updater.clampToGround).toBe(false);
        expect(updater.zIndex).toEqual(new ConstantProperty(0));
    });

    it('Polyline material is correctly exposed.', function() {
        var entity = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(entity, scene);
        entity.polyline.material = new ColorMaterialProperty();
        expect(updater.fillMaterialProperty).toBe(entity.polyline.material);
    });

    it('Polyline depth fail material is correctly exposed.', function() {
        var entity = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(entity, scene);
        entity.polyline.depthFailMaterial = new ColorMaterialProperty();
        expect(updater.depthFailMaterialProperty).toBe(entity.polyline.depthFailMaterial);
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

    it('A time-varying clampToGround causes geometry to be dynamic', function() {
        var entity = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(entity, scene);
        entity.polyline.clampToGround = new SampledProperty(Number);
        entity.polyline.clampToGround.addSample(time, true);
        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying zIndex causes geometry to be dynamic', function() {
        var entity = createBasicPolyline();
        var updater = new PolylineGeometryUpdater(entity, scene);
        entity.polyline.zIndex = new SampledProperty(Number);
        entity.polyline.zIndex.addSample(time, 1);
        expect(updater.isDynamic).toBe(true);
    });

    function validateGeometryInstance(options) {
        var entity = createBasicPolyline();
        var clampToGround = options.clampToGround;

        var polyline = entity.polyline;
        polyline.show = new ConstantProperty(options.show);
        polyline.material = options.material;
        polyline.depthFailMaterial = options.depthFailMaterial;

        polyline.width = new ConstantProperty(options.width);
        polyline.followSurface = new ConstantProperty(options.followSurface);
        polyline.granularity = new ConstantProperty(options.granularity);
        polyline.distanceDisplayCondition = options.distanceDisplayCondition;
        polyline.clampToGround = new ConstantProperty(clampToGround);

        var updater = new PolylineGeometryUpdater(entity, scene);

        var instance;
        var geometry;
        var attributes;
        instance = updater.createFillGeometryInstance(time);
        geometry = instance.geometry;
        attributes = instance.attributes;

        if (clampToGround) {
            expect(geometry.width).toEqual(options.width);
        } else {
            expect(geometry._width).toEqual(options.width);
            expect(geometry._followSurface).toEqual(options.followSurface);
            expect(geometry._granularity).toEqual(options.granularity);

            if (options.depthFailMaterial && options.depthFailMaterial instanceof ColorMaterialProperty) {
                expect(attributes.depthFailColor.value).toEqual(ColorGeometryInstanceAttribute.toValue(options.depthFailMaterial.color.getValue(time)));
            } else {
                expect(attributes.depthFailColor).toBeUndefined();
            }
        }

        if (options.material instanceof ColorMaterialProperty) {
            expect(attributes.color.value).toEqual(ColorGeometryInstanceAttribute.toValue(options.material.color.getValue(time)));
        } else {
            expect(attributes.color).toBeUndefined();
        }
        expect(attributes.show.value).toEqual(ShowGeometryInstanceAttribute.toValue(options.show));
        if (options.distanceDisplayCondition) {
            expect(attributes.distanceDisplayCondition.value).toEqual(DistanceDisplayConditionGeometryInstanceAttribute.toValue(options.distanceDisplayCondition));
        }
    }

    it('Creates expected per-color geometry', function() {
        validateGeometryInstance({
            show : true,
            material : new ColorMaterialProperty(Color.RED),
            width : 3,
            followSurface : false,
            clampToGround : false,
            granularity : 1.0
        });

        if (!Entity.supportsPolylinesOnTerrain(scene)) {
            return;
        }

        // On terrain
        validateGeometryInstance({
            show : true,
            material : new ColorMaterialProperty(Color.RED),
            width : 3,
            followSurface : false,
            clampToGround : true,
            granularity : 1.0
        });
    });

    it('Creates expected per-color geometry with color depth fail appearance', function() {
        validateGeometryInstance({
            show : true,
            material : new ColorMaterialProperty(Color.RED),
            depthFailMaterial : new ColorMaterialProperty(Color.BLUE),
            width : 3,
            followSurface : false,
            clampToGround : false,
            granularity : 1.0
        });
    });

    it('Creates expected per-color geometry with material depth fail appearance', function() {
        validateGeometryInstance({
            show : true,
            material : new ColorMaterialProperty(Color.RED),
            depthFailMaterial : new GridMaterialProperty(),
            width : 3,
            followSurface : false,
            clampToGround : false,
            granularity : 1.0
        });
    });

    it('Creates expected per-material geometry', function() {
        validateGeometryInstance({
            show : true,
            material : new GridMaterialProperty(),
            width : 4,
            followSurface : true,
            clampToGround : false,
            granularity : 0.5
        });

        if (!Entity.supportsPolylinesOnTerrain(scene)) {
            return;
        }

        // On terrain
        validateGeometryInstance({
            show : true,
            material : new GridMaterialProperty(),
            width : 4,
            followSurface : true,
            clampToGround : true,
            granularity : 0.5
        });
    });

    it('Creates expected per-material geometry with color depth fail appearance', function() {
        validateGeometryInstance({
            show : true,
            material : new GridMaterialProperty(),
            depthFailMaterial : new ColorMaterialProperty(Color.BLUE),
            width : 4,
            followSurface : true,
            clampToGround : false,
            granularity : 0.5
        });
    });

    it('Creates expected per-material geometry with color depth fail appearance', function() {
        validateGeometryInstance({
            show : true,
            material : new GridMaterialProperty(),
            depthFailMaterial : new GridMaterialProperty(),
            width : 4,
            followSurface : true,
            clampToGround : false,
            granularity : 0.5
        });
    });

    it('Creates expected distance display condition geometry', function() {
        validateGeometryInstance({
            show : true,
            material : new ColorMaterialProperty(Color.RED),
            width : 3,
            followSurface : false,
            clampToGround : false,
            granularity : 1.0,
            distanceDisplayCondition : new DistanceDisplayCondition(10.0, 100.0)
        });

        if (!Entity.supportsPolylinesOnTerrain(scene)) {
            return;
        }

        // On terrain
        validateGeometryInstance({
            show : true,
            material : new ColorMaterialProperty(Color.RED),
            width : 3,
            followSurface : false,
            clampToGround : true,
            granularity : 1.0,
            distanceDisplayCondition : new DistanceDisplayCondition(10.0, 100.0)
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

        var time = new JulianDate(0, 0);
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

        var dynamicUpdater = updater.createDynamicUpdater(primitives, scene.groundPrimitives);
        expect(dynamicUpdater.isDestroyed()).toBe(false);

        dynamicUpdater.update(time2);

        expect(primitives.length).toBe(1);
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
        expect(scene.groundPrimitives.length).toBe(0);
        updater.destroy();
    });

    it('clampToGround can be dynamic', function() {
        if (!Entity.supportsPolylinesOnTerrain(scene)) {
            return;
        }

        var entity = new Entity();
        var polyline = new PolylineGraphics();
        entity.polyline = polyline;

        var time = new JulianDate(0, 0);

        var isClampedToGround = true;
        var clampToGround = new CallbackProperty(function() {
            return isClampedToGround;
        }, false);

        polyline.show = new ConstantProperty(true);
        polyline.width = new ConstantProperty(1.0);
        polyline.positions = new ConstantProperty([Cartesian3.fromDegrees(0, 0, 0), Cartesian3.fromDegrees(0, 1, 0)]);
        polyline.material = new ColorMaterialProperty(Color.RED);
        polyline.followSurface = new ConstantProperty(false);
        polyline.granularity = new ConstantProperty(0.001);
        polyline.clampToGround = clampToGround;

        var updater = new PolylineGeometryUpdater(entity, scene);

        var groundPrimitives = scene.groundPrimitives;
        expect(groundPrimitives.length).toBe(0);

        var dynamicUpdater = updater.createDynamicUpdater(scene.primitives, groundPrimitives);
        expect(dynamicUpdater.isDestroyed()).toBe(false);
        expect(groundPrimitives.length).toBe(0);

        dynamicUpdater.update(time);

        expect(groundPrimitives.length).toBe(1);
        var primitive = groundPrimitives.get(0);

        expect(primitive.show).toEqual(true);

        isClampedToGround = false;
        dynamicUpdater.update(time);

        dynamicUpdater.destroy();

        expect(scene.primitives.length).toBe(0);
        expect(groundPrimitives.length).toBe(0);

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
            return updater.createDynamicUpdater(scene.primitives, scene.groundPrimitives);
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
            return updater.createDynamicUpdater(undefined, scene.groundPrimitives);
        }).toThrowDeveloperError();
        updater.destroy();
    });

    it('createDynamicUpdater throws if groundPrimitives undefined', function() {
        var entity = createBasicPolyline();
        entity.polyline.width = new SampledProperty(Number);
        entity.polyline.width.addSample(time, 4);
        var updater = new PolylineGeometryUpdater(entity, scene);
        expect(updater.isDynamic).toBe(true);
        expect(function() {
            return updater.createDynamicUpdater(scene.primitives);
        }).toThrowDeveloperError();
        updater.destroy();
    });

    it('dynamicUpdater.update throws if no time specified', function() {
        var entity = createBasicPolyline();
        entity.polyline.width = new SampledProperty(Number);
        entity.polyline.width.addSample(time, 4);
        var updater = new PolylineGeometryUpdater(entity, scene);
        var dynamicUpdater = updater.createDynamicUpdater(scene.primitives, scene.groundPrimitives);
        expect(function() {
            dynamicUpdater.update(undefined);
        }).toThrowDeveloperError();
        dynamicUpdater.destroy();
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
        var dynamicUpdater = updater.createDynamicUpdater(scene.primitives, scene.groundPrimitives);
        dynamicUpdater.update(time);

        var result = new BoundingSphere(0);
        var state = dynamicUpdater.getBoundingSphere(result);
        expect(state).toBe(BoundingSphereState.DONE);

        var primitive = scene.primitives.get(0);
        var line = primitive.get(0);
        expect(result).toEqual(BoundingSphere.fromPoints(line.positions));

        dynamicUpdater.destroy();
        updater.destroy();

        expect(scene.primitives.length).toBe(0);
        expect(scene.groundPrimitives.length).toBe(0);
    });

    it('Computes dynamic geometry bounding sphere on terrain.', function() {
        if (!Entity.supportsPolylinesOnTerrain(scene)) {
            return;
        }

        var entity = createBasicPolyline();
        entity.polyline.width = createDynamicProperty(1);
        entity.polyline.clampToGround = true;

        var updater = new PolylineGeometryUpdater(entity, scene);
        var dynamicUpdater = updater.createDynamicUpdater(scene.primitives, scene.groundPrimitives);
        dynamicUpdater.update(time);

        var result = new BoundingSphere(0);
        var state = dynamicUpdater.getBoundingSphere(result);
        expect(state).toBe(BoundingSphereState.PENDING);

        return pollToPromise(function() {
            scene.initializeFrame();
            scene.render();
            state = dynamicUpdater.getBoundingSphere(result);
            return state !== BoundingSphereState.PENDING;
        }).then(function() {
            var primitive = scene.groundPrimitives.get(0);
            expect(state).toBe(BoundingSphereState.DONE);
            var attributes = primitive.getGeometryInstanceAttributes(entity);
            expect(result).toEqual(attributes.boundingSphere);

            dynamicUpdater.destroy();
            updater.destroy();

            expect(scene.primitives.length).toBe(0);
            expect(scene.groundPrimitives.length).toBe(0);
        });
    });

    it('Fails dynamic geometry bounding sphere for entity without billboard.', function() {
        var entity = createBasicPolyline();
        entity.polyline.width = createDynamicProperty(1);
        var updater = new PolylineGeometryUpdater(entity, scene);
        var dynamicUpdater = updater.createDynamicUpdater(scene.primitives, scene.groundPrimitives);

        var result = new BoundingSphere();
        var state = dynamicUpdater.getBoundingSphere(result);
        expect(state).toBe(BoundingSphereState.FAILED);

        dynamicUpdater.destroy();
        updater.destroy();

        expect(scene.primitives.length).toBe(0);
        expect(scene.groundPrimitives.length).toBe(0);
    });

    it('Compute dynamic geometry bounding sphere throws without result.', function() {
        var entity = createBasicPolyline();
        entity.polyline.width = createDynamicProperty(1);
        var updater = new PolylineGeometryUpdater(entity, scene);
        var dynamicUpdater = updater.createDynamicUpdater(scene.primitives, scene.groundPrimitives);

        expect(function() {
            dynamicUpdater.getBoundingSphere(undefined);
        }).toThrowDeveloperError();

        dynamicUpdater.destroy();
        updater.destroy();

        expect(scene.primitives.length).toBe(0);
        expect(scene.groundPrimitives.length).toBe(0);
    });

    it('followSurface true with undefined globe does not call generateCartesianArc', function() {
        var entity = createBasicPolyline();
        entity.polyline.width = createDynamicProperty(1);
        scene.globe = undefined;
        var updater = new PolylineGeometryUpdater(entity, scene);
        var dynamicUpdater = updater.createDynamicUpdater(scene.primitives, scene.groundPrimitives);
        spyOn(PolylinePipeline, 'generateCartesianArc').and.callThrough();
        dynamicUpdater.update(time);
        expect(PolylinePipeline.generateCartesianArc).not.toHaveBeenCalled();
        dynamicUpdater.destroy();
        updater.destroy();

        expect(scene.primitives.length).toBe(0);
        expect(scene.groundPrimitives.length).toBe(0);

        scene.globe = new Globe();
    });

    it('clampToGround true without support for polylines on terrain does not generate GroundPolylineGeometry', function() {
        spyOn(Entity, 'supportsPolylinesOnTerrain').and.callFake(function() {
            return false;
        });

        var entity = createBasicPolyline();

        var polyline = entity.polyline;
        polyline.show = new ConstantProperty(true);
        polyline.clampToGround = new ConstantProperty(true);

        var updater = new PolylineGeometryUpdater(entity, scene);
        expect(updater.clampToGround).toBe(false);

        var instance = updater.createFillGeometryInstance(time);
        expect(instance.geometry instanceof GroundPolylineGeometry).toBe(false);

        updater.destroy();
    });
}, 'WebGL');
