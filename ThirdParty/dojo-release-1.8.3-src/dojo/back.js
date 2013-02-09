define(["./_base/config", "./_base/lang", "./sniff", "./dom", "./dom-construct", "./_base/window", "require"],
	function(config, lang, has, dom, domConstruct, baseWindow, require){
	// module:
	//		dojo/back

	var back = {
		// summary:
		//		Browser history management resources
	};
	has("extend-dojo") && lang.setObject("dojo.back", back);

	// everyone deals with encoding the hash slightly differently

	var getHash = back.getHash = function(){
		var h = window.location.hash;
		if(h.charAt(0) == "#"){ h = h.substring(1); }
		return has("mozilla") ? h : decodeURIComponent(h);
	},

	setHash = back.setHash = function(h){
		if(!h){ h = ""; }
		window.location.hash = encodeURIComponent(h);
		historyCounter = history.length;
	};

	var initialHref = (typeof(window) !== "undefined") ? window.location.href : "";
	var initialHash = (typeof(window) !== "undefined") ? getHash() : "";
	var initialState = null;

	var locationTimer = null;
	var bookmarkAnchor = null;
	var historyIframe = null;
	var forwardStack = [];
	var historyStack = [];
	var moveForward = false;
	var changingUrl = false;
	var historyCounter;

	function handleBackButton(){
		// summary:
		//		private method. Do not call this directly.

		//The "current" page is always at the top of the history stack.
		var current = historyStack.pop();
		if(!current){ return; }
		var last = historyStack[historyStack.length-1];
		if(!last && historyStack.length == 0){
			last = initialState;
		}
		if(last){
			if(last.kwArgs["back"]){
				last.kwArgs["back"]();
			}else if(last.kwArgs["backButton"]){
				last.kwArgs["backButton"]();
			}else if(last.kwArgs["handle"]){
				last.kwArgs.handle("back");
			}
		}
		forwardStack.push(current);
	}

	back.goBack = handleBackButton;

	function handleForwardButton(){
		// summary:
		//		private method. Do not call this directly.
		var last = forwardStack.pop();
		if(!last){ return; }
		if(last.kwArgs["forward"]){
			last.kwArgs.forward();
		}else if(last.kwArgs["forwardButton"]){
			last.kwArgs.forwardButton();
		}else if(last.kwArgs["handle"]){
			last.kwArgs.handle("forward");
		}
		historyStack.push(last);
	}

	back.goForward = handleForwardButton;

	function createState(url, args, hash){
		// summary:
		//		private method. Do not call this directly.
		return {"url": url, "kwArgs": args, "urlHash": hash};	//Object
	}

	function getUrlQuery(url){
		// summary:
		//		private method. Do not call this directly.
		var segments = url.split("?");
		if(segments.length < 2){
			return null; //null
		}
		else{
			return segments[1]; //String
		}
	}

	function loadIframeHistory(){
		// summary:
		//		private method. Do not call this directly.
		var url = (config["dojoIframeHistoryUrl"] || require.toUrl("./resources/iframe_history.html")) + "?" + (new Date()).getTime();
		moveForward = true;
		if(historyIframe){
			has("webkit") ? historyIframe.location = url : window.frames[historyIframe.name].location = url;
		}else{
			//console.warn("dojo/back: Not initialised. You need to call back.init() from a <script> block that lives inside the <body> tag.");
		}
		return url; //String
	}

	function checkLocation(){
		if(!changingUrl){
			var hsl = historyStack.length;

			var hash = getHash();

			if((hash === initialHash||window.location.href == initialHref)&&(hsl == 1)){
				// FIXME: could this ever be a forward button?
				// we can't clear it because we still need to check for forwards. Ugg.
				// clearInterval(this.locationTimer);
				handleBackButton();
				return;
			}

			// first check to see if we could have gone forward. We always halt on
			// a no-hash item.
			if(forwardStack.length > 0){
				if(forwardStack[forwardStack.length-1].urlHash === hash){
					handleForwardButton();
					return;
				}
			}

			// ok, that didn't work, try someplace back in the history stack
			if((hsl >= 2)&&(historyStack[hsl-2])){
				if(historyStack[hsl-2].urlHash === hash){
					handleBackButton();
				}
			}
		}
	}

	back.init = function(){
		// summary:
		//		Initializes the undo stack. This must be called from a <script>
		//		block that lives inside the `<body>` tag to prevent bugs on IE.
		//
		//		Only call this method before the page's DOM is finished loading. Otherwise
		//		it will not work. Be careful with xdomain loading or djConfig.debugAtAllCosts scenarios,
		//		in order for this method to work, dojo/back will need to be part of a build layer.

		// prevent reinit
		if(dom.byId("dj_history")){ return; } 

		var src = config["dojoIframeHistoryUrl"] || require.toUrl("./resources/iframe_history.html");
		if (config.afterOnLoad){
			console.error("dojo/back::init() must be called before the DOM has loaded. "
						+ "Include dojo/back in a build layer.");
		}else{
			document.write('<iframe style="border:0;width:1px;height:1px;position:absolute;visibility:hidden;bottom:0;right:0;" name="dj_history" id="dj_history" src="' + src + '"></iframe>');
		}
	};

	back.setInitialState = function(/*Object*/args){
		// summary:
		//		Sets the state object and back callback for the very first page
		//		that is loaded.
		//
		//		It is recommended that you call this method as part of an event
		//		listener that is registered via dojo/ready.
		// args: Object
		//		See the addToHistory() function for the list of valid args properties.
		initialState = createState(initialHref, args, initialHash);
	};

	//FIXME: Make these doc comments not be awful. At least they're not wrong.
	//FIXME: Would like to support arbitrary back/forward jumps. Have to rework iframeLoaded among other things.
	//FIXME: is there a slight race condition in moz using change URL with the timer check and when
	//		 the hash gets set? I think I have seen a back/forward call in quick succession, but not consistent.


	/*=====
	var __backArgs = {
		// back: Function?
		//		A function to be called when this state is reached via the user
		//		clicking the back button.
		// forward: Function?
		//		Upon return to this state from the "back, forward" combination
		//		of navigation steps, this function will be called. Somewhat
		//		analogous to the semantic of an "onRedo" event handler.
		// changeUrl: Boolean|String?
		//		Boolean indicating whether or not to create a unique hash for
		//		this state. If a string is passed instead, it is used as the
		//		hash.
	};
	=====*/

	back.addToHistory = function(args){
		// summary:
		//		adds a state object (args) to the history list.
		// args: __backArgs
		//		The state object that will be added to the history list.
		// description:
		//		To support getting back button notifications, the object
		//		argument should implement a function called either "back",
		//		"backButton", or "handle". The string "back" will be passed as
		//		the first and only argument to this callback.
		//
		//		To support getting forward button notifications, the object
		//		argument should implement a function called either "forward",
		//		"forwardButton", or "handle". The string "forward" will be
		//		passed as the first and only argument to this callback.
		//
		//		If you want the browser location string to change, define "changeUrl" on the object. If the
		//		value of "changeUrl" is true, then a unique number will be appended to the URL as a fragment
		//		identifier (http://some.domain.com/path#uniquenumber). If it is any other value that does
		//		not evaluate to false, that value will be used as the fragment identifier. For example,
		//		if changeUrl: 'page1', then the URL will look like: http://some.domain.com/path#page1
		//
		//		There are problems with using dojo/back with semantically-named fragment identifiers
		//		("hash values" on an URL). In most browsers it will be hard for dojo/back to know
		//		distinguish a back from a forward event in those cases. For back/forward support to
		//		work best, the fragment ID should always be a unique value (something using new Date().getTime()
		//		for example). If you want to detect hash changes using semantic fragment IDs, then
		//		consider using dojo/hash instead (in Dojo 1.4+).
		//
		// example:
		//		|	back.addToHistory({
		//		|		back: function(){ console.log('back pressed'); },
		//		|		forward: function(){ console.log('forward pressed'); },
		//		|		changeUrl: true
		//		|	});

		//	BROWSER NOTES:
		//	Safari 1.2:
		//	back button "works" fine, however it's not possible to actually
		//	DETECT that you've moved backwards by inspecting window.location.
		//	Unless there is some other means of locating.
		//	FIXME: perhaps we can poll on history.length?
		//	Safari 2.0.3+ (and probably 1.3.2+):
		//	works fine, except when changeUrl is used. When changeUrl is used,
		//	Safari jumps all the way back to whatever page was shown before
		//	the page that uses dojo.undo.browser support.
		//	IE 5.5 SP2:
		//	back button behavior is macro. It does not move back to the
		//	previous hash value, but to the last full page load. This suggests
		//	that the iframe is the correct way to capture the back button in
		//	these cases.
		//	Don't test this page using local disk for MSIE. MSIE will not create
		//	a history list for iframe_history.html if served from a file: URL.
		//	The XML served back from the XHR tests will also not be properly
		//	created if served from local disk. Serve the test pages from a web
		//	server to test in that browser.
		//	IE 6.0:
		//	same behavior as IE 5.5 SP2
		//	Firefox 1.0+:
		//	the back button will return us to the previous hash on the same
		//	page, thereby not requiring an iframe hack, although we do then
		//	need to run a timer to detect inter-page movement.

		//If addToHistory is called, then that means we prune the
		//forward stack -- the user went back, then wanted to
		//start a new forward path.
		forwardStack = [];

		var hash = null;
		var url = null;
		if(!historyIframe){
			if(config["useXDomain"] && !config["dojoIframeHistoryUrl"]){
				console.warn("dojo/back: When using cross-domain Dojo builds,"
					+ " please save iframe_history.html to your domain and set djConfig.dojoIframeHistoryUrl"
					+ " to the path on your domain to iframe_history.html");
			}
			historyIframe = window.frames["dj_history"];
		}
		if(!bookmarkAnchor){
			bookmarkAnchor = domConstruct.create("a", {style: {display: "none"}}, baseWindow.body());
		}
		if(args["changeUrl"]){
			hash = ""+ ((args["changeUrl"]!==true) ? args["changeUrl"] : (new Date()).getTime());

			//If the current hash matches the new one, just replace the history object with
			//this new one. It doesn't make sense to track different state objects for the same
			//logical URL. This matches the browser behavior of only putting in one history
			//item no matter how many times you click on the same #hash link, at least in Firefox
			//and Safari, and there is no reliable way in those browsers to know if a #hash link
			//has been clicked on multiple times. So making this the standard behavior in all browsers
			//so that dojo/back's behavior is the same in all browsers.
			if(historyStack.length == 0 && initialState.urlHash == hash){
				initialState = createState(url, args, hash);
				return;
			}else if(historyStack.length > 0 && historyStack[historyStack.length - 1].urlHash == hash){
				historyStack[historyStack.length - 1] = createState(url, args, hash);
				return;
			}

			changingUrl = true;
			setTimeout(function(){
					setHash(hash);
					changingUrl = false;
				}, 1);
			bookmarkAnchor.href = hash;

			if(has("ie")){
				url = loadIframeHistory();

				var oldCB = args["back"]||args["backButton"]||args["handle"];

				//The function takes handleName as a parameter, in case the
				//callback we are overriding was "handle". In that case,
				//we will need to pass the handle name to handle.
				var tcb = function(handleName){
					if(getHash() != ""){
						setTimeout(function(){ setHash(hash); }, 1);
					}
					//Use apply to set "this" to args, and to try to avoid memory leaks.
					oldCB.apply(this, [handleName]);
				};

				//Set interceptor function in the right place.
				if(args["back"]){
					args.back = tcb;
				}else if(args["backButton"]){
					args.backButton = tcb;
				}else if(args["handle"]){
					args.handle = tcb;
				}

				var oldFW = args["forward"]||args["forwardButton"]||args["handle"];

				//The function takes handleName as a parameter, in case the
				//callback we are overriding was "handle". In that case,
				//we will need to pass the handle name to handle.
				var tfw = function(handleName){
					if(getHash() != ""){
						setHash(hash);
					}
					if(oldFW){ // we might not actually have one
						//Use apply to set "this" to args, and to try to avoid memory leaks.
						oldFW.apply(this, [handleName]);
					}
				};

				//Set interceptor function in the right place.
				if(args["forward"]){
					args.forward = tfw;
				}else if(args["forwardButton"]){
					args.forwardButton = tfw;
				}else if(args["handle"]){
					args.handle = tfw;
				}

			}else if(!has("ie")){
				// start the timer
				if(!locationTimer){
					locationTimer = setInterval(checkLocation, 200);
				}

			}
		}else{
			url = loadIframeHistory();
		}

		historyStack.push(createState(url, args, hash));
	};

	back._iframeLoaded = function(evt, ifrLoc){
		// summary:
		//		private method. Do not call this directly.
		var query = getUrlQuery(ifrLoc.href);
		if(query == null){
			// alert("iframeLoaded");
			// we hit the end of the history, so we should go back
			if(historyStack.length == 1){
				handleBackButton();
			}
			return;
		}
		if(moveForward){
			// we were expecting it, so it's not either a forward or backward movement
			moveForward = false;
			return;
		}

		//Check the back stack first, since it is more likely.
		//Note that only one step back or forward is supported.
		if(historyStack.length >= 2 && query == getUrlQuery(historyStack[historyStack.length-2].url)){
			handleBackButton();
		}else if(forwardStack.length > 0 && query == getUrlQuery(forwardStack[forwardStack.length-1].url)){
			handleForwardButton();
		}
	};

	return back;
	
});
