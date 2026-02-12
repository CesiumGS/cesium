import defined from "../Core/defined.js";

const DEFAULT_CULL_MIN_ALPHA = 24 / 255;
const DEFAULT_SORT_FRUSTUM_MARGIN = 1.05;
const DEFAULT_SORT_DEPTH_BIAS = 0.25;
const DEFAULT_OCTREE_MAX_DEPTH = 8;
const DEFAULT_OCTREE_MAX_SPLATS_PER_NODE = 1000;
const DEFAULT_OCTREE_MIN_SPLATS = 150000;
const DEFAULT_OCTREE_FOV_BIAS = 0.6;
const DEFAULT_OCTREE_RADIUS_SCALE = 1.0;
const OCTREE_EPSILON = 1e-6;

export function getAggregateCullSettings(
  tileset,
  frameState,
  hasRootTransform,
  rootTransform,
) {
  let minAlphaByte = 0;
  const minAlphaRaw = defined(tileset._gaussianSplatCullMinAlpha)
    ? tileset._gaussianSplatCullMinAlpha
    : DEFAULT_CULL_MIN_ALPHA;
  if (minAlphaRaw > 0.0) {
    minAlphaByte =
      minAlphaRaw <= 1.0
        ? Math.ceil(minAlphaRaw * 255.0)
        : Math.ceil(minAlphaRaw);
    minAlphaByte = Math.min(255, Math.max(0, minAlphaByte));
  }

  const minScale = defined(tileset._gaussianSplatCullMinScale)
    ? Math.max(tileset._gaussianSplatCullMinScale, 0.0)
    : 0.0;
  const minPixelRadius = defined(tileset._gaussianSplatCullMinPixelRadius)
    ? Math.max(tileset._gaussianSplatCullMinPixelRadius, 0.0)
    : 0.0;

  let pixelFocalLength = 0.0;
  if (
    minPixelRadius > 0.0 &&
    hasRootTransform &&
    defined(rootTransform) &&
    defined(frameState) &&
    defined(frameState.camera) &&
    defined(frameState.context)
  ) {
    const frustum = frameState.camera.frustum;
    const drawingBufferHeight = frameState.context.drawingBufferHeight;
    let fovy = defined(frustum) ? frustum.fovy : undefined;
    if (
      !defined(fovy) &&
      defined(frustum) &&
      defined(frustum.top) &&
      defined(frustum.near)
    ) {
      fovy = 2.0 * Math.atan(frustum.top / frustum.near);
    }
    if (
      defined(fovy) &&
      defined(drawingBufferHeight) &&
      drawingBufferHeight > 0
    ) {
      pixelFocalLength = (drawingBufferHeight * 0.5) / Math.tan(fovy * 0.5);
    }
  }

  return {
    enabled:
      minAlphaByte > 0 ||
      minScale > 0.0 ||
      (minPixelRadius > 0.0 && pixelFocalLength > 0.0),
    minAlphaByte: minAlphaByte,
    minScale: minScale,
    minPixelRadius: minPixelRadius,
    pixelFocalLength: pixelFocalLength,
  };
}

