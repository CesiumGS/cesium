import { defined, defaultValue } from "@cesium/engine";
import concatTypedArrays from "./concatTypedArrays.js";
import MetadataTester from "./MetadataTester.js";

/**
 * Class to generate implicit subtrees for implicit tiling unit tests
 * @private
 */
function ImplicitTilingTester() {}

/**
 * Description of a single availability bitstream
 * @typedef {object} AvailabilityDescription
 * @property {string|number} descriptor Either a string of <code>0</code>s and <code>1</code>s representing the bitstream values, or an integer <code>0</code> or <code>1</code> to indicate a constant value.
 * @property {number} lengthBits How many bits are in the bitstream. This must be specified, even if descriptor is a string of <code>0</code>s and <code>1</code>s
 * @property {boolean} isInternal <code>true</code> if an internal bufferView should be created. <code>false</code> indicates the bufferview is stored in an external buffer instead.
 * @property {boolean} [shareBuffer=false] This is only used for content availability. If <code>true</code>, then the content availability will share the same buffer as the tile availaibility, as this is a common optimization
 * @property {boolean} [includeAvailableCount=false] If true, set availableCount
 */

/**
 * A description of metadata properties stored in the subtree.
 * @typedef {object} MetadataDescription
 * @property {boolean} isInternal True if the metadata should be stored in the subtree file, false if the metadata should be stored in an external buffer.
 * @property {Array} propertyTables Array of property table objects to pass into {@link MetadataTester.createPropertyTables} in order to create the property table buffer views.
 * @private
 */

/**
 * A JSON description of a subtree file for easier generation
 * @typedef {object} SubtreeDescription
 * @property {boolean} [useLegacySchema=false] If true, the resulting JSON chunk will use the legacy schema for subtrees and metadata (e.g. use bufferViews rather than bitstream, use 3DTILES_metadata extension rather than tileMetadata or contentMetadata, use 3DTILES_multiple_contents extension rather than contents). Used to test backwards compatibility.
 * @property {AvailabilityDescription} tileAvailability A description of the tile availability bitstream to generate
 * @property {AvailabilityDescription} contentAvailability A description of the content availability bitstream to generate
 * @property {AvailabilityDescription} childSubtreeAvailability A description of the child subtree availability bitstream to generate
 * @property {AvailabilityDescription} other A description of another bitstream. This is not used for availability, but rather to simulate extra buffer views.
 * @property {MetadataDescription} [metadata] For testing metadata, additional options can be passed in here.
 * @property {boolean} [json] If true, return the result as a JSON with external buffers. Should not be true if any of the availability buffers are internal.
 * @private
 */

/**
 * Results of procedurally generating a subtree.
 * @typedef {object} GeneratedSubtree
 * @property {Uint8Array} [subtreeJson] The JSON portion of the subtree file. Mutually exclusive with subtreeBuffer.
 * @property {Uint8Array} [subtreeBuffer] A typed array storing the contents of the subtree file (including the internal buffer). Mutually exclusive with subtreeJson.
 * @property {Uint8Array} externalBuffer A typed array representing an external .bin file. This is always returned, but it may be an empty typed array.

 */

