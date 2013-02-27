/*global define*/
define(['../../Core/defaultValue',
        '../../Core/Fullscreen'
        ], function(
            defaultValue,
            Fullscreen) {
    "use strict";

    /**
     * A single button widget for entering and existing fullscreen mode.
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
    var FullscreenWidget = function(container) {
        var widgetNode;

        if (Fullscreen.isFullscreenEnabled()) {
            widgetNode = document.createElement('div');
            widgetNode.className = 'fullscreen';
            container.appendChild(widgetNode);

            if (Fullscreen.isFullscreen()) {
                widgetNode.classList.toggle('fullscreen-exit');
            }

            document.addEventListener(Fullscreen.getFullscreenChangeEventName(), function() {
                widgetNode.classList.toggle('fullscreen-exit');
            });

            var that = this;
            widgetNode.addEventListener('click', function() {
                if (Fullscreen.isFullscreen()) {
                    Fullscreen.exitFullscreen();
                } else {
                    Fullscreen.requestFullscreen(that.fullscreenElement);
                }
            });
        }

        /**
         * Gets or sets HTML element to place into fullscreen mode when the
         * corresponding button is pressed.  By default, the entire page will
         * enter fullscreen. By specifying another container, only that
         * container will be in fullscreen.
         *
         * @type {Element}
         * @memberof FullscreenWidget
         * @default document.body
         */
        this.fullscreenElement = document.body;

        /**
         * Gets the div created by this widget to represent the fullscreen button.
         *
         * @type {Element}
         * @memberof FullscreenWidget
         */
        this.widgetNode = widgetNode;
    };

    return FullscreenWidget;
});
