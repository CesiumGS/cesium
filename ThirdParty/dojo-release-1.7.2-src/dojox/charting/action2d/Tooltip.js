define(["dojo/_base/kernel", "dijit/Tooltip","dojo/_base/lang", "dojo/_base/html", "dojo/_base/declare", "./PlotAction", 
	"dojox/gfx/matrix", "dojox/lang/functional", "dojox/lang/functional/scan", "dojox/lang/functional/fold"], 
	function(dojo, Tooltip, lang, html, declare, PlotAction, m, df, dfs, dff){
	
	/*=====
	dojo.declare("dojox.charting.action2d.__TooltipCtorArgs", dojox.charting.action2d.__PlotActionCtorArgs, {
		//	summary:
		//		Additional arguments for tooltip actions.
	
		//	text: Function?
		//		The function that produces the text to be shown within a tooltip.  By default this will be
		//		set by the plot in question, by returning the value of the element.
		text: null
	});
	var PlotAction = dojox.charting.action2d.PlotAction;
	=====*/

	var DEFAULT_TEXT = function(o){
		var t = o.run && o.run.data && o.run.data[o.index];
		if(t && typeof t != "number" && (t.tooltip || t.text)){
			return t.tooltip || t.text;
		}
		if(o.element == "candlestick"){
			return '<table cellpadding="1" cellspacing="0" border="0" style="font-size:0.9em;">'
				+ '<tr><td>Open:</td><td align="right"><strong>' + o.data.open + '</strong></td></tr>'
				+ '<tr><td>High:</td><td align="right"><strong>' + o.data.high + '</strong></td></tr>'
				+ '<tr><td>Low:</td><td align="right"><strong>' + o.data.low + '</strong></td></tr>'
				+ '<tr><td>Close:</td><td align="right"><strong>' + o.data.close + '</strong></td></tr>'
				+ (o.data.mid !== undefined ? '<tr><td>Mid:</td><td align="right"><strong>' + o.data.mid + '</strong></td></tr>' : '')
				+ '</table>';
		}
		return o.element == "bar" ? o.x : o.y;
	};

	var pi4 = Math.PI / 4, pi2 = Math.PI / 2;
	
	return declare("dojox.charting.action2d.Tooltip", PlotAction, {
		//	summary:
		//		Create an action on a plot where a tooltip is shown when hovering over an element.

		// the data description block for the widget parser
		defaultParams: {
			text: DEFAULT_TEXT	// the function to produce a tooltip from the object
		},
		optionalParams: {},	// no optional parameters

		constructor: function(chart, plot, kwArgs){
			//	summary:
			//		Create the tooltip action and connect it to the plot.
			//	chart: dojox.charting.Chart
			//		The chart this action belongs to.
			//	plot: String?
			//		The plot this action is attached to.  If not passed, "default" is assumed.
			//	kwArgs: dojox.charting.action2d.__TooltipCtorArgs?
			//		Optional keyword arguments object for setting parameters.
			this.text = kwArgs && kwArgs.text ? kwArgs.text : DEFAULT_TEXT;
			
			this.connect();
		},
		
		process: function(o){
			//	summary:
			//		Process the action on the given object.
			//	o: dojox.gfx.Shape
			//		The object on which to process the highlighting action.
			if(o.type === "onplotreset" || o.type === "onmouseout"){
                Tooltip.hide(this.aroundRect);
				this.aroundRect = null;
				if(o.type === "onplotreset"){
					delete this.angles;
				}
				return;
			}
			
			if(!o.shape || o.type !== "onmouseover"){ return; }
			
			// calculate relative coordinates and the position
			var aroundRect = {type: "rect"}, position = ["after", "before"];
			switch(o.element){
				case "marker":
					aroundRect.x = o.cx;
					aroundRect.y = o.cy;
					aroundRect.w = aroundRect.h = 1;
					break;
				case "circle":
					aroundRect.x = o.cx - o.cr;
					aroundRect.y = o.cy - o.cr;
					aroundRect.w = aroundRect.h = 2 * o.cr;
					break;
				case "column":
					position = ["above", "below"];
					// intentional fall down
				case "bar":
					aroundRect = lang.clone(o.shape.getShape());
					aroundRect.w = aroundRect.width;
					aroundRect.h = aroundRect.height;
					break;
				case "candlestick":
					aroundRect.x = o.x;
					aroundRect.y = o.y;
					aroundRect.w = o.width;
					aroundRect.h = o.height;
					break;
				default:
				//case "slice":
					if(!this.angles){
						// calculate the running total of slice angles
						if(typeof o.run.data[0] == "number"){
							this.angles = df.map(df.scanl(o.run.data, "+", 0),
								"* 2 * Math.PI / this", df.foldl(o.run.data, "+", 0));
						}else{
							this.angles = df.map(df.scanl(o.run.data, "a + b.y", 0),
								"* 2 * Math.PI / this", df.foldl(o.run.data, "a + b.y", 0));
						}
					}
					var startAngle = m._degToRad(o.plot.opt.startAngle),
						angle = (this.angles[o.index] + this.angles[o.index + 1]) / 2 + startAngle;
					aroundRect.x = o.cx + o.cr * Math.cos(angle);
					aroundRect.y = o.cy + o.cr * Math.sin(angle);
					aroundRect.w = aroundRect.h = 1;
					// calculate the position
					if(angle < pi4){
						// do nothing: the position is right
					}else if(angle < pi2 + pi4){
						position = ["below", "above"];
					}else if(angle < Math.PI + pi4){
						position = ["before", "after"];
					}else if(angle < 2 * Math.PI - pi4){
						position = ["above", "below"];
					}
					/*
					else{
						// do nothing: the position is right
					}
					*/
					break;
			}
			
			// adjust relative coordinates to absolute, and remove fractions
			var lt = this.chart.getCoords();
			aroundRect.x += lt.x;
			aroundRect.y += lt.y;
			aroundRect.x = Math.round(aroundRect.x);
			aroundRect.y = Math.round(aroundRect.y);
			aroundRect.w = Math.ceil(aroundRect.w);
			aroundRect.h = Math.ceil(aroundRect.h);
			this.aroundRect = aroundRect;

			var tooltip = this.text(o);
			if(this.chart.getTextDir){
				var isChartDirectionRtl = (html.style(this.chart.node,"direction") == "rtl");
				var isBaseTextDirRtl = (this.chart.getTextDir(tooltip) == "rtl");
			}
			if(tooltip){
				if(isBaseTextDirRtl && !isChartDirectionRtl){
					Tooltip.show("<span dir = 'rtl'>" + tooltip +"</span>", this.aroundRect, position);
				}
				else if(!isBaseTextDirRtl && isChartDirectionRtl){
					Tooltip.show("<span dir = 'ltr'>" + tooltip +"</span>", this.aroundRect, position);
				}else{
					Tooltip.show(tooltip, this.aroundRect, position);
				}
			}
		}
	});
});
