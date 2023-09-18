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
  GeometryOffsetAttribute_default
} from "./chunk-DXQTOATV.js";
import {
  VertexFormat_default
} from "./chunk-HWW4AAWK.js";
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
  ComponentDatatype_default
} from "./chunk-3UWS6LZS.js";
import {
  Cartesian3_default
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

// packages/engine/Source/Core/BoxGeometry.js
var diffScratch = new Cartesian3_default();
function BoxGeometry(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  const min = options.minimum;
  const max = options.maximum;
  Check_default.typeOf.object("min", min);
  Check_default.typeOf.object("max", max);
  if (defined_default(options.offsetAttribute) && options.offsetAttribute === GeometryOffsetAttribute_default.TOP) {
    throw new DeveloperError_default(
      "GeometryOffsetAttribute.TOP is not a supported options.offsetAttribute for this geometry."
    );
  }
  const vertexFormat = defaultValue_default(options.vertexFormat, VertexFormat_default.DEFAULT);
  this._minimum = Cartesian3_default.clone(min);
  this._maximum = Cartesian3_default.clone(max);
  this._vertexFormat = vertexFormat;
  this._offsetAttribute = options.offsetAttribute;
  this._workerName = "createBoxGeometry";
}
BoxGeometry.fromDimensions = function(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  const dimensions = options.dimensions;
  Check_default.typeOf.object("dimensions", dimensions);
  Check_default.typeOf.number.greaterThanOrEquals("dimensions.x", dimensions.x, 0);
  Check_default.typeOf.number.greaterThanOrEquals("dimensions.y", dimensions.y, 0);
  Check_default.typeOf.number.greaterThanOrEquals("dimensions.z", dimensions.z, 0);
  const corner = Cartesian3_default.multiplyByScalar(dimensions, 0.5, new Cartesian3_default());
  return new BoxGeometry({
    minimum: Cartesian3_default.negate(corner, new Cartesian3_default()),
    maximum: corner,
    vertexFormat: options.vertexFormat,
    offsetAttribute: options.offsetAttribute
  });
};
BoxGeometry.fromAxisAlignedBoundingBox = function(boundingBox) {
  Check_default.typeOf.object("boundingBox", boundingBox);
  return new BoxGeometry({
    minimum: boundingBox.minimum,
    maximum: boundingBox.maximum
  });
};
BoxGeometry.packedLength = 2 * Cartesian3_default.packedLength + VertexFormat_default.packedLength + 1;
BoxGeometry.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  Cartesian3_default.pack(value._minimum, array, startingIndex);
  Cartesian3_default.pack(
    value._maximum,
    array,
    startingIndex + Cartesian3_default.packedLength
  );
  VertexFormat_default.pack(
    value._vertexFormat,
    array,
    startingIndex + 2 * Cartesian3_default.packedLength
  );
  array[startingIndex + 2 * Cartesian3_default.packedLength + VertexFormat_default.packedLength] = defaultValue_default(value._offsetAttribute, -1);
  return array;
};
var scratchMin = new Cartesian3_default();
var scratchMax = new Cartesian3_default();
var scratchVertexFormat = new VertexFormat_default();
var scratchOptions = {
  minimum: scratchMin,
  maximum: scratchMax,
  vertexFormat: scratchVertexFormat,
  offsetAttribute: void 0
};
BoxGeometry.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  const min = Cartesian3_default.unpack(array, startingIndex, scratchMin);
  const max = Cartesian3_default.unpack(
    array,
    startingIndex + Cartesian3_default.packedLength,
    scratchMax
  );
  const vertexFormat = VertexFormat_default.unpack(
    array,
    startingIndex + 2 * Cartesian3_default.packedLength,
    scratchVertexFormat
  );
  const offsetAttribute = array[startingIndex + 2 * Cartesian3_default.packedLength + VertexFormat_default.packedLength];
  if (!defined_default(result)) {
    scratchOptions.offsetAttribute = offsetAttribute === -1 ? void 0 : offsetAttribute;
    return new BoxGeometry(scratchOptions);
  }
  result._minimum = Cartesian3_default.clone(min, result._minimum);
  result._maximum = Cartesian3_default.clone(max, result._maximum);
  result._vertexFormat = VertexFormat_default.clone(vertexFormat, result._vertexFormat);
  result._offsetAttribute = offsetAttribute === -1 ? void 0 : offsetAttribute;
  return result;
};
BoxGeometry.createGeometry = function(boxGeometry) {
  const min = boxGeometry._minimum;
  const max = boxGeometry._maximum;
  const vertexFormat = boxGeometry._vertexFormat;
  if (Cartesian3_default.equals(min, max)) {
    return;
  }
  const attributes = new GeometryAttributes_default();
  let indices;
  let positions;
  if (vertexFormat.position && (vertexFormat.st || vertexFormat.normal || vertexFormat.tangent || vertexFormat.bitangent)) {
    if (vertexFormat.position) {
      positions = new Float64Array(6 * 4 * 3);
      positions[0] = min.x;
      positions[1] = min.y;
      positions[2] = max.z;
      positions[3] = max.x;
      positions[4] = min.y;
      positions[5] = max.z;
      positions[6] = max.x;
      positions[7] = max.y;
      positions[8] = max.z;
      positions[9] = min.x;
      positions[10] = max.y;
      positions[11] = max.z;
      positions[12] = min.x;
      positions[13] = min.y;
      positions[14] = min.z;
      positions[15] = max.x;
      positions[16] = min.y;
      positions[17] = min.z;
      positions[18] = max.x;
      positions[19] = max.y;
      positions[20] = min.z;
      positions[21] = min.x;
      positions[22] = max.y;
      positions[23] = min.z;
      positions[24] = max.x;
      positions[25] = min.y;
      positions[26] = min.z;
      positions[27] = max.x;
      positions[28] = max.y;
      positions[29] = min.z;
      positions[30] = max.x;
      positions[31] = max.y;
      positions[32] = max.z;
      positions[33] = max.x;
      positions[34] = min.y;
      positions[35] = max.z;
      positions[36] = min.x;
      positions[37] = min.y;
      positions[38] = min.z;
      positions[39] = min.x;
      positions[40] = max.y;
      positions[41] = min.z;
      positions[42] = min.x;
      positions[43] = max.y;
      positions[44] = max.z;
      positions[45] = min.x;
      positions[46] = min.y;
      positions[47] = max.z;
      positions[48] = min.x;
      positions[49] = max.y;
      positions[50] = min.z;
      positions[51] = max.x;
      positions[52] = max.y;
      positions[53] = min.z;
      positions[54] = max.x;
      positions[55] = max.y;
      positions[56] = max.z;
      positions[57] = min.x;
      positions[58] = max.y;
      positions[59] = max.z;
      positions[60] = min.x;
      positions[61] = min.y;
      positions[62] = min.z;
      positions[63] = max.x;
      positions[64] = min.y;
      positions[65] = min.z;
      positions[66] = max.x;
      positions[67] = min.y;
      positions[68] = max.z;
      positions[69] = min.x;
      positions[70] = min.y;
      positions[71] = max.z;
      attributes.position = new GeometryAttribute_default({
        componentDatatype: ComponentDatatype_default.DOUBLE,
        componentsPerAttribute: 3,
        values: positions
      });
    }
    if (vertexFormat.normal) {
      const normals = new Float32Array(6 * 4 * 3);
      normals[0] = 0;
      normals[1] = 0;
      normals[2] = 1;
      normals[3] = 0;
      normals[4] = 0;
      normals[5] = 1;
      normals[6] = 0;
      normals[7] = 0;
      normals[8] = 1;
      normals[9] = 0;
      normals[10] = 0;
      normals[11] = 1;
      normals[12] = 0;
      normals[13] = 0;
      normals[14] = -1;
      normals[15] = 0;
      normals[16] = 0;
      normals[17] = -1;
      normals[18] = 0;
      normals[19] = 0;
      normals[20] = -1;
      normals[21] = 0;
      normals[22] = 0;
      normals[23] = -1;
      normals[24] = 1;
      normals[25] = 0;
      normals[26] = 0;
      normals[27] = 1;
      normals[28] = 0;
      normals[29] = 0;
      normals[30] = 1;
      normals[31] = 0;
      normals[32] = 0;
      normals[33] = 1;
      normals[34] = 0;
      normals[35] = 0;
      normals[36] = -1;
      normals[37] = 0;
      normals[38] = 0;
      normals[39] = -1;
      normals[40] = 0;
      normals[41] = 0;
      normals[42] = -1;
      normals[43] = 0;
      normals[44] = 0;
      normals[45] = -1;
      normals[46] = 0;
      normals[47] = 0;
      normals[48] = 0;
      normals[49] = 1;
      normals[50] = 0;
      normals[51] = 0;
      normals[52] = 1;
      normals[53] = 0;
      normals[54] = 0;
      normals[55] = 1;
      normals[56] = 0;
      normals[57] = 0;
      normals[58] = 1;
      normals[59] = 0;
      normals[60] = 0;
      normals[61] = -1;
      normals[62] = 0;
      normals[63] = 0;
      normals[64] = -1;
      normals[65] = 0;
      normals[66] = 0;
      normals[67] = -1;
      normals[68] = 0;
      normals[69] = 0;
      normals[70] = -1;
      normals[71] = 0;
      attributes.normal = new GeometryAttribute_default({
        componentDatatype: ComponentDatatype_default.FLOAT,
        componentsPerAttribute: 3,
        values: normals
      });
    }
    if (vertexFormat.st) {
      const texCoords = new Float32Array(6 * 4 * 2);
      texCoords[0] = 0;
      texCoords[1] = 0;
      texCoords[2] = 1;
      texCoords[3] = 0;
      texCoords[4] = 1;
      texCoords[5] = 1;
      texCoords[6] = 0;
      texCoords[7] = 1;
      texCoords[8] = 1;
      texCoords[9] = 0;
      texCoords[10] = 0;
      texCoords[11] = 0;
      texCoords[12] = 0;
      texCoords[13] = 1;
      texCoords[14] = 1;
      texCoords[15] = 1;
      texCoords[16] = 0;
      texCoords[17] = 0;
      texCoords[18] = 1;
      texCoords[19] = 0;
      texCoords[20] = 1;
      texCoords[21] = 1;
      texCoords[22] = 0;
      texCoords[23] = 1;
      texCoords[24] = 1;
      texCoords[25] = 0;
      texCoords[26] = 0;
      texCoords[27] = 0;
      texCoords[28] = 0;
      texCoords[29] = 1;
      texCoords[30] = 1;
      texCoords[31] = 1;
      texCoords[32] = 1;
      texCoords[33] = 0;
      texCoords[34] = 0;
      texCoords[35] = 0;
      texCoords[36] = 0;
      texCoords[37] = 1;
      texCoords[38] = 1;
      texCoords[39] = 1;
      texCoords[40] = 0;
      texCoords[41] = 0;
      texCoords[42] = 1;
      texCoords[43] = 0;
      texCoords[44] = 1;
      texCoords[45] = 1;
      texCoords[46] = 0;
      texCoords[47] = 1;
      attributes.st = new GeometryAttribute_default({
        componentDatatype: ComponentDatatype_default.FLOAT,
        componentsPerAttribute: 2,
        values: texCoords
      });
    }
    if (vertexFormat.tangent) {
      const tangents = new Float32Array(6 * 4 * 3);
      tangents[0] = 1;
      tangents[1] = 0;
      tangents[2] = 0;
      tangents[3] = 1;
      tangents[4] = 0;
      tangents[5] = 0;
      tangents[6] = 1;
      tangents[7] = 0;
      tangents[8] = 0;
      tangents[9] = 1;
      tangents[10] = 0;
      tangents[11] = 0;
      tangents[12] = -1;
      tangents[13] = 0;
      tangents[14] = 0;
      tangents[15] = -1;
      tangents[16] = 0;
      tangents[17] = 0;
      tangents[18] = -1;
      tangents[19] = 0;
      tangents[20] = 0;
      tangents[21] = -1;
      tangents[22] = 0;
      tangents[23] = 0;
      tangents[24] = 0;
      tangents[25] = 1;
      tangents[26] = 0;
      tangents[27] = 0;
      tangents[28] = 1;
      tangents[29] = 0;
      tangents[30] = 0;
      tangents[31] = 1;
      tangents[32] = 0;
      tangents[33] = 0;
      tangents[34] = 1;
      tangents[35] = 0;
      tangents[36] = 0;
      tangents[37] = -1;
      tangents[38] = 0;
      tangents[39] = 0;
      tangents[40] = -1;
      tangents[41] = 0;
      tangents[42] = 0;
      tangents[43] = -1;
      tangents[44] = 0;
      tangents[45] = 0;
      tangents[46] = -1;
      tangents[47] = 0;
      tangents[48] = -1;
      tangents[49] = 0;
      tangents[50] = 0;
      tangents[51] = -1;
      tangents[52] = 0;
      tangents[53] = 0;
      tangents[54] = -1;
      tangents[55] = 0;
      tangents[56] = 0;
      tangents[57] = -1;
      tangents[58] = 0;
      tangents[59] = 0;
      tangents[60] = 1;
      tangents[61] = 0;
      tangents[62] = 0;
      tangents[63] = 1;
      tangents[64] = 0;
      tangents[65] = 0;
      tangents[66] = 1;
      tangents[67] = 0;
      tangents[68] = 0;
      tangents[69] = 1;
      tangents[70] = 0;
      tangents[71] = 0;
      attributes.tangent = new GeometryAttribute_default({
        componentDatatype: ComponentDatatype_default.FLOAT,
        componentsPerAttribute: 3,
        values: tangents
      });
    }
    if (vertexFormat.bitangent) {
      const bitangents = new Float32Array(6 * 4 * 3);
      bitangents[0] = 0;
      bitangents[1] = 1;
      bitangents[2] = 0;
      bitangents[3] = 0;
      bitangents[4] = 1;
      bitangents[5] = 0;
      bitangents[6] = 0;
      bitangents[7] = 1;
      bitangents[8] = 0;
      bitangents[9] = 0;
      bitangents[10] = 1;
      bitangents[11] = 0;
      bitangents[12] = 0;
      bitangents[13] = 1;
      bitangents[14] = 0;
      bitangents[15] = 0;
      bitangents[16] = 1;
      bitangents[17] = 0;
      bitangents[18] = 0;
      bitangents[19] = 1;
      bitangents[20] = 0;
      bitangents[21] = 0;
      bitangents[22] = 1;
      bitangents[23] = 0;
      bitangents[24] = 0;
      bitangents[25] = 0;
      bitangents[26] = 1;
      bitangents[27] = 0;
      bitangents[28] = 0;
      bitangents[29] = 1;
      bitangents[30] = 0;
      bitangents[31] = 0;
      bitangents[32] = 1;
      bitangents[33] = 0;
      bitangents[34] = 0;
      bitangents[35] = 1;
      bitangents[36] = 0;
      bitangents[37] = 0;
      bitangents[38] = 1;
      bitangents[39] = 0;
      bitangents[40] = 0;
      bitangents[41] = 1;
      bitangents[42] = 0;
      bitangents[43] = 0;
      bitangents[44] = 1;
      bitangents[45] = 0;
      bitangents[46] = 0;
      bitangents[47] = 1;
      bitangents[48] = 0;
      bitangents[49] = 0;
      bitangents[50] = 1;
      bitangents[51] = 0;
      bitangents[52] = 0;
      bitangents[53] = 1;
      bitangents[54] = 0;
      bitangents[55] = 0;
      bitangents[56] = 1;
      bitangents[57] = 0;
      bitangents[58] = 0;
      bitangents[59] = 1;
      bitangents[60] = 0;
      bitangents[61] = 0;
      bitangents[62] = 1;
      bitangents[63] = 0;
      bitangents[64] = 0;
      bitangents[65] = 1;
      bitangents[66] = 0;
      bitangents[67] = 0;
      bitangents[68] = 1;
      bitangents[69] = 0;
      bitangents[70] = 0;
      bitangents[71] = 1;
      attributes.bitangent = new GeometryAttribute_default({
        componentDatatype: ComponentDatatype_default.FLOAT,
        componentsPerAttribute: 3,
        values: bitangents
      });
    }
    indices = new Uint16Array(6 * 2 * 3);
    indices[0] = 0;
    indices[1] = 1;
    indices[2] = 2;
    indices[3] = 0;
    indices[4] = 2;
    indices[5] = 3;
    indices[6] = 4 + 2;
    indices[7] = 4 + 1;
    indices[8] = 4 + 0;
    indices[9] = 4 + 3;
    indices[10] = 4 + 2;
    indices[11] = 4 + 0;
    indices[12] = 8 + 0;
    indices[13] = 8 + 1;
    indices[14] = 8 + 2;
    indices[15] = 8 + 0;
    indices[16] = 8 + 2;
    indices[17] = 8 + 3;
    indices[18] = 12 + 2;
    indices[19] = 12 + 1;
    indices[20] = 12 + 0;
    indices[21] = 12 + 3;
    indices[22] = 12 + 2;
    indices[23] = 12 + 0;
    indices[24] = 16 + 2;
    indices[25] = 16 + 1;
    indices[26] = 16 + 0;
    indices[27] = 16 + 3;
    indices[28] = 16 + 2;
    indices[29] = 16 + 0;
    indices[30] = 20 + 0;
    indices[31] = 20 + 1;
    indices[32] = 20 + 2;
    indices[33] = 20 + 0;
    indices[34] = 20 + 2;
    indices[35] = 20 + 3;
  } else {
    positions = new Float64Array(8 * 3);
    positions[0] = min.x;
    positions[1] = min.y;
    positions[2] = min.z;
    positions[3] = max.x;
    positions[4] = min.y;
    positions[5] = min.z;
    positions[6] = max.x;
    positions[7] = max.y;
    positions[8] = min.z;
    positions[9] = min.x;
    positions[10] = max.y;
    positions[11] = min.z;
    positions[12] = min.x;
    positions[13] = min.y;
    positions[14] = max.z;
    positions[15] = max.x;
    positions[16] = min.y;
    positions[17] = max.z;
    positions[18] = max.x;
    positions[19] = max.y;
    positions[20] = max.z;
    positions[21] = min.x;
    positions[22] = max.y;
    positions[23] = max.z;
    attributes.position = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.DOUBLE,
      componentsPerAttribute: 3,
      values: positions
    });
    indices = new Uint16Array(6 * 2 * 3);
    indices[0] = 4;
    indices[1] = 5;
    indices[2] = 6;
    indices[3] = 4;
    indices[4] = 6;
    indices[5] = 7;
    indices[6] = 1;
    indices[7] = 0;
    indices[8] = 3;
    indices[9] = 1;
    indices[10] = 3;
    indices[11] = 2;
    indices[12] = 1;
    indices[13] = 6;
    indices[14] = 5;
    indices[15] = 1;
    indices[16] = 2;
    indices[17] = 6;
    indices[18] = 2;
    indices[19] = 3;
    indices[20] = 7;
    indices[21] = 2;
    indices[22] = 7;
    indices[23] = 6;
    indices[24] = 3;
    indices[25] = 0;
    indices[26] = 4;
    indices[27] = 3;
    indices[28] = 4;
    indices[29] = 7;
    indices[30] = 0;
    indices[31] = 1;
    indices[32] = 5;
    indices[33] = 0;
    indices[34] = 5;
    indices[35] = 4;
  }
  const diff = Cartesian3_default.subtract(max, min, diffScratch);
  const radius = Cartesian3_default.magnitude(diff) * 0.5;
  if (defined_default(boxGeometry._offsetAttribute)) {
    const length = positions.length;
    const offsetValue = boxGeometry._offsetAttribute === GeometryOffsetAttribute_default.NONE ? 0 : 1;
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
    boundingSphere: new BoundingSphere_default(Cartesian3_default.ZERO, radius),
    offsetAttribute: boxGeometry._offsetAttribute
  });
};
var unitBoxGeometry;
BoxGeometry.getUnitBox = function() {
  if (!defined_default(unitBoxGeometry)) {
    unitBoxGeometry = BoxGeometry.createGeometry(
      BoxGeometry.fromDimensions({
        dimensions: new Cartesian3_default(1, 1, 1),
        vertexFormat: VertexFormat_default.POSITION_ONLY
      })
    );
  }
  return unitBoxGeometry;
};
var BoxGeometry_default = BoxGeometry;

export {
  BoxGeometry_default
};
