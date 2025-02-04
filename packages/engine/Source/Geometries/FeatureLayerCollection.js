import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import Event from "../Core/Event.js";

/**
 * An ordered collection of feature layers.
 *
 * @alias FeatureLayerCollection
 * @constructor
 */
class FeatureLayerCollection {
  constructor() {
    this._layers = [];

    /**
     * An event that is raised when a layer is added to the collection.  Event handlers are passed the layer that
     * was added and the index at which it was added.
     * @type {Event}
     * @default Event()
     */
    this.layerAdded = new Event();

    /**
     * An event that is raised when a layer is removed from the collection.  Event handlers are passed the layer that
     * was removed and the index from which it was removed.
     * @type {Event}
     * @default Event()
     */
    this.layerRemoved = new Event();

    /**
     * An event that is raised when a layer changes position in the collection.  Event handlers are passed the layer that
     * was moved, its new index after the move, and its old index prior to the move.
     * @type {Event}
     * @default Event()
     */
    this.layerMoved = new Event();

    /**
     * An event that is raised when a layer is shown or hidden by setting the
     * {@link FeatureLayer#show} property.  Event handlers are passed a reference to this layer,
     * the index of the layer in the collection, and a flag that is true if the layer is now
     * shown or false if it is now hidden.
     *
     * @type {Event}
     * @default Event()
     */
    this.layerShownOrHidden = new Event();
  }

  /**
   * Gets the number of layers in this collection.
   * @type {number}
   */
  get length() {
    return this._layers.length;
  }

  /**
   * Adds a layer to the collection.
   *
   * @param {FeatureLayer} layer the layer to add.
   * @param {number} [index] the index to add the layer at.  If omitted, the layer will
   *                         be added on top of all existing layers.
   *
   * @exception {DeveloperError} index, if supplied, must be greater than or equal to zero and less than or equal to the number of the layers.
   */
  add(layer, index) {
    const hasIndex = defined(index);

    // TODO: Check
    //>>includeStart('debug', pragmas.debug);
    if (!defined(layer)) {
      throw new DeveloperError("layer is required.");
    }
    if (hasIndex) {
      if (index < 0) {
        throw new DeveloperError(
          "index must be greater than or equal to zero.",
        );
      } else if (index > this._layers.length) {
        throw new DeveloperError(
          "index must be less than or equal to the number of layers.",
        );
      }
    }
    //>>includeEnd('debug');

    if (!hasIndex) {
      index = this._layers.length;
      this._layers.push(layer);
    } else {
      this._layers.splice(index, 0, layer);
    }

    this._update();
    this.layerAdded.raiseEvent(layer, index);
    const removeReadyEventListener = layer.readyEvent.addEventListener(() => {
      this.layerShownOrHidden.raiseEvent(layer, layer._layerIndex, layer.show);
      removeReadyEventListener();
    });
  }

  /**
   * Checks to see if the collection contains a given layer.
   *
   * @param {FeatureLayer} layer the layer to check for.
   *
   * @returns {boolean} true if the collection contains the layer, false otherwise.
   */
  contains(layer) {
    return this.indexOf(layer) !== -1;
  }

  /**
   * Determines the index of a given layer in the collection.
   *
   * @param {FeatureLayer} layer The layer to find the index of.
   *
   * @returns {number} The index of the layer in the collection, or -1 if the layer does not exist in the collection.
   */
  indexOf(layer) {
    return this._layers.indexOf(layer);
  }

  /**
   * Gets a layer by index from the collection.
   *
   * @param {number} index the index to retrieve.
   *
   * @returns {FeatureLayer} The layer at the given index.
   */
  get(index) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(index)) {
      throw new DeveloperError("index is required.", "index");
    }
    //>>includeEnd('debug');

    return this._layers[index];
  }

  // TODO
  update(frameState) {
    this._updateLayersShownOrHidden();
  }

  // TODO
  _updateViewParameters(frameState) {}

  // TODO
  _updateLayersShownOrHidden() {
    let isBaseLayer = true;
    const layers = this._layers;
    let layersShownOrHidden;
    let layer;
    let i, len;
    for (i = 0, len = layers.length; i < len; ++i) {
      layer = layers[i];

      layer._layerIndex = i;

      if (layer.show) {
        layer._isBaseLayer = isBaseLayer;
        isBaseLayer = false;
      } else {
        layer._isBaseLayer = false;
      }

      if (layer.show !== layer._show) {
        if (defined(layer._show)) {
          if (!defined(layersShownOrHidden)) {
            layersShownOrHidden = [];
          }
          layersShownOrHidden.push(layer);
        }
        layer._show = layer.show;
      }
    }

    if (defined(layersShownOrHidden)) {
      for (i = 0, len = layersShownOrHidden.length; i < len; ++i) {
        layer = layersShownOrHidden[i];
        this.layerShownOrHidden.raiseEvent(
          layer,
          layer._layerIndex,
          layer.show,
        );
      }
    }
  }

  // TODO: Destroy
}

// TODO: Remove, removeAll

// TODO: Raise, lower, raise to top, lower to bottom

export default FeatureLayerCollection;
