import {
  BoundingSphere,
  Cartesian3,
  ComponentDatatype,
  Geometry,
  GeometryAttribute,
  GeometryInstance,
  GeometryInstanceAttribute,
  Matrix4,
  PrimitiveType,
} from "../../index.js";;

describe("Core/GeometryInstance", function () {
  it("constructor", function () {
    const geometry = new Geometry({
      attributes: {
        position: new GeometryAttribute({
          componentDatatype: ComponentDatatype.DOUBLE,
          componentsPerAttribute: 3,
          values: new Float64Array([
            0.0,
            0.0,
            0.0,
            1.0,
            0.0,
            0.0,
            0.0,
            1.0,
            0.0,
          ]),
        }),
      },
      indices: new Uint16Array([0, 1, 2]),
      primitiveType: PrimitiveType.TRIANGLES,
      boundingSphere: new BoundingSphere(new Cartesian3(0.5, 0.5, 0.0), 1.0),
    });
    const modelMatrix = Matrix4.multiplyByTranslation(
      Matrix4.IDENTITY,
      new Cartesian3(0.0, 0.0, 9000000.0),
      new Matrix4()
    );
    const attributes = {
      color: new GeometryInstanceAttribute({
        componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
        componentsPerAttribute: 4,
        normalize: true,
        value: new Uint8Array([255, 255, 0, 255]),
      }),
    };
    const instance = new GeometryInstance({
      geometry: geometry,
      modelMatrix: modelMatrix,
      id: "geometry",
      attributes: attributes,
    });

    expect(instance.geometry).toBe(geometry);
    expect(instance.modelMatrix).toEqual(modelMatrix);
    expect(instance.id).toEqual("geometry");
    expect(attributes).toBe(attributes);
  });

  it("constructor throws without geometry", function () {
    expect(function () {
      return new GeometryInstance();
    }).toThrowDeveloperError();
  });
});
