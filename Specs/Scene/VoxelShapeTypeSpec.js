import {
  PrimitiveType,
  VoxelBoxShape,
  VoxelCylinderShape,
  VoxelEllipsoidShape,
  VoxelShapeType,
} from "../../Source/Cesium.js";

describe("Scene/VoxelShapeType", function () {
  it("fromPrimitiveType works", function () {
    expect(VoxelShapeType.fromPrimitiveType(PrimitiveType.VOXEL_BOX)).toBe(
      VoxelShapeType.BOX
    );
    expect(
      VoxelShapeType.fromPrimitiveType(PrimitiveType.VOXEL_ELLIPSOID)
    ).toBe(VoxelShapeType.ELLIPSOID);
    expect(VoxelShapeType.fromPrimitiveType(PrimitiveType.VOXEL_CYLINDER)).toBe(
      VoxelShapeType.CYLINDER
    );
  });
  it("fromPrimitiveType throws for invalid type", function () {
    expect(function () {
      return VoxelShapeType.fromPrimitiveType("NOT_A_PRIMITIVE_TYPE");
    }).toThrowDeveloperError();
  });

  it("toShapeConstructor works", function () {
    expect(VoxelShapeType.toShapeConstructor(VoxelShapeType.BOX)).toBe(
      VoxelBoxShape
    );
    expect(VoxelShapeType.toShapeConstructor(VoxelShapeType.ELLIPSOID)).toBe(
      VoxelEllipsoidShape
    );
    expect(VoxelShapeType.toShapeConstructor(VoxelShapeType.CYLINDER)).toBe(
      VoxelCylinderShape
    );
  });
  it("toShapeConstructor throws for invalid type", function () {
    expect(function () {
      return VoxelShapeType.toShapeConstructor("NOT_A_SHAPE_TYPE");
    }).toThrowDeveloperError();
  });
});
