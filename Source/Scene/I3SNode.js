import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import Cesium3DTile from "../Scene/Cesium3DTile.js";
import CesiumMath from "../Core/Math.js";
import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import HeadingPitchRoll from "../Core/HeadingPitchRoll.js";
import I3SFeature from "../Scene/I3SFeature.js";
import Matrix3 from "../Core/Matrix3.js";
import Matrix4 from "../Core/Matrix4.js";
import Resource from "../Core/Resource.js";
import Transforms from "../Core/Transforms.js";
import Quaternion from "../Core/Quaternion.js";

/**
 * This class implements an I3S Node, in Cesium, each I3SNode
 * creates a Cesium3DTile
 * <p>
 * Do not construct this directly, instead access tiles through {@link I3SDataProvider}.
 * </p>
 * @alias I3SNode
 * @constructor
 */
function I3SNode(parent, ref, isRoot) {
  this._parent = parent;
  this._dataProvider = parent._dataProvider;

  if (isRoot) {
    this._level = 0;
    this._layer = this._parent;
  } else {
    this._level = this._parent._level + 1;
    this._layer = this._parent._layer;
  }

  if (this._level === 0) {
    if (typeof ref === "number") {
      this._nodeIndex = ref;
    } else {
      this._uri = ref;
    }
  } else if (typeof ref === "number") {
    this._nodeIndex = ref;
  } else {
    this._uri = ref;
  }

  if (this._uri !== undefined) {
    let query = "";
    if (this._dataProvider._query && this._dataProvider._query !== "") {
      query = `?${this._dataProvider._query}`;
    }

    this._completeUriWithoutQuery = `${this._parent._completeUriWithoutQuery}/${this._uri}`;
    this._completeUri = this._completeUriWithoutQuery + query;
  }

  this._tile = null;
  this._geometryData = [];
  this._featureData = [];
  this._fields = {};
  this._children = [];
}

Object.defineProperties(I3SNode.prototype, {
  /**
   * Gets the uri for the node.
   * @memberof I3SNode.prototype
   * @type {string}
   */
  uri: {
    get: function () {
      return this._uri;
    },
  },
  /**
   * Gets the complete uri for the node.
   * @memberof I3SNode.prototype
   * @type {string}
   */
  completeUri: {
    get: function () {
      return this._completeUri;
    },
  },
  /**
   * Gets the parent layer
   * @memberof I3SNode.prototype
   * @type {Object}
   */
  layer: {
    get: function () {
      return this._layer;
    },
  },
  /**
   * Gets the parent node
   * @memberof I3SNode.prototype
   * @type {Object}
   */
  parent: {
    get: function () {
      return this._parent;
    },
  },
  /**
   * Gets the children nodes
   * @memberof I3SNode.prototype
   * @type {Array}
   */
  children: {
    get: function () {
      return this._children;
    },
  },
  /**
   * Gets the collection of geometries
   * @memberof I3SNode.prototype
   * @type {Array}
   */
  geometryData: {
    get: function () {
      return this._geometryData;
    },
  },
  /**
   * Gets the collection of features
   * @memberof I3SNode.prototype
   * @type {Array}
   */
  featureData: {
    get: function () {
      return this._featureData;
    },
  },
  /**
   * Gets the collection of fields
   * @memberof I3SNode.prototype
   * @type {Array}
   */
  fields: {
    get: function () {
      return this._fields;
    },
  },
  /**
   * Gets the Cesium3DTileSet for this layer.
   * @memberof I3SNode.prototype
   * @type {I3SNode}
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
   */
  data: {
    get: function () {
      return this._data;
    },
  },
});

/**
 * Loads the node definition.
 * @returns {Promise<void>} a promise that is resolved when the I3S Node data is loaded
 */
