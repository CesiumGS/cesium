define(["dojo/_base/lang", "dojo/_base/declare", "./Base", "../scaler/linear",
	"dojox/gfx", "dojox/lang/utils"],
	function(lang, declare, Base, lin, g, du){

/*=====
	var __InvisibleAxisCtorArgs = {
		// summary:
		//		Optional arguments used in the definition of an invisible axis.
		// vertical: Boolean?
		//		A flag that says whether an axis is vertical (i.e. y axis) or horizontal. Default is false (horizontal).
		// fixUpper: String?
		//		Align the greatest value on the axis with the specified tick level. Options are "major", "minor", "micro", or "none".  Defaults to "none".
		// fixLower: String?
		//		Align the smallest value on the axis with the specified tick level. Options are "major", "minor", "micro", or "none".  Defaults to "none".
		// natural: Boolean?
		//		Ensure tick marks are made on "natural" numbers. Defaults to false.
		// leftBottom: Boolean?
		//		The position of a vertical axis; if true, will be placed against the left-bottom corner of the chart.  Defaults to true.
		// includeZero: Boolean?
		//		Include 0 on the axis rendering.  Default is false.
		// fixed: Boolean?
		//		Force all axis labels to be fixed numbers.  Default is true.
		// min: Number?
		//		The smallest value on an axis. Default is 0.
		// max: Number?
		//		The largest value on an axis. Default is 1.
		// from: Number?
		//		Force the chart to render data visible from this value. Default is 0.
		// to: Number?
		//		Force the chart to render data visible to this value. Default is 1.
		// majorTickStep: Number?
		//		The amount to skip before a major tick is drawn. When not set the major ticks step is computed from
		//		the data range.
		// minorTickStep: Number?
		//		The amount to skip before a minor tick is drawn. When not set the minor ticks step is computed from
		//		the data range.
		// microTickStep: Number?
		//		The amount to skip before a micro tick is drawn. When not set the micro ticks step is computed from
	};
=====*/

	return declare("dojox.charting.axis2d.Invisible", Base, {
		// summary:
		//		A axis object used in dojox.charting.  You can use that axis if you want the axis to be invisible.
		//		See dojox.charting.Chart.addAxis for details.
		//
		// defaultParams: Object
		//		The default parameters used to define any axis.
		// optionalParams: Object
		//		Any optional parameters needed to define an axis.

		/*
		// TODO: the documentation tools need these to be pre-defined in order to pick them up
		//	correctly, but the code here is partially predicated on whether or not the properties
		//	actually exist.  For now, we will leave these undocumented but in the code for later. -- TRT

		// opt: Object
		//		The actual options used to define this axis, created at initialization.
		// scaler: Object
		//		The calculated helper object to tell charts how to draw an axis and any data.
		// ticks: Object
		//		The calculated tick object that helps a chart draw the scaling on an axis.
		// dirty: Boolean
		//		The state of the axis (whether it needs to be redrawn or not)
		// scale: Number
		//		The current scale of the axis.
		// offset: Number
		//		The current offset of the axis.

		opt: null,
		scaler: null,
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
			fixed:       true		// all labels are fixed numbers
		},
		optionalParams: {
			min:			0,	// minimal value on this axis
			max:			1,	// maximal value on this axis
			from:			0,	// visible from this value
			to:				1,	// visible to this value
			majorTickStep:	4,	// major tick step
			minorTickStep:	2,	// minor tick step
			microTickStep:	1	// micro tick step
		},

		constructor: function(chart, kwArgs){
			// summary:
			//		The constructor for an invisible axis.
			// chart: dojox/charting/Chart
			//		The chart the axis belongs to.
			// kwArgs: __InvisibleAxisCtorArgs?
			//		Any optional keyword arguments to be used to define this axis.
			this.opt = lang.clone(this.defaultParams);
            du.updateWithObject(this.opt, kwArgs);
			du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
		},
		dependOnData: function(){
			// summary:
			//		Find out whether or not the axis options depend on the data in the axis.
			return !("min" in this.opt) || !("max" in this.opt);	//	Boolean
		},
		clear: function(){
			// summary:
			//		Clear out all calculated properties on this axis;
			// returns: dojox/charting/axis2d/Invisible
			//		The reference to the axis for functional chaining.
			delete this.scaler;
			delete this.ticks;
			this.dirty = true;
			return this;	//	dojox/charting/axis2d/Invisible
		},
		initialized: function(){
			// summary:
			//		Finds out if this axis has been initialized or not.
			// returns: Boolean
			//		Whether a scaler has been calculated and if the axis is not dirty.
			return "scaler" in this && !(this.dirty && this.dependOnData());
		},
		setWindow: function(scale, offset){
			// summary:
			//		Set the drawing "window" for the axis.
			// scale: Number
			//		The new scale for the axis.
			// offset: Number
			//		The new offset for the axis.
			// returns: dojox/charting/axis2d/Invisible
			//		The reference to the axis for functional chaining.
			this.scale  = scale;
			this.offset = offset;
			return this.clear();	//	dojox/charting/axis2d/Invisible
		},
		getWindowScale: function(){
			// summary:
			//		Get the current windowing scale of the axis.
			return "scale" in this ? this.scale : 1;	//	Number
		},
		getWindowOffset: function(){
			// summary:
			//		Get the current windowing offset for the axis.
			return "offset" in this ? this.offset : 0;	//	Number
		},
		calculate: function(min, max, span){
			// summary:
			//		Perform all calculations needed to render this axis.
			// min: Number
			//		The smallest value represented on this axis.
			// max: Number
			//		The largest value represented on this axis.
			// span: Number
			//		The span in pixels over which axis calculations are made.
			// returns: dojox/charting/axis2d/Invisible
			//		The reference to the axis for functional chaining.
			if(this.initialized()){
				return this;
			}
			var o = this.opt;
			// we used to have a 4th function parameter to reach labels but
			// nobody was calling it with 4 parameters.
			this.labels = o.labels;
			this.scaler = lin.buildScaler(min, max, span, o);
			// store the absolute major tick start, this will be useful when dropping a label every n labels
			// TODO: if o.lower then it does not work
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
			return this;	//	dojox/charting/axis2d/Invisible
		},
		getScaler: function(){
			// summary:
			//		Get the pre-calculated scaler object.
			return this.scaler;	//	Object
		},
		getTicks: function(){
			// summary:
			//		Get the pre-calculated ticks object.
			return this.ticks;	//	Object
		}
	});
});
