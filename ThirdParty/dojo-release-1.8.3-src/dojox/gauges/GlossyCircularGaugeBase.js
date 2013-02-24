define(["dojo/_base/declare","dojo/_base/lang","dojo/_base/connect","dojox/gfx","./AnalogGauge","./AnalogCircleIndicator","./TextIndicator","./GlossyCircularGaugeNeedle"],
function(declare, lang, connect, gfx, AnalogGauge, AnalogCircleIndicator, TextIndicator, GlossyCircularGaugeNeedle) {

return declare("dojox.gauges.GlossyCircularGaugeBase", [AnalogGauge], {
	// summary:
	//		The base class for GlossyCircularGauge and GlossySemiCircularGauge.
	
	
	//_defaultIndicator : _Indicator
	//		the type of default indicator to create
	_defaultIndicator: AnalogCircleIndicator,
	
	// _needle: dojox.gauges.GlossyCircularGaugeNeedle
	//	 	the needle of this circular gauge
	_needle: null,
	
	// _textIndicator: dojox.gauges.TextIndicator
	//		the text displaying the gauge's value
	_textIndicator: null,
	
	_textIndicatorAdded: false,
	
	// _range: Object
	//		the range of this gauge
	_range: null,
	
	// value: Number
	//		The value of the gauge.
	value: 0,
	
	// color: String
	//		The main color of the gauge.
	color: 'black',
	
	// needleColor: Color
	//		The main color of the needle.
	needleColor: '#c4c4c4',
	
	// textIndicatorFont: String
	//		The font of the text indicator
	textIndicatorFont: "normal normal normal 20pt serif",
	
	// textIndicatorVisible: Boolean
	//		Indicates if the text indicator is visible
	textIndicatorVisible: true,
	
	// textIndicatorColor: Color
	//		 The color of the text indicator
	textIndicatorColor: '#c4c4c4',
	
	// _majorTicksOffset: Number
	//		Distance, at design, from gauge's center to major ticks
	_majorTicksOffset: 130,
	
	// majorTicksInterval: Number
	//		Interval between major ticks
	majorTicksInterval: 10,
	
	// _majorTicksLength: Number
	//		Major tick size, at design
	_majorTicksLength: 5,
	
	// majorTicksColor: Color
	//		Color of major tick marks
	majorTicksColor: '#c4c4c4',
	
	// majorTicksLabelPlacement: String
	//		Placement of major tick labels
	majorTicksLabelPlacement: 'inside',
	
	// _minorTicksOffset: Number
	//		Distance, at design, from gauge's center to minor ticks
	_minorTicksOffset: 130,
	
	// minorTicksInterval: Number
	//		Interval between minor ticks
	minorTicksInterval: 5,
	
	// _minorTicksLength: Number
	//		Minor tick size, at design
	_minorTicksLength: 3,
	
	// minorTicksColor: Color
	//		Color of minor tick marks
	minorTicksColor: '#c4c4c4',
	
	// noChange: Boolean
	//		Indicates if the gauge reacts to touch events
	noChange: false,
	
	// title: String
	//		The title displayed in the needle's tooltip
	title: "",
	
	// font: Object
	//		 The font of the gauge
	font: "normal normal normal 10pt serif",
	
	// scalePrecision: Number
	//		The precision for the formatting of numbers in the scale (default is 0)
	scalePrecision: 0,
	
	// textIndicatorPrecision: Number
	//		 The precision for the formatting of numbers in the text indicator (default is 0)
	textIndicatorPrecision: 0,
	
	_font: null,
	
	
	constructor: function(){
		this.startAngle = -135;
		this.endAngle = 135;
		this.min = 0;
		this.max = 100;
	},
	
	startup: function(){
		// summary:
		//		Overrides AnalogGauge.startup
		this.inherited(arguments);
		
		//just in case someone calls the startup twice.

		if (this._needle) return; 
		
		var scale = Math.min((this.width / this._designWidth), (this.height / this._designHeight));
		this.cx = scale * this._designCx + (this.width - scale * this._designWidth) / 2;
		this.cy = scale * this._designCy + (this.height - scale * this._designHeight) / 2;
		
		this._range = {
			low: this.min ? this.min : 0,
			high: this.max ? this.max : 100,
			color: [255, 255, 255, 0]
		};
		this.addRange(this._range);
		
		this._majorTicksOffset = this._minorTicksOffset = scale * this._majorTicksOffset;
		this._majorTicksLength = scale * this._majorTicksLength;
		this._minorTicksLength = scale * this._minorTicksLength;
		
		// creates and add the major ticks
		this.setMajorTicks({
			fixedPrecision: true,
			precision: this.scalePrecision,
			font: this._font,
			offset: this._majorTicksOffset,
			interval: this.majorTicksInterval,
			length: this._majorTicksLength,
			color: this.majorTicksColor,
			labelPlacement: this.majorTicksLabelPlacement
		});
		
		// creates and add the minor ticks
		this.setMinorTicks({
			offset: this._minorTicksOffset,
			interval: this.minorTicksInterval,
			length: this._minorTicksLength,
			color: this.minorTicksColor
		});
		
		// creates and adds the needle
		this._needle = new GlossyCircularGaugeNeedle({
			hideValue: true,
			title: this.title,
			noChange: this.noChange,
			color: this.needleColor,
			value: this.value
		});
		this.addIndicator(this._needle);
		
		// creates and add the text indicator
		this._textIndicator = new TextIndicator({
			x: scale * this._designTextIndicatorX + (this.width - scale * this._designWidth) / 2,
			y: scale * this._designTextIndicatorY + (this.height - scale * this._designHeight) / 2,
			fixedPrecision: true,
			precision: this.textIndicatorPrecision,
			color: this.textIndicatorColor,
			value: this.value ? this.value : this.min,
			align: "middle",
			font: this._textIndicatorFont
		});
		
		if (this.textIndicatorVisible){
			this.addIndicator(this._textIndicator);
			this._textIndicatorAdded = true;
		}
		
		// connect needle and text
		connect.connect(this._needle, "valueChanged", lang.hitch(this, function(){
			this.value = this._needle.value;
			this._textIndicator.update(this._needle.value);
			this.onValueChanged();
		}));
		
	},
	
	
	onValueChanged: function(){
		// summary:
		//		Invoked when the value of the gauge has changed.
	
	},
	
	//*******************************************************************************************
	//* Property getters and setters
	//*******************************************************************************************
	
	_setColorAttr: function(color){
		// summary:
		//		Sets the main color of the gauge
		// color: String
		//		The color
		this.color = color ? color : 'black';
		if (this._gaugeBackground && this._gaugeBackground.parent) 
			this._gaugeBackground.parent.remove(this._gaugeBackground);
		if (this._foreground && this._foreground.parent) 
			this._foreground.parent.remove(this._foreground);
		this._gaugeBackground = null;
		this._foreground = null;
		this.draw();
	},
	
	_setNeedleColorAttr: function(color){
		// summary:
		//		Sets the main color of the needle
		// color: String
		//		The color
		this.needleColor = color;
		if (this._needle){
			this.removeIndicator(this._needle);
			this._needle.color = this.needleColor;
			this._needle.shape = null;
			this.addIndicator(this._needle);
		}
	},
	
	_setTextIndicatorColorAttr: function(color){
		// summary:
		//		Sets the color of text indicator display the gauge's value
		// color: String
		//		The color
		this.textIndicatorColor = color;
		if (this._textIndicator){
			this._textIndicator.color = this.textIndicatorColor;
			this.draw();
		}
	},
	
	_setTextIndicatorFontAttr: function(font){
		// summary:
		//		Sets the font of the text indicator
		// font: String
		//		An string representing the font such as 'normal normal normal 10pt Helvetica,Arial,sans-serif'	
		//
		
		this.textIndicatorFont = font;
		this._textIndicatorFont = gfx.splitFontString(font);
		if (this._textIndicator){
			this._textIndicator.font = this._textIndicatorFont;
			this.draw();
		}
	},
	
	setMajorTicksOffset: function(offset){
		// summary:
		//		Sets the distance from gauge's center to major ticks
		this._majorTicksOffset = offset;
		this._setMajorTicksProperty({
			'offset': this._majorTicksOffset
		});
		return this;
	},
	
	getMajorTicksOffset: function(){
		// summary:
		//		Return the distance from gauge's center to major ticks
		return this._majorTicksOffset;
	},
	
	_setMajorTicksIntervalAttr: function(interval){
		// summary:
		//		Sets the interval between major ticks
		this.majorTicksInterval = interval;
		this._setMajorTicksProperty({
			'interval': this.majorTicksInterval
		});
	},
	
	setMajorTicksLength: function(length){
		// summary:
		//		Sets the size of the major ticks.
		this._majorTicksLength = length;
		this._setMajorTicksProperty({
			'length': this._majorTicksLength
		});
		return this;
	},
	
	getMajorTicksLength: function(){
		// summary:
		//		Returns the size of the major ticks.
		return this._majorTicksLength;
	},
	
	_setMajorTicksColorAttr: function(color){
		// summary:
		//		Sets the color of the major ticks.
		this.majorTicksColor = color;
		this._setMajorTicksProperty({
			'color': this.majorTicksColor
		});
	},
	
	_setMajorTicksLabelPlacementAttr: function(placement){
		// summary:
		//		Sets the placement of labels relatively to major ticks.
		// placement: String
		//		'inside' or 'outside'
		this.majorTicksLabelPlacement = placement;
		this._setMajorTicksProperty({
			'labelPlacement': this.majorTicksLabelPlacement
		});
	},
	
	_setMajorTicksProperty: function(prop){
		if (this.majorTicks){
			lang.mixin(this.majorTicks, prop);
			this.setMajorTicks(this.majorTicks);
		}
	},
	
	setMinorTicksOffset: function(offset){
		// summary:
		//		Sets the distance from gauge's center to minor ticks
		this._minorTicksOffset = offset;
		this._setMinorTicksProperty({
			'offset': this._minorTicksOffset
		});
		return this;
	},
	
	getMinorTicksOffset: function(){
		// summary:
		//		Returns the distance from gauge's center to minor ticks
		return this._minorTicksOffset;
	},
	
	_setMinorTicksIntervalAttr: function(interval){
		// summary:
		//		Sets the interval between minor ticks
		this.minorTicksInterval = interval;
		this._setMinorTicksProperty({
			'interval': this.minorTicksInterval
		});
	},
	
	setMinorTicksLength: function(length){
		// summary:
		//		Sets the size of the minor ticks.
		this._minorTicksLength = length;
		this._setMinorTicksProperty({
			'length': this._minorTicksLength
		});
		return this;
	},
	
	getMinorTicksLength: function(){
		// summary:
		//		Return the size of the minor ticks.
		return this._minorTicksLength;
	},
	
	_setMinorTicksColorAttr: function(color){
		// summary:
		//		Sets the color of the minor ticks.
		this.minorTicksColor = color;
		this._setMinorTicksProperty({
			'color': this.minorTicksColor
		});
	},
	
	_setMinorTicksProperty: function(prop){
		if (this.minorTicks){
			lang.mixin(this.minorTicks, prop);
			this.setMinorTicks(this.minorTicks);
		}
	},
	
	_setMinAttr: function(min){
		this.min = min;
	
		if (this.majorTicks != null) 
			this.setMajorTicks(this.majorTicks);
		if (this.minorTicks != null) 
			this.setMinorTicks(this.minorTicks);
		this.draw();
		this._updateNeedle();
	},
	
	_setMaxAttr: function(max){
		this.max = max;
	
		if (this.majorTicks != null) 
			this.setMajorTicks(this.majorTicks);
		if (this.minorTicks != null) 
			this.setMinorTicks(this.minorTicks);
		this.draw();
		this._updateNeedle();
	},
	
	_setScalePrecisionAttr: function(value){
		// summary:
		//		Changes precision of the numbers in the scale of the gauge
		// value: Number
		//		The new value
		this.scalePrecision = value;
		this._setMajorTicksProperty({
			'precision': value
		});
	},
	
	_setTextIndicatorPrecisionAttr: function(value){
		// summary:
		//		Changes precision of the numbers in the text indicator
		// value: Number
		//		The new value
		this.textIndicatorPrecision = value;
		this._setMajorTicksProperty({
			'precision': value
		});
	},
	
	_setValueAttr: function(value){
		// summary:
		//		Changes the value of the gauge
		// value: Number
		//		The new value for the gauge.			
		
		value = Math.min(this.max, value);
		value = Math.max(this.min, value);
		this.value = value;
		if (this._needle){
			// update will not work if noChange is true.
			var noChange = this._needle.noChange;
			this._needle.noChange = false;
			this._needle.update(value);
			this._needle.noChange = noChange;
		}
	},
	
	_setNoChangeAttr: function(value){
		// summary:
		//		Indicates if the value of the gauge can be changed or not
		// value: boolean
		//		true indicates that the gauge's value cannot be changed	
		this.noChange = value;
		if (this._needle) 
			this._needle.noChange = this.noChange;
	},
	
	_setTextIndicatorVisibleAttr: function(value){
		// summary:
		//		Changes the visibility of the text indicator displaying the gauge's value.
		// value: boolean
		//		true to show the indicator, false to hide.
		
		this.textIndicatorVisible = value;
		if (this._textIndicator && this._needle){
			if (this.textIndicatorVisible && !this._textIndicatorAdded){
				this.addIndicator(this._textIndicator);
				this._textIndicatorAdded = true;
				this.moveIndicatorToFront(this._needle);
				
			}
			else 
				if (!this.textIndicatorVisible && this._textIndicatorAdded){
					this.removeIndicator(this._textIndicator);
					this._textIndicatorAdded = false;
				}
		}
	},
	
	_setTitleAttr: function(value){
		// summary:
		//		Sets the title displayed by the needle's tooltip .
		// value: String
		//		the title
		
		this.title = value;
		if (this._needle){
			this._needle.title = this.title;
		}
	},
	
	_setOrientationAttr: function(orientation){
		// summary:
		//		Sets the orientation of the gauge
		// orientation: String
		//		Either "clockwise" or "cclockwise"	
		
		this.orientation = orientation;
		if (this.majorTicks != null) 
			this.setMajorTicks(this.majorTicks);
		if (this.minorTicks != null) 
			this.setMinorTicks(this.minorTicks);
		this.draw();
		this._updateNeedle();
	
	},
	
	_updateNeedle: function(){
		// updates the needle with no animation 
		this.value = Math.max(this.min, this.value);
		this.value = Math.min(this.max, this.value);
		
		if (this._needle){
			// update will not work if noChange is true.
			var noChange = this._needle.noChange;
			this._needle.noChange = false;
			this._needle.update(this.value, false);
			this._needle.noChange = noChange;
		} // to redraw the needle
	},
	
	_setFontAttr: function(font){
		// summary:
		//		Sets the font of the gauge
		// font: String
		//		An string representing the font such as 'normal normal normal 10pt Helvetica,Arial,sans-serif'
		
		this.font = font;
		this._font = gfx.splitFontString(font);
		this._setMajorTicksProperty({
			'font': this._font
		});
	}});
});