I3SNode.prototype.load = function (isRoot) {
  const that = this;

  function processData() {
    if (!isRoot) {
      // Create a new tile
      const tileDefinition = that._create3DTileDefinition();

      const tileBlob = new Blob([JSON.stringify(tileDefinition)], {
        type: "application/json",
      });

      const inPlaceTileURL = URL.createObjectURL(tileBlob);
      const resource = Resource.createIfNeeded(inPlaceTileURL);

      that._tile = new Cesium3DTile(
        that._layer._tileset,
        resource,
        tileDefinition,
        that._parent._tile
      );

      that._tile._i3sNode = that;
    }
  }

  // if we don't have a nodepage index load from json
  if (this._nodeIndex === undefined) {
    return this._dataProvider._loadJson(
      this._completeUri,
      function (data, resolve) {
        // Success
        that._data = data;
        processData();
        resolve();
      },
      function (reject) {
        // Fail
        reject();
      }
    );
  }

  return new Promise(function (resolve, reject) {
    that._layer._getNodeInNodePages(that._nodeIndex).then(function (data) {
      that._data = data;

      const pageSize = that._layer._data.nodePages.nodesPerPage;
      const node =
        that._layer._nodePages[Math.floor(that._nodeIndex / pageSize)][
          that._nodeIndex % pageSize
        ];
      if (isRoot) {
        that._uri = "nodes/root";
      } else if (node.mesh !== undefined) {
        const uriIndex =
          that._layer._nodePages[Math.floor(that._nodeIndex / pageSize)][
            that._nodeIndex % pageSize
          ].mesh.geometry.resource;
        that._uri = `../${uriIndex}`;
      }
      if (that._uri !== undefined) {
        that._completeUriWithoutQuery = `${that._parent._completeUriWithoutQuery}/${that._uri}`;
        let query = "";
        if (that._dataProvider._query && that._dataProvider._query !== "") {
          query = `?${that._dataProvider._query}`;
        }
        that._completeUri = that._completeUriWithoutQuery + query;
      }

      processData();
      resolve();
    });
  });
};

/**
 * Loads the node fields.
 * @returns {Promise<void>} a promise that is resolved when the I3S Node fields are loaded
 */
I3SNode.prototype.loadFields = function () {
  // check if we must load fields
  const fields = this._layer._data.attributeStorageInfo;

  const that = this;
  function createAndLoadField(fields, index) {
    const newField = new I3SField(that, fields[index]);
    that._fields[newField._storageInfo.name] = newField;
    return newField.load();
  }

  const promises = [];
  if (fields) {
    for (let i = 0; i < fields.length; i++) {
      promises.push(createAndLoadField(fields, i));
    }
  }

  return Promise.all(promises);
};

/**
 * @private
 */
I3SNode.prototype._loadChildren = function (waitAllChildren) {
  const that = this;
  return new Promise(function (resolve, reject) {
    if (!that._childrenAreLoaded) {
      that._childrenAreLoaded = true;
      const childPromises = [];
      if (that._data.children) {
        for (
          let childIndex = 0;
          childIndex < that._data.children.length;
          childIndex++
        ) {
          const child = that._data.children[childIndex];
          const newChild = new I3SNode(
            that,
            child.href ? child.href : child,
            false
          );
          that._children.push(newChild);
          const childIsLoaded = newChild.load();
          if (waitAllChildren) {
            childPromises.push(childIsLoaded);
          }
          childIsLoaded.then(
            (function (theChild) {
              return function () {
                that._tile.children.push(theChild._tile);
              };
            })(newChild)
          );
        }
        if (waitAllChildren) {
          Promise.all(childPromises).then(function () {
            resolve();
          });
        } else {
          resolve();
        }
      } else {
        resolve();
      }
    } else {
      resolve();
    }
  });
};

/**
 * @private
 */
