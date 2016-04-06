/*global defineSuite*/
defineSuite([
        'Scene/TileBoundingBox',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/Ellipsoid',
        'Core/Math',
        'Core/Rectangle',
        'Scene/SceneMode',
        'Specs/createFrameState'
    ], function(
        TileBoundingBox,
        Cartesian2,
        Cartesian3,
        Cartographic,
        Ellipsoid,
        CesiumMath,
        Rectangle,
        SceneMode,
        createFrameState) {
    'use strict';

    var frameState;
    var camera;

    beforeEach(function() {
        frameState = createFrameState();
        camera = frameState.camera;
    });

    it('throws when options.rectangle is undefined', function() {
        expect(function(){
            return new TileBoundingBox();
        }).toThrowDeveloperError();
    });

    it('distanceToCamera', function() {
        var offset = 0.0001;
        var west = -0.001;
        var south = -0.001;
        var east = 0.001;
        var north = 0.001;

        var tile = new TileBoundingBox({
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

        var tile = new TileBoundingBox({
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
});