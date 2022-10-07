import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import defaultValue from "../Core/defaultValue.js";
import defer from "../Core/defer.js";
import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import HeadingPitchRoll from "../Core/HeadingPitchRoll.js";
import CesiumMath from "../Core/Math.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import Resource from "../Core/Resource.js";
import Quaternion from "../Core/Quaternion.js";
import Transforms from "../Core/Transforms.js";
import Cesium3DTile from "./Cesium3DTile.js";
import I3SFeature from "./I3SFeature.js";

/**
 * This class implements an I3S Node, in Cesium, each I3SNode
 * creates a Cesium3DTile
 * <p>
 * Do not construct this directly, instead access tiles through {@link I3SDataProvider}.
 * </p>
 * @alias I3SNode
 * @internalConstructor
 */
function I3SNode(parent, ref, isRoot) {
  let level;
  let layer;
  let nodeIndex;
  let resource;

  if (isRoot) {
    level = 0;
    layer = parent;
  } else {
    level = parent._level + 1;
    layer = parent._layer;
  }

  if (typeof ref === "number") {
    nodeIndex = ref;
  } else {
    resource = parent.resource.getDerivedResource({
      url: `${ref}/`,
    });
  }

  this._parent = parent;
  this._dataProvider = parent._dataProvider;
  this._isRoot = isRoot;
  this._level = level;
  this._layer = layer;
  this._nodeIndex = nodeIndex;
  this._resource = resource;

  this._tile = undefined;
  this._data = undefined;
  this._geometryData = [];
  this._featureData = [];
  this._fields = {};
  this._children = [];
  this._childrenReadyPromise = undefined;
  this._globalTransform = undefined;
  this._inverseGlobalTransform = undefined;
  this._inverseRotationMatrix = undefined;
}

Object.defineProperties(I3SNode.prototype, {
  /**
   * Gets the resource for the node.
   * @memberof I3SNode.prototype
   * @type {Resource}
   * @readonly
   */
  resource: {
    get: function () {
      return this._resource;
    },
  },
  /**
   * Gets the parent layer.
   * @memberof I3SNode.prototype
   * @type {I3SLayer}
   * @readonly
   */
  layer: {
    get: function () {
      return this._layer;
    },
  },
  /**
   * Gets the parent node.
   * @memberof I3SNode.prototype
   * @type {I3SNode|undefined}
   * @readonly
   */
  parent: {
    get: function () {
      return this._parent;
    },
  },
  /**
   * Gets the children nodes.
   * @memberof I3SNode.prototype
   * @type {I3SNode[]}
   * @readonly
   */
  children: {
    get: function () {
      return this._children;
    },
  },
  /**
   * Gets the collection of geometries.
   * @memberof I3SNode.prototype
   * @type {I3SGeometry[]}
   * @readonly
   */
  geometryData: {
    get: function () {
      return this._geometryData;
    },
  },
  /**
   * Gets the collection of features.
   * @memberof I3SNode.prototype
   * @type {I3SFeature[]}
   * @readonly
   */
  featureData: {
    get: function () {
      return this._featureData;
    },
  },
  /**
   * Gets the collection of fields.
   * @memberof I3SNode.prototype
   * @type {I3SField[]}
   * @readonly
   */
  fields: {
    get: function () {
      return this._fields;
    },
  },
  /**
   * Gets the Cesium3DTile for this node.
   * @memberof I3SNode.prototype
   * @type {Cesium3DTile}
   * @readonly
   */
  tile: {
    get: function () {
      return this._tile;
    },
  },
  /**
   * Gets the I3S data for this object.
   * @memberof I3SNode.prototype
   * @type {Object}
   * @readonly
   */
  data: {
    get: function () {
      return this._data;
    },
  },
});

/**
 * @private
 */
I3SNode.prototype.load = function () {
  const that = this;

  function processData() {
    if (!that._isRoot) {
      // Create a new tile
      const tileDefinition = that._create3DTileDefinition();

      that._tile = new Cesium3DTile(
        that._layer._tileset,
        that._dataProvider.resource,
        tileDefinition,
        that._parent._tile
      );

      that._tile._i3sNode = that;
    }
  }

  // If we don't have a nodepage index load from json
  if (!defined(this._nodeIndex)) {
    return this._dataProvider._loadJson(this._resource).then(function (data) {
      // Success
      that._data = data;
      processData();
    });
  }

  return this._layer._getNodeInNodePages(this._nodeIndex).then(function (node) {
    that._data = node;
    let uri;
    if (that._isRoot) {
      uri = "nodes/root/";
    } else if (defined(node.mesh)) {
      const uriIndex = node.mesh.geometry.resource;
      uri = `../${uriIndex}/`;
    }
    if (defined(uri)) {
      that._resource = that._parent.resource.getDerivedResource({ url: uri });
    }

    processData();
  });
};

/**
 * Loads the node fields.
 * @returns {Promise} A promise that is resolved when the I3S Node fields are loaded
 */
