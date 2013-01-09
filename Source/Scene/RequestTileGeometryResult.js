/*global define*/
define([
        '../Core/defaultValue'
    ], function(
        defaultValue) {
    "use strict";

    /**
     * The result of a call to {@link TerrainProvider#requestTileGeometry}.  It represents the terrain
     * data loaded for the tile, plus a water mask and child tile mask, if available.
     *
     * @alias RequestTileGeometryResult
     * @constructor
     *
     * @param {TerrainData} terrainData The terrain data for the tile.
     * @param {WaterMaskData} [waterMaskData] The water mask data for the tile, if any.
     * @param {Number} [childTileMask=15] A bit mask indicating which of this tile's four children exist.
     *                 If a child's bit is set, geometry will be requested for that tile as well when it
     *                 is needed.  If the bit is cleared, the child tile is not requested and geometry is
     *                 instead upsampled from the parent.  The bit values are as follows:
     *                 <table>
     *                  <th><td>Bit Position</td><td>Bit Value</td><td>Child Tile</td></th>
     *                  <tr><td>0</td><td>1</td><td>Southwest</td></tr>
     *                  <tr><td>1</td><td>2</td><td>Southeast</td></tr>
     *                  <tr><td>2</td><td>4</td><td>Northwest</td></tr>
     *                  <tr><td>3</td><td>8</td><td>Northeast</td></tr>
     *                 </table>
     */
    var RequestTileGeometryResult = function RequestTileGeometryResult(terrainData, waterMaskData, childTileMask) {
        /**
         * The terrain data for the tile.
         * @type {TerrainData}
         */
        this.terrainData = terrainData;

        /**
         * The water mask data for the tile, if any.
         * @type {WaterMaskData}
         */
        this.waterMaskData = waterMaskData;

        /**
         * A bit mask indicating which of this tile's four children exist.
         * If a child's bit is set, geometry will be requested for that tile as well when it
         * is needed.  If the bit is cleared, the child tile is not requested and geometry is
         * instead upsampled from the parent.  The bit values are as follows:
         * <table>
         *   <th><td>Bit Position</td><td>Bit Value</td><td>Child Tile</td></th>
         *   <tr><td>0</td><td>1</td><td>Southwest</td></tr>
         *   <tr><td>1</td><td>2</td><td>Southeast</td></tr>
         *   <tr><td>2</td><td>4</td><td>Northwest</td></tr>
         *   <tr><td>3</td><td>8</td><td>Northeast</td></tr>
         * </table>
         * @type {Number}
         */
        this.childTileMask = childTileMask;
    };

    return RequestTileGeometryResult;
});