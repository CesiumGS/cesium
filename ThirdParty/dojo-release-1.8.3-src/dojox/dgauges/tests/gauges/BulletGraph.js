define(["dojo/_base/declare", "dojox/dgauges/RectangularGauge", "dojox/dgauges/LinearScaler",
	"dojox/dgauges/RectangularScale", "dojox/dgauges/RectangularValueIndicator",
	"dojox/dgauges/RectangularRangeIndicator", "dojox/color"],
	function(declare, RectangularGauge, LinearScaler, RectangularScale, RectangularValueIndicator,
			 RectangularRangeIndicator, color){
	return declare("dojox.dgauges.tests.gauges.BulletGraph", RectangularGauge, {
		target: 50,
		high: 100,
		value: 50,
		medium: 75,
		low: 50,

		constructor: function(){
			var scaler = new LinearScaler({
				maximum: this.high
			});
			this._scale = new RectangularScale({
				scaler: scaler,
				labelPosition: "trailing",
				paddingTop: 30,
				paddingBottom: 23
			});
			this.addElement("scale", this._scale);

			var high = new RectangularRangeIndicator({
				start: 0,
				value: this.high,
				interactionMode: "none",
				fill: color.fromHsv(0, 0, 90),
				stroke: null,
				paddingTop: 0,
				startThickness: 30,
				endThickness: 30
			});
			this._scale.addIndicator("high", high);

			var medium = new RectangularRangeIndicator({
				start: 0,
				value: this.medium,
				interactionMode: "none",
				fill: color.fromHsv(0, 0, 60),
				stroke: null,
				paddingTop: 0,
				startThickness: 30,
				endThickness: 30
			});
			this._scale.addIndicator("medium", medium);

			var low = new RectangularRangeIndicator({
				start: 0,
				value: this.low,
				interactionMode: "none",
				fill: color.fromHsv(0, 0, 40),
				stroke: null,
				paddingTop: 0,
				startThickness: 30,
				endThickness: 30
			});
			this._scale.addIndicator("low", low);

			var measure = new RectangularRangeIndicator({
				start: 0,
				value: this.value,
				interactionMode: "none",
				fill: [0, 0, 0],
				stroke: null,
				paddingTop: 10,
				startThickness: 10,
				endThickness: 10
			});
			this._scale.addIndicator("measure", measure);

			var target = new RectangularValueIndicator({
				paddingTop: 7,
				interactionMode: "none",
				value: this.target
			});
			
			target.indicatorShapeFunc = function(group){
				return group.createLine({
					x1: 0,
					y1: 0,
					x2: 0,
					y2: 16
				}).setStroke({
					color: "black",
					width: 3
				}).setFill([250, 0, 0]);
			};

			this._scale.addIndicator("target", target);

			this.addInvalidatingProperties(["target", "value", "low", "medium", "high"]);
		},

		refreshRendering: function(){
			this.inherited(arguments);
			
			this._scale.scaler.set("maximum", this.high);
			this._scale.getIndicator("target").set("value", this.target);
			this._scale.getIndicator("measure").set("value", this.value);
			this._scale.getIndicator("low").set("value", this.low);
			this._scale.getIndicator("medium").set("value", this.medium);
			this._scale.getIndicator("high").set("value", this.high);
		}
	});
});
