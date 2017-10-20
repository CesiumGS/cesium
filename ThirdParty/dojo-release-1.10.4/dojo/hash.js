define(["./_base/kernel", "require", "./_base/config", "./aspect", "./_base/lang", "./topic", "./domReady", "./sniff"],
	function(dojo, require, config, aspect, lang, topic, domReady, has){

	// module:
	//		dojo/hash

	dojo.hash = function(/* String? */ hash, /* Boolean? */ replace){
		// summary:
		//		Gets or sets the hash string in the browser URL.
		// description:
		//		Handles getting and setting of location.hash.
		//
		//		 - If no arguments are passed, acts as a getter.
		//		 - If a string is passed, acts as a setter.
		// hash:
		//		the hash is set - #string.
		// replace:
		//		If true, updates the hash value in the current history
		//		state instead of creating a new history state.
		// returns:
		//		when used as a getter, returns the current hash string.
		//		when used as a setter, returns the new hash string.
		// example:
		//	|	topic.subscribe("/dojo/hashchange", context, callback);
		//	|
		//	|	function callback (hashValue){
		//	|		// do something based on the hash value.
		//	|	}

		// getter
		if(!arguments.length){
			return _getHash();
		}
		// setter
		if(hash.charAt(0) == "#"){
			hash = hash.substring(1);
		}
		if(replace){
			_replace(hash);
		}else{
			location.href = "#" + hash;
		}
		return hash; // String
	};

	// Global vars
	var _recentHash, _ieUriMonitor, _connect,
		_pollFrequency = config.hashPollFrequency || 100;

	//Internal functions
	function _getSegment(str, delimiter){
		var i = str.indexOf(delimiter);
		return (i >= 0) ? str.substring(i+1) : "";
	}

	function _getHash(){
		return _getSegment(location.href, "#");
	}

	function _dispatchEvent(){
		topic.publish("/dojo/hashchange", _getHash());
	}

	function _pollLocation(){
		if(_getHash() === _recentHash){
			return;
		}
		_recentHash = _getHash();
		_dispatchEvent();
	}

	function _replace(hash){
		if(_ieUriMonitor){
			if(_ieUriMonitor.isTransitioning()){
				setTimeout(lang.hitch(null,_replace,hash), _pollFrequency);
				return;
			}
			var href = _ieUriMonitor.iframe.location.href;
			var index = href.indexOf('?');
			// main frame will detect and update itself
			_ieUriMonitor.iframe.location.replace(href.substring(0, index) + "?" + hash);
			return;
		}
		location.replace("#"+hash);
		!_connect && _pollLocation();
	}

	function IEUriMonitor(){
		// summary:
		//		Determine if the browser's URI has changed or if the user has pressed the
		//		back or forward button. If so, call _dispatchEvent.
		//
		// description:
		//		IE doesn't add changes to the URI's hash into the history unless the hash
		//		value corresponds to an actual named anchor in the document. To get around
		//		this IE difference, we use a background IFrame to maintain a back-forward
		//		history, by updating the IFrame's query string to correspond to the
		//		value of the main browser location's hash value.
		//
		//		E.g. if the value of the browser window's location changes to
		//
		//		#action=someAction
		//
		//		... then we'd update the IFrame's source to:
		//
		//		?action=someAction
		//
		//		This design leads to a somewhat complex state machine, which is
		//		described below:
		//
		//		####s1
		//
		//		Stable state - neither the window's location has changed nor
		//		has the IFrame's location. Note that this is the 99.9% case, so
		//		we optimize for it.
		//
		//		Transitions: s1, s2, s3
		//
		//		####s2
		//
		//		Window's location changed - when a user clicks a hyperlink or
		//		code programmatically changes the window's URI.
		//
		//		Transitions: s4
		//
		//		####s3
		//
		//		Iframe's location changed as a result of user pressing back or
		//		forward - when the user presses back or forward, the location of
		//		the background's iframe changes to the previous or next value in
		//		its history.
		//
		//		Transitions: s1
		//
		//		####s4
		//
		//		IEUriMonitor has programmatically changed the location of the
		//		background iframe, but it's location hasn't yet changed. In this
		//		case we do nothing because we need to wait for the iframe's
		//		location to reflect its actual state.
		//
		//		Transitions: s4, s5
		//
		//		####s5
		//
		//		IEUriMonitor has programmatically changed the location of the
		//		background iframe, and the iframe's location has caught up with
		//		reality. In this case we need to transition to s1.
		//
		//		Transitions: s1
		//
		//		The hashchange event is always dispatched on the transition back to s1.


		// create and append iframe
		var ifr = document.createElement("iframe"),
			IFRAME_ID = "dojo-hash-iframe",
			ifrSrc = config.dojoBlankHtmlUrl || require.toUrl("./resources/blank.html");

		if(config.useXDomain && !config.dojoBlankHtmlUrl){
			console.warn("dojo/hash: When using cross-domain Dojo builds,"
				+ " please save dojo/resources/blank.html to your domain and set djConfig.dojoBlankHtmlUrl"
				+ " to the path on your domain to blank.html");
		}

		ifr.id = IFRAME_ID;
		ifr.src = ifrSrc + "?" + _getHash();
		ifr.style.display = "none";
		document.body.appendChild(ifr);

		this.iframe = dojo.global[IFRAME_ID];
		var recentIframeQuery, transitioning, expectedIFrameQuery, docTitle, ifrOffline,
			iframeLoc = this.iframe.location;

		function resetState(){
			_recentHash = _getHash();
			recentIframeQuery = ifrOffline ? _recentHash : _getSegment(iframeLoc.href, "?");
			transitioning = false;
			expectedIFrameQuery = null;
		}

		this.isTransitioning = function(){
			return transitioning;
		};

		this.pollLocation = function(){
			if(!ifrOffline){
				try{
					//see if we can access the iframe's location without a permission denied error
					var iframeSearch = _getSegment(iframeLoc.href, "?");
					//good, the iframe is same origin (no thrown exception)
					if(document.title != docTitle){ //sync title of main window with title of iframe.
						docTitle = this.iframe.document.title = document.title;
					}
				}catch(e){
					//permission denied - server cannot be reached.
					ifrOffline = true;
					console.error("dojo/hash: Error adding history entry. Server unreachable.");
				}
			}
			var hash = _getHash();
			if(transitioning && _recentHash === hash){
				// we're in an iframe transition (s4 or s5)
				if(ifrOffline || iframeSearch === expectedIFrameQuery){
					// s5 (iframe caught up to main window or iframe offline), transition back to s1
					resetState();
					_dispatchEvent();
				}else{
					// s4 (waiting for iframe to catch up to main window)
					setTimeout(lang.hitch(this,this.pollLocation),0);
					return;
				}
			}else if(_recentHash === hash && (ifrOffline || recentIframeQuery === iframeSearch)){
				// we're in stable state (s1, iframe query == main window hash), do nothing
			}else{
				// the user has initiated a URL change somehow.
				// sync iframe query <-> main window hash
				if(_recentHash !== hash){
					// s2 (main window location changed), set iframe url and transition to s4
					_recentHash = hash;
					transitioning = true;
					expectedIFrameQuery = hash;
					ifr.src = ifrSrc + "?" + expectedIFrameQuery;
					ifrOffline = false; //we're updating the iframe src - set offline to false so we can check again on next poll.
					setTimeout(lang.hitch(this,this.pollLocation),0); //yielded transition to s4 while iframe reloads.
					return;
				}else if(!ifrOffline){
					// s3 (iframe location changed via back/forward button), set main window url and transition to s1.
					location.href = "#" + iframeLoc.search.substring(1);
					resetState();
					_dispatchEvent();
				}
			}
			setTimeout(lang.hitch(this,this.pollLocation), _pollFrequency);
		};
		resetState(); // initialize state (transition to s1)
		setTimeout(lang.hitch(this,this.pollLocation), _pollFrequency);
	}
	domReady(function(){
		if("onhashchange" in dojo.global && (!has("ie") || (has("ie") >= 8 && document.compatMode != "BackCompat"))){	//need this IE browser test because "onhashchange" exists in IE8 in IE7 mode
			_connect = aspect.after(dojo.global,"onhashchange",_dispatchEvent, true);
		}else{
			if(document.addEventListener){ // Non-IE
				_recentHash = _getHash();
				setInterval(_pollLocation, _pollFrequency); //Poll the window location for changes
			}else if(document.attachEvent){ // IE7-
				//Use hidden iframe in versions of IE that don't have onhashchange event
				_ieUriMonitor = new IEUriMonitor();
			}
			// else non-supported browser, do nothing.
		}
	});

	return dojo.hash;

});
