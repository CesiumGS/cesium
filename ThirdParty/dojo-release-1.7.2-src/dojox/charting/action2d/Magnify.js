define(["dojo/_base/connect", "dojo/_base/declare", 
	"./PlotAction", "dojox/gfx/matrix", 
	"dojox/gfx/fx", "dojo/fx", "dojo/fx/easing"], 
	function(Hub, declare, PlotAction, m, gf, df, dfe){

	/*=====
	dojo.declare("dojox.charting.action2d.__MagnifyCtorArgs", dojox.charting.action2d.__PlotActionCtorArgs, {
		//	summary:
		//		Additional arguments for highlighting actions.
	
		//	scale: Number?
		//		The amount to magnify the given object to.  Default is 2.
		scale: 2
	});
	var PlotAction = dojox.charting.action2d.PlotAction;
	=====*/
	
	var DEFAULT_SCALE = 2;

	return declare("dojox.charting.action2d.Magnify", PlotAction, {
		//	summary:
		//		Create an action that magnifies the object the action is applied to.

		// the data description block for the widget parser
		defaultParams: {
			duration: 400,	// duration of the action in ms
			easing:   dfe.backOut,	// easing for the action
			scale:    DEFAULT_SCALE	// scale of magnification
		},
		optionalParams: {},	// no optional parameters

		constructor: function(chart, plot, kwArgs){
			//	summary:
			//		Create the magnifying action.
			//	chart: dojox.charting.Chart
			//		The chart this action belongs to.
			//	plot: String?
			//		The plot to apply the action to. If not passed, "default" is assumed.
			//	kwArgs: dojox.charting.action2d.__MagnifyCtorArgs?
			//		Optional keyword arguments for this action.

			// process optional named parameters
			this.scale = kwArgs && typeof kwArgs.scale == "number" ? kwArgs.scale : DEFAULT_SCALE;

			this.connect();
		},

		process: function(o){
			//	summary:
			//		Process the action on the given object.
			//	o: dojox.gfx.Shape
			//		The object on which to process the magnifying action.
			if(!o.shape || !(o.type in this.overOutEvents) ||
				!("cx" in o) || !("cy" in o)){ return; }

			var runName = o.run.name, index = o.index, vector = [], anim, init, scale;

			if(runName in this.anim){
				anim = this.anim[runName][index];
			}else{
				this.anim[runName] = {};
			}

			if(anim){
				anim.action.stop(true);
			}else{
				this.anim[runName][index] = anim = {};
			}

			if(o.type == "onmouseover"){
				init  = m.identity;
				scale = this.scale;
			}else{
				init  = m.scaleAt(this.scale, o.cx, o.cy);
				scale = 1 / this.scale;
			}

			var kwArgs = {
				shape:    o.shape,
				duration: this.duration,
				easing:   this.easing,
				transform: [
					{name: "scaleAt", start: [1, o.cx, o.cy], end: [scale, o.cx, o.cy]},
					init
				]
			};
			if(o.shape){
				vector.push(gf.animateTransform(kwArgs));
			}
			if(o.oultine){
				kwArgs.shape = o.outline;
				vector.push(gf.animateTransform(kwArgs));
			}
			if(o.shadow){
				kwArgs.shape = o.shadow;
				vector.push(gf.animateTransform(kwArgs));
			}

			if(!vector.length){
				delete this.anim[runName][index];
				return;
			}

			anim.action = df.combine(vector);
			if(o.type == "onmouseout"){
				Hub.connect(anim.action, "onEnd", this, function(){
					if(this.anim[runName]){
						delete this.anim[runName][index];
					}
				});
			}
			anim.action.play();
		}
	});
	
});
