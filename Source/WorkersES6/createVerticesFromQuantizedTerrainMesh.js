import AttributeCompression from "../Core/AttributeCompression.js";
import AxisAlignedBoundingBox from "../Core/AxisAlignedBoundingBox.js";
import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import EllipsoidalOccluder from "../Core/EllipsoidalOccluder.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import CesiumMath from "../Core/Math.js";
import Matrix4 from "../Core/Matrix4.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";
import Rectangle from "../Core/Rectangle.js";
import TerrainEncoding from "../Core/TerrainEncoding.js";
import TerrainProvider from "../Core/TerrainProvider.js";
import Transforms from "../Core/Transforms.js";
import OctreeTrianglePicking from "../Core/OctreeTrianglePicking.js";
import WebMercatorProjection from "../Core/WebMercatorProjection.js";
import createTaskProcessorWorker from "./createTaskProcessorWorker.js";

var maxShort = 32767;

var cartesian3Scratch = new Cartesian3();
var scratchMinimum = new Cartesian3();
var scratchMaximum = new Cartesian3();
var cartographicScratch = new Cartographic();
var toPack = new Cartesian2();
var scratchNormal = new Cartesian3();
var scratchToENU = new Matrix4();
var scratchFromENU = new Matrix4();

function createPackedTrianglesFromIndices(indices, positions, invTrans) {
  var v0 = new Cartesian3();
  var v1 = new Cartesian3();
  var v2 = new Cartesian3();
  var triangleCount = indices.length / 3;
  var i;
  var triangles = []; // new Float32Array(triangleCount * 6);

  for (i = 0; i < triangleCount; i++) {
    Matrix4.multiplyByPoint(invTrans, positions[indices[i * 3]], v0);
    Matrix4.multiplyByPoint(invTrans, positions[indices[i * 3 + 1]], v1);
    Matrix4.multiplyByPoint(invTrans, positions[indices[i * 3 + 2]], v2);
    // Get local space AABBs for triangle
    triangles.push(Math.min(v0.x, v1.x, v2.x));
    triangles.push(Math.max(v0.x, v1.x, v2.x));
    triangles.push(Math.min(v0.y, v1.y, v2.y));
    triangles.push(Math.max(v0.y, v1.y, v2.y));
    triangles.push(Math.min(v0.z, v1.z, v2.z));
    triangles.push(Math.max(v0.z, v1.z, v2.z));
  }
  return triangles;
}

