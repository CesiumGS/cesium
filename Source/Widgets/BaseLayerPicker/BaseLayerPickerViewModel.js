/*global define*/
define([
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/isArray',
        '../createCommand',
        '../../ThirdParty/knockout'
    ], function(
        defined,
        defineProperties,
        DeveloperError,
        isArray,
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
     * @exception {DeveloperError} imageryProviderViewModels must be an array.
     *
     * @see ImageryProviderViewModel
     */
    var BaseLayerPickerViewModel = function(imageryLayers, imageryProviderViewModels) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(imageryLayers)) {
            throw new DeveloperError('imageryLayers is required');
        }
        //>>includeEnd('debug');

        if (!defined(imageryProviderViewModels)) {
            imageryProviderViewModels = [];
        } else if (!isArray(imageryProviderViewModels)) {
            throw new DeveloperError('imageryProviderViewModels must be an array');
        }

        var that = this;

        this._imageryLayers = imageryLayers;

        /**
         * Gets or sets an array of ImageryProviderViewModel instances available for selection.
         * This property is observable.
         * @type {Array}
         */
        this.imageryProviderViewModels = imageryProviderViewModels.slice(0);

        /**
         * Gets or sets whether the imagery selection drop-down is currently visible.
         * @type {Boolean}
         * @default false
         */
        this.dropDownVisible = false;

        knockout.track(this, ['imageryProviderViewModels', 'dropDownVisible']);

        /**
         * Gets the currently selected item name.  This property is observable.
         * @type {String}
         */
        this.selectedName = undefined;
        knockout.defineProperty(this, 'selectedName', function() {
            var selected = that.selectedItem;
            return defined(selected) ? selected.name : undefined;
        });

        /**
         * Gets the image url of the currently selected item.  This property is observable.
         * @type {String}
         */
        this.selectedIconUrl = undefined;
        knockout.defineProperty(this, 'selectedIconUrl', function() {
            var viewModel = that.selectedItem;
            return defined(viewModel) ? viewModel.iconUrl : undefined;
        });

        /**
         * Gets or sets the currently selected item.  This property is observable.
         * @type {ImageryProviderViewModel}
         * @default undefined
         */
        this.selectedItem = undefined;
        var selectedViewModel = knockout.observable();

        this._currentProviders = [];
        knockout.defineProperty(this, 'selectedItem', {
            get : function() {
                return selectedViewModel();
            },
            set : function(value) {
                var i;
                var currentProviders = that._currentProviders;
                var currentProvidersLength = currentProviders.length;
                for (i = 0; i < currentProvidersLength; i++) {
                    var layersLength = imageryLayers.length;
                    for ( var x = 0; x < layersLength; x++) {
                        var layer = imageryLayers.get(x);
                        if (layer.getImageryProvider() === currentProviders[i]) {
                            imageryLayers.remove(layer);
                            break;
                        }
                    }
                }

                if (defined(value)) {
                    var newProviders = value.creationCommand();
                    if (isArray(newProviders)) {
                        var newProvidersLength = newProviders.length;
                        for (i = newProvidersLength - 1; i >= 0; i--) {
                            imageryLayers.addImageryProvider(newProviders[i], 0);
                        }
                        that._currentProviders = newProviders.slice(0);
                    } else {
                        that._currentProviders = [newProviders];
                        imageryLayers.addImageryProvider(newProviders, 0);
                    }

                    selectedViewModel(value);
                }
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