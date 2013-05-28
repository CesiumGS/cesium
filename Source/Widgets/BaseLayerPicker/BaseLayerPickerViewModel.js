/*global define*/
define(['../../Core/DeveloperError',
        '../../Scene/SceneMode',
        '../../Scene/ImageryLayer',
        '../../Scene/ImageryProvider',
        '../createCommand',
        '../../ThirdParty/knockout'
        ], function(
            DeveloperError,
            SceneMode,
            ImageryLayer,
            ImageryProvider,
            createCommand,
            knockout) {
    "use strict";

    /**
     * The ViewModel for {@link BaseLayerPicker}.
     * @alias BaseLayerPickerViewModel
     * @constructor
     *
     * @param {ImageryLayerCollection} imageryLayers The imagery layer collection to use.
     * @param {Array} [imageryProviderViewModels] The array of ImageryProviderViewModel instances to use.
     *
     * @exception {DeveloperError} imageryLayers is required.
     * @exception {DeveloperError} imageryProviderViewModels must be an array.
     *
     * @see ImageryProviderViewModel
     */
    var BaseLayerPickerViewModel = function(imageryLayers, imageryProviderViewModels) {
        if (typeof imageryLayers === 'undefined') {
            throw new DeveloperError('imageryLayers is required');
        }

        if (typeof imageryProviderViewModels === 'undefined') {
            imageryProviderViewModels = [];
        } else if (!Array.isArray(imageryProviderViewModels)) {
            throw new DeveloperError('imageryProviderViewModels must be an array');
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
        this.imageryProviderViewModels = knockout.observableArray(imageryProviderViewModels);

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
            return typeof selected !== 'undefined' ? selected.name() : undefined;
        });

        /**
         * Gets the image url of the currently selected item.
         * @type Observable
        */
        this.selectedIconUrl = knockout.computed(function() {
            var viewModel = selectedViewModel();
            return typeof viewModel !== 'undefined' ? viewModel.iconUrl() : undefined;
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
                while (imageryLayers.getLength() > 0) {
                    imageryLayers.remove(imageryLayers.get(0));
                }
                var newLayers = value.creationCommand();
                if (typeof newLayers !== 'undefined') {
                    if (!(newLayers instanceof Array)) {
                        newLayers = [ newLayers ];
                    }
                    for (var i = 0; i < newLayers.length; ++i) {
                        if (newLayers[i] instanceof ImageryLayer) {
                            imageryLayers.add(newLayers[i], i);
                        } else {
                            imageryLayers.addImageryProvider(newLayers[i], i);
                        }
                    }
                }
                selectedViewModel(value);
                dropDownVisible(false);
            }
        });
    };

    return BaseLayerPickerViewModel;
});
