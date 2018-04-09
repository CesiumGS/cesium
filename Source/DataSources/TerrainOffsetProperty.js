define([
    '../Core/Cartesian3',
    '../Core/Check',
    '../Core/defined',
    '../Core/defineProperties',
    '../Core/Event',
    '../Core/Iso8601',
    './Property'
], function(
    Cartesian3,
    Check,
    defined,
    defineProperties,
    Event,
    Iso8601,
    Property) {
    'use strict';

    /**
     * @private
     * @param {Scene} scene
     * @param {Property} [position]
     * @constructor
     */
    function TerrainOffsetProperty(scene, position) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('scene', scene);
        //>>includeEnd('debug');

        this._position = undefined;
        this._subscription = undefined;
        this._definitionChanged = new Event();

        this._scene = scene;
        this._terrainHeight = 0;
        this._removeCallbackFunc = undefined;

        this.position = position;
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
        },
        /**
         * Gets or sets the position property used to compute the value.
         * @memberof TerrainOffsetProperty.prototype
         *
         * @type {PositionProperty}
         */
        position : {
            get : function() {
                return this._position;
            },
            set : function(value) {
                var oldValue = this._positions;
                if (oldValue !== value) {
                    if (defined(oldValue)) {
                        this._subscription();
                    }

                    this._position = value;

                    if (defined(value)) {
                        this._subscription = value._definitionChanged.addEventListener(function() {
                            this._updateClamping();
                        }, this);
                    }

                    this._updateClamping();
                }
            }
        }
    });

    /**
     * @private
     */
    TerrainOffsetProperty.prototype._updateClamping = function() {
        var scene = this._scene;
        var globe = scene.globe;
        if (!defined(globe)) {
            this._terrainHeight = 0;
            return;
        }
        var ellipsoid = globe.ellipsoid;
        var surface = globe._surface;

        var property = this._position;
        var position = Property.getValueOrUndefined(property, Iso8601.MINIMUM_VALUE); //TODO: what do I do for time varying position?
        if (!defined(position)) {
            return;
        }

        if (defined(this._removeCallbackFunc)) {
            this._removeCallbackFunc();
        }

        var that = this;
        var cartographicPosition = ellipsoid.cartesianToCartographic(position); //TODO result param

        function updateFunction(clampedPosition) {
            var cartPosition = ellipsoid.cartesianToCartographic(clampedPosition); // TODO result
            that._terrainHeight = cartPosition.height;
        }
        this._removeCallbackFunc = surface.updateHeight(cartographicPosition, updateFunction);

        var height = globe.getHeight(cartographicPosition);
        if (defined(height)) {
            this._terrainHeight = height;
        } else {
            this._terrainHeight = 0;
        }
    };

    var normalScratch = new Cartesian3();
    /**
     * Gets the height relative to the terrain based on the positions.
     *
     * @returns {Number} The height relative to terrain
     */
    TerrainOffsetProperty.prototype.getValue = function(time, result) {
        var position = Property.getValueOrUndefined(this._position, time);
        if (!defined(position)) {
            return;
        }
        var normal = this._scene.globe.ellipsoid.geodeticSurfaceNormal(position, normalScratch);
        return Cartesian3.multiplyByScalar(normal, this._terrainHeight, result);
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    TerrainOffsetProperty.prototype.equals = function(other) {
        return this === other ||//
               (other instanceof TerrainOffsetProperty &&
                this._scene === other._scene &&
                Property.equals(this._position, other._position));
    };

    return TerrainOffsetProperty;
});
