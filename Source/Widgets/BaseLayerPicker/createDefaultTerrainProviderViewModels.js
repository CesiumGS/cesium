/*global define*/
define([
        '../../Core/buildModuleUrl',
        '../../Core/CesiumTerrainProvider',
        '../../Core/EllipsoidTerrainProvider',
        '../BaseLayerPicker/ProviderViewModel'
    ], function(
        buildModuleUrl,
        CesiumTerrainProvider,
        EllipsoidTerrainProvider,
        ProviderViewModel) {
    "use strict";

    /**
     * @private
     */
    function createDefaultTerrainProviderViewModels() {
        var providerViewModels = [];
        providerViewModels.push(new ProviderViewModel({
            name : 'WGS84 Ellipsoid',
            iconUrl : buildModuleUrl('Widgets/Images/TerrainProviders/Ellipsoid.png'),
            tooltip : 'WGS84 standard ellipsoid, also known as EPSG:4326',
            creationFunction : function() {
                return new EllipsoidTerrainProvider();
            }
        }));


        providerViewModels.push(new ProviderViewModel({
            name : 'STK World Terrain meshes',
            iconUrl : buildModuleUrl('Widgets/Images/TerrainProviders/STK.png'),
            tooltip : 'High-resolution, mesh-based terrain for the entire globe. Free for use on the Internet. Closed-network options are available.\nhttp://www.agi.com',
            creationFunction : function() {
                return new CesiumTerrainProvider({
                    url : '//assets.agi.com/stk-terrain/world',
                    requestWaterMask : true,
                    requestVertexNormals : true
                });
            }
        }));

        return providerViewModels;
    }

    return createDefaultTerrainProviderViewModels;
});