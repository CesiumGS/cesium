import Check from "../Core/Check.js";

import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Resource from "../Core/Resource.js";
import ImplicitSubdivisionScheme from "./ImplicitSubdivisionScheme.js";

/**
 * An ImplicitTileset is a simple struct that stores information about the
 * structure of a single implicit tileset. This includes template URIs for
 * locating resources, details from the implicit root tile (bounding volume,
 * geometricError, etc.). and details about the subtrees (e.g. subtreeLevels,
 * subdivisionScheme).
 * @param {Resource} baseResource The base resource for the tileset
 * @param {Object} tileJson The JSON header of the tile with the 3DTILES_implicit_tiling extension.
 */
export default function ImplicitTileset(baseResource, tileJson) {
  var extension = tileJson.extensions["3DTILES_implicit_tiling"];
  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object(
    'tileJson.extensions["3DTILES_implicit_tiling"]',
    extension
  );
  //>>includeEnd('debug');

  /**
   * The base resource for the tileset. This is stored here as it is needed
   * later when expanding Implicit3DTileContents so tile URLs are relative
   * to the tileset, not the subtree file.
   * @type {Resource}
   * @readonly
   */
  this.baseResource = baseResource;

  /**
   * The geometric error of the root tile
   * @type {Number}
   * @readonly
   */
  this.geometricError = tileJson.geometricError;

  //>>includeStart('debug', pragmas.debug);
  if (
    !defined(tileJson.boundingVolume.box) &&
    !defined(tileJson.boundingVolume.region)
  ) {
    throw new DeveloperError(
      "Only box and region are supported for implicit tiling"
    );
  }
  //>>includeEnd('debug');

  /**
   * The JSON representation of a bounding volume. This is either a box or a
   * region.
   * @type {Object}
   * @readonly
   */
  this.boundingVolume = tileJson.boundingVolume;

  /**
   * The refine strategy as a string, either 'ADD' or 'REPLACE'
   * @type {String}
   * @readonly
   */
  this.refine = tileJson.refine;

  /**
   * Template URI for the subtree resources, e.g.
   * <code>https://example.com/{level}/{x}/{y}.subtree</code>
   *
   * @type {Resource}
   * @readonly
   */
  this.subtreeUriTemplate = new Resource({ url: extension.subtrees.uri });

  /**
   * Template URI for locating content resources, e.g.
   * <code>https://example.com/{level}/{x}/{y}.b3dm</code>
   *
   * @type {Resource}
   * @readonly
   */
  this.contentUriTemplate = new Resource({ url: tileJson.content.uri });

  /**
   * The subdivision scheme for this implicit tileset; either OCTREE or QUADTREE
   *
   * @type {ImplicitSubdivisionScheme}
   * @readonly
   */
  this.subdivisionScheme =
    extension.subdivisionScheme.toUpperCase() === "OCTREE"
      ? ImplicitSubdivisionScheme.OCTREE
      : ImplicitSubdivisionScheme.QUADTREE;

  /**
   * The branching factor for this tileset. Either 4 for quadtrees or 8 for
   * octrees.
   *
   * @type {Number}
   * @readonly
   */
  this.branchingFactor = ImplicitSubdivisionScheme.getBranchingFactor(
    this.subdivisionScheme
  );

  /**
   * How many distinct levels within each subtree. For example, a quadtree
   * with subtreeLevels = 2 will have 5 nodes per quadtree (1 root + 4 children)
   *
   * @type {Number}
   * @readonly
   */
  this.subtreeLevels = extension.subtreeLevels;

  /**
   * The deepest level of any available tile in the entire tileset.
   *
   * @type {Number}
   * @readonly
   */
  this.maximumLevel = extension.maximumLevel;
}
