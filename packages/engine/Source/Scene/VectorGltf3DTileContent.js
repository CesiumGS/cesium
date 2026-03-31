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
import Color from "../Core/Color.js";
import Matrix4 from "../Core/Matrix4.js";
import Model from "./Model/Model.js";
import ModelUtility from "./Model/ModelUtility.js";
import Pass from "../Renderer/Pass.js";
import createVectorTileBuffersFromModelComponents from "./Model/createVectorTileBuffersFromModelComponents.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";

/** @import BufferPrimitive from "./BufferPrimitive.js"; */
/** @import BufferPrimitiveCollection from "./BufferPrimitiveCollection.js"; */
/** @import Cartesian3 from "../Core/Cartesian3.js"; */
/** @import Cesium3DContentGroup from "./Cesium3DContentGroup.js"; */
/** @import Cesium3DTile from "./Cesium3DTile.js"; */
/** @import Cesium3DTileBatchTable from "./Cesium3DTileBatchTable.js"; */
/** @import Cesium3DTileFeature from "./Cesium3DTileFeature.js"; */
/** @import Cesium3DTileset from "./Cesium3DTileset.js"; */
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
    this._decodeModel = undefined;

    /** @type {Array<BufferPrimitiveCollection<BufferPrimitive>>} */
    this._collections = [];

    /** @type {Array<Matrix4>} */
    this._collectionLocalMatrices = [];

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
    return this._collections.reduce((totalCount, collection) => {
      return totalCount + collection.primitiveCount;
    }, 0);
  }

  get pointsLength() {
    return this._collections
      .filter((collection) => collection instanceof BufferPointCollection)
      .reduce((totalPoints, collection) => {
        return totalPoints + collection.primitiveCount;
      }, 0);
  }

  get trianglesLength() {
    return this._collections
      .filter((collection) => collection instanceof BufferPolygonCollection)
      .reduce((totalPoints, collection) => {
        return totalPoints + collection.triangleCount;
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

  /** @type {Cesium3DTileBatchTable} */
  get batchTable() {
    return undefined;
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
   * @param {number} _featureId
   * @returns {Cesium3DTileFeature}
   */
  getFeature(_featureId) {
    return undefined;
  }

  /**
   * @param {number} _featureId
   * @param {string} _name
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
    color = enabled ? color : Color.WHITE;
    this.applyStyle(new Cesium3DTileStyle({ color }));
  }

  /**
   * @param {*} style
   */
  applyStyle(style) {
    const show = style.show?.evaluate(null) ?? true;
    const color = style.color?.evaluate(null, new Color());

    const isPointCollection = /** @param {unknown} c */ (c) =>
      c instanceof BufferPointCollection;
    const isPolylineCollection = /** @param {unknown} c */ (c) =>
      c instanceof BufferPolylineCollection;
    const isPolygonCollection = /** @param {unknown} c */ (c) =>
      c instanceof BufferPolygonCollection;

    Color.clone(color, pointMaterial.color);
    pointMaterial.size = style.pointSize?.evaluate(null);
    pointMaterial.outlineWidth = style.pointOutlineWidth?.evaluate(null);
    style.pointOutlineColor?.evaluate(null, pointMaterial.outlineColor);
    for (const collection of this._collections.filter(isPointCollection)) {
      for (let i = 0, il = collection.primitiveCount; i < il; i++) {
        collection.get(i, point);
        point.show = show;
        point.setMaterial(pointMaterial);
      }
    }

    Color.clone(color, polylineMaterial.color);
    polylineMaterial.width = style.lineWidth?.evaluate(null) ?? 1;
    for (const collection of this._collections.filter(isPolylineCollection)) {
      for (let i = 0, il = collection.primitiveCount; i < il; i++) {
        collection.get(i, polyline);
        polyline.show = show;
        polyline.setMaterial(polylineMaterial);
      }
    }

    Color.clone(color, polygonMaterial.color);
    for (const collection of this._collections.filter(isPolygonCollection)) {
      for (let i = 0, il = collection.primitiveCount; i < il; i++) {
        collection.get(i, polygon);
        polygon.show = show;
        polygon.setMaterial(polygonMaterial);
      }
    }
  }

  /**
   * @param {Cesium3DTileset} _tileset
   * @param {FrameState} frameState
   */
  update(_tileset, frameState) {
    if (defined(this._decodeModel) && !this._ready) {
      const model = this._decodeModel;
      model.modelMatrix = this._tile.computedTransform;
      model.update(frameState);

      // @ts-expect-error Requires Model conversion to ES6 class.
      if (model.ready) {
        initializeVectorPrimitives(this);
        if (this._decodeModel) {
          this._decodeModel.destroy();
          this._decodeModel = undefined;
        }
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
    this._decodeModel?.destroy();
    this._decodeModel = undefined;
    this._collections.forEach((collection) => collection.destroy());
    this._collections.length = 0;
    return destroyObject(this);
  }

  /**
   * @param {Cesium3DTileset} tileset
   * @param {Cesium3DTile} tile
   * @param {Resource} resource
   * @param {unknown} gltf
   * @returns {Promise<VectorGltf3DTileContent>}
   */
  static async fromGltf(tileset, tile, resource, gltf) {
    const content = new VectorGltf3DTileContent(tileset, tile, resource);
    const modelOptions = makeDecodeModelOptions(tileset, tile, content, gltf);
    const decodeModel = await Model.fromGltfAsync(modelOptions);
    // @ts-expect-error Requires Model conversion to ES6 class.
    decodeModel.show = false;
    content._decodeModel = decodeModel;
    return content;
  }
}

/**
 * @param {Cesium3DTileset} tileset
 * @param {Cesium3DTile} tile
 * @param {VectorGltf3DTileContent} content
 * @param {unknown} gltf
 * @returns {*}
 * @ignore
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
  const components = content._decodeModel.sceneGraph.components;

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

  const result = createVectorTileBuffersFromModelComponents(this, components);

  content._collections = result.collections;
  content._collectionLocalMatrices = result.collectionLocalMatrices;
}

export default VectorGltf3DTileContent;