I3SNode.prototype.loadFields = function () {
  // Check if we must load fields
  const fields = this._layer._data.attributeStorageInfo;

  const that = this;
  function createAndLoadField(fields, index) {
    const newField = new I3SField(that, fields[index]);
    that._fields[newField._storageInfo.name] = newField;
    return newField.load();
  }

  const promises = [];
  if (defined(fields)) {
    for (let i = 0; i < fields.length; i++) {
      promises.push(createAndLoadField(fields, i));
    }
  }

  return Promise.all(promises);
};

/**
 * @private
 */
I3SNode.prototype._loadChildren = function () {
  const that = this;
  // If the promise for loading the children was already created, just return it
  if (defined(this._childrenReadyPromise)) {
    return this._childrenReadyPromise;
  }

  const childPromises = [];
  if (defined(that._data.children)) {
    for (
      let childIndex = 0;
      childIndex < that._data.children.length;
      childIndex++
    ) {
      const child = that._data.children[childIndex];
      const newChild = new I3SNode(
        that,
        defaultValue(child.href, child),
        false
      );
      that._children.push(newChild);
      childPromises.push(newChild.load());
    }
  }

  this._childrenReadyPromise = Promise.all(childPromises).then(function () {
    for (let i = 0; i < that._children.length; i++) {
      that._tile.children.push(that._children[i]._tile);
    }
  });

  return this._childrenReadyPromise;
};

/**
 * @private
 */
I3SNode.prototype._loadGeometryData = function () {
  const geometryPromises = [];

  // To debug decoding for a specific tile, add a condition
  // that wraps this if/else to match the tile uri
  if (defined(this._data.geometryData)) {
    for (
      let geomIndex = 0;
      geomIndex < this._data.geometryData.length;
      geomIndex++
    ) {
      const curGeometryData = new I3SGeometry(
        this,
        this._data.geometryData[geomIndex].href
      );
      this._geometryData.push(curGeometryData);
      geometryPromises.push(curGeometryData.load());
    }
  } else if (defined(this._data.mesh)) {
    const geometryDefinition = this._layer._findBestGeometryBuffers(
      this._data.mesh.geometry.definition,
      ["position", "uv0"]
    );

    const geometryURI = `./geometries/${geometryDefinition.bufferIndex}/`;
    const newGeometryData = new I3SGeometry(this, geometryURI);
    newGeometryData._geometryDefinitions = geometryDefinition.definition;
    newGeometryData._geometryBufferInfo = geometryDefinition.geometryBufferInfo;
    this._geometryData.push(newGeometryData);
    geometryPromises.push(newGeometryData.load());
  }

  return Promise.all(geometryPromises);
};

/**
 * @private
 */
I3SNode.prototype._loadFeatureData = function () {
  const featurePromises = [];

  // To debug decoding for a specific tile, add a condition
  // that wraps this if/else to match the tile uri
  if (defined(this._data.featureData)) {
    for (
      let featureIndex = 0;
      featureIndex < this._data.featureData.length;
      featureIndex++
    ) {
      const newFeatureData = new I3SFeature(
        this,
        this._data.featureData[featureIndex].href
      );
      this._featureData.push(newFeatureData);
      featurePromises.push(newFeatureData.load());
    }
  } else if (defined(this._data.mesh) && defined(this._data.mesh.attribute)) {
    const featureURI = `./features/0`;
    const newFeatureData = new I3SFeature(this, featureURI);
    this._featureData.push(newFeatureData);
    featurePromises.push(newFeatureData.load());
  }

  return Promise.all(featurePromises);
};

/**
 * @private
 */
I3SNode.prototype._clearGeometryData = function () {
  this._geometryData = [];
};

/**
 * @private
 */
