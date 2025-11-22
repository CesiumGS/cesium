import CesiumMath from "./Math.js";

/**
 * @private
 */
const CylinderGeometryLibrary = {};

/**
 * @private
 */
CylinderGeometryLibrary.computePositions = function (
  length,
  topRadius,
  bottomRadius,
  slices,
  fill,
) {
  const topZ = length * 0.5;
  const bottomZ = -topZ;

  const twoSlice = slices + slices;
  const size = fill ? 2 * twoSlice : twoSlice;
  const positions = new Float64Array(size * 3);
  let i;
  let index = 0;
  let tbIndex = 0;
  const bottomOffset = fill ? twoSlice * 3 : 0;
  const topOffset = fill ? (twoSlice + slices) * 3 : slices * 3;

  for (i = 0; i < slices; i++) {
    const angle = (i / slices) * CesiumMath.TWO_PI;
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    const bottomX = x * bottomRadius;
    const bottomY = y * bottomRadius;
    const topX = x * topRadius;
    const topY = y * topRadius;

    positions[tbIndex + bottomOffset] = bottomX;
    positions[tbIndex + bottomOffset + 1] = bottomY;
    positions[tbIndex + bottomOffset + 2] = bottomZ;

    positions[tbIndex + topOffset] = topX;
    positions[tbIndex + topOffset + 1] = topY;
    positions[tbIndex + topOffset + 2] = topZ;
    tbIndex += 3;
    if (fill) {
      positions[index++] = bottomX;
      positions[index++] = bottomY;
      positions[index++] = bottomZ;
      positions[index++] = topX;
      positions[index++] = topY;
      positions[index++] = topZ;
    }
  }

  return positions;
};
export default CylinderGeometryLibrary;
