define([
    '../Core/ApproximateTerrainHeights',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/defineProperties',
    '../Core/isArray',
    '../Core/Cartesian3',
    '../Core/Cartographic',
    '../Core/Check',
    '../Core/Event',
    '../Core/Iso8601',
    '../Core/Rectangle',
    '../Core/RuntimeError',
    '../Core/sampleTerrainMostDetailed',
    './createPropertyDescriptor',
    './Property'
], function(
    ApproximateTerrainHeights,
    defaultValue,
    defined,
    defineProperties,
    isArray,
    Cartesian3,
    Cartographic,
    Check,
    Event,
    Iso8601,
    Rectangle,
    RuntimeError,
    sampleTerrainMostDetailed,
    createPropertyDescriptor,
    Property) {
    'use strict';

    /**
     * A {@link Property} which evaluates to a Number based on the height of terrain
     * within the bounds of the provided positions.
     *
     * @alias RelativeToTerrainHeightProperty
     * @constructor
     *
     * @param {TerrainProvider} terrainProvider The terrain provider used on the globe
     * @param {PositionProperty} position A Property specifying the position the height should be relative to.
     * @param {Property} [heightRelativeToTerrain] A Property specifying the numeric height value relative to terrain
     *
     * @example
     * var hierarchy = new Cesium.ConstantProperty(polygonPositions);
     * var redPolygon = viewer.entities.add({
     *     polygon : {
     *         hierarchy : hierarchy,
     *         material : Cesium.Color.RED,
     *         height : new Cesium.RelativeToTerrainHeightProperty(hierarchy, 11.0)
     *     }
     * });
     */
    function RelativeToTerrainHeightProperty(terrainProvider, position, heightRelativeToTerrain) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('terrainProvider', terrainProvider);
        //>>includeEnd('debug');

        this._position = undefined;
        this._subscription = undefined;
        this._heightRelativeToTerrain = undefined;
        this._heightRelativeToTerrainSubscription = undefined;
        this._definitionChanged = new Event();

        this._terrainProvider = terrainProvider;
        this._cartographicPosition = new Cartographic();
        this._terrainHeight = 0;

        this.position = position;
        this.heightRelativeToTerrain = heightRelativeToTerrain;
    }

    defineProperties(RelativeToTerrainHeightProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.
         * @memberof RelativeToTerrainHeightProperty.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isConstant : {
            get : function() {
                return Property.isConstant(this._positions);
            }
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * @memberof RelativeToTerrainHeightProperty.prototype
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
         * @memberof RelativeToTerrainHeightProperty.prototype
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
                        if (!value.isConstant) {
                            throw new RuntimeError('position must be a constant property');
                        }
                        this._subscription = value._definitionChanged.addEventListener(function() {
                            this._fetchTerrainHeight();
                        }, this);
                    }

                    this._fetchTerrainHeight();
                }
            }
        },
        heightRelativeToTerrain : createPropertyDescriptor('heightRelativeToTerrain')
    });

    /**
     * @private
     */
    RelativeToTerrainHeightProperty.prototype._fetchTerrainHeight = function() {
        this._terrainHeight = 0;
        var property = this._position;
        var position = Property.getValueOrUndefined(property, Iso8601.MINIMUM_VALUE);
        if (!defined(position)) {
            return;
        }

        var carto = Cartographic.fromCartesian(position, undefined, this._cartographicPosition);
        carto.height = 0.0;
        var that = this;
        sampleTerrainMostDetailed(this._terrainProvider, [carto])
            .then(function(results) {
                if (that._position !== property || !Cartesian3.equals(position, Property.getValueOrUndefined(that._position, Iso8601.MINIMUM_VALUE))) {
                    return;
                }
                that._terrainHeight = defaultValue(results[0].height, 0);
                that._definitionChanged.raiseEvent(that);
            });
    };

    /**
     * Gets the height relative to the terrain based on the positions.
     *
     * @returns {Number} The height relative to terrain
     */
    RelativeToTerrainHeightProperty.prototype.getValue = function(time) {
        return this._terrainHeight + Property.getValueOrDefault(this.heightRelativeToTerrain, time, 0);
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    RelativeToTerrainHeightProperty.prototype.equals = function(other) {
        return this === other ||//
               (other instanceof RelativeToTerrainHeightProperty &&
                Property.equals(this._position, other._position) &&
                Property.equals(this.heightRelativeToTerrain, other.heightRelativeToTerrain));
    };

    return RelativeToTerrainHeightProperty;
});
