define(["dojo/_base/connect", "dojo/_base/declare", "./PlotAction", 
	"dojo/fx", "dojo/fx/easing", "dojox/gfx/matrix", "dojox/gfx/fx"], 
	function(hub, declare, PlotAction, df, dfe, m, gf){

	/*=====
	dojo.declare("dojox.charting.action2d.__ShakeCtorArgs", dojox.charting.action2d.__PlotActionCtorArgstorArgs, {
		//	summary:
		//		Additional arguments for highlighting actions.
	
		//	shift: Number?
		//		The amount in pixels to shift the pie slice.  Default is 3.
		shift: 3
	});
	var PlotAction = dojox.charting.action2d.PlotAction;
	=====*/

	var DEFAULT_SHIFT = 3;

	return declare("dojox.charting.action2d.Shake", PlotAction, {
		//	summary:
		//		Create a shaking action for use on an element in a chart.

		// the data description block for the widget parser
		defaultParams: {
			duration: 400,	// duration of the action in ms
			easing:   dfe.backOut,	// easing for the action
			shiftX:   DEFAULT_SHIFT,	// shift of the element along the X axis
			shiftY:   DEFAULT_SHIFT		// shift of the element along the Y axis
		},
		optionalParams: {},	// no optional parameters

		constructor: function(chart, plot, kwArgs){
			//	summary:
			//		Create the shaking action and connect it to the plot.
			//	chart: dojox.charting.Chart
			//		The chart this action belongs to.
			//	plot: String?
			//		The plot this action is attached to.  If not passed, "default" is assumed.
			//	kwArgs: dojox.charting.action2d.__ShakeCtorArgs?
			//		Optional keyword arguments object for setting parameters.
			if(!kwArgs){ kwArgs = {}; }
			this.shiftX = typeof kwArgs.shiftX == "number" ? kwArgs.shiftX : DEFAULT_SHIFT;
			this.shiftY = typeof kwArgs.shiftY == "number" ? kwArgs.shiftY : DEFAULT_SHIFT;

			this.connect();
		},

		process: function(o){
			//	summary:
			//		Process the action on the given object.
			//	o: dojox.gfx.Shape
			//		The object on which to process the slice moving action.
			if(!o.shape || !(o.type in this.overOutEvents)){ return; }

			var runName = o.run.name, index = o.index, vector = [], anim,
				shiftX = o.type == "onmouseover" ? this.shiftX : -this.shiftX,
				shiftY = o.type == "onmouseover" ? this.shiftY : -this.shiftY;

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

			var kwArgs = {
				shape:     o.shape,
				duration:  this.duration,
				easing:    this.easing,
				transform: [
					{name: "translate", start: [this.shiftX, this.shiftY], end: [0, 0]},
					m.identity
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
