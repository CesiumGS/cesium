/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/PolylinePipeline'
    ], function(
        defaultValue,
        DeveloperError,
        destroyObject,
        BoundingSphere,
        Cartesian3,
        Color,
        PolylinePipeline) {
    "use strict";

    var EMPTY_OBJECT = {};

    /**
     * DOC_TBA
     *
     * @alias Polyline
     * @internalConstructor
     */
    var Polyline = function(description, polylineCollection) {
        description = defaultValue(description, EMPTY_OBJECT);

        this._show = defaultValue(description.show, true);
        this._width = defaultValue(description.width, 1.0);
        this._outlineWidth = defaultValue(description.outlineWidth, 1.0);
        this._color = Color.clone(defaultValue(description.color, Color.WHITE));
        this._outlineColor = Color.clone(defaultValue(description.outlineColor, Color.WHITE));

        var positions = description.positions;
        if (typeof positions === 'undefined') {
            positions = [];
        }

        this._positions = positions;
        this._positionsLength = positions.length;
        this._actualLength = positions.length;

        this._propertiesChanged = new Uint32Array(NUMBER_OF_PROPERTIES);
        this._polylineCollection = polylineCollection;
        this._dirty = false;
        this._pickId = undefined;
        this._pickIdThis = description._pickIdThis;
        this._segments = undefined;
        this._boundingVolume = BoundingSphere.fromPoints(this._positions);
        this._boundingVolume2D = new BoundingSphere(); // modified in PolylineCollection
    };

    var SHOW_INDEX = Polyline.SHOW_INDEX = 0;
    var POSITION_INDEX = Polyline.POSITION_INDEX = 1;
    var COLOR_INDEX = Polyline.COLOR_INDEX = 2;
    var OUTLINE_COLOR_INDEX = Polyline.OUTLINE_COLOR_INDEX = 3;
    var WIDTH_INDEX = Polyline.WIDTH_INDEX = 4;
    var OUTLINE_WIDTH_INDEX = Polyline.OUTLINE_WIDTH_INDEX = 5;
    var POSITION_SIZE_INDEX = Polyline.POSITION_SIZE_INDEX = 6;
    var NUMBER_OF_PROPERTIES = Polyline.NUMBER_OF_PROPERTIES = 7;

    function makeDirty(polyline, propertyChanged) {
        ++polyline._propertiesChanged[propertyChanged];
        var polylineCollection = polyline._polylineCollection;
        if (typeof polylineCollection !== 'undefined') {
            polylineCollection._updatePolyline(polyline, propertyChanged);
            polyline._dirty = true;
        }
    }

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
     * @exception {DeveloperError} value is required.
     *
     * @see Polyline#getShow
     */
    Polyline.prototype.setShow = function(value) {
        if (typeof value === 'undefined') {
            throw new DeveloperError('value is required.');
        }

        if (value !== this._show) {
            this._show = value;
            makeDirty(this, SHOW_INDEX);
        }
    };

    /**
     * Returns the polyline's positions.
     *
     * @memberof Polyline
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
     * @param {Array} value The positions of the polyline.
     *
     * @exception {DeveloperError} value is required.
     *
     * @see Polyline#getPositions
     *
     * @example
     * polyline.setPositions(
     *   ellipsoid.cartographicArrayToCartesianArray([
     *     new Cartographic3(...),
     *     new Cartographic3(...),
     *     new Cartographic3(...)
     *   ])
     * );
     */
    Polyline.prototype.setPositions = function(value) {
        if (typeof value === 'undefined') {
            throw new DeveloperError('value is required.');
        }

        if (this._positionsLength !== value.length) {
            this._positionsLength = value.length;
            makeDirty(this, POSITION_SIZE_INDEX);
        }

        this._positions = value;
        this._boundingVolume = BoundingSphere.fromPoints(this._positions, this._boundingVolume);
        makeDirty(this, POSITION_INDEX);
    };

    /**
     * Returns the color of the polyline.
     *
     * @memberof Polyline
     *
     * @return {Color} The color of the polyline.
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
     * @param {Color} value The color of the polyline.
     *
     * @exception {DeveloperError} value is required.
     *
     * @see Polyline#getColor
     */
    Polyline.prototype.setColor = function(value) {
        if (typeof value === 'undefined') {
            throw new DeveloperError('value is required.');
        }

        var color = this._color;
        if (!Color.equals(color, value)) {
            Color.clone(value, color);
            makeDirty(this, COLOR_INDEX);
        }
    };

    /**
     * Gets the width of the polyline.
     * The actual width used is clamped to the minimum and maximum width supported by
     * the WebGL implementation.  These can be queried with
     * {@link Context#getMinimumAliasedLineWidth} and {@link Context#getMaximumAliasedLineWidth}.
     *
     * @memberof Polyline
     *
     * @return {Number} The width of the polyline.
     *
     * @see Polyline#setWidth
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
     * Sets the width of the polyline.
     * The actual width used is clamped to the minimum and maximum width supported by
     * the WebGL implementation.  These can be queried with
     * {@link Context#getMinimumAliasedLineWidth} and {@link Context#getMaximumAliasedLineWidth}.
     *
     * @param {Number} value The width of the polyline.
     *
     * @exception {DeveloperError} value is required.
     *
     * @see Polyline#getWidth
     * @see Context#getMinimumAliasedLineWidth
     * @see Context#getMaximumAliasedLineWidth
     *
     * @example
     * // 3 pixel total width, 1 pixel interior width
     * polyline.width = 1.0;
     * polyline.outlineWidth = 3.0;
     */
    Polyline.prototype.setWidth = function(value) {
        if (typeof value === 'undefined') {
            throw new DeveloperError('value is required.');
        }

        var width = this._width;
        if (value !== width) {
            this._width = value;
            makeDirty(this, WIDTH_INDEX);
        }
    };


    /**
     * Gets the outline width of the polyline.
     * The actual width used is clamped to the minimum and maximum width supported by
     * the WebGL implementation.  These can be queried with
     * {@link Context#getMinimumAliasedLineWidth} and {@link Context#getMaximumAliasedLineWidth}.
     *
     * @return {Number} The outline width of the polyline.
     *
     * @see Polyline#setOutlineWidth
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
     * Sets the outline width of the polyline.
     * The actual width used is clamped to the minimum and maximum width supported by
     * the WebGL implementation.  These can be queried with
     * {@link Context#getMinimumAliasedLineWidth} and {@link Context#getMaximumAliasedLineWidth}.
     *
     * @param {Number} value The outline width of the polyline.
     *
     * @exception {DeveloperError} value is required.
     *
     * @see Polyline#getOutlineWidth
     * @see Context#getMinimumAliasedLineWidth
     * @see Context#getMaximumAliasedLineWidth
     *
     * @example
     * // 3 pixel total width, 1 pixel interior width
     * polyline.width = 1.0;
     * polyline.outlineWidth = 3.0;
     */
    Polyline.prototype.setOutlineWidth = function(value) {
        if (typeof value === 'undefined') {
            throw new DeveloperError('value is required.');
        }

        var outlineWidth = this._outlineWidth;
        if (value !== outlineWidth) {
            this._outlineWidth = value;
            makeDirty(this, OUTLINE_WIDTH_INDEX);
        }
    };

    /**
     * Gets the outline color of the polyline.
     *
     * @memberof Polyline
     *
     * @return {Color} The outline color of the polyline.
     *
     * @see Polyline#setOutlineColor
     */
    Polyline.prototype.getOutlineColor = function() {
        return this._outlineColor;
    };

    /**
     * Sets the outline color of the polyline.
     *
     * @memberof Polyline
     *
     * @param {Color} value The outline color of the polyline.
     *
     * @exception {DeveloperError} value is required.
     *
     * @see Polyline#getOutlineColor
     */
    Polyline.prototype.setOutlineColor = function(value) {
        if (typeof value === 'undefined') {
            throw new DeveloperError('value is required.');
        }

        var outlineColor = this._outlineColor;
        if (!Color.equals(outlineColor, value)) {
            Color.clone(value, outlineColor);
            makeDirty(this, OUTLINE_COLOR_INDEX);
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

    Polyline.prototype._getPositions2D = function() {
        var segments = this._segments;
        var positions = [];
        var numberOfSegments = segments.length;

        for ( var i = 0; i < numberOfSegments; ++i) {
            var segment = segments[i];
            var segmentLength = segment.length;
            for ( var n = 0; n < segmentLength; ++n) {
                positions.push(segment[n].cartesian);
            }
        }
        return positions;
    };

    Polyline.prototype._createSegments = function(modelMatrix) {
        return PolylinePipeline.wrapLongitude(this.getPositions(), modelMatrix);
    };

    Polyline.prototype._setSegments = function(segments) {
        this._segments = segments;
        var numberOfSegments = segments.length;
        var length = 0;
        for ( var i = 0; i < numberOfSegments; ++i) {
            var segment = segments[i];
            var segmentLength = segment.length;
            length += segmentLength;
        }
        return length;
    };

    Polyline.prototype._getSegments = function() {
        return this._segments;
    };

    Polyline.prototype._segmentsLengthChanged = function(newSegments) {
        var origSegments = this._segments;
        if (typeof origSegments !== 'undefined') {
            var numberOfSegments = newSegments.length;
            if (numberOfSegments !== origSegments.length) {
                return true;
            }
            for ( var i = 0; i < numberOfSegments; ++i) {
                if (newSegments[i].length !== origSegments[i].length) {
                    return true;
                }
            }
            return false;
        }
        return true;
    };

    /**
     * Determines if this polyline equals another polyline.  Polylines are equal if all their properties
     * are equal.  Polylines in different collections can be equal.
     *
     * @memberof Polyline
     *
     * @param {Polyline} other The polyline to compare for equality.
     *
     * @return {Boolean} <code>true</code> if the polylines are equal; otherwise, <code>false</code>.
     */
    Polyline.prototype.equals = function(other) {
        return this === other ||
               typeof other !== 'undefined' &&
               this._show === other._show &&
               this._width === other._width &&
               this._outlineWidth === other._outlineWidth &&
               this._horizontalOrigin === other._horizontalOrigin &&
               cartesian3ArrayEquals(this._positions, other._positions) &&
               Color.equals(this._color, other._color) &&
               Color.equals(this._outlineColor, other._outlineColor);
    };

    function cartesian3ArrayEquals(a, b) {
        if (a.length !== b.length) {
            return false;
        }
        for ( var i = 0, len = a.length; i < len; ++i) {
            if (!Cartesian3.equals(a[i], b[i])) {
                return false;
            }
        }
        return true;
    }

    Polyline.prototype._destroy = function() {
        this._pickId = this._pickId && this._pickId.destroy();
        this._polylineCollection = undefined;
    };

    return Polyline;
});
