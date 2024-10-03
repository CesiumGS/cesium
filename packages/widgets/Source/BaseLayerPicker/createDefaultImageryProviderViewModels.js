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
  const useRetinaTiles = devicePixelRatio >= 2.0;
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
    }),
  );

  providerViewModels.push(
    new ProviderViewModel({
      name: "Bing Maps Aerial with Labels",
      iconUrl: buildModuleUrl(
        "Widgets/Images/ImageryProviders/bingAerialLabels.png",
      ),
      tooltip: "Bing Maps aerial imagery with labels, provided by Cesium ion",
      category: "Cesium ion",
      creationFunction: function () {
        return createWorldImageryAsync({
          style: IonWorldImageryStyle.AERIAL_WITH_LABELS,
        });
      },
    }),
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
    }),
  );

  providerViewModels.push(
    new ProviderViewModel({
      name: "ArcGIS World Imagery",
      iconUrl: buildModuleUrl(
        "Widgets/Images/ImageryProviders/ArcGisMapServiceWorldImagery.png",
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
          },
        );
      },
    }),
  );

  providerViewModels.push(
    new ProviderViewModel({
      name: "ArcGIS World Hillshade",
      iconUrl: buildModuleUrl(
        "Widgets/Images/ImageryProviders/ArcGisMapServiceWorldHillshade.png",
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
          },
        );
      },
    }),
  );

  providerViewModels.push(
    new ProviderViewModel({
      name: "Esri World Ocean",
      iconUrl: buildModuleUrl(
        "Widgets/Images/ImageryProviders/ArcGisMapServiceWorldOcean.png",
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
          },
        );
      },
    }),
  );

  providerViewModels.push(
    new ProviderViewModel({
      name: "Open\u00adStreet\u00adMap",
      iconUrl: buildModuleUrl(
        "Widgets/Images/ImageryProviders/openStreetMap.png",
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
    }),
  );

  providerViewModels.push(
    new ProviderViewModel({
      name: "Stadia x Stamen Watercolor",
      iconUrl: buildModuleUrl(
        "Widgets/Images/ImageryProviders/stamenWatercolor.png",
      ),
      tooltip:
        "Based on the original basemaps created for the Knight Foundation and reminiscent of hand drawn maps, the watercolor maps from Stamen Design apply raster effect area washes and organic edges over a paper texture to add warm pop to any map.\nhttps://docs.stadiamaps.com/map-styles/stamen-watercolor/",
      category: "Other",
      creationFunction: function () {
        return new OpenStreetMapImageryProvider({
          url: "https://tiles.stadiamaps.com/tiles/stamen_watercolor/",
          fileExtension: "jpg",
          credit: `&copy; <a href="https://stamen.com/" target="_blank">Stamen Design</a>
           &copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a>
           &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a>
           &copy; <a href="https://www.openstreetmap.org/about/" target="_blank">OpenStreetMap contributors</a>`,
        });
      },
    }),
  );

  providerViewModels.push(
    new ProviderViewModel({
      name: "Stadia x Stamen Toner",
      iconUrl: buildModuleUrl(
        "Widgets/Images/ImageryProviders/stamenToner.png",
      ),
      tooltip:
        "Based on the original basemaps created for the Knight Foundation and the most popular of the excellent styles from Stamen Design, these high-contrast B+W (black and white) maps are the perfect backdrop for your colorful and eye-catching overlays.\nhttps://docs.stadiamaps.com/map-styles/stamen-toner/",
      category: "Other",
      creationFunction: function () {
        return new OpenStreetMapImageryProvider({
          url: "https://tiles.stadiamaps.com/tiles/stamen_toner/",
          retinaTiles: useRetinaTiles,
          credit: `&copy; <a href="https://stamen.com/" target="_blank">Stamen Design</a>
            &copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a>
            &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a>
            &copy; <a href="https://www.openstreetmap.org/about/" target="_blank">OpenStreetMap contributors</a>`,
        });
      },
    }),
  );

  providerViewModels.push(
    new ProviderViewModel({
      name: "Stadia Alidade Smooth",
      iconUrl: buildModuleUrl(
        "Widgets/Images/ImageryProviders/stadiaAlidadeSmooth.png",
      ),
      tooltip:
        "Stadia's custom Alidade Smooth style is designed for maps that use a lot of markers or overlays. It features a muted color scheme and fewer points of interest to allow your added data to shine.\nhttps://docs.stadiamaps.com/map-styles/alidade-smooth/",
      category: "Other",
      creationFunction: function () {
        return new OpenStreetMapImageryProvider({
          url: "https://tiles.stadiamaps.com/tiles/alidade_smooth/",
          retinaTiles: useRetinaTiles,
          credit: `&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a>
            &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a>
            &copy; <a href="https://www.openstreetmap.org/about/" target="_blank">OpenStreetMap contributors</a>`,
        });
      },
    }),
  );

  providerViewModels.push(
    new ProviderViewModel({
      name: "Stadia Alidade Smooth Dark",
      iconUrl: buildModuleUrl(
        "Widgets/Images/ImageryProviders/stadiaAlidadeSmoothDark.png",
      ),
      tooltip:
        "Stadia Alidade Smooth Dark, like its lighter cousin, is also designed to stay out of the way. It just flips the dark mode switch on the color scheme. With the lights out, your data can now literally shine.\nhttps://docs.stadiamaps.com/map-styles/alidade-smooth-dark/",
      category: "Other",
      creationFunction: function () {
        return new OpenStreetMapImageryProvider({
          url: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/",
          retinaTiles: useRetinaTiles,
          credit: `&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a>
            &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a>
            &copy; <a href="https://www.openstreetmap.org/about/" target="_blank">OpenStreetMap contributors</a>`,
        });
      },
    }),
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
    }),
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
    }),
  );

  providerViewModels.push(
    new ProviderViewModel({
      name: "Earth at night",
      iconUrl: buildModuleUrl(
        "Widgets/Images/ImageryProviders/earthAtNight.png",
      ),
      tooltip:
        "The Earth at night, also known as The Black Marble, is a 500 meter resolution global composite imagery layer released by NASA.",
      category: "Cesium ion",
      creationFunction: function () {
        return IonImageryProvider.fromAssetId(3812);
      },
    }),
  );

  providerViewModels.push(
    new ProviderViewModel({
      name: "Natural Earth\u00a0II",
      iconUrl: buildModuleUrl(
        "Widgets/Images/ImageryProviders/naturalEarthII.png",
      ),
      tooltip:
        "Natural Earth II, darkened for contrast.\nhttp://www.naturalearthdata.com/",
      category: "Cesium ion",
      creationFunction: function () {
        return TileMapServiceImageryProvider.fromUrl(
          buildModuleUrl("Assets/Textures/NaturalEarthII"),
        );
      },
    }),
  );

  return providerViewModels;
}
export default createDefaultImageryProviderViewModels;
