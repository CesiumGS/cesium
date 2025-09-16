/**
 * Methods for handling Gaussian splat data.
 */
import defined from "../Core/defined.js";
import RuntimeError from "../Core/RuntimeError.js";
import GaussianSplatMegatexture from "./GaussianSplatMegatexture.js";

function GaussianSplatData() {}

const buffer = new ArrayBuffer(4);
const floatView = new Float32Array(buffer);
const intView = new Uint32Array(buffer);
//Algorithm from ILM
//https://github.com/mitsuba-renderer/openexr/blob/master/IlmBase/Half/half.cpp
function float32ToFloat16(float32) {
  floatView[0] = float32;
  const f_int = intView[0];

  const sign = (f_int >> 16) & 0x00008000;
  let exp = ((f_int >> 23) & 0x000000ff) - (127 - 15);
  let frac = f_int & 0x007fffff;

  if (exp <= 0) {
    if (exp < -10) {
      return sign;
    }

    frac = frac | 0x00800000;
    const t = 14 - exp;
    const a = (1 << (t - 1)) - 1;
    const b = (frac >> t) & 1;

    frac = (frac + a + b) >> t;
    return sign | frac;
  }

  if (exp === 0xff - (127 - 15)) {
    if (frac === 0) {
      return sign | 0x7c00;
    }
    frac >>= 13;
    return sign | 0x7c00 | frac | (frac === 0 ? 1 : 0);
  }

  frac = frac + 0x00000fff + ((frac >> 13) & 1);
  if (frac & 0x00800000) {
    frac = 0;
    exp += 1;
  }

  if (exp > 30) {
    return sign | 0x7c00;
  }

  return sign | (exp << 10) | (frac >> 13);
}

function baseAndStrideFromSHDegree(degree) {
  switch (degree) {
    case 1:
      return { base: 0, stride: 9 };
    case 2:
      return { base: 9, stride: 24 };
    case 3:
      return { base: 24, stride: 45 };
  }
}

function getShAttributePrefix(attribute) {
  const prefix = attribute.startsWith("KHR_gaussian_splatting:")
    ? "KHR_gaussian_splatting:"
    : "_";
  return `${prefix}SH_DEGREE_`;
}

/**
 * Extracts the spherical harmonic degree and coefficient from the attribute name.
 * @param {string} attribute - The attribute name.
 * @returns {object} An object containing the degree (l) and coefficient (n).
 * @private
 */
function extractSHDegreeAndCoef(attribute) {
  const prefix = getShAttributePrefix(attribute);
  const separator = "_COEF_";

  const lStart = prefix.length;
  const coefIndex = attribute.indexOf(separator, lStart);

  const l = parseInt(attribute.slice(lStart, coefIndex), 10);
  const n = parseInt(attribute.slice(coefIndex + separator.length), 10);

  return { l, n };
}

/**
 * Determine Spherical Harmonics degree from attributes
 * @param {} attribute
 * @returns {object} An object containing the degree (l) and number of coefficients (n).
 */
/* eslint-disable-next-line no-unused-vars */
GaussianSplatData.degreeAndCoefFromAttributes = function (attributes) {
  const prefix = "_SH_DEGREE_";
  const shAttributes = attributes.filter((attr) =>
    attr.name.startsWith(prefix),
  );

  switch (shAttributes.length) {
    default:
    case 0:
      return { l: 0, n: 0 };
    case 3:
      return { l: 1, n: 9 };
    case 8:
      return { l: 2, n: 24 };
    case 15:
      return { l: 3, n: 45 };
  }
};

/**
 * Packs spherical harmonic data into half-precision floats.
 * @param {GaussianSplat3DTileContent} tileContent - The tile content containing the spherical harmonic data.
 * @returns {Uint32Array} - The Float16 packed spherical harmonic data.
 * @private
 */
