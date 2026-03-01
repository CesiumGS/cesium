import Frozen from "../Core/Frozen.js";
import Matrix4 from "../Core/Matrix4.js";
import ModelUtility from "./Model/ModelUtility.js";
import GaussianSplatSorter from "./GaussianSplatSorter.js";
import GaussianSplatTextureGenerator from "./GaussianSplatTextureGenerator.js";
import ComponentDatatype from "../Core/ComponentDatatype.js";
import PixelDatatype from "../Renderer/PixelDatatype.js";
import PixelFormat from "../Core/PixelFormat.js";
import Sampler from "../Renderer/Sampler.js";
import Texture from "../Renderer/Texture.js";
import GaussianSplatRenderResources from "./GaussianSplatRenderResources.js";
import BlendingState from "./BlendingState.js";
import Pass from "../Renderer/Pass.js";
import ShaderDestination from "../Renderer/ShaderDestination.js";
import GaussianSplatVS from "../Shaders/PrimitiveGaussianSplatVS.js";
import GaussianSplatFS from "../Shaders/PrimitiveGaussianSplatFS.js";
import PrimitiveType from "../Core/PrimitiveType.js";
import DrawCommand from "../Renderer/DrawCommand.js";
import Geometry from "../Core/Geometry.js";
import GeometryAttribute from "../Core/GeometryAttribute.js";
import VertexArray from "../Renderer/VertexArray.js";
import BufferUsage from "../Renderer/BufferUsage.js";
import RenderState from "../Renderer/RenderState.js";
import clone from "../Core/clone.js";
import defined from "../Core/defined.js";
import DeveloperError from "../Core/DeveloperError.js";
import VertexAttributeSemantic from "./VertexAttributeSemantic.js";
import AttributeType from "./AttributeType.js";
import ModelComponents from "./ModelComponents.js";
import Axis from "./Axis.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Quaternion from "../Core/Quaternion.js";
import SplitDirection from "./SplitDirection.js";
import destroyObject from "../Core/destroyObject.js";
import ContextLimits from "../Renderer/ContextLimits.js";
import Transforms from "../Core/Transforms.js";

const scratchMatrix4A = new Matrix4();
const scratchMatrix4C = new Matrix4();
const scratchMatrix4D = new Matrix4();

/**
 * Runtime state machine for steady-state re-sorting of an already committed snapshot.
 *
 * The transition points are in {@link GaussianSplatPrimitive#update}:
 * - IDLE -> WAITING/SORTING when a new steady sort request is scheduled
 * - WAITING -> SORTING when a sorter promise becomes available
 * - SORTING -> SORTED when the active promise resolves with a valid result
 * - SORTED -> IDLE after rebuilding the draw command with fresh indexes
 * - Any state -> ERROR when the active sort promise rejects
 *
 * @private
 */
const GaussianSplatSortingState = {
  // No steady sort request is in flight. update() may decide to start one.
  IDLE: 0,
  // A steady sort was requested, but sorter capacity was unavailable this frame.
  WAITING: 1,
  // A steady sort promise is in flight and results are pending.
  SORTING: 2,
  // A valid sorted index buffer is available and waiting to be committed to draw command.
  SORTED: 3,
  // The active sort request failed; update() throws the captured error.
  ERROR: 4,
};

/**
 * Snapshot lifecycle for rebuilding aggregated splat data.
 *
 * Transition order:
 * BUILDING -> TEXTURE_PENDING -> TEXTURE_READY -> SORTING -> READY
 *
 * The transition points are split across two functions:
 * - {@link GaussianSplatPrimitive#update} drives BUILDING/SORTING/READY
 * - {@link GaussianSplatPrimitive.generateSplatTexture} drives TEXTURE_PENDING/TEXTURE_READY
 *
 * A snapshot is committed only when it reaches READY, so all GPU resources
 * and sorted indexes swap atomically as one unit.
 *
 * @private
 */
const SnapshotState = {
  // CPU aggregation is complete and this snapshot is ready to start async texture generation.
  BUILDING: "BUILDING",
  // Async texture generation/upload is in flight for this snapshot.
  TEXTURE_PENDING: "TEXTURE_PENDING",
  // Attribute textures are ready; snapshot can now request index sorting.
  TEXTURE_READY: "TEXTURE_READY",
  // Sort request is in flight for this snapshot generation.
  SORTING: "SORTING",
  // Sorted indexes were validated for this generation and may be committed.
  READY: "READY",
};

/**
 * Aggregated Gaussian splat snapshot data that is built asynchronously and
 * atomically committed once all required resources are ready.
 *
 * @typedef {object} GaussianSplatPrimitive.Snapshot
 * @property {number} generation Monotonic data generation token.
 * @property {Float32Array} positions Packed splat positions (xyz).
 * @property {Float32Array} rotations Packed splat rotations (xyzw).
 * @property {Float32Array} scales Packed splat scales (xyz).
 * @property {Uint8Array} colors Packed splat colors (rgba).
 * @property {Uint32Array|undefined} shData Packed spherical harmonics data.
 * @property {number} sphericalHarmonicsDegree Spherical harmonics degree.
 * @property {number} shCoefficientCount Coefficients per splat.
 * @property {number} numSplats Total splat count in this snapshot.
 * @property {Uint32Array|undefined} indexes Sorted index buffer when READY.
 * @property {Texture|undefined} gaussianSplatTexture Packed splat attribute texture.
 * @property {Texture|undefined} sphericalHarmonicsTexture Packed SH texture.
 * @property {number} lastTextureWidth Last splat texture width.
 * @property {number} lastTextureHeight Last splat texture height.
 * @property {string} state Current snapshot lifecycle state from {@link SnapshotState}.
 * @private
 */

/**
 * Packed spherical harmonics texture payload.
 *
 * @typedef {object} GaussianSplatPrimitive.SphericalHarmonicsTextureData
 * @property {number} width Texture width in texels.
 * @property {number} height Texture height in texels.
 * @property {ArrayBufferView} data Packed unsigned integer texture data.
 * @private
 */

/**
 * Packed Gaussian splat attribute texture payload.
 *
 * @typedef {object} GaussianSplatPrimitive.AttributeTextureData
 * @property {number} width Texture width in texels.
 * @property {number} height Texture height in texels.
 * @property {ArrayBufferView} data Packed unsigned integer texture data.
 * @private
 */

// Two stable frames avoids rebuilding during brief selected-tile jitter.
const DEFAULT_STABLE_FRAMES = 2;
// If selection keeps changing, force a rebuild after ~0.5s at 60fps to guarantee progress.
// Lower values react faster but can thrash on noisy LOD transitions.
// Higher values reduce rebuild churn but keep stale snapshots visible longer.
const DEFAULT_MAX_SNAPSHOT_STALL_FRAMES = 30;
// Minimum delay between steady re-sort requests once the camera is moving.
const DEFAULT_SORT_MIN_FRAME_INTERVAL = 3;
// ~0.5 degree camera direction change threshold before triggering steady re-sort.
const DEFAULT_SORT_MIN_ANGLE_RADIANS = 0.008726646259971648;
// Minimum camera movement in world units before triggering steady re-sort.
const DEFAULT_SORT_MIN_POSITION_DELTA = 1.0;

/**
 * Determines whether the camera has moved or rotated enough since the last
 * steady sort to justify scheduling a new one.
 *
 * Returns {@code true} when any of the following hold:
 * - No previous steady sort has been recorded yet.
 * - The camera position has moved by at least {@link DEFAULT_SORT_MIN_POSITION_DELTA} world units.
 * - The camera direction has changed by at least {@link DEFAULT_SORT_MIN_ANGLE_RADIANS} radians.
 *
 * A minimum frame interval ({@link DEFAULT_SORT_MIN_FRAME_INTERVAL}) is
 * enforced to prevent re-sorting every single frame.
 *
 * @param {GaussianSplatPrimitive} primitive The splat primitive to check.
 * @param {FrameState} frameState The current frame state.
 * @returns {boolean} Whether a new steady sort should begin.
 * @private
 */
