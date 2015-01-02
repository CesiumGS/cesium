/*global defineSuite*/
defineSuite([
             'Core/OGCHelper',
             'Core/defined',
             'Core/Rectangle',
             'Specs/waitsForPromise'
             ], function(
                     OGCHelper,
                     defined,
                     Rectangle,
                     waitsForPromise) {
    "use strict";
    /*global jasmine,describe,xdescribe,it,xit,expect,beforeEach,afterEach,beforeAll,afterAll,spyOn,runs,waits,waitsFor*/

    it('requires url or xml to be specified', function() {
        function createWithoutUrlorXML() {
            return OGCHelper.parser({});
        }
        expect(createWithoutUrlorXML).toThrowDeveloperError();

        waitsForPromise(OGCHelper.parser({url:'Data/OGCHelper/WMS/wms-getcapabilitiesgwc.xml',service:'WMS'}), function(tab) {
            expect(tab.length).toEqual(1);
        });

        var xmlWMS='<?xml version="1.0" encoding="UTF-8"?><WMT_MS_Capabilities version="1.1.1"><Service>  <Name>OGC:WMS</Name>  <Title>Web Map Service - GeoWebCache</Title>  <OnlineResource xmlns:xlink="http://www.w3.org/1999/xlink" xlink:type="simple" xlink:href="http://localhost:8090/geoserver/gwc/service/wms?SERVICE=WMS&amp;"/></Service><Capability>  <Request> <GetCapabilities><Format>application/vnd.ogc.wms_xml</Format><DCPType>  <HTTP> <Get><OnlineResource xmlns:xlink="http://www.w3.org/1999/xlink" xlink:type="simple" xlink:href="http://localhost:8090/geoserver/gwc/service/wms?SERVICE=WMS&amp;"/> </Get>  </HTTP></DCPType> </GetCapabilities> <GetMap><Format>image/png</Format><DCPType>  <HTTP> <Get><OnlineResource xmlns:xlink="http://www.w3.org/1999/xlink" xlink:type="simple" xlink:href="http://localhost:8090/geoserver/gwc/service/wms?SERVICE=WMS&amp;"/> </Get>  </HTTP></DCPType> </GetMap> <GetFeatureInfo><Format>text/plain</Format><Format>application/json</Format><Format>application/vnd.ogc.gml</Format><Format>text/html</Format><DCPType>  <HTTP>  <Get> <OnlineResource xmlns:xlink="http://www.w3.org/1999/xlink" xlink:type="simple" xlink:href="http://localhost:8090/geoserver/gwc/service/wms?SERVICE=WMS&amp;"/>  </Get>  </HTTP></DCPType> </GetFeatureInfo> <DescribeLayer><Format>application/vnd.ogc.wms_xml</Format><DCPType>  <HTTP>  <Get> <OnlineResource xmlns:xlink="http://www.w3.org/1999/xlink" xlink:type="simple" xlink:href="http://localhost:8090/geoserver/gwc/service/wms?SERVICE=WMS&amp;"/>  </Get>  </HTTP></DCPType> </DescribeLayer> <GetLegendGraphic><Format>image/png</Format><Format>image/jpeg</Format><Format>image/gif</Format><DCPType>  <HTTP>  <Get> <OnlineResource xmlns:xlink="http://www.w3.org/1999/xlink" xlink:type="simple" xlink:href="http://localhost:8090/geoserver/gwc/service/wms?SERVICE=WMS&amp;"/>  </Get>  </HTTP></DCPType> </GetLegendGraphic>  </Request>  <Exception> <Format>application/vnd.ogc.se_xml</Format>  </Exception>  <Layer> <Title>GeoWebCache WMS</Title> <Abstract>Note that not all GeoWebCache instances provide a full WMS service.</Abstract> <LatLonBoundingBox minx="-180.0" miny="-90.0" maxx="180.0" maxy="90.0"/> <Layer queryable="1"><Name>carto:routeFrance</Name><Title>routeFrance</Title><Abstract>null</Abstract><SRS>EPSG:4326</SRS><LatLonBoundingBox minx="-4.0" miny="40.0" maxx="4.0" maxy="50.0"/><Dimension name="elevation" units="meters" default="500" multipleValues="1" nearestValue="0">500, 490, 480</Dimension><Dimension name="text_dimension" units="my_units"  multipleValues="1"  nearestValue="0">first, second, third</Dimension><BoundingBox SRS="EPSG:4326" minx="-180.0" miny="-90.0" maxx="180.0" maxy="90.0"/> </Layer>  </Layer></Capability></WMT_MS_Capabilities>';
        waitsForPromise(OGCHelper.parser({xml:xmlWMS,service:'WMS'}), function(tab) {
            expect(tab.length).toEqual(1);
        });
    });

    it('TMS parser specifications', function() {
        waitsForPromise(OGCHelper.parser({url:'Data/OGCHelper/TMS/tms-getcapabilitiesSRTM90Colored.xml',service:'TMS',tileMapWidth:300,tileMapHeight:400}), function(tab) {
            expect(tab.length).toEqual(1);
            expect(tab[0].layerName).toEqual('SRTM90Colored');
            var capabilities=tab[0].capabilities;
            expect(capabilities.tileMapWidth).toEqual(256);
            expect(capabilities.tileMapHeight).toEqual(256);
            expect(capabilities.getTileDataAvailable(0,0,0)).toEqual(true);
            expect(capabilities.getTileDataAvailable(1,0,0)).toEqual(false);
            expect(capabilities.formatImage).toEqual({format: "image/png", extension: "png"});
            expect(capabilities.formatArray).toEqual(undefined);
            expect(capabilities.maxLevel).toEqual(13);
            expect(capabilities.rectangle).toEqual(new Rectangle(-180.0,-90.0,0.0,0.0));
            expect(capabilities.getURLImage(0,0,0)).toEqual("http://localhost:8090/geoserver/gwc/service/tms/1.0.0/elevation%3ASRTM90Colored@EPSG%3A4326@png/0/0/0.png");
            expect(capabilities.getURLImage(1,0,0)).toEqual("");
        });

        waitsForPromise(OGCHelper.parser({url:'Data/OGCHelper/TMS/tms-getcapabilitiesSRTM90ColoredBlunt.xml',service:'TMS',tileMapWidth:300,tileMapHeight:400,formatArray:{format : 'image/blunt',
            extension: 'blunt'}}), function(tab) {
            expect(tab.length).toEqual(1);
            expect(tab[0].layerName).toEqual('SRTM90Colored');
            var capabilities=tab[0].capabilities;
            expect(capabilities.tileMapWidth).toEqual(256);
            expect(capabilities.tileMapHeight).toEqual(256);
            expect(capabilities.getTileDataAvailable(0,0,0)).toEqual(true);
            expect(capabilities.getTileDataAvailable(1,0,0)).toEqual(false);
            expect(capabilities.formatImage).toEqual(undefined);
            expect(capabilities.maxLevel).toEqual(13);
            expect(capabilities.rectangle).toEqual(new Rectangle(-180.0,-90.0,0.0,0.0));
            expect(capabilities.formatArray).toEqual({format: "image/blunt", extension: "blunt"});
            expect(capabilities.getURLArray(0,0,0)).toEqual("http://localhost:8090/geoserver/gwc/service/tms/1.0.0/elevation%3ASRTM90Colored@EPSG%3A4326@png/0/0/0.blunt");
            expect(capabilities.getURLArray(1,0,0)).toEqual("");
        });
    });

    it('WMTS parser specifications', function() {
        waitsForPromise(OGCHelper.parser({url:'Data/OGCHelper/WMTS/WMTS.xml',service:'WMTS',tileMapWidth:300,tileMapHeight:400}), function(tab) {
            expect(tab.length).toEqual(1);
            expect(tab[0].layerName).toEqual('WorldTimeZones');
            var capabilities=tab[0].capabilities;
            expect(capabilities.tileMapWidth).toEqual(256);
            expect(capabilities.tileMapHeight).toEqual(256);
            expect(capabilities.getTileDataAvailable(0,1,0)).toEqual(true);
            expect(capabilities.getTileDataAvailable(1,0,0)).toEqual(false);
            expect(capabilities.formatImage).toEqual({format: "image/png", extension: "png"});
            expect(capabilities.formatArray.format).toEqual("image/bil");
            expect(capabilities.maxLevel).toEqual(19);
            expect(capabilities.rectangle).toEqual(new Rectangle(0,-20037507.067161843,20037507.067161843,0));
            expect(capabilities.getURLImage(0,1,0)).toEqual("http://sampleserver6.arcgisonline.com/arcgis/rest/services/WorldTimeZones/MapServer/WMTS/tile/1.0.0/WorldTimeZones/default/2011-10-04/0/default028mm/0/1/0.png");
            expect(capabilities.getURLImage(0,0,0)).toEqual("");
            expect(capabilities.getURLArray(0,1,0)).toEqual("http://sampleserver6.arcgisonline.com/arcgis/rest/services/WorldTimeZones/MapServer/WMTS?service=WMTS&request=GetTile&version=1.0.0&layer=WorldTimeZones&style=default&format=image/bil&TileMatrixSet=default028mm&TileMatrix=0&TileRow=1&TileCol=0&time=2011-10-04&elevation=0");
            expect(capabilities.getURLArray(0,0,0)).toEqual("");
            expect(capabilities.styles[0]).toEqual("default");
            expect(capabilities.styles[1]).toEqual("blue");
            expect(capabilities.dimensions.length).toEqual(2);
            expect(capabilities.getURLImage(0,1,0,{style:"blue",dimensions:[{name:"elevation",value:"300"}]})).toEqual("http://sampleserver6.arcgisonline.com/arcgis/rest/services/WorldTimeZones/MapServer/WMTS/tile/1.0.0/WorldTimeZones/blue/2011-10-04/300/default028mm/0/1/0.png");
            expect(capabilities.getURLImage(0,1,0,{style:"blue",dimensions:[{name:"elevation",value:"30"}]})).toEqual("");
        });

        waitsForPromise(OGCHelper.parser({url:'Data/OGCHelper/WMTS/WMTS.xml',service:'WMTS',formatImage:{format : 'image/blunt',extension: 'blunt'},formatArray:{format : 'array/blunt',
            extension: 'blunt'},formatFeatureInfo:{format : 'info/blunt',extension: 'blunt'}}), function(tab) {
            expect(tab.length).toEqual(1);
            expect(tab[0].layerName).toEqual('WorldTimeZones');
            var capabilities=tab[0].capabilities;
            expect(capabilities.tileMapWidth).toEqual(256);
            expect(capabilities.tileMapHeight).toEqual(256);
            expect(capabilities.getTileDataAvailable(0,1,0)).toEqual(true);
            expect(capabilities.getTileDataAvailable(1,0,0)).toEqual(false);
            expect(capabilities.formatImage).toEqual({format: "image/blunt", extension: "blunt"});
            expect(capabilities.formatArray.format).toEqual("array/blunt");
            expect(capabilities.formatFeatureInfo.format).toEqual("info/blunt");
            expect(capabilities.maxLevel).toEqual(19);
            expect(capabilities.rectangle).toEqual(new Rectangle(0,-20037507.067161843,20037507.067161843,0));
            expect(capabilities.getURLImage(0,1,0)).toEqual("http://sampleserver6.arcgisonline.com/arcgis/rest/services/WorldTimeZones/MapServer/WMTS?service=WMTS&request=GetTile&version=1.0.0&layer=WorldTimeZones&style=default&format=image/blunt&TileMatrixSet=default028mm&TileMatrix=0&TileRow=1&TileCol=0&time=2011-10-04&elevation=0");
            expect(capabilities.getURLImage(0,0,0)).toEqual("");
            expect(capabilities.getURLArray(0,1,0)).toEqual("http://sampleserver6.arcgisonline.com/arcgis/rest/services/WorldTimeZones/MapServer/WMTS?service=WMTS&request=GetTile&version=1.0.0&layer=WorldTimeZones&style=default&format=array/blunt&TileMatrixSet=default028mm&TileMatrix=0&TileRow=1&TileCol=0&time=2011-10-04&elevation=0");
            expect(capabilities.getURLArray(0,0,0)).toEqual("");
            expect(capabilities.getURLFeatureInfoArray(0,1,0)).toEqual("http://sampleserver6.arcgisonline.com/WMTS?service=WMTS&request=GetFeatureInfo&version=1.0.0&layer=WorldTimeZones&style=default&format=array/blunt&TileMatrixSet=default028mm&TileMatrix=0&TileRow=1&TileCol=0&time=2011-10-04&elevation=0&i=0&j=0&infoFormat=info/blunt");
            expect(capabilities.getURLFeatureInfoArray(0,0,0)).toEqual("");
            expect(capabilities.styles[0]).toEqual("default");
            expect(capabilities.styles[1]).toEqual("blue");
            expect(capabilities.dimensions.length).toEqual(2);
            expect(capabilities.getURLImage(0,1,0,{style:"blue",dimensions:[{name:"elevation",value:"300"}]})).toEqual("http://sampleserver6.arcgisonline.com/arcgis/rest/services/WorldTimeZones/MapServer/WMTS?service=WMTS&request=GetTile&version=1.0.0&layer=WorldTimeZones&style=blue&format=image/blunt&TileMatrixSet=default028mm&TileMatrix=0&TileRow=1&TileCol=0&time=2011-10-04&elevation=300");
            expect(capabilities.getURLImage(0,1,0,{style:"blue",dimensions:[{name:"elevation",value:"30"}]})).toEqual("");
            expect(capabilities.getURLFeatureInfoArray(0,1,0,{style:"blue",dimensions:[{name:"elevation",value:"300"}],i:30,j:15})).toEqual("http://sampleserver6.arcgisonline.com/WMTS?service=WMTS&request=GetFeatureInfo&version=1.0.0&layer=WorldTimeZones&style=blue&format=array/blunt&TileMatrixSet=default028mm&TileMatrix=0&TileRow=1&TileCol=0&time=2011-10-04&elevation=300&i=30&j=15&infoFormat=info/blunt");
            expect(capabilities.getURLFeatureInfoImage(0,1,0,{style:"blue",dimensions:[{name:"elevation",value:"300"}],i:30,j:15})).toEqual("http://sampleserver6.arcgisonline.com/WMTS?service=WMTS&request=GetFeatureInfo&version=1.0.0&layer=WorldTimeZones&style=blue&format=image/blunt&TileMatrixSet=default028mm&TileMatrix=0&TileRow=1&TileCol=0&time=2011-10-04&elevation=300&i=30&j=15&infoFormat=info/blunt");
        });
    });

    it('WMS 1.1.1 parser specifications', function() {
        waitsForPromise(OGCHelper.parser({url:'Data/OGCHelper/WMS/getcapabilities_1.1.1geoserver.xml',service:'WMS',tileMapWidth:300,tileMapHeight:400}), function(tab) {
            expect(tab.length).toEqual(3);
            expect(tab[0].layerName).toEqual('elevation:SRTM90');
            expect(tab[1].layerName).toEqual('carto:carto250');
            var capabilities=tab[1].capabilities;
            expect(capabilities.tileMapWidth).toEqual(300);
            expect(capabilities.tileMapHeight).toEqual(400);
            expect(capabilities.getTileDataAvailable(1,1,1)).toEqual(true);
            expect(capabilities.getTileDataAvailable(3,1,1)).toEqual(false);
            expect(capabilities.formatImage).toEqual({format: "image/png", extension: "png"});
            expect(capabilities.formatArray.format).toEqual("image/bil");
            expect(capabilities.maxLevel).toEqual(undefined);
            expect(capabilities.rectangle).toEqual(new Rectangle(-180,-90,0,0));
            expect(capabilities.getURLImage(1,1,1)).toEqual("http://localhost:8090/geoserver/wms?SERVICE=WMS&REQUEST=GetMap&LAYERS=carto:carto250&VERSION=1.1.1&BBOX=-90.15050167224081,-90.11278195488721,0.1505016722408027,0.11278195488721804&FORMAT=image/png&WIDTH=300&HEIGHT=400&STYLES=raster&STYLE=raster&elevation=500&dim_text_dimension=first");
            expect(capabilities.getURLImage(3,1,1)).toEqual("");
            expect(capabilities.getURLArray(1,1,1)).toEqual("http://localhost:8090/geoserver/wms?SERVICE=WMS&REQUEST=GetMap&LAYERS=carto:carto250&VERSION=1.1.1&BBOX=-90.15050167224081,-90.11278195488721,0.1505016722408027,0.11278195488721804&FORMAT=image/bil&WIDTH=300&HEIGHT=400&STYLES=raster&STYLE=raster&elevation=500&dim_text_dimension=first");
            expect(capabilities.getURLArray(3,1,1)).toEqual("");
            expect(capabilities.styles[1]).toEqual("blue");
            expect(capabilities.dimensions.length).toEqual(2);
            expect(capabilities.getURLImage(1,1,1,{style:"blue",dimensions:[{name:"elevation",value:"500"}]})).toEqual("http://localhost:8090/geoserver/wms?SERVICE=WMS&REQUEST=GetMap&LAYERS=carto:carto250&VERSION=1.1.1&BBOX=-90.15050167224081,-90.11278195488721,0.1505016722408027,0.11278195488721804&FORMAT=image/png&WIDTH=300&HEIGHT=400&STYLES=blue&STYLE=blue&elevation=500&dim_text_dimension=first");
            expect(capabilities.getURLImage(1,1,1,{style:"raster",dimensions:[{name:"elevation",value:"300"}]})).toEqual("");
            expect(capabilities.getURLFeatureInfoArray(1,1,1,{style:"blue",dimensions:[{name:"elevation",value:"500"}],i:30,j:15})).toEqual("http://localhost:8090/geoserver/wms?SERVICE=WMS&REQUEST=GetFeatureInfo&LAYERS=carto:carto250&VERSION=1.1.1&BBOX=-90.15050167224081,-90.11278195488721,0.1505016722408027,0.11278195488721804&FORMAT=image/bil&WIDTH=300&HEIGHT=400&STYLES=blue&STYLE=blue&elevation=500&dim_text_dimension=first&QUERY_LAYERS=carto:carto250&INFO_FORMAT=application/json&I=30&J=15&X=30&Y=15");
            expect(capabilities.getURLFeatureInfoImage(1,1,1,{style:"blue",dimensions:[{name:"elevation",value:"500"}],i:30,j:15})).toEqual("http://localhost:8090/geoserver/wms?SERVICE=WMS&REQUEST=GetFeatureInfo&LAYERS=carto:carto250&VERSION=1.1.1&BBOX=-90.15050167224081,-90.11278195488721,0.1505016722408027,0.11278195488721804&FORMAT=image/png&WIDTH=300&HEIGHT=400&STYLES=blue&STYLE=blue&elevation=500&dim_text_dimension=first&QUERY_LAYERS=carto:carto250&INFO_FORMAT=application/json&I=30&J=15&X=30&Y=15");
        });

        waitsForPromise(OGCHelper.parser({url:'Data/OGCHelper/WMS/getcapabilities_1.1.1geoserver.xml',service:'WMS',tileMapWidth:300,tileMapHeight:400,formatImage:{format : 'image/blunt',extension: 'blunt'},formatArray:{format : 'array/blunt',
            extension: 'blunt'},formatFeatureInfo:{format : 'info/blunt',extension: 'blunt'}}), function(tab) {
            expect(tab.length).toEqual(3);
            expect(tab[0].layerName).toEqual('elevation:SRTM90');
            expect(tab[1].layerName).toEqual('carto:carto250');
            var capabilities=tab[1].capabilities;
            expect(capabilities.tileMapWidth).toEqual(300);
            expect(capabilities.tileMapHeight).toEqual(400);
            expect(capabilities.getTileDataAvailable(1,1,1)).toEqual(true);
            expect(capabilities.getTileDataAvailable(3,1,1)).toEqual(false);
            expect(capabilities.formatImage).toEqual({format: "image/blunt", extension: "blunt"});
            expect(capabilities.formatArray.format).toEqual("array/blunt");
            expect(capabilities.maxLevel).toEqual(undefined);
            expect(capabilities.rectangle).toEqual(new Rectangle(-180,-90,0,0));
            expect(capabilities.getURLImage(1,1,1)).toEqual("http://localhost:8090/geoserver/wms?SERVICE=WMS&REQUEST=GetMap&LAYERS=carto:carto250&VERSION=1.1.1&BBOX=-90.15050167224081,-90.11278195488721,0.1505016722408027,0.11278195488721804&FORMAT=image/blunt&WIDTH=300&HEIGHT=400&STYLES=raster&STYLE=raster&elevation=500&dim_text_dimension=first");
            expect(capabilities.getURLImage(3,1,1)).toEqual("");
            expect(capabilities.getURLArray(1,1,1)).toEqual("http://localhost:8090/geoserver/wms?SERVICE=WMS&REQUEST=GetMap&LAYERS=carto:carto250&VERSION=1.1.1&BBOX=-90.15050167224081,-90.11278195488721,0.1505016722408027,0.11278195488721804&FORMAT=array/blunt&WIDTH=300&HEIGHT=400&STYLES=raster&STYLE=raster&elevation=500&dim_text_dimension=first");
            expect(capabilities.getURLArray(3,1,1)).toEqual("");
            expect(capabilities.styles[1]).toEqual("blue");
            expect(capabilities.dimensions.length).toEqual(2);
            expect(capabilities.getURLImage(1,1,1,{style:"blue",dimensions:[{name:"elevation",value:"500"}]})).toEqual("http://localhost:8090/geoserver/wms?SERVICE=WMS&REQUEST=GetMap&LAYERS=carto:carto250&VERSION=1.1.1&BBOX=-90.15050167224081,-90.11278195488721,0.1505016722408027,0.11278195488721804&FORMAT=image/blunt&WIDTH=300&HEIGHT=400&STYLES=blue&STYLE=blue&elevation=500&dim_text_dimension=first");
            expect(capabilities.getURLImage(1,1,1,{style:"raster",dimensions:[{name:"elevation",value:"300"}]})).toEqual("");
            expect(capabilities.getURLFeatureInfoArray(1,1,1,{style:"blue",dimensions:[{name:"elevation",value:"500"}],i:30,j:15})).toEqual("http://localhost:8090/geoserver/wms?SERVICE=WMS&REQUEST=GetFeatureInfo&LAYERS=carto:carto250&VERSION=1.1.1&BBOX=-90.15050167224081,-90.11278195488721,0.1505016722408027,0.11278195488721804&FORMAT=array/blunt&WIDTH=300&HEIGHT=400&STYLES=blue&STYLE=blue&elevation=500&dim_text_dimension=first&QUERY_LAYERS=carto:carto250&INFO_FORMAT=info/blunt&I=30&J=15&X=30&Y=15");
            expect(capabilities.getURLFeatureInfoImage(1,1,1,{style:"blue",dimensions:[{name:"elevation",value:"500"}],i:30,j:15})).toEqual("http://localhost:8090/geoserver/wms?SERVICE=WMS&REQUEST=GetFeatureInfo&LAYERS=carto:carto250&VERSION=1.1.1&BBOX=-90.15050167224081,-90.11278195488721,0.1505016722408027,0.11278195488721804&FORMAT=image/blunt&WIDTH=300&HEIGHT=400&STYLES=blue&STYLE=blue&elevation=500&dim_text_dimension=first&QUERY_LAYERS=carto:carto250&INFO_FORMAT=info/blunt&I=30&J=15&X=30&Y=15");
        });

        waitsForPromise(OGCHelper.parser({url:'Data/OGCHelper/WMS/wms-getcapabilitiesgwc.xml',service:'WMS',tileMapWidth:300,tileMapHeight:400,formatImage:{format : 'image/blunt',extension: 'blunt'},formatArray:{format : 'array/blunt',
            extension: 'blunt'},formatFeatureInfo:{format : 'info/blunt',extension: 'blunt'}}), function(tab) {
            expect(tab.length).toEqual(1);
            expect(tab[0].layerName).toEqual('carto:carto250');
            var capabilities=tab[0].capabilities;
            expect(capabilities.tileMapWidth).toEqual(700);
            expect(capabilities.tileMapHeight).toEqual(700);
            expect(capabilities.getTileDataAvailable(1,1,1)).toEqual(true);
            expect(capabilities.getTileDataAvailable(3,1,1)).toEqual(false);
            expect(capabilities.formatImage).toEqual({format: "image/blunt", extension: "blunt"});
            expect(capabilities.formatArray.format).toEqual("array/blunt");
            expect(capabilities.maxLevel).toEqual(undefined);
            expect(capabilities.rectangle).toEqual(new Rectangle(-180,-90,0,0));
            expect(capabilities.getURLImage(1,1,1)).toEqual("http://localhost:8090/geoserver/gwc/service/wms?SERVICE=WMS&REQUEST=GetMap&LAYERS=carto:carto250&VERSION=1.1.1&BBOX=-90.06437768240343,-90.06437768240343,0.06437768240343347,0.06437768240343347&FORMAT=image/blunt&WIDTH=700&HEIGHT=700&STYLES=raster&STYLE=raster&elevation=500&dim_text_dimension=first");
            expect(capabilities.getURLImage(3,1,1)).toEqual("");
            expect(capabilities.getURLArray(1,1,1)).toEqual("http://localhost:8090/geoserver/gwc/service/wms?SERVICE=WMS&REQUEST=GetMap&LAYERS=carto:carto250&VERSION=1.1.1&BBOX=-90.06437768240343,-90.06437768240343,0.06437768240343347,0.06437768240343347&FORMAT=array/blunt&WIDTH=700&HEIGHT=700&STYLES=raster&STYLE=raster&elevation=500&dim_text_dimension=first");
            expect(capabilities.getURLArray(3,1,1)).toEqual("");
            expect(capabilities.styles[1]).toEqual("blue");
            expect(capabilities.dimensions.length).toEqual(2);
            expect(capabilities.getURLImage(1,1,1,{style:"blue",dimensions:[{name:"elevation",value:"500"}]})).toEqual("http://localhost:8090/geoserver/gwc/service/wms?SERVICE=WMS&REQUEST=GetMap&LAYERS=carto:carto250&VERSION=1.1.1&BBOX=-90.06437768240343,-90.06437768240343,0.06437768240343347,0.06437768240343347&FORMAT=image/blunt&WIDTH=700&HEIGHT=700&STYLES=blue&STYLE=blue&elevation=500&dim_text_dimension=first");
            expect(capabilities.getURLImage(1,1,1,{style:"raster",dimensions:[{name:"elevation",value:"300"}]})).toEqual("");
            expect(capabilities.getURLFeatureInfoArray(1,1,1,{style:"blue",dimensions:[{name:"elevation",value:"500"}],i:30,j:15})).toEqual("http://localhost:8090/geoserver/gwc/service/wms?SERVICE=WMS&REQUEST=GetFeatureInfo&LAYERS=carto:carto250&VERSION=1.1.1&BBOX=-90.06437768240343,-90.06437768240343,0.06437768240343347,0.06437768240343347&FORMAT=array/blunt&WIDTH=700&HEIGHT=700&STYLES=blue&STYLE=blue&elevation=500&dim_text_dimension=first&QUERY_LAYERS=carto:carto250&INFO_FORMAT=info/blunt&I=30&J=15&X=30&Y=15");
            expect(capabilities.getURLFeatureInfoImage(1,1,1,{style:"blue",dimensions:[{name:"elevation",value:"500"}],i:30,j:15})).toEqual("http://localhost:8090/geoserver/gwc/service/wms?SERVICE=WMS&REQUEST=GetFeatureInfo&LAYERS=carto:carto250&VERSION=1.1.1&BBOX=-90.06437768240343,-90.06437768240343,0.06437768240343347,0.06437768240343347&FORMAT=image/blunt&WIDTH=700&HEIGHT=700&STYLES=blue&STYLE=blue&elevation=500&dim_text_dimension=first&QUERY_LAYERS=carto:carto250&INFO_FORMAT=info/blunt&I=30&J=15&X=30&Y=15");
        });
    });

    it('WMS 1.3.0 parser specifications', function() {
        waitsForPromise(OGCHelper.parser({url:'Data/OGCHelper/WMS/getcapabilities_1.3.0geoserver.xml',service:'WMS',tileMapWidth:300,tileMapHeight:400,formatImage:{format : 'image/blunt',extension: 'blunt'},formatArray:{format : 'array/blunt',
            extension: 'blunt'},formatFeatureInfo:{format : 'info/blunt',extension: 'blunt'}}), function(tab) {
            expect(tab.length).toEqual(1);
            expect(tab[0].layerName).toEqual('elevation:SRTM90');
            var capabilities=tab[0].capabilities;
            expect(capabilities.tileMapWidth).toEqual(500);
            expect(capabilities.tileMapHeight).toEqual(500);
            expect(capabilities.getTileDataAvailable(1,1,1)).toEqual(true);
            expect(capabilities.getTileDataAvailable(3,1,1)).toEqual(false);
            expect(capabilities.formatImage).toEqual({format: "image/blunt", extension: "blunt"});
            expect(capabilities.formatArray.format).toEqual("array/blunt");
            expect(capabilities.maxLevel).toEqual(undefined);
            expect(capabilities.rectangle).toEqual(new Rectangle(-180,-90,0,0));
            expect(capabilities.getURLImage(1,1,1)).toEqual("http://localhost:8090/geoserver/ows?SERVICE=WMS&REQUEST=GetMap&LAYERS=elevation:SRTM90&VERSION=1.3.0&BBOX=-90.09018036072145,-90.09018036072145,0.09018036072144289,0.09018036072144289&FORMAT=image/blunt&WIDTH=500&HEIGHT=500&STYLES=raster&STYLE=raster&elevation=500&dim_text_dimension=first");
            expect(capabilities.getURLImage(3,1,1)).toEqual("");
            expect(capabilities.getURLArray(1,1,1)).toEqual("http://localhost:8090/geoserver/ows?SERVICE=WMS&REQUEST=GetMap&LAYERS=elevation:SRTM90&VERSION=1.3.0&BBOX=-90.09018036072145,-90.09018036072145,0.09018036072144289,0.09018036072144289&FORMAT=array/blunt&WIDTH=500&HEIGHT=500&STYLES=raster&STYLE=raster&elevation=500&dim_text_dimension=first");
            expect(capabilities.getURLArray(3,1,1)).toEqual("");
            expect(capabilities.styles.length).toEqual(4);
            expect(capabilities.styles[1]).toEqual("mySLD");
            expect(capabilities.dimensions.length).toEqual(2);
            expect(capabilities.getURLImage(1,1,1,{style:"blue",dimensions:[{name:"elevation",value:"500"}]})).toEqual("http://localhost:8090/geoserver/ows?SERVICE=WMS&REQUEST=GetMap&LAYERS=elevation:SRTM90&VERSION=1.3.0&BBOX=-90.09018036072145,-90.09018036072145,0.09018036072144289,0.09018036072144289&FORMAT=image/blunt&WIDTH=500&HEIGHT=500&STYLES=blue&STYLE=blue&elevation=500&dim_text_dimension=first");
            expect(capabilities.getURLImage(1,1,1,{style:"raster",dimensions:[{name:"elevation",value:"300"}]})).toEqual("");
            expect(capabilities.getURLFeatureInfoArray(1,1,1,{style:"blue",dimensions:[{name:"elevation",value:"500"}],i:30,j:15})).toEqual("http://localhost:8090/geoserver/ows?SERVICE=WMS&REQUEST=GetFeatureInfo&LAYERS=elevation:SRTM90&VERSION=1.3.0&BBOX=-90.09018036072145,-90.09018036072145,0.09018036072144289,0.09018036072144289&FORMAT=array/blunt&WIDTH=500&HEIGHT=500&STYLES=blue&STYLE=blue&elevation=500&dim_text_dimension=first&QUERY_LAYERS=elevation:SRTM90&INFO_FORMAT=info/blunt&I=30&J=15&X=30&Y=15");
            expect(capabilities.getURLFeatureInfoImage(1,1,1,{style:"blue",dimensions:[{name:"elevation",value:"500"}],i:30,j:15})).toEqual("http://localhost:8090/geoserver/ows?SERVICE=WMS&REQUEST=GetFeatureInfo&LAYERS=elevation:SRTM90&VERSION=1.3.0&BBOX=-90.09018036072145,-90.09018036072145,0.09018036072144289,0.09018036072144289&FORMAT=image/blunt&WIDTH=500&HEIGHT=500&STYLES=blue&STYLE=blue&elevation=500&dim_text_dimension=first&QUERY_LAYERS=elevation:SRTM90&INFO_FORMAT=info/blunt&I=30&J=15&X=30&Y=15");
        });
    });
});
