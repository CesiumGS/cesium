define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojo/_base/declare",
	"dojo/_base/html",
	"dojo/dom-geometry",
	"dijit/_Widget",
	"../Map"
], function(dojo, lang, declare, html,domGeom, Widget, Map){

	return declare("dojox.geo.charting.widget.Map", Widget, {
		// summary:
		//		A map viewer widget based on the dojox.geo.charting.Map component
		// description:
		//		The `dojox.geo.charting.widget.Map` widget combines map display together with charting capabilities.
		//		It encapsulates  an `dojox.geo.charting.Map` object on which most operations are delegated.
		//		Parameters can be passed as argument at construction time to specify map data file (json shape format)
		//		as well as charting data.
		//
		//		The parameters are:
		//
		//		- `shapeData`: The json object containing map data or the name of the file containing map data.
		//		- `dataStore`: the dataStore to fetch the charting data from
		//		- `dataBindingAttribute`: property name of the dataStore items to use as value for charting
		//		- `markerData`: tooltips to display for map features, handled as json style.
		//		- `adjustMapCenterOnResize`: if true, the center of the map remains the same when resizing the widget
		//		- `adjustMapScaleOnResize`: if true, the map scale is adjusted to leave the visible portion of the map identical as much as possible
		//
		// example:
		// |	var map = new dojox.geo.charting.widget.Map({
		// |		shapeData: 'map.json',
		// |		adjustMapCenterOnresize: true,
		// |		adjustMapScaleOnresize: true,
		// |	});

		shapeData: "",
		dataStore: null,
		dataBindingAttribute: "",
		dataBindingValueFunction: null,
		markerData: "",
		series: "",
		adjustMapCenterOnResize: null,
		adjustMapScaleOnResize: null,
		animateOnResize: null,
		onFeatureClick: null,
		onFeatureOver: null,
		enableMouseSupport: null,
		enableTouchSupport: null,
		enableMouseZoom: null,
		enableMousePan: null,
		enableKeyboardSupport: false,
		showTooltips: false,
		enableFeatureZoom: null,
		colorAnimationDuration: 0,
		mouseClickThreshold: 2,
		_mouseInteractionSupport:null,
		_touchInteractionSupport:null,
		_keyboardInteractionSupport:null,
		constructor: function(/* Object */options, /* HtmlNode */div){
			// summary:
			//		Constructs a new Map widget
			this.map = null;
		},

		startup: function(){
			this.inherited(arguments);
			if(this.map){
				this.map.fitToMapContents();
			}

		},

		postMixInProperties: function(){
			this.inherited(arguments);
		},

		create: function(/*Object?*/params, /*DomNode|String?*/srcNodeRef){
			this.inherited(arguments);
		},

		getInnerMap: function(){
			return this.map;
		},


		buildRendering: function(){
			this.inherited(arguments);
			if(this.shapeData){
				this.map = new Map(this.domNode, this.shapeData);
				if(this.markerData && (this.markerData.length > 0)){
					this.map.setMarkerData(this.markerData);
				}

				if(this.dataStore){
					if(this.dataBindingValueFunction){
						this.map.setDataBindingValueFunction(this.dataBindingValueFunction);
					}
					this.map.setDataStore(this.dataStore,this.dataBindingAttribute);
				}

				if(this.series && (this.series.length > 0)){
					this.map.addSeries(this.series);
				}

				if(this.onFeatureClick){
					this.map.onFeatureClick = this.onFeatureClick;
				}
				if(this.onFeatureOver){
					this.map.onFeatureOver = this.onFeatureOver;
				}
				if(this.enableMouseSupport){
					if(!dojox.geo.charting.MouseInteractionSupport){
						throw Error("Can't find dojox.geo.charting.MouseInteractionSupport. Didn't you forget to dojo" + ".require() it?");
					}
					var options = {};
					options.enablePan = this.enableMousePan;
					options.enableZoom = this.enableMouseZoom;
					options.mouseClickThreshold = this.mouseClickThreshold;
					this._mouseInteractionSupport = new dojox.geo.charting.MouseInteractionSupport(this.map,options);
					this._mouseInteractionSupport.connect();
				}

				if(this.enableTouchSupport){
					if(!dojox.geo.charting.TouchInteractionSupport){
						throw Error("Can't find dojox.geo.charting.TouchInteractionSupport. Didn't you forget to dojo" + ".require() it?");
					}
					this._touchInteractionSupport = new dojox.geo.charting.TouchInteractionSupport(this.map,{});
					this._touchInteractionSupport.connect();
				}
				if(this.enableKeyboardSupport){
					if(!dojox.geo.charting.KeyboardInteractionSupport){
						throw Error("Can't find dojox.geo.charting.KeyboardInteractionSupport. Didn't you forget to dojo" + ".require() it?");
					}
					this._keyboardInteractionSupport = new dojox.geo.charting.KeyboardInteractionSupport(this.map,{});
					this._keyboardInteractionSupport.connect();
				}
				this.map.showTooltips = this.showTooltips;
				this.map.enableFeatureZoom = this.enableFeatureZoom;
				this.map.colorAnimationDuration = this.colorAnimationDuration;
			}
		},

		resize : function(/*Object|Number?*/ b, /*Number?*/ height){
			// summary:
			//		Resize the widget.
			// description:
			//		Resize the domNode and the widget to the dimensions of a box of the following form:
			//		`{ l: 50, t: 200, w: 300: h: 150 }`
			// b: Object|Number?
			//		An hash with optional "l", "t", "w", and "h" properties for "left", "right", "width", and "height"
			//		respectively; or a number representing the new width.
			// height: Number?
			//		A number representing the new height.

			var box;
			switch(arguments.length){
				case 0:
					// case 0, do not resize the div, just the surface
					break;
				case 1:
					// argument, override node box
					box = lang.mixin({}, b);
					domGeom.setMarginBox(this.domNode, box);
					break;
				case 2:
					// two argument, width, height
					box = {
						w: arguments[0],
						h: arguments[1]
					};
					domGeom.setMarginBox(this.domNode, box);
					break;
			}

			if(this.map){
				this.map.resize(this.adjustMapCenterOnResize,this.adjustMapScaleOnResize,this.animateOnResize);
			}
		}
	});
});
