import AxisAlignedBoundingBox from "../Core/AxisAlignedBoundingBox.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import EllipsoidalOccluder from "../Core/EllipsoidalOccluder.js";
import IndexDatatype from "../Core/IndexDatatype.js";
import CesiumMath from "../Core/Math.js";
import Matrix4 from "../Core/Matrix4.js";
import Rectangle from "../Core/Rectangle.js";
import TerrainEncoding from "../Core/TerrainEncoding.js";
import TerrainProvider from "../Core/TerrainProvider.js";
import Transforms from "../Core/Transforms.js";
import OctreeTrianglePicking from "../Core/OctreeTrianglePicking.js";
import WebMercatorProjection from "../Core/WebMercatorProjection.js";
import createTaskProcessorWorker from "./createTaskProcessorWorker.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox";

const maxShort = 32767;

const cartesian3Scratch = new Cartesian3();
const scratchMinimum = new Cartesian3();
const scratchMaximum = new Cartesian3();
const cartographicScratch = new Cartographic();
const toPack = new Cartesian2();

function createPackedTrianglesFromIndices(indices, positions, invTrans) {
  const v0 = new Cartesian3();
  const v1 = new Cartesian3();
  const v2 = new Cartesian3();
  const triangleCount = indices.length / 3;
  let i;
  const triangles = []; // new Float32Array(triangleCount * 6);

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
  const quantizedVertices = parameters.quantizedVertices;
  const quantizedVertexCount = quantizedVertices.length / 3;
  const octEncodedNormals = parameters.octEncodedNormals;
  const edgeVertexCount =
    parameters.westIndices.length +
    parameters.eastIndices.length +
    parameters.southIndices.length +
    parameters.northIndices.length;
  const includeWebMercatorT = parameters.includeWebMercatorT;

  const exaggeration = parameters.exaggeration;
  const exaggerationRelativeHeight = parameters.exaggerationRelativeHeight;
  const hasExaggeration = exaggeration !== 1.0;
  const includeGeodeticSurfaceNormals = hasExaggeration;

  const rectangle = Rectangle.clone(parameters.rectangle);
  const west = rectangle.west;
  const south = rectangle.south;
  const east = rectangle.east;
  const north = rectangle.north;

  const ellipsoid = Ellipsoid.clone(parameters.ellipsoid);

  const minimumHeight = parameters.minimumHeight;
  const maximumHeight = parameters.maximumHeight;

  const center = parameters.relativeToCenter;
  const fromENU = Transforms.eastNorthUpToFixedFrame(center, ellipsoid);
  const toENU = Matrix4.inverseTransformation(fromENU, new Matrix4());

  let southMercatorY;
  let oneOverMercatorHeight;
  if (includeWebMercatorT) {
    southMercatorY = WebMercatorProjection.geodeticLatitudeToMercatorAngle(
      south
    );
    oneOverMercatorHeight =
      1.0 /
      (WebMercatorProjection.geodeticLatitudeToMercatorAngle(north) -
        southMercatorY);
  }

  const uBuffer = quantizedVertices.subarray(0, quantizedVertexCount);
  const vBuffer = quantizedVertices.subarray(
    quantizedVertexCount,
    2 * quantizedVertexCount
  );
  const heightBuffer = quantizedVertices.subarray(
    quantizedVertexCount * 2,
    3 * quantizedVertexCount
  );
  const hasVertexNormals = defined(octEncodedNormals);

  const uvs = new Array(quantizedVertexCount);
  const heights = new Array(quantizedVertexCount);
  const positions = new Array(quantizedVertexCount);
  const webMercatorTs = includeWebMercatorT
    ? new Array(quantizedVertexCount)
    : [];
  const geodeticSurfaceNormals = includeGeodeticSurfaceNormals
    ? new Array(quantizedVertexCount)
    : [];

  const minimum = scratchMinimum;
  minimum.x = Number.POSITIVE_INFINITY;
  minimum.y = Number.POSITIVE_INFINITY;
  minimum.z = Number.POSITIVE_INFINITY;

  const maximum = scratchMaximum;
  maximum.x = Number.NEGATIVE_INFINITY;
  maximum.y = Number.NEGATIVE_INFINITY;
  maximum.z = Number.NEGATIVE_INFINITY;

  let minLongitude = Number.POSITIVE_INFINITY;
  let maxLongitude = Number.NEGATIVE_INFINITY;
  let minLatitude = Number.POSITIVE_INFINITY;
  let maxLatitude = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < quantizedVertexCount; ++i) {
    const rawU = uBuffer[i];
    const rawV = vBuffer[i];

    const u = rawU / maxShort;
    const v = rawV / maxShort;
    const height = CesiumMath.lerp(
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

    const position = ellipsoid.cartographicToCartesian(cartographicScratch);

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

    if (includeGeodeticSurfaceNormals) {
      geodeticSurfaceNormals[i] = ellipsoid.geodeticSurfaceNormal(position);
    }

    Matrix4.multiplyByPoint(toENU, position, cartesian3Scratch);

    Cartesian3.minimumByComponent(cartesian3Scratch, minimum, minimum);
    Cartesian3.maximumByComponent(cartesian3Scratch, maximum, maximum);
  }

  const westIndicesSouthToNorth = copyAndSort(parameters.westIndices, function (
    a,
    b
  ) {
    return uvs[a].y - uvs[b].y;
  });
  const eastIndicesNorthToSouth = copyAndSort(parameters.eastIndices, function (
    a,
    b
  ) {
    return uvs[b].y - uvs[a].y;
  });
  const southIndicesEastToWest = copyAndSort(parameters.southIndices, function (
    a,
    b
  ) {
    return uvs[b].x - uvs[a].x;
  });
  const northIndicesWestToEast = copyAndSort(parameters.northIndices, function (
    a,
    b
  ) {
    return uvs[a].x - uvs[b].x;
  });

  let occludeePointInScaledSpace;
  if (minimumHeight < 0.0) {
    // Horizon culling point needs to be recomputed since the tile is at least partly under the ellipsoid.
    const occluder = new EllipsoidalOccluder(ellipsoid);
    occludeePointInScaledSpace = occluder.computeHorizonCullingPointPossiblyUnderEllipsoid(
      center,
      positions,
      minimumHeight
    );
  }

  const orientedBoundingBox = OrientedBoundingBox.fromRectangle(
    rectangle,
    minimumHeight,
    maximumHeight,
    ellipsoid
  );

  const transform = OrientedBoundingBox.computeTransformation(
    orientedBoundingBox,
    null
  );
  const inverseTransform = Matrix4.inverse(transform, new Matrix4());
  console.timeEnd("setup stuff");
  console.time("making packed triangles");
  const packedTriangles = createPackedTrianglesFromIndices(
    parameters.indices,
    positions,
    inverseTransform
  );
  console.timeEnd("making packed triangles");
  const octree = OctreeTrianglePicking.createOctree(
    packedTriangles,
    inverseTransform,
    transform,
    orientedBoundingBox
  );

  let hMin = minimumHeight;
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

  const aaBox = new AxisAlignedBoundingBox(minimum, maximum, center);
  const encoding = new TerrainEncoding(
    center,
    aaBox,
    hMin,
    maximumHeight,
    fromENU,
    hasVertexNormals,
    includeWebMercatorT,
    includeGeodeticSurfaceNormals,
    exaggeration,
    exaggerationRelativeHeight
  );
  const vertexStride = encoding.stride;
  const size =
    quantizedVertexCount * vertexStride + edgeVertexCount * vertexStride;
  const vertexBuffer = new Float32Array(size);

  let bufferIndex = 0;
  for (let j = 0; j < quantizedVertexCount; ++j) {
    if (hasVertexNormals) {
      const n = j * 2.0;
      toPack.x = octEncodedNormals[n];
      toPack.y = octEncodedNormals[n + 1];
    }

    bufferIndex = encoding.encode(
      vertexBuffer,
      bufferIndex,
      positions[j],
      uvs[j],
      heights[j],
      toPack,
      webMercatorTs[j],
      geodeticSurfaceNormals[j]
    );
  }

  const edgeTriangleCount = Math.max(0, (edgeVertexCount - 4) * 2);
  const indexBufferLength = parameters.indices.length + edgeTriangleCount * 3;
  const indexBuffer = IndexDatatype.createTypedArray(
    quantizedVertexCount + edgeVertexCount,
    indexBufferLength
  );
  indexBuffer.set(parameters.indices, 0);

  const percentage = 0.0001;
  const lonOffset = (maxLongitude - minLongitude) * percentage;
  const latOffset = (maxLatitude - minLatitude) * percentage;
  const westLongitudeOffset = -lonOffset;
  const westLatitudeOffset = 0.0;
  const eastLongitudeOffset = lonOffset;
  const eastLatitudeOffset = 0.0;
  const northLongitudeOffset = 0.0;
  const northLatitudeOffset = latOffset;
  const southLongitudeOffset = 0.0;
  const southLatitudeOffset = -latOffset;

  // Add skirts.
  let vertexBufferIndex = quantizedVertexCount * vertexStride;
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
    occludeePointInScaledSpace: occludeePointInScaledSpace,
    encoding: encoding,
    indexCountWithoutSkirts: parameters.indices.length,
    octree: octree,
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
  let hMin = Number.POSITIVE_INFINITY;

  const north = rectangle.north;
  const south = rectangle.south;
  let east = rectangle.east;
  const west = rectangle.west;

  if (east < west) {
    east += CesiumMath.TWO_PI;
  }

  const length = edgeIndices.length;
  for (let i = 0; i < length; ++i) {
    const index = edgeIndices[i];
    const h = heights[index];
    const uv = uvs[index];

    cartographicScratch.longitude = CesiumMath.lerp(west, east, uv.x);
    cartographicScratch.latitude = CesiumMath.lerp(south, north, uv.y);
    cartographicScratch.height = h - edgeHeight;

    const position = ellipsoid.cartographicToCartesian(
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
  southMercatorY,
  oneOverMercatorHeight,
  longitudeOffset,
  latitudeOffset
) {
  const hasVertexNormals = defined(octEncodedNormals);

  const north = rectangle.north;
  const south = rectangle.south;
  let east = rectangle.east;
  const west = rectangle.west;

  if (east < west) {
    east += CesiumMath.TWO_PI;
  }

  const length = edgeVertices.length;
  for (let i = 0; i < length; ++i) {
    const index = edgeVertices[i];
    const h = heights[index];
    const uv = uvs[index];

    cartographicScratch.longitude =
      CesiumMath.lerp(west, east, uv.x) + longitudeOffset;
    cartographicScratch.latitude =
      CesiumMath.lerp(south, north, uv.y) + latitudeOffset;
    cartographicScratch.height = h - skirtLength;

    const position = ellipsoid.cartographicToCartesian(
      cartographicScratch,
      cartesian3Scratch
    );

    if (hasVertexNormals) {
      const n = index * 2.0;
      toPack.x = octEncodedNormals[n];
      toPack.y = octEncodedNormals[n + 1];
    }

    let webMercatorT;
    if (encoding.hasWebMercatorT) {
      webMercatorT =
        (WebMercatorProjection.geodeticLatitudeToMercatorAngle(
          cartographicScratch.latitude
        ) -
          southMercatorY) *
        oneOverMercatorHeight;
    }

    let geodeticSurfaceNormal;
    if (encoding.hasGeodeticSurfaceNormals) {
      geodeticSurfaceNormal = ellipsoid.geodeticSurfaceNormal(position);
    }

    vertexBufferIndex = encoding.encode(
      vertexBuffer,
      vertexBufferIndex,
      position,
      uv,
      cartographicScratch.height,
      toPack,
      webMercatorT,
      geodeticSurfaceNormal
    );
  }
}

function copyAndSort(typedArray, comparator) {
  let copy;
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
