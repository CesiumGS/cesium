define(["dojo/_base/declare","./AnalogIndicatorBase"],
  function(declare, AnalogIndicatorBase) { 

return declare("dojox.gauges.AnalogNeedleIndicator", [AnalogIndicatorBase], {
	// summary:
	//		An indicator for the AnalogGauge that draws a needle. The needle is drawn on the angle that corresponds
	//		to the value of the indicator.
	
	_getShapes: function(group){
		// summary:
		//		Override of dojox.gauges.AnalogLineIndicator._getShapes
		if(!this._gauge){
			return null;
		}
		var x = Math.floor(this.width/2);
		var shapes = [];
		
		var color = this.color ? this.color : 'black';
		var strokeColor = this.strokeColor ? this.strokeColor : color;
		var strokeWidth = this.strokeWidth ? this.strokeWidth : 1;

		var stroke = {
			color: strokeColor,
			width: strokeWidth
		};
		
		if (color.type && !this.strokeColor){
			stroke.color = color.colors[0].color;
		}

		var xy = (Math.sqrt(2) * (x));
		shapes[0] = group.createPath()
					.setStroke(stroke).setFill(color)
					.moveTo(xy, -xy).arcTo((2*x), (2*x), 0, 0, 0, -xy, -xy)
					.lineTo(0, -this.length).closePath();
		shapes[1] = group.createCircle({cx: 0, cy: 0, r: this.width})
					.setStroke(stroke)
					.setFill(color);
		return shapes;
	}
});
});
