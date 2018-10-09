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
        Property) {
    'use strict';

        /**
             * This is a temporary class for scaling position properties to the WGS84 surface.
             * It will go away or be refactored to support data with arbitrary height references.
             * @private
             */
        class ScaledPositionProperty {
            constructor(value) {
                this._definitionChanged = new Event();
                this._value = undefined;
                this._removeSubscription = undefined;
                this.setValue(value);
            }
            getValue(time, result) {
                return this.getValueInReferenceFrame(time, ReferenceFrame.FIXED, result);
            }
            setValue(value) {
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
            }
            getValueInReferenceFrame(time, referenceFrame, result) {
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
            }
            equals(other) {
                return this === other || (other instanceof ScaledPositionProperty && this._value === other._value);
            }
            _raiseDefinitionChanged() {
                this._definitionChanged.raiseEvent(this);
            }
        }

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






    return ScaledPositionProperty;
});
