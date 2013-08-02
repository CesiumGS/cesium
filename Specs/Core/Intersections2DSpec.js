/*global defineSuite*/
defineSuite([
             'Core/Intersections2D',
             'Core/Math'
            ], function(
              Intersections2D,
              CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    describe('clipTriangleAtAxisAlignedThreshold', function() {
        it('eliminates a triangle that is entirely on the wrong side of the threshold', function() {
            var result = Intersections2D.clipTriangleAtAxisAlignedThreshold(0.1, false, 0.2, 0.3, 0.4);
            expect(result.length).toBe(0);
        });

        it('keeps a triangle that is entirely on the correct side of the threshold', function() {
            var result = Intersections2D.clipTriangleAtAxisAlignedThreshold(0.1, true, 0.2, 0.3, 0.4);
            expect(result.length).toBe(3);
            expect(result[0]).toBe(0);
            expect(result[1]).toBe(1);
            expect(result[2]).toBe(2);
        });

        it('adds two vertices on threshold when point 0 is on the wrong side and above', function() {
            var result = Intersections2D.clipTriangleAtAxisAlignedThreshold(0.5, false, 0.6, 0.4, 0.2);
            expect(result.length).toBe(10);

            expect(result[0]).toBe(1);
            expect(result[1]).toBe(2);

            expect(result[2]).toBe(-1);
            expect(result[3]).toBe(0);
            expect(result[4]).toBe(2);
            expect(result[5]).toEqualEpsilon(0.25, 1e-14);

            expect(result[6]).toBe(-1);
            expect(result[7]).toBe(0);
            expect(result[8]).toBe(1);
            expect(result[9]).toEqualEpsilon(0.5, 1e-14);
        });

        it('adds two vertices on threshold when point 0 is on the wrong side and below', function() {
            var result = Intersections2D.clipTriangleAtAxisAlignedThreshold(0.5, true, 0.4, 0.6, 0.8);
            expect(result.length).toBe(10);

            expect(result[0]).toBe(1);
            expect(result[1]).toBe(2);

            expect(result[2]).toBe(-1);
            expect(result[3]).toBe(0);
            expect(result[4]).toBe(2);
            expect(result[5]).toEqualEpsilon(0.25, 1e-14);

            expect(result[6]).toBe(-1);
            expect(result[7]).toBe(0);
            expect(result[8]).toBe(1);
            expect(result[9]).toEqualEpsilon(0.5, 1e-14);
        });

        it('adds two vertices on threshold when point 1 is on the wrong side and above', function() {
            var result = Intersections2D.clipTriangleAtAxisAlignedThreshold(0.5, false, 0.2, 0.6, 0.4);
            expect(result.length).toBe(10);

            expect(result[0]).toBe(2);
            expect(result[1]).toBe(0);

            expect(result[2]).toBe(-1);
            expect(result[3]).toBe(1);
            expect(result[4]).toBe(0);
            expect(result[5]).toEqualEpsilon(0.25, 1e-14);

            expect(result[6]).toBe(-1);
            expect(result[7]).toBe(1);
            expect(result[8]).toBe(2);
            expect(result[9]).toEqualEpsilon(0.5, 1e-14);
        });

        it('adds two vertices on threshold when point 1 is on the wrong side and below', function() {
            var result = Intersections2D.clipTriangleAtAxisAlignedThreshold(0.5, true, 0.8, 0.4, 0.6);
            expect(result.length).toBe(10);

            expect(result[0]).toBe(2);
            expect(result[1]).toBe(0);

            expect(result[2]).toBe(-1);
            expect(result[3]).toBe(1);
            expect(result[4]).toBe(0);
            expect(result[5]).toEqualEpsilon(0.25, 1e-14);

            expect(result[6]).toBe(-1);
            expect(result[7]).toBe(1);
            expect(result[8]).toBe(2);
            expect(result[9]).toEqualEpsilon(0.5, 1e-14);
        });

        it('adds two vertices on threshold when point 2 is on the wrong side and above', function() {
            var result = Intersections2D.clipTriangleAtAxisAlignedThreshold(0.5, false, 0.4, 0.2, 0.6);
            expect(result.length).toBe(10);

            expect(result[0]).toBe(0);
            expect(result[1]).toBe(1);

            expect(result[2]).toBe(-1);
            expect(result[3]).toBe(2);
            expect(result[4]).toBe(1);
            expect(result[5]).toEqualEpsilon(0.25, 1e-14);

            expect(result[6]).toBe(-1);
            expect(result[7]).toBe(2);
            expect(result[8]).toBe(0);
            expect(result[9]).toEqualEpsilon(0.5, 1e-14);
        });

        it('adds two vertices on threshold when point 2 is on the wrong side and below', function() {
            var result = Intersections2D.clipTriangleAtAxisAlignedThreshold(0.5, true, 0.6, 0.8, 0.4);
            expect(result.length).toBe(10);

            expect(result[0]).toBe(0);
            expect(result[1]).toBe(1);

            expect(result[2]).toBe(-1);
            expect(result[3]).toBe(2);
            expect(result[4]).toBe(1);
            expect(result[5]).toEqualEpsilon(0.25, 1e-14);

            expect(result[6]).toBe(-1);
            expect(result[7]).toBe(2);
            expect(result[8]).toBe(0);
            expect(result[9]).toEqualEpsilon(0.5, 1e-14);
        });

        it('adds two vertices on threshold when only point 0 is on the right side and below', function() {
            var result = Intersections2D.clipTriangleAtAxisAlignedThreshold(0.5, false, 0.4, 0.6, 0.8);
            expect(result.length).toBe(9);

            expect(result[0]).toBe(0);

            expect(result[1]).toBe(-1);
            expect(result[2]).toBe(1);
            expect(result[3]).toBe(0);
            expect(result[4]).toEqualEpsilon(0.5, 1e-14);

            expect(result[5]).toBe(-1);
            expect(result[6]).toBe(2);
            expect(result[7]).toBe(0);
            expect(result[8]).toEqualEpsilon(0.75, 1e-14);
        });

        it('adds two vertices on threshold when only point 0 is on the right side and above', function() {
            var result = Intersections2D.clipTriangleAtAxisAlignedThreshold(0.5, true, 0.6, 0.4, 0.2);
            expect(result.length).toBe(9);

            expect(result[0]).toBe(0);

            expect(result[1]).toBe(-1);
            expect(result[2]).toBe(1);
            expect(result[3]).toBe(0);
            expect(result[4]).toEqualEpsilon(0.5, 1e-14);

            expect(result[5]).toBe(-1);
            expect(result[6]).toBe(2);
            expect(result[7]).toBe(0);
            expect(result[8]).toEqualEpsilon(0.75, 1e-14);
        });

        it('adds two vertices on threshold when only point 1 is on the right side and below', function() {
            var result = Intersections2D.clipTriangleAtAxisAlignedThreshold(0.5, false, 0.8, 0.4, 0.6);
            expect(result.length).toBe(9);

            expect(result[0]).toBe(1);

            expect(result[1]).toBe(-1);
            expect(result[2]).toBe(2);
            expect(result[3]).toBe(1);
            expect(result[4]).toEqualEpsilon(0.5, 1e-14);

            expect(result[5]).toBe(-1);
            expect(result[6]).toBe(0);
            expect(result[7]).toBe(1);
            expect(result[8]).toEqualEpsilon(0.75, 1e-14);
        });

        it('adds two vertices on threshold when only point 1 is on the right side and above', function() {
            var result = Intersections2D.clipTriangleAtAxisAlignedThreshold(0.5, true, 0.2, 0.6, 0.4);
            expect(result.length).toBe(9);

            expect(result[0]).toBe(1);

            expect(result[1]).toBe(-1);
            expect(result[2]).toBe(2);
            expect(result[3]).toBe(1);
            expect(result[4]).toEqualEpsilon(0.5, 1e-14);

            expect(result[5]).toBe(-1);
            expect(result[6]).toBe(0);
            expect(result[7]).toBe(1);
            expect(result[8]).toEqualEpsilon(0.75, 1e-14);
        });

        it('adds two vertices on threshold when only point 2 is on the right side and below', function() {
            var result = Intersections2D.clipTriangleAtAxisAlignedThreshold(0.5, false, 0.6, 0.8, 0.4);
            expect(result.length).toBe(9);

            expect(result[0]).toBe(2);

            expect(result[1]).toBe(-1);
            expect(result[2]).toBe(0);
            expect(result[3]).toBe(2);
            expect(result[4]).toEqualEpsilon(0.5, 1e-14);

            expect(result[5]).toBe(-1);
            expect(result[6]).toBe(1);
            expect(result[7]).toBe(2);
            expect(result[8]).toEqualEpsilon(0.75, 1e-14);
        });

        it('adds two vertices on threshold when only point 2 is on the right side and above', function() {
            var result = Intersections2D.clipTriangleAtAxisAlignedThreshold(0.5, true, 0.4, 0.2, 0.6);
            expect(result.length).toBe(9);

            expect(result[0]).toBe(2);

            expect(result[1]).toBe(-1);
            expect(result[2]).toBe(0);
            expect(result[3]).toBe(2);
            expect(result[4]).toEqualEpsilon(0.5, 1e-14);

            expect(result[5]).toBe(-1);
            expect(result[6]).toBe(1);
            expect(result[7]).toBe(2);
            expect(result[8]).toEqualEpsilon(0.75, 1e-14);
        });
    });
});
