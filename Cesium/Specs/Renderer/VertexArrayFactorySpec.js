(function() {
    "use strict";
    /*global Cesium, describe, it, expect, beforeEach, afterEach*/

    describe("VertexArrayFactory", function () {
        var context;
        var va;
        var sp;

        beforeEach(function () {
            context = Cesium.Specs.createContext();
        });

        afterEach(function () {
            if (va) {
                va = va.destroy();
            }

            if (sp) {
                sp = sp.destroy();
            }

            Cesium.Specs.destroyContext(context);
        });

        it("creates with no arguments", function () {
            va = context.createVertexArrayFromMesh();
            expect(va.getNumberOfAttributes()).toEqual(0);
            expect(va.getIndexBuffer()).not.toBeDefined();
        });

        it("creates with no mesh", function () {
            va = context.createVertexArrayFromMesh({ vertexLayout : Cesium.VertexLayout.INTERLEAVED });
            expect(va.getNumberOfAttributes()).toEqual(0);
            expect(va.getIndexBuffer()).not.toBeDefined();
        });

        it("creates a single-attribute vertex (non-interleaved)", function () {
            var mesh = {
                attributes : {
                    position : {
                        componentDatatype      : Cesium.ComponentDatatype.FLOAT,
                        componentsPerAttribute : 3,
                        values                 : [0.0, 0.0, 0.0, 1.0, 1.0, 1.0]
                    }
                }
            };

            var va = context.createVertexArrayFromMesh({
                mesh             : mesh,
                attributeIndices : Cesium.MeshFilters.createAttributeIndices(mesh)
            });

            expect(va.getNumberOfAttributes()).toEqual(1);
            expect(va.getIndexBuffer()).not.toBeDefined();

            var position = mesh.attributes.position;
            expect(va.getAttribute(0).index).toEqual(0);
            expect(va.getAttribute(0).componentDatatype).toEqualEnumeration(position.componentDatatype);
            expect(va.getAttribute(0).componentsPerAttribute).toEqual(position.componentsPerAttribute);
            expect(va.getAttribute(0).offsetInBytes).toEqual(0);
            expect(va.getAttribute(0).strideInBytes).toEqual(0);    // Tightly packed

            expect(va.getAttribute(0).vertexBuffer.getUsage()).toEqualEnumeration(Cesium.BufferUsage.DYNAMIC_DRAW); // Default
        });

        it("creates a single-attribute vertex (interleaved)", function () {
            var mesh = {
                attributes : {
                    position : {
                        componentDatatype      : Cesium.ComponentDatatype.FLOAT,
                        componentsPerAttribute : 3,
                        values                 : [0.0, 0.0, 0.0, 1.0, 1.0, 1.0]
                    }
                }
            };

            var va = context.createVertexArrayFromMesh({
                mesh             : mesh,
                attributeIndices : Cesium.MeshFilters.createAttributeIndices(mesh),
                vertexLayout     : Cesium.VertexLayout.INTERLEAVED,
                bufferUsage      : Cesium.BufferUsage.STATIC_DRAW
            });

            expect(va.getNumberOfAttributes()).toEqual(1);
            expect(va.getIndexBuffer()).not.toBeDefined();

            var position = mesh.attributes.position;
            expect(va.getAttribute(0).index).toEqual(0);
            expect(va.getAttribute(0).componentDatatype).toEqualEnumeration(position.componentDatatype);
            expect(va.getAttribute(0).componentsPerAttribute).toEqual(position.componentsPerAttribute);
            expect(va.getAttribute(0).offsetInBytes).toEqual(0);
            expect(va.getAttribute(0).strideInBytes).toEqual(position.componentDatatype.sizeInBytes * position.componentsPerAttribute);

            expect(va.getAttribute(0).vertexBuffer.getUsage()).toEqualEnumeration(Cesium.BufferUsage.STATIC_DRAW);
        });

        it("creates a homogeneous multiple-attribute vertex (non-interleaved)", function () {
            var mesh = {
                attributes : {
                    position : {
                        componentDatatype      : Cesium.ComponentDatatype.FLOAT,
                        componentsPerAttribute : 3,
                        values                 : [0.0, 0.0, 0.0, 2.0, 2.0, 2.0]
                    },
                    normal : {
                        componentDatatype      : Cesium.ComponentDatatype.FLOAT,
                        componentsPerAttribute : 3,
                        values                 : [1.0, 1.0, 1.0, 3.0, 3.0, 3.0]
                    }
                }
            };

            var va = context.createVertexArrayFromMesh({
                mesh             : mesh,
                attributeIndices : Cesium.MeshFilters.createAttributeIndices(mesh)
            });

            expect(va.getNumberOfAttributes()).toEqual(2);
            expect(va.getIndexBuffer()).not.toBeDefined();

            var position = mesh.attributes.position;
            expect(va.getAttribute(0).index).toEqual(0);
            expect(va.getAttribute(0).componentDatatype).toEqualEnumeration(position.componentDatatype);
            expect(va.getAttribute(0).componentsPerAttribute).toEqual(position.componentsPerAttribute);
            expect(va.getAttribute(0).offsetInBytes).toEqual(0);
            expect(va.getAttribute(0).strideInBytes).toEqual(0);    // Tightly packed

            var normal = mesh.attributes.position;
            expect(va.getAttribute(1).index).toEqual(1);
            expect(va.getAttribute(1).componentDatatype).toEqualEnumeration(normal.componentDatatype);
            expect(va.getAttribute(1).componentsPerAttribute).toEqual(normal.componentsPerAttribute);
            expect(va.getAttribute(1).offsetInBytes).toEqual(0);
            expect(va.getAttribute(1).strideInBytes).toEqual(0);    // Tightly packed

            expect(va.getAttribute(0).vertexBuffer).not.toBe(va.getAttribute(1).vertexBuffer);
        });

        it("creates a homogeneous multiple-attribute vertex (interleaved)", function () {
            var mesh = {
                attributes : {
                    position : {
                        componentDatatype      : Cesium.ComponentDatatype.FLOAT,
                        componentsPerAttribute : 3,
                        values                 : [0.0, 0.0, 0.0, 2.0, 2.0, 2.0]
                    },
                    normal : {
                        componentDatatype      : Cesium.ComponentDatatype.FLOAT,
                        componentsPerAttribute : 3,
                        values                 : [1.0, 1.0, 1.0, 3.0, 3.0, 3.0]
                    }
                }
            };

            var va = context.createVertexArrayFromMesh({
                mesh             : mesh,
                attributeIndices : Cesium.MeshFilters.createAttributeIndices(mesh),
                vertexLayout     : Cesium.VertexLayout.INTERLEAVED
            });

            expect(va.getNumberOfAttributes()).toEqual(2);
            expect(va.getIndexBuffer()).not.toBeDefined();

            var position = mesh.attributes.position;
            var normal = mesh.attributes.position;
            var expectedStride =
                position.componentDatatype.sizeInBytes * position.componentsPerAttribute +
                normal.componentDatatype.sizeInBytes * normal.componentsPerAttribute;

            expect(va.getAttribute(0).index).toEqual(0);
            expect(va.getAttribute(0).componentDatatype).toEqualEnumeration(position.componentDatatype);
            expect(va.getAttribute(0).componentsPerAttribute).toEqual(position.componentsPerAttribute);
            expect(va.getAttribute(0).offsetInBytes).toEqual(0);
            expect(va.getAttribute(0).strideInBytes).toEqual(expectedStride);

            expect(va.getAttribute(1).index).toEqual(1);
            expect(va.getAttribute(1).componentDatatype).toEqualEnumeration(normal.componentDatatype);
            expect(va.getAttribute(1).componentsPerAttribute).toEqual(normal.componentsPerAttribute);
            expect(va.getAttribute(1).offsetInBytes).toEqual(position.componentDatatype.sizeInBytes * position.componentsPerAttribute);
            expect(va.getAttribute(1).strideInBytes).toEqual(expectedStride);

            expect(va.getAttribute(0).vertexBuffer).toBe(va.getAttribute(1).vertexBuffer);
        });

        it("creates a heterogeneous multiple-attribute vertex (interleaved)", function () {
            var mesh = {
                attributes : {
                    position : {
                        componentDatatype      : Cesium.ComponentDatatype.FLOAT,
                        componentsPerAttribute : 3,
                        values                 : [0.0, 0.0, 0.0, 2.0, 2.0, 2.0]
                    },
                    colors : {
                        componentDatatype      : Cesium.ComponentDatatype.UNSIGNED_BYTE,
                        componentsPerAttribute : 4,
                        values                 : [1, 1, 1, 1, 2, 2, 2, 2]
                    }
                }
            };

            var va = context.createVertexArrayFromMesh({
                mesh             : mesh,
                attributeIndices : Cesium.MeshFilters.createAttributeIndices(mesh),
                vertexLayout     : Cesium.VertexLayout.INTERLEAVED
            });

            expect(va.getNumberOfAttributes()).toEqual(2);
            expect(va.getIndexBuffer()).not.toBeDefined();

            var position = mesh.attributes.position;
            var colors = mesh.attributes.colors;
            var expectedStride =
                position.componentDatatype.sizeInBytes * position.componentsPerAttribute +
                colors.componentDatatype.sizeInBytes * colors.componentsPerAttribute;

            expect(va.getAttribute(0).index).toEqual(0);
            expect(va.getAttribute(0).componentDatatype).toEqualEnumeration(position.componentDatatype);
            expect(va.getAttribute(0).componentsPerAttribute).toEqual(position.componentsPerAttribute);
            expect(va.getAttribute(0).offsetInBytes).toEqual(0);
            expect(va.getAttribute(0).strideInBytes).toEqual(expectedStride);

            expect(va.getAttribute(1).index).toEqual(1);
            expect(va.getAttribute(1).componentDatatype).toEqualEnumeration(colors.componentDatatype);
            expect(va.getAttribute(1).componentsPerAttribute).toEqual(colors.componentsPerAttribute);
            expect(va.getAttribute(1).offsetInBytes).toEqual(position.componentDatatype.sizeInBytes * position.componentsPerAttribute);
            expect(va.getAttribute(1).strideInBytes).toEqual(expectedStride);

            expect(va.getAttribute(0).vertexBuffer).toBe(va.getAttribute(1).vertexBuffer);
        });

        it("sorts interleaved attributes from large to small components", function () {
            var mesh = {
                attributes : {
                    bytes : {
                        componentDatatype      : Cesium.ComponentDatatype.BYTE,
                        componentsPerAttribute : 1,
                        values                 : [0]
                    },
                    shorts : {
                        componentDatatype      : Cesium.ComponentDatatype.SHORT,
                        componentsPerAttribute : 1,
                        values                 : [1]
                    },
                    floats : {
                        componentDatatype      : Cesium.ComponentDatatype.FLOAT,
                        componentsPerAttribute : 1,
                        values                 : [2]
                    }
                }
            };

            var attributeIndices = Cesium.MeshFilters.createAttributeIndices(mesh);
            var va = context.createVertexArrayFromMesh({
                mesh             : mesh,
                attributeIndices : attributeIndices,
                vertexLayout     : Cesium.VertexLayout.INTERLEAVED
            });

            expect(va.getNumberOfAttributes()).toEqual(3);

            var vertexBuffer = va.getAttribute(0).vertexBuffer;
            expect(vertexBuffer).toBe(va.getAttribute(1).vertexBuffer);
            expect(vertexBuffer).toBe(va.getAttribute(2).vertexBuffer);
            expect(vertexBuffer.getSizeInBytes()).toEqual(8);              // Includes 1 byte per-vertex padding

            // Validate via rendering
            var vs =
                "attribute float bytes; " +
                "attribute float shorts; " +
                "attribute float floats; " +
                "varying vec4 fsColor; " +
                "void main() " +
                "{ " +
                "  gl_PointSize = 1.0; " +
                "  gl_Position = vec4(0.0, 0.0, 0.0, 1.0); " +
                "  fsColor = vec4((bytes == 0.0) && (shorts == 1.0) && (floats == 2.0)); " +
                "}";
            var fs =
                "varying vec4 fsColor; " +
                "void main() " +
                "{ " +
                "  gl_FragColor = fsColor; " +
                "}";
            sp = context.createShaderProgram(vs, fs, attributeIndices);

            context.clear();
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            context.draw({
                primitiveType : Cesium.PrimitiveType.POINTS,
                shaderProgram : sp,
                vertexArray   : va
            });
            expect(context.readPixels()).toEqualArray([255, 255, 255, 255]);
        });

        it("sorts interleaved attributes from large to small components (2)", function () {
            // TODO:  Color should be normalized

            var mesh = {
                attributes : {
                    color : {
                        componentDatatype      : Cesium.ComponentDatatype.UNSIGNED_BYTE,
                        componentsPerAttribute : 4,
                        values                 : [
                            255, 0, 0, 255,
                            0, 255, 0, 255]
                    },
                    position : {
                        componentDatatype      : Cesium.ComponentDatatype.FLOAT,
                        componentsPerAttribute : 3,
                        values                 : [
                            0.0, 0.0, 0.0,
                            0.0, 0.0, 0.0
                        ]
                    }
                }
            };

            var attributeIndices = Cesium.MeshFilters.createAttributeIndices(mesh);
            var va = context.createVertexArrayFromMesh({
                mesh             : mesh,
                attributeIndices : attributeIndices,
                vertexLayout     : Cesium.VertexLayout.INTERLEAVED
            });

            expect(va.getAttribute(0).vertexBuffer.getSizeInBytes()).toEqual(32);  // No per-vertex padding needed

            // Validate via rendering
            var vs =
                "attribute vec3 position; " +
                "attribute vec4 color; " +
                "varying vec4 fsColor; " +
                "void main() " +
                "{ " +
                "  gl_PointSize = 1.0; " +
                "  gl_Position = vec4(position, 1.0); " +
                "  fsColor = color; " +
                "}";
            var fs =
                "varying vec4 fsColor; " +
                "void main() " +
                "{ " +
                "  gl_FragColor = fsColor; " +
                "}";
            sp = context.createShaderProgram(vs, fs, attributeIndices);

            context.clear();
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            context.draw({
                primitiveType : Cesium.PrimitiveType.POINTS,
                shaderProgram : sp,
                vertexArray   : va,
                offset        : 0,
                count         : 1
            });
            expect(context.readPixels()).toEqualArray([255, 0, 0, 255]);

            context.draw({
                primitiveType : Cesium.PrimitiveType.POINTS,
                shaderProgram : sp,
                vertexArray   : va,
                offset        : 1,
                count         : 1
            });
            expect(context.readPixels()).toEqualArray([0, 255, 0, 255]);
        });

        it("sorts interleaved attributes from large to small components (3)", function () {
            var mesh = {
                attributes : {
                    unsignedByteAttribute : {
                        componentDatatype      : Cesium.ComponentDatatype.UNSIGNED_BYTE,
                        componentsPerAttribute : 2,
                        values                 : [1, 2]
                    },
                    unsignedShortAttribute : {
                        componentDatatype      : Cesium.ComponentDatatype.UNSIGNED_SHORT,
                        componentsPerAttribute : 1,
                        values                 : [3]
                    },
                    byteAttribute : {
                        componentDatatype      : Cesium.ComponentDatatype.BYTE,
                        componentsPerAttribute : 1,
                        values                 : [4]
                    },
                    shortAttribute : {
                        componentDatatype      : Cesium.ComponentDatatype.SHORT,
                        componentsPerAttribute : 1,
                        values                 : [5]
                    }
                }
            };

            var attributeIndices = Cesium.MeshFilters.createAttributeIndices(mesh);
            var va = context.createVertexArrayFromMesh({
                mesh             : mesh,
                attributeIndices : attributeIndices,
                vertexLayout     : Cesium.VertexLayout.INTERLEAVED
            });

            expect(va.getNumberOfAttributes()).toEqual(4);
            expect(va.getAttribute(0).vertexBuffer.getSizeInBytes()).toEqual(8);  // Includes 1 byte per-vertex padding

            // Validate via rendering
            var vs =
                "attribute vec2 unsignedByteAttribute; " +
                "attribute float unsignedShortAttribute; " +
                "attribute float byteAttribute; " +
                "attribute float shortAttribute; " +
                "varying vec4 fsColor; " +
                "void main() " +
                "{ " +
                "  gl_PointSize = 1.0; " +
                "  gl_Position = vec4(0.0, 0.0, 0.0, 1.0); " +
                "  fsColor = vec4((unsignedByteAttribute.x == 1.0) && (unsignedByteAttribute.y == 2.0) && (unsignedShortAttribute == 3.0) && (byteAttribute == 4.0) && (shortAttribute == 5.0)); " +
                "}";
            var fs =
                "varying vec4 fsColor; " +
                "void main() " +
                "{ " +
                "  gl_FragColor = fsColor; " +
                "}";
            sp = context.createShaderProgram(vs, fs, attributeIndices);

            context.clear();
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            context.draw({
                primitiveType : Cesium.PrimitiveType.POINTS,
                shaderProgram : sp,
                vertexArray   : va
            });
            expect(context.readPixels()).toEqualArray([255, 255, 255, 255]);
        });

        it("creates a custom interleaved vertex", function () {
            // TODO:  Color should be normalized

            var mesh = {
                attributes : {
                    position : {
                        componentDatatype      : Cesium.ComponentDatatype.FLOAT,
                        componentsPerAttribute : 3,
                        values                 : [
                            0.0, 0.0, 0.0,
                            0.0, 0.0, 0.0
                        ]
                    },
                    color : {
                        componentDatatype      : Cesium.ComponentDatatype.UNSIGNED_BYTE,
                        componentsPerAttribute : 3,
                        values                 : [
                            255, 0, 0,
                            0, 255, 0]
                    },
                    normal : {
                        componentDatatype      : Cesium.ComponentDatatype.FLOAT,
                        componentsPerAttribute : 3,
                        values                 : [
                            1.0, 0.0, 0.0,
                            0.0, 1.0, 0.0
                        ]
                    },
                    temperature : {
                        componentDatatype      : Cesium.ComponentDatatype.UNSIGNED_SHORT,
                        componentsPerAttribute : 1,
                        values                 : [
                            75,
                            100
                        ]
                    }
                }
            };

            var attributeIndices = Cesium.MeshFilters.createAttributeIndices(mesh);
            var va = context.createVertexArrayFromMesh({
                mesh             : mesh,
                attributeIndices : attributeIndices,
                vertexLayout     : Cesium.VertexLayout.INTERLEAVED
            });

            expect(va.getAttribute(0).vertexBuffer.getSizeInBytes()).toEqual(2 * 32);  // Includes 3 byte per-vertex padding

            // Validate via rendering
            var vs =
                "attribute vec3 position; " +
                "attribute vec3 color; " +
                "attribute vec3 normal; " +
                "attribute float temperature; " +
                "varying vec4 fsColor; " +
                "void main() " +
                "{ " +
                "  gl_PointSize = 1.0; " +
                "  gl_Position = vec4(position, 1.0); " +
                "  if ((normal == vec3(1.0, 0.0, 0.0)) && (temperature == 75.0)) { " +
                "    fsColor = vec4(color, 1.0); " +
                "  } " +
                "  else {" +
                "    fsColor = vec4(1.0); " +
                "  }" +
                "}";
            var fs =
                "varying vec4 fsColor; " +
                "void main() " +
                "{ " +
                "  gl_FragColor = fsColor; " +
                "}";
            sp = context.createShaderProgram(vs, fs, attributeIndices);

            context.clear();
            expect(context.readPixels()).toEqualArray([0, 0, 0, 0]);

            context.draw({
                primitiveType : Cesium.PrimitiveType.POINTS,
                shaderProgram : sp,
                vertexArray   : va,
                offset        : 0,
                count         : 1
            });
            expect(context.readPixels()).toEqualArray([255, 0, 0, 255]);

            var vs2 =
                "attribute vec3 position; " +
                "attribute vec3 color; " +
                "attribute vec3 normal; " +
                "attribute float temperature; " +
                "varying vec4 fsColor; " +
                "void main() " +
                "{ " +
                "  gl_PointSize = 1.0; " +
                "  gl_Position = vec4(position, 1.0); " +
                "  if ((normal == vec3(0.0, 1.0, 0.0)) && (temperature == 100.0)) { " +
                "    fsColor = vec4(color, 1.0); " +
                "  } " +
                "  else {" +
                "    fsColor = vec4(1.0); " +
                "  }" +
                "}";
            sp = sp.destroy();
            sp = context.createShaderProgram(vs2, fs, attributeIndices);

            context.draw({
                primitiveType : Cesium.PrimitiveType.POINTS,
                shaderProgram : sp,
                vertexArray   : va,
                offset        : 1,
                count         : 1
            });
            expect(context.readPixels()).toEqualArray([0, 255, 0, 255]);
        });

        it("creates an index buffer", function () {
            var mesh = {
                indexLists : [
                    {
                        primitiveType : Cesium.PrimitiveType.POINTS,
                        values        : [0]
                    }
                ]
            };

            var va = context.createVertexArrayFromMesh({ mesh : mesh });

            expect(va.getNumberOfAttributes()).toEqual(0);
            expect(va.getIndexBuffer()).toBeDefined();
            expect(va.getIndexBuffer().getUsage()).toEqualEnumeration(Cesium.BufferUsage.DYNAMIC_DRAW); // Default
            expect(va.getIndexBuffer().getIndexDatatype()).toEqualEnumeration(Cesium.ComponentDatatype.UNSIGNED_SHORT);
            expect(va.getIndexBuffer().getNumberOfIndices()).toEqual(mesh.indexLists[0].values.length);
        });

        it("throws with multiple index lists", function () {
            var mesh = {
                indexLists : [
                    {
                        primitiveType : Cesium.PrimitiveType.POINTS,
                        values        : [0]
                    },
                    {
                        primitiveType : Cesium.PrimitiveType.POINTS,
                        values        : [1]
                    }
                ]
            };

            expect(function () {
                return context.createVertexArrayFromMesh({ mesh : mesh });
            }).toThrow();
        });

        it("throws with different number of interleaved attributes", function () {
            var mesh = {
                attributes : {
                    position : {
                        componentDatatype      : Cesium.ComponentDatatype.FLOAT,
                        componentsPerAttribute : 1,
                        values                 : [0.0]
                    },
                    normal : {
                        componentDatatype      : Cesium.ComponentDatatype.FLOAT,
                        componentsPerAttribute : 1,
                        values                 : [1.0, 2.0]
                    }
                }
            };

            expect(function () {
                return context.createVertexArrayFromMesh({ mesh : mesh, vertexLayout : Cesium.VertexLayout.INTERLEAVED });
            }).toThrow();
        });

        it("throws with duplicate indices", function () {
            var mesh = {
                attributes : {
                    position : {
                        componentDatatype      : Cesium.ComponentDatatype.FLOAT,
                        componentsPerAttribute : 1,
                        values                 : [0.0]
                    },
                    normal : {
                        componentDatatype      : Cesium.ComponentDatatype.FLOAT,
                        componentsPerAttribute : 1,
                        values                 : [1.0]
                    }
                }
            };

            expect(function () {
                return context.createVertexArrayFromMesh({
                    mesh             : mesh,
                    attributeIndices : { position : 0, normal : 0 }
                });
            }).toThrow();
        });
    });
}());