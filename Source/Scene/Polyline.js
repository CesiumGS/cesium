/*global define*/
define([
        '../Core/defaultValue',
        '../Core/DeveloperError',
        '../Core/destroyObject',
        '../Core/BoundingSphere',
        '../Core/Cartesian3',
        '../Core/Color',
        '../Core/PolylinePipeline',
        '../Core/Matrix4',
        './Material'
    ], function(
        defaultValue,
        DeveloperError,
        destroyObject,
        BoundingSphere,
        Cartesian3,
        Color,
        PolylinePipeline,
        Matrix4,
        Material) {
    "use strict";

    var EMPTY_OBJECT = {};
    var defaultOutlineColor = new Color(1.0, 1.0, 1.0, 0.0);

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
        this._color = Color.clone(defaultValue(description.color, Color.WHITE));
        this._outlineColor = Color.clone(defaultValue(description.outlineColor, defaultOutlineColor));
        this._perVertexColors = undefined;
        this._perVertexOutlineColors = undefined;

        this._material = description.material;
        if (typeof this._material === 'undefined') {
            this._material = Material.fromType(undefined, Material.PolylineOutlineType);
        }

        var positions = description.positions;
        if (typeof positions === 'undefined') {
            positions = [];
        }

        this._positions = positions;

        var modelMatrix;
        if (typeof this._polylineCollection !== 'undefined') {
            modelMatrix = Matrix4.clone(this._polylineCollection.modelMatrix);
        }

        this._modelMatrix = modelMatrix;
        this._segments = PolylinePipeline.wrapLongitude(positions, modelMatrix);

        this._actualLength = undefined;

        this._propertiesChanged = new Uint32Array(NUMBER_OF_PROPERTIES);
        this._polylineCollection = polylineCollection;
        this._dirty = false;
        this._pickId = undefined;
        this._pickIdThis = description._pickIdThis;
        this._boundingVolume = BoundingSphere.fromPoints(this._positions);
        this._boundingVolume2D = new BoundingSphere(); // modified in PolylineCollection
    };

    var MISC_INDEX = Polyline.MISC_INDEX = 0;
    var POSITION_INDEX = Polyline.POSITION_INDEX = 1;
    var COLOR_INDEX = Polyline.COLOR_INDEX = 2;
    var MATERIAL_INDEX = Polyline.MATERIAL_INDEX = 3;
    var POSITION_SIZE_INDEX = Polyline.POSITION_SIZE_INDEX = 4;
    var NUMBER_OF_PROPERTIES = Polyline.NUMBER_OF_PROPERTIES = 5;

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
            makeDirty(this, MISC_INDEX);
        }
    };

    /**
     * Returns the polyline's positions.
     *
     * @memberof Polyline
     *
     * @return {Array} The polyline's positions.
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

        if (this._positions.length !== value.length) {
            makeDirty(this, POSITION_SIZE_INDEX);
        }

        this._positions = value;
        this._boundingVolume = BoundingSphere.fromPoints(this._positions, this._boundingVolume);
        makeDirty(this, POSITION_INDEX);
    };

    /**
     * @private
     */
    Polyline.prototype.update = function() {
        var modelMatrix = Matrix4.IDENTITY;
        if (typeof this._polylineCollection !== 'undefined') {
            modelMatrix = this._polylineCollection.modelMatrix;
        }

        var length = this._segments.lengths.length;
        this._modelMatrix = modelMatrix;

        var positionsChanged = this._propertiesChanged[POSITION_INDEX] > 0 || this._propertiesChanged[POSITION_SIZE_INDEX] > 0;
        if (!modelMatrix.equals(this._modelMatrix) || positionsChanged) {
            this._segments = PolylinePipeline.wrapLongitude(this._positions, modelMatrix);
        }

        if (this._segments.lengths.length !== length) {
            makeDirty(this, POSITION_SIZE_INDEX);
        }
    };

    /**
     * TODO
     * @returns
     */
    Polyline.prototype.getMaterial = function() {
        return this._material;
    };

    /**
     * TODO
     * @param material
     */
    Polyline.prototype.setMaterial = function(material) {
        if (typeof material === 'undefined') {
            throw new DeveloperError('material is required.');
        }

        this._material = material;
        makeDirty(this, MATERIAL_INDEX);
    };

    /**
     * Returns the default color of the polyline. This color is used if per-vertex
     * colors are not defined.
     *
     * @memberof Polyline
     *
     * @return {Color} The default color of the polyline.
     *
     * @see Polyline#setDefaultColor
     * @see Polyline#getColors
     * @see Polyline#setColors
     */
    Polyline.prototype.getDefaultColor = function() {
        return this._color;
    };

    /**
     * Sets the default color of the polyline. This color is used if per-vertex
     * colors are not defined.
     *
     * @memberof Polyline
     *
     * @param {Color} value The default color of the polyline.
     *
     * @exception {DeveloperError} value is required.
     *
     * @see Polyline#getDefaultColor
     * @see Polyline#getColors
     * @see Polyline#setColors
     */
    Polyline.prototype.setDefaultColor = function(value) {
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
     * Returns the polyline's color at each position.
     *
     * @return {Array} The polyline's color at each position.
     *
     * @see Polyline#setColors
     * @see Polyline#getDefaultColor
     * @see Polyline#SetDefaultColor
     */
    Polyline.prototype.getColors = function() {
        return this._perVertexColors;
    };

    /**
     * Defines the color of the polyline at each position.
     *
     * @memberof Polyline
     *
     * @param {Array} colors The colors of the polyline at each position.
     *
     * @exception {DeveloperError} colors must have the same number of elements as the positions.
     *
     * @see Polyline#getColors
     * @see Polyline#getDefaultColor
     * @see Polyline#SetDefaultColor
     */
    Polyline.prototype.setColors = function(colors) {
        if (typeof colors !== 'undefined' && colors.length !== this._positions.length) {
            throw new DeveloperError('colors must have the same number of elements as the positions.');
        }

        this._perVertexColors = colors;
        makeDirty(this, COLOR_INDEX);
    };

    /**
     * Gets the width of the polyline.
     *
     * @memberof Polyline
     *
     * @return {Number} The width of the polyline.
     *
     * @see Polyline#setWidth
     *
     * @example
     * polyline.setWidth(5.0);
     * var width = polyline.getWidth(); // 5.0
     */
    Polyline.prototype.getWidth = function() {
        return this._width;
    };

    /**
     * Sets the width of the polyline.
     *
     * @param {Number} value The width of the polyline.
     *
     * @exception {DeveloperError} value is required.
     *
     * @see Polyline#getWidth
     *
     * @example
     * polyline.setWidth(5.0);
     * var width = polyline.getWidth(); // 5.0
     */
    Polyline.prototype.setWidth = function(value) {
        if (typeof value === 'undefined') {
            throw new DeveloperError('value is required.');
        }

        var width = this._width;
        if (value !== width) {
            this._width = value;
            makeDirty(this, MISC_INDEX);
        }
    };

    /**
     * Gets the default outline color of the polyline. This color is used if per-vertex
     * outline colors are not defined.
     *
     * @memberof Polyline
     *
     * @return {Color} The default outline color of the polyline.
     *
     * @see Polyline#setDefaultOutlineColor
     * @see Polyline#getOutlineColors
     * @see Polyline#setOutlineColors
     */
    Polyline.prototype.getDefaultOutlineColor = function() {
        return this._outlineColor;
    };

    /**
     * Sets the default outline color of the polyline. This color is used if per-vertex
     * outline colors are not defined.
     *
     * @memberof Polyline
     *
     * @param {Color} value The default outline color of the polyline.
     *
     * @exception {DeveloperError} value is required.
     *
     * @see Polyline#getDefaultOutlineColor
     * @see Polyline#getOutlineColors
     * @see Polyline#setOutlineColors
     */
    Polyline.prototype.setDefaultOutlineColor = function(value) {
        if (typeof value === 'undefined') {
            throw new DeveloperError('value is required.');
        }

        var outlineColor = this._outlineColor;
        if (!Color.equals(outlineColor, value)) {
            Color.clone(value, outlineColor);
            makeDirty(this, COLOR_INDEX);
        }
    };

    /**
     * Returns the polyline's outline color at each position.
     *
     * @return {Array} The polyline's outline color at each position.
     *
     * @see Polyline#setOutlineColors
     * @see Polyline#getDefaultOutlineColor
     * @see Polyline#SetDefaultOutlineColor
     */
    Polyline.prototype.getOutlineColors = function() {
        return this._perVertexOutlineColors;
    };

    /**
     * Defines the outline color of the polyline at each position.
     *
     * @memberof Polyline
     *
     * @param {Array} colors The outline colors of the polyline at each position.
     *
     * @exception {DeveloperError} colors must have the same number of elements as the positions.
     *
     * @see Polyline#getOutlineColors
     * @see Polyline#getDefaultOutlineColor
     * @see Polyline#SetDefaultOutlineColor
     */
    Polyline.prototype.setOutlineColors = function(colors) {
        if (typeof colors !== 'undefined' && colors.length !== this._positions.length) {
            throw new DeveloperError('colors must have the same number of elements as the positions.');
        }

        this._perVertexOutlineColors = colors;
        makeDirty(this, COLOR_INDEX);
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
               cartesian3ArrayEquals(this._positions, other._positions) &&
               Color.equals(this._color, other._color) &&
               Color.equals(this._outlineColor, other._outlineColor) &&
               colorArrayEquals(this._perVertexColors, this._positions.length, other._perVertexColors, other._positions.length) &&
               colorArrayEquals(this._perVertexOutlineColors, this._positions.length, other._perVertexOutlineColors, other._positions.length);
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

    function colorArrayEquals(a, aPositionsLength, b, bPositionsLength) {
        if (typeof a === 'undefined' && typeof b === 'undefined') {
            return true;
        }
        if (a.length !== aPositionsLength && b.length !== bPositionsLength) {
            return true;
        }
        if (a.length !== b.length) {
            return false;
        }
        for ( var i = 0, len = a.length; i < len; ++i) {
            if (!Color.equals(a[i], b[i])) {
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
