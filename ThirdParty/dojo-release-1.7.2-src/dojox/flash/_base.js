dojo.provide("dojox.flash._base");
dojo.experimental("dojox.flash");

// for dojo.window.getBox(), needed by dojox.flash.Embed.center()
dojo.require("dojo.window");

dojox.flash = function(){
	// summary:
	//	Utilities to embed and communicate with the Flash player from Javascript
	//
	// description:
	//	The goal of dojox.flash is to make it easy to extend Flash's capabilities
	//	into an Ajax/DHTML environment.
	//
	//	dojox.flash provides an easy object for interacting with the Flash plugin.
	//	This object provides methods to determine the current version of the Flash
	//	plugin (dojox.flash.info); write out the necessary markup to
	//	dynamically insert a Flash object into the page (dojox.flash.Embed; and
	//	do dynamic installation and upgrading of the current Flash plugin in
	//	use (dojox.flash.Install). If you want to call methods on the Flash object
	//	embedded into the page it is your responsibility to use Flash's ExternalInterface
	//	API and get a reference to the Flash object yourself.
	//
	//	To use dojox.flash, you must first wait until Flash is finished loading
	//	and initializing before you attempt communication or interaction.
	//	To know when Flash is finished use dojo.connect:
	//
	//|	dojo.connect(dojox.flash, "loaded", myInstance, "myCallback");
	//
	//	Then, while the page is still loading provide the file name:
	//
	//|	dojox.flash.setSwf(dojo.moduleUrl("dojox", "_storage/storage.swf"));
	//
	//	If no SWF files are specified, then Flash is not initialized.
	//
	//	Your Flash must use Flash's ExternalInterface to expose Flash methods and
	//	to call JavaScript.
	//
	//	setSwf can take an optional 'visible' attribute to control whether
	//	the Flash object is visible or not on the page; the default is visible:
	//
	//|	dojox.flash.setSwf(dojo.moduleUrl("dojox", "_storage/storage.swf"),
	//						false);
	//
	//	Once finished, you can query Flash version information:
	//
	//|	dojox.flash.info.version
	//
	//	Or can communicate with Flash methods that were exposed:
	//
	//|	var f = dojox.flash.get();
	//|	var results = f.sayHello("Some Message");
	//
	//	Your Flash files should use DojoExternalInterface.as to register methods;
	//	this file wraps Flash's normal ExternalInterface but correct various
	//	serialization bugs that ExternalInterface has.
	//
	//	Note that dojox.flash is not meant to be a generic Flash embedding
	//	mechanism; it is as generic as necessary to make Dojo Storage's
	//	Flash Storage Provider as clean and modular as possible. If you want
	//	a generic Flash embed mechanism see [SWFObject](http://blog.deconcept.com/swfobject/).
	//
	// 	Notes:
	//	Note that dojox.flash can currently only work with one Flash object
	//	on the page; it does not yet support multiple Flash objects on
	//	the same page.
	//
	//	Your code can detect whether the Flash player is installing or having
	//	its version revved in two ways. First, if dojox.flash detects that
	//	Flash installation needs to occur, it sets dojox.flash.info.installing
	//	to true. Second, you can detect if installation is necessary with the
	//	following callback:
	//
	//|	dojo.connect(dojox.flash, "installing", myInstance, "myCallback");
	//
	//	You can use this callback to delay further actions that might need Flash;
	//	when installation is finished the full page will be refreshed and the
	//	user will be placed back on your page with Flash installed.
	//
	//	-------------------
	//	Todo/Known Issues
	//	-------------------
	//
	//	* On Internet Explorer, after doing a basic install, the page is
	//	not refreshed or does not detect that Flash is now available. The way
	//	to fix this is to create a custom small Flash file that is pointed to
	//	during installation; when it is finished loading, it does a callback
	//	that says that Flash installation is complete on IE, and we can proceed
	//	to initialize the dojox.flash subsystem.
	//	* Things aren't super tested for sending complex objects to Flash
	//	methods, since Dojo Storage only needs strings
	//
	//	Author- Brad Neuberg, http://codinginparadise.org
}

