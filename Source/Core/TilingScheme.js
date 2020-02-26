import defineProperties from './defineProperties.js';
import DeveloperError from './DeveloperError.js';

    /**
     * A tiling scheme for geometry or imagery on the surface of an ellipsoid.  At level-of-detail zero,
     * the coarsest, least-detailed level, the number of tiles is configurable.
     * At level of detail one, each of the level zero tiles has four children, two in each direction.
     * At level of detail two, each of the level one tiles has four children, two in each direction.
     * This continues for as many levels as are present in the geometry or imagery source.
     *
     * @alias TilingScheme
     * @constructor
     *
     * @see WebMercatorTilingScheme
     * @see GeographicTilingScheme
     */
    function TilingScheme(options) {
        //>>includeStart('debug', pragmas.debug);
        throw new DeveloperError('This type should not be instantiated directly.  Instead, use WebMercatorTilingScheme or GeographicTilingScheme.');
        //>>includeEnd('debug');
    }

    defineProperties(TilingScheme.prototype, {
        /**
         * Gets the ellipsoid that is tiled by the tiling scheme.
         * @memberof TilingScheme.prototype
         * @type {Ellipsoid}
         */
        ellipsoid: {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the rectangle, in radians, covered by this tiling scheme.
         * @memberof TilingScheme.prototype
         * @type {Rectangle}
         */
        rectangle : {
            get : DeveloperError.throwInstantiationError
        },

        /**
         * Gets the map projection used by the tiling scheme.
         * @memberof TilingScheme.prototype
         * @type {MapProjection}
         */
        projection : {
            get : DeveloperError.throwInstantiationError
        }
    });

    /**
     * Gets the total number of tiles in the X direction at a specified level-of-detail.
     * @function
     *
     * @param {Number} level The level-of-detail.
     * @returns {Number} The number of tiles in the X direction at the given level.
     */
    TilingScheme.prototype.getNumberOfXTilesAtLevel = DeveloperError.throwInstantiationError;

    /**
     * Gets the total number of tiles in the Y direction at a specified level-of-detail.
     * @function
     *
     * @param {Number} level The level-of-detail.
     * @returns {Number} The number of tiles in the Y direction at the given level.
     */
    TilingScheme.prototype.getNumberOfYTilesAtLevel = DeveloperError.throwInstantiationError;

    /**
     * Transforms a rectangle specified in geodetic radians to the native coordinate system
     * of this tiling scheme.
     * @function
     *
     * @param {Rectangle} rectangle The rectangle to transform.
     * @param {Rectangle} [result] The instance to which to copy the result, or undefined if a new instance
     *        should be created.
     * @returns {Rectangle} The specified 'result', or a new object containing the native rectangle if 'result'
     *          is undefined.
     */
    TilingScheme.prototype.rectangleToNativeRectangle = DeveloperError.throwInstantiationError;

    /**
     * Converts tile x, y coordinates and level to a rectangle expressed in the native coordinates
     * of the tiling scheme.
     * @function
     *
     * @param {Number} x The integer x coordinate of the tile.
     * @param {Number} y The integer y coordinate of the tile.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     * @param {Object} [result] The instance to which to copy the result, or undefined if a new instance
     *        should be created.
     * @returns {Rectangle} The specified 'result', or a new object containing the rectangle
     *          if 'result' is undefined.
     */
    TilingScheme.prototype.tileXYToNativeRectangle = DeveloperError.throwInstantiationError;

    /**
     * Converts tile x, y coordinates and level to a cartographic rectangle in radians.
     * @function
     *
     * @param {Number} x The integer x coordinate of the tile.
     * @param {Number} y The integer y coordinate of the tile.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     * @param {Object} [result] The instance to which to copy the result, or undefined if a new instance
     *        should be created.
     * @returns {Rectangle} The specified 'result', or a new object containing the rectangle
     *          if 'result' is undefined.
     */
    TilingScheme.prototype.tileXYToRectangle = DeveloperError.throwInstantiationError;

    /**
     * Calculates the tile x, y coordinates of the tile containing
     * a given cartographic position.
     * @function
     *
     * @param {Cartographic} position The position.
     * @param {Number} level The tile level-of-detail.  Zero is the least detailed.
     * @param {Cartesian2} [result] The instance to which to copy the result, or undefined if a new instance
     *        should be created.
     * @returns {Cartesian2} The specified 'result', or a new object containing the tile x, y coordinates
     *          if 'result' is undefined.
     */
    TilingScheme.prototype.positionToTileXY = DeveloperError.throwInstantiationError;
export default TilingScheme;
