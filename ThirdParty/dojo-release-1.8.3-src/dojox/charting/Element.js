define(["dojo/_base/lang", "dojo/_base/array", "dojo/dom-construct","dojo/_base/declare", "dojox/gfx", "dojox/gfx/shape"],
	function(lang, arr, domConstruct, declare, gfx, shape){

	return declare("dojox.charting.Element", null, {
		// summary:
		//		A base class that is used to build other elements of a chart, such as
		//		a series.
		// chart: dojox/charting/Chart
		//		The parent chart for this element.
		// group: dojox/gfx/shape.Group
		//		The visual GFX group representing this element.
		// htmlElement: Array
		//		Any DOMNodes used as a part of this element (such as HTML-based labels).
		// dirty: Boolean
		//		A flag indicating whether or not this element needs to be rendered.

		chart: null,
		group: null,
		htmlElements: null,
		dirty: true,

		constructor: function(chart){
			// summary:
			//		Creates a new charting element.
			// chart: dojox/charting/Chart
			//		The chart that this element belongs to.
			this.chart = chart;
			this.group = null;
			this.htmlElements = [];
			this.dirty = true;
			this.trailingSymbol = "...";
			this._events = [];
		},
		purgeGroup: function(){
			// summary:
			//		Clear any elements out of our group, and destroy the group.
			// returns: dojox/charting/Element
			//		A reference to this object for functional chaining.
			this.destroyHtmlElements();
			if(this.group){
				// since 1.7.x we need dispose shape otherwise there is a memoryleak
				this.group.removeShape();
				var children = this.group.children;
				for(var i = 0; i < children.length;++i){
					shape.dispose(children[i], true);
				}
				this.group.clear();
				shape.dispose(this.group, true);
				this.group = null;
			}
			this.dirty = true;
			if(this._events.length){
				arr.forEach(this._events, function(item){
					item.shape.disconnect(item.handle);
				});
				this._events = [];
			}
			return this;	//	dojox.charting.Element
		},
		cleanGroup: function(creator){
			// summary:
			//		Clean any elements (HTML or GFX-based) out of our group, and create a new one.
			// creator: dojox/gfx/shape.Surface?
			//		An optional surface to work with.
			// returns: dojox/charting/Element
			//		A reference to this object for functional chaining.
			this.destroyHtmlElements();
			if(!creator){ creator = this.chart.surface; }
			if(this.group){
				var children = this.group.children;
				for(var i = 0; i < children.length;++i){
					shape.dispose(children[i], true);
				}
				this.group.clear();
			}else{
				this.group = creator.createGroup();
			}
			this.dirty = true;
			return this;	//	dojox.charting.Element
		},
		destroyHtmlElements: function(){
			// summary:
			//		Destroy any DOMNodes that may have been created as a part of this element.
			if(this.htmlElements.length){
				arr.forEach(this.htmlElements, domConstruct.destroy);
				this.htmlElements = [];
			}
		},
		destroy: function(){
			// summary:
			//		API addition to conform to the rest of the Dojo Toolkit's standard.
			this.purgeGroup();
		},
		//text utilities
		getTextWidth: function(s, font){
			return gfx._base._getTextBox(s, {font: font}).w || 0;
		},
		getTextWithLimitLength: function(s, font, limitWidth, truncated){
			// summary:
			//		Get the truncated string based on the limited width in px(dichotomy algorithm)
			// s: String?
			//		candidate text.
			// font: String?
			//		text's font style.
			// limitWidth: Number?
			//		text limited width in px.
			// truncated: Boolean?
			//		whether the input text(s) has already been truncated.
			// returns: Object
			// |	{
			// |		text: processed text, maybe truncated or not,
			// |		truncated: whether text has been truncated
			// |	}
			if(!s || s.length <= 0){
				return {
					text: "",
					truncated: truncated || false
				};
			}
			if(!limitWidth || limitWidth <= 0){
				return {
					text: s,
					truncated: truncated || false
				};
			}
			var delta = 2,
				//golden section for dichotomy algorithm
				trucPercentage = 0.618,
				minStr = s.substring(0,1) + this.trailingSymbol,
				minWidth = this.getTextWidth(minStr, font);
			if(limitWidth <= minWidth){
				return {
					text: minStr,
					truncated: true
				};
			}
			var width = this.getTextWidth(s, font);
			if(width <= limitWidth){
				return {
					text: s,
					truncated: truncated || false
				};
			}else{
				var begin = 0,
					end = s.length;
				while(begin < end){
					if(end - begin <= delta ){
						while (this.getTextWidth(s.substring(0, begin) + this.trailingSymbol, font) > limitWidth) {
							begin -= 1;
						}
						return {
							text: (s.substring(0,begin) + this.trailingSymbol),
							truncated: true
							};
					}
					var index = begin + Math.round((end - begin) * trucPercentage),
						widthIntercepted = this.getTextWidth(s.substring(0, index), font);
					if(widthIntercepted < limitWidth){
						begin = index;
						end = end;
					}else{
						begin = begin;
						end = index;
					}
				}
			}
		},
		getTextWithLimitCharCount: function(s, font, wcLimit, truncated){
			// summary:
			//		Get the truncated string based on the limited character count(dichotomy algorithm)
			// s: String?
			//		candidate text.
			// font: String?
			//		text's font style.
			// wcLimit: Number?
			//		text limited character count.
			// truncated: Boolean?
			//		whether the input text(s) has already been truncated.
			// returns: Object
			// |	{
			// |		text: processed text, maybe truncated or not,
			// |		truncated: whether text has been truncated
			// |	}
			if (!s || s.length <= 0) {
				return {
					text: "",
					truncated: truncated || false
				};
			}
			if(!wcLimit || wcLimit <= 0 || s.length <= wcLimit){
				return {
					text: s,
					truncated: truncated || false
				};
			}
			return {
				text: s.substring(0, wcLimit) + this.trailingSymbol,
				truncated: true
			};
		},
		// fill utilities
		_plotFill: function(fill, dim, offsets){
			// process a plot-wide fill
			if(!fill || !fill.type || !fill.space){
				return fill;
			}
			var space = fill.space, span;
			switch(fill.type){
				case "linear":
					if(space === "plot" || space === "shapeX" || space === "shapeY"){
						// clone a fill so we can modify properly directly
						fill = gfx.makeParameters(gfx.defaultLinearGradient, fill);
						fill.space = space;
						// process dimensions
						if(space === "plot" || space === "shapeX"){
							// process Y
							span = dim.height - offsets.t - offsets.b;
							fill.y1 = offsets.t + span * fill.y1 / 100;
							fill.y2 = offsets.t + span * fill.y2 / 100;
						}
						if(space === "plot" || space === "shapeY"){
							// process X
							span = dim.width - offsets.l - offsets.r;
							fill.x1 = offsets.l + span * fill.x1 / 100;
							fill.x2 = offsets.l + span * fill.x2 / 100;
						}
					}
					break;
				case "radial":
					if(space === "plot"){
						// this one is used exclusively for scatter charts
						// clone a fill so we can modify properly directly
						fill = gfx.makeParameters(gfx.defaultRadialGradient, fill);
						fill.space = space;
						// process both dimensions
						var spanX = dim.width  - offsets.l - offsets.r,
							spanY = dim.height - offsets.t - offsets.b;
						fill.cx = offsets.l + spanX * fill.cx / 100;
						fill.cy = offsets.t + spanY * fill.cy / 100;
						fill.r  = fill.r * Math.sqrt(spanX * spanX + spanY * spanY) / 200;
					}
					break;
				case "pattern":
					if(space === "plot" || space === "shapeX" || space === "shapeY"){
						// clone a fill so we can modify properly directly
						fill = gfx.makeParameters(gfx.defaultPattern, fill);
						fill.space = space;
						// process dimensions
						if(space === "plot" || space === "shapeX"){
							// process Y
							span = dim.height - offsets.t - offsets.b;
							fill.y = offsets.t + span * fill.y / 100;
							fill.height = span * fill.height / 100;
						}
						if(space === "plot" || space === "shapeY"){
							// process X
							span = dim.width - offsets.l - offsets.r;
							fill.x = offsets.l + span * fill.x / 100;
							fill.width = span * fill.width / 100;
						}
					}
					break;
			}
			return fill;
		},
		_shapeFill: function(fill, bbox){
			// process shape-specific fill
			if(!fill || !fill.space){
				return fill;
			}
			var space = fill.space, span;
			switch(fill.type){
				case "linear":
					if(space === "shape" || space === "shapeX" || space === "shapeY"){
						// clone a fill so we can modify properly directly
						fill = gfx.makeParameters(gfx.defaultLinearGradient, fill);
						fill.space = space;
						// process dimensions
						if(space === "shape" || space === "shapeX"){
							// process X
							span = bbox.width;
							fill.x1 = bbox.x + span * fill.x1 / 100;
							fill.x2 = bbox.x + span * fill.x2 / 100;
						}
						if(space === "shape" || space === "shapeY"){
							// process Y
							span = bbox.height;
							fill.y1 = bbox.y + span * fill.y1 / 100;
							fill.y2 = bbox.y + span * fill.y2 / 100;
						}
					}
					break;
				case "radial":
					if(space === "shape"){
						// this one is used exclusively for bubble charts and pie charts
						// clone a fill so we can modify properly directly
						fill = gfx.makeParameters(gfx.defaultRadialGradient, fill);
						fill.space = space;
						// process both dimensions
						fill.cx = bbox.x + bbox.width  / 2;
						fill.cy = bbox.y + bbox.height / 2;
						fill.r  = fill.r * bbox.width  / 200;
					}
					break;
				case "pattern":
					if(space === "shape" || space === "shapeX" || space === "shapeY"){
						// clone a fill so we can modify properly directly
						fill = gfx.makeParameters(gfx.defaultPattern, fill);
						fill.space = space;
						// process dimensions
						if(space === "shape" || space === "shapeX"){
							// process X
							span = bbox.width;
							fill.x = bbox.x + span * fill.x / 100;
							fill.width = span * fill.width / 100;
						}
						if(space === "shape" || space === "shapeY"){
							// process Y
							span = bbox.height;
							fill.y = bbox.y + span * fill.y / 100;
							fill.height = span * fill.height / 100;
						}
					}
					break;
			}
			return fill;
		},
		_pseudoRadialFill: function(fill, center, radius, start, end){
			// process pseudo-radial fills
			if(!fill || fill.type !== "radial" || fill.space !== "shape"){
				return fill;
			}
			// clone and normalize fill
			var space = fill.space;
			fill = gfx.makeParameters(gfx.defaultRadialGradient, fill);
			fill.space = space;
			if(arguments.length < 4){
				// process both dimensions
				fill.cx = center.x;
				fill.cy = center.y;
				fill.r  = fill.r * radius / 100;
				return fill;
			}
			// convert to a linear gradient
			var angle = arguments.length < 5 ? start : (end + start) / 2;
			return {
				type: "linear",
				x1: center.x,
				y1: center.y,
				x2: center.x + fill.r * radius * Math.cos(angle) / 100,
				y2: center.y + fill.r * radius * Math.sin(angle) / 100,
				colors: fill.colors
			};
			return fill;
		}
	});
});
