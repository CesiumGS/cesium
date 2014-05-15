/*global defineSuite*/
defineSuite([
        'Core/Intersections2D'
    ], function(
        Intersections2D) {
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

    describe('computeBarycentricCoordinates', function() {
        it('returns the correct result for positions on a triangle vertex', function() {
            var ll = Intersections2D.computeBarycentricCoordinates(0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0);
            expect(ll.x).toEqualEpsilon(1.0, 1e-15);
            expect(ll.y).toEqualEpsilon(0.0, 1e-15);
            expect(ll.z).toEqualEpsilon(0.0, 1e-15);

            var lr = Intersections2D.computeBarycentricCoordinates(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0);
            expect(lr.x).toEqualEpsilon(0.0, 1e-15);
            expect(lr.y).toEqualEpsilon(1.0, 1e-15);
            expect(lr.z).toEqualEpsilon(0.0, 1e-15);

            var ul = Intersections2D.computeBarycentricCoordinates(0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0);
            expect(ul.x).toEqualEpsilon(0.0, 1e-15);
            expect(ul.y).toEqualEpsilon(0.0, 1e-15);
            expect(ul.z).toEqualEpsilon(1.0, 1e-15);
        });

        it('returns the correct result for a position in the barycenter of a triangle', function() {
            var result = Intersections2D.computeBarycentricCoordinates(0.0, 0.0, 0.0, 1.0, -1, -0.5, 1, -0.5);
            expect(result.x).toEqualEpsilon(1.0 / 3.0, 1e-15);
            expect(result.y).toEqualEpsilon(1.0 / 3.0, 1e-15);
            expect(result.z).toEqualEpsilon(1.0 / 3.0, 1e-15);
        });

        it('returns the correct result for a position on an edge between two vertices', function() {
            var e12 = Intersections2D.computeBarycentricCoordinates(1.5, 1.0, 1.0, 1.0, 2.0, 1.0, 1.0, 2.0);
            expect(e12.x).toEqualEpsilon(0.5, 1e-15);
            expect(e12.y).toEqualEpsilon(0.5, 1e-15);
            expect(e12.z).toEqualEpsilon(0.0, 1e-15);

            var e23 = Intersections2D.computeBarycentricCoordinates(1.5, 1.5, 1.0, 1.0, 2.0, 1.0, 1.0, 2.0);
            expect(e23.x).toEqualEpsilon(0.0, 1e-15);
            expect(e23.y).toEqualEpsilon(0.5, 1e-15);
            expect(e23.z).toEqualEpsilon(0.5, 1e-15);

            var e31 = Intersections2D.computeBarycentricCoordinates(1.0, 1.5, 1.0, 1.0, 2.0, 1.0, 1.0, 2.0);
            expect(e31.x).toEqualEpsilon(0.5, 1e-15);
            expect(e31.y).toEqualEpsilon(0.0, 1e-15);
            expect(e31.z).toEqualEpsilon(0.5, 1e-15);
        });

        it('returns the correct result for a position outside a triangle', function() {
            var result1 = Intersections2D.computeBarycentricCoordinates(0.5, 0.5, 1.0, 1.0, 2.0, 1.0, 1.0, 2.0);
            expect(result1.x).toBeGreaterThan(0.0);
            expect(result1.y).toBeLessThan(0.0);
            expect(result1.z).toBeLessThan(0.0);

            var result2 = Intersections2D.computeBarycentricCoordinates(2.1, 0.99, 1.0, 1.0, 2.0, 1.0, 1.0, 2.0);
            expect(result2.x).toBeLessThan(0.0);
            expect(result2.y).toBeGreaterThan(0.0);
            expect(result2.z).toBeLessThan(0.0);

            var result3 = Intersections2D.computeBarycentricCoordinates(0.99, 2.1, 1.0, 1.0, 2.0, 1.0, 1.0, 2.0);
            expect(result3.x).toBeLessThan(0.0);
            expect(result3.y).toBeLessThan(0.0);
            expect(result3.z).toBeGreaterThan(0.0);
        });
    });
});
