/*global define*/
define(['../../Core/DeveloperError',
        '../../ThirdParty/knockout'
        ], function(
            DeveloperError,
            knockout) {
    "use strict";

    /**
     * ViewModel that represents each item in the BaseLayerPicker.
     *
     * @alias ImageryProviderViewModel
     * @constructor
     *
     * @param {string} name The name of the layer.
     * @param {string} tooltip The tooltip to show when the item is moused over.
     * @param {string} iconUrl An icon representing the layer.
     * @param {function} createFunction A function which creates the ImageryProvider for adding to the layers collection.
     *
     * @see BaseLayerPicker
     * @see ImageryProvider
     */
    var ImageryProviderViewModel = function(name, tooltip, iconUrl, createFunction) {

        if (typeof name === 'undefined') {
            throw new DeveloperError('name is required.');
        }

        if (typeof tooltip === 'undefined') {
            throw new DeveloperError('tooltip is required.');
        }

        if (typeof iconUrl === 'undefined') {
            throw new DeveloperError('iconUrl is required.');
        }

        if (typeof createFunction === 'undefined') {
            throw new DeveloperError('createFunction is required.');
        }

        /**
         * Gets a writable observable representing the name of this provider.
         * @type Observable
         */
        this.name = knockout.observable(name);

        /**
         * Gets a writable observable representing the tooltip to show when the item is moused over.
         * @type Observable
         */
        this.tooltip = knockout.observable(tooltip);

        /**
         * Gets a writable observable representing the icon associated with this layer.
         * @type Observable
         */
        this.iconUrl = knockout.observable(iconUrl);

        /**
         * Gets or sets the function called by the widget to create the imagery provider represented by this view model.
         * @type function
         */
        this.createProvider = createFunction;
    };

    return ImageryProviderViewModel;
});