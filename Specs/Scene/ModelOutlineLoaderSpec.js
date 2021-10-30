import { Cartesian3, Model, when } from "../../Source/Cesium.js";
import createScene from "../createScene.js";
import pollToPromise from "../pollToPromise.js";
import GltfBuilder from "./GltfBuilder.js";

describe(
  "Scene/ModelOutlineLoader",
  function () {
    var scene;
    var primitives;

    beforeAll(function () {
      scene = createScene();
      primitives = scene.primitives;
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    it("does nothing if no primitives are outlined", function () {
      var vertices = [];
      var indices = [];
      var edges = [];
      createModel(vertices, indices, edges, 1, true, true, true);

      var builder = createGltfBuilder();

      var bufferBuilder = builder.buffer();

      bufferBuilder
        .vertexBuffer("vertices")
        .vec3("position")
        .vec3("normal")
        .scalar("batchID")
        .data(vertices);

      bufferBuilder.indexBuffer("indices").scalar("index").data(indices);

      var meshBuilder = builder.mesh();
      var primitiveBuilder = meshBuilder.primitive();
      primitiveBuilder
        .triangles()
        .material("default")
        .attribute("POSITION", "position")
        .attribute("NORMAL", "normal")
        .attribute("_BATCHID", "batchID")
        .indices("index");

      var gltf = builder.toGltf();

      var model = new Model({
        gltf: gltf,
      });

      primitives.add(model);

      return waitForReady(scene, model).then(function () {
        var gltf = model.gltf;
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
      var vertices = [];
      var indices = [];
      var edges = [];
      createTrickyModel(vertices, indices, edges, 2, true, true, true);
      createModel(vertices, indices, edges, 1, true, true, true);

      var builder = createGltfBuilder();

      var bufferBuilder = builder.buffer();

      bufferBuilder
        .vertexBuffer("vertices")
        .vec3("position")
        .vec3("normal")
        .scalar("batchID")
        .data(vertices);

      bufferBuilder.indexBuffer("indices").scalar("index").data(indices);
      bufferBuilder.indexBuffer("edgeIndices").scalar("edgeIndex").data(edges);

      var meshBuilder = builder.mesh();
      var primitiveBuilder = meshBuilder.primitive();
      primitiveBuilder
        .triangles()
        .material("default")
        .attribute("POSITION", "position")
        .attribute("NORMAL", "normal")
        .attribute("_BATCHID", "batchID")
        .indices("index");

      var gltf = builder.toGltf();

      gltf.extensionsUsed.push("CESIUM_primitive_outline");
      gltf.meshes[0].primitives[0].extensions = {
        CESIUM_primitive_outline: {
          indices: gltf.accessors.length - 1,
        },
      };

      var model = new Model({
        gltf: gltf,
      });

      primitives.add(model);

      return waitForReady(scene, model).then(function () {
        var gltf = model.gltf;
        var primitive = gltf.meshes[0].primitives[0];
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
        var accessorId = primitive.attributes._OUTLINE_COORDINATES;
        var accessor = gltf.accessors[accessorId];
        var bufferView = gltf.bufferViews[accessor.bufferView];
        var buffer = gltf.buffers[bufferView.buffer];

        var outlineCoordinates = new Float32Array(
          buffer.extras._pipeline.source,
          bufferView.byteOffset,
          accessor.count * 3
        );

        var triangleAccessor = gltf.accessors.filter(function (accessor) {
          return accessor.name === "index";
        })[0];
        var triangleBufferView = gltf.bufferViews[triangleAccessor.bufferView];
        var triangleBuffer = gltf.buffers[triangleBufferView.buffer];

        var triangleIndices = new Uint16Array(
          triangleBuffer.extras._pipeline.source,
          triangleBufferView.byteOffset,
          triangleAccessor.count
        );

        for (var i = 0; i < triangleIndices.length; i += 3) {
          var i0 = triangleIndices[i];
          var i1 = triangleIndices[i + 1];
          var i2 = triangleIndices[i + 2];

          var i0Original = indices[i];
          var i1Original = indices[i + 1];
          var i2Original = indices[i + 2];

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
      var min = Math.min(i0, i1);
      var max = Math.max(i0, i1);

      for (var i = 0; i < edges.length; i += 2) {
        var low = Math.min(edges[i], edges[i + 1]);
        var high = Math.max(edges[i], edges[i + 1]);

        if (low === min && high === max) {
          return true;
        }
      }

      return false;
    }

    function hasCoordinates(outlineCoordinates, i0, i1, i2, o0, o1, o2) {
      var a0 = outlineCoordinates[i0 * 3];
      var b0 = outlineCoordinates[i0 * 3 + 1];
      var c0 = outlineCoordinates[i0 * 3 + 2];
      var a1 = outlineCoordinates[i1 * 3];
      var b1 = outlineCoordinates[i1 * 3 + 1];
      var c1 = outlineCoordinates[i1 * 3 + 2];
      var a2 = outlineCoordinates[i2 * 3];
      var b2 = outlineCoordinates[i2 * 3 + 1];
      var c2 = outlineCoordinates[i2 * 3 + 2];

      return (
        (a0 === o0 && a1 === o1 && a2 === o2) ||
        (b0 === o0 && b1 === o1 && b2 === o2) ||
        (c0 === o0 && c1 === o1 && c2 === o2)
      );
    }

    it("ignores extension on primitive if it's not in extensionsUsed", function () {
      var vertices = [];
      var indices = [];
      var edges = [];
      createModel(vertices, indices, edges, 1, true, true, true);

      var builder = createGltfBuilder();

      var bufferBuilder = builder.buffer();

      bufferBuilder
        .vertexBuffer("vertices")
        .vec3("position")
        .vec3("normal")
        .scalar("batchID")
        .data(vertices);

      bufferBuilder.indexBuffer("indices").scalar("index").data(indices);
      bufferBuilder.indexBuffer("edgeIndices").scalar("edgeIndex").data(edges);

      var meshBuilder = builder.mesh();
      var primitiveBuilder = meshBuilder.primitive();
      primitiveBuilder
        .triangles()
        .material("default")
        .attribute("POSITION", "position")
        .attribute("NORMAL", "normal")
        .attribute("_BATCHID", "batchID")
        .indices("index");

      var gltf = builder.toGltf();

      gltf.meshes[0].primitives[0].extensions = {
        CESIUM_primitive_outline: {
          indices: gltf.accessors.length - 1,
        },
      };

      var model = new Model({
        gltf: gltf,
      });

      primitives.add(model);

      return waitForReady(scene, model).then(function () {
        var gltf = model.gltf;
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
      var vertices = [];
      var indices = [];
      var edges = [];
      createModel(vertices, indices, edges, 1, true, true, true);

      var builder = createGltfBuilder();

      var bufferBuilder = builder.buffer();

      bufferBuilder
        .vertexBuffer("vertices")
        .vec3("position")
        .vec3("normal")
        .scalar("batchID")
        .data(vertices);

      bufferBuilder.indexBuffer("indices").scalar("index").data(indices);

      var meshBuilder = builder.mesh();
      var primitiveBuilder = meshBuilder.primitive();
      primitiveBuilder
        .triangles()
        .material("default")
        .attribute("POSITION", "position")
        .attribute("NORMAL", "normal")
        .attribute("_BATCHID", "batchID")
        .indices("index");

      var gltf = builder.toGltf();

      gltf.extensionsUsed.push("CESIUM_primitive_outline");

      var model = new Model({
        gltf: gltf,
      });

      primitives.add(model);

      return waitForReady(scene, model).then(function () {
        var gltf = model.gltf;
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
      var vertices = [];
      var indices = [];
      var edges = [];
      createModel(vertices, indices, edges, 1, true, true, true);

      var builder = createGltfBuilder();

      var bufferBuilder = builder.buffer();

      bufferBuilder
        .vertexBuffer("vertices")
        .vec3("position")
        .vec3("normal")
        .scalar("batchID")
        .data(vertices);

      bufferBuilder.indexBuffer("indices").scalar("index").data(indices);
      bufferBuilder.indexBuffer("edgeIndices").scalar("edgeIndex").data(edges);

      var meshBuilder = builder.mesh();

      // Create two primitives, both using the same vertex buffer, but the
      // second one only uses the positions.
      var primitiveBuilder = meshBuilder.primitive();
      primitiveBuilder
        .triangles()
        .material("default")
        .attribute("POSITION", "position")
        .attribute("NORMAL", "normal")
        .attribute("_BATCHID", "batchID")
        .indices("index");

      var secondPrimitiveBuilder = meshBuilder.primitive();
      secondPrimitiveBuilder
        .triangles()
        .material("default")
        .attribute("POSITION", "position")
        .indices("index");

      var gltf = builder.toGltf();

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

      var model = new Model({
        gltf: gltf,
      });

      primitives.add(model);

      return waitForReady(scene, model).then(function () {
        var gltf = model.gltf;
        expect(gltf.accessors.length).toBe(6);
        expect(gltf.accessors[0].count).toBeGreaterThan(9);
        expect(gltf.accessors[1].count).toBeGreaterThan(9);
        expect(gltf.accessors[2].count).toBeGreaterThan(9);
        expect(gltf.accessors[0].count).toBe(gltf.accessors[1].count);
        expect(gltf.accessors[1].count).toBe(gltf.accessors[2].count);

        var firstPrimitive = gltf.meshes[0].primitives[0];
        expect(Object.keys(firstPrimitive.attributes).length).toBe(4);
        expect(firstPrimitive.attributes._OUTLINE_COORDINATES).toBeDefined();

        var secondPrimitive = gltf.meshes[0].primitives[1];
        expect(Object.keys(secondPrimitive.attributes).length).toBe(2);
        expect(secondPrimitive.attributes._OUTLINE_COORDINATES).toBeDefined();

        expect(gltf.accessors[3].count).toBe(indices.length);
        builder.destroy();
      });
    });

    it("handles vertices that are shared between an outlined and a non-outlined primitive", function () {
      var vertices = [];
      var indices = [];
      var edges = [];
      createModel(vertices, indices, edges, 1, true, true, true);

      var builder = createGltfBuilder();

      var bufferBuilder = builder.buffer();

      bufferBuilder
        .vertexBuffer("vertices")
        .vec3("position")
        .vec3("normal")
        .scalar("batchID")
        .data(vertices);

      bufferBuilder.indexBuffer("indices").scalar("index").data(indices);
      bufferBuilder.indexBuffer("edgeIndices").scalar("edgeIndex").data(edges);

      var meshBuilder = builder.mesh();

      // Create two primitives, both using the same vertex buffer, but the
      // second one only uses the positions.
      var primitiveBuilder = meshBuilder.primitive();
      primitiveBuilder
        .triangles()
        .material("default")
        .attribute("POSITION", "position")
        .attribute("NORMAL", "normal")
        .attribute("_BATCHID", "batchID")
        .indices("index");

      var secondPrimitiveBuilder = meshBuilder.primitive();
      secondPrimitiveBuilder
        .triangles()
        .material("default")
        .attribute("POSITION", "position")
        .indices("index");

      var gltf = builder.toGltf();

      // Add the outline extension only to the first primitive.
      gltf.extensionsUsed.push("CESIUM_primitive_outline");
      gltf.meshes[0].primitives[0].extensions = {
        CESIUM_primitive_outline: {
          indices: gltf.accessors.length - 1,
        },
      };

      var model = new Model({
        gltf: gltf,
      });

      primitives.add(model);

      return waitForReady(scene, model).then(function () {
        var gltf = model.gltf;
        expect(gltf.accessors.length).toBe(6);
        expect(gltf.accessors[0].count).toBeGreaterThan(9);
        expect(gltf.accessors[1].count).toBeGreaterThan(9);
        expect(gltf.accessors[2].count).toBeGreaterThan(9);
        expect(gltf.accessors[0].count).toBe(gltf.accessors[1].count);
        expect(gltf.accessors[1].count).toBe(gltf.accessors[2].count);

        var firstPrimitive = gltf.meshes[0].primitives[0];
        expect(Object.keys(firstPrimitive.attributes).length).toBe(4);
        expect(firstPrimitive.attributes._OUTLINE_COORDINATES).toBeDefined();

        var secondPrimitive = gltf.meshes[0].primitives[1];
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

      var vertices = [];
      var indices = [];
      var edges = [];

      // Tricky model is 9 vertices. Add copies of it until we're just under 65636 vertices.
      for (var i = 0; vertices.length / 7 + 9 <= 65535; ++i) {
        createTrickyModel(vertices, indices, edges, 2, true, true, true);
      }

      var builder = createGltfBuilder();

      var bufferBuilder = builder.buffer();

      bufferBuilder
        .vertexBuffer("vertices")
        .vec3("position")
        .vec3("normal")
        .scalar("batchID")
        .data(vertices);

      bufferBuilder.indexBuffer("indices").scalar("index").data(indices);
      bufferBuilder.indexBuffer("edgeIndices").scalar("edgeIndex").data(edges);

      var meshBuilder = builder.mesh();
      var primitiveBuilder = meshBuilder.primitive();
      primitiveBuilder
        .triangles()
        .material("default")
        .attribute("POSITION", "position")
        .attribute("NORMAL", "normal")
        .attribute("_BATCHID", "batchID")
        .indices("index");

      var gltf = builder.toGltf();

      gltf.extensionsUsed.push("CESIUM_primitive_outline");
      gltf.meshes[0].primitives[0].extensions = {
        CESIUM_primitive_outline: {
          indices: gltf.accessors.length - 1,
        },
      };

      var model = new Model({
        gltf: gltf,
      });

      primitives.add(model);

      return waitForReady(scene, model).then(function () {
        var gltf = model.gltf;
        var primitive = gltf.meshes[0].primitives[0];
        var triangleIndexAccessor = gltf.accessors[primitive.indices];

        // The accessor should now be 32-bit and reference higher-numbered vertices.
        expect(triangleIndexAccessor.componentType).toBe(5125); // UNSIGNED_INT
        expect(triangleIndexAccessor.max[0]).toBeGreaterThan(65536);
        expect(triangleIndexAccessor.byteOffset).toBe(0);

        var bufferView = gltf.bufferViews[triangleIndexAccessor.bufferView];
        var buffer = gltf.buffers[bufferView.buffer];
        var data = buffer.extras._pipeline.source;
        var indexBuffer = new Uint32Array(
          data,
          data.byteOffset + bufferView.byteOffset,
          triangleIndexAccessor.count
        );

        // All the original indices should be the same.
        for (var i = 0; i < indices.length; ++i) {
          // All indices in the original range should match the original ones
          if (indexBuffer[i] < vertices.length / 7) {
            expect(indexBuffer[i]).toBe(indices[i]);
          }
        }

        var rendererIndexBuffer =
          model._rendererResources.buffers[triangleIndexAccessor.bufferView];
        expect(rendererIndexBuffer.bytesPerIndex).toBe(4);

        builder.destroy();
      });
    });
  },
  "WebGL"
);

function createGltfBuilder() {
  var builder = new GltfBuilder();

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
  var vertexStride =
    (includePositions ? 3 : 0) +
    (includeNormals ? 3 : 0) +
    (includeBatchID ? 1 : 0);

  var normal = new Cartesian3(0.0, 0.0, 1.0);

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

  var p0 = new Cartesian3(-1.0, -1.0, 0.0);
  var p1 = new Cartesian3(0.0, -1.0, 0.0);
  var p2 = new Cartesian3(1.0, -1.0, 0.0);
  var p3 = new Cartesian3(-1.0, 0.0, 0.0);
  var p4 = new Cartesian3(0.0, 0.0, 0.0);
  var p5 = new Cartesian3(1.0, 0.0, 0.0);
  var p6 = new Cartesian3(-1.0, 1.0, 0.0);
  var p7 = new Cartesian3(0.0, 1.0, 0.0);
  var p8 = new Cartesian3(1.0, 1.0, 0.0);

  var i0 = addVertex(p0);
  var i1 = addVertex(p1);
  var i2 = addVertex(p2);
  var i3 = addVertex(p3);
  var i4 = addVertex(p4);
  var i5 = addVertex(p5);
  var i6 = addVertex(p6);
  var i7 = addVertex(p7);
  var i8 = addVertex(p8);

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

  var vertexStride =
    (includePositions ? 3 : 0) +
    (includeNormals ? 3 : 0) +
    (includeBatchID ? 1 : 0);

  var normal = new Cartesian3(0.0, 0.0, 1.0);

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

  var p0 = new Cartesian3(-1.0, 1.0, 0.0);
  var p1 = new Cartesian3(-2.0, 2.0, 0.0);
  var p2 = new Cartesian3(-1.0, 2.0, 0.0);
  var p3 = new Cartesian3(1.0, 1.0, 0.0);
  var p4 = new Cartesian3(2.0, 2.0, 0.0);
  var p5 = new Cartesian3(1.0, 2.0, 0.0);
  var p6 = new Cartesian3(0.0, 0.0, 0.0);
  var p7 = new Cartesian3(-1.0, -1.0, 0.0);
  var p8 = new Cartesian3(-1.0, 1.0, 0.0);

  var i0 = addVertex(p0);
  var i1 = addVertex(p1);
  var i2 = addVertex(p2);
  var i3 = addVertex(p3);
  var i4 = addVertex(p4);
  var i5 = addVertex(p5);
  var i6 = addVertex(p6);
  var i7 = addVertex(p7);
  var i8 = addVertex(p8);

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
    .otherwise(function () {
      return when.reject(model);
    });
}
