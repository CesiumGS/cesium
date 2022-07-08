import {
  Cartesian3,
  defined,
  PrimitiveOutlineGenerator,
} from "../../../Source/Cesium.js";
import createContext from "../../createContext.js";

describe(
  "Scene/ModelExperimental/PrimitiveOutlineGenerator",
  function () {
    it("throws for undefined triangleIndices", function () {
      expect(function () {
        return new PrimitiveOutlineGenerator({
          triangleIndices: undefined,
          outlineIndices: new Uint16Array(36),
          originalVertexCount: 6,
        });
      }).toThrowDeveloperError();
    });

    it("throws for undefined outlineIndices", function () {
      expect(function () {
        return new PrimitiveOutlineGenerator({
          triangleIndices: new Uint16Array(12),
          outlineIndices: undefined,
          originalVertexCount: 6,
        });
      }).toThrowDeveloperError();
    });

    it("throws for undefined originalVertexCount", function () {
      expect(function () {
        return new PrimitiveOutlineGenerator({
          triangleIndices: new Uint16Array(12),
          outlineIndices: new Uint16Array(36),
          originalVertexCount: undefined,
        });
      }).toThrowDeveloperError();
    });

    function addVertex(vertices, position) {
      const index = vertices.length / 3;
      vertices.push(position.x, position.y, position.z);
      return index;
    }

    function createGeometry() {
      // 6---7---8
      // | \ | / |
      // 3---4---5
      // | / | \ |
      // 0---1---2

      const p0 = new Cartesian3(-1.0, -1.0, 0.0);
      const p1 = new Cartesian3(0.0, -1.0, 0.0);
      const p2 = new Cartesian3(1.0, -1.0, 0.0);
      const p3 = new Cartesian3(-1.0, 0.0, 0.0);
      const p4 = new Cartesian3(0.0, 0.0, 0.0);
      const p5 = new Cartesian3(1.0, 0.0, 0.0);
      const p6 = new Cartesian3(-1.0, 1.0, 0.0);
      const p7 = new Cartesian3(0.0, 1.0, 0.0);
      const p8 = new Cartesian3(1.0, 1.0, 0.0);

      const vertices = [];
      const i0 = addVertex(vertices, p0);
      const i1 = addVertex(vertices, p1);
      const i2 = addVertex(vertices, p2);
      const i3 = addVertex(vertices, p3);
      const i4 = addVertex(vertices, p4);
      const i5 = addVertex(vertices, p5);
      const i6 = addVertex(vertices, p6);
      const i7 = addVertex(vertices, p7);
      const i8 = addVertex(vertices, p8);
      const verticesTypedArray = new Float32Array(vertices);

      const indices = [];
      indices.push(i0, i1, i4);
      indices.push(i0, i4, i3);
      indices.push(i1, i2, i4);
      indices.push(i4, i2, i5);
      indices.push(i3, i4, i6);
      indices.push(i6, i4, i7);
      indices.push(i4, i5, i8);
      indices.push(i4, i8, i7);
      const indicesTypedArray = new Uint8Array(indices);

      const edges = [];
      edges.push(i0, i1);
      edges.push(i1, i2);
      edges.push(i2, i5);
      edges.push(i5, i8);
      edges.push(i8, i7);
      edges.push(i7, i6);
      edges.push(i6, i3);
      const edgesTypedArray = new Uint8Array(edges);

      return {
        vertices: verticesTypedArray,
        edges: edgesTypedArray,
        indices: indicesTypedArray,
      };
    }

    function createTrickyGeometry() {
      // This model is carefully constructed to require tricky vertex duplication
      // for outlining.

      // 1-2     5-4
      //  \|     |/
      //   0-----3
      //    \   /
      //     \ /
      //      6
      //     / \
      //    /   \
      //   7-----8

      const p0 = new Cartesian3(-1.0, 1.0, 0.0);
      const p1 = new Cartesian3(-2.0, 2.0, 0.0);
      const p2 = new Cartesian3(-1.0, 2.0, 0.0);
      const p3 = new Cartesian3(1.0, 1.0, 0.0);
      const p4 = new Cartesian3(2.0, 2.0, 0.0);
      const p5 = new Cartesian3(1.0, 2.0, 0.0);
      const p6 = new Cartesian3(0.0, 0.0, 0.0);
      const p7 = new Cartesian3(-1.0, -1.0, 0.0);
      const p8 = new Cartesian3(-1.0, 1.0, 0.0);

      const vertices = [];
      const i0 = addVertex(vertices, p0);
      const i1 = addVertex(vertices, p1);
      const i2 = addVertex(vertices, p2);
      const i3 = addVertex(vertices, p3);
      const i4 = addVertex(vertices, p4);
      const i5 = addVertex(vertices, p5);
      const i6 = addVertex(vertices, p6);
      const i7 = addVertex(vertices, p7);
      const i8 = addVertex(vertices, p8);
      const verticesTypedArray = new Float32Array(vertices);

      const indices = [];
      indices.push(i0, i2, i1);
      indices.push(i3, i4, i5);
      indices.push(i6, i7, i8);
      indices.push(i0, i6, i3);
      const indicesTypedArray = new Uint8Array(indices);

      const edges = [];
      edges.push(i0, i1);
      edges.push(i0, i2);
      edges.push(i3, i5);
      edges.push(i3, i4);
      edges.push(i6, i7);
      edges.push(i6, i8);
      edges.push(i0, i3);
      edges.push(i0, i6);
      edges.push(i3, i6);
      const edgesTypedArray = new Uint8Array(edges);

      return {
        vertices: verticesTypedArray,
        indices: indicesTypedArray,
        edges: edgesTypedArray,
      };
    }

    // Similar to createGeometry() above, but for testing what happens when we
    // need to upgrade to a 16- or 32-bit index buffer.
    function createLargerGeometry(targetVertexCount) {
      const vertexCount = 9;
      const copies = Math.floor(targetVertexCount / vertexCount);

      const vertices = [];
      const indices = [];
      const edges = [];

      // 6---7---8
      // | \ | / |
      // 3---4---5
      // | / | \ |
      // 0---1---2

      for (let i = 0; i < copies; i++) {
        const p0 = new Cartesian3(-1.0, -1.0, 0.0);
        const p1 = new Cartesian3(0.0, -1.0, 0.0);
        const p2 = new Cartesian3(1.0, -1.0, 0.0);
        const p3 = new Cartesian3(-1.0, 0.0, 0.0);
        const p4 = new Cartesian3(0.0, 0.0, 0.0);
        const p5 = new Cartesian3(1.0, 0.0, 0.0);
        const p6 = new Cartesian3(-1.0, 1.0, 0.0);
        const p7 = new Cartesian3(0.0, 1.0, 0.0);
        const p8 = new Cartesian3(1.0, 1.0, 0.0);

        const i0 = addVertex(vertices, p0);
        const i1 = addVertex(vertices, p1);
        const i2 = addVertex(vertices, p2);
        const i3 = addVertex(vertices, p3);
        const i4 = addVertex(vertices, p4);
        const i5 = addVertex(vertices, p5);
        const i6 = addVertex(vertices, p6);
        const i7 = addVertex(vertices, p7);
        const i8 = addVertex(vertices, p8);

        indices.push(i0, i1, i4);
        indices.push(i0, i4, i3);
        indices.push(i1, i2, i4);
        indices.push(i4, i2, i5);
        indices.push(i3, i4, i6);
        indices.push(i6, i4, i7);
        indices.push(i4, i5, i8);
        indices.push(i4, i8, i7);

        edges.push(i0, i1);
        edges.push(i1, i2);
        edges.push(i2, i5);
        edges.push(i5, i8);
        edges.push(i8, i7);
        edges.push(i7, i6);
        edges.push(i6, i3);
      }

      const verticesTypedArray = new Float32Array(vertices);

      let indicesTypedArray;
      let edgesTypedArray;
      if (targetVertexCount <= 255) {
        indicesTypedArray = new Uint8Array(indices);
        edgesTypedArray = new Uint8Array(edges);
      } else if (targetVertexCount <= 65535) {
        indicesTypedArray = new Uint16Array(indices);
        edgesTypedArray = new Uint16Array(edges);
      } else {
        indicesTypedArray = new Uint32Array(indices);
        edgesTypedArray = new Uint32Array(edges);
      }

      return {
        vertices: verticesTypedArray,
        edges: edgesTypedArray,
        indices: indicesTypedArray,
      };
    }

    it("duplicates vertices as needed and generates outline coordinates", function () {
      let geometry = createGeometry();
      let vertices = geometry.vertices;

      let generator = new PrimitiveOutlineGenerator({
        // slice because the value may be modified in place
        triangleIndices: geometry.indices.slice(),
        outlineIndices: geometry.edges,
        originalVertexCount: vertices.length / 3,
      });

      // prettier-ignore
      let expectedIndices = new Uint8Array([
        0, 1, 4,
        9, 4, 3,
        1, 2, 4,
        4, 2, 5,
        10, 4, 6,
        6, 4, 7,
        4, 5, 8,
        4, 8, 11
      ]);
      // prettier-ignore
      let expectedOutlineCoordinates = new Float32Array([ 
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 0, 0,
        0, 0, 0,
        0, 1, 0,
        1, 0, 0,
        1, 0, 0,
        0, 1, 0,
        0, 0, 0,
        1, 0, 0,
        0, 1, 0
      ]);
      let expectedExtraVertices = [0, 3, 7];

      expect(generator.updatedTriangleIndices).toEqual(expectedIndices);
      expect(generator.outlineCoordinates).toEqual(expectedOutlineCoordinates);
      expect(generator._extraVertices).toEqual(expectedExtraVertices);

      geometry = createTrickyGeometry();
      vertices = geometry.vertices;
      generator = new PrimitiveOutlineGenerator({
        triangleIndices: geometry.indices.slice(),
        outlineIndices: geometry.edges,
        originalVertexCount: vertices.length / 3,
      });

      // prettier-ignore
      expectedIndices = new Uint8Array([
        0, 2, 1,
        3, 4, 5,
        6, 7, 8,
        0, 10, 9
      ]);

      // prettier-ignore
      expectedOutlineCoordinates = new Float32Array([
        1, 1, 0,
        1, 0, 0,
        0, 1, 0,
        1, 1, 0,
        0, 1, 0,
        1, 0, 0,
        1, 1, 0,
        0, 1, 0,
        1, 0, 0,
        1, 0, 1,
        0, 1, 1
      ]);
      expectedExtraVertices = [3, 6];

      expect(generator.updatedTriangleIndices).toEqual(expectedIndices);
      expect(generator.outlineCoordinates).toEqual(expectedOutlineCoordinates);
      expect(generator._extraVertices).toEqual(expectedExtraVertices);
    });

    it("switches to 16-bit indices if more than 255 vertices are required", function () {
      const geometry = createLargerGeometry(255);
      const vertices = geometry.vertices;

      expect(geometry.indices).toBeInstanceOf(Uint8Array);

      const generator = new PrimitiveOutlineGenerator({
        // slice because the value may be modified in place
        triangleIndices: geometry.indices.slice(),
        outlineIndices: geometry.edges,
        originalVertexCount: vertices.length / 3,
      });

      expect(generator.updatedTriangleIndices).toBeInstanceOf(Uint16Array);
    });

    it("switches to 32-bit indices if more than 65535 vertices are required", function () {
      const geometry = createLargerGeometry(65535);
      const vertices = geometry.vertices;

      expect(geometry.indices).toBeInstanceOf(Uint16Array);

      const generator = new PrimitiveOutlineGenerator({
        // slice because the value may be modified in place
        triangleIndices: geometry.indices.slice(),
        outlineIndices: geometry.edges,
        originalVertexCount: vertices.length / 3,
      });

      expect(generator.updatedTriangleIndices).toBeInstanceOf(Uint32Array);
    });

    it("updateAttribute copies vertex attributes", function () {
      let geometry = createGeometry();
      let vertices = geometry.vertices;

      let generator = new PrimitiveOutlineGenerator({
        // slice because the value may be modified in place
        triangleIndices: geometry.indices.slice(),
        outlineIndices: geometry.edges,
        originalVertexCount: vertices.length / 3,
      });

      geometry = createTrickyGeometry();
      vertices = geometry.vertices;

      let attribute = new Uint16Array([0, 1, 2, 3, 4, 5, 6, 7, 8]);
      let result = generator.updateAttribute(attribute);
      let expectedAttribute = new Uint16Array([
        0,
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        0, // copy of vertex 0
        3, // copy of vertex 3
        7, // copy of vertex 7
      ]);
      expect(result).toEqual(expectedAttribute);

      generator = new PrimitiveOutlineGenerator({
        // slice because the value may be modified in place
        triangleIndices: geometry.indices.slice(),
        outlineIndices: geometry.edges,
        originalVertexCount: vertices.length / 3,
      });

      attribute = new Float32Array([
        0.0,
        1.0,
        2.0,
        3.0,
        4.0,
        5.0,
        6.0,
        7.0,
        8.0,
      ]);
      result = generator.updateAttribute(attribute);
      expectedAttribute = new Float32Array([
        0.0,
        1.0,
        2.0,
        3.0,
        4.0,
        5.0,
        6.0,
        7.0,
        8.0,
        3.0, // copy of vertex 3
        6.0, // copy of vertex 6
      ]);
      expect(result).toEqual(expectedAttribute);
    });

    it("updateAttribute copies vector attributes", function () {
      let geometry = createGeometry();
      let vertices = geometry.vertices;

      let generator = new PrimitiveOutlineGenerator({
        // slice because the value may be modified in place
        triangleIndices: geometry.indices.slice(),
        outlineIndices: geometry.edges,
        originalVertexCount: vertices.length / 3,
      });

      let result = generator.updateAttribute(geometry.vertices);
      // prettier-ignore
      let expectedVertices = new Float32Array([
        -1, -1, 0,
        0, -1, 0,
        1, -1, 0,
        -1, 0, 0,
        0, 0, 0,
        1, 0, 0,
        -1, 1, 0,
        0, 1, 0,
        1, 1, 0,
        -1, -1, 0, // copy of vertex 0
        -1, 0, 0, // copy of vertex 3
        0, 1, 0, // copy of vertex 7
      ]);
      expect(result).toEqual(expectedVertices);

      geometry = createTrickyGeometry();
      vertices = geometry.vertices;

      generator = new PrimitiveOutlineGenerator({
        // slice because the value may be modified in place
        triangleIndices: geometry.indices.slice(),
        outlineIndices: geometry.edges,
        originalVertexCount: vertices.length / 3,
      });

      result = generator.updateAttribute(geometry.vertices);
      // prettier-ignore
      expectedVertices = new Float32Array([
        -1, 1, 0,
        -2, 2, 0,
        -1, 2, 0,
        1, 1, 0,
        2, 2, 0,
        1, 2, 0,
        0, 0, 0,
        -1, -1, 0,
        -1, 1, 0,
        1, 1, 0, // copy of vertex 3
        0, 0, 0, // copy of vertex 6
      ]);
      expect(result).toEqual(expectedVertices);
    });

    describe("createTexture", function () {
      let context;

      beforeEach(function () {
        // recreate the context
        if (defined(context)) {
          context.destroyForSpecs();
        }
        context = createContext();
      });

      it("createTexture creates texture on the first run", function () {
        const cache = context.cache;

        expect(cache.modelOutliningCache).not.toBeDefined();

        const texture = PrimitiveOutlineGenerator.createTexture(context);
        expect(texture).toBeDefined();
        expect(cache.modelOutliningCache.outlineTexture).toBe(texture);
      });

      it("createTexture uses a cached texture on subsequent runs", function () {
        const cache = context.cache;

        expect(cache.modelOutliningCache).not.toBeDefined();

        const texture = PrimitiveOutlineGenerator.createTexture(context);
        const texture2 = PrimitiveOutlineGenerator.createTexture(context);

        expect(texture2).toBe(texture);
        expect(texture).toBeDefined();
        expect(cache.modelOutliningCache.outlineTexture).toBe(texture);
      });
    });
  },
  "WebGL"
);
