/**
 * @license
 * Cesium - https://github.com/CesiumGS/cesium
 * Version 1.109
 *
 * Copyright 2011-2022 Cesium Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Columbus View (Pat. Pend.)
 *
 * Portions licensed separately.
 * See https://github.com/CesiumGS/cesium/blob/main/LICENSE.md for full licensing details.
 */

import {
  WebMercatorProjection_default
} from "./chunk-BWREGNKG.js";
import {
  GeometryPipeline_default
} from "./chunk-NMEDZZL7.js";
import {
  IndexDatatype_default
} from "./chunk-VOS2BACB.js";
import {
  GeometryAttributes_default
} from "./chunk-CHKMKWJP.js";
import {
  GeometryAttribute_default,
  Geometry_default
} from "./chunk-LBUZCHJN.js";
import {
  BoundingSphere_default,
  GeographicProjection_default
} from "./chunk-FS4DCO6P.js";
import {
  Matrix4_default
} from "./chunk-5G2JRFMX.js";
import {
  ComponentDatatype_default
} from "./chunk-3UWS6LZS.js";
import {
  Ellipsoid_default
} from "./chunk-A7FTZEKI.js";
import {
  defaultValue_default
} from "./chunk-63W23YZY.js";
import {
  Check_default,
  DeveloperError_default
} from "./chunk-J64Y4DQH.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/OffsetGeometryInstanceAttribute.js
function OffsetGeometryInstanceAttribute(x, y, z) {
  x = defaultValue_default(x, 0);
  y = defaultValue_default(y, 0);
  z = defaultValue_default(z, 0);
  this.value = new Float32Array([x, y, z]);
}
Object.defineProperties(OffsetGeometryInstanceAttribute.prototype, {
  /**
   * The datatype of each component in the attribute, e.g., individual elements in
   * {@link OffsetGeometryInstanceAttribute#value}.
   *
   * @memberof OffsetGeometryInstanceAttribute.prototype
   *
   * @type {ComponentDatatype}
   * @readonly
   *
   * @default {@link ComponentDatatype.FLOAT}
   */
  componentDatatype: {
    get: function() {
      return ComponentDatatype_default.FLOAT;
    }
  },
  /**
   * The number of components in the attributes, i.e., {@link OffsetGeometryInstanceAttribute#value}.
   *
   * @memberof OffsetGeometryInstanceAttribute.prototype
   *
   * @type {number}
   * @readonly
   *
   * @default 3
   */
  componentsPerAttribute: {
    get: function() {
      return 3;
    }
  },
  /**
   * When <code>true</code> and <code>componentDatatype</code> is an integer format,
   * indicate that the components should be mapped to the range [0, 1] (unsigned)
   * or [-1, 1] (signed) when they are accessed as floating-point for rendering.
   *
   * @memberof OffsetGeometryInstanceAttribute.prototype
   *
   * @type {boolean}
   * @readonly
   *
   * @default false
   */
  normalize: {
    get: function() {
      return false;
    }
  }
});
OffsetGeometryInstanceAttribute.fromCartesian3 = function(offset) {
  Check_default.defined("offset", offset);
  return new OffsetGeometryInstanceAttribute(offset.x, offset.y, offset.z);
};
OffsetGeometryInstanceAttribute.toValue = function(offset, result) {
  Check_default.defined("offset", offset);
  if (!defined_default(result)) {
    result = new Float32Array([offset.x, offset.y, offset.z]);
  }
  result[0] = offset.x;
  result[1] = offset.y;
  result[2] = offset.z;
  return result;
};
var OffsetGeometryInstanceAttribute_default = OffsetGeometryInstanceAttribute;

