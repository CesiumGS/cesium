/*global define*/
define([
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../SvgPath/SvgPath',
        '../getElement',
        './HomeButtonViewModel',
        '../../ThirdParty/knockout'
    ], function(
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        SvgPath,
        getElement,
        HomeButtonViewModel,
        knockout) {
    "use strict";

    /**
     * A single button widget for returning to the default camera view of the current scene.
     *
     * @alias HomeButton
     * @constructor
     *
     * @param {Element|String} container The DOM element or ID that will contain the widget.
     * @param {Scene} scene The Scene instance to use.
     * @param {SceneTransitioner} [transitioner] The SceneTransitioner instance to use.
     * @param {Ellipsoid} [ellipsoid] The Scene's primary ellipsoid.
     *
     * @exception {DeveloperError} container is required.
     * @exception {DeveloperError} scene is required.
     */
    var HomeButton = function(container, scene, transitioner, ellipsoid, flightDuration) {
        if (!defined(container)) {
            throw new DeveloperError('container is required.');
        }

        container = getElement(container);

        this._container = container;
        this._viewModel = new HomeButtonViewModel(scene, transitioner, ellipsoid, flightDuration);

        this._element = document.createElement('button');
        this._element.type = 'button';
        this._element.className = 'cesium-widget-button cesium-widget-toolbar-icon cesium-home-button';
        this._element.setAttribute('data-bind', 'attr: { title: tooltip }, click: command');
        this._svgPath = new SvgPath(this._element, 28, 28, 'M14,4l-10,8.75h20l-4.25-3.7188v-4.6562h-2.812v2.1875l-2.938-2.5625zm-7.0938,9.906v10.094h14.094v-10.094h-14.094zm2.1876,2.313h3.3122v4.25h-3.3122v-4.25zm5.8442,1.281h3.406v6.438h-3.406v-6.438z');
        container.appendChild(this._element);

        knockout.applyBindings(this._viewModel, this._element);
    };

    defineProperties(HomeButton.prototype, {
        /**
         * Gets the parent container.
         * @memberof HomeButton.prototype
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
         * @memberof HomeButton.prototype
         *
         * @type {HomeButtonViewModel}
         */
        viewModel : {
            get : function() {
                return this._viewModel;
            }
        }
    });

    /**
     * @memberof HomeButton
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    HomeButton.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     * @memberof HomeButton
     */
    HomeButton.prototype.destroy = function() {
        var container = this._container;
        knockout.cleanNode(this._element);
        container.removeChild(this._element);
        return destroyObject(this);
    };

    return HomeButton;
});
