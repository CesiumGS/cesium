define([
	"dojo/_base/declare",
	"./Geometry"
], function(declare, Geometry){

	return declare("dojox.geo.openlayers.Collection", Geometry, {
		// summary:
		//		A collection of geometries. 

		// coordinates: Array
		//		An array of geometries.
		coordinates:null,

		setGeometries: function(g){
			// summary:
			//		Sets the geometries
			// g: Array
			//		The array of geometries.
			this.coordinates = g;
		},

		getGeometries: function(){
			// summary:
			//		Returns the geometries.
			// returns:
			//		The array of geometries defining this collection.
			return this.coordinates; // Array
		}
	});
});
