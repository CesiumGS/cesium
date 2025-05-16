import Cartesian3 from "../Core/Cartesian3.js";
import Check from "../Core/Check.js";
import defined from "../Core/defined.js";
import CesiumMath from "../Core/Math.js";
import HilbertOrder from "../Core/HilbertOrder.js";
import Matrix3 from "../Core/Matrix3.js";
import Rectangle from "../Core/Rectangle.js";
import S2Cell from "../Core/S2Cell.js";

import hasExtension from "./hasExtension.js";

const scratchScaleFactors = new Cartesian3();
const scratchRootCenter = new Cartesian3();
const scratchCenter = new Cartesian3();
const scratchHalfAxes = new Matrix3();
const scratchRectangle = new Rectangle();

/**
 * Functions to derive child bounding volmes in quadtrees and octrees,
 * from the root bounding volume and implicit coordinates.
 *
 * These functions have been extracted from Implicit3DTileContent.
 * They should preferably be offered for objects, and not only for
 * their JSON representation
 */
class BoundingVolumeDerivation {
  /**
   * Given the coordinates of a tile, derive its bounding volume from the root.
   *
   * Most of the information here is only required for S2 bounding volumes.
   *
   * @param {BoundingVolume} rootBoundingVolume The root bounding volume
   * @param {ImplicitTileCoordinates} implicitCoordinates The coordinates of the child tile
   * @param {number} childIndex The morton index of the child tile relative to its parent
   * @param {boolean} parentIsPlaceholderTile True if parentTile is a placeholder tile. This is true for the root of each subtree.
   * @param {Cesium3DTile} parentTile The parent of the new child tile
   * @returns {object} An object containing the JSON for a bounding volume
   * @private
   */
  static deriveBoundingVolume(
    rootBoundingVolume,
    implicitCoordinates,
    childIndex,
    parentIsPlaceholderTile,
    parentTile,
  ) {
    if (hasExtension(rootBoundingVolume, "3DTILES_bounding_volume_S2")) {
      return BoundingVolumeDerivation.deriveBoundingVolumeS2(
        parentIsPlaceholderTile,
        parentTile,
        childIndex,
        implicitCoordinates.level,
        implicitCoordinates.x,
        implicitCoordinates.y,
        implicitCoordinates.z,
      );
    }

    if (defined(rootBoundingVolume.region)) {
      const childRegion = BoundingVolumeDerivation.deriveBoundingRegion(
        rootBoundingVolume.region,
        implicitCoordinates.level,
        implicitCoordinates.x,
        implicitCoordinates.y,
        implicitCoordinates.z,
      );

      return {
        region: childRegion,
      };
    }

    const childBox = BoundingVolumeDerivation.deriveBoundingBox(
      rootBoundingVolume.box,
      implicitCoordinates.level,
      implicitCoordinates.x,
      implicitCoordinates.y,
      implicitCoordinates.z,
    );

    return {
      box: childBox,
    };
  }

  /**
   * Derive a bounding volume for a descendant tile (child, grandchild, etc.),
   * assuming a quadtree or octree implicit tiling scheme. The (level, x, y, [z])
   * coordinates are given to select the descendant tile and compute its position
   * and dimensions.
   * <p>
   * If z is present, octree subdivision is used. Otherwise, quadtree subdivision
   * is used. Quadtrees are always divided at the midpoint of the the horizontal
   * dimensions, i.e. (x, y), leaving the z axis unchanged.
   * </p>
   *
   * @param {boolean} parentIsPlaceholderTile True if parentTile is a placeholder tile. This is true for the root of each subtree.
   * @param {Cesium3DTile} parentTile The parent of the new child tile
   * @param {number} childIndex The morton index of the child tile relative to its parent
   * @param {number} level The level of the descendant tile relative to the root implicit tile
   * @param {number} x The x coordinate of the descendant tile
   * @param {number} y The y coordinate of the descendant tile
   * @param {number} [z] The z coordinate of the descendant tile (octree only)
   * @returns {object} An object with the 3DTILES_bounding_volume_S2 extension.
   * @private
   */
  static deriveBoundingVolumeS2(
    parentIsPlaceholderTile,
    parentTile,
    childIndex,
    level,
    x,
    y,
    z,
  ) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.bool("parentIsPlaceholderTile", parentIsPlaceholderTile);
    Check.typeOf.object("parentTile", parentTile);
    Check.typeOf.number("childIndex", childIndex);
    Check.typeOf.number("level", level);
    Check.typeOf.number("x", x);
    Check.typeOf.number("y", y);
    if (defined(z)) {
      Check.typeOf.number("z", z);
    }
    //>>includeEnd('debug');