// packages/engine/Source/Scene/PrimitivePipeline.js
function transformToWorldCoordinates(instances, primitiveModelMatrix, scene3DOnly) {
  let toWorld = !scene3DOnly;
  const length = instances.length;
  let i;
  if (!toWorld && length > 1) {
    const modelMatrix = instances[0].modelMatrix;
    for (i = 1; i < length; ++i) {
      if (!Matrix4_default.equals(modelMatrix, instances[i].modelMatrix)) {
        toWorld = true;
        break;
      }
    }
  }
  if (toWorld) {
    for (i = 0; i < length; ++i) {
      if (defined_default(instances[i].geometry)) {
        GeometryPipeline_default.transformToWorldCoordinates(instances[i]);
      }
    }
  } else {
    Matrix4_default.multiplyTransformation(
      primitiveModelMatrix,
      instances[0].modelMatrix,
      primitiveModelMatrix
    );
  }
}
function addGeometryBatchId(geometry, batchId) {
  const attributes = geometry.attributes;
  const positionAttr = attributes.position;
  const numberOfComponents = positionAttr.values.length / positionAttr.componentsPerAttribute;
  attributes.batchId = new GeometryAttribute_default({
    componentDatatype: ComponentDatatype_default.FLOAT,
    componentsPerAttribute: 1,
    values: new Float32Array(numberOfComponents)
  });
  const values = attributes.batchId.values;
  for (let j = 0; j < numberOfComponents; ++j) {
    values[j] = batchId;
  }
}
function addBatchIds(instances) {
  const length = instances.length;
  for (let i = 0; i < length; ++i) {
    const instance = instances[i];
    if (defined_default(instance.geometry)) {
      addGeometryBatchId(instance.geometry, i);
    } else if (defined_default(instance.westHemisphereGeometry) && defined_default(instance.eastHemisphereGeometry)) {
      addGeometryBatchId(instance.westHemisphereGeometry, i);
      addGeometryBatchId(instance.eastHemisphereGeometry, i);
    }
  }
}
function geometryPipeline(parameters) {
  const instances = parameters.instances;
  const projection = parameters.projection;
  const uintIndexSupport = parameters.elementIndexUintSupported;
  const scene3DOnly = parameters.scene3DOnly;
  const vertexCacheOptimize = parameters.vertexCacheOptimize;
  const compressVertices = parameters.compressVertices;
  const modelMatrix = parameters.modelMatrix;
  let i;
  let geometry;
  let primitiveType;
  let length = instances.length;
  for (i = 0; i < length; ++i) {
    if (defined_default(instances[i].geometry)) {
      primitiveType = instances[i].geometry.primitiveType;
      break;
    }
  }
  for (i = 1; i < length; ++i) {
    if (defined_default(instances[i].geometry) && instances[i].geometry.primitiveType !== primitiveType) {
      throw new DeveloperError_default(
        "All instance geometries must have the same primitiveType."
      );
    }
  }
  transformToWorldCoordinates(instances, modelMatrix, scene3DOnly);
  if (!scene3DOnly) {
    for (i = 0; i < length; ++i) {
      if (defined_default(instances[i].geometry)) {
        GeometryPipeline_default.splitLongitude(instances[i]);
      }
    }
  }
  addBatchIds(instances);
  if (vertexCacheOptimize) {
    for (i = 0; i < length; ++i) {
      const instance = instances[i];
      if (defined_default(instance.geometry)) {
        GeometryPipeline_default.reorderForPostVertexCache(instance.geometry);
        GeometryPipeline_default.reorderForPreVertexCache(instance.geometry);
      } else if (defined_default(instance.westHemisphereGeometry) && defined_default(instance.eastHemisphereGeometry)) {
        GeometryPipeline_default.reorderForPostVertexCache(
          instance.westHemisphereGeometry
        );
        GeometryPipeline_default.reorderForPreVertexCache(
          instance.westHemisphereGeometry
        );
        GeometryPipeline_default.reorderForPostVertexCache(
          instance.eastHemisphereGeometry
        );
        GeometryPipeline_default.reorderForPreVertexCache(
          instance.eastHemisphereGeometry
        );
      }
    }
  }
  let geometries = GeometryPipeline_default.combineInstances(instances);
  length = geometries.length;
  for (i = 0; i < length; ++i) {
    geometry = geometries[i];
    const attributes = geometry.attributes;
    if (!scene3DOnly) {
      for (const name in attributes) {
        if (attributes.hasOwnProperty(name) && attributes[name].componentDatatype === ComponentDatatype_default.DOUBLE) {
          const name3D = `${name}3D`;
          const name2D = `${name}2D`;
          GeometryPipeline_default.projectTo2D(
            geometry,
            name,
            name3D,
            name2D,
            projection
          );
          if (defined_default(geometry.boundingSphere) && name === "position") {
            geometry.boundingSphereCV = BoundingSphere_default.fromVertices(
              geometry.attributes.position2D.values
            );
          }
          GeometryPipeline_default.encodeAttribute(
            geometry,
            name3D,
            `${name3D}High`,
            `${name3D}Low`
          );
          GeometryPipeline_default.encodeAttribute(
            geometry,
            name2D,
            `${name2D}High`,
            `${name2D}Low`
          );
        }
      }
    } else {
      for (const name in attributes) {
        if (attributes.hasOwnProperty(name) && attributes[name].componentDatatype === ComponentDatatype_default.DOUBLE) {
          GeometryPipeline_default.encodeAttribute(
            geometry,
            name,
            `${name}3DHigh`,
            `${name}3DLow`
          );
        }
      }
    }
    if (compressVertices) {
      GeometryPipeline_default.compressVertices(geometry);
    }
  }
  if (!uintIndexSupport) {
    let splitGeometries = [];
    length = geometries.length;
    for (i = 0; i < length; ++i) {
      geometry = geometries[i];
      splitGeometries = splitGeometries.concat(
        GeometryPipeline_default.fitToUnsignedShortIndices(geometry)
      );
    }
    geometries = splitGeometries;
  }
  return geometries;
}
function createPickOffsets(instances, geometryName, geometries, pickOffsets) {
  let offset;
  let indexCount;
  let geometryIndex;
  const offsetIndex = pickOffsets.length - 1;
  if (offsetIndex >= 0) {
    const pickOffset = pickOffsets[offsetIndex];
    offset = pickOffset.offset + pickOffset.count;
    geometryIndex = pickOffset.index;
    indexCount = geometries[geometryIndex].indices.length;
  } else {
    offset = 0;
    geometryIndex = 0;
    indexCount = geometries[geometryIndex].indices.length;
  }
  const length = instances.length;
  for (let i = 0; i < length; ++i) {
    const instance = instances[i];
    const geometry = instance[geometryName];
    if (!defined_default(geometry)) {
      continue;
    }
    const count = geometry.indices.length;
    if (offset + count > indexCount) {
      offset = 0;
      indexCount = geometries[++geometryIndex].indices.length;
    }
    pickOffsets.push({
      index: geometryIndex,
      offset,
      count
    });
    offset += count;
  }
}
function createInstancePickOffsets(instances, geometries) {
  const pickOffsets = [];
  createPickOffsets(instances, "geometry", geometries, pickOffsets);
  createPickOffsets(
    instances,
    "westHemisphereGeometry",
    geometries,
    pickOffsets
  );
  createPickOffsets(
    instances,
    "eastHemisphereGeometry",
    geometries,
    pickOffsets
  );
  return pickOffsets;
}
var PrimitivePipeline = {};
PrimitivePipeline.combineGeometry = function(parameters) {
  let geometries;
  let attributeLocations;
  const instances = parameters.instances;
  const length = instances.length;
  let pickOffsets;
  let offsetInstanceExtend;
  let hasOffset = false;
  if (length > 0) {
    geometries = geometryPipeline(parameters);
    if (geometries.length > 0) {
      attributeLocations = GeometryPipeline_default.createAttributeLocations(
        geometries[0]
      );
      if (parameters.createPickOffsets) {
        pickOffsets = createInstancePickOffsets(instances, geometries);
      }
    }
    if (defined_default(instances[0].attributes) && defined_default(instances[0].attributes.offset)) {
      offsetInstanceExtend = new Array(length);
      hasOffset = true;
    }
  }
  const boundingSpheres = new Array(length);
  const boundingSpheresCV = new Array(length);
  for (let i = 0; i < length; ++i) {
    const instance = instances[i];
    const geometry = instance.geometry;
    if (defined_default(geometry)) {
      boundingSpheres[i] = geometry.boundingSphere;
      boundingSpheresCV[i] = geometry.boundingSphereCV;
      if (hasOffset) {
        offsetInstanceExtend[i] = instance.geometry.offsetAttribute;
      }
    }
    const eastHemisphereGeometry = instance.eastHemisphereGeometry;
    const westHemisphereGeometry = instance.westHemisphereGeometry;
    if (defined_default(eastHemisphereGeometry) && defined_default(westHemisphereGeometry)) {
      if (defined_default(eastHemisphereGeometry.boundingSphere) && defined_default(westHemisphereGeometry.boundingSphere)) {
        boundingSpheres[i] = BoundingSphere_default.union(
          eastHemisphereGeometry.boundingSphere,
          westHemisphereGeometry.boundingSphere
        );
      }
      if (defined_default(eastHemisphereGeometry.boundingSphereCV) && defined_default(westHemisphereGeometry.boundingSphereCV)) {
        boundingSpheresCV[i] = BoundingSphere_default.union(
          eastHemisphereGeometry.boundingSphereCV,
          westHemisphereGeometry.boundingSphereCV
        );
      }
    }
  }
  return {
    geometries,
    modelMatrix: parameters.modelMatrix,
    attributeLocations,
    pickOffsets,
    offsetInstanceExtend,
    boundingSpheres,
    boundingSpheresCV
  };
};
function transferGeometry(geometry, transferableObjects) {
  const attributes = geometry.attributes;
  for (const name in attributes) {
    if (attributes.hasOwnProperty(name)) {
      const attribute = attributes[name];
      if (defined_default(attribute) && defined_default(attribute.values)) {
        transferableObjects.push(attribute.values.buffer);
      }
    }
  }
  if (defined_default(geometry.indices)) {
    transferableObjects.push(geometry.indices.buffer);
  }
}
function transferGeometries(geometries, transferableObjects) {
  const length = geometries.length;
  for (let i = 0; i < length; ++i) {
    transferGeometry(geometries[i], transferableObjects);
  }
}
function countCreateGeometryResults(items) {
  let count = 1;
  const length = items.length;
  for (let i = 0; i < length; i++) {
    const geometry = items[i];
    ++count;
    if (!defined_default(geometry)) {
      continue;
    }
    const attributes = geometry.attributes;
    count += 7 + 2 * BoundingSphere_default.packedLength + (defined_default(geometry.indices) ? geometry.indices.length : 0);
    for (const property in attributes) {
      if (attributes.hasOwnProperty(property) && defined_default(attributes[property])) {
        const attribute = attributes[property];
        count += 5 + attribute.values.length;
      }
    }
  }
  return count;
}
PrimitivePipeline.packCreateGeometryResults = function(items, transferableObjects) {
  const packedData = new Float64Array(countCreateGeometryResults(items));
  const stringTable = [];
  const stringHash = {};
  const length = items.length;
  let count = 0;
  packedData[count++] = length;
  for (let i = 0; i < length; i++) {
    const geometry = items[i];
    const validGeometry = defined_default(geometry);
    packedData[count++] = validGeometry ? 1 : 0;
    if (!validGeometry) {
      continue;
    }
    packedData[count++] = geometry.primitiveType;
    packedData[count++] = geometry.geometryType;
    packedData[count++] = defaultValue_default(geometry.offsetAttribute, -1);
    const validBoundingSphere = defined_default(geometry.boundingSphere) ? 1 : 0;
    packedData[count++] = validBoundingSphere;
    if (validBoundingSphere) {
      BoundingSphere_default.pack(geometry.boundingSphere, packedData, count);
    }
    count += BoundingSphere_default.packedLength;
    const validBoundingSphereCV = defined_default(geometry.boundingSphereCV) ? 1 : 0;
    packedData[count++] = validBoundingSphereCV;
    if (validBoundingSphereCV) {
      BoundingSphere_default.pack(geometry.boundingSphereCV, packedData, count);
    }
    count += BoundingSphere_default.packedLength;
    const attributes = geometry.attributes;
    const attributesToWrite = [];
    for (const property in attributes) {
      if (attributes.hasOwnProperty(property) && defined_default(attributes[property])) {
        attributesToWrite.push(property);
        if (!defined_default(stringHash[property])) {
          stringHash[property] = stringTable.length;
          stringTable.push(property);
        }
      }
    }
    packedData[count++] = attributesToWrite.length;
    for (let q = 0; q < attributesToWrite.length; q++) {
      const name = attributesToWrite[q];
      const attribute = attributes[name];
      packedData[count++] = stringHash[name];
      packedData[count++] = attribute.componentDatatype;
      packedData[count++] = attribute.componentsPerAttribute;
      packedData[count++] = attribute.normalize ? 1 : 0;
      packedData[count++] = attribute.values.length;
      packedData.set(attribute.values, count);
      count += attribute.values.length;
    }
    const indicesLength = defined_default(geometry.indices) ? geometry.indices.length : 0;
    packedData[count++] = indicesLength;
    if (indicesLength > 0) {
      packedData.set(geometry.indices, count);
      count += indicesLength;
    }
  }
  transferableObjects.push(packedData.buffer);
  return {
    stringTable,
    packedData
  };
};
PrimitivePipeline.unpackCreateGeometryResults = function(createGeometryResult) {
  const stringTable = createGeometryResult.stringTable;
  const packedGeometry = createGeometryResult.packedData;
  let i;
  const result = new Array(packedGeometry[0]);
  let resultIndex = 0;
  let packedGeometryIndex = 1;
  while (packedGeometryIndex < packedGeometry.length) {
    const valid = packedGeometry[packedGeometryIndex++] === 1;
    if (!valid) {
      result[resultIndex++] = void 0;
      continue;
    }
    const primitiveType = packedGeometry[packedGeometryIndex++];
    const geometryType = packedGeometry[packedGeometryIndex++];
    let offsetAttribute = packedGeometry[packedGeometryIndex++];
    if (offsetAttribute === -1) {
      offsetAttribute = void 0;
    }
    let boundingSphere;
    let boundingSphereCV;
    const validBoundingSphere = packedGeometry[packedGeometryIndex++] === 1;
    if (validBoundingSphere) {
      boundingSphere = BoundingSphere_default.unpack(
        packedGeometry,
        packedGeometryIndex
      );
    }
    packedGeometryIndex += BoundingSphere_default.packedLength;
    const validBoundingSphereCV = packedGeometry[packedGeometryIndex++] === 1;
    if (validBoundingSphereCV) {
      boundingSphereCV = BoundingSphere_default.unpack(
        packedGeometry,
        packedGeometryIndex
      );
    }
    packedGeometryIndex += BoundingSphere_default.packedLength;
    let length;
    let values;
    let componentsPerAttribute;
    const attributes = new GeometryAttributes_default();
    const numAttributes = packedGeometry[packedGeometryIndex++];
    for (i = 0; i < numAttributes; i++) {
      const name = stringTable[packedGeometry[packedGeometryIndex++]];
      const componentDatatype = packedGeometry[packedGeometryIndex++];
      componentsPerAttribute = packedGeometry[packedGeometryIndex++];
      const normalize = packedGeometry[packedGeometryIndex++] !== 0;
      length = packedGeometry[packedGeometryIndex++];
      values = ComponentDatatype_default.createTypedArray(componentDatatype, length);
      for (let valuesIndex = 0; valuesIndex < length; valuesIndex++) {
        values[valuesIndex] = packedGeometry[packedGeometryIndex++];
      }
      attributes[name] = new GeometryAttribute_default({
        componentDatatype,
        componentsPerAttribute,
        normalize,
        values
      });
    }
    let indices;
    length = packedGeometry[packedGeometryIndex++];
    if (length > 0) {
      const numberOfVertices = values.length / componentsPerAttribute;
      indices = IndexDatatype_default.createTypedArray(numberOfVertices, length);
      for (i = 0; i < length; i++) {
        indices[i] = packedGeometry[packedGeometryIndex++];
      }
    }
    result[resultIndex++] = new Geometry_default({
      primitiveType,
      geometryType,
      boundingSphere,
      boundingSphereCV,
      indices,
      attributes,
      offsetAttribute
    });
  }
  return result;
};
function packInstancesForCombine(instances, transferableObjects) {
  const length = instances.length;
  const packedData = new Float64Array(1 + length * 19);
  let count = 0;
  packedData[count++] = length;
  for (let i = 0; i < length; i++) {
    const instance = instances[i];
    Matrix4_default.pack(instance.modelMatrix, packedData, count);
    count += Matrix4_default.packedLength;
    if (defined_default(instance.attributes) && defined_default(instance.attributes.offset)) {
      const values = instance.attributes.offset.value;
      packedData[count] = values[0];
      packedData[count + 1] = values[1];
      packedData[count + 2] = values[2];
    }
    count += 3;
  }
  transferableObjects.push(packedData.buffer);
  return packedData;
}
function unpackInstancesForCombine(data) {
  const packedInstances = data;
  const result = new Array(packedInstances[0]);
  let count = 0;
  let i = 1;
  while (i < packedInstances.length) {
    const modelMatrix = Matrix4_default.unpack(packedInstances, i);
    let attributes;
    i += Matrix4_default.packedLength;
    if (defined_default(packedInstances[i])) {
      attributes = {
        offset: new OffsetGeometryInstanceAttribute_default(
          packedInstances[i],
          packedInstances[i + 1],
          packedInstances[i + 2]
        )
      };
    }
    i += 3;
    result[count++] = {
      modelMatrix,
      attributes
    };
  }
  return result;
}
PrimitivePipeline.packCombineGeometryParameters = function(parameters, transferableObjects) {
  const createGeometryResults = parameters.createGeometryResults;
  const length = createGeometryResults.length;
  for (let i = 0; i < length; i++) {
    transferableObjects.push(createGeometryResults[i].packedData.buffer);
  }
  return {
    createGeometryResults: parameters.createGeometryResults,
    packedInstances: packInstancesForCombine(
      parameters.instances,
      transferableObjects
    ),
    ellipsoid: parameters.ellipsoid,
    isGeographic: parameters.projection instanceof GeographicProjection_default,
    elementIndexUintSupported: parameters.elementIndexUintSupported,
    scene3DOnly: parameters.scene3DOnly,
    vertexCacheOptimize: parameters.vertexCacheOptimize,
    compressVertices: parameters.compressVertices,
    modelMatrix: parameters.modelMatrix,
    createPickOffsets: parameters.createPickOffsets
  };
};
PrimitivePipeline.unpackCombineGeometryParameters = function(packedParameters) {
  const instances = unpackInstancesForCombine(packedParameters.packedInstances);
  const createGeometryResults = packedParameters.createGeometryResults;
  const length = createGeometryResults.length;
  let instanceIndex = 0;
  for (let resultIndex = 0; resultIndex < length; resultIndex++) {
    const geometries = PrimitivePipeline.unpackCreateGeometryResults(
      createGeometryResults[resultIndex]
    );
    const geometriesLength = geometries.length;
    for (let geometryIndex = 0; geometryIndex < geometriesLength; geometryIndex++) {
      const geometry = geometries[geometryIndex];
      const instance = instances[instanceIndex];
      instance.geometry = geometry;
      ++instanceIndex;
    }
  }
  const ellipsoid = Ellipsoid_default.clone(packedParameters.ellipsoid);
  const projection = packedParameters.isGeographic ? new GeographicProjection_default(ellipsoid) : new WebMercatorProjection_default(ellipsoid);
  return {
    instances,
    ellipsoid,
    projection,
    elementIndexUintSupported: packedParameters.elementIndexUintSupported,
    scene3DOnly: packedParameters.scene3DOnly,
    vertexCacheOptimize: packedParameters.vertexCacheOptimize,
    compressVertices: packedParameters.compressVertices,
    modelMatrix: Matrix4_default.clone(packedParameters.modelMatrix),
    createPickOffsets: packedParameters.createPickOffsets
  };
};
function packBoundingSpheres(boundingSpheres) {
  const length = boundingSpheres.length;
  const bufferLength = 1 + (BoundingSphere_default.packedLength + 1) * length;
  const buffer = new Float32Array(bufferLength);
  let bufferIndex = 0;
  buffer[bufferIndex++] = length;
  for (let i = 0; i < length; ++i) {
    const bs = boundingSpheres[i];
    if (!defined_default(bs)) {
      buffer[bufferIndex++] = 0;
    } else {
      buffer[bufferIndex++] = 1;
      BoundingSphere_default.pack(boundingSpheres[i], buffer, bufferIndex);
    }
    bufferIndex += BoundingSphere_default.packedLength;
  }
  return buffer;
}
function unpackBoundingSpheres(buffer) {
  const result = new Array(buffer[0]);
  let count = 0;
  let i = 1;
  while (i < buffer.length) {
    if (buffer[i++] === 1) {
      result[count] = BoundingSphere_default.unpack(buffer, i);
    }
    ++count;
    i += BoundingSphere_default.packedLength;
  }
  return result;
}
PrimitivePipeline.packCombineGeometryResults = function(results, transferableObjects) {
  if (defined_default(results.geometries)) {
    transferGeometries(results.geometries, transferableObjects);
  }
  const packedBoundingSpheres = packBoundingSpheres(results.boundingSpheres);
  const packedBoundingSpheresCV = packBoundingSpheres(
    results.boundingSpheresCV
  );
  transferableObjects.push(
    packedBoundingSpheres.buffer,
    packedBoundingSpheresCV.buffer
  );
  return {
    geometries: results.geometries,
    attributeLocations: results.attributeLocations,
    modelMatrix: results.modelMatrix,
    pickOffsets: results.pickOffsets,
    offsetInstanceExtend: results.offsetInstanceExtend,
    boundingSpheres: packedBoundingSpheres,
    boundingSpheresCV: packedBoundingSpheresCV
  };
};
PrimitivePipeline.unpackCombineGeometryResults = function(packedResult) {
  return {
    geometries: packedResult.geometries,
    attributeLocations: packedResult.attributeLocations,
    modelMatrix: packedResult.modelMatrix,
    pickOffsets: packedResult.pickOffsets,
    offsetInstanceExtend: packedResult.offsetInstanceExtend,
    boundingSpheres: unpackBoundingSpheres(packedResult.boundingSpheres),
    boundingSpheresCV: unpackBoundingSpheres(packedResult.boundingSpheresCV)
  };
};
var PrimitivePipeline_default = PrimitivePipeline;

export {
  PrimitivePipeline_default
};
