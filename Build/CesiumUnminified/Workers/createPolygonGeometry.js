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
  BoundingRectangle_default
} from "./chunk-VRK4NS6A.js";
import {
  PolygonGeometryLibrary_default
} from "./chunk-NMQGGKYU.js";
import {
  ArcType_default
} from "./chunk-7ZN7OZXO.js";
import {
  GeometryInstance_default
} from "./chunk-G4ABMSHX.js";
import {
  GeometryPipeline_default
} from "./chunk-NMEDZZL7.js";
import "./chunk-IJT7RSPE.js";
import "./chunk-54JVCS3Y.js";
import {
  EllipsoidGeodesic_default
} from "./chunk-DAY2RGWJ.js";
import {
  GeometryOffsetAttribute_default
} from "./chunk-DXQTOATV.js";
import {
  VertexFormat_default
} from "./chunk-HWW4AAWK.js";
import {
  EllipsoidTangentPlane_default
} from "./chunk-LATQ4URD.js";
import "./chunk-IYKFKVQR.js";
import {
  PolygonPipeline_default,
  WindingOrder_default
} from "./chunk-3DTYZXHQ.js";
import "./chunk-PZS6RNLR.js";
import "./chunk-RSJG3PFO.js";
import "./chunk-MKJM6R4K.js";
import "./chunk-PY3JQBWU.js";
import {
  IndexDatatype_default
} from "./chunk-VOS2BACB.js";
import "./chunk-CHKMKWJP.js";
import {
  GeometryAttribute_default,
  Geometry_default
} from "./chunk-LBUZCHJN.js";
import {
  BoundingSphere_default,
  Quaternion_default
} from "./chunk-FS4DCO6P.js";
import "./chunk-Z2BQIJST.js";
import {
  Cartesian2_default,
  Rectangle_default
} from "./chunk-5G2JRFMX.js";
import {
  ComponentDatatype_default
} from "./chunk-3UWS6LZS.js";
import {
  Cartesian3_default,
  Cartographic_default,
  Ellipsoid_default,
  Matrix3_default
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
  Check_default,
  DeveloperError_default
} from "./chunk-J64Y4DQH.js";
import {
  defined_default
} from "./chunk-7KX4PCVC.js";

