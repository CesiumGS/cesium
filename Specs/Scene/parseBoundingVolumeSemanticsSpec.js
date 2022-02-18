import {
  TileMetadata,
  Math,
  MetadataClass,
  parseBoundingVolumeSemantics,
} from "../../Source/Cesium.js";

describe("Scene/parseBoundingVolumeSemantics", function () {
  const boundingBox = [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1];
  const boundingRegion = [0, 0, Math.PI_OVER_SIX, Math.PI_OVER_TWO, 0, 50];
  const boundingSphere = [0, 0, 0, 1];
  const minimumHeight = -10;
  const maximumHeight = 10;

  it("throws without tileMetadata", function () {
    expect(function () {
      return parseBoundingVolumeSemantics(undefined);
    }).toThrowDeveloperError();
  });

  it("works if no semantics are present", function () {
    // Note: TileMetadata is used in unit tests instead of ImplicitTileMetadata
    // as the former is more straightforward to construct
    const emptyMetadata = new TileMetadata({
      tile: {
        properties: {},
      },
      class: {
        properties: {},
      },
    });
    expect(parseBoundingVolumeSemantics(emptyMetadata)).toEqual({
      tile: {
        boundingVolume: undefined,
        minimumHeight: undefined,
        maximumHeight: undefined,
      },
      content: {
        boundingVolume: undefined,
        minimumHeight: undefined,
        maximumHeight: undefined,
      },
    });
  });

  it("parses minimum and maximum height", function () {
    const tileClass = new MetadataClass({
      id: "tile",
      class: {
        properties: {
          tileMinimumHeight: {
            type: "SCALAR",
            componentType: "FLOAT32",
            semantic: "TILE_MINIMUM_HEIGHT",
          },
          tileMaximumHeight: {
            type: "SCALAR",
            componentType: "FLOAT32",
            semantic: "TILE_MAXIMUM_HEIGHT",
          },
          contentMinimumHeight: {
            type: "SCALAR",
            componentType: "FLOAT32",
            semantic: "CONTENT_MINIMUM_HEIGHT",
          },
          contentMaximumHeight: {
            type: "SCALAR",
            componentType: "FLOAT32",
            semantic: "CONTENT_MAXIMUM_HEIGHT",
          },
        },
      },
    });

    const tileMetadata = new TileMetadata({
      class: tileClass,
      tile: {
        properties: {
          tileMinimumHeight: minimumHeight,
          tileMaximumHeight: maximumHeight,
          contentMinimumHeight: minimumHeight,
          contentMaximumHeight: maximumHeight,
        },
      },
    });

    expect(parseBoundingVolumeSemantics(tileMetadata)).toEqual({
      tile: {
        boundingVolume: undefined,
        minimumHeight: minimumHeight,
        maximumHeight: maximumHeight,
      },
      content: {
        boundingVolume: undefined,
        minimumHeight: minimumHeight,
        maximumHeight: maximumHeight,
      },
    });
  });

  it("parses bounding volumes", function () {
    const tileClass = new MetadataClass({
      id: "tile",
      class: {
        properties: {
          tileBoundingBox: {
            type: "SCALAR",
            componentType: "FLOAT64",
            array: true,
            count: 12,
            semantic: "TILE_BOUNDING_BOX",
          },
          contentBoundingSphere: {
            type: "SCALAR",
            componentType: "FLOAT64",
            array: true,
            count: 4,
            semantic: "CONTENT_BOUNDING_SPHERE",
          },
        },
      },
    });

    const tileMetadata = new TileMetadata({
      class: tileClass,
      tile: {
        properties: {
          tileBoundingBox: boundingBox,
          contentBoundingSphere: boundingSphere,
        },
      },
    });

    expect(parseBoundingVolumeSemantics(tileMetadata)).toEqual({
      tile: {
        boundingVolume: {
          box: boundingBox,
        },
        minimumHeight: undefined,
        maximumHeight: undefined,
      },
      content: {
        boundingVolume: {
          sphere: boundingSphere,
        },
        minimumHeight: undefined,
        maximumHeight: undefined,
      },
    });
  });

  it("bounding volumes are parsed with the precedence box, region, then sphere", function () {
    const tileClass = new MetadataClass({
      id: "tile",
      class: {
        properties: {
          tileBoundingBox: {
            type: "SCALAR",
            componentType: "FLOAT64",
            array: true,
            count: 12,
            semantic: "TILE_BOUNDING_BOX",
          },
          tileBoundingRegion: {
            type: "SCALAR",
            componentType: "FLOAT64",
            array: true,
            count: 6,
            semantic: "TILE_BOUNDING_REGION",
          },
          contentBoundingRegion: {
            type: "SCALAR",
            componentType: "FLOAT64",
            array: true,
            count: 6,
            semantic: "CONTENT_BOUNDING_REGION",
          },
          contentBoundingSphere: {
            type: "SCALAR",
            componentType: "FLOAT64",
            array: true,
            count: 4,
            semantic: "CONTENT_BOUNDING_SPHERE",
          },
        },
      },
    });

    const tileMetadata = new TileMetadata({
      class: tileClass,
      tile: {
        properties: {
          tileBoundingBox: boundingBox,
          tileBoundingRegion: boundingRegion,
          contentBoundingRegion: boundingRegion,
          contentBoundingSphere: boundingSphere,
        },
      },
    });
    expect(parseBoundingVolumeSemantics(tileMetadata)).toEqual({
      tile: {
        boundingVolume: {
          box: boundingBox,
        },
        minimumHeight: undefined,
        maximumHeight: undefined,
      },
      content: {
        boundingVolume: {
          region: boundingRegion,
        },
        minimumHeight: undefined,
        maximumHeight: undefined,
      },
    });
  });
});
