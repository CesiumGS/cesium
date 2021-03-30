import { defined, defaultValue } from "../Source/Cesium.js";
import concatTypedArrays from "./concatTypedArrays.js";
import MetadataTester from "./MetadataTester.js";

/**
 * Class to generate implicit subtrees for implicit tiling unit tests
 * @private
 */
export default function ImplicitTilingTester() {}

/**
 * Description of a single availability bitstream
 * @typedef {Object} AvailabilityDescription
 * @property {String|Number} descriptor Either a string of <code>0</code>s and <code>1</code>s representing the bitstream values, or an integer <code>0</code> or <code>1</code> to indicate a constant value.
 * @property {Number} lengthBits How many bits are in the bitstream. This must be specified, even if descriptor is a string of <code>0</code>s and <code>1</code>s
 * @property {Boolean} isInternal <code>true</code> if an internal bufferView should be created. <code>false</code> indicates the bufferview is stored in an external buffer instead.
 * @property {Boolean} [shareBuffer=false] This is only used for content availability. If <code>true</code>, then the content availability will share the same buffer as the tile availaibility, as this is a common optimization
 * @property {Boolean} [includeAvailableCount=false] If true, set availableCount
 */

/**
 * A description of 3DTILES_metadata properties stored in the subtree.
 * @typedef {Object} MetadataDescription
 * @property {Boolean} isInternal True if the metadata should be stored in the subtree file, false if the metadata should be stored in an external buffer.
 * @property {Object} featureTables Options to pass into {@link MetadataTester.createFeatureTables} to create the feature table buffer views.
 * @private
 */

/**
 * A JSON description of a subtree file for easier generation
 * @typedef {Object} SubtreeDescription
 * @property {AvailabilityDescription} tileAvailability A description of the tile availability bitstream to generate
 * @property {AvailabilityDescription} contentAvailability A description of the content availability bitstream to generate
 * @property {AvailabilityDescription} childSubtreeAvailability A description of the child subtree availability bitstream to generate
 * @property {AvailabilityDescription} other A description of another bitstream. This is not used for availability, but rather to simulate extra buffer views.
 * @property {MetadataDescription} [metadata] For testing 3DTILES_metadata, additional options can be passed in here.
 * @private
 */

/**
 * Results of procedurally generating a subtree.
 * @typedef {Object} GeneratedSubtree
 * @property {Uint8Array} subtreeBuffer A typed array storing the contents of the subtree file (including the internal buffer)
 * @property {Uint8Array} externalBuffer A typed array representing an external .bin file. This is always returned, but it may be an empty typed array.
 */

/**
 * Generate a subtree buffer
 * @param {SubtreeDescription} subtreeDescription A JSON description of the subtree's structure and values
 * @param {Boolean} constantOnly true if all the bitstreams are constant, i.e. no buffers/bufferViews are needed.
 * @return {GeneratedSubtree} The procedurally generated subtree and an external buffer.
 *
 * @example
 *  var subtreeDescription = {
 *    tileAvailability: {
 *      descriptor: 1,
 *      lengthBits: 5,
 *      isInternal: true,
 *    },
 *    contentAvailability: {
 *      descriptor: "11000",
 *      lengthBits: 5,
 *      isInternal: true,
 *    },
 *    childSubtreeAvailability: {
 *      descriptor: "1111000010100000",
 *      lengthBits: 16,
 *      isInternal: true,
 *    },
 *    other: {
 *      descriptor: "101010",
 *      lengthBits: 6,
 *      isInternal: false,
 *    },
 *  };
 *  var results = ImplicitTilingTester.generateSubtreeBuffers(
 *    subtreeDescription
 *  );
 *
 * @private
 */
