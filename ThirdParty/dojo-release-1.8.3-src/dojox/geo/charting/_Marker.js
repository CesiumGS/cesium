define([
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/_base/sniff",
	"./_base"
], function(lang, arr, declare, has){
	return declare("dojox.geo.charting._Marker", null, {
		
		_needTooltipRefresh: null,
		_map: null,
		
		constructor: function(markerData, map){
			this._map = map;
			var mapObj = map.mapObj;
			this.features = mapObj.features;
			this.markerData = markerData;
			_needTooltipRefresh = false;
		},
	
		show: function(featureId, evt){
			this.currentFeature = this.features[featureId];
			if(this._map.showTooltips && this.currentFeature){
				this.markerText = this.currentFeature.markerText || this.markerData[featureId] || featureId;
				dojox.geo.charting.showTooltip(this.markerText, this.currentFeature.shape, ["before"]);
			}
			this._needTooltipRefresh = false;
		},
	
		hide: function(){
			if(this._map.showTooltips && this.currentFeature){
				dojox.geo.charting.hideTooltip(this.currentFeature.shape);
			}
			this._needTooltipRefresh = false;
		},
	
		_getGroupBoundingBox: function(group){
			var shapes = group.children;
			var feature = shapes[0];
			var bbox = feature.getBoundingBox();
			this._arround = lang.clone(bbox);
			arr.forEach(shapes, function(item){
				var _bbox = item.getBoundingBox();
				this._arround.x = Math.min(this._arround.x, _bbox.x);
				this._arround.y = Math.min(this._arround.y, _bbox.y);
			},this);
		},
	
		_toWindowCoords: function(arround, coords, containerSize){
			var toLeft = (arround.x - this.topLeft[0]) * this.scale;
			var toTop = (arround.y - this.topLeft[1]) * this.scale
			if(has("ff") == 3.5){
				arround.x = coords.x;
				arround.y = coords.y;
			}else if(has("chrome")){
				arround.x = containerSize.x + toLeft;
				arround.y = containerSize.y + toTop;
			}else{
				arround.x = coords.x + toLeft;
				arround.y = coords.y + toTop;
			}
			arround.width = (this.currentFeature._bbox[2]) * this.scale;
			arround.height = (this.currentFeature._bbox[3]) * this.scale;
			arround.x += arround.width / 6;
			arround.y += arround.height / 4;
		}
	});
});
