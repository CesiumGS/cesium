dojo.provide("dojox.widget.rotator.Slide");

(function(d){

	// Constants used to identify which edge the pane slides in from.
	var DOWN = 0,
		RIGHT = 1,
		UP = 2,
		LEFT = 3;

	function _slide(/*int*/type, /*Object*/args){
		//	summary:
		//		Handles the preparation of the dom node and creates the dojo.Animation object.
		var node = args.node = args.next.node,
			r = args.rotatorBox,
			m = type % 2,
			s = (m ? r.w : r.h) * (type < 2 ? -1 : 1);

		d.style(node, {
			display: "",
			zIndex: (d.style(args.current.node, "zIndex") || 1) + 1
		});

		if(!args.properties){
			args.properties = {};
		}
		args.properties[m ? "left" : "top"] = {
			start: s,
			end: 0
		};

		return d.animateProperty(args); /*dojo.Animation*/
	}

	d.mixin(dojox.widget.rotator, {
		slideDown: function(/*Object*/args){
			//	summary:
			//		Returns a dojo.Animation that slides in the next rotator pane from the top.
			return _slide(DOWN, args); /*dojo.Animation*/
		},

		slideRight: function(/*Object*/args){
			//	summary:
			//		Returns a dojo.Animation that slides in the next rotator pane from the right.
			return _slide(RIGHT, args); /*dojo.Animation*/
		},

		slideUp: function(/*Object*/args){
			//	summary:
			//		Returns a dojo.Animation that slides in the next rotator pane from the bottom.
			return _slide(UP, args); /*dojo.Animation*/
		},

		slideLeft: function(/*Object*/args){
			//	summary:
			//		Returns a dojo.Animation that slides in the next rotator pane from the left.
			return _slide(LEFT, args); /*dojo.Animation*/
		}
	});

})(dojo);
