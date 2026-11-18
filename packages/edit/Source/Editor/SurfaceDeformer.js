// @ts-check

import { Check, Matrix4 } from "@cesium/core";
import {
  Buffer,
  BufferUsage,
  GeometryAttributeDescriptor,
  VertexAttributeSemantic,
} from "@cesium/engine";
import Deformer from "./Deformer.js";
import SurfaceDeformerBinding from "./SurfaceDeformerBinding.js";
import readVertexValues from "./readVertexValues.js";

/** @import { Deformable, FrameState, GeometryReadSession } from "@cesium/engine"; */
/** @import Mesh from "./Mesh.js"; */

const POSITION = new GeometryAttributeDescriptor({
  semantic: VertexAttributeSemantic.POSITION,
});

// i0, i1, i2, a, b, c per deformable vertex.
const FLOATS_PER_VERTEX = 6;

const scratchDeformableToDeformer = new Matrix4();

/**
 * <div class="notice">
 * Use {@link SurfaceDeformer.fromMesh} to create a deformer. Do not call the
 * constructor directly.
 * </div>
 *
 * A {@link Deformer} whose deformables' vertices follow their closest
 * triangles of the mesh.
 *
 * @alias SurfaceDeformer
 * @internalConstructor
 * @extends Deformer
 *
 * @experimental This feature is not final and is subject to change without Cesium's standard deprecation policy.
 *
 * @example
 * const cage = editor.addMesh(cageSource);
 * const deformer = Cesium.SurfaceDeformer.fromMesh(cage);
 * for (const node of model.nodes) {
 *   node.primitives.forEach((primitive) => deformer.bind(primitive));
 * }
 */
class SurfaceDeformer extends Deformer {
  /**
   * Creates a deformer that deforms with a mesh.
   *
   * @param {Mesh} mesh The mesh that deforms.
   * @returns {SurfaceDeformer} The new deformer.
   */
  static fromMesh(mesh) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("mesh", mesh);
    //>>includeEnd('debug');

    return new SurfaceDeformer(mesh);
  }

  /**
   * @param {FrameState} frameState The frame state.
   * @param {Deformable} deformable The deformable to bind.
   * @returns {SurfaceDeformerBinding} The binding.
   * @ignore
   */
  _createBinding(frameState, deformable) {
    const { mesh } = this;
    const positions = deformable.geometryReader.withReadSession(
      { attributes: [POSITION] },
      /** @param {GeometryReadSession} session */
      (session) => readVertexValues(session, POSITION, Float32Array),
    );

    const deformableToDeformer = Matrix4.multiply(
      Matrix4.inverse(mesh.source.worldMatrix, scratchDeformableToDeformer),
      deformable.worldMatrix,
      scratchDeformableToDeformer,
    );

    const bindingData = new Float32Array(
      (positions.length / 3) * FLOATS_PER_VERTEX,
    );

    mesh._wasmEditor.bindSurfaceDeformer(
      mesh._key,
      positions,
      new Float64Array(Matrix4.toArray(deformableToDeformer)),
      bindingData,
    );

    const vertexBuffer = Buffer.createVertexBuffer({
      context: frameState.context,
      typedArray: bindingData,
      usage: BufferUsage.STATIC_DRAW,
    });

    // The binding owns the buffer, so the deformable's vertex arrays mustn't destroy it.
    vertexBuffer.vertexArrayDestroyable = false;

    return new SurfaceDeformerBinding({
      vertexBuffer,
      positionTexture: mesh._renderer.positionTexture,
      bindMatrix: Matrix4.inverse(deformableToDeformer, new Matrix4()),
    });
  }
}

export default SurfaceDeformer;
