dojo.provide("dojox.widget.rotator.Fade");
dojo.require("dojo.fx");

(function(d){

	function _fade(/*Object*/args, /*string*/action){
		//	summary:
		//		Returns an animation of a fade out and fade in of the current and next
		//		panes.  It will either chain (fade) or combine (crossFade) the fade
		//		animations.
		var n = args.next.node;
		d.style(n, {
			display: "",
			opacity: 0
		});

		args.node = args.current.node;

		return d.fx[action]([ /*dojo.Animation*/
			d.fadeOut(args),
			d.fadeIn(d.mixin(args, { node: n }))
		]);
	}

	d.mixin(dojox.widget.rotator, {
		fade: function(/*Object*/args){
			//	summary:
			//		Returns a dojo.Animation that fades out the current pane, then fades in
			//		the next pane.
			return _fade(args, "chain"); /*dojo.Animation*/
		},

		crossFade: function(/*Object*/args){
			//	summary:
			//		Returns a dojo.Animation that cross fades two rotator panes.
			return _fade(args, "combine"); /*dojo.Animation*/
		}
	});

})(dojo);