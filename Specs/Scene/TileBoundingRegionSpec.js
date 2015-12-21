/*global defineSuite*/
defineSuite([
        'Scene/TileBoundingRegion',
        'Core/Cartesian3',
        'Core/Color',
        'Core/Intersect',
        'Core/Math',
        'Core/Plane',
        'Core/Rectangle',
        'Scene/Cesium3DTile',
        'Specs/createScene'
    ], function(
        TileBoundingRegion,
        Cartesian3,
        Color,
        Intersect,
        CesiumMath,
        Plane,
        Rectangle,
        Cesium3DTile,
        createScene) {
    "use strict";

    var boundingVolumeRegion = [0.0, 0.0, 1.0, 1.0, 0, 1];
    var regionBox = boundingVolumeRegion.slice(0, 4);
    var rectangle = new Rectangle(regionBox[0], regionBox[1], regionBox[2], regionBox[3]);
    var tileBoundingRegion = new TileBoundingRegion({maximumHeight: boundingVolumeRegion[5], minimumHeight: boundingVolumeRegion[4], rectangle: rectangle});
    var scene = createScene();

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
        scene.frameState.camera.position = Cartesian3.fromRadians(regionBox[0] + CesiumMath.EPSILON6, regionBox[1], 0);
        expect(tileBoundingRegion.distanceToCamera(scene.frameState)).toEqual(0.0);
    });

    it('distance to camera is correct when camera is outside bounding region', function() {
        scene.frameState.camera.position = Cartesian3.fromRadians(regionBox[0], regionBox[1], 2.0);
        expect(tileBoundingRegion.distanceToCamera(scene.frameState)).toEqualEpsilon(1.0, CesiumMath.EPSILON6);
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
