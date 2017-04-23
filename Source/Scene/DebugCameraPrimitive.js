/*global define*/
define([
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Color',
        '../Core/ColorGeometryInstanceAttribute',
        '../Core/ComponentDatatype',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/DeveloperError',
        '../Core/GeometryAttribute',
        '../Core/GeometryAttributes',
        '../Core/GeometryInstance',
        '../Core/Matrix4',
        '../Core/PrimitiveType',
        './PerInstanceColorAppearance',
        './Primitive'
    ], function(
        BoundingSphere,
        Cartesian3,
        Cartesian4,
        Color,
        ColorGeometryInstanceAttribute,
        ComponentDatatype,
        defaultValue,
        defined,
        destroyObject,
        DeveloperError,
        GeometryAttribute,
        GeometryAttributes,
        GeometryInstance,
        Matrix4,
        PrimitiveType,
        PerInstanceColorAppearance,
        Primitive) {
    'use strict';

    /**
     * Draws the outline of the camera's view frustum.
     *
     * @alias DebugCameraPrimitive
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Camera} options.camera The camera.
     * @param {Color} [options.color=Color.CYAN] The color of the debug outline.
     * @param {Boolean} [options.updateOnChange=true] Whether the primitive updates when the underlying camera changes.
     * @param {Boolean} [options.show=true] Determines if this primitive will be shown.
     * @param {Object} [options.id] A user-defined object to return when the instance is picked with {@link Scene#pick}.
     *
     * @example
     * primitives.add(new Cesium.DebugCameraPrimitive({
     *   camera : camera,
     *   color : Cesium.Color.YELLOW
     * }));
     */
    function DebugCameraPrimitive(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.camera)) {
            throw new DeveloperError('options.camera is required.');
        }
        //>>includeEnd('debug');

        this._camera = options.camera;
        this._color = defaultValue(options.color, Color.CYAN);
        this._updateOnChange = defaultValue(options.updateOnChange, true);

        /**
         * Determines if this primitive will be shown.
         *
         * @type Boolean
         * @default true
         */
        this.show = defaultValue(options.show, true);

        /**
         * User-defined object returned when the primitive is picked.
         *
         * @type {Object}
         * @default undefined
         *
         * @see Scene#pick
         */
        this.id = options.id;
        this._id = undefined;

        this._outlinePrimitive = undefined;
        this._planesPrimitive = undefined;
    }

    var frustumCornersNDC = new Array(4);
    frustumCornersNDC[0] = new Cartesian4(-1.0, -1.0, 1.0, 1.0);
    frustumCornersNDC[1] = new Cartesian4(1.0, -1.0, 1.0, 1.0);
    frustumCornersNDC[2] = new Cartesian4(1.0, 1.0, 1.0, 1.0);
    frustumCornersNDC[3] = new Cartesian4(-1.0, 1.0, 1.0, 1.0);

    var scratchMatrix = new Matrix4();
    var scratchFrustumCorners = new Array(4);
    for (var i = 0; i < 4; ++i) {
        scratchFrustumCorners[i] = new Cartesian4();
    }

    var scratchColor = new Color();
    var scratchSplits = [1.0, 100000.0];
    /**
     * @private
     */
    DebugCameraPrimitive.prototype.update = function(frameState) {
        if (!this.show) {
            return;
        }

        if (this._updateOnChange) {
            // Recreate the primitive every frame
            this._outlinePrimitive = this._outlinePrimitive && this._outlinePrimitive.destroy();
            this._planesPrimitive = this._planesPrimitive && this._planesPrimitive.destroy();
        }

        if (!defined(this._outlinePrimitive)) {
            var camera = this._camera;
            var frustum = camera.frustum;

            var frustumSplits = frameState.frustumSplits;
            var numFrustums = frustumSplits.length - 1;
            if (numFrustums <= 0) {
                frustumSplits = scratchSplits; // Use near and far planes if no splits created
                frustumSplits[0] = this._camera.frustum.near;
                frustumSplits[1] = this._camera.frustum.far;
                numFrustums = 1;
            }

            var view = this._camera.viewMatrix;
            var inverseView;
            var inverseViewProjection;
            if (defined(camera.frustum.fovy)) {
                var projection = this._camera.frustum.projectionMatrix;
                var viewProjection = Matrix4.multiply(projection, view, scratchMatrix);
                inverseViewProjection = Matrix4.inverse(viewProjection, scratchMatrix);
            } else {
                inverseView = Matrix4.inverseTransformation(view, scratchMatrix);
            }


            var positions = new Float64Array(3 * 4 * (numFrustums + 1));
            var f;
            for (f = 0; f < numFrustums + 1; ++f) {
                for (var i = 0; i < 4; ++i) {
                    var corner = Cartesian4.clone(frustumCornersNDC[i], scratchFrustumCorners[i]);

                    var worldCoords;
                    if (!defined(inverseViewProjection)) {
                        if (defined(frustum._offCenterFrustum)) {
                            frustum = frustum._offCenterFrustum;
                        }

                        var near;
                        var far;
                        if (f === numFrustums) {
                            near = frustumSplits[f - 1];
                            far = frustumSplits[f];
                        } else {
                            near = frustumSplits[f];
                            far = frustumSplits[f + 1];
                        }
                        corner.x = (corner.x * (frustum.right - frustum.left) + frustum.left + frustum.right) * 0.5;
                        corner.y = (corner.y * (frustum.top - frustum.bottom) + frustum.bottom + frustum.top) * 0.5;
                        corner.z = (corner.z * (near - far) - near - far) * 0.5;
                        corner.w = 1.0;

                        worldCoords = Matrix4.multiplyByVector(inverseView, corner, corner);
                    } else {
                        corner = Matrix4.multiplyByVector(inverseViewProjection, corner, corner);

                        // Reverse perspective divide
                        var w = 1.0 / corner.w;
                        Cartesian3.multiplyByScalar(corner, w, corner);

                        Cartesian3.subtract(corner, this._camera.positionWC, corner);
                        Cartesian3.normalize(corner, corner);

                        var fac = Cartesian3.dot(this._camera.directionWC, corner);
                        Cartesian3.multiplyByScalar(corner, frustumSplits[f] / fac, corner);
                        Cartesian3.add(corner, this._camera.positionWC, corner);
                    }

                    positions[12 * f + i * 3] = corner.x;
                    positions[12 * f + i * 3 + 1] = corner.y;
                    positions[12 * f + i * 3 + 2] = corner.z;
                }
            }

            var boundingSphere = new BoundingSphere.fromVertices(positions);

            var attributes = new GeometryAttributes();
            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : positions
            });

            var offset, index;

            // Create the outline primitive
            var outlineIndices = new Uint16Array(8 * (2 * numFrustums + 1));
            // Build the far planes
            for (f = 0; f < numFrustums + 1; ++f) {
                offset = f * 8;
                index = f * 4;

                outlineIndices[offset] = index;
                outlineIndices[offset + 1] = index + 1;
                outlineIndices[offset + 2] = index + 1;
                outlineIndices[offset + 3] = index + 2;
                outlineIndices[offset + 4] = index + 2;
                outlineIndices[offset + 5] = index + 3;
                outlineIndices[offset + 6] = index + 3;
                outlineIndices[offset + 7] = index;
            }
            // Build the sides of the frustums
            for (f = 0; f < numFrustums; ++f) {
                offset = (numFrustums + 1 + f) * 8;
                index = f * 4;

                outlineIndices[offset] = index;
                outlineIndices[offset + 1] = index + 4;
                outlineIndices[offset + 2] = index + 1;
                outlineIndices[offset + 3] = index + 5;
                outlineIndices[offset + 4] = index + 2;
                outlineIndices[offset + 5] = index + 6;
                outlineIndices[offset + 6] = index + 3;
                outlineIndices[offset + 7] = index + 7;
            }

            this._outlinePrimitive = new Primitive({
                geometryInstances : new GeometryInstance({
                    geometry : {
                        attributes : attributes,
                        indices : outlineIndices,
                        primitiveType : PrimitiveType.LINES,
                        boundingSphere : boundingSphere
                    },
                    attributes : {
                        color : ColorGeometryInstanceAttribute.fromColor(this._color)
                    },
                    id : this.id,
                    pickPrimitive : this
                }),
                appearance : new PerInstanceColorAppearance({
                    translucent : false,
                    flat : true
                }),
                asynchronous : false
            });

            // Create the planes primitive
            var planesIndices = new Uint16Array(6 * (5 * numFrustums + 1));
            // Build the far planes
            for (f = 0; f < numFrustums + 1; ++f) {
                offset = f * 6;
                index = f * 4;

                planesIndices[offset] = index;
                planesIndices[offset + 1] = index + 1;
                planesIndices[offset + 2] = index + 2;
                planesIndices[offset + 3] = index;
                planesIndices[offset + 4] = index + 2;
                planesIndices[offset + 5] = index + 3;
            }
            // Build the sides of the frustums
            for (f = 0; f < numFrustums; ++f) {
                offset = (numFrustums + 1 + 4 * f) * 6;
                index = f * 4;

                planesIndices[offset] = index + 4;
                planesIndices[offset + 1] = index;
                planesIndices[offset + 2] = index + 3;
                planesIndices[offset + 3] = index + 4;
                planesIndices[offset + 4] = index + 3;
                planesIndices[offset + 5] = index + 7;

                planesIndices[offset + 6] = index + 4;
                planesIndices[offset + 7] = index;
                planesIndices[offset + 8] = index + 1;
                planesIndices[offset + 9] = index + 4;
                planesIndices[offset + 10] = index + 1;
                planesIndices[offset + 11] = index + 5;

                planesIndices[offset + 12] = index + 7;
                planesIndices[offset + 13] = index + 3;
                planesIndices[offset + 14] = index + 2;
                planesIndices[offset + 15] = index + 7;
                planesIndices[offset + 16] = index + 2;
                planesIndices[offset + 17] = index + 6;

                planesIndices[offset + 18] = index + 6;
                planesIndices[offset + 19] = index + 2;
                planesIndices[offset + 20] = index + 1;
                planesIndices[offset + 21] = index + 6;
                planesIndices[offset + 22] = index + 1;
                planesIndices[offset + 23] = index + 5;
            }

            this._planesPrimitive = new Primitive({
                geometryInstances : new GeometryInstance({
                    geometry : {
                        attributes : attributes,
                        indices : planesIndices,
                        primitiveType : PrimitiveType.TRIANGLES,
                        boundingSphere : boundingSphere
                    },
                    attributes : {
                        color : ColorGeometryInstanceAttribute.fromColor(Color.fromAlpha(this._color, 0.1, scratchColor))
                    },
                    id : this.id,
                    pickPrimitive : this
                }),
                appearance : new PerInstanceColorAppearance({
                    translucent : true,
                    flat : true
                }),
                asynchronous : false
            });
        }

        this._outlinePrimitive.update(frameState);
        this._planesPrimitive.update(frameState);
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <p>
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     * </p>
     *
     * @returns {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see DebugCameraPrimitive#destroy
     */
    DebugCameraPrimitive.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <p>
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     * </p>
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @example
     * p = p && p.destroy();
     *
     * @see DebugCameraPrimitive#isDestroyed
     */
    DebugCameraPrimitive.prototype.destroy = function() {
        this._outlinePrimitive = this._outlinePrimitive && this._outlinePrimitive.destroy();
        this._planesPrimitive = this._planesPrimitive && this._planesPrimitive.destroy();
        return destroyObject(this);
    };

    return DebugCameraPrimitive;
});
