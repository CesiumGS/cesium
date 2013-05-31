/*global define*/
define(['../createCommand',
        '../../Core/defaultValue',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../../Core/Fullscreen',
        '../../ThirdParty/knockout'
        ], function(
            createCommand,
            defaultValue,
            destroyObject,
            DeveloperError,
            Fullscreen,
            knockout) {
    "use strict";

    /**
     * The ViewModel for {@link FullscreenButton}.
     * @alias FullscreenButtonViewModel
     * @constructor
     *
     * @param {Element} [fullscreenElement=document.body] The element to be placed into fullscreen mode.
     */
    var FullscreenButtonViewModel = function(fullscreenElement) {
        var that = this;

        /**
         * Gets an Observable indicating if fullscreen mode is activated.
         * @type Observable
         */
        this.toggled = Fullscreen.isFullscreen();

        knockout.track(this, ['toggled']);

        var tmp = knockout.observable(Fullscreen.isFullscreenEnabled());

        /**
         * Gets an Observable indicating if fullscreen functionality should be available.
         * @type Observable
         *
         * @see Fullscreen.isFullscreenEnabled
         */
        knockout.defineProperty(this, 'isFullscreenEnabled', {
            get : function() {
                return tmp();
            },
            set : function(value) {
                tmp(value && Fullscreen.isFullscreenEnabled());
            }
        });

        /**
         * Gets a readonly Observable of the current button tooltip.
         * @type Observable
         */
        knockout.defineProperty(this, 'tooltip', function() {
            if (!this.isFullscreenEnabled) {
                return 'Full screen unavailable';
            }
            return this.toggled ? 'Exit full screen' : 'Full screen';
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
            that.toggled = Fullscreen.isFullscreen();
        };
        document.addEventListener(Fullscreen.getFullscreenChangeEventName(), this._callback);
    };

    Object.defineProperties(FullscreenButtonViewModel.prototype, {
        /**
         * Gets or sets the HTML element to place into fullscreen mode when the
         * corresponding button is pressed.
         * @memberof FullscreenButtonViewModel.prototype
         * @type {Element}
         *
         * @exception {DeveloperError} value must be a valid HTML Element.
         */
        fullscreenElement : {
            get : function() {
                return this._fullscreenElement;
            },
            set : function(value) {
                if (!(value instanceof Element)) {
                    throw new DeveloperError('value must be a valid Element.');
                }
                this._fullscreenElement = value;
            }
        },

        /**
         * Toggles fullscreen mode.
         * @type Command
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
