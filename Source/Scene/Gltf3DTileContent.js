import Cartesian3 from "../Core/Cartesian3.js";
import clone from "../Core/clone.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import destroyObject from "../Core/destroyObject.js";
import Matrix3 from "../Core/Matrix3.js";
import Quaternion from "../Core/Quaternion.js";
import InnerGltf3DTileContent from "./InnerGltf3DTileContent.js";
import Instanced3DModel3DTileContent from "./Instanced3DModel3DTileContent.js";
import MetadataSchema from "./MetadataSchema.js";
import MetadataType from "./MetadataType.js";
import parseFeatureMetadata from "./parseFeatureMetadata.js";
import parseGlb from "../ThirdParty/GltfPipeline/parseGlb.js";
import removeExtensionsRequired from "../ThirdParty/GltfPipeline/removeExtensionsRequired.js";
import removeExtensionsUsed from "../ThirdParty/GltfPipeline/removeExtensionsUsed.js";
import removeUnusedElements from "../ThirdParty/GltfPipeline/removeUnusedElements.js";
import when from "../ThirdParty/when.js";

/**
 * Represents the contents of a glTF or glb tile in a {@link https://github.com/CesiumGS/3d-tiles/tree/master/specification|3D Tiles} tileset using the {@link https://github.com/CesiumGS/3d-tiles/tree/3d-tiles-next/extensions/3DTILES_content_gltf/0.0.0|3DTILES_content_gltf} extension.
 * <p>
 * Implements the {@link Cesium3DTileContent} interface.
 * </p>
 *
 * @alias Gltf3DTileContent
 * @constructor
 *
 * @private
 */
function Gltf3DTileContent(tileset, tile, resource, gltf) {
  this._tileset = tileset;
  this._tile = tile;
  this._resource = resource;
  this._contents = [];
  this._readyPromise = when.defer();

  initialize(this, gltf);
}

