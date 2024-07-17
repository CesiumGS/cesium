import {
  buildModuleUrl,
  createWorldTerrainAsync,
  Ellipsoid,
  EllipsoidTerrainProvider,
} from "@cesium/engine";
import ProviderViewModel from "./ProviderViewModel.js";

/**
 * @private
 */
function createDefaultTerrainProviderViewModels() {
  const providerViewModels = [];
  providerViewModels.push(
    new ProviderViewModel({
      name: "WGS84 Ellipsoid",
      iconUrl: buildModuleUrl("Widgets/Images/TerrainProviders/Ellipsoid.png"),
      tooltip: "WGS84 standard ellipsoid, also known as EPSG:4326",
      category: "Cesium ion",
      creationFunction: function () {
        return new EllipsoidTerrainProvider({ ellipsoid: Ellipsoid.WGS84 });
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
        return createWorldTerrainAsync({
          requestWaterMask: true,
          requestVertexNormals: true,
        });
      },
    })
  );

  return providerViewModels;
}
export default createDefaultTerrainProviderViewModels;
