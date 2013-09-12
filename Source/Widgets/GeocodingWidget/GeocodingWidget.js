/*global define*/
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

    var GeocodingWidget = function(container, scene, transitioner, ellipsoid, flightDuration) {
        if (!defined(container)) {
            throw new DeveloperError('container is required.');
        }

        container = getElement(container);

        this._container = container;

        this._viewModel = new GeocodingWidgetViewModel(scene, transitioner, ellipsoid, flightDuration);

        var textBox = document.createElement('input');
        textBox.className = 'cesium-geocodingWidget-input';
        textBox.setAttribute('draggable', 'false');
        textBox.setAttribute('data-bind', 'value: searchText');
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