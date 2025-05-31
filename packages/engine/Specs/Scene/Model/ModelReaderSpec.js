import {
  Model,
  ModelUtility,
  ResourceCache,
  Math as CesiumMath,
  Cartesian2,
  Cartesian3,
  Matrix4,
  ModelReader,
  TranslationRotationScale,
} from "../../../index.js";

import createScene from "../../../../../Specs/createScene.js";
import pollToPromise from "../../../../../Specs/pollToPromise.js";

const baseUrl = "./Data/Models/glTF-2.0/unitSquare/";

/**
 * Create a model from the given glTF, add it as a primitive
 * to the given scene, and wait until it is fully loaded.
 *
 * @param {Scene} scene The scene
 * @param {object} gltf The gltf
 * @returns {Model} The model
 */
async function loadAsModel(scene, gltf) {
  const basePath = "SPEC_BASE_PATH";
  const model = await Model.fromGltfAsync({
    gltf: gltf,
    basePath: basePath,
    incrementallyLoadTextures: false,
  });
  scene.primitives.add(model);

  await pollToPromise(
    function () {
      scene.renderForSpecs();
      return model.ready;
    },
    { timeout: 10000 },
  );
  return model;
}

// A simple representation of a 'Vertex' in an indexed triangle
// set, only consisting of a Cartesian3 position and a
// Cartesian2 texture coordinate
class SpecVertex {
  constructor(p, t) {
    this.p = p;
    this.t = t;
  }

  equalsEpsilon(other, epsilon) {
    if (!this.p.equalsEpsilon(other.p, epsilon)) {
      return false;
    }
    if (!this.t.equalsEpsilon(other.t, epsilon)) {
      return false;
    }
    return true;
  }
}

// A simple representation of a 'Triangle' in an indexed triangle
// set, simply storing 3 vertices
class SpecTriangle {
  constructor(v0, v1, v2) {
    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;
  }

  equalsEpsilon(other, epsilon) {
    if (
      this.v0.equalsEpsilon(other.v0, epsilon) &&
      this.v1.equalsEpsilon(other.v1, epsilon) &&
      this.v2.equalsEpsilon(other.v2, epsilon)
    ) {
      return true;
    }
    if (
      this.v0.equalsEpsilon(other.v1, epsilon) &&
      this.v1.equalsEpsilon(other.v2, epsilon) &&
      this.v2.equalsEpsilon(other.v0, epsilon)
    ) {
      return true;
    }
    if (
      this.v0.equalsEpsilon(other.v2, epsilon) &&
      this.v1.equalsEpsilon(other.v0, epsilon) &&
      this.v2.equalsEpsilon(other.v1, epsilon)
    ) {
      return true;
    }
    return false;
  }
}

// A simple representation of an indexed triangle set,
// consisting of SpecTriangle and SpecVertex instances,
// created from flat arrays of triangle indices,
// positions, and texture coordinates
class SpecIndexedTriangleSet {
  constructor(indices, positions, texCoords) {
    const specVertices = [];
    const numVertices = positions.length / 3;
    for (let i = 0; i < numVertices; i++) {
      const px = positions[i * 3 + 0];
      const py = positions[i * 3 + 1];
      const pz = positions[i * 3 + 2];
      const tx = texCoords[i * 2 + 0];
      const ty = texCoords[i * 2 + 1];
      const p = new Cartesian3(px, py, pz);
      const t = new Cartesian2(tx, ty);
      const v = new SpecVertex(p, t);
      specVertices.push(v);
    }

    const specTriangles = [];
    const numTriangles = indices.length / 3;
    for (let i = 0; i < numTriangles; i++) {
      const i0 = indices[i * 3 + 0];
      const i1 = indices[i * 3 + 1];
      const i2 = indices[i * 3 + 2];
      const v0 = specVertices[i0];
      const v1 = specVertices[i1];
      const v2 = specVertices[i2];
      const t = new SpecTriangle(v0, v1, v2);
      specTriangles.push(t);
    }
    this.specTriangles = specTriangles;
  }

  containsEpsilon(specTriangle, epsilon) {
    const n = this.specTriangles.length;
    for (let i = 0; i < n; i++) {
      const t = this.specTriangles[i];
      if (t.equalsEpsilon(specTriangle, epsilon)) {
        return true;
      }
    }
    return false;
  }

  equalsEpsilon(other, epsilon) {
    if (this.specTriangles.length !== other.specTriangles.length) {
      return false;
    }
    const n = this.specTriangles.length;
    for (let i = 0; i < n; i++) {
      const specTriangle = this.specTriangles[i];
      if (!other.containsEpsilon(specTriangle, epsilon)) {
        return false;
      }
    }
    return true;
  }
}

