define([
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/lang",
	"dojox/gfx/matrix",
	"./Point",
	"./LineString",
	"./Collection",
	"./Feature"
], function(declare, array, lang, matrix, Point, LineString, Collection, Feature){

	return declare("dojox.geo.openlayers.GeometryFeature", Feature, {
		// summary:
		//		A Feature encapsulating a geometry.
		// description:
		//		This Feature renders a geometry such as a Point or LineString geometry. This Feature
		//		is responsible for reprojecting the geometry before creating a gfx shape to display it.
		//		By default the shape created is a circle for a Point geometry and a polyline for a 
		//		LineString geometry. User can change these behavior by overriding the createShape 
		//		method to create the desired shape.
		// example:
		//	|  var geom = new dojox.geo.openlayers.Point({x:0, y:0});
		//	|  var gf = new dojox.geo.openlayers.GeometryFeature(geom);

		constructor: function(geometry){
			// summary:
			//		Constructs a GeometryFeature for the specified geometry.
			// geometry: dojox/geo/openlayers/Geometry
			//		The geometry to render.
			this._geometry = geometry;
			this._shapeProperties = {};
			this._fill = null;
			this._stroke = null;
		},

		_createCollection: function(/* dojox/geo/openlayers/Geometry */g){
			// summary:
			//		Create collection shape and add it to the viewport.
			// tags:
			//		private
			var layer = this.getLayer();
			var s = layer.getSurface();
			var c = this.createShape(s, g);
			var vp = layer.getViewport();
			vp.add(c);
			return c;
		},

		_getCollectionShape: function(/* dojox/geo/openlayers/Geometry */g){
			// summary:
			//		Get the collection shape, create it if necessary
			// tags:
			//		private
			var s = g.shape;
			if(s == null){
				s = this._createCollection(g);
				g.shape = s;
			}
			return s;
		},

		renderCollection: function(g){
			// summary:
			//		Renders a geometry collection.
			// g: dojox.geo.openlayers.Geometry?
			//		The geometry to render.
			if(g == undefined){
				g = this._geometry;
			}

			s = this._getCollectionShape(g);
			var prop = this.getShapeProperties();
			s.setShape(prop);

			array.forEach(g.coordinates, function(item){
				if(item instanceof Point){
					this.renderPoint(item);
				}else if(item instanceof LineString){
					this.renderLineString(item);
				}else if(item instanceof Collection){
					this.renderCollection(item);
				}else{
					throw new Error();
				}
			}, this);
			this._applyStyle(g);
		},

		render: function(g){
			// summary:
			//		Render a geometry. 
			//		Called by the Layer on which the feature is added. 
			// g: dojox/geo/openlayer/Geometry?
			//		The geometry to draw
			if(g == undefined){
				g = this._geometry;
			}

			if(g instanceof Point){
				this.renderPoint(g);
			}else if(g instanceof LineString){
				this.renderLineString(g);
			}else if(g instanceof Collection){
				this.renderCollection(g);
			}else{
				throw new Error();
			}
		},

		getShapeProperties: function(){
			// summary:
			//		Returns the shape properties. 
			// returns: Object
			//		The shape properties.
			return this._shapeProperties;
		},

		setShapeProperties: function(s){
			// summary:
			//		Sets the shape properties. 
			// s: Object
			//		The shape properties to set.
			this._shapeProperties = s;
			return this;
		},

		createShape: function(s, g){
			// summary:
			//		Called when the shape rendering the geometry has to be created.
			//		This default implementation creates a circle for a point geometry, a polyline for
			//		a LineString geometry and is recursively called when creating a collection.
			//		User may replace this method to produce a custom shape.
			// s: dojox/gfx/Surface
			//		The surface on which the method create the shapes.
			// g: dojox/geo/openlayers/Geometry?
			//		The reference geometry 
			// returns:
			//		The resulting shape.
			if(!g){
				g = this._geometry;
			}

			var shape = null;
			if(g instanceof Point){
				shape = s.createCircle();
			}else if(g instanceof LineString){
				shape = s.createPolyline();
			}else if(g instanceof Collection){
				var grp = s.createGroup();
				array.forEach(g.coordinates, function(item){
					var shp = this.createShape(s, item);
					grp.add(shp);
				}, this);
				shape = grp;
			}else{
				throw new Error();
			}
			return shape;
		},

		getShape: function(){
			// summary:
			//		Returns the shape rendering the geometry
			// returns:
			//		The shape used to render the geometry.
			var g = this._geometry;
			if(!g){
				return null;
			}
			if(g.shape){
				return g.shape;
			}
			this.render();
			return g.shape; // dojox.gfx.shape.Shape
		},

		_createPoint: function(/* dojox/geo/openlayer/Geometry */g){
			// summary:
			//		Create a point shape
			// tags:
			//		private
			var layer = this.getLayer();
			var s = layer.getSurface();
			var c = this.createShape(s, g);
			var vp = layer.getViewport();
			vp.add(c);
			return c;
		},

		_getPointShape: function(/* dojox/geo/openlayers/Geometry */g){
			// summary:
			//		get the point geometry shape, create it if necessary
			// tags:
			//		private
			var s = g.shape;
			if(s == null){
				s = this._createPoint(g);
				g.shape = s;
			}
			return s;
		},

		renderPoint: function(g){
			// summary:
			//		Renders a point geometry.
			// g: dojox/geo/openlayers/Point?
			//		The geometry to render, or the current instance geometry if not specified.
			if(g == undefined){
				g = this._geometry;
			}
			var layer = this.getLayer();
			var map = layer.getDojoMap();

			s = this._getPointShape(g);
			var prop = lang.mixin({}, this._defaults.pointShape);
			prop = lang.mixin(prop, this.getShapeProperties());
			s.setShape(prop);

			var from = this.getCoordinateSystem();
			var p = map.transform(g.coordinates, from);

			var a = this._getLocalXY(p);
			var cx = a[0];
			var cy = a[1];
			var tr = layer.getViewport().getTransform();
			if(tr){
				s.setTransform(matrix.translate(cx - tr.dx, cy - tr.dy));
			}
			this._applyStyle(g);
		},

		_createLineString: function(/* dojox/geo/openlayers/Geometry */g){
			// summary:
			//		Create polyline shape and add it to the viewport.
			// tags:
			//		private
			var layer = this.getLayer();
			var s = layer._surface;
			var shape = this.createShape(s, g);
			var vp = layer.getViewport();
			vp.add(shape);
			g.shape = shape;
			return shape;
		},

		_getLineStringShape: function(/* dojox/geo/openlayers/Geometry */g){
			// summary:
			//		Get the line string geometry shape, create it if necessary
			// tags:
			//		private
			var s = g.shape;
			if(s == null){
				s = this._createLineString(g);
				g.shape = s;
			}
			return s;
		},

		renderLineString: function(g){
			// summary:
			//		Renders a line string geometry.
			// g: dojox/geo/openlayers/Geometry?
			//		The geometry to render.
			if(g == undefined){
				g = this._geometry;
			}
			var layer = this.getLayer();
			var map = layer.getDojoMap();
			var lss = this._getLineStringShape(g);
			var from = this.getCoordinateSystem();
			var points = new Array(g.coordinates.length); // ss.getShape().points;		
			var tr = layer.getViewport().getTransform();
			array.forEach(g.coordinates, function(c, i, array){
				var p = map.transform(c, from);
				var a = this._getLocalXY(p);
				if(tr){
					a[0] -= tr.dx;
					a[1] -= tr.dy;
				}
				points[i] = {
					x: a[0],
					y: a[1]
				};
			}, this);
			var prop = lang.mixin({}, this._defaults.lineStringShape);
			prop = lang.mixin(prop, this.getShapeProperties());
			prop = lang.mixin(prop, {
				points: points
			});
			lss.setShape(prop);
			this._applyStyle(g);
		},

		_applyStyle: function(g){
			// summary:
			//		Apply the style on the geometry's shape.
			// g: Geometry
			//		The geometry.
			// tags:
			//		private
			if(!g || !g.shape){
				return;
			}

			var f = this.getFill();

			var fill;
			if(!f || lang.isString(f) || lang.isArray(f)){
				fill = f;
			}else{
				fill = lang.mixin({}, this._defaults.fill);
				fill = lang.mixin(fill, f);
			}

			var s = this.getStroke();
			var stroke;
			if(!s || lang.isString(s) || lang.isArray(s)){
				stroke = s;
			}else{
				stroke = lang.mixin({}, this._defaults.stroke);
				stroke = lang.mixin(stroke, s);
			}

			this._applyRecusiveStyle(g, stroke, fill);
		},

		_applyRecusiveStyle: function(g, stroke, fill){
			// summary:
			//		Apply the style on the geometry's shape recursively.
			// g: dojox.geo.openlayers.Geometry
			//		The geometry.
			// stroke: Object
			//		The stroke
			// fill:Object
			//		The fill
			// tags:
			//		private
			var shp = g.shape;

			if(shp.setFill){
				shp.setFill(fill);
			}

			if(shp.setStroke){
				shp.setStroke(stroke);
			}

			if(g instanceof Collection){
				array.forEach(g.coordinates, function(i){
					this._applyRecusiveStyle(i, stroke, fill);
				}, this);
			}
		},

		setStroke: function(s){
			// summary:
			//		Set the stroke style to be applied on the rendered shape.
			// s: Object
			//		The stroke style
			this._stroke = s;
			return this;
		},

		getStroke: function(){
			// summary:
			//		Returns the stroke style
			// returns:
			//		The stroke style
			return this._stroke;
		},

		setFill: function(f){
			// summary:
			//		Set the fill style to be applied on the rendered shape.
			// f: Object
			//		The fill style
			this._fill = f;
			return this;
		},

		getFill: function(){
			// summary:
			//		Returns the fill style
			// returns:
			//		The fill style
			return this._fill;
		},

		remove: function(){
			// summary:
			//		Removes the shape from the Surface. 
			//		Called when the feature is removed from the layer.
			var g = this._geometry;
			var shp = g.shape;
			g.shape = null;
			if(shp){
				shp.removeShape();
			}
			if(g instanceof Collection){
				array.forEach(g.coordinates, function(i){
					this.remove(i);
				}, this);
			}
		},

		_defaults: {
			fill: null,
			stroke: null,
			pointShape: {
				r: 30
			},
			lineStringShape: null
		}

	});
});