dojox.flash = {
	ready: false,
	url: null,
	
	_visible: true,
	_loadedListeners: [],
	_installingListeners: [],
	
	setSwf: function(/* String */ url, /* boolean? */ visible){
		// summary: Sets the SWF files and versions we are using.
		// url: String
		//	The URL to this Flash file.
		// visible: boolean?
		//	Whether the Flash file is visible or not. If it is not visible we hide
		//	it off the screen. This defaults to true (i.e. the Flash file is
		//	visible).
		this.url = url;
		
		this._visible = true;
		if(visible !== null && visible !== undefined){
			this._visible = visible;
		}
		
		// initialize ourselves
		this._initialize();
	},
	
	addLoadedListener: function(/* Function */ listener){
		// summary:
		//	Adds a listener to know when Flash is finished loading.
		//	Useful if you don't want a dependency on dojo.event.
		// listener: Function
		//	A function that will be called when Flash is done loading.
		
		this._loadedListeners.push(listener);
	},

	addInstallingListener: function(/* Function */ listener){
		// summary:
		//	Adds a listener to know if Flash is being installed.
		//	Useful if you don't want a dependency on dojo.event.
		// listener: Function
		//	A function that will be called if Flash is being
		//	installed
		
		this._installingListeners.push(listener);
	},
	
	loaded: function(){
		// summary: Called back when the Flash subsystem is finished loading.
		// description:
		//	A callback when the Flash subsystem is finished loading and can be
		//	worked with. To be notified when Flash is finished loading, add a
		//  loaded listener:
		//
		//  dojox.flash.addLoadedListener(loadedListener);
	
		dojox.flash.ready = true;
		if(dojox.flash._loadedListeners.length){ // FIXME: redundant if? use forEach?
			for(var i = 0;i < dojox.flash._loadedListeners.length; i++){
				dojox.flash._loadedListeners[i].call(null);
			}
		}
	},
	
	installing: function(){
		// summary: Called if Flash is being installed.
		// description:
		//	A callback to know if Flash is currently being installed or
		//	having its version revved. To be notified if Flash is installing, connect
		//	your callback to this method using the following:
		//
		//	dojo.event.connect(dojox.flash, "installing", myInstance, "myCallback");
		
		if(dojox.flash._installingListeners.length){ // FIXME: redundant if? use forEach?
			for(var i = 0; i < dojox.flash._installingListeners.length; i++){
				dojox.flash._installingListeners[i].call(null);
			}
		}
	},
	
	// Initializes dojox.flash.
	_initialize: function(){
		//console.debug("dojox.flash._initialize");
		// see if we need to rev or install Flash on this platform
		var installer = new dojox.flash.Install();
		dojox.flash.installer = installer;

		if(installer.needed()){
			installer.install();
		}else{
			// write the flash object into the page
			dojox.flash.obj = new dojox.flash.Embed(this._visible);
			dojox.flash.obj.write();
			
			// setup the communicator
			dojox.flash.comm = new dojox.flash.Communicator();
		}
	}
};


dojox.flash.Info = function(){
	// summary: A class that helps us determine whether Flash is available.
	// description:
	//	A class that helps us determine whether Flash is available,
	//	it's major and minor versions, and what Flash version features should
	//	be used for Flash/JavaScript communication. Parts of this code
	//	are adapted from the automatic Flash plugin detection code autogenerated
	//	by the Macromedia Flash 8 authoring environment.
	//
	//	An instance of this class can be accessed on dojox.flash.info after
	//	the page is finished loading.

	this._detectVersion();
}

