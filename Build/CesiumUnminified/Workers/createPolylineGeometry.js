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
  Color_default
} from "./chunk-G3FMOTWF.js";
import {
  ArcType_default
} from "./chunk-7ZN7OZXO.js";
import {
  PolylinePipeline_default
} from "./chunk-H6UV4PJF.js";
import "./chunk-DAY2RGWJ.js";
import {
  VertexFormat_default
} from "./chunk-HWW4AAWK.js";
import {
  arrayRemoveDuplicates_default
} from "./chunk-PZS6RNLR.js";
import "./chunk-RSJG3PFO.js";
import "./chunk-MKJM6R4K.js";
import "./chunk-PY3JQBWU.js";
import {
  IndexDatatype_default
} from "./chunk-VOS2BACB.js";
import {
  GeometryAttributes_default
} from "./chunk-CHKMKWJP.js";
import {
  GeometryAttribute_default,
  GeometryType_default,
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
  Cartesian3_default,
  Ellipsoid_default
} from "./chunk-A7FTZEKI.js";
import {
  Math_default
} from "./chunk-DPAUXJXY.js";
import "./chunk-LSF6MAVT.js";
import "./chunk-JQQW5OSU.js";
import {
  defaultValue_default
} from "./chunk-63W23YZY.js";
import {
  DeveloperError_default
} from "./chunk-J64Y4DQH.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/PolylineGeometry.js
var scratchInterpolateColorsArray = [];
function interpolateColors(p0, p1, color0, color1, numPoints) {
  const colors = scratchInterpolateColorsArray;
  colors.length = numPoints;
  let i;
  const r0 = color0.red;
  const g0 = color0.green;
  const b0 = color0.blue;
  const a0 = color0.alpha;
  const r1 = color1.red;
  const g1 = color1.green;
  const b1 = color1.blue;
  const a1 = color1.alpha;
  if (Color_default.equals(color0, color1)) {
    for (i = 0; i < numPoints; i++) {
      colors[i] = Color_default.clone(color0);
    }
    return colors;
  }
  const redPerVertex = (r1 - r0) / numPoints;
  const greenPerVertex = (g1 - g0) / numPoints;
  const bluePerVertex = (b1 - b0) / numPoints;
  const alphaPerVertex = (a1 - a0) / numPoints;
  for (i = 0; i < numPoints; i++) {
    colors[i] = new Color_default(
      r0 + i * redPerVertex,
      g0 + i * greenPerVertex,
      b0 + i * bluePerVertex,
      a0 + i * alphaPerVertex
    );
  }
  return colors;
}
function PolylineGeometry(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  const positions = options.positions;
  const colors = options.colors;
  const width = defaultValue_default(options.width, 1);
  const colorsPerVertex = defaultValue_default(options.colorsPerVertex, false);
  if (!defined_default(positions) || positions.length < 2) {
    throw new DeveloperError_default("At least two positions are required.");
  }
  if (typeof width !== "number") {
    throw new DeveloperError_default("width must be a number");
  }
  if (defined_default(colors) && (colorsPerVertex && colors.length < positions.length || !colorsPerVertex && colors.length < positions.length - 1)) {
    throw new DeveloperError_default("colors has an invalid length.");
  }
  this._positions = positions;
  this._colors = colors;
  this._width = width;
  this._colorsPerVertex = colorsPerVertex;
  this._vertexFormat = VertexFormat_default.clone(
    defaultValue_default(options.vertexFormat, VertexFormat_default.DEFAULT)
  );
  this._arcType = defaultValue_default(options.arcType, ArcType_default.GEODESIC);
  this._granularity = defaultValue_default(
    options.granularity,
    Math_default.RADIANS_PER_DEGREE
  );
  this._ellipsoid = Ellipsoid_default.clone(
    defaultValue_default(options.ellipsoid, Ellipsoid_default.WGS84)
  );
  this._workerName = "createPolylineGeometry";
  let numComponents = 1 + positions.length * Cartesian3_default.packedLength;
  numComponents += defined_default(colors) ? 1 + colors.length * Color_default.packedLength : 1;
  this.packedLength = numComponents + Ellipsoid_default.packedLength + VertexFormat_default.packedLength + 4;
}
PolylineGeometry.pack = function(value, array, startingIndex) {
  if (!defined_default(value)) {
    throw new DeveloperError_default("value is required");
  }
  if (!defined_default(array)) {
    throw new DeveloperError_default("array is required");
  }
  startingIndex = defaultValue_default(startingIndex, 0);
  let i;
  const positions = value._positions;
  let length = positions.length;
  array[startingIndex++] = length;
  for (i = 0; i < length; ++i, startingIndex += Cartesian3_default.packedLength) {
    Cartesian3_default.pack(positions[i], array, startingIndex);
  }
  const colors = value._colors;
  length = defined_default(colors) ? colors.length : 0;
  array[startingIndex++] = length;
  for (i = 0; i < length; ++i, startingIndex += Color_default.packedLength) {
    Color_default.pack(colors[i], array, startingIndex);
  }
  Ellipsoid_default.pack(value._ellipsoid, array, startingIndex);
  startingIndex += Ellipsoid_default.packedLength;
  VertexFormat_default.pack(value._vertexFormat, array, startingIndex);
  startingIndex += VertexFormat_default.packedLength;
  array[startingIndex++] = value._width;
  array[startingIndex++] = value._colorsPerVertex ? 1 : 0;
  array[startingIndex++] = value._arcType;
  array[startingIndex] = value._granularity;
  return array;
};
var scratchEllipsoid = Ellipsoid_default.clone(Ellipsoid_default.UNIT_SPHERE);
var scratchVertexFormat = new VertexFormat_default();
var scratchOptions = {
  positions: void 0,
  colors: void 0,
  ellipsoid: scratchEllipsoid,
  vertexFormat: scratchVertexFormat,
  width: void 0,
  colorsPerVertex: void 0,
  arcType: void 0,
  granularity: void 0
};
PolylineGeometry.unpack = function(array, startingIndex, result) {
  if (!defined_default(array)) {
    throw new DeveloperError_default("array is required");
  }
  startingIndex = defaultValue_default(startingIndex, 0);
  let i;
  let length = array[startingIndex++];
  const positions = new Array(length);
  for (i = 0; i < length; ++i, startingIndex += Cartesian3_default.packedLength) {
    positions[i] = Cartesian3_default.unpack(array, startingIndex);
  }
  length = array[startingIndex++];
  const colors = length > 0 ? new Array(length) : void 0;
  for (i = 0; i < length; ++i, startingIndex += Color_default.packedLength) {
    colors[i] = Color_default.unpack(array, startingIndex);
  }
  const ellipsoid = Ellipsoid_default.unpack(array, startingIndex, scratchEllipsoid);
  startingIndex += Ellipsoid_default.packedLength;
  const vertexFormat = VertexFormat_default.unpack(
    array,
    startingIndex,
    scratchVertexFormat
  );
  startingIndex += VertexFormat_default.packedLength;
  const width = array[startingIndex++];
  const colorsPerVertex = array[startingIndex++] === 1;
  const arcType = array[startingIndex++];
  const granularity = array[startingIndex];
  if (!defined_default(result)) {
    scratchOptions.positions = positions;
    scratchOptions.colors = colors;
    scratchOptions.width = width;
    scratchOptions.colorsPerVertex = colorsPerVertex;
    scratchOptions.arcType = arcType;
    scratchOptions.granularity = granularity;
    return new PolylineGeometry(scratchOptions);
  }
  result._positions = positions;
  result._colors = colors;
  result._ellipsoid = Ellipsoid_default.clone(ellipsoid, result._ellipsoid);
  result._vertexFormat = VertexFormat_default.clone(vertexFormat, result._vertexFormat);
  result._width = width;
  result._colorsPerVertex = colorsPerVertex;
  result._arcType = arcType;
  result._granularity = granularity;
  return result;
};
var scratchCartesian3 = new Cartesian3_default();
var scratchPosition = new Cartesian3_default();
var scratchPrevPosition = new Cartesian3_default();
var scratchNextPosition = new Cartesian3_default();
PolylineGeometry.createGeometry = function(polylineGeometry) {
  const width = polylineGeometry._width;
  const vertexFormat = polylineGeometry._vertexFormat;
  let colors = polylineGeometry._colors;
  const colorsPerVertex = polylineGeometry._colorsPerVertex;
  const arcType = polylineGeometry._arcType;
  const granularity = polylineGeometry._granularity;
  const ellipsoid = polylineGeometry._ellipsoid;
  let i;
  let j;
  let k;
  const removedIndices = [];
  let positions = arrayRemoveDuplicates_default(
    polylineGeometry._positions,
    Cartesian3_default.equalsEpsilon,
    false,
    removedIndices
  );
  if (defined_default(colors) && removedIndices.length > 0) {
    let removedArrayIndex = 0;
    let nextRemovedIndex = removedIndices[0];
    colors = colors.filter(function(color, index2) {
      let remove = false;
      if (colorsPerVertex) {
        remove = index2 === nextRemovedIndex || index2 === 0 && nextRemovedIndex === 1;
      } else {
        remove = index2 + 1 === nextRemovedIndex;
      }
      if (remove) {
        removedArrayIndex++;
        nextRemovedIndex = removedIndices[removedArrayIndex];
        return false;
      }
      return true;
    });
  }
  let positionsLength = positions.length;
  if (positionsLength < 2 || width <= 0) {
    return void 0;
  }
  if (arcType === ArcType_default.GEODESIC || arcType === ArcType_default.RHUMB) {
    let subdivisionSize;
    let numberOfPointsFunction;
    if (arcType === ArcType_default.GEODESIC) {
      subdivisionSize = Math_default.chordLength(
        granularity,
        ellipsoid.maximumRadius
      );
      numberOfPointsFunction = PolylinePipeline_default.numberOfPoints;
    } else {
      subdivisionSize = granularity;
      numberOfPointsFunction = PolylinePipeline_default.numberOfPointsRhumbLine;
    }
    const heights = PolylinePipeline_default.extractHeights(positions, ellipsoid);
    if (defined_default(colors)) {
      let colorLength = 1;
      for (i = 0; i < positionsLength - 1; ++i) {
        colorLength += numberOfPointsFunction(
          positions[i],
          positions[i + 1],
          subdivisionSize
        );
      }
      const newColors = new Array(colorLength);
      let newColorIndex = 0;
      for (i = 0; i < positionsLength - 1; ++i) {
        const p0 = positions[i];
        const p1 = positions[i + 1];
        const c0 = colors[i];
        const numColors = numberOfPointsFunction(p0, p1, subdivisionSize);
        if (colorsPerVertex && i < colorLength) {
          const c1 = colors[i + 1];
          const interpolatedColors = interpolateColors(
            p0,
            p1,
            c0,
            c1,
            numColors
          );
          const interpolatedColorsLength = interpolatedColors.length;
          for (j = 0; j < interpolatedColorsLength; ++j) {
            newColors[newColorIndex++] = interpolatedColors[j];
          }
        } else {
          for (j = 0; j < numColors; ++j) {
            newColors[newColorIndex++] = Color_default.clone(c0);
          }
        }
      }
      newColors[newColorIndex] = Color_default.clone(colors[colors.length - 1]);
      colors = newColors;
      scratchInterpolateColorsArray.length = 0;
    }
    if (arcType === ArcType_default.GEODESIC) {
      positions = PolylinePipeline_default.generateCartesianArc({
        positions,
        minDistance: subdivisionSize,
        ellipsoid,
        height: heights
      });
    } else {
      positions = PolylinePipeline_default.generateCartesianRhumbArc({
        positions,
        granularity: subdivisionSize,
        ellipsoid,
        height: heights
      });
    }
  }
  positionsLength = positions.length;
  const size = positionsLength * 4 - 4;
  const finalPositions = new Float64Array(size * 3);
  const prevPositions = new Float64Array(size * 3);
  const nextPositions = new Float64Array(size * 3);
  const expandAndWidth = new Float32Array(size * 2);
  const st = vertexFormat.st ? new Float32Array(size * 2) : void 0;
  const finalColors = defined_default(colors) ? new Uint8Array(size * 4) : void 0;
  let positionIndex = 0;
  let expandAndWidthIndex = 0;
  let stIndex = 0;
  let colorIndex = 0;
  let position;
  for (j = 0; j < positionsLength; ++j) {
    if (j === 0) {
      position = scratchCartesian3;
      Cartesian3_default.subtract(positions[0], positions[1], position);
      Cartesian3_default.add(positions[0], position, position);
    } else {
      position = positions[j - 1];
    }
    Cartesian3_default.clone(position, scratchPrevPosition);
    Cartesian3_default.clone(positions[j], scratchPosition);
    if (j === positionsLength - 1) {
      position = scratchCartesian3;
      Cartesian3_default.subtract(
        positions[positionsLength - 1],
        positions[positionsLength - 2],
        position
      );
      Cartesian3_default.add(positions[positionsLength - 1], position, position);
    } else {
      position = positions[j + 1];
    }
    Cartesian3_default.clone(position, scratchNextPosition);
    let color0, color1;
    if (defined_default(finalColors)) {
      if (j !== 0 && !colorsPerVertex) {
        color0 = colors[j - 1];
      } else {
        color0 = colors[j];
      }
      if (j !== positionsLength - 1) {
        color1 = colors[j];
      }
    }
    const startK = j === 0 ? 2 : 0;
    const endK = j === positionsLength - 1 ? 2 : 4;
    for (k = startK; k < endK; ++k) {
      Cartesian3_default.pack(scratchPosition, finalPositions, positionIndex);
      Cartesian3_default.pack(scratchPrevPosition, prevPositions, positionIndex);
      Cartesian3_default.pack(scratchNextPosition, nextPositions, positionIndex);
      positionIndex += 3;
      const direction = k - 2 < 0 ? -1 : 1;
      expandAndWidth[expandAndWidthIndex++] = 2 * (k % 2) - 1;
      expandAndWidth[expandAndWidthIndex++] = direction * width;
      if (vertexFormat.st) {
        st[stIndex++] = j / (positionsLength - 1);
        st[stIndex++] = Math.max(expandAndWidth[expandAndWidthIndex - 2], 0);
      }
      if (defined_default(finalColors)) {
        const color = k < 2 ? color0 : color1;
        finalColors[colorIndex++] = Color_default.floatToByte(color.red);
        finalColors[colorIndex++] = Color_default.floatToByte(color.green);
        finalColors[colorIndex++] = Color_default.floatToByte(color.blue);
        finalColors[colorIndex++] = Color_default.floatToByte(color.alpha);
      }
    }
  }
  const attributes = new GeometryAttributes_default();
  attributes.position = new GeometryAttribute_default({
    componentDatatype: ComponentDatatype_default.DOUBLE,
    componentsPerAttribute: 3,
    values: finalPositions
  });
  attributes.prevPosition = new GeometryAttribute_default({
    componentDatatype: ComponentDatatype_default.DOUBLE,
    componentsPerAttribute: 3,
    values: prevPositions
  });
  attributes.nextPosition = new GeometryAttribute_default({
    componentDatatype: ComponentDatatype_default.DOUBLE,
    componentsPerAttribute: 3,
    values: nextPositions
  });
  attributes.expandAndWidth = new GeometryAttribute_default({
    componentDatatype: ComponentDatatype_default.FLOAT,
    componentsPerAttribute: 2,
    values: expandAndWidth
  });
  if (vertexFormat.st) {
    attributes.st = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 2,
      values: st
    });
  }
  if (defined_default(finalColors)) {
    attributes.color = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.UNSIGNED_BYTE,
      componentsPerAttribute: 4,
      values: finalColors,
      normalize: true
    });
  }
  const indices = IndexDatatype_default.createTypedArray(size, positionsLength * 6 - 6);
  let index = 0;
  let indicesIndex = 0;
  const length = positionsLength - 1;
  for (j = 0; j < length; ++j) {
    indices[indicesIndex++] = index;
    indices[indicesIndex++] = index + 2;
    indices[indicesIndex++] = index + 1;
    indices[indicesIndex++] = index + 1;
    indices[indicesIndex++] = index + 2;
    indices[indicesIndex++] = index + 3;
    index += 4;
  }
  return new Geometry_default({
    attributes,
    indices,
    primitiveType: PrimitiveType_default.TRIANGLES,
    boundingSphere: BoundingSphere_default.fromPoints(positions),
    geometryType: GeometryType_default.POLYLINES
  });
};
var PolylineGeometry_default = PolylineGeometry;

// packages/engine/Source/Workers/createPolylineGeometry.js
function createPolylineGeometry(polylineGeometry, offset) {
  if (defined_default(offset)) {
    polylineGeometry = PolylineGeometry_default.unpack(polylineGeometry, offset);
  }
  polylineGeometry._ellipsoid = Ellipsoid_default.clone(polylineGeometry._ellipsoid);
  return PolylineGeometry_default.createGeometry(polylineGeometry);
}
var createPolylineGeometry_default = createPolylineGeometry;
export {
  createPolylineGeometry_default as default
};