I3SNode.prototype._create3DTileDefinition = function () {
  const obb = this._data.obb;
  const mbs = this._data.mbs;

  if (!defined(obb) && !defined(mbs)) {
    console.error("Failed to load I3S node. Bounding volume is required.");
    return undefined;
  }

  let geoPosition;

  if (defined(obb)) {
    geoPosition = Cartographic.fromDegrees(
      obb.center[0],
      obb.center[1],
      obb.center[2]
    );
  } else {
    geoPosition = Cartographic.fromDegrees(mbs[0], mbs[1], mbs[2]);
  }

  // Offset bounding box position if we have a geoid service defined
  if (defined(this._dataProvider._geoidDataList) && defined(geoPosition)) {
    for (let i = 0; i < this._dataProvider._geoidDataList.length; i++) {
      const tile = this._dataProvider._geoidDataList[i];
      const projectedPos = tile.projection.project(geoPosition);
      if (
        projectedPos.x > tile.nativeExtent.west &&
        projectedPos.x < tile.nativeExtent.east &&
        projectedPos.y > tile.nativeExtent.south &&
        projectedPos.y < tile.nativeExtent.north
      ) {
        geoPosition.height += sampleGeoid(projectedPos.x, projectedPos.y, tile);
        break;
      }
    }
  }

  let boundingVolume = {};
  let position;
  let span = 0;
  if (defined(obb)) {
    boundingVolume = {
      box: [
        0,
        0,
        0,
        obb.halfSize[0],
        0,
        0,
        0,
        obb.halfSize[1],
        0,
        0,
        0,
        obb.halfSize[2],
      ],
    };
    span = Math.max(
      Math.max(this._data.obb.halfSize[0], this._data.obb.halfSize[1]),
      this._data.obb.halfSize[2]
    );
    position = Ellipsoid.WGS84.cartographicToCartesian(geoPosition);
  } else {
    boundingVolume = {
      sphere: [0, 0, 0, mbs[3]],
    };
    position = Ellipsoid.WGS84.cartographicToCartesian(geoPosition);
    span = this._data.mbs[3];
  }
  span *= 2;
  // Compute the geometric error
  let metersPerPixel = Infinity;

  // Get the meters/pixel density required to pop the next LOD
  if (defined(this._data.lodThreshold)) {
    if (
      this._layer._data.nodePages.lodSelectionMetricType ===
      "maxScreenThresholdSQ"
    ) {
      const maxScreenThreshold = Math.sqrt(
        this._data.lodThreshold / (Math.PI * 0.25)
      );
      metersPerPixel = span / maxScreenThreshold;
    } else if (
      this._layer._data.nodePages.lodSelectionMetricType ===
      "maxScreenThreshold"
    ) {
      const maxScreenThreshold = this._data.lodThreshold;
      metersPerPixel = span / maxScreenThreshold;
    } else {
      // Other LOD selection types can only be used for point cloud data
      console.error("Invalid lodSelectionMetricType in Layer");
    }
  } else if (defined(this._data.lodSelection)) {
    for (
      let lodIndex = 0;
      lodIndex < this._data.lodSelection.length;
      lodIndex++
    ) {
      if (
        this._data.lodSelection[lodIndex].metricType === "maxScreenThreshold"
      ) {
        metersPerPixel = span / this._data.lodSelection[lodIndex].maxError;
      }
    }
  }

  if (metersPerPixel === Infinity) {
    metersPerPixel = 100000;
  }

  // Calculate the length of 16 pixels in order to trigger the screen space error
  const geometricError = metersPerPixel * 16;

  // Transformations
  const hpr = new HeadingPitchRoll(0, 0, 0);
  let orientation = Transforms.headingPitchRollQuaternion(position, hpr);

  if (defined(this._data.obb)) {
    orientation = new Quaternion(
      this._data.obb.quaternion[0],
      this._data.obb.quaternion[1],
      this._data.obb.quaternion[2],
      this._data.obb.quaternion[3]
    );
  }

  const rotationMatrix = Matrix3.fromQuaternion(orientation);
  const inverseRotationMatrix = Matrix3.inverse(rotationMatrix, new Matrix3());

  const globalTransform = new Matrix4(
    rotationMatrix[0],
    rotationMatrix[1],
    rotationMatrix[2],
    0,
    rotationMatrix[3],
    rotationMatrix[4],
    rotationMatrix[5],
    0,
    rotationMatrix[6],
    rotationMatrix[7],
    rotationMatrix[8],
    0,
    position.x,
    position.y,
    position.z,
    1
  );

  const inverseGlobalTransform = Matrix4.inverse(
    globalTransform,
    new Matrix4()
  );

  const localTransform = Matrix4.clone(globalTransform);

  if (defined(this._parent._globalTransform)) {
    Matrix4.multiply(
      globalTransform,
      this._parent._inverseGlobalTransform,
      localTransform
    );
  }

  this._globalTransform = globalTransform;
  this._inverseGlobalTransform = inverseGlobalTransform;
  this._inverseRotationMatrix = inverseRotationMatrix;

  // get children definition
  const childrenDefinition = [];
  for (let childIndex = 0; childIndex < this._children.length; childIndex++) {
    childrenDefinition.push(
      this._children[childIndex]._create3DTileDefinition()
    );
  }

  // Create a tile set
  const inPlaceTileDefinition = {
    children: childrenDefinition,
    refine: "REPLACE",
    boundingVolume: boundingVolume,
    transform: [
      localTransform[0],
      localTransform[4],
      localTransform[8],
      localTransform[12],
      localTransform[1],
      localTransform[5],
      localTransform[9],
      localTransform[13],
      localTransform[2],
      localTransform[6],
      localTransform[10],
      localTransform[14],
      localTransform[3],
      localTransform[7],
      localTransform[11],
      localTransform[15],
    ],
    content: {
      uri: defined(this._resource) ? this._resource.url : undefined,
    },
    geometricError: geometricError,
  };

  return inPlaceTileDefinition;
};

/**
 * @private
 */
