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
     * @param {Element} container The parent HTML container node for this widget.
     *
     * @exception {DeveloperError} container is required.
     *
     * @see Fullscreen
     */
    var FullscreenWidget = function(container, viewModel) {
        if (typeof container === 'undefined') {
            throw new DeveloperError('container is required');
        }

        /**
         * Gets the viewModel being used by the widget.
         *
         * @type {FullscreenViewModel}
         * @memberof FullscreenWidget
         */
        this.viewModel = typeof viewModel !== 'undefined' ? viewModel : new FullscreenViewModel();

        /**
         * Gets the actual button created by this widget.
         *
         * @type {Element}
         * @memberof FullscreenWidget
         */
        this.button = document.createElement('button');
        this.button.className = 'fullscreen';
        this.button.setAttribute('data-bind', 'attr: { title: tooltip }, css: { "fullscreen-exit": toggled }, click: command, enable: isFullscreenEnabled');
        container.appendChild(this.button);

        knockout.applyBindings(this.viewModel, this.button);
    };

    return FullscreenWidget;
});