ImplicitTilingTester.generateSubtreeBuffers = function (
  subtreeDescription,
  constantOnly
) {
  constantOnly = defaultValue(constantOnly, false);

  // This will be populated by makeBufferViews() and makeBuffers()
  var subtreeJson = {};
  if (!constantOnly) {
    subtreeJson = {
      buffers: [],
      bufferViews: [],
    };
  }

  var bufferViewsU8 = makeBufferViews(subtreeDescription, subtreeJson);
  var buffersU8 = makeBuffers(bufferViewsU8, subtreeJson);
  var jsonChunk = makeJsonChunk(subtreeJson);
  var binaryChunk = buffersU8.internal;
  var header = makeSubtreeHeader(jsonChunk.length, binaryChunk.length);
  var subtreeBuffer = concatTypedArrays([header, jsonChunk, binaryChunk]);

  return {
    subtreeBuffer: subtreeBuffer,
    externalBuffer: buffersU8.external,
  };
};

function makeBufferViews(subtreeDescription, subtreeJson) {
  // Content availability is optional.
  var hasContent = defined(subtreeDescription.contentAvailability);

  // pass 1: parse availability -------------------------------------------
  var parsedAvailability = {
    tileAvailability: parseAvailability(subtreeDescription.tileAvailability),
    childSubtreeAvailability: parseAvailability(
      subtreeDescription.childSubtreeAvailability
    ),
  };

  if (hasContent) {
    parsedAvailability.contentAvailability = subtreeDescription.contentAvailability.map(
      parseAvailability
    );
  }

  // to simulate additional buffer views for metadata or other purposes.
  if (defined(subtreeDescription.other)) {
    parsedAvailability.other = parseAvailability(subtreeDescription.other);
  }

  // pass 2: create buffer view JSON and gather typed arrays ------------------
  var bufferViewsU8 = {
    internal: [],
    external: [],
    count: 0,
  };

  var bufferViewJsonArray = [];
  gatherBufferViews(
    bufferViewsU8,
    bufferViewJsonArray,
    parsedAvailability.tileAvailability
  );
  if (hasContent) {
    parsedAvailability.contentAvailability.forEach(function (
      contentAvailability
    ) {
      gatherBufferViews(
        bufferViewsU8,
        bufferViewJsonArray,
        contentAvailability
      );
    });
  }
  gatherBufferViews(
    bufferViewsU8,
    bufferViewJsonArray,
    parsedAvailability.childSubtreeAvailability
  );

  // to simulate additional buffer views for metadata or other purposes.
  if (defined(parsedAvailability.other)) {
    gatherBufferViews(
      bufferViewsU8,
      bufferViewJsonArray,
      parsedAvailability.other
    );
  }
  if (bufferViewJsonArray.length > 0) {
    subtreeJson.bufferViews = bufferViewJsonArray;
  }

  // pass 3: update the subtree availability JSON -----------------------------
  subtreeJson.tileAvailability =
    parsedAvailability.tileAvailability.availabilityJson;
  subtreeJson.childSubtreeAvailability =
    parsedAvailability.childSubtreeAvailability.availabilityJson;

  if (hasContent) {
    var contentAvailabilityArray = parsedAvailability.contentAvailability;
    if (contentAvailabilityArray.length > 1) {
      subtreeJson.extensions = {
        "3DTILES_multiple_contents": {
          contentAvailability: contentAvailabilityArray.map(function (x) {
            return x.availabilityJson;
          }),
        },
      };
    } else {
      subtreeJson.contentAvailability =
        contentAvailabilityArray[0].availabilityJson;
    }
  }

  // pass 4: add metadata buffer views --------------------------------------
  if (defined(subtreeDescription.metadata)) {
    addMetadata(bufferViewsU8, subtreeJson, subtreeDescription.metadata);
  }

  // wrap up ----------------------------------------------------------------

  return bufferViewsU8;
}

