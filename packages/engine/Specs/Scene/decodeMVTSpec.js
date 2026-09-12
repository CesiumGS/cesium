import { decodeMVT } from "../../index.js";

describe("Scene/decodeMVT", function () {
  function encodeVarint(value) {
    const bytes = [];
    let n = value >>> 0;
    while (n >= 0x80) {
      bytes.push((n & 0x7f) | 0x80);
      n >>>= 7;
    }
    bytes.push(n);
    return bytes;
  }

  function encodeTag(fieldNumber, wireType) {
    return encodeVarint((fieldNumber << 3) | wireType);
  }

  function encodeUInt(fieldNumber, value) {
    return [...encodeTag(fieldNumber, 0), ...encodeVarint(value)];
  }

  function encodeBytes(fieldNumber, valueBytes) {
    return [
      ...encodeTag(fieldNumber, 2),
      ...encodeVarint(valueBytes.length),
      ...valueBytes,
    ];
  }

  function encodeString(fieldNumber, value) {
    const bytes = [];
    for (let i = 0; i < value.length; i++) {
      bytes.push(value.charCodeAt(i));
    }
    return encodeBytes(fieldNumber, bytes);
  }

  function encodePackedVarints(fieldNumber, values) {
    const payload = [];
    for (let i = 0; i < values.length; i++) {
      payload.push(...encodeVarint(values[i]));
    }
    return encodeBytes(fieldNumber, payload);
  }

  function encodeValueString(value) {
    return encodeString(1, value);
  }

  function encodeFeature(options) {
    const bytes = [];
    if (options.tags && options.tags.length > 0) {
      bytes.push(...encodePackedVarints(2, options.tags));
    }
    bytes.push(...encodeUInt(3, options.type));
    bytes.push(...encodePackedVarints(4, options.geometryCommands));
    return bytes;
  }

  function encodeLayer(options) {
    const bytes = [];
    bytes.push(...encodeString(1, options.name));
    for (let i = 0; i < options.features.length; i++) {
      bytes.push(...encodeBytes(2, options.features[i]));
    }
    for (let i = 0; i < options.keys.length; i++) {
      bytes.push(...encodeString(3, options.keys[i]));
    }
    for (let i = 0; i < options.values.length; i++) {
      bytes.push(...encodeBytes(4, options.values[i]));
    }
    bytes.push(...encodeUInt(5, options.extent ?? 4096));
    bytes.push(...encodeUInt(15, 2)); // layer version
    return bytes;
  }

  function encodeTile(layers) {
    const bytes = [];
    for (let i = 0; i < layers.length; i++) {
      bytes.push(...encodeBytes(3, layers[i]));
    }
    return new Uint8Array(bytes).buffer;
  }

  it("decodes point geometry and feature properties", function () {
    const pointFeature = encodeFeature({
      type: 1, // POINT
      tags: [0, 0], // key[0] -> value[0]
      geometryCommands: [9, 50, 34], // MoveTo(1), dx=25, dy=17
    });
    const layer = encodeLayer({
      name: "roads",
      features: [pointFeature],
      keys: ["id"],
      values: [encodeValueString("p1")],
    });
    const tile = encodeTile([layer]);

    const decoded = decodeMVT(tile);
    expect(decoded.layers.length).toBe(1);
    expect(decoded.layers[0].name).toBe("roads");
    expect(decoded.layers[0].features.length).toBe(1);

    const feature = decoded.layers[0].features[0];
    expect(feature.type).toBe("Point");
    expect(feature.geometry).toEqual([{ x: 25, y: 17 }]);
    expect(feature.properties.id).toBe("p1");
  });

  it("decodes linestring and polygon command streams", function () {
    const lineFeature = encodeFeature({
      type: 2, // LINESTRING
      geometryCommands: [9, 0, 0, 18, 20, 0, 0, 10],
    });
    const polygonFeature = encodeFeature({
      type: 3, // POLYGON
      geometryCommands: [9, 0, 0, 26, 20, 0, 0, 20, 19, 0, 15],
    });
    const layer = encodeLayer({
      name: "shapes",
      features: [lineFeature, polygonFeature],
      keys: [],
      values: [],
    });
    const tile = encodeTile([layer]);

    const decoded = decodeMVT(tile);
    const line = decoded.layers[0].features[0];
    const polygon = decoded.layers[0].features[1];

    expect(line.type).toBe("LineString");
    expect(line.geometry[0]).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 5 },
    ]);

    expect(polygon.type).toBe("Polygon");
    expect(polygon.geometry[0]).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
      { x: 0, y: 0 },
    ]);
  });
});
