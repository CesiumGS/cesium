define(["dojo/_base/declare","./AnalogIndicatorBase"],
  function(declare, AnalogIndicatorBase) {

return declare("dojox.gauges.AnalogLineIndicator", [AnalogIndicatorBase], {
	// summary:
	//		An indicator for the AnalogGauge that draws a segment of line that has for length the length of the indicator
	//		and that starts at an offset from the center of the gauge. The line is drawn on the angle that corresponds
	//		to the value of the indicator.

	_getShapes: function(/*dojox.gfx.Group*/ group){
		// summary:
		//		Private function for generating the shapes for this indicator. An indicator that behaves the 
		//		same might override this one and simply replace the shapes (such as ArrowIndicator).
		var direction = this.direction;
		var length = this.length;
		if (direction == 'inside')
			length = - length;
		
		return [group.createLine({x1: 0, y1: -this.offset, x2: 0, y2: -length-this.offset})
					.setStroke({color: this.color, width: this.width})];
	}
	
});

});