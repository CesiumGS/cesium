define([
	"dojo/_base/lang",
	"dojo/_base/declare",
	"dojo/_base/event",
	"dojo/_base/connect",
	"dojo/_base/window"
], function(lang,declare,event,connect,win){

	return declare("dojox.geo.charting.TouchInteractionSupport",null, {
		// summary:
		//		A class to handle touch interactions on a dojox/geo/charting/Map component.
		// tags:
		//		private

		_map: null,
		_centerTouchLocation: null,
		_touchMoveListener: null,
		_touchEndListener: null,
		_touchEndTapListener: null,
		_touchStartListener: null,
		_initialFingerSpacing: null,
		_initialScale: null,
		_tapCount: null,
		_tapThreshold: null,
		_lastTap: null,
		_doubleTapPerformed:false,
		_oneFingerTouch:false,
		_tapCancel:false,

		constructor: function(map){
			// summary:
			//		Constructs a new _TouchInteractionSupport instance
			// map: dojox.geo.charting.Map
			//		the Map widget this class provides touch navigation for.
			this._map = map;
			this._centerTouchLocation = {x: 0,y: 0};

			this._tapCount = 0;
			this._lastTap = {x: 0,y: 0};
			this._tapThreshold = 100; // square distance in pixels
		},

		connect: function(){
			// summary:
			//		install touch listeners
			this._touchStartListener = this._map.surface.connect("touchstart", this, this._touchStartHandler);
		},

		disconnect: function(){
			// summary:
			//		disconnects any installed listeners. Must be called only when disposing of this instance
			if(this._touchStartListener){
				connect.disconnect(this._touchStartListener);
				this._touchStartListener = null;
			}
		},

		_getTouchBarycenter: function(touchEvent){
			// summary:
			//		returns the midpoint of the two first fingers (or the first finger location if only one)
			// touchEvent: TouchEvent
			//		a touch event
			// returns:
			//		the midpoint
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
			var containerBounds = this._map._getContainerBounds();
			var middleX = (firstTouch.pageX + secondTouch.pageX) / 2.0 - containerBounds.x;
			var middleY = (firstTouch.pageY + secondTouch.pageY) / 2.0 - containerBounds.y;
			return {x: middleX,y: middleY}; // dojox/gfx/Point
		},

		_getFingerSpacing: function(touchEvent){
			// summary:
			//		computes the distance between the first two fingers
			// touchEvent: a touch event
			// returns:
			//		a distance. -1 if less than 2 fingers
			// tags:
			//		private
			var touches = touchEvent.touches;
			var spacing = -1;
			if(touches.length >= 2){
				var dx = (touches[1].pageX - touches[0].pageX);
				var dy = (touches[1].pageY - touches[0].pageY);
				spacing = Math.sqrt(dx*dx + dy*dy);
			}
			return spacing;
		},

		_isDoubleTap: function(touchEvent){
			// summary:
			//		checks whether the specified touchStart event is a double tap
			//		(i.e. follows closely a previous touchStart at approximately the same location)
			// touchEvent: TouchEvent
			//		a touch event
			// returns:
			//		true if this event is considered a double tap
			// tags:
			//		private
			var isDoubleTap = false;
			var touches = touchEvent.touches;
			if((this._tapCount > 0) && touches.length == 1){
				// test distance from last tap
				var dx = (touches[0].pageX - this._lastTap.x);
				var dy = (touches[0].pageY - this._lastTap.y);
				var distance = dx*dx + dy*dy;
				if(distance < this._tapThreshold){
					isDoubleTap = true;
				}else{
					this._tapCount = 0;
				}
			}
			this._tapCount++;
			this._lastTap.x = touches[0].pageX;
			this._lastTap.y = touches[0].pageY;
			setTimeout(lang.hitch(this,function(){
				this._tapCount = 0;}),300);
			return isDoubleTap;
		},

		_doubleTapHandler: function(touchEvent){
			// summary:
			//		action performed on the map when a double tap was triggered
			// touchEvent: TouchEvent
			//		a touch event
			// tags:
			//		private
			var feature = this._getFeatureFromTouchEvent(touchEvent);
			if(feature){
				this._map.fitToMapArea(feature._bbox, 15, true);
			}else{
				// perform a basic 2x zoom on touch
				var touches = touchEvent.touches;
				var containerBounds = this._map._getContainerBounds();
				var offX = touches[0].pageX - containerBounds.x;
				var offY = touches[0].pageY - containerBounds.y;
				// clicked map point before zooming
				var mapPoint = this._map.screenCoordsToMapCoords(offX,offY);
				// zoom increment power
				this._map.setMapCenterAndScale(mapPoint.x, mapPoint.y,this._map.getMapScale()*2,true);
			}
		},

		_getFeatureFromTouchEvent: function(touchEvent){
			// summary:
			//		utility function to return the feature located at this touch event location
			// touchEvent: TouchEvent
			//		a touch event
			// returns:
			//		the feature found if any, null otherwise.
			// tags:
			//		private
			var feature = null;
			if(touchEvent.gfxTarget && touchEvent.gfxTarget.getParent){
				feature = this._map.mapObj.features[touchEvent.gfxTarget.getParent().id];
			}
			return feature;	// dojox/geo/charting/Feature
		},

		_touchStartHandler: function(touchEvent){
			// summary:
			//		action performed on the map when a touch start was triggered
			// touchEvent: TouchEvent
			//		a touch event
			// tags:
			//		private
			event.stop(touchEvent);
			this._oneFingerTouch = (touchEvent.touches.length == 1);
			this._tapCancel = !this._oneFingerTouch;
			// test double tap
			this._doubleTapPerformed = false;
			if(this._isDoubleTap(touchEvent)){
				//console.log("double tap recognized");
				this._doubleTapHandler(touchEvent);
				this._doubleTapPerformed = true;
				return;
			}
			// compute map midpoint between fingers
			var middlePoint = this._getTouchBarycenter(touchEvent);
			var mapPoint = this._map.screenCoordsToMapCoords(middlePoint.x,middlePoint.y);
			this._centerTouchLocation.x = mapPoint.x;
			this._centerTouchLocation.y = mapPoint.y;
			// store initial finger spacing to compute zoom later
			this._initialFingerSpacing = this._getFingerSpacing(touchEvent);
			// store initial map scale
			this._initialScale = this._map.getMapScale();
			// install touch move and up listeners (if not done by other fingers before)
			if(!this._touchMoveListener){
				this._touchMoveListener = connect.connect(win.global,"touchmove",this,this._touchMoveHandler);
			}
			if(!this._touchEndTapListener){
				this._touchEndTapListener = this._map.surface.connect("touchend", this, this._touchEndTapHandler);
			}
			if(!this._touchEndListener){
				this._touchEndListener = connect.connect(win.global,"touchend",this, this._touchEndHandler);
			}
		},

		_touchEndTapHandler: function(touchEvent){
			// summary:
			//		action performed on the map when a tap was triggered
			// touchEvent: TouchEvent
			//		a touch event
			// tags:
			//		private
			var touches = touchEvent.touches;
			if(touches.length == 0){

				// test potential tap ?
				if(this._oneFingerTouch && !this._tapCancel){
					this._oneFingerTouch = false;
					setTimeout(lang.hitch(this,function(){
						// wait to check if double tap
						// perform test for single tap
						//console.log("double tap was performed ? " + this._doubleTapPerformed);
						if(!this._doubleTapPerformed){
							// test distance from last tap
							var dx = (touchEvent.changedTouches[0].pageX - this._lastTap.x);
							var dy = (touchEvent.changedTouches[0].pageY - this._lastTap.y);
							var distance = dx*dx + dy*dy;
							if(distance < this._tapThreshold){
								// single tap ok
								this._singleTapHandler(touchEvent);
							}
						}
					}), 350);
				}
				this._tapCancel = false;
			}
		},

		_touchEndHandler: function(touchEvent){
			// summary:
			//		action performed on the map when a touch end was triggered
			// touchEvent: TouchEvent
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
				var mapPoint = this._map.screenCoordsToMapCoords(middlePoint.x,middlePoint.y);
				this._centerTouchLocation.x = mapPoint.x;
				this._centerTouchLocation.y = mapPoint.y;
			}
		},

		_singleTapHandler: function(touchEvent){
			// summary:
			//		action performed on the map when a single tap was triggered
			// touchEvent: TouchEvent
			//		a touch event
			// tags:
			//		private
			var feature = this._getFeatureFromTouchEvent(touchEvent);
			if(feature){
				// call feature handler
				feature._onclickHandler(touchEvent);
			}else{
				// unselect all
				for(var name in this._map.mapObj.features){
					this._map.mapObj.features[name].select(false);
				}
				this._map.onFeatureClick(null);
			}
		},

		_touchMoveHandler: function(touchEvent){
			// summary:
			//		action performed on the map when a touch move was triggered
			// touchEvent: TouchEvent
			//		a touch event
			// tags:
			//		private

			// prevent browser interaction
			event.stop(touchEvent);

			// cancel tap if moved too far from first touch location
			if(!this._tapCancel){
				var dx = (touchEvent.touches[0].pageX - this._lastTap.x),
					dy = (touchEvent.touches[0].pageY - this._lastTap.y);
				var distance = dx*dx + dy*dy;
				if(distance > this._tapThreshold){
					this._tapCancel = true;
				}
			}
			var middlePoint = this._getTouchBarycenter(touchEvent);
			// compute map offset
			var mapPoint = this._map.screenCoordsToMapCoords(middlePoint.x,middlePoint.y),
				mapOffsetX = mapPoint.x - this._centerTouchLocation.x,
				mapOffsetY = mapPoint.y - this._centerTouchLocation.y;
			// compute scale factor
			var scaleFactor = 1;
			var touches = touchEvent.touches;
			if(touches.length >= 2){
				var fingerSpacing = this._getFingerSpacing(touchEvent);
				scaleFactor = fingerSpacing / this._initialFingerSpacing;
				// scale map
				this._map.setMapScale(this._initialScale*scaleFactor);
			}
			// adjust map center on barycentre
			var currentMapCenter = this._map.getMapCenter();
			this._map.setMapCenter(currentMapCenter.x - mapOffsetX, currentMapCenter.y - mapOffsetY);
		}
	});
});
