define(['./has'], function(has){
	var global = (function () { return this; })(),
		doc = document,
		readyStates = { 'loaded': 1, 'complete': 1 },
		fixReadyState = typeof doc.readyState != "string",
		ready = !!readyStates[doc.readyState],
		readyQ = [],
		recursiveGuard;

	function domReady(callback){
		// summary:
		//		Plugin to delay require()/define() callback from firing until the DOM has finished loading.
		readyQ.push(callback);
		if(ready){ processQ(); }
	}
	domReady.load = function(id, req, load){
		domReady(load);
	};

	// Export queue so that ready() can check if it's empty or not.
	domReady._Q = readyQ;
	domReady._onQEmpty = function(){
		// summary:
		//		Private method overridden by dojo/ready, to notify when everything in the
		//		domReady queue has been processed.  Do not use directly.
		//		Will be removed in 2.0, along with domReady._Q.
	};

	// For FF <= 3.5
	if(fixReadyState){ doc.readyState = "loading"; }

	function processQ(){
		// Calls all functions in the queue in order, unless processQ() is already running, in which case just return

		if(recursiveGuard){ return; }
		recursiveGuard = true;

		while(readyQ.length){
			try{
				(readyQ.shift())(doc);
			}catch(err){
				console.error(err, "in domReady callback", err.stack);
			}
		}

		recursiveGuard = false;

		// Notification for dojo/ready.  Remove for 2.0.
		// Note that this could add more tasks to the ready queue.
		domReady._onQEmpty();
	}

	if(!ready){
		var tests = [],
			detectReady = function(evt){
				evt = evt || global.event;
				if(ready || (evt.type == "readystatechange" && !readyStates[doc.readyState])){ return; }

				// For FF <= 3.5
				if(fixReadyState){ doc.readyState = "complete"; }

				ready = 1;
				processQ();
			},
			on = function(node, event){
				node.addEventListener(event, detectReady, false);
				readyQ.push(function(){ node.removeEventListener(event, detectReady, false); });
			};

		if(!has("dom-addeventlistener")){
			on = function(node, event){
				event = "on" + event;
				node.attachEvent(event, detectReady);
				readyQ.push(function(){ node.detachEvent(event, detectReady); });
			};

			var div = doc.createElement("div");
			try{
				if(div.doScroll && global.frameElement === null){
					// the doScroll test is only useful if we're in the top-most frame
					tests.push(function(){
						// Derived with permission from Diego Perini's IEContentLoaded
						// http://javascript.nwbox.com/IEContentLoaded/
						try{
							div.doScroll("left");
							return 1;
						}catch(e){}
					});
				}
			}catch(e){}
		}

		on(doc, "DOMContentLoaded");
		on(global, "load");

		if("onreadystatechange" in doc){
			on(doc, "readystatechange");
		}else if(!fixReadyState){
			// if the ready state property exists and there's
			// no readystatechange event, poll for the state
			// to change
			tests.push(function(){
				return readyStates[doc.readyState];
			});
		}

		if(tests.length){
			var poller = function(){
				if(ready){ return; }
				var i = tests.length;
				while(i--){
					if(tests[i]()){
						detectReady("poller");
						return;
					}
				}
				setTimeout(poller, 30);
			};
			poller();
		}
	}

	return domReady;
});