function shouldStartSteadySort(primitive, frameState) {
  const framesSinceLastSort =
    primitive._lastSteadySortFrameNumber >= 0
      ? frameState.frameNumber - primitive._lastSteadySortFrameNumber
      : Number.POSITIVE_INFINITY;
  if (
    primitive._lastSteadySortFrameNumber >= 0 &&
    framesSinceLastSort < DEFAULT_SORT_MIN_FRAME_INTERVAL
  ) {
    return false;
  }

  const camera = frameState.camera;
  if (!defined(camera)) {
    return false;
  }
  if (
    !primitive._hasLastSteadySortCameraPosition ||
    !primitive._hasLastSteadySortCameraDirection
  ) {
    return true;
  }

  const positionDelta = Cartesian3.distance(
    camera.positionWC,
    primitive._lastSteadySortCameraPosition,
  );
  if (positionDelta >= DEFAULT_SORT_MIN_POSITION_DELTA) {
    return true;
  }

  const angleDelta = Cartesian3.angleBetween(
    camera.directionWC,
    primitive._lastSteadySortCameraDirection,
  );
  return angleDelta >= DEFAULT_SORT_MIN_ANGLE_RADIANS;
}

/**
 * Records the frame number and camera pose at the start of a steady sort so
 * that {@link shouldStartSteadySort} can later compute deltas.
 *
 * @param {GaussianSplatPrimitive} primitive The splat primitive to update.
 * @param {FrameState} frameState The current frame state.
 * @private
 */
function markSteadySortStart(primitive, frameState) {
  primitive._lastSteadySortFrameNumber = frameState.frameNumber;
  const camera = frameState.camera;
  if (!defined(camera)) {
    return;
  }
  Cartesian3.clone(camera.positionWC, primitive._lastSteadySortCameraPosition);
  primitive._hasLastSteadySortCameraPosition = true;
  Cartesian3.clone(
    camera.directionWC,
    primitive._lastSteadySortCameraDirection,
  );
  primitive._hasLastSteadySortCameraDirection = true;
}

/**
 * Checks whether the set of currently selected tiles differs from the set
 * recorded on the primitive. This is used to detect LOD transitions that
 * require a snapshot rebuild.
 *
 * @param {GaussianSplatPrimitive} primitive The splat primitive.
 * @param {Cesium3DTile[]} selectedTiles The tiles selected this frame.
 * @returns {boolean} {@code true} if the tile set has changed.
 * @private
 */
function haveSelectedTilesChanged(primitive, selectedTiles) {
  const prevSet = primitive._selectedTileSet;
  if (!defined(prevSet) || prevSet.size !== selectedTiles.length) {
    return true;
  }

  for (let i = 0; i < selectedTiles.length; i++) {
    if (!prevSet.has(selectedTiles[i])) {
      return true;
    }
  }

  return false;
}

/**
 * Returns whether the given sort result still matches the primitive's current
 * sort request and data generation, i.e. it has not been superseded.
 *
 * @param {GaussianSplatPrimitive} primitive The splat primitive.
 * @param {object} activeSort The sort result to validate.
 * @returns {boolean} {@code true} if the sort result is still current.
 * @private
 */
function isActiveSort(primitive, activeSort) {
  return (
    defined(activeSort) &&
    activeSort.requestId === primitive._sortRequestId &&
    activeSort.dataGeneration === primitive._splatDataGeneration
  );
}

/**
 * Destroys the GPU textures owned by a snapshot, if any, and clears the
 * references so they are not used after destruction.
 *
 * @param {GaussianSplatPrimitive.Snapshot|undefined} snapshot The snapshot whose textures should be destroyed.
 * @private
 */
function destroySnapshotTextures(snapshot) {
  if (!defined(snapshot)) {
    return;
  }
  if (defined(snapshot.gaussianSplatTexture)) {
    snapshot.gaussianSplatTexture.destroy();
    snapshot.gaussianSplatTexture = undefined;
  }
  if (defined(snapshot.sphericalHarmonicsTexture)) {
    snapshot.sphericalHarmonicsTexture.destroy();
    snapshot.sphericalHarmonicsTexture = undefined;
  }
}

/**
 * Schedules a GPU texture for deferred destruction. The texture is kept alive
 * for one additional frame so that any in-flight draw commands that reference
 * it can finish before the underlying GPU resource is released.
 *
 * @param {GaussianSplatPrimitive} primitive The owning primitive.
 * @param {Texture|undefined} texture The texture to retire.
 * @param {number} frameNumber The frame number at which the texture was retired.
 * @private
 */
function retireTexture(primitive, texture, frameNumber) {
  if (!defined(texture)) {
    return;
  }
  const retired = primitive._retiredTextures;
  retired.push({
    texture: texture,
    frameNumber: frameNumber,
  });
}

/**
 * Destroys any retired textures whose grace period (one frame) has elapsed.
 * Called once per frame to reclaim GPU memory from textures that were replaced
 * by a newer snapshot.
 *
 * @param {GaussianSplatPrimitive} primitive The owning primitive.
 * @param {number} frameNumber The current frame number.
 * @private
 */
function releaseRetiredTextures(primitive, frameNumber) {
  const retired = primitive._retiredTextures;
  if (!defined(retired) || retired.length === 0) {
    return;
  }
  const next = [];
  for (let i = 0; i < retired.length; i++) {
    const entry = retired[i];
    if (frameNumber - entry.frameNumber > 0) {
      entry.texture.destroy();
    } else {
      next.push(entry);
    }
  }
  primitive._retiredTextures = next;
}

/**
 * Atomically promotes a fully-built snapshot to be the active splat data for
 * the primitive. This includes swapping attribute arrays, GPU textures, and
 * sorted indexes, as well as retiring any previously active textures so they
 * can be safely destroyed after the current frame finishes.
 *
 * The snapshot <b>must</b> be in the {@link SnapshotState.READY} state;
 * otherwise a {@link DeveloperError} is thrown.
 *
 * @param {GaussianSplatPrimitive} primitive The owning primitive.
 * @param {GaussianSplatPrimitive.Snapshot} snapshot The snapshot to commit.
 * @param {FrameState} frameState The current frame state.
 * @throws {DeveloperError} If the snapshot is not READY.
 * @private
 */
function commitSnapshot(primitive, snapshot, frameState) {
  if (!defined(snapshot.indexes) || snapshot.state !== SnapshotState.READY) {
    throw new DeveloperError("Committing snapshot before it is READY.");
  }

  const frameNumber = frameState.frameNumber;
  const currentSnapshot = primitive._snapshot;
  const splatTexture = defined(currentSnapshot)
    ? currentSnapshot.gaussianSplatTexture
    : primitive.gaussianSplatTexture;
  if (defined(splatTexture) && splatTexture !== snapshot.gaussianSplatTexture) {
    retireTexture(primitive, splatTexture, frameNumber);
  }

  const sphericalHarmonicsTexture = defined(currentSnapshot)
    ? currentSnapshot.sphericalHarmonicsTexture
    : primitive.sphericalHarmonicsTexture;
  if (
    defined(sphericalHarmonicsTexture) &&
    sphericalHarmonicsTexture !== snapshot.sphericalHarmonicsTexture
  ) {
    retireTexture(primitive, sphericalHarmonicsTexture, frameNumber);
  }

  primitive._snapshot = snapshot;
  primitive._positions = snapshot.positions;
  primitive._rotations = snapshot.rotations;
  primitive._scales = snapshot.scales;
  primitive._colors = snapshot.colors;
  primitive._shData = snapshot.shData;
  primitive._sphericalHarmonicsDegree = snapshot.sphericalHarmonicsDegree;
  primitive._numSplats = snapshot.numSplats;
  primitive._indexes = snapshot.indexes;
  primitive.gaussianSplatTexture = snapshot.gaussianSplatTexture;
  primitive.sphericalHarmonicsTexture = snapshot.sphericalHarmonicsTexture;
  primitive._lastTextureWidth = snapshot.lastTextureWidth;
  primitive._lastTextureHeight = snapshot.lastTextureHeight;
  // Row-addressing params must be committed together with the texture so the
  // shader always reads the mask/shift that matches the texture in use.
  primitive._splatRowMask = snapshot.splatRowMask ?? 0x3ff;
  primitive._splatRowShift = snapshot.splatRowShift ?? 10;
  primitive._hasGaussianSplatTexture = defined(snapshot.gaussianSplatTexture);
  primitive._needsGaussianSplatTexture = false;
  primitive._gaussianSplatTexturePending = false;

  primitive._vertexArray = undefined;
  primitive._vertexArrayLen = -1;
  primitive._drawCommand = undefined;
  primitive._sorterPromise = undefined;
  primitive._activeSort = undefined;
  primitive._sorterState = GaussianSplatSortingState.IDLE;
  primitive._dirty = false;
}

/**
 * Finalizes async splat texture generation for a snapshot. The resolved data
 * updates or recreates GPU textures, and the snapshot transitions to
 * {@link SnapshotState.TEXTURE_READY} when complete.
 *
 * @param {GaussianSplatPrimitive} primitive The owning primitive.
 * @param {FrameState} frameState The current frame state.
 * @param {GaussianSplatPrimitive.Snapshot} snapshot Snapshot being populated.
 * @param {Promise<GaussianSplatPrimitive.AttributeTextureData>} promise Promise that resolves to packed splat texture data.
 * @returns {Promise<void>}
 * @private
 */
