define([
    '../Core/ApproximateTerrainHeights',
    '../Core/Cartesian3',
    '../Core/defaultValue',
    '../Core/defined',
    '../Core/defineProperties',
    '../Core/isArray',
    '../Core/DeveloperError',
    '../Core/Event',
    '../Core/JulianDate',
    '../Core/Rectangle',
    './Property'
], function(
    ApproximateTerrainHeights,
    Cartesian3,
    defaultValue,
    defined,
    defineProperties,
    isArray,
    DeveloperError,
    Event,
    JulianDate,
    Rectangle,
    Property) {
    'use strict';

    /**
     * A {@link Property} which evaluates to a {@link Number} based on the minimum height of terrain
     * within the bounds of the provided positions.
     *
     * @alias MinimumTerrainHeightProperty
     * @constructor
     *
     * @param {Property} [positions] A Property specifying the {@link PolygonHierarchy} or an array of {@link Cartesian3} positions.
     *
     * @example
     * var hierarchy = new Cesium.ConstantProperty(polygonPositions);
     * var redPolygon = viewer.entities.add({
     *     polygon : {
     *         hierarchy : hierarchy,
     *         material : Cesium.Color.RED,
     *         height : 1800.0,
     *         extrudedHeight : new Cesium.MinimumTerrainHeightProperty(hierarchy)
     *     }
     * });
     */
    function MinimumTerrainHeightProperty(positions) {
        this._positions = undefined;
        this._subscription = undefined;
        this._definitionChanged = new Event();

        this.positions = positions;
    }

    defineProperties(MinimumTerrainHeightProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.
         * @memberof MinimumTerrainHeightProperty.prototype
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
         * @memberof MinimumTerrainHeightProperty.prototype
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
         * Gets or sets the positions property used to compute the value.
         * @memberof MinimumTerrainHeightProperty.prototype
         *
         * @type {Property}
         */
        positions : {
            get : function() {
                return this._positions;
            },
            set : function(value) {
                var oldValue = this._positions;
                if (oldValue !== value) {
                    if (defined(oldValue)) {
                        this._subscription();
                    }

                    this._positions = value;

                    if (defined(value)) {
                        this._subscription = value._definitionChanged.addEventListener(function() {
                            this._definitionChanged.raiseEvent(this);
                        }, this);
                    }

                    this._definitionChanged.raiseEvent(this);
                }
            }
        }
    });

    /**
     * Gets the minimum terrain height based on the positions positions at the provided time.
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @returns {Number} The minimum terrain height
     */
    MinimumTerrainHeightProperty.prototype.getValue = function(time) {
        return this._getValue(time);
    };

    /**
     * @private
     */
    MinimumTerrainHeightProperty.prototype._getValue = function(time) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required');
        }
        //>>includeEnd('debug');

        var property = this._positions;
        if (!defined(property)) {
            return;
        }
        var positions = property.getValue(time);
        if (!defined(positions)) {
            return;
        }
        if (!isArray(positions)) {
            positions = positions.positions; //positions is a PolygonHierarchy, just use the outer ring
        }
        var rectangle = Rectangle.fromCartesianArray(positions);
        return ApproximateTerrainHeights.getApproximateTerrainHeights(rectangle).minimumTerrainHeight;
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    MinimumTerrainHeightProperty.prototype.equals = function(other) {
        return this === other ||//
               (other instanceof MinimumTerrainHeightProperty &&
                Property.equals(this._positions, other._positions));
    };

    return MinimumTerrainHeightProperty;
});
