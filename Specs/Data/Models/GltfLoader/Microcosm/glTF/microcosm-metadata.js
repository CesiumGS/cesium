"use strict";

const fs = require("fs");

/**
 * Need to know these lengths:
 * - total buffer length
 *
 * - LULC Name bufferView length and offsets
 * - LULC Name offsets bufferView length and offsets
 * - LULC Color bufferView length and offsets
 */

// This is how I mapped the color values in GIMP. Kinda haphazard admittedly.
const landCoverValues = {
  0: {
    name: "Grassland",
    color: [118, 163, 11],
  },
  32: {
    name: "Rocky Ground",
    color: [110, 110, 110],
  },
  64: {
    name: "Desert",
    color: [212, 209, 182],
  },
  128: {
    name: "River",
    color: [82, 173, 204],
  },
  208: {
    name: "Forest",
    color: [50, 84, 51],
  },
  255: {
    name: "Building",
    color: [194, 194, 194],
  },
};

const unusedLandCover = {
  name: "Unused",
  color: [0, 0, 0],
};

const numberOfLandCoverFeatures = 256;
const sizeOfColor = 3;

function makeLandCoverColors() {
  const bufferLength = numberOfLandCoverFeatures * sizeOfColor;
  const buffer = Buffer.alloc(bufferLength);
  for (let i = 0; i < numberOfLandCoverFeatures; i++) {
    const feature = landCoverValues[i];
    if (feature !== undefined) {
      const [r, g, b] = feature.color;
      buffer[3 * i] = r;
      buffer[3 * i + 1] = g;
      buffer[3 * i + 2] = b;
    }

    // Otherwise the default color of 0, 0, 0 is used,
    // but the buffer is allocated with all 0s so no work is needed here.
  }
  return buffer;
}

function makeLandCoverNames() {
  const offsets = new Uint32Array(numberOfLandCoverFeatures + 1);
  let nameText = "";
  let currentOffset = 0;
  for (let i = 0; i < numberOfLandCoverFeatures; i++) {
    let feature = landCoverValues[i];
    if (feature === undefined) {
      feature = unusedLandCover;
    }

    const name = feature.name;
    const nameLength = Buffer.byteLength(name, "utf8");

    offsets[i] = currentOffset;
    currentOffset += nameLength;

    nameText += name;
  }
  offsets[numberOfLandCoverFeatures] = currentOffset;

  const namesBuffer = Buffer.from(nameText, "utf8");

  const offsetsBuffer = Buffer.alloc(offsets.byteLength);
  for (let i = 0; i <= numberOfLandCoverFeatures; ++i) {
    offsetsBuffer.writeUInt32LE(offsets[i], i * 4);
  }
  return [namesBuffer, offsetsBuffer];
}

function makeBufferViews() {
  const [landCoverNames, landCoverOffsets] = makeLandCoverNames();
  const landCoverColor = makeLandCoverColors();

  return [
    {
      name: "LULC Color",
      bufferView: landCoverColor,
    },
    {
      name: "LULC Name",
      bufferView: landCoverNames,
    },
    {
      name: "LULC Name Offsets",
      bufferView: landCoverOffsets,
    },
  ];
}

function makeBinFile() {
  const bufferViewInfos = makeBufferViews();
  const bufferViews = [];
  const stats = [];
  let offset = 0;
  for (const bufferViewInfo of bufferViewInfos) {
    if (offset % 8 != 0) {
      const paddingBytes = 8 - (offset % 8);
      console.log(`Offset not aligned, adding ${paddingBytes} of padding`);
      const padding = Buffer.alloc(paddingBytes);
      bufferViews.push(padding);
      offset += paddingBytes;
    }

    const bufferView = bufferViewInfo.bufferView;
    const byteLength = bufferView.byteLength;
    stats.push({
      name: bufferViewInfo.name,
      buffer: 1,
      byteLength: byteLength,
      byteOffset: offset,
    });
    offset += byteLength;

    bufferViews.push(bufferView);
  }

  const buffer = Buffer.concat(bufferViews);
  fs.writeFileSync("microcosm-metadata.bin", buffer);

  console.log(JSON.stringify(stats, undefined, 4));
  console.log("totalLength:", buffer.byteLength);
}

makeBinFile();
