import knockout from "../knockout.js";
import createCommand from "../createCommand.js";

/**
 * The view model for {@link NavigationHelpButton}.
 * @alias NavigationHelpButtonViewModel
 * @constructor
 */
function NavigationHelpButtonViewModel() {
  /**
   * Gets or sets whether the instructions are currently shown.  This property is observable.
   * @type {Boolean}
   * @default false
   */
  this.showInstructions = false;

  var that = this;
  this._command = createCommand(function () {
    that.showInstructions = !that.showInstructions;
  });
  this._showClick = createCommand(function () {
    that._touch = false;
  });
  this._showTouch = createCommand(function () {
    that._touch = true;
  });

  this._touch = false;

  /**
   * Gets or sets the tooltip.  This property is observable.
   *
   * @type {String}
   */
  this.tooltip = "Navigation Instructions";

  knockout.track(this, ["tooltip", "showInstructions", "_touch"]);
}

Object.defineProperties(NavigationHelpButtonViewModel.prototype, {
  /**
   * Gets the Command that is executed when the button is clicked.
   * @memberof NavigationHelpButtonViewModel.prototype
   *
   * @type {Command}
   */
  command: {
    get: function () {
      return this._command;
    },
  },

  /**
   * Gets the Command that is executed when the mouse instructions should be shown.
   * @memberof NavigationHelpButtonViewModel.prototype
   *
   * @type {Command}
   */
  showClick: {
    get: function () {
      return this._showClick;
    },
  },

  /**
   * Gets the Command that is executed when the touch instructions should be shown.
   * @memberof NavigationHelpButtonViewModel.prototype
   *
   * @type {Command}
   */
  showTouch: {
    get: function () {
      return this._showTouch;
    },
  },
});
export default NavigationHelpButtonViewModel;
