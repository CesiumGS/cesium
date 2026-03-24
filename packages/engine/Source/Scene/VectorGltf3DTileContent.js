// @ts-check

import Color from "../Core/Color.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import Matrix4 from "../Core/Matrix4.js";
import Pass from "../Renderer/Pass.js";
import BufferPoint from "./BufferPoint.js";
import BufferPolyline from "./BufferPolyline.js";
import Model from "./Model/Model.js";
import createVectorTileBuffersFromModelComponents from "./Model/createVectorTileBuffersFromModelComponents.js";
import ModelUtility from "./Model/ModelUtility.js";
import BufferPolygon from "./BufferPolygon.js";
import {
  buildTileSurfacePolygonGpuLookup,
  buildTileSurfacePolylineGpuLookup,
} from "./buildVectorTileGpuLookup.js";

/**
 * Vector glTF tile content. This path decodes glTF primitives into vector
 * buffers, then renders with dedicated vector primitives.
 *
 * @private
 */
class VectorGltf3DTileContent {
  /**
   * @param {*} tileset
   * @param {*} tile
   * @param {*} resource
   */
  constructor(tileset, tile, resource) {
    this._tileset = tileset;
    this._tile = tile;
    this._resource = resource;

    /** @type {*} */
    this._decodeModel = undefined;

    /** @type {*} */
    this._vectorBuffers = undefined;
    /** @type {*} */
    this._pointCollections = undefined;
    /** @type {*} */
    this._polylineCollections = undefined;
    /** @type {*} */
    this._polygonCollections = undefined;

    /** @type {*} */
    this._metadata = undefined;
    /** @type {*} */
    this._group = undefined;

    /** @type {boolean} */
    this.featurePropertiesDirty = false;
    /** @type {boolean} */
    this._ready = false;

    this._vectorBaseTransform = Matrix4.clone(Matrix4.IDENTITY);
    this._computedVectorModelMatrix = Matrix4.clone(Matrix4.IDENTITY);
    this._tileGpuLookupModelMatrix = Matrix4.clone(Matrix4.IDENTITY);
    this._tileSurfacePolylineGpuLookup = undefined;
    this._tileSurfacePolygonGpuLookup = undefined;
  }

  get featuresLength() {
    if (!defined(this._vectorBuffers)) {
      return 0;
    }

    return (
      sumCollectionProperty(this._vectorBuffers.points, "primitiveCount") +
      sumCollectionProperty(this._vectorBuffers.polylines, "primitiveCount") +
      sumCollectionProperty(this._vectorBuffers.polygons, "primitiveCount")
    );
  }

  get pointsLength() {
    if (!defined(this._vectorBuffers)) {
      return 0;
    }
    return sumCollectionProperty(this._vectorBuffers.points, "primitiveCount");
  }

  get trianglesLength() {
    if (!defined(this._vectorBuffers)) {
      return 0;
    }
    return sumCollectionProperty(this._vectorBuffers.polygons, "triangleCount");
  }

  get geometryByteLength() {
    if (!defined(this._vectorBuffers)) {
      return 0;
    }

    return (
      sumCollectionProperty(this._vectorBuffers.points, "byteLength") +
      sumCollectionProperty(this._vectorBuffers.polylines, "byteLength") +
      sumCollectionProperty(this._vectorBuffers.polygons, "byteLength")
    );
  }

  get texturesByteLength() {
    return 0;
  }

