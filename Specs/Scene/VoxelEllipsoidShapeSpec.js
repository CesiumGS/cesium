import {
  BoundingSphere,
  Cartesian3,
  Math as CesiumMath,
  OrientedBoundingBox,
  Matrix3,
  Matrix4,
  Quaternion,
  VoxelEllipsoidShape,
} from "../../Source/Cesium.js";

describe("Scene/VoxelEllipsoidShape", function () {
  it("constructs", function () {
    const shape = new VoxelEllipsoidShape();
    expect(shape.isVisible).toEqual(false);
  });

  it("update works with model matrix", function () {
    const shape = new VoxelEllipsoidShape();
    const translation = new Cartesian3(1.0, 2.0, 3.0);
    const scale = new Cartesian3(2.0, 2.0, 4.0);
    const angle = CesiumMath.PI_OVER_FOUR;
    const rotation = Quaternion.fromAxisAngle(Cartesian3.UNIT_Z, angle);

    const modelMatrix = Matrix4.fromTranslationQuaternionRotationScale(
      translation,
      rotation,
      scale
    );

    const minBounds = VoxelEllipsoidShape.DefaultMinBounds;
    const maxBounds = VoxelEllipsoidShape.DefaultMaxBounds;
    const maxHeight = maxBounds.z;

    const expectedOrientedBoundingBox = new OrientedBoundingBox(
      translation,
      Matrix3.fromColumnMajorArray([
        (scale.x + maxHeight) * Math.cos(angle),
        (scale.x + maxHeight) * Math.sin(angle),
        0.0,
        (scale.y + maxHeight) * Math.cos(angle + CesiumMath.PI_OVER_TWO),
        (scale.y + maxHeight) * Math.sin(angle + CesiumMath.PI_OVER_TWO),
        0.0,
        0.0,
        0.0,
        scale.z + maxHeight,
      ])
    );

    const expectedBoundingSphere = BoundingSphere.fromOrientedBoundingBox(
      expectedOrientedBoundingBox,
      new BoundingSphere()
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

    expect(
      Matrix4.getTranslation(shape.boundTransform, new Cartesian3())
    ).toEqualEpsilon(expectedOrientedBoundingBox.center, CesiumMath.EPSILON12);

    expect(
      Matrix4.getMatrix3(shape.boundTransform, new Matrix3())
    ).toEqualEpsilon(
      expectedOrientedBoundingBox.halfAxes,
      CesiumMath.EPSILON12
    );

    expect(
      Matrix4.getTranslation(shape.shapeTransform, new Cartesian3())
    ).toEqualEpsilon(expectedOrientedBoundingBox.center, CesiumMath.EPSILON12);

    expect(
      Matrix4.getMatrix3(shape.shapeTransform, new Matrix3())
    ).toEqualEpsilon(
      expectedOrientedBoundingBox.halfAxes,
      CesiumMath.EPSILON12
    );

    // expect(shape.boundTransform).toEqual(modelMatrix);
    // expect(shape.shapeTransform).toEqual(modelMatrix);
    // expect(shape.isVisible).toBeTrue();
  });

  // const PI_OVER_TWO = CesiumMath.PI_OVER_TWO;
  // const west = -PI_OVER_TWO;
  // const east = PI_OVER_TWO;
  // const south = -PI_OVER_TWO;
  // const north = PI_OVER_TWO;
  // const rectangle = new Rectangle(west, south, east, north);
  // const minimumHeight = 0.0;
  // const maximumHeight = 1000000.0;
  // let ellipsoid;
  // const scratchCartesian3 = new Cartesian3();
  // beforeEach(function () {
  //   ellipsoid = new VoxelEllipsoidShape({
  //     rectangle: rectangle,
  //     minimumHeight: minimumHeight,
  //     maximumHeight: maximumHeight,
  //   });
  //   ellipsoid.update(); // compute transforms
  // });

  // it("constructs with arguments", function () {
  //   expect(ellipsoid.ellipsoid.equals(Ellipsoid.WGS84)).toBe(true);
  //   expect(ellipsoid.rectangle.equals(rectangle)).toBe(true);
  //   expect(ellipsoid.minimumHeight).toBe(minimumHeight);
  //   expect(ellipsoid.maximumHeight).toBe(maximumHeight);
  //   expect(ellipsoid._type).toBe(VoxelShapeType.ELLIPSOID);
  // });

  // it("updates bounding shapes upon changes to ellipsoid", function () {
  //   const oldObb = ellipsoid.orientedBoundingBox.clone();
  //   const oldSphere = ellipsoid.boundingSphere.clone();
  //   ellipsoid.ellipsoid = Ellipsoid.MOON;
  //   expect(oldObb.equals(ellipsoid.orientedBoundingBox)).toBe(false);
  //   expect(oldSphere.equals(ellipsoid.boundingSphere)).toBe(false);
  // });

  // it("updates bounding shapes upon changes to rectangle", function () {
  //   const oldObb = ellipsoid.orientedBoundingBox.clone();
  //   const oldSphere = ellipsoid.boundingSphere.clone();
  //   ellipsoid.rectangle = new Rectangle(
  //     west + CesiumMath.EPSILON7,
  //     south,
  //     east,
  //     north
  //   );
  //   expect(oldObb.equals(ellipsoid.orientedBoundingBox)).toBe(false);
  //   expect(oldSphere.equals(ellipsoid.boundingSphere)).toBe(false);
  // });

  // it("updates bounding shapes upon changes to minimum height", function () {
  //   const oldObb = ellipsoid.orientedBoundingBox.clone();
  //   const oldSphere = ellipsoid.boundingSphere.clone();
  //   ellipsoid.minimumHeight += 1;
  //   expect(oldObb.equals(ellipsoid.orientedBoundingBox)).toBe(true);
  //   expect(oldSphere.equals(ellipsoid.boundingSphere)).toBe(true);
  // });

  // it("updates bounding shapes upon changes to maximum height", function () {
  //   const oldObb = ellipsoid.orientedBoundingBox.clone();
  //   const oldSphere = ellipsoid.boundingSphere.clone();
  //   ellipsoid.maximumHeight += 1;
  //   expect(oldObb.equals(ellipsoid.orientedBoundingBox)).toBe(false);
  //   expect(oldSphere.equals(ellipsoid.boundingSphere)).toBe(false);
  // });

  // it("computes shape transform", function () {
  //   const radii = Ellipsoid.WGS84._radii;
  //   const scaleX = 2.0 * (radii.x + maximumHeight);
  //   const scaleY = 2.0 * (radii.y + maximumHeight);
  //   const scaleZ = 2.0 * (radii.z + maximumHeight);
  //   const scale = Cartesian3.fromElements(scaleX, scaleY, scaleZ);
  //   const shapeTransform = Matrix4.fromScale(scale, new Matrix4());
  //   expect(shapeTransform.equals(ellipsoid._shapeTransform)).toBe(true);
  // });

  // it("can clone itself", function () {
  //   const ellipsoidClone = ellipsoid.clone();
  //   expect(ellipsoidClone).not.toBe(ellipsoid);
  //   expect(ellipsoid.ellipsoid.equals(ellipsoidClone.ellipsoid)).toBe(true);
  //   expect(ellipsoid.rectangle.equals(ellipsoidClone.rectangle)).toBe(true);
  //   expect(ellipsoid.minimumHeight).toBe(ellipsoidClone.minimumHeight);
  //   expect(ellipsoid.maximumHeight).toBe(ellipsoidClone.maximumHeight);
  // });

  // it("computes bounding volume for root tile", function () {
  //   const result = new OrientedBoundingBox();
  //   ellipsoid.computeOrientedBoundingBoxForTile(0, 0, 0, 0, result);
  //   expect(result.equals(ellipsoid.orientedBoundingBox)).toBe(true);
  // });

  // it("indicates when a point in local space is outside the shape", function () {
  //   const clippingMinimum = Cartesian3.ZERO;
  //   const clippingMaximum = Cartesian3.fromElements(1.0, 1.0, 1.0);
  //   expect(
  //     ellipsoid.localPointInsideShape(
  //       Cartesian3.ZERO,
  //       clippingMinimum,
  //       clippingMaximum
  //     )
  //   ).toBe(false);
  //   expect(
  //     ellipsoid.localPointInsideShape(
  //       Cartesian3.fromElements(0.49, 0.0, 0.0),
  //       clippingMinimum,
  //       clippingMaximum
  //     )
  //   ).toBe(true);
  // });

  // it("transforms from local to shape space", function () {
  //   const point = Cartesian3.fromElements(0.5, 0.0, 0.0);
  //   expect(
  //     ellipsoid
  //       .transformFromLocalToShapeSpace(point, scratchCartesian3)
  //       .equals(Cartesian3.fromElements(0.5, 0.5, 1.0))
  //   ).toBe(true);
  // });

  // it("intersects ray with outer shell", function () {
  //   const origin = Cartesian3.fromElements(2.0, 0.0, 0.0);
  //   const direction = Cartesian3.fromElements(-1.0, 0.0, 0.0);
  //   const ray = new Ray(origin, direction);
  //   const minClipping = Cartesian3.ZERO;
  //   const maxClipping = Cartesian3.fromElements(1.0, 1.0, 1.0);
  //   const t = ellipsoid.intersectRay(ray, minClipping, maxClipping);
  //   expect(t).toEqualEpsilon(1.0, CesiumMath.EPSILON4);
  // });

  // it("intersects ray with inner shell", function () {
  //   const origin = Cartesian3.ZERO;
  //   const direction = Cartesian3.fromElements(1.0, 0.0, 0.0);
  //   const ray = new Ray(origin, direction);
  //   const minClipping = Cartesian3.ZERO;
  //   const maxClipping = Cartesian3.fromElements(1.0, 1.0, 1.0);
  //   const t = ellipsoid.intersectRay(ray, minClipping, maxClipping);
  //   expect(t).toEqualEpsilon(
  //     1.0 - ellipsoid._ellipsoidHeightDifferenceUv,
  //     CesiumMath.EPSILON4
  //   );
  // });

  // it("intersects ray with longitude face", function () {
  //   ellipsoid.rectangle = new Rectangle(west, south, 0.0, north);
  //   const origin = Cartesian3.fromElements(0.99, 1.0, 0.0);
  //   const direction = Cartesian3.fromElements(0.0, -1.0, 0.0);
  //   const ray = new Ray(origin, direction);
  //   const minClipping = Cartesian3.fromElements(-1.0, -1.0, -1.0);
  //   const maxClipping = Cartesian3.fromElements(1.0, 1.0, 1.0);
  //   const t = ellipsoid.intersectRay(ray, minClipping, maxClipping);
  //   expect(t).toEqualEpsilon(1.0, CesiumMath.EPSILON4);
  // });

  // it("intersects ray with latitude face", function () {
  //   ellipsoid.rectangle = new Rectangle(west, south, east, 0.0);
  //   const origin = Cartesian3.fromElements(0.99, 0.0, 1.0);
  //   const direction = Cartesian3.fromElements(0.0, 0.0, -1.0);
  //   const ray = new Ray(origin, direction);
  //   const minClipping = Cartesian3.fromElements(-1.0, -1.0, -1.0);
  //   const maxClipping = Cartesian3.fromElements(1.0, 1.0, 1.0);
  //   const t = ellipsoid.intersectRay(ray, minClipping, maxClipping);
  //   expect(t).toEqualEpsilon(1.0, CesiumMath.EPSILON4);
  // });
  // }),
});
