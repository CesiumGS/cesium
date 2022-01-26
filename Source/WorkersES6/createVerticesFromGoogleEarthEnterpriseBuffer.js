import AxisAlignedBoundingBox from "../Core/AxisAlignedBoundingBox.js";
import BoundingSphere from "../Core/BoundingSphere.js";
import Cartesian2 from "../Core/Cartesian2.js";
import Cartesian3 from "../Core/Cartesian3.js";
import Cartographic from "../Core/Cartographic.js";
import defaultValue from "../Core/defaultValue.js";
import defined from "../Core/defined.js";
import Ellipsoid from "../Core/Ellipsoid.js";
import EllipsoidalOccluder from "../Core/EllipsoidalOccluder.js";
import CesiumMath from "../Core/Math.js";
import Matrix4 from "../Core/Matrix4.js";
import OrientedBoundingBox from "../Core/OrientedBoundingBox.js";
import Rectangle from "../Core/Rectangle.js";
import RuntimeError from "../Core/RuntimeError.js";
import TerrainEncoding from "../Core/TerrainEncoding.js";
import Transforms from "../Core/Transforms.js";
import WebMercatorProjection from "../Core/WebMercatorProjection.js";
import createTaskProcessorWorker from "./createTaskProcessorWorker.js";

const sizeOfUint16 = Uint16Array.BYTES_PER_ELEMENT;
const sizeOfInt32 = Int32Array.BYTES_PER_ELEMENT;
const sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;
const sizeOfFloat = Float32Array.BYTES_PER_ELEMENT;
const sizeOfDouble = Float64Array.BYTES_PER_ELEMENT;

function indexOfEpsilon(arr, elem, elemType) {
  elemType = defaultValue(elemType, CesiumMath);
  const count = arr.length;
  for (let i = 0; i < count; ++i) {
    if (elemType.equalsEpsilon(arr[i], elem, CesiumMath.EPSILON12)) {
      return i;
    }
  }

  return -1;
}

function createVerticesFromGoogleEarthEnterpriseBuffer(
  parameters,
  transferableObjects
) {
  parameters.ellipsoid = Ellipsoid.clone(parameters.ellipsoid);
  parameters.rectangle = Rectangle.clone(parameters.rectangle);

  const statistics = processBuffer(
    parameters.buffer,
    parameters.relativeToCenter,
    parameters.ellipsoid,
    parameters.rectangle,
    parameters.nativeRectangle,
    parameters.exaggeration,
    parameters.exaggerationRelativeHeight,
    parameters.skirtHeight,
    parameters.includeWebMercatorT,
    parameters.negativeAltitudeExponentBias,
    parameters.negativeElevationThreshold
  );
  const vertices = statistics.vertices;
  transferableObjects.push(vertices.buffer);
  const indices = statistics.indices;
  transferableObjects.push(indices.buffer);

  return {
    vertices: vertices.buffer,
    indices: indices.buffer,
    numberOfAttributes: statistics.encoding.stride,
    minimumHeight: statistics.minimumHeight,
    maximumHeight: statistics.maximumHeight,
    boundingSphere3D: statistics.boundingSphere3D,
    orientedBoundingBox: statistics.orientedBoundingBox,
    occludeePointInScaledSpace: statistics.occludeePointInScaledSpace,
    encoding: statistics.encoding,
    vertexCountWithoutSkirts: statistics.vertexCountWithoutSkirts,
    indexCountWithoutSkirts: statistics.indexCountWithoutSkirts,
    westIndicesSouthToNorth: statistics.westIndicesSouthToNorth,
    southIndicesEastToWest: statistics.southIndicesEastToWest,
    eastIndicesNorthToSouth: statistics.eastIndicesNorthToSouth,
    northIndicesWestToEast: statistics.northIndicesWestToEast,
  };
}

const scratchCartographic = new Cartographic();
const scratchCartesian = new Cartesian3();
const minimumScratch = new Cartesian3();
const maximumScratch = new Cartesian3();
const matrix4Scratch = new Matrix4();

