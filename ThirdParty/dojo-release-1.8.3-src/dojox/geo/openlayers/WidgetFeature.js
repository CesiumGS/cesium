define([
	"dojo/_base/declare",
	"dojo/dom-style",
	"dojo/_base/lang",
	"dijit/registry",
	"./Feature"
], function(declare, style, lang, registry, Feature){
	/*=====
	dojox.geo.openlayers.__WidgetFeatureArgs = {
		// summary:
		//		The keyword arguments that can be passed in a WidgetFeature constructor.
		//		You must define a least one widget retrieval parameter and the geo-localization parameters.
		// createWidget: Function?
		//		Function for widget creation. Must return a `dijit._Widget.
		// dojoType: String?
		//		The class of a widget to create.
		// dijitId: String?
		//		The digitId of an existing widget.
		// widget: dijit._Widget?
		//		An already created widget.
		// width: Number?
		//		The width of the widget.
		// height: Number?
		//		The height of the widget.
		// longitude: Number
		//		The longitude, in decimal degrees where to place the widget.
		// latitude: Number
		//		The latitude, in decimal degrees where to place the widget.
	};
	=====*/

		return declare("dojox.geo.openlayers.WidgetFeature", Feature, {
			// summary:
			//		Wraps a Dojo widget, provide geolocalisation of the widget and interface
			//		to Layer class.
			// description:
			//		This class allows to add a widget in a `dojox.geo.openlayers.Layer`.

			_widget: null,
			_bbox: null,

			constructor: function(params){
				// summary:
				//		Constructs a new `dojox.geo.openlayers.WidgetFeature`
				// params: dojox.geo.openlayers.__WidgetFeatureArgs
				//		The parameters describing the widget.
				this._params = params;
			},

			setParameters: function(params){
				// summary:
				//		Sets the parameters describing the widget.
				// params: dojox.geo.openlayers.__WidgetFeatureArgs
				//		The parameters describing the widget.
				this._params = params;
			},

			getParameters: function(){
				// summary:
				//		Returns the parameters describing the widget.
				// returns: dojox.geo.openlayers.__WidgetFeatureArgs
				//		The parameters describing the widget.
				return this._params;
			},

			_getWidget: function(){
				// summary:
				//		Creates, if necessary the widget and returns it
				// tags:
				//		private
				var params = this._params;

				if((this._widget == null) && (params != null)){
					var w = null;

					if(typeof (params.createWidget) == "function"){
						w = params.createWidget.call(this);
					}else if(params.dojoType){
						dojo["require"](params.dojoType);
						var c = lang.getObject(params.dojoType);
						w = new c(params);
					}else if(params.dijitId){
						w = registry.byId(params.dijitId);
					}else if(params.widget){
						w = params.widget;
					}

					if(w != null){
						this._widget = w;
						if(typeof (w.startup) == "function"){
							w.startup();
						}
						var n = w.domNode;
						if(n != null){
							style.set(n, {
								position: "absolute"
							});
						}
					}
					this._widget = w;
				}
				return this._widget;
			},

			_getWidgetWidth: function(){
				// summary:
				//		gets the widget width
				// tags:
				//		private
				var p = this._params;
				if(p.width){
					return p.width;
				}
				var w = this._getWidget();
				if(w){
					return style.get(w.domNode, "width");
				}
				return 10;
			},

			_getWidgetHeight: function(){
				// summary:
				//		gets the widget height
				// tags:
				//		private
				var p = this._params;
				if(p.height){
					return p.height;
				}
				var w = this._getWidget();
				if(w){
					return style.get(w.domNode, "height");
				}
				return 10;
			},

			render: function(){
				// summary:
				//		renders the widget.
				// description:
				//		Places the widget accordingly to longitude and latitude defined in parameters.
				//		This function is called when the center of the maps or zoom factor changes.
				var layer = this.getLayer();

				var widget = this._getWidget();
				if(widget == null){
					return;
				}
				var params = this._params;
				var lon = params.longitude;
				var lat = params.latitude;
				var from = this.getCoordinateSystem();
				var map = layer.getDojoMap();
				var p = map.transformXY(lon, lat, from);
				var a = this._getLocalXY(p);

				var width = this._getWidgetWidth();
				var height = this._getWidgetHeight();

				var x = a[0] - width / 2;
				var y = a[1] - height / 2;
				var dom = widget.domNode;

				var pa = layer.olLayer.div;
				if(dom.parentNode != pa){
					if(dom.parentNode){
						dom.parentNode.removeChild(dom);
					}
					pa.appendChild(dom);
				}
				this._updateWidgetPosition({
					x: x,
					y: y,
					width: width,
					height: height
				});
			},

			_updateWidgetPosition: function(box){
				// summary:
				//		Places the widget with the computed x and y values
				// tags:
				//		private
				
				// var box = this._params;

				var w = this._widget;
				var dom = w.domNode;

				style.set(dom, {
					position: "absolute",
					left: box.x + "px",
					top: box.y + "px",
					width: box.width + "px",
					height: box.height + "px"
				});

				if(w.srcNodeRef){
					style.set(w.srcNodeRef, {
						position: "absolute",
						left: box.x + "px",
						top: box.y + "px",
						width: box.width + "px",
						height: box.height + "px"
					});
				}

				if(lang.isFunction(w.resize)){
					w.resize({
						w: box.width,
						h: box.height
					});
				}
			},

			remove: function(){
				// summary:
				//		removes this feature.
				// description:
				//		Remove this feature by disconnecting the widget from the dom.
				var w = this.getWidget();
				if(!w){
					return;
				}
				var dom = w.domNode;
				if(dom.parentNode){
					dom.parentNode.removeChild(dom);
				}
			}
		});
	});
