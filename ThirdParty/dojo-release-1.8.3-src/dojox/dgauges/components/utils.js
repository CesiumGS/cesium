define(["dojo/_base/lang", "dojo/_base/Color"], function(lang, Color){
	// module:
	//		dojox/dgauges/components/utils
	// summary:
	//		Gauge utilities.
	// tags:
	//		public

	var utils = {};

	lang.mixin(utils, {
		brightness: function(col, b){
			// summary:
			//		Adjusts the brightness of a color.
			// col: Number
			//		The base color
			// b: Number
			//		A positive or negative value to adjust the brightness
			// returns: Number
			//		The modified color			
			var res = lang.mixin(null, col);
			res.r = Math.max(Math.min(res.r + b, 255), 0);
			res.g = Math.max(Math.min(res.g + b, 255), 0);
			res.b = Math.max(Math.min(res.b + b, 255), 0);
			return res;
		},
		
		createGradient: function(entries){
			// summary:
			//		Creates a gradient object
			// entries: Array
			//		An array of numbers representing colors
			// returns: Number
			//		The modified color			
			var res = {
				colors: []
			};
			var obj;
			for(var i = 0; i < entries.length; i++){
				if(i % 2 == 0){
					obj = {
						offset: entries[i]
					};
				} else {
					obj.color = entries[i];
					res.colors.push(obj);
				}
			}
			return res;
		},
		
		_setter: function(obj, attributes, values){
			for(var i = 0; i < attributes.length; i++){
				obj[attributes[i]] = values[i];
			}
		},
		
		genericCircularGauge: function(scale, indicator, originX, originY, radius, startAngle, endAngle, orientation, font, labelPosition, tickShapeFunc){
			// summary:
			//		A helper method for configuring a circular gauge.
			// scale: CircularScale
			//		A circular scale
			// indicator: IndicatorBase
			//		A circular indicator
			// originX: Number
			//		The x-coordinate of the center of the scale (in pixels) 
			// originY: Number
			//		The y-coordinate of the center of the scale (in pixels)
			// radius: Number
			//		The radius of the scale (in pixels)
			// startAngle: Number
			//		The start angle of the scale (in degrees)
			// endAngle: Number
			//		The end angle of the scale (in degrees)
			// orientation: String?
			//		The orientation of the scale, can be "clockwise" or "cclockwise"
			// font: Object?
			//		The font used for the gauge
			// labelPosition: String?
			//		The position of the labels regarding   
			// tickShapeFunc: Object?
			//		A drawing function for the ticks
			// returns: Number
			//		The modified color	
			var attributes = ["originX", "originY", "radius", "startAngle", "endAngle", "orientation", "font", "labelPosition", "tickShapeFunc"];
			if(!orientation){
				orientation = "clockwise";
			}
			if(!font){
				font = {
					family: "Helvetica",
					style: "normal",
					size: "10pt",
					color: "#555555"
				};
			}
			if(!labelPosition){
				labelPosition = "inside";
			}
			if(!tickShapeFunc){
				tickShapeFunc = function(group, scale, tick){
					var stroke = scale.tickStroke;
					var majorStroke;
					var minorStroke;
					if(stroke){
						majorStroke = {color:stroke.color ? stroke.color : "#000000", width:stroke.width ? stroke.width : 0.5};
						var col = new Color(stroke.color).toRgb();
						minorStroke = {color:stroke.color ? utils.brightness({r:col[0], g:col[1], b:col[2]},51) : "#000000", width:stroke.width ? stroke.width * 0.6 : 0.3};
					}
					return group.createLine({
						x1: tick.isMinor ? 2 : 0,
						y1: 0,
						x2: tick.isMinor ? 8 : 10,
						y2: 0
					}).setStroke(tick.isMinor ? minorStroke : majorStroke);
				};
			}
			
			this._setter(scale, attributes, [originX, originY, radius, startAngle, endAngle, orientation, font, labelPosition, tickShapeFunc]);
			
			indicator.set("interactionArea", "gauge");
			// Needle shape
			indicator.set("indicatorShapeFunc", function(group, indicator){
				return group.createPolyline([0, -5, indicator.scale.radius - 6, 0, 0, 5, 0, -5]).setStroke({
					color: "#333333",
					width: 0.25
				}).setFill(scale._gauge.indicatorColor);
			});
		}
	});

	return utils;
});
