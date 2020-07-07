import AttributeCompression from "../Core/AttributeCompression.js";
import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import EllipsoidalOccluder from "../Core/EllipsoidalOccluder.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import Intersections2D from "../Core/Intersections2D.js";
import CesiumMath from "../Core/Math.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";
import Rectangle from "../Core/Rectangle.js";
import TerrainEncoding from "../Core/TerrainEncoding.js";
import createTaskProcessorWorker from "./createTaskProcessorWorker.js";

var maxShort = 32767;
var halfMaxShort = (maxShort / 2) | 0;

var clipScratch = [];
var clipScratch2 = [];
var verticesScratch = [];
var cartographicScratch = new Cartographic();
var cartesian3Scratch = new Cartesian3();
var uScratch = [];
var vScratch = [];
var heightScratch = [];
var indicesScratch = [];
var normalsScratch = [];
var horizonOcclusionPointScratch = new Cartesian3();
var boundingSphereScratch = new BoundingSphere();
var orientedBoundingBoxScratch = new OrientedBoundingBox();
var decodeTexCoordsScratch = new Cartesian2();
var octEncodedNormalScratch = new Cartesian3();

function upsampleQuantizedTerrainMesh(parameters, transferableObjects) {
  var isEastChild = parameters.isEastChild;
  var isNorthChild = parameters.isNorthChild;

  var minU = isEastChild ? halfMaxShort : 0;
  var maxU = isEastChild ? maxShort : halfMaxShort;
  var minV = isNorthChild ? halfMaxShort : 0;
  var maxV = isNorthChild ? maxShort : halfMaxShort;

  var uBuffer = uScratch;
  var vBuffer = vScratch;
  var heightBuffer = heightScratch;
  var normalBuffer = normalsScratch;

  uBuffer.length = 0;
  vBuffer.length = 0;
  heightBuffer.length = 0;
  normalBuffer.length = 0;

  var indices = indicesScratch;
  indices.length = 0;

  var vertexMap = {};

  var parentVertices = parameters.vertices;
  var parentIndices = parameters.indices;
  parentIndices = parentIndices.subarray(0, parameters.indexCountWithoutSkirts);

  var encoding = TerrainEncoding.clone(parameters.encoding);
  var hasVertexNormals = encoding.hasVertexNormals;
  var exaggeration = parameters.exaggeration;

  var vertexCount = 0;
  var quantizedVertexCount = parameters.vertexCountWithoutSkirts;

  var parentMinimumHeight = parameters.minimumHeight;
  var parentMaximumHeight = parameters.maximumHeight;

  var parentUBuffer = new Array(quantizedVertexCount);
  var parentVBuffer = new Array(quantizedVertexCount);
  var parentHeightBuffer = new Array(quantizedVertexCount);
  var parentNormalBuffer = hasVertexNormals
    ? new Array(quantizedVertexCount * 2)
    : undefined;

  var threshold = 20;
  var height;

  var i, n;
  var u, v;
  for (i = 0, n = 0; i < quantizedVertexCount; ++i, n += 2) {
    var texCoords = encoding.decodeTextureCoordinates(
      parentVertices,
      i,
      decodeTexCoordsScratch
    );
    height = encoding.decodeHeight(parentVertices, i) / exaggeration;

    u = CesiumMath.clamp((texCoords.x * maxShort) | 0, 0, maxShort);
    v = CesiumMath.clamp((texCoords.y * maxShort) | 0, 0, maxShort);
    parentHeightBuffer[i] = CesiumMath.clamp(
      (((height - parentMinimumHeight) /
        (parentMaximumHeight - parentMinimumHeight)) *
        maxShort) |
        0,
      0,
      maxShort
    );

    if (u < threshold) {
      u = 0;
    }

    if (v < threshold) {
      v = 0;
    }

    if (maxShort - u < threshold) {
      u = maxShort;
    }

    if (maxShort - v < threshold) {
      v = maxShort;
    }

    parentUBuffer[i] = u;
    parentVBuffer[i] = v;

    if (hasVertexNormals) {
      var encodedNormal = encoding.getOctEncodedNormal(
        parentVertices,
        i,
        octEncodedNormalScratch
      );
      parentNormalBuffer[n] = encodedNormal.x;
      parentNormalBuffer[n + 1] = encodedNormal.y;
    }

    if (
      ((isEastChild && u >= halfMaxShort) ||
        (!isEastChild && u <= halfMaxShort)) &&
      ((isNorthChild && v >= halfMaxShort) ||
        (!isNorthChild && v <= halfMaxShort))
    ) {
      vertexMap[i] = vertexCount;
      uBuffer.push(u);
      vBuffer.push(v);
      heightBuffer.push(parentHeightBuffer[i]);
      if (hasVertexNormals) {
        normalBuffer.push(parentNormalBuffer[n]);
        normalBuffer.push(parentNormalBuffer[n + 1]);
      }

      ++vertexCount;
    }
  }

  var triangleVertices = [];
  triangleVertices.push(new Vertex());
  triangleVertices.push(new Vertex());
  triangleVertices.push(new Vertex());

  var clippedTriangleVertices = [];
  clippedTriangleVertices.push(new Vertex());
  clippedTriangleVertices.push(new Vertex());
  clippedTriangleVertices.push(new Vertex());

  var clippedIndex;
  var clipped2;

  for (i = 0; i < parentIndices.length; i += 3) {
    var i0 = parentIndices[i];
    var i1 = parentIndices[i + 1];
    var i2 = parentIndices[i + 2];

    var u0 = parentUBuffer[i0];
    var u1 = parentUBuffer[i1];
    var u2 = parentUBuffer[i2];

    triangleVertices[0].initializeIndexed(
      parentUBuffer,
      parentVBuffer,
      parentHeightBuffer,
      parentNormalBuffer,
      i0
    );
    triangleVertices[1].initializeIndexed(
      parentUBuffer,
      parentVBuffer,
      parentHeightBuffer,
      parentNormalBuffer,
      i1
    );
    triangleVertices[2].initializeIndexed(
      parentUBuffer,
      parentVBuffer,
      parentHeightBuffer,
      parentNormalBuffer,
      i2
    );

    // Clip triangle on the east-west boundary.
    var clipped = Intersections2D.clipTriangleAtAxisAlignedThreshold(
      halfMaxShort,
      isEastChild,
      u0,
      u1,
      u2,
      clipScratch
    );

    // Get the first clipped triangle, if any.
    clippedIndex = 0;

    if (clippedIndex >= clipped.length) {
      continue;
    }
    clippedIndex = clippedTriangleVertices[0].initializeFromClipResult(
      clipped,
      clippedIndex,
      triangleVertices
    );

    if (clippedIndex >= clipped.length) {
      continue;
    }
    clippedIndex = clippedTriangleVertices[1].initializeFromClipResult(
      clipped,
      clippedIndex,
      triangleVertices
    );

    if (clippedIndex >= clipped.length) {
      continue;
    }
    clippedIndex = clippedTriangleVertices[2].initializeFromClipResult(
      clipped,
      clippedIndex,
      triangleVertices
    );

    // Clip the triangle against the North-south boundary.
    clipped2 = Intersections2D.clipTriangleAtAxisAlignedThreshold(
      halfMaxShort,
      isNorthChild,
      clippedTriangleVertices[0].getV(),
      clippedTriangleVertices[1].getV(),
      clippedTriangleVertices[2].getV(),
      clipScratch2
    );
    addClippedPolygon(
      uBuffer,
      vBuffer,
      heightBuffer,
      normalBuffer,
      indices,
      vertexMap,
      clipped2,
      clippedTriangleVertices,
      hasVertexNormals
    );

    // If there's another vertex in the original clipped result,
    // it forms a second triangle.  Clip it as well.
    if (clippedIndex < clipped.length) {
      clippedTriangleVertices[2].clone(clippedTriangleVertices[1]);
      clippedTriangleVertices[2].initializeFromClipResult(
        clipped,
        clippedIndex,
        triangleVertices
      );

      clipped2 = Intersections2D.clipTriangleAtAxisAlignedThreshold(
        halfMaxShort,
        isNorthChild,
        clippedTriangleVertices[0].getV(),
        clippedTriangleVertices[1].getV(),
        clippedTriangleVertices[2].getV(),
        clipScratch2
      );
      addClippedPolygon(
        uBuffer,
        vBuffer,
        heightBuffer,
        normalBuffer,
        indices,
        vertexMap,
        clipped2,
        clippedTriangleVertices,
        hasVertexNormals
      );
    }
  }

  var uOffset = isEastChild ? -maxShort : 0;
  var vOffset = isNorthChild ? -maxShort : 0;

  var westIndices = [];
  var southIndices = [];
  var eastIndices = [];
  var northIndices = [];

  var minimumHeight = Number.MAX_VALUE;
  var maximumHeight = -minimumHeight;

  var cartesianVertices = verticesScratch;
  cartesianVertices.length = 0;

  var ellipsoid = Ellipsoid.clone(parameters.ellipsoid);
  var rectangle = Rectangle.clone(parameters.childRectangle);

  var north = rectangle.north;
  var south = rectangle.south;
  var east = rectangle.east;
  var west = rectangle.west;

  if (east < west) {
    east += CesiumMath.TWO_PI;
  }

  for (i = 0; i < uBuffer.length; ++i) {
    u = Math.round(uBuffer[i]);
    if (u <= minU) {
      westIndices.push(i);
      u = 0;
    } else if (u >= maxU) {
      eastIndices.push(i);
      u = maxShort;
    } else {
      u = u * 2 + uOffset;
    }

    uBuffer[i] = u;

    v = Math.round(vBuffer[i]);
    if (v <= minV) {
      southIndices.push(i);
      v = 0;
    } else if (v >= maxV) {
      northIndices.push(i);
      v = maxShort;
    } else {
      v = v * 2 + vOffset;
    }

    vBuffer[i] = v;

    height = CesiumMath.lerp(
      parentMinimumHeight,
      parentMaximumHeight,
      heightBuffer[i] / maxShort
    );
    if (height < minimumHeight) {
      minimumHeight = height;
    }
    if (height > maximumHeight) {
      maximumHeight = height;
    }

    heightBuffer[i] = height;

    cartographicScratch.longitude = CesiumMath.lerp(west, east, u / maxShort);
    cartographicScratch.latitude = CesiumMath.lerp(south, north, v / maxShort);
    cartographicScratch.height = height;

    ellipsoid.cartographicToCartesian(cartographicScratch, cartesian3Scratch);

    cartesianVertices.push(cartesian3Scratch.x);
    cartesianVertices.push(cartesian3Scratch.y);
    cartesianVertices.push(cartesian3Scratch.z);
  }

  var boundingSphere = BoundingSphere.fromVertices(
    cartesianVertices,
    Cartesian3.ZERO,
    3,
    boundingSphereScratch
  );
  var orientedBoundingBox = OrientedBoundingBox.fromRectangle(
    rectangle,
    minimumHeight,
    maximumHeight,
    ellipsoid,
    orientedBoundingBoxScratch
  );

  var occluder = new EllipsoidalOccluder(ellipsoid);
  var horizonOcclusionPoint = occluder.computeHorizonCullingPointFromVerticesPossiblyUnderEllipsoid(
    boundingSphere.center,
    cartesianVertices,
    3,
    boundingSphere.center,
    minimumHeight,
    horizonOcclusionPointScratch
  );

  var heightRange = maximumHeight - minimumHeight;

  var vertices = new Uint16Array(
    uBuffer.length + vBuffer.length + heightBuffer.length
  );

  for (i = 0; i < uBuffer.length; ++i) {
    vertices[i] = uBuffer[i];
  }

  var start = uBuffer.length;

  for (i = 0; i < vBuffer.length; ++i) {
    vertices[start + i] = vBuffer[i];
  }

  start += vBuffer.length;

  for (i = 0; i < heightBuffer.length; ++i) {
    vertices[start + i] =
      (maxShort * (heightBuffer[i] - minimumHeight)) / heightRange;
  }

  var indicesTypedArray = IndexDatatype.createTypedArray(
    uBuffer.length,
    indices
  );

  var encodedNormals;
  if (hasVertexNormals) {
    var normalArray = new Uint8Array(normalBuffer);
    transferableObjects.push(
      vertices.buffer,
      indicesTypedArray.buffer,
      normalArray.buffer
    );
    encodedNormals = normalArray.buffer;
  } else {
    transferableObjects.push(vertices.buffer, indicesTypedArray.buffer);
  }

  return {
    vertices: vertices.buffer,
    encodedNormals: encodedNormals,
    indices: indicesTypedArray.buffer,
    minimumHeight: minimumHeight,
    maximumHeight: maximumHeight,
    westIndices: westIndices,
    southIndices: southIndices,
    eastIndices: eastIndices,
    northIndices: northIndices,
    boundingSphere: boundingSphere,
    orientedBoundingBox: orientedBoundingBox,
    horizonOcclusionPoint: horizonOcclusionPoint,
  };
}

