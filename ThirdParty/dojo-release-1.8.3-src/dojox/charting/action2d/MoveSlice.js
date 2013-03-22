define(["dojo/_base/connect", "dojo/_base/declare", "dojo/_base/array", "./PlotAction", "dojo/fx/easing", "dojox/gfx/matrix",
	"dojox/gfx/fx", "dojox/lang/functional", "dojox/lang/functional/scan", "dojox/lang/functional/fold"],
	function(hub, declare, array, PlotAction, dfe, m, gf, df, dfs, dff){

		/*=====
		 var __MoveSliceCtorArgs = {
		 // summary:
		 //		Additional arguments for move slice actions.
		 // duration: Number?
		 //		The amount of time in milliseconds for an animation to last.  Default is 400.
		 // easing: dojo/fx/easing/*?
		 //		An easing object (see dojo.fx.easing) for use in an animation.  The
		 //		default is dojo.fx.easing.backOut.
		 // scale: Number?
		 //		The amount to scale the pie slice.  Default is 1.05.
		 // shift: Number?
		 //		The amount in pixels to shift the pie slice.  Default is 7.
		 };
		 =====*/

		var DEFAULT_SCALE = 1.05,
			DEFAULT_SHIFT = 7;	// px

		return declare("dojox.charting.action2d.MoveSlice", PlotAction, {
			// summary:
			//		Create an action for a pie chart that moves and scales a pie slice.

			// the data description block for the widget parser
			defaultParams: {
				duration: 400,	// duration of the action in ms
				easing:   dfe.backOut,	// easing for the action
				scale:    DEFAULT_SCALE,	// scale of magnification
				shift:    DEFAULT_SHIFT		// shift of the slice
			},
			optionalParams: {},	// no optional parameters

			constructor: function(chart, plot, kwArgs){
				// summary:
				//		Create the slice moving action and connect it to the plot.
				// chart: dojox/charting/Chart
				//		The chart this action belongs to.
				// plot: String?
				//		The plot this action is attached to.  If not passed, "default" is assumed.
				// kwArgs: __MoveSliceCtorArgs?
				//		Optional keyword arguments object for setting parameters.
				if(!kwArgs){ kwArgs = {}; }
				this.scale = typeof kwArgs.scale == "number" ? kwArgs.scale : DEFAULT_SCALE;
				this.shift = typeof kwArgs.shift == "number" ? kwArgs.shift : DEFAULT_SHIFT;

				this.connect();
			},

			process: function(o){
				// summary:
				//		Process the action on the given object.
				// o: dojox/gfx/shape.Shape
				//		The object on which to process the slice moving action.
				if(!o.shape || o.element != "slice" || !(o.type in this.overOutEvents)){ return; }

				if(!this.angles){
					// calculate the running total of slice angles
					var startAngle = m._degToRad(o.plot.opt.startAngle);
					if(typeof o.run.data[0] == "number"){
						this.angles = df.map(df.scanl(o.run.data, "+", 0),
							"* 2 * Math.PI / this", df.foldl(o.run.data, "+", 0));
					}else{
						this.angles = df.map(df.scanl(o.run.data, "a + b.y", 0),
							"* 2 * Math.PI / this", df.foldl(o.run.data, "a + b.y", 0));
					}
					this.angles = array.map(this.angles, function(item){
						return item + startAngle;
					});
				}

				var index = o.index, anim, startScale, endScale, startOffset, endOffset,
					angle = (this.angles[index] + this.angles[index + 1]) / 2,
					rotateTo0  = m.rotateAt(-angle, o.cx, o.cy),
					rotateBack = m.rotateAt( angle, o.cx, o.cy);

				anim = this.anim[index];

				if(anim){
					anim.action.stop(true);
				}else{
					this.anim[index] = anim = {};
				}

				if(o.type == "onmouseover"){
					startOffset = 0;
					endOffset   = this.shift;
					startScale  = 1;
					endScale    = this.scale;
				}else{
					startOffset = this.shift;
					endOffset   = 0;
					startScale  = this.scale;
					endScale    = 1;
				}

				anim.action = gf.animateTransform({
					shape:    o.shape,
					duration: this.duration,
					easing:   this.easing,
					transform: [
						rotateBack,
						{name: "translate", start: [startOffset, 0], end: [endOffset, 0]},
						{name: "scaleAt",   start: [startScale, o.cx, o.cy],  end: [endScale, o.cx, o.cy]},
						rotateTo0
					]
				});

				if(o.type == "onmouseout"){
					hub.connect(anim.action, "onEnd", this, function(){
						delete this.anim[index];
					});
				}
				anim.action.play();
			},

			reset: function(){
				delete this.angles;
			}
		});
	});
