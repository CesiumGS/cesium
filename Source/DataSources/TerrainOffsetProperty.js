define([
    '../Core/Cartesian3',
    '../Core/Cartographic',
    '../Core/Check',
    '../Core/defined',
    '../Core/defineProperties',
    '../Core/destroyObject',
    '../Core/Event',
    '../Core/Iso8601',
    '../Core/Math',
    '../Scene/HeightReference',
    './Property'
], function(
    Cartesian3,
    Cartographic,
    Check,
    defined,
    defineProperties,
    destroyObject,
    Event,
    Iso8601,
    CesiumMath,
    HeightReference,
    Property) {
    'use strict';

    var scratchPosition = new Cartesian3();
    var scratchCarto = new Cartographic();

    /**
     * @private
     * @param {Scene} scene
     * @param {Property} height
     * @param {Property} extrudedHeight
     * @param {TerrainOffsetProperty~PositionFunction} getPosition
     * @constructor
     */
    function TerrainOffsetProperty(scene, height, extrudedHeight, getPosition) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('scene', scene);
        Check.typeOf.func('getPosition', getPosition);
        //>>includeEnd('debug');

        this._scene = scene;
        this._height = height;
        this._extrudedHeight = extrudedHeight;
        this._getPosition = getPosition;

        this._position = new Cartesian3();
        this._cartographicPosition = new Cartographic();
        this._normal = new Cartesian3();

        this._definitionChanged = new Event();
        this._terrainHeight = 0;
        this._removeCallbackFunc = undefined;
        this._removeEventListener = undefined;
        this._removeModeListener = undefined;

        var that = this;
        if (defined(scene.globe)) {
            this._removeEventListener = scene.terrainProviderChanged.addEventListener(function() {
                that._updateClamping();
            });
            this._removeModeListener = scene.morphComplete.addEventListener(function() {
                that._updateClamping();
            });
        }
    }

    defineProperties(TerrainOffsetProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.
         * @memberof TerrainOffsetProperty.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isConstant : {
            get : function() {
                return false;
            }
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * @memberof TerrainOffsetProperty.prototype
         *
         * @type {Event}
         * @readonly
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        }
    });

    /**
     * @private
     */
    TerrainOffsetProperty.prototype._updateClamping = function() {
        if (defined(this._removeCallbackFunc)) {
            this._removeCallbackFunc();
        }

        var scene = this._scene;
        var globe = scene.globe;
        var position = this._position;

        if (!defined(globe) || Cartesian3.equals(position, Cartesian3.ZERO)) {
            this._terrainHeight = 0;
            return;
        }
        var ellipsoid = globe.ellipsoid;
        var surface = globe._surface;

        var that = this;
        var cartographicPosition = ellipsoid.cartesianToCartographic(position, this._cartographicPosition);
        var height = globe.getHeight(cartographicPosition);
        if (defined(height)) {
            this._terrainHeight = height;
        } else {
            this._terrainHeight = 0;
        }

        function updateFunction(clampedPosition) {
            var carto = ellipsoid.cartesianToCartographic(clampedPosition, scratchCarto);
            that._terrainHeight = carto.height;
            that.definitionChanged.raiseEvent();
        }
        this._removeCallbackFunc = surface.updateHeight(cartographicPosition, updateFunction);
    };

    /**
     * Gets the height relative to the terrain based on the positions.
     *
     * @returns {Cartesian3} The offset
     */
    TerrainOffsetProperty.prototype.getValue = function(time, result) {
        var heightProperty = this._height;
        var extrudedHeightProperty = this._extrudedHeight;
        var heightReference = HeightReference.NONE;
        var extrudedHeightReference = HeightReference.NONE;

        var heightValue = Property.getValueOrUndefined(heightProperty, time);
        if (defined(heightValue) && defined(heightValue.heightReference)) {
            heightReference = heightValue.heightReference;
        }

        var extrudedHeightValue = Property.getValueOrUndefined(extrudedHeightProperty, time);
        if (defined(extrudedHeightValue) && defined(extrudedHeightValue.heightReference)) {
            extrudedHeightReference = extrudedHeightValue.heightReference;
        }

        if (heightReference === HeightReference.NONE && extrudedHeightReference !== HeightReference.RELATIVE_TO_GROUND) {
            this._position = Cartesian3.clone(Cartesian3.ZERO, this._position);
            return Cartesian3.clone(Cartesian3.ZERO, result);
        }

        var scene = this._scene;
        var position = this._getPosition(time, scratchPosition);
        if (!defined(position) || Cartesian3.equals(position, Cartesian3.ZERO) || !defined(scene.globe)) {
            return Cartesian3.clone(Cartesian3.ZERO, result);
        }

        if (Cartesian3.equalsEpsilon(this._position, position, CesiumMath.EPSILON10)) {
            return Cartesian3.multiplyByScalar(this._normal, this._terrainHeight, result);
        }

        this._position = Cartesian3.clone(position, this._position);

        this._updateClamping();

        var normal = scene.globe.ellipsoid.geodeticSurfaceNormal(position, this._normal);
        return Cartesian3.multiplyByScalar(normal, this._terrainHeight, result);
    };

    TerrainOffsetProperty.prototype.isDestroyed = function() {
        return false;
    };

    TerrainOffsetProperty.prototype.destroy = function() {
        if (defined(this._removeEventListener)) {
            this._removeEventListener();
        }
        if (defined(this._removeModeListener)) {
            this._removeModeListener();
        }
        if (defined(this._removeCallbackFunc)) {
            this._removeCallbackFunc();
        }
        return destroyObject(this);
    };

    /**
     * A function which creates one or more providers.
     * @callback TerrainOffsetProperty~PositionFunction
     * @param {JulianDate} time The clock time at which to retrieve the position
     * @param {Cartesian3} result The result position
     * @returns {Cartesian3} The position at which to do the terrain height check
     */

    return TerrainOffsetProperty;
});