function Vertex() {
  this.vertexBuffer = undefined;
  this.index = undefined;
  this.first = undefined;
  this.second = undefined;
  this.ratio = undefined;
}

Vertex.prototype.clone = function (result) {
  if (!defined(result)) {
    result = new Vertex();
  }

  result.uBuffer = this.uBuffer;
  result.vBuffer = this.vBuffer;
  result.heightBuffer = this.heightBuffer;
  result.normalBuffer = this.normalBuffer;
  result.index = this.index;
  result.first = this.first;
  result.second = this.second;
  result.ratio = this.ratio;

  return result;
};

Vertex.prototype.initializeIndexed = function (
  uBuffer,
  vBuffer,
  heightBuffer,
  normalBuffer,
  index
) {
  this.uBuffer = uBuffer;
  this.vBuffer = vBuffer;
  this.heightBuffer = heightBuffer;
  this.normalBuffer = normalBuffer;
  this.index = index;
  this.first = undefined;
  this.second = undefined;
  this.ratio = undefined;
};

Vertex.prototype.initializeFromClipResult = function (
  clipResult,
  index,
  vertices
) {
  var nextIndex = index + 1;

  if (clipResult[index] !== -1) {
    vertices[clipResult[index]].clone(this);
  } else {
    this.vertexBuffer = undefined;
    this.index = undefined;
    this.first = vertices[clipResult[nextIndex]];
    ++nextIndex;
    this.second = vertices[clipResult[nextIndex]];
    ++nextIndex;
    this.ratio = clipResult[nextIndex];
    ++nextIndex;
  }

  return nextIndex;
};