GaussianSplatData.packSphericalHarmonicsData = function (tileContent) {
  const degree = tileContent.sphericalHarmonicsDegree;
  const coefs = tileContent.sphericalHarmonicsCoefficientCount;
  const totalLength = tileContent.pointsLength * (coefs * (2 / 3)); //3 packs into 2
  const packedData = new Uint32Array(totalLength);

  const shAttributes = tileContent.gltfPrimitive.attributes.filter((attr) =>
    attr.name.includes("SH_DEGREE_"),
  );
  let stride = 0;
  const base = [0, 9, 24];
  switch (degree) {
    case 1:
      stride = 9;
      break;
    case 2:
      stride = 24;
      break;
    case 3:
      stride = 45;
      break;
  }
  shAttributes.sort((a, b) => {
    if (a.name < b.name) {
      return -1;
    }
    if (a.name > b.name) {
      return 1;
    }

    return 0;
  });
  const packedStride = stride * (2 / 3);
  for (let i = 0; i < shAttributes.length; i++) {
    const { l, n } = extractSHDegreeAndCoef(shAttributes[i].name);
    for (let j = 0; j < tileContent.pointsLength; j++) {
      //interleave the data
      const packedBase = (base[l - 1] * 2) / 3;
      const idx = j * packedStride + packedBase + n * 2;
      const src = j * 3;
      packedData[idx] =
        float32ToFloat16(shAttributes[i].typedArray[src]) |
        (float32ToFloat16(shAttributes[i].typedArray[src + 1]) << 16);
      packedData[idx + 1] = float32ToFloat16(
        shAttributes[i].typedArray[src + 2],
      );
    }
  }
  return packedData;
};

GaussianSplatData.makeColorTextureData = function (colorData) {
  const packedData = new Uint32Array(colorData.length / 4);
  for (let i = 0; i < colorData.length; i += 4) {
    const r = colorData[i];
    const g = colorData[i + 1];
    const b = colorData[i + 2];
    const a = colorData[i + 3];
    packedData[i / 4] = (r << 24) | (g << 16) | (b << 8) | a;
  }
  return packedData;
};

GaussianSplatData.makeCovarianceTextureData = function (
  scaleData,
  rotationData,
  count,
) {
  const packedData = new Uint32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const r = rotationData[4 * i + 3];
    const x = rotationData[4 * i + 0];
    const y = rotationData[4 * i + 1];
    const z = rotationData[4 * i + 2];
    const rotMatrix = [
      1.0 - 2.0 * (y * y + z * z),
      2.0 * (x * y + z * r),
      2.0 * (x * z - y * r),
      2.0 * (x * y - z * r),
      1.0 - 2.0 * (x * x + z * z),
      2.0 * (y * z + x * r),
      2.0 * (x * z + y * r),
      2.0 * (y * z - x * r),
      1.0 - 2.0 * (x * x + y * y),
    ];

    const scaleBy2 = [
      scaleData[3 * i + 0] * 2.0,
      scaleData[3 * i + 1] * 2.0,
      scaleData[3 * i + 2] * 2.0,
    ];

    const M = [
      rotMatrix[0] * scaleBy2[0],
      rotMatrix[1] * scaleBy2[0],
      rotMatrix[2] * scaleBy2[0],
      rotMatrix[3] * scaleBy2[1],
      rotMatrix[4] * scaleBy2[1],
      rotMatrix[5] * scaleBy2[1],
      rotMatrix[6] * scaleBy2[2],
      rotMatrix[7] * scaleBy2[2],
      rotMatrix[8] * scaleBy2[2],
    ];

    const sigma = [
      M[0] * M[0] + M[3] * M[3] + M[6] * M[6],
      M[0] * M[1] + M[3] * M[4] + M[6] * M[7],
      M[0] * M[2] + M[3] * M[5] + M[6] * M[8],
      M[1] * M[1] + M[4] * M[4] + M[7] * M[7],
      M[1] * M[2] + M[4] * M[5] + M[7] * M[8],
      M[2] * M[2] + M[5] * M[5] + M[8] * M[8],
    ];

    let covFactor = Number.MIN_SAFE_INTEGER;
    for (let j = 0; j < sigma.length; j++) {
      covFactor = Math.max(covFactor, sigma[j]);
    }
    packedData[4 * i + 0] =
      float32ToFloat16(sigma[0] / covFactor) |
      (float32ToFloat16(sigma[1] / covFactor) << 16);
    packedData[4 * i + 1] =
      float32ToFloat16(sigma[2] / covFactor) |
      (float32ToFloat16(sigma[3] / covFactor) << 16);
    packedData[4 * i + 2] =
      float32ToFloat16(sigma[4] / covFactor) |
      (float32ToFloat16(sigma[5] / covFactor) << 16);
    floatView[0] = covFactor;
    packedData[4 * i + 3] = intView[0];
  }
  return packedData;
};

