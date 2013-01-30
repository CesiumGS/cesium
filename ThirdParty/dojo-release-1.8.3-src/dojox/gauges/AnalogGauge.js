define(["dojo/_base/kernel","dojo/_base/declare","dojo/_base/array","dojo/_base/lang","dojo/_base/html","dojo/_base/event",
		"dojox/gfx", "./_Gauge","./AnalogLineIndicator", "dojo/dom-geometry"],
	function(dojo, declare, arr, lang, html, event, 
			gfx, Gauge, AnalogLineIndicator, domGeometry) {

return declare("dojox.gauges.AnalogGauge",Gauge,{
	// summary:
	//		a gauge built using the dojox.gfx package.
	//
	// description:
	//		using dojo.gfx (and thus either SVG or VML based on what is supported), this widget
	//		builds a gauge component, used to display numerical data in a familiar format 
	//
	// example:
	//	|	<script type="text/javascript">
	//	|		require(["dojox/gauges/AnalogGauge"]);
	//	|	</script>
	//	|
	//	|	<div	dojoType="dojox.gauges.AnalogGauge"
	//	|			id="testGauge"
	//	|			width="300"
	//	|			height="200"
	//	|			cx=150
	//	|			cy=175
	//	|			radius=125
	//	|			image="gaugeOverlay.png"
	//	|			imageOverlay="false"
	//	|			imageWidth="280"
	//	|			imageHeight="155"
	//	|			imageX="12"
	//	|			imageY="38">
	//	|	</div>

	// startAngle: Number
	//		angle (in degrees) for start of gauge (default is -90)
	startAngle: -90,

	// endAngle: Number
	//		angle (in degrees) for end of gauge (default is 90)
	endAngle: 90,

	// cx: Number
	//		center of gauge x coordinate (default is gauge width / 2)
	cx: 0,

	// cy: Number
	//		center of gauge x coordinate (default is gauge height / 2)
	cy: 0,

	// radius: Number
	//		radius of gauge (default is smaller of cx-25 or cy-25)
	radius: 0,
	
	// orientation: String
	//		The orientation of the gauge. The value can be 'clockwise' or 'cclockwise' (default is 'clockwise')
	orientation: "clockwise",

	// _defaultIndicator: dojox.gauges._Indicator
	//		override of dojox.gauges._Gauge._defaultIndicator
	_defaultIndicator: AnalogLineIndicator,

	startup: function(){
		// handle settings from HTML by making sure all the options are
		// converted correctly to numbers and that we calculate defaults
		// for cx, cy and radius
		// also connects mouse handling events

		if(this.getChildren){
			arr.forEach(this.getChildren(), function(child){ child.startup(); });
		}

		this.startAngle = Number(this.startAngle);
		this.endAngle = Number(this.endAngle);

		this.cx = Number(this.cx);
		if(!this.cx){this.cx = this.width/2;}
		this.cy = Number(this.cy);
		if(!this.cy){this.cy = this.height/2;}
		this.radius = Number(this.radius);
		if(!this.radius){this.radius = Math.min(this.cx,this.cy) - 25;}
	

		this.inherited(arguments);
	},

	_getAngle: function(/*Number*/value){
		// summary:
		//		This is a helper function used to determine the angle that represents
		//		a given value on the gauge
		// value:	Number
		//		A value to be converted to an angle for this gauge.
		
		var v = Number(value);
		var angle;
		if (value == null || isNaN(v) || v <= this.min) 
			angle = this._mod360(this.startAngle);
		else
			if (v >= this.max) 
				angle = this._mod360(this.endAngle);
			else {
				var startAngle = this._mod360(this.startAngle);
				var relativeValue = (v - this.min);
				if (this.orientation != 'clockwise') 
					relativeValue = -relativeValue;

				angle = this._mod360(startAngle + this._getAngleRange() * relativeValue / Math.abs(this.min - this.max));
			}

		return angle;
	},

	_getValueForAngle: function(/*Number*/angle){
		// summary:
		//		This is a helper function used to determine the value represented by a
		//		given angle on the gauge
		// angle:	Number
		//		A angle to be converted to a value for this gauge.
		var startAngle = this._mod360(this.startAngle);
		var endAngle = this._mod360(this.endAngle);

		if (!this._angleInRange(angle)){

			var min1 = this._mod360(startAngle - angle);
			var min2 = 360 - min1;
			var max1 = this._mod360(endAngle - angle);
			var max2 = 360 - max1;
			if (Math.min(min1, min2) < Math.min(max1, max2)) 
				return this.min;
			else 
				return this.max;
		}
		else {
			var range = Math.abs(this.max - this.min);
			var relativeAngle = this._mod360(this.orientation == 'clockwise' ?
				(angle - startAngle): (-angle + startAngle));
			return this.min + range * relativeAngle / this._getAngleRange();
		}
	},

	_getAngleRange: function(){
		// summary:
		//		This is a helper function that returns the angle range
		//		from startAngle to endAngle according to orientation.
		var range;
		var startAngle = this._mod360(this.startAngle);
		var endAngle = this._mod360(this.endAngle);
		if (startAngle == endAngle) 
			return 360;
		if (this.orientation == 'clockwise'){
			if (endAngle < startAngle) 
				range = 360 - (startAngle - endAngle);
			else 
				range = endAngle - startAngle;
		}
		else {
			if (endAngle < startAngle) 
				range = startAngle - endAngle;
			else 
				range = 360 - (endAngle - startAngle); 
		}
		return range;
	},
	
	_angleInRange: function(value){
		// summary:
		//		Test if the angle value is in the startAngle/endAngle range
		var startAngle = this._mod360(this.startAngle);
		var endAngle = this._mod360(this.endAngle);
		if (startAngle == endAngle) 
			return true;
			value = this._mod360(value);
		if (this.orientation == "clockwise"){
			if (startAngle < endAngle) 
				return value >= startAngle && value <= endAngle;
			else 
				return !(value > endAngle && value < startAngle);
		}
		else {
			if (startAngle < endAngle) 
				return !(value > startAngle && value < endAngle);
			else 
				return value >= endAngle && value <= startAngle;
		}
	},
	
	_isScaleCircular: function(){
		// summary:
		//		internal method to check if the scale is fully circular
		return (this._mod360(this.startAngle) == this._mod360(this.endAngle));
	},
	
	_mod360:function(v){
		// summary:
		//		returns the angle between 0 and 360;
		while (v>360) v = v - 360;
		while (v<0) v = v + 360;
		return v;
	},

	_getRadians: function(/*Number*/angle){
		// summary:
		//		This is a helper function than converts degrees to radians
		// angle:	Number
		//		An angle, in degrees, to be converted to radians.
		return angle*Math.PI/180;
	},

	_getDegrees: function(/*Number*/radians){
		// summary:
		//		This is a helper function that converts radians to degrees
		// radians:	Number
		//		An angle, in radians, to be converted to degrees.
		return radians*180/Math.PI;
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
		//		A range is a dojox.gauges.Range or an object
		//		with similar parameters (low, high, hover, etc.).
		var path;
		if(range.shape){
			range.shape.parent.remove(range.shape);
			range.shape = null;
		}
		var a1, a2;
		if((range.low == this.min) && (range.high == this.max) && ((this._mod360(this.endAngle) == this._mod360(this.startAngle)))){
			path = group.createCircle({cx: this.cx, cy: this.cy, r: this.radius});
		}else{
			
			
			a1 = this._getRadians(this._getAngle(range.low));
			a2 = this._getRadians(this._getAngle(range.high));
			if (this.orientation == 'cclockwise')
			{
				var a = a2;
				a2 = a1;
				a1 = a;
			}
			
			var x1=this.cx+this.radius*Math.sin(a1),
				y1=this.cy-this.radius*Math.cos(a1),
				x2=this.cx+this.radius*Math.sin(a2),
				y2=this.cy-this.radius*Math.cos(a2),
				big=0
			;
			
			var arange;
			if (a1<=a2)
			   arange = a2-a1;
			else
			   arange = 2*Math.PI-a1+a2;
			if(arange>Math.PI){big=1;}
			
			path = group.createPath();
			if(range.size){
				path.moveTo(this.cx+(this.radius-range.size)*Math.sin(a1),
							this.cy-(this.radius-range.size)*Math.cos(a1));
			}else{
				path.moveTo(this.cx,this.cy);
			}
			path.lineTo(x1,y1);
			path.arcTo(this.radius,this.radius,0,big,1,x2,y2);
			if(range.size){
				path.lineTo(this.cx+(this.radius-range.size)*Math.sin(a2),
							this.cy-(this.radius-range.size)*Math.cos(a2));
				path.arcTo((this.radius-range.size),(this.radius-range.size),0,big,0,
							this.cx+(this.radius-range.size)*Math.sin(a1),
							this.cy-(this.radius-range.size)*Math.cos(a1));
			}
			path.closePath();
		}

		if(lang.isArray(range.color) || lang.isString(range.color)){
			path.setStroke({color: range.color});
			path.setFill(range.color);
		}else if(range.color.type){
			// Color is a gradient
			a1 = this._getRadians(this._getAngle(range.low));
			a2 = this._getRadians(this._getAngle(range.high));
			range.color.x1 = this.cx+(this.radius*Math.sin(a1))/2;
			range.color.x2 = this.cx+(this.radius*Math.sin(a2))/2;
			range.color.y1 = this.cy-(this.radius*Math.cos(a1))/2;
			range.color.y2 = this.cy-(this.radius*Math.cos(a2))/2;
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
		// e:	Object
		//		The event object as received by the mouse handling functions below.
		var range = null,
			pos = domGeometry.getContentBox(this.gaugeContent),
			x = e.clientX - pos.x,
			y = e.clientY - pos.y,
			r = Math.sqrt((y - this.cy)*(y - this.cy) + (x - this.cx)*(x - this.cx))
		;
		if(r < this.radius){
			var angle = this._getDegrees(Math.atan2(y - this.cy, x - this.cx) + Math.PI/2),
			//if(angle > this.endAngle){angle = angle - 360;}
				value = this._getValueForAngle(angle)
			;
			if(this._rangeData){
				for(var i=0; (i<this._rangeData.length) && !range; i++){
					if((Number(this._rangeData[i].low) <= value) && (Number(this._rangeData[i].high) >= value)){
						range = this._rangeData[i];
					}
				}
			}
		}
		return range;
	},

	_dragIndicator: function(/*Object*/ widget, /*Object*/ e){
		// summary:
		//		Handles the dragging of an indicator to the event position, including moving/re-drawing
		//		get angle for mouse position
		this._dragIndicatorAt(widget, e.pageX, e.pageY);
		event.stop(e);
	},
		
	_dragIndicatorAt: function(/*Object*/ widget, x,y){
		// summary:
		//		Handles the dragging of an indicator to a specific position, including moving/re-drawing
		//		get angle for mouse position
		var pos = domGeometry.position(widget.gaugeContent, true),
			xf = x - pos.x,
			yf = y - pos.y,
			angle = widget._getDegrees(Math.atan2(yf - widget.cy, xf - widget.cx) + Math.PI/2);
		
		// get value and restrict to our min/max
		var value = widget._getValueForAngle(angle);
		value = Math.min(Math.max(value, widget.min), widget.max);
		// update the indicator
		widget._drag.value = widget._drag.currentValue = value;
		// callback
		widget._drag.onDragMove(widget._drag);
		// rotate indicator
		widget._drag.draw(this._indicatorsGroup, true);
		widget._drag.valueChanged();
	}

});
});
