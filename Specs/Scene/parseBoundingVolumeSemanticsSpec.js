import {
  TileMetadata,
  Math,
  MetadataClass,
  parseBoundingVolumeSemantics,
} from "../../Source/Cesium.js";

describe("Scene/parseBoundingVolumeSemantics", function () {
  var boundingBox = [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1];
  var boundingRegion = [0, 0, Math.PI_OVER_SIX, Math.PI_OVER_TWO, 0, 50];
  var boundingSphere = [0, 0, 0, 1];
  var minimumHeight = -10;
  var maximumHeight = 10;

  it("throws without tileMetadata", function () {
    expect(function () {
      return parseBoundingVolumeSemantics(undefined);
    }).toThrowDeveloperError();
  });

  it("works if no semantics are present", function () {
    // Note: TileMetadata is used in unit tests instead of ImplicitTileMetadata
    // as the former is more straightforward to construct
    var emptyMetadata = new TileMetadata({
      tile: {
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
    var tileClass = new MetadataClass({
      id: "tile",
      class: {
        properties: {
          tileMinimumHeight: {
            type: "FLOAT32",
            semantic: "TILE_MINIMUM_HEIGHT",
          },
          tileMaximumHeight: {
            type: "FLOAT32",
            semantic: "TILE_MAXIMUM_HEIGHT",
          },
          contentMinimumHeight: {
            type: "FLOAT32",
            semantic: "CONTENT_MINIMUM_HEIGHT",
          },
          contentMaximumHeight: {
            type: "FLOAT32",
            semantic: "CONTENT_MAXIMUM_HEIGHT",
          },
        },
      },
    });

    var tileMetadata = new TileMetadata({
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
    var tileClass = new MetadataClass({
      id: "tile",
      class: {
        properties: {
          tileBoundingBox: {
            type: "ARRAY",
            componentType: "FLOAT64",
            componentCount: 12,
            semantic: "TILE_BOUNDING_BOX",
          },
          contentBoundingSphere: {
            type: "ARRAY",
            componentType: "FLOAT64",
            componentCount: 4,
            semantic: "CONTENT_BOUNDING_SPHERE",
          },
        },
      },
    });

    var tileMetadata = new TileMetadata({
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
    var tileClass = new MetadataClass({
      id: "tile",
      class: {
        properties: {
          tileBoundingBox: {
            type: "ARRAY",
            componentType: "FLOAT64",
            componentCount: 12,
            semantic: "TILE_BOUNDING_BOX",
          },
          tileBoundingRegion: {
            type: "ARRAY",
            componentType: "FLOAT64",
            componentCount: 6,
            semantic: "TILE_BOUNDING_REGION",
          },
          contentBoundingRegion: {
            type: "ARRAY",
            componentType: "FLOAT64",
            componentCount: 6,
            semantic: "CONTENT_BOUNDING_REGION",
          },
          contentBoundingSphere: {
            type: "ARRAY",
            componentType: "FLOAT64",
            componentCount: 4,
            semantic: "CONTENT_BOUNDING_SPHERE",
          },
        },
      },
    });

    var tileMetadata = new TileMetadata({
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
