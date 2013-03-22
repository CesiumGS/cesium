define([
	"dojo/_base/declare",
	"dojo/_base/connect",
	"dojo/_base/html",
	"dojo/_base/lang",
	"dojo/_base/event",
	"dojo/_base/window"
], function(declare, connect, html, lang, event, win){

	return declare("dojox.geo.openlayers.TouchInteractionSupport", null, {
		// summary:
		//		class to handle touch interactions on a OpenLayers.Map widget
		// tags:
		//		private

		_map: null,
		_centerTouchLocation: null,
		_touchMoveListener: null,
		_touchEndListener: null,
		_initialFingerSpacing: null,
		_initialScale: null,
		_tapCount: null,
		_tapThreshold: null,
		_lastTap: null,

		constructor: function(map){
			// summary:
			//		Constructs a new TouchInteractionSupport instance
			// map: OpenLayers.Map
			//		the Map widget this class provides touch navigation for.
			this._map = map;
			this._centerTouchLocation = new OpenLayers.LonLat(0, 0);

			var div = this._map.div;

			// install touch listeners
			connect.connect(div, "touchstart", this, this._touchStartHandler);
			connect.connect(div, "touchmove", this, this._touchMoveHandler);
			connect.connect(div, "touchend", this, this._touchEndHandler);

			this._tapCount = 0;
			this._lastTap = {
				x: 0,
				y: 0
			};
			this._tapThreshold = 100; // square distance in pixels

		},

		_getTouchBarycenter: function(touchEvent){
			// summary:
			//		returns the midpoint of the two first fingers (or the first finger location if only one)
			// touchEvent: TouchEvent
			//		a touch event
			// returns:
			//		the midpoint as an {x,y} object.
			// tags:
			//		private
			var touches = touchEvent.touches;
			var firstTouch = touches[0];
			var secondTouch = null;
			if(touches.length > 1){
				secondTouch = touches[1];
			}else{
				secondTouch = touches[0];
			}

			var marginBox = html.marginBox(this._map.div);

			var middleX = (firstTouch.pageX + secondTouch.pageX) / 2.0 - marginBox.l;
			var middleY = (firstTouch.pageY + secondTouch.pageY) / 2.0 - marginBox.t;

			return {
				x: middleX,
				y: middleY
			}; // Object

		},

		_getFingerSpacing: function(touchEvent){
			// summary:
			//		computes the distance between the first two fingers
			// touchEvent: Event
			//		a touch event
			// returns: float
			//		a distance. -1 if less that 2 fingers
			// tags:
			//		private
			var touches = touchEvent.touches;
			var spacing = -1;
			if(touches.length >= 2){
				var dx = (touches[1].pageX - touches[0].pageX);
				var dy = (touches[1].pageY - touches[0].pageY);
				spacing = Math.sqrt(dx * dx + dy * dy);
			}
			return spacing;
		},

		_isDoubleTap: function(touchEvent){
			// summary:
			//		checks whether the specified touchStart event is a double tap 
			//		(i.e. follows closely a previous touchStart at approximately the same location)
			// touchEvent: TouchEvent
			//		a touch event
			// returns: boolean
			//		true if this event is considered a double tap
			// tags:
			//		private
			var isDoubleTap = false;
			var touches = touchEvent.touches;
			if((this._tapCount > 0) && touches.length == 1){
				// test distance from last tap
				var dx = (touches[0].pageX - this._lastTap.x);
				var dy = (touches[0].pageY - this._lastTap.y);
				var distance = dx * dx + dy * dy;
				if(distance < this._tapThreshold){
					isDoubleTap = true;
				}else{
					this._tapCount = 0;
				}
			}
			this._tapCount++;
			this._lastTap.x = touches[0].pageX;
			this._lastTap.y = touches[0].pageY;
			setTimeout(lang.hitch(this, function(){
				this._tapCount = 0;
			}), 300);

			return isDoubleTap;
		},

		_doubleTapHandler: function(touchEvent){
			// summary:
			//		action performed on the map when a double tap was triggered 
			// touchEvent: TouchEvent
			//		a touch event
			// tags:
			//		private

			// perform a basic 2x zoom on touch
			var touches = touchEvent.touches;
			var marginBox = html.marginBox(this._map.div);
			var offX = touches[0].pageX - marginBox.l;
			var offY = touches[0].pageY - marginBox.t;
			// clicked map point before zooming
			var mapPoint = this._map.getLonLatFromPixel(new OpenLayers.Pixel(offX, offY));
			// zoom increment power
			this._map.setCenter(new OpenLayers.LonLat(mapPoint.lon, mapPoint.lat), this._map.getZoom() + 1);
		},

		_touchStartHandler: function(touchEvent){
			// summary:
			//		action performed on the map when a touch start was triggered 
			// touchEvent: Event
			//		a touch event
			// tags:
			//		private
			event.stop(touchEvent);

			// test double tap
			if(this._isDoubleTap(touchEvent)){
				this._doubleTapHandler(touchEvent);
				return;
			}

			// compute map midpoint between fingers		
			var middlePoint = this._getTouchBarycenter(touchEvent);

			this._centerTouchLocation = this._map.getLonLatFromPixel(new OpenLayers.Pixel(middlePoint.x, middlePoint.y));

			// store initial finger spacing to compute zoom later
			this._initialFingerSpacing = this._getFingerSpacing(touchEvent);

			// store initial map scale
			this._initialScale = this._map.getScale();

			// install touch move and up listeners (if not done by other fingers before)
			if(!this._touchMoveListener){
				this._touchMoveListener = connect.connect(win.global, "touchmove", this, this._touchMoveHandler);
			}
			if(!this._touchEndListener){
				this._touchEndListener = connect.connect(win.global, "touchend", this, this._touchEndHandler);
			}
		},

		_touchEndHandler: function(touchEvent){
			// summary:
			//		action performed on the map when a touch end was triggered 
			// touchEvent: Event
			//		a touch event
			// tags:
			//		private
			event.stop(touchEvent);

			var touches = touchEvent.touches;

			if(touches.length == 0){
				// disconnect listeners only when all fingers are up
				if(this._touchMoveListener){
					connect.disconnect(this._touchMoveListener);
					this._touchMoveListener = null;
				}
				if(this._touchEndListener){
					connect.disconnect(this._touchEndListener);
					this._touchEndListener = null;
				}
			}else{
				// recompute touch center
				var middlePoint = this._getTouchBarycenter(touchEvent);

				this._centerTouchLocation = this._map.getLonLatFromPixel(new OpenLayers.Pixel(middlePoint.x, middlePoint.y));
			}
		},

		_touchMoveHandler: function(touchEvent){
			// summary:
			//		action performed on the map when a touch move was triggered 
			// touchEvent: Event
			//		a touch event
			// tags:
			//		private

			// prevent browser interaction
			event.stop(touchEvent);

			var middlePoint = this._getTouchBarycenter(touchEvent);

			// compute map offset
			var mapPoint = this._map.getLonLatFromPixel(new OpenLayers.Pixel(middlePoint.x, middlePoint.y));
			var mapOffsetLon = mapPoint.lon - this._centerTouchLocation.lon;
			var mapOffsetLat = mapPoint.lat - this._centerTouchLocation.lat;

			// compute scale factor
			var scaleFactor = 1;
			var touches = touchEvent.touches;
			if(touches.length >= 2){
				var fingerSpacing = this._getFingerSpacing(touchEvent);
				scaleFactor = fingerSpacing / this._initialFingerSpacing;
				// weird openlayer bug: setting several times the same scale value lead to visual zoom...
				this._map.zoomToScale(this._initialScale / scaleFactor);
			}

			// adjust map center on barycenter
			var currentMapCenter = this._map.getCenter();
			this._map.setCenter(new OpenLayers.LonLat(currentMapCenter.lon - mapOffsetLon, currentMapCenter.lat
																																											- mapOffsetLat));

		}
	});
});
