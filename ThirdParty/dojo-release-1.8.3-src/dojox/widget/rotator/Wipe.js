define([
	"dojo/_base/lang",
	"dojo/_base/fx",
	"dojo/dom-style"
], function(lang, fx, domStyle) {

	// Constants used to identify which clip edge is being wiped. The values are
	// the index of the clip array that is changed during the animation.
	var DOWN = 2,
		RIGHT = 3,
		UP = 0,
		LEFT = 1;

	function _clipArray(/*int*/type, /*int*/w, /*int*/h, /*number*/x){
		// summary:
		//		Returns an array containing the down, right, up, and
		//		left clip region based on the type.  If "x" is specified,
		//		then it is applied to the appropriate clipping edge.
		var a = [0, w, 0, 0]; // default to the top edge
		if(type == RIGHT){
			a = [0, w, h, w];
		}else if(type == UP){
			a = [h, w, h, 0];
		}else if(type == LEFT){
			a = [0, 0, h, 0];
		}
		if(x != null){
			a[type] = type == DOWN || type == LEFT ? x : (type % 2 ? w : h) - x;
		}
		return a; /*Array*/
	}

	function _setClip(/*DomNode*/n, /*int*/type, /*int*/w, /*int*/h, /*number*/x){
		// summary:
		//		Sets the clip region of the node. If a type is passed in then we
		//		return a rect(), otherwise return "auto".
		domStyle.set(n, "clip", type == null ? "auto" : "rect(" + _clipArray(type, w, h, x).join("px,") + "px)");
	}

	function _wipe(/*int*/type, /*Object*/args){
		// summary:
		//		Handles the preparation of the dom node and creates the Animation object.
		var node = args.next.node,
			w = args.rotatorBox.w,
			h = args.rotatorBox.h;

		domStyle.set(node, {
			display: "",
			zIndex: (domStyle.get(args.current.node, "zIndex") || 1) + 1
		});

		_setClip(node, type, w, h);

		return new fx.Animation(lang.mixin({
			node: node,
			curve: [0, type % 2 ? w : h],
			onAnimate: function(x){
				_setClip(node, type, w, h, parseInt(x));
			}
		}, args));
	}

	var exports = {
		wipeDown: function(/*Object*/args){
			// summary:
			//		Returns a dojo.Animation that wipes in the next rotator pane from the top.
			return _wipe(DOWN, args); /*dojo.Animation*/
		},

		wipeRight: function(/*Object*/args){
			// summary:
			//		Returns a dojo.Animation that wipes in the next rotator pane from the right.
			return _wipe(RIGHT, args); /*dojo.Animation*/
		},

		wipeUp: function(/*Object*/args){
			// summary:
			//		Returns a dojo.Animation that wipes in the next rotator pane from the bottom.
			return _wipe(UP, args); /*dojo.Animation*/
		},

		wipeLeft: function(/*Object*/args){
			// summary:
			//		Returns a dojo.Animation that wipes in the next rotator pane from the left.
			return _wipe(LEFT, args); /*dojo.Animation*/
		}
	};

	// back-compat, remove for 2.0
	lang.mixin(lang.getObject("dojox.widget.rotator"), exports);

	return exports;
});