import defined from "../../Core/defined.js";
import DeveloperError from "../../Core/DeveloperError.js";
import Matrix4 from "../../Core/Matrix4.js";
import Check from "../../Core/Check.js";

import ImageryState from "../ImageryState.js";
import ImageryCoverageComputations from "./ImageryCoverageComputations.js";
import ModelImageryMapping from "./ModelImageryMapping.js";
import ModelUtility from "./ModelUtility.js";
import MappedPositions from "./MappedPositions.js";

/**
 * A class managing the draping of imagery on a single model primitive.
 *
 * The <code>ModelImagery</code> class creates one instance of this
 * class for each primitive that appears in the model.
 *
 * It is responsible for computing the mapped (cartographic) positions
 * of the primitive, and computing the imagery tiles that are covered
 * by these mapped positions.
 */
class ModelPrimitiveImagery {
  /**
   * Creates a new instance
   *
   * @param {Model} model The model
   * @param {ModelRuntimeNode} runtimeNode The node that the primitive is attached to
   * @param {ModelRuntimePrimitive} runtimePrimitive The primitive
   * @throws {DeveloperError} If any argument is not defined, or the
   * given primitive does not have a <code>"POSITION"</code> attribute.
   */
  constructor(model, runtimeNode, runtimePrimitive) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("model", model);
    Check.defined("runtimeNode", runtimeNode);
    Check.defined("runtimePrimitive", runtimePrimitive);
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
     * The node that the primitive is attached to
     *
     * @type {ModelRuntimeNode}
     * @readonly
     * @private
     */
    this._runtimeNode = runtimeNode;

    /**
     * The primitive that this instance was created for.
     *
     * @type {ModelRuntimePrimitive}
     * @readonly
     * @private
     */
    this._runtimePrimitive = runtimePrimitive;

    /**
     * The <code>"POSITION"</code> attribute of the primitive.
     *
     * @type {ModelComponents.Attribute}
     * @readonly
     * @private
     */
    this._primitivePositionAttribute =
      ModelPrimitiveImagery._obtainPrimitivePositionAttribute(
        runtimePrimitive.primitive,
      );

    /**
     * The <code>MappedPositions</code> objects, one for each ellipsoid
     * of one of the imagery layers
     *
     * These objects are just plain structures that summarize the
     * cartographic positions of the primitive for one specific
     * ellipsoid
     *
     * @type {MappedPositions[]|undefined}
     * @private
     */
    this._mappedPositionsPerEllipsoid = undefined;

    /**
     * The last <code>model.modelMatrix</code> for which the mapped
     * positions have been computed.
     *
     * This is used for detecting changes in the model matrix that
     * make it necessary to re-compute the mapped positions.
     *
     * @type {Matrix4}
     * @readonly
     * @private
     */
    this._mappedPositionsModelMatrix = new Matrix4();

    /**
     * Information about the imagery tiles that are covered by the positions
     * of the primitive.
     *
     * This is computed in the <code>update</code> function, based on the
     * mapped positions of the primitive. After this computation,
     * <code>_coveragesPerLayer[layerIndex]</code> is an array that contains
     * the <code>ImageryCoverage</code> objects that describe the imagery
     * tiles that are covered, including their texture coordinate rectangle.
     *
     * @type {ImageryCoverage[][]|undefined}
     * @private
     */
    this._coveragesPerLayer = undefined;

