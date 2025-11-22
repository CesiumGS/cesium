import defined from "../../Core/defined.js";
import DeveloperError from "../../Core/DeveloperError.js";
import Matrix4 from "../../Core/Matrix4.js";
import Check from "../../Core/Check.js";
import destroyObject from "../../Core/destroyObject.js";

import ImageryState from "../ImageryState.js";
import ImageryCoverage from "./ImageryCoverage.js";
import ModelImageryMapping from "./ModelImageryMapping.js";
import ModelUtility from "./ModelUtility.js";
import MappedPositions from "./MappedPositions.js";

import Buffer from "../../Renderer/Buffer.js";
import BufferUsage from "../../Renderer/BufferUsage.js";

/**
 * A class managing the draping of imagery on a single model primitive.
 *
 * The <code>ModelImagery</code> class creates one instance of this
 * class for each primitive that appears in the model.
 *
 * It is responsible for computing
 * - the mapped (cartographic) positions of the primitive
 * - the imagery tiles that are covered by these mapped positions
 * - the texture coordinates (attributes) that correspond to these mapped positions
 *
 * @private
 */
class ModelPrimitiveImagery {
  /**
   * Creates a new instance
   *
   * @param {Model} model The model
   * @param {ModelRuntimeNode} runtimeNode The node that the primitive is attached to
   * @param {ModelRuntimePrimitive} runtimePrimitive The primitive
   * @throws {DeveloperError} If any argument is not defined
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
     * The value that the <code>Cesium3DTileset.imageryLayersModificationCounter</code>
     * had during the last update call. This is used for triggering updates when the
     * imagery layer collection in the tileset changes.
     */
    this._lastImageryLayersModificationCounter = 0;

    /**
     * The texture coordinate attributes, one for each projection.
     *
     * This contains one <code>ModelComponents.Attribute</code> for each
     * unique projection that is used in the imagery layers. These
     * texture coordinate attributes are computed based on the mapped
     * positions for the respective ellipsoid of that projection.
     */
    this._imageryTexCoordAttributesPerProjection = undefined;

    /**
     * The current imagery layers.
     *
     * This is initialized when the _coveragesPerLayer are computed,
     * and tracked to that the reference counters of the imageries
     * can be decreased when the coverages per layer are deleted.
     *
     * @type {ImageryLayer[]|undefined}
     * @private
     */
    this._currentImageryLayers = undefined;

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
     * process the imagery tiles, until all them them are in a
     * state like <code>ImageryState.READY</code>, at which point
     * this flag is set to <code>true</code>.
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
   *     Compute the texture coordinate attributes for the imagery, one
   *     for each projection, and store them as the
   *     <code>_imageryTexCoordAttributesPerProjection</code>
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

    // If the imagery layers have been modified since the last call
    // to this function, then re-build everything
    const model = this._model;
    const content = model.content;
    const tileset = content.tileset;
    const modificationCounter = tileset.imageryLayersModificationCounter;
    if (this._lastImageryLayersModificationCounter !== modificationCounter) {
      delete this._mappedPositionsPerEllipsoid;
      this._lastImageryLayersModificationCounter = modificationCounter;
    }

    if (this._mappedPositionsNeedUpdate) {
      model.resetDrawCommands();
      this._mappedPositionsPerEllipsoid =
        this._computeMappedPositionsPerEllipsoid();
      this._deleteCoveragesPerLayer();
      this._destroyImageryTexCoordAttributes();
    }

    if (!defined(this._imageryTexCoordAttributesPerProjection)) {
      this._imageryTexCoordAttributesPerProjection =
        this._computeImageryTexCoordsAttributesPerProjection();
      this._uploadImageryTexCoordAttributes(frameState.context);
    }

