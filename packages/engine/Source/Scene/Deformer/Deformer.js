// @ts-check

import { defined, destroyObject } from "@cesium/engine";
import DeveloperError from "../../Core/DeveloperError";
import PixelFormat from "../../Core/PixelFormat.js";
import ContextLimits from "../../Renderer/ContextLimits.js";
import DynamicTexture from "../../Renderer/DynamicTexture.js";
import PixelDatatype from "../../Renderer/PixelDatatype.js";
import Editable from "../Editable";
import GeometryAccessor, { GeometryAccessSession } from "../GeometryAccessor";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import Matrix4 from "../../Core/Matrix4";
import Event from "../../Core/Event";

/** @import Scene from "../Scene"; */
/** @import DeformerBinding from "./DeformerBinding"; */
/** @import Deformable from "./Deformable"; */
/** @import { GeometryAccessScopes, GeometryAttributeDescriptor, GeometryAttributeReader, GeometryAttributeWriter } from "../GeometryAccessor" */

/**
 * Abstract base class for deformers - objects that can deform the vertices of a {@link Deformable}, either
 * ephemerally (in a vertex shader), or permanently (by baking the deformer into the deformable's vertex positions).
 *
 * Note: ideally, a Deformer would _accept_ an Editable rather than _being_ an Editable itself. In that way, it could use any preexisting editable geometry
 * as the deformer basis, which is very flexible. However, because the deformer needs GPU views of (writable) control point vertices and indices,
 * it's easier for it to own its own geometry (and avoid concerns about duplicating and syncing data). (Part of the issue here is WebGL's lack of support for texture buffer objects,
 * which would facilitate shareable texture-views of vertex buffers).
 */
class Deformer {
  [Editable.symbol] = true;

  /**
   * @param {Scene} scene The scene the deformer belongs to.
   * @param {Float64Array} controlPoints A flat (x, y, z) array of control point positions.
   * @param {Uint32Array} faces A flat array of indices where each group of <code>verticesPerFace</code> indices defines a face of the deformer geometry.
   *                            Faces will be triangulated for binding using simple fan triangulation, so they should be convex and planar.
   * @param {number} verticesPerFace The number of vertices per face.
   */
  constructor(scene, controlPoints, faces, verticesPerFace) {
    //>>includeStart('debug', pragmas.debug);
    if (controlPoints.length % 3 !== 0) {
      throw new DeveloperError("controlPoints length must be a multiple of 3.");
    }
    if (verticesPerFace < 3) {
      throw new DeveloperError("verticesPerFace must be >= 3.");
    }
    if (faces.length % verticesPerFace !== 0) {
      throw new DeveloperError(
        "faces length must be a multiple of verticesPerFace.",
      );
    }
    //>>includeEnd('debug');

    // If RAM memory ever becomes a concern, we could free this data and keep it only on the GPU (reading back when needed).
    // Since readback cost is high, it's probably favorable to keep it in RAM to start.
    this._controlPoints = controlPoints;
    this._verticesPerFace = verticesPerFace;
    this._vertexIndices = buildVertexIndices(faces, verticesPerFace);

    this._controlPointsTexture = buildControlPointsTexture(controlPoints);
    this._vertexIndicesTexture = buildVertexIndicesTexture(this._vertexIndices);

    /** @type {Map<Deformable, DeformerBinding>} */
    this._bindings = new Map();
    /** @type {Set<DeformerBinding>} */
    this._pendingBindingInitializations = new Set();

    // For the editable interface
    /** @type {GeometryAccessor} */
    this._geometryAccessor = new GeometryAccessor(
      DeformerGeometryAccessSession,
      this,
    );
    /** @type {Matrix4} */
    this._modelMatrix = Matrix4.IDENTITY.clone();
    /** @type {Event<function(Matrix4): void>} */
    this._modelMatrixChanged = new Event();

    /**
     * Request a GPU update on the next preRender to update gpu resources.
     * @type {function(): void|undefined}
     */
    this._requestGpuUpdate = () => {
      this._removeGpuUpdateListener = scene._preRender.addEventListener(
        this.#updateGpuResources,
        this,
      );
    };

    /**
     * Request a binding initialization on the next preRender to initialize GPU resources for a new binding.
     * @param {DeformerBinding} binding
     * @returns
     */
    this._requestBindingInitialization = (binding) => {
      this._pendingBindingInitializations.add(binding);
      if (defined(this._removeBindingInitializationListener)) {
        return;
      }
      this._removeBindingInitializationListener =
        scene._preRender.addEventListener(this.#initializeBindings, this);
    };

    this._requestGpuUpdate();
  }

  get geometryAccessor() {
    return this._geometryAccessor;
  }

  get modelMatrix() {
    return this._modelMatrix;
  }

  set modelMatrix(value) {
    //>>includeStart('debug', pragmas.debug);
    if (!defined(value)) {
      throw new DeveloperError("value is required.");
    }
    //>>includeEnd('debug');

    Matrix4.clone(value, this._modelMatrix);
    /** @type {any} */ (this._modelMatrixChanged).raiseEvent(this.modelMatrix);
  }

  get modelMatrixChanged() {
    return this._modelMatrixChanged;
  }

  /**
   * Update gpu objects each frame (requires scene context)
   * @param {Scene} scene
   */
  #updateGpuResources(scene) {
    const context = scene._context;
    this._controlPointsTexture.update(context);
    this._vertexIndicesTexture.update(context);

    // Deregister listener so it doesn't run every frame, only when requested.
    this._removeGpuUpdateListener();
  }

