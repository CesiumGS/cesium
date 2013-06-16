/*global define*/
define([
        '../../Core/defineProperties',
        '../../Core/DeveloperError',
        '../../Core/destroyObject',
        '../getElement',
        './FullscreenButtonViewModel',
        '../../ThirdParty/knockout'
    ], function(
        defineProperties,
        DeveloperError,
        destroyObject,
        getElement,
        FullscreenButtonViewModel,
        knockout) {
    "use strict";

    /**
     * A single button widget for toggling fullscreen mode.
     *
     * @alias FullscreenButton
     * @constructor
     *
     * @param {Element|String} container The DOM element or ID that will contain the widget.
     * @param {Element} [fullscreenElement=document.body] The element to be placed into fullscreen mode.
     *
     * @exception {DeveloperError} container is required.
     * @exception {DeveloperError} Element with id "container" does not exist in the document.
     *
     * @see Fullscreen
     */
    var FullscreenButton = function(container, fullscreenElement) {
        if (typeof container === 'undefined') {
            throw new DeveloperError('container is required.');
        }

        container = getElement(container);

        this._container = container;
        this._viewModel = new FullscreenButtonViewModel(fullscreenElement);

        this._element = document.createElement('button');
        this._element.className = 'cesium-fullscreenButton';
        this._element.setAttribute('data-bind', 'attr: { title: tooltip }, css: { "cesium-fullscreenButton-exit": isFullscreen }, click: command, enable: isFullscreenEnabled');
        container.appendChild(this._element);

        knockout.applyBindings(this._viewModel, this._element);
    };

    defineProperties(FullscreenButton.prototype, {
        /**
         * Gets the parent container.
         * @memberof FullscreenButton.prototype
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
         * @memberof FullscreenButton.prototype
         *
         * @type {FullscreenButtonViewModel}
         */
        viewModel : {
            get : function() {
                return this._viewModel;
            }
        }
    });

    /**
     * @memberof FullscreenButton
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    FullscreenButton.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     * @memberof FullscreenButton
     */
    FullscreenButton.prototype.destroy = function() {
        var container = this._container;
        knockout.cleanNode(container);
        this._viewModel.destroy();
        container.removeChild(this._element);
        return destroyObject(this);
    };

    return FullscreenButton;
});
