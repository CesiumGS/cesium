import { defined, DeveloperError } from "@cesium/engine";
import knockout from "../ThirdParty/knockout.js";
import createCommand from "../createCommand.js";

/**
 * A view model that represents each item in the {@link BaseLayerPicker}.
 *
 * @alias ProviderViewModel
 * @constructor
 *
 * @param {object} options The object containing all parameters.
 * @param {string} options.name The name of the layer.
 * @param {string} options.tooltip The tooltip to show when the item is moused over.
 * @param {string} options.iconUrl An icon representing the layer.
 * @param {string} [options.category] A category for the layer.
 * @param {ProviderViewModel.CreationFunction|Command} options.creationFunction A function or Command
 *        that creates one or more providers which will be added to the globe when this item is selected.
 *
 * @see BaseLayerPicker
 * @see ImageryProvider
 * @see TerrainProvider
 */
function ProviderViewModel(options) {
  ;

  let creationCommand = options.creationFunction;
  if (!defined(creationCommand.canExecute)) {
    creationCommand = createCommand(creationCommand);
  }

  this._creationCommand = creationCommand;

  /**
   * Gets the display name.  This property is observable.
   * @type {string}
   */
  this.name = options.name;

  /**
   * Gets the tooltip.  This property is observable.
   * @type {string}
   */
  this.tooltip = options.tooltip;

  /**
   * Gets the icon.  This property is observable.
   * @type {string}
   */
  this.iconUrl = options.iconUrl;

  this._category = options.category ?? "";

  knockout.track(this, ["name", "tooltip", "iconUrl"]);
}

Object.defineProperties(ProviderViewModel.prototype, {
  /**
   * Gets the Command that creates one or more providers which will be added to
   * the globe when this item is selected.
   * @memberof ProviderViewModel.prototype
   * @memberof ProviderViewModel.prototype
   * @type {Command}
   * @readonly
   */
  creationCommand: {
    get: function () {
      return this._creationCommand;
    },
  },

  /**
   * Gets the category
   * @type {string}
   * @memberof ProviderViewModel.prototype
   * @readonly
   */
  category: {
    get: function () {
      return this._category;
    },
  },
});

/**
 * A function which creates one or more providers.
 * @callback ProviderViewModel.CreationFunction
 * @returns {ImageryProvider|TerrainProvider|ImageryProvider[]|TerrainProvider[]|Promise<TerrainProvider>|Promise<ImageryProvider>|Promise<TerrainProvider[]>|Promise<ImageryProvider[]>}
 *          The ImageryProvider or TerrainProvider, or array of providers, to be added
 *          to the globe.
 */
export { ProviderViewModel };
export default ProviderViewModel;
