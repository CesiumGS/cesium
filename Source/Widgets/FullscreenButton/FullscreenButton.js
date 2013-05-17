/*global define*/
define(['./FullscreenButtonViewModel',
        '../../Core/DeveloperError',
        '../../Core/destroyObject',
        '../../ThirdParty/knockout'
        ], function(
         FullscreenButtonViewModel,
         DeveloperError,
         destroyObject,
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

        if (typeof container === 'string') {
            var tmp = document.getElementById(container);
            if (tmp === null) {
                throw new DeveloperError('Element with id "' + container + '" does not exist in the document.');
            }
            container = tmp;
        }

        /**
         * Gets the parent container.
         * @memberof FullscreenButton
         * @type {Element}
         */
        this.container = container;

        /**
         * Gets the viewModel being used by the widget.
         * @memberof FullscreenButton
         * @type {FullscreenButtonViewModel}
         */
        this.viewModel = new FullscreenButtonViewModel(fullscreenElement);

        /**
         * Gets the container element for the widget.
         * @memberof FullscreenButton
         * @type {Element}
         */
        this.container = container;

        this._element = document.createElement('button');
        this._element.className = 'cesium-fullscreenButton';
        this._element.setAttribute('data-bind', 'attr: { title: tooltip }, css: { "cesium-fullscreenButton-exit": toggled }, click: command, enable: isFullscreenEnabled');
        container.appendChild(this._element);

        knockout.applyBindings(this.viewModel, this._element);
    };

    /**
     * Destroys the  widget.  Should be called if permanently
     * removing the widget from layout.
     * @memberof FullscreenButton
     */
    FullscreenButton.prototype.destroy = function() {
        var container = this.container;
        knockout.cleanNode(container);
        this.viewModel.destroy();
        container.removeChild(this._element);
        return destroyObject(this);
    };

    return FullscreenButton;
});
