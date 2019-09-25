import defaultValue from '../../Core/defaultValue.js';
import defined from '../../Core/defined.js';
import defineProperties from '../../Core/defineProperties.js';
import DeveloperError from '../../Core/DeveloperError.js';
import EllipsoidTerrainProvider from '../../Core/EllipsoidTerrainProvider.js';
import isArray from '../../Core/isArray.js';
import knockout from '../../ThirdParty/knockout.js';
import createCommand from '../createCommand.js';

    /**
     * The view model for {@link BaseLayerPicker}.
     * @alias BaseLayerPickerViewModel
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Globe} options.globe The Globe to use.
     * @param {ProviderViewModel[]} [options.imageryProviderViewModels=[]] The array of ProviderViewModel instances to use for imagery.
     * @param {ProviderViewModel} [options.selectedImageryProviderViewModel] The view model for the current base imagery layer, if not supplied the first available imagery layer is used.
     * @param {ProviderViewModel[]} [options.terrainProviderViewModels=[]] The array of ProviderViewModel instances to use for terrain.
     * @param {ProviderViewModel} [options.selectedTerrainProviderViewModel] The view model for the current base terrain layer, if not supplied the first available terrain layer is used.
     *
     * @exception {DeveloperError} imageryProviderViewModels must be an array.
     * @exception {DeveloperError} terrainProviderViewModels must be an array.
     */
    function BaseLayerPickerViewModel(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        var globe = options.globe;
        var imageryProviderViewModels = defaultValue(options.imageryProviderViewModels, []);
        var terrainProviderViewModels = defaultValue(options.terrainProviderViewModels, []);

        //>>includeStart('debug', pragmas.debug);
        if (!defined(globe)) {
            throw new DeveloperError('globe is required');
        }
        //>>includeEnd('debug');

        this._globe = globe;

        /**
         * Gets or sets an array of ProviderViewModel instances available for imagery selection.
         * This property is observable.
         * @type {ProviderViewModel[]}
         */
        this.imageryProviderViewModels = imageryProviderViewModels.slice(0);

        /**
         * Gets or sets an array of ProviderViewModel instances available for terrain selection.
         * This property is observable.
         * @type {ProviderViewModel[]}
         */
        this.terrainProviderViewModels = terrainProviderViewModels.slice(0);

        /**
         * Gets or sets whether the imagery selection drop-down is currently visible.
         * @type {Boolean}
         * @default false
         */
        this.dropDownVisible = false;

        knockout.track(this, ['imageryProviderViewModels', 'terrainProviderViewModels', 'dropDownVisible']);

        var imageryObservable = knockout.getObservable(this, 'imageryProviderViewModels');
        var imageryProviders = knockout.pureComputed(function() {
            var providers = imageryObservable();
            var categories = {};
            var i;
            for (i = 0; i < providers.length; i++) {
                var provider = providers[i];
                var category = provider.category;
                if (defined(categories[category])) {
                    categories[category].push(provider);
                } else {
                    categories[category] = [provider];
                }
            }
            var allCategoryNames = Object.keys(categories);

            var result = [];
            for (i = 0; i < allCategoryNames.length; i++) {
                var name = allCategoryNames[i];
                result.push({
                    name: name,
                    providers: categories[name]
                });
            }
            return result;
        });
        this._imageryProviders = imageryProviders;

        var terrainObservable = knockout.getObservable(this, 'terrainProviderViewModels');
        var terrainProviders = knockout.pureComputed(function() {
            var providers = terrainObservable();
            var categories = {};
            var i;
            for (i = 0; i < providers.length; i++) {
                var provider = providers[i];
                var category = provider.category;
                if (defined(categories[category])) {
                    categories[category].push(provider);
                } else {
                    categories[category] = [provider];
                }
            }
            var allCategoryNames = Object.keys(categories);

            var result = [];
            for (i = 0; i < allCategoryNames.length; i++) {
                var name = allCategoryNames[i];
                result.push({
                    name: name,
                    providers: categories[name]
                });
            }
            return result;
        });
        this._terrainProviders = terrainProviders;

        /**
         * Gets the button tooltip.  This property is observable.
         * @type {String}
         */
        this.buttonTooltip = undefined;
        knockout.defineProperty(this, 'buttonTooltip', function() {
            var selectedImagery = this.selectedImagery;
            var selectedTerrain = this.selectedTerrain;

            var imageryTip = defined(selectedImagery) ? selectedImagery.name : undefined;
            var terrainTip = defined(selectedTerrain) ? selectedTerrain.name : undefined;

            if (defined(imageryTip) && defined(terrainTip)) {
                return imageryTip + '\n' + terrainTip;
            } else if (defined(imageryTip)) {
                return imageryTip;
            }
            return terrainTip;
        });

        /**
         * Gets the button background image.  This property is observable.
         * @type {String}
         */
        this.buttonImageUrl = undefined;
        knockout.defineProperty(this, 'buttonImageUrl', function() {
            var selectedImagery = this.selectedImagery;
            if (defined(selectedImagery)) {
                return selectedImagery.iconUrl;
            }
        });

        /**
         * Gets or sets the currently selected imagery.  This property is observable.
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
                if (selectedImageryViewModel() === value) {
                    this.dropDownVisible = false;
                    return;
                }

                var i;
                var currentImageryProviders = this._currentImageryProviders;
                var currentImageryProvidersLength = currentImageryProviders.length;
                var imageryLayers = this._globe.imageryLayers;
                var hadExistingBaseLayer = false;
                for (i = 0; i < currentImageryProvidersLength; i++) {
                    var layersLength = imageryLayers.length;
                    for ( var x = 0; x < layersLength; x++) {
                        var layer = imageryLayers.get(x);
                        if (layer.imageryProvider === currentImageryProviders[i]) {
                            imageryLayers.remove(layer);
                            hadExistingBaseLayer = true;
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
                        if (hadExistingBaseLayer) {
                            imageryLayers.addImageryProvider(newProviders, 0);
                        } else {
                            var baseLayer = imageryLayers.get(0);
                            if (defined(baseLayer)) {
                                imageryLayers.remove(baseLayer);
                            }
                            imageryLayers.addImageryProvider(newProviders, 0);
                        }
                    }
                }
                selectedImageryViewModel(value);
                this.dropDownVisible = false;
            }
        });

        /**
         * Gets or sets the currently selected terrain.  This property is observable.
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
                if (selectedTerrainViewModel() === value) {
                    this.dropDownVisible = false;
                    return;
                }

                var newProvider;
                if (defined(value)) {
                    newProvider = value.creationCommand();
                }

                this._globe.depthTestAgainstTerrain = !(newProvider instanceof EllipsoidTerrainProvider);
                this._globe.terrainProvider = newProvider;
                selectedTerrainViewModel(value);
                this.dropDownVisible = false;
            }
        });

        var that = this;
        this._toggleDropDown = createCommand(function() {
            that.dropDownVisible = !that.dropDownVisible;
        });

        this.selectedImagery = defaultValue(options.selectedImageryProviderViewModel, imageryProviderViewModels[0]);
        this.selectedTerrain = defaultValue(options.selectedTerrainProviderViewModel, terrainProviderViewModels[0]);
    }

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
         * Gets the globe.
         * @memberof BaseLayerPickerViewModel.prototype
         *
         * @type {Globe}
         */
        globe : {
            get : function() {
                return this._globe;
            }
        }
    });
export default BaseLayerPickerViewModel;
