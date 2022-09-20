import {
  ComponentDatatype,
  BufferUsage,
  VertexArrayFacade,
} from "../../index.js";;

import createContext from "../../../../Specs/createContext.js";;

describe(
  "Renderer/VertexArrayFacade",
  function () {
    let context;

    beforeAll(function () {
      context = createContext();
    });

    afterAll(function () {
      context.destroyForSpecs();
    });

    it("creates a vertex array with static floats", function () {
      const positionIndex = 0;
      const vaf = new VertexArrayFacade(
        context,
        [
          {
            index: positionIndex,
            componentsPerAttribute: 3,
            componentDatatype: ComponentDatatype.FLOAT,
            usage: BufferUsage.STATIC_DRAW,
          },
        ],
        1
      );

      const writer = vaf.writers[positionIndex];
      expect(writer).toBeDefined();

      writer(0, 1.0, 2.0, 3.0); // Write [1.0, 2.0, 3.0] at index zero.
      vaf.commit(); // Commit writes

      expect(vaf.va[0].va.getAttribute(0).vertexBuffer).toBeDefined();
      expect(vaf.va[0].va.getAttribute(0).vertexBuffer.sizeInBytes).toEqual(
        1 * 3 * 4
      );
      expect(vaf.va[0].va.getAttribute(0).vertexBuffer.usage).toEqual(
        BufferUsage.STATIC_DRAW
      );
      expect(vaf.va[0].va.getAttribute(0).componentsPerAttribute).toEqual(3);
      expect(vaf.va[0].va.getAttribute(0).componentDatatype).toEqual(
        ComponentDatatype.FLOAT
      );
      expect(vaf.va[0].va.getAttribute(0).offsetInBytes).toEqual(0);
      expect(vaf.va[0].va.getAttribute(0).strideInBytes).toEqual(3 * 4);
    });

    it("resizes a vertex array with static floats", function () {
      const positionIndex = 0;
      const vaf = new VertexArrayFacade(
        context,
        [
          {
            index: positionIndex,
            componentsPerAttribute: 3,
            componentDatatype: ComponentDatatype.FLOAT,
            usage: BufferUsage.STATIC_DRAW,
          },
        ],
        1
      );

      const writer = vaf.writers[positionIndex];
      expect(writer).toBeDefined();

      writer(0, 1.0, 2.0, 3.0); // Write [1.0, 2.0, 3.0] at index zero.

      vaf.resize(2); // Two vertices
      writer(1, 1.0, 2.0, 3.0); // Write [4.0, 5.0, 6.0] at index one.
      vaf.commit(); // Commit writes

      expect(vaf.va[0].va.getAttribute(0).vertexBuffer).toBeDefined();
      expect(vaf.va[0].va.getAttribute(0).vertexBuffer.sizeInBytes).toEqual(
        2 * 3 * 4
      );
      expect(vaf.va[0].va.getAttribute(0).vertexBuffer.usage).toEqual(
        BufferUsage.STATIC_DRAW
      );
      expect(vaf.va[0].va.getAttribute(0).componentsPerAttribute).toEqual(3);
      expect(vaf.va[0].va.getAttribute(0).componentDatatype).toEqual(
        ComponentDatatype.FLOAT
      );
      expect(vaf.va[0].va.getAttribute(0).offsetInBytes).toEqual(0);
      expect(vaf.va[0].va.getAttribute(0).strideInBytes).toEqual(3 * 4);
    });

    it("creates a vertex array with static floats and unsigned bytes", function () {
      const positionIndex = 0;
      const colorIndex = 2;
      const vaf = new VertexArrayFacade(
        context,
        [
          {
            index: positionIndex,
            componentsPerAttribute: 3,
            componentDatatype: ComponentDatatype.FLOAT,
            usage: BufferUsage.STATIC_DRAW,
          },
          {
            index: colorIndex,
            componentsPerAttribute: 4,
            componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
            usage: BufferUsage.STATIC_DRAW,
          },
        ],
        1
      );

      const positionWriter = vaf.writers[positionIndex];
      const colorWriter = vaf.writers[colorIndex];

      expect(positionWriter).toBeDefined();
      expect(colorWriter).toBeDefined();

      positionWriter(0, 1.0, 2.0, 3.0); // Write position [1.0, 2.0, 3.0] at index zero.
      colorWriter(0, 0, 255, 0, 255); // Write color [0, 255, 0, 255] at index zero.
      vaf.commit(); // Commit writes

      // Position attribute
      expect(vaf.va[0].va.getAttribute(0).vertexBuffer).toBeDefined();
      expect(vaf.va[0].va.getAttribute(0).vertexBuffer.sizeInBytes).toEqual(
        1 * (3 * 4 + 4 * 1)
      );
      expect(vaf.va[0].va.getAttribute(0).vertexBuffer.usage).toEqual(
        BufferUsage.STATIC_DRAW
      );
      expect(vaf.va[0].va.getAttribute(0).componentsPerAttribute).toEqual(3);
      expect(vaf.va[0].va.getAttribute(0).componentDatatype).toEqual(
        ComponentDatatype.FLOAT
      );
      expect(vaf.va[0].va.getAttribute(0).offsetInBytes).toEqual(0);
      expect(vaf.va[0].va.getAttribute(0).strideInBytes).toEqual(3 * 4 + 4 * 1);

      // Color attribute
      expect(vaf.va[0].va.getAttribute(1).vertexBuffer).toEqual(
        vaf.va[0].va.getAttribute(0).vertexBuffer
      );
      expect(vaf.va[0].va.getAttribute(1).componentsPerAttribute).toEqual(4);
      expect(vaf.va[0].va.getAttribute(1).componentDatatype).toEqual(
        ComponentDatatype.UNSIGNED_BYTE
      );
      expect(vaf.va[0].va.getAttribute(1).offsetInBytes).toEqual(3 * 4);
      expect(vaf.va[0].va.getAttribute(1).strideInBytes).toEqual(
        vaf.va[0].va.getAttribute(0).strideInBytes
      );
    });

    it("creates a vertex array with static and dynamic attributes", function () {
      const positionIndex = 0;
      const txCoordIndex = 2;
      const vaf = new VertexArrayFacade(
        context,
        [
          {
            index: positionIndex,
            componentsPerAttribute: 3,
            componentDatatype: ComponentDatatype.FLOAT,
            usage: BufferUsage.STATIC_DRAW,
          },
          {
            index: txCoordIndex,
            componentsPerAttribute: 2,
            componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
            usage: BufferUsage.DYNAMIC_DRAW,
            normalize: true,
          },
        ],
        1
      );

      const positionWriter = vaf.writers[positionIndex];
      const txCoordWriter = vaf.writers[txCoordIndex];

      expect(positionWriter).toBeDefined();
      expect(txCoordWriter).toBeDefined();

      positionWriter(0, 1.0, 2.0, 3.0);
      txCoordWriter(0, 32 * 1024, 64 * 1024);
      vaf.commit();

      // Position attribute
      expect(vaf.va[0].va.getAttribute(0).vertexBuffer).toBeDefined();
      expect(vaf.va[0].va.getAttribute(0).vertexBuffer.sizeInBytes).toEqual(
        1 * (3 * 4)
      );
      expect(vaf.va[0].va.getAttribute(0).vertexBuffer.usage).toEqual(
        BufferUsage.STATIC_DRAW
      );
      expect(vaf.va[0].va.getAttribute(0).componentsPerAttribute).toEqual(3);
      expect(vaf.va[0].va.getAttribute(0).componentDatatype).toEqual(
        ComponentDatatype.FLOAT
      );
      expect(vaf.va[0].va.getAttribute(0).offsetInBytes).toEqual(0);
      expect(vaf.va[0].va.getAttribute(0).strideInBytes).toEqual(3 * 4);

      // Texture coordinate attribute
      expect(vaf.va[0].va.getAttribute(1).vertexBuffer).toBeDefined();
      expect(vaf.va[0].va.getAttribute(1).vertexBuffer.sizeInBytes).toEqual(
        1 * (2 * 2)
      );
      expect(vaf.va[0].va.getAttribute(1).vertexBuffer.usage).toEqual(
        BufferUsage.DYNAMIC_DRAW
      );
      expect(vaf.va[0].va.getAttribute(1).componentsPerAttribute).toEqual(2);
      expect(vaf.va[0].va.getAttribute(1).componentDatatype).toEqual(
        ComponentDatatype.UNSIGNED_SHORT
      );
      expect(vaf.va[0].va.getAttribute(1).offsetInBytes).toEqual(0);
      expect(vaf.va[0].va.getAttribute(1).strideInBytes).toEqual(2 * 2);
    });

    it("sub-commits", function () {
      const positionIndex = 0;
      const temperatureIndex = 2;
      const vaf = new VertexArrayFacade(
        context,
        [
          {
            index: positionIndex,
            componentsPerAttribute: 3,
            componentDatatype: ComponentDatatype.FLOAT,
            usage: BufferUsage.STATIC_DRAW,
          },
          {
            index: temperatureIndex,
            componentsPerAttribute: 1,
            componentDatatype: ComponentDatatype.FLOAT,
            usage: BufferUsage.STREAM_DRAW,
          },
        ],
        2
      );

      const positionWriter = vaf.writers[positionIndex];
      const temperatureWriter = vaf.writers[temperatureIndex];

      expect(positionWriter).toBeDefined();
      expect(temperatureWriter).toBeDefined();

      positionWriter(0, 1.0, 2.0, 3.0);
      temperatureWriter(0, 98.6);
      positionWriter(1, 7.0, 8.0, 9.0);
      temperatureWriter(1, 32.0);
      vaf.commit();

      // Rewrite all vertices
      positionWriter(0, 10.0, 20.0, 30.0);
      temperatureWriter(0, 37.0);
      positionWriter(1, 70.0, 80.0, 90.0);
      temperatureWriter(1, 0.0);
      vaf.commit();

      // Sub-commit to just one vertex
      temperatureWriter(1, 212.0);
      vaf.subCommit(1, 1);
      vaf.endSubCommits();

      // Position attribute
      expect(vaf.va[0].va.getAttribute(1).vertexBuffer).toBeDefined();
      expect(vaf.va[0].va.getAttribute(1).vertexBuffer.sizeInBytes).toEqual(
        2 * (3 * 4)
      );
      expect(vaf.va[0].va.getAttribute(1).vertexBuffer.usage).toEqual(
        BufferUsage.STATIC_DRAW
      );
      expect(vaf.va[0].va.getAttribute(1).componentsPerAttribute).toEqual(3);
      expect(vaf.va[0].va.getAttribute(1).componentDatatype).toEqual(
        ComponentDatatype.FLOAT
      );
      expect(vaf.va[0].va.getAttribute(1).offsetInBytes).toEqual(0);
      expect(vaf.va[0].va.getAttribute(1).strideInBytes).toEqual(3 * 4);

      // Temperature attribute
      expect(vaf.va[0].va.getAttribute(0).vertexBuffer).toBeDefined();
      expect(vaf.va[0].va.getAttribute(0).vertexBuffer.sizeInBytes).toEqual(
        2 * 4
      );
      expect(vaf.va[0].va.getAttribute(0).vertexBuffer.usage).toEqual(
        BufferUsage.STREAM_DRAW
      );
      expect(vaf.va[0].va.getAttribute(0).componentsPerAttribute).toEqual(1);
      expect(vaf.va[0].va.getAttribute(0).componentDatatype).toEqual(
        ComponentDatatype.FLOAT
      );
      expect(vaf.va[0].va.getAttribute(0).offsetInBytes).toEqual(0);
      expect(vaf.va[0].va.getAttribute(0).strideInBytes).toEqual(1 * 4);
    });

    it("destroys previous vertex buffers when number of vertices grows", function () {
      const positionIndex = 0;
      const vaf = new VertexArrayFacade(
        context,
        [
          {
            index: positionIndex,
            componentsPerAttribute: 3,
            componentDatatype: ComponentDatatype.FLOAT,
            usage: BufferUsage.STATIC_DRAW,
          },
        ],
        1
      );

      const writer = vaf.writers[positionIndex];
      expect(writer).toBeDefined();

      writer(0, 1.0, 2.0, 3.0); // Write [1.0, 2.0, 3.0] at index zero.
      vaf.commit(); // Commit writes

      // Grab the vertex buffer
      const vbBeforeResize = vaf.va[0].va.getAttribute(0).vertexBuffer;

      vaf.resize(2); // Two vertices
      writer(1, 1.0, 2.0, 3.0); // Write [4.0, 5.0, 6.0] at index one.
      vaf.commit(); // Commit writes

      expect(vbBeforeResize.isDestroyed()).toBe(true);
      expect(vaf.va[0].va.getAttribute(0).vertexBuffer).not.toBe(
        vbBeforeResize
      );
    });

    it("is not initially destroyed", function () {
      const positionIndex = 0;
      const vaf = new VertexArrayFacade(
        context,
        [
          {
            index: positionIndex,
            componentsPerAttribute: 3,
            componentDatatype: ComponentDatatype.FLOAT,
            usage: BufferUsage.STATIC_DRAW,
          },
        ],
        1
      );
      expect(vaf.isDestroyed()).toBe(false);
    });

    it("throws when constructed without a context", function () {
      expect(function () {
        return new VertexArrayFacade(undefined, undefined, undefined);
      }).toThrowDeveloperError();
    });

    it("throws when constructed undefined attributes", function () {
      expect(function () {
        return new VertexArrayFacade(context, undefined, undefined);
      }).toThrowDeveloperError();
    });

    it("throws when constructed without attributes", function () {
      expect(function () {
        return new VertexArrayFacade(context, []);
      }).toThrowDeveloperError();
    });

    it("throws when constructed with attributes without componentsPerAttribute", function () {
      expect(function () {
        return new VertexArrayFacade(context, [{}]);
      }).toThrowDeveloperError();
    });

    it("throws when constructed with attributes with an invalid componentDatatype", function () {
      expect(function () {
        return new VertexArrayFacade(context, [
          {
            componentsPerAttribute: 1,
            componentDatatype: "invalid component datatype",
          },
        ]);
      }).toThrowDeveloperError();
    });

    it("throws when constructed with attributes with an invalid usage", function () {
      expect(function () {
        return new VertexArrayFacade(context, [
          {
            componentsPerAttribute: 1,
            usage: "invalid component usage",
          },
        ]);
      }).toThrowDeveloperError();
    });

    it("throws when constructed with attributes with duplicate indices", function () {
      expect(function () {
        return new VertexArrayFacade(context, [
          {
            index: 0,
            componentsPerAttribute: 1,
          },
          {
            index: 0,
            componentsPerAttribute: 1,
          },
        ]);
      }).toThrowDeveloperError();
    });

    it("subCommit throws when passed an invalid offsetInVertices", function () {
      const positionIndex = 0;
      const vaf = new VertexArrayFacade(
        context,
        [
          {
            index: positionIndex,
            componentsPerAttribute: 3,
            componentDatatype: ComponentDatatype.FLOAT,
            usage: BufferUsage.STATIC_DRAW,
          },
        ],
        10
      );

      expect(function () {
        vaf.subCommit(-1, 1);
      }).toThrowDeveloperError();

      expect(function () {
        vaf.subCommit(10, 1);
      }).toThrowDeveloperError();

      expect(function () {
        vaf.subCommit(1, 10);
      }).toThrowDeveloperError();
    });
  },
  "WebGL"
);
