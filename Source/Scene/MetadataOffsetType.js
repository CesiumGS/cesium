import ComponentDatatype from "../Core/ComponentDatatype.js";

/**
 * An enum of metadata offset types.
 *
 * @exports MetadataOffsetType
 *
 * @private
 */
var MetadataOffsetType = {
  UINT8: "UINT8",
  UINT16: "UINT16",
  UINT32: "UINT32",
  UINT64: "UINT64",
};

/**
 * Returns the ComponentDatatype matching the offset type
 *
 * @param {MetadataOffsetType} offsetType The offset type.
 * @returns {ComponentDatatype} The ComponentDatatype.
 */
MetadataOffsetType.getComponentDatatype = function (offsetType) {
  switch (offsetType) {
    case MetadataOffsetType.UINT8:
      return ComponentDatatype.UNSIGNED_BYTE;
    case MetadataOffsetType.UINT16:
      return ComponentDatatype.UNSIGNED_SHORT;
    case MetadataOffsetType.UINT32:
      return ComponentDatatype.UNSIGNED_INT;
  }
};

export default Object.freeze(MetadataOffsetType);
