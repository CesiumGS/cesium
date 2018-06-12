define([
        './CesiumTerrainProvider',
        './defaultValue',
        './IonResource'
    ], function(
        CesiumTerrainProvider,
        defaultValue,
        IonResource) {
    'use strict';

    /**
     * Creates a {@link CesiumTerrainProvider} instance for the {@link https://cesium.com/content/cesiumworldterrain|Cesium World Terrain}.
     *
     * @exports createWorldTerrain
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Boolean} [options.requestVertexNormals=false] Flag that indicates if the client should request additional lighting information from the server if available.
     * @param {Boolean} [options.requestWaterMask=false] Flag that indicates if the client should request per tile water masks from the server if available.
     * @returns {CesiumTerrainProvider}
     *
     * @see Ion
     *
     * @example
     * // Create Cesium World Terrain with default settings
     * var viewer = new Cesium.Viewer('cesiumContainer', {
     *     terrainProvider : Cesium.createWorldTerrain();
     * });
     *
     * @example
     * // Create Cesium World Terrain with water and normals.
     * var viewer = new Cesium.Viewer('cesiumContainer', {
     *     terrainProvider : Cesium.createWorldTerrain({
     *         requestWaterMask : true,
     *         requestVertexNormals : true
     *     });
     * });
     *
     */
    function createWorldTerrain(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);

        return new CesiumTerrainProvider({
            url: IonResource.fromAssetId(1),
            requestVertexNormals: defaultValue(options.requestVertexNormals, false),
            requestWaterMask: defaultValue(options.requestWaterMask, false)
        });
    }

    return createWorldTerrain;
});
