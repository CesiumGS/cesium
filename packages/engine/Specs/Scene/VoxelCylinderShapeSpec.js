import {
  BoundingSphere,
  Cartesian3,
  Math as CesiumMath,
  Matrix3,
  Matrix4,
  OrientedBoundingBox,
  Quaternion,
  VoxelCylinderShape,
} from "../../index.js";

describe("Scene/VoxelCylinderShape", function () {
  it("constructs", function () {
    const shape = new VoxelCylinderShape();
    expect(shape.shapeTransform).toEqual(new Matrix4());
  });

  it("update works with model matrix", function () {
    const shape = new VoxelCylinderShape();

    const translation = new Cartesian3(1.0, 2.0, 3.0);
    const scale = new Cartesian3(2.0, 3.0, 4.0);
    const angle = CesiumMath.PI_OVER_FOUR;
    const rotation = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, angle);
    const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );
    const minBounds = VoxelCylinderShape.DefaultMinBounds;
    const maxBounds = VoxelCylinderShape.DefaultMaxBounds;

    const visible = shape.update(modelMatrix, minBounds, maxBounds);

    const expectedOrientedBoundingBox = new OrientedBoundingBox(
      translation,
      Matrix3.fromColumnMajorArray([
        scale.x * Math.cos(angle),
        scale.x * Math.sin(angle),
        0.0,
        scale.y * Math.cos(angle + CesiumMath.PI_OVER_TWO),
        scale.y * Math.sin(angle + CesiumMath.PI_OVER_TWO),
        0.0,
        0.0,
        0.0,
        scale.z,
      ])
    );
    const expectedBoundingSphere = new BoundingSphere(
      translation,
      Cartesian3.magnitude(scale)
    );

    expect(shape.orientedBoundingBox.center).toEqual(
      expectedOrientedBoundingBox.center
    );
    expect(shape.orientedBoundingBox.halfAxes).toEqualEpsilon(
      expectedOrientedBoundingBox.halfAxes,
      CesiumMath.EPSILON12
    );
    expect(shape.boundingSphere).toEqual(expectedBoundingSphere);
    expect(shape.boundTransform).toEqual(modelMatrix);
    expect(shape.shapeTransform).toEqual(modelMatrix);
    expect(visible).toBeTrue();
  });

  it("update works with non-default minimum and maximum bounds", function () {
    const shape = new VoxelCylinderShape();
    const translation = new Cartesian3(1.0, 2.0, 3.0);
    const scale = new Cartesian3(2.0, 3.0, 4.0);
    const rotation = Quaternion.IDENTITY;
    const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale,
      new Matrix4()
    );

    // Half revolution
    const minRadius = 0.25;
    const maxRadius = 0.75;
    const minHeight = -0.5;
    const maxHeight = +0.5;
    const minAngle = -CesiumMath.PI;
    const maxAngle = 0.0;
    const minBounds = new Cartesian3(minRadius, minHeight, minAngle);
    const maxBounds = new Cartesian3(maxRadius, maxHeight, maxAngle);
    const visible = shape.update(modelMatrix, minBounds, maxBounds);

    const expectedMinX = translation.x - maxRadius * scale.x;
    const expectedMaxX = translation.x + maxRadius * scale.x;
    const expectedMinY = translation.y - maxRadius * scale.y;
    const expectedMaxY = translation.y;
    const expectedMinZ = translation.z + minHeight * scale.z;
    const expectedMaxZ = translation.z + maxHeight * scale.z;

    // x and y are swapped here because scale is relative to the angle midpoint: -pi/2
    const expectedScale = new Cartesian3(
      0.5 * (expectedMaxY - expectedMinY),
      0.5 * (expectedMaxX - expectedMinX),
      0.5 * (expectedMaxZ - expectedMinZ)
    );
    const expectedTranslation = new Cartesian3(
      0.5 * (expectedMaxX + expectedMinX),
      0.5 * (expectedMaxY + expectedMinY),
      0.5 * (expectedMaxZ + expectedMinZ)
    );

    const expectedRotation = Matrix3.fromRotationZ(-CesiumMath.PI_OVER_TWO);
    const expectedHalfAxes = Matrix3.multiplyByScale(
      expectedRotation,
      expectedScale,
      new Matrix3()
    );

    const expectedOrientedBoundingBox = new OrientedBoundingBox(
      expectedTranslation,
      expectedHalfAxes
    );
    const expectedBoundingSphere = new BoundingSphere(
      expectedTranslation,
      Cartesian3.magnitude(expectedScale)
    );
    const expectedBoundTransform = Matrix4.setTranslation(
      Matrix4.fromRotation(expectedHalfAxes),
      expectedTranslation,
      new Matrix4()
    );

    expect(shape.orientedBoundingBox.center).toEqualEpsilon(
      expectedOrientedBoundingBox.center,
      CesiumMath.EPSILON12
    );
    expect(shape.orientedBoundingBox.halfAxes).toEqualEpsilon(
      expectedOrientedBoundingBox.halfAxes,
      CesiumMath.EPSILON12
    );
    expect(shape.boundingSphere).toEqualEpsilon(
      expectedBoundingSphere,
      CesiumMath.EPSILON12
    );
    expect(shape.boundTransform).toEqualEpsilon(
      expectedBoundTransform,
      CesiumMath.EPSILON12
    );
    expect(shape.shapeTransform).toEqual(modelMatrix);
    expect(visible).toBeTrue();
  });

  it("update works with minimum and maximum bounds that cross the 180th meridian", function () {
    const shape = new VoxelCylinderShape();
    const translation = Cartesian3.ZERO;
    const scale = Cartesian3.ONE;
    const rotation = Quaternion.IDENTITY;
    const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale,
      new Matrix4()
    );

    // Half revolution around 180th meridian
    const minAngle = +CesiumMath.PI_OVER_TWO;
    const maxAngle = -CesiumMath.PI_OVER_TWO;
    const defaultMinBounds = VoxelCylinderShape.DefaultMinBounds;
    const defaultMaxBounds = VoxelCylinderShape.DefaultMaxBounds;
    const minBounds = new Cartesian3(
      defaultMinBounds.x,
      defaultMinBounds.y,
      minAngle
    );
    const maxBounds = new Cartesian3(
      defaultMaxBounds.x,
      defaultMaxBounds.y,
      maxAngle
    );
    const visible = shape.update(modelMatrix, minBounds, maxBounds);

    const expectedScale = new Cartesian3(0.5, 1.0, 1.0);
    const expectedTranslation = new Cartesian3(-0.5, 0.0, 0.0);
    const expectedRotation = Matrix3.fromRotationZ(CesiumMath.PI);
    const expectedHalfAxes = Matrix3.multiplyByScale(
      expectedRotation,
      expectedScale,
      new Matrix3()
    );

    const expectedOrientedBoundingBox = new OrientedBoundingBox(
      expectedTranslation,
      expectedHalfAxes
    );
    const expectedBoundingSphere = new BoundingSphere(
      expectedTranslation,
      Cartesian3.magnitude(expectedScale)
    );
    const expectedBoundTransform = Matrix4.setTranslation(
      Matrix4.fromRotation(expectedHalfAxes),
      expectedTranslation,
      new Matrix4()
    );

    expect(shape.orientedBoundingBox.center).toEqualEpsilon(
      expectedOrientedBoundingBox.center,
      CesiumMath.EPSILON12
    );
    expect(shape.orientedBoundingBox.halfAxes).toEqualEpsilon(
      expectedOrientedBoundingBox.halfAxes,
      CesiumMath.EPSILON12
    );
    expect(shape.boundingSphere).toEqualEpsilon(
      expectedBoundingSphere,
      CesiumMath.EPSILON12
    );
    expect(shape.boundTransform).toEqualEpsilon(
      expectedBoundTransform,
      CesiumMath.EPSILON12
    );
    expect(shape.shapeTransform).toEqual(modelMatrix);
    expect(visible).toBeTrue();
  });

  it("computeOrientedBoundingBoxForTile returns oriented bounding box for a specified tile", () => {
    let result = new OrientedBoundingBox();
    const shape = new VoxelCylinderShape();
    const translation = new Cartesian3(1.0, 2.0, 3.0);
    const scale = new Cartesian3(2.0, 3.0, 4.0);
    const rotation = Quaternion.IDENTITY;
    const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale,
      new Matrix4()
    );

    // Half revolution
    const minRadius = 0.25;
    const maxRadius = 0.75;
    const minHeight = -0.5;
    const maxHeight = +0.5;
    const minAngle = -CesiumMath.PI;
    const maxAngle = 0.0;
    const minBounds = new Cartesian3(minRadius, minHeight, minAngle);
    const maxBounds = new Cartesian3(maxRadius, maxHeight, maxAngle);
    shape.update(modelMatrix, minBounds, maxBounds);
    result = shape.computeOrientedBoundingBoxForTile(0, 0, 0, 0, result);
    expect(result.center.x).toEqual(1.0);
    expect(result.center.y).toEqual(0.875);
    expect(result.center.z).toEqual(3.0);
    expect(result.halfAxes).toEqualEpsilon(
      new Matrix3(0, 1.5, 0, -1.125, 0, 0, 0, 0, 2),
      CesiumMath.EPSILON12
    );
  });

  it("computeApproximateStepSize returns step size for the specified voxel grid dimension", () => {
    const shape = new VoxelCylinderShape();
    const translation = new Cartesian3(1.0, 2.0, 3.0);
    const scale = new Cartesian3(2.0, 3.0, 4.0);
    const rotation = Quaternion.IDENTITY;
    const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale,
      new Matrix4()
    );

    // Half revolution
    const minRadius = 0.25;
    const maxRadius = 0.75;
    const minHeight = -0.5;
    const maxHeight = +0.5;
    const minAngle = -CesiumMath.PI;
    const maxAngle = 0.0;
    const minBounds = new Cartesian3(minRadius, minHeight, minAngle);
    const maxBounds = new Cartesian3(maxRadius, maxHeight, maxAngle);
    shape.update(modelMatrix, minBounds, maxBounds);

    const dimensions = new Cartesian3(0.5, 1, CesiumMath.PI);
    const result = shape.computeApproximateStepSize(dimensions);
    expect(result).toEqualEpsilon(0.5, CesiumMath.EPSILON7);
  });
});