async function processGeneratedSplatTextureData(
  primitive,
  frameState,
  snapshot,
  promise,
) {
  try {
    const splatTextureData = await promise;
    const maxTex = ContextLimits.maximumTextureSize;

    // --- Dynamic texture width selection (fixes >16M splat crash) ---
    // The WASM always produces a 2048-wide texture (1024 splats/row). When the
    // splat count is large, the height can exceed the GPU's maximumTextureSize,
    // crashing WebGL. Solution: widen the texture (double the width, halving the
    // height) until it fits. The flat data layout is width-independent: splat i
    // is always at flat uint32 position i*8, so the same WASM buffer can be
    // reused unchanged—only the texture dimensions and the shader uniforms change.
    let optimalWidth = splatTextureData.width; // initial value is always 2048 from WASM; may be doubled below
    let optimalHeight = splatTextureData.height;
    while (optimalHeight > maxTex && optimalWidth < maxTex) {
      optimalWidth *= 2;
      optimalHeight = Math.ceil(snapshot.numSplats / (optimalWidth / 2));
    }
    const splatRowShift = Math.log2(optimalWidth / 2); // e.g. 10→2048, 11→4096
    const splatRowMask = optimalWidth / 2 - 1; // e.g. 0x3ff→2048, 0x7ff→4096

    // Hard cap: even at maximum width the height may still exceed the GPU limit
    // (requires > maxTex * (maxTex/2) splats, e.g. >134M on a 16384-limit GPU).
    // Rather than crashing, clamp the height to maxTex and truncate the splat
    // count so the texture stays within hardware limits. The last few splats
    // are silently dropped; this is preferable to a WebGL crash.
    if (optimalHeight > maxTex) {
      const originalCount = snapshot.numSplats;
      optimalHeight = maxTex;
      const splatsPerRow = optimalWidth / 2;
      snapshot.numSplats = maxTex * splatsPerRow;
      // Also truncate the CPU-side attribute arrays so that downstream
      // consumers (sorter, draw command) see a consistent splat count.
      // positions/scales: 3 components per splat
      // rotations/colors: 4 components per splat
      snapshot.positions = snapshot.positions.subarray(
        0,
        snapshot.numSplats * 3,
      );
      snapshot.rotations = snapshot.rotations.subarray(
        0,
        snapshot.numSplats * 4,
      );
      snapshot.scales = snapshot.scales.subarray(0, snapshot.numSplats * 3);
      snapshot.colors = snapshot.colors.subarray(0, snapshot.numSplats * 4);
      console.warn(
        `[GaussianSplat][HARD CAP] ${originalCount} splats exceed the maximum texture capacity ` +
          `(${maxTex}×${splatsPerRow} = ${snapshot.numSplats} splats at width=${optimalWidth}). ` +
          `Rendering only the first ${snapshot.numSplats} splats to avoid a WebGL crash.`,
      );
    }

    // Build a correctly-sized buffer for the chosen dimensions. The raw WASM
    // output may be a different size, so we subarray or zero-pad as needed.
    const requiredLen = optimalWidth * optimalHeight * 4;
    let effectiveData;
    if (requiredLen <= splatTextureData.data.length) {
      effectiveData = splatTextureData.data.subarray(0, requiredLen);
    } else {
      effectiveData = new Uint32Array(requiredLen);
      effectiveData.set(splatTextureData.data);
    }
    const effectiveTextureData = {
      width: optimalWidth,
      height: optimalHeight,
      data: effectiveData,
    };

    // Store row addressing params on the snapshot; they will be committed to
    // the primitive in commitSnapshot and forwarded to the shader as uniforms.
    snapshot.splatRowMask = splatRowMask;
    snapshot.splatRowShift = splatRowShift;

    if (primitive._pendingSnapshot !== snapshot) {
      snapshot.state = SnapshotState.BUILDING;
      return;
    }
    if (!defined(snapshot.gaussianSplatTexture)) {
      snapshot.gaussianSplatTexture = createGaussianSplatTexture(
        frameState.context,
        effectiveTextureData,
      );
    } else if (
      snapshot.lastTextureHeight !== effectiveTextureData.height ||
      snapshot.lastTextureWidth !== effectiveTextureData.width
    ) {
      const oldTex = snapshot.gaussianSplatTexture;
      snapshot.gaussianSplatTexture = createGaussianSplatTexture(
        frameState.context,
        effectiveTextureData,
      );
      oldTex.destroy();
    } else {
      snapshot.gaussianSplatTexture.copyFrom({
        source: {
          width: effectiveTextureData.width,
          height: effectiveTextureData.height,
          arrayBufferView: effectiveTextureData.data,
        },
      });
    }
    snapshot.lastTextureHeight = effectiveTextureData.height;
    snapshot.lastTextureWidth = effectiveTextureData.width;

    if (defined(snapshot.shData) && snapshot.sphericalHarmonicsDegree > 0) {
      const oldTex = snapshot.sphericalHarmonicsTexture;
      const width = ContextLimits.maximumTextureSize;
      const dims = snapshot.shCoefficientCount / 3;
      const splatsPerRow = Math.floor(width / dims);
      const floatsPerRow = splatsPerRow * (dims * 2);

      const _shHeight = Math.ceil(snapshot.numSplats / splatsPerRow);

      // SH texture width is already maxTex and cannot be widened further.
      // When height would exceed the GPU limit, gracefully disable SH for this
      // snapshot and fall back to base color rendering rather than crashing.
      if (_shHeight > width) {
        console.warn(
          `[GaussianSplat][SHTexture] ${snapshot.numSplats} splats require SH height ${_shHeight} > maxTex ${width}. ` +
            `Disabling spherical harmonics for this snapshot (color-only fallback).`,
        );
        snapshot.sphericalHarmonicsDegree = 0;
        if (defined(oldTex)) {
          oldTex.destroy();
        }
        snapshot.sphericalHarmonicsTexture = undefined;
      } else {
        const texBuf = new Uint32Array(width * _shHeight * 2);

        let dataIndex = 0;
        for (let i = 0; dataIndex < snapshot.shData.length; i += width * 2) {
          texBuf.set(
            snapshot.shData.subarray(dataIndex, dataIndex + floatsPerRow),
            i,
          );
          dataIndex += floatsPerRow;
        }
        snapshot.sphericalHarmonicsTexture = createSphericalHarmonicsTexture(
          frameState.context,
          {
            data: texBuf,
            width: width,
            height: _shHeight,
          },
        );
        if (defined(oldTex)) {
          oldTex.destroy();
        }
      }
    }

    snapshot.state = SnapshotState.TEXTURE_READY;
  } catch (error) {
    console.error("Error generating Gaussian splat texture:", error);
    snapshot.state = SnapshotState.BUILDING;
  }
}

/**
 * Resolves an in-flight sort for a pending snapshot, validates that the result
 * still matches the active generation/request, and commits the snapshot when
 * valid.
 *
 * @param {GaussianSplatPrimitive} primitive The owning primitive.
 * @param {FrameState} frameState The current frame state.
 * @param {object|undefined} pendingSort Pending sort metadata.
 * @param {Promise<Uint32Array>} sortPromise Promise that resolves to sorted indexes.
 * @returns {Promise<void>}
 * @private
 */
async function resolvePendingSnapshotSort(
  primitive,
  frameState,
  pendingSort,
  sortPromise,
) {
  try {
    const sortedData = await sortPromise;
    if (
      !defined(pendingSort) ||
      pendingSort.snapshot !== primitive._pendingSnapshot
    ) {
      return;
    }
    const expectedCount = pendingSort.expectedCount;
    const currentCount = expectedCount;
    const sortedLen = sortedData?.length;
    if (expectedCount !== currentCount || sortedLen !== expectedCount) {
      primitive._pendingSortPromise = undefined;
      primitive._pendingSort = undefined;
      if (pendingSort.snapshot.state === SnapshotState.SORTING) {
        pendingSort.snapshot.state = SnapshotState.TEXTURE_READY;
      }
      return;
    }

    const pending = pendingSort.snapshot;
    pending.indexes = sortedData;
    pending.state = SnapshotState.READY;
    primitive._pendingSortPromise = undefined;
    primitive._pendingSort = undefined;
    commitSnapshot(primitive, pending, frameState);
    primitive._pendingSnapshot = undefined;
    GaussianSplatPrimitive.buildGSplatDrawCommand(primitive, frameState);
  } catch (err) {
    if (
      !defined(pendingSort) ||
      pendingSort.snapshot !== primitive._pendingSnapshot
    ) {
      return;
    }
    primitive._pendingSortPromise = undefined;
    primitive._pendingSort = undefined;
    if (pendingSort.snapshot.state === SnapshotState.SORTING) {
      pendingSort.snapshot.state = SnapshotState.TEXTURE_READY;
    }
    primitive._sorterState = GaussianSplatSortingState.ERROR;
    primitive._sorterError = err;
  }
}

