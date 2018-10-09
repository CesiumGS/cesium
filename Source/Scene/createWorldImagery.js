define([
    './IonImageryProvider',
    './IonWorldImageryStyle',
    '../Core/defaultValue'
], function(
    IonImageryProvider,
    IonWorldImageryStyle,
    defaultValue) {
'use strict';

    /**
     * Creates an {@link IonImageryProvider} instance for ion's default global base imagery layer, currently Bing Maps.
     *
     * @exports createWorldImagery
     *
     * @param {Object} [options] Object with the following properties:
     * @param {IonWorldImageryStyle} [options.style=IonWorldImageryStyle] The style of base imagery, only AERIAL, AERIAL_WITH_LABELS, and ROAD are currently supported.
     * @returns {IonImageryProvider}
     *
     * @see Ion
     *
     * @example
     * // Create Cesium World Terrain with default settings
     * var viewer = new Cesium.Viewer('cesiumContainer', {
     *     imageryProvider : Cesium.createWorldImagery();
     * });
     *
     * @example
     * // Create Cesium World Terrain with water and normals.
     * var viewer = new Cesium.Viewer('cesiumContainer', {
     *     imageryProvider : Cesium.createWorldImagery({
     *         style: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS
     *     })
     * });
     *
     */
    function createWorldImagery(options) {
        options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        var style = defaultValue(options.style, IonWorldImageryStyle.AERIAL);
        return new IonImageryProvider({
            assetId: style
        });
    }

    return createWorldImagery;
});
