define([
	"dojo/_base/lang",
	"dojo/_base/declare",
	"dojo/_base/event",
	"dojo/_base/connect",
	"dojo/_base/html",
	"dojo/dom",
	"dojox/lang/functional",
	"dojo/keys"
], function(lang, declare, event, connect, html, dom, functional, keys){

	return declare("dojox.geo.charting.KeyboardInteractionSupport", null, {
		// summary:
		//		class to handle keyboard interactions on a dojox.geo.charting.Map component.
		//
		//		The sections on the leading edge should receive the focus in response to a TAB event.
		//		Then use cursor keys to the peer sections. The cursor event should go the adjacent section
		//		in that direction. With the focus, the section zooms in upon SPACE. The map should zoom out
		//		on ESC. Finally, while it has the focus, the map should lose the focus on TAB.
		// tags:
		//		private
		_map: null,
		_zoomEnabled: false,

		constructor: function(/*dojox/geo/charting/Map*/ map, /*Object?*/ options){
			// summary:
			//		Constructs a new _KeyboardInteractionSupport instance
			// map: dojox/geo/charting/Map
			//		the Map component this class provides touch navigation for.
			// options: Object?
			//		An object defining additional configuration properties. Currently,
			//		only the enableZoom property of this object is taken into account to enable/disable
			//		the Map zooming capability.
			this._map = map;
			if(options){
				this._zoomEnabled = options.enableZoom;
			}
		},
		connect: function(){
			// summary:
			//		connects this keyboard support class to the Map component
			var container = dom.byId(this._map.container);
			//	tab accessing enable
			html.attr(container, {
				tabindex: 0,
				role: "presentation",
				"aria-label": "map"
			});
			// install listeners
			this._keydownListener = connect.connect(container, "keydown", this, "keydownHandler");
			this._onFocusListener = connect.connect(container, "focus", this, "onFocus");
			this._onBlurListener = connect.connect(container, "blur", this, "onBlur");
		},
		disconnect: function(){
			// summary:
			//		disconnects any installed listeners
			connect.disconnect(this._keydownListener);
			this._keydownListener = null;
			connect.disconnect(this._onFocusListener);
			this._onFocusListener = null;
			connect.disconnect(this._onBlurListener);
			this._onBlurListener = null
		},
		keydownHandler: function(/*KeyboardEvent*/e){
			// summary:
			//		Handles a keydown event.
			// e: KeyboardEvent
			//		An event.
			switch(e.keyCode){
				case keys.LEFT_ARROW:
					this._directTo(-1,-1,1,-1);
					break;
				case keys.RIGHT_ARROW:
					this._directTo(-1,-1,-1,1);
					break;
				case keys.UP_ARROW:
					this._directTo(1,-1,-1,-1);
					break;
				case keys.DOWN_ARROW:
					this._directTo(-1,1,-1,-1);
					break;
				case keys.SPACE:
					if(this._map.selectedFeature && !this._map.selectedFeature._isZoomIn && this._zoomEnabled){
						this._map.selectedFeature._zoomIn();
					}
					break;
				case keys.ESCAPE:
					if(this._map.selectedFeature && this._map.selectedFeature._isZoomIn && this._zoomEnabled){
						this._map.selectedFeature._zoomOut();
					}
					break;
				default:
					return;
			}
			event.stop(e);
		},
		onFocus: function(e){
			// summary:
			//		Handles the onFocus event.
			// e: Event
			//		An event.

			// select the leading region at the map center
			if(this._map.selectedFeature || this._map.focused){return;}
			this._map.focused = true;
			var leadingRegion,
				needClick = false;
			if(this._map.lastSelectedFeature){
				leadingRegion = this._map.lastSelectedFeature;
			}else{
				var mapCenter = this._map.getMapCenter(),
					minDistance = Infinity;
				// find the region most closing to the map center
				functional.forIn(this._map.mapObj.features, function(feature){
					var distance = Math.sqrt(Math.pow(feature._center[0] - mapCenter.x, 2) + Math.pow(feature._center[1] - mapCenter.y, 2));
					if(distance < minDistance){
						minDistance = distance;
						leadingRegion = feature;
					}
				});
				needClick = true;
			}
			if(leadingRegion){
				if(needClick){
					leadingRegion._onclickHandler(null);
				}
				this._map.mapObj.marker.show(leadingRegion.id);
			}
		},
		onBlur: function(){
			// summary:
			//		Handles the onBlur event.
			this._map.lastSelectedFeature = this._map.selectedFeature;
		},
		_directTo: function(up, down, left, right){
			var currentSelected = this._map.selectedFeature,
			centerX = currentSelected._center[0],
			centerY = currentSelected._center[1],
			minMargin = Infinity,
			nextSelected = null;
			functional.forIn(this._map.mapObj.features, function(feature){
				var paddingX = Math.abs(centerX - feature._center[0]),
				paddingY = Math.abs(centerY - feature._center[1]),
				paddingSum = paddingX + paddingY;
				if((up - down) * (centerY - feature._center[1]) > 0){
					if(paddingX < paddingY && minMargin > paddingSum){
						minMargin = paddingSum;
						nextSelected = feature;
					}
				}
				if((left - right) * (centerX - feature._center[0]) > 0){
					if(paddingX > paddingY && minMargin > paddingSum){
						minMargin = paddingSum;
						nextSelected = feature;
					}
				}
			});
			if(nextSelected){
				this._map.mapObj.marker.hide();
				nextSelected._onclickHandler(null);
				this._map.mapObj.marker.show(nextSelected.id);
			}
		}
	});
});