I3SNode.prototype._createI3SDecoderTask = function (dataProvider, data) {
  // Prepare the data to send to the worker
  const parentData = data.geometryData._parent._data;
  const parentRotationInverseMatrix =
    data.geometryData._parent._inverseRotationMatrix;

  let longitude = 0.0;
  let latitude = 0.0;
  let height = 0.0;

  if (defined(parentData.obb)) {
    longitude = parentData.obb.center[0];
    latitude = parentData.obb.center[1];
    height = parentData.obb.center[2];
  } else if (defined(parentData.mbs)) {
    longitude = parentData.mbs[0];
    latitude = parentData.mbs[1];
    height = parentData.mbs[2];
  }

  const axisFlipRotation = Matrix3.fromRotationX(-CesiumMath.PI_OVER_TWO);
  const parentRotation = new Matrix3();

  Matrix3.multiply(
    axisFlipRotation,
    parentRotationInverseMatrix,
    parentRotation
  );

  const cartographicCenter = Cartographic.fromDegrees(
    longitude,
    latitude,
    height
  );

  const cartesianCenter = Ellipsoid.WGS84.cartographicToCartesian(
    cartographicCenter
  );

  const payload = {
    binaryData: data.geometryData._data,
    featureData:
      defined(data.featureData) && defined(data.featureData[0])
        ? data.featureData[0].data
        : undefined,
    schema: data.defaultGeometrySchema,
    bufferInfo: data.geometryData._geometryBufferInfo,
    ellipsoidRadiiSquare: Ellipsoid.WGS84.radiiSquared,
    url: data.url,
    geoidDataList: data.geometryData._dataProvider._geoidDataList,
    cartographicCenter: cartographicCenter,
    cartesianCenter: cartesianCenter,
    parentRotation: parentRotation,
  };

  const decodeI3STaskProcessor = dataProvider._getDecoderTaskProcessor();

  const transferrableObjects = [];
  return dataProvider._taskProcessorReadyPromise.then(function () {
    return decodeI3STaskProcessor.scheduleTask(payload, transferrableObjects);
  });
};

/**
 * @private
 */
I3SNode.prototype._createContentURL = function () {
  let rawGltf = {
    scene: 0,
    scenes: [
      {
        nodes: [0],
      },
    ],
    nodes: [
      {
        name: "singleNode",
      },
    ],
    meshes: [],
    buffers: [],
    bufferViews: [],
    accessors: [],
    materials: [],
    textures: [],
    images: [],
    samplers: [],
    asset: {
      version: "2.0",
    },
  };

  // Load the geometry data
  const dataPromises = [this._loadFeatureData(), this._loadGeometryData()];

  const that = this;
  return Promise.all(dataPromises).then(function () {
    // Binary glTF
    let generateGltfPromise = Promise.resolve();
    if (defined(that._geometryData) && that._geometryData.length > 0) {
      const parameters = {
        geometryData: that._geometryData[0],
        featureData: that._featureData,
        defaultGeometrySchema: that._layer._data.store.defaultGeometrySchema,
        url: that._geometryData[0].resource.url,
        tile: that._tile,
      };

      const task = that._createI3SDecoderTask(that._dataProvider, parameters);
      if (!defined(task)) {
        // Postponed
        return;
      }

      generateGltfPromise = task.then(function (result) {
        rawGltf = parameters.geometryData._generateGltf(
          result.meshData.nodesInScene,
          result.meshData.nodes,
          result.meshData.meshes,
          result.meshData.buffers,
          result.meshData.bufferViews,
          result.meshData.accessors
        );

        that._geometryData[0]._customAttributes =
          result.meshData._customAttributes;
      });
    }

    return generateGltfPromise.then(function () {
      const binaryGltfData = that._dataProvider._binarizeGltf(rawGltf);
      const glbDataBlob = new Blob([binaryGltfData], {
        type: "application/binary",
      });
      that._glbURL = URL.createObjectURL(glbDataBlob);
    });
  });
};

/**
 * This class implements an I3S Geometry, in Cesium, each I3SGeometry
 * generates an in memory glTF to be used as content for a Cesium3DTile
 * <p>
 * Do not construct this directly, instead access tiles through {@link I3SNode}.
 * </p>
 * @alias I3SGeometry
 * @internalConstructor
 * @privateParam {I3SNode} parent The parent of that geometry
 * @privateParam {String} uri The uri to load the data from
 */
function I3SGeometry(parent, uri) {
  const dataProvider = parent._dataProvider;
  const layer = parent._layer;

  let resource;

  if (defined(parent._nodeIndex)) {
    resource = layer.resource.getDerivedResource({
      url: `nodes/${parent._data.mesh.geometry.resource}/${uri}`,
    });
  } else {
    resource = parent.resource.getDerivedResource({ url: uri });
  }

  this._parent = parent;
  this._dataProvider = dataProvider;
  this._layer = layer;
  this._resource = resource;

  this._customAttributes = undefined;
}

Object.defineProperties(I3SGeometry.prototype, {
  /**
   * Gets the resource for the geometry
   * @memberof I3SGeometry.prototype
   * @type {Resource}
   * @readonly
   */
  resource: {
    get: function () {
      return this._resource;
    },
  },

  /**
   * Gets the I3S data for this object.
   * @memberof I3SGeometry.prototype
   * @type {Object}
   * @readonly
   */
  data: {
    get: function () {
      return this._data;
    },
  },
  /**
   * Gets the custom attributes of the geometry.
   * @memberof I3SGeometry.prototype
   * @type {Object}
   * @readonly
   */
  customAttributes: {
    get: function () {
      return this._customAttributes;
    },
  },
});