export function cullSnapshotAttributes(
  positions,
  scales,
  rotations,
  colors,
  shData,
  numSplats,
  shCoefficientCount,
  cullSettings,
  modelView,
) {
  const stats = {
    inputCount: numSplats,
    keptCount: numSplats,
    culledCount: 0,
    culledAlphaCount: 0,
    culledScaleCount: 0,
    culledPixelCount: 0,
    culledBehindCount: 0,
    enabled: defined(cullSettings) && cullSettings.enabled === true,
  };
  if (!defined(cullSettings) || !cullSettings.enabled || numSplats === 0) {
    return {
      positions: positions,
      scales: scales,
      rotations: rotations,
      colors: colors,
      shData: shData,
      numSplats: numSplats,
      stats: stats,
    };
  }

  const minAlphaByte = cullSettings.minAlphaByte;
  const minScale = cullSettings.minScale;
  const minPixelRadius = cullSettings.minPixelRadius;
  const pixelFocalLength = cullSettings.pixelFocalLength;
  const usePixelCull = minPixelRadius > 0.0 && pixelFocalLength > 0.0;
  const shStrideWords =
    defined(shData) && shCoefficientCount > 0
      ? (shCoefficientCount / 3) * 2
      : 0;

  let kept = 0;
  for (let i = 0; i < numSplats; i++) {
    const i3 = i * 3;
    const i4 = i * 4;

    if (minAlphaByte > 0 && colors[i4 + 3] < minAlphaByte) {
      stats.culledAlphaCount++;
      continue;
    }

    const sx = scales[i3];
    const sy = scales[i3 + 1];
    const sz = scales[i3 + 2];
    const maxScale = Math.max(sx, sy, sz);
    if (minScale > 0.0 && maxScale < minScale) {
      stats.culledScaleCount++;
      continue;
    }

    if (usePixelCull) {
      const x = positions[i3];
      const y = positions[i3 + 1];
      const z = positions[i3 + 2];
      const viewZ =
        modelView[2] * x + modelView[6] * y + modelView[10] * z + modelView[14];
      const depth = -viewZ;
      if (depth <= 0.0) {
        stats.culledBehindCount++;
        continue;
      }
      const pixelRadius = (maxScale * pixelFocalLength) / depth;
      if (pixelRadius < minPixelRadius) {
        stats.culledPixelCount++;
        continue;
      }
    }

    kept++;
  }

  stats.keptCount = kept;
  stats.culledCount = numSplats - kept;

  if (kept === numSplats || kept === 0) {
    return {
      positions: positions,
      scales: scales,
      rotations: rotations,
      colors: colors,
      shData: shData,
      numSplats: numSplats,
      stats: stats,
    };
  }

  const nextPositions = new Float32Array(kept * 3);
  const nextScales = new Float32Array(kept * 3);
  const nextRotations = new Float32Array(kept * 4);
  const nextColors = new Uint8Array(kept * 4);
  const nextShData =
    shStrideWords > 0 ? new Uint32Array(kept * shStrideWords) : undefined;

  let out = 0;
  for (let i = 0; i < numSplats; i++) {
    const i3 = i * 3;
    const i4 = i * 4;

    if (minAlphaByte > 0 && colors[i4 + 3] < minAlphaByte) {
      continue;
    }

    const sx = scales[i3];
    const sy = scales[i3 + 1];
    const sz = scales[i3 + 2];
    const maxScale = Math.max(sx, sy, sz);
    if (minScale > 0.0 && maxScale < minScale) {
      continue;
    }

    if (usePixelCull) {
      const x = positions[i3];
      const y = positions[i3 + 1];
      const z = positions[i3 + 2];
      const viewZ =
        modelView[2] * x + modelView[6] * y + modelView[10] * z + modelView[14];
      const depth = -viewZ;
      if (depth <= 0.0) {
        continue;
      }
      const pixelRadius = (maxScale * pixelFocalLength) / depth;
      if (pixelRadius < minPixelRadius) {
        continue;
      }
    }

    const out3 = out * 3;
    const out4 = out * 4;
    nextPositions[out3] = positions[i3];
    nextPositions[out3 + 1] = positions[i3 + 1];
    nextPositions[out3 + 2] = positions[i3 + 2];
    nextScales[out3] = sx;
    nextScales[out3 + 1] = sy;
    nextScales[out3 + 2] = sz;
    nextRotations[out4] = rotations[i4];
    nextRotations[out4 + 1] = rotations[i4 + 1];
    nextRotations[out4 + 2] = rotations[i4 + 2];
    nextRotations[out4 + 3] = rotations[i4 + 3];
    nextColors[out4] = colors[i4];
    nextColors[out4 + 1] = colors[i4 + 1];
    nextColors[out4 + 2] = colors[i4 + 2];
    nextColors[out4 + 3] = colors[i4 + 3];

    if (defined(nextShData)) {
      const inSh = i * shStrideWords;
      const outSh = out * shStrideWords;
      nextShData.set(shData.subarray(inSh, inSh + shStrideWords), outSh);
    }

    out++;
  }

  return {
    positions: nextPositions,
    scales: nextScales,
    rotations: nextRotations,
    colors: nextColors,
    shData: nextShData,
    numSplats: kept,
    stats: stats,
  };
}

