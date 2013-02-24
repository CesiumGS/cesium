define(['dojo'],function(dojo){

	dojo.experimental("dojox.av.FLVideo");

	return dojo.declare("dojox.av._Media", null, {
		// summary:
		//		Used as a mixin for dojox and AIR media
		// description:
		//		Calculates the current status of the playing media and fires
		//		the appropriate events.

		mediaUrl:"",

		// initialVolume: Float?
		//		The initial volume setting of the player. Acccepts between 0 and 1.
		initialVolume:1,

		// autoPlay:Boolean?
		//		Whether the video automatically plays on load or not.
		autoPlay: false,

		// bufferTime: Number?
		//		Time in milliseconds that the video should be loaded before it will
		//		play. May pause and resume to build up buffer. Prevents stuttering.
		//
		//		Note: Older FLVs, without a duration, cannot be buffered.
		bufferTime: 2000,

		// minBufferTime: Number
		//		Time in milliseconds between the playhead time and loaded time that
		//		will trigger the buffer. When buffer is triggered, video will pause
		//		until the bufferTime amount is buffered.
		//		Note: Should be a small number, greater than zero.
		minBufferTime:300,

		// updateTime: Number
		//		How often, in milliseconds to get an update of the video position.
		updateTime: 100,

		// id: String?
		//		The id of this widget and the id of the SWF movie.
		id:"",

		// isDebug: Boolean?
		//		Setting to true tells the SWF to output log messages to Firebug.
		isDebug: false,

		// percentDownloaded: read-only-Number
		//		The percentage the media has downloaded; from 0-100
		percentDownloaded:0,

		// _flashObject: read-only-Object
		//	The dojox.embed object
		_flashObject:null,

		// flashMedia: read-only-SWF
		//		The SWF object. Methods are passed to this.
		flashMedia:null,

		// allowScriptAccess: String
		//		Whether the SWF can access the container JS
		allowScriptAccess:"always",

		// allowNetworking: String
		//		Whether SWF is restricted to a domain
		allowNetworking: "all",

		// wmode: String
		//		The render type of the SWF
		wmode: "transparent",

		// allowFullScreen: Boolean
		//		Whether to allow the SWF to go to fullscreen
		allowFullScreen:true,
	
		_initStatus: function(){
			// summary:
			//		Connect mediaStatus to the media.
			//
			this.status = "ready";
			this._positionHandle = dojo.connect(this, "onPosition", this, "_figureStatus");
	
		},
	
		//  ==============  //
		//  Player Getters  //
		//  ==============  //
	
		getTime: function(){
			// summary:
			//		Returns the current time of the video

			//		Note:
			//		Consider the onPosition event, which returns
			//		the time at a set interval. Too many trips to
			//		the SWF could impact performance.
			return this.flashMedia.getTime(); // Float
		},
	
		//  =============  //
		//  Player Events  //
		//  =============  //
	
		onLoad: function(/* SWF */ mov){
			// summary:
			//		Fired when the SWF player has loaded
			//		NOT when the video has loaded
		},
	
		onDownloaded: function(/* Number */percent){
			// summary:
			//		Fires the amount of that the media has been
			//		downloaded. Number, 0-100
		},
	
		onClick: function(/* Object */ evt){
			// summary:
			//		Fires when the player is clicked
			//		Could be used to toggle play/pause, or
			//		do an external activity, like opening a new
			//		window.

			// TODO: Return x/y of click
		},
	
		onSwfSized: function(/* Object */ data){
			// summary:
			//		Fired on SWF resize, or when its
			//		toggled between fullscreen.
		},
	
		onMetaData: function(/* Object */ data, /* Object */ evt){
			// summary:
			//		The video properties. Width, height, duration, etc.

			// NOTE: 	if data is empty, this is an older FLV with no meta data.
			//			Duration cannot be determined. In original FLVs, duration
			//			could only be obtained with Flash Media Server.
			// NOTE: 	Older FLVs can still return width and height
			//			and will do so on a second event call

			console.warn("onMeta", data)
			this.duration = data.duration;
		},
	
		onPosition: function(/* Float */ time){
			// summary:
			//		The position of the playhead in seconds
		},
	
		onStart: function(/* Object */ data){
			// summary:
			//		Fires when video starts
			//		Good for setting the play button to pause
			//		during an autoPlay for example
		},
	
		onPlay: function(/* Object */ data){
			// summary:
			//		Fires when video starts and resumes
		},
	
		onPause: function(/* Object */ data){
			// summary:
			//		Fires when the pause button is clicked
		},
	
		onEnd: function(/* Object */ data){
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
	
		onBuffer: function(/* Boolean */ isBuffering){
			// summary:
			//		Fires a boolean to tell if media
			//		is paused for buffering or if buffering
			//		has finished
			this.isBuffering = isBuffering;
		},
	
		onError: function(/* Object */ data, /* String */ url){
			// summary:
			//		Fired when the player encounters an error
			// example:
			//		| console.warn("ERROR-"+data.type.toUpperCase()+":",
			//		|		data.info.code, " - URL:", url);
			console.warn("ERROR-"+data.type.toUpperCase()+":", data.info.code, " - URL:", url);
		},
	
		onStatus: function(/* Object */data){
			// summary:
			//		Simple status
		},
	
		onPlayerStatus: function(/* Object */data){
			// summary:
			//		The status of the video from the SWF
			//		playing, stopped, bufering, etc.
		},
	
		onResize: function(){
	
		},
	
		_figureStatus: function(){
			// summary:
			//		Calculate media status, based on playhead movement, and
			//		onStop and onStart events

			// TODO:
			//		Figure in real status from the media for more accurate results.

			var pos = this.getTime();
			//console.log(pos, this.duration,  (pos>this.duration-.5), (this.duration && pos>this.duration-.5))
	
			if(this.status=="stopping"){
				// stop was fired, need to fake pos==0
				this.status = "stopped";
				this.onStop(this._eventFactory());
	
			}else if(this.status=="ending" && pos==this._prevPos){
				this.status = "ended";
				this.onEnd(this._eventFactory());
	
			}else if(this.duration && pos>this.duration-.5){
				this.status="ending"
	
			}else if(pos===0 ){//|| this.status == "stopped"
				if(this.status == "ready"){
					//never played
				}else{
					//stopped
					this.status = "stopped";
					if(this._prevStatus != "stopped"){
						this.onStop(this._eventFactory());
					}
				}
	
			}else{
				// pos > 0
				if(this.status == "ready"){
					//started
					this.status = "started";
					this.onStart(this._eventFactory());
					this.onPlay(this._eventFactory());
	
				}else if(this.isBuffering){
					this.status = "buffering";
	
				}else if(this.status == "started" || (this.status == "playing" &&  pos != this._prevPos)){
					this.status = "playing";
					//this.onPosition(this._eventFactory());
	
				}else if(!this.isStopped && this.status == "playing" && pos == this._prevPos){
					this.status = "paused";
					console.warn("pause", pos, this._prevPos)
					if(this.status != this._prevStatus){
						this.onPause(this._eventFactory());
					}
	
				}else if((this.status == "paused" ||this.status == "stopped") && pos != this._prevPos){
					this.status = "started";
					this.onPlay(this._eventFactory());
				}
			}
	
			this._prevPos = pos;
			this._prevStatus = this.status;
			this.onStatus(this.status);
	
	
		},
	
		_eventFactory: function(){
			// summary:
			//		Creates a generic event object.
			//
			var evt = {
				//position:this._channel.position,
				//seconds:this.toSeconds(this._channel.position*.001),
				//percentPlayed:this._getPercent(),
				status:this.status
			};
			return evt; // Object
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

			console.log("  url:", _url);
	
			if(_url && (_url.toLowerCase().indexOf("http")<0 || _url.indexOf("/") == 0)){
				//
				// Appears to be a relative path. Attempt to  convert it to absolute,
				// so it will better target the SWF.
				var loc = window.location.href.split("/");
				loc.pop();
	
				loc = loc.join("/")+"/";
				console.log("  loc:", loc);
				_url = loc+_url;
			}
			return _url;
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
	
		}
	});
});
