/*global define*/
define([
        '../../Core/BingMapsApi',
        '../../Core/Cartesian3',
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/Ellipsoid',
        '../../Core/Extent',
        '../../Core/jsonp',
        '../../Scene/CameraFlightPath',
        '../../Scene/SceneMode',
        '../createCommand',
        '../../ThirdParty/knockout',
        '../../ThirdParty/when'
    ], function(
        BingMapsApi,
        Cartesian3,
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Ellipsoid,
        Extent,
        jsonp,
        CameraFlightPath,
        SceneMode,
        createCommand,
        knockout,
        when) {
    "use strict";

    /**
     * The view model for {@link GeocodingWidget}.
     * @alias GeocodingWidgetViewModel
     * @constructor
     *
     * @param {Scene} description.scene The Scene instance to use.
     * @param {String} [description.url='http://dev.virtualearth.net'] The base URL of the Bing Maps API.
     * @param {String} [description.key] The Bing Maps key for your application, which can be
     *        created at <a href='https://www.bingmapsportal.com/'>https://www.bingmapsportal.com/</a>.
     *        If this parameter is not provided, {@link BingMapsApi.defaultKey} is used.
     *        If {@link BingMapsApi.defaultKey} is undefined as well, a message is
     *        written to the console reminding you that you must create and supply a Bing Maps
     *        key as soon as possible.  Please do not deploy an application that uses
     *        this widget without creating a separate key for your application.
     * @param {Ellipsoid} [description.ellipsoid=Ellipsoid.WGS84] The Scene's primary ellipsoid.
     * @param {Number} [description.flightDuration=1500] The duration of the camera flight to an entered location, in milliseconds.
     *
     * @exception {DeveloperError} scene is required.
     */
    var GeocodingWidgetViewModel = function(description) {
        if (!defined(description) || !defined(description.scene)) {
            throw new DeveloperError('description.scene is required.');
        }

        this._url = defaultValue(description.url, 'http://dev.virtualearth.net/');
        if (this._url.length > 0 && this._url[this._url.length - 1] !== '/') {
            this._url += '/';
        }

        this._key = BingMapsApi.getKey(description.key);
        this._scene = description.scene;
        this._ellipsoid = defaultValue(description.ellipsoid, Ellipsoid.WGS84);
        this._flightDuration = defaultValue(description.flightDuration, 1500);
        this._searchText = '';
        this._resultText = '';

        var that = this;
        this._searchCommand = createCommand(function() {
            geocode(that);
        });

        this._inputKeypressCommand = createCommand(function(data, event) {
           if (event.which === 13) {
               that._searchCommand();
           }
           return true;
        });

        knockout.track(this, ['_searchText']);
    };

    defineProperties(GeocodingWidgetViewModel.prototype, {
        /**
         * Gets or sets the text to search for.
         * @memberof GeocodingWidgetViewModel.prototype
         *
         * @type {String}
         */
        searchText : {
            get : function() { return this._searchText; },
            set : function(value) { this._searchText = value; }
        },

        /**
         * Gets the scene to control.
         * @memberof GeocodingWidgetViewModel.prototype
         *
         * @type {Scene}
         */
        scene : {
            get : function() {
                return this._scene;
            }
        },

        /**
         * Gets the ellipsoid to be viewed.
         * @memberof GeocodingWidgetViewModel.prototype
         *
         * @type {Ellipsoid}
         */
        ellipsoid : {
            get : function() {
                return this._ellipsoid;
            }
        },

        /**
         * Gets the Command that is executed when the button is clicked.
         * @memberof GeocodingWidgetViewModel.prototype
         *
         * @type {Command}
         */
        search : {
            get : function() {
                return this._searchCommand;
            }
        },

        /**
         * Gets the Command that is executed when a key is pressed while the geocoding
         * widget has focus.
         * @memberof GeocodingWidgetViewModel.prototype
         *
         * @type {Command}
         */
        inputKeypress : {
            get : function() {
                return this._inputKeypressCommand;
            }
        },

        /**
         * Gets or sets the the duration of the camera flight in milliseconds.
         * A value of zero causes the camera to instantly switch to the geocoding location.
         * @memberof GeocodingWidgetViewModel.prototype
         *
         * @type {Number}
         */
        flightDuration : {
            get : function() {
                return this._flightDuration;
            },
            set : function(value) {
                if (value < 0) {
                    throw new DeveloperError('value must be positive.');
                }
                this._flightDuration = value;
            }
        }
    });

    function geocode(viewModel) {
        var promise = jsonp(viewModel._url + 'REST/v1/Locations', {
            parameters : {
                query : viewModel._searchText,
                key : viewModel._key

            },
            callbackParameterName : 'jsonp'
        });

        when(promise, function(result) {
            if (result.resourceSets.length === 0) {
                return;
            }

            var resourceSet = result.resourceSets[0];
            if (resourceSet.resources.length === 0) {
                return;
            }

            var resource = resourceSet.resources[0];

            viewModel._searchText = resource.name;
            var bbox = resource.bbox;
            var south = bbox[0];
            var west = bbox[1];
            var north = bbox[2];
            var east = bbox[3];
            var extent = Extent.fromDegrees(west, south, east, north);

            var position = viewModel._scene.getCamera().controller.getExtentCameraCoordinates(extent);
            if (!defined(position)) {
                // This can happen during a scene mode transition.
                return;
            }

            var up, direction;
            if (viewModel._scene.mode === SceneMode.SCENE3D) {
                up = Cartesian3.UNIT_Z;
                direction = viewModel._ellipsoid.geodeticSurfaceNormal(position).negate();
            } else {
                up = Cartesian3.UNIT_Y;
                direction = Cartesian3.UNIT_Z.negate();
            }

            var description = {
                destination : position,
                duration : viewModel._flightDuration,
                up : up,
                direction : direction
            };

            var flight = CameraFlightPath.createAnimation(viewModel._scene, description);
            viewModel._scene.getAnimations().add(flight);
        });
    }

    return GeocodingWidgetViewModel;
});
