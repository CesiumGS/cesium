define([
        '../Core/defined',
        '../Core/DoublyLinkedList'
    ], function(
        defined,
        DoublyLinkedList) {
    'use strict';

        /**
             * Stores tiles with content loaded.
             *
             * @private
             */
        class Cesium3DTilesetCache {
            constructor() {
                // [head, sentinel) -> tiles that weren't selected this frame and may be removed from the cache
                // (sentinel, tail] -> tiles that were selected this frame
                this._list = new DoublyLinkedList();
                this._sentinel = this._list.add();
                this._trimTiles = false;
            }
            reset() {
                // Move sentinel node to the tail so, at the start of the frame, all tiles
                // may be potentially replaced.  Tiles are moved to the right of the sentinel
                // when they are selected so they will not be replaced.
                this._list.splice(this._list.tail, this._sentinel);
            }
            touch(tile) {
                var node = tile.cacheNode;
                if (defined(node)) {
                    this._list.splice(this._sentinel, node);
                }
            }
            add(tile) {
                if (!defined(tile.cacheNode)) {
                    tile.cacheNode = this._list.add(tile);
                }
            }
            unloadTile(tileset, tile, unloadCallback) {
                var node = tile.cacheNode;
                if (!defined(node)) {
                    return;
                }
                this._list.remove(node);
                tile.cacheNode = undefined;
                unloadCallback(tileset, tile);
            }
            unloadTiles(tileset, unloadCallback) {
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
                while ((node !== sentinel) && ((tileset.totalMemoryUsageInBytes > maximumMemoryUsageInBytes) || trimTiles)) {
                    var tile = node.item;
                    node = node.next;
                    this.unloadTile(tileset, tile, unloadCallback);
                }
            }
            trim() {
                this._trimTiles = true;
            }
        }







    return Cesium3DTilesetCache;
});
