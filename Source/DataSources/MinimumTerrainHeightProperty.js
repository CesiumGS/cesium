define([
    '../Core/ApproximateTerrainHeights',
    '../Core/defined',
    '../Core/defineProperties',
    '../Core/isArray',
    '../Core/Check',
    '../Core/Event',
    '../Core/Rectangle',
    './createPropertyDescriptor',
    './Property'
], function(
    ApproximateTerrainHeights,
    defined,
    defineProperties,
    isArray,
    Check,
    Event,
    Rectangle,
    createPropertyDescriptor,
    Property) {
    'use strict';

    var scratchRectangle = new Rectangle();

    /**
     * A {@link Property} which evaluates to a Number based on the minimum height of terrain
     * within the bounds of the provided positions.
     *
     * @alias MinimumTerrainHeightProperty
     * @constructor
     *
     * @param {Property} [positions] A Property specifying an array of {@link Cartesian3} positions.
     *
     * @example
     * var polygonPositions = new Cesium.ConstantProperty(polygonPositions);
     * var redPolygon = viewer.entities.add({
     *     polygon : {
     *         hierarchy : polygonPositions,
     *         material : Cesium.Color.RED,
     *         height : 1800.0,
     *         extrudedHeight : new Cesium.MinimumTerrainHeightProperty(polygonPositions)
     *     }
     * });
     */
    function MinimumTerrainHeightProperty(positions) {
        this._positions = undefined;
        this._positionsSubscription = undefined;
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
        positions : createPropertyDescriptor('positions')
    });

    /**
     * Gets the minimum terrain height based on the positions at the provided time.
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @returns {Number} The minimum terrain height
     */
    MinimumTerrainHeightProperty.prototype.getValue = function(time) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('time', time);
        //>>includeEnd('debug');

        var positions = Property.getValueOrUndefined(this._positions, time);
        if (!defined(positions)) {
            return;
        }
        var rectangle = Rectangle.fromCartesianArray(positions, undefined, scratchRectangle);
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
