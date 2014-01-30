/*global define*/
define([
        '../../Core/defaultValue',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../../Core/Fullscreen',
        '../createCommand',
        '../../ThirdParty/knockout'
    ], function(
        defaultValue,
        defineProperties,
        destroyObject,
        DeveloperError,
        Fullscreen,
        createCommand,
        knockout) {
    "use strict";

    /**
     * The view model for {@link FullscreenButton}.
     * @alias FullscreenButtonViewModel
     * @constructor
     *
     * @param {Element} [fullscreenElement=document.body] The element to be placed into fullscreen mode.
     */
    var FullscreenButtonViewModel = function(fullscreenElement) {
        var that = this;

        var tmpIsFullscreen = knockout.observable(Fullscreen.isFullscreen());
        var tmpIsEnabled = knockout.observable(Fullscreen.isFullscreenEnabled());

        /**
         * Gets whether or not fullscreen mode is active.  This property is observable.
         *
         * @type {Boolean}
         */
        this.isFullscreen = undefined;
        knockout.defineProperty(this, 'isFullscreen', {
            get : function() {
                return tmpIsFullscreen();
            }
        });

        /**
         * Gets or sets whether or not fullscreen functionality should be enabled.  This property is observable.
         *
         * @type {Boolean}
         * @see Fullscreen.isFullscreenEnabled
         */
        this.isFullscreenEnabled = undefined;
        knockout.defineProperty(this, 'isFullscreenEnabled', {
            get : function() {
                return tmpIsEnabled();
            },
            set : function(value) {
                tmpIsEnabled(value && Fullscreen.isFullscreenEnabled());
            }
        });

        /**
         * Gets the tooltip.  This property is observable.
         *
         * @type {String}
         */
        this.tooltip = undefined;
        knockout.defineProperty(this, 'tooltip', function() {
            if (!this.isFullscreenEnabled) {
                return 'Full screen unavailable';
            }
            return tmpIsFullscreen() ? 'Exit full screen' : 'Full screen';
        });

        this._command = createCommand(function() {
            if (Fullscreen.isFullscreen()) {
                Fullscreen.exitFullscreen();
            } else {
                Fullscreen.requestFullscreen(that._fullscreenElement);
            }
        }, knockout.getObservable(this, 'isFullscreenEnabled'));

        this._fullscreenElement = defaultValue(fullscreenElement, document.body);

        this._callback = function() {
            tmpIsFullscreen(Fullscreen.isFullscreen());
        };
        document.addEventListener(Fullscreen.getFullscreenChangeEventName(), this._callback);
    };

    defineProperties(FullscreenButtonViewModel.prototype, {
        /**
         * Gets or sets the HTML element to place into fullscreen mode when the
         * corresponding button is pressed.
         * @memberof FullscreenButtonViewModel.prototype
         *
         * @type {Element}
         */
        fullscreenElement : {
            //TODO:@exception {DeveloperError} value must be a valid HTML Element.
            get : function() {
                return this._fullscreenElement;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (!(value instanceof Element)) {
                    throw new DeveloperError('value must be a valid Element.');
                }
                //>>includeEnd('debug');

                this._fullscreenElement = value;
            }
        },

        /**
         * Gets the Command to toggle fullscreen mode.
         * @memberof FullscreenButtonViewModel.prototype
         *
         * @type {Command}
         */
        command : {
            get : function() {
                return this._command;
            }
        }
    });

    /**
     * @memberof FullscreenButtonViewModel
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    FullscreenButtonViewModel.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the view model.  Should be called to
     * properly clean up the view model when it is no longer needed.
     * @memberof FullscreenButtonViewModel
     */
    FullscreenButtonViewModel.prototype.destroy = function() {
        document.removeEventListener(Fullscreen.getFullscreenChangeEventName(), this._callback);
        destroyObject(this);
    };

    return FullscreenButtonViewModel;
});
