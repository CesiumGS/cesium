import {
  AxisAlignedBoundingBox,
  BoundingSphere,
  Cartesian3,
  defined,
} from "@cesium/core";
import ModelUtility from "./ModelUtility.js";

/**
 * Updates the draw commands'bounding volumes for a deformed primitive when
 * its {@link DeformerBinding}s report their bounding boxes changed.
 *
 * @namespace ModelDeformerUpdateStage
 *
 * @private
 */
const ModelDeformerUpdateStage = {
  name: "ModelDeformerUpdateStage",
};

const scratchBox = new AxisAlignedBoundingBox();
const scratchMinimum = new Cartesian3();
const scratchMaximum = new Cartesian3();
const scratchRestScaled = new Cartesian3();

/**
 * Recomputes the primitive's bounding sphere, if it's dirty, from the rest
 * bounds and each binding's bounding box. Each of the n bindings deforms the
 * rest position, and their offsets from it add up, so a deformed position is
 * Σf − (n − 1) · rest. With rest bounds R and binding boxes B, it lies in
 * [ΣBmin − (n − 1)Rmax, ΣBmax − (n − 1)Rmin].
 *
 * @param {ModelRuntimePrimitive} runtimePrimitive The runtime primitive.
 * @param {ModelSceneGraph} sceneGraph The scene graph.
 *
 * @private
 */
ModelDeformerUpdateStage.update = function (runtimePrimitive, sceneGraph) {
  if (!runtimePrimitive.deformedBoundsDirty) {
    return;
  }
  runtimePrimitive.deformedBoundsDirty = false;

  const minimum = Cartesian3.clone(Cartesian3.ZERO, scratchMinimum);
  const maximum = Cartesian3.clone(Cartesian3.ZERO, scratchMaximum);
  for (const binding of runtimePrimitive.deformerBindings) {
    const box = binding.computeDeformedBoundingBox(scratchBox);
    // Without a box, the rest bounds are the best estimate.
    if (!defined(box)) {
      return;
    }
    Cartesian3.add(minimum, box.minimum, minimum);
    Cartesian3.add(maximum, box.maximum, maximum);
  }

  const rest = ModelUtility.getPositionMinMax(runtimePrimitive.primitive);
  const n = runtimePrimitive.deformerBindings.size;
  Cartesian3.subtract(
    minimum,
    Cartesian3.multiplyByScalar(rest.max, n - 1, scratchRestScaled),
    minimum,
  );
  Cartesian3.subtract(
    maximum,
    Cartesian3.multiplyByScalar(rest.min, n - 1, scratchRestScaled),
    maximum,
  );

  // Instancing moves the deformed positions, so include the instances'
  // translations, as the rest bounds do.
  const runtimeNode = sceneGraph._runtimeNodes[runtimePrimitive.node.index];
  if (defined(runtimeNode?.instancingTranslationMin)) {
    Cartesian3.add(minimum, runtimeNode.instancingTranslationMin, minimum);
    Cartesian3.add(maximum, runtimeNode.instancingTranslationMax, maximum);
  }

  runtimePrimitive.boundingSphere = BoundingSphere.fromCornerPoints(
    minimum,
    maximum,
    runtimePrimitive.boundingSphere,
  );
  runtimePrimitive.drawCommand?.updateBoundingVolume();
  sceneGraph.expandBoundingSphere(runtimePrimitive.boundingSphere, runtimeNode);
};

export default ModelDeformerUpdateStage;
