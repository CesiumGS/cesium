import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import Color from "../Core/Color.js";
import combine from "../Core/combine.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import getJsonFromTypedArray from "../Core/getJsonFromTypedArray.js";
import RuntimeError from "../Core/RuntimeError.js";
import AttributeType from "./AttributeType.js";
import Cesium3DTileFeatureTable from "./Cesium3DTileFeatureTable.js";
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";

/**
 * Handles parsing of a Point Cloud
 *
 * @namespace PntsParser
 * @private
 */
const PntsParser = {};

const sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

/**
 * Parses the contents of a {@link https://github.com/CesiumGS/3d-tiles/tree/main/specification/TileFormats/PointCloud|Point Cloud}.
 *
 * @private
 *
 * @param {*} arrayBuffer The array buffer containing the pnts
 * @param {*} [byteOffset=0] The byte offset of the beginning of the pnts in the array buffer
 * @returns {object} An object containing a parsed representation of the point cloud
 */
PntsParser.parse = function (arrayBuffer, byteOffset) {
  byteOffset = defaultValue(byteOffset, 0);
  //>>includeStart('debug', pragmas.debug);
  Check.defined("arrayBuffer", arrayBuffer);
  //>>includeEnd('debug');

  const uint8Array = new Uint8Array(arrayBuffer);
  const view = new DataView(arrayBuffer);
  byteOffset += sizeOfUint32; // Skip magic

  const version = view.getUint32(byteOffset, true);
  if (version !== 1) {
    throw new RuntimeError(
      `Only Point Cloud tile version 1 is supported.  Version ${version} is not.`,
    );
  }
  byteOffset += sizeOfUint32;

  // Skip byteLength
  byteOffset += sizeOfUint32;

  const featureTableJsonByteLength = view.getUint32(byteOffset, true);
  if (featureTableJsonByteLength === 0) {
    throw new RuntimeError(
      "Feature table must have a byte length greater than zero",
    );
  }
  byteOffset += sizeOfUint32;

  const featureTableBinaryByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;

  const batchTableJsonByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  const batchTableBinaryByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;

  const featureTableJson = getJsonFromTypedArray(
    uint8Array,
    byteOffset,
    featureTableJsonByteLength,
  );
  byteOffset += featureTableJsonByteLength;

  const featureTableBinary = new Uint8Array(
    arrayBuffer,
    byteOffset,
    featureTableBinaryByteLength,
  );
  byteOffset += featureTableBinaryByteLength;

  // Get the batch table JSON and binary
  let batchTableJson;
  let batchTableBinary;
  if (batchTableJsonByteLength > 0) {
    // Has a batch table JSON
    batchTableJson = getJsonFromTypedArray(
      uint8Array,
      byteOffset,
      batchTableJsonByteLength,
    );
    byteOffset += batchTableJsonByteLength;

    if (batchTableBinaryByteLength > 0) {
      // Has a batch table binary
      batchTableBinary = new Uint8Array(
        arrayBuffer,
        byteOffset,
        batchTableBinaryByteLength,
      );
      byteOffset += batchTableBinaryByteLength;
    }
  }

  const featureTable = new Cesium3DTileFeatureTable(
    featureTableJson,
    featureTableBinary,
  );

  const pointsLength = featureTable.getGlobalProperty("POINTS_LENGTH");
  featureTable.featuresLength = pointsLength;

  if (!defined(pointsLength)) {
    throw new RuntimeError(
      "Feature table global property: POINTS_LENGTH must be defined",
    );
  }

  let rtcCenter = featureTable.getGlobalProperty(
    "RTC_CENTER",
    ComponentDatatype.FLOAT,
    3,
  );
  if (defined(rtcCenter)) {
    rtcCenter = Cartesian3.unpack(rtcCenter);
  }

  // Start with the draco compressed properties and add in uncompressed
  // properties.
  const parsedContent = parseDracoProperties(featureTable, batchTableJson);
  parsedContent.rtcCenter = rtcCenter;
  parsedContent.pointsLength = pointsLength;

  if (!parsedContent.hasPositions) {
    const positions = parsePositions(featureTable);
    parsedContent.positions = positions;
    parsedContent.hasPositions =
      parsedContent.hasPositions || defined(positions);
  }

  if (!parsedContent.hasPositions) {
    throw new RuntimeError(
      "Either POSITION or POSITION_QUANTIZED must be defined.",
    );
  }

  if (!parsedContent.hasNormals) {
    const normals = parseNormals(featureTable);
    parsedContent.normals = normals;
    parsedContent.hasNormals = parsedContent.hasNormals || defined(normals);
  }

  if (!parsedContent.hasColors) {
    const colors = parseColors(featureTable);
    parsedContent.colors = colors;
    parsedContent.hasColors = parsedContent.hasColors || defined(colors);
    parsedContent.hasConstantColor = defined(parsedContent.constantColor);
    parsedContent.isTranslucent = defined(colors) && colors.isTranslucent;
  }

  if (!parsedContent.hasBatchIds) {
    const batchIds = parseBatchIds(featureTable);
    parsedContent.batchIds = batchIds;
    parsedContent.hasBatchIds = parsedContent.hasBatchIds || defined(batchIds);
  }

  if (parsedContent.hasBatchIds) {
    const batchLength = featureTable.getGlobalProperty("BATCH_LENGTH");
    if (!defined(batchLength)) {
      throw new RuntimeError(
        "Global property: BATCH_LENGTH must be defined when BATCH_ID is defined.",
      );
    }
    parsedContent.batchLength = batchLength;
  }

  if (defined(batchTableBinary)) {
    // Copy the batchTableBinary section and let the underlying ArrayBuffer be freed
    batchTableBinary = new Uint8Array(batchTableBinary);
    parsedContent.batchTableJson = batchTableJson;
    parsedContent.batchTableBinary = batchTableBinary;
  }

  return parsedContent;
};

