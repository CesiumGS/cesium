import { defined } from "../Source/Cesium.js";
import concatTypedArrays from "./concatTypedArrays.js";

export default function ImplicitTilingTester() {}

ImplicitTilingTester.generateSubtreeBuffers = function (subtreeDescription) {
  // This will be populated by makeBufferViews() and makeBuffers()
  var subtreeJson = {
    buffers: [],
    bufferViews: [],
    tileAvailability: {},
    contentAvailability: {},
    childSubtreeAvailability: {},
  };

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
  var parsedAvailability = [
    // NOTE: The code below assumes tile availability is
    // listed before content availability.
    parseAvailability("tileAvailability", subtreeDescription.tileAvailability),
    parseAvailability(
      "contentAvailability",
      subtreeDescription.contentAvailability
    ),
    parseAvailability(
      "childSubtreeAvailability",
      subtreeDescription.childSubtreeAvailability
    ),
  ];

  // Some additional buffer in the subtree file (e.g. for metadata)
  // Technically this will add an extraneous key 'other' to the
  // subtree JSON, but that will be ignored by ImplicitSubtree
  if (defined(subtreeDescription.other)) {
    parsedAvailability.push(
      parseAvailability("other", subtreeDescription.other)
    );
  }

  var bufferViewsU8 = {
    internal: [],
    external: [],
  };
  var bufferViewCount = 0;
  for (var i = 0; i < parsedAvailability.length; i++) {
    var parsed = parsedAvailability[i];
    if (parsed.name === "contentAvailability" && parsed.shareBuffer) {
      subtreeJson.contentAvailability = {
        bufferView: subtreeJson.tileAvailability.bufferView,
      };
    } else if (defined(parsed.constant)) {
      subtreeJson[parsed.name] = {
        constant: parsed.constant,
      };
    } else {
      var bufferViewId = bufferViewCount;
      bufferViewCount++;

      var bufferViewJson = {
        buffer: undefined,
        byteOffset: undefined,
        byteLength: parsed.byteLength,
      };
      subtreeJson.bufferViews.push(bufferViewJson);
      subtreeJson[parsed.name] = {
        bufferView: bufferViewId,
      };

      var location = parsed.isInternal ? "internal" : "external";
      bufferViewsU8[location].push({
        bufferView: parsed.bitstream,
        // save a reference to the object so we can update the offsets and
        // lengths later.
        json: bufferViewJson,
      });
    }
  }

  return bufferViewsU8;
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

function parseAvailability(name, availability) {
  var parsed = parseAvailabilityDescriptor(availability.descriptor);
  parsed.name = name;
  parsed.isInternal = availability.isInternal;
  parsed.shareBuffer = availability.shareBuffer;

  return parsed;
}

function parseAvailabilityDescriptor(descriptor) {
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

  var bitstream = new Uint8Array(byteLength);
  for (var i = 0; i < bits.length; i++) {
    var bit = bits[i];
    var byte = i >> 3;
    var bitIndex = i % 8;
    bitstream[byte] |= bit << bitIndex;
  }

  return {
    byteLength: byteLength,
    byteLengthWithPadding: byteLengthWithPadding,
    bitstream: bitstream,
  };
}

function makeBuffers(bufferViewsU8, subtreeJson) {
  console.log(bufferViewsU8);
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