Object.defineProperties(Gltf3DTileContent.prototype, {
  featurePropertiesDirty: {
    get: function () {
      var contents = this._contents;
      var length = contents.length;
      for (var i = 0; i < length; ++i) {
        if (contents[i].featurePropertiesDirty) {
          return true;
        }
      }

      return false;
    },
    set: function (value) {
      var contents = this._contents;
      var length = contents.length;
      for (var i = 0; i < length; ++i) {
        contents[i].featurePropertiesDirty = value;
      }
    },
  },
  featuresLength: {
    get: function () {
      return 0;
    },
  },

  pointsLength: {
    get: function () {
      return 0;
    },
  },

  trianglesLength: {
    get: function () {
      return 0;
    },
  },

  geometryByteLength: {
    get: function () {
      return 0;
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
      return this._contents;
    },
  },

  readyPromise: {
    get: function () {
      return this._readyPromise.promise;
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
});

function getNumberOfComponents(type) {
  switch (type) {
    case "SCALAR":
      return 1;
    case "VEC2":
      return 2;
    case "VEC3":
      return 3;
    case "VEC4":
      return 4;
    case "MAT2":
      return 4;
    case "MAT3":
      return 9;
    case "MAT4":
      return 16;
  }
}

function getBufferViewData(gltf, bufferViewId, buffer) {
  var bufferView = gltf.bufferViews[bufferViewId];
  var byteOffset = defaultValue(bufferView.byteOffset, 0);
  var byteLength = bufferView.byteLength;
  return new Uint8Array(
    buffer.buffer,
    buffer.byteOffset + byteOffset,
    byteLength
  );
}

function getAccessorData(gltf, accessorId, buffer) {
  var accessor = gltf.accessors[accessorId];
  var bufferViewData = getBufferViewData(gltf, accessor.bufferView, buffer);
  var accessorByteOffset = defaultValue(accessor.byteOffset, 0);

  var byteOffset = bufferViewData.byteOffset + accessorByteOffset;
  var componentType = accessor.componentType;
  var type = accessor.type;
  var count = accessor.count;

  var componentCount = getNumberOfComponents(type);
  var length = count * componentCount;

  return ComponentDatatype.createArrayBufferView(
    componentType,
    bufferViewData.buffer,
    byteOffset,
    length
  );
}

function getPadding(byteLength, boundary, byteOffset) {
  byteOffset = defaultValue(byteOffset, 0);
  var remainder = (byteOffset + byteLength) % boundary;
  var padding = remainder === 0 ? 0 : boundary - remainder;
  return padding;
}

function createBatchTable(gltf, featureTableId, buffer) {
  var bufferViewsLength = gltf.bufferViews.length;
  var bufferViews = {};

  var i;
  for (i = 0; i < bufferViewsLength; ++i) {
    bufferViews[i] = getBufferViewData(gltf, i, buffer);
  }

  var extension = gltf.extensions.EXT_feature_metadata;
  var metadata = parseFeatureMetadata({
    extension: extension,
    schema: new MetadataSchema(extension.schema),
    bufferViews: bufferViews,
  });

  var featureTables = metadata._featureTables;
  var featureTable = featureTables[featureTableId];

  if (!defined(featureTable.class)) {
    return;
  }

  var count = featureTable.count;
  var batchTableJson = {};
  var classProperties = featureTable.class.properties;
  for (var propertyId in classProperties) {
    if (classProperties.hasOwnProperty(propertyId)) {
      var values = new Array(count);
      for (i = 0; i < count; ++i) {
        values[i] = featureTable.getProperty(i, propertyId);
      }
      batchTableJson[propertyId] = values;
    }
  }

  var batchTableBinaryByteLength = 0;

  var batchTableJsonString = JSON.stringify(batchTableJson);
  var textEncoder = new TextEncoder(); // TODO: not available in IE
  var batchTableJsonBuffer = textEncoder.encode(batchTableJsonString);

  var batchTableJsonByteLength = batchTableJsonBuffer.byteLength;

  var batchTableJsonPadding = getPadding(batchTableJsonByteLength, 8);
  var batchTableBinaryPadding = getPadding(batchTableBinaryByteLength, 8);

  var byteLength =
    batchTableJsonByteLength +
    batchTableJsonPadding +
    batchTableBinaryByteLength +
    batchTableBinaryPadding;

  var batchTableBuffer = new Uint8Array(byteLength);

  var byteOffset = 0;
  batchTableBuffer.set(batchTableJsonBuffer, byteOffset);
  byteOffset += batchTableJsonByteLength;

  for (i = 0; i < batchTableJsonPadding; ++i) {
    batchTableBuffer[byteOffset++] = 32; // Add space characters to end of JSON chunk
  }

  return {
    buffer: batchTableBuffer,
    jsonByteLength: batchTableJsonByteLength + batchTableJsonPadding,
    binaryByteLength: batchTableBinaryByteLength + batchTableBinaryPadding,
    batchLength: count,
  };
}

function makeNodeEmpty(gltf, nodeId) {
  // Make a node empty to trigger removeUnusedElements
  var node = gltf.nodes[nodeId];
  delete node.mesh;
  delete node.camera;
  delete node.skin;
  delete node.weights;
  delete node.extras;
  delete node.extensions;
}

function removeNodesRecursive(gltf, nodes, callback) {
  // A leaf node is removed if callback returns true
  // In interior node is removed if all its children have been removed
  var removeCount = 0;
  var nodesLength = nodes.length;
  for (var i = 0; i < nodesLength; ++i) {
    var nodeId = nodes[i];

    var node = gltf.nodes[nodeId];
    if (defined(node.children) && node.children.length > 0) {
      removeNodesRecursive(gltf, node.children, callback);
      if (node.children.length === 0) {
        ++removeCount;
        makeNodeEmpty(gltf, nodeId);
        continue;
      }
    } else if (callback(gltf, nodeId)) {
      ++removeCount;
      makeNodeEmpty(gltf, nodeId);
      continue;
    }

    if (removeCount > 0) {
      nodes[i - removeCount] = nodeId;
    }
  }

  nodes.length -= removeCount;
}

function getSceneNodes(gltf) {
  var defaultScene = defaultValue(gltf.scene, 0);
  var scene = gltf.scenes[defaultScene];
  var nodes = scene.nodes;
  return nodes;
}

function removeNodes(gltf, callback) {
  if (defined(gltf.scenes)) {
    var nodes = getSceneNodes(gltf);
    if (defined(nodes)) {
      removeNodesRecursive(gltf, nodes, callback);
    }
  }
  removeUnusedElements(gltf, [
    "node",
    "mesh",
    "material",
    "texture",
    "sampler",
    "image",
    "accessor",
    // TODO: this will also remove bufferViews referenced by EXT_feature_metadata
    // since gltf-pipeline doesn't have knowledge of that extension
    "bufferView",
    "buffer",
  ]);
}

function gltfToGlb(gltf, buffer) {
  var i;
  var binaryByteLength = buffer.byteLength;

  var jsonString = JSON.stringify(gltf);
  var jsonTextEncoder = new TextEncoder(); // TODO: not available in IE
  var jsonBuffer = jsonTextEncoder.encode(jsonString);
  var jsonByteLength = jsonBuffer.byteLength;

  var jsonPadding = getPadding(jsonByteLength, 8, 12); // End on 8-byte boundary relative to whole glb
  var binaryPadding = getPadding(binaryByteLength, 8); // End on 8-byte boundary relative to whole glb

  // Compute glb length: (Global header) + (JSON chunk header) + (JSON chunk) + (Binary chunk header) + (Binary chunk)
  var glbByteLength =
    12 +
    8 +
    jsonByteLength +
    jsonPadding +
    8 +
    binaryByteLength +
    binaryPadding;

  var glb = new Uint8Array(glbByteLength);
  var dataView = new DataView(glb.buffer);

  // Write binary glTF header (magic, version, length)
  var byteOffset = 0;
  dataView.setUint32(byteOffset, 0x46546c67, true);
  byteOffset += 4;
  dataView.setUint32(byteOffset, 2, true);
  byteOffset += 4;
  dataView.setUint32(byteOffset, glbByteLength, true);
  byteOffset += 4;

  // Write JSON Chunk header (length, type)
  dataView.setUint32(byteOffset, jsonByteLength + jsonPadding, true);
  byteOffset += 4;
  dataView.setUint32(byteOffset, 0x4e4f534a, true); // JSON
  byteOffset += 4;

  glb.set(jsonBuffer, byteOffset);
  byteOffset += jsonByteLength;

  // Add space characters to end of JSON chunk
  for (i = 0; i < jsonPadding; ++i) {
    glb[byteOffset++] = 32;
  }

  // Write Binary Chunk header (length, type)
  dataView.setUint32(byteOffset, binaryByteLength + binaryPadding, true);
  byteOffset += 4;
  dataView.setUint32(byteOffset, 0x004e4942, true); // BIN
  byteOffset += 4;

  glb.set(buffer, byteOffset);
  byteOffset += binaryByteLength;

  // Add 0's to end of binary chunk
  for (i = 0; i < binaryPadding; ++i) {
    glb[byteOffset++] = 0;
  }

  return glb;
}

function createFeatureTable(properties, instancesLength, rtcCenter) {
  var featureTableJson = {};

  var propertiesLength = properties.length;
  var featureTableBuffers = new Array(propertiesLength);
  var featureTableByteOffsets = new Array(propertiesLength);
  var byteOffset = 0;
  var i;

  for (i = 0; i < propertiesLength; ++i) {
    var property = properties[i];
    var name = property.name;
    var typedArray = property.typedArray;
    var hasComponentType = property.hasComponentType;
    var propertyBuffer = new Uint8Array(
      typedArray.buffer,
      typedArray.byteOffset,
      typedArray.byteLength
    );
    var componentDatatype = ComponentDatatype.fromTypedArray(typedArray);
    var componentType = ComponentDatatype.getName(componentDatatype);
    var boundary = ComponentDatatype.getSizeInBytes(componentDatatype);
    var padding = getPadding(0, boundary, byteOffset);
    byteOffset += padding;
    featureTableBuffers[i] = propertyBuffer;
    featureTableByteOffsets[i] = byteOffset;
    var featureTableProperty = {
      byteOffset: byteOffset,
    };
    if (hasComponentType) {
      featureTableProperty.componentType = componentType;
    }
    featureTableJson[name] = featureTableProperty;
    byteOffset += propertyBuffer.byteLength;
  }

  featureTableJson.INSTANCES_LENGTH = instancesLength;
  featureTableJson.RTC_CENTER = rtcCenter;

  var featureTableBinaryByteLength = byteOffset;

  var featureTableJsonString = JSON.stringify(featureTableJson);
  var textEncoder = new TextEncoder(); // TODO: not available in IE
  var featureTableJsonBuffer = textEncoder.encode(featureTableJsonString);
  var featureTableJsonByteLength = featureTableJsonBuffer.byteLength;

  var featureTableJsonPadding = getPadding(featureTableJsonByteLength, 8);
  var featureTableBinaryPadding = getPadding(featureTableBinaryByteLength, 8);

  var byteLength =
    featureTableJsonByteLength +
    featureTableJsonPadding +
    featureTableBinaryByteLength +
    featureTableBinaryPadding;

  var featureTableBuffer = new Uint8Array(byteLength);

  byteOffset = 0;
  featureTableBuffer.set(featureTableJsonBuffer, byteOffset);
  byteOffset += featureTableJsonByteLength;

  for (i = 0; i < featureTableJsonPadding; ++i) {
    featureTableBuffer[byteOffset++] = 32; // Add space characters to end of JSON chunk
  }

  for (i = 0; i < propertiesLength; ++i) {
    featureTableBuffer.set(
      featureTableBuffers[i],
      byteOffset + featureTableByteOffsets[i]
    );
  }
  byteOffset += featureTableBinaryByteLength;

  for (i = 0; i < featureTableBinaryPadding; ++i) {
    featureTableBuffer[byteOffset++] = 0; // Add 0's to end of binary chunk
  }

  return {
    buffer: featureTableBuffer,
    jsonByteLength: featureTableJsonByteLength + featureTableJsonPadding,
    binaryByteLength: featureTableBinaryByteLength + featureTableBinaryPadding,
  };
}

function getInstancePositions(gltf, translationAccessorId, buffer) {
  return getAccessorData(gltf, translationAccessorId, buffer);
}

var scratchQuaternion = new Quaternion();
var scratchRotation = new Matrix3();
var scratchNormalUp = new Cartesian3();
var scratchNormalRight = new Cartesian3();

function getInstanceNormals(gltf, rotationAccessorId, buffer) {
  var quaternions = getAccessorData(gltf, rotationAccessorId, buffer);
  var length = quaternions.length / 4;

  var normalized = false;
  var type = MetadataType.FLOAT32;
  var componentDatatype = ComponentDatatype.fromTypedArray(quaternions);
  if (componentDatatype === ComponentDatatype.BYTE) {
    normalized = true;
    type = MetadataType.INT8;
  } else if (componentDatatype === ComponentDatatype.SHORT) {
    normalized = true;
    type = MetadataType.INT16;
  }

  var normalUps = new Float32Array(length * 3);
  var normalRights = new Float32Array(length * 3);

  for (var i = 0; i < length; ++i) {
    var quaternion = Quaternion.unpack(quaternions, i * 4, scratchQuaternion);
    if (normalized) {
      quaternion.x = MetadataType.normalize(quaternion.x, type);
      quaternion.y = MetadataType.normalize(quaternion.y, type);
      quaternion.z = MetadataType.normalize(quaternion.z, type);
      quaternion.w = MetadataType.normalize(quaternion.w, type);
    }
    var rotationMatrix = Matrix3.fromQuaternion(quaternion, scratchRotation);
    var normalUp = Cartesian3.normalize(
      Matrix3.getColumn(rotationMatrix, 1, scratchNormalUp),
      scratchNormalUp
    );
    var normalRight = Cartesian3.normalize(
      Matrix3.getColumn(rotationMatrix, 0, scratchNormalRight),
      scratchNormalRight
    );
    Cartesian3.pack(normalUp, normalUps, i * 3);
    Cartesian3.pack(normalRight, normalRights, i * 3);
  }

  return {
    normalUps: normalUps,
    normalRights: normalRights,
  };
}

function getInstanceScales(gltf, scaleAccessorId, buffer) {
  return getAccessorData(gltf, scaleAccessorId, buffer);
}

function getInstanceBatchIds(gltf, featureIdAccessorId, buffer) {
  var batchIds = getAccessorData(gltf, featureIdAccessorId, buffer);
  var componentDatatype = ComponentDatatype.fromTypedArray(batchIds);
  if (
    componentDatatype !== ComponentDatatype.UNSIGNED_BYTE &&
    componentDatatype !== ComponentDatatype.UNSIGNED_SHORT &&
    componentDatatype !== ComponentDatatype.UNSIGNED_INT
  ) {
    batchIds = new Uint32Array(batchIds);
  }
  return batchIds;
}

function removeExtension(element, extensionName) {
  if (defined(element.extensions)) {
    delete element.extensions[extensionName];
    if (Object.keys(element.extensions).length === 0) {
      delete element.extensions;
    }
  }
}

function createInstanced3DModel(content, gltf, instancedNodeId, buffer) {
  var node = gltf.nodes[instancedNodeId];
  var extension = node.extensions.EXT_mesh_gpu_instancing;
  var attributes = extension.attributes;
  var translationAccessorId = attributes.TRANSLATION;
  var rotationAccessorId = attributes.ROTATION;
  var scaleAccessorId = attributes.SCALE;
  var featureIdAccessorId = attributes._FEATURE_ID_0;

  var featureTableProperties = [];
  var instancesLength;

  if (defined(translationAccessorId)) {
    var positions = getInstancePositions(gltf, translationAccessorId, buffer);
    featureTableProperties.push({
      name: "POSITION",
      typedArray: positions,
      hasComponentType: false,
    });
    instancesLength = positions.length / 3;
  }
  if (defined(rotationAccessorId)) {
    var normals = getInstanceNormals(gltf, rotationAccessorId, buffer);
    var normalUps = normals.normalUps;
    var normalRights = normals.normalRights;
    featureTableProperties.push({
      name: "NORMAL_UP",
      typedArray: normalUps,
      hasComponentType: false,
    });
    featureTableProperties.push({
      name: "NORMAL_RIGHT",
      typedArray: normalRights,
      hasComponentType: false,
    });
  }
  if (defined(scaleAccessorId)) {
    var scales = getInstanceScales(gltf, scaleAccessorId, buffer);
    featureTableProperties.push({
      name: "SCALE_NON_UNIFORM",
      typedArray: scales,
      hasComponentType: false,
    });
  }
  if (defined(featureIdAccessorId)) {
    var batchIds = getInstanceBatchIds(gltf, featureIdAccessorId, buffer);
    featureTableProperties.push({
      name: "BATCH_ID",
      typedArray: batchIds,
      hasComponentType: true,
    });
  }

  var batchTableBuffer = new Uint8Array(0);
  var batchTableJsonByteLength = 0;
  var batchTableBinaryByteLength = 0;

  var extensions = extension.extensions;
  if (
    defined(extensions) &&
    defined(extensions.EXT_feature_metadata) &&
    defined(extensions.EXT_feature_metadata.featureIdAttributes)
  ) {
    var featureMetadata = extensions.EXT_feature_metadata;
    var featureTableId = featureMetadata.featureIdAttributes[0].featureTable;
    var batchTableResults = createBatchTable(gltf, featureTableId, buffer);
    batchTableBuffer = batchTableResults.buffer;
    batchTableJsonByteLength = batchTableResults.jsonByteLength;
    batchTableBinaryByteLength = batchTableResults.binaryByteLength;
  }

  var rtcCenter = gltf.nodes[instancedNodeId].translation;

  var featureTableResults = createFeatureTable(
    featureTableProperties,
    instancesLength,
    rtcCenter
  );
  var featureTableBuffer = featureTableResults.buffer;
  var featureTableJsonByteLength = featureTableResults.jsonByteLength;
  var featureTableBinaryByteLength = featureTableResults.binaryByteLength;

  gltf = clone(gltf, true);
  node = gltf.nodes[instancedNodeId];

  delete gltf.nodes[instancedNodeId].translation;

  // Remove nodes that don't have instancedNodeId as a descendant
  removeNodes(gltf, function (gltf, nodeId) {
    return nodeId !== instancedNodeId;
  });

  removeExtension(node, "EXT_mesh_gpu_instancing");
  removeExtension(gltf, "EXT_feature_metadata");

  removeExtensionsRequired(gltf, "EXT_mesh_gpu_instancing");
  removeExtensionsUsed(gltf, "EXT_mesh_gpu_instancing");
  removeExtensionsUsed(gltf, "EXT_feature_metadata");

  var glb = gltfToGlb(gltf, buffer);

  var headerByteLength = 32;
  var byteLength =
    headerByteLength +
    featureTableBuffer.byteLength +
    batchTableBuffer.byteLength +
    glb.byteLength;

  var i3dm = new Uint8Array(byteLength);
  var dataView = new DataView(i3dm.buffer);
  dataView.setUint8(0, 105); // i
  dataView.setUint8(1, 51); // 3
  dataView.setUint8(2, 100); // d
  dataView.setUint8(3, 109); // m
  dataView.setUint32(4, 1, true); // version 1
  dataView.setUint32(8, byteLength, true);
  dataView.setUint32(12, featureTableJsonByteLength, true);
  dataView.setUint32(16, featureTableBinaryByteLength, true);
  dataView.setUint32(20, batchTableJsonByteLength, true);
  dataView.setUint32(24, batchTableBinaryByteLength, true);
  dataView.setUint32(28, 1, true); // embedded glb

  var byteOffset = headerByteLength;
  i3dm.set(featureTableBuffer, byteOffset);
  byteOffset += featureTableBuffer.byteLength;
  i3dm.set(batchTableBuffer, byteOffset);
  byteOffset += batchTableBuffer.byteLength;
  i3dm.set(glb, byteOffset);

  return new Instanced3DModel3DTileContent(
    content._tileset,
    content._tile,
    content._resource,
    i3dm.buffer,
    i3dm.byteOffset
  );
}

function isNodeInstanced(gltf, nodeId) {
  var node = gltf.nodes[nodeId];
  if (
    defined(node.extensions) &&
    defined(node.extensions.EXT_mesh_gpu_instancing)
  ) {
    return true;
  }
  return false;
}

function createInnerGltfContent(content, gltf, buffer) {
  // TODO: might not work if there are multiple non-instanced feature tables
  gltf = clone(gltf, true);

  // Remove instanced nodes
  removeNodes(gltf, isNodeInstanced);

  if (!defined(gltf.nodes) || gltf.nodes.length === 0) {
    return undefined;
  }

  removeExtensionsRequired(gltf, "EXT_mesh_gpu_instancing");
  removeExtensionsUsed(gltf, "EXT_mesh_gpu_instancing");

  var glb = gltfToGlb(gltf, buffer);
  return new InnerGltf3DTileContent(
    content._tileset,
    content._tile,
    content._resource,
    glb
  );
}

function initialize(content, gltf) {
  if (gltf instanceof Uint8Array) {
    gltf = parseGlb(gltf);
  }

  var instancedNodeIds = [];
  var nodes = gltf.nodes;
  if (defined(nodes)) {
    var nodesLength = nodes.length;
    for (var nodeId = 0; nodeId < nodesLength; ++nodeId) {
      if (isNodeInstanced(gltf, nodeId)) {
        instancedNodeIds.push(nodeId);
      }
    }
  }

  var instancedNodesLength = instancedNodeIds.length;

  var buffer = gltf.buffers[0].extras._pipeline.source;
  delete gltf.buffers[0].extras;

  var innerContents = [];

  for (var i = 0; i < instancedNodesLength; ++i) {
    var instancedNodeId = instancedNodeIds[i];
    var i3dmContent = createInstanced3DModel(
      content,
      gltf,
      instancedNodeId,
      buffer
    );
    innerContents.push(i3dmContent);
  }
  var innerGltfContent = createInnerGltfContent(content, gltf, buffer);
  if (defined(innerGltfContent)) {
    innerContents.push(innerGltfContent);
  }

  content._contents = innerContents;
  var contentPromises = innerContents.map(function (innerContent) {
    return innerContent.readyPromise;
  });

  when
    .all(contentPromises)
    .then(function () {
      content._readyPromise.resolve(content);
    })
    .otherwise(function (error) {
      content._readyPromise.reject(error);
    });
}

Gltf3DTileContent.prototype.hasProperty = function (batchId, name) {
  return false;
};

Gltf3DTileContent.prototype.getFeature = function (batchId) {
  return undefined;
};

Gltf3DTileContent.prototype.applyDebugSettings = function (enabled, color) {
  var contents = this._contents;
  var length = contents.length;
  for (var i = 0; i < length; ++i) {
    contents[i].applyDebugSettings(enabled, color);
  }
};

Gltf3DTileContent.prototype.applyStyle = function (style) {
  var contents = this._contents;
  var length = contents.length;
  for (var i = 0; i < length; ++i) {
    contents[i].applyStyle(style);
  }
};

Gltf3DTileContent.prototype.update = function (tileset, frameState) {
  var contents = this._contents;
  var length = contents.length;
  for (var i = 0; i < length; ++i) {
    contents[i].update(tileset, frameState);
  }
};

Gltf3DTileContent.prototype.isDestroyed = function () {
  return false;
};

Gltf3DTileContent.prototype.destroy = function () {
  var contents = this._contents;
  var length = contents.length;
  for (var i = 0; i < length; ++i) {
    contents[i].destroy();
  }
  return destroyObject(this);
};

export default Gltf3DTileContent;
