import {
  BoundingSphere,
  Cartesian3,
  Math as CesiumMath,
  Matrix3,
  Matrix4,
  OrientedBoundingBox,
  Quaternion,
  SpatialNode,
  VoxelShape,
  VoxelCylinderShape,
} from "../../index.js";

describe("Scene/VoxelCylinderShape", function () {
  it("conforms to VoxelShape interface", function () {
    expect(VoxelCylinderShape).toConformToInterface(VoxelShape);
  });

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

  it("computeOrientedBoundingBoxForTile throws with missing parameters", () => {
    const shape = new VoxelCylinderShape();
    const translation = Cartesian3.ZERO;
    const scale = Cartesian3.ONE;
    const rotation = Quaternion.IDENTITY;
    const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );
    const minBounds = VoxelCylinderShape.DefaultMinBounds;
    const maxBounds = VoxelCylinderShape.DefaultMaxBounds;
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

  it("computeOrientedBoundingBoxForSample gives expected result", function () {
    const shape = new VoxelCylinderShape();
    const translation = Cartesian3.ZERO;
    const rotation = Quaternion.IDENTITY;
    const scale = Cartesian3.ONE;
    const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );
    const minBounds = VoxelCylinderShape.DefaultMinBounds;
    const maxBounds = VoxelCylinderShape.DefaultMaxBounds;
    shape.update(modelMatrix, minBounds, maxBounds);

    const tileLevel = 0;
    const tileX = 0;
    const tileY = 0;
    const tileZ = 0;
    const tileDimensions = new Cartesian3(8, 8, 8);
    const paddedDimensions = new Cartesian3(10, 10, 10);
    const spatialNode = new SpatialNode(
      tileLevel,
      tileX,
      tileY,
      tileZ,
      undefined,
      shape,
      paddedDimensions
    );

    const tileUv = new Cartesian3(0.5, 0.5, 0.5);
    const sampleBoundingBox = shape.computeOrientedBoundingBoxForSample(
      spatialNode,
      tileDimensions,
      tileUv,
      new OrientedBoundingBox()
    );
    const centerAngle = Math.PI / 8.0;
    const centerRadius = 0.5434699;
    const expectedCenter = new Cartesian3(
      centerRadius * Math.cos(centerAngle),
      centerRadius * Math.sin(centerAngle),
      0.125
    );
    expect(sampleBoundingBox.center).toEqualEpsilon(
      expectedCenter,
      CesiumMath.EPSILON6
    );
    const expectedHalfAxes = new Matrix3(
      0.075324,
      -0.091529,
      0.0,
      0.0312,
      0.22097,
      0.0,
      0.0,
      0.0,
      0.125
    );
    expect(sampleBoundingBox.halfAxes).toEqualEpsilon(
      expectedHalfAxes,
      CesiumMath.EPSILON6
    );
  });

  it("computeOrientedBoundingBoxForSample throws with missing parameters", function () {
    const shape = new VoxelCylinderShape();
    const translation = Cartesian3.ZERO;
    const rotation = Quaternion.IDENTITY;
    const scale = Cartesian3.ONE;
    const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );
    const minBounds = VoxelCylinderShape.DefaultMinBounds;
    const maxBounds = VoxelCylinderShape.DefaultMaxBounds;
    shape.update(modelMatrix, minBounds, maxBounds);

    const tileLevel = 0;
    const tileX = 0;
    const tileY = 0;
    const tileZ = 0;
    const tileDimensions = new Cartesian3(8, 8, 8);
    const paddedDimensions = new Cartesian3(10, 10, 10);
    const spatialNode = new SpatialNode(
      tileLevel,
      tileX,
      tileY,
      tileZ,
      undefined,
      shape,
      paddedDimensions
    );
    const tileUv = new Cartesian3(0.5, 0.5, 0.5);

    expect(function () {
      shape.computeOrientedBoundingBoxForSample(
        undefined,
        tileDimensions,
        tileUv,
        new OrientedBoundingBox()
      );
    }).toThrowDeveloperError();
    expect(function () {
      shape.computeOrientedBoundingBoxForSample(
        spatialNode,
        undefined,
        tileUv,
        new OrientedBoundingBox()
      );
    }).toThrowDeveloperError();
    expect(function () {
      shape.computeOrientedBoundingBoxForSample(
        spatialNode,
        tileDimensions,
        undefined,
        new OrientedBoundingBox()
      );
    }).toThrowDeveloperError();
    expect(function () {
      shape.computeOrientedBoundingBoxForSample(
        spatialNode,
        tileDimensions,
        tileUv,
        undefined
      );
    }).toThrowDeveloperError();
  });
});
