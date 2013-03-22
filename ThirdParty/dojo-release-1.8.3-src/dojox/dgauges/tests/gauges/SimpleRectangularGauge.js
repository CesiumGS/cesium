define(["dojo/_base/lang", "dojo/_base/declare", "dojox/dgauges/RectangularGauge", "dojox/dgauges/LinearScaler",
	"dojox/dgauges/RectangularScale", "dojox/dgauges/RectangularValueIndicator",
	"dojox/dgauges/RectangularRangeIndicator", "dojox/dgauges/TextIndicator"],
	function(lang, declare, RectangularGauge, LinearScaler, RectangularScale, RectangularValueIndicator,
			 RectangularRangeIndicator, TextIndicator){
	return declare("dojox.dgauges.tests.gauges.SimpleRectangularGauge", RectangularGauge, {
		constructor: function(){
			// Draw background
			this.addElement("background", function(g, w){
				return g.createRect({
					x: 1,
					y: 1,
					width: w - 2,
					height: 50,
					r: 3
				}).setFill("#CBCBCB").setStroke({
					color: "black",
					width: 2
				});
			});
			
			this.addElement("leadingArea", function(g, w){
				return g.createRect({
					x: 1,
					y: 1,
					width: 60,
					height: 50,
					r: 3
				}).setFill("#ABABAB").setStroke({
					color: "black",
					width: 2
				});
			}, "leading");
			
			this.addElement("trailingArea", function(g, w){
				// A spacer to take into account the width of the stroke on the right;
				g.createLine({
					x2: 62
				});
				return g.createRect({
					x: 1,
					y: 1,
					width: 60,
					height: 50,
					r: 3
				}).setFill("#ABABAB").setStroke({
					color: "black",
					width: 2
				});
			}, "trailing");
			
			// Scale
			var scale = new RectangularScale({
				scaler: new LinearScaler({
					minimum: -100
				}),
				labelPosition: "trailing",
				paddingTop: 15
			});
			this.addElement("scale", scale);
			
			// Value indicator
			var indicator = new RectangularValueIndicator();
			indicator.indicatorShapeFunc = lang.hitch(this, function(group){
				group.createPolyline([-5, 0, 5, 0, 0, 10, -5, 0]).setFill("black");
				return group;
			});
			indicator.set("paddingTop", 5);
			indicator.set("interactionArea", "gauge");
			scale.addIndicator("indicator", indicator);
			
			// Indicator Text
			var trailingText = new TextIndicator({
				x: 30,
				y: 30,
				indicator: indicator,
				labelFunc: function(v){
					return v + " °C"
				}
			});
			
			this.addElement("trailingText", trailingText, "trailing");
			var leadingText = new TextIndicator({
				x: 30,
				y: 30,
				indicator: indicator,
				labelFunc: function(v){
					return ((9 / 5) * v + 32).toFixed() + " °F"
				}
			});
			this.addElement("leadingText", leadingText, "leading");
			
			scale.addIndicator("gradientIndicator", new RectangularRangeIndicator({
				start: -100,
				value: 100,
				paddingTop: 15,
				stroke: null,
				fill: {
					type: "linear",
					x1: 0,
					y1: 0,
					x2: 1,
					y2: 0,
					colors: [{
						color: "#7FB2F0",
						offset: 0
					}, {
						color: "#FFFFFF",
						offset: .5
					}, {
						color: "#F03221",
						offset: 1
					}]
				}
			}), true);
			
		}
	});
});