// Returns a Matrix4 that describes the transform of the given
// glTF node, either obtained from the node 'matrix' or from
// the node 'translation', 'rotation', 'scale', defaulting
// to the identity matrix if no information was given.
function getNodeMatrix(node) {
  if (node.matrix) {
    return Matrix4.fromArray(node.matrix, 0, new Matrix4());
  }
  const trs = new TranslationRotationScale(
    node.translation,
    node.rotation,
    node.scale,
  );
  return Matrix4.fromTranslationRotationScale(trs, new Matrix4());
}

// Loads the glTF from the given URL as a 'Model' and adds it to
// the given scene, then obtains the indices, positions, and
// texture coordinates from this model using the 'ModelReader',
// and creates a SpecIndexedTriangleSet from the result.
async function loadPrimitiveAsIndexedTriangleSet(scene, url) {
  const model = await loadAsModel(scene, url);

  const node = model.sceneGraph.components.nodes[0];
  const matrix = getNodeMatrix(node);

  const primitive = node.primitives[0];
  const indices = ModelReader.readIndicesAsTriangleIndicesTypedArray(
    primitive.indices,
    primitive.primitiveType,
  );
  const positionAttribute = ModelUtility.getAttributeBySemantic(
    primitive,
    "POSITION",
  );
  const texCoordAttribute = ModelUtility.getAttributeBySemantic(
    primitive,
    "TEXCOORD",
    0,
  );
  const rawPositions = ModelReader.readAttributeAsTypedArray(positionAttribute);
  const positions = ModelReader.transform3D(rawPositions, matrix, undefined);
  const texCoords = ModelReader.readAttributeAsTypedArray(texCoordAttribute);

  const its = new SpecIndexedTriangleSet(indices, positions, texCoords);
  return its;
}

