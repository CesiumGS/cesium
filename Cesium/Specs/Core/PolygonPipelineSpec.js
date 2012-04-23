(function() {
    "use strict";
    /*global Cesium, describe, it, expect*/

    describe("PolygonPipline", function () {

        it("cleanUp removes duplicate points", function () {
            var positions = Cesium.PolygonPipeline.cleanUp([
                new Cesium.Cartesian3(1.0, 1.0, 1.0),
                new Cesium.Cartesian3(2.0, 2.0, 2.0),
                new Cesium.Cartesian3(2.0, 2.0, 2.0),
                new Cesium.Cartesian3(3.0, 3.0, 3.0)
            ]);

            expect(positions).toEqualArray([
                new Cesium.Cartesian3(1.0, 1.0, 1.0),
                new Cesium.Cartesian3(2.0, 2.0, 2.0),
                new Cesium.Cartesian3(3.0, 3.0, 3.0)
            ]);
        });

        it("cleanUp removes duplicate first and last points", function () {
            var positions = Cesium.PolygonPipeline.cleanUp([
                new Cesium.Cartesian3(1.0, 1.0, 1.0),
                new Cesium.Cartesian3(2.0, 2.0, 2.0),
                new Cesium.Cartesian3(3.0, 3.0, 3.0),
                new Cesium.Cartesian3(1.0, 1.0, 1.0)
            ]);

            expect(positions).toEqualArray([
                new Cesium.Cartesian3(2.0, 2.0, 2.0),
                new Cesium.Cartesian3(3.0, 3.0, 3.0),
                new Cesium.Cartesian3(1.0, 1.0, 1.0)
            ]);
        });

        it("cleanUp throws without positions", function () {
            expect( function () {
                Cesium.PolygonPipeline.cleanUp();
            }).toThrow();
        });

        it("cleanUp throws without three positions", function () {
            expect( function () {
                Cesium.PolygonPipeline.cleanUp([Cesium.Cartesian3.getZero(), Cesium.Cartesian3.getZero()]);
            }).toThrow();
        });

        ///////////////////////////////////////////////////////////////////////

        it("EllipsoidTangentPlane projects a point", function () {
            var ellipsoid = Cesium.Ellipsoid.getWgs84();
            var p = ellipsoid.toCartesian(Cesium.Cartographic3.getZero());

            var tangentPlane = Cesium.EllipsoidTangentPlane.create(ellipsoid, [p]);
            var projectedP = tangentPlane.projectPointsOntoPlane([p]);

            expect(projectedP.length).toEqual(1);
            expect(projectedP[0].equals(Cesium.Cartesian2.getZero())).toBeTruthy();
        });

        it("EllipsoidTangentPlane throws without ellipsoid", function () {
            expect( function () {
                return Cesium.EllipsoidTangentPlane.create();
            }).toThrow();
        });

        it("EllipsoidTangentPlane throws without positions", function () {
            var ellipsoid = Cesium.Ellipsoid.getWgs84();

            expect( function () {
                return Cesium.EllipsoidTangentPlane.create(ellipsoid);
            }).toThrow();
        });

        it("projectPointsOntoPlane throws without positions", function () {
            var ellipsoid = Cesium.Ellipsoid.getWgs84();
            var p = ellipsoid.toCartesian(Cesium.Cartographic3.getZero());
            var tangentPlane = Cesium.EllipsoidTangentPlane.create(ellipsoid, [p]);

            expect( function () {
                return tangentPlane.projectPointsOntoPlane();
            }).toThrow();
        });

        ///////////////////////////////////////////////////////////////////////

        it("computeArea2D computes a positive area", function () {
            var area = Cesium.PolygonPipeline.computeArea2D([
                new Cesium.Cartesian2(0.0, 0.0),
                new Cesium.Cartesian2(2.0, 0.0),
                new Cesium.Cartesian2(2.0, 1.0),
                new Cesium.Cartesian2(0.0, 1.0)
            ]);

            expect(area).toEqual(2.0);
        });

        it("computeArea2D computes a negative area", function () {
            var area = Cesium.PolygonPipeline.computeArea2D([
                new Cesium.Cartesian2(0.0, 0.0),
                new Cesium.Cartesian2(0.0, 2.0),
                new Cesium.Cartesian2(1.0, 2.0),
                new Cesium.Cartesian2(1.0, 0.0)
            ]);

            expect(area).toEqual(-2.0);
        });

        it("computeArea2D throws without positions", function () {
            expect( function () {
                Cesium.PolygonPipeline.computeArea2D();
            }).toThrow();
        });

        it("computeArea2D throws without three positions", function () {
            expect( function () {
                Cesium.PolygonPipeline.computeArea2D([Cesium.Cartesian3.getZero(), Cesium.Cartesian3.getZero()]);
            }).toThrow();
        });

        ///////////////////////////////////////////////////////////////////////

        it("computeWindingOrder2D computes counter-clockwise", function () {
            var area = Cesium.PolygonPipeline.computeWindingOrder2D([
                new Cesium.Cartesian2(0.0, 0.0),
                new Cesium.Cartesian2(2.0, 0.0),
                new Cesium.Cartesian2(2.0, 1.0),
                new Cesium.Cartesian2(0.0, 1.0)
            ]);

            expect(area).toEqual(Cesium.WindingOrder.COUNTER_CLOCKWISE);
        });

        it("computeWindingOrder2D computes clockwise", function () {
            var area = Cesium.PolygonPipeline.computeWindingOrder2D([
                new Cesium.Cartesian2(0.0, 0.0),
                new Cesium.Cartesian2(0.0, 2.0),
                new Cesium.Cartesian2(1.0, 2.0),
                new Cesium.Cartesian2(1.0, 0.0)
            ]);

            expect(area).toEqual(Cesium.WindingOrder.CLOCKWISE);
        });

        it("computeWindingOrder2D throws without positions", function () {
            expect( function () {
                Cesium.PolygonPipeline.computeWindingOrder2D();
            }).toThrow();
        });

        it("computeWindingOrder2D throws without three positions", function () {
            expect( function () {
                Cesium.PolygonPipeline.computeWindingOrder2D([Cesium.Cartesian3.getZero(), Cesium.Cartesian3.getZero()]);
            }).toThrow();
        });

        ///////////////////////////////////////////////////////////////////////

        it("earClip2D triangulates a triangle", function () {
            var indices = Cesium.PolygonPipeline.earClip2D([
                new Cesium.Cartesian2(0.0, 0.0),
                new Cesium.Cartesian2(1.0, 0.0),
                new Cesium.Cartesian2(0.0, 1.0)
            ]);

            expect(indices).toEqualArray([0, 1, 2]);
        });

        it("earClip2D triangulates a square", function () {
            var indices = Cesium.PolygonPipeline.earClip2D([
                new Cesium.Cartesian2(0.0, 0.0),
                new Cesium.Cartesian2(1.0, 0.0),
                new Cesium.Cartesian2(1.0, 1.0),
                new Cesium.Cartesian2(0.0, 1.0)
            ]);

            expect(indices).toEqualArray([
                0, 1, 2,
                0, 2, 3
            ]);
        });

        it("earClip2D triangulates simple concave", function () {
            var positions = [
                new Cesium.Cartesian2(0.0, 0.0),
                new Cesium.Cartesian2(2.0, 0.0),
                new Cesium.Cartesian2(2.0, 2.0),
                new Cesium.Cartesian2(1.0, 0.25),
                new Cesium.Cartesian2(0.0, 2.0)
            ];

            var indices = Cesium.PolygonPipeline.earClip2D(positions);

            expect(indices).toEqualArray([
                1, 2, 3,
                3, 4, 0,
                0, 1, 3
            ]);
        });

        it("earClip2D triangulates complex concave", function () {
            var positions = [
                new Cesium.Cartesian2(0.0, 0.0),
                new Cesium.Cartesian2(2.0, 0.0),
                new Cesium.Cartesian2(2.0, 1.0),
                new Cesium.Cartesian2(0.1, 1.5),
                new Cesium.Cartesian2(2.0, 2.0),
                new Cesium.Cartesian2(0.0, 2.0),
                new Cesium.Cartesian2(0.0, 1.0),
                new Cesium.Cartesian2(1.9, 0.5)
            ];

            var indices = Cesium.PolygonPipeline.earClip2D(positions);

            expect(indices).toEqualArray([
                3, 4, 5,
                3, 5, 6,
                3, 6, 7,
                7, 0, 1,
                7, 1, 2,
                2, 3, 7
            ]);
        });

        it("earClip2D throws without positions", function () {
            expect( function () {
                Cesium.PolygonPipeline.earClip2D();
            }).toThrow();
        });

        it("earClip2D throws without three positions", function () {
            expect( function () {
                Cesium.PolygonPipeline.earClip2D([Cesium.Cartesian2.getZero(), Cesium.Cartesian2.getZero()]);
            }).toThrow();
        });
    });

    describe("Shapes", function () {

        it("computeCircleBoundary computes a closed loop", function () {
            var ellipsoid = Cesium.Ellipsoid.getWgs84();
            var center = ellipsoid.toCartesian(Cesium.Cartographic3.getZero());
            var positions = Cesium.Shapes.computeCircleBoundary(ellipsoid, center, 1.0);

            expect(positions[0].equals(positions[positions.length - 1])).toBeTruthy();
        });

        it("computeCircleBoundary uses custom granularity", function () {
            var ellipsoid = Cesium.Ellipsoid.getWgs84();
            var center = ellipsoid.toCartesian(Cesium.Cartographic3.getZero());
            var positions = Cesium.Shapes.computeCircleBoundary(ellipsoid, center, 1.0, Cesium.Math.toRadians(60));

            expect(positions.length).toEqual(10);
        });

        it("computeCircleBoundary throws without an ellipsoid", function () {
            expect( function () {
                Cesium.Shapes.computeCircleBoundary();
            }).toThrow();
        });

        it("computeCircleBoundary throws without a center", function () {
            var ellipsoid = Cesium.Ellipsoid.getWgs84();
            expect( function () {
                Cesium.Shapes.computeCircleBoundary(ellipsoid);
            }).toThrow();
        });

        it("computeCircleBoundary throws without a radius", function () {
            var ellipsoid = Cesium.Ellipsoid.getWgs84();
            var center = ellipsoid.toCartesian(Cesium.Cartographic3.getZero());
            expect( function () {
                Cesium.Shapes.computeCircleBoundary(ellipsoid, center);
            }).toThrow();
        });

        it("computeCircleBoundary throws with a negative radius", function () {
            var ellipsoid = Cesium.Ellipsoid.getWgs84();
            var center = ellipsoid.toCartesian(Cesium.Cartographic3.getZero());
            expect( function () {
                Cesium.Shapes.computeCircleBoundary(ellipsoid, center, -1.0);
            }).toThrow();
        });

        it("computeCircleBoundary throws with a negative granularity", function () {
            var ellipsoid = Cesium.Ellipsoid.getWgs84();
            var center = ellipsoid.toCartesian(Cesium.Cartographic3.getZero());
            expect( function () {
                Cesium.Shapes.computeCircleBoundary(ellipsoid, center, 1.0, -1.0);
            }).toThrow();
        });

        it("computeEllipseBoundary computes a closed loop", function () {
            var ellipsoid = Cesium.Ellipsoid.getWgs84();
            var center = ellipsoid.toCartesian(Cesium.Cartographic3.getZero());
            var positions = Cesium.Shapes.computeEllipseBoundary(ellipsoid, center, 5.0, 1.0);

            expect(positions[0].equals(positions[positions.length - 1])).toBeTruthy();
        });

        it("computeEllipseBoundary can swap the semi major and minor axes", function () {
            var ellipsoid = Cesium.Ellipsoid.getWgs84();
            var center = ellipsoid.toCartesian(Cesium.Cartographic3.getZero());
            var points = Cesium.Shapes.computeEllipseBoundary(ellipsoid, center, 1.0, 5.0);
            expect(points.length).toBeGreaterThan(0);
        });

        it("computeEllipseBoundary throws without an ellipsoid", function () {
            expect( function () {
                Cesium.Shapes.computeEllipseBoundary();
            }).toThrow();
        });

        it("computeEllipseBoundary throws without a center", function () {
            var ellipsoid = Cesium.Ellipsoid.getWgs84();
            expect( function () {
                Cesium.Shapes.computeEllipseBoundary(ellipsoid);
            }).toThrow();
        });

        it("computeEllipseBoundary throws without a semi-major axis", function () {
            var ellipsoid = Cesium.Ellipsoid.getWgs84();
            var center = ellipsoid.toCartesian(Cesium.Cartographic3.getZero());
            expect( function () {
                Cesium.Shapes.computeEllipseBoundary(ellipsoid, center, 1.0);
            }).toThrow();
        });

        it("computeEllipseBoundary with a negative axis length", function () {
            var ellipsoid = Cesium.Ellipsoid.getWgs84();
            var center = ellipsoid.toCartesian(Cesium.Cartographic3.getZero());
            expect( function () {
                Cesium.Shapes.computeEllipseBoundary(ellipsoid, center, -1.0, 1.0);
            }).toThrow();
            expect( function () {
                Cesium.Shapes.computeEllipseBoundary(ellipsoid, center, 1.0, -1.0);
            }).toThrow();
        });

        it("computeEllipseBoundary throws with a negative granularity", function () {
            var ellipsoid = Cesium.Ellipsoid.getWgs84();
            var center = ellipsoid.toCartesian(Cesium.Cartographic3.getZero());
            expect( function () {
                Cesium.Shapes.computeEllipseBoundary(ellipsoid, center, 1.0, 1.0, 0, -1.0);
            }).toThrow();
        });

    });

})();