import AxisAlignedBoundingBox from "./AxisAlignedBoundingBox.js";
import BoundingSphere from "./BoundingSphere.js";
import Cartesian2 from "./Cartesian2.js";
import Cartesian3 from "./Cartesian3.js";
import defaultValue from "./defaultValue.js";
import defined from "./defined.js";
import DeveloperError from "./DeveloperError.js";
import Ellipsoid from "./Ellipsoid.js";
import EllipsoidalOccluder from "./EllipsoidalOccluder.js";
import CesiumMath from "./Math.js";
import Matrix4 from "./Matrix4.js";
import OrientedBoundingBox from "./OrientedBoundingBox.js";
import Rectangle from "./Rectangle.js";
import TerrainEncoding from "./TerrainEncoding.js";
import Transforms from "./Transforms.js";
import WebMercatorProjection from "./WebMercatorProjection.js";
import TrianglePicking from "./TrianglePicking.js";

/**
 * Contains functions to create a mesh from a heightmap image.
 *
 * @namespace HeightmapTessellator
 *
 * @private
 */
var HeightmapTessellator = {};

/**
 * The default structure of a heightmap, as given to {@link HeightmapTessellator.computeVertices}.
 *
 * @constant
 */
HeightmapTessellator.DEFAULT_STRUCTURE = Object.freeze({
  heightScale: 1.0,
  heightOffset: 0.0,
  elementsPerHeight: 1,
  stride: 1,
  elementMultiplier: 256.0,
  isBigEndian: false,
});

function createPackedTriangles(
  positions,
  invTransform,
  width,
  triangleIndexEnd
) {
  var v0 = new Cartesian3();
  var v1 = new Cartesian3();
  var v2 = new Cartesian3();
  var idx0;
  var idx1;
  var idx2;
  var trianglesPerRow;
  var base;
  var isEven;
  var triIdx;

  var triangles = new Float32Array(triangleIndexEnd * 6);

  for (triIdx = 0; triIdx < triangleIndexEnd; triIdx++) {
    trianglesPerRow = (width - 1) * 2;
    base =
      width * Math.floor(triIdx / trianglesPerRow) +
      Math.floor((triIdx % trianglesPerRow) / 2);
    isEven = triIdx % 2 === 0;
    // isEven: TL, BL, TR
    // isOdd: TR, BL, BR
    idx0 = base + (isEven ? 0 : 1);
    idx1 = base + width;
    idx2 = base + 1 + (isEven ? 0 : width);

    Matrix4.multiplyByPoint(invTransform, positions[idx0], v0);
    Matrix4.multiplyByPoint(invTransform, positions[idx1], v1);
    Matrix4.multiplyByPoint(invTransform, positions[idx2], v2);

    // Get local space AABBs for triangle
    triangles[triIdx * 6 + 0] = Math.min(v0.x, v1.x, v2.x);
    triangles[triIdx * 6 + 1] = Math.max(v0.x, v1.x, v2.x);
    triangles[triIdx * 6 + 2] = Math.min(v0.y, v1.y, v2.y);
    triangles[triIdx * 6 + 3] = Math.max(v0.y, v1.y, v2.y);
    triangles[triIdx * 6 + 4] = Math.min(v0.z, v1.z, v2.z);
    triangles[triIdx * 6 + 5] = Math.max(v0.z, v1.z, v2.z);
  }
  return triangles;
}

var cartesian3Scratch = new Cartesian3();
var matrix4Scratch = new Matrix4();
var minimumScratch = new Cartesian3();
var maximumScratch = new Cartesian3();

