define([
	"dojo/_base/lang",
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/dom-geometry",
	"dojo/query",
	"dijit/_Widget",
	"../_base",
	"../Map",
	"../Layer",
	"../GfxLayer"
], function(lang, declare, array, domgeo, query, Widget, openlayers, Map, Layer, GfxLayer){

	return declare("dojox.geo.openlayers.widget.Map", Widget, {
		// summary:
		//		A widget version of the `dojox.geo.openlayers.Map` component.
		// description:
		//		The `dojox.geo.openlayers.widget.Map` widget is the widget 
		//		version of the `dojox.geo.openlayers.Map` component. 
		//		With this widget, user can specify some attributes in the markup such as
		//		
		//		- `baseLayerType`: The type of the base layer. Permitted values are
		//		- `initialLocation`: The initial location as for the dojox.geo.openlayers.Map.fitTo method
		//		- `touchHandler`: Tells if we attach touch handler or not.
		//
		// example:
		//	| <div id="map" dojoType="dojox.geo.openlayers.widget.Map" baseLayerType="Google" initialLocation="{
		//	|   position: [7.154126, 43.651748],
		//	|   extent: 0.2 }"
		//	| style="background-color: #b5d0d0; width: 100%; height: 100%;">
		//

		// baseLayerType: String
		//		Base layer type as defined in `dojox.geo.openlayer.BaseLayerType`. Can be one of:
		//
		//		- `OSM`
		//		- `WMS`
		//		- `Google`
		//		- `VirtualEarth`
		//		- `Yahoo`
		//		- `ArcGIS`
		baseLayerType: openlayers.BaseLayerType.OSM,

		// initialLocation: String
		//		The part of the map shown at startup time. It is the string description of the location shown at
		//		startup time. Format is the same as for the `dojox.geo.openlayers.widget.Map.fitTo`
		//		method.
		//	|	{
		//	|		bounds: [ulx, uly, lrx, lry]
		//	|	}
		//		The map is fit on the specified bounds expressed as decimal degrees latitude and longitude.
		//		The bounds are defined with their upper left and lower right corners coordinates.
		//
		//	|	{
		//	|		position: [longitude, latitude],
		//	|		extent: degrees
		//	|	}
		//		The map is fit on the specified position showing the extent `<extent>` around
		//		the specified center position.
		initialLocation: null,

		// touchHandler: Boolean
		//		Tells if the touch handler should be attached to the map or not.
		//		Touch handler handles touch events so that the widget can be used
		//		on mobile applications.
		touchHandler: false,

		// map: [readonly] Map
		//		The underlying `dojox/geo/openlayers/Map` object.
		map : null,

		startup: function(){
			// summary:
			//		Processing after the DOM fragment is added to the document
			this.inherited(arguments);
			this.map.initialFit({
				initialLocation: this.initialLocation
			});
		},

		buildRendering: function(){
			// summary:
			//		Construct the UI for this widget, creates the real dojox.geo.openlayers.Map object.		
			// tags:
			//		protected
			this.inherited(arguments);
			var div = this.domNode;
			var map = new Map(div, {
				baseLayerType: this.baseLayerType,
				touchHandler: this.touchHandler
			});
			this.map = map;

			this._makeLayers();
		},

		_makeLayers: function(){
			// summary:
			//		Creates layers defined as markup.
			// tags:
			//		private
			var n = this.domNode;
			var layers = /* ?? query. */query("> .layer", n);
			array.forEach(layers, function(l){
				var type = l.getAttribute("type");
				var name = l.getAttribute("name");
				var cls = "dojox.geo.openlayers." + type;
				var p = lang.getObject(cls);
				if(p){
					var layer = new p(name, {});
					if(layer){
						this.map.addLayer(layer);
					}
				}
			}, this);
		},

		resize : function(b,h){
			// summary:
			//		Resize the widget.
			// description:
			//		Resize the domNode and the widget to the dimensions of a box of the following form:
			//		`{ l: 50, t: 200, w: 300: h: 150 }`
			// b: Object|Number?
			//		If passed, denotes the new size of the widget.
			//		Can be either nothing (widget adapts to the div),
			//		an Object describing a box, or a Number representing the width.
			// h: Number?
			//		The new height. Requires that a width has been specified in the first parameter.

			var olm = this.map.getOLMap();

			var box;
			switch(arguments.length){
				case 0:
					// case 0, do not resize the div, just the surface
				break;
				case 1:
					// argument, override node box
					box = lang.mixin({}, b);
					domgeo.setMarginBox(olm.div, box);
				break;
				case 2:
					// two argument, width, height
					box = {
						w: arguments[0],
						h: arguments[1]
					};
					domgeo.setMarginBox(olm.div, box);
				break;
			}
			olm.updateSize();
		}
	});
});
