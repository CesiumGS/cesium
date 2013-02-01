/*global defineSuite*/
defineSuite([
         'Core/EllipsoidalOccluder',
         'Core/Occluder',
         'Core/Cartesian3',
         'Core/BoundingSphere',
         'Core/Visibility',
         'Core/Math',
         'Core/Ellipsoid',
         'Core/Extent'
     ], function(
         EllipsoidalOccluder,
         Occluder,
         Cartesian3,
         BoundingSphere,
         Visibility,
         CesiumMath,
         Ellipsoid,
         Extent) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('uses ellipsoid', function() {
        var ellipsoid = new Ellipsoid(2.0, 3.0, 4.0);
        var occluder = new EllipsoidalOccluder(ellipsoid);
        expect(occluder.getEllipsoid()).toEqual(ellipsoid);
    });

    it('throws if ellipsoid is not provided to constructor', function() {
        function createOccluderWithoutEllipsoid() {
            return new EllipsoidalOccluder(undefined, new Cartesian3(1.0, 2.0, 3.0));
        }
        expect(createOccluderWithoutEllipsoid).toThrow();
    });

    it('isPointVisible example works as claimed', function() {
        var cameraPosition = new Cartesian3(0, 0, 2.5);
        var ellipsoid = new Ellipsoid(1.0, 1.1, 0.9);
        var occluder = new EllipsoidalOccluder(ellipsoid, cameraPosition);
        var point = new Cartesian3(0, -3, -3);
        expect(occluder.isPointVisible(point)).toEqual(true);
    });

    it('isScaledSpacePointVisible example works as claimed', function() {
        var cameraPosition = new Cartesian3(0, 0, 2.5);
        var ellipsoid = new Ellipsoid(1.0, 1.1, 0.9);
        var occluder = new EllipsoidalOccluder(ellipsoid, cameraPosition);
        var point = new Cartesian3(0, -3, -3);
        var scaledSpacePoint = ellipsoid.transformPositionToScaledSpace(point);
        expect(occluder.isScaledSpacePointVisible(scaledSpacePoint)).toEqual(true);
    });

    it('reports not visible when point is directly behind ellipsoid', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var occluder = new EllipsoidalOccluder(ellipsoid);
        occluder.setCameraPosition(new Cartesian3(7000000.0, 0.0, 0.0));

        var point = new Cartesian3(-7000000, 0.0, 0.0);
        expect(occluder.isPointVisible(point)).toEqual(false);
    });

    it('reports visible when point is in front of ellipsoid', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var occluder = new EllipsoidalOccluder(ellipsoid);
        occluder.setCameraPosition(new Cartesian3(7000000.0, 0.0, 0.0));

        var point = new Cartesian3(6900000.0, 0.0, 0.0);
        expect(occluder.isPointVisible(point)).toEqual(true);
    });

    it('reports visible when point is in opposite direction from ellipsoid', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var occluder = new EllipsoidalOccluder(ellipsoid);
        occluder.setCameraPosition(new Cartesian3(7000000.0, 0.0, 0.0));

        var point = new Cartesian3(7100000.0, 0.0, 0.0);
        expect(occluder.isPointVisible(point)).toEqual(true);
    });

    it('reports not visible when point is over horizon', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var occluder = new EllipsoidalOccluder(ellipsoid);
        occluder.setCameraPosition(new Cartesian3(7000000.0, 0.0, 0.0));

        var point = new Cartesian3(4510635.0, 4510635.0, 0.0);
        expect(occluder.isPointVisible(point)).toEqual(false);
    });
});