function parseDracoProperties(featureTable, batchTableJson) {
  const featureTableJson = featureTable.json;
  let dracoBuffer;
  let dracoFeatureTableProperties;
  let dracoBatchTableProperties;

  const featureTableDraco = defined(featureTableJson.extensions)
    ? featureTableJson.extensions["3DTILES_draco_point_compression"]
    : undefined;
  const batchTableDraco =
    defined(batchTableJson) && defined(batchTableJson.extensions)
      ? batchTableJson.extensions["3DTILES_draco_point_compression"]
      : undefined;

  if (defined(batchTableDraco)) {
    dracoBatchTableProperties = batchTableDraco.properties;
  }

  let hasPositions;
  let hasColors;
  let hasNormals;
  let hasBatchIds;
  let isTranslucent;
  if (defined(featureTableDraco)) {
    dracoFeatureTableProperties = featureTableDraco.properties;
    const dracoByteOffset = featureTableDraco.byteOffset;
    const dracoByteLength = featureTableDraco.byteLength;
    if (
      !defined(dracoFeatureTableProperties) ||
      !defined(dracoByteOffset) ||
      !defined(dracoByteLength)
    ) {
      throw new RuntimeError(
        "Draco properties, byteOffset, and byteLength must be defined",
      );
    }
    dracoBuffer = featureTable.buffer.slice(
      dracoByteOffset,
      dracoByteOffset + dracoByteLength,
    );
    hasPositions = defined(dracoFeatureTableProperties.POSITION);
    hasColors =
      defined(dracoFeatureTableProperties.RGB) ||
      defined(dracoFeatureTableProperties.RGBA);
    hasNormals = defined(dracoFeatureTableProperties.NORMAL);
    hasBatchIds = defined(dracoFeatureTableProperties.BATCH_ID);
    isTranslucent = defined(dracoFeatureTableProperties.RGBA);
  }

  let draco;
  if (defined(dracoBuffer)) {
    draco = {
      buffer: dracoBuffer,
      featureTableProperties: dracoFeatureTableProperties,
      batchTableProperties: dracoBatchTableProperties,
      properties: combine(
        dracoFeatureTableProperties,
        dracoBatchTableProperties,
      ),
      dequantizeInShader: true,
    };
  }

  return {
    draco: draco,
    hasPositions: hasPositions,
    hasColors: hasColors,
    isTranslucent: isTranslucent,
    hasNormals: hasNormals,
    hasBatchIds: hasBatchIds,
  };
}

function parsePositions(featureTable) {
  const featureTableJson = featureTable.json;

  let positions;
  if (defined(featureTableJson.POSITION)) {
    positions = featureTable.getPropertyArray(
      "POSITION",
      ComponentDatatype.FLOAT,
      3,
    );

    return {
      name: VertexAttributeSemantic.POSITION,
      semantic: VertexAttributeSemantic.POSITION,
      typedArray: positions,
      isQuantized: false,
      componentDatatype: ComponentDatatype.FLOAT,
      type: AttributeType.VEC3,
    };
  } else if (defined(featureTableJson.POSITION_QUANTIZED)) {
    positions = featureTable.getPropertyArray(
      "POSITION_QUANTIZED",
      ComponentDatatype.UNSIGNED_SHORT,
      3,
    );

    const quantizedVolumeScale = featureTable.getGlobalProperty(
      "QUANTIZED_VOLUME_SCALE",
      ComponentDatatype.FLOAT,
      3,
    );
    if (!defined(quantizedVolumeScale)) {
      throw new RuntimeError(
        "Global property: QUANTIZED_VOLUME_SCALE must be defined for quantized positions.",
      );
    }
    const quantizedRange = (1 << 16) - 1;

    const quantizedVolumeOffset = featureTable.getGlobalProperty(
      "QUANTIZED_VOLUME_OFFSET",
      ComponentDatatype.FLOAT,
      3,
    );
    if (!defined(quantizedVolumeOffset)) {
      throw new RuntimeError(
        "Global property: QUANTIZED_VOLUME_OFFSET must be defined for quantized positions.",
      );
    }

    return {
      name: VertexAttributeSemantic.POSITION,
      semantic: VertexAttributeSemantic.POSITION,
      typedArray: positions,
      isQuantized: true,
      componentDatatype: ComponentDatatype.FLOAT,
      type: AttributeType.VEC3,
      quantizedRange: quantizedRange,
      quantizedVolumeOffset: Cartesian3.unpack(quantizedVolumeOffset),
      quantizedVolumeScale: Cartesian3.unpack(quantizedVolumeScale),
      quantizedComponentDatatype: ComponentDatatype.UNSIGNED_SHORT,
      quantizedType: AttributeType.VEC3,
    };
  }
}

