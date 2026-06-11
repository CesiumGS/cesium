// @ts-check

import BufferPoint from "./BufferPoint.js";
import BufferPointCollection from "./BufferPointCollection.js";
import BufferPointMaterial from "./BufferPointMaterial.js";
import BufferPolygon from "./BufferPolygon.js";
import BufferPolygonCollection from "./BufferPolygonCollection.js";
import BufferPolygonMaterial from "./BufferPolygonMaterial.js";
import BufferPolyline from "./BufferPolyline.js";
import BufferPolylineCollection from "./BufferPolylineCollection.js";
import BufferPolylineMaterial from "./BufferPolylineMaterial.js";
import Cesium3DTileStyle from "./Cesium3DTileStyle.js";
import Matrix4 from "../Core/Matrix4.js";
import Model from "./Model/Model.js";
import ModelUtility from "./Model/ModelUtility.js";
import Pass from "../Renderer/Pass.js";
import createVectorTileBuffersFromModelComponents from "./Model/createVectorTileBuffersFromModelComponents.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import DeveloperError from "../Core/DeveloperError.js";

/** @import BufferPrimitive from "./BufferPrimitive.js"; */
/** @import BufferPrimitiveCollection from "./BufferPrimitiveCollection.js"; */
/** @import Cartesian3 from "../Core/Cartesian3.js"; */
/** @import Cesium3DContentGroup from "./Cesium3DContentGroup.js"; */
/** @import Cesium3DTile from "./Cesium3DTile.js"; */
/** @import Cesium3DTileBatchTable from "./Cesium3DTileBatchTable.js"; */
/** @import Cesium3DTileVectorFeature from "./Cesium3DTileVectorFeature.js";*/
/** @import Cesium3DTileset from "./Cesium3DTileset.js"; */
/** @import Color from "../Core/Color.js"; */
/** @import FrameState from "./FrameState.js"; */
/** @import ImplicitMetadataView from "./ImplicitMetadataView.js"; */
/** @import Ray from "../Core/Ray.js"; */
/** @import Resource from "../Core/Resource.js"; */

/** @ignore */
const point = new BufferPoint();
/** @ignore */
const polyline = new BufferPolyline();
/** @ignore */
const polygon = new BufferPolygon();

/** @ignore */
const pointMaterial = new BufferPointMaterial();
/** @ignore */
const polylineMaterial = new BufferPolylineMaterial();
/** @ignore */
const polygonMaterial = new BufferPolygonMaterial();

/** @ignore */
const scratchTileModelMatrix = new Matrix4();

/**
 * Vector glTF tile content. This path decodes glTF primitives into vector
 * buffers, then renders with dedicated vector primitives.
 *
 * @ignore
 */
class VectorGltf3DTileContent {
  /**
   * @param {Cesium3DTileset} tileset
   * @param {Cesium3DTile} tile
   * @param {Resource} resource
   */
  constructor(tileset, tile, resource) {
    /** @type {Cesium3DTileset} */
    this._tileset = tileset;
    /** @type {Cesium3DTile} */
    this._tile = tile;
    /** @type {Resource} */
    this._resource = resource;

    /** @type {Model} */
    this._model = undefined;

    /**
     * List of all vector primitive collections.
     * @type {Array<BufferPrimitiveCollection<BufferPrimitive>>}
     */
    this._collections = [];

    /**
     * List of transform matrices for each collection; order matches 'collections'.
     * @type {Array<Matrix4>}
     */
    this._collectionLocalMatrices = [];

    /**
     * Maps vector primitive collection -> propertyTableId.
     * @type {Map<BufferPrimitiveCollection<BufferPrimitive>, number>}
     */
    this._collectionFeatureTableIds = new Map();

    /**
     * Maps propertyTableId -> featureId -> feature. Note that Feature IDs are
     * unique within their assigned property table, but not globally unique.
     * @type {Map<number, Map<number, Cesium3DTileVectorFeature>>}
     */
    this._featuresByTableId = new Map();

    /** @type {ImplicitMetadataView} */
    this._metadata = undefined;
    /** @type {Cesium3DContentGroup} */
    this._group = undefined;

    /** @type {boolean} */
    this.featurePropertiesDirty = false;

    /** @type {boolean} */
    this._ready = false;

    /** @type {Matrix4} */
    this._modelMatrix = Matrix4.clone(Matrix4.IDENTITY);
  }

  get featuresLength() {
    return this.batchTables.reduce(
      (acc, batchTable) => acc + batchTable.featuresLength,
      0,
    );
  }

  get pointsLength() {
    return this._collections
      .filter((collection) => collection instanceof BufferPointCollection)
      .reduce((acc, collection) => acc + collection.primitiveCount, 0);
  }

  get trianglesLength() {
    return this._collections.reduce((acc, collection) => {
      if (collection instanceof BufferPolygonCollection) {
        return acc + collection.triangleCount;
      } else if (collection instanceof BufferPolylineCollection) {
        return acc + (collection.vertexCount - collection.primitiveCount) * 2;
      }
      return acc;
    }, 0);
  }

  get geometryByteLength() {
    return this._collections.reduce((totalByteLength, collection) => {
      return totalByteLength + collection.byteLength;
    }, 0);
  }

  get texturesByteLength() {
    return 0;
  }

  get batchTableByteLength() {
    return this.batchTables.reduce(
      // @ts-expect-error Missing types.
      (acc, batchTable) => acc + batchTable.batchTableByteLength,
      0,
    );
  }

  /** @returns {undefined} */
  get innerContents() {
    return undefined;
  }

  get ready() {
    return this._ready;
  }

  get tileset() {
    return this._tileset;
  }

  get tile() {
    return this._tile;
  }

  get url() {
    return this._resource.getUrlComponent(true);
  }

  /** @type {Cesium3DTileBatchTable[]} */
  get batchTables() {
    return this._model._featureTables;
  }

  /**
   * @type {Cesium3DTileBatchTable}
   * @deprecated See {@link batchTables}.
   */
  get batchTable() {
    throw new DeveloperError("Deprecated: Use `content.batchTables`.");
  }

  /** @type {ImplicitMetadataView} */
  get metadata() {
    return this._metadata;
  }

  set metadata(value) {
    this._metadata = value;
  }

  /** @type {Cesium3DContentGroup} */
  get group() {
    return this._group;
  }

  set group(value) {
    this._group = value;
  }

  /**
   * @param {number} featureId
   * @param {number} [featureTableId]
   * @returns {Cesium3DTileVectorFeature}
   */
  getFeature(featureId, featureTableId) {
    return this._featuresByTableId.get(featureTableId)?.get(featureId);
  }

  /**
   * @param {number} featureId
   * @param {string} name
   * @param {number} [featureTableId]
   * @returns {boolean}
   */
  hasProperty(featureId, name, featureTableId) {
    const feature = this.getFeature(featureId, featureTableId);
    return feature ? feature.hasProperty(name) : false;
  }

  /**
   * @param {boolean} enabled
   * @param {Color} color
   */
  applyDebugSettings(enabled, color) {
    const colorString = enabled
      ? `color("${color.toCssHexString()}", 1.0)`
      : 'color("white", 1.0)';
    this.applyStyle(new Cesium3DTileStyle({ color: colorString }));
  }

