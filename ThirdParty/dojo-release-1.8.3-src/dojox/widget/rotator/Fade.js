define([
	"dojo/_base/lang",
	"dojo/_base/fx",
	"dojo/dom-style",
	"dojo/fx"
], function(lang, baseFx, domStyle, fx) {

	function _fade(/*Object*/args, /*string*/action){
		// summary:
		//		Returns an animation of a fade out and fade in of the current and next
		//		panes.  It will either chain (fade) or combine (crossFade) the fade
		//		animations.
		var n = args.next.node;
		domStyle.set(n, {
			display: "",
			opacity: 0
		});

		args.node = args.current.node;

		return fx[action]([ /*dojo.Animation*/
			baseFx.fadeOut(args),
			baseFx.fadeIn(lang.mixin(args, { node: n }))
		]);
	}

	var exports = {
		fade: function(/*Object*/args){
			// summary:
			//		Returns a dojo.Animation that fades out the current pane, then fades in
			//		the next pane.
			return _fade(args, "chain"); /*dojo.Animation*/
		},

		crossFade: function(/*Object*/args){
			// summary:
			//		Returns a dojo.Animation that cross fades two rotator panes.
			return _fade(args, "combine"); /*dojo.Animation*/
		}
	};

	// back-compat, remove for 2.0
	lang.mixin(lang.getObject("dojox.widget.rotator"), exports);

	return exports;
});