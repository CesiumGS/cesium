/*global defineSuite*/
defineSuite([
         'Core/PolylinePipeline',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/Transforms'
     ], function(
         PolylinePipeline,
         Cartesian3,
         Cartographic,
         Ellipsoid,
         Transforms) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('wrapLongitude', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var p1 = new Cartographic.fromDegrees(-75.163789, 39.952335);      // Philadelphia, PA
        var p2 = new Cartographic.fromDegrees(-80.2264393, 25.7889689);    // Miami, FL
        var positions = [ellipsoid.cartographicToCartesian(p1),
                         ellipsoid.cartographicToCartesian(p2)];
        var segments = PolylinePipeline.wrapLongitude(positions);
        expect(segments.lengths.length).toEqual(1);
        expect(segments.lengths[0]).toEqual(2);
    });

    it('wrapLongitude breaks polyline into segments', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var p1 = new Cartographic.fromDegrees(-179.0, 39.0);
        var p2 = new Cartographic.fromDegrees(2.0, 25.0);
        var positions = [ellipsoid.cartographicToCartesian(p1),
                         ellipsoid.cartographicToCartesian(p2)];
        var segments = PolylinePipeline.wrapLongitude(positions);
        expect(segments.lengths.length).toEqual(2);
        expect(segments.lengths[0]).toEqual(2);
        expect(segments.lengths[1]).toEqual(2);
    });

    it('wrapLongitude breaks polyline into segments with model matrix', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var center = ellipsoid.cartographicToCartesian(new Cartographic.fromDegrees(-179.0, 39.0));
        var matrix = Transforms.eastNorthUpToFixedFrame(center, ellipsoid);

        var positions = [ new Cartesian3(0.0, 0.0, 0.0),
                          new Cartesian3(0.0, 100000000.0, 0.0)];
        var segments = PolylinePipeline.wrapLongitude(positions, matrix);
        expect(segments.lengths.length).toEqual(2);
        expect(segments.lengths[0]).toEqual(2);
        expect(segments.lengths[1]).toEqual(2);
    });
});