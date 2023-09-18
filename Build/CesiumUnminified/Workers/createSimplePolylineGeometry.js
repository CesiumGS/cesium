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

// packages/engine/Source/Core/SimplePolylineGeometry.js
function interpolateColors(p0, p1, color0, color1, minDistance, array, offset) {
  const numPoints = PolylinePipeline_default.numberOfPoints(p0, p1, minDistance);
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
      array[offset++] = Color_default.floatToByte(r0);
      array[offset++] = Color_default.floatToByte(g0);
      array[offset++] = Color_default.floatToByte(b0);
      array[offset++] = Color_default.floatToByte(a0);
    }
    return offset;
  }
  const redPerVertex = (r1 - r0) / numPoints;
  const greenPerVertex = (g1 - g0) / numPoints;
  const bluePerVertex = (b1 - b0) / numPoints;
  const alphaPerVertex = (a1 - a0) / numPoints;
  let index = offset;
  for (i = 0; i < numPoints; i++) {
    array[index++] = Color_default.floatToByte(r0 + i * redPerVertex);
    array[index++] = Color_default.floatToByte(g0 + i * greenPerVertex);
    array[index++] = Color_default.floatToByte(b0 + i * bluePerVertex);
    array[index++] = Color_default.floatToByte(a0 + i * alphaPerVertex);
  }
  return index;
}
function SimplePolylineGeometry(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  const positions = options.positions;
  const colors = options.colors;
  const colorsPerVertex = defaultValue_default(options.colorsPerVertex, false);
  if (!defined_default(positions) || positions.length < 2) {
    throw new DeveloperError_default("At least two positions are required.");
  }
  if (defined_default(colors) && (colorsPerVertex && colors.length < positions.length || !colorsPerVertex && colors.length < positions.length - 1)) {
    throw new DeveloperError_default("colors has an invalid length.");
  }
  this._positions = positions;
  this._colors = colors;
  this._colorsPerVertex = colorsPerVertex;
  this._arcType = defaultValue_default(options.arcType, ArcType_default.GEODESIC);
  this._granularity = defaultValue_default(
    options.granularity,
    Math_default.RADIANS_PER_DEGREE
  );
  this._ellipsoid = defaultValue_default(options.ellipsoid, Ellipsoid_default.WGS84);
  this._workerName = "createSimplePolylineGeometry";
  let numComponents = 1 + positions.length * Cartesian3_default.packedLength;
  numComponents += defined_default(colors) ? 1 + colors.length * Color_default.packedLength : 1;
  this.packedLength = numComponents + Ellipsoid_default.packedLength + 3;
}
SimplePolylineGeometry.pack = function(value, array, startingIndex) {
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
  array[startingIndex++] = value._colorsPerVertex ? 1 : 0;
  array[startingIndex++] = value._arcType;
  array[startingIndex] = value._granularity;
  return array;
};
SimplePolylineGeometry.unpack = function(array, startingIndex, result) {
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
  const ellipsoid = Ellipsoid_default.unpack(array, startingIndex);
  startingIndex += Ellipsoid_default.packedLength;
  const colorsPerVertex = array[startingIndex++] === 1;
  const arcType = array[startingIndex++];
  const granularity = array[startingIndex];
  if (!defined_default(result)) {
    return new SimplePolylineGeometry({
      positions,
      colors,
      ellipsoid,
      colorsPerVertex,
      arcType,
      granularity
    });
  }
  result._positions = positions;
  result._colors = colors;
  result._ellipsoid = ellipsoid;
  result._colorsPerVertex = colorsPerVertex;
  result._arcType = arcType;
  result._granularity = granularity;
  return result;
};
var scratchArray1 = new Array(2);
var scratchArray2 = new Array(2);
var generateArcOptionsScratch = {
  positions: scratchArray1,
  height: scratchArray2,
  ellipsoid: void 0,
  minDistance: void 0,
  granularity: void 0
};
SimplePolylineGeometry.createGeometry = function(simplePolylineGeometry) {
  const positions = simplePolylineGeometry._positions;
  const colors = simplePolylineGeometry._colors;
  const colorsPerVertex = simplePolylineGeometry._colorsPerVertex;
  const arcType = simplePolylineGeometry._arcType;
  const granularity = simplePolylineGeometry._granularity;
  const ellipsoid = simplePolylineGeometry._ellipsoid;
  const minDistance = Math_default.chordLength(
    granularity,
    ellipsoid.maximumRadius
  );
  const perSegmentColors = defined_default(colors) && !colorsPerVertex;
  let i;
  const length = positions.length;
  let positionValues;
  let numberOfPositions;
  let colorValues;
  let color;
  let offset = 0;
  if (arcType === ArcType_default.GEODESIC || arcType === ArcType_default.RHUMB) {
    let subdivisionSize;
    let numberOfPointsFunction;
    let generateArcFunction;
    if (arcType === ArcType_default.GEODESIC) {
      subdivisionSize = Math_default.chordLength(
        granularity,
        ellipsoid.maximumRadius
      );
      numberOfPointsFunction = PolylinePipeline_default.numberOfPoints;
      generateArcFunction = PolylinePipeline_default.generateArc;
    } else {
      subdivisionSize = granularity;
      numberOfPointsFunction = PolylinePipeline_default.numberOfPointsRhumbLine;
      generateArcFunction = PolylinePipeline_default.generateRhumbArc;
    }
    const heights = PolylinePipeline_default.extractHeights(positions, ellipsoid);
    const generateArcOptions = generateArcOptionsScratch;
    if (arcType === ArcType_default.GEODESIC) {
      generateArcOptions.minDistance = minDistance;
    } else {
      generateArcOptions.granularity = granularity;
    }
    generateArcOptions.ellipsoid = ellipsoid;
    if (perSegmentColors) {
      let positionCount = 0;
      for (i = 0; i < length - 1; i++) {
        positionCount += numberOfPointsFunction(
          positions[i],
          positions[i + 1],
          subdivisionSize
        ) + 1;
      }
      positionValues = new Float64Array(positionCount * 3);
      colorValues = new Uint8Array(positionCount * 4);
      generateArcOptions.positions = scratchArray1;
      generateArcOptions.height = scratchArray2;
      let ci = 0;
      for (i = 0; i < length - 1; ++i) {
        scratchArray1[0] = positions[i];
        scratchArray1[1] = positions[i + 1];
        scratchArray2[0] = heights[i];
        scratchArray2[1] = heights[i + 1];
        const pos = generateArcFunction(generateArcOptions);
        if (defined_default(colors)) {
          const segLen = pos.length / 3;
          color = colors[i];
          for (let k = 0; k < segLen; ++k) {
            colorValues[ci++] = Color_default.floatToByte(color.red);
            colorValues[ci++] = Color_default.floatToByte(color.green);
            colorValues[ci++] = Color_default.floatToByte(color.blue);
            colorValues[ci++] = Color_default.floatToByte(color.alpha);
          }
        }
        positionValues.set(pos, offset);
        offset += pos.length;
      }
    } else {
      generateArcOptions.positions = positions;
      generateArcOptions.height = heights;
      positionValues = new Float64Array(
        generateArcFunction(generateArcOptions)
      );
      if (defined_default(colors)) {
        colorValues = new Uint8Array(positionValues.length / 3 * 4);
        for (i = 0; i < length - 1; ++i) {
          const p0 = positions[i];
          const p1 = positions[i + 1];
          const c0 = colors[i];
          const c1 = colors[i + 1];
          offset = interpolateColors(
            p0,
            p1,
            c0,
            c1,
            minDistance,
            colorValues,
            offset
          );
        }
        const lastColor = colors[length - 1];
        colorValues[offset++] = Color_default.floatToByte(lastColor.red);
        colorValues[offset++] = Color_default.floatToByte(lastColor.green);
        colorValues[offset++] = Color_default.floatToByte(lastColor.blue);
        colorValues[offset++] = Color_default.floatToByte(lastColor.alpha);
      }
    }
  } else {
    numberOfPositions = perSegmentColors ? length * 2 - 2 : length;
    positionValues = new Float64Array(numberOfPositions * 3);
    colorValues = defined_default(colors) ? new Uint8Array(numberOfPositions * 4) : void 0;
    let positionIndex = 0;
    let colorIndex = 0;
    for (i = 0; i < length; ++i) {
      const p = positions[i];
      if (perSegmentColors && i > 0) {
        Cartesian3_default.pack(p, positionValues, positionIndex);
        positionIndex += 3;
        color = colors[i - 1];
        colorValues[colorIndex++] = Color_default.floatToByte(color.red);
        colorValues[colorIndex++] = Color_default.floatToByte(color.green);
        colorValues[colorIndex++] = Color_default.floatToByte(color.blue);
        colorValues[colorIndex++] = Color_default.floatToByte(color.alpha);
      }
      if (perSegmentColors && i === length - 1) {
        break;
      }
      Cartesian3_default.pack(p, positionValues, positionIndex);
      positionIndex += 3;
      if (defined_default(colors)) {
        color = colors[i];
        colorValues[colorIndex++] = Color_default.floatToByte(color.red);
        colorValues[colorIndex++] = Color_default.floatToByte(color.green);
        colorValues[colorIndex++] = Color_default.floatToByte(color.blue);
        colorValues[colorIndex++] = Color_default.floatToByte(color.alpha);
      }
    }
  }
  const attributes = new GeometryAttributes_default();
  attributes.position = new GeometryAttribute_default({
    componentDatatype: ComponentDatatype_default.DOUBLE,
    componentsPerAttribute: 3,
    values: positionValues
  });
  if (defined_default(colors)) {
    attributes.color = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.UNSIGNED_BYTE,
      componentsPerAttribute: 4,
      values: colorValues,
      normalize: true
    });
  }
  numberOfPositions = positionValues.length / 3;
  const numberOfIndices = (numberOfPositions - 1) * 2;
  const indices = IndexDatatype_default.createTypedArray(
    numberOfPositions,
    numberOfIndices
  );
  let index = 0;
  for (i = 0; i < numberOfPositions - 1; ++i) {
    indices[index++] = i;
    indices[index++] = i + 1;
  }
  return new Geometry_default({
    attributes,
    indices,
    primitiveType: PrimitiveType_default.LINES,
    boundingSphere: BoundingSphere_default.fromPoints(positions)
  });
};
var SimplePolylineGeometry_default = SimplePolylineGeometry;

// packages/engine/Source/Workers/createSimplePolylineGeometry.js
function createSimplePolylineGeometry(simplePolylineGeometry, offset) {
  if (defined_default(offset)) {
    simplePolylineGeometry = SimplePolylineGeometry_default.unpack(
      simplePolylineGeometry,
      offset
    );
  }
  simplePolylineGeometry._ellipsoid = Ellipsoid_default.clone(
    simplePolylineGeometry._ellipsoid
  );
  return SimplePolylineGeometry_default.createGeometry(simplePolylineGeometry);
}
var createSimplePolylineGeometry_default = createSimplePolylineGeometry;
export {
  createSimplePolylineGeometry_default as default
};
