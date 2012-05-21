define(["dojo/_base/lang", "dojo/_base/declare", "./Base", "../scaler/linear", 
	"dojox/gfx", "dojox/lang/utils", "dojox/lang/functional", "dojo/string"],
	function(lang, declare, Base, lin, g, du, df, dstring){
/*=====
var Base = dojox.charting.axis2d.Base;
=====*/ 
	var merge = du.merge,
		labelGap = 4,			// in pixels
		centerAnchorLimit = 45;	// in degrees

	return declare("dojox.charting.axis2d.Invisible", Base, {
		//	summary:
		//		The default axis object used in dojox.charting.  See dojox.charting.Chart.addAxis for details.
		//
		//	defaultParams: Object
		//		The default parameters used to define any axis.
		//	optionalParams: Object
		//		Any optional parameters needed to define an axis.

		/*
		//	TODO: the documentation tools need these to be pre-defined in order to pick them up
		//	correctly, but the code here is partially predicated on whether or not the properties
		//	actually exist.  For now, we will leave these undocumented but in the code for later. -- TRT

		//	opt: Object
		//		The actual options used to define this axis, created at initialization.
		//	scalar: Object
		//		The calculated helper object to tell charts how to draw an axis and any data.
		//	ticks: Object
		//		The calculated tick object that helps a chart draw the scaling on an axis.
		//	dirty: Boolean
		//		The state of the axis (whether it needs to be redrawn or not)
		//	scale: Number
		//		The current scale of the axis.
		//	offset: Number
		//		The current offset of the axis.

		opt: null,
		scalar: null,
		ticks: null,
		dirty: true,
		scale: 1,
		offset: 0,
		*/
		defaultParams: {
			vertical:    false,		// true for vertical axis
			fixUpper:    "none",	// align the upper on ticks: "major", "minor", "micro", "none"
			fixLower:    "none",	// align the lower on ticks: "major", "minor", "micro", "none"
			natural:     false,		// all tick marks should be made on natural numbers
			leftBottom:  true,		// position of the axis, used with "vertical"
			includeZero: false,		// 0 should be included
			fixed:       true,		// all labels are fixed numbers
			majorLabels: true,		// draw major labels
			minorTicks:  true,		// draw minor ticks
			minorLabels: true,		// draw minor labels
			microTicks:  false,		// draw micro ticks
			rotation:    0			// label rotation angle in degrees
		},
		optionalParams: {
			min:			0,	// minimal value on this axis
			max:			1,	// maximal value on this axis
			from:			0,	// visible from this value
			to:				1,	// visible to this value
			majorTickStep:	4,	// major tick step
			minorTickStep:	2,	// minor tick step
			microTickStep:	1,	// micro tick step
			labels:			[],	// array of labels for major ticks
								// with corresponding numeric values
								// ordered by values
			labelFunc:		null, // function to compute label values
			maxLabelSize:	0,	// size in px. For use with labelFunc
			maxLabelCharCount:	0,	// size in word count.
			trailingSymbol:			null

			// TODO: add support for minRange!
			// minRange:		1,	// smallest distance from min allowed on the axis
		},

		constructor: function(chart, kwArgs){
			//	summary:
			//		The constructor for an axis.
			//	chart: dojox.charting.Chart
			//		The chart the axis belongs to.
			//	kwArgs: dojox.charting.axis2d.__AxisCtorArgs?
			//		Any optional keyword arguments to be used to define this axis.
			this.opt = lang.clone(this.defaultParams);
            du.updateWithObject(this.opt, kwArgs);
			du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
		},
		dependOnData: function(){
			//	summary:
			//		Find out whether or not the axis options depend on the data in the axis.
			return !("min" in this.opt) || !("max" in this.opt);	//	Boolean
		},
		clear: function(){
			//	summary:
			//		Clear out all calculated properties on this axis;
			//	returns: dojox.charting.axis2d.Default
			//		The reference to the axis for functional chaining.
			delete this.scaler;
			delete this.ticks;
			this.dirty = true;
			return this;	//	dojox.charting.axis2d.Default
		},
		initialized: function(){
			//	summary:
			//		Finds out if this axis has been initialized or not.
			//	returns: Boolean
			//		Whether a scaler has been calculated and if the axis is not dirty.
			return "scaler" in this && !(this.dirty && this.dependOnData());
		},
		setWindow: function(scale, offset){
			//	summary:
			//		Set the drawing "window" for the axis.
			//	scale: Number
			//		The new scale for the axis.
			//	offset: Number
			//		The new offset for the axis.
			//	returns: dojox.charting.axis2d.Default
			//		The reference to the axis for functional chaining.
			this.scale  = scale;
			this.offset = offset;
			return this.clear();	//	dojox.charting.axis2d.Default
		},
		getWindowScale: function(){
			//	summary:
			//		Get the current windowing scale of the axis.
			return "scale" in this ? this.scale : 1;	//	Number
		},
		getWindowOffset: function(){
			//	summary:
			//		Get the current windowing offset for the axis.
			return "offset" in this ? this.offset : 0;	//	Number
		},
		_groupLabelWidth: function(labels, font, wcLimit){
			if(!labels.length){
				return 0;
			}
			if(lang.isObject(labels[0])){
				labels = df.map(labels, function(label){ return label.text; });
			}
			if (wcLimit) {
				labels = df.map(labels, function(label){
					return lang.trim(label).length == 0 ? "" : label.substring(0, wcLimit) + this.trailingSymbol;
				}, this);
			}
			var s = labels.join("<br>");
			return g._base._getTextBox(s, {font: font}).w || 0;
		},
		calculate: function(min, max, span, labels){
			//	summary:
			//		Perform all calculations needed to render this axis.
			//	min: Number
			//		The smallest value represented on this axis.
			//	max: Number
			//		The largest value represented on this axis.
			//	span: Number
			//		The span in pixels over which axis calculations are made.
			//	labels: String[]
			//		Optional list of labels.
			//	returns: dojox.charting.axis2d.Default
			//		The reference to the axis for functional chaining.
			if(this.initialized()){
				return this;
			}
			var o = this.opt;
			this.labels = "labels" in o  ? o.labels : labels;
			this.scaler = lin.buildScaler(min, max, span, o);
			var tsb = this.scaler.bounds;
			if("scale" in this){
				// calculate new range
				o.from = tsb.lower + this.offset;
				o.to   = (tsb.upper - tsb.lower) / this.scale + o.from;
				// make sure that bounds are correct
				if( !isFinite(o.from) ||
					isNaN(o.from) ||
					!isFinite(o.to) ||
					isNaN(o.to) ||
					o.to - o.from >= tsb.upper - tsb.lower
				){
					// any error --- remove from/to bounds
					delete o.from;
					delete o.to;
					delete this.scale;
					delete this.offset;
				}else{
					// shift the window, if we are out of bounds
					if(o.from < tsb.lower){
						o.to += tsb.lower - o.from;
						o.from = tsb.lower;
					}else if(o.to > tsb.upper){
						o.from += tsb.upper - o.to;
						o.to = tsb.upper;
					}
					// update the offset
					this.offset = o.from - tsb.lower;
				}
				// re-calculate the scaler
				this.scaler = lin.buildScaler(min, max, span, o);
				tsb = this.scaler.bounds;
				// cleanup
				if(this.scale == 1 && this.offset == 0){
					delete this.scale;
					delete this.offset;
				}
			}

			var ta = this.chart.theme.axis, labelWidth = 0, rotation = o.rotation % 360,
				// TODO: we use one font --- of major tick, we need to use major and minor fonts
				taFont = o.font || (ta.majorTick && ta.majorTick.font) || (ta.tick && ta.tick.font),
				size = taFont ? g.normalizedLength(g.splitFontString(taFont).size) : 0,
				cosr = Math.abs(Math.cos(rotation * Math.PI / 180)),
				sinr = Math.abs(Math.sin(rotation * Math.PI / 180));

			if(rotation < 0){
				rotation += 360;
			}

			if(size){
				if(this.vertical ? rotation != 0 && rotation != 180 : rotation != 90 && rotation != 270){
					// we need width of all labels
					if(this.labels){
						labelWidth = this._groupLabelWidth(this.labels, taFont, o.maxLabelCharCount);
					}else{
						var labelLength = Math.ceil(
								Math.log(
									Math.max(
										Math.abs(tsb.from),
										Math.abs(tsb.to)
									)
								) / Math.LN10
							),
							t = [];
						if(tsb.from < 0 || tsb.to < 0){
							t.push("-");
						}
						t.push(dstring.rep("9", labelLength));
						var precision = Math.floor(
							Math.log( tsb.to - tsb.from ) / Math.LN10
						);
						if(precision > 0){
							t.push(".");
							t.push(dstring.rep("9", precision));
						}
						labelWidth = g._base._getTextBox(
							t.join(""),
							{ font: taFont }
						).w;
					}
					labelWidth = o.maxLabelSize ? Math.min(o.maxLabelSize, labelWidth) : labelWidth;
				}else{
					labelWidth = size;
				}
				switch(rotation){
					case 0:
					case 90:
					case 180:
					case 270:
						// trivial cases: use labelWidth
						break;
					default:
						// rotated labels
						var gap1 = Math.sqrt(labelWidth * labelWidth + size * size),									// short labels
							gap2 = this.vertical ? size * cosr + labelWidth * sinr : labelWidth * cosr + size * sinr;	// slanted labels
						labelWidth = Math.min(gap1, gap2);
						break;
				}
			}

			this.scaler.minMinorStep = labelWidth + labelGap;
			this.ticks = lin.buildTicks(this.scaler, o);
			return this;	//	dojox.charting.axis2d.Default
		},
		getScaler: function(){
			//	summary:
			//		Get the pre-calculated scaler object.
			return this.scaler;	//	Object
		},
		getTicks: function(){
			//	summary:
			//		Get the pre-calculated ticks object.
			return this.ticks;	//	Object
		}
	});
});