dojox.flash.Info.prototype = {
	// version: String
	//		The full version string, such as "8r22".
	version: -1,
	
	// versionMajor, versionMinor, versionRevision: String
	//		The major, minor, and revisions of the plugin. For example, if the
	//		plugin is 8r22, then the major version is 8, the minor version is 0,
	//		and the revision is 22.
	versionMajor: -1,
	versionMinor: -1,
	versionRevision: -1,
	
	// capable: Boolean
	//		Whether this platform has Flash already installed.
	capable: false,
	
	// installing: Boolean
	//	Set if we are in the middle of a Flash installation session.
	installing: false,
	
	isVersionOrAbove: function(
							/* int */ reqMajorVer,
							/* int */ reqMinorVer,
							/* int */ reqVer){ /* Boolean */
		// summary:
		//	Asserts that this environment has the given major, minor, and revision
		//	numbers for the Flash player.
		// description:
		//	Asserts that this environment has the given major, minor, and revision
		//	numbers for the Flash player.
		//
		//	Example- To test for Flash Player 7r14:
		//
		//	dojox.flash.info.isVersionOrAbove(7, 0, 14)
		// returns:
		//	Returns true if the player is equal
		//	or above the given version, false otherwise.
		
		// make the revision a decimal (i.e. transform revision 14 into
		// 0.14
		reqVer = parseFloat("." + reqVer);
		
		if(this.versionMajor >= reqMajorVer && this.versionMinor >= reqMinorVer
			 && this.versionRevision >= reqVer){
			return true;
		}else{
			return false;
		}
	},
	
	_detectVersion: function(){
		var versionStr;
		
		// loop backwards through the versions until we find the newest version
		for(var testVersion = 25; testVersion > 0; testVersion--){
			if(dojo.isIE){
				var axo;
				try{
					if(testVersion > 6){
						axo = new ActiveXObject("ShockwaveFlash.ShockwaveFlash."
																		+ testVersion);
					}else{
						axo = new ActiveXObject("ShockwaveFlash.ShockwaveFlash");
					}
					if(typeof axo == "object"){
						if(testVersion == 6){
							axo.AllowScriptAccess = "always";
						}
						versionStr = axo.GetVariable("$version");
					}
				}catch(e){
					continue;
				}
			}else{
				versionStr = this._JSFlashInfo(testVersion);
			}
				
			if(versionStr == -1 ){
				this.capable = false;
				return;
			}else if(versionStr != 0){
				var versionArray;
				if(dojo.isIE){
					var tempArray = versionStr.split(" ");
					var tempString = tempArray[1];
					versionArray = tempString.split(",");
				}else{
					versionArray = versionStr.split(".");
				}
					
				this.versionMajor = versionArray[0];
				this.versionMinor = versionArray[1];
				this.versionRevision = versionArray[2];
				
				// 7.0r24 == 7.24
				var versionString = this.versionMajor + "." + this.versionRevision;
				this.version = parseFloat(versionString);
				
				this.capable = true;
				
				break;
			}
		}
	},
	 
	// JavaScript helper required to detect Flash Player PlugIn version
	// information. Internet Explorer uses a corresponding Visual Basic
	// version to interact with the Flash ActiveX control.
	_JSFlashInfo: function(testVersion){
		// NS/Opera version >= 3 check for Flash plugin in plugin array
		if(navigator.plugins != null && navigator.plugins.length > 0){
			if(navigator.plugins["Shockwave Flash 2.0"] ||
				 navigator.plugins["Shockwave Flash"]){
				var swVer2 = navigator.plugins["Shockwave Flash 2.0"] ? " 2.0" : "";
				var flashDescription = navigator.plugins["Shockwave Flash" + swVer2].description;
				var descArray = flashDescription.split(" ");
				var tempArrayMajor = descArray[2].split(".");
				var versionMajor = tempArrayMajor[0];
				var versionMinor = tempArrayMajor[1];
				var tempArrayMinor = (descArray[3] || descArray[4]).split("r");
				var versionRevision = tempArrayMinor[1] > 0 ? tempArrayMinor[1] : 0;
				var version = versionMajor + "." + versionMinor + "." + versionRevision;
											
				return version;
			}
		}
		
		return -1;
	}
};

dojox.flash.Embed = function(visible){
	// summary: A class that is used to write out the Flash object into the page.
	// description:
	//	Writes out the necessary tags to embed a Flash file into the page. Note that
	//	these tags are written out as the page is loaded using document.write, so
	//	you must call this class before the page has finished loading.
	
	this._visible = visible;
}