/**
 * Loads the content.
 * @returns {Promise} A promise that is resolved when the geometry data is loaded
 * @private
 */
I3SGeometry.prototype.load = function () {
  const that = this;
  return this._dataProvider._loadBinary(this._resource).then(function (data) {
    that._data = data;
    return data;
  });
};

const scratchAb = new Cartesian3();
const scratchAp1 = new Cartesian3();
const scratchAp2 = new Cartesian3();
const scratchCp1 = new Cartesian3();
const scratchCp2 = new Cartesian3();

function sameSide(p1, p2, a, b) {
  const ab = Cartesian3.subtract(b, a, scratchAb);
  const cp1 = Cartesian3.cross(
    ab,
    Cartesian3.subtract(p1, a, scratchAp1),
    scratchCp1
  );
  const cp2 = Cartesian3.cross(
    ab,
    Cartesian3.subtract(p2, a, scratchAp2),
    scratchCp2
  );
  return Cartesian3.dot(cp1, cp2) >= 0;
}

const scratchV0 = new Cartesian3();
const scratchV1 = new Cartesian3();
const scratchV2 = new Cartesian3();

const scratchV0V1 = new Cartesian3();
const scratchV0V2 = new Cartesian3();
const scratchCrossProd = new Cartesian3();
const scratchNormal = new Cartesian3();

const scratchV0p = new Cartesian3();
const scratchV1p = new Cartesian3();
const scratchV2p = new Cartesian3();

/**
 * Find a triangle touching the point px,py,pz, then return the vertex closest to the search point
 * @param {Number} px The x component of the point to query
 * @param {Number} py The y component of the point to query
 * @param {Number} pz The z component of the point to query
 * @returns {Object} A structure containing the index of the closest point,
 * the squared distance from the queried point to the point that is found
 * the distance from the queried point to the point that is found
 * the queried position in local space
 * the closest position in local space
 */
I3SGeometry.prototype.getClosestPointIndexOnTriangle = function (px, py, pz) {
  if (
    defined(this._customAttributes) &&
    defined(this._customAttributes.positions)
  ) {
    // Convert queried position to local
    const position = new Cartesian3(px, py, pz);

    position.x -= this._customAttributes.cartesianCenter.x;
    position.y -= this._customAttributes.cartesianCenter.y;
    position.z -= this._customAttributes.cartesianCenter.z;
    Matrix3.multiplyByVector(
      this._customAttributes.parentRotation,
      position,
      position
    );

    let bestTriDist = Number.MAX_VALUE;
    let bestTri;
    let bestDistSq;
    let bestIndex;
    let bestPt;

    // Brute force lookup, @TODO: this can be improved with a spatial partitioning search system
    const positions = this._customAttributes.positions;
    const indices = this._customAttributes.indices;

    // We may have indexed or non-indexed triangles here
    let triCount;
    if (defined(indices)) {
      triCount = indices.length;
    } else {
      triCount = positions.length / 3;
    }

    for (let triIndex = 0; triIndex < triCount; triIndex++) {
      let i0, i1, i2;
      if (defined(indices)) {
        i0 = indices[triIndex];
        i1 = indices[triIndex + 1];
        i2 = indices[triIndex + 2];
      } else {
        i0 = triIndex * 3;
        i1 = triIndex * 3 + 1;
        i2 = triIndex * 3 + 2;
      }

      const v0 = Cartesian3.fromElements(
        positions[i0 * 3],
        positions[i0 * 3 + 1],
        positions[i0 * 3 + 2],
        scratchV0
      );
      const v1 = Cartesian3.fromElements(
        positions[i1 * 3],
        positions[i1 * 3 + 1],
        positions[i1 * 3 + 2],
        scratchV1
      );
      const v2 = new Cartesian3(
        positions[i2 * 3],
        positions[i2 * 3 + 1],
        positions[i2 * 3 + 2],
        scratchV2
      );

      // Check how the point is positioned relative to the triangle.
      // This will tell us whether the projection of the point in the triangle's plane lands in the triangle
      if (
        !sameSide(position, v0, v1, v2) ||
        !sameSide(position, v1, v0, v2) ||
        !sameSide(position, v2, v0, v1)
      ) {
        continue;
      }
      // Because of precision issues, we can't always reliably tell if the point lands directly on the face, so the most robust way is just to find the closest one
      const v0v1 = Cartesian3.subtract(v1, v0, scratchV0V1);
      const v0v2 = Cartesian3.subtract(v2, v0, scratchV0V2);
      const crossProd = Cartesian3.cross(v0v1, v0v2, scratchCrossProd);

      // Skip "triangles" with 3 colinear points
      if (Cartesian3.magnitude(crossProd) === 0) {
        continue;
      }
      const normal = Cartesian3.normalize(crossProd, scratchNormal);

      const v0p = Cartesian3.subtract(position, v0, scratchV0p);
      const normalDist = Math.abs(Cartesian3.dot(v0p, normal));
      if (normalDist < bestTriDist) {
        bestTriDist = normalDist;
        bestTri = triIndex;

        // Found a triangle, return the index of the closest point
        const d0 = Cartesian3.magnitudeSquared(
          Cartesian3.subtract(position, v0, v0p)
        );
        const d1 = Cartesian3.magnitudeSquared(
          Cartesian3.subtract(position, v1, scratchV1p)
        );
        const d2 = Cartesian3.magnitudeSquared(
          Cartesian3.subtract(position, v2, scratchV2p)
        );
        if (d0 < d1 && d0 < d2) {
          bestIndex = i0;
          bestPt = v0;
          bestDistSq = d0;
        } else if (d1 < d2) {
          bestIndex = i1;
          bestPt = v1;
          bestDistSq = d1;
        } else {
          bestIndex = i2;
          bestPt = v2;
          bestDistSq = d2;
        }
      }
    }

    if (defined(bestTri)) {
      return {
        index: bestIndex,
        distanceSquared: bestDistSq,
        distance: Math.sqrt(bestDistSq),
        queriedPosition: position,
        closestPosition: Cartesian3.clone(bestPt),
      };
    }
  }

  // No hits found
  return {
    index: -1,
    distanceSquared: Number.Infinity,
    distance: Number.Infinity,
  };
};

