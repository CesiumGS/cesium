/*global define*/
define([
        './defaultValue',
        './BoundingRectangle',
        './BoundingSphere',
        './Cartesian2',
        './Cartesian3',
        './Cartesian4',
        './ComponentDatatype',
        './IndexDatatype',
        './DeveloperError',
        './Ellipsoid',
        './EllipsoidTangentPlane',
        './Geometry',
        './GeometryAttribute',
        './GeometryInstance',
        './GeometryPipeline',
        './Intersect',
        './Math',
        './Matrix3',
        './PolygonPipeline',
        './Quaternion',
        './Queue',
        './VertexFormat',
        './WindingOrder',
        './PrimitiveType'
    ], function(
        defaultValue,
        BoundingRectangle,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        ComponentDatatype,
        IndexDatatype,
        DeveloperError,
        Ellipsoid,
        EllipsoidTangentPlane,
        Geometry,
        GeometryAttribute,
        GeometryInstance,
        GeometryPipeline,
        Intersect,
        CesiumMath,
        Matrix3,
        PolygonPipeline,
        Quaternion,
        Queue,
        VertexFormat,
        WindingOrder,
        PrimitiveType) {
    "use strict";

    var scratchBoundingRectangle = new BoundingRectangle();
    var scratchPosition = new Cartesian3();
    var scratchNormal = new Cartesian3();
    var scratchTangent = new Cartesian3();
    var scratchBinormal = new Cartesian3();
    var p1 = new Cartesian3();
    var p2 = new Cartesian3();

    var appendTextureCoordinatesOrigin = new Cartesian2();
    var appendTextureCoordinatesCartesian2 = new Cartesian2();
    var appendTextureCoordinatesCartesian3 = new Cartesian3();
    var appendTextureCoordinatesQuaternion = new Quaternion();
    var appendTextureCoordinatesMatrix3 = new Matrix3();

    function computeWallAttributes(vertexFormat, geometry, outerPositions, ellipsoid, stRotation) {
        if (vertexFormat.st || vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
            // PERFORMANCE_IDEA: Compute before subdivision, then just interpolate during subdivision.
            // PERFORMANCE_IDEA: Compute with createGeometryFromPositions() for fast path when there's no holes.
            var cleanedPositions = PolygonPipeline.removeDuplicates(outerPositions);
            var tangentPlane = EllipsoidTangentPlane.fromPoints(cleanedPositions, ellipsoid);
            var boundingRectangle = computeBoundingRectangle(tangentPlane, outerPositions, stRotation, scratchBoundingRectangle);

            var origin = appendTextureCoordinatesOrigin;
            origin.x = boundingRectangle.x;
            origin.y = boundingRectangle.y;

            var flatPositions = geometry.attributes.position.values;
            var length = flatPositions.length;

            var textureCoordinates = vertexFormat.st ? new Float32Array(2 * (length / 3)) : undefined;
            var normals = vertexFormat.normal ? new Float32Array(length) : undefined;
            var tangents = vertexFormat.tangent ? new Float32Array(length) : undefined;
            var binormals = vertexFormat.binormal ? new Float32Array(length) : undefined;

            var textureCoordIndex = 0;
            var attrIndex = 0;

            var normal = scratchNormal;
            var tangent = scratchTangent;
            var binormal = scratchBinormal;
            var recomputeNormal = true;

            var rotation = Quaternion.fromAxisAngle(tangentPlane._plane.normal, stRotation, appendTextureCoordinatesQuaternion);
            var textureMatrix = Matrix3.fromQuaternion(rotation, appendTextureCoordinatesMatrix3);

            length /= 2;
            var stOffset = length * 2 / 3;

            for (var i = 0; i < length; i += 3) {
                var position = Cartesian3.fromArray(flatPositions, i, appendTextureCoordinatesCartesian3);

                if (vertexFormat.st) {
                    var p = Matrix3.multiplyByVector(textureMatrix, position, scratchPosition);
                    var st = tangentPlane.projectPointOntoPlane(p, appendTextureCoordinatesCartesian2);
                    Cartesian2.subtract(st, origin, st);

                    textureCoordinates[textureCoordIndex + stOffset] = st.x / boundingRectangle.width;
                    textureCoordinates[textureCoordIndex + stOffset + 1] = st.y / boundingRectangle.height;

                    textureCoordinates[textureCoordIndex++] = st.x / boundingRectangle.width;
                    textureCoordinates[textureCoordIndex++] = st.y / boundingRectangle.height;
                }

                if (vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
                    var attrIndex1 = attrIndex + 1;
                    var attrIndex2 = attrIndex + 2;

                    p1 = Cartesian3.fromArray(flatPositions, i + 3, p1);
                    if (recomputeNormal) {
                        p2 = Cartesian3.fromArray(flatPositions, i + length, p2);
                        p1.subtract(position, p1);
                        p2.subtract(position, p2);
                        normal = Cartesian3.cross(p2, p1, normal).normalize(normal);
                        recomputeNormal = false;
                    }
                    if (vertexFormat.tangent || vertexFormat.binormal) {
                        binormal = ellipsoid.geodeticSurfaceNormal(position, binormal);
                        if (vertexFormat.tangent) {
                            tangent = Cartesian3.cross(binormal, normal, tangent).normalize(tangent);
                        }
                    }

                    if (p1.equalsEpsilon(position, CesiumMath.EPSILON10)) { // if we've reached a corner
                        recomputeNormal = true;
                    }

                    if (vertexFormat.normal) {
                        normals[attrIndex + length] = normal.x;
                        normals[attrIndex1 + length] = normal.y;
                        normals[attrIndex2 + length] = normal.z;

                        normals[attrIndex] = normal.x;
                        normals[attrIndex1] = normal.y;
                        normals[attrIndex2] = normal.z;
                    }

                    if (vertexFormat.tangent) {
                        tangents[attrIndex + length] = tangent.x;
                        tangents[attrIndex1 + length] = tangent.y;
                        tangents[attrIndex2 + length] = tangent.z;

                        tangents[attrIndex] = tangent.x;
                        tangents[attrIndex1] = tangent.y;
                        tangents[attrIndex2] = tangent.z;
                    }

                    if (vertexFormat.binormal) {
                        binormals[attrIndex + length] = binormal.x;
                        binormals[attrIndex1 + length] = binormal.y;
                        binormals[attrIndex2 + length] = binormal.z;

                        binormals[attrIndex] = binormal.x;
                        binormals[attrIndex1] = binormal.y;
                        binormals[attrIndex2] = binormal.z;
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

            if (vertexFormat.binormal) {
                geometry.attributes.binormal = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : binormals
                });
            }
        }
        return geometry;
    }

    function computeTopBottomAttributes(vertexFormat, geometry, outerPositions, ellipsoid, stRotation, top, bottom) {
        if (vertexFormat.st || vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal) {
            // PERFORMANCE_IDEA: Compute before subdivision, then just interpolate during subdivision.
            // PERFORMANCE_IDEA: Compute with createGeometryFromPositions() for fast path when there's no holes.
            var cleanedPositions = PolygonPipeline.removeDuplicates(outerPositions);
            var tangentPlane = EllipsoidTangentPlane.fromPoints(cleanedPositions, ellipsoid);
            var boundingRectangle = computeBoundingRectangle(tangentPlane, outerPositions, stRotation, scratchBoundingRectangle);

            var origin = appendTextureCoordinatesOrigin;
            origin.x = boundingRectangle.x;
            origin.y = boundingRectangle.y;

            var flatPositions = geometry.attributes.position.values;
            var length = flatPositions.length;

            var textureCoordinates = vertexFormat.st ? new Float32Array(2 * (length / 3)) : undefined;
            var normals = vertexFormat.normal ? new Float32Array(length) : undefined;
            var tangents = vertexFormat.tangent ? new Float32Array(length) : undefined;
            var binormals = vertexFormat.binormal ? new Float32Array(length) : undefined;

            var textureCoordIndex = 0;
            var attrIndex = 0;

            var normal = scratchNormal;
            var tangent = scratchTangent;

            var rotation = Quaternion.fromAxisAngle(tangentPlane._plane.normal, stRotation, appendTextureCoordinatesQuaternion);
            var textureMatrix = Matrix3.fromQuaternion(rotation, appendTextureCoordinatesMatrix3);

            var bottomOffset = (top) ? length / 2 : 0;
            var bottomOffset2 = bottomOffset * 2 / 3;

            if (top && bottom) {
                length /= 2;
            }

            for (var i = 0; i < length; i += 3) {
                var attrIndex1 = attrIndex + 1;
                var attrIndex2 = attrIndex + 2;
                var position = Cartesian3.fromArray(flatPositions, i, appendTextureCoordinatesCartesian3);

                if (vertexFormat.st) {
                    var p = Matrix3.multiplyByVector(textureMatrix, position, scratchPosition);
                    var st = tangentPlane.projectPointOntoPlane(p, appendTextureCoordinatesCartesian2);
                    Cartesian2.subtract(st, origin, st);

                    if (bottom){
                        textureCoordinates[textureCoordIndex + bottomOffset2] = st.x / boundingRectangle.width;
                        textureCoordinates[textureCoordIndex + 1 + bottomOffset2] = st.y / boundingRectangle.height;
                    }

                    if (top){
                        textureCoordinates[textureCoordIndex] = st.x / boundingRectangle.width;
                        textureCoordinates[textureCoordIndex + 1] = st.y / boundingRectangle.height;
                    }

                    textureCoordIndex += 2;
                }

                if (vertexFormat.normal) {
                    normal = ellipsoid.geodeticSurfaceNormal(position, normal);

                    if (bottom) {
                        normals[attrIndex + bottomOffset] = -normal.x;
                        normals[attrIndex1 + bottomOffset] = -normal.y;
                        normals[attrIndex2 + bottomOffset] = -normal.z;
                    }

                    if (top) {
                        normals[attrIndex] = normal.x;
                        normals[attrIndex1] = normal.y;
                        normals[attrIndex2] = normal.z;
                    }
                }

                if (vertexFormat.tangent) {
                    if (!vertexFormat.normal) {
                        ellipsoid.geodeticSurfaceNormal(position, normal);
                    }

                    Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent);
                    Matrix3.multiplyByVector(textureMatrix, tangent, tangent);
                    Cartesian3.normalize(tangent, tangent);

                    if (bottom) {
                        tangents[attrIndex + bottomOffset] = -tangent.x;
                        tangents[attrIndex1 + bottomOffset] = -tangent.y;
                        tangents[attrIndex2 + bottomOffset] = -tangent.z;
                    }

                    if (top) {
                        tangents[attrIndex] = tangent.x;
                        tangents[attrIndex1] = tangent.y;
                        tangents[attrIndex2] = tangent.z;
                    }
                }

                if (vertexFormat.binormal) {
                    if (!vertexFormat.normal) {
                        ellipsoid.geodeticSurfaceNormal(position, normal);
                    }

                    if (!vertexFormat.tangent) {
                        Cartesian3.cross(Cartesian3.UNIT_Z, normal, tangent);
                        Matrix3.multiplyByVector(textureMatrix, tangent, tangent);
                    }

                    var binormal = Cartesian3.cross(normal, tangent, scratchBinormal);
                    Cartesian3.normalize(binormal, binormal);

                    if (bottom) {
                        binormals[attrIndex + bottomOffset] = binormal.x;
                        binormals[attrIndex1 + bottomOffset] = binormal.y;
                        binormals[attrIndex2 + bottomOffset] = binormal.z;
                    }

                    if (top) {
                        binormals[attrIndex] = binormal.x;
                        binormals[attrIndex1] = binormal.y;
                        binormals[attrIndex2] = binormal.z;
                    }
                }
                attrIndex += 3;
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

            if (vertexFormat.binormal) {
                geometry.attributes.binormal = new GeometryAttribute({
                    componentDatatype : ComponentDatatype.FLOAT,
                    componentsPerAttribute : 3,
                    values : binormals
                });
            }
        }
        return geometry;
    }


    var computeBoundingRectangleCartesian2 = new Cartesian2();
    var computeBoundingRectangleCartesian3 = new Cartesian3();
    var computeBoundingRectangleQuaternion = new Quaternion();
    var computeBoundingRectangleMatrix3 = new Matrix3();

    function computeBoundingRectangle(tangentPlane, positions, angle, result) {
        var rotation = Quaternion.fromAxisAngle(tangentPlane._plane.normal, angle, computeBoundingRectangleQuaternion);
        var textureMatrix = Matrix3.fromQuaternion(rotation, computeBoundingRectangleMatrix3);

        var minX = Number.POSITIVE_INFINITY;
        var maxX = Number.NEGATIVE_INFINITY;
        var minY = Number.POSITIVE_INFINITY;
        var maxY = Number.NEGATIVE_INFINITY;

        var length = positions.length;
        for ( var i = 0; i < length; ++i) {
            var p = Cartesian3.clone(positions[i], computeBoundingRectangleCartesian3);
            Matrix3.multiplyByVector(textureMatrix, p, p);
            var st = tangentPlane.projectPointOntoPlane(p, computeBoundingRectangleCartesian2);

            if (typeof st !== 'undefined') {
                minX = Math.min(minX, st.x);
                maxX = Math.max(maxX, st.x);

                minY = Math.min(minY, st.y);
                maxY = Math.max(maxY, st.y);
            }
        }

        if (typeof result === 'undefined') {
            result = new BoundingRectangle();
        }

        result.x = minX;
        result.y = minY;
        result.width = maxX - minX;
        result.height = maxY - minY;
        return result;
    }

    var scaleToGeodeticHeightN1 = new Cartesian3();
    var scaleToGeodeticHeightN2 = new Cartesian3();
    var scaleToGeodeticHeightP = new Cartesian3();
    function scaleToGeodeticHeightExtruded(mesh, maxHeight, minHeight, ellipsoid) {
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

        var n1 = scaleToGeodeticHeightN1;
        var n2 = scaleToGeodeticHeightN2;
        var p = scaleToGeodeticHeightP;

        if (typeof mesh !== 'undefined' && typeof mesh.attributes !== 'undefined' && typeof mesh.attributes.position !== 'undefined') {
            var positions = mesh.attributes.position.values;
            var length = positions.length / 2;

            for ( var i = 0; i < length; i += 3) {
                Cartesian3.fromArray(positions, i, p);

                ellipsoid.scaleToGeodeticSurface(p, p);
                ellipsoid.geodeticSurfaceNormal(p, n1);

                Cartesian3.multiplyByScalar(n1, maxHeight, n2);
                Cartesian3.add(p, n2, n2);
                positions[i] = n2.x;
                positions[i + 1] = n2.y;
                positions[i + 2] = n2.z;

                Cartesian3.multiplyByScalar(n1, minHeight, n2);
                Cartesian3.add(p, n2, n2);
                positions[i + length] = n2.x;
                positions[i + 1 + length] = n2.y;
                positions[i + 2 + length] = n2.z;
            }
        }
        return mesh;
    }

    function scaleCartesiansToGeodeticHeight(positions, height, ellipsoid) {
        ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);

        var n = scaleToGeodeticHeightN1;

        height = defaultValue(height, 0.0);
        var scaledPositions = new Array(positions.length);
        if (typeof positions !== 'undefined') {
            var length = positions.length;

            for ( var i = 0; i < length; i ++) {
                var p = positions[i].clone();

                ellipsoid.scaleToGeodeticSurface(p, p);
                ellipsoid.geodeticSurfaceNormal(p, n);
                Cartesian3.multiplyByScalar(n, height, n);
                Cartesian3.add(p, n, p);

                scaledPositions[i] = p;
            }
        }

        return scaledPositions;
    }

    var distanceScratch = new Cartesian3();
    function getPointAtDistance(p0, p1, distance, length) {
        distanceScratch = p1.subtract(p0, distanceScratch);
        distanceScratch = distanceScratch.multiplyByScalar(distance/length, distanceScratch);
        distanceScratch = p0.add(distanceScratch, distanceScratch);
        return [distanceScratch.x, distanceScratch.y, distanceScratch.z];
    }

    function subdivideLine(p0, p1, granularity) {
        var length = Cartesian3.distance(p0, p1);
        var angleBetween = Cartesian3.angleBetween(p0, p1);
        var n = angleBetween/granularity;
        var countDivide = Math.ceil(Math.log(n)/Math.log(2));
        if (countDivide < 1) {
            countDivide = 0;
        }
        var numVertices = Math.pow(2, countDivide);

        var distanceBetweenVertices = length / numVertices;

        var positions = new Array(numVertices * 3);
        var index = 0;
        positions[index++] = p0.x;
        positions[index++] = p0.y;
        positions[index++] = p0.z;
        for (var i = 1; i < numVertices; i++) {
            var p = getPointAtDistance(p0, p1, i*distanceBetweenVertices, length);
            positions[index++] = p[0];
            positions[index++] = p[1];
            positions[index++] = p[2];
        }
        positions[index++] = p1.x;
        positions[index++] = p1.y;
        positions[index++] = p1.z;

        return positions;
    }

    var createGeometryFromPositionsPositions = [];
    function createGeometryFromPositionsExtruded(ellipsoid, positions, boundingSphere, granularity, hierarchy) {
        var cleanedPositions = PolygonPipeline.removeDuplicates(positions);
        if (cleanedPositions.length < 3) {
            // Duplicate positions result in not enough positions to form a polygon.
            return undefined;
        }
        var geos = {};
        var tangentPlane = EllipsoidTangentPlane.fromPoints(cleanedPositions, ellipsoid);
        var positions2D = tangentPlane.projectPointsOntoPlane(cleanedPositions, createGeometryFromPositionsPositions);

        var originalWindingOrder = PolygonPipeline.computeWindingOrder2D(positions2D);
        if (originalWindingOrder === WindingOrder.CLOCKWISE) {
            positions2D.reverse();
            cleanedPositions.reverse();
        }

        var edgePoints = cleanedPositions;

        var indices = PolygonPipeline.earClip2D(positions2D);

        var topAndBottomGeo = PolygonPipeline.computeSubdivision(cleanedPositions, indices, granularity);
        indices = topAndBottomGeo.indices;
        var topBottomPositions = topAndBottomGeo.attributes.position.values;
        var length = topBottomPositions.length/3;
        var newIndices = IndexDatatype.createTypedArray(length*2, indices.length*2);
        newIndices.set(indices);
        var ilength = indices.length;
        topBottomPositions = topBottomPositions.concat(topBottomPositions);
        var i;
        for (i = 0 ; i < ilength; i += 3) {
            var i0 = newIndices[i] + length;
            var i1 = newIndices[i + 1] + length;
            var i2 = newIndices[i + 2] + length;

            newIndices[i + ilength] = i2;
            newIndices[i + 1 + ilength] = i1;
            newIndices[i + 2 + ilength] = i0;
        }
        topAndBottomGeo.indices = newIndices;
        topAndBottomGeo.attributes.position.values = topBottomPositions;

        geos.topAndBottom = new GeometryInstance({
            geometry : topAndBottomGeo
        });

        var edgePositions = [];
        var subdividedEdge;
        var edgeIndex;
        var UL, UR, LL, LR;

        if (typeof hierarchy !== 'undefined') {
            geos.walls = [];
            var outerRing = hierarchy.outerRing;
            var windingOrder = PolygonPipeline.computeWindingOrder2D(outerRing);
            if (windingOrder === WindingOrder.CLOCKWISE) {
                outerRing.reverse();
            }

            length = outerRing.length;
            for (i = 0; i < length; i++) {
                subdividedEdge = subdivideLine(outerRing[i], outerRing[(i+1)%length], granularity);
                edgePositions = edgePositions.concat(subdividedEdge);
            }
            edgePositions = edgePositions.concat(edgePositions);
            length = edgePositions.length;
            indices = IndexDatatype.createTypedArray(length/3, length - outerRing.length*6);
            edgeIndex = 0;
            length /= 6;
            for (i = 0 ; i < length; i++) {
                UL = i;
                UR = UL + 1;
                p1 = Cartesian3.fromArray(edgePositions, UL*3, p1);
                p2 = Cartesian3.fromArray(edgePositions, UR*3, p2);
                if (Cartesian3.equalsEpsilon(p1, p2, CesiumMath.EPSILON6)) {
                    continue;
                }
                LL = UL + length;
                LR = LL + 1;
                indices[edgeIndex++] = UL;
                indices[edgeIndex++] = LL;
                indices[edgeIndex++] = UR;
                indices[edgeIndex++] = UR;
                indices[edgeIndex++] = LL;
                indices[edgeIndex++] = LR;
            }

            var wallGeo = new Geometry({
                attributes : {
                    position : new GeometryAttribute({
                        componentDatatype : ComponentDatatype.DOUBLE,
                        componentsPerAttribute : 3,
                        values : edgePositions
                    })
                },
                indices : indices,
                primitiveType : PrimitiveType.TRIANGLES
            });

            geos.walls.push(new GeometryInstance({
                geometry: wallGeo
            }));

            var holes = hierarchy.holes;
            for (i = 0; i < holes.length; i++) {
                edgePositions = [];
                var j;
                var hole = holes[i];
                windingOrder = PolygonPipeline.computeWindingOrder2D(hole);
                if (windingOrder !== WindingOrder.CLOCKWISE) {
                    hole = hole.reverse();
                }
                length = hole.length;
                for (j = 0; j < length; j++) {
                    subdividedEdge = subdivideLine(hole[j], hole[(j+1)%length], granularity);
                    edgePositions = edgePositions.concat(subdividedEdge);
                }
                edgePositions = edgePositions.concat(edgePositions);
                length = edgePositions.length;
                indices = IndexDatatype.createTypedArray(length/3, length - hole.length*6);
                length /= 6;
                edgeIndex = 0;
                for (j = 0 ; j < length; j++) {
                    UL = j;
                    UR = UL + 1;
                    p1 = Cartesian3.fromArray(edgePositions, UL*3, p1);
                    p2 = Cartesian3.fromArray(edgePositions, UR*3, p2);
                    if (Cartesian3.equalsEpsilon(p1, p2, CesiumMath.EPSILON6)) {
                        continue;
                    }
                    LL = UL + length;
                    LR = LL + 1;
                    indices[edgeIndex++] = UL;
                    indices[edgeIndex++] = LL;
                    indices[edgeIndex++] = UR;
                    indices[edgeIndex++] = UR;
                    indices[edgeIndex++] = LL;
                    indices[edgeIndex++] = LR;
                }

                wallGeo = new Geometry({
                    attributes : {
                        position : new GeometryAttribute({
                            componentDatatype : ComponentDatatype.DOUBLE,
                            componentsPerAttribute : 3,
                            values : edgePositions
                        })
                    },
                    indices : indices,
                    primitiveType : PrimitiveType.TRIANGLES
                });
                geos.walls.push(new GeometryInstance({
                    geometry: wallGeo
                }));
            }
        } else {
            length = edgePoints.length;
            for (i = 0; i < length; i++) {
                subdividedEdge = subdivideLine(edgePoints[i], edgePoints[(i+1)%length], granularity);
                edgePositions = edgePositions.concat(subdividedEdge);
            }
            edgePositions = edgePositions.concat(edgePositions);
            length = edgePositions.length;
            indices = IndexDatatype.createTypedArray(length/3, length - edgePoints.length*6);
            length /= 6;
            edgeIndex = 0;
            for (i = 0 ; i < length; i++) {
                UL = i;
                UR = UL + 1;
                p1 = Cartesian3.fromArray(edgePositions, UL*3, p1);
                p2 = Cartesian3.fromArray(edgePositions, UR*3, p2);
                if (Cartesian3.equalsEpsilon(p1, p2, CesiumMath.EPSILON6)) {
                    continue;
                }
                LL = UL + length;
                LR = LL + 1;
                indices[edgeIndex++] = UL;
                indices[edgeIndex++] = LL;
                indices[edgeIndex++] = UR;
                indices[edgeIndex++] = UR;
                indices[edgeIndex++] = LL;
                indices[edgeIndex++] = LR;
            }
            var wallsGeo = new Geometry({
                attributes : {
                    position : new GeometryAttribute({
                        componentDatatype : ComponentDatatype.DOUBLE,
                        componentsPerAttribute : 3,
                        values : edgePositions
                    })
                },
                indices : indices,
                primitiveType : PrimitiveType.TRIANGLES
            });

            geos.walls = new GeometryInstance({
                geometry: wallsGeo
            });
        }
        return geos;
    }

    function createGeometryFromPositions(ellipsoid, positions, boundingSphere, granularity) {
        var cleanedPositions = PolygonPipeline.removeDuplicates(positions);
        if (cleanedPositions.length < 3) {
            throw new DeveloperError('Duplicate positions result in not enough positions to form a polygon.');
        }

        var tangentPlane = EllipsoidTangentPlane.fromPoints(cleanedPositions, ellipsoid);
        var positions2D = tangentPlane.projectPointsOntoPlane(cleanedPositions, createGeometryFromPositionsPositions);

        var originalWindingOrder = PolygonPipeline.computeWindingOrder2D(positions2D);
        if (originalWindingOrder === WindingOrder.CLOCKWISE) {
            positions2D.reverse();
            cleanedPositions.reverse();
        }

        var indices = PolygonPipeline.earClip2D(positions2D);
        return new GeometryInstance({
            geometry : PolygonPipeline.computeSubdivision(cleanedPositions, indices, granularity)
        });
    }

    /**
     * Computes vertices and indices for a polygon on the ellipsoid. The polygon is either defined
     * by an array of Cartesian points, or a polygon hierarchy.
     *
     * @alias PolygonGeometry
     * @constructor
     *
     * @param {Array} [options.positions] An array of positions that defined the corner points of the polygon.
     * @param {Object} [options.polygonHierarchy] A polygon hierarchy that can include holes.
     * @param {Number} [options.height=0.0] The height of the polygon.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.DEFAULT] The vertex attributes to be computed.
     * @param {Number} [options.stRotation=0.0] The rotation of the texture coordiantes, in radians. A positive rotation is counter-clockwise.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Number} [options.granularity=CesiumMath.toRadians(1.0)] The distance, in radians, between each latitude and longitude. Determines the number of positions in the buffer.
     * @param {Number} [options.extrudedHeight] Height of extruded surface
     * @exception {DeveloperError} At least three positions are required.
     * @exception {DeveloperError} positions or polygonHierarchy must be supplied.
     * @exception {DeveloperError} Duplicate positions result in not enough positions to form a polygon.
     *
     * @example
     * // create a polygon from points
     * var geometry = new PolygonGeometry({
     *     positions : ellipsoid.cartographicArrayToCartesianArray([
     *         Cartographic.fromDegrees(-72.0, 40.0),
     *         Cartographic.fromDegrees(-70.0, 35.0),
     *         Cartographic.fromDegrees(-75.0, 30.0),
     *         Cartographic.fromDegrees(-70.0, 30.0),
     *         Cartographic.fromDegrees(-68.0, 40.0)
     *     ])
     * });
     *
     * // create a nested polygon with holes
     * var geometryWithHole = new PolygonGeometry({
     *     polygonHierarchy : {
     *         positions : ellipsoid.cartographicArrayToCartesianArray([
     *             Cartographic.fromDegrees(-109.0, 30.0),
     *             Cartographic.fromDegrees(-95.0, 30.0),
     *             Cartographic.fromDegrees(-95.0, 40.0),
     *             Cartographic.fromDegrees(-109.0, 40.0)
     *         ]),
     *         holes : [{
     *             positions : ellipsoid.cartographicArrayToCartesianArray([
     *                 Cartographic.fromDegrees(-107.0, 31.0),
     *                 Cartographic.fromDegrees(-107.0, 39.0),
     *                 Cartographic.fromDegrees(-97.0, 39.0),
     *                 Cartographic.fromDegrees(-97.0, 31.0)
     *             ]),
     *             holes : [{
     *                 positions : ellipsoid.cartographicArrayToCartesianArray([
     *                     Cartographic.fromDegrees(-105.0, 33.0),
     *                     Cartographic.fromDegrees(-99.0, 33.0),
     *                     Cartographic.fromDegrees(-99.0, 37.0),
     *                     Cartographic.fromDegrees(-105.0, 37.0)
     *                     ]),
     *                 holes : [{
     *                     positions : ellipsoid.cartographicArrayToCartesianArray([
     *                         Cartographic.fromDegrees(-103.0, 34.0),
     *                         Cartographic.fromDegrees(-101.0, 34.0),
     *                         Cartographic.fromDegrees(-101.0, 36.0),
     *                         Cartographic.fromDegrees(-103.0, 36.0)
     *                     ])
     *                 }]
     *              }]
     *         }]
     *     }
     * });
     *
     * //create extruded polygon
     * var geometry = new Cesium.PolygonGeometry({
     *     positions : ellipsoid.cartographicArrayToCartesianArray([
     *         Cesium.Cartographic.fromDegrees(-72.0, 40.0),
     *         Cesium.Cartographic.fromDegrees(-70.0, 35.0),
     *         Cesium.Cartographic.fromDegrees(-75.0, 30.0),
     *         Cesium.Cartographic.fromDegrees(-70.0, 30.0),
     *         Cesium.Cartographic.fromDegrees(-68.0, 40.0)
     *     ]),
     *     extrudedHeight: 300000
     * });
     *
     */
    var PolygonGeometry = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var vertexFormat = defaultValue(options.vertexFormat, VertexFormat.DEFAULT);
        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var granularity = defaultValue(options.granularity, CesiumMath.toRadians(1.0));
        var stRotation = defaultValue(options.stRotation, 0.0);
        var height = defaultValue(options.height, 0.0);
        var extrudedHeight = defaultValue(options.extrudedHeight, height);
        var extrude = (height !== extrudedHeight);
        if (extrude) {
            var h = extrudedHeight;
            extrudedHeight = Math.min(h, height);
            height = Math.max(h, height);
        }

        var positions = options.positions;
        var polygonHierarchy = options.polygonHierarchy;

        var geometries = [];
        var geometry;
        var boundingSphere;
        var i;
        var walls;
        var topAndBottom;
        var outerPositions;
        var boundingSpherePositions;
        var computeAttributes = (vertexFormat.st || vertexFormat.normal || vertexFormat.tangent || vertexFormat.binormal);

        if (typeof positions !== 'undefined') {
            // create from positions
            outerPositions = positions;
            if (extrude) {
                boundingSpherePositions = scaleCartesiansToGeodeticHeight(positions, height, ellipsoid);
                boundingSpherePositions = boundingSpherePositions.concat(scaleCartesiansToGeodeticHeight(positions, extrudedHeight, ellipsoid));
                boundingSphere = BoundingSphere.fromPoints(boundingSpherePositions);
                geometry = createGeometryFromPositionsExtruded(ellipsoid, positions, boundingSphere, granularity);
                if (typeof geometry !== 'undefined') {
                    walls = geometry.walls;
                    topAndBottom = geometry.topAndBottom;
                    walls.geometry = scaleToGeodeticHeightExtruded(walls.geometry, height, extrudedHeight, ellipsoid);
                    topAndBottom.geometry = scaleToGeodeticHeightExtruded(topAndBottom.geometry, height, extrudedHeight, ellipsoid);
                    if (computeAttributes) {
                        walls.geometry = computeWallAttributes(vertexFormat, walls.geometry, outerPositions, ellipsoid, stRotation);
                        topAndBottom.geometry = computeTopBottomAttributes(vertexFormat, topAndBottom.geometry, outerPositions, ellipsoid, stRotation, true, true);
                    }
                    geometries.push(walls, topAndBottom);
                }
            } else {
                boundingSpherePositions = scaleCartesiansToGeodeticHeight(positions, height, ellipsoid);
                boundingSphere = BoundingSphere.fromPoints(boundingSpherePositions);
                geometry = createGeometryFromPositions(ellipsoid, positions, boundingSphere, granularity);
                if (typeof geometry !== 'undefined') {
                    geometry.geometry = PolygonPipeline.scaleToGeodeticHeight(geometry.geometry, height, ellipsoid);

                    if (computeAttributes) {
                        geometry.geometry = computeTopBottomAttributes(vertexFormat, geometry.geometry, outerPositions, ellipsoid, stRotation, true, false);
                    }

                    geometries.push(geometry);
                }
            }
        } else if (typeof polygonHierarchy !== 'undefined') {
            // create from a polygon hierarchy
            // Algorithm adapted from http://www.geometrictools.com/Documentation/TriangulationByEarClipping.pdf
            var polygons = [];
            var queue = new Queue();
            queue.enqueue(polygonHierarchy);
            polygonHierarchy = [];
            while (queue.length !== 0) {
                var outerNode = queue.dequeue();
                var outerRing = outerNode.positions;

                if (outerRing.length < 3) {
                    throw new DeveloperError('At least three positions are required.');
                }

                var numChildren = outerNode.holes ? outerNode.holes.length : 0;
                if (numChildren === 0) {
                    // The outer polygon is a simple polygon with no nested inner polygon.
                    polygonHierarchy.push({
                        outerRing: outerRing,
                        holes: []
                    });
                    polygons.push(outerNode.positions);
                } else {
                    // The outer polygon contains inner polygons
                    var holes = [];
                    for (i = 0; i < numChildren; i++) {
                        var hole = outerNode.holes[i];
                        holes.push(hole.positions);

                        var numGrandchildren = 0;
                        if (typeof hole.holes !== 'undefined') {
                            numGrandchildren = hole.holes.length;
                        }

                        for (var j = 0; j < numGrandchildren; j++) {
                            queue.enqueue(hole.holes[j]);
                        }
                    }
                    polygonHierarchy.push({
                        outerRing: outerRing,
                        holes: holes
                    });
                    var combinedPolygon = PolygonPipeline.eliminateHoles(outerRing, holes);
                    polygons.push(combinedPolygon);
                }
            }

            outerPositions =  polygons[0];

            // The bounding volume is just around the boundary points, so there could be cases for
            // contrived polygons on contrived ellipsoids - very oblate ones - where the bounding
            // volume doesn't cover the polygon.
            if (extrude) {
                boundingSpherePositions = scaleCartesiansToGeodeticHeight(outerPositions, height, ellipsoid);
                boundingSpherePositions = boundingSpherePositions.concat(scaleCartesiansToGeodeticHeight(outerPositions, extrudedHeight, ellipsoid));
                boundingSphere = BoundingSphere.fromPoints(boundingSpherePositions);
            } else {
                boundingSpherePositions = scaleCartesiansToGeodeticHeight(outerPositions, height, ellipsoid);
                boundingSphere = BoundingSphere.fromPoints(boundingSpherePositions);
            }

            for (i = 0; i < polygons.length; i++) {
                if (extrude) {
                    geometry = createGeometryFromPositionsExtruded(ellipsoid, polygons[i], boundingSphere, granularity, polygonHierarchy[i]);
                    if (typeof geometry !== 'undefined') {
                        topAndBottom = geometry.topAndBottom;
                        topAndBottom.geometry = scaleToGeodeticHeightExtruded(topAndBottom.geometry, height, extrudedHeight, ellipsoid);
                        if (computeAttributes) {
                            topAndBottom.geometry = computeTopBottomAttributes(vertexFormat, topAndBottom.geometry, outerPositions, ellipsoid, stRotation, true, true);
                        }
                        geometries.push(topAndBottom);

                        walls = geometry.walls;
                        for (var k = 0; k < walls.length; k++) {
                            var wall = walls[k];
                            wall.geometry = scaleToGeodeticHeightExtruded(wall.geometry, height, extrudedHeight, ellipsoid);
                            if (computeAttributes) {
                                wall.geometry = computeWallAttributes(vertexFormat, wall.geometry, outerPositions, ellipsoid, stRotation);
                            }
                            geometries.push(wall);
                        }
                    }
                } else {
                    geometry = createGeometryFromPositions(ellipsoid, polygons[i], boundingSphere, granularity);
                    if (typeof geometry !== 'undefined') {
                        geometry.geometry = PolygonPipeline.scaleToGeodeticHeight(geometry.geometry, height, ellipsoid);
                        if (computeAttributes) {
                            geometry.geometry = computeTopBottomAttributes(vertexFormat, geometry.geometry, outerPositions, ellipsoid, stRotation, true, false);
                        }
                        geometries.push(geometry);
                    }
                }
            }
        } else {
            throw new DeveloperError('positions or hierarchy must be supplied.');
        }

        var attributes = {};

        geometry = GeometryPipeline.combine(geometries);

        // Checking bounding sphere with plane for quick reject
        var minX = boundingSphere.center.x - boundingSphere.radius;
        if ((minX < 0) && (BoundingSphere.intersect(boundingSphere, Cartesian4.UNIT_Y) === Intersect.INTERSECTING)) {
            geometry = GeometryPipeline.wrapLongitude(geometry);
        }

        if (vertexFormat.position) {
            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : new Float64Array(geometry.attributes.position.values)
            });
        }

        if (vertexFormat.st) {
            attributes.st = geometry.attributes.st;
        }

        if (vertexFormat.normal) {
            attributes.normal = geometry.attributes.normal;
        }

        if (vertexFormat.tangent) {
            attributes.tangent = geometry.attributes.tangent;
        }

        if (vertexFormat.binormal) {
            attributes.binormal = geometry.attributes.binormal;
        }

        /**
         * An object containing {@link GeometryAttribute} properties named after each of the
         * <code>true</code> values of the {@link VertexFormat} option.
         *
         * @type Object
         *
         * @see Geometry#attributes
         */
        this.attributes = attributes;

        /**
         * Index data that - along with {@link Geometry#primitiveType} - determines the primitives in the geometry.
         *
         * @type Array
         */
        this.indices = geometry.indices;

        /**
         * The type of primitives in the geometry.  For this geometry, it is {@link PrimitiveType.TRIANGLES}.
         *
         * @type PrimitiveType
         */
        this.primitiveType = geometry.primitiveType;

        /**
         * A tight-fitting bounding sphere that encloses the vertices of the geometry.
         *
         * @type BoundingSphere
         */
        this.boundingSphere = boundingSphere;
    };

    return PolygonGeometry;
});

