/*global define*/
define([
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../getElement',
        './PerformanceWatchdogViewModel',
        '../../ThirdParty/knockout'
    ], function(
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        getElement,
        PerformanceWatchdogViewModel,
        knockout) {
    "use strict";

    /**
     * Monitors performance of the application and displays a message and optionally redirects to a different URL if
     * poor performance is detected.  This widget can also detect errors during rendering and redirect to a different
     * URL.
     *
     * @alias PerformanceWatchdog
     * @constructor
     */
    var PerformanceWatchdog = function(description) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(description) || !defined(description.container)) {
            throw new DeveloperError('description.container is required.');
        }
        if (!defined(description.scene)) {
            throw new DeveloperError('description.scene is required.');
        }
        //>>includeEnd('debug');

        var container = getElement(description.container);

        var viewModel = new PerformanceWatchdogViewModel(description);

        var element = document.createElement('div');
        element.className = 'cesium-performance-watchdog-message';
        element.setAttribute('data-bind', 'visible: showingLowFrameRateMessage');

        var dismissButton = document.createElement('button');
        dismissButton.setAttribute('type', 'button');
        dismissButton.className = 'cesium-performance-watchdog-message-dismiss';
        dismissButton.innerHTML = '&times;';
        dismissButton.setAttribute('data-bind', 'click: dismissMessage');
        element.appendChild(dismissButton);

        var message = document.createElement('div');
        message.setAttribute('data-bind', 'html: lowFrameRateMessage');
        element.appendChild(message);

        container.appendChild(element);

        knockout.applyBindings(viewModel, element);

        this._container = container;
        this._viewModel = viewModel;
        this._element = element;
    };

    defineProperties(PerformanceWatchdog.prototype, {
        /**
         * Gets the parent container.
         * @memberof PerformanceWatchdog.prototype
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
         * @memberof PerformanceWatchdog.prototype
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
     * @memberof PerformanceWatchdog
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    PerformanceWatchdog.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the widget.  Should be called if permanently
     * removing the widget from layout.
     * @memberof PerformanceWatchdog
     */
    PerformanceWatchdog.prototype.destroy = function() {
        knockout.cleanNode(this._element);
        this._container.removeChild(this._element);

        return destroyObject(this);
    };

    return PerformanceWatchdog;
});