/**
 * @private
 */
I3SGeometry.prototype._generateGltf = function (
  nodesInScene,
  nodes,
  meshes,
  buffers,
  bufferViews,
  accessors
) {
  // Get the material definition
  let gltfMaterial = {
    pbrMetallicRoughness: {
      metallicFactor: 0.0,
    },
    doubleSided: true,
    name: "Material",
  };

  let isTextured = false;
  let materialDefinition;
  let texturePath = "";
  if (
    defined(this._parent._data.mesh) &&
    defined(this._layer._data.materialDefinitions)
  ) {
    const materialInfo = this._parent._data.mesh.material;
    const materialIndex = materialInfo.definition;
    if (
      materialIndex >= 0 &&
      materialIndex < this._layer._data.materialDefinitions.length
    ) {
      materialDefinition = this._layer._data.materialDefinitions[materialIndex];
      gltfMaterial = materialDefinition;

      if (
        defined(gltfMaterial.pbrMetallicRoughness) &&
        defined(gltfMaterial.pbrMetallicRoughness.baseColorTexture)
      ) {
        isTextured = true;
        gltfMaterial.pbrMetallicRoughness.baseColorTexture.index = 0;

        // Choose the JPG for the texture
        let textureName = "0";

        if (defined(this._layer._data.textureSetDefinitions)) {
          for (
            let defIndex = 0;
            defIndex < this._layer._data.textureSetDefinitions.length;
            defIndex++
          ) {
            const textureSetDefinition = this._layer._data
              .textureSetDefinitions[defIndex];
            for (
              let formatIndex = 0;
              formatIndex < textureSetDefinition.formats.length;
              formatIndex++
            ) {
              const textureFormat = textureSetDefinition.formats[formatIndex];
              if (textureFormat.format === "jpg") {
                textureName = textureFormat.name;
                break;
              }
            }
          }
        }

        if (
          defined(this._parent._data.mesh) &&
          this._parent._data.mesh.material.resource >= 0
        ) {
          texturePath = this._layer.resource.getDerivedResource({
            url: `nodes/${this._parent._data.mesh.material.resource}/textures/${textureName}`,
          }).url;
        }
      }
    }
  } else if (defined(this._parent._data.textureData)) {
    // No material definition, but if there's a texture reference, we can create a simple material using it (version 1.6 support)
    isTextured = true;
    texturePath = this._parent.resource.getDerivedResource({
      url: `${this._parent._data.textureData[0].href}`,
    }).url;
    gltfMaterial.pbrMetallicRoughness.baseColorTexture = { index: 0 };
  }

  let gltfTextures = [];
  let gltfImages = [];
  let gltfSamplers = [];

  if (isTextured) {
    gltfTextures = [
      {
        sampler: 0,
        source: 0,
      },
    ];

    gltfImages = [
      {
        uri: texturePath,
      },
    ];

    gltfSamplers = [
      {
        magFilter: 9729,
        minFilter: 9986,
        wrapS: 10497,
        wrapT: 10497,
      },
    ];
  }

  const gltfData = {
    scene: 0,
    scenes: [
      {
        nodes: nodesInScene,
      },
    ],
    nodes: nodes,
    meshes: meshes,
    buffers: buffers,
    bufferViews: bufferViews,
    accessors: accessors,
    materials: [gltfMaterial],
    textures: gltfTextures,
    images: gltfImages,
    samplers: gltfSamplers,
    asset: {
      version: "2.0",
    },
  };

  return gltfData;
};

