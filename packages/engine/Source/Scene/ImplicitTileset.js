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
 * @param {object} tileJson The JSON header of the tile with either implicit tiling (3D Tiles 1.1) or the 3DTILES_implicit_tiling extension.
 * @param {MetadataSchema} [metadataSchema] The metadata schema containing the implicit tile metadata class.
 * @private
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 */
function ImplicitTileset(baseResource, tileJson, metadataSchema) {
  const implicitTiling = hasExtension(tileJson, "3DTILES_implicit_tiling")
    ? tileJson.extensions["3DTILES_implicit_tiling"]
    : tileJson.implicitTiling;

  //>>includeStart('debug', pragmas.debug);
  Check.typeOf.object("implicitTiling", implicitTiling);
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
   * @type {number}
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

  // Due to using explicit tile metadata to store a tight bounding box
  // in some cases (see https://github.com/CesiumGS/cesium/pull/11365)
  // it's important that this bounding volume is computed from the tile JSON
  // (which is the original, possibly loose bounding volume) rather than
  // tile.boundingVolume which is the tighter one.
  const boundingVolume = tileJson.boundingVolume;
  if (
    !defined(boundingVolume.box) &&
    !defined(boundingVolume.region) &&
    !hasExtension(boundingVolume, "3DTILES_bounding_volume_S2") &&
    !hasExtension(boundingVolume, "3DTILES_bounding_volume_cylinder")
  ) {
    throw new RuntimeError(
      "Only box, region, 3DTILES_bounding_volume_S2, and 3DTILES_bounding_volume_cylinder are supported for implicit tiling"
    );
  }

  /**
   * The JSON representation of a bounding volume. This is either a box or a
   * region.
   *
   * @type {object}
   * @readonly
   * @private
   */
  this.boundingVolume = boundingVolume;

  /**
   * The refine strategy as a string, either 'ADD' or 'REPLACE'
   *
   * @type {string}
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

  this.subtreeUriTemplate = new Resource({ url: implicitTiling.subtrees.uri });

  /**
   * Template URIs for locating content resources, e.g.
   * <code>https://example.com/{level}/{x}/{y}.b3dm</code>.
   * <p>
   * This is an array to support multiple contents.
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
   * This is an array to support multiple contents.
   * </p>
   *
   * @type {Object[]}
   * @readonly
   * @private
   */
  this.contentHeaders = [];

  const contentHeaders = gatherContentHeaders(tileJson);
  for (let i = 0; i < contentHeaders.length; i++) {
    const contentHeader = contentHeaders[i];
    this.contentHeaders.push(clone(contentHeader, true));
    const contentResource = new Resource({ url: contentHeader.uri });
    this.contentUriTemplates.push(contentResource);
  }

  /**
   * The maximum number of contents as well as content availability bitstreams.
   * This is used for loop bounds when checking content availability.
   *
   * @type {number}
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
   * <li><code>tile.implicitTiling</code> to prevent infinite loops of implicit tiling</li>
   * <li><code>tile.extensions["3DTILES_implicit_tiling"]</code>, if used instead of tile.implicitTiling</li>
   * <li><code>tile.contents</code>, since contents are handled separately</li>
   * <li><code>tile.content</code>, if used instead of tile.contents</li>
   * <li><code>tile.extensions["3DTILES_multiple_contents"]</code>, if used instead of tile.contents or tile.content</li>
   * </ul>
   *
   * @type {object}
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
    ImplicitSubdivisionScheme[implicitTiling.subdivisionScheme];

  /**
   * The branching factor for this tileset. Either 4 for quadtrees or 8 for
   * octrees.
   *
   * @type {number}
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
   * @type {number}
   * @readonly
   * @private
   */
  this.subtreeLevels = implicitTiling.subtreeLevels;

  /**
   * The number of levels containing available tiles in the tileset.
   *
   * @type {number}
   * @readonly
   * @private
   */
  if (defined(implicitTiling.availableLevels)) {
    this.availableLevels = implicitTiling.availableLevels;
  } else {
    this.availableLevels = implicitTiling.maximumLevel + 1;
  }
}

/**
 * Gather JSON headers for all contents in the tile.
 * This handles both regular tiles and tiles with multiple contents, either
 * in the contents array (3D Tiles 1.1) or the `3DTILES_multiple_contents` extension
 *
 * @param {object} tileJson The JSON header of the tile with either implicit tiling (3D Tiles 1.1) or the 3DTILES_implicit_tiling extension.
 * @return {Object[]} An array of JSON headers for the contents of each tile
 * @private
 */
function gatherContentHeaders(tileJson) {
  if (hasExtension(tileJson, "3DTILES_multiple_contents")) {
    const extension = tileJson.extensions["3DTILES_multiple_contents"];
    return defined(extension.contents) ? extension.contents : extension.content;
  }

  if (defined(tileJson.contents)) {
    return tileJson.contents;
  }

  if (defined(tileJson.content)) {
    return [tileJson.content];
  }

  return [];
}

function makeTileHeaderTemplate(tileJson) {
  const template = clone(tileJson, true);

  // Remove the implicit tiling extension to prevent infinite loops,
  // as well as content-related properties since content is handled separately
  if (defined(template.extensions)) {
    delete template.extensions["3DTILES_implicit_tiling"];
    delete template.extensions["3DTILES_multiple_contents"];

    // if there are no other extensions, remove the extensions property to
    // keep each tile simple
    if (Object.keys(template.extensions).length === 0) {
      delete template.extensions;
    }
  }

  delete template.implicitTiling;
  delete template.contents;
  delete template.content;

  return template;
}

export default ImplicitTileset;
