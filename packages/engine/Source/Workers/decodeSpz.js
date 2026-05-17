import createTaskProcessorWorker from "./createTaskProcessorWorker.js";
import defined from "../Core/defined.js";
import { loadSpz } from "@spz-loader/core";

function transferTypedArray(transferableObjects, typedArray) {
  if (defined(typedArray)) {
    transferableObjects.push(typedArray.buffer);
  }
}

const scratchFloatBuffer = new ArrayBuffer(4);
const scratchFloatView = new Float32Array(scratchFloatBuffer);
const scratchIntView = new Uint32Array(scratchFloatBuffer);

function float32ToFloat16(float32) {
  scratchFloatView[0] = float32;
  const bits = scratchIntView[0];

  const sign = (bits >> 31) & 0x1;
  const exponent = (bits >> 23) & 0xff;
  const mantissa = bits & 0x7fffff;

  if (exponent === 0xff) {
    return (sign << 15) | (0x1f << 10) | (mantissa ? 0x200 : 0);
  }

  if (exponent === 0) {
    return sign << 15;
  }

  const newExponent = exponent - 127 + 15;
  if (newExponent >= 31) {
    return (sign << 15) | (0x1f << 10);
  }

  if (newExponent <= 0) {
    return sign << 15;
  }

  return (sign << 15) | (newExponent << 10) | (mantissa >>> 13);
}

function getSphericalHarmonicsCoefficientCount(degree) {
  switch (degree) {
    case 1:
      return 9;
    case 2:
      return 24;
    case 3:
      return 45;
    default:
      return 0;
  }
}

function packSphericalHarmonicsData(gcloud) {
  const sphericalHarmonics = gcloud.sh;
  const degree = gcloud.shDegree;
  const coefs = getSphericalHarmonicsCoefficientCount(degree);
  if (!defined(sphericalHarmonics) || coefs === 0) {
    return undefined;
  }

  const pointsLength = gcloud.numPoints ?? gcloud.positions.length / 3;
  const packedStride = (coefs / 3) * 2;
  const packedData = new Uint32Array(pointsLength * packedStride);
  const base = [0, 9, 24];

  for (let point = 0; point < pointsLength; point++) {
    const sourcePointOffset = point * coefs;
    const packedPointOffset = point * packedStride;

    for (let l = 1; l <= degree; l++) {
      const coefficientCount = l * 2 + 1;
      const sourceBase = base[l - 1];
      const packedBase = (sourceBase / 3) * 2;

      for (let n = 0; n < coefficientCount; n++) {
        const sourceIndex = sourcePointOffset + sourceBase + n * 3;
        const packedIndex = packedPointOffset + packedBase + n * 2;
        packedData[packedIndex] =
          float32ToFloat16(sphericalHarmonics[sourceIndex]) |
          (float32ToFloat16(sphericalHarmonics[sourceIndex + 1]) << 16);
        packedData[packedIndex + 1] = float32ToFloat16(
          sphericalHarmonics[sourceIndex + 2],
        );
      }
    }
  }

  return packedData;
}

async function decodeSpz(parameters, transferableObjects) {
  const gcloud = await loadSpz(parameters.buffer, {
    unpackOptions: { coordinateSystem: "UNSPECIFIED" },
  });

  const packedSphericalHarmonicsData = packSphericalHarmonicsData(gcloud);
  if (defined(packedSphericalHarmonicsData)) {
    gcloud.packedSphericalHarmonicsData = packedSphericalHarmonicsData;
    gcloud.sphericalHarmonicsDegree = gcloud.shDegree;
    gcloud.sphericalHarmonicsCoefficientCount =
      getSphericalHarmonicsCoefficientCount(gcloud.shDegree);
    gcloud.sh = undefined;
  }

  transferTypedArray(transferableObjects, gcloud.positions);
  transferTypedArray(transferableObjects, gcloud.scales);
  transferTypedArray(transferableObjects, gcloud.rotations);
  transferTypedArray(transferableObjects, gcloud.alphas);
  transferTypedArray(transferableObjects, gcloud.colors);
  transferTypedArray(transferableObjects, gcloud.sh);
  transferTypedArray(transferableObjects, gcloud.packedSphericalHarmonicsData);

  return gcloud;
}

export default createTaskProcessorWorker(decodeSpz);
