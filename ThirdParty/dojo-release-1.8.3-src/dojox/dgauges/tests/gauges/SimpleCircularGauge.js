define(["dojo/_base/lang", "dojo/_base/declare", "dojox/dgauges/CircularGauge", "dojox/dgauges/LinearScaler",
	"dojox/dgauges/CircularScale", "dojox/dgauges/CircularValueIndicator", "dojox/dgauges/CircularRangeIndicator",
	"dojox/dgauges/TextIndicator"],
	function(lang, declare, CircularGauge, LinearScaler, CircularScale, CircularValueIndicator, CircularRangeIndicator,
		 TextIndicator){
	return declare("dojox.dgauges.tests.gauges.SimpleCircularGauge", CircularGauge, {
		constructor: function(){
			// Changes the font
			this.font = {
				family: "Helvetica",
				style: "normal",
				size: "10pt",
				color: "white"
			};
			
			// Draws the background
			this.addElement("background", function(g){
				g.createEllipse({
					cx: 100,
					cy: 100,
					rx: 100,
					ry: 100
				}).setFill("#444444");
			});
			
			// The scaler
			var scaler = new LinearScaler({
				minimum: -100,
				maximum: 100,
				majorTickInterval: 20,
				minorTickInterval: 5
			});
			
			// The scale
			var scale = new CircularScale({
				scaler: scaler,
				originX: 100,
				originY: 100,
				startAngle: 110,
				endAngle: 70,
				radius: 75,
				labelPosition: "outside",
				tickShapeFunc: function(group, scale, tick){
					return group.createLine({
						x1: tick.isMinor ? 2 : 0,
						y1: 0,
						x2: tick.isMinor ? 8 : 12,
						y2: 0
					}).setStroke({
						color: tick.isMinor ? "black" : "white",
						width: tick.isMinor ? 0.5 : 1
					})
				}
			});
			this.addElement("scale", scale);
			
			// A value indicator
			var indicator = new CircularValueIndicator({
				interactionArea: "indicator",
				indicatorShapeFunc: function(group){
					return group.createPolyline([20, -6, 60, 0, 20, 6, 20, -6]).setFill("black").setStroke("white");
				},
				value: 50
			});
			scale.addIndicator("indicator", indicator);
			
			// A green range indicator
			var rangeIndicator = new CircularRangeIndicator({
				start: 0,
				value: 100,
				radius: 62,
				startThickness:10,
				endThickness: 30,
				fill: "green",
				interactionMode: "none"
			});
			scale.addIndicator("rangeIndicator", rangeIndicator, true);
			
			
			// Indicator Text"
			this.addElement("text", new TextIndicator({
				value: "G", x:100, y:100
			}));
		}	
	});
});
