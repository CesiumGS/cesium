define([
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/_base/html",
	"dojo/dom",
	"dojo/dom-geometry",
	"dojo/dom-class", 
	"dojo/_base/xhr",
	"dojo/_base/connect",
	"dojo/_base/window", 
	"dojox/gfx",
	"./_base",
	"./Feature",
	"./_Marker",
	"dojo/number",
	"dojo/_base/sniff"
], function(lang, arr, declare, html, dom, domGeom, domClass, xhr, connect, win, gfx, base, Feature, Marker, number, has){

	return declare("dojox.geo.charting.Map", null, {
		// summary:
		//		Map widget interacted with charting.
		// description:
		//		Support rendering Americas, AsiaPacific, ContinentalEurope, EuropeMiddleEastAfrica,
		//		USStates, WorldCountries, and WorldCountriesMercator by default.
		// example:
		//	|	var usaMap = new dojox.geo.charting.Map(srcNode, "dojotoolkit/dojox/geo/charting/resources/data/USStates.json");
		//	|	<div id="map" style="width:600px;height:400px;"></div>
	
		// defaultColor: String
		//		Default map feature color, e.g: "#B7B7B7"
		defaultColor:"#B7B7B7",
		// highlightColor: String
		//		Map feature color when mouse over it, e.g: "#"
		highlightColor:"#D5D5D5",
		// series: Array
		//		stack to data range, e.g: [{name:'label 1', min:20, max:70, color:'#DDDDDD'},{...},...]
		series:[],
		
		dataBindingAttribute:null,
		dataBindingValueFunction:null,
		dataStore:null,
		showTooltips: true,
		enableFeatureZoom: true,
		colorAnimationDuration:0,
		_idAttributes:null,
		_onSetListener:null,
		_onNewListener:null,
		_onDeleteListener:null,
		constructor: function(/*Node*/container, /*String|Object*/shapeData){
			// summary:
			//		Constructs a new Map instance.
			// container:
			//		map container html node/id.
			// shapeData:
			//		map shape data json object, or url to json file.
	
			html.style(container, "display", "block");
	
			this.container = container;
			var containerBounds = this._getContainerBounds();
			// get map container coords
			this.surface = gfx.createSurface(container, containerBounds.w, containerBounds.h);
	
			this._createZoomingCursor();
	
			// add transparent background for event capture
			this.mapBackground = this.surface.createRect({x: 0, y: 0, width: containerBounds.w, height: containerBounds.w}).setFill("rgba(0,0,0,0)");
	
			this.mapObj = this.surface.createGroup();
			this.mapObj.features = {};
	
			if(typeof shapeData == "object"){
				this._init(shapeData);
			}else{
				// load map shape file
				if(typeof shapeData == "string" && shapeData.length > 0){
					xhr.get({
						url: shapeData,
						handleAs: "json",
						sync: true,
						load: lang.hitch(this, "_init")
					});
				}
			}
		},
	
		_getContainerBounds: function(){
			// summary:
			//		returns the bounds {x:, y:, w: ,h:} of the DOM node container in absolute coordinates
			// tags:
			//		private
	
			var position = domGeom.position(this.container,true);
			var marginBox = domGeom.getMarginBox(this.container);
			// use contentBox for correct width and height - surface spans outside border otherwise
			var contentBox = domGeom.getContentBox(this.container);
			this._storedContainerBounds = {
					x: position.x,
					y: position.y,
					w: contentBox.w || 100,
					h: contentBox.h || 100
				};
			return this._storedContainerBounds;
		},
	
		resize: function(/**boolean**/ adjustMapCenter, /**boolean**/ adjustMapScale, /**boolean**/ animate){
			// summary:
			//		resize the underlying GFX surface to accommodate to parent DOM Node size change
			// adjustMapCenter: boolean
			//		keeps the center of the map when resizing the surface
			// adjustMapScale: boolean
			//		adjusts the map scale to keep the visible portion of the map as much as possible
	
			var oldBounds = this._storedContainerBounds;
			var newBounds = this._getContainerBounds();
	
			if((oldBounds.w == newBounds.w) && (oldBounds.h == newBounds.h)){
				return;
			}
	
			// set surface dimensions, and background
			this.mapBackground.setShape({width:newBounds.w, height:newBounds.h});
			this.surface.setDimensions(newBounds.w,newBounds.h);
	
			this.mapObj.marker.hide();
			this.mapObj.marker._needTooltipRefresh = true;
	
			if(adjustMapCenter){
	
				var mapScale = this.getMapScale();
				var newScale = mapScale;
	
				if(adjustMapScale){
					var bbox = this.mapObj.boundBox;
					var widthFactor = newBounds.w / oldBounds.w;
					var heightFactor = newBounds.h / oldBounds.h;
					newScale = mapScale * Math.sqrt(widthFactor * heightFactor);
				}
	
				//	current map center
				var invariantMapPoint = this.screenCoordsToMapCoords(oldBounds.w/2,oldBounds.h/2);
	
				//	apply new parameters
				this.setMapCenterAndScale(invariantMapPoint.x,invariantMapPoint.y,newScale,animate);
			}
		},
	
		_isMobileDevice: function(){
			// summary:
			//		tests whether the application is running on a mobile device (android or iOS)
			// tags:
			//		private
			return (has("safari")
					&& (navigator.userAgent.indexOf("iPhone") > -1 ||
						navigator.userAgent.indexOf("iPod") > -1 ||
						navigator.userAgent.indexOf("iPad") > -1
					)) || (navigator.userAgent.toLowerCase().indexOf("android") > -1);
		},
	
	
		setMarkerData: function(/*String*/ markerFile){
			// summary:
			//		import markers from outside file, associate with map feature by feature id
			//		which identified in map shape file, e.g: "NY":"New York"
			// markerFile:
			//		outside marker data url, handled as json style.
			//		data format: {"NY":"New York",.....}
			xhr.get({
				url: markerFile,
				handleAs: "json",
				handle: lang.hitch(this, "_appendMarker")
			});
		},
	
		setDataBindingAttribute: function(/*String*/prop){
			// summary:
			//		sets the property name of the dataStore items to use as value (see Feature.setValue function)
			// prop: String
			//		the property
			this.dataBindingAttribute = prop;
	
			// refresh data
			if(this.dataStore){
				this._queryDataStore();
			}
		},
	
		setDataBindingValueFunction: function(/* function */valueFunction){
			// summary:
			//		sets the function that extracts values from dataStore items,to use as Feature values (see Feature.setValue function)
			// valueFunction:
			//		the function
			this.dataBindingValueFunction = valueFunction;
	
			// refresh data
			if(this.dataStore){
				this._queryDataStore();
			}
		},
	
	
	
		_queryDataStore: function(){
			if(!this.dataBindingAttribute || (this.dataBindingAttribute.length == 0)){
				return;
			}
	
			var mapInstance = this;
			this.dataStore.fetch({
				scope: this,
				onComplete: function(items){
					this._idAttributes = mapInstance.dataStore.getIdentityAttributes({});
					arr.forEach(items, function(item){
						var id = mapInstance.dataStore.getValue(item, this._idAttributes[0]);
						if(mapInstance.mapObj.features[id]){
							var val = null;
							var itemVal = mapInstance.dataStore.getValue(item, mapInstance.dataBindingAttribute);
							if(itemVal){
								if(this.dataBindingValueFunction){
									val = this.dataBindingValueFunction(itemVal);
								}else{
									if(isNaN(val)){
										// regular parse
										val=number.parse(itemVal);
									}else{
										val = itemVal;
									}
								}
							}
							if(val){
								mapInstance.mapObj.features[id].setValue(val);
							}
						}
					},this);
				}
			});
		},
	
		_onSet:function(item,attribute,oldValue,newValue){
			// look for matching feature
			var id = this.dataStore.getValue(item, this._idAttributes[0]);
			var feature = this.mapObj.features[id];
			if(feature && (attribute == this.dataBindingAttribute)){
				if(newValue){
					feature.setValue(newValue);
				}else{
					feature.unsetValue();
				}
			}
		},
	
		_onNew:function(newItem,  parentItem){
			var id = this.dataStore.getValue(item, this._idAttributes[0]);
			var feature = this.mapObj.features[id];
			if(feature && (attribute == this.dataBindingAttribute)){
				feature.setValue(newValue);
			}
		},
	
		_onDelete:function(item){
			var id = item[this._idAttributes[0]];
			var feature = this.mapObj.features[id];
			if(feature){
				feature.unsetValue();
			}
		},
	
		setDataStore: function(/*dojo/data/ItemFileReadStore*/ dataStore, /*String*/ dataBindingProp){
			// summary:
			//		populate data for each map feature from fetched data store
			// dataStore: dojo/data/ItemFileReadStore
			//		the dataStore to fetch the information from
			// dataBindingProp:
			//		sets the property name of the dataStore items to use as value
			if(this.dataStore != dataStore){
				// disconnect previous listener if any
				if(this._onSetListener){
					connect.disconnect(this._onSetListener);
					connect.disconnect(this._onNewListener);
					connect.disconnect(this._onDeleteListener);
				}
	
				// set new dataStore
				this.dataStore = dataStore;
	
				// install listener on new dataStore
				if(dataStore){
					_onSetListener = connect.connect(this.dataStore,"onSet",this,this._onSet);
					_onNewListener = connect.connect(this.dataStore,"onNew",this,this._onNew);
					_onDeleteListener = connect.connect(this.dataStore,"onDelete",this,this._onDelete);
				}
			}
			if(dataBindingProp){
				this.setDataBindingAttribute(dataBindingProp);
			}
		},
	
		addSeries: function(/*url|Object[]*/ series){
			// summary:
			//		sets ranges of data values (associated with label, color) to style map data values
			// series:
			//		Either an url or an array of range objects such as : [{name:'label 1', min:20, max:70, color:'#DDDDDD'},{...},...]
	
			if(typeof series == "object"){
				this._addSeriesImpl(series);
			}else{
				// load series file
				if(typeof series == "string" && series.length > 0){
					xhr.get({
						url: series,
						handleAs: "json",
						sync: true,
						load: lang.hitch(this, function(content){
							this._addSeriesImpl(content.series);
						})
					});
				}
			}
	
		},
	
		_addSeriesImpl: function(/*Object[]*/series){
	
			this.series = series;
	
			// refresh color scheme
			for(var item in this.mapObj.features){
				var feature = this.mapObj.features[item];
				feature.setValue(feature.value);
			}
		},
	
	
		fitToMapArea: function(mapArea, pixelMargin, animate, onAnimationEnd){
			// summary:
			//		set this component's transformation so that the specified area fits in the component (centered)
			// mapArea: Object
			//		the map area that needs to fill the component expressed as {x,y,w,h}
			// pixelMargin: int
			//		a margin (in pixels) from the borders of the Map component.
			// animate: boolean
			//		true if the transform change should be animated
			// onAnimationEnd: function
			//		a callback function to be executed when the animation completes (if animate set to true).
	
			if(!pixelMargin){
				pixelMargin = 0;
			}
			var width = mapArea.w,
				height = mapArea.h,
				containerBounds = this._getContainerBounds(),
				scale = Math.min((containerBounds.w - 2 * pixelMargin) / width,
								(containerBounds.h - 2 * pixelMargin) / height);
	
			this.setMapCenterAndScale(mapArea.x + mapArea.w / 2,mapArea.y + mapArea.h / 2,scale,animate,onAnimationEnd);
		},
	
		fitToMapContents: function(pixelMargin,animate,/* callback function */onAnimationEnd){
			// summary:
			//		set this component's transformation so that the whole map data fits in the component (centered)
			// pixelMargin: int
			//		a margin (in pixels) from the borders of the Map component.
			// animate: boolean
			//		true if the transform change should be animated
			// onAnimationEnd: function
			//		a callback function to be executed when the animation completes (if animate set to true).
	
			//transform map to fit container
			var bbox = this.mapObj.boundBox;
			this.fitToMapArea(bbox,pixelMargin,animate,onAnimationEnd);
		},
	
		setMapCenter: function(centerX,centerY,animate,/* callback function */onAnimationEnd){
			// summary:
			//		set this component's transformation so that the map is centered on the specified map coordinates
			// centerX: float
			//		the X coordinate (in map coordinates) of the new center
			// centerY: float
			//		the Y coordinate (in map coordinates) of the new center
			// animate: boolean
			//		true if the transform change should be animated
			// onAnimationEnd: function
			//		a callback function to be executed when the animation completes (if animate set to true).
	
			// call setMapCenterAndScale with current map scale
			var currentScale = this.getMapScale();
			this.setMapCenterAndScale(centerX,centerY,currentScale,animate,onAnimationEnd);
	
		},
	
		_createAnimation: function(onShape,fromTransform,toTransform,/* callback function */onAnimationEnd){
			// summary:
			//		creates a transform animation object (between two transforms) used internally
			// onShape: dojox.gfx.shape.Shape
			//		The target shape.
			// fromTransform: dojox.gfx.matrix.Matrix2D
			//		the start transformation (when animation begins)
			// toTransform: dojox.gfx.matrix.Matrix2D
			//		the end transormation (when animation ends)
			// onAnimationEnd: function
			//		callback function to be executed when the animation completes.
			var fromDx = fromTransform.dx?fromTransform.dx:0;
			var fromDy = fromTransform.dy?fromTransform.dy:0;
			var toDx = toTransform.dx?toTransform.dx:0;
			var toDy = toTransform.dy?toTransform.dy:0;
			var fromScale = fromTransform.xx?fromTransform.xx:1.0;
			var toScale = toTransform.xx?toTransform.xx:1.0;
	
			var anim = gfx.fx.animateTransform({
				duration: 1000,
				shape: onShape,
				transform: [{
					name: "translate",
					start: [fromDx,fromDy],
					end: [toDx,toDy]
				},
				{
					name: "scale",
					start: [fromScale],
					end: [toScale]
				}
				]
			});
	
			//install callback
			if(onAnimationEnd){
				var listener = connect.connect(anim,"onEnd",this,function(event){
					onAnimationEnd(event);
					connect.disconnect(listener);
				});
			}
	
			return anim;
		},
	
	
		setMapCenterAndScale: function(centerX,centerY,scale, animate,/* callback function */onAnimationEnd){
	
			// summary:
			//		set this component's transformation so that the map is centered on the specified map coordinates
			//		and scaled to the specified scale.
			// centerX: float
			//		the X coordinate (in map coordinates) of the new center
			// centerY: float
			//		the Y coordinate (in map coordinates) of the new center
			// scale: float
			//		the scale of the map
			// animate: boolean
			//		true if the transform change should be animated
			// onAnimationEnd: function
			//		a callback function to be executed when the animation completes (if animate set to true).
	
	
			// compute matrix parameters
			var bbox = this.mapObj.boundBox;
			var containerBounds = this._getContainerBounds();
			var offsetX = containerBounds.w/2 - scale * (centerX - bbox.x);
			var offsetY = containerBounds.h/2 - scale * (centerY - bbox.y);
			var newTransform = new gfx.matrix.Matrix2D({xx: scale, yy: scale, dx:offsetX, dy:offsetY});
	
	
			var currentTransform = this.mapObj.getTransform();
	
			// can animate only if specified AND curentTransform exists
			if(!animate || !currentTransform){
				this.mapObj.setTransform(newTransform);
			}else{
				var anim = this._createAnimation(this.mapObj,currentTransform,newTransform,onAnimationEnd);
				anim.play();
			}
		},
	
		getMapCenter: function(){
			// summary:
			//		returns the map coordinates of the center of this Map component.
			// returns: point
			//		the center in map coordinates
			var containerBounds = this._getContainerBounds();
			return this.screenCoordsToMapCoords(containerBounds.w/2,containerBounds.h/2); // point
		},
	
		setMapScale: function(scale,animate,/* callback function */onAnimationEnd){
			// summary:
			//		set this component's transformation so that the map is scaled to the specified scale.
			// scale: Number
			//		the scale ratio.
			// animate: boolean
			//		true if the transform change should be animated
			// onAnimationEnd: function
			//		a callback function to be executed when the animation completes (if animate set to true).
	
	
			// default invariant is map center
			var containerBounds = this._getContainerBounds();
			var invariantMapPoint = this.screenCoordsToMapCoords(containerBounds.w/2,containerBounds.h/2);
			this.setMapScaleAt(scale,invariantMapPoint.x,invariantMapPoint.y,animate,onAnimationEnd);
		},
	
		setMapScaleAt: function(scale,fixedMapX,fixedMapY,animate,/* callback function */onAnimationEnd){
			// summary:
			//		set this component's transformation so that the map is scaled to the specified scale, and the specified
			//		point (in map coordinates) stays fixed on this Map component
			// scale: Number
			//		the scale ratio.
			// fixedMapX: float
			//		the X coordinate (in map coordinates) of the fixed screen point
			// fixedMapY: float
			//		the Y coordinate (in map coordinates) of the fixed screen point
			// animate: boolean
			//		true if the transform change should be animated
			// onAnimationEnd: function
			//		a callback function to be executed when the animation completes (if animate set to true).
	
	
			var invariantMapPoint = null;
			var invariantScreenPoint = null;
	
			invariantMapPoint = {x: fixedMapX, y: fixedMapY};
			invariantScreenPoint = this.mapCoordsToScreenCoords(invariantMapPoint.x,invariantMapPoint.y);
	
			// compute matrix parameters
			var bbox = this.mapObj.boundBox;
			var offsetX = invariantScreenPoint.x - scale * (invariantMapPoint.x - bbox.x);
			var offsetY = invariantScreenPoint.y - scale * (invariantMapPoint.y - bbox.y);
			var newTransform = new gfx.matrix.Matrix2D({xx: scale, yy: scale, dx:offsetX, dy:offsetY});
	
			var currentTransform = this.mapObj.getTransform();
	
			// can animate only if specified AND curentTransform exists
			if(!animate || !currentTransform){
				this.mapObj.setTransform(newTransform);
			}else{
				var anim = this._createAnimation(this.mapObj,currentTransform,newTransform,onAnimationEnd);
				anim.play();
			}
		},
	
		getMapScale: function(){
			// summary:
			//		returns the scale of this Map component.
			// returns: float
			//		the scale
			var mat = this.mapObj.getTransform();
			var scale = mat?mat.xx:1.0;
			return scale; // Number
		},
	
		mapCoordsToScreenCoords: function(mapX,mapY){
			// summary:
			//		converts map coordinates to screen coordinates given the current transform of this Map component
			// mapX: Number
			//		the x coordinate of the point to convert.
			// mapY: Number
			//		the y coordinate of the point to convert.
			// returns: {x:,y:}
			//		the screen coordinates correspondig to the specified map coordinates.
			var matrix = this.mapObj.getTransform();
			var screenPoint = gfx.matrix.multiplyPoint(matrix, mapX, mapY);
			return screenPoint; // point
		},
	
		screenCoordsToMapCoords: function(screenX, screenY){
			// summary:
			//		converts screen coordinates to map coordinates given the current transform of this Map component
			// screenX: Number
			//		the x coordinate of the point to convert.
			// screenY: Number
			//		the y coordinate of the point to convert.
			// returns:
			//		the map coordinates corresponding to the specified screen coordinates.
			var invMatrix = gfx.matrix.invert(this.mapObj.getTransform());
			var mapPoint = gfx.matrix.multiplyPoint(invMatrix, screenX, screenY);
			return mapPoint; // point
		},
		deselectAll: function(){
			// summary:
			//		deselect all features of map
			for(var name in this.mapObj.features){
				this.mapObj.features[name].select(false);
			}
			this.selectedFeature = null;
			this.focused = false;
		},
	
		_init: function(shapeData){
			// summary:
			//		inits this Map component.
	
			//transform map to fit container
			this.mapObj.boundBox = {x: shapeData.layerExtent[0],
									y: shapeData.layerExtent[1],
									w: (shapeData.layerExtent[2] - shapeData.layerExtent[0]),
									h: shapeData.layerExtent[3] - shapeData.layerExtent[1]};
			this.fitToMapContents(3);
	
	
			//	if there are "features", then implement them now.
			arr.forEach(shapeData.featureNames, function(item){
				var featureShape = shapeData.features[item];
				featureShape.bbox.x = featureShape.bbox[0];
				featureShape.bbox.y = featureShape.bbox[1];
				featureShape.bbox.w = featureShape.bbox[2];
				featureShape.bbox.h = featureShape.bbox[3];
				var feature = new Feature(this, item, featureShape);
				feature.init();
				this.mapObj.features[item] = feature;
			}, this);
	
	
			//	set up a marker.
			this.mapObj.marker = new Marker({}, this);
		},
		_appendMarker: function(markerData){
			this.mapObj.marker = new Marker(markerData, this);
		},
		_createZoomingCursor: function(){
			if(!dom.byId("mapZoomCursor")){
				var mapZoomCursor = win.doc.createElement("div");
				html.attr(mapZoomCursor,"id","mapZoomCursor");
				domClass.add(mapZoomCursor,"mapZoomIn");
				html.style(mapZoomCursor,"display","none");
				win.body().appendChild(mapZoomCursor);
			}
		},
		onFeatureClick: function(feature){
			// summary:
			//		Invoked when the specified feature is clicked.
			// feature: dojox.geo.charting.Feature
			//		A Feature.
			// tags:
			//		callback
		},
		onFeatureOver: function(feature){
			// summary:
			//		Invoked when the specified feature is hovered.
			// feature: dojox.geo.charting.Feature
			//		A Feature.
			// tags:
			//		callback
		},
		onZoomEnd:function(feature){
			// summary:
			//		Invoked when the specified feature has been zoomed.
			// feature: dojox.geo.charting.Feature
			//		A Feature.
			// tags:
			//		callback
		}
	});
});