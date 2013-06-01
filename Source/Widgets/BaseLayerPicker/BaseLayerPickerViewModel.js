/*global define*/
define([
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../createCommand',
        '../../ThirdParty/knockout'
    ], function(
        defineProperties,
        DeveloperError,
        createCommand,
        knockout) {
    "use strict";

    /**
     * The view model for {@link BaseLayerPicker}.
     * @alias BaseLayerPickerViewModel
     * @constructor
     *
     * @param {ImageryLayerCollection} imageryLayers The imagery layer collection to use.
     * @param {Array} [imageryProviderViewModels=[]] The array of ImageryProviderViewModel instances to use.
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

        var that = this;

        this._imageryLayers = imageryLayers;

        /**
         * Gets or sets an array of ImageryProviderViewModel instances available for selection.
         * This property is observable.
         * @type Array
         */
        this.imageryProviderViewModels = imageryProviderViewModels.slice(0);

        /**
         * Gets or sets whether the imagery selection drop-down is currently visible.
         * @type Boolean
         */
        this.dropDownVisible = false;

        knockout.track(this, ['imageryProviderViewModels', 'dropDownVisible']);

        /**
         * Gets the currently selected item name.  This property is observable.
         * @type String
         */
        this.selectedName = undefined;
        knockout.defineProperty(this, 'selectedName', function() {
            var selected = that.selectedItem;
            return typeof selected !== 'undefined' ? selected.name : undefined;
        });

        /**
         * Gets the image url of the currently selected item.  This property is observable.
         * @type String
         */
        this.selectedIconUrl = undefined;
        knockout.defineProperty(this, 'selectedIconUrl', function() {
            var viewModel = that.selectedItem;
            return typeof viewModel !== 'undefined' ? viewModel.iconUrl : undefined;
        });

        /**
         * Gets or sets the currently selected item.  This property is observable.
         * @type ImageryProviderViewModel
         */
        this.selectedItem = undefined;
        var selectedViewModel = knockout.observable();
        knockout.defineProperty(this, 'selectedItem', {
            get : function() {
                return selectedViewModel();
            },
            set : function(value) {
                if (imageryLayers.getLength() > 0) {
                    imageryLayers.remove(imageryLayers.get(0));
                }
                var newLayer = value.creationCommand();
                if (typeof newLayer !== 'undefined') {
                    imageryLayers.addImageryProvider(newLayer, 0);
                }
                selectedViewModel(value);
                that.dropDownVisible = false;
            }
        });

        this._toggleDropDown = createCommand(function() {
            that.dropDownVisible = !that.dropDownVisible;
        });
    };

    defineProperties(BaseLayerPickerViewModel.prototype, {
        /**
         * Gets the command to toggle the visibility of the drop down.
         * @memberof BaseLayerPickerViewModel.prototype
         *
         * @type {Command}
         */
        toggleDropDown : {
            get : function() {
                return this._toggleDropDown;
            }
        },

        /**
         * Gets the imagery layer collection.
         * @memberof BaseLayerPickerViewModel.prototype
         *
         * @type {ImageryLayerCollection}
         */
        imageryLayers : {
            get : function() {
                return this._imageryLayers;
            }
        }
    });

    return BaseLayerPickerViewModel;
});