  /**
   * Initialize GPU resources for new bindings.
   * @param {Scene} scene
   */
  #initializeBindings(scene) {
    const context = scene._context;
    for (const binding of this._pendingBindingInitializations) {
      binding.initialize(context);
    }
    this._pendingBindingInitializations.clear();

    this._removeBindingInitializationListener();
    this._removeBindingInitializationListener = undefined;
  }

  /**
   * Binds the deformer to the deformable, allowing the deformer to modify the deformable's vertices.
   * @param {Deformable} deformable
   */
  bind(deformable) {
    deformable.registerDeformer(this);
    const binding = this._computeBinding(deformable);
    this._bindings.set(deformable, binding);
    this._requestBindingInitialization(binding);
  }

  /**
   * Unbinds the deformer from the deformable, restoring the deformable's vertices to their rest positions.
   * @param {Deformable} deformable
   */
  unbind(deformable) {
    deformable.deregisterDeformer(this);
    this._bindings.delete(deformable);
  }

  /**
   * Bakes the current control point positions of the deformer into the rest positions of the deformable.
   * After baking, the deformer will be unbound from the deformable.
   * @param {Deformable} deformable
   */
  bake(deformable) {
    DeveloperError.throwInstantiationError();
  }

  /**
   * Subclasses implement this to create a subclass of DeformerBinding object appropriate to the deformer type
   * and compute the binding information needed for deformation.
   * @param {Deformable} deformable
   * @returns {DeformerBinding}
   * @protected
   */
  _computeBinding(deformable) {
    DeveloperError.throwInstantiationError();
  }

  destroy() {
    this._controlPointsTexture.destroy();
    this._vertexIndicesTexture.destroy();
    if (defined(this._removeGpuUpdateListener)) {
      this._removeGpuUpdateListener();
    }
    if (defined(this._removeBindingInitializationListener)) {
      this._removeBindingInitializationListener();
    }
    return destroyObject(this);
  }
}

class DeformerGeometryAccessSession extends GeometryAccessSession {
  /**
   * @param {GeometryAccessor} accessor The parent accessor.
   * @param {GeometryAccessScopes} scopes The requested access scopes.
   * @param {Deformer} deformer The deformer whose geometry is being accessed.
   */
  constructor(accessor, scopes, deformer) {
    super(accessor, scopes);
    this._deformer = deformer;
  }

