import {
  BoundingSphere,
  Cartesian3,
  Math as CesiumMath,
  Matrix3,
  Matrix4,
  OrientedBoundingBox,
  Quaternion,
  VoxelBoxShape,
} from "../../Source/Cesium.js";

describe("Scene/VoxelBoxShape", function () {
  it("constructs", function () {
    const shape = new VoxelBoxShape();
    expect(shape.isVisible).toEqual(false);
  });

  it("update works with model matrix", function () {
    const shape = new VoxelBoxShape();

    const translation = new Cartesian3(1.0, 2.0, 3.0);
    const scale = new Cartesian3(2.0, 3.0, 4.0);
    const angle = CesiumMath.PI_OVER_FOUR;
    const rotation = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, angle);

    const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );
    const minBounds = VoxelBoxShape.DefaultMinBounds;
    const maxBounds = VoxelBoxShape.DefaultMaxBounds;

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

    shape.update(modelMatrix, minBounds, maxBounds);

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
    expect(shape.isVisible).toBeTrue();
  });

  it("update works with non-default minimum and maximum bounds", function () {
    const shape = new VoxelBoxShape();
    const translation = new Cartesian3(1.0, 2.0, 3.0);
    const scale = new Cartesian3(2.0, 3.0, 4.0);
    const rotation = Quaternion.IDENTITY;
    const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale,
      new Matrix4()
    );
    const minBounds = new Cartesian3(-0.75, -0.75, -0.75);
    const maxBounds = new Cartesian3(-0.25, -0.25, -0.25);
    shape.update(modelMatrix, minBounds, maxBounds);

    const expectedTranslation = new Cartesian3(0.75, 1.75, 2.75);
    const expectedScale = new Cartesian3(0.5, 0.75, 1.0);
    const expectedRotation = rotation;
    const expectedModelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      expectedTranslation,
      expectedRotation,
      expectedScale,
      new Matrix4()
    );
    const expectedOrientedBoundingBox = new OrientedBoundingBox(
      expectedTranslation,
      Matrix3.fromScale(expectedScale)
    );
    const expectedBoundingSphere = new BoundingSphere(
      expectedTranslation,
      Cartesian3.magnitude(expectedScale)
    );

    expect(shape.orientedBoundingBox).toEqual(expectedOrientedBoundingBox);
    expect(shape.boundingSphere).toEqual(expectedBoundingSphere);
    expect(shape.boundTransform).toEqual(expectedModelMatrix);
    expect(shape.shapeTransform).toEqual(expectedModelMatrix);
    expect(shape.isVisible).toBeTrue();
  });

  it("update is visible with zero scale for one component", function () {
    const shape = new VoxelBoxShape();
    const minBounds = VoxelBoxShape.DefaultMinBounds;
    const maxBounds = VoxelBoxShape.DefaultMaxBounds;
    const translation = new Cartesian3(1.0, 2.0, 3.0);
    const rotation = Quaternion.IDENTITY;

    let scale;
    let modelMatrix;

    // 0 scale for X
    scale = new Cartesian3(0.0, 2.0, 2.0);
    modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );
    shape.update(modelMatrix, minBounds, maxBounds);
    expect(shape.isVisible).toBeTrue();

    // 0 scale for Y
    scale = Cartesian3.fromElements(2.0, 0.0, 2.0, scale);
    modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );
    shape.update(modelMatrix, minBounds, maxBounds);
    expect(shape.isVisible).toBeTrue();

    // 0 scale for Z
    scale = Cartesian3.fromElements(2.0, 2.0, 0.0, scale);
    modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );
    shape.update(modelMatrix, minBounds, maxBounds);
    expect(shape.isVisible).toBeTrue();
  });

  it("update is invisible with zero scale for two or more components", function () {
    const shape = new VoxelBoxShape();
    const minBounds = VoxelBoxShape.DefaultMinBounds;
    const maxBounds = VoxelBoxShape.DefaultMaxBounds;
    const translation = new Cartesian3(1.0, 2.0, 3.0);
    const rotation = Quaternion.IDENTITY;

    let scale;
    let modelMatrix;

    // 0 scale for X and Y
    scale = new Cartesian3(0.0, 0.0, 2.0);
    modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );
    shape.update(modelMatrix, minBounds, maxBounds);
    expect(shape.isVisible).toBeFalse();

    // 0 scale for X and Z
    scale = Cartesian3.fromElements(0.0, 2.0, 0.0, scale);
    modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );
    shape.update(modelMatrix, minBounds, maxBounds);
    expect(shape.isVisible).toBeFalse();

    // 0 scale for Y and Z
    scale = Cartesian3.fromElements(2.0, 0.0, 0.0, scale);
    modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );
    shape.update(modelMatrix, minBounds, maxBounds);
    expect(shape.isVisible).toBeFalse();

    // 0 scale for X, Y, and Z
    scale = Cartesian3.fromElements(0.0, 0.0, 0.0, scale);
    modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );
    shape.update(modelMatrix, minBounds, maxBounds);
    expect(shape.isVisible).toBeFalse();
  });

  it("update is visible with zero bounds for one component", function () {
    const shape = new VoxelBoxShape();
    const translation = Cartesian3.ZERO;
    const rotation = Quaternion.IDENTITY;
    const scale = Cartesian3.ONE;
    const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );

    let minBounds;
    let maxBounds;
    let expectedScale;
    let actualScale;
    let actualTranslation;

    // 0 in X bound
    minBounds = new Cartesian3(0.0, -1.0, -1.0);
    maxBounds = new Cartesian3(0.0, +1.0, +1.0);
    expectedScale = new Cartesian3(0.0, 1.0, 1.0);

    shape.update(modelMatrix, minBounds, maxBounds);
    actualScale = Matrix4.getScale(shape.shapeTransform, new Cartesian3());
    actualTranslation = Matrix4.getTranslation(
      shape.shapeTransform,
      new Cartesian3()
    );
    expect(shape.isVisible).toBeTrue();
    expect(actualScale).toEqual(expectedScale);
    expect(actualTranslation).toEqual(translation);

    // 0 in Y bound
    minBounds = new Cartesian3(-1.0, 0.0, -1.0);
    maxBounds = new Cartesian3(+1.0, 0.0, +1.0);
    expectedScale = new Cartesian3(1.0, 0.0, 1.0);

    shape.update(modelMatrix, minBounds, maxBounds);
    actualScale = Matrix4.getScale(shape.shapeTransform, new Cartesian3());
    actualTranslation = Matrix4.getTranslation(
      shape.shapeTransform,
      new Cartesian3()
    );
    expect(shape.isVisible).toBeTrue();
    expect(actualScale).toEqual(expectedScale);
    expect(actualTranslation).toEqual(translation);

    // 0 in Z bound
    minBounds = new Cartesian3(-1.0, -1.0, 0.0);
    maxBounds = new Cartesian3(+1.0, +1.0, 0.0);
    expectedScale = new Cartesian3(1.0, 1.0, 0.0);

    shape.update(modelMatrix, minBounds, maxBounds);
    actualScale = Matrix4.getScale(shape.shapeTransform, new Cartesian3());
    actualTranslation = Matrix4.getTranslation(
      shape.shapeTransform,
      new Cartesian3()
    );
    expect(shape.isVisible).toBeTrue();
    expect(actualScale).toEqual(expectedScale);
    expect(actualTranslation).toEqual(translation);
  });

  it("update is invisible with zero bounds for two or more components", function () {
    const shape = new VoxelBoxShape();
    const translation = Cartesian3.ZERO;
    const rotation = Quaternion.IDENTITY;
    const scale = Cartesian3.ONE;
    const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );

    let minBounds;
    let maxBounds;

    // 0 in X and Y bounds
    minBounds = new Cartesian3(0.0, 0.0, -1.0);
    maxBounds = new Cartesian3(0.0, 0.0, +1.0);
    shape.update(modelMatrix, minBounds, maxBounds);
    expect(shape.isVisible).toBeFalse();

    // 0 in X and Z bounds
    minBounds = new Cartesian3(0.0, -1.0, 0.0);
    maxBounds = new Cartesian3(0.0, +1.0, 0.0);
    shape.update(modelMatrix, minBounds, maxBounds);
    expect(shape.isVisible).toBeFalse();

    // 0 in Y and Z bounds
    minBounds = new Cartesian3(-1.0, 0.0, 0.0);
    maxBounds = new Cartesian3(+1.0, 0.0, 0.0);
    shape.update(modelMatrix, minBounds, maxBounds);
    expect(shape.isVisible).toBeFalse();

    // 0 in X, Y, and Z bounds
    minBounds = new Cartesian3(0.0, 0.0, 0.0);
    maxBounds = new Cartesian3(0.0, 0.0, 0.0);
    shape.update(modelMatrix, minBounds, maxBounds);
    expect(shape.isVisible).toBeFalse();
  });

  it("update is invisible when minimum bounds exceed maximum bounds", function () {
    const shape = new VoxelBoxShape();
    const translation = Cartesian3.ZERO;
    const rotation = Quaternion.IDENTITY;
    const scale = Cartesian3.ONE;
    const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );

    let minBounds;
    let maxBounds;

    // Exceeds X
    minBounds = new Cartesian3(+2.0, -1.0, -1.0);
    maxBounds = new Cartesian3(+1.0, +1.0, +1.0);
    shape.update(modelMatrix, minBounds, maxBounds);
    expect(shape.isVisible).toBeFalse();

    // Exceeds Y
    minBounds = new Cartesian3(-1.0, +2.0, -1.0);
    maxBounds = new Cartesian3(+1.0, +1.0, +1.0);
    shape.update(modelMatrix, minBounds, maxBounds);
    expect(shape.isVisible).toBeFalse();

    // Exceeds Z
    minBounds = new Cartesian3(-1.0, -1.0, +2.0);
    maxBounds = new Cartesian3(+1.0, +1.0, +1.0);
    shape.update(modelMatrix, minBounds, maxBounds);
    expect(shape.isVisible).toBeFalse();
  });

  it("update throws with no model matrix parameter", function () {
    const shape = new VoxelBoxShape();
    const minBounds = VoxelBoxShape.DefaultMinBounds;
    const maxBounds = VoxelBoxShape.DefaultMaxBounds;

    expect(function () {
      return shape.update(undefined, minBounds, maxBounds);
    }).toThrowDeveloperError();
  });

  it("update throws with no minimum bounds parameter", function () {
    const shape = new VoxelBoxShape();
    const translation = Cartesian3.ZERO;
    const rotation = Quaternion.IDENTITY;
    const scale = Cartesian3.ONE;
    const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );
    const maxBounds = VoxelBoxShape.DefaultMaxBounds;

    expect(function () {
      return shape.update(modelMatrix, undefined, maxBounds);
    }).toThrowDeveloperError();
  });

  it("update throws with no maximum bounds parameter", function () {
    const shape = new VoxelBoxShape();
    const translation = Cartesian3.ZERO;
    const rotation = Quaternion.IDENTITY;
    const scale = Cartesian3.ONE;
    const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );
    const minBounds = VoxelBoxShape.DefaultMinBounds;

    expect(function () {
      return shape.update(modelMatrix, minBounds, undefined);
    }).toThrowDeveloperError();
  });

  it("computeOrientedBoundingBoxForTile works for root tile", function () {
    const shape = new VoxelBoxShape();
    const translation = Cartesian3.ZERO;
    const rotation = Quaternion.IDENTITY;
    const scale = Cartesian3.ONE;
    const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );
    const minBounds = VoxelBoxShape.DefaultMinBounds;
    const maxBounds = VoxelBoxShape.DefaultMaxBounds;
    shape.update(modelMatrix, minBounds, maxBounds);

    const tileLevel = 0;
    const tileX = 0;
    const tileY = 0;
    const tileZ = 0;
    const orientedBoundingBox = shape.computeOrientedBoundingBoxForTile(
      tileLevel,
      tileX,
      tileY,
      tileZ,
      new OrientedBoundingBox()
    );

    const expectedOrientedBoundingBox = shape.orientedBoundingBox;
    expect(orientedBoundingBox).toEqual(expectedOrientedBoundingBox);
  });

  it("computeOrientedBoundingBoxForTile works for children of root tile", function () {
    const shape = new VoxelBoxShape();
    const translation = Cartesian3.ZERO;
    const rotation = Quaternion.IDENTITY;
    const scale = Cartesian3.ONE;
    const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );
    const minBounds = VoxelBoxShape.DefaultMinBounds;
    const maxBounds = VoxelBoxShape.DefaultMaxBounds;
    shape.update(modelMatrix, minBounds, maxBounds);

    const expectedScale = new Cartesian3(0.5, 0.5, 0.5);
    let expectedTranslation;

    const tileLevel = 1;
    let tileX;
    let tileY;
    let tileZ;
    let orientedBoundingBox;

    tileX = 0;
    tileY = 0;
    tileZ = 0;

    // Child (0, 0, 0)
    orientedBoundingBox = shape.computeOrientedBoundingBoxForTile(
      tileLevel,
      tileX,
      tileY,
      tileZ,
      new OrientedBoundingBox()
    );
    expectedTranslation = new Cartesian3(-0.5, -0.5, -0.5);
    expect(orientedBoundingBox).toEqual(
      new OrientedBoundingBox(
        expectedTranslation,
        Matrix3.fromScale(expectedScale, new Matrix3())
      )
    );

    // Child (1, 0, 0)
    tileX = 1;
    tileY = 0;
    tileZ = 0;
    orientedBoundingBox = shape.computeOrientedBoundingBoxForTile(
      tileLevel,
      tileX,
      tileY,
      tileZ,
      new OrientedBoundingBox()
    );
    expectedTranslation = new Cartesian3(+0.5, -0.5, -0.5);
    expect(orientedBoundingBox).toEqual(
      new OrientedBoundingBox(
        expectedTranslation,
        Matrix3.fromScale(expectedScale, new Matrix3())
      )
    );

    // Child (0, 1, 0)
    tileX = 0;
    tileY = 1;
    tileZ = 0;
    orientedBoundingBox = shape.computeOrientedBoundingBoxForTile(
      tileLevel,
      tileX,
      tileY,
      tileZ,
      new OrientedBoundingBox()
    );
    expectedTranslation = new Cartesian3(-0.5, +0.5, -0.5);
    expect(orientedBoundingBox).toEqual(
      new OrientedBoundingBox(
        expectedTranslation,
        Matrix3.fromScale(expectedScale, new Matrix3())
      )
    );

    // Child (0, 0, 1)
    tileX = 0;
    tileY = 0;
    tileZ = 1;
    orientedBoundingBox = shape.computeOrientedBoundingBoxForTile(
      tileLevel,
      tileX,
      tileY,
      tileZ,
      new OrientedBoundingBox()
    );
    expectedTranslation = new Cartesian3(-0.5, -0.5, +0.5);
    expect(orientedBoundingBox).toEqual(
      new OrientedBoundingBox(
        expectedTranslation,
        Matrix3.fromScale(expectedScale, new Matrix3())
      )
    );

    // Child (1, 1, 0)
    tileX = 1;
    tileY = 1;
    tileZ = 0;
    orientedBoundingBox = shape.computeOrientedBoundingBoxForTile(
      tileLevel,
      tileX,
      tileY,
      tileZ,
      new OrientedBoundingBox()
    );
    expectedTranslation = new Cartesian3(+0.5, +0.5, -0.5);
    expect(orientedBoundingBox).toEqual(
      new OrientedBoundingBox(
        expectedTranslation,
        Matrix3.fromScale(expectedScale, new Matrix3())
      )
    );

    // Child (1, 0, 1)
    tileX = 1;
    tileY = 0;
    tileZ = 1;
    orientedBoundingBox = shape.computeOrientedBoundingBoxForTile(
      tileLevel,
      tileX,
      tileY,
      tileZ,
      new OrientedBoundingBox()
    );
    expectedTranslation = new Cartesian3(+0.5, -0.5, +0.5);
    expect(orientedBoundingBox).toEqual(
      new OrientedBoundingBox(
        expectedTranslation,
        Matrix3.fromScale(expectedScale, new Matrix3())
      )
    );

    // Child (1, 1, 1)
    tileX = 1;
    tileY = 1;
    tileZ = 1;
    orientedBoundingBox = shape.computeOrientedBoundingBoxForTile(
      tileLevel,
      tileX,
      tileY,
      tileZ,
      new OrientedBoundingBox()
    );
    expectedTranslation = new Cartesian3(+0.5, +0.5, +0.5);
    expect(orientedBoundingBox).toEqual(
      new OrientedBoundingBox(
        expectedTranslation,
        Matrix3.fromScale(expectedScale, new Matrix3())
      )
    );
  });

  it("computeOrientedBoundingBoxForTile throws with no tile coordinates parameter", function () {
    const shape = new VoxelBoxShape();
    const translation = Cartesian3.ZERO;
    const rotation = Quaternion.IDENTITY;
    const scale = Cartesian3.ONE;
    const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );
    const minBounds = VoxelBoxShape.DefaultMinBounds;
    const maxBounds = VoxelBoxShape.DefaultMaxBounds;
    shape.update(modelMatrix, minBounds, maxBounds);

    const tileLevel = 0;
    const tileX = 0;
    const tileY = 0;
    const tileZ = 0;

    expect(function () {
      return shape.computeOrientedBoundingBoxForTile(
        undefined,
        tileX,
        tileY,
        tileZ,
        new OrientedBoundingBox()
      );
    }).toThrowDeveloperError();

    expect(function () {
      return shape.computeOrientedBoundingBoxForTile(
        tileLevel,
        undefined,
        tileY,
        tileZ,
        new OrientedBoundingBox()
      );
    }).toThrowDeveloperError();

    expect(function () {
      return shape.computeOrientedBoundingBoxForTile(
        tileLevel,
        tileX,
        undefined,
        tileZ,
        new OrientedBoundingBox()
      );
    }).toThrowDeveloperError();

    expect(function () {
      return shape.computeOrientedBoundingBoxForTile(
        tileLevel,
        tileX,
        tileY,
        undefined,
        new OrientedBoundingBox()
      );
    }).toThrowDeveloperError();
  });

  it("computeOrientedBoundingBoxForTile throws with no result parameter", function () {
    const shape = new VoxelBoxShape();
    const translation = Cartesian3.ZERO;
    const rotation = Quaternion.IDENTITY;
    const scale = Cartesian3.ONE;
    const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );
    const minBounds = VoxelBoxShape.DefaultMinBounds;
    const maxBounds = VoxelBoxShape.DefaultMaxBounds;
    shape.update(modelMatrix, minBounds, maxBounds);

    const tileLevel = 0;
    const tileX = 0;
    const tileY = 0;
    const tileZ = 0;

    expect(function () {
      return shape.computeOrientedBoundingBoxForTile(
        tileLevel,
        tileX,
        tileY,
        tileZ,
        undefined
      );
    }).toThrowDeveloperError();
  });

  it("computeApproximateStepSize works", function () {
    const shape = new VoxelBoxShape();
    const translation = Cartesian3.ZERO;
    const rotation = Quaternion.IDENTITY;
    const scale = Cartesian3.ONE;
    const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );
    const minBounds = VoxelBoxShape.DefaultMinBounds;
    const maxBounds = VoxelBoxShape.DefaultMaxBounds;
    shape.update(modelMatrix, minBounds, maxBounds);

    const dimensions = new Cartesian3(32, 32, 16);
    const stepSize = shape.computeApproximateStepSize(dimensions);
    expect(stepSize).toBeGreaterThan(0.0);
    expect(stepSize).toBeLessThan(1.0);
  });

  it("computeApproximateStepSize throws with no dimensions parameter", function () {
    const shape = new VoxelBoxShape();
    const translation = Cartesian3.ZERO;
    const rotation = Quaternion.IDENTITY;
    const scale = Cartesian3.ONE;
    const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );
    const minBounds = VoxelBoxShape.DefaultMinBounds;
    const maxBounds = VoxelBoxShape.DefaultMaxBounds;
    shape.update(modelMatrix, minBounds, maxBounds);

    expect(function () {
      return shape.computeApproximateStepSize(undefined);
    }).toThrowDeveloperError();
  });
});