/**
 * Fills an array of vertices from a heightmap image.
 *
 * @param {Object} options Object with the following properties:
 * @param {Int8Array|Uint8Array|Int16Array|Uint16Array|Int32Array|Uint32Array|Float32Array|Float64Array} options.heightmap The heightmap to tessellate.
 * @param {Number} options.width The width of the heightmap, in height samples.
 * @param {Number} options.height The height of the heightmap, in height samples.
 * @param {Number} options.skirtHeight The height of skirts to drape at the edges of the heightmap.
 * @param {Rectangle} options.nativeRectangle A rectangle in the native coordinates of the heightmap's projection.  For
 *                 a heightmap with a geographic projection, this is degrees.  For the web mercator
 *                 projection, this is meters.
 * @param {Number} [options.exaggeration=1.0] The scale used to exaggerate the terrain.
 * @param {Rectangle} [options.rectangle] The rectangle covered by the heightmap, in geodetic coordinates with north, south, east and
 *                 west properties in radians.  Either rectangle or nativeRectangle must be provided.  If both
 *                 are provided, they're assumed to be consistent.
 * @param {Boolean} [options.isGeographic=true] True if the heightmap uses a {@link GeographicProjection}, or false if it uses
 *                  a {@link WebMercatorProjection}.
 * @param {Cartesian3} [options.relativeToCenter=Cartesian3.ZERO] The positions will be computed as <code>Cartesian3.subtract(worldPosition, relativeToCenter)</code>.
 * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to which the heightmap applies.
 * @param {Object} [options.structure] An object describing the structure of the height data.
 * @param {Number} [options.structure.heightScale=1.0] The factor by which to multiply height samples in order to obtain
 *                 the height above the heightOffset, in meters.  The heightOffset is added to the resulting
 *                 height after multiplying by the scale.
 * @param {Number} [options.structure.heightOffset=0.0] The offset to add to the scaled height to obtain the final
 *                 height in meters.  The offset is added after the height sample is multiplied by the
 *                 heightScale.
 * @param {Number} [options.structure.elementsPerHeight=1] The number of elements in the buffer that make up a single height
 *                 sample.  This is usually 1, indicating that each element is a separate height sample.  If
 *                 it is greater than 1, that number of elements together form the height sample, which is
 *                 computed according to the structure.elementMultiplier and structure.isBigEndian properties.
 * @param {Number} [options.structure.stride=1] The number of elements to skip to get from the first element of
 *                 one height to the first element of the next height.
 * @param {Number} [options.structure.elementMultiplier=256.0] The multiplier used to compute the height value when the
 *                 stride property is greater than 1.  For example, if the stride is 4 and the strideMultiplier
 *                 is 256, the height is computed as follows:
 *                 `height = buffer[index] + buffer[index + 1] * 256 + buffer[index + 2] * 256 * 256 + buffer[index + 3] * 256 * 256 * 256`
 *                 This is assuming that the isBigEndian property is false.  If it is true, the order of the
 *                 elements is reversed.
 * @param {Number} [options.structure.lowestEncodedHeight] The lowest value that can be stored in the height buffer.  Any heights that are lower
 *                 than this value after encoding with the `heightScale` and `heightOffset` are clamped to this value.  For example, if the height
 *                 buffer is a `Uint16Array`, this value should be 0 because a `Uint16Array` cannot store negative numbers.  If this parameter is
 *                 not specified, no minimum value is enforced.
 * @param {Number} [options.structure.highestEncodedHeight] The highest value that can be stored in the height buffer.  Any heights that are higher
 *                 than this value after encoding with the `heightScale` and `heightOffset` are clamped to this value.  For example, if the height
 *                 buffer is a `Uint16Array`, this value should be `256 * 256 - 1` or 65535 because a `Uint16Array` cannot store numbers larger
 *                 than 65535.  If this parameter is not specified, no maximum value is enforced.
 * @param {Boolean} [options.structure.isBigEndian=false] Indicates endianness of the elements in the buffer when the
 *                  stride property is greater than 1.  If this property is false, the first element is the
 *                  low-order element.  If it is true, the first element is the high-order element.
 *
 * @example
 * var width = 5;
 * var height = 5;
 * var statistics = Cesium.HeightmapTessellator.computeVertices({
 *     heightmap : [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0],
 *     width : width,
 *     height : height,
 *     skirtHeight : 0.0,
 *     nativeRectangle : {
 *         west : 10.0,
 *         east : 20.0,
 *         south : 30.0,
 *         north : 40.0
 *     }
 * });
 *
 * var encoding = statistics.encoding;
 * var position = encoding.decodePosition(statistics.vertices, index * encoding.getStride());
 */
