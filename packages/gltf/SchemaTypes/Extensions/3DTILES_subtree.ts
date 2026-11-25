// Generated from the glTF JSON schemas at:
//   https://github.com/CesiumGS/glTF/tree/e68efc9086f60743c331a2c757a1ffadcdb5d532/extensions/2.1/Vendor/3DTILES_subtree/schema
// Do not edit; rerun `npm run generate-types -w @cesium/gltf` instead.

import type { Gltf2 } from "../Gltf2.js";

/** @internal */
export namespace _3DTILES_subtree {
  /**
   * An object describing the availability of a set of elements.
   */
  export interface Availability extends Gltf2.Property {
    /**
     * Index of a buffer view that contains availability bits. If an element is
     * available, its bit is 1, and if it is unavailable, its bit is 0.
     */
    bitstream?: number;
    /**
     * A number indicating how many 1 bits exist in the availability bitstream.
     */
    availableCount?: number;
    /**
     * Integer indicating whether all of the elements are available (1) or all
     * are unavailable (0).
     *
     * Allowed values:
     *
     * - `0`: UNAVAILABLE
     * - `1`: AVAILABLE
     */
    constant?: number;
  }
  /**
   * An object describing the availability of tiles and content in a subtree, as
   * well as availability of children subtrees. May also store attributes and
   * application-specific properties for available tiles and contents.
   */
  export interface Gltf extends Gltf2.Property {
    /**
     * The availability of tiles in the subtree. The availability bitstream is a
     * 1D boolean array where tiles are ordered by their level in the subtree
     * and Morton index within that level. A tile's availability is determined
     * by a single bit, 1 meaning a tile exists at that spatial index, and 0
     * meaning it does not. The number of elements in the array is
     * `(N^subtreeLevels - 1)/(N - 1)` where N is 4 for subdivision scheme
     * `QUADTREE` and 8 for `OCTREE`. Availability may be stored in a buffer
     * view or as a constant value that applies to all tiles. If a non-root
     * tile's availability is 1 its parent tile's availability must also be 1.
     * `tileAvailability.constant: 0` is disallowed, as subtrees must have at
     * least one tile.
     */
    tileAvailability: _3DTILES_subtree.Availability;
    /**
     * The availability of contents in the subtree.
     */
    contentAvailability?: _3DTILES_subtree.Availability;
    /**
     * The availability of children subtrees. The availability bitstream is a 1D
     * boolean array where subtrees are ordered by their Morton index in the
     * level of the tree immediately below the bottom row of the subtree. A
     * child subtree's availability is determined by a single bit, 1 meaning a
     * subtree exists at that spatial index, and 0 meaning it does not. The
     * number of elements in the array is `N^subtreeLevels` where N is 4 for
     * subdivision scheme `QUADTREE` and 8 for `OCTREE`. Availability may be
     * stored in a buffer view or as a constant value that applies to all child
     * subtrees. If availability is 0 for all child subtrees, then the tileset
     * does not subdivide further.
     */
    childSubtreeAvailability: _3DTILES_subtree.Availability;
    /**
     * A plain JSON object, where each key corresponds to a tile attribute
     * semantic and each value is the index of the accessor containing
     * attribute's data. Attribute values only exists for available tiles and
     * are ordered by increasing tile index.
     */
    tileAttributes?: Record<string, number>;
    /**
     * A plain JSON object, where each key corresponds to a content attribute
     * semantic and each value is the index of the accessor containing
     * attribute's data. Attribute values only exists for available contents and
     * are ordered by increasing tile index.
     */
    contentAttributes?: Record<string, number>;
    /**
     * Index of the property table containing tile properties. Tile properties
     * only exist for available tiles and are tightly packed by increasing tile
     * index. To access individual tile properties, implementations may create a
     * mapping from tile indices to tile property indices.
     */
    tileProperties?: number;
    /**
     * Index of the property table containing content properties. Content
     * properties only exist for available contents and are tightly packed by
     * increasing tile index. To access individual content properties,
     * implementations may create a mapping from tile indices to content
     * property indices.
     */
    contentProperties?: number;
  }
}
