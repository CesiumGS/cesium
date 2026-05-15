import {
  Cartographic,
  Ellipsoid,
  Matrix4,
  Matrix4Projection,
  deserializeMapProjection,
  MapProjectionType,
} from "../../index.js";

describe("Core/Matrix4Projection", function () {
  it("constructs with identity matrix", function () {
    const projection = new Matrix4Projection({
      matrix: Matrix4.IDENTITY,
    });

    expect(projection.isNormalCylindrical).toBe(false);
    expect(projection.ellipsoid).toBeDefined();
  });

  it("throws without matrix", function () {
    expect(function () {
      return new Matrix4Projection({});
    }).toThrowDeveloperError();
  });

  it("throws without options", function () {
    expect(function () {
      return new Matrix4Projection();
    }).toThrowDeveloperError();
  });

  it("projects with identity matrix in degrees mode", function () {
    const projection = new Matrix4Projection({
      matrix: Matrix4.IDENTITY,
      degrees: true,
    });

    const cartographic = Cartographic.fromDegrees(45, 30, 100);
    const projected = projection.project(cartographic);

    expect(projected.x).toBeCloseTo(45, 6);
    expect(projected.y).toBeCloseTo(30, 6);
    expect(projected.z).toBeCloseTo(100, 6);
  });

  it("projects with identity matrix in radians mode", function () {
    const projection = new Matrix4Projection({
      matrix: Matrix4.IDENTITY,
      degrees: false,
    });

    const cartographic = new Cartographic(0.5, 0.3, 100);
    const projected = projection.project(cartographic);

    expect(projected.x).toBeCloseTo(0.5, 10);
    expect(projected.y).toBeCloseTo(0.3, 10);
    expect(projected.z).toBeCloseTo(100, 6);
  });

  it("projects with scale matrix", function () {
    const scale = 2.0;
    const projection = new Matrix4Projection({
      matrix: Matrix4.fromUniformScale(scale),
      degrees: true,
    });

    const cartographic = Cartographic.fromDegrees(10, 20, 50);
    const projected = projection.project(cartographic);

    expect(projected.x).toBeCloseTo(20, 4);
    expect(projected.y).toBeCloseTo(40, 4);
    expect(projected.z).toBeCloseTo(100, 4);
  });

  it("round-trips project and unproject", function () {
    const projection = new Matrix4Projection({
      matrix: Matrix4.fromUniformScale(3.0),
      degrees: true,
    });

    const cartographic = Cartographic.fromDegrees(15, 45, 200);
    const projected = projection.project(cartographic);
    const unprojected = projection.unproject(projected);

    expect(unprojected.longitude).toBeCloseTo(cartographic.longitude, 10);
    expect(unprojected.latitude).toBeCloseTo(cartographic.latitude, 10);
    expect(unprojected.height).toBeCloseTo(cartographic.height, 4);
  });

  it("unproject throws without cartesian", function () {
    const projection = new Matrix4Projection({
      matrix: Matrix4.IDENTITY,
    });

    expect(function () {
      return projection.unproject();
    }).toThrowDeveloperError();
  });

  it("throws when constructed with a singular matrix", function () {
    // Matrix4.inverse throws on a non-invertible matrix. Confirm that this
    // bubbles up at construction rather than silently producing a broken
    // projection that fails at unproject time.
    const singular = Matrix4.fromArray([
      1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
    ]);

    expect(function () {
      return new Matrix4Projection({ matrix: singular });
    }).toThrowError(/not invertible/);
  });

  it("throws when the matrix forces w = 0 for all inputs", function () {
    // A degenerate w-row collapses every projected point to the homogeneous
    // origin. Matrix4.inverse rejects this at construction.
    const wzero = Matrix4.fromArray([
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0,
    ]);

    expect(function () {
      return new Matrix4Projection({ matrix: wzero });
    }).toThrowError(/not invertible/);
  });

  it("clones the input matrix so later mutations do not leak in", function () {
    const matrix = Matrix4.fromUniformScale(2.0);
    const projection = new Matrix4Projection({
      matrix: matrix,
      degrees: true,
    });

    // Mutate the matrix the caller still holds a reference to.
    Matrix4.multiplyByUniformScale(matrix, 100.0, matrix);

    const cartographic = Cartographic.fromDegrees(10, 20, 0);
    const projected = projection.project(cartographic);
    // Should still reflect the original 2× scale, not 200×.
    expect(projected.x).toBeCloseTo(20, 4);
    expect(projected.y).toBeCloseTo(40, 4);
  });

  it("survives interleaved project / unproject calls (scratch reuse)", function () {
    // Matrix4Projection uses a module-level scratch Cartesian4. If scratch
    // reuse leaks state, calling project then unproject in a tight loop
    // will drift. Verify round-trip stability across many iterations.
    const projection = new Matrix4Projection({
      matrix: Matrix4.fromUniformScale(3.0),
      degrees: true,
    });

    const input = Cartographic.fromDegrees(15, 45, 200);
    let current = input;
    for (let i = 0; i < 20; i++) {
      const projected = projection.project(current);
      current = projection.unproject(projected);
    }

    expect(current.longitude).toBeCloseTo(input.longitude, 8);
    expect(current.latitude).toBeCloseTo(input.latitude, 8);
    expect(current.height).toBeCloseTo(input.height, 4);
  });

  it("uses a provided result instance for project and unproject", function () {
    const projection = new Matrix4Projection({
      matrix: Matrix4.IDENTITY,
      degrees: true,
    });

    const projectResult = new Cartographic();
    // Matrix4Projection.project writes a Cartesian3 — pass an object literal
    // instead so we test the result-passing contract without a type clash.
    const projectTarget = { x: 0, y: 0, z: 0 };
    const projected = projection.project(
      Cartographic.fromDegrees(10, 20, 5),
      projectTarget,
    );
    expect(projected).toBe(projectTarget);

    const unprojected = projection.unproject(projected, projectResult);
    expect(unprojected).toBe(projectResult);
  });

  it("divides by the homogeneous coordinate when the matrix produces w != 1", function () {
    // The diagonal entry on the w-row is 2, so every projected point gets
    // its components scaled by 1/2 after the homogeneous divide. Round-trip
    // through unproject must invert the divide and recover the original
    // cartographic exactly.
    const matrix = Matrix4.fromArray([
      1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 2,
    ]);
    const projection = new Matrix4Projection({
      matrix: matrix,
      degrees: true,
    });

    const cartographic = Cartographic.fromDegrees(45, 30, 100);
    const projected = projection.project(cartographic);
    expect(projected.x).toBeCloseTo(45 / 2, 6);
    expect(projected.y).toBeCloseTo(30 / 2, 6);
    expect(projected.z).toBeCloseTo(100 / 2, 6);

    const unprojected = projection.unproject(projected);
    expect(unprojected.longitude).toBeCloseTo(cartographic.longitude, 10);
    expect(unprojected.latitude).toBeCloseTo(cartographic.latitude, 10);
    expect(unprojected.height).toBeCloseTo(100, 6);
  });

  it("preserves a non-default ellipsoid through serialization", function () {
    const projection = new Matrix4Projection({
      matrix: Matrix4.IDENTITY,
      ellipsoid: Ellipsoid.UNIT_SPHERE,
    });

    const serialized = projection.serialize();
    const deserialized = deserializeMapProjection(serialized);
    expect(deserialized.ellipsoid.radii.x).toBeCloseTo(1.0, 10);
  });

  it("preserves degrees flag through serialization", function () {
    const projection = new Matrix4Projection({
      matrix: Matrix4.IDENTITY,
      degrees: false,
    });

    const serialized = projection.serialize();
    const deserialized = deserializeMapProjection(serialized);

    // Round-trip a radians-mode point — if the flag were lost, the
    // deserialized instance would (de)convert and produce different output.
    const cartographic = new Cartographic(0.5, 0.3, 0);
    const p1 = projection.project(cartographic);
    const p2 = deserialized.project(cartographic);
    expect(p1.x).toBeCloseTo(p2.x, 10);
    expect(p1.y).toBeCloseTo(p2.y, 10);
  });

  it("serializes and deserializes", function () {
    const matrix = Matrix4.fromUniformScale(2.5);
    const projection = new Matrix4Projection({
      matrix: matrix,
      degrees: false,
    });

    const serialized = projection.serialize();
    expect(serialized.mapProjectionType).toBe(MapProjectionType.MATRIX4);

    const deserialized = deserializeMapProjection(serialized);
    expect(deserialized).toBeInstanceOf(Matrix4Projection);

    const cartographic = new Cartographic(0.5, 0.3, 100);
    const p1 = projection.project(cartographic);
    const p2 = deserialized.project(cartographic);
    expect(p1.x).toBeCloseTo(p2.x, 10);
    expect(p1.y).toBeCloseTo(p2.y, 10);
    expect(p1.z).toBeCloseTo(p2.z, 6);
  });
});