function createVerticesFromQuantizedTerrainMesh(
  parameters,
  transferableObjects
) {
  console.time("setup stuff");
  var quantizedVertices = parameters.quantizedVertices;
  var quantizedVertexCount = quantizedVertices.length / 3;
  var octEncodedNormals = parameters.octEncodedNormals;
  var edgeVertexCount =
    parameters.westIndices.length +
    parameters.eastIndices.length +
    parameters.southIndices.length +
    parameters.northIndices.length;
  var includeWebMercatorT = parameters.includeWebMercatorT;

  var rectangle = Rectangle.clone(parameters.rectangle);
  var west = rectangle.west;
  var south = rectangle.south;
  var east = rectangle.east;
  var north = rectangle.north;

  var ellipsoid = Ellipsoid.clone(parameters.ellipsoid);

  var exaggeration = parameters.exaggeration;
  var minimumHeight = parameters.minimumHeight * exaggeration;
  var maximumHeight = parameters.maximumHeight * exaggeration;

  var center = parameters.relativeToCenter;
  var fromENU = Transforms.eastNorthUpToFixedFrame(center, ellipsoid);
  var toENU = Matrix4.inverseTransformation(fromENU, new Matrix4());

  var southMercatorY;
  var oneOverMercatorHeight;
  if (includeWebMercatorT) {
    southMercatorY = WebMercatorProjection.geodeticLatitudeToMercatorAngle(
      south
    );
    oneOverMercatorHeight =
      1.0 /
      (WebMercatorProjection.geodeticLatitudeToMercatorAngle(north) -
        southMercatorY);
  }

  var uBuffer = quantizedVertices.subarray(0, quantizedVertexCount);
  var vBuffer = quantizedVertices.subarray(
    quantizedVertexCount,
    2 * quantizedVertexCount
  );
  var heightBuffer = quantizedVertices.subarray(
    quantizedVertexCount * 2,
    3 * quantizedVertexCount
  );
  var hasVertexNormals = defined(octEncodedNormals);

  var uvs = new Array(quantizedVertexCount);
  var heights = new Array(quantizedVertexCount);
  var positions = new Array(quantizedVertexCount);
  var webMercatorTs = includeWebMercatorT
    ? new Array(quantizedVertexCount)
    : [];

  var minimum = scratchMinimum;
  minimum.x = Number.POSITIVE_INFINITY;
  minimum.y = Number.POSITIVE_INFINITY;
  minimum.z = Number.POSITIVE_INFINITY;

  var maximum = scratchMaximum;
  maximum.x = Number.NEGATIVE_INFINITY;
  maximum.y = Number.NEGATIVE_INFINITY;
  maximum.z = Number.NEGATIVE_INFINITY;

  var minLongitude = Number.POSITIVE_INFINITY;
  var maxLongitude = Number.NEGATIVE_INFINITY;
  var minLatitude = Number.POSITIVE_INFINITY;
  var maxLatitude = Number.NEGATIVE_INFINITY;

  for (var i = 0; i < quantizedVertexCount; ++i) {
    var rawU = uBuffer[i];
    var rawV = vBuffer[i];

    var u = rawU / maxShort;
    var v = rawV / maxShort;
    var height = CesiumMath.lerp(
      minimumHeight,
      maximumHeight,
      heightBuffer[i] / maxShort
    );

    cartographicScratch.longitude = CesiumMath.lerp(west, east, u);
    cartographicScratch.latitude = CesiumMath.lerp(south, north, v);
    cartographicScratch.height = height;

    minLongitude = Math.min(cartographicScratch.longitude, minLongitude);
    maxLongitude = Math.max(cartographicScratch.longitude, maxLongitude);
    minLatitude = Math.min(cartographicScratch.latitude, minLatitude);
    maxLatitude = Math.max(cartographicScratch.latitude, maxLatitude);

    var position = ellipsoid.cartographicToCartesian(cartographicScratch);

    uvs[i] = new Cartesian2(u, v);
    heights[i] = height;
    positions[i] = position;

    if (includeWebMercatorT) {
      webMercatorTs[i] =
        (WebMercatorProjection.geodeticLatitudeToMercatorAngle(
          cartographicScratch.latitude
        ) -
          southMercatorY) *
        oneOverMercatorHeight;
    }

    Matrix4.multiplyByPoint(toENU, position, cartesian3Scratch);

    Cartesian3.minimumByComponent(cartesian3Scratch, minimum, minimum);
    Cartesian3.maximumByComponent(cartesian3Scratch, maximum, maximum);
  }

  var westIndicesSouthToNorth = copyAndSort(parameters.westIndices, function (
    a,
    b
  ) {
    return uvs[a].y - uvs[b].y;
  });
  var eastIndicesNorthToSouth = copyAndSort(parameters.eastIndices, function (
    a,
    b
  ) {
    return uvs[b].y - uvs[a].y;
  });
  var southIndicesEastToWest = copyAndSort(parameters.southIndices, function (
    a,
    b
  ) {
    return uvs[b].x - uvs[a].x;
  });
  var northIndicesWestToEast = copyAndSort(parameters.northIndices, function (
    a,
    b
  ) {
    return uvs[a].x - uvs[b].x;
  });

  var boundingSphere;
  if (exaggeration !== 1.0) {
    // Bounding sphere needs to be recomputed since the tile payload assumes no exaggeration.
    boundingSphere = BoundingSphere.fromPoints(positions);
  }

  var orientedBoundingBox = OrientedBoundingBox.fromRectangle(
    rectangle,
    minimumHeight,
    maximumHeight,
    ellipsoid
  );

  var occludeePointInScaledSpace;
  if (exaggeration !== 1.0 || minimumHeight < 0.0) {
    // Horizon culling point needs to be recomputed since the tile payload assumes no exaggeration.
    var occluder = new EllipsoidalOccluder(ellipsoid);
    occludeePointInScaledSpace = occluder.computeHorizonCullingPointPossiblyUnderEllipsoid(
      center,
      positions,
      minimumHeight
    );
  }

  var transform = OrientedBoundingBox.toTransformation(orientedBoundingBox);
  var inverseTransform = Matrix4.inverse(transform, new Matrix4());
  console.timeEnd("setup stuff");
  console.time("making packed triangles");
  var packedTriangles = createPackedTrianglesFromIndices(
    parameters.indices,
    positions,
    inverseTransform
  );
  console.timeEnd("making packed triangles");
  var packedOctree = OctreeTrianglePicking.createPackedOctree(
    packedTriangles,
    inverseTransform,
    transform,
    orientedBoundingBox
  );

  var hMin = minimumHeight;
  hMin = Math.min(
    hMin,
    findMinMaxSkirts(
      parameters.westIndices,
      parameters.westSkirtHeight,
      heights,
      uvs,
      rectangle,
      ellipsoid,
      toENU,
      minimum,
      maximum
    )
  );
  hMin = Math.min(
    hMin,
    findMinMaxSkirts(
      parameters.southIndices,
      parameters.southSkirtHeight,
      heights,
      uvs,
      rectangle,
      ellipsoid,
      toENU,
      minimum,
      maximum
    )
  );
  hMin = Math.min(
    hMin,
    findMinMaxSkirts(
      parameters.eastIndices,
      parameters.eastSkirtHeight,
      heights,
      uvs,
      rectangle,
      ellipsoid,
      toENU,
      minimum,
      maximum
    )
  );
  hMin = Math.min(
    hMin,
    findMinMaxSkirts(
      parameters.northIndices,
      parameters.northSkirtHeight,
      heights,
      uvs,
      rectangle,
      ellipsoid,
      toENU,
      minimum,
      maximum
    )
  );

  var aaBox = new AxisAlignedBoundingBox(minimum, maximum, center);
  var encoding = new TerrainEncoding(
    aaBox,
    hMin,
    maximumHeight,
    fromENU,
    hasVertexNormals,
    includeWebMercatorT
  );
  var vertexStride = encoding.getStride();
  var size =
    quantizedVertexCount * vertexStride + edgeVertexCount * vertexStride;
  var vertexBuffer = new Float32Array(size);

  var bufferIndex = 0;
  for (var j = 0; j < quantizedVertexCount; ++j) {
    if (hasVertexNormals) {
      var n = j * 2.0;
      toPack.x = octEncodedNormals[n];
      toPack.y = octEncodedNormals[n + 1];

      if (exaggeration !== 1.0) {
        var normal = AttributeCompression.octDecode(
          toPack.x,
          toPack.y,
          scratchNormal
        );
        var fromENUNormal = Transforms.eastNorthUpToFixedFrame(
          positions[j],
          ellipsoid,
          scratchFromENU
        );
        var toENUNormal = Matrix4.inverseTransformation(
          fromENUNormal,
          scratchToENU
        );

        Matrix4.multiplyByPointAsVector(toENUNormal, normal, normal);
        normal.z *= exaggeration;
        Cartesian3.normalize(normal, normal);

        Matrix4.multiplyByPointAsVector(fromENUNormal, normal, normal);
        Cartesian3.normalize(normal, normal);

        AttributeCompression.octEncode(normal, toPack);
      }
    }

    bufferIndex = encoding.encode(
      vertexBuffer,
      bufferIndex,
      positions[j],
      uvs[j],
      heights[j],
      toPack,
      webMercatorTs[j]
    );
  }

  var edgeTriangleCount = Math.max(0, (edgeVertexCount - 4) * 2);
  var indexBufferLength = parameters.indices.length + edgeTriangleCount * 3;
  var indexBuffer = IndexDatatype.createTypedArray(
    quantizedVertexCount + edgeVertexCount,
    indexBufferLength
  );
  indexBuffer.set(parameters.indices, 0);

  var percentage = 0.0001;
  var lonOffset = (maxLongitude - minLongitude) * percentage;
  var latOffset = (maxLatitude - minLatitude) * percentage;
  var westLongitudeOffset = -lonOffset;
  var westLatitudeOffset = 0.0;
  var eastLongitudeOffset = lonOffset;
  var eastLatitudeOffset = 0.0;
  var northLongitudeOffset = 0.0;
  var northLatitudeOffset = latOffset;
  var southLongitudeOffset = 0.0;
  var southLatitudeOffset = -latOffset;

  // Add skirts.
  var vertexBufferIndex = quantizedVertexCount * vertexStride;
  addSkirt(
    vertexBuffer,
    vertexBufferIndex,
    westIndicesSouthToNorth,
    encoding,
    heights,
    uvs,
    octEncodedNormals,
    ellipsoid,
    rectangle,
    parameters.westSkirtHeight,
    exaggeration,
    southMercatorY,
    oneOverMercatorHeight,
    westLongitudeOffset,
    westLatitudeOffset
  );
  vertexBufferIndex += parameters.westIndices.length * vertexStride;
  addSkirt(
    vertexBuffer,
    vertexBufferIndex,
    southIndicesEastToWest,
    encoding,
    heights,
    uvs,
    octEncodedNormals,
    ellipsoid,
    rectangle,
    parameters.southSkirtHeight,
    exaggeration,
    southMercatorY,
    oneOverMercatorHeight,
    southLongitudeOffset,
    southLatitudeOffset
  );
  vertexBufferIndex += parameters.southIndices.length * vertexStride;
  addSkirt(
    vertexBuffer,
    vertexBufferIndex,
    eastIndicesNorthToSouth,
    encoding,
    heights,
    uvs,
    octEncodedNormals,
    ellipsoid,
    rectangle,
    parameters.eastSkirtHeight,
    exaggeration,
    southMercatorY,
    oneOverMercatorHeight,
    eastLongitudeOffset,
    eastLatitudeOffset
  );
  vertexBufferIndex += parameters.eastIndices.length * vertexStride;
  addSkirt(
    vertexBuffer,
    vertexBufferIndex,
    northIndicesWestToEast,
    encoding,
    heights,
    uvs,
    octEncodedNormals,
    ellipsoid,
    rectangle,
    parameters.northSkirtHeight,
    exaggeration,
    southMercatorY,
    oneOverMercatorHeight,
    northLongitudeOffset,
    northLatitudeOffset
  );

  TerrainProvider.addSkirtIndices(
    westIndicesSouthToNorth,
    southIndicesEastToWest,
    eastIndicesNorthToSouth,
    northIndicesWestToEast,
    quantizedVertexCount,
    indexBuffer,
    parameters.indices.length
  );

  transferableObjects.push(vertexBuffer.buffer, indexBuffer.buffer);

  return {
    vertices: vertexBuffer.buffer,
    indices: indexBuffer.buffer,
    westIndicesSouthToNorth: westIndicesSouthToNorth,
    southIndicesEastToWest: southIndicesEastToWest,
    eastIndicesNorthToSouth: eastIndicesNorthToSouth,
    northIndicesWestToEast: northIndicesWestToEast,
    vertexStride: vertexStride,
    center: center,
    minimumHeight: minimumHeight,
    maximumHeight: maximumHeight,
    boundingSphere: boundingSphere,
    orientedBoundingBox: orientedBoundingBox,
    occludeePointInScaledSpace: occludeePointInScaledSpace,
    encoding: encoding,
    indexCountWithoutSkirts: parameters.indices.length,
    packedOctree: packedOctree,
  };
}