/**
 * Resolves an in-flight steady-state sort for the current committed snapshot.
 * Results are ignored when superseded; otherwise, they advance sorting state
 * to {@link GaussianSplatSortingState.SORTED}.
 *
 * @param {GaussianSplatPrimitive} primitive The owning primitive.
 * @param {object|undefined} activeSort Active sort metadata.
 * @param {Promise<Uint32Array>} sortPromise Promise that resolves to sorted indexes.
 * @returns {Promise<void>}
 * @private
 */
async function resolveSteadySort(primitive, activeSort, sortPromise) {
  try {
    const sortedData = await sortPromise;
    const isActive = isActiveSort(primitive, activeSort);
    const expectedCount = activeSort?.expectedCount;
    const currentCount = expectedCount;
    const sortedLen = sortedData?.length;
    const isMismatch =
      expectedCount !== currentCount || sortedLen !== expectedCount;
    if (!isActive || isMismatch) {
      if (isActive) {
        primitive._sorterPromise = undefined;
        primitive._sorterState = GaussianSplatSortingState.IDLE;
      }
      return;
    }
    primitive._indexes = sortedData;
    primitive._sorterState = GaussianSplatSortingState.SORTED;
  } catch (err) {
    if (!isActiveSort(primitive, activeSort)) {
      return;
    }
    primitive._sorterState = GaussianSplatSortingState.ERROR;
    primitive._sorterError = err;
  }
}

/**
 * Creates a GPU texture that stores packed spherical harmonics coefficient
 * data for all splats. The texture uses a two-channel unsigned-integer format
 * ({@link PixelFormat.RG_INTEGER}) and nearest-neighbor sampling.
 *
 * @param {Context} context The WebGL context.
 * @param {GaussianSplatPrimitive.SphericalHarmonicsTextureData} shData Packed SH texture payload.
 * @returns {Texture} The created texture.
 * @private
 */
function createSphericalHarmonicsTexture(context, shData) {
  const texture = new Texture({
    context: context,
    source: {
      width: shData.width,
      height: shData.height,
      arrayBufferView: shData.data,
    },
    preMultiplyAlpha: false,
    skipColorSpaceConversion: true,
    pixelFormat: PixelFormat.RG_INTEGER,
    pixelDatatype: PixelDatatype.UNSIGNED_INT,
    flipY: false,
    sampler: Sampler.NEAREST,
  });

  return texture;
}

/**
 * Creates a GPU texture that stores the packed Gaussian splat attributes
 * (positions, scales, rotations, colors). The texture uses an RGBA
 * unsigned-integer format ({@link PixelFormat.RGBA_INTEGER}) and
 * nearest-neighbor sampling.
 *
 * @param {Context} context The WebGL context.
 * @param {GaussianSplatPrimitive.AttributeTextureData} splatTextureData Packed splat texture payload.
 * @returns {Texture} The created texture.
 * @private
 */
function createGaussianSplatTexture(context, splatTextureData) {
  return new Texture({
    context: context,
    source: {
      width: splatTextureData.width,
      height: splatTextureData.height,
      arrayBufferView: splatTextureData.data,
    },
    preMultiplyAlpha: false,
    skipColorSpaceConversion: true,
    pixelFormat: PixelFormat.RGBA_INTEGER,
    pixelDatatype: PixelDatatype.UNSIGNED_INT,
    flipY: false,
    sampler: Sampler.NEAREST,
  });
}

/** A primitive that renders Gaussian splats.
 * <p>
 * This primitive is used to render Gaussian splats in a 3D Tileset.
 * It is designed to work with the KHR_gaussian_splatting and KHR_gaussian_splatting_compression_spz_2 extensions.
 * </p>
 * @alias GaussianSplatPrimitive
 * @constructor
 * @param {object} options An object with the following properties:
 * @param {Cesium3DTileset} options.tileset The tileset that this primitive belongs to.
 * @param {boolean} [options.debugShowBoundingVolume=false] Whether to show the bounding volume of the primitive for debugging purposes.
 * @private
 */

function GaussianSplatPrimitive(options) {
  options = options ?? Frozen.EMPTY_OBJECT;

  /**
   * The positions of the Gaussian splats in the primitive.
   * @type {undefined|Float32Array}
   * @private
   */
  this._positions = undefined;
  /**
   * The rotations of the Gaussian splats in the primitive.
   * @type {undefined|Float32Array}
   * @private
   */
  this._rotations = undefined;
  /**
   * The scales of the Gaussian splats in the primitive.
   * @type {undefined|Float32Array}
   * @private
   */
  this._scales = undefined;
  /**
   * The colors of the Gaussian splats in the primitive.
   * @type {undefined|Uint8Array}
   * @private
   */
  this._colors = undefined;
  /**
   * The indexes of the Gaussian splats in the primitive.
   * Used to index into the splat attribute texture in the vertex shader.
   * @type {undefined|Uint32Array}
   * @private
   */
  this._indexes = undefined;
  /**
   * The number of splats in the primitive.
   * This is the total number of splats across all selected tiles.
   * @type {number}
   * @private
   */
  this._numSplats = 0;
  /**
   * Indicates whether or not the primitive needs a Gaussian splat texture.
   * This is set to true when the primitive is first created or when the splat attributes change.
   * @type {boolean}
   * @private
   */
  this._needsGaussianSplatTexture = true;
  this._snapshot = undefined;
  this._pendingSnapshot = undefined;
  this._retiredTextures = [];

  /**
   * Scratch buffer re-used across frames for aggregating packed spherical
   * harmonics data so that a fresh typed-array allocation is avoided on
   * every tile-selection change.
   * @type {undefined|Uint32Array}
   * @private
   */
  this._scratchAggregateShBuffer = undefined;
  this._selectedTilesStableFrames = 0;
  this._needsSnapshotRebuild = false;
  this._snapshotRebuildStallFrames = 0;

  /**
   * The previous view matrix used to determine if the primitive needs to be updated.
   * This is used to avoid unnecessary updates when the view matrix hasn't changed.
   * @type {Matrix4}
   * @private
   */
  this._prevViewMatrix = new Matrix4();

  /**
   * Indicates whether or not to show the bounding volume of the primitive for debugging purposes.
   * This is used to visualize the bounding volume of the primitive in the scene.
   * @type {boolean}
   * @private
   */
  this._debugShowBoundingVolume = options.debugShowBoundingVolume ?? false;

  /**
   * The texture used to store the Gaussian splat attributes.
   * This texture is created from the splat attributes (positions, scales, rotations, colors)
   * and is used in the vertex shader to render the splats.
   * @type {undefined|Texture}
   * @private
   * @see {@link GaussianSplatTextureGenerator}
   */
  this.gaussianSplatTexture = undefined;

  /**
   * The texture used to store the spherical harmonics coefficients for the Gaussian splats.
   * @type {undefined|Texture}
   * @private
   */
  this.sphericalHarmonicsTexture = undefined;

  /**
   * The last width of the Gaussian splat texture.
   * This is used to track changes in the texture size and update the primitive accordingly.
   * @type {number}
   * @private
   */
  this._lastTextureWidth = 0;
  /**
   * The last height of the Gaussian splat texture.
   * This is used to track changes in the texture size and update the primitive accordingly.
   * @type {number}
   * @private
   */
  this._lastTextureHeight = 0;
  /**
   * The vertex array used to render the Gaussian splats.
   * This vertex array contains the attributes needed to render the splats, such as positions and indexes.
   * @type {undefined|VertexArray}
   * @private
   */
  this._vertexArray = undefined;
  /**
   * The length of the vertex array, used to track changes in the number of splats.
   * This is used to determine if the vertex array needs to be rebuilt.
   * @type {number}
   * @private
   */
  this._vertexArrayLen = -1;
  this._splitDirection = SplitDirection.NONE;

  /**
   * The dirty flag forces the primitive to render this frame.
   * @type {boolean}
   * @private
   */
  this._dirty = false;

  this._tileset = options.tileset;

  this._baseTilesetUpdate = this._tileset.update;
  this._tileset.update = this._wrappedUpdate.bind(this);

  this._tileset.tileLoad.addEventListener(this.onTileLoad, this);
  this._tileset.tileVisible.addEventListener(this.onTileVisible, this);

  /**
   * Tracks current count of selected tiles.
   * This is used to determine if the primitive needs to be rebuilt.
   * @type {number}
   * @private
   */
  this.selectedTileLength = 0;
  this._selectedTileSet = new Set();

  /**
   * Indicates whether or not the primitive is ready for use.
   * @type {boolean}
   * @private
   */
  this._ready = false;

  /**
   * Indicates whether or not the primitive has a Gaussian splat texture.
   * @type {boolean}
   * @private
   */
  this._hasGaussianSplatTexture = false;

  /**
   * Indicates whether or not the primitive is currently generating a Gaussian splat texture.
   * @type {boolean}
   * @private
   */
  this._gaussianSplatTexturePending = false;

  /**
   * The draw command used to render the Gaussian splats.
   * @type {undefined|DrawCommand}
   * @private
   */
  this._drawCommand = undefined;
  this._drawCommandModelMatrix = new Matrix4();
  /**
   * The root transform of the tileset.
   * This is used to transform the splats into world space.
   * @type {undefined|Matrix4}
   * @private
   */
  this._rootTransform = undefined;

  /**
   * The axis correction matrix to transform the splats from Y-up to Z-up.
   * @type {Matrix4}
   * @private
   */
  this._axisCorrectionMatrix = ModelUtility.getAxisCorrectionMatrix(
    Axis.Y,
    Axis.X,
    new Matrix4(),
  );

  /**
   * Indicates whether or not the primitive has been destroyed.
   * @type {boolean}
   * @private
   */
  this._isDestroyed = false;

  /**
   * The state of the Gaussian splat sorting process.
   * This is used to track the progress of the sorting operation.
   * @type {GaussianSplatSortingState}
   * @private
   */
  this._sorterState = GaussianSplatSortingState.IDLE;
  /**
   * A promise that resolves when the Gaussian splat sorting operation is complete.
   * This is used to track the progress of the sorting operation.
   * @type {undefined|Promise}
   * @private
   */
  this._sorterPromise = undefined;
  this._splatDataGeneration = 0;
  this._sortRequestId = 0;
  this._activeSort = undefined;
  this._pendingSortPromise = undefined;
  this._pendingSort = undefined;
  this._lastSteadySortFrameNumber = -1;
  this._lastSteadySortCameraPosition = new Cartesian3();
  this._hasLastSteadySortCameraPosition = false;
  this._lastSteadySortCameraDirection = new Cartesian3();
  this._hasLastSteadySortCameraDirection = false;

  /**
   * An error that occurred during the Gaussian splat sorting operation.
   * Thrown when state is ERROR.
   * @type {undefined|Error}
   * @private
   */
  this._sorterError = undefined;

  /**
   * Row-addressing parameters for the splat attribute texture used in the vertex shader.
   * The attribute texture stores 2 RGBA_INTEGER texels per splat, packed row-major.
   * The starting texture width is the WASM default (2048), which holds 1024 splats/row.
   * When the splat count would push the height past the GPU's maximumTextureSize, the
   * texture is widened (doubled) so height stays within limits. The shader reads these
   * as uniforms instead of hard-coded constants.
   *
   *   rowMask  = splatsPerRow - 1  (e.g. 0x3ff for width=2048, 0x7ff for width=4096)
   *   rowShift = log2(splatsPerRow) (e.g. 10 for width=2048, 11 for width=4096)
   *
   * @type {number}
   * @private
   */
  this._splatRowMask = 0x3ff; // default: width=2048, splatsPerRow=1024
  this._splatRowShift = 10; // default: width=2048
}

