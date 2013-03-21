/*global define*/
define(['./FullscreenViewModel',
        '../../Core/DeveloperError',
        '../../ThirdParty/knockout'
        ], function(
         FullscreenViewModel,
         DeveloperError,
         knockout) {
    "use strict";

    /**
     * A single button widget for toggling fullscreen mode.
     *
     * @alias FullscreenWidget
     * @constructor
     *
     * @param {Element|String} container The DOM element, or DOM element ID, that will contain the widget.
     * @param {Element} [fullscreenElement=document.body] The element to be placed into fullscreen mode.
     *
     * @exception {DeveloperError} container is required.
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
         * Gets the actual button created by this widget.
         * @memberof FullscreenWidget
         * @type {Element}
         */
        this.button = document.createElement('button');
        this.button.className = 'fullscreen';
        this.button.setAttribute('data-bind', 'attr: { title: tooltip }, css: { "fullscreen-exit": toggled }, click: command, enable: isFullscreenEnabled');
        container.appendChild(this.button);

        knockout.applyBindings(this.viewModel, this.button);
    };

    return FullscreenWidget;
});
