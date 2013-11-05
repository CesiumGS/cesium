/*global defineSuite*/
defineSuite([
         'Core/PolygonOutlineGeometry',
         'Core/BoundingSphere',
         'Core/Cartesian3',
         'Core/Cartographic',
         'Core/Ellipsoid',
         'Core/Math',
         'Core/Shapes'
     ], function(
         PolygonOutlineGeometry,
         BoundingSphere,
         Cartesian3,
         Cartographic,
         Ellipsoid,
         CesiumMath,
         Shapes) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('throws without hierarchy', function() {
        expect(function() {
            return new PolygonOutlineGeometry();
        }).toThrow();
    });

    it('throws without positions', function() {
        expect(function() {
            return PolygonOutlineGeometry.fromPositions();
        }).toThrow();
    });

    it('throws with less than three positions', function() {
        expect(function() {
            return PolygonOutlineGeometry.createGeometry(PolygonOutlineGeometry.fromPositions({ positions : [new Cartesian3()] }));
        }).toThrow();
    });

    it('throws with polygon hierarchy with less than three positions', function() {
        var hierarchy = {
            positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                new Cartographic()
            ])
        };

        expect(function() {
            return PolygonOutlineGeometry.createGeometry(new PolygonOutlineGeometry({ polygonHierarchy : hierarchy }));
        }).toThrow();
    });

    it('throws due to duplicate positions', function() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;

        expect(function() {
            return PolygonOutlineGeometry.createGeometry(PolygonOutlineGeometry.fromPositions({
                positions : [
                    ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(0.0, 0.0, 0.0)),
                    ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(0.0, 0.0, 0.0)),
                    ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(0.0, 0.0, 0.0))
                ],
                ellipsoid : ellipsoid
            }));
        }).toThrow();
    });


    it('throws due to duplicate positions extruded', function() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;

        expect(function() {
            return PolygonOutlineGeometry.createGeometry(PolygonOutlineGeometry.fromPositions({
                positions : [
                    ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(0.0, 0.0, 0.0)),
                    ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(0.0, 0.0, 0.0)),
                    ellipsoid.cartographicToCartesian(Cartographic.fromDegrees(0.0, 0.0, 0.0))
                ],
                ellipsoid : ellipsoid,
                extrudedeHeight: 2
            }));
        }).toThrow();
    });

    it('throws due to duplicate hierarchy positions', function() {
        var ellipsoid = Ellipsoid.UNIT_SPHERE;
        var hierarchy = {
                positions : ellipsoid.cartographicArrayToCartesianArray([
                    Cartographic.fromDegrees(1.0, 1.0, 0.0),
                    Cartographic.fromDegrees(1.0, 1.0, 0.0),
                    Cartographic.fromDegrees(1.0, 1.0, 0.0)
                ]),
                holes : [{
                    positions : ellipsoid.cartographicArrayToCartesianArray([
                        Cartographic.fromDegrees(0.0, 0.0, 0.0),
                        Cartographic.fromDegrees(0.0, 0.0, 0.0),
                        Cartographic.fromDegrees(0.0, 0.0, 0.0)
                    ])
                }]
        };

        expect(function() {
            return PolygonOutlineGeometry.createGeometry(new PolygonOutlineGeometry({
                polygonHierarchy : hierarchy,
                ellipsoid : ellipsoid
            }));
        }).toThrow();
    });

    it('computes positions', function() {
        var p = PolygonOutlineGeometry.createGeometry(PolygonOutlineGeometry.fromPositions({
            positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                Cartographic.fromDegrees(-50.0, -50.0, 0.0),
                Cartographic.fromDegrees(50.0, -50.0, 0.0),
                Cartographic.fromDegrees(50.0, 50.0, 0.0),
                Cartographic.fromDegrees(-50.0, 50.0, 0.0)
            ]),
            granularity : CesiumMath.PI_OVER_THREE
        }));

        expect(p.attributes.position.values.length).toEqual(3 * 6);
        expect(p.indices.length).toEqual(2 * 6);
    });

    it('computes positions with per position heights', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var positions = ellipsoid.cartographicArrayToCartesianArray([
           Cartographic.fromDegrees(-50.0, -50.0, 100000.0),
           Cartographic.fromDegrees(50.0, -50.0, 0.0),
           Cartographic.fromDegrees(50.0, 50.0, 0.0),
           Cartographic.fromDegrees(-50.0, 50.0, 0.0)
       ]);
        var p = PolygonOutlineGeometry.createGeometry(PolygonOutlineGeometry.fromPositions({
            positions : positions,
            granularity : CesiumMath.PI_OVER_THREE,
            perPositionHeight : true
        }));

        expect(ellipsoid.cartesianToCartographic(Cartesian3.fromArray(p.attributes.position.values, 0)).height).toEqualEpsilon(100000, CesiumMath.EPSILON6);
        expect(ellipsoid.cartesianToCartographic(Cartesian3.fromArray(p.attributes.position.values, 3)).height).toEqualEpsilon(0, CesiumMath.EPSILON6);
    });

    it('creates a polygon from hierarchy', function() {
        var hierarchy = {
            positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                Cartographic.fromDegrees(-124.0, 35.0, 0.0),
                Cartographic.fromDegrees(-110.0, 35.0, 0.0),
                Cartographic.fromDegrees(-110.0, 40.0, 0.0),
                Cartographic.fromDegrees(-124.0, 40.0, 0.0)
            ]),
            holes : [{
                positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                    Cartographic.fromDegrees(-122.0, 36.0, 0.0),
                    Cartographic.fromDegrees(-122.0, 39.0, 0.0),
                    Cartographic.fromDegrees(-112.0, 39.0, 0.0),
                    Cartographic.fromDegrees(-112.0, 36.0, 0.0)
                ]),
                holes : [{
                    positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                        Cartographic.fromDegrees(-120.0, 36.5, 0.0),
                        Cartographic.fromDegrees(-114.0, 36.5, 0.0),
                        Cartographic.fromDegrees(-114.0, 38.5, 0.0),
                        Cartographic.fromDegrees(-120.0, 38.5, 0.0)
                    ])
                }]
            }]
        };

        var p = PolygonOutlineGeometry.createGeometry(new PolygonOutlineGeometry({
            polygonHierarchy : hierarchy,
            granularity : CesiumMath.PI_OVER_THREE
        }));

        expect(p.attributes.position.values.length).toEqual(3 * 12);
        expect(p.indices.length).toEqual(2 * 12);
    });

    it('creates a polygon from clockwise hierarchy', function() {
        var hierarchy = {
            positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                Cartographic.fromDegrees(-124.0, 35.0, 0.0),
                Cartographic.fromDegrees(-124.0, 40.0, 0.0),
                Cartographic.fromDegrees(-110.0, 40.0, 0.0),
                Cartographic.fromDegrees(-110.0, 35.0, 0.0)
            ]),
            holes : [{
                positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                    Cartographic.fromDegrees(-122.0, 36.0, 0.0),
                    Cartographic.fromDegrees(-112.0, 36.0, 0.0),
                    Cartographic.fromDegrees(-112.0, 39.0, 0.0),
                    Cartographic.fromDegrees(-122.0, 39.0, 0.0)
                ]),
                holes : [{
                    positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                        Cartographic.fromDegrees(-120.0, 36.5, 0.0),
                        Cartographic.fromDegrees(-120.0, 38.5, 0.0),
                        Cartographic.fromDegrees(-114.0, 38.5, 0.0),
                        Cartographic.fromDegrees(-114.0, 36.5, 0.0)
                    ])
                }]
            }]
        };

        var p = PolygonOutlineGeometry.createGeometry(new PolygonOutlineGeometry({
            polygonHierarchy : hierarchy,
            granularity : CesiumMath.PI_OVER_THREE
        }));

        expect(p.attributes.position.values.length).toEqual(3 * 12);
        expect(p.indices.length).toEqual(2 * 12);
    });

    it('computes correct bounding sphere at height 0', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var center = new Cartographic(0.2930215893394521, 0.818292397338644, 1880.6159971414636);
        var positions = Shapes.computeCircleBoundary(ellipsoid, ellipsoid.cartographicToCartesian(center), 10000);

        var p = PolygonOutlineGeometry.createGeometry(PolygonOutlineGeometry.fromPositions({
            positions : positions,
            granularity : CesiumMath.PI_OVER_THREE
        }));

        expect(p.boundingSphere).toEqual(BoundingSphere.fromPoints(positions));
    });

    it('computes positions extruded', function() {
        var p = PolygonOutlineGeometry.createGeometry(PolygonOutlineGeometry.fromPositions({
            positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                Cartographic.fromDegrees(-50.0, -50.0, 0.0),
                Cartographic.fromDegrees(50.0, -50.0, 0.0),
                Cartographic.fromDegrees(50.0, 50.0, 0.0),
                Cartographic.fromDegrees(-50.0, 50.0, 0.0)
            ]),
            granularity : CesiumMath.PI_OVER_THREE,
            extrudedHeight: 30000
        }));

        expect(p.attributes.position.values.length).toEqual(3 * 6 * 2);
        expect(p.indices.length).toEqual(2 * 6 * 2 + 4*2);
    });

    it('creates a polygon from hierarchy extruded', function() {
        var hierarchy = {
            positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                Cartographic.fromDegrees(-124.0, 35.0, 0.0),
                Cartographic.fromDegrees(-110.0, 35.0, 0.0),
                Cartographic.fromDegrees(-110.0, 40.0, 0.0),
                Cartographic.fromDegrees(-124.0, 40.0, 0.0)
            ]),
            holes : [{
                positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                    Cartographic.fromDegrees(-122.0, 36.0, 0.0),
                    Cartographic.fromDegrees(-122.0, 39.0, 0.0),
                    Cartographic.fromDegrees(-112.0, 39.0, 0.0),
                    Cartographic.fromDegrees(-112.0, 36.0, 0.0)
                ]),
                holes : [{
                    positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                        Cartographic.fromDegrees(-120.0, 36.5, 0.0),
                        Cartographic.fromDegrees(-114.0, 36.5, 0.0),
                        Cartographic.fromDegrees(-114.0, 38.5, 0.0),
                        Cartographic.fromDegrees(-120.0, 38.5, 0.0)
                    ])
                }]
            }]
        };

        var p = PolygonOutlineGeometry.createGeometry(new PolygonOutlineGeometry({
            polygonHierarchy : hierarchy,
            granularity : CesiumMath.PI_OVER_THREE,
            extrudedHeight: 30000
        }));

        expect(p.attributes.position.values.length).toEqual(3 * 12 * 2);
        expect(p.indices.length).toEqual(2 * 12 * 2 + 12*2);
    });

});
