/*global define*/
define(['../../Core/DeveloperError',
        '../../Scene/SceneMode',
        '../createCommand',
        '../../ThirdParty/knockout'
        ], function(
            DeveloperError,
            SceneMode,
            createCommand,
            knockout) {
    "use strict";

    /**
     * The ViewModel for {@link BaseLayerPicker}.
     * @alias BaseLayerPickerViewModel
     * @constructor
     *
     * @param {ImageryLayerCollection} imageryLayers The imagery layer collection to use.
     *
     * @exception {DeveloperError} imageryLayers is required.
     *
     * @see ImageryProviderViewModel
     */
    var BaseLayerPickerViewModel = function(imageryLayers) {
        if (typeof imageryLayers === 'undefined') {
            throw new DeveloperError('imageryLayers is required');
        }

        var dropDownVisible = knockout.observable(false);
        var selectedViewModel = knockout.observable();

        /**
         * Gets the ImageryLayerCollection.
         * @type ImageryLayerCollection
         */
        this.imageryLayers = imageryLayers;

        /**
         * Gets the observable array of ImageryProviderViewModel instances available for selection.
         * @type Observable
         */
        this.imageryProviderViewModels = knockout.observableArray();

        /**
         * Gets or sets whether the imagery selection dropDown is currently visible.
         * @type Observable
        */
        this.dropDownVisible = dropDownVisible;

        /**
         * Command to toggle dropDown visibility.
         * @type Command
        */
        this.toggleDropDown = createCommand(function() {
            dropDownVisible(!dropDownVisible());
        });

        /**
         * Gets the name of the currently selected item.
         * @type Observable
        */
        this.selectedName = knockout.computed(function() {
            var selected = selectedViewModel();
            return typeof selected !== 'undefined' ? selected.name() : "";
        });

        /**
         * Gets the image url of the currently selected item.
         * @type Observable
        */
        this.selectedImageUrl = knockout.computed(function() {
            var viewModel = selectedViewModel();
            return typeof viewModel !== 'undefined' ? viewModel.iconUrl() : "";
        });

        /**
         * Gets a writable observable for the currently selected item.
         * @type Observable
        */
        this.selectedItem = knockout.computed({
            read : function() {
                return selectedViewModel();
            },
            write : function(value) {
                if (imageryLayers.getLength() > 0) {
                    imageryLayers.remove(imageryLayers.get(0));
                }
                var newLayer = value.createProvider();
                if (typeof newLayer !== 'undefined') {
                    imageryLayers.addImageryProvider(newLayer, 0);
                }
                selectedViewModel(value);
                dropDownVisible(false);
            }
        });
    };

    return BaseLayerPickerViewModel;
});