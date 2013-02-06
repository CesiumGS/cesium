define(["dojo/_base/declare","./AnalogIndicatorBase"],
  function(declare, AnalogIndicatorBase) {

return declare("dojox.gauges.AnalogCircleIndicator", [AnalogIndicatorBase], {
	// summary:
	//		An indicator for the AnalogGauge that draws a circle. The center of the circle is positioned
	//		on the circular gauge according to the value of the indicator. The circle has for radius the 
	//		length of the indicator. This indicator is mainly used to draw round ticks for the scale.
	
	
	_getShapes: function(group){
		// summary:
		//		Override of dojox.gauges.AnalogLineIndicator._getShapes
		var color = this.color ? this.color : 'black';
		var strokeColor = this.strokeColor ? this.strokeColor : color;
		var stroke = {
			color: strokeColor,
			width: 1
		};
		if (this.color.type && !this.strokeColor){
			stroke.color = this.color.colors[0].color;
		}
		
		return [group.createCircle({
			cx: 0,
			cy: -this.offset,
			r: this.length
		}).setFill(color).setStroke(stroke)];
	}
});
});
