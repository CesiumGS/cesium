/*global define*/
define([
           '../../Core/defaultValue',
           '../../Core/defined',
           '../../Core/defineProperties',
           '../../Core/destroyObject',
           '../../Core/DeveloperError',
           '../../Core/Fullscreen',
           '../../ThirdParty/knockout',
           '../../ThirdParty/NoSleep',
           '../createCommand',
           '../getElement'
       ], function(
    defaultValue,
    defined,
    defineProperties,
    destroyObject,
    DeveloperError,
    Fullscreen,
    knockout,
    NoSleep,
    createCommand,
    getElement) {
    "use strict";

    function toggleVR(viewModel, scene) {
        if (viewModel._isVRMode()) {
            scene.useWebVR = false;
            if (viewModel._locked) {
                viewModel._unlockOrientation();
            }
            viewModel._noSleep.disable();
            Fullscreen.exitFullscreen();
            viewModel._isVRMode(false);
        } else {
            if (!Fullscreen.fullscreen) {
                Fullscreen.requestFullscreen(viewModel._vrElement);
            }
            viewModel._noSleep.enable();
            //if (defined(viewModel._lockOrientation) && !viewModel._locked) {
            //    viewModel._locked = viewModel._lockOrientation('landscape');
            //}
            scene.useWebVR = true;
            viewModel._isVRMode(true);
        }
    }

    /**
     * The view model for {@link VRButton}.
     * @alias VRButtonViewModel
     * @constructor
     *
     * @param {Scene} scene The scene.
     * @param {Element|String} [vrElement=document.body] The element or id to be placed into VR mode.
     */
    function VRButtonViewModel(scene, vrElement) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        //>>includeEnd('debug');

        var that = this;

        this._isEnabled = knockout.observable(Fullscreen.enabled);
        this._isVRMode = knockout.observable(false);

        /**
         * Gets whether or not VR mode is active.
         *
         * @type {Boolean}
         */
        this.isVRMode = undefined;
        knockout.defineProperty(this, 'isVRMode', {
            get : function() {
                return that._isVRMode();
            }
        });

        /**
         * Gets or sets whether or not VR functionality should be enabled.
         *
         * @type {Boolean}
         * @see Fullscreen.enabled
         */
        this.isVREnabled = undefined;
        knockout.defineProperty(this, 'isVREnabled', {
            get : function() {
                return that._isEnabled();
            },
            set : function(value) {
                that._isEnabled(value && Fullscreen.enabled);
            }
        });

        /**
         * Gets the tooltip.  This property is observable.
         *
         * @type {String}
         */
        this.tooltip = undefined;
        knockout.defineProperty(this, 'tooltip', function() {
            if (!this.isVREnabled) {
                return 'VR mode is unavailable';
            }
            return this.isVRMode ? 'Exit VR mode' : 'Enter VR mode';
        });

        this._locked = false;
        this._lockOrientation = undefined;
        this._unlockOrientation = undefined;

        var screen = window.screen;
        if (defined(screen)) {
            this._lockOrientation = screen.lockOrientation || screen.mozLockOrientation || screen.msLockOrientation || (screen.orientation && screen.orientation.lock);
            this._unlockOrientation = screen.unlockOrientation || screen.mozUnlockOrientation || screen.msUnlockOrientation || (screen.orientation && screen.orientation.unlock);
        }

        this._noSleep = new NoSleep();

        this._command = createCommand(function() {
            toggleVR(that, scene);
        }, knockout.getObservable(this, 'isVREnabled'));

        this._vrElement = defaultValue(getElement(vrElement), document.body);

        this._callback = function() {
            toggleVR(that, scene);
        };
        document.addEventListener(Fullscreen.changeEventName, this._callback);
    }

    defineProperties(VRButtonViewModel.prototype, {
        /**
         * Gets or sets the HTML element to place into VR mode when the
         * corresponding button is pressed.
         * @memberof VRButtonViewModel.prototype
         *
         * @type {Element}
         */
        vrElement : {
            //TODO:@exception {DeveloperError} value must be a valid HTML Element.
            get : function() {
                return this._vrElement;
            },
            set : function(value) {
                //>>includeStart('debug', pragmas.debug);
                if (!(value instanceof Element)) {
                    throw new DeveloperError('value must be a valid Element.');
                }
                //>>includeEnd('debug');

                this._vrElement = value;
            }
        },

        /**
         * Gets the Command to toggle VR mode.
         * @memberof VRButtonViewModel.prototype
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
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    VRButtonViewModel.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the view model.  Should be called to
     * properly clean up the view model when it is no longer needed.
     */
    VRButtonViewModel.prototype.destroy = function() {
        destroyObject(this);
    };

    return VRButtonViewModel;
});