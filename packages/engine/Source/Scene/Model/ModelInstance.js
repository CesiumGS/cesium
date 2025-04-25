import BoundingSphere from "../../Core/BoundingSphere";
import Cartesian3 from "../../Core/Cartesian3";
import Matrix3 from "../../Core/Matrix3";
import Matrix4 from "../../Core/Matrix4";
import TranslationRotationScale from "../../Core/TranslationRotationScale";
import Quaternion from "../../Core/Quaternion";

const scratchTranslationRotationScale = new TranslationRotationScale();
const scratchRotation = new Matrix3();

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

  // TODO: Compute the model matrix to apply to the root node, including the model's modelMatrix, the instance's transform, the component transform, and the axis correction matrix
  computeModelMatrix(modelMatrix, rootTransform, result) {
    const instanceTransform = this.transform;
    let transform = Matrix4.multiplyTransformation(
      instanceTransform,
      rootTransform,
      result,
    );
    transform = Matrix4.multiplyTransformation(modelMatrix, transform, result);
    return transform;
  }

  getBoundingSphere(modelRadius, result) {
    const center = this._center;
    const radius = modelRadius;

    if (result) {
      result.center = Cartesian3.clone(center, result.center);
      // TODO: This is not how you get the scale
      result.radius = radius;
      return result;
    }

    // TODO: This is not how you get the scale
    return new BoundingSphere(center, radius);
  }

  /**
   *
   * @param {ModelComponents.Primitive} primitive
   * @param {BoundingSphere} result
   * @returns
   */
  computeNodeBoundingSphere(parentNodeTransform, node, radius, result) {
    let transform = Matrix4.clone(Matrix4.IDENTITY); //ModelUtility.getNodeTransform(node);
    transform = Matrix4.multiply(parentNodeTransform, transform, transform);

    if (!result) {
      result = new BoundingSphere();
    }

    result.center = Cartesian3.clone(Cartesian3.ZERO, result.center);
    result.radius = radius;

    result = BoundingSphere.transform(result, transform, result);

    return result;
  }
}

export default ModelInstance;
