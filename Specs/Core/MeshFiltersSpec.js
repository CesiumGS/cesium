/*global defineSuite*/
defineSuite([
         'Core/MeshFilters',
         'Core/PrimitiveType',
         'Core/ComponentDatatype',
         'Core/CubeMapEllipsoidTessellator',
         'Core/Ellipsoid',
         'Core/Cartesian3',
         'Core/Tipsify',
         'Core/EquidistantCylindricalProjection'
     ], function(
         MeshFilters,
         PrimitiveType,
         ComponentDatatype,
         CubeMapEllipsoidTessellator,
         Ellipsoid,
         Cartesian3,
         Tipsify,
         EquidistantCylindricalProjection) {
    "use strict";
    /*global it,expect*/

    it('converts triangles to wireframe in place', function() {
        var mesh = MeshFilters.toWireframeInPlace({
            indexLists : [{
                primitiveType : PrimitiveType.TRIANGLES,
                values : [0, 1, 2, 3, 4, 5]
            }]
        });

        expect(mesh.indexLists[0].primitiveType).toEqual(PrimitiveType.LINES);

        var v = mesh.indexLists[0].values;
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
        var mesh = MeshFilters.toWireframeInPlace({
            indexLists : [{
                primitiveType : PrimitiveType.TRIANGLE_FAN,
                values : [0, 1, 2, 3]
            }]
        });

        expect(mesh.indexLists[0].primitiveType).toEqual(PrimitiveType.LINES);

        var v = mesh.indexLists[0].values;
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
        var mesh = MeshFilters.toWireframeInPlace({
            indexLists : [{
                primitiveType : PrimitiveType.TRIANGLE_STRIP,
                values : [0, 1, 2, 3]
            }]
        });

        expect(mesh.indexLists[0].primitiveType).toEqual(PrimitiveType.LINES);

        var v = mesh.indexLists[0].values;
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

    it('creates attribute indices', function() {
        var mesh = {
            attributes : {
                position : {},
                normal : {},
                color : {}
            }
        };

        var indices = MeshFilters.createAttributeIndices(mesh);

        expect(indices.position).toBeIn([0, 1, 2]);
        expect(indices.normal).toBeIn([0, 1, 2]);
        expect(indices.color).toBeIn([0, 1, 2]);
        expect(indices.position).not.toEqual(indices.normal);
        expect(indices.position).not.toEqual(indices.color);
    });

    it('maps attribute indices to different names', function() {
        var indices = {
            positions : 0,
            normals : 1,
            colors : 2
        };

        var mappedIndices = MeshFilters.mapAttributeIndices(indices, {
            positions : 'position',
            normals : 'normal',
            colors : 'color'
        });

        expect(mappedIndices.position).toEqual(indices.positions);
        expect(mappedIndices.normal).toEqual(indices.normals);
        expect(mappedIndices.color).toEqual(indices.colors);
    });

    it('throws an exception when mesh properties have a different number of attributes', function() {
        expect(function() {
            var mesh = {};
            mesh.attributes = {};

            mesh.attributes.attribute1 = {
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 1,
                values : [0, 1, 2]
            };

            mesh.attributes.attribute2 = {
                componentDatatype : ComponentDatatype.FLOAT,
                componentsPerAttribute : 3,
                values : [0, 1, 2, 3, 4, 5]
            };
            mesh = MeshFilters.reorderForPreVertexCache(mesh);
        }).toThrow();
    });

    it('can reorder all indices and attributes for the pre vertex cahce', function() {
        var mesh = {};
        mesh.attributes = {};
        mesh.indexLists = [];

        mesh.indexLists.push({
            primitiveType : PrimitiveType.TRIANGLES,
            values : [5, 3, 2, 0, 1, 4]
        });

        mesh.indexLists.push({
            primitiveType : PrimitiveType.TRIANGLES,
            values : [4, 1, 3, 2, 5, 0]
        });

        mesh.attributes.vertexNames = {
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 1,
            values : ['v0', 'v1', 'v2', 'v3', 'v4', 'v5']
        };

        mesh.attributes.positions = {
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 3,
            values : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
        };
        MeshFilters.reorderForPreVertexCache(mesh);

        expect(mesh.indexLists[0].values[0]).toEqual(0);
        expect(mesh.indexLists[0].values[1]).toEqual(1);
        expect(mesh.indexLists[0].values[2]).toEqual(2);
        expect(mesh.indexLists[0].values[3]).toEqual(3);
        expect(mesh.indexLists[0].values[4]).toEqual(4);
        expect(mesh.indexLists[0].values[5]).toEqual(5);

        expect(mesh.indexLists[1].values[0]).toEqual(5);
        expect(mesh.indexLists[1].values[1]).toEqual(4);
        expect(mesh.indexLists[1].values[2]).toEqual(1);
        expect(mesh.indexLists[1].values[3]).toEqual(2);
        expect(mesh.indexLists[1].values[4]).toEqual(0);
        expect(mesh.indexLists[1].values[5]).toEqual(3);

        expect(mesh.attributes.vertexNames.values[0]).toEqual('v5');
        expect(mesh.attributes.vertexNames.values[1]).toEqual('v3');
        expect(mesh.attributes.vertexNames.values[2]).toEqual('v2');
        expect(mesh.attributes.vertexNames.values[3]).toEqual('v0');
        expect(mesh.attributes.vertexNames.values[4]).toEqual('v1');
        expect(mesh.attributes.vertexNames.values[5]).toEqual('v4');

        expect(mesh.attributes.positions.values[0]).toEqual(15);
        expect(mesh.attributes.positions.values[1]).toEqual(16);
        expect(mesh.attributes.positions.values[2]).toEqual(17);
        expect(mesh.attributes.positions.values[3]).toEqual(9);
        expect(mesh.attributes.positions.values[4]).toEqual(10);
        expect(mesh.attributes.positions.values[5]).toEqual(11);
        expect(mesh.attributes.positions.values[6]).toEqual(6);
        expect(mesh.attributes.positions.values[7]).toEqual(7);
        expect(mesh.attributes.positions.values[8]).toEqual(8);
        expect(mesh.attributes.positions.values[9]).toEqual(0);
        expect(mesh.attributes.positions.values[10]).toEqual(1);
        expect(mesh.attributes.positions.values[11]).toEqual(2);
        expect(mesh.attributes.positions.values[12]).toEqual(3);
        expect(mesh.attributes.positions.values[13]).toEqual(4);
        expect(mesh.attributes.positions.values[14]).toEqual(5);
        expect(mesh.attributes.positions.values[15]).toEqual(12);
        expect(mesh.attributes.positions.values[16]).toEqual(13);
        expect(mesh.attributes.positions.values[17]).toEqual(14);
    });

    it('can reorder indices for the post vertex cache', function() {
        var mesh = CubeMapEllipsoidTessellator.compute(new Ellipsoid(new Cartesian3(10.0, 10.0, 10.0)), 100);
        var indices = mesh.indexLists[0].values;
        var numIndices = indices.length;
        var maximumIndex = 0;
        for ( var i = 0; i < numIndices; i++) {
            if (indices[i] > maximumIndex) {
                maximumIndex = indices[i];
            }
        }
        var ACMRbefore = Tipsify.calculateACMR({indices : indices,
                                                maximumIndex : maximumIndex,
                                                cacheSize : 24});
        expect(ACMRbefore).toBeGreaterThan(1.00);
        mesh = MeshFilters.reorderForPostVertexCache(mesh);
        indices = mesh.indexLists[0].values;
        var ACMRafter = Tipsify.calculateACMR({indices : indices,
                                               maximumIndex : maximumIndex,
                                               cacheSize : 24});
        expect(ACMRafter).toBeLessThan(0.70);
    });

    it('fitToUnsignedShortIndices does not change mesh', function() {
        var mesh = {
            attributes : {
                time : {
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 1,
                    values : [10.0]
                },
                heat : {
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 1,
                    values : [1.0]
                }
            },
            indexLists : [{
                primitiveType : PrimitiveType.TRIANGLES,
                values : [0, 0, 0]
            }]
        };

        var meshes = MeshFilters.fitToUnsignedShortIndices(mesh);

        expect(meshes.length).toEqual(1);
        expect(meshes[0]).toBe(mesh);
    });

    it('fitToUnsignedShortIndices creates one mesh', function() {
        var sixtyFourK = 64 * 1024;
        var times = [];
        for ( var i = 0; i < sixtyFourK + 1; ++i) {
            times.push(i);
        }

        var mesh = {
            attributes : {
                time : {
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 1,
                    values : times
                }
            },
            indexLists : [{
                primitiveType : PrimitiveType.TRIANGLES,
                values : [0, 0, 0, sixtyFourK, sixtyFourK, sixtyFourK, 0, sixtyFourK, 0]
            }]
        };

        var meshes = MeshFilters.fitToUnsignedShortIndices(mesh);

        expect(meshes.length).toEqual(1);
        expect(meshes[0].attributes.time.componentDatatype).toEqual(ComponentDatatype.FLOAT);
        expect(meshes[0].attributes.time.componentsPerAttribute).toEqual(1);
        expect(meshes[0].attributes.time.values).toEqualArray([0, sixtyFourK]);

        expect(meshes[0].indexLists[0].primitiveType).toEqual(PrimitiveType.TRIANGLES);
        expect(meshes[0].indexLists[0].values).toEqualArray([0, 0, 0, 1, 1, 1, 0, 1, 0]);
    });

    it('fitToUnsignedShortIndices creates two meshes', function() {
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

        var mesh = {
            attributes : {
                position : {
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : positions
                }
            },
            indexLists : [{
                primitiveType : PrimitiveType.TRIANGLES,
                values : indices
            }]
        };

        var meshes = MeshFilters.fitToUnsignedShortIndices(mesh);

        expect(meshes.length).toEqual(2);

        expect(meshes[0].attributes.position.values.length).toEqual(positions.length - 6); // Two vertices are not copied (0, 1)
        expect(meshes[0].indexLists[0].values.length).toEqual(indices.length - 3); // One triangle is not copied (0, 1, 2)

        expect(meshes[1].attributes.position.values.length).toEqual(9);
        expect(meshes[1].indexLists[0].values.length).toEqual(3);
    });

    it('fitToUnsignedShortIndices throws without triangles', function() {
        var mesh = {
            attributes : {
                time : {
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 1,
                    values : [10.0]
                }
            },

            indexLists : [{
                primitiveType : PrimitiveType.POINTS,
                values : [0]
            }]
        };

        expect(function() {
            return MeshFilters.fitToUnsignedShortIndices(mesh);
        }).toThrow();
    });

    it('fitToUnsignedShortIndices throws with different numbers of attributes', function() {
        var mesh = {
            attributes : {
                time : {
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 1,
                    values : [10.0]
                },

                heat : {
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 1,
                    values : [1.0, 2.0]
                }
            },

            indexLists : [{
                primitiveType : PrimitiveType.TRIANGLES,
                values : [0, 0, 0]
            }]
        };

        expect(function() {
            return MeshFilters.fitToUnsignedShortIndices(mesh);
        }).toThrow();
    });

    it('projectTo2D', function() {
        var p1 = new Cartesian3(1, 2, 3);
        var p2 = new Cartesian3(4, 5, 6);

        var mesh = {};
        mesh.attributes = {};
        mesh.attributes.position = {
            componentDatatype : ComponentDatatype.FLOAT,
            componentsPerAttribute : 3,
            values : [p1.x, p1.y, p1.z, p2.x, p2.y, p2.z]
        };

        mesh = MeshFilters.projectTo2D(mesh);

        var ellipsoid = Ellipsoid.WGS84;
        var projection = new EquidistantCylindricalProjection();
        var projectedP1 = projection.project(ellipsoid.cartesianToCartographic(p1));
        var projectedP2 = projection.project(ellipsoid.cartesianToCartographic(p2));

        expect(mesh.attributes.position2D.values[0]).toEqual(projectedP1.x);
        expect(mesh.attributes.position2D.values[1]).toEqual(projectedP1.y);
        expect(mesh.attributes.position2D.values[2]).toEqual(projectedP2.x);
        expect(mesh.attributes.position2D.values[3]).toEqual(projectedP2.y);

        expect(mesh.attributes.position3D.values[0]).toEqual(p1.x);
        expect(mesh.attributes.position3D.values[1]).toEqual(p1.y);
        expect(mesh.attributes.position3D.values[2]).toEqual(p1.z);
        expect(mesh.attributes.position3D.values[3]).toEqual(p2.x);
        expect(mesh.attributes.position3D.values[4]).toEqual(p2.y);
        expect(mesh.attributes.position3D.values[5]).toEqual(p2.z);
    });
});