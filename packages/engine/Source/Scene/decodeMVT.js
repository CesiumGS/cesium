// @ts-check

/**
 * @typedef {object} MVTPoint
 * @property {number} x Tile-local x (0–extent)
 * @property {number} y Tile-local y (0–extent)
 */

/**
 * @typedef {object} MVTFeature
 * @property {"Point"|"LineString"|"Polygon"|"Unknown"} type
 * @property {Array<MVTPoint>|Array<Array<MVTPoint>>} geometry
 * @property {object} properties
 */

/**
 * @typedef {object} MVTLayer
 * @property {string} name
 * @property {number} extent
 * @property {MVTFeature[]} features
 */

/**
 * @typedef {object} DecodedMVT
 * @property {MVTLayer[]} layers
 */

/**
 * @typedef {(string|number|boolean)} MVTValue
 */

/**
 * @typedef {object} ReadTagResult
 * @property {number} fieldNumber
 * @property {number} wireType
 * @property {number} newPos
 */

/**
 * @typedef {object} ReadVarintResult
 * @property {number} value
 * @property {number} newPos
 */

// Geometry type enum from the MVT spec
const GeomType = {
  UNKNOWN: 0,
  POINT: 1,
  LINESTRING: 2,
  POLYGON: 3,
};

const geomTypeName = ["Unknown", "Point", "LineString", "Polygon"];

/**
 * Decode a Mapbox Vector Tile (MVT / .pbf) binary buffer into layers and
 * features. Geometry coordinates remain in tile-local integer space
 * (0 – layer.extent, typically 4096).
 *
 * @param {ArrayBuffer} arrayBuffer The raw .pbf tile binary
 * @returns {DecodedMVT}
 * @ignore
 */
function decodeMVT(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const layers = [];
  let pos = 0;

  while (pos < bytes.length) {
    const tag = readTag(bytes, pos);
    const fieldNumber = tag.fieldNumber;
    const wireType = tag.wireType;
    pos = tag.newPos;

    // Tile.layers = field 3, wire type 2 (length-delimited)
    if (fieldNumber === 3 && wireType === 2) {
      const layerLength = readVarint(bytes, pos);
      pos = layerLength.newPos;
      const layerEnd = pos + layerLength.value;
      layers.push(decodeLayer(bytes, pos, layerEnd));
      pos = layerEnd;
    } else {
      pos = skipField(bytes, pos, wireType);
    }
  }

  return { layers };
}

/**
 * @param {Uint8Array} bytes
 * @param {number} start
 * @param {number} end
 * @returns {MVTLayer}
 */
function decodeLayer(bytes, start, end) {
  let pos = start;
  let name = "";
  let extent = 4096;
  /** @type {string[]} */
  const keys = [];
  /** @type {Array.<MVTValue>} */
  const values = [];
  const rawFeatures = [];

  while (pos < end) {
    const tag = readTag(bytes, pos);
    const fieldNumber = tag.fieldNumber;
    const wireType = tag.wireType;
    pos = tag.newPos;

    if (fieldNumber === 1 && wireType === 2) {
      // name
      const length = readVarint(bytes, pos);
      pos = length.newPos;
      name = readString(bytes, pos, length.value);
      pos += length.value;
    } else if (fieldNumber === 2 && wireType === 2) {
      // feature
      const length = readVarint(bytes, pos);
      pos = length.newPos;
      rawFeatures.push({ start: pos, end: pos + length.value });
      pos += length.value;
    } else if (fieldNumber === 3 && wireType === 2) {
      // key
      const length = readVarint(bytes, pos);
      pos = length.newPos;
      keys.push(readString(bytes, pos, length.value));
      pos += length.value;
    } else if (fieldNumber === 4 && wireType === 2) {
      // value
      const length = readVarint(bytes, pos);
      pos = length.newPos;
      values.push(decodeValue(bytes, pos, pos + length.value));
      pos += length.value;
    } else if (fieldNumber === 5 && wireType === 0) {
      // extent
      const value = readVarint(bytes, pos);
      extent = value.value;
      pos = value.newPos;
    } else {
      pos = skipField(bytes, pos, wireType);
    }
  }

  const features = rawFeatures.map(({ start, end }) =>
    decodeFeature(bytes, start, end, keys, values),
  );

  return { name, extent, features };
}