function bilinearInterpolate(tx, ty, h00, h10, h01, h11) {
  const a = h00 * (1 - tx) + h10 * tx;
  const b = h01 * (1 - tx) + h11 * tx;
  return a * (1 - ty) + b * ty;
}

function sampleMap(u, v, width, data) {
  const address = u + v * width;
  return data[address];
}

function sampleGeoid(sampleX, sampleY, geoidData) {
  const extent = geoidData.nativeExtent;
  let x =
    ((sampleX - extent.west) / (extent.east - extent.west)) *
    (geoidData.width - 1);
  let y =
    ((sampleY - extent.south) / (extent.north - extent.south)) *
    (geoidData.height - 1);
  const xi = Math.floor(x);
  let yi = Math.floor(y);

  x -= xi;
  y -= yi;

  const xNext = xi < geoidData.width ? xi + 1 : xi;
  let yNext = yi < geoidData.height ? yi + 1 : yi;

  yi = geoidData.height - 1 - yi;
  yNext = geoidData.height - 1 - yNext;

  const h00 = sampleMap(xi, yi, geoidData.width, geoidData.buffer);
  const h10 = sampleMap(xNext, yi, geoidData.width, geoidData.buffer);
  const h01 = sampleMap(xi, yNext, geoidData.width, geoidData.buffer);
  const h11 = sampleMap(xNext, yNext, geoidData.width, geoidData.buffer);

  let finalHeight = bilinearInterpolate(x, y, h00, h10, h01, h11);
  finalHeight = finalHeight * geoidData.scale + geoidData.offset;
  return finalHeight;
}

/**
 * This class implements an I3S Field which is custom data attached
 * to nodes
 * @alias I3SField
 * @internalConstructor
 * @privateParam {I3SNode} parent The parent of that geometry
 * @privateParam {Object} storageInfo The structure containing the storage info of the field
 */
function I3SField(parent, storageInfo) {
  this._storageInfo = storageInfo;
  this._parent = parent;
  this._dataProvider = parent._dataProvider;
  const uri = `attributes/${storageInfo.key}/0`;

  if (defined(this._parent._nodeIndex)) {
    this._resource = this._parent._layer.resource.getDerivedResource({
      url: `nodes/${this._parent._data.mesh.attribute.resource}/${uri}`,
    });
  } else {
    this._resource = this._parent.resource.getDerivedResource({ url: uri });
  }
}

Object.defineProperties(I3SField.prototype, {
  /**
   * Gets the resource for the fields
   * @memberof I3SField.prototype
   * @type {Resource}
   * @readonly
   */
  resource: {
    get: function () {
      return this._resource;
    },
  },
  /**
   * Gets the header for this field.
   * @memberof I3SField.prototype
   * @type {Object}
   * @readonly
   */
  header: {
    get: function () {
      return this._header;
    },
  },
  /**
   * Gets the values for this field.
   * @memberof I3SField.prototype
   * @type {Object}
   * @readonly
   */
  values: {
    get: function () {
      return defined(this._values) && defined(this._values.attributeValues)
        ? this._values.attributeValues
        : [];
    },
  },
  /**
   * Gets the name for the field.
   * @memberof I3SField.prototype
   * @type {String}
   * @readonly
   */
  name: {
    get: function () {
      return this._storageInfo.name;
    },
  },
});

function getNumericTypeSize(type) {
  if (type === "UInt8" || type === "Int8") {
    return 1;
  } else if (type === "UInt16" || type === "Int16") {
    return 2;
  } else if (
    type === "UInt32" ||
    type === "Int32" ||
    type === "Oid32" ||
    type === "Float32"
  ) {
    return 4;
  } else if (type === "UInt64" || type === "Int64" || type === "Float64") {
    return 8;
  }

  // Not a numerice type
  return 0;
}

/**
 * Loads the content.
 * @returns {Promise} A promise that is resolved when the geometry data is loaded
 */
I3SField.prototype.load = function () {
  const that = this;
  return this._dataProvider._loadBinary(this._resource).then(function (data) {
    // Check if we have a 404
    const dataView = new DataView(data);
    let success = true;
    if (dataView.getUint8(0) === "{".charCodeAt(0)) {
      const textContent = new TextDecoder();
      const str = textContent.decode(data);
      if (str.includes("404")) {
        success = false;
        console.error(`Failed to load: ${that.resource.url}`);
      }
    }

    if (success) {
      that._data = data;
      let offset = that._parseHeader(dataView);

      const valueSize = getNumericTypeSize(
        that._storageInfo.attributeValues.valueType
      );
      if (valueSize > 0) {
        // Values will be padded to align the addresses with the data size
        offset = Math.ceil(offset / valueSize) * valueSize;
      }

      that._parseBody(dataView, offset);
    }
  });
};

/**
 * @private
 */
