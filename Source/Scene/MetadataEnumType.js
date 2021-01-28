import ComponentDatatype from "../Core/ComponentDatatype.js";

/**
 * An enum of metadata enum types.
 *
 * @exports MetadataEnumType
 *
 * @private
 */
var MetadataEnumType = {
  INT8: "INT8",
  UINT8: "UINT8",
  INT16: "INT16",
  UINT16: "UINT16",
  INT32: "INT32",
  UINT32: "UINT32",
  INT64: "INT64",
  UINT64: "UINT64",
};

/**
 * Returns the ComponentDatatype matching the enum type
 *
 * @param {MetadataEnumType} enumType The enum type.
 * @returns {ComponentDatatype} The ComponentDatatype.
 */
MetadataEnumType.getComponentDatatype = function (enumType) {
  switch (enumType) {
    case MetadataEnumType.INT8:
      return ComponentDatatype.BYTE;
    case MetadataEnumType.UINT8:
      return ComponentDatatype.UNSIGNED_BYTE;
    case MetadataEnumType.INT16:
      return ComponentDatatype.SHORT;
    case MetadataEnumType.UINT16:
      return ComponentDatatype.UNSIGNED_SHORT;
    case MetadataEnumType.INT32:
      return ComponentDatatype.INT;
    case MetadataEnumType.UINT32:
      return ComponentDatatype.UNSIGNED_INT;
  }
};

export default Object.freeze(MetadataEnumType);
