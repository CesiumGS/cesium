/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/BoundingSphere',
        '../Core/Color',
        '../Core/PolylinePipeline',
        '../Core/Matrix4',
        '../Core/Cartesian3',
        './Material'
    ], function(
        defaultValue,
        defined,
        DeveloperError,
        BoundingSphere,
        Color,
        PolylinePipeline,
        Matrix4,
        Cartesian3,
        Material) {
    "use strict";

    /**
     * A renderable polyline. Create this by calling {@link PolylineCollection#add}
     *
     * @alias Polyline
     * @internalConstructor
     *
     * @param {Boolean} [options.show=true] <code>true</code> if this polyline will be shown; otherwise, <code>false</code>.
     * @param {Number} [options.width=1.0] The width of the polyline in pixels.
     * @param {Boolean} [options.loop=false] Whether a line segment will be added between the last and first line positions to make this line a loop.
     * @param {Material} [options.material=Material.ColorType] The material.
     * @param {Array} [options.positions] The positions.
     * @param {Object} [options.id] The user-defined object to be returned when this polyline is picked.
     *
     * @see PolylineCollection
     *
     * @demo <a href="http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Polylines.html">Cesium Sandcastle Polyline Demo</a>
     */
    var Polyline = function(options, polylineCollection) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        this._show = defaultValue(options.show, true);
        this._width = defaultValue(options.width, 1.0);
        this._loop = defaultValue(options.loop, false);

        this._material = options.material;
        if (!defined(this._material)) {
            this._material = Material.fromType(Material.ColorType, {
                color : new Color(1.0, 1.0, 1.0, 1.0)
            });
        }

        var positions = options.positions;
        if (!defined(positions)) {
            positions = [];
        }

        this._positions = positions;
        if (this._loop && positions.length > 2 && !Cartesian3.equals(positions[0], positions[positions.length - 1])) {
            positions.push(Cartesian3.clone(positions[0]));
        }

        this._length = positions.length;
        this._id = options.id;

        var modelMatrix;
        if (defined(polylineCollection)) {
            modelMatrix = Matrix4.clone(polylineCollection.modelMatrix);
        }

        this._modelMatrix = modelMatrix;
        this._segments = PolylinePipeline.wrapLongitude(positions, modelMatrix);

        this._actualLength = undefined;

        this._propertiesChanged = new Uint32Array(NUMBER_OF_PROPERTIES);
        this._polylineCollection = polylineCollection;
        this._dirty = false;
        this._pickId = undefined;
        this._pickIdThis = options._pickIdThis;
        this._boundingVolume = BoundingSphere.fromPoints(this._positions);
        this._boundingVolumeWC = BoundingSphere.transform(this._boundingVolume, this._modelMatrix);
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
        if (defined(polylineCollection)) {
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
     * @returns {Boolean} <code>true</code> if this polyline will be shown; otherwise, <code>false</code>.
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
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
        //>>includeEnd('debug');

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
     * @returns {Array} The polyline's positions.
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
     * @see Polyline#getPositions
     *
     * @example
     * polyline.setPositions(
     *   ellipsoid.cartographicArrayToCartesianArray([
     *     new Cesium.Cartographic(...),
     *     new Cesium.Cartographic(...),
     *     new Cesium.Cartographic(...)
     *   ])
     * );
     */
    Polyline.prototype.setPositions = function(value) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
        //>>includeEnd('debug');

        if (this._loop && value.length > 2 && !Cartesian3.equals(value[0], value[value.length - 1])) {
            value.push(Cartesian3.clone(value[0]));
        }

        if (this._positions.length !== value.length || this._positions.length !== this._length) {
            makeDirty(this, POSITION_SIZE_INDEX);
        }

        this._positions = value;
        this._length = value.length;
        this._boundingVolume = BoundingSphere.fromPoints(this._positions, this._boundingVolume);
        this._boundingVolumeWC = BoundingSphere.transform(this._boundingVolume, this._modelMatrix, this._boundingVolumeWC);
        makeDirty(this, POSITION_INDEX);

        this.update();
    };

    /**
     * @private
     */
    Polyline.prototype.update = function() {
        var modelMatrix = Matrix4.IDENTITY;
        if (defined(this._polylineCollection)) {
            modelMatrix = this._polylineCollection.modelMatrix;
        }

        var segmentPositionsLength = this._segments.positions.length;
        var segmentLengths = this._segments.lengths;

        var positionsChanged = this._propertiesChanged[POSITION_INDEX] > 0 || this._propertiesChanged[POSITION_SIZE_INDEX] > 0;
        if (!Matrix4.equals(modelMatrix, this._modelMatrix) || positionsChanged) {
            this._segments = PolylinePipeline.wrapLongitude(this._positions, modelMatrix);
            this._boundingVolumeWC = BoundingSphere.transform(this._boundingVolume, modelMatrix, this._boundingVolumeWC);
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
     * @see Polyline#getMaterial
     */
    Polyline.prototype.setMaterial = function(material) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(material)) {
            throw new DeveloperError('material is required.');
        }
        //>>includeEnd('debug');

        if (this._material !== material) {
            this._material = material;
            makeDirty(this, MATERIAL_INDEX);
        }
    };

    /**
     * Gets the width of the polyline.
     *
     * @memberof Polyline
     *
     * @returns {Number} The width of the polyline.
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
     * @see Polyline#getWidth
     *
     * @example
     * polyline.setWidth(5.0);
     * var width = polyline.getWidth(); // 5.0
     */
    Polyline.prototype.setWidth = function(value) {
        //>>includeStart('debug', pragmas.debug)
        if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
        //>>includeEnd('debug');

        var width = this._width;
        if (value !== width) {
            this._width = value;
            makeDirty(this, WIDTH_INDEX);
        }
    };

    /**
     * Gets whether a line segment will be added between the first and last polyline positions.
     *
     * @memberof Polyline
     *
     * @returns {Boolean} <code>true</code> if the polyline is a loop; otherwise, <code>false</code>.
     *
     * @see Polyline#setLoop
     */
    Polyline.prototype.getLoop = function() {
        return this._loop;
    };

    /**
     * Sets whether a line segment will be added between the first and last polyline positions.
     *
     * @memberof Polyline
     *
     * @param {Boolean} value <code>true</code> if the polyline is to be a loop; otherwise, <code>false</code>.
     *
     * @see Polyline#getLoop
     */
    Polyline.prototype.setLoop = function(value) {
        //>>includeStart('debug', pragmas.debug)
        if (!defined(value)) {
            throw new DeveloperError('value is required.');
        }
        //>>includeEnd('debug');

        if (value !== this._loop) {
            var positions = this._positions;
            if (value) {
                if (positions.length > 2 && !Cartesian3.equals(positions[0], positions[positions.length - 1])) {
                    positions.push(Cartesian3.clone(positions[0]));
                }
            } else {
                if (positions.length > 2 && Cartesian3.equals(positions[0], positions[positions.length - 1])) {
                    positions.pop();
                }
            }

            this._loop = value;
            makeDirty(this, POSITION_SIZE_INDEX);
        }
    };

    /**
     * Returns the user-defined object returned when the polyline is picked.
     *
     * @memberof Polyline
     *
     * @returns {Object} The user-defined object returned when the polyline is picked.
     */
    Polyline.prototype.getId = function() {
        return this._id;
    };

    /**
     * @private
     */
    Polyline.prototype.getPickId = function(context) {
        if (!defined(this._pickId)) {
            this._pickId = context.createPickId({
                primitive : defaultValue(this._pickIdThis, this),
                collection: this._polylineCollection,
                id : this._id
            });
        }
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
