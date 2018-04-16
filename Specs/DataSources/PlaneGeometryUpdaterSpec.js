defineSuite([
        'DataSources/PlaneGeometryUpdater',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/JulianDate',
        'Core/Plane',
        'Core/TimeIntervalCollection',
        'DataSources/ConstantPositionProperty',
        'DataSources/ConstantProperty',
        'DataSources/Entity',
        'DataSources/PlaneGraphics',
        'Scene/PrimitiveCollection',
        'Specs/createDynamicGeometryUpdaterSpecs',
        'Specs/createDynamicProperty',
        'Specs/createGeometryUpdaterSpecs',
        'Specs/createScene'
    ], function(
        PlaneGeometryUpdater,
        Cartesian2,
        Cartesian3,
        JulianDate,
        Plane,
        TimeIntervalCollection,
        ConstantPositionProperty,
        ConstantProperty,
        Entity,
        PlaneGraphics,
        PrimitiveCollection,
        createDynamicGeometryUpdaterSpecs,
        createDynamicProperty,
        createGeometryUpdaterSpecs,
        createScene) {
    'use strict';

    var scene;

    beforeAll(function() {
        scene = createScene();
    });

    afterAll(function() {
        scene.destroyForSpecs();
    });

    function createBasicPlane() {
        var planeGraphics = new PlaneGraphics();
        planeGraphics.plane = new ConstantProperty(new Plane(Cartesian3.UNIT_X, 0.0));
        planeGraphics.dimensions = new ConstantProperty(new Cartesian2(1.0, 2.0));
        var entity = new Entity();
        entity.position = new ConstantPositionProperty(Cartesian3.fromDegrees(0, 0, 0));
        entity.plane = planeGraphics;
        return entity;
    }

    function createDynamicPlane() {
        var entity = createBasicPlane();
        entity.plane.plane = createDynamicProperty(new Plane(Cartesian3.UNIT_X, 0.0));
        entity.plane.dimensions = createDynamicProperty(new Cartesian2(1.0, 2.0));
        return entity;
    }

    it('A time-varying plane causes geometry to be dynamic', function() {
        var entity = createBasicPlane();
        var updater = new PlaneGeometryUpdater(entity, scene);
        entity.plane.plane = createDynamicProperty();
        updater._onEntityPropertyChanged(entity, 'plane');

        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying dimensions causes geometry to be dynamic', function() {
        var entity = createBasicPlane();
        var updater = new PlaneGeometryUpdater(entity, scene);
        entity.plane.dimensions = createDynamicProperty();
        updater._onEntityPropertyChanged(entity, 'plane');

        expect(updater.isDynamic).toBe(true);
    });

    it('dynamic updater sets properties', function() {
        var entity = createDynamicPlane();

        var updater = new PlaneGeometryUpdater(entity, scene);
        var dynamicUpdater = updater.createDynamicUpdater(new PrimitiveCollection(), new PrimitiveCollection());
        dynamicUpdater.update(JulianDate.now());

        var options = dynamicUpdater._options;
        expect(options.plane).toEqual(entity.plane.plane.getValue());
        expect(options.dimensions).toEqual(entity.plane.dimensions.getValue());
    });

    it('geometryChanged event is raised when expected', function() {
        var entity = createBasicPlane();
        var updater = new PlaneGeometryUpdater(entity, scene);
        var listener = jasmine.createSpy('listener');
        updater.geometryChanged.addEventListener(listener);

        entity.plane.dimensions = new ConstantProperty();
        updater._onEntityPropertyChanged(entity, 'plane');
        expect(listener.calls.count()).toEqual(1);

        entity.availability = new TimeIntervalCollection();
        updater._onEntityPropertyChanged(entity, 'availability');
        expect(listener.calls.count()).toEqual(2);

        entity.plane.dimensions = undefined;
        updater._onEntityPropertyChanged(entity, 'plane');
        expect(listener.calls.count()).toEqual(3);

        //Since there's no valid geometry, changing another property should not raise the event.
        entity.plane.height = undefined;
        updater._onEntityPropertyChanged(entity, 'plane');

        //Modifying an unrelated property should not have any effect.
        entity.viewFrom = new ConstantProperty(Cartesian3.UNIT_X);
        updater._onEntityPropertyChanged(entity, 'viewFrom');
        expect(listener.calls.count()).toEqual(3);
    });

    function getScene() {
        return scene;
    }
    createGeometryUpdaterSpecs(PlaneGeometryUpdater, 'plane', createBasicPlane, getScene);

    createDynamicGeometryUpdaterSpecs(PlaneGeometryUpdater, 'plane', createDynamicPlane, getScene);
}, 'WebGL');
