/*global define*/
define([
        '../BaseLayerPicker/ProviderViewModel',
        '../../Core/buildModuleUrl',
        '../../Scene/ArcGisImageServerTerrainProvider',
        '../../Scene/CesiumTerrainProvider',
        '../../Scene/EllipsoidTerrainProvider'
    ], function(
        ProviderViewModel,
        buildModuleUrl,
        ArcGisImageServerTerrainProvider,
        CesiumTerrainProvider,
        EllipsoidTerrainProvider) {
    "use strict";

    /**
     * @private
     */
    function createDefaultTerrainProviderViewModels() {
        var providerViewModels = [];
        providerViewModels.push(new ProviderViewModel({
            name : 'WGS84 Ellipsoid',
            iconUrl : buildModuleUrl('Widgets/Images/TerrainProviders/Ellipsoid.png'),
            tooltip : 'EllipsoidTerrainProvider',
            creationFunction : function() {
                return new EllipsoidTerrainProvider();
            }
        }));


        providerViewModels.push(new ProviderViewModel({
            name : 'STK World Terrain meshes',
            iconUrl : buildModuleUrl('Widgets/Images/TerrainProviders/STK.png'),
            tooltip : 'CesiumTerrainProvider',
            creationFunction : function() {
                return new CesiumTerrainProvider({
                    url : 'http://cesiumjs.org/stk-terrain/tilesets/world/tiles',
                    credit : 'Terrain data courtesy Analytical Graphics, Inc.'
                });
            }
        }));

        providerViewModels.push(new ProviderViewModel({
            name : 'STK World Terrain heightmaps and water',
            iconUrl : buildModuleUrl('Widgets/Images/TerrainProviders/STK.png'),
            tooltip : 'CesiumTerrainProvider',
            creationFunction : function() {
                return new CesiumTerrainProvider({
                    url : 'http://cesiumjs.org/smallterrain',
                    credit : 'Terrain data courtesy Analytical Graphics, Inc.'
                });
            }
        }));

        return providerViewModels;
    }

    return createDefaultTerrainProviderViewModels;
});