define([
	"dojo/_base/declare",
	"dojo/_base/connect",
	"dojo/dom-style",
	"dojox/gfx",
	"dojox/gfx/matrix",
	"./Feature",
	"./Layer"
], function(declare, connect, style, gfx, matrix, Feature, Layer){

	return declare("dojox.geo.openlayers.GfxLayer", Layer, {
		// summary:
		//		A layer dedicated to render dojox.geo.openlayers.GeometryFeature
		// description:
		//		A layer class for rendering geometries as dojox.gfx.Shape objects.
		//		This layer class accepts Features which encapsulates graphic objects to be added to the map.
		//		All objects should be added to this group.
		// tags:
		//		private
		_viewport: null,

		constructor: function(name, options){
			// summary:
			//		Constructs a new GFX layer.
			var s = gfx.createSurface(this.olLayer.div, 100, 100);
			this._surface = s;
			var vp;
			if(options && options.viewport){
				vp = options.viewport;
			}else{
				vp = s.createGroup();
			}
			this.setViewport(vp);
			connect.connect(this.olLayer, "onMapResize", this, "onMapResize");
			this.olLayer.getDataExtent = this.getDataExtent;
		},

		getViewport: function(){
			// summary:
			//		Gets the viewport
			// tags:
			//		internal
			return this._viewport;
		},

		setViewport: function(g){
			// summary:
			//		Sets the viewport
			// g: dojox.gfx.Group
			// tags:
			//		internal
			if(this._viewport){
				this._viewport.removeShape();
			}
			this._viewport = g;
			this._surface.add(g);
		},

		onMapResize: function(){
			// summary:
			//		Called when map is resized.
			// tags:
			//		protected
			this._surfaceSize();
		},

		setMap: function(map){
			// summary:
			//		Sets the map for this layer.
			// tags:
			//		protected
			this.inherited(arguments);
			this._surfaceSize();
		},

		getDataExtent: function(){
			// summary:
			//		Get data extent
			// tags:
			//		private
			var ret = this._surface.getDimensions();
			return ret;
		},

		getSurface: function(){
			// summary:
			//		Get the underlying dojox.gfx.Surface
			// returns:
			//		The dojox.gfx.Surface this layer uses to draw its GFX rendering.
			return this._surface; // dojox.gfx.Surface
		},

		_surfaceSize: function(){
			// summary:
			//		Recomputes the surface size when being resized.
			// tags:
			//		private
			var s = this.olLayer.map.getSize();
			this._surface.setDimensions(s.w, s.h);
		},

		moveTo: function(event){
			// summary:
			//		Called when this layer is moved or zoomed.
			// event:
			//		The event
			var s = style.get(this.olLayer.map.layerContainerDiv);
			var left = parseInt(s.left);
			var top = parseInt(s.top);

			if(event.zoomChanged || left || top){
				var d = this.olLayer.div;

				style.set(d, {
					left: -left + "px",
					top: -top + "px"
				});

				if(this._features == null){
					return;
				}
				var vp = this.getViewport();

				vp.setTransform(matrix.translate(left, top));

				this.inherited(arguments);

			}
		},

		added: function(){
			// summary:
			//		Called when added to a map.
			this.inherited(arguments);
			this._surfaceSize();
		}

	});
});
