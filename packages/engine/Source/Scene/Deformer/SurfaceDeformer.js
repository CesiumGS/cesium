// @ts-check

import defined from "../../Core/defined.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import Matrix4 from "../../Core/Matrix4.js";
import Ray from "../../Core/Ray.js";
import IntersectionTests from "../../Core/IntersectionTests.js";
import barycentricCoordinates from "../../Core/barycentricCoordinates.js";
import BufferUsage from "../../Renderer/BufferUsage.js";
import Buffer from "../../Renderer/Buffer.js";
import VertexAttributeSemantic from "../VertexAttributeSemantic.js";
import Deformer from "./Deformer.js";
import DeformerBinding from "./DeformerBinding.js";

/** @import Context from "../../Renderer/Context.js"; */
/** @import Deformable from "./Deformable.js"; */

// Packed per-vertex binding layout:
//   [0..2] offset (x, y, z) from the closest point on the surface to the vertex,
//          expressed in the deformer's local frame
//   [3..4] barycentric coords (v, w) of the closest point within its triangle;
//          shader recovers u = 1 - v - w
//   [5]    triangle index (cast back to int on the GPU)
const FLOATS_PER_BINDING_VERTEX = 6;

/**
 * A type of deformer that binds a deformable object to a surface, such that the deformable's vertices attempt to
 * maintain a constant offset from the closest point on the surface as the surface deforms.
 */
class SurfaceDeformer extends Deformer {
  /**
   * For each vertex of the deformable, finds the closest point on this
   * deformer's surface and records (offset, barycentric coords, triangleIndex)
   * so the GPU can reconstruct the vertex from the deforming control points.
   *
   * @param {Deformable} deformable
   * @returns {SurfaceDeformerBinding}
   * @protected
   */
  _computeBinding(deformable) {
    const triangleCount = this._vertexIndices.length / 3;
    const toDeformerSpace = computeDeformableToDeformerTransform(
      deformable,
      this,
    );

    const bindingData = withDeformableVertices(
      deformable,
      (vertexCount, readVertex) => {
        const out = new Float32Array(vertexCount * FLOATS_PER_BINDING_VERTEX);
        for (let i = 0; i < vertexCount; ++i) {
          readVertex(i, scratchVertexLocal);
          Matrix4.multiplyByPoint(
            toDeformerSpace,
            scratchVertexLocal,
            scratchVertex,
          );
          bindVertexToClosestTriangle(
            this,
            scratchVertex,
            triangleCount,
            scratchClosest,
          );
          writeBindingVertex(out, i, scratchVertex, scratchClosest);
        }
        return out;
      },
    );

    return new SurfaceDeformerBinding(bindingData);
  }
}

/**
 * Opens a single read session on the deformable, invokes the callback with the
 * vertex count and a per-vertex reader, and disposes the session before
 * returning. Keeps session lifetime tightly scoped since opening a session is
 * potentially expensive.
 *
 * @template T
 * @param {Deformable} deformable
 * @param {function(number, function(number, Cartesian3): void): T} callback
 * @returns {T}
 */
function withDeformableVertices(deformable, callback) {
  const scopes = {
    read: {
      attributes: new Set([
        { semantic: /** @type {any} */ (VertexAttributeSemantic).POSITION },
      ]),
      topology: true,
    },
  };

  let result;
  deformable.geometryAccessor.withSession(
    scopes,
    /** @param {any} session */ (session) => {
      const positions = session.vertexAttributeAccessors({
        semantic: /** @type {any} */ (VertexAttributeSemantic).POSITION,
      });
      const vertexCount = session.vertexCount();
      const scratch = [0, 0, 0];
      /**
       * @param {number} i
       * @param {Cartesian3} out
       */
      const readVertex = (i, out) => {
        positions.get(i, scratch);
        out.x = scratch[0];
        out.y = scratch[1];
        out.z = scratch[2];
      };
      result = callback(vertexCount, readVertex);
    },
  );
  return /** @type {T} */ (result);
}

/**
 * Storing offsets in the deformer's local frame keeps them valid as either the
 * deformer or the deformable moves, without rebinding.
 *
 * @param {Deformable} deformable
 * @param {SurfaceDeformer} deformer
 */
function computeDeformableToDeformerTransform(deformable, deformer) {
  const inverseDeformer = Matrix4.inverse(deformer.modelMatrix, new Matrix4());
  return Matrix4.multiply(
    inverseDeformer,
    deformable.modelMatrix,
    new Matrix4(),
  );
}

