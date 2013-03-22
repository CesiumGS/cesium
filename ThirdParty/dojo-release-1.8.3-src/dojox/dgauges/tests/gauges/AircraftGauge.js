define(["dojo/_base/lang", "dojo/_base/declare", "dojox/dgauges/CircularGauge", "dojox/dgauges/LinearScaler",
	"dojox/dgauges/CircularScale", "dojox/dgauges/CircularValueIndicator", "dojox/dgauges/CircularRangeIndicator",
	"dojox/dgauges/TextIndicator"],
	function(lang, declare, CircularGauge, LinearScaler, CircularScale, CircularValueIndicator, CircularRangeIndicator,
		 TextIndicator){
	return declare("dojox.dgauges.tests.gauges.AircraftGauge", CircularGauge, {
		_radius: 100,
		constructor: function(){
			this.font = {
				family: "Helvetica",
				style: "normal",
				size: "10pt",
				color: "#EFEFEF"
			};
			
			// Draws a triangle, used by 2 indicators
			var sharedIndicatorShapeFunc = function(group){
				return group.createPolyline([40, -6, 60, 0, 40, 6, 40, -6]).setFill("#EFEFEF");
			};
			
			// Draws the background
			this.addElement("background", lang.hitch(this, this.drawBackground));
			
			// The left scaler
			var scaler = new LinearScaler({
				minimum: 10,
				maximum: 40,
				majorTickInterval: 5,
				minorTickInterval: 1
			});
			
			// The left scale
			var scale = new CircularScale({
				scaler: scaler,
				originX: 100,
				originY: 100,
				startAngle: 110,
				endAngle: 250,
				radius: 70,
				labelPosition: "outside",
				tickShapeFunc: function(group, scale, tick){
					return group.createLine({
						x1: tick.isMinor ? 2 : 0,
						y1: 0,
						x2: tick.isMinor ? 8 : 12,
						y2: 0
					}).setStroke({
						color: "#EFEFEF",
						width: tick.isMinor ? 1 : 1
					})
				}
			});
			this.addElement("scale", scale);
			
			// The left value indicator
			var indicator = new CircularValueIndicator({
				interactionArea: "indicator",
				indicatorShapeFunc: sharedIndicatorShapeFunc,
				value: 27
			});
			scale.addIndicator("indicator", indicator);
			
			// The left range indicator (green)
			var rangeIndicator = new CircularRangeIndicator({
				start: 15,
				value: 23,
				radius: 68,
				fill: "#0BCD2F",
				interactionMode: "none"
			});
			scale.addIndicator("rangeIndicator", rangeIndicator, true);
			
			// The right scaler		
			var scaler2 = new LinearScaler({
				minimum: 0,
				maximum: 10,
				majorTickInterval: 1,
				minorTickInterval: 0.5
			});
			
			// The right scale
			var scale2 = new CircularScale({
				scaler: scaler2,
				originX: 100,
				originY: 100,
				startAngle: 70,
				endAngle: 290,
				orientation: "cclockwise",
				radius: 70,
				labelPosition: "outside",
				tickShapeFunc: function(group, scale, tick){
					var x1, x2, color, width = 1;
					// Strong red tick
					if (tick.value == 0.5 || tick.value == 8){
						x1 = -2;
						x2 = 14;
						color = "#FB0F00";
						width = 2;
					}else if(tick.isMinor){
						// minor ticks
						x1 = 2;
						x2 = 8;
							color = "#EFEFEF";
					}else{
						// Major tick
						x1 = 0;
						x2 = 12;
						color = "#EFEFEF";
					}
					
					return group.createLine({
						x1: x1,
						y1: 0,
						x2: x2,
						y2: 0
					}).setStroke({
						color: color,
						width: width
					})
				},
				// Label filter
				tickLabelFunc: function(tick){
					return (tick.value % 2) == 0 ? (tick.value).toString() : ""
				}
			});
			this.addElement("scale2", scale2);
			
			// The right value indicator
			var indicator2 = new CircularValueIndicator({
				interactionArea: "indicator",
				indicatorShapeFunc: sharedIndicatorShapeFunc,
				value: 8
			});
			scale2.addIndicator("indicator2", indicator2);
			
			// The right range indicator (green)
			var rangeIndicator2 = new CircularRangeIndicator({
				start: 0.5,
				value: 8,
				radius: 68,
				fill: "#0BCD2F",
				interactionMode: "none"
			});
			scale2.addIndicator("rangeIndicator2", rangeIndicator2, true);
			
			// Indicator Text: "MAN"
			this.addElement("text1", this._createText("MAN", 97, 90, 9, "end"));
			
			// Indicator Text: "PRESS"
			this.addElement("text2", this._createText("PRESS", 97, 100, 9, "end"));
			
			// Indicator Text: "IN HG"
			this.addElement("text3", this._createText("IN HG", 97, 113, 8, "end"));
			
			// Indicator Text: "FUEL
			this.addElement("text4", this._createText("FUEL", 103, 90, 9, "start"));
			
			// Indicator Text: "PRESS"
			this.addElement("text5", this._createText("PRESS", 103, 100, 9, "start"));
			
			// Indicator Text: "PSI"
			this.addElement("text6", this._createText("PSI", 103, 113, 8, "start"));
		},
		_createText: function(text, x, y, size, align){
			return new TextIndicator({
				value: text,
				x: x,
				y: y,
				color: "white",
				font: {
					family: "Helvetica",
					size: size
				},
				align: align
			});
		},
		
		drawBackground: function(g){
			var r = this._radius;
			var w = 2 * r;
			var h = w;
			g.createEllipse({
				cx: r,
				cy: r,
				rx: r,
				ry: r
			}).setFill("#000000");
			
			g.createEllipse({
				cx: r,
				cy: r,
				rx: r * 0.99,
				ry: r * 0.99
			}).setFill("#505050");
			
			g.createEllipse({
				cx: r,
				cy: r,
				rx: r * 0.92,
				ry: r * 0.92
			}).setFill("#333333").setStroke({
				color: "#000000",
				width: 0.5
			});
			
			g.createRect({
				x: 99,
				y: 20,
				width: 4,
				height: 50
			}).setFill("#EFEFEF");
			
			g.createRect({
				x: 99,
				y: 130,
				width: 4,
				height: 50
			}).setFill("#EFEFEF");
		}
	});
});
