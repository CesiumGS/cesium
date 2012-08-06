/*global defineSuite*/
defineSuite([
         'Core/PolygonPipeline',
         'Core/Cartesian2',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/EllipsoidTangentPlane',
         'Core/WindingOrder'
     ], function(
         PolygonPipeline,
         Cartesian2,
         Cartesian3,
         Cartographic,
         Ellipsoid,
         EllipsoidTangentPlane,
         WindingOrder) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('cleanUp removes duplicate points', function() {
        var positions = PolygonPipeline.cleanUp([
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

    it('cleanUp removes duplicate first and last points', function() {
        var positions = PolygonPipeline.cleanUp([
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

    it('cleanUp throws without positions', function() {
        expect(function() {
            PolygonPipeline.cleanUp();
        }).toThrow();
    });

    it('cleanUp throws without three positions', function() {
        expect(function() {
            PolygonPipeline.cleanUp([Cartesian3.ZERO, Cartesian3.ZERO]);
        }).toThrow();
    });

    ///////////////////////////////////////////////////////////////////////

    it('EllipsoidTangentPlane projects a point', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var p = ellipsoid.cartographicToCartesian(Cartographic.ZERO);

        var tangentPlane = EllipsoidTangentPlane.create(ellipsoid, [p]);
        var projectedP = tangentPlane.projectPointsOntoPlane([p]);

        expect(projectedP.length).toEqual(1);
        expect(projectedP[0].equals(Cartesian3.ZERO)).toEqual(true);
    });

    it('EllipsoidTangentPlane throws without ellipsoid', function() {
        expect(function() {
            return EllipsoidTangentPlane.create();
        }).toThrow();
    });

    it('EllipsoidTangentPlane throws without positions', function() {
        var ellipsoid = Ellipsoid.WGS84;

        expect(function() {
            return EllipsoidTangentPlane.create(ellipsoid);
        }).toThrow();
    });

    it('projectPointsOntoPlane throws without positions', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var p = ellipsoid.cartographicToCartesian(Cartographic.ZERO);
        var tangentPlane = EllipsoidTangentPlane.create(ellipsoid, [p]);

        expect(function() {
            return tangentPlane.projectPointsOntoPlane();
        }).toThrow();
    });

    ///////////////////////////////////////////////////////////////////////

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
        }).toThrow();
    });

    it('computeArea2D throws without three positions', function() {
        expect(function() {
            PolygonPipeline.computeArea2D([Cartesian3.ZERO, Cartesian3.ZERO]);
        }).toThrow();
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
        }).toThrow();
    });

    it('computeWindingOrder2D throws without three positions', function() {
        expect(function() {
            PolygonPipeline.computeWindingOrder2D([Cartesian3.ZERO, Cartesian3.ZERO]);
        }).toThrow();
    });

    ///////////////////////////////////////////////////////////////////////

    it('earClip2D triangulates a triangle', function() {
        var indices = PolygonPipeline.earClip2D([new Cartesian2(0.0, 0.0), new Cartesian2(1.0, 0.0), new Cartesian2(0.0, 1.0)]);

        expect(indices).toEqual([0, 1, 2]);
    });

    it('earClip2D triangulates a square', function() {
        var indices = PolygonPipeline.earClip2D([new Cartesian2(0.0, 0.0), new Cartesian2(1.0, 0.0), new Cartesian2(1.0, 1.0), new Cartesian2(0.0, 1.0)]);

        expect(indices).toEqual([0, 1, 2, 0, 2, 3]);
    });

    it('earClip2D triangulates simple concave', function() {
        var positions = [new Cartesian2(0.0, 0.0), new Cartesian2(2.0, 0.0), new Cartesian2(2.0, 2.0), new Cartesian2(1.0, 0.25), new Cartesian2(0.0, 2.0)];

        var indices = PolygonPipeline.earClip2D(positions);

        expect(indices).toEqual([1, 2, 3, 3, 4, 0, 0, 1, 3]);
    });

    it('earClip2D triangulates complex concave', function() {
        var positions = [new Cartesian2(0.0, 0.0), new Cartesian2(2.0, 0.0), new Cartesian2(2.0, 1.0), new Cartesian2(0.1, 1.5), new Cartesian2(2.0, 2.0), new Cartesian2(0.0, 2.0),
                new Cartesian2(0.0, 1.0), new Cartesian2(1.9, 0.5)];

        var indices = PolygonPipeline.earClip2D(positions);

        expect(indices).toEqual([3, 4, 5, 3, 5, 6, 3, 6, 7, 7, 0, 1, 7, 1, 2, 2, 3, 7]);
    });

    it('earClip2D throws without positions', function() {
        expect(function() {
            PolygonPipeline.earClip2D();
        }).toThrow();
    });

    it('earClip2D throws without three positions', function() {
        expect(function() {
            PolygonPipeline.earClip2D([Cartesian2.ZERO, Cartesian2.ZERO]);
        }).toThrow();
    });

    ///////////////////////////////////////////////////////////////////////

    it('computeSubdivision throws without positions', function() {
        expect(function() {
            PolygonPipeline.computeSubdivision();
        }).toThrow();
    });

    it('computeSubdivision throws without indices', function() {
        expect(function() {
            PolygonPipeline.computeSubdivision([]);
        }).toThrow();
    });

    it('computeSubdivision throws with less than 3 indices', function() {
        expect(function() {
            PolygonPipeline.computeSubdivision([], [1, 2]);
        }).toThrow();
    });

    it('computeSubdivision throws without a multiple of 3 indices', function() {
        expect(function() {
            PolygonPipeline.computeSubdivision([], [1, 2, 3, 4]);
        }).toThrow();
    });

    it('computeSubdivision throws with negative granularity', function() {
        expect(function() {
            PolygonPipeline.computeSubdivision([], [1, 2, 3], -1.0);
        }).toThrow();
    });

    it('computeSubdivision', function() {
        var positions = [
                         new Cartesian3(0.0, 0.0, 90.0),
                         new Cartesian3(0.0, 90.0, 0.0),
                         new Cartesian3(90.0, 0.0, 0.0)
                        ];
        var indices = [0, 1, 2];
        var subdivision = PolygonPipeline.computeSubdivision(positions, indices, 60.0);

        expect(subdivision.attributes.position.values[0]).toEqual(0.0);
        expect(subdivision.attributes.position.values[1]).toEqual(0.0);
        expect(subdivision.attributes.position.values[2]).toEqual(90.0);
        expect(subdivision.attributes.position.values[3]).toEqual(0.0);
        expect(subdivision.attributes.position.values[4]).toEqual(90.0);
        expect(subdivision.attributes.position.values[5]).toEqual(0.0);
        expect(subdivision.attributes.position.values[6]).toEqual(90.0);
        expect(subdivision.attributes.position.values[7]).toEqual(0.0);
        expect(subdivision.attributes.position.values[8]).toEqual(0.0);

        expect(subdivision.indexLists[0].values[0]).toEqual(0);
        expect(subdivision.indexLists[0].values[1]).toEqual(1);
        expect(subdivision.indexLists[0].values[2]).toEqual(2);
    });

    it('scaleToGeodeticHeight throws without ellipsoid', function() {
        expect(function() {
            PolygonPipeline.scaleToGeodeticHeight();
        }).toThrow();
    });

    it('tests if a point is inside a triangle', function() {
        var a = new Cartesian3(0, 0, 0);
        var b = new Cartesian3(0, 1, 0);
        var c = new Cartesian3(1, 0, 0);

        // p is on the boundary of the triangle
        var p = new Cartesian3(0, 0, 0);
        expect(PolygonPipeline._isPointInTriangle2D(p, a, b, c)).toEqual(true);

        // p is inside the triangle
        p = new Cartesian3(0.5, 0.25, 0);
        expect(PolygonPipeline._isPointInTriangle2D(p, a, b, c)).toEqual(true);

        // p is outside the triangle
        p = new Cartesian3(1, 1, 0);
        expect(PolygonPipeline._isPointInTriangle2D(p, a, b, c)).toEqual(false);
    });

    it('_isPointInTriangle2D throws an exception without arguments', function() {
        expect(function() {
            PolygonPipeline._isPointInTriangle2D();
        }).toThrow();
    });

    it('gets the rightmost vertex index', function() {
        var ring = [
            new Cartesian3(0.0, 1.0, 0.0),
            new Cartesian3(1.0, 2.0, 0.0),
            new Cartesian3(2.0, 2.0, 0.0),
            new Cartesian3(3.0, 1.0, 0.0),
            new Cartesian3(2.0, 0.0, 0.0),
            new Cartesian3(1.0, 1.0, 0.0)
        ];
        expect(PolygonPipeline._getRightmostVertexIndex(ring) === 3).toEqual(true);
    });

    it('_getRightmostVertexIndex throws an exception without an argument', function() {
        expect(function() {
            PolygonPipeline._getRightmostVertexIndex();
        }).toThrow();
    });

    it('_getRightmostVertexIndex throws an exception without vertices', function() {
        expect(function() {
            PolygonPipeline._getRightmostVertexIndex([]);
        }).toThrow();
    });

    it('_getRightmostRingIndex throws an exception without an argument', function() {
        expect(function() {
            PolygonPipeline._getRightmostRingIndex();
        }).toThrow();
    });

    it('_getRightmostRingIndex throws an exception with an empty ring', function() {
        expect(function() {
            PolygonPipeline._getRightmostRingIndex([]);
        }).toThrow();
    });

    it('_getRightmostRingIndex throws an exception without an initial vertex', function() {
        expect(function() {
            PolygonPipeline._getRightmostRingIndex([[]]);
        }).toThrow();
    });

    it('gets the rightmost ring index', function() {
        var ring0 = [
            new Cartesian3(0.0, 1.0, 0.0),
            new Cartesian3(1.0, 2.0, 0.0),
            new Cartesian3(2.0, 2.0, 0.0),
            new Cartesian3(3.0, 1.0, 0.0),
            new Cartesian3(2.0, 0.0, 0.0),
            new Cartesian3(1.0, 1.0, 0.0)
        ];

        var ring1 = [
            new Cartesian3(4.0, 1.0, 0.0),
            new Cartesian3(5.0, 2.0, 0.0),
            new Cartesian3(6.0, 2.0, 0.0),
            new Cartesian3(7.0, 1.0, 0.0),
            new Cartesian3(6.0, 0.0, 0.0),
            new Cartesian3(5.0, 1.0, 0.0)
        ];

        var rings = [ring0, ring1];
        expect(PolygonPipeline._getRightmostRingIndex(rings) === 1).toEqual(true);
    });

    it('gets reflex vertices', function() {
        var polygon = [
            new Cartesian3(0.0, 2.0, 0.0),
            new Cartesian3(1.6, 2.0, 0.0),   // reflex
            new Cartesian3(2.0, 3.0, 0.0),
            new Cartesian3(2.3, 2.0, 0.0),   // reflex
            new Cartesian3(4.0, 2.0, 0.0),
            new Cartesian3(2.6, 1.0, 0.0),   // reflex
            new Cartesian3(3.0, 0.0, 0.0),
            new Cartesian3(2.0, 1.0, 0.0),   // reflex
            new Cartesian3(1.0, 0.0, 0.0),
            new Cartesian3(1.3, 1.0, 0.0)    // reflex
        ];

        var reflexVertices = PolygonPipeline._getReflexVertices(polygon);
        expect(reflexVertices.length == 5).toEqual(true);
        expect(reflexVertices[0].equals(polygon[1])).toEqual(true);
        expect(reflexVertices[1].equals(polygon[3])).toEqual(true);
        expect(reflexVertices[2].equals(polygon[5])).toEqual(true);
        expect(reflexVertices[3].equals(polygon[7])).toEqual(true);
        expect(reflexVertices[4].equals(polygon[9])).toEqual(true);
    });

    it('_getReflexVertices throws an exception without an argument', function() {
        expect(function() {
            PolygonPipeline._getReflexVertices();
        }).toThrow();
    });

    it('checks if a point is a vertex', function() {
        var ring = [
            new Cartesian3(0.0, 0.0, 0.0),
            new Cartesian3(0.0, 1.0, 0.0),
            new Cartesian3(1.0, 1.0, 0.0),
            new Cartesian3(1.0, 0.0, 0.0),
        ];
        expect(PolygonPipeline._isVertex(ring, ring[0])).toEqual(true);
        expect(PolygonPipeline._isVertex(ring, new Cartesian3(1.0, 1.0, 1.0))).toEqual(false);
    });

    it('_isVertex throws an exception without a polygon', function() {
        expect(function() {
            PolygonPipeline._isVertex();
        }).toThrow();
    });

    it('_isVertex throws an exception without a point', function() {
        expect(function() {
            PolygonPipeline._isVertex([]);
        }).toThrow();
    });

    it('calculates point intersection with ring', function() {
        var ring = [
            new Cartesian3(0.0, 0.0, 0.0),
            new Cartesian3(0.0, 1.0, 0.0),
            new Cartesian3(1.0, 1.0, 0.0),
            new Cartesian3(1.0, 0.0, 0.0),
        ];
        var point = new Cartesian3(0.5, 0.5, 0.0);
        var result = PolygonPipeline._intersectPointWithRing(point, ring);
        expect(result.equals(new Cartesian3(1.0, 0.5, 0.0))).toEqual(true);
    });

    it('_intersectPointWithRing throws an exception without a point', function() {
        expect(function() {
            PolygonPipeline._intersectPointWithRing();
        }).toThrow();
    });

    it('_intersectPointWithRing throws an exception without a ring', function() {
        expect(function() {
            PolygonPipeline._intersectPointWithRing(new Cartesian3());
        }).toThrow();
    });

    it('finds mutually visible vertex', function() {
        var outerRing = [
            new Cartesian3(0.0, 5.0, 0.0),
            new Cartesian3(5.0, 10.0, 0.0),
            new Cartesian3(10.0, 5.0, 0.0),
            new Cartesian3(5.0, 0.0, 0.0),
            new Cartesian3(0.0, 5.0, 0.0)
        ];

        var innerRing = [
            new Cartesian3(3.0, 7.0, 0.0),
            new Cartesian3(3.0, 3.0, 0.0),
            new Cartesian3(7.0, 3.0, 0.0),
            new Cartesian3(7.0, 7.0, 0.0),
            new Cartesian3(3.0, 7.0, 0.0)
        ];

        var innerRings = [innerRing];
        var expectedResult = 3;
        var result = PolygonPipeline._getMutuallyVisibleVertexIndex(outerRing, innerRings);
        expect(result === expectedResult).toEqual(true);
    });

    it('_getMutuallyVisibleVertexIndex throws an exception without an outer ring', function() {
        expect(function() {
            PolygonPipeline._getMutuallyVisibleVertexIndex();
        }).toThrow();
    });

    it('_getMutuallyVisibleVertexIndex throws an exception with an empty outer ring', function() {
        expect(function() {
            PolygonPipeline._getMutuallyVisibleVertexIndex([]);
        }).toThrow();
    });

    it('_getMutuallyVisibleVertexIndex throws an exception without inner rings', function() {
        expect(function() {
            PolygonPipeline._getMutuallyVisibleVertexIndex([new Cartesian3()]);
        }).toThrow();
    });

    it('removes a hole from a polygon', function() {
        var outerRing = [
            new Cartographic(-122.0, 37.0, 0.0),
            new Cartographic(-121.9, 37.0, 0.0),
            new Cartographic(-121.9, 37.1, 0.0),
            new Cartographic(-122.0, 37.1, 0.0),
            new Cartographic(-122.0, 37.0, 0.0)
        ];

        var innerRing =[
            new Cartographic(-121.99, 37.01, 0.0),
            new Cartographic(-121.96, 37.01, 0.0),
            new Cartographic(-121.96, 37.04, 0.0),
            new Cartographic(-121.99, 37.04, 0.0),
            new Cartographic(-121.99, 37.01, 0.0)
        ];

        var innerRings = [innerRing];
        outerRing = PolygonPipeline.eliminateHole(outerRing, innerRings);
        expect(innerRings.length === 0).toEqual(true);
    });

    it('eliminateHole throws an exception without an outerRing', function() {
        expect(function() {
            PolygonPipeline.eliminateHole();
        }).toThrow();
    });

    it('eliminateHole throws an exception with an empty outerRing', function() {
        expect(function() {
            PolygonPipeline.eliminateHole([]);
        }).toThrow();
    });

    it('eliminateHole throws an exception without a second argument', function() {
        expect(function() {
            PolygonPipeline.eliminateHole([new Cartesian3()]);
        }).toThrow();
    });
});