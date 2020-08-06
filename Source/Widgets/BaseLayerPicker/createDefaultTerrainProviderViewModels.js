import buildModuleUrl from "../../Core/buildModuleUrl.js";
import createWorldTerrain from "../../Core/createWorldTerrain.js";
import EllipsoidTerrainProvider from "../../Core/EllipsoidTerrainProvider.js";
import ProviderViewModel from "../BaseLayerPicker/ProviderViewModel.js";

/**
 * @private
 */
function createDefaultTerrainProviderViewModels() {
  var providerViewModels = [];
  providerViewModels.push(
    new ProviderViewModel({
      name: "WGS84 Ellipsoid",
      iconUrl: buildModuleUrl("Widgets/Images/TerrainProviders/Ellipsoid.png"),
      tooltip: "WGS84 standard ellipsoid, also known as EPSG:4326",
      category: "Cesium ion",
      creationFunction: function () {
        return new EllipsoidTerrainProvider();
      },
    })
  );

  providerViewModels.push(
    new ProviderViewModel({
      name: "Cesium World Terrain",
      iconUrl: buildModuleUrl(
        "Widgets/Images/TerrainProviders/CesiumWorldTerrain.png"
      ),
      tooltip:
        "High-resolution global terrain tileset curated from several datasources and hosted by Cesium ion",
      category: "Cesium ion",
      creationFunction: function () {
        return createWorldTerrain({
          requestWaterMask: true,
          requestVertexNormals: true,
        });
      },
    })
  );

  return providerViewModels;
}
export default createDefaultTerrainProviderViewModels;
