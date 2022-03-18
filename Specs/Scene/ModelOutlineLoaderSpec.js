import { Cartesian3, Model } from "../../Source/Cesium.js";
import createScene from "../createScene.js";
import pollToPromise from "../pollToPromise.js";
import GltfBuilder from "./GltfBuilder.js";

describe(
  "Scene/ModelOutlineLoader",
  function () {
    let scene;
    let primitives;

    beforeAll(function () {
      scene = createScene();
      primitives = scene.primitives;
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    it("does nothing if no primitives are outlined", function () {
      const vertices = [];
      const indices = [];
      const edges = [];
      createModel(vertices, indices, edges, 1, true, true, true);

      const builder = createGltfBuilder();

      const bufferBuilder = builder.buffer();

      bufferBuilder
        .vertexBuffer("vertices")
        .vec3("position")
        .vec3("normal")
        .scalar("batchID")
        .data(vertices);

      bufferBuilder.indexBuffer("indices").scalar("index").data(indices);

      const meshBuilder = builder.mesh();
      const primitiveBuilder = meshBuilder.primitive();
      primitiveBuilder
        .triangles()
        .material("default")
        .attribute("POSITION", "position")
        .attribute("NORMAL", "normal")
        .attribute("_BATCHID", "batchID")
        .indices("index");

      const gltf = builder.toGltf();

      const model = new Model({
        gltf: gltf,
      });

      primitives.add(model);

      return waitForReady(scene, model).then(function () {
        const gltf = model.gltf;
        expect(gltf.buffers.length).toBe(1);
        expect(gltf.accessors.length).toBe(4);
        expect(gltf.accessors[0].count).toBe(9);
        expect(gltf.accessors[1].count).toBe(9);
        expect(gltf.accessors[2].count).toBe(9);
        expect(
          Object.keys(gltf.meshes[0].primitives[0].attributes).length
        ).toBe(3);
        expect(gltf.accessors[3].count).toBe(indices.length);
        builder.destroy();
      });
    });

    it("duplicates vertices as needed and adds outline attribute", function () {
      const vertices = [];
      const indices = [];
      const edges = [];
      createTrickyModel(vertices, indices, edges, 2, true, true, true);
      createModel(vertices, indices, edges, 1, true, true, true);

      const builder = createGltfBuilder();

      const bufferBuilder = builder.buffer();

      bufferBuilder
        .vertexBuffer("vertices")
        .vec3("position")
        .vec3("normal")
        .scalar("batchID")
        .data(vertices);

      bufferBuilder.indexBuffer("indices").scalar("index").data(indices);
      bufferBuilder.indexBuffer("edgeIndices").scalar("edgeIndex").data(edges);

      const meshBuilder = builder.mesh();
      const primitiveBuilder = meshBuilder.primitive();
      primitiveBuilder
        .triangles()
        .material("default")
        .attribute("POSITION", "position")
        .attribute("NORMAL", "normal")
        .attribute("_BATCHID", "batchID")
        .indices("index");

      const gltf = builder.toGltf();

      gltf.extensionsUsed.push("CESIUM_primitive_outline");
      gltf.meshes[0].primitives[0].extensions = {
        CESIUM_primitive_outline: {
          indices: gltf.accessors.length - 1,
        },
      };

      const model = new Model({
        gltf: gltf,
      });

      primitives.add(model);

      return waitForReady(scene, model).then(function () {
        const gltf = model.gltf;
        const primitive = gltf.meshes[0].primitives[0];
        expect(gltf.accessors.length).toBe(6);
        expect(gltf.accessors[0].count).toBeGreaterThan(9);
        expect(gltf.accessors[1].count).toBeGreaterThan(9);
        expect(gltf.accessors[2].count).toBeGreaterThan(9);
        expect(gltf.accessors[0].count).toBe(gltf.accessors[1].count);
        expect(gltf.accessors[1].count).toBe(gltf.accessors[2].count);
        expect(Object.keys(primitive.attributes).length).toBe(4);
        expect(primitive.attributes._OUTLINE_COORDINATES).toBeDefined();
        expect(gltf.accessors[3].count).toBe(indices.length);

        // Make sure the outline coordinates match the edges.
        const accessorId = primitive.attributes._OUTLINE_COORDINATES;
        const accessor = gltf.accessors[accessorId];
        const bufferView = gltf.bufferViews[accessor.bufferView];
        const buffer = gltf.buffers[bufferView.buffer];

        const outlineCoordinates = new Float32Array(
          buffer.extras._pipeline.source,
          bufferView.byteOffset,
          accessor.count * 3
        );

        const triangleAccessor = gltf.accessors.filter(function (accessor) {
          return accessor.name === "index";
        })[0];
        const triangleBufferView =
          gltf.bufferViews[triangleAccessor.bufferView];
        const triangleBuffer = gltf.buffers[triangleBufferView.buffer];

        const triangleIndices = new Uint16Array(
          triangleBuffer.extras._pipeline.source,
          triangleBufferView.byteOffset,
          triangleAccessor.count
        );

        for (let i = 0; i < triangleIndices.length; i += 3) {
          const i0 = triangleIndices[i];
          const i1 = triangleIndices[i + 1];
          const i2 = triangleIndices[i + 2];

          const i0Original = indices[i];
          const i1Original = indices[i + 1];
          const i2Original = indices[i + 2];

          expect(
            hasCoordinates(outlineCoordinates, i0, i1, i2, 1.0, 1.0, 0.0)
          ).toBe(hasEdge(edges, i0Original, i1Original));
          expect(
            hasCoordinates(outlineCoordinates, i0, i1, i2, 0.0, 1.0, 1.0)
          ).toBe(hasEdge(edges, i1Original, i2Original));
          expect(
            hasCoordinates(outlineCoordinates, i0, i1, i2, 1.0, 0.0, 1.0)
          ).toBe(hasEdge(edges, i2Original, i0Original));

          expect(
            hasCoordinates(outlineCoordinates, i0, i1, i2, 1.0, 0.0, 0.0)
          ).toBe(false);
          expect(
            hasCoordinates(outlineCoordinates, i0, i1, i2, 0.0, 1.0, 0.0)
          ).toBe(false);
          expect(
            hasCoordinates(outlineCoordinates, i0, i1, i2, 0.0, 0.0, 1.0)
          ).toBe(false);
          expect(
            hasCoordinates(outlineCoordinates, i0, i1, i2, 1.0, 1.0, 1.0)
          ).toBe(false);
        }
        builder.destroy();
      });
    });

    function hasEdge(edges, i0, i1) {
      const min = Math.min(i0, i1);
      const max = Math.max(i0, i1);

      for (let i = 0; i < edges.length; i += 2) {
        const low = Math.min(edges[i], edges[i + 1]);
        const high = Math.max(edges[i], edges[i + 1]);

        if (low === min && high === max) {
          return true;
        }
      }

      return false;
    }

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

    it("ignores extension on primitive if it's not in extensionsUsed", function () {
      const vertices = [];
      const indices = [];
      const edges = [];
      createModel(vertices, indices, edges, 1, true, true, true);

      const builder = createGltfBuilder();

      const bufferBuilder = builder.buffer();

      bufferBuilder
        .vertexBuffer("vertices")
        .vec3("position")
        .vec3("normal")
        .scalar("batchID")
        .data(vertices);

      bufferBuilder.indexBuffer("indices").scalar("index").data(indices);
      bufferBuilder.indexBuffer("edgeIndices").scalar("edgeIndex").data(edges);

      const meshBuilder = builder.mesh();
      const primitiveBuilder = meshBuilder.primitive();
      primitiveBuilder
        .triangles()
        .material("default")
        .attribute("POSITION", "position")
        .attribute("NORMAL", "normal")
        .attribute("_BATCHID", "batchID")
        .indices("index");

      const gltf = builder.toGltf();

      gltf.meshes[0].primitives[0].extensions = {
        CESIUM_primitive_outline: {
          indices: gltf.accessors.length - 1,
        },
      };

      const model = new Model({
        gltf: gltf,
      });

      primitives.add(model);

      return waitForReady(scene, model).then(function () {
        const gltf = model.gltf;
        expect(gltf.buffers.length).toBe(1);
        expect(gltf.accessors.length).toBe(5);
        expect(gltf.accessors[0].count).toBe(9);
        expect(gltf.accessors[1].count).toBe(9);
        expect(gltf.accessors[2].count).toBe(9);
        expect(
          Object.keys(gltf.meshes[0].primitives[0].attributes).length
        ).toBe(3);
        expect(gltf.accessors[3].count).toBe(indices.length);
        builder.destroy();
      });
    });

    it("doesn't break if extensionsUsed lists the extension but it's not really used", function () {
      const vertices = [];
      const indices = [];
      const edges = [];
      createModel(vertices, indices, edges, 1, true, true, true);

      const builder = createGltfBuilder();

      const bufferBuilder = builder.buffer();

      bufferBuilder
        .vertexBuffer("vertices")
        .vec3("position")
        .vec3("normal")
        .scalar("batchID")
        .data(vertices);

      bufferBuilder.indexBuffer("indices").scalar("index").data(indices);

      const meshBuilder = builder.mesh();
      const primitiveBuilder = meshBuilder.primitive();
      primitiveBuilder
        .triangles()
        .material("default")
        .attribute("POSITION", "position")
        .attribute("NORMAL", "normal")
        .attribute("_BATCHID", "batchID")
        .indices("index");

      const gltf = builder.toGltf();

      gltf.extensionsUsed.push("CESIUM_primitive_outline");

      const model = new Model({
        gltf: gltf,
      });

      primitives.add(model);

      return waitForReady(scene, model).then(function () {
        const gltf = model.gltf;
        expect(gltf.buffers.length).toBe(1);
        expect(gltf.accessors.length).toBe(4);
        expect(gltf.accessors[0].count).toBe(9);
        expect(gltf.accessors[1].count).toBe(9);
        expect(gltf.accessors[2].count).toBe(9);
        expect(
          Object.keys(gltf.meshes[0].primitives[0].attributes).length
        ).toBe(3);
        expect(gltf.accessors[3].count).toBe(indices.length);
        builder.destroy();
      });
    });

    it("handles vertices that are shared between two outlined primitives", function () {
      const vertices = [];
      const indices = [];
      const edges = [];
      createModel(vertices, indices, edges, 1, true, true, true);

      const builder = createGltfBuilder();

      const bufferBuilder = builder.buffer();

      bufferBuilder
        .vertexBuffer("vertices")
        .vec3("position")
        .vec3("normal")
        .scalar("batchID")
        .data(vertices);

      bufferBuilder.indexBuffer("indices").scalar("index").data(indices);
      bufferBuilder.indexBuffer("edgeIndices").scalar("edgeIndex").data(edges);

      const meshBuilder = builder.mesh();

      // Create two primitives, both using the same vertex buffer, but the
      // second one only uses the positions.
      const primitiveBuilder = meshBuilder.primitive();
      primitiveBuilder
        .triangles()
        .material("default")
        .attribute("POSITION", "position")
        .attribute("NORMAL", "normal")
        .attribute("_BATCHID", "batchID")
        .indices("index");

      const secondPrimitiveBuilder = meshBuilder.primitive();
      secondPrimitiveBuilder
        .triangles()
        .material("default")
        .attribute("POSITION", "position")
        .indices("index");

      const gltf = builder.toGltf();

      // Add the outline extension to both primitives.
      gltf.extensionsUsed.push("CESIUM_primitive_outline");
      gltf.meshes[0].primitives[0].extensions = {
        CESIUM_primitive_outline: {
          indices: gltf.accessors.length - 1,
        },
      };

      gltf.meshes[0].primitives[1].extensions = {
        CESIUM_primitive_outline: {
          indices: gltf.accessors.length - 1,
        },
      };

      const model = new Model({
        gltf: gltf,
      });

      primitives.add(model);

      return waitForReady(scene, model).then(function () {
        const gltf = model.gltf;
        expect(gltf.accessors.length).toBe(6);
        expect(gltf.accessors[0].count).toBeGreaterThan(9);
        expect(gltf.accessors[1].count).toBeGreaterThan(9);
        expect(gltf.accessors[2].count).toBeGreaterThan(9);
        expect(gltf.accessors[0].count).toBe(gltf.accessors[1].count);
        expect(gltf.accessors[1].count).toBe(gltf.accessors[2].count);

        const firstPrimitive = gltf.meshes[0].primitives[0];
        expect(Object.keys(firstPrimitive.attributes).length).toBe(4);
        expect(firstPrimitive.attributes._OUTLINE_COORDINATES).toBeDefined();

        const secondPrimitive = gltf.meshes[0].primitives[1];
        expect(Object.keys(secondPrimitive.attributes).length).toBe(2);
        expect(secondPrimitive.attributes._OUTLINE_COORDINATES).toBeDefined();

        expect(gltf.accessors[3].count).toBe(indices.length);
        builder.destroy();
      });
    });

    it("handles vertices that are shared between an outlined and a non-outlined primitive", function () {
      const vertices = [];
      const indices = [];
      const edges = [];
      createModel(vertices, indices, edges, 1, true, true, true);

      const builder = createGltfBuilder();

      const bufferBuilder = builder.buffer();

      bufferBuilder
        .vertexBuffer("vertices")
        .vec3("position")
        .vec3("normal")
        .scalar("batchID")
        .data(vertices);

      bufferBuilder.indexBuffer("indices").scalar("index").data(indices);
      bufferBuilder.indexBuffer("edgeIndices").scalar("edgeIndex").data(edges);

      const meshBuilder = builder.mesh();

      // Create two primitives, both using the same vertex buffer, but the
      // second one only uses the positions.
      const primitiveBuilder = meshBuilder.primitive();
      primitiveBuilder
        .triangles()
        .material("default")
        .attribute("POSITION", "position")
        .attribute("NORMAL", "normal")
        .attribute("_BATCHID", "batchID")
        .indices("index");

      const secondPrimitiveBuilder = meshBuilder.primitive();
      secondPrimitiveBuilder
        .triangles()
        .material("default")
        .attribute("POSITION", "position")
        .indices("index");

      const gltf = builder.toGltf();

      // Add the outline extension only to the first primitive.
      gltf.extensionsUsed.push("CESIUM_primitive_outline");
      gltf.meshes[0].primitives[0].extensions = {
        CESIUM_primitive_outline: {
          indices: gltf.accessors.length - 1,
        },
      };

      const model = new Model({
        gltf: gltf,
      });

      primitives.add(model);

      return waitForReady(scene, model).then(function () {
        const gltf = model.gltf;
        expect(gltf.accessors.length).toBe(6);
        expect(gltf.accessors[0].count).toBeGreaterThan(9);
        expect(gltf.accessors[1].count).toBeGreaterThan(9);
        expect(gltf.accessors[2].count).toBeGreaterThan(9);
        expect(gltf.accessors[0].count).toBe(gltf.accessors[1].count);
        expect(gltf.accessors[1].count).toBe(gltf.accessors[2].count);

        const firstPrimitive = gltf.meshes[0].primitives[0];
        expect(Object.keys(firstPrimitive.attributes).length).toBe(4);
        expect(firstPrimitive.attributes._OUTLINE_COORDINATES).toBeDefined();

        const secondPrimitive = gltf.meshes[0].primitives[1];
        expect(Object.keys(secondPrimitive.attributes).length).toBe(1);
        expect(secondPrimitive.attributes._OUTLINE_COORDINATES).toBeUndefined();

        expect(gltf.accessors[3].count).toBe(indices.length);

        builder.destroy();
      });
    });

    it("switches to 32-bit indices if more than 65535 vertices are required", function () {
      if (!scene.context.elementIndexUint) {
        // This extension is supported everywhere these days, except possibly
        // in our mocked WebGL context used in the tests on Travis. Consistent
        // with the approach in ModelSpec.js, `loads a gltf with uint32 indices`,
        // we'll just give this test a pass if uint indices aren't supported.
        return;
      }

      const vertices = [];
      const indices = [];
      const edges = [];

      // Tricky model is 9 vertices. Add copies of it until we're just under 65636 vertices.
      for (let i = 0; vertices.length / 7 + 9 <= 65535; ++i) {
        createTrickyModel(vertices, indices, edges, 2, true, true, true);
      }

      const builder = createGltfBuilder();

      const bufferBuilder = builder.buffer();

      bufferBuilder
        .vertexBuffer("vertices")
        .vec3("position")
        .vec3("normal")
        .scalar("batchID")
        .data(vertices);

      bufferBuilder.indexBuffer("indices").scalar("index").data(indices);
      bufferBuilder.indexBuffer("edgeIndices").scalar("edgeIndex").data(edges);

      const meshBuilder = builder.mesh();
      const primitiveBuilder = meshBuilder.primitive();
      primitiveBuilder
        .triangles()
        .material("default")
        .attribute("POSITION", "position")
        .attribute("NORMAL", "normal")
        .attribute("_BATCHID", "batchID")
        .indices("index");

      const gltf = builder.toGltf();

      gltf.extensionsUsed.push("CESIUM_primitive_outline");
      gltf.meshes[0].primitives[0].extensions = {
        CESIUM_primitive_outline: {
          indices: gltf.accessors.length - 1,
        },
      };

      const model = new Model({
        gltf: gltf,
      });

      primitives.add(model);

      return waitForReady(scene, model).then(function () {
        const gltf = model.gltf;
        const primitive = gltf.meshes[0].primitives[0];
        const triangleIndexAccessor = gltf.accessors[primitive.indices];

        // The accessor should now be 32-bit and reference higher-numbered vertices.
        expect(triangleIndexAccessor.componentType).toBe(5125); // UNSIGNED_INT
        expect(triangleIndexAccessor.max[0]).toBeGreaterThan(65536);
        expect(triangleIndexAccessor.byteOffset).toBe(0);

        const bufferView = gltf.bufferViews[triangleIndexAccessor.bufferView];
        const buffer = gltf.buffers[bufferView.buffer];
        const data = buffer.extras._pipeline.source;
        const indexBuffer = new Uint32Array(
          data,
          data.byteOffset + bufferView.byteOffset,
          triangleIndexAccessor.count
        );

        // All the original indices should be the same.
        for (let i = 0; i < indices.length; ++i) {
          // All indices in the original range should match the original ones
          if (indexBuffer[i] < vertices.length / 7) {
            expect(indexBuffer[i]).toBe(indices[i]);
          }
        }

        const rendererIndexBuffer =
          model._rendererResources.buffers[triangleIndexAccessor.bufferView];
        expect(rendererIndexBuffer.bytesPerIndex).toBe(4);

        builder.destroy();
      });
    });
  },
  "WebGL"
);

function createGltfBuilder() {
  const builder = new GltfBuilder();

  builder.material("default").json({
    pbrMetallicRoughness: {
      baseColorFactor: [1.0, 1.0, 1.0, 1.0],
      metallicFactor: 0.5,
      roughnessFactor: 0.125,
    },
  });

  return builder;
}

function createModel(
  vertices,
  indices,
  edges,
  batchID,
  includePositions,
  includeNormals,
  includeBatchID
) {
  const vertexStride =
    (includePositions ? 3 : 0) +
    (includeNormals ? 3 : 0) +
    (includeBatchID ? 1 : 0);

  const normal = new Cartesian3(0.0, 0.0, 1.0);

  function addVertex(position) {
    if (includePositions) {
      vertices.push(position.x, position.y, position.z);
    }
    if (includeNormals) {
      vertices.push(normal.x, normal.y, normal.z);
    }
    if (includeBatchID) {
      vertices.push(batchID);
    }

    return vertices.length / vertexStride - 1;
  }

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

  const i0 = addVertex(p0);
  const i1 = addVertex(p1);
  const i2 = addVertex(p2);
  const i3 = addVertex(p3);
  const i4 = addVertex(p4);
  const i5 = addVertex(p5);
  const i6 = addVertex(p6);
  const i7 = addVertex(p7);
  const i8 = addVertex(p8);

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

function createTrickyModel(
  vertices,
  indices,
  edges,
  batchID,
  includePositions,
  includeNormals,
  includeBatchID
) {
  // This model is carefully constructed to require tricky vertex duplication
  // for outlining.

  const vertexStride =
    (includePositions ? 3 : 0) +
    (includeNormals ? 3 : 0) +
    (includeBatchID ? 1 : 0);

  const normal = new Cartesian3(0.0, 0.0, 1.0);

  function addVertex(position) {
    if (includePositions) {
      vertices.push(position.x, position.y, position.z);
    }
    if (includeNormals) {
      vertices.push(normal.x, normal.y, normal.z);
    }
    if (includeBatchID) {
      vertices.push(batchID);
    }

    return vertices.length / vertexStride - 1;
  }

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

  const i0 = addVertex(p0);
  const i1 = addVertex(p1);
  const i2 = addVertex(p2);
  const i3 = addVertex(p3);
  const i4 = addVertex(p4);
  const i5 = addVertex(p5);
  const i6 = addVertex(p6);
  const i7 = addVertex(p7);
  const i8 = addVertex(p8);

  indices.push(i0, i2, i1);
  indices.push(i3, i4, i5);
  indices.push(i6, i7, i8);
  indices.push(i0, i6, i3);

  edges.push(i0, i1);
  edges.push(i0, i2);
  edges.push(i3, i5);
  edges.push(i3, i4);
  edges.push(i6, i7);
  edges.push(i6, i8);
  edges.push(i0, i3);
  edges.push(i0, i6);
  edges.push(i3, i6);
}

function waitForReady(scene, model) {
  return pollToPromise(
    function () {
      // Render scene to progressively load the model
      scene.renderForSpecs();
      return model.ready;
    },
    { timeout: 10000 }
  )
    .then(function () {
      return model;
    })
    .catch(function () {
      return Promise.reject(model);
    });
}
