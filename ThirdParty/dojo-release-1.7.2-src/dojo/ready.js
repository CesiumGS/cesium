define(["./_base/kernel", "./has", "require", "./has!host-browser?./domReady", "./_base/lang"], function(dojo, has, require, domReady, lang) {
	// module:
	//		dojo/ready
	// summary:
	//		This module defines the dojo.ready API.
	//
	// note:
	//		This module should be unnecessary in dojo 2.0
	var
		// truthy if DOMContentLoaded or better (e.g., window.onload fired) has been achieved
		isDomReady = 0,

		// a function to call to cause onLoad to be called when all requested modules have been loaded
		requestCompleteSignal,

		// The queue of functions waiting to execute as soon as dojo.ready conditions satisfied
		loadQ = [],

		// prevent recursion in onLoad
		onLoadRecursiveGuard = 0,

		handleDomReady = function(){
			isDomReady = 1;
			dojo._postLoad = dojo.config.afterOnLoad = true;
			if(loadQ.length){
				requestCompleteSignal(onLoad);
			}
		},

		// run the next function queued with dojo.ready
		onLoad = function(){
			if(isDomReady && !onLoadRecursiveGuard && loadQ.length){
				//guard against recursions into this function
				onLoadRecursiveGuard = 1;
				var f = loadQ.shift();
					try{
						f();
					}
						// FIXME: signal the error via require.on
					finally{
						onLoadRecursiveGuard = 0;
					}
				onLoadRecursiveGuard = 0;
				if(loadQ.length){
					requestCompleteSignal(onLoad);
				}
			}
		};

	// define requireCompleteSignal; impl depends on loader
	if(has("dojo-loader")){
		require.on("idle", onLoad);
		requestCompleteSignal = function(){
			if(require.idle()){
				onLoad();
			} // else do nothing, onLoad will be called with the next idle signal
		};
	}else{
		// RequireJS or similar
		requestCompleteSignal = function(){
			// the next function call will fail if you don't have a loader with require.ready
			// in that case, either fix your loader, use dojo's loader, or don't call dojo.ready;
			require.ready(onLoad);
		};
	}

	var ready = dojo.ready = dojo.addOnLoad = function(priority, context, callback){
		// summary: Add a function to execute on DOM content loaded and all requested modules have arrived and been evaluated.
		// priority: Integer?
		//		The order in which to exec this callback relative to other callbacks, defaults to 1000
		// context: Object?|Function
		//		The context in which to run execute callback, or a callback if not using context
		// callback: Function?
		//		The function to execute.
		//
		// example:
		//	Simple DOM and Modules ready syntax
		//	|	dojo.ready(function(){ alert("Dom ready!"); });
		//
		// example:
		//	Using a priority
		//	|	dojo.ready(2, function(){ alert("low priority ready!"); })
		//
		// example:
		//	Using context
		//	|	dojo.ready(foo, function(){
		//	|		// in here, this == foo
		//	|	})
		//
		// example:
		//	Using dojo.hitch style args:
		//	|	var foo = { dojoReady: function(){ console.warn(this, "dojo dom and modules ready."); } };
		//	|	dojo.ready(foo, "dojoReady");

		var hitchArgs = lang._toArray(arguments);
		if(typeof priority != "number"){
			callback = context;
			context = priority;
			priority = 1000;
		}else{
			hitchArgs.shift();
		}
		callback = callback ?
			lang.hitch.apply(dojo, hitchArgs) :
			function(){
				context();
			};
		callback.priority = priority;
		for(var i = 0; i < loadQ.length && priority >= loadQ[i].priority; i++){}
		loadQ.splice(i, 0, callback);
		requestCompleteSignal();
	};

	has.add("dojo-config-addOnLoad", 1);
	if(has("dojo-config-addOnLoad")){
		var dca = dojo.config.addOnLoad;
		if(dca){
			ready[(lang.isArray(dca) ? "apply" : "call")](dojo, dca);
		}
	}

	if(has("dojo-sync-loader") && dojo.config.parseOnLoad && !dojo.isAsync){
		ready(99, function(){
			if(!dojo.parser){
				dojo.deprecated("Add explicit require(['dojo/parser']);", "", "2.0");
				require(["dojo/parser"]);
			}
		});
	}

	if(has("host-browser")){
		domReady(handleDomReady);
	}else{
		handleDomReady();
	}

	return ready;
});