GaussianSplatData.makeSh1TextureData = function (packedFloatData, count) {
  const { base, stride } = baseAndStrideFromSHDegree(1);
  const sh1Data = new Uint32Array((count * stride) / 2 + 1); // N * 9 / 2 + 1
  let j = 0;
  for (let i = 0; i < packedFloatData.length; i += stride) {
    const idx = i + base * 3;
    sh1Data[j] =
      float32ToFloat16(packedFloatData[idx]) |
      (float32ToFloat16(packedFloatData[idx + 1]) << 16);
    sh1Data[j + 1] =
      float32ToFloat16(packedFloatData[idx + 2]) |
      (float32ToFloat16(packedFloatData[idx + 3]) << 16);
    sh1Data[j + 2] =
      float32ToFloat16(packedFloatData[idx + 4]) |
      (float32ToFloat16(packedFloatData[idx + 5]) << 16);
    sh1Data[j + 3] =
      float32ToFloat16(packedFloatData[idx + 6]) |
      (float32ToFloat16(packedFloatData[idx + 7]) << 16);
    sh1Data[j + 4] = float32ToFloat16(packedFloatData[idx + 8]);
    j += 5;
  }
  return sh1Data;
};

GaussianSplatData.makeSh2TextureData = function (packedFloatData, count) {
  const { base, stride } = baseAndStrideFromSHDegree(2);
  const sh2Data = new Uint32Array((count * stride) / 2 + 1); // N * 15 / 2 + 1
  let j = 0;
  for (let i = 0; i < packedFloatData.length; i += stride) {
    const idx = i + base * 3;
    sh2Data[j] =
      float32ToFloat16(packedFloatData[idx]) |
      (float32ToFloat16(packedFloatData[idx + 1]) << 16);
    sh2Data[j + 1] =
      float32ToFloat16(packedFloatData[idx + 2]) |
      (float32ToFloat16(packedFloatData[idx + 3]) << 16);
    sh2Data[j + 2] =
      float32ToFloat16(packedFloatData[idx + 4]) |
      (float32ToFloat16(packedFloatData[idx + 5]) << 16);
    sh2Data[j + 3] =
      float32ToFloat16(packedFloatData[idx + 6]) |
      (float32ToFloat16(packedFloatData[idx + 7]) << 16);
    sh2Data[j + 4] =
      float32ToFloat16(packedFloatData[idx + 8]) |
      (float32ToFloat16(packedFloatData[idx + 9]) << 16);
    sh2Data[j + 5] =
      float32ToFloat16(packedFloatData[idx + 10]) |
      (float32ToFloat16(packedFloatData[idx + 11]) << 16);
    sh2Data[j + 6] =
      float32ToFloat16(packedFloatData[idx + 12]) |
      (float32ToFloat16(packedFloatData[idx + 13]) << 16);
    sh2Data[j + 7] = float32ToFloat16(packedFloatData[idx + 14]);
    j += 8;
  }
  return sh2Data;
};