  /**
   * A deformer's only vertex attribute is the position of its control points.
   * @returns {GeometryAttributeDescriptor[]}
   */
  static getAvailableAttributes() {
    return [
      { semantic: /** @type {any} */ (VertexAttributeSemantic).POSITION },
    ];
  }

  destroy() {
    // Nothing to release: control points and faces are owned by the deformer
    // and remain valid after the session ends.
    destroyObject(this);
  }

  vertexCount() {
    return this._deformer._controlPoints.length / 3;
  }

  primitiveVertexCount() {
    return this._deformer._verticesPerFace;
  }

  primitiveCount() {
    const trianglesPerFace = this._deformer._verticesPerFace - 2;
    return this._deformer._vertexIndices.length / 3 / trianglesPerFace;
  }

  /**
   * Reconstructs the face at <code>primitiveIndex</code> from the stored
   * fan-triangulated indices. With fan triangulation, a face of N vertices
   * (v0..v(N-1)) is encoded as N-2 triangles: (v0,v1,v2), (v0,v2,v3), ...,
   * so the face can be read off as v0, v1, then the third vertex of each
   * successive triangle.
   *
   * @param {number} primitiveIndex
   * @param {number[]} results
   * @returns {number[]}
   */
  getPrimitive(primitiveIndex, results) {
    const vertexIndices = this._deformer._vertexIndices;
    const verticesPerFace = this._deformer._verticesPerFace;
    const trianglesPerFace = verticesPerFace - 2;
    const firstTriangleBase = primitiveIndex * trianglesPerFace * 3;
    results[0] = vertexIndices[firstTriangleBase];
    results[1] = vertexIndices[firstTriangleBase + 1];
    for (let i = 0; i < trianglesPerFace; ++i) {
      results[i + 2] = vertexIndices[firstTriangleBase + i * 3 + 2];
    }
    return results;
  }

  /**
   * @param {GeometryAttributeDescriptor} descriptor
   * @returns {GeometryAttributeReader}
   * @protected
   */
  _createVertexAttributeReader(descriptor) {
    const controlPoints = this._deformer._controlPoints;
    return function (vertexIndex, results) {
      const base = vertexIndex * 3;
      results[0] = controlPoints[base];
      results[1] = controlPoints[base + 1];
      results[2] = controlPoints[base + 2];
      return results;
    };
  }

  /**
   * @param {GeometryAttributeDescriptor} descriptor
   * @returns {GeometryAttributeWriter}
   * @protected
   */
  _createVertexAttributeWriter(descriptor) {
    const controlPoints = this._deformer._controlPoints;
    const controlPointsTexture = this._deformer._controlPointsTexture;
    // The texture is RGBA32F with the alpha channel unused; the same scratch
    // texel is reused across writes since the texture's set() copies values
    // out into its own backing store.
    const scratchTexel = new Float32Array(4);
    return function (vertexIndex, components) {
      const base = vertexIndex * 3;
      const x = components[0];
      const y = components[1];
      const z = components[2];
      controlPoints[base] = x;
      controlPoints[base + 1] = y;
      controlPoints[base + 2] = z;
      scratchTexel[0] = x;
      scratchTexel[1] = y;
      scratchTexel[2] = z;
      controlPointsTexture.set(vertexIndex, scratchTexel);
    };
  }

  commit() {
    // Update the DynamicTextures containing control points / vertex indices.
    this._deformer._requestGpuUpdate();
  }
}

/**
 * Fan-triangulate the given faces. Returns undefined if no faces are provided,
 * indicating the deformer is point-cloud-only.
 *
 * @param {Uint32Array} [faces]
 * @param {number} [verticesPerFace]
 * @returns {Uint32Array | undefined}
 * @private
 */
function buildVertexIndices(faces, verticesPerFace) {
  if (!defined(faces)) {
    return undefined;
  }

  if (verticesPerFace === 3) {
    return faces;
  }

  const faceCount = faces.length / verticesPerFace;
  const trianglesPerFace = verticesPerFace - 2;
  const out = new Uint32Array(faceCount * trianglesPerFace * 3);
  for (let f = 0; f < faceCount; f++) {
    fanTriangulateFace(
      faces,
      f * verticesPerFace,
      verticesPerFace,
      out,
      f * trianglesPerFace * 3,
    );
  }
  return out;
}