/**
 * Brute-force search over every triangle: keep the triangle whose closest point
 * to <code>point</code> minimizes squared distance. We'll likely want to optimize
 * this with some spatial acceleration structure.
 *
 * The plane distance is a lower bound on the true closest distance (and exact
 * when the foot of the perpendicular falls inside the triangle), so we prune
 * any triangle whose plane is already farther than our best candidate before
 * paying for the more expensive outside-triangle fallback.
 *
 * Note: we read the deformer's control points and triangle indices directly
 * rather than through its GeometryAccessor for performance. If we ever free
 * the CPU copies of this data (keeping only the GPU mirrors), this read path
 * needs to be reworked to fetch through an access session.
 *
 * @param {SurfaceDeformer} deformer
 * @param {Cartesian3} point Vertex position in deformer-local space.
 * @param {number} triangleCount
 * @param {{ position: Cartesian3, baryU: number, baryV: number, triangleIndex: number }} result
 */
function bindVertexToClosestTriangle(deformer, point, triangleCount, result) {
  let bestDistSq = Infinity;

  for (let i = 0; i < triangleCount; ++i) {
    readTriangle(deformer, i, scratchTri);
    triangleNormal(scratchTri, scratchNormal);

    Cartesian3.clone(point, scratchRay.origin);
    Cartesian3.clone(scratchNormal, scratchRay.direction);
    const t = IntersectionTests.rayTriangleParametric(
      scratchRay,
      scratchTri.p0,
      scratchTri.p1,
      scratchTri.p2,
    );

    if (defined(t)) {
      // Foot of perpendicular is inside the triangle: exact closest point.
      const distSq = t * t;
      if (distSq >= bestDistSq) {
        continue;
      }

      Cartesian3.multiplyByScalar(scratchNormal, t, scratchOffset);
      Cartesian3.subtract(point, scratchOffset, scratchCandidate.position);
      barycentricCoordinates(
        scratchCandidate.position,
        scratchTri.p0,
        scratchTri.p1,
        scratchTri.p2,
        scratchBary,
      );
      scratchCandidate.baryU = scratchBary.y;
      scratchCandidate.baryV = scratchBary.z;

      bestDistSq = distSq;
      result.triangleIndex = i;
      Cartesian3.clone(scratchCandidate.position, result.position);
      result.baryU = scratchCandidate.baryU;
      result.baryV = scratchCandidate.baryV;
      continue;
    }

    // Foot of perpendicular is outside the triangle. The plane distance is a
    // lower bound on the true closest distance — prune cheaply before doing
    // the outside-triangle work.
    Cartesian3.subtract(point, scratchTri.p0, scratchOffset);
    const planeDist = Cartesian3.dot(scratchOffset, scratchNormal);
    if (planeDist * planeDist >= bestDistSq) {
      continue;
    }

    if (!projectPointOntoTriangle(point, scratchTri, scratchCandidate)) {
      continue;
    }

    const distSq = Cartesian3.distanceSquared(point, scratchCandidate.position);
    if (distSq >= bestDistSq) {
      continue;
    }

    bestDistSq = distSq;
    result.triangleIndex = i;
    Cartesian3.clone(scratchCandidate.position, result.position);
    result.baryU = scratchCandidate.baryU;
    result.baryV = scratchCandidate.baryV;
  }

  return result;
}

/**
 * Projects <code>point</code> onto the triangle, returning a point that lies on
 * (or inside) the triangle along with the barycentric coords needed to
 * reconstruct it from the triangle's vertices. Used for the fallback case
 * where the perpendicular foot lies outside the triangle.
 *
 * The projection is done by computing barycentric coords of the perpendicular
 * foot, clamping negative components to zero, and renormalizing. The recovered
 * point is therefore always a convex combination of the triangle's vertices,
 * which matches what the GPU recovery formula will compute at draw time.
 *
 * Note: this is not the strict Euclidean closest point — true closest-edge
 * would slide along an edge rather than toward the centroid. Swap in a true
 * closest-edge implementation later if artifacts appear.
 *
 * Returns false for degenerate triangles.
 *
 * Assumes <code>scratchNormal</code> already holds the unit triangle normal.
 *
 * @param {Cartesian3} point
 * @param {{ p0: Cartesian3, p1: Cartesian3, p2: Cartesian3 }} tri
 * @param {{ position: Cartesian3, baryU: number, baryV: number }} result
 * @returns {boolean}
 */
