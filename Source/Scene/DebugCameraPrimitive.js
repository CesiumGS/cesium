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
        '../Core/Geometry',
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
        Geometry,
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

    var frustumCornersNDC = new Array(8);
    frustumCornersNDC[0] = new Cartesian4(-1.0, -1.0, -1.0, 1.0);
    frustumCornersNDC[1] = new Cartesian4(1.0, -1.0, -1.0, 1.0);
    frustumCornersNDC[2] = new Cartesian4(1.0, 1.0, -1.0, 1.0);
    frustumCornersNDC[3] = new Cartesian4(-1.0, 1.0, -1.0, 1.0);
    frustumCornersNDC[4] = new Cartesian4(-1.0, -1.0, 1.0, 1.0);
    frustumCornersNDC[5] = new Cartesian4(1.0, -1.0, 1.0, 1.0);
    frustumCornersNDC[6] = new Cartesian4(1.0, 1.0, 1.0, 1.0);
    frustumCornersNDC[7] = new Cartesian4(-1.0, 1.0, 1.0, 1.0);

    var scratchMatrix = new Matrix4();
    var scratchFrustumCorners = new Array(8);
    for (var i = 0; i < 8; ++i) {
        scratchFrustumCorners[i] = new Cartesian4();
    }

    var scratchColor = new Color();

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
            var view = this._camera.viewMatrix;
            var projection = this._camera.frustum.projectionMatrix;
            var viewProjection = Matrix4.multiply(projection, view, scratchMatrix);
            var inverseViewProjection = Matrix4.inverse(viewProjection, scratchMatrix);

            var positions = new Float64Array(8 * 3);
            for (var i = 0; i < 8; ++i) {
                var corner = Cartesian4.clone(frustumCornersNDC[i], scratchFrustumCorners[i]);
                Matrix4.multiplyByVector(inverseViewProjection, corner, corner);
                Cartesian3.divideByScalar(corner, corner.w, corner); // Handle the perspective divide
                positions[i * 3] = corner.x;
                positions[i * 3 + 1] = corner.y;
                positions[i * 3 + 2] = corner.z;
            }

            var boundingSphere = new BoundingSphere.fromVertices(positions);

            var attributes = new GeometryAttributes();
            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : positions
            });

            // Create the outline primitive
            var outlineIndices = new Uint16Array([0,1,1,2,2,3,3,0,0,4,4,7,7,3,7,6,6,2,2,1,1,5,5,4,5,6]);

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
            var planesIndices = new Uint16Array([4,5,6,4,6,7,5,1,2,5,2,6,7,6,2,7,2,3,0,1,5,0,5,4,0,4,7,0,7,3,1,0,3,1,3,2]);

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
