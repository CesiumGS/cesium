/*global define*/
define([
        './defaultValue',
        './defined',
        './freezeObject',
        './DeveloperError',
        './Cartesian3',
        './Ellipsoid',
        './Math'
    ], function(
        defaultValue,
        defined,
        freezeObject,
        DeveloperError,
        Cartesian3,
        Ellipsoid,
        CesiumMath) {
    "use strict";

    /**
     * Contains functions to create a mesh from a heightmap image.
     *
     * @exports HeightmapTessellator
     */
    var HeightmapTessellator = {};

    /**
     * The default structure of a heightmap, as given to {@link HeightmapTessellator.computeVertices}.
     *
     * @memberof HeightmapTessellator
     */
    HeightmapTessellator.DEFAULT_STRUCTURE = freezeObject({
            heightScale : 1.0,
            heightOffset : 0.0,
            elementsPerHeight : 1,
            stride : 1,
            elementMultiplier : 256.0,
            isBigEndian : false
        });

    /**
     * Fills an array of vertices from a heightmap image.  On return, the vertex data is in the order
     * [X, Y, Z, H, U, V], where X, Y, and Z represent the Cartesian position of the vertex, H is the
     * height above the ellipsoid, and U and V are the texture coordinates.
     *
     * @memberof HeightmapTessellator
     *
     * @param {Array|Float32Array} description.vertices The array to use to store computed vertices.
     *                             If description.skirtHeight is 0.0, the array should have
     *                             description.width * description.height * 6 elements.  If
     *                             description.skirtHeight is greater than 0.0, the array should
     *                             have (description.width + 2) * (description.height * 2) * 6
     *                             elements.
     * @param {TypedArray} description.heightmap The heightmap to tessellate.
     * @param {Number} description.width The width of the heightmap, in height samples.
     * @param {Number} description.height The height of the heightmap, in height samples.
     * @param {Number} description.skirtHeight The height of skirts to drape at the edges of the heightmap.
     * @param {Extent} description.nativeExtent An extent in the native coordinates of the heightmap's projection.  For
     *                 a heightmap with a geographic projection, this is degrees.  For the web mercator
     *                 projection, this is meters.
     * @param {Extent} [description.extent] The extent covered by the heightmap, in geodetic coordinates with north, south, east and
     *                 west properties in radians.  Either extent or nativeExtent must be provided.  If both
     *                 are provided, they're assumed to be consistent.
     * @param {Boolean} [description.isGeographic=true] True if the heightmap uses a {@link GeographicProjection}, or false if it uses
     *                  a {@link WebMercatorProjection}.
     * @param {Cartesian3} [description.relativetoCenter=Cartesian3.ZERO] The positions will be computed as <code>Cartesian3.subtract(worldPosition, relativeToCenter)</code>.
     * @param {Ellipsoid} [description.ellipsoid=Ellipsoid.WGS84] The ellipsoid to which the heightmap applies.
     * @param {Object} [description.structure] An object describing the structure of the height data.
     * @param {Number} [description.structure.heightScale=1.0] The factor by which to multiply height samples in order to obtain
     *                 the height above the heightOffset, in meters.  The heightOffset is added to the resulting
     *                 height after multiplying by the scale.
     * @param {Number} [description.structure.heightOffset=0.0] The offset to add to the scaled height to obtain the final
     *                 height in meters.  The offset is added after the height sample is multiplied by the
     *                 heightScale.
     * @param {Number} [description.structure.elementsPerHeight=1] The number of elements in the buffer that make up a single height
     *                 sample.  This is usually 1, indicating that each element is a separate height sample.  If
     *                 it is greater than 1, that number of elements together form the height sample, which is
     *                 computed according to the structure.elementMultiplier and structure.isBigEndian properties.
     * @param {Number} [description.structure.stride=1] The number of elements to skip to get from the first element of
     *                 one height to the first element of the next height.
     * @param {Number} [description.structure.elementMultiplier=256.0] The multiplier used to compute the height value when the
     *                 stride property is greater than 1.  For example, if the stride is 4 and the strideMultiplier
     *                 is 256, the height is computed as follows:
     *                 `height = buffer[index] + buffer[index + 1] * 256 + buffer[index + 2] * 256 * 256 + buffer[index + 3] * 256 * 256 * 256`
     *                 This is assuming that the isBigEndian property is false.  If it is true, the order of the
     *                 elements is reversed.
     * @param {Boolean} [description.structure.isBigEndian=false] Indicates endianness of the elements in the buffer when the
     *                  stride property is greater than 1.  If this property is false, the first element is the
     *                  low-order element.  If it is true, the first element is the high-order element.
     *
     * @example
     * var width = 5;
     * var height = 5;
     * var vertices = new Float32Array(width * height * 6);
     * var description = ;
     * Cesium.HeightmapTessellator.computeVertices({
     *     vertices : vertices,
     *     heightmap : [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0],
     *     width : width,
     *     height : height,
     *     skirtHeight : 0.0,
     *     nativeExtent : {
     *         west : 10.0,
     *         east : 20.0,
     *         south : 30.0,
     *         north : 40.0
     *     }
     * });
     */
    HeightmapTessellator.computeVertices = function(description) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(description) || !defined(description.heightmap)) {
            throw new DeveloperError('description.heightmap is required.');
        }
        if (!defined(description.width) || !defined(description.height)) {
            throw new DeveloperError('description.width and description.height are required.');
        }
        if (!defined(description.vertices)) {
            throw new DeveloperError('description.vertices is required.');
        }
        if (!defined(description.nativeExtent)) {
            throw new DeveloperError('description.nativeExtent is required.');
        }
        if (!defined(description.skirtHeight)) {
            throw new DeveloperError('description.skirtHeight is required.');
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

        var vertices = description.vertices;
        var heightmap = description.heightmap;
        var width = description.width;
        var height = description.height;
        var skirtHeight = description.skirtHeight;

        var isGeographic = defaultValue(description.isGeographic, true);
        var ellipsoid = defaultValue(description.ellipsoid, Ellipsoid.WGS84);

        var oneOverCentralBodySemimajorAxis = 1.0 / ellipsoid.maximumRadius;

        var nativeExtent = description.nativeExtent;

        var geographicWest;
        var geographicSouth;
        var geographicEast;
        var geographicNorth;

        var extent = description.extent;
        if (!defined(extent)) {
            if (isGeographic) {
                geographicWest = toRadians(nativeExtent.west);
                geographicSouth = toRadians(nativeExtent.south);
                geographicEast = toRadians(nativeExtent.east);
                geographicNorth = toRadians(nativeExtent.north);
            } else {
                geographicWest = nativeExtent.west * oneOverCentralBodySemimajorAxis;
                geographicSouth = piOverTwo - (2.0 * atan(exp(-nativeExtent.south * oneOverCentralBodySemimajorAxis)));
                geographicEast = nativeExtent.east * oneOverCentralBodySemimajorAxis;
                geographicNorth = piOverTwo - (2.0 * atan(exp(-nativeExtent.north * oneOverCentralBodySemimajorAxis)));
            }
        } else {
            geographicWest = extent.west;
            geographicSouth = extent.south;
            geographicEast = extent.east;
            geographicNorth = extent.north;
        }

        var relativeToCenter = defaultValue(description.relativeToCenter, Cartesian3.ZERO);

        var structure = defaultValue(description.structure, HeightmapTessellator.DEFAULT_STRUCTURE);
        var heightScale = defaultValue(structure.heightScale, HeightmapTessellator.DEFAULT_STRUCTURE.heightScale);
        var heightOffset = defaultValue(structure.heightOffset, HeightmapTessellator.DEFAULT_STRUCTURE.heightOffset);
        var elementsPerHeight = defaultValue(structure.elementsPerHeight, HeightmapTessellator.DEFAULT_STRUCTURE.elementsPerHeight);
        var stride = defaultValue(structure.stride, HeightmapTessellator.DEFAULT_STRUCTURE.stride);
        var elementMultiplier = defaultValue(structure.elementMultiplier, HeightmapTessellator.DEFAULT_STRUCTURE.elementMultiplier);
        var isBigEndian = defaultValue(structure.isBigEndian, HeightmapTessellator.DEFAULT_STRUCTURE.isBigEndian);

        var granularityX = (nativeExtent.east - nativeExtent.west) / (width - 1);
        var granularityY = (nativeExtent.north - nativeExtent.south) / (height - 1);

        var radiiSquared = ellipsoid.radiiSquared;
        var radiiSquaredX = radiiSquared.x;
        var radiiSquaredY = radiiSquared.y;
        var radiiSquaredZ = radiiSquared.z;

        var vertexArrayIndex = 0;

        var minimumHeight = 65536.0;
        var maximumHeight = -65536.0;

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

        for ( var rowIndex = startRow; rowIndex < endRow; ++rowIndex) {
            var row = rowIndex;
            if (row < 0) {
                row = 0;
            }
            if (row >= height) {
                row = height - 1;
            }

            var latitude = nativeExtent.north - granularityY * row;

            if (!isGeographic) {
                latitude = piOverTwo - (2.0 * atan(exp(-latitude * oneOverCentralBodySemimajorAxis)));
            } else {
                latitude = toRadians(latitude);
            }

            var cosLatitude = cos(latitude);
            var nZ = sin(latitude);
            var kZ = radiiSquaredZ * nZ;

            var v = (latitude - geographicSouth) / (geographicNorth - geographicSouth);

            for ( var colIndex = startCol; colIndex < endCol; ++colIndex) {
                var col = colIndex;
                if (col < 0) {
                    col = 0;
                }
                if (col >= width) {
                    col = width - 1;
                }

                var longitude = nativeExtent.west + granularityX * col;

                if (!isGeographic) {
                    longitude = longitude * oneOverCentralBodySemimajorAxis;
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

                heightSample = heightSample * heightScale + heightOffset;

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

                vertices[vertexArrayIndex++] = rSurfaceX + nX * heightSample - relativeToCenter.x;
                vertices[vertexArrayIndex++] = rSurfaceY + nY * heightSample - relativeToCenter.y;
                vertices[vertexArrayIndex++] = rSurfaceZ + nZ * heightSample - relativeToCenter.z;

                vertices[vertexArrayIndex++] = heightSample;

                var u = (longitude - geographicWest) / (geographicEast - geographicWest);

                vertices[vertexArrayIndex++] = u;
                vertices[vertexArrayIndex++] = v;
            }
        }

        return {
            maximumHeight : maximumHeight,
            minimumHeight : minimumHeight
        };
    };

    return HeightmapTessellator;
});
