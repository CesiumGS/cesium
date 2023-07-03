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
        contentBoundingBox: {
          type: "SCALAR",
          componentType: "FLOAT64",
          array: true,
          count: 12,
          semantic: "CONTENT_BOUNDING_BOX",
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

  // Note: TileMetadata is used in unit tests instead of ImplicitMetadataView
  // as the former is more straightforward to construct
  const emptyMetadata = new TileMetadata({
    tile: {
      properties: {},
    },
    class: {
      properties: {},
    },
  });

  describe("parseAllBoundingVolumeSemantics", function () {
    it("throws without tileMetadata", function () {
      expect(function () {
        return BoundingVolumeSemantics.parseAllBoundingVolumeSemantics(
          undefined
        );
      }).toThrowDeveloperError();
    });

    it("works if no semantics are present", function () {
      expect(
        BoundingVolumeSemantics.parseAllBoundingVolumeSemantics(emptyMetadata)
      ).toEqual({
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

      expect(
        BoundingVolumeSemantics.parseAllBoundingVolumeSemantics(tileMetadata)
      ).toEqual({
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
      const tileMetadata = new TileMetadata({
        class: tileClass,
        tile: {
          properties: {
            tileBoundingBox: boundingBox,
            contentBoundingSphere: boundingSphere,
          },
        },
      });

      expect(
        BoundingVolumeSemantics.parseAllBoundingVolumeSemantics(tileMetadata)
      ).toEqual({
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
      expect(
        BoundingVolumeSemantics.parseAllBoundingVolumeSemantics(tileMetadata)
      ).toEqual({
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

  describe("parseBoundingVolumeSemantic", function () {
    it("throws without prefix", function () {
      expect(function () {
        return BoundingVolumeSemantics.parseBoundingVolumeSemantic(
          undefined,
          emptyMetadata
        );
      }).toThrowDeveloperError();
    });

    it("throws if prefix is not TILE or CONTENT", function () {
      expect(function () {
        return BoundingVolumeSemantics.parseBoundingVolumeSemantic(
          "TILESET",
          emptyMetadata
        );
      }).toThrowDeveloperError();
    });

    it("throws without tileMetadata", function () {
      expect(function () {
        return BoundingVolumeSemantics.parseBoundingVolumeSemantic(
          "TILE",
          undefined
        );
      }).toThrowDeveloperError();
    });

    it("returns undefined if there are no bounding volume semantics", function () {
      const boundingVolume = BoundingVolumeSemantics.parseBoundingVolumeSemantic(
        "TILE",
        emptyMetadata
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
      const boundingVolume = BoundingVolumeSemantics.parseBoundingVolumeSemantic(
        "TILE",
        tileMetadata
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
            contentBoundingRegion: boundingRegion,
          },
        },
      });
      const boundingVolume = BoundingVolumeSemantics.parseBoundingVolumeSemantic(
        "CONTENT",
        tileMetadata
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
      const boundingVolume = BoundingVolumeSemantics.parseBoundingVolumeSemantic(
        "TILE",
        tileMetadata
      );
      expect(boundingVolume).toEqual({
        sphere: boundingSphere,
      });
    });

    it("parses with the precedence box, region, then sphere", function () {
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
      // Box is handled before region
      const box = BoundingVolumeSemantics.parseBoundingVolumeSemantic(
        "TILE",
        tileMetadata
      );
      expect(box).toEqual({
        box: boundingBox,
      });

      // region is handled before sphere
      const region = BoundingVolumeSemantics.parseBoundingVolumeSemantic(
        "CONTENT",
        tileMetadata
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
          emptyMetadata
        );
      }).toThrowDeveloperError();
    });

    it("throws if prefix is not TILE or CONTENT", function () {
      expect(function () {
        return BoundingVolumeSemantics._parseMinimumHeight(
          "TILESET",
          emptyMetadata
        );
      }).toThrowDeveloperError();
    });

    it("throws without tileMetadata", function () {
      expect(function () {
        return BoundingVolumeSemantics._parseMinimumHeight("TILE", undefined);
      }).toThrowDeveloperError();
    });

    it("returns undefined if minimum height not present", function () {
      const height = BoundingVolumeSemantics._parseMinimumHeight(
        "TILE",
        emptyMetadata
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
        tileMetadata
      );
      expect(height).toBe(minimumHeight);
    });
  });

  describe("_parseMaximumHeight", function () {
    it("throws without prefix", function () {
      expect(function () {
        return BoundingVolumeSemantics._parseMaximumHeight(
          undefined,
          emptyMetadata
        );
      }).toThrowDeveloperError();
    });

    it("throws if prefix is not TILE or CONTENT", function () {
      expect(function () {
        return BoundingVolumeSemantics._parseMaximumHeight(
          "TILESET",
          emptyMetadata
        );
      }).toThrowDeveloperError();
    });

    it("throws without tileMetadata", function () {
      expect(function () {
        return BoundingVolumeSemantics._parseMaximumHeight("TILE", undefined);
      }).toThrowDeveloperError();
    });

    it("returns undefined if maximum height not present", function () {
      const height = BoundingVolumeSemantics._parseMaximumHeight(
        "TILE",
        emptyMetadata
      );
      expect(height).not.toBeDefined();
    });

    it("parses maximum height", function () {
      const tileMetadata = new TileMetadata({
        class: tileClass,
        tile: {
          properties: {
            contentMaximumHeight: maximumHeight,
          },
        },
      });
      const height = BoundingVolumeSemantics._parseMaximumHeight(
        "CONTENT",
        tileMetadata
      );
      expect(height).toBe(maximumHeight);
    });
  });
});
