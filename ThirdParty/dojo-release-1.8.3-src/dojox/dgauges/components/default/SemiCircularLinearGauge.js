define([
		"dojo/_base/lang", 
		"dojo/_base/declare", 
		"dojo/_base/Color", 
		"../utils",
		"../../CircularGauge", 
		"../../LinearScaler", 
		"../../CircularScale", 
		"../../CircularValueIndicator", 
		"../../TextIndicator",
		"../DefaultPropertiesMixin"
		], 
	function(lang, declare, Color, utils, CircularGauge, LinearScaler, CircularScale, CircularValueIndicator, TextIndicator, DefaultPropertiesMixin){
	return declare("dojox.dgauges.components.default.SemiCircularLinearGauge", [CircularGauge, DefaultPropertiesMixin], {
		// summary:
		//		A semi circular gauge widget.

		_radius: 88,
		_width: 200,
		_height: 123,
		// borderColor: Object|Array|int
		//		The border color. Default is "#C9DFF2".
		borderColor: "#C9DFF2",
		// fillColor: Object|Array|int
		//		The background color. Default is "#FCFCFF".
		fillColor: "#FCFCFF",
		// indicatorColor: Object|Array|int
		//		The indicator fill color. Default is "#F01E28".
		indicatorColor: "#F01E28",
		constructor: function(){
			
			// Base colors
			this.borderColor = new Color(this.borderColor);
			this.fillColor = new Color(this.fillColor);
			this.indicatorColor = new Color(this.indicatorColor);

			// Draw background
			this.addElement("background", lang.hitch(this, this.drawBackground));
			
			// Scaler
			var scaler = new LinearScaler();
			
			// Scale
			var scale = new CircularScale();
			scale.set("scaler", scaler);
			this.addElement("scale", scale);
			
			// Value indicator
			var indicator = new CircularValueIndicator();
			scale.addIndicator("indicator", indicator);
			
			// Gauge Foreground (needle cap)
			this.addElement("foreground", lang.hitch(this, this.drawForeground));
			
			// Indicator Text Border
			this.addElement("indicatorTextBorder", lang.hitch(this, this.drawTextBorder), "leading");
			
			// Indicator Text
			var indicatorText = new TextIndicator();
			indicatorText.set("indicator", indicator);
			indicatorText.set("x", 100);
			indicatorText.set("y", 115);
			this.addElement("indicatorText", indicatorText);			
			
			utils.genericCircularGauge(scale, indicator, this._width / 2, 0.76 * this._height, this._radius, 166, 14, null, null, "inside");
		},
		
		drawBackground: function(g){
			// summary:
			//		Draws the background shape of the gauge.
			// g: dojox/gfx/Group
			//		The group used to draw the background. 
			// tags:
			//		protected
			var w = this._width;
			var h = this._height;
			var gap = 0;
			var cr = 3;
			var entries = utils.createGradient([0, utils.brightness(this.borderColor, -20), 0.1, utils.brightness(this.borderColor, -40)]);
			g.createRect({
				x: 0,
				y: 0,
				width: w,
				height: h,
				r: cr
			}).setFill(lang.mixin({
				type: "linear",
				x1: 0,
				y1: 0,
				x2: w,
				y2: h
			}, entries)).setStroke({
				color: "#A5A5A5",
				width: 0.2
			});
			entries = utils.createGradient([0, utils.brightness(this.borderColor, 70), 1, utils.brightness(this.borderColor, -50)]);
			gap = 4;
			cr = 2
			g.createRect({
				x: gap,
				y: gap,
				width: w - 2 * gap,
				height: h - 2 * gap,
				r: cr
			}).setFill(lang.mixin({
				type: "linear",
				x1: 0,
				y1: 0,
				x2: w,
				y2: h
			}, entries));
			gap = 6;
			cr = 1
			entries = utils.createGradient([0, utils.brightness(this.borderColor, 60), 1, utils.brightness(this.borderColor, -40)]);
			g.createRect({
				x: gap,
				y: gap,
				width: w - 2 * gap,
				height: h - 2 * gap,
				r: cr
			}).setFill(lang.mixin({
				type: "linear",
				x1: 0,
				y1: 0,
				x2: w,
				y2: h
			}, entries));
			
			gap = 7;
			cr = 0
			entries = utils.createGradient([0, utils.brightness(this.borderColor, 70), 1, utils.brightness(this.borderColor, -40)]);
			g.createRect({
				x: gap,
				y: gap,
				width: w - 2 * gap,
				height: h - 2 * gap,
				r: cr
			}).setFill(lang.mixin({
				type: "linear",
				x1: w,
				y1: 0,
				x2: 0,
				y2: h
			}, entries));
			gap = 5;
			cr = 0			
			entries = utils.createGradient([0, [255, 255, 255, 220], 0.8, utils.brightness(this.fillColor, -5), 1, utils.brightness(this.fillColor, -30)]);
			g.createRect({
				x: gap,
				y: gap,
				width: w - 2 * gap,
				height: h - 2 * gap,
				r: cr
			}).setFill(lang.mixin({
				type: "radial",
				cx: w/2,
				cy: h/2,
				r: h
			}, entries)).setStroke({
				color: utils.brightness(this.fillColor, -40),
				width: 0.4
			});
			
		},
		
		drawForeground: function(g){
			// summary:
			//		Draws the foreground shape of the gauge.
			// g: dojox/gfx/Group
			//		The group used to draw the foreground. 
			// tags:
			//		protected
			var r = 0.07 * this._radius;
			var entries = utils.createGradient([0, this.borderColor, 1, utils.brightness(this.borderColor, -20)]);
			g.createEllipse({
				cx: this._width / 2,
				cy: 0.76 * this._height,
				rx: r,
				ry: r
			}).setFill(lang.mixin({
				type: "radial",
				cx: this._width / 2 - 5,
				cy: this._height * 0.76 - 5,
				r: r
			}, entries)).setStroke({
				color: utils.brightness(this.fillColor, -50),
				width: 0.4
			});
		},
		
		drawTextBorder: function(g){
			// summary:
			//		Internal method.
			// tags:
			//		private
			return g.createRect({
				x: this._width / 2 - 12,
				y: this._height - 20,
				width: 24,
				height: 14
			}).setStroke({
				color: utils.brightness(this.fillColor, -20),
				width: 0.3
			});
		}
	});
});

