/*global define*/
define([
        '../../Core/buildModuleUrl',
        '../../Scene/ArcGisMapServerImageryProvider',
        '../../Scene/BingMapsImageryProvider',
        '../../Scene/BingMapsStyle',
        '../../Scene/OpenStreetMapImageryProvider',
        '../../Scene/TileMapServiceImageryProvider',
        '../BaseLayerPicker/ProviderViewModel'
    ], function(
        buildModuleUrl,
        ArcGisMapServerImageryProvider,
        BingMapsImageryProvider,
        BingMapsStyle,
        OpenStreetMapImageryProvider,
        TileMapServiceImageryProvider,
        ProviderViewModel) {
    "use strict";

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
                    url : '//dev.virtualearth.net',
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
                    url : '//dev.virtualearth.net',
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
                    url : '//dev.virtualearth.net',
                    mapStyle : BingMapsStyle.ROAD
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
                    url : '//services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
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
                    url : '//services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer'
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
                    url : '//services.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/'
                });
            }
        }));

        providerViewModels.push(new ProviderViewModel({
            name : 'Open\u00adStreet\u00adMap',
            iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/openStreetMap.png'),
            tooltip : 'OpenStreetMap (OSM) is a collaborative project to create a free editable map \
of the world.\nhttp://www.openstreetmap.org',
            creationFunction : function() {
                return new OpenStreetMapImageryProvider({
                    url : '//a.tile.openstreetmap.org/'
                });
            }
        }));

        providerViewModels.push(new ProviderViewModel({
            name : 'Stamen Watercolor',
            iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/stamenWatercolor.png'),
            tooltip : 'Reminiscent of hand drawn maps, Stamen watercolor maps apply raster effect \
area washes and organic edges over a paper texture to add warm pop to any map.\nhttp://maps.stamen.com',
            creationFunction : function() {
                return new OpenStreetMapImageryProvider({
                    url : '//stamen-tiles.a.ssl.fastly.net/watercolor/',
                    credit : 'Map tiles by Stamen Design, under CC BY 3.0. Data by OpenStreetMap, under CC BY SA.'
                });
            }
        }));

        providerViewModels.push(new ProviderViewModel({
            name : 'Stamen Toner',
            iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/stamenToner.png'),
            tooltip : 'A high contrast black and white map.\nhttp://maps.stamen.com',
            creationFunction : function() {
                return new OpenStreetMapImageryProvider({
                    url : '//stamen-tiles.a.ssl.fastly.net/toner/',
                    credit : 'Map tiles by Stamen Design, under CC BY 3.0. Data by OpenStreetMap, under CC BY SA.'
                });
            }
        }));

        providerViewModels.push(new ProviderViewModel({
            name : 'MapQuest Open\u00adStreet\u00adMap',
            iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/mapQuestOpenStreetMap.png'),
            tooltip : 'OpenStreetMap (OSM) is a collaborative project to create a free editable \
map of the world.\nhttp://www.openstreetmap.org',
            creationFunction : function() {
                return new OpenStreetMapImageryProvider({
                    url : '//otile1-s.mqcdn.com/tiles/1.0.0/osm/'
                });
            }
        }));

        providerViewModels.push(new ProviderViewModel({
            name : 'The Black Marble',
            iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/blackMarble.png'),
            tooltip : 'The lights of cities and villages trace the outlines of civilization in this global view of the \
Earth at night as seen by NASA/NOAA\'s Suomi NPP satellite.',
            creationFunction : function() {
                return new TileMapServiceImageryProvider({
                    url : '//cesiumjs.org/blackmarble',
                    maximumLevel : 8,
                    credit : 'Black Marble imagery courtesy NASA Earth Observatory'
                });
            }
        }));

        providerViewModels.push(new ProviderViewModel({
            name : 'Natural Earth\u00a0II',
            iconUrl : buildModuleUrl('Widgets/Images/ImageryProviders/naturalEarthII.png'),
            tooltip : 'Natural Earth II, darkened for contrast.\nhttp://www.naturalearthdata.com/',
            creationFunction : function() {
                return new TileMapServiceImageryProvider({
                    url : buildModuleUrl('Assets/Textures/NaturalEarthII')
                });
            }
        }));

        return providerViewModels;
    }

    return createDefaultImageryProviderViewModels;
});