dojox.flash.Embed.prototype = {
	// width: int
	//	The width of this Flash applet. The default is the minimal width
	//	necessary to show the Flash settings dialog. Current value is
	//  215 pixels.
	width: 215,
	
	// height: int
	//	The height of this Flash applet. The default is the minimal height
	//	necessary to show the Flash settings dialog. Current value is
	// 138 pixels.
	height: 138,
	
	// id: String
	// 	The id of the Flash object. Current value is 'flashObject'.
	id: "flashObject",
	
	// Controls whether this is a visible Flash applet or not.
	_visible: true,

	protocol: function(){
		switch(window.location.protocol){
			case "https:":
				return "https";
				break;
			default:
				return "http";
				break;
		}
	},
	
	write: function(/* Boolean? */ doExpressInstall){
		// summary: Writes the Flash into the page.
		// description:
		//	This must be called before the page
		//	is finished loading.
		// doExpressInstall: Boolean
		//	Whether to write out Express Install
		//	information. Optional value; defaults to false.
		
		// figure out the SWF file to get and how to write out the correct HTML
		// for this Flash version
		var objectHTML;
		var swfloc = dojox.flash.url;
		var swflocObject = swfloc;
		var swflocEmbed = swfloc;
		var dojoUrl = dojo.baseUrl;
		var xdomainBase = document.location.protocol + '//' + document.location.host;
		if(doExpressInstall){
			// the location to redirect to after installing
			var redirectURL = escape(window.location);
			document.title = document.title.slice(0, 47) + " - Flash Player Installation";
			var docTitle = escape(document.title);
			swflocObject += "?MMredirectURL=" + redirectURL
			                + "&MMplayerType=ActiveX"
			                + "&MMdoctitle=" + docTitle
			                + "&baseUrl=" + escape(dojoUrl)
			                + "&xdomain=" + escape(xdomainBase);
			swflocEmbed += "?MMredirectURL=" + redirectURL
			                + "&MMplayerType=PlugIn"
			                + "&baseUrl=" + escape(dojoUrl)
			                + "&xdomain=" + escape(xdomainBase);
		}else{
			// IE/Flash has an evil bug that shows up some time: if we load the
			// Flash and it isn't in the cache, ExternalInterface works fine --
			// however, the second time when its loaded from the cache a timing
			// bug can keep ExternalInterface from working. The trick below
			// simply invalidates the Flash object in the cache all the time to
			// keep it loading fresh. -- Brad Neuberg
			swflocObject += "?cachebust=" + new Date().getTime();
			swflocObject += "&baseUrl=" + escape(dojoUrl);
			swflocObject += "&xdomain=" + escape(xdomainBase);
		}

		if(swflocEmbed.indexOf("?") == -1){
			swflocEmbed += '?baseUrl='+escape(dojoUrl);
		}else{
		  swflocEmbed += '&baseUrl='+escape(dojoUrl);
		}
		swflocEmbed += '&xdomain='+escape(xdomainBase);
		
		objectHTML =
			'<object classid="clsid:d27cdb6e-ae6d-11cf-96b8-444553540000" '
			  + 'codebase="'
				+ this.protocol()
				+ '://fpdownload.macromedia.com/pub/shockwave/cabs/flash/'
				+ 'swflash.cab#version=8,0,0,0"\n '
			  + 'width="' + this.width + '"\n '
			  + 'height="' + this.height + '"\n '
			  + 'id="' + this.id + '"\n '
			  + 'name="' + this.id + '"\n '
			  + 'align="middle">\n '
			  + '<param name="allowScriptAccess" value="always"></param>\n '
			  + '<param name="movie" value="' + swflocObject + '"></param>\n '
			  + '<param name="quality" value="high"></param>\n '
			  + '<param name="bgcolor" value="#ffffff"></param>\n '
			  + '<embed src="' + swflocEmbed + '" '
			  	  + 'quality="high" '
				  + 'bgcolor="#ffffff" '
				  + 'width="' + this.width + '" '
				  + 'height="' + this.height + '" '
				  + 'id="' + this.id + 'Embed' + '" '
				  + 'name="' + this.id + '" '
				  + 'swLiveConnect="true" '
				  + 'align="middle" '
				  + 'allowScriptAccess="always" '
				  + 'type="application/x-shockwave-flash" '
				  + 'pluginspage="'
				  + this.protocol()
				  +'://www.macromedia.com/go/getflashplayer" '
				  + '></embed>\n'
			+ '</object>\n';
					
		// using same mechanism on all browsers now to write out
		// Flash object into page

		// document.write no longer works correctly due to Eolas patent workaround
		// in IE; nothing happens (i.e. object doesn't go into page if we use it)
		dojo.connect(dojo, "loaded", dojo.hitch(this, function(){
			// Prevent putting duplicate SWFs onto the page
			var containerId = this.id + "Container";
			if(dojo.byId(containerId)){
				return;
			}
			
			var div = document.createElement("div");
			div.id = this.id + "Container";
			
			div.style.width = this.width + "px";
			div.style.height = this.height + "px";
			if(!this._visible){
				div.style.position = "absolute";
				div.style.zIndex = "10000";
				div.style.top = "-1000px";
			}

			div.innerHTML = objectHTML;

			var body = document.getElementsByTagName("body");
			if(!body || !body.length){
				throw new Error("No body tag for this page");
			}
			body = body[0];
			body.appendChild(div);
		}));
	},
	
	get: function(){ /* Object */
		// summary: Gets the Flash object DOM node.

		if(dojo.isIE || dojo.isWebKit){
			//TODO: should this really be the else?
			return dojo.byId(this.id);
		}else{
			// different IDs on OBJECT and EMBED tags or
			// else Firefox will return wrong one and
			// communication won't work;
			// also, document.getElementById() returns a
			// plugin but ExternalInterface calls don't
			// work on it so we have to use
			// document[id] instead
			return document[this.id + "Embed"];
		}
	},
	
	setVisible: function(/* Boolean */ visible){
		//console.debug("setVisible, visible="+visible);
		
		// summary: Sets the visibility of this Flash object.
		var container = dojo.byId(this.id + "Container");
		if(visible){
			container.style.position = "absolute"; // IE -- Brad Neuberg
			container.style.visibility = "visible";
		}else{
			container.style.position = "absolute";
			container.style.y = "-1000px";
			container.style.visibility = "hidden";
		}
	},
	
	center: function(){
		// summary: Centers the flash applet on the page.
		
		var elementWidth = this.width;
		var elementHeight = this.height;

		var viewport = dojo.window.getBox();

		// compute the centered position
		var x = viewport.l + (viewport.w - elementWidth) / 2;
		var y = viewport.t + (viewport.h - elementHeight) / 2;
		
		// set the centered position
		var container = dojo.byId(this.id + "Container");
		container.style.top = y + "px";
		container.style.left = x + "px";
	}
};


