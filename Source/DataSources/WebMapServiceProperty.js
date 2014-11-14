/*global define*/
define([
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/Event',
        '../Scene/WebMapServiceImageryProvider',
        './createPropertyDescriptor',
        './Property'
    ], function(
        defined,
        defineProperties,
        Event,
        WebMapServiceImageryProvider,
        createPropertyDescriptor,
        Property) {
    "use strict";

    /**
     * A {@link Property} that maps to a {@link WebMapServiceImageryProvider}.
     *
     * @alias WebMapServiceProperty
     * @constructor
     */
    var WebMapServiceProperty = function() {
        this._definitionChanged = new Event();
        this._url = undefined;
        this._urlSubscription = undefined;
        this._layers = undefined;
        this._layersSubscription = undefined;
        this._parameters = undefined;
        this._parametersSubscription = undefined;
    };

    defineProperties(WebMapServiceProperty.prototype, {
        /**
         * Gets a value indicating if this property is constant.  A property is considered
         * constant if getValue always returns the same result for the current definition.
         * @memberof WebMapServiceProperty.prototype
         *
         * @type {Boolean}
         * @readonly
         */
        isConstant : {
            get : function() {
                return Property.isConstant(this._url) &&
                       Property.isConstant(this._layers);
            }
        },
        /**
         * Gets the event that is raised whenever the definition of this property changes.
         * The definition is considered to have changed if a call to getValue would return
         * a different result for the same time.
         * @memberof WebMapServiceProperty.prototype
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
         * A string {@link Property} that defines the base URL of the WMS server.
         * @memberof WebMapServiceProperty.prototype
         * @type {Property}
         */
        url : createPropertyDescriptor('url'),
        /**
         * A string {@link Property} that defines the layer or layers to access on the WMS server.
         * To specify multiple layers, separate them with commas.
         * @memberof WebMapServiceProperty.prototype
         * @type {Property}
         */
        layers : createPropertyDescriptor('layers'),
        /**
         * Additional parameters to be passed to the WMS server
         * @memberof WebMapServiceProperty.prototype
         * @type {Object}
         */
        parameters : createPropertyDescriptor('parameters')
    });

    /**
     * Gets the {@link ImageryProvider} type at the provided time.
     *
     * @param {JulianDate} time The time for which to retrieve the type.
     * @returns {String} The type of material.
     */
    WebMapServiceProperty.prototype.getType = function(time) {
        return 'WebMapServiceImageryProvider';
    };

    /**
     * Gets the value of the property at the provided time.
     *
     * @param {JulianDate} time The time for which to retrieve the value.
     * @param {Object} [result] The object to store the value into, if omitted, a new instance is created and returned.
     * @returns {Object} The modified result parameter or a new instance if the result parameter was not supplied.
     */
    WebMapServiceProperty.prototype.getValue = function(time, result) {
        return this;
    };

    /**
     * Compares this property to the provided property and returns
     * <code>true</code> if they are equal, <code>false</code> otherwise.
     *
     * @param {Property} [other] The other property.
     * @returns {Boolean} <code>true</code> if left and right are equal, <code>false</code> otherwise.
     */
    WebMapServiceProperty.prototype.equals = function(other) {
        return this === other || //
               (other instanceof WebMapServiceProperty && //
                Property.equals(this._url, other._url) && //
                Property.equals(this._layers, other._layers));
    };

    /**
     * @private
     */
    WebMapServiceProperty.prototype._raiseDefinitionChanged = function() {
        this._definitionChanged.raiseEvent(this);
    };

    return WebMapServiceProperty;
});
