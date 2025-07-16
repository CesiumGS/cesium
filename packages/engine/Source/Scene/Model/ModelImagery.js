import Check from "../../Core/Check.js";
import defined from "../../Core/defined.js";
import destroyObject from "../../Core/destroyObject.js";
import DeveloperError from "../../Core/DeveloperError.js";

import ImageryConfiguration from "./ImageryConfiguration.js";
import ModelPrimitiveImagery from "./ModelPrimitiveImagery.js";

/**
 * A class managing the draping of imagery on a <code>Model</code>.
 *
 * An instance of this class is created in the Model constructor. It will
 * create the data structures that carry the information that is required
 * for mapping imagery textures on model primitives.
 *
 * It offers two functions for managing the lifecycle of this draping process:
 *
 * The <code>update</code> function is called from the <code>Model.update</code>
 * function in each frame. It will create one <code>ModelPrimitiveImagery</code>
 * instance for each primitive that appears in the model, and call the
 * <code>update</code> function of these instances, respectively.
 *
 * The <code>ready</code> getter will be used to determine whether the
 * draping computations are done, and the update process of the <code>Model</code>
 * can continue, eventually causing the <code>model.ready</code> flag to
 * become <code>true</code>. The model imagery counts as "ready" when all
 * the imagery layers of the model are <code>ready</code>, and all the
 * <code>ModelPrimitiveImagery</code> instances are <code>ready</code>.
 *
 * @private
 */
class ModelImagery {
  /**
   * Creates a new instance
   *
   * @param {Model} model The model
   * @throws {DeveloperError} If the model is not defined
   */
  constructor(model) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("model", model);
    //>>includeEnd('debug');

    /**
     * The model that this instance was created for.
     *
     * @type {Model}
     * @readonly
     * @private
     */
    this._model = model;

    /**
     * One <code<ModelPrimitiveImagery</code> for each primitive
     * that appears in the model.
     *
     * Initially, this is <code>undefined</code>. When the <code>update</code>
     * function is called and all imagery layers that are associated with the
     * model are <code>ready</code>, this is initialized with one instance
     * of a <code>ModelPrimitiveImagery</code> per runtime primitive (i.e. one for
     * each <code>model.sceneGraph._runtimeNodes[n]._runtimePrimitives[p]</code>)
     *
     * @type {ModelPrimitiveImagery[]|undefined}
     * @private
     */
    this._modelPrimitiveImageries = undefined;

