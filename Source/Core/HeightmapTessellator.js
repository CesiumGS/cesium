/*global define*/
define([
        './AxisAlignedBoundingBox',
        './BoundingSphere',
        './Cartesian2',
        './Cartesian3',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Ellipsoid',
        './EllipsoidalOccluder',
        './freezeObject',
        './Math',
        './Matrix4',
        './OrientedBoundingBox',
        './Rectangle',
        './TerrainEncoding',
        './Transforms'
    ], function(
        AxisAlignedBoundingBox,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        defaultValue,
        defined,
        DeveloperError,
        Ellipsoid,
        EllipsoidalOccluder,
        freezeObject,
        CesiumMath,
        Matrix4,
        OrientedBoundingBox,
        Rectangle,
        TerrainEncoding,
        Transforms) {
    'use strict';

    /**
     * Contains functions to create a mesh from a heightmap image.
     *
     * @exports HeightmapTessellator
     *
     * @private
     */
    var HeightmapTessellator = {};

    /**
     * The default structure of a heightmap, as given to {@link HeightmapTessellator.computeVertices}.
     *
     * @constant
     */
    HeightmapTessellator.DEFAULT_STRUCTURE = freezeObject({
        heightScale : 1.0,
        heightOffset : 0.0,
        elementsPerHeight : 1,
        stride : 1,
        elementMultiplier : 256.0,
        isBigEndian : false
    });

    var cartesian3Scratch = new Cartesian3();
    var matrix4Scratch = new Matrix4();
    var minimumScratch = new Cartesian3();
    var maximumScratch = new Cartesian3();

    /**
     * Fills an array of vertices from a heightmap image.
     *
     * @param {Object} options Object with the following properties:
     * @param {TypedArray} options.heightmap The heightmap to tessellate.
     * @param {Number} options.width The width of the heightmap, in height samples.
     * @param {Number} options.height The height of the heightmap, in height samples.
     * @param {Number} options.skirtHeight The height of skirts to drape at the edges of the heightmap.
     * @param {Rectangle} options.nativeRectangle An rectangle in the native coordinates of the heightmap's projection.  For
     *                 a heightmap with a geographic projection, this is degrees.  For the web mercator
     *                 projection, this is meters.
     * @param {Number} [options.exaggeration=1.0] The scale used to exaggerate the terrain.
     * @param {Rectangle} [options.rectangle] The rectangle covered by the heightmap, in geodetic coordinates with north, south, east and
     *                 west properties in radians.  Either rectangle or nativeRectangle must be provided.  If both
     *                 are provided, they're assumed to be consistent.
     * @param {Boolean} [options.isGeographic=true] True if the heightmap uses a {@link GeographicProjection}, or false if it uses
     *                  a {@link WebMercatorProjection}.
     * @param {Cartesian3} [options.relativetoCenter=Cartesian3.ZERO] The positions will be computed as <code>Cartesian3.subtract(worldPosition, relativeToCenter)</code>.
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
    HeightmapTessellator.computeVertices = function(options) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(options) || !defined(options.heightmap)) {
            throw new DeveloperError('options.heightmap is required.');
        }
        if (!defined(options.width) || !defined(options.height)) {
            throw new DeveloperError('options.width and options.height are required.');
        }
        if (!defined(options.nativeRectangle)) {
            throw new DeveloperError('options.nativeRectangle is required.');
        }
        if (!defined(options.skirtHeight)) {
            throw new DeveloperError('options.skirtHeight is required.');
        }
        //>>includeEnd('debug');

        // This function tends to be a performance hotspot for terrain rendering,
        // so it employs a lot of inlining and unrolling as an optimization.
        // In particular, the functionality of Ellipsoid.cartographicToCartesian
        // is inlined.

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
                geographicSouth = piOverTwo - (2.0 * atan(exp(-nativeRectangle.south * oneOverGlobeSemimajorAxis)));
                geographicEast = nativeRectangle.east * oneOverGlobeSemimajorAxis;
                geographicNorth = piOverTwo - (2.0 * atan(exp(-nativeRectangle.north * oneOverGlobeSemimajorAxis)));
            }
        } else {
            geographicWest = rectangle.west;
            geographicSouth = rectangle.south;
            geographicEast = rectangle.east;
            geographicNorth = rectangle.north;
        }

        var relativeToCenter = defaultValue(options.relativeToCenter, Cartesian3.ZERO);
        var exaggeration = defaultValue(options.exaggeration, 1.0);

        var structure = defaultValue(options.structure, HeightmapTessellator.DEFAULT_STRUCTURE);
        var heightScale = defaultValue(structure.heightScale, HeightmapTessellator.DEFAULT_STRUCTURE.heightScale);
        var heightOffset = defaultValue(structure.heightOffset, HeightmapTessellator.DEFAULT_STRUCTURE.heightOffset);
        var elementsPerHeight = defaultValue(structure.elementsPerHeight, HeightmapTessellator.DEFAULT_STRUCTURE.elementsPerHeight);
        var stride = defaultValue(structure.stride, HeightmapTessellator.DEFAULT_STRUCTURE.stride);
        var elementMultiplier = defaultValue(structure.elementMultiplier, HeightmapTessellator.DEFAULT_STRUCTURE.elementMultiplier);
        var isBigEndian = defaultValue(structure.isBigEndian, HeightmapTessellator.DEFAULT_STRUCTURE.isBigEndian);

        var granularityX = Rectangle.computeWidth(nativeRectangle) / (width - 1);
        var granularityY = Rectangle.computeHeight(nativeRectangle) / (height - 1);

        var radiiSquared = ellipsoid.radiiSquared;
        var radiiSquaredX = radiiSquared.x;
        var radiiSquaredY = radiiSquared.y;
        var radiiSquaredZ = radiiSquared.z;

        var minimumHeight = 65536.0;
        var maximumHeight = -65536.0;

        var fromENU = Transforms.eastNorthUpToFixedFrame(relativeToCenter, ellipsoid);
        var toENU = Matrix4.inverseTransformation(fromENU, matrix4Scratch);

        var minimum = minimumScratch;
        minimum.x = Number.POSITIVE_INFINITY;
        minimum.y = Number.POSITIVE_INFINITY;
        minimum.z = Number.POSITIVE_INFINITY;

        var maximum = maximumScratch;
        maximum.x = Number.NEGATIVE_INFINITY;
        maximum.y = Number.NEGATIVE_INFINITY;
        maximum.z = Number.NEGATIVE_INFINITY;

        var hMin = Number.POSITIVE_INFINITY;

        var arrayWidth = width + (skirtHeight > 0.0 ? 2.0 : 0.0);
        var arrayHeight = height + (skirtHeight > 0.0 ? 2.0 : 0.0);
        var size = arrayWidth * arrayHeight;
        var positions = new Array(size);
        var heights = new Array(size);
        var uvs = new Array(size);

        var startRow = 0;
        var endRow = height;
        var startCol = 0;
        var endCol = width;

        if (skirtHeight > 0) {
            --startRow;
            ++endRow;
            --startCol;
            ++endCol;
        }

        var index = 0;

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
                latitude = piOverTwo - (2.0 * atan(exp(-latitude * oneOverGlobeSemimajorAxis)));
            } else {
                latitude = toRadians(latitude);
            }

            var cosLatitude = cos(latitude);
            var nZ = sin(latitude);
            var kZ = radiiSquaredZ * nZ;

            var v = (latitude - geographicSouth) / (geographicNorth - geographicSouth);
            v = CesiumMath.clamp(v, 0.0, 1.0);

            for (var colIndex = startCol; colIndex < endCol; ++colIndex) {
                var col = colIndex;
                if (col < 0) {
                    col = 0;
                }
                if (col >= width) {
                    col = width - 1;
                }

                var longitude = nativeRectangle.west + granularityX * col;

                if (!isGeographic) {
                    longitude = longitude * oneOverGlobeSemimajorAxis;
                } else {
                    longitude = toRadians(longitude);
                }

                var terrainOffset = row * (width * stride) + col * stride;

                var heightSample;
                if (elementsPerHeight === 1) {
                    heightSample = heightmap[terrainOffset];
                } else {
                    heightSample = 0;

                    var elementOffset;
                    if (isBigEndian) {
                        for (elementOffset = 0; elementOffset < elementsPerHeight; ++elementOffset) {
                            heightSample = (heightSample * elementMultiplier) + heightmap[terrainOffset + elementOffset];
                        }
                    } else {
                        for (elementOffset = elementsPerHeight - 1; elementOffset >= 0; --elementOffset) {
                            heightSample = (heightSample * elementMultiplier) + heightmap[terrainOffset + elementOffset];
                        }
                    }
                }

                heightSample = (heightSample * heightScale + heightOffset) * exaggeration;

                maximumHeight = Math.max(maximumHeight, heightSample);
                minimumHeight = Math.min(minimumHeight, heightSample);

                if (colIndex !== col || rowIndex !== row) {
                    heightSample -= skirtHeight;
                }

                var nX = cosLatitude * cos(longitude);
                var nY = cosLatitude * sin(longitude);

                var kX = radiiSquaredX * nX;
                var kY = radiiSquaredY * nY;

                var gamma = sqrt((kX * nX) + (kY * nY) + (kZ * nZ));
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

                var u = (longitude - geographicWest) / (geographicEast - geographicWest);
                u = CesiumMath.clamp(u, 0.0, 1.0);
                uvs[index] = new Cartesian2(u, v);

                index++;

                Matrix4.multiplyByPoint(toENU, position, cartesian3Scratch);

                Cartesian3.minimumByComponent(cartesian3Scratch, minimum, minimum);
                Cartesian3.maximumByComponent(cartesian3Scratch, maximum, maximum);
                hMin = Math.min(hMin, heightSample);
            }
        }

        var boundingSphere3D = BoundingSphere.fromPoints(positions);
        var orientedBoundingBox;
        if (defined(rectangle) && rectangle.width < CesiumMath.PI_OVER_TWO + CesiumMath.EPSILON5) {
            // Here, rectangle.width < pi/2, and rectangle.height < pi
            // (though it would still work with rectangle.width up to pi)
            orientedBoundingBox = OrientedBoundingBox.fromRectangle(rectangle, minimumHeight, maximumHeight, ellipsoid);
        }

        var occludeePointInScaledSpace;
        var center = options.relativetoCenter;
        if (defined(center)) {
            var occluder = new EllipsoidalOccluder(ellipsoid);
            occludeePointInScaledSpace = occluder.computeHorizonCullingPointFromPoints(center, positions);
        }

        var aaBox = new AxisAlignedBoundingBox(minimum, maximum, relativeToCenter);
        var encoding = new TerrainEncoding(aaBox, hMin, maximumHeight, fromENU, false);
        var vertices = new Float32Array(size * encoding.getStride());

        var bufferIndex = 0;
        for (var j = 0; j < size; ++j) {
            bufferIndex = encoding.encode(vertices, bufferIndex, positions[j], uvs[j], heights[j]);
        }

        return {
            vertices : vertices,
            maximumHeight : maximumHeight,
            minimumHeight : minimumHeight,
            encoding : encoding,
            boundingSphere3D : boundingSphere3D,
            orientedBoundingBox : orientedBoundingBox,
            occludeePointInScaledSpace : occludeePointInScaledSpace
        };
    };

    return HeightmapTessellator;
});
