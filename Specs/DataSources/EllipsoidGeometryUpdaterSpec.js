defineSuite([
        'DataSources/EllipsoidGeometryUpdater',
        'Core/Cartesian3',
        'Core/Color',
        'Core/ColorGeometryInstanceAttribute',
        'Core/GeometryOffsetAttribute',
        'Core/JulianDate',
        'Core/Math',
        'Core/Quaternion',
        'Core/TimeIntervalCollection',
        'DataSources/ColorMaterialProperty',
        'DataSources/ConstantPositionProperty',
        'DataSources/ConstantProperty',
        'DataSources/EllipsoidGraphics',
        'DataSources/Entity',
        'DataSources/SampledPositionProperty',
        'DataSources/SampledProperty',
        'Scene/HeightReference',
        'Scene/PrimitiveCollection',
        'Specs/createDynamicGeometryUpdaterSpecs',
        'Specs/createDynamicProperty',
        'Specs/createGeometryUpdaterSpecs',
        'Specs/createScene'
    ], function(
        EllipsoidGeometryUpdater,
        Cartesian3,
        Color,
        ColorGeometryInstanceAttribute,
        GeometryOffsetAttribute,
        JulianDate,
        CesiumMath,
        Quaternion,
        TimeIntervalCollection,
        ColorMaterialProperty,
        ConstantPositionProperty,
        ConstantProperty,
        EllipsoidGraphics,
        Entity,
        SampledPositionProperty,
        SampledProperty,
        HeightReference,
        PrimitiveCollection,
        createDynamicGeometryUpdaterSpecs,
        createDynamicProperty,
        createGeometryUpdaterSpecs,
        createScene) {
    'use strict';

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

    function createDynamicEllipsoid() {
        var entity = createBasicEllipsoid();
        entity.ellipsoid.radii = createDynamicProperty(new Cartesian3(1, 2, 3));
        return entity;
    }

    it('No geometry available when radii is undefined', function() {
        var entity = createBasicEllipsoid();
        var updater = new EllipsoidGeometryUpdater(entity, scene);
        entity.ellipsoid.radii = undefined;
        updater._onEntityPropertyChanged(entity, 'ellipsoid');

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('A time-varying position causes geometry to be dynamic', function() {
        var entity = createBasicEllipsoid();
        var updater = new EllipsoidGeometryUpdater(entity, scene);
        entity.position = new SampledPositionProperty();
        entity.position.addSample(time, Cartesian3.ZERO);
        updater._onEntityPropertyChanged(entity, 'position');

        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying radii causes geometry to be dynamic', function() {
        var entity = createBasicEllipsoid();
        var updater = new EllipsoidGeometryUpdater(entity, scene);
        entity.ellipsoid.radii = new SampledProperty(Cartesian3);
        entity.ellipsoid.radii.addSample(time, new Cartesian3(1, 2, 3));
        updater._onEntityPropertyChanged(entity, 'ellipsoid');

        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying stackPartitions causes geometry to be dynamic', function() {
        var entity = createBasicEllipsoid();
        var updater = new EllipsoidGeometryUpdater(entity, scene);
        entity.ellipsoid.stackPartitions = new SampledProperty(Number);
        entity.ellipsoid.stackPartitions.addSample(time, 1);
        updater._onEntityPropertyChanged(entity, 'ellipsoid');

        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying slicePartitions causes geometry to be dynamic', function() {
        var entity = createBasicEllipsoid();
        var updater = new EllipsoidGeometryUpdater(entity, scene);
        entity.ellipsoid.slicePartitions = new SampledProperty(Number);
        entity.ellipsoid.slicePartitions.addSample(time, 1);
        updater._onEntityPropertyChanged(entity, 'ellipsoid');

        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying subdivisions causes geometry to be dynamic', function() {
        var entity = createBasicEllipsoid();
        var updater = new EllipsoidGeometryUpdater(entity, scene);
        entity.ellipsoid.subdivisions = new SampledProperty(Number);
        entity.ellipsoid.subdivisions.addSample(time, 1);
        updater._onEntityPropertyChanged(entity, 'ellipsoid');

        expect(updater.isDynamic).toBe(true);
    });

    it('Creates geometry with expected properties', function() {
        var options = {
            radii : new Cartesian3(1, 2, 3),
            stackPartitions : 32,
            slicePartitions : 64,
            subdivisions : 15
        };

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(new Cartesian3(4, 5, 6));
        entity.orientation = new ConstantProperty(Quaternion.IDENTITY);

        var ellipsoid = new EllipsoidGraphics();
        ellipsoid.outline = true;
        ellipsoid.radii = new ConstantProperty(options.radii);
        ellipsoid.stackPartitions = new ConstantProperty(options.stackPartitions);
        ellipsoid.slicePartitions = new ConstantProperty(options.slicePartitions);
        ellipsoid.subdivisions = new ConstantProperty(options.subdivisions);
        entity.ellipsoid = ellipsoid;

        var updater = new EllipsoidGeometryUpdater(entity, scene);

        var instance;
        var geometry;
        instance = updater.createFillGeometryInstance(time);
        geometry = instance.geometry;
        expect(geometry._center).toEqual(options.center);
        expect(geometry._radii).toEqual(options.radii);
        expect(geometry._stackPartitions).toEqual(options.stackPartitions);
        expect(geometry._slicePartitions).toEqual(options.slicePartitions);
        expect(geometry._offsetAttribute).toBeUndefined();

        instance = updater.createOutlineGeometryInstance(time);
        geometry = instance.geometry;
        expect(geometry._center).toEqual(options.center);
        expect(geometry._radii).toEqual(options.radii);
        expect(geometry._stackPartitions).toEqual(options.stackPartitions);
        expect(geometry._slicePartitions).toEqual(options.slicePartitions);
        expect(geometry._subdivisions).toEqual(options.subdivisions);
        expect(geometry._offsetAttribute).toBeUndefined();
    });

    it('Creates geometry with expected offsetAttribute', function() {
        var entity = createBasicEllipsoid();
        var graphics = entity.ellipsoid;
        graphics.outline = true;
        graphics.outlineColor = Color.BLACK;
        graphics.height = new ConstantProperty(20.0);
        graphics.extrudedHeight = new ConstantProperty(0.0);
        var updater = new EllipsoidGeometryUpdater(entity, getScene());

        var instance;

        updater._onEntityPropertyChanged(entity, 'ellipsoid');
        instance = updater.createFillGeometryInstance(time);
        expect(instance.geometry._offsetAttribute).toBeUndefined();
        instance = updater.createOutlineGeometryInstance(time);
        expect(instance.geometry._offsetAttribute).toBeUndefined();

        graphics.heightReference = new ConstantProperty(HeightReference.NONE);
        updater._onEntityPropertyChanged(entity, 'ellipsoid');
        instance = updater.createFillGeometryInstance(time);
        expect(instance.geometry._offsetAttribute).toBeUndefined();
        instance = updater.createOutlineGeometryInstance(time);
        expect(instance.geometry._offsetAttribute).toBeUndefined();

        graphics.heightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);
        updater._onEntityPropertyChanged(entity, 'ellipsoid');
        instance = updater.createFillGeometryInstance(time);
        expect(instance.geometry._offsetAttribute).toEqual(GeometryOffsetAttribute.ALL);
        instance = updater.createOutlineGeometryInstance(time);
        expect(instance.geometry._offsetAttribute).toEqual(GeometryOffsetAttribute.ALL);

        graphics.heightReference = new ConstantProperty(HeightReference.RELATIVE_TO_GROUND);
        updater._onEntityPropertyChanged(entity, 'ellipsoid');
        instance = updater.createFillGeometryInstance(time);
        expect(instance.geometry._offsetAttribute).toEqual(GeometryOffsetAttribute.ALL);
        instance = updater.createOutlineGeometryInstance(time);
        expect(instance.geometry._offsetAttribute).toEqual(GeometryOffsetAttribute.ALL);
    });

    it('computes center', function() {
        var entity = createBasicEllipsoid();
        var updater = new EllipsoidGeometryUpdater(entity, scene);

        expect(updater._computeCenter(time)).toEqual(entity.position.getValue(time));
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

        var dynamicUpdater = updater.createDynamicUpdater(primitives, new PrimitiveCollection());
        expect(dynamicUpdater.isDestroyed()).toBe(false);
        expect(primitives.length).toBe(0);

        dynamicUpdater.update(time);
        expect(primitives.length).toBe(2); //Ellipsoid always has both fill and outline primitives regardless of setting
        expect(primitives.get(0).show).toBe(true);
        expect(primitives.get(1).show).toBe(true);

        ellipsoid.show.setValue(false);
        updater._onEntityPropertyChanged(entity, 'ellipsoid');
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

        var dynamicUpdater = updater.createDynamicUpdater(primitives, new PrimitiveCollection());
        dynamicUpdater.update(time);
        expect(primitives.length).toBe(2); //Ellipsoid always has both fill and outline primitives regardless of setting

        scene.initializeFrame();
        scene.render();

        //no position
        entity.position.setValue(undefined);
        updater._onEntityPropertyChanged(entity, 'position');
        dynamicUpdater.update(time);
        expect(primitives.get(0).show).toBe(false);
        expect(primitives.get(1).show).toBe(false);
        expect(primitives.length).toBe(2);

        //no radii
        entity.position.setValue(Cartesian3.fromDegrees(0, 0, 0));
        updater._onEntityPropertyChanged(entity, 'position');
        ellipsoid.radii.setValue(undefined);
        updater._onEntityPropertyChanged(entity, 'ellipsoid');
        dynamicUpdater.update(time);
        expect(primitives.get(0).show).toBe(false);
        expect(primitives.get(1).show).toBe(false);
        expect(primitives.length).toBe(2);

        //everything valid again
        ellipsoid.radii.setValue(new Cartesian3(1, 2, 3));
        updater._onEntityPropertyChanged(entity, 'ellipsoid');
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

        var dynamicUpdater = updater.createDynamicUpdater(primitives, new PrimitiveCollection());
        dynamicUpdater.update(time);
        expect(primitives.length).toBe(2); //Ellipsoid always has both fill and outline primitives regardless of setting

        scene.initializeFrame();
        scene.render();

        ellipsoid.fill.setValue(false);
        ellipsoid.outline.setValue(false);
        ellipsoid.outlineColor = createDynamicProperty(Color.YELLOW);
        ellipsoid.material = new ColorMaterialProperty(Color.ORANGE);
        updater._onEntityPropertyChanged(entity, 'ellipsoid');
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
        updater._onEntityPropertyChanged(entity, 'position');
        expect(listener.calls.count()).toEqual(1);

        entity.ellipsoid.radii = new ConstantProperty(new Cartesian3(1, 2, 3));
        updater._onEntityPropertyChanged(entity, 'ellipsoid');
        expect(listener.calls.count()).toEqual(2);

        entity.availability = new TimeIntervalCollection();
        updater._onEntityPropertyChanged(entity, 'availability');
        expect(listener.calls.count()).toEqual(3);

        entity.ellipsoid.radii = undefined;
        updater._onEntityPropertyChanged(entity, 'ellipsoid');
        expect(listener.calls.count()).toEqual(4);

        //Modifying an unrelated property should not have any effect.
        entity.viewFrom = new ConstantProperty(Cartesian3.UNIT_X);
        updater._onEntityPropertyChanged(entity, 'viewFrom');
        expect(listener.calls.count()).toEqual(4);

        entity.ellipsoid.radii = new SampledProperty(Cartesian3);
        updater._onEntityPropertyChanged(entity, 'ellipsoid');
        expect(listener.calls.count()).toEqual(5);
    });

    function getScene() {
        return scene;
    }

    createGeometryUpdaterSpecs(EllipsoidGeometryUpdater, 'ellipsoid', createBasicEllipsoid, getScene);

    createDynamicGeometryUpdaterSpecs(EllipsoidGeometryUpdater, 'ellipsoid', createDynamicEllipsoid, getScene);
}, 'WebGL');
