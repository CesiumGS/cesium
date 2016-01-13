/*global defineSuite*/
defineSuite([
        'Scene/TileBoundingRegion',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/Color',
        'Core/Ellipsoid',
        'Core/Intersect',
        'Core/Math',
        'Core/Plane',
        'Core/Rectangle',
        'Scene/Cesium3DTile',
        'Scene/SceneMode',
        'Specs/createFrameState',
        'Specs/createScene'
    ], function(
        TileBoundingRegion,
        Cartesian2,
        Cartesian3,
        Cartographic,
        Color,
        Ellipsoid,
        Intersect,
        CesiumMath,
        Plane,
        Rectangle,
        Cesium3DTile,
        SceneMode,
        createFrameState,
        createScene) {
    "use strict";

    var boundingVolumeRegion = [0.0, 0.0, 1.0, 1.0, 0, 1];
    var regionBox = boundingVolumeRegion.slice(0, 4);
    var rectangle = new Rectangle(regionBox[0], regionBox[1], regionBox[2], regionBox[3]);
    var tileBoundingRegion = new TileBoundingRegion({maximumHeight: boundingVolumeRegion[5], minimumHeight: boundingVolumeRegion[4], rectangle: rectangle});

    var frameState;
    var camera;

    beforeEach(function() {
        frameState = createFrameState();
        camera = frameState.camera;
    });

    it('throws when options.rectangle is undefined', function() {
        expect(function() {
            return new TileBoundingRegion();
        }).toThrowDeveloperError();
    });

    it('distanceToCamera', function() {
        var offset = 0.0001;
        var west = -0.001;
        var south = -0.001;
        var east = 0.001;
        var north = 0.001;

        var tile = new TileBoundingRegion({
            rectangle : new Rectangle(west, south, east, north),
            minimumHeight : 0.0,
            maximumHeight : 10.0
        });

        // Inside rectangle, above height
        camera.position = Cartesian3.fromRadians(0.0, 0.0, 20.0);
        expect(tile.distanceToCamera(frameState)).toEqualEpsilon(10.0, CesiumMath.EPSILON3);

        // Inside rectangle, below height
        camera.position = Cartesian3.fromRadians(0.0, 0.0, 5.0);
        expect(tile.distanceToCamera(frameState)).toEqual(0.0);

        // From southwest
        camera.position = Cartesian3.fromRadians(west - offset, south - offset, 0.0);
        var southwestPosition = Cartesian3.fromRadians(west, south);
        var expectedDistance = Cartesian3.distance(camera.position, southwestPosition);
        expect(tile.distanceToCamera(frameState)).toEqualEpsilon(expectedDistance, CesiumMath.EPSILON1);

        // From northeast
        camera.position = Cartesian3.fromRadians(east + offset, north + offset, 0.0);
        var northeastPosition = Cartesian3.fromRadians(east, north);
        expectedDistance = Cartesian3.distance(camera.position, northeastPosition);
        expect(tile.distanceToCamera(frameState)).toEqualEpsilon(expectedDistance, CesiumMath.EPSILON1);
    });

    it('distanceToCamera in 2D', function() {
        frameState.mode = SceneMode.SCENE2D;

        var offset = 0.0001;
        var west = -0.001;
        var south = -0.001;
        var east = 0.001;
        var north = 0.001;

        var tile = new TileBoundingRegion({
            rectangle : new Rectangle(west, south, east, north),
            minimumHeight : 0.0,
            maximumHeight : 10.0
        });

        // Inside rectangle
        camera.position = Cartesian3.fromRadians(0.0, 0.0, 0.0);
        expect(tile.distanceToCamera(frameState)).toEqual(Ellipsoid.WGS84.radii.x);

        // From southwest
        var southwest3D = new Cartographic(west, south, 0.0);
        var southwest2D = frameState.mapProjection.project(southwest3D);
        var position3D = new Cartographic(west - offset, south - offset, 0.0);
        var position2D = frameState.mapProjection.project(position3D);
        var distance2D = Cartesian2.distance(southwest2D, position2D);
        var height = Ellipsoid.WGS84.radii.x;
        var expectedDistance = Math.sqrt(distance2D * distance2D + height * height);

        camera.position = Cartesian3.fromRadians(position3D.longitude, position3D.latitude);
        expect(tile.distanceToCamera(frameState)).toEqualEpsilon(expectedDistance, 10.0);
    });

    it('can be instantiated with rectangle and heights', function() {
        var minimumHeight = boundingVolumeRegion[4];
        var maximumHeight = boundingVolumeRegion[5];
        var tbr = new TileBoundingRegion({maximumHeight: maximumHeight, minimumHeight: minimumHeight, rectangle: rectangle});
        expect(tbr).toBeDefined();
        expect(tbr.boundingVolume).toBeDefined();
        expect(tbr.rectangle).toEqual(rectangle);
        expect(tbr.minimumHeight).toEqual(minimumHeight);
        expect(tbr.maximumHeight).toEqual(maximumHeight);
    });

    it('can be instantiated with only a rectangle', function() {
        var tbr = new TileBoundingRegion({rectangle: rectangle});
        expect(tbr).toBeDefined();
        expect(tbr.boundingVolume).toBeDefined();
        expect(tbr.rectangle).toEqual(rectangle);
        expect(tbr.minimumHeight).toBeDefined();
        expect(tbr.maximumHeight).toBeDefined();
    });

    it('can create a debug volume', function() {
        var debugVolume = tileBoundingRegion.createDebugVolume(Color.BLUE);
        expect(debugVolume).toBeDefined();
    });

    it('distance to camera is 0 when camera is inside bounding region', function() {
        camera.position = Cartesian3.fromRadians(regionBox[0] + CesiumMath.EPSILON6, regionBox[1], 0);
        expect(tileBoundingRegion.distanceToCamera(frameState)).toEqual(0.0);
    });

    it('distance to camera is correct when camera is outside bounding region', function() {
        camera.position = Cartesian3.fromRadians(regionBox[0], regionBox[1], 2.0);
        expect(tileBoundingRegion.distanceToCamera(frameState)).toEqualEpsilon(1.0, CesiumMath.EPSILON6);
    });

    it('intersects plane', function() {
        var normal = new Cartesian3();
        Cartesian3.normalize(Cartesian3.fromRadians(0.0, 0.0, 1.0), normal);
        var distanceFromCenter = Cartesian3.distance(
            new Cartesian3(0.0, 0.0, 0.0),
            Cartesian3.fromRadians(0.0, 0.0, 0.0)
        );
        var plane = new Plane(normal, -distanceFromCenter);
        expect(tileBoundingRegion.intersectPlane(plane)).toEqual(Intersect.INTERSECTING);
    });

});
