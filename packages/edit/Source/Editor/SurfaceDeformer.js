// @ts-check

import { Check, Matrix4 } from "@cesium/core";
import {
  Buffer,
  BufferUsage,
  Deformer,
  GeometryAttributeDescriptor,
  VertexAttributeSemantic,
} from "@cesium/engine";
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
 * triangles of a {@link Mesh}, as the mesh is edited. Editing the mesh's
 * topology unbinds every deformable until {@link Deformer#rebind} is called.
 * The deformer is destroyed with its mesh.
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
  /** @type {Mesh} */
  #mesh;

  /** @type {Array<function(): void>} */
  #removeMeshListeners;

  /**
   * @param {Mesh} mesh The mesh that deforms.
   */
  constructor(mesh) {
    //>>includeStart('debug', pragmas.debug);
    Check.typeOf.object("mesh", mesh);
    //>>includeEnd('debug');

    super();
    this.#mesh = mesh;
    const setBounds = () => this._setBounds(mesh._renderer.localBounds);
    setBounds();
    this.#removeMeshListeners = [
      mesh._topologyChanged.addEventListener(this._invalidateBindings, this),
      mesh._geometryChanged.addEventListener(setBounds),
      mesh._afterUpdate.addEventListener(this._update, this),
      mesh._destroyed.addEventListener(this.destroy, this),
    ];
  }

  /**
   * The mesh that deforms.
   *
   * @type {Mesh}
   * @readonly
   */
  get mesh() {
    return this.#mesh;
  }

  /**
   * Unbinds every deformable and destroys the deformer. It can't be used
   * afterwards.
   *
   * @returns {void}
   */
  destroy() {
    for (const removeListener of this.#removeMeshListeners) {
      removeListener();
    }
    return super.destroy();
  }

  /**
   * Creates a deformer that deforms with a mesh.
   *
   * @param {Mesh} mesh The mesh that deforms.
   * @returns {SurfaceDeformer} The new deformer.
   */
  static fromMesh(mesh) {
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

    const boundsCoefficients = mesh._wasmEditor.bindSurfaceDeformer(
      mesh._key,
      positions,
      new Float64Array(Matrix4.toArray(deformableToDeformer)),
      bindingData,
    );

    const { context } = frameState;
    const vertexBuffer = Buffer.createVertexBuffer({
      context,
      typedArray: bindingData,
      usage: BufferUsage.STATIC_DRAW,
    });

    // The binding owns the buffer, so the deformable's vertex arrays mustn't destroy it.
    vertexBuffer.vertexArrayDestroyable = false;

    const positionTexture = mesh._renderer.positionTexture;
    return new SurfaceDeformerBinding({
      deformer: this,
      vertexBuffer,
      positionTexture,
      restPositionTexture: positionTexture.copy(context),
      bindMatrix: Matrix4.inverse(deformableToDeformer, new Matrix4()),
      boundsCoefficients,
    });
  }
}

export default SurfaceDeformer;