Object.defineProperties(GaussianSplatPrimitive.prototype, {
  /**
   * Indicates whether the primitive is ready for use.
   * @memberof GaussianSplatPrimitive.prototype
   * @type {boolean}
   * @readonly
   */
  ready: {
    get: function () {
      return this._ready;
    },
  },

  /**
   * Indicates whether the primitive has completed loading and sorting.
   * @memberof GaussianSplatPrimitive.prototype
   * @type {boolean}
   * @private
   * @readonly
   */
  isStable: {
    get: function () {
      return (
        !this._dirty &&
        (!defined(this._pendingSnapshot) ||
          this._pendingSnapshot.state === SnapshotState.READY)
      );
    },
  },

  /**
   * The {@link SplitDirection} to apply to this point.
   * @memberof GaussianSplatPrimitive.prototype
   * @type {SplitDirection}
   * @default {@link SplitDirection.NONE}
   */
  splitDirection: {
    get: function () {
      return this._splitDirection;
    },
    set: function (value) {
      if (this._splitDirection !== value) {
        this._splitDirection = value;
        this._dirty = true;
      }
    },
  },
});

/**
 * Since we aren't visible at the scene level, we need to wrap the tileset update
 * so we not only get called but ensure we update immediately after the tileset.
 * @param {FrameState} frameState
 * @private
 *
 */
GaussianSplatPrimitive.prototype._wrappedUpdate = function (frameState) {
  this._baseTilesetUpdate.call(this._tileset, frameState);
  this.update(frameState);
};

/**
 * Destroys the primitive and releases its resources in a deterministic manner.
 * @private
 */
GaussianSplatPrimitive.prototype.destroy = function () {
  this._positions = undefined;
  this._rotations = undefined;
  this._scales = undefined;
  this._colors = undefined;
  this._indexes = undefined;
  destroySnapshotTextures(this._pendingSnapshot);
  destroySnapshotTextures(this._snapshot);
  if (defined(this._retiredTextures)) {
    for (let i = 0; i < this._retiredTextures.length; i++) {
      this._retiredTextures[i].texture.destroy();
    }
  }
  this._retiredTextures = [];
  this._pendingSnapshot = undefined;
  this._snapshot = undefined;
  this.gaussianSplatTexture = undefined;
  this.sphericalHarmonicsTexture = undefined;

  const drawCommand = this._drawCommand;
  if (defined(drawCommand)) {
    drawCommand.shaderProgram =
      drawCommand.shaderProgram && drawCommand.shaderProgram.destroy();
  }

  if (defined(this._vertexArray)) {
    this._vertexArray.destroy();
    this._vertexArray = undefined;
  }

  this._tileset.update = this._baseTilesetUpdate.bind(this._tileset);

  return destroyObject(this);
};

/**
 * Returns true if this object was destroyed; otherwise, false.
 * <br /><br />
 * If this object was destroyed, it should not be used; calling any function other than
 * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
 * @returns {boolean} Returns true if the primitive has been destroyed, otherwise false.
 * @private
 */
GaussianSplatPrimitive.prototype.isDestroyed = function () {
  return this._isDestroyed;
};

/**
 * Event callback for when a tile is loaded.
 * This method is called when a tile is loaded and the primitive needs to be updated.
 * It sets the dirty flag to true, indicating that the primitive needs to be rebuilt.
 * @param {Cesium3DTile} tile
 * @private
 */
GaussianSplatPrimitive.prototype.onTileLoad = function (tile) {
  this._dirty = true;
};

/**
 * Callback for visible tiles.
 * @param {Cesium3DTile} tile
 * @private
 */
GaussianSplatPrimitive.prototype.onTileVisible = function (tile) {};

/**
 * Transforms the tile's splat primitive attributes into world space.
 * <br /><br />
 * This method applies the computed transform of the tile and the tileset's bounding sphere
 * to the splat primitive's position, rotation, and scale attributes.
 * It modifies the attributes in place, transforming them from local space to world space.
 *
 * @param {Cesium3DTile} tile
 * @private
 */
