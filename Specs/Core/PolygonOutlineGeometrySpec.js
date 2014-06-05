/*global defineSuite*/
defineSuite([
        'Core/PolygonOutlineGeometry',
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/Cartographic',
        'Core/Ellipsoid',
        'Core/Math'
    ], function(
        PolygonOutlineGeometry,
        BoundingSphere,
        Cartesian3,
        Cartographic,
        Ellipsoid,
        CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('throws without hierarchy', function() {
        expect(function() {
            return new PolygonOutlineGeometry();
        }).toThrowDeveloperError();
    });

    it('throws without positions', function() {
        expect(function() {
            return PolygonOutlineGeometry.fromPositions();
        }).toThrowDeveloperError();
    });

    it('throws with less than three positions', function() {
        expect(function() {
            return PolygonOutlineGeometry.createGeometry(PolygonOutlineGeometry.fromPositions({ positions : [new Cartesian3()] }));
        }).toThrowDeveloperError();
    });

    it('throws with polygon hierarchy with less than three positions', function() {
        var hierarchy = {
            positions : Ellipsoid.WGS84.cartographicArrayToCartesianArray([
                new Cartographic()
            ])
        };

        expect(function() {
            return PolygonOutlineGeometry.createGeometry(new PolygonOutlineGeometry({ polygonHierarchy : hierarchy }));
        }).toThrowDeveloperError();
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
        }).toThrowDeveloperError();
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
        }).toThrowDeveloperError();
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
        }).toThrowDeveloperError();
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
        var p = PolygonOutlineGeometry.createGeometry(PolygonOutlineGeometry.fromPositions({
            positions : Cartesian3.fromDegreesArray([
                -108.0, 1.0,
                -108.0, -1.0,
                -106.0, -1.0,
                -106.0, 1.0
            ]),
            granularity : CesiumMath.PI_OVER_THREE
        }));

        var bs = BoundingSphere.fromVertices(p.attributes.position.values);
        expect(p.boundingSphere.center).toEqualEpsilon(bs.center, CesiumMath.EPSILON9);
        expect(p.boundingSphere.radius).toEqualEpsilon(bs.radius, CesiumMath.EPSILON9);
    });

    it('computes correct bounding sphere at height >>> 0', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var height = 40000000.0;
        var positions = ellipsoid.cartographicArrayToCartesianArray([
            Cartographic.fromDegrees(-108.0, 1.0),
            Cartographic.fromDegrees(-108.0, -1.0),
            Cartographic.fromDegrees(-106.0, -1.0),
            Cartographic.fromDegrees(-106.0, 1.0)
        ]);

        var p = PolygonOutlineGeometry.createGeometry(PolygonOutlineGeometry.fromPositions({
            positions : positions,
            height : height
        }));

        var bs = BoundingSphere.fromPoints(ellipsoid.cartographicArrayToCartesianArray([
            Cartographic.fromDegrees(-108.0, 1.0, height),
            Cartographic.fromDegrees(-108.0, -1.0, height),
            Cartographic.fromDegrees(-106.0, -1.0, height),
            Cartographic.fromDegrees(-106.0, 1.0, height)
        ]));
        expect(Math.abs(p.boundingSphere.radius - bs.radius)).toBeLessThan(100.0);
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
