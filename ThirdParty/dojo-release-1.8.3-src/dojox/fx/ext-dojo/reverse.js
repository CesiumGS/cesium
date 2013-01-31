define(["dojo/_base/fx",
		"dojo/fx",
		"dojo/_base/lang",
		"dojo/fx/easing",
		"dojox/fx"],
	function(baseFx, coreFx, lang, easingUtil, dojoxFx){ //

var reverseApi = {
	// summary:
	//		A dojo.Animation extension that enables an easy reversal.
	// description:
	//		To use, simply require dojox.fx.ext-dojo.reverse and a reverse()
	//		method will be added to all dojo.Animations.
	//		It can be used at any time during the animation. It does not
	//		need to be called when it ends. It also reverses the easing -
	//		if dojo.fx.easing.quadIn is used, dojo.fx.easing.quadOut will
	//		be used when animating backwards.

	_reversed: false,
	reverse: function(/*Boolean*/keepPaused, /*Function ? */reverseEase){
		// summary:
		//		The key method added to an animation to enable reversal.
		// keepPaused: Boolean
		//		By default, calling reverse() will play the animation if
		//		it was paused. Pass in true to keep it paused (will have
		//		no effect if reverse is called while animation is playing).
		// reverseEase: Function
		//		A function to use for the reverse easing. This allows for
		//		the possibility of custom eases that are not in the dojo.fx
		//		library.

		var playing = this.status() == "playing";
		this.pause();
		this._reversed = !this._reversed;
		var d = this.duration,
			sofar = d * this._percent,
			togo = d - sofar,
			curr = new Date().valueOf(),
			cp = this.curve._properties,
			p = this.properties,
			nm
		;
		this._endTime = curr + sofar;
		this._startTime = curr - togo;

		if(playing){
			this.gotoPercent(togo / d)
		}
		for(nm in p){
			var tmp = p[nm].start;
			p[nm].start = cp[nm].start = p[nm].end;
			p[nm].end = cp[nm].end = tmp;
		}

		if(this._reversed){
			if(!this.rEase){
				this.fEase = this.easing;
				if(reverseEase){
					this.rEase = reverseEase;
				}else{
					// loop through dojo.fx.easing to find the matching ease
					var de = easingUtil, found, eName;
					for(nm in de){
						if(this.easing == de[nm]){
							// get ease's name
							found = nm; break;
						}
					}

					if(found){
						// find ease's opposite
						if(/InOut/.test(nm) || !/In|Out/i.test(nm)){
							this.rEase = this.easing;
						}else if(/In/.test(nm)){
							eName = nm.replace("In", "Out");
						}else{
							eName = nm.replace("Out", "In");
						}
						if(eName){
							this.rEase = easingUtil[eName];
						}
					}else{
						// default ease, and other's like linear do not have an opposite
						console.info("ease function to reverse not found");
						this.rEase = this.easing;
					}
				}

			}
			this.easing = this.rEase;
		}else{
			this.easing = this.fEase;
		}
		if(!keepPaused && this.status() != "playing"){
			this.play();
		}

		return this;
	}
};
lang.extend( baseFx.Animation, reverseApi);
return baseFx.Animation;
});