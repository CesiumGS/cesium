import {
  Cartesian3,
  PrimitiveOutlineGenerator,
} from "../../../Source/Cesium.js";

describe("Scene/ModelExperimental/PrimitiveOutlineGenerator", function () {
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

  /*
  function hasCoordinates(outlineCoordinates, i0, i1, i2, o0, o1, o2) {
    const a0 = outlineCoordinates[i0 * 3];
    const b0 = outlineCoordinates[i0 * 3 + 1];
    const c0 = outlineCoordinates[i0 * 3 + 2];
    const a1 = outlineCoordinates[i1 * 3];
    const b1 = outlineCoordinates[i1 * 3 + 1];
    const c1 = outlineCoordinates[i1 * 3 + 2];
    const a2 = outlineCoordinates[i2 * 3];
    const b2 = outlineCoordinates[i2 * 3 + 1];
    const c2 = outlineCoordinates[i2 * 3 + 2];

    return (
      (a0 === o0 && a1 === o1 && a2 === o2) ||
      (b0 === o0 && b1 === o1 && b2 === o2) ||
      (c0 === o0 && c1 === o1 && c2 === o2)
    );
  }
  */

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

  it("duplicates vertices as needed and generates outline coordinates", function () {
    let geometry = createGeometry();
    let vertices = geometry.vertices;

    let generator = new PrimitiveOutlineGenerator({
      triangleIndices: geometry.indices.slice(),
      outlineIndices: geometry.edges,
      originalVertexCount: vertices.length,
    });

    expect(generator._triangleIndices).toEqual(geometry.indices);
    expect(generator._vertexCopies).toEqual(undefined);
    expect(generator._outlineCoordinatesTypedArray).toEqual(undefined);
    expect(generator._extraVertices).toEqual(undefined);

    geometry = createTrickyGeometry();
    vertices = geometry.vertices;
    generator = new PrimitiveOutlineGenerator({
      triangleIndices: geometry.indices,
      outlineIndices: geometry.edges,
      originalVertexCount: vertices.length,
    });

    expect(generator._triangleIndices).toBe(geometry.indices);
    expect(generator._vertexCopies).toEqual(undefined);
    expect(generator._outlineCoordinatesTypedArray).toEqual(undefined);
    expect(generator._extraVertices).toEqual(undefined);
  });

  it("handles vertices that are shared between two outlined primitives", function () {
    fail();
  });

  it("handles vertices that are shared between an outlined and a non-outlined primitive", function () {
    fail();
  });

  it("switches to 16-bit indices if more than 255 vertices are required", function () {
    fail();
  });

  it("switches to 32-bit indices if more than 65535 vertices are required", function () {
    fail();
  });
});
