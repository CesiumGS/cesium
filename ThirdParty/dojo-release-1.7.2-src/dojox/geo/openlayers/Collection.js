define([ "dojo/_base/kernel", "dojo/_base/declare", "dojox/geo/openlayers/Geometry" ],
		function(dojo, declare, Geometry) {
			/*===== 
			var Geometry = dojox.geo.openlayers.Geometry; 
			=====*/
			return declare("dojox.geo.openlayers.Collection", Geometry, {
				// summary:
				// A collection of geometries. _coordinates_ holds an array of
				// geometries.

				setGeometries : function(/* Array */g) {
					// summary:
					// Sets the geometries
					// g: Array
					// The array of geometries.
					this.coordinates = g;
				},

				// summary:
				// Retrieves the geometries.
				// returns: Array
				// The array of geometries defining this collection.
				getGeometries : function() {
					return this.coordinates;
				}
			});
		});