    if (!defined(this._coveragesPerLayer)) {
      this._computeCoveragesPerLayer();
      this._allImageriesReady = false;
    }
    if (!this._allImageriesReady) {
      this._updateImageries(frameState);
    }
  }

  /**
   * Delete the <code>_coveragesPerLayer</code> if they are defined.
   *
   * This will call <code>deleteCoverages</code> for each set of coverages,
   * and eventually delete the <code>_coveragesPerLayer</code>.
   *
   * This will cause the reference counters of the imageries to be
   * decreased.
   */
  _deleteCoveragesPerLayer() {
    const coveragesPerLayer = this._coveragesPerLayer;
    if (!defined(coveragesPerLayer)) {
      return;
    }
    const imageryLayers = this._currentImageryLayers;
    const length = coveragesPerLayer.length;
    for (let i = 0; i < length; i++) {
      const imageryLayer = imageryLayers[i];
      const coverages = coveragesPerLayer[i];
      this._deleteCoverages(imageryLayer, coverages);
    }
    delete this._currentImageryLayers;
    delete this._coveragesPerLayer;
  }

  /**
   * Delete the given imagery coverage objects for the given imagery
   * layer, meaning that it will cause the reference counters of the
   * imageries to be decreased.
   *
   * If the imagery layer already has been destroyed, then nothing
   * will be done.
   *
   * @param {ImageryLayer} imageryLayer The imagery layer
   * @param {ImageryCoverage[]} coverages The coverages
   */
  _deleteCoverages(imageryLayer, coverages) {
    if (imageryLayer.isDestroyed()) {
      return;
    }
    const length = coverages.length;
    for (let i = 0; i < length; i++) {
      const coverage = coverages[i];
      const imagery = coverage.imagery;
      imagery.releaseReference();
    }
  }

  /**
   * Create the GPU buffers for the typed arrays that are contained
   * in the <code>_imageryTexCoordAttributesPerProjection</code>
   *
   * @param {Context} context The GL context
   */
  _uploadImageryTexCoordAttributes(context) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("context", context);
    //>>includeEnd('debug');

    const attributes = this._imageryTexCoordAttributesPerProjection;
    if (!defined(attributes)) {
      return;
    }
    const n = attributes.length;
    for (let i = 0; i < n; i++) {
      const attribute = attributes[i];

      // Allocate the GL resources for the new attribute
      const imageryTexCoordBuffer = Buffer.createVertexBuffer({
        context: context,
        typedArray: attribute.typedArray,
        usage: BufferUsage.STATIC_DRAW,
      });

      // TODO_DRAPING Review this. Probably, some cleanup
      // has to happen somewhere else after setting this.
      // Check that the call to "destroy" in
      // _destroyImageryTexCoordAttributes is the right
      // thing to do here.
      imageryTexCoordBuffer.vertexArrayDestroyable = false;

      attribute.buffer = imageryTexCoordBuffer;
    }
  }

  /**
   * Destroy the <code>_imageryTexCoordAttributesPerProjection</code>
   * array.
   *
   * This is called for cleaning up the allocated GPU resources, before
   * they are supposed to be re-computed with
   * <code>_computeImageryTexCoordsAttributesPerProjection</code>
   */
  _destroyImageryTexCoordAttributes() {
    const attributes = this._imageryTexCoordAttributesPerProjection;
    if (!defined(attributes)) {
      return;
    }
    const n = attributes.length;
    for (let i = 0; i < n; i++) {
      const attribute = attributes[i];
      if (defined(attribute)) {
        if (defined(attribute.buffer)) {
          if (!attribute.buffer.isDestroyed()) {
            attribute.buffer.destroy();
          }
        }
        attributes[i] = undefined;
      }
    }
    delete this._imageryTexCoordAttributesPerProjection;
  }

  /**
   * Returns whether the <code>MappedPositions</code> have to be
   * re-computed with <code>_computeMappedPositionsPerEllipsoid</code>.
   *
   * This is <code>true</code> when the positions have not yet been
   * computed, or when the <code>modelMatrix</code> of the model
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
    const runtimePrimitive = this._runtimePrimitive;

    const primitivePositionAttribute =
      ModelPrimitiveImagery._obtainPrimitivePositionAttribute(
        runtimePrimitive.primitive,
      );
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
   * Computes one coordinate attribute for each unique projection
   * that is used in the imagery layers.
   *
   * This is taking the mapped positions, projecting them with
   * the respective projection, and creating a texture coordinate
   * attribute that describes the texture coordinates of these
   * positions, relative to the cartographic bounding rectangle
   * of the mapped positions.
   *
   * @returns {ModelComponents.Attribute[]} The attributes
   */
  _computeImageryTexCoordsAttributesPerProjection() {
    const model = this._model;
    const imageryLayers = model.imageryLayers;

    // Compute the arrays containing ALL projections and the array
    // containing the UNIQUE projections from the imagery layers.
    // Texture coordinate attributes only have to be created once
    // for each projection.
    const allProjections =
      ModelPrimitiveImagery._extractProjections(imageryLayers);
    const uniqueProjections = [...new Set(allProjections)];

    // Create one texture coordinate attribute for each distinct
    // projection that is used in the imagery layers
    const attributes = this._createImageryTexCoordAttributes(uniqueProjections);
    return attributes;
  }

  /**
   * Computes an array containing the projections that are used in
   * the given imagery layers.
   *
   * (Note that this array may contain duplicates)
   *
   * @param {ImageryLayerCollection} imageryLayers The imagery layers
   * @returns {MapProjection[]} The projections
   * @private
   */
  static _extractProjections(imageryLayers) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("imageryLayers", imageryLayers);
    //>>includeEnd('debug');

    const projections = [];
    const length = imageryLayers.length;
    for (let i = 0; i < length; i++) {
      const imageryLayer = imageryLayers.get(i);
      const projection = ModelPrimitiveImagery._getProjection(imageryLayer);
      projections.push(projection);
    }
    return projections;
  }

  /**
   * Returns the projection of the given imagery layer.
   *
   * This only exists to hide a train wreck
   *
   * @param {ImageryLayer} imageryLayer The imagery layer
   * @returns {MapProjection} The projection
   * @private
   */
  static _getProjection(imageryLayer) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("imageryLayer", imageryLayer);
    //>>includeEnd('debug');
    const projection = imageryLayer.imageryProvider.tilingScheme.projection;
    return projection;
  }

  /**
   * Create texture coordinates, one for each projection.
   *
   * This will create a texture coordinate attribute for each of the given projections,
   * using <code>ModelImageryMapping.createTextureCoordinatesAttributeForMappedPositions</code>,
   *
   * (This means that the given projections should indeed be unique,
   * i.e. contain no duplicates)
   *
   * @param {MapProjection[]} uniqueProjections The projections
   * @returns {ModelComponents.Attribute[]} The attributes
   */
  _createImageryTexCoordAttributes(uniqueProjections) {
    //>>includeStart('debug', pragmas.debug);
    Check.defined("uniqueProjections", uniqueProjections);
    //>>includeEnd('debug');

    const imageryTexCoordAttributePerUniqueProjection = [];
    const length = uniqueProjections.length;
    for (let i = 0; i < length; i++) {
      // Obtain the mapped positions for the ellipsoid that is used
      // in the projection (i.e. the cartographic positions of the
      // primitive, for the respective ellipsoid)
      const projection = uniqueProjections[i];
      const ellipsoid = projection.ellipsoid;
      const mappedPositions = this.mappedPositionsForEllipsoid(ellipsoid);

      // Create the actual attribute
      const imageryTexCoordAttribute =
        ModelImageryMapping.createTextureCoordinatesAttributeForMappedPositions(
          mappedPositions,
          projection,
        );
      imageryTexCoordAttributePerUniqueProjection.push(
        imageryTexCoordAttribute,
      );
    }
    return imageryTexCoordAttributePerUniqueProjection;
  }

  /**
   * Compute the coverage information for the primitive, based on the
   * imagery layers that are associated with the model.
   *
   * This updates the <code>_coveragesPerLayer[layerIndex]</code>, which
   * is an array that contains the <code>ImageryCoverage</code> objects that
   * describe the imagery tiles that are covered by the primitive, including
   * their texture coordinate rectangle.
   *
   * This has to be called after the mapped positions for the primitive
   * have been computed with <code>_computeMappedPositionsPerEllipsoid</code>.
   *
   * @private
   */
  _computeCoveragesPerLayer() {
    const coveragesPerLayer = [];
    const currentImageryLayers = [];

    const model = this._model;
    const imageryLayers = model.imageryLayers;
    const length = imageryLayers.length;
    for (let i = 0; i < length; i++) {
      const imageryLayer = imageryLayers.get(i);
      const coverages = this._computeCoverage(imageryLayer);
      coveragesPerLayer.push(coverages);
      currentImageryLayers.push(imageryLayer);
    }

    this._coveragesPerLayer = coveragesPerLayer;
    this._currentImageryLayers = currentImageryLayers;
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

    const coverages = ImageryCoverage.createImageryCoverages(
      cartographicBoundingRectangle,
      imageryLayer,
      imageryLevel,
    );
    return coverages;
  }

  /**
   * Compute a <code>level</code> for accessing the imagery from the given
   * imagery layer that is suitable for a primitive with the given bounding
   * rectangle.
   *
   * @param {ImageryLayer} imageryLayer The imagery layer
   * @param {Rectangle} cartographicBoundingRectangle The cartographic
   * bounding rectangle, as obtained from the MappedPositions for
   * the given imagery layer
   * @returns {number} The imagery level
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

    // The goal here is to drape approximately (!) one imagery
    // tile on each primitive. In practice, it may be more
    // (up to 9 in theory)
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
    const imageryLevel = ImageryCoverage._clampImageryLevel(
      imageryProvider,
      desiredLevel,
    );
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
   * <code>Imagery.processStateMachine</code> until they are either
   * READY, FAILED, or INVALID.
   *
   * Once they all are in one of these final states, it will set the
   * <code>_allImageriesReady</code> flag to <code>true</code>.
   *
   * @param {FrameState} frameState The frame state, to be passed to
   * <code>imagery.processStateMachine</code>
   * @private
   */
  _updateImageries(frameState) {
    const model = this._model;
    const coveragesPerLayer = this._coveragesPerLayer;
    const length = coveragesPerLayer.length;
    let allImageriesReady = true;
    for (let i = 0; i < length; i++) {
      const coverages = coveragesPerLayer[i];
      const n = coverages.length;
      for (let j = 0; j < n; j++) {
        const coverage = coverages[j];
        const imagery = coverage.imagery;

        // In the context of loading the imagery for draping
        // it over the primitive, the imagery counts as "ready"
        // when it is really ready, but also when it failed
        // or was invalid (otherwise, the primitive would
        // never turn "ready"
        const countsAsReady =
          imagery.state === ImageryState.READY ||
          imagery.state === ImageryState.FAILED ||
          imagery.state === ImageryState.INVALID;
        if (!countsAsReady) {
          allImageriesReady = false;
          imagery.processStateMachine(frameState, false, false);
        }
      }
    }

    // When the imageries turned ready, reset the draw commands
    // to trigger a rendering with the updated draw commands
    // that include the imagery now.
    if (allImageriesReady) {
      model.resetDrawCommands();
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
   * Returns the texture coordinate attributes for the primitive that
   * are used for draping the imagery.
   *
   * This will be available when this object is <code>ready</code>, and
   * will contain one attribute for each unique projection that appears
   * in the imagery layers.
   *
   * @returns {ModelComponents.Attribute[]} The attributes
   */
  imageryTexCoordAttributesPerProjection() {
    const imageryTexCoordAttributesPerProjection =
      this._imageryTexCoordAttributesPerProjection;
    if (!defined(imageryTexCoordAttributesPerProjection)) {
      throw new DeveloperError(
        `The imagery texture coordinate attributes have not been computed yet`,
      );
    }
    return this._imageryTexCoordAttributesPerProjection;
  }

  /**
   * Returns whether the draping computations are "ready".
   *
   * This means that the <code>coveragesPerLayer</code> information
   * has been computed, which describes the set of imagery tiles
   * that are covered by the primitive, <b>and</b> that all the
   * covered imagery tiles are in a state that counts as "ready"
   * (i.e. <code>ImageryState.READY</code>, <code>FAILED</code>,
   * or <code>INVALID</code>).
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
    this._deleteCoveragesPerLayer();
    this._destroyImageryTexCoordAttributes();
    return destroyObject(this);
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
   * This only exists to hide a train wreck
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
