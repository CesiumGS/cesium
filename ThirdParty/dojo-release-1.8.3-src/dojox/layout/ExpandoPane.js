define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojo/_base/declare",
	"dojo/_base/array", 
	"dojo/_base/connect",
	"dojo/_base/event",
	"dojo/_base/fx",
	"dojo/dom-style",
	"dojo/dom-class",
	"dojo/dom-geometry",
	"dojo/text!./resources/ExpandoPane.html",
	"dijit/layout/ContentPane",
	"dijit/_TemplatedMixin",
	"dijit/_Contained",
	"dijit/_Container"
], function(kernel,lang,declare,arrayUtil,connectUtil,eventUtil,baseFx,domStyle,domClass,domGeom,
		template,ContentPane,TemplatedMixin,Contained,Container) {
kernel.experimental("dojox.layout.ExpandoPane"); // just to show it can be done?

return declare("dojox.layout.ExpandoPane", [ContentPane, TemplatedMixin, Contained, Container],{
	// summary:
	//		An experimental collapsing-pane for dijit.layout.BorderContainer
	// description:
	//		Works just like a ContentPane inside of a borderContainer. Will expand/collapse on
	//		command, and supports having Layout Children as direct descendants

	//maxHeight: "",
	//maxWidth: "",
	//splitter: false,
	attributeMap: lang.delegate(ContentPane.prototype.attributeMap, {
		title: { node: "titleNode", type: "innerHTML" }
	}),
	
	templateString: template,

	// easeOut: String|Function
	//		easing function used to hide pane
	easeOut: "dojo._DefaultEasing", // FIXME: This won't work with globalless AMD
	
	// easeIn: String|Function
	//		easing function use to show pane
	easeIn: "dojo._DefaultEasing", // FIXME: This won't work with globalless AMD
	
	// duration: Integer
	//		duration to run show/hide animations
	duration: 420,

	// startExpanded: Boolean
	//		Does this widget start in an open (true) or closed (false) state
	startExpanded: true,

	// previewOpacity: Float
	//		A value from 0 .. 1 indicating the opacity to use on the container
	//		when only showing a preview
	previewOpacity: 0.75,
	
	// previewOnDblClick: Boolean
	//		If true, will override the default behavior of a double-click calling a full toggle.
	//		If false, a double-click will cause the preview to popup
	previewOnDblClick: false,

	// tabIndex: String
	//		Order fields are traversed when user hits the tab key
	tabIndex: "0",
	_setTabIndexAttr: "iconNode",

	baseClass: "dijitExpandoPane",

	postCreate: function(){
		this.inherited(arguments);
		this._animConnects = [];

		this._isHorizontal = true;
		
		if(lang.isString(this.easeOut)){
			this.easeOut = lang.getObject(this.easeOut);
		}
		if(lang.isString(this.easeIn)){
			this.easeIn = lang.getObject(this.easeIn);
		}
	
		var thisClass = "", rtl = !this.isLeftToRight();
		if(this.region){
			switch(this.region){
				case "trailing" :
				case "right" :
					thisClass = rtl ? "Left" : "Right";
					this._needsPosition = "left";
					break;
				case "leading" :
				case "left" :
					thisClass = rtl ? "Right" : "Left";
					break;
				case "top" :
					thisClass = "Top";
					break;
				case "bottom" :
					this._needsPosition = "top";
					thisClass = "Bottom";
					break;
			}
			domClass.add(this.domNode, "dojoxExpando" + thisClass);
			domClass.add(this.iconNode, "dojoxExpandoIcon" + thisClass);
			this._isHorizontal = /top|bottom/.test(this.region);
		}
		domStyle.set(this.domNode, {
			overflow: "hidden",
			padding:0
		});
		
		this.connect(this.domNode, "ondblclick", this.previewOnDblClick ? "preview" : "toggle");
		
		this.iconNode.setAttribute("aria-controls", this.id);
		
		if(this.previewOnDblClick){
			this.connect(this.getParent(), "_layoutChildren", lang.hitch(this, function(){
				this._isonlypreview = false;
			}));
		}
		
	},
	
	_startupSizes: function(){
		
		this._container = this.getParent();
		this._closedSize = this._titleHeight = domGeom.getMarginBox(this.titleWrapper).h;
		
		if(this.splitter){
			// find our splitter and tie into it's drag logic
			var myid = this.id;
			arrayUtil.forEach(dijit.registry.toArray(), function(w){
				if(w && w.child && w.child.id == myid){
					this.connect(w,"_stopDrag","_afterResize");
				}
			}, this);
		}
		
		this._currentSize = domGeom.getContentBox(this.domNode);	// TODO: can compute this from passed in value to resize(), see _LayoutWidget for example
		this._showSize = this._currentSize[(this._isHorizontal ? "h" : "w")];
		this._setupAnims();

		if(this.startExpanded){
			this._showing = true;
		}else{
			this._showing = false;
			this._hideWrapper();
			this._hideAnim.gotoPercent(99,true);
		}
		
		this.domNode.setAttribute("aria-expanded", this._showing);
		this._hasSizes = true;
	},
	
	_afterResize: function(e){
		var tmp = this._currentSize;						// the old size
		this._currentSize = domGeom.getMarginBox(this.domNode);	// the new size
		var n = this._currentSize[(this._isHorizontal ? "h" : "w")];
		if(n > this._titleHeight){
			if(!this._showing){
				this._showing = !this._showing;
				this._showEnd();
			}
			this._showSize = n;
			this._setupAnims();
		}else{
			this._showSize = tmp[(this._isHorizontal ? "h" : "w")];
			this._showing = false;
			this._hideWrapper();
			this._hideAnim.gotoPercent(89,true);
		}
		
	},
	
	_setupAnims: function(){
		// summary:
		//		Create the show and hide animations
		arrayUtil.forEach(this._animConnects, connectUtil.disconnect);
		
		var _common = {
				node:this.domNode,
				duration:this.duration
			},
			isHorizontal = this._isHorizontal,
			showProps = {},
			showSize = this._showSize,
			hideSize = this._closedSize,
			hideProps = {},
			dimension = isHorizontal ? "height" : "width",
			also = this._needsPosition
		;

		showProps[dimension] = {
			end: showSize
		};
		hideProps[dimension] = {
			end: hideSize
		};
		
		if(also){
			showProps[also] = {
				end: function(n){
					var c = parseInt(n.style[also], 10);
					return c - showSize + hideSize; 
				}
			}
			hideProps[also] = {
				end: function(n){
					var c = parseInt(n.style[also], 10);
					return c + showSize - hideSize;
				}
			}
		}
		
		this._showAnim = baseFx.animateProperty(lang.mixin(_common,{
			easing:this.easeIn,
			properties: showProps
		}));
		this._hideAnim = baseFx.animateProperty(lang.mixin(_common,{
			easing:this.easeOut,
			properties: hideProps
		}));

		this._animConnects = [
			connectUtil.connect(this._showAnim, "onEnd", this, "_showEnd"),
			connectUtil.connect(this._hideAnim, "onEnd", this, "_hideEnd")
		];
	},
	
	preview: function(){
		// summary:
		//		Expand this pane in preview mode (does not affect surrounding layout)

		if(!this._showing){
			this._isonlypreview = !this._isonlypreview;
		}
		this.toggle();
	},

	toggle: function(){
		// summary:
		//		Toggle this pane's visibility
		if(this._showing){
			this._hideWrapper();
			this._showAnim && this._showAnim.stop();
			this._hideAnim.play();
		}else{
			this._hideAnim && this._hideAnim.stop();
			this._showAnim.play();
		}
		this._showing = !this._showing;
		this.domNode.setAttribute("aria-expanded", this._showing);
	},
	
	_hideWrapper: function(){
		// summary:
		//		Set the Expando state to "closed"
		domClass.add(this.domNode, "dojoxExpandoClosed");
		
		domStyle.set(this.cwrapper,{
			visibility: "hidden",
			opacity: "0",
			overflow: "hidden"
		});
	},
	
	_showEnd: function(){
		// summary:
		//		Common animation onEnd code - "unclose"
		domStyle.set(this.cwrapper, {
			opacity: 0,
			visibility:"visible"
		});
		baseFx.anim(this.cwrapper, {
			opacity: this._isonlypreview ? this.previewOpacity : 1
		}, 227);
		domClass.remove(this.domNode, "dojoxExpandoClosed");
		if(!this._isonlypreview){
			setTimeout(lang.hitch(this._container, "layout"), 15);
		}else{
			this._previewShowing = true;
			this.resize();
		}
	},
	
	_hideEnd: function(){
		// summary:
		//		Callback for the hide animation - "close"

		// every time we hide, reset the "only preview" state
		if(!this._isonlypreview){
			setTimeout(lang.hitch(this._container, "layout"), 25);
		}else{
			this._previewShowing = false;
		}
		this._isonlypreview = false;
		
	},
	
	resize: function(/*Object?*/newSize){
		// summary:
		//		we aren't a layout widget, but need to act like one.
		// newSize: Object
		//		The size object to resize to

		if(!this._hasSizes){ this._startupSizes(newSize); }
		
		// compute size of container (ie, size left over after title bar)
		var currentSize = domGeom.getMarginBox(this.domNode);
		this._contentBox = {
			w: newSize && "w" in newSize ? newSize.w : currentSize.w,
			h: (newSize && "h" in newSize ? newSize.h : currentSize.h) - this._titleHeight
		};
		domStyle.set(this.containerNode, "height", this._contentBox.h + "px");

		if(newSize){
			domGeom.setMarginBox(this.domNode, newSize);
		}

		this._layoutChildren();
		this._setupAnims();
	},
	
	_trap: function(/*Event*/ e){
		// summary:
		//		Trap stray events
		eventUtil.stop(e);
	}
});
});
