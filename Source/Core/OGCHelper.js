/*global define*/
define([
        '../Scene/ImageryLayerFeatureInfo',
        '../ThirdParty/when',
        './Cartographic',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Ellipsoid',
        './GeographicTilingScheme',
        './loadJson',
        './loadXML',
        './OGCCapabilities',
        './Rectangle',
        './WebMercatorTilingScheme'
        ], function(
                ImageryLayerFeatureInfo,
                when,
                Cartographic,
                defaultValue,
                defined,
                DeveloperError,
                Ellipsoid,
                GeographicTilingScheme,
                loadJson,
                loadXML,
                OGCCapabilities,
                Rectangle,
                WebMercatorTilingScheme) {
    "use strict";
    /* global console,XMLDocument */
    /**
     * Helper to parse OGC services (WMS,TMS,WMTS,WCS)
     * @alias OGCHelper
     * @namespace
     * @see OGCCapabilities
     */
    var OGCHelper = {};

    /**
     * Static array where CRS (Coordinate Reference System) availables for OGCHelper are defined. See {@link http://spatialreference.org}
     * Each element is an object with the following attributes:<ul>
     * <li>- name: the string describing the name of the projection</li>
     * <li>- ellipsoid: the ellipsoid to use. see {@link Ellipsoid}</li>
     * <li>- firstAxeIsLatitude: a boolean indicates if the first dimension is latitude. It's the case for EPSG:4326.</li>
     * <li>- tilingScheme: the tiling scheme to apply. see {@link TilingScheme}</li>
     * <li>- supportedCRS: the string describing the identifier of the CRS.</li>
     * </ul>
     */
    OGCHelper.CRS = [ {
        name : 'CRS:84',
        ellipsoid : Ellipsoid.WGS84,
        firstAxeIsLatitude : false,
        tilingScheme : GeographicTilingScheme,
        supportedCRS:'urn:ogc:def:crs:OGC:1.3:CRS84'
    },{
        name : 'CRS:84',
        ellipsoid : Ellipsoid.WGS84,
        firstAxeIsLatitude : false,
        tilingScheme : GeographicTilingScheme,
        supportedCRS:'urn:ogc:def:crs:OGC:2:84'
    }, {
        name : 'EPSG:4326',
        ellipsoid : Ellipsoid.WGS84,
        firstAxeIsLatitude : true,
        tilingScheme : GeographicTilingScheme,
        supportedCRS:'urn:ogc:def:crs:EPSG::4326'
    }, {
        name : 'EPSG:3857',
        ellipsoid : Ellipsoid.WGS84,
        firstAxeIsLatitude : false,
        tilingScheme : WebMercatorTilingScheme,
        supportedCRS: 'urn:ogc:def:crs:EPSG::3857'
    }, {
        name : 'OSGEO:41001',
        ellipsoid : Ellipsoid.WGS84,
        firstAxeIsLatitude : false,
        tilingScheme : WebMercatorTilingScheme,
        supportedCRS: 'urn:ogc:def:crs:EPSG::3857'
    } ];

    /**
     * Static array where image formats availables for OGCHelper are defined.
     * Each element is an object with the following attributes:<ul>
     * <li>- format: the string describing the image MIME</li>
     * <li>- extension: the string describing the image extension</li>
     * </ul>
     */
    OGCHelper.FormatImage = [ {
        format : 'image/png',
        extension: 'png'
    }, {
        format : 'image/jpeg',
        extension: 'jpg'
    }, {
        format : 'image/jpeg',
        extension: 'jpeg'
    }, {
        format : 'image/gif',
        extension: 'gif'
    }, {
        format : 'image/png; mode=8bit',
        extension: 'png'
    } ];

    /**
     * Static array where data array availables for OGCHelper are defined.
     * Each element is an object with the following attributes:<ul>
     * <li>- format: the string describing the array MIME</li>
     * <li>- extension: the string describing the extension</li>
     * </ul>
     */
    OGCHelper.FormatArray = [ {
        format : 'image/bil',
        extension:'bil'
    } ];

    /**
     * Static array where data feature info availables for OGCHelper are defined.
     * Each element is an object with the following attributes:<ul>
     * <li>- format: the string describing the array MIME</li>
     * <li>- extension: the string describing the extension</li>
     * <li>- loader: the function to get the feature info from the server</li>
     * <li>- postProcess: the function to apply to have an array of featureInfo (see @link ImageryLayerFeatureInfo ).</li>
     *</ul>
     */
    OGCHelper.FormatFeatureInfo=[
                                 {
                                     format:'application/json',extension:'json',loader:loadJson,
                                     postProcess: function(json){ //copy of function geoJsonToFeatureInfo in Scene/WebMapServiceImageryProvider
                                         var result = [];
                                         var features = json.features;
                                         for (var i = 0; i < features.length; ++i) {
                                             var feature = features[i];

                                             var featureInfo = new ImageryLayerFeatureInfo();
                                             featureInfo.data = feature;
                                             featureInfo.configureNameFromProperties(feature.properties);
                                             featureInfo.configureDescriptionFromProperties(feature.properties);

                                             // If this is a point feature, use the coordinates of the point.
                                             if (feature.geometry.type === 'Point') {
                                                 var longitude = feature.geometry.coordinates[0];
                                                 var latitude = feature.geometry.coordinates[1];
                                                 featureInfo.position = Cartographic.fromDegrees(longitude, latitude);
                                             }
                                             result.push(featureInfo);
                                         }
                                         return result;
                                     }
                                 },
                                 {
                                     format:'text/xml',extension:'xml',loader:loadXML,
                                     postProcess: function(xml){//copy of function xmlToFeatureInfo in Scene/WebMapServiceImageryProvider
                                         var documentElement = xml.documentElement;
                                         if (documentElement.localName === 'MultiFeatureCollection' && documentElement.namespaceURI === mapInfoMxpNamespace) {
                                             // This looks like a MapInfo MXP response
                                             return mapInfoXmlToFeatureInfo(xml);
                                         } else if (documentElement.localName === 'FeatureInfoResponse' && documentElement.namespaceURI === esriWmsNamespace) {
                                             // This looks like an Esri WMS response
                                             return esriXmlToFeatureInfo(xml);
                                         } else if (documentElement.localName === 'ServiceExceptionReport') {
                                             // This looks like a WMS server error, so no features picked.
                                             return undefined;
                                         } else {
                                             // Unknown response type, so just dump the XML itself into the description.
                                             return unknownXmlToFeatureInfo(xml);
                                         }
                                     }
                                 }
                                 ];

    //---------------------------------------------copy of Scene/WebMapServiceImageryProvider ---------------------
    var mapInfoMxpNamespace = 'http://www.mapinfo.com/mxp';
    var esriWmsNamespace = 'http://www.esri.com/wms';
    function mapInfoXmlToFeatureInfo(xml) {
        var result = [];

        var multiFeatureCollection = xml.documentElement;

        var features = multiFeatureCollection.getElementsByTagNameNS(mapInfoMxpNamespace, 'Feature');
        for (var featureIndex = 0; featureIndex < features.length; ++featureIndex) {
            var feature = features[featureIndex];

            var properties = {};

            var propertyElements = feature.getElementsByTagNameNS(mapInfoMxpNamespace, 'Val');
            for (var propertyIndex = 0; propertyIndex < propertyElements.length; ++propertyIndex) {
                var propertyElement = propertyElements[propertyIndex];
                if (propertyElement.hasAttribute('ref')) {
                    var name = propertyElement.getAttribute('ref');
                    var value = propertyElement.textContent.trim();
                    properties[name] = value;
                }
            }

            var featureInfo = new ImageryLayerFeatureInfo();
            featureInfo.data = feature;
            featureInfo.configureNameFromProperties(properties);
            featureInfo.configureDescriptionFromProperties(properties);
            result.push(featureInfo);
        }

        return result;
    }

    function esriXmlToFeatureInfo(xml) {
        var result = [];

        var featureInfoResponse = xml.documentElement;

        var features = featureInfoResponse.getElementsByTagNameNS(esriWmsNamespace, 'FIELDS');
        for (var featureIndex = 0; featureIndex < features.length; ++featureIndex) {
            var feature = features[featureIndex];

            var properties = {};

            var propertyAttributes = feature.attributes;
            for (var attributeIndex = 0; attributeIndex < propertyAttributes.length; ++attributeIndex) {
                var attribute = propertyAttributes[attributeIndex];
                properties[attribute.name] = attribute.value;
            }

            var featureInfo = new ImageryLayerFeatureInfo();
            featureInfo.data = feature;
            featureInfo.configureNameFromProperties(properties);
            featureInfo.configureDescriptionFromProperties(properties);
            result.push(featureInfo);
        }

        return result;
    }

    function unknownXmlToFeatureInfo(xml) {
        var xmlText = new XMLSerializer().serializeToString(xml);

        var element = document.createElement('div');
        var pre = document.createElement('pre');
        pre.textContent = xmlText;
        element.appendChild(pre);

        var featureInfo = new ImageryLayerFeatureInfo();
        featureInfo.data = xml;
        featureInfo.description = element.innerHTML;
        return [featureInfo];
    }

    //---------------------------------------------end of copy of Scene/WebMapServiceImageryProvider ---------------------
    function xxxParserGenerate(description,suffix,metadataXMLFunction){
        var resultat;
        if (defined(description.url)) {
            var urlofServer=description.url;
            var index=urlofServer.lastIndexOf("?");
            if(index>-1){
                urlofServer=urlofServer.substring(0,index);
            }
            var urlGetCapabilities = urlofServer+suffix;
            if (defined(description.proxy)) {
                urlGetCapabilities = description.proxy.getURL(urlGetCapabilities);
            }
            resultat=loadXML(urlGetCapabilities).then(function(xml) {return metadataXMLFunction(xml, description);});
        } else if (defined(description.xml)) {
            resultat=metadataXMLFunction(description.xml, description);
        }
        return resultat;
    }

    function definedFilter(elt){
        return defined(elt);
    }

    var getFormat=function (tab,tabNodes){
        var sortie;
        var filterFunction=function(format){
            return function(elt){
                return elt.textContent === format;
            };
        };
        for (var l = 0; l < tab.length && !defined(sortie); l++) {
            var filtering=filterFunction(tab[l].format);
            var validFormats=tabNodes.filter(filtering);
            if(validFormats.length>0){
                sortie= tab[l];
            }
        }
        return sortie;
    };

    var intersectionRectangle=function(rectangle0,rectangle1){
        var west = Math.max(rectangle0.west, rectangle1.west);
        var east = Math.min(rectangle0.east, rectangle1.east);
        var south = Math.max(rectangle0.south, rectangle1.south);
        var north = Math.min(rectangle0.north, rectangle1.north);

        var resultat;
        if ((east <= west)||(south >= north)) {
            resultat=undefined;
        }else{
            resultat=new Rectangle(west, south, east, north);
        }

        return resultat;
    };

    var readOnlyProperty=function(myClass,propertyName,value){
        Object.defineProperty(myClass,propertyName, {
            get : function(){return value;}
        });
    };

    var WMSParser={};
    var TMSParser={};
    var WMTSParser={};

    /**
     * Parse WMS(Web Map Service), TMS (Tile Map Service) or WMTS (Web Map Tile Service)
     * capabilities from an url or an XML.
     * @function
     *
     * @param {Object} description Object with the following attributes:
     * @param {String}
     *            description.url The URL of the server providing wms. One of url or xml is a mandatory.
     * @param {String}
     *            description.xml the xml after requesting 'getCapabilities'
     *            from web map server. One of url or xml is a mandatory.
     * @param {String}
     *            [description.service='WMS'] the type of service requested (WMS,TMS,WMTS).
     * @param {Object}
     *            [description.proxy] A proxy to use for requests. This object
     *            is expected to have a getURL function which returns the
     *            proxied URL, if needed.
     * @param {Number}
     *            [description.tileMapWidth=256] width  of a tile in pixels
     * @param {Number}
     *            [description.tileMapHeight=256] height of a tile in pixels
     * @param {Object}
     *            [description.formatImage] an image format to use in priority. This object must follow the description of an {@link OGCHelper#FormatImage} element
     * @param {Object}
     *            [description.formatArray] an array format to use in priority. This object must follow the description of an {@link OGCHelper#FormatArray} element
     * @param {Object}
     *            [description.formatFeatureInfo] an feature info format to use in priority. This object must follow the description of an {@link OGCHelper#FormatFeatureInfo} element
     * @return {promise} It's a promise of object array. Each element of the array has for attributes 'layerName'(a string) and 'capabilities' (OGCCapabilites). See {@link OGCCapabilities}
     */
    OGCHelper.parser=function(description){
        var resultat;
        description = defaultValue(description,defaultValue.EMPTY_OBJECT);
        if (!(defined(description.url) || defined(description.xml))) {
            throw new DeveloperError(
            'either description.url or description.xml are required.');
        }
        if(defined(description.xml) && !(description.xml instanceof XMLDocument) ){
            var parser=new DOMParser();
            description.xml=parser.parseFromString(description.xml, "text/xml");
        }
        description.tabFormatImage=OGCHelper.FormatImage.slice(); //make a clone
        description.tabFormatArray=OGCHelper.FormatArray.slice();//make a clone
        description.tabFormatFeatureInfo=OGCHelper.FormatFeatureInfo.slice();//make a clone
        if(defined(description.formatImage)){
            description.tabFormatImage.unshift(description.formatImage);
        }
        if(defined(description.formatArray)){
            description.tabFormatArray.unshift(description.formatArray);
        }
        if(defined(description.formatFeatureInfo)){
            description.tabFormatFeatureInfo.unshift(description.formatFeatureInfo);
        }
        switch(description.service){
        case 'TMS':
            resultat=xxxParserGenerate(description,'',TMSParser.parseXML);
            break;
        case 'WMTS':
            resultat=xxxParserGenerate(description,'?REQUEST=GetCapabilities',WMTSParser.getMetaDatafromXML);
            break;
        default:
            resultat=xxxParserGenerate(description,'?SERVICE=WMS&REQUEST=GetCapabilities&tiled=true',WMSParser.getMetaDatafromXML);
        }
        return resultat;
    };

    TMSParser.parseXML=function(xml,description){
        var resultat;
        //description of a tile map service or of a tile map?
        if(xml.querySelector('TileMapService')!==null){
            var mapServiceNodes=[].slice.apply(xml.querySelectorAll('TileMap'));
            var promises=mapServiceNodes.map(function(elt){
                var url=elt.getAttribute('href');
                if(defined(description.proxy)){
                    url=description.proxy.getURL(url);
                }
                return when(loadXML(url),function(xml){
                    return TMSParser.getMetaDatafromXML(xml,description);
                });
            });
            resultat=when.all(promises);
        }else{
            resultat=when([TMSParser.getMetaDatafromXML(xml,description)]);
        }
        return resultat;
    };

    TMSParser.getMetaDatafromXML=function(xml,description){
        var layerName=xml.querySelector('Title').textContent;
        var capabilities={};
        capabilities.ready = false;
        readOnlyProperty(capabilities,"styles",['']);
        readOnlyProperty(capabilities,"dimensions",[]);
        var proxy=description.proxy;

        var srs=xml.querySelector('SRS').textContent;
        var goodCRS=OGCHelper.CRS.filter(function(elt){
            return elt.name===srs;
        });
        if(goodCRS.length>0){
            var tilingScheme = new goodCRS[0].tilingScheme({
                ellipsoid : goodCRS[0].ellipsoid
            });
            readOnlyProperty(capabilities,"tilingScheme",tilingScheme);
        }
        var nodeTileFormat=xml.querySelector('TileFormat');
        var extension=nodeTileFormat.getAttribute('extension');
        readOnlyProperty(capabilities,"tileMapWidth",parseInt(nodeTileFormat.getAttribute('width'),10));
        readOnlyProperty(capabilities,"tileMapHeight",parseInt(nodeTileFormat.getAttribute('height'),10));
        var getFormatExtension=function (tab,ext){
            var sortie;
            var goodFormat=tab.filter(function(elt){return elt.extension===ext;});
            if(goodFormat.length>0){
                sortie = goodFormat[0];
            }
            return sortie;
        };

        var formatImage=getFormatExtension(description.tabFormatImage,extension);
        var formatArray=getFormatExtension(description.tabFormatArray,extension);
        if(defined(formatImage)){
            readOnlyProperty(capabilities,"formatImage",formatImage);
        }
        if(defined(formatArray)){
            readOnlyProperty(capabilities,"formatArray",formatArray);
        }

        var tilsetsNode=[].slice.call(xml.querySelectorAll('TileSets>TileSet'));
        var tileSets=[];

        if(defined(capabilities.formatImage)||defined(capabilities.formatArray)){
            tileSets=tilsetsNode.map(function(tileSet){
                var url=tileSet.getAttribute('href')+'/{x}/{tmsY}.{extension}';
                if(defined(proxy)){
                    url=proxy.getURL(url);
                }
                var level=parseInt(tileSet.getAttribute('order'),10);
                return {url:url,level:level};
            });
            tileSets.sort(function(a,b){
                return a.level-b.level;
            });
        }
        readOnlyProperty(capabilities,"maxLevel",tileSets.length-1);

        var boundingBoxNode=xml.querySelector('BoundingBox');
        var miny=parseFloat(boundingBoxNode.getAttribute('miny'));
        var maxy=parseFloat(boundingBoxNode.getAttribute('maxy'));
        var minx=parseFloat(boundingBoxNode.getAttribute('minx'));
        var maxx=parseFloat(boundingBoxNode.getAttribute('maxx'));
        var limites=new Rectangle(minx,miny,maxx,maxy);
        readOnlyProperty(capabilities,"rectangle",limites);

        var getURLFunction=function(extension){
            return function(x,y,level){
                var retour='';
                if(capabilities.getTileDataAvailable(x,y,level)){
                    retour=tileSets[level].url;
                    var yTiles = capabilities.tilingScheme.getNumberOfYTilesAtLevel(level);
                    var tmsY = (yTiles - y - 1);
                    return retour.replace('{x}',x).replace('{tmsY}',tmsY).replace('{extension}',extension);
                }
                return retour;
            };
        };

        if((tileSets.length>0) && defined(capabilities.tilingScheme)){
            capabilities.getTileDataAvailable=function(x,y,level){
                var rect= capabilities.tilingScheme.tileXYToNativeRectangle(x, y,level);
                var scratchRectangle=intersectionRectangle(limites, rect);
                return defined(scratchRectangle) && level<tileSets.length;
            };

            if(defined(capabilities.formatImage)){
                capabilities.getURLImage=getURLFunction(capabilities.formatImage.extension);
                readOnlyProperty(capabilities,"ready",true);
            }

            if(defined(capabilities.formatArray)){
                capabilities.getURLArray=getURLFunction(capabilities.formatArray.extension);
                if(!capabilities.ready){
                    readOnlyProperty(capabilities,"ready",true);
                }
            }

        }
        return {capabilities:capabilities,layerName:layerName};
    };

    WMTSParser.getMetaDatafromXML = function(xml,description){
        var resultat=[];
        var proxy=description.proxy;
        var styleName = description.styleName;

        var getURL=function(selector){
            var nodesGetOperation=[].slice.call(xml.querySelectorAll(selector));
            var correctEncoding=nodesGetOperation.map(function(elt){
                var val=elt.querySelector("Value").textContent;
                var retour;
                if("KVP"===val){
                    retour={node:elt,type:"KVP"};
                }
                if("RESTful"===val){
                    retour={node:elt,type:"RESTful"};
                }
                return retour;
            }).filter(function(elt){
                return defined(elt);
            });
            var kvp,restFul;
            for(var i=0;i<correctEncoding.length;i++){
                var node=correctEncoding[i];
                if(node.type==="RESTful" && !defined(restFul)){
                    restFul=node.node.getAttribute("xlink:href");
                    if (defined(proxy)) {
                        restFul = proxy.getURL(restFul);
                    }
                }
                if(node.type==="KVP" && !defined(kvp)){
                    kvp=node.node.getAttribute("xlink:href");
                    if (defined(proxy)) {
                        kvp = proxy.getURL(kvp);
                    }
                }
            }
            return {KVP:kvp,RESTful:restFul};
        };

        // definition of the URL prefixe
        var getTile,getFeatureInfo;
        // for the map
        getTile=getURL('Operation[name="GetTile"] HTTP Get');
        //for the featureInfo
        getFeatureInfo=getURL('Operation[name="GetFeatureInfo"] HTTP Get');

        //some functions to use in the loop
        var scaleDenominatorSorter=function(a,b){
            return b.scaleDenominator-a.scaleDenominator;
        };

        var tileMatrixSetsFilter=function(setLinkName){
            return function(element){
                return element.identifier===setLinkName;
            };
        };
        //with a tileSet in parameter, return a function that indicate if a tile is available.
        var functionGetTileDataAvailable= function(tileSets,tilingScheme,limits){
            return function(x,y,level){
                var retour=false;
                var rect=tilingScheme.tileXYToNativeRectangle(x, y, level);
                var scratchRectangle=intersectionRectangle(limits, rect);
                if(level<tileSets.length && defined(scratchRectangle)){
                    var tile=tileSets[level];
                    if(tile.complete){
                        retour= (y<=tile.maxTileRow && y>=tile.minTileRow) && (x<=tile.maxTileCol && x>=tile.minTileCol);
                    }else{
                        retour= x<tile.matrixWidth && y<tile.matrixHeight;
                    }
                }
                return retour;
            };
        };
        // return a template of URL
        var getTemplate=function(format,requestType,KVP,layerNode,tileMatrixSetLinkName,layerName,capabilities){
            var resourceType= (requestType==="GetTile")?"tile":"FeatureInfo";
            var resourceURL=layerNode.querySelector("ResourceURL[format='"+format+"'][resourceType='"+resourceType+"']");
            var template;
            if(resourceURL!==null){
                template=resourceURL.getAttribute("template").replace("{TileRow}","{y}").replace("{TileCol}","{x}").
                replace("{TileMatrixSet}",tileMatrixSetLinkName).replace("{Layer}",layerName);
            }else if(defined(KVP)){
                template=KVP+"service=WMTS&request="+requestType+"&version=1.0.0&layer="+layerName+"&style={Style}&format="+format+"&TileMatrixSet="+tileMatrixSetLinkName+"&TileMatrix={TileMatrix}&TileRow={y}&TileCol={x}";
                capabilities.dimensions.forEach(function(elt){
                    template+="&"+elt.Identifier+"={"+elt.Identifier+"}";
                });
                if(requestType==="GetFeatureInfo"){
                    if(defined(capabilities.formatFeatureInfo.format)){
                        template+="&i={I}&j={J}&infoFormat="+capabilities.formatFeatureInfo.format;
                    }else{
                        template=undefined;
                    }
                }
            }
            if (defined(description.proxy) && defined(template)) {
                template = description.proxy.getURL(template);
            }
            return template;
        };
        // the function used by getURLXXX from OGCCapabilities
        var getURLFunction=function(template,capabilities,tileSets){
            return function(x,y,level,options){
                options = defaultValue(options,[]);
                // does options.style is in the array capabilities.styles?
                if(capabilities.styles.filter(function(elt){return elt===options.style;}).length===0){
                    options.style=styleName;
                }
                options.dimensions=defaultValue(options.dimensions,[]);
                var retour="";
                if(capabilities.getTileDataAvailable(x,y,level)){
                    var tile=tileSets[level];
                    if(!(Number.isInteger(options.i) && tile.tileWidth>options.i && options.i>=0)){
                        options.i=0;
                    }
                    if(!(Number.isInteger(options.j) && tile.tileHeight>options.j && options.j>=0)){
                        options.j=0;
                    }
                    retour=template.replace("{TileMatrix}",tile.id).replace("{x}",x).replace("{y}",y).replace("{Style}",options.style).replace("{I}",options.i).replace("{J}",options.j);
                    capabilities.dimensions.forEach(function(elt){
                        var found;
                        options.dimensions.forEach(function(element){
                            if(element.name===elt.Identifier){
                                found=element;
                            }
                        });
                        found=defaultValue(found,{name:elt.Identifier,value:elt.Default});
                        if(OGCCapabilities.dimensionValidator(elt,found.value)){
                            var motif='{'+found.name+'}';
                            var reg=new RegExp(motif.toLowerCase(),"ig");
                            retour=retour.replace(reg,found.value);
                        }else{
                            retour="";
                            console.log("invalid dimension for ");console.log(found);
                        }
                    });
                }
                return retour;
            };
        };

        //definition of all tileMatrixSets (each element have identifier,CRS,tileSets)
        var tileMatrixSets=[].slice.call(xml.querySelectorAll("TileMatrixSet>Identifier")).map(function(element){
            var elementRetour;
            var identifier=element.textContent;
            var node=element.parentNode;
            var supportedCRS=node.querySelector("SupportedCRS").textContent;
            var filtredCRS=OGCHelper.CRS.filter(function(OGCcrs){return OGCcrs.supportedCRS===supportedCRS;});

            if(filtredCRS.length>0){
                var nodeTileSets=[].slice.call(node.querySelectorAll("TileMatrix"));
                var tileSets=nodeTileSets.map(function(noeud){
                    var idNoeud=noeud.querySelector("Identifier").textContent;
                    var matrixWidth=parseInt(noeud.querySelector("MatrixWidth").textContent,10);
                    var matrixHeight=parseInt(noeud.querySelector("MatrixHeight").textContent,10);
                    var tileWidth=parseInt(noeud.querySelector("TileWidth").textContent,10);
                    var tileHeight=parseInt(noeud.querySelector("TileHeight").textContent,10);
                    var scaleDenominator=parseFloat(noeud.querySelector("ScaleDenominator").textContent);
                    return {id:idNoeud,matrixWidth:matrixWidth,matrixHeight:matrixHeight,scaleDenominator:scaleDenominator,complete:false,
                        tileWidth:tileWidth,tileHeight:tileHeight};
                });

                tileSets.sort(scaleDenominatorSorter);
                elementRetour={identifier:identifier,CRS:filtredCRS[0],tileSets:tileSets};
            }
            return elementRetour;}).filter(function(elt){
                return defined(elt) && elt.tileSets.length>0;});//return only defined element with a real tileSets
        var nodeIdentifiers=[].slice.call(xml.querySelectorAll("Contents>Layer>Identifier"));

        // beginning for each layer
        nodeIdentifiers.forEach(function(nodeIdent){
            var capabilities={};
            var listTileMatrixSetLinkNode=[];
            capabilities.ready = false;
            var layerName=nodeIdent.textContent;
            var layerNode=nodeIdent.parentNode;
            //optionality of style in geoserver is not compliant with OGC rules!!
            var styleNodes=layerNode.querySelectorAll("Style");
            var styles=[];
            var defaultStyle="";
            var selectedStyle="";
            for (var j = 0; j < styleNodes.length; j++) {
                var style=styleNodes[j].querySelector("Identifier").textContent;
                if(defined(style)){
                    var adding=true;
                    if(styleNodes[j].getAttribute("isDefault")!==null){
                        defaultStyle=style;
                        adding=false;
                    }
                    if(style===styleName){
                        selectedStyle=style;
                        adding=false;
                    }
                    if(adding){
                        styles.push(style);
                    }
                }
            }
            //Work with attribute isDefault when no style was defined!!
            if(!defined(styleName) || styleName!==selectedStyle){
                styleName=defaultValue(defaultStyle,"");
            }
            if(styleName!==defaultStyle){
                styles.unshift(styleName,defaultStyle);
            }else{
                styles.unshift(styleName);
            }
            readOnlyProperty(capabilities,"styles",styles);
            //format
            var nodeFormats=[].slice.call(layerNode.querySelectorAll("Format"));
            var formatImage=getFormat(description.tabFormatImage,nodeFormats);
            var formatArray=getFormat(description.tabFormatArray,nodeFormats);
            if(defined(formatImage)){
                readOnlyProperty(capabilities,"formatImage",formatImage);
            }
            if(defined(formatArray)){
                readOnlyProperty(capabilities,"formatArray",formatArray);
            }

            var nodeInfoFormats=[].slice.call(layerNode.querySelectorAll("InfoFormat"));
            var formatFeatureInfo=getFormat(description.tabFormatFeatureInfo,nodeInfoFormats);
            if(defined(formatFeatureInfo)){
                readOnlyProperty(capabilities,"formatFeatureInfo",formatFeatureInfo);
            }

            // dimensions
            var nodeDimensions=[].slice.call(layerNode.querySelectorAll("Dimension"));
            var dimensions=nodeDimensions.map(function(element){
                var Identifier=element.querySelector("Identifier").textContent;
                var UOMNode=element.querySelector("UOM");
                var UOM= (UOMNode!==null)?UOMNode.textContent:undefined;
                var Default=element.querySelector("Default").textContent;
                var Value=[].slice.call(element.querySelectorAll("Value")).map(function(elt){return elt.textContent;});
                return {Identifier:Identifier,UOM:UOM,Default:Default,Value:Value};
            });
            readOnlyProperty(capabilities,"dimensions",dimensions);

            var mapTileSets=function(tileMatrixSet){
                return function(elt){
                    var retour;
                    var id=elt.querySelector("TileMatrix").textContent;
                    var goodTileSet=tileMatrixSet.tileSets.filter(function(element){
                        return id===element.id;
                    });
                    if (goodTileSet.length>0){
                        retour={};
                        var goodTile=goodTileSet[0];
                        for( var att in goodTile){
                            if(goodTile.hasOwnProperty(att)){
                                retour[att]=goodTile[att];
                            }
                        }
                        retour.minTileRow=parseInt(elt.querySelector("MinTileRow").textContent.trim(),10);
                        retour.maxTileRow=parseInt(elt.querySelector("MaxTileRow").textContent.trim(),10);
                        retour.minTileCol=parseInt(elt.querySelector("MinTileCol").textContent.trim(),10);
                        retour.maxTileCol=parseInt(elt.querySelector("MaxTileCol").textContent.trim(),10);
                        retour.complete=true;
                    }
                    return retour;
                };
            };

            //TileMatrixSetLink =>TileMatrixSet
            listTileMatrixSetLinkNode=layerNode.querySelectorAll("TileMatrixSetLink");
            for(var a=0;a<listTileMatrixSetLinkNode.length && !capabilities.ready;a++){
                var matrixSetLinkNode=listTileMatrixSetLinkNode[a];
                var tileMatrixSetLinkName=matrixSetLinkNode.querySelector("TileMatrixSet").textContent;
                var myFilterTileMatrixSet=tileMatrixSetsFilter(tileMatrixSetLinkName);
                var selectedTileMatrixSet=tileMatrixSets.filter(myFilterTileMatrixSet);

                if(selectedTileMatrixSet.length>0){
                    var tileMatrixSet=selectedTileMatrixSet[0];
                    readOnlyProperty(capabilities,"tileMapWidth",tileMatrixSet.tileSets[0].tileWidth);
                    readOnlyProperty(capabilities,"tileMapHeight",tileMatrixSet.tileSets[0].tileHeight);

                    var tilingScheme = new tileMatrixSet.CRS.tilingScheme({
                        ellipsoid : tileMatrixSet.CRS.ellipsoid,
                        numberOfLevelZeroTilesX:tileMatrixSet.tileSets[0].matrixWidth,
                        numberOfLevelZeroTilesY:tileMatrixSet.tileSets[0].matrixHeight});
                    readOnlyProperty(capabilities,"tilingScheme",tilingScheme);
                    var mappingTileSets=mapTileSets(tileMatrixSet);
                    // defining rectangle
                    var rectangle=new Rectangle();
                    var nodeBoundingBox=layerNode.querySelector(" [crs='"+tileMatrixSet.CRS.supportedCRS+"']");
                    if(nodeBoundingBox!==null){
                        var tabLowerCorner=nodeBoundingBox.querySelector("LowerCorner").textContent.split(' ');
                        var tabUpperCorner=nodeBoundingBox.querySelector("UpperCorner").textContent.split(' ');
                        rectangle.west=parseFloat(tabLowerCorner[0]);
                        rectangle.south=parseFloat(tabLowerCorner[1]);
                        rectangle.east=parseFloat(tabUpperCorner[0]);
                        rectangle.north=parseFloat(tabUpperCorner[1]);
                    }
                    readOnlyProperty(capabilities,"rectangle",rectangle);
                    //TileMatrixSetLimits>TileMatrixLimits is optional. Nevertheless, if these elements are present, it's needed in order to have best precision!
                    var myTileSets=[].slice.call(matrixSetLinkNode.querySelectorAll("TileMatrixSetLimits>TileMatrixLimits"))
                    .map(mappingTileSets).filter(definedFilter);

                    if(myTileSets.length===0){
                        myTileSets=tileMatrixSet.tileSets;
                    }else{
                        myTileSets.sort(scaleDenominatorSorter);
                    }
                    readOnlyProperty(capabilities,"maxLevel",myTileSets.length-1);
                    capabilities.getTileDataAvailable=functionGetTileDataAvailable(myTileSets,capabilities.tilingScheme,capabilities.rectangle);

                    if(defined(capabilities.formatImage)){
                        var template=getTemplate(capabilities.formatImage.format,"GetTile",getTile.KVP,layerNode,tileMatrixSetLinkName,layerName,capabilities);
                        if(defined(template)){
                            capabilities.getURLImage=getURLFunction(template,capabilities,myTileSets);
                            readOnlyProperty(capabilities,"ready",true);
                            if(capabilities.formatFeatureInfo){
                                template=getTemplate(capabilities.formatImage.format,"GetFeatureInfo",getFeatureInfo.KVP,layerNode,tileMatrixSetLinkName,layerName,capabilities);
                                if(defined(template)){
                                    capabilities.getURLFeatureInfoImage=getURLFunction(template,capabilities,myTileSets);
                                }
                            }
                        }
                    }
                    if(defined(capabilities.formatArray)){
                        var template2=getTemplate(capabilities.formatArray.format,"GetTile",getTile.KVP,layerNode,tileMatrixSetLinkName,layerName,capabilities);
                        if(defined(template2)){
                            capabilities.getURLArray=getURLFunction(template2,capabilities,myTileSets);
                            if(!capabilities.ready){
                                readOnlyProperty(capabilities,"ready",true);
                            }
                            if(capabilities.formatFeatureInfo){
                                template2=getTemplate(capabilities.formatArray.format,"GetFeatureInfo",getFeatureInfo.KVP,layerNode,tileMatrixSetLinkName,layerName,capabilities);
                                if(defined(template2)){
                                    capabilities.getURLFeatureInfoArray=getURLFunction(template2,capabilities,myTileSets);
                                }
                            }
                        }
                    }
                }
            }
            resultat.push({capabilities:capabilities,layerName:layerName});
        });
        return resultat;
    };

    WMSParser.getMetaDatafromXML = function(xml, description) {
        // get version of wms 1.1.X or 1.3.X=> for 1.3 use firstAxe for order of
        // CRS
        var resultat=[];
        var version;
        var isNewVersion;
        var tileMapWidth = defaultValue(description.tileMapWidth,256);
        var tileMapHeight = defaultValue(description.tileMapHeight,tileMapWidth);

        // get version
        var versionNode = xml.querySelector("[version]");
        if (versionNode !== null) {
            version = versionNode.getAttribute("version");
            isNewVersion = /^1\.[3-9]\./.test(version);
        }
        var getOnlineResource=function(selector){
            var url;
            var nodeSelector=xml.querySelector(selector);
            if(nodeSelector!==null){
                url=nodeSelector.getAttribute("xlink:href");
                var index=url.indexOf("?");
                if(index>-1){
                    url=url.substring(0,index);
                }
                if (defined(description.proxy)) {
                    url = description.proxy.getURL(url);
                }
            }
            return url;
        };
        var urlGetMap=getOnlineResource('Request>GetMap OnlineResource');
        var urlGetFeatureInfo=getOnlineResource('Request>GetFeatureInfo OnlineResource');

        // get list of map format
        var nodeGetMapFormats = [].slice.apply(xml.querySelectorAll("Request>GetMap>Format"));
        var nodeGetFeatureInfoFormats = [].slice.apply(xml.querySelectorAll("Request>GetFeatureInfo>Format"));
        var formatImage=getFormat(description.tabFormatImage,nodeGetMapFormats);
        var formatArray=getFormat(description.tabFormatArray,nodeGetMapFormats);
        var formatFeatureInfo=getFormat(description.tabFormatFeatureInfo,nodeGetFeatureInfoFormats);

        //with a capabilities and rectReference in parameter,s return a function that indicate if a tile is available.
        var functionGetTileDataAvailable = function(capabilities, rectReference){
            return function(x, y, level){
                var rectangleCalcul = capabilities.tilingScheme.tileXYToNativeRectangle(x, y,level);
                var scratchRectangle=intersectionRectangle(rectReference, rectangleCalcul);
                return defined(scratchRectangle);
            };
        };

        // the function used by getURLXXX from OGCCapabilities
        var getURLFunction=function(template,capabilities){
            return function(x,y,level,options){
                options = defaultValue(options,[]);
                options.dimensions=defaultValue(options.dimensions,[]);
                var retour="";
                if(capabilities.getTileDataAvailable(x,y,level)){
                    // does options.style is in the array capabilities.styles?
                    if(capabilities.styles.filter(function(elt){return elt===options.style;}).length===0){
                        options.style=capabilities.styles[0];
                    }
                    var rect= capabilities.tilingScheme.tileXYToNativeRectangle(x, y,level);
                    var xSpacing = (rect.east - rect.west)/ (capabilities.tileMapWidth - 1);
                    var ySpacing = (rect.north - rect.south)/ (capabilities.tileMapHeight - 1);
                    rect.west -= xSpacing * 0.5;
                    rect.east += xSpacing * 0.5;
                    rect.south -= ySpacing * 0.5;
                    rect.north += ySpacing * 0.5;
                    if(!(Number.isInteger(options.i) && capabilities.tileMapWidth>options.i && options.i>=0)){
                        options.i=0;
                    }
                    if(!(Number.isInteger(options.j) && capabilities.tileMapHeight>options.j && options.j>=0)){
                        options.j=0;
                    }
                    retour=template.replace("{south}",rect.south).replace("{north}",rect.north).replace("{west}",rect.west).replace("{east}",rect.east)
                    .replace(/{style}/ig,options.style).replace(/{i}/ig,options.i).replace(/{j}/ig,options.j);
                    capabilities.dimensions.forEach(function(elt){
                        var foundElement;
                        options.dimensions.forEach(function(element){
                            if(element.name===elt.Identifier){
                                foundElement=element;
                            }
                        });
                        foundElement=defaultValue(foundElement,{name:elt.Identifier,value:elt.Default});
                        if(OGCCapabilities.dimensionValidator(elt,foundElement.value)){
                            var motif='{'+foundElement.name+'}';
                            var reg=new RegExp(motif.toLowerCase(),"ig");
                            retour=retour.replace(reg,foundElement.value);
                        }else{
                            retour="";
                            console.log("invalid dimension for ");console.log(foundElement);
                        }
                    });
                }
                return retour;
            };
        };

        // return a template of URL
        var getTemplate=function (layerName,CRSSelected,capabilities,url,format,infoFormat){
            var request=defined(infoFormat)?'GetFeatureInfo':'GetMap';
            var template=url+'?SERVICE=WMS&REQUEST='+request+'&LAYERS='+ layerName + '&VERSION=' + version+'&BBOX=';
            if(isNewVersion && CRSSelected.firstAxeIsLatitude){
                template+='{south},{west},{north},{east}';
            }else{
                template+='{west},{south},{east},{north}';
            }
            template+='&FORMAT='+format+'&WIDTH='+ capabilities.tileMapWidth +'&HEIGHT=' + capabilities.tileMapHeight;
            template += "&STYLES={style}&STYLE={style}";
            //elevation and time dimensions don't use a prefix!!
            var regTimeOrElevation=/(time|elevation)/ig;
            capabilities.dimensions.forEach(function(elt){
                if(regTimeOrElevation.test(elt.Identifier)){
                    template +="&"+elt.Identifier+"={"+elt.Identifier+"}";
                }else{
                    template +="&dim_"+elt.Identifier+"={"+elt.Identifier+"}";
                }
            });
            if(defined(infoFormat)){
                template +='&QUERY_LAYERS='+layerName+'&INFO_FORMAT='+infoFormat+'&I={i}&J={j}&X={i}&Y={j}';
            }
            return template;
        };

        var layerNodes = [].slice.apply(xml.querySelectorAll("Layer[queryable='1'],Layer[queryable='true']"));
        layerNodes.forEach(function(layerNode){
            var capabilities={};
            var layerName=layerNode.querySelector("Name").textContent;
            capabilities.ready = false;
            readOnlyProperty(capabilities,"maxLevel",undefined);

            var fixedHeight=layerNode.getAttribute("fixedHeight");
            var fixedWidth=layerNode.getAttribute("fixedWidth");
            var myTileMapHeight=tileMapHeight;
            var myTileMapWidth=tileMapWidth;
            if(defined(fixedHeight)){
                fixedHeight=parseInt(fixedHeight,10);
                myTileMapHeight=fixedHeight>0?fixedHeight:myTileMapHeight;
            }

            if(defined(fixedWidth)){
                fixedWidth=parseInt(fixedWidth,10);
                myTileMapWidth=fixedWidth>0?fixedWidth:myTileMapWidth;
            }

            if (defined(isNewVersion)) {
                var found = false;
                var CRSSelected;
                for (var n = 0; n < OGCHelper.CRS.length && !found; n++) {
                    CRSSelected = OGCHelper.CRS[n];
                    var nodeBBox = layerNode.querySelector("BoundingBox[SRS='"+
                            CRSSelected.name + "'],BoundingBox[CRS='"+
                            CRSSelected.name + "']");

                    if (nodeBBox !== null) {
                        var tilingScheme = new CRSSelected.tilingScheme({
                            ellipsoid : CRSSelected.ellipsoid
                        });
                        readOnlyProperty(capabilities,"tilingScheme",tilingScheme);
                        var west,east,south,north;
                        if(CRSSelected.firstAxeIsLatitude && isNewVersion){
                            west=parseFloat(nodeBBox.getAttribute("miny"));
                            east=parseFloat(nodeBBox.getAttribute("maxy"));
                            south=parseFloat(nodeBBox.getAttribute("minx"));
                            north=parseFloat(nodeBBox.getAttribute("maxx"));
                        }else{
                            west=parseFloat(nodeBBox.getAttribute("minx"));
                            east=parseFloat(nodeBBox.getAttribute("maxx"));
                            south=parseFloat(nodeBBox.getAttribute("miny"));
                            north=parseFloat(nodeBBox.getAttribute("maxy"));
                        }
                        var rectReference=new Rectangle(west,south,east,north);
                        readOnlyProperty(capabilities,"rectangle",rectReference);
                        capabilities.getTileDataAvailable = functionGetTileDataAvailable(capabilities, rectReference);
                        found = true;
                    }
                }

                var styles = [].slice.apply(layerNode.querySelectorAll("Style>Name")).map(function(node){
                    return node.textContent;
                });
                if(styles.length===0){
                    styles.push('');
                }
                readOnlyProperty(capabilities,"styles",styles);
                // dimensions
                var nodeDimensions=[].slice.call(layerNode.querySelectorAll("Dimension"));
                var dimensions=nodeDimensions.map(function(element){
                    var Identifier=element.getAttribute("name");
                    var UOM= element.getAttribute("units");
                    var Value=[element.textContent];
                    var temp=element.getAttribute("default");
                    if(temp===null){
                        if(/\//.test(Value[0])){
                            var reg=/[,\/]*([^\/,]+)\/([^\/,]+)\/([^\/,]+),?/;
                            var tab=reg.exec(Value[0]);
                            temp=tab[1];
                        }else{
                            var reg2=/,*([^\/,]+),?/;
                            var tab2=reg2.exec(Value[0]);
                            temp=tab2[1];
                        }
                    }
                    var Default=temp;
                    return {Identifier:Identifier,UOM:UOM,Default:Default,Value:Value};
                });
                readOnlyProperty(capabilities,"dimensions",dimensions);

                //changer resolution height et width si existence de tileset dans le xml!!
                var tileSets=xml.querySelectorAll("VendorSpecificCapabilities>TileSet");
                var out=false;
                for (var q=0;q<tileSets.length&&!out;q++){
                    var isGoodSRS=tileSets[q].querySelector("BoundingBox[SRS='"+
                            CRSSelected.name + "'],BoundingBox[CRS='"+
                            CRSSelected.name + "']")!==null;
                    var isGoodLayer=tileSets[q].querySelector("Layers").textContent=== layerName;
                    if(isGoodLayer&&isGoodSRS){
                        myTileMapWidth=parseInt(tileSets[q].querySelector("Width").textContent,10);
                        myTileMapHeight=parseInt(tileSets[q].querySelector("Height").textContent,10);
                        out=true;
                    }
                }
                readOnlyProperty(capabilities,"tileMapHeight",myTileMapHeight);
                readOnlyProperty(capabilities,"tileMapWidth",myTileMapWidth);

                if((defined(formatArray) || defined(formatImage)) && defined(urlGetMap)){
                    if(defined(formatImage)){
                        readOnlyProperty(capabilities,"formatImage",formatImage);
                        var URLImage=getTemplate(layerName,CRSSelected,capabilities,urlGetMap,capabilities.formatImage.format);
                        capabilities.getURLImage=getURLFunction(URLImage,capabilities);
                    }
                    if(defined(formatArray)){
                        readOnlyProperty(capabilities,"formatArray",formatArray);
                        var URLArray=getTemplate(layerName,CRSSelected,capabilities,urlGetMap,capabilities.formatArray.format);
                        capabilities.getURLArray=getURLFunction(URLArray,capabilities);
                    }
                }
                if(defined(formatFeatureInfo) && defined(urlGetFeatureInfo)){
                    readOnlyProperty(capabilities,"formatFeatureInfo",formatFeatureInfo);
                    if(defined(formatImage)){
                        var URLinfoImage=getTemplate(layerName,CRSSelected,capabilities,urlGetFeatureInfo,capabilities.formatImage.format,capabilities.formatFeatureInfo.format);
                        capabilities.getURLFeatureInfoImage=getURLFunction(URLinfoImage,capabilities);
                    }
                    if(defined(formatArray)){
                        var URLinfoArray=getTemplate(layerName,CRSSelected,capabilities,urlGetFeatureInfo,capabilities.formatArray.format,capabilities.formatFeatureInfo.format);
                        capabilities.getURLFeatureInfoArray=getURLFunction(URLinfoArray,capabilities);
                    }
                }
                var ready = found && (defined(capabilities.formatImage) || defined(capabilities.formatArray));
                readOnlyProperty(capabilities,"ready",ready);
                resultat.push({capabilities:capabilities,layerName:layerName});
            }
        });
        return resultat;
    };
    return OGCHelper;
});