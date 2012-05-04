define(["dojo/_base/kernel", "dojo/_base/declare", "dojox/geo/openlayers/Geometry"],
	function(dojo, declare, Geometry){
	/*===== 
	var Geometry = dojox.geo.openlayers.Geometry; 
	=====*/
	return declare("dojox.geo.openlayers.Point", Geometry, {
		//	summary:
		//		A Point geometry handles description of points to be rendered in a GfxLayer

		setPoint : function(p){
			//	summary:
			//		Sets the point for this geometry.
			//	p : {x, y} Object
			//		The point geometry.
			this.coordinates = p;
		},

		getPoint : function(){
			//	summary:
			//		Gets the point defining this geometry.
			//	returns: {x, y} Object
			//		The point defining this geometry.
			return this.coordinates;
		}
	});
});
