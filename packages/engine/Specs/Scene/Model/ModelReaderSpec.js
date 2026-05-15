import {
  Model,
  ModelComponents,
  ModelUtility,
  ResourceCache,
  Math as CesiumMath,
  AttributeCompression,
  AttributeType,
  Cartesian2,
  Cartesian3,
  ComponentDatatype,
  Ellipsoid,
  GeographicProjection,
  IndexDatatype,
  Matrix4,
  ModelReader,
  Quaternion,
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

    describe("readAttributeAsTypedArray", function () {
      /**
       * Creates a mock buffer that serves the given data from getBufferData.
       * @param {TypedArray} data The backing data
       * @returns {object} A mock buffer object
       */
      function createMockBuffer(data) {
        const bytes = new Uint8Array(
          data.buffer,
          data.byteOffset,
          data.byteLength,
        );
        return {
          sizeInBytes: bytes.byteLength,
          getBufferData: function (outputArray, srcByteOffset) {
            srcByteOffset = srcByteOffset ?? 0;
            if (outputArray instanceof Uint8Array) {
              outputArray.set(bytes);
            } else {
              const srcView = new DataView(
                bytes.buffer,
                bytes.byteOffset,
                bytes.byteLength,
              );
              const bytesPerElement = outputArray.BYTES_PER_ELEMENT;
              for (let i = 0; i < outputArray.length; i++) {
                const byteIdx = srcByteOffset + i * bytesPerElement;
                if (outputArray instanceof Float32Array) {
                  outputArray[i] = srcView.getFloat32(byteIdx, true);
                } else if (outputArray instanceof Uint16Array) {
                  outputArray[i] = srcView.getUint16(byteIdx, true);
                } else if (outputArray instanceof Uint8Array) {
                  outputArray[i] = srcView.getUint8(byteIdx);
                } else if (outputArray instanceof Int8Array) {
                  outputArray[i] = srcView.getInt8(byteIdx);
                } else if (outputArray instanceof Int16Array) {
                  outputArray[i] = srcView.getInt16(byteIdx, true);
                } else if (outputArray instanceof Uint32Array) {
                  outputArray[i] = srcView.getUint32(byteIdx, true);
                } else if (outputArray instanceof Float64Array) {
                  outputArray[i] = srcView.getFloat64(byteIdx, true);
                }
              }
            }
          },
        };
      }

      /**
       * Creates a mock attribute with sensible defaults.
       */
      function createAttribute(options) {
        return Object.assign(
          {
            type: AttributeType.VEC3,
            count: 0,
            componentDatatype: ComponentDatatype.FLOAT,
            normalized: false,
            quantization: undefined,
            byteOffset: 0,
            byteStride: undefined,
            buffer: undefined,
          },
          options,
        );
      }

      it("returns compact float data for a simple VEC3 FLOAT attribute", function () {
        const data = new Float32Array([1, 2, 3, 4, 5, 6]);
        const attribute = createAttribute({
          type: AttributeType.VEC3,
          count: 2,
          componentDatatype: ComponentDatatype.FLOAT,
          buffer: createMockBuffer(data),
        });

        const result = ModelReader.readAttributeAsTypedArray(attribute);

        expect(result.length).toBe(6);
        expect(result[0]).toBe(1);
        expect(result[1]).toBe(2);
        expect(result[2]).toBe(3);
        expect(result[3]).toBe(4);
        expect(result[4]).toBe(5);
        expect(result[5]).toBe(6);
      });

      it("returns compact float data for a VEC2 FLOAT attribute", function () {
        const data = new Float32Array([10, 20, 30, 40]);
        const attribute = createAttribute({
          type: AttributeType.VEC2,
          count: 2,
          componentDatatype: ComponentDatatype.FLOAT,
          buffer: createMockBuffer(data),
        });

        const result = ModelReader.readAttributeAsTypedArray(attribute);

        expect(result.length).toBe(4);
        expect(result[0]).toBe(10);
        expect(result[1]).toBe(20);
        expect(result[2]).toBe(30);
        expect(result[3]).toBe(40);
      });

      it("returns compact data for a SCALAR FLOAT attribute", function () {
        const data = new Float32Array([7, 8, 9]);
        const attribute = createAttribute({
          type: AttributeType.SCALAR,
          count: 3,
          componentDatatype: ComponentDatatype.FLOAT,
          buffer: createMockBuffer(data),
        });

        const result = ModelReader.readAttributeAsTypedArray(attribute);

        expect(result.length).toBe(3);
        expect(result[0]).toBe(7);
        expect(result[1]).toBe(8);
        expect(result[2]).toBe(9);
      });

      it("deinterleaves data when byteStride exceeds default", function () {
        // VEC3 FLOAT: 3 components * 4 bytes = 12 bytes default stride
        // Set byteStride to 24 to simulate interleaving with 12 bytes of padding
        // Layout: [x0, y0, z0, pad, pad, pad, x1, y1, z1, pad, pad, pad]
        const interleaved = new Float32Array([
          1, 2, 3, 99, 99, 99, 4, 5, 6, 99, 99, 99,
        ]);
        const attribute = createAttribute({
          type: AttributeType.VEC3,
          count: 2,
          componentDatatype: ComponentDatatype.FLOAT,
          byteStride: 24,
          byteOffset: 0,
          buffer: createMockBuffer(interleaved),
        });

        const result = ModelReader.readAttributeAsTypedArray(attribute);

        expect(result.length).toBe(6);
        expect(result[0]).toBe(1);
        expect(result[1]).toBe(2);
        expect(result[2]).toBe(3);
        expect(result[3]).toBe(4);
        expect(result[4]).toBe(5);
        expect(result[5]).toBe(6);
      });

      it("respects byteOffset when deinterleaving", function () {
        // VEC3 FLOAT with byteStride=24, byteOffset=12
        // Layout per element: [pad, pad, pad, x, y, z]
        const interleaved = new Float32Array([
          99, 99, 99, 10, 20, 30, 99, 99, 99, 40, 50, 60,
        ]);
        const attribute = createAttribute({
          type: AttributeType.VEC3,
          count: 2,
          componentDatatype: ComponentDatatype.FLOAT,
          byteStride: 24,
          byteOffset: 12,
          buffer: createMockBuffer(interleaved),
        });

        const result = ModelReader.readAttributeAsTypedArray(attribute);

        expect(result.length).toBe(6);
        expect(result[0]).toBe(10);
        expect(result[1]).toBe(20);
        expect(result[2]).toBe(30);
        expect(result[3]).toBe(40);
        expect(result[4]).toBe(50);
        expect(result[5]).toBe(60);
      });

      it("applies normalization to UNSIGNED_BYTE data", function () {
        // UNSIGNED_BYTE VEC3, normalized
        // Values 0 and 255 should map to 0.0 and 1.0
        const data = new Uint8Array([0, 128, 255, 255, 0, 128]);
        const attribute = createAttribute({
          type: AttributeType.VEC3,
          count: 2,
          componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
          normalized: true,
          buffer: createMockBuffer(data),
        });

        const result = ModelReader.readAttributeAsTypedArray(attribute);

        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBe(6);
        expect(result[0]).toBeCloseTo(0.0, 5);
        expect(result[2]).toBeCloseTo(1.0, 5);
        expect(result[3]).toBeCloseTo(1.0, 5);
        expect(result[4]).toBeCloseTo(0.0, 5);
      });

      it("applies normalization to UNSIGNED_SHORT data", function () {
        const data = new Uint16Array([0, 65535, 32768]);
        const attribute = createAttribute({
          type: AttributeType.VEC3,
          count: 1,
          componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
          normalized: true,
          buffer: createMockBuffer(data),
        });

        const result = ModelReader.readAttributeAsTypedArray(attribute);

        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBe(3);
        expect(result[0]).toBeCloseTo(0.0, 5);
        expect(result[1]).toBeCloseTo(1.0, 5);
        expect(result[2]).toBeCloseTo(32768 / 65535, 3);
      });

      it("dequantizes VEC3 data with stepSize and offset", function () {
        // Quantized VEC3: value * stepSize + offset
        const data = new Uint16Array([100, 200, 300]);
        const stepSize = new Cartesian3(0.01, 0.02, 0.03);
        const offset = new Cartesian3(1, 2, 3);
        const attribute = createAttribute({
          type: AttributeType.VEC3,
          count: 1,
          componentDatatype: ComponentDatatype.FLOAT,
          quantization: {
            componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
            type: AttributeType.VEC3,
            octEncoded: false,
            quantizedVolumeStepSize: stepSize,
            quantizedVolumeOffset: offset,
          },
          buffer: createMockBuffer(data),
        });

        const result = ModelReader.readAttributeAsTypedArray(attribute);

        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBe(3);
        // 100 * 0.01 + 1 = 2.0
        expect(result[0]).toBeCloseTo(2.0, 3);
        // 200 * 0.02 + 2 = 6.0
        expect(result[1]).toBeCloseTo(6.0, 3);
        // 300 * 0.03 + 3 = 12.0
        expect(result[2]).toBeCloseTo(12.0, 3);
      });

      it("dequantizes VEC2 data with stepSize and offset", function () {
        const data = new Uint16Array([10, 20, 30, 40]);
        const stepSize = new Cartesian2(0.1, 0.2);
        const offset = new Cartesian2(5, 10);
        const attribute = createAttribute({
          type: AttributeType.VEC2,
          count: 2,
          componentDatatype: ComponentDatatype.FLOAT,
          quantization: {
            componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
            type: AttributeType.VEC2,
            octEncoded: false,
            quantizedVolumeStepSize: stepSize,
            quantizedVolumeOffset: offset,
          },
          buffer: createMockBuffer(data),
        });

        const result = ModelReader.readAttributeAsTypedArray(attribute);

        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBe(4);
        // 10 * 0.1 + 5 = 6.0
        expect(result[0]).toBeCloseTo(6.0, 3);
        // 20 * 0.2 + 10 = 14.0
        expect(result[1]).toBeCloseTo(14.0, 3);
      });

      it("dequantizes SCALAR data with stepSize and offset", function () {
        const data = new Uint16Array([100, 200]);
        const attribute = createAttribute({
          type: AttributeType.SCALAR,
          count: 2,
          componentDatatype: ComponentDatatype.FLOAT,
          quantization: {
            componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
            type: AttributeType.SCALAR,
            octEncoded: false,
            quantizedVolumeStepSize: 0.5,
            quantizedVolumeOffset: 10,
          },
          buffer: createMockBuffer(data),
        });

        const result = ModelReader.readAttributeAsTypedArray(attribute);

        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBe(2);
        // 100 * 0.5 + 10 = 60.0
        expect(result[0]).toBeCloseTo(60.0, 3);
        // 200 * 0.5 + 10 = 110.0
        expect(result[1]).toBeCloseTo(110.0, 3);
      });

      it("oct-decodes quantized normals", function () {
        // Create oct-encoded normals: encode (0, 0, 1) to see if it decodes back
        const normal = new Cartesian3(0, 0, 1);
        const range = 255;
        const encodedC2 = AttributeCompression.octEncodeInRange(
          normal,
          range,
          new Cartesian2(),
        );
        const encodedData = new Uint8Array([encodedC2.x, encodedC2.y, 0]);

        const attribute = createAttribute({
          type: AttributeType.VEC3,
          count: 1,
          componentDatatype: ComponentDatatype.FLOAT,
          quantization: {
            componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
            type: AttributeType.VEC3,
            octEncoded: true,
            octEncodedZXY: false,
            normalizationRange: range,
          },
          buffer: createMockBuffer(encodedData),
        });

        const result = ModelReader.readAttributeAsTypedArray(attribute);

        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBe(3);
        // The decoded normal should be approximately (0, 0, 1)
        const decodedNormal = new Cartesian3(result[0], result[1], result[2]);
        expect(
          Cartesian3.equalsEpsilon(decodedNormal, normal, CesiumMath.EPSILON2),
        ).toBe(true);
      });

      it("returns data without normalization or dequantization when neither is set", function () {
        const data = new Float32Array([1.5, 2.5, 3.5]);
        const attribute = createAttribute({
          type: AttributeType.VEC3,
          count: 1,
          componentDatatype: ComponentDatatype.FLOAT,
          normalized: false,
          quantization: undefined,
          buffer: createMockBuffer(data),
        });

        const result = ModelReader.readAttributeAsTypedArray(attribute);

        expect(result[0]).toBe(1.5);
        expect(result[1]).toBe(2.5);
        expect(result[2]).toBe(3.5);
      });

      it("reads UNSIGNED_SHORT data without normalization", function () {
        const data = new Uint16Array([100, 200, 300, 400, 500, 600]);
        const attribute = createAttribute({
          type: AttributeType.VEC3,
          count: 2,
          componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
          buffer: createMockBuffer(data),
        });

        const result = ModelReader.readAttributeAsTypedArray(attribute);

        expect(result).toBeInstanceOf(Uint16Array);
        expect(result.length).toBe(6);
        expect(result[0]).toBe(100);
        expect(result[5]).toBe(600);
      });

      it("uses quantized componentDatatype for raw read when quantization is present", function () {
        // Attribute says FLOAT but quantization says UNSIGNED_SHORT
        // The raw read should use UNSIGNED_SHORT
        const data = new Uint16Array([10, 20, 30]);
        const attribute = createAttribute({
          type: AttributeType.VEC3,
          count: 1,
          componentDatatype: ComponentDatatype.FLOAT,
          quantization: {
            componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
            type: AttributeType.VEC3,
            octEncoded: false,
            quantizedVolumeStepSize: new Cartesian3(1, 1, 1),
            quantizedVolumeOffset: new Cartesian3(0, 0, 0),
          },
          buffer: createMockBuffer(data),
        });

        const result = ModelReader.readAttributeAsTypedArray(attribute);

        // After dequantization: value * 1 + 0 = value, as Float32Array
        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBe(3);
        expect(result[0]).toBeCloseTo(10, 3);
        expect(result[1]).toBeCloseTo(20, 3);
        expect(result[2]).toBeCloseTo(30, 3);
      });

      it("applies normalization to UNSIGNED_BYTE typedArray data", function () {
        const attribute = createAttribute({
          type: AttributeType.VEC3,
          count: 2,
          componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
          normalized: true,
          typedArray: new Uint8Array([0, 128, 255, 255, 0, 128]),
        });

        const result = ModelReader.readAttributeAsTypedArray(attribute);

        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBe(6);
        expect(result[0]).toBeCloseTo(0.0, 5);
        expect(result[2]).toBeCloseTo(1.0, 5);
        expect(result[3]).toBeCloseTo(1.0, 5);
        expect(result[4]).toBeCloseTo(0.0, 5);
      });

      it("applies normalization to UNSIGNED_SHORT typedArray data", function () {
        const attribute = createAttribute({
          type: AttributeType.VEC3,
          count: 1,
          componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
          normalized: true,
          typedArray: new Uint16Array([0, 65535, 32768]),
        });

        const result = ModelReader.readAttributeAsTypedArray(attribute);

        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBe(3);
        expect(result[0]).toBeCloseTo(0.0, 5);
        expect(result[1]).toBeCloseTo(1.0, 5);
        expect(result[2]).toBeCloseTo(32768 / 65535, 3);
      });

      it("dequantizes VEC3 typedArray data with stepSize and offset", function () {
        const stepSize = new Cartesian3(0.01, 0.02, 0.03);
        const offset = new Cartesian3(1, 2, 3);
        const attribute = createAttribute({
          type: AttributeType.VEC3,
          count: 1,
          componentDatatype: ComponentDatatype.FLOAT,
          quantization: {
            componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
            type: AttributeType.VEC3,
            octEncoded: false,
            quantizedVolumeStepSize: stepSize,
            quantizedVolumeOffset: offset,
          },
          typedArray: new Uint16Array([100, 200, 300]),
        });

        const result = ModelReader.readAttributeAsTypedArray(attribute);

        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBe(3);
        expect(result[0]).toBeCloseTo(2.0, 3);
        expect(result[1]).toBeCloseTo(6.0, 3);
        expect(result[2]).toBeCloseTo(12.0, 3);
      });

      it("dequantizes SCALAR typedArray data with stepSize and offset", function () {
        const attribute = createAttribute({
          type: AttributeType.SCALAR,
          count: 2,
          componentDatatype: ComponentDatatype.FLOAT,
          quantization: {
            componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
            type: AttributeType.SCALAR,
            octEncoded: false,
            quantizedVolumeStepSize: 0.5,
            quantizedVolumeOffset: 10,
          },
          typedArray: new Uint16Array([100, 200]),
        });

        const result = ModelReader.readAttributeAsTypedArray(attribute);

        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBe(2);
        expect(result[0]).toBeCloseTo(60.0, 3);
        expect(result[1]).toBeCloseTo(110.0, 3);
      });

      it("oct-decodes quantized normals from typedArray", function () {
        const normal = new Cartesian3(0, 0, 1);
        const range = 255;
        const encodedC2 = AttributeCompression.octEncodeInRange(
          normal,
          range,
          new Cartesian2(),
        );

        const attribute = createAttribute({
          type: AttributeType.VEC3,
          count: 1,
          componentDatatype: ComponentDatatype.FLOAT,
          quantization: {
            componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
            type: AttributeType.VEC3,
            octEncoded: true,
            octEncodedZXY: false,
            normalizationRange: range,
          },
          typedArray: new Uint8Array([encodedC2.x, encodedC2.y, 0]),
        });

        const result = ModelReader.readAttributeAsTypedArray(attribute);

        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBe(3);
        const decodedNormal = new Cartesian3(result[0], result[1], result[2]);
        expect(
          Cartesian3.equalsEpsilon(decodedNormal, normal, CesiumMath.EPSILON2),
        ).toBe(true);
      });
    });

    describe("readAttributeAsRawCompactTypedArray", function () {
      function createAttribute(options) {
        return Object.assign(
          {
            type: AttributeType.VEC3,
            count: 0,
            componentDatatype: ComponentDatatype.FLOAT,
            normalized: false,
            quantization: undefined,
            byteOffset: 0,
            byteStride: undefined,
            buffer: undefined,
            typedArray: undefined,
          },
          options,
        );
      }

      // A buffer whose getBufferData must never be called.
      // Provided alongside typedArray to verify typedArray is preferred.
      function createUnreachableBuffer() {
        return {
          sizeInBytes: 0,
          getBufferData: function () {
            fail(
              "getBufferData should not be called when typedArray is defined",
            );
          },
        };
      }

      /**
       * Creates a mock buffer that serves the given data from getBufferData.
       * @param {TypedArray} data The backing data
       * @returns {object} A mock buffer object
       */
      function createMockBuffer(data) {
        const bytes = new Uint8Array(
          data.buffer,
          data.byteOffset,
          data.byteLength,
        );
        return {
          sizeInBytes: bytes.byteLength,
          getBufferData: function (outputArray, srcByteOffset) {
            srcByteOffset = srcByteOffset ?? 0;
            if (outputArray instanceof Uint8Array) {
              outputArray.set(bytes);
            } else {
              const srcView = new DataView(
                bytes.buffer,
                bytes.byteOffset,
                bytes.byteLength,
              );
              const bytesPerElement = outputArray.BYTES_PER_ELEMENT;
              for (let i = 0; i < outputArray.length; i++) {
                const byteIdx = srcByteOffset + i * bytesPerElement;
                if (outputArray instanceof Float32Array) {
                  outputArray[i] = srcView.getFloat32(byteIdx, true);
                } else if (outputArray instanceof Uint16Array) {
                  outputArray[i] = srcView.getUint16(byteIdx, true);
                } else if (outputArray instanceof Int8Array) {
                  outputArray[i] = srcView.getInt8(byteIdx);
                } else if (outputArray instanceof Int16Array) {
                  outputArray[i] = srcView.getInt16(byteIdx, true);
                } else if (outputArray instanceof Uint32Array) {
                  outputArray[i] = srcView.getUint32(byteIdx, true);
                } else if (outputArray instanceof Float64Array) {
                  outputArray[i] = srcView.getFloat64(byteIdx, true);
                }
              }
            }
          },
        };
      }

      // --- Tests for typedArray (prefered over buffer if defined) ---

      it("returns attribute.typedArray directly when byteOffset is 0 and stride is default", function () {
        const typedArray = new Float32Array([1, 2, 3, 4, 5, 6]);
        const attribute = createAttribute({
          type: AttributeType.VEC3,
          count: 2,
          componentDatatype: ComponentDatatype.FLOAT,
          byteOffset: 0,
          typedArray: typedArray,
          buffer: createUnreachableBuffer(),
        });

        const result =
          ModelReader.readAttributeAsRawCompactTypedArray(attribute);

        // Should be the exact same reference
        expect(result).toBe(typedArray);
      });

      it("returns attribute.typedArray directly when byteOffset is undefined and stride is default", function () {
        const typedArray = new Float32Array([10, 20, 30]);
        const attribute = createAttribute({
          type: AttributeType.VEC3,
          count: 1,
          componentDatatype: ComponentDatatype.FLOAT,
          byteOffset: undefined,
          typedArray: typedArray,
          buffer: createUnreachableBuffer(),
        });

        const result =
          ModelReader.readAttributeAsRawCompactTypedArray(attribute);

        expect(result).toBe(typedArray);
      });

      it("returns attribute.typedArray directly when byteOffset is non-zero and stride is default", function () {
        const typedArray = new Float32Array([1, 2, 3, 4, 5, 6]); // typedArray should always be tightly-packed
        const attribute = createAttribute({
          type: AttributeType.VEC3,
          count: 2,
          componentDatatype: ComponentDatatype.FLOAT,
          byteOffset: 12, // should be ignored as typedArray is already unpacked
          typedArray: typedArray,
          buffer: createUnreachableBuffer(),
        });

        const result =
          ModelReader.readAttributeAsRawCompactTypedArray(attribute);

        // Should be the same reference
        expect(result).toBe(typedArray);
      });

      it("returns attribute.typedArray directly when byteOffset is zero and stride is non-zero", function () {
        const typedArray = new Float32Array([1, 2, 3, 4, 5, 6]); // typedArray should always be tightly-packed
        const attribute = createAttribute({
          type: AttributeType.VEC3,
          count: 2,
          componentDatatype: ComponentDatatype.FLOAT,
          byteStride: 24, // should be ignored as typedArray is already unpacked
          byteOffset: 0,
          typedArray: typedArray,
          buffer: createUnreachableBuffer(),
        });

        const result =
          ModelReader.readAttributeAsRawCompactTypedArray(attribute);

        // Should be the same reference
        expect(result).toBe(typedArray);
      });

      it("returns attribute.typedArray directly when byteOffset is non-zero and stride is non-zero", function () {
        const typedArray = new Float32Array([1, 2, 3, 4, 5, 6]); // typedArray should always be tightly-packed
        const attribute = createAttribute({
          type: AttributeType.VEC3,
          count: 2,
          componentDatatype: ComponentDatatype.FLOAT,
          byteStride: 24, // should be ignored as typedArray is already unpacked
          byteOffset: 12, // should be ignored as typedArray is already unpacked
          typedArray: typedArray,
          buffer: createUnreachableBuffer(),
        });

        const result =
          ModelReader.readAttributeAsRawCompactTypedArray(attribute);

        // Should be the same reference
        expect(result).toBe(typedArray);
      });

      it("uses quantized componentDatatype when reading from typedArray", function () {
        // Attribute says FLOAT but quantization says UNSIGNED_SHORT
        const typedArray = new Uint16Array([10, 20, 30]);
        const attribute = createAttribute({
          type: AttributeType.VEC3,
          count: 1,
          componentDatatype: ComponentDatatype.FLOAT,
          byteOffset: 0,
          quantization: {
            componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
          },
          typedArray: typedArray,
          buffer: createUnreachableBuffer(),
        });

        const result =
          ModelReader.readAttributeAsRawCompactTypedArray(attribute);

        // Should return the typedArray directly (zero offset, default stride)
        expect(result).toBe(typedArray);
      });

      it("handles SCALAR FLOAT typedArray returned directly", function () {
        const typedArray = new Float32Array([7, 8, 9]);
        const attribute = createAttribute({
          type: AttributeType.SCALAR,
          count: 3,
          componentDatatype: ComponentDatatype.FLOAT,
          byteOffset: 0,
          typedArray: typedArray,
          buffer: createUnreachableBuffer(),
        });

        const result =
          ModelReader.readAttributeAsRawCompactTypedArray(attribute);

        expect(result).toBe(typedArray);
      });

      // --- Tests for getBufferData (typedArray is undefined) ---

      it("reads VEC3 FLOAT from buffer when typedArray is undefined", function () {
        const data = new Float32Array([1, 2, 3, 4, 5, 6]);
        const attribute = createAttribute({
          type: AttributeType.VEC3,
          count: 2,
          componentDatatype: ComponentDatatype.FLOAT,
          byteOffset: 0,
          buffer: createMockBuffer(data),
        });

        const result =
          ModelReader.readAttributeAsRawCompactTypedArray(attribute);

        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBe(6);
        expect(result[0]).toBe(1);
        expect(result[1]).toBe(2);
        expect(result[2]).toBe(3);
        expect(result[3]).toBe(4);
        expect(result[4]).toBe(5);
        expect(result[5]).toBe(6);
      });

      it("reads from buffer with non-zero byteOffset and default stride", function () {
        // Buffer contains 3 extra floats at the start, then the real data
        const data = new Float32Array([99, 99, 99, 1, 2, 3, 4, 5, 6]);
        const attribute = createAttribute({
          type: AttributeType.VEC3,
          count: 2,
          componentDatatype: ComponentDatatype.FLOAT,
          byteOffset: 12, // skip 3 floats * 4 bytes
          buffer: createMockBuffer(data),
        });

        const result =
          ModelReader.readAttributeAsRawCompactTypedArray(attribute);

        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBe(6);
        expect(result[0]).toBe(1);
        expect(result[1]).toBe(2);
        expect(result[2]).toBe(3);
        expect(result[3]).toBe(4);
        expect(result[4]).toBe(5);
        expect(result[5]).toBe(6);
      });

      it("deinterleaves from buffer when byteStride exceeds default", function () {
        // VEC3 FLOAT: default stride = 12 bytes. Set byteStride = 24.
        const interleaved = new Float32Array([
          1, 2, 3, 99, 99, 99, 4, 5, 6, 99, 99, 99,
        ]);
        const attribute = createAttribute({
          type: AttributeType.VEC3,
          count: 2,
          componentDatatype: ComponentDatatype.FLOAT,
          byteStride: 24,
          byteOffset: 0,
          buffer: createMockBuffer(interleaved),
        });

        const result =
          ModelReader.readAttributeAsRawCompactTypedArray(attribute);

        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBe(6);
        expect(result[0]).toBe(1);
        expect(result[1]).toBe(2);
        expect(result[2]).toBe(3);
        expect(result[3]).toBe(4);
        expect(result[4]).toBe(5);
        expect(result[5]).toBe(6);
      });

      it("deinterleaves from buffer with byteOffset", function () {
        // VEC3 FLOAT with byteStride=24, byteOffset=12
        const interleaved = new Float32Array([
          99, 99, 99, 10, 20, 30, 99, 99, 99, 40, 50, 60,
        ]);
        const attribute = createAttribute({
          type: AttributeType.VEC3,
          count: 2,
          componentDatatype: ComponentDatatype.FLOAT,
          byteStride: 24,
          byteOffset: 12,
          buffer: createMockBuffer(interleaved),
        });

        const result =
          ModelReader.readAttributeAsRawCompactTypedArray(attribute);

        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBe(6);
        expect(result[0]).toBe(10);
        expect(result[1]).toBe(20);
        expect(result[2]).toBe(30);
        expect(result[3]).toBe(40);
        expect(result[4]).toBe(50);
        expect(result[5]).toBe(60);
      });

      it("reads quantized componentDatatype from buffer", function () {
        const data = new Uint16Array([10, 20, 30]);
        const attribute = createAttribute({
          type: AttributeType.VEC3,
          count: 1,
          componentDatatype: ComponentDatatype.FLOAT,
          byteOffset: 0,
          quantization: {
            componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
          },
          buffer: createMockBuffer(data),
        });

        const result =
          ModelReader.readAttributeAsRawCompactTypedArray(attribute);

        expect(result).toBeInstanceOf(Uint16Array);
        expect(result.length).toBe(3);
        expect(result[0]).toBe(10);
        expect(result[1]).toBe(20);
        expect(result[2]).toBe(30);
      });

      it("reads VEC2 UNSIGNED_SHORT from buffer with non-zero byteOffset", function () {
        const data = new Uint16Array([99, 99, 10, 20, 30, 40]);
        const attribute = createAttribute({
          type: AttributeType.VEC2,
          count: 2,
          componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
          byteOffset: 4, // skip 2 shorts * 2 bytes
          buffer: createMockBuffer(data),
        });

        const result =
          ModelReader.readAttributeAsRawCompactTypedArray(attribute);

        expect(result).toBeInstanceOf(Uint16Array);
        expect(result.length).toBe(4);
        expect(result[0]).toBe(10);
        expect(result[1]).toBe(20);
        expect(result[2]).toBe(30);
        expect(result[3]).toBe(40);
      });

      it("reads SCALAR FLOAT from buffer", function () {
        const data = new Float32Array([7, 8, 9]);
        const attribute = createAttribute({
          type: AttributeType.SCALAR,
          count: 3,
          componentDatatype: ComponentDatatype.FLOAT,
          byteOffset: 0,
          buffer: createMockBuffer(data),
        });

        const result =
          ModelReader.readAttributeAsRawCompactTypedArray(attribute);

        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBe(3);
        expect(result[0]).toBe(7);
        expect(result[1]).toBe(8);
        expect(result[2]).toBe(9);
      });
    });

    describe("readIndicesAsTypedArray", function () {
      function createMockIndicesBuffer(data) {
        return {
          getBufferData: function (outputArray) {
            for (let i = 0; i < data.length; i++) {
              outputArray[i] = data[i];
            }
          },
        };
      }

      it("returns existing typedArray when available", function () {
        const typedArray = new Uint16Array([0, 1, 2, 3, 4, 5]);
        const primitiveIndices = {
          typedArray: typedArray,
          count: 6,
          indexDatatype: IndexDatatype.UNSIGNED_SHORT,
        };

        const result = ModelReader.readIndicesAsTypedArray(primitiveIndices);

        expect(result).toBe(typedArray);
      });

      it("reads UNSIGNED_BYTE indices from buffer", function () {
        const data = new Uint8Array([0, 1, 2]);
        const primitiveIndices = {
          typedArray: undefined,
          buffer: createMockIndicesBuffer(data),
          count: 3,
          indexDatatype: IndexDatatype.UNSIGNED_BYTE,
        };

        const result = ModelReader.readIndicesAsTypedArray(primitiveIndices);

        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBe(3);
        expect(result[0]).toBe(0);
        expect(result[1]).toBe(1);
        expect(result[2]).toBe(2);
      });

      it("reads UNSIGNED_SHORT indices from buffer", function () {
        const data = new Uint16Array([10, 20, 30]);
        const primitiveIndices = {
          typedArray: undefined,
          buffer: createMockIndicesBuffer(data),
          count: 3,
          indexDatatype: IndexDatatype.UNSIGNED_SHORT,
        };

        const result = ModelReader.readIndicesAsTypedArray(primitiveIndices);

        expect(result).toBeInstanceOf(Uint16Array);
        expect(result.length).toBe(3);
        expect(result[0]).toBe(10);
        expect(result[1]).toBe(20);
        expect(result[2]).toBe(30);
      });

      it("reads UNSIGNED_INT indices from buffer", function () {
        const data = new Uint32Array([100, 200, 300]);
        const primitiveIndices = {
          typedArray: undefined,
          buffer: createMockIndicesBuffer(data),
          count: 3,
          indexDatatype: IndexDatatype.UNSIGNED_INT,
        };

        const result = ModelReader.readIndicesAsTypedArray(primitiveIndices);

        expect(result).toBeInstanceOf(Uint32Array);
        expect(result.length).toBe(3);
        expect(result[0]).toBe(100);
        expect(result[1]).toBe(200);
        expect(result[2]).toBe(300);
      });

      it("reads correct count of indices from buffer", function () {
        const data = new Uint16Array([0, 1, 2, 3, 4, 5]);
        const primitiveIndices = {
          typedArray: undefined,
          buffer: createMockIndicesBuffer(data),
          count: 6,
          indexDatatype: IndexDatatype.UNSIGNED_SHORT,
        };

        const result = ModelReader.readIndicesAsTypedArray(primitiveIndices);

        expect(result.length).toBe(6);
        expect(result[5]).toBe(5);
      });

      it("prefers typedArray over buffer when both are present", function () {
        const typedArray = new Uint16Array([10, 11, 12]);
        const bufferData = new Uint16Array([99, 99, 99]);
        const primitiveIndices = {
          typedArray: typedArray,
          buffer: createMockIndicesBuffer(bufferData),
          count: 3,
          indexDatatype: IndexDatatype.UNSIGNED_SHORT,
        };

        const result = ModelReader.readIndicesAsTypedArray(primitiveIndices);

        expect(result).toBe(typedArray);
        expect(result[0]).toBe(10);
      });
    });

    describe("readImplicitRangeAsTypedArray", function () {
      function createMockAttributeOwner(count) {
        return {
          attributes: [{ count: count }],
        };
      }

      it("generates values using offset and repeat", function () {
        const featureIdSet = { offset: 0, repeat: 1 };
        const attributeOwner = createMockAttributeOwner(5);

        const result = ModelReader.readImplicitRangeAsTypedArray(
          featureIdSet,
          attributeOwner,
        );

        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBe(5);
        expect(result[0]).toBe(0);
        expect(result[1]).toBe(1);
        expect(result[2]).toBe(2);
        expect(result[3]).toBe(3);
        expect(result[4]).toBe(4);
      });

      it("applies offset to generated values", function () {
        const featureIdSet = { offset: 10, repeat: 1 };
        const attributeOwner = createMockAttributeOwner(3);

        const result = ModelReader.readImplicitRangeAsTypedArray(
          featureIdSet,
          attributeOwner,
        );

        expect(result.length).toBe(3);
        expect(result[0]).toBe(10);
        expect(result[1]).toBe(11);
        expect(result[2]).toBe(12);
      });

      it("repeats feature IDs when repeat is greater than 1", function () {
        const featureIdSet = { offset: 0, repeat: 3 };
        const attributeOwner = createMockAttributeOwner(9);

        const result = ModelReader.readImplicitRangeAsTypedArray(
          featureIdSet,
          attributeOwner,
        );

        expect(result.length).toBe(9);
        // First 3 vertices get feature ID 0
        expect(result[0]).toBe(0);
        expect(result[1]).toBe(0);
        expect(result[2]).toBe(0);
        // Next 3 vertices get feature ID 1
        expect(result[3]).toBe(1);
        expect(result[4]).toBe(1);
        expect(result[5]).toBe(1);
        // Next 3 vertices get feature ID 2
        expect(result[6]).toBe(2);
        expect(result[7]).toBe(2);
        expect(result[8]).toBe(2);
      });

      it("combines offset and repeat", function () {
        const featureIdSet = { offset: 5, repeat: 2 };
        const attributeOwner = createMockAttributeOwner(6);

        const result = ModelReader.readImplicitRangeAsTypedArray(
          featureIdSet,
          attributeOwner,
        );

        expect(result.length).toBe(6);
        // offset + floor(i / repeat)
        expect(result[0]).toBe(5); // 5 + floor(0/2)
        expect(result[1]).toBe(5); // 5 + floor(1/2)
        expect(result[2]).toBe(6); // 5 + floor(2/2)
        expect(result[3]).toBe(6); // 5 + floor(3/2)
        expect(result[4]).toBe(7); // 5 + floor(4/2)
        expect(result[5]).toBe(7); // 5 + floor(5/2)
      });

      it("fills all values with offset when repeat is undefined", function () {
        const featureIdSet = { offset: 42, repeat: undefined };
        const attributeOwner = createMockAttributeOwner(4);

        const result = ModelReader.readImplicitRangeAsTypedArray(
          featureIdSet,
          attributeOwner,
        );

        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBe(4);
        expect(result[0]).toBe(42);
        expect(result[1]).toBe(42);
        expect(result[2]).toBe(42);
        expect(result[3]).toBe(42);
      });

      it("returns empty array when count is zero", function () {
        const featureIdSet = { offset: 0, repeat: 1 };
        const attributeOwner = createMockAttributeOwner(0);

        const result = ModelReader.readImplicitRangeAsTypedArray(
          featureIdSet,
          attributeOwner,
        );

        expect(result).toBeInstanceOf(Float32Array);
        expect(result.length).toBe(0);
      });

      it("handles offset of zero with undefined repeat", function () {
        const featureIdSet = { offset: 0, repeat: undefined };
        const attributeOwner = createMockAttributeOwner(3);

        const result = ModelReader.readImplicitRangeAsTypedArray(
          featureIdSet,
          attributeOwner,
        );

        expect(result.length).toBe(3);
        expect(result[0]).toBe(0);
        expect(result[1]).toBe(0);
        expect(result[2]).toBe(0);
      });
    });

    describe("forEachPrimitive", function () {
      function createMockRuntimeNode(options) {
        options = options ?? {};
        return {
          computedTransform: options.computedTransform ?? Matrix4.IDENTITY,
          node: {
            instances: options.instances,
          },
          transformsTypedArray: options.transformsTypedArray,
          instancingTransformsBuffer: options.instancingTransformsBuffer,
        };
      }

      function createMockSceneGraph(options) {
        options = options ?? {};
        return {
          computedModelMatrix: options.computedModelMatrix ?? Matrix4.IDENTITY,
          components: {
            transform: options.componentsTransform ?? Matrix4.IDENTITY,
          },
          axisCorrectionMatrix:
            options.axisCorrectionMatrix ?? Matrix4.IDENTITY,
        };
      }

      function createMockModel(options) {
        options = options ?? {};
        return {
          modelMatrix: options.modelMatrix ?? Matrix4.IDENTITY,
        };
      }

      function createMockModelForTraversal(options) {
        options = options ?? {};
        const runtimePrimitives = (options.primitives ?? []).map(function (p) {
          return {
            primitive: p,
            boundingSphere: p._boundingSphere,
          };
        });
        const runtimeNode = createMockRuntimeNode(options.nodeOptions);
        runtimeNode.runtimePrimitives = runtimePrimitives;

        const sceneGraph = createMockSceneGraph(options.sceneGraphOptions);
        sceneGraph._runtimeNodes = options.runtimeNodes ?? [runtimeNode];

        const model = createMockModel(options.modelOptions);
        model._ready = options.ready !== undefined ? options.ready : true;
        model.sceneGraph = sceneGraph;

        return model;
      }

      it("does nothing when sceneGraph is undefined", function () {
        const model = {
          sceneGraph: undefined,
        };
        const callback = jasmine.createSpy("callback");

        ModelReader.forEachPrimitive(model, undefined, callback);

        expect(callback).not.toHaveBeenCalled();
      });

      it("does nothing when there are no runtime nodes", function () {
        const model = createMockModelForTraversal({
          primitives: [],
        });
        model.sceneGraph._runtimeNodes = [];
        const callback = jasmine.createSpy("callback");

        ModelReader.forEachPrimitive(model, undefined, callback);

        expect(callback).not.toHaveBeenCalled();
      });

      it("invokes callback once per primitive", function () {
        const primitiveA = { id: "a" };
        const primitiveB = { id: "b" };
        const model = createMockModelForTraversal({
          primitives: [primitiveA, primitiveB],
        });
        const callback = jasmine.createSpy("callback");

        ModelReader.forEachPrimitive(model, undefined, callback);

        expect(callback).toHaveBeenCalledTimes(2);
      });

      it("passes runtimePrimitive, primitive, instances, and computedModelMatrix to callback", function () {
        const primitive = { id: "test" };
        const model = createMockModelForTraversal({
          primitives: [primitive],
        });
        const callback = jasmine.createSpy("callback");

        ModelReader.forEachPrimitive(model, undefined, callback);

        expect(callback).toHaveBeenCalledTimes(1);

        const args = callback.calls.argsFor(0);
        // runtimePrimitive
        expect(args[0].primitive).toBe(primitive);
        // primitive
        expect(args[1]).toBe(primitive);
        // instances (array of InstanceEntry)
        expect(Array.isArray(args[2])).toBe(true);
        expect(args[2].length).toBe(1);
        expect(args[2][0].transform).toEqual(Matrix4.IDENTITY);
        expect(args[2][0].featureId).toBeUndefined();
        // computedModelMatrix
        expect(args[3]).toBeDefined();
        expect(args[3]).toEqual(Matrix4.IDENTITY);
      });

      it("computes correct transforms from non-identity node and model matrices", function () {
        const nodeTransform = Matrix4.fromTranslation(new Cartesian3(1, 2, 3));
        const modelMatrix = Matrix4.fromTranslation(new Cartesian3(10, 20, 30));
        const primitive = { id: "p" };
        const model = createMockModelForTraversal({
          primitives: [primitive],
          nodeOptions: {
            computedTransform: nodeTransform,
          },
          sceneGraphOptions: {
            computedModelMatrix: modelMatrix,
          },
        });
        const callback = jasmine.createSpy("callback");

        ModelReader.forEachPrimitive(model, undefined, callback);

        const expected = Matrix4.multiplyTransformation(
          modelMatrix,
          nodeTransform,
          new Matrix4(),
        );
        const computedModelMatrix = callback.calls.argsFor(0)[3];
        expect(computedModelMatrix).toEqual(expected);
      });

      it("iterates over primitives across multiple nodes", function () {
        const primA = { id: "a" };
        const primB = { id: "b" };

        const nodeA = createMockRuntimeNode();
        nodeA.runtimePrimitives = [{ primitive: primA }];

        const nodeB = createMockRuntimeNode();
        nodeB.runtimePrimitives = [{ primitive: primB }];

        const sceneGraph = createMockSceneGraph();
        sceneGraph._runtimeNodes = [nodeA, nodeB];

        const model = createMockModel();
        model.sceneGraph = sceneGraph;

        const primitives = [];
        ModelReader.forEachPrimitive(
          model,
          undefined,
          function (rp, primitive) {
            primitives.push(primitive);
          },
        );

        expect(primitives.length).toBe(2);
        expect(primitives[0]).toBe(primA);
        expect(primitives[1]).toBe(primB);
      });

      it("provides instance transforms from MAT4 typedArray when node has instancing", function () {
        // Two instance transforms packed as 12 floats each (3 rows of 4).
        // Matrix4 constructor takes row-major args, so each 12-float block is:
        //   row0: [col0.x, col1.x, col2.x, col3.x]
        //   row1: [col0.y, col1.y, col2.y, col3.y]
        //   row2: [col0.z, col1.z, col2.z, col3.z]
        const twoInstances = new Float32Array([
          // prettier-ignore
          1,
          0,
          0,
          0,
          0,
          1,
          0,
          0,
          0,
          0,
          1,
          0, // Instance 0: identity
          // prettier-ignore
          1,
          0,
          0,
          5,
          0,
          1,
          0,
          0,
          0,
          0,
          1,
          0, // Instance 1: translation (5, 0, 0)
        ]);
        const modelMatrix = Matrix4.fromTranslation(new Cartesian3(10, 20, 30));
        const primitive = { id: "instanced" };
        const model = createMockModelForTraversal({
          primitives: [primitive],
          nodeOptions: {
            instances: {
              transformInWorldSpace: false,
              attributes: [
                { count: 2, componentDatatype: ComponentDatatype.FLOAT },
              ],
            },
            transformsTypedArray: twoInstances,
          },
          sceneGraphOptions: {
            computedModelMatrix: modelMatrix,
          },
        });
        const callback = jasmine.createSpy("callback");

        ModelReader.forEachPrimitive(model, undefined, callback);

        const instances = callback.calls.argsFor(0)[2];
        expect(instances.length).toBe(2);

        // Each instance transform is pre-multiplied by computedModelMatrix
        // (computedModelMatrix = modelMatrix * nodeTransform, nodeTransform is identity here).
        // Instance 0: modelMatrix * identity = modelMatrix
        expect(instances[0].transform).toEqual(modelMatrix);
        // Instance 1: modelMatrix * translation(5,0,0) = translation(15, 20, 30)
        const expectedInstance1 = Matrix4.multiplyTransformation(
          modelMatrix,
          Matrix4.fromTranslation(new Cartesian3(5, 0, 0)),
          new Matrix4(),
        );
        expect(instances[1].transform).toEqual(expectedInstance1);
      });

      it("provides instance transforms from MAT4 buffer when node has instancing", function () {
        const readbackData = new Float32Array([
          1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0,
        ]);
        const mockBuffer = {
          getBufferData: function (outputArray) {
            for (let i = 0; i < readbackData.length; i++) {
              outputArray[i] = readbackData[i];
            }
          },
        };

        const nodeOptions = {
          instances: {
            transformInWorldSpace: false,
            attributes: [
              { count: 1, componentDatatype: ComponentDatatype.FLOAT },
            ],
          },
          transformsTypedArray: undefined,
        };

        const primitive = { id: "gpuReadback" };
        const model = createMockModelForTraversal({
          primitives: [primitive],
          nodeOptions: nodeOptions,
        });
        // Attach the mock buffer after createMockModelForTraversal builds the node
        model.sceneGraph._runtimeNodes[0].instancingTransformsBuffer =
          mockBuffer;

        const callback = jasmine.createSpy("callback");

        ModelReader.forEachPrimitive(model, undefined, callback);

        expect(callback).toHaveBeenCalledTimes(1);
        const instances = callback.calls.argsFor(0)[2];
        // Should have read back successfully, producing 1 instance transform
        expect(instances.length).toBe(1);
        // The transform should not just be the fallback computedModelMatrix
        expect(instances[0].transform).toBeDefined();
      });

      it("provides instance transforms from VEC3 attributes typedArray", function () {
        // Same setup as "provides instance transforms when node has instancing"
        // but using Vec3 translation attributes instead of transformsTypedArray.
        // Instance 0: translation (0, 0, 0) — identity
        // Instance 1: translation (5, 0, 0)
        const translationTypedArray = new Float32Array([
          0,
          0,
          0, // instance 0 translation
          5,
          0,
          0, // instance 1 translation
        ]);
        const modelMatrix = Matrix4.fromTranslation(new Cartesian3(10, 20, 30));
        const primitive = { id: "vec3Instanced" };
        const model = createMockModelForTraversal({
          primitives: [primitive],
          nodeOptions: {
            instances: {
              transformInWorldSpace: false,
              attributes: [
                {
                  semantic: "TRANSLATION",
                  count: 2,
                  componentDatatype: ComponentDatatype.FLOAT,
                  type: AttributeType.VEC3,
                  typedArray: translationTypedArray,
                },
              ],
            },
          },
          sceneGraphOptions: {
            computedModelMatrix: modelMatrix,
          },
        });
        const callback = jasmine.createSpy("callback");

        ModelReader.forEachPrimitive(model, undefined, callback);

        expect(callback).toHaveBeenCalledTimes(1);
        const instances = callback.calls.argsFor(0)[2];
        expect(instances.length).toBe(2);

        // Instance 0: modelMatrix * identity = modelMatrix
        expect(instances[0].transform).toEqual(modelMatrix);
        // Instance 1: modelMatrix * translation(5,0,0) = translation(15, 20, 30)
        const expectedInstance1 = Matrix4.multiplyTransformation(
          modelMatrix,
          Matrix4.fromTranslation(new Cartesian3(5, 0, 0)),
          new Matrix4(),
        );
        expect(instances[1].transform).toEqual(expectedInstance1);
      });

      it("provides instance transforms from VEC3 attributes typedArray with translation, rotation, and scale", function () {
        // Two instances with TRANSLATION, ROTATION, and SCALE Vec3/Vec4 attributes.
        // Instance 0: origin, identity rotation, unit scale → identity
        // Instance 1: translation (5,0,0), 90° around Z, scale (2,2,2)
        const sqrt1_2 = Math.sqrt(0.5);
        const translationTypedArray = new Float32Array([
          0,
          0,
          0, // instance 0
          5,
          0,
          0, // instance 1
        ]);
        const rotationTypedArray = new Float32Array([
          0,
          0,
          0,
          1, // instance 0: identity quaternion (x,y,z,w)
          0,
          0,
          sqrt1_2,
          sqrt1_2, // instance 1: 90° around Z
        ]);
        const scaleTypedArray = new Float32Array([
          1,
          1,
          1, // instance 0
          2,
          2,
          2, // instance 1
        ]);
        const modelMatrix = Matrix4.fromTranslation(new Cartesian3(10, 20, 30));
        const primitive = { id: "vec3TRS" };
        const model = createMockModelForTraversal({
          primitives: [primitive],
          nodeOptions: {
            instances: {
              transformInWorldSpace: false,
              attributes: [
                {
                  semantic: "TRANSLATION",
                  count: 2,
                  componentDatatype: ComponentDatatype.FLOAT,
                  type: AttributeType.VEC3,
                  typedArray: translationTypedArray,
                },
                {
                  semantic: "ROTATION",
                  count: 2,
                  componentDatatype: ComponentDatatype.FLOAT,
                  type: AttributeType.VEC4,
                  typedArray: rotationTypedArray,
                },
                {
                  semantic: "SCALE",
                  count: 2,
                  componentDatatype: ComponentDatatype.FLOAT,
                  type: AttributeType.VEC3,
                  typedArray: scaleTypedArray,
                },
              ],
            },
          },
          sceneGraphOptions: {
            computedModelMatrix: modelMatrix,
          },
        });
        const callback = jasmine.createSpy("callback");

        ModelReader.forEachPrimitive(model, undefined, callback);

        expect(callback).toHaveBeenCalledTimes(1);
        const instances = callback.calls.argsFor(0)[2];
        expect(instances.length).toBe(2);

        // Instance 0: modelMatrix * identity TRS = modelMatrix
        expect(instances[0].transform).toEqual(modelMatrix);

        // Instance 1: modelMatrix * TRS(translate(5,0,0), rot90Z, scale(2,2,2))
        const expectedRaw = Matrix4.fromTranslationQuaternionRotationScale(
          new Cartesian3(5, 0, 0),
          new Quaternion(0, 0, sqrt1_2, sqrt1_2),
          new Cartesian3(2, 2, 2),
          new Matrix4(),
        );
        const expectedInstance1 = Matrix4.multiplyTransformation(
          modelMatrix,
          expectedRaw,
          new Matrix4(),
        );
        expect(instances[1].transform).toEqualEpsilon(
          expectedInstance1,
          CesiumMath.EPSILON3,
        );
      });

      it("provides instance transforms from interleaved Vec3 attribute buffer with translation, rotation, and scale", function () {
        // Same logical instances as the Vec3 TRS test, but all attributes
        // are packed into a single interleaved Float32Array buffer with
        // byteOffset and byteStride, simulating a GPU-backed interleaved
        // vertex buffer.
        //
        // Per-instance layout (10 floats = 40 bytes):
        //   offset  0: TRANSLATION (VEC3, 3 floats, 12 bytes)
        //   offset 12: ROTATION    (VEC4, 4 floats, 16 bytes)
        //   offset 28: SCALE       (VEC3, 3 floats, 12 bytes)
        // Stride = 40 bytes
        //
        // Instance 0: identity
        // Instance 1: translation(5,0,0), 90° around Z, scale(2,2,2)
        const sqrt1_2 = Math.sqrt(0.5);

        // prettier-ignore
        const interleavedData = new Float32Array([
          // Instance 0: T(0,0,0), R(0,0,0,1), S(1,1,1)
          0, 0, 0,   0, 0, 0, 1,   1, 1, 1,
          // Instance 1: T(5,0,0), R(0,0,√½,√½), S(2,2,2)
          5, 0, 0,   0, 0, sqrt1_2, sqrt1_2,   2, 2, 2,
        ]);

        const stride = 40; // 10 floats * 4 bytes
        const mockBuffer = {
          sizeInBytes: interleavedData.byteLength,
          getBufferData: function (outputArray, srcByteOffset) {
            srcByteOffset = srcByteOffset ?? 0;
            const src = new Uint8Array(
              interleavedData.buffer,
              interleavedData.byteOffset,
              interleavedData.byteLength,
            );
            if (outputArray instanceof Uint8Array) {
              outputArray.set(src);
            } else {
              const view = new DataView(
                src.buffer,
                src.byteOffset,
                src.byteLength,
              );
              for (let i = 0; i < outputArray.length; i++) {
                outputArray[i] = view.getFloat32(srcByteOffset + i * 4, true);
              }
            }
          },
        };

        const modelMatrix = Matrix4.fromTranslation(new Cartesian3(10, 20, 30));
        const primitive = { id: "interleavedTRS" };
        const model = createMockModelForTraversal({
          primitives: [primitive],
          nodeOptions: {
            instances: {
              transformInWorldSpace: false,
              attributes: [
                {
                  semantic: "TRANSLATION",
                  count: 2,
                  componentDatatype: ComponentDatatype.FLOAT,
                  type: AttributeType.VEC3,
                  byteOffset: 0,
                  byteStride: stride,
                  buffer: mockBuffer,
                },
                {
                  semantic: "ROTATION",
                  count: 2,
                  componentDatatype: ComponentDatatype.FLOAT,
                  type: AttributeType.VEC4,
                  byteOffset: 12,
                  byteStride: stride,
                  buffer: mockBuffer,
                },
                {
                  semantic: "SCALE",
                  count: 2,
                  componentDatatype: ComponentDatatype.FLOAT,
                  type: AttributeType.VEC3,
                  byteOffset: 28,
                  byteStride: stride,
                  buffer: mockBuffer,
                },
              ],
            },
          },
          sceneGraphOptions: {
            computedModelMatrix: modelMatrix,
          },
        });
        const callback = jasmine.createSpy("callback");

        ModelReader.forEachPrimitive(model, undefined, callback);

        expect(callback).toHaveBeenCalledTimes(1);
        const instances = callback.calls.argsFor(0)[2];
        expect(instances.length).toBe(2);

        // Instance 0: modelMatrix * identity = modelMatrix
        expect(instances[0].transform).toEqual(modelMatrix);

        // Instance 1: modelMatrix * TRS(translate(5,0,0), rot90Z, scale(2,2,2))
        const expectedRaw = Matrix4.fromTranslationQuaternionRotationScale(
          new Cartesian3(5, 0, 0),
          new Quaternion(0, 0, sqrt1_2, sqrt1_2),
          new Cartesian3(2, 2, 2),
          new Matrix4(),
        );
        const expectedInstance1 = Matrix4.multiplyTransformation(
          modelMatrix,
          expectedRaw,
          new Matrix4(),
        );
        expect(instances[1].transform).toEqualEpsilon(
          expectedInstance1,
          CesiumMath.EPSILON3,
        );
      });

      it("computes world-space instance transforms when transformInWorldSpace is true", function () {
        // When transformInWorldSpace is true, computeNodeTransforms overrides:
        //   modelMatrix = model.modelMatrix * sceneGraph.components.transform
        //   nodeComputedTransform = sceneGraph.axisCorrectionMatrix * runtimeNode.computedTransform
        //   computedModelMatrix = modelMatrix * nodeComputedTransform
        // Then getInstanceTransforms applies:
        //   finalTransform = modelMatrix * (instanceTransform * nodeComputedTransform)
        const twoInstances = new Float32Array([
          // Instance 0: identity
          1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0,
          // Instance 1: translation (5, 0, 0)
          1, 0, 0, 5, 0, 1, 0, 0, 0, 0, 1, 0,
        ]);

        const modelModelMatrix = Matrix4.fromTranslation(
          new Cartesian3(100, 0, 0),
        );
        const componentsTransform = Matrix4.fromTranslation(
          new Cartesian3(0, 200, 0),
        );
        const axisCorrectionMatrix = Matrix4.IDENTITY;
        const nodeComputedTransform = Matrix4.fromTranslation(
          new Cartesian3(0, 0, 50),
        );

        const primitive = { id: "worldSpace" };
        const model = createMockModelForTraversal({
          primitives: [primitive],
          nodeOptions: {
            computedTransform: nodeComputedTransform,
            instances: {
              transformInWorldSpace: true,
              attributes: [
                { count: 2, componentDatatype: ComponentDatatype.FLOAT },
              ],
            },
            transformsTypedArray: twoInstances,
          },
          sceneGraphOptions: {
            // This gets overridden by the world-space path, but must be provided
            computedModelMatrix: Matrix4.IDENTITY,
            componentsTransform: componentsTransform,
            axisCorrectionMatrix: axisCorrectionMatrix,
          },
          modelOptions: {
            modelMatrix: modelModelMatrix,
          },
        });
        const callback = jasmine.createSpy("callback");

        ModelReader.forEachPrimitive(model, undefined, callback);

        expect(callback).toHaveBeenCalledTimes(1);
        const instances = callback.calls.argsFor(0)[2];
        expect(instances.length).toBe(2);

        // modelMatrix = model.modelMatrix * components.transform = translate(100, 200, 0)
        const expectedModelMatrix = Matrix4.multiplyTransformation(
          modelModelMatrix,
          componentsTransform,
          new Matrix4(),
        );
        // nodeComputedTransform = axisCorrectionMatrix * runtimeNode.computedTransform = translate(0, 0, 50)
        const expectedNodeTransform = Matrix4.multiplyTransformation(
          axisCorrectionMatrix,
          nodeComputedTransform,
          new Matrix4(),
        );

        // Instance 0 (identity):
        //   transform = identity * nodeComputedTransform = translate(0, 0, 50)
        //   final = modelMatrix * transform = translate(100, 200, 50)
        const expectedInst0 = Matrix4.multiplyTransformation(
          expectedModelMatrix,
          Matrix4.multiplyTransformation(
            Matrix4.IDENTITY,
            expectedNodeTransform,
            new Matrix4(),
          ),
          new Matrix4(),
        );
        expect(instances[0].transform).toEqual(expectedInst0);

        // Instance 1 (translate(5,0,0)):
        //   transform = translate(5,0,0) * nodeComputedTransform = translate(5, 0, 50)
        //   final = modelMatrix * transform = translate(105, 200, 50)
        const instanceTransform1 = Matrix4.fromTranslation(
          new Cartesian3(5, 0, 0),
        );
        const expectedInst1 = Matrix4.multiplyTransformation(
          expectedModelMatrix,
          Matrix4.multiplyTransformation(
            instanceTransform1,
            expectedNodeTransform,
            new Matrix4(),
          ),
          new Matrix4(),
        );
        expect(instances[1].transform).toEqual(expectedInst1);
      });

      it("applies 2D projection when mapProjection is provided", function () {
        const primitive = { id: "2d" };
        const modelMatrix = Matrix4.fromTranslation(
          new Cartesian3(1000000, 0, 0),
        );
        const model = createMockModelForTraversal({
          primitives: [primitive],
          sceneGraphOptions: {
            computedModelMatrix: modelMatrix,
          },
        });

        const ellipsoid = Ellipsoid.WGS84;
        const projection = new GeographicProjection(ellipsoid);

        const callback = jasmine.createSpy("callback");

        ModelReader.forEachPrimitive(
          model,
          { mapProjection: projection },
          callback,
        );

        expect(callback).toHaveBeenCalledTimes(1);
        const computedModelMatrix = callback.calls.argsFor(0)[3];
        // The 2D-projected matrix should differ from the original
        expect(computedModelMatrix).not.toEqual(modelMatrix);
      });

      it("does not project to 2D when mapProjection is undefined", function () {
        const primitive = { id: "noFrameState" };
        const model = createMockModelForTraversal({
          primitives: [primitive],
        });
        const callback = jasmine.createSpy("callback");

        ModelReader.forEachPrimitive(model, undefined, callback);

        expect(callback).toHaveBeenCalledTimes(1);
        const computedModelMatrix = callback.calls.argsFor(0)[3];
        expect(computedModelMatrix).toEqual(Matrix4.IDENTITY);
      });

      it("skips nodes with no runtimePrimitives", function () {
        const nodeA = createMockRuntimeNode();
        nodeA.runtimePrimitives = [];

        const prim = { id: "only" };
        const nodeB = createMockRuntimeNode();
        nodeB.runtimePrimitives = [{ primitive: prim }];

        const sceneGraph = createMockSceneGraph();
        sceneGraph._runtimeNodes = [nodeA, nodeB];

        const model = createMockModel();
        model.sceneGraph = sceneGraph;

        const callback = jasmine.createSpy("callback");

        ModelReader.forEachPrimitive(model, undefined, callback);

        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback.calls.argsFor(0)[1]).toBe(prim);
      });

      it("provides instance featureIds when node has _FEATURE_ID attribute", function () {
        const featureIdTypedArray = new Float32Array([10, 20]);
        const twoInstances = new Float32Array([
          // Instance 0: identity
          1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0,
          // Instance 1: identity
          1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0,
        ]);
        const featureIdSet = new ModelComponents.FeatureIdAttribute();
        featureIdSet.positionalLabel = "instanceFeatureId_0";
        const primitive = { id: "featureIdInstanced" };
        const model = createMockModelForTraversal({
          primitives: [primitive],
          nodeOptions: {
            instances: {
              transformInWorldSpace: false,
              featureIds: [featureIdSet],
              attributes: [
                {
                  count: 2,
                  componentDatatype: ComponentDatatype.FLOAT,
                },
                {
                  semantic: "_FEATURE_ID",
                  count: 2,
                  componentDatatype: ComponentDatatype.FLOAT,
                  type: AttributeType.SCALAR,
                  typedArray: featureIdTypedArray,
                },
              ],
            },
            transformsTypedArray: twoInstances,
          },
        });
        const callback = jasmine.createSpy("callback");

        ModelReader.forEachPrimitive(
          model,
          { instanceFeatureIdLabel: "instanceFeatureId_0" },
          callback,
        );

        expect(callback).toHaveBeenCalledTimes(1);
        const instances = callback.calls.argsFor(0)[2];
        expect(instances.length).toBe(2);
        expect(instances[0].featureId).toBe(10);
        expect(instances[1].featureId).toBe(20);
      });

      it("does not populate featureId when instanceFeatureIdLabel option is not set", function () {
        const featureIdTypedArray = new Float32Array([10, 20]);
        const twoInstances = new Float32Array([
          1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
          0,
        ]);
        const featureIdSet = new ModelComponents.FeatureIdAttribute();
        featureIdSet.positionalLabel = "instanceFeatureId_0";
        const primitive = { id: "featureIdNotRequested" };
        const model = createMockModelForTraversal({
          primitives: [primitive],
          nodeOptions: {
            instances: {
              transformInWorldSpace: false,
              featureIds: [featureIdSet],
              attributes: [
                {
                  count: 2,
                  componentDatatype: ComponentDatatype.FLOAT,
                },
                {
                  semantic: "_FEATURE_ID",
                  count: 2,
                  componentDatatype: ComponentDatatype.FLOAT,
                  type: AttributeType.SCALAR,
                  typedArray: featureIdTypedArray,
                },
              ],
            },
            transformsTypedArray: twoInstances,
          },
        });
        const callback = jasmine.createSpy("callback");

        ModelReader.forEachPrimitive(model, undefined, callback);

        expect(callback).toHaveBeenCalledTimes(1);
        const instances = callback.calls.argsFor(0)[2];
        expect(instances.length).toBe(2);
        expect(instances[0].featureId).toBeUndefined();
        expect(instances[1].featureId).toBeUndefined();
      });

      it("sets featureId to undefined when node has no _FEATURE_ID attribute", function () {
        const twoInstances = new Float32Array([
          1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
          0,
        ]);
        const primitive = { id: "noFeatureId" };
        const model = createMockModelForTraversal({
          primitives: [primitive],
          nodeOptions: {
            instances: {
              transformInWorldSpace: false,
              featureIds: [],
              attributes: [
                {
                  count: 2,
                  componentDatatype: ComponentDatatype.FLOAT,
                },
              ],
            },
            transformsTypedArray: twoInstances,
          },
        });
        const callback = jasmine.createSpy("callback");

        ModelReader.forEachPrimitive(
          model,
          { instanceFeatureIdLabel: "instanceFeatureId_0" },
          callback,
        );

        const instances = callback.calls.argsFor(0)[2];
        expect(instances.length).toBe(2);
        expect(instances[0].featureId).toBeUndefined();
        expect(instances[1].featureId).toBeUndefined();
      });

      it("sets featureId to undefined for non-instanced nodes", function () {
        const primitive = { id: "nonInstanced" };
        const model = createMockModelForTraversal({
          primitives: [primitive],
        });
        const callback = jasmine.createSpy("callback");

        ModelReader.forEachPrimitive(
          model,
          { instanceFeatureIdLabel: "instanceFeatureId_0" },
          callback,
        );

        const instances = callback.calls.argsFor(0)[2];
        expect(instances.length).toBe(1);
        expect(instances[0].featureId).toBeUndefined();
      });

      it("provides instance featureIds from FeatureIdAttribute with VEC3 translation attributes", function () {
        const featureIdTypedArray = new Float32Array([42, 99, 7]);
        const translationTypedArray = new Float32Array([
          0, 0, 0, 1, 0, 0, 0, 1, 0,
        ]);
        const featureIdSet = new ModelComponents.FeatureIdAttribute();
        featureIdSet.positionalLabel = "instanceFeatureId_0";
        const primitive = { id: "vec3WithFeatureIds" };
        const model = createMockModelForTraversal({
          primitives: [primitive],
          nodeOptions: {
            instances: {
              transformInWorldSpace: false,
              featureIds: [featureIdSet],
              attributes: [
                {
                  semantic: "TRANSLATION",
                  count: 3,
                  componentDatatype: ComponentDatatype.FLOAT,
                  type: AttributeType.VEC3,
                  typedArray: translationTypedArray,
                },
                {
                  semantic: "_FEATURE_ID",
                  count: 3,
                  componentDatatype: ComponentDatatype.FLOAT,
                  type: AttributeType.SCALAR,
                  typedArray: featureIdTypedArray,
                },
              ],
            },
          },
        });
        const callback = jasmine.createSpy("callback");

        ModelReader.forEachPrimitive(
          model,
          { instanceFeatureIdLabel: "instanceFeatureId_0" },
          callback,
        );

        expect(callback).toHaveBeenCalledTimes(1);
        const instances = callback.calls.argsFor(0)[2];
        expect(instances.length).toBe(3);
        expect(instances[0].featureId).toBe(42);
        expect(instances[1].featureId).toBe(99);
        expect(instances[2].featureId).toBe(7);
        // Also verify transforms are still present
        expect(instances[0].transform).toBeDefined();
        expect(instances[1].transform).toBeDefined();
        expect(instances[2].transform).toBeDefined();
      });

      it("provides instance featureIds from FeatureIdImplicitRange with repeat", function () {
        const twoInstances = new Float32Array([
          // Instance 0: identity
          1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0,
          // Instance 1: identity
          1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0,
          // Instance 2: identity
          1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0,
          // Instance 3: identity
          1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0,
        ]);
        const featureIdSet = new ModelComponents.FeatureIdImplicitRange();
        featureIdSet.offset = 5;
        featureIdSet.repeat = 2;
        featureIdSet.positionalLabel = "instanceFeatureId_0";
        const primitive = { id: "implicitRangeInstanced" };
        const model = createMockModelForTraversal({
          primitives: [primitive],
          nodeOptions: {
            instances: {
              transformInWorldSpace: false,
              featureIds: [featureIdSet],
              attributes: [
                {
                  count: 4,
                  componentDatatype: ComponentDatatype.FLOAT,
                },
              ],
            },
            transformsTypedArray: twoInstances,
          },
        });
        const callback = jasmine.createSpy("callback");

        ModelReader.forEachPrimitive(
          model,
          { instanceFeatureIdLabel: "instanceFeatureId_0" },
          callback,
        );

        expect(callback).toHaveBeenCalledTimes(1);
        const instances = callback.calls.argsFor(0)[2];
        expect(instances.length).toBe(4);
        // offset + floor(i / repeat) = 5 + floor(i / 2)
        expect(instances[0].featureId).toBe(5);
        expect(instances[1].featureId).toBe(5);
        expect(instances[2].featureId).toBe(6);
        expect(instances[3].featureId).toBe(6);
      });

      it("provides instance featureIds from FeatureIdImplicitRange without repeat", function () {
        const twoInstances = new Float32Array([
          // Instance 0: identity
          1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0,
          // Instance 1: identity
          1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0,
          // Instance 2: identity
          1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0,
        ]);
        const featureIdSet = new ModelComponents.FeatureIdImplicitRange();
        featureIdSet.offset = 7;
        featureIdSet.repeat = undefined;
        featureIdSet.positionalLabel = "instanceFeatureId_0";
        const primitive = { id: "implicitRangeNoRepeat" };
        const model = createMockModelForTraversal({
          primitives: [primitive],
          nodeOptions: {
            instances: {
              transformInWorldSpace: false,
              featureIds: [featureIdSet],
              attributes: [
                {
                  count: 3,
                  componentDatatype: ComponentDatatype.FLOAT,
                },
              ],
            },
            transformsTypedArray: twoInstances,
          },
        });
        const callback = jasmine.createSpy("callback");

        ModelReader.forEachPrimitive(
          model,
          { instanceFeatureIdLabel: "instanceFeatureId_0" },
          callback,
        );

        expect(callback).toHaveBeenCalledTimes(1);
        const instances = callback.calls.argsFor(0)[2];
        expect(instances.length).toBe(3);
        // All instances get the same featureId (offset) when repeat is undefined
        expect(instances[0].featureId).toBe(7);
        expect(instances[1].featureId).toBe(7);
        expect(instances[2].featureId).toBe(7);
      });
    });
  },
  "WebGL",
);
