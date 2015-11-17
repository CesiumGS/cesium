/*global define*/
define(function() {
    "use strict";

    /**
     * Data used to decompress the terrain mesh.
     *
     * @alias TerrainEncoding
     * @constructor
     *
     * @param {TerrainCompression} compression How the vertices of the mesh were compressed.
     * @param {Number} minimumX The minimum distance in the x direction.
     * @param {Number} maximumX The maximum distance in the x direction.
     * @param {Number} minimumY The minimum distance in the y direction.
     * @param {Number} maximumY The maximum distance in the y direction.
     * @param {Number} minimumZ The minimum distance in the z direction.
     * @param {Number} maximumZ The maximum distance in the z direction.
     * @param {Matrix3} matrix The matrix used to decompress the vertices.
     */
    var TerrainEncoding = function(compression, minimumX, maximumX, minimumY, maximumY, minimumZ, maximumZ, matrix) {
        /**
         * How the vertices of the mesh were compressed.
         * @type {TerrainCompression}
         */
        this.compression = compression;

        /**
         * The minimum distance in the x direction.
         * @type {Number}
         */
        this.minimumX = minimumX;

        /**
         * The maximum distance in the x direction.
         * @type {Number}
         */
        this.maximumX = maximumX;

        /**
         * The minimum distance in the y direction.
         * @type {Number}
         */
        this.minimumY = minimumY;

        /**
         * The maximum distance in the y direction.
         * @type {Number}
         */
        this.maximumY = maximumY;

        /**
         * The minimumdistance in the z direction.
         * @type {Number}
         */
        this.minimumZ = minimumZ;

        /**
         * The maximum distance in the z direction.
         * @type {Number}
         */
        this.maximumZ = maximumZ;

        /**
         * The matrix used to decompress the terrain vertices.
         * @type {Matrix3}
         */
        this.matrix = matrix;
    };

    return TerrainEncoding;
});