Vertex.prototype.getKey = function () {
  if (this.isIndexed()) {
    return this.index;
  }
  return JSON.stringify({
    first: this.first.getKey(),
    second: this.second.getKey(),
    ratio: this.ratio,
  });
};

Vertex.prototype.isIndexed = function () {
  return defined(this.index);
};

Vertex.prototype.getH = function () {
  if (defined(this.index)) {
    return this.heightBuffer[this.index];
  }
  return CesiumMath.lerp(this.first.getH(), this.second.getH(), this.ratio);
};

Vertex.prototype.getU = function () {
  if (defined(this.index)) {
    return this.uBuffer[this.index];
  }
  return CesiumMath.lerp(this.first.getU(), this.second.getU(), this.ratio);
};

Vertex.prototype.getV = function () {
  if (defined(this.index)) {
    return this.vBuffer[this.index];
  }
  return CesiumMath.lerp(this.first.getV(), this.second.getV(), this.ratio);
};

var encodedScratch = new Cartesian2();
// An upsampled triangle may be clipped twice before it is assigned an index
// In this case, we need a buffer to handle the recursion of getNormalX() and getNormalY().
var depth = -1;
var cartesianScratch1 = [new Cartesian3(), new Cartesian3()];
var cartesianScratch2 = [new Cartesian3(), new Cartesian3()];
function lerpOctEncodedNormal(vertex, result) {
  ++depth;

  var first = cartesianScratch1[depth];
  var second = cartesianScratch2[depth];

  first = AttributeCompression.octDecode(
    vertex.first.getNormalX(),
    vertex.first.getNormalY(),
    first
  );
  second = AttributeCompression.octDecode(
    vertex.second.getNormalX(),
    vertex.second.getNormalY(),
    second
  );
  cartesian3Scratch = Cartesian3.lerp(
    first,
    second,
    vertex.ratio,
    cartesian3Scratch
  );
  Cartesian3.normalize(cartesian3Scratch, cartesian3Scratch);

  AttributeCompression.octEncode(cartesian3Scratch, result);

  --depth;

  return result;
}

