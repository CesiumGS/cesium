import {
  ComponentDatatype,
  Geometry,
  GeometryAttribute,
  GeometryPipeline,
  IndexDatatype,
  PrimitiveType,
  BufferUsage,
  ClearCommand,
  DrawCommand,
  ShaderProgram,
  RuntimeError,
  VertexArray,
} from "../../index.js";;

import createContext from "../../../../Specs/createContext.js";;

describe(
  "Renderer/VertexArrayFactory",
  function () {
    let context;
    let va;
    let sp;

    beforeAll(function () {
      context = createContext();
    });

    afterAll(function () {
      context.destroyForSpecs();
    });

    afterEach(function () {
      va = va && va.destroy();
      sp = sp && sp.destroy();
    });

    it("throws when there is no context", function () {
      expect(function () {
        return VertexArray.fromGeometry();
      }).toThrowDeveloperError();
    });

    it("creates with no optional arguments", function () {
      va = VertexArray.fromGeometry({
        context: context,
      });
      expect(va.numberOfAttributes).toEqual(0);
      expect(va.indexBuffer).not.toBeDefined();
    });

    it("creates with no geometry", function () {
      va = VertexArray.fromGeometry({
        context: context,
        interleave: true,
      });
      expect(va.numberOfAttributes).toEqual(0);
      expect(va.indexBuffer).not.toBeDefined();
    });

    it("creates a single-attribute vertex (non-interleaved)", function () {
      const geometry = new Geometry({
        attributes: {
          position: new GeometryAttribute({
            componentDatatype: ComponentDatatype.FLOAT,
            componentsPerAttribute: 3,
            values: [0.0, 0.0, 0.0, 1.0, 1.0, 1.0],
          }),
        },
        primitiveType: PrimitiveType.POINTS,
      });

      const va = VertexArray.fromGeometry({
        context: context,
        geometry: geometry,
        attributeLocations: GeometryPipeline.createAttributeLocations(geometry),
      });

      expect(va.numberOfAttributes).toEqual(1);
      expect(va.indexBuffer).not.toBeDefined();

      const position = geometry.attributes.position;
      expect(va.getAttribute(0).index).toEqual(0);
      expect(va.getAttribute(0).componentDatatype).toEqual(
        position.componentDatatype
      );
      expect(va.getAttribute(0).componentsPerAttribute).toEqual(
        position.componentsPerAttribute
      );
      expect(va.getAttribute(0).offsetInBytes).toEqual(0);
      expect(va.getAttribute(0).strideInBytes).toEqual(0); // Tightly packed

      expect(va.getAttribute(0).vertexBuffer.usage).toEqual(
        BufferUsage.DYNAMIC_DRAW
      ); // Default
    });

    it("creates a single-attribute vertex (interleaved)", function () {
      const geometry = new Geometry({
        attributes: {
          position: new GeometryAttribute({
            componentDatatype: ComponentDatatype.FLOAT,
            componentsPerAttribute: 3,
            values: [0.0, 0.0, 0.0, 1.0, 1.0, 1.0],
          }),
        },
        primitiveType: PrimitiveType.POINTS,
      });

      const va = VertexArray.fromGeometry({
        context: context,
        geometry: geometry,
        attributeLocations: GeometryPipeline.createAttributeLocations(geometry),
        interleave: true,
        bufferUsage: BufferUsage.STATIC_DRAW,
      });

      expect(va.numberOfAttributes).toEqual(1);
      expect(va.indexBuffer).not.toBeDefined();

      const position = geometry.attributes.position;
      expect(va.getAttribute(0).index).toEqual(0);
      expect(va.getAttribute(0).componentDatatype).toEqual(
        position.componentDatatype
      );
      expect(va.getAttribute(0).componentsPerAttribute).toEqual(
        position.componentsPerAttribute
      );
      expect(va.getAttribute(0).offsetInBytes).toEqual(0);
      expect(va.getAttribute(0).strideInBytes).toEqual(
        ComponentDatatype.getSizeInBytes(position.componentDatatype) *
          position.componentsPerAttribute
      );

      expect(va.getAttribute(0).vertexBuffer.usage).toEqual(
        BufferUsage.STATIC_DRAW
      );
    });

    it("creates a homogeneous multiple-attribute vertex (non-interleaved)", function () {
      const geometry = new Geometry({
        attributes: {
          customPosition: new GeometryAttribute({
            componentDatatype: ComponentDatatype.FLOAT,
            componentsPerAttribute: 3,
            values: [0.0, 0.0, 0.0, 2.0, 2.0, 2.0],
          }),
          customNormal: new GeometryAttribute({
            componentDatatype: ComponentDatatype.FLOAT,
            componentsPerAttribute: 3,
            values: [1.0, 1.0, 1.0, 3.0, 3.0, 3.0],
          }),
        },
        primitiveType: PrimitiveType.POINTS,
      });

      const va = VertexArray.fromGeometry({
        context: context,
        geometry: geometry,
        attributeLocations: GeometryPipeline.createAttributeLocations(geometry),
      });

      expect(va.numberOfAttributes).toEqual(2);
      expect(va.indexBuffer).not.toBeDefined();

      const position = geometry.attributes.customPosition;
      expect(va.getAttribute(0).index).toEqual(0);
      expect(va.getAttribute(0).componentDatatype).toEqual(
        position.componentDatatype
      );
      expect(va.getAttribute(0).componentsPerAttribute).toEqual(
        position.componentsPerAttribute
      );
      expect(va.getAttribute(0).offsetInBytes).toEqual(0);
      expect(va.getAttribute(0).strideInBytes).toEqual(0); // Tightly packed

      const normal = geometry.attributes.customNormal;
      expect(va.getAttribute(1).index).toEqual(1);
      expect(va.getAttribute(1).componentDatatype).toEqual(
        normal.componentDatatype
      );
      expect(va.getAttribute(1).componentsPerAttribute).toEqual(
        normal.componentsPerAttribute
      );
      expect(va.getAttribute(1).offsetInBytes).toEqual(0);
      expect(va.getAttribute(1).strideInBytes).toEqual(0); // Tightly packed

      expect(va.getAttribute(0).vertexBuffer).not.toBe(
        va.getAttribute(1).vertexBuffer
      );
    });

    it("creates a homogeneous multiple-attribute vertex (interleaved)", function () {
      const geometry = new Geometry({
        attributes: {
          customPosition: new GeometryAttribute({
            componentDatatype: ComponentDatatype.FLOAT,
            componentsPerAttribute: 3,
            values: [0.0, 0.0, 0.0, 2.0, 2.0, 2.0],
          }),
          customNormal: new GeometryAttribute({
            componentDatatype: ComponentDatatype.FLOAT,
            componentsPerAttribute: 3,
            values: [1.0, 1.0, 1.0, 3.0, 3.0, 3.0],
          }),
        },
        primitiveType: PrimitiveType.POINTS,
      });

      const va = VertexArray.fromGeometry({
        context: context,
        geometry: geometry,
        attributeLocations: GeometryPipeline.createAttributeLocations(geometry),
        interleave: true,
      });

      expect(va.numberOfAttributes).toEqual(2);
      expect(va.indexBuffer).not.toBeDefined();

      const position = geometry.attributes.customPosition;
      const normal = geometry.attributes.customNormal;
      const expectedStride =
        ComponentDatatype.getSizeInBytes(position.componentDatatype) *
          position.componentsPerAttribute +
        ComponentDatatype.getSizeInBytes(normal.componentDatatype) *
          normal.componentsPerAttribute;

      expect(va.getAttribute(0).index).toEqual(0);
      expect(va.getAttribute(0).componentDatatype).toEqual(
        position.componentDatatype
      );
      expect(va.getAttribute(0).componentsPerAttribute).toEqual(
        position.componentsPerAttribute
      );
      expect(va.getAttribute(0).offsetInBytes).toEqual(0);
      expect(va.getAttribute(0).strideInBytes).toEqual(expectedStride);

      expect(va.getAttribute(1).index).toEqual(1);
      expect(va.getAttribute(1).componentDatatype).toEqual(
        normal.componentDatatype
      );
      expect(va.getAttribute(1).componentsPerAttribute).toEqual(
        normal.componentsPerAttribute
      );
      expect(va.getAttribute(1).offsetInBytes).toEqual(
        ComponentDatatype.getSizeInBytes(position.componentDatatype) *
          position.componentsPerAttribute
      );
      expect(va.getAttribute(1).strideInBytes).toEqual(expectedStride);

      expect(va.getAttribute(0).vertexBuffer).toBe(
        va.getAttribute(1).vertexBuffer
      );
    });

    it("creates a heterogeneous multiple-attribute vertex (interleaved)", function () {
      const geometry = new Geometry({
        attributes: {
          position: new GeometryAttribute({
            componentDatatype: ComponentDatatype.FLOAT,
            componentsPerAttribute: 3,
            values: [0.0, 0.0, 0.0, 2.0, 2.0, 2.0],
          }),
          colors: new GeometryAttribute({
            componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
            componentsPerAttribute: 4,
            values: [1, 1, 1, 1, 2, 2, 2, 2],
          }),
        },
        primitiveType: PrimitiveType.POINTS,
      });

      const va = VertexArray.fromGeometry({
        context: context,
        geometry: geometry,
        attributeLocations: GeometryPipeline.createAttributeLocations(geometry),
        interleave: true,
      });

      expect(va.numberOfAttributes).toEqual(2);
      expect(va.indexBuffer).not.toBeDefined();

      const position = geometry.attributes.position;
      const colors = geometry.attributes.colors;
      const expectedStride =
        ComponentDatatype.getSizeInBytes(position.componentDatatype) *
          position.componentsPerAttribute +
        ComponentDatatype.getSizeInBytes(colors.componentDatatype) *
          colors.componentsPerAttribute;

      expect(va.getAttribute(0).index).toEqual(0);
      expect(va.getAttribute(0).componentDatatype).toEqual(
        position.componentDatatype
      );
      expect(va.getAttribute(0).componentsPerAttribute).toEqual(
        position.componentsPerAttribute
      );
      expect(va.getAttribute(0).offsetInBytes).toEqual(0);
      expect(va.getAttribute(0).strideInBytes).toEqual(expectedStride);

      expect(va.getAttribute(1).index).toEqual(1);
      expect(va.getAttribute(1).componentDatatype).toEqual(
        colors.componentDatatype
      );
      expect(va.getAttribute(1).componentsPerAttribute).toEqual(
        colors.componentsPerAttribute
      );
      expect(va.getAttribute(1).offsetInBytes).toEqual(
        ComponentDatatype.getSizeInBytes(position.componentDatatype) *
          position.componentsPerAttribute
      );
      expect(va.getAttribute(1).strideInBytes).toEqual(expectedStride);

      expect(va.getAttribute(0).vertexBuffer).toBe(
        va.getAttribute(1).vertexBuffer
      );
    });

    it("sorts interleaved attributes from large to small components", function () {
      const geometry = new Geometry({
        attributes: {
          bytes: new GeometryAttribute({
            componentDatatype: ComponentDatatype.BYTE,
            componentsPerAttribute: 1,
            values: [0],
          }),
          shorts: new GeometryAttribute({
            componentDatatype: ComponentDatatype.SHORT,
            componentsPerAttribute: 1,
            values: [1],
          }),
          floats: new GeometryAttribute({
            componentDatatype: ComponentDatatype.FLOAT,
            componentsPerAttribute: 1,
            values: [2],
          }),
        },
        primitiveType: PrimitiveType.POINTS,
      });

      const attributeLocations = GeometryPipeline.createAttributeLocations(
        geometry
      );
      const va = VertexArray.fromGeometry({
        context: context,
        geometry: geometry,
        attributeLocations: attributeLocations,
        interleave: true,
      });

      expect(va.numberOfAttributes).toEqual(3);

      const vertexBuffer = va.getAttribute(0).vertexBuffer;
      expect(vertexBuffer).toBe(va.getAttribute(1).vertexBuffer);
      expect(vertexBuffer).toBe(va.getAttribute(2).vertexBuffer);
      expect(vertexBuffer.sizeInBytes).toEqual(8); // Includes 1 byte per-vertex padding

      // Validate via rendering
      const vs =
        "attribute float bytes; " +
        "attribute float shorts; " +
        "attribute float floats; " +
        "varying vec4 fsColor; " +
        "void main() { " +
        "  gl_PointSize = 1.0; " +
        "  gl_Position = vec4(0.0, 0.0, 0.0, 1.0); " +
        "  fsColor = vec4((bytes == 0.0) && (shorts == 1.0) && (floats == 2.0)); " +
        "}";
      const fs =
        "varying vec4 fsColor; " +
        "void main() { " +
        "  gl_FragColor = fsColor; " +
        "}";

      sp = ShaderProgram.fromCache({
        context: context,
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: attributeLocations,
      });

      ClearCommand.ALL.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      const command = new DrawCommand({
        primitiveType: PrimitiveType.POINTS,
        shaderProgram: sp,
        vertexArray: va,
      });
      command.execute(context);
      expect(context).toReadPixels([255, 255, 255, 255]);
    });

    it("sorts interleaved attributes from large to small components (2)", function () {
      const geometry = new Geometry({
        attributes: {
          color: new GeometryAttribute({
            componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
            componentsPerAttribute: 4,
            normalize: true,
            values: [255, 0, 0, 255, 0, 255, 0, 255],
          }),
          position: new GeometryAttribute({
            componentDatatype: ComponentDatatype.FLOAT,
            componentsPerAttribute: 3,
            values: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
          }),
        },
        primitiveType: PrimitiveType.POINTS,
      });

      const attributeLocations = GeometryPipeline.createAttributeLocations(
        geometry
      );
      const va = VertexArray.fromGeometry({
        context: context,
        geometry: geometry,
        attributeLocations: attributeLocations,
        interleave: true,
      });

      expect(va.getAttribute(0).vertexBuffer.sizeInBytes).toEqual(32); // No per-vertex padding needed

      // Validate via rendering
      const vs =
        "attribute vec3 position; " +
        "attribute vec4 color; " +
        "varying vec4 fsColor; " +
        "void main() { " +
        "  gl_PointSize = 1.0; " +
        "  gl_Position = vec4(position, 1.0); " +
        "  fsColor = color; " +
        "}";
      const fs =
        "varying vec4 fsColor; " +
        "void main() { " +
        "  gl_FragColor = fsColor; " +
        "}";
      sp = ShaderProgram.fromCache({
        context: context,
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: attributeLocations,
      });

      ClearCommand.ALL.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      let command = new DrawCommand({
        primitiveType: PrimitiveType.POINTS,
        shaderProgram: sp,
        vertexArray: va,
        offset: 0,
        count: 1,
      });
      command.execute(context);
      expect(context).toReadPixels([255, 0, 0, 255]);

      command = new DrawCommand({
        primitiveType: PrimitiveType.POINTS,
        shaderProgram: sp,
        vertexArray: va,
        offset: 1,
        count: 1,
      });
      command.execute(context);
      expect(context).toReadPixels([0, 255, 0, 255]);
    });

    it("sorts interleaved attributes from large to small components (3)", function () {
      const geometry = new Geometry({
        attributes: {
          unsignedByteAttribute: new GeometryAttribute({
            componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
            componentsPerAttribute: 2,
            values: [1, 2],
          }),
          unsignedShortAttribute: new GeometryAttribute({
            componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
            componentsPerAttribute: 1,
            values: [3],
          }),
          byteAttribute: new GeometryAttribute({
            componentDatatype: ComponentDatatype.BYTE,
            componentsPerAttribute: 1,
            values: [4],
          }),
          shortAttribute: new GeometryAttribute({
            componentDatatype: ComponentDatatype.SHORT,
            componentsPerAttribute: 1,
            values: [5],
          }),
        },
        primitiveType: PrimitiveType.POINTS,
      });

      const attributeLocations = GeometryPipeline.createAttributeLocations(
        geometry
      );
      const va = VertexArray.fromGeometry({
        context: context,
        geometry: geometry,
        attributeLocations: attributeLocations,
        interleave: true,
      });

      expect(va.numberOfAttributes).toEqual(4);
      expect(va.getAttribute(0).vertexBuffer.sizeInBytes).toEqual(8); // Includes 1 byte per-vertex padding

      // Validate via rendering
      const vs =
        "attribute vec2 unsignedByteAttribute; " +
        "attribute float unsignedShortAttribute; " +
        "attribute float byteAttribute; " +
        "attribute float shortAttribute; " +
        "varying vec4 fsColor; " +
        "void main() { " +
        "  gl_PointSize = 1.0; " +
        "  gl_Position = vec4(0.0, 0.0, 0.0, 1.0); " +
        "  fsColor = vec4((unsignedByteAttribute.x == 1.0) && (unsignedByteAttribute.y == 2.0) && (unsignedShortAttribute == 3.0) && (byteAttribute == 4.0) && (shortAttribute == 5.0)); " +
        "}";
      const fs =
        "varying vec4 fsColor; " +
        "void main() { " +
        "  gl_FragColor = fsColor; " +
        "}";
      sp = ShaderProgram.fromCache({
        context: context,
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: attributeLocations,
      });

      ClearCommand.ALL.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      const command = new DrawCommand({
        primitiveType: PrimitiveType.POINTS,
        shaderProgram: sp,
        vertexArray: va,
      });
      command.execute(context);
      expect(context).toReadPixels([255, 255, 255, 255]);
    });

    it("creates a custom interleaved vertex", function () {
      const geometry = new Geometry({
        attributes: {
          position: new GeometryAttribute({
            componentDatatype: ComponentDatatype.FLOAT,
            componentsPerAttribute: 3,
            values: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
          }),
          color: new GeometryAttribute({
            componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
            componentsPerAttribute: 3,
            normalize: true,
            values: [255, 0, 0, 0, 255, 0],
          }),
          normal: new GeometryAttribute({
            componentDatatype: ComponentDatatype.FLOAT,
            componentsPerAttribute: 3,
            values: [1.0, 0.0, 0.0, 0.0, 1.0, 0.0],
          }),
          temperature: new GeometryAttribute({
            componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
            componentsPerAttribute: 1,
            values: [75, 100],
          }),
        },
        primitiveType: PrimitiveType.POINTS,
      });

      const attributeLocations = GeometryPipeline.createAttributeLocations(
        geometry
      );
      const va = VertexArray.fromGeometry({
        context: context,
        geometry: geometry,
        attributeLocations: attributeLocations,
        interleave: true,
      });

      expect(va.getAttribute(0).vertexBuffer.sizeInBytes).toEqual(2 * 32); // Includes 3 byte per-vertex padding

      // Validate via rendering
      const vs =
        "attribute vec3 position; " +
        "attribute vec3 color; " +
        "attribute vec3 normal; " +
        "attribute float temperature; " +
        "varying vec4 fsColor; " +
        "void main() { " +
        "  gl_PointSize = 1.0; " +
        "  gl_Position = vec4(position, 1.0); " +
        "  if ((normal == vec3(1.0, 0.0, 0.0)) && (temperature == 75.0)) { " +
        "    fsColor = vec4(color, 1.0); " +
        "  } " +
        "  else {" +
        "    fsColor = vec4(1.0); " +
        "  }" +
        "}";
      const fs =
        "varying vec4 fsColor; " +
        "void main() { " +
        "  gl_FragColor = fsColor; " +
        "}";
      sp = ShaderProgram.fromCache({
        context: context,
        vertexShaderSource: vs,
        fragmentShaderSource: fs,
        attributeLocations: attributeLocations,
      });

      ClearCommand.ALL.execute(context);
      expect(context).toReadPixels([0, 0, 0, 255]);

      let command = new DrawCommand({
        primitiveType: PrimitiveType.POINTS,
        shaderProgram: sp,
        vertexArray: va,
        offset: 0,
        count: 1,
      });
      command.execute(context);
      expect(context).toReadPixels([255, 0, 0, 255]);

      const vs2 =
        "attribute vec3 position; " +
        "attribute vec3 color; " +
        "attribute vec3 normal; " +
        "attribute float temperature; " +
        "varying vec4 fsColor; " +
        "void main() { " +
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
      sp = ShaderProgram.fromCache({
        context: context,
        vertexShaderSource: vs2,
        fragmentShaderSource: fs,
        attributeLocations: attributeLocations,
      });

      command = new DrawCommand({
        primitiveType: PrimitiveType.POINTS,
        shaderProgram: sp,
        vertexArray: va,
        offset: 1,
        count: 1,
      });
      command.execute(context);
      expect(context).toReadPixels([0, 255, 0, 255]);
    });

    it("creates an index buffer", function () {
      const geometry = new Geometry({
        attributes: {},
        indices: [0],
        primitiveType: PrimitiveType.POINTS,
      });

      const va = VertexArray.fromGeometry({
        context: context,
        geometry: geometry,
      });

      expect(va.numberOfAttributes).toEqual(0);
      expect(va.indexBuffer).toBeDefined();
      expect(va.indexBuffer.usage).toEqual(BufferUsage.DYNAMIC_DRAW); // Default
      expect(va.indexBuffer.indexDatatype).toEqual(
        IndexDatatype.UNSIGNED_SHORT
      );
      expect(va.indexBuffer.numberOfIndices).toEqual(geometry.indices.length);
    });

    it("throws with different number of interleaved attributes", function () {
      const geometry = new Geometry({
        attributes: {
          position: new GeometryAttribute({
            componentDatatype: ComponentDatatype.FLOAT,
            componentsPerAttribute: 1,
            values: [0.0],
          }),
          normal: new GeometryAttribute({
            componentDatatype: ComponentDatatype.FLOAT,
            componentsPerAttribute: 1,
            values: [1.0, 2.0],
          }),
        },
        primitiveType: PrimitiveType.POINTS,
      });

      expect(function () {
        return VertexArray.fromGeometry({
          context: context,
          geometry: geometry,
          interleave: true,
        });
      }).toThrowError(RuntimeError);
    });

    it("throws with duplicate indices", function () {
      const geometry = new Geometry({
        attributes: {
          position: new GeometryAttribute({
            componentDatatype: ComponentDatatype.FLOAT,
            componentsPerAttribute: 1,
            values: [0.0],
          }),
          normal: new GeometryAttribute({
            componentDatatype: ComponentDatatype.FLOAT,
            componentsPerAttribute: 1,
            values: [1.0],
          }),
        },
        primitiveType: PrimitiveType.POINTS,
      });

      expect(function () {
        return VertexArray.fromGeometry({
          context: context,
          geometry: geometry,
          attributeLocations: {
            position: 0,
            normal: 0,
          },
        });
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
