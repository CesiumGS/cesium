define([
	"dojo/_base/declare",
	"./Geometry"
], function(declare, Geometry){

	return declare("dojox.geo.openlayers.LineString", Geometry, {
		// summary:
		//		The `dojox.geo.openlayers.LineString` geometry. This geometry holds an array
		//		of coordinates.

		setPoints: function(p){
			// summary:
			//		Sets the points for this geometry.
			// p: Object[]
			//		An array of {x, y} objects
			this.coordinates = p;
		},

		getPoints: function(){
			// summary:
			//		Gets the points of this geometry.
			// returns:
			//		The points of this geometry.
			return this.coordinates; // Object[]
		}

	});
});