function projectPointOntoTriangle(point, tri, result) {
  Cartesian3.subtract(point, tri.p0, scratchOffset);
  const signedDist = Cartesian3.dot(scratchOffset, scratchNormal);
  Cartesian3.multiplyByScalar(scratchNormal, signedDist, scratchOffset);
  Cartesian3.subtract(point, scratchOffset, scratchProjection);

  const bary = barycentricCoordinates(
    scratchProjection,
    tri.p0,
    tri.p1,
    tri.p2,
    scratchBary,
  );
  if (!defined(bary)) {
    return false;
  }

  const u = Math.max(0.0, bary.x);
  const v = Math.max(0.0, bary.y);
  const w = Math.max(0.0, bary.z);
  const sum = u + v + w;
  if (sum === 0.0) {
    return false;
  }
  const invSum = 1.0 / sum;
  const uN = u * invSum;
  const vN = v * invSum;
  const wN = w * invSum;

  Cartesian3.multiplyByScalar(tri.p0, uN, result.position);
  Cartesian3.multiplyByScalar(tri.p1, vN, scratchTerm);
  Cartesian3.add(result.position, scratchTerm, result.position);
  Cartesian3.multiplyByScalar(tri.p2, wN, scratchTerm);
  Cartesian3.add(result.position, scratchTerm, result.position);

  result.baryU = vN;
  result.baryV = wN;
  return true;
}

/**
 * @param {SurfaceDeformer} deformer
 * @param {number} triangleIndex
 * @param {{ p0: Cartesian3, p1: Cartesian3, p2: Cartesian3 }} out
 */
function readTriangle(deformer, triangleIndex, out) {
  const base = triangleIndex * 3;
  const indices = /** @type {any} */ (deformer)._vertexIndices;
  readControlPoint(deformer, indices[base], out.p0);
  readControlPoint(deformer, indices[base + 1], out.p1);
  readControlPoint(deformer, indices[base + 2], out.p2);
}

/**
 * @param {SurfaceDeformer} deformer
 * @param {number} index
 * @param {Cartesian3} out
 */
function readControlPoint(deformer, index, out) {
  const controlPoints = /** @type {any} */ (deformer)._controlPoints;
  const base = index * 3;
  out.x = controlPoints[base];
  out.y = controlPoints[base + 1];
  out.z = controlPoints[base + 2];
}

/**
 * @param {{ p0: Cartesian3, p1: Cartesian3, p2: Cartesian3 }} tri
 * @param {Cartesian3} out
 */
function triangleNormal(tri, out) {
  Cartesian3.subtract(tri.p1, tri.p0, scratchEdge0);
  Cartesian3.subtract(tri.p2, tri.p0, scratchEdge1);
  Cartesian3.cross(scratchEdge0, scratchEdge1, out);
  return Cartesian3.normalize(out, out);
}

/**
 * @param {Float32Array} bindingData
 * @param {number} i
 * @param {Cartesian3} point
 * @param {{ position: Cartesian3, baryU: number, baryV: number, triangleIndex: number }} closest
 */
function writeBindingVertex(bindingData, i, point, closest) {
  const base = i * FLOATS_PER_BINDING_VERTEX;
  bindingData[base] = point.x - closest.position.x;
  bindingData[base + 1] = point.y - closest.position.y;
  bindingData[base + 2] = point.z - closest.position.z;
  bindingData[base + 3] = closest.baryU;
  bindingData[base + 4] = closest.baryV;
  bindingData[base + 5] = closest.triangleIndex;
}

const scratchVertexLocal = new Cartesian3();
const scratchVertex = new Cartesian3();
const scratchNormal = new Cartesian3();
const scratchEdge0 = new Cartesian3();
const scratchEdge1 = new Cartesian3();
const scratchOffset = new Cartesian3();
const scratchProjection = new Cartesian3();
const scratchBary = new Cartesian3();
const scratchTerm = new Cartesian3();
const scratchRay = new Ray();
const scratchTri = {
  p0: new Cartesian3(),
  p1: new Cartesian3(),
  p2: new Cartesian3(),
};
const scratchCandidate = {
  position: new Cartesian3(),
  baryU: 0,
  baryV: 0,
};
const scratchClosest = {
  position: new Cartesian3(),
  baryU: 0,
  baryV: 0,
  triangleIndex: 0,
};

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

  /**
   * @returns {Buffer | undefined}
   */
  getVertexBuffer() {
    return this._bindingVertexBuffer;
  }

  destroy() {
    if (defined(this._bindingVertexBuffer)) {
      this._bindingVertexBuffer.destroy();
    }
    super.destroy();
  }
}

export default SurfaceDeformer;