GaussianSplatData.makeSh3TextureData = function (packedFloatData, count) {
  const { base, stride } = baseAndStrideFromSHDegree(3);
  const sh3Data = new Uint32Array((count * stride) / 2 + 1); // N * 21 / 2 + 1

  let j = 0;
  for (let i = 0; i < packedFloatData.length; i += stride) {
    const idx = i + base * 3;
    sh3Data[j] =
      float32ToFloat16(packedFloatData[idx]) |
      (float32ToFloat16(packedFloatData[idx + 1]) << 16);
    sh3Data[j + 1] =
      float32ToFloat16(packedFloatData[idx + 2]) |
      (float32ToFloat16(packedFloatData[idx + 3]) << 16);
    sh3Data[j + 2] =
      float32ToFloat16(packedFloatData[idx + 4]) |
      (float32ToFloat16(packedFloatData[idx + 5]) << 16);
    sh3Data[j + 3] =
      float32ToFloat16(packedFloatData[idx + 6]) |
      (float32ToFloat16(packedFloatData[idx + 7]) << 16);
    sh3Data[j + 4] =
      float32ToFloat16(packedFloatData[idx + 8]) |
      (float32ToFloat16(packedFloatData[idx + 9]) << 16);
    sh3Data[j + 5] =
      float32ToFloat16(packedFloatData[idx + 10]) |
      (float32ToFloat16(packedFloatData[idx + 11]) << 16);
    sh3Data[j + 6] =
      float32ToFloat16(packedFloatData[idx + 12]) |
      (float32ToFloat16(packedFloatData[idx + 13]) << 16);
    sh3Data[j + 7] =
      float32ToFloat16(packedFloatData[idx + 14]) |
      (float32ToFloat16(packedFloatData[idx + 15]) << 16);
    sh3Data[j + 8] =
      float32ToFloat16(packedFloatData[idx + 16]) |
      (float32ToFloat16(packedFloatData[idx + 17]) << 16);
    sh3Data[j + 9] =
      float32ToFloat16(packedFloatData[idx + 18]) |
      (float32ToFloat16(packedFloatData[idx + 19]) << 16);
    sh3Data[j + 10] = float32ToFloat16(packedFloatData[idx + 20]);
    j += 11;
  }
  return sh3Data;
};

GaussianSplatData.makePositionMegatexture = function (options, data) {
  const newMegatexture = new GaussianSplatMegatexture({
    width: options.width,
    height: options.height,
    pixelFormat: options.pixelFormat,
    pixelDatatype: options.pixelDatatype,
    sampler: options.sampler,
    context: options.context,
  });

  if (!defined(newMegatexture)) {
    throw new RuntimeError("Failed to create position megatexture.");
  }

  newMegatexture.insertTextureDataMultiple([data]);
  return newMegatexture;
};

GaussianSplatData.makeColorMegatexture = function (options, data) {
  const newMegatexture = new GaussianSplatMegatexture({
    width: options.width,
    height: options.height,
    pixelFormat: options.pixelFormat,
    pixelDatatype: options.pixelDatatype,
    sampler: options.sampler,
    context: options.context,
  });

  if (!defined(newMegatexture)) {
    throw new RuntimeError("Failed to create color megatexture.");
  }

  newMegatexture.insertTextureDataMultiple([
    GaussianSplatData.makeColorTextureData(data),
  ]);
  return newMegatexture;
};

GaussianSplatData.makeCovarianceMegatexture = function (
  options,
  scaleData,
  rotationData,
  count,
) {
  const newMegatexture = new GaussianSplatMegatexture({
    width: options.width,
    height: options.height,
    pixelFormat: options.pixelFormat,
    pixelDatatype: options.pixelDatatype,
    sampler: options.sampler,
    context: options.context,
  });

  if (!defined(newMegatexture)) {
    throw new RuntimeError("Failed to create covariance megatexture.");
  }

  newMegatexture.insertTextureDataMultiple([
    GaussianSplatData.makeCovarianceTextureData(scaleData, rotationData, count),
  ]);
  return newMegatexture;
};

GaussianSplatData.makeSphericalHarmonicsMegatexture = function (
  options,
  tileContent,
  degree,
) {
  const newMegatexture = new GaussianSplatMegatexture({
    width: options.width,
    height: options.height,
    pixelFormat: options.pixelFormat,
    pixelDatatype: options.pixelDatatype,
    sampler: options.sampler,
    context: options.context,
  });

  if (!defined(newMegatexture)) {
    throw new RuntimeError("Failed to create spherical harmonics megatexture.");
  }

  const packedData = GaussianSplatData.packSphericalHarmonicsData(tileContent);

  switch (degree) {
    case 1:
      newMegatexture.insertTextureDataMultiple([
        GaussianSplatData.makeSh1TextureData(packedData, options.count),
      ]);
      break;
    case 2:
      newMegatexture.insertTextureDataMultiple([
        GaussianSplatData.makeSh2TextureData(packedData, options.count),
      ]);
      break;
    case 3:
      newMegatexture.insertTextureDataMultiple([
        GaussianSplatData.makeSh3TextureData(packedData, options.count),
      ]);
      break;
    default:
      throw new RuntimeError("Unsupported spherical harmonics degree.");
  }
};
export default GaussianSplatData;
