define(["dojo/_base/kernel", "dojo/_base/lang", "dojo/_base/declare", "dojo/_base/Color", "dojo/_base/connect", "dojox/color/_base", 
		"./PlotAction", "dojo/fx/easing", "dojox/gfx/fx"], 
	function(dojo, lang, declare, Color, hub, c, PlotAction, dfe, dgf){

	/*=====
	dojo.declare("dojox.charting.action2d.__HighlightCtorArgs", dojox.charting.action2d.__PlotActionCtorArgs, {
		//	summary:
		//		Additional arguments for highlighting actions.
	
		//	highlight: String|dojo.Color|Function?
		//		Either a color or a function that creates a color when highlighting happens.
		highlight: null
	});
	var PlotAction = dojox.charting.action2d.PlotAction;
	=====*/
	
	var DEFAULT_SATURATION  = 100,	// %
		DEFAULT_LUMINOSITY1 = 75,	// %
		DEFAULT_LUMINOSITY2 = 50,	// %
		cc = function(color){
			return function(){ return color; };
		},

		hl = function(color){
			var a = new c.Color(color),
				x = a.toHsl();
			if(x.s == 0){
				x.l = x.l < 50 ? 100 : 0;
			}else{
				x.s = DEFAULT_SATURATION;
				if(x.l < DEFAULT_LUMINOSITY2){
					x.l = DEFAULT_LUMINOSITY1;
				}else if(x.l > DEFAULT_LUMINOSITY1){
					x.l = DEFAULT_LUMINOSITY2;
				}else{
					x.l = x.l - DEFAULT_LUMINOSITY2 > DEFAULT_LUMINOSITY1 - x.l ?
						DEFAULT_LUMINOSITY2 : DEFAULT_LUMINOSITY1;
				}
			}
			return c.fromHsl(x);
		};

	return declare("dojox.charting.action2d.Highlight", PlotAction, {
		//	summary:
		//		Creates a highlighting action on a plot, where an element on that plot
		//		has a highlight on it.

		// the data description block for the widget parser
		defaultParams: {
			duration: 400,	// duration of the action in ms
			easing:   dfe.backOut	// easing for the action
		},
		optionalParams: {
			highlight: "red"	// name for the highlight color
								// programmatic instantiation can use functions and color objects
		},

		constructor: function(chart, plot, kwArgs){
			//	summary:
			//		Create the highlighting action and connect it to the plot.
			//	chart: dojox.charting.Chart
			//		The chart this action belongs to.
			//	plot: String?
			//		The plot this action is attached to.  If not passed, "default" is assumed.
			//	kwArgs: charting.action2d.__HighlightCtorArgs?
			//		Optional keyword arguments object for setting parameters.
			var a = kwArgs && kwArgs.highlight;
			this.colorFun = a ? (lang.isFunction(a) ? a : cc(a)) : hl;

			this.connect();
		},

		process: function(o){
			//	summary:
			//		Process the action on the given object.
			//	o: dojox.gfx.Shape
			//		The object on which to process the highlighting action.
			if(!o.shape || !(o.type in this.overOutEvents)){ return; }

			var runName = o.run.name, index = o.index, anim, startFill, endFill;

			if(runName in this.anim){
				anim = this.anim[runName][index];
			}else{
				this.anim[runName] = {};
			}

			if(anim){
				anim.action.stop(true);
			}else{
				var color = o.shape.getFill();
				if(!color || !(color instanceof Color)){
					return;
				}
				this.anim[runName][index] = anim = {
					start: color,
					end:   this.colorFun(color)
				};
			}

			var start = anim.start, end = anim.end;
			if(o.type == "onmouseout"){
				// swap colors
				var t = start;
				start = end;
				end = t;
			}

			anim.action = dgf.animateFill({
				shape:    o.shape,
				duration: this.duration,
				easing:   this.easing,
				color:    {start: start, end: end}
			});
			if(o.type == "onmouseout"){
				hub.connect(anim.action, "onEnd", this, function(){
					if(this.anim[runName]){
						delete this.anim[runName][index];
					}
				});
			}
			anim.action.play();
		}
	});
	
});
