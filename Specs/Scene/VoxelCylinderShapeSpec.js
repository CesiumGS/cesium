import {
  BoundingSphere,
  Cartesian3,
  Math as CesiumMath,
  Matrix3,
  Matrix4,
  OrientedBoundingBox,
  Quaternion,
  VoxelCylinderShape,
} from "../../Source/Cesium.js";

describe(
  "Scene/VoxelCylinderShape",
  function () {
    it("constructs", function () {
      const shape = new VoxelCylinderShape();
      expect(shape.isVisible).toEqual(false);
    });

    it("update works with model matrix", function () {
      const shape = new VoxelCylinderShape();

      const translation = new Cartesian3(1.0, 2.0, 3.0);
      const scale = new Cartesian3(2.0, 3.0, 4.0);
      const halfScale = Cartesian3.multiplyByScalar(
        scale,
        0.5,
        new Cartesian3()
      );
      const angle = CesiumMath.PI_OVER_FOUR;
      const rotation = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, angle);
      const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
        translation,
        rotation,
        scale
      );
      const minBounds = VoxelCylinderShape.DefaultMinBounds;
      const maxBounds = VoxelCylinderShape.DefaultMaxBounds;

      shape.update(modelMatrix, minBounds, maxBounds);

      const expectedOrientedBoundingBox = new OrientedBoundingBox(
        translation,
        Matrix3.fromColumnMajorArray([
          halfScale.x * Math.cos(angle),
          halfScale.x * Math.sin(angle),
          0.0,
          halfScale.y * Math.cos(angle + CesiumMath.PI_OVER_TWO),
          halfScale.y * Math.sin(angle + CesiumMath.PI_OVER_TWO),
          0.0,
          0.0,
          0.0,
          halfScale.z,
        ])
      );
      const expectedBoundingSphere = new BoundingSphere(
        translation,
        Cartesian3.magnitude(halfScale)
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
      expect(shape.isVisible).toBeTrue();
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
      shape.update(modelMatrix, minBounds, maxBounds);

      const expectedMinX = translation.x - maxRadius * scale.x;
      const expectedMaxX = translation.x + maxRadius * scale.x;
      const expectedMinY = translation.y + minHeight * scale.y;
      const expectedMaxY = translation.y + maxHeight * scale.y;
      const expectedMinZ = translation.z - maxRadius * scale.z;
      const expectedMaxZ = translation.z;

      const expectedScale = new Cartesian3(
        expectedMaxX - expectedMinX,
        expectedMaxY - expectedMinY,
        expectedMaxZ - expectedMinZ
      );
      const expectedTranslation = new Cartesian3(
        0.5 * (expectedMaxX + expectedMinX),
        0.5 * (expectedMaxY + expectedMinY),
        0.5 * (expectedMaxZ + expectedMinZ)
      );

      const expectedHalfScale = Cartesian3.multiplyByScalar(
        expectedScale,
        0.5,
        new Cartesian3()
      );
      const expectedOrientedBoundingBox = new OrientedBoundingBox(
        expectedTranslation,
        Matrix3.fromScale(expectedHalfScale)
      );
      const expectedBoundingSphere = new BoundingSphere(
        expectedTranslation,
        Cartesian3.magnitude(expectedHalfScale)
      );
      const expectedBoundTransform = Matrix4.setTranslation(
        Matrix4.fromScale(expectedScale, new Matrix4()),
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
      expect(shape.boundingSphere).toEqual(expectedBoundingSphere);
      expect(shape.boundTransform).toEqual(expectedBoundTransform);
      expect(shape.shapeTransform).toEqual(modelMatrix);
      expect(shape.isVisible).toBeTrue();
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
      shape.update(modelMatrix, minBounds, maxBounds);

      const expectedScale = new Cartesian3(0.5, 1.0, 1.0);
      const expectedTranslation = new Cartesian3(-0.5, 0.0, 0.0);

      const expectedHalfScale = Cartesian3.multiplyByScalar(
        expectedScale,
        0.5,
        new Cartesian3()
      );
      const expectedOrientedBoundingBox = new OrientedBoundingBox(
        expectedTranslation,
        Matrix3.fromScale(expectedHalfScale)
      );
      const expectedBoundingSphere = new BoundingSphere(
        expectedTranslation,
        Cartesian3.magnitude(expectedHalfScale)
      );
      const expectedBoundTransform = Matrix4.setTranslation(
        Matrix4.fromScale(expectedScale, new Matrix4()),
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
      expect(shape.boundingSphere).toEqual(expectedBoundingSphere);
      expect(shape.boundTransform).toEqual(expectedBoundTransform);
      expect(shape.shapeTransform).toEqual(modelMatrix);
      expect(shape.isVisible).toBeTrue();
    });
  },
  "WebGL"
);
