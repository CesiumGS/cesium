/*global define*/
define([
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../getElement',
        './HomeButtonViewModel',
        '../../ThirdParty/knockout'
    ], function(
        defineProperties,
        destroyObject,
        DeveloperError,
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
        if (typeof container === 'undefined') {
            throw new DeveloperError('container is required.');
        }

        container = getElement(container);

        this._container = container;
        this._viewModel = new HomeButtonViewModel(scene, transitioner, ellipsoid, flightDuration);

        this._element = document.createElement('span');
        this._element.className = 'cesium-homeButton';
        this._element.setAttribute('data-bind', 'attr: { title: tooltip }, click: command');
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
        knockout.cleanNode(container);
        container.removeChild(this._element);
        return destroyObject(this);
    };

    return HomeButton;
});
