import {
  Cartesian3,
  FrustumOutlineGeometry,
  PerspectiveFrustum,
  Quaternion,
  VertexFormat,
} from "../../index.js";

import { Math as CesiumMath } from "../../index.js";

import createPackableSpecs from "../../../../Specs/createPackableSpecs.js";

describe("Core/FrustumOutlineGeometry", function () {
  it("constructor throws without options", function () {
    expect(function () {
      return new FrustumOutlineGeometry();
    }).toThrowDeveloperError();
  });

  it("constructor throws without frustum", function () {
    expect(function () {
      return new FrustumOutlineGeometry({
        origin: Cartesian3.ZERO,
        orientation: Quaternion.IDENTITY,
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without position", function () {
    expect(function () {
      return new FrustumOutlineGeometry({
        frustum: new PerspectiveFrustum(),
        orientation: Quaternion.IDENTITY,
      });
    }).toThrowDeveloperError();
  });

  it("constructor throws without orientation", function () {
    expect(function () {
      return new FrustumOutlineGeometry({
        frustum: new PerspectiveFrustum(),
        origin: Cartesian3.ZERO,
      });
    }).toThrowDeveloperError();
  });

  it("constructor computes all vertex attributes", function () {
    const frustum = new PerspectiveFrustum();
    frustum.fov = CesiumMath.toRadians(30.0);
    frustum.aspectRatio = 1920.0 / 1080.0;
    frustum.near = 1.0;
    frustum.far = 3.0;

    const m = FrustumOutlineGeometry.createGeometry(
      new FrustumOutlineGeometry({
        frustum: frustum,
        origin: Cartesian3.ZERO,
        orientation: Quaternion.IDENTITY,
      })
    );

    const numVertices = 8;
    const numLines = 12;
    expect(m.attributes.position.values.length).toEqual(numVertices * 3);
    expect(m.indices.length).toEqual(numLines * 2);

    expect(m.boundingSphere.center).toEqual(new Cartesian3(0.0, 0.0, 2.0));
    expect(m.boundingSphere.radius).toBeGreaterThan(1.0);
    expect(m.boundingSphere.radius).toBeLessThan(2.0);
  });

  const packableFrustum = new PerspectiveFrustum();
  packableFrustum.fov = 1.0;
  packableFrustum.aspectRatio = 2.0;
  packableFrustum.near = 3.0;
  packableFrustum.far = 4.0;

  createPackableSpecs(
    FrustumOutlineGeometry,
    new FrustumOutlineGeometry({
      frustum: packableFrustum,
      origin: Cartesian3.ZERO,
      orientation: Quaternion.IDENTITY,
      vertexFormat: VertexFormat.POSITION_ONLY,
    }),
    [0.0, 1.0, 2.0, 3.0, 4.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0]
  );
});
