define(["dojo/_base/lang", "dojo/_base/array", "dojo/_base/sniff", "dojo/_base/declare",
	"dojo/_base/connect", "dojo/dom-geometry", "./Invisible",
	"../scaler/common", "../scaler/linear", "./common", "dojox/gfx", "dojox/lang/utils", "dojox/lang/functional"],
	function(lang, arr, has, declare, connect, domGeom, Invisible, scommon,
			lin, acommon, g, du, df){

	/*=====
	var __AxisCtorArgs = {
		// summary:
		//		Optional arguments used in the definition of an axis.
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
		// majorLabels: Boolean?
		//		Flag to draw labels at major ticks. Default is true.
		// minorTicks: Boolean?
		//		Flag to draw minor ticks on an axis.  Default is true.
		// minorLabels: Boolean?
		//		Flag to labels on minor ticks when there is enough space. Default is true.
		// microTicks: Boolean?
		//		Flag to draw micro ticks on an axis. Default is false.
		// htmlLabels: Boolean?
		//		Flag to use HTML (as opposed to the native vector graphics engine) to draw labels. Default is true.
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
		// labels: Object[]?
		//		An array of labels for major ticks, with corresponding numeric values, ordered by value.
		// labelFunc: Function?
		//		An optional function to use to compute label text. It takes precedence over
		//		the default text when available. The function must be of the following form:
		//	|		function labelFunc(text, value, precision) {}
		//		`text` is the already pre-formatted text. Pre-formatting is done using `dojo/number` is available, `Date.toFixed` otherwise.
		//		`value`  is the raw axis value.
		//		`precision` is the requested precision to be applied.
		// maxLabelSize: Number?
		//		The maximum size, in pixels, for a label.  To be used with the optional label function.
		// stroke: dojox.gfx.Stroke?
		//		An optional stroke to be used for drawing an axis.
		// majorTick: Object?
		//		An object containing a dojox.gfx.Stroke, and a length (number) for a major tick.
		// minorTick: Object?
		//		An object containing a dojox.gfx.Stroke, and a length (number) for a minor tick.
		// microTick: Object?
		//		An object containing a dojox.gfx.Stroke, and a length (number) for a micro tick.
		// tick: Object?
		//		An object containing a dojox.gfx.Stroke, and a length (number) for a tick.
		// font: String?
		//		An optional font definition (as used in the CSS font property) for labels.
		// fontColor: String|dojo.Color?
		//		An optional color to be used in drawing labels.
		// titleGap: Number?
		//		An optional grap between axis title and axis label
		// titleFont: String?
		//		An optional font definition for axis title
		// titleFontColor: String?
		//		An optional axis title color
		// titleOrientation: String?
		//		An optional orientation for axis title. "axis" means the title facing the axis, "away" means facing away.
		//		If no value is set "axis" is used.
		// enableCache: Boolean?
		//		Whether the ticks and labels are cached from one rendering to another. This improves the rendering performance of
		//		successive rendering but penalize the first rendering. For labels it is only working with gfx labels
		//		not html ones.  Default false.
		// dropLabels: Boolean?
		//		Whether the axis automatically drops labels at regular interval or not to avoid labels overlapping.
		//		This gives better results but require more computations.  You can disable it to save computation
		//		time when you know your labels won't overlap. Default is true.
		// labelSizeChange: Boolean?
		//		Indicates to the axis whether the axis labels are changing their size on zoom. If false this allows to
		//		optimize the axis by avoiding recomputing labels maximum size on zoom actions. Default is false.
	};
	=====*/

	var centerAnchorLimit = 45;	// in degrees

	return declare("dojox.charting.axis2d.Default", Invisible, {
		// summary:
		//		The default axis object used in dojox.charting.  See dojox.charting.Chart.addAxis for details.

		// defaultParams: Object
		//		The default parameters used to define any axis.
		// optionalParams: Object
		//		Any optional parameters needed to define an axis.

		/*=====
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
		=====*/
		defaultParams: {
			vertical:	false,		// true for vertical axis
			fixUpper:	"none",	// align the upper on ticks: "major", "minor", "micro", "none"
			fixLower:	"none",	// align the lower on ticks: "major", "minor", "micro", "none"
			natural:	 false,		// all tick marks should be made on natural numbers
			leftBottom:  true,		// position of the axis, used with "vertical"
			includeZero: false,		// 0 should be included
			fixed:	   true,		// all labels are fixed numbers
			majorLabels: true,		// draw major labels
			minorTicks:  true,		// draw minor ticks
			minorLabels: true,		// draw minor labels
			microTicks:  false,		// draw micro ticks
			rotation:	0,			// label rotation angle in degrees
			htmlLabels:  true,		// use HTML to draw labels
			enableCache: false,		// whether we cache or not
			dropLabels: true,		// whether we automatically drop overlapping labels or not
			labelSizeChange: false // whether the labels size change on zoom
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
			trailingSymbol:	null,

			// TODO: add support for minRange!
			// minRange:		1,	// smallest distance from min allowed on the axis

			// theme components
			stroke:			{},	// stroke for an axis
			majorTick:		{},	// stroke + length for a tick
			minorTick:		{},	// stroke + length for a tick
			microTick:		{},	// stroke + length for a tick
			tick:		   {},	// stroke + length for a tick
			font:			"",	// font for labels
			fontColor:		"",	// color for labels as a string
			title:				 "",	// axis title
			titleGap:			 0,		// gap between axis title and axis label
			titleFont:			 "",		// axis title font
			titleFontColor:		 "",		// axis title font color
			titleOrientation:	 ""		// "axis" means the title facing the axis, "away" means facing away
		},

		constructor: function(chart, kwArgs){
			// summary:
			//		The constructor for an axis.
			// chart: dojox/charting/Chart
			//		The chart the axis belongs to.
			// kwArgs: __AxisCtorArgs?
			//		Any optional keyword arguments to be used to define this axis.
			this.opt = lang.clone(this.defaultParams);
			du.updateWithObject(this.opt, kwArgs);
			du.updateWithPattern(this.opt, kwArgs, this.optionalParams);
			if(this.opt.enableCache){
				this._textFreePool = [];
				this._lineFreePool = [];
				this._textUsePool = [];
				this._lineUsePool = [];
			}
			this._invalidMaxLabelSize = true;
		},
		setWindow: function(scale, offset){
			// summary:
			//		Set the drawing "window" for the axis.
			// scale: Number
			//		The new scale for the axis.
			// offset: Number
			//		The new offset for the axis.
			// returns: dojox/charting/axis2d/Default
			//		The reference to the axis for functional chaining.
			if(scale != this.scale){
				// if scale changed we need to recompute new max label size
				this._invalidMaxLabelSize = true;
			}
			return this.inherited(arguments);
		},

		_groupLabelWidth: function(labels, font, wcLimit){
			if(!labels.length){
				return 0;
			}
			if(labels.length > 50){
				// let's avoid degenerated cases
				labels.length = 50;
			}
			if(lang.isObject(labels[0])){
				labels = df.map(labels, function(label){ return label.text; });
			}
			if(wcLimit){
				labels = df.map(labels, function(label){
					return lang.trim(label).length == 0 ? "" : label.substring(0, wcLimit) + this.trailingSymbol;
				}, this);
			}
			var s = labels.join("<br>");
			return g._base._getTextBox(s, {font: font}).w || 0;
		},

		_getMaxLabelSize: function(min, max, span, rotation, font, size){
			if(this._maxLabelSize == null && arguments.length == 6){
				var o = this.opt;
				// everything might have changed, reset the minMinorStep value
				this.scaler.minMinorStep = this._prevMinMinorStep = 0;
				var ob = lang.clone(o);
				delete ob.to;
				delete ob.from;
				// build all the ticks from min, to max not from to to _but_ using the step
				// that would be used if we where just displaying from to to from.
				var sb = lin.buildScaler(min, max, span, ob, o.to - o.from);
				sb.minMinorStep = 0;
				this._majorStart = sb.major.start;
				// we build all the ticks not only the ones we need to draw in order to get
				// a correct drop rate computation that works for any offset of this scale
				var tb = lin.buildTicks(sb, o);
				// if there is not tick at all tb is null
				if(size && tb){
					var majLabelW = 0, minLabelW = 0; // non rotated versions
					// we first collect all labels when needed
					var tickLabelFunc = function(tick){
						if(tick.label){
							this.push(tick.label);
						}
					};
					var labels = [];
					if(this.opt.majorLabels){
						arr.forEach(tb.major, tickLabelFunc, labels);
						majLabelW = this._groupLabelWidth(labels, font, ob.maxLabelCharCount);
						if(ob.maxLabelSize){
							majLabelW = Math.min(ob.maxLabelSize, majLabelW);
						}
					}
					// do the minor labels computation only if dropLabels is set
					labels = [];
					if(this.opt.dropLabels && this.opt.minorLabels){
						arr.forEach(tb.minor, tickLabelFunc, labels);
						minLabelW = this._groupLabelWidth(labels, font, ob.maxLabelCharCount);
						if(ob.maxLabelSize){
							minLabelW = Math.min(ob.maxLabelSize, minLabelW);
						}
					}
					this._maxLabelSize = {
						majLabelW: majLabelW, minLabelW: minLabelW,
						majLabelH: size, minLabelH: size
					};
				}else{
					this._maxLabelSize = null;
				}
			}
			return this._maxLabelSize;
		},

		calculate: function(min, max, span){
			this.inherited(arguments);
			// when the scale has not changed there is no reason for minMinorStep to change
			this.scaler.minMinorStep = this._prevMinMinorStep;
			// we want to recompute the dropping mechanism only when the scale or the size of the axis is changing
			// not when for example when we scroll (otherwise effect would be weird)
			if((this._invalidMaxLabelSize || span != this._oldSpan) && (min != Infinity && max != -Infinity)){
				this._invalidMaxLabelSize = false;
				if(this.opt.labelSizeChange){
					this._maxLabelSize = null;
				}
				this._oldSpan = span;
				var o = this.opt;
				var ta = this.chart.theme.axis, rotation = o.rotation % 360,
					labelGap = this.chart.theme.axis.tick.labelGap,
					// TODO: we use one font --- of major tick, we need to use major and minor fonts
					font = o.font || (ta.majorTick && ta.majorTick.font) || (ta.tick && ta.tick.font),
					size = font ? g.normalizedLength(g.splitFontString(font).size) : 0,
					// even if we don't drop label we need to compute max size for offsets
					labelW = this._getMaxLabelSize(min, max, span, rotation, font, size);
				if(typeof labelGap != "number"){
					labelGap = 4; // in pixels
				}
				if(labelW && o.dropLabels){
					var cosr = Math.abs(Math.cos(rotation * Math.PI / 180)),
						sinr = Math.abs(Math.sin(rotation * Math.PI / 180));
					var majLabelW, minLabelW;
					if(rotation < 0){
						rotation += 360;
					}
					switch(rotation){
						case 0:
						case 180:
							// trivial cases: horizontal labels
							if(this.vertical){
								majLabelW = minLabelW = size;
							}else{
								majLabelW = labelW.majLabelW;
								minLabelW = labelW.minLabelW;
							}
							break;
						case 90:
						case 270:
							// trivial cases: vertical
							if(this.vertical){
								majLabelW = labelW.majLabelW;
								minLabelW = labelW.minLabelW;
							}else{
								majLabelW = minLabelW = size;
							}
							break;
						default:
							// all major labels are parallel they can't collapse except if the two ticks are
							// closer than the height of the text * cos(90-rotation)
							majLabelW  = this.vertical ? Math.min(labelW.majLabelW, size / cosr) : Math.min(labelW.majLabelW, size / sinr);
							// for minor labels we need to rotated them
							var gap1 = Math.sqrt(labelW.minLabelW * labelW.minLabelW + size * size),
								gap2 = this.vertical ? size * cosr + labelW.minLabelW * sinr : labelW.minLabelW * cosr + size * sinr;
							minLabelW = Math.min(gap1, gap2);
							break;
					}
					// we need to check both minor and major labels fit a minor step
					this.scaler.minMinorStep = this._prevMinMinorStep =  Math.max(majLabelW, minLabelW) + labelGap;
					var canMinorLabel = this.scaler.minMinorStep <= this.scaler.minor.tick * this.scaler.bounds.scale;
					if(!canMinorLabel){
						// we can't place minor labels, let's see if we can place major ones
						// in a major step and if not which skip interval we must follow
						this._skipInterval = Math.floor((majLabelW + labelGap) / (this.scaler.major.tick * this.scaler.bounds.scale));
					}else{
						// everything fit well
						this._skipInterval = 0;
					}
				}else{
					// drop label disabled
					this._skipInterval = 0;
				}
			}
			// computes the tick subset we need for that scale/offset
			this.ticks = lin.buildTicks(this.scaler, this.opt);
			return this;
		},

		getOffsets: function(){
			// summary:
			//		Get the physical offset values for this axis (used in drawing data series). This method is not
			//		supposed to be called by the users but internally.
			// returns: Object
			//		The calculated offsets in the form of { l, r, t, b } (left, right, top, bottom).
			var s = this.scaler, offsets = { l: 0, r: 0, t: 0, b: 0 };
			if(!s){
				return offsets;
			}
			var o = this.opt, a, b, c, d,
				gl = scommon.getNumericLabel,
				offset = 0, ma = s.major, mi = s.minor,
				ta = this.chart.theme.axis,
				labelGap = this.chart.theme.axis.tick.labelGap,
				// TODO: we use one font --- of major tick, we need to use major and minor fonts
				taTitleFont = o.titleFont || (ta.title && ta.title.font),
				taTitleGap = (o.titleGap==0) ? 0 : o.titleGap || (ta.title && ta.title.gap),
				taMajorTick = this.chart.theme.getTick("major", o),
				taMinorTick = this.chart.theme.getTick("minor", o),
				tsize = taTitleFont ? g.normalizedLength(g.splitFontString(taTitleFont).size) : 0,
				rotation = o.rotation % 360, leftBottom = o.leftBottom,
				cosr = Math.abs(Math.cos(rotation * Math.PI / 180)),
				sinr = Math.abs(Math.sin(rotation * Math.PI / 180));
			this.trailingSymbol = (o.trailingSymbol === undefined || o.trailingSymbol === null) ?
				this.trailingSymbol : o.trailingSymbol;
			if(typeof labelGap != "number"){
				labelGap = 4; // in pixels
			}
			if(rotation < 0){
				rotation += 360;
			}
			var maxLabelSize = this._getMaxLabelSize(); // don't need parameters, calculate has been called before => we use cached value
			if(maxLabelSize){
				var side;
				var labelWidth = Math.ceil(Math.max(maxLabelSize.majLabelW, maxLabelSize.minLabelW)) + 1,
					size = Math.ceil(Math.max(maxLabelSize.majLabelH, maxLabelSize.minLabelH)) + 1;
				if(this.vertical){
					side = leftBottom ? "l" : "r";
					switch(rotation){
						case 0:
						case 180:
							offsets[side] = labelWidth;
							offsets.t = offsets.b = size / 2;
							break;
						case 90:
						case 270:
							offsets[side] = size;
							offsets.t = offsets.b = labelWidth / 2;
							break;
						default:
							if(rotation <= centerAnchorLimit || (180 < rotation && rotation <= (180 + centerAnchorLimit))){
								offsets[side] = size * sinr / 2 + labelWidth * cosr;
								offsets[leftBottom ? "t" : "b"] = size * cosr / 2 + labelWidth * sinr;
								offsets[leftBottom ? "b" : "t"] = size * cosr / 2;
							}else if(rotation > (360 - centerAnchorLimit) || (180 > rotation && rotation > (180 - centerAnchorLimit))){
								offsets[side] = size * sinr / 2 + labelWidth * cosr;
								offsets[leftBottom ? "b" : "t"] = size * cosr / 2 + labelWidth * sinr;
								offsets[leftBottom ? "t" : "b"] = size * cosr / 2;
							}else if(rotation < 90 || (180 < rotation && rotation < 270)){
								offsets[side] = size * sinr + labelWidth * cosr;
								offsets[leftBottom ? "t" : "b"] = size * cosr + labelWidth * sinr;
							}else{
								offsets[side] = size * sinr + labelWidth * cosr;
								offsets[leftBottom ? "b" : "t"] = size * cosr + labelWidth * sinr;
							}
							break;
					}
					offsets[side] += labelGap + Math.max(taMajorTick.length, taMinorTick.length) + (o.title ? (tsize + taTitleGap) : 0);
				}else{
					side = leftBottom ? "b" : "t";
					switch(rotation){
						case 0:
						case 180:
							offsets[side] = size;
							offsets.l = offsets.r = labelWidth / 2;
							break;
						case 90:
						case 270:
							offsets[side] = labelWidth;
							offsets.l = offsets.r = size / 2;
							break;
						default:
							if((90 - centerAnchorLimit) <= rotation && rotation <= 90 || (270 - centerAnchorLimit) <= rotation && rotation <= 270){
								offsets[side] = size * cosr / 2 + labelWidth * sinr;
								offsets[leftBottom ? "r" : "l"] = size * sinr / 2 + labelWidth * cosr;
								offsets[leftBottom ? "l" : "r"] = size * sinr / 2;
							}else if(90 <= rotation && rotation <= (90 + centerAnchorLimit) || 270 <= rotation && rotation <= (270 + centerAnchorLimit)){
								offsets[side] = size * cosr / 2 + labelWidth * sinr;
								offsets[leftBottom ? "l" : "r"] = size * sinr / 2 + labelWidth * cosr;
								offsets[leftBottom ? "r" : "l"] = size * sinr / 2;
							}else if(rotation < centerAnchorLimit || (180 < rotation && rotation < (180 + centerAnchorLimit))){
								offsets[side] = size * cosr + labelWidth * sinr;
								offsets[leftBottom ? "r" : "l"] = size * sinr + labelWidth * cosr;
							}else{
								offsets[side] = size * cosr + labelWidth * sinr;
								offsets[leftBottom ? "l" : "r"] = size * sinr + labelWidth * cosr;
							}
							break;
					}
					offsets[side] += labelGap + Math.max(taMajorTick.length, taMinorTick.length) + (o.title ? (tsize + taTitleGap) : 0);
				}
			}
			return offsets;	//	Object
		},
		cleanGroup: function(creator){
			if(this.opt.enableCache && this.group){
				this._lineFreePool = this._lineFreePool.concat(this._lineUsePool);
				this._lineUsePool = [];
				this._textFreePool = this._textFreePool.concat(this._textUsePool);
				this._textUsePool = [];
			}
			this.inherited(arguments);
		},
		createText: function(labelType, creator, x, y, align, textContent, font, fontColor, labelWidth){
			if(!this.opt.enableCache || labelType=="html"){
				return acommon.createText[labelType](
						this.chart,
						creator,
						x,
						y,
						align,
						textContent,
						font,
						fontColor,
						labelWidth
					);
			}
			var text;
			if (this._textFreePool.length > 0){
				text = this._textFreePool.pop();
				text.setShape({x: x, y: y, text: textContent, align: align});
				// For now all items share the same font, no need to re-set it
				//.setFont(font).setFill(fontColor);
				// was cleared, add it back
				creator.add(text);
			}else{
				text = acommon.createText[labelType](
						this.chart,
						creator,
						x,
						y,
						align,
						textContent,
						font,
						fontColor						
					);			
			}
			this._textUsePool.push(text);
			return text;
		},
		createLine: function(creator, params){
			var line;
			if(this.opt.enableCache && this._lineFreePool.length > 0){
				line = this._lineFreePool.pop();
				line.setShape(params);
				// was cleared, add it back
				creator.add(line);
			}else{
				line = creator.createLine(params);
			}
			if(this.opt.enableCache){
				this._lineUsePool.push(line);
			}
			return line;
		},
		render: function(dim, offsets){
			// summary:
			//		Render/draw the axis.
			// dim: Object
			//		An object of the form { width, height}.
			// offsets: Object
			//		An object of the form { l, r, t, b }.
			// returns: dojox/charting/axis2d/Default
			//		The reference to the axis for functional chaining.
			if(!this.dirty || !this.scaler){
				return this;	//	dojox/charting/axis2d/Default
			}
			// prepare variable
			var o = this.opt, ta = this.chart.theme.axis, leftBottom = o.leftBottom, rotation = o.rotation % 360,
				start, stop, titlePos, titleRotation=0, titleOffset, axisVector, tickVector, anchorOffset, labelOffset, labelAlign,
				labelGap = this.chart.theme.axis.tick.labelGap,
				// TODO: we use one font --- of major tick, we need to use major and minor fonts
				taFont = o.font || (ta.majorTick && ta.majorTick.font) || (ta.tick && ta.tick.font),
				taTitleFont = o.titleFont || (ta.title && ta.title.font),
				// TODO: we use one font color --- we need to use different colors
				taFontColor = o.fontColor || (ta.majorTick && ta.majorTick.fontColor) || (ta.tick && ta.tick.fontColor) || "black",
				taTitleFontColor = o.titleFontColor || (ta.title && ta.title.fontColor) || "black",
				taTitleGap = (o.titleGap==0) ? 0 : o.titleGap || (ta.title && ta.title.gap) || 15,
				taTitleOrientation = o.titleOrientation || (ta.title && ta.title.orientation) || "axis",
				taMajorTick = this.chart.theme.getTick("major", o),
				taMinorTick = this.chart.theme.getTick("minor", o),
				taMicroTick = this.chart.theme.getTick("micro", o),

				tickSize = Math.max(taMajorTick.length, taMinorTick.length, taMicroTick.length),
				taStroke = "stroke" in o ? o.stroke : ta.stroke,
				size = taFont ? g.normalizedLength(g.splitFontString(taFont).size) : 0,
				cosr = Math.abs(Math.cos(rotation * Math.PI / 180)),
				sinr = Math.abs(Math.sin(rotation * Math.PI / 180)),
				tsize = taTitleFont ? g.normalizedLength(g.splitFontString(taTitleFont).size) : 0;
			if(typeof labelGap != "number"){
				labelGap = 4; // in pixels
			}
			if(rotation < 0){
				rotation += 360;
			}
			var cachedLabelW = this._getMaxLabelSize();
			cachedLabelW = cachedLabelW && cachedLabelW.majLabelW;
			if(this.vertical){
				start = {y: dim.height - offsets.b};
				stop  = {y: offsets.t};
				titlePos = {y: (dim.height - offsets.b + offsets.t)/2};
				titleOffset = size * sinr + (cachedLabelW || 0) * cosr + labelGap + Math.max(taMajorTick.length, taMinorTick.length) + tsize + taTitleGap;
				axisVector = {x: 0, y: -1};
				labelOffset = {x: 0, y: 0};
				tickVector = {x: 1, y: 0};
				anchorOffset = {x: labelGap, y: 0};
				switch(rotation){
					case 0:
						labelAlign = "end";
						labelOffset.y = size * 0.4;
						break;
					case 90:
						labelAlign = "middle";
						labelOffset.x = -size;
						break;
					case 180:
						labelAlign = "start";
						labelOffset.y = -size * 0.4;
						break;
					case 270:
						labelAlign = "middle";
						break;
					default:
						if(rotation < centerAnchorLimit){
							labelAlign = "end";
							labelOffset.y = size * 0.4;
						}else if(rotation < 90){
							labelAlign = "end";
							labelOffset.y = size * 0.4;
						}else if(rotation < (180 - centerAnchorLimit)){
							labelAlign = "start";
						}else if(rotation < (180 + centerAnchorLimit)){
							labelAlign = "start";
							labelOffset.y = -size * 0.4;
						}else if(rotation < 270){
							labelAlign = "start";
							labelOffset.x = leftBottom ? 0 : size * 0.4;
						}else if(rotation < (360 - centerAnchorLimit)){
							labelAlign = "end";
							labelOffset.x = leftBottom ? 0 : size * 0.4;
						}else{
							labelAlign = "end";
							labelOffset.y = size * 0.4;
						}
				}
				if(leftBottom){
					start.x = stop.x = offsets.l;
					titleRotation = (taTitleOrientation && taTitleOrientation == "away") ? 90 : 270;
					titlePos.x = offsets.l - titleOffset + (titleRotation == 270 ? tsize : 0);
					tickVector.x = -1;
					anchorOffset.x = -anchorOffset.x;
				}else{
					start.x = stop.x = dim.width - offsets.r;
					titleRotation = (taTitleOrientation && taTitleOrientation == "axis") ? 90 : 270;
					titlePos.x = dim.width - offsets.r + titleOffset - (titleRotation == 270 ? 0 : tsize);
					switch(labelAlign){
						case "start":
							labelAlign = "end";
							break;
						case "end":
							labelAlign = "start";
							break;
						case "middle":
							labelOffset.x += size;
							break;
					}
				}
			}else{
				start = {x: offsets.l};
				stop  = {x: dim.width - offsets.r};
				titlePos = {x: (dim.width - offsets.r + offsets.l)/2};
				titleOffset = size * cosr + (cachedLabelW || 0) * sinr + labelGap + Math.max(taMajorTick.length, taMinorTick.length) + tsize + taTitleGap;
				axisVector = {x: 1, y: 0};
				labelOffset = {x: 0, y: 0};
				tickVector = {x: 0, y: 1};
				anchorOffset = {x: 0, y: labelGap};
				switch(rotation){
					case 0:
						labelAlign = "middle";
						labelOffset.y = size;
						break;
					case 90:
						labelAlign = "start";
						labelOffset.x = -size * 0.4;
						break;
					case 180:
						labelAlign = "middle";
						break;
					case 270:
						labelAlign = "end";
						labelOffset.x = size * 0.4;
						break;
					default:
						if(rotation < (90 - centerAnchorLimit)){
							labelAlign = "start";
							labelOffset.y = leftBottom ? size : 0;
						}else if(rotation < (90 + centerAnchorLimit)){
							labelAlign = "start";
							labelOffset.x = -size * 0.4;
						}else if(rotation < 180){
							labelAlign = "start";
							labelOffset.y = leftBottom ? 0 : -size;
						}else if(rotation < (270 - centerAnchorLimit)){
							labelAlign = "end";
							labelOffset.y = leftBottom ? 0 : -size;
						}else if(rotation < (270 + centerAnchorLimit)){
							labelAlign = "end";
							labelOffset.y = leftBottom ? size * 0.4 : 0;
						}else{
							labelAlign = "end";
							labelOffset.y = leftBottom ? size : 0;
						}
				}
				if(leftBottom){
					start.y = stop.y = dim.height - offsets.b;
					titleRotation = (taTitleOrientation && taTitleOrientation == "axis") ? 180 : 0;
					titlePos.y = dim.height - offsets.b + titleOffset - (titleRotation ? tsize : 0);
				}else{
					start.y = stop.y = offsets.t;
					titleRotation = (taTitleOrientation && taTitleOrientation == "away") ? 180 : 0;
					titlePos.y = offsets.t - titleOffset + (titleRotation ? 0 : tsize);
					tickVector.y = -1;
					anchorOffset.y = -anchorOffset.y;
					switch(labelAlign){
						case "start":
							labelAlign = "end";
							break;
						case "end":
							labelAlign = "start";
							break;
						case "middle":
							labelOffset.y -= size;
							break;
					}
				}
			}

			// render shapes

			this.cleanGroup();

			var s = this.group,
				c = this.scaler,
				t = this.ticks,
				f = lin.getTransformerFromModel(this.scaler),
				// GFX Canvas now supports labels, so let's _not_ fallback to HTML anymore on canvas, just use
				// HTML labels if explicitly asked + no rotation + no IE + no Opera
				labelType = (!o.title || !titleRotation) && !rotation && this.opt.htmlLabels && !has("ie") && !has("opera") ? "html" : "gfx",
				dx = tickVector.x * taMajorTick.length,
				dy = tickVector.y * taMajorTick.length,
				skip = this._skipInterval;

			s.createLine({
				x1: start.x,
				y1: start.y,
				x2: stop.x,
				y2: stop.y
			}).setStroke(taStroke);

			//create axis title
			if(o.title){
				var axisTitle = acommon.createText[labelType](
					this.chart,
					s,
					titlePos.x,
					titlePos.y,
					"middle",
					o.title,
					taTitleFont,
					taTitleFontColor
				);
				if(labelType == "html"){
					this.htmlElements.push(axisTitle);
				}else{
					//as soon as rotation is provided, labelType won't be "html"
					//rotate gfx labels
					axisTitle.setTransform(g.matrix.rotategAt(titleRotation, titlePos.x, titlePos.y));
				}
			}

			// go out nicely instead of try/catch
			if(t == null){
				this.dirty = false;
				return this;
			}

			var rel = (t.major.length > 0)?(t.major[0].value - this._majorStart) / c.major.tick:0;
			var canLabel = this.opt.majorLabels;
			arr.forEach(t.major, function(tick, i){
				var offset = f(tick.value), elem,
					x = start.x + axisVector.x * offset,
					y = start.y + axisVector.y * offset;
				i += rel;
				this.createLine(s, {
					x1: x, y1: y,
					x2: x + dx,
					y2: y + dy
				}).setStroke(taMajorTick);
				if(tick.label && (!skip || (i - (1 + skip)) % (1 + skip) == 0)){
					var label = o.maxLabelCharCount ? this.getTextWithLimitCharCount(tick.label, taFont, o.maxLabelCharCount) : {
						text: tick.label,
						truncated: false
					};
					label = o.maxLabelSize ? this.getTextWithLimitLength(label.text, taFont, o.maxLabelSize, label.truncated) : label;
					elem = this.createText(labelType,
						s,
						x + dx + anchorOffset.x + (rotation ? 0 : labelOffset.x),
						y + dy + anchorOffset.y + (rotation ? 0 : labelOffset.y),
						labelAlign,
						label.text,
						taFont,
						taFontColor
						//cachedLabelW
					);
					// if bidi support was required, the textDir is "auto" and truncation
					// took place, we need to update the dir of the element for cases as:
					// Fool label: 111111W (W for bidi character)
					// truncated label: 11...
					// in this case for auto textDir the dir will be "ltr" which is wrong.
					if(this.chart.truncateBidi  && label.truncated){
						this.chart.truncateBidi(elem, tick.label, labelType);
					}
					label.truncated && this.labelTooltip(elem, this.chart, tick.label, label.text, taFont, labelType);
					if(labelType == "html"){
						this.htmlElements.push(elem);
					}else if(rotation){
						elem.setTransform([
							{dx: labelOffset.x, dy: labelOffset.y},
							g.matrix.rotategAt(
								rotation,
								x + dx + anchorOffset.x,
								y + dy + anchorOffset.y
							)
						]);
					}
				}
			}, this);

			dx = tickVector.x * taMinorTick.length;
			dy = tickVector.y * taMinorTick.length;
			canLabel = this.opt.minorLabels && c.minMinorStep <= c.minor.tick * c.bounds.scale;
			arr.forEach(t.minor, function(tick){
				var offset = f(tick.value), elem,
					x = start.x + axisVector.x * offset,
					y = start.y + axisVector.y * offset;
				this.createLine(s, {
					x1: x, y1: y,
					x2: x + dx,
					y2: y + dy
				}).setStroke(taMinorTick);
				if(canLabel && tick.label){
					var label = o.maxLabelCharCount ? this.getTextWithLimitCharCount(tick.label, taFont, o.maxLabelCharCount) : {
						text: tick.label,
						truncated: false
					};
					label = o.maxLabelSize ? this.getTextWithLimitLength(label.text, taFont, o.maxLabelSize, label.truncated) : label;
					elem = this.createText(labelType,
						s,
						x + dx + anchorOffset.x + (rotation ? 0 : labelOffset.x),
						y + dy + anchorOffset.y + (rotation ? 0 : labelOffset.y),
						labelAlign,
						label.text,
						taFont,
						taFontColor
						//cachedLabelW
					);
					// if bidi support was required, the textDir is "auto" and truncation
					// took place, we need to update the dir of the element for cases as:
					// Fool label: 111111W (W for bidi character)
					// truncated label: 11...
					// in this case for auto textDir the dir will be "ltr" which is wrong.
					if(this.chart.getTextDir && label.truncated){
						this.chart.truncateBidi(elem, tick.label, labelType);
					}
					label.truncated && this.labelTooltip(elem, this.chart, tick.label, label.text, taFont, labelType);
					if(labelType == "html"){
						this.htmlElements.push(elem);
					}else if(rotation){
						elem.setTransform([
							{dx: labelOffset.x, dy: labelOffset.y},
							g.matrix.rotategAt(
								rotation,
								x + dx + anchorOffset.x,
								y + dy + anchorOffset.y
							)
						]);
					}
				}
			}, this);

			dx = tickVector.x * taMicroTick.length;
			dy = tickVector.y * taMicroTick.length;
			arr.forEach(t.micro, function(tick){
				var offset = f(tick.value), elem,
					x = start.x + axisVector.x * offset,
					y = start.y + axisVector.y * offset;
					this.createLine(s, {
						x1: x, y1: y,
						x2: x + dx,
						y2: y + dy
					}).setStroke(taMicroTick);
			}, this);

			this.dirty = false;
			return this;	//	dojox/charting/axis2d/Default
		},
		labelTooltip: function(elem, chart, label, truncatedLabel, font, elemType){
			var modules = ["dijit/Tooltip"];
			var aroundRect = {type: "rect"}, position = ["above", "below"],
				fontWidth = g._base._getTextBox(truncatedLabel, {font: font}).w || 0,
				fontHeight = font ? g.normalizedLength(g.splitFontString(font).size) : 0;
			if(elemType == "html"){
				lang.mixin(aroundRect, domGeom.position(elem.firstChild, true));
				aroundRect.width = Math.ceil(fontWidth);
				aroundRect.height = Math.ceil(fontHeight);
				this._events.push({
					shape:  dojo,
					handle: connect.connect(elem.firstChild, "onmouseover", this, function(e){
						require(modules, function(Tooltip){
							Tooltip.show(label, aroundRect, position);
						});
					})
				});
				this._events.push({
					shape:  dojo,
					handle: connect.connect(elem.firstChild, "onmouseout", this, function(e){
						require(modules, function(Tooltip){
							Tooltip.hide(aroundRect);
						});
					})
				});
			}else{
				var shp = elem.getShape(),
					lt = chart.getCoords();
				aroundRect = lang.mixin(aroundRect, {
					x: shp.x - fontWidth / 2,
					y: shp.y
				});
				aroundRect.x += lt.x;
				aroundRect.y += lt.y;
				aroundRect.x = Math.round(aroundRect.x);
				aroundRect.y = Math.round(aroundRect.y);
				aroundRect.width = Math.ceil(fontWidth);
				aroundRect.height = Math.ceil(fontHeight);
				this._events.push({
					shape:  elem,
					handle: elem.connect("onmouseenter", this, function(e){
						require(modules, function(Tooltip){
							Tooltip.show(label, aroundRect, position);
						});
					})
				});
				this._events.push({
					shape:  elem,
					handle: elem.connect("onmouseleave", this, function(e){
						require(modules, function(Tooltip){
							Tooltip.hide(aroundRect);
						});
					})
				});
			}
		}
	});
});
