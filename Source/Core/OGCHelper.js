/*global define*/
define([
        '../Scene/ImageryLayerFeatureInfo',
        '../ThirdParty/when',
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
	 * <li>- postProcessArray: the function to apply to have an exploitable array. Return an usable typedArray. The parameters are:<ul>
	 *                          <li>-bufferIn : buffer to process</li>
	 *                          <li>-size: defines the dimension of the array (size.height* size.width cells)</li>
	 *                          <li>-highest: defines the highest element (without offset) of the data.</li>
	 *                          <li>-lowest: defines the lowest element (without offset) of the data.</li>
	 *                          <li>-offset: defines the offset of the data in order adjust the limitations</li>
	 *</ul></li></ul>
	 */
	 OGCHelper.FormatArray = [ {
	 	format : 'image/bil',
	 	extension:'bil',
	 	postProcessArray : function(bufferIn, size,highest,lowest,offset) {
	 		var resultat;
	 		var viewerIn = new DataView(bufferIn);
	 		var littleEndianBuffer = new ArrayBuffer(size.height * size.width * 2);
	 		var viewerOut = new DataView(littleEndianBuffer);
	 		if (littleEndianBuffer.byteLength === bufferIn.byteLength) {
				// time to switch bytes!!
				var temp, goodCell = 0, somme = 0;
				for (var i = 0; i < littleEndianBuffer.byteLength; i += 2) {
					temp = viewerIn.getInt16(i, false)-offset;
					if (temp > lowest && temp < highest) {
						viewerOut.setInt16(i, temp, true);
						somme += temp;
						goodCell++;
					} else {
						var val = (goodCell == 0 ? 1 : somme / goodCell);
						viewerOut.setInt16(i, val, true);
					}
				}
				resultat = new Int16Array(littleEndianBuffer);
			}
			return resultat;
		}
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
	};

	var getFormat=function (tab,tabNodes){
		var sortie;
		for (var l = 0; l < tab.length && !defined(sortie); l++) {
			var validFormats=tabNodes.filter(function(elt){
				return elt.textContent === tab[l].format;
			});
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

	
	OGCHelper.FormatCoverage=[];

	OGCHelper.WMSParser={};
	OGCHelper.TMSParser={};
	OGCHelper.WMTSParser={};
	OGCHelper.WCSParser={};

	/**
	 * Parse WMS(Web Map Service), TMS (Tile Map Service), WMTS (Web Map Tile Service) or WCS (Web Coverage Service) 
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
	 * @param {String}
	 *            [description.style=''] the preferred style to apply. 
	 * @param {Object}
	 *            [description.proxy] A proxy to use for requests. This object
	 *            is expected to have a getURL function which returns the
	 *            proxied URL, if needed.
	 * @param {Number}
	 *            [description.heightMapWidth=256] width  of a tile in pixels
	 * @param {Number}
	 *            [description.heightMapHeight=256] height of a tile in pixels
	 * @param {Object}
	 *			  [description.formatImage] an image format to use in priority. This object must follow the description of an {@link OGCHelper#FormatImage} element
	 * @param {Object}
	 *			  [description.formatArray] an array format to use in priority. This object must follow the description of an {@link OGCHelper#FormatArray} element
	 * @return {promise} It's a promise of object array. Each element of the array has for attributes 'layerName'(a string) and 'capabilities' (OGCCapabilites). See {@link OGCCapabilities}
	 */
	 OGCHelper.parser=function(description){
	 	var resultat;
	 	description = defaultValue(description,defaultValue.EMPTY_OBJECT);
	 	if (!(defined(description.url) || defined(description.xml))) {
	 		throw new DeveloperError(
	 			'either description.url or description.xml are required.');
	 	}
	 	if(defined(description.xml) && (description.xml instanceof XMLDocument) ){
	 		var parser=new DOMParser();
	 		description.xml=parser.parseFromString(description.xml, "text/xml");
	 	}
	 	description.tabFormatImage=OGCHelper.FormatImage.slice(); //make a clone
		description.tabFormatArray=OGCHelper.FormatArray.slice();//make a clone
		if(defined(description.formatImage)){
			description.tabFormatImage.unshift(description.formatImage);
		}
		if(defined(description.formatArray)){
			description.tabFormatArray.unshift(description.formatArray);
		}
	 	switch(description.service){
	 		case 'TMS':
	 			resultat=xxxParserGenerate(description,'',OGCHelper.TMSParser.parseXML);
	 		break;
	 		case 'WMTS':
	 			resultat=xxxParserGenerate(description,'?REQUEST=GetCapabilities',OGCHelper.WMTSParser.getMetaDatafromXML);
	 		break;
	 		case 'WCS':
	 			resultat=OGCHelper.WCSParser.generate(description);
	 		break;
	 		default: 
	 			resultat=xxxParserGenerate(description,'?SERVICE=WMS&REQUEST=GetCapabilities&tiled=true',OGCHelper.WMSParser.getMetaDatafromXML);
	 	}
	 	return resultat;
	 };

	 OGCHelper.TMSParser.parseXML=function(xml,description){
	 	var resultat;
		//description of a tile map service or of a tile map?
		if(xml.querySelector('TileMapService')!=null){
			var mapServiceNodes=[].slice.apply(xml.querySelectorAll('TileMap'));
			var promises=mapServiceNodes.map(function(elt){
				var url=elt.getAttribute('href');
				if(defined(description.proxy)){
					url=description.proxy.getURL(url);
				}
				return when(loadXML(url),function(xml){
					return OGCHelper.TMSParser.getMetaDatafromXML(xml,description);
				});
			});
			resultat=when.all(promises);
		}else{
			resultat=when([OGCHelper.TMSParser.getMetaDatafromXML(xml,description)]);
		}
		return resultat;
	};
	
	OGCHelper.TMSParser.getMetaDatafromXML=function(xml,description){
		var layerName=xml.querySelector('Title').textContent;
		var capabilities={};
		capabilities.ready = false;
		capabilities.heightMapWidth = defaultValue(description.heightMapWidth,256);
		capabilities.heightMapHeight = defaultValue(description.heightMapHeight,capabilities.heightMapWidth);
		capabilities.styles=[''];
		capabilities.dimensions=[];
		
		var proxy=description.proxy;
		
		var srs=xml.querySelector('SRS').textContent;
		var goodCRS=OGCHelper.CRS.filter(function(elt){
			return elt.name===srs;
		});
		if(goodCRS.length>0){
			capabilities.tilingScheme = new goodCRS[0].tilingScheme({
				ellipsoid : goodCRS[0].ellipsoid
			});
		}

		var extension=xml.querySelector('TileFormat').getAttribute('extension');
		var getFormatExtension=function (tab,ext){
			var sortie;
			var goodFormat=tab.filter(function(elt){return elt.extension==ext;});
			if(goodFormat.length>0){
				sortie = goodFormat[0];
			}
			return sortie;
		}

		capabilities.formatImage=getFormatExtension(description.tabFormatImage,extension);
		capabilities.formatArray=getFormatExtension(description.tabFormatArray,extension);

		var tilsetsNode=[].slice.call(xml.querySelectorAll('TileSets>TileSet'));
		var tileSets=[];

		if(defined(capabilities.formatImage)||defined(capabilities.formatArray)){
			tileSets=tilsetsNode.map(function(tileSet){
				var url=tileSet.getAttribute('href')+'/{x}/{tmsY}.{extension}';
				if(defined(proxy)){
					url=proxy.getURL(url);
				}
				var level=parseInt(tileSet.getAttribute('order'));
				return {url:url,level:level};
			});
			tileSets.sort(function(a,b){
				return a.level-b.level;
			});
		}

		var boundingBoxNode=xml.querySelector('BoundingBox');
		var miny=parseFloat(boundingBoxNode.getAttribute('miny'));
		var maxy=parseFloat(boundingBoxNode.getAttribute('maxy'));
		var minx=parseFloat(boundingBoxNode.getAttribute('minx'));
		var maxx=parseFloat(boundingBoxNode.getAttribute('maxx'));
		var limites=new Rectangle(minx,miny,maxx,maxy);

		if((tileSets.length>0) && defined(capabilities.tilingScheme)){
			capabilities.getTileDataAvailable=function(x,y,level){
				var rect= capabilities.tilingScheme.tileXYToNativeRectangle(x, y,level);
				var scratchRectangle=intersectionRectangle(limites, rect);
				return defined(scratchRectangle) && level<tileSets.length;
			}

			if(defined(capabilities.formatImage)){
				capabilities.getURLImage=function(x,y,level){
					var retour='';
					if(level<tileSets.length){
						retour=tileSets[level].url;
						var yTiles = capabilities.tilingScheme.getNumberOfYTilesAtLevel(level);
						var tmsY = (yTiles - y - 1);
						return retour.replace('{x}',x).replace('{tmsY}',tmsY).replace('{extension}',capabilities.formatImage.extension);
					}
					return retour;
				};
				capabilities.ready=true;
			}

			if(defined(capabilities.formatArray)){
				capabilities.getURLArray=function(x,y,level){
					var retour='';
					if(level<tileSets.length){
						retour=tileSets[level].url;
						var yTiles = capabilities.tilingScheme.getNumberOfYTilesAtLevel(level);
						var tmsY = (yTiles - y - 1);
						return retour.replace('{x}',x).replace('{tmsY}',tmsY).replace('{extension}',capabilities.formatArray.extension);
					}
					return retour;
				};
				capabilities.ready=true;
			}
			
		}
		return {capabilities:capabilities,layerName:layerName};
	};

	OGCHelper.WMTSParser.getMetaDatafromXML = function(xml,description){
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
		//definition of all tileMatrixSets (each element have identifier,CRS,tileSets)
		var tileMatrixSets=[].slice.call(xml.querySelectorAll("TileMatrixSet>Identifier")).map(function(element){
			var elementRetour;
			var identifier=element.textContent;
			var node=element.parentNode;
			var supportedCRS=node.querySelector("SupportedCRS").textContent;
			var filtredCRS=OGCHelper.CRS.filter(function(OGCcrs){return OGCcrs.supportedCRS===supportedCRS});

			if(filtredCRS.length>0){
				var nodeTileSets=[].slice.call(node.querySelectorAll("TileMatrix"));
				var tileSets=nodeTileSets.map(function(noeud){
					var idNoeud=noeud.querySelector("Identifier").textContent;
					var matrixWidth=parseInt(noeud.querySelector("MatrixWidth").textContent);
					var matrixHeight=parseInt(noeud.querySelector("MatrixHeight").textContent);
					var tileWidth=parseInt(noeud.querySelector("TileWidth").textContent);
					var tileHeight=parseInt(noeud.querySelector("TileHeight").textContent);
					var scaleDenominator=parseFloat(noeud.querySelector("ScaleDenominator").textContent);
					return {id:idNoeud,matrixWidth:matrixWidth,matrixHeight:matrixHeight,scaleDenominator:scaleDenominator,complete:false,
						tileWidth:tileWidth,tileHeight:tileHeight};
					});

				tileSets.sort(function(a,b){
					return b.scaleDenominator-a.scaleDenominator;
				});
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
					if(styleNodes[j].getAttribute("isDefault")!=null){
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
			if(!defined(styleName) || styleName!=selectedStyle){
				styleName=defaultValue(defaultStyle,"");
			}
			if(styleName!=defaultStyle){
				styles.unshift(styleName,defaultStyle);
			}else{
				styles.unshift(styleName);
			}
			capabilities.styles=styles;

			//format
			var nodeFormats=[].slice.call(layerNode.querySelectorAll("Format"));
			capabilities.formatImage=getFormat(description.tabFormatImage,nodeFormats);
			capabilities.formatArray=getFormat(description.tabFormatArray,nodeFormats);

			var nodeInfoFormats=[].slice.call(layerNode.querySelectorAll("InfoFormat"));
			capabilities.formatFeatureInfo=getFormat(OGCHelper.FormatFeatureInfo,nodeInfoFormats);

			// dimensions
			var nodeDimensions=[].slice.call(layerNode.querySelectorAll("Dimension"));
			capabilities.dimensions=nodeDimensions.map(function(element){
				var Identifier=element.querySelector("Identifier").textContent;
				var UOMNode=element.querySelector("UOM");
				var UOM= (UOMNode!=null)?UOMNode.textContent:undefined;
				var Default=element.querySelector("Default").textContent;
				var Value=[].slice.call(element.querySelectorAll("Value")).map(function(elt){return elt.textContent});
				return {Identifier:Identifier,UOM:UOM,Default:Default,Value:Value};
			});


			//TileMatrixSetLink =>TileMatrixSet
			listTileMatrixSetLinkNode=layerNode.querySelectorAll("TileMatrixSetLink");
			for(var a=0;a<listTileMatrixSetLinkNode.length && !capabilities.ready;a++){
				var matrixSetLinkNode=listTileMatrixSetLinkNode[a];
				var tileMatrixSetLinkName=matrixSetLinkNode.querySelector("TileMatrixSet").textContent;
				var selectedTileMatrixSet=tileMatrixSets.filter(function(element){return element.identifier==tileMatrixSetLinkName});

				if(selectedTileMatrixSet.length>0){
					var tileMatrixSet=selectedTileMatrixSet[0];
					capabilities.heightMapWidth = tileMatrixSet.tileSets[0].tileWidth;
					capabilities.heightMapHeight = tileMatrixSet.tileSets[0].tileHeight;

					capabilities.tilingScheme = new tileMatrixSet.CRS.tilingScheme({
						ellipsoid : tileMatrixSet.CRS.ellipsoid,
						numberOfLevelZeroTilesX:tileMatrixSet.tileSets[0].matrixWidth,
						numberOfLevelZeroTilesY:tileMatrixSet.tileSets[0].matrixHeight});

					//TileMatrixSetLimits>TileMatrixLimits is optional. Nevertheless, if these elements are present, it's needed in order to have best precision!
					var myTileSets=[].slice.call(matrixSetLinkNode.querySelectorAll("TileMatrixSetLimits>TileMatrixLimits")).map(function(elt){
						var retour;
						var id=elt.querySelector("TileMatrix").textContent;
						var goodTileSet=tileMatrixSet.tileSets.filter(function(element){
							return id===element.id;
						});
						if (goodTileSet.length>0){
							retour={};
							var goodTile=goodTileSet[0];
							for( var att in goodTile){
								retour[att]=goodTile[att];
							}
							retour.minTileRow=parseInt(elt.querySelector("MinTileRow").textContent.trim());
							retour.maxTileRow=parseInt(elt.querySelector("MaxTileRow").textContent.trim());
							retour.minTileCol=parseInt(elt.querySelector("MinTileCol").textContent.trim());
							retour.maxTileCol=parseInt(elt.querySelector("MaxTileCol").textContent.trim());
							retour.complete=true;
						}
						return retour;
					}).filter(function(elt){return defined(elt)});
					
					if(myTileSets.length==0){
						myTileSets=tileMatrixSet.tileSets;
					}else{
						myTileSets.sort(function(a,b){
							return b.scaleDenominator-a.scaleDenominator;
						});
					}
					capabilities.getTileDataAvailable=function(x,y,level){
						var retour=false;
						if(level<myTileSets.length){
							var tile=myTileSets[level];
							if(tile.complete){
								retour= (y<=tile.maxTileRow && y>=tile.minTileRow) && (x<=tile.maxTileCol && x>=tile.minTileCol);
							}else{
								retour= x<tile.matrixWidth && y<tile.matrixHeight;
							}
						}
						return retour;
					};

					var getTemplate=function(format,requestType,KVP){ 
						var resourceType= (requestType=="GetTile")?"tile":"FeatureInfo";
						var resourceURL=layerNode.querySelector("ResourceURL[format='"+format+"'][resourceType='"+resourceType+"']");
						var template;
						if(resourceURL!=null){
							template=resourceURL.getAttribute("template").replace("{TileRow}","{y}").replace("{TileCol}","{x}").
							replace("{TileMatrixSet}",tileMatrixSetLinkName).replace("{Layer}",layerName);
						}else if(defined(KVP)){
							template=KVP+"service=WMTS&request="+requestType+"&version=1.0.0&layer="+layerName+"&style={Style}&format="+format+"&TileMatrixSet="+tileMatrixSetLinkName+"&TileMatrix={TileMatrix}&TileRow={y}&TileCol={x}";
							capabilities.dimensions.forEach(function(elt){
								template+="&"+elt.Identifier+"={"+elt.Identifier+"}";
							});
							if(requestType=="GetFeatureInfo"){
								if(defined(capabilities.formatFeatureInfo.format)){
									template+="&i={I}&j={J}&infoFormat="+capabilities.formatFeatureInfo.format;
								}else{
									template=undefined;
								}
							}
						}
						return template;
					};

					var getURLFunction=function(template){ 
						var theURLFunction=function(x,y,level,options){
								var options = defaultValue(options,[]);
								// does options.style is in the array capabilities.styles?
								if(capabilities.styles.filter(function(elt){return elt==options.style}).length==0){
									options.style=styleName;
								}
								options.dimensions=defaultValue(options.dimensions,[]);
								var retour="";
								if(capabilities.getTileDataAvailable(x,y,level)){
									var tile=myTileSets[level];
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
											if(element.name==elt.Identifier){
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
						return theURLFunction;
					};

					if(defined(capabilities.formatImage)){
						var template=getTemplate(capabilities.formatImage.format,"GetTile",getTile.KVP);
						if(defined(template)){
							capabilities.getURLImage=getURLFunction(template);
							capabilities.ready=true;
							if(capabilities.formatFeatureInfo){
								template=getTemplate(capabilities.formatImage.format,"GetFeatureInfo",getFeatureInfo.KVP);
								if(defined(template)){
									capabilities.getURLFeatureInfoImage=getURLFunction(template);
								}
							}
						}
					}
					if(defined(capabilities.formatArray)){
						var template=getTemplate(capabilities.formatArray.format,"GetTile",getTile.KVP);
						if(defined(template)){
							capabilities.getURLArray=getURLFunction(template);
							capabilities.ready=true;
							if(capabilities.formatFeatureInfo){
								template=getTemplate(capabilities.formatArray.format,"GetFeatureInfo",getFeatureInfo.KVP);
								if(defined(template)){
									capabilities.getURLFeatureInfoArray=getURLFunction(template);
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

	OGCHelper.WMSParser.getMetaDatafromXML = function(xml, description) {
		// get version of wms 1.1.X or 1.3.X=> for 1.3 use firstAxe for order of
		// CRS
		var resultat=[];
		var version;
		var isNewVersion;
		var heightMapWidth = defaultValue(description.heightMapWidth,256);
		var heightMapHeight = defaultValue(description.heightMapHeight,heightMapWidth);
		
		// get version
		var versionNode = xml.querySelector("[version]");
		if (versionNode !== null) {
			version = versionNode.getAttribute("version");
			isNewVersion = /^1\.[3-9]\./.test(version);
		}
		var getOnlineResource=function(selector){
			var url;
			var nodeSelector=xml.querySelector(selector);
			if(nodeSelector!=null){
				url=nodeSelector.getAttribute("xlink:href")
				var index=url.indexOf("?");
				if(index>-1){
					url=url.substring(0,index);
				}
				if (defined(description.proxy)) {
					url = description.proxy.getURL(url);
				}
			}
			return url
		};
		var urlGetMap=getOnlineResource('Request>GetMap OnlineResource');
		var urlGetFeatureInfo=getOnlineResource('Request>GetFeatureInfo OnlineResource');

		// get list of map format
		var nodeGetMapFormats = [].slice.apply(xml.querySelectorAll("Request>GetMap>Format"));
		var nodeGetFeatureInfoFormats = [].slice.apply(xml.querySelectorAll("Request>GetFeatureInfo>Format"));
		var formatImage=getFormat(description.tabFormatImage,nodeGetMapFormats);
		var formatArray=getFormat(description.tabFormatArray,nodeGetMapFormats);
		var formatFeatureInfo=getFormat(OGCHelper.FormatFeatureInfo,nodeGetFeatureInfoFormats);

		var resultat=[];

		var layerNodes = [].slice.apply(xml.querySelectorAll("Layer[queryable='1'],Layer[queryable='true']"));
		layerNodes.forEach(function(layerNode){

			var capabilities={};
			var layerName=layerNode.querySelector("Name").textContent;
			capabilities.ready = false;
			var fixedHeight=layerNode.getAttribute("fixedHeight");
			var fixedWidth=layerNode.getAttribute("fixedWidth");

			if(defined(fixedHeight)){
				fixedHeight=parseInt(fixedHeight);
				capabilities.heightMapHeight=fixedHeight>0?fixedHeight:heightMapHeight;
			}

			if(defined(fixedWidth)){
				fixedWidth=parseInt(fixedWidth);
				capabilities.heightMapWidth=fixedWidth>0?fixedWidth:heightMapWidth;
			}
			if (defined(isNewVersion)) {
				var found = false;
				var CRSSelected;
				for (var n = 0; n < OGCHelper.CRS.length && !found; n++) {
					CRSSelected = OGCHelper.CRS[n];
					var nodeBBox = layerNode.querySelector("BoundingBox[SRS='"
							+ CRSSelected.name + "'],BoundingBox[CRS='"
							+ CRSSelected.name + "']");

					if (nodeBBox !== null) {
						capabilities.tilingScheme = new CRSSelected.tilingScheme({
							ellipsoid : CRSSelected.ellipsoid
						});

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
						capabilities.getTileDataAvailable = function(x, y, level){
							var rectangleCalcul = capabilities.tilingScheme.tileXYToNativeRectangle(x, y,level);
							var scratchRectangle=intersectionRectangle(rectReference, rectangleCalcul);
							return defined(scratchRectangle);
						};
						found = true;
					}
				}
				
				capabilities.styles = [].slice.apply(layerNode.querySelectorAll("Style>Name")).map(function(node){
					return node.textContent;
				});
				if(capabilities.styles.length==0){
					capabilities.styles.push('');
				}
				// dimensions
				var nodeDimensions=[].slice.call(layerNode.querySelectorAll("Dimension"));
				capabilities.dimensions=nodeDimensions.map(function(element){
					var Identifier=element.getAttribute("name");
					var UOM= element.getAttribute("units");
					var Value=[element.textContent];
					var temp=element.getAttribute("default");
					if(temp==null){
						if(/\//.test(Value[0])){
							var reg=/[,\/]*([^\/,]+)\/([^\/,]+)\/([^\/,]+),?/;
							var tab=reg.exec(Value[0]);
							temp=tab[1];
						}else{
							var reg=/,*([^\/,]+),?/;
							var tab=reg.exec(Value[0]);
							temp=tab[1];
						}
					}
					var Default=temp;
					return {Identifier:Identifier,UOM:UOM,Default:Default,Value:Value};
				});
				
				//changer resolution height et width si existence de tileset dans le xml!!
				var tileSets=xml.querySelectorAll("VendorSpecificCapabilities>TileSet");
				var out=false;
				for (var q=0;q<tileSets.length&&!out;q++){
					var isGoodSRS=tileSets[q].querySelector("BoundingBox[SRS='"
								+ CRSSelected.name + "'],BoundingBox[CRS='"
								+ CRSSelected.name + "']")!==null;
					var isGoodLayer=tileSets[q].querySelector("Layers").textContent=== layerName;
					if(isGoodLayer&&isGoodSRS){
						capabilities.heightMapWidth=parseInt(tileSets[q].querySelector("Width").textContent);
						capabilities.heightMapHeight=parseInt(tileSets[q].querySelector("Height").textContent);
						out=true;
					}
				}

				var getTemplate=function (url,format,infoFormat){
					var request=defined(infoFormat)?'GetFeatureInfo':'GetMap';
					var template=url+'?SERVICE=WMS&REQUEST='+request+'&LAYERS='+ layerName + '&VERSION=' + version+'&BBOX=';
					if(isNewVersion && CRSSelected.firstAxeIsLatitude){
						template+='{south},{west},{north},{east}';
					}else{
						template+='{west},{south},{east},{north}';
					}
					template+='&FORMAT='+format+'&WIDTH='+ capabilities.heightMapWidth +'&HEIGHT=' + capabilities.heightMapHeight;
					template += "&STYLES={style}&STYLE={style}";
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
				}

				var getURLFunction=function(template){ 
					var theURLFunction=function(x,y,level,options){
							var options = defaultValue(options,[]);
							options.dimensions=defaultValue(options.dimensions,[]);
							var retour="";
							if(capabilities.getTileDataAvailable(x,y,level)){
								// does options.style is in the array capabilities.styles?
								if(capabilities.styles.filter(function(elt){return elt==options.style}).length==0){
									options.style=capabilities.styles[0];
								}
								var rect= capabilities.tilingScheme.tileXYToNativeRectangle(x, y,level);
								var xSpacing = (rect.east - rect.west)/ (capabilities.heightMapWidth - 1);
								var ySpacing = (rect.north - rect.south)/ (capabilities.heightMapHeight - 1);
								rect.west -= xSpacing * 0.5;
								rect.east += xSpacing * 0.5;
								rect.south -= ySpacing * 0.5;
								rect.north += ySpacing * 0.5;
								if(!(Number.isInteger(options.i) && capabilities.heightMapWidth>options.i && options.i>=0)){
									options.i=0;
								}
								if(!(Number.isInteger(options.j) && capabilities.heightMapHeight>options.j && options.j>=0)){
									options.j=0;
								}
								retour=template.replace("{south}",rect.south).replace("{north}",rect.north).replace("{west}",rect.west).replace("{east}",rect.east)
								.replace(/{style}/ig,options.style).replace(/{i}/ig,options.i).replace(/{j}/ig,options.j);
								capabilities.dimensions.forEach(function(elt){
									var foundElement;
									options.dimensions.forEach(function(element){
										if(element.name==elt.Identifier){
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
					return theURLFunction;
				};

				if((defined(formatArray) || defined(formatImage)) && defined(urlGetMap)){
					if(defined(formatImage)){
						capabilities.formatImage=formatImage;
						var URLImage=getTemplate(urlGetMap,capabilities.formatImage.format);
						capabilities.getURLImage=getURLFunction(URLImage);
					}
					if(defined(formatArray)){
						capabilities.formatArray=formatArray;
						var URLArray=getTemplate(urlGetMap,capabilities.formatArray.format);
						capabilities.getURLArray=getURLFunction(URLArray);
					}
				}
				if(defined(formatFeatureInfo) && defined(urlGetFeatureInfo)){
					capabilities.formatFeatureInfo=formatFeatureInfo;
					if(defined(formatImage)){
						var URLinfoImage=getTemplate(urlGetFeatureInfo,capabilities.formatImage.format,capabilities.formatFeatureInfo.format);
						capabilities.getURLFeatureInfoImage=getURLFunction(URLinfoImage);
					}
					if(defined(formatArray)){
						var URLinfoArray=getTemplate(urlGetFeatureInfo,capabilities.formatImage.formatArray,capabilities.formatFeatureInfo.format);
						capabilities.getURLFeatureInfoArray=getURLFunction(URLinfoArray);
					}
				}
				capabilities.ready = found && (defined(capabilities.formatImage) || defined(capabilities.formatArray));
				resultat.push({capabilities:capabilities,layerName:layerName})
			}
		});
		return resultat;
	};
		return OGCHelper;
	});