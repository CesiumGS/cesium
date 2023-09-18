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
  CorridorGeometryLibrary_default
} from "./chunk-TFO7BLQ3.js";
import {
  CornerType_default
} from "./chunk-OJGFPQQY.js";
import "./chunk-H6UV4PJF.js";
import "./chunk-DAY2RGWJ.js";
import {
  GeometryOffsetAttribute_default
} from "./chunk-DXQTOATV.js";
import {
  VertexFormat_default
} from "./chunk-HWW4AAWK.js";
import "./chunk-LATQ4URD.js";
import "./chunk-IYKFKVQR.js";
import {
  PolygonPipeline_default
} from "./chunk-3DTYZXHQ.js";
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
  Geometry_default,
  PrimitiveType_default
} from "./chunk-LBUZCHJN.js";
import {
  BoundingSphere_default
} from "./chunk-FS4DCO6P.js";
import "./chunk-Z2BQIJST.js";
import {
  Rectangle_default
} from "./chunk-5G2JRFMX.js";
import {
  ComponentDatatype_default
} from "./chunk-3UWS6LZS.js";
import {
  Cartesian3_default,
  Cartographic_default,
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
  Check_default
} from "./chunk-J64Y4DQH.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/CorridorGeometry.js
var cartesian1 = new Cartesian3_default();
var cartesian2 = new Cartesian3_default();
var cartesian3 = new Cartesian3_default();
var cartesian4 = new Cartesian3_default();
var cartesian5 = new Cartesian3_default();
var cartesian6 = new Cartesian3_default();
var scratch1 = new Cartesian3_default();
var scratch2 = new Cartesian3_default();
function scaleToSurface(positions, ellipsoid) {
  for (let i = 0; i < positions.length; i++) {
    positions[i] = ellipsoid.scaleToGeodeticSurface(positions[i], positions[i]);
  }
  return positions;
}
function addNormals(attr, normal, left, front, back, vertexFormat) {
  const normals = attr.normals;
  const tangents = attr.tangents;
  const bitangents = attr.bitangents;
  const forward = Cartesian3_default.normalize(
    Cartesian3_default.cross(left, normal, scratch1),
    scratch1
  );
  if (vertexFormat.normal) {
    CorridorGeometryLibrary_default.addAttribute(normals, normal, front, back);
  }
  if (vertexFormat.tangent) {
    CorridorGeometryLibrary_default.addAttribute(tangents, forward, front, back);
  }
  if (vertexFormat.bitangent) {
    CorridorGeometryLibrary_default.addAttribute(bitangents, left, front, back);
  }
}
function combine(computedPositions, vertexFormat, ellipsoid) {
  const positions = computedPositions.positions;
  const corners = computedPositions.corners;
  const endPositions = computedPositions.endPositions;
  const computedLefts = computedPositions.lefts;
  const computedNormals = computedPositions.normals;
  const attributes = new GeometryAttributes_default();
  let corner;
  let leftCount = 0;
  let rightCount = 0;
  let i;
  let indicesLength = 0;
  let length;
  for (i = 0; i < positions.length; i += 2) {
    length = positions[i].length - 3;
    leftCount += length;
    indicesLength += length * 2;
    rightCount += positions[i + 1].length - 3;
  }
  leftCount += 3;
  rightCount += 3;
  for (i = 0; i < corners.length; i++) {
    corner = corners[i];
    const leftSide = corners[i].leftPositions;
    if (defined_default(leftSide)) {
      length = leftSide.length;
      leftCount += length;
      indicesLength += length;
    } else {
      length = corners[i].rightPositions.length;
      rightCount += length;
      indicesLength += length;
    }
  }
  const addEndPositions = defined_default(endPositions);
  let endPositionLength;
  if (addEndPositions) {
    endPositionLength = endPositions[0].length - 3;
    leftCount += endPositionLength;
    rightCount += endPositionLength;
    endPositionLength /= 3;
    indicesLength += endPositionLength * 6;
  }
  const size = leftCount + rightCount;
  const finalPositions = new Float64Array(size);
  const normals = vertexFormat.normal ? new Float32Array(size) : void 0;
  const tangents = vertexFormat.tangent ? new Float32Array(size) : void 0;
  const bitangents = vertexFormat.bitangent ? new Float32Array(size) : void 0;
  const attr = {
    normals,
    tangents,
    bitangents
  };
  let front = 0;
  let back = size - 1;
  let UL, LL, UR, LR;
  let normal = cartesian1;
  let left = cartesian2;
  let rightPos, leftPos;
  const halfLength = endPositionLength / 2;
  const indices = IndexDatatype_default.createTypedArray(size / 3, indicesLength);
  let index = 0;
  if (addEndPositions) {
    leftPos = cartesian3;
    rightPos = cartesian4;
    const firstEndPositions = endPositions[0];
    normal = Cartesian3_default.fromArray(computedNormals, 0, normal);
    left = Cartesian3_default.fromArray(computedLefts, 0, left);
    for (i = 0; i < halfLength; i++) {
      leftPos = Cartesian3_default.fromArray(
        firstEndPositions,
        (halfLength - 1 - i) * 3,
        leftPos
      );
      rightPos = Cartesian3_default.fromArray(
        firstEndPositions,
        (halfLength + i) * 3,
        rightPos
      );
      CorridorGeometryLibrary_default.addAttribute(finalPositions, rightPos, front);
      CorridorGeometryLibrary_default.addAttribute(
        finalPositions,
        leftPos,
        void 0,
        back
      );
      addNormals(attr, normal, left, front, back, vertexFormat);
      LL = front / 3;
      LR = LL + 1;
      UL = (back - 2) / 3;
      UR = UL - 1;
      indices[index++] = UL;
      indices[index++] = LL;
      indices[index++] = UR;
      indices[index++] = UR;
      indices[index++] = LL;
      indices[index++] = LR;
      front += 3;
      back -= 3;
    }
  }
  let posIndex = 0;
  let compIndex = 0;
  let rightEdge = positions[posIndex++];
  let leftEdge = positions[posIndex++];
  finalPositions.set(rightEdge, front);
  finalPositions.set(leftEdge, back - leftEdge.length + 1);
  left = Cartesian3_default.fromArray(computedLefts, compIndex, left);
  let rightNormal;
  let leftNormal;
  length = leftEdge.length - 3;
  for (i = 0; i < length; i += 3) {
    rightNormal = ellipsoid.geodeticSurfaceNormal(
      Cartesian3_default.fromArray(rightEdge, i, scratch1),
      scratch1
    );
    leftNormal = ellipsoid.geodeticSurfaceNormal(
      Cartesian3_default.fromArray(leftEdge, length - i, scratch2),
      scratch2
    );
    normal = Cartesian3_default.normalize(
      Cartesian3_default.add(rightNormal, leftNormal, normal),
      normal
    );
    addNormals(attr, normal, left, front, back, vertexFormat);
    LL = front / 3;
    LR = LL + 1;
    UL = (back - 2) / 3;
    UR = UL - 1;
    indices[index++] = UL;
    indices[index++] = LL;
    indices[index++] = UR;
    indices[index++] = UR;
    indices[index++] = LL;
    indices[index++] = LR;
    front += 3;
    back -= 3;
  }
  rightNormal = ellipsoid.geodeticSurfaceNormal(
    Cartesian3_default.fromArray(rightEdge, length, scratch1),
    scratch1
  );
  leftNormal = ellipsoid.geodeticSurfaceNormal(
    Cartesian3_default.fromArray(leftEdge, length, scratch2),
    scratch2
  );
  normal = Cartesian3_default.normalize(
    Cartesian3_default.add(rightNormal, leftNormal, normal),
    normal
  );
  compIndex += 3;
  for (i = 0; i < corners.length; i++) {
    let j;
    corner = corners[i];
    const l = corner.leftPositions;
    const r = corner.rightPositions;
    let pivot;
    let start;
    let outsidePoint = cartesian6;
    let previousPoint = cartesian3;
    let nextPoint = cartesian4;
    normal = Cartesian3_default.fromArray(computedNormals, compIndex, normal);
    if (defined_default(l)) {
      addNormals(attr, normal, left, void 0, back, vertexFormat);
      back -= 3;
      pivot = LR;
      start = UR;
      for (j = 0; j < l.length / 3; j++) {
        outsidePoint = Cartesian3_default.fromArray(l, j * 3, outsidePoint);
        indices[index++] = pivot;
        indices[index++] = start - j - 1;
        indices[index++] = start - j;
        CorridorGeometryLibrary_default.addAttribute(
          finalPositions,
          outsidePoint,
          void 0,
          back
        );
        previousPoint = Cartesian3_default.fromArray(
          finalPositions,
          (start - j - 1) * 3,
          previousPoint
        );
        nextPoint = Cartesian3_default.fromArray(finalPositions, pivot * 3, nextPoint);
        left = Cartesian3_default.normalize(
          Cartesian3_default.subtract(previousPoint, nextPoint, left),
          left
        );
        addNormals(attr, normal, left, void 0, back, vertexFormat);
        back -= 3;
      }
      outsidePoint = Cartesian3_default.fromArray(
        finalPositions,
        pivot * 3,
        outsidePoint
      );
      previousPoint = Cartesian3_default.subtract(
        Cartesian3_default.fromArray(finalPositions, start * 3, previousPoint),
        outsidePoint,
        previousPoint
      );
      nextPoint = Cartesian3_default.subtract(
        Cartesian3_default.fromArray(finalPositions, (start - j) * 3, nextPoint),
        outsidePoint,
        nextPoint
      );
      left = Cartesian3_default.normalize(
        Cartesian3_default.add(previousPoint, nextPoint, left),
        left
      );
      addNormals(attr, normal, left, front, void 0, vertexFormat);
      front += 3;
    } else {
      addNormals(attr, normal, left, front, void 0, vertexFormat);
      front += 3;
      pivot = UR;
      start = LR;
      for (j = 0; j < r.length / 3; j++) {
        outsidePoint = Cartesian3_default.fromArray(r, j * 3, outsidePoint);
        indices[index++] = pivot;
        indices[index++] = start + j;
        indices[index++] = start + j + 1;
        CorridorGeometryLibrary_default.addAttribute(
          finalPositions,
          outsidePoint,
          front
        );
        previousPoint = Cartesian3_default.fromArray(
          finalPositions,
          pivot * 3,
          previousPoint
        );
        nextPoint = Cartesian3_default.fromArray(
          finalPositions,
          (start + j) * 3,
          nextPoint
        );
        left = Cartesian3_default.normalize(
          Cartesian3_default.subtract(previousPoint, nextPoint, left),
          left
        );
        addNormals(attr, normal, left, front, void 0, vertexFormat);
        front += 3;
      }
      outsidePoint = Cartesian3_default.fromArray(
        finalPositions,
        pivot * 3,
        outsidePoint
      );
      previousPoint = Cartesian3_default.subtract(
        Cartesian3_default.fromArray(finalPositions, (start + j) * 3, previousPoint),
        outsidePoint,
        previousPoint
      );
      nextPoint = Cartesian3_default.subtract(
        Cartesian3_default.fromArray(finalPositions, start * 3, nextPoint),
        outsidePoint,
        nextPoint
      );
      left = Cartesian3_default.normalize(
        Cartesian3_default.negate(Cartesian3_default.add(nextPoint, previousPoint, left), left),
        left
      );
      addNormals(attr, normal, left, void 0, back, vertexFormat);
      back -= 3;
    }
    rightEdge = positions[posIndex++];
    leftEdge = positions[posIndex++];
    rightEdge.splice(0, 3);
    leftEdge.splice(leftEdge.length - 3, 3);
    finalPositions.set(rightEdge, front);
    finalPositions.set(leftEdge, back - leftEdge.length + 1);
    length = leftEdge.length - 3;
    compIndex += 3;
    left = Cartesian3_default.fromArray(computedLefts, compIndex, left);
    for (j = 0; j < leftEdge.length; j += 3) {
      rightNormal = ellipsoid.geodeticSurfaceNormal(
        Cartesian3_default.fromArray(rightEdge, j, scratch1),
        scratch1
      );
      leftNormal = ellipsoid.geodeticSurfaceNormal(
        Cartesian3_default.fromArray(leftEdge, length - j, scratch2),
        scratch2
      );
      normal = Cartesian3_default.normalize(
        Cartesian3_default.add(rightNormal, leftNormal, normal),
        normal
      );
      addNormals(attr, normal, left, front, back, vertexFormat);
      LR = front / 3;
      LL = LR - 1;
      UR = (back - 2) / 3;
      UL = UR + 1;
      indices[index++] = UL;
      indices[index++] = LL;
      indices[index++] = UR;
      indices[index++] = UR;
      indices[index++] = LL;
      indices[index++] = LR;
      front += 3;
      back -= 3;
    }
    front -= 3;
    back += 3;
  }
  normal = Cartesian3_default.fromArray(
    computedNormals,
    computedNormals.length - 3,
    normal
  );
  addNormals(attr, normal, left, front, back, vertexFormat);
  if (addEndPositions) {
    front += 3;
    back -= 3;
    leftPos = cartesian3;
    rightPos = cartesian4;
    const lastEndPositions = endPositions[1];
    for (i = 0; i < halfLength; i++) {
      leftPos = Cartesian3_default.fromArray(
        lastEndPositions,
        (endPositionLength - i - 1) * 3,
        leftPos
      );
      rightPos = Cartesian3_default.fromArray(lastEndPositions, i * 3, rightPos);
      CorridorGeometryLibrary_default.addAttribute(
        finalPositions,
        leftPos,
        void 0,
        back
      );
      CorridorGeometryLibrary_default.addAttribute(finalPositions, rightPos, front);
      addNormals(attr, normal, left, front, back, vertexFormat);
      LR = front / 3;
      LL = LR - 1;
      UR = (back - 2) / 3;
      UL = UR + 1;
      indices[index++] = UL;
      indices[index++] = LL;
      indices[index++] = UR;
      indices[index++] = UR;
      indices[index++] = LL;
      indices[index++] = LR;
      front += 3;
      back -= 3;
    }
  }
  attributes.position = new GeometryAttribute_default({
    componentDatatype: ComponentDatatype_default.DOUBLE,
    componentsPerAttribute: 3,
    values: finalPositions
  });
  if (vertexFormat.st) {
    const st = new Float32Array(size / 3 * 2);
    let rightSt;
    let leftSt;
    let stIndex = 0;
    if (addEndPositions) {
      leftCount /= 3;
      rightCount /= 3;
      const theta = Math.PI / (endPositionLength + 1);
      leftSt = 1 / (leftCount - endPositionLength + 1);
      rightSt = 1 / (rightCount - endPositionLength + 1);
      let a;
      const halfEndPos = endPositionLength / 2;
      for (i = halfEndPos + 1; i < endPositionLength + 1; i++) {
        a = Math_default.PI_OVER_TWO + theta * i;
        st[stIndex++] = rightSt * (1 + Math.cos(a));
        st[stIndex++] = 0.5 * (1 + Math.sin(a));
      }
      for (i = 1; i < rightCount - endPositionLength + 1; i++) {
        st[stIndex++] = i * rightSt;
        st[stIndex++] = 0;
      }
      for (i = endPositionLength; i > halfEndPos; i--) {
        a = Math_default.PI_OVER_TWO - i * theta;
        st[stIndex++] = 1 - rightSt * (1 + Math.cos(a));
        st[stIndex++] = 0.5 * (1 + Math.sin(a));
      }
      for (i = halfEndPos; i > 0; i--) {
        a = Math_default.PI_OVER_TWO - theta * i;
        st[stIndex++] = 1 - leftSt * (1 + Math.cos(a));
        st[stIndex++] = 0.5 * (1 + Math.sin(a));
      }
      for (i = leftCount - endPositionLength; i > 0; i--) {
        st[stIndex++] = i * leftSt;
        st[stIndex++] = 1;
      }
      for (i = 1; i < halfEndPos + 1; i++) {
        a = Math_default.PI_OVER_TWO + theta * i;
        st[stIndex++] = leftSt * (1 + Math.cos(a));
        st[stIndex++] = 0.5 * (1 + Math.sin(a));
      }
    } else {
      leftCount /= 3;
      rightCount /= 3;
      leftSt = 1 / (leftCount - 1);
      rightSt = 1 / (rightCount - 1);
      for (i = 0; i < rightCount; i++) {
        st[stIndex++] = i * rightSt;
        st[stIndex++] = 0;
      }
      for (i = leftCount; i > 0; i--) {
        st[stIndex++] = (i - 1) * leftSt;
        st[stIndex++] = 1;
      }
    }
    attributes.st = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 2,
      values: st
    });
  }
  if (vertexFormat.normal) {
    attributes.normal = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 3,
      values: attr.normals
    });
  }
  if (vertexFormat.tangent) {
    attributes.tangent = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 3,
      values: attr.tangents
    });
  }
  if (vertexFormat.bitangent) {
    attributes.bitangent = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 3,
      values: attr.bitangents
    });
  }
  return {
    attributes,
    indices
  };
}
function extrudedAttributes(attributes, vertexFormat) {
  if (!vertexFormat.normal && !vertexFormat.tangent && !vertexFormat.bitangent && !vertexFormat.st) {
    return attributes;
  }
  const positions = attributes.position.values;
  let topNormals;
  let topBitangents;
  if (vertexFormat.normal || vertexFormat.bitangent) {
    topNormals = attributes.normal.values;
    topBitangents = attributes.bitangent.values;
  }
  const size = attributes.position.values.length / 18;
  const threeSize = size * 3;
  const twoSize = size * 2;
  const sixSize = threeSize * 2;
  let i;
  if (vertexFormat.normal || vertexFormat.bitangent || vertexFormat.tangent) {
    const normals = vertexFormat.normal ? new Float32Array(threeSize * 6) : void 0;
    const tangents = vertexFormat.tangent ? new Float32Array(threeSize * 6) : void 0;
    const bitangents = vertexFormat.bitangent ? new Float32Array(threeSize * 6) : void 0;
    let topPosition = cartesian1;
    let bottomPosition = cartesian2;
    let previousPosition = cartesian3;
    let normal = cartesian4;
    let tangent = cartesian5;
    let bitangent = cartesian6;
    let attrIndex = sixSize;
    for (i = 0; i < threeSize; i += 3) {
      const attrIndexOffset = attrIndex + sixSize;
      topPosition = Cartesian3_default.fromArray(positions, i, topPosition);
      bottomPosition = Cartesian3_default.fromArray(
        positions,
        i + threeSize,
        bottomPosition
      );
      previousPosition = Cartesian3_default.fromArray(
        positions,
        (i + 3) % threeSize,
        previousPosition
      );
      bottomPosition = Cartesian3_default.subtract(
        bottomPosition,
        topPosition,
        bottomPosition
      );
      previousPosition = Cartesian3_default.subtract(
        previousPosition,
        topPosition,
        previousPosition
      );
      normal = Cartesian3_default.normalize(
        Cartesian3_default.cross(bottomPosition, previousPosition, normal),
        normal
      );
      if (vertexFormat.normal) {
        CorridorGeometryLibrary_default.addAttribute(normals, normal, attrIndexOffset);
        CorridorGeometryLibrary_default.addAttribute(
          normals,
          normal,
          attrIndexOffset + 3
        );
        CorridorGeometryLibrary_default.addAttribute(normals, normal, attrIndex);
        CorridorGeometryLibrary_default.addAttribute(normals, normal, attrIndex + 3);
      }
      if (vertexFormat.tangent || vertexFormat.bitangent) {
        bitangent = Cartesian3_default.fromArray(topNormals, i, bitangent);
        if (vertexFormat.bitangent) {
          CorridorGeometryLibrary_default.addAttribute(
            bitangents,
            bitangent,
            attrIndexOffset
          );
          CorridorGeometryLibrary_default.addAttribute(
            bitangents,
            bitangent,
            attrIndexOffset + 3
          );
          CorridorGeometryLibrary_default.addAttribute(
            bitangents,
            bitangent,
            attrIndex
          );
          CorridorGeometryLibrary_default.addAttribute(
            bitangents,
            bitangent,
            attrIndex + 3
          );
        }
        if (vertexFormat.tangent) {
          tangent = Cartesian3_default.normalize(
            Cartesian3_default.cross(bitangent, normal, tangent),
            tangent
          );
          CorridorGeometryLibrary_default.addAttribute(
            tangents,
            tangent,
            attrIndexOffset
          );
          CorridorGeometryLibrary_default.addAttribute(
            tangents,
            tangent,
            attrIndexOffset + 3
          );
          CorridorGeometryLibrary_default.addAttribute(tangents, tangent, attrIndex);
          CorridorGeometryLibrary_default.addAttribute(
            tangents,
            tangent,
            attrIndex + 3
          );
        }
      }
      attrIndex += 6;
    }
    if (vertexFormat.normal) {
      normals.set(topNormals);
      for (i = 0; i < threeSize; i += 3) {
        normals[i + threeSize] = -topNormals[i];
        normals[i + threeSize + 1] = -topNormals[i + 1];
        normals[i + threeSize + 2] = -topNormals[i + 2];
      }
      attributes.normal.values = normals;
    } else {
      attributes.normal = void 0;
    }
    if (vertexFormat.bitangent) {
      bitangents.set(topBitangents);
      bitangents.set(topBitangents, threeSize);
      attributes.bitangent.values = bitangents;
    } else {
      attributes.bitangent = void 0;
    }
    if (vertexFormat.tangent) {
      const topTangents = attributes.tangent.values;
      tangents.set(topTangents);
      tangents.set(topTangents, threeSize);
      attributes.tangent.values = tangents;
    }
  }
  if (vertexFormat.st) {
    const topSt = attributes.st.values;
    const st = new Float32Array(twoSize * 6);
    st.set(topSt);
    st.set(topSt, twoSize);
    let index = twoSize * 2;
    for (let j = 0; j < 2; j++) {
      st[index++] = topSt[0];
      st[index++] = topSt[1];
      for (i = 2; i < twoSize; i += 2) {
        const s = topSt[i];
        const t = topSt[i + 1];
        st[index++] = s;
        st[index++] = t;
        st[index++] = s;
        st[index++] = t;
      }
      st[index++] = topSt[0];
      st[index++] = topSt[1];
    }
    attributes.st.values = st;
  }
  return attributes;
}
function addWallPositions(positions, index, wallPositions) {
  wallPositions[index++] = positions[0];
  wallPositions[index++] = positions[1];
  wallPositions[index++] = positions[2];
  for (let i = 3; i < positions.length; i += 3) {
    const x = positions[i];
    const y = positions[i + 1];
    const z = positions[i + 2];
    wallPositions[index++] = x;
    wallPositions[index++] = y;
    wallPositions[index++] = z;
    wallPositions[index++] = x;
    wallPositions[index++] = y;
    wallPositions[index++] = z;
  }
  wallPositions[index++] = positions[0];
  wallPositions[index++] = positions[1];
  wallPositions[index++] = positions[2];
  return wallPositions;
}
function computePositionsExtruded(params, vertexFormat) {
  const topVertexFormat = new VertexFormat_default({
    position: vertexFormat.position,
    normal: vertexFormat.normal || vertexFormat.bitangent || params.shadowVolume,
    tangent: vertexFormat.tangent,
    bitangent: vertexFormat.normal || vertexFormat.bitangent,
    st: vertexFormat.st
  });
  const ellipsoid = params.ellipsoid;
  const computedPositions = CorridorGeometryLibrary_default.computePositions(params);
  const attr = combine(computedPositions, topVertexFormat, ellipsoid);
  const height = params.height;
  const extrudedHeight = params.extrudedHeight;
  let attributes = attr.attributes;
  const indices = attr.indices;
  let positions = attributes.position.values;
  let length = positions.length;
  const newPositions = new Float64Array(length * 6);
  let extrudedPositions = new Float64Array(length);
  extrudedPositions.set(positions);
  let wallPositions = new Float64Array(length * 4);
  positions = PolygonPipeline_default.scaleToGeodeticHeight(
    positions,
    height,
    ellipsoid
  );
  wallPositions = addWallPositions(positions, 0, wallPositions);
  extrudedPositions = PolygonPipeline_default.scaleToGeodeticHeight(
    extrudedPositions,
    extrudedHeight,
    ellipsoid
  );
  wallPositions = addWallPositions(
    extrudedPositions,
    length * 2,
    wallPositions
  );
  newPositions.set(positions);
  newPositions.set(extrudedPositions, length);
  newPositions.set(wallPositions, length * 2);
  attributes.position.values = newPositions;
  attributes = extrudedAttributes(attributes, vertexFormat);
  let i;
  const size = length / 3;
  if (params.shadowVolume) {
    const topNormals = attributes.normal.values;
    length = topNormals.length;
    let extrudeNormals = new Float32Array(length * 6);
    for (i = 0; i < length; i++) {
      topNormals[i] = -topNormals[i];
    }
    extrudeNormals.set(topNormals, length);
    extrudeNormals = addWallPositions(topNormals, length * 4, extrudeNormals);
    attributes.extrudeDirection = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.FLOAT,
      componentsPerAttribute: 3,
      values: extrudeNormals
    });
    if (!vertexFormat.normal) {
      attributes.normal = void 0;
    }
  }
  if (defined_default(params.offsetAttribute)) {
    let applyOffset = new Uint8Array(size * 6);
    if (params.offsetAttribute === GeometryOffsetAttribute_default.TOP) {
      applyOffset = applyOffset.fill(1, 0, size).fill(1, size * 2, size * 4);
    } else {
      const applyOffsetValue = params.offsetAttribute === GeometryOffsetAttribute_default.NONE ? 0 : 1;
      applyOffset = applyOffset.fill(applyOffsetValue);
    }
    attributes.applyOffset = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.UNSIGNED_BYTE,
      componentsPerAttribute: 1,
      values: applyOffset
    });
  }
  const iLength = indices.length;
  const twoSize = size + size;
  const newIndices = IndexDatatype_default.createTypedArray(
    newPositions.length / 3,
    iLength * 2 + twoSize * 3
  );
  newIndices.set(indices);
  let index = iLength;
  for (i = 0; i < iLength; i += 3) {
    const v0 = indices[i];
    const v1 = indices[i + 1];
    const v2 = indices[i + 2];
    newIndices[index++] = v2 + size;
    newIndices[index++] = v1 + size;
    newIndices[index++] = v0 + size;
  }
  let UL, LL, UR, LR;
  for (i = 0; i < twoSize; i += 2) {
    UL = i + twoSize;
    LL = UL + twoSize;
    UR = UL + 1;
    LR = LL + 1;
    newIndices[index++] = UL;
    newIndices[index++] = LL;
    newIndices[index++] = UR;
    newIndices[index++] = UR;
    newIndices[index++] = LL;
    newIndices[index++] = LR;
  }
  return {
    attributes,
    indices: newIndices
  };
}
var scratchCartesian1 = new Cartesian3_default();
var scratchCartesian2 = new Cartesian3_default();
var scratchCartographic = new Cartographic_default();
function computeOffsetPoints(position1, position2, ellipsoid, halfWidth, min, max) {
  const direction = Cartesian3_default.subtract(
    position2,
    position1,
    scratchCartesian1
  );
  Cartesian3_default.normalize(direction, direction);
  const normal = ellipsoid.geodeticSurfaceNormal(position1, scratchCartesian2);
  const offsetDirection = Cartesian3_default.cross(
    direction,
    normal,
    scratchCartesian1
  );
  Cartesian3_default.multiplyByScalar(offsetDirection, halfWidth, offsetDirection);
  let minLat = min.latitude;
  let minLon = min.longitude;
  let maxLat = max.latitude;
  let maxLon = max.longitude;
  Cartesian3_default.add(position1, offsetDirection, scratchCartesian2);
  ellipsoid.cartesianToCartographic(scratchCartesian2, scratchCartographic);
  let lat = scratchCartographic.latitude;
  let lon = scratchCartographic.longitude;
  minLat = Math.min(minLat, lat);
  minLon = Math.min(minLon, lon);
  maxLat = Math.max(maxLat, lat);
  maxLon = Math.max(maxLon, lon);
  Cartesian3_default.subtract(position1, offsetDirection, scratchCartesian2);
  ellipsoid.cartesianToCartographic(scratchCartesian2, scratchCartographic);
  lat = scratchCartographic.latitude;
  lon = scratchCartographic.longitude;
  minLat = Math.min(minLat, lat);
  minLon = Math.min(minLon, lon);
  maxLat = Math.max(maxLat, lat);
  maxLon = Math.max(maxLon, lon);
  min.latitude = minLat;
  min.longitude = minLon;
  max.latitude = maxLat;
  max.longitude = maxLon;
}
var scratchCartesianOffset = new Cartesian3_default();
var scratchCartesianEnds = new Cartesian3_default();
var scratchCartographicMin = new Cartographic_default();
var scratchCartographicMax = new Cartographic_default();
function computeRectangle(positions, ellipsoid, width, cornerType, result) {
  positions = scaleToSurface(positions, ellipsoid);
  const cleanPositions = arrayRemoveDuplicates_default(
    positions,
    Cartesian3_default.equalsEpsilon
  );
  const length = cleanPositions.length;
  if (length < 2 || width <= 0) {
    return new Rectangle_default();
  }
  const halfWidth = width * 0.5;
  scratchCartographicMin.latitude = Number.POSITIVE_INFINITY;
  scratchCartographicMin.longitude = Number.POSITIVE_INFINITY;
  scratchCartographicMax.latitude = Number.NEGATIVE_INFINITY;
  scratchCartographicMax.longitude = Number.NEGATIVE_INFINITY;
  let lat, lon;
  if (cornerType === CornerType_default.ROUNDED) {
    const first = cleanPositions[0];
    Cartesian3_default.subtract(first, cleanPositions[1], scratchCartesianOffset);
    Cartesian3_default.normalize(scratchCartesianOffset, scratchCartesianOffset);
    Cartesian3_default.multiplyByScalar(
      scratchCartesianOffset,
      halfWidth,
      scratchCartesianOffset
    );
    Cartesian3_default.add(first, scratchCartesianOffset, scratchCartesianEnds);
    ellipsoid.cartesianToCartographic(
      scratchCartesianEnds,
      scratchCartographic
    );
    lat = scratchCartographic.latitude;
    lon = scratchCartographic.longitude;
    scratchCartographicMin.latitude = Math.min(
      scratchCartographicMin.latitude,
      lat
    );
    scratchCartographicMin.longitude = Math.min(
      scratchCartographicMin.longitude,
      lon
    );
    scratchCartographicMax.latitude = Math.max(
      scratchCartographicMax.latitude,
      lat
    );
    scratchCartographicMax.longitude = Math.max(
      scratchCartographicMax.longitude,
      lon
    );
  }
  for (let i = 0; i < length - 1; ++i) {
    computeOffsetPoints(
      cleanPositions[i],
      cleanPositions[i + 1],
      ellipsoid,
      halfWidth,
      scratchCartographicMin,
      scratchCartographicMax
    );
  }
  const last = cleanPositions[length - 1];
  Cartesian3_default.subtract(last, cleanPositions[length - 2], scratchCartesianOffset);
  Cartesian3_default.normalize(scratchCartesianOffset, scratchCartesianOffset);
  Cartesian3_default.multiplyByScalar(
    scratchCartesianOffset,
    halfWidth,
    scratchCartesianOffset
  );
  Cartesian3_default.add(last, scratchCartesianOffset, scratchCartesianEnds);
  computeOffsetPoints(
    last,
    scratchCartesianEnds,
    ellipsoid,
    halfWidth,
    scratchCartographicMin,
    scratchCartographicMax
  );
  if (cornerType === CornerType_default.ROUNDED) {
    ellipsoid.cartesianToCartographic(
      scratchCartesianEnds,
      scratchCartographic
    );
    lat = scratchCartographic.latitude;
    lon = scratchCartographic.longitude;
    scratchCartographicMin.latitude = Math.min(
      scratchCartographicMin.latitude,
      lat
    );
    scratchCartographicMin.longitude = Math.min(
      scratchCartographicMin.longitude,
      lon
    );
    scratchCartographicMax.latitude = Math.max(
      scratchCartographicMax.latitude,
      lat
    );
    scratchCartographicMax.longitude = Math.max(
      scratchCartographicMax.longitude,
      lon
    );
  }
  const rectangle = defined_default(result) ? result : new Rectangle_default();
  rectangle.north = scratchCartographicMax.latitude;
  rectangle.south = scratchCartographicMin.latitude;
  rectangle.east = scratchCartographicMax.longitude;
  rectangle.west = scratchCartographicMin.longitude;
  return rectangle;
}
function CorridorGeometry(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  const positions = options.positions;
  const width = options.width;
  Check_default.defined("options.positions", positions);
  Check_default.defined("options.width", width);
  const height = defaultValue_default(options.height, 0);
  const extrudedHeight = defaultValue_default(options.extrudedHeight, height);
  this._positions = positions;
  this._ellipsoid = Ellipsoid_default.clone(
    defaultValue_default(options.ellipsoid, Ellipsoid_default.WGS84)
  );
  this._vertexFormat = VertexFormat_default.clone(
    defaultValue_default(options.vertexFormat, VertexFormat_default.DEFAULT)
  );
  this._width = width;
  this._height = Math.max(height, extrudedHeight);
  this._extrudedHeight = Math.min(height, extrudedHeight);
  this._cornerType = defaultValue_default(options.cornerType, CornerType_default.ROUNDED);
  this._granularity = defaultValue_default(
    options.granularity,
    Math_default.RADIANS_PER_DEGREE
  );
  this._shadowVolume = defaultValue_default(options.shadowVolume, false);
  this._workerName = "createCorridorGeometry";
  this._offsetAttribute = options.offsetAttribute;
  this._rectangle = void 0;
  this.packedLength = 1 + positions.length * Cartesian3_default.packedLength + Ellipsoid_default.packedLength + VertexFormat_default.packedLength + 7;
}
CorridorGeometry.pack = function(value, array, startingIndex) {
  Check_default.defined("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  const positions = value._positions;
  const length = positions.length;
  array[startingIndex++] = length;
  for (let i = 0; i < length; ++i, startingIndex += Cartesian3_default.packedLength) {
    Cartesian3_default.pack(positions[i], array, startingIndex);
  }
  Ellipsoid_default.pack(value._ellipsoid, array, startingIndex);
  startingIndex += Ellipsoid_default.packedLength;
  VertexFormat_default.pack(value._vertexFormat, array, startingIndex);
  startingIndex += VertexFormat_default.packedLength;
  array[startingIndex++] = value._width;
  array[startingIndex++] = value._height;
  array[startingIndex++] = value._extrudedHeight;
  array[startingIndex++] = value._cornerType;
  array[startingIndex++] = value._granularity;
  array[startingIndex++] = value._shadowVolume ? 1 : 0;
  array[startingIndex] = defaultValue_default(value._offsetAttribute, -1);
  return array;
};
var scratchEllipsoid = Ellipsoid_default.clone(Ellipsoid_default.UNIT_SPHERE);
var scratchVertexFormat = new VertexFormat_default();
var scratchOptions = {
  positions: void 0,
  ellipsoid: scratchEllipsoid,
  vertexFormat: scratchVertexFormat,
  width: void 0,
  height: void 0,
  extrudedHeight: void 0,
  cornerType: void 0,
  granularity: void 0,
  shadowVolume: void 0,
  offsetAttribute: void 0
};
CorridorGeometry.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  const length = array[startingIndex++];
  const positions = new Array(length);
  for (let i = 0; i < length; ++i, startingIndex += Cartesian3_default.packedLength) {
    positions[i] = Cartesian3_default.unpack(array, startingIndex);
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
  const height = array[startingIndex++];
  const extrudedHeight = array[startingIndex++];
  const cornerType = array[startingIndex++];
  const granularity = array[startingIndex++];
  const shadowVolume = array[startingIndex++] === 1;
  const offsetAttribute = array[startingIndex];
  if (!defined_default(result)) {
    scratchOptions.positions = positions;
    scratchOptions.width = width;
    scratchOptions.height = height;
    scratchOptions.extrudedHeight = extrudedHeight;
    scratchOptions.cornerType = cornerType;
    scratchOptions.granularity = granularity;
    scratchOptions.shadowVolume = shadowVolume;
    scratchOptions.offsetAttribute = offsetAttribute === -1 ? void 0 : offsetAttribute;
    return new CorridorGeometry(scratchOptions);
  }
  result._positions = positions;
  result._ellipsoid = Ellipsoid_default.clone(ellipsoid, result._ellipsoid);
  result._vertexFormat = VertexFormat_default.clone(vertexFormat, result._vertexFormat);
  result._width = width;
  result._height = height;
  result._extrudedHeight = extrudedHeight;
  result._cornerType = cornerType;
  result._granularity = granularity;
  result._shadowVolume = shadowVolume;
  result._offsetAttribute = offsetAttribute === -1 ? void 0 : offsetAttribute;
  return result;
};
CorridorGeometry.computeRectangle = function(options, result) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  const positions = options.positions;
  const width = options.width;
  Check_default.defined("options.positions", positions);
  Check_default.defined("options.width", width);
  const ellipsoid = defaultValue_default(options.ellipsoid, Ellipsoid_default.WGS84);
  const cornerType = defaultValue_default(options.cornerType, CornerType_default.ROUNDED);
  return computeRectangle(positions, ellipsoid, width, cornerType, result);
};
CorridorGeometry.createGeometry = function(corridorGeometry) {
  let positions = corridorGeometry._positions;
  const width = corridorGeometry._width;
  const ellipsoid = corridorGeometry._ellipsoid;
  positions = scaleToSurface(positions, ellipsoid);
  const cleanPositions = arrayRemoveDuplicates_default(
    positions,
    Cartesian3_default.equalsEpsilon
  );
  if (cleanPositions.length < 2 || width <= 0) {
    return;
  }
  const height = corridorGeometry._height;
  const extrudedHeight = corridorGeometry._extrudedHeight;
  const extrude = !Math_default.equalsEpsilon(
    height,
    extrudedHeight,
    0,
    Math_default.EPSILON2
  );
  const vertexFormat = corridorGeometry._vertexFormat;
  const params = {
    ellipsoid,
    positions: cleanPositions,
    width,
    cornerType: corridorGeometry._cornerType,
    granularity: corridorGeometry._granularity,
    saveAttributes: true
  };
  let attr;
  if (extrude) {
    params.height = height;
    params.extrudedHeight = extrudedHeight;
    params.shadowVolume = corridorGeometry._shadowVolume;
    params.offsetAttribute = corridorGeometry._offsetAttribute;
    attr = computePositionsExtruded(params, vertexFormat);
  } else {
    const computedPositions = CorridorGeometryLibrary_default.computePositions(params);
    attr = combine(computedPositions, vertexFormat, ellipsoid);
    attr.attributes.position.values = PolygonPipeline_default.scaleToGeodeticHeight(
      attr.attributes.position.values,
      height,
      ellipsoid
    );
    if (defined_default(corridorGeometry._offsetAttribute)) {
      const applyOffsetValue = corridorGeometry._offsetAttribute === GeometryOffsetAttribute_default.NONE ? 0 : 1;
      const length = attr.attributes.position.values.length;
      const applyOffset = new Uint8Array(length / 3).fill(applyOffsetValue);
      attr.attributes.applyOffset = new GeometryAttribute_default({
        componentDatatype: ComponentDatatype_default.UNSIGNED_BYTE,
        componentsPerAttribute: 1,
        values: applyOffset
      });
    }
  }
  const attributes = attr.attributes;
  const boundingSphere = BoundingSphere_default.fromVertices(
    attributes.position.values,
    void 0,
    3
  );
  if (!vertexFormat.position) {
    attr.attributes.position.values = void 0;
  }
  return new Geometry_default({
    attributes,
    indices: attr.indices,
    primitiveType: PrimitiveType_default.TRIANGLES,
    boundingSphere,
    offsetAttribute: corridorGeometry._offsetAttribute
  });
};
CorridorGeometry.createShadowVolume = function(corridorGeometry, minHeightFunc, maxHeightFunc) {
  const granularity = corridorGeometry._granularity;
  const ellipsoid = corridorGeometry._ellipsoid;
  const minHeight = minHeightFunc(granularity, ellipsoid);
  const maxHeight = maxHeightFunc(granularity, ellipsoid);
  return new CorridorGeometry({
    positions: corridorGeometry._positions,
    width: corridorGeometry._width,
    cornerType: corridorGeometry._cornerType,
    ellipsoid,
    granularity,
    extrudedHeight: minHeight,
    height: maxHeight,
    vertexFormat: VertexFormat_default.POSITION_ONLY,
    shadowVolume: true
  });
};
Object.defineProperties(CorridorGeometry.prototype, {
  /**
   * @private
   */
  rectangle: {
    get: function() {
      if (!defined_default(this._rectangle)) {
        this._rectangle = computeRectangle(
          this._positions,
          this._ellipsoid,
          this._width,
          this._cornerType
        );
      }
      return this._rectangle;
    }
  },
  /**
   * For remapping texture coordinates when rendering CorridorGeometries as GroundPrimitives.
   *
   * Corridors don't support stRotation,
   * so just return the corners of the original system.
   * @private
   */
  textureCoordinateRotationPoints: {
    get: function() {
      return [0, 0, 0, 1, 1, 0];
    }
  }
});
var CorridorGeometry_default = CorridorGeometry;

// packages/engine/Source/Workers/createCorridorGeometry.js
function createCorridorGeometry(corridorGeometry, offset) {
  if (defined_default(offset)) {
    corridorGeometry = CorridorGeometry_default.unpack(corridorGeometry, offset);
  }
  corridorGeometry._ellipsoid = Ellipsoid_default.clone(corridorGeometry._ellipsoid);
  return CorridorGeometry_default.createGeometry(corridorGeometry);
}
var createCorridorGeometry_default = createCorridorGeometry;
export {
  createCorridorGeometry_default as default
};
