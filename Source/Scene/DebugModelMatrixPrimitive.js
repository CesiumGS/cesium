/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/destroyObject',
        '../Core/GeometryInstance',
        '../Core/Matrix4',
        '../Core/PolylineGeometry',
        './PolylineColorAppearance',
        './Primitive'
    ], function(
        Cartesian3,
        Color,
        defaultValue,
        defined,
        destroyObject,
        GeometryInstance,
        Matrix4,
        PolylineGeometry,
        PolylineColorAppearance,
        Primitive) {
    "use strict";

    /**
     * Draws the axes of a reference frame defined by a matrix that transforms to world
     * coordinates, i.e., Earth's WGS84 coordinates.  The most prominent example is
     * a primitives <code>modelMatrix</code>.
     * <p>
     * The X axis is red; Y is green; and Z is blue.
     * </p>
     * <p>
     * This is for debugging only; it is not optimized for production use.
     * </p>
     *
     * @alias DebugModelMatrixPrimitive
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Number} [options.length=10000000.0] The length of the axes in meters.
     * @param {Number} [options.width=2.0] The width of the axes in pixels.
     * @param {Matrix4} [options.modelMatrix=Matrix4.IDENTITY] The 4x4 matrix that defines the reference frame, i.e., origin plus axes, to visualize.
     * @param {Boolean} [options.show=true] Determines if this primitive will be shown.
     * @param {Object} [options.id] A user-defined object to return when the instance is picked with {@link Scene#pick}
     *
     * @example
     * primitives.add(new Cesium.DebugModelMatrixPrimitive({
     *   modelMatrix : primitive.modelMatrix,  // primitive to debug
     *   length : 100000.0,
     *   width : 10.0
     * }));
     */
    function DebugModelMatrixPrimitive(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * The length of the axes in meters.
         *
         * @type {Number}
         * @default 10000000.0
         */
        this.length = defaultValue(options.length, 10000000.0);
        this._length = undefined;

        /**
         * The width of the axes in pixels.
         *
         * @type {Number}
         * @default 2.0
         */
        this.width = defaultValue(options.width, 2.0);
        this._width = undefined;

        /**
         * Determines if this primitive will be shown.
         *
         * @type Boolean
         * @default true
         */
        this.show = defaultValue(options.show, true);

        /**
         * The 4x4 matrix that defines the reference frame, i.e., origin plus axes, to visualize.
         *
         * @type {Matrix4}
         * @default {@link Matrix4.IDENTITY}
         */
        this.modelMatrix = Matrix4.clone(defaultValue(options.modelMatrix, Matrix4.IDENTITY));
        this._modelMatrix = new Matrix4();

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

    /**
     * @private
     */
    DebugModelMatrixPrimitive.prototype.update = function(frameState) {
        if (!this.show) {
            return;
        }

        if (!defined(this._primitive) ||
            (!Matrix4.equals(this._modelMatrix, this.modelMatrix)) ||
            (this._length !== this.length) ||
            (this._width !== this.width) ||
            (this._id !== this.id)) {

            this._modelMatrix = Matrix4.clone(this.modelMatrix, this._modelMatrix);
            this._length = this.length;
            this._width = this.width;
            this._id = this.id;

            if (defined(this._primitive)) {
                this._primitive.destroy();
            }

            // Workaround projecting (0, 0, 0)
            if ((this.modelMatrix[12] === 0.0 && this.modelMatrix[13] === 0.0 && this.modelMatrix[14] === 0.0)) {
                this.modelMatrix[14] = 0.01;
            }

            var x = new GeometryInstance({
                geometry : new PolylineGeometry({
                    positions : [
                        Cartesian3.ZERO,
                        Cartesian3.UNIT_X
                    ],
                    width : this.width,
                    vertexFormat : PolylineColorAppearance.VERTEX_FORMAT,
                    colors : [
                        Color.RED,
                        Color.RED
                    ],
                    followSurface: false
                }),
                modelMatrix : Matrix4.multiplyByUniformScale(this.modelMatrix, this.length, new Matrix4()),
                id : this.id,
                pickPrimitive : this
            });
            var y = new GeometryInstance({
                geometry : new PolylineGeometry({
                    positions : [
                        Cartesian3.ZERO,
                        Cartesian3.UNIT_Y
                    ],
                    width : this.width,
                    vertexFormat : PolylineColorAppearance.VERTEX_FORMAT,
                    colors : [
                        Color.GREEN,
                        Color.GREEN
                    ],
                    followSurface: false
                }),
                modelMatrix : Matrix4.multiplyByUniformScale(this.modelMatrix, this.length, new Matrix4()),
                id : this.id,
                pickPrimitive : this
            });
            var z = new GeometryInstance({
                geometry : new PolylineGeometry({
                    positions : [
                        Cartesian3.ZERO,
                        Cartesian3.UNIT_Z
                    ],
                    width : this.width,
                    vertexFormat : PolylineColorAppearance.VERTEX_FORMAT,
                    colors : [
                        Color.BLUE,
                        Color.BLUE
                    ],
                    followSurface: false
                }),
                modelMatrix : Matrix4.multiplyByUniformScale(this.modelMatrix, this.length, new Matrix4()),
                id : this.id,
                pickPrimitive : this
            });

            this._primitive = new Primitive({
                geometryInstances : [x, y, z],
                appearance : new PolylineColorAppearance(),
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
     * @see DebugModelMatrixPrimitive#destroy
     */
    DebugModelMatrixPrimitive.prototype.isDestroyed = function() {
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
     * @see DebugModelMatrixPrimitive#isDestroyed
     */
    DebugModelMatrixPrimitive.prototype.destroy = function() {
        this._primitive = this._primitive && this._primitive.destroy();
        return destroyObject(this);
    };

    return DebugModelMatrixPrimitive;
});
