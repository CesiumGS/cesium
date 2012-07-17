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
    /*global it,expect*/

    it('wrapLongitude', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var p1 = new Cartographic(-75.163789, 39.952335);      // Philadelphia, PA
        var p2 = new Cartographic(-80.2264393, 25.7889689);    // Miami, FL
        var positions = [ellipsoid.cartographicToCartesian(p1),
                         ellipsoid.cartographicToCartesian(p2)];
        var segments = PolylinePipeline.wrapLongitude(ellipsoid, positions);
        expect(segments.length).toEqual(2);
        expect(segments[0].length).toEqual(2);
        expect(segments[1].length).toEqual(2);
    });
});