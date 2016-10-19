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
    'use strict';

    beforeEach(function() {
        CesiumMath.setRandomNumberSeed(0.0);
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

    describe('triangulate', function() {
        // Test integration with earcut.js
        // The package is tested independently. See https://github.com/mapbox/earcut

        it('throws without positions', function() {
            expect(function() {
                PolygonPipeline.triangulate(undefined, []);
            }).toThrowDeveloperError();
        });

        it('a triangle', function() {
            var positions = [new Cartesian2(0.0, 0.0), new Cartesian2(1.0, 0.0), new Cartesian2(0.0, 1.0)];
            var indices = PolygonPipeline.triangulate(positions, []);
            expect(indices).toEqual([1, 2, 0]);
        });

        it('a square', function() {
            var positions = [new Cartesian2(0.0, 0.0), new Cartesian2(1.0, 0.0), new Cartesian2(1.0, 1.0), new Cartesian2(0.0, 1.0)];
            var indices = PolygonPipeline.triangulate(positions, []);
            expect(indices).toEqual([2, 3, 0, 0, 1, 2]);
        });

        it('eliminates holes', function() {
            var positions = [new Cartesian2(0.0, 0.0), new Cartesian2(3.0, 0.0), new Cartesian2(3.0, 3.0), new Cartesian2(0.0, 3.0)];
            var hole = [new Cartesian2(1.0, 1.0), new Cartesian2(2.0, 1.0), new Cartesian2(2.0, 2.0), new Cartesian2(1.0, 2.0)];

            var combinedPositions = positions.concat(hole);
            var indices = PolygonPipeline.triangulate(combinedPositions, [4]);

            expect(indices).toEqual([3, 0, 4, 5, 4, 0, 3, 4, 7, 5, 0, 1, 2, 3, 7, 6, 5, 1, 2, 7, 6, 6, 1, 2]);
        });

        it('eliminates multiple holes', function() {
            var positions = [new Cartesian2(0.0, 0.0), new Cartesian2(3.0, 0.0), new Cartesian2(3.0, 5.0), new Cartesian2(0.0, 5.0)];
            var bottomHole = [new Cartesian2(1.0, 1.0), new Cartesian2(2.0, 1.0), new Cartesian2(2.0, 2.0), new Cartesian2(1.0, 2.0)];
            var topHole = [new Cartesian2(1.0, 3.0), new Cartesian2(2.0, 3.0), new Cartesian2(2.0, 4.0), new Cartesian2(1.0, 4.0)];

            var combinedPositions = positions.concat(bottomHole).concat(topHole);
            var indices = PolygonPipeline.triangulate(combinedPositions, [4, 8]);

            expect(indices).toEqual([0, 8, 11, 0, 4, 7, 5, 4, 0, 3, 0, 11, 8, 0, 7, 5, 0, 1, 2, 3, 11, 9, 8, 7, 6, 5, 1, 2, 11, 10, 9, 7, 6, 6, 1, 2, 2, 10, 9, 9, 6, 2]);
        });
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
});
