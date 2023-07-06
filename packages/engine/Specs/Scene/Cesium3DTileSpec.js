import {
  clone,
  Cartesian3,
  Empty3DTileContent,
  HeadingPitchRoll,
  Matrix3,
  Matrix4,
  Rectangle,
  Transforms,
  Cesium3DTile,
  Cesium3DTilePass,
  Cesium3DTileRefine,
  Cesium3DTilesetHeatmap,
  Math as CesiumMath,
  MetadataSchema,
  RuntimeError,
  TileBoundingRegion,
  TileOrientedBoundingBox,
} from "../../index.js";

import createScene from "../../../../Specs/createScene.js";

describe(
  "Scene/Cesium3DTile",
  function () {
    const tileWithBoundingSphere = {
      geometricError: 1,
      refine: "REPLACE",
      children: [],
      boundingVolume: {
        sphere: [0.0, 0.0, 0.0, 5.0],
      },
    };

    const tileWithContentBoundingSphere = {
      geometricError: 1,
      refine: "REPLACE",
      content: {
        url: "0/0.b3dm",
        boundingVolume: {
          sphere: [0.0, 0.0, 1.0, 5.0],
        },
      },
      children: [],
      boundingVolume: {
        sphere: [0.0, 0.0, 1.0, 5.0],
      },
    };

    const tileWithBoundingRegion = {
      geometricError: 1,
      refine: "REPLACE",
      children: [],
      boundingVolume: {
        region: [-1.2, -1.2, 0.0, 0.0, -30, -34],
      },
    };

    const tileWithContentBoundingRegion = {
      geometricError: 1,
      refine: "REPLACE",
      children: [],
      content: {
        url: "0/0.b3dm",
        boundingVolume: {
          region: [-1.2, -1.2, 0, 0, -30, -34],
        },
      },
      boundingVolume: {
        region: [-1.2, -1.2, 0, 0, -30, -34],
      },
    };

    const tileWithEmptyContentUri = {
      geometricError: 1,
      refine: "REPLACE",
      children: [],
      content: {
        uri: "",
      },
      boundingVolume: {
        region: [-1.2, -1.2, 0, 0, -30, -34],
      },
    };

    const tileWithBoundingBox = {
      geometricError: 1,
      refine: "REPLACE",
      children: [],
      boundingVolume: {
        box: [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0],
      },
    };

    const tileWithContentBoundingBox = {
      geometricError: 1,
      refine: "REPLACE",
      children: [],
      content: {
        url: "0/0.b3dm",
        boundingVolume: {
          box: [0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 2.0],
        },
      },
      boundingVolume: {
        box: [0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 2.0],
      },
    };

    const tileWithViewerRequestVolume = {
      geometricError: 1,
      refine: "REPLACE",
      children: [],
      boundingVolume: {
        box: [0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 2.0],
      },
      viewerRequestVolume: {
        box: [0.0, 0.0, 1.0, 2.0, 0.0, 0.0, 0.0, 2.0, 0.0, 0.0, 0.0, 2.0],
      },
    };

    const mockTileset = {
      debugShowBoundingVolume: true,
      debugShowViewerRequestVolume: true,
      modelMatrix: Matrix4.IDENTITY,
      _geometricError: 2,
      _scaledGeometricError: 2,
      _heatmap: new Cesium3DTilesetHeatmap(),
    };

    const centerLongitude = -1.31968;
    const centerLatitude = 0.698874;

    function getTileTransform(longitude, latitude) {
      const transformCenter = Cartesian3.fromRadians(longitude, latitude, 0.0);
      const hpr = new HeadingPitchRoll();
      const transformMatrix = Transforms.headingPitchRollToFixedFrame(
        transformCenter,
        hpr
      );
      return Matrix4.pack(transformMatrix, new Array(16));
    }

    it("destroys", function () {
      const tile = new Cesium3DTile(
        mockTileset,
        "/some_url",
        tileWithBoundingSphere,
        undefined
      );
      expect(tile.isDestroyed()).toEqual(false);
      tile.destroy();
      expect(tile.isDestroyed()).toEqual(true);
    });

    it("throws if boundingVolume is undefined", function () {
      const tileWithoutBoundingVolume = clone(tileWithBoundingSphere, true);
      delete tileWithoutBoundingVolume.boundingVolume;
      expect(function () {
        return new Cesium3DTile(
          mockTileset,
          "/some_url",
          tileWithoutBoundingVolume,
          undefined
        );
      }).toThrowError(RuntimeError);
    });

    it("throws if boundingVolume does not contain a sphere, region, or box", function () {
      const tileWithoutBoundingVolume = clone(tileWithBoundingSphere, true);
      delete tileWithoutBoundingVolume.boundingVolume.sphere;
      expect(function () {
        return new Cesium3DTile(
          mockTileset,
          "/some_url",
          tileWithoutBoundingVolume,
          undefined
        );
      }).toThrowError(RuntimeError);
    });

    it("logs deprecation warning if refine is lowercase", function () {
      spyOn(Cesium3DTile, "_deprecationWarning");
      const header = clone(tileWithBoundingSphere, true);
      header.refine = "replace";
      const tile = new Cesium3DTile(
        mockTileset,
        "/some_url",
        header,
        undefined
      );
      expect(tile.refine).toBe(Cesium3DTileRefine.REPLACE);
      expect(Cesium3DTile._deprecationWarning).toHaveBeenCalled();
    });

    it("logs deprecation warning and loads empty tile if content.uri is an empty string", function () {
      spyOn(Cesium3DTile, "_deprecationWarning");
      const header = clone(tileWithEmptyContentUri, true);
      const tile = new Cesium3DTile(
        mockTileset,
        "/some_url",
        header,
        undefined
      );
      expect(tile.content).toBeDefined();
      expect(tile.content).toBeInstanceOf(Empty3DTileContent);
      expect(Cesium3DTile._deprecationWarning).toHaveBeenCalled();
    });

    it("logs deprecation warning if geometric error is undefined", function () {
      spyOn(Cesium3DTile, "_deprecationWarning");

      const geometricErrorMissing = clone(tileWithBoundingSphere, true);
      delete geometricErrorMissing.geometricError;

      const parent = new Cesium3DTile(
        mockTileset,
        "/some_url",
        tileWithBoundingSphere,
        undefined
      );
      const child = new Cesium3DTile(
        mockTileset,
        "/some_url",
        geometricErrorMissing,
        parent
      );
      expect(child.geometricError).toBe(parent.geometricError);
      expect(child.geometricError).toBe(1);

      const tile = new Cesium3DTile(
        mockTileset,
        "/some_url",
        geometricErrorMissing,
        undefined
      );
      expect(tile.geometricError).toBe(mockTileset._geometricError);
      expect(tile.geometricError).toBe(2);

      expect(Cesium3DTile._deprecationWarning.calls.count()).toBe(2);
    });

    describe("bounding volumes", function () {
      it("returns the tile bounding volume if the content bounding volume is undefined", function () {
        const tile = new Cesium3DTile(
          mockTileset,
          "/some_url",
          tileWithBoundingSphere,
          undefined
        );
        expect(tile.boundingVolume).toBeDefined();
        expect(tile.contentBoundingVolume).toBe(tile.boundingVolume);
      });

      it("can have a bounding sphere", function () {
        const tile = new Cesium3DTile(
          mockTileset,
          "/some_url",
          tileWithBoundingSphere,
          undefined
        );
        const radius = tileWithBoundingSphere.boundingVolume.sphere[3];
        expect(tile.boundingVolume).toBeDefined();
        expect(tile.boundingVolume.boundingVolume.radius).toEqual(radius);
        expect(tile.boundingVolume.boundingVolume.center).toEqual(
          Cartesian3.ZERO
        );
      });

      it("can have a content bounding sphere", function () {
        const tile = new Cesium3DTile(
          mockTileset,
          "/some_url",
          tileWithContentBoundingSphere,
          undefined
        );
        const radius =
          tileWithContentBoundingSphere.content.boundingVolume.sphere[3];
        expect(tile.contentBoundingVolume).toBeDefined();
        expect(tile.contentBoundingVolume.boundingVolume.radius).toEqual(
          radius
        );
        expect(tile.contentBoundingVolume.boundingVolume.center).toEqual(
          new Cartesian3(0.0, 0.0, 1.0)
        );
      });

      it("can have a bounding region", function () {
        const box = tileWithBoundingRegion.boundingVolume.region;
        const rectangle = new Rectangle(box[0], box[1], box[2], box[3]);
        const minimumHeight = tileWithBoundingRegion.boundingVolume.region[4];
        const maximumHeight = tileWithBoundingRegion.boundingVolume.region[5];
        const tile = new Cesium3DTile(
          mockTileset,
          "/some_url",
          tileWithBoundingRegion,
          undefined
        );
        const tbr = new TileBoundingRegion({
          rectangle: rectangle,
          minimumHeight: minimumHeight,
          maximumHeight: maximumHeight,
        });
        expect(tile.boundingVolume).toBeDefined();
        expect(tile.boundingVolume).toEqual(tbr);
      });

      it("can have a content bounding region", function () {
        const region =
          tileWithContentBoundingRegion.content.boundingVolume.region;
        const tile = new Cesium3DTile(
          mockTileset,
          "/some_url",
          tileWithContentBoundingRegion,
          undefined
        );
        expect(tile.contentBoundingVolume).toBeDefined();
        const tbb = new TileBoundingRegion({
          rectangle: new Rectangle(region[0], region[1], region[2], region[3]),
          minimumHeight: region[4],
          maximumHeight: region[5],
        });
        expect(tile.contentBoundingVolume).toEqual(tbb);
      });

      it("can have an oriented bounding box", function () {
        const box = tileWithBoundingBox.boundingVolume.box;
        const tile = new Cesium3DTile(
          mockTileset,
          "/some_url",
          tileWithBoundingBox,
          undefined
        );
        expect(tile.boundingVolume).toBeDefined();
        const center = new Cartesian3(box[0], box[1], box[2]);
        const halfAxes = Matrix3.fromArray(box, 3);
        const obb = new TileOrientedBoundingBox(center, halfAxes);
        expect(tile.boundingVolume).toEqual(obb);
      });

      it("does not crash for bounding box with 0 volume", function () {
        // Create a copy of the tile with bounding box.
        const tileWithBoundingBox0Volume = JSON.parse(
          JSON.stringify(tileWithBoundingBox)
        );
        // Generate all the combinations of missing axes.
        const boxes = [];
        for (let x = 0; x < 2; ++x) {
          for (let y = 0; y < 2; ++y) {
            for (let z = 0; z < 2; ++z) {
              boxes.push([
                0.0,
                0.0,
                0.0,
                x,
                0.0,
                0.0,
                0.0,
                y,
                0.0,
                0.0,
                0.0,
                z,
              ]);
            }
          }
        }

        for (let i = 0; i < boxes.length; ++i) {
          const box = boxes[i];

          tileWithBoundingBox0Volume.boundingVolume.box = box;

          const tile = new Cesium3DTile(
            mockTileset,
            "/some_url",
            tileWithBoundingBox0Volume,
            undefined
          );
          expect(tile.boundingVolume).toBeDefined();
          const center = new Cartesian3(box[0], box[1], box[2]);
          const halfAxes = Matrix3.fromArray(box, 3);
          const obb = new TileOrientedBoundingBox(center, halfAxes);
          expect(tile.boundingVolume).toEqual(obb);
        }
      });

      it("can have a content oriented bounding box", function () {
        const box = tileWithContentBoundingBox.boundingVolume.box;
        const tile = new Cesium3DTile(
          mockTileset,
          "/some_url",
          tileWithContentBoundingBox,
          undefined
        );
        expect(tile.contentBoundingVolume).toBeDefined();
        const center = new Cartesian3(box[0], box[1], box[2]);
        const halfAxes = Matrix3.fromArray(box, 3);
        const obb = new TileOrientedBoundingBox(center, halfAxes);
        expect(tile.contentBoundingVolume).toEqual(obb);
      });

      it("tile transform affects bounding sphere", function () {
        const header = clone(tileWithContentBoundingSphere, true);
        header.transform = getTileTransform(centerLongitude, centerLatitude);
        const tile = new Cesium3DTile(
          mockTileset,
          "/some_url",
          header,
          undefined
        );
        const boundingSphere = tile.boundingVolume.boundingVolume;
        const contentBoundingSphere = tile.contentBoundingVolume.boundingVolume;

        const boundingVolumeCenter = Cartesian3.fromRadians(
          centerLongitude,
          centerLatitude,
          1.0
        );
        expect(boundingSphere.center).toEqualEpsilon(
          boundingVolumeCenter,
          CesiumMath.EPSILON4
        );
        expect(boundingSphere.radius).toEqual(5.0); // No change

        expect(contentBoundingSphere.center).toEqualEpsilon(
          boundingVolumeCenter,
          CesiumMath.EPSILON4
        );
        expect(contentBoundingSphere.radius).toEqual(5.0); // No change
      });

      it("tile transform affects oriented bounding box", function () {
        const header = clone(tileWithContentBoundingBox, true);
        header.transform = getTileTransform(centerLongitude, centerLatitude);
        const tile = new Cesium3DTile(
          mockTileset,
          "/some_url",
          header,
          undefined
        );
        const boundingBox = tile.boundingVolume.boundingVolume;
        const contentBoundingBox = tile.contentBoundingVolume.boundingVolume;

        const boundingVolumeCenter = Cartesian3.fromRadians(
          centerLongitude,
          centerLatitude,
          1.0
        );
        expect(boundingBox.center).toEqualEpsilon(
          boundingVolumeCenter,
          CesiumMath.EPSILON7
        );
        expect(contentBoundingBox.center).toEqualEpsilon(
          boundingVolumeCenter,
          CesiumMath.EPSILON7
        );
      });

      it("tile transform does not affect bounding region", function () {
        const header = clone(tileWithContentBoundingRegion, true);
        header.transform = getTileTransform(centerLongitude, centerLatitude);
        const tile = new Cesium3DTile(
          mockTileset,
          "/some_url",
          header,
          undefined
        );
        const boundingRegion = tile.boundingVolume;
        const contentBoundingRegion = tile.contentBoundingVolume;

        const region = header.boundingVolume.region;
        const rectangle = Rectangle.unpack(region);
        expect(boundingRegion.rectangle).toEqual(rectangle);
        expect(contentBoundingRegion.rectangle).toEqual(rectangle);
      });

      it("tile transform affects viewer request volume", function () {
        const header = clone(tileWithViewerRequestVolume, true);
        header.transform = getTileTransform(centerLongitude, centerLatitude);
        const tile = new Cesium3DTile(
          mockTileset,
          "/some_url",
          header,
          undefined
        );
        const requestVolume = tile._viewerRequestVolume.boundingVolume;
        const requestVolumeCenter = Cartesian3.fromRadians(
          centerLongitude,
          centerLatitude,
          1.0
        );
        expect(requestVolume.center).toEqualEpsilon(
          requestVolumeCenter,
          CesiumMath.EPSILON7
        );
      });

      it("tile transform changes", function () {
        const mockTileset = {
          modelMatrix: Matrix4.IDENTITY,
        };
        const header = clone(tileWithBoundingSphere, true);
        header.transform = getTileTransform(centerLongitude, centerLatitude);
        const tile = new Cesium3DTile(
          mockTileset,
          "/some_url",
          header,
          undefined
        );
        const boundingSphere = tile.boundingVolume.boundingVolume;

        // Check the original transform
        const boundingVolumeCenter = Cartesian3.fromRadians(
          centerLongitude,
          centerLatitude
        );
        expect(boundingSphere.center).toEqualEpsilon(
          boundingVolumeCenter,
          CesiumMath.EPSILON7
        );

        // Change the transform
        const newLongitude = -1.012;
        const newLatitude = 0.698874;
        tile.transform = getTileTransform(newLongitude, newLatitude);
        tile.updateTransform();

        // Check the new transform
        const newCenter = Cartesian3.fromRadians(newLongitude, newLatitude);
        expect(boundingSphere.center).toEqualEpsilon(
          newCenter,
          CesiumMath.EPSILON7
        );
      });

      it("TILE_BOUNDING_XXX metadata semantics override bounding volume", function () {
        const tileset = clone(mockTileset, true);
        tileset.schema = MetadataSchema.fromJson({
          id: "test-schema",
          classes: {
            tile: {
              properties: {
                tileBoundingBox: {
                  type: "SCALAR",
                  componentType: "FLOAT64",
                  array: true,
                  count: 12,
                  semantic: "TILE_BOUNDING_BOX",
                },
              },
            },
          },
        });

        const header = clone(tileWithBoundingRegion, true);
        header.metadata = {
          class: "tile",
          properties: {
            tileBoundingBox: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
          },
        };

        const tile = new Cesium3DTile(tileset, "/some_url", header, undefined);

        // the TILE_BOUNDING_BOX should override the boundingVolume.region.
        const boundingBox = tile.boundingVolume.boundingVolume;
        const expectedCenter = new Cartesian3();
        const expectedHalfAxes = Matrix3.IDENTITY;
        expect(boundingBox.center).toEqual(expectedCenter);
        expect(boundingBox.halfAxes).toEqual(expectedHalfAxes);
      });
    });

    describe("debug bounding volumes", function () {
      let scene;
      beforeEach(function () {
        scene = createScene();
        scene.frameState.passes.render = true;
      });

      afterEach(function () {
        scene.destroyForSpecs();
      });

      it("can be a bounding region", function () {
        const tile = new Cesium3DTile(
          mockTileset,
          "/some_url",
          tileWithBoundingRegion,
          undefined
        );
        const passOptions = Cesium3DTilePass.getPassOptions(
          Cesium3DTilePass.RENDER
        );
        tile.update(mockTileset, scene.frameState, passOptions);
        expect(tile._debugBoundingVolume).toBeDefined();
      });

      it("can be an oriented bounding box", function () {
        const tile = new Cesium3DTile(
          mockTileset,
          "/some_url",
          tileWithBoundingBox,
          undefined
        );
        const passOptions = Cesium3DTilePass.getPassOptions(
          Cesium3DTilePass.RENDER
        );
        tile.update(mockTileset, scene.frameState, passOptions);
        expect(tile._debugBoundingVolume).toBeDefined();
      });

      it("can be a bounding sphere", function () {
        const tile = new Cesium3DTile(
          mockTileset,
          "/some_url",
          tileWithBoundingSphere,
          undefined
        );
        const passOptions = Cesium3DTilePass.getPassOptions(
          Cesium3DTilePass.RENDER
        );
        tile.update(mockTileset, scene.frameState, passOptions);
        expect(tile._debugBoundingVolume).toBeDefined();
      });

      it("creates debug bounding volume for viewer request volume", function () {
        const tile = new Cesium3DTile(
          mockTileset,
          "/some_url",
          tileWithViewerRequestVolume,
          undefined
        );
        const passOptions = Cesium3DTilePass.getPassOptions(
          Cesium3DTilePass.RENDER
        );
        tile.update(mockTileset, scene.frameState, passOptions);
        expect(tile._debugViewerRequestVolume).toBeDefined();
      });
    });

    it("updates priority", function () {
      const tile1 = new Cesium3DTile(
        mockTileset,
        "/some_url",
        tileWithBoundingSphere,
        undefined
      );
      tile1._priorityHolder = tile1;
      tile1._foveatedFactor = 0.0;
      tile1._distanceToCamera = 1.0;
      tile1._depth = 0.0;
      tile1._priorityProgressiveResolution = true;

      const tile2 = new Cesium3DTile(
        mockTileset,
        "/some_url",
        tileWithBoundingSphere,
        undefined
      );
      tile2._priorityHolder = tile1;
      tile2._foveatedFactor = 1.0; // foveatedFactor (when considered for priority in certain modes) is actually 0 since its linked up to tile1
      tile2._distanceToCamera = 0.0;
      tile2._depth = 1.0;
      tile2._priorityProgressiveResolution = true;

      mockTileset._minimumPriority = {
        depth: 0.0,
        distance: 0.0,
        foveatedFactor: 0.0,
      };
      mockTileset._maximumPriority = {
        depth: 1.0,
        distance: 1.0,
        foveatedFactor: 1.0,
      };

      tile1.updatePriority();
      tile2.updatePriority();

      const nonPreloadFlightPenalty = 10000000000.0;
      const tile1ExpectedPriority = nonPreloadFlightPenalty + 0.0;
      const tile2ExpectedPriority = nonPreloadFlightPenalty + 1.0;
      expect(
        CesiumMath.equalsEpsilon(
          tile1._priority,
          tile1ExpectedPriority,
          CesiumMath.EPSILON2
        )
      ).toBe(true);
      expect(
        CesiumMath.equalsEpsilon(
          tile2._priority,
          tile2ExpectedPriority,
          CesiumMath.EPSILON2
        )
      ).toBe(true);

      // Penalty for not being a progressive resolution
      tile2._priorityProgressiveResolution = false;
      tile2.updatePriority();
      const nonProgressiveResoutionPenalty = 100000000.0;
      expect(tile2._priority).toBeGreaterThan(nonProgressiveResoutionPenalty);
      tile2._priorityProgressiveResolution = true;

      // Penalty for being a foveated deferral
      tile2.priorityDeferred = true;
      tile2.updatePriority();
      const foveatedDeferralPenalty = 10000000.0;
      expect(tile2._priority).toBeGreaterThanOrEqual(foveatedDeferralPenalty);
      tile2._priorityDeferred = false;
    });

    it("tile transform scales geometric error", function () {
      const header = clone(tileWithContentBoundingSphere, true);
      header.transform = Matrix4.pack(
        Matrix4.fromUniformScale(2.0),
        new Array(16)
      );

      const mockTilesetScaled = clone(mockTileset, true);

      const tile = new Cesium3DTile(
        mockTilesetScaled,
        "/some_url",
        header,
        undefined
      );

      expect(tile._geometricError).toBe(1);
      expect(tile.geometricError).toBe(2);
      expect(mockTilesetScaled._geometricError).toBe(2);
      expect(mockTilesetScaled._scaledGeometricError).toBe(4);
    });
  },
  "WebGL"
);
