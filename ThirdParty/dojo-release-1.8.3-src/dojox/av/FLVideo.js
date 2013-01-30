define(['dojo', 'dijit', 'dijit/_Widget', 'dojox/embed/Flash', 'dojox/av/_Media'],
function(dojo, dijit, _Widget, Flash, _Media){

dojo.experimental("dojox.av.FLVideo");
dojo.declare("dojox.av.FLVideo", [_Widget, _Media], {

	// summary:
	//		Inserts a Flash FLV video into the HTML page and provides methods
	//		and events for controlling the video. Also plays the H264/M4V codec
	//		with a little trickery: change the '.M4V' extension to '.flv'.
	// example:
	//		markup:
	//		|	<div id="vid" initialVolume=".7",
	//		|		mediaUrl="../resources/Grog.flv"
	//		|		dojoType="dojox.av.FLVideo"></div>
	// example:
	//		programmatic:
	//		|	new dojox.av.FLVideo({
	//		|		initialVolume:.7,
	//		|		mediaUrl:"../resources/Grog.flv"
	//		|	}, "vid");

	// mediaUrl: String
	//		REQUIRED: The Url of the video file that will be played.
	//		NOTE: Must be either an absolute URL or relative to the HTML file.
	//		Relative paths will be converted to absolute paths

	// _swfPath: Uri
	//		The path to the video player SWF resource
	_swfPath: dojo.moduleUrl("dojox.av", "resources/video.swf"),

	constructor: function(/*Object*/options){
		// Provide this function for the SWF to ensure that the it is playing
		// in HTML.
		dojo.global.swfIsInHTML = function(){ return true; }
	},

	postCreate: function(){
		// summary:
		//		Initialize the media.

		this._subs = [];
		this._cons = [];
		this.mediaUrl = this._normalizeUrl(this.mediaUrl);
		this.initialVolume = this._normalizeVolume(this.initialVolume);

		var args = {
			path:this._swfPath,
			width:"100%",
			height:"100%",
			minimumVersion:9,
			expressInstall:true,
			params:{
				allowFullScreen: this.allowFullScreen,
				wmode:this.wmode,
				allowScriptAccess:this.allowScriptAccess,
				allowNetworking:this.allowNetworking
			},
			// only pass in simple variables - no deep objects
			vars:{
				videoUrl:this.mediaUrl,
				id:this.id,
				autoPlay:this.autoPlay,
				volume:this.initialVolume,
				isDebug:this.isDebug
			}
		};

		// Setting up dojo.subscribes that listens to events
		//	from the player
		this._sub("stageClick",  "onClick");
		this._sub("stageSized",  "onSwfSized");
		this._sub("mediaStatus", "onPlayerStatus");
		this._sub("mediaMeta",   "onMetaData");
		this._sub("mediaError",  "onError");
		this._sub("mediaStart",  "onStart");
		this._sub("mediaEnd",    "onEnd");

		this._flashObject = new dojox.embed.Flash(args, this.domNode);
		this._flashObject.onError = function(err){
			console.error("Flash Error:", err);
		};
		this._flashObject.onLoad = dojo.hitch(this, function(mov){
			this.flashMedia = mov;
			this.isPlaying = this.autoPlay;
			this.isStopped = !this.autoPlay;
			this.onLoad(this.flashMedia);
			this._initStatus();
			this._update();
		});
		this.inherited(arguments);
	},

	//  =============================  //
	//  Methods to control the player  //
	//  =============================  //

	play: function(/* String? */newUrl){
		// summary:
		//		Plays the video. If an url is passed in, plays the new link.
		this.isPlaying = true;
		this.isStopped = false;
		this.flashMedia.doPlay(this._normalizeUrl(newUrl));
	},

	pause: function(){
		// summary:
		//		Pauses the video
		this.isPlaying = false;
		this.isStopped = false;
		if(this.onPaused){
			this.onPaused();
		}
		this.flashMedia.pause();
	},

	seek: function(/* Float */ time ){
		// summary:
		//		Goes to the time passed in the argument
		this.flashMedia.seek(time);
	},


	//  =====================  //
	//  Player Getter/Setters  //
	//  =====================  //

	volume: function(/* Float */ vol){
		// summary:
		//		Sets the volume of the video to the time in the
		// vol:
		//		between 0 - 1.
		if(vol){
			if(!this.flashMedia) {
				this.initialVolume = vol;
			}
			this.flashMedia.setVolume(this._normalizeVolume(vol));
		}
		if(!this.flashMedia || !this.flashMedia.doGetVolume) {
			return this.initialVolume;
		}
		return this.flashMedia.getVolume(); // Float
	},

	//  =============  //
	//  Player Events  //
	//  =============  //

	/*=====
	onLoad: function(mov){
		// summary:
		//		Fired when the SWF player has loaded
		//		NOT when the video has loaded
	},

	onDownloaded: function(percent){
		// summary:
		//		Fires the amount of that the media has been
		//		downloaded. Number, 0-100
	},

	onClick: function(evt){
		// summary:
		//		Fires when the player is clicked
		//		Could be used to toggle play/pause, or
		//		do an external activity, like opening a new
		//		window.
	},

	onSwfSized: function(data){
		// summary:
		//		Fired on SWF resize, or when its
		//		toggled between fullscreen.
	},

	onMetaData: function(data, evt){
		// summary:
		//		The video properties. Width, height, duration, etc.
		//
		//		NOTE: if data is empty, this is an older FLV with no meta data.
		//		Duration cannot be determined. In original FLVs, duration
		//		could only be obtained with Flash Media Server.
		//
		//		NOTE: Older FLVs can still return width and height
		//		and will do so on a second event call
	},

	onPosition: function( time){
		// summary:
		//		The position of the playhead in seconds
	},

	onStart: function( data){
		// summary:
		//		Fires when video starts
		//		Good for setting the play button to pause
		//		during an autoPlay for example
	},

	onPlay: function(data){
		// summary:
		//		Fires when video starts and resumes
	},

	onPause: function(data){
		// summary:
		//		Fires when the pause button is clicked
	},

	onEnd: function(data){
		// summary:
		//		Fires when video ends
		//		Could be used to change pause button to play
		//		or show a post video graphic, like YouTube
	},

	onStop: function(){
		// summary:
		//		Fire when the Stop button is clicked
		
		// TODO: 	This is not hooked up yet and shouldn't
		//			fire.
	},

	onBuffer: function(isBuffering){
		// summary:
		//		Fires a boolean to tell if media
		//		is paused for buffering or if buffering
		//		has finished
		this.isBuffering = isBuffering;
	},

	onError: function(data, url){
		// summary:
		//		Fired when the player encounters an error
		// example:
		//		| console.warn("ERROR-"+data.type.toUpperCase()+":",
		//		|		data.info.code, " - URL:", url);
	},

	onStatus: function(data){
		// summary:
		//		Simple status
	},

	onPlayerStatus: function(data){
		// summary:
		//		The status of the video from the SWF
		//		playing, stopped, bufering, etc.
	},

	onResize: function(){
		// summary:
		//		Fired on page resize
	},
	=====*/

	//  ===============  //
	//  Private Methods  //
	//  ===============  //

	_checkBuffer: function(/* Float */time, /* Float */bufferLength){
		// summary:
		//		Checks that there is a proper buffer time between
		//		current playhead time and the amount of data loaded.
		//		Works only on FLVs with a duration (not older). Pauses
		//		the video while continuing download.

		if(this.percentDownloaded == 100){
			if(this.isBuffering){
				this.onBuffer(false);
				this.flashMedia.doPlay();
			}
			return;
		}

		if(!this.isBuffering && bufferLength<.1){
			this.onBuffer(true);
			this.flashMedia.pause();
			return;
		}

		var timePercentLoad = this.percentDownloaded*.01*this.duration;

		// check if start buffer needed
		if(!this.isBuffering && time+this.minBufferTime*.001>timePercentLoad){
			this.onBuffer(true);
			this.flashMedia.pause();

		// check if end buffer needed
		}else if(this.isBuffering && time+this.bufferTime*.001<=timePercentLoad){
			this.onBuffer(false);
			this.flashMedia.doPlay();
		}

	},
	_update: function(){
		// summary:
		//		Helper function to fire onPosition, check download progress,
		//		and check buffer.
		var time = Math.min(this.getTime() || 0, this.duration);

		var dObj = this.flashMedia.getLoaded();
		this.percentDownloaded = Math.ceil(dObj.bytesLoaded/dObj.bytesTotal*100);
		this.onDownloaded(this.percentDownloaded);
		this.onPosition(time);
		if(this.duration){
			this._checkBuffer(time, dObj.buffer);
		}
		// FIXME: need to remove this on destroy
		this._updateHandle = setTimeout(dojo.hitch(this, "_update"), this.updateTime);
	},

	destroy: function(){
		clearTimeout(this._updateHandle);
		dojo.disconnect(this._positionHandle);
		this.inherited(arguments);
	}
});

return dojox.av.FLVideo;
});
