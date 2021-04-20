import defined from "../Core/defined.js";
import DoublyLinkedList from "../Core/DoublyLinkedList.js";

/**
 * Stores tiles with content loaded.
 *
 * @private
 */
function Cesium3DTilesetCache() {
  // [head, sentinel) -> tiles that weren't selected this frame and may be removed from the cache
  // (sentinel, tail] -> tiles that were selected this frame
  this._list = new DoublyLinkedList();
  this._sentinel = this._list.add();
  this._trimTiles = false;
}

Cesium3DTilesetCache.prototype.reset = function () {
  // Move sentinel node to the tail so, at the start of the frame, all tiles
  // may be potentially replaced.  Tiles are moved to the right of the sentinel
  // when they are selected so they will not be replaced.
  this._list.splice(this._list.tail, this._sentinel);
};

Cesium3DTilesetCache.prototype.touch = function (tile) {
  var node = tile.cacheNode;
  if (defined(node)) {
    this._list.splice(this._sentinel, node);
  }
};

Cesium3DTilesetCache.prototype.add = function (tile) {
  if (!defined(tile.cacheNode)) {
    tile.cacheNode = this._list.add(tile);
  }
};

Cesium3DTilesetCache.prototype.unloadTile = function (
  tileset,
  tile,
  unloadCallback
) {
  var node = tile.cacheNode;
  if (!defined(node)) {
    return;
  }

  this._list.remove(node);
  tile.cacheNode = undefined;
  unloadCallback(tileset, tile);
};

Cesium3DTilesetCache.prototype.unloadTiles = function (
  tileset,
  unloadCallback
) {
  var trimTiles = this._trimTiles;
  this._trimTiles = false;

  var list = this._list;

  var maximumMemoryUsageInBytes = tileset.maximumMemoryUsage * 1024 * 1024;

  // Traverse the list only to the sentinel since tiles/nodes to the
  // right of the sentinel were used this frame.
  //
  // The sub-list to the left of the sentinel is ordered from LRU to MRU.
  var sentinel = this._sentinel;
  var node = list.head;
  while (
    node !== sentinel &&
    (tileset.totalMemoryUsageInBytes > maximumMemoryUsageInBytes || trimTiles)
  ) {
    var tile = node.item;
    node = node.next;
    this.unloadTile(tileset, tile, unloadCallback);
  }
};

Cesium3DTilesetCache.prototype.trim = function () {
  this._trimTiles = true;
};
export default Cesium3DTilesetCache;
