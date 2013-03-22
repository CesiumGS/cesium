define(["dojo/_base/declare","./_Indicator"],
  function(declare, Indicator) {

return declare("dojox.gauges.TextIndicator", [Indicator], {
	// summary:
	//		A gauge indicator the simply draws its value as text.
	
	
	// x: Number
	//		The x coordinate of the indicator
	x: 0,
	
	// y: Number
	//		The y coordinate of the indicator
	y: 0,
	
	// align: String
	//		The horizontal alignment of the text, the value can be 'middle' (the default), 'left' or 'right'
	align: 'middle',
	
	// fixedPrecision: Boolean
	//		Indicates that the number is displayed in fixed precision or not (precision is defined by the 'precision' property (default is true).
	fixedPrecision: true,
	
	// precision: Number
	//		The number of tailing digits to display the value of the indicator when the 'fixedPrecision' property is set to true (default is 0).
	precision: 0,
	
	draw: function(group, /*Boolean?*/ dontAnimate){
		// summary:
		//		Override of dojox.gauges._Indicator.draw
		var v = this.value;
		
		if (v < this._gauge.min) {
			v = this._gauge.min;
		}
		if (v > this._gauge.max) {
			v = this._gauge.max;
		}
		var txt;
		var NumberUtils = this._gauge ? this._gauge._getNumberModule() : null;
		if (NumberUtils) {
			txt = this.fixedPrecision ? NumberUtils.format(v, {
				places: this.precision
			}) : NumberUtils.format(v);
		} else {
			txt = this.fixedPrecision ? v.toFixed(this.precision) : v.toString();
		}
		
		var x = this.x ? this.x : 0;
		var y = this.y ? this.y : 0;
		var align = this.align ? this.align : "middle";
		if(!this.shape){
			this.shape = group.createText({
				x: x,
				y: y,
				text: txt,
				align: align
			});
		}else{
			this.shape.setShape({
				x: x,
				y: y,
				text: txt,
				align: align
			});
		}
		this.shape.setFill(this.color);
		if (this.font) this.shape.setFont(this.font);
		
	}
	
});
});
