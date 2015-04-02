/*global define*/
define([
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../../Core/FeatureDetection',
        '../../ThirdParty/knockout',
        '../getElement',
        './GeocoderViewModel'
    ], function(
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        FeatureDetection,
        knockout,
        getElement,
        GeocoderViewModel) {
    "use strict";

    var startSearchPath = 'M29.772,26.433l-7.126-7.126c0.96-1.583,1.523-3.435,1.524-5.421C24.169,8.093,19.478,3.401,13.688,3.399C7.897,3.401,3.204,8.093,3.204,13.885c0,5.789,4.693,10.481,10.484,10.481c1.987,0,3.839-0.563,5.422-1.523l7.128,7.127L29.772,26.433zM7.203,13.885c0.006-3.582,2.903-6.478,6.484-6.486c3.579,0.008,6.478,2.904,6.484,6.486c-0.007,3.58-2.905,6.476-6.484,6.484C10.106,20.361,7.209,17.465,7.203,13.885z';
    var stopSearchPath = 'M24.778,21.419 19.276,15.917 24.777,10.415 21.949,7.585 16.447,13.087 10.945,7.585 8.117,10.415 13.618,15.917 8.116,21.419 10.946,24.248 16.447,18.746 21.948,24.248z';

    /**
     * A widget for finding addresses and landmarks, and flying the camera to them.  Geocoding is
     * performed using the {@link http://msdn.microsoft.com/en-us/library/ff701715.aspx|Bing Maps Locations API}.
     *
     * @alias Geocoder
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Element|String} options.container The DOM element or ID that will contain the widget.
     * @param {Scene} options.scene The Scene instance to use.
     * @param {String} [options.url='//dev.virtualearth.net'] The base URL of the Bing Maps API.
     * @param {String} [options.key] The Bing Maps key for your application, which can be
     *        created at {@link https://www.bingmapsportal.com}.
     *        If this parameter is not provided, {@link BingMapsApi.defaultKey} is used.
     *        If {@link BingMapsApi.defaultKey} is undefined as well, a message is
     *        written to the console reminding you that you must create and supply a Bing Maps
     *        key as soon as possible.  Please do not deploy an application that uses
     *        this widget without creating a separate key for your application.
     * @param {Number} [options.flightDuration=1.5] The duration of the camera flight to an entered location, in seconds.
     */
    var Geocoder = function(options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(options) || !defined(options.container)) {
            throw new DeveloperError('options.container is required.');
        }
        if (!defined(options.scene)) {
            throw new DeveloperError('options.scene is required.');
        }
        //>>includeEnd('debug');

        var container = getElement(options.container);
        var viewModel = new GeocoderViewModel(options);

        viewModel._startSearchPath = startSearchPath;
        viewModel._stopSearchPath = stopSearchPath;

        var form = document.createElement('form');
        form.setAttribute('data-bind', 'submit: search');

        var textBox = document.createElement('input');
        textBox.type = 'search';
        textBox.className = 'cesium-geocoder-input';
        textBox.setAttribute('placeholder', 'Enter an address or landmark...');
        textBox.setAttribute('data-bind', '\
value: searchText,\
valueUpdate: "afterkeydown",\
disable: isSearchInProgress,\
css: { "cesium-geocoder-input-wide" : searchText.length > 0 }');
        form.appendChild(textBox);

        var searchButton = document.createElement('span');
        searchButton.className = 'cesium-geocoder-searchButton';
        searchButton.setAttribute('data-bind', '\
click: search,\
cesiumSvgPath: { path: isSearchInProgress ? _stopSearchPath : _startSearchPath, width: 32, height: 32 }');
        form.appendChild(searchButton);

        container.appendChild(form);

        knockout.applyBindings(viewModel, form);

        this._container = container;
        this._viewModel = viewModel;
        this._form = form;

        this._onInputBegin = function(e) {
            if (!container.contains(e.target)) {
                textBox.blur();
            }
        };

        this._onInputEnd = function(e) {
            if (container.contains(e.target)) {
                textBox.focus();
            }
        };

        //We subscribe to both begin and end events in order to give the text box
        //focus no matter where on the widget is clicked.

        if (FeatureDetection.supportsPointerEvents()) {
            document.addEventListener('pointerdown', this._onInputBegin, true);
            document.addEventListener('pointerup', this._onInputEnd, true);
        } else {
            document.addEventListener('mousedown', this._onInputBegin, true);
            document.addEventListener('mouseup', this._onInputEnd, true);
            document.addEventListener('touchstart', this._onInputBegin, true);
            document.addEventListener('touchend', this._onInputEnd, true);
        }

    };

    defineProperties(Geocoder.prototype, {
        /**
         * Gets the parent container.
         * @memberof Geocoder.prototype
         *
         * @type {Element}
         */
        container : {
            get : function() {
                return this._container;
            }
        },

        /**
         * Gets the view model.
         * @memberof Geocoder.prototype
         *
         * @type {GeocoderViewModel}
         */
        viewModel : {
            get : function() {
                return this._viewModel;
            }
        }
    });

    /**
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    Geocoder.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     */
    Geocoder.prototype.destroy = function() {
        if (FeatureDetection.supportsPointerEvents()) {
            document.removeEventListener('pointerdown', this._onInputBegin, true);
            document.removeEventListener('pointerup', this._onInputEnd, true);
        } else {
            document.removeEventListener('mousedown', this._onInputBegin, true);
            document.removeEventListener('mouseup', this._onInputEnd, true);
            document.removeEventListener('touchstart', this._onInputBegin, true);
            document.removeEventListener('touchend', this._onInputEnd, true);
        }

        knockout.cleanNode(this._form);
        this._container.removeChild(this._form);

        return destroyObject(this);
    };

    return Geocoder;
});
