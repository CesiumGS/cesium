define(["dojo/dom", "dojo/dom-style", "dojo/_base/connect", "dijit/registry", "dojox/mvc/at", "dojox/mobile/TransitionEvent", "dojox/mvc/Repeat", "dojox/mvc/getStateful", "dojox/mvc/Output"],
function(dom, domStyle, connect, registry, at, TransitionEvent, Repeat, getStateful, Output){
	var _connectResults = []; // events connect result


	return {
		// repeate view init
		init: function(){
		},


		beforeActivate: function(){
			// summary:
			//		view life cycle beforeActivate()
			// description:
			//		beforeActivate will call refreshData to create the
			//		model/controller and show the list.
			if(dom.byId("mli1back") && this.app.isTablet){ 
				domStyle.set(dom.byId("mli1back"), "visibility", "hidden"); // hide the back button in tablet mode
			}
			if(dom.byId("tab1WrapperA")){ 
				domStyle.set(dom.byId("tab1WrapperA"), "visibility", "visible");  // show the nav view if it being used
				domStyle.set(dom.byId("tab1WrapperB"), "visibility", "visible");  // show the nav view if it being used
			}
		},
		
		
		// repeat view destroy
		destroy: function(){
			var connectResult = _connectResults.pop();
			while(connectResult){
				connect.disconnect(connectResult);
				connectResult = _connectResults.pop();
			}
		}
	}
});
