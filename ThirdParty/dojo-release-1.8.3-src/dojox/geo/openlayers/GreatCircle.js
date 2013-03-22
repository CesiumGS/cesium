define([
	"dojo/_base/lang",
	"./_base",
	"./GeometryFeature"
], function(lang, openlayers, GeometryFeature){

	var gc = openlayers.GreatCircle = {

		toPointArray: function(p1, p2, increment){
			// summary:
			//		Create a geodetic line as an array of OpenLayers.Point.
			// description:
			//		Create a geodetic line as an array of OpenLayers.Point between the point p1
			//		and the point p2. Result is a polyline approximation for which a new point is 
			//		calculated every <em>increment</em> degrees.
			// p1: Point
			//		The first point of the geodetic line. x and y fields are longitude and
			//		latitude in decimal degrees.
			// p2: Point
			//		The second point of the geodetic line. x and y fields are longitude and
			//		latitude in decimal degrees.
			// increment: Float
			//		The value at which a new point is computed. 
			var startLon = p1.x;
			var endLon = p2.x;
			var sl = Math.min(startLon, endLon);
			var el = Math.max(startLon, endLon);

			var d2r = this.DEG2RAD;
			var lat1 = p1.y * d2r;
			var lon1 = p1.x * d2r;
			var lat2 = p2.y * d2r;
			var lon2 = p2.x * d2r;

			if(Math.abs(lon1 - lon2) <= this.TOLERANCE){
				var l = Math.min(lon1, lon2);
				lon2 = l + Math.PI;
			}

			if(Math.abs(lon2 - lon1) == Math.PI){
				if(lat1 + lat2 == 0.0){
					lat2 += Math.PI / 180000000;
				}
			}

			var lon = sl * d2r;
			var elon = el * d2r;
			var incr = increment * d2r;
			var wp = [];
			var k = 0;
			var r2d = this.RAD2DEG;

			while(lon <= elon){
				lat = Math.atan((Math.sin(lat1) * Math.cos(lat2) * Math.sin(lon - lon2) - Math.sin(lat2) * Math.cos(lat1)
																																									* Math.sin(lon - lon1))
												/ (Math.cos(lat1) * Math.cos(lat2) * Math.sin(lon1 - lon2)));
				var p = {
					x: lon * r2d,
					y: lat * r2d
				};
				wp[k++] = p;
				if(lon < elon && (lon + incr) >= elon){
					lon = elon;
				}else{
					lon = lon + incr;
				}
			}
			return wp;
		},

		toLineString: function(p1, p2, increment){
			// summary:
			//		Create a geodetic line as an array of OpenLayers.Geometry.LineString.
			// description:
			//		Create a geodetic line as a OpenLayers.Geometry.LineString between the point p1
			//		and the point p2. Result is a polyline approximation for which a new point is 
			//		calculated every <em>increment</em> degrees.
			// p1: Point
			//		The first point of the geodetic line. x and y fields are longitude and
			//		latitude in decimal degrees.
			// p2: Point
			//		The second point of the geodetic line. x and y fields are longitude and
			//		latitude in decimal degrees.
			// increment: Float
			//		The value at which a new point is computed. 
			var wp = this.toPointArray(p1, p2, increment);
			var ls = new OpenLayers.Geometry.LineString(wp);
			return ls;
		},

		toGeometryFeature: function(p1, p2, increment){
			// summary:
			//		Create a geodetic line as an array of dojox.geo.openlayers.GeometryFeature.
			// description:
			//		Create a geodetic line as a dojox.geo.openlayers.GeometryFeature between the point p1
			//		ant the point p2. Result is a polyline approximation for which a new point is 
			//		calculated every <em>increment</em> degrees.
			// p1: Point
			//		The first point of the geodetic line. x and y fields are longitude and
			//		latitude in decimal degrees.
			// p2: Point
			//		The second point of the geodetic line. x and y fields are longitude and
			//		latitude in decimal degrees.
			// increment: Float
			//		The value at which a new point is computed. 
			// returns:
			//		The geodetic line as a GeometryFeature

			var ls = this.toLineString(p1, p2, increment);
			return new GeometryFeature(ls); // GeometryFeature
		},

		DEG2RAD: Math.PI / 180,

		RAD2DEG: 180 / Math.PI,

		TOLERANCE: 0.00001
	};
	
	return gc;
});