function processBuffer(
  buffer,
  relativeToCenter,
  ellipsoid,
  rectangle,
  nativeRectangle,
  exaggeration,
  exaggerationRelativeHeight,
  skirtHeight,
  includeWebMercatorT,
  negativeAltitudeExponentBias,
  negativeElevationThreshold
) {
  let geographicWest;
  let geographicSouth;
  let geographicEast;
  let geographicNorth;
  let rectangleWidth, rectangleHeight;

  if (!defined(rectangle)) {
    geographicWest = CesiumMath.toRadians(nativeRectangle.west);
    geographicSouth = CesiumMath.toRadians(nativeRectangle.south);
    geographicEast = CesiumMath.toRadians(nativeRectangle.east);
    geographicNorth = CesiumMath.toRadians(nativeRectangle.north);
    rectangleWidth = CesiumMath.toRadians(rectangle.width);
    rectangleHeight = CesiumMath.toRadians(rectangle.height);
  } else {
    geographicWest = rectangle.west;
    geographicSouth = rectangle.south;
    geographicEast = rectangle.east;
    geographicNorth = rectangle.north;
    rectangleWidth = rectangle.width;
    rectangleHeight = rectangle.height;
  }

  // Keep track of quad borders so we can remove duplicates around the borders
  const quadBorderLatitudes = [geographicSouth, geographicNorth];
  const quadBorderLongitudes = [geographicWest, geographicEast];

  const fromENU = Transforms.eastNorthUpToFixedFrame(
    relativeToCenter,
    ellipsoid
  );
  const toENU = Matrix4.inverseTransformation(fromENU, matrix4Scratch);

  let southMercatorY;
  let oneOverMercatorHeight;
  if (includeWebMercatorT) {
    southMercatorY = WebMercatorProjection.geodeticLatitudeToMercatorAngle(
      geographicSouth
    );
    oneOverMercatorHeight =
      1.0 /
      (WebMercatorProjection.geodeticLatitudeToMercatorAngle(geographicNorth) -
        southMercatorY);
  }

  const hasExaggeration = exaggeration !== 1.0;
  const includeGeodeticSurfaceNormals = hasExaggeration;

  const dv = new DataView(buffer);

  let minHeight = Number.POSITIVE_INFINITY;
  let maxHeight = Number.NEGATIVE_INFINITY;

  const minimum = minimumScratch;
  minimum.x = Number.POSITIVE_INFINITY;
  minimum.y = Number.POSITIVE_INFINITY;
  minimum.z = Number.POSITIVE_INFINITY;

  const maximum = maximumScratch;
  maximum.x = Number.NEGATIVE_INFINITY;
  maximum.y = Number.NEGATIVE_INFINITY;
  maximum.z = Number.NEGATIVE_INFINITY;

  // Compute sizes
  let offset = 0;
  let size = 0;
  let indicesSize = 0;
  let quadSize;
  let quad;
  for (quad = 0; quad < 4; ++quad) {
    let o = offset;
    quadSize = dv.getUint32(o, true);
    o += sizeOfUint32;

    const x = CesiumMath.toRadians(dv.getFloat64(o, true) * 180.0);
    o += sizeOfDouble;
    if (indexOfEpsilon(quadBorderLongitudes, x) === -1) {
      quadBorderLongitudes.push(x);
    }

    const y = CesiumMath.toRadians(dv.getFloat64(o, true) * 180.0);
    o += sizeOfDouble;
    if (indexOfEpsilon(quadBorderLatitudes, y) === -1) {
      quadBorderLatitudes.push(y);
    }

    o += 2 * sizeOfDouble; // stepX + stepY

    let c = dv.getInt32(o, true); // Read point count
    o += sizeOfInt32;
    size += c;

    c = dv.getInt32(o, true); // Read index count
    indicesSize += c * 3;

    offset += quadSize + sizeOfUint32; // Jump to next quad
  }

  // Quad Border points to remove duplicates
  const quadBorderPoints = [];
  const quadBorderIndices = [];

  // Create arrays
  const positions = new Array(size);
  const uvs = new Array(size);
  const heights = new Array(size);
  const webMercatorTs = includeWebMercatorT ? new Array(size) : [];
  const geodeticSurfaceNormals = includeGeodeticSurfaceNormals
    ? new Array(size)
    : [];
  const indices = new Array(indicesSize);

  // Points are laid out in rows starting at SW, so storing border points as we
  //  come across them all points will be adjacent.
  const westBorder = [];
  const southBorder = [];
  const eastBorder = [];
  const northBorder = [];

  // Each tile is split into 4 parts
  let pointOffset = 0;
  let indicesOffset = 0;
  offset = 0;
  for (quad = 0; quad < 4; ++quad) {
    quadSize = dv.getUint32(offset, true);
    offset += sizeOfUint32;
    const startQuad = offset;

    const originX = CesiumMath.toRadians(dv.getFloat64(offset, true) * 180.0);
    offset += sizeOfDouble;

    const originY = CesiumMath.toRadians(dv.getFloat64(offset, true) * 180.0);
    offset += sizeOfDouble;

    const stepX = CesiumMath.toRadians(dv.getFloat64(offset, true) * 180.0);
    const halfStepX = stepX * 0.5;
    offset += sizeOfDouble;

    const stepY = CesiumMath.toRadians(dv.getFloat64(offset, true) * 180.0);
    const halfStepY = stepY * 0.5;
    offset += sizeOfDouble;

    const numPoints = dv.getInt32(offset, true);
    offset += sizeOfInt32;

    const numFaces = dv.getInt32(offset, true);
    offset += sizeOfInt32;

    //var level = dv.getInt32(offset, true);
    offset += sizeOfInt32;

    // Keep track of quad indices to overall tile indices
    const indicesMapping = new Array(numPoints);
    for (let i = 0; i < numPoints; ++i) {
      const longitude = originX + dv.getUint8(offset++) * stepX;
      scratchCartographic.longitude = longitude;
      const latitude = originY + dv.getUint8(offset++) * stepY;
      scratchCartographic.latitude = latitude;

      let height = dv.getFloat32(offset, true);
      offset += sizeOfFloat;

      // In order to support old clients, negative altitude values are stored as
      // height/-2^32. Old clients see the value as really close to 0 but new clients multiply
      // by -2^32 to get the real negative altitude value.
      if (height !== 0 && height < negativeElevationThreshold) {
        height *= -Math.pow(2, negativeAltitudeExponentBias);
      }

      // Height is stored in units of (1/EarthRadius) or (1/6371010.0)
      height *= 6371010.0;

      scratchCartographic.height = height;

      // Is it along a quad border - if so check if already exists and use that index
      if (
        indexOfEpsilon(quadBorderLongitudes, longitude) !== -1 ||
        indexOfEpsilon(quadBorderLatitudes, latitude) !== -1
      ) {
        const index = indexOfEpsilon(
          quadBorderPoints,
          scratchCartographic,
          Cartographic
        );
        if (index === -1) {
          quadBorderPoints.push(Cartographic.clone(scratchCartographic));
          quadBorderIndices.push(pointOffset);
        } else {
          indicesMapping[i] = quadBorderIndices[index];
          continue;
        }
      }
      indicesMapping[i] = pointOffset;

      if (Math.abs(longitude - geographicWest) < halfStepX) {
        westBorder.push({
          index: pointOffset,
          cartographic: Cartographic.clone(scratchCartographic),
        });
      } else if (Math.abs(longitude - geographicEast) < halfStepX) {
        eastBorder.push({
          index: pointOffset,
          cartographic: Cartographic.clone(scratchCartographic),
        });
      } else if (Math.abs(latitude - geographicSouth) < halfStepY) {
        southBorder.push({
          index: pointOffset,
          cartographic: Cartographic.clone(scratchCartographic),
        });
      } else if (Math.abs(latitude - geographicNorth) < halfStepY) {
        northBorder.push({
          index: pointOffset,
          cartographic: Cartographic.clone(scratchCartographic),
        });
      }

      minHeight = Math.min(height, minHeight);
      maxHeight = Math.max(height, maxHeight);
      heights[pointOffset] = height;

      const pos = ellipsoid.cartographicToCartesian(scratchCartographic);
      positions[pointOffset] = pos;

      if (includeWebMercatorT) {
        webMercatorTs[pointOffset] =
          (WebMercatorProjection.geodeticLatitudeToMercatorAngle(latitude) -
            southMercatorY) *
          oneOverMercatorHeight;
      }

      if (includeGeodeticSurfaceNormals) {
        const normal = ellipsoid.geodeticSurfaceNormal(pos);
        geodeticSurfaceNormals[pointOffset] = normal;
      }

      Matrix4.multiplyByPoint(toENU, pos, scratchCartesian);

      Cartesian3.minimumByComponent(scratchCartesian, minimum, minimum);
      Cartesian3.maximumByComponent(scratchCartesian, maximum, maximum);

      let u = (longitude - geographicWest) / (geographicEast - geographicWest);
      u = CesiumMath.clamp(u, 0.0, 1.0);
      let v =
        (latitude - geographicSouth) / (geographicNorth - geographicSouth);
      v = CesiumMath.clamp(v, 0.0, 1.0);

      uvs[pointOffset] = new Cartesian2(u, v);
      ++pointOffset;
    }

    const facesElementCount = numFaces * 3;
    for (let j = 0; j < facesElementCount; ++j, ++indicesOffset) {
      indices[indicesOffset] = indicesMapping[dv.getUint16(offset, true)];
      offset += sizeOfUint16;
    }

    if (quadSize !== offset - startQuad) {
      throw new RuntimeError("Invalid terrain tile.");
    }
  }

  positions.length = pointOffset;
  uvs.length = pointOffset;
  heights.length = pointOffset;
  if (includeWebMercatorT) {
    webMercatorTs.length = pointOffset;
  }
  if (includeGeodeticSurfaceNormals) {
    geodeticSurfaceNormals.length = pointOffset;
  }

  const vertexCountWithoutSkirts = pointOffset;
  const indexCountWithoutSkirts = indicesOffset;

  // Add skirt points
  const skirtOptions = {
    hMin: minHeight,
    lastBorderPoint: undefined,
    skirtHeight: skirtHeight,
    toENU: toENU,
    ellipsoid: ellipsoid,
    minimum: minimum,
    maximum: maximum,
  };

  // Sort counter clockwise from NW corner
  // Corner points are in the east/west arrays
  westBorder.sort(function (a, b) {
    return b.cartographic.latitude - a.cartographic.latitude;
  });
  southBorder.sort(function (a, b) {
    return a.cartographic.longitude - b.cartographic.longitude;
  });
  eastBorder.sort(function (a, b) {
    return a.cartographic.latitude - b.cartographic.latitude;
  });
  northBorder.sort(function (a, b) {
    return b.cartographic.longitude - a.cartographic.longitude;
  });

  const percentage = 0.00001;
  addSkirt(
    positions,
    heights,
    uvs,
    webMercatorTs,
    geodeticSurfaceNormals,
    indices,
    skirtOptions,
    westBorder,
    -percentage * rectangleWidth,
    true,
    -percentage * rectangleHeight
  );
  addSkirt(
    positions,
    heights,
    uvs,
    webMercatorTs,
    geodeticSurfaceNormals,
    indices,
    skirtOptions,
    southBorder,
    -percentage * rectangleHeight,
    false
  );
  addSkirt(
    positions,
    heights,
    uvs,
    webMercatorTs,
    geodeticSurfaceNormals,
    indices,
    skirtOptions,
    eastBorder,
    percentage * rectangleWidth,
    true,
    percentage * rectangleHeight
  );
  addSkirt(
    positions,
    heights,
    uvs,
    webMercatorTs,
    geodeticSurfaceNormals,
    indices,
    skirtOptions,
    northBorder,
    percentage * rectangleHeight,
    false
  );

  // Since the corner between the north and west sides is in the west array, generate the last
  //  two triangles between the last north vertex and the first west vertex
  if (westBorder.length > 0 && northBorder.length > 0) {
    const firstBorderIndex = westBorder[0].index;
    const firstSkirtIndex = vertexCountWithoutSkirts;
    const lastBorderIndex = northBorder[northBorder.length - 1].index;
    const lastSkirtIndex = positions.length - 1;

    indices.push(
      lastBorderIndex,
      lastSkirtIndex,
      firstSkirtIndex,
      firstSkirtIndex,
      firstBorderIndex,
      lastBorderIndex
    );
  }

  size = positions.length; // Get new size with skirt vertices

  const boundingSphere3D = BoundingSphere.fromPoints(positions);
  let orientedBoundingBox;
  if (defined(rectangle)) {
    orientedBoundingBox = OrientedBoundingBox.fromRectangle(
      rectangle,
      minHeight,
      maxHeight,
      ellipsoid
    );
  }

  const occluder = new EllipsoidalOccluder(ellipsoid);
  const occludeePointInScaledSpace = occluder.computeHorizonCullingPointPossiblyUnderEllipsoid(
    relativeToCenter,
    positions,
    minHeight
  );

  const aaBox = new AxisAlignedBoundingBox(minimum, maximum, relativeToCenter);
  const encoding = new TerrainEncoding(
    relativeToCenter,
    aaBox,
    skirtOptions.hMin,
    maxHeight,
    fromENU,
    false,
    includeWebMercatorT,
    includeGeodeticSurfaceNormals,
    exaggeration,
    exaggerationRelativeHeight
  );
  const vertices = new Float32Array(size * encoding.stride);

  let bufferIndex = 0;
  for (let k = 0; k < size; ++k) {
    bufferIndex = encoding.encode(
      vertices,
      bufferIndex,
      positions[k],
      uvs[k],
      heights[k],
      undefined,
      webMercatorTs[k],
      geodeticSurfaceNormals[k]
    );
  }

  const westIndicesSouthToNorth = westBorder
    .map(function (vertex) {
      return vertex.index;
    })
    .reverse();
  const southIndicesEastToWest = southBorder
    .map(function (vertex) {
      return vertex.index;
    })
    .reverse();
  const eastIndicesNorthToSouth = eastBorder
    .map(function (vertex) {
      return vertex.index;
    })
    .reverse();
  const northIndicesWestToEast = northBorder
    .map(function (vertex) {
      return vertex.index;
    })
    .reverse();

  southIndicesEastToWest.unshift(
    eastIndicesNorthToSouth[eastIndicesNorthToSouth.length - 1]
  );
  southIndicesEastToWest.push(westIndicesSouthToNorth[0]);

  northIndicesWestToEast.unshift(
    westIndicesSouthToNorth[westIndicesSouthToNorth.length - 1]
  );
  northIndicesWestToEast.push(eastIndicesNorthToSouth[0]);

  return {
    vertices: vertices,
    indices: new Uint16Array(indices),
    maximumHeight: maxHeight,
    minimumHeight: minHeight,
    encoding: encoding,
    boundingSphere3D: boundingSphere3D,
    orientedBoundingBox: orientedBoundingBox,
    occludeePointInScaledSpace: occludeePointInScaledSpace,
    vertexCountWithoutSkirts: vertexCountWithoutSkirts,
    indexCountWithoutSkirts: indexCountWithoutSkirts,
    westIndicesSouthToNorth: westIndicesSouthToNorth,
    southIndicesEastToWest: southIndicesEastToWest,
    eastIndicesNorthToSouth: eastIndicesNorthToSouth,
    northIndicesWestToEast: northIndicesWestToEast,
  };
}