// packages/engine/Source/Core/PolygonGeometry.js
var scratchCarto1 = new Cartographic_default();
var scratchCarto2 = new Cartographic_default();
function adjustPosHeightsForNormal(position, p1, p2, ellipsoid) {
  const carto1 = ellipsoid.cartesianToCartographic(position, scratchCarto1);
  const height = carto1.height;
  const p1Carto = ellipsoid.cartesianToCartographic(p1, scratchCarto2);
  p1Carto.height = height;
  ellipsoid.cartographicToCartesian(p1Carto, p1);
  const p2Carto = ellipsoid.cartesianToCartographic(p2, scratchCarto2);
  p2Carto.height = height - 100;
  ellipsoid.cartographicToCartesian(p2Carto, p2);
}
var scratchBoundingRectangle = new BoundingRectangle_default();
var scratchPosition = new Cartesian3_default();
var scratchNormal = new Cartesian3_default();
var scratchTangent = new Cartesian3_default();
var scratchBitangent = new Cartesian3_default();
var p1Scratch = new Cartesian3_default();
var p2Scratch = new Cartesian3_default();
var scratchPerPosNormal = new Cartesian3_default();
var scratchPerPosTangent = new Cartesian3_default();
var scratchPerPosBitangent = new Cartesian3_default();
var appendTextureCoordinatesOrigin = new Cartesian2_default();
var appendTextureCoordinatesCartesian2 = new Cartesian2_default();
var appendTextureCoordinatesCartesian3 = new Cartesian3_default();
var appendTextureCoordinatesQuaternion = new Quaternion_default();
var appendTextureCoordinatesMatrix3 = new Matrix3_default();
var tangentMatrixScratch = new Matrix3_default();
function computeAttributes(options) {
  const vertexFormat = options.vertexFormat;
  const geometry = options.geometry;
  const shadowVolume = options.shadowVolume;
  const flatPositions = geometry.attributes.position.values;
  const flatTexcoords = defined_default(geometry.attributes.st) ? geometry.attributes.st.values : void 0;
  let length = flatPositions.length;
  const wall = options.wall;
  const top = options.top || wall;
  const bottom = options.bottom || wall;
  if (vertexFormat.st || vertexFormat.normal || vertexFormat.tangent || vertexFormat.bitangent || shadowVolume) {
    const boundingRectangle = options.boundingRectangle;
    const tangentPlane = options.tangentPlane;
    const ellipsoid = options.ellipsoid;
    const stRotation = options.stRotation;
    const perPositionHeight = options.perPositionHeight;
    const origin = appendTextureCoordinatesOrigin;
    origin.x = boundingRectangle.x;
    origin.y = boundingRectangle.y;
    const textureCoordinates = vertexFormat.st ? new Float32Array(2 * (length / 3)) : void 0;
    let normals;
    if (vertexFormat.normal) {
      if (perPositionHeight && top && !wall) {
        normals = geometry.attributes.normal.values;
      } else {
        normals = new Float32Array(length);
      }
    }
    const tangents = vertexFormat.tangent ? new Float32Array(length) : void 0;
    const bitangents = vertexFormat.bitangent ? new Float32Array(length) : void 0;
    const extrudeNormals = shadowVolume ? new Float32Array(length) : void 0;
    let textureCoordIndex = 0;
    let attrIndex = 0;
    let normal = scratchNormal;
    let tangent = scratchTangent;
    let bitangent = scratchBitangent;
    let recomputeNormal = true;
    let textureMatrix = appendTextureCoordinatesMatrix3;
    let tangentRotationMatrix = tangentMatrixScratch;
    if (stRotation !== 0) {
      let rotation = Quaternion_default.fromAxisAngle(
        tangentPlane._plane.normal,
        stRotation,
        appendTextureCoordinatesQuaternion
      );
      textureMatrix = Matrix3_default.fromQuaternion(rotation, textureMatrix);
      rotation = Quaternion_default.fromAxisAngle(
        tangentPlane._plane.normal,
        -stRotation,
        appendTextureCoordinatesQuaternion
      );
      tangentRotationMatrix = Matrix3_default.fromQuaternion(
        rotation,
        tangentRotationMatrix
      );
    } else {
      textureMatrix = Matrix3_default.clone(Matrix3_default.IDENTITY, textureMatrix);
      tangentRotationMatrix = Matrix3_default.clone(
        Matrix3_default.IDENTITY,
        tangentRotationMatrix
      );
    }
    let bottomOffset = 0;
    let bottomOffset2 = 0;
    if (top && bottom) {
      bottomOffset = length / 2;
      bottomOffset2 = length / 3;
      length /= 2;
    }
    for (let i = 0; i < length; i += 3) {
      const position = Cartesian3_default.fromArray(
        flatPositions,
        i,
        appendTextureCoordinatesCartesian3
      );
      if (vertexFormat.st) {
        if (!defined_default(flatTexcoords)) {
          let p = Matrix3_default.multiplyByVector(
            textureMatrix,
            position,
            scratchPosition
          );
          p = ellipsoid.scaleToGeodeticSurface(p, p);
          const st = tangentPlane.projectPointOntoPlane(
            p,
            appendTextureCoordinatesCartesian2
          );
          Cartesian2_default.subtract(st, origin, st);
          const stx = Math_default.clamp(st.x / boundingRectangle.width, 0, 1);
          const sty = Math_default.clamp(st.y / boundingRectangle.height, 0, 1);
          if (bottom) {
            textureCoordinates[textureCoordIndex + bottomOffset2] = stx;
            textureCoordinates[textureCoordIndex + 1 + bottomOffset2] = sty;
          }
          if (top) {
            textureCoordinates[textureCoordIndex] = stx;
            textureCoordinates[textureCoordIndex + 1] = sty;
          }
          textureCoordIndex += 2;
        }
      }
      if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.bitangent || shadowVolume) {
        const attrIndex1 = attrIndex + 1;
        const attrIndex2 = attrIndex + 2;
        if (wall) {
          if (i + 3 < length) {
            const p1 = Cartesian3_default.fromArray(flatPositions, i + 3, p1Scratch);
            if (recomputeNormal) {
              const p2 = Cartesian3_default.fromArray(
                flatPositions,
                i + length,
                p2Scratch
              );
              if (perPositionHeight) {
                adjustPosHeightsForNormal(position, p1, p2, ellipsoid);
              }
              Cartesian3_default.subtract(p1, position, p1);
              Cartesian3_default.subtract(p2, position, p2);
              normal = Cartesian3_default.normalize(
                Cartesian3_default.cross(p2, p1, normal),
                normal
              );
              recomputeNormal = false;
            }
            if (Cartesian3_default.equalsEpsilon(p1, position, Math_default.EPSILON10)) {
              recomputeNormal = true;
            }
          }
          if (vertexFormat.tangent || vertexFormat.bitangent) {
            bitangent = ellipsoid.geodeticSurfaceNormal(position, bitangent);
            if (vertexFormat.tangent) {
              tangent = Cartesian3_default.normalize(
                Cartesian3_default.cross(bitangent, normal, tangent),
                tangent
              );
            }
          }
        } else {
          normal = ellipsoid.geodeticSurfaceNormal(position, normal);
          if (vertexFormat.tangent || vertexFormat.bitangent) {
            if (perPositionHeight) {
              scratchPerPosNormal = Cartesian3_default.fromArray(
                normals,
                attrIndex,
                scratchPerPosNormal
              );
              scratchPerPosTangent = Cartesian3_default.cross(
                Cartesian3_default.UNIT_Z,
                scratchPerPosNormal,
                scratchPerPosTangent
              );
              scratchPerPosTangent = Cartesian3_default.normalize(
                Matrix3_default.multiplyByVector(
                  tangentRotationMatrix,
                  scratchPerPosTangent,
                  scratchPerPosTangent
                ),
                scratchPerPosTangent
              );
              if (vertexFormat.bitangent) {
                scratchPerPosBitangent = Cartesian3_default.normalize(
                  Cartesian3_default.cross(
                    scratchPerPosNormal,
                    scratchPerPosTangent,
                    scratchPerPosBitangent
                  ),
                  scratchPerPosBitangent
                );
              }
            }
            tangent = Cartesian3_default.cross(Cartesian3_default.UNIT_Z, normal, tangent);
            tangent = Cartesian3_default.normalize(
              Matrix3_default.multiplyByVector(tangentRotationMatrix, tangent, tangent),
              tangent
            );
            if (vertexFormat.bitangent) {
              bitangent = Cartesian3_default.normalize(
                Cartesian3_default.cross(normal, tangent, bitangent),
                bitangent
              );
            }
          }
        }
        if (vertexFormat.normal) {
          if (options.wall) {
            normals[attrIndex + bottomOffset] = normal.x;
            normals[attrIndex1 + bottomOffset] = normal.y;
            normals[attrIndex2 + bottomOffset] = normal.z;
          } else if (bottom) {
            normals[attrIndex + bottomOffset] = -normal.x;
            normals[attrIndex1 + bottomOffset] = -normal.y;
            normals[attrIndex2 + bottomOffset] = -normal.z;
          }
          if (top && !perPositionHeight || wall) {
            normals[attrIndex] = normal.x;
            normals[attrIndex1] = normal.y;
            normals[attrIndex2] = normal.z;
          }
        }
        if (shadowVolume) {
          if (wall) {
            normal = ellipsoid.geodeticSurfaceNormal(position, normal);
          }
          extrudeNormals[attrIndex + bottomOffset] = -normal.x;
          extrudeNormals[attrIndex1 + bottomOffset] = -normal.y;
          extrudeNormals[attrIndex2 + bottomOffset] = -normal.z;
        }
        if (vertexFormat.tangent) {
          if (options.wall) {
            tangents[attrIndex + bottomOffset] = tangent.x;
            tangents[attrIndex1 + bottomOffset] = tangent.y;
            tangents[attrIndex2 + bottomOffset] = tangent.z;
          } else if (bottom) {
            tangents[attrIndex + bottomOffset] = -tangent.x;
            tangents[attrIndex1 + bottomOffset] = -tangent.y;
            tangents[attrIndex2 + bottomOffset] = -tangent.z;
          }
          if (top) {
            if (perPositionHeight) {
              tangents[attrIndex] = scratchPerPosTangent.x;
              tangents[attrIndex1] = scratchPerPosTangent.y;
              tangents[attrIndex2] = scratchPerPosTangent.z;
            } else {
              tangents[attrIndex] = tangent.x;
              tangents[attrIndex1] = tangent.y;
              tangents[attrIndex2] = tangent.z;
            }
          }
        }
        if (vertexFormat.bitangent) {
          if (bottom) {
            bitangents[attrIndex + bottomOffset] = bitangent.x;
            bitangents[attrIndex1 + bottomOffset] = bitangent.y;
            bitangents[attrIndex2 + bottomOffset] = bitangent.z;
          }
          if (top) {
            if (perPositionHeight) {
              bitangents[attrIndex] = scratchPerPosBitangent.x;
              bitangents[attrIndex1] = scratchPerPosBitangent.y;
              bitangents[attrIndex2] = scratchPerPosBitangent.z;
            } else {
              bitangents[attrIndex] = bitangent.x;
              bitangents[attrIndex1] = bitangent.y;
              bitangents[attrIndex2] = bitangent.z;
            }
          }
        }
        attrIndex += 3;
      }
    }
    if (vertexFormat.st && !defined_default(flatTexcoords)) {
      geometry.attributes.st = new GeometryAttribute_default({
        componentDatatype: ComponentDatatype_default.FLOAT,
        componentsPerAttribute: 2,
        values: textureCoordinates
      });
    }
    if (vertexFormat.normal) {
      geometry.attributes.normal = new GeometryAttribute_default({
        componentDatatype: ComponentDatatype_default.FLOAT,
        componentsPerAttribute: 3,
        values: normals
      });
    }
    if (vertexFormat.tangent) {
      geometry.attributes.tangent = new GeometryAttribute_default({
        componentDatatype: ComponentDatatype_default.FLOAT,
        componentsPerAttribute: 3,
        values: tangents
      });
    }
    if (vertexFormat.bitangent) {
      geometry.attributes.bitangent = new GeometryAttribute_default({
        componentDatatype: ComponentDatatype_default.FLOAT,
        componentsPerAttribute: 3,
        values: bitangents
      });
    }
    if (shadowVolume) {
      geometry.attributes.extrudeDirection = new GeometryAttribute_default({
        componentDatatype: ComponentDatatype_default.FLOAT,
        componentsPerAttribute: 3,
        values: extrudeNormals
      });
    }
  }
  if (options.extrude && defined_default(options.offsetAttribute)) {
    const size = flatPositions.length / 3;
    let offsetAttribute = new Uint8Array(size);
    if (options.offsetAttribute === GeometryOffsetAttribute_default.TOP) {
      if (top && bottom || wall) {
        offsetAttribute = offsetAttribute.fill(1, 0, size / 2);
      } else if (top) {
        offsetAttribute = offsetAttribute.fill(1);
      }
    } else {
      const offsetValue = options.offsetAttribute === GeometryOffsetAttribute_default.NONE ? 0 : 1;
      offsetAttribute = offsetAttribute.fill(offsetValue);
    }
    geometry.attributes.applyOffset = new GeometryAttribute_default({
      componentDatatype: ComponentDatatype_default.UNSIGNED_BYTE,
      componentsPerAttribute: 1,
      values: offsetAttribute
    });
  }
  return geometry;
}
var startCartographicScratch = new Cartographic_default();
var endCartographicScratch = new Cartographic_default();
var idlCross = {
  westOverIDL: 0,
  eastOverIDL: 0
};
var ellipsoidGeodesic = new EllipsoidGeodesic_default();
function computeRectangle(positions, ellipsoid, arcType, granularity, result) {
  result = defaultValue_default(result, new Rectangle_default());
  if (!defined_default(positions) || positions.length < 3) {
    result.west = 0;
    result.north = 0;
    result.south = 0;
    result.east = 0;
    return result;
  }
  if (arcType === ArcType_default.RHUMB) {
    return Rectangle_default.fromCartesianArray(positions, ellipsoid, result);
  }
  if (!ellipsoidGeodesic.ellipsoid.equals(ellipsoid)) {
    ellipsoidGeodesic = new EllipsoidGeodesic_default(void 0, void 0, ellipsoid);
  }
  result.west = Number.POSITIVE_INFINITY;
  result.east = Number.NEGATIVE_INFINITY;
  result.south = Number.POSITIVE_INFINITY;
  result.north = Number.NEGATIVE_INFINITY;
  idlCross.westOverIDL = Number.POSITIVE_INFINITY;
  idlCross.eastOverIDL = Number.NEGATIVE_INFINITY;
  const inverseChordLength = 1 / Math_default.chordLength(granularity, ellipsoid.maximumRadius);
  const positionsLength = positions.length;
  let endCartographic = ellipsoid.cartesianToCartographic(
    positions[0],
    endCartographicScratch
  );
  let startCartographic = startCartographicScratch;
  let swap;
  for (let i = 1; i < positionsLength; i++) {
    swap = startCartographic;
    startCartographic = endCartographic;
    endCartographic = ellipsoid.cartesianToCartographic(positions[i], swap);
    ellipsoidGeodesic.setEndPoints(startCartographic, endCartographic);
    interpolateAndGrowRectangle(
      ellipsoidGeodesic,
      inverseChordLength,
      result,
      idlCross
    );
  }
  swap = startCartographic;
  startCartographic = endCartographic;
  endCartographic = ellipsoid.cartesianToCartographic(positions[0], swap);
  ellipsoidGeodesic.setEndPoints(startCartographic, endCartographic);
  interpolateAndGrowRectangle(
    ellipsoidGeodesic,
    inverseChordLength,
    result,
    idlCross
  );
  if (result.east - result.west > idlCross.eastOverIDL - idlCross.westOverIDL) {
    result.west = idlCross.westOverIDL;
    result.east = idlCross.eastOverIDL;
    if (result.east > Math_default.PI) {
      result.east = result.east - Math_default.TWO_PI;
    }
    if (result.west > Math_default.PI) {
      result.west = result.west - Math_default.TWO_PI;
    }
  }
  return result;
}
var interpolatedCartographicScratch = new Cartographic_default();
function interpolateAndGrowRectangle(ellipsoidGeodesic2, inverseChordLength, result, idlCross2) {
  const segmentLength = ellipsoidGeodesic2.surfaceDistance;
  const numPoints = Math.ceil(segmentLength * inverseChordLength);
  const subsegmentDistance = numPoints > 0 ? segmentLength / (numPoints - 1) : Number.POSITIVE_INFINITY;
  let interpolationDistance = 0;
  for (let i = 0; i < numPoints; i++) {
    const interpolatedCartographic = ellipsoidGeodesic2.interpolateUsingSurfaceDistance(
      interpolationDistance,
      interpolatedCartographicScratch
    );
    interpolationDistance += subsegmentDistance;
    const longitude = interpolatedCartographic.longitude;
    const latitude = interpolatedCartographic.latitude;
    result.west = Math.min(result.west, longitude);
    result.east = Math.max(result.east, longitude);
    result.south = Math.min(result.south, latitude);
    result.north = Math.max(result.north, latitude);
    const lonAdjusted = longitude >= 0 ? longitude : longitude + Math_default.TWO_PI;
    idlCross2.westOverIDL = Math.min(idlCross2.westOverIDL, lonAdjusted);
    idlCross2.eastOverIDL = Math.max(idlCross2.eastOverIDL, lonAdjusted);
  }
}
var createGeometryFromPositionsExtrudedPositions = [];
function createGeometryFromPositionsExtruded(ellipsoid, polygon, textureCoordinates, granularity, hierarchy, perPositionHeight, closeTop, closeBottom, vertexFormat, arcType) {
  const geos = {
    walls: []
  };
  let i;
  if (closeTop || closeBottom) {
    const topGeo = PolygonGeometryLibrary_default.createGeometryFromPositions(
      ellipsoid,
      polygon,
      textureCoordinates,
      granularity,
      perPositionHeight,
      vertexFormat,
      arcType
    );
    const edgePoints = topGeo.attributes.position.values;
    const indices = topGeo.indices;
    let numPositions;
    let newIndices;
    if (closeTop && closeBottom) {
      const topBottomPositions = edgePoints.concat(edgePoints);
      numPositions = topBottomPositions.length / 3;
      newIndices = IndexDatatype_default.createTypedArray(
        numPositions,
        indices.length * 2
      );
      newIndices.set(indices);
      const ilength = indices.length;
      const length = numPositions / 2;
      for (i = 0; i < ilength; i += 3) {
        const i0 = newIndices[i] + length;
        const i1 = newIndices[i + 1] + length;
        const i2 = newIndices[i + 2] + length;
        newIndices[i + ilength] = i2;
        newIndices[i + 1 + ilength] = i1;
        newIndices[i + 2 + ilength] = i0;
      }
      topGeo.attributes.position.values = topBottomPositions;
      if (perPositionHeight && vertexFormat.normal) {
        const normals = topGeo.attributes.normal.values;
        topGeo.attributes.normal.values = new Float32Array(
          topBottomPositions.length
        );
        topGeo.attributes.normal.values.set(normals);
      }
      if (vertexFormat.st && defined_default(textureCoordinates)) {
        const texcoords = topGeo.attributes.st.values;
        topGeo.attributes.st.values = new Float32Array(numPositions * 2);
        topGeo.attributes.st.values = texcoords.concat(texcoords);
      }
      topGeo.indices = newIndices;
    } else if (closeBottom) {
      numPositions = edgePoints.length / 3;
      newIndices = IndexDatatype_default.createTypedArray(numPositions, indices.length);
      for (i = 0; i < indices.length; i += 3) {
        newIndices[i] = indices[i + 2];
        newIndices[i + 1] = indices[i + 1];
        newIndices[i + 2] = indices[i];
      }
      topGeo.indices = newIndices;
    }
    geos.topAndBottom = new GeometryInstance_default({
      geometry: topGeo
    });
  }
  let outerRing = hierarchy.outerRing;
  let tangentPlane = EllipsoidTangentPlane_default.fromPoints(outerRing, ellipsoid);
  let positions2D = tangentPlane.projectPointsOntoPlane(
    outerRing,
    createGeometryFromPositionsExtrudedPositions
  );
  let windingOrder = PolygonPipeline_default.computeWindingOrder2D(positions2D);
  if (windingOrder === WindingOrder_default.CLOCKWISE) {
    outerRing = outerRing.slice().reverse();
  }
  let wallGeo = PolygonGeometryLibrary_default.computeWallGeometry(
    outerRing,
    textureCoordinates,
    ellipsoid,
    granularity,
    perPositionHeight,
    arcType
  );
  geos.walls.push(
    new GeometryInstance_default({
      geometry: wallGeo
    })
  );
  const holes = hierarchy.holes;
  for (i = 0; i < holes.length; i++) {
    let hole = holes[i];
    tangentPlane = EllipsoidTangentPlane_default.fromPoints(hole, ellipsoid);
    positions2D = tangentPlane.projectPointsOntoPlane(
      hole,
      createGeometryFromPositionsExtrudedPositions
    );
    windingOrder = PolygonPipeline_default.computeWindingOrder2D(positions2D);
    if (windingOrder === WindingOrder_default.COUNTER_CLOCKWISE) {
      hole = hole.slice().reverse();
    }
    wallGeo = PolygonGeometryLibrary_default.computeWallGeometry(
      hole,
      textureCoordinates,
      ellipsoid,
      granularity,
      perPositionHeight,
      arcType
    );
    geos.walls.push(
      new GeometryInstance_default({
        geometry: wallGeo
      })
    );
  }
  return geos;
}
function PolygonGeometry(options) {
  Check_default.typeOf.object("options", options);
  Check_default.typeOf.object("options.polygonHierarchy", options.polygonHierarchy);
  if (defined_default(options.perPositionHeight) && options.perPositionHeight && defined_default(options.height)) {
    throw new DeveloperError_default(
      "Cannot use both options.perPositionHeight and options.height"
    );
  }
  if (defined_default(options.arcType) && options.arcType !== ArcType_default.GEODESIC && options.arcType !== ArcType_default.RHUMB) {
    throw new DeveloperError_default(
      "Invalid arcType. Valid options are ArcType.GEODESIC and ArcType.RHUMB."
    );
  }
  const polygonHierarchy = options.polygonHierarchy;
  const vertexFormat = defaultValue_default(options.vertexFormat, VertexFormat_default.DEFAULT);
  const ellipsoid = defaultValue_default(options.ellipsoid, Ellipsoid_default.WGS84);
  const granularity = defaultValue_default(
    options.granularity,
    Math_default.RADIANS_PER_DEGREE
  );
  const stRotation = defaultValue_default(options.stRotation, 0);
  const textureCoordinates = options.textureCoordinates;
  const perPositionHeight = defaultValue_default(options.perPositionHeight, false);
  const perPositionHeightExtrude = perPositionHeight && defined_default(options.extrudedHeight);
  let height = defaultValue_default(options.height, 0);
  let extrudedHeight = defaultValue_default(options.extrudedHeight, height);
  if (!perPositionHeightExtrude) {
    const h = Math.max(height, extrudedHeight);
    extrudedHeight = Math.min(height, extrudedHeight);
    height = h;
  }
  this._vertexFormat = VertexFormat_default.clone(vertexFormat);
  this._ellipsoid = Ellipsoid_default.clone(ellipsoid);
  this._granularity = granularity;
  this._stRotation = stRotation;
  this._height = height;
  this._extrudedHeight = extrudedHeight;
  this._closeTop = defaultValue_default(options.closeTop, true);
  this._closeBottom = defaultValue_default(options.closeBottom, true);
  this._polygonHierarchy = polygonHierarchy;
  this._perPositionHeight = perPositionHeight;
  this._perPositionHeightExtrude = perPositionHeightExtrude;
  this._shadowVolume = defaultValue_default(options.shadowVolume, false);
  this._workerName = "createPolygonGeometry";
  this._offsetAttribute = options.offsetAttribute;
  this._arcType = defaultValue_default(options.arcType, ArcType_default.GEODESIC);
  this._rectangle = void 0;
  this._textureCoordinateRotationPoints = void 0;
  this._textureCoordinates = textureCoordinates;
  this.packedLength = PolygonGeometryLibrary_default.computeHierarchyPackedLength(
    polygonHierarchy,
    Cartesian3_default
  ) + Ellipsoid_default.packedLength + VertexFormat_default.packedLength + (textureCoordinates ? PolygonGeometryLibrary_default.computeHierarchyPackedLength(
    textureCoordinates,
    Cartesian2_default
  ) : 1) + 12;
}
PolygonGeometry.fromPositions = function(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  Check_default.defined("options.positions", options.positions);
  const newOptions = {
    polygonHierarchy: {
      positions: options.positions
    },
    height: options.height,
    extrudedHeight: options.extrudedHeight,
    vertexFormat: options.vertexFormat,
    stRotation: options.stRotation,
    ellipsoid: options.ellipsoid,
    granularity: options.granularity,
    perPositionHeight: options.perPositionHeight,
    closeTop: options.closeTop,
    closeBottom: options.closeBottom,
    offsetAttribute: options.offsetAttribute,
    arcType: options.arcType,
    textureCoordinates: options.textureCoordinates
  };
  return new PolygonGeometry(newOptions);
};
PolygonGeometry.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  startingIndex = PolygonGeometryLibrary_default.packPolygonHierarchy(
    value._polygonHierarchy,
    array,
    startingIndex,
    Cartesian3_default
  );
  Ellipsoid_default.pack(value._ellipsoid, array, startingIndex);
  startingIndex += Ellipsoid_default.packedLength;
  VertexFormat_default.pack(value._vertexFormat, array, startingIndex);
  startingIndex += VertexFormat_default.packedLength;
  array[startingIndex++] = value._height;
  array[startingIndex++] = value._extrudedHeight;
  array[startingIndex++] = value._granularity;
  array[startingIndex++] = value._stRotation;
  array[startingIndex++] = value._perPositionHeightExtrude ? 1 : 0;
  array[startingIndex++] = value._perPositionHeight ? 1 : 0;
  array[startingIndex++] = value._closeTop ? 1 : 0;
  array[startingIndex++] = value._closeBottom ? 1 : 0;
  array[startingIndex++] = value._shadowVolume ? 1 : 0;
  array[startingIndex++] = defaultValue_default(value._offsetAttribute, -1);
  array[startingIndex++] = value._arcType;
  if (defined_default(value._textureCoordinates)) {
    startingIndex = PolygonGeometryLibrary_default.packPolygonHierarchy(
      value._textureCoordinates,
      array,
      startingIndex,
      Cartesian2_default
    );
  } else {
    array[startingIndex++] = -1;
  }
  array[startingIndex++] = value.packedLength;
  return array;
};
var scratchEllipsoid = Ellipsoid_default.clone(Ellipsoid_default.UNIT_SPHERE);
var scratchVertexFormat = new VertexFormat_default();
var dummyOptions = {
  polygonHierarchy: {}
};
PolygonGeometry.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  const polygonHierarchy = PolygonGeometryLibrary_default.unpackPolygonHierarchy(
    array,
    startingIndex,
    Cartesian3_default
  );
  startingIndex = polygonHierarchy.startingIndex;
  delete polygonHierarchy.startingIndex;
  const ellipsoid = Ellipsoid_default.unpack(array, startingIndex, scratchEllipsoid);
  startingIndex += Ellipsoid_default.packedLength;
  const vertexFormat = VertexFormat_default.unpack(
    array,
    startingIndex,
    scratchVertexFormat
  );
  startingIndex += VertexFormat_default.packedLength;
  const height = array[startingIndex++];
  const extrudedHeight = array[startingIndex++];
  const granularity = array[startingIndex++];
  const stRotation = array[startingIndex++];
  const perPositionHeightExtrude = array[startingIndex++] === 1;
  const perPositionHeight = array[startingIndex++] === 1;
  const closeTop = array[startingIndex++] === 1;
  const closeBottom = array[startingIndex++] === 1;
  const shadowVolume = array[startingIndex++] === 1;
  const offsetAttribute = array[startingIndex++];
  const arcType = array[startingIndex++];
  const textureCoordinates = array[startingIndex] === -1 ? void 0 : PolygonGeometryLibrary_default.unpackPolygonHierarchy(
    array,
    startingIndex,
    Cartesian2_default
  );
  if (defined_default(textureCoordinates)) {
    startingIndex = textureCoordinates.startingIndex;
    delete textureCoordinates.startingIndex;
  } else {
    startingIndex++;
  }
  const packedLength = array[startingIndex++];
  if (!defined_default(result)) {
    result = new PolygonGeometry(dummyOptions);
  }
  result._polygonHierarchy = polygonHierarchy;
  result._ellipsoid = Ellipsoid_default.clone(ellipsoid, result._ellipsoid);
  result._vertexFormat = VertexFormat_default.clone(vertexFormat, result._vertexFormat);
  result._height = height;
  result._extrudedHeight = extrudedHeight;
  result._granularity = granularity;
  result._stRotation = stRotation;
  result._perPositionHeightExtrude = perPositionHeightExtrude;
  result._perPositionHeight = perPositionHeight;
  result._closeTop = closeTop;
  result._closeBottom = closeBottom;
  result._shadowVolume = shadowVolume;
  result._offsetAttribute = offsetAttribute === -1 ? void 0 : offsetAttribute;
  result._arcType = arcType;
  result._textureCoordinates = textureCoordinates;
  result.packedLength = packedLength;
  return result;
};
PolygonGeometry.computeRectangle = function(options, result) {
  Check_default.typeOf.object("options", options);
  Check_default.typeOf.object("options.polygonHierarchy", options.polygonHierarchy);
  const granularity = defaultValue_default(
    options.granularity,
    Math_default.RADIANS_PER_DEGREE
  );
  const arcType = defaultValue_default(options.arcType, ArcType_default.GEODESIC);
  if (arcType !== ArcType_default.GEODESIC && arcType !== ArcType_default.RHUMB) {
    throw new DeveloperError_default(
      "Invalid arcType. Valid options are ArcType.GEODESIC and ArcType.RHUMB."
    );
  }
  const polygonHierarchy = options.polygonHierarchy;
  const ellipsoid = defaultValue_default(options.ellipsoid, Ellipsoid_default.WGS84);
  return computeRectangle(
    polygonHierarchy.positions,
    ellipsoid,
    arcType,
    granularity,
    result
  );
};
PolygonGeometry.createGeometry = function(polygonGeometry) {
  const vertexFormat = polygonGeometry._vertexFormat;
  const ellipsoid = polygonGeometry._ellipsoid;
  const granularity = polygonGeometry._granularity;
  const stRotation = polygonGeometry._stRotation;
  const polygonHierarchy = polygonGeometry._polygonHierarchy;
  const perPositionHeight = polygonGeometry._perPositionHeight;
  const closeTop = polygonGeometry._closeTop;
  const closeBottom = polygonGeometry._closeBottom;
  const arcType = polygonGeometry._arcType;
  const textureCoordinates = polygonGeometry._textureCoordinates;
  const hasTextureCoordinates = defined_default(textureCoordinates);
  let outerPositions = polygonHierarchy.positions;
  if (outerPositions.length < 3) {
    return;
  }
  const tangentPlane = EllipsoidTangentPlane_default.fromPoints(
    outerPositions,
    ellipsoid
  );
  const results = PolygonGeometryLibrary_default.polygonsFromHierarchy(
    polygonHierarchy,
    hasTextureCoordinates,
    tangentPlane.projectPointsOntoPlane.bind(tangentPlane),
    !perPositionHeight,
    ellipsoid
  );
  const hierarchy = results.hierarchy;
  const polygons = results.polygons;
  const dummyFunction = function(identity) {
    return identity;
  };
  const textureCoordinatePolygons = hasTextureCoordinates ? PolygonGeometryLibrary_default.polygonsFromHierarchy(
    textureCoordinates,
    true,
    dummyFunction,
    false
  ).polygons : void 0;
  if (hierarchy.length === 0) {
    return;
  }
  outerPositions = hierarchy[0].outerRing;
  const boundingRectangle = PolygonGeometryLibrary_default.computeBoundingRectangle(
    tangentPlane.plane.normal,
    tangentPlane.projectPointOntoPlane.bind(tangentPlane),
    outerPositions,
    stRotation,
    scratchBoundingRectangle
  );
  const geometries = [];
  const height = polygonGeometry._height;
  const extrudedHeight = polygonGeometry._extrudedHeight;
  const extrude = polygonGeometry._perPositionHeightExtrude || !Math_default.equalsEpsilon(height, extrudedHeight, 0, Math_default.EPSILON2);
  const options = {
    perPositionHeight,
    vertexFormat,
    geometry: void 0,
    tangentPlane,
    boundingRectangle,
    ellipsoid,
    stRotation,
    textureCoordinates: void 0,
    bottom: false,
    top: true,
    wall: false,
    extrude: false,
    arcType
  };
  let i;
  if (extrude) {
    options.extrude = true;
    options.top = closeTop;
    options.bottom = closeBottom;
    options.shadowVolume = polygonGeometry._shadowVolume;
    options.offsetAttribute = polygonGeometry._offsetAttribute;
    for (i = 0; i < polygons.length; i++) {
      const splitGeometry = createGeometryFromPositionsExtruded(
        ellipsoid,
        polygons[i],
        hasTextureCoordinates ? textureCoordinatePolygons[i] : void 0,
        granularity,
        hierarchy[i],
        perPositionHeight,
        closeTop,
        closeBottom,
        vertexFormat,
        arcType
      );
      let topAndBottom;
      if (closeTop && closeBottom) {
        topAndBottom = splitGeometry.topAndBottom;
        options.geometry = PolygonGeometryLibrary_default.scaleToGeodeticHeightExtruded(
          topAndBottom.geometry,
          height,
          extrudedHeight,
          ellipsoid,
          perPositionHeight
        );
      } else if (closeTop) {
        topAndBottom = splitGeometry.topAndBottom;
        topAndBottom.geometry.attributes.position.values = PolygonPipeline_default.scaleToGeodeticHeight(
          topAndBottom.geometry.attributes.position.values,
          height,
          ellipsoid,
          !perPositionHeight
        );
        options.geometry = topAndBottom.geometry;
      } else if (closeBottom) {
        topAndBottom = splitGeometry.topAndBottom;
        topAndBottom.geometry.attributes.position.values = PolygonPipeline_default.scaleToGeodeticHeight(
          topAndBottom.geometry.attributes.position.values,
          extrudedHeight,
          ellipsoid,
          true
        );
        options.geometry = topAndBottom.geometry;
      }
      if (closeTop || closeBottom) {
        options.wall = false;
        topAndBottom.geometry = computeAttributes(options);
        geometries.push(topAndBottom);
      }
      const walls = splitGeometry.walls;
      options.wall = true;
      for (let k = 0; k < walls.length; k++) {
        const wall = walls[k];
        options.geometry = PolygonGeometryLibrary_default.scaleToGeodeticHeightExtruded(
          wall.geometry,
          height,
          extrudedHeight,
          ellipsoid,
          perPositionHeight
        );
        wall.geometry = computeAttributes(options);
        geometries.push(wall);
      }
    }
  } else {
    for (i = 0; i < polygons.length; i++) {
      const geometryInstance = new GeometryInstance_default({
        geometry: PolygonGeometryLibrary_default.createGeometryFromPositions(
          ellipsoid,
          polygons[i],
          hasTextureCoordinates ? textureCoordinatePolygons[i] : void 0,
          granularity,
          perPositionHeight,
          vertexFormat,
          arcType
        )
      });
      geometryInstance.geometry.attributes.position.values = PolygonPipeline_default.scaleToGeodeticHeight(
        geometryInstance.geometry.attributes.position.values,
        height,
        ellipsoid,
        !perPositionHeight
      );
      options.geometry = geometryInstance.geometry;
      geometryInstance.geometry = computeAttributes(options);
      if (defined_default(polygonGeometry._offsetAttribute)) {
        const length = geometryInstance.geometry.attributes.position.values.length;
        const offsetValue = polygonGeometry._offsetAttribute === GeometryOffsetAttribute_default.NONE ? 0 : 1;
        const applyOffset = new Uint8Array(length / 3).fill(offsetValue);
        geometryInstance.geometry.attributes.applyOffset = new GeometryAttribute_default(
          {
            componentDatatype: ComponentDatatype_default.UNSIGNED_BYTE,
            componentsPerAttribute: 1,
            values: applyOffset
          }
        );
      }
      geometries.push(geometryInstance);
    }
  }
  const geometry = GeometryPipeline_default.combineInstances(geometries)[0];
  geometry.attributes.position.values = new Float64Array(
    geometry.attributes.position.values
  );
  geometry.indices = IndexDatatype_default.createTypedArray(
    geometry.attributes.position.values.length / 3,
    geometry.indices
  );
  const attributes = geometry.attributes;
  const boundingSphere = BoundingSphere_default.fromVertices(
    attributes.position.values
  );
  if (!vertexFormat.position) {
    delete attributes.position;
  }
  return new Geometry_default({
    attributes,
    indices: geometry.indices,
    primitiveType: geometry.primitiveType,
    boundingSphere,
    offsetAttribute: polygonGeometry._offsetAttribute
  });
};
PolygonGeometry.createShadowVolume = function(polygonGeometry, minHeightFunc, maxHeightFunc) {
  const granularity = polygonGeometry._granularity;
  const ellipsoid = polygonGeometry._ellipsoid;
  const minHeight = minHeightFunc(granularity, ellipsoid);
  const maxHeight = maxHeightFunc(granularity, ellipsoid);
  return new PolygonGeometry({
    polygonHierarchy: polygonGeometry._polygonHierarchy,
    ellipsoid,
    stRotation: polygonGeometry._stRotation,
    granularity,
    perPositionHeight: false,
    extrudedHeight: minHeight,
    height: maxHeight,
    vertexFormat: VertexFormat_default.POSITION_ONLY,
    shadowVolume: true,
    arcType: polygonGeometry._arcType
  });
};
function textureCoordinateRotationPoints(polygonGeometry) {
  const stRotation = -polygonGeometry._stRotation;
  if (stRotation === 0) {
    return [0, 0, 0, 1, 1, 0];
  }
  const ellipsoid = polygonGeometry._ellipsoid;
  const positions = polygonGeometry._polygonHierarchy.positions;
  const boundingRectangle = polygonGeometry.rectangle;
  return Geometry_default._textureCoordinateRotationPoints(
    positions,
    stRotation,
    ellipsoid,
    boundingRectangle
  );
}
Object.defineProperties(PolygonGeometry.prototype, {
  /**
   * @private
   */
  rectangle: {
    get: function() {
      if (!defined_default(this._rectangle)) {
        const positions = this._polygonHierarchy.positions;
        this._rectangle = computeRectangle(
          positions,
          this._ellipsoid,
          this._arcType,
          this._granularity
        );
      }
      return this._rectangle;
    }
  },
  /**
   * For remapping texture coordinates when rendering PolygonGeometries as GroundPrimitives.
   * @private
   */
  textureCoordinateRotationPoints: {
    get: function() {
      if (!defined_default(this._textureCoordinateRotationPoints)) {
        this._textureCoordinateRotationPoints = textureCoordinateRotationPoints(
          this
        );
      }
      return this._textureCoordinateRotationPoints;
    }
  }
});
var PolygonGeometry_default = PolygonGeometry;

// packages/engine/Source/Workers/createPolygonGeometry.js
function createPolygonGeometry(polygonGeometry, offset) {
  if (defined_default(offset)) {
    polygonGeometry = PolygonGeometry_default.unpack(polygonGeometry, offset);
  }
  polygonGeometry._ellipsoid = Ellipsoid_default.clone(polygonGeometry._ellipsoid);
  return PolygonGeometry_default.createGeometry(polygonGeometry);
}
var createPolygonGeometry_default = createPolygonGeometry;
export {
  createPolygonGeometry_default as default
};
