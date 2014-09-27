
/*global defineSuite*/
defineSuite([
        'Core/PolygonGeometry',
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/Ellipsoid',
        'Core/Math',
        'Core/VertexFormat'
    ], function(
        PolygonGeometry,
        BoundingSphere,
        Cartesian3,
        Ellipsoid,
        CesiumMath,
        VertexFormat) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('throws without hierarchy', function() {
        expect(function() {
            return new PolygonGeometry();
        }).toThrowDeveloperError();
    });

    it('throws without positions', function() {
        expect(function() {
            return PolygonGeometry.fromPositions();
        }).toThrowDeveloperError();
    });

    it('throws with less than three positions', function() {
        expect(function() {
            return PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({ positions : [new Cartesian3()] }));
        }).toThrowDeveloperError();
    });

    it('throws with polygon hierarchy with less than three positions', function() {
        var hierarchy = {
            positions : [Cartesian3.fromDegrees(0,0)]
        };

        expect(function() {
            return PolygonGeometry.createGeometry(new PolygonGeometry({ polygonHierarchy : hierarchy }));
        }).toThrowDeveloperError();
    });

    it('throws due to duplicate positions', function() {
        expect(function() {
            return PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
                positions : Cartesian3.fromDegreesArray([
                    0.0, 0.0,
                    0.0, 0.0,
                    0.0, 0.0
                ])
            }));
        }).toThrowDeveloperError();
    });

    it('throws due to duplicate positions extruded', function() {
        expect(function() {
            return PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
                positions : Cartesian3.fromDegreesArray([
                    0.0, 0.0,
                    0.0, 0.0,
                    0.0, 0.0
                ]),
                extrudedHeight: 2
            }));
        }).toThrowDeveloperError();
    });

    it('throws due to duplicate hierarchy positions', function() {
        var hierarchy = {
                positions : Cartesian3.fromDegreesArray([
                    1.0, 1.0,
                    1.0, 1.0,
                    1.0, 1.0
                ]),
                holes : [{
                    positions : Cartesian3.fromDegreesArray([
                        0.0, 0.0,
                        0.0, 0.0,
                        0.0, 0.0
                    ])
                }]
        };

        expect(function() {
            return PolygonGeometry.createGeometry(new PolygonGeometry({
                polygonHierarchy : hierarchy
            }));
        }).toThrowDeveloperError();
    });

    it('computes positions', function() {
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            vertexformat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArray([
                -50.0, -50.0,
                50.0, -50.0,
                50.0, 50.0,
                -50.0, 50.0
            ]),
            granularity : CesiumMath.PI_OVER_THREE
        }));

        expect(p.attributes.position.values.length).toEqual(3 * 11);
        expect(p.indices.length).toEqual(3 * 14);
    });

    it('computes positions with per position heights', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var positions = Cartesian3.fromDegreesArrayHeights([
           -50.0, -50.0, 100000.0,
           50.0, -50.0, 0.0,
           50.0, 50.0, 0.0,
           -50.0, 50.0, 0.0
       ]);
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            positions : positions,
            granularity : CesiumMath.PI_OVER_THREE,
            perPositionHeight : true
        }));

        expect(ellipsoid.cartesianToCartographic(Cartesian3.fromArray(p.attributes.position.values, 0)).height).toEqualEpsilon(100000, CesiumMath.EPSILON6);
        expect(ellipsoid.cartesianToCartographic(Cartesian3.fromArray(p.attributes.position.values, 3)).height).toEqualEpsilon(0, CesiumMath.EPSILON6);
    });

    it('computes all attributes', function() {
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            vertexFormat : VertexFormat.ALL,
            positions : Cartesian3.fromDegreesArray([
                -50.0, -50.0,
                50.0, -50.0,
                50.0, 50.0,
                -50.0, 50.0
            ]),
            granularity : CesiumMath.PI_OVER_THREE
        }));

        expect(p.attributes.position.values.length).toEqual(3 * 11);
        expect(p.attributes.st.values.length).toEqual(2 * 11);
        expect(p.attributes.normal.values.length).toEqual(3 * 11);
        expect(p.attributes.tangent.values.length).toEqual(3 * 11);
        expect(p.attributes.binormal.values.length).toEqual(3 * 11);
        expect(p.indices.length).toEqual(3 * 14);
    });

    it('creates a polygon from hierarchy', function() {
        var hierarchy = {
            positions : Cartesian3.fromDegreesArray([
                -124.0, 35.0,
                -110.0, 35.0,
                -110.0, 40.0,
                -124.0, 40.0
            ]),
            holes : [{
                positions : Cartesian3.fromDegreesArray([
                    -122.0, 36.0,
                    -122.0, 39.0,
                    -112.0, 39.0,
                    -112.0, 36.0
                ]),
                holes : [{
                    positions : Cartesian3.fromDegreesArray([
                        -120.0, 36.5,
                        -114.0, 36.5,
                        -114.0, 38.5,
                        -120.0, 38.5
                    ])
                }]
            }]
        };

        var p = PolygonGeometry.createGeometry(new PolygonGeometry({
            vertexformat : VertexFormat.POSITION_ONLY,
            polygonHierarchy : hierarchy,
            granularity : CesiumMath.PI_OVER_THREE
        }));

        expect(p.attributes.position.values.length).toEqual(3 * 14);
        expect(p.indices.length).toEqual(3 * 10);
    });

    it('removes duplicates in polygon hierarchy', function() {
        var hierarchy = {
            positions : Cartesian3.fromDegreesArray([
                -124.0, 35.0,
                -110.0, 35.0,
                -110.0, 35.0,
                -110.0, 40.0,
                -124.0, 40.0
            ]),
            holes : [{
                positions : Cartesian3.fromDegreesArray([
                    -122.0, 36.0,
                    -122.0, 39.0,
                    -122.0, 39.0,
                    -112.0, 39.0,
                    -112.0, 36.0
                ]),
                holes : [{
                    positions : Cartesian3.fromDegreesArray([
                        -120.0, 36.5,
                        -114.0, 36.5,
                        -114.0, 36.5,
                        -114.0, 38.5,
                        -120.0, 38.5
                    ])
                }]
            }]
        };

        var p = PolygonGeometry.createGeometry(new PolygonGeometry({
            vertexformat : VertexFormat.POSITION_ONLY,
            polygonHierarchy : hierarchy,
            granularity : CesiumMath.PI_OVER_THREE
        }));

        expect(p.attributes.position.values.length).toEqual(3 * 14);
        expect(p.indices.length).toEqual(3 * 10);
    });

    it('creates a polygon from clockwise hierarchy', function() {
        var hierarchy = {
            positions : Cartesian3.fromDegreesArray([
                -124.0, 35.0,
                -124.0, 40.0,
                -110.0, 40.0,
                -110.0, 35.0
            ]),
            holes : [{
                positions : Cartesian3.fromDegreesArray([
                    -122.0, 36.0,
                    -112.0, 36.0,
                    -112.0, 39.0,
                    -122.0, 39.0
                ]),
                holes : [{
                    positions : Cartesian3.fromDegreesArray([
                        -120.0, 36.5,
                        -120.0, 38.5,
                        -114.0, 38.5,
                        -114.0, 36.5
                    ])
                }]
            }]
        };

        var p = PolygonGeometry.createGeometry(new PolygonGeometry({
            vertexformat : VertexFormat.POSITION_ONLY,
            polygonHierarchy : hierarchy,
            granularity : CesiumMath.PI_OVER_THREE
        }));

        expect(p.attributes.position.values.length).toEqual(3 * 14);
        expect(p.indices.length).toEqual(3 * 10);
    });

    it('computes correct bounding sphere at height 0', function() {
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            vertexFormat : VertexFormat.ALL,
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
        var height = 40000000.0;
        var positions = Cartesian3.fromDegreesArray([
            -108.0, 1.0,
            -108.0, -1.0,
            -106.0, -1.0,
            -106.0, 1.0
        ]);

        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            vertexFormat : VertexFormat.POSITIONS_ONLY,
            positions : positions,
            height : height
        }));

        var bs = BoundingSphere.fromPoints(Cartesian3.fromDegreesArrayHeights([
            -108.0, 1.0, height,
            -108.0, -1.0, height,
            -106.0, -1.0, height,
            -106.0, 1.0, height
        ]));
        expect(Math.abs(p.boundingSphere.radius - bs.radius)).toBeLessThan(100.0);
    });

    it('computes positions extruded', function() {
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArray([
                -50.0, -50.0,
                50.0, -50.0,
                50.0, 50.0,
                -50.0, 50.0
            ]),
            granularity : CesiumMath.PI_OVER_THREE,
            extrudedHeight: 30000
        }));

        expect(p.attributes.position.values.length).toEqual(3 * 21 * 2);
        expect(p.indices.length).toEqual(3 * 20 * 2);
    });

    it('removes duplicates extruded', function() {
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArray([
                -50.0, -50.0,
                50.0, -50.0,
                50.0, 50.0,
                -50.0, 50.0,
                -50.0, -50.0
            ]),
            granularity : CesiumMath.PI_OVER_THREE,
            extrudedHeight: 30000
        }));

        expect(p.attributes.position.values.length).toEqual(3 * 21 * 2);
        expect(p.indices.length).toEqual(3 * 20 * 2);
    });

    it('computes all attributes extruded', function() {
        var p = PolygonGeometry.createGeometry(new PolygonGeometry({
            vertexFormat : VertexFormat.ALL,
            polygonHierarchy: {
                    positions : Cartesian3.fromDegreesArray([
                        -50.0, -50.0,
                        50.0, -50.0,
                        50.0, 50.0,
                        -50.0, 50.0
                    ])},
            granularity : CesiumMath.PI_OVER_THREE,
            extrudedHeight: 30000
        }));

        expect(p.attributes.position.values.length).toEqual(3 * 21 * 2);
        expect(p.attributes.st.values.length).toEqual(2 * 21 * 2);
        expect(p.attributes.normal.values.length).toEqual(3 * 21 * 2);
        expect(p.attributes.tangent.values.length).toEqual(3 * 21 * 2);
        expect(p.attributes.binormal.values.length).toEqual(3 * 21 * 2);
        expect(p.indices.length).toEqual(3 * 20 * 2);
    });

    it('creates a polygon from hierarchy extruded', function() {
        var hierarchy = {
            positions : Cartesian3.fromDegreesArray([
                -124.0, 35.0,
                -110.0, 35.0,
                -110.0, 40.0,
                -124.0, 40.0
            ]),
            holes : [{
                positions : Cartesian3.fromDegreesArray([
                    -122.0, 36.0,
                    -122.0, 39.0,
                    -112.0, 39.0,
                    -112.0, 36.0
                ]),
                holes : [{
                    positions : Cartesian3.fromDegreesArray([
                        -120.0, 36.5,
                        -114.0, 36.5,
                        -114.0, 38.5,
                        -120.0, 38.5
                    ])
                }]
            }]
        };

        var p = PolygonGeometry.createGeometry(new PolygonGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            polygonHierarchy : hierarchy,
            granularity : CesiumMath.PI_OVER_THREE,
            extrudedHeight: 30000
        }));

        expect(p.attributes.position.values.length).toEqual(3 * 38 * 2);
        expect(p.indices.length).toEqual(3 * 22 * 2);
    });

});
