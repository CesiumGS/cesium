define(["dojo/_base/declare","dojo/_base/Color","./BarLineIndicator"],
  function(declare, Color, BarLineIndicator) {

return declare("dojox.gauges.GlossyHorizontalGaugeMarker", [BarLineIndicator], {
	// summary:
	//		The marker for the dojox.gauges.GlossyHorizontalGauge.
	//
	// description:
	//		This object defines the marker for the dojox.gauges.GlossyHorizontalGauge.
	//		Since the needle is created by the gauges class, you do not have to use this class directly.
	
	// interactionMode : String
	//		The interactionMode can have two values : "indicator" (the default) or "gauge".
	//	 	When the value is "indicator", the user must click on the indicator to change the value.
	//		When the value is "gauge", the user can click on the gauge to change the indicator value.
	//		If a gauge contains several indicators with the indicatorMode property set to "gauge", then
	//		only the first indicator will be moved when clicking the gauge.
	interactionMode: "gauge",
	
	// color: String
	//		The color of the indicator.
	color: 'black',
	
	_getShapes: function(group){
		// summary:
		//		Overrides BarLineIndicator._getShapes
		
		if (!this._gauge){
			return null;
		}
		var v = this.value;
		if (v < this._gauge.min){
			v = this._gauge.min;
		}
		if (v > this._gauge.max){
			v = this._gauge.max;
		}
		
		var pos = this._gauge._getPosition(v);
		var shapes = [];
		
		var color = new Color(this.color);
		color.a = .67;
		
		var lighterColor = Color.blendColors(color, new Color('white'), 0.4);
		
		var top = shapes[0] = group.createGroup();
		var scale = this._gauge.height / 100;
		scale = Math.max(scale, .5);
		scale = Math.min(scale, 1);
		
		top.setTransform({
			xx: 1,
			xy: 0,
			yx: 0,
			yy: 1,
			dx: pos,
			dy: 0
		});
		var marker = top.createGroup().setTransform({
			xx: 1,
			xy: 0,
			yx: 0,
			yy: 1,
			dx: -scale * 10,
			dy: this._gauge.dataY + this.offset
		});
		var rescale = marker.createGroup().setTransform({
			xx: scale,
			xy: 0,
			yx: 0,
			yy: scale,
			dx: 0,
			dy: 0
		});
		
		rescale.createRect({
			x: .5,
			y: .0,
			width: 20,
			height: 47,
			r: 6
		}).setFill(color).setStroke(lighterColor);
		rescale.createPath({
			path: 'M 10.106 41 L 10.106 6 C 10.106 2.687 7.419 0 4.106 0 L 0.372 0 C -0.738 6.567 1.022 15.113 1.022 23.917 C 1.022 32.721 2.022 40.667 0.372 47 L 4.106 47 C 7.419 47 10.106 44.314 10.106 41 Z'
		}).setFill(lighterColor).setTransform({
			xx: 1,
			xy: 0,
			yx: 0,
			yy: 1,
			dx: 10.306,
			dy: 0.009
		});
		rescale.createRect({
			x: 9.5,
			y: 1.5,
			width: 2,
			height: 34,
			r: 0.833717
		}).setFill(color).setStroke(this.color);
		rescale.createRect({
			x: 9,
			y: 0,
			width: 3,
			height: 34,
			r: 6
		}).setFill({
			type: "linear",
			x1: 9,
			y1: 0,
			x2: 9,
			y2: 34,
			colors: [{
				offset: 0,
				color: 'white'
			}, {
				offset: 1,
				color: this.color
			}]
		});
		return shapes;
	}
	
});
});