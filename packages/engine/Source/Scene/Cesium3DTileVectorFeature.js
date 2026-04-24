// @ts-check

import DeveloperError from "../Core/DeveloperError.js";
import BufferPoint from "./BufferPoint.js";
import BufferPointCollection from "./BufferPointCollection.js";
import BufferPointMaterial from "./BufferPointMaterial.js";
import BufferPolygon from "./BufferPolygon.js";
import BufferPolygonCollection from "./BufferPolygonCollection.js";
import BufferPolygonMaterial from "./BufferPolygonMaterial.js";
import BufferPolyline from "./BufferPolyline.js";
import BufferPolylineCollection from "./BufferPolylineCollection.js";
import BufferPolylineMaterial from "./BufferPolylineMaterial.js";
import Cesium3DTileFeature from "./Cesium3DTileFeature.js";
import Color from "../Core/Color.js";

/** @import BufferPrimitive from "./BufferPrimitive.js"; */
/** @import BufferPrimitiveMaterial from "./BufferPrimitiveMaterial.js"; */
/** @import Cesium3DTileBatchTable from "./Cesium3DTileBatchTable.js"; */
/** @import Cesium3DTileContent from "./Cesium3DTileContent.js"; */
/** @import Cesium3DTileset from "./Cesium3DTileset.js"; */
/** @import VectorGltf3DTileContent from "./VectorGltf3DTileContent.js"; */

const point = new BufferPoint();
const polyline = new BufferPolyline();
const polygon = new BufferPolygon();

const pointMaterial = new BufferPointMaterial();
const polylineMaterial = new BufferPolylineMaterial();
const polygonMaterial = new BufferPolygonMaterial();

/**
 * A vector feature of a {@link Cesium3DTileset}.
 * <p>
 * Provides access to a feature's properties stored in the tile's batch table, as well
 * as the ability to show/hide and style the feature
 * </p>
 * <p>
 * Modifications to a <code>Cesium3DTileVectorFeature</code> object have the lifetime of the tile's
 * content.  If the tile's content is unloaded, e.g., due to it going out of view and needing
 * to free space in the cache for visible tiles, listen to the {@link Cesium3DTileset#tileUnload} event to save any
 * modifications. Also listen to the {@link Cesium3DTileset#tileVisible} event to reapply any modifications.
 * </p>
 * <p>
 * Do not construct this directly.  Access it through {@link Cesium3DTileContent#getFeature}
 * or picking using {@link Scene#pick} and {@link Scene#pickPosition}.
 * </p>
 *
 * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @example
 * // On mouse over, display all the properties for a feature in the console log.
 * handler.setInputAction(function(movement) {
 *     const feature = scene.pick(movement.endPosition);
 *     if (feature instanceof Cesium.Cesium3DTileVectorFeature) {
 *         const propertyIds = feature.getPropertyIds();
 *         const length = propertyIds.length;
 *         for (let i = 0; i < length; ++i) {
 *             const propertyId = propertyIds[i];
 *             console.log(`{propertyId}: ${feature.getProperty(propertyId)}`);
 *         }
 *     }
 * }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
 *
 * @ignore
 */
class Cesium3DTileVectorFeature {
  /** @private  */
  _color = new Color();

  /** @private  */
  _outlineColor = new Color();

  /**
   * @param {VectorGltf3DTileContent} content
   * @param {number} batchId
   * @param {number} [batchTableId=0]
   */
  constructor(content, batchId, batchTableId = 0) {
    this._content = content;
    this._batchId = batchId;
    this._batchTableId = batchTableId;

    /**
     * For each collection index N, this map returns the indices of all
     * primitive in the collection associated with this feature.
     * @type {Map<number, number[]>}
     * @private
     */
    this._primitivesByCollection = new Map();
  }

  /**
   * @param {number} collectionIndex
   * @param {number} primitiveIndex
   */
  addPrimitiveByCollection(collectionIndex, primitiveIndex) {
    let primitiveIndices = this._primitivesByCollection.get(collectionIndex);
    if (!primitiveIndices) {
      primitiveIndices = [];
      this._primitivesByCollection.set(collectionIndex, primitiveIndices);
    }
    primitiveIndices.push(primitiveIndex);
  }