function shouldBuildSortOctree(tileset, count) {
  if (!defined(tileset) || tileset._gaussianSplatSortOctree === false) {
    return false;
  }
  const minSplats = defined(tileset._gaussianSplatSortOctreeMinSplats)
    ? Math.max(Math.floor(tileset._gaussianSplatSortOctreeMinSplats), 0)
    : DEFAULT_OCTREE_MIN_SPLATS;
  return count >= minSplats;
}

export function buildSplatOctree(positions, count, tileset) {
  if (!shouldBuildSortOctree(tileset, count)) {
    return undefined;
  }
  if (!defined(positions) || count === 0) {
    return undefined;
  }

  const maxDepth = defined(tileset._gaussianSplatSortOctreeMaxDepth)
    ? Math.max(Math.floor(tileset._gaussianSplatSortOctreeMaxDepth), 1)
    : DEFAULT_OCTREE_MAX_DEPTH;
  const maxSplatsPerNode = defined(
    tileset._gaussianSplatSortOctreeMaxSplatsPerNode,
  )
    ? Math.max(Math.floor(tileset._gaussianSplatSortOctreeMaxSplatsPerNode), 1)
    : DEFAULT_OCTREE_MAX_SPLATS_PER_NODE;

  let minX = positions[0];
  let minY = positions[1];
  let minZ = positions[2];
  let maxX = minX;
  let maxY = minY;
  let maxZ = minZ;
  for (let i = 1; i < count; i++) {
    const base = i * 3;
    const x = positions[base];
    const y = positions[base + 1];
    const z = positions[base + 2];
    if (x < minX) {
      minX = x;
    } else if (x > maxX) {
      maxX = x;
    }
    if (y < minY) {
      minY = y;
    } else if (y > maxY) {
      maxY = y;
    }
    if (z < minZ) {
      minZ = z;
    } else if (z > maxZ) {
      maxZ = z;
    }
  }

  const rootIndexes = new Uint32Array(count);
  for (let i = 0; i < count; i++) {
    rootIndexes[i] = i;
  }

  const nodes = [];
  const stack = [
    {
      minX: minX,
      minY: minY,
      minZ: minZ,
      maxX: maxX,
      maxY: maxY,
      maxZ: maxZ,
      depth: 0,
      indexes: rootIndexes,
    },
  ];

  while (stack.length > 0) {
    const node = stack.pop();
    const dx = node.maxX - node.minX;
    const dy = node.maxY - node.minY;
    const dz = node.maxZ - node.minZ;
    const canSplit =
      node.depth < maxDepth &&
      node.indexes.length > maxSplatsPerNode &&
      (dx > OCTREE_EPSILON || dy > OCTREE_EPSILON || dz > OCTREE_EPSILON);

    if (!canSplit) {
      nodes.push({
        centerX: (node.minX + node.maxX) * 0.5,
        centerY: (node.minY + node.maxY) * 0.5,
        centerZ: (node.minZ + node.maxZ) * 0.5,
        // Match GaussianSplats3D's node-size based thresholding using diagonal length.
        radius: Math.sqrt(dx * dx + dy * dy + dz * dz),
        indexes: node.indexes,
      });
      continue;
    }

    const midX = (node.minX + node.maxX) * 0.5;
    const midY = (node.minY + node.maxY) * 0.5;
    const midZ = (node.minZ + node.maxZ) * 0.5;
    const childCounts = new Uint32Array(8);
    for (let i = 0; i < node.indexes.length; i++) {
      const index = node.indexes[i];
      const base = index * 3;
      const x = positions[base];
      const y = positions[base + 1];
      const z = positions[base + 2];
      const childIndex =
        (x >= midX ? 1 : 0) + (y >= midY ? 2 : 0) + (z >= midZ ? 4 : 0);
      childCounts[childIndex]++;
    }

    const childIndexes = new Array(8);
    const childOffsets = new Uint32Array(8);
    for (let child = 0; child < 8; child++) {
      if (childCounts[child] > 0) {
        childIndexes[child] = new Uint32Array(childCounts[child]);
      }
    }

    for (let i = 0; i < node.indexes.length; i++) {
      const index = node.indexes[i];
      const base = index * 3;
      const x = positions[base];
      const y = positions[base + 1];
      const z = positions[base + 2];
      const childIndex =
        (x >= midX ? 1 : 0) + (y >= midY ? 2 : 0) + (z >= midZ ? 4 : 0);
      const writeOffset = childOffsets[childIndex]++;
      childIndexes[childIndex][writeOffset] = index;
    }

    for (let child = 0; child < 8; child++) {
      const indexes = childIndexes[child];
      if (!defined(indexes) || indexes.length === 0) {
        continue;
      }
      stack.push({
        minX: (child & 1) !== 0 ? midX : node.minX,
        minY: (child & 2) !== 0 ? midY : node.minY,
        minZ: (child & 4) !== 0 ? midZ : node.minZ,
        maxX: (child & 1) !== 0 ? node.maxX : midX,
        maxY: (child & 2) !== 0 ? node.maxY : midY,
        maxZ: (child & 4) !== 0 ? node.maxZ : midZ,
        depth: node.depth + 1,
        indexes: indexes,
      });
    }
  }

  return {
    count: count,
    nodes: nodes,
  };
}

