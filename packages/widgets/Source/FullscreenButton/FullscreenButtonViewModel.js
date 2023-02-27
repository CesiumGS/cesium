import {
  defaultValue,
  defined,
  destroyObject,
  DeveloperError,
  Fullscreen,
  getElement,
} from "@cesium/engine";
import knockout from "../ThirdParty/knockout.js";
import createCommand from "../createCommand.js";

/**
 * The view model for {@link FullscreenButton}.
 * @alias FullscreenButtonViewModel
 * @constructor
 *
 * @param {Element|string} [fullscreenElement=document.body] The element or id to be placed into fullscreen mode.
 * @param {Element|string} [container] The DOM element or ID that will contain the widget.
 */
function FullscreenButtonViewModel(fullscreenElement, container) {
  if (!defined(container)) {
    container = document.body;
  }

  container = getElement(container);

  const that = this;

  const tmpIsFullscreen = knockout.observable(Fullscreen.fullscreen);
  const tmpIsEnabled = knockout.observable(Fullscreen.enabled);
  const ownerDocument = container.ownerDocument;

  /**
   * Gets whether or not fullscreen mode is active.  This property is observable.
   *
   * @type {boolean}
   */
  this.isFullscreen = undefined;
  knockout.defineProperty(this, "isFullscreen", {
    get: function () {
      return tmpIsFullscreen();
    },
  });

  /**
   * Gets or sets whether or not fullscreen functionality should be enabled.  This property is observable.
   *
   * @type {boolean}
   * @see Fullscreen.enabled
   */
  this.isFullscreenEnabled = undefined;
  knockout.defineProperty(this, "isFullscreenEnabled", {
    get: function () {
      return tmpIsEnabled();
    },
    set: function (value) {
      tmpIsEnabled(value && Fullscreen.enabled);
    },
  });

  /**
   * Gets the tooltip.  This property is observable.
   *
   * @type {string}
   */
  this.tooltip = undefined;
  knockout.defineProperty(this, "tooltip", function () {
    if (!this.isFullscreenEnabled) {
      return "Full screen unavailable";
    }
    return tmpIsFullscreen() ? "Exit full screen" : "Full screen";
  });

  this._command = createCommand(function () {
    if (Fullscreen.fullscreen) {
      Fullscreen.exitFullscreen();
    } else {
      Fullscreen.requestFullscreen(that._fullscreenElement);
    }
  }, knockout.getObservable(this, "isFullscreenEnabled"));

  this._fullscreenElement = defaultValue(
    getElement(fullscreenElement),
    ownerDocument.body
  );

  this._callback = function () {
    tmpIsFullscreen(Fullscreen.fullscreen);
  };
  ownerDocument.addEventListener(Fullscreen.changeEventName, this._callback);
}

Object.defineProperties(FullscreenButtonViewModel.prototype, {
  /**
   * Gets or sets the HTML element to place into fullscreen mode when the
   * corresponding button is pressed.
   * @memberof FullscreenButtonViewModel.prototype
   *
   * @type {Element}
   */
  fullscreenElement: {
    //TODO:@exception {DeveloperError} value must be a valid HTML Element.
    get: function () {
      return this._fullscreenElement;
    },
    set: function (value) {
      //>>includeStart('debug', pragmas.debug);
      if (!(value instanceof Element)) {
        throw new DeveloperError("value must be a valid Element.");
      }
      //>>includeEnd('debug');

      this._fullscreenElement = value;
    },
  },

  /**
   * Gets the Command to toggle fullscreen mode.
   * @memberof FullscreenButtonViewModel.prototype
   *
   * @type {Command}
   */
  command: {
    get: function () {
      return this._command;
    },
  },
});

/**
 * @returns {boolean} true if the object has been destroyed, false otherwise.
 */
FullscreenButtonViewModel.prototype.isDestroyed = function () {
  return false;
};

/**
 * Destroys the view model.  Should be called to
 * properly clean up the view model when it is no longer needed.
 */
FullscreenButtonViewModel.prototype.destroy = function () {
  document.removeEventListener(Fullscreen.changeEventName, this._callback);
  destroyObject(this);
};
export default FullscreenButtonViewModel;
