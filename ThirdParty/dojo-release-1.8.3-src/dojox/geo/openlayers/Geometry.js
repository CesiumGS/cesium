define([
	"dojo/_base/declare"
], function(declare){

	return declare("dojox.geo.openlayers.Geometry", null, {
		// summary:
		//		A Geometry handles description of shapes to be rendered in a GfxLayer
		//		using a GeometryFeature feature.
		//		A Geometry can be:
		//
		//		- A point geometry of type dojox.geo.openlayers.Point. Coordinates are a an 
		//		Object {x, y}
		//		- A line string geometry of type dojox.geo.openlayers.LineString. Coordinates are
		//		an array of {x, y} objects
		//		- A collection geometry of type dojox.geo.openlayers.Collection. Coordinates are an array of geometries.

		// coordinates: Object|Array
		//		The coordinates of the geometry, Object like {x, y} or Array.
		coordinates : null,

		// shape: [private] dojox/gfx/shape.Shape
		//		The associated shape when rendered
		shape: null,

		constructor: function(coords){
			// summary:
			//		Constructs a new geometry
			// coords: Object
			//		Coordinates of the geometry. {x:``x``, y:``y``} object for a point geometry, array of {x:``x``, y:``y``}
			//		objects for line string geometry, array of geometries for collection geometry.
			this.coordinates = coords;
		}
	});
});
