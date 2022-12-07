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
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
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
 * Gets the minimum bounds as defined by <code>EXT_primitive_voxels</code>.
 * @param {VoxelShapeType} shapeType The voxel shape type.
 * @returns {Cartesian3} The minimum bounds.
 */
VoxelShapeType.getMinBounds = function (shapeType) {
  switch (shapeType) {
    case VoxelShapeType.BOX:
      return VoxelBoxShape.DefaultMinBounds;
    case VoxelShapeType.ELLIPSOID:
      return VoxelEllipsoidShape.DefaultMinBounds;
    case VoxelShapeType.CYLINDER:
      return VoxelCylinderShape.DefaultMinBounds;
    //>>includeStart('debug', pragmas.debug);
    default:
      throw new DeveloperError(`Invalid shape type ${shapeType}`);
    //>>includeEnd('debug');
  }
};

/**
 * Gets the maximum bounds as defined by <code>EXT_primitive_voxels</code>.
 * @param {VoxelShapeType} shapeType The voxel shape type.
 * @returns {Cartesian3} The maximum bounds.
 */
VoxelShapeType.getMaxBounds = function (shapeType) {
  switch (shapeType) {
    case VoxelShapeType.BOX:
      return VoxelBoxShape.DefaultMaxBounds;
    case VoxelShapeType.ELLIPSOID:
      return VoxelEllipsoidShape.DefaultMaxBounds;
    case VoxelShapeType.CYLINDER:
      return VoxelCylinderShape.DefaultMaxBounds;
    //>>includeStart('debug', pragmas.debug);
    default:
      throw new DeveloperError(`Invalid shape type ${shapeType}`);
    //>>includeEnd('debug');
  }
};

/**
 * Converts a primitive type to a voxel shape. glTF voxel primitive types are
 * defined by </code>EXT_primitive_voxels</code>.
 *
 * @param {PrimitiveType} primitiveType The primitive type.
 * @returns {VoxelShapeType} The shape type.
 *
 * @private
 */
VoxelShapeType.fromPrimitiveType = function (primitiveType) {
  switch (primitiveType) {
    case PrimitiveType.VOXEL_BOX:
      return VoxelShapeType.BOX;
    case PrimitiveType.VOXEL_ELLIPSOID:
      return VoxelShapeType.ELLIPSOID;
    case PrimitiveType.VOXEL_CYLINDER:
      return VoxelShapeType.CYLINDER;
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
 *
 * @param {VoxelShapeType} shapeType The shape type.
 * @returns {Function} The shape's constructor.
 *
 * @private
 */
VoxelShapeType.getShapeConstructor = function (shapeType) {
  switch (shapeType) {
    case VoxelShapeType.BOX:
      return VoxelBoxShape;
    case VoxelShapeType.ELLIPSOID:
      return VoxelEllipsoidShape;
    case VoxelShapeType.CYLINDER:
      return VoxelCylinderShape;
    //>>includeStart('debug', pragmas.debug);
    default:
      throw new DeveloperError(`Invalid shape type ${shapeType}`);
    //>>includeEnd('debug');
  }
};

export default Object.freeze(VoxelShapeType);