function gatherSortCandidateIndexesFromOctree(
  octree,
  modelView,
  frameState,
  tileset,
  stats,
) {
  const nodes = octree.nodes;
  if (!defined(nodes) || nodes.length === 0) {
    return undefined;
  }

  const frustum =
    defined(frameState) && defined(frameState.camera)
      ? frameState.camera.frustum
      : undefined;
  let fovy = defined(frustum) ? frustum.fovy : undefined;
  if (
    !defined(fovy) &&
    defined(frustum) &&
    defined(frustum.top) &&
    defined(frustum.near) &&
    frustum.near !== 0.0
  ) {
    fovy = 2.0 * Math.atan(frustum.top / frustum.near);
  }
  const aspectRatio = defined(frustum) ? frustum.aspectRatio : undefined;
  if (!defined(fovy) || !defined(aspectRatio) || aspectRatio <= 0.0) {
    return undefined;
  }
  const halfFovy = fovy * 0.5;
  const halfFovx = Math.atan(Math.tan(halfFovy) * aspectRatio);
  const cosHalfFovX = Math.cos(halfFovx);
  const cosHalfFovY = Math.cos(halfFovy);

  const fovBias =
    defined(tileset) && defined(tileset._gaussianSplatSortOctreeFovBias)
      ? tileset._gaussianSplatSortOctreeFovBias
      : DEFAULT_OCTREE_FOV_BIAS;
  const radiusScale =
    defined(tileset) && defined(tileset._gaussianSplatSortOctreeRadiusScale)
      ? tileset._gaussianSplatSortOctreeRadiusScale
      : DEFAULT_OCTREE_RADIUS_SCALE;

  const visibleNodes = [];
  let activeCount = 0;
  let culledBehindCount = 0;
  let culledFrustumCount = 0;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const x =
      modelView[0] * node.centerX +
      modelView[4] * node.centerY +
      modelView[8] * node.centerZ +
      modelView[12];
    const y =
      modelView[1] * node.centerX +
      modelView[5] * node.centerY +
      modelView[9] * node.centerZ +
      modelView[13];
    const z =
      modelView[2] * node.centerX +
      modelView[6] * node.centerY +
      modelView[10] * node.centerZ +
      modelView[14];

    const distance = Math.sqrt(x * x + y * y + z * z);
    if (distance <= OCTREE_EPSILON) {
      activeCount += node.indexes.length;
      visibleNodes.push({
        distance: 0.0,
        indexes: node.indexes,
      });
      continue;
    }

    const invDistance = 1.0 / distance;
    const nx = x * invDistance;
    const ny = y * invDistance;
    const nz = z * invDistance;
    const yzLen = Math.sqrt(ny * ny + nz * nz);
    const xzLen = Math.sqrt(nx * nx + nz * nz);
    const cameraAngleYZDot = yzLen > OCTREE_EPSILON ? -nz / yzLen : 1.0;
    const cameraAngleXZDot = xzLen > OCTREE_EPSILON ? -nz / xzLen : 1.0;
    const outOfFovY = cameraAngleYZDot < cosHalfFovY - fovBias;
    const outOfFovX = cameraAngleXZDot < cosHalfFovX - fovBias;
    if ((outOfFovX || outOfFovY) && distance > node.radius * radiusScale) {
      culledFrustumCount += node.indexes.length;
      continue;
    }

    if (z > node.radius * radiusScale) {
      culledBehindCount += node.indexes.length;
      continue;
    }

    activeCount += node.indexes.length;
    visibleNodes.push({
      distance: distance,
      indexes: node.indexes,
    });
  }

  if (activeCount === 0) {
    stats.inputCount = octree.count;
    stats.activeCount = 0;
    stats.culledBehindCount = culledBehindCount;
    stats.culledFrustumCount = culledFrustumCount;
    stats.octreeNodeCount = nodes.length;
    stats.octree = true;
    return new Uint32Array(0);
  }

  if (activeCount >= octree.count) {
    stats.inputCount = octree.count;
    stats.activeCount = octree.count;
    stats.culledBehindCount = culledBehindCount;
    stats.culledFrustumCount = culledFrustumCount;
    stats.octreeNodeCount = nodes.length;
    stats.octree = true;
    return null;
  }

  visibleNodes.sort((a, b) => a.distance - b.distance);
  const activeIndexes = new Uint32Array(activeCount);
  let offset = 0;
  for (let i = 0; i < visibleNodes.length; i++) {
    const indexes = visibleNodes[i].indexes;
    activeIndexes.set(indexes, offset);
    offset += indexes.length;
  }

  stats.inputCount = octree.count;
  stats.activeCount = activeCount;
  stats.culledBehindCount = culledBehindCount;
  stats.culledFrustumCount = culledFrustumCount;
  stats.octreeNodeCount = nodes.length;
  stats.octree = true;
  return activeIndexes;
}

