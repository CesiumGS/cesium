function PackedTriangles(buffer) {
  this._data = new Float32Array(buffer);
}

PackedTriangles.prototype.getAABBMinX = function (idx) {
  return this._data[idx * propertyCount + propertyIndexAABBMinX];
};

export default PackedTriangles;

var propertyCount = 6;
var propertyIndexAABBMinX = 0;
var propertyIndexAABBMaxX = 1;
var propertyIndexAABBMinY = 2;
var propertyIndexAABBMaxY = 3;
var propertyIndexAABBMinZ = 4;
var propertyIndexAABBMaxZ = 5;

/**
 *
 * @param {Float32Array} triangles
 * @param {number} idx
 * @return {*} number
 */
export function getAABBMinX(triangles, idx) {
  return triangles[idx * propertyCount + propertyIndexAABBMinX];
}

/**
 *
 * @param {Float32Array} triangles
 * @param {number} idx
 * @return {*} number
 */
export function getAABBMaxX(triangles, idx) {
  return triangles[idx * propertyCount + propertyIndexAABBMaxX];
}

/**
 *
 * @param {Float32Array} triangles
 * @param {number} idx
 * @return {*} number
 */
export function getAABBMinY(triangles, idx) {
  return triangles[idx * propertyCount + propertyIndexAABBMinY];
}

/**
 *
 * @param {Float32Array} triangles
 * @param {number} idx
 * @return {*} number
 */
export function getAABBMaxY(triangles, idx) {
  return triangles[idx * propertyCount + propertyIndexAABBMaxY];
}

/**
 *
 * @param {Float32Array} triangles
 * @param {number} idx
 * @return {*} number
 */
export function getAABBMinZ(triangles, idx) {
  return triangles[idx * propertyCount + propertyIndexAABBMinZ];
}

/**
 *
 * @param {Float32Array} triangles
 * @param {number} idx
 * @return {*} number
 */
export function getAABBMaxZ(triangles, idx) {
  return triangles[idx * propertyCount + propertyIndexAABBMaxZ];
}
