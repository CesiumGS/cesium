import {
  Cartesian3,
  findTileMetadata,
  MetadataClass,
} from "../../Source/Cesium.js";

describe("Scene/findTileMetadata", function () {
  let tileClass;
  let mockTileset;
  beforeAll(function () {
    tileClass = new MetadataClass({
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

    mockTileset = {
      schema: {
        classes: {
          tile: tileClass,
        },
      },
    };
  });

  const mockBoundingVolume = {};

  it("returns undefined if there is no metadata or extension", function () {
    const tileHeader = {
      boundingVolume: mockBoundingVolume,
      geometricError: 64,
    };
    const metadata = findTileMetadata(mockTileset, tileHeader);
    expect(metadata).not.toBeDefined();
  });

  it("logs a warning and returns undefined if the tileset is missing a schema", function () {
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

    spyOn(findTileMetadata, "_oneTimeWarning");
    const tilesetWithoutSchema = {};
    const metadata = findTileMetadata(tilesetWithoutSchema, tileHeader);
    expect(metadata).not.toBeDefined();
    expect(findTileMetadata._oneTimeWarning).toHaveBeenCalled();
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

  it("returns metadata if there is an extension (legacy)", function () {
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
