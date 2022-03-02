import {
  Cartesian3,
  findTileMetadata,
  MetadataClass,
} from "../../Source/Cesium.js";

describe("Scene/findTileMetadata", function () {
  const tileClass = new MetadataClass({
    id: "tile",
    class: {
      properties: {
        height: {
          type: "SCALAR",
          componentType: "FLOAT32",
        },
        color: {
          type: "VEC3",
          componentType: "UINT8",
        },
      },
    },
  });

  const mockTileset = {
    metadata: {
      schema: {
        classes: {
          tile: tileClass,
        },
      },
    },
  };

  const mockBoundingVolume = {};

  it("returns undefined if there is no metadata or extension", function () {
    const tileHeader = {
      boundingVolume: mockBoundingVolume,
      geometricError: 64,
    };
    const metadata = findTileMetadata(mockTileset, tileHeader);
    expect(metadata).not.toBeDefined();
  });

  it("returns metadata if there is metadata", function () {
    const tileHeader = {
      boundingVolume: mockBoundingVolume,
      geometricError: 64,
      metadata: {
        class: "tile",
        properties: {
          height: 250.5,
          color: [255, 255, 0],
        },
      },
    };

    const metadata = findTileMetadata(mockTileset, tileHeader);
    expect(metadata).toBeDefined();
    expect(metadata.getProperty("height")).toEqual(250.5);
    expect(metadata.getProperty("color")).toEqual(new Cartesian3(255, 255, 0));
  });

  it("returns metadata if there is an extension", function () {
    const tileHeader = {
      boundingVolume: mockBoundingVolume,
      geometricError: 64,
      extensions: {
        "3DTILES_metadata": {
          class: "tile",
          properties: {
            height: 250.5,
            color: [255, 255, 0],
          },
        },
      },
    };

    const metadata = findTileMetadata(mockTileset, tileHeader);
    expect(metadata).toBeDefined();
    expect(metadata.getProperty("height")).toEqual(250.5);
    expect(metadata.getProperty("color")).toEqual(new Cartesian3(255, 255, 0));
  });
});
