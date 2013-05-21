/*global defineSuite*/
defineSuite([
         'Core/WallGeometry',
         'Core/Cartographic'
     ], function(
         WallGeometry,
         Cartographic) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('create with no parameters', function() {
        expect(function() {
            return new WallGeometry({
            });
        }).toThrow();
    });

    it('create simple absolute', function() {
        var coords = [
            new Cartographic(49, 18, 1000),
            new Cartographic(50, 18, 1000)
        ];

        var w = new WallGeometry({
            altitudeMode : 'absolute',
            coordinates  : coords
        });

        expect(w.attributes.position.values.length).toEqual(2 * 2 * 3);
        expect(w.indexLists[0].values.length).toEqual(2 * 3);
    });

    it('create relative to ground no terrain', function() {
        var coords = [
            new Cartographic(49, 18, 1000),
            new Cartographic(50, 18, 1000)
        ];

        // this will throw an exception, as no terrain is specified
        expect(function() {
            return new WallGeometry({
                altitudeMode : 'relativeToGround',
                coordinates  : coords
            }).toThrow();
        });
    });

    it('create relative to ground', function() {
        var coords = [
            new Cartographic(49, 18, 1000),
            new Cartographic(50, 18, 1000)
        ];

        var terrain = [
            new Cartographic(49, 18, 100),
            new Cartographic(50, 18, 110)
        ];

        var w = new WallGeometry({
            altitudeMode : 'relativeToGround',
            coordinates  : coords,
            terrain      : terrain
        });

        expect(w.attributes.position.values.length).toEqual(2 * 2 * 3);
        expect(w.indexLists[0].values.length).toEqual(2 * 3);
    });

});

