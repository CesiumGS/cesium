import { ApproximateTerrainHeights } from '../../Source/Cesium.js';
import { ArcType } from '../../Source/Cesium.js';
import { Cartesian3 } from '../../Source/Cesium.js';
import { Color } from '../../Source/Cesium.js';
import { CoplanarPolygonGeometry } from '../../Source/Cesium.js';
import { CoplanarPolygonOutlineGeometry } from '../../Source/Cesium.js';
import { Ellipsoid } from '../../Source/Cesium.js';
import { JulianDate } from '../../Source/Cesium.js';
import { Math as CesiumMath } from '../../Source/Cesium.js';
import { PolygonGeometry } from '../../Source/Cesium.js';
import { PolygonHierarchy } from '../../Source/Cesium.js';
import { PolygonOutlineGeometry } from '../../Source/Cesium.js';
import { TimeIntervalCollection } from '../../Source/Cesium.js';
import { ConstantProperty } from '../../Source/Cesium.js';
import { Entity } from '../../Source/Cesium.js';
import { PolygonGeometryUpdater } from '../../Source/Cesium.js';
import { PolygonGraphics } from '../../Source/Cesium.js';
import { PropertyArray } from '../../Source/Cesium.js';
import { SampledPositionProperty } from '../../Source/Cesium.js';
import { SampledProperty } from '../../Source/Cesium.js';
import { GroundPrimitive } from '../../Source/Cesium.js';
import { HeightReference } from '../../Source/Cesium.js';
import { PrimitiveCollection } from '../../Source/Cesium.js';
import createDynamicGeometryUpdaterSpecs from '../createDynamicGeometryUpdaterSpecs.js';
import createDynamicProperty from '../createDynamicProperty.js';
import createGeometryUpdaterGroundGeometrySpecs from '../createGeometryUpdaterGroundGeometrySpecs.js';
import createGeometryUpdaterSpecs from '../createGeometryUpdaterSpecs.js';
import createScene from '../createScene.js';

