import Check from "../Core/Check.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import when from "../ThirdParty/when.js";
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

  initialize(this, arrayBuffer, byteOffset);
}

function initialize(content, arrayBuffer, byteOffset) {
  // Parse the subtree file
  byteOffset = defaultValue(byteOffset, 0);
  var uint8Array = new Uint8Array(arrayBuffer, byteOffset);
  var subtree = new ImplicitSubtree(uint8Array, content._implicitTileset);

  var implicitTileset = content._implicitTileset;

  // Parse the tiles inside this immediate subtree
  var parentTile = content._tile.parent;
  var results = implicitTileset.transcodeSubtreeTiles(subtree, parentTile);

  // Replace the parent's children with the new root tile.
  if (defined(parentTile)) {
    parentTile.children = [results.rootTile];
  } else {
    // The placeholder tile was the root, so replace the tileset's root
    content._tileset._root = results.rootTile;
    //content._tileset.root = results.rootTile;
  }

  // for each child subtree, make new placeholder tiles
  var childSubtrees = implicitTileset.listChildSubtrees(
    subtree,
    results.bottomRow
  );
  for (var i = 0; i < childSubtrees.length; i++) {
    var pair = childSubtrees[i];
    var leafTile = pair[0];
    var childIndex = pair[1];

    var implicitChildTile = implicitTileset.makePlaceholderChildSubtree(
      leafTile,
      childIndex
    );
    leafTile.children.push(implicitChildTile);
  }

  // TODO: Should this._tile.destroy() be called? or let the GC handle it?
}