function gatherBufferViews(
  bufferViewsU8,
  bufferViewJsonArray,
  parsedBitstream
) {
  if (defined(parsedBitstream.constant)) {
    parsedBitstream.availabilityJson = {
      constant: parsedBitstream.constant,
      availableCount: parsedBitstream.availableCount,
    };
  } else if (defined(parsedBitstream.shareBuffer)) {
    // simplifying assumptions:
    // 1. shareBuffer is only used for content availability
    // 2. tileAvailability is stored in the first bufferView so it has index 0
    parsedBitstream.availabilityJson = {
      bufferView: 0,
      availableCount: parsedBitstream.availableCount,
    };
  } else {
    var bufferViewId = bufferViewsU8.count;
    bufferViewsU8.count++;

    var bufferViewJson = {
      buffer: undefined,
      byteOffset: undefined,
      byteLength: parsedBitstream.byteLength,
    };
    bufferViewJsonArray.push(bufferViewJson);

    parsedBitstream.availabilityJson = {
      bufferView: bufferViewId,
      availableCount: parsedBitstream.availableCount,
    };

    var bufferView = {
      bufferView: parsedBitstream.bitstream,
      // save a reference to the object so we can update the offsets and
      // lengths later.
      json: bufferViewJson,
    };

    if (parsedBitstream.isInternal) {
      bufferViewsU8.internal.push(bufferView);
    } else {
      bufferViewsU8.external.push(bufferView);
    }
  }
}

function makeSubtreeHeader(jsonByteLength, binaryByteLength) {
  var buffer = new ArrayBuffer(24);
  var dataView = new DataView(buffer);
  // ASCII 'subt' as a little-endian uint32_t
  var MAGIC = 0x74627573;
  var littleEndian = true;
  var VERSION = 1;
  dataView.setUint32(0, MAGIC, littleEndian);
  dataView.setUint32(4, VERSION, littleEndian);

  // The test data is small, so only the low 32-bits are needed.
  dataView.setUint32(8, jsonByteLength, littleEndian);
  dataView.setUint32(16, binaryByteLength, littleEndian);

  return new Uint8Array(buffer);
}

function makeJsonChunk(json) {
  var jsonString = JSON.stringify(json);
  // To keep unit tests simple, this assumes ASCII characters. However, UTF-8
  // characters are allowed in general.
  var jsonByteLength = jsonString.length;
  var paddedLength = jsonByteLength;
  if (paddedLength % 8 !== 0) {
    paddedLength += 8 - (paddedLength % 8);
  }

  var i;
  var buffer = new Uint8Array(paddedLength);
  for (i = 0; i < jsonByteLength; i++) {
    buffer[i] = jsonString.charCodeAt(i);
  }

  for (i = jsonByteLength; i < paddedLength; i++) {
    buffer[i] = " ".charCodeAt(0);
  }

  return buffer;
}

function parseAvailability(availability) {
  var parsed = parseAvailabilityDescriptor(availability.descriptor);
  parsed.isInternal = availability.isInternal;
  parsed.shareBuffer = availability.shareBuffer;

  if (defined(parsed.constant) && availability.includeAvailableCount) {
    // Only set available count to the number of bits if the constant is 1
    parsed.availableCount = parsed.constant * availability.lengthBits;
  }

  // this will be populated by gatherBufferViews()
  parsed.availabilityJson = undefined;

  return parsed;
}

function parseAvailabilityDescriptor(descriptor, includeAvailableCount) {
  if (typeof descriptor === "number") {
    return {
      constant: descriptor,
    };
  }

  var bits = descriptor.split("").map(function (x) {
    return Number(x);
  });
  var byteLength = Math.ceil(bits.length / 8);
  var byteLengthWithPadding = byteLength;

  // Add padding if needed
  if (byteLengthWithPadding % 8 !== 0) {
    byteLengthWithPadding += 8 - (byteLengthWithPadding % 8);
  }

  var availableCount = 0;
  var bitstream = new Uint8Array(byteLength);
  for (var i = 0; i < bits.length; i++) {
    var bit = bits[i];
    availableCount += bit;
    var byte = i >> 3;
    var bitIndex = i % 8;
    bitstream[byte] |= bit << bitIndex;
  }

  if (!includeAvailableCount) {
    availableCount = undefined;
  }

  return {
    byteLength: byteLength,
    byteLengthWithPadding: byteLengthWithPadding,
    bitstream: bitstream,
    availableCount: availableCount,
  };
}