  /**
   * @type {boolean}
   * @default true
   */
  get show() {
    for (const prim of this._iteratePrimitives()) {
      if (prim.show) {
        return true;
      }
    }
    return false;
  }

  set show(value) {
    for (const prim of this._iteratePrimitives()) {
      prim.show = value;
    }
  }

  /**
   * @type {Color}
   * @default Color.WHITE
   */
  get color() {
    for (const material of this._iterateMaterials()) {
      return Color.clone(material.color, this._color);
    }
    return Color.clone(Color.WHITE, this._color);
  }

  set color(value) {
    for (const material of this._iterateMaterials()) {
      Color.clone(value, material.color);
    }
  }

  /**
   * @type {number}
   * @default 1
   */
  get pointSize() {
    for (const material of this._iteratePointMaterials()) {
      return material.size;
    }
    return 1;
  }

  set pointSize(value) {
    for (const material of this._iteratePointMaterials()) {
      material.size = value;
    }
  }

  /**
   * @type {Color}
   * @default Color.WHITE
   */
  get pointOutlineColor() {
    for (const material of this._iteratePointMaterials()) {
      return Color.clone(material.outlineColor, this._outlineColor);
    }
    return Color.clone(Color.WHITE, this._outlineColor);
  }

  set pointOutlineColor(value) {
    for (const material of this._iteratePointMaterials()) {
      Color.clone(value, material.outlineColor);
    }
  }

  /**
   * @type {number}
   * @default 0
   */
  get pointOutlineWidth() {
    for (const material of this._iteratePointMaterials()) {
      return material.outlineWidth;
    }
    return 0;
  }

  set pointOutlineWidth(value) {
    for (const material of this._iteratePointMaterials()) {
      material.outlineWidth = value;
    }
  }

  /**
   * @type {number}
   * @default 1
   */
  get lineWidth() {
    for (const material of this._iteratePolylineMaterials()) {
      return material.width;
    }
    return 1;
  }

  set lineWidth(value) {
    for (const material of this._iteratePolylineMaterials()) {
      material.width = value;
    }
  }

  /**
   * @type {Color}
   * @default Color.WHITE
   */
  get lineOutlineColor() {
    for (const material of this._iteratePolylineMaterials()) {
      return Color.clone(material.outlineColor, this._outlineColor);
    }
    return Color.clone(Color.WHITE, this._outlineColor);
  }

  set lineOutlineColor(value) {
    for (const material of this._iteratePolylineMaterials()) {
      Color.clone(value, material.outlineColor);
    }
  }

  /**
   * @type {number}
   * @default 0
   */
  get lineOutlineWidth() {
    for (const material of this._iteratePolylineMaterials()) {
      return material.outlineWidth;
    }
    return 0;
  }

  set lineOutlineWidth(value) {
    for (const material of this._iteratePolylineMaterials()) {
      material.outlineWidth = value;
    }
  }

  /**
   * @type {Color}
   * @default Color.WHITE
   */
  get polygonOutlineColor() {
    for (const material of this._iteratePolygonMaterials()) {
      return Color.clone(material.outlineColor, this._outlineColor);
    }
    return Color.clone(Color.WHITE, this._outlineColor);
  }

  set polygonOutlineColor(value) {
    for (const material of this._iteratePolygonMaterials()) {
      Color.clone(value, material.outlineColor);
    }
  }

  /**
   * @type {number}
   * @default 0
   */
  get polygonOutlineWidth() {
    for (const material of this._iteratePolygonMaterials()) {
      return material.outlineWidth;
    }
    return 0;
  }

  set polygonOutlineWidth(value) {
    for (const material of this._iteratePolygonMaterials()) {
      material.outlineWidth = value;
    }
  }

  /**
   * Gets the content of the tile containing the feature.
   *
   * @type {VectorGltf3DTileContent}
   *
   * @ignore
   */
  get content() {
    return this._content;
  }

  /**
   * Gets the tileset containing the feature.
   *
   * @type {Cesium3DTileset}
   */
  get tileset() {
    return this._content.tileset;
  }

