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

    /**
     * DOC_TBA
     *
     * @alias Polyline
     * @internalConstructor
     *
     * @demo <a href="http://cesium.agi.com/Cesium/Apps/Sandcastle/index.html?src=Polylines.html">Cesium Sandcastle Polyline Demo</a>
     */
    var Polyline = function(description, polylineCollection) {
        description = defaultValue(description, EMPTY_OBJECT);

        this._show = defaultValue(description.show, true);
        this._width = defaultValue(description.width, 1.0);

        this._material = description.material;
        if (typeof this._material === 'undefined') {
            this._material = Material.fromType(undefined, Material.ColorType);
            this._material.uniforms.color = new Color(1.0, 1.0, 1.0, 1.0);
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

    var SHOW_INDEX = Polyline.SHOW_INDEX = 0;
    var WIDTH_INDEX = Polyline.WIDTH_INDEX = 1;
    var POSITION_INDEX = Polyline.POSITION_INDEX = 2;
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
            makeDirty(this, SHOW_INDEX);
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

        this.update();
    };

    /**
     * @private
     */
    Polyline.prototype.update = function() {
        var modelMatrix = Matrix4.IDENTITY;
        if (typeof this._polylineCollection !== 'undefined') {
            modelMatrix = this._polylineCollection.modelMatrix;
        }

        var segmentPositionsLength = this._segments.positions.length;
        var segmentLengths = this._segments.lengths;

        var positionsChanged = this._propertiesChanged[POSITION_INDEX] > 0 || this._propertiesChanged[POSITION_SIZE_INDEX] > 0;
        if (!modelMatrix.equals(this._modelMatrix) || positionsChanged) {
            this._segments = PolylinePipeline.wrapLongitude(this._positions, modelMatrix);
        }

        this._modelMatrix = modelMatrix;

        if (this._segments.positions.length !== segmentPositionsLength) {
            // number of positions changed
            makeDirty(this, POSITION_SIZE_INDEX);
        } else {
            var length = segmentLengths.length;
            for (var i = 0; i < length; ++i) {
                if (segmentLengths[i] !== this._segments.lengths[i]) {
                    // indices changed
                    makeDirty(this, POSITION_SIZE_INDEX);
                    break;
                }
            }
        }
    };

    /**
     * Gets the surface appearance of the polyline.  This can be one of several built-in {@link Material} objects or a custom material, scripted with
     * <a href='https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric'>Fabric</a>.
     *
     * @memberof Polyline
     *
     * @returns {Material} The material.
     */
    Polyline.prototype.getMaterial = function() {
        return this._material;
    };

    /**
     * Sets the surface appearance of the polyline.  This can be one of several built-in {@link Material} objects or a custom material, scripted with
     * <a href='https://github.com/AnalyticalGraphicsInc/cesium/wiki/Fabric'>Fabric</a>.
     *
     * @memberof Polyline
     *
     * @param {Material} material The material
     *
     * @exception {DeveloperError} material is required.
     *
     * @see Polyline#getMaterial
     */
    Polyline.prototype.setMaterial = function(material) {
        if (typeof material === 'undefined') {
            throw new DeveloperError('material is required.');
        }

        this._material = material;
        makeDirty(this, MATERIAL_INDEX);
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
     * @memberof Polyline
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
            makeDirty(this, WIDTH_INDEX);
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

    Polyline.prototype._destroy = function() {
        this._pickId = this._pickId && this._pickId.destroy();
        this._material = this._material && this._material.destroy();
        this._polylineCollection = undefined;
    };

    return Polyline;
});