    /**
     * A flag indicating whether all imagery objects that are covered
     * are "ready".
     *
     * This is initially <code>false</code>. During the calls to the
     * <code>update</code> function (which are triggered from the
     * <code>Model.update</code> function, each frame), the
     * <code>_updateImageries</code> function will be called, and
     * process the imagery tiles, until all them them are in the
     * <code>ImageryState.READY</code> state, at which point this
     * flag is set to <code>true</code>.
     *
     * @type {boolean}
     * @private
     */
    this._allImageriesReady = false;
  }

  /**
   * Returns the <code>ImageryCoverage</code> array that has been
   * computed for the given imagery layer.
   *
   * This assumes that the given imagery layer is part of the
   * imagery layer collection of the model, and that this
   * model primitive imagery is "ready", meaning that the
   * coverages have already been computed.
   *
   * Clients may <b>not</b> modify the returned array or any
   * of its objects!
   *
   * @param {ImageryLayer} imageryLayer The imagery layer
   * @returns {ImageryCoverage[]} The coverage information
   */
  coveragesForImageryLayer(imageryLayer) {
    const model = this._model;
    const imageryLayers = model.imageryLayers;
    const index = imageryLayers.indexOf(imageryLayer);
    if (index === -1) {
      throw new DeveloperError("Imagery layer is not part of the model");
    }
    const coveragesPerLayer = this._coveragesPerLayer;
    if (!defined(coveragesPerLayer)) {
      throw new DeveloperError(
        `The coveragesPerLayer have not been computed yet`,
      );
    }
    return coveragesPerLayer[index];
  }

  /**
   * Update the state of this instance.
   *
   * This is called as part of <code>ModelImagery.update</code>, which in
   * turn is part of the <code>Model.update</code> that is called in each
   * frame.
   *
   * This will perform the computations that are required to establish
   * the mapping between the imagery and the primitive. It will...
   * <ul>
   *   <li>
   *     Compute the <code>MappedPositions</code> of the primitive,
   *     one instance for each ellipsoid
   *   </li>
   *   <li>
   *     Compute the "coverages per layer", containing the information
   *     about which parts of the respective imagery layer are covered
   *     by the mapped positions
   *   </li>
   *   <li>
   *     Update the imageries (i.e. processing their state machine by
   *     calling <code>Imagery.processStateMachine</code>) until they
   *     are in the <code>ImageryState.READY</code> state
   *   </li>
   * </ul>
   *
   * @param {FrameState} frameState The frame state
   */
  update(frameState) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("frameState", frameState);
    //>>includeEnd('debug');

    if (this._mappedPositionsNeedUpdate) {
      this._mappedPositionsPerEllipsoid =
        this._computeMappedPositionsPerEllipsoid();
      this._coveragesPerLayer = undefined;
    }

    if (!defined(this._coveragesPerLayer)) {
      this._coveragesPerLayer = this._computeCoveragesPerLayer(frameState);
      this._allImageriesReady = false;
    }
    if (!this._allImageriesReady) {
      this._updateImageries(frameState);
    }
  }

  /**
   * Returns whether the <code>MappedPositions</code> have to be
   * re-computed with <code>_computeMappedPositionsPerEllipsoid</code>.
   *
   * This is <code>true</code> when the positions have not yet been
   * computed, or when the <code>modelMatrix/code> of the model
   * changed since the previous call.
   *
   * @returns {boolean} Whether the mapped positions need an update
   * @private
   */
  get _mappedPositionsNeedUpdate() {
    if (!defined(this._mappedPositionsPerEllipsoid)) {
      return true;
    }
    const model = this._model;
    const lastModelMatrix = this._mappedPositionsModelMatrix;
    if (!Matrix4.equals(model.modelMatrix, lastModelMatrix)) {
      // XXX_DRAPING Check whether this should be done here...
      model.resetDrawCommands();
      return true;
    }
    return false;
  }

  /**
   * Computes the mapped positions of the primitive, one for each ellipsoid.
   *
   * This computes the <i>unique</i> ellipsoids that appear in the imagery
   * layers of the model, and creates one <code>MappedPositions</code>
   * object for each of them.
   *
   * The respective <code>MappedPositions</code> objects will contain
   * the cartographic positions that are computed from the positions
   * of the primitive. These will serve as the basis for computing the
   * part of the imagery that is covered by the primitive.
   *
   * These mapped positions depend on the current <code>modelMatrix</code>
   * of the model. So they have to be re-computed when the model matrix
   * changes.
   *
   * @returns {MappedPositions[]} The mapped positions
   * @private
   */
  _computeMappedPositionsPerEllipsoid() {
    const model = this._model;
    const runtimeNode = this._runtimeNode;

    // The _primitivePositionAttribute is ensured to be defined in the constructor
    const primitivePositionAttribute = this._primitivePositionAttribute;
    const numPositions = primitivePositionAttribute.count;

    const primitivePositionTransform =
      ModelPrimitiveImagery._computePrimitivePositionTransform(
        model,
        runtimeNode,
        undefined,
      );

    const mappedPositionsPerEllipsoid = [];
    const ellipsoids = ModelPrimitiveImagery._computeUniqueEllipsoids(
      model.imageryLayers,
    );

    const length = ellipsoids.length;
    for (let i = 0; i < length; i++) {
      const ellipsoid = ellipsoids[i];
      const cartographicPositions =
        ModelImageryMapping.createCartographicPositions(
          primitivePositionAttribute,
          primitivePositionTransform,
          ellipsoid,
        );
      const cartographicBoundingRectangle =
        ModelImageryMapping.computeCartographicBoundingRectangle(
          cartographicPositions,
        );

      const mappedPositions = new MappedPositions(
        cartographicPositions,
        numPositions,
        cartographicBoundingRectangle,
        ellipsoid,
      );
      mappedPositionsPerEllipsoid.push(mappedPositions);
    }
    Matrix4.clone(model.modelMatrix, this._mappedPositionsModelMatrix);
    return mappedPositionsPerEllipsoid;
  }

  /**
   * Computes an array containing the <i>unique</i> ellipsoids that
   * appear in the imagery layers of the given collection.
   *
   * @param {ImageryLayerCollection} imageryLayers
   * @returns {Ellipsoid[]} The ellipsoids
   * @private
   */
  static _computeUniqueEllipsoids(imageryLayers) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("imageryLayers", imageryLayers);
    //>>includeEnd('debug');

    const ellipsoidsSet = new Set();
    const length = imageryLayers.length;
    for (let i = 0; i < length; i++) {
      const imageryLayer = imageryLayers.get(i);
      const ellipsoid = ModelPrimitiveImagery._getEllipsoid(imageryLayer);
      ellipsoidsSet.add(ellipsoid);
    }
    return [...ellipsoidsSet];
  }

  /**
   * Compute the coverage information for the primitive, based on the
   * imagery layers that are associated with the model.
   *
   * This returns an array where <code>coveragesPerLayer[layerIndex]</code>
   * is an array that contains the <code>ImageryCoverage</code> objects that
   * describe the imagery tiles that are covered by the primitive, including
   * their texture coordinate rectangle.
   *
   * This has to be called after the mapped positions for the primitive
   * have been computed with <code>_computeMappedPositionsPerEllipsoid</code>.
   *
   * @returns {ImageryCoverage[][]} The coverage information
   * @private
   */
  _computeCoveragesPerLayer() {
    const model = this._model;
    const imageryLayers = model.imageryLayers;
    const coveragesPerLayer = [];
    const length = imageryLayers.length;
    for (let i = 0; i < length; i++) {
      const imageryLayer = imageryLayers.get(i);
      const coverages = this._computeCoverage(imageryLayer);
      coveragesPerLayer.push(coverages);
    }
    return coveragesPerLayer;
  }

  /**
   * Compute the coverage information for the primitive, based on the
   * given imagery layer.
   *
   * This returns an array that contains the <code>ImageryCoverage</code>
   * objects that describe the imagery tiles that are covered by the
   * primitive, including their texture coordinate rectangle.
   *
   * This has to be called after the mapped positions for the primitive
   * have been computed with <code>_computeMappedPositionsPerEllipsoid</code>.
   *
   * @param {ImageryLayer} imageryLayer The imagery layer
   * @returns {ImageryCoverage[]} The coverage information
   * @private
   */
  _computeCoverage(imageryLayer) {
    const mappedPositions = this.mappedPositionsForImageryLayer(imageryLayer);
    const cartographicBoundingRectangle =
      mappedPositions.cartographicBoundingRectangle;

    const imageryLevel = this._computeImageryLevel(
      imageryLayer,
      cartographicBoundingRectangle,
    );

    const coverages = ImageryCoverageComputations.createImageryCoverages(
      cartographicBoundingRectangle,
      imageryLayer,
      imageryLevel,
    );

    // XXX_DRAPING Debug log
    /*/
    {
      console.log("Computed coverages for imageryLayer ", imageryLayer);
      console.log("Coverages: ", coverages.length);
      for (const coverage of coverages) {
        console.log(coverage);
      }
    }
    //*/

    // XXX_DRAPING Adding references here? Where will they be removed?
    //*
    for (const coverage of coverages) {
      const imagery = imageryLayer.getImageryFromCache(
        coverage.x,
        coverage.y,
        coverage.level,
      );
      imagery.addReference();
    }
    //*/

    return coverages;
  }

  /**
   * Compute a <code>level</code> for accessing the imagery from the given
   * imagery layer that is suitable for a primitive with the given bounding
   * rectangle.
   *
   * TODO_DRAPING Preliminary...
   *
   * @param {ImageryLayer} imageryLayer The imagery layer
   * @param {Rectangle} cartographicBoundingRectangle The cartographic
   * bounding rectangle, as obtained from the MappedPositions for
   * the given imagery layer
   * @returns The imagery level
   */
  _computeImageryLevel(imageryLayer, cartographicBoundingRectangle) {
    const imageryProvider = imageryLayer.imageryProvider;
    const tilingScheme = imageryProvider.tilingScheme;
    const rectangle = tilingScheme.rectangle;

    // The number of tiles covered by the boundingRectangle (b)
    // for a certain level, based on the tiling scheme rectangle (r) is
    // numberOfTilesCovered = b / (r / 2^level)
    // Solving for "level" yields
    // level = log2( numberOfTilesCovered * r / b)

    // TODO_DRAPING This may have to be configurable, eventually.
    // Right now, it implies to goal to drape approximately (!)
    // one imagery tile on each primitive. In practice, it may
    // be more (up to 9 in theory)
    const desiredNumberOfTilesCovered = 1;

    // Perform the computation of the desired level, based on the
    // number of tiles that should be covered (by whatever is
    // larger, the width or the height)
    let boundingRectangleSize = cartographicBoundingRectangle.width;
    let rectangleSize = rectangle.width;
    if (
      cartographicBoundingRectangle.height > cartographicBoundingRectangle.width
    ) {
      boundingRectangleSize = cartographicBoundingRectangle.height;
      rectangleSize = rectangle.height;
    }
    const desiredLevel = Math.log2(
      (desiredNumberOfTilesCovered * rectangleSize) / boundingRectangleSize,
    );

    // Clamp the level to a valid range, and an integer value
    const imageryLevel = ImageryCoverageComputations._validateImageryLevel(
      imageryProvider,
      desiredLevel,
    );

    // XXX_DRAPING return the selectable level for tests
    //if (defined(Model.XXX_DRAPING_LEVEL)) {
    //  return Model.XXX_DRAPING_LEVEL;
    //}
    //console.log(
    //  `To cover ${desiredNumberOfTilesCovered} tiles need level ${desiredLevel}, clamped to ${validImageryLevel}, as int ${imageryLevel}`,
    //);
    return imageryLevel;
  }

  /**
   * Update all <code>Imagery</code> objects.
   *
   * This is called as part of <code>update</code>, until all required
   * imagery tiles are "ready", as indicated by their <code>state</code>
   * being <code>ImageryState.READY</code>.
   *
   * This is called after it has been determined which imagery tiles are
   * covered by the primitive (i.e. after the <code>_coveragesPerLayer</code>
   * have been computed by calling <code>_computeCoverages</code>).
   *
   * For each covered imagery tile, this will call
   * <code>Imagery.processStateMachine</code> until they are in the
   * "ready" state.
   *
   * Once they all are in the "ready" state, will set the
   * <code>_allImageriesReady</code> flag to <code>true</code>.
   *
   * @param {FrameState} frameState The frame state
   * @private
   */
  _updateImageries(frameState) {
    const model = this._model;
    const imageryLayers = model.imageryLayers;
    const coveragesPerLayer = this._coveragesPerLayer;
    const length = coveragesPerLayer.length;
    let allImageriesReady = true;
    for (let i = 0; i < length; i++) {
      const imageryLayer = imageryLayers.get(i);
      const coverages = coveragesPerLayer[i];
      const n = coverages.length;
      for (let j = 0; j < n; j++) {
        const coverage = coverages[j];
        const imagery = imageryLayer.getImageryFromCache(
          coverage.x,
          coverage.y,
          coverage.level,
        );

        const countsAsReadyInThatObscureStateMachine =
          imagery.state === ImageryState.READY ||
          imagery.state === ImageryState.FAILED ||
          imagery.state === ImageryState.INVALID;
        if (!countsAsReadyInThatObscureStateMachine) {
          allImageriesReady = false;
          imagery.processStateMachine(frameState, false, false);
        }
      }
    }

    if (allImageriesReady) {
      // XXX_DRAPING Debug log
      //console.log("All imageries are ready now in ModelPrimitiveImagery");
    }

    this._allImageriesReady = allImageriesReady;
  }

  /**
   * Returns the <code>MappedPositions</code> object that contains
   * information about the primitive positions that have been computed
   * for the given imagery layer.
   *
   * This assumes that <code>_computeMappedPositionsPerEllipsoid</code> has
   * already been called.
   *
   * @param {ImageryLayer} imageryLayer The imageryLayer
   * @returns {MappedPositions} The mapped positions
   * @throws {DeveloperError} If the mapped positions for the
   * ellipsoid could not be found.
   */
  mappedPositionsForImageryLayer(imageryLayer) {
    const ellipsoid = ModelPrimitiveImagery._getEllipsoid(imageryLayer);
    return this.mappedPositionsForEllipsoid(ellipsoid);
  }

  /**
   * Returns the <code>MappedPositions</code> object that contains
   * information about the primitive positions that have been computed
   * from the given ellipsoid.
   *
   * This assumes that <code>_computeMappedPositions</code> has
   * already been called.
   *
   * @param {Ellipsoid} ellipsoid The ellipsoid
   * @returns {MappedPositions} The mapped positions
   * @throws {DeveloperError} If the mapped positions for the
   * given ellipsoid could not be found.
   */
  mappedPositionsForEllipsoid(ellipsoid) {
    const mappedPositionsPerEllipsoid = this._mappedPositionsPerEllipsoid;
    if (!defined(mappedPositionsPerEllipsoid)) {
      throw new DeveloperError(
        `The mappedPositions have not been computed yet`,
      );
    }

    const length = mappedPositionsPerEllipsoid.length;
    for (let i = 0; i < length; i++) {
      const mappedPositions = mappedPositionsPerEllipsoid[i];
      if (mappedPositions.ellipsoid === ellipsoid) {
        return mappedPositions;
      }
    }
    throw new DeveloperError(
      `Could not find mapped positions for ellipsoid ${ellipsoid}`,
    );
  }

  /**
   * Returns whether the draping computations are "ready".
   *
   * This means that the <code>coveragesPerLayer</code> information
   * has been computed, which describes the set of imagery tiles
   * that are covered by the primitive, <b>and</b> that all the
   * covered imagery tiles are in the <code>ImageryState.READY</code>
   * state.
   *
   * @returns {boolean} Whether the draping computations are ready
   */
  get ready() {
    const coveragesPerLayer = this._coveragesPerLayer;
    if (!defined(coveragesPerLayer)) {
      return false;
    }
    return this._allImageriesReady;
  }

  /**
   * Compute the transform that apparently has to be applied to
   * the positions attribute of a primitive, to compute the
   * actual, final positions in ECEF coordinates.
   *
   * This is based on the computation of the bounding
   * sphere that is done at the end of buildDrawCommands
   *
   * @param {Model} model The model
   * @param {ModelComponents.Node} runtimeNode The runtime node
   * that the primitive is attached to
   * @param {Matrix4} [result] The result
   * @returns {Matrix4} The result
   * @private
   */
  static _computePrimitivePositionTransform(model, runtimeNode, result) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("model", model);
    Check.defined("runtimeNode", runtimeNode);
    //>>includeEnd('debug');

    if (!defined(result)) {
      result = new Matrix4();
    }

    const modelSceneGraph = model.sceneGraph;

    Matrix4.clone(Matrix4.IDENTITY, result);
    Matrix4.multiply(result, model.modelMatrix, result);
    Matrix4.multiply(result, modelSceneGraph.components.transform, result);
    Matrix4.multiply(result, modelSceneGraph.axisCorrectionMatrix, result);
    Matrix4.multiply(result, runtimeNode.computedTransform, result);
    return result;
  }

  /**
   * Returns the <code>"POSITION"</code> attribute from the given primitive.
   *
   * The <code>"POSITION"</code> attribute is required. If it is not
   * defined for the given primitive, then a <code>DeveloperError</code>
   * is thrown.
   *
   * @param {ModelComponents.Primitive} primitive The primitive
   * @returns {ModelComponents.Attribute} The position attribute
   * @throws {DeveloperError} If there is no position attribute
   * @private
   */
  static _obtainPrimitivePositionAttribute(primitive) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("primitive", primitive);
    //>>includeEnd('debug');

    const primitivePositionAttribute = ModelUtility.getAttributeBySemantic(
      primitive,
      "POSITION",
    );
    if (!defined(primitivePositionAttribute)) {
      throw new DeveloperError(
        "The primitive does not have a POSITION attribute",
      );
    }
    return primitivePositionAttribute;
  }

  /**
   * Returns the ellipsoid of the given imagery layer.
   *
   * XXX_DRAPING This only exists to hide a train wreck
   *
   * @param {ImageryLayer} imageryLayer The imagery layer
   * @returns {Ellipsoid} The ellipsoid
   * @private
   */
  static _getEllipsoid(imageryLayer) {
    const ellipsoid =
      imageryLayer.imageryProvider.tilingScheme.projection.ellipsoid;
    return ellipsoid;
  }
}

export default ModelPrimitiveImagery;
