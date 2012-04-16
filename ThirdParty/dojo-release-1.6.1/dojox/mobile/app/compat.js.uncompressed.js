/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

/*
	This is an optimized version of Dojo, built for deployment and not for
	development. To get sources and documentation, please visit:

		http://dojotoolkit.org
*/

if(!dojo._hasResource["dojo.uacss"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.uacss"] = true;
dojo.provide("dojo.uacss");


(function(){
	// summary:
	//		Applies pre-set CSS classes to the top-level HTML node, based on:
	// 			- browser (ex: dj_ie)
	//			- browser version (ex: dj_ie6)
	//			- box model (ex: dj_contentBox)
	//			- text direction (ex: dijitRtl)
	//
	//		In addition, browser, browser version, and box model are
	//		combined with an RTL flag when browser text is RTL.  ex: dj_ie-rtl.

	var d = dojo,
		html = d.doc.documentElement,
		ie = d.isIE,
		opera = d.isOpera,
		maj = Math.floor,
		ff = d.isFF,
		boxModel = d.boxModel.replace(/-/,''),

		classes = {
			dj_ie: ie,
			dj_ie6: maj(ie) == 6,
			dj_ie7: maj(ie) == 7,
			dj_ie8: maj(ie) == 8,
			dj_ie9: maj(ie) == 9,
			dj_quirks: d.isQuirks,
			dj_iequirks: ie && d.isQuirks,

			// NOTE: Opera not supported by dijit
			dj_opera: opera,

			dj_khtml: d.isKhtml,

			dj_webkit: d.isWebKit,
			dj_safari: d.isSafari,
			dj_chrome: d.isChrome,

			dj_gecko: d.isMozilla,
			dj_ff3: maj(ff) == 3
		}; // no dojo unsupported browsers

	classes["dj_" + boxModel] = true;

	// apply browser, browser version, and box model class names
	var classStr = "";
	for(var clz in classes){
		if(classes[clz]){
			classStr += clz + " ";
		}
	}
	html.className = d.trim(html.className + " " + classStr);

	// If RTL mode, then add dj_rtl flag plus repeat existing classes with -rtl extension.
	// We can't run the code below until the <body> tag has loaded (so we can check for dir=rtl).
	// Unshift() is to run sniff code before the parser.
	dojo._loaders.unshift(function(){
		if(!dojo._isBodyLtr()){
			var rtlClassStr = "dj_rtl dijitRtl " + classStr.replace(/ /g, "-rtl ")
			html.className = d.trim(html.className + " " + rtlClassStr);
		}
	});
})();

}

if(!dojo._hasResource["dijit._base.sniff"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dijit._base.sniff"] = true;
dojo.provide("dijit._base.sniff");



// summary:
//		Applies pre-set CSS classes to the top-level HTML node, see
//		`dojo.uacss` for details.
//
//		Simply doing a require on this module will
//		establish this CSS.  Modified version of Morris' CSS hack.

}

if(!dojo._hasResource["dojo.fx.Toggler"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.fx.Toggler"] = true;
dojo.provide("dojo.fx.Toggler");


dojo.declare("dojo.fx.Toggler", null, {
	// summary:
	//		A simple `dojo.Animation` toggler API.
	//
	// description:
	//		class constructor for an animation toggler. It accepts a packed
	//		set of arguments about what type of animation to use in each
	//		direction, duration, etc. All available members are mixed into
	//		these animations from the constructor (for example, `node`,
	//		`showDuration`, `hideDuration`).
	//
	// example:
	//	|	var t = new dojo.fx.Toggler({
	//	|		node: "nodeId",
	//	|		showDuration: 500,
	//	|		// hideDuration will default to "200"
	//	|		showFunc: dojo.fx.wipeIn,
	//	|		// hideFunc will default to "fadeOut"
	//	|	});
	//	|	t.show(100); // delay showing for 100ms
	//	|	// ...time passes...
	//	|	t.hide();

	// node: DomNode
	//		the node to target for the showing and hiding animations
	node: null,

	// showFunc: Function
	//		The function that returns the `dojo.Animation` to show the node
	showFunc: dojo.fadeIn,

	// hideFunc: Function
	//		The function that returns the `dojo.Animation` to hide the node
	hideFunc: dojo.fadeOut,

	// showDuration:
	//		Time in milliseconds to run the show Animation
	showDuration: 200,

	// hideDuration:
	//		Time in milliseconds to run the hide Animation
	hideDuration: 200,

	// FIXME: need a policy for where the toggler should "be" the next
	// time show/hide are called if we're stopped somewhere in the
	// middle.
	// FIXME: also would be nice to specify individual showArgs/hideArgs mixed into
	// each animation individually.
	// FIXME: also would be nice to have events from the animations exposed/bridged

	/*=====
	_showArgs: null,
	_showAnim: null,

	_hideArgs: null,
	_hideAnim: null,

	_isShowing: false,
	_isHiding: false,
	=====*/

	constructor: function(args){
		var _t = this;

		dojo.mixin(_t, args);
		_t.node = args.node;
		_t._showArgs = dojo.mixin({}, args);
		_t._showArgs.node = _t.node;
		_t._showArgs.duration = _t.showDuration;
		_t.showAnim = _t.showFunc(_t._showArgs);

		_t._hideArgs = dojo.mixin({}, args);
		_t._hideArgs.node = _t.node;
		_t._hideArgs.duration = _t.hideDuration;
		_t.hideAnim = _t.hideFunc(_t._hideArgs);

		dojo.connect(_t.showAnim, "beforeBegin", dojo.hitch(_t.hideAnim, "stop", true));
		dojo.connect(_t.hideAnim, "beforeBegin", dojo.hitch(_t.showAnim, "stop", true));
	},

	show: function(delay){
		// summary: Toggle the node to showing
		// delay: Integer?
		//		Ammount of time to stall playing the show animation
		return this.showAnim.play(delay || 0);
	},

	hide: function(delay){
		// summary: Toggle the node to hidden
		// delay: Integer?
		//		Ammount of time to stall playing the hide animation
		return this.hideAnim.play(delay || 0);
	}
});

}

if(!dojo._hasResource["dojo.fx"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojo.fx"] = true;
dojo.provide("dojo.fx");



/*=====
dojo.fx = {
	// summary: Effects library on top of Base animations
};
=====*/
(function(){
	
	var d = dojo,
		_baseObj = {
			_fire: function(evt, args){
				if(this[evt]){
					this[evt].apply(this, args||[]);
				}
				return this;
			}
		};

	var _chain = function(animations){
		this._index = -1;
		this._animations = animations||[];
		this._current = this._onAnimateCtx = this._onEndCtx = null;

		this.duration = 0;
		d.forEach(this._animations, function(a){
			this.duration += a.duration;
			if(a.delay){ this.duration += a.delay; }
		}, this);
	};
	d.extend(_chain, {
		_onAnimate: function(){
			this._fire("onAnimate", arguments);
		},
		_onEnd: function(){
			d.disconnect(this._onAnimateCtx);
			d.disconnect(this._onEndCtx);
			this._onAnimateCtx = this._onEndCtx = null;
			if(this._index + 1 == this._animations.length){
				this._fire("onEnd");
			}else{
				// switch animations
				this._current = this._animations[++this._index];
				this._onAnimateCtx = d.connect(this._current, "onAnimate", this, "_onAnimate");
				this._onEndCtx = d.connect(this._current, "onEnd", this, "_onEnd");
				this._current.play(0, true);
			}
		},
		play: function(/*int?*/ delay, /*Boolean?*/ gotoStart){
			if(!this._current){ this._current = this._animations[this._index = 0]; }
			if(!gotoStart && this._current.status() == "playing"){ return this; }
			var beforeBegin = d.connect(this._current, "beforeBegin", this, function(){
					this._fire("beforeBegin");
				}),
				onBegin = d.connect(this._current, "onBegin", this, function(arg){
					this._fire("onBegin", arguments);
				}),
				onPlay = d.connect(this._current, "onPlay", this, function(arg){
					this._fire("onPlay", arguments);
					d.disconnect(beforeBegin);
					d.disconnect(onBegin);
					d.disconnect(onPlay);
				});
			if(this._onAnimateCtx){
				d.disconnect(this._onAnimateCtx);
			}
			this._onAnimateCtx = d.connect(this._current, "onAnimate", this, "_onAnimate");
			if(this._onEndCtx){
				d.disconnect(this._onEndCtx);
			}
			this._onEndCtx = d.connect(this._current, "onEnd", this, "_onEnd");
			this._current.play.apply(this._current, arguments);
			return this;
		},
		pause: function(){
			if(this._current){
				var e = d.connect(this._current, "onPause", this, function(arg){
						this._fire("onPause", arguments);
						d.disconnect(e);
					});
				this._current.pause();
			}
			return this;
		},
		gotoPercent: function(/*Decimal*/percent, /*Boolean?*/ andPlay){
			this.pause();
			var offset = this.duration * percent;
			this._current = null;
			d.some(this._animations, function(a){
				if(a.duration <= offset){
					this._current = a;
					return true;
				}
				offset -= a.duration;
				return false;
			});
			if(this._current){
				this._current.gotoPercent(offset / this._current.duration, andPlay);
			}
			return this;
		},
		stop: function(/*boolean?*/ gotoEnd){
			if(this._current){
				if(gotoEnd){
					for(; this._index + 1 < this._animations.length; ++this._index){
						this._animations[this._index].stop(true);
					}
					this._current = this._animations[this._index];
				}
				var e = d.connect(this._current, "onStop", this, function(arg){
						this._fire("onStop", arguments);
						d.disconnect(e);
					});
				this._current.stop();
			}
			return this;
		},
		status: function(){
			return this._current ? this._current.status() : "stopped";
		},
		destroy: function(){
			if(this._onAnimateCtx){ d.disconnect(this._onAnimateCtx); }
			if(this._onEndCtx){ d.disconnect(this._onEndCtx); }
		}
	});
	d.extend(_chain, _baseObj);

	dojo.fx.chain = function(/*dojo.Animation[]*/ animations){
		// summary:
		//		Chain a list of `dojo.Animation`s to run in sequence
		//
		// description:
		//		Return a `dojo.Animation` which will play all passed
		//		`dojo.Animation` instances in sequence, firing its own
		//		synthesized events simulating a single animation. (eg:
		//		onEnd of this animation means the end of the chain,
		//		not the individual animations within)
		//
		// example:
		//	Once `node` is faded out, fade in `otherNode`
		//	|	dojo.fx.chain([
		//	|		dojo.fadeIn({ node:node }),
		//	|		dojo.fadeOut({ node:otherNode })
		//	|	]).play();
		//
		return new _chain(animations) // dojo.Animation
	};

	var _combine = function(animations){
		this._animations = animations||[];
		this._connects = [];
		this._finished = 0;

		this.duration = 0;
		d.forEach(animations, function(a){
			var duration = a.duration;
			if(a.delay){ duration += a.delay; }
			if(this.duration < duration){ this.duration = duration; }
			this._connects.push(d.connect(a, "onEnd", this, "_onEnd"));
		}, this);
		
		this._pseudoAnimation = new d.Animation({curve: [0, 1], duration: this.duration});
		var self = this;
		d.forEach(["beforeBegin", "onBegin", "onPlay", "onAnimate", "onPause", "onStop", "onEnd"],
			function(evt){
				self._connects.push(d.connect(self._pseudoAnimation, evt,
					function(){ self._fire(evt, arguments); }
				));
			}
		);
	};
	d.extend(_combine, {
		_doAction: function(action, args){
			d.forEach(this._animations, function(a){
				a[action].apply(a, args);
			});
			return this;
		},
		_onEnd: function(){
			if(++this._finished > this._animations.length){
				this._fire("onEnd");
			}
		},
		_call: function(action, args){
			var t = this._pseudoAnimation;
			t[action].apply(t, args);
		},
		play: function(/*int?*/ delay, /*Boolean?*/ gotoStart){
			this._finished = 0;
			this._doAction("play", arguments);
			this._call("play", arguments);
			return this;
		},
		pause: function(){
			this._doAction("pause", arguments);
			this._call("pause", arguments);
			return this;
		},
		gotoPercent: function(/*Decimal*/percent, /*Boolean?*/ andPlay){
			var ms = this.duration * percent;
			d.forEach(this._animations, function(a){
				a.gotoPercent(a.duration < ms ? 1 : (ms / a.duration), andPlay);
			});
			this._call("gotoPercent", arguments);
			return this;
		},
		stop: function(/*boolean?*/ gotoEnd){
			this._doAction("stop", arguments);
			this._call("stop", arguments);
			return this;
		},
		status: function(){
			return this._pseudoAnimation.status();
		},
		destroy: function(){
			d.forEach(this._connects, dojo.disconnect);
		}
	});
	d.extend(_combine, _baseObj);

	dojo.fx.combine = function(/*dojo.Animation[]*/ animations){
		// summary:
		//		Combine a list of `dojo.Animation`s to run in parallel
		//
		// description:
		//		Combine an array of `dojo.Animation`s to run in parallel,
		//		providing a new `dojo.Animation` instance encompasing each
		//		animation, firing standard animation events.
		//
		// example:
		//	Fade out `node` while fading in `otherNode` simultaneously
		//	|	dojo.fx.combine([
		//	|		dojo.fadeIn({ node:node }),
		//	|		dojo.fadeOut({ node:otherNode })
		//	|	]).play();
		//
		// example:
		//	When the longest animation ends, execute a function:
		//	|	var anim = dojo.fx.combine([
		//	|		dojo.fadeIn({ node: n, duration:700 }),
		//	|		dojo.fadeOut({ node: otherNode, duration: 300 })
		//	|	]);
		//	|	dojo.connect(anim, "onEnd", function(){
		//	|		// overall animation is done.
		//	|	});
		//	|	anim.play(); // play the animation
		//
		return new _combine(animations); // dojo.Animation
	};

	dojo.fx.wipeIn = function(/*Object*/ args){
		// summary:
		//		Expand a node to it's natural height.
		//
		// description:
		//		Returns an animation that will expand the
		//		node defined in 'args' object from it's current height to
		//		it's natural height (with no scrollbar).
		//		Node must have no margin/border/padding.
		//
		// args: Object
		//		A hash-map of standard `dojo.Animation` constructor properties
		//		(such as easing: node: duration: and so on)
		//
		// example:
		//	|	dojo.fx.wipeIn({
		//	|		node:"someId"
		//	|	}).play()
		var node = args.node = d.byId(args.node), s = node.style, o;

		var anim = d.animateProperty(d.mixin({
			properties: {
				height: {
					// wrapped in functions so we wait till the last second to query (in case value has changed)
					start: function(){
						// start at current [computed] height, but use 1px rather than 0
						// because 0 causes IE to display the whole panel
						o = s.overflow;
						s.overflow = "hidden";
						if(s.visibility == "hidden" || s.display == "none"){
							s.height = "1px";
							s.display = "";
							s.visibility = "";
							return 1;
						}else{
							var height = d.style(node, "height");
							return Math.max(height, 1);
						}
					},
					end: function(){
						return node.scrollHeight;
					}
				}
			}
		}, args));

		d.connect(anim, "onEnd", function(){
			s.height = "auto";
			s.overflow = o;
		});

		return anim; // dojo.Animation
	};

	dojo.fx.wipeOut = function(/*Object*/ args){
		// summary:
		//		Shrink a node to nothing and hide it.
		//
		// description:
		//		Returns an animation that will shrink node defined in "args"
		//		from it's current height to 1px, and then hide it.
		//
		// args: Object
		//		A hash-map of standard `dojo.Animation` constructor properties
		//		(such as easing: node: duration: and so on)
		//
		// example:
		//	|	dojo.fx.wipeOut({ node:"someId" }).play()
		
		var node = args.node = d.byId(args.node), s = node.style, o;
		
		var anim = d.animateProperty(d.mixin({
			properties: {
				height: {
					end: 1 // 0 causes IE to display the whole panel
				}
			}
		}, args));

		d.connect(anim, "beforeBegin", function(){
			o = s.overflow;
			s.overflow = "hidden";
			s.display = "";
		});
		d.connect(anim, "onEnd", function(){
			s.overflow = o;
			s.height = "auto";
			s.display = "none";
		});

		return anim; // dojo.Animation
	};

	dojo.fx.slideTo = function(/*Object*/ args){
		// summary:
		//		Slide a node to a new top/left position
		//
		// description:
		//		Returns an animation that will slide "node"
		//		defined in args Object from its current position to
		//		the position defined by (args.left, args.top).
		//
		// args: Object
		//		A hash-map of standard `dojo.Animation` constructor properties
		//		(such as easing: node: duration: and so on). Special args members
		//		are `top` and `left`, which indicate the new position to slide to.
		//
		// example:
		//	|	dojo.fx.slideTo({ node: node, left:"40", top:"50", units:"px" }).play()

		var node = args.node = d.byId(args.node),
			top = null, left = null;

		var init = (function(n){
			return function(){
				var cs = d.getComputedStyle(n);
				var pos = cs.position;
				top = (pos == 'absolute' ? n.offsetTop : parseInt(cs.top) || 0);
				left = (pos == 'absolute' ? n.offsetLeft : parseInt(cs.left) || 0);
				if(pos != 'absolute' && pos != 'relative'){
					var ret = d.position(n, true);
					top = ret.y;
					left = ret.x;
					n.style.position="absolute";
					n.style.top=top+"px";
					n.style.left=left+"px";
				}
			};
		})(node);
		init();

		var anim = d.animateProperty(d.mixin({
			properties: {
				top: args.top || 0,
				left: args.left || 0
			}
		}, args));
		d.connect(anim, "beforeBegin", anim, init);

		return anim; // dojo.Animation
	};

})();

}

if(!dojo._hasResource["dojox.fx.flip"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.fx.flip"] = true;
dojo.provide("dojox.fx.flip");



	dojo.experimental("dojox.fx.flip");
	// because ShrinkSafe will eat this up:
	var borderConst = "border",
		widthConst = "Width",
		heightConst = "Height",
		topConst = "Top",
		rightConst = "Right",
		leftConst = "Left",
		bottomConst = "Bottom"
	;

	dojox.fx.flip = function(/*Object*/ args){
		// summary: Animate a node flipping following a specific direction
		//
		// description:
		//		Returns an animation that will flip the
		//		node around a central axis:
		//		if args.dir is "left" or "right" --> y axis
		//		if args.dir is "top" or "bottom" --> x axis
		//
		//		This effect is obtained using a border distorsion applied to a helper node.
		//
		//		The user can specify three background colors for the helper node:
		//		darkColor: the darkest color reached during the animation
		//		lightColor: the brightest color
		//		endColor: the final backgroundColor for the node
        //
        //		depth: Float
		//			 0 <= depth <= 1 overrides the computed "depth"
        //          (0: min distorsion, 1: max distorsion)
        //
        //      whichAnim: String
        //          "first"          : the first half animation
        //          "last"           : the second one
        //          "both" (default) : both
        //
        //      axis: String
        //          "center" (default)    : the node is flipped around his center
        //          "shortside"           : the node is flipped around his "short" (in perspective) side
        //          "longside"            : the node is flipped around his "long" (in perspective) side
        //          "cube"                : the node flips around the central axis of the cube
        //
        //      shift: Integer
        //          node translation, perpendicular to the rotation axis
		//
		//	example:
		//	|	var anim = dojox.fx.flip({
		//	|		node: dojo.byId("nodeId"),
		//	|		dir: "top",
		//	|		darkColor: "#555555",
		//	|		lightColor: "#dddddd",
		//	|		endColor: "#666666",
		//	|		depth: .5,
		//	|		shift: 50,
		//	|		duration:300
		//	|	  });

		var helperNode = dojo.create("div"),
			node = args.node = dojo.byId(args.node),
			s = node.style,
			dims = null,
			hs = null,
			pn = null,
			lightColor = args.lightColor || "#dddddd",
			darkColor = args.darkColor || "#555555",
			bgColor = dojo.style(node, "backgroundColor"),
			endColor = args.endColor || bgColor,
			staticProps = {},
			anims = [],
			duration = args.duration ? args.duration / 2 : 250,
			dir = args.dir || "left",
			pConst = .9,
			transparentColor = "transparent",
			whichAnim = args.whichAnim,
			axis = args.axis || "center",
			depth = args.depth
		;
		// IE6 workaround: IE6 doesn't support transparent borders
		var convertColor = function(color){
			return ((new dojo.Color(color)).toHex() === "#000000") ? "#000001" : color;
		};

		if(dojo.isIE < 7){
			endColor = convertColor(endColor);
			lightColor = convertColor(lightColor);
			darkColor = convertColor(darkColor);
			bgColor = convertColor(bgColor);
			transparentColor = "black";
			helperNode.style.filter = "chroma(color='#000000')";
		}

		var init = (function(n){
			return function(){
				var ret = dojo.coords(n, true);
				dims = {
					top: ret.y,
					left: ret.x,
					width: ret.w,
					height: ret.h
				};
			}
		})(node);
		init();
		// helperNode initialization
		hs = {
			position: "absolute",
			top: dims["top"] + "px",
			left: dims["left"] + "px",
			height: "0",
			width: "0",
			zIndex: args.zIndex || (s.zIndex || 0),
			border: "0 solid " + transparentColor,
			fontSize: "0",
			visibility: "hidden"
		};
		var props = [ {},
			{
				top: dims["top"],
				left: dims["left"]
			}
		];
		var dynProperties = {
			left: [leftConst, rightConst, topConst, bottomConst, widthConst, heightConst, "end" + heightConst + "Min", leftConst, "end" + heightConst + "Max"],
			right: [rightConst, leftConst, topConst, bottomConst, widthConst, heightConst, "end" + heightConst + "Min", leftConst, "end" + heightConst + "Max"],
			top: [topConst, bottomConst, leftConst, rightConst, heightConst, widthConst, "end" + widthConst + "Min", topConst, "end" + widthConst + "Max"],
			bottom: [bottomConst, topConst, leftConst, rightConst, heightConst, widthConst, "end" + widthConst + "Min", topConst, "end" + widthConst + "Max"]
		};
		// property names
		pn = dynProperties[dir];

		// .4 <= pConst <= .9
		if(typeof depth != "undefined"){
			depth = Math.max(0, Math.min(1, depth)) / 2;
			pConst = .4 + (.5 - depth);
		}else{
			pConst = Math.min(.9, Math.max(.4, dims[pn[5].toLowerCase()] / dims[pn[4].toLowerCase()]));
		}
		var p0 = props[0];
		for(var i = 4; i < 6; i++){
			if(axis == "center" || axis == "cube"){ // find a better name for "cube"
				dims["end" + pn[i] + "Min"] = dims[pn[i].toLowerCase()] * pConst;
				dims["end" + pn[i] + "Max"] = dims[pn[i].toLowerCase()] / pConst;
			}else if(axis == "shortside"){
				dims["end" + pn[i] + "Min"] = dims[pn[i].toLowerCase()];
				dims["end" + pn[i] + "Max"] = dims[pn[i].toLowerCase()] / pConst;
			}else if(axis == "longside"){
				dims["end" + pn[i] + "Min"] = dims[pn[i].toLowerCase()] * pConst;
				dims["end" + pn[i] + "Max"] = dims[pn[i].toLowerCase()];
			}
		}
		if(axis == "center"){
			p0[pn[2].toLowerCase()] = dims[pn[2].toLowerCase()] - (dims[pn[8]] - dims[pn[6]]) / 4;
		}else if(axis == "shortside"){
			p0[pn[2].toLowerCase()] = dims[pn[2].toLowerCase()] - (dims[pn[8]] - dims[pn[6]]) / 2;
		}

		staticProps[pn[5].toLowerCase()] = dims[pn[5].toLowerCase()] + "px";
		staticProps[pn[4].toLowerCase()] = "0";
		staticProps[borderConst + pn[1] + widthConst] = dims[pn[4].toLowerCase()] + "px";
		staticProps[borderConst + pn[1] + "Color"] = bgColor;

		p0[borderConst + pn[1] + widthConst] = 0;
		p0[borderConst + pn[1] + "Color"] = darkColor;
		p0[borderConst + pn[2] + widthConst] = p0[borderConst + pn[3] + widthConst] = axis != "cube"
			? (dims["end" + pn[5] +  "Max"] - dims["end" + pn[5] + "Min"]) / 2
			: dims[pn[6]] / 2
		;
		p0[pn[7].toLowerCase()] = dims[pn[7].toLowerCase()] + dims[pn[4].toLowerCase()] / 2 + (args.shift || 0);
		p0[pn[5].toLowerCase()] = dims[pn[6]];

		var p1 = props[1];
		p1[borderConst + pn[0] + "Color"] = { start: lightColor, end: endColor };
		p1[borderConst + pn[0] + widthConst] = dims[pn[4].toLowerCase()];
		p1[borderConst + pn[2] + widthConst] = 0;
		p1[borderConst + pn[3] + widthConst] = 0;
		p1[pn[5].toLowerCase()] = { start: dims[pn[6]], end: dims[pn[5].toLowerCase()] };

		dojo.mixin(hs, staticProps);
		dojo.style(helperNode, hs);
		dojo.body().appendChild(helperNode);

		var finalize = function(){
//			helperNode.parentNode.removeChild(helperNode);
			dojo.destroy(helperNode);
			// fixes a flicker when the animation ends
			s.backgroundColor = endColor;
			s.visibility = "visible";
		};
		if(whichAnim == "last"){
			for(i in p0){
				p0[i] = { start: p0[i] };
			}
			p0[borderConst + pn[1] + "Color"] = { start: darkColor, end: endColor };
			p1 = p0;
		}
		if(!whichAnim || whichAnim == "first"){
			anims.push(dojo.animateProperty({
				node: helperNode,
				duration: duration,
				properties: p0
			}));
		}
		if(!whichAnim || whichAnim == "last"){
			anims.push(dojo.animateProperty({
				node: helperNode,
				duration: duration,
				properties: p1,
				onEnd: finalize
			}));
		}

		// hide the original node
		dojo.connect(anims[0], "play", function(){
			helperNode.style.visibility = "visible";
			s.visibility = "hidden";
		});

		return dojo.fx.chain(anims); // dojo.Animation

	}

	dojox.fx.flipCube = function(/*Object*/ args){
		// summary: An extension to `dojox.fx.flip` providing a more 3d-like rotation
		//
		// description:
		//		An extension to `dojox.fx.flip` providing a more 3d-like rotation.
		//		Behaves the same as `dojox.fx.flip`, using the same attributes and
		//		other standard `dojo.Animation` properties.
		//
		//	example:
		//		See `dojox.fx.flip`
		var anims = [],
			mb = dojo.marginBox(args.node),
			shiftX = mb.w / 2,
			shiftY = mb.h / 2,
			dims = {
				top: {
					pName: "height",
					args:[
						{
							whichAnim: "first",
							dir: "top",
							shift: -shiftY
						},
						{
							whichAnim: "last",
							dir: "bottom",
							shift: shiftY
						}
					]
				},
				right: {
					pName: "width",
					args:[
						{
							whichAnim: "first",
							dir: "right",
							shift: shiftX
						},
						{
							whichAnim: "last",
							dir: "left",
							shift: -shiftX
						}
					]
				},
				bottom: {
					pName: "height",
					args:[
						{
							whichAnim: "first",
							dir: "bottom",
							shift: shiftY
						},
						{
							whichAnim: "last",
							dir: "top",
							shift: -shiftY
						}
					]
				},
				left: {
					pName: "width",
					args:[
						{
							whichAnim: "first",
							dir: "left",
							shift: -shiftX
						},
						{
							whichAnim: "last",
							dir: "right",
							shift: shiftX
						}
					]
				}
			}
		;
		var d = dims[args.dir || "left"],
			p = d.args
		;
		args.duration = args.duration ? args.duration * 2 : 500;
		args.depth = .8;
		args.axis = "cube";
		for(var i = p.length - 1; i >= 0; i--){
			dojo.mixin(args, p[i]);
			anims.push(dojox.fx.flip(args));
		}
		return dojo.fx.combine(anims);
	};
	
	dojox.fx.flipPage = function(/*Object*/ args){
		// summary: An extension to `dojox.fx.flip` providing a page flip like animation.
		//
		// description:
		//		An extension to `dojox.fx.flip` providing a page flip effect.
		//		Behaves the same as `dojox.fx.flip`, using the same attributes and
		//		other standard `dojo.Animation` properties.
		//
		//	example:
		//		See `dojox.fx.flip`
		var n = args.node,
			coords = dojo.coords(n, true),
			x = coords.x,
			y = coords.y,
			w = coords.w,
			h = coords.h,
			bgColor = dojo.style(n, "backgroundColor"),
			lightColor = args.lightColor || "#dddddd",
			darkColor = args.darkColor,
			helperNode = dojo.create("div"),
			anims = [],
			hn = [],
			dir = args.dir || "right",
			pn = {
				left: ["left", "right", "x", "w"],
				top: ["top", "bottom", "y", "h"],
				right: ["left", "left", "x", "w"],
				bottom: ["top", "top", "y", "h"]
			},
			shiftMultiplier = {
				right: [1, -1],
				left: [-1, 1],
				top: [-1, 1],
				bottom: [1, -1]
			}
		;
		dojo.style(helperNode, {
			position: "absolute",
			width  : w + "px",
			height : h + "px",
			top    : y + "px",
			left   : x + "px",
			visibility: "hidden"
		});
		var hs = [];
		for(var i = 0; i < 2; i++){
			var r = i % 2,
				d = r ? pn[dir][1] : dir,
				wa = r ? "last" : "first",
				endColor = r ? bgColor : lightColor,
				startColor = r ? endColor : args.startColor || n.style.backgroundColor
			;
			hn[i] = dojo.clone(helperNode);
			var	finalize = function(x){
					return function(){
						dojo.destroy(hn[x]);
					}
				}(i)
			;
			dojo.body().appendChild(hn[i]);
			hs[i] = {
				backgroundColor: r ? startColor : bgColor
			};
			
			hs[i][pn[dir][0]] = coords[pn[dir][2]] + shiftMultiplier[dir][0] * i * coords[pn[dir][3]] + "px";
			dojo.style(hn[i], hs[i]);
			anims.push(dojox.fx.flip({
			    node: hn[i],
			    dir: d,
			    axis: "shortside",
			    depth: args.depth,
			    duration: args.duration / 2,
			    shift: shiftMultiplier[dir][i] * coords[pn[dir][3]] / 2,
				darkColor: darkColor,
				lightColor: lightColor,
			    whichAnim: wa,
			    endColor: endColor
			}));
			dojo.connect(anims[i], "onEnd", finalize);
		}
		return dojo.fx.chain(anims);
	};
	
	
	dojox.fx.flipGrid = function(/*Object*/ args){
		// summary: An extension to `dojox.fx.flip` providing a decomposition in rows * cols flipping elements
		//
		// description:
		//		An extension to `dojox.fx.flip` providing a page flip effect.
		//		Behaves the same as `dojox.fx.flip`, using the same attributes and
		//		other standard `dojo.Animation` properties and
		//
        //      cols: Integer columns
        //      rows: Integer rows
		//
		//      duration: the single flip duration
		//
		//	example:
		//		See `dojox.fx.flip`
		var rows = args.rows || 4,
			cols = args.cols || 4,
			anims = [],
			helperNode = dojo.create("div"),
			n = args.node,
			coords = dojo.coords(n, true),
			x = coords.x,
			y = coords.y,
			nw = coords.w,
			nh = coords.h,
			w = coords.w / cols,
			h = coords.h / rows,
			cAnims = []
		;
		dojo.style(helperNode, {
			position: "absolute",
			width: w + "px",
			height: h + "px",
			backgroundColor: dojo.style(n, "backgroundColor")
		});
		for(var i = 0; i < rows; i++){
			var r = i % 2,
				d = r ? "right" : "left",
				signum = r ? 1 : -1
			;
			// cloning
			var cn = dojo.clone(n);
			dojo.style(cn, {
				position: "absolute",
				width: nw + "px",
				height: nh + "px",
				top: y + "px",
				left: x + "px",
				clip: "rect(" + i * h + "px," + nw + "px," + nh + "px,0)"
			});
	     	dojo.body().appendChild(cn);
			anims[i] = [];
			for(var j = 0; j < cols; j++){
				var hn = dojo.clone(helperNode),
					l = r ? j : cols - (j + 1)
				;
				var adjustClip = function(xn, yCounter, xCounter){
					return function(){
						if(!(yCounter % 2)){
							dojo.style(xn, {
								clip: "rect(" + yCounter * h + "px," + (nw - (xCounter + 1) * w ) + "px," + ((yCounter + 1) * h) + "px,0px)"
							});
						}else{
							dojo.style(xn, {
								clip: "rect(" + yCounter * h + "px," + nw + "px," + ((yCounter + 1) * h) + "px," + ((xCounter + 1) * w) + "px)"
							});
						}
					}
				}(cn, i, j);
	     		dojo.body().appendChild(hn);
	     		dojo.style(hn, {
	     		    left: x + l * w + "px",
	     		    top: y + i * h + "px",
					visibility: "hidden"
	     		});
				var a = dojox.fx.flipPage({
				   node: hn,
				   dir: d,
				   duration: args.duration || 900,
				   shift: signum * w/2,
				   depth: .2,
				   darkColor: args.darkColor,
				   lightColor: args.lightColor,
				   startColor: args.startColor || args.node.style.backgroundColor
				}),
				removeHelper = function(xn){
					return function(){
						dojo.destroy(xn);
					}
				}(hn)
				;
				dojo.connect(a, "play", this, adjustClip);
				dojo.connect(a, "play", this, removeHelper);
				anims[i].push(a);
			}
			cAnims.push(dojo.fx.chain(anims[i]));
			
		}
		dojo.connect(cAnims[0], "play", function(){
			dojo.style(n, {visibility: "hidden"});
		});
		return dojo.fx.combine(cAnims);
	};

}

if(!dojo._hasResource["dojox.mobile.compat"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.mobile.compat"] = true;
dojo.provide("dojox.mobile.compat");





// summary:
//		CSS3 compatibility module
// description:
//		This module provides support for some of the CSS3 features to dojox.mobile
//		for non-CSS3 browsers, such as IE or Firefox.
//		If you load this module, it directly replaces some of the methods of
//		dojox.mobile instead of subclassing. This way, html pages remains the same
//		regardless of whether this compatibility module is used or not.
//		Recommended usage is as follows. the code below loads dojox.mobile.compat
//		only when isWebKit is true.
//
//		dojo.require("dojox.mobile");
//		
//
//		This module also loads compatibility CSS files, which has -compat.css
//		suffix. You can use either the <link> tag or @import to load theme
//		CSS files. Then, this module searches for the loaded CSS files and loads
//		compatibility CSS files. For example, if you load iphone.css in a page,
//		this module automatically loads iphone-compat.css.
//		If you explicitly load iphone-compat.css with <link> or @import,
//		this module will not load the already loaded file.

if(!dojo.isWebKit){

dojo.extend(dojox.mobile.View, {
	_doTransition: function(fromNode, toNode, transition, dir){
		var anim;
		this.wakeUp(toNode);
		if(!transition || transition == "none"){
			toNode.style.display = "";
			fromNode.style.display = "none";
			toNode.style.left = "0px";
			this.invokeCallback();
		}else if(transition == "slide"){
			var w = fromNode.offsetWidth;
			var s1 = dojo.fx.slideTo({
				node: fromNode,
				duration: 400,
				left: -w*dir,
				top: fromNode.offsetTop
			});
			var s2 = dojo.fx.slideTo({
				node: toNode,
				duration: 400,
				left: 0
			});
			toNode.style.position = "absolute";
			toNode.style.left = w*dir + "px";
			toNode.style.display = "";
			anim = dojo.fx.combine([s1,s2]);
			dojo.connect(anim, "onEnd", this, function(){
				fromNode.style.display = "none";
				toNode.style.position = "relative";
				this.invokeCallback();
			});
			anim.play();
		}else if(transition == "flip"){
			anim = dojox.fx.flip({
				node: fromNode,
				dir: "right",
				depth: 0.5,
				duration: 400
			});
			toNode.style.position = "absolute";
			toNode.style.left = "0px";
			dojo.connect(anim, "onEnd", this, function(){
				fromNode.style.display = "none";
				toNode.style.position = "relative";
				toNode.style.display = "";
				this.invokeCallback();
			});
			anim.play();
		}else if(transition == "fade"){
			anim = dojo.fx.chain([
				dojo.fadeOut({
					node: fromNode,
					duration: 600
				}),
				dojo.fadeIn({
					node: toNode,
					duration: 600
				})
			]);
			toNode.style.position = "absolute";
			toNode.style.left = "0px";
			toNode.style.display = "";
			dojo.style(toNode, "opacity", 0);
			dojo.connect(anim, "onEnd", this, function(){
				fromNode.style.display = "none";
				toNode.style.position = "relative";
				dojo.style(fromNode, "opacity", 1);
				this.invokeCallback();
			});
			anim.play();
		}
	},

	wakeUp: function(node){
		// summary:
		//		Function to force IE to redraw a node since its layout code tends to misrender
		//		in partial draws.
		//	node:
		//		The node to forcibly redraw.
		// tags:
		//		public
		if(dojo.isIE && !node._wokeup){
			node._wokeup = true;
			var disp = node.style.display;
			node.style.display = "";
			var nodes = node.getElementsByTagName("*");
			for(var i = 0, len = nodes.length; i < len; i++){
				var val = nodes[i].style.display;
				nodes[i].style.display = "none";
				nodes[i].style.display = "";
				nodes[i].style.display = val;
			}
			node.style.display = disp;
		}
	}
});

dojo.extend(dojox.mobile.Switch, {
	buildRendering: function(){
		// summary:
		//		Function to simulate the mobile device style switches on
		//		browsers such as IE and FireFox.
		// tags:
		//		protected
		this.domNode = this.srcNodeRef || dojo.doc.createElement("DIV");
		this.domNode.className = "mblSwitch";
		this.domNode.innerHTML =
			  '<div class="mblSwitchInner">'
			+	'<div class="mblSwitchBg mblSwitchBgLeft">'
			+		'<div class="mblSwitchCorner mblSwitchCorner1T"></div>'
			+		'<div class="mblSwitchCorner mblSwitchCorner2T"></div>'
			+		'<div class="mblSwitchCorner mblSwitchCorner3T"></div>'
			+		'<div class="mblSwitchText mblSwitchTextLeft">'+this.leftLabel+'</div>'
			+		'<div class="mblSwitchCorner mblSwitchCorner1B"></div>'
			+		'<div class="mblSwitchCorner mblSwitchCorner2B"></div>'
			+		'<div class="mblSwitchCorner mblSwitchCorner3B"></div>'
			+	'</div>'
			+	'<div class="mblSwitchBg mblSwitchBgRight">'
			+		'<div class="mblSwitchCorner mblSwitchCorner1T"></div>'
			+		'<div class="mblSwitchCorner mblSwitchCorner2T"></div>'
			+		'<div class="mblSwitchCorner mblSwitchCorner3T"></div>'
			+		'<div class="mblSwitchText mblSwitchTextRight">'+this.rightLabel+'</div>'
			+		'<div class="mblSwitchCorner mblSwitchCorner1B"></div>'
			+		'<div class="mblSwitchCorner mblSwitchCorner2B"></div>'
			+		'<div class="mblSwitchCorner mblSwitchCorner3B"></div>'
			+	'</div>'
			+	'<div class="mblSwitchKnobContainer">'
			+		'<div class="mblSwitchCorner mblSwitchCorner1T"></div>'
			+		'<div class="mblSwitchCorner mblSwitchCorner2T"></div>'
			+		'<div class="mblSwitchCorner mblSwitchCorner3T"></div>'
			+		'<div class="mblSwitchKnob"></div>'
			+		'<div class="mblSwitchCorner mblSwitchCorner1B"></div>'
			+		'<div class="mblSwitchCorner mblSwitchCorner2B"></div>'
			+		'<div class="mblSwitchCorner mblSwitchCorner3B"></div>'
			+	'</div>'
			+ '</div>';
		var n = this.inner = this.domNode.firstChild;
		this.left = n.childNodes[0];
		this.right = n.childNodes[1];
		this.knob = n.childNodes[2];

		dojo.addClass(this.domNode, (this.value == "on") ? "mblSwitchOn" : "mblSwitchOff");
		this[this.value == "off" ? "left" : "right"].style.display = "none";
	},

	_changeState: function(/*String*/state){
		// summary:
		//		Function to toggle the switch state on the switch
		// state:
		//		Thhe state to toggle, switch 'on' or 'off'
		// tags:
		//		private
		if(!this.inner.parentNode || !this.inner.parentNode.tagName){
			dojo.addClass(this.domNode, (state == "on") ? "mblSwitchOn" : "mblSwitchOff");
			return;
		}
		var pos;
		if(this.inner.offsetLeft == 0){ // currently ON
			if(state == "on"){ return; }
			pos = -53;
		}else{ // currently OFF
			if(state == "off"){ return; }
			pos = 0;
		}

		var a = dojo.fx.slideTo({
			node: this.inner,
			duration: 500,
			left: pos
		});
		var _this = this;
		dojo.connect(a, "onEnd", function(){
			_this[state == "off" ? "left" : "right"].style.display = "none";
		});
		a.play();
	}
});

if(dojo.isIE || dojo.isBB){

dojo.extend(dojox.mobile.RoundRect, {
	buildRendering: function(){
		// summary:
		//		Function to simulate the borderRadius appearance on IE, since
		//		IE does not support this CSS style.
		// tags:
		//		protected
		dojox.mobile.createRoundRect(this);
		this.domNode.className = "mblRoundRect";
	}
});

dojox.mobile.RoundRectList._addChild = dojox.mobile.RoundRectList.prototype.addChild;
dojo.extend(dojox.mobile.RoundRectList, {
	buildRendering: function(){
		// summary:
		//		Function to simulate the borderRadius appearance on IE, since
		//		IE does not support this CSS style.
		// tags:
		//		protected
		dojox.mobile.createRoundRect(this, true);
		this.domNode.className = "mblRoundRectList";
	},

	postCreate: function(){
		this.redrawBorders();
	},

	addChild: function(widget){
		dojox.mobile.RoundRectList._addChild.apply(this, arguments);
		this.redrawBorders();
		if(dojox.mobile.applyPngFilter){
			dojox.mobile.applyPngFilter(widget.domNode);
		}
	},

	redrawBorders: function(){
		// summary:
		//		Function to adjust the creation of RoundRectLists on IE.
		//		Removed undesired styles.
		// tags:
		//		public

		// Remove a border of the last ListItem.
		// This is for browsers that do not support the last-child CSS pseudo-class.

		var lastChildFound = false;
		for(var i = this.containerNode.childNodes.length - 1; i >= 0; i--){
			var c = this.containerNode.childNodes[i];
			if(c.tagName == "LI"){
				c.style.borderBottomStyle = lastChildFound ? "solid" : "none";
				lastChildFound = true;
			}
		}
	}
});

dojo.extend(dojox.mobile.EdgeToEdgeList, {
	buildRendering: function(){
		this.domNode = this.containerNode = this.srcNodeRef || dojo.doc.createElement("UL");
		this.domNode.className = "mblEdgeToEdgeList";
	}
});

if(dojox.mobile.IconContainer){

dojox.mobile.IconContainer._addChild = dojox.mobile.IconContainer.prototype.addChild;
dojo.extend(dojox.mobile.IconContainer, {
	addChild: function(widget){
		dojox.mobile.IconContainer._addChild.apply(this, arguments);
		if(dojox.mobile.applyPngFilter){
			dojox.mobile.applyPngFilter(widget.domNode);
		}
	}
});

} // if(dojox.mobile.IconContainer)

dojo.mixin(dojox.mobile, {
	createRoundRect: function(_this, isList){
		// summary:
		//		Function to adjust the creation of rounded rectangles on IE.
		//		Deals with IE's lack of borderRadius support
		// tags:
		//		public
		var i;
		_this.domNode = dojo.doc.createElement("DIV");
		_this.domNode.style.padding = "0px";
		_this.domNode.style.backgroundColor = "transparent";
		_this.domNode.style.borderStyle = "none";
		_this.containerNode = dojo.doc.createElement(isList?"UL":"DIV");
		_this.containerNode.className = "mblRoundRectContainer";
		if(_this.srcNodeRef){
			_this.srcNodeRef.parentNode.replaceChild(_this.domNode, _this.srcNodeRef);
			for(i = 0, len = _this.srcNodeRef.childNodes.length; i < len; i++){
				_this.containerNode.appendChild(_this.srcNodeRef.removeChild(_this.srcNodeRef.firstChild));
			}
			_this.srcNodeRef = null;
		}
		_this.domNode.appendChild(_this.containerNode);

		for(i = 0; i <= 5; i++){
			var top = dojo.create("DIV");
			top.className = "mblRoundCorner mblRoundCorner"+i+"T";
			_this.domNode.insertBefore(top, _this.containerNode);

			var bottom = dojo.create("DIV");
			bottom.className = "mblRoundCorner mblRoundCorner"+i+"B";
			_this.domNode.appendChild(bottom);
		}
	}
});

if(dojox.mobile.ScrollableView){

dojo.extend(dojox.mobile.ScrollableView, {
	postCreate: function(){
		// On IE, margin-top of the first child does not seem to be effective,
		// probably because padding-top is specified for containerNode
		// to make room for a fixed header. This dummy node is a workaround for that.
		var dummy = dojo.create("DIV", {className:"mblDummyForIE", innerHTML:"&nbsp;"}, this.containerNode, "first");
		dojo.style(dummy, {
			position: "relative",
			marginBottom: "-2px",
			fontSize: "1px"
		});
	}
});

} // if(dojox.mobile.ScrollableView)

} // if(dojo.isIE)

if(dojo.isIE <= 6){
	dojox.mobile.applyPngFilter = function(root){
		root = root || dojo.body();
		var nodes = root.getElementsByTagName("IMG");
		var blank = dojo.moduleUrl("dojo", "resources/blank.gif");
		for(var i = 0, len = nodes.length; i < len; i++){
			var img = nodes[i];
			var w = img.offsetWidth;
			var h = img.offsetHeight;
			if(w === 0 || h === 0){
				// The reason why the image has no width/height may be because
				// display is "none". If that is the case, let's change the
				// display to "" temporarily and see if the image returns them.
				if(dojo.style(img, "display") != "none"){ continue; }
				img.style.display = "";
				w = img.offsetWidth;
				h = img.offsetHeight;
				img.style.display = "none";
				if(w === 0 || h === 0){ continue; }
			}
			var src = img.src;
			if(src.indexOf("resources/blank.gif") != -1){ continue; }
			img.src = blank;
			img.runtimeStyle.filter = "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" + src+"')";
			img.style.width = w + "px";
			img.style.height = h + "px";
		}
	};
} // if(dojo.isIE <= 6)

dojox.mobile.loadCss = function(/*String|Array*/files){
	// summary:
	//		Function to load and register CSS files with the page
	//	files: String|Array
	//		The CSS files to load and register with the page.
	// tags:
	//		private
	if(!dojo.global._loadedCss){
		var obj = {};
		dojo.forEach(dojox.mobile.getCssPaths(), function(path){
			obj[path] = true;
		});
		dojo.global._loadedCss = obj;
	}
	if(!dojo.isArray(files)){ files = [files]; }
	for(var i = 0; i < files.length; i++){
		var file = files[i];
		if(!dojo.global._loadedCss[file]){
			dojo.global._loadedCss[file] = true;
			if(dojo.doc.createStyleSheet){
				// for some reason, IE hangs when you try to load
				// multiple css files almost at once.
				setTimeout(function(file){
					return function(){
						dojo.doc.createStyleSheet(file);
					};
				}(file), 0);
			}else{
				var link = dojo.doc.createElement("link");
				link.href = file;
				link.type = "text/css";
				link.rel = "stylesheet";
				var head = dojo.doc.getElementsByTagName('head')[0];
				head.appendChild(link);
			}
		}
	}
};

dojox.mobile.getCssPaths = function(){
	var paths = [];
	var i, j;

	// find @import
	var s = dojo.doc.styleSheets;
	for(i = 0; i < s.length; i++){
		var r = s[i].cssRules || s[i].imports;
		if(!r){ continue; }
		for(j = 0; j < r.length; j++){
			if(r[j].href){
				paths.push(r[j].href);
			}
		}
	}
	
	// find <link>
	var elems = dojo.doc.getElementsByTagName("link");
	for(i = 0, len = elems.length; i < len; i++){
		if(elems[i].href){
			paths.push(elems[i].href);
		}
	}
	return paths;
};

dojox.mobile.loadCompatPattern = /\/themes\/(domButtons|buttons|iphone|android).*\.css$/;

dojox.mobile.loadCompatCssFiles = function(){
	// summary:
	//		Function to perform page-level adjustments on browsers such as
	//		IE and firefox.  It loads compat specific css files into the
	//		page header.
	var paths = dojox.mobile.getCssPaths();
	for(var i = 0; i < paths.length; i++){
		var href = paths[i];
		if(href.match(dojox.mobile.loadCompatPattern) && href.indexOf("-compat.css") == -1){
			var compatCss = href.substring(0, href.length-4)+"-compat.css";
			dojox.mobile.loadCss(compatCss);
		}
	}
};

dojox.mobile.hideAddressBar = function(){
	// nop
};

dojo.addOnLoad(function(){
	if(dojo.config["mblLoadCompatCssFiles"] !== false){
		dojox.mobile.loadCompatCssFiles();
	}
	if(dojox.mobile.applyPngFilter){
		dojox.mobile.applyPngFilter();
	}
});

} // end of if(!dojo.isWebKit){

}

if(!dojo._hasResource["dojox.mobile.app.compat"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.mobile.app.compat"] = true;
dojo.provide("dojox.mobile.app.compat");


// summary:
//		CSS3 compatibility module for apps
// description:
//		This module provides support for some of the CSS3 features to djMobile
//		for non-CSS3 browsers, such as IE or Firefox.
//		If you load this module, it directly replaces some of the methods of
//		djMobile instead of subclassing. This way, html pages remains the same
//		regardless of whether this compatibility module is used or not.
//		Recommended usage is as follows. the code below loads dojox.mobile.compat
//		only when isWebKit is true.
//
//		dojo.require("dojox.mobile");
//		dojo.requireIf(!dojo.isWebKit, "dojox.mobile.appCompat");

dojo.extend(dojox.mobile.app.AlertDialog, {
	_doTransition: function(dir){
		console.log("in _doTransition and this = ", this);

		var h = dojo.marginBox(this.domNode.firstChild).h;

		var bodyHeight = this.controller.getWindowSize().h;
	
		var high = bodyHeight - h;
		var low = bodyHeight;

		var anim1 = dojo.fx.slideTo({
			node: this.domNode,
			duration: 400,
			top: {start: dir < 0 ? high : low, end: dir < 0 ? low: high}
		});

		var anim2 = dojo[dir < 0 ? "fadeOut" : "fadeIn"]({
			node: this.mask,
			duration: 400
		});
	
		var anim = dojo.fx.combine([anim1, anim2]);
	
		var _this = this;

		dojo.connect(anim, "onEnd", this, function(){
			if(dir < 0){
				_this.domNode.style.display = "none";
				dojo.destroy(_this.domNode);
				dojo.destroy(_this.mask);
			}
		});
		anim.play();
	}
});

dojo.extend(dojox.mobile.app.List, {
	deleteRow: function(){
		console.log("deleteRow in compat mode", row);
	
		var row = this._selectedRow;
		// First make the row invisible
		// Put it back where it came from
		dojo.style(row, {
			visibility: "hidden",
			minHeight: "0px"
		});
		dojo.removeClass(row, "hold");
	
	
		// Animate reducing it's height to zero, then delete the data from the
		// array
		var height = dojo.contentBox(row).h;
		dojo.animateProperty({
				node: row,
				duration: 800,
				properties: {
				height: {start: height, end: 1},
				paddingTop: {end: 0},
				paddingBottom: {end: 0}
			},
			onEnd: this._postDeleteAnim
		}).play();
	}
});

if(dojox.mobile.app.ImageView && !dojo.create("canvas").getContext){
	dojo.extend(dojox.mobile.app.ImageView, {
		buildRendering: function(){
			this.domNode.innerHTML =
				"ImageView widget is not supported on this browser."
				+ "Please try again with a modern browser, e.g. "
				+ "Safari, Chrome or Firefox";
			this.canvas = {};
		},
		
		postCreate: function(){}
	});
}

if(dojox.mobile.app.ImageThumbView){
	dojo.extend(dojox.mobile.app.ImageThumbView, {
		place: function(node, x, y){
			dojo.style(node, {
				top: y + "px",
				left: x + "px",
				visibility: "visible"
			});
		}
	})
}

}

