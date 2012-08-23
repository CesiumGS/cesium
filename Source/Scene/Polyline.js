/*global define*/
define([
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/Cartesian3',
        '../Core/Color'
    ], function(
        DeveloperError,
        destroyObject,
        Cartesian3,
        Color) {
    "use strict";

    /**
     *
     * @alias Polyline
     * @internalConstructor
     */
    var Polyline = function(polylineTemplate, polylineCollection) {
        var p = polylineTemplate || {};

        this._positions = typeof p.positions !== 'undefined' ? p.positions : [];
        this._positionsLength = this._positions.length;
        this._show = typeof p.show === 'undefined' ? true : p.show;
        this._width = typeof p.width === 'undefined' ? 1.0 : p.width;
        this._outlineWidth = typeof p.outlineWidth === 'undefined' ? 0.0 : p.outlineWidth;
        this._color = typeof p.color === 'undefined' ? new Color(1.0, 1.0, 1.0, 1.0) : Color.clone(p.color);
        this._outlineColor = (typeof p.outlineColor === 'undefined') ? new Color(1.0, 1.0, 1.0, 1.0) : Color.clone(p.outlineColor);
        this._propertiesChanged = new Uint32Array(NUMBER_OF_PROPERTIES);
        this._collection = polylineCollection;
        this._dirty = false;
        this._pickId = undefined;
        this._pickIdThis = p._pickIdThis;
    };

    var SHOW_INDEX = Polyline.SHOW_INDEX = 0;
    var POSITION_INDEX = Polyline.POSITION_INDEX = 1;
    var COLOR_INDEX = Polyline.COLOR_INDEX = 2;
    var OUTLINE_COLOR_INDEX = Polyline.OUTLINE_COLOR_INDEX = 3;
    var WIDTH_INDEX = Polyline.WIDTH_INDEX = 4;
    var OUTLINE_WIDTH_INDEX = Polyline.OUTLINE_WIDTH_INDEX = 5;
    var POSITION_SIZE_INDEX = Polyline.POSITION_SIZE_INDEX = 6;
    Polyline.NUMBER_OF_PROPERTIES = 7;
    var NUMBER_OF_PROPERTIES = Polyline.NUMBER_OF_PROPERTIES;

    /**
     * Returns true if this polyline will be shown.  Call {@link Polyline#setShow}
     * to hide or show a polyline, instead of removing it and re-adding it to the collection.
     *
     * @memberof Polyline
     *
     * @return {Boolean} <code>true</code> if this polyline will be shown; otherwise, <code>false</code>.
     *
     * @see Polyline#setShow
     */
    Polyline.prototype.getShow = function() {
        return this._show;
    };

    /**
     * Determines if this polyline will be shown.  Call this to hide or show a polyline, instead
     * of removing it and re-adding it to the collection.
     *
     * @memberof Polyline
     *
     * @param {Boolean} value Indicates if this polyline will be shown.
     *
     * @see Polyline#getShow
     */
    Polyline.prototype.setShow = function(value) {
        if ((typeof value !== 'undefined') && (this._show !== value)) {
            this._show = value;
            this._makeDirty(SHOW_INDEX);
                }
    };

    /**
     * Returns the polyline's positions.
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
    * Defines the positions of the polyline.
    *
    * @memberof Polyline
    *
    * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
    * @see Polyline#getPositions
    *
    * @example
    * polyline.setPositions(
    *   ellipsoid.toCartesians(new Cartographic3(...),
    *                          new Cartographic3(...),
    *                          new Cartographic3(...))
    * );
     */
    Polyline.prototype.setPositions = function(positions) {
        if (typeof positions === 'undefined') {
            positions = [];
        }
        if (this._positionsLength !== positions.length) {
            this._positionsLength = positions.length;
            this._makeDirty(POSITION_SIZE_INDEX);
        }
        this._positions = positions;
        this._makeDirty(POSITION_INDEX);
    };

    /**
     * Returns the color of the polyline.
     *
     * @memberof Polyline
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @return {Color}
     *
     * @see Polyline#setColor
     */
    Polyline.prototype.getColor = function() {
        return this._color;
    };

        /**
     * Sets the color of the polyline.
     *
     * @memberof Polyline
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @param {Color} value. The color of the polyline.
         *
     * @see Polyline#getColor
         */
    Polyline.prototype.setColor = function(value) {
        var c = this._color;

        if ((typeof value !== 'undefined') && ((c.red !== value.red) || (c.green !== value.green) || (c.blue !== value.blue) || (c.alpha !== value.alpha))) {
            this._color = new Color(value.red, value.green, value.blue, value.alpha);
            this._makeDirty(COLOR_INDEX);
            }
        };

        /**
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
    Polyline.prototype.getWidth = function() {
        return this._width;
    };

        /**
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
    Polyline.prototype.setWidth = function(value) {
        var width = this._width;

        if ((typeof value !== 'undefined') && (value !== width)) {
            this._width = value;
            this._makeDirty(WIDTH_INDEX);
        }
        };

        /**
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
    Polyline.prototype.getOutlineWidth = function() {
        return this._outlineWidth;
        };

        /**
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
    Polyline.prototype.setOutlineWidth = function(value) {
        var width = this._outlineWidth;

        if ((typeof value !== 'undefined') && (value !== width)) {
            this._outlineWidth = value;
            this._makeDirty(OUTLINE_WIDTH_INDEX);
            }
        };

        /**
     * Returns the outline color of the polyline.
     *
     * @memberof Polyline
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @return {Color}
     *
     * @see Polyline#setOutlineColor
     */
    Polyline.prototype.getOutlineColor = function() {
        return this._outlineColor;
    };

    /**
     * Returns the outline color of the polyline.
     *
     * @memberof Polyline
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @return {Color}
     *
     * @see Polyline#setOutlineColor
     */
    Polyline.prototype.setOutlineColor = function(value) {
        var c = this._outlineColor;

        if ((typeof value !== 'undefined') && ((c.red !== value.red) || (c.green !== value.green) || (c.blue !== value.blue) || (c.alpha !== value.alpha))) {
            this._outlineColor = new Color(value.red, value.green, value.blue, value.alpha);
            this._makeDirty(OUTLINE_COLOR_INDEX);
        }
    };

    Polyline.prototype.getPickId = function(context) {
        this._pickId = this._pickId || context.createPickId(this._pickIdThis || this);
        return this._pickId;
    };

    Polyline.prototype._clean = function() {
        this._dirty = false;
        var properties = this._propertiesChanged;
        for ( var k = 0; k < NUMBER_OF_PROPERTIES - 1; ++k) {
            properties[k] = 0;
        }
    };

    Polyline.prototype._getCollection = function() {
        return this._collection;
    };

    Polyline.prototype._getChangedProperties = function() {
        return this._propertiesChanged;
    };

    Polyline.prototype._makeDirty = function(propertyChanged) {
        ++this._propertiesChanged[propertyChanged];
        var c = this._collection;
        if (c) {
            c._updatePolyline(propertyChanged, this);
            this._dirty = true;
        }
    };

    Polyline.prototype._destroy = function() {
        this._pickId = this._pickId && this._pickId.destroy();
        this._collection = undefined;
    };

    return Polyline;
});
