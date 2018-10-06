define([
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../../ThirdParty/knockout',
        '../getElement',
        './PerformanceWatchdogViewModel'
    ], function(
        defined,
        defineProperties,
        destroyObject,
        DeveloperError,
        knockout,
        getElement,
        PerformanceWatchdogViewModel) {
    'use strict';

    /**
     * Monitors performance of the application and displays a message if poor performance is detected.
     *
     * @alias PerformanceWatchdog
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Element|String} options.container The DOM element or ID that will contain the widget.
     * @param {Scene} options.scene The {@link Scene} for which to monitor performance.
     * @param {String} [options.lowFrameRateMessage='This application appears to be performing poorly on your system.  Please try using a different web browser or updating your video drivers.'] The
     *        message to display when a low frame rate is detected.  The message is interpeted as HTML, so make sure
     *        it comes from a trusted source so that your application is not vulnerable to cross-site scripting attacks.
     */
    function PerformanceWatchdog(options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(options) || !defined(options.container)) {
            throw new DeveloperError('options.container is required.');
        }
        if (!defined(options.scene)) {
            throw new DeveloperError('options.scene is required.');
        }
        //>>includeEnd('debug');

        var container = getElement(options.container);

        var viewModel = new PerformanceWatchdogViewModel(options);

        var element = document.createElement('div');
        element.className = 'cesium-performance-watchdog-message-area';
        element.setAttribute('data-bind', 'visible: showingLowFrameRateMessage');

        var dismissButton = document.createElement('button');
        dismissButton.setAttribute('type', 'button');
        dismissButton.className = 'cesium-performance-watchdog-message-dismiss';
        dismissButton.innerHTML = '&times;';
        dismissButton.setAttribute('data-bind', 'click: dismissMessage');
        element.appendChild(dismissButton);

        var message = document.createElement('div');
        message.className = 'cesium-performance-watchdog-message';
        message.setAttribute('data-bind', 'html: lowFrameRateMessage');
        element.appendChild(message);

        container.appendChild(element);

        knockout.applyBindings(viewModel, element);

        this._container = container;
        this._viewModel = viewModel;
        this._element = element;
    }

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
         * @type {PerformanceWatchdogViewModel}
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
        this._viewModel.destroy();
        knockout.cleanNode(this._element);
        this._container.removeChild(this._element);

        return destroyObject(this);
    };

    return PerformanceWatchdog;
});