function addMetadata(bufferViewsU8, subtreeJson, metadataOptions) {
  var featureTableResults = MetadataTester.createFeatureTables(
    metadataOptions.featureTables
  );

  // Add bufferViews to the list -----------------------------------
  if (!defined(subtreeJson.bufferViews)) {
    subtreeJson.bufferViews = [];
  }
  var bufferViewJsonArray = subtreeJson.bufferViews;

  var bufferViewArray = metadataOptions.isInternal
    ? bufferViewsU8.internal
    : bufferViewsU8.external;

  var metadataBufferViewsU8 = featureTableResults.bufferViews;
  var metadataBufferViewCount = Object.keys(metadataBufferViewsU8).length;
  for (var i = 0; i < metadataBufferViewCount; i++) {
    var bufferViewU8 = metadataBufferViewsU8[i];

    var bufferViewJson = {
      buffer: undefined,
      byteOffset: undefined,
      byteLength: bufferViewU8.byteLength,
    };
    bufferViewJsonArray.push(bufferViewJson);

    var paddedBufferView = padUint8Array(bufferViewU8);
    var bufferView = {
      bufferView: paddedBufferView,
      // save a reference to the object so we can update the offsets and
      // lengths later.
      json: bufferViewJson,
    };
    bufferViewArray.push(bufferView);
  }

  // Renumber buffer views ----------------------------------------------
  // This tester assumes a feature table called "tiles"
  var tileTable = featureTableResults.featureTables.tiles;
  var tileTableProperties = tileTable.properties;

  var firstMetadataIndex = bufferViewsU8.count;

  var properties = {};
  for (var key in tileTableProperties) {
    if (tileTableProperties.hasOwnProperty(key)) {
      var property = tileTableProperties[key];

      var propertyJson = {
        bufferView: property.bufferView + firstMetadataIndex,
      };

      if (defined(property.stringOffsetBufferView)) {
        propertyJson.stringOffsetBufferView =
          property.stringOffsetBufferView + firstMetadataIndex;
      }

      if (defined(property.arrayOffsetBufferView)) {
        propertyJson.arrayOffsetBufferView =
          property.arrayOffsetBufferView + firstMetadataIndex;
      }

      properties[key] = propertyJson;
    }
  }

  // Store results in subtree JSON -----------------------------------------
  if (!defined(subtreeJson.extensions)) {
    subtreeJson.extensions = {};
  }

  subtreeJson.extensions["3DTILES_metadata"] = {
    class: tileTable.class,
    properties: properties,
  };
}

function padUint8Array(array) {
  // if already aligned to 8 bytes, we're done.
  if (array.length % 8 === 0) {
    return array;
  }

  var paddingLength = 8 - (array.length % 8);
  var padding = new Uint8Array(paddingLength);
  return concatTypedArrays([array, padding]);
}

function makeBuffers(bufferViewsU8, subtreeJson) {
  var bufferCount = 0;
  var byteLength = 0;
  var typedArrays = [];
  var i;
  var bufferView;
  for (i = 0; i < bufferViewsU8.internal.length; i++) {
    bufferView = bufferViewsU8.internal[i];
    typedArrays.push(bufferView.bufferView);
    bufferView.json.buffer = bufferCount;
    bufferView.json.byteOffset = byteLength;

    byteLength += bufferView.bufferView.length;
  }

  // An internal buffer typed array will always be returned, even if length
  // 0. However, don't add json for an unused buffer.
  var internalBufferU8 = concatTypedArrays(typedArrays);
  if (typedArrays.length > 0) {
    subtreeJson.buffers.push({
      byteLength: byteLength,
    });

    bufferCount += 1;
  }

  // Reset counts
  byteLength = 0;
  typedArrays = [];
  for (i = 0; i < bufferViewsU8.external.length; i++) {
    bufferView = bufferViewsU8.external[i];
    typedArrays.push(bufferView.bufferView);
    bufferView.json.buffer = bufferCount;
    bufferView.json.byteOffset = byteLength;

    byteLength += bufferView.bufferView.length;
  }

  var externalBufferU8 = concatTypedArrays(typedArrays);
  if (typedArrays.length > 0) {
    subtreeJson.buffers.push({
      // dummy URI, unit tests should mock any requests.
      uri: "external.bin",
      byteLength: byteLength,
    });
  }

  return {
    internal: internalBufferU8,
    external: externalBufferU8,
  };
}
