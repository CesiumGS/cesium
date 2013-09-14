/*global define,document*/
define([
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../getElement',
        './GeocodingWidgetViewModel',
        '../../ThirdParty/knockout'
    ], function(
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        getElement,
        GeocodingWidgetViewModel,
        knockout) {
    "use strict";

    /**
     * A widget for finding addresses and landmarks, and flying the camera to them.
     *
     * @alias GeocodingWidget
     * @constructor
     *
     * @param {Element|String} container The DOM element or ID that will contain the widget.
     * @param {Scene} scene The Scene instance to use.
     * @param {Ellipsoid} [ellipsoid] The Scene's primary ellipsoid.
     * @param {Number} [flightDuration=1500] The duration of the camera flight to an entered location, in milliseconds.
     *
     * @exception {DeveloperError} container is required.
     * @exception {DeveloperError} scene is required.
     */
    var GeocodingWidget = function(container, scene, ellipsoid, flightDuration) {
        if (!defined(container)) {
            throw new DeveloperError('container is required.');
        }

        container = getElement(container);

        this._container = container;

        this._viewModel = new GeocodingWidgetViewModel(scene, ellipsoid, flightDuration);

        var textBox = document.createElement('input');
        textBox.className = 'cesium-geocodingWidget-input';
        textBox.setAttribute('placeholder', 'Enter an address or landmark...');
        textBox.setAttribute('data-bind', 'value: searchText, event: { keypress: inputKeypress }, valueUpdate: "afterkeydown"');
        this._textBox = textBox;
        container.appendChild(textBox);

        var goButton = document.createElement('span');
        goButton.className = 'cesium-geocodingWidget-goButton';
        goButton.setAttribute('data-bind', 'attr: { title: tooltip }, click: search');
        this._goButton = goButton;
        container.appendChild(goButton);

        knockout.applyBindings(this._viewModel, this._container);
    };

    defineProperties(GeocodingWidget.prototype, {
        /**
         * Gets the parent container.
         * @memberof GeocodingWidget.prototype
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
         * @memberof GeocodingWidget.prototype
         *
         * @type {GeocodingWidgetViewModel}
         */
        viewModel : {
            get : function() {
                return this._viewModel;
            }
        }
    });

    /**
     * @memberof GeocodingWidget
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    GeocodingWidget.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     * @memberof GeocodingWidget
     */
    GeocodingWidget.prototype.destroy = function() {
        var container = this._container;
        knockout.cleanNode(container);
        container.removeChild(this._element);
        return destroyObject(this);
    };

    return GeocodingWidget;
});