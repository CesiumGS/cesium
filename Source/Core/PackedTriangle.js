function PackedTriangles(buffer) {
  this._data = new Uint32Array(buffer);
}

var propertIndexAABB = 1;
var propertyCount = 5;

PackedTriangles.prototype.getAABBX = function (idx) {
  return this._data[idx * propertyCount + propertIndexAABB];
};

export default PackedTriangles;
