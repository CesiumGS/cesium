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
   * @param {Object<string, string>} names The shader identifiers, by name.
   * @returns {string[]} The lines of the function body.
   * @ignore
   */
  _getShaderLines(names) {
    const {
      triangle,
      frameCoordinates,
      positions,
      restPositions,
      bindMatrix,
      bindMatrixInverse,
    } = names;
    /**
     * @param {string} texture
     * @param {string} width
     * @param {string} index
     */
    const fetch = (texture, width, index) =>
      `texelFetch(${texture}, ivec2(${index} % ${width}, ${index} / ${width}), 0).xyz`;

    return [
      `ivec3 indices = ivec3(${triangle});`,
      `int width = textureSize(${positions}, 0).x;`,
      `vec3 p0 = ${fetch(positions, "width", "indices.x")};`,
      `vec3 e1 = ${fetch(positions, "width", "indices.y")} - p0;`,
      `vec3 e2 = ${fetch(positions, "width", "indices.z")} - p0;`,
      "vec3 normal = cross(e1, e2);",
      // An edit can collapse the triangle, which has no normal.
      "float normalLength = length(normal);",
      "normal = normalLength > 0.0 ? normalize(normal) : vec3(0.0);",
      `vec3 coordinates = ${frameCoordinates};`,

      `int restWidth = textureSize(${restPositions}, 0).x;`,
      `vec3 restP0 = ${fetch(restPositions, "restWidth", "indices.x")};`,
      `vec3 restE1 = ${fetch(restPositions, "restWidth", "indices.y")} - restP0;`,
      `vec3 restE2 = ${fetch(restPositions, "restWidth", "indices.z")} - restP0;`,
      "vec3 restNormal = normalize(cross(restE1, restE2));",

      // The vertex moves as far as the point at its coordinates in the
      // triangle's frame has moved since being bound.
      "vec3 position = p0 + coordinates.x * e1 + coordinates.y * e2 + coordinates.z * normal;",
      "vec3 restPosition = restP0 + coordinates.x * restE1 + coordinates.y * restE2 + coordinates.z * restNormal;",

      // The local transform maps the triangle's frame when bound to its current frame.
      // The inverse of mat3(restE1, restE2, restNormal), whose rows are cross products of its columns.
      "mat3 restFrameInverse = transpose(mat3(cross(restE2, restNormal), cross(restNormal, restE1), cross(restE1, restE2))) / dot(restE1, cross(restE2, restNormal));",
      "jacobian = normalLength > 0.0",
      `    ? mat3(${bindMatrix}) * mat3(e1, e2, normal) * restFrameInverse * mat3(${bindMatrixInverse})`,
      "    : mat3(1.0);",

      `return positionMC + mat3(${bindMatrix}) * (position - restPosition);`,
    ];
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