function findMinMaxSkirts(
  edgeIndices,
  edgeHeight,
  heights,
  uvs,
  rectangle,
  ellipsoid,
  toENU,
  minimum,
  maximum
) {
  var hMin = Number.POSITIVE_INFINITY;

  var north = rectangle.north;
  var south = rectangle.south;
  var east = rectangle.east;
  var west = rectangle.west;

  if (east < west) {
    east += CesiumMath.TWO_PI;
  }

  var length = edgeIndices.length;
  for (var i = 0; i < length; ++i) {
    var index = edgeIndices[i];
    var h = heights[index];
    var uv = uvs[index];

    cartographicScratch.longitude = CesiumMath.lerp(west, east, uv.x);
    cartographicScratch.latitude = CesiumMath.lerp(south, north, uv.y);
    cartographicScratch.height = h - edgeHeight;

    var position = ellipsoid.cartographicToCartesian(
      cartographicScratch,
      cartesian3Scratch
    );
    Matrix4.multiplyByPoint(toENU, position, position);

    Cartesian3.minimumByComponent(position, minimum, minimum);
    Cartesian3.maximumByComponent(position, maximum, maximum);

    hMin = Math.min(hMin, cartographicScratch.height);
  }
  return hMin;
}

function addSkirt(
  vertexBuffer,
  vertexBufferIndex,
  edgeVertices,
  encoding,
  heights,
  uvs,
  octEncodedNormals,
  ellipsoid,
  rectangle,
  skirtLength,
  exaggeration,
  southMercatorY,
  oneOverMercatorHeight,
  longitudeOffset,
  latitudeOffset
) {
  var hasVertexNormals = defined(octEncodedNormals);

  var north = rectangle.north;
  var south = rectangle.south;
  var east = rectangle.east;
  var west = rectangle.west;

  if (east < west) {
    east += CesiumMath.TWO_PI;
  }

  var length = edgeVertices.length;
  for (var i = 0; i < length; ++i) {
    var index = edgeVertices[i];
    var h = heights[index];
    var uv = uvs[index];

    cartographicScratch.longitude =
      CesiumMath.lerp(west, east, uv.x) + longitudeOffset;
    cartographicScratch.latitude =
      CesiumMath.lerp(south, north, uv.y) + latitudeOffset;
    cartographicScratch.height = h - skirtLength;

    var position = ellipsoid.cartographicToCartesian(
      cartographicScratch,
      cartesian3Scratch
    );

    if (hasVertexNormals) {
      var n = index * 2.0;
      toPack.x = octEncodedNormals[n];
      toPack.y = octEncodedNormals[n + 1];

      if (exaggeration !== 1.0) {
        var normal = AttributeCompression.octDecode(
          toPack.x,
          toPack.y,
          scratchNormal
        );
        var fromENUNormal = Transforms.eastNorthUpToFixedFrame(
          cartesian3Scratch,
          ellipsoid,
          scratchFromENU
        );
        var toENUNormal = Matrix4.inverseTransformation(
          fromENUNormal,
          scratchToENU
        );

        Matrix4.multiplyByPointAsVector(toENUNormal, normal, normal);
        normal.z *= exaggeration;
        Cartesian3.normalize(normal, normal);

        Matrix4.multiplyByPointAsVector(fromENUNormal, normal, normal);
        Cartesian3.normalize(normal, normal);

        AttributeCompression.octEncode(normal, toPack);
      }
    }

    var webMercatorT;
    if (encoding.hasWebMercatorT) {
      webMercatorT =
        (WebMercatorProjection.geodeticLatitudeToMercatorAngle(
          cartographicScratch.latitude
        ) -
          southMercatorY) *
        oneOverMercatorHeight;
    }

    vertexBufferIndex = encoding.encode(
      vertexBuffer,
      vertexBufferIndex,
      position,
      uv,
      cartographicScratch.height,
      toPack,
      webMercatorT
    );
  }
}

function copyAndSort(typedArray, comparator) {
  var copy;
  if (typeof typedArray.slice === "function") {
    copy = typedArray.slice();
    if (typeof copy.sort !== "function") {
      // Sliced typed array isn't sortable, so we can't use it.
      copy = undefined;
    }
  }

  if (!defined(copy)) {
    copy = Array.prototype.slice.call(typedArray);
  }

  copy.sort(comparator);

  return copy;
}
export default createTaskProcessorWorker(
  createVerticesFromQuantizedTerrainMesh
);