/**
 * @param {Uint8Array} bytes
 * @param {number} start
 * @param {number} end
 * @param {string[]} keys
 * @param {Array.<MVTValue>} values
 * @returns {MVTFeature}
 */
function decodeFeature(bytes, start, end, keys, values) {
  let pos = start;
  let geomType = GeomType.UNKNOWN;
  const tags = [];
  const geometryCommands = [];

  while (pos < end) {
    const tag = readTag(bytes, pos);
    const fieldNumber = tag.fieldNumber;
    const wireType = tag.wireType;
    pos = tag.newPos;

    if (fieldNumber === 3 && wireType === 0) {
      // geometry type
      const value = readVarint(bytes, pos);
      geomType = value.value;
      pos = value.newPos;
    } else if (fieldNumber === 2 && wireType === 2) {
      // tags (packed uint32)
      const length = readVarint(bytes, pos);
      pos = length.newPos;
      const tagEnd = pos + length.value;
      while (pos < tagEnd) {
        const value = readVarint(bytes, pos);
        tags.push(value.value);
        pos = value.newPos;
      }
    } else if (fieldNumber === 4 && wireType === 2) {
      // geometry (packed uint32 commands)
      const length = readVarint(bytes, pos);
      pos = length.newPos;
      const geomEnd = pos + length.value;
      while (pos < geomEnd) {
        const value = readVarint(bytes, pos);
        geometryCommands.push(value.value);
        pos = value.newPos;
      }
    } else {
      pos = skipField(bytes, pos, wireType);
    }
  }

  // Build properties from tags
  /** @type {Record<string, string|number|boolean>} */
  const properties = {};
  for (let i = 0; i < tags.length - 1; i += 2) {
    properties[keys[tags[i]]] = values[tags[i + 1]];
  }

  const geometry = decodeGeometry(geomType, geometryCommands);

  return {
    type: /** @type {"Point"|"LineString"|"Polygon"|"Unknown"} */ (
      geomTypeName[geomType] ?? "Unknown"
    ),
    geometry,
    properties,
  };
}

/**
 * Decode MVT geometry commands into coordinate arrays.
 * @param {number} geomType
 * @param {number[]} cmds
 * @returns {*}
 */
function decodeGeometry(geomType, cmds) {
  let i = 0;
  let x = 0;
  let y = 0;

  if (geomType === GeomType.POINT) {
    const points = [];
    while (i < cmds.length) {
      const cmd = cmds[i++];
      const cmdId = cmd & 0x7;
      const count = cmd >> 3;
      if (cmdId === 1) {
        // MoveTo
        for (let c = 0; c < count; c++) {
          x += zigzag(cmds[i++]);
          y += zigzag(cmds[i++]);
          points.push({ x, y });
        }
      }
    }
    return points;
  }

  if (geomType === GeomType.LINESTRING) {
    const lines = [];
    let current = null;
    while (i < cmds.length) {
      const cmd = cmds[i++];
      const cmdId = cmd & 0x7;
      const count = cmd >> 3;
      if (cmdId === 1) {
        // MoveTo - start new line
        if (current !== null) {
          lines.push(current);
        }
        current = [];
        x += zigzag(cmds[i++]);
        y += zigzag(cmds[i++]);
        current.push({ x, y });
      } else if (cmdId === 2) {
        // LineTo
        for (let c = 0; c < count; c++) {
          x += zigzag(cmds[i++]);
          y += zigzag(cmds[i++]);
          current.push({ x, y });
        }
      }
    }
    if (current !== null) {
      lines.push(current);
    }
    return lines;
  }

  if (geomType === GeomType.POLYGON) {
    const rings = [];
    let current = null;
    while (i < cmds.length) {
      const cmd = cmds[i++];
      const cmdId = cmd & 0x7;
      const count = cmd >> 3;
      if (cmdId === 1) {
        // MoveTo - start ring
        if (current !== null) {
          rings.push(current);
        }
        current = [];
        x += zigzag(cmds[i++]);
        y += zigzag(cmds[i++]);
        current.push({ x, y });
      } else if (cmdId === 2) {
        // LineTo
        for (let c = 0; c < count; c++) {
          x += zigzag(cmds[i++]);
          y += zigzag(cmds[i++]);
          current.push({ x, y });
        }
      } else if (cmdId === 7) {
        // ClosePath
        if (current !== null && current.length > 0) {
          current.push({ x: current[0].x, y: current[0].y });
          rings.push(current);
          current = null;
        }
      }
    }
    if (current !== null) {
      rings.push(current);
    }
    return rings;
  }

  return [];
}

