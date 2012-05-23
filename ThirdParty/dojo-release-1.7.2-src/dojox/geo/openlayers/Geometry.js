define(["dojo/_base/kernel", "dojo/_base/declare"], function(dojo, declare){

	return declare("dojox.geo.openlayers.Geometry", null, {
		//	summary:
		//		A Geometry handles description of shapes to be rendered in a GfxLayer
		//		using a GeometryFeature feature.
		//		A Geometry can be 
		//	- A point geometry of type dojox.geo.openlayers.Point. Coordinates are a an 
		//	Object {x, y}
		//	- A line string geometry of type dojox.geo.openlayers.LineString. Coordinates are
		//	an array of {x, y} objects
		//	- A collection geometry of type dojox.geo.openlayers.Collection. Coordinates are an array of geometries.

		//	summary:
		//		The coordinates of the geometry.
		//		coordinates: {x, y} | Array 
		coordinates : null,

		//	summary:
		//		The associated shape when rendered
		//	shape : dojox.gfx.Shape
		// 		The shape
		//	tags:
		//		internal
		shape : null,

		constructor : function(coords){
			//	summary:
			//		Constructs a new geometry
			//	coords: {x, y}
			//		Coordinates of the geometry. {x:<x>, y:<y>} object for a point geometry, array of {x:<x>, y:<y>} 
			//	objects for line string geometry, array of geometries for collection geometry.
			this.coordinates = coords;
		}
	});
});