GaussianSplatPrimitive.transformTile = function (tile) {
  const computedTransform = tile.computedTransform;
  const gltfPrimitive = tile.content.gltfPrimitive;
  const gaussianSplatPrimitive = tile.tileset.gaussianSplatPrimitive;

  if (gaussianSplatPrimitive._rootTransform === undefined) {
    gaussianSplatPrimitive._rootTransform = Transforms.eastNorthUpToFixedFrame(
      tile.tileset.boundingSphere.center,
    );
  }
  const rootTransform = gaussianSplatPrimitive._rootTransform;

  const computedModelMatrix = Matrix4.multiplyTransformation(
    computedTransform,
    gaussianSplatPrimitive._axisCorrectionMatrix,
    scratchMatrix4A,
  );

  Matrix4.multiplyTransformation(
    computedModelMatrix,
    tile.content.worldTransform,
    computedModelMatrix,
  );

  // toLocal is inverse(rootTransform) only. tileset.modelMatrix is already
  // factored into computedModelMatrix via tile.computedTransform, so its effect
  // is baked directly into the splat values rather than split into the draw
  // command's modelMatrix. This keeps czm_view * modelMatrix numerically small,
  // avoiding float32 precision loss at ECEF-scale translations.
  const toLocal = Matrix4.inverse(rootTransform, scratchMatrix4C);
  const transform = Matrix4.multiplyTransformation(
    toLocal,
    computedModelMatrix,
    scratchMatrix4A,
  );
  const positions = tile.content.positions;
  const rotations = tile.content.rotations;
  const scales = tile.content.scales;
  const attributePositions = ModelUtility.getAttributeBySemantic(
    gltfPrimitive,
    VertexAttributeSemantic.POSITION,
  ).typedArray;

  const attributeRotations = ModelUtility.getAttributeBySemantic(
    gltfPrimitive,
    VertexAttributeSemantic.ROTATION,
  ).typedArray;

  const attributeScales = ModelUtility.getAttributeBySemantic(
    gltfPrimitive,
    VertexAttributeSemantic.SCALE,
  ).typedArray;

  const position = new Cartesian3();
  const rotation = new Quaternion();
  const scale = new Cartesian3();
  for (let i = 0; i < attributePositions.length / 3; ++i) {
    position.x = attributePositions[i * 3];
    position.y = attributePositions[i * 3 + 1];
    position.z = attributePositions[i * 3 + 2];

    rotation.x = attributeRotations[i * 4];
    rotation.y = attributeRotations[i * 4 + 1];
    rotation.z = attributeRotations[i * 4 + 2];
    rotation.w = attributeRotations[i * 4 + 3];

    scale.x = attributeScales[i * 3];
    scale.y = attributeScales[i * 3 + 1];
    scale.z = attributeScales[i * 3 + 2];

    Matrix4.fromTranslationQuaternionRotationScale(
      position,
      rotation,
      scale,
      scratchMatrix4C,
    );

    Matrix4.multiplyTransformation(transform, scratchMatrix4C, scratchMatrix4C);

    Matrix4.getTranslation(scratchMatrix4C, position);
    Matrix4.getRotation(scratchMatrix4C, rotation);
    Matrix4.getScale(scratchMatrix4C, scale);

    positions[i * 3] = position.x;
    positions[i * 3 + 1] = position.y;
    positions[i * 3 + 2] = position.z;

    rotations[i * 4] = rotation.x;
    rotations[i * 4 + 1] = rotation.y;
    rotations[i * 4 + 2] = rotation.z;
    rotations[i * 4 + 3] = rotation.w;

    scales[i * 3] = scale.x;
    scales[i * 3 + 1] = scale.y;
    scales[i * 3 + 2] = scale.z;
  }
};

/**
 * Generates the Gaussian splat texture for the primitive.
 * This method creates a texture from the splat attributes (positions, scales, rotations, colors)
 * and updates the primitive's state accordingly.
 *
 * @see {@link GaussianSplatTextureGenerator}
 *
 * @param {GaussianSplatPrimitive} primitive The owning primitive.
 * @param {FrameState} frameState The current frame state.
 * @param {GaussianSplatPrimitive.Snapshot} snapshot Snapshot being populated.
 * @private
 */
GaussianSplatPrimitive.generateSplatTexture = function (
  primitive,
  frameState,
  snapshot,
) {
  if (!defined(snapshot) || snapshot.state !== SnapshotState.BUILDING) {
    return;
  }
  snapshot.state = SnapshotState.TEXTURE_PENDING;
  const promise = GaussianSplatTextureGenerator.generateFromAttributes({
    attributes: {
      positions: new Float32Array(snapshot.positions),
      scales: new Float32Array(snapshot.scales),
      rotations: new Float32Array(snapshot.rotations),
      colors: new Uint8Array(snapshot.colors),
    },
    count: snapshot.numSplats,
  });
  if (!defined(promise)) {
    snapshot.state = SnapshotState.BUILDING;
    return;
  }
  void processGeneratedSplatTextureData(
    primitive,
    frameState,
    snapshot,
    promise,
  );
};

/**
 * Builds the draw command for the Gaussian splat primitive.
 * This method sets up the shader program, render state, and vertex array for rendering the Gaussian splats.
 * It also configures the attributes and uniforms required for rendering.
 *
 * @param {GaussianSplatPrimitive} primitive
 * @param {FrameState} frameState
 *
 * @private
 */
GaussianSplatPrimitive.buildGSplatDrawCommand = function (
  primitive,
  frameState,
) {
  const tileset = primitive._tileset;
  const renderResources = new GaussianSplatRenderResources(primitive);
  const { shaderBuilder } = renderResources;
  const renderStateOptions = renderResources.renderStateOptions;
  renderStateOptions.cull.enabled = false;
  renderStateOptions.depthMask = false;
  renderStateOptions.depthTest.enabled = true;
  renderStateOptions.blending = BlendingState.PRE_MULTIPLIED_ALPHA_BLEND;
  renderResources.alphaOptions.pass = Pass.GAUSSIAN_SPLATS;

  shaderBuilder.addAttribute("vec2", "a_screenQuadPosition");
  shaderBuilder.addAttribute("float", "a_splatIndex");
  shaderBuilder.addVarying("vec4", "v_splatColor");
  shaderBuilder.addVarying("vec2", "v_vertPos");
  shaderBuilder.addUniform(
    "float",
    "u_splitDirection",
    ShaderDestination.VERTEX,
  );
  shaderBuilder.addVarying("float", "v_splitDirection");
  shaderBuilder.addUniform(
    "highp usampler2D",
    "u_splatAttributeTexture",
    ShaderDestination.VERTEX,
  );

  shaderBuilder.addUniform(
    "float",
    "u_sphericalHarmonicsDegree",
    ShaderDestination.VERTEX,
  );

  shaderBuilder.addUniform("float", "u_splatScale", ShaderDestination.VERTEX);

  shaderBuilder.addUniform(
    "vec3",
    "u_cameraPositionWC",
    ShaderDestination.VERTEX,
  );

  shaderBuilder.addUniform(
    "mat3",
    "u_inverseModelRotation",
    ShaderDestination.VERTEX,
  );

  const uniformMap = renderResources.uniformMap;

  // Row-addressing uniforms: read from primitive each draw so they stay in sync
  // with the texture width chosen for the current snapshot.
  shaderBuilder.addUniform("int", "u_splatRowMask", ShaderDestination.VERTEX);
  shaderBuilder.addUniform("int", "u_splatRowShift", ShaderDestination.VERTEX);

  const textureCache = primitive.gaussianSplatTexture;
  uniformMap.u_splatAttributeTexture = function () {
    return textureCache;
  };
  uniformMap.u_splatRowMask = function () {
    return primitive._splatRowMask;
  };
  uniformMap.u_splatRowShift = function () {
    return primitive._splatRowShift;
  };

  if (primitive._sphericalHarmonicsDegree > 0) {
    shaderBuilder.addDefine(
      "HAS_SPHERICAL_HARMONICS",
      "1",
      ShaderDestination.VERTEX,
    );
    shaderBuilder.addUniform(
      "highp usampler2D",
      "u_sphericalHarmonicsTexture",
      ShaderDestination.VERTEX,
    );
    uniformMap.u_sphericalHarmonicsTexture = function () {
      return primitive.sphericalHarmonicsTexture;
    };
  }
  uniformMap.u_sphericalHarmonicsDegree = function () {
    return primitive._sphericalHarmonicsDegree;
  };

  uniformMap.u_cameraPositionWC = function () {
    return Cartesian3.clone(frameState.camera.positionWC);
  };

  uniformMap.u_inverseModelRotation = function () {
    // The draw command's modelMatrix is rootTransform only; tileset.modelMatrix
    // is baked into the splat positions. Inverting rootTransform alone keeps
    // SH view directions consistent with the baked data. Including
    // tileset.modelMatrix here would double-count its rotation, causing
    // incorrect SH colors when a transform is applied to the tileset.
    const inverseModelRotation = Matrix4.getRotation(
      Matrix4.inverse(primitive._rootTransform, scratchMatrix4C),
      scratchMatrix4D,
    );
    return inverseModelRotation;
  };

  uniformMap.u_splitDirection = function () {
    return primitive.splitDirection;
  };

  const instanceCount = defined(primitive._indexes)
    ? primitive._indexes.length
    : primitive._numSplats;
  renderResources.instanceCount = instanceCount;
  renderResources.count = 4;
  renderResources.primitiveType = PrimitiveType.TRIANGLE_STRIP;
  shaderBuilder.addVertexLines(GaussianSplatVS);
  shaderBuilder.addFragmentLines(GaussianSplatFS);
  const shaderProgram = shaderBuilder.buildShaderProgram(frameState.context);
  let renderState = clone(
    RenderState.fromCache(renderResources.renderStateOptions),
    true,
  );

  renderState.cull.face = ModelUtility.getCullFace(
    tileset.modelMatrix,
    PrimitiveType.TRIANGLE_STRIP,
  );

  renderState = RenderState.fromCache(renderState);
  const splatQuadAttrLocations = {
    screenQuadPosition: 0,
    splatIndex: 2,
  };

  const idxAttr = new ModelComponents.Attribute();
  idxAttr.name = "_SPLAT_INDEXES";
  idxAttr.typedArray = primitive._indexes;
  idxAttr.componentDatatype = ComponentDatatype.UNSIGNED_INT;
  idxAttr.type = AttributeType.SCALAR;
  idxAttr.normalized = false;
  idxAttr.count = renderResources.instanceCount;
  idxAttr.constant = 0;
  idxAttr.instanceDivisor = 1;

  const needsRebuild =
    !defined(primitive._vertexArray) ||
    primitive._indexes.length > primitive._vertexArrayLen;
  if (needsRebuild) {
    const geometry = new Geometry({
      attributes: {
        screenQuadPosition: new GeometryAttribute({
          componentDatatype: ComponentDatatype.FLOAT,
          componentsPerAttribute: 2,
          values: [-1, -1, 1, -1, 1, 1, -1, 1],
          name: "_SCREEN_QUAD_POS",
          variableName: "screenQuadPosition",
        }),
        splatIndex: { ...idxAttr, variableName: "splatIndex" },
      },
      primitiveType: PrimitiveType.TRIANGLE_STRIP,
    });

    primitive._vertexArray = VertexArray.fromGeometry({
      context: frameState.context,
      geometry: geometry,
      attributeLocations: splatQuadAttrLocations,
      bufferUsage: BufferUsage.DYNAMIC_DRAW,
      interleave: false,
    });
  } else {
    primitive._vertexArray
      .getAttribute(1)
      .vertexBuffer.copyFromArrayView(primitive._indexes);
  }

  primitive._vertexArrayLen = primitive._indexes.length;

  // The draw command uses rootTransform as its modelMatrix. tileset.modelMatrix
  // is baked into the splat positions by transformTile and must not appear here
  // as well. This keeps czm_view * modelMatrix numerically small (ENU frame),
  // avoiding float32 precision loss from ECEF-scale translations.
  const modelMatrix = Matrix4.clone(
    primitive._rootTransform,
    primitive._drawCommandModelMatrix,
  );

  const vertexArrayCache = primitive._vertexArray;
  const command = new DrawCommand({
    boundingVolume: tileset.boundingSphere,
    modelMatrix: modelMatrix,
    uniformMap: uniformMap,
    renderState: renderState,
    vertexArray: vertexArrayCache,
    shaderProgram: shaderProgram,
    cull: renderStateOptions.cull.enabled,
    pass: Pass.GAUSSIAN_SPLATS,
    count: renderResources.count,
    owner: primitive,
    instanceCount: renderResources.instanceCount,
    primitiveType: PrimitiveType.TRIANGLE_STRIP,
    debugShowBoundingVolume: tileset.debugShowBoundingVolume,
    castShadows: false,
    receiveShadows: false,
  });

  primitive._drawCommand = command;
};

