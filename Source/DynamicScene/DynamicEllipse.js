/*global define*/
define(['../Core/Cartesian3',
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/Event',
        '../Core/Shapes',
        './createDynamicPropertyDescriptor'
    ], function(
        Cartesian3,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Ellipsoid,
        Event,
        Shapes,
        createDynamicPropertyDescriptor) {
    "use strict";

    /**
     * An optionally time-dynamic ellipse.
     *
     * @alias DynamicEllipse
     * @constructor
     */
    var DynamicEllipse = function() {
        this._semiMajorAxis = undefined;
        this._semiMinorAxis = undefined;
        this._rotation = undefined;
        this._lastPosition = undefined;
        this._lastSemiMajorAxis = undefined;
        this._lastSemiMinorAxis = undefined;
        this._lastRotation = undefined;
        this._cachedVertexPositions = undefined;
        this._propertyChanged = new Event();
    };

    defineProperties(DynamicEllipse.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DynamicEllipse.prototype
         * @type {Event}
         */
        propertyChanged : {
            get : function() {
                return this._propertyChanged;
            }
        },

        /**
         * Gets or sets the numeric {@link Property} specifying the ellipse's semi-major-axis.
         * @memberof DynamicEllipse.prototype
         * @type {Property}
         */
        semiMajorAxis : createDynamicPropertyDescriptor('semiMajorAxis', '_semiMajorAxis'),

        /**
         * Gets or sets the numeric {@link Property} specifying the ellipse's semi-minor-axis.
         * @memberof DynamicEllipse.prototype
         * @type {Property}
         */
        semiMinorAxis : createDynamicPropertyDescriptor('semiMinorAxis', '_semiMinorAxis'),

        /**
         * Gets or sets the numeric {@link Property} specifying the ellipse's rotation.
         * @memberof DynamicEllipse.prototype
         * @type {Property}
         */
        rotation : createDynamicPropertyDescriptor('rotation', '_rotation')
    });

    /**
     * Duplicates a DynamicEllipse instance.
     * @memberof DynamicEllipse
     *
     * @param {DynamicEllipse} [result] The object onto which to store the result.
     * @returns {DynamicEllipse} The modified result parameter or a new instance if one was not provided.
     */
    DynamicEllipse.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new DynamicEllipse();
        }
        result.rotation = this.rotation;
        result.semiMajorAxis = this.semiMajorAxis;
        result.semiMinorAxis = this.semiMinorAxis;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     * @memberof DynamicEllipse
     *
     * @param {DynamicEllipse} source The object to be merged into this object.
     */
    DynamicEllipse.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.rotation = defaultValue(this.rotation, source.rotation);
        this.semiMajorAxis = defaultValue(this.semiMajorAxis, source.semiMajorAxis);
        this.semiMinorAxis = defaultValue(this.semiMinorAxis, source.semiMinorAxis);
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
        var semiMajorAxisProperty = this._semiMajorAxis;
        var semiMinorAxisProperty = this._semiMinorAxis;

        if (!defined(position) || //
            !defined(semiMajorAxisProperty) || //
            !defined(semiMinorAxisProperty)) {
            return undefined;
        }

        var semiMajorAxis = semiMajorAxisProperty.getValue(time);
        var semiMinorAxis = semiMinorAxisProperty.getValue(time);

        var rotation = 0.0;
        var rotationProperty = this._rotation;
        if (defined(rotationProperty)) {
            rotation = rotationProperty.getValue(time);
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
        var lastRotation = this._lastRotation;
        if (rotation !== lastRotation || //
            lastSemiMajorAxis !== semiMajorAxis || //
            lastSemiMinorAxis !== semiMinorAxis || //
            !Cartesian3.equals(lastPosition, position)) {

            //CZML_TODO The surface reference should come from CZML and not be hard-coded to Ellipsoid.WGS84.
            this._cachedVertexPositions = Shapes.computeEllipseBoundary(Ellipsoid.WGS84, position, semiMajorAxis, semiMinorAxis, rotation);
            this._lastPosition = Cartesian3.clone(position, this._lastPosition);
            this._lastRotation = rotation;
            this._lastSemiMajorAxis = semiMajorAxis;
            this._lastSemiMinorAxis = semiMinorAxis;
        }

        return this._cachedVertexPositions;
    };

    return DynamicEllipse;
});