  /**
   * All objects returned by {@link Scene#pick} have a <code>primitive</code> property. This returns
   * the tileset containing the feature.
   *
   * @type {Cesium3DTileset}
   */
  get primitive() {
    return this._content.tileset;
  }

  /**
   * Get the feature ID associated with this feature. Using EXT_mesh_features,
   * this is the feature ID from the selected feature ID set.
   *
   * @type {number}
   *
   * @readonly
   */
  get featureId() {
    return this._batchId;
  }

  /**
   * @type {Cesium3DTileBatchTable}
   * @private
   */
  get _batchTable() {
    return this._content.batchTables[this._batchTableId];
  }

  /**
   * @type {number[]}
   * @ignore
   */
  get pickIds() {
    const pickIds = [];
    for (const prim of this._iteratePrimitives()) {
      pickIds.push(prim._pickId);
    }
    return pickIds;
  }

  /**
   * Returns whether the feature contains this property. This includes properties from this feature's
   * class and inherited classes when using a batch table hierarchy.
   *
   * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_batch_table_hierarchy}
   *
   * @param {string} name The case-sensitive name of the property.
   * @returns {boolean} Whether the feature contains this property.
   */
  hasProperty(name) {
    return this._batchTable.hasProperty(this._batchId, name);
  }

  /**
   * Returns an array of property IDs for the feature. This includes properties from this feature's
   * class and inherited classes when using a batch table hierarchy.
   *
   * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_batch_table_hierarchy}
   *
   * @param {string[]} [results] An array into which to store the results.
   * @returns {string[]} The IDs of the feature's properties.
   */
  getPropertyIds(results) {
    return this._batchTable.getPropertyIds(this._batchId, results);
  }

  /**
   * Returns a copy of the value of the feature's property with the given name. This includes properties from this feature's
   * class and inherited classes when using a batch table hierarchy.
   *
   * @see {@link https://github.com/CesiumGS/3d-tiles/tree/main/extensions/3DTILES_batch_table_hierarchy}
   *
   * @param {string} name The case-sensitive name of the property.
   * @returns {*} The value of the property or <code>undefined</code> if the feature does not have this property.
   *
   * @example
   * // Display all the properties for a feature in the console log.
   * const propertyIds = feature.getPropertyIds();
   * const length = propertyIds.length;
   * for (let i = 0; i < length; ++i) {
   *     const propertyId = propertyIds[i];
   *     console.log(`{propertyId} : ${feature.getProperty(propertyId)}`);
   * }
   */
  getProperty(name) {
    return this._batchTable.getProperty(this._batchId, name);
  }

  /**
   * Returns a copy of the value of the feature's property with the given name.
   * If the feature is contained within a tileset that has metadata (3D Tiles 1.1)
   * or uses the <code>3DTILES_metadata</code> extension, tileset, group and tile metadata is
   * inherited.
   * <p>
   * To resolve name conflicts, this method resolves names from most specific to
   * least specific by metadata granularity in the order: feature, tile, group,
   * tileset. Within each granularity, semantics are resolved first, then other
   * properties.
   * </p>
   * @param {string} name The case-sensitive name of the property.
   * @returns {*} The value of the property or <code>undefined</code> if the feature does not have this property.
   * @private
   * @experimental This feature is using part of the 3D Tiles spec that is not final and is subject to change without Cesium's standard deprecation policy.
   */
  getPropertyInherited(name) {
    return Cesium3DTileFeature.getPropertyInherited(
      // @ts-expect-error Requires type checking in Cesium3DTileContent.
      this._content,
      this._batchId,
      name,
      this._batchTable,
    );
  }

  /**
   * Sets the value of the feature's property with the given name.
   * <p>
   * If a property with the given name doesn't exist, it is created.
   * </p>
   *
   * @param {string} name The case-sensitive name of the property.
   * @param {*} value The value of the property that will be copied.
   *
   * @exception {DeveloperError} Inherited batch table hierarchy property is read only.
   *
   * @example
   * const height = feature.getProperty('Height'); // e.g., the height of a building
   *
   * @example
   * const name = 'clicked';
   * if (feature.getProperty(name)) {
   *     console.log('already clicked');
   * } else {
   *     feature.setProperty(name, true);
   *     console.log('first click');
   * }
   */
  setProperty(name, value) {
    throw new DeveloperError("Not implemented");
  }

