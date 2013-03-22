define(["dojo/_base/kernel","dojo/_base/lang","dojo/_base/connect","dojo/_base/array","dojo/_base/event",
	"dojo/_base/fx","dojo/_base/window","dojo/fx","dojo/window","dojo/dom","dojo/dom-class",
	"dojo/dom-geometry","dojo/dom-style","dijit/_base/manager","dijit/_Widget","dijit/_TemplatedMixin",
	"dojo/_base/declare"], function (
	kernel, lang, connect, arrayUtil, eventUtil, fxBase, windowBase, fxUtil, windowUtil, 
	domUtil, domClass, domGeometry, domStyle, manager, Widget, TemplatedMixin, declare) {

kernel.experimental("dojox.layout.ResizeHandle");

var ResizeHandle = declare("dojox.layout.ResizeHandle",[Widget, TemplatedMixin],
	{
	// summary:
	//		A draggable handle used to resize an attached node.
	//
	// description:
	//		The handle on the bottom-right corner of FloatingPane or other widgets that allows
	//		the widget to be resized.
	//		Typically not used directly.

	// targetId: String
	//		id of the Widget OR DomNode that I will size
	targetId: "",
	
	// targetContainer: DomNode
	//		over-ride targetId and attch this handle directly to a reference of a DomNode
	targetContainer: null,
	
	// resizeAxis: String
	//		one of: x|y|xy limit resizing to a single axis, default to xy ...
	resizeAxis: "xy",
	
	// activeResize: Boolean
	//		if true, node will size realtime with mouse movement,
	//		if false, node will create virtual node, and only resize target on mouseUp
	activeResize: false,
	
	// activeResizeClass: String
	//		css class applied to virtual resize node.
	activeResizeClass: "dojoxResizeHandleClone",
	
	// animateSizing: Boolean
	//		only applicable if activeResize = false. onMouseup, animate the node to the
	//		new size
	animateSizing: true,
	
	// animateMethod: String
	//		one of "chain" or "combine" ... visual effect only. combine will "scale"
	//		node to size, "chain" will alter width, then height
	animateMethod: "chain",

	// animateDuration: Integer
	//		time in MS to run sizing animation. if animateMethod="chain", total animation
	//		playtime is 2*animateDuration
	animateDuration: 225,

	// minHeight: Integer
	//		smallest height in px resized node can be
	minHeight: 100,

	// minWidth: Integer
	//		smallest width in px resize node can be
	minWidth: 100,

	// constrainMax: Boolean
	//		Toggle if this widget cares about the maxHeight and maxWidth
	//		parameters.
	constrainMax: false,

	// maxHeight: Integer
	//		Largest height size in px the resize node can become.
	maxHeight:0,
	
	// maxWidth: Integer
	//		Largest width size in px the resize node can become.
	maxWidth:0,

	// fixedAspect: Boolean
	//		Toggle to enable this widget to maintain the aspect
	//		ratio of the attached node.
	fixedAspect: false,

	// intermediateChanges: Boolean
	//		Toggle to enable/disable this widget from firing onResize
	//		events at every step of a resize. If `activeResize` is true,
	//		and this is false, onResize only fires _after_ the drop
	//		operation. Animated resizing is not affected by this setting.
	intermediateChanges: false,

	// startTopic: String
	//		The name of the topic this resizehandle publishes when resize is starting
	startTopic: "/dojo/resize/start",
	
	// endTopic: String
	//		The name of the topic this resizehandle publishes when resize is complete
	endTopic:"/dojo/resize/stop",

	templateString: '<div dojoAttachPoint="resizeHandle" class="dojoxResizeHandle"><div></div></div>',

	postCreate: function(){
		// summary:
		//		setup our one major listener upon creation
		this.connect(this.resizeHandle, "onmousedown", "_beginSizing");
		if(!this.activeResize){
			// there shall be only a single resize rubberbox that at the top
			// level so that we can overlay it on anything whenever the user
			// resizes something. Since there is only one mouse pointer he
			// can't at once resize multiple things interactively.
			this._resizeHelper = manager.byId('dojoxGlobalResizeHelper');
			if(!this._resizeHelper){
				this._resizeHelper = new _ResizeHelper({
						id: 'dojoxGlobalResizeHelper'
				}).placeAt(windowBase.body());
				domClass.add(this._resizeHelper.domNode, this.activeResizeClass);
			}
		}else{ this.animateSizing = false; }

		if(!this.minSize){
			this.minSize = { w: this.minWidth, h: this.minHeight };
		}
		
		if(this.constrainMax){
			this.maxSize = { w: this.maxWidth, h: this.maxHeight }
		}
		
		// should we modify the css for the cursor hover to n-resize nw-resize and w-resize?
		this._resizeX = this._resizeY = false;
		var addClass = lang.partial(domClass.add, this.resizeHandle);
		switch(this.resizeAxis.toLowerCase()){
			case "xy" :
				this._resizeX = this._resizeY = true;
				// FIXME: need logic to determine NW or NE class to see
				// based on which [todo] corner is clicked
				addClass("dojoxResizeNW");
				break;
			case "x" :
				this._resizeX = true;
				addClass("dojoxResizeW");
				break;
			case "y" :
				this._resizeY = true;
				addClass("dojoxResizeN");
				break;
		}
	},

	_beginSizing: function(/*Event*/ e){
		// summary:
		//		setup movement listeners and calculate initial size
		
		if(this._isSizing){ return; }

		connect.publish(this.startTopic, [ this ]);
		this.targetWidget = manager.byId(this.targetId);

		this.targetDomNode = this.targetWidget ? this.targetWidget.domNode : domUtil.byId(this.targetId);
		if(this.targetContainer){ this.targetDomNode = this.targetContainer; }
		if(!this.targetDomNode){ return; }

		if(!this.activeResize){
			var c = domGeometry.position(this.targetDomNode, true);
			this._resizeHelper.resize({l: c.x, t: c.y, w: c.w, h: c.h});
			this._resizeHelper.show();
			if(!this.isLeftToRight()){
				this._resizeHelper.startPosition = {l: c.x, t: c.y};
			}
		}

		this._isSizing = true;
		this.startPoint  = { x:e.clientX, y:e.clientY };

		// widget.resize() or setting style.width/height expects native box model dimension 
		// (in most cases content-box, but it may be border-box if in backcompact mode)
		var style = domStyle.getComputedStyle(this.targetDomNode), 
			borderModel = domGeometry.boxModel==='border-model',
			padborder = borderModel?{w:0,h:0}:domGeometry.getPadBorderExtents(this.targetDomNode, style),
			margin = domGeometry.getMarginExtents(this.targetDomNode, style),
			mb;
		mb = this.startSize = { 
				w: domStyle.get(this.targetDomNode, 'width', style), 
				h: domStyle.get(this.targetDomNode, 'height', style),
				//ResizeHelper.resize expects a bounding box of the
				//border box, so let's keep track of padding/border
				//width/height as well
				pbw: padborder.w, pbh: padborder.h,
				mw: margin.w, mh: margin.h};
		if(!this.isLeftToRight() && dojo.style(this.targetDomNode, "position") == "absolute"){
			var p = domGeometry.position(this.targetDomNode, true);
			this.startPosition = {l: p.x, t: p.y};
		}
		
		this._pconnects = [
			connect.connect(windowBase.doc,"onmousemove",this,"_updateSizing"),
			connect.connect(windowBase.doc,"onmouseup", this, "_endSizing")
		];
		
		eventUtil.stop(e);
	},

	_updateSizing: function(/*Event*/ e){
		// summary:
		//		called when moving the ResizeHandle ... determines
		//		new size based on settings/position and sets styles.

		if(this.activeResize){
			this._changeSizing(e);
		}else{
			var tmp = this._getNewCoords(e, 'border', this._resizeHelper.startPosition);
			if(tmp === false){ return; }
			this._resizeHelper.resize(tmp);
		}
		e.preventDefault();
	},

	_getNewCoords: function(/* Event */ e, /* String */ box, /* Object */startPosition){
		
		// On IE, if you move the mouse above/to the left of the object being resized,
		// sometimes clientX/Y aren't set, apparently.  Just ignore the event.
		try{
			if(!e.clientX  || !e.clientY){ return false; }
		}catch(e){
			// sometimes you get an exception accessing above fields...
			return false;
		}
		this._activeResizeLastEvent = e;

		var dx = (this.isLeftToRight()?1:-1) * (this.startPoint.x - e.clientX),
			dy = this.startPoint.y - e.clientY,
			newW = this.startSize.w - (this._resizeX ? dx : 0),
			newH = this.startSize.h - (this._resizeY ? dy : 0),
			r = this._checkConstraints(newW, newH)
		;
		
		startPosition = (startPosition || this.startPosition);
		if(startPosition && this._resizeX){
			// adjust x position for RtoL
			r.l = startPosition.l + dx;
			if(r.w != newW){
				r.l += (newW - r.w);
			}
			r.t = startPosition.t;
		}

		switch(box){
			case 'margin':
				r.w += this.startSize.mw;
				r.h += this.startSize.mh;
				//pass through
			case "border":
				r.w += this.startSize.pbw;
				r.h += this.startSize.pbh;
				break;
			//default: //native, do nothing
		}

		return r; // Object
	},
	
	_checkConstraints: function(newW, newH){
		// summary:
		//		filter through the various possible constaint possibilities.
				
		// minimum size check
		if(this.minSize){
			var tm = this.minSize;
			if(newW < tm.w){
				newW = tm.w;
			}
			if(newH < tm.h){
				newH = tm.h;
			}
		}
		
		// maximum size check:
		if(this.constrainMax && this.maxSize){
			var ms = this.maxSize;
			if(newW > ms.w){
				newW = ms.w;
			}
			if(newH > ms.h){
				newH = ms.h;
			}
		}
		
		if(this.fixedAspect){
			var w = this.startSize.w, h = this.startSize.h,
				delta = w * newH - h * newW;
			if(delta<0){
				newW = newH * w / h;
			}else if(delta>0){
				newH = newW * h / w;
			}
		}
		
		return { w: newW, h: newH }; // Object
	},
		
	_changeSizing: function(/*Event*/ e){
		// summary:
		//		apply sizing information based on information in (e) to attached node
		
		var isWidget = this.targetWidget && lang.isFunction(this.targetWidget.resize),
			tmp = this._getNewCoords(e, isWidget && 'margin');
		if(tmp === false){ return; }

		if(isWidget){
			this.targetWidget.resize(tmp);
		}else{
			if(this.animateSizing){
				var anim = fxUtil[this.animateMethod]([
					fxBase.animateProperty({
						node: this.targetDomNode,
						properties: {
							width: { start: this.startSize.w, end: tmp.w }
						},
						duration: this.animateDuration
					}),
					fxBase.animateProperty({
						node: this.targetDomNode,
						properties: {
							height: { start: this.startSize.h, end: tmp.h }
						},
						duration: this.animateDuration
					})
				]);
				anim.play();
			}else{
				domStyle.set(this.targetDomNode,{
					width: tmp.w + "px",
					height: tmp.h + "px"
				});
			}
		}
		if(this.intermediateChanges){
			this.onResize(e);
		}
	},

	_endSizing: function(/*Event*/ e){
		// summary:
		//		disconnect listenrs and cleanup sizing
		arrayUtil.forEach(this._pconnects, connect.disconnect);
		var pub = lang.partial(connect.publish, this.endTopic, [ this ]);
		if(!this.activeResize){
			this._resizeHelper.hide();
			this._changeSizing(e);
			setTimeout(pub, this.animateDuration + 15);
		}else{
			pub();
		}
		this._isSizing = false;
		this.onResize(e);
	},
	
	onResize: function(e){
		// summary:
		//		Stub fired when sizing is done. Fired once
		//		after resize, or often when `intermediateChanges` is
		//		set to true.
	}
	
});

var _ResizeHelper = dojo.declare("dojox.layout._ResizeHelper", Widget, {
	// summary:
	//		A global private resize helper shared between any
	//		`dojox.layout.ResizeHandle` with activeSizing off.
	
	show: function(){
		// summary:
		//		show helper to start resizing
		domStyle.set(this.domNode, "display", "");
	},
	
	hide: function(){
		// summary:
		//		hide helper after resizing is complete
		domStyle.set(this.domNode, "display", "none");
	},
	
	resize: function(/* Object */dim){
		// summary:
		//		size the widget and place accordingly
		domGeometry.setMarginBox(this.domNode, dim);
	}
	
});
return ResizeHandle;
});
