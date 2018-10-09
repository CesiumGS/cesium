defineSuite([
        'DataSources/CylinderGeometryUpdater',
        'Core/Cartesian3',
        'Core/Color',
        'Core/GeometryOffsetAttribute',
        'Core/JulianDate',
        'Core/Quaternion',
        'Core/TimeIntervalCollection',
        'DataSources/ConstantPositionProperty',
        'DataSources/ConstantProperty',
        'DataSources/CylinderGraphics',
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
        CylinderGeometryUpdater,
        Cartesian3,
        Color,
        GeometryOffsetAttribute,
        JulianDate,
        Quaternion,
        TimeIntervalCollection,
        ConstantPositionProperty,
        ConstantProperty,
        CylinderGraphics,
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

    var scene;
    var time;

    beforeAll(function() {
        scene = createScene();
        time = JulianDate.now();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    function createBasicCylinder() {
        var cylinder = new CylinderGraphics();
        cylinder.length = new ConstantProperty(1000);
        cylinder.topRadius = new ConstantProperty(1000);
        cylinder.bottomRadius = new ConstantProperty(1000);

        var entity = new Entity();
        entity.position = new ConstantPositionProperty(Cartesian3.fromDegrees(0, 0, 0));
        entity.cylinder = cylinder;
        return entity;
    }

    function createDynamicCylinder() {
        var entity = createBasicCylinder();
        entity.cylinder.topRadius = createDynamicProperty(4);
        return entity;
    }

    it('No geometry available when topRadius is undefined', function() {
        var entity = createBasicCylinder();
        var updater = new CylinderGeometryUpdater(entity, scene);
        entity.cylinder.topRadius = undefined;
        updater._onEntityPropertyChanged(entity, 'cylinder');

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('No geometry available when bottomRadius is undefined', function() {
        var entity = createBasicCylinder();
        var updater = new CylinderGeometryUpdater(entity, scene);
        entity.cylinder.bottomRadius = undefined;
        updater._onEntityPropertyChanged(entity, 'cylinder');

        expect(updater.fillEnabled).toBe(false);
        expect(updater.outlineEnabled).toBe(false);
        expect(updater.isDynamic).toBe(false);
    });

    it('A time-varying position causes geometry to be dynamic', function() {
        var entity = createBasicCylinder();
        var updater = new CylinderGeometryUpdater(entity, scene);
        entity.position = new SampledPositionProperty();
        entity.position.addSample(time, Cartesian3.ZERO);
        updater._onEntityPropertyChanged(entity, 'position');

        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying bottomRadius causes geometry to be dynamic', function() {
        var entity = createBasicCylinder();
        var updater = new CylinderGeometryUpdater(entity, scene);
        entity.cylinder.bottomRadius = new SampledProperty(Number);
        entity.cylinder.bottomRadius.addSample(time, 1);
        updater._onEntityPropertyChanged(entity, 'cylinder');

        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying topRadius causes geometry to be dynamic', function() {
        var entity = createBasicCylinder();
        var updater = new CylinderGeometryUpdater(entity, scene);
        entity.cylinder.topRadius = new SampledProperty(Number);
        entity.cylinder.topRadius.addSample(time, 1);
        updater._onEntityPropertyChanged(entity, 'cylinder');

        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying length causes geometry to be dynamic', function() {
        var entity = createBasicCylinder();
        var updater = new CylinderGeometryUpdater(entity, scene);
        entity.cylinder.length = new SampledProperty(Number);
        entity.cylinder.length.addSample(time, 1);
        updater._onEntityPropertyChanged(entity, 'cylinder');

        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying numberOfVerticalLines causes geometry to be dynamic', function() {
        var entity = createBasicCylinder();
        var updater = new CylinderGeometryUpdater(entity, scene);
        entity.cylinder.numberOfVerticalLines = new SampledProperty(Number);
        entity.cylinder.numberOfVerticalLines.addSample(time, 1);
        updater._onEntityPropertyChanged(entity, 'cylinder');

        expect(updater.isDynamic).toBe(true);
    });

    it('Creates geometry with expected properties', function() {
        var options = {
            length : 1,
            topRadius : 3,
            bottomRadius : 2,
            numberOfVerticalLines : 15
        };
        var entity = new Entity();
        entity.position = new ConstantPositionProperty(new Cartesian3(4, 5, 6));
        entity.orientation = new ConstantProperty(Quaternion.IDENTITY);

        var cylinder = new CylinderGraphics();
        cylinder.outline = true;
        cylinder.numberOfVerticalLines = new ConstantProperty(options.numberOfVerticalLines);
        cylinder.length = new ConstantProperty(options.length);
        cylinder.topRadius = new ConstantProperty(options.topRadius);
        cylinder.bottomRadius = new ConstantProperty(options.bottomRadius);
        entity.cylinder = cylinder;

        var updater = new CylinderGeometryUpdater(entity, scene);

        var instance;
        var geometry;
        instance = updater.createFillGeometryInstance(time);
        geometry = instance.geometry;
        expect(geometry._topRadius).toEqual(options.topRadius);
        expect(geometry._bottomRadius).toEqual(options.bottomRadius);
        expect(geometry._length).toEqual(options.length);
        expect(geometry._offsetAttribute).toBeUndefined();

        instance = updater.createOutlineGeometryInstance(time);
        geometry = instance.geometry;
        expect(geometry._topRadius).toEqual(options.topRadius);
        expect(geometry._bottomRadius).toEqual(options.bottomRadius);
        expect(geometry._length).toEqual(options.length);
        expect(geometry._numberOfVerticalLines).toEqual(options.numberOfVerticalLines);
        expect(geometry._offsetAttribute).toBeUndefined();
    });

    it('Creates geometry with expected offsetAttribute', function() {
        var entity = createBasicCylinder();
        var graphics = entity.cylinder;
        graphics.outline = true;
        graphics.outlineColor = Color.BLACK;
        graphics.height = new ConstantProperty(20.0);
        graphics.extrudedHeight = new ConstantProperty(0.0);
        var updater = new CylinderGeometryUpdater(entity, getScene());

        var instance;

        updater._onEntityPropertyChanged(entity, 'cylinder');
        instance = updater.createFillGeometryInstance(time);
        expect(instance.geometry._offsetAttribute).toBeUndefined();
        instance = updater.createOutlineGeometryInstance(time);
        expect(instance.geometry._offsetAttribute).toBeUndefined();

        graphics.heightReference = new ConstantProperty(HeightReference.NONE);
        updater._onEntityPropertyChanged(entity, 'cylinder');
        instance = updater.createFillGeometryInstance(time);
        expect(instance.geometry._offsetAttribute).toBeUndefined();
        instance = updater.createOutlineGeometryInstance(time);
        expect(instance.geometry._offsetAttribute).toBeUndefined();

        graphics.heightReference = new ConstantProperty(HeightReference.CLAMP_TO_GROUND);
        updater._onEntityPropertyChanged(entity, 'cylinder');
        instance = updater.createFillGeometryInstance(time);
        expect(instance.geometry._offsetAttribute).toEqual(GeometryOffsetAttribute.ALL);
        instance = updater.createOutlineGeometryInstance(time);
        expect(instance.geometry._offsetAttribute).toEqual(GeometryOffsetAttribute.ALL);

        graphics.heightReference = new ConstantProperty(HeightReference.RELATIVE_TO_GROUND);
        updater._onEntityPropertyChanged(entity, 'cylinder');
        instance = updater.createFillGeometryInstance(time);
        expect(instance.geometry._offsetAttribute).toEqual(GeometryOffsetAttribute.ALL);
        instance = updater.createOutlineGeometryInstance(time);
        expect(instance.geometry._offsetAttribute).toEqual(GeometryOffsetAttribute.ALL);
    });

    it('dynamic updater sets properties', function() {
        var cylinder = new CylinderGraphics();
        cylinder.topRadius = createDynamicProperty(2);
        cylinder.bottomRadius = createDynamicProperty(1);
        cylinder.length = createDynamicProperty(3);

        var entity = new Entity();
        entity.position = createDynamicProperty(Cartesian3.UNIT_Z);
        entity.orientation = createDynamicProperty(Quaternion.IDENTITY);
        entity.cylinder = cylinder;

        var updater = new CylinderGeometryUpdater(entity, scene);
        var dynamicUpdater = updater.createDynamicUpdater(new PrimitiveCollection(), new PrimitiveCollection());
        dynamicUpdater.update(JulianDate.now());
        var options = dynamicUpdater._options;
        expect(options.topRadius).toEqual(cylinder.topRadius.getValue());
        expect(options.bottomRadius).toEqual(cylinder.bottomRadius.getValue());
        expect(options.length).toEqual(cylinder.length.getValue());
        expect(options.offsetAttribute).toBeUndefined();
    });

    it('geometryChanged event is raised when expected', function() {
        var entity = createBasicCylinder();
        var updater = new CylinderGeometryUpdater(entity, scene);
        var listener = jasmine.createSpy('listener');
        updater.geometryChanged.addEventListener(listener);

        entity.position = new ConstantPositionProperty(Cartesian3.UNIT_Z);
        updater._onEntityPropertyChanged(entity, 'position');
        expect(listener.calls.count()).toEqual(1);

        entity.cylinder.topRadius = new ConstantProperty(82);
        updater._onEntityPropertyChanged(entity, 'cylinder');
        expect(listener.calls.count()).toEqual(2);

        entity.availability = new TimeIntervalCollection();
        updater._onEntityPropertyChanged(entity, 'availability');
        expect(listener.calls.count()).toEqual(3);

        entity.cylinder.topRadius = undefined;
        updater._onEntityPropertyChanged(entity, 'cylinder');
        expect(listener.calls.count()).toEqual(4);

        //Since there's no valid geometry, changing another property should not raise the event.
        entity.cylinder.bottomRadius = undefined;
        updater._onEntityPropertyChanged(entity, 'cylinder');

        //Modifying an unrelated property should not have any effect.
        entity.viewFrom = new ConstantProperty(Cartesian3.UNIT_X);
        updater._onEntityPropertyChanged(entity, 'viewFrom');
        expect(listener.calls.count()).toEqual(4);

        entity.cylinder.topRadius = new SampledProperty(Number);
        entity.cylinder.bottomRadius = new SampledProperty(Number);
        updater._onEntityPropertyChanged(entity, 'cylinder');
        expect(listener.calls.count()).toEqual(5);
    });

    it('computes center', function() {
        var entity = createBasicCylinder();
        var updater = new CylinderGeometryUpdater(entity, scene);

        expect(updater._computeCenter(time)).toEqual(entity.position.getValue(time));
    });

    function getScene() {
        return scene;
    }

    createGeometryUpdaterSpecs(CylinderGeometryUpdater, 'cylinder', createBasicCylinder, getScene);

    createDynamicGeometryUpdaterSpecs(CylinderGeometryUpdater, 'cylinder', createDynamicCylinder, getScene);
}, 'WebGL');