dojox.flash.Communicator = function(){
	// summary:
	//	A class that is used to communicate between Flash and JavaScript.
	// description:
	//	This class helps mediate Flash and JavaScript communication. Internally
	//	it uses Flash 8's ExternalInterface API, but adds functionality to fix
	//	various encoding bugs that ExternalInterface has.
}

dojox.flash.Communicator.prototype = {
	// Registers the existence of a Flash method that we can call with
	// JavaScript, using Flash 8's ExternalInterface.
	_addExternalInterfaceCallback: function(methodName){
		//console.debug("addExternalInterfaceCallback, methodName="+methodName);
		var wrapperCall = dojo.hitch(this, function(){
			// some browsers don't like us changing values in the 'arguments' array, so
			// make a fresh copy of it
			var methodArgs = new Array(arguments.length);
			for(var i = 0; i < arguments.length; i++){
				methodArgs[i] = this._encodeData(arguments[i]);
			}
			
			var results = this._execFlash(methodName, methodArgs);
			results = this._decodeData(results);
			
			return results;
		});
		
		this[methodName] = wrapperCall;
	},
	
	// Encodes our data to get around ExternalInterface bugs that are still
	// present even in Flash 9.
	_encodeData: function(data){
		//console.debug("encodeData, data=", data);
		if(!data || typeof data != "string"){
			return data;
		}
		
		// transforming \ into \\ doesn't work; just use a custom encoding
		data = data.replace("\\", "&custom_backslash;");

		// also use custom encoding for the null character to avoid problems
		data = data.replace(/\0/g, "&custom_null;");

		return data;
	},
	
	// Decodes our data to get around ExternalInterface bugs that are still
	// present even in Flash 9.
	_decodeData: function(data){
		//console.debug("decodeData, data=", data);
		// wierdly enough, Flash sometimes returns the result as an
		// 'object' that is actually an array, rather than as a String;
		// detect this by looking for a length property; for IE
		// we also make sure that we aren't dealing with a typeof string
		// since string objects have length property there
		if(data && data.length && typeof data != "string"){
			data = data[0];
		}
		
		if(!data || typeof data != "string"){
			return data;
		}
		
		// needed for IE; \0 is the NULL character
		data = data.replace(/\&custom_null\;/g, "\0");
	
		// certain XMLish characters break Flash's wire serialization for
		// ExternalInterface; these are encoded on the
		// DojoExternalInterface side into a custom encoding, rather than
		// the standard entity encoding, because otherwise we won't be able to
		// differentiate between our own encoding and any entity characters
		// that are being used in the string itself
		data = data.replace(/\&custom_lt\;/g, "<")
			.replace(/\&custom_gt\;/g, ">")
			.replace(/\&custom_backslash\;/g, '\\');
		
		return data;
	},
	
	// Executes a Flash method; called from the JavaScript wrapper proxy we
	// create on dojox.flash.comm.
	_execFlash: function(methodName, methodArgs){
		//console.debug("execFlash, methodName="+methodName+", methodArgs=", methodArgs);
		var plugin = dojox.flash.obj.get();
		methodArgs = (methodArgs) ? methodArgs : [];
		
		// encode arguments that are strings
		for(var i = 0; i < methodArgs; i++){
			if(typeof methodArgs[i] == "string"){
				methodArgs[i] = this._encodeData(methodArgs[i]);
			}
		}

		// we use this gnarly hack below instead of
		// plugin[methodName] for two reasons:
		// 1) plugin[methodName] has no call() method, which
		// means we can't pass in multiple arguments dynamically
		// to a Flash method -- we can only have one
		// 2) On IE plugin[methodName] returns undefined --
		// plugin[methodName] used to work on IE when we
		// used document.write but doesn't now that
		// we use dynamic DOM insertion of the Flash object
		// -- Brad Neuberg
		var flashExec = function(){
			return eval(plugin.CallFunction(
						 "<invoke name=\"" + methodName
						+ "\" returntype=\"javascript\">"
						+ __flash__argumentsToXML(methodArgs, 0)
						+ "</invoke>"));
		};
		var results = flashExec.call(methodArgs);
		
		if(typeof results == "string"){
			results = this._decodeData(results);
		}
			
		return results;
	}
}

