/*global defineSuite*/
defineSuite([
         'Core/Extent',
         'Core/Math'
     ], function(
         Extent,
         CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('constructor checks for a valid extent.', function() {
        expect(function() {
            return new Extent();
        }).toThrow();
    });

    it('constructor throws exception with invalid extent 1', function() {
        expect(function() {
            return new Extent(-CesiumMath.PI - 1,
                              -CesiumMath.PI_OVER_TWO,
                              CesiumMath.PI,
                              CesiumMath.PI_OVER_TWO);
        }).toThrow();
    });

    it('constructor throws exception with invalid extent 2', function() {
        expect(function() {
            return new Extent(-CesiumMath.PI,
                              -CesiumMath.PI_OVER_TWO - 1,
                              CesiumMath.PI,
                              CesiumMath.PI_OVER_TWO);
        }).toThrow();
    });

    it('constructor throws exception with invalid extent 3', function() {
        expect(function() {
            return new Extent(-CesiumMath.PI,
                              -CesiumMath.PI_OVER_TWO,
                              CesiumMath.PI + 1,
                              CesiumMath.PI_OVER_TWO);
        }).toThrow();
    });

    it('constructor throws exception with invalid extent 4', function() {
        expect(function() {
            return new Extent(-CesiumMath.PI,
                              -CesiumMath.PI_OVER_TWO,
                              CesiumMath.PI,
                              CesiumMath.PI_OVER_TWO + 1);
        }).toThrow();
    });

    it('constructor throws exception with invalid extent 5', function() {
        expect(function() {
            return new Extent(undefined,
                              -CesiumMath.PI_OVER_TWO,
                              CesiumMath.PI,
                              CesiumMath.PI_OVER_TWO);
        }).toThrow();
    });

    it('constructor throws exception with invalid extent 6', function() {
        expect(function() {
            return new Extent(-CesiumMath.PI,
                              undefined,
                              CesiumMath.PI,
                              CesiumMath.PI_OVER_TWO);
        }).toThrow();
    });

    it('constructor throws exception with invalid extent 7', function() {
        expect(function() {
            return new Extent(-CesiumMath.PI,
                              -CesiumMath.PI_OVER_TWO,
                              undefined,
                              CesiumMath.PI_OVER_TWO);
        }).toThrow();
    });

    it('constructor throws exception with invalid extent 8', function() {
        expect(function() {
            return new Extent(-CesiumMath.PI,
                              -CesiumMath.PI_OVER_TWO,
                              CesiumMath.PI,
                              undefined);
        }).toThrow();
    });

    it('validate throws exception with undefined extent', function() {
        expect(function() {
            Extent.validate();
        }).toThrow();
    });

    describe('can get corner positions', function() {
        //arbitrary values
        var west = -0.9;
        var south = 0.5;
        var east = 1.4;
        var north = 1.0;

        it('can get the southwest corner', function() {
            var corner = new Extent(west, south, east, north).getSouthwest();
            expect(corner.longitude).toEqual(west);
            expect(corner.latitude).toEqual(south);
        });

        it('can get the northwest corner', function() {
            var corner = new Extent(west, south, east, north).getNorthwest();
            expect(corner.longitude).toEqual(west);
            expect(corner.latitude).toEqual(north);
        });

        it('can get the northeast corner', function() {
            var corner = new Extent(west, south, east, north).getNortheast();
            expect(corner.longitude).toEqual(east);
            expect(corner.latitude).toEqual(north);
        });

        it('can get the southeast corner', function() {
            var corner = new Extent(west, south, east, north).getSoutheast();
            expect(corner.longitude).toEqual(east);
            expect(corner.latitude).toEqual(south);
        });
    });
});