/**
 * Fan-triangulate a single face. Produces (verticesPerFace - 2) triangles using
 * the face's first vertex as the fan pivot: (v0, v1, v2), (v0, v2, v3), ...
 *
 * @param {Uint32Array} faces Source face index array.
 * @param {number} faceOffset Start index of the face within <code>faces</code>.
 * @param {number} verticesPerFace
 * @param {Uint32Array} out Destination triangle index array.
 * @param {number} outOffset Start index in <code>out</code> at which to write.
 * @private
 */
function fanTriangulateFace(
  faces,
  faceOffset,
  verticesPerFace,
  out,
  outOffset,
) {
  const v0 = faces[faceOffset];
  const trianglesPerFace = verticesPerFace - 2;
  for (let t = 0; t < trianglesPerFace; t++) {
    const dst = outOffset + t * 3;
    out[dst] = v0;
    out[dst + 1] = faces[faceOffset + t + 1];
    out[dst + 2] = faces[faceOffset + t + 2];
  }
}

/**
 * Build the GPU mirror texture of the control point positions (f64 -> f32 packed RGBA32F,
 * with the alpha channel left unused).
 *
 * @param {Float64Array} controlPoints
 * @returns {DynamicTexture}
 * @private
 */
function buildControlPointsTexture(controlPoints) {
  const controlPointCount = controlPoints.length / 3;
  const { width, height } = chooseTextureSize(controlPointCount);
  const texels = new Float32Array(width * height * 4);
  for (let i = 0; i < controlPointCount; i++) {
    texels[i * 4] = controlPoints[i * 3];
    texels[i * 4 + 1] = controlPoints[i * 3 + 1];
    texels[i * 4 + 2] = controlPoints[i * 3 + 2];
  }
  return new DynamicTexture({
    texels,
    width,
    height,
    componentsPerTexel: 4,
    pixelFormat: /** @type {any} */ (PixelFormat).RGBA,
    pixelDatatype: /** @type {any} */ (PixelDatatype).FLOAT,
    flipY: false,
  });
}

/**
 * Build the GPU mirror texture of the triangle indices (RGBA32UI, with the alpha channel
 * left unused).
 *
 * @param {Uint32Array} vertexIndices
 * @returns {DynamicTexture}
 * @private
 */
function buildVertexIndicesTexture(vertexIndices) {
  const triangleCount = vertexIndices.length / 3;
  const { width, height } = chooseTextureSize(triangleCount);
  const texels = new Uint32Array(width * height * 4);
  for (let i = 0; i < triangleCount; i++) {
    texels[i * 4] = vertexIndices[i * 3];
    texels[i * 4 + 1] = vertexIndices[i * 3 + 1];
    texels[i * 4 + 2] = vertexIndices[i * 3 + 2];
  }
  return new DynamicTexture({
    texels,
    width,
    height,
    componentsPerTexel: 4,
    pixelFormat: /** @type {any} */ (PixelFormat).RGBA_INTEGER,
    pixelDatatype: /** @type {any} */ (PixelDatatype).UNSIGNED_INT,
    flipY: false,
  });
}

/**
 * Compute a 2D texture size that can hold at least <code>elementCount</code> texels,
 * laid out row-major. Width is capped at the context's max texture size.
 *
 * @param {number} elementCount
 * @returns {{width: number, height: number}}
 * @private
 */
function chooseTextureSize(elementCount) {
  if (elementCount <= 0) {
    return { width: 1, height: 1 };
  }
  const maxWidth = /** @type {any} */ (ContextLimits).maximumTextureSize;
  const width = Math.min(elementCount, maxWidth);
  const height = Math.max(1, Math.ceil(elementCount / maxWidth));
  return { width, height };
}

export default Deformer;
