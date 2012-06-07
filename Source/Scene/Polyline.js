/*global define*/
define([
        '../Core/combine',
        '../Core/destroyObject',
        '../Core/Cartesian3',
        '../Core/Cartesian4',
        '../Core/Matrix4',
        '../Core/ComponentDatatype',
        '../Core/IndexDatatype',
        '../Core/PrimitiveType',
        '../Core/PolylinePipeline',
        '../Renderer/BufferUsage',
        '../Renderer/BlendingState',
        '../Renderer/StencilFunction',
        '../Renderer/StencilOperation',
        './SceneMode',
        '../Shaders/PolylineVS',
        '../Shaders/PolylineFS'
    ], function(
        combine,
        destroyObject,
        Cartesian3,
        Cartesian4,
        Matrix4,
        ComponentDatatype,
        IndexDatatype,
        PrimitiveType,
        PolylinePipeline,
        BufferUsage,
        BlendingState,
        StencilFunction,
        StencilOperation,
        SceneMode,
        PolylineVS,
        PolylineFS) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @name Polyline
     * @constructor
     *
     * @example
     * var polyline = new Polyline();
     * polyline.color = {
     *   red   : 1.0,
     *   green : 0.0,
     *   blue  : 0.0,
     *   alpha : 0.5
     * };
     * polyline.outlineColor = {
     *   red   : 1.0,
     *   green : 1.0,
     *   blue  : 0.0,
     *   alpha : 0.5
     * };
     * polyline.setPositions([
     *   ellipsoid.toCartesian(new Cartographic3(...)),
     *   ellipsoid.toCartesian(new Cartographic3(...)),
     *   ellipsoid.toCartesian(new Cartographic3(...))
     * ]);
     */
    function Polyline(polylineTemplate, polylineCollection) {
        var p = polylineTemplate || {};
        this.setPositions(p.positions);
        /**
         * DOC_TBA
         * <br /><br />
         * The actual width used is clamped to the minimum and maximum width supported by the WebGL implementation.
         * These can be queried with {@link Context#getMinimumAliasedLineWidth} and
         * {@link Context#getMaximumAliasedLineWidth}.
         *
         * @type Number
         *
         * @see Polyline#outlineWidth
         * @see Context#getMinimumAliasedLineWidth
         * @see Context#getMaximumAliasedLineWidth
         *
         * @example
         * // 3 pixel total width, 1 pixel interior width
         * polyline.width = 1.0;
         * polyline.outlineWidth = 3.0;
         */
        this.width = 2;

        /**
         * DOC_TBA
         * <br /><br />
         * The actual width used is clamped to the minimum and maximum width supported by the WebGL implementation.
         * These can be queried with {@link Context#getMinimumAliasedLineWidth} and
         * {@link Context#getMaximumAliasedLineWidth}.
         *
         * @type Number
         *
         * @see Polyline#width
         * @see Context#getMinimumAliasedLineWidth
         * @see Context#getMaximumAliasedLineWidth
         *
         * @example
         * // 3 pixel total width, 1 pixel interior width
         * polyline.width = 1.0;
         * polyline.outlineWidth = 3.0;
         */
        this.outlineWidth = 5;

        /**
         * DOC_TBA
         *
         * @see Polyline#outlineColor
         */
        this.color = {
            red : 0.0,
            green : 0.0,
            blue : 1.0,
            alpha : 1.0
        };

        /**
         * DOC_TBA
         *
         * @see Polyline#color
         */
        this.outlineColor = {
            red : 1.0,
            green : 1.0,
            blue : 1.0,
            alpha : 1.0
        };

        /**
         * Determines if this polyline will be shown.
         *
         * @type Boolean
         */
        this.show = true;

    }


    /**
     * DOC_TBA
     *
     * @memberof Polyline
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Polyline#setPositions
     */
    Polyline.prototype.getPositions = function() {
        return this._positions;
    };

    /**
     * DOC_TBA
     *
     * @memberof Polyline
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Polyline#getPositions
     *
     * @example
     * polyline.setPositions([
     *   ellipsoid.toCartesian(new Cartographic3(...)),
     *   ellipsoid.toCartesian(new Cartographic3(...)),
     *   ellipsoid.toCartesian(new Cartographic3(...))
     * ]);
     */
    Polyline.prototype.setPositions = function(value) {
        this._positions = value;
        this._createVertexArray = true;
    };

    Polyline.prototype.getColor = function() {
        return this.color;
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof Polyline
     *
     * @return {Boolean} <code>true</code> if this object was destroyed; otherwise, <code>false</code>.
     *
     * @see Polyline#destroy
     */
    Polyline.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof Polyline
     *
     * @return {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see Polyline#isDestroyed
     *
     * @example
     * polyline = polyline && polyline.destroy();
     */
    Polyline.prototype._destroy = function() {
        this._sp = this._sp && this._sp.release();
        this._spGroundTrack = this._spGroundTrack && this._spGroundTrack.release();
        this._spHeightTrack = this._spHeightTrack && this._spHeightTrack.release();
        this._vertices = this._vertices.destroy();
        this._pickId = this._pickId && this._pickId.destroy();
        return destroyObject(this);
    };

    return Polyline;
});