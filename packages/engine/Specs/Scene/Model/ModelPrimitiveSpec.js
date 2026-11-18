import {
  AttributeType,
  Cartesian3,
  ComponentDatatype,
  Matrix4,
} from "@cesium/core";
import {
  Buffer,
  BufferUsage,
  Deformable,
  GeometryAttributeDescriptor,
  GeometryAttributeDomain,
  ModelDeformerPipelineStage,
  ResourceCache,
  UniformType,
  VertexAttributeSemantic,
} from "../../../index.js";
import createScene from "../../../../../Specs/createScene.js";
import loadAndZoomToModelAsync from "./loadAndZoomToModelAsync.js";

describe(
  "Scene/Model/ModelPrimitive",
  function () {
    const modelsUrl = "./Data/Models/glTF-2.0";
    const unitSquareUrl = `${modelsUrl}/unitSquare`;
    const boxTexturedWithPropertyAttributesUrl = `${modelsUrl}/BoxTexturedWithPropertyAttributes/glTF/BoxTexturedWithPropertyAttributes.gltf`;
    const boxWithTangentsDracoUrl = `${modelsUrl}/BoxWithTangents/glTF-Draco/BoxWithTangents.gltf`;
    const boxWithLinesUrl = `${modelsUrl}/BoxWithLines/glTF-Draco/BoxWithLines.gltf`;
    const pointCloudWithRgbColorsUrl = `${modelsUrl}/PointCloudWithRGBColors/glTF-Binary/PointCloudWithRGBColors.glb`;
    const triangleWithoutIndicesUrl = `${modelsUrl}/TriangleWithoutIndices/glTF/TriangleWithoutIndices.gltf`;
    const simpleSkinUrl = `${modelsUrl}/SimpleSkin/glTF/SimpleSkin.gltf`;
    const simpleMorphUrl = `${modelsUrl}/SimpleMorph/glTF/SimpleMorph.gltf`;

    const position = new GeometryAttributeDescriptor({
      semantic: VertexAttributeSemantic.POSITION,
    });
    const normal = new GeometryAttributeDescriptor({
      semantic: VertexAttributeSemantic.NORMAL,
    });
    const texCoord = new GeometryAttributeDescriptor({
      semantic: VertexAttributeSemantic.TEXCOORD,
    });
    const color = new GeometryAttributeDescriptor({
      semantic: VertexAttributeSemantic.COLOR,
    });

    const webglStub = !!window.webglStub;
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

    async function loadPrimitives(url, options) {
      const model = await loadAndZoomToModelAsync(
        { gltf: url, ...options },
        scene,
      );
      return model.nodes.flatMap((node) => node.primitives);
    }

    // Loads a primitive whose positions have a CPU copy, which models keep
    // for projecting to 2D.
    async function loadPrimitiveWithCpuPositions(url) {
      const [primitive] = await loadPrimitives(url, { projectTo2D: true });
      const attribute = primitive._runtimePrimitive.primitive.attributes.find(
        (attribute) => attribute.semantic === VertexAttributeSemantic.POSITION,
      );
      expect(attribute.typedArray).toBeDefined();
      return { primitive, attribute };
    }

    // Reads float positions directly from the GPU buffer.
    function readGpuPositions(attribute) {
      const bytes = new Uint8Array(attribute.buffer.sizeInBytes);
      attribute.buffer.getBufferData(bytes);
      const floats = new Float32Array(bytes.buffer, attribute.byteOffset);
      const stride = (attribute.byteStride ?? 12) / 4;
      const result = new Float64Array(attribute.count * 3);
      for (let i = 0; i < attribute.count; ++i) {
        for (let c = 0; c < 3; ++c) {
          result[i * 3 + c] = floats[i * stride + c];
        }
      }
      return result;
    }

    // Reads the given attributes of every vertex into flat arrays, and every
    // primitive's vertex indices.
    function readGeometry(primitive, descriptors) {
      return primitive.geometryReader.withReadSession(
        { attributes: descriptors, primitives: true },
        function (session) {
          const vertexCount = session.vertexCount();
          const values = descriptors.map(function (descriptor) {
            const read = session.vertexAttributeReader(descriptor);
            const componentCount = descriptor.componentCount;
            const result = new Float64Array(vertexCount * componentCount);
            for (let i = 0; i < vertexCount; ++i) {
              read(i, result, i * componentCount);
            }
            return result;
          });

          const readPrimitive = session.primitiveReader();
          const primitives = [];
          for (let i = 0; i < session.primitiveCount(); ++i) {
            const vertices = new Array(session.primitiveVertexCount(i));
            primitives.push(readPrimitive(i, vertices));
          }
          return { vertexCount, values, primitives };
        },
      );
    }

    function readValues(primitive, descriptor) {
      return readGeometry(primitive, [descriptor]).values[0];
    }

    // Writes every vertex's value of an attribute from a flat array.
    function writeValues(primitive, descriptor, values) {
      primitive.geometryWriter.withWriteSession(
        { attributes: [descriptor] },
        function (session) {
          const write = session.vertexAttributeWriter(descriptor);
          const componentCount = descriptor.componentCount;
          for (let i = 0; i < session.vertexCount(); ++i) {
            write(i, values, i * componentCount);
          }
        },
      );
    }

    // Reverses the order of the vertices in a flat array of their values.
    function reverseVertices(values, componentCount) {
      const vertexCount = values.length / componentCount;
      const result = new Float64Array(values.length);
      for (let i = 0; i < vertexCount; ++i) {
        const source = (vertexCount - 1 - i) * componentCount;
        for (let c = 0; c < componentCount; ++c) {
          result[i * componentCount + c] = values[source + c];
        }
      }
      return result;
    }

    function getPosition(positions, index, result) {
      return Cartesian3.unpack(positions, index * 3, result);
    }

    function computeFaceNormal(positions, triangle) {
      const a = getPosition(positions, triangle[0], new Cartesian3());
      const b = getPosition(positions, triangle[1], new Cartesian3());
      const c = getPosition(positions, triangle[2], new Cartesian3());
      const ab = Cartesian3.subtract(b, a, new Cartesian3());
      const ac = Cartesian3.subtract(c, a, new Cartesian3());
      const faceNormal = Cartesian3.cross(ab, ac, new Cartesian3());
      return Cartesian3.normalize(faceNormal, faceNormal);
    }

    // Describes each triangle by its vertices' positions (in the node's
    // space) and texture coordinates, independent of vertex order and
    // which vertex the triangle starts at.
    function describeTriangles(geometry, matrix) {
      const [positions, texCoords] = geometry.values;
      const describeVertex = function (index) {
        const p = Matrix4.multiplyByPoint(
          matrix,
          getPosition(positions, index, new Cartesian3()),
          new Cartesian3(),
        );
        const t = [texCoords[index * 2], texCoords[index * 2 + 1]];
        return [p.x, p.y, p.z, ...t].map((v) => v.toFixed(3)).join(",");
      };

      return geometry.primitives
        .map(function (triangle) {
          const vertices = triangle.map(describeVertex);
          const first = vertices.indexOf([...vertices].sort()[0]);
          const rotated = [
            ...vertices.slice(first),
            ...vertices.slice(0, first),
          ];
          return rotated.join(" | ");
        })
        .sort();
    }

    it("lists the primitive's attributes", async function () {
      const [primitive] = await loadPrimitives(
        boxTexturedWithPropertyAttributesUrl,
      );
      const reader = primitive.geometryReader;
      expect(reader).toBe(primitive.geometryReader);

      const attributes = reader.getAvailableAttributes();
      expect(attributes.length).toBe(5);
      expect(reader.hasAttribute(position)).toBe(true);
      expect(reader.hasAttribute(normal)).toBe(true);
      expect(reader.hasAttribute(texCoord)).toBe(true);
      expect(reader.hasAttribute(color)).toBe(false);

      const temperatures = attributes.find(
        (attribute) => attribute.semantic === "_TEMPERATURES",
      );
      expect(temperatures.setIndex).toBeUndefined();
      expect(temperatures.type).toBe(AttributeType.VEC2);

      const warpMatrix = attributes.find(
        (attribute) => attribute.semantic === "_WARP_MATRIX",
      );
      expect(warpMatrix.type).toBe(AttributeType.MAT2);
    });

    it("reads non-indexed triangles", async function () {
      if (webglStub) {
        return;
      }
      const [primitive] = await loadPrimitives(triangleWithoutIndicesUrl);
      const geometry = readGeometry(primitive, [position]);

      expect(geometry.vertexCount).toBe(3);
      expect(geometry.primitives).toEqual([[0, 1, 2]]);
      expect(Array.from(geometry.values[0])).toEqual([
        0, 0, 0, 1, 0, 0, 0, 1, 0,
      ]);
    });

    it("reads the same geometry from interleaved, quantized, and compressed models", async function () {
      if (webglStub) {
        return;
      }

      const readTriangles = async function (name) {
        const [primitive] = await loadPrimitives(`${unitSquareUrl}/${name}`);
        const geometry = readGeometry(primitive, [position, texCoord]);
        return describeTriangles(geometry, primitive.node.matrix);
      };

      const expected = await readTriangles("unitSquare11x11_plain.glb");
      expect(expected.length).toBe(200);

      const names = [
        "unitSquare11x11_plain_interleaved.glb",
        "unitSquare11x11_quantized.glb",
        "unitSquare11x11_quantized_interleaved.glb",
        "unitSquare11x11_unsignedShortTexCoords.glb",
        "unitSquare11x11_unsignedShortTexCoords_interleaved.glb",
        "unitSquare11x11_unsignedShortTexCoords_quantized.glb",
        "unitSquare11x11_unsignedShortTexCoords_quantized_interleaved.glb",
        "unitSquare11x11_draco.glb",
        "unitSquare11x11_meshopt.glb",
      ];
      for (const name of names) {
        const actual = await readTriangles(name);
        expect(actual).withContext(name).toEqual(expected);
      }
    });

    it("decodes oct-encoded normals", async function () {
      if (webglStub) {
        return;
      }
      const [primitive] = await loadPrimitives(boxWithTangentsDracoUrl);
      const geometry = readGeometry(primitive, [position, normal]);
      const [positions, normals] = geometry.values;

      expect(geometry.primitives.length).toBe(12);
      for (const triangle of geometry.primitives) {
        const faceNormal = computeFaceNormal(positions, triangle);
        for (const vertex of triangle) {
          const vertexNormal = Cartesian3.unpack(normals, vertex * 3);
          expect(Cartesian3.dot(vertexNormal, faceNormal)).toBeGreaterThan(
            0.99,
          );
        }
      }
    });

    it("reads triangle strips and fans with a consistent winding", async function () {
      if (webglStub) {
        return;
      }

      const files = [
        ["unitSquare11x2_triangleStrip.glb", 20],
        ["unitSquare5_triangleFan.glb", 4],
      ];
      for (const [name, triangleCount] of files) {
        const [primitive] = await loadPrimitives(`${unitSquareUrl}/${name}`);
        const geometry = readGeometry(primitive, [position, normal]);
        const [positions, normals] = geometry.values;

        expect(geometry.primitives.length)
          .withContext(name)
          .toBe(triangleCount);
        for (const triangle of geometry.primitives) {
          const faceNormal = computeFaceNormal(positions, triangle);
          const vertexNormal = Cartesian3.unpack(normals, triangle[0] * 3);
          expect(Cartesian3.dot(vertexNormal, faceNormal))
            .withContext(name)
            .toBeGreaterThan(0.99);
        }
      }
    });

    it("counts the corners of every primitive", async function () {
      const files = [
        // Strips and fans share vertices between triangles, so they have
        // more corners than indices.
        ["unitSquare11x2_triangleStrip.glb", 20 * 3],
        ["unitSquare5_triangleFan.glb", 4 * 3],
        ["unitSquare11x11_plain.glb", 200 * 3],
      ];
      for (const [name, cornerCount] of files) {
        const [primitive] = await loadPrimitives(`${unitSquareUrl}/${name}`);
        primitive.geometryReader.withReadSession({}, function (session) {
          expect(session.cornerCount()).withContext(name).toBe(cornerCount);
        });
      }
    });

    it("reads lines", async function () {
      if (webglStub) {
        return;
      }
      const primitives = await loadPrimitives(boxWithLinesUrl);
      const lines = primitives.find(function (primitive) {
        return primitive.geometryReader.withReadSession({}, function (session) {
          return session.primitiveVertexCount(0) === 2;
        });
      });

      const geometry = readGeometry(lines, [position]);
      expect(geometry.vertexCount).toBe(4);
      expect(geometry.primitives.length).toBe(4);
      for (const line of geometry.primitives) {
        expect(line.length).toBe(2);
        expect(line[0]).toBeLessThan(4);
        expect(line[1]).toBeLessThan(4);
      }
    });

    it("reads points, and RGB colors with an alpha of 1", async function () {
      if (webglStub) {
        return;
      }
      const [primitive] = await loadPrimitives(pointCloudWithRgbColorsUrl);
      const geometry = readGeometry(primitive, [color]);
      const [colors] = geometry.values;

      expect(geometry.vertexCount).toBe(2500);
      expect(geometry.primitives.length).toBe(2500);
      expect(geometry.primitives[7]).toEqual([7]);
      expect(colors[0]).toEqual(0);
      expect(colors[1]).toEqual(0);
      expect(colors[2]).toEqual(1);
      expect(colors[3]).toEqual(1);
      expect(colors[4]).toEqualEpsilon(0.0204081628, 1e-7);
      expect(colors[7]).toEqual(1);
    });

    it("reads custom attributes", async function () {
      if (webglStub) {
        return;
      }
      const [primitive] = await loadPrimitives(
        boxTexturedWithPropertyAttributesUrl,
      );
      const attributes = primitive.geometryReader.getAvailableAttributes();
      const temperatures = attributes.find(
        (attribute) => attribute.semantic === "_TEMPERATURES",
      );
      const warpMatrix = attributes.find(
        (attribute) => attribute.semantic === "_WARP_MATRIX",
      );

      const geometry = readGeometry(primitive, [temperatures, warpMatrix]);
      const [temperatureValues, warpMatrixValues] = geometry.values;

      expect(temperatureValues[0]).toEqualEpsilon(21373 / 65535, 1e-7);
      expect(temperatureValues[1]).toEqualEpsilon(613 / 65535, 1e-7);
      expect(Array.from(warpMatrixValues.subarray(0, 8))).toEqual([
        0.25, 0, 0, 0, 0, 0.25, 0, 0,
      ]);
    });

    it("writes into result arrays at an offset", async function () {
      if (webglStub) {
        return;
      }
      const [primitive] = await loadPrimitives(triangleWithoutIndicesUrl);
      const options = { attributes: [position], primitives: true };
      primitive.geometryReader.withReadSession(options, function (session) {
        const positionResult = [7, 7, 7, 7, 7];
        const returned = session.vertexAttributeReader(position)(
          1,
          positionResult,
          1,
        );
        expect(returned).toBe(positionResult);
        expect(positionResult).toEqual([7, 1, 0, 0, 7]);

        const primitiveResult = new Uint32Array(5);
        session.primitiveReader()(0, primitiveResult, 2);
        expect(Array.from(primitiveResult)).toEqual([0, 0, 0, 1, 2]);

        const cornerResult = [7, 7, 7, 7, 7];
        const cornerReturned = session.cornerAttributeReader(position)(
          0,
          1,
          cornerResult,
          1,
        );
        expect(cornerReturned).toBe(cornerResult);
        expect(cornerResult).toEqual([7, 1, 0, 0, 7]);
      });
    });

    it("reports the datatype of each attribute's values, per vertex", async function () {
      if (webglStub) {
        return;
      }
      const getAttribute = async function (url, semantic) {
        const [primitive] = await loadPrimitives(url);
        return primitive.geometryReader
          .getAvailableAttributes()
          .find((attribute) => attribute.semantic === semantic);
      };

      const cases = [
        // Float
        [boxTexturedWithPropertyAttributesUrl, "POSITION", "FLOAT"],
        // Normalized
        [boxTexturedWithPropertyAttributesUrl, "_TEMPERATURES", "FLOAT"],
        // Quantized
        [`${unitSquareUrl}/unitSquare11x11_draco.glb`, "POSITION", "FLOAT"],
        // Integer
        [simpleSkinUrl, "JOINTS", "UNSIGNED_SHORT"],
      ];
      for (const [url, semantic, datatype] of cases) {
        const attribute = await getAttribute(url, semantic);
        expect(attribute.componentDatatype)
          .withContext(semantic)
          .toBe(ComponentDatatype[datatype]);
        expect(attribute.domain)
          .withContext(semantic)
          .toBe(GeometryAttributeDomain.VERTEX);
      }
    });

    it("reads corners as their vertices", async function () {
      if (webglStub) {
        return;
      }
      const [primitive] = await loadPrimitives(
        `${unitSquareUrl}/unitSquare11x2_triangleStrip.glb`,
      );
      const options = { attributes: [position], primitives: true };
      primitive.geometryReader.withReadSession(options, function (session) {
        const readVertex = session.vertexAttributeReader(position);
        const readCorner = session.cornerAttributeReader(position);
        const readPrimitive = session.primitiveReader();

        for (let p = 0; p < session.primitiveCount(); ++p) {
          const vertices = readPrimitive(p, []);
          for (let c = 0; c < vertices.length; ++c) {
            expect(readCorner(p, c, []))
              .withContext(`primitive ${p}, corner ${c}`)
              .toEqual(readVertex(vertices[c], []));
          }
        }
      });
    });

    it("writes plain and interleaved attributes", async function () {
      if (webglStub) {
        return;
      }

      const names = [
        "unitSquare11x11_plain.glb",
        "unitSquare11x11_plain_interleaved.glb",
      ];
      for (const name of names) {
        const [primitive] = await loadPrimitives(`${unitSquareUrl}/${name}`);
        expect(primitive.geometryWriter).toBe(primitive.geometryWriter);

        const positions = readValues(primitive, position);
        const texCoords = readValues(primitive, texCoord);
        const reversedPositions = reverseVertices(positions, 3);
        const reversedTexCoords = reverseVertices(texCoords, 2);

        // Writing one attribute leaves the others, which may be interleaved with it, unchanged.
        writeValues(primitive, position, reversedPositions);
        expect(readValues(primitive, position))
          .withContext(name)
          .toEqualEpsilon(reversedPositions, 1e-6);
        expect(readValues(primitive, texCoord))
          .withContext(name)
          .toEqual(texCoords);

        writeValues(primitive, texCoord, reversedTexCoords);
        expect(readValues(primitive, texCoord))
          .withContext(name)
          .toEqualEpsilon(reversedTexCoords, 1e-6);
        expect(readValues(primitive, position))
          .withContext(name)
          .toEqualEpsilon(reversedPositions, 1e-6);
      }
    });

    it("writes raw integers", async function () {
      if (webglStub) {
        return;
      }
      const [primitive] = await loadPrimitives(simpleSkinUrl);
      const joints = primitive.geometryReader
        .getAvailableAttributes()
        .find((attribute) => attribute.semantic === "JOINTS");
      const values = readValues(primitive, joints).map((j) => j + 1);

      writeValues(primitive, joints, values);
      expect(readValues(primitive, joints)).toEqual(values);
    });

    it("can only write attributes stored without an encoding", async function () {
      const temperatures = new GeometryAttributeDescriptor({
        semantic: "_TEMPERATURES",
        type: AttributeType.VEC2,
      });
      const cases = [
        [`${unitSquareUrl}/unitSquare11x11_plain.glb`, position, true],
        // KHR_mesh_quantization, normalized
        [`${unitSquareUrl}/unitSquare11x11_quantized.glb`, position, false],
        // Draco, quantized
        [`${unitSquareUrl}/unitSquare11x11_draco.glb`, position, false],
        // Draco, oct-encoded
        [boxWithTangentsDracoUrl, normal, false],
        // Normalized
        [boxTexturedWithPropertyAttributesUrl, temperatures, false],
      ];
      for (const [url, descriptor, writable] of cases) {
        const [primitive] = await loadPrimitives(url);
        expect(primitive.geometryReader.hasAttribute(descriptor))
          .withContext(url)
          .toBe(true);
        expect(primitive.geometryWriter.hasAttribute(descriptor))
          .withContext(url)
          .toBe(writable);
      }
    });

    it("throws when writing an attribute stored with an encoding", async function () {
      const [primitive] = await loadPrimitives(
        `${unitSquareUrl}/unitSquare11x11_draco.glb`,
      );
      expect(function () {
        primitive.geometryWriter.withWriteSession(
          { attributes: [position] },
          function () {},
        );
      }).toThrowDeveloperError();
    });

    it("reads its own writes before they're applied", async function () {
      if (webglStub) {
        return;
      }
      const [primitive] = await loadPrimitives(triangleWithoutIndicesUrl);
      primitive.geometryWriter.withWriteSession(
        { attributes: [position] },
        function (session) {
          session.vertexAttributeWriter(position)(0, [5, 6, 7]);
          expect(session.vertexAttributeReader(position)(0, [])).toEqual([
            5, 6, 7,
          ]);
        },
      );
    });

    it("doesn't apply writes if the callback throws", async function () {
      if (webglStub) {
        return;
      }
      const [primitive] = await loadPrimitives(triangleWithoutIndicesUrl);
      expect(function () {
        primitive.geometryWriter.withWriteSession(
          { attributes: [position] },
          function (session) {
            session.vertexAttributeWriter(position)(0, [5, 6, 7]);
            throw new Error("Callback failed.");
          },
        );
      }).toThrowError("Callback failed.");

      expect(Array.from(readValues(primitive, position))).toEqual([
        0, 0, 0, 1, 0, 0, 0, 1, 0,
      ]);
    });

    it("writes attributes with a CPU copy, keeping it up to date", async function () {
      if (webglStub) {
        return;
      }

      const names = [
        "unitSquare11x11_plain.glb",
        "unitSquare11x11_plain_interleaved.glb",
      ];
      for (const name of names) {
        const { primitive, attribute } = await loadPrimitiveWithCpuPositions(
          `${unitSquareUrl}/${name}`,
        );
        const texCoords = readValues(primitive, texCoord);
        const reversed = reverseVertices(readValues(primitive, position), 3);

        writeValues(primitive, position, reversed);
        // Read sessions read positions from the CPU copy.
        expect(readValues(primitive, position))
          .withContext(name)
          .toEqual(reversed);
        expect(readGpuPositions(attribute)).withContext(name).toEqual(reversed);
        expect(readValues(primitive, texCoord))
          .withContext(name)
          .toEqual(texCoords);
      }
    });

    it("writes attributes with a CPU copy together with others in the same buffer", async function () {
      if (webglStub) {
        return;
      }
      const { primitive, attribute } = await loadPrimitiveWithCpuPositions(
        `${unitSquareUrl}/unitSquare11x11_plain.glb`,
      );

      // Both buffers hold the same bufferView, but models load attributes
      // with and without CPU copies into separate buffers. Sharing one
      // stages the positions with the texture coordinates, which have no CPU copy.
      const texCoordAttribute =
        primitive._runtimePrimitive.primitive.attributes.find(
          (a) => a.semantic === VertexAttributeSemantic.TEXCOORD,
        );
      const texCoordBuffer = texCoordAttribute.buffer;
      texCoordAttribute.buffer = attribute.buffer;

      const reversedPositions = reverseVertices(
        readValues(primitive, position),
        3,
      );
      const reversedTexCoords = reverseVertices(
        readValues(primitive, texCoord),
        2,
      );

      primitive.geometryWriter.withWriteSession(
        { attributes: [position, texCoord] },
        function (session) {
          const writePosition = session.vertexAttributeWriter(position);
          const writeTexCoord = session.vertexAttributeWriter(texCoord);
          for (let i = 0; i < session.vertexCount(); ++i) {
            writePosition(i, reversedPositions, i * 3);
            writeTexCoord(i, reversedTexCoords, i * 2);
          }
        },
      );

      expect(readValues(primitive, position)).toEqual(reversedPositions);
      expect(readGpuPositions(attribute)).toEqual(reversedPositions);
      expect(readValues(primitive, texCoord)).toEqualEpsilon(
        reversedTexCoords,
        1e-6,
      );

      texCoordAttribute.buffer = texCoordBuffer;
    });

    it("writes attributes that only have a CPU copy", async function () {
      if (webglStub) {
        return;
      }
      const { primitive, attribute } = await loadPrimitiveWithCpuPositions(
        `${unitSquareUrl}/unitSquare11x11_plain.glb`,
      );
      const buffer = attribute.buffer;
      attribute.buffer = undefined;

      const reversed = reverseVertices(readValues(primitive, position), 3);
      writeValues(primitive, position, reversed);
      expect(readValues(primitive, position)).toEqual(reversed);

      attribute.buffer = buffer;
    });

    it("doesn't change the CPU copy if the callback throws", async function () {
      if (webglStub) {
        return;
      }
      const { primitive, attribute } = await loadPrimitiveWithCpuPositions(
        `${unitSquareUrl}/unitSquare11x11_plain.glb`,
      );
      const cpuCopy = attribute.typedArray;
      const positions = Array.from(cpuCopy);

      expect(function () {
        primitive.geometryWriter.withWriteSession(
          { attributes: [position] },
          function (session) {
            session.vertexAttributeWriter(position)(0, [5, 6, 7]);
            throw new Error("Callback failed.");
          },
        );
      }).toThrowError("Callback failed.");

      expect(attribute.typedArray).toBe(cpuCopy);
      expect(Array.from(cpuCopy)).toEqual(positions);
    });

    it("writes corners as their vertices", async function () {
      if (webglStub) {
        return;
      }
      const [primitive] = await loadPrimitives(
        `${unitSquareUrl}/unitSquare11x2_triangleStrip.glb`,
      );
      const options = { attributes: [position], primitives: true };
      primitive.geometryWriter.withWriteSession(options, function (session) {
        const writeCorner = session.cornerAttributeWriter(position);
        const readVertex = session.vertexAttributeReader(position);
        const vertices = session.primitiveReader()(1, []);

        for (let c = 0; c < vertices.length; ++c) {
          writeCorner(1, c, [c, c, c]);
          expect(readVertex(vertices[c], [])).toEqual([c, c, c]);
        }
      });
    });

    it("updates the bounds of written positions and the model", async function () {
      if (webglStub) {
        return;
      }
      const [primitive] = await loadPrimitives(
        `${unitSquareUrl}/unitSquare11x11_plain.glb`,
      );
      const model = primitive._model;
      const attribute = primitive._runtimePrimitive.primitive.attributes.find(
        (a) => a.semantic === VertexAttributeSemantic.POSITION,
      );
      const radius = model.boundingSphere.radius;

      const scaled = readValues(primitive, position).map((p) => p * 3 - 1);
      writeValues(primitive, position, scaled);

      expect(attribute.min).toEqualEpsilon(new Cartesian3(-1, -1, -1), 1e-6);
      expect(attribute.max).toEqualEpsilon(new Cartesian3(2, 2, -1), 1e-6);

      scene.renderForSpecs();
      expect(model.boundingSphere.radius).toBeGreaterThan(radius * 2);
    });

    it("doesn't reset the model's draw commands if the callback throws", async function () {
      if (webglStub) {
        return;
      }
      const [primitive] = await loadPrimitives(triangleWithoutIndicesUrl);
      spyOn(primitive._model, "resetDrawCommands");

      expect(function () {
        primitive.geometryWriter.withWriteSession(
          { attributes: [position] },
          function (session) {
            session.vertexAttributeWriter(position)(0, [5, 6, 7]);
            throw new Error("Callback failed.");
          },
        );
      }).toThrowError("Callback failed.");
      expect(primitive._model.resetDrawCommands).not.toHaveBeenCalled();

      writeValues(primitive, position, [0, 0, 0, 1, 0, 0, 0, 1, 0]);
      expect(primitive._model.resetDrawCommands).toHaveBeenCalledTimes(1);
    });

    it("throws when reading corners without primitives", async function () {
      const [primitive] = await loadPrimitives(triangleWithoutIndicesUrl);
      const options = { attributes: [position] };
      primitive.geometryReader.withReadSession(options, function (session) {
        expect(function () {
          session.cornerAttributeReader(position);
        }).toThrowDeveloperError();
      });
    });

    it("throws when reading corners of an attribute that wasn't requested", async function () {
      const [primitive] = await loadPrimitives(triangleWithoutIndicesUrl);
      const options = { primitives: true };
      primitive.geometryReader.withReadSession(options, function (session) {
        expect(function () {
          session.cornerAttributeReader(position);
        }).toThrowDeveloperError();
      });
    });

    it("throws when reading an attribute that wasn't requested", async function () {
      const [primitive] = await loadPrimitives(triangleWithoutIndicesUrl);
      primitive.geometryReader.withReadSession({}, function (session) {
        expect(function () {
          session.vertexAttributeReader(position);
        }).toThrowDeveloperError();
      });
    });

    it("throws when reading primitives that weren't requested", async function () {
      const [primitive] = await loadPrimitives(triangleWithoutIndicesUrl);
      primitive.geometryReader.withReadSession({}, function (session) {
        expect(session.primitiveCount()).toBe(1);
        expect(session.primitiveVertexCount(0)).toBe(3);
        expect(function () {
          session.primitiveReader();
        }).toThrowDeveloperError();
      });
    });

    it("throws when reading after the session ends", async function () {
      if (webglStub) {
        return;
      }
      const [primitive] = await loadPrimitives(triangleWithoutIndicesUrl);
      let session;
      const options = { attributes: [position], primitives: true };
      primitive.geometryReader.withReadSession(options, function (s) {
        session = s;
      });

      expect(function () {
        session.primitiveReader();
      }).toThrowDeveloperError();
      expect(function () {
        session.vertexAttributeReader(position);
      }).toThrowDeveloperError();
      expect(function () {
        session.cornerAttributeReader(position);
      }).toThrowDeveloperError();
    });

    it("throws when writing an attribute that wasn't requested", async function () {
      const [primitive] = await loadPrimitives(triangleWithoutIndicesUrl);
      primitive.geometryWriter.withWriteSession({}, function (session) {
        expect(function () {
          session.vertexAttributeWriter(position);
        }).toThrowDeveloperError();
      });
    });

    it("throws when writing in a read session", async function () {
      if (webglStub) {
        return;
      }
      const [primitive] = await loadPrimitives(triangleWithoutIndicesUrl);
      const options = { attributes: [position] };
      primitive.geometryReader.withReadSession(options, function (session) {
        expect(function () {
          session.vertexAttributeWriter(position);
        }).toThrowDeveloperError();
      });
    });

    it("throws when writing corners without primitives", async function () {
      if (webglStub) {
        return;
      }
      const [primitive] = await loadPrimitives(triangleWithoutIndicesUrl);
      const options = { attributes: [position] };
      primitive.geometryWriter.withWriteSession(options, function (session) {
        expect(function () {
          session.cornerAttributeWriter(position);
        }).toThrowDeveloperError();
      });
    });

    it("throws when writing after the session ends", async function () {
      if (webglStub) {
        return;
      }
      const [primitive] = await loadPrimitives(triangleWithoutIndicesUrl);
      let session;
      const options = { attributes: [position], primitives: true };
      primitive.geometryWriter.withWriteSession(options, function (s) {
        session = s;
      });

      expect(function () {
        session.vertexAttributeWriter(position);
      }).toThrowDeveloperError();
      expect(function () {
        session.cornerAttributeWriter(position);
      }).toThrowDeveloperError();
    });

    describe("deformer bindings", function () {
      const unitSquarePlainUrl = `${unitSquareUrl}/unitSquare11x11_plain.glb`;

      function createBinding(offset) {
        return {
          vertexAttributes: [],
          vertexBuffer: undefined,
          uniforms: {
            offset: { type: UniformType.VEC3, value: () => offset },
          },
          getShaderLines: (names) => [
            "jacobian = mat3(1.0);",
            `return positionMC + ${names.offset};`,
          ],
        };
      }

      it("is deformable", async function () {
        const [primitive] = await loadPrimitives(unitSquarePlainUrl);
        expect(Deformable.isDeformable(primitive)).toBe(true);
      });

      it("adds and removes bindings", async function () {
        const [primitive] = await loadPrimitives(unitSquarePlainUrl);
        const runtimePrimitive = primitive._runtimePrimitive;
        const binding = createBinding(Cartesian3.ZERO);

        primitive.addDeformerBinding(binding);
        scene.renderForSpecs();
        expect(runtimePrimitive.deformerBindings.has(binding)).toBe(true);
        expect(runtimePrimitive.pipelineStages).toContain(
          ModelDeformerPipelineStage,
        );

        primitive.removeDeformerBinding(binding);
        scene.renderForSpecs();
        expect(runtimePrimitive.deformerBindings.size).toBe(0);
        expect(runtimePrimitive.pipelineStages).not.toContain(
          ModelDeformerPipelineStage,
        );
      });

      it("renders deformed positions", async function () {
        if (webglStub) {
          return;
        }
        const [primitive] = await loadPrimitives(
          `${modelsUrl}/BoxTextured/glTF-Binary/BoxTextured.glb`,
        );
        const vertexCount = primitive.geometryReader.withReadSession(
          {},
          (session) => session.vertexCount(),
        );
        const vertexBuffer = Buffer.createVertexBuffer({
          context: scene.context,
          typedArray: new Float32Array(vertexCount * 3),
          usage: BufferUsage.STATIC_DRAW,
        });
        vertexBuffer.vertexArrayDestroyable = false;

        const binding = createBinding(new Cartesian3(1000.0, 1000.0, 1000.0));
        binding.vertexAttributes = [
          new GeometryAttributeDescriptor({
            semantic: "direction",
            type: AttributeType.VEC3,
            componentDatatype: ComponentDatatype.FLOAT,
          }),
        ];
        binding.vertexBuffer = vertexBuffer;
        binding.getShaderLines = (names) => [
          "jacobian = mat3(1.0);",
          `return positionMC + ${names.direction} + ${names.offset};`,
        ];

        expect(scene).notToRender([0, 0, 0, 255]);
        primitive.addDeformerBinding(binding);
        expect(scene).toRender([0, 0, 0, 255]);
        primitive.removeDeformerBinding(binding);
        expect(scene).notToRender([0, 0, 0, 255]);

        vertexBuffer.destroy();
      });

      it("transforms normals by the jacobian", async function () {
        if (webglStub) {
          return;
        }
        const [primitive] = await loadPrimitives(
          `${modelsUrl}/BoxTextured/glTF-Binary/BoxTextured.glb`,
        );
        const binding = createBinding(Cartesian3.ZERO);
        // Rotates by 90 degrees about x.
        binding.getShaderLines = () => [
          "jacobian = mat3(1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, -1.0, 0.0);",
          "return positionMC;",
        ];

        let rest;
        expect(scene).toRenderAndCall((rgba) => {
          rest = rgba;
        });
        primitive.addDeformerBinding(binding);
        expect(scene).toRenderAndCall((rgba) => {
          expect(rgba).not.toEqual(rest);
        });
      });

      it("throws when adding a binding to a skinned primitive", async function () {
        const [primitive] = await loadPrimitives(simpleSkinUrl);
        expect(function () {
          primitive.addDeformerBinding(createBinding(Cartesian3.ZERO));
        }).toThrowDeveloperError();
      });

      it("throws when adding a binding to a morphed primitive", async function () {
        const [primitive] = await loadPrimitives(simpleMorphUrl);
        expect(function () {
          primitive.addDeformerBinding(createBinding(Cartesian3.ZERO));
        }).toThrowDeveloperError();
      });
    });
  },
  "WebGL",
);