export function gatherSortCandidateIndexes(
  positions,
  modelView,
  count,
  tileset,
  frameState,
  octree,
  stats,
) {
  const resultStats = defined(stats)
    ? stats
    : {
        inputCount: count,
        activeCount: count,
        culledBehindCount: 0,
        culledFrustumCount: 0,
        octreeNodeCount: 0,
        octree: false,
      };
  if (
    !defined(positions) ||
    count === 0 ||
    (defined(tileset) && tileset._gaussianSplatSortCull === false) ||
    (defined(tileset) && tileset._gaussianSplatSort360 === true)
  ) {
    resultStats.activeCount = count;
    resultStats.culledBehindCount = 0;
    resultStats.culledFrustumCount = 0;
    resultStats.octreeNodeCount = 0;
    resultStats.octree = false;
    return undefined;
  }

  if (defined(octree) && shouldBuildSortOctree(tileset, count)) {
    const octreeIndexes = gatherSortCandidateIndexesFromOctree(
      octree,
      modelView,
      frameState,
      tileset,
      resultStats,
    );
    if (defined(octreeIndexes)) {
      return octreeIndexes;
    }
    if (octreeIndexes === null) {
      return undefined;
    }
  }

  const depthBias =
    defined(tileset) && defined(tileset._gaussianSplatSortDepthBias)
      ? tileset._gaussianSplatSortDepthBias
      : DEFAULT_SORT_DEPTH_BIAS;
  const frustumCullEnabled =
    !defined(tileset) || tileset._gaussianSplatSortFrustumCull !== false;
  const frustumMargin =
    defined(tileset) && defined(tileset._gaussianSplatSortFrustumMargin)
      ? Math.max(tileset._gaussianSplatSortFrustumMargin, 1.0)
      : DEFAULT_SORT_FRUSTUM_MARGIN;
  let tanHalfFovY = 0.0;
  let tanHalfFovX = 0.0;
  let canUseFrustumCull = false;
  if (
    frustumCullEnabled &&
    defined(frameState) &&
    defined(frameState.camera) &&
    defined(frameState.camera.frustum)
  ) {
    const frustum = frameState.camera.frustum;
    let fovy = frustum.fovy;
    if (
      !defined(fovy) &&
      defined(frustum.top) &&
      defined(frustum.near) &&
      frustum.near !== 0.0
    ) {
      fovy = 2.0 * Math.atan(frustum.top / frustum.near);
    }
    const aspectRatio = frustum.aspectRatio;
    if (defined(fovy) && defined(aspectRatio) && aspectRatio > 0.0) {
      tanHalfFovY = Math.tan(fovy * 0.5);
      tanHalfFovX = tanHalfFovY * aspectRatio;
      canUseFrustumCull = true;
    }
  }

  let activeCount = 0;
  let culledBehindCount = 0;
  let culledFrustumCount = 0;
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const x = positions[i3];
    const y = positions[i3 + 1];
    const z = positions[i3 + 2];
    const viewX =
      modelView[0] * x + modelView[4] * y + modelView[8] * z + modelView[12];
    const viewY =
      modelView[1] * x + modelView[5] * y + modelView[9] * z + modelView[13];
    const viewZ =
      modelView[2] * x + modelView[6] * y + modelView[10] * z + modelView[14];
    const biasedDepth = -viewZ + depthBias;
    if (biasedDepth <= 0.0) {
      culledBehindCount++;
      continue;
    }

    if (canUseFrustumCull) {
      const maxX = tanHalfFovX * biasedDepth * frustumMargin;
      const maxY = tanHalfFovY * biasedDepth * frustumMargin;
      if (Math.abs(viewX) > maxX || Math.abs(viewY) > maxY) {
        culledFrustumCount++;
        continue;
      }
    }

    activeCount++;
  }

  resultStats.inputCount = count;
  resultStats.activeCount = activeCount;
  resultStats.culledBehindCount = culledBehindCount;
  resultStats.culledFrustumCount = culledFrustumCount;
  resultStats.octreeNodeCount = 0;
  resultStats.octree = false;

  if (activeCount === count) {
    return undefined;
  }

  const activeIndexes = new Uint32Array(activeCount);
  let offset = 0;
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const x = positions[i3];
    const y = positions[i3 + 1];
    const z = positions[i3 + 2];
    const viewX =
      modelView[0] * x + modelView[4] * y + modelView[8] * z + modelView[12];
    const viewY =
      modelView[1] * x + modelView[5] * y + modelView[9] * z + modelView[13];
    const viewZ =
      modelView[2] * x + modelView[6] * y + modelView[10] * z + modelView[14];
    const biasedDepth = -viewZ + depthBias;
    if (biasedDepth <= 0.0) {
      continue;
    }
    if (canUseFrustumCull) {
      const maxX = tanHalfFovX * biasedDepth * frustumMargin;
      const maxY = tanHalfFovY * biasedDepth * frustumMargin;
      if (Math.abs(viewX) > maxX || Math.abs(viewY) > maxY) {
        continue;
      }
    }
    activeIndexes[offset++] = i;
  }

  return activeIndexes;
}

