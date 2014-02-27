/*global define*/
define(['../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        './createDynamicPropertyDescriptor'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        createDynamicPropertyDescriptor) {
    "use strict";

    /**
     * An optionally time-dynamic model.
     *
     * @alias DynamicModel
     * @constructor
     */
    var DynamicModel = function() {
        this._show = undefined;
        this._showSubscription = undefined;
        this._scale = undefined;
        this._scaleSubscription = undefined;
        this._uri = undefined;
        this._uriSubscription = undefined;
        this._definitionChanged = new Event();
    };

    defineProperties(DynamicModel.prototype, {
        /**
         * Gets the event that is raised whenever a new property is assigned.
         * @memberof DynamicPolygon.prototype
         * @type {Event}
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },

        /**
         * Gets or sets the boolean {@link Property} specifying the model's visibility.
         * @memberof DynamicModel.prototype
         * @type {Property}
         */
        show : createDynamicPropertyDescriptor('show'),
        /**
         * Gets or sets the {@Cartesian3} {@link Property} specifying the model's scale.
         * @memberof DynamicModel.prototype
         * @type {Property}
         */
        scale : createDynamicPropertyDescriptor('scale'),
        /**
         * Gets or sets the string {@link Property} specifying the model's uri.
         * @memberof DynamicModel.prototype
         * @type {Property}
         */
        uri : createDynamicPropertyDescriptor('uri')
    });

    /**
     * Duplicates a DynamicModel instance.
     * @memberof DynamicModel
     *
     * @param {DynamicModel} [result] The object onto which to store the result.
     * @returns {DynamicModel} The modified result parameter or a new instance if one was not provided.
     */
    DynamicModel.prototype.clone = function(result) {
        if (!defined(result)) {
            result = new DynamicModel();
        }
        result.show = this.show;
        result.scale = this.scale;
        result.uri = this.uri;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     * @memberof DynamicModel
     *
     * @param {DynamicModel} source The object to be merged into this object.
     */
    DynamicModel.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.show = defaultValue(this.show, source.show);
        this.scale = defaultValue(this.scale, source.scale);
        this.uri = defaultValue(this.uri, source.uri);
    };

    return DynamicModel;
});