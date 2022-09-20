import {
  BoundingSphere,
  BoxGeometry,
  Cartesian3,
  ComponentDatatype,
  Geometry,
  GeometryAttribute,
  GeometryAttributes,
  PrimitiveType,
  PrimitivePipeline,
} from "../../index.js";;

describe(
  "Scene/PrimitivePipeline",
  function () {
    it("can pack and unpack geometry", function () {
      const boxGeometry = BoxGeometry.createGeometry(
        BoxGeometry.fromDimensions({
          dimensions: new Cartesian3(1, 2, 3),
        })
      );

      const boxGeometry2 = BoxGeometry.createGeometry(
        BoxGeometry.fromDimensions({
          dimensions: new Cartesian3(3, 4, 7),
        })
      );

      const geometryToPack = [boxGeometry, boxGeometry2];
      const transferableObjects = [];
      const results = PrimitivePipeline.packCreateGeometryResults(
        geometryToPack,
        transferableObjects
      );
      const unpackedGeometry = PrimitivePipeline.unpackCreateGeometryResults(
        results
      );

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
        transferableObjects
      );
      const unpackedGeometry = PrimitivePipeline.unpackCreateGeometryResults(
        results
      );

      expect(transferableObjects.length).toBe(1);
      expect(geometryToPack).toEqual(unpackedGeometry);
    });
  },
  "WebGL"
);
