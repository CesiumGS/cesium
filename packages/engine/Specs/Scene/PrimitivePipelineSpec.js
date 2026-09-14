import {
  BoundingSphere,
  BoxGeometry,
  Cartesian3,
  ComponentDatatype,
  Geometry,
  GeometryAttribute,
  GeometryAttributes,
  GeometryInstance,
  Matrix4,
  PrimitiveType,
  PrimitivePipeline,
} from "../../index.js";

describe(
  "Scene/PrimitivePipeline",
  function () {
    it("can pack and unpack geometry", function () {
      const boxGeometry = BoxGeometry.createGeometry(
        BoxGeometry.fromDimensions({
          dimensions: new Cartesian3(1, 2, 3),
        }),
      );

      const boxGeometry2 = BoxGeometry.createGeometry(
        BoxGeometry.fromDimensions({
          dimensions: new Cartesian3(3, 4, 7),
        }),
      );

      const geometryToPack = [boxGeometry, boxGeometry2];
      const transferableObjects = [];
      const results = PrimitivePipeline.packCreateGeometryResults(
        geometryToPack,
        transferableObjects,
      );
      const unpackedGeometry =
        PrimitivePipeline.unpackCreateGeometryResults(results);

      expect(transferableObjects.length).toBe(1);
      expect(geometryToPack).toEqual(unpackedGeometry);
    });

    it("can pack and unpack geometry without indices", function () {
      const attributes = new GeometryAttributes();
      attributes.position = new GeometryAttribute({
        componentDatatype: ComponentDatatype.FLOAT,
        componentsPerAttribute: 3,
        values: new Float32Array([1, 2, 3, 4, 5, 6]),
      });

      const geometry = new Geometry({
        attributes: attributes,
        indices: undefined,
        primitiveType: PrimitiveType.POINTS,
        boundingSphere: BoundingSphere.fromVertices(attributes.position.values),
      });

      const geometryToPack = [geometry];
      const transferableObjects = [];
      const results = PrimitivePipeline.packCreateGeometryResults(
        geometryToPack,
        transferableObjects,
      );
      const unpackedGeometry =
        PrimitivePipeline.unpackCreateGeometryResults(results);

      expect(transferableObjects.length).toBe(1);
      expect(geometryToPack).toEqual(unpackedGeometry);
    });

    function makeInstance(positions, indices, primitiveType, modelMatrix) {
      return new GeometryInstance({
        geometry: new Geometry({
          attributes: {
            position: new GeometryAttribute({
              componentDatatype: ComponentDatatype.FLOAT,
              componentsPerAttribute: 3,
              values: positions,
            }),
          },
          indices: indices,
          primitiveType: primitiveType,
          boundingSphere: BoundingSphere.fromVertices(positions),
        }),
        modelMatrix: modelMatrix,
      });
    }

    // Runs the same batching path Primitive uses, with two instances that have
    // different model matrices so the geometry is baked to world coordinates.
    function combine(instances, modelMatrix) {
      return PrimitivePipeline.combineGeometry({
        instances: instances,
        elementIndexUintSupported: true,
        scene3DOnly: true,
        vertexCacheOptimize: false,
        compressVertices: false,
        modelMatrix: modelMatrix,
        createPickOffsets: false,
      });
    }

    const MIRROR = Matrix4.fromScale(new Cartesian3(-1.0, 1.0, 1.0));
    const OFFSET = Matrix4.fromTranslation(new Cartesian3(100.0, 0.0, 0.0));

    it("reverses the winding order when an instance model matrix mirrors the geometry", function () {
      const mirrored = makeInstance(
        [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0],
        [0, 1, 2],
        PrimitiveType.TRIANGLES,
        MIRROR,
      );
      const normal = makeInstance(
        [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0],
        [0, 1, 2],
        PrimitiveType.TRIANGLES,
        OFFSET,
      );

      const results = combine([mirrored, normal], Matrix4.IDENTITY);
      const geometry = results.geometries[0];

      // The mirrored instance's triangle winding is reversed, the normal one is not
      expect(geometry.indices).toEqual([2, 1, 0, 3, 4, 5]);
      expect(geometry.attributes.position.values).toEqual([
        0.0, 0.0, 0.0, -1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 100.0, 0.0, 0.0, 101.0,
        0.0, 0.0, 100.0, 1.0, 0.0,
      ]);
    });

    it("bases the winding order on the product of the instance and primitive model matrices", function () {
      const instanceA = makeInstance(
        [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0],
        [0, 1, 2],
        PrimitiveType.TRIANGLES,
        MIRROR,
      );
      const instanceB = makeInstance(
        [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0],
        [0, 1, 2],
        PrimitiveType.TRIANGLES,
        OFFSET,
      );

      // The primitive matrix is mirrored too: two mirrors combine into a positive
      // determinant (no reversal), while the plain instance B combined with the
      // mirrored primitive matrix is a mirror (reversal).
      const results = combine([instanceA, instanceB], MIRROR);
      const geometry = results.geometries[0];

      expect(geometry.indices).toEqual([0, 1, 2, 5, 4, 3]);
    });

    it("reverses the winding order of non-indexed triangles without adding indices", function () {
      const mirrored = makeInstance(
        [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0],
        undefined,
        PrimitiveType.TRIANGLES,
        MIRROR,
      );
      const normal = makeInstance(
        [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0],
        undefined,
        PrimitiveType.TRIANGLES,
        OFFSET,
      );

      const results = combine([mirrored, normal], Matrix4.IDENTITY);
      const geometry = results.geometries[0];

      // Keeps the non-indexed representation so the batch stays consistent
      expect(geometry.indices).toBeUndefined();
      // The mirrored instance's vertex order is reversed as a whole, which is
      // equivalent to reversing the winding of each triangle
      expect(geometry.attributes.position.values).toEqual([
        0.0, 1.0, 0.0, -1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 100.0, 0.0, 0.0, 101.0,
        0.0, 0.0, 100.0, 1.0, 0.0,
      ]);
    });

    it("expands every strip in a batch when a mirrored strip is expanded", function () {
      const mirrored = makeInstance(
        [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0],
        [0, 1, 2, 3],
        PrimitiveType.TRIANGLE_STRIP,
        MIRROR,
      );
      const normal = makeInstance(
        [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0],
        [0, 1, 2, 3],
        PrimitiveType.TRIANGLE_STRIP,
        OFFSET,
      );

      const results = combine([mirrored, normal], Matrix4.IDENTITY);
      const geometry = results.geometries[0];

      // The mirrored strip is expanded into a reversed triangle list and the
      // plain strip of the same batch is expanded as well, so that all
      // instances keep a consistent representation before they are combined:
      // mirrored: (0,1,2)(2,1,3) reversed -> (2,1,0)(3,1,2)
      // plain:    (0,1,2)(2,1,3) + offset 4 -> (4,5,6)(6,5,7)
      expect(geometry.primitiveType).toEqual(PrimitiveType.TRIANGLES);
      expect(geometry.indices).toEqual([2, 1, 0, 3, 1, 2, 4, 5, 6, 6, 5, 7]);
    });

    it("leaves the geometry unchanged on the un-baked path (scene3DOnly with a single shared model matrix)", function () {
      const instance = makeInstance(
        [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0],
        [0, 1, 2],
        PrimitiveType.TRIANGLES,
        MIRROR,
      );

      const results = combine([instance], Matrix4.clone(Matrix4.IDENTITY));

      // The model matrix stays on the draw command; the geometry is untouched
      expect(instance.geometry.indices).toEqual([0, 1, 2]);
      expect(results.modelMatrix.equals(Matrix4.clone(MIRROR))).toBe(true);
    });
  },
  "WebGL",
);