  /**
   * Returns whether the feature's class name equals <code>className</code>. Unlike {@link Cesium3DTileVectorFeature#isClass}
   * this function only checks the feature's exact class and not inherited classes.
   * <p>
   * This function returns <code>false</code> if no batch table hierarchy is present.
   * </p>
   *
   * @param {string} className The name to check against.
   * @returns {boolean} Whether the feature's class name equals <code>className</code>
   *
   * @private
   */
  isExactClass(className) {
    return false;
  }

  /**
   * Returns whether the feature's class or any inherited classes are named <code>className</code>.
   * <p>
   * This function returns <code>false</code> if no batch table hierarchy is present.
   * </p>
   *
   * @param {string} className The name to check against.
   * @returns {boolean} Whether the feature's class or inherited classes are named <code>className</code>
   *
   * @private
   */
  isClass(className) {
    return false;
  }

  /**
   * Returns the feature's class name.
   * <p>
   * This function returns <code>undefined</code> if no batch table hierarchy is present.
   * </p>
   *
   * @returns {string} The feature's class name.
   *
   * @private
   */
  getExactClassName() {
    return undefined;
  }

  /////////////////////////////////////////////////////////////////////////////
  // INTERNAL ITERATORS

  /**
   * @returns {Iterable<BufferPrimitive>}
   */
  *_iteratePrimitives() {
    yield* this._iteratePrimitivesWith(BufferPointCollection, point);
    yield* this._iteratePrimitivesWith(BufferPolylineCollection, polyline);
    yield* this._iteratePrimitivesWith(BufferPolygonCollection, polygon);
  }

  /**
   * @param {*} CollectionType
   * @param {BufferPrimitive} result
   * @returns {Iterable<BufferPrimitive>}
   */
  *_iteratePrimitivesWith(CollectionType, result) {
    const collections = this._content._collections;
    for (let i = 0; i < collections.length; i++) {
      const collection = collections[i];
      const primitiveIndices = this._primitivesByCollection.get(i);
      if (primitiveIndices && collection instanceof CollectionType) {
        for (const primitiveIndex of primitiveIndices) {
          collection.get(primitiveIndex, result);
          yield result;
        }
      }
    }
  }

  /** @returns {Iterable<BufferPrimitiveMaterial>} */
  *_iterateMaterials() {
    yield* this._iteratePointMaterials();
    yield* this._iteratePolylineMaterials();
    yield* this._iteratePolygonMaterials();
  }

  /** @returns {Iterable<BufferPointMaterial>} */
  *_iteratePointMaterials() {
    yield* /** @type {Iterable<BufferPointMaterial>} */ (
      this._iterateMaterialsWith(BufferPointCollection, point, pointMaterial)
    );
  }

  /** @returns {Iterable<BufferPolylineMaterial>} */
  *_iteratePolylineMaterials() {
    yield* /** @type {Iterable<BufferPolylineMaterial>} */ (
      this._iterateMaterialsWith(
        BufferPolylineCollection,
        polyline,
        polylineMaterial,
      )
    );
  }

  /** @returns {Iterable<BufferPolygonMaterial>} */
  *_iteratePolygonMaterials() {
    yield* /** @type {Iterable<BufferPolygonMaterial>} */ (
      this._iterateMaterialsWith(
        BufferPolygonCollection,
        polygon,
        polygonMaterial,
      )
    );
  }

  /**
   * @param {*} CollectionType
   * @param {BufferPrimitive} primitive
   * @param {BufferPrimitiveMaterial} result
   * @returns {Iterable<BufferPrimitiveMaterial>}
   */
  *_iterateMaterialsWith(CollectionType, primitive, result) {
    for (const prim of this._iteratePrimitivesWith(CollectionType, primitive)) {
      prim.getMaterial(result);
      yield result;
      prim.setMaterial(result);
    }
  }
}

export default Cesium3DTileVectorFeature;
