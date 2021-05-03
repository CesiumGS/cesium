import decodeGoogleEarthEnterpriseData from "../Core/decodeGoogleEarthEnterpriseData.js";
import GoogleEarthEnterpriseTileInformation from "../Core/GoogleEarthEnterpriseTileInformation.js";
import RuntimeError from "../Core/RuntimeError.js";
import pako from "../ThirdParty/pako_inflate.js";
import createTaskProcessorWorker from "./createTaskProcessorWorker.js";

// Datatype sizes
var sizeOfUint16 = Uint16Array.BYTES_PER_ELEMENT;
var sizeOfInt32 = Int32Array.BYTES_PER_ELEMENT;
var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

var Types = {
  METADATA: 0,
  TERRAIN: 1,
  DBROOT: 2,
};

Types.fromString = function (s) {
  if (s === "Metadata") {
    return Types.METADATA;
  } else if (s === "Terrain") {
    return Types.TERRAIN;
  } else if (s === "DbRoot") {
    return Types.DBROOT;
  }
};

function decodeGoogleEarthEnterprisePacket(parameters, transferableObjects) {
  var type = Types.fromString(parameters.type);
  var buffer = parameters.buffer;
  decodeGoogleEarthEnterpriseData(parameters.key, buffer);

  var uncompressedTerrain = uncompressPacket(buffer);
  buffer = uncompressedTerrain.buffer;
  var length = uncompressedTerrain.length;

  switch (type) {
    case Types.METADATA:
      return processMetadata(buffer, length, parameters.quadKey);
    case Types.TERRAIN:
      return processTerrain(buffer, length, transferableObjects);
    case Types.DBROOT:
      transferableObjects.push(buffer);
      return {
        buffer: buffer,
      };
  }
}

var qtMagic = 32301;

function processMetadata(buffer, totalSize, quadKey) {
  var dv = new DataView(buffer);
  var offset = 0;
  var magic = dv.getUint32(offset, true);
  offset += sizeOfUint32;
  if (magic !== qtMagic) {
    throw new RuntimeError("Invalid magic");
  }

  var dataTypeId = dv.getUint32(offset, true);
  offset += sizeOfUint32;
  if (dataTypeId !== 1) {
    throw new RuntimeError("Invalid data type. Must be 1 for QuadTreePacket");
  }

  // Tile format version
  var quadVersion = dv.getUint32(offset, true);
  offset += sizeOfUint32;
  if (quadVersion !== 2) {
    throw new RuntimeError(
      "Invalid QuadTreePacket version. Only version 2 is supported."
    );
  }

  var numInstances = dv.getInt32(offset, true);
  offset += sizeOfInt32;

  var dataInstanceSize = dv.getInt32(offset, true);
  offset += sizeOfInt32;
  if (dataInstanceSize !== 32) {
    throw new RuntimeError("Invalid instance size.");
  }

  var dataBufferOffset = dv.getInt32(offset, true);
  offset += sizeOfInt32;

  var dataBufferSize = dv.getInt32(offset, true);
  offset += sizeOfInt32;

  var metaBufferSize = dv.getInt32(offset, true);
  offset += sizeOfInt32;

  // Offset from beginning of packet (instances + current offset)
  if (dataBufferOffset !== numInstances * dataInstanceSize + offset) {
    throw new RuntimeError("Invalid dataBufferOffset");
  }

  // Verify the packets is all there header + instances + dataBuffer + metaBuffer
  if (dataBufferOffset + dataBufferSize + metaBufferSize !== totalSize) {
    throw new RuntimeError("Invalid packet offsets");
  }

  // Read all the instances
  var instances = [];
  for (var i = 0; i < numInstances; ++i) {
    var bitfield = dv.getUint8(offset);
    ++offset;

    ++offset; // 2 byte align

    var cnodeVersion = dv.getUint16(offset, true);
    offset += sizeOfUint16;

    var imageVersion = dv.getUint16(offset, true);
    offset += sizeOfUint16;

    var terrainVersion = dv.getUint16(offset, true);
    offset += sizeOfUint16;

    // Number of channels stored in the dataBuffer
    offset += sizeOfUint16;

    offset += sizeOfUint16; // 4 byte align

    // Channel type offset into dataBuffer
    offset += sizeOfInt32;

    // Channel version offset into dataBuffer
    offset += sizeOfInt32;

    offset += 8; // Ignore image neighbors for now

    // Data providers
    var imageProvider = dv.getUint8(offset++);
    var terrainProvider = dv.getUint8(offset++);
    offset += sizeOfUint16; // 4 byte align

    instances.push(
      new GoogleEarthEnterpriseTileInformation(
        bitfield,
        cnodeVersion,
        imageVersion,
        terrainVersion,
        imageProvider,
        terrainProvider
      )
    );
  }

  var tileInfo = [];
  var index = 0;

  function populateTiles(parentKey, parent, level) {
    var isLeaf = false;
    if (level === 4) {
      if (parent.hasSubtree()) {
        return; // We have a subtree, so just return
      }

      isLeaf = true; // No subtree, so set all children to null
    }
    for (var i = 0; i < 4; ++i) {
      var childKey = parentKey + i.toString();
      if (isLeaf) {
        // No subtree so set all children to null
        tileInfo[childKey] = null;
      } else if (level < 4) {
        // We are still in the middle of the subtree, so add child
        //  only if their bits are set, otherwise set child to null.
        if (!parent.hasChild(i)) {
          tileInfo[childKey] = null;
        } else {
          if (index === numInstances) {
            console.log("Incorrect number of instances");
            return;
          }

          var instance = instances[index++];
          tileInfo[childKey] = instance;
          populateTiles(childKey, instance, level + 1);
        }
      }
    }
  }

  var level = 0;
  var root = instances[index++];
  if (quadKey === "") {
    // Root tile has data at its root and one less level
    ++level;
  } else {
    tileInfo[quadKey] = root; // This will only contain the child bitmask
  }

  populateTiles(quadKey, root, level);

  return tileInfo;
}

