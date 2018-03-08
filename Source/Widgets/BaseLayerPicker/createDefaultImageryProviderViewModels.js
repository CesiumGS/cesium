define([
        '../../Core/buildModuleUrl',
        '../../Scene/ArcGisMapServerImageryProvider',
        '../../Scene/BingMapsImageryProvider',
        '../../Scene/BingMapsStyle',
        '../../Scene/createOpenStreetMapImageryProvider',
        '../../Scene/createTileMapServiceImageryProvider',
        '../../Scene/IonImageryProvider',
        '../../Scene/MapboxImageryProvider',
        '../BaseLayerPicker/ProviderViewModel'
    ], function(
        buildModuleUrl,
        ArcGisMapServerImageryProvider,
        BingMapsImageryProvider,
        BingMapsStyle,
        createOpenStreetMapImageryProvider,
        createTileMapServiceImageryProvider,
        IonImageryProvider,
        MapboxImageryProvider,
        ProviderViewModel) {
    'use strict';

    /**
     * @private
     */
    function createDefaultImageryProviderViewModels() {
        var providerViewModels = [];
        providerViewModels.push(new ProviderViewModel({
            name : 'Bing Maps Aerial',
            iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/bingAerial.png'),
            tooltip : 'Bing Maps aerial imagery \nhttp://www.bing.com/maps',
            creationFunction : function() {
                return new BingMapsImageryProvider({
                    url : 'https://dev.virtualearth.net',
                    mapStyle : BingMapsStyle.AERIAL
                });
            }
        }));

        providerViewModels.push(new ProviderViewModel({
            name : 'Bing Maps Aerial with Labels',
            iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/bingAerialLabels.png'),
            tooltip : 'Bing Maps aerial imagery with label overlays \nhttp://www.bing.com/maps',
            creationFunction : function() {
                return new BingMapsImageryProvider({
                    url : 'https://dev.virtualearth.net',
                    mapStyle : BingMapsStyle.AERIAL_WITH_LABELS
                });
            }
        }));

        providerViewModels.push(new ProviderViewModel({
            name : 'Bing Maps Roads',
            iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/bingRoads.png'),
            tooltip : 'Bing Maps standard road maps\nhttp://www.bing.com/maps',
            creationFunction : function() {
                return new BingMapsImageryProvider({
                    url : 'https://dev.virtualearth.net',
                    mapStyle : BingMapsStyle.ROAD
                });
            }
        }));

        providerViewModels.push(new ProviderViewModel({
            name: 'Mapbox Satellite',
            tooltip: 'Mapbox satellite imagery https://www.mapbox.com/maps/',
            iconUrl: buildModuleUrl('Widgets/Images/ImageryProviders/mapboxSatellite.png'),
            creationFunction: function() {
                return new MapboxImageryProvider({
                    mapId: 'mapbox.satellite'
                });
            }
        }));

        providerViewModels.push(new ProviderViewModel({
            name: 'Mapbox Streets',
            tooltip: 'Mapbox streets imagery https://www.mapbox.com/maps/',
            iconUrl: buildModuleUrl('Widgets/Images/ImageryProviders/mapboxTerrain.png'),
            creationFunction: function() {
                return new MapboxImageryProvider({
                    mapId: 'mapbox.streets'
                });
            }
        }));

        providerViewModels.push(new ProviderViewModel({
            name: 'Mapbox Streets Classic',
            tooltip: 'Mapbox streets basic imagery https://www.mapbox.com/maps/',
            iconUrl: buildModuleUrl('Widgets/Images/ImageryProviders/mapboxStreets.png'),
            creationFunction: function() {
                return new MapboxImageryProvider({
                    mapId: 'mapbox.streets-basic'
                });
            }
        }));

        providerViewModels.push(new ProviderViewModel({
            name : 'ESRI World Imagery',
            iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/esriWorldImagery.png'),
            tooltip : '\
World Imagery provides one meter or better satellite and aerial imagery in many parts of the world and lower resolution \
satellite imagery worldwide.  The map includes NASA Blue Marble: Next Generation 500m resolution imagery at small scales \
(above 1:1,000,000), i-cubed 15m eSAT imagery at medium-to-large scales (down to 1:70,000) for the world, and USGS 15m Landsat \
imagery for Antarctica. The map features 0.3m resolution imagery in the continental United States and 0.6m resolution imagery in \
parts of Western Europe from DigitalGlobe. In other parts of the world, 1 meter resolution imagery is available from GeoEye IKONOS, \
i-cubed Nationwide Prime, Getmapping, AeroGRID, IGN Spain, and IGP Portugal.  Additionally, imagery at different resolutions has been \
contributed by the GIS User Community.\nhttp://www.esri.com',
            creationFunction : function() {
                return new ArcGisMapServerImageryProvider({
                    url : 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
                    enablePickFeatures : false
                });
            }
        }));

        providerViewModels.push(new ProviderViewModel({
            name : 'ESRI World Street Map',
            iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/esriWorldStreetMap.png'),
            tooltip : '\
This worldwide street map presents highway-level data for the world. Street-level data includes the United States; much of \
Canada; Japan; most countries in Europe; Australia and New Zealand; India; parts of South America including Argentina, Brazil, \
Chile, Colombia, and Venezuela; Ghana; and parts of southern Africa including Botswana, Lesotho, Namibia, South Africa, and Swaziland.\n\
http://www.esri.com',
            creationFunction : function() {
                return new ArcGisMapServerImageryProvider({
                    url : 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer',
                    enablePickFeatures : false
                });
            }
        }));

        providerViewModels.push(new ProviderViewModel({
            name : 'ESRI National Geographic',
            iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/esriNationalGeographic.png'),
            tooltip : '\
This web map contains the National Geographic World Map service. This map service is designed to be used as a general reference map \
for informational and educational purposes as well as a basemap by GIS professionals and other users for creating web maps and web \
mapping applications.\nhttp://www.esri.com',
            creationFunction : function() {
                return new ArcGisMapServerImageryProvider({
                    url : 'https://services.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/',
                    enablePickFeatures : false
                });
            }
        }));

        providerViewModels.push(new ProviderViewModel({
            name : 'Open\u00adStreet\u00adMap',
            iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/openStreetMap.png'),
            tooltip : 'OpenStreetMap (OSM) is a collaborative project to create a free editable map \
of the world.\nhttp://www.openstreetmap.org',
            creationFunction : function() {
                return createOpenStreetMapImageryProvider({
                    url : 'https://a.tile.openstreetmap.org/'
                });
            }
        }));

        providerViewModels.push(new ProviderViewModel({
            name : 'Stamen Watercolor',
            iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/stamenWatercolor.png'),
            tooltip : 'Reminiscent of hand drawn maps, Stamen watercolor maps apply raster effect \
area washes and organic edges over a paper texture to add warm pop to any map.\nhttp://maps.stamen.com',
            creationFunction : function() {
                return createOpenStreetMapImageryProvider({
                    url : 'https://stamen-tiles.a.ssl.fastly.net/watercolor/',
                    credit : 'Map tiles by Stamen Design, under CC BY 3.0. Data by OpenStreetMap, under CC BY SA.'
                });
            }
        }));

        providerViewModels.push(new ProviderViewModel({
            name : 'Stamen Toner',
            iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/stamenToner.png'),
            tooltip : 'A high contrast black and white map.\nhttp://maps.stamen.com',
            creationFunction : function() {
                return createOpenStreetMapImageryProvider({
                    url : 'https://stamen-tiles.a.ssl.fastly.net/toner/',
                    credit : 'Map tiles by Stamen Design, under CC BY 3.0. Data by OpenStreetMap, under CC BY SA.'
                });
            }
        }));

        providerViewModels.push(new ProviderViewModel({
            name : 'Sentinel-2',
            iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/sentinel-2.png'),
            tooltip : 'Sentinel-2 cloudless by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016 and 2017).',
            creationFunction : function() {
                return new IonImageryProvider({ assetId: 3954 });
            }
        }));

        providerViewModels.push(new ProviderViewModel({
            name : 'Blue Marble',
            iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/blueMarble.png'),
            tooltip : 'Blue Marble Next Generation July, 2004 imagery from NASA.',
            creationFunction : function() {
                return new IonImageryProvider({ assetId: 3845 });
            }
        }));

        providerViewModels.push(new ProviderViewModel({
            name : 'Earth at night',
            iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/earthAtNight.png'),
            tooltip : 'The Earth at night, also known as The Black Marble, is a 500 meter resolution global composite imagery layer released by NASA.',
            creationFunction : function() {
                return new IonImageryProvider({ assetId: 3812 });
            }
        }));

        providerViewModels.push(new ProviderViewModel({
            name : 'Natural Earth\u00a0II',
            iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/naturalEarthII.png'),
            tooltip : 'Natural Earth II, darkened for contrast.\nhttp://www.naturalearthdata.com/',
            creationFunction : function() {
                return createTileMapServiceImageryProvider({
                    url : buildModuleUrl('Assets/Textures/NaturalEarthII')
                });
            }
        }));

        return providerViewModels;
    }

    return createDefaultImageryProviderViewModels;
});
