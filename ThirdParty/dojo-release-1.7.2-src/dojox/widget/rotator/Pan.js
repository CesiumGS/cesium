dojo.provide("dojox.widget.rotator.Pan");
dojo.require("dojo.fx");

(function(d){

	// Constants used to identify which edge the pane pans in from.
	var DOWN = 0,
		RIGHT = 1,
		UP = 2,
		LEFT = 3;

	function _pan(/*int*/type, /*Object*/args){
		//	summary:
		//		Handles the preparation of the dom node and creates the dojo.Animation object.
		var n = args.next.node,
			r = args.rotatorBox,
			m = type % 2,
			a = m ? "left" : "top",
			s = (m ? r.w : r.h) * (type < 2 ? -1 : 1),
			p = {},
			q = {};

		d.style(n, "display", "");

		p[a] = {
			start: 0,
			end: -s
		};

		q[a] = {
			start: s,
			end: 0
		};

		return d.fx.combine([ /*dojo.Animation*/
			d.animateProperty({
				node: args.current.node,
				duration: args.duration,
				properties: p,
				easing: args.easing
			}),
			d.animateProperty({
				node: n,
				duration: args.duration,
				properties: q,
				easing: args.easing
			})
		]);
	}

	function _setZindex(/*DomNode*/n, /*int*/z){
		//	summary:
		//		Helper function for continuously panning.
		d.style(n, "zIndex", z);
	}

	d.mixin(dojox.widget.rotator, {
		pan: function(/*Object*/args){
			//	summary:
			//		Returns a dojo.Animation that either pans left or right to the next pane.
			//		The actual direction depends on the order of the panes.
			//
			//		If panning forward from index 1 to 3, it will perform a pan left. If panning
			//		backwards from 5 to 1, then it will perform a pan right.
			//
			//		If the parameter "continuous" is set to true, it will return an animation
			//		chain of several pan animations of each intermediate pane panning. For
			//		example, if you pan forward from 1 to 3, it will return an animation panning
			//		left from 1 to 2 and then 2 to 3.
			//
			//		If an easing is specified, it will be applied to each pan transition.  For
			//		example, if you are panning from pane 1 to pane 5 and you set the easing to
			//		"dojo.fx.easing.elasticInOut", then it will "wobble" 5 times, once for each
			//		pan transition.
			//
			//		If the parameter "wrap" is set to true, it will pan to the next pane using
			//		the shortest distance in the array of panes. For example, if there are 6
			//		panes, then panning from 5 to 1 will pan forward (left) from pane 5 to 6 and
			//		6 to 1.  If the distance is the same either going forward or backwards, then
			//		it will always pan forward (left).
			//
			//		A continuous pan will use the target pane's duration to pan all intermediate
			//		panes.  To use the target's pane duration for each intermediate pane, then
			//		set the "quick" parameter to "false".

			var w = args.wrap,
				p = args.rotator.panes,
				len = p.length,
				z = len,
				j = args.current.idx,
				k = args.next.idx,
				nw = Math.abs(k - j),
				ww = Math.abs((len - Math.max(j, k)) + Math.min(j, k)) % len,
				_forward = j < k,
				_dir = LEFT,
				_pans = [],
				_nodes = [],
				_duration = args.duration;

			// default to pan left, but check if we should pan right.
			// need to take into account wrapping.
			if((!w && !_forward) || (w && (_forward && nw > ww || !_forward && nw < ww))){
				_dir = RIGHT;
			}

			if(args.continuous){
				// if continuous pans are quick, then divide the duration by the number of panes
				if(args.quick){
					_duration = Math.round(_duration / (w ? Math.min(ww, nw) : nw));
				}

				// set the current pane's z-index
				_setZindex(p[j].node, z--);

				var f = (_dir == LEFT);

				// loop and set z-indexes and get all pan animations
				while(1){
					// set the current pane
					var i = j;

					// increment/decrement the next pane's index
					if(f){
						if(++j >= len){
							j = 0;
						}
					}else{
						if(--j < 0){
							j = len - 1;
						}
					}

					var x = p[i],
						y = p[j];

					// set next pane's z-index
					_setZindex(y.node, z--);

					// build the pan animation
					_pans.push(_pan(_dir, d.mixin({
						easing: function(m){ return m; } // continuous gets a linear easing by default
					}, args, {
						current: x,
						next: y,
						duration: _duration
					})));

					// if we're done, then break out of the loop
					if((f && j == k) || (!f && j == k)){
						break;
					}

					// this must come after the break... we don't want the last pane to get it's
					// styles reset.
					_nodes.push(y.node);
				}

				// build the chained animation of all pan animations
				var _anim = d.fx.chain(_pans),

					// clean up styles when the chained animation finishes
					h = d.connect(_anim, "onEnd", function(){
						d.disconnect(h);
						d.forEach(_nodes, function(q){
							d.style(q, {
								display: "none",
								left: 0,
								opacity: 1,
								top: 0,
								zIndex: 0
							});
						});
					});

				return _anim;
			}

			// we're not continuous, so just return a normal pan animation
			return _pan(_dir, args); /*dojo.Animation*/
		},

		panDown: function(/*Object*/args){
			//	summary:
			//		Returns a dojo.Animation that pans in the next rotator pane from the top.
			return _pan(DOWN, args); /*dojo.Animation*/
		},

		panRight: function(/*Object*/args){
			//	summary:
			//		Returns a dojo.Animation that pans in the next rotator pane from the right.
			return _pan(RIGHT, args); /*dojo.Animation*/
		},

		panUp: function(/*Object*/args){
			//	summary:
			//		Returns a dojo.Animation that pans in the next rotator pane from the bottom.
			return _pan(UP, args); /*dojo.Animation*/
		},

		panLeft: function(/*Object*/args){
			//	summary:
			//		Returns a dojo.Animation that pans in the next rotator pane from the left.
			return _pan(LEFT, args); /*dojo.Animation*/
		}
	});

})(dojo);
