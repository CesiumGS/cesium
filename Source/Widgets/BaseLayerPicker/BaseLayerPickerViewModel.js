/*global define*/
define([
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/isArray',
        '../../Scene/EllipsoidTerrainProvider',
        '../createCommand',
        '../../ThirdParty/knockout'
    ], function(
        defined,
        defineProperties,
        DeveloperError,
        isArray,
        EllipsoidTerrainProvider,
        createCommand,
        knockout) {
    "use strict";

    /**
     * The view model for {@link BaseLayerPicker}.
     * @alias BaseLayerPickerViewModel
     * @constructor
     *
     * @param {ImageryLayerCollection} imageryLayers The imagery layer collection to use.
     * @param {Array} [imageryProviderViewModels=[]] The array of ProviderViewModel instances to use.
     *
     * @exception {DeveloperError} imageryProviderViewModels must be an array.
     *
     * @see ProviderViewModel
     */
    var BaseLayerPickerViewModel = function(centralBody, imageryProviderViewModels, terrainProviderViewModels) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(centralBody)) {
            throw new DeveloperError('centralBody is required');
        }
        //>>includeEnd('debug');

        if (!defined(imageryProviderViewModels)) {
            imageryProviderViewModels = [];
        } else if (!isArray(imageryProviderViewModels)) {
            throw new DeveloperError('imageryProviderViewModels must be an array');
        }

        if (!defined(terrainProviderViewModels)) {
            terrainProviderViewModels = [];
        } else if (!isArray(imageryProviderViewModels)) {
            throw new DeveloperError('terrainProviderViewModels must be an array');
        }

        this._centralBody = centralBody;

        /**
         * Gets or sets an array of ProviderViewModel instances available for selection.
         * This property is observable.
         * @type {Array}
         */
        this.imageryProviderViewModels = imageryProviderViewModels.slice(0);

        this.terrainProviderViewModels = terrainProviderViewModels.slice(0);

        /**
         * Gets or sets whether the imagery selection drop-down is currently visible.
         * @type {Boolean}
         * @default false
         */
        this.dropDownVisible = false;

        knockout.track(this, ['imageryProviderViewModels', 'terrainProviderViewModels', 'dropDownVisible']);

        /**
         * Gets the currently selected item name.  This property is observable.
         * @type {String}
         */
        this.selectedImageryName = undefined;
        knockout.defineProperty(this, 'selectedImageryName', function() {
            var selected = this.selectedImagery;
            return defined(selected) ? selected.name : undefined;
        });

        /**
         * Gets the image url of the currently selected item.  This property is observable.
         * @type {String}
         */
        this.selectedImageryIconUrl = undefined;
        knockout.defineProperty(this, 'selectedImageryIconUrl', function() {
            var viewModel = this.selectedImagery;
            return defined(viewModel) ? viewModel.iconUrl : undefined;
        });

        /**
         * Gets or sets the currently selected item.  This property is observable.
         * @type {ProviderViewModel}
         * @default undefined
         */
        this.selectedImagery = undefined;
        var selectedImageryViewModel = knockout.observable();

        this._currentImageryProviders = [];
        knockout.defineProperty(this, 'selectedImagery', {
            get : function() {
                return selectedImageryViewModel();
            },
            set : function(value) {
                var i;
                var currentImageryProviders = this._currentImageryProviders;
                var currentImageryProvidersLength = currentImageryProviders.length;
                var imageryLayers = this._centralBody.imageryLayers;
                for (i = 0; i < currentImageryProvidersLength; i++) {
                    var layersLength = imageryLayers.length;
                    for ( var x = 0; x < layersLength; x++) {
                        var layer = imageryLayers.get(x);
                        if (layer.imageryProvider === currentImageryProviders[i]) {
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
                        this._currentImageryProviders = newProviders.slice(0);
                    } else {
                        this._currentImageryProviders = [newProviders];
                        imageryLayers.addImageryProvider(newProviders, 0);
                    }

                    selectedImageryViewModel(value);
                }
                this.dropDownVisible = false;
            }
        });

        /**
         * Gets or sets the currently selected item.  This property is observable.
         * @type {ProviderViewModel}
         * @default undefined
         */
        this.selectedTerrain = undefined;
        var selectedTerrainViewModel = knockout.observable();

        knockout.defineProperty(this, 'selectedTerrain', {
            get : function() {
                return selectedTerrainViewModel();
            },
            set : function(value) {
                if (defined(value)) {
                    var newProvider = value.creationCommand();
                    this._centralBody.depthTestAgainstTerrain = !(newProvider instanceof EllipsoidTerrainProvider);
                    this._centralBody.terrainProvider = newProvider;
                    selectedTerrainViewModel(value);
                }

                this.dropDownVisible = false;
            }
        });

        var that = this;
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
                return this._centralBody.imageryLayers;
            }
        }
    });

    return BaseLayerPickerViewModel;
});