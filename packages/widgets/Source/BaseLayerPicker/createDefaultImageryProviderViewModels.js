import {
  ArcGisMapServerImageryProvider,
  buildModuleUrl,
  createWorldImageryAsync,
  IonImageryProvider,
  IonWorldImageryStyle,
  OpenStreetMapImageryProvider,
  TileMapServiceImageryProvider,
  ArcGisBaseMapType,
} from "@cesium/engine";
import ProviderViewModel from "./ProviderViewModel.js";

/**
 * @private
 */
function createDefaultImageryProviderViewModels() {
  const providerViewModels = [];
  providerViewModels.push(
    new ProviderViewModel({
      name: "Bing Maps Aerial",
      iconUrl: buildModuleUrl("Widgets/Images/ImageryProviders/bingAerial.png"),
      tooltip: "Bing Maps aerial imagery, provided by Cesium ion",
      category: "Cesium ion",
      creationFunction: function () {
        return createWorldImageryAsync({
          style: IonWorldImageryStyle.AERIAL,
        });
      },
    })
  );

  providerViewModels.push(
    new ProviderViewModel({
      name: "Bing Maps Aerial with Labels",
      iconUrl: buildModuleUrl(
        "Widgets/Images/ImageryProviders/bingAerialLabels.png"
      ),
      tooltip: "Bing Maps aerial imagery with labels, provided by Cesium ion",
      category: "Cesium ion",
      creationFunction: function () {
        return createWorldImageryAsync({
          style: IonWorldImageryStyle.AERIAL_WITH_LABELS,
        });
      },
    })
  );

  providerViewModels.push(
    new ProviderViewModel({
      name: "Bing Maps Roads",
      iconUrl: buildModuleUrl("Widgets/Images/ImageryProviders/bingRoads.png"),
      tooltip: "Bing Maps standard road maps, provided by Cesium ion",
      category: "Cesium ion",
      creationFunction: function () {
        return createWorldImageryAsync({
          style: IonWorldImageryStyle.ROAD,
        });
      },
    })
  );

  providerViewModels.push(
    new ProviderViewModel({
      name: "ArcGIS World Imagery",
      iconUrl: buildModuleUrl(
        "Widgets/Images/ImageryProviders/ArcGisMapServiceWorldImagery.png"
      ),
      tooltip:
        "\
ArcGIS World Imagery provides one meter or better satellite and aerial imagery in many parts of the world and lower \
resolution satellite imagery worldwide. The map includes 15m TerraColor imagery at small and mid-scales (~1:591M down to ~1:288k) \
for the world. The map features Maxar imagery at 0.3m resolution for select metropolitan areas around the world, 0.5m \
resolution across the United States and parts of Western Europe, and 1m resolution imagery across the rest of the world. \
In addition to commercial sources, the World Imagery map features high-resolution aerial photography contributed by the \
GIS User Community. This imagery ranges from 0.3m to 0.03m resolution (down to ~1:280 nin select communities). \
For more information on this map, including the terms of use, visit us online at \n\
https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9",
      category: "Other",
      creationFunction: function () {
        return ArcGisMapServerImageryProvider.fromBasemapType(
          ArcGisBaseMapType.SATELLITE,
          {
            enablePickFeatures: false,
          }
        );
      },
    })
  );

  providerViewModels.push(
    new ProviderViewModel({
      name: "ArcGIS World Hillshade",
      iconUrl: buildModuleUrl(
        "Widgets/Images/ImageryProviders/ArcGisMapServiceWorldHillshade.png"
      ),
      tooltip:
        "\
ArcGIS World Hillshade map portrays elevation as an artistic hillshade. This map is designed to be used as a backdrop for topographical, soil, hydro, \
landcover or other outdoor recreational maps. The map was compiled from a variety of sources from several data providers. \
The basemap has global coverage down to a scale of ~1:72k. In select areas of the United States and Europe, coverage is available \
down to ~1:9k. For more information on this map, including the terms of use, visit us online at \n\
https://www.arcgis.com/home/item.html?id=1b243539f4514b6ba35e7d995890db1d",
      category: "Other",
      creationFunction: function () {
        return ArcGisMapServerImageryProvider.fromBasemapType(
          ArcGisBaseMapType.HILLSHADE,
          {
            enablePickFeatures: false,
          }
        );
      },
    })
  );

  providerViewModels.push(
    new ProviderViewModel({
      name: "Esri World Ocean",
      iconUrl: buildModuleUrl(
        "Widgets/Images/ImageryProviders/ArcGisMapServiceWorldOcean.png"
      ),
      tooltip:
        "\
ArcGIS World Ocean map is designed to be used as a base map by marine GIS professionals and as a reference map by anyone interested in ocean data.  \
The base map features marine bathymetry. Land features include inland waters and roads overlaid on land cover and shaded relief imagery. \
The map was compiled from a variety of best available sources from several data providers, including General Bathymetric Chart of the Oceans GEBCO_08 Grid, \
National Oceanic and Atmospheric Administration (NOAA), and National Geographic, Garmin, HERE, Geonames.org, and Esri, and various other contributors. \
The base map currently provides coverage for the world down to a scale of ~1:577k, and coverage down to 1:72k in US coastal areas, and various other areas. \
Coverage down to ~ 1:9k is available limited areas based on regional hydrographic survey data. The base map was designed and developed by Esri. \
For more information on this map, including our terms of use, visit us online at \n\
https://www.arcgis.com/home/item.html?id=1e126e7520f9466c9ca28b8f28b5e500",
      category: "Other",
      creationFunction: function () {
        return ArcGisMapServerImageryProvider.fromBasemapType(
          ArcGisBaseMapType.OCEANS,
          {
            enablePickFeatures: false,
          }
        );
      },
    })
  );

  providerViewModels.push(
    new ProviderViewModel({
      name: "Open\u00adStreet\u00adMap",
      iconUrl: buildModuleUrl(
        "Widgets/Images/ImageryProviders/openStreetMap.png"
      ),
      tooltip:
        "OpenStreetMap (OSM) is a collaborative project to create a free editable map \
of the world.\nhttp://www.openstreetmap.org",
      category: "Other",
      creationFunction: function () {
        return new OpenStreetMapImageryProvider({
          url: "https://tile.openstreetmap.org/",
        });
      },
    })
  );

  providerViewModels.push(
    new ProviderViewModel({
      name: "Stamen Watercolor",
      iconUrl: buildModuleUrl(
        "Widgets/Images/ImageryProviders/stamenWatercolor.png"
      ),
      tooltip:
        "Reminiscent of hand drawn maps, Stamen watercolor maps apply raster effect \
area washes and organic edges over a paper texture to add warm pop to any map.\nhttp://maps.stamen.com",
      category: "Other",
      creationFunction: function () {
        return new OpenStreetMapImageryProvider({
          url: "https://stamen-tiles.a.ssl.fastly.net/watercolor/",
          credit:
            "Map tiles by Stamen Design, under CC BY 3.0. Data by OpenStreetMap, under CC BY SA.",
        });
      },
    })
  );

  providerViewModels.push(
    new ProviderViewModel({
      name: "Stamen Toner",
      iconUrl: buildModuleUrl(
        "Widgets/Images/ImageryProviders/stamenToner.png"
      ),
      tooltip: "A high contrast black and white map.\nhttp://maps.stamen.com",
      category: "Other",
      creationFunction: function () {
        return new OpenStreetMapImageryProvider({
          url: "https://stamen-tiles.a.ssl.fastly.net/toner/",
          credit:
            "Map tiles by Stamen Design, under CC BY 3.0. Data by OpenStreetMap, under CC BY SA.",
        });
      },
    })
  );

  providerViewModels.push(
    new ProviderViewModel({
      name: "Sentinel-2",
      iconUrl: buildModuleUrl("Widgets/Images/ImageryProviders/sentinel-2.png"),
      tooltip:
        "Sentinel-2 cloudless by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016 and 2017).",
      category: "Cesium ion",
      creationFunction: function () {
        return IonImageryProvider.fromAssetId(3954);
      },
    })
  );

  providerViewModels.push(
    new ProviderViewModel({
      name: "Blue Marble",
      iconUrl: buildModuleUrl("Widgets/Images/ImageryProviders/blueMarble.png"),
      tooltip: "Blue Marble Next Generation July, 2004 imagery from NASA.",
      category: "Cesium ion",
      creationFunction: function () {
        return IonImageryProvider.fromAssetId(3845);
      },
    })
  );

  providerViewModels.push(
    new ProviderViewModel({
      name: "Earth at night",
      iconUrl: buildModuleUrl(
        "Widgets/Images/ImageryProviders/earthAtNight.png"
      ),
      tooltip:
        "The Earth at night, also known as The Black Marble, is a 500 meter resolution global composite imagery layer released by NASA.",
      category: "Cesium ion",
      creationFunction: function () {
        return IonImageryProvider.fromAssetId(3812);
      },
    })
  );

  providerViewModels.push(
    new ProviderViewModel({
      name: "Natural Earth\u00a0II",
      iconUrl: buildModuleUrl(
        "Widgets/Images/ImageryProviders/naturalEarthII.png"
      ),
      tooltip:
        "Natural Earth II, darkened for contrast.\nhttp://www.naturalearthdata.com/",
      category: "Cesium ion",
      creationFunction: function () {
        return TileMapServiceImageryProvider.fromUrl(
          buildModuleUrl("Assets/Textures/NaturalEarthII")
        );
      },
    })
  );

  return providerViewModels;
}
export default createDefaultImageryProviderViewModels;