    const boundingVolumeS2 = parentTile._boundingVolume;

    // Handle the placeholder tile case, where we just duplicate the placeholder's bounding volume.
    if (parentIsPlaceholderTile) {
      return {
        extensions: {
          "3DTILES_bounding_volume_S2": {
            token: S2Cell.getTokenFromId(boundingVolumeS2.s2Cell._cellId),
            minimumHeight: boundingVolumeS2.minimumHeight,
            maximumHeight: boundingVolumeS2.maximumHeight,
          },
        },
      };
    }

    // Extract the first 3 face bits from the 64-bit S2 cell ID.
    const face = Number(
      parentTile._boundingVolume.s2Cell._cellId >> BigInt(61),
    );
    // The Hilbert curve is rotated for the "odd" faces on the S2 Earthcube.
    // See http://s2geometry.io/devguide/img/s2cell_global.jpg
    const position =
      face % 2 === 0
        ? HilbertOrder.encode2D(level, x, y)
        : HilbertOrder.encode2D(level, y, x);
    const cell = S2Cell.fromFacePositionLevel(face, BigInt(position), level);

    let minHeight, maxHeight;
    if (defined(z)) {
      const midpointHeight =
        (boundingVolumeS2.maximumHeight + boundingVolumeS2.minimumHeight) / 2;
      minHeight =
        childIndex < 4 ? boundingVolumeS2.minimumHeight : midpointHeight;
      maxHeight =
        childIndex < 4 ? midpointHeight : boundingVolumeS2.maximumHeight;
    } else {
      minHeight = boundingVolumeS2.minimumHeight;
      maxHeight = boundingVolumeS2.maximumHeight;
    }

