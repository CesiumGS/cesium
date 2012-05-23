define(["dojo/_base/kernel", "dojo/_base/declare", "dojox/geo/openlayers/Geometry"], function(dojo, declare,
		/* ===== 
		var Geometry = dojox.geo.openlayers.Geometry; 
		=====*/																																															Geometry){
	return declare("dojox.geo.openlayers.LineString", Geometry, {
		//	summary:
		//		The `dojox.geo.openlayers.LineString` geometry. This geometry holds an array
		//		of coordinates.

		setPoints : function(p){
			//	summary:
			//		Sets the points for this geometry.
			//	p : Array
			//		An array of {x, y} objects
			this.coordinates = p;
		},

		getPoints : function(){
			//	summary:
			//		Gets the points of this geometry.
			//	returns: Array
			//		The points of this geometry.
			return this.coordinates;
		}

	});
});
