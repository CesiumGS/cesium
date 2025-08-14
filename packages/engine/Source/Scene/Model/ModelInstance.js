import BoundingSphere from "../../Core/BoundingSphere.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Check from "../../Core/Check.js";
import Matrix3 from "../../Core/Matrix3.js";
import Matrix4 from "../../Core/Matrix4.js";
import TranslationRotationScale from "../../Core/TranslationRotationScale.js";
import Quaternion from "../../Core/Quaternion.js";
import Transforms from "../../Core/Transforms.js";

const scratchTranslationRotationScale = new TranslationRotationScale();
const scratchRotation = new Matrix3();
const scratchTransform = new Matrix4();
const scratchBoundingSphere = new BoundingSphere();
/**
 * A copy of a {@link Model} mesh, known as an instance, used for rendering multiple copies with GPU instancing. Instancing is useful for efficiently rendering a large number of the same model, such as trees in a forest or vehicles in a parking lot.
 * @see {@link ModelInstanceCollection} for a collection of instances.
 * @see {@link Model#instances} for a collection of instances as applied to a model.
 * @demo {@link https://sandcastle.cesium.com/index.html?src=3DModelInstancing.html|Cesium Sandcastle 3D Model Instancing Demo}
 */
class ModelInstance {
  /**
   * Constructs a {@link ModelInstance}, a copy of a {@link Model} mesh, for efficiently rendering a large number of copies the same model using GPU mesh instancing.
   * The position, orientation, and scale of the instance is determined by the specified {@link Matrix4}.
   * @constructor
   * @param {Matrix4} transform Matrix4 describing the transform of the instance
   * @example
   * const position = Cesium.Cartesian3.fromDegrees(-75.1652, 39.9526);
   *
   * const headingPositionRoll = new Cesium.HeadingPitchRoll();
   * const fixedFrameTransform = Cesium.Transforms.localFrameToFixedFrameGenerator(
   *   "north",
   *   "west",
   * );
   * const instanceModelMatrix = new Cesium.Transforms.headingPitchRollToFixedFrame(
   *   position,
   *   headingPositionRoll,
   *   Cesium.Ellipsoid.WGS84,
   *   fixedFrameTransform,
   * );
   * const modelInstance = new Cesium.ModelInstance(instanceModelMatrix);
   */
  constructor(transform) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("transform", transform);
    //>>includeEnd('debug');

    this._transform = transform;
    this._center = new Cartesian3();
    this._relativeTransform = new Matrix4();
    this._relativeScaledTransform = new Matrix4();
    this._pickId = undefined;

