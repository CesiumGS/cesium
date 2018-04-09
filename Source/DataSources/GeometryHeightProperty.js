define([
    '../Core/ApproximateTerrainHeights',
    '../Core/defineProperties',
    '../Core/Check',
    '../Core/Event',
    '../Scene/HeightReference',
    './createPropertyDescriptor',
    './Property'
], function(
    ApproximateTerrainHeights,
    defineProperties,
    Check,
    Event,
    HeightReference,
    createPropertyDescriptor,
    Property) {
    'use strict';

    /**
     * A {@link Property} which computes height or extrudedHeight for a {@link CorridorGraphics}, {@link EllipseGraphics}, {@link PolygonGraphics} or {@link RectangleGraphics}.
     *
     * @alias GeometryHeightProperty
     * @constructor
     *
     * @param {Property} [height] A Property specifying the height in meters
     * @param {Property} [heightReference=HeightReference.NONE] A Property specifying what the height is relative to.
     *
     * @example
     * // A 40 meter tall extruded polygon clamped to terrain
     * var redPolygon = viewer.entities.add({
     *     polygon : {
     *         hierarchy : polygonPositions,
     *         material : Cesium.Color.RED,
     *         height : Cesium.GeometryHeightProperty(40.0, Cesium.HeightReference.RELATIVE_TO_GROUND),
     *         extrudedHeight : Cesium.GeometryHeightProperty(0.0, Cesium.HeightReference.CLAMP_TO_GROUND)
     *     }
     * });
     *
     * // An flat ellipse at 20 meters above terrain (does not contour to terrain)
     * var blueEllipse = viewer.entities.add({
     *     position: Cesium.Cartesian3.fromDegrees(-110.0, 43.0),
     *     ellipse : {
     *         semiMinorAxis : 300.0,
     *         semiMajorAxis : 200.0,
     *         material : Cesium.Color.BLUE,
     *         height : new Cesium.GeometryHeightProperty(20.0, Cesium.HeightReference.RELATIVE_TO_GROUND)
     *     }
     * });
     */
    function GeometryHeightProperty(height, heightReference) {
        this._height = undefined;
        this._heightSubscription = undefined;
        this._heightReference = undefined;
        this._heightReferenceSubscription = undefined;
        this._definitionChanged = new Event();

        this.height = height;
        this.heightReference = heightReference;
    }

    defineProperties(GeometryHeightProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.
         * @memberof GeometryHeightProperty.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isConstant : {
            get : function() {
                return Property.isConstant(this._positions) && Property.isConstant(this._heightReference);
            }
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * @memberof GeometryHeightProperty.prototype
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
         * Gets or sets the property used to compute the height.
         * @memberof GeometryHeightProperty.prototype
         *
         * @type {Property}
         */
        height : createPropertyDescriptor('height'),
        /**
         * Gets or sets the property used to define the height reference.
         * @memberof GeometryHeightProperty.prototype
         *
         * @type {Property}
         */
        heightReference : createPropertyDescriptor('heightReference')
    });

    /**
     * Gets the minimum terrain height based on the positions at the provided time.
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @returns {Number} The minimum terrain height
     */
    GeometryHeightProperty.prototype.getValue = function(time) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('time', time);
        //>>includeEnd('debug');

        var heightReference = Property.getValueOrDefault(this._heightReference, time, HeightReference.NONE);

        if (heightReference !== HeightReference.CLAMP_TO_GROUND) {
            return Property.getValueOrUndefined(this._height, time);
        }
        return 0;
    };

    /**
     * Used to get the minimum terrain value for when extrudedHeight is using CLAMP_TO_GROUND;
     * @private
     */
    GeometryHeightProperty.getMinimumTerrainValue = function(rectangle) {
        //>>includeStart('debug', pragmas.debug);
        Check.defined('rectangle', rectangle);
        //>>includeEnd('debug');
        return ApproximateTerrainHeights.getApproximateTerrainHeights(rectangle).minimumTerrainHeight;
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    GeometryHeightProperty.prototype.equals = function(other) {
        return this === other ||//
               (other instanceof GeometryHeightProperty &&
                Property.equals(this._height, other._height) &&
                Property.equals(this._heightReference, other._heightReference));
    };

    return GeometryHeightProperty;
});
