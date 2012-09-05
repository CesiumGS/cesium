/*global defineSuite*/
defineSuite([
         'Core/PolylinePipeline',
         'Core/Cartographic',
         'Core/Ellipsoid'
     ], function(
         PolylinePipeline,
         Cartographic,
         Ellipsoid) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('wrapLongitude', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var p1 = new Cartographic.fromDegrees(-75.163789, 39.952335);      // Philadelphia, PA
        var p2 = new Cartographic.fromDegrees(-80.2264393, 25.7889689);    // Miami, FL
        var positions = [ellipsoid.cartographicToCartesian(p1),
                         ellipsoid.cartographicToCartesian(p2)];
        var segments = PolylinePipeline.wrapLongitude(ellipsoid, positions);
        expect(segments.length).toEqual(1);
        expect(segments[0].length).toEqual(2);
    });

    it('wrapLongitude breaks polyline into segments', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var p1 = new Cartographic.fromDegrees(-179.0, 39.0);
        var p2 = new Cartographic.fromDegrees(2.0, 25.0);
        var positions = [ellipsoid.cartographicToCartesian(p1),
                         ellipsoid.cartographicToCartesian(p2)];
        var segments = PolylinePipeline.wrapLongitude(ellipsoid, positions);
        expect(segments.length).toEqual(2);
        expect(segments[0].length).toEqual(2);
        expect(segments[1].length).toEqual(2);
    });
});