    return {
      extensions: {
        "3DTILES_bounding_volume_S2": {
          token: S2Cell.getTokenFromId(cell._cellId),
          minimumHeight: minHeight,
          maximumHeight: maxHeight,
        },
      },
    };
  }

  /**
   * Derive a bounding volume for a descendant tile (child, grandchild, etc.),
   * assuming a quadtree or octree implicit tiling scheme. The (level, x, y, [z])
   * coordinates are given to select the descendant tile and compute its position
   * and dimensions.
   * <p>
   * If z is present, octree subdivision is used. Otherwise, quadtree subdivision
   * is used. Quadtrees are always divided at the midpoint of the the horizontal
   * dimensions, i.e. (x, y), leaving the z axis unchanged.
   * </p>
   * <p>
   * This computes the child volume directly from the root bounding volume rather
   * than recursively subdividing to minimize floating point error.
   * </p>
   *
   * @param {number[]} rootBox An array of 12 numbers representing the bounding box of the root tile
   * @param {number} level The level of the descendant tile relative to the root implicit tile
   * @param {number} x The x coordinate of the descendant tile
   * @param {number} y The y coordinate of the descendant tile
   * @param {number} [z] The z coordinate of the descendant tile (octree only)
   * @returns {number[]} An array of 12 numbers representing the bounding box of the descendant tile.
   * @private
   */
  static deriveBoundingBox(rootBox, level, x, y, z) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("rootBox", rootBox);
    Check.typeOf.number("level", level);
    Check.typeOf.number("x", x);
    Check.typeOf.number("y", y);
    if (defined(z)) {
      Check.typeOf.number("z", z);
    }
    //>>includeEnd('debug');

    if (level === 0) {
      return rootBox;
    }

    const rootCenter = Cartesian3.unpack(rootBox, 0, scratchRootCenter);
    const rootHalfAxes = Matrix3.unpack(rootBox, 3, scratchHalfAxes);

    const tileScale = Math.pow(2, -level);
    const modelSpaceX = -1 + (2 * x + 1) * tileScale;
    const modelSpaceY = -1 + (2 * y + 1) * tileScale;

    let modelSpaceZ = 0;
    const scaleFactors = Cartesian3.fromElements(
      tileScale,
      tileScale,
      1,
      scratchScaleFactors,
    );

    if (defined(z)) {
      modelSpaceZ = -1 + (2 * z + 1) * tileScale;
      scaleFactors.z = tileScale;
    }

    let center = Cartesian3.fromElements(
      modelSpaceX,
      modelSpaceY,
      modelSpaceZ,
      scratchCenter,
    );
    center = Matrix3.multiplyByVector(rootHalfAxes, center, scratchCenter);
    center = Cartesian3.add(center, rootCenter, scratchCenter);

    let halfAxes = Matrix3.clone(rootHalfAxes);
    halfAxes = Matrix3.multiplyByScale(halfAxes, scaleFactors, halfAxes);

    const childBox = new Array(12);
    Cartesian3.pack(center, childBox);
    Matrix3.pack(halfAxes, childBox, 3);
    return childBox;
  }

  /**
   * Derive a bounding volume for a descendant tile (child, grandchild, etc.),
   * assuming a quadtree or octree implicit tiling scheme. The (level, x, y, [z])
   * coordinates are given to select the descendant tile and compute its position
   * and dimensions.
   * <p>
   * If z is present, octree subdivision is used. Otherwise, quadtree subdivision
   * is used. Quadtrees are always divided at the midpoint of the the horizontal
   * dimensions, i.e. (mid_longitude, mid_latitude), leaving the height values
   * unchanged.
   * </p>
   * <p>
   * This computes the child volume directly from the root bounding volume rather
   * than recursively subdividing to minimize floating point error.
   * </p>
   * @param {number[]} rootRegion An array of 6 numbers representing the root implicit tile
   * @param {number} level The level of the descendant tile relative to the root implicit tile
   * @param {number} x The x coordinate of the descendant tile
   * @param {number} y The x coordinate of the descendant tile
   * @param {number} [z] The z coordinate of the descendant tile (octree only)
   * @returns {number[]} An array of 6 numbers representing the bounding region of the descendant tile
   * @private
   */
  static deriveBoundingRegion(rootRegion, level, x, y, z) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("rootRegion", rootRegion);
    Check.typeOf.number("level", level);
    Check.typeOf.number("x", x);
    Check.typeOf.number("y", y);
    if (defined(z)) {
      Check.typeOf.number("z", z);
    }
    //>>includeEnd('debug');

    if (level === 0) {
      return rootRegion.slice();
    }

    const rectangle = Rectangle.unpack(rootRegion, 0, scratchRectangle);
    const rootMinimumHeight = rootRegion[4];
    const rootMaximumHeight = rootRegion[5];
    const tileScale = Math.pow(2, -level);

    const childWidth = tileScale * rectangle.width;
    const west = CesiumMath.negativePiToPi(rectangle.west + x * childWidth);
    const east = CesiumMath.negativePiToPi(west + childWidth);

    const childHeight = tileScale * rectangle.height;
    const south = CesiumMath.negativePiToPi(rectangle.south + y * childHeight);
    const north = CesiumMath.negativePiToPi(south + childHeight);

    // Height is only subdivided for octrees; It remains constant for quadtrees.
    let minimumHeight = rootMinimumHeight;
    let maximumHeight = rootMaximumHeight;
    if (defined(z)) {
      const childThickness =
        tileScale * (rootMaximumHeight - rootMinimumHeight);
      minimumHeight += z * childThickness;
      maximumHeight = minimumHeight + childThickness;
    }

    return [west, south, east, north, minimumHeight, maximumHeight];
  }
}

export default BoundingVolumeDerivation;
