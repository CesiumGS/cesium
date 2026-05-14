import defined from "../../Core/defined.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import Deformer from "./Deformer.js";
import DeformerBinding from "./DeformerBinding.js";
import Buffer from "../../Renderer/Buffer.js";

/** @import Context from "../../Renderer/Context.js"; */

/**
 * A type of deformer that binds a deformable object to a surface, such that the deformable's vertices attempt to
 * maintain a constant offset from the closest point on the surface as the surface deforms.
 */
class SurfaceDeformer extends Deformer {
  /**
   * Computes the binding information: for a SurfaceDeformer, that's the closest point on the surface and the offset from that point for each vertex of the deformable.
   * @param {Deformable} deformable
   */
  _computeBinding(deformable) {
    return new SurfaceDeformerBinding(new Float32Array(0));
  }
}

/**
 * An simple container object for the data a {@link SurfaceDeformer} needs to store per-deformable.
 */
class SurfaceDeformerBinding extends DeformerBinding {
  /**
   * @param {Float32Array} bindingVertexData Packed per-vertex bind data.
   *   Each vertex contributes 6 floats: (offsetX, offsetY, offsetZ, baryU,
   *   baryV, triangleIndex). The shader reconstructs baryW = 1 - baryU - baryV
   *   and casts triangleIndex back to int.
   */
  constructor(bindingVertexData) {
    super();
    this._bindingVertexData = bindingVertexData;
    /** @type {Buffer | undefined} */
    this._bindingVertexBuffer = undefined;
  }

  /**
   * Lazily create the vertex buffer for the binding when context is available (during prerender).
   * @param {Context} context
   */
  initialize(context) {
    this._bindingVertexBuffer = Buffer.createVertexBuffer({
      context: context,
      typedArray: this._bindingVertexData,
      usage: BufferUsage.STATIC_DRAW,
    });

    // Free the original vertex data since it's now on the GPU.
    this._bindingVertexData = undefined;
  }

  destroy() {
    if (defined(this._bindingVertexBuffer)) {
      this._bindingVertexBuffer.destroy();
    }
    super.destroy();
  }
}

export default SurfaceDeformer;
