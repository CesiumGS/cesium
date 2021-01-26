import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import ImplicitSubtree from "./ImplicitSubtree.js";

export default function Implicit3DTileContent(
  tileset,
  tile,
  resource,
  arrayBuffer,
  byteOffset
) {
  //>>includeStart('debug', pragmas.debug);
  Check.defined("tile.implicitTileset", tile.implicitTileset);
  //>>includeEnd('debug');

  this._implicitTileset = tile.implicitTileset;
  this._tileset = tileset;
  this._tile = tile;
  this._resource = resource;
  this._readyPromise = when.defer();
}

function initialize(content, arrayBuffer, byteOffset) {
  // Parse the subtree file
  byteOffset = defaultValue(byteOffset, 0);
  var uint8Array = new Uint8Array(arrayBuffer, byteOffset);
  var subtree = new ImplicitSubtree(uint8Array, this._implicitTileset);

  // Parse the tiles inside this immediate subtree
  // TODO: maybe this should return an object rather than an array?
  var results = this.transcodeSubtreeTiles(subtree, parentTile);
  var rootTile = results[0];
  var bottomRow = results[1];

  // Replace the parent's children with the new root tile.
  parentTile.children = [rootTile];

  // for child subtrees, make new placeholder tiles with implicit contents
  var childSubtrees = this._implicitTileset.listChildSubtrees(
    subtree,
    bottomRow
  );
  for (var i = 0; i < childSubtrees.length; i++) {
    var pair = childSubtrees[i];
    var leafTile = pair[0];
    var childIndex = pair[1];

    var implicitChildTile = this.makePlaceholderTile(
      subtree,
      leafTile,
      childIndex
    );
    leafTile.children.push(implicitChildTile);
  }

  // TODO: Should this._tile.destroy() be called? or let the GC handle it?
}
