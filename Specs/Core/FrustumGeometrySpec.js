import { Cartesian3 } from "../../Source/Cesium.js";
import { FrustumGeometry } from "../../Source/Cesium.js";
import { Math as CesiumMath } from "../../Source/Cesium.js";
import { PerspectiveFrustum } from "../../Source/Cesium.js";
import { Quaternion } from "../../Source/Cesium.js";
import { VertexFormat } from "../../Source/Cesium.js";
import createPackableSpecs from "../createPackableSpecs.js";

describe("Core/FrustumGeometry", function () {
  it("constructor throws without options", function () {
    expect(function () {
      return new FrustumGeometry();
    }).toThrowDeveloperError();
  });

  it("constructor throws without frustum", function () {
    expect(function () {
      return new FrustumGeometry({
        origin: Cartesian3.ZERO,
        orientation: Quaternion.IDENTITY,
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without position", function () {
    expect(function () {
      return new FrustumGeometry({
        frustum: new PerspectiveFrustum(),
        orientation: Quaternion.IDENTITY,
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without orientation", function () {
    expect(function () {
      return new FrustumGeometry({
        frustum: new PerspectiveFrustum(),
        origin: Cartesian3.ZERO,
      });
    }).toThrowDeveloperError();
  });

  it("constructor computes all vertex attributes", function () {
    var frustum = new PerspectiveFrustum();
    frustum.fov = CesiumMath.toRadians(30.0);
    frustum.aspectRatio = 1920.0 / 1080.0;
    frustum.near = 1.0;
    frustum.far = 3.0;

    var m = FrustumGeometry.createGeometry(
      new FrustumGeometry({
        frustum: frustum,
        origin: Cartesian3.ZERO,
        orientation: Quaternion.IDENTITY,
        vertexFormat: VertexFormat.ALL,
      })
    );

    var numVertices = 24; //3 components x 8 corners
    var numTriangles = 12; //6 sides x 2 triangles per side
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.attributes.normal.values.length).toEqual(numVertices * 3);
    expect(m.attributes.tangent.values.length).toEqual(numVertices * 3);
    expect(m.attributes.bitangent.values.length).toEqual(numVertices * 3);
    expect(m.attributes.st.values.length).toEqual(numVertices * 2);

    expect(m.indices.length).toEqual(numTriangles * 3);

    expect(m.boundingSphere.center).toEqual(new Cartesian3(0.0, 0.0, 2.0));
    expect(m.boundingSphere.radius).toBeGreaterThan(1.0);
    expect(m.boundingSphere.radius).toBeLessThan(2.0);
  });

  var packableFrustum = new PerspectiveFrustum();
  packableFrustum.fov = 1.0;
  packableFrustum.aspectRatio = 2.0;
  packableFrustum.near = 3.0;
  packableFrustum.far = 4.0;

  createPackableSpecs(
    FrustumGeometry,
    new FrustumGeometry({
      frustum: packableFrustum,
      origin: Cartesian3.ZERO,
      orientation: Quaternion.IDENTITY,
      vertexFormat: VertexFormat.POSITION_ONLY,
    }),
    [
      0.0,
      1.0,
      2.0,
      3.0,
      4.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      1.0,
      1.0,
      0.0,
      0.0,
      0.0,
      0.0,
      0.0,
      1.0,
    ]
  );
});
