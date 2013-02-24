dojo.provide("dojox.mobile.app._Widget");
dojo.experimental("dojox.mobile.app._Widget");

dojo.require("dijit._WidgetBase");

dojo.declare("dojox.mobile.app._Widget", dijit._WidgetBase, {
	// summary:
	//		The base mobile app widget.

	getScroll: function(){
		// summary:
		//		Returns the scroll position.
		return {
			x: dojo.global.scrollX,
			y: dojo.global.scrollY
		};
	},

	connect: function(target, event, fn){
		if(event.toLowerCase() == "dblclick"
			|| event.toLowerCase() == "ondblclick"){

			if(dojo.global["Mojo"]){
				// Handle webOS tap event
				return this.connect(target, Mojo.Event.tap, fn);
			}
		}
		return this.inherited(arguments);
	}
});