/*global defineSuite*/
defineSuite([
         'Core/WallGeometry',
         'Core/Cartographic',
         'Core/Ellipsoid'
     ], function(
         WallGeometry,
         Cartographic,
         Ellipsoid) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var ellipsoid = Ellipsoid.WGS84;

    it('create with no parameters', function() {
        expect(function() {
            return new WallGeometry({
            });
        }).toThrow();
    });

    it('create simple absolute', function() {
        var coords = [
            Cartographic.fromDegrees(49.0, 18.0, 1000.0),
            Cartographic.fromDegrees(50.0, 18.0, 1000.0)
        ];

        var w = new WallGeometry({
            altitudeMode : 'absolute',
            positions    : ellipsoid.cartographicArrayToCartesianArray(coords)
        });

        expect(w.attributes.position.values.length).toEqual(2 * 2 * 3);
        expect(w.indexLists[0].values.length).toEqual(2 * 3);
    });

    it('create relative to ground no terrain', function() {
        var coords = [
            Cartographic.fromDegrees(49.0, 18.0, 1000.0),
            Cartographic.fromDegrees(50.0, 18.0, 1000.0)
        ];

        // this will throw an exception, as no terrain is specified
        expect(function() {
            return new WallGeometry({
                altitudeMode : 'relativeToGround',
                positions    : ellipsoid.cartographicArrayToCartesianArray(coords)
            }).toThrow();
        });
    });

    it('create relative to ground', function() {
        var coords = [
            Cartographic.fromDegrees(49.0, 18.0, 1000.0),
            Cartographic.fromDegrees(50.0, 18.0, 1000.0)
        ];

        var terrain = [
            Cartographic.fromDegrees(49.0, 18.0, 100.0),
            Cartographic.fromDegrees(50.0, 18.0, 110.0)
        ];

        var w = new WallGeometry({
            altitudeMode : 'relativeToGround',
            positions    : ellipsoid.cartographicArrayToCartesianArray(coords),
            terrain      : terrain
        });

        expect(w.attributes.position.values.length).toEqual(2 * 2 * 3);
        expect(w.indexLists[0].values.length).toEqual(2 * 3);
    });

});

