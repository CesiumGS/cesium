/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/Cartesian3',
        '../Core/Ellipsoid',
        '../Core/Shapes'
        ], function (
            defaultValue,
            defined,
            Cartesian3,
            Ellipsoid,
            Shapes) {
    "use strict";

    /**
     * An optionally time-dynamic ellipse.
     *
     * @alias DynamicEllipse
     * @constructor
     */
    var DynamicEllipse = function() {
        /**
         * Gets or sets the numeric {@link Property} specifying the ellipse's semi-major-axis.
         * @type {Property}
         */
        this.semiMajorAxis = undefined;
        /**
         * Gets or sets the numeric {@link Property} specifying the ellipse's semi-minor-axis.
         * @type {Property}
         */
        this.semiMinorAxis = undefined;

        /**
         * Gets or sets the numeric {@link Property} specifying the ellipse's bearing.
         * @type {Property}
         */
        this.bearing = undefined;

        this._lastPosition = undefined;
        this._lastSemiMajorAxis = undefined;
        this._lastSemiMinorAxis = undefined;
        this._lastBearing = undefined;
        this._cachedVertexPositions = undefined;
    };

    /**
     * Given two DynamicObjects, takes the ellipse properties from the second
     * and assigns them to the first, assuming such a property did not already exist.
     *
     * @param {DynamicObject} targetObject The DynamicObject which will have properties merged onto it.
     * @param {DynamicObject} objectToMerge The DynamicObject containing properties to be merged.
     */
    DynamicEllipse.mergeProperties = function(targetObject, objectToMerge) {
        var ellipseToMerge = objectToMerge.ellipse;
        if (defined(ellipseToMerge)) {

            var targetEllipse = targetObject.ellipse;
            if (!defined(targetEllipse)) {
                targetObject.ellipse = targetEllipse = new DynamicEllipse();
            }

            targetEllipse.bearing = defaultValue(targetEllipse.bearing, ellipseToMerge.bearing);
            targetEllipse.semiMajorAxis = defaultValue(targetEllipse.semiMajorAxis, ellipseToMerge.semiMajorAxis);
            targetEllipse.semiMinorAxis = defaultValue(targetEllipse.semiMinorAxis, ellipseToMerge.semiMinorAxis);
        }
    };

    /**
     * Given a DynamicObject, undefines the ellipse associated with it.
     *
     * @param {DynamicObject} dynamicObject The DynamicObject to remove the ellipse from.
     */
    DynamicEllipse.undefineProperties = function(dynamicObject) {
        dynamicObject.ellipse = undefined;
    };

    /**
     * Gets an array of vertex positions for the ellipse at the provided time.
     *
     * @param {JulianDate} time The desired time.
     * @param {Ellipsoid} ellipsoid The ellipsoid on which the ellipse will be on.
     * @param {Cartesian3} position The position of the ellipsoid.
     * @returns An array of vertex positions.
     */
    DynamicEllipse.prototype.getValue = function(time, position) {
        var semiMajorAxisProperty = this.semiMajorAxis;
        var semiMinorAxisProperty = this.semiMinorAxis;

        if (!defined(position) || //
            !defined(semiMajorAxisProperty) || //
            !defined(semiMinorAxisProperty)) {
            return undefined;
        }

        var semiMajorAxis = semiMajorAxisProperty.getValue(time);
        var semiMinorAxis = semiMinorAxisProperty.getValue(time);

        var bearing = 0.0;
        var bearingProperty = this.bearing;
        if (defined(bearingProperty)) {
            bearing = bearingProperty.getValue(time);
        }

        if (!defined(semiMajorAxis) || //
            !defined(semiMinorAxis) || //
            semiMajorAxis === 0.0 || //
            semiMinorAxis === 0.0) {
            return undefined;
        }

        var lastPosition = this._lastPosition;
        var lastSemiMajorAxis = this._lastSemiMajorAxis;
        var lastSemiMinorAxis = this._lastSemiMinorAxis;
        var lastBearing = this._lastBearing;
        if (bearing !== lastBearing || //
            lastSemiMajorAxis !== semiMajorAxis || //
            lastSemiMinorAxis !== semiMinorAxis || //
            !Cartesian3.equals(lastPosition, position)) {

            //CZML_TODO The surface reference should come from CZML and not be hard-coded to Ellipsoid.WGS84.
            this._cachedVertexPositions = Shapes.computeEllipseBoundary(Ellipsoid.WGS84, position, semiMajorAxis, semiMinorAxis, bearing);
            this._lastPosition = Cartesian3.clone(position, this._lastPosition);
            this._lastBearing = bearing;
            this._lastSemiMajorAxis = semiMajorAxis;
            this._lastSemiMinorAxis = semiMinorAxis;
        }

        return this._cachedVertexPositions;
    };

    return DynamicEllipse;
});
