define(["dojo/dom", "dojo/dom-style", "dojo/_base/connect", "dojo/_base/lang","dijit/registry", "dojox/mvc/at", "dojox/mobile/TransitionEvent", "dojox/mvc/Repeat", "dojox/mvc/getStateful", "dojox/mvc/Output"],
function(dom, domStyle, connect, lang, registry, at, TransitionEvent, Repeat, getStateful, Output){
	var _connectResults = []; // events connect result

	var repeatmodel = null;	//repeat view data model
	
	// these ids are updated here and in the html file to avoid duplicate ids
	var backId = 'ti1back1';
	var wrapperIdA = 'tst1WrapperA';
	var wrapperIdB = 'tst1WrapperB';


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
			if(dom.byId(backId) && this.app.isTablet){ 
				domStyle.set(dom.byId(backId), "visibility", "hidden"); // hide the back button in tablet mode
			}
			if(dom.byId("tab1WrapperA") && this.app.isTablet){ 
				domStyle.set(dom.byId("tab1WrapperA"), "visibility", "visible");  // show the nav view if it being used
				domStyle.set(dom.byId("tab1WrapperB"), "visibility", "visible");  // show the nav view if it being used
			}
			domStyle.set(dom.byId(wrapperIdA), "visibility", "visible");  // show the view when it is ready
			domStyle.set(dom.byId(wrapperIdB), "visibility", "visible");  // show the view when it is ready
		},

		afterActivate: function(){
			// summary:
			//		view life cycle afterActivate()
		},
		
		
		// repeate view destroy
		destroy: function(){
			var connectResult = _connectResults.pop();
			while(connectResult){
				connect.disconnect(connectResult);
				connectResult = _connectResults.pop();
			}
		}
	}
});
