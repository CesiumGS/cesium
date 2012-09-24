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

    it('isPointExample works as claimed', function() {
        var cameraPosition = new Cartesian3(0, 0, 2.5);
        var ellipsoid = new Ellipsoid(1.0, 1.1, 0.9);
        var occluder = new EllipsoidalOccluder(ellipsoid, cameraPosition);
        var point = new Cartesian3(0, -3, -3);
        expect(occluder.isPointVisible(point)).toEqual(true); //returns true
    });
});
