export default function ImplicitTilingTester() {}

ImplicitTilingTester.prototype.generateSubtreeBuffer = function (
  subtreeDescription
) {};

/*
function makeSubtreeHeader(jsonByteLength, binaryByteLength) {
  var buffer = new ArrayBuffer(24);
  var dataView = new DataView(this.header.buffer);
  // ASCII 'subt' as a little-endian uint32_t
  var MAGIC = 0x74627573;
  var littleEndian = true;
  var VERSION = 1;
  dataView.setUint32(0, MAGIC, littleEndian);
  dataView.setUint32(4, VERSION, littleEndian);

  // The test data is small, so only the low 32-bits are needed.
  dataView.setUint32(8, jsonByteLength, littleEndian);
  dataView.setUint32(16, binaryByteLength, littleEndian);

  return buffer;
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

  for (i = jsonByteLength; j < paddedLength; j++) {
    buffer[i] = ' '.charCodeAt(0);
  }

  return {
    buffer: buffer,
    byteLength: paddedLength
  }
}

function parseAvailability(name, descriptor) {
  if (typeof descriptor === 'number') {
    return {
      name,
      constant: descriptor
    }
  }

  const bits = descriptor.split('').map(x => Number(x));
  let byteLength = Math.ceil(bits.length / 8);
  const byteLengthWithoutPadding = byteLength;

  // Add padding if needed
  if (byteLength % 8 !== 0) {
    byteLength += 8 - (byteLength % 8);
  }

  const bitstream = new Uint8Array(byteLength);
  for (const [i, bit] of bits.entries()) {
    const byte = i >> 3;
    const bitIndex = i % 8;
    bitstream[byte] |= bit << bitIndex;
  }

  return {
    name,
    byteLength,
    byteLengthWithoutPadding,
    bitstream
  }
}

class SubtreeBinary {
  constructor(availabilityJson) {
    this.tileAvailability = parseAvailability('tileAvailability', availabilityJson.tileAvailability);
    this.contentAvailability = parseAvailability('contentAvailability', availabilityJson.contentAvailability);
    this.childSubtreeAvailability = parseAvailability('childSubtreeAvailability', availabilityJson.childSubtreeAvailability);
    this.subtreeJson = undefined;
    // Buffer containing the JSON
    this.jsonChunk = undefined;
    this.bitstreams = undefined;
    this.header = new Uint8Array(24);

    this.combineAvailability();
    this.makeHeader();
  }

  combineAvailability() {
    const bufferJson = {
      byteLength: 0
    }
    const bufferViewJsons = []

    const subtreeJson = {
      buffers: [bufferJson],
      bufferViews: bufferViewJsons,
    };

    const bitstreams = []

    let numBufferViews = 0;
    const availabilities = [
      this.tileAvailability,
      this.contentAvailability,
      this.childSubtreeAvailability
    ];
    for (const availability of availabilities) {
      if (availability.constant !== undefined) {
        subtreeJson[availability.name] = {
          constant: availability.constant
        };
      } else {
        subtreeJson[availability.name] = {
          bufferView: numBufferViews
        }

        bufferViewJsons.push({
          buffer: 0,
          byteOffset: bufferJson.byteLength,
          byteLength: availability.byteLengthWithoutPadding
        });

        bitstreams.push(availability.bitstream);

        bufferJson.byteLength += availability.byteLength;
        numBufferViews++;
      }
    }
  

    let jsonString = JSON.stringify(subtreeJson);
    let jsonLength = Buffer.byteLength(jsonString, 'utf-8');
    while (jsonLength % 8 !== 0) {
      jsonString += ' ';
      jsonLength += 1;
    }

    this.subtreeJson = subtreeJson;
    this.jsonChunk = Buffer.from(jsonString, 'utf-8');
    this.bitstreams = bitstreams;
  }

  get jsonByteLength() {
    return this.jsonChunk.length;
  }

  get binaryByteLength() {
    return this.subtreeJson.buffers[0].byteLength;
  }

  writeFile(fname) {
    const buffers = [this.header, this.jsonChunk, ...this.bitstreams];
    fs.writeFileSync(fname, Buffer.concat(buffers));
  }
}

function main() {
  const [inFile, outFile] = process.argv.slice(2);
  const availabilityJson = JSON.parse(fs.readFileSync(inFile));

  const subtree = new SubtreeBinary(availabilityJson);
  subtree.writeFile(outFile);
}

main();
*/