/**
 * Updates the Gaussian splat primitive for the current frame.
 * This method checks if the primitive needs to be updated based on the current frame state,
 * and if so, it processes the selected tiles, aggregates their attributes,
 * and generates the Gaussian splat texture if necessary.
 * It also handles the sorting of splat indexes and builds the draw command for rendering.
 *
 * @param {FrameState} frameState
 * @private
 */
GaussianSplatPrimitive.prototype.update = function (frameState) {
  const tileset = this._tileset;

  releaseRetiredTextures(this, frameState.frameNumber);

  if (!tileset.show) {
    return;
  }

  if (this._drawCommand) {
    frameState.commandList.push(this._drawCommand);
  }

  if (tileset._modelMatrixChanged) {
    this._dirty = true;
    return;
  }
  const hasRootTransform = defined(this._rootTransform);

  if (frameState.passes.pick === true) {
    return;
  }

  if (this.splitDirection !== tileset.splitDirection) {
    this.splitDirection = tileset.splitDirection;
  }
  const camera = frameState.camera;
  if (!defined(camera)) {
    return;
  }

  if (this._sorterState === GaussianSplatSortingState.IDLE) {
    const selectedTilesChanged =
      tileset._selectedTiles.length !== 0 &&
      haveSelectedTilesChanged(this, tileset._selectedTiles);
    if (tileset._selectedTiles.length === 0) {
      this._selectedTilesStableFrames = 0;
      this._needsSnapshotRebuild = false;
      this._snapshotRebuildStallFrames = 0;
    } else if (selectedTilesChanged) {
      this._selectedTilesStableFrames = 0;
    } else {
      this._selectedTilesStableFrames++;
    }
    if (selectedTilesChanged || this._dirty) {
      this._needsSnapshotRebuild = true;
    }
    const isStable = this._selectedTilesStableFrames >= DEFAULT_STABLE_FRAMES;
    const isBootstrap =
      !defined(this._snapshot) &&
      !defined(this._pendingSnapshot) &&
      !defined(this._drawCommand);
    // This prevents an indefinite wait if selected tiles never settle completely.
    // In practice, this is the upper bound on "wait-for-stability" before forcing
    // a rebuild to avoid visible starvation.
    if (this._needsSnapshotRebuild && tileset._selectedTiles.length !== 0) {
      this._snapshotRebuildStallFrames++;
    } else {
      this._snapshotRebuildStallFrames = 0;
    }
    const allowRebuild =
      isStable ||
      isBootstrap ||
      this._snapshotRebuildStallFrames >= DEFAULT_MAX_SNAPSHOT_STALL_FRAMES;
    const hasPendingWork =
      this._dirty ||
      this._needsSnapshotRebuild ||
      selectedTilesChanged ||
      defined(this._pendingSnapshot) ||
      defined(this._pendingSortPromise) ||
      !defined(this._drawCommand);
    if (
      !hasPendingWork &&
      Matrix4.equals(camera.viewMatrix, this._prevViewMatrix)
    ) {
      return;
    }

    if (
      tileset._selectedTiles.length !== 0 &&
      this._needsSnapshotRebuild &&
      allowRebuild
    ) {
      this._splatDataGeneration++;
      this._activeSort = undefined;
      this._sorterPromise = undefined;
      this._sorterState = GaussianSplatSortingState.IDLE;
      this._pendingSortPromise = undefined;
      this._pendingSort = undefined;
      if (defined(this._pendingSnapshot)) {
        destroySnapshotTextures(this._pendingSnapshot);
      }

      const tiles = tileset._selectedTiles;

      // Rebuild the ENU origin from the current tileset world center so that
      // baked splat positions remain in a numerically small (meter-scale) local
      // frame, regardless of the current tileset.modelMatrix value.
      this._rootTransform = Transforms.eastNorthUpToFixedFrame(
        tileset.boundingSphere.center,
      );
      for (const tile of tiles) {
        GaussianSplatPrimitive.transformTile(tile);
      }

      const totalElements = tiles.reduce(
        (total, tile) => total + tile.content.pointsLength,
        0,
      );
      const aggregateAttributeValues = (
        componentDatatype,
        getAttributeCallback,
        numberOfComponents,
      ) => {
        let aggregate;
        let offset = 0;
        for (const tile of tiles) {
          const content = tile.content;
          const attribute = getAttributeCallback(content);
          const componentsPerAttribute = defined(numberOfComponents)
            ? numberOfComponents
            : AttributeType.getNumberOfComponents(attribute.type);
          const buffer = defined(attribute.typedArray)
            ? attribute.typedArray
            : attribute;
          if (!defined(aggregate)) {
            aggregate = ComponentDatatype.createTypedArray(
              componentDatatype,
              totalElements * componentsPerAttribute,
            );
          }
          aggregate.set(buffer, offset);
          offset += buffer.length;
        }
        return aggregate;
      };

      const aggregateShData = () => {
        // Determine the SH degree from the first tile with SH data so we can
        // pre-allocate the aggregate buffer once, outside the tile loop.
        let coefs = 0;
        for (const tile of tiles) {
          if (tile.content.sphericalHarmonicsDegree > 0) {
            switch (tile.content.sphericalHarmonicsDegree) {
              case 1:
                coefs = 9;
                break;
              case 2:
                coefs = 24;
                break;
              case 3:
                coefs = 45;
                break;
            }
            break;
          }
        }

        if (coefs === 0) {
          return undefined;
        }

        const requiredLength = totalElements * (coefs * (2 / 3));

        // Re-use the class-level scratch buffer when it is already large
        // enough, avoiding a fresh allocation (and eventual GC) every frame.
        if (
          !defined(this._scratchAggregateShBuffer) ||
          this._scratchAggregateShBuffer.length < requiredLength
        ) {
          this._scratchAggregateShBuffer = new Uint32Array(requiredLength);
        }
        const aggregate = this._scratchAggregateShBuffer;

        let offset = 0;
        for (const tile of tiles) {
          const tileShData = tile.content.packedSphericalHarmonicsData;
          if (tile.content.sphericalHarmonicsDegree > 0) {
            aggregate.set(tileShData, offset);
            offset += tileShData.length;
          }
        }

        // Return a correctly-sized view so downstream consumers see the
        // exact element count they expect.
        if (offset < aggregate.length) {
          return aggregate.subarray(0, offset);
        }
        return aggregate;
      };

      const positions = aggregateAttributeValues(
        ComponentDatatype.FLOAT,
        (content) => content.positions,
        3,
      );

      const scales = aggregateAttributeValues(
        ComponentDatatype.FLOAT,
        (content) => content.scales,
        3,
      );

      const rotations = aggregateAttributeValues(
        ComponentDatatype.FLOAT,
        (content) => content.rotations,
        4,
      );

      const colors = aggregateAttributeValues(
        ComponentDatatype.UNSIGNED_BYTE,
        (content) =>
          ModelUtility.getAttributeBySemantic(
            content.gltfPrimitive,
            VertexAttributeSemantic.COLOR,
          ),
      );

      const sphericalHarmonicsDegree =
        tiles[0].content.sphericalHarmonicsDegree;
      const shCoefficientCount =
        sphericalHarmonicsDegree > 0
          ? tiles[0].content.sphericalHarmonicsCoefficientCount
          : 0;
      const shData = aggregateShData();

      this._pendingSnapshot = {
        generation: this._splatDataGeneration,
        positions: positions,
        rotations: rotations,
        scales: scales,
        colors: colors,
        shData: shData,
        sphericalHarmonicsDegree: sphericalHarmonicsDegree,
        shCoefficientCount: shCoefficientCount,
        numSplats: totalElements,
        indexes: undefined,
        gaussianSplatTexture: undefined,
        sphericalHarmonicsTexture: undefined,
        lastTextureWidth: 0,
        lastTextureHeight: 0,
        // Row addressing defaults (updated by processGeneratedSplatTextureData)
        splatRowMask: 0x3ff,
        splatRowShift: 10,
        state: SnapshotState.BUILDING,
      };

      this.selectedTileLength = tileset._selectedTiles.length;
      this._selectedTileSet = new Set(tileset._selectedTiles);
      this._dirty = false;
      this._needsSnapshotRebuild = false;
      this._snapshotRebuildStallFrames = 0;
    }

    if (defined(this._pendingSnapshot)) {
      const pending = this._pendingSnapshot;
      if (pending.state === SnapshotState.BUILDING) {
        GaussianSplatPrimitive.generateSplatTexture(this, frameState, pending);
        return;
      }
      if (pending.state === SnapshotState.TEXTURE_PENDING) {
        return;
      }
      if (
        pending.state === SnapshotState.TEXTURE_READY &&
        !defined(pending.gaussianSplatTexture)
      ) {
        return;
      }

      if (!hasRootTransform) {
        return;
      }

      Matrix4.clone(camera.viewMatrix, this._prevViewMatrix);
      Matrix4.multiply(camera.viewMatrix, this._rootTransform, scratchMatrix4A);

      if (
        pending.state === SnapshotState.TEXTURE_READY &&
        !defined(this._pendingSortPromise)
      ) {
        const requestId = ++this._sortRequestId;
        const dataGeneration = this._splatDataGeneration;
        this._pendingSort = {
          requestId: requestId,
          dataGeneration: dataGeneration,
          expectedCount: pending.numSplats,
          snapshot: pending,
        };
        const sortPromise = GaussianSplatSorter.radixSortIndexes({
          primitive: {
            positions: new Float32Array(pending.positions),
            modelView: Float32Array.from(scratchMatrix4A),
            count: pending.numSplats,
          },
          sortType: "Index",
        });
        if (!defined(sortPromise)) {
          this._pendingSortPromise = undefined;
          this._pendingSort = undefined;
          pending.state = SnapshotState.TEXTURE_READY;
          return;
        }
        this._pendingSortPromise = sortPromise;
        pending.state = SnapshotState.SORTING;
        const pendingSort = this._pendingSort;
        void resolvePendingSnapshotSort(
          this,
          frameState,
          pendingSort,
          sortPromise,
        );
        return;
      }

      if (!defined(this._pendingSortPromise)) {
        if (pending.state === SnapshotState.SORTING) {
          pending.state = SnapshotState.TEXTURE_READY;
        }
        return;
      }
      return;
    }

    if (this._numSplats === 0) {
      return;
    }

    if (!hasRootTransform) {
      return;
    }

    Matrix4.clone(camera.viewMatrix, this._prevViewMatrix);
    Matrix4.multiply(camera.viewMatrix, this._rootTransform, scratchMatrix4A);

    if (!defined(this._sorterPromise)) {
      if (!shouldStartSteadySort(this, frameState)) {
        return;
      }
      const requestId = ++this._sortRequestId;
      const dataGeneration = this._splatDataGeneration;
      const expectedCount = this._numSplats;
      this._activeSort = {
        requestId: requestId,
        dataGeneration: dataGeneration,
        expectedCount: expectedCount,
      };
      const rawPromise = GaussianSplatSorter.radixSortIndexes({
        primitive: {
          positions: new Float32Array(this._positions),
          modelView: Float32Array.from(scratchMatrix4A),
          count: this._numSplats,
        },
        sortType: "Index",
      });
      this._sorterPromise = rawPromise;
      if (defined(rawPromise)) {
        markSteadySortStart(this, frameState);
        const activeSort = this._activeSort;
        this._sorterState = GaussianSplatSortingState.SORTING;
        void resolveSteadySort(this, activeSort, rawPromise);
        return;
      }
    }

    if (!defined(this._sorterPromise)) {
      this._sorterState = GaussianSplatSortingState.WAITING;
      return;
    }
    this._sorterState = GaussianSplatSortingState.SORTING;
    return;
  } else if (this._sorterState === GaussianSplatSortingState.WAITING) {
    if (!defined(this._sorterPromise)) {
      const requestId = ++this._sortRequestId;
      const dataGeneration = this._splatDataGeneration;
      const expectedCount = this._numSplats;
      this._activeSort = {
        requestId: requestId,
        dataGeneration: dataGeneration,
        expectedCount: expectedCount,
      };
      const rawPromise = GaussianSplatSorter.radixSortIndexes({
        primitive: {
          positions: new Float32Array(this._positions),
          modelView: Float32Array.from(scratchMatrix4A),
          count: this._numSplats,
        },
        sortType: "Index",
      });
      this._sorterPromise = rawPromise;
      if (defined(rawPromise)) {
        markSteadySortStart(this, frameState);
        const activeSort = this._activeSort;
        this._sorterState = GaussianSplatSortingState.SORTING;
        void resolveSteadySort(this, activeSort, rawPromise);
        return;
      }
    }
    if (!defined(this._sorterPromise)) {
      this._sorterState = GaussianSplatSortingState.WAITING;
      return;
    }
    this._sorterState = GaussianSplatSortingState.SORTING;
    return;
  } else if (this._sorterState === GaussianSplatSortingState.SORTING) {
    return; //still sorting, wait for next frame
  } else if (this._sorterState === GaussianSplatSortingState.SORTED) {
    //update the draw command if sorted
    GaussianSplatPrimitive.buildGSplatDrawCommand(this, frameState);
    this._sorterState = GaussianSplatSortingState.IDLE; //reset state for next frame
    this._dirty = false;
    this._sorterPromise = undefined; //reset promise for next frame
    this._activeSort = undefined;
  } else if (this._sorterState === GaussianSplatSortingState.ERROR) {
    throw this._sorterError;
  }

  this._dirty = false;
};

export default GaussianSplatPrimitive;
