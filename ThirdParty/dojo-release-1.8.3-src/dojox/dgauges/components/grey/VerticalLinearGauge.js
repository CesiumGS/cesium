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
		return declare("dojox.dgauges.components.grey.VerticalLinearGauge", [RectangularGauge, DefaultPropertiesMixin], {
			// summary:
			//		A vertical gauge widget.

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
				this.orientation = "vertical";
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
				scale.set("labelPosition", "trailing");
				scale.set("paddingTop", 30);
				scale.set("paddingBottom", 30);
				scale.set("paddingLeft", 15);
				scale.set("labelGap", 4);
				scale.set("font", {
					family: "Helvetica",
					weight: "bold",
					size: "7pt"
				});
				this.addElement("scale", scale);
				
				var indicator = new RectangularValueIndicator();
				indicator.set("interactionArea", "gauge");
				indicator.set("value", scaler.minimum);
				indicator.set("paddingLeft", 22);
				indicator.set("indicatorShapeFunc", lang.hitch(this, function(group){
					
					group.createPath().moveTo(0, 0).lineTo(-10, -20).lineTo(10, -20).lineTo(0, 0).closePath().setFill(this.indicatorColor);
					return group;

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
					width: 50,
					height: h,
					r: 13.5
				}).setFill(this.borderColor);
				g.createRect({
					x: 2,
					y: 2,
					width: 46,
					height: h - 4,
					r: 11.5
				}).setFill({
					type: "linear",
					x1: -2,
					y1: 0,
					x2: 60,
					y2: 0,
					colors: [
						{offset: 0, color: "white"},
						{offset: 1, color: this.fillColor}
					]
				});
				g.createPath().moveTo(25, 2).hLineTo(38).smoothCurveTo(48, 2, 48, 18).vLineTo(h - 16).smoothCurveTo(48, h - 2, 38, h - 2).closePath().setFill({
					type: "linear",
					x1: -10,
					y1: 0,
					x2: 60,
					y2: 0,
					colors: [
						{offset: 0, color: this.fillColor},
						{offset: 1, color: "white"}
					]
				});
			}

		});
	}
);

