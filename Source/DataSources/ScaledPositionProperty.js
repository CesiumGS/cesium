/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Ellipsoid',
        '../Core/Event',
        '../Core/ReferenceFrame',
        './Property'
    ], function(
        defined,
        defineProperties,
        DeveloperError,
        Ellipsoid,
        Event,
        ReferenceFrame,
        Property
        ) {
    "use strict";

    /**
     * This is a temporary class for scaling position properties to the WGS84 surface.
     * It will go away or be refactored to support data with arbitrary height references.
     * @private
     */
    var ScaledPositionProperty = function(value) {
        this._definitionChanged = new Event();
        this._value = undefined;
        this._removeSubscription = undefined;
        this.setValue(value);
    };

    defineProperties(ScaledPositionProperty.prototype, {
        isConstant : {
            get : function() {
                return Property.isConstant(this._value);
            }
        },
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },
        referenceFrame : {
            get : function() {
                return defined(this._value) ? this._value.referenceFrame : ReferenceFrame.FIXED;
            }
        }
    });

    ScaledPositionProperty.prototype.getValue = function(time, result) {
        return this.getValueInReferenceFrame(time, ReferenceFrame.FIXED, result);
    };

    ScaledPositionProperty.prototype.setValue = function(value) {
        if (this._value !== value) {
            this._value = value;

            if (defined(this._removeSubscription)) {
                this._removeSubscription();
                this._removeSubscription = undefined;
            }

            if (defined(value)) {
                this._removeSubscription = value.definitionChanged.addEventListener(this._raiseDefinitionChanged, this);
            }
            this._definitionChanged.raiseEvent(this);
        }
    };

    ScaledPositionProperty.prototype.getValueInReferenceFrame = function(time, referenceFrame, result) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(time)) {
            throw new DeveloperError('time is required.');
        }
        if (!defined(referenceFrame)) {
            throw new DeveloperError('referenceFrame is required.');
        }
        //>>includeEnd('debug');

        if (!defined(this._value)) {
            return undefined;
        }

        result = this._value.getValueInReferenceFrame(time, referenceFrame, result);
        return defined(result) ? Ellipsoid.WGS84.scaleToGeodeticSurface(result, result) : undefined;
    };

    ScaledPositionProperty.prototype.equals = function(other) {
        return this === other || (other instanceof ScaledPositionProperty && this._value === other._value);
    };

    ScaledPositionProperty.prototype._raiseDefinitionChanged = function() {
        this._definitionChanged.raiseEvent(this);
    };

    return ScaledPositionProperty;
});
