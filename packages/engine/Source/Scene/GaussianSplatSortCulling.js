import defined from "../Core/defined.js";

const DEFAULT_CULL_MIN_ALPHA = 24 / 255;
const DEFAULT_SORT_FRUSTUM_MARGIN = 1.05;
const DEFAULT_SORT_DEPTH_BIAS = 0.25;

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

export function gatherSortCandidateIndexes(
  positions,
  modelView,
  count,
  tileset,
  frameState,
  stats,
) {
  const resultStats = defined(stats)
    ? stats
    : {
        inputCount: count,
        activeCount: count,
        culledBehindCount: 0,
        culledFrustumCount: 0,
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
    return undefined;
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
  gatherSortCandidateIndexes: gatherSortCandidateIndexes,
  createSortPositionsForIndexes: createSortPositionsForIndexes,
  remapSortedIndexes: remapSortedIndexes,
};

export default GaussianSplatSortCulling;
