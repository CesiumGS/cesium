define(["./kernel", "./connect"], function(dojo, connect) {
	// module:
	//		dojo/unload
	// summary:
	//		This module contains the document and window unload detection API.

	var win = window;

	/*=====
		dojo.windowUnloaded = function(){
			// summary:
			//		signal fired by impending window destruction. You may use
			//		dojo.addOnWindowUnload() to register a listener for this
			//		event. NOTE: if you wish to dojo.connect() to this method
			//		to perform page/application cleanup, be aware that this
			//		event WILL NOT fire if no handler has been registered with
			//		dojo.addOnWindowUnload. This behavior started in Dojo 1.3.
			//		Previous versions always triggered dojo.windowUnloaded. See
			//		dojo.addOnWindowUnload for more info.
		};
	=====*/

	dojo.addOnWindowUnload = function(/*Object?|Function?*/obj, /*String|Function?*/functionName){
		// summary:
		//		registers a function to be triggered when window.onunload
		//		fires.
		//	description:
		//		The first time that addOnWindowUnload is called Dojo
		//		will register a page listener to trigger your unload
		//		handler with. Note that registering these handlers may
		//		destory "fastback" page caching in browsers that support
		//		it. Be careful trying to modify the DOM or access
		//		JavaScript properties during this phase of page unloading:
		//		they may not always be available. Consider
		//		dojo.addOnUnload() if you need to modify the DOM or do
		//		heavy JavaScript work since it fires at the eqivalent of
		//		the page's "onbeforeunload" event.
		// example:
		//	| dojo.addOnWindowUnload(functionPointer)
		//	| dojo.addOnWindowUnload(object, "functionName");
		//	| dojo.addOnWindowUnload(object, function(){ /* ... */});

		if (!dojo.windowUnloaded) {
			connect.connect(win, "unload", (dojo.windowUnloaded= function(){}));
		}
		connect.connect(win, "unload", obj, functionName);
	};

	dojo.addOnUnload = function(/*Object?|Function?*/obj, /*String|Function?*/functionName){
		// summary:
		//		registers a function to be triggered when the page unloads.
		//	description:
		//		The first time that addOnUnload is called Dojo will
		//		register a page listener to trigger your unload handler
		//		with.
		//
		//		In a browser enviroment, the functions will be triggered
		//		during the window.onbeforeunload event. Be careful of doing
		//		too much work in an unload handler. onbeforeunload can be
		//		triggered if a link to download a file is clicked, or if
		//		the link is a javascript: link. In these cases, the
		//		onbeforeunload event fires, but the document is not
		//		actually destroyed. So be careful about doing destructive
		//		operations in a dojo.addOnUnload callback.
		//
		//		Further note that calling dojo.addOnUnload will prevent
		//		browsers from using a "fast back" cache to make page
		//		loading via back button instantaneous.
		// example:
		//	| dojo.addOnUnload(functionPointer)
		//	| dojo.addOnUnload(object, "functionName")
		//	| dojo.addOnUnload(object, function(){ /* ... */});

		connect.connect(win, "beforeunload", obj, functionName);
	};

	return {
		addOnWindowUnload: dojo.addOnWindowUnload,
		addOnUnload: dojo.addOnUnload
	};
});
