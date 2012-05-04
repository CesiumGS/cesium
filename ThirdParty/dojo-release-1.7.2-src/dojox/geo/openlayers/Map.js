define(["dojo/_base/kernel",
				"dojo/_base/declare",
				"dojo/_base/lang",
				"dojo/_base/array",
				"dojo/_base/json",
				"dojo/_base/html",
				"dojox/main",
				"dojox/geo/openlayers/TouchInteractionSupport",
				"dojox/geo/openlayers/Layer",
				"dojox/geo/openlayers/Patch"], function(dojo, declare, lang, array, json, html, dojox, TouchInteractionSupport,
																								Layer, Patch){

	dojo.experimental("dojox.geo.openlayers.Map");

	lang.getObject("geo.openlayers", true, dojox);

	dojox.geo.openlayers.BaseLayerType = {
		//	summary:
		//		Defines the base layer types to be used at Map construction time or
		//		with the setBaseLayerType function.
		//	description:
		//		This object defines the base layer types to be used at Map construction
		//		time or with the setBaseLayerType function.
		//	OSM: String
		//		The Open Street Map base layer type selector.
		OSM : "OSM",
		//	WMS: String
		//		The Web Map Server base layer type selector.
		WMS : "WMS",
		//	GOOGLE: String
		//		The Google base layer type selector.
		GOOGLE : "Google",
		//	VIRTUAL_EARTH: String
		//		The Virtual Earth base layer type selector.
		VIRTUAL_EARTH : "VirtualEarth",
		//	BING: String
		//		Same as Virtual Earth
		BING : "VirtualEarth",
		//	YAHOO: String
		//		The Yahoo base layer type selector.
		YAHOO : "Yahoo",
		//	ARCGIS: String
		//		The ESRI ARCGis base layer selector.
		ARCGIS : "ArcGIS"
	};

	dojox.geo.openlayers.EPSG4326 = new OpenLayers.Projection("EPSG:4326");

	var re = /^\s*(\d{1,3})[D°]\s*(\d{1,2})[M']\s*(\d{1,2}\.?\d*)\s*(S|"|'')\s*([NSEWnsew]{0,1})\s*$/i;
	dojox.geo.openlayers.parseDMS = function(v, toDecimal){
		//	summary: 
		//		Parses the specified string and returns degree minute second or decimal degree.
		//	description: 
		//		Parses the specified string and returns degree minute second or decimal degree.
		//	v: String
		//		The string to parse
		//	toDecimal: Boolean
		//		Specifies if the result should be returned in decimal degrees or in an array
		//		containg the degrees, minutes, seconds values.
		//	returns: Float | Array
		//		the parsed value in decimal degrees or an array containing the degrees, minutes, seconds values.

		var res = re.exec(v);
		if (res == null || res.length < 5)
			return parseFloat(v);
		var d = parseFloat(res[1]);
		var m = parseFloat(res[2]);
		var s = parseFloat(res[3]);
		var nsew = res[5];
		if (toDecimal) {
			var lc = nsew.toLowerCase();
			var dd = d + (m + s / 60.0) / 60.0;
			if (lc == "w" || lc == "s")
				dd = -dd;
			return dd;
		}
		return [d, m, s, nsew];
	};

	Patch.patchGFX();

	return declare("dojox.geo.openlayers.Map", null, {
		//	summary:
		//		A map viewer based on the OpenLayers library.
		//
		//	description:
		//		The `dojox.geo.openlayers.Map` object allows to view maps from various map providers. 
		//		It encapsulates  an `OpenLayers.Map` object on which most operations are delegated.
		//		GFX layers can be added to display GFX georeferenced shapes as well as Dojo widgets.
		//		Parameters can be passed as argument at construction time to define the base layer
		//		type and the base layer parameters such as url or options depending on the type
		//		specified. These parameters can be any of :
		//	<br />
		//	_baseLayerType_: type of the base layer. Can be any of
		//	
		//	* `dojox.geo.openlayers.BaseLayerType.OSM`: Open Street Map base layer
		//	* `dojox.geo.openlayers.BaseLayerType.WMS`: Web Map Service layer
		//	* `dojox.geo.openlayers.BaseLayerType.GOOGLE`: Google layer
		//	* `dojox.geo.openlayers.BaseLayerType.VIRTUAL_EARTH`: Virtual Earth layer
		//	* `dojox.geo.openlayers.BaseLayerType.BING`: Bing layer
		//	* `dojox.geo.openlayers.BaseLayerType.YAHOO`: Yahoo layer
		//	* `dojox.geo.openlayers.BaseLayerType.ARCGIS`: ESRI ArgGIS layer
		//
		//	Note that access to commercial server such as Google, Virtual Earth or Yahoo may need specific licencing.
		// 
		//	The parameters value also include :
		// 
		//	* `baseLayerName`: The name of the base layer.
		//	* `baseLayerUrl`: Some layer may need an url such as Web Map Server
		//	* `baseLayerOptions`: Addtional specific options passed to OpensLayers layer,  
		//	such as The list of layer to display, for Web Map Server layer.
		//
		//	example:
		// 
		//	|	var map = new dojox.geo.openlayers.widget.Map(div, {
		//	|		baseLayerType : dojox.geo.openlayers.BaseLayerType.OSM,
		//	|		baseLayerName : 'Open Street Map Layer'
		//	|	});

		//	summary:
		//		The underlying OpenLayers.Map object.
		//		Should be accessed on read mode only.
		olMap : null,

		_tp : null,

		constructor : function(div, options){
			//	summary: 
			//		Constructs a new Map object
			if (!options)
				options = {};

			div = html.byId(div);

			this._tp = {
				x : 0,
				y : 0
			};

			var opts = options.openLayersMapOptions;

			if (!opts) {
				opts = {
					controls : [new OpenLayers.Control.ScaleLine({
						maxWidth : 200
					}), new OpenLayers.Control.Navigation()]
				};
			}
			if (options.accessible) {
				var kbd = new OpenLayers.Control.KeyboardDefaults();
				if (!opts.controls)
					opts.controls = [];
				opts.controls.push(kbd);
			}
			var baseLayerType = options.baseLayerType;
			if (!baseLayerType)
				baseLayerType = dojox.geo.openlayers.BaseLayerType.OSM;

			html.style(div, {
				width : "100%",
				height : "100%",
				dir : "ltr"
			});

			var map = new OpenLayers.Map(div, opts);
			this.olMap = map;

			this._layerDictionary = {
				olLayers : [],
				layers : []
			};

			if (options.touchHandler)
				this._touchControl = new TouchInteractionSupport(map);

			var base = this._createBaseLayer(options);
			this.addLayer(base);

			this.initialFit(options);
		},

		initialFit : function(params){
			var o = params.initialLocation;
			if (!o)
				o = [-160, 70, 160, -70];
			this.fitTo(o);
		},

		setBaseLayerType : function(
		/* dojox.geo.openlayers.Map.BaseLayerType */type){
			//	summary: 
			//		Set the base layer type, replacing the existing base layer
			//	type: dojox.geo.openlayers.BaseLayerType
			//		base layer type
			//	returns: OpenLayers.Layer
			//		The newly created layer.
			if (type == this.baseLayerType)
				return null;

			var o = null;
			if (typeof type == "string") {
				o = {
					baseLayerName : type,
					baseLayerType : type
				};
				this.baseLayerType = type;
			} else if (typeof type == "object") {
				o = type;
				this.baseLayerType = o.baseLayerType;
			}
			var bl = null;
			if (o != null) {
				bl = this._createBaseLayer(o);
				if (bl != null) {
					var olm = this.olMap;
					var ob = olm.getZoom();
					var oc = olm.getCenter();
					var recenter = !!oc && !!olm.baseLayer && !!olm.baseLayer.map;

					if (recenter) {
						var proj = olm.getProjectionObject();
						if (proj != null)
							oc = oc.transform(proj, dojox.geo.openlayers.EPSG4326);
					}
					var old = olm.baseLayer;
					if (old != null) {
						var l = this._getLayer(old);
						this.removeLayer(l);
					}
					if (bl != null)
						this.addLayer(bl);
					if (recenter) {
						proj = olm.getProjectionObject();
						if (proj != null)
							oc = oc.transform(dojox.geo.openlayers.EPSG4326, proj);
						olm.setCenter(oc, ob);
					}
				}
			}
			return bl;
		},

		getBaseLayerType : function(){
			//	summary:
			//		Retrieves the base layer type.
			//	returns: dojox.geo.openlayers.BaseLayerType
			//		The current base layer type.
			return this.baseLayerType;
		},

		getScale : function(geodesic){
			//	summary: 
			//		Returns the current scale
			//	geodesic: Boolean
			//		Tell if geodesic calculation should be performed. If set to
			//		true, the scale will be calculated based on the horizontal size of the
			//		pixel in the center of the map viewport.
			//	returns: Number
			//		The current scale.
			var scale;
			var om = this.olMap;
			if (geodesic) {
				var units = om.getUnits();
				if (!units) {
					return null;
				}
				var inches = OpenLayers.INCHES_PER_UNIT;
				scale = (om.getGeodesicPixelSize().w || 0.000001) * inches["km"] * OpenLayers.DOTS_PER_INCH;
			} else {
				scale = om.getScale();
			}
			return scale;
		},

		getOLMap : function(){
			//	summary:
			//		gets the underlying OpenLayers map object.
			//	returns : OpenLayers.Map
			//		The underlying OpenLayers map object.
			return this.olMap;
		},

		_createBaseLayer : function(params){
			//	summary:
			//		Creates the base layer.
			//	tags:
			//		private
			var base = null;
			var type = params.baseLayerType;
			var url = params.baseLayerUrl;
			var name = params.baseLayerName;
			var options = params.baseLayerOptions;

			if (!name)
				name = type;
			if (!options)
				options = {};
			switch (type) {
				case dojox.geo.openlayers.BaseLayerType.OSM:
					options.transitionEffect = "resize";
					//				base = new OpenLayers.Layer.OSM(name, url, options);
					base = new Layer(name, {
						olLayer : new OpenLayers.Layer.OSM(name, url, options)
					});
				break;
				case dojox.geo.openlayers.BaseLayerType.WMS:
					if (!url) {
						url = "http://labs.metacarta.com/wms/vmap0";
						if (!options.layers)
							options.layers = "basic";
					}
					base = new Layer(name, {
						olLayer : new OpenLayers.Layer.WMS(name, url, options, {
							transitionEffect : "resize"
						})
					});
				break;
				case dojox.geo.openlayers.BaseLayerType.GOOGLE:
					base = new Layer(name, {
						olLayer : new OpenLayers.Layer.Google(name, options)
					});
				break;
				case dojox.geo.openlayers.BaseLayerType.VIRTUAL_EARTH:
					base = new Layer(name, {
						olLayer : new OpenLayers.Layer.VirtualEarth(name, options)
					});
				break;
				case dojox.geo.openlayers.BaseLayerType.YAHOO:
					//				base = new OpenLayers.Layer.Yahoo(name);
					base = new Layer(name, {
						olLayer : new OpenLayers.Layer.Yahoo(name, options)
					});
				break;
				case dojox.geo.openlayers.BaseLayerType.ARCGIS:
					if (!url)
						url = "http://server.arcgisonline.com/ArcGIS/rest/services/ESRI_StreetMap_World_2D/MapServer/export";
					base = new Layer(name, {
						olLayer : new OpenLayers.Layer.ArcGIS93Rest(name, url, options, {})
					});

				break;
			}

			if (base == null) {
				if (type instanceof OpenLayers.Layer)
					base = type;
				else {
					options.transitionEffect = "resize";
					base = new Layer(name, {
						olLayer : new OpenLayers.Layer.OSM(name, url, options)
					});
					this.baseLayerType = dojox.geo.openlayers.BaseLayerType.OSM;
				}
			}

			return base;
		},

		removeLayer : function(/* dojox.geo.openlayers.Layer */layer){
			//	summary: 
			//		Remove the specified layer from the map.
			//	layer: dojox.geo.openlayers.Layer
			//		The layer to remove from the map.
			var om = this.olMap;
			var i = array.indexOf(this._layerDictionary.layers, layer);
			if (i > 0)
				this._layerDictionary.layers.splice(i, 1);
			var oll = layer.olLayer;
			var j = array.indexOf(this._layerDictionary.olLayers, oll);
			if (j > 0)
				this._layerDictionary.olLayers.splice(i, j);
			om.removeLayer(oll, false);
		},

		layerIndex : function(/* dojox.geo.openlayers.Layer */layer, index){
			//	summary:
			//		Set or retrieve the layer index.
			//	description:
			//		Set or get the layer index, that is the z-order of the layer.
			//		if the index parameter is provided, the layer index is set to
			//		this value. If the index parameter is not provided, the index of 
			//		the layer is returned.
			//	index: undefined | int
			//		index of the layer
			// 	returns: int
			//		the index of the layer.
			var olm = this.olMap;
			if (!index)
				return olm.getLayerIndex(layer.olLayer);
			//olm.raiseLayer(layer.olLayer, index);
			olm.setLayerIndex(layer.olLayer, index);

			this._layerDictionary.layers.sort(function(l1, l2){
				return olm.getLayerIndex(l1.olLayer) - olm.getLayerIndex(l2.olLayer);
			});
			this._layerDictionary.olLayers.sort(function(l1, l2){
				return olm.getLayerIndex(l1) - olm.getLayerIndex(l2);
			});

			return index;
		},

		addLayer : function(/* dojox.geo.openlayers.Layer */layer){
			//	summary: 
			//		Add the specified layer to the map.
			//	layer: dojox.geo.openlayer.Layer
			//		The layer to add to the map.
			layer.dojoMap = this;
			var om = this.olMap;
			var ol = layer.olLayer;
			this._layerDictionary.olLayers.push(ol);
			this._layerDictionary.layers.push(layer);
			om.addLayer(ol);
			layer.added();
		},

		_getLayer : function(/*OpenLayer.Layer */ol){
			//	summary:
			//		Retrieve the dojox.geo.openlayer.Layer from the OpenLayer.Layer
			//	tags:
			//		private
			var i = array.indexOf(this._layerDictionary.olLayers, ol);
			if (i != -1)
				return this._layerDictionary.layers[i];
			return null;
		},

		getLayer : function(property, value){
			//	summary: 
			//		Returns the layer whose property matches the value.
			//	property: String
			//		The property to check
			//	value: Object
			//		The value to match
			//	returns: dojox.geo.openlayer.Layer | Array
			//		The layer(s) matching the property's value. Since multiple layers
			//		match the property's value the return value is an array. 
			//	example: 
			//		var layers = map.getLayer("name", "Layer Name");
			var om = this.olMap;
			var ols = om.getBy("layers", property, value);
			var ret = new Array(); //[];
			array.forEach(ols, function(ol){
				ret.push(this._getLayer(ol));
			}, this);
			return ret;
		},

		getLayerCount : function(){
			//	summary: 
			//		Returns the count of layers of this map.
			//	returns: int 
			//		The number of layers of this map. 
			var om = this.olMap;
			if (om.layers == null)
				return 0;
			return om.layers.length;
		},

		fitTo : function(o){
			//	summary: 
			//		Fits the map on a point,or an area
			//	description: 
			//		Fits the map on the point or extent specified as parameter. 
			//	o: Object
			//		Object with key values fit parameters or a JSON string.
			//	example:
			//		Examples of arguments passed to the fitTo function :
			//	|	null
			//		The map is fit on full extent
			//
			//	|	{
			//	|	bounds : [ulx, uly, lrx, lry]
			//	|	}
			//		The map is fit on the specified bounds expressed as decimal degrees latitude and longitude.
			//		The bounds are defined with their upper left and lower right corners coordinates.
			// 
			//	|	{
			//	|	position : [longitude, latitude],
			//	|	extent : degrees
			//	|	}
			//		The map is fit on the specified position showing the extent <extent> around
			//		the specified center position.

			var map = this.olMap;
			var from = dojox.geo.openlayers.EPSG4326;

			if (o == null) {
				var c = this.transformXY(0, 0, from);
				map.setCenter(new OpenLayers.LonLat(c.x, c.y));
				return;
			}
			var b = null;
			if (typeof o == "string")
				var j = json.fromJson(o);
			else
				j = o;
			var ul;
			var lr;
			if (j.hasOwnProperty("bounds")) {
				var a = j.bounds;
				b = new OpenLayers.Bounds();
				ul = this.transformXY(a[0], a[1], from);
				b.left = ul.x;
				b.top = ul.y;
				lr = this.transformXY(a[2], a[3], from);
				b.right = lr.x;
				b.bottom = lr.y;
			}
			if (b == null) {
				if (j.hasOwnProperty("position")) {
					var p = j.position;
					var e = j.hasOwnProperty("extent") ? j.extent : 1;
					if (typeof e == "string")
						e = parseFloat(e);
					b = new OpenLayers.Bounds();
					ul = this.transformXY(p[0] - e, p[1] + e, from);
					b.left = ul.x;
					b.top = ul.y;
					lr = this.transformXY(p[0] + e, p[1] - e, from);
					b.right = lr.x;
					b.bottom = lr.y;
				}
			}
			if (b == null) {
				if (o.length == 4) {
					b = new OpenLayers.Bounds();
					// TODO Choose the correct method
					if (false) {
						b.left = o[0];
						b.top = o[1];

						b.right = o[2];
						b.bottom = o[3];
					} else {
						ul = this.transformXY(o[0], o[1], from);
						b.left = ul.x;
						b.top = ul.y;
						lr = this.transformXY(o[2], o[3], from);
						b.right = lr.x;
						b.bottom = lr.y;
					}
				}
			}
			if (b != null) {
				map.zoomToExtent(b, true);
			}
		},

		transform : function(p, from, to){
			//	summary:
			//		Transforms the point passed as argument, expressed in the <em>from</em> 
			//		coordinate system to the map coordinate system.
			//	description:
			//		Transforms the point passed as argument without modifying it. The point is supposed to be expressed
			//		in the <em>from</em> coordinate system and is transformed to the map coordinate system.
			//	p : Object {x, y}
			//		The point to transform
			//	from: OpenLayers.Projection
			//		The projection in which the point is expressed.
			return this.transformXY(p.x, p.y, from, to);
		},

		transformXY : function(x, y, from, to){
			//	summary
			//		Transforms the coordinates passed as argument, expressed in the <em>from</em> 
			//		coordinate system to the map coordinate system.
			//	description:
			//		Transforms the coordinates passed as argument. The coordinate are supposed to be expressed
			//		in the <em>from</em> coordinate system and are transformed to the map coordinate system.
			//	x : Number 
			//		The longitude coordinate to transform.
			//	y : Number
			//		The latitude coordinate to transform.
			//	from: OpenLayers.Projection
			//		The projection in which the point is expressed.

			var tp = this._tp;
			tp.x = x;
			tp.y = y;
			if (!from)
				from = dojox.geo.openlayers.EPSG4326;
			if (!to)
				to = this.olMap.getProjectionObject();
			tp = OpenLayers.Projection.transform(tp, from, to);
			return tp;
		}

	});

});
