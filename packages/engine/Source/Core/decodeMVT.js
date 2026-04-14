// @ts-check

import Cartesian3 from "./Cartesian3.js";
import Cartographic from "./Cartographic.js";
import Ellipsoid from "./Ellipsoid.js";

/**
 * @typedef {object} MVTPoint
 * @property {number} x Tile-local x (0–extent)
 * @property {number} y Tile-local y (0–extent)
 */

/**
 * @typedef {object} MVTFeature
 * @property {"Point"|"LineString"|"Polygon"|"Unknown"} type
 * @property {Array<MVTPoint>|Array<Array<MVTPoint>>|Array<Array<Array<MVTPoint>>>} geometry
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
 * (0 – layer.extent, typically 4096). Use {@link mvtTileToCartesian3} to
 * convert them to world-space Cartesian3 positions.
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
    const [fieldNumber, wireType, newPos1] = readTag(bytes, pos);
    pos = newPos1;

    // Tile.layers = field 3, wire type 2 (length-delimited)
    if (fieldNumber === 3 && wireType === 2) {
      const [len, newPos2] = readVarint(bytes, pos);
      pos = newPos2;
      const layerEnd = pos + len;
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
  /** @type {(string|number|boolean)[]} */
  const values = [];
  const rawFeatures = [];

  while (pos < end) {
    const [fieldNumber, wireType, newPos] = readTag(bytes, pos);
    pos = newPos;

    if (fieldNumber === 1 && wireType === 2) {
      // name
      const [len, p] = readVarint(bytes, pos);
      pos = p;
      name = readString(bytes, pos, len);
      pos += len;
    } else if (fieldNumber === 2 && wireType === 2) {
      // feature
      const [len, p] = readVarint(bytes, pos);
      pos = p;
      rawFeatures.push({ start: pos, end: pos + len });
      pos += len;
    } else if (fieldNumber === 3 && wireType === 2) {
      // key
      const [len, p] = readVarint(bytes, pos);
      pos = p;
      keys.push(readString(bytes, pos, len));
      pos += len;
    } else if (fieldNumber === 4 && wireType === 2) {
      // value
      const [len, p] = readVarint(bytes, pos);
      pos = p;
      values.push(decodeValue(bytes, pos, pos + len));
      pos += len;
    } else if (fieldNumber === 5 && wireType === 0) {
      // extent
      const [v, p] = readVarint(bytes, pos);
      extent = v;
      pos = p;
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
 * @param {(string|number|boolean)[]} values
 * @returns {MVTFeature}
 */
function decodeFeature(bytes, start, end, keys, values) {
  let pos = start;
  let geomType = GeomType.UNKNOWN;
  const tags = [];
  const geometryCommands = [];

  while (pos < end) {
    const [fieldNumber, wireType, newPos] = readTag(bytes, pos);
    pos = newPos;

    if (fieldNumber === 3 && wireType === 0) {
      // geometry type
      const [v, p] = readVarint(bytes, pos);
      geomType = v;
      pos = p;
    } else if (fieldNumber === 2 && wireType === 2) {
      // tags (packed uint32)
      const [len, p] = readVarint(bytes, pos);
      pos = p;
      const tagEnd = pos + len;
      while (pos < tagEnd) {
        const [v, pp] = readVarint(bytes, pos);
        tags.push(v);
        pos = pp;
      }
    } else if (fieldNumber === 4 && wireType === 2) {
      // geometry (packed uint32 commands)
      const [len, p] = readVarint(bytes, pos);
      pos = p;
      const geomEnd = pos + len;
      while (pos < geomEnd) {
        const [v, pp] = readVarint(bytes, pos);
        geometryCommands.push(v);
        pos = pp;
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
 * @returns {string|number|boolean}
 */
function decodeValue(bytes, start, end) {
  let pos = start;
  while (pos < end) {
    const [fieldNumber, wireType, newPos] = readTag(bytes, pos);
    pos = newPos;
    if (fieldNumber === 1 && wireType === 2) {
      const [len, p] = readVarint(bytes, pos);
      pos = p;
      return readString(bytes, pos, len);
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
      const [v, p] = readVarint(bytes, pos);
      pos = p;
      return v;
    } else if (fieldNumber === 5 && wireType === 0) {
      const [v, p] = readVarint(bytes, pos);
      pos = p;
      return v;
    } else if (fieldNumber === 6 && wireType === 0) {
      const [v, p] = readVarint(bytes, pos);
      pos = p;
      return zigzag(v);
    } else if (fieldNumber === 7 && wireType === 0) {
      const [v, p] = readVarint(bytes, pos);
      pos = p;
      return v !== 0;
    }
    pos = skipField(bytes, pos, wireType);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Low-level protobuf helpers
// ---------------------------------------------------------------------------

/**
 * @param {Uint8Array} bytes
 * @param {number} pos
 * @returns {[number, number, number]} [fieldNumber, wireType, newPos]
 */
function readTag(bytes, pos) {
  const [tag, newPos] = readVarint(bytes, pos);
  return [tag >>> 3, tag & 0x7, newPos];
}

/**
 * @param {Uint8Array} bytes
 * @param {number} pos
 * @returns {[number, number]} [value, newPos]
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
  return [result >>> 0, pos];
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
    const [len, p] = readVarint(bytes, pos);
    return p + len;
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

// ---------------------------------------------------------------------------
// Coordinate conversion
// ---------------------------------------------------------------------------

const scratchCartographic = new Cartographic();
const scratchCartesian = new Cartesian3();

/**
 * Convert a tile-local MVT coordinate ({x, y} in 0–extent integer space) to
 * a WGS84 Cartesian3 world position.
 *
 * MVT x increases east, y increases south (screen-space convention).
 *
 * @param {{x:number, y:number}} pt Tile-local coordinate
 * @param {number} tileX Tile column index
 * @param {number} tileY Tile row index
 * @param {number} tileZ Tile zoom level
 * @param {number} extent Layer extent (usually 4096)
 * @param {number[]} out Flat xyz output array
 * @param {number} outOffset Starting index in out
 */
function mvtPointToXyz(pt, tileX, tileY, tileZ, extent, out, outOffset) {
  const n = 1 << tileZ;
  const u = (tileX + pt.x / extent) / n;
  const v = (tileY + pt.y / extent) / n;

  // Web Mercator tile → longitude/latitude
  const lon = u * 2 * Math.PI - Math.PI;
  const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * v)));

  scratchCartographic.longitude = lon;
  scratchCartographic.latitude = lat;
  scratchCartographic.height = 0;

  const pos = Ellipsoid.WGS84.cartographicToCartesian(
    scratchCartographic,
    scratchCartesian,
  );

  out[outOffset] = pos.x;
  out[outOffset + 1] = pos.y;
  out[outOffset + 2] = pos.z;
}

export { decodeMVT, mvtPointToXyz };
export default decodeMVT;