Vertex.prototype.getNormalX = function () {
  if (defined(this.index)) {
    return this.normalBuffer[this.index * 2];
  }

  encodedScratch = lerpOctEncodedNormal(this, encodedScratch);
  return encodedScratch.x;
};

Vertex.prototype.getNormalY = function () {
  if (defined(this.index)) {
    return this.normalBuffer[this.index * 2 + 1];
  }

  encodedScratch = lerpOctEncodedNormal(this, encodedScratch);
  return encodedScratch.y;
};

var polygonVertices = [];
polygonVertices.push(new Vertex());
polygonVertices.push(new Vertex());
polygonVertices.push(new Vertex());
polygonVertices.push(new Vertex());

function addClippedPolygon(
  uBuffer,
  vBuffer,
  heightBuffer,
  normalBuffer,
  indices,
  vertexMap,
  clipped,
  triangleVertices,
  hasVertexNormals
) {
  if (clipped.length === 0) {
    return;
  }

  var numVertices = 0;
  var clippedIndex = 0;
  while (clippedIndex < clipped.length) {
    clippedIndex = polygonVertices[numVertices++].initializeFromClipResult(
      clipped,
      clippedIndex,
      triangleVertices
    );
  }

  for (var i = 0; i < numVertices; ++i) {
    var polygonVertex = polygonVertices[i];
    if (!polygonVertex.isIndexed()) {
      var key = polygonVertex.getKey();
      if (defined(vertexMap[key])) {
        polygonVertex.newIndex = vertexMap[key];
      } else {
        var newIndex = uBuffer.length;
        uBuffer.push(polygonVertex.getU());
        vBuffer.push(polygonVertex.getV());
        heightBuffer.push(polygonVertex.getH());
        if (hasVertexNormals) {
          normalBuffer.push(polygonVertex.getNormalX());
          normalBuffer.push(polygonVertex.getNormalY());
        }
        polygonVertex.newIndex = newIndex;
        vertexMap[key] = newIndex;
      }
    } else {
      polygonVertex.newIndex = vertexMap[polygonVertex.index];
      polygonVertex.uBuffer = uBuffer;
      polygonVertex.vBuffer = vBuffer;
      polygonVertex.heightBuffer = heightBuffer;
      if (hasVertexNormals) {
        polygonVertex.normalBuffer = normalBuffer;
      }
    }
  }

  if (numVertices === 3) {
    // A triangle.
    indices.push(polygonVertices[0].newIndex);
    indices.push(polygonVertices[1].newIndex);
    indices.push(polygonVertices[2].newIndex);
  } else if (numVertices === 4) {
    // A quad - two triangles.
    indices.push(polygonVertices[0].newIndex);
    indices.push(polygonVertices[1].newIndex);
    indices.push(polygonVertices[2].newIndex);

    indices.push(polygonVertices[0].newIndex);
    indices.push(polygonVertices[2].newIndex);
    indices.push(polygonVertices[3].newIndex);
  }
}
export default createTaskProcessorWorker(upsampleQuantizedTerrainMesh);
