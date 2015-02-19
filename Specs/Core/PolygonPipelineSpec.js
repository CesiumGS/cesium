/*global defineSuite*/
defineSuite([
        'Core/PolygonPipeline',
        'Core/Cartesian2',
        'Core/Cartesian3',
        'Core/Ellipsoid',
        'Core/Math',
        'Core/WindingOrder'
    ], function(
        PolygonPipeline,
        Cartesian2,
        Cartesian3,
        Ellipsoid,
        CesiumMath,
        WindingOrder) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    beforeEach(function() {
        CesiumMath.setRandomNumberSeed(0.0);
    });

    it('removeDuplicates removes duplicate points', function() {
        var positions = PolygonPipeline.removeDuplicates([
                                                 new Cartesian3(1.0, 1.0, 1.0),
                                                 new Cartesian3(2.0, 2.0, 2.0),
                                                 new Cartesian3(2.0, 2.0, 2.0),
                                                 new Cartesian3(3.0, 3.0, 3.0)
                                                ]);

        expect(positions).toEqual([
                                        new Cartesian3(1.0, 1.0, 1.0),
                                        new Cartesian3(2.0, 2.0, 2.0),
                                        new Cartesian3(3.0, 3.0, 3.0)
                                       ]);
    });

    it('removeDuplicates removes duplicate first and last points', function() {
        var positions = PolygonPipeline.removeDuplicates([
                                                 new Cartesian3(1.0, 1.0, 1.0),
                                                 new Cartesian3(2.0, 2.0, 2.0),
                                                 new Cartesian3(3.0, 3.0, 3.0),
                                                 new Cartesian3(1.0, 1.0, 1.0)
                                                ]);

        expect(positions).toEqual([
                                        new Cartesian3(2.0, 2.0, 2.0),
                                        new Cartesian3(3.0, 3.0, 3.0),
                                        new Cartesian3(1.0, 1.0, 1.0)
                                       ]);
    });

    it('removeDuplicates throws without positions', function() {
        expect(function() {
            PolygonPipeline.removeDuplicates();
        }).toThrowDeveloperError();
    });

    it('computeArea2D computes a positive area', function() {
        var area = PolygonPipeline.computeArea2D([
                                                  new Cartesian2(0.0, 0.0),
                                                  new Cartesian2(2.0, 0.0),
                                                  new Cartesian2(2.0, 1.0),
                                                  new Cartesian2(0.0, 1.0)
                                                 ]);

        expect(area).toEqual(2.0);
    });

    it('computeArea2D computes a negative area', function() {
        var area = PolygonPipeline.computeArea2D([
                                                  new Cartesian2(0.0, 0.0),
                                                  new Cartesian2(0.0, 2.0),
                                                  new Cartesian2(1.0, 2.0),
                                                  new Cartesian2(1.0, 0.0)
                                                 ]);

        expect(area).toEqual(-2.0);
    });

    it('computeArea2D throws without positions', function() {
        expect(function() {
            PolygonPipeline.computeArea2D();
        }).toThrowDeveloperError();
    });

    it('computeArea2D throws without three positions', function() {
        expect(function() {
            PolygonPipeline.computeArea2D([Cartesian3.ZERO, Cartesian3.ZERO]);
        }).toThrowDeveloperError();
    });

    ///////////////////////////////////////////////////////////////////////

    it('computeWindingOrder2D computes counter-clockwise', function() {
        var area = PolygonPipeline.computeWindingOrder2D([
                                                          new Cartesian2(0.0, 0.0),
                                                          new Cartesian2(2.0, 0.0),
                                                          new Cartesian2(2.0, 1.0),
                                                          new Cartesian2(0.0, 1.0)
                                                         ]);

        expect(area).toEqual(WindingOrder.COUNTER_CLOCKWISE);
    });

    it('computeWindingOrder2D computes clockwise', function() {
        var area = PolygonPipeline.computeWindingOrder2D([
                                                          new Cartesian2(0.0, 0.0),
                                                          new Cartesian2(0.0, 2.0),
                                                          new Cartesian2(1.0, 2.0),
                                                          new Cartesian2(1.0, 0.0)
                                                         ]);

        expect(area).toEqual(WindingOrder.CLOCKWISE);
    });

    it('computeWindingOrder2D throws without positions', function() {
        expect(function() {
            PolygonPipeline.computeWindingOrder2D();
        }).toThrowDeveloperError();
    });

    it('computeWindingOrder2D throws without three positions', function() {
        expect(function() {
            PolygonPipeline.computeWindingOrder2D([Cartesian3.ZERO, Cartesian3.ZERO]);
        }).toThrowDeveloperError();
    });

    ///////////////////////////////////////////////////////////////////////

    it('triangulates a triangle', function() {
        var indices = PolygonPipeline.triangulate([new Cartesian2(0.0, 0.0), new Cartesian2(1.0, 0.0), new Cartesian2(0.0, 1.0)]);

        expect(indices).toEqual([0, 1, 2]);
    });

    it('triangulates a square', function() {
        var indices = PolygonPipeline.triangulate([new Cartesian2(0.0, 0.0), new Cartesian2(1.0, 0.0), new Cartesian2(1.0, 1.0), new Cartesian2(0.0, 1.0)]);

        expect(indices).toEqual([ 0, 2, 3, 0, 1, 2 ]);
    });

    it('triangulates simple concave', function() {
        var positions = [new Cartesian2(0.0, 0.0), new Cartesian2(2.0, 0.0), new Cartesian2(2.0, 2.0), new Cartesian2(1.0, 0.25), new Cartesian2(0.0, 2.0)];

        var indices = PolygonPipeline.triangulate(positions);

        expect(indices).toEqual([ 0, 3, 4, 0, 1, 3, 1, 2, 3 ]);
    });


    /*
     * Polygon:
     *
     *  7_________6
     *  |         |
     *  | 4 ______|
     *  |  |       5
     *  |  |______2     Special case: Is cut from 1 to 6 valid? No.
     *  | 3       |
     *  |_________|
     * 0           1
     */
    it('triangulates a concave polygon with vertical and horizontal sides', function() {
        var positions = [new Cartesian2(0,0), new Cartesian2(6,0), new Cartesian2(6,3), new Cartesian2(2,3),
                         new Cartesian2(2,6), new Cartesian2(6,6), new Cartesian2(6,9), new Cartesian2(0,9)];

        var indices = PolygonPipeline.triangulate(positions);
        expect(indices).toEqual([ 0, 3, 7, 0, 2, 3, 0, 1, 2, 3, 4, 7, 4, 6, 7, 4, 5, 6 ]);

        /* Do it a few times to make sure we never get stuck on it */
        for (var i = 0; i < 30; i++) {
            PolygonPipeline.triangulate(positions);
        }

    });

    /*
     * Polygon:
     *
     *  7_________6
     *  |         |
     *  |         |______4
     *  |          5     |    Now is 1 to 6 valid? Yes, but we'll never need it.
     *  |         2______|
     *  |         |      5
     *  |_________|
     * 0           1
     */
    it('triangulates a convex polygon with vertical and horizontal sides', function() {
        var positions = [new Cartesian2(0,0), new Cartesian2(6,0), new Cartesian2(6,3), new Cartesian2(8,3),
                         new Cartesian2(8,6), new Cartesian2(6,6), new Cartesian2(6,9), new Cartesian2(0,9)];

        var indices = PolygonPipeline.triangulate(positions);
        expect(indices).toEqual([ 0, 2, 7, 0, 1, 2, 2, 3, 7, 3, 5, 7, 5, 6, 7, 3, 4, 5 ]);

        /* Do it a few times to make sure we never get stuck on it */
        for (var i = 0; i < 30; i++) {
            PolygonPipeline.triangulate(positions);
        }

    });

    it('triangulates complicated concave', function() {
        var positions = [new Cartesian2(0.0, 0.0), new Cartesian2(2.0, 0.0), new Cartesian2(2.0, 1.0), new Cartesian2(0.1, 1.5), new Cartesian2(2.0, 2.0), new Cartesian2(0.0, 2.0),
                new Cartesian2(0.0, 1.0), new Cartesian2(1.9, 0.5)];

        var indices = PolygonPipeline.triangulate(positions);
        expect(indices).toEqual([ 0, 1, 7, 1, 2, 7, 2, 3, 7, 3, 6, 7, 3, 5, 6, 3, 4, 5 ]);
    });

    it('triangulates an even more complicated concave', function() {
        var positions = [new Cartesian2(0,0), new Cartesian2(1,0), new Cartesian2(1, -1), new Cartesian2(2, -1.4),
                    new Cartesian2(40, 2), new Cartesian2(10, 5), new Cartesian2(30, 10), new Cartesian2(25, 20),
                    new Cartesian2(20,20), new Cartesian2(10,15), new Cartesian2(15, 10), new Cartesian2(8, 10),
                    new Cartesian2(-1, 3)];

        var indices = PolygonPipeline.triangulate(positions);
        expect(indices).toEqual([ 0, 1, 12, 1, 5, 12, 1, 4, 5, 1, 2, 4, 5, 11, 12, 2, 3, 4, 5, 10, 11, 5, 6, 10, 6, 9, 10, 6, 7, 9, 7, 8, 9 ]);

        /* Try it a bunch of times to make sure we can never get stuck on it */
        for (var i = 0; i < 50; i++) {
            PolygonPipeline.triangulate(positions);
        }
    });

    /*
     * Polygon:
     *
     * 0 ___2__4
     *  |  /\  |
     *  | /  \ |
     *  |/    \|
     * 1       3
     */
    it('triangulates a polygon with a side that intersects on of its other vertices', function() {
        var positions = [new Cartesian2(0,0), new Cartesian2(0, -5), new Cartesian2(2,0), new Cartesian2(4, -5), new Cartesian2(4, 0)];

        var indices = PolygonPipeline.triangulate(positions);
        expect(indices).toEqual([ 0, 1, 2, 2, 3, 4 ]);
    });

    /*
     * Polygon:
     *
     * 0 _6___2__5__4
     *  \    /\    /
     *   \  /  \  /
     *    \/    \/
     *    1      3
     */
    it('triangulates a polygon with a side that intersects on of its other vertices and superfluous vertices', function() {
        var positions = [ new Cartesian2(0,0), new Cartesian2(2, -5), new Cartesian2(4,0), new Cartesian2(6, -5), new Cartesian2(8, 0),
                          new Cartesian2(6,0), new Cartesian2(2,0) ];

        var indices = PolygonPipeline.triangulate(positions);
        expect(indices).toEqual([ 0, 1, 2, 2, 3, 4 ]);
    });

    /*
     * Polygon:
     *
     * 6 ______ 5
     *  |      |           Vertex #3 is "tucked".
     *  | 3____|___ 2
     *  |      4   |
     *  |__________|
     * 0            1
     */
    it('triangulations a polygon with a "tucked" vertex', function() {
        var positions = [new Cartesian2(0,0), new Cartesian2(5,0), new Cartesian2(5,2), new Cartesian2(1, 2),
                         new Cartesian2(3, 2), new Cartesian2(3,4), new Cartesian2(0,4)];

        var indices = PolygonPipeline.triangulate(positions);
        expect(indices).toEqual([ 0, 1, 6, 1, 4, 6, 1, 2, 4, 4, 5, 6 ]);
    });

    it('throws without positions', function() {
        expect(function() {
            PolygonPipeline.triangulate();
        }).toThrowDeveloperError();
    });

    it('throws without three positions', function() {
        expect(function() {
            PolygonPipeline.triangulate([Cartesian2.ZERO, Cartesian2.ZERO]);
        }).toThrowDeveloperError();
    });

    ///////////////////////////////////////////////////////////////////////

    it('computeSubdivision throws without ellipsoid', function() {
        expect(function() {
            PolygonPipeline.computeSubdivision();
        }).toThrowDeveloperError();
    });

    it('computeSubdivision throws without positions', function() {
        expect(function() {
            PolygonPipeline.computeSubdivision(Ellipsoid.WGS84);
        }).toThrowDeveloperError();
    });

    it('computeSubdivision throws without indices', function() {
        expect(function() {
            PolygonPipeline.computeSubdivision(Ellipsoid.WGS84, []);
        }).toThrowDeveloperError();
    });

    it('computeSubdivision throws with less than 3 indices', function() {
        expect(function() {
            PolygonPipeline.computeSubdivision(Ellipsoid.WGS84, [], [1, 2]);
        }).toThrowDeveloperError();
    });

    it('computeSubdivision throws without a multiple of 3 indices', function() {
        expect(function() {
            PolygonPipeline.computeSubdivision(Ellipsoid.WGS84, [], [1, 2, 3, 4]);
        }).toThrowDeveloperError();
    });

    it('computeSubdivision throws with negative granularity', function() {
        expect(function() {
            PolygonPipeline.computeSubdivision(Ellipsoid.WGS84, [], [1, 2, 3], -1.0);
        }).toThrowDeveloperError();
    });

    it('computeSubdivision', function() {
        var positions = [
                         new Cartesian3(0.0, 0.0, 90.0),
                         new Cartesian3(0.0, 90.0, 0.0),
                         new Cartesian3(90.0, 0.0, 0.0)
                        ];
        var indices = [0, 1, 2];
        var subdivision = PolygonPipeline.computeSubdivision(Ellipsoid.WGS84, positions, indices, 60.0);

        expect(subdivision.attributes.position.values[0]).toEqual(0.0);
        expect(subdivision.attributes.position.values[1]).toEqual(0.0);
        expect(subdivision.attributes.position.values[2]).toEqual(90.0);
        expect(subdivision.attributes.position.values[3]).toEqual(0.0);
        expect(subdivision.attributes.position.values[4]).toEqual(90.0);
        expect(subdivision.attributes.position.values[5]).toEqual(0.0);
        expect(subdivision.attributes.position.values[6]).toEqual(90.0);
        expect(subdivision.attributes.position.values[7]).toEqual(0.0);
        expect(subdivision.attributes.position.values[8]).toEqual(0.0);

        expect(subdivision.indices[0]).toEqual(0);
        expect(subdivision.indices[1]).toEqual(1);
        expect(subdivision.indices[2]).toEqual(2);
    });

    it('eliminateHoles throws an exception without an outerRing', function() {
        expect(function() {
            PolygonPipeline.eliminateHoles();
        }).toThrowDeveloperError();
    });

    it('eliminateHoles throws an exception with an empty outerRing', function() {
        expect(function() {
            PolygonPipeline.eliminateHoles([]);
        }).toThrowDeveloperError();
    });

    it('eliminateHoles throws an exception without a second argument', function() {
        expect(function() {
            PolygonPipeline.eliminateHoles([new Cartesian3()]);
        }).toThrowDeveloperError();
    });

    it('eliminateHoles works with non-WGS84 ellipsoids', function() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var outerRing = Cartesian3.fromDegreesArray([
            -122.0, 37.0,
            -121.9, 37.0,
            -121.9, 37.1,
            -122.0, 37.1,
            -122.0, 37.0
        ], ellipsoid);

        var innerRing = Cartesian3.fromDegreesArray([
            -121.96, 37.04,
            -121.96, 37.01,
            -121.99, 37.01,
            -121.99, 37.04
        ], ellipsoid);

        var innerRings = [innerRing];
        var positions = PolygonPipeline.eliminateHoles(outerRing, innerRings, ellipsoid);

        expect(positions[0]).toEqual(outerRing[0]);
        expect(positions[1]).toEqual(outerRing[1]);

        expect(positions[2]).toEqual(innerRing[0]);
        expect(positions[3]).toEqual(innerRing[1]);
        expect(positions[4]).toEqual(innerRing[2]);
        expect(positions[5]).toEqual(innerRing[3]);
        expect(positions[6]).toEqual(innerRing[0]);

        expect(positions[7]).toEqual(outerRing[1]);
        expect(positions[8]).toEqual(outerRing[2]);
        expect(positions[9]).toEqual(outerRing[3]);
        expect(positions[10]).toEqual(outerRing[0]);
    });

    it('eliminateHoles removes a hole from a polygon', function() {
        var outerRing = Cartesian3.fromDegreesArray([
            -122.0, 37.0,
            -121.9, 37.0,
            -121.9, 37.1,
            -122.0, 37.1,
            -122.0, 37.0
        ]);

        var innerRing = Cartesian3.fromDegreesArray([
            -121.96, 37.04,
            -121.96, 37.01,
            -121.99, 37.01,
            -121.99, 37.04
        ]);

        var innerRings = [innerRing];
        var positions = PolygonPipeline.eliminateHoles(outerRing, innerRings);

        expect(positions[0]).toEqual(outerRing[0]);
        expect(positions[1]).toEqual(outerRing[1]);

        expect(positions[2]).toEqual(innerRing[0]);
        expect(positions[3]).toEqual(innerRing[1]);
        expect(positions[4]).toEqual(innerRing[2]);
        expect(positions[5]).toEqual(innerRing[3]);
        expect(positions[6]).toEqual(innerRing[0]);

        expect(positions[7]).toEqual(outerRing[1]);
        expect(positions[8]).toEqual(outerRing[2]);
        expect(positions[9]).toEqual(outerRing[3]);
        expect(positions[10]).toEqual(outerRing[0]);
    });

    it('eliminateHoles ensures proper winding order', function() {
        var outerRing = Cartesian3.fromDegreesArray([
            -122.0, 37.0,
            -121.9, 37.0,
            -121.9, 37.1,
            -122.0, 37.1,
            -122.0, 37.0
        ]);

        var innerRing = Cartesian3.fromDegreesArray([
            -121.96, 37.04,
            -121.99, 37.04,
            -121.99, 37.01,
            -121.96, 37.01
        ]);

        var innerRings = [innerRing];
        var positions = PolygonPipeline.eliminateHoles(outerRing, innerRings);

        expect(positions[0]).toEqual(outerRing[0]);
        expect(positions[1]).toEqual(outerRing[1]);

        expect(positions[2]).toEqual(innerRing[0]);
        expect(positions[3]).toEqual(innerRing[3]);
        expect(positions[4]).toEqual(innerRing[2]);
        expect(positions[5]).toEqual(innerRing[1]);
        expect(positions[6]).toEqual(innerRing[0]);

        expect(positions[7]).toEqual(outerRing[1]);
        expect(positions[8]).toEqual(outerRing[2]);
        expect(positions[9]).toEqual(outerRing[3]);
        expect(positions[10]).toEqual(outerRing[0]);
    });

    it('eliminateHoles works with concave polygons', function() {
        var outerRing = Cartesian3.fromDegreesArray([
            -122.0, 37.0,
            -121.96, 37.0,
            -121.92, 37.03,
            -121.92, 37.0,
            -121.9, 37.0,
            -121.9, 37.1,
            -122.0, 37.1
        ]);

        var innerRing = Cartesian3.fromDegreesArray([
            -121.99, 37.01,
            -121.99, 37.04,
            -121.96, 37.04,
            -121.96, 37.01
        ]);

        var positions = PolygonPipeline.eliminateHoles(outerRing, [innerRing]);

        expect(positions[0]).toEqual(outerRing[0]);
        expect(positions[1]).toEqual(outerRing[1]);
        expect(positions[2]).toEqual(outerRing[2]);

        expect(positions[3]).toEqual(innerRing[2]);
        expect(positions[4]).toEqual(innerRing[3]);
        expect(positions[5]).toEqual(innerRing[0]);
        expect(positions[6]).toEqual(innerRing[1]);
        expect(positions[7]).toEqual(innerRing[2]);

        expect(positions[8]).toEqual(outerRing[2]);
        expect(positions[9]).toEqual(outerRing[3]);
        expect(positions[10]).toEqual(outerRing[4]);
        expect(positions[11]).toEqual(outerRing[5]);
        expect(positions[12]).toEqual(outerRing[6]);
    });

    it('eliminateHoles eliminates multiple holes', function() {
        var outerRing = Cartesian3.fromDegreesArray([
            -122.0, 37.0,
            -121.9, 37.0,
            -121.9, 37.1,
            -122.0, 37.1
        ]);

        var inner0 = Cartesian3.fromDegreesArray([
            -121.99, 37.01,
            -121.99, 37.04,
            -121.96, 37.04,
            -121.96, 37.01
        ]);
        var inner1 = Cartesian3.fromDegreesArray([
            -121.94, 37.06,
            -121.94, 37.09,
            -121.91, 37.09,
            -121.91, 37.06
        ]);
        var inner2 = Cartesian3.fromDegreesArray([
            -121.99, 37.06,
            -121.99, 37.09,
            -121.96, 37.09,
            -121.96, 37.06
        ]);
        var inner3 = Cartesian3.fromDegreesArray([
            -121.94, 37.01,
            -121.94, 37.04,
            -121.91, 37.04,
            -121.91, 37.01
        ]);

        var innerRings = [inner0, inner1, inner2, inner3];
        var positions = PolygonPipeline.eliminateHoles(outerRing, innerRings);
        expect(outerRing.length).toEqual(4);
        expect(innerRings.length).toEqual(4);
        expect(positions.length).toEqual(28);
    });

});