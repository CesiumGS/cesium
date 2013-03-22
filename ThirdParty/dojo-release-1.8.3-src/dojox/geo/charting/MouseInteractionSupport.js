define([
	"dojo/_base/lang",
	"dojo/_base/declare",
	"dojo/_base/event",
	"dojo/_base/connect",
	"dojo/_base/window",
	"dojo/_base/html",
	"dojo/dom",
	"dojo/_base/sniff"
], function(lang, declare, event, connect, win, html, dom, has){

	/*=====
	dojox.geo.charting.__MouseInteractionSupportCtorArgs = {
		// summary:
		//		The keyword arguments that can be passed in a MouseInteractionSupport constructor.
		// enableZoom: Boolean?
		//		Indicates whether zooming is enabled.
		// enablePan: Boolean?
		//		Indicates whether panning is enabled.
		// mouseClickThreshold: Number?
		//		The threshold (in pixel) that differentiates a drag from a click.
	};
	=====*/

	return declare("dojox.geo.charting.MouseInteractionSupport", null, {
		// summary:
		//		class to handle mouse interactions on a dojox.geo.charting.Map widget
		// tags:
		//		private

		_map: null,
		_mapClickLocation: null,
		_screenClickLocation: null,
		_mouseDragListener: null,
		_mouseUpListener: null,
		_mouseUpClickListener: null,
		_mouseDownListener: null,
		_mouseMoveListener: null,
		_mouseWheelListener: null,
		_currentFeature: null,
		_cancelMouseClick: null,
		_zoomEnabled: false,
		_panEnabled: false,
		_onDragStartListener: null,
		_onSelectStartListener: null,


		mouseClickThreshold: 2,

		constructor : function(map, options){
			// summary:
			//		Constructs a new _MouseInteractionSupport instance
			// map: dojox/geo/charting/Map
			//		the Map widget this class provides touch navigation for.
			// options: dojox.geo.charting.__MouseInteractionSupportCtorArgs?
			//		An object defining additional configuration properties.
			this._map = map;
			this._mapClickLocation = {x: 0,y: 0};
			this._screenClickLocation = {x: 0,y: 0};
			this._cancelMouseClick = false;
			if(options){
				this._zoomEnabled = options.enableZoom;
				this._panEnabled = options.enablePan;
				if(options.mouseClickThreshold && options.mouseClickThreshold > 0){
					this.mouseClickThreshold = options.mouseClickThreshold;
				}
			}
		},

		setEnableZoom: function(enable){
			// summary:
			//		enables mouse zoom on the map
			// enable: Boolean
			//		Indicates whether mouse zoom is enabled.
			if(enable && !this._mouseWheelListener){
				// enable
				var wheelEventName = !has("mozilla") ? "onmousewheel" : "DOMMouseScroll";
				this._mouseWheelListener = this._map.surface.connect(wheelEventName, this, this._mouseWheelHandler);
			}else if(!enable && this._mouseWheelListener){
				// disable
				connect.disconnect(this._mouseWheelListener);
				this._mouseWheelListener = null;
			}
			this._zoomEnabled = enable;
		},

		setEnablePan: function(enable){
			// summary:
			//		enables mouse panning on the map
			// enable: Boolean
			//		Indicates whether mouse zoom is enabled.
			this._panEnabled = enable;
		},

		connect: function(){
			// summary:
			//		connects this mouse support class to the Map component

			// install mouse listeners
			this._mouseMoveListener = this._map.surface.connect("onmousemove", this, this._mouseMoveHandler);
			this._mouseDownListener = this._map.surface.connect("onmousedown", this, this._mouseDownHandler);

			if(has("ie")){
				_onDragStartListener = connect.connect(win.doc,"ondragstart",this,event.stop);
				_onSelectStartListener = connect.connect(win.doc,"onselectstart",this,event.stop);
			}

			this.setEnableZoom(this._zoomEnabled);
			this.setEnablePan(this._panEnabled);
		},

		disconnect: function(){
			// summary:
			//		disconnects any installed listeners

			// store zoomPan state
			var isZoom = this._zoomEnabled;

			// disable zoom (disconnects listeners..)
			this.setEnableZoom(false);

			// restore value
			this._zoomEnabled = isZoom;

			// disconnect remaining listeners
			if(this._mouseMoveListener){
				connect.disconnect(this._mouseMoveListener);
				this._mouseMoveListener = null;
				connect.disconnect(this._mouseDownListener);
				this._mouseDownListener = null;
			}
			if(this._onDragStartListener){
				connect.disconnect(this._onDragStartListener);
				this._onDragStartListener = null;
				connect.disconnect(this._onSelectStartListener);
				this._onSelectStartListener = null;
			}

		},

		_mouseClickHandler: function(mouseEvent){
			// summary:
			//		action performed on the map when a mouse click was performed
			// mouseEvent: MouseEvent
			//		the mouse event
			// tags:
			//		private

			var feature = this._getFeatureFromMouseEvent(mouseEvent);

			if(feature){
				// call feature handler
				feature._onclickHandler(mouseEvent);
			}else{
				// unselect all
				for(var name in this._map.mapObj.features){
					this._map.mapObj.features[name].select(false);
				}
				this._map.onFeatureClick(null);
			}

		},

		_mouseDownHandler: function(mouseEvent){
			// summary:
			//		action performed on the map when a mouse down was performed
			// mouseEvent: MouseEvent
			//		the mouse event
			// tags:
			//		private


			event.stop(mouseEvent);

			this._map.focused = true;
			// set various status parameters
			this._cancelMouseClick = false;
			this._screenClickLocation.x =  mouseEvent.pageX;
			this._screenClickLocation.y =  mouseEvent.pageY;

			// store map location where mouse down occurred
			var containerBounds = this._map._getContainerBounds();
			var offX = mouseEvent.pageX	- containerBounds.x,
				offY = mouseEvent.pageY - containerBounds.y;
			var mapPoint = this._map.screenCoordsToMapCoords(offX,offY);
			this._mapClickLocation.x = mapPoint.x;
			this._mapClickLocation.y = mapPoint.y;

			// install drag listener if pan is enabled
			if(!has("ie")){
				this._mouseDragListener = connect.connect(win.doc,"onmousemove",this,this._mouseDragHandler);
				this._mouseUpClickListener = this._map.surface.connect("onmouseup", this, this._mouseUpClickHandler);
				this._mouseUpListener = connect.connect(win.doc,"onmouseup",this, this._mouseUpHandler);
			}else{
				var node = dom.byId(this._map.container);
				this._mouseDragListener = connect.connect(node,"onmousemove",this,this._mouseDragHandler);
				this._mouseUpClickListener = this._map.surface.connect("onmouseup", this, this._mouseUpClickHandler);
				this._mouseUpListener = this._map.surface.connect("onmouseup", this, this._mouseUpHandler);
				this._map.surface.rawNode.setCapture();
			}
		},

		_mouseUpClickHandler: function(mouseEvent){

			if(!this._cancelMouseClick){
				// execute mouse click handler
				this._mouseClickHandler(mouseEvent);
			}
			this._cancelMouseClick = false;

		},

		_mouseUpHandler: function(mouseEvent){
			// summary:
			//		action performed on the map when a mouse up was performed
			// mouseEvent: MouseEvent
			//		the mouse event
			// tags:
			//		private

			event.stop(mouseEvent);

			this._map.mapObj.marker._needTooltipRefresh = true;

			// disconnect listeners
			if(this._mouseDragListener){
				connect.disconnect(this._mouseDragListener);
				this._mouseDragListener = null;
			}
			if(this._mouseUpClickListener){
				connect.disconnect(this._mouseUpClickListener);
				this._mouseUpClickListener = null;
			}
			if(this._mouseUpListener){
				connect.disconnect(this._mouseUpListener);
				this._mouseUpListener = null;
			}

			if(has("ie")){
				this._map.surface.rawNode.releaseCapture();
			}
		},

		_getFeatureFromMouseEvent: function(mouseEvent){
			// summary:
			//		utility function to return the feature located at this mouse event location
			// mouseEvent: MouseEvent
			//		the mouse event
			// returns:
			//		the feature found if any, null otherwise.
			// tags:
			//		private
			var feature = null;
			if(mouseEvent.gfxTarget && mouseEvent.gfxTarget.getParent){
				feature = this._map.mapObj.features[mouseEvent.gfxTarget.getParent().id];
			}
			return feature; // dojox/geo/charting/Feature
		},

		_mouseMoveHandler: function(mouseEvent){
			// summary:
			//		action performed on the map when a mouse move was performed
			// mouseEvent: MouseEvent
			//		the mouse event
			// tags:
			//		private


			// do nothing more if dragging
			if(this._mouseDragListener && this._panEnabled){
				return;
			}

			// hover and highlight
			var feature = this._getFeatureFromMouseEvent(mouseEvent);

			// set/unset highlight
			if(feature != this._currentFeature){
				if(this._currentFeature){
					// mouse leaving component
					this._currentFeature._onmouseoutHandler();
				}
				this._currentFeature = feature;

				if(feature){
					feature._onmouseoverHandler();
				}
			}

			if(feature){
				feature._onmousemoveHandler(mouseEvent);
			}
		},

		_mouseDragHandler: function(mouseEvent){
			// summary:
			//		action performed on the map when a mouse drag was performed
			// mouseEvent: MouseEvent
			//		the mouse event
			// tags:
			//		private

			// prevent browser interaction
			event.stop(mouseEvent);


			// find out if this the movement discards the "mouse click" gesture
			var dx = Math.abs(mouseEvent.pageX - this._screenClickLocation.x);
			var dy = Math.abs(mouseEvent.pageY - this._screenClickLocation.y);
			if(!this._cancelMouseClick && (dx > this.mouseClickThreshold || dy > this.mouseClickThreshold)){
				// cancel mouse click
				this._cancelMouseClick = true;
				if(this._panEnabled){
					this._map.mapObj.marker.hide();
				}
			}

			if(!this._panEnabled){
				return;
			}

			var cBounds = this._map._getContainerBounds();
			var offX = mouseEvent.pageX - cBounds.x,
			offY = mouseEvent.pageY - cBounds.y;

			// compute map offset
			var mapPoint = this._map.screenCoordsToMapCoords(offX,offY);
			var mapOffsetX = mapPoint.x - this._mapClickLocation.x;
			var mapOffsetY = mapPoint.y - this._mapClickLocation.y;

			// adjust map center
			var currentMapCenter = this._map.getMapCenter();
			this._map.setMapCenter(currentMapCenter.x - mapOffsetX, currentMapCenter.y - mapOffsetY);

		},

		_mouseWheelHandler: function(mouseEvent){
			// summary:
			//		action performed on the map when a mouse wheel up/down was performed
			// mouseEvent: MouseEvent
			//		the mouse event
			// tags:
			//		private

			// prevent browser interaction
			event.stop(mouseEvent);

			// hide tooltip
			this._map.mapObj.marker.hide();

			// event coords within component
			var containerBounds = this._map._getContainerBounds();
			var offX = mouseEvent.pageX - containerBounds.x,
				offY = mouseEvent.pageY - containerBounds.y;

			// current map point before zooming
			var invariantMapPoint = this._map.screenCoordsToMapCoords(offX,offY);

			// zoom increment power
			var power  = mouseEvent[(has("mozilla") ? "detail" : "wheelDelta")] / (has("mozilla") ? - 3 : 120) ;
			var scaleFactor = Math.pow(1.2,power);
			this._map.setMapScaleAt(this._map.getMapScale()*scaleFactor ,invariantMapPoint.x,invariantMapPoint.y,false);
			this._map.mapObj.marker._needTooltipRefresh = true;
		}
	});
});