  get batchTableByteLength() {
    return 0;
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

  /** @returns {undefined} */
  get batchTable() {
    return undefined;
  }

  /** @returns {*} */
  get metadata() {
    return this._metadata;
  }

  /** @param {*} value */
  set metadata(value) {
    this._metadata = value;
  }

  /** @returns {*} */
  get group() {
    return this._group;
  }

  /** @param {*} value */
  set group(value) {
    this._group = value;
  }

  /**
   * @param {*} _featureId
   * @returns {undefined}
   */
  getFeature(_featureId) {
    return undefined;
  }

  /**
   * @param {*} _featureId
   * @param {*} _name
   * @returns {boolean}
   */
  hasProperty(_featureId, _name) {
    return false;
  }

  /**
   * @param {boolean} enabled
   * @param {Color} color
   */
  applyDebugSettings(enabled, color) {
    if (!defined(this._vectorBuffers)) {
      return;
    }

    /** @param {*} points */
    forEachCollection(this._vectorBuffers.points, function (points) {
      const point = new BufferPoint();
      for (let i = 0; i < points.primitiveCount; i++) {
        points.get(i, point);
        point.setColor(enabled ? color : Color.WHITE);
      }
    });

    /** @param {*} polylines */
    forEachCollection(this._vectorBuffers.polylines, function (polylines) {
      const polyline = new BufferPolyline();
      for (let i = 0; i < polylines.primitiveCount; i++) {
        polylines.get(i, polyline);
        polyline.setColor(enabled ? color : Color.WHITE);
      }
    });

    /** @param {*} polygons */
    forEachCollection(this._vectorBuffers.polygons, function (polygons) {
      const polygon = new BufferPolygon();
      for (let i = 0; i < polygons.primitiveCount; i++) {
        polygons.get(i, polygon);
        polygon.setColor(enabled ? color : Color.WHITE);
      }
    });
  }

  /** @param {*} _style */
  applyStyle(_style) {}

  /**
   * @param {*} _tileset
   * @param {*} frameState
   */
  update(_tileset, frameState) {
    if (defined(this._decodeModel) && !this._ready) {
      const model = this._decodeModel;
      model.modelMatrix = this._tile.computedTransform;
      model.update(frameState);

      if (model.ready) {
        initializeVectorPrimitives(this);
        this._decodeModel = this._decodeModel && this._decodeModel.destroy();
        this._ready = true;
      }
    }

    Matrix4.multiplyTransformation(
      this._tile.computedTransform,
      this._vectorBaseTransform,
      this._computedVectorModelMatrix,
    );
    const vectorModelMatrix = this._computedVectorModelMatrix;

    updateTileGpuLookup(this, vectorModelMatrix);

    updateCollectionArray(
      this._pointCollections,
      vectorModelMatrix,
      frameState,
    );
    updateCollectionArray(
      this._polylineCollections,
      vectorModelMatrix,
      frameState,
    );
    updateCollectionArray(
      this._polygonCollections,
      vectorModelMatrix,
      frameState,
    );
  }

  /**
   * @param {*} _ray
   * @param {*} _frameState
   * @param {*} _result
   * @returns {undefined}
   */
  pick(_ray, _frameState, _result) {
    return undefined;
  }

  isDestroyed() {
    return false;
  }

  destroy() {
    this._decodeModel = this._decodeModel && this._decodeModel.destroy();
    destroyCollectionArray(this._pointCollections);
    destroyCollectionArray(this._polylineCollections);
    destroyCollectionArray(this._polygonCollections);
    this._pointCollections = undefined;
    this._polylineCollections = undefined;
    this._polygonCollections = undefined;
    this._tileSurfacePolylineGpuLookup = undefined;
    this._tileSurfacePolygonGpuLookup = undefined;
    this._vectorBuffers = undefined;
    return destroyObject(this);
  }

  /**
   * @param {*} tileset
   * @param {*} tile
   * @param {*} resource
   * @param {*} gltf
   * @returns {Promise<*>}
   */
  static async fromGltf(tileset, tile, resource, gltf) {
    const content = new VectorGltf3DTileContent(tileset, tile, resource);
    const modelOptions = /** @type {*} */ (
      makeDecodeModelOptions(tileset, tile, content, gltf)
    );
    const decodeModel = /** @type {*} */ (
      await Model.fromGltfAsync(modelOptions)
    );
    decodeModel.show = false;
    content._decodeModel = decodeModel;
    return content;
  }
}

/**
 * @param {Array<*>|undefined} collections
 * @param {string} propertyName
 * @returns {number}
 */
function sumCollectionProperty(collections, propertyName) {
  if (!defined(collections)) {
    return 0;
  }

  let total = 0;
  for (let i = 0; i < collections.length; i++) {
    total += collections[i][propertyName];
  }
  return total;
}

/**
 * @param {Array<*>|undefined} collections
 * @param {function(*, number): void} callback
 */
function forEachCollection(collections, callback) {
  if (!defined(collections)) {
    return;
  }

  for (let i = 0; i < collections.length; i++) {
    callback(collections[i], i);
  }
}

/**
 * @param {Array<*>|undefined} collections
 * @param {string} renderingMethod
 */
function setCollectionRenderingMethod(collections, renderingMethod) {
  forEachCollection(collections, function (collection) {
    collection._vectorRenderingMethod = renderingMethod;
  });
}

/**
 * @param {Array<*>|undefined} collections
 * @param {*} lookup
 */
function setCollectionTileGpuLookup(collections, lookup) {
  forEachCollection(collections, function (collection) {
    collection._vectorTileGpuLookup = lookup;
  });
}

/**
 * @param {Array<*>|undefined} collections
 * @returns {boolean}
 */
function collectionsNeedLookupRebuild(collections) {
  if (!defined(collections)) {
    return false;
  }

  for (let i = 0; i < collections.length; i++) {
    if (collections[i]._dirtyCount > 0) {
      return true;
    }
  }

  return false;
}

/**
 * @param {Array<*>|undefined} collections
 * @returns {boolean}
 */
function hasCollections(collections) {
  return defined(collections) && collections.length > 0;
}

/**
 * @param {Array<*>|undefined} collections
 * @param {*} lookup
 * @param {boolean} modelMatrixDirty
 * @returns {boolean}
 */
function needsTileLookupRebuild(collections, lookup, modelMatrixDirty) {
  return (
    modelMatrixDirty ||
    collectionsNeedLookupRebuild(collections) ||
    (!defined(lookup) && hasCollections(collections))
  );
}

/**
 * @param {*} tile
 * @param {Array<*>|undefined} collections
 * @param {Matrix4} vectorModelMatrix
 * @param {*} currentLookup
 * @param {function(*, Array<*>, Matrix4): *} buildLookup
 * @param {boolean} modelMatrixDirty
 * @returns {*}
 */
function updateTileSurfaceLookup(
  tile,
  collections,
  vectorModelMatrix,
  currentLookup,
  buildLookup,
  modelMatrixDirty,
) {
  if (!needsTileLookupRebuild(collections, currentLookup, modelMatrixDirty)) {
    return currentLookup;
  }

  return buildLookup(tile, collections, vectorModelMatrix);
}

/**
 * @param {VectorGltf3DTileContent} content
 */
function clearTileGpuLookup(content) {
  content._tileSurfacePolylineGpuLookup = undefined;
  content._tileSurfacePolygonGpuLookup = undefined;
  setCollectionTileGpuLookup(content._polylineCollections, undefined);
  setCollectionTileGpuLookup(content._polygonCollections, undefined);
}

/**
 * @param {VectorGltf3DTileContent} content
 * @param {Matrix4} vectorModelMatrix
 */
function updateTileGpuLookup(content, vectorModelMatrix) {
  setCollectionRenderingMethod(
    content._polylineCollections,
    content._tileset._vectorTileRenderingMethod,
  );
  setCollectionRenderingMethod(
    content._polygonCollections,
    content._tileset._vectorTileRenderingMethod,
  );

  if (content._tileset._vectorTileRenderingMethod !== "gpuLookup") {
    clearTileGpuLookup(content);
    return;
  }

  const modelMatrixDirty = !Matrix4.equals(
    content._tileGpuLookupModelMatrix,
    vectorModelMatrix,
  );
  const polylineLookup = updateTileSurfaceLookup(
    content._tile,
    content._polylineCollections,
    vectorModelMatrix,
    content._tileSurfacePolylineGpuLookup,
    buildTileSurfacePolylineGpuLookup,
    modelMatrixDirty,
  );
  const polygonLookup = updateTileSurfaceLookup(
    content._tile,
    content._polygonCollections,
    vectorModelMatrix,
    content._tileSurfacePolygonGpuLookup,
    buildTileSurfacePolygonGpuLookup,
    modelMatrixDirty,
  );

  if (
    polylineLookup !== content._tileSurfacePolylineGpuLookup ||
    polygonLookup !== content._tileSurfacePolygonGpuLookup
  ) {
    Matrix4.clone(vectorModelMatrix, content._tileGpuLookupModelMatrix);
  }

  content._tileSurfacePolylineGpuLookup = polylineLookup;
  content._tileSurfacePolygonGpuLookup = polygonLookup;
  setCollectionTileGpuLookup(
    content._polylineCollections,
    content._tileSurfacePolylineGpuLookup,
  );
  setCollectionTileGpuLookup(
    content._polygonCollections,
    content._tileSurfacePolygonGpuLookup,
  );
}

/**
 * @param {Array<*>|undefined} collections
 * @param {Matrix4} vectorModelMatrix
 * @param {*} frameState
 */
function updateCollectionArray(collections, vectorModelMatrix, frameState) {
  /** @param {*} collection */
  forEachCollection(collections, function (collection) {
    Matrix4.multiplyTransformation(
      vectorModelMatrix,
      collection._vectorLocalModelMatrix,
      collection.modelMatrix,
    );
    collection.update(frameState);
  });
}

/**
 * @param {Array<*>|undefined} collections
 */
function destroyCollectionArray(collections) {
  /** @param {*} collection */
  forEachCollection(collections, function (collection) {
    collection.destroy();
  });
}

/**
 * @param {*} tileset
 * @param {*} tile
 * @param {*} content
 * @param {*} gltf
 * @returns {*}
 */
function makeDecodeModelOptions(tileset, tile, content, gltf) {
  return {
    gltf: gltf,
    basePath: content._resource,
    cull: false,
    releaseGltfJson: true,
    opaquePass: Pass.CESIUM_3D_TILE,
    modelMatrix: tile.computedTransform,
    upAxis: tileset._modelUpAxis,
    forwardAxis: tileset._modelForwardAxis,
    incrementallyLoadTextures: false,
    content: content,
    featureIdLabel: tileset.featureIdLabel,
    instanceFeatureIdLabel: tileset.instanceFeatureIdLabel,
    projectTo2D: tileset._projectTo2D,
    enablePick: tileset._enablePick,
    enableDebugWireframe: tileset._enableDebugWireframe,
    enableShowOutline: false,
  };
}

/**
 * @param {*} content
 */
function initializeVectorPrimitives(content) {
  const model = content._decodeModel;
  if (!defined(model) || !defined(model.sceneGraph)) {
    return;
  }

  const components = model.sceneGraph.components;
  const axisCorrection = ModelUtility.getAxisCorrectionMatrix(
    components.upAxis,
    components.forwardAxis,
    new Matrix4(),
  );
  Matrix4.multiplyTransformation(
    components.transform,
    axisCorrection,
    content._vectorBaseTransform,
  );

  const vectorBuffers = createVectorTileBuffersFromModelComponents(components);
  content._vectorBuffers = vectorBuffers;

  if (!defined(vectorBuffers)) {
    return;
  }

  content._pointCollections = vectorBuffers.points;
  content._polylineCollections = vectorBuffers.polylines;
  content._polygonCollections = vectorBuffers.polygons;

  setCollectionRenderingMethod(content._pointCollections, "collections");
  setCollectionRenderingMethod(
    content._polylineCollections,
    content._tileset._vectorTileRenderingMethod,
  );
  setCollectionRenderingMethod(
    content._polygonCollections,
    content._tileset._vectorTileRenderingMethod,
  );
}

export default VectorGltf3DTileContent;
