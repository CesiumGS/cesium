import BoundingSphere from './BoundingSphere.js';
import Cartesian2 from './Cartesian2.js';
import Cartesian3 from './Cartesian3.js';
import Check from './Check.js';
import defaultValue from './defaultValue.js';
import defined from './defined.js';
import defineProperties from './defineProperties.js';
import DeveloperError from './DeveloperError.js';
import IndexDatatype from './IndexDatatype.js';
import Intersections2D from './Intersections2D.js';
import CesiumMath from './Math.js';
import OrientedBoundingBox from './OrientedBoundingBox.js';
import QuantizedMeshTerrainData from './QuantizedMeshTerrainData.js';
import Rectangle from './Rectangle.js';
import TaskProcessor from './TaskProcessor.js';
import TerrainEncoding from './TerrainEncoding.js';
import TerrainMesh from './TerrainMesh.js';

    /**
     * Terrain data for a single tile from a Google Earth Enterprise server.
     *
     * @alias GoogleEarthEnterpriseTerrainData
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {ArrayBuffer} options.buffer The buffer containing terrain data.
     * @param {Number} options.negativeAltitudeExponentBias Multiplier for negative terrain heights that are encoded as very small positive values.
     * @param {Number} options.negativeElevationThreshold Threshold for negative values
     * @param {Number} [options.childTileMask=15] A bit mask indicating which of this tile's four children exist.
     *                 If a child's bit is set, geometry will be requested for that tile as well when it
     *                 is needed.  If the bit is cleared, the child tile is not requested and geometry is
     *                 instead upsampled from the parent.  The bit values are as follows:
     *                 <table>
     *                  <tr><th>Bit Position</th><th>Bit Value</th><th>Child Tile</th></tr>
     *                  <tr><td>0</td><td>1</td><td>Southwest</td></tr>
     *                  <tr><td>1</td><td>2</td><td>Southeast</td></tr>
     *                  <tr><td>2</td><td>4</td><td>Northeast</td></tr>
     *                  <tr><td>3</td><td>8</td><td>Northwest</td></tr>
     *                 </table>
     * @param {Boolean} [options.createdByUpsampling=false] True if this instance was created by upsampling another instance;
     *                  otherwise, false.
     * @param {Credit[]} [options.credits] Array of credits for this tile.
     *
     *
     * @example
     * var buffer = ...
     * var childTileMask = ...
     * var terrainData = new Cesium.GoogleEarthEnterpriseTerrainData({
     *   buffer : heightBuffer,
     *   childTileMask : childTileMask
     * });
     *
     * @see TerrainData
     * @see HeightTerrainData
     * @see QuantizedMeshTerrainData
     */
    function GoogleEarthEnterpriseTerrainData(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('options.buffer', options.buffer);
        Check.typeOf.number('options.negativeAltitudeExponentBias', options.negativeAltitudeExponentBias);
        Check.typeOf.number('options.negativeElevationThreshold', options.negativeElevationThreshold);
        //>>includeEnd('debug');

        this._buffer = options.buffer;
        this._credits = options.credits;
        this._negativeAltitudeExponentBias = options.negativeAltitudeExponentBias;
        this._negativeElevationThreshold = options.negativeElevationThreshold;

        // Convert from google layout to layout of other providers
        // 3 2 -> 2 3
        // 0 1 -> 0 1
        var googleChildTileMask = defaultValue(options.childTileMask, 15);
        var childTileMask = googleChildTileMask & 3; // Bottom row is identical
        childTileMask |= (googleChildTileMask & 4) ? 8 : 0; // NE
        childTileMask |= (googleChildTileMask & 8) ? 4 : 0; // NW

        this._childTileMask = childTileMask;

        this._createdByUpsampling = defaultValue(options.createdByUpsampling, false);

        this._skirtHeight = undefined;
        this._bufferType = this._buffer.constructor;
        this._mesh = undefined;
        this._minimumHeight = undefined;
        this._maximumHeight = undefined;
        this._vertexCountWithoutSkirts = undefined;
        this._skirtIndex = undefined;
    }

    defineProperties(GoogleEarthEnterpriseTerrainData.prototype, {
        /**
         * An array of credits for this tile
         * @memberof GoogleEarthEnterpriseTerrainData.prototype
         * @type {Credit[]}
         */
        credits : {
            get : function() {
                return this._credits;
            }
        },
        /**
         * The water mask included in this terrain data, if any.  A water mask is a rectangular
         * Uint8Array or image where a value of 255 indicates water and a value of 0 indicates land.
         * Values in between 0 and 255 are allowed as well to smoothly blend between land and water.
         * @memberof GoogleEarthEnterpriseTerrainData.prototype
         * @type {Uint8Array|Image|Canvas}
         */
        waterMask : {
            get : function() {
                return undefined;
            }
        }
    });

    var taskProcessor = new TaskProcessor('createVerticesFromGoogleEarthEnterpriseBuffer');

    var nativeRectangleScratch = new Rectangle();
    var rectangleScratch = new Rectangle();

    /**
     * Creates a {@link TerrainMesh} from this terrain data.
     *
     * @private
     *
     * @param {TilingScheme} tilingScheme The tiling scheme to which this tile belongs.
     * @param {Number} x The X coordinate of the tile for which to create the terrain data.
     * @param {Number} y The Y coordinate of the tile for which to create the terrain data.
     * @param {Number} level The level of the tile for which to create the terrain data.
     * @param {Number} [exaggeration=1.0] The scale used to exaggerate the terrain.
     * @returns {Promise.<TerrainMesh>|undefined} A promise for the terrain mesh, or undefined if too many
     *          asynchronous mesh creations are already in progress and the operation should
     *          be retried later.
     */
    GoogleEarthEnterpriseTerrainData.prototype.createMesh = function(tilingScheme, x, y, level, exaggeration) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('tilingScheme', tilingScheme);
        Check.typeOf.number('x', x);
        Check.typeOf.number('y', y);
        Check.typeOf.number('level', level);
        //>>includeEnd('debug');

        var ellipsoid = tilingScheme.ellipsoid;
        tilingScheme.tileXYToNativeRectangle(x, y, level, nativeRectangleScratch);
        tilingScheme.tileXYToRectangle(x, y, level, rectangleScratch);
        exaggeration = defaultValue(exaggeration, 1.0);

        // Compute the center of the tile for RTC rendering.
        var center = ellipsoid.cartographicToCartesian(Rectangle.center(rectangleScratch));

        var levelZeroMaxError = 40075.16; // From Google's Doc
        var thisLevelMaxError = levelZeroMaxError / (1 << level);
        this._skirtHeight = Math.min(thisLevelMaxError * 8.0, 1000.0);

        var verticesPromise = taskProcessor.scheduleTask({
            buffer : this._buffer,
            nativeRectangle : nativeRectangleScratch,
            rectangle : rectangleScratch,
            relativeToCenter : center,
            ellipsoid : ellipsoid,
            skirtHeight : this._skirtHeight,
            exaggeration : exaggeration,
            includeWebMercatorT : true,
            negativeAltitudeExponentBias: this._negativeAltitudeExponentBias,
            negativeElevationThreshold: this._negativeElevationThreshold
        });

        if (!defined(verticesPromise)) {
            // Postponed
            return undefined;
        }

        var that = this;
        return verticesPromise
            .then(function(result) {
                // Clone complex result objects because the transfer from the web worker
                // has stripped them down to JSON-style objects.
                that._mesh = new TerrainMesh(
                    center,
                    new Float32Array(result.vertices),
                    new Uint16Array(result.indices),
                    result.minimumHeight,
                    result.maximumHeight,
                    BoundingSphere.clone(result.boundingSphere3D),
                    Cartesian3.clone(result.occludeePointInScaledSpace),
                    result.numberOfAttributes,
                    OrientedBoundingBox.clone(result.orientedBoundingBox),
                    TerrainEncoding.clone(result.encoding),
                    exaggeration,
                    result.westIndicesSouthToNorth,
                    result.southIndicesEastToWest,
                    result.eastIndicesNorthToSouth,
                    result.northIndicesWestToEast);

                that._vertexCountWithoutSkirts = result.vertexCountWithoutSkirts;
                that._skirtIndex = result.skirtIndex;
                that._minimumHeight = result.minimumHeight;
                that._maximumHeight = result.maximumHeight;

                // Free memory received from server after mesh is created.
                that._buffer = undefined;
                return that._mesh;
            });
    };

    /**
     * Computes the terrain height at a specified longitude and latitude.
     *
     * @param {Rectangle} rectangle The rectangle covered by this terrain data.
     * @param {Number} longitude The longitude in radians.
     * @param {Number} latitude The latitude in radians.
     * @returns {Number} The terrain height at the specified position.  If the position
     *          is outside the rectangle, this method will extrapolate the height, which is likely to be wildly
     *          incorrect for positions far outside the rectangle.
     */
    GoogleEarthEnterpriseTerrainData.prototype.interpolateHeight = function(rectangle, longitude, latitude) {
        var u = CesiumMath.clamp((longitude - rectangle.west) / rectangle.width, 0.0, 1.0);
        var v = CesiumMath.clamp((latitude - rectangle.south) / rectangle.height, 0.0, 1.0);

        if (!defined(this._mesh)) {
            return interpolateHeight(this, u, v, rectangle);
        }

        return interpolateMeshHeight(this, u, v);
    };

    var upsampleTaskProcessor = new TaskProcessor('upsampleQuantizedTerrainMesh');

    /**
     * Upsamples this terrain data for use by a descendant tile.  The resulting instance will contain a subset of the
     * height samples in this instance, interpolated if necessary.
     *
     * @param {TilingScheme} tilingScheme The tiling scheme of this terrain data.
     * @param {Number} thisX The X coordinate of this tile in the tiling scheme.
     * @param {Number} thisY The Y coordinate of this tile in the tiling scheme.
     * @param {Number} thisLevel The level of this tile in the tiling scheme.
     * @param {Number} descendantX The X coordinate within the tiling scheme of the descendant tile for which we are upsampling.
     * @param {Number} descendantY The Y coordinate within the tiling scheme of the descendant tile for which we are upsampling.
     * @param {Number} descendantLevel The level within the tiling scheme of the descendant tile for which we are upsampling.
     * @returns {Promise.<HeightmapTerrainData>|undefined} A promise for upsampled heightmap terrain data for the descendant tile,
     *          or undefined if too many asynchronous upsample operations are in progress and the request has been
     *          deferred.
     */
    GoogleEarthEnterpriseTerrainData.prototype.upsample = function(tilingScheme, thisX, thisY, thisLevel, descendantX, descendantY, descendantLevel) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.object('tilingScheme', tilingScheme);
        Check.typeOf.number('thisX', thisX);
        Check.typeOf.number('thisY', thisY);
        Check.typeOf.number('thisLevel', thisLevel);
        Check.typeOf.number('descendantX', descendantX);
        Check.typeOf.number('descendantY', descendantY);
        Check.typeOf.number('descendantLevel', descendantLevel);
        var levelDifference = descendantLevel - thisLevel;
        if (levelDifference > 1) {
            throw new DeveloperError('Upsampling through more than one level at a time is not currently supported.');
        }
        //>>includeEnd('debug');

        var mesh = this._mesh;
        if (!defined(this._mesh)) {
            return undefined;
        }

        var isEastChild = thisX * 2 !== descendantX;
        var isNorthChild = thisY * 2 === descendantY;

        var ellipsoid = tilingScheme.ellipsoid;
        var childRectangle = tilingScheme.tileXYToRectangle(descendantX, descendantY, descendantLevel);

        var upsamplePromise = upsampleTaskProcessor.scheduleTask({
            vertices : mesh.vertices,
            vertexCountWithoutSkirts : this._vertexCountWithoutSkirts,
            indices : mesh.indices,
            skirtIndex : this._skirtIndex,
            encoding : mesh.encoding,
            minimumHeight : this._minimumHeight,
            maximumHeight : this._maximumHeight,
            isEastChild : isEastChild,
            isNorthChild : isNorthChild,
            childRectangle : childRectangle,
            ellipsoid : ellipsoid,
            exaggeration : mesh.exaggeration
        });

        if (!defined(upsamplePromise)) {
            // Postponed
            return undefined;
        }

        var that = this;
        return upsamplePromise
            .then(function(result) {
                var quantizedVertices = new Uint16Array(result.vertices);
                var indicesTypedArray = IndexDatatype.createTypedArray(quantizedVertices.length / 3, result.indices);

                var skirtHeight = that._skirtHeight;

                // Use QuantizedMeshTerrainData since we have what we need already parsed
                return new QuantizedMeshTerrainData({
                    quantizedVertices : quantizedVertices,
                    indices : indicesTypedArray,
                    minimumHeight : result.minimumHeight,
                    maximumHeight : result.maximumHeight,
                    boundingSphere : BoundingSphere.clone(result.boundingSphere),
                    orientedBoundingBox : OrientedBoundingBox.clone(result.orientedBoundingBox),
                    horizonOcclusionPoint : Cartesian3.clone(result.horizonOcclusionPoint),
                    westIndices : result.westIndices,
                    southIndices : result.southIndices,
                    eastIndices : result.eastIndices,
                    northIndices : result.northIndices,
                    westSkirtHeight : skirtHeight,
                    southSkirtHeight : skirtHeight,
                    eastSkirtHeight : skirtHeight,
                    northSkirtHeight : skirtHeight,
                    childTileMask : 0,
                    createdByUpsampling : true,
                    credits : that._credits
                });
            });
    };

    /**
     * Determines if a given child tile is available, based on the
     * {@link HeightmapTerrainData.childTileMask}.  The given child tile coordinates are assumed
     * to be one of the four children of this tile.  If non-child tile coordinates are
     * given, the availability of the southeast child tile is returned.
     *
     * @param {Number} thisX The tile X coordinate of this (the parent) tile.
     * @param {Number} thisY The tile Y coordinate of this (the parent) tile.
     * @param {Number} childX The tile X coordinate of the child tile to check for availability.
     * @param {Number} childY The tile Y coordinate of the child tile to check for availability.
     * @returns {Boolean} True if the child tile is available; otherwise, false.
     */
    GoogleEarthEnterpriseTerrainData.prototype.isChildAvailable = function(thisX, thisY, childX, childY) {
        //>>includeStart('debug', pragmas.debug);
        Check.typeOf.number('thisX', thisX);
        Check.typeOf.number('thisY', thisY);
        Check.typeOf.number('childX', childX);
        Check.typeOf.number('childY', childY);
        //>>includeEnd('debug');

        var bitNumber = 2; // northwest child
        if (childX !== thisX * 2) {
            ++bitNumber; // east child
        }
        if (childY !== thisY * 2) {
            bitNumber -= 2; // south child
        }

        return (this._childTileMask & (1 << bitNumber)) !== 0;
    };

    /**
     * Gets a value indicating whether or not this terrain data was created by upsampling lower resolution
     * terrain data.  If this value is false, the data was obtained from some other source, such
     * as by downloading it from a remote server.  This method should return true for instances
     * returned from a call to {@link HeightmapTerrainData#upsample}.
     *
     * @returns {Boolean} True if this instance was created by upsampling; otherwise, false.
     */
    GoogleEarthEnterpriseTerrainData.prototype.wasCreatedByUpsampling = function() {
        return this._createdByUpsampling;
    };

    var texCoordScratch0 = new Cartesian2();
    var texCoordScratch1 = new Cartesian2();
    var texCoordScratch2 = new Cartesian2();
    var barycentricCoordinateScratch = new Cartesian3();

    function interpolateMeshHeight(terrainData, u, v) {
        var mesh = terrainData._mesh;
        var vertices = mesh.vertices;
        var encoding = mesh.encoding;
        var indices = mesh.indices;

        for (var i = 0, len = indices.length; i < len; i += 3) {
            var i0 = indices[i];
            var i1 = indices[i + 1];
            var i2 = indices[i + 2];

            var uv0 = encoding.decodeTextureCoordinates(vertices, i0, texCoordScratch0);
            var uv1 = encoding.decodeTextureCoordinates(vertices, i1, texCoordScratch1);
            var uv2 = encoding.decodeTextureCoordinates(vertices, i2, texCoordScratch2);

            var barycentric = Intersections2D.computeBarycentricCoordinates(u, v, uv0.x, uv0.y, uv1.x, uv1.y, uv2.x, uv2.y, barycentricCoordinateScratch);
            if (barycentric.x >= -1e-15 && barycentric.y >= -1e-15 && barycentric.z >= -1e-15) {
                var h0 = encoding.decodeHeight(vertices, i0);
                var h1 = encoding.decodeHeight(vertices, i1);
                var h2 = encoding.decodeHeight(vertices, i2);
                return barycentric.x * h0 + barycentric.y * h1 + barycentric.z * h2;
            }
        }

        // Position does not lie in any triangle in this mesh.
        return undefined;
    }

    var sizeOfUint16 = Uint16Array.BYTES_PER_ELEMENT;
    var sizeOfUint32 = Uint32Array.BYTES_PER_ELEMENT;
    var sizeOfInt32 = Int32Array.BYTES_PER_ELEMENT;
    var sizeOfFloat = Float32Array.BYTES_PER_ELEMENT;
    var sizeOfDouble = Float64Array.BYTES_PER_ELEMENT;

    function interpolateHeight(terrainData, u, v, rectangle) {
        var buffer = terrainData._buffer;
        var quad = 0; // SW
        var uStart = 0.0;
        var vStart = 0.0;
        if (v > 0.5) { // Upper row
            if (u > 0.5) { // NE
                quad = 2;
                uStart = 0.5;
            } else { // NW
                quad = 3;
            }
            vStart = 0.5;
        } else if (u > 0.5) { // SE
            quad = 1;
            uStart = 0.5;
        }

        var dv = new DataView(buffer);
        var offset = 0;
        for (var q = 0; q < quad; ++q) {
            offset += dv.getUint32(offset, true);
            offset += sizeOfUint32;
        }
        offset += sizeOfUint32; // Skip length of quad
        offset += 2 * sizeOfDouble; // Skip origin

        // Read sizes
        var xSize = CesiumMath.toRadians(dv.getFloat64(offset, true) * 180.0);
        offset += sizeOfDouble;
        var ySize = CesiumMath.toRadians(dv.getFloat64(offset, true) * 180.0);
        offset += sizeOfDouble;

        // Samples per quad
        var xScale = rectangle.width / xSize / 2;
        var yScale = rectangle.height / ySize / 2;

        // Number of points
        var numPoints = dv.getInt32(offset, true);
        offset += sizeOfInt32;

        // Number of faces
        var numIndices = dv.getInt32(offset, true) * 3;
        offset += sizeOfInt32;

        offset += sizeOfInt32; // Skip Level

        var uBuffer = new Array(numPoints);
        var vBuffer = new Array(numPoints);
        var heights = new Array(numPoints);
        var i;
        for (i = 0; i < numPoints; ++i) {
            uBuffer[i] = uStart + (dv.getUint8(offset++) * xScale);
            vBuffer[i] = vStart + (dv.getUint8(offset++) * yScale);

            // Height is stored in units of (1/EarthRadius) or (1/6371010.0)
            heights[i] = (dv.getFloat32(offset, true) * 6371010.0);
            offset += sizeOfFloat;
        }

        var indices = new Array(numIndices);
        for (i = 0; i < numIndices; ++i) {
            indices[i] = dv.getUint16(offset, true);
            offset += sizeOfUint16;
        }

        for (i = 0; i < numIndices; i += 3) {
            var i0 = indices[i];
            var i1 = indices[i + 1];
            var i2 = indices[i + 2];

            var u0 = uBuffer[i0];
            var u1 = uBuffer[i1];
            var u2 = uBuffer[i2];

            var v0 = vBuffer[i0];
            var v1 = vBuffer[i1];
            var v2 = vBuffer[i2];

            var barycentric = Intersections2D.computeBarycentricCoordinates(u, v, u0, v0, u1, v1, u2, v2, barycentricCoordinateScratch);
            if (barycentric.x >= -1e-15 && barycentric.y >= -1e-15 && barycentric.z >= -1e-15) {
                return barycentric.x * heights[i0] +
                       barycentric.y * heights[i1] +
                       barycentric.z * heights[i2];
            }
        }

        // Position does not lie in any triangle in this mesh.
        return undefined;
    }
export default GoogleEarthEnterpriseTerrainData;