HeightmapTessellator.computeVertices = function (options) {
  console.time("computeVertices");
  //>>includeStart('debug', pragmas.debug);
  if (!defined(options) || !defined(options.heightmap)) {
    throw new DeveloperError("options.heightmap is required.");
  }
  if (!defined(options.width) || !defined(options.height)) {
    throw new DeveloperError("options.width and options.height are required.");
  }
  if (!defined(options.nativeRectangle)) {
    throw new DeveloperError("options.nativeRectangle is required.");
  }
  if (!defined(options.skirtHeight)) {
    throw new DeveloperError("options.skirtHeight is required.");
  }
  //>>includeEnd('debug');

  // This function tends to be a performance hotspot for terrain rendering,
  // so it employs a lot of inlining and unrolling as an optimization.
  // In particular, the functionality of Ellipsoid.cartographicToCartesian
  // is inlined.

  console.time("setup stuff");

  var cos = Math.cos;
  var sin = Math.sin;
  var sqrt = Math.sqrt;
  var atan = Math.atan;
  var exp = Math.exp;
  var piOverTwo = CesiumMath.PI_OVER_TWO;
  var toRadians = CesiumMath.toRadians;

  var heightmap = options.heightmap;
  var width = options.width;
  var height = options.height;
  var skirtHeight = options.skirtHeight;

  var isGeographic = defaultValue(options.isGeographic, true);
  var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);

  var oneOverGlobeSemimajorAxis = 1.0 / ellipsoid.maximumRadius;

  var nativeRectangle = options.nativeRectangle;

  var geographicWest;
  var geographicSouth;
  var geographicEast;
  var geographicNorth;

  var rectangle = options.rectangle;
  if (!defined(rectangle)) {
    if (isGeographic) {
      geographicWest = toRadians(nativeRectangle.west);
      geographicSouth = toRadians(nativeRectangle.south);
      geographicEast = toRadians(nativeRectangle.east);
      geographicNorth = toRadians(nativeRectangle.north);
    } else {
      geographicWest = nativeRectangle.west * oneOverGlobeSemimajorAxis;
      geographicSouth =
        piOverTwo -
        2.0 * atan(exp(-nativeRectangle.south * oneOverGlobeSemimajorAxis));
      geographicEast = nativeRectangle.east * oneOverGlobeSemimajorAxis;
      geographicNorth =
        piOverTwo -
        2.0 * atan(exp(-nativeRectangle.north * oneOverGlobeSemimajorAxis));
    }
  } else {
    geographicWest = rectangle.west;
    geographicSouth = rectangle.south;
    geographicEast = rectangle.east;
    geographicNorth = rectangle.north;
  }

  var relativeToCenter = options.relativeToCenter;
  var hasRelativeToCenter = defined(relativeToCenter);
  relativeToCenter = hasRelativeToCenter ? relativeToCenter : Cartesian3.ZERO;
  var exaggeration = defaultValue(options.exaggeration, 1.0);
  var includeWebMercatorT = defaultValue(options.includeWebMercatorT, false);

  var structure = defaultValue(
    options.structure,
    HeightmapTessellator.DEFAULT_STRUCTURE
  );
  var heightScale = defaultValue(
    structure.heightScale,
    HeightmapTessellator.DEFAULT_STRUCTURE.heightScale
  );
  var heightOffset = defaultValue(
    structure.heightOffset,
    HeightmapTessellator.DEFAULT_STRUCTURE.heightOffset
  );
  var elementsPerHeight = defaultValue(
    structure.elementsPerHeight,
    HeightmapTessellator.DEFAULT_STRUCTURE.elementsPerHeight
  );
  var stride = defaultValue(
    structure.stride,
    HeightmapTessellator.DEFAULT_STRUCTURE.stride
  );
  var elementMultiplier = defaultValue(
    structure.elementMultiplier,
    HeightmapTessellator.DEFAULT_STRUCTURE.elementMultiplier
  );
  var isBigEndian = defaultValue(
    structure.isBigEndian,
    HeightmapTessellator.DEFAULT_STRUCTURE.isBigEndian
  );

  var rectangleWidth = Rectangle.computeWidth(nativeRectangle);
  var rectangleHeight = Rectangle.computeHeight(nativeRectangle);

  var granularityX = rectangleWidth / (width - 1);
  var granularityY = rectangleHeight / (height - 1);

  if (!isGeographic) {
    rectangleWidth *= oneOverGlobeSemimajorAxis;
    rectangleHeight *= oneOverGlobeSemimajorAxis;
  }

  var radiiSquared = ellipsoid.radiiSquared;
  var radiiSquaredX = radiiSquared.x;
  var radiiSquaredY = radiiSquared.y;
  var radiiSquaredZ = radiiSquared.z;

  var minimumHeight = 65536.0;
  var maximumHeight = -65536.0;

  var fromENU = Transforms.eastNorthUpToFixedFrame(relativeToCenter, ellipsoid);
  var toENU = Matrix4.inverseTransformation(fromENU, matrix4Scratch);

  var southMercatorY;
  var oneOverMercatorHeight;
  if (includeWebMercatorT) {
    southMercatorY = WebMercatorProjection.geodeticLatitudeToMercatorAngle(
      geographicSouth
    );
    oneOverMercatorHeight =
      1.0 /
      (WebMercatorProjection.geodeticLatitudeToMercatorAngle(geographicNorth) -
        southMercatorY);
  }

  var minimum = minimumScratch;
  minimum.x = Number.POSITIVE_INFINITY;
  minimum.y = Number.POSITIVE_INFINITY;
  minimum.z = Number.POSITIVE_INFINITY;

  var maximum = maximumScratch;
  maximum.x = Number.NEGATIVE_INFINITY;
  maximum.y = Number.NEGATIVE_INFINITY;
  maximum.z = Number.NEGATIVE_INFINITY;

  var hMin = Number.POSITIVE_INFINITY;

  var gridVertexCount = width * height;
  var gridTriangleCount = (width - 1) * (height - 1) * 2;
  var edgeVertexCount = skirtHeight > 0.0 ? width * 2 + height * 2 : 0;
  var vertexCount = gridVertexCount + edgeVertexCount;

  var positions = new Array(vertexCount);
  var heights = new Array(vertexCount);
  var uvs = new Array(vertexCount);
  var webMercatorTs = includeWebMercatorT ? new Array(vertexCount) : [];

  var startRow = 0;
  var endRow = height;
  var startCol = 0;
  var endCol = width;

  if (skirtHeight > 0.0) {
    --startRow;
    ++endRow;
    --startCol;
    ++endCol;
  }

  var skirtOffsetPercentage = 0.00001;

  for (var rowIndex = startRow; rowIndex < endRow; ++rowIndex) {
    var row = rowIndex;
    if (row < 0) {
      row = 0;
    }
    if (row >= height) {
      row = height - 1;
    }

    var latitude = nativeRectangle.north - granularityY * row;

    if (!isGeographic) {
      latitude =
        piOverTwo - 2.0 * atan(exp(-latitude * oneOverGlobeSemimajorAxis));
    } else {
      latitude = toRadians(latitude);
    }

    var v = (latitude - geographicSouth) / (geographicNorth - geographicSouth);
    v = CesiumMath.clamp(v, 0.0, 1.0);

    var isNorthEdge = rowIndex === startRow;
    var isSouthEdge = rowIndex === endRow - 1;
    if (skirtHeight > 0.0) {
      if (isNorthEdge) {
        latitude += skirtOffsetPercentage * rectangleHeight;
      } else if (isSouthEdge) {
        latitude -= skirtOffsetPercentage * rectangleHeight;
      }
    }

    var cosLatitude = cos(latitude);
    var nZ = sin(latitude);
    var kZ = radiiSquaredZ * nZ;

    var webMercatorT;
    if (includeWebMercatorT) {
      webMercatorT =
        (WebMercatorProjection.geodeticLatitudeToMercatorAngle(latitude) -
          southMercatorY) *
        oneOverMercatorHeight;
    }

    for (var colIndex = startCol; colIndex < endCol; ++colIndex) {
      var col = colIndex;
      if (col < 0) {
        col = 0;
      }
      if (col >= width) {
        col = width - 1;
      }

      var terrainOffset = row * (width * stride) + col * stride;

      var heightSample;
      if (elementsPerHeight === 1) {
        heightSample = heightmap[terrainOffset];
      } else {
        heightSample = 0;

        var elementOffset;
        if (isBigEndian) {
          for (
            elementOffset = 0;
            elementOffset < elementsPerHeight;
            ++elementOffset
          ) {
            heightSample =
              heightSample * elementMultiplier +
              heightmap[terrainOffset + elementOffset];
          }
        } else {
          for (
            elementOffset = elementsPerHeight - 1;
            elementOffset >= 0;
            --elementOffset
          ) {
            heightSample =
              heightSample * elementMultiplier +
              heightmap[terrainOffset + elementOffset];
          }
        }
      }

      heightSample = (heightSample * heightScale + heightOffset) * exaggeration;

      maximumHeight = Math.max(maximumHeight, heightSample);
      minimumHeight = Math.min(minimumHeight, heightSample);

      var longitude = nativeRectangle.west + granularityX * col;

      if (!isGeographic) {
        longitude = longitude * oneOverGlobeSemimajorAxis;
      } else {
        longitude = toRadians(longitude);
      }

      var u = (longitude - geographicWest) / (geographicEast - geographicWest);
      u = CesiumMath.clamp(u, 0.0, 1.0);

      var index = row * width + col;

      if (skirtHeight > 0.0) {
        var isWestEdge = colIndex === startCol;
        var isEastEdge = colIndex === endCol - 1;
        var isEdge = isNorthEdge || isSouthEdge || isWestEdge || isEastEdge;
        var isCorner =
          (isNorthEdge || isSouthEdge) && (isWestEdge || isEastEdge);
        if (isCorner) {
          // Don't generate skirts on the corners.
          continue;
        } else if (isEdge) {
          heightSample -= skirtHeight;

          if (isWestEdge) {
            // The outer loop iterates north to south but the indices are ordered south to north, hence the index flip below
            index = gridVertexCount + (height - row - 1);
            longitude -= skirtOffsetPercentage * rectangleWidth;
          } else if (isSouthEdge) {
            // Add after west indices. South indices are ordered east to west.
            index = gridVertexCount + height + (width - col - 1);
          } else if (isEastEdge) {
            // Add after west and south indices. East indices are ordered north to south. The index is flipped like above.
            index = gridVertexCount + height + width + row;
            longitude += skirtOffsetPercentage * rectangleWidth;
          } else if (isNorthEdge) {
            // Add after west, south, and east indices. North indices are ordered west to east.
            index = gridVertexCount + height + width + height + col;
          }
        }
      }

      var nX = cosLatitude * cos(longitude);
      var nY = cosLatitude * sin(longitude);

      var kX = radiiSquaredX * nX;
      var kY = radiiSquaredY * nY;

      var gamma = sqrt(kX * nX + kY * nY + kZ * nZ);
      var oneOverGamma = 1.0 / gamma;

      var rSurfaceX = kX * oneOverGamma;
      var rSurfaceY = kY * oneOverGamma;
      var rSurfaceZ = kZ * oneOverGamma;

      var position = new Cartesian3();
      position.x = rSurfaceX + nX * heightSample;
      position.y = rSurfaceY + nY * heightSample;
      position.z = rSurfaceZ + nZ * heightSample;

      positions[index] = position;
      heights[index] = heightSample;
      uvs[index] = new Cartesian2(u, v);

      if (includeWebMercatorT) {
        webMercatorTs[index] = webMercatorT;
      }

      Matrix4.multiplyByPoint(toENU, position, cartesian3Scratch);

      Cartesian3.minimumByComponent(cartesian3Scratch, minimum, minimum);
      Cartesian3.maximumByComponent(cartesian3Scratch, maximum, maximum);
      hMin = Math.min(hMin, heightSample);
    }
  }

  console.timeEnd("setup stuff");
  console.time("creating bounding sphere");

  var boundingSphere3D = BoundingSphere.fromPoints(positions);

  console.timeEnd("creating bounding sphere");

  var orientedBoundingBox;
  var quadtree;
  var transform;
  var inverseTransform;
  var octree;

  if (defined(rectangle)) {
    console.time("creating oriented bounding box");

    orientedBoundingBox = OrientedBoundingBox.fromRectangle(
      rectangle,
      minimumHeight,
      maximumHeight,
      ellipsoid
    );

    transform = OrientedBoundingBox.toTransformation(orientedBoundingBox);
    inverseTransform = Matrix4.inverse(transform, new Matrix4());
    console.timeEnd("creating oriented bounding box");

    console.time("making packed triangles");
    var packedTriangles = createPackedTriangles(
      positions,
      inverseTransform,
      width,
      gridTriangleCount
    );
    console.timeEnd("making packed triangles");

    octree = TrianglePicking.createPackedOctree(
      packedTriangles,
      inverseTransform,
      transform,
      orientedBoundingBox
    );
  }

  var occludeePointInScaledSpace;
  if (hasRelativeToCenter) {
    console.time("creating occluder");
    var occluder = new EllipsoidalOccluder(ellipsoid);
    occludeePointInScaledSpace = occluder.computeHorizonCullingPointPossiblyUnderEllipsoid(
      relativeToCenter,
      positions,
      minimumHeight
    );
    console.timeEnd("creating occluder");
  }

  console.time("terrain encoding");
  var aaBox = new AxisAlignedBoundingBox(minimum, maximum, relativeToCenter);
  var encoding = new TerrainEncoding(
    aaBox,
    hMin,
    maximumHeight,
    fromENU,
    false,
    includeWebMercatorT
  );
  var vertices = new Float32Array(vertexCount * encoding.getStride());

  var bufferIndex = 0;
  for (var j = 0; j < vertexCount; ++j) {
    bufferIndex = encoding.encode(
      vertices,
      bufferIndex,
      positions[j],
      uvs[j],
      heights[j],
      undefined,
      webMercatorTs[j]
    );
  }

  console.timeEnd("terrain encoding");
  console.timeEnd("computeVertices");
  return {
    vertices: vertices,
    maximumHeight: maximumHeight,
    minimumHeight: minimumHeight,
    encoding: encoding,
    boundingSphere3D: boundingSphere3D,
    orientedBoundingBox: orientedBoundingBox,
    occludeePointInScaledSpace: occludeePointInScaledSpace,
    packedQuadtree: {
      orientedBoundingBox: orientedBoundingBox,
      boundingSphere3D: boundingSphere3D,
      inverseTransform: inverseTransform,
      rectangle: Rectangle.pack(rectangle, []),
      transform: transform,
      quadtree: quadtree,
      width: width,
      height: height,
      skirtHeight: skirtHeight,
    },
    octree: octree,
  };
};
export default HeightmapTessellator;
