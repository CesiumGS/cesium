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
    /*global it,expect*/

    it('cleanUp removes duplicate points', function() {
        var positions = PolygonPipeline.cleanUp([
                                                 new Cartesian3(1.0, 1.0, 1.0),
                                                 new Cartesian3(2.0, 2.0, 2.0),
                                                 new Cartesian3(2.0, 2.0, 2.0),
                                                 new Cartesian3(3.0, 3.0, 3.0)
                                                ]);

        expect(positions).toEqualArray([
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

        expect(positions).toEqualArray([
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
        expect(projectedP[0].equals(Cartesian2.ZERO)).toEqual(true);
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

        expect(indices).toEqualArray([0, 1, 2]);
    });

    it('earClip2D triangulates a square', function() {
        var indices = PolygonPipeline.earClip2D([new Cartesian2(0.0, 0.0), new Cartesian2(1.0, 0.0), new Cartesian2(1.0, 1.0), new Cartesian2(0.0, 1.0)]);

        expect(indices).toEqualArray([0, 1, 2, 0, 2, 3]);
    });

    it('earClip2D triangulates simple concave', function() {
        var positions = [new Cartesian2(0.0, 0.0), new Cartesian2(2.0, 0.0), new Cartesian2(2.0, 2.0), new Cartesian2(1.0, 0.25), new Cartesian2(0.0, 2.0)];

        var indices = PolygonPipeline.earClip2D(positions);

        expect(indices).toEqualArray([1, 2, 3, 3, 4, 0, 0, 1, 3]);
    });

    it('earClip2D triangulates complex concave', function() {
        var positions = [new Cartesian2(0.0, 0.0), new Cartesian2(2.0, 0.0), new Cartesian2(2.0, 1.0), new Cartesian2(0.1, 1.5), new Cartesian2(2.0, 2.0), new Cartesian2(0.0, 2.0),
                new Cartesian2(0.0, 1.0), new Cartesian2(1.9, 0.5)];

        var indices = PolygonPipeline.earClip2D(positions);

        expect(indices).toEqualArray([3, 4, 5, 3, 5, 6, 3, 6, 7, 7, 0, 1, 7, 1, 2, 2, 3, 7]);
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
});