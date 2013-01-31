define(["dojo/_base/kernel","dojo/_base/lang","dojo/_base/window","dojo/_base/declare",
		"dojo/_base/fx","dojo/_base/connect","dojo/_base/array","dojo/_base/sniff",
		"dojo/window","dojo/dom","dojo/dom-class","dojo/dom-geometry","dojo/dom-construct",
		"dijit/_TemplatedMixin","dijit/_Widget","dijit/BackgroundIframe","dojo/dnd/Moveable",
		"./ContentPane","./ResizeHandle","dojo/text!./resources/FloatingPane.html","./Dock"], function(
	kernel, lang, winUtil, declare, baseFx, connectUtil, arrayUtil, 
	has, windowLib, dom, domClass, domGeom, domConstruct, TemplatedMixin, Widget, BackgroundIframe, 
	Moveable, ContentPane, ResizeHandle, template,Dock){
	
kernel.experimental("dojox.layout.FloatingPane");
var FloatingPane = declare("dojox.layout.FloatingPane", [ ContentPane, TemplatedMixin ],{
	// summary:
	//		A non-modal Floating window.
	// description:
	//		Makes a `dojox.layout.ContentPane` float and draggable by it's title [similar to TitlePane]
	//		and over-rides onClick to onDblClick for wipeIn/Out of containerNode
	//		provides minimize(dock) / show() and hide() methods, and resize [almost]

	// closable: Boolean
	//		Allow closure of this Node
	closable: true,

	// dockable: Boolean
	//		Allow minimizing of pane if true
	dockable: true,

	// resizable: Boolean
	//		Allow resizing of pane true if true
	resizable: false,

	// maxable: Boolean
	//		Horrible param name for "Can you maximize this floating pane?"
	maxable: false,

	// resizeAxis: String
	//		One of: x | xy | y to limit pane's sizing direction
	resizeAxis: "xy",

	// title: String
	//		Title to use in the header
	title: "",

	// dockTo: DomNode?
	//		if empty, will create private layout.Dock that scrolls with viewport
	//		on bottom span of viewport.
	dockTo: "",

	// duration: Integer
	//		Time is MS to spend toggling in/out node
	duration: 400,

	/*=====
	// iconSrc: String
	//		[not implemented yet] will be either icon in titlepane to left
	//		of Title, and/or icon show when docked in a fisheye-like dock
	//		or maybe dockIcon would be better?
	iconSrc: null,
	=====*/

	// contentClass: String
	//		The className to give to the inner node which has the content
	contentClass: "dojoxFloatingPaneContent",

	// animation holders for toggle
	_showAnim: null,
	_hideAnim: null,
	// node in the dock (if docked)
	_dockNode: null,

	// privates:
	_restoreState: {},
	_allFPs: [],
	_startZ: 100,

	templateString: template,
	
	attributeMap: lang.delegate(Widget.prototype.attributeMap, {
		title: { type:"innerHTML", node:"titleNode" }
	}),
	
	postCreate: function(){
		this.inherited(arguments);
		new Moveable(this.domNode,{ handle: this.focusNode });
		//this._listener = dojo.subscribe("/dnd/move/start",this,"bringToTop");

		if(!this.dockable){ this.dockNode.style.display = "none"; }
		if(!this.closable){ this.closeNode.style.display = "none"; }
		if(!this.maxable){
			this.maxNode.style.display = "none";
			this.restoreNode.style.display = "none";
		}
		if(!this.resizable){
			this.resizeHandle.style.display = "none";
		}else{
			this.domNode.style.width = domGeom.getMarginBox(this.domNode).w + "px";
		}
		this._allFPs.push(this);
		this.domNode.style.position = "absolute";
		
		this.bgIframe = new BackgroundIframe(this.domNode);
		this._naturalState = domGeom.position(this.domNode);
	},
	
	startup: function(){
		if(this._started){ return; }
		
		this.inherited(arguments);

		if(this.resizable){
			if(has("ie")){
				this.canvas.style.overflow = "auto";
			}else{
				this.containerNode.style.overflow = "auto";
			}
			
			this._resizeHandle = new ResizeHandle({
				targetId: this.id,
				resizeAxis: this.resizeAxis
			},this.resizeHandle);

		}

		if(this.dockable){
			// FIXME: argh.
			var tmpName = this.dockTo;

			if(this.dockTo){
				this.dockTo = dijit.byId(this.dockTo);
			}else{
				this.dockTo = dijit.byId('dojoxGlobalFloatingDock');
			}

			if(!this.dockTo){
				var tmpId, tmpNode;
				// we need to make our dock node, and position it against
				// .dojoxDockDefault .. this is a lot. either dockto="node"
				// and fail if node doesn't exist or make the global one
				// once, and use it on empty OR invalid dockTo="" node?
				if(tmpName){
					tmpId = tmpName;
					tmpNode = dom.byId(tmpName);
				}else{
					tmpNode = domConstruct.create('div', null, winUtil.body());
					domClass.add(tmpNode,"dojoxFloatingDockDefault");
					tmpId = 'dojoxGlobalFloatingDock';
				}
				this.dockTo = new Dock({ id: tmpId, autoPosition: "south" }, tmpNode);
				this.dockTo.startup();
			}
			
			if((this.domNode.style.display == "none")||(this.domNode.style.visibility == "hidden")){
				// If the FP is created dockable and non-visible, start up docked.
				this.minimize();
			}
		}
		this.connect(this.focusNode,"onmousedown","bringToTop");
		this.connect(this.domNode,	"onmousedown","bringToTop");

		// Initial resize to give child the opportunity to lay itself out
		this.resize(domGeom.position(this.domNode));
		
		this._started = true;
	},

	setTitle: function(/* String */ title){
		// summary:
		//		Update the Title bar with a new string
		kernel.deprecated("pane.setTitle", "Use pane.set('title', someTitle)", "2.0");
		this.set("title", title);
	},
		
	close: function(){
		// summary:
		//		Close and destroy this widget
		if(!this.closable){ return; }
		connectUtil.unsubscribe(this._listener);
		this.hide(lang.hitch(this,function(){
			this.destroyRecursive();
		}));
	},

	hide: function(/* Function? */ callback){
		// summary:
		//		Close, but do not destroy this FloatingPane
		baseFx.fadeOut({
			node:this.domNode,
			duration:this.duration,
			onEnd: lang.hitch(this,function() {
				this.domNode.style.display = "none";
				this.domNode.style.visibility = "hidden";
				if(this.dockTo && this.dockable){
					this.dockTo._positionDock(null);
				}
				if(callback){
					callback();
				}
			})
		}).play();
	},

	show: function(/* Function? */callback){
		// summary:
		//		Show the FloatingPane
		var anim = baseFx.fadeIn({node:this.domNode, duration:this.duration,
			beforeBegin: lang.hitch(this,function(){
				this.domNode.style.display = "";
				this.domNode.style.visibility = "visible";
				if (this.dockTo && this.dockable) { this.dockTo._positionDock(null); }
				if (typeof callback == "function") { callback(); }
				this._isDocked = false;
				if (this._dockNode) {
					this._dockNode.destroy();
					this._dockNode = null;
				}
			})
		}).play();
		this.resize(domGeom.position(this.domNode));
		this._onShow(); // lazy load trigger
	},

	minimize: function(){
		// summary:
		//		Hide and dock the FloatingPane
		if(!this._isDocked){ this.hide(lang.hitch(this,"_dock")); }
	},

	maximize: function(){
		// summary:
		//		Make this FloatingPane full-screen (viewport)
		if(this._maximized){ return; }
		this._naturalState = domGeom.position(this.domNode);
		if(this._isDocked){
			this.show();
			setTimeout(lang.hitch(this,"maximize"),this.duration);
		}
		domClass.add(this.focusNode,"floatingPaneMaximized");
		this.resize(windowLib.getBox());
		this._maximized = true;
	},

	_restore: function(){
		if(this._maximized){
			this.resize(this._naturalState);
			domClass.remove(this.focusNode,"floatingPaneMaximized");
			this._maximized = false;
		}
	},

	_dock: function(){
		if(!this._isDocked && this.dockable){
			this._dockNode = this.dockTo.addNode(this);
			this._isDocked = true;
		}
	},
	
	resize: function(/* Object */dim){
		// summary:
		//		Size the FloatingPane and place accordingly
		dim = dim || this._naturalState;
		this._currentState = dim;

		// From the ResizeHandle we only get width and height information
		var dns = this.domNode.style;
		if("t" in dim){ dns.top = dim.t + "px"; }
		else if("y" in dim){ dns.top = dim.y + "px"; }
		if("l" in dim){ dns.left = dim.l + "px"; }
		else if("x" in dim){ dns.left = dim.x + "px"; }
		dns.width = dim.w + "px";
		dns.height = dim.h + "px";

		// Now resize canvas
		var mbCanvas = { l: 0, t: 0, w: dim.w, h: (dim.h - this.focusNode.offsetHeight) };
		domGeom.setMarginBox(this.canvas, mbCanvas);

		// If the single child can resize, forward resize event to it so it can
		// fit itself properly into the content area
		this._checkIfSingleChild();
		if(this._singleChild && this._singleChild.resize){
			this._singleChild.resize(mbCanvas);
		}
	},
	
	bringToTop: function(){
		// summary:
		//		bring this FloatingPane above all other panes
		var windows = arrayUtil.filter(
			this._allFPs,
			function(i){
				return i !== this;
			},
		this);
		windows.sort(function(a, b){
			return a.domNode.style.zIndex - b.domNode.style.zIndex;
		});
		windows.push(this);
		
		arrayUtil.forEach(windows, function(w, x){
			w.domNode.style.zIndex = this._startZ + (x * 2);
			domClass.remove(w.domNode, "dojoxFloatingPaneFg");
		}, this);
		domClass.add(this.domNode, "dojoxFloatingPaneFg");
	},
	
	destroy: function(){
		// summary:
		//		Destroy this FloatingPane completely
		this._allFPs.splice(arrayUtil.indexOf(this._allFPs, this), 1);
		if(this._resizeHandle){
			this._resizeHandle.destroy();
		}
		this.inherited(arguments);
	}
});

return FloatingPane;
});