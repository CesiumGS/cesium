
/*global defineSuite*/
defineSuite([
        'Core/PolygonGeometry',
        'Core/BoundingSphere',
        'Core/Cartesian3',
        'Core/Ellipsoid',
        'Core/Math',
        'Core/VertexFormat',
        'Specs/createPackableSpecs'
    ], function(
        PolygonGeometry,
        BoundingSphere,
        Cartesian3,
        Ellipsoid,
        CesiumMath,
        VertexFormat,
        createPackableSpecs) {
    'use strict';

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

    it('returns undefined with less than three positions', function() {
        expect(PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            positions : [new Cartesian3()]
        }))).toBeUndefined();
    });

    it('returns undefined with polygon hierarchy with less than three positions', function() {
        expect(PolygonGeometry.createGeometry(new PolygonGeometry({
            polygonHierarchy : {
                positions : [Cartesian3.fromDegrees(0, 0)]
            }
        }))).toBeUndefined();
    });

    it('createGeometry returns undefined due to duplicate positions', function() {
        var geometry = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            positions : Cartesian3.fromDegreesArray([
                0.0, 0.0,
                0.0, 0.0,
                0.0, 0.0
            ])
        }));
        expect(geometry).toBeUndefined();
    });

    it('createGeometry returns undefined due to duplicate positions extruded', function() {
        var geometry = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            positions : Cartesian3.fromDegreesArray([
                0.0, 0.0,
                0.0, 0.0,
                0.0, 0.0
            ]),
            extrudedHeight: 2
        }));
        expect(geometry).toBeUndefined();
    });

    it('createGeometry returns undefined due to duplicate hierarchy positions', function() {
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

        var geometry = PolygonGeometry.createGeometry(new PolygonGeometry({ polygonHierarchy : hierarchy }));
        expect(geometry).toBeUndefined();
    });

    it('computes positions', function() {
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArray([
                -1.0, -1.0,
                1.0, -1.0,
                1.0, 1.0,
                -1.0, 1.0
            ]),
            granularity: CesiumMath.RADIANS_PER_DEGREE
        }));

        expect(p.attributes.position.values.length).toEqual(13 * 3); // 8 around edge + 5 in the middle
        expect(p.indices.length).toEqual(16 * 3); //4 squares * 4 triangles per square
    });

    it('computes positions with per position heights', function() {
        var ellipsoid = Ellipsoid.WGS84;
        var height = 100.0;
        var positions = Cartesian3.fromDegreesArrayHeights([
           -1.0, -1.0, height,
           1.0, -1.0, 0.0,
           1.0, 1.0, 0.0,
           -1.0, 1.0, 0.0
       ]);
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            positions : positions,
            perPositionHeight : true
        }));

        expect(ellipsoid.cartesianToCartographic(Cartesian3.fromArray(p.attributes.position.values, 0)).height).toEqualEpsilon(height, CesiumMath.EPSILON6);
        expect(ellipsoid.cartesianToCartographic(Cartesian3.fromArray(p.attributes.position.values, 3)).height).toEqualEpsilon(0, CesiumMath.EPSILON6);
    });

    it('computes all attributes', function() {
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            vertexFormat : VertexFormat.ALL,
            positions : Cartesian3.fromDegreesArray([
                -1.0, -1.0,
                1.0, -1.0,
                1.0, 1.0,
                -1.0, 1.0
            ])
        }));

        var numVertices = 13;
        var numTriangles = 16;
        expect(p.attributes.position.values.length).toEqual(numVertices * 3);
        expect(p.attributes.st.values.length).toEqual(numVertices * 2);
        expect(p.attributes.normal.values.length).toEqual(numVertices * 3);
        expect(p.attributes.tangent.values.length).toEqual(numVertices * 3);
        expect(p.attributes.binormal.values.length).toEqual(numVertices * 3);
        expect(p.indices.length).toEqual(numTriangles * 3);
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
            vertexFormat : VertexFormat.POSITION_ONLY,
            polygonHierarchy : hierarchy,
            granularity : CesiumMath.PI_OVER_THREE
        }));

        expect(p.attributes.position.values.length).toEqual(14 * 3); // 4 points * 3 rectangles + 2 points duplicated at corner
        expect(p.indices.length).toEqual(10 * 3);
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
            vertexFormat : VertexFormat.POSITION_ONLY,
            polygonHierarchy : hierarchy,
            granularity : CesiumMath.PI_OVER_THREE
        }));

        expect(p.attributes.position.values.length).toEqual(14 * 3);
        expect(p.indices.length).toEqual(10 * 3);
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
            vertexFormat : VertexFormat.POSITION_ONLY,
            polygonHierarchy : hierarchy,
            granularity : CesiumMath.PI_OVER_THREE
        }));

        expect(p.attributes.position.values.length).toEqual(14 * 3);
        expect(p.indices.length).toEqual(10 * 3);
    });

    it('doesn\'t reverse clockwise input array', function() {
        var p = Cartesian3.fromDegreesArray([
                                             -124.0, 35.0,
                                             -124.0, 40.0,
                                             -110.0, 40.0,
                                             -110.0, 35.0
                                         ]);
        var h1 = Cartesian3.fromDegreesArray([
                                              -122.0, 36.0,
                                              -112.0, 36.0,
                                              -112.0, 39.0,
                                              -122.0, 39.0
                                          ]);
        var h2 = Cartesian3.fromDegreesArray([
                                              -120.0, 36.5,
                                              -120.0, 38.5,
                                              -114.0, 38.5,
                                              -114.0, 36.5
                                          ]);
        var hierarchy = {
            positions : p,
            holes : [{
                positions : h1,
                holes : [{
                    positions : h2
                }]
            }]
        };

        PolygonGeometry.createGeometry(new PolygonGeometry({
            vertexFormat : VertexFormat.POSITION_ONLY,
            polygonHierarchy : hierarchy,
            granularity : CesiumMath.PI_OVER_THREE
        }));

        var i;
        var pExpected = Cartesian3.fromDegreesArray([
                                              -124.0, 35.0,
                                              -124.0, 40.0,
                                              -110.0, 40.0,
                                              -110.0, 35.0
                                          ]);
        for (i = 0; i < p.length; i++) {
            expect(p[i]).toEqualEpsilon(pExpected[i], CesiumMath.EPSILON10);
        }

        var h1Expected = Cartesian3.fromDegreesArray([
                                               -122.0, 36.0,
                                               -112.0, 36.0,
                                               -112.0, 39.0,
                                               -122.0, 39.0
                                           ]);
        for (i = 0; i < h1.length; i++) {
            expect(h1[i]).toEqualEpsilon(h1Expected[i], CesiumMath.EPSILON10);
        }

        var h2Expected = Cartesian3.fromDegreesArray([
                                               -120.0, 36.5,
                                               -120.0, 38.5,
                                               -114.0, 38.5,
                                               -114.0, 36.5
                                           ]);
        for (i = 0; i <h2.length; i++) {
            expect(h2[i]).toEqualEpsilon(h2Expected[i], CesiumMath.EPSILON10);
        }
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
                -1.0, -1.0,
                1.0, -1.0,
                1.0, 1.0,
                -1.0, 1.0
            ]),
            extrudedHeight: 30000
        }));

        var numVertices = 50; // 13 top + 13 bottom + 8 top edge + 8 bottom edge + 4 top corner + 4 bottom corner
        var numTriangles = 48; // 16 top fill + 16 bottom fill + 2 triangles * 4 sides
        expect(p.attributes.position.values.length).toEqual(numVertices * 3);
        expect(p.indices.length).toEqual(numTriangles * 3);
    });

    it('removes duplicates extruded', function() {
        var p = PolygonGeometry.createGeometry(PolygonGeometry.fromPositions({
            vertexFormat : VertexFormat.POSITION_ONLY,
            positions : Cartesian3.fromDegreesArray([
                -1.0, -1.0,
                1.0, -1.0,
                1.0, 1.0,
                -1.0, 1.0,
                -1.0, -1.0
            ]),
            extrudedHeight: 30000
        }));

        expect(p.attributes.position.values.length).toEqual(50 * 3);
        expect(p.indices.length).toEqual(48 * 3);
    });

    it('computes all attributes extruded', function() {
        var p = PolygonGeometry.createGeometry(new PolygonGeometry({
            vertexFormat : VertexFormat.ALL,
            polygonHierarchy: {
                positions : Cartesian3.fromDegreesArray([
                    -1.0, -1.0,
                    1.0, -1.0,
                    1.0, 1.0,
                    -1.0, 1.0
                ])},
            extrudedHeight: 30000
        }));

        var numVertices = 50;
        var numTriangles = 48;
        expect(p.attributes.position.values.length).toEqual(numVertices * 3);
        expect(p.attributes.st.values.length).toEqual(numVertices * 2);
        expect(p.attributes.normal.values.length).toEqual(numVertices * 3);
        expect(p.attributes.tangent.values.length).toEqual(numVertices * 3);
        expect(p.attributes.binormal.values.length).toEqual(numVertices * 3);
        expect(p.indices.length).toEqual(numTriangles * 3);
    });

    it('computes correct texture coordinates for polygon with height', function() {
        var p = PolygonGeometry.createGeometry(new PolygonGeometry({
            vertexFormat : VertexFormat.POSITION_AND_ST,
            polygonHierarchy: {
                positions : Cartesian3.fromDegreesArray([
                    -100.5, 30.0,
                    -100.0, 30.0,
                    -100.0, 30.5,
                    -100.5, 30.5
                ])},
            height: 150000,
            granularity: CesiumMath.PI
        }));

        var st = p.attributes.st.values;
        for (var i = 0; i < st.length; i++) {
            expect(st[i]).toBeGreaterThanOrEqualTo(0);
            expect(st[i]).toBeLessThanOrEqualTo(1);
        }
    });

    it('computes correct texture coordinates for polygon with position heights', function() {
        var p = PolygonGeometry.createGeometry(new PolygonGeometry({
            vertexFormat : VertexFormat.POSITION_AND_ST,
            polygonHierarchy: {
                positions : Cartesian3.fromDegreesArrayHeights([
                    -100.5, 30.0, 92,
                    -100.0, 30.0, 92,
                    -100.0, 30.5, 92,
                    -100.5, 30.5, 92
                ])},
            granularity: CesiumMath.PI
        }));

        var st = p.attributes.st.values;
        for (var i = 0; i < st.length; i++) {
            expect(st[i]).toBeGreaterThanOrEqualTo(0);
            expect(st[i]).toBeLessThanOrEqualTo(1);
        }
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

        // (4 points * 3 rectangles * 3 to duplicate for normals + 2 duplicated at corner) * 2 for top and bottom
        expect(p.attributes.position.values.length).toEqual(76 * 3);
        // 10 top + 10 bottom + 2 triangles * 12 walls
        expect(p.indices.length).toEqual(44 * 3);
    });

    it('undefined is returned if there are less than 3 positions', function() {
        var polygon = PolygonGeometry.fromPositions({
            positions : Cartesian3.fromDegreesArray([
                -72.0, 40.0,
                -68.0, 40.0
            ])
        });

        var geometry = PolygonGeometry.createGeometry(polygon);

        expect(geometry).toBeUndefined();
    });

    var positions = Cartesian3.fromDegreesArray([
        -124.0, 35.0,
        -110.0, 35.0,
        -110.0, 40.0
    ]);
    var holePositions0 = Cartesian3.fromDegreesArray([
        -122.0, 36.0,
        -122.0, 39.0,
        -112.0, 39.0
    ]);
    var holePositions1 = Cartesian3.fromDegreesArray([
        -120.0, 36.5,
        -114.0, 36.5,
        -114.0, 38.5
    ]);
    var hierarchy = {
        positions : positions,
        holes : [{
            positions : holePositions0,
            holes : [{
                positions : holePositions1,
                holes : undefined
            }]
        }]
    };

    var polygon = new PolygonGeometry({
        vertexFormat : VertexFormat.POSITION_ONLY,
        polygonHierarchy : hierarchy,
        granularity : CesiumMath.PI_OVER_THREE,
        perPositionHeight : true
    });

    function addPositions(array, positions) {
        for (var i = 0; i < positions.length; ++i) {
            array.push(positions[i].x, positions[i].y, positions[i].z);
        }
    }
    var packedInstance = [3.0, 1.0];
    addPositions(packedInstance, positions);
    packedInstance.push(3.0, 1.0);
    addPositions(packedInstance, holePositions0);
    packedInstance.push(3.0, 0.0);
    addPositions(packedInstance, holePositions1);
    packedInstance.push(Ellipsoid.WGS84.radii.x, Ellipsoid.WGS84.radii.y, Ellipsoid.WGS84.radii.z);
    packedInstance.push(1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, CesiumMath.PI_OVER_THREE, 0.0, 0.0, 1.0, 0, 50);
    createPackableSpecs(PolygonGeometry, polygon, packedInstance);
});