// A spec for the 'ModelReader' class. It reads the same geometry from
// different flavors of glTF assets (e.g. interleaved or compressed),
// and checks whether the resulting geometry is epsilon-equal to the
// geometry that was read from the "plain" glTF asset
describe(
  "Scene/Model/ModelReader",
  function () {
    let scene;

    beforeAll(function () {
      scene = createScene();
    });

    afterAll(function () {
      scene.destroyForSpecs();
    });

    afterEach(function () {
      scene.primitives.removeAll();
      ResourceCache.clearForSpecs();
    });

    it("reads interleaved data", async function () {
      if (!scene.context.webgl2) {
        return;
      }

      const expectedName = "unitSquare11x11_plain.glb";
      const actualName = "unitSquare11x11_plain_interleaved.glb";

      const expectedUrl = `${baseUrl}${expectedName}`;
      const actualUrl = `${baseUrl}${actualName}`;
      const expectedIts = await loadPrimitiveAsIndexedTriangleSet(
        scene,
        expectedUrl,
      );
      const actualIts = await loadPrimitiveAsIndexedTriangleSet(
        scene,
        actualUrl,
      );
      const equal = actualIts.equalsEpsilon(expectedIts, CesiumMath.EPSILON3);
      expect(equal)
        .withContext(
          `Expected ${actualName} to contain the same geometry as ${expectedName}`,
        )
        .toBeTrue();
    });

    it("reads draco data", async function () {
      if (!scene.context.webgl2) {
        return;
      }

      const expectedName = "unitSquare11x11_plain.glb";
      const actualName = "unitSquare11x11_draco.glb";

      const expectedUrl = `${baseUrl}${expectedName}`;
      const actualUrl = `${baseUrl}${actualName}`;
      const expectedIts = await loadPrimitiveAsIndexedTriangleSet(
        scene,
        expectedUrl,
      );
      const actualIts = await loadPrimitiveAsIndexedTriangleSet(
        scene,
        actualUrl,
      );
      const equal = actualIts.equalsEpsilon(expectedIts, CesiumMath.EPSILON3);
      expect(equal)
        .withContext(
          `Expected ${actualName} to contain the same geometry as ${expectedName}`,
        )
        .toBeTrue();
    });

    it("reads meshopt data", async function () {
      if (!scene.context.webgl2) {
        return;
      }

      const expectedName = "unitSquare11x11_plain.glb";
      const actualName = "unitSquare11x11_meshopt.glb";

      const expectedUrl = `${baseUrl}${expectedName}`;
      const actualUrl = `${baseUrl}${actualName}`;
      const expectedIts = await loadPrimitiveAsIndexedTriangleSet(
        scene,
        expectedUrl,
      );
      const actualIts = await loadPrimitiveAsIndexedTriangleSet(
        scene,
        actualUrl,
      );
      const equal = actualIts.equalsEpsilon(expectedIts, CesiumMath.EPSILON3);
      expect(equal)
        .withContext(
          `Expected ${actualName} to contain the same geometry as ${expectedName}`,
        )
        .toBeTrue();
    });

    it("reads quantized_interleaved data", async function () {
      if (!scene.context.webgl2) {
        return;
      }

      const expectedName = "unitSquare11x11_plain.glb";
      const actualName = "unitSquare11x11_quantized_interleaved.glb";

      const expectedUrl = `${baseUrl}${expectedName}`;
      const actualUrl = `${baseUrl}${actualName}`;
      const expectedIts = await loadPrimitiveAsIndexedTriangleSet(
        scene,
        expectedUrl,
      );
      const actualIts = await loadPrimitiveAsIndexedTriangleSet(
        scene,
        actualUrl,
      );
      const equal = actualIts.equalsEpsilon(expectedIts, CesiumMath.EPSILON3);
      expect(equal)
        .withContext(
          `Expected ${actualName} to contain the same geometry as ${expectedName}`,
        )
        .toBeTrue();
    });

    it("reads unsignedShortTexCoords data", async function () {
      if (!scene.context.webgl2) {
        return;
      }

      const expectedName = "unitSquare11x11_plain.glb";
      const actualName = "unitSquare11x11_unsignedShortTexCoords.glb";

      const expectedUrl = `${baseUrl}${expectedName}`;
      const actualUrl = `${baseUrl}${actualName}`;
      const expectedIts = await loadPrimitiveAsIndexedTriangleSet(
        scene,
        expectedUrl,
      );
      const actualIts = await loadPrimitiveAsIndexedTriangleSet(
        scene,
        actualUrl,
      );
      const equal = actualIts.equalsEpsilon(expectedIts, CesiumMath.EPSILON3);
      expect(equal)
        .withContext(
          `Expected ${actualName} to contain the same geometry as ${expectedName}`,
        )
        .toBeTrue();
    });

    it("reads unsignedShortTexCoords_interleaved data", async function () {
      if (!scene.context.webgl2) {
        return;
      }

      const expectedName = "unitSquare11x11_plain.glb";
      const actualName =
        "unitSquare11x11_unsignedShortTexCoords_interleaved.glb";

      const expectedUrl = `${baseUrl}${expectedName}`;
      const actualUrl = `${baseUrl}${actualName}`;
      const expectedIts = await loadPrimitiveAsIndexedTriangleSet(
        scene,
        expectedUrl,
      );
      const actualIts = await loadPrimitiveAsIndexedTriangleSet(
        scene,
        actualUrl,
      );
      const equal = actualIts.equalsEpsilon(expectedIts, CesiumMath.EPSILON3);
      expect(equal)
        .withContext(
          `Expected ${actualName} to contain the same geometry as ${expectedName}`,
        )
        .toBeTrue();
    });

    it("reads unsignedShortTexCoords_quantized data", async function () {
      if (!scene.context.webgl2) {
        return;
      }

      const expectedName = "unitSquare11x11_plain.glb";
      const actualName = "unitSquare11x11_unsignedShortTexCoords_quantized.glb";

      const expectedUrl = `${baseUrl}${expectedName}`;
      const actualUrl = `${baseUrl}${actualName}`;
      const expectedIts = await loadPrimitiveAsIndexedTriangleSet(
        scene,
        expectedUrl,
      );
      const actualIts = await loadPrimitiveAsIndexedTriangleSet(
        scene,
        actualUrl,
      );
      const equal = actualIts.equalsEpsilon(expectedIts, CesiumMath.EPSILON3);
      expect(equal)
        .withContext(
          `Expected ${actualName} to contain the same geometry as ${expectedName}`,
        )
        .toBeTrue();
    });

    it("reads unsignedShortTexCoords_quantized_interleaved data", async function () {
      if (!scene.context.webgl2) {
        return;
      }

      const expectedName = "unitSquare11x11_plain.glb";
      const actualName =
        "unitSquare11x11_unsignedShortTexCoords_quantized_interleaved.glb";

      const expectedUrl = `${baseUrl}${expectedName}`;
      const actualUrl = `${baseUrl}${actualName}`;
      const expectedIts = await loadPrimitiveAsIndexedTriangleSet(
        scene,
        expectedUrl,
      );
      const actualIts = await loadPrimitiveAsIndexedTriangleSet(
        scene,
        actualUrl,
      );
      const equal = actualIts.equalsEpsilon(expectedIts, CesiumMath.EPSILON3);
      expect(equal)
        .withContext(
          `Expected ${actualName} to contain the same geometry as ${expectedName}`,
        )
        .toBeTrue();
    });
  },
  "WebGL",
);