I3SNode.prototype._loadGeometryData = function () {
  const geometryPromises = [];

  // To debug decoding for a specific tile, add a condition
  // that wraps this if/else to match the tile uri
  if (this._data.geometryData) {
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
  } else if (this._data.mesh) {
    const geometryDefinition = this._layer._findBestGeometryBuffers(
      this._data.mesh.geometry.definition,
      ["position", "uv0"]
    );

    const geometryURI = `./geometries/${geometryDefinition.bufferIndex}`;
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
  if (this._data.featureData) {
    for (
      let featureIndex = 0;
      featureIndex < this._data.featureData.length;
      featureIndex++
    ) {
      const newfeatureData = new I3SFeature(
        this,
        this._data.featureData[featureIndex].href
      );
      this._featureData.push(newfeatureData);
      featurePromises.push(newfeatureData.load());
    }
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

  let boundingVolume = {};
  let geoPosition;
  let position;

  if (obb) {
    geoPosition = Cartographic.fromDegrees(
      obb.center[0],
      obb.center[1],
      obb.center[2]
    );
  } else if (mbs) {
    geoPosition = Cartographic.fromDegrees(mbs[0], mbs[1], mbs[2]);
  }

  //Offset bounding box position if we have a geoid service defined
  if (
    defined(this._dataProvider._geoidTiledTerrainProvider) &&
    defined(geoPosition)
  ) {
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

  if (obb) {
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
    position = Ellipsoid.WGS84.cartographicToCartesian(geoPosition);
  } else if (mbs) {
    boundingVolume = {
      sphere: [0, 0, 0, mbs[3]],
    };
    position = Ellipsoid.WGS84.cartographicToCartesian(geoPosition);
  } else {
    console.error(this);
  }

  // compute the geometric error
  let metersPerPixel = Infinity;

  let span = 0;
  if (this._data.mbs) {
    span = this._data.mbs[3];
  } else if (this._data.obb) {
    span = Math.max(
      Math.max(this._data.obb.halfSize[0], this._data.obb.halfSize[1]),
      this._data.obb.halfSize[2]
    );
  }

  // get the meters/pixel density required to pop the next LOD
  if (this._data.lodThreshold !== undefined) {
    if (
      this._layer._data.nodePages.lodSelectionMetricType ===
      "maxScreenThresholdSQ"
    ) {
      const maxScreenThreshold =
        Math.sqrt(this._data.lodThreshold) / (Math.PI * 0.25);
      metersPerPixel = span / maxScreenThreshold;
    } else if (
      this._layer._data.nodePages.lodSelectionMetricType ===
      "maxScreenThreshold"
    ) {
      const maxScreenThreshold = this._data.lodThreshold;
      metersPerPixel = span / maxScreenThreshold;
    } else {
      //Other LOD selection types can only be used for point cloud data
      console.error("Invalid lodSelectionMetricType in Layer");
    }
  } else if (this._data.lodSelection !== undefined) {
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

  // calculate the length of 16 pixels in order to trigger the screen space error
  const geometricError = metersPerPixel * 16;

  // transformations
  const hpr = new HeadingPitchRoll(0, 0, 0);
  let orientation = Transforms.headingPitchRollQuaternion(position, hpr);

  if (this._data.obb) {
    orientation = new Quaternion(
      this._data.obb.quaternion[0],
      this._data.obb.quaternion[1],
      this._data.obb.quaternion[2],
      this._data.obb.quaternion[3]
    );
  }

  this._rotationMatrix = Matrix3.fromQuaternion(orientation);
  this._inverseRotationMatrix = new Matrix3();
  Matrix3.inverse(this._rotationMatrix, this._inverseRotationMatrix);

  this._globalTransforms = new Matrix4(
    this._rotationMatrix[0],
    this._rotationMatrix[1],
    this._rotationMatrix[2],
    0,
    this._rotationMatrix[3],
    this._rotationMatrix[4],
    this._rotationMatrix[5],
    0,
    this._rotationMatrix[6],
    this._rotationMatrix[7],
    this._rotationMatrix[8],
    0,
    position.x,
    position.y,
    position.z,
    1
  );

  this.inverseGlobalTransform = new Matrix4();
  Matrix4.inverse(this._globalTransforms, this.inverseGlobalTransform);

  const localTransforms = this._globalTransforms.clone();

  if (this._parent._globalTransforms) {
    Matrix4.multiply(
      this._globalTransforms,
      this._parent.inverseGlobalTransform,
      localTransforms
    );
  }

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
      localTransforms[0],
      localTransforms[4],
      localTransforms[8],
      localTransforms[12],
      localTransforms[1],
      localTransforms[5],
      localTransforms[9],
      localTransforms[13],
      localTransforms[2],
      localTransforms[6],
      localTransforms[10],
      localTransforms[14],
      localTransforms[3],
      localTransforms[7],
      localTransforms[11],
      localTransforms[15],
    ],
    content: {
      uri: this._completeUriWithoutQuery,
    },
    geometricError: geometricError,
  };

  return inPlaceTileDefinition;
};

/**
 * @private
 */
I3SNode.prototype._scheduleCreateContentURL = function () {
  const that = this;
  return new Promise(function (resolve, reject) {
    that._createContentURL(resolve, that._tile);
  });
};

function createI3SDecoderTask(dataProvider, data) {
  // Prepare the data to send to the worker
  const parentData = data.geometryData._parent._data;
  const parentRotationInverseMatrix =
    data.geometryData._parent._inverseRotationMatrix;

  const center = {
    long: 0,
    lat: 0,
    alt: 0,
  };

  if (parentData.obb) {
    center.long = parentData.obb.center[0];
    center.lat = parentData.obb.center[1];
    center.alt = parentData.obb.center[2];
  } else if (parentData.mbs) {
    center.long = parentData.mbs[0];
    center.lat = parentData.mbs[1];
    center.alt = parentData.mbs[2];
  }

  const axisFlipRotation = Matrix3.fromRotationX(-Math.PI / 2);
  const parentRotation = new Matrix3();

  Matrix3.multiply(
    axisFlipRotation,
    parentRotationInverseMatrix,
    parentRotation
  );

  const cartographicCenter = new Cartographic(
    CesiumMath.toRadians(center.long),
    CesiumMath.toRadians(center.lat),
    center.alt
  );
  const cartesianCenter = Ellipsoid.WGS84.cartographicToCartesian(
    cartographicCenter
  );

  const payload = {
    binaryData: data.geometryData._data,
    featureData:
      data.featureData && data.featureData[0] ? data.featureData[0].data : null,
    schema: data.defaultGeometrySchema,
    bufferInfo: data.geometryData._geometryBufferInfo,
    ellipsoidRadiiSquare: Ellipsoid.WGS84._radiiSquared,
    url: data.url,
    geoidDataList: data.geometryData._dataProvider._geoidDataList,
    cartographicCenter: center,
    cartesianCenter: cartesianCenter,
    parentRotation: parentRotation,
  };

  const decodeI3STaskProcessor = dataProvider._getDecoderTaskProcessor();

  const transferrableObjects = [];
  return dataProvider._taskProcessorReadyPromise.then(function () {
    return decodeI3STaskProcessor.scheduleTask(payload, transferrableObjects);
  });
}

/**
 * @private
 */
I3SNode.prototype._createContentURL = function (resolve, tile) {
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
  Promise.all(dataPromises).then(function () {
    // Binary glTF
    const generateGltf = new Promise(function (resolve, reject) {
      if (that._geometryData && that._geometryData.length > 0) {
        const parameters = {
          geometryData: that._geometryData[0],
          featureData: that._featureData,
          defaultGeometrySchema: that._layer._data.store.defaultGeometrySchema,
          url: that._geometryData[0]._completeUri,
          tile: that._tile,
        };

        const task = createI3SDecoderTask(that._dataProvider, parameters);
        if (!defined(task)) {
          // Postponed
          resolve();
          return;
        }

        task.then(function (result) {
          rawGltf = parameters.geometryData._generateGltf(
            result.meshData.nodesInScene,
            result.meshData.nodes,
            result.meshData.meshes,
            result.meshData.buffers,
            result.meshData.bufferViews,
            result.meshData.accessors
          );

          that._geometryData[0].customAttributes =
            result.meshData.customAttributes;
          resolve();
        });
      } else {
        resolve();
      }
    });

    generateGltf.then(function () {
      const binaryGltfData = that._dataProvider._binarizeGltf(rawGltf);
      const glbDataBlob = new Blob([binaryGltfData], {
        type: "application/binary",
      });
      that._glbURL = URL.createObjectURL(glbDataBlob);
      resolve();
    });
  });
};

/**
 * This class implements an I3S Geometry, in Cesium, each I3SGeometry
 * generates an in memory gltf to be used as content for a Cesium3DTile
 * @private
 * @alias I3SGeometry
 * @constructor
 * @param {I3SNode} [parent] The parent of that geometry
 * @param {String} [uri] The uri to load the data from
 */
function I3SGeometry(parent, uri) {
  this._parent = parent;
  this._dataProvider = parent._dataProvider;
  this._layer = parent._layer;
  this._uri = uri;
  let query = "";
  if (this._dataProvider._query && this._dataProvider._query !== "") {
    query = `?${this._dataProvider._query}`;
  }

  if (this._parent._nodeIndex) {
    this._completeUriWithoutQuery = `${this._layer._completeUriWithoutQuery}/nodes/${this._parent._data.mesh.geometry.resource}/${this._uri}`;
    this._completeUri = this._completeUriWithoutQuery + query;
  } else {
    this._completeUriWithoutQuery = `${this._parent._completeUriWithoutQuery}/${this._uri}`;
    this._completeUri = this._completeUriWithoutQuery + query;
  }
}

Object.defineProperties(I3SGeometry.prototype, {
  /**
   * Gets the uri for the geometry.
   * @memberof I3SGeometry.prototype
   * @type {string}
   */
  uri: {
    get: function () {
      return this._uri;
    },
  },
  /**
   * Gets the complete uri for the geometry.
   * @memberof I3SGeometry.prototype
   * @type {string}
   */
  completeUri: {
    get: function () {
      return this._completeUri;
    },
  },
  /**
   * Gets the I3S data for this object.
   * @memberof I3SGeometry.prototype
   * @type {Object}
   */
  data: {
    get: function () {
      return this._data;
    },
  },
});

/**
 * Loads the content.
 * @returns {Promise<void>} a promise that is resolved when the geometry data is loaded
 */
I3SGeometry.prototype.load = function () {
  const that = this;
  return this._dataProvider._loadBinary(
    this._completeUri,
    function (data, resolve) {
      that._data = data;
      resolve();
    },
    function (reject) {
      reject();
    }
  );
};

function sameSide(p1, p2, a, b) {
  const ab = {};
  const ap1 = {};
  const ap2 = {};
  const cp1 = {};
  const cp2 = {};
  Cartesian3.subtract(b, a, ab);
  Cartesian3.cross(ab, Cartesian3.subtract(p1, a, ap1), cp1);
  Cartesian3.cross(ab, Cartesian3.subtract(p2, a, ap2), cp2);
  return Cartesian3.dot(cp1, cp2) >= 0;
}

/**
 * Find a triangle touching the point px,py,pz, then return the vertex closest to the search point
 * @param {number} [px] the x component of the point to query
 * @param {number} [py] the y component of the point to query
 * @param {number} [pz] the z component of the point to query
 * @returns {object} a structure containing the index of the closest point,
 * the squared distance from the queried point to the point that is found
 * the distance from the queried point to the point that is found
 * the queried position in local space
 * the closest position in local space
 */
I3SGeometry.prototype.getClosestPointIndexOnTriangle = function (px, py, pz) {
  if (this.customAttributes && this.customAttributes.positions) {
    // convert queried position to local
    const position = new Cartesian3(px, py, pz);

    position.x -= this.customAttributes.cartesianCenter.x;
    position.y -= this.customAttributes.cartesianCenter.y;
    position.z -= this.customAttributes.cartesianCenter.z;
    Matrix3.multiplyByVector(
      this.customAttributes.parentRotation,
      position,
      position
    );

    let bestTriDist = Number.MAX_VALUE;
    let bestTri;
    let bestDistSq;
    let bestIndex;
    let bestPt;

    // Brute force lookup, @TODO: this can be improved with a spatial partitioning search system
    const positions = this.customAttributes.positions;
    const indices = this.customAttributes.indices;

    //We may have indexed or non-indexed triangles here
    let triCount;
    if (indices) {
      triCount = indices.length;
    } else {
      triCount = positions.length / 3;
    }

    for (let triIndex = 0; triIndex < triCount; triIndex++) {
      let i0, i1, i2;
      if (indices) {
        i0 = indices[triIndex];
        i1 = indices[triIndex + 1];
        i2 = indices[triIndex + 2];
      } else {
        i0 = triIndex * 3;
        i1 = triIndex * 3 + 3;
        i2 = triIndex * 3 + 6;
      }

      const v0 = new Cartesian3(
        positions[i0 * 3],
        positions[i0 * 3 + 1],
        positions[i0 * 3 + 2]
      );
      const v1 = new Cartesian3(
        positions[i1 * 3],
        positions[i1 * 3 + 1],
        positions[i1 * 3 + 2]
      );
      const v2 = new Cartesian3(
        positions[i2 * 3],
        positions[i2 * 3 + 1],
        positions[i2 * 3 + 2]
      );

      //Check how the point is positioned relative to the triangle.
      //This will tell us whether the projection of the point in the triangle's plane lands in the triangle
      if (
        !sameSide(position, v0, v1, v2) ||
        !sameSide(position, v1, v0, v2) ||
        !sameSide(position, v2, v0, v1)
      ) {
        continue;
      }
      //Because of precision issues, we can't always reliably tell if the point lands directly on the face, so the most robust way is just to find the closest one
      const v0v1 = {},
        v0v2 = {},
        crossProd = {},
        normal = {};
      Cartesian3.subtract(v1, v0, v0v1);
      Cartesian3.subtract(v2, v0, v0v2);
      Cartesian3.cross(v0v1, v0v2, crossProd);

      //Skip "triangles" with 3 colinear points
      if (Cartesian3.magnitude(crossProd) === 0) {
        continue;
      }
      Cartesian3.normalize(crossProd, normal);

      const v0p = {},
        v1p = {},
        v2p = {};
      Cartesian3.subtract(position, v0, v0p);
      const normalDist = Math.abs(Cartesian3.dot(v0p, normal));
      if (normalDist < bestTriDist) {
        bestTriDist = normalDist;
        bestTri = triIndex;

        //Found a triangle, return the index of the closest point
        const d0 = Cartesian3.magnitudeSquared(
          Cartesian3.subtract(position, v0, v0p)
        );
        const d1 = Cartesian3.magnitudeSquared(
          Cartesian3.subtract(position, v1, v1p)
        );
        const d2 = Cartesian3.magnitudeSquared(
          Cartesian3.subtract(position, v2, v2p)
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

    if (bestTri !== undefined) {
      return {
        index: bestIndex,
        distanceSquared: bestDistSq,
        distance: Math.sqrt(bestDistSq),
        queriedPosition: {
          x: position.x,
          y: position.y,
          z: position.z,
        },
        closestPosition: {
          x: bestPt.x,
          y: bestPt.y,
          z: bestPt.z,
        },
      };
    }
  }

  //No hits found
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
  let query = "";
  if (this._dataProvider._query && this._dataProvider._query !== "") {
    query = `?${this._dataProvider._query}`;
  }

  // Get the material definition
  const materialInfo = this._parent._data.mesh
    ? this._parent._data.mesh.material
    : null;
  let materialIndex = 0;
  let isTextured = false;
  let gltfMaterial = {
    pbrMetallicRoughness: {
      metallicFactor: 0.0,
    },
    doubleSided: true,
    name: "Material",
  };

  if (materialInfo) {
    materialIndex = materialInfo.definition;
  }

  let materialDefinition;
  if (this._layer._data.materialDefinitions) {
    materialDefinition = this._layer._data.materialDefinitions[materialIndex];
  }

  if (materialDefinition) {
    gltfMaterial = materialDefinition;

    // Textured. @TODO: extend to other textured cases
    if (
      materialDefinition.pbrMetallicRoughness &&
      materialDefinition.pbrMetallicRoughness.baseColorTexture
    ) {
      isTextured = true;
    }
  }

  let texturePath;

  if (this._parent._data.textureData) {
    texturePath = `${this._parent._completeUriWithoutQuery}/${this._parent._data.textureData[0].href}${query}`;
  } else {
    // Choose the JPG for the texture
    let textureName = "0";

    if (this._layer._data.textureSetDefinitions) {
      for (
        let defIndex = 0;
        defIndex < this._layer._data.textureSetDefinitions.length;
        defIndex++
      ) {
        const textureSetDefinition = this._layer._data.textureSetDefinitions[
          defIndex
        ];
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

    if (this._parent._data.mesh) {
      texturePath = `${this._layer._completeUriWithoutQuery}/nodes/${this._parent._data.mesh.material.resource}/textures/${textureName}${query}`;
    }
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

    gltfMaterial.pbrMetallicRoughness.baseColorTexture.index = 0;
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
 * This class implements an I3S Field which is custom data attachec
 * to nodes
 * @private
 * @alias I3SField
 * @constructor
 * @param {I3SNode} [parent] The parent of that geometry
 * @param {Object} [storageInfo] The structure containing the storage info of the field
 */
function I3SField(parent, storageInfo) {
  this._storageInfo = storageInfo;
  this._parent = parent;
  this._dataProvider = parent._dataProvider;
  this._uri = `/attributes/${storageInfo.key}/0`;
  let query = "";
  if (this._dataProvider._query && this._dataProvider._query !== "") {
    query = `?${this._dataProvider._query}`;
  }

  this._completeUriWithoutQuery =
    this._parent._completeUriWithoutQuery + this._uri;
  this._completeUri = this._completeUriWithoutQuery + query;
}

Object.defineProperties(I3SField.prototype, {
  /**
   * Gets the uri for the field.
   * @memberof I3SField.prototype
   * @type {string}
   */
  uri: {
    get: function () {
      return this._uri;
    },
  },
  /**
   * Gets the complete uri for the field.
   * @memberof I3SField.prototype
   * @type {string}
   */
  completeUri: {
    get: function () {
      return this._completeUri;
    },
  },
  /**
   * Gets the header for this field.
   * @memberof I3SField.prototype
   * @type {Object}
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
   */
  values: {
    get: function () {
      return this._values && this._values.attributeValues
        ? this._values.attributeValues
        : [];
    },
  },
  /**
   * Gets the name for the field.
   * @memberof I3SField.prototype
   * @type {string}
   */
  name: {
    get: function () {
      return this._storageInfo.name;
    },
  },
});

/**
 * Loads the content.
 * @returns {Promise<void>} a promise that is resolved when the geometry data is loaded
 */
I3SField.prototype.load = function () {
  const that = this;
  return this._dataProvider._loadBinary(
    this._completeUri,
    function (data, resolve) {
      // check if we have a 404
      const dataView = new DataView(data);
      let success = true;
      if (dataView.getUint8(0) === "{".charCodeAt(0)) {
        const textContent = new TextDecoder();
        const str = textContent.decode(data);
        if (str.includes("404")) {
          success = false;
          console.error("Failed to load:", that._completeUri);
        }
      }

      if (success) {
        that._data = data;
        let offset = that._parseHeader(dataView);

        // @TODO: find out why we must skip 4 bytes when the value type is float 64
        if (
          that._storageInfo &&
          that._storageInfo.attributeValues &&
          that._storageInfo.attributeValues.valueType === "Float64"
        ) {
          offset += 4;
        }

        that._parseBody(dataView, offset);
      }

      resolve();
    },
    function (reject) {
      reject();
    }
  );
};

/**
 * @private
 */
I3SField.prototype._parseValue = function (dataView, type, offset) {
  let value = null;
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
  } else if (type === "Float32") {
    value = dataView.getFloat32(offset, true);
    offset += 4;
  } else if (type === "UInt64") {
    value = dataView.getUint64(offset, true);
    offset += 8;
  } else if (type === "Int64") {
    value = dataView.getInt64(offset, true);
    offset += 8;
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
    if (desc) {
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
            stringContent += curParsedValue.value;
            offset = curParsedValue.offset;
          }
          this._values[item].push(stringContent);
        }
      }
    }
  }
};

export default I3SNode;
