/*global define*/
define(['../createCommand',
        '../../Core/DeveloperError',
        '../../ThirdParty/knockout'
        ], function(
            createCommand,
            DeveloperError,
            knockout) {
    "use strict";

    /**
     * view model that represents each item in the BaseLayerPicker.
     *
     * @alias ImageryProviderViewModel
     * @constructor
     *
     * @param {Object} description The object containing all parameters.
     * @param {Observable} description.name The name of the layer.
     * @param {Observable} description.tooltip The tooltip to show when the item is moused over.
     * @param {Observable} description.iconUrl An icon representing the layer.
     * @param {Command} description.creationCommand A function which creates the ImageryProvider for adding to the layers collection.
     *
     * @exception {DeveloperError} description.name is required.
     * @exception {DeveloperError} description.tooltip is required.
     * @exception {DeveloperError} description.iconUrl is required.
     * @exception {DeveloperError} description.creationCommand is required.
     *
     * @see BaseLayerPicker
     * @see ImageryProvider
     */
    var ImageryProviderViewModel = function(description) {

        if (typeof description.name === 'undefined') {
            throw new DeveloperError('description.name is required.');
        }

        if (typeof description.tooltip === 'undefined') {
            throw new DeveloperError('description.tooltip is required.');
        }

        if (typeof description.iconUrl === 'undefined') {
            throw new DeveloperError('description.iconUrl is required.');
        }

        if (typeof description.creationCommand === 'undefined') {
            throw new DeveloperError('description.creationCommand is required.');
        }

        /**
         * Gets the display name.
         * @type String
         */
        this.name = description.name;

        /**
         * Gets the tooltip.
         * @type String
         */
        this.tooltip = description.tooltip;

        /**
         * Gets the icon.
         * @type String
         */
        this.iconUrl = description.iconUrl;

        this._creationCommand = description.creationCommand;

        knockout.track(this, ['name', 'tooltip', 'iconUrl']);
    };

    Object.defineProperties(ImageryProviderViewModel.prototype, {
        /**
         * Gets the Command called to create the imagery provider.
         * @memberof ImageryProviderViewModel.prototype
         *
         * @type Command
         */
        creationCommand : {
            get : function() {
                return this._creationCommand;
            }
        }
    });

    /**
     * Creates an instance from constant, non-observable values.
     * @memberof ImageryProviderViewModel
     *
     * @param {Object} description The object containing all parameters.
     * @param {string} description.name The name of the layer.
     * @param {string} description.tooltip The tooltip to show when the item is moused over.
     * @param {string} description.iconUrl An icon representing the layer.
     * @param {function} description.createFunction A function which creates the ImageryProvider for adding to the layers collection.
     *
     * @exception {DeveloperError} description.name is required.
     * @exception {DeveloperError} description.tooltip is required.
     * @exception {DeveloperError} description.iconUrl is required.
     * @exception {DeveloperError} description.creationFunction is required.
     */
    ImageryProviderViewModel.fromConstants = function(description) {
        if (typeof description.name === 'undefined') {
            throw new DeveloperError('description.name is required.');
        }

        if (typeof description.tooltip === 'undefined') {
            throw new DeveloperError('description.tooltip is required.');
        }

        if (typeof description.iconUrl === 'undefined') {
            throw new DeveloperError('description.iconUrl is required.');
        }

        if (typeof description.creationFunction === 'undefined') {
            throw new DeveloperError('description.creationFunction is required.');
        }

        return new ImageryProviderViewModel({
            name : knockout.observable(description.name),
            tooltip : knockout.observable(description.tooltip),
            iconUrl : knockout.observable(description.iconUrl),
            creationCommand : createCommand(description.creationFunction)
        });
    };

    return ImageryProviderViewModel;
});