/**
 * Generate a subtree buffer
 * @param {SubtreeDescription} subtreeDescription A JSON description of the subtree's structure and values
 * @param {boolean} constantOnly true if all the bitstreams are constant, i.e. no buffers/bufferViews are needed.
 * @return {GeneratedSubtree} The procedurally generated subtree and an external buffer.
 *
 * @example
 *  const subtreeDescription = {
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
 *  const results = ImplicitTilingTester.generateSubtreeBuffers(
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
  let subtreeJson = {};
  if (!constantOnly) {
    subtreeJson = {
      buffers: [],
      bufferViews: [],
    };
  }

  const bufferViewsU8 = makeBufferViews(subtreeDescription, subtreeJson);
  const buffersU8 = makeBuffers(bufferViewsU8, subtreeJson);

  if (subtreeDescription.json) {
    return {
      subtreeJson: subtreeJson,
      externalBuffer: buffersU8.external,
    };
  }

  const jsonChunk = makeJsonChunk(subtreeJson);
  const binaryChunk = buffersU8.internal;
  const header = makeSubtreeHeader(jsonChunk.length, binaryChunk.length);
  const subtreeBuffer = concatTypedArrays([header, jsonChunk, binaryChunk]);

  return {
    subtreeBuffer: subtreeBuffer,
    externalBuffer: buffersU8.external,
  };
};

function makeBufferViews(subtreeDescription, subtreeJson) {
  // Content availability is optional.
  const hasContent = defined(subtreeDescription.contentAvailability);

  // pass 1: parse availability -------------------------------------------
  const parsedAvailability = {
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
  const bufferViewsU8 = {
    internal: [],
    external: [],
    count: 0,
  };

  const useLegacySchema = defaultValue(
    subtreeDescription.useLegacySchema,
    false
  );
  const bufferViewJsonArray = [];
  gatherBufferViews(
    bufferViewsU8,
    bufferViewJsonArray,
    parsedAvailability.tileAvailability,
    useLegacySchema
  );

  if (hasContent) {
    parsedAvailability.contentAvailability.forEach(function (
      contentAvailability
    ) {
      gatherBufferViews(
        bufferViewsU8,
        bufferViewJsonArray,
        contentAvailability,
        useLegacySchema
      );
    });
  }
  gatherBufferViews(
    bufferViewsU8,
    bufferViewJsonArray,
    parsedAvailability.childSubtreeAvailability,
    useLegacySchema
  );

  // to simulate additional buffer views for metadata or other purposes.
  if (defined(parsedAvailability.other)) {
    gatherBufferViews(
      bufferViewsU8,
      bufferViewJsonArray,
      parsedAvailability.other,
      useLegacySchema
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
    const contentAvailabilityArray = parsedAvailability.contentAvailability;
    if (useLegacySchema) {
      subtreeJson.extensions = {
        "3DTILES_multiple_contents": {
          contentAvailability: contentAvailabilityArray.map(function (x) {
            return x.availabilityJson;
          }),
        },
      };
    } else if (contentAvailabilityArray.length > 1) {
      subtreeJson.contentAvailability = contentAvailabilityArray.map(function (
        x
      ) {
        return x.availabilityJson;
      });
    } else {
      subtreeJson.contentAvailability =
        contentAvailabilityArray[0].availabilityJson;
    }
  }

  // pass 4: add metadata buffer views --------------------------------------
  const metadata = subtreeDescription.metadata;
  if (defined(metadata)) {
    addMetadata(bufferViewsU8, subtreeJson, metadata, useLegacySchema);
  }

  // wrap up ----------------------------------------------------------------

  return bufferViewsU8;
}

function gatherBufferViews(
  bufferViewsU8,
  bufferViewJsonArray,
  parsedBitstream,
  useLegacySchema
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
    if (useLegacySchema) {
      parsedBitstream.availabilityJson = {
        bufferView: 0,
        availableCount: parsedBitstream.availableCount,
      };
    } else {
      parsedBitstream.availabilityJson = {
        bitstream: 0,
        availableCount: parsedBitstream.availableCount,
      };
    }
  } else {
    const bufferViewId = bufferViewsU8.count;
    bufferViewsU8.count++;

    const bufferViewJson = {
      buffer: undefined,
      byteOffset: undefined,
      byteLength: parsedBitstream.byteLength,
    };
    bufferViewJsonArray.push(bufferViewJson);

    if (useLegacySchema) {
      parsedBitstream.availabilityJson = {
        bufferView: bufferViewId,
        availableCount: parsedBitstream.availableCount,
      };
    } else {
      parsedBitstream.availabilityJson = {
        bitstream: bufferViewId,
        availableCount: parsedBitstream.availableCount,
      };
    }

    const bufferView = {
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
  const buffer = new ArrayBuffer(24);
  const dataView = new DataView(buffer);
  // ASCII 'subt' as a little-endian uint32_t
  const MAGIC = 0x74627573;
  const littleEndian = true;
  const VERSION = 1;
  dataView.setUint32(0, MAGIC, littleEndian);
  dataView.setUint32(4, VERSION, littleEndian);

  // The test data is small, so only the low 32-bits are needed.
  dataView.setUint32(8, jsonByteLength, littleEndian);
  dataView.setUint32(16, binaryByteLength, littleEndian);

  return new Uint8Array(buffer);
}

function makeJsonChunk(json) {
  const jsonString = JSON.stringify(json);
  // To keep unit tests simple, this assumes ASCII characters. However, UTF-8
  // characters are allowed in general.
  const jsonByteLength = jsonString.length;
  let paddedLength = jsonByteLength;
  if (paddedLength % 8 !== 0) {
    paddedLength += 8 - (paddedLength % 8);
  }

  let i;
  const buffer = new Uint8Array(paddedLength);
  for (i = 0; i < jsonByteLength; i++) {
    buffer[i] = jsonString.charCodeAt(i);
  }

  for (i = jsonByteLength; i < paddedLength; i++) {
    buffer[i] = " ".charCodeAt(0);
  }

  return buffer;
}

function parseAvailability(availability) {
  const includeAvailableCount = availability.includeAvailableCount;
  const parsed = parseAvailabilityDescriptor(
    availability.descriptor,
    includeAvailableCount
  );
  parsed.isInternal = availability.isInternal;
  parsed.shareBuffer = availability.shareBuffer;

  if (defined(parsed.constant) && includeAvailableCount) {
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

  const bits = descriptor.split("").map(function (x) {
    return Number(x);
  });
  const byteLength = Math.ceil(bits.length / 8);
  let byteLengthWithPadding = byteLength;

  // Add padding if needed
  if (byteLengthWithPadding % 8 !== 0) {
    byteLengthWithPadding += 8 - (byteLengthWithPadding % 8);
  }

  let availableCount = 0;
  const bitstream = new Uint8Array(byteLengthWithPadding);
  for (let i = 0; i < bits.length; i++) {
    const bit = bits[i];
    availableCount += bit;
    const byte = i >> 3;
    const bitIndex = i % 8;
    bitstream[byte] |= bit << bitIndex;
  }

  if (!includeAvailableCount) {
    availableCount = undefined;
  }

  return {
    byteLength: byteLength,
    bitstream: bitstream,
    availableCount: availableCount,
  };
}

function addMetadata(
  bufferViewsU8,
  subtreeJson,
  metadataOptions,
  useLegacySchema
) {
  const propertyTableResults = MetadataTester.createPropertyTables(
    metadataOptions.propertyTables
  );

  // Add bufferViews to the list -----------------------------------
  if (!defined(subtreeJson.bufferViews)) {
    subtreeJson.bufferViews = [];
  }
  const bufferViewJsonArray = subtreeJson.bufferViews;

  const bufferViewArray = metadataOptions.isInternal
    ? bufferViewsU8.internal
    : bufferViewsU8.external;

  const metadataBufferViewsU8 = propertyTableResults.bufferViews;
  const metadataBufferViewCount = Object.keys(metadataBufferViewsU8).length;
  for (let i = 0; i < metadataBufferViewCount; i++) {
    const bufferViewU8 = metadataBufferViewsU8[i];

    const bufferViewJson = {
      buffer: undefined,
      byteOffset: undefined,
      byteLength: bufferViewU8.byteLength,
    };
    bufferViewJsonArray.push(bufferViewJson);

    const paddedBufferView = padUint8Array(bufferViewU8);
    const bufferView = {
      bufferView: paddedBufferView,
      // save a reference to the object so we can update the offsets and
      // lengths later.
      json: bufferViewJson,
    };
    bufferViewArray.push(bufferView);
  }

  // Renumber buffer views ----------------------------------------------
  // This tester assumes the first property table is for the tile metadata

  const firstMetadataIndex = bufferViewsU8.count;
  const tileTable = propertyTableResults.propertyTables[0];
  const tileProperties = getPropertiesObjectFromPropertyTable(
    tileTable,
    firstMetadataIndex,
    useLegacySchema
  );

  const propertyTables = [];

  // Store results in subtree JSON -----------------------------------------
  if (useLegacySchema) {
    if (!defined(subtreeJson.extensions)) {
      subtreeJson.extensions = {};
    }

    subtreeJson.extensions["3DTILES_metadata"] = {
      class: tileTable.class,
      properties: tileProperties,
    };
  } else {
    const tilePropertyTable = {
      class: tileTable.class,
      properties: tileProperties,
      count: tileTable.count,
    };
    propertyTables.push(tilePropertyTable);
    subtreeJson.tileMetadata = 0;
  }

  // If they exist, handle the remaining property tables as content metadata
  const length = propertyTableResults.propertyTables.length;
  if (length > 1) {
    const contentMetadataIndices = [];
    for (let i = 1; i < length; i++) {
      const contentTable = propertyTableResults.propertyTables[i];
      const contentProperties = getPropertiesObjectFromPropertyTable(
        contentTable,
        firstMetadataIndex,
        useLegacySchema
      );
      const contentMetadata = {
        class: contentTable.class,
        properties: contentProperties,
        count: contentTable.count,
      };

      propertyTables.push(contentMetadata);
      const contentMetadataIndex = useLegacySchema ? i - 1 : i;
      contentMetadataIndices.push(contentMetadataIndex);
    }

    subtreeJson.contentMetadata = contentMetadataIndices;
  }

  subtreeJson.propertyTables = propertyTables;
}

function getPropertiesObjectFromPropertyTable(
  propertyTable,
  firstMetadataIndex,
  useLegacySchema
) {
  const tableProperties = propertyTable.properties;
  const properties = {};

  const valuesKey = useLegacySchema ? "bufferView" : "values";
  const stringOffsetsKey = useLegacySchema
    ? "stringOffsetBufferView"
    : "stringOffsets";
  const arrayOffsetsKey = useLegacySchema
    ? "arrayOffsetBufferView"
    : "arrayOffsets";

  for (const key in tableProperties) {
    if (tableProperties.hasOwnProperty(key)) {
      const property = tableProperties[key];
      const values = property.values;
      const stringOffsets = property.stringOffsets;
      const arrayOffsets = property.arrayOffsets;

      const propertyJson = {};
      propertyJson[valuesKey] = firstMetadataIndex + values;

      if (defined(stringOffsets)) {
        propertyJson[stringOffsetsKey] = firstMetadataIndex + stringOffsets;
      }

      if (defined(arrayOffsets)) {
        propertyJson[arrayOffsetsKey] = firstMetadataIndex + arrayOffsets;
      }

      properties[key] = propertyJson;
    }
  }

  return properties;
}

function padUint8Array(array) {
  // if already aligned to 8 bytes, we're done.
  if (array.length % 8 === 0) {
    return array;
  }

  const paddingLength = 8 - (array.length % 8);
  const padding = new Uint8Array(paddingLength);
  return concatTypedArrays([array, padding]);
}

function makeBuffers(bufferViewsU8, subtreeJson) {
  let bufferCount = 0;
  let byteLength = 0;
  let typedArrays = [];
  let i;
  let bufferView;
  for (i = 0; i < bufferViewsU8.internal.length; i++) {
    bufferView = bufferViewsU8.internal[i];
    typedArrays.push(bufferView.bufferView);
    bufferView.json.buffer = bufferCount;
    bufferView.json.byteOffset = byteLength;

    byteLength += bufferView.bufferView.length;
  }

  // An internal buffer typed array will always be returned, even if length
  // 0. However, don't add json for an unused buffer.
  const internalBufferU8 = concatTypedArrays(typedArrays);
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

  const externalBufferU8 = concatTypedArrays(typedArrays);
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

export default ImplicitTilingTester;
