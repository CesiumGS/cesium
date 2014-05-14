/*global defineSuite*/
defineSuite([
         'Core/Shapes',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/Math'
     ], function(
         Shapes,
         Cartographic,
         Ellipsoid,
         CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('compute2DCircle returns a unit circle by default', function() {
        var points = Shapes.compute2DCircle();
        expect(points.length).toBeGreaterThan(0);
        expect(points[0].x).toEqual(1);
        expect(points[0].y).toEqual(0);
    });

    it('compute2DCircle returns an circle with radius 5', function() {
        var points = Shapes.compute2DCircle(5.0);
        expect(points.length).toBeGreaterThan(0);
        expect(points[0].x).toEqual(5);
        expect(points[0].y).toEqual(0);
    });
});
