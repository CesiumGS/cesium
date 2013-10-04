/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/Cartesian3',
        '../Core/Matrix4',
        '../Core/Color',
        '../Core/destroyObject',
        '../Core/GeometryInstance',
        '../Core/PolylineGeometry',
        './Primitive',
        './PolylineColorAppearance'
    ], function(
        defaultValue,
        defined,
        Cartesian3,
        Matrix4,
        Color,
        destroyObject,
        GeometryInstance,
        PolylineGeometry,
        Primitive,
        PolylineColorAppearance) {
    "use strict";

    /**
     * DOC_TBA
     */
    var DebugAxesPrimitive = function(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        /**
         * DOC_TBA
         */
        this.scale = defaultValue(options.scale, 10000000.0);
        this._scale = undefined;

        /**
         * DOC_TBA
         */
        this.width = defaultValue(options.width, 2.0);
        this._width = undefined;

        /**
         * DOC_TBA
         */
        this.show = defaultValue(options.show, true);

        /**
         * DOC_TBA
         */
        this.modelMatrix = Matrix4.clone(defaultValue(options.modelMatrix, Matrix4.IDENTITY));

        /**
         * DOC_TBA
         */
        this.id = options.id;
        this._id = undefined;

        /**
         * DOC_TBA
         */
        this.asynchronous = defaultValue(options.asynchronous, true);

        this._primitive = undefined;
    };

    /**
     * @private
     */
    DebugAxesPrimitive.prototype.update = function(context, frameState, commandList) {
        if (!this.show) {
            return;
        }

        if (!defined(this._primitive) ||
            (this._scale !== this.scale) ||
            (this._width !== this.width) ||
            (this._id !== this.id)) {

            this._scale = this.scale;
            this._width = this.width;
            this._id = this.id;

            if (defined(this._primitive)) {
                this._primitive.destroy();
            }

            this._primitive = new Primitive({
                geometryInstances : new GeometryInstance({
                    geometry : new PolylineGeometry({
                        positions : [
                            new Cartesian3(0.0, 0.0, 0.0),
                            new Cartesian3(this.scale, 0.0, 0.0),
                            new Cartesian3(0.0, 0.0, 0.0),
                            new Cartesian3(0.0, this.scale, 0.0),
                            new Cartesian3(0.0, 0.0, 0.0),
                            new Cartesian3(0.0, 0.0, this.scale)
                        ],
                        width : this.width,
                        vertexFormat : PolylineColorAppearance.VERTEX_FORMAT,
                        colors : [
                            Color.RED,
                            Color.RED,
                            Color.GREEN,
                            Color.GREEN,
                            Color.BLUE,
                            Color.BLUE
                        ]
                    }),
                    id : this.id,
                    pickPrimitive : this
                }),
                appearance : new PolylineColorAppearance()
            });
        }

        this._primitive.modelMatrix = this.modelMatrix;
        this._primitive.update(context, frameState, commandList);
    };

    /**
     * DOC_TBA
     */
    DebugAxesPrimitive.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * DOC_TBA
     */
    DebugAxesPrimitive.prototype.destroy = function() {
        this._primitive = this._primitive && this._primitive.destroy();
        return destroyObject(this);
    };

    return DebugAxesPrimitive;
});
