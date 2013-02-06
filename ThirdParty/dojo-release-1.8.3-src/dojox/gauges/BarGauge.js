define(["dojo/_base/declare","dojo/_base/lang","dojo/_base/array","dojo/_base/html","dojo/_base/event","dojox/gfx",
		"./_Gauge","./BarLineIndicator", "dojo/dom-geometry"],
 function(declare, lang, arr, html, event, gfx, Gauge, BarLineIndicator, domGeometry) {

return declare("dojox.gauges.BarGauge", Gauge, {
	// summary:
	//		a bar graph built using the dojox.gfx package.
	//
	// description:
	//		using dojo.gfx (and thus either SVG or VML based on what is supported), this widget
	//		builds a bar graph component, used to display numerical data in a familiar format.
	//
	// example:
	// |	<script type="text/javascript">
	// |		require(["dojox/gauges/BarGauge"]);
	// |	</script>
	// |	...
	// |	<div 	dojoType="dojox.gauges.BarGauge"
	// |		id="testBarGauge"
	// |		barGaugeHeight="55"
	// |		dataY="25"
	// |		dataHeight="25"
	// |		dataWidth="225">
	// |	</div>

	// dataX: Number
	//		x position of data area (default 5)
	dataX: 5,

	// dataY: Number
	//		y position of data area (default 5)
	dataY: 5,

	// dataWidth: Number
	//		width of data area (default is bar graph width - 10)
	dataWidth: 0,

	// dataHeight: Number
	//		height of data area (default is bar graph width - 10)
	dataHeight: 0,

	// _defaultIndicator: Object
	//		override of dojox.gauges._Gauge._defaultIndicator
	_defaultIndicator: BarLineIndicator,

	startup: function(){
		// handle settings from HTML by making sure all the options are
		// converted correctly to numbers 
		//
		// also connects mouse handling events

		if(this.getChildren){
			arr.forEach(this.getChildren(), function(child){ child.startup(); });
		}

		if(!this.dataWidth){this.dataWidth = this.gaugeWidth - 10;}
		if(!this.dataHeight){this.dataHeight = this.gaugeHeight - 10;}

		this.inherited(arguments);
	},

	_getPosition: function(/*Number*/value){
		// summary:
		//		This is a helper function used to determine the position that represents
		//		a given value on the bar graph
		// value: Number
		//		A value to be converted to a position for this bar graph.

		return this.dataX + Math.floor((value - this.min)/(this.max - this.min)*this.dataWidth);
	},

	_getValueForPosition: function(/*Number*/pos){
		// summary:
		//		This is a helper function used to determine the value represented by
		//		a position on the bar graph
		// pos:	Number
		//		A position to be converted to a value.
		return (pos - this.dataX)*(this.max - this.min)/this.dataWidth + this.min;
	},

	drawRange: function(/*dojox.gfx.Group*/ group, /*Object*/range){
		// summary:
		//		This function is used to draw (or redraw) a range
		// description:
		//		Draws a range (colored area on the background of the gauge) 
		//		based on the given arguments.
		// group:
		//		The GFX group where the range must be drawn.
		// range:
		//		A range is either a dojox.gauges.Range or an object
		//		with similar parameters (low, high, hover, etc.).
		if(range.shape){
			range.shape.parent.remove(range.shape);
			range.shape = null;
		}

		var x1 = this._getPosition(range.low);
		var x2 = this._getPosition(range.high);
		var path = group.createRect({
			x: x1,
			y: this.dataY,
			width: x2 - x1,
			height: this.dataHeight
		});	
		if(lang.isArray(range.color) || lang.isString(range.color)){
			path.setStroke({color: range.color});
			path.setFill(range.color);
		}else if(range.color.type){
			// Color is a gradient
			var y = this.dataY + this.dataHeight/2;
			range.color.x1 = x1;
			range.color.x2 = x2;
			range.color.y1 = y;
			range.color.y2 = y;
			path.setFill(range.color);
			path.setStroke({color: range.color.colors[0].color});
		}else if (gfx.svg){
			// We've defined a style rather than an explicit color
			path.setStroke({color: "green"});	// Arbitrary color, just have to indicate
			path.setFill("green");				// that we want it filled
			path.getEventSource().setAttribute("class", range.color.style);
		}
	
		path.connect("onmouseover", lang.hitch(this, this._handleMouseOverRange, range));
		path.connect("onmouseout", lang.hitch(this, this._handleMouseOutRange, range));
	
		range.shape = path;
	},

	getRangeUnderMouse: function(/*Object*/e){
		// summary:
		//		Determines which range the mouse is currently over
		// e: Object
		//		The event object as received by the mouse handling functions below.
		var range = null;
		var pos = domGeometry.getContentBox(this.gaugeContent);
		var x = e.clientX - pos.x;
		var value = this._getValueForPosition(x);
		if(this._rangeData){
			for(var i=0; (i<this._rangeData.length) && !range; i++){
				if((Number(this._rangeData[i].low) <= value) && (Number(this._rangeData[i].high) >= value)){
					range = this._rangeData[i];
				}
			}
		}
		return range;
	},

	_dragIndicator: function(/*Object*/widget, /*Object*/ e){
		// summary:
		//		Handles the dragging of an indicator to the event position, including moving/re-drawing
		//		get angle for mouse position
		this._dragIndicatorAt(widget, e.pageX, e.pageY);
		event.stop(e);
	},
	
	_dragIndicatorAt: function(/*Object*/ widget, x, y){
		
		// summary:
		//		Handles the dragging of an indicator, including moving/re-drawing
		//		get new value based on mouse position
		var pos = domGeometry.position(widget.gaugeContent, true);
		var xl = x - pos.x;
		var value = widget._getValueForPosition(xl);
		if(value < widget.min){value = widget.min;}
		if(value > widget.max){value = widget.max;}
		// update the indicator
		widget._drag.value = value;
		// callback
		widget._drag.onDragMove(widget._drag);
		// redraw/move indicator(s)
		widget._drag.draw(this._indicatorsGroup, true);
		widget._drag.valueChanged();
	}
});
});