I3SField.prototype._parseValue = function (dataView, type, offset) {
  let value;
  if (type === "UInt8") {
    value = dataView.getUint8(offset);
    offset += 1;
  } else if (type === "Int8") {
    value = dataView.getInt8(offset);
    offset += 1;
  } else if (type === "UInt16") {
    value = dataView.getUint16(offset, true);
    offset += 2;
  } else if (type === "Int16") {
    value = dataView.getInt16(offset, true);
    offset += 2;
  } else if (type === "UInt32") {
    value = dataView.getUint32(offset, true);
    offset += 4;
  } else if (type === "Oid32") {
    value = dataView.getUint32(offset, true);
    offset += 4;
  } else if (type === "Int32") {
    value = dataView.getInt32(offset, true);
    offset += 4;
  } else if (type === "UInt64") {
    const left = dataView.getUint32(offset, true);
    const right = dataView.getUint32(offset + 4, true);
    value = left + Math.pow(2, 32) * right;
    offset += 8;
  } else if (type === "Int64") {
    const left = dataView.getUint32(offset, true);
    const right = dataView.getUint32(offset + 4, true);
    if (right < Math.pow(2, 31)) {
      // Positive number
      value = left + Math.pow(2, 32) * right;
    } else {
      // Negative
      value = left + Math.pow(2, 32) * (right - Math.pow(2, 32));
    }

    offset += 8;
  } else if (type === "Float32") {
    value = dataView.getFloat32(offset, true);
    offset += 4;
  } else if (type === "Float64") {
    value = dataView.getFloat64(offset, true);
    offset += 8;
  } else if (type === "String") {
    value = String.fromCharCode(dataView.getUint8(offset));
    offset += 1;
  }

  return {
    value: value,
    offset: offset,
  };
};

/**
 * @private
 */
I3SField.prototype._parseHeader = function (dataView) {
  let offset = 0;
  this._header = {};
  for (
    let itemIndex = 0;
    itemIndex < this._storageInfo.header.length;
    itemIndex++
  ) {
    const item = this._storageInfo.header[itemIndex];
    const parsedValue = this._parseValue(dataView, item.valueType, offset);
    this._header[item.property] = parsedValue.value;
    offset = parsedValue.offset;
  }
  return offset;
};

/**
 * @private
 */
I3SField.prototype._parseBody = function (dataView, offset) {
  this._values = {};
  for (
    let itemIndex = 0;
    itemIndex < this._storageInfo.ordering.length;
    itemIndex++
  ) {
    const item = this._storageInfo.ordering[itemIndex];
    const desc = this._storageInfo[item];
    if (defined(desc)) {
      this._values[item] = [];
      for (let index = 0; index < this._header.count; ++index) {
        if (desc.valueType !== "String") {
          const parsedValue = this._parseValue(
            dataView,
            desc.valueType,
            offset
          );
          this._values[item].push(parsedValue.value);
          offset = parsedValue.offset;
        } else {
          const stringLen = this._values.attributeByteCounts[index];
          let stringContent = "";
          for (let cIndex = 0; cIndex < stringLen; ++cIndex) {
            const curParsedValue = this._parseValue(
              dataView,
              desc.valueType,
              offset
            );
            if (curParsedValue.value.charCodeAt(0) !== 0) {
              stringContent += curParsedValue.value;
            }
            offset = curParsedValue.offset;
          }
          // We skip the last character of the string since it's a null terminator
          this._values[item].push(stringContent);
        }
      }
    }
  }
};

// Reimplement Cesium3DTile.prototype.requestContent so that
// We get a chance to load our own gltf from I3S data
Cesium3DTile.prototype._hookedRequestContent =
  Cesium3DTile.prototype.requestContent;

/**
 * @private
 */
Cesium3DTile.prototype._resolveHookedObject = function () {
  const that = this;
  // Keep a handle on the early promises
  // Call the real requestContent function
  this._hookedRequestContent();

  // Fulfill the promises
  this._contentReadyToProcessPromise.then(function () {
    that._contentReadyToProcessDefer.resolve();
  });

  this._contentReadyPromise.then(function (content) {
    that._isLoading = false;
    that._contentReadyDefer.resolve(content);
  });
};

Cesium3DTile.prototype.requestContent = function () {
  const that = this;
  if (!this.tileset._isI3STileSet) {
    return this._hookedRequestContent();
  }

  if (!this._isLoading) {
    this._isLoading = true;

    // Create early promises that will be fulfilled later
    this._contentReadyToProcessDefer = defer();
    this._contentReadyDefer = defer();
    this._contentReadyToProcessPromise = this._contentReadyToProcessDefer.promise;
    this._contentReadyPromise = this._contentReadyDefer.promise;

    this._i3sNode._createContentURL().then(function () {
      that._contentResource = new Resource({ url: that._i3sNode._glbURL });
      that._resolveHookedObject();
    });

    // Returns the number of requests
    return 0;
  }

  return 1;
};

Object.defineProperties(Cesium3DTile.prototype, {
  /**
   * Gets the I3S Node for the tile content.
   * @memberof Batched3DModel3DTileContent.prototype
   * @type {String}
   */
  i3sNode: {
    get: function () {
      return this._i3sNode;
    },
  },
});

export default I3SNode;
