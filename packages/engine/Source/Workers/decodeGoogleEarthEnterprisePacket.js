import decodeGoogleEarthEnterpriseData from "../Core/decodeGoogleEarthEnterpriseData.js";
import GoogleEarthEnterpriseTileInformation from "../Core/GoogleEarthEnterpriseTileInformation.js";
import RuntimeError from "../Core/RuntimeError.js";
import pako from "pako/lib/inflate.js";
import createTaskProcessorWorker from "./createTaskProcessorWorker.js";

// Datatype sizes
const sizeOfUint16 = Uint16Array.BYTES_PER_ELEMENT;
const sizeOfInt32 = Int32Array.BYTES_PER_ELEMENT;
const sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;

const Types = {
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
  const type = Types.fromString(parameters.type);
  let buffer = parameters.buffer;
  decodeGoogleEarthEnterpriseData(parameters.key, buffer);

  const uncompressedTerrain = uncompressPacket(buffer);
  buffer = uncompressedTerrain.buffer;
  const length = uncompressedTerrain.length;

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

const qtMagic = 32301;

function processMetadata(buffer, totalSize, quadKey) {
  const dv = new DataView(buffer);
  let offset = 0;
  const magic = dv.getUint32(offset, true);
  offset += sizeOfUint32;
  if (magic !== qtMagic) {
    throw new RuntimeError("Invalid magic");
  }

  const dataTypeId = dv.getUint32(offset, true);
  offset += sizeOfUint32;
  if (dataTypeId !== 1) {
    throw new RuntimeError("Invalid data type. Must be 1 for QuadTreePacket");
  }

  // Tile format version
  const quadVersion = dv.getUint32(offset, true);
  offset += sizeOfUint32;
  if (quadVersion !== 2) {
    throw new RuntimeError(
      "Invalid QuadTreePacket version. Only version 2 is supported.",
    );
  }

  const numInstances = dv.getInt32(offset, true);
  offset += sizeOfInt32;

  const dataInstanceSize = dv.getInt32(offset, true);
  offset += sizeOfInt32;
  if (dataInstanceSize !== 32) {
    throw new RuntimeError("Invalid instance size.");
  }

  const dataBufferOffset = dv.getInt32(offset, true);
  offset += sizeOfInt32;

  const dataBufferSize = dv.getInt32(offset, true);
  offset += sizeOfInt32;

  const metaBufferSize = dv.getInt32(offset, true);
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
  const instances = [];
  for (let i = 0; i < numInstances; ++i) {
    const bitfield = dv.getUint8(offset);
    ++offset;

    ++offset; // 2 byte align

    const cnodeVersion = dv.getUint16(offset, true);
    offset += sizeOfUint16;

    const imageVersion = dv.getUint16(offset, true);
    offset += sizeOfUint16;

    const terrainVersion = dv.getUint16(offset, true);
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
    const imageProvider = dv.getUint8(offset++);
    const terrainProvider = dv.getUint8(offset++);
    offset += sizeOfUint16; // 4 byte align

    instances.push(
      new GoogleEarthEnterpriseTileInformation(
        bitfield,
        cnodeVersion,
        imageVersion,
        terrainVersion,
        imageProvider,
        terrainProvider,
      ),
    );
  }

  const tileInfo = [];
  let index = 0;

  function populateTiles(parentKey, parent, level) {
    let isLeaf = false;
    if (level === 4) {
      if (parent.hasSubtree()) {
        return; // We have a subtree, so just return
      }

      isLeaf = true; // No subtree, so set all children to null
    }
    for (let i = 0; i < 4; ++i) {
      const childKey = parentKey + i.toString();
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

          const instance = instances[index++];
          tileInfo[childKey] = instance;
          populateTiles(childKey, instance, level + 1);
        }
      }
    }
  }

  let level = 0;
  const root = instances[index++];
  if (quadKey === "") {
    // Root tile has data at its root and one less level
    ++level;
  } else {
    tileInfo[quadKey] = root; // This will only contain the child bitmask
  }

  populateTiles(quadKey, root, level);

  return tileInfo;
}

const numMeshesPerPacket = 5;
const numSubMeshesPerMesh = 4;

// Each terrain packet will have 5 meshes - each contain 4 sub-meshes:
//    1 even level mesh and its 4 odd level children.
// Any remaining bytes after the 20 sub-meshes contains water surface meshes,
// which are ignored.
function processTerrain(buffer, totalSize, transferableObjects) {
  const dv = new DataView(buffer);

  // Find the sub-meshes.
  const advanceMesh = function (pos) {
    for (let sub = 0; sub < numSubMeshesPerMesh; ++sub) {
      const size = dv.getUint32(pos, true);
      pos += sizeOfUint32;
      pos += size;
      if (pos > totalSize) {
        throw new RuntimeError("Malformed terrain packet found.");
      }
    }
    return pos;
  };

  let offset = 0;
  const terrainMeshes = [];
  while (terrainMeshes.length < numMeshesPerPacket) {
    const start = offset;
    offset = advanceMesh(offset);
    const mesh = buffer.slice(start, offset);
    transferableObjects.push(mesh);
    terrainMeshes.push(mesh);
  }

  return terrainMeshes;
}

const compressedMagic = 0x7468dead;
const compressedMagicSwap = 0xadde6874;

function uncompressPacket(data) {
  // The layout of this decoded data is
  // Magic Uint32
  // Size Uint32
  // [GZipped chunk of Size bytes]

  // Pullout magic and verify we have the correct data
  const dv = new DataView(data);
  let offset = 0;
  const magic = dv.getUint32(offset, true);
  offset += sizeOfUint32;
  if (magic !== compressedMagic && magic !== compressedMagicSwap) {
    throw new RuntimeError("Invalid magic");
  }

  // Get the size of the compressed buffer - the endianness depends on which magic was used
  const size = dv.getUint32(offset, magic === compressedMagic);
  offset += sizeOfUint32;

  const compressedPacket = new Uint8Array(data, offset);
  const uncompressedPacket = pako.inflate(compressedPacket);

  if (uncompressedPacket.length !== size) {
    throw new RuntimeError("Size of packet doesn't match header");
  }

  return uncompressedPacket;
}
export default createTaskProcessorWorker(decodeGoogleEarthEnterprisePacket);
