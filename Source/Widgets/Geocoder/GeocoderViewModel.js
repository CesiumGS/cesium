/*global define*/
define([
        '../../Core/BingMapsApi',
        '../../Core/Cartesian3',
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/Event',
        '../../Core/loadJsonp',
        '../../Core/Matrix4',
        '../../Core/Rectangle',
        '../../Scene/SceneMode',
        '../../ThirdParty/knockout',
        '../../ThirdParty/when',
        '../createCommand'
    ], function(
        BingMapsApi,
        Cartesian3,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        loadJsonp,
        Matrix4,
        Rectangle,
        SceneMode,
        knockout,
        when,
        createCommand) {
    'use strict';

    /**
     * The view model for the {@link Geocoder} widget.
     * @alias GeocoderViewModel
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Scene} options.scene The Scene instance to use.
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
        if (defined(options.customGeocoder)) {
            if (!defined(options.customGeocoder.getSuggestions)) {
                throw new DeveloperError('options.customGeocoder is available but missing a getSuggestions method');
            }
            if (!defined(options.customGeocoder.geocode)) {
                throw new DeveloperError('options.customGeocoder is available but missing a geocode method');
            }
        }
        //>>includeEnd('debug');

        this._url = defaultValue(options.url, 'https://dev.virtualearth.net/');
        if (this._url.length > 0 && this._url[this._url.length - 1] !== '/') {
            this._url += '/';
        }

        this._key = BingMapsApi.getKey(options.key);
        var errorCredit = BingMapsApi.getErrorCredit(options.key);
        if (defined(errorCredit)) {
            options.scene._frameState.creditDisplay.addDefaultCredit(errorCredit);
        }

        this._scene = options.scene;
        this._flightDuration = options.flightDuration;
        this._searchText = '';
        this._isSearchInProgress = false;
        this._geocodeInProgress = undefined;
        this._complete = new Event();
        this._suggestions = knockout.observableArray();
        this._selectedSuggestion = knockout.observable();
        this._showSuggestions = knockout.observable(true);


        var that = this;

        /**
         * Indicates whether search suggestions should be visible. True if there are at least 1 suggestion.
         *
         * @type {Boolean}
         */
        this.suggestionsVisible = knockout.pureComputed(function () {
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
                geocode(that, options.customGeocoder);
            }
        });

        this._adjustSuggestionsScroll = function (focusedItemIndex) {
            var container = document.getElementsByClassName('cesium-viewer-geocoderContainer')[0];
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
        };

        this.handleArrowDown = function () {
            if (that._suggestions().length === 0) {
                return;
            }
            var numberOfSuggestions = that._suggestions().length;
            var currentIndex = that._suggestions().indexOf(that._selectedSuggestion());
            var next = (currentIndex + 1) % numberOfSuggestions;
            that._selectedSuggestion(that._suggestions()[next]);

            this._adjustSuggestionsScroll(next);
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

            this._adjustSuggestionsScroll(next);
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

            var customGeocoder = options.customGeocoder;
            if (defined(customGeocoder)) {
                customGeocoder.geocode(query, function (err, results) {
                    if (defined(err)) {
                        return;
                    }
                    that._suggestions.splice(0, that._suggestions().length);
                    if (results.length > 0) {
                        results.slice(0, 5).forEach(function (result) {
                            that._suggestions.push(result);
                        });
                    }
                });
            }
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
                that.activateSuggestion(that._selectedSuggestion());
            }
            return true;
        };

        this.activateSuggestion = function (data) {
            that._searchText = data.displayName;
            var bbox = data.bbox;
            that._suggestions.splice(0, that._suggestions().length);
            updateCamera(that, Rectangle.fromDegrees(bbox.west, bbox.south, bbox.east, bbox.north));
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
         * Gets the currently selected geocoder suggestion
         * @memberof GeocoderViewModel.prototype
         */
        /**
         * Gets the Bing maps url.
         * @memberof GeocoderViewModel.prototype
         *
         * @type {String}
         */
        url : {
            get : function() {
                return this._url;
            }
        },

        /**
         * Gets the Bing maps key.
         * @memberof GeocoderViewModel.prototype
         *
         * @type {String}
         */
        key : {
            get : function() {
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

        selectedSuggestion : {
            get : function() {
                return this._selectedSuggestion;
            }
        },

        suggestions : {
            get : function() {
                return this._suggestions;
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

    function geocode(viewModel, customGeocoder) {
        var query = viewModel.searchText;

        if (hasOnlyWhitespace(query)) {
            return;
        }

        if (defined(customGeocoder)) {
            viewModel._isSearchInProgress = true;
            viewModel._suggestions.splice(0, viewModel._suggestions().length);
            customGeocoder.geocode(query, function (err, results) {
                if (defined(err)) {
                    viewModel._isSearchInProgress = false;
                    return;
                }
                if (results.length === 0) {
                    viewModel.searchText = query + ' (not found)';
                    viewModel._isSearchInProgress = false;
                    return;
                }

                var firstResult = results[0];
                //>>includeStart('debug', pragmas.debug);
                if (!defined(firstResult.displayName)) {
                    throw new DeveloperError('each result must have a displayName');
                }
                if (!defined(firstResult.bbox)) {
                    throw new DeveloperError('each result must have a bbox');
                }
                if (!defined(firstResult.bbox.south) || !defined(firstResult.bbox.west) || !defined(firstResult.bbox.north) || !defined(firstResult.bbox.east)) {
                    throw new DeveloperError('each result must have a bbox where south, west, north and east are defined');
                }
                //>>includeEnd('debug');

                viewModel._searchText = firstResult.displayName;
                var bbox = firstResult.bbox;
                var south = bbox.south;
                var west = bbox.west;
                var north = bbox.north;
                var east = bbox.east;

                updateCamera(viewModel, Rectangle.fromDegrees(west, south, east, north));
                viewModel._isSearchInProgress = false;
            });
        } else {
            defaultGeocode(viewModel, query);
        }
    }

    function defaultGeocode(viewModel, query) {

        // If the user entered (longitude, latitude, [height]) in degrees/meters,
        // fly without calling the geocoder.
        var splitQuery = query.match(/[^\s,\n]+/g);
        if ((splitQuery.length === 2) || (splitQuery.length === 3)) {
            var longitude = +splitQuery[0];
            var latitude = +splitQuery[1];
            var height = (splitQuery.length === 3) ? +splitQuery[2] : 300.0;

            if (!isNaN(longitude) && !isNaN(latitude) && !isNaN(height)) {
                updateCamera(viewModel, Cartesian3.fromDegrees(longitude, latitude, height));
                return;
            }
        }
        viewModel._isSearchInProgress = true;

        var promise = loadJsonp(viewModel._url + 'REST/v1/Locations', {
            parameters : {
                query : query,
                key : viewModel._key

            },
            callbackParameterName : 'jsonp'
        });

        var geocodeInProgress = viewModel._geocodeInProgress = when(promise, function(result) {
            if (geocodeInProgress.cancel) {
                return;
            }
            viewModel._isSearchInProgress = false;

            if (result.resourceSets.length === 0) {
                viewModel.searchText = viewModel._searchText + ' (not found)';
                return;
            }

            var resourceSet = result.resourceSets[0];
            if (resourceSet.resources.length === 0) {
                viewModel.searchText = viewModel._searchText + ' (not found)';
                return;
            }

            var resource = resourceSet.resources[0];

            viewModel._searchText = resource.name;
            var bbox = resource.bbox;
            var south = bbox[0];
            var west = bbox[1];
            var north = bbox[2];
            var east = bbox[3];

            updateCamera(viewModel, Rectangle.fromDegrees(west, south, east, north));
        }, function() {
            if (geocodeInProgress.cancel) {
                return;
            }

            viewModel._isSearchInProgress = false;
            viewModel.searchText = viewModel._searchText + ' (error)';
        });
    }

    function cancelGeocode(viewModel) {
        viewModel._isSearchInProgress = false;
        if (defined(viewModel._geocodeInProgress)) {
            viewModel._geocodeInProgress.cancel = true;
            viewModel._geocodeInProgress = undefined;
        }
    }

    function hasOnlyWhitespace(string) {
        return /^\s*$/.test(string);
    }

    return GeocoderViewModel;
});
