define(["dojo/_base/lang","../_base", "dojo/_base/window", "dojo/on", "dojo/_base/config", "dojo/touch",
		"dojox/gesture/tap", "dojox/gesture/swipe"

], function(lang, dxa, window, on, config, touch, tap, swipe){

	// window startup data
	return (dxa.plugins.gestureEvents = new (function(){

		// watch for dojox.gesture.swipe, use delay to avoid getting too many
		if(config["watchSwipe"] !== undefined && !config["watchSwipe"]){
			this.watchSwipe = false;			
		}else{
			this.watchSwipe = true;
		}
		this.swipeSampleDelay = config["swipeSampleDelay"] || 1000;
		this.targetProps = config["targetProps"] || ["id","className","localName","href", "spellcheck", "lang", "textContent", "value" ];
		this.textContentMaxChars = config["textContentMaxChars"] || 50;

		this.addDataSwipe = lang.hitch(dxa, "addData", "gesture.swipe");
		this.sampleSwipe = function(e){
			if(!this._rateLimited){
				this.addDataSwipe(this.trimEvent(e));
				this._rateLimited = true;
				setTimeout(lang.hitch(this, function(){
					if(this._rateLimited){
						this.trimEvent(this._lastSwipeEvent);
						delete this._lastSwipeEvent;
						delete this._rateLimited;
					}
				}), this.swipeSampleDelay);
			}
			this._lastSwipeEvent = e;
			return e;
		}
		if(this.watchSwipe){
			on(window.doc, swipe, lang.hitch(this, "sampleSwipe"));
		}
		
		
		// watch for dojox.gesture.tap
		this.addData = lang.hitch(dxa, "addData", "gesture.tap");
		this.onGestureTap = function(e){
			this.addData(this.trimEvent(e));
		}
		on(window.doc, tap, lang.hitch(this, "onGestureTap"));

		// watch for dojox.gesture.tap.doubletap
		this.addDataDoubleTap = lang.hitch(dxa, "addData", "gesture.tap.doubletap");
		this.onGestureDoubleTap = function(e){
			this.addDataDoubleTap(this.trimEvent(e));
		}
		on(window.doc, tap.doubletap, lang.hitch(this, "onGestureDoubleTap"));

		// watch for dojox.gesture.tap.taphold
		this.addDataTapHold = lang.hitch(dxa, "addData", "gesture.tap.taphold");
		this.onGestureTapHold = function(e){
			this.addDataTapHold(this.trimEvent(e));
		}
		on(window.doc, tap.hold, lang.hitch(this, "onGestureTapHold"));
			
		
		this.trimEvent = function(e){
			var t = {};
			for(var i in e){
				switch(i){
					case "target":
						var props = this.targetProps;						
						t[i] = {};
						for(var j = 0;j < props.length;j++){
							if(e[i][props[j]]){
								if(props[j] == "text" || props[j] == "textContent"){
									if((e[i]["localName"] != "HTML") && (e[i]["localName"] != "BODY")){
										t[i][props[j]] = e[i][props[j]].substr(0,this.textContentMaxChars);
									}
								}else{
									t[i][props[j]] = e[i][props[j]];
								}
							}
						}
						break;
					case "clientX":
					case "clientY":
					case "screenX":
					case "screenY":
					case "dx":
					case "dy":
					case "time":
						t[i] = e[i];
						break;
				}
			}
			return t;
		}
	})());
});
