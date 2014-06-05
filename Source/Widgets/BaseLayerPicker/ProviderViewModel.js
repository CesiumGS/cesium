/*global define*/
define([
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../ThirdParty/knockout',
        '../createCommand'
    ], function(
        defined,
        defineProperties,
        DeveloperError,
        knockout,
        createCommand) {
    "use strict";

    /**
     * A view model that represents each item in the BaseLayerPicker.
     *
     * @alias ProviderViewModel
     * @constructor
     *
     * @param {Object} options The object containing all parameters.
     * @param {String} options.name The name of the layer.
     * @param {String} options.tooltip The tooltip to show when the item is moused over.
     * @param {String} options.iconUrl An icon representing the layer.
     * @param {Function|Command} options.creationFunction A function or Command which creates the ImageryProvider or array of ImageryProviders to be added to the layers collection.
     *
     * @see BaseLayerPicker
     * @see ImageryProvider
     */
    var ProviderViewModel = function(options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(options.name)) {
            throw new DeveloperError('options.name is required.');
        }
        if (!defined(options.tooltip)) {
            throw new DeveloperError('options.tooltip is required.');
        }
        if (!defined(options.iconUrl)) {
            throw new DeveloperError('options.iconUrl is required.');
        }
        if (typeof options.creationFunction !== 'function') {
            throw new DeveloperError('options.creationFunction is required.');
        }
        //>>includeEnd('debug');

        var creationCommand = options.creationFunction;
        if (!defined(creationCommand.canExecute)) {
            creationCommand = createCommand(creationCommand);
        }

        this._creationCommand = creationCommand;

        /**
         * Gets the display name.  This property is observable.
         * @type {String}
         */
        this.name = options.name;

        /**
         * Gets the tooltip.  This property is observable.
         * @type {String}
         */
        this.tooltip = options.tooltip;

        /**
         * Gets the icon.  This property is observable.
         * @type {String}
         */
        this.iconUrl = options.iconUrl;

        knockout.track(this, ['name', 'tooltip', 'iconUrl']);
    };

    defineProperties(ProviderViewModel.prototype, {
        /**
         * Gets the Command called to create the imagery provider or array of
         * imagery providers to be added to the bottom of the layer collection.
         * @memberof ProviderViewModel.prototype
         *
         * @type {Command}
         */
        creationCommand : {
            get : function() {
                return this._creationCommand;
            }
        }
    });

    return ProviderViewModel;
});
