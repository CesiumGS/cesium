define([
	"dojo/_base/kernel",
	"dojo/_base/connect",
	"dojo/_base/event",
	"dojo/_base/lang",
	"dojo/_base/window",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/dom-style",
	"./sniff"
], function(dojo, connect, event, lang, win, domClass, domConstruct, domStyle, has){

	// module:
	//		dojox/mobile/scrollable

	// TODO: rename to Scrollable.js (capital S) for 2.0

	// TODO: shouldn't be referencing this dojox/mobile variable, would be better to require the mobile.js module
	var dm = lang.getObject("dojox.mobile", true);

	// feature detection
	has.add("translate3d", function(){
		if(has("webkit")){
			var elem = win.doc.createElement("div");
			elem.style.webkitTransform = "translate3d(0px,1px,0px)";
			win.doc.documentElement.appendChild(elem);
			var v = win.doc.defaultView.getComputedStyle(elem, '')["-webkit-transform"];
			var hasTranslate3d = v && v.indexOf("matrix") === 0;
			win.doc.documentElement.removeChild(elem);
			return hasTranslate3d;
		}
	});

	var Scrollable = function(){
		// summary:
		//		Mixin for enabling touch scrolling capability.
		// description:
		//		Mixin for enabling touch scrolling capability.
		//		Mobile WebKit browsers do not allow scrolling inner DIVs. (For instance,
		//		on iOS you need the two-finger operation to scroll them.)
		//		That means you cannot have fixed-positioned header/footer bars.
		//		To solve this issue, this module disables the browsers default scrolling
		//		behavior, and rebuilds its own scrolling machinery by handling touch
		//		events. In this module, this.domNode has height "100%" and is fixed to
		//		the window, and this.containerNode scrolls. If you place a bar outside
		//		of this.containerNode, then it will be fixed-positioned while
		//		this.containerNode is scrollable.
		//
		//		This module has the following features:
		//
		//		- Scrolls inner DIVs vertically, horizontally, or both.
		//		- Vertical and horizontal scroll bars.
		//		- Flashes the scroll bars when a view is shown.
		//		- Simulates the flick operation using animation.
		//		- Respects header/footer bars if any.
	};

	lang.extend(Scrollable, {
		// fixedHeaderHeight: Number
		//		height of a fixed header
		fixedHeaderHeight: 0,

		// fixedFooterHeight: Number
		//		height of a fixed footer
		fixedFooterHeight: 0,

		// isLocalFooter: Boolean
		//		footer is view-local (as opposed to application-wide)
		isLocalFooter: false,

		// scrollBar: Boolean
		//		show scroll bar or not
		scrollBar: true,

		// scrollDir: String
		//		v: vertical, h: horizontal, vh: both, f: flip
		scrollDir: "v",

		// weight: Number
		//		frictional drag
		weight: 0.6,

		// fadeScrollBar: Boolean
		fadeScrollBar: true,

		// disableFlashScrollBar: Boolean
		disableFlashScrollBar: false,

		// threshold: Number
		//		drag threshold value in pixels
		threshold: 4,

		// constraint: Boolean
		//		bounce back to the content area
		constraint: true,

		// touchNode: DOMNode
		//		a node that will have touch event handlers
		touchNode: null,

		// propagatable: Boolean
		//		let touchstart event propagate up
		propagatable: true,

		// dirLock: Boolean
		//		disable the move handler if scroll starts in the unexpected direction
		dirLock: false,

		// height: String
		//		explicitly specified height of this widget (ex. "300px")
		height: "",

		// scrollType: Number
		//		- 1: use -webkit-transform:translate3d(x,y,z) style, use -webkit-animation for slide anim
		//		- 2: use top/left style,
		//		- 3: use -webkit-transform:translate3d(x,y,z) style, use -webkit-transition for slide anim
		//		- 0: use default value (2 in case of Android < 3, 3 if iOS6, otherwise 1)
		scrollType: 0,

		init: function(/*Object?*/params){
			// summary:
			//		Initialize according to the given params.
			// description:
			//		Mixes in the given params into this instance. At least domNode
			//		and containerNode have to be given.
			//		Starts listening to the touchstart events.
			//		Calls resize(), if this widget is a top level widget.
			if(params){
				for(var p in params){
					if(params.hasOwnProperty(p)){
						this[p] = ((p == "domNode" || p == "containerNode") && typeof params[p] == "string") ?
							win.doc.getElementById(params[p]) : params[p]; // mix-in params
					}
				}
			}
			this.touchNode = this.touchNode || this.containerNode;
			this._v = (this.scrollDir.indexOf("v") != -1); // vertical scrolling
			this._h = (this.scrollDir.indexOf("h") != -1); // horizontal scrolling
			this._f = (this.scrollDir == "f"); // flipping views

			this._ch = []; // connect handlers
			this._ch.push(connect.connect(this.touchNode,
				has('touch') ? "ontouchstart" : "onmousedown", this, "onTouchStart"));
			if(has("webkit")){
				// flag for whether to use -webkit-transform:translate3d(x,y,z) or top/left style.
				// top/left style works fine as a workaround for input fields auto-scrolling issue,
				// so use top/left in case of Android by default.
				this._useTopLeft = this.scrollType ? this.scrollType === 2 : has('android') < 3;
				// Flag for using webkit transition on transform, instead of animation + keyframes.
				// (keyframes create a slight delay before the slide animation...)
				if(!this._useTopLeft){
					this._useTransformTransition = this.scrollType ? this.scrollType === 3 : has('iphone') >= 6;
				}
				if(!this._useTopLeft){
					if(this._useTransformTransition){
						this._ch.push(connect.connect(this.domNode, "webkitTransitionEnd", this, "onFlickAnimationEnd"));
						this._ch.push(connect.connect(this.domNode, "webkitTransitionStart", this, "onFlickAnimationStart"));
					}else{
						this._ch.push(connect.connect(this.domNode, "webkitAnimationEnd", this, "onFlickAnimationEnd"));
						this._ch.push(connect.connect(this.domNode, "webkitAnimationStart", this, "onFlickAnimationStart"));
	
						// Creation of keyframes takes a little time. If they are created
						// in a lazy manner, a slight delay is noticeable when you start
						// scrolling for the first time. This is to create keyframes up front.
						for(var i = 0; i < 3; i++){
							this.setKeyframes(null, null, i);
						}
					}
					if(has("translate3d")){ // workaround for flicker issue on iPhone and Android 3.x/4.0
						domStyle.set(this.containerNode, "webkitTransform", "translate3d(0,0,0)");
					}
				}else{
					this._ch.push(connect.connect(this.domNode, "webkitTransitionEnd", this, "onFlickAnimationEnd"));
					this._ch.push(connect.connect(this.domNode, "webkitTransitionStart", this, "onFlickAnimationStart"));
				}
			}

			this._speed = {x:0, y:0};
			this._appFooterHeight = 0;
			if(this.isTopLevel() && !this.noResize){
				this.resize();
			}
			var _this = this;
			setTimeout(function(){
				_this.flashScrollBar();
			}, 600);
		},

		isTopLevel: function(){
			// summary:
			//		Returns true if this is a top-level widget.
			// description:
			//		Subclass may want to override.
			return true;
		},

		cleanup: function(){
			// summary:
			//		Uninitialize the module.
			if(this._ch){
				for(var i = 0; i < this._ch.length; i++){
					connect.disconnect(this._ch[i]);
				}
				this._ch = null;
			}
		},

		findDisp: function(/*DomNode*/node){
			// summary:
			//		Finds the currently displayed view node from my sibling nodes.
			if(!node.parentNode){ return null; }

			// the given node is the first candidate
			if(node.nodeType === 1 && domClass.contains(node, "mblSwapView") && node.style.display !== "none"){
				return node;
			}

			var nodes = node.parentNode.childNodes;
			for(var i = 0; i < nodes.length; i++){
				var n = nodes[i];
				if(n.nodeType === 1 && domClass.contains(n, "mblView") && n.style.display !== "none"){
					return n;
				}
			}
			return node;
		},

		getScreenSize: function(){
			// summary:
			//		Returns the dimensions of the browser window.
			return {
				h: win.global.innerHeight||win.doc.documentElement.clientHeight||win.doc.documentElement.offsetHeight,
				w: win.global.innerWidth||win.doc.documentElement.clientWidth||win.doc.documentElement.offsetWidth
			};
		},

		resize: function(e){
			// summary:
			//		Adjusts the height of the widget.
			// description:
			//		If the height property is 'inherit', the height is inherited
			//		from its offset parent. If 'auto', the content height, which
			//		could be smaller than the entire screen height, is used. If an
			//		explicit height value (ex. "300px"), it is used as the new
			//		height. If nothing is specified as the height property, from the
			//		current top position of the widget to the bottom of the screen
			//		will be the new height.

			// moved from init() to support dynamically added fixed bars
			this._appFooterHeight = (this.fixedFooterHeight && !this.isLocalFooter) ?
				this.fixedFooterHeight : 0;
			if(this.isLocalHeader){
				this.containerNode.style.marginTop = this.fixedHeaderHeight + "px";
			}

			// Get the top position. Same as dojo.position(node, true).y
			var top = 0;
			for(var n = this.domNode; n && n.tagName != "BODY"; n = n.offsetParent){
				n = this.findDisp(n); // find the first displayed view node
				if(!n){ break; }
				top += n.offsetTop;
			}

			// adjust the height of this view
			var	h,
				screenHeight = this.getScreenSize().h,
				dh = screenHeight - top - this._appFooterHeight; // default height
			if(this.height === "inherit"){
				if(this.domNode.offsetParent){
					h = this.domNode.offsetParent.offsetHeight + "px";
				}
			}else if(this.height === "auto"){
				var parent = this.domNode.offsetParent;
				if(parent){
					this.domNode.style.height = "0px";
					var	parentRect = parent.getBoundingClientRect(),
						scrollableRect = this.domNode.getBoundingClientRect(),
						contentBottom = parentRect.bottom - this._appFooterHeight;
					if(scrollableRect.bottom >= contentBottom){ // use entire screen
						dh = screenHeight - (scrollableRect.top - parentRect.top) - this._appFooterHeight;
					}else{ // stretch to fill predefined area
						dh = contentBottom - scrollableRect.bottom;
					}
				}
				// content could be smaller than entire screen height
				var contentHeight = Math.max(this.domNode.scrollHeight, this.containerNode.scrollHeight);
				h = (contentHeight ? Math.min(contentHeight, dh) : dh) + "px";
			}else if(this.height){
				h = this.height;
			}
			if(!h){
				h = dh + "px";
			}
			if(h.charAt(0) !== "-" && // to ensure that h is not negative (e.g. "-10px")
				h !== "default"){
				this.domNode.style.height = h;
			}

			// to ensure that the view is within a scrolling area when resized.
			this.onTouchEnd();
		},

		onFlickAnimationStart: function(e){
			event.stop(e);
		},

		onFlickAnimationEnd: function(e){
			var an = e && e.animationName;
			if(an && an.indexOf("scrollableViewScroll2") === -1){
				if(an.indexOf("scrollableViewScroll0") !== -1){ // scrollBarV
					if(this._scrollBarNodeV){ domClass.remove(this._scrollBarNodeV, "mblScrollableScrollTo0"); }
				}else if(an.indexOf("scrollableViewScroll1") !== -1){ // scrollBarH
					if(this._scrollBarNodeH){ domClass.remove(this._scrollBarNodeH, "mblScrollableScrollTo1"); }
				}else{ // fade or others
					if(this._scrollBarNodeV){ this._scrollBarNodeV.className = ""; }
					if(this._scrollBarNodeH){ this._scrollBarNodeH.className = ""; }
				}
				return;
			}
			if(this._useTransformTransition || this._useTopLeft){
				var n = e.target;
				if(n === this._scrollBarV || n === this._scrollBarH){
					var cls = "mblScrollableScrollTo" + (n === this._scrollBarV ? "0" : "1");
					if(domClass.contains(n, cls)){
						domClass.remove(n, cls);
					}else{
						n.className = "";
					}
					return;
				}
			}
			if(e && e.srcElement){
				event.stop(e);
			}
			this.stopAnimation();
			if(this._bounce){
				var _this = this;
				var bounce = _this._bounce;
				setTimeout(function(){
					_this.slideTo(bounce, 0.3, "ease-out");
				}, 0);
				_this._bounce = undefined;
			}else{
				this.hideScrollBar();
				this.removeCover();
			}
		},

		isFormElement: function(/*DOMNode*/node){
			// summary:
			//		Returns true if the given node is a form control.
			if(node && node.nodeType !== 1){ node = node.parentNode; }
			if(!node || node.nodeType !== 1){ return false; }
			var t = node.tagName;
			return (t === "SELECT" || t === "INPUT" || t === "TEXTAREA" || t === "BUTTON");
		},

		onTouchStart: function(e){
			// summary:
			//		User-defined function to handle touchStart events.
			if(this.disableTouchScroll){ return; }
			if(this._conn && (new Date()).getTime() - this.startTime < 500){
				return; // ignore successive onTouchStart calls
			}
			if(!this._conn){
				this._conn = [];
				this._conn.push(connect.connect(win.doc, has('touch') ? "ontouchmove" : "onmousemove", this, "onTouchMove"));
				this._conn.push(connect.connect(win.doc, has('touch') ? "ontouchend" : "onmouseup", this, "onTouchEnd"));
			}

			this._aborted = false;
			if(domClass.contains(this.containerNode, "mblScrollableScrollTo2")){
				this.abort();
			}else{ // reset scrollbar class especially for reseting fade-out animation
				if(this._scrollBarNodeV){ this._scrollBarNodeV.className = ""; }
				if(this._scrollBarNodeH){ this._scrollBarNodeH.className = ""; }
			}
			this.touchStartX = e.touches ? e.touches[0].pageX : e.clientX;
			this.touchStartY = e.touches ? e.touches[0].pageY : e.clientY;
			this.startTime = (new Date()).getTime();
			this.startPos = this.getPos();
			this._dim = this.getDim();
			this._time = [0];
			this._posX = [this.touchStartX];
			this._posY = [this.touchStartY];
			this._locked = false;

			if(!this.isFormElement(e.target)){
				this.propagatable ? e.preventDefault() : event.stop(e);
			}
		},

		onTouchMove: function(e){
			// summary:
			//		User-defined function to handle touchMove events.
			if(this._locked){ return; }
			var x = e.touches ? e.touches[0].pageX : e.clientX;
			var y = e.touches ? e.touches[0].pageY : e.clientY;
			var dx = x - this.touchStartX;
			var dy = y - this.touchStartY;
			var to = {x:this.startPos.x + dx, y:this.startPos.y + dy};
			var dim = this._dim;

			dx = Math.abs(dx);
			dy = Math.abs(dy);
			if(this._time.length == 1){ // the first TouchMove after TouchStart
				if(this.dirLock){
					if(this._v && !this._h && dx >= this.threshold && dx >= dy ||
						(this._h || this._f) && !this._v && dy >= this.threshold && dy >= dx){
						this._locked = true;
						return;
					}
				}
				if(this._v && this._h){ // scrollDir="hv"
					if(dy < this.threshold &&
					   dx < this.threshold){
						return;
					}
				}else{
					if(this._v && dy < this.threshold ||
					   (this._h || this._f) && dx < this.threshold){
						return;
					}
				}
				this.addCover();
				this.showScrollBar();
			}

			var weight = this.weight;
			if(this._v && this.constraint){
				if(to.y > 0){ // content is below the screen area
					to.y = Math.round(to.y * weight);
				}else if(to.y < -dim.o.h){ // content is above the screen area
					if(dim.c.h < dim.d.h){ // content is shorter than display
						to.y = Math.round(to.y * weight);
					}else{
						to.y = -dim.o.h - Math.round((-dim.o.h - to.y) * weight);
					}
				}
			}
			if((this._h || this._f) && this.constraint){
				if(to.x > 0){
					to.x = Math.round(to.x * weight);
				}else if(to.x < -dim.o.w){
					if(dim.c.w < dim.d.w){
						to.x = Math.round(to.x * weight);
					}else{
						to.x = -dim.o.w - Math.round((-dim.o.w - to.x) * weight);
					}
				}
			}
			this.scrollTo(to);

			var max = 10;
			var n = this._time.length; // # of samples
			if(n >= 2){
				// Check the direction of the finger move.
				// If the direction has been changed, discard the old data.
				var d0, d1;
				if(this._v && !this._h){
					d0 = this._posY[n - 1] - this._posY[n - 2];
					d1 = y - this._posY[n - 1];
				}else if(!this._v && this._h){
					d0 = this._posX[n - 1] - this._posX[n - 2];
					d1 = x - this._posX[n - 1];
				}
				if(d0 * d1 < 0){ // direction changed
					// leave only the latest data
					this._time = [this._time[n - 1]];
					this._posX = [this._posX[n - 1]];
					this._posY = [this._posY[n - 1]];
					n = 1;
				}
			}
			if(n == max){
				this._time.shift();
				this._posX.shift();
				this._posY.shift();
			}
			this._time.push((new Date()).getTime() - this.startTime);
			this._posX.push(x);
			this._posY.push(y);
		},

		onTouchEnd: function(/*Event*/e){
			// summary:
			//		User-defined function to handle touchEnd events.
			if(this._locked){ return; }
			var speed = this._speed = {x:0, y:0};
			var dim = this._dim;
			var pos = this.getPos();
			var to = {}; // destination
			if(e){
				if(!this._conn){ return; } // if we get onTouchEnd without onTouchStart, ignore it.
				for(var i = 0; i < this._conn.length; i++){
					connect.disconnect(this._conn[i]);
				}
				this._conn = null;

				var n = this._time.length; // # of samples
				var clicked = false;
				if(!this._aborted){
					if(n <= 1){
						clicked = true;
					}else if(n == 2 && Math.abs(this._posY[1] - this._posY[0]) < 4
						&& has('touch')){ // for desktop browsers, posY could be the same, since we're using clientY, see onTouchMove()
						clicked = true;
					}
				}
				if(clicked){ // clicked, not dragged or flicked
					this.hideScrollBar();
					this.removeCover();
					// #12697 Do not generate a click event programmatically when a
					// form element (input, select, etc.) is clicked.
					// Otherwise, in particular, when checkbox is clicked, its state
					// is reversed again by the generated event.
					// #15878 The reason we send this synthetic click event is that we assume that the OS
					// will not send the click because we prevented/stopped the touchstart.
					// However, this does not seem true any more in Android 4.1 where the click is
					// actually sent by the OS. So we must not send it a second time.
					if(has('touch') && !this.isFormElement(e.target) && !(has("android") >= 4.1)){
						var elem = e.target;
						if(elem.nodeType != 1){
							elem = elem.parentNode;
						}
						var ev = win.doc.createEvent("MouseEvents");
						ev.initMouseEvent("click", true, true, win.global, 1, e.screenX, e.screenY, e.clientX, e.clientY);
						setTimeout(function(){
							elem.dispatchEvent(ev);
						}, 0);
					}
					return;
				}
				speed = this._speed = this.getSpeed();
			}else{
				if(pos.x == 0 && pos.y == 0){ return; } // initializing
				dim = this.getDim();
			}

			if(this._v){
				to.y = pos.y + speed.y;
			}
			if(this._h || this._f){
				to.x = pos.x + speed.x;
			}

			if(this.adjustDestination(to, pos, dim) === false){ return; }

			if(this.scrollDir == "v" && dim.c.h < dim.d.h){ // content is shorter than display
				this.slideTo({y:0}, 0.3, "ease-out"); // go back to the top
				return;
			}else if(this.scrollDir == "h" && dim.c.w < dim.d.w){ // content is narrower than display
				this.slideTo({x:0}, 0.3, "ease-out"); // go back to the left
				return;
			}else if(this._v && this._h && dim.c.h < dim.d.h && dim.c.w < dim.d.w){
				this.slideTo({x:0, y:0}, 0.3, "ease-out"); // go back to the top-left
				return;
			}

			var duration, easing = "ease-out";
			var bounce = {};
			if(this._v && this.constraint){
				if(to.y > 0){ // going down. bounce back to the top.
					if(pos.y > 0){ // started from below the screen area. return quickly.
						duration = 0.3;
						to.y = 0;
					}else{
						to.y = Math.min(to.y, 20);
						easing = "linear";
						bounce.y = 0;
					}
				}else if(-speed.y > dim.o.h - (-pos.y)){ // going up. bounce back to the bottom.
					if(pos.y < -dim.o.h){ // started from above the screen top. return quickly.
						duration = 0.3;
						to.y = dim.c.h <= dim.d.h ? 0 : -dim.o.h; // if shorter, move to 0
					}else{
						to.y = Math.max(to.y, -dim.o.h - 20);
						easing = "linear";
						bounce.y = -dim.o.h;
					}
				}
			}
			if((this._h || this._f) && this.constraint){
				if(to.x > 0){ // going right. bounce back to the left.
					if(pos.x > 0){ // started from right of the screen area. return quickly.
						duration = 0.3;
						to.x = 0;
					}else{
						to.x = Math.min(to.x, 20);
						easing = "linear";
						bounce.x = 0;
					}
				}else if(-speed.x > dim.o.w - (-pos.x)){ // going left. bounce back to the right.
					if(pos.x < -dim.o.w){ // started from left of the screen top. return quickly.
						duration = 0.3;
						to.x = dim.c.w <= dim.d.w ? 0 : -dim.o.w; // if narrower, move to 0
					}else{
						to.x = Math.max(to.x, -dim.o.w - 20);
						easing = "linear";
						bounce.x = -dim.o.w;
					}
				}
			}
			this._bounce = (bounce.x !== undefined || bounce.y !== undefined) ? bounce : undefined;

			if(duration === undefined){
				var distance, velocity;
				if(this._v && this._h){
					velocity = Math.sqrt(speed.x*speed.x + speed.y*speed.y);
					distance = Math.sqrt(Math.pow(to.y - pos.y, 2) + Math.pow(to.x - pos.x, 2));
				}else if(this._v){
					velocity = speed.y;
					distance = to.y - pos.y;
				}else if(this._h){
					velocity = speed.x;
					distance = to.x - pos.x;
				}
				if(distance === 0 && !e){ return; } // #13154
				duration = velocity !== 0 ? Math.abs(distance / velocity) : 0.01; // time = distance / velocity
			}
			this.slideTo(to, duration, easing);
		},

		adjustDestination: function(/*Object*/to, /*Object*/pos, /*Object*/dim){
			// summary:
			//		A stub function to be overridden by subclasses.
			// description:
			//		This function is called from onTouchEnd(). The purpose is to give its
			//		subclasses a chance to adjust the destination position. If this
			//		function returns false, onTouchEnd() returns immediately without
			//		performing scroll.
			// to:
			//		The destination position. An object with x and y.
			// pos:
			//		The current position. An object with x and y.
			// dim:
			//		Dimension information returned by getDim().			

			// subclass may want to implement
			return true; // Boolean
		},

		abort: function(){
			// summary:
			//		Aborts scrolling.
			// description:
			//		This function stops the scrolling animation that is currently
			//		running. It is called when the user touches the screen while
			//		scrolling.
			this.scrollTo(this.getPos());
			this.stopAnimation();
			this._aborted = true;
		},

		stopAnimation: function(){
			// summary:
			//		Stops the currently running animation.
			domClass.remove(this.containerNode, "mblScrollableScrollTo2");
			if(this._scrollBarV){
				this._scrollBarV.className = "";
			}
			if(this._scrollBarH){
				this._scrollBarH.className = "";
			}
			if(this._useTransformTransition || this._useTopLeft){
				this.containerNode.style.webkitTransition = "";
				if(this._scrollBarV) { this._scrollBarV.style.webkitTransition = ""; }
				if(this._scrollBarH) { this._scrollBarH.style.webkitTransition = ""; }
			}
		},

		scrollIntoView: function(/*DOMNode*/node, /*Boolean?*/alignWithTop, /*Number?*/duration){
			// summary:
			//		Scrolls the pane until the searching node is in the view.
			// node:
			//		A DOM node to be searched for view.
			// alignWithTop:
			//		If true, aligns the node at the top of the pane.
			//		If false, aligns the node at the bottom of the pane.
			// duration:
			//		Duration of scrolling in seconds. (ex. 0.3)
			//		If not specified, scrolls without animation.
			// description:
			//		Just like the scrollIntoView method of DOM elements, this
			//		function causes the given node to scroll into view, aligning it
			//		either at the top or bottom of the pane.

			if(!this._v){ return; } // cannot scroll vertically

			var c = this.containerNode,
				h = this.getDim().d.h, // the height of ScrollableView's content display area
				top = 0;

			// Get the top position of node relative to containerNode
			for(var n = node; n !== c; n = n.offsetParent){
				if(!n || n.tagName === "BODY"){ return; } // exit if node is not a child of scrollableView
				top += n.offsetTop;
			}
			// Calculate scroll destination position
			var y = alignWithTop ? Math.max(h - c.offsetHeight, -top) : Math.min(0, h - top - node.offsetHeight);

			// Scroll to destination position
			(duration && typeof duration === "number") ? 
				this.slideTo({y: y}, duration, "ease-out") : this.scrollTo({y: y});
		},

		getSpeed: function(){
			// summary:
			//		Returns an object that indicates the scrolling speed.
			// description:
			//		From the position and elapsed time information, calculates the
			//		scrolling speed, and returns an object with x and y.
			var x = 0, y = 0, n = this._time.length;
			// if the user holds the mouse or finger more than 0.5 sec, do not move.
			if(n >= 2 && (new Date()).getTime() - this.startTime - this._time[n - 1] < 500){
				var dy = this._posY[n - (n > 3 ? 2 : 1)] - this._posY[(n - 6) >= 0 ? n - 6 : 0];
				var dx = this._posX[n - (n > 3 ? 2 : 1)] - this._posX[(n - 6) >= 0 ? n - 6 : 0];
				var dt = this._time[n - (n > 3 ? 2 : 1)] - this._time[(n - 6) >= 0 ? n - 6 : 0];
				y = this.calcSpeed(dy, dt);
				x = this.calcSpeed(dx, dt);
			}
			return {x:x, y:y};
		},

		calcSpeed: function(/*Number*/distance, /*Number*/time){
			// summary:
			//		Calculate the speed given the distance and time.
			return Math.round(distance / time * 100) * 4;
		},

		scrollTo: function(/*Object*/to, /*Boolean?*/doNotMoveScrollBar, /*DomNode?*/node){
			// summary:
			//		Scrolls to the given position immediately without animation.
			// to:
			//		The destination position. An object with x and y.
			//		ex. {x:0, y:-5}
			// doNotMoveScrollBar:
			//		If true, the scroll bar will not be updated. If not specified,
			//		it will be updated.
			// node:
			//		A DOM node to scroll. If not specified, defaults to
			//		this.containerNode.

			var s = (node || this.containerNode).style;
			if(has("webkit")){
				if(!this._useTopLeft){
					if(this._useTransformTransition){
						s.webkitTransition = "";	
					}
					s.webkitTransform = this.makeTranslateStr(to);
				}else{
					s.webkitTransition = "";
					if(this._v){
						s.top = to.y + "px";
					}
					if(this._h || this._f){
						s.left = to.x + "px";
					}
				}
			}else{
				if(this._v){
					s.top = to.y + "px";
				}
				if(this._h || this._f){
					s.left = to.x + "px";
				}
			}
			if(!doNotMoveScrollBar){
				this.scrollScrollBarTo(this.calcScrollBarPos(to));
			}
		},

		slideTo: function(/*Object*/to, /*Number*/duration, /*String*/easing){
			// summary:
			//		Scrolls to the given position with the slide animation.
			// to:
			//		The scroll destination position. An object with x and/or y.
			//		ex. {x:0, y:-5}, {y:-29}, etc.
			// duration:
			//		Duration of scrolling in seconds. (ex. 0.3)
			// easing:
			//		The name of easing effect which webkit supports.
			//		"ease", "linear", "ease-in", "ease-out", etc.

			this._runSlideAnimation(this.getPos(), to, duration, easing, this.containerNode, 2);
			this.slideScrollBarTo(to, duration, easing);
		},

		makeTranslateStr: function(/*Object*/to){
			// summary:
			//		Constructs a string value that is passed to the -webkit-transform property.
			// to:
			//		The destination position. An object with x and/or y.
			// description:
			//		Return value example: "translate3d(0px,-8px,0px)"

			var y = this._v && typeof to.y == "number" ? to.y+"px" : "0px";
			var x = (this._h||this._f) && typeof to.x == "number" ? to.x+"px" : "0px";
			return has("translate3d") ?
					"translate3d("+x+","+y+",0px)" : "translate("+x+","+y+")";
		},

		getPos: function(){
			// summary:
			//		Gets the top position in the midst of animation.
			if(has("webkit")){
				var s = win.doc.defaultView.getComputedStyle(this.containerNode, '');
				if(!this._useTopLeft){
					var m = s["-webkit-transform"];
					if(m && m.indexOf("matrix") === 0){
						var arr = m.split(/[,\s\)]+/);
						return {y:arr[5] - 0, x:arr[4] - 0};
					}
					return {x:0, y:0};
				}else{
					return {x:parseInt(s.left) || 0, y:parseInt(s.top) || 0};
				}
			}else{
				// this.containerNode.offsetTop does not work here,
				// because it adds the height of the top margin.
				var y = parseInt(this.containerNode.style.top) || 0;
				return {y:y, x:this.containerNode.offsetLeft};
			}
		},

		getDim: function(){
			// summary:
			//		Returns various internal dimensional information needed for calculation.

			var d = {};
			// content width/height
			d.c = {h:this.containerNode.offsetHeight, w:this.containerNode.offsetWidth};

			// view width/height
			d.v = {h:this.domNode.offsetHeight + this._appFooterHeight, w:this.domNode.offsetWidth};

			// display width/height
			d.d = {h:d.v.h - this.fixedHeaderHeight - this.fixedFooterHeight, w:d.v.w};

			// overflowed width/height
			d.o = {h:d.c.h - d.v.h + this.fixedHeaderHeight + this.fixedFooterHeight, w:d.c.w - d.v.w};
			return d;
		},

		showScrollBar: function(){
			// summary:
			//		Shows the scroll bar.
			// description:
			//		This function creates the scroll bar instance if it does not
			//		exist yet, and calls resetScrollBar() to reset its length and
			//		position.

			if(!this.scrollBar){ return; }

			var dim = this._dim;
			if(this.scrollDir == "v" && dim.c.h <= dim.d.h){ return; }
			if(this.scrollDir == "h" && dim.c.w <= dim.d.w){ return; }
			if(this._v && this._h && dim.c.h <= dim.d.h && dim.c.w <= dim.d.w){ return; }

			var createBar = function(self, dir){
				var bar = self["_scrollBarNode" + dir];
				if(!bar){
					var wrapper = domConstruct.create("div", null, self.domNode);
					var props = { position: "absolute", overflow: "hidden" };
					if(dir == "V"){
						props.right = "2px";
						props.width = "5px";
					}else{
						props.bottom = (self.isLocalFooter ? self.fixedFooterHeight : 0) + 2 + "px";
						props.height = "5px";
					}
					domStyle.set(wrapper, props);
					wrapper.className = "mblScrollBarWrapper";
					self["_scrollBarWrapper"+dir] = wrapper;

					bar = domConstruct.create("div", null, wrapper);
					domStyle.set(bar, {
						opacity: 0.6,
						position: "absolute",
						backgroundColor: "#606060",
						fontSize: "1px",
						webkitBorderRadius: "2px",
						MozBorderRadius: "2px",
						webkitTransformOrigin: "0 0",
						zIndex: 2147483647 // max of signed 32-bit integer
					});
					domStyle.set(bar, dir == "V" ? {width: "5px"} : {height: "5px"});
					self["_scrollBarNode" + dir] = bar;
				}
				return bar;
			};
			if(this._v && !this._scrollBarV){
				this._scrollBarV = createBar(this, "V");
			}
			if(this._h && !this._scrollBarH){
				this._scrollBarH = createBar(this, "H");
			}
			this.resetScrollBar();
		},

		hideScrollBar: function(){
			// summary:
			//		Hides the scroll bar.
			// description:
			//		If the fadeScrollBar property is true, hides the scroll bar with
			//		the fade animation.

			if(this.fadeScrollBar && has("webkit")){
				if(!dm._fadeRule){
					var node = domConstruct.create("style", null, win.doc.getElementsByTagName("head")[0]);
					node.textContent =
						".mblScrollableFadeScrollBar{"+
						"  -webkit-animation-duration: 1s;"+
						"  -webkit-animation-name: scrollableViewFadeScrollBar;}"+
						"@-webkit-keyframes scrollableViewFadeScrollBar{"+
						"  from { opacity: 0.6; }"+
						"  to { opacity: 0; }}";
					dm._fadeRule = node.sheet.cssRules[1];
				}
			}
			if(!this.scrollBar){ return; }
			var f = function(bar, self){
				domStyle.set(bar, {
					opacity: 0,
					webkitAnimationDuration: ""
				});
				// do not use fade animation in case of using top/left on Android
				// since it causes screen flicker during adress bar's fading out
				if(!(self._useTopLeft && has('android'))){
					bar.className = "mblScrollableFadeScrollBar";
				}
			};
			if(this._scrollBarV){
				f(this._scrollBarV, this);
				this._scrollBarV = null;
			}
			if(this._scrollBarH){
				f(this._scrollBarH, this);
				this._scrollBarH = null;
			}
		},

		calcScrollBarPos: function(/*Object*/to){
			// summary:
			//		Calculates the scroll bar position.
			// description:
			//		Given the scroll destination position, calculates the top and/or
			//		the left of the scroll bar(s). Returns an object with x and y.
			// to:
			//		The scroll destination position. An object with x and y.
			//		ex. {x:0, y:-5}			

			var pos = {};
			var dim = this._dim;
			var f = function(wrapperH, barH, t, d, c){
				var y = Math.round((d - barH - 8) / (d - c) * t);
				if(y < -barH + 5){
					y = -barH + 5;
				}
				if(y > wrapperH - 5){
					y = wrapperH - 5;
				}
				return y;
			};
			if(typeof to.y == "number" && this._scrollBarV){
				pos.y = f(this._scrollBarWrapperV.offsetHeight, this._scrollBarV.offsetHeight, to.y, dim.d.h, dim.c.h);
			}
			if(typeof to.x == "number" && this._scrollBarH){
				pos.x = f(this._scrollBarWrapperH.offsetWidth, this._scrollBarH.offsetWidth, to.x, dim.d.w, dim.c.w);
			}
			return pos;
		},

		scrollScrollBarTo: function(/*Object*/to){
			// summary:
			//		Moves the scroll bar(s) to the given position without animation.
			// to:
			//		The destination position. An object with x and/or y.
			//		ex. {x:2, y:5}, {y:20}, etc.

			if(!this.scrollBar){ return; }
			if(this._v && this._scrollBarV && typeof to.y == "number"){
				if(has("webkit")){
					if(!this._useTopLeft){
						if(this._useTransformTransition){
							this._scrollBarV.style.webkitTransition = "";
						}
						this._scrollBarV.style.webkitTransform = this.makeTranslateStr({y:to.y});
					}else{
						domStyle.set(this._scrollBarV, {
							webkitTransition: "",
							top: to.y + "px"
						});
					}
				}else{
					this._scrollBarV.style.top = to.y + "px";
				}
			}
			if(this._h && this._scrollBarH && typeof to.x == "number"){
				if(has("webkit")){
					if(!this._useTopLeft){
						if(this._useTransformTransition){
							this._scrollBarH.style.webkitTransition = "";
						}
						this._scrollBarH.style.webkitTransform = this.makeTranslateStr({x:to.x});
					}else{
						domStyle.set(this._scrollBarH, {
							webkitTransition: "",
							left: to.x + "px"
						});
					}
				}else{
					this._scrollBarH.style.left = to.x + "px";
				}
			}
		},

		slideScrollBarTo: function(/*Object*/to, /*Number*/duration, /*String*/easing){
			// summary:
			//		Moves the scroll bar(s) to the given position with the slide animation.
			// to:
			//		The destination position. An object with x and y.
			//		ex. {x:0, y:-5}
			// duration:
			//		Duration of the animation in seconds. (ex. 0.3)
			// easing:
			//		The name of easing effect which webkit supports.
			//		"ease", "linear", "ease-in", "ease-out", etc.

			if(!this.scrollBar){ return; }
			var fromPos = this.calcScrollBarPos(this.getPos());
			var toPos = this.calcScrollBarPos(to);
			if(this._v && this._scrollBarV){
				this._runSlideAnimation({y:fromPos.y}, {y:toPos.y}, duration, easing, this._scrollBarV, 0);
			}
			if(this._h && this._scrollBarH){
				this._runSlideAnimation({x:fromPos.x}, {x:toPos.x}, duration, easing, this._scrollBarH, 1);
			}
		},

		_runSlideAnimation: function(/*Object*/from, /*Object*/to, /*Number*/duration, /*String*/easing, /*DomNode*/node, /*Number*/idx){
			// tags:
			//		private
			
			// idx: 0:scrollbarV, 1:scrollbarH, 2:content
			if(has("webkit")){
				if(!this._useTopLeft){
					if(this._useTransformTransition){
						// for iOS6 (maybe others?): use -webkit-transform + -webkit-transition
						if(to.x === undefined){ to.x = from.x; }
						if(to.y === undefined){ to.y = from.y; }
						 // make sure we actually change the transform, otherwise no webkitTransitionEnd is fired.
						if(to.x !== from.x || to.y !== from.y){
							domStyle.set(node, {
								webkitTransitionProperty: "-webkit-transform",
								webkitTransitionDuration: duration + "s",
								webkitTransitionTimingFunction: easing
							});
							var t = this.makeTranslateStr(to);
							setTimeout(function(){ // setTimeout is needed to prevent webkitTransitionEnd not fired
								domStyle.set(node, {
									webkitTransform: t
								});
							}, 0);
							domClass.add(node, "mblScrollableScrollTo"+idx);
						} else {
							// transform not changed, just hide the scrollbar
							this.hideScrollBar();
							this.removeCover();
						}
					}else{
						// use -webkit-transform + -webkit-animation
						this.setKeyframes(from, to, idx);
						domStyle.set(node, {
							webkitAnimationDuration: duration + "s",
							webkitAnimationTimingFunction: easing
						});
						domClass.add(node, "mblScrollableScrollTo"+idx);
						if(idx == 2){
							this.scrollTo(to, true, node);
						}else{
							this.scrollScrollBarTo(to);
						}
					}
				}else{
					domStyle.set(node, {
						webkitTransitionProperty: "top, left",
						webkitTransitionDuration: duration + "s",
						webkitTransitionTimingFunction: easing
					});
					setTimeout(function(){ // setTimeout is needed to prevent webkitTransitionEnd not fired
						domStyle.set(node, {
							top: (to.y || 0) + "px",
							left: (to.x || 0) + "px"
						});
					}, 0);
					domClass.add(node, "mblScrollableScrollTo"+idx);
				}
			}else if(dojo.fx && dojo.fx.easing && duration){
				// If you want to support non-webkit browsers,
				// your application needs to load necessary modules as follows:
				//
				// | dojo.require("dojo.fx");
				// | dojo.require("dojo.fx.easing");
				//
				// This module itself does not make dependency on them.
				// TODO: for 2.0 the dojo global is going away.   Use require("dojo/fx") and require("dojo/fx/easing") instead.
				var s = dojo.fx.slideTo({
					node: node,
					duration: duration*1000,
					left: to.x,
					top: to.y,
					easing: (easing == "ease-out") ? dojo.fx.easing.quadOut : dojo.fx.easing.linear
				}).play();
				if(idx == 2){
					connect.connect(s, "onEnd", this, "onFlickAnimationEnd");
				}
			}else{
				// directly jump to the destination without animation
				if(idx == 2){
					this.scrollTo(to, false, node);
					this.onFlickAnimationEnd();
				}else{
					this.scrollScrollBarTo(to);
				}
			}
		},

		resetScrollBar: function(){
			// summary:
			//		Resets the scroll bar length, position, etc.
			var f = function(wrapper, bar, d, c, hd, v){
				if(!bar){ return; }
				var props = {};
				props[v ? "top" : "left"] = hd + 4 + "px"; // +4 is for top or left margin
				var t = (d - 8) <= 0 ? 1 : d - 8;
				props[v ? "height" : "width"] = t + "px";
				domStyle.set(wrapper, props);
				var l = Math.round(d * d / c); // scroll bar length
				l = Math.min(Math.max(l - 8, 5), t); // -8 is for margin for both ends
				bar.style[v ? "height" : "width"] = l + "px";
				domStyle.set(bar, {"opacity": 0.6});
			};
			var dim = this.getDim();
			f(this._scrollBarWrapperV, this._scrollBarV, dim.d.h, dim.c.h, this.fixedHeaderHeight, true);
			f(this._scrollBarWrapperH, this._scrollBarH, dim.d.w, dim.c.w, 0);
			this.createMask();
		},

		createMask: function(){
			// summary:
			//		Creates a mask for a scroll bar edge.
			// description:
			//		This function creates a mask that hides corners of one scroll
			//		bar edge to make it round edge. The other side of the edge is
			//		always visible and round shaped with the border-radius style.
			if(!has("webkit")){ return; }
			var ctx;
			if(this._scrollBarWrapperV){
				var h = this._scrollBarWrapperV.offsetHeight;
				ctx = win.doc.getCSSCanvasContext("2d", "scrollBarMaskV", 5, h);
				ctx.fillStyle = "rgba(0,0,0,0.5)";
				ctx.fillRect(1, 0, 3, 2);
				ctx.fillRect(0, 1, 5, 1);
				ctx.fillRect(0, h - 2, 5, 1);
				ctx.fillRect(1, h - 1, 3, 2);
				ctx.fillStyle = "rgb(0,0,0)";
				ctx.fillRect(0, 2, 5, h - 4);
				this._scrollBarWrapperV.style.webkitMaskImage = "-webkit-canvas(scrollBarMaskV)";
			}
			if(this._scrollBarWrapperH){
				var w = this._scrollBarWrapperH.offsetWidth;
				ctx = win.doc.getCSSCanvasContext("2d", "scrollBarMaskH", w, 5);
				ctx.fillStyle = "rgba(0,0,0,0.5)";
				ctx.fillRect(0, 1, 2, 3);
				ctx.fillRect(1, 0, 1, 5);
				ctx.fillRect(w - 2, 0, 1, 5);
				ctx.fillRect(w - 1, 1, 2, 3);
				ctx.fillStyle = "rgb(0,0,0)";
				ctx.fillRect(2, 0, w - 4, 5);
				this._scrollBarWrapperH.style.webkitMaskImage = "-webkit-canvas(scrollBarMaskH)";
			}
		},

		flashScrollBar: function(){
			// summary:
			//		Shows the scroll bar instantly.
			// description:
			//		This function shows the scroll bar, and then hides it 300ms
			//		later. This is used to show the scroll bar to the user for a
			//		short period of time when a hidden view is revealed.
			if(this.disableFlashScrollBar || !this.domNode){ return; }
			this._dim = this.getDim();
			if(this._dim.d.h <= 0){ return; } // dom is not ready
			this.showScrollBar();
			var _this = this;
			setTimeout(function(){
				_this.hideScrollBar();
			}, 300);
		},

		addCover: function(){
			// summary:
			//		Adds the transparent DIV cover.
			// description:
			//		The cover is to prevent DOM events from affecting the child
			//		widgets such as a list widget. Without the cover, for example,
			//		child widgets may receive a click event and respond to it
			//		unexpectedly when the user flicks the screen to scroll.
			//		Note that only the desktop browsers need the cover.

			if(!has('touch') && !this.noCover){
				if(!dm._cover){
					dm._cover = domConstruct.create("div", null, win.doc.body);
					dm._cover.className = "mblScrollableCover";
					domStyle.set(dm._cover, {
						backgroundColor: "#ffff00",
						opacity: 0,
						position: "absolute",
						top: "0px",
						left: "0px",
						width: "100%",
						height: "100%",
						zIndex: 2147483647 // max of signed 32-bit integer
					});
					this._ch.push(connect.connect(dm._cover,
						has('touch') ? "ontouchstart" : "onmousedown", this, "onTouchEnd"));
				}else{
					dm._cover.style.display = "";
				}
				this.setSelectable(dm._cover, false);
				this.setSelectable(this.domNode, false);
			}
		},

		removeCover: function(){
			// summary:
			//		Removes the transparent DIV cover.

			if(!has('touch') && dm._cover){
				dm._cover.style.display = "none";
				this.setSelectable(dm._cover, true);
				this.setSelectable(this.domNode, true);
			}
		},

		setKeyframes: function(/*Object*/from, /*Object*/to, /*Number*/idx){
			// summary:
			//		Programmatically sets key frames for the scroll animation.

			if(!dm._rule){
				dm._rule = [];
			}
			// idx: 0:scrollbarV, 1:scrollbarH, 2:content
			if(!dm._rule[idx]){
				var node = domConstruct.create("style", null, win.doc.getElementsByTagName("head")[0]);
				node.textContent =
					".mblScrollableScrollTo"+idx+"{-webkit-animation-name: scrollableViewScroll"+idx+";}"+
					"@-webkit-keyframes scrollableViewScroll"+idx+"{}";
				dm._rule[idx] = node.sheet.cssRules[1];
			}
			var rule = dm._rule[idx];
			if(rule){
				if(from){
					rule.deleteRule("from");
					rule.insertRule("from { -webkit-transform: "+this.makeTranslateStr(from)+"; }");
				}
				if(to){
					if(to.x === undefined){ to.x = from.x; }
					if(to.y === undefined){ to.y = from.y; }
					rule.deleteRule("to");
					rule.insertRule("to { -webkit-transform: "+this.makeTranslateStr(to)+"; }");
				}
			}
		},

		setSelectable: function(/*DomNode*/node, /*Boolean*/selectable){
			// summary:
			//		Sets the given node as selectable or unselectable.
			 
			// dojo.setSelectable has dependency on dojo.query. Redefine our own.
			node.style.KhtmlUserSelect = selectable ? "auto" : "none";
			node.style.MozUserSelect = selectable ? "" : "none";
			node.onselectstart = selectable ? null : function(){return false;};
			if(has("ie")){
				node.unselectable = selectable ? "" : "on";
				var nodes = node.getElementsByTagName("*");
				for(var i = 0; i < nodes.length; i++){
					nodes[i].unselectable = selectable ? "" : "on";
				}
			}
		}
	});

	lang.setObject("dojox.mobile.scrollable", Scrollable);

	return Scrollable;
});
