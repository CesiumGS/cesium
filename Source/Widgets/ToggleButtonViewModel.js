import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import knockout from "../ThirdParty/knockout.js";

/**
 * A view model which exposes the properties of a toggle button.
 * @alias ToggleButtonViewModel
 * @constructor
 *
 * @param {Command} command The command which will be executed when the button is toggled.
 * @param {Object} [options] Object with the following properties:
 * @param {Boolean} [options.toggled=false] A boolean indicating whether the button should be initially toggled.
 * @param {String} [options.tooltip=''] A string containing the button's tooltip.
 */
function ToggleButtonViewModel(command, options) {
  //>>includeStart('debug', pragmas.debug);
  if (!defined(command)) {
    throw new DeveloperError("command is required.");
  }
  //>>includeEnd('debug');

  this._command = command;

  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  /**
   * Gets or sets whether the button is currently toggled.  This property is observable.
   * @type {Boolean}
   * @default false
   */
  this.toggled = defaultValue(options.toggled, false);

  /**
   * Gets or sets the button's tooltip.  This property is observable.
   * @type {String}
   * @default ''
   */
  this.tooltip = defaultValue(options.tooltip, "");

  knockout.track(this, ["toggled", "tooltip"]);
}

Object.defineProperties(ToggleButtonViewModel.prototype, {
  /**
   * Gets the command which will be executed when the button is toggled.
   * @memberof ToggleButtonViewModel.prototype
   * @type {Command}
   */
  command: {
    get: function () {
      return this._command;
    },
  },
});
export default ToggleButtonViewModel;
