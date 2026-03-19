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

/**
 * Vector glTF tile content. This path decodes glTF primitives into vector
 * buffers, then renders with dedicated vector primitives.
 *
 * @alias VectorGltf3DTileContent
 * @constructor
 *
 * @private
 */
function VectorGltf3DTileContent(tileset, tile, resource) {
  this._tileset = tileset;
  this._tile = tile;
  this._resource = resource;

  this._decodeModel = undefined;

  this._vectorBuffers = undefined;
  this._pointCollections = undefined;
  this._polylineCollections = undefined;
  this._polygonCollections = undefined;

  this._metadata = undefined;
  this._group = undefined;

  this.featurePropertiesDirty = false;
  this._ready = false;

  this._vectorBaseTransform = Matrix4.clone(Matrix4.IDENTITY);
  this._computedVectorModelMatrix = Matrix4.clone(Matrix4.IDENTITY);
}

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

function forEachCollection(collections, callback) {
  if (!defined(collections)) {
    return;
  }

  for (let i = 0; i < collections.length; i++) {
    callback(collections[i], i);
  }
}

function updateCollectionArray(collections, vectorModelMatrix, frameState) {
  forEachCollection(collections, function (collection) {
    Matrix4.multiplyTransformation(
      vectorModelMatrix,
      collection._vectorLocalModelMatrix,
      collection.modelMatrix,
    );
    collection.update(frameState);
  });
}

Object.defineProperties(VectorGltf3DTileContent.prototype, {
  featuresLength: {
    get: function () {
      if (!defined(this._vectorBuffers)) {
        return 0;
      }

      return (
        sumCollectionProperty(this._vectorBuffers.points, "primitiveCount") +
        sumCollectionProperty(this._vectorBuffers.polylines, "primitiveCount") +
        sumCollectionProperty(this._vectorBuffers.polygons, "primitiveCount")
      );
    },
  },

  pointsLength: {
    get: function () {
      if (
        !defined(this._vectorBuffers) ||
        !defined(this._vectorBuffers.points)
      ) {
        return 0;
      }
      return sumCollectionProperty(
        this._vectorBuffers.points,
        "primitiveCount",
      );
    },
  },

  trianglesLength: {
    get: function () {
      if (
        !defined(this._vectorBuffers) ||
        !defined(this._vectorBuffers.polygons)
      ) {
        return 0;
      }
      return sumCollectionProperty(
        this._vectorBuffers.polygons,
        "triangleCount",
      );
    },
  },

  geometryByteLength: {
    get: function () {
      if (!defined(this._vectorBuffers)) {
        return 0;
      }

      return (
        sumCollectionProperty(this._vectorBuffers.points, "byteLength") +
        sumCollectionProperty(this._vectorBuffers.polylines, "byteLength") +
        sumCollectionProperty(this._vectorBuffers.polygons, "byteLength")
      );
    },
  },

  texturesByteLength: {
    get: function () {
      return 0;
    },
  },

  batchTableByteLength: {
    get: function () {
      return 0;
    },
  },

  innerContents: {
    get: function () {
      return undefined;
    },
  },

  ready: {
    get: function () {
      return this._ready;
    },
  },

  tileset: {
    get: function () {
      return this._tileset;
    },
  },

  tile: {
    get: function () {
      return this._tile;
    },
  },

  url: {
    get: function () {
      return this._resource.getUrlComponent(true);
    },
  },

  batchTable: {
    get: function () {
      return undefined;
    },
  },

  metadata: {
    get: function () {
      return this._metadata;
    },
    set: function (value) {
      this._metadata = value;
    },
  },

  group: {
    get: function () {
      return this._group;
    },
    set: function (value) {
      this._group = value;
    },
  },
});

VectorGltf3DTileContent.prototype.getExtension = function (extensionName) {
  if (extensionName === "CESIUM_mesh_vector") {
    return this._vectorBuffers;
  }
  return undefined;
};

VectorGltf3DTileContent.prototype.getFeature = function (featureId) {
  void featureId;
  return undefined;
};

VectorGltf3DTileContent.prototype.hasProperty = function (featureId, name) {
  void featureId;
  void name;
  return false;
};

VectorGltf3DTileContent.prototype.applyDebugSettings = function (
  enabled,
  color,
) {
  if (!defined(this._vectorBuffers)) {
    return;
  }

  forEachCollection(this._vectorBuffers.points, function (points) {
    const point = new BufferPoint();
    for (let i = 0; i < points.primitiveCount; i++) {
      points.get(i, point);
      point.setColor(enabled ? color : Color.WHITE);
    }
  });

  forEachCollection(this._vectorBuffers.polylines, function (polylines) {
    const polyline = new BufferPolyline();
    for (let i = 0; i < polylines.primitiveCount; i++) {
      polylines.get(i, polyline);
      polyline.setColor(enabled ? color : Color.WHITE);
    }
  });

  forEachCollection(this._vectorBuffers.polygons, function (polygons) {
    const polygon = new BufferPolygon();
    for (let i = 0; i < polygons.primitiveCount; i++) {
      polygons.get(i, polygon);
      polygon.setColor(enabled ? color : Color.WHITE);
    }
  });
};

VectorGltf3DTileContent.prototype.applyStyle = function (style) {
  void style;
};

VectorGltf3DTileContent.prototype.update = function (tileset, frameState) {
  void tileset;

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

  updateCollectionArray(this._pointCollections, vectorModelMatrix, frameState);
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
};

VectorGltf3DTileContent.prototype.pick = function (ray, frameState, result) {
  void ray;
  void frameState;
  void result;
  return undefined;
};

VectorGltf3DTileContent.prototype.isDestroyed = function () {
  return false;
};

VectorGltf3DTileContent.prototype.destroy = function () {
  this._decodeModel = this._decodeModel && this._decodeModel.destroy();
  this._pointCollections = undefined;
  this._polylineCollections = undefined;
  this._polygonCollections = undefined;
  this._vectorBuffers = undefined;
  return destroyObject(this);
};

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
}

VectorGltf3DTileContent.fromGltf = async function (
  tileset,
  tile,
  resource,
  gltf,
) {
  const content = new VectorGltf3DTileContent(tileset, tile, resource);
  const modelOptions = makeDecodeModelOptions(tileset, tile, content, gltf);
  const decodeModel = await Model.fromGltfAsync(modelOptions);
  decodeModel.show = false;
  content._decodeModel = decodeModel;
  return content;
};

export default VectorGltf3DTileContent;