var numMeshesPerPacket = 5;
var numSubMeshesPerMesh = 4;

// Each terrain packet will have 5 meshes - each containg 4 sub-meshes:
//    1 even level mesh and its 4 odd level children.
// Any remaining bytes after the 20 sub-meshes contains water surface meshes,
// which are ignored.
function processTerrain(buffer, totalSize, transferableObjects) {
  var dv = new DataView(buffer);

  // Find the sub-meshes.
  var advanceMesh = function (pos) {
    for (var sub = 0; sub < numSubMeshesPerMesh; ++sub) {
      var size = dv.getUint32(pos, true);
      pos += sizeOfUint32;
      pos += size;
      if (pos > totalSize) {
        throw new RuntimeError("Malformed terrain packet found.");
      }
    }
    return pos;
  };

  var offset = 0;
  var terrainMeshes = [];
  while (terrainMeshes.length < numMeshesPerPacket) {
    var start = offset;
    offset = advanceMesh(offset);
    var mesh = buffer.slice(start, offset);
    transferableObjects.push(mesh);
    terrainMeshes.push(mesh);
  }

  return terrainMeshes;
}

var compressedMagic = 0x7468dead;
var compressedMagicSwap = 0xadde6874;

function uncompressPacket(data) {
  // The layout of this decoded data is
  // Magic Uint32
  // Size Uint32
  // [GZipped chunk of Size bytes]

  // Pullout magic and verify we have the correct data
  var dv = new DataView(data);
  var offset = 0;
  var magic = dv.getUint32(offset, true);
  offset += sizeOfUint32;
  if (magic !== compressedMagic && magic !== compressedMagicSwap) {
    throw new RuntimeError("Invalid magic");
  }

  // Get the size of the compressed buffer - the endianness depends on which magic was used
  var size = dv.getUint32(offset, magic === compressedMagic);
  offset += sizeOfUint32;

  var compressedPacket = new Uint8Array(data, offset);
  var uncompressedPacket = pako.inflate(compressedPacket);

  if (uncompressedPacket.length !== size) {
    throw new RuntimeError("Size of packet doesn't match header");
  }

  return uncompressedPacket;
}
export default createTaskProcessorWorker(decodeGoogleEarthEnterprisePacket);
