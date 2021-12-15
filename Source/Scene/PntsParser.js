import arraySlice from "../Core/arraySlice.js";
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

var PntsParser = {};

var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

PntsParser.parse = function (arrayBuffer, byteOffset) {
  byteOffset = defaultValue(byteOffset, 0);
  //>>includeStart('debug', pragmas.debug);
  Check.defined("arrayBuffer", arrayBuffer);
  //>>includeEnd('debug');

  var uint8Array = new Uint8Array(arrayBuffer);
  var view = new DataView(arrayBuffer);
  byteOffset += sizeOfUint32; // Skip magic

  var version = view.getUint32(byteOffset, true);
  if (version !== 1) {
    throw new RuntimeError(
      "Only Point Cloud tile version 1 is supported.  Version " +
        version +
        " is not."
    );
  }
  byteOffset += sizeOfUint32;

  // Skip byteLength
  byteOffset += sizeOfUint32;

  var featureTableJsonByteLength = view.getUint32(byteOffset, true);
  if (featureTableJsonByteLength === 0) {
    throw new RuntimeError(
      "Feature table must have a byte length greater than zero"
    );
  }
  byteOffset += sizeOfUint32;

  var featureTableBinaryByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;

  var batchTableJsonByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;
  var batchTableBinaryByteLength = view.getUint32(byteOffset, true);
  byteOffset += sizeOfUint32;

  var featureTableJson = getJsonFromTypedArray(
    uint8Array,
    byteOffset,
    featureTableJsonByteLength
  );
  byteOffset += featureTableJsonByteLength;

  var featureTableBinary = new Uint8Array(
    arrayBuffer,
    byteOffset,
    featureTableBinaryByteLength
  );
  byteOffset += featureTableBinaryByteLength;

  // Get the batch table JSON and binary
  var batchTableJson;
  var batchTableBinary;
  if (batchTableJsonByteLength > 0) {
    // Has a batch table JSON
    batchTableJson = getJsonFromTypedArray(
      uint8Array,
      byteOffset,
      batchTableJsonByteLength
    );
    byteOffset += batchTableJsonByteLength;

    if (batchTableBinaryByteLength > 0) {
      // Has a batch table binary
      batchTableBinary = new Uint8Array(
        arrayBuffer,
        byteOffset,
        batchTableBinaryByteLength
      );
      byteOffset += batchTableBinaryByteLength;
    }
  }

  var featureTable = new Cesium3DTileFeatureTable(
    featureTableJson,
    featureTableBinary
  );

  var pointsLength = featureTable.getGlobalProperty("POINTS_LENGTH");
  featureTable.featuresLength = pointsLength;

  if (!defined(pointsLength)) {
    throw new RuntimeError(
      "Feature table global property: POINTS_LENGTH must be defined"
    );
  }

  var rtcCenter = featureTable.getGlobalProperty(
    "RTC_CENTER",
    ComponentDatatype.FLOAT,
    3
  );
  if (defined(rtcCenter)) {
    rtcCenter = Cartesian3.unpack(rtcCenter);
  }

  // Start with the draco compressed properties and add in uncompressed
  // properties.
  var parsedContent = parseDracoProperties(featureTable, batchTableJson);
  parsedContent.rtcCenter = rtcCenter;
  parsedContent.pointsLength = pointsLength;

  if (!parsedContent.hasPositions) {
    var positions = parsePositions(featureTable);
    parsedContent.positions = positions;
    parsedContent.hasPositions =
      parsedContent.hasPositions || defined(positions);
  }

  if (!parsedContent.hasPositions) {
    throw new RuntimeError(
      "Either POSITION or POSITION_QUANTIZED must be defined."
    );
  }

  if (!parsedContent.hasNormals) {
    var normals = parseNormals(featureTable);
    parsedContent.normals = normals;
    parsedContent.hasNormals = parsedContent.hasNormals || defined(normals);
  }

  if (!parsedContent.hasColors) {
    var colors = parseColors(featureTable);
    parsedContent.colors = colors;
    parsedContent.hasColors = parsedContent.hasColors || defined(colors);
    parsedContent.hasConstantColor = defined(parsedContent.constantColor);
  }

  if (!parsedContent.hasBatchIds) {
    var batchIds = parseBatchIds(featureTable);
    parsedContent.batchIds = batchIds;
    parsedContent.hasBatchIds = parsedContent.hasBatchIds || defined(batchIds);
  }

  if (parsedContent.hasBatchIds) {
    var batchLength = featureTable.getGlobalProperty("BATCH_LENGTH");
    if (!defined(batchLength)) {
      throw new RuntimeError(
        "Global property: BATCH_LENGTH must be defined when BATCH_ID is defined."
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
  var featureTableJson = featureTable.json;
  var dracoBuffer;
  var dracoFeatureTableProperties;
  var dracoBatchTableProperties;

  var featureTableDraco = defined(featureTableJson.extensions)
    ? featureTableJson.extensions["3DTILES_draco_point_compression"]
    : undefined;
  var batchTableDraco =
    defined(batchTableJson) && defined(batchTableJson.extensions)
      ? batchTableJson.extensions["3DTILES_draco_point_compression"]
      : undefined;

  if (defined(batchTableDraco)) {
    dracoBatchTableProperties = batchTableDraco.properties;
  }

  var hasPositions;
  var hasColors;
  var hasNormals;
  var hasBatchIds;
  var isTranslucent;
  if (defined(featureTableDraco)) {
    dracoFeatureTableProperties = featureTableDraco.properties;
    var dracoByteOffset = featureTableDraco.byteOffset;
    var dracoByteLength = featureTableDraco.byteLength;
    if (
      !defined(dracoFeatureTableProperties) ||
      !defined(dracoByteOffset) ||
      !defined(dracoByteLength)
    ) {
      throw new RuntimeError(
        "Draco properties, byteOffset, and byteLength must be defined"
      );
    }
    dracoBuffer = arraySlice(
      featureTable.buffer,
      dracoByteOffset,
      dracoByteOffset + dracoByteLength
    );
    hasPositions = defined(dracoFeatureTableProperties.POSITION);
    hasColors =
      defined(dracoFeatureTableProperties.RGB) ||
      defined(dracoFeatureTableProperties.RGBA);
    hasNormals = defined(dracoFeatureTableProperties.NORMAL);
    hasBatchIds = defined(dracoFeatureTableProperties.BATCH_ID);
    isTranslucent = defined(dracoFeatureTableProperties.RGBA);
  }

  var draco;
  if (defined(dracoBuffer)) {
    draco = {
      buffer: dracoBuffer,
      featureTableProperties: dracoFeatureTableProperties,
      batchTableProperties: dracoBatchTableProperties,
      properties: combine(
        dracoFeatureTableProperties,
        dracoBatchTableProperties
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
  var featureTableJson = featureTable.json;

  var positions;
  if (defined(featureTableJson.POSITION)) {
    positions = featureTable.getPropertyArray(
      "POSITION",
      ComponentDatatype.FLOAT,
      3
    );

    return {
      name: "POSITION",
      semantic: "POSITION",
      typedArray: positions,
      isQuantized: false,
      componentDatatype: ComponentDatatype.FLOAT,
      type: AttributeType.VEC3,
    };
  } else if (defined(featureTableJson.POSITION_QUANTIZED)) {
    positions = featureTable.getPropertyArray(
      "POSITION_QUANTIZED",
      ComponentDatatype.UNSIGNED_SHORT,
      3
    );

    var quantizedVolumeScale = featureTable.getGlobalProperty(
      "QUANTIZED_VOLUME_SCALE",
      ComponentDatatype.FLOAT,
      3
    );
    if (!defined(quantizedVolumeScale)) {
      throw new RuntimeError(
        "Global property: QUANTIZED_VOLUME_SCALE must be defined for quantized positions."
      );
    }
    var quantizedRange = (1 << 16) - 1;

    var quantizedVolumeOffset = featureTable.getGlobalProperty(
      "QUANTIZED_VOLUME_OFFSET",
      ComponentDatatype.FLOAT,
      3
    );
    if (!defined(quantizedVolumeOffset)) {
      throw new RuntimeError(
        "Global property: QUANTIZED_VOLUME_OFFSET must be defined for quantized positions."
      );
    }

    return {
      name: "POSITION",
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
  var featureTableJson = featureTable.json;

  var colors;
  if (defined(featureTableJson.RGBA)) {
    colors = featureTable.getPropertyArray(
      "RGBA",
      ComponentDatatype.UNSIGNED_BYTE,
      4
    );
    return {
      name: "COLOR",
      semantic: VertexAttributeSemantic.COLOR,
      setIndex: 0,
      typedArray: colors,
      componentDatatype: ComponentDatatype.UNSIGNED_BYTE,
      type: AttributeType.VEC4,
      normalized: true,
      isRGB565: false,
    };
  } else if (defined(featureTableJson.RGB)) {
    colors = featureTable.getPropertyArray(
      "RGB",
      ComponentDatatype.UNSIGNED_BYTE,
      3
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
    };
  } else if (defined(featureTableJson.RGB565)) {
    colors = featureTable.getPropertyArray(
      "RGB565",
      ComponentDatatype.UNSIGNED_SHORT,
      1
    );
    return {
      name: "COLOR",
      semantic: VertexAttributeSemantic.COLOR,
      setIndex: 0,
      typedArray: colors,
      // These settings are for the ModelExperimental implementation
      // which decodes on the CPU and uploads a VEC3 of float colors.
      // PointCloud does the decoding on the GPU so uploads a
      // UNSIGNED_SHORT instead.
      componentDatatype: ComponentDatatype.FLOAT,
      type: AttributeType.VEC3,
      normalized: false,
      isRGB565: true,
    };
  } else if (defined(featureTableJson.CONSTANT_RGBA)) {
    var constantRGBA = featureTable.getGlobalProperty(
      "CONSTANT_RGBA",
      ComponentDatatype.UNSIGNED_BYTE,
      4
    );
    var constantColor = Color.fromBytes(
      constantRGBA[0],
      constantRGBA[1],
      constantRGBA[2],
      constantRGBA[3]
    );

    return {
      name: "COLOR",
      semantic: VertexAttributeSemantic.COLOR,
      setIndex: 0,
      constantColor: constantColor,
      componentDatatype: ComponentDatatype.FLOAT,
      type: AttributeType.VEC4,
      isQuantized: false,
    };
  }

  return undefined;
}

function parseNormals(featureTable) {
  var featureTableJson = featureTable.json;
  var normals;
  if (defined(featureTableJson.NORMAL)) {
    normals = featureTable.getPropertyArray(
      "NORMAL",
      ComponentDatatype.FLOAT,
      3
    );
    return {
      name: "NORMAL",
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
      2
    );
    var quantizationBits = 16;
    return {
      name: "NORMAL",
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
  var featureTableJson = featureTable.json;
  if (defined(featureTableJson.BATCH_ID)) {
    var batchIds = featureTable.getPropertyArray(
      "BATCH_ID",
      ComponentDatatype.UNSIGNED_SHORT,
      1
    );
    return {
      name: "BATCH_ID",
      semantic: VertexAttributeSemantic.FEATURE_ID,
      typedArray: batchIds,
      componentDatatype: ComponentDatatype.UNSIGNED_SHORT,
      type: AttributeType.SCALAR,
    };
  }

  return undefined;
}

export default PntsParser;
