define(["dojo"], function(dojo) {

	// module:
	//		dojox/embed/Flash
	// summary:
	//		Base functionality to insert a flash movie into
	//		a document on the fly.
	// example:
	//	|	var movie=new Flash({ args }, containerNode);


	var fMarkup, fVersion;
	var minimumVersion = 9; // anything below this will throw an error (may overwrite)
	var keyBase = "dojox-embed-flash-", keyCount=0;
	var _baseKwArgs = {
		expressInstall: false,
		width: 320,
		height: 240,
		swLiveConnect: "true",
		allowScriptAccess: "sameDomain",
		allowNetworking:"all",
		style: null,
		redirect: null
	};

	function prep(kwArgs){
		kwArgs = dojo.delegate(_baseKwArgs, kwArgs);

		if(!("path" in kwArgs)){
			console.error("dojox.embed.Flash(ctor):: no path reference to a Flash movie was provided.");
			return null;
		}

		if(!("id" in kwArgs)){
			kwArgs.id = (keyBase + keyCount++);
		}
		return kwArgs;
	}

	if(dojo.isIE){
		fMarkup = function(kwArgs){
			kwArgs = prep(kwArgs);
			if(!kwArgs){ return null; }

			var p;
			var path = kwArgs.path;
			if(kwArgs.vars){
				var a = [];
				for(p in kwArgs.vars){
					a.push(p + '=' + kwArgs.vars[p]);
				}
				kwArgs.params.FlashVars = a.join("&");
				delete kwArgs.vars;
			}
			var s = '<object id="' + kwArgs.id + '" '
				+ 'classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" '
				+ 'width="' + kwArgs.width + '" '
				+ 'height="' + kwArgs.height + '"'
				+ ((kwArgs.style)?' style="' + kwArgs.style + '"':'')
				+ '>'
				+ '<param name="movie" value="' + path + '" />';
			if(kwArgs.params){
				for(p in kwArgs.params){
					s += '<param name="' + p + '" value="' + kwArgs.params[p] + '" />';
				}
			}
			s += '</object>';
			return { id: kwArgs.id, markup: s };
		};

		fVersion = (function(){
			var testVersion = 10, testObj = null;
			while(!testObj && testVersion > 7){
				try {
					testObj = new ActiveXObject("ShockwaveFlash.ShockwaveFlash." + testVersion--);
				}catch(e){ }
			}
			if(testObj){
				var v = testObj.GetVariable("$version").split(" ")[1].split(",");
				return {
					major: (v[0]!=null) ? parseInt(v[0]) : 0,
					minor: (v[1]!=null) ? parseInt(v[1]) : 0,
					rev: (v[2]!=null) ? parseInt(v[2]) : 0
				};
			}
			return { major: 0, minor: 0, rev: 0 };
		})();

		//	attach some cleanup for IE, thanks to deconcept :)
		dojo.addOnUnload(function(){
			var dummy = function(){};
			var objs = dojo.query("object").
				reverse().
				style("display", "none").
				forEach(function(i){
					for(var p in i){
						if((p != "FlashVars") && dojo.isFunction(i[p])){
							try{
								i[p] = dummy;
							}catch(e){}
						}
					}
				});
		});

	} else {
		//	*** Sane browsers branch ******************************************************************
		fMarkup = function(kwArgs){
			kwArgs = prep(kwArgs);
			if(!kwArgs){ return null; }

			var p;
			var path = kwArgs.path;
			if(kwArgs.vars){
				var a = [];
				for(p in kwArgs.vars){
					a.push(p + '=' + kwArgs.vars[p]);
				}
				kwArgs.params.flashVars = a.join("&");
				delete kwArgs.vars;
			}
			var s = '<embed type="application/x-shockwave-flash" '
				+ 'src="' + path + '" '
				+ 'id="' + kwArgs.id + '" '
				+ 'width="' + kwArgs.width + '" '
				+ 'height="' + kwArgs.height + '"'
				+ ((kwArgs.style)?' style="' + kwArgs.style + '" ':'')

				+ 'pluginspage="' + window.location.protocol + '//www.adobe.com/go/getflashplayer" ';
			if(kwArgs.params){
				for(p in kwArgs.params){
					s += ' ' + p + '="' + kwArgs.params[p] + '"';
				}
			}
			s += ' />';
			return { id: kwArgs.id, markup: s };
		};

		fVersion=(function(){
			var plugin = navigator.plugins["Shockwave Flash"];
			if(plugin && plugin.description){
				var v = plugin.description.replace(/([a-zA-Z]|\s)+/, "").replace(/(\s+r|\s+b[0-9]+)/, ".").split(".");
				return {
					major: (v[0]!=null) ? parseInt(v[0]) : 0,
					minor: (v[1]!=null) ? parseInt(v[1]) : 0,
					rev: (v[2]!=null) ? parseInt(v[2]) : 0
				};
			}
			return { major: 0, minor: 0, rev: 0 };
		})();
	}


/*=====
var __flashArgs = {
	// path: String
	//		The URL of the movie to embed.
	// id: String?
	//		A unique key that will be used as the id of the created markup.  If you don't
	//		provide this, a unique key will be generated.
	// width: Number?
	//		The width of the embedded movie; the default value is 320px.
	// height: Number?
	//		The height of the embedded movie; the default value is 240px
	// minimumVersion: Number?
	//		The minimum targeted version of the Flash Player (defaults to 9)
	// style: String?
	//		Any CSS style information (i.e. style="background-color:transparent") you want
	//		to define on the markup.
	// params: Object?
	//		A set of key/value pairs that you want to define in the resultant markup.
	// vars: Object?
	//		A set of key/value pairs that the Flash movie will interpret as FlashVars.
	// expressInstall: Boolean?
	//		Whether or not to include any kind of expressInstall info. Default is false.
	// redirect: String?
	//		A url to redirect the browser to if the current Flash version is not supported.
};
=====*/

	//	the main entry point
	var Flash = function(/*__flashArgs*/ kwArgs, /*DOMNode*/ node){
		// summary:
		//		Create a wrapper object around a Flash movie; this is the DojoX equivilent
		//		to SWFObject.
		//
		// description:
		//		Creates a wrapper object around a Flash movie.  Wrapper object will
		//		insert the movie reference in node; when the browser first starts
		//		grabbing the movie, onReady will be fired; when the movie has finished
		//		loading, it will fire onLoad.
		//
		//		If your movie uses ExternalInterface, you should use the onLoad event
		//		to do any kind of proxy setup (see dojox.embed.Flash.proxy); this seems
		//		to be the only consistent time calling EI methods are stable (since the
		//		Flash movie will shoot several methods into the window object before
		//		EI callbacks can be used properly).
		//
		// kwArgs: __flashArgs
		//		The various arguments that will be used to help define the Flash movie.
		// node: DomNode
		//		The node where the embed object will be placed
		//
		// example:
		//		Embed a flash movie in a document using the new operator, and get a reference to it.
		//	|	var movie = new dojox.embed.Flash({
		//	|		path: "path/to/my/movie.swf",
		//	|		width: 400,
		//	|		height: 300
		//	|	}, myWrapperNode, "testLoaded");
		//
		// example:
		//		Embed a flash movie in a document without using the new operator.
		//	|	var movie = dojox.embed.Flash({
		//	|		path: "path/to/my/movie.swf",
		//	|		width: 400,
		//	|		height: 300,
		//	|		style: "position:absolute;top:0;left:0"
		//	|	}, myWrapperNode, "testLoaded");

		// File can only be run from a server, due to SWF dependency.
		if(location.href.toLowerCase().indexOf("file://")>-1){
			throw new Error("dojox.embed.Flash can't be run directly from a file. To instatiate the required SWF correctly it must be run from a server, like localHost.");
		}

		// available: Number
		//		If there is a flash player available, and if so what version.
		this.available = dojox.embed.Flash.available;

		// minimumVersion: Number
		//		The minimum version of Flash required to run this movie.
		this.minimumVersion = kwArgs.minimumVersion || minimumVersion;

		// id: String
		//		The id of the DOMNode to be used for this movie.  Can be used with dojo.byId to get a reference.
		this.id = null;

		// movie: FlashObject
		//		A reference to the movie itself.
		this.movie = null;

		// domNode: DOMNode
		//		A reference to the DOMNode that contains this movie.
		this.domNode = null;
		if(node){
			node = dojo.byId(node);
		}
		// setTimeout Fixes #8743 - creating double SWFs
		// also allows time for code to attach to onError
		setTimeout(dojo.hitch(this, function(){
			if(kwArgs.expressInstall || this.available && this.available >= this.minimumVersion){
				if(kwArgs && node){
					this.init(kwArgs, node);
				}else{
					this.onError("embed.Flash was not provided with the proper arguments.");
				}
			}else{
				if(!this.available){
					this.onError("Flash is not installed.");
				}else{
					this.onError("Flash version detected: "+this.available+" is out of date. Minimum required: "+this.minimumVersion);
				}
			}
		}), 100);
	};

	dojo.extend(Flash, {
		onReady: function(/*HTMLObject*/ movie){
			// summary:
			//		Stub function for you to attach to when the movie reference is first
			//		pushed into the document.
		},
		onLoad: function(/*HTMLObject*/ movie){
			// summary:
			//		Stub function for you to attach to when the movie has finished downloading
			//		and is ready to be manipulated.
		},
		onError: function(msg){

		},
		_onload: function(){
			// summary:
			//	Internal. Cleans up before calling onLoad.
			clearInterval(this._poller);
			delete this._poller;
			delete this._pollCount;
			delete this._pollMax;
			this.onLoad(this.movie);
		},
		init: function(/*__flashArgs*/ kwArgs, /*DOMNode?*/ node){
			// summary:
			//		Initialize (i.e. place and load) the movie based on kwArgs.
			this.destroy();		//	ensure we are clean first.
			node = dojo.byId(node || this.domNode);
			if(!node){ throw new Error("dojox.embed.Flash: no domNode reference has been passed."); }

			// vars to help determine load status
			var p = 0, testLoaded=false;
			this._poller = null; this._pollCount = 0; this._pollMax = 15; this.pollTime = 100;

			if(dojox.embed.Flash.initialized){

				this.id = dojox.embed.Flash.place(kwArgs, node);
				this.domNode = node;

				setTimeout(dojo.hitch(this, function(){
					this.movie = this.byId(this.id, kwArgs.doc);
					this.onReady(this.movie);

					this._poller = setInterval(dojo.hitch(this, function(){

						// catch errors if not quite ready.
						try{
							p = this.movie.PercentLoaded();
						}catch(e){
							console.warn("this.movie.PercentLoaded() failed", e, this.movie);
						}

						if(p == 100){
							// if percent = 100, movie is fully loaded and we're communicating
							this._onload();

						}else if(p==0 && this._pollCount++ > this._pollMax){
							// after several attempts, we're not past zero.
							clearInterval(this._poller);
							throw new Error("Building SWF failed.");
						}
					}), this.pollTime);
				}), 1);
			}
		},
		_destroy: function(){
			// summary:
			//		Kill the movie and reset all the properties of this object.
			try{
				this.domNode.removeChild(this.movie);
			}catch(e){}
			this.id = this.movie = this.domNode = null;
		},
		destroy: function(){
			// summary:
			//		Public interface for destroying all the properties in this object.
			//		Will also clean all proxied methods.
			if(!this.movie){ return; }

			//	remove any proxy functions
			var test = dojo.delegate({
				id: true,
				movie: true,
				domNode: true,
				onReady: true,
				onLoad: true
			});
			for(var p in this){
				if(!test[p]){
					delete this[p];
				}
			}

			//	poll the movie
			if(this._poller){
				//	wait until onLoad to destroy
				dojo.connect(this, "onLoad", this, "_destroy");
			} else {
				this._destroy();
			}
		},
		byId: function (movieName, doc){
			// summary:
			//		Gets Flash movie by id.
			// description:
			//		Probably includes methods for outdated
			//		browsers, but this should catch all cases.
			// movieName: String
			//		The name of the SWF
			// doc: Object
			//		The document, if not current window
			//		(not fully supported)
			// example:
			//	|	var movie = dojox.embed.Flash.byId("myId");

			doc = doc || document;
			if(doc.embeds[movieName]){
				return doc.embeds[movieName];
			}
			if(doc[movieName]){
				return doc[movieName];
			}
			if(window[movieName]){
				return window[movieName];
			}
			if(document[movieName]){
				return document[movieName];
			}
			return null;
		}
	});

	//	expose information through the constructor function itself.
	dojo.mixin(Flash, {
		// summary:
		//		A singleton object used internally to get information
		//		about the Flash player available in a browser, and
		//		as the factory for generating and placing markup in a
		//		document.
		//
		// minSupported: Number
		//		The minimum supported version of the Flash Player, defaults to 8.
		// available: Number
		//		Used as both a detection (i.e. if(dojox.embed.Flash.available){ })
		//		and as a variable holding the major version of the player installed.
		// supported: Boolean
		//		Whether or not the Flash Player installed is supported by dojox.embed.
		// version: Object
		//		The version of the installed Flash Player; takes the form of
		//		{ major, minor, rev }.  To get the major version, you'd do this:
		//		var v=dojox.embed.Flash.version.major;
		// initialized: Boolean
		//		Whether or not the Flash engine is available for use.
		// onInitialize: Function
		//		A stub you can connect to if you are looking to fire code when the
		//		engine becomes available.  A note: DO NOT use this event to
		//		place a movie in a document; it will usually fire before DOMContentLoaded
		//		is fired, and you will get an error.  Use dojo.addOnLoad instead.
		minSupported : 8,
		available: fVersion.major,
		supported: (fVersion.major >= fVersion.required),
		minimumRequired: fVersion.required,
		version: fVersion,
		initialized: false,
		onInitialize: function(){
			Flash.initialized = true;
		},
		__ie_markup__: function(kwArgs){
			return fMarkup(kwArgs);
		},
		proxy: function(/*Flash*/ obj, /*Array|String*/ methods){
			// summary:
			//		Create the set of passed methods on the Flash object
			//		so that you can call that object directly, as opposed to having to
			//		delve into the internal movie to do this.  Intended to make working
			//		with Flash movies that use ExternalInterface much easier to use.
			//
			// example:
			//		Create "setMessage" and "getMessage" methods on foo.
			//	|	var foo = new Flash(args, someNode);
			//	|	dojo.connect(foo, "onLoad", dojo.hitch(foo, function(){
			//	|		Flash.proxy(this, [ "setMessage", "getMessage" ]);
			//	|		this.setMessage("Flash.proxy is pretty cool...");
			//	|		console.log(this.getMessage());
			//	|	}));
			dojo.forEach((dojo.isArray(methods) ? methods : [ methods ]), function(item){
				this[item] = dojo.hitch(this, function(){
					return (function(){
						return eval(this.movie.CallFunction(
							'<invoke name="' + item + '" returntype="javascript">'
							+ '<arguments>'
							+ dojo.map(arguments, function(item){
								// FIXME:
								//		investigate if __flash__toXML will
								//		accept direct application via map()
								//		(e.g., does it ignore args past the
								//		first? or does it blow up?)
								return __flash__toXML(item);
							}).join("")
							+ '</arguments>'
							+ '</invoke>'
						));
					}).apply(this, arguments||[]);
				});
			}, obj);
		}
	});

	Flash.place = function(kwArgs, node){
		var o = fMarkup(kwArgs);
		node = dojo.byId(node);
		if(!node){
			node = dojo.doc.createElement("div");
			node.id = o.id+"-container";
			dojo.body().appendChild(node);
		}
		if(o){
			node.innerHTML = o.markup;
			return o.id;
		}
		return null;
	}
	Flash.onInitialize();

	dojo.setObject("dojox.embed.Flash", Flash);

	return Flash;
});
