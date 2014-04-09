/*global define*/
define([
        '../../Core/defineProperties',
        '../../Core/defined',
        '../../Core/DeveloperError',
        '../createCommand',
        '../../ThirdParty/knockout'
    ], function(
        defineProperties,
        defined,
        DeveloperError,
        createCommand,
        knockout) {
    "use strict";

    /**
     * A view model that represents each item in the BaseLayerPicker.
     *
     * @alias ImageryProviderViewModel
     * @constructor
     *
     * @param {Object} description The object containing all parameters.
     * @param {String} description.name The name of the layer.
     * @param {String} description.tooltip The tooltip to show when the item is moused over.
     * @param {String} description.iconUrl An icon representing the layer.
     * @param {Function|Command} description.creationFunction A function or Command which creates the ImageryProvider or array of ImageryProviders to be added to the layers collection.
     *
     * @see BaseLayerPicker
     * @see ImageryProvider
     */
    var ImageryProviderViewModel = function(description) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(description.name)) {
            throw new DeveloperError('description.name is required.');
        }
        if (!defined(description.tooltip)) {
            throw new DeveloperError('description.tooltip is required.');
        }
        if (!defined(description.iconUrl)) {
            throw new DeveloperError('description.iconUrl is required.');
        }
        if (typeof description.creationFunction !== 'function') {
            throw new DeveloperError('description.creationFunction is required.');
        }
        //>>includeEnd('debug');

        var creationCommand = description.creationFunction;
        if (!defined(creationCommand.canExecute)) {
            creationCommand = createCommand(creationCommand);
        }

        this._creationCommand = creationCommand;

        /**
         * Gets the display name.  This property is observable.
         * @type {String}
         */
        this.name = description.name;

        /**
         * Gets the tooltip.  This property is observable.
         * @type {String}
         */
        this.tooltip = description.tooltip;

        /**
         * Gets the icon.  This property is observable.
         * @type {String}
         */
        this.iconUrl = description.iconUrl;

        knockout.track(this, ['name', 'tooltip', 'iconUrl']);
    };

    defineProperties(ImageryProviderViewModel.prototype, {
        /**
         * Gets the Command called to create the imagery provider or array of
         * imagery providers to be added to the bottom of the layer collection.
         * @memberof ImageryProviderViewModel.prototype
         *
         * @type {Command}
         */
        creationCommand : {
            get : function() {
                return this._creationCommand;
            }
        }
    });

    return ImageryProviderViewModel;
});
