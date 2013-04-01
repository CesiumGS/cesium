/*global define*/
define(['./FullscreenViewModel',
        '../../Core/DeveloperError',
        '../../Core/destroyObject',
        '../../ThirdParty/knockout'
        ], function(
         FullscreenViewModel,
         DeveloperError,
         destroyObject,
         knockout) {
    "use strict";

    /**
     * A single button widget for toggling fullscreen mode.
     *
     * @alias FullscreenWidget
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
    var FullscreenWidget = function(container, fullscreenElement) {
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
         * @memberof FullscreenWidget
         * @type {Element}
         */
        this.container = container;

        /**
         * Gets the viewModel being used by the widget.
         * @memberof FullscreenWidget
         * @type {FullscreenViewModel}
         */
        this.viewModel = new FullscreenViewModel(fullscreenElement);

        /**
         * Gets the container element for the widget.
         * @memberof FullscreenWidget
         * @type {Element}
         */
        this.container = container;

        /**
         * Gets the element created by this widget.
         * @memberof FullscreenWidget
         * @type {Element}
         */
        this.element = document.createElement('button');
        this.element.className = 'cesium-fullscreen';
        this.element.setAttribute('data-bind', 'attr: { title: tooltip }, css: { "cesium-fullscreen-exit": toggled }, click: command, enable: isFullscreenEnabled');
        container.appendChild(this.element);

        knockout.applyBindings(this.viewModel, this.element);
    };

    /**
     * Destroys the  widget.  Should be called if permanently
     * removing the widget from layout.
     * @memberof FullscreenWidget
     */
    FullscreenWidget.prototype.destroy = function() {
        var container = this.container;
        knockout.cleanNode(container);
        container.removeChild(this.element);
        return destroyObject(this);
    };

    return FullscreenWidget;
});
