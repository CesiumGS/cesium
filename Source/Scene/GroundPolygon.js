/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/Ellipsoid',
        '../Core/EllipsoidTangentPlane',
        '../Core/EncodedCartesian3',
        '../Core/IndexDatatype',
        '../Core/Math',
        '../Core/Matrix4',
        '../Core/PolygonGeometryLibrary',
        '../Core/PolygonPipeline',
        '../Core/PrimitiveType',
        '../Core/SphericalExtent',
        '../Core/WindingOrder',
        '../Renderer/BufferUsage',
        '../Renderer/DrawCommand',
        '../Renderer/ShaderSource',
        '../Shaders/ShadowVolumeFS',
        '../Shaders/ShadowVolumeVS',
        './BlendingState',
        './CullFace',
        './DepthFunction',
        './Pass',
        './StencilFunction',
        './StencilOperation'
    ], function(
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Cartesian4,
        ComponentDatatype,
        defaultValue,
        defined,
        Ellipsoid,
        EllipsoidTangentPlane,
        EncodedCartesian3,
        IndexDatatype,
        CesiumMath,
        Matrix4,
        PolygonGeometryLibrary,
        PolygonPipeline,
        PrimitiveType,
        SphericalExtent,
        WindingOrder,
        BufferUsage,
        DrawCommand,
        ShaderSource,
        ShadowVolumeFS,
        ShadowVolumeVS,
        BlendingState,
        CullFace,
        DepthFunction,
        Pass,
        StencilFunction,
        StencilOperation) {
    "use strict";

    var GroundPolygon = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);
        var polygonHierarchy = options.polygonHierarchy;

        this._ellipsoid = ellipsoid;
        this._granularity = granularity;
        this._polygonHierarchy = polygonHierarchy;

        this._boundingSphere = undefined;

        this._northPlane = new Cartesian4();
        this._southPlane = new Cartesian4();
        this._eastPlane = new Cartesian4();
        this._westPlane = new Cartesian4();

        this._sinCosDeltas = new Cartesian4();
        this._centerAzimuthAndInverseDeltas = new Cartesian4();

        this._centerAzimuthFromWest = 0.0;

        this._va = undefined;
        this._sp = undefined;
        this._rs = undefined;

        this.debugVolume = defaultValue(options.debugVolume, false);
        this._debugVolumeCommand = undefined;

        this.debugPauseCamera = false;
        this._debugPauseCamera = this.debugPauseCamera;

        this._debugCameraPosition = new Cartesian3();
        this._debugCameraDirection = new Cartesian3();

        this._cameraPosition = undefined;
        this._cameraDirection = undefined;

        var that = this;
        this._uniformMap = {
            centralBodyMinimumAltitude : function() {
                return -8500.0;
            },
            LODNegativeToleranceOverDistance : function() {
                return -0.01;
            },
            northPlane : function() {
                return that._northPlane;
            },
            southPlane : function() {
                return that._southPlane;
            },
            eastPlane : function() {
                return that._eastPlane;
            },
            westPlane : function() {
                return that._westPlane;
            },
            sinCosDeltas : function () {
                return that._sinCosDeltas;
            },
            centerAzimuthAndInverseDeltas : function () {
                return that._centerAzimuthAndInverseDeltas;
            },
            centerAzimuthFromWest : function () {
                return that._centerAzimuthFromWest;
            },
            u_cameraPosition : function() {
                return that._cameraPosition;
            },
            u_cameraDirection : function() {
                return that._cameraDirection;
            }
        };

        this._stencilPassCommand = undefined;
        this._colorPassCommand = undefined;
    };

    var attributeLocations = {
        positionHigh : 0,
        positionLow : 1,
        normal : 2
    };

    function getSurfaceDelta(ellipsoid, granularity) {
        var refDistance = ellipsoid.maximumRadius;
        return refDistance - (refDistance * Math.cos(granularity / 2.0));
    }

    var scratchPosition = new Cartesian3();
    var scratchNormal = new Cartesian3();
    var scratchDeltaNormal = new Cartesian3();

    // TODO: More than one level of the polygon hierarchy
    function createShadowVolume(polygon, context) {
        var polygonHierarchy = polygon._polygonHierarchy;
        var ellipsoid = polygon._ellipsoid;
        var granularity = polygon._granularity;

        var results = PolygonGeometryLibrary.polygonsFromHierarchy(polygonHierarchy);
        var positions = results.polygons[0];
        var hierarchy = results.hierarchy[0];

        var bottomCap = PolygonGeometryLibrary.createGeometryFromPositions(ellipsoid, positions, granularity, false);
        var bottomPositions = bottomCap.attributes.position.values;
        var numBottomCapVertices = bottomPositions.length / 3;
        var numCapVertices = numBottomCapVertices + numBottomCapVertices;
        var bottomIndices = bottomCap.indices;
        var numBottomIndices = bottomIndices.length;
        var numCapIndices = numBottomIndices + numBottomIndices;

        var outerRing = hierarchy.outerRing;
        var tangentPlane = EllipsoidTangentPlane.fromPoints(outerRing, ellipsoid);
        var positions2D = tangentPlane.projectPointsOntoPlane(outerRing);

        var windingOrder = PolygonPipeline.computeWindingOrder2D(positions2D);
        if (windingOrder === WindingOrder.CLOCKWISE) {
            outerRing.reverse();
        }

        var wall = PolygonGeometryLibrary.computeWallGeometry(outerRing, ellipsoid, granularity, false);
        var walls = [wall];
        var numWallVertices = wall.attributes.position.values.length / 3;
        var numWallIndices = wall.indices.length;

        var holes = hierarchy.holes;
        var i;
        var j;

        for (i = 0; i < holes.length; i++) {
            var hole = holes[i];

            tangentPlane = EllipsoidTangentPlane.fromPoints(hole, ellipsoid);
            positions2D = tangentPlane.projectPointsOntoPlane(hole);

            windingOrder = PolygonPipeline.computeWindingOrder2D(positions2D);
            if (windingOrder === WindingOrder.COUNTER_CLOCKWISE) {
                hole.reverse();
            }

            walls.push(PolygonGeometryLibrary.computeWallGeometry(hole, ellipsoid, granularity, false));
            numWallVertices += wall.attributes.position.values.length / 3;
            numWallIndices += wall.indices.length;
            walls.push(wall);
        }

        var maxAlt = 8500.0; // TODO: get max alt of terrain
        var surfaceDelta = getSurfaceDelta(ellipsoid, granularity);
        var upDelta = maxAlt + surfaceDelta;

        var numVertices = numCapVertices + numWallVertices;

        var vbPositions = new Float32Array(numVertices * 3 * 2);
        var vbNormals = new Float32Array(numVertices * 3);

        var position;
        var normal;
        var topPosition;

        var index = 0;
        var normalIndex = 0;

        for (i = 0; i < numBottomCapVertices * 3; i += 3) {
            position = Cartesian3.unpack(bottomPositions, i, scratchPosition);
            ellipsoid.scaleToGeodeticSurface(position, position);
            normal = ellipsoid.geodeticSurfaceNormal(position, scratchNormal);
            Cartesian3.multiplyByScalar(normal, upDelta, normal);

            EncodedCartesian3.writeElements(position, vbPositions, index);
            EncodedCartesian3.writeElements(position, vbPositions, index + 6);
            index += 12;

            Cartesian3.pack(Cartesian3.ZERO, vbNormals, normalIndex);
            Cartesian3.pack(normal, vbNormals, normalIndex + 3);
            normalIndex += 6;
        }

        var numWalls = walls.length;
        var wallPositions;
        var wallLength;

        for (i = 0; i < numWalls; ++i) {
            wall = walls[i];
            wallPositions = wall.attributes.position.values;
            wallLength = wallPositions.length / 2;

            for (j = 0; j < wallLength; j += 3) {
                position = Cartesian3.unpack(wallPositions, j, scratchPosition);
                ellipsoid.scaleToGeodeticSurface(position, position);
                normal = ellipsoid.geodeticSurfaceNormal(position, scratchNormal);
                Cartesian3.multiplyByScalar(normal, upDelta, normal);

                EncodedCartesian3.writeElements(position, vbPositions, index);
                EncodedCartesian3.writeElements(position, vbPositions, index + wallLength * 2);
                index += 6;

                Cartesian3.pack(normal, vbNormals, normalIndex);
                Cartesian3.pack(Cartesian3.ZERO, vbNormals, normalIndex + wallLength);
                normalIndex += 3;
            }

            index += wallLength * 2;
            normalIndex += wallLength;
        }

        var numIndices = numCapIndices + numWallIndices;
        var ibIndices = IndexDatatype.createTypedArray(numVertices, numIndices);

        var i0;
        var i1;
        var i2;

        index = 0;
        for (i = 0; i < numBottomIndices; i += 3) {
            i0 = bottomIndices[i] * 2;
            i1 = bottomIndices[i + 1] * 2;
            i2 = bottomIndices[i + 2] * 2;

            ibIndices[index++] = i2;
            ibIndices[index++] = i1;
            ibIndices[index++] = i0;
        }

        for (i = 0; i < numBottomIndices; i += 3) {
            i0 = bottomIndices[i] * 2;
            i1 = bottomIndices[i + 1] * 2;
            i2 = bottomIndices[i + 2] * 2;

            ibIndices[index++] = i0 + 1;
            ibIndices[index++] = i1 + 1;
            ibIndices[index++] = i2 + 1;
        }

        var offset = numCapVertices;
        for (i = 0; i < numWalls; ++i) {
            wall = walls[i];
            var wallIndices = wall.indices;
            wallLength = wallIndices.length;

            for (j = 0; j < wallLength; ++j) {
                ibIndices[index++] = wallIndices[j] + offset;
            }
            offset += wall.attributes.position.values.length / 3;
        }

        var positionBuffer = context.createVertexBuffer(vbPositions, BufferUsage.STATIC_DRAW);
        var normalBuffer = context.createVertexBuffer(vbNormals, BufferUsage.STATIC_DRAW);

        var indexDatatype = (ibIndices.BYTES_PER_ELEMENT === 2) ?  IndexDatatype.UNSIGNED_SHORT : IndexDatatype.UNSIGNED_INT;
        var indexBuffer = context.createIndexBuffer(ibIndices, BufferUsage.STATIC_DRAW, indexDatatype);

        var attributes = [{
            index                  : attributeLocations.positionHigh,
            vertexBuffer           : positionBuffer,
            componentsPerAttribute : 3,
            componentDatatype      : ComponentDatatype.FLOAT,
            offsetInBytes          : 0,
            strideInBytes          : ComponentDatatype.getSizeInBytes(ComponentDatatype.FLOAT) * 3 * 2
        }, {
            index                  : attributeLocations.positionLow,
            vertexBuffer           : positionBuffer,
            componentsPerAttribute : 3,
            componentDatatype      : ComponentDatatype.FLOAT,
            offsetInBytes          : ComponentDatatype.getSizeInBytes(ComponentDatatype.FLOAT) * 3,
            strideInBytes          : ComponentDatatype.getSizeInBytes(ComponentDatatype.FLOAT) * 3 * 2
        }, {
            index                  : attributeLocations.normal,
            vertexBuffer           : normalBuffer,
            componentsPerAttribute : 3,
            componentDatatype      : ComponentDatatype.FLOAT
        }];

        polygon._va = context.createVertexArray(attributes, indexBuffer);

        polygon._bottomCapOffset = 0;
        polygon._bottomCapCount = numBottomIndices;
        polygon._topCapOffset = numBottomIndices;
        polygon._topCapCount = numBottomIndices;
        polygon._wallOffset = numCapIndices;
        polygon._wallCount = numWallIndices;

        polygon._boundingSphere = BoundingSphere.fromPoints(outerRing);

        // TODO: Correct bounding sphere
        polygon._boundingSphere.radius = upDelta;
    }

    function latitudePlane(north, theta, xy, z, center, plane) {
        var normal = scratchNormal;
        if (xy !== 0.0)
        {
            var tempVec0 = Cartesian3.fromElements(Math.cos(theta)* xy, Math.sin(theta) * xy, z);
            var tempVec1 = Cartesian3.fromElements(tempVec0.y, -tempVec0.x, 0.0);
            if (north)
            {
                Cartesian3.cross(tempVec0, tempVec1, normal);
            }
            else
            {
                Cartesian3.cross(tempVec1, tempVec0, normal);
            }
        }
        else
        {
            normal.x = center.x;
            normal.y = center.y;
            normal.z = 0.0;
        }
        Cartesian3.normalize(normal, normal);
        plane.x = normal.x;
        plane.y = normal.y;
        plane.z = normal.z;
        plane.w = Cartesian3.dot(normal, center);
    }

    var scratchPlane = new Cartesian4();
    var scratchPlaneRotated = new Cartesian4();

    function computeTextureCoordinates(polygon) {
        var polygonHierarchy = polygon._polygonHierarchy;
        var outerRing = polygonHierarchy.positions;

        var center = polygon._boundingSphere.center;

        var sphericalExtent = SphericalExtent.fromPositions(outerRing);
        var minimumLatitude = sphericalExtent.minimumLatitude;
        var minimumLongitude = sphericalExtent.minimumLongitude;
        var latitudeExtent = sphericalExtent.latitudeExtent;
        var longitudeExtent = sphericalExtent.longitudeExtent;

        //
        // West plane
        //
        var westPlane = polygon._westPlane;
        westPlane.x = -Math.sin(minimumLongitude);
        westPlane.y = Math.cos(minimumLongitude);
        westPlane.z = 0.0;
        westPlane.w = (westPlane.x * center.x) + (westPlane.y * center.y) + (westPlane.z * center.z);

        //
        // East plane
        //
        var eastPlane = polygon._eastPlane;
        var tempDouble = minimumLongitude + longitudeExtent;
        eastPlane.x = Math.sin(tempDouble);
        eastPlane.y = -Math.cos(tempDouble);
        eastPlane.z = 0.0;
        eastPlane.w = (eastPlane.x * center.x) + (eastPlane.y * center.y) + (eastPlane.z * center.z);

        //
        // Sin and cos lon/lat deltas
        //
        var sinCosDeltas = polygon._sinCosDeltas;
        sinCosDeltas.x = Math.sin(longitudeExtent);
        sinCosDeltas.y = Math.cos(longitudeExtent);
        sinCosDeltas.z = Math.sin(latitudeExtent);
        sinCosDeltas.w = Math.cos(latitudeExtent);

        //
        // Center azimuth
        //
        var centerAzimuth = Cartesian2.fromElements(center.x, center.y);
        Cartesian2.normalize(centerAzimuth, centerAzimuth);
        var centerAzimuthAndInverseDeltas = polygon._centerAzimuthAndInverseDeltas;
        centerAzimuthAndInverseDeltas.x = centerAzimuth.x;
        centerAzimuthAndInverseDeltas.y = centerAzimuth.y;

        //
        // Inverse deltas
        //
        /*
        if (volue is medium or small)
        {
            //
            // When both extents are sufficiently small, the shader approximates arctan and
            // tan to be the same; due to differences, the extents must be increased slightly
            //
            centerAzimuthAndInverseDeltas.z = 1.0 / Math.tan(longitudeExtent);
            centerAzimuthAndInverseDeltas.w = 1.0 / Math.tan(latitudeExtent);
            var azimuthXY = Cartesian2.fromElements(centerAzimuthAndInverseDeltas.x, centerAzimuthAndInverseDeltas.y);
            Cartesian2.normalize(azimuthXY, azimuthXY);
            var westXY = Cartesian2.fromElements(westPlane.y, -westPlane.x);
            Cartesian2.normalize(westXY, westXY);
            polygon._centerAzimuthFromWest = Math.acos(Cartesian2.dot(azimuthXY, westXY));
        }
        else
        {
        */
            centerAzimuthAndInverseDeltas.z = 1.0 / longitudeExtent;
            centerAzimuthAndInverseDeltas.w = 1.0 / latitudeExtent;
            polygon._centerAzimuthFromWest = 0.0;
        //}

        //
        // North/South plane - for small volumes the north and south planes are calculated
        // once. They are approximations that improve frame rate at the slight cost
        // of visual quality.  For larger volumes, the pixel shader calculates the
        // planes on the fly using data calculated below.  This is slower but is
        // necessary to preserve visual quality.
        //
        // North plane
        //
        var northPlane = polygon._northPlane;
        var centerAzimuthAngle = Math.atan2(centerAzimuth.y, centerAzimuth.x);
        var z = Math.sin(minimumLatitude + latitudeExtent);
        var xy = 1.0 - z * z;
        xy = (xy < 0.0) ? 0.0 : Math.sqrt(xy);

        var plane = scratchPlane;
        var planeRotated180Degs = scratchPlaneRotated;
        latitudePlane(true, centerAzimuthAngle, xy, z, center, plane);

        /*
        if (volume is small)
        {
            northPlane.x = plane.x;
            northPlane.y = plane.y;
            northPlane.z = plane.z;
            northPlane.w = (northPlane.x * center.x) + (northPlane.y * center.y) + (northPlane.z * center.z);
        }
        else
        {
        */
            latitudePlane(true, centerAzimuthAngle + Math.PI, xy, z, center, planeRotated180Degs);
            xy = 1.0 - plane.z * plane.z;
            xy = (xy > 0.0) ? Math.sqrt(xy) : 0.0;
            if (minimumLatitude + latitudeExtent < 0.0)
            {
                xy = -xy;
            }
            northPlane.x = plane.z;
            northPlane.y = xy;
            northPlane.z = planeRotated180Degs.w;
            northPlane.w = plane.w - planeRotated180Degs.w;
        //}

        //
        // South plane
        //
        var southPlane = polygon._southPlane;
        z = Math.sin(minimumLatitude);
        xy = 1.0 - z * z;
        xy = (xy < 0.0) ? 0.0 : Math.sqrt(xy);
        latitudePlane(false, centerAzimuthAngle, xy, z, center, plane);
        /*
        if (volume is small)
        {
            southPlane.x = plane.x;
            southPlane.y = plane.y;
            southPlane.z = plane.z;
            southPlane.w = (southPlane.x * center.x) + (southPlane.y * center.y) + (southPlane.z * center.z);
        }
        else
        {
        */
            latitudePlane(false, centerAzimuthAngle + Math.PI, xy, z, center, planeRotated180Degs);
            xy = 1.0 - plane.z * plane.z;
            xy = (xy > 0.0) ? Math.sqrt(xy) : 0.0;
            if (minimumLatitude > 0.0)
            {
                xy = -xy;
            }
            southPlane.x = plane.z;
            southPlane.y = xy;
            southPlane.z = planeRotated180Degs.w;
            southPlane.w = plane.w - planeRotated180Degs.w;
        //}
    }

    GroundPolygon.prototype.update = function(context, frameState, commandList) {
        // TODO: determine if supported
        if (!defined(context.uniformState.globeDepthTexture)) {
            return;
        }

        if (!defined(this._va)) {
            createShadowVolume(this, context);
            computeTextureCoordinates(this);
        }

        if (!defined(this._sp)) {
            this._sp = context.createShaderProgram(ShadowVolumeVS, ShadowVolumeFS, attributeLocations);
        }

        if (!defined(this._stencilPassCommand)) {
            var stencilPassRenderState = context.createRenderState({
                colorMask : {
                    red : false,
                    green : false,
                    blue : false,
                    alpha : false
                },
                stencilTest : {
                    enabled : true,
                    frontFunction : StencilFunction.ALWAYS,
                    frontOperation : {
                        fail : StencilOperation.KEEP,
                        zFail : StencilOperation.KEEP,
                        zPass : StencilOperation.INCREMENT_WRAP
                    },
                    backFunction : StencilFunction.ALWAYS,
                    backOperation : {
                        fail : StencilOperation.KEEP,
                        zFail : StencilOperation.KEEP,
                        zPass : StencilOperation.DECREMENT_WRAP
                    },
                    reference : 0,
                    mask : ~0
                },
                depthTest : {
                    enabled : true
                },
                depthMask : false
            });

            this._stencilPassCommand = new DrawCommand({
                primitiveType : PrimitiveType.TRIANGLES,
                vertexArray : this._va,
                renderState : stencilPassRenderState,
                shaderProgram : this._sp,
                uniformMap : this._uniformMap,
                boundingVolume : this._boundingSphere,
                owner : this,
                modelMatrix : Matrix4.IDENTITY,
                pass : Pass.OPAQUE
            });

            var colorRenderState = context.createRenderState({
                stencilTest : {
                    enabled : true,
                    frontFunction : StencilFunction.NOT_EQUAL,
                    frontOperation : {
                        fail : StencilOperation.KEEP,
                        zFail : StencilOperation.KEEP,
                        zPass : StencilOperation.DECREMENT
                    },
                    backFunction : StencilFunction.NOT_EQUAL,
                    backOperation : {
                        fail : StencilOperation.KEEP,
                        zFail : StencilOperation.KEEP,
                        zPass : StencilOperation.DECREMENT
                    },
                    reference : 0,
                    mask : ~0
                },
                cull : {
                    enabled : true,
                    face : CullFace.BACK
                },
                depthTest : {
                    enabled : true
                },
                depthMask : false,
                blending : BlendingState.ALPHA_BLEND
            });

            this._colorPassCommand = new DrawCommand({
                primitiveType : PrimitiveType.TRIANGLES,
                vertexArray : this._va,
                renderState : colorRenderState,
                shaderProgram : this._sp,
                uniformMap : this._uniformMap,
                boundingVolume : this._boundingSphere,
                owner : this,
                modelMatrix : Matrix4.IDENTITY,
                pass : Pass.OPAQUE
            });
        }

        if (this.debugVolume && !defined(this._debugVolumeCommand)) {
            var pauseRS = context.createRenderState({
                cull : {
                    enabled : false
                },
                depthTest : {
                    enabled : true
                },
                depthMask : false,
                blending : BlendingState.ALPHA_BLEND
            });

            var pauseVS = new ShaderSource({
                sources : [ShadowVolumeVS],
                defined : ['DEBUG_PAUSE']
            });
            var pauseFS = new ShaderSource({
                sources : [ShadowVolumeFS]
            });
            var sp = context.createShaderProgram(pauseVS, pauseFS, attributeLocations);

            this._debugVolumeCommand = new DrawCommand({
                primitiveType : PrimitiveType.TRIANGLES,
                vertexArray : this._va,
                renderState : pauseRS,
                shaderProgram : sp,
                uniformMap : this._uniformMap,
                boundingVolume : this._boundingSphere,
                owner : this,
                modelMatrix : Matrix4.IDENTITY,
                pass : Pass.OPAQUE
            });
        }

        var camera = frameState.camera;

        if (this.debugPauseCamera !== this._debugPauseCamera) {
            if (this.debugPauseCamera) {
                Cartesian3.clone(camera.position, this._debugCameraPosition);
                Cartesian3.clone(camera.direction, this._debugCameraDirection);
            }
            this._debugPauseCamera = this.debugPauseCamera;
        }

        if (this.debugPauseCamera) {
            this._cameraPosition = this._debugCameraPosition;
            this._cameraDirection = this._debugCameraDirection;
        } else {
            this._cameraPosition = camera.position;
            this._cameraDirection = camera.direction;
        }

        var pass = frameState.passes;
        if (pass.render) {
            if (this.debugVolume) {
                commandList.push(this._debugVolumeCommand);
            } else {
                commandList.push(this._stencilPassCommand, this._colorPassCommand);
            }
        }
    };

    return GroundPolygon;
});
