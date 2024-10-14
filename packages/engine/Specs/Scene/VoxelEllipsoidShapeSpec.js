import {
  BoundingSphere,
  Cartesian3,
  Math as CesiumMath,
  OrientedBoundingBox,
  Matrix3,
  Matrix4,
  Quaternion,
  SpatialNode,
  VoxelShape,
  VoxelEllipsoidShape,
} from "../../index.js";

describe("Scene/VoxelEllipsoidShape", function () {
  it("conforms to VoxelShape interface", function () {
    expect(VoxelEllipsoidShape).toConformToInterface(VoxelShape);
  });

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
      scale,
    );

    const minBounds = new Cartesian3(
      -CesiumMath.PI,
      -CesiumMath.PI_OVER_TWO,
      0.0,
    );
    const maxBounds = new Cartesian3(
      +CesiumMath.PI,
      +CesiumMath.PI_OVER_TWO,
      100000,
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
      ]),
    );

    const expectedBoundingSphere = BoundingSphere.fromOrientedBoundingBox(
      expectedOrientedBoundingBox,
      new BoundingSphere(),
    );

    const visible = shape.update(modelMatrix, minBounds, maxBounds);

    expect(shape.orientedBoundingBox.center).toEqual(
      expectedOrientedBoundingBox.center,
    );
    expect(shape.orientedBoundingBox.halfAxes).toEqualEpsilon(
      expectedOrientedBoundingBox.halfAxes,
      CesiumMath.EPSILON9,
    );
    expect(shape.boundingSphere).toEqual(expectedBoundingSphere);

    expect(
      Matrix4.getTranslation(shape.boundTransform, new Cartesian3()),
    ).toEqualEpsilon(expectedOrientedBoundingBox.center, CesiumMath.EPSILON12);

    expect(
      Matrix4.getMatrix3(shape.boundTransform, new Matrix3()),
    ).toEqualEpsilon(expectedOrientedBoundingBox.halfAxes, CesiumMath.EPSILON9);

    expect(
      Matrix4.getTranslation(shape.shapeTransform, new Cartesian3()),
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
      CesiumMath.EPSILON9,
    );
    expect(visible).toBeTrue();
  });

  it("computeOrientedBoundingBoxForTile returns oriented bounding box for a specified tile", () => {
    const shape = new VoxelEllipsoidShape();
    const translation = Cartesian3.ZERO;
    const scale = Cartesian3.ONE;
    const rotation = Quaternion.IDENTITY;
    const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale,
    );

    const minBounds = new Cartesian3(
      -CesiumMath.PI,
      -CesiumMath.PI_OVER_TWO,
      -0.5,
    );
    const maxBounds = new Cartesian3(
      CesiumMath.PI,
      CesiumMath.PI_OVER_TWO,
      0.0,
    );
    shape.update(modelMatrix, minBounds, maxBounds);
    let result = new OrientedBoundingBox();
    result = shape.computeOrientedBoundingBoxForTile(0, 0, 0, 0, result);
    expect(result.center).toEqual(Cartesian3.ZERO);
    // The OBB has somewhat arbitrary axis definitions
    const expectedHalfAxes = new Matrix3(0, 0, 1, 1, 0, 0, 0, 1, 0);
    expect(result.halfAxes).toEqualEpsilon(
      expectedHalfAxes,
      CesiumMath.EPSILON12,
    );
  });

  it("computeOrientedBoundingBoxForTile throws with missing parameters", () => {
    const shape = new VoxelEllipsoidShape();
    const translation = Cartesian3.ZERO;
    const scale = Cartesian3.ONE;
    const rotation = Quaternion.IDENTITY;
    const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale,
    );
    const minBounds = VoxelEllipsoidShape.DefaultMinBounds;
    const maxBounds = VoxelEllipsoidShape.DefaultMaxBounds;
    shape.update(modelMatrix, minBounds, maxBounds);

    const result = new OrientedBoundingBox();
    expect(function () {
      shape.computeOrientedBoundingBoxForTile(undefined, 0, 0, 0, result);
    }).toThrowDeveloperError();
    expect(function () {
      shape.computeOrientedBoundingBoxForTile(0, undefined, 0, 0, result);
    }).toThrowDeveloperError();
    expect(function () {
      shape.computeOrientedBoundingBoxForTile(0, 0, undefined, 0, result);
    }).toThrowDeveloperError();
    expect(function () {
      shape.computeOrientedBoundingBoxForTile(0, 0, 0, undefined, result);
    }).toThrowDeveloperError();
    expect(function () {
      shape.computeOrientedBoundingBoxForTile(0, 0, 0, 0, undefined);
    }).toThrowDeveloperError();
  });

  it("computeOrientedBoundingBoxForSample returns oriented bounding box for a specified sample", () => {
    const shape = new VoxelEllipsoidShape();
    const translation = Cartesian3.ZERO;
    const scale = Cartesian3.ONE;
    const rotation = Quaternion.IDENTITY;
    const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale,
    );
    const minBounds = new Cartesian3(
      -CesiumMath.PI,
      -CesiumMath.PI_OVER_TWO,
      -1.0,
    );
    const maxBounds = new Cartesian3(
      CesiumMath.PI,
      CesiumMath.PI_OVER_TWO,
      0.0,
    );
    shape.update(modelMatrix, minBounds, maxBounds);

    const tileLevel = 0;
    const tileX = 0;
    const tileY = 0;
    const tileZ = 0;
    const tileDimensions = new Cartesian3(16, 8, 8);
    const paddedDimensions = new Cartesian3(18, 10, 10);
    const spatialNode = new SpatialNode(
      tileLevel,
      tileX,
      tileY,
      tileZ,
      undefined,
      shape,
      paddedDimensions,
    );

    const tileUv = new Cartesian3(0.5, 0.5, 0.5);
    const sampleBoundingBox = shape.computeOrientedBoundingBoxForSample(
      spatialNode,
      tileDimensions,
      tileUv,
      new OrientedBoundingBox(),
    );

    const centerLongitude = Math.PI / 16.0;
    const centerLatitude = Math.PI / 16.0;
    const centerRadius = 0.553;
    const expectedCenter = new Cartesian3(
      centerRadius * Math.cos(centerLongitude) * Math.cos(centerLatitude),
      centerRadius * Math.sin(centerLongitude) * Math.cos(centerLatitude),
      centerRadius * Math.sin(centerLatitude),
    );
    expect(sampleBoundingBox.center).toEqualEpsilon(
      expectedCenter,
      CesiumMath.EPSILON2,
    );
  });

  it("computeOrientedBoundingBoxForSample throws with missing parameters", () => {
    const shape = new VoxelEllipsoidShape();
    const translation = Cartesian3.ZERO;
    const scale = Cartesian3.ONE;
    const rotation = Quaternion.IDENTITY;
    const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale,
    );
    const minBounds = new Cartesian3(
      -CesiumMath.PI,
      -CesiumMath.PI_OVER_TWO,
      -1.0,
    );
    const maxBounds = new Cartesian3(
      CesiumMath.PI,
      CesiumMath.PI_OVER_TWO,
      0.0,
    );
    shape.update(modelMatrix, minBounds, maxBounds);

    const tileLevel = 0;
    const tileX = 0;
    const tileY = 0;
    const tileZ = 0;
    const tileDimensions = new Cartesian3(16, 8, 8);
    const paddedDimensions = new Cartesian3(18, 10, 10);
    const spatialNode = new SpatialNode(
      tileLevel,
      tileX,
      tileY,
      tileZ,
      undefined,
      shape,
      paddedDimensions,
    );
    const tileUv = new Cartesian3(0.5, 0.5, 0.5);

    const result = new OrientedBoundingBox();
    expect(function () {
      shape.computeOrientedBoundingBoxForSample(
        undefined,
        tileDimensions,
        tileUv,
        result,
      );
    }).toThrowDeveloperError();
    expect(function () {
      shape.computeOrientedBoundingBoxForSample(
        spatialNode,
        undefined,
        tileUv,
        result,
      );
    }).toThrowDeveloperError();
    expect(function () {
      shape.computeOrientedBoundingBoxForSample(
        spatialNode,
        tileDimensions,
        undefined,
        result,
      );
    }).toThrowDeveloperError();
    expect(function () {
      shape.computeOrientedBoundingBoxForSample(
        spatialNode,
        tileDimensions,
        tileUv,
        undefined,
      );
    }).toThrowDeveloperError();
  });
});
