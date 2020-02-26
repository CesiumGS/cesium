import defaultValue from '../../Core/defaultValue.js';
import defineProperties from '../../Core/defineProperties.js';
import destroyObject from '../../Core/destroyObject.js';
import DeveloperError from '../../Core/DeveloperError.js';
import Fullscreen from '../../Core/Fullscreen.js';
import knockout from '../../ThirdParty/knockout.js';
import createCommand from '../createCommand.js';
import getElement from '../getElement.js';

    /**
     * The view model for {@link FullscreenButton}.
     * @alias FullscreenButtonViewModel
     * @constructor
     *
     * @param {Element|String} [fullscreenElement=document.body] The element or id to be placed into fullscreen mode.
     */
    function FullscreenButtonViewModel(fullscreenElement) {
        var that = this;

        var tmpIsFullscreen = knockout.observable(Fullscreen.fullscreen);
        var tmpIsEnabled = knockout.observable(Fullscreen.enabled);

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
         * @see Fullscreen.enabled
         */
        this.isFullscreenEnabled = undefined;
        knockout.defineProperty(this, 'isFullscreenEnabled', {
            get : function() {
                return tmpIsEnabled();
            },
            set : function(value) {
                tmpIsEnabled(value && Fullscreen.enabled);
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
            if (Fullscreen.fullscreen) {
                Fullscreen.exitFullscreen();
            } else {
                Fullscreen.requestFullscreen(that._fullscreenElement);
            }
        }, knockout.getObservable(this, 'isFullscreenEnabled'));

        this._fullscreenElement = defaultValue(getElement(fullscreenElement), document.body);

        this._callback = function() {
            tmpIsFullscreen(Fullscreen.fullscreen);
        };
        document.addEventListener(Fullscreen.changeEventName, this._callback);
    }

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
     * @returns {Boolean} true if the object has been destroyed, false otherwise.
     */
    FullscreenButtonViewModel.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the view model.  Should be called to
     * properly clean up the view model when it is no longer needed.
     */
    FullscreenButtonViewModel.prototype.destroy = function() {
        document.removeEventListener(Fullscreen.changeEventName, this._callback);
        destroyObject(this);
    };
export default FullscreenButtonViewModel;
