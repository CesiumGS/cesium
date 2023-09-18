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
  CylinderGeometryLibrary_default
} from "./chunk-4DO5CWC4.js";
import {
  GeometryOffsetAttribute_default
} from "./chunk-DXQTOATV.js";
import {
  VertexFormat_default
} from "./chunk-HWW4AAWK.js";
import {
  IndexDatatype_default
} from "./chunk-VOS2BACB.js";
import {
  GeometryAttributes_default
} from "./chunk-CHKMKWJP.js";
import {
  GeometryAttribute_default,
  Geometry_default,
  PrimitiveType_default
} from "./chunk-LBUZCHJN.js";
import {
  BoundingSphere_default
} from "./chunk-FS4DCO6P.js";
import {
  Cartesian2_default
} from "./chunk-5G2JRFMX.js";
import {
  ComponentDatatype_default
} from "./chunk-3UWS6LZS.js";
import {
  Cartesian3_default
} from "./chunk-A7FTZEKI.js";
import {
  Math_default
} from "./chunk-DPAUXJXY.js";
import {
  defaultValue_default
} from "./chunk-63W23YZY.js";
import {
  DeveloperError_default
} from "./chunk-J64Y4DQH.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/CylinderGeometry.js
var radiusScratch = new Cartesian2_default();
var normalScratch = new Cartesian3_default();
var bitangentScratch = new Cartesian3_default();
var tangentScratch = new Cartesian3_default();
var positionScratch = new Cartesian3_default();
function CylinderGeometry(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  const length = options.length;
  const topRadius = options.topRadius;
  const bottomRadius = options.bottomRadius;
  const vertexFormat = defaultValue_default(options.vertexFormat, VertexFormat_default.DEFAULT);
  const slices = defaultValue_default(options.slices, 128);
  if (!defined_default(length)) {
    throw new DeveloperError_default("options.length must be defined.");
  }
  if (!defined_default(topRadius)) {
    throw new DeveloperError_default("options.topRadius must be defined.");
  }
  if (!defined_default(bottomRadius)) {
    throw new DeveloperError_default("options.bottomRadius must be defined.");
  }
  if (slices < 3) {
    throw new DeveloperError_default(
      "options.slices must be greater than or equal to 3."
    );
  }
  if (defined_default(options.offsetAttribute) && options.offsetAttribute === GeometryOffsetAttribute_default.TOP) {
    throw new DeveloperError_default(
      "GeometryOffsetAttribute.TOP is not a supported options.offsetAttribute for this geometry."
    );
  }
  this._length = length;
  this._topRadius = topRadius;
  this._bottomRadius = bottomRadius;
  this._vertexFormat = VertexFormat_default.clone(vertexFormat);
  this._slices = slices;
  this._offsetAttribute = options.offsetAttribute;
  this._workerName = "createCylinderGeometry";
}
CylinderGeometry.packedLength = VertexFormat_default.packedLength + 5;
CylinderGeometry.pack = function(value, array, startingIndex) {
  if (!defined_default(value)) {
    throw new DeveloperError_default("value is required");
  }
  if (!defined_default(array)) {
    throw new DeveloperError_default("array is required");
  }
  startingIndex = defaultValue_default(startingIndex, 0);
  VertexFormat_default.pack(value._vertexFormat, array, startingIndex);
  startingIndex += VertexFormat_default.packedLength;
  array[startingIndex++] = value._length;
  array[startingIndex++] = value._topRadius;
  array[startingIndex++] = value._bottomRadius;
  array[startingIndex++] = value._slices;
  array[startingIndex] = defaultValue_default(value._offsetAttribute, -1);
  return array;
};
var scratchVertexFormat = new VertexFormat_default();
var scratchOptions = {
  vertexFormat: scratchVertexFormat,
  length: void 0,
  topRadius: void 0,
  bottomRadius: void 0,
  slices: void 0,
  offsetAttribute: void 0
};
CylinderGeometry.unpack = function(array, startingIndex, result) {
  if (!defined_default(array)) {
    throw new DeveloperError_default("array is required");
  }
  startingIndex = defaultValue_default(startingIndex, 0);
  const vertexFormat = VertexFormat_default.unpack(
    array,
    startingIndex,
    scratchVertexFormat
  );
  startingIndex += VertexFormat_default.packedLength;
  const length = array[startingIndex++];
  const topRadius = array[startingIndex++];
  const bottomRadius = array[startingIndex++];
  const slices = array[startingIndex++];
  const offsetAttribute = array[startingIndex];
  if (!defined_default(result)) {
    scratchOptions.length = length;
    scratchOptions.topRadius = topRadius;
    scratchOptions.bottomRadius = bottomRadius;
    scratchOptions.slices = slices;
    scratchOptions.offsetAttribute = offsetAttribute === -1 ? void 0 : offsetAttribute;
    return new CylinderGeometry(scratchOptions);
  }
  result._vertexFormat = VertexFormat_default.clone(vertexFormat, result._vertexFormat);
  result._length = length;
  result._topRadius = topRadius;
  result._bottomRadius = bottomRadius;
  result._slices = slices;
  result._offsetAttribute = offsetAttribute === -1 ? void 0 : offsetAttribute;
  return result;
};
CylinderGeometry.createGeometry = function(cylinderGeometry) {
  let length = cylinderGeometry._length;
  const topRadius = cylinderGeometry._topRadius;
  const bottomRadius = cylinderGeometry._bottomRadius;
  const vertexFormat = cylinderGeometry._vertexFormat;
  const slices = cylinderGeometry._slices;
  if (length <= 0 || topRadius < 0 || bottomRadius < 0 || topRadius === 0 && bottomRadius === 0) {
    return;
  }
  const twoSlices = slices + slices;
  const threeSlices = slices + twoSlices;
  const numVertices = twoSlices + twoSlices;
  const positions = CylinderGeometryLibrary_default.computePositions(
    length,
    topRadius,
    bottomRadius,
    slices,
    true
  );
  const st = vertexFormat.st ? new Float32Array(numVertices * 2) : void 0;
  const normals = vertexFormat.normal ? new Float32Array(numVertices * 3) : void 0;
  const tangents = vertexFormat.tangent ? new Float32Array(numVertices * 3) : void 0;
  const bitangents = vertexFormat.bitangent ? new Float32Array(numVertices * 3) : void 0;
  let i;
  const computeNormal = vertexFormat.normal || vertexFormat.tangent || vertexFormat.bitangent;
  if (computeNormal) {
    const computeTangent = vertexFormat.tangent || vertexFormat.bitangent;
    let normalIndex = 0;
    let tangentIndex = 0;
    let bitangentIndex = 0;
    const theta = Math.atan2(bottomRadius - topRadius, length);
    const normal = normalScratch;
    normal.z = Math.sin(theta);
    const normalScale = Math.cos(theta);
    let tangent = tangentScratch;
    let bitangent = bitangentScratch;
    for (i = 0; i < slices; i++) {
      const angle = i / slices * Math_default.TWO_PI;
      const x = normalScale * Math.cos(angle);
      const y = normalScale * Math.sin(angle);
      if (computeNormal) {
        normal.x = x;
        normal.y = y;
        if (computeTangent) {
          tangent = Cartesian3_default.normalize(
            Cartesian3_default.cross(Cartesian3_default.UNIT_Z, normal, tangent),
            tangent
          );
        }
        if (vertexFormat.normal) {
          normals[normalIndex++] = normal.x;
          normals[normalIndex++] = normal.y;
          normals[normalIndex++] = normal.z;
          normals[normalIndex++] = normal.x;
          normals[normalIndex++] = normal.y;
          normals[normalIndex++] = normal.z;
        }
        if (vertexFormat.tangent) {
          tangents[tangentIndex++] = tangent.x;
          tangents[tangentIndex++] = tangent.y;
          tangents[tangentIndex++] = tangent.z;
          tangents[tangentIndex++] = tangent.x;
          tangents[tangentIndex++] = tangent.y;
          tangents[tangentIndex++] = tangent.z;
        }
        if (vertexFormat.bitangent) {
          bitangent = Cartesian3_default.normalize(
            Cartesian3_default.cross(normal, tangent, bitangent),
            bitangent
          );
          bitangents[bitangentIndex++] = bitangent.x;
          bitangents[bitangentIndex++] = bitangent.y;
          bitangents[bitangentIndex++] = bitangent.z;
          bitangents[bitangentIndex++] = bitangent.x;
          bitangents[bitangentIndex++] = bitangent.y;
          bitangents[bitangentIndex++] = bitangent.z;
        }
      }
    }
    for (i = 0; i < slices; i++) {
      if (vertexFormat.normal) {
        normals[normalIndex++] = 0;
        normals[normalIndex++] = 0;
        normals[normalIndex++] = -1;
      }
      if (vertexFormat.tangent) {
        tangents[tangentIndex++] = 1;
        tangents[tangentIndex++] = 0;
        tangents[tangentIndex++] = 0;
      }
      if (vertexFormat.bitangent) {
        bitangents[bitangentIndex++] = 0;
        bitangents[bitangentIndex++] = -1;
        bitangents[bitangentIndex++] = 0;
      }
    }
    for (i = 0; i < slices; i++) {
      if (vertexFormat.normal) {
        normals[normalIndex++] = 0;
        normals[normalIndex++] = 0;
        normals[normalIndex++] = 1;
      }
      if (vertexFormat.tangent) {
        tangents[tangentIndex++] = 1;
        tangents[tangentIndex++] = 0;
        tangents[tangentIndex++] = 0;
      }
      if (vertexFormat.bitangent) {
        bitangents[bitangentIndex++] = 0;
        bitangents[bitangentIndex++] = 1;
        bitangents[bitangentIndex++] = 0;
      }
    }
  }
  const numIndices = 12 * slices - 12;
  const indices = IndexDatatype_default.createTypedArray(numVertices, numIndices);
  let index = 0;
  let j = 0;
  for (i = 0; i < slices - 1; i++) {
    indices[index++] = j;
    indices[index++] = j + 2;
    indices[index++] = j + 3;
    indices[index++] = j;
    indices[index++] = j + 3;
    indices[index++] = j + 1;
    j += 2;
  }
  indices[index++] = twoSlices - 2;
  indices[index++] = 0;
  indices[index++] = 1;
  indices[index++] = twoSlices - 2;
  indices[index++] = 1;
  indices[index++] = twoSlices - 1;
  for (i = 1; i < slices - 1; i++) {
    indices[index++] = twoSlices + i + 1;
    indices[index++] = twoSlices + i;
    indices[index++] = twoSlices;
  }
  for (i = 1; i < slices - 1; i++) {
    indices[index++] = threeSlices;
    indices[index++] = threeSlices + i;
    indices[index++] = threeSlices + i + 1;
  }
  let textureCoordIndex = 0;
  if (vertexFormat.st) {
    const rad = Math.max(topRadius, bottomRadius);
    for (i = 0; i < numVertices; i++) {
      const position = Cartesian3_default.fromArray(positions, i * 3, positionScratch);
      st[textureCoordIndex++] = (position.x + rad) / (2 * rad);
      st[textureCoordIndex++] = (position.y + rad) / (2 * rad);
    }
  }
  const attributes = new GeometryAttributes_default();
  if (vertexFormat.position) {
    attributes.position = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.DOUBLE,
      componentsPerAttribute: 3,
      values: positions
    });
  }
  if (vertexFormat.normal) {
    attributes.normal = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 3,
      values: normals
    });
  }
  if (vertexFormat.tangent) {
    attributes.tangent = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 3,
      values: tangents
    });
  }
  if (vertexFormat.bitangent) {
    attributes.bitangent = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 3,
      values: bitangents
    });
  }
  if (vertexFormat.st) {
    attributes.st = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 2,
      values: st
    });
  }
  radiusScratch.x = length * 0.5;
  radiusScratch.y = Math.max(bottomRadius, topRadius);
  const boundingSphere = new BoundingSphere_default(
    Cartesian3_default.ZERO,
    Cartesian2_default.magnitude(radiusScratch)
  );
  if (defined_default(cylinderGeometry._offsetAttribute)) {
    length = positions.length;
    const offsetValue = cylinderGeometry._offsetAttribute === GeometryOffsetAttribute_default.NONE ? 0 : 1;
    const applyOffset = new Uint8Array(length / 3).fill(offsetValue);
    attributes.applyOffset = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.UNSIGNED_BYTE,
      componentsPerAttribute: 1,
      values: applyOffset
    });
  }
  return new Geometry_default({
    attributes,
    indices,
    primitiveType: PrimitiveType_default.TRIANGLES,
    boundingSphere,
    offsetAttribute: cylinderGeometry._offsetAttribute
  });
};
var unitCylinderGeometry;
CylinderGeometry.getUnitCylinder = function() {
  if (!defined_default(unitCylinderGeometry)) {
    unitCylinderGeometry = CylinderGeometry.createGeometry(
      new CylinderGeometry({
        topRadius: 1,
        bottomRadius: 1,
        length: 1,
        vertexFormat: VertexFormat_default.POSITION_ONLY
      })
    );
  }
  return unitCylinderGeometry;
};
var CylinderGeometry_default = CylinderGeometry;

export {
  CylinderGeometry_default
};
