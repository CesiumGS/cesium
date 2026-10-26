import { AttributeType, Cartesian3, Matrix4 } from "@cesium/core";
import {
  GeometryAttributeDescriptor,
  ResourceCache,
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

    async function loadPrimitives(url) {
      const model = await loadAndZoomToModelAsync({ gltf: url }, scene);
      return model.nodes.flatMap((node) => node.primitives);
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
    });
  },
  "WebGL",
);
