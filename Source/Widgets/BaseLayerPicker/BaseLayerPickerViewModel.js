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
     * @param {ImageryLayerCollection} imageLayers The imagery layer collection to use.
     *
     * @exception {DeveloperError} imageLayers is required.
     *
     * @see ImageryProviderViewModel
     */
    var BaseLayerPickerViewModel = function(imageLayers) {
        var dropDownVisible = knockout.observable(false);
        var selectedViewModel = knockout.observable();

        /**
         * Gets the observable array of ImageryProviderViewModel instances available for selection.
         * @type Observable
         */
        this.imageryProviderViewModels = knockout.observableArray();

        /**
         * Gets or sets whether the imagery selection dropdown is currently visible.
         * @type Observable
        */
        this.dropDownVisible = dropDownVisible;

        /**
         * Command to toggle dropDown visibility.
         * @type Command
        */
        this.toggleDropdown = createCommand(function() {
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
                if (imageLayers.getLength() > 0) {
                    imageLayers.remove(imageLayers.get(0));
                }
                var newLayer = value.createProvider();
                if (typeof newLayer !== 'undefined') {
                    imageLayers.addImageryProvider(newLayer, 0);
                }
                selectedViewModel(value);
                dropDownVisible(false);
            }
        });
    };

    return BaseLayerPickerViewModel;
});