define(["dojo/_base/kernel", "dojo/_base/lang", "dojo/_base/array","dojo/_base/html","dojo/_base/declare", "dojo/query",
	"dijit/_Widget", "../Chart", "dojox/lang/utils", "dojox/lang/functional","dojox/lang/functional/lambda",
	"dijit/_base/manager"], 
	function(kernel, lang, arr, html, declare, query, Widget, Chart, du, df, dfl){
/*=====
var Widget = dijit._Widget;
=====*/
	var collectParams, collectAxisParams, collectPlotParams,
		collectActionParams, collectDataParams,
		notNull = function(o){ return o; },
		dc = lang.getObject("dojox.charting");
	
	var ChartWidget = declare("dojox.charting.widget.Chart", Widget, {
		// parameters for the markup
		
		// theme for the chart
		theme: null,
		
		// margins for the chart: {l: 10, r: 10, t: 10, b: 10}
		margins: null,
		
		// chart area, define them as undefined to:
		// allow the parser to take them into account
		// but make sure they have no defined value to not override theme
		stroke: undefined,
		fill:   undefined,
		
		// methods
		
		buildRendering: function(){
			this.inherited(arguments);
			
			n = this.domNode;
			
			// collect chart parameters
			var axes    = query("> .axis", n).map(collectAxisParams).filter(notNull),
				plots   = query("> .plot", n).map(collectPlotParams).filter(notNull),
				actions = query("> .action", n).map(collectActionParams).filter(notNull),
				series  = query("> .series", n).map(collectDataParams).filter(notNull);
			
			// build the chart
			n.innerHTML = "";
			var c = this.chart = new Chart(n, {
				margins: this.margins,
				stroke:  this.stroke,
				fill:    this.fill,
				textDir: this.textDir
			});
			
			// add collected parameters
			if(this.theme){
				c.setTheme(this.theme);
			}
			axes.forEach(function(axis){
				c.addAxis(axis.name, axis.kwArgs);
			});
			plots.forEach(function(plot){
				c.addPlot(plot.name, plot.kwArgs);
			});
			
			this.actions = actions.map(function(action){
				return new action.action(c, action.plot, action.kwArgs);
			});
			
			var render = df.foldl(series, function(render, series){
				if(series.type == "data"){
					c.addSeries(series.name, series.data, series.kwArgs);
					render = true;
				}else{
					c.addSeries(series.name, [0], series.kwArgs);
					var kw = {};
					du.updateWithPattern(
						kw,
						series.kwArgs,
						{
							"query": "",
							"queryOptions": null,
							"start": 0,
							"count": 1 //,
							// "sort": []
						},
						true
					);
					if(series.kwArgs.sort){
						// sort is a complex object type and doesn't survive coercian
						kw.sort = lang.clone(series.kwArgs.sort);
					}
					lang.mixin(kw, {
						onComplete: function(data){
							var values;
							if("valueFn" in series.kwArgs){
								var fn = series.kwArgs.valueFn;
								values = arr.map(data, function(x){
									return fn(series.data.getValue(x, series.field, 0));
								});
							}else{
								values = arr.map(data, function(x){
									return series.data.getValue(x, series.field, 0);
								});
							}
							c.addSeries(series.name, values, series.kwArgs).render();
						}
					});
					series.data.fetch(kw);
				}
				return render;
			}, false);
			if(render){ c.render(); }
		},
		destroy: function(){
			// summary: properly destroy the widget
			this.chart.destroy();
			this.inherited(arguments);
		},
		resize: function(box){
			//	summary:
			//		Resize the widget.
			//	description:
			//		Resize the domNode and the widget surface to the dimensions of a box of the following form:
			//			`{ l: 50, t: 200, w: 300: h: 150 }`
			//		If no box is provided, resize the surface to the marginBox of the domNode.
			//	box:
			//		If passed, denotes the new size of the widget.
			this.chart.resize(box);
		}
	});
	
	collectParams = function(node, type, kw){
		var dp = eval("(" + type + ".prototype.defaultParams)");
		var x, attr;
		for(x in dp){
			if(x in kw){ continue; }
			attr = node.getAttribute(x);
			kw[x] = du.coerceType(dp[x], attr == null || typeof attr == "undefined" ? dp[x] : attr);
		}
		var op = eval("(" + type + ".prototype.optionalParams)");
		for(x in op){
			if(x in kw){ continue; }
			attr = node.getAttribute(x);
			if(attr != null){
				kw[x] = du.coerceType(op[x], attr);
			}
		}
	};
	
	collectAxisParams = function(node){
		var name = node.getAttribute("name"), type = node.getAttribute("type");
		if(!name){ return null; }
		var o = {name: name, kwArgs: {}}, kw = o.kwArgs;
		if(type){
			if(dc.axis2d[type]){
				type = dojo._scopeName + "x.charting.axis2d." + type;
			}
			var axis = eval("(" + type + ")");
			if(axis){ kw.type = axis; }
		}else{
			type = dojo._scopeName + "x.charting.axis2d.Default";
		}
		collectParams(node, type, kw);
		// compatibility conversions
		if(kw.font || kw.fontColor){
			if(!kw.tick){
				kw.tick = {};
			}
			if(kw.font){
				kw.tick.font = kw.font;
			}
			if(kw.fontColor){
				kw.tick.fontColor = kw.fontColor;
			}
		}
		return o;
	};
	
	collectPlotParams = function(node){
		// var name = d.attr(node, "name"), type = d.attr(node, "type");
		var name = node.getAttribute("name"), type = node.getAttribute("type");
		if(!name){ return null; }
		var o = {name: name, kwArgs: {}}, kw = o.kwArgs;
		if(type){
			if(dc.plot2d && dc.plot2d[type]){
				type = dojo._scopeName + "x.charting.plot2d." + type;
			}
			var plot = eval("(" + type + ")");
			if(plot){ kw.type = plot; }
		}else{
			type = dojo._scopeName + "x.charting.plot2d.Default";
		}
		collectParams(node, type, kw);
		return o;
	};
	
	collectActionParams = function(node){
		// var plot = d.attr(node, "plot"), type = d.attr(node, "type");
		var plot = node.getAttribute("plot"), type = node.getAttribute("type");
		if(!plot){ plot = "default"; }
		var o = {plot: plot, kwArgs: {}}, kw = o.kwArgs;
		if(type){
			if(dc.action2d[type]){
				type = dojo._scopeName + "x.charting.action2d." + type;
			}
			var action = eval("(" + type + ")");
			if(!action){ return null; }
			o.action = action;
		}else{
			return null;
		}
		collectParams(node, type, kw);
		return o;
	};

	collectDataParams = function(node){
		var ga = lang.partial(html.attr, node);
		var name = ga("name");
		if(!name){ return null; }
		var o = { name: name, kwArgs: {} }, kw = o.kwArgs, t;
		t = ga("plot");
		if(t != null){ kw.plot = t; }
		t = ga("marker");
		if(t != null){ kw.marker = t; }
		t = ga("stroke");
		if(t != null){ kw.stroke = eval("(" + t + ")"); }
		t = ga("outline");
		if(t != null){ kw.outline = eval("(" + t + ")"); }
		t = ga("shadow");
		if(t != null){ kw.shadow = eval("(" + t + ")"); }
		t = ga("fill");
		if(t != null){ kw.fill = eval("(" + t + ")"); }
		t = ga("font");
		if(t != null){ kw.font = t; }
		t = ga("fontColor");
		if(t != null){ kw.fontColor = eval("(" + t + ")"); }
		t = ga("legend");
		if(t != null){ kw.legend = t; }
		t = ga("data");
		if(t != null){
			o.type = "data";
			o.data = t ? arr.map(String(t).split(','), Number) : [];
			return o;
		}
		t = ga("array");
		if(t != null){
			o.type = "data";
			o.data = eval("(" + t + ")");
			return o;
		}
		t = ga("store");
		if(t != null){
			o.type = "store";
			o.data = eval("(" + t + ")");
			t = ga("field");
			o.field = t != null ? t : "value";
			t = ga("query");
			if(!!t){ kw.query = t; }
			t = ga("queryOptions");
			if(!!t){ kw.queryOptions = eval("(" + t + ")"); }
			t = ga("start");
			if(!!t){ kw.start = Number(t); }
			t = ga("count");
			if(!!t){ kw.count = Number(t); }
			t = ga("sort");
			if(!!t){ kw.sort = eval("("+t+")"); }
			t = ga("valueFn");
			if(!!t){ kw.valueFn = dfl.lambda(t); }
			return o;
		}
		return null;
	};
	
	return ChartWidget;
});
