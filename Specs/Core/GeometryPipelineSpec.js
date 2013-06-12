/*global defineSuite*/
defineSuite([
         'Core/GeometryPipeline',
         'Core/PrimitiveType',
         'Core/ComponentDatatype',
         'Core/EllipsoidGeometry',
         'Core/Ellipsoid',
         'Core/Cartesian3',
         'Core/EncodedCartesian3',
         'Core/Tipsify',
         'Core/GeographicProjection',
         'Core/Geometry',
         'Core/GeometryAttribute',
         'Core/GeometryInstance',
         'Core/VertexFormat',
         'Core/Math'
     ], function(
         GeometryPipeline,
         PrimitiveType,
         ComponentDatatype,
         EllipsoidGeometry,
         Ellipsoid,
         Cartesian3,
         EncodedCartesian3,
         Tipsify,
         GeographicProjection,
         Geometry,
         GeometryAttribute,
         GeometryInstance,
         VertexFormat,
         CesiumMath) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('converts triangles to wireframe in place', function() {
        var geometry = GeometryPipeline.toWireframe(new Geometry({
            indexList : [0, 1, 2, 3, 4, 5],
            primitiveType : PrimitiveType.TRIANGLES
        }));

        expect(geometry.primitiveType).toEqual(PrimitiveType.LINES);

        var v = geometry.indexList;
        expect(v.length).toEqual(12);

        expect(v[0]).toEqual(0);
        expect(v[1]).toEqual(1);
        expect(v[2]).toEqual(1);
        expect(v[3]).toEqual(2);
        expect(v[4]).toEqual(2);
        expect(v[5]).toEqual(0);

        expect(v[6]).toEqual(3);
        expect(v[7]).toEqual(4);
        expect(v[8]).toEqual(4);
        expect(v[9]).toEqual(5);
        expect(v[10]).toEqual(5);
        expect(v[11]).toEqual(3);
    });

    it('converts a triangle fan to wireframe in place', function() {
        var geometry = GeometryPipeline.toWireframe(new Geometry({
            indexList : [0, 1, 2, 3],
            primitiveType : PrimitiveType.TRIANGLE_FAN
        }));

        expect(geometry.primitiveType).toEqual(PrimitiveType.LINES);

        var v = geometry.indexList;
        expect(v.length).toEqual(12);

        expect(v[0]).toEqual(0);
        expect(v[1]).toEqual(1);
        expect(v[2]).toEqual(1);
        expect(v[3]).toEqual(2);
        expect(v[4]).toEqual(2);
        expect(v[5]).toEqual(0);

        expect(v[6]).toEqual(0);
        expect(v[7]).toEqual(2);
        expect(v[8]).toEqual(2);
        expect(v[9]).toEqual(3);
        expect(v[10]).toEqual(3);
        expect(v[11]).toEqual(0);
    });

    it('converts a triangle strip to wireframe in place', function() {
        var geometry = GeometryPipeline.toWireframe(new Geometry({
            indexList : [0, 1, 2, 3],
            primitiveType : PrimitiveType.TRIANGLE_STRIP
        }));

        expect(geometry.primitiveType).toEqual(PrimitiveType.LINES);

        var v = geometry.indexList;
        expect(v.length).toEqual(12);

        expect(v[0]).toEqual(0);
        expect(v[1]).toEqual(1);
        expect(v[2]).toEqual(1);
        expect(v[3]).toEqual(2);
        expect(v[4]).toEqual(2);
        expect(v[5]).toEqual(0);

        expect(v[6]).toEqual(2);
        expect(v[7]).toEqual(3);
        expect(v[8]).toEqual(3);
        expect(v[9]).toEqual(1);
        expect(v[10]).toEqual(1);
        expect(v[11]).toEqual(2);
    });

    it('toWireframe throws without a geometry', function() {
        expect(function() {
            GeometryPipeline.toWireframe(undefined);
        }).toThrow();
    });

    it('creates attribute indices', function() {
        var geometry = new Geometry({
            attributes : {
                position : new GeometryAttribute(),
                normal : new GeometryAttribute(),
                color : new GeometryAttribute()
            }
        });

        var indices = GeometryPipeline.createAttributeIndices(geometry);

        var validIndices = [0, 1, 2];
        expect(validIndices).toContain(indices.position);
        expect(validIndices).toContain(indices.normal);
        expect(validIndices).toContain(indices.color);
        expect(indices.position).not.toEqual(indices.normal);
        expect(indices.position).not.toEqual(indices.color);
    });

    it('createAttributeIndices throws without a geometry', function() {
        expect(function() {
            GeometryPipeline.createAttributeIndices(undefined);
        }).toThrow();
    });

    it('reorderForPreVertexCache reorders all indices and attributes for the pre vertex cahce', function() {
        var geometry = new Geometry({
            attributes : {
                weight : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 1,
                    values : [0.0, 1.0, 2.0, 3.0, 4.0, 5.0]
                }),
                positions : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : [0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0]
                })
            },
            indexList : [5, 3, 2, 0, 1, 4, 4, 1, 3, 2, 5, 0],
            primitiveType : PrimitiveType.TRIANGLES
        });

        GeometryPipeline.reorderForPreVertexCache(geometry);

        expect(geometry.indexList[0]).toEqual(0);
        expect(geometry.indexList[1]).toEqual(1);
        expect(geometry.indexList[2]).toEqual(2);
        expect(geometry.indexList[3]).toEqual(3);
        expect(geometry.indexList[4]).toEqual(4);
        expect(geometry.indexList[5]).toEqual(5);
        expect(geometry.indexList[6]).toEqual(5);
        expect(geometry.indexList[7]).toEqual(4);
        expect(geometry.indexList[8]).toEqual(1);
        expect(geometry.indexList[9]).toEqual(2);
        expect(geometry.indexList[10]).toEqual(0);
        expect(geometry.indexList[11]).toEqual(3);

        expect(geometry.attributes.weight.values[0]).toEqual(5.0);
        expect(geometry.attributes.weight.values[1]).toEqual(3.0);
        expect(geometry.attributes.weight.values[2]).toEqual(2.0);
        expect(geometry.attributes.weight.values[3]).toEqual(0.0);
        expect(geometry.attributes.weight.values[4]).toEqual(1.0);
        expect(geometry.attributes.weight.values[5]).toEqual(4.0);

        expect(geometry.attributes.positions.values[0]).toEqual(15);
        expect(geometry.attributes.positions.values[1]).toEqual(16);
        expect(geometry.attributes.positions.values[2]).toEqual(17);
        expect(geometry.attributes.positions.values[3]).toEqual(9);
        expect(geometry.attributes.positions.values[4]).toEqual(10);
        expect(geometry.attributes.positions.values[5]).toEqual(11);
        expect(geometry.attributes.positions.values[6]).toEqual(6);
        expect(geometry.attributes.positions.values[7]).toEqual(7);
        expect(geometry.attributes.positions.values[8]).toEqual(8);
        expect(geometry.attributes.positions.values[9]).toEqual(0);
        expect(geometry.attributes.positions.values[10]).toEqual(1);
        expect(geometry.attributes.positions.values[11]).toEqual(2);
        expect(geometry.attributes.positions.values[12]).toEqual(3);
        expect(geometry.attributes.positions.values[13]).toEqual(4);
        expect(geometry.attributes.positions.values[14]).toEqual(5);
        expect(geometry.attributes.positions.values[15]).toEqual(12);
        expect(geometry.attributes.positions.values[16]).toEqual(13);
        expect(geometry.attributes.positions.values[17]).toEqual(14);
    });

    it('reorderForPreVertexCache throws without a geometry', function() {
        expect(function() {
            GeometryPipeline.reorderForPreVertexCache(undefined);
        }).toThrow();
    });

    it('reorderForPreVertexCache throws when attributes have a different number of attributes', function() {
        expect(function() {
            var geometry = new Geometry({
                attributes : {
                    attribute1 : new GeometryAttribute({
                        componentDatatype : ComponentDatatype.FLOAT,
                        componentsPerAttribute : 1,
                        values : [0, 1, 2]
                    }),
                    attribute2 : new GeometryAttribute({
                        componentDatatype : ComponentDatatype.FLOAT,
                        componentsPerAttribute : 3,
                        values : [0, 1, 2, 3, 4, 5]
                    })
                }
            });

            geometry = GeometryPipeline.reorderForPreVertexCache(geometry);
        }).toThrow();
    });

    it('reorderForPostVertexCache reorders indices for the post vertex cache', function() {
        var geometry = new EllipsoidGeometry();
        var acmrBefore = Tipsify.calculateACMR({
            indices : geometry.indexList,
            cacheSize : 24
        });
        expect(acmrBefore).toBeGreaterThan(1.0);
        geometry = GeometryPipeline.reorderForPostVertexCache(geometry);
        var acmrAfter = Tipsify.calculateACMR({
            indices : geometry.indexList,
            cacheSize : 24
        });
        expect(acmrAfter).toBeLessThan(0.7);
    });

    it('reorderForPostVertexCache throws without a geometry', function() {
        expect(function() {
            GeometryPipeline.reorderForPostVertexCache(undefined);
        }).toThrow();
    });

    it('fitToUnsignedShortIndices does not change geometry', function() {
        var geometry = new Geometry({
            attributes : {
                time : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 1,
                    values : [10.0]
                }),
                heat : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 1,
                    values : [1.0]
                })
            },
            indexList : [0, 0, 0],
            primitiveType : PrimitiveType.TRIANGLES
        });

        var geometries = GeometryPipeline.fitToUnsignedShortIndices(geometry);

        expect(geometries.length).toEqual(1);
        expect(geometries[0]).toBe(geometry);
    });

    it('fitToUnsignedShortIndices creates one geometry', function() {
        var sixtyFourK = 64 * 1024;
        var times = [];
        for ( var i = 0; i < sixtyFourK + 1; ++i) {
            times.push(i);
        }

        var geometry = new Geometry({
            attributes : {
                time : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 1,
                    values : times
                })
            },
            indexList : [0, 0, 0, sixtyFourK, sixtyFourK, sixtyFourK, 0, sixtyFourK, 0],
            primitiveType : PrimitiveType.TRIANGLES
        });

        var geometries = GeometryPipeline.fitToUnsignedShortIndices(geometry);

        expect(geometries.length).toEqual(1);
        expect(geometries[0].attributes.time.componentDatatype).toEqual(ComponentDatatype.FLOAT);
        expect(geometries[0].attributes.time.componentsPerAttribute).toEqual(1);
        expect(geometries[0].attributes.time.values).toEqual([0, sixtyFourK]);

        expect(geometries[0].primitiveType).toEqual(PrimitiveType.TRIANGLES);
        expect(geometries[0].indexList).toEqual([0, 0, 0, 1, 1, 1, 0, 1, 0]);
    });

    it('fitToUnsignedShortIndices creates two triangle geometries', function() {
        var sixtyFourK = 64 * 1024;

        var positions = [];
        for ( var i = 0; i < sixtyFourK + 1; ++i) {
            positions.push(i, i, i);
        }

        var indices = [];
        for ( var j = sixtyFourK; j > 1; j -= 3) {
            indices.push(j, j - 1, j - 2);
        }
        indices.push(0, 1, 2);

        var geometry = new Geometry({
            attributes : {
                position : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : positions
                })
            },
            indexList : indices,
            primitiveType : PrimitiveType.TRIANGLES
        });

        var geometries = GeometryPipeline.fitToUnsignedShortIndices(geometry);

        expect(geometries.length).toEqual(2);

        expect(geometries[0].attributes.position.values.length).toEqual(positions.length - 6); // Two vertices are not copied (0, 1)
        expect(geometries[0].indexList.length).toEqual(indices.length - 3); // One triangle is not copied (0, 1, 2)

        expect(geometries[1].attributes.position.values.length).toEqual(9);
        expect(geometries[1].indexList.length).toEqual(3);
    });

    it('fitToUnsignedShortIndices creates two line geometries', function() {
        var sixtyFourK = 64 * 1024;

        var positions = [];
        for ( var i = 0; i < sixtyFourK + 2; ++i) {
            positions.push(i, i, i);
        }

        var indices = [];
        for ( var j = sixtyFourK; j > 1; j -= 2) {
            indices.push(j, j - 1);
        }
        indices.push(0, 1);

        var geometry = new Geometry({
            attributes : {
                position : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : positions
                })
            },
            indexList : indices,
            primitiveType : PrimitiveType.LINES
        });

        var geometries = GeometryPipeline.fitToUnsignedShortIndices(geometry);

        expect(geometries.length).toEqual(2);

        expect(geometries[0].attributes.position.values.length).toEqual(positions.length - 6); // Two vertices are not copied (0, 1)
        expect(geometries[0].indexList.length).toEqual(indices.length - 2); // One line is not copied (0, 1)

        expect(geometries[1].attributes.position.values.length).toEqual(6);
        expect(geometries[1].indexList.length).toEqual(2);
    });

    it('fitToUnsignedShortIndices creates two point geometries', function() {
        var sixtyFourK = 64 * 1024;

        var positions = [];
        var indices = [];
        for ( var i = 0; i < sixtyFourK + 1; ++i) {
            positions.push(i, i, i);
            indices.push(i);
        }

        var geometry = new Geometry({
            attributes : {
                position : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : positions
                })
            },
            indexList : indices,
            primitiveType : PrimitiveType.POINTS
        });

        var geometries = GeometryPipeline.fitToUnsignedShortIndices(geometry);

        expect(geometries.length).toEqual(2);

        expect(geometries[0].attributes.position.values.length).toEqual(positions.length - 3); // One vertex is not copied
        expect(geometries[0].indexList.length).toEqual(indices.length - 1); // One point is not copied

        expect(geometries[1].attributes.position.values.length).toEqual(3);
        expect(geometries[1].indexList.length).toEqual(1);
    });

    it('fitToUnsignedShortIndices throws without a geometry', function() {
        expect(function() {
            GeometryPipeline.fitToUnsignedShortIndices(undefined);
        }).toThrow();
    });

    it('fitToUnsignedShortIndices throws without triangles, lines, or points', function() {
        var geometry = new Geometry({
            attributes : {
                time : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 1,
                    values : [10.0, 11.0, 12.0]
                })
            },
            indexList : [0, 1, 2],
            primitiveType : PrimitiveType.TRIANGLE_STRIP
        });

        expect(function() {
            return GeometryPipeline.fitToUnsignedShortIndices(geometry);
        }).toThrow();
    });

    it('fitToUnsignedShortIndices throws with different numbers of attributes', function() {
        var geometry = new Geometry({
            attributes : {
                time : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 1,
                    values : [10.0]
                }),
                heat : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 1,
                    values : [1.0, 2.0]
                })
            },
            indexList : [0, 0, 0],
            primitiveType : PrimitiveType.TRIANGLES
        });

        expect(function() {
            return GeometryPipeline.fitToUnsignedShortIndices(geometry);
        }).toThrow();
    });

    it('projectTo2D', function() {
        var p1 = new Cartesian3(100000, 200000, 300000);
        var p2 = new Cartesian3(400000, 500000, 600000);

        var geometry = {};
        geometry.attributes = {};
        geometry.attributes.position = {
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 3,
            values : [p1.x, p1.y, p1.z, p2.x, p2.y, p2.z]
        };

        geometry = GeometryPipeline.projectTo2D(geometry);

        var ellipsoid = Ellipsoid.WGS84;
        var projection = new GeographicProjection();
        var projectedP1 = projection.project(ellipsoid.cartesianToCartographic(p1));
        var projectedP2 = projection.project(ellipsoid.cartesianToCartographic(p2));

        expect(geometry.attributes.position2D.values[0]).toEqual(projectedP1.x);
        expect(geometry.attributes.position2D.values[1]).toEqual(projectedP1.y);
        expect(geometry.attributes.position2D.values[2]).toEqual(projectedP2.x);
        expect(geometry.attributes.position2D.values[3]).toEqual(projectedP2.y);

        expect(geometry.attributes.position3D.values[0]).toEqual(p1.x);
        expect(geometry.attributes.position3D.values[1]).toEqual(p1.y);
        expect(geometry.attributes.position3D.values[2]).toEqual(p1.z);
        expect(geometry.attributes.position3D.values[3]).toEqual(p2.x);
        expect(geometry.attributes.position3D.values[4]).toEqual(p2.y);
        expect(geometry.attributes.position3D.values[5]).toEqual(p2.z);
    });

    it('projectTo2D throws without a geometry', function() {
        expect(function() {
            GeometryPipeline.projectTo2D(undefined);
        }).toThrow();
    });

    it('encodeAttribute encodes positions', function() {
        var c = new Cartesian3(-10000000.0, 0.0, 10000000.0);
        var encoded = EncodedCartesian3.fromCartesian(c);

        var geometry = new Geometry({
            attributes : {
                position : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : [c.x, c.y, c.z]
                })
            }
        });
        geometry = GeometryPipeline.encodeAttribute(geometry);

        expect(geometry.attributes.positionHigh).toBeDefined();
        expect(geometry.attributes.positionHigh.values[0]).toEqual(encoded.high.x);
        expect(geometry.attributes.positionHigh.values[1]).toEqual(encoded.high.y);
        expect(geometry.attributes.positionHigh.values[2]).toEqual(encoded.high.z);
        expect(geometry.attributes.positionLow).toBeDefined();
        expect(geometry.attributes.positionLow.values[0]).toEqual(encoded.low.x);
        expect(geometry.attributes.positionLow.values[1]).toEqual(encoded.low.y);
        expect(geometry.attributes.positionLow.values[2]).toEqual(encoded.low.z);
        expect(geometry.attributes.position).not.toBeDefined();
    });

    it('encodeAttribute throws without a geometry', function() {
        expect(function() {
            GeometryPipeline.encodeAttribute(undefined);
        }).toThrow();
    });

    it('encodeAttribute throws with geometry without attributes property', function() {
        expect(function() {
            GeometryPipeline.encodeAttribute({});
        }).toThrow();
    });

    it('encodeAttribute throws without attribute', function() {
        expect(function() {
            GeometryPipeline.encodeAttribute(new Geometry());
        }).toThrow();
    });

    it('encodeAttribute throws without ComponentDatatype.FLOAT', function() {
        expect(function() {
            var geometry = new Geometry({
                attributes : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.UNSIGNED_SHORT,
                    componentsPerAttribute : 1,
                    values : [0.0]
                })
            });
            GeometryPipeline.encodeAttribute(geometry);
        }).toThrow();
    });

    it('combine combines one geometry', function() {
        var instance = new GeometryInstance({
            geometry : new Geometry({
                attributes : new GeometryAttribute({
                    position : {
                        componentDatatype : ComponentDatatype.FLOAT,
                        componentsPerAttribute : 3,
                        values : [0.0, 0.0, 0.0]
                    }
                })
            })
        });

        var combined = GeometryPipeline.combine([instance]);
        expect(combined).toBe(instance.geometry);
    });

    it('combine combines several geometries', function() {
        var instance = new GeometryInstance({
            geometry : new Geometry({
                attributes : {
                    position : new GeometryAttribute({
                        componentDatatype : ComponentDatatype.FLOAT,
                        componentsPerAttribute : 3,
                        values : [
                            0.0, 0.0, 0.0,
                            1.0, 1.0, 1.0,
                            2.0, 2.0, 2.0
                        ]
                    }),
                    normal : new GeometryAttribute({
                        componentDatatype : ComponentDatatype.FLOAT,
                        componentsPerAttribute : 3,
                        values : [
                            0.0, 0.0, 0.0,
                            1.0, 1.0, 1.0,
                            2.0, 2.0, 2.0
                        ]
                    })
                },
                indexList : [0, 1, 2],
                primitiveType : PrimitiveType.TRIANGLES
            })
        });
        var anotherInstance = new GeometryInstance({
            geometry : new Geometry({
                attributes : {
                    position : new GeometryAttribute({
                        componentDatatype : ComponentDatatype.FLOAT,
                        componentsPerAttribute : 3,
                        values : [
                            3.0, 3.0, 3.0,
                            4.0, 4.0, 4.0,
                            5.0, 5.0, 5.0
                        ]
                    })
                },
                indexList : [0, 1, 2],
                primitiveType : PrimitiveType.TRIANGLES
            })
        });

        var combined = GeometryPipeline.combine([instance, anotherInstance]);
        expect(combined).toEqual(new Geometry({
            attributes : {
                position : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : new Float32Array([
                        0.0, 0.0, 0.0,
                        1.0, 1.0, 1.0,
                        2.0, 2.0, 2.0,
                        3.0, 3.0, 3.0,
                        4.0, 4.0, 4.0,
                        5.0, 5.0, 5.0
                    ])
                })
            },
            indexList : new Uint16Array([0, 1, 2, 3, 4, 5]),
            primitiveType : PrimitiveType.TRIANGLES
        }));
    });

    it('combine throws with instances', function() {
        expect(function() {
            GeometryPipeline.combine();
        }).toThrow();
    });

    it('combine throws when instances.length is zero', function() {
        expect(function() {
            GeometryPipeline.combine([]);
        }).toThrow();
    });

    it('computeNormal throws when geometry is undefined', function() {
        expect(function() {
            GeometryPipeline.computeNormal();
        }).toThrow();
    });

    it('computeNormal does not compute normals when geometry.indexList is undefined', function() {
        var geometry = new Geometry({
            attributes: {
                position: new GeometryAttribute({
                    values: [0, 0, 0, 1, 0, 0, 0, 1, 0],
                    componentsPerAttribute: 3
                })
            }
        });

        geometry = GeometryPipeline.computeNormal(geometry);

        expect(geometry.attributes.normal).not.toBeDefined();
    });

    it('computeNormal does not compute normals when primitive type is not triangle', function() {
        var geometry = new Geometry({
            attributes: {
                position: new GeometryAttribute({
                    values: [0, 0, 0, 1, 0, 0, 0, 1, 0],
                    componentsPerAttribute: 3
                })
            },
            indexList : [0, 1, 2],
            primitiveType: PrimitiveType.TRIANGLE_STRIP
        });

        geometry = GeometryPipeline.computeNormal(geometry);

        expect(geometry.attributes.normal).not.toBeDefined();
    });


    it('computeNormal computes normal for one triangle', function() {
        var geometry = new Geometry({
            attributes: {
                position: new GeometryAttribute({
                    values: [0, 0, 0, 1, 0, 0, 0, 1, 0],
                    componentsPerAttribute: 3
                })
            },
            indexList : [0, 1, 2],
            primitiveType: PrimitiveType.TRIANGLES
        });

        geometry = GeometryPipeline.computeNormal(geometry);

        expect(geometry.attributes.normal.values.length).toEqual(3*3);
        expect(geometry.attributes.normal.values).toEqual([0, 0, 1, 0, 0, 1, 0, 0, 1]);
    });

    it('computeNormal computes normal for two triangles', function() {
        var geometry = new Geometry({
            attributes: {
                position: new GeometryAttribute({
                    values: [0, 0, 0, 1, 0, 1, 1, 1, 1, 2, 0, 0],
                    componentsPerAttribute: 3
                })
            },
            indexList : [0, 1, 2, 1, 3, 2],
            primitiveType: PrimitiveType.TRIANGLES
        });

        geometry = GeometryPipeline.computeNormal(geometry);

        expect(geometry.attributes.normal.values.length).toEqual(4*3);
        var a = new Cartesian3(-1, 0, 1).normalize();
        expect(geometry.attributes.normal.values.slice(0, 3)).toEqual([a.x, a.y, a.z]);
        expect(geometry.attributes.normal.values.slice(3, 9)).toEqual([0, 0, 1, 0, 0, 1]);
        a = new Cartesian3(1, 0, 1).normalize();
        expect(geometry.attributes.normal.values.slice(9, 12)).toEqual([a.x, a.y, a.z]);
    });

    it('computeNormal computes normal for six triangles', function() {
        var geometry = new Geometry ({
            attributes: {
                position: new GeometryAttribute({
                    values: [0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0],
                    componentsPerAttribute: 3
                })
            },
            indexList : [0, 1, 2, 3, 0, 2, 4, 0, 3, 4, 5, 0, 5, 6, 0, 6, 1, 0],
            primitiveType: PrimitiveType.TRIANGLES
        });

        geometry = GeometryPipeline.computeNormal(geometry);

        expect(geometry.attributes.normal.values.length).toEqual(7*3);
        var a = new Cartesian3(-1, -1, -1).normalize();
        expect(geometry.attributes.normal.values.slice(0, 3)).toEqual([a.x, a.y, a.z]);
        a = new Cartesian3(0, -1, -1).normalize();
        expect(geometry.attributes.normal.values.slice(3, 6)).toEqual([a.x, a.y, a.z]);
        expect(geometry.attributes.normal.values.slice(6, 9)).toEqual([0, -1, 0]);
        a = new Cartesian3(-1, -1, 0).normalize();
        expect(geometry.attributes.normal.values.slice(9, 12)).toEqual([a.x, a.y, a.z]);
        expect(geometry.attributes.normal.values.slice(12, 15)).toEqual([-1, 0, 0]);
        a = new Cartesian3(-1, 0, -1).normalize();
        expect(geometry.attributes.normal.values.slice(15,18)).toEqual([a.x, a.y, a.z]);
        expect(geometry.attributes.normal.values.slice(18,21)).toEqual([0, 0, -1]);
    });

    it('computeBinormalAndTangent throws when geometry is undefined', function() {
        expect(function() {
            GeometryPipeline.computeBinormalAndTangent();
        }).toThrow();
    });

    it('computeBinormalAndTangent does not compute tangent and binormals when geometry.indexList is undefined', function() {
        var geometry = new Geometry({
            attributes: {
                position: new GeometryAttribute({
                    values: [0, 0, 0, 1, 0, 0, 0, 1, 0],
                    componentsPerAttribute: 3
                }),
                normal: new GeometryAttribute({
                    values: [0, 0, 0, 1, 0, 0, 0, 1, 0],
                    componentsPerAttribute: 3

                }),
                st: new GeometryAttribute({
                    values: [0, 1],
                    componentsPerAttribute: 2
                })
            }
        });

        geometry = GeometryPipeline.computeBinormalAndTangent(geometry);

        expect(typeof geometry.attributes.tangent === 'undefined').toEqual(true);
        expect(typeof geometry.attributes.binormal === 'undefined').toEqual(true);
    });

    it('computeBinormalAndTangent does not compute tangent and binormals when primitive type is not triangle', function() {
        var geometry = new Geometry({
            attributes: {
                position: new GeometryAttribute({
                    values: [0, 0, 0, 1, 0, 0, 0, 1, 0],
                    componentsPerAttribute: 3

                }),
                normal: new GeometryAttribute({
                    values: [0, 0, 0, 1, 0, 0, 0, 1, 0],
                    componentsPerAttribute: 3

                }),
                st: new GeometryAttribute({
                    values: [0, 1],
                    componentsPerAttribute: 2
                })
            },
            indexList : [0, 1, 2],
            primitiveType: PrimitiveType.TRIANGLE_STRIP
        });

        geometry = GeometryPipeline.computeBinormalAndTangent(geometry);

        expect(typeof geometry.attributes.tangent === 'undefined').toEqual(true);
        expect(typeof geometry.attributes.binormal === 'undefined').toEqual(true);
    });

    it('computeBinormalAndTangent computes tangent and binormal for one triangle', function() {
        var geometry = new Geometry({
            attributes: {
                position: new GeometryAttribute({
                    values: [0, 0, 0, 1, 0, 0, 0, 1, 0],
                    componentsPerAttribute: 3
                }),
                st: new GeometryAttribute({
                    values: [0, 0, 1, 0, 0, 1],
                    componentsPerAttribute: 2
                })
            },
            indexList : [0, 1, 2],
            primitiveType: PrimitiveType.TRIANGLES
        });

        geometry = GeometryPipeline.computeNormal(geometry);
        geometry = GeometryPipeline.computeBinormalAndTangent(geometry);

        expect(geometry.attributes.tangent.values).toEqual([1, 0, 0, 1, 0, 0, 1, 0, 0]);
        expect(geometry.attributes.binormal.values).toEqual([0, 1, 0, 0, 1, 0, 0, 1, 0]);
    });

    it('computeBinormalAndTangent computes tangent and binormal for two triangles', function() {
        var geometry = new Geometry({
            attributes: {
                position: new GeometryAttribute({
                    values: [0, 0, 0, 1, 0, 1, 1, 1, 1, 2, 0, 0],
                    componentsPerAttribute: 3
                }),
                st: new GeometryAttribute({
                    values: [0, 0, 1, 0, 1, 1, 0, 1],
                    componentsPerAttribute: 2
                })
            },
            indexList : [0, 1, 2, 1, 3, 2],
            primitiveType: PrimitiveType.TRIANGLES
        });

        geometry = GeometryPipeline.computeNormal(geometry);
        geometry = GeometryPipeline.computeBinormalAndTangent(geometry);
        expect(geometry.attributes.tangent.values).toEqualEpsilon([0.7071067811865475, 0, 0.7071067811865475,
                                                        0, 1, 0,
                                                        0, 1, 0,
                                                        -0.5773502691896258, 0.5773502691896258, 0.5773502691896258], CesiumMath.EPSILON8);
        expect(geometry.attributes.binormal.values).toEqualEpsilon([0, 1, 0,
                                                        -1, 0, 0,
                                                        -1, 0, 0,
                                                        -0.4082482904638631, -0.8164965809277261, 0.4082482904638631], CesiumMath.EPSILON8);
    });

    it ('GeometryPipeline.computeBinormalAndTangent computes tangent and binormal for an EllipsoidGeometry', function() {
        var geometry = new EllipsoidGeometry();
        var expected = new EllipsoidGeometry({
            vertexFormat: VertexFormat.ALL
        });

        geometry = GeometryPipeline.computeBinormalAndTangent(geometry);
        expect(geometry.attributes.tangent.values.slice(1000,1200)).toEqualEpsilon(expected.attributes.tangent.values.slice(1000,1200), CesiumMath.EPSILON1);
        expect(geometry.attributes.binormal.values.slice(1000,1200)).toEqualEpsilon(expected.attributes.binormal.values.slice(1000,1200), CesiumMath.EPSILON1);
    });
});