import Check from "../Core/Check.js";
import clone from "../Core/clone.js";
import defined from "../Core/defined.js";
import Resource from "../Core/Resource.js";
import RuntimeError from "../Core/RuntimeError.js";
import hasExtension from "./hasExtension.js";
import ImplicitSubdivisionScheme from "./ImplicitSubdivisionScheme.js";

/**
 * An ImplicitTileset is a simple struct that stores information about the
 * structure of a single implicit tileset. This includes template URIs for
 * locating resources, details from the implicit root tile (bounding volume,
 * geometricError, etc.), and details about the subtrees (e.g. subtreeLevels,
 * subdivisionScheme).
 *
 * @alias ImplicitTileset
 * @constructor
 *
 * @param {Resource} baseResource The base resource for the tileset
 * @param {Object} tileJson The JSON header of the tile with the 3DTILES_implicit_tiling extension.
 * @param {MetadataSchema} [metadataSchema] The metadata schema containing the implicit tile metadata class.
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
export default function ImplicitTileset(
  baseResource,
  tileJson,
  metadataSchema
) {
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
   *
   * @type {Resource}
   * @readonly
   * @private
   */
  this.baseResource = baseResource;

  /**
   * The geometric error of the root tile
   *
   * @type {Number}
   * @readonly
   * @private
   */
  this.geometricError = tileJson.geometricError;

  /**
   * The metadata schema containing the implicit tile metadata class.
   *
   * @type {MetadataSchema|undefined}
   * @readonly
   * @private
   */
  this.metadataSchema = metadataSchema;

  if (
    !defined(tileJson.boundingVolume.box) &&
    !defined(tileJson.boundingVolume.region) &&
    !hasExtension(tileJson.boundingVolume, "3DTILES_bounding_volume_S2")
  ) {
    throw new RuntimeError(
      "Only box, region and 3DTILES_bounding_volume_S2 are supported for implicit tiling"
    );
  }

  /**
   * The JSON representation of a bounding volume. This is either a box or a
   * region.
   *
   * @type {Object}
   * @readonly
   * @private
   */
  this.boundingVolume = tileJson.boundingVolume;

  /**
   * The refine strategy as a string, either 'ADD' or 'REPLACE'
   *
   * @type {String}
   * @readonly
   * @private
   */
  this.refine = tileJson.refine;

  /**
   * Template URI for the subtree resources, e.g.
   * <code>https://example.com/{level}/{x}/{y}.subtree</code>
   *
   * @type {Resource}
   * @readonly
   * @private
   */

  this.subtreeUriTemplate = new Resource({ url: extension.subtrees.uri });

  /**
   * Template URIs for locating content resources, e.g.
   * <code>https://example.com/{level}/{x}/{y}.b3dm</code>.
   * <p>
   * This is an array to support <code>3DTILES_multiple_contents</code>
   * </p>
   *
   * @type {Resource[]}
   * @readonly
   * @private
   */
  this.contentUriTemplates = [];

  /**
   * Store a copy of the content headers, so properties such as
   * <code>extras</code> or <code>extensions</code> are preserved when
   * {@link Cesium3DTile}s are created for each tile.
   * <p>
   * This is an array to support <code>3DTILES_multiple_contents</code>
   * </p>
   *
   * @type {Object[]}
   * @readonly
   * @private
   */
  this.contentHeaders = [];

  var contentHeaders = gatherContentHeaders(tileJson);
  for (var i = 0; i < contentHeaders.length; i++) {
    var contentHeader = contentHeaders[i];
    this.contentHeaders.push(clone(contentHeader, true));
    var contentResource = new Resource({ url: contentHeader.uri });
    this.contentUriTemplates.push(contentResource);
  }

  /**
   * The maximum number of contents as well as content availability bitstreams.
   * This is used for loop bounds when checking content availability.
   *
   * @type {Number}
   * @readonly
   * @private
   */
  this.contentCount = this.contentHeaders.length;

  /**
   * Stores a copy of the root implicit tile's JSON header. This is used
   * as a template for creating {@link Cesium3DTile}s. The following properties
   * are removed:
   *
   * <ul>
   * <li><code>tile.extensions["3DTILES_implicit_tiling"]</code> to prevent infinite loops of implicit tiling</li>
   * <li><code>tile.content</code> since this is handled separately</li>
   * <li><code>tile.extensions["3DTILES_multiple_contents"]</code>, again
   *  because contents are handled separately</li>
   * </ul>
   *
   * @type {Object}
   * @readonly
   * @private
   */
  this.tileHeader = makeTileHeaderTemplate(tileJson);

  /**
   * The subdivision scheme for this implicit tileset; either OCTREE or QUADTREE
   *
   * @type {ImplicitSubdivisionScheme}
   * @readonly
   * @private
   */
  this.subdivisionScheme =
    ImplicitSubdivisionScheme[extension.subdivisionScheme];

  /**
   * The branching factor for this tileset. Either 4 for quadtrees or 8 for
   * octrees.
   *
   * @type {Number}
   * @readonly
   * @private
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
   * @private
   */
  this.subtreeLevels = extension.subtreeLevels;

  /**
   * The deepest level of any available tile in the entire tileset.
   *
   * @type {Number}
   * @readonly
   * @private
   */
  this.maximumLevel = extension.maximumLevel;
}

/**
 * Gather JSON headers for all contents in the tile.
 * This handles both regular tiles and tiles with the
 * `3DTILES_multiple_contents` extension
 *
 * @param {Object} tileJson The JSON header of the tile with the 3DTILES_implicit_tiling extension.
 * @return {Object[]} An array of JSON headers for the contents of each tile
 * @private
 */
function gatherContentHeaders(tileJson) {
  if (hasExtension(tileJson, "3DTILES_multiple_contents")) {
    return tileJson.extensions["3DTILES_multiple_contents"].content;
  }

  if (defined(tileJson.content)) {
    return [tileJson.content];
  }

  return [];
}

function makeTileHeaderTemplate(tileJson) {
  var template = clone(tileJson, true);

  // remove the implicit tiling extension to prevent infinite loops
  delete template.extensions["3DTILES_implicit_tiling"];

  // content is handled separately, so remove content-related properties
  delete template.content;
  delete template.extensions["3DTILES_multiple_contents"];

  // if there are no other extensions, remove the extensions property to
  // keep each tile simple
  if (Object.keys(template.extensions).length === 0) {
    delete template.extensions;
  }

  return template;
}
