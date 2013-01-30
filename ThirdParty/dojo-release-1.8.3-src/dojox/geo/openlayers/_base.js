define(["dojo/_base/lang"], function(lang){
	
	var openlayers = lang.getObject("dojox.geo.openlayers", true);
	/*===== openlayers = dojox.geo.openlayers; =====*/
	
	openlayers.BaseLayerType = {
		// summary:
		//		Defines the base layer types to be used at Map construction time or
		//		with the setBaseLayerType function.
		// description:
		//		This object defines the base layer types to be used at Map construction
		//		time or with the setBaseLayerType function.

		// OSM: String
		//		The Open Street Map base layer type selector.
		OSM: "OSM",

		// WMS: String
		//		The Web Map Server base layer type selector.
		WMS: "WMS",

		// GOOGLE: String
		//		The Google base layer type selector.
		GOOGLE: "Google",

		// VIRTUAL_EARTH: String
		//		The Virtual Earth base layer type selector.
		VIRTUAL_EARTH: "VirtualEarth",

		// BING: String
		//		Same as Virtual Earth
		BING: "VirtualEarth",

		// YAHOO: String
		//		The Yahoo base layer type selector.
		YAHOO: "Yahoo",

		// ARCGIS: String
		//		The ESRI ARCGis base layer selector.
		ARCGIS: "ArcGIS"
	};

	openlayers.EPSG4326 = new OpenLayers.Projection("EPSG:4326");

	var re = /^\s*(\d{1,3})[D°]\s*(\d{1,2})[M']\s*(\d{1,2}\.?\d*)\s*(S|"|'')\s*([NSEWnsew]{0,1})\s*$/i;
	openlayers.parseDMS = function(v, toDecimal){
		// summary:
		//		Parses the specified string and returns degree minute second or decimal degree.
		// description:
		//		Parses the specified string and returns degree minute second or decimal degree.
		// v: String
		//		The string to parse
		// toDecimal: Boolean
		//		Specifies if the result should be returned in decimal degrees or in an array
		//		containing the degrees, minutes, seconds values.
		// returns: Float|Array
		//		the parsed value in decimal degrees or an array containing the degrees, minutes, seconds values.

		var res = re.exec(v);
		if(res == null || res.length < 5){
			return parseFloat(v);
		}
		var d = parseFloat(res[1]);
		var m = parseFloat(res[2]);
		var s = parseFloat(res[3]);
		var nsew = res[5];
		if(toDecimal){
			var lc = nsew.toLowerCase();
			var dd = d + (m + s / 60.0) / 60.0;
			if(lc == "w" || lc == "s"){
				dd = -dd;
			}
			return dd;
		}
		return [d, m, s, nsew];
	};
	
	return openlayers;
});
