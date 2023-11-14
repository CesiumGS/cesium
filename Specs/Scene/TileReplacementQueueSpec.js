import { defined } from "../../Source/Cesium.js";
import { GeographicTilingScheme } from "../../Source/Cesium.js";
import { QuadtreeTile } from "../../Source/Cesium.js";
import { QuadtreeTileLoadState } from "../../Source/Cesium.js";
import { TileReplacementQueue } from "../../Source/Cesium.js";

describe("Scene/TileReplacementQueue", function () {
  function Tile(num, loadedState, upsampledState) {
    this._num = num;
    this.state = QuadtreeTileLoadState.LOADING;
    this.data = {};
    this.data.imagery = [];
    if (defined(loadedState)) {
      this.data.loadedTerrain = {
        state: loadedState,
      };
    }
    if (defined(upsampledState)) {
      this.data.upsampledTerrain = {
        state: upsampledState,
      };
    }
    this.eligibleForUnloading = true;
  }

  Tile.prototype.freeResources = function () {};

  let queue;
  let one;
  let two;
  let three;
  let four;
  let notEligibleForUnloading;
  beforeEach(function () {
    const tilingScheme = new GeographicTilingScheme();
    queue = new TileReplacementQueue();
    one = new QuadtreeTile({
      tilingScheme: tilingScheme,
      level: 0,
      x: 0,
      y: 0,
    });
    two = new QuadtreeTile({
      tilingScheme: tilingScheme,
      level: 0,
      x: 1,
      y: 0,
    });
    three = new QuadtreeTile({
      tilingScheme: tilingScheme,
      level: 1,
      x: 0,
      y: 0,
    });
    four = new QuadtreeTile({
      tilingScheme: tilingScheme,
      level: 1,
      x: 2,
      y: 1,
    });
    notEligibleForUnloading = new QuadtreeTile({
      tilingScheme: tilingScheme,
      level: 1,
      x: 2,
      y: 1,
    });
    notEligibleForUnloading.data = {
      eligibleForUnloading: false,
    };
  });

  describe("markStartOfRenderFrame", function () {
    it("prevents tiles added afterward from being trimmed.", function () {
      queue.markTileRendered(one);
      queue.markTileRendered(two);
      queue.markStartOfRenderFrame();

      queue.markTileRendered(three);

      queue.trimTiles(0);

      expect(queue.count).toEqual(1);
      expect(queue.head).toEqual(three);
    });

    it("prevents all tiles from being trimmed if called on an empty queue.", function () {
      queue.markStartOfRenderFrame();

      queue.markTileRendered(one);
      queue.markTileRendered(two);
      queue.markTileRendered(three);

      queue.trimTiles(0);
      expect(queue.count).toEqual(3);
    });

    it("adjusts properly when last tile in previous frame is moved to the head.", function () {
      queue.markTileRendered(one);
      queue.markTileRendered(two);
      queue.markTileRendered(three);

      queue.markStartOfRenderFrame();

      queue.markTileRendered(three);

      queue.trimTiles(0);
      expect(queue.count).toEqual(1);
      expect(queue.head).toEqual(three);
    });

    it("adjusts properly when all tiles are moved to the head.", function () {
      queue.markTileRendered(one);
      queue.markTileRendered(two);
      queue.markTileRendered(three);

      queue.markStartOfRenderFrame();

      queue.markTileRendered(one);
      queue.markTileRendered(two);
      queue.markTileRendered(three);

      queue.trimTiles(0);
      expect(queue.count).toEqual(3);
      expect(queue.head).toEqual(three);
      expect(queue.tail).toEqual(one);
    });
  });

  describe("trimTiles", function () {
    it("does not remove a tile that is not eligible for unloading.", function () {
      queue.markTileRendered(one);
      queue.markTileRendered(two);
      queue.markTileRendered(notEligibleForUnloading);
      queue.markTileRendered(three);

      queue.markStartOfRenderFrame();

      queue.trimTiles(0);
      expect(queue.count).toEqual(1);
      expect(queue.head).toEqual(notEligibleForUnloading);
    });

    it("does not remove a transitioning tile at the end of the last render frame.", function () {
      queue.markTileRendered(one);
      queue.markTileRendered(two);
      queue.markTileRendered(three);
      queue.markTileRendered(notEligibleForUnloading);

      queue.markStartOfRenderFrame();

      queue.trimTiles(0);
      expect(queue.count).toEqual(1);
      expect(queue.head).toEqual(notEligibleForUnloading);
    });

    it("removes two tiles not used last render frame.", function () {
      queue.markTileRendered(notEligibleForUnloading);
      queue.markTileRendered(one);
      queue.markTileRendered(two);
      queue.markStartOfRenderFrame();
      queue.markTileRendered(three);
      queue.markTileRendered(four);
      queue.trimTiles(0);
      expect(queue.count).toEqual(3);
    });
  });
});