function addSkirt(
  positions,
  heights,
  uvs,
  webMercatorTs,
  geodeticSurfaceNormals,
  indices,
  skirtOptions,
  borderPoints,
  fudgeFactor,
  eastOrWest,
  cornerFudge
) {
  const count = borderPoints.length;
  for (let j = 0; j < count; ++j) {
    const borderPoint = borderPoints[j];
    const borderCartographic = borderPoint.cartographic;
    const borderIndex = borderPoint.index;
    const currentIndex = positions.length;

    const longitude = borderCartographic.longitude;
    let latitude = borderCartographic.latitude;
    latitude = CesiumMath.clamp(
      latitude,
      -CesiumMath.PI_OVER_TWO,
      CesiumMath.PI_OVER_TWO
    ); // Don't go over the poles
    const height = borderCartographic.height - skirtOptions.skirtHeight;
    skirtOptions.hMin = Math.min(skirtOptions.hMin, height);

    Cartographic.fromRadians(longitude, latitude, height, scratchCartographic);

    // Adjust sides to angle out
    if (eastOrWest) {
      scratchCartographic.longitude += fudgeFactor;
    }

    // Adjust top or bottom to angle out
    // Since corners are in the east/west arrays angle the first and last points as well
    if (!eastOrWest) {
      scratchCartographic.latitude += fudgeFactor;
    } else if (j === count - 1) {
      scratchCartographic.latitude += cornerFudge;
    } else if (j === 0) {
      scratchCartographic.latitude -= cornerFudge;
    }

    const pos = skirtOptions.ellipsoid.cartographicToCartesian(
      scratchCartographic
    );
    positions.push(pos);
    heights.push(height);
    uvs.push(Cartesian2.clone(uvs[borderIndex])); // Copy UVs from border point
    if (webMercatorTs.length > 0) {
      webMercatorTs.push(webMercatorTs[borderIndex]);
    }
    if (geodeticSurfaceNormals.length > 0) {
      geodeticSurfaceNormals.push(geodeticSurfaceNormals[borderIndex]);
    }

    Matrix4.multiplyByPoint(skirtOptions.toENU, pos, scratchCartesian);

    const minimum = skirtOptions.minimum;
    const maximum = skirtOptions.maximum;
    Cartesian3.minimumByComponent(scratchCartesian, minimum, minimum);
    Cartesian3.maximumByComponent(scratchCartesian, maximum, maximum);

    const lastBorderPoint = skirtOptions.lastBorderPoint;
    if (defined(lastBorderPoint)) {
      const lastBorderIndex = lastBorderPoint.index;
      indices.push(
        lastBorderIndex,
        currentIndex - 1,
        currentIndex,
        currentIndex,
        borderIndex,
        lastBorderIndex
      );
    }

    skirtOptions.lastBorderPoint = borderPoint;
  }
}
export default createTaskProcessorWorker(
  createVerticesFromGoogleEarthEnterpriseBuffer
);