export function createSortPositionsForIndexes(positions, activeIndexes) {
  if (!defined(activeIndexes)) {
    return new Float32Array(positions);
  }
  const count = activeIndexes.length;
  const subsetPositions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const readBase = activeIndexes[i] * 3;
    const writeBase = i * 3;
    subsetPositions[writeBase] = positions[readBase];
    subsetPositions[writeBase + 1] = positions[readBase + 1];
    subsetPositions[writeBase + 2] = positions[readBase + 2];
  }
  return subsetPositions;
}

export function remapSortedIndexes(sortedData, activeIndexes) {
  if (!defined(activeIndexes)) {
    return sortedData;
  }
  const sortedLen = sortedData.length;
  const remapped = new Uint32Array(sortedLen);
  for (let i = 0; i < sortedLen; i++) {
    remapped[i] = activeIndexes[sortedData[i]];
  }
  return remapped;
}

const GaussianSplatSortCulling = {
  getAggregateCullSettings: getAggregateCullSettings,
  cullSnapshotAttributes: cullSnapshotAttributes,
  buildSplatOctree: buildSplatOctree,
  gatherSortCandidateIndexes: gatherSortCandidateIndexes,
  createSortPositionsForIndexes: createSortPositionsForIndexes,
  remapSortedIndexes: remapSortedIndexes,
};

export default GaussianSplatSortCulling;
