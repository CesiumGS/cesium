define([
	"dojo/_base/kernel",
	"dojo/_base/declare",
	"./_base"
], function(dojo, declare, openlayers){

	return declare("dojox.geo.openlayers.Feature", null, {
		// summary:
		//		A Feature encapsulates an item so that it can be added to a Layer.
		//		This class is not attended to be used as it, but serve as a base class
		//		for specific features such as GeometryFeature which can display georeferenced 
		//		geometries and WidgetFeature which can display georeferenced widgets. 
		constructor: function(){
			// summary:
			//		Construct a new Feature
			this._layer = null;
			this._coordSys = openlayers.EPSG4326;
		},

		getCoordinateSystem: function(){
			// summary:
			//		Returns the coordinate system in which coordinates of this feature are expressed.
			// returns:
			//		The coordinate system in which coordinates of this feature are expressed.
			return this._coordSys; // OpenLayers.Projection
		},

		setCoordinateSystem: function(/* OpenLayers.Projection */cs){
			// summary:
			//		Set the coordinate system in which coordinates of this feature are expressed.
			// cs: OpenLayers.Projection
			//		The coordinate system in which coordinates of this feature are expressed.
			this._coordSys = cs;
		},

		getLayer: function(){
			// summary:
			//		Returns the Layer to which this feature belongs.
			// returns:
			//		The layer to which this feature belongs.
			return this._layer; // dojox/geo/openlayers/Layer
		},

		_setLayer: function(/* dojox/geo/openlayers/Layer */l){
			// summary:
			//		Sets the layer to which this Feature belongs
			// description:
			//		Called when the feature is added to the Layer.
			// tags:
			//		private
			this._layer = l;
		},

		render: function(){
		// summary:
		//		subclasses implements drawing specific behavior.
		},

		remove: function(){
		// summary:
		//		Subclasses implements specific behavior.
		//		Called when removed from the layer.
		},

		_getLocalXY: function(p){
			// summary:
			//		From projected coordinates to screen coordinates
			// p: Object
			//		Object with x and y fields
			// tags:
			//		private
			var x = p.x;
			var y = p.y;
			var layer = this.getLayer();
			var resolution = layer.olLayer.map.getResolution();
			var extent = layer.olLayer.getExtent();
			var rx = (x / resolution + (-extent.left / resolution));
			var ry = ((extent.top / resolution) - y / resolution);
			return [rx, ry];
		}
	});
});
