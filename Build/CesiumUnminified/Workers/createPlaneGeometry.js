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
import "./chunk-Z2BQIJST.js";
import "./chunk-5G2JRFMX.js";
import {
  ComponentDatatype_default
} from "./chunk-3UWS6LZS.js";
import {
  Cartesian3_default
} from "./chunk-A7FTZEKI.js";
import "./chunk-DPAUXJXY.js";
import "./chunk-LSF6MAVT.js";
import "./chunk-JQQW5OSU.js";
import {
  defaultValue_default
} from "./chunk-63W23YZY.js";
import {
  Check_default
} from "./chunk-J64Y4DQH.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/PlaneGeometry.js
function PlaneGeometry(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  const vertexFormat = defaultValue_default(options.vertexFormat, VertexFormat_default.DEFAULT);
  this._vertexFormat = vertexFormat;
  this._workerName = "createPlaneGeometry";
}
PlaneGeometry.packedLength = VertexFormat_default.packedLength;
PlaneGeometry.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  VertexFormat_default.pack(value._vertexFormat, array, startingIndex);
  return array;
};
var scratchVertexFormat = new VertexFormat_default();
var scratchOptions = {
  vertexFormat: scratchVertexFormat
};
PlaneGeometry.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  const vertexFormat = VertexFormat_default.unpack(
    array,
    startingIndex,
    scratchVertexFormat
  );
  if (!defined_default(result)) {
    return new PlaneGeometry(scratchOptions);
  }
  result._vertexFormat = VertexFormat_default.clone(vertexFormat, result._vertexFormat);
  return result;
};
var min = new Cartesian3_default(-0.5, -0.5, 0);
var max = new Cartesian3_default(0.5, 0.5, 0);
PlaneGeometry.createGeometry = function(planeGeometry) {
  const vertexFormat = planeGeometry._vertexFormat;
  const attributes = new GeometryAttributes_default();
  let indices;
  let positions;
  if (vertexFormat.position) {
    positions = new Float64Array(4 * 3);
    positions[0] = min.x;
    positions[1] = min.y;
    positions[2] = 0;
    positions[3] = max.x;
    positions[4] = min.y;
    positions[5] = 0;
    positions[6] = max.x;
    positions[7] = max.y;
    positions[8] = 0;
    positions[9] = min.x;
    positions[10] = max.y;
    positions[11] = 0;
    attributes.position = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.DOUBLE,
      componentsPerAttribute: 3,
      values: positions
    });
    if (vertexFormat.normal) {
      const normals = new Float32Array(4 * 3);
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
      attributes.normal = new GeometryAttribute_default({
        componentDatatype: ComponentDatatype_default.FLOAT,
        componentsPerAttribute: 3,
        values: normals
      });
    }
    if (vertexFormat.st) {
      const texCoords = new Float32Array(4 * 2);
      texCoords[0] = 0;
      texCoords[1] = 0;
      texCoords[2] = 1;
      texCoords[3] = 0;
      texCoords[4] = 1;
      texCoords[5] = 1;
      texCoords[6] = 0;
      texCoords[7] = 1;
      attributes.st = new GeometryAttribute_default({
        componentDatatype: ComponentDatatype_default.FLOAT,
        componentsPerAttribute: 2,
        values: texCoords
      });
    }
    if (vertexFormat.tangent) {
      const tangents = new Float32Array(4 * 3);
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
      attributes.tangent = new GeometryAttribute_default({
        componentDatatype: ComponentDatatype_default.FLOAT,
        componentsPerAttribute: 3,
        values: tangents
      });
    }
    if (vertexFormat.bitangent) {
      const bitangents = new Float32Array(4 * 3);
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
      attributes.bitangent = new GeometryAttribute_default({
        componentDatatype: ComponentDatatype_default.FLOAT,
        componentsPerAttribute: 3,
        values: bitangents
      });
    }
    indices = new Uint16Array(2 * 3);
    indices[0] = 0;
    indices[1] = 1;
    indices[2] = 2;
    indices[3] = 0;
    indices[4] = 2;
    indices[5] = 3;
  }
  return new Geometry_default({
    attributes,
    indices,
    primitiveType: PrimitiveType_default.TRIANGLES,
    boundingSphere: new BoundingSphere_default(Cartesian3_default.ZERO, Math.sqrt(2))
  });
};
var PlaneGeometry_default = PlaneGeometry;

// packages/engine/Source/Workers/createPlaneGeometry.js
function createPlaneGeometry(planeGeometry, offset) {
  if (defined_default(offset)) {
    planeGeometry = PlaneGeometry_default.unpack(planeGeometry, offset);
  }
  return PlaneGeometry_default.createGeometry(planeGeometry);
}
var createPlaneGeometry_default = createPlaneGeometry;
export {
  createPlaneGeometry_default as default
};
