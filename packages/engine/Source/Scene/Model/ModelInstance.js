import BoundingSphere from "../../Core/BoundingSphere";
import Cartesian3 from "../../Core/Cartesian3";
import Matrix3 from "../../Core/Matrix3";
import Matrix4 from "../../Core/Matrix4";
import TranslationRotationScale from "../../Core/TranslationRotationScale";
import Quaternion from "../../Core/Quaternion";

const scratchTranslationRotationScale = new TranslationRotationScale();
const scratchRotation = new Matrix3();
const scratchBoundingSphereTransform = new Matrix4();

class ModelInstance {
  constructor(transform) {
    this._transform = transform;
    this._center = new Cartesian3();
    this._relativeTransform = new Matrix4();

    this._updateTransform(transform);
    this._dirty = false;
  }

  get transform() {
    return this._transform;
  }

  set transform(value) {
    // TODO: Matrix4.equals
    if (this._transform === value) {
      return;
    }

    this._dirty = true;
    this._transform = value;
    this._updateTransform(value);
  }

  get center() {
    return this._center;
  }

  get relativeTransform() {
    return this._relativeTransform;
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
   * const modelInstance = new Cesium.ModelInstance(instanceModelMatrix);
   *
   * // TODO: Model
   *
   * const boundingSphere = modelInstance.getBoundingSphere(model);
   * viewer.camera.flyToBoundingSphere(boundingSphere);
   */
  getBoundingSphere(model, result) {
    const modelMatrix = model.modelMatrix;
    const sceneGraph = model.sceneGraph;
    const instanceBoundingSpheres = [];

    // TODO: runtime nodes should probably have a internal public accessor
    for (const runtimeNode of sceneGraph._runtimeNodes) {
      const runtimePrimitives = runtimeNode.runtimePrimitives;
      for (const runtimePrimitive of runtimePrimitives) {
        const primitiveBoundingSphere = runtimePrimitive.boundingSphere;
        const boundingSphere = this.getPrimitiveBoundingSphere(
          modelMatrix,
          sceneGraph,
          runtimeNode,
          primitiveBoundingSphere,
        );

        instanceBoundingSpheres.push(boundingSphere);
      }
    }

    return BoundingSphere.fromBoundingSpheres(instanceBoundingSpheres, result);
  }

  /**
   * Gets the world space bounding sphere representing this instance of a model primitive.
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
    result,
  ) {
    result = result ?? new BoundingSphere();

    // TODO: Can we precompute this in sceneGraph.updateRuntimeNodeTransforms?
    const rootTransform = Matrix4.multiplyTransformation(
      sceneGraph.rootTransform,
      runtimeNode.computedTransform,
      new Matrix4(),
    );
    const primitiveMatrix = this.computeModelMatrix(
      modelMatrix,
      rootTransform,
      scratchBoundingSphereTransform,
    );
    return BoundingSphere.transform(
      primitiveBoundingSphere,
      primitiveMatrix,
      result,
    );
  }
}

export default ModelInstance;