    this._updateTransform(transform);
    this._dirty = false;
  }

  /**
   * The 4x4 transformation matrix that transforms the instance from model to world coordinates.
   * The position, orientation, and scale of the instance is determined by the specified {@link Matrix4}.
   *
   * @type {Matrix4}
   *
   * @default {@link Matrix4.IDENTITY}
   *
   * @example
   * const position = Cesium.Cartesian3.fromDegrees(-75.1652, 39.9526);
   *
   * const headingPositionRoll = new Cesium.HeadingPitchRoll();
   * const fixedFrameTransform = Cesium.Transforms.localFrameToFixedFrameGenerator(
   *   "north",
   *   "west",
   * );
   * const instanceModelMatrix = new Cesium.Transforms.headingPitchRollToFixedFrame(
   *   position,
   *   headingPositionRoll,
   *   Cesium.Ellipsoid.WGS84,
   *   fixedFrameTransform,
   * );
   * modelInstance.transform = instanceModelMatrix;
   */
  get transform() {
    return this._transform;
  }

  set transform(value) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("transform", value);
    //>>includeEnd('debug');

    if (this._transform.equals(value)) {
      return;
    }

    this._dirty = true;
    this._transform = value;
    this._updateTransform(value);
  }

  /**
   * The center of the model instance in world space.
   * @type {Cartesian3}
   * @readonly
   */
  get center() {
    return this._center;
  }

  /**
   * The relative transform of the model instance relative to the instance's center.
   * @type {Matrix4}
   * @readonly
   */
  get relativeTransform() {
    return this._relativeTransform;
  }

  get relativeScaledTransform() {
    return this._relativeScaledTransform;
  }

  /**
   * The Pick Id of the instance.
   * @type {string|undefined}
   * @readonly
   */
  get pickId() {
    return this._pickId;
  }

  _updateTransform(transform) {
    // Get center from the transform
    this._center = Matrix4.getTranslation(transform, this._center);

    // Get relative transform from the center
    const translationRotationScale = scratchTranslationRotationScale;
    translationRotationScale.translation = Cartesian3.ZERO;
    translationRotationScale.scale = Matrix4.getScale(
      transform,
      translationRotationScale.scale,
    );

    const rotation = Matrix4.getRotation(transform, scratchRotation);
    translationRotationScale.rotation = Quaternion.fromRotationMatrix(
      rotation,
      translationRotationScale.rotation,
    );

    this._relativeTransform = Matrix4.fromTranslationRotationScale(
      translationRotationScale,
    );
  }

  /**
   * Compute the matrix to transform the instance from the root model
   * node to world space, taking into accont a top-level modelMatrix
   * applied to each instance in the collection, and the axis correction
   * from glTF's up-axis to Cesium's worldspace up-axis.
   * @param {Matrix4} modelMatrix The model's modelMatrix property
   * @param {Matrix4} rootTransform The root node transform to model-space
   * @param {Matrix4} [result] If provided, the instance in which to store the result.
   * @returns {Matrix4} The computed matrix
   * @private
   */
  computeModelMatrix(modelMatrix, rootTransform, result) {
    result = result ?? new Matrix4();

    const instanceTransform = this.transform;
    let transform = Matrix4.multiplyTransformation(
      instanceTransform,
      rootTransform,
      result,
    );
    transform = Matrix4.multiplyTransformation(modelMatrix, transform, result);
    return transform;
  }

  /**
   * Get a bounding sphere that encapsulates a model instance.
   * @param {Model} model The model being instanced.
   * @param {BoundingSphere} [result] If provided, the instance in which to store the result.
   * @returns {BoundingSphere} The model instance bounding sphere.
   * @example
   * // Fly to a specific model instance
   * const model = await Cesium.Model.fromGltfAsync({
   *   url: "../../SampleData/models/GroundVehicle/GroundVehicle.glb",
   *   minimumPixelSize: 64,
   * });
   * viewer.scene.primitives.add(model);
   *
   * const modelInstance = model.instances.add(instanceModelMatrix);
   *
   * const boundingSphere = modelInstance.getBoundingSphere(model);
   * viewer.camera.flyToBoundingSphere(boundingSphere);
   */
  getBoundingSphere(model, result) {
    const modelMatrix = model.modelMatrix;
    const sceneGraph = model.sceneGraph;
    const instanceBoundingSpheres = [];

    for (const runtimeNode of sceneGraph._runtimeNodes) {
      const runtimePrimitives = runtimeNode.runtimePrimitives;
      for (const runtimePrimitive of runtimePrimitives) {
        const primitiveBoundingSphere = runtimePrimitive.boundingSphere;
        const boundingSphere = this.getPrimitiveBoundingSphere(
          modelMatrix,
          sceneGraph,
          runtimeNode,
          primitiveBoundingSphere,
          false,
          undefined,
        );
        instanceBoundingSpheres.push(boundingSphere);
      }
    }

    return BoundingSphere.fromBoundingSpheres(instanceBoundingSpheres, result);
  }

  /**
   * Scale the relativeTransform for a model instance based on screen parameters.
   * @param {Model} model The model being instanced.
   * @param {frameState} frameState The frame state
   * @param {Matrix4} [result] If provided, the Matrix4 in which to store the result.
   * @returns {Matrix4} The scaled relative instance transform.
   * @private
   */
  getRelativeScaledTransform(model, frameState, useModelMatrix2D, result) {
    let relativeTransform = this._relativeTransform;
    if (useModelMatrix2D) {
      const transform2D = Transforms.basisTo2D(
        frameState.mapProjection,
        this.transform,
        scratchTransform,
      );
      const translationRotationScale = scratchTranslationRotationScale;
      translationRotationScale.translation = Cartesian3.ZERO;
      translationRotationScale.scale = Matrix4.getScale(
        transform2D,
        translationRotationScale.scale,
      );

      const rotation = Matrix4.getRotation(transform2D, scratchRotation);
      translationRotationScale.rotation = Quaternion.fromRotationMatrix(
        rotation,
        translationRotationScale.rotation,
      );
      relativeTransform = Matrix4.fromTranslationRotationScale(
        translationRotationScale,
      );
    }
    if (!model.ready || !(model.minimumPixelSize > 0)) {
      return relativeTransform;
    }
    let scale = model.scale;
    const radius = model.sceneGraph.rootBoundingSphere.radius;

    const boundingSphere = this.getBoundingSphere(model, scratchBoundingSphere);
    const scaleInPixels = frameState.camera.getPixelSize(
      boundingSphere,
      frameState.context.drawingBufferWidth,
      frameState.context.drawingBufferHeight,
    ); //meters per pixel

    // metersPerPixel is always > 0.0
    const pixelsPerMeter = 1.0 / scaleInPixels;
    const diameter = 2.0 * radius;
    const diameterInPixels = pixelsPerMeter * diameter;

    // Maintain model's minimum pixel size
    if (diameterInPixels < model.minimumPixelSize) {
      scale = (model.minimumPixelSize * scaleInPixels) / diameter;
    }

    return Matrix4.multiplyByUniformScale(relativeTransform, scale, result);
  }

  /**
   * Gets the world space bounding sphere representing this instance of a model primitive.
   *
   * rootTransform = glTF * AxisCorrection * nodeTransform
   *
   * primitiveMatrix = modelMatrix * rootTransform
   *
   * @param {Matrix4} modelMatrix
   * @param {ModelSceneGraph} sceneGraph
   * @param {ModelRuntimeNode} runtimeNode
   * @param {BoundingSphere} primitiveBoundingSphere
   * @param {BoundingSphere} [result] If provided, the instance in which to store the result.
   * @returns {BoundingSphere} The transformed bounding sphere
   * @private
   */
  getPrimitiveBoundingSphere(
    modelMatrix,
    sceneGraph,
    runtimeNode,
    primitiveBoundingSphere,
    useInstanceTransform2D,
    mapProjection,
    result,
  ) {
    result = result ?? new BoundingSphere();

    // TODO: Can we precompute this in sceneGraph.updateRuntimeNodeTransforms?
    const rootTransform = Matrix4.multiplyTransformation(
      sceneGraph.rootTransform,
      runtimeNode.computedTransform,
      new Matrix4(),
    );

    let instanceTransform;
    if (useInstanceTransform2D) {
      instanceTransform = Transforms.basisTo2D(
        mapProjection,
        this.transform,
        scratchTransform,
      );

      // ToDo: check if needed
      // instanceTransform = Matrix4.multiplyTransformation(
      //   instanceTransform,
      //   sceneGraph._axisCorrectionMatrix,
      //   scratchTransform,
      // );
    } else {
      instanceTransform = Matrix4.multiplyTransformation(
        this.transform,
        rootTransform,
        scratchTransform,
      );
    }

    const primitiveMatrix = Matrix4.multiplyTransformation(
      modelMatrix,
      instanceTransform,
      scratchTransform,
    );

    return BoundingSphere.transform(
      primitiveBoundingSphere,
      primitiveMatrix,
      result,
    );
  }

  getCenter2D(mapProjection, result) {
    result = result ?? new Cartesian3();
    const instanceTransform = Transforms.basisTo2D(
      mapProjection,
      this.transform,
      scratchTransform,
    );
    return Matrix4.getTranslation(instanceTransform, result);
  }
}

export default ModelInstance;