// FIXME: dojo.declare()-ify this

// TODO: I did not test the Install code when I refactored Dojo Flash from 0.4 to
// 1.0, so am not sure if it works. If Flash is not present I now prefer
// that Gears is installed instead of Flash because GearsStorageProvider is
// much easier to work with than Flash's hacky ExternalInteface.
// -- Brad Neuberg
dojox.flash.Install = function(){
	// summary: Helps install Flash plugin if needed.
	// description:
	//		Figures out the best way to automatically install the Flash plugin
	//		for this browser and platform. Also determines if installation or
	//		revving of the current plugin is needed on this platform.
}

dojox.flash.Install.prototype = {
	needed: function(){ /* Boolean */
		// summary:
		//		Determines if installation or revving of the current plugin is
		//		needed.
	
		// do we even have flash?
		if(!dojox.flash.info.capable){
			return true;
		}

		// Must have ExternalInterface which came in Flash 8
		if(!dojox.flash.info.isVersionOrAbove(8, 0, 0)){
			return true;
		}

		// otherwise we don't need installation
		return false;
	},

	install: function(){
		// summary: Performs installation or revving of the Flash plugin.
		var installObj;
	
		// indicate that we are installing
		dojox.flash.info.installing = true;
		dojox.flash.installing();
		
		if(dojox.flash.info.capable == false){ // we have no Flash at all
			// write out a simple Flash object to force the browser to prompt
			// the user to install things
			installObj = new dojox.flash.Embed(false);
			installObj.write(); // write out HTML for Flash
		}else if(dojox.flash.info.isVersionOrAbove(6, 0, 65)){ // Express Install
			installObj = new dojox.flash.Embed(false);
			installObj.write(true); // write out HTML for Flash 8 version+
			installObj.setVisible(true);
			installObj.center();
		}else{ // older Flash install than version 6r65
			alert("This content requires a more recent version of the Macromedia "
						+" Flash Player.");
			window.location.href = + dojox.flash.Embed.protocol() +
						"://www.macromedia.com/go/getflashplayer";
		}
	},
	
	// Called when the Express Install is either finished, failed, or was
	// rejected by the user.
	_onInstallStatus: function(msg){
		if (msg == "Download.Complete"){
			// Installation is complete.
			dojox.flash._initialize();
		}else if(msg == "Download.Cancelled"){
			alert("This content requires a more recent version of the Macromedia "
						+" Flash Player.");
			window.location.href = dojox.flash.Embed.protocol() +
						"://www.macromedia.com/go/getflashplayer";
		}else if (msg == "Download.Failed"){
			// The end user failed to download the installer due to a network failure
			alert("There was an error downloading the Flash Player update. "
						+ "Please try again later, or visit macromedia.com to download "
						+ "the latest version of the Flash plugin.");
		}
	}
}

// find out if Flash is installed
dojox.flash.info = new dojox.flash.Info();

// vim:ts=4:noet:tw=0:
