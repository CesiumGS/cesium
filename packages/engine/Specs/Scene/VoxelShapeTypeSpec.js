import {
  VoxelBoxShape,
  VoxelCylinderShape,
  VoxelEllipsoidShape,
  VoxelShapeType,
} from "../../index.js";

describe("Scene/VoxelShapeType", function () {
  it("getMinBounds works", function () {
    expect(VoxelShapeType.getMinBounds(VoxelShapeType.BOX)).toEqual(
      VoxelBoxShape.DefaultMinBounds
    );
    expect(VoxelShapeType.getMinBounds(VoxelShapeType.ELLIPSOID)).toEqual(
      VoxelEllipsoidShape.DefaultMinBounds
    );
    expect(VoxelShapeType.getMinBounds(VoxelShapeType.CYLINDER)).toEqual(
      VoxelCylinderShape.DefaultMinBounds
    );
  });

  it("getMinBounds throws for invalid type", function () {
    expect(function () {
      return VoxelShapeType.getMinBounds("NOT_A_SHAPE_TYPE");
    }).toThrowDeveloperError();
  });

  it("getMaxBounds works", function () {
    expect(VoxelShapeType.getMaxBounds(VoxelShapeType.BOX)).toEqual(
      VoxelBoxShape.DefaultMaxBounds
    );
    expect(VoxelShapeType.getMaxBounds(VoxelShapeType.ELLIPSOID)).toEqual(
      VoxelEllipsoidShape.DefaultMaxBounds
    );
    expect(VoxelShapeType.getMaxBounds(VoxelShapeType.CYLINDER)).toEqual(
      VoxelCylinderShape.DefaultMaxBounds
    );
  });

  it("getMaxBounds throws for invalid type", function () {
    expect(function () {
      return VoxelShapeType.getMaxBounds("NOT_A_SHAPE_TYPE");
    }).toThrowDeveloperError();
  });

  it("getShapeConstructor works", function () {
    expect(VoxelShapeType.getShapeConstructor(VoxelShapeType.BOX)).toBe(
      VoxelBoxShape
    );
    expect(VoxelShapeType.getShapeConstructor(VoxelShapeType.ELLIPSOID)).toBe(
      VoxelEllipsoidShape
    );
    expect(VoxelShapeType.getShapeConstructor(VoxelShapeType.CYLINDER)).toBe(
      VoxelCylinderShape
    );
  });

  it("getShapeConstructor throws for invalid type", function () {
    expect(function () {
      return VoxelShapeType.getShapeConstructor("NOT_A_SHAPE_TYPE");
    }).toThrowDeveloperError();
  });
});
