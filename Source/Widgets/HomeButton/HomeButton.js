/*global define*/
define(['./HomeButtonViewModel',
        '../../Core/DeveloperError',
        '../../Core/destroyObject',
        '../../ThirdParty/knockout'
        ], function(
         HomeButtonViewModel,
         DeveloperError,
         destroyObject,
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
     * @exception {Scene} scene is required.
     */
    var HomeButton = function(container, scene, transitioner, ellipsoid) {
        if (typeof container === 'undefined') {
            throw new DeveloperError('container is required.');
        }

        if (typeof container === 'string') {
            var tmp = document.getElementById(container);
            if (tmp === null) {
                throw new DeveloperError('Element with id "' + container + '" does not exist in the document.');
            }
            container = tmp;
        }

        this._container = container;
        this._viewModel = new HomeButtonViewModel(scene, transitioner, ellipsoid);

        this._element = document.createElement('span');
        this._element.className = 'cesium-homeButton';
        this._element.setAttribute('data-bind', 'attr: { title: tooltip }, click: command');
        container.appendChild(this._element);

        knockout.applyBindings(this._viewModel, this._element);
    };

    /**
     * Gets the parent container.
     * @memberof HomeButton
     * @return {Element} The parent container.
     */
    HomeButton.prototype.getContainer = function() {
        return this._container;
    };

    /**
     * Gets the view model being used.
     * @memberof HomeButton
     * @return {HomeButtonViewModel} The view model being used.
     */
    HomeButton.prototype.getViewModel = function() {
        return this._viewModel;
    };

    /**
     * @memberof HomeButton
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    HomeButton.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the  widget.  Should be called if permanently
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
