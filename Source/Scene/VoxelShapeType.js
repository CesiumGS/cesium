import DeveloperError from "../Core/DeveloperError.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import VoxelBoxShape from "./VoxelBoxShape.js";
import VoxelCylinderShape from "./VoxelCylinderShape.js";
import VoxelEllipsoidShape from "./VoxelEllipsoidShape.js";

/**
 * An enum of voxel shapes supported by <code>EXT_primitive_voxels</code>. The shape controls
 * how the voxel grid is mapped to 3D space.
 *
 * @enum VoxelShapeType
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 * @see VoxelShape
 * @see VoxelBoxShape
 * @see VoxelEllipsoidShape
 * @see VoxelCylinderShape
 */
const VoxelShapeType = {
  /**
   * A box shape.
   *
   * @type {String}
   * @constant
   * @private
   */
  BOX: "BOX",
  /**
   * An ellipsoid shape.
   *
   * @type {String}
   * @constant
   * @private
   */
  ELLIPSOID: "ELLIPSOID",
  /**
   * A cylinder shape.
   *
   * @type {String}
   * @constant
   * @private
   */
  CYLINDER: "CYLINDER",
};

/**
 * Converts a primitive type to a voxel shape. glTF voxel primitive types are
 * defined in </code>EXT_primitive_voxels</code>.
 * @param {PrimitiveType} primitiveType The primitive type.
 * @returns {VoxelShapeType} The shape type.
 * @private
 */
VoxelShapeType.fromPrimitiveType = function (primitiveType) {
  switch (primitiveType) {
    case PrimitiveType.VOXEL_BOX:
      return VoxelShapeType.BOX;
    case PrimitiveType.VOXEL_CYLINDER:
      return VoxelShapeType.CYLINDER;
    case PrimitiveType.VOXEL_ELLIPSOID:
      return VoxelShapeType.ELLIPSOID;
    //>>includeStart('debug', pragmas.debug);
    default:
      throw new DeveloperError(`Invalid primitive type ${primitiveType}`);
    //>>includeEnd('debug');
  }
};

/**
 * Converts a shape type to a constructor that can be used to create a shape
 * object or get per-shape properties like DefaultMinBounds and
 * DefaultMaxBounds.
 * @param {VoxelShapeType} shapeType The shape type.
 * @returns {Function} The shape's constructor.
 * @private
 */
VoxelShapeType.toShapeConstructor = function (shapeType) {
  switch (shapeType) {
    case VoxelShapeType.BOX:
      return VoxelBoxShape;
    case VoxelShapeType.CYLINDER:
      return VoxelCylinderShape;
    case VoxelShapeType.ELLIPSOID:
      return VoxelEllipsoidShape;
    //>>includeStart('debug', pragmas.debug);
    default:
      throw new DeveloperError(`Invalid shape type ${shapeType}`);
    //>>includeEnd('debug');
  }
};

export default Object.freeze(VoxelShapeType);