    /**
     * One <code>ImageryConfiguration</code> object for each <code>ImageryLayer</code>
     * that is associated with the model.
     *
     * This is used for determining whether the configuration (relevant property
     * values) of an imagery layer has been changed since the previous
     * <code>update</code> call, which should cause the draw commands of the
     * model to be reset.
     *
     * @type {ImageryConfiguration[]}
     * @private
     */
    this._imageryConfigurations = [];
  }

  /**
   * The update function that is called from <code>Model.update</code> in
   * each frame.
   *
   * This checks whether the imagery layer objects that are associated
   * with the model are all <code>ready</code>. If they are not yet
   * ready, then nothing is done.
   *
   * Otherwise, this just calls the <code>update</code> function of
   * the <code>_modelPrimitiveImageries</code> (creating them if they had
   * not been created yet).
   *
   * @param {FrameState} frameState The frame state
   */
  update(frameState) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("frameState", frameState);
    //>>includeEnd('debug');

    if (!this._hasImagery) {
      return;
    }

    if (!this._allImageryLayersReady) {
      return;
    }

    if (!defined(this._modelPrimitiveImageries)) {
      this._modelPrimitiveImageries = this._createModelPrimitiveImageries();
    }
    this._updateModelPrimitiveImageries(frameState);

    this._checkForModifiedImageryConfigurations();
  }

  /**
   * Creates the <code>ModelPrimitiveImagery</code> array that contains
   * one <code>ModelPrimitiveImagery</code> for each primitive that is
   * contained in the model.
   *
   * @returns {ModelPrimitiveImagery[]} The model primitive imageries
   * @private
   */
  _createModelPrimitiveImageries() {
    const model = this._model;
    const runtimeNodesAndPrimitives = this._collectRuntimeNodesAndPrimitives();
    const modelPrimitiveImageries = [];
    const length = runtimeNodesAndPrimitives.length;
    for (let i = 0; i < length; i++) {
      const runtimeNodeAndPrimitive = runtimeNodesAndPrimitives[i];
      const runtimeNode = runtimeNodeAndPrimitive.runtimeNode;
      const runtimePrimitive = runtimeNodeAndPrimitive.runtimePrimitive;
      const modelPrimitiveImagery = new ModelPrimitiveImagery(
        model,
        runtimeNode,
        runtimePrimitive,
      );
      runtimePrimitive.primitive.modelPrimitiveImagery = modelPrimitiveImagery;
      modelPrimitiveImageries.push(modelPrimitiveImagery);
    }
    return modelPrimitiveImageries;
  }

  /**
   * Computes all runtime nodes and primitives of the model.
   *
   * This is just the array that contains a
   * <code>{ runtimeNode, runtimePrimitive }</code>
   * for each
   * <code>model.sceneGraph._runtimeNodes[n]._runtimePrimitives[p]</code>.
   *
   * @returns {object[]} The runtime nodes and primitives
   * @private
   */
  _collectRuntimeNodesAndPrimitives() {
    const model = this._model;
    const sceneGraph = model.sceneGraph;
    const runtimeNodes = sceneGraph._runtimeNodes;
    const runtimeNodesAndPrimitives = [];
    for (let i = 0; i < runtimeNodes.length; i++) {
      const runtimeNode = runtimeNodes[i];
      if (!defined(runtimeNode)) {
        continue;
      }
      for (let j = 0; j < runtimeNode.runtimePrimitives.length; j++) {
        const runtimePrimitive = runtimeNode.runtimePrimitives[j];
        runtimeNodesAndPrimitives.push({
          runtimeNode: runtimeNode,
          runtimePrimitive: runtimePrimitive,
        });
      }
    }
    return runtimeNodesAndPrimitives;
  }

  /**
   * Just calls <code>update</code> on each <code>ModelPrimitiveImagery</code>
   * as part of the <code>update</code> of this class.
   *
   * @private
   */
  _updateModelPrimitiveImageries(frameState) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("frameState", frameState);
    //>>includeEnd('debug');

    if (!defined(this._modelPrimitiveImageries)) {
      throw new DeveloperError(
        "The modelPrimitiveImageries have not been created",
      );
    }

    const modelPrimitiveImageries = this._modelPrimitiveImageries;
    const length = modelPrimitiveImageries.length;
    for (let i = 0; i < length; i++) {
      const modelPrimitiveImagery = modelPrimitiveImageries[i];
      modelPrimitiveImagery.update(frameState);
    }
  }

  /**
   * Destroy and delete all <code>ModelPrimitiveImagery</code> instances
   * if they already have been created.
   */
  _deleteModelPrimitiveImageries() {
    const modelPrimitiveImageries = this._modelPrimitiveImageries;
    if (!defined(modelPrimitiveImageries)) {
      return;
    }
    const length = modelPrimitiveImageries.length;
    for (let i = 0; i < length; i++) {
      const modelPrimitiveImagery = modelPrimitiveImageries[i];
      modelPrimitiveImagery.destroy();
    }
    delete this._modelPrimitiveImageries;
  }

  /**
   * Returns whether this instance is "ready".
   *
   * This means that all imagery layers that are associated with the model
   * are <code>ready</code>, and all <code>ModelPrimitiveImagery</code>
   * instances are <code>ready</code>.
   *
   * When this is <code>true</code>, then the mapping computations are
   * complete and the structures containing the mapping information have
   * been initialized. Otherwise, subsequent calls to <code>update</code>
   * will perform the necessary computation until this getter eventually
   * returns <code>true</code>.
   *
   * @returns {boolean} Whether this instance is "ready"
   */
  get ready() {
    if (!this._hasImagery) {
      return true;
    }
    if (!this._allImageryLayersReady) {
      return false;
    }
    if (!this._allModelPrimitiveImageriesReady) {
      return false;
    }
    return true;
  }

  /**
   * Returns whether the model has imagery layers associated with it.
   *
   * @private
   */
  get _hasImagery() {
    const model = this._model;
    const imageryLayers = model.imageryLayers;
    return defined(imageryLayers) && imageryLayers.length > 0;
  }

  /**
   * Returns whether all imagery layers that are associated with the
   * model are <code>ready</code>.
   *
   * If the model does not have imagery, then this always returns
   * <code>true</code>. Otherwise, it returns whether each imagery
   * layer is <code>ready</code>.
   *
   * @private
   */
  get _allImageryLayersReady() {
    if (!this._hasImagery) {
      return true;
    }
    const imageryLayers = this._model.imageryLayers;
    const length = imageryLayers.length;
    for (let i = 0; i < length; i++) {
      const imageryLayer = imageryLayers.get(i);
      if (!imageryLayer.ready) {
        return false;
      }
    }
    return true;
  }

  /**
   * Returns whether all <code>ModelPrimitiveImagery</code> instances
   * are are <code>ready</code>.
   *
   * @private
   */
  get _allModelPrimitiveImageriesReady() {
    const modelPrimitiveImageries = this._modelPrimitiveImageries;
    if (!defined(modelPrimitiveImageries)) {
      return false;
    }
    const length = modelPrimitiveImageries.length;
    for (let i = 0; i < length; i++) {
      const modelPrimitiveImagery = modelPrimitiveImageries[i];
      if (!modelPrimitiveImagery.ready) {
        return false;
      }
    }
    return true;
  }

  /**
   * Check whether any of the settings of any imagery layer (like alpha
   * or hue) has been changed since the last call to the <code>update</code>
   * function.
   *
   * If this is the case, the draw commands of the model will be reset.
   */
  _checkForModifiedImageryConfigurations() {
    if (this._imageryConfigurationsModified()) {
      this._updateImageryConfigurations();
      const model = this._model;
      model.resetDrawCommands();
    }
  }

  /**
   * Returns whether any setting of an imagery layer (like alpha or hue) has
   * been changed since the last time the <code>ImageryConfiguration</code>
   * objects have been updated.
   *
   * @returns {boolean} Whether there was a modification
   */
  _imageryConfigurationsModified() {
    const model = this._model;
    const imageryLayers = model.imageryLayers;
    const imageryConfigurations = this._imageryConfigurations;
    if (imageryLayers.length !== imageryConfigurations.length) {
      return true;
    }
    for (let i = 0; i < imageryLayers.length; i++) {
      const imageryLayer = imageryLayers.get(i);
      const imageryConfiguration = imageryConfigurations[i];

      if (imageryLayer.show !== imageryConfiguration.show) {
        return true;
      }
      if (imageryLayer.alpha !== imageryConfiguration.alpha) {
        return true;
      }
      if (imageryLayer.brightness !== imageryConfiguration.brightness) {
        return true;
      }
      if (imageryLayer.contrast !== imageryConfiguration.contrast) {
        return true;
      }
      if (imageryLayer.hue !== imageryConfiguration.hue) {
        return true;
      }
      if (imageryLayer.saturation !== imageryConfiguration.saturation) {
        return true;
      }
      if (imageryLayer.gamma !== imageryConfiguration.gamma) {
        return true;
      }
      if (imageryLayer.colorToAlpha !== imageryConfiguration.colorToAlpha) {
        return true;
      }
    }
    return false;
  }

  /**
   * Create one <code>ImageryConfiguration</code> object for each imagery
   * layer that appears in the model, and store them as the
   * <code>_imageryConfigurations</code>.
   */
  _updateImageryConfigurations() {
    const model = this._model;
    const imageryLayers = model.imageryLayers;
    const imageryConfigurations = this._imageryConfigurations;
    imageryConfigurations.length = imageryLayers.length;
    for (let i = 0; i < imageryLayers.length; i++) {
      const imageryLayer = imageryLayers.get(i);
      imageryConfigurations[i] = new ImageryConfiguration(imageryLayer);
    }
  }

  /**
   * Returns whether this object was destroyed.
   *
   * If this object was destroyed, calling any function other than
   * <code>isDestroyed</code> will result in a {@link DeveloperError}.
   *
   * @returns {boolean} Whether this object was destroyed
   */
  isDestroyed() {
    return false;
  }

  /**
   * Destroys this object and all its resources.
   */
  destroy() {
    if (this.isDestroyed()) {
      return;
    }
    this._deleteModelPrimitiveImageries();
    return destroyObject(this);
  }
}

export default ModelImagery;
