define([
        '../../Core/defaultValue',
        '../../Core/defined',
        '../../Core/defineProperties',
        '../../Core/destroyObject',
        '../../Core/DeveloperError',
        '../../Core/EventHelper',
        '../../Core/Fullscreen',
        '../../Core/OrthographicFrustum',
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
        EventHelper,
        Fullscreen,
        OrthographicFrustum,
        knockout,
        NoSleep,
        createCommand,
        getElement) {
    'use strict';

    function lockScreen(orientation) {
        var locked = false;
        var screen = window.screen;
        if (defined(screen)) {
            if (defined(screen.lockOrientation)) {
                locked = screen.lockOrientation(orientation);
            } else if (defined(screen.mozLockOrientation)) {
                locked = screen.mozLockOrientation(orientation);
            } else if (defined(screen.msLockOrientation)) {
                locked = screen.msLockOrientation(orientation);
            } else if (defined(screen.orientation && screen.orientation.lock)) {
                locked = screen.orientation.lock(orientation);
            }
        }
        return locked;
    }

    function unlockScreen() {
        var screen = window.screen;
        if (defined(screen)) {
            if (defined(screen.unlockOrientation)) {
                screen.unlockOrientation();
            } else if (defined(screen.mozUnlockOrientation)) {
                screen.mozUnlockOrientation();
            } else if (defined(screen.msUnlockOrientation)) {
                screen.msUnlockOrientation();
            } else if (defined(screen.orientation && screen.orientation.unlock)) {
                screen.orientation.unlock();
            }
        }
    }

    function toggleVR(viewModel, scene, isVRMode, isOrthographic) {
        if (isOrthographic()) {
            return;
        }

        if (isVRMode()) {
            scene.useWebVR = false;
            if (viewModel._locked) {
                unlockScreen();
                viewModel._locked = false;
            }
            viewModel._noSleep.disable();
            Fullscreen.exitFullscreen();
            isVRMode(false);
        } else {
            if (!Fullscreen.fullscreen) {
                Fullscreen.requestFullscreen(viewModel._vrElement);
            }
            viewModel._noSleep.enable();
            if (!viewModel._locked) {
                viewModel._locked = lockScreen('landscape');
            }
            scene.useWebVR = true;
            isVRMode(true);
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

        var isEnabled = knockout.observable(Fullscreen.enabled);
        var isVRMode = knockout.observable(false);

        /**
         * Gets whether or not VR mode is active.
         *
         * @type {Boolean}
         */
        this.isVRMode = undefined;
        knockout.defineProperty(this, 'isVRMode', {
            get : function() {
                return isVRMode();
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
                return isEnabled();
            },
            set : function(value) {
                isEnabled(value && Fullscreen.enabled);
            }
        });

        /**
         * Gets the tooltip.  This property is observable.
         *
         * @type {String}
         */
        this.tooltip = undefined;
        knockout.defineProperty(this, 'tooltip', function() {
            if (!isEnabled()) {
                return 'VR mode is unavailable';
            }
            return isVRMode() ? 'Exit VR mode' : 'Enter VR mode';
        });

        var isOrthographic = knockout.observable(false);

        this._isOrthographic = undefined;
        knockout.defineProperty(this, '_isOrthographic', {
            get : function() {
                return isOrthographic();
            }
        });

        this._eventHelper = new EventHelper();
        this._eventHelper.add(scene.preRender, function() {
            isOrthographic(scene.camera.frustum instanceof OrthographicFrustum);
        });

        this._locked = false;
        this._noSleep = new NoSleep();

        this._command = createCommand(function() {
            toggleVR(that, scene, isVRMode, isOrthographic);
        }, knockout.getObservable(this, 'isVREnabled'));

        this._vrElement = defaultValue(getElement(vrElement), document.body);

        this._callback = function() {
            if (!Fullscreen.fullscreen && isVRMode()) {
                scene.useWebVR = false;
                if (that._locked) {
                    unlockScreen();
                    that._locked = false;
                }
                that._noSleep.disable();
                isVRMode(false);
            }
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
        this._eventHelper.removeAll();
        document.removeEventListener(Fullscreen.changeEventName, this._callback);
        destroyObject(this);
    };

    return VRButtonViewModel;
});
