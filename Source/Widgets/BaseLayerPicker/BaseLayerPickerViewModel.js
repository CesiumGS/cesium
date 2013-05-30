/*global define*/
define([
        '../../Core/DeveloperError',
        '../createCommand',
        '../../ThirdParty/knockout'
    ], function(
        DeveloperError,
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

        this._imageryLayers = imageryLayers;

        /**
         * Gets an Observable array of ImageryProviderViewModel instances available for selection.
         * @type Observable
         */
        this.imageryProviderViewModels = knockout.observableArray(imageryProviderViewModels);

        /**
         * Gets an Observable whose value indicates if the imagery selection dropDown is currently visible.
         * @type Observable
        */
        this.dropDownVisible = dropDownVisible;

        /**
         * Toggles dropDown visibility.
         * @type Command
        */
        this.toggleDropDown = createCommand(function() {
            dropDownVisible(!dropDownVisible());
        });

        /**
         * Gets a readonly Observable for the the name of the currently selected item.
         * @type Observable
        */
        this.selectedName = knockout.computed(function() {
            var selected = selectedViewModel();
            return typeof selected !== 'undefined' ? selected.name() : undefined;
        });

        /**
         * Gets a readonly Observable for the image url of the currently selected item.
         * @type Observable
        */
        this.selectedIconUrl = knockout.computed(function() {
            var viewModel = selectedViewModel();
            return typeof viewModel !== 'undefined' ? viewModel.iconUrl() : undefined;
        });

        /**
         * Gets an Observable for the currently selected item.
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
                var newLayer = value.creationCommand();
                if (typeof newLayer !== 'undefined') {
                    imageryLayers.addImageryProvider(newLayer, 0);
                }
                selectedViewModel(value);
                dropDownVisible(false);
            }
        });
    };

    /**
     * Gets the imagery layers collection being used.
     * @type ImageryLayerCollection
     */
    BaseLayerPickerViewModel.prototype.getImageryLayers = function() {
        return this._imageryLayers;
    };

    return BaseLayerPickerViewModel;
});