describe('DataSources/PolygonGeometryUpdater', function() {

    var scene;
    var time;
    var groundPrimitiveSupported;

    beforeAll(function() {
        scene = createScene();
        time = JulianDate.now();
        groundPrimitiveSupported = GroundPrimitive.isSupported(scene);
        return ApproximateTerrainHeights.initialize();
    });

    afterAll(function() {
        scene.destroyForSpecs();

        ApproximateTerrainHeights._initPromise = undefined;
        ApproximateTerrainHeights._terrainHeights = undefined;
    });

    function createBasicPolygon() {
        var polygon = new PolygonGraphics();
        polygon.hierarchy = new ConstantProperty(new PolygonHierarchy(Cartesian3.fromRadiansArray([
            -1, -1,
            1, -1,
            1, 1,
            -1, 1
        ])));
        polygon.height = new ConstantProperty(0);
        var entity = new Entity();
        entity.polygon = polygon;
        return entity;
    }

    function createVerticalPolygon() {
        var polygon = new PolygonGraphics();
        polygon.hierarchy = new ConstantProperty(new PolygonHierarchy(Cartesian3.fromDegreesArrayHeights([
            -1.0, 1.0, 0.0,
            -2.0, 1.0, 0.0,
            -2.0, 1.0, 0.0
        ])));
        polygon.perPositionHeight = true;
        var entity = new Entity();
        entity.polygon = polygon;
        return entity;
    }

    function createDynamicPolygon() {
        var entity = createBasicPolygon();
        entity.polygon.extrudedHeight = createDynamicProperty(2);
        return entity;
    }

    function createBasicPolygonWithoutHeight() {
        var polygon = new PolygonGraphics();
        polygon.hierarchy = new ConstantProperty(new PolygonHierarchy(Cartesian3.fromRadiansArray([
            0, 0,
            1, 0,
            1, 1,
            0, 1
        ])));
        var entity = new Entity();
        entity.polygon = polygon;
        return entity;
    }

    function createDynamicPolygonWithoutHeight() {
        var entity = createBasicPolygonWithoutHeight();
        entity.polygon.granularity = createDynamicProperty(1);
        return entity;
    }

    it('Properly computes isClosed', function() {
        var entity = createBasicPolygon();
        entity.polygon.perPositionHeight = true;
        var updater = new PolygonGeometryUpdater(entity, scene);
        expect(updater.isClosed).toBe(false); //open because of perPositionHeights

        entity.polygon.perPositionHeight = false;
        updater._onEntityPropertyChanged(entity, 'polygon');
        expect(updater.isClosed).toBe(true); //close because polygon is on the ground

        entity.polygon.height = 1000;
        updater._onEntityPropertyChanged(entity, 'polygon');
        expect(updater.isClosed).toBe(false); //open because polygon is at a height

        entity.polygon.extrudedHeight = 1000;
        updater._onEntityPropertyChanged(entity, 'polygon');
        expect(updater.isClosed).toBe(false); //open because height === extrudedHeight so it's not extruded

        entity.polygon.extrudedHeight = 100;
        updater._onEntityPropertyChanged(entity, 'polygon');
        expect(updater.isClosed).toBe(true); //closed because polygon is extruded

        entity.polygon.closeTop = false;
        updater._onEntityPropertyChanged(entity, 'polygon');
        expect(updater.isClosed).toBe(false); //open because top cap isn't included

        entity.polygon.closeTop = true;
        entity.polygon.closeBottom = false;
        updater._onEntityPropertyChanged(entity, 'polygon');
        expect(updater.isClosed).toBe(false); //open because bottom cap isn't included
    });

    it('A time-varying positions causes geometry to be dynamic', function() {
        var entity = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(entity, scene);
        var point1 = new SampledPositionProperty();
        point1.addSample(time, new Cartesian3());
        var point2 = new SampledPositionProperty();
        point2.addSample(time, new Cartesian3());
        var point3 = new SampledPositionProperty();
        point3.addSample(time, new Cartesian3());

        entity.polygon.hierarchy = new PropertyArray();
        entity.polygon.hierarchy.setValue([point1, point2, point3]);
        updater._onEntityPropertyChanged(entity, 'polygon');

        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying height causes geometry to be dynamic', function() {
        var entity = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(entity, scene);
        entity.polygon.height = new SampledProperty(Number);
        entity.polygon.height.addSample(time, 1);
        updater._onEntityPropertyChanged(entity, 'polygon');

        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying extrudedHeight causes geometry to be dynamic', function() {
        var entity = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(entity, scene);
        entity.polygon.extrudedHeight = new SampledProperty(Number);
        entity.polygon.extrudedHeight.addSample(time, 1);
        updater._onEntityPropertyChanged(entity, 'polygon');

        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying granularity causes geometry to be dynamic', function() {
        var entity = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(entity, scene);
        entity.polygon.granularity = new SampledProperty(Number);
        entity.polygon.granularity.addSample(time, 1);
        updater._onEntityPropertyChanged(entity, 'polygon');

        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying stRotation causes geometry to be dynamic', function() {
        var entity = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(entity, scene);
        entity.polygon.stRotation = new SampledProperty(Number);
        entity.polygon.stRotation.addSample(time, 1);
        updater._onEntityPropertyChanged(entity, 'polygon');

        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying perPositionHeight causes geometry to be dynamic', function() {
        var entity = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(entity, scene);
        entity.polygon.perPositionHeight = new SampledProperty(Number);
        entity.polygon.perPositionHeight.addSample(time, 1);
        updater._onEntityPropertyChanged(entity, 'polygon');

        expect(updater.isDynamic).toBe(true);
    });

    it('A time-varying arcType causes geometry to be dynamic', function() {
        var entity = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(entity, scene);
        entity.polygon.arcType = new SampledProperty(Number);
        entity.polygon.arcType.addSample(time, 1);
        updater._onEntityPropertyChanged(entity, 'polygon');

        expect(updater.isDynamic).toBe(true);
    });

    it('Creates geometry with expected properties', function() {
        var options = {
            height : 431,
            extrudedHeight : 123,
            granularity : 0.97,
            stRotation : 12,
            perPositionHeight : false,
            closeTop : true,
            closeBottom : false,
            arcType : ArcType.GEODESIC
        };

        var entity = createBasicPolygon();

        var polygon = entity.polygon;
        polygon.outline = true;
        polygon.perPositionHeight = new ConstantProperty(options.perPositionHeight);
        polygon.closeTop = new ConstantProperty(options.closeTop);
        polygon.closeBottom = new ConstantProperty(options.closeBottom);
        polygon.stRotation = new ConstantProperty(options.stRotation);
        polygon.height = new ConstantProperty(options.height);
        polygon.extrudedHeight = new ConstantProperty(options.extrudedHeight);
        polygon.granularity = new ConstantProperty(options.granularity);
        polygon.arcType = new ConstantProperty(options.arcType);

        var updater = new PolygonGeometryUpdater(entity, scene);

        var instance;
        var geometry;
        instance = updater.createFillGeometryInstance(time);
        geometry = instance.geometry;
        expect(geometry).toBeInstanceOf(PolygonGeometry);
        expect(geometry._stRotation).toEqual(options.stRotation);
        expect(geometry._height).toEqual(options.height);
        expect(geometry._granularity).toEqual(options.granularity);
        expect(geometry._extrudedHeight).toEqual(options.extrudedHeight);
        expect(geometry._closeTop).toEqual(options.closeTop);
        expect(geometry._closeBottom).toEqual(options.closeBottom);
        expect(geometry._arcType).toEqual(options.arcType);
        expect(geometry._offsetAttribute).toBeUndefined();

        instance = updater.createOutlineGeometryInstance(time);
        geometry = instance.geometry;
        expect(geometry).toBeInstanceOf(PolygonOutlineGeometry);
        expect(geometry._height).toEqual(options.height);
        expect(geometry._granularity).toEqual(options.granularity);
        expect(geometry._extrudedHeight).toEqual(options.extrudedHeight);
        expect(geometry._perPositionHeight).toEqual(options.perPositionHeight);
        expect(geometry._offsetAttribute).toBeUndefined();
    });

    it('Creates coplanar polygon', function() {
        var stRotation = 12;

        var entity = createVerticalPolygon();

        var polygon = entity.polygon;
        polygon.outline = true;
        polygon.stRotation = new ConstantProperty(stRotation);

        var updater = new PolygonGeometryUpdater(entity, scene);

        var instance;
        var geometry;
        instance = updater.createFillGeometryInstance(time);
        geometry = instance.geometry;
        expect(geometry).toBeInstanceOf(CoplanarPolygonGeometry);
        expect(geometry._stRotation).toEqual(stRotation);

        instance = updater.createOutlineGeometryInstance(time);
        geometry = instance.geometry;
        expect(geometry).toBeInstanceOf(CoplanarPolygonOutlineGeometry);
    });

    it('Checks that a polygon with per position heights isn\'t on terrain', function() {
        var entity = createBasicPolygon();
        entity.polygon.height = undefined;
        entity.polygon.perPositionHeight = new ConstantProperty(true);

        var updater = new PolygonGeometryUpdater(entity, scene);

        expect(updater.onTerrain).toBe(false);
    });

    it('Checks that a polygon without per position heights is on terrain', function() {
        var entity = createBasicPolygon();
        entity.polygon.height = undefined;
        entity.polygon.perPositionHeight = new ConstantProperty(false);

        var updater = new PolygonGeometryUpdater(entity, scene);

        if (groundPrimitiveSupported) {
            expect(updater.onTerrain).toBe(true);
        } else {
            expect(updater.onTerrain).toBe(false);
        }
    });

    it('Checks that a polygon without per position heights does not use a height reference', function() {
        var entity = createBasicPolygon();
        var graphics = entity.polygon;
        graphics.perPositionHeight = new ConstantProperty(true);
        graphics.outline = true;
        graphics.outlineColor = Color.BLACK;
        graphics.height = undefined;
        graphics.extrudedHeight = undefined;
        var updater = new PolygonGeometryUpdater(entity, scene);

        var instance;

        graphics.heightReference = new ConstantProperty(HeightReference.RELATIVE_TO_GROUND);
        graphics.extrudedHeightReference = new ConstantProperty(HeightReference.RELATIVE_TO_GROUND);
        updater._onEntityPropertyChanged(entity, 'polygon');
        instance = updater.createFillGeometryInstance(time);
        expect(instance.geometry._offsetAttribute).toBeUndefined();
        instance = updater.createOutlineGeometryInstance(time);
        expect(instance.geometry._offsetAttribute).toBeUndefined();
    });

    it('dynamic updater sets properties', function() {
        var polygon = new PolygonGraphics();
        polygon.hierarchy = createDynamicProperty(new PolygonHierarchy(Cartesian3.fromRadiansArray([
            0, 0,
            1, 0,
            1, 1,
            0, 1
        ])));
        polygon.height = createDynamicProperty(3);
        polygon.extrudedHeight = createDynamicProperty(2);
        polygon.perPositionHeight = createDynamicProperty(false);
        polygon.granularity = createDynamicProperty(2);
        polygon.stRotation = createDynamicProperty(1);
        polygon.closeTop = createDynamicProperty(false);
        polygon.closeBottom = createDynamicProperty(false);
        polygon.arcType = createDynamicProperty(ArcType.RHUMB);

        var entity = new Entity();
        entity.polygon = polygon;

        var updater = new PolygonGeometryUpdater(entity, scene);
        var dynamicUpdater = updater.createDynamicUpdater(new PrimitiveCollection(), new PrimitiveCollection());
        dynamicUpdater.update(time);

        var options = dynamicUpdater._options;
        expect(options.id).toEqual(entity);
        expect(options.polygonHierarchy).toEqual(polygon.hierarchy.getValue());
        expect(options.height).toEqual(polygon.height.getValue());
        expect(options.extrudedHeight).toEqual(polygon.extrudedHeight.getValue());
        expect(options.perPositionHeight).toEqual(polygon.perPositionHeight.getValue());
        expect(options.granularity).toEqual(polygon.granularity.getValue());
        expect(options.stRotation).toEqual(polygon.stRotation.getValue());
        expect(options.closeTop).toEqual(polygon.closeTop.getValue());
        expect(options.closeBottom).toEqual(polygon.closeBottom.getValue());
        expect(options.arcType).toEqual(polygon.arcType.getValue());
        expect(options.offsetAttribute).toBeUndefined();
    });

    it('geometryChanged event is raised when expected', function() {
        var entity = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(entity, scene);
        var listener = jasmine.createSpy('listener');
        updater.geometryChanged.addEventListener(listener);

        entity.polygon.hierarchy = new ConstantProperty([]);
        updater._onEntityPropertyChanged(entity, 'polygon');
        expect(listener.calls.count()).toEqual(1);

        entity.polygon.height = new ConstantProperty(82);
        updater._onEntityPropertyChanged(entity, 'polygon');
        expect(listener.calls.count()).toEqual(2);

        entity.availability = new TimeIntervalCollection();
        updater._onEntityPropertyChanged(entity, 'availability');
        expect(listener.calls.count()).toEqual(3);

        entity.polygon.hierarchy = undefined;
        updater._onEntityPropertyChanged(entity, 'polygon');
        expect(listener.calls.count()).toEqual(4);

        //Since there's no valid geometry, changing another property should not raise the event.
        entity.polygon.height = undefined;
        updater._onEntityPropertyChanged(entity, 'polygon');

        //Modifying an unrelated property should not have any effect.
        entity.viewFrom = new ConstantProperty(Cartesian3.UNIT_X);
        updater._onEntityPropertyChanged(entity, 'viewFrom');
        expect(listener.calls.count()).toEqual(4);
    });

    it('perPositionHeight is true sets onTerrain to false', function() {
        var entity = createBasicPolygonWithoutHeight();
        entity.polygon.fill = true;
        entity.polygon.perPositionHeight = true;
        var updater = new PolygonGeometryUpdater(entity, scene);
        expect(updater.onTerrain).toBe(false);
    });

    it('computes center', function() {
        var entity = createBasicPolygon();
        var updater = new PolygonGeometryUpdater(entity, scene);
        var result = updater._computeCenter(time);
        result = Ellipsoid.WGS84.scaleToGeodeticSurface(result, result);
        expect(result).toEqualEpsilon(Cartesian3.fromDegrees(0.0, 0.0), CesiumMath.EPSILON10);
    });

    function getScene() {
        return scene;
    }

    createGeometryUpdaterSpecs(PolygonGeometryUpdater, 'polygon', createBasicPolygon, getScene);

    createDynamicGeometryUpdaterSpecs(PolygonGeometryUpdater, 'polygon', createDynamicPolygon, getScene);

    createGeometryUpdaterGroundGeometrySpecs(PolygonGeometryUpdater, 'polygon', createBasicPolygonWithoutHeight, createDynamicPolygonWithoutHeight, getScene);
}, 'WebGL');