function parseColors(featureTable) {
  const featureTableJson = featureTable.json;

  let colors;
  if (defined(featureTableJson.RGBA)) {
    colors = featureTable.getPropertyArray(
      "RGBA",
      ComponentDatatype.UNSIGNED_BYTE,
      4,
    );
    return {
      name: VertexAttributeSemantic.COLOR,
      semantic: VertexAttributeSemantic.COLOR,
      setIndex: 0,
      typedArray: colors,
      componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
      type: AttributeType.VEC4,
      normalized: true,
      isRGB565: false,
      isTranslucent: true,
    };
  } else if (defined(featureTableJson.RGB)) {
    colors = featureTable.getPropertyArray(
      "RGB",
      ComponentDatatype.UNSIGNED_BYTE,
      3,
    );
    return {
      name: "COLOR",
      semantic: VertexAttributeSemantic.COLOR,
      setIndex: 0,
      typedArray: colors,
      componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
      type: AttributeType.VEC3,
      normalized: true,
      isRGB565: false,
      isTranslucent: false,
    };
  } else if (defined(featureTableJson.RGB565)) {
    colors = featureTable.getPropertyArray(
      "RGB565",
      ComponentDatatype.UNSIGNED_SHORT,
      1,
    );
    return {
      name: "COLOR",
      semantic: VertexAttributeSemantic.COLOR,
      setIndex: 0,
      typedArray: colors,
      // These settings are for the Model implementation
      // which decodes on the CPU and uploads a VEC3 of float colors.
      // PointCloud does the decoding on the GPU so uploads a
      // UNSIGNED_SHORT instead.
      componentDatatype: ComponentDatatype.FLOAT,
      type: AttributeType.VEC3,
      normalized: false,
      isRGB565: true,
      isTranslucent: false,
    };
  } else if (defined(featureTableJson.CONSTANT_RGBA)) {
    const constantRGBA = featureTable.getGlobalProperty(
      "CONSTANT_RGBA",
      ComponentDatatype.UNSIGNED_BYTE,
      4,
    );

    const alpha = constantRGBA[3];
    const constantColor = Color.fromBytes(
      constantRGBA[0],
      constantRGBA[1],
      constantRGBA[2],
      alpha,
    );

    const isTranslucent = alpha < 255;
    return {
      name: VertexAttributeSemantic.COLOR,
      semantic: VertexAttributeSemantic.COLOR,
      setIndex: 0,
      constantColor: constantColor,
      componentDatatype: ComponentDatatype.FLOAT,
      type: AttributeType.VEC4,
      isQuantized: false,
      isTranslucent: isTranslucent,
    };
  }

  return undefined;
}

function parseNormals(featureTable) {
  const featureTableJson = featureTable.json;
  let normals;
  if (defined(featureTableJson.NORMAL)) {
    normals = featureTable.getPropertyArray(
      "NORMAL",
      ComponentDatatype.FLOAT,
      3,
    );
    return {
      name: VertexAttributeSemantic.NORMAL,
      semantic: VertexAttributeSemantic.NORMAL,
      typedArray: normals,
      octEncoded: false,
      octEncodedZXY: false,
      componentDatatype: ComponentDatatype.FLOAT,
      type: AttributeType.VEC3,
    };
  } else if (defined(featureTableJson.NORMAL_OCT16P)) {
    normals = featureTable.getPropertyArray(
      "NORMAL_OCT16P",
      ComponentDatatype.UNSIGNED_BYTE,
      2,
    );
    const quantizationBits = 8;
    return {
      name: VertexAttributeSemantic.NORMAL,
      semantic: VertexAttributeSemantic.NORMAL,
      typedArray: normals,
      octEncoded: true,
      octEncodedZXY: false,
      quantizedRange: (1 << quantizationBits) - 1,
      quantizedType: AttributeType.VEC2,
      quantizedComponentDatatype: ComponentDatatype.UNSIGNED_BYTE,
      componentDatatype: ComponentDatatype.FLOAT,
      type: AttributeType.VEC3,
    };
  }

  return undefined;
}

function parseBatchIds(featureTable) {
  const featureTableJson = featureTable.json;
  if (defined(featureTableJson.BATCH_ID)) {
    const batchIds = featureTable.getPropertyArray(
      "BATCH_ID",
      ComponentDatatype.UNSIGNED_SHORT,
      1,
    );
    return {
      name: VertexAttributeSemantic.FEATURE_ID,
      semantic: VertexAttributeSemantic.FEATURE_ID,
      setIndex: 0,
      typedArray: batchIds,
      componentDatatype: ComponentDatatype.fromTypedArray(batchIds),
      type: AttributeType.SCALAR,
    };
  }

  return undefined;
}

export default PntsParser;
