define([
		"dojo/_base/lang", 
		"dojo/_base/declare",
		"dojo/_base/Color",
		"../../RectangularGauge", 
		"../../LinearScaler", 
		"../../RectangularScale", 
		"../../RectangularValueIndicator",
		"../DefaultPropertiesMixin"
	], 
	function(lang, declare, Color, RectangularGauge, LinearScaler, RectangularScale, RectangularValueIndicator, DefaultPropertiesMixin){
		return declare("dojox.dgauges.components.grey.HorizontalLinearGauge", [RectangularGauge, DefaultPropertiesMixin], {
			// summary:
			//		A horizontal gauge widget.

			// borderColor: Object|Array|int
			//		The border color. Default is "#9498A1".
			borderColor: [148,152,161],
			// fillColor: Object|Array|int
			//		The background color. Default is "#9498A1".
			fillColor: [148,152,161],
			// indicatorColor: Object|Array|int
			//		The indicator fill color. Default is "#3F3F3F".
			indicatorColor: [63,63,63],
			constructor: function(){
				// Base colors
				this.borderColor = new Color(this.borderColor);
				this.fillColor = new Color(this.fillColor);
				this.indicatorColor = new Color(this.indicatorColor);

				this.addElement("background", lang.hitch(this, this.drawBackground));

				// Scaler
				var scaler = new LinearScaler();
				
				// Scale
				var scale = new RectangularScale();
				scale.set("scaler", scaler);
				scale.set("labelPosition", "leading");
				scale.set("paddingLeft", 30);
				scale.set("paddingRight", 30);
				scale.set("paddingTop", 28);
				scale.set("labelGap", 8);
				scale.set("font", {
					family: "Helvetica",
					weight: "bold",
					size: "7pt"
				});
				this.addElement("scale", scale);
				
				var indicator = new RectangularValueIndicator();
				indicator.set("interactionArea", "gauge");
				indicator.set("value", scaler.minimum);
				indicator.set("paddingTop", 32);
				indicator.set("indicatorShapeFunc", lang.hitch(this, function(group, indicator){

					return group.createPolyline([0, 0, -10, -20, 10, -20, 0, 0]).setFill(this.indicatorColor).setStroke({
						color: [70, 70, 70],
						width: 1,
						style: "Solid",
						cap: "butt",
						join: 20.0
					});

				}));
				scale.addIndicator("indicator", indicator);
			},

			drawBackground: function(g, w, h){
				// summary:
				//		Draws the background shape of the gauge.
				// g: dojox/gfx/Group
				//		The group used to draw the background. 
				// w: Number
				//		The width of the gauge.
				// h: Number
				//		The height of the gauge.
				// tags:
				//		protected
				g.createRect({
					x: 0,
					y: 0,
					width: w,
					height: 50,
					r: 13.5
				}).setFill(this.borderColor);
				g.createRect({
					x: 2,
					y: 2,
					width: w - 4,
					height: 46,
					r: 11.5
				}).setFill({
					type: "linear",
					x1: 0,
					y1: -2,
					x2: 0,
					y2: 60,
					colors: [
						{offset: 0, color: this.fillColor},
						{offset: 1, color: "white"}
					]
				});
				g.createPath().moveTo(2, 25).vLineTo(12).smoothCurveTo(2, 2, 16, 2).hLineTo(w - 12).smoothCurveTo(w - 2, 2, w - 2, 16).closePath().setFill({
					type: "linear",
					x1: 0,
					y1: -5,
					x2: 0,
					y2: 40,
					colors: [
						{offset: 0, color: "white"},
						{offset: 1, color: this.fillColor}
					]
				});
			}
		});
	}
);

