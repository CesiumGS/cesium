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
		return declare("dojox.dgauges.components.black.VerticalLinearGauge", [RectangularGauge, DefaultPropertiesMixin], {
			// summary:
			//		A vertical gauge widget.

			// borderColor: Object|Array|int
			//		The border color. Default is "#000000".
			borderColor: "#000000",
			// fillColor: Object|Array|int
			//		The background color. Default is "#000000".
			fillColor: "#000000",
			// indicatorColor: Object|Array|int
			//		The indicator fill color. Default is "#A4A4A4".
			indicatorColor: "#A4A4A4",
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
				scale.set("font", {
					family: "Helvetica",
					weight: "bold",
					size: "7pt",
					color: "#CECECE"
				});
				scale.set("tickShapeFunc", function(group, scale, tick){
					return group.createCircle({
						r: tick.isMinor ? 0.5 : 3
					}).setFill("#CECECE");
				});
				this.addElement("scale", scale);
				
				var indicator = new RectangularValueIndicator();
				indicator.set("interactionArea", "gauge");
				indicator.set("value", scaler.minimum);
				indicator.set("paddingLeft", 18);
				indicator.set("indicatorShapeFunc", lang.hitch(this, function(group){
					return group.createPolyline([0, 0, -10, -20, 10, -20, 0, 0]).setFill(this.indicatorColor).setStroke({
						color: [69,69,69],
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
					width: 50,
					height: h,
					r: 15
				}).setFill(this.borderColor);
				g.createRect({
					x: 4,
					y: 4,
					width: 42,
					height: h - 8,
					r: 12
				}).setFill({
					type: "linear",
					x1: 5,
					y1: 0,
					x2: 20,
					y2: 0,
					colors: [
						{offset: 0, color: [100,100,100]},
						{offset: 1, color: this.fillColor}
					]
				});
				g.createPath().moveTo(25, 4).hLineTo(36).smoothCurveTo(46, 4, 46, 18).vLineTo(h - 20).smoothCurveTo(46, h - 4, 36, h - 4).closePath().setFill({
					type: "linear",
					x1: 70,
					y1: 0,
					x2: 25,
					y2: 0,
					colors: [
						{offset: 0, color: [150,150,150]},
						{offset: 1, color: this.fillColor}
					]
				});
				g.createPath().moveTo(25, 4).hLineTo(36).smoothCurveTo(46, 4, 46, 18).vLineTo(h - 20).smoothCurveTo(46, h - 4, 36, h - 4).closePath().setFill([255,255,255,0.05]);
			}

		});
	}
);

