define(["dojo/_base/kernel",
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/event",
	"dojo/_base/sniff",
	"dojo/dom",
	"dojo/dom-attr",
	"dojo/dom-construct",
	"dojo/dom-geometry",
	"dojo/dom-style",
	"dojo/window",
	"dojo/_base/window",
	"dojo/_base/fx",
	"dojo/fx",
	"dijit/_Widget",
	"dijit/_TemplatedMixin",
	"dijit/registry"],

function(kernel,
		declare,
		array,
		event,
		has,
		dom,
		attr,
		construct,
		geometry,
		domStyle,
		window,
		baseWindow,
		baseFx,
		fx,
		_Widget,
		_TemplatedMixin,
		registry) {

kernel.experimental("dojox.widget.Standby");

return declare("dojox.widget.Standby", [_Widget, _TemplatedMixin],{
	// summary:
	//		A widget designed to act as a Standby/Busy/Disable/Blocking widget to indicate a
	//		particular DOM node is processing and cannot be clicked on at this time.
	//		This widget uses absolute positioning to apply the overlay and image.

	// image: String
	//		A URL to an image to center within the blocking overlay.
	//		The default is a basic spinner.
	image: require.toUrl("dojox/widget/Standby/images/loading.gif").toString(),

	// imageText: String
	//		Text to set on the ALT tag of the image.
	//		The default is 'Please wait...'
	imageText: "Please Wait...", // TODO: i18n

	// text: String
	//		Text/HTML to display in the center of the overlay
	//		This is used if image center is disabled.
	//		Defaults to 'Please Wait...'
	text: "Please wait...",

	// centerIndicator: String
	//		Property to define if the image and its alt text should be used, or
	//		a simple Text/HTML node should be used.  Allowable values are 'image'
	//		and 'text'.
	//		Default is 'image'.
	centerIndicator: "image",
	
	// target: DOMNode||DOMID(String)||WidgetID(String)
	//		The target to overlay when active.  Can be a widget id, a
	//		dom id, or a direct node reference.
	target: "",

	// color:	String
	//		The color to set the overlay.  Should be in #XXXXXX form.
	//		Default color for the translucent overlay is light gray.
	color: "#C0C0C0",

	// duration: Integer
	//		Integer defining how long the show and hide effects should take in milliseconds.
	//		Defaults to 500
	duration: 500,
	
	// zIndex: String
	//		Control that lets you specify if the zIndex for the overlay
	//		should be auto-computed based off parent zIndex, or should be set
	//		to a particular value.  This is useful when you want to overlay
	//		things in digit.Dialogs, you can specify a base zIndex to append from.
	zIndex: "auto",
	
	// opacity: float
	//		The opacity to make the overlay when it is displayed/faded in.
	//		The default is 0.75.  This does not affect the image opacity, only the
	//		overlay.
	opacity: 0.75,	
	
	// templateString: [protected] String
	//		The template string defining out the basics of the widget.  No need for an external
	//		file.
	templateString:
		"<div>" +
			"<div style=\"display: none; opacity: 0; z-index: 9999; " +
				"position: absolute; cursor:wait;\" dojoAttachPoint=\"_underlayNode\"></div>" +
			"<img src=\"${image}\" style=\"opacity: 0; display: none; z-index: -10000; " +
				"position: absolute; top: 0px; left: 0px; cursor:wait;\" "+
				"dojoAttachPoint=\"_imageNode\">" +
			"<div style=\"opacity: 0; display: none; z-index: -10000; position: absolute; " +
				"top: 0px;\" dojoAttachPoint=\"_textNode\"></div>" +
		"</div>",

	// _underlayNode: [private] DOMNode
	//		The node that is the translucent underlay for the
	//		image that blocks access to the target.
	_underlayNode: null,

	// _imageNode: [private] DOMNode
	//		The image node where we attach and define the image to display.
	_imageNode: null,

	// _textNode: [private] DOMNode
	//		The div to attach text/HTML in the overlay center item.
	_textNode: null,

	// _centerNode: [private] DOMNode
	//		Which node to use as the center node, the image or the text node.
	_centerNode: null,

	// _displayed: [private] Boolean
	//		Flag to indicate if the overlay is displayed or not.
	_displayed: false,

	// _resizeCheck: [private] Object
	//		Handle to interval function that checks the target for changes.
	_resizeCheck: null,

	// _started: [private] Boolean
	//		Trap flag to ensure startup only processes once.
	_started: false,

	// _parent: [private] DOMNode
	//		Wrapping div for the widget, also used for IE 7 in dealing with the
	//		zoom issue.
	_parent: null,

	startup: function(args){
		// summary:
		//		Over-ride of the basic widget startup function.
		//		Configures the target node and sets the image to use.
		if(!this._started){
			if(typeof this.target === "string"){
				var w = registry.byId(this.target);
				this.target = w ? w.domNode : dom.byId(this.target);
			}

			if(this.text){
				this._textNode.innerHTML = this.text;
			}
			if(this.centerIndicator === "image"){
				this._centerNode = this._imageNode;
				attr.set(this._imageNode, "src", this.image);
				attr.set(this._imageNode, "alt", this.imageText);
			}else{
				this._centerNode = this._textNode;
			}
			domStyle.set(this._underlayNode, {
				display: "none",
				backgroundColor: this.color
			});
			domStyle.set(this._centerNode, "display", "none");
			this.connect(this._underlayNode, "onclick", "_ignore");

			//Last thing to do is move the widgets parent, if any, to the current document body.
			//Avoids having to deal with parent relative/absolute mess.  Otherwise positioning
			//tends to go goofy.
			if(this.domNode.parentNode && this.domNode.parentNode != baseWindow.body()){
				baseWindow.body().appendChild(this.domNode);
			}

			//IE 7 has a horrible bug with zoom, so we have to create this node
			//to cross-check later.  Sigh.
			if(has("ie") == 7){
				this._ieFixNode = construct.create("div");
				domStyle.set(this._ieFixNode, {
					opacity: "0",
					zIndex: "-1000",
					position: "absolute",
					top: "-1000px"
				});
				baseWindow.body().appendChild(this._ieFixNode);
			}
			this.inherited(arguments);
		}		
	},

	show: function(){
		// summary:
		//		Function to display the blocking overlay and busy/status icon or text.
		if(!this._displayed){
			if(this._anim){
				this._anim.stop();
				delete this._anim;
			}
			this._displayed = true;
			this._size();
			this._disableOverflow();
			this._fadeIn();
		}
	},

	hide: function(){
		// summary:
		//		Function to hide the blocking overlay and status icon or text.
		if(this._displayed){
			if(this._anim){
				this._anim.stop();
				delete this._anim;
			}
			this._size();
			this._fadeOut();
			this._displayed = false;
			if(this._resizeCheck !== null){
				clearInterval(this._resizeCheck);
				this._resizeCheck = null;
			}
		}
	},

	isVisible: function(){
		// summary:
		//		Helper function so you can test if the widget is already visible or not.
		// returns:
		//		boolean indicating if the widget is in 'show' state or not.
		return this._displayed; // boolean
	},

	onShow: function(){
		// summary:
		//		Event that fires when the display of the Standby completes.
	},

	onHide: function(){
		// summary:
		//		Event that fires when the display of the Standby completes.
	},

	uninitialize: function(){
		// summary:
		//		Over-ride to hide the widget, which clears intervals, before cleanup.
		this._displayed = false;
		if(this._resizeCheck){
			clearInterval(this._resizeCheck);
		}
		domStyle.set(this._centerNode, "display", "none");
		domStyle.set(this._underlayNode, "display", "none");
		if(has("ie") == 7 && this._ieFixNode){
			baseWindow.body().removeChild(this._ieFixNode);
			delete this._ieFixNode;
		}
		if(this._anim){
			this._anim.stop();
			delete this._anim;
		}
		this.target = null;
		this._imageNode = null;
		this._textNode = null;
		this._centerNode = null;
		this.inherited(arguments);
	},

	_size: function(){
		// summary:
		//		Internal function that handles resizing the overlay and
		//		centering of the image on window resizing.
		// tags:
		//		private
		if(this._displayed){
			var dir = attr.get(baseWindow.body(), "dir");
			if(dir){dir = dir.toLowerCase();}
			var _ie7zoom;
			var scrollers = this._scrollerWidths();

			var target = this.target;

			//Show the image and make sure the zIndex is set high.
			var curStyle = domStyle.get(this._centerNode, "display");
			domStyle.set(this._centerNode, "display", "block");
			var box = geometry.position(target, true);
			if(target === baseWindow.body() || target === baseWindow.doc){
				// Target is the whole doc, so scale to viewport.
				box = window.getBox();
				box.x = box.l;
				box.y = box.t;
			}

			var cntrIndicator = geometry.getMarginBox(this._centerNode);
			domStyle.set(this._centerNode, "display", curStyle);

			//IE has a horrible zoom bug.  So, we have to try and account for
			//it and fix up the scaling.
			if(this._ieFixNode){
				_ie7zoom = -this._ieFixNode.offsetTop / 1000;
				box.x = Math.floor((box.x + 0.9) / _ie7zoom);
				box.y = Math.floor((box.y + 0.9) / _ie7zoom);
				box.w = Math.floor((box.w + 0.9) / _ie7zoom);
				box.h = Math.floor((box.h + 0.9) / _ie7zoom);
			}

			//Figure out how to zIndex this thing over the target.
			var zi = domStyle.get(target, "zIndex");
			var ziUl = zi;
			var ziIn = zi;

			if(this.zIndex === "auto"){
				if(zi != "auto"){
					ziUl = parseInt(ziUl, 10) + 1;
					ziIn = parseInt(ziIn, 10) + 2;
				}else{
					//We need to search up the chain to see if there
					//are any parent zIndexs to overlay.
					var cNode = target.parentNode;
					var oldZi = -100000;
					while(cNode && cNode !== baseWindow.body()){
						zi = domStyle.get(cNode, "zIndex");
						if(!zi || zi === "auto"){
							cNode = cNode.parentNode;
						}else{
							var newZi = parseInt(zi, 10);
							if(oldZi < newZi){
								oldZi = newZi;
								ziUl = newZi + 1;
								ziIn = newZi + 2;
							}
							// Keep looking until we run out, we want the highest zIndex.
							cNode = cNode.parentNode;
						}
					}
				}
			}else{
				ziUl = parseInt(this.zIndex, 10) + 1;
				ziIn = parseInt(this.zIndex, 10) + 2;
			}

			domStyle.set(this._centerNode, "zIndex", ziIn);
			domStyle.set(this._underlayNode, "zIndex", ziUl);


			var pn = target.parentNode;
			if(pn && pn !== baseWindow.body() &&
				target !== baseWindow.body() &&
				target !== baseWindow.doc){
				
				// If the parent is the body tag itself,
				// we can avoid all this, the body takes
				// care of overflow for me.  Besides, browser
				// weirdness with height and width on body causes
				// problems with this sort of intersect testing
				// anyway.
				var obh = box.h;
				var obw = box.w;
				var pnBox = geometry.position(pn, true);

				//More IE zoom corrections.  Grr.
				if(this._ieFixNode){
					_ie7zoom = -this._ieFixNode.offsetTop / 1000;
					pnBox.x = Math.floor((pnBox.x + 0.9) / _ie7zoom);
					pnBox.y = Math.floor((pnBox.y + 0.9) / _ie7zoom);
					pnBox.w = Math.floor((pnBox.w + 0.9) / _ie7zoom);
					pnBox.h = Math.floor((pnBox.h + 0.9) / _ie7zoom);
				}
				
				//Shift the parent width/height a bit if scollers are present.
				pnBox.w -= pn.scrollHeight > pn.clientHeight &&
					pn.clientHeight > 0 ? scrollers.v: 0;
				pnBox.h -= pn.scrollWidth > pn.clientWidth &&
					pn.clientWidth > 0 ? scrollers.h: 0;

				//RTL requires a bit of massaging in some cases
				//(and differently depending on browser, ugh!)
				//WebKit and others still need work.
				if(dir === "rtl"){
					if(has("opera")){
						box.x += pn.scrollHeight > pn.clientHeight &&
							pn.clientHeight > 0 ? scrollers.v: 0;
						pnBox.x += pn.scrollHeight > pn.clientHeight &&
							pn.clientHeight > 0 ? scrollers.v: 0;
					}else if(has("ie")){
						pnBox.x += pn.scrollHeight > pn.clientHeight &&
							pn.clientHeight > 0 ? scrollers.v: 0;
					}else if(has("webkit")){
						//TODO:  FIX THIS!
					}
				}

				//Figure out if we need to adjust the overlay to fit a viewable
				//area, then resize it, we saved the original height/width above.
				//This is causing issues on IE.  Argh!
				if(pnBox.w < box.w){
					//Scale down the width if necessary.
					box.w = box.w - pnBox.w;
				}
				if(pnBox.h < box.h){
					//Scale down the width if necessary.
					box.h = box.h - pnBox.h;
				}

				//Look at the y positions and see if we intersect with the
				//viewport borders.  Will have to do computations off it.
				var vpTop = pnBox.y;
				var vpBottom = pnBox.y + pnBox.h;
				var bTop = box.y;
				var bBottom = box.y + obh;
				var vpLeft = pnBox.x;
				var vpRight = pnBox.x + pnBox.w;
				var bLeft = box.x;
				var bRight = box.x + obw;
				var delta;
				//Adjust the height now
				if(bBottom > vpTop &&
					bTop < vpTop){
					box.y = pnBox.y;
					//intersecting top, need to do some shifting.
					delta = vpTop - bTop;
					var visHeight = obh - delta;
					//If the visible height < viewport height,
					//We need to shift it.
					if(visHeight < pnBox.h){
						box.h = visHeight;
					}else{
						//Deal with horizontal scrollbars if necessary.
						box.h -= 2*(pn.scrollWidth > pn.clientWidth &&
							pn.clientWidth > 0? scrollers.h: 0);
					}
				}else if(bTop < vpBottom && bBottom > vpBottom){
					//Intersecting bottom, just figure out how much
					//overlay to show.
					box.h = vpBottom - bTop;
				}else if(bBottom <= vpTop || bTop >= vpBottom){
					//Outside view, hide it.
					box.h = 0;
				}

				//adjust width
				if(bRight > vpLeft && bLeft < vpLeft){
					box.x = pnBox.x;
					//intersecting left, need to do some shifting.
					delta = vpLeft - bLeft;
					var visWidth = obw - delta;
					//If the visible width < viewport width,
					//We need to shift it.
					if(visWidth < pnBox.w){
						box.w = visWidth;
					}else{
						//Deal with horizontal scrollbars if necessary.
						box.w -= 2*(pn.scrollHeight > pn.clientHeight &&
							pn.clientHeight > 0? scrollers.w:0);
					}
				}else if(bLeft < vpRight && bRight > vpRight){
					//Intersecting right, just figure out how much
					//overlay to show.
					box.w = vpRight - bLeft;
				}else if(bRight <= vpLeft || bLeft >= vpRight){
					//Outside view, hide it.
					box.w = 0;
				}
			}

			if(box.h > 0 && box.w > 0){
				//Set position and size of the blocking div overlay.
				domStyle.set(this._underlayNode, {
					display: "block",
					width: box.w + "px",
					height: box.h + "px",
					top: box.y + "px",
					left: box.x + "px"
				});

				var styles = ["borderRadius", "borderTopLeftRadius",
					"borderTopRightRadius","borderBottomLeftRadius",
					"borderBottomRightRadius"];
				this._cloneStyles(styles);
				if(!has("ie")){
					//Browser specific styles to try and clone if non-IE.
					styles = ["MozBorderRadius", "MozBorderRadiusTopleft",
						"MozBorderRadiusTopright","MozBorderRadiusBottomleft",
						"MozBorderRadiusBottomright","WebkitBorderRadius",
						"WebkitBorderTopLeftRadius", "WebkitBorderTopRightRadius",
						"WebkitBorderBottomLeftRadius","WebkitBorderBottomRightRadius"
					];
					this._cloneStyles(styles, this);
				}
				var cntrIndicatorTop = (box.h/2) - (cntrIndicator.h/2);
				var cntrIndicatorLeft = (box.w/2) - (cntrIndicator.w/2);
				//Only show the image if there is height and width room.
				if(box.h >= cntrIndicator.h && box.w >= cntrIndicator.w){
					domStyle.set(this._centerNode, {
						top: (cntrIndicatorTop + box.y) + "px",
						left: (cntrIndicatorLeft + box.x) + "px",
						display: "block"
					});
				}else{
					domStyle.set(this._centerNode, "display", "none");
				}
			}else{
				//Target has no size, display nothing on it!
				domStyle.set(this._underlayNode, "display", "none");
				domStyle.set(this._centerNode, "display", "none");
			}
			if(this._resizeCheck === null){
				//Set an interval timer that checks the target size and scales as needed.
				//Checking every 10th of a second seems to generate a fairly smooth update.
				var self = this;
				this._resizeCheck = setInterval(function(){self._size();}, 100);
			}
		}
	},

	_cloneStyles: function(list){
		// summary:
		//		Internal function to clone a set of styles from the target to
		//		the underlay.
		// list: Array
		//		An array of style names to clone.
		//
		// tags:
		//		private
		array.forEach(list, function(s){
			domStyle.set(this._underlayNode, s, domStyle.get(this.target, s));
		}, this);
	},

	_fadeIn: function(){
		// summary:
		//		Internal function that does the opacity style fade in animation.
		// tags:
		//		private
		var self = this;
		var underlayNodeAnim = baseFx.animateProperty({
			duration: self.duration,
			node: self._underlayNode,
			properties: {opacity: {start: 0, end: self.opacity}}
		});
		var imageAnim = baseFx.animateProperty({
			duration: self.duration,
			node: self._centerNode,
			properties: {opacity: {start: 0, end: 1}},
			onEnd: function(){
				self.onShow();
				delete self._anim;
			}
		});
		this._anim = fx.combine([underlayNodeAnim,imageAnim]);
		this._anim.play();
	},

	_fadeOut: function(){
		// summary:
		//		Internal function that does the opacity style fade out animation.
		// tags:
		//		private
		var self = this;
		var underlayNodeAnim = baseFx.animateProperty({
			duration: self.duration,
			node: self._underlayNode,
			properties: {opacity: {start: self.opacity, end: 0}},
			onEnd: function(){
				domStyle.set(this.node,{"display":"none", "zIndex": "-1000"});
			}
		});
		var imageAnim = baseFx.animateProperty({
			duration: self.duration,
			node: self._centerNode,
			properties: {opacity: {start: 1, end: 0}},
			onEnd: function(){
				domStyle.set(this.node,{"display":"none", "zIndex": "-1000"});
				self.onHide();
				self._enableOverflow();
				delete self._anim;
			}
		});
		this._anim = fx.combine([underlayNodeAnim,imageAnim]);
		this._anim.play();
	},

	_ignore: function(e){
		// summary:
		//		Function to ignore events that occur on the overlay.
		// event: Event
		//		The event to halt
		// tags:
		//		private
		if(e){
			event.stop(e);
		}
	},

	_scrollerWidths: function(){
		// summary:
		//		This function will calculate the size of the vertical and
		//		horizontaol scrollbars.
		// returns:
		//		Object of form: {v: Number, h: Number} where v is vertical scrollbar width
		//		and h is horizontal scrollbar width.
		// tags:
		//		private
		var div = construct.create("div");
		domStyle.set(div, {
			position: "absolute",
			opacity: 0,
			overflow: "hidden",
			width: "50px",
			height: "50px",
			zIndex: "-100",
			top: "-200px",
			padding: "0px",
			margin: "0px"
		});
		var iDiv = construct.create("div");
		domStyle.set(iDiv, {
			width: "200px",
			height: "10px"
		});
		div.appendChild(iDiv);
		baseWindow.body().appendChild(div);

		//Figure out content size before and after
		//scrollbars are there, then just subtract to
		//get width.
		var b = geometry.getContentBox(div);
		domStyle.set(div, "overflow", "scroll");
		var a = geometry.getContentBox(div);
		baseWindow.body().removeChild(div);
		return { v: b.w - a.w, h: b.h - a.h };
	},

	/* The following are functions that tie into _Widget.attr() */

	_setTextAttr: function(text){
		// summary:
		//		Function to allow widget.attr to set the text displayed in center
		//		if using text display.
		// text: String
		//		The text to set.
		this._textNode.innerHTML = text;
		this.text = text;
	},

	_setColorAttr: function(c){
		// summary:
		//		Function to allow widget.attr to set the color used for the translucent
		//		div overlay.
		// c: String
		//		The color to set the background underlay to in #XXXXXX format..
		domStyle.set(this._underlayNode, "backgroundColor", c);
		this.color = c;
	},

	_setImageTextAttr: function(text){
		// summary:
		//		Function to allow widget.attr to set the ALT text text displayed for
		//		the image (if using image center display).
		// text: String
		//		The text to set.
		attr.set(this._imageNode, "alt", text);
		this.imageText = text;
	},

	_setImageAttr: function(url){
		// summary:
		//		Function to allow widget.attr to set the url source for the center image
		// text: String
		//		The url to set for the image.
		attr.set(this._imageNode, "src", url);
		this.image = url;
	},

	_setCenterIndicatorAttr: function(indicator){
		// summary:
		//		Function to allow widget.attr to set the node used for the center indicator,
		//		either the image or the text.
		// indicator: String
		//		The indicator to use, either 'image' or 'text'.
		this.centerIndicator = indicator;
		if(indicator === "image"){
			this._centerNode = this._imageNode;
			domStyle.set(this._textNode, "display", "none");
		}else{
			this._centerNode = this._textNode;
			domStyle.set(this._imageNode, "display", "none");
		}
	},

	_disableOverflow: function(){
		 // summary:
		 //		Function to disable scrollbars on the body.  Only used if the overlay
		 //		targets the body or the document.
		 if(this.target === baseWindow.body() || this.target === baseWindow.doc){
			 // Store the overflow state we have to restore later.
			 // IE had issues, so have to check that it's defined.  Ugh.
			 this._overflowDisabled = true;
			 var body = baseWindow.body();
			 if(body.style && body.style.overflow){
				 this._oldOverflow = domStyle.get(body, "overflow");
			 }else{
				 this._oldOverflow = "";
			 }
			 if(has("ie") && !has("quirks")){
				 // IE will put scrollbars in anyway, html (parent of body)
				 // also controls them in standards mode, so we have to
				 // remove them, argh.
				 if(body.parentNode &&
					body.parentNode.style &&
					body.parentNode.style.overflow){
					 this._oldBodyParentOverflow = body.parentNode.style.overflow;
				 }else{
					 try{
						this._oldBodyParentOverflow = domStyle.get(body.parentNode, "overflow");
					 }catch(e){
						 this._oldBodyParentOverflow = "scroll";
					 }
				 }
				 domStyle.set(body.parentNode, "overflow", "hidden");
			 }
			 domStyle.set(body, "overflow", "hidden");
		 }
	},

	_enableOverflow: function(){
		 // summary:
		 //		Function to restore scrollbars on the body.  Only used if the overlay
		 //		targets the body or the document.
		 if(this._overflowDisabled){
			delete this._overflowDisabled;
			var body = baseWindow.body();
			// Restore all the overflow.
			if(has("ie") && !has("quirks")){
				body.parentNode.style.overflow = this._oldBodyParentOverflow;
				delete this._oldBodyParentOverflow;
			}
			domStyle.set(body, "overflow", this._oldOverflow);
			if(has("webkit")){
				//Gotta poke WebKit, or scrollers don't come back. :-(
				var div = construct.create("div", { style: {
						height: "2px"
					}
				});
				body.appendChild(div);
				setTimeout(function(){
					body.removeChild(div);
				}, 0);
			}
			delete this._oldOverflow;
		}
	}
});

});
