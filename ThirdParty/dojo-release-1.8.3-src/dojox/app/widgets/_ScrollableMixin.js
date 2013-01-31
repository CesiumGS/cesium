// This module is modified from dojox/mobile/_ScrollableMixin and dojox/mobile/ScrollableView
define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojox/mobile/scrollable"],
	function(declare, lang, domClass, domConstruct, Scrollable){
	// module:
	//		dojox/mobile/_ScrollableMixin
	// summary:
	//		Mixin for widgets to have a touch scrolling capability.

	var cls = declare("dojox.app.widgets._ScrollableMixin", null, {
		// summary:
		//		Mixin for widgets to have a touch scrolling capability.
		// description:
		//		Actual implementation is in dojox/mobile/scrollable.js.
		//		scrollable.js is not a dojo class, but just a collection
		//		of functions. This module makes scrollable.js a dojo class.

		// scrollableParams: Object
		//		Parameters for dojox/mobile/scrollable.init().
		scrollableParams: null,

		// allowNestedScrolls: Boolean
		//		e.g. Allow ScrollableView in a SwapView.
		allowNestedScrolls: true,

		constructor: function(){
			this.scrollableParams = {noResize: true}; // set noResize to true to match the way it was done in app/widgets/scrollable.js
		},

		destroy: function(){
			this.cleanup();
			this.inherited(arguments);
		},

		startup: function(){
			if(this._started){ return; }
			var params = this.scrollableParams;
			this.init(params);
			this.inherited(arguments);
			this.reparent();
		},

		// build scrollable container domNode. This method from dojox/mobile/ScrollableView
		buildRendering: function(){
			this.inherited(arguments);
			domClass.add(this.domNode, "mblScrollableView");
			this.domNode.style.overflow = "hidden";
			this.domNode.style.top = "0px";
			this.containerNode = domConstruct.create("div",	{className:"mblScrollableViewContainer"}, this.domNode);
			this.containerNode.style.position = "absolute";
			this.containerNode.style.top = "0px"; // view bar is relative
			if(this.scrollDir === "v"){
				this.containerNode.style.width = "100%";
			}
		},

		// This method from dojox/mobile/ScrollableView
		reparent: function(){
			// summary:
			//		Moves all the children to containerNode.
			var i, idx, len, c;
			for(i = 0, idx = 0, len = this.domNode.childNodes.length; i < len; i++){
				c = this.domNode.childNodes[idx];
				// search for view-specific header or footer
				if(c === this.containerNode){
					idx++;
					continue;
				}
				this.containerNode.appendChild(this.domNode.removeChild(c));
			}
		},

		// This method from dojox/mobile/ScrollableView
		resize: function(){
			// summary:
			//		Calls resize() of each child widget.
			this.inherited(arguments); // scrollable#resize() will be called
			array.forEach(this.getChildren(), function(child){
				if(child.resize){ child.resize(); }
			});
		}
	});
	lang.extend(cls, new Scrollable());
	return cls;
});
