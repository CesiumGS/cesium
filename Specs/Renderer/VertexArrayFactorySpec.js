/*global defineSuite*/
defineSuite([
         'Specs/createContext',
         'Specs/destroyContext',
         'Core/ComponentDatatype',
         'Core/Geometry',
         'Core/GeometryAttribute',
         'Core/GeometryPipeline',
         'Core/PrimitiveType',
         'Core/IndexDatatype',
         'Renderer/BufferUsage',
         'Renderer/ClearCommand',
         'Renderer/VertexLayout'
     ], 'Renderer/VertexArrayFactory', function(
         createContext,
         destroyContext,
         ComponentDatatype,
         Geometry,
         GeometryAttribute,
         GeometryPipeline,
         PrimitiveType,
         IndexDatatype,
         BufferUsage,
         ClearCommand,
         VertexLayout) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    var context;
    var va;
    var sp;

    beforeAll(function() {
        context = createContext();
    });

    afterAll(function() {
        destroyContext(context);
    });

    afterEach(function() {
        va = va && va.destroy();
        sp = sp && sp.destroy();
    });

    it('creates with no arguments', function() {
        va = context.createVertexArrayFromGeometry();
        expect(va.getNumberOfAttributes()).toEqual(0);
        expect(va.getIndexBuffer()).not.toBeDefined();
    });

    it('creates with no geometry', function() {
        va = context.createVertexArrayFromGeometry({
            vertexLayout : VertexLayout.INTERLEAVED
        });
        expect(va.getNumberOfAttributes()).toEqual(0);
        expect(va.getIndexBuffer()).not.toBeDefined();
    });

    it('creates a single-attribute vertex (non-interleaved)', function() {
        var geometry = new Geometry({
            attributes : {
                position : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : [0.0, 0.0, 0.0, 1.0, 1.0, 1.0]
                })
            },
            primitiveType : PrimitiveType.POINTS
        });

        var va = context.createVertexArrayFromGeometry({
            geometry : geometry,
            attributeLocations : GeometryPipeline.createAttributeLocations(geometry)
        });

        expect(va.getNumberOfAttributes()).toEqual(1);
        expect(va.getIndexBuffer()).not.toBeDefined();

        var position = geometry.attributes.position;
        expect(va.getAttribute(0).index).toEqual(0);
        expect(va.getAttribute(0).componentDatatype).toEqual(position.componentDatatype);
        expect(va.getAttribute(0).componentsPerAttribute).toEqual(position.componentsPerAttribute);
        expect(va.getAttribute(0).offsetInBytes).toEqual(0);
        expect(va.getAttribute(0).strideInBytes).toEqual(0); // Tightly packed

        expect(va.getAttribute(0).vertexBuffer.getUsage()).toEqual(BufferUsage.DYNAMIC_DRAW); // Default
    });

    it('creates a single-attribute vertex (interleaved)', function() {
        var geometry = new Geometry({
            attributes : {
                position : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : [0.0, 0.0, 0.0, 1.0, 1.0, 1.0]
                })
            },
            primitiveType : PrimitiveType.POINTS
        });

        var va = context.createVertexArrayFromGeometry({
            geometry : geometry,
            attributeLocations : GeometryPipeline.createAttributeLocations(geometry),
            vertexLayout : VertexLayout.INTERLEAVED,
            bufferUsage : BufferUsage.STATIC_DRAW
        });

        expect(va.getNumberOfAttributes()).toEqual(1);
        expect(va.getIndexBuffer()).not.toBeDefined();

        var position = geometry.attributes.position;
        expect(va.getAttribute(0).index).toEqual(0);
        expect(va.getAttribute(0).componentDatatype).toEqual(position.componentDatatype);
        expect(va.getAttribute(0).componentsPerAttribute).toEqual(position.componentsPerAttribute);
        expect(va.getAttribute(0).offsetInBytes).toEqual(0);
        expect(va.getAttribute(0).strideInBytes).toEqual(position.componentDatatype.sizeInBytes * position.componentsPerAttribute);

        expect(va.getAttribute(0).vertexBuffer.getUsage()).toEqual(BufferUsage.STATIC_DRAW);
    });

    it('creates a homogeneous multiple-attribute vertex (non-interleaved)', function() {
        var geometry = new Geometry({
            attributes : {
                customPosition : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : [0.0, 0.0, 0.0, 2.0, 2.0, 2.0]
                }),
                customNormal : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : [1.0, 1.0, 1.0, 3.0, 3.0, 3.0]
                })
            },
            primitiveType : PrimitiveType.POINTS
        });

        var va = context.createVertexArrayFromGeometry({
            geometry : geometry,
            attributeLocations : GeometryPipeline.createAttributeLocations(geometry)
        });

        expect(va.getNumberOfAttributes()).toEqual(2);
        expect(va.getIndexBuffer()).not.toBeDefined();

        var position = geometry.attributes.customPosition;
        expect(va.getAttribute(0).index).toEqual(0);
        expect(va.getAttribute(0).componentDatatype).toEqual(position.componentDatatype);
        expect(va.getAttribute(0).componentsPerAttribute).toEqual(position.componentsPerAttribute);
        expect(va.getAttribute(0).offsetInBytes).toEqual(0);
        expect(va.getAttribute(0).strideInBytes).toEqual(0); // Tightly packed

        var normal = geometry.attributes.customNormal;
        expect(va.getAttribute(1).index).toEqual(1);
        expect(va.getAttribute(1).componentDatatype).toEqual(normal.componentDatatype);
        expect(va.getAttribute(1).componentsPerAttribute).toEqual(normal.componentsPerAttribute);
        expect(va.getAttribute(1).offsetInBytes).toEqual(0);
        expect(va.getAttribute(1).strideInBytes).toEqual(0); // Tightly packed

        expect(va.getAttribute(0).vertexBuffer).not.toBe(va.getAttribute(1).vertexBuffer);
    });

    it('creates a homogeneous multiple-attribute vertex (interleaved)', function() {
        var geometry = new Geometry({
            attributes : {
                customPosition : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : [0.0, 0.0, 0.0, 2.0, 2.0, 2.0]
                }),
                customNormal : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : [1.0, 1.0, 1.0, 3.0, 3.0, 3.0]
                })
            },
            primitiveType : PrimitiveType.POINTS
        });

        var va = context.createVertexArrayFromGeometry({
            geometry : geometry,
            attributeLocations : GeometryPipeline.createAttributeLocations(geometry),
            vertexLayout : VertexLayout.INTERLEAVED
        });

        expect(va.getNumberOfAttributes()).toEqual(2);
        expect(va.getIndexBuffer()).not.toBeDefined();

        var position = geometry.attributes.customPosition;
        var normal = geometry.attributes.customNormal;
        var expectedStride = position.componentDatatype.sizeInBytes * position.componentsPerAttribute + normal.componentDatatype.sizeInBytes * normal.componentsPerAttribute;

        expect(va.getAttribute(0).index).toEqual(0);
        expect(va.getAttribute(0).componentDatatype).toEqual(position.componentDatatype);
        expect(va.getAttribute(0).componentsPerAttribute).toEqual(position.componentsPerAttribute);
        expect(va.getAttribute(0).offsetInBytes).toEqual(0);
        expect(va.getAttribute(0).strideInBytes).toEqual(expectedStride);

        expect(va.getAttribute(1).index).toEqual(1);
        expect(va.getAttribute(1).componentDatatype).toEqual(normal.componentDatatype);
        expect(va.getAttribute(1).componentsPerAttribute).toEqual(normal.componentsPerAttribute);
        expect(va.getAttribute(1).offsetInBytes).toEqual(position.componentDatatype.sizeInBytes * position.componentsPerAttribute);
        expect(va.getAttribute(1).strideInBytes).toEqual(expectedStride);

        expect(va.getAttribute(0).vertexBuffer).toBe(va.getAttribute(1).vertexBuffer);
    });

    it('creates a heterogeneous multiple-attribute vertex (interleaved)', function() {
        var geometry = new Geometry({
            attributes : {
                position : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : [0.0, 0.0, 0.0, 2.0, 2.0, 2.0]
                }),
                colors : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                    componentsPerAttribute : 4,
                    values : [1, 1, 1, 1, 2, 2, 2, 2]
                })
            },
            primitiveType : PrimitiveType.POINTS
        });

        var va = context.createVertexArrayFromGeometry({
            geometry : geometry,
            attributeLocations : GeometryPipeline.createAttributeLocations(geometry),
            vertexLayout : VertexLayout.INTERLEAVED
        });

        expect(va.getNumberOfAttributes()).toEqual(2);
        expect(va.getIndexBuffer()).not.toBeDefined();

        var position = geometry.attributes.position;
        var colors = geometry.attributes.colors;
        var expectedStride = position.componentDatatype.sizeInBytes * position.componentsPerAttribute + colors.componentDatatype.sizeInBytes * colors.componentsPerAttribute;

        expect(va.getAttribute(0).index).toEqual(0);
        expect(va.getAttribute(0).componentDatatype).toEqual(position.componentDatatype);
        expect(va.getAttribute(0).componentsPerAttribute).toEqual(position.componentsPerAttribute);
        expect(va.getAttribute(0).offsetInBytes).toEqual(0);
        expect(va.getAttribute(0).strideInBytes).toEqual(expectedStride);

        expect(va.getAttribute(1).index).toEqual(1);
        expect(va.getAttribute(1).componentDatatype).toEqual(colors.componentDatatype);
        expect(va.getAttribute(1).componentsPerAttribute).toEqual(colors.componentsPerAttribute);
        expect(va.getAttribute(1).offsetInBytes).toEqual(position.componentDatatype.sizeInBytes * position.componentsPerAttribute);
        expect(va.getAttribute(1).strideInBytes).toEqual(expectedStride);

        expect(va.getAttribute(0).vertexBuffer).toBe(va.getAttribute(1).vertexBuffer);
    });

    it('sorts interleaved attributes from large to small components', function() {
        var geometry = new Geometry({
            attributes : {
                bytes : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.BYTE,
                    componentsPerAttribute : 1,
                    values : [0]
                }),
                shorts : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.SHORT,
                    componentsPerAttribute : 1,
                    values : [1]
                }),
                floats : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 1,
                    values : [2]
                })
            },
            primitiveType : PrimitiveType.POINTS
        });

        var attributeLocations = GeometryPipeline.createAttributeLocations(geometry);
        var va = context.createVertexArrayFromGeometry({
            geometry : geometry,
            attributeLocations : attributeLocations,
            vertexLayout : VertexLayout.INTERLEAVED
        });

        expect(va.getNumberOfAttributes()).toEqual(3);

        var vertexBuffer = va.getAttribute(0).vertexBuffer;
        expect(vertexBuffer).toBe(va.getAttribute(1).vertexBuffer);
        expect(vertexBuffer).toBe(va.getAttribute(2).vertexBuffer);
        expect(vertexBuffer.getSizeInBytes()).toEqual(8); // Includes 1 byte per-vertex padding

        // Validate via rendering
        var vs =
            'attribute float bytes; ' +
            'attribute float shorts; ' +
            'attribute float floats; ' +
            'varying vec4 fsColor; ' +
            'void main() { ' +
            '  gl_PointSize = 1.0; ' +
            '  gl_Position = vec4(0.0, 0.0, 0.0, 1.0); ' +
            '  fsColor = vec4((bytes == 0.0) && (shorts == 1.0) && (floats == 2.0)); ' +
            '}';
        var fs =
            'varying vec4 fsColor; ' +
            'void main() { ' +
            '  gl_FragColor = fsColor; ' +
            '}';
        sp = context.createShaderProgram(vs, fs, attributeLocations);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('sorts interleaved attributes from large to small components (2)', function() {
        var geometry = new Geometry({
            attributes : {
                color : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                    componentsPerAttribute : 4,
                    normalize : true,
                    values : [255, 0, 0, 255, 0, 255, 0, 255]
                }),
                position : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
                })
            },
            primitiveType : PrimitiveType.POINTS
        });

        var attributeLocations = GeometryPipeline.createAttributeLocations(geometry);
        var va = context.createVertexArrayFromGeometry({
            geometry : geometry,
            attributeLocations : attributeLocations,
            vertexLayout : VertexLayout.INTERLEAVED
        });

        expect(va.getAttribute(0).vertexBuffer.getSizeInBytes()).toEqual(32); // No per-vertex padding needed

        // Validate via rendering
        var vs =
            'attribute vec3 position; ' +
            'attribute vec4 color; ' +
            'varying vec4 fsColor; ' +
            'void main() { ' +
            '  gl_PointSize = 1.0; ' +
            '  gl_Position = vec4(position, 1.0); ' +
            '  fsColor = color; ' +
            '}';
        var fs =
            'varying vec4 fsColor; ' +
            'void main() { ' +
            '  gl_FragColor = fsColor; ' +
            '}';
        sp = context.createShaderProgram(vs, fs, attributeLocations);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            offset : 0,
            count : 1
        });
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);

        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            offset : 1,
            count : 1
        });
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
    });

    it('sorts interleaved attributes from large to small components (3)', function() {
        var geometry = new Geometry({
            attributes : {
                unsignedByteAttribute : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                    componentsPerAttribute : 2,
                    values : [1, 2]
                }),
                unsignedShortAttribute : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.UNSIGNED_SHORT,
                    componentsPerAttribute : 1,
                    values : [3]
                }),
                byteAttribute : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.BYTE,
                    componentsPerAttribute : 1,
                    values : [4]
                }),
                shortAttribute : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.SHORT,
                    componentsPerAttribute : 1,
                    values : [5]
                })
            },
            primitiveType : PrimitiveType.POINTS
        });

        var attributeLocations = GeometryPipeline.createAttributeLocations(geometry);
        var va = context.createVertexArrayFromGeometry({
            geometry : geometry,
            attributeLocations : attributeLocations,
            vertexLayout : VertexLayout.INTERLEAVED
        });

        expect(va.getNumberOfAttributes()).toEqual(4);
        expect(va.getAttribute(0).vertexBuffer.getSizeInBytes()).toEqual(8); // Includes 1 byte per-vertex padding

        // Validate via rendering
        var vs =
            'attribute vec2 unsignedByteAttribute; ' +
            'attribute float unsignedShortAttribute; ' +
            'attribute float byteAttribute; ' +
            'attribute float shortAttribute; ' +
            'varying vec4 fsColor; ' +
            'void main() { ' +
            '  gl_PointSize = 1.0; ' +
            '  gl_Position = vec4(0.0, 0.0, 0.0, 1.0); ' +
            '  fsColor = vec4((unsignedByteAttribute.x == 1.0) && (unsignedByteAttribute.y == 2.0) && (unsignedShortAttribute == 3.0) && (byteAttribute == 4.0) && (shortAttribute == 5.0)); ' +
            '}';
        var fs =
            'varying vec4 fsColor; ' +
            'void main() { ' +
            '  gl_FragColor = fsColor; ' +
            '}';
        sp = context.createShaderProgram(vs, fs, attributeLocations);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va
        });
        expect(context.readPixels()).toEqual([255, 255, 255, 255]);
    });

    it('creates a custom interleaved vertex', function() {
        var geometry = new Geometry({
            attributes : {
                position : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
                }),
                color : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                    componentsPerAttribute : 3,
                    normalize : true,
                    values : [255, 0, 0, 0, 255, 0]
                }),
                normal : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : [1.0, 0.0, 0.0, 0.0, 1.0, 0.0]
                }),
                temperature : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.UNSIGNED_SHORT,
                    componentsPerAttribute : 1,
                    values : [75, 100]
                })
            },
            primitiveType : PrimitiveType.POINTS
        });

        var attributeLocations = GeometryPipeline.createAttributeLocations(geometry);
        var va = context.createVertexArrayFromGeometry({
            geometry : geometry,
            attributeLocations : attributeLocations,
            vertexLayout : VertexLayout.INTERLEAVED
        });

        expect(va.getAttribute(0).vertexBuffer.getSizeInBytes()).toEqual(2 * 32); // Includes 3 byte per-vertex padding

        // Validate via rendering
        var vs =
            'attribute vec3 position; ' +
            'attribute vec3 color; ' +
            'attribute vec3 normal; ' +
            'attribute float temperature; ' +
            'varying vec4 fsColor; ' +
            'void main() { ' +
            '  gl_PointSize = 1.0; ' +
            '  gl_Position = vec4(position, 1.0); ' +
            '  if ((normal == vec3(1.0, 0.0, 0.0)) && (temperature == 75.0)) { ' +
            '    fsColor = vec4(color, 1.0); ' +
            '  } ' +
            '  else {' +
            '    fsColor = vec4(1.0); ' +
            '  }' +
            '}';
        var fs =
            'varying vec4 fsColor; ' +
            'void main() { ' +
            '  gl_FragColor = fsColor; ' +
            '}';
        sp = context.createShaderProgram(vs, fs, attributeLocations);

        ClearCommand.ALL.execute(context);
        expect(context.readPixels()).toEqual([0, 0, 0, 0]);

        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            offset : 0,
            count : 1
        });
        expect(context.readPixels()).toEqual([255, 0, 0, 255]);

        var vs2 =
            'attribute vec3 position; ' +
            'attribute vec3 color; ' +
            'attribute vec3 normal; ' +
            'attribute float temperature; ' +
            'varying vec4 fsColor; ' +
            'void main() { ' +
            '  gl_PointSize = 1.0; ' +
            '  gl_Position = vec4(position, 1.0); ' +
            '  if ((normal == vec3(0.0, 1.0, 0.0)) && (temperature == 100.0)) { ' +
            '    fsColor = vec4(color, 1.0); ' +
            '  } ' +
            '  else {' +
            '    fsColor = vec4(1.0); ' +
            '  }' +
            '}';
        sp = sp.destroy();
        sp = context.createShaderProgram(vs2, fs, attributeLocations);

        context.draw({
            primitiveType : PrimitiveType.POINTS,
            shaderProgram : sp,
            vertexArray : va,
            offset : 1,
            count : 1
        });
        expect(context.readPixels()).toEqual([0, 255, 0, 255]);
    });

    it('creates an index buffer', function() {
        var geometry = new Geometry({
            attributes : {},
            indices : [0],
            primitiveType : PrimitiveType.POINTS
        });

        var va = context.createVertexArrayFromGeometry({
            geometry : geometry
        });

        expect(va.getNumberOfAttributes()).toEqual(0);
        expect(va.getIndexBuffer()).toBeDefined();
        expect(va.getIndexBuffer().getUsage()).toEqual(BufferUsage.DYNAMIC_DRAW); // Default
        expect(va.getIndexBuffer().getIndexDatatype()).toEqual(IndexDatatype.UNSIGNED_SHORT);
        expect(va.getIndexBuffer().getNumberOfIndices()).toEqual(geometry.indices.length);
    });

    it('throws with different number of interleaved attributes', function() {
        var geometry = new Geometry({
            attributes : {
                position : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 1,
                    values : [0.0]
                }),
                normal : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 1,
                    values : [1.0, 2.0]
                })
            },
            primitiveType : PrimitiveType.POINTS
        });

        expect(function() {
            return context.createVertexArrayFromGeometry({
                geometry : geometry,
                vertexLayout : VertexLayout.INTERLEAVED
            });
        }).toThrow();
    });

    it('throws with duplicate indices', function() {
        var geometry = new Geometry({
            attributes : {
                position : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 1,
                    values : [0.0]
                }),
                normal : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 1,
                    values : [1.0]
                })
            },
            primitiveType : PrimitiveType.POINTS
        });

        expect(function() {
            return context.createVertexArrayFromGeometry({
                geometry : geometry,
                attributeLocations : {
                    position : 0,
                    normal : 0
                }
            });
        }).toThrow();
    });
}, 'WebGL');