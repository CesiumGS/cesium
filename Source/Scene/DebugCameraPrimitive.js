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

        this._primitive = undefined;
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

    /**
     * @private
     */
    DebugCameraPrimitive.prototype.update = function(frameState) {
        if (!this.show) {
            return;
        }

        if (this._updateOnChange) {
            // Recreate the primitive every frame
            this._primitive = this._primitive && this._primitive.destroy();
        }

        if (!defined(this._primitive)) {
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

            var attributes = new GeometryAttributes();
            attributes.position = new GeometryAttribute({
                componentDatatype : ComponentDatatype.DOUBLE,
                componentsPerAttribute : 3,
                values : positions
            });

            var indices = new Uint16Array([0,1,1,2,2,3,3,0,0,4,4,7,7,3,7,6,6,2,2,1,1,5,5,4,5,6]);
            var geometry = new Geometry({
                attributes : attributes,
                indices : indices,
                primitiveType : PrimitiveType.LINES,
                boundingSphere : new BoundingSphere.fromVertices(positions)
            });

            this._primitive = new Primitive({
                geometryInstances : new GeometryInstance({
                    geometry : geometry,
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
        }

        this._primitive.update(frameState);
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
        this._primitive = this._primitive && this._primitive.destroy();
        return destroyObject(this);
    };

    return DebugCameraPrimitive;
});