/**
 * @param {Uint8Array} bytes
 * @param {number} start
 * @param {number} end
 * @returns {string|number|boolean|null}
 */
function decodeValue(bytes, start, end) {
  let pos = start;
  while (pos < end) {
    const tag = readTag(bytes, pos);
    const fieldNumber = tag.fieldNumber;
    const wireType = tag.wireType;
    pos = tag.newPos;
    if (fieldNumber === 1 && wireType === 2) {
      const length = readVarint(bytes, pos);
      pos = length.newPos;
      return readString(bytes, pos, length.value);
    } else if (fieldNumber === 2 && wireType === 5) {
      // float
      const v = new DataView(
        bytes.buffer,
        bytes.byteOffset + pos,
        4,
      ).getFloat32(0, true);
      pos += 4;
      return v;
    } else if (fieldNumber === 3 && wireType === 1) {
      // double
      const v = new DataView(
        bytes.buffer,
        bytes.byteOffset + pos,
        8,
      ).getFloat64(0, true);
      pos += 8;
      return v;
    } else if (fieldNumber === 4 && wireType === 0) {
      const value = readVarint(bytes, pos);
      pos = value.newPos;
      return value.value;
    } else if (fieldNumber === 5 && wireType === 0) {
      const value = readVarint(bytes, pos);
      pos = value.newPos;
      return value.value;
    } else if (fieldNumber === 6 && wireType === 0) {
      const value = readVarint(bytes, pos);
      pos = value.newPos;
      return zigzag(value.value);
    } else if (fieldNumber === 7 && wireType === 0) {
      const value = readVarint(bytes, pos);
      pos = value.newPos;
      return value.value !== 0;
    }
    pos = skipField(bytes, pos, wireType);
  }
  return null;
}

/**
 * @param {Uint8Array} bytes
 * @param {number} pos
 * @returns {ReadTagResult}
 */
function readTag(bytes, pos) {
  const value = readVarint(bytes, pos);
  return {
    fieldNumber: value.value >>> 3,
    wireType: value.value & 0x7,
    newPos: value.newPos,
  };
}

/**
 * @param {Uint8Array} bytes
 * @param {number} pos
 * @returns {ReadVarintResult}
 */
function readVarint(bytes, pos) {
  let result = 0;
  let shift = 0;
  while (true) {
    const byte = bytes[pos++];
    result |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) {
      break;
    }
    shift += 7;
  }
  return {
    value: result >>> 0,
    newPos: pos,
  };
}

/**
 * @param {Uint8Array} bytes
 * @param {number} pos
 * @param {number} len
 * @returns {string}
 */
function readString(bytes, pos, len) {
  return new TextDecoder().decode(bytes.subarray(pos, pos + len));
}

/**
 * @param {Uint8Array} bytes
 * @param {number} pos
 * @param {number} wireType
 * @returns {number} newPos
 */
function skipField(bytes, pos, wireType) {
  if (wireType === 0) {
    while (bytes[pos++] & 0x80) {
      // advance past varint bytes
    }
    return pos;
  } else if (wireType === 1) {
    return pos + 8;
  } else if (wireType === 2) {
    const length = readVarint(bytes, pos);
    return length.newPos + length.value;
  } else if (wireType === 5) {
    return pos + 4;
  }
  throw new Error(`Unsupported protobuf wire type: ${wireType}`);
}

/**
 * Decode a zigzag-encoded signed integer.
 * @param {number} n
 * @returns {number}
 */
function zigzag(n) {
  return (n >>> 1) ^ -(n & 1);
}

export default decodeMVT;
