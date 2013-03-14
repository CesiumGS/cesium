/*global define*/
define([
        '../Core/TimeInterval',
        '../Core/defaultValue',
        '../Core/Shapes',
        './CzmlBoolean',
        './CzmlCartesian3',
        './CzmlColor',
        './CzmlNumber',
        './DynamicProperty',
        './DynamicMaterialProperty'
        ], function (
                TimeInterval,
                defaultValue,
                Shapes,
                CzmlBoolean,
                CzmlCartesian3,
                CzmlColor,
                CzmlNumber,
                DynamicProperty,
                DynamicMaterialProperty) {
    "use strict";

    /**
     * Represents a time-dynamic ellipse, typically used in conjunction with DynamicEllipseVisualizer and
     * DynamicObjectCollection to visualize CZML.
     *
     * @alias DynamicEllipse
     * @constructor
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see DynamicEllipseVisualizer
     * @see VisualizerCollection
     * @see CzmlDefaults
     */
    var DynamicEllipse = function () {
        /**
         * A DynamicProperty of type CzmlNumber which determines the ellipse's semiMajorAxis.
         * @type DynamicProperty
         */
        this.semiMajorAxis = undefined;
        /**
         * A DynamicProperty of type CzmlNumber which determines the ellipse's semiMinorAxis.
         * @type DynamicProperty
         */
        this.semiMinorAxis = undefined;

        /**
         * A DynamicProperty of type CzmlNumber which determines the bearing of the ellipse.
         * @type DynamicProperty
         */
        this.bearing = undefined;

        this._cachedPosition = undefined;
        this._cachedSemiMajorAxis = 0;
        this._cachedSemiMinorAxis = 0;
        this._cachedBearing = 0;
        this._cachedVertexPositions = undefined;
    };

    /**
     * Processes a single CZML packet and merges its data into the provided DynamicObject's ellipse.
     * If the DynamicObject does not have a ellipse, one is created.  This method is not
     * normally called directly, but is part of the array of CZML processing functions that is
     * passed into the DynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject which will contain the ellipse data.
     * @param {Object} packet The CZML packet to process.
     * @param {DynamicObject} dynamicObjectCollection The DynamicObjectCollection to which the DynamicObject belongs.
     *
     * @returns {Boolean} true if any new properties were created while processing the packet, false otherwise.
     *
     * @see DynamicObject
     * @see DynamicProperty
     * @see DynamicObjectCollection
     * @see CzmlDefaults#updaters
     */
    DynamicEllipse.processCzmlPacket = function (dynamicObject, packet, dynamicObjectCollection) {
        var ellipseData = packet.ellipse;
        if (typeof ellipseData === 'undefined') {
            return false;
        }

        var ellipseUpdated = false;
        var ellipse = dynamicObject.ellipse;
        ellipseUpdated = typeof ellipse === 'undefined';
        if (ellipseUpdated) {
            dynamicObject.ellipse = ellipse = new DynamicEllipse();
        }

        var interval = ellipseData.interval;
        if (typeof interval !== 'undefined') {
            interval = TimeInterval.fromIso8601(interval);
        }

        if (typeof ellipseData.bearing !== 'undefined') {
            var bearing = ellipse.bearing;
            if (typeof bearing === 'undefined') {
                ellipse.bearing = bearing = new DynamicProperty(CzmlNumber);
                ellipseUpdated = true;
            }
            bearing.processCzmlIntervals(ellipseData.bearing, interval);
        }

        if (typeof ellipseData.semiMajorAxis !== 'undefined') {
            var semiMajorAxis = ellipse.semiMajorAxis;
            if (typeof semiMajorAxis === 'undefined') {
                ellipse.semiMajorAxis = semiMajorAxis = new DynamicProperty(CzmlNumber);
                ellipseUpdated = true;
            }
            semiMajorAxis.processCzmlIntervals(ellipseData.semiMajorAxis, interval);
        }

        if (typeof ellipseData.semiMinorAxis !== 'undefined') {
            var semiMinorAxis = ellipse.semiMinorAxis;
            if (typeof semiMinorAxis === 'undefined') {
                ellipse.semiMinorAxis = semiMinorAxis = new DynamicProperty(CzmlNumber);
                ellipseUpdated = true;
            }
            semiMinorAxis.processCzmlIntervals(ellipseData.semiMinorAxis, interval);
        }

        return ellipseUpdated;
    };

    /**
     * Given two DynamicObjects, takes the ellipse properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     *
     * @see CzmlDefaults
     */
    DynamicEllipse.mergeProperties = function (targetObject, objectToMerge) {
        var ellipseToMerge = objectToMerge.ellipse;
        if (typeof ellipseToMerge !== 'undefined') {

            var targetEllipse = targetObject.ellipse;
            if (typeof targetEllipse === 'undefined') {
                targetObject.ellipse = targetEllipse = new DynamicEllipse();
            }

            targetEllipse.bearing = defaultValue(targetEllipse.bearing, ellipseToMerge.bearing);
            targetEllipse.semiMajorAxis = defaultValue(targetEllipse.semiMajorAxis, ellipseToMerge.semiMajorAxis);
            targetEllipse.semiMinorAxis = defaultValue(targetEllipse.semiMinorAxis, ellipseToMerge.semiMinorAxis);
        }
    };

    /**
     * Given a DynamicObject, undefines the ellipse associated with it.
     * This method is not normally called directly, but is part of the array of CZML processing
     * functions that is passed into the CompositeDynamicObjectCollection constructor.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the ellipse from.
     *
     * @see CzmlDefaults
     */
    DynamicEllipse.undefineProperties = function (dynamicObject) {
        dynamicObject.ellipse = undefined;
    };

    /**
     * Gets an array of vertex positions for the ellipse at the provided time.
     *
     * @param {JulianDate} time The desired time.
     * @param {Ellipsoid} ellipsoid The ellipsoid on which the ellipse will be on.
     * @param {DynamicObject} positionProperty The DynamicObject which contains the position data.
     * @returns An array of vertex positions.
     */
    DynamicEllipse.prototype.getValue = function(time, ellipsoid, positionProperty){
        var position = defaultValue(positionProperty.getValueCartesian(time, position), this._cachedPosition);
        var semiMajorAxisProperty = this.semiMajorAxis;
        var semiMinorAxisProperty = this.semiMinorAxis;
        var bearingProperty = this.bearing;
        if(typeof semiMajorAxisProperty === 'undefined' && typeof semiMinorAxisProperty === 'undefined' ){
            return;
        }
        var semiMajorAxis = defaultValue(semiMajorAxisProperty.getValue(time, semiMajorAxis), this._cachedSemiMajorAxis);
        var semiMinorAxis = defaultValue(semiMinorAxisProperty.getValue(time, semiMinorAxis), this._cachedSemiMinorAxis);
        var bearing = 0.00;
        if(bearingProperty !== 'undefined'){
            bearing = defaultValue(bearingProperty.getValue(time, bearing), this._cachedBearing);
        }
        if (typeof position !== 'undefined' &&
                typeof bearing !== 'undefined' &&
                typeof semiMajorAxis !== 'undefined' &&
                typeof semiMinorAxis !== 'undefined' &&
                semiMajorAxis !== 0.0 &&
                semiMinorAxis !== 0.0 &&
                (!position.equals(this._cachedPosition) ||
                        bearing !== this._cachedBearing ||
                        semiMajorAxis !== this._cachedSemiMajorAxis ||
                        semiMinorAxis !== this._cachedSemiMinorAxis)) {
            this._cachedPosition = position;
            this._cachedBearing = bearing;
            this._cachedSemiMajorAxis = semiMajorAxis;
            this._cachedSemiMinorAxis = semiMinorAxis;
            this._cachedVertexPositions = Shapes.computeEllipseBoundary(ellipsoid, position, semiMajorAxis, semiMinorAxis, bearing);
        }
        return this._cachedVertexPositions;
    };

    return DynamicEllipse;
});
