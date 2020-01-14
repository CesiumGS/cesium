import ArcType from './ArcType.js';
import arrayFill from './arrayFill.js';
import BoundingRectangle from './BoundingRectangle.js';
import BoundingSphere from './BoundingSphere.js';
import Cartesian2 from './Cartesian2.js';
import Cartesian3 from './Cartesian3.js';
import Cartographic from './Cartographic.js';
import Check from './Check.js';
import ComponentDatatype from './ComponentDatatype.js';
import defaultValue from './defaultValue.js';
import defined from './defined.js';
import defineProperties from './defineProperties.js';
import DeveloperError from './DeveloperError.js';
import Ellipsoid from './Ellipsoid.js';
import EllipsoidGeodesic from './EllipsoidGeodesic.js';
import EllipsoidTangentPlane from './EllipsoidTangentPlane.js';
import Geometry from './Geometry.js';
import GeometryAttribute from './GeometryAttribute.js';
import GeometryInstance from './GeometryInstance.js';
import GeometryOffsetAttribute from './GeometryOffsetAttribute.js';
import GeometryPipeline from './GeometryPipeline.js';
import IndexDatatype from './IndexDatatype.js';
import CesiumMath from './Math.js';
import Matrix3 from './Matrix3.js';
import PolygonGeometryLibrary from './PolygonGeometryLibrary.js';
import PolygonPipeline from './PolygonPipeline.js';
import Quaternion from './Quaternion.js';
import Rectangle from './Rectangle.js';
import VertexFormat from './VertexFormat.js';
import WindingOrder from './WindingOrder.js';

    var scratchCarto1 = new Cartographic();
    var scratchCarto2 = new Cartographic();
    function adjustPosHeightsForNormal(position, p1, p2, ellipsoid) {
        var carto1 = ellipsoid.cartesianToCartographic(position, scratchCarto1);
        var height = carto1.height;
        var p1Carto = ellipsoid.cartesianToCartographic(p1, scratchCarto2);
        p1Carto.height = height;
        ellipsoid.cartographicToCartesian(p1Carto, p1);

        var p2Carto = ellipsoid.cartesianToCartographic(p2, scratchCarto2);
        p2Carto.height = height - 100;
        ellipsoid.cartographicToCartesian(p2Carto, p2);
    }

    var scratchBoundingRectangle = new BoundingRectangle();
    var scratchPosition = new Cartesian3();
    var scratchNormal = new Cartesian3();
    var scratchTangent = new Cartesian3();
    var scratchBitangent = new Cartesian3();
    var p1Scratch = new Cartesian3();
    var p2Scratch = new Cartesian3();
    var scratchPerPosNormal = new Cartesian3();
    var scratchPerPosTangent = new Cartesian3();
    var scratchPerPosBitangent = new Cartesian3();

    var appendTextureCoordinatesOrigin = new Cartesian2();
    var appendTextureCoordinatesCartesian2 = new Cartesian2();
    var appendTextureCoordinatesCartesian3 = new Cartesian3();
    var appendTextureCoordinatesQuaternion = new Quaternion();
    var appendTextureCoordinatesMatrix3 = new Matrix3();
    var tangentMatrixScratch = new Matrix3();

    function computeAttributes(options) {
        var vertexFormat = options.vertexFormat;
        var geometry = options.geometry;
        var shadowVolume = options.shadowVolume;
        var flatPositions = geometry.attributes.position.values;
        var length = flatPositions.length;
        var wall = options.wall;
        var top = options.top || wall;
        var bottom = options.bottom || wall;
        if (vertexFormat.st || vertexFormat.normal || vertexFormat.tangent || vertexFormat.bitangent || shadowVolume) {
            // PERFORMANCE_IDEA: Compute before subdivision, then just interpolate during subdivision.
            // PERFORMANCE_IDEA: Compute with createGeometryFromPositions() for fast path when there's no holes.
            var boundingRectangle = options.boundingRectangle;
            var tangentPlane = options.tangentPlane;
            var ellipsoid = options.ellipsoid;
            var stRotation = options.stRotation;
            var perPositionHeight = options.perPositionHeight;

            var origin = appendTextureCoordinatesOrigin;
            origin.x = boundingRectangle.x;
            origin.y = boundingRectangle.y;

            var textureCoordinates = vertexFormat.st ? new Float32Array(2 * (length / 3)) : undefined;
            var normals;
            if (vertexFormat.normal) {
                if (perPositionHeight && top && !wall) {
                    normals = geometry.attributes.normal.values;
                } else {
                    normals = new Float32Array(length);
                }
            }
            var tangents = vertexFormat.tangent ? new Float32Array(length) : undefined;
            var bitangents = vertexFormat.bitangent ? new Float32Array(length) : undefined;
            var extrudeNormals = shadowVolume ? new Float32Array(length) : undefined;

            var textureCoordIndex = 0;
            var attrIndex = 0;

            var normal = scratchNormal;
            var tangent = scratchTangent;
            var bitangent = scratchBitangent;
            var recomputeNormal = true;

            var textureMatrix = appendTextureCoordinatesMatrix3;
            var tangentRotationMatrix = tangentMatrixScratch;
            if (stRotation !== 0.0) {
                var rotation = Quaternion.fromAxisAngle(tangentPlane._plane.normal, stRotation, appendTextureCoordinatesQuaternion);
                textureMatrix = Matrix3.fromQuaternion(rotation, textureMatrix);

                rotation = Quaternion.fromAxisAngle(tangentPlane._plane.normal, -stRotation, appendTextureCoordinatesQuaternion);
                tangentRotationMatrix = Matrix3.fromQuaternion(rotation, tangentRotationMatrix);
            } else {
                textureMatrix = Matrix3.clone(Matrix3.IDENTITY, textureMatrix);
                tangentRotationMatrix = Matrix3.clone(Matrix3.IDENTITY, tangentRotationMatrix);
            }

            var bottomOffset = 0;
            var bottomOffset2 = 0;

            if (top && bottom) {
                bottomOffset = length / 2;
                bottomOffset2 = length / 3;

                length /= 2;
            }

            for ( var i = 0; i < length; i += 3) {
                var position = Cartesian3.fromArray(flatPositions, i, appendTextureCoordinatesCartesian3);

                if (vertexFormat.st) {
                    var p = Matrix3.multiplyByVector(textureMatrix, position, scratchPosition);
                    p = ellipsoid.scaleToGeodeticSurface(p,p);
                    var st = tangentPlane.projectPointOntoPlane(p, appendTextureCoordinatesCartesian2);
                    Cartesian2.subtract(st, origin, st);

                    var stx = CesiumMath.clamp(st.x / boundingRectangle.width, 0, 1);
                    var sty = CesiumMath.clamp(st.y / boundingRectangle.height, 0, 1);
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

                if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.bitangent || shadowVolume) {
                    var attrIndex1 = attrIndex + 1;
                    var attrIndex2 = attrIndex + 2;

                    if (wall) {
                        if (i + 3 < length) {
                            var p1 = Cartesian3.fromArray(flatPositions, i + 3, p1Scratch);

                            if (recomputeNormal) {
                                var p2 = Cartesian3.fromArray(flatPositions, i + length, p2Scratch);
                                if (perPositionHeight) {
                                    adjustPosHeightsForNormal(position, p1, p2, ellipsoid);
                                }
                                Cartesian3.subtract(p1, position, p1);
                                Cartesian3.subtract(p2, position, p2);
                                normal = Cartesian3.normalize(Cartesian3.cross(p2, p1, normal), normal);
                                recomputeNormal = false;
                            }

                            if (Cartesian3.equalsEpsilon(p1, position, CesiumMath.EPSILON10)) { // if we've reached a corner
                                recomputeNormal = true;
                            }
                        }

                        if (vertexFormat.tangent || vertexFormat.bitangent) {
                            bitangent = ellipsoid.geodeticSurfaceNormal(position, bitangent);
                            if (vertexFormat.tangent) {
                                tangent = Cartesian3.normalize(Cartesian3.cross(bitangent, normal, tangent), tangent);
                            }
                        }
                    } else {
                        normal = ellipsoid.geodeticSurfaceNormal(position, normal);
                        if (vertexFormat.tangent || vertexFormat.bitangent) {
                            if (perPositionHeight) {
                                scratchPerPosNormal = Cartesian3.fromArray(normals, attrIndex, scratchPerPosNormal);
                                scratchPerPosTangent = Cartesian3.cross(Cartesian3.UNIT_Z, scratchPerPosNormal, scratchPerPosTangent);
                                scratchPerPosTangent = Cartesian3.normalize(Matrix3.multiplyByVector(tangentRotationMatrix, scratchPerPosTangent, scratchPerPosTangent), scratchPerPosTangent);
                                if (vertexFormat.bitangent) {
                                    scratchPerPosBitangent = Cartesian3.normalize(Cartesian3.cross(scratchPerPosNormal, scratchPerPosTangent, scratchPerPosBitangent), scratchPerPosBitangent);
                                }
                            }

                            tangent = Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent);
                            tangent = Cartesian3.normalize(Matrix3.multiplyByVector(tangentRotationMatrix, tangent, tangent), tangent);
                            if (vertexFormat.bitangent) {
                                bitangent = Cartesian3.normalize(Cartesian3.cross(normal, tangent, bitangent), bitangent);
                            }
                        }
                    }

                    if (vertexFormat.normal) {
                        if (options.wall) {
                            normals[attrIndex + bottomOffset] = normal.x;
                            normals[attrIndex1 + bottomOffset] = normal.y;
                            normals[attrIndex2 + bottomOffset] = normal.z;
                        } else if (bottom){
                            normals[attrIndex + bottomOffset] = -normal.x;
                            normals[attrIndex1 + bottomOffset] = -normal.y;
                            normals[attrIndex2 + bottomOffset] = -normal.z;
                        }

                        if ((top && !perPositionHeight) || wall) {
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

                        if(top) {
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

            if (vertexFormat.st) {
                geometry.attributes.st = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 2,
                    values : textureCoordinates
                });
            }

            if (vertexFormat.normal) {
                geometry.attributes.normal = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : normals
                });
            }

            if (vertexFormat.tangent) {
                geometry.attributes.tangent = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : tangents
                });
            }

            if (vertexFormat.bitangent) {
                geometry.attributes.bitangent = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : bitangents
                });
            }

            if (shadowVolume) {
                geometry.attributes.extrudeDirection = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : extrudeNormals
                });
            }
        }

        if (options.extrude && defined(options.offsetAttribute)) {
            var size = flatPositions.length / 3;
            var offsetAttribute = new Uint8Array(size);

            if (options.offsetAttribute === GeometryOffsetAttribute.TOP) {
                if ((top && bottom) || wall) {
                    offsetAttribute = arrayFill(offsetAttribute, 1, 0, size / 2);
                } else if (top) {
                    offsetAttribute = arrayFill(offsetAttribute, 1);
                }
            } else {
                var offsetValue = options.offsetAttribute === GeometryOffsetAttribute.NONE ? 0 : 1;
                offsetAttribute = arrayFill(offsetAttribute, offsetValue);
            }

            geometry.attributes.applyOffset = new GeometryAttribute({
                componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                componentsPerAttribute : 1,
                values : offsetAttribute
            });
        }

        return geometry;
    }

    var startCartographicScratch = new Cartographic();
    var endCartographicScratch = new Cartographic();
    var idlCross = {
        westOverIDL : 0.0,
        eastOverIDL : 0.0
    };
    var ellipsoidGeodesic = new EllipsoidGeodesic();
    function computeRectangle(positions, ellipsoid, arcType, granularity, result) {
        result = defaultValue(result, new Rectangle());
        if (!defined(positions) || positions.length < 3) {
            result.west = 0.0;
            result.north = 0.0;
            result.south = 0.0;
            result.east = 0.0;
            return result;
        }

        if (arcType === ArcType.RHUMB) {
            return Rectangle.fromCartesianArray(positions, ellipsoid, result);
        }

        if (!ellipsoidGeodesic.ellipsoid.equals(ellipsoid)) {
            ellipsoidGeodesic = new EllipsoidGeodesic(undefined, undefined, ellipsoid);
        }

        result.west = Number.POSITIVE_INFINITY;
        result.east = Number.NEGATIVE_INFINITY;
        result.south = Number.POSITIVE_INFINITY;
        result.north = Number.NEGATIVE_INFINITY;

        idlCross.westOverIDL = Number.POSITIVE_INFINITY;
        idlCross.eastOverIDL = Number.NEGATIVE_INFINITY;

        var inverseChordLength = 1.0 / CesiumMath.chordLength(granularity, ellipsoid.maximumRadius);
        var positionsLength = positions.length;
        var endCartographic = ellipsoid.cartesianToCartographic(positions[0], endCartographicScratch);
        var startCartographic = startCartographicScratch;
        var swap;

        for (var i = 1; i < positionsLength; i++) {
            swap = startCartographic;
            startCartographic = endCartographic;
            endCartographic = ellipsoid.cartesianToCartographic(positions[i], swap);
            ellipsoidGeodesic.setEndPoints(startCartographic, endCartographic);
            interpolateAndGrowRectangle(ellipsoidGeodesic, inverseChordLength, result, idlCross);
        }

        swap = startCartographic;
        startCartographic = endCartographic;
        endCartographic = ellipsoid.cartesianToCartographic(positions[0], swap);
        ellipsoidGeodesic.setEndPoints(startCartographic, endCartographic);
        interpolateAndGrowRectangle(ellipsoidGeodesic, inverseChordLength, result, idlCross);

        if (result.east - result.west > idlCross.eastOverIDL - idlCross.westOverIDL) {
            result.west = idlCross.westOverIDL;
            result.east = idlCross.eastOverIDL;

            if (result.east > CesiumMath.PI) {
                result.east = result.east - CesiumMath.TWO_PI;
            }
            if (result.west > CesiumMath.PI) {
                result.west = result.west - CesiumMath.TWO_PI;
            }
        }

        return result;
    }

    var interpolatedCartographicScratch = new Cartographic();
    function interpolateAndGrowRectangle(ellipsoidGeodesic, inverseChordLength, result, idlCross) {
        var segmentLength = ellipsoidGeodesic.surfaceDistance;

        var numPoints = Math.ceil(segmentLength * inverseChordLength);
        var subsegmentDistance = numPoints > 0 ? segmentLength / (numPoints - 1) : Number.POSITIVE_INFINITY;
        var interpolationDistance = 0.0;

        for (var i = 0; i < numPoints; i++) {
            var interpolatedCartographic = ellipsoidGeodesic.interpolateUsingSurfaceDistance(interpolationDistance, interpolatedCartographicScratch);
            interpolationDistance += subsegmentDistance;
            var longitude = interpolatedCartographic.longitude;
            var latitude = interpolatedCartographic.latitude;

            result.west = Math.min(result.west, longitude);
            result.east = Math.max(result.east, longitude);
            result.south = Math.min(result.south, latitude);
            result.north = Math.max(result.north, latitude);

            var lonAdjusted = longitude >= 0 ?  longitude : longitude +  CesiumMath.TWO_PI;
            idlCross.westOverIDL = Math.min(idlCross.westOverIDL, lonAdjusted);
            idlCross.eastOverIDL = Math.max(idlCross.eastOverIDL, lonAdjusted);
        }
    }

    var createGeometryFromPositionsExtrudedPositions = [];

    function createGeometryFromPositionsExtruded(ellipsoid, polygon, granularity, hierarchy, perPositionHeight, closeTop, closeBottom, vertexFormat, arcType) {
        var geos = {
            walls : []
        };
        var i;

        if (closeTop || closeBottom) {
            var topGeo = PolygonGeometryLibrary.createGeometryFromPositions(ellipsoid, polygon, granularity, perPositionHeight, vertexFormat, arcType);

            var edgePoints = topGeo.attributes.position.values;
            var indices = topGeo.indices;
            var numPositions;
            var newIndices;

            if (closeTop && closeBottom) {
                var topBottomPositions = edgePoints.concat(edgePoints);

                numPositions = topBottomPositions.length / 3;

                newIndices = IndexDatatype.createTypedArray(numPositions, indices.length * 2);
                newIndices.set(indices);
                var ilength = indices.length;

                var length = numPositions / 2;

                for (i = 0; i < ilength; i += 3) {
                    var i0 = newIndices[i] + length;
                    var i1 = newIndices[i + 1] + length;
                    var i2 = newIndices[i + 2] + length;

                    newIndices[i + ilength] = i2;
                    newIndices[i + 1 + ilength] = i1;
                    newIndices[i + 2 + ilength] = i0;
                }

                topGeo.attributes.position.values = topBottomPositions;
                if (perPositionHeight && vertexFormat.normal) {
                    var normals = topGeo.attributes.normal.values;
                    topGeo.attributes.normal.values = new Float32Array(topBottomPositions.length);
                    topGeo.attributes.normal.values.set(normals);
                }
                topGeo.indices = newIndices;
            } else if (closeBottom) {
                numPositions = edgePoints.length / 3;
                newIndices = IndexDatatype.createTypedArray(numPositions, indices.length);

                for (i = 0; i < indices.length; i += 3) {
                    newIndices[i] = indices[i + 2];
                    newIndices[i + 1] = indices[i + 1];
                    newIndices[i + 2] = indices[i];
                }

                topGeo.indices = newIndices;
            }

            geos.topAndBottom = new GeometryInstance({
                geometry : topGeo
            });
        }

        var outerRing = hierarchy.outerRing;
        var tangentPlane = EllipsoidTangentPlane.fromPoints(outerRing, ellipsoid);
        var positions2D = tangentPlane.projectPointsOntoPlane(outerRing, createGeometryFromPositionsExtrudedPositions);

        var windingOrder = PolygonPipeline.computeWindingOrder2D(positions2D);
        if (windingOrder === WindingOrder.CLOCKWISE) {
            outerRing = outerRing.slice().reverse();
        }

        var wallGeo = PolygonGeometryLibrary.computeWallGeometry(outerRing, ellipsoid, granularity, perPositionHeight, arcType);
        geos.walls.push(new GeometryInstance({
            geometry : wallGeo
        }));

        var holes = hierarchy.holes;
        for (i = 0; i < holes.length; i++) {
            var hole = holes[i];

            tangentPlane = EllipsoidTangentPlane.fromPoints(hole, ellipsoid);
            positions2D = tangentPlane.projectPointsOntoPlane(hole, createGeometryFromPositionsExtrudedPositions);

            windingOrder = PolygonPipeline.computeWindingOrder2D(positions2D);
            if (windingOrder === WindingOrder.COUNTER_CLOCKWISE) {
                hole = hole.slice().reverse();
            }

            wallGeo = PolygonGeometryLibrary.computeWallGeometry(hole, ellipsoid, granularity, perPositionHeight, arcType);
            geos.walls.push(new GeometryInstance({
                geometry : wallGeo
            }));
        }

        return geos;
    }

    /**
     * A description of a polygon on the ellipsoid. The polygon is defined by a polygon hierarchy. Polygon geometry can be rendered with both {@link Primitive} and {@link GroundPrimitive}.
     *
     * @alias PolygonGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {PolygonHierarchy} options.polygonHierarchy A polygon hierarchy that can include holes.
     * @param {Number} [options.height=0.0] The distance in meters between the polygon and the ellipsoid surface.
     * @param {Number} [options.extrudedHeight] The distance in meters between the polygon's extruded face and the ellipsoid surface.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Number} [options.stRotation=0.0] The rotation of the texture coordinates, in radians. A positive rotation is counter-clockwise.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Boolean} [options.perPositionHeight=false] Use the height of options.positions for each position instead of using options.height to determine the height.
     * @param {Boolean} [options.closeTop=true] When false, leaves off the top of an extruded polygon open.
     * @param {Boolean} [options.closeBottom=true] When false, leaves off the bottom of an extruded polygon open.
     * @param {ArcType} [options.arcType=ArcType.GEODESIC] The type of line the polygon edges must follow. Valid options are {@link ArcType.GEODESIC} and {@link ArcType.RHUMB}.
     *
     * @see PolygonGeometry#createGeometry
     * @see PolygonGeometry#fromPositions
     *
     * @demo {@link https://sandcastle.cesium.com/index.html?src=Polygon.html|Cesium Sandcastle Polygon Demo}
     *
     * @example
     * // 1. create a polygon from points
     * var polygon = new Cesium.PolygonGeometry({
     *   polygonHierarchy : new Cesium.PolygonHierarchy(
     *     Cesium.Cartesian3.fromDegreesArray([
     *       -72.0, 40.0,
     *       -70.0, 35.0,
     *       -75.0, 30.0,
     *       -70.0, 30.0,
     *       -68.0, 40.0
     *     ])
     *   )
     * });
     * var geometry = Cesium.PolygonGeometry.createGeometry(polygon);
     *
     * // 2. create a nested polygon with holes
     * var polygonWithHole = new Cesium.PolygonGeometry({
     *   polygonHierarchy : new Cesium.PolygonHierarchy(
     *     Cesium.Cartesian3.fromDegreesArray([
     *       -109.0, 30.0,
     *       -95.0, 30.0,
     *       -95.0, 40.0,
     *       -109.0, 40.0
     *     ]),
     *     [new Cesium.PolygonHierarchy(
     *       Cesium.Cartesian3.fromDegreesArray([
     *         -107.0, 31.0,
     *         -107.0, 39.0,
     *         -97.0, 39.0,
     *         -97.0, 31.0
     *       ]),
     *       [new Cesium.PolygonHierarchy(
     *         Cesium.Cartesian3.fromDegreesArray([
     *           -105.0, 33.0,
     *           -99.0, 33.0,
     *           -99.0, 37.0,
     *           -105.0, 37.0
     *         ]),
     *         [new Cesium.PolygonHierarchy(
     *           Cesium.Cartesian3.fromDegreesArray([
     *             -103.0, 34.0,
     *             -101.0, 34.0,
     *             -101.0, 36.0,
     *             -103.0, 36.0
     *           ])
     *         )]
     *       )]
     *     )]
     *   )
     * });
     * var geometry = Cesium.PolygonGeometry.createGeometry(polygonWithHole);
     *
     * // 3. create extruded polygon
     * var extrudedPolygon = new Cesium.PolygonGeometry({
     *   polygonHierarchy : new Cesium.PolygonHierarchy(
     *     Cesium.Cartesian3.fromDegreesArray([
     *       -72.0, 40.0,
     *       -70.0, 35.0,
     *       -75.0, 30.0,
     *       -70.0, 30.0,
     *       -68.0, 40.0
     *     ])
     *   ),
     *   extrudedHeight: 300000
     * });
     * var geometry = Cesium.PolygonGeometry.createGeometry(extrudedPolygon);
     */
    function PolygonGeometry(options) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('options', options);
        Check.typeOf.object('options.polygonHierarchy', options.polygonHierarchy);
        if (defined(options.perPositionHeight) && options.perPositionHeight && defined(options.height)) {
            throw new DeveloperError('Cannot use both options.perPositionHeight and options.height');
        }
        if (defined(options.arcType) && options.arcType !== ArcType.GEODESIC && options.arcType !== ArcType.RHUMB) {
            throw new DeveloperError('Invalid arcType. Valid options are ArcType.GEODESIC and ArcType.RHUMB.');
        }
        //>>includeEnd('debug');

        var polygonHierarchy = options.polygonHierarchy;
        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);
        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        var stRotation = defaultValue(options.stRotation, 0.0);
        var perPositionHeight = defaultValue(options.perPositionHeight, false);
        var perPositionHeightExtrude = perPositionHeight && defined(options.extrudedHeight);
        var height = defaultValue(options.height, 0.0);
        var extrudedHeight = defaultValue(options.extrudedHeight, height);

        if (!perPositionHeightExtrude) {
            var h = Math.max(height, extrudedHeight);
            extrudedHeight = Math.min(height, extrudedHeight);
            height = h;
        }

        this._vertexFormat = VertexFormat.clone(vertexFormat);
        this._ellipsoid = Ellipsoid.clone(ellipsoid);
        this._granularity = granularity;
        this._stRotation = stRotation;
        this._height = height;
        this._extrudedHeight = extrudedHeight;
        this._closeTop = defaultValue(options.closeTop, true);
        this._closeBottom = defaultValue(options.closeBottom, true);
        this._polygonHierarchy = polygonHierarchy;
        this._perPositionHeight = perPositionHeight;
        this._perPositionHeightExtrude = perPositionHeightExtrude;
        this._shadowVolume = defaultValue(options.shadowVolume, false);
        this._workerName = 'createPolygonGeometry';
        this._offsetAttribute = options.offsetAttribute;
        this._arcType = defaultValue(options.arcType, ArcType.GEODESIC);

        this._rectangle = undefined;
        this._textureCoordinateRotationPoints = undefined;

        /**
         * The number of elements used to pack the object into an array.
         * @type {Number}
         */
        this.packedLength = PolygonGeometryLibrary.computeHierarchyPackedLength(polygonHierarchy) + Ellipsoid.packedLength + VertexFormat.packedLength + 12;
    }

    /**
     * A description of a polygon from an array of positions. Polygon geometry can be rendered with both {@link Primitive} and {@link GroundPrimitive}.
     *
     * @param {Object} options Object with the following properties:
     * @param {Cartesian3[]} options.positions An array of positions that defined the corner points of the polygon.
     * @param {Number} [options.height=0.0] The height of the polygon.
     * @param {Number} [options.extrudedHeight] The height of the polygon extrusion.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Number} [options.stRotation=0.0] The rotation of the texture coordinates, in radians. A positive rotation is counter-clockwise.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Boolean} [options.perPositionHeight=false] Use the height of options.positions for each position instead of using options.height to determine the height.
     * @param {Boolean} [options.closeTop=true] When false, leaves off the top of an extruded polygon open.
     * @param {Boolean} [options.closeBottom=true] When false, leaves off the bottom of an extruded polygon open.
     * @param {ArcType} [options.arcType=ArcType.GEODESIC] The type of line the polygon edges must follow. Valid options are {@link ArcType.GEODESIC} and {@link ArcType.RHUMB}.
     * @returns {PolygonGeometry}
     *
     *
     * @example
     * // create a polygon from points
     * var polygon = Cesium.PolygonGeometry.fromPositions({
     *   positions : Cesium.Cartesian3.fromDegreesArray([
     *     -72.0, 40.0,
     *     -70.0, 35.0,
     *     -75.0, 30.0,
     *     -70.0, 30.0,
     *     -68.0, 40.0
     *   ])
     * });
     * var geometry = Cesium.PolygonGeometry.createGeometry(polygon);
     *
     * @see PolygonGeometry#createGeometry
     */
    PolygonGeometry.fromPositions = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        Check.defined('options.positions', options.positions);
        //>>includeEnd('debug');

        var newOptions = {
            polygonHierarchy : {
                positions : options.positions
            },
            height : options.height,
            extrudedHeight : options.extrudedHeight,
            vertexFormat : options.vertexFormat,
            stRotation : options.stRotation,
            ellipsoid : options.ellipsoid,
            granularity : options.granularity,
            perPositionHeight : options.perPositionHeight,
            closeTop : options.closeTop,
            closeBottom : options.closeBottom,
            offsetAttribute : options.offsetAttribute,
            arcType : options.arcType
        };
        return new PolygonGeometry(newOptions);
    };

    /**
     * Stores the provided instance into the provided array.
     *
     * @param {PolygonGeometry} value The value to pack.
     * @param {Number[]} array The array to pack into.
     * @param {Number} [startingIndex=0] The index into the array at which to start packing the elements.
     *
     * @returns {Number[]} The array that was packed into
     */
    PolygonGeometry.pack = function(value, array, startingIndex) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('value', value);
        Check.defined('array', array);
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        startingIndex = PolygonGeometryLibrary.packPolygonHierarchy(value._polygonHierarchy, array, startingIndex);

        Ellipsoid.pack(value._ellipsoid, array, startingIndex);
        startingIndex += Ellipsoid.packedLength;

        VertexFormat.pack(value._vertexFormat, array, startingIndex);
        startingIndex += VertexFormat.packedLength;

        array[startingIndex++] = value._height;
        array[startingIndex++] = value._extrudedHeight;
        array[startingIndex++] = value._granularity;
        array[startingIndex++] = value._stRotation;
        array[startingIndex++] = value._perPositionHeightExtrude ? 1.0 : 0.0;
        array[startingIndex++] = value._perPositionHeight ? 1.0 : 0.0;
        array[startingIndex++] = value._closeTop ? 1.0 : 0.0;
        array[startingIndex++] = value._closeBottom ? 1.0 : 0.0;
        array[startingIndex++] = value._shadowVolume ? 1.0 : 0.0;
        array[startingIndex++] = defaultValue(value._offsetAttribute, -1);
        array[startingIndex++] = value._arcType;
        array[startingIndex] = value.packedLength;

        return array;
    };

    var scratchEllipsoid = Ellipsoid.clone(Ellipsoid.UNIT_SPHERE);
    var scratchVertexFormat = new VertexFormat();

    //Only used to avoid inability to default construct.
    var dummyOptions = {
        polygonHierarchy : {}
    };

    /**
     * Retrieves an instance from a packed array.
     *
     * @param {Number[]} array The packed array.
     * @param {Number} [startingIndex=0] The starting index of the element to be unpacked.
     * @param {PolygonGeometry} [result] The object into which to store the result.
     */
    PolygonGeometry.unpack = function(array, startingIndex, result) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('array', array);
        //>>includeEnd('debug');

        startingIndex = defaultValue(startingIndex, 0);

        var polygonHierarchy = PolygonGeometryLibrary.unpackPolygonHierarchy(array, startingIndex);
        startingIndex = polygonHierarchy.startingIndex;
        delete polygonHierarchy.startingIndex;

        var ellipsoid = Ellipsoid.unpack(array, startingIndex, scratchEllipsoid);
        startingIndex += Ellipsoid.packedLength;

        var vertexFormat = VertexFormat.unpack(array, startingIndex, scratchVertexFormat);
        startingIndex += VertexFormat.packedLength;

        var height = array[startingIndex++];
        var extrudedHeight = array[startingIndex++];
        var granularity = array[startingIndex++];
        var stRotation = array[startingIndex++];
        var perPositionHeightExtrude = array[startingIndex++] === 1.0;
        var perPositionHeight = array[startingIndex++] === 1.0;
        var closeTop = array[startingIndex++] === 1.0;
        var closeBottom = array[startingIndex++] === 1.0;
        var shadowVolume = array[startingIndex++] === 1.0;
        var offsetAttribute = array[startingIndex++];
        var arcType = array[startingIndex++];
        var packedLength = array[startingIndex];

        if (!defined(result)) {
            result = new PolygonGeometry(dummyOptions);
        }

        result._polygonHierarchy = polygonHierarchy;
        result._ellipsoid = Ellipsoid.clone(ellipsoid, result._ellipsoid);
        result._vertexFormat = VertexFormat.clone(vertexFormat, result._vertexFormat);
        result._height = height;
        result._extrudedHeight = extrudedHeight;
        result._granularity = granularity;
        result._stRotation = stRotation;
        result._perPositionHeightExtrude = perPositionHeightExtrude;
        result._perPositionHeight = perPositionHeight;
        result._closeTop = closeTop;
        result._closeBottom = closeBottom;
        result._shadowVolume = shadowVolume;
        result._offsetAttribute = offsetAttribute === -1 ? undefined : offsetAttribute;
        result._arcType = arcType;
        result.packedLength = packedLength;
        return result;
    };

    /**
     * Returns the bounding rectangle given the provided options
     *
     * @param {Object} options Object with the following properties:
     * @param {PolygonHierarchy} options.polygonHierarchy A polygon hierarchy that can include holes.
     * @param {Number} [options.granularity=CesiumMath.RADIANS_PER_DEGREE] The distance, in radians, between each latitude and longitude. Determines the number of positions sampled.
     * @param {ArcType} [options.arcType=ArcType.GEODESIC] The type of line the polygon edges must follow. Valid options are {@link ArcType.GEODESIC} and {@link ArcType.RHUMB}.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Rectangle} [result] An object in which to store the result.
     *
     * @returns {Rectangle} The result rectangle
     */
    PolygonGeometry.computeRectangle = function(options, result) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('options', options);
        Check.typeOf.object('options.polygonHierarchy', options.polygonHierarchy);
        //>>includeEnd('debug');

        var granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        var arcType = defaultValue(options.arcType, ArcType.GEODESIC);
        //>>includeStart('debug', pragmas.debug);
        if (arcType !== ArcType.GEODESIC && arcType !== ArcType.RHUMB) {
            throw new DeveloperError('Invalid arcType. Valid options are ArcType.GEODESIC and ArcType.RHUMB.');
        }
        //>>includeEnd('debug');

        var polygonHierarchy = options.polygonHierarchy;
        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);

        return computeRectangle(polygonHierarchy.positions, ellipsoid, arcType, granularity, result);
    };

    /**
     * Computes the geometric representation of a polygon, including its vertices, indices, and a bounding sphere.
     *
     * @param {PolygonGeometry} polygonGeometry A description of the polygon.
     * @returns {Geometry|undefined} The computed vertices and indices.
     */
    PolygonGeometry.createGeometry = function(polygonGeometry) {
        var vertexFormat = polygonGeometry._vertexFormat;
        var ellipsoid = polygonGeometry._ellipsoid;
        var granularity = polygonGeometry._granularity;
        var stRotation = polygonGeometry._stRotation;
        var polygonHierarchy = polygonGeometry._polygonHierarchy;
        var perPositionHeight = polygonGeometry._perPositionHeight;
        var closeTop = polygonGeometry._closeTop;
        var closeBottom = polygonGeometry._closeBottom;
        var arcType = polygonGeometry._arcType;

        var outerPositions = polygonHierarchy.positions;
        if (outerPositions.length < 3) {
            return;
        }

        var tangentPlane = EllipsoidTangentPlane.fromPoints(outerPositions, ellipsoid);

        var results = PolygonGeometryLibrary.polygonsFromHierarchy(polygonHierarchy, tangentPlane.projectPointsOntoPlane.bind(tangentPlane), !perPositionHeight, ellipsoid);

        var hierarchy = results.hierarchy;
        var polygons = results.polygons;

        if (hierarchy.length === 0) {
            return;
        }

        outerPositions = hierarchy[0].outerRing;
        var boundingRectangle = PolygonGeometryLibrary.computeBoundingRectangle(tangentPlane.plane.normal, tangentPlane.projectPointOntoPlane.bind(tangentPlane), outerPositions, stRotation, scratchBoundingRectangle);

        var geometries = [];

        var height = polygonGeometry._height;
        var extrudedHeight = polygonGeometry._extrudedHeight;
        var extrude = polygonGeometry._perPositionHeightExtrude || !CesiumMath.equalsEpsilon(height, extrudedHeight, 0, CesiumMath.EPSILON2);

        var options = {
            perPositionHeight: perPositionHeight,
            vertexFormat: vertexFormat,
            geometry: undefined,
            tangentPlane: tangentPlane,
            boundingRectangle: boundingRectangle,
            ellipsoid: ellipsoid,
            stRotation: stRotation,
            bottom: false,
            top: true,
            wall: false,
            extrude: false,
            arcType: arcType
        };

        var i;

        if (extrude) {
            options.extrude = true;
            options.top = closeTop;
            options.bottom = closeBottom;
            options.shadowVolume = polygonGeometry._shadowVolume;
            options.offsetAttribute = polygonGeometry._offsetAttribute;
            for (i = 0; i < polygons.length; i++) {
                var splitGeometry = createGeometryFromPositionsExtruded(ellipsoid, polygons[i], granularity, hierarchy[i], perPositionHeight, closeTop, closeBottom, vertexFormat, arcType);

                var topAndBottom;
                if (closeTop && closeBottom) {
                    topAndBottom = splitGeometry.topAndBottom;
                    options.geometry = PolygonGeometryLibrary.scaleToGeodeticHeightExtruded(topAndBottom.geometry, height, extrudedHeight, ellipsoid, perPositionHeight);
                } else if (closeTop) {
                    topAndBottom = splitGeometry.topAndBottom;
                    topAndBottom.geometry.attributes.position.values = PolygonPipeline.scaleToGeodeticHeight(topAndBottom.geometry.attributes.position.values, height, ellipsoid, !perPositionHeight);
                    options.geometry = topAndBottom.geometry;
                } else if (closeBottom) {
                    topAndBottom = splitGeometry.topAndBottom;
                    topAndBottom.geometry.attributes.position.values = PolygonPipeline.scaleToGeodeticHeight(topAndBottom.geometry.attributes.position.values, extrudedHeight, ellipsoid, true);
                    options.geometry = topAndBottom.geometry;
                }
                if (closeTop || closeBottom) {
                    options.wall = false;
                    topAndBottom.geometry = computeAttributes(options);
                    geometries.push(topAndBottom);
                }

                var walls = splitGeometry.walls;
                options.wall = true;
                for ( var k = 0; k < walls.length; k++) {
                    var wall = walls[k];
                    options.geometry = PolygonGeometryLibrary.scaleToGeodeticHeightExtruded(wall.geometry, height, extrudedHeight, ellipsoid, perPositionHeight);
                    wall.geometry = computeAttributes(options);
                    geometries.push(wall);
                }
            }
        } else {
            for (i = 0; i < polygons.length; i++) {
                var geometryInstance = new GeometryInstance({
                    geometry : PolygonGeometryLibrary.createGeometryFromPositions(ellipsoid, polygons[i], granularity, perPositionHeight, vertexFormat, arcType)
                });
                geometryInstance.geometry.attributes.position.values = PolygonPipeline.scaleToGeodeticHeight(geometryInstance.geometry.attributes.position.values, height, ellipsoid, !perPositionHeight);
                options.geometry = geometryInstance.geometry;
                geometryInstance.geometry = computeAttributes(options);

                if (defined(polygonGeometry._offsetAttribute)) {
                    var length = geometryInstance.geometry.attributes.position.values.length;
                    var applyOffset = new Uint8Array(length / 3);
                    var offsetValue = polygonGeometry._offsetAttribute === GeometryOffsetAttribute.NONE ? 0 : 1;
                    arrayFill(applyOffset, offsetValue);
                    geometryInstance.geometry.attributes.applyOffset = new GeometryAttribute({
                        componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                        componentsPerAttribute : 1,
                        values: applyOffset
                    });
                }

                geometries.push(geometryInstance);
            }
        }

        var geometry = GeometryPipeline.combineInstances(geometries)[0];
        geometry.attributes.position.values = new Float64Array(geometry.attributes.position.values);
        geometry.indices = IndexDatatype.createTypedArray(geometry.attributes.position.values.length / 3, geometry.indices);

        var attributes = geometry.attributes;
        var boundingSphere = BoundingSphere.fromVertices(attributes.position.values);

        if (!vertexFormat.position) {
            delete attributes.position;
        }

        return new Geometry({
            attributes : attributes,
            indices : geometry.indices,
            primitiveType : geometry.primitiveType,
            boundingSphere : boundingSphere,
            offsetAttribute : polygonGeometry._offsetAttribute
        });
    };

    /**
     * @private
     */
    PolygonGeometry.createShadowVolume = function(polygonGeometry, minHeightFunc, maxHeightFunc) {
        var granularity = polygonGeometry._granularity;
        var ellipsoid = polygonGeometry._ellipsoid;

        var minHeight = minHeightFunc(granularity, ellipsoid);
        var maxHeight = maxHeightFunc(granularity, ellipsoid);

        return new PolygonGeometry({
            polygonHierarchy : polygonGeometry._polygonHierarchy,
            ellipsoid : ellipsoid,
            stRotation : polygonGeometry._stRotation,
            granularity : granularity,
            perPositionHeight : false,
            extrudedHeight : minHeight,
            height : maxHeight,
            vertexFormat : VertexFormat.POSITION_ONLY,
            shadowVolume: true,
            arcType : polygonGeometry._arcType
        });
    };

    function textureCoordinateRotationPoints(polygonGeometry) {
        var stRotation = -polygonGeometry._stRotation;
        if (stRotation === 0.0) {
            return [0, 0, 0, 1, 1, 0];
        }
        var ellipsoid = polygonGeometry._ellipsoid;
        var positions = polygonGeometry._polygonHierarchy.positions;
        var boundingRectangle = polygonGeometry.rectangle;
        return Geometry._textureCoordinateRotationPoints(positions, stRotation, ellipsoid, boundingRectangle);
    }

    defineProperties(PolygonGeometry.prototype, {
        /**
         * @private
         */
        rectangle : {
            get : function() {
                if (!defined(this._rectangle)) {
                    var positions = this._polygonHierarchy.positions;
                    this._rectangle = computeRectangle(positions, this._ellipsoid, this._arcType, this._granularity);
                }

                return this._rectangle;
            }
        },
        /**
         * For remapping texture coordinates when rendering PolygonGeometries as GroundPrimitives.
         * @private
         */
        textureCoordinateRotationPoints : {
            get : function() {
                if (!defined(this._textureCoordinateRotationPoints)) {
                    this._textureCoordinateRotationPoints = textureCoordinateRotationPoints(this);
                }
                return this._textureCoordinateRotationPoints;
            }
        }
    });
export default PolygonGeometry;
