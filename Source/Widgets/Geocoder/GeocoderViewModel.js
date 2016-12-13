/*global define*/
define([
    '../../Core/BingMapsApi',
    '../../Core/BingMapsGeocoderService',
    '../../Core/Cartesian3',
    '../../Core/defaultValue',
    '../../Core/defined',
    '../../Core/defineProperties',
    '../../Core/deprecationWarning',
    '../../Core/DeveloperError',
    '../../Core/Event',
    '../../Core/CartographicGeocoderService',
    '../../Core/loadJsonp',
    '../../Core/Matrix4',
    '../../Core/Rectangle',
    '../../ThirdParty/knockout',
    '../../ThirdParty/when',
    '../createCommand',
    '../getElement'
    ], function(
        BingMapsApi,
        BingMapsGeocoderService,
        Cartesian3,
        defaultValue,
        defined,
        defineProperties,
        deprecationWarning,
        DeveloperError,
        Event,
        CartographicGeocoderService,
        loadJsonp,
        Matrix4,
        Rectangle,
        knockout,
        when,
        createCommand,
        getElement) {
    'use strict';

    /**
     * The view model for the {@link Geocoder} widget.
     * @alias GeocoderViewModel
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Scene} options.scene The Scene instance to use.
     * @param {GeocoderService[]} [geocoderServices] Geocoder services to use for geocoding queries.
     *        If more than one are supplied, suggestions will be gathered for the geocoders that support it,
     *        and if no suggestion is selected the result from the first geocoder service wil be used.
     * @param {String} [options.url='https://dev.virtualearth.net'] The base URL of the Bing Maps API.
     * @param {String} [options.key] The Bing Maps key for your application, which can be
     *        created at {@link https://www.bingmapsportal.com}.
     *        If this parameter is not provided, {@link BingMapsApi.defaultKey} is used.
     *        If {@link BingMapsApi.defaultKey} is undefined as well, a message is
     *        written to the console reminding you that you must create and supply a Bing Maps
     *        key as soon as possible.  Please do not deploy an application that uses
     *        this widget without creating a separate key for your application.
     * @param {Number} [options.flightDuration] The duration of the camera flight to an entered location, in seconds.
     */
    function GeocoderViewModel(options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(options) || !defined(options.scene)) {
            throw new DeveloperError('options.scene is required.');
        }
        //>>includeEnd('debug');

        this._geocoderServices = options.geocoderServices;
        if (!defined(options.geocoderServices)) {
            this._geocoderServices = [
                new CartographicGeocoderService(),
                new BingMapsGeocoderService()
            ];
        }

        var errorCredit;
        this._url = defaultValue(options.url, 'https://dev.virtualearth.net/');
        if (this._url.length > 0 && this._url[this._url.length - 1] !== '/') {
            this._url += '/';
        }

        this._key = BingMapsApi.getKey(options.key);
        this._defaultGeocoderOptions = {
            url: this._url,
            key: this._key
        };

        if (defined(options.key)) {
            errorCredit = BingMapsApi.getErrorCredit(options.key);
        }
        if (defined(errorCredit)) {
            options.scene._frameState.creditDisplay.addDefaultCredit(errorCredit);
        }

        this._viewContainer = options.container;
        this._scene = options.scene;
        this._flightDuration = options.flightDuration;
        this._searchText = '';
        this._isSearchInProgress = false;
        this._geocodeInProgress = undefined;
        this._complete = new Event();
        this._suggestions = knockout.observableArray();
        this._selectedSuggestion = knockout.observable();
        this._showSuggestions = knockout.observable(true);
        this._updateCamera = updateCamera;
        this._adjustSuggestionsScroll = adjustSuggestionsScroll;

        var that = this;

        this._suggestionsVisible = knockout.pureComputed(function () {
            return that._suggestions().length > 0 && that._showSuggestions();
        });

        this._searchCommand = createCommand(function() {
            if (defined(that._selectedSuggestion())) {
                that.activateSuggestion(that._selectedSuggestion());
                return false;
            }
            if (that.isSearchInProgress) {
                cancelGeocode(that);
            } else {
                geocode(that, that._geocoderServices);
            }
        });

        this.handleArrowDown = function () {
            if (that._suggestions().length === 0) {
                return;
            }
            var numberOfSuggestions = that._suggestions().length;
            var currentIndex = that._suggestions().indexOf(that._selectedSuggestion());
            var next = (currentIndex + 1) % numberOfSuggestions;
            that._selectedSuggestion(that._suggestions()[next]);

            adjustSuggestionsScroll(this, next);
        };

        this.handleArrowUp = function () {
            if (that._suggestions().length === 0) {
                return;
            }
            var numberOfSuggestions = that._suggestions().length;
            var next;
            var currentIndex = that._suggestions().indexOf(that._selectedSuggestion());
            if (currentIndex === -1 || currentIndex === 0) {
               next = numberOfSuggestions - 1;
            } else {
                next = currentIndex - 1;
            }
            that._selectedSuggestion(that._suggestions()[next]);

            adjustSuggestionsScroll(this, next);
        };

        this.deselectSuggestion = function () {
            that._selectedSuggestion(undefined);
        };

        this.updateSearchSuggestions = function () {
            var query = that.searchText;

            if (hasOnlyWhitespace(query)) {
                that._suggestions.splice(0, that._suggestions().length);
                return;
            }

            that._suggestions.splice(0, that._suggestions().length);
            var geocoderServices = that._geocoderServices.filter(function (service) {
                return service.autoComplete === true;
            });

            geocoderServices.forEach(function (service) {
                service.geocode(query)
                    .then(function (results) {
                        results.slice(0, 3).forEach(function(result) {
                            that._suggestions.push(result);
                        });
                    });
                });
        };

        this.handleKeyDown = function (data, event) {
            var key = event.which;
            if (key === 38) {
                event.preventDefault();
            } else if (key === 40) {
                event.preventDefault();
            }
            return true;
        };

        this.handleKeyUp = function (data, event) {
            var key = event.which;
            if (key === 38) {
                that.handleArrowUp();
            } else if (key === 40) {
                that.handleArrowDown();
            } else if (key === 13) {
                that._searchCommand();
            }
            return true;
        };

        this.activateSuggestion = function (data) {
            that._searchText = data.displayName;
            var destination = data.destination;
            that._suggestions.splice(0, that._suggestions().length);
            updateCamera(that, destination);
        };

        this.hideSuggestions = function () {
            that._showSuggestions(false);
            that._selectedSuggestion(undefined);
        };

        this.showSuggestions = function () {
            that._showSuggestions(true);
        };

        this.handleMouseover = function (data, event) {
            if (data !== that._selectedSuggestion()) {
                that._selectedSuggestion(data);
            }
        };

        /**
         * Gets or sets a value indicating if this instance should always show its text input field.
         *
         * @type {Boolean}
         * @default false
         */
        this.keepExpanded = false;

        knockout.track(this, ['_searchText', '_isSearchInProgress', 'keepExpanded']);

        /**
         * Gets a value indicating whether a search is currently in progress.  This property is observable.
         *
         * @type {Boolean}
         */
        this.isSearchInProgress = undefined;
        knockout.defineProperty(this, 'isSearchInProgress', {
            get : function() {
                return this._isSearchInProgress;
            }
        });

        /**
         * Gets or sets the text to search for.  The text can be an address, or longitude, latitude,
         * and optional height, where longitude and latitude are in degrees and height is in meters.
         *
         * @type {String}
         */
        this.searchText = undefined;
        knockout.defineProperty(this, 'searchText', {
            get : function() {
                if (this.isSearchInProgress) {
                    return 'Searching...';
                }
                return this._searchText;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (typeof value !== 'string') {
                    throw new DeveloperError('value must be a valid string.');
                }
                //>>includeEnd('debug');
                this._searchText = value;
                this.updateSearchSuggestions();
            }
        });

        /**
         * Gets or sets the the duration of the camera flight in seconds.
         * A value of zero causes the camera to instantly switch to the geocoding location.
         * The duration will be computed based on the distance when undefined.
         *
         * @type {Number|undefined}
         * @default undefined
         */
        this.flightDuration = undefined;
        knockout.defineProperty(this, 'flightDuration', {
            get : function() {
                return this._flightDuration;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (defined(value) && value < 0) {
                    throw new DeveloperError('value must be positive.');
                }
                //>>includeEnd('debug');

                this._flightDuration = value;
            }
        });
    }

    defineProperties(GeocoderViewModel.prototype, {
        /**
         * Gets the Bing maps url.
         * @deprecated
         * @memberof GeocoderViewModel.prototype
         *
         * @type {String}
         */
        url : {
            get : function() {
                deprecationWarning('url is deprecated', 'The url property was deprecated in Cesium 1.29 and will be removed in version 1.30.');
                return this._url;
            }
        },

        /**
         * Gets the Bing maps key.
         * @deprecated
         * @memberof GeocoderViewModel.prototype
         *
         * @type {String}
         */
        key : {
            get : function() {
                deprecationWarning('key is deprecated', 'The key property was deprecated in Cesium 1.29 and will be removed in version 1.30.');
                return this._key;
            }
        },

        /**
         * Gets the event triggered on flight completion.
         * @memberof GeocoderViewModel.prototype
         *
         * @type {Event}
         */
        complete : {
            get : function() {
                return this._complete;
            }
        },

        /**
         * Gets the scene to control.
         * @memberof GeocoderViewModel.prototype
         *
         * @type {Scene}
         */
        scene : {
            get : function() {
                return this._scene;
            }
        },

        /**
         * Gets the Command that is executed when the button is clicked.
         * @memberof GeocoderViewModel.prototype
         *
         * @type {Command}
         */
        search : {
            get : function() {
                return this._searchCommand;
            }
        },

        /**
         * Gets the currently selected geocoder search suggestion
         * @memberof GeocoderViewModel.prototype
         *
         * @type {Object}
         */
        selectedSuggestion : {
            get : function() {
                return this._selectedSuggestion;
            }
        },

        /**
         * Gets the list of geocoder search suggestions
         * @memberof GeocoderViewModel.prototype
         *
         * @type {Object[]}
         */
        suggestions : {
            get : function() {
                return this._suggestions;
            }
        },

        /**
         * Indicates whether search suggestions should be visible. True if there are at least 1 suggestion.
         *
         * @type {Boolean}
         */
        suggestionsVisible : {
            get : function() {
                return this._suggestionsVisible;
            }
        }
    });

    function updateCamera(viewModel, destination) {
        viewModel._scene.camera.flyTo({
            destination : destination,
            complete: function() {
                viewModel._complete.raiseEvent();
            },
            duration : viewModel._flightDuration,
            endTransform : Matrix4.IDENTITY
        });
    }

    function getFirstResult(results) {
        if (results.length === 0) {
            return undefined;
        }

        var firstResult = results[0];
        //>>includeStart('debug', pragmas.debug);
        if (!defined(firstResult.displayName)) {
            throw new DeveloperError('each result must have a displayName');
        }
        if (!defined(firstResult.destination)) {
            throw new DeveloperError('each result must have a rectangle');
        }
        //>>includeEnd('debug');

        return {
            displayName: firstResult.displayName,
            destination: firstResult.destination
        };
    }

    function promisesSettled(promises) {
        var settledPromises = [];
        promises.forEach(function (promise) {
            var settled = when.defer();
            settledPromises.push(settled);
            promise.then(function (result) {
                return settled.resolve({state: 'fulfilled', value: result});
            });

            if (defined(promise.otherwise)) {
                promise.otherwise(function (err) {
                    return settled.resolve({state: 'rejected', reason: err});
                });
                return;
            }
            promise.catch(function (err) {
                return settled.resolve({state: 'rejected', reason: err});
            });
        });

        return when.all(settledPromises);
    }

    function geocode(viewModel, geocoderServices) {
        var query = viewModel.searchText;

        if (hasOnlyWhitespace(query)) {
            return;
        }

        viewModel._geocodeInProgress = true;

        var resultPromises = [];
        for (var i = 0; i < geocoderServices.length; i++) {
            var geocoderService = geocoderServices[i];

            viewModel._isSearchInProgress = true;
            viewModel._suggestions.splice(0, viewModel._suggestions().length);
            var geocodePromise = geocoderService.geocode(query);
            resultPromises.push(geocodePromise);
            geocodePromise.then(getFirstResult);
        }

        promisesSettled(resultPromises)
            .then(function (descriptors) {
                viewModel._isSearchInProgress = false;
                if (viewModel._cancelGeocode) {
                    viewModel._cancelGeocode = false;
                    return;
                }
                var allFailed = true;
                for (var j = 0; j < descriptors.length; j++) {
                    if (descriptors[j].state === 'rejected') {
                        continue;
                    }
                    allFailed = false;
                    var geocoderResults = descriptors[j].value;
                    if (defined(geocoderResults) && geocoderResults.length > 0) {
                        viewModel._searchText = geocoderResults[0].displayName;
                        updateCamera(viewModel, geocoderResults[0].destination);
                        return;
                    }
                }
                if (allFailed) {
                    viewModel._searchText = query + ' (geocoders failed)';
                    return;
                }
                viewModel._searchText = query + ' (not found)';
            });
    }

    function adjustSuggestionsScroll(viewModel, focusedItemIndex) {
        var container = getElement(viewModel._viewContainer);
        var searchResults = container.getElementsByClassName('search-results')[0];
        var listItems = container.getElementsByTagName('li');
        var element = listItems[focusedItemIndex];

        if (focusedItemIndex === 0) {
            searchResults.scrollTop = 0;
            return;
        }

        var offsetTop = element.offsetTop;
        if (offsetTop + element.clientHeight > searchResults.clientHeight) {
            searchResults.scrollTop = offsetTop + element.clientHeight;
        } else if (offsetTop < searchResults.scrollTop) {
            searchResults.scrollTop = offsetTop;
        }
    }

    function cancelGeocode(viewModel) {
        viewModel._isSearchInProgress = false;
        if (defined(viewModel._geocodeInProgress)) {
            viewModel._cancelGeocode = true;
            viewModel._geocodeInProgress = undefined;
        }
    }

    function hasOnlyWhitespace(string) {
        return /^\s*$/.test(string);
    }

    return GeocoderViewModel;
});