  /**
   * @param {*} style The global style applied to features that do not match any conditional style.
   * @param {Array<{condition: function(Cesium3DTileVectorFeature): boolean, style: *}>} [conditionalStyles]
   *        Ordered list of conditional styles. The first entry whose condition returns true for a
   *        feature determines that feature's style; otherwise the global style is used.
   */
  applyStyle(style, conditionalStyles) {
    const isPointCollection = /** @param {unknown} c */ (c) =>
      c instanceof BufferPointCollection;
    const isPolylineCollection = /** @param {unknown} c */ (c) =>
      c instanceof BufferPolylineCollection;
    const isPolygonCollection = /** @param {unknown} c */ (c) =>
      c instanceof BufferPolygonCollection;

    // Resolve the style for a feature: the first conditional style whose
    // condition matches wins, otherwise fall back to the global style.
    const resolveStyle = /** @param {*} feature */ (feature) => {
      if (defined(feature) && defined(conditionalStyles)) {
        for (let i = 0; i < conditionalStyles.length; i++) {
          const conditionalStyle = conditionalStyles[i];
          if (conditionalStyle.condition(feature)) {
            return conditionalStyle.style;
          }
        }
      }
      return style;
    };

    for (const collection of this._collections.filter(isPointCollection)) {
      const featureTableId = this._collectionFeatureTableIds.get(collection);
      for (let i = 0, il = collection.primitiveCount; i < il; i++) {
        collection.get(i, point);
        const feature = this.getFeature(point.featureId, featureTableId);
        const effectiveStyle = resolveStyle(feature);
        if (!defined(effectiveStyle)) {
          continue;
        }

        if (defined(effectiveStyle.show)) {
          point.show = effectiveStyle.show.evaluate(feature);
        }
        if (defined(effectiveStyle.color)) {
          effectiveStyle.color.evaluate(feature, pointMaterial.color);
        }
        if (defined(effectiveStyle.pointSize)) {
          pointMaterial.size = effectiveStyle.pointSize.evaluate(feature);
        }
        if (defined(effectiveStyle.pointOutlineWidth)) {
          pointMaterial.outlineWidth =
            effectiveStyle.pointOutlineWidth.evaluate(feature);
        }
        if (defined(effectiveStyle.pointOutlineColor)) {
          effectiveStyle.pointOutlineColor.evaluate(
            feature,
            pointMaterial.outlineColor,
          );
        }

        point.setMaterial(pointMaterial);
      }
    }

    for (const collection of this._collections.filter(isPolylineCollection)) {
      const featureTableId = this._collectionFeatureTableIds.get(collection);
      for (let i = 0, il = collection.primitiveCount; i < il; i++) {
        collection.get(i, polyline);
        const feature = this.getFeature(polyline.featureId, featureTableId);
        const effectiveStyle = resolveStyle(feature);
        if (!defined(effectiveStyle)) {
          continue;
        }

        if (defined(effectiveStyle.show)) {
          polyline.show = effectiveStyle.show.evaluate(feature);
        }
        if (defined(effectiveStyle.color)) {
          effectiveStyle.color.evaluate(feature, polylineMaterial.color);
        }
        if (defined(effectiveStyle.lineWidth)) {
          polylineMaterial.width = effectiveStyle.lineWidth.evaluate(feature);
        }

        polyline.setMaterial(polylineMaterial);
      }
    }

    for (const collection of this._collections.filter(isPolygonCollection)) {
      const featureTableId = this._collectionFeatureTableIds.get(collection);
      for (let i = 0, il = collection.primitiveCount; i < il; i++) {
        collection.get(i, polygon);
        const feature = this.getFeature(polygon.featureId, featureTableId);
        const effectiveStyle = resolveStyle(feature);
        if (!defined(effectiveStyle)) {
          continue;
        }

        if (defined(effectiveStyle.show)) {
          polygon.show = effectiveStyle.show.evaluate(feature);
        }
        if (defined(effectiveStyle.color)) {
          effectiveStyle.color.evaluate(feature, polygonMaterial.color);
        }

        polygon.setMaterial(polygonMaterial);
      }
    }
  }

  /**
   * @param {Cesium3DTileset} _tileset
   * @param {FrameState} frameState
   */
  update(_tileset, frameState) {
    if (defined(this._model) && !this._ready) {
      const model = this._model;
      model.modelMatrix = this._tile.computedTransform;
      model.update(frameState);

      // @ts-expect-error Requires Model conversion to ES6 class.
      if (model.ready) {
        initializeVectorPrimitives(this);
        this._ready = true;
      }
    }

    Matrix4.multiplyTransformation(
      this._tile.computedTransform,
      this._modelMatrix,
      scratchTileModelMatrix,
    );

    for (let i = 0; i < this._collections.length; i++) {
      Matrix4.multiplyTransformation(
        scratchTileModelMatrix,
        this._collectionLocalMatrices[i],
        this._collections[i].modelMatrix,
      );
      this._collections[i].update(frameState);
    }
  }

  /**
   * @param {Ray} _ray
   * @param {FrameState} _frameState
   * @param {Cartesian3|undefined} _result
   * @returns {Cartesian3|undefined}
   */
  pick(_ray, _frameState, _result) {
    return undefined;
  }

  isDestroyed() {
    return false;
  }

  destroy() {
    this._model?.destroy();
    this._model = undefined;
    this._collections.forEach((collection) => collection.destroy());
    this._collections.length = 0;
    return destroyObject(this);
  }

  /**
   * @param {Cesium3DTileset} tileset
   * @param {Cesium3DTile} tile
   * @param {Resource} resource
   * @param {Uint8Array} glb GLB binary produced by buildVectorGltfFromMVT
   * @returns {Promise<VectorGltf3DTileContent>}
   */
  static async fromGltf(tileset, tile, resource, glb) {
    const content = new VectorGltf3DTileContent(tileset, tile, resource);
    const modelOptions = makeModelOptions(tileset, tile, content, glb);
    const model = await Model.fromGltfAsync(modelOptions);
    // @ts-expect-error Requires Model conversion to ES6 class.
    model.show = false;
    content._model = model;
    return content;
  }
}

/**
 * @param {Cesium3DTileset} tileset
 * @param {Cesium3DTile} tile
 * @param {VectorGltf3DTileContent} content
 * @param {Uint8Array} glb
 * @returns {*}
 * @ignore
 */
function makeModelOptions(tileset, tile, content, glb) {
  return {
    gltf: glb,
    basePath: content._resource,
    cull: false,
    releaseGltfJson: true,
    opaquePass: Pass.CESIUM_3D_TILE,
    modelMatrix: tile.computedTransform,
    upAxis: tileset._modelUpAxis,
    forwardAxis: tileset._modelForwardAxis,
    incrementallyLoadTextures: false,
    content: content,
    // @ts-expect-error Requires Cesium3DTileset conversion to ES6 class.
    featureIdLabel: tileset.featureIdLabel,
    // @ts-expect-error Requires Cesium3DTileset conversion to ES6 class.
    instanceFeatureIdLabel: tileset.instanceFeatureIdLabel,
    projectTo2D: tileset._projectTo2D,
    enablePick: tileset._enablePick,
    enableDebugWireframe: tileset._enableDebugWireframe,
    enableShowOutline: false,
  };
}

/**
 * @param {VectorGltf3DTileContent} content
 * @ignore
 */
function initializeVectorPrimitives(content) {
  // @ts-expect-error Requires Model conversion to ES6 class.
  const components = content._model.sceneGraph.components;

  const axisCorrection = ModelUtility.getAxisCorrectionMatrix(
    components.upAxis,
    components.forwardAxis,
    new Matrix4(),
  );

  Matrix4.multiplyTransformation(
    components.transform,
    axisCorrection,
    content._modelMatrix,
  );

  const result = createVectorTileBuffersFromModelComponents(
    content,
    components,
  );

  content._collections = result.collections;
  content._collectionLocalMatrices = result.collectionLocalMatrices;
  content._collectionFeatureTableIds = result.collectionFeatureTableIds;
  content._featuresByTableId = result.featuresByTableId;
}

export default VectorGltf3DTileContent;
