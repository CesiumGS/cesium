define(["dojo/_base/kernel","dojo/_base/lang","dojo/_base/window","dojo/_base/declare",
		"dojo/_base/fx","dojo/_base/connect","dojo/_base/array","dojo/_base/sniff",
		"dojo/window","dojo/dom","dojo/dom-class","dojo/dom-geometry","dojo/dom-construct",
		"dijit/_TemplatedMixin","dijit/_Widget","dijit/BackgroundIframe","dojo/dnd/Moveable",
		"./ContentPane","./ResizeHandle","dojo/text!./resources/FloatingPane.html"], function(
	kernel, lang, winUtil, declare, baseFx, connectUtil, arrayUtil, 
	has, windowLib, dom, domClass, domGeom, domConstruct, TemplatedMixin, Widget, BackgroundIframe, 
	Moveable, ContentPane, ResizeHandle, template){
	
kernel.experimental("dojox.layout.Dock");

var Dock = declare("dojox.layout.Dock",[Widget, TemplatedMixin],{
	// summary:
	//		A widget that attaches to a node and keeps track of incoming / outgoing FloatingPanes
	//		and handles layout

	templateString: '<div class="dojoxDock"><ul dojoAttachPoint="containerNode" class="dojoxDockList"></ul></div>',

	// _docked: [private] Array
	//		array of panes currently in our dock
	_docked: [],
	
	_inPositioning: false,
	
	autoPosition: false,
	
	addNode: function(refNode){
		// summary:
		//		Insert a dockNode reference into the dock
		
		var div = domConstruct.create('li', null, this.containerNode),
			node = new DockNode({
				title: refNode.title,
				paneRef: refNode
			}, div)
		;
		node.startup();
		return node;
	},

	startup: function(){
				
		if (this.id == "dojoxGlobalFloatingDock" || this.isFixedDock) {
			// attach window.onScroll, and a position like in presentation/dialog
			this.connect(window, 'onresize', "_positionDock");
			this.connect(window, 'onscroll', "_positionDock");
			if(has("ie")){
				this.connect(this.domNode, "onresize", "_positionDock");
			}
		}
		this._positionDock(null);
		this.inherited(arguments);

	},
	
	_positionDock: function(/* Event? */e){
		if(!this._inPositioning){
			if(this.autoPosition == "south"){
				// Give some time for scrollbars to appear/disappear
				setTimeout(lang.hitch(this, function() {
					this._inPositiononing = true;
					var viewport = windowLib.getBox();
					var s = this.domNode.style;
					s.left = viewport.l + "px";
					s.width = (viewport.w-2) + "px";
					s.top = (viewport.h + viewport.t) - this.domNode.offsetHeight + "px";
					this._inPositioning = false;
				}), 125);
			}
		}
	}


});

var DockNode = declare("dojox.layout._DockNode",[Widget, TemplatedMixin],{
	// summary:
	//		dojox.layout._DockNode is a private widget used to keep track of
	//		which pane is docked.

	// title: String
	//		Shown in dock icon. should read parent iconSrc?
	title: "",

	// paneRef: Widget
	//		reference to the FloatingPane we reprasent in any given dock
	paneRef: null,

	templateString:
		'<li dojoAttachEvent="onclick: restore" class="dojoxDockNode">'+
			'<span dojoAttachPoint="restoreNode" class="dojoxDockRestoreButton" dojoAttachEvent="onclick: restore"></span>'+
			'<span class="dojoxDockTitleNode" dojoAttachPoint="titleNode">${title}</span>'+
		'</li>',

	restore: function(){
		// summary:
		//		remove this dock item from parent dock, and call show() on reffed floatingpane
		this.paneRef.show();
		this.paneRef.bringToTop();
		this.destroy();
	}
});

return Dock;
});

