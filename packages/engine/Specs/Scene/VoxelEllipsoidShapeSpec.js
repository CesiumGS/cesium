import {
  BoundingSphere,
  Cartesian3,
  Math as CesiumMath,
  OrientedBoundingBox,
  Matrix3,
  Matrix4,
  Quaternion,
  VoxelEllipsoidShape,
} from "../../index.js";

describe("Scene/VoxelEllipsoidShape", function () {
  it("constructs", function () {
    const shape = new VoxelEllipsoidShape();
    expect(shape.shapeTransform).toEqual(new Matrix4());
  });

  it("update works with model matrix", function () {
    const shape = new VoxelEllipsoidShape();
    const translation = new Cartesian3(1.0, 2.0, 3.0);
    const scale = new Cartesian3(2.0, 2.0, 2.0);
    const angle = CesiumMath.PI_OVER_FOUR;
    const rotation = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, angle);

    const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );

    const minBounds = new Cartesian3(
      -CesiumMath.PI,
      -CesiumMath.PI_OVER_TWO,
      0.0
    );
    const maxBounds = new Cartesian3(
      +CesiumMath.PI,
      +CesiumMath.PI_OVER_TWO,
      100000
    );
    const maxHeight = maxBounds.z;

    const expectedOrientedBoundingBox = new OrientedBoundingBox(
      translation,
      Matrix3.fromRowMajorArray([
        0.0,
        0.0,
        scale.z + maxHeight,
        (scale.x + maxHeight) * Math.cos(angle),
        -(scale.y + maxHeight) * Math.sin(angle),
        0.0,
        (scale.x + maxHeight) * Math.sin(angle),
        (scale.y + maxHeight) * Math.cos(angle),
        0.0,
      ])
    );

    const expectedBoundingSphere = BoundingSphere.fromOrientedBoundingBox(
      expectedOrientedBoundingBox,
      new BoundingSphere()
    );

    const visible = shape.update(modelMatrix, minBounds, maxBounds);

    expect(shape.orientedBoundingBox.center).toEqual(
      expectedOrientedBoundingBox.center
    );
    expect(shape.orientedBoundingBox.halfAxes).toEqualEpsilon(
      expectedOrientedBoundingBox.halfAxes,
      CesiumMath.EPSILON9
    );
    expect(shape.boundingSphere).toEqual(expectedBoundingSphere);

    expect(
      Matrix4.getTranslation(shape.boundTransform, new Cartesian3())
    ).toEqualEpsilon(expectedOrientedBoundingBox.center, CesiumMath.EPSILON12);

    expect(
      Matrix4.getMatrix3(shape.boundTransform, new Matrix3())
    ).toEqualEpsilon(expectedOrientedBoundingBox.halfAxes, CesiumMath.EPSILON9);

    expect(
      Matrix4.getTranslation(shape.shapeTransform, new Cartesian3())
    ).toEqualEpsilon(expectedOrientedBoundingBox.center, CesiumMath.EPSILON12);

    const expectedShapeTransform = Matrix4.fromRowMajorArray([
      (scale.x + maxHeight) * Math.cos(angle),
      -(scale.x + maxHeight) * Math.sin(angle),
      0.0,
      expectedOrientedBoundingBox.center.x,
      (scale.y + maxHeight) * Math.sin(angle),
      (scale.y + maxHeight) * Math.cos(angle),
      0.0,
      expectedOrientedBoundingBox.center.y,
      0.0,
      0.0,
      scale.z + maxHeight,
      expectedOrientedBoundingBox.center.z,
      0.0,
      0.0,
      0.0,
      1.0,
    ]);
    expect(shape.shapeTransform).toEqualEpsilon(
      expectedShapeTransform,
      CesiumMath.EPSILON9
    );
    expect(visible).toBeTrue();
  });
});
