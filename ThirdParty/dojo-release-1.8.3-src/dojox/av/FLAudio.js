define(['dojo', 'dojox/embed/Flash', 'dojox/timing/doLater'],function(dojo, dijit){

dojo.experimental("dojox.av.FLVideo");

return dojo.declare("dojox.av.FLAudio", null, {

	// summary:
	//		Play MP3 files through the Flash SWF built in the
	//		DEFT project.
	// description:
	//		This class is brand new, so there is a lot of
	//		functionality not yet available. The initial
	//		purpose is for playing "event" sounds like button
	//		clicks, and for loading and controlling multiple
	//		sounds at once. As of yet, streaming is not supported
	//		and polling the sounds for events during playback
	//		may still be missing information. Markup is not
	//		supported, as it may not be needed.
	//
	//		TODO:
	//		Streaming, playback events, crossdomain, CDN support,
	//		(alternate SWF location), global volume, ID3 tag,
	//		factor out doLater, onLoadStatus needs work,
	//		play(position) / seek()
	//
	// example:
	//		|	new dojox.av.FLAudio({
	//		|		initialVolume:.7,
	//		|		initialPan:0,
	//		|		autoPlay:false
	//		|	});

	// id: String?
	//		The id of this widget and the id of the SWF movie.
	id:"",

	// initialVolume: Number
	//		From 0-1
	//		Sets volume for all files unless changed with doPlay
	//		or setVolume
	initialVolume: 0.7,

	// initialPan: Number
	//		From -1 to 1 (-1 is left, 1 is right, 0 is middle)
	//		Sets pan for all files unless changed with play
	//		or setPan
	initialPan: 0,

	// autoPlay: Boolean
	//		If true, all files will play upon load. If false,
	//		they load and wait for doPlay() command.

	// isDebug: Boolean?
	//		Setting to true tells the SWF to output log messages to Firebug.
	isDebug: false,

	// statusInterval: Number
	//		How often in milliseconds that the status of the
	//		player is checked - both load and play
	statusInterval:200,

	// _swfPath: Uri
	//		The path to the video player SWF resource
	_swfPath: dojo.moduleUrl("dojox.av", "resources/audio.swf"),

	// allowScriptAccess: String
	//		Whether the SWF can access the container JS
	allowScriptAccess:"always",

	// allowNetworking: String
	//		Whether SWF is restricted to a domain
	allowNetworking: "all",

	constructor: function(/*Object*/options){

		// Provide this function for the SWF to ensure that the it is playing
		// in HTML.
		dojo.global.swfIsInHTML = function(){ return true; }

		dojo.mixin(this, options || {});
		if(!this.id){ this.id = "flaudio_"+new Date().getTime(); }
		this.domNode = dojo.doc.createElement("div");
		dojo.style(this.domNode, {
			position:"relative",
			width:"1px",
			height:"1px",
			top:"1px",
			left:"1px"
		});
		dojo.body().appendChild(this.domNode);
		this.init();
	},

	init: function(){
		// summary:
		//		Initialize the media.

		this._subs = [];
		this.initialVolume = this._normalizeVolume(this.initialVolume);

		var args = {
			path:this._swfPath,
			width:"1px",
			height:"1px",
			minimumVersion:9, // this may need to be 10, not sure
			expressInstall:true,
			params:{
				wmode:"transparent",
				allowScriptAccess:this.allowScriptAccess,
				allowNetworking:this.allowNetworking
			},
			// only pass in simple variables - no deep objects
			vars:{
				id:this.id,
				autoPlay:this.autoPlay,
				initialVolume:this.initialVolume,
				initialPan:this.initialPan,
				statusInterval:this.statusInterval,
				isDebug:this.isDebug
			}
		};

		this._sub("mediaError",    "onError");
		this._sub("filesProgress", "onLoadStatus");
		this._sub("filesAllLoaded", "onAllLoaded");
		this._sub("mediaPosition", "onPlayStatus");
		this._sub("mediaEnd", "onComplete");
		this._sub("mediaMeta",     "onID3");

		this._flashObject = new dojox.embed.Flash(args, this.domNode);
		this._flashObject.onError = function(err){
			console.warn("Flash Error:", err);
		};
		this._flashObject.onLoad = dojo.hitch(this, function(mov){
			this.flashMedia = mov;
			this.isPlaying = this.autoPlay;
			this.isStopped = !this.autoPlay;
			this.onLoad(this.flashMedia);
		});
	},

	//  ==============  //
	//  Loading Files   //
	//  ==============  //

	load: function(/*Object*/options){
		// summary:
		//		Adds a media object to the playlist
		//		***This can be called repeatedly to add multiple items.
		// options: Object
		//		- url: String:
		//			(required) path to MP3 media
		//			url must be absolute or relative to SWF,
		//			not dojo or the html. An effort will be made
		//			to fix incorrect paths.
		//		- id: String:
		//			(optional) an identifier to later determine
		//			which media to control.
		// returns:
		//		The normalized url, which can be used to identify the
		//		audio.

		if(dojox.timing.doLater(this.flashMedia, this)){ return false; }
		if(!options.url){
			throw new Error("An url is required for loading media");
		}else{
			options.url = this._normalizeUrl(options.url);
		}
		this.flashMedia.load(options);

		return options.url; // String
	},

	//  =============================  //
	//  Methods to control the sound   //
	//  =============================  //

	doPlay: function(/*Object*/options){
		// summary:
		//		Tell media to play, based on
		//		the options passed.
		// options: Object
		//		- volume: Number:
		//			Sets the volume
		//		- pan: Number:
		//			Sets left/right pan
		//		- index:Number OR id:String OR url:String:
		//			Choose one of the above to identify
		//			the media you wish to control. id is
		//			set by you. index is the order in which
		//			media was added (zero based)
		//			NOTE: lack of an identifier will default
		//			to first (or only) item.

		//	NOTE: Can't name this method "play()" as it causes
		//			an IE error.
		this.flashMedia.doPlay(options);
	},

	pause: function(/*Object*/options){
		// summary:
		//		Tell media to pause, based on identifier in
		//		the options passed.
		// options: Object
		//		index:Number OR id:String OR url:String.
		//		See doPlay().

		this.flashMedia.pause(options);
	},

	stop: function(/*Object*/options){
		// summary:
		//		Tell media to stop, based on identifier in
		//		the options passed.
		// options:
		//		index:Number OR id:String OR url:String.
		//		See doPlay().

		this.flashMedia.doStop(options);
	},

	setVolume: function(/*Object*/options){
		// summary:
		//		Set media volume, based on identifier in
		//		the options passed.
		// options:
		//		volume: Number
		//		0 to 1
		//		index:Number OR id:String OR url:String.
		//		See doPlay().

		this.flashMedia.setVolume(options);
	},

	setPan: function(/*Object*/options){
		// summary:
		//		Set media pan, based on identifier in
		//		the options passed.
		// options:
		//		- pan:Number (from -1 to 1)
		//		- index:Number OR id:String OR url:String (see doPlay())

		this.flashMedia.setPan(options);
	},

	getVolume: function(/*Object*/options){
		// summary:
		//		Get media volume, based on identifier in
		//		the options passed.
		// options:
		//		index:Number OR id:String OR url:String.
		//		See doPlay().

		return this.flashMedia.getVolume(options);
	},

	getPan: function(/*Object*/options){
		// summary:
		//		Set media pan, based on identifier in
		//		the options passed.
		// options:
		//		index:Number OR id:String OR url:String.
		//		See doPlay().

		return this.flashMedia.getPan(options);
	},

	getPosition: function(/*Object*/options){
		// summary:
		//		Get the current time.
		// options:
		//		index:Number OR id:String OR url:String.
		//		See doPlay().

		return this.flashMedia.getPosition(options);
	},

	//  =============  //
	//  Sound Events   //
	//  =============  //
	onError: function(msg){
		// summary:
		//		stub fired when an error occurs
		console.warn("SWF ERROR:", msg)
	},

	onLoadStatus: function(/*Array*/events){
		// summary:
	},

	onAllLoaded: function(){
		// summary:
		//		stub fired
	},

	onPlayStatus: function(/*Array*/events){
		// summary:
	},

	onComplete: function(/*Array*/events){
		// summary:
		//		Fired at the end of a media file.
	},

	onLoad: function(){
		// summary:
		//		stub fired when SWF is ready
	},
	onID3: function(evt){
		// summary:
		//		Fired when the ID3 data is received.
	},



	destroy: function(){
		// summary:
		//		destroys flash
		if(!this.flashMedia){
			this._cons.push(dojo.connect(this, "onLoad", this, "destroy"));
			return;
		}
		dojo.forEach(this._subs, function(s){
			dojo.unsubscribe(s);
		});
		dojo.forEach(this._cons, function(c){
			dojo.disconnect(c);
		});
		this._flashObject.destroy();
		//dojo._destroyElement(this.flashDiv);
	},



	_sub: function(topic, method){
		// summary:
		//		helper for subscribing to topics
		dojo.subscribe(this.id+"/"+topic, this, method);
	},

	_normalizeVolume: function(vol){
		// summary:
		//		Ensures volume is less than one
		//
		if(vol>1){
			while(vol>1){
				vol*=.1
			}
		}
		return vol;
	},

	_normalizeUrl: function(_url){
		// summary:
		//		Checks that path is relative to HTML file or
		//		converts it to an absolute path.

		if(_url && _url.toLowerCase().indexOf("http")<0){
			//
			// Appears to be a relative path. Attempt to  convert it to absolute,
			// so it will better target the SWF.
			var loc = window.location.href.split("/");
			loc.pop();
			loc = loc.join("/")+"/";

			_url = loc+_url;
		}
		return _url;
	}

});

});
