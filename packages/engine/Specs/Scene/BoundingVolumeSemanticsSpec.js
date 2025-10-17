import {
  TileMetadata,
  Math,
  MetadataClass,
  BoundingVolumeSemantics,
} from "../../index.js";

describe("Scene/BoundingVolumeSemantics", function () {
  const boundingBox = [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1];
  const boundingRegion = [0, 0, Math.PI_OVER_SIX, Math.PI_OVER_TWO, 0, 50];
  const boundingSphere = [0, 0, 0, 1];
  const minimumHeight = -10;
  const maximumHeight = 10;

  // Metadata class describing all the possible properties
  const tileClass = MetadataClass.fromJson({
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
        tileBoundingSphere: {
          type: "SCALAR",
          componentType: "FLOAT64",
          array: true,
          count: 4,
          semantic: "TILE_BOUNDING_SPHERE",
        },
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
      },
    },
  });

  // Note: TileMetadata is used in unit tests instead of ImplicitMetadataView
  // as the former is more straightforward to construct
  const emptyTileMetadata = new TileMetadata({
    tile: {
      properties: {},
    },
    class: {
      properties: {},
    },
  });

  describe("parseAllBoundingVolumeSemantics", function () {
    it("throws without prefix", function () {
      expect(function () {
        return BoundingVolumeSemantics.parseAllBoundingVolumeSemantics(
          undefined,
          emptyTileMetadata,
        );
      }).toThrowDeveloperError();
    });

    it("throws if prefix is not TILE or CONTENT", function () {
      expect(function () {
        return BoundingVolumeSemantics.parseAllBoundingVolumeSemantics(
          "TILESET",
          emptyTileMetadata,
        );
      }).toThrowDeveloperError();
    });

    it("throws without metadata", function () {
      expect(function () {
        return BoundingVolumeSemantics.parseAllBoundingVolumeSemantics(
          "TILE",
          undefined,
        );
      }).toThrowDeveloperError();
    });

    it("works if no semantics are present", function () {
      expect(
        BoundingVolumeSemantics.parseAllBoundingVolumeSemantics(
          "TILE",
          emptyTileMetadata,
        ),
      ).toEqual({
        boundingVolume: undefined,
        minimumHeight: undefined,
        maximumHeight: undefined,
      });
    });

    it("parses minimum and maximum height", function () {
      const tileMetadata = new TileMetadata({
        class: tileClass,
        tile: {
          properties: {
            tileMinimumHeight: minimumHeight,
            tileMaximumHeight: maximumHeight,
          },
        },
      });

      expect(
        BoundingVolumeSemantics.parseAllBoundingVolumeSemantics(
          "TILE",
          tileMetadata,
        ),
      ).toEqual({
        boundingVolume: undefined,
        minimumHeight: minimumHeight,
        maximumHeight: maximumHeight,
      });
    });

    it("parses bounding volumes", function () {
      const tileMetadataBox = new TileMetadata({
        class: tileClass,
        tile: {
          properties: {
            tileBoundingBox: boundingBox,
          },
        },
      });

      const tileMetadataRegion = new TileMetadata({
        class: tileClass,
        tile: {
          properties: {
            tileBoundingRegion: boundingRegion,
          },
        },
      });

      const tileMetadataSphere = new TileMetadata({
        class: tileClass,
        tile: {
          properties: {
            tileBoundingSphere: boundingSphere,
          },
        },
      });

      expect(
        BoundingVolumeSemantics.parseAllBoundingVolumeSemantics(
          "TILE",
          tileMetadataBox,
        ),
      ).toEqual({
        boundingVolume: {
          box: boundingBox,
        },
        minimumHeight: undefined,
        maximumHeight: undefined,
      });

      expect(
        BoundingVolumeSemantics.parseAllBoundingVolumeSemantics(
          "TILE",
          tileMetadataRegion,
        ),
      ).toEqual({
        boundingVolume: {
          region: boundingRegion,
        },
        minimumHeight: undefined,
        maximumHeight: undefined,
      });

      expect(
        BoundingVolumeSemantics.parseAllBoundingVolumeSemantics(
          "TILE",
          tileMetadataSphere,
        ),
      ).toEqual({
        boundingVolume: {
          sphere: boundingSphere,
        },
        minimumHeight: undefined,
        maximumHeight: undefined,
      });
    });

    it("bounding volumes are parsed with the precedence box, region, then sphere", function () {
      const tileMetadataBoxRegion = new TileMetadata({
        class: tileClass,
        tile: {
          properties: {
            tileBoundingBox: boundingBox,
            tileBoundingRegion: boundingRegion,
          },
        },
      });

      const tileMetadataRegionSphere = new TileMetadata({
        class: tileClass,
        tile: {
          properties: {
            tileBoundingRegion: boundingRegion,
            tileBoundingSphere: boundingSphere,
          },
        },
      });

      expect(
        BoundingVolumeSemantics.parseAllBoundingVolumeSemantics(
          "TILE",
          tileMetadataBoxRegion,
        ),
      ).toEqual({
        boundingVolume: {
          box: boundingBox,
        },
        minimumHeight: undefined,
        maximumHeight: undefined,
      });

      expect(
        BoundingVolumeSemantics.parseAllBoundingVolumeSemantics(
          "TILE",
          tileMetadataRegionSphere,
        ),
      ).toEqual({
        boundingVolume: {
          region: boundingRegion,
        },
        minimumHeight: undefined,
        maximumHeight: undefined,
      });
    });
  });

  describe("parseBoundingVolumeSemantic", function () {
    it("throws without prefix", function () {
      expect(function () {
        return BoundingVolumeSemantics.parseBoundingVolumeSemantic(
          undefined,
          emptyTileMetadata,
        );
      }).toThrowDeveloperError();
    });

    it("throws if prefix is not TILE or CONTENT", function () {
      expect(function () {
        return BoundingVolumeSemantics.parseBoundingVolumeSemantic(
          "TILESET",
          emptyTileMetadata,
        );
      }).toThrowDeveloperError();
    });

    it("throws without metadata", function () {
      expect(function () {
        return BoundingVolumeSemantics.parseBoundingVolumeSemantic(
          "TILE",
          undefined,
        );
      }).toThrowDeveloperError();
    });

    it("returns undefined if there are no bounding volume semantics", function () {
      const boundingVolume =
        BoundingVolumeSemantics.parseBoundingVolumeSemantic(
          "TILE",
          emptyTileMetadata,
        );
      expect(boundingVolume).not.toBeDefined();
    });

    it("parses box", function () {
      const tileMetadata = new TileMetadata({
        class: tileClass,
        tile: {
          properties: {
            tileBoundingBox: boundingBox,
          },
        },
      });
      const boundingVolume =
        BoundingVolumeSemantics.parseBoundingVolumeSemantic(
          "TILE",
          tileMetadata,
        );
      expect(boundingVolume).toEqual({
        box: boundingBox,
      });
    });

    it("parses region", function () {
      const tileMetadata = new TileMetadata({
        class: tileClass,
        tile: {
          properties: {
            tileBoundingRegion: boundingRegion,
          },
        },
      });
      const boundingVolume =
        BoundingVolumeSemantics.parseBoundingVolumeSemantic(
          "TILE",
          tileMetadata,
        );
      expect(boundingVolume).toEqual({
        region: boundingRegion,
      });
    });

    it("parses sphere", function () {
      const tileMetadata = new TileMetadata({
        class: tileClass,
        tile: {
          properties: {
            tileBoundingSphere: boundingSphere,
          },
        },
      });
      const boundingVolume =
        BoundingVolumeSemantics.parseBoundingVolumeSemantic(
          "TILE",
          tileMetadata,
        );
      expect(boundingVolume).toEqual({
        sphere: boundingSphere,
      });
    });

    it("parses with the precedence box, region, then sphere", function () {
      const tileMetadataBoxRegion = new TileMetadata({
        class: tileClass,
        tile: {
          properties: {
            tileBoundingBox: boundingBox,
            tileBoundingRegion: boundingRegion,
          },
        },
      });
      // Box is handled before region
      const box = BoundingVolumeSemantics.parseBoundingVolumeSemantic(
        "TILE",
        tileMetadataBoxRegion,
      );
      expect(box).toEqual({
        box: boundingBox,
      });

      const tileMetadataRegionSphere = new TileMetadata({
        class: tileClass,
        tile: {
          properties: {
            tileBoundingRegion: boundingRegion,
            tileBoundingSphere: boundingSphere,
          },
        },
      });

      // region is handled before sphere
      const region = BoundingVolumeSemantics.parseBoundingVolumeSemantic(
        "TILE",
        tileMetadataRegionSphere,
      );
      expect(region).toEqual({
        region: boundingRegion,
      });
    });
  });

  describe("_parseMinimumHeight", function () {
    it("throws without prefix", function () {
      expect(function () {
        return BoundingVolumeSemantics._parseMinimumHeight(
          undefined,
          emptyTileMetadata,
        );
      }).toThrowDeveloperError();
    });

    it("throws if prefix is not TILE or CONTENT", function () {
      expect(function () {
        return BoundingVolumeSemantics._parseMinimumHeight(
          "TILESET",
          emptyTileMetadata,
        );
      }).toThrowDeveloperError();
    });

    it("throws without metadata", function () {
      expect(function () {
        return BoundingVolumeSemantics._parseMinimumHeight("TILE", undefined);
      }).toThrowDeveloperError();
    });

    it("returns undefined if minimum height not present", function () {
      const height = BoundingVolumeSemantics._parseMinimumHeight(
        "TILE",
        emptyTileMetadata,
      );
      expect(height).not.toBeDefined();
    });

    it("parses minimum height", function () {
      const tileMetadata = new TileMetadata({
        class: tileClass,
        tile: {
          properties: {
            tileMinimumHeight: minimumHeight,
          },
        },
      });
      const height = BoundingVolumeSemantics._parseMinimumHeight(
        "TILE",
        tileMetadata,
      );
      expect(height).toBe(minimumHeight);
    });
  });

  describe("_parseMaximumHeight", function () {
    it("throws without prefix", function () {
      expect(function () {
        return BoundingVolumeSemantics._parseMaximumHeight(
          undefined,
          emptyTileMetadata,
        );
      }).toThrowDeveloperError();
    });

    it("throws if prefix is not TILE or CONTENT", function () {
      expect(function () {
        return BoundingVolumeSemantics._parseMaximumHeight(
          "TILESET",
          emptyTileMetadata,
        );
      }).toThrowDeveloperError();
    });

    it("throws without metadata", function () {
      expect(function () {
        return BoundingVolumeSemantics._parseMaximumHeight("TILE", undefined);
      }).toThrowDeveloperError();
    });

    it("returns undefined if maximum height not present", function () {
      const height = BoundingVolumeSemantics._parseMaximumHeight(
        "TILE",
        emptyTileMetadata,
      );
      expect(height).not.toBeDefined();
    });

    it("parses maximum height", function () {
      const tileMetadata = new TileMetadata({
        class: tileClass,
        tile: {
          properties: {
            tileMaximumHeight: maximumHeight,
          },
        },
      });
      const height = BoundingVolumeSemantics._parseMaximumHeight(
        "TILE",
        tileMetadata,
      );
      expect(height).toBe(maximumHeight);
    });
  });
});
