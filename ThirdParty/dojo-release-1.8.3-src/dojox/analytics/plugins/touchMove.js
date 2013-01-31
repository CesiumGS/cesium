define(["dojo/_base/lang", "../_base", "dojo/_base/config", "dojo/_base/window", "dojo/on", "dojo/touch"
], function(lang, dxa, config, window, on, touch){


	return (dxa.plugins.touchMove = new (function(){
		if(config["watchTouch"] !== undefined && !config["watchTouch"]){
			this.watchTouch = false;			
		}else{
			this.watchTouch = true;
		}
		if(config["showTouchesDetails"] !== undefined && !config["showTouchesDetails"]){
			this.showTouchesDetails = false;			
		}else{
			this.showTouchesDetails = true;
		}
		this.touchSampleDelay = config["touchSampleDelay"] || 1000;
		this.targetProps = config["targetProps"] || ["id","className","localName","href", "spellcheck", "lang", "textContent", "value" ];
		this.textContentMaxChars = config["textContentMaxChars"] || 50;
		this.addData = lang.hitch(dxa, "addData", "touch.move");
		
		this.sampleTouchMove = function(e){
			if(!this._rateLimited){
				this.addData("sample",this.trimTouchEvent(e));
				this._rateLimited = true;
				setTimeout(lang.hitch(this, function(){
					if(this._rateLimited){
						this.trimTouchEvent(this._lastTouchEvent);
						delete this._lastTouchEvent;
						delete this._rateLimited;
					}
				}), this.touchSampleDelay);
			}
			this._lastTouchEvent = e;
			return e;
		};

		on(window.doc, touch.move, lang.hitch(this, "sampleTouchMove"));

		this.handleTarget = function(t, target, i){
			var props = this.targetProps;
			t[i] = {};
			for(var j = 0;j < props.length;j++){
				if((typeof target == "object" || typeof target == "function") && props[j] in target){
								 
					if(props[j] == "text" || props[j] == "textContent"){
						if(target["localName"] && (target["localName"] != "HTML") && (target["localName"] != "BODY")){
							t[i][props[j]] = target[props[j]].substr(0,this.textContentMaxChars);
						}
					}else{
						t[i][props[j]] = target[props[j]];
					}
				}
			}
		};
		
		this.trimTouchEvent = function(e){
			var t = {};
			var val;
			for(var i in e){
				switch(i){
					case "target":
						this.handleTarget(t, e[i], i)
						break;
						case "touches":
							if(e[i].length !== 0){
								t["touches.length"] = e[i].length;
							}
							if(this.showTouchesDetails){
								for(var j = 0;j < e[i].length;j++){
									for(var s in e[i][j]){
										switch(s){
											case "target":
												this.handleTarget(t, e[i][j].target, "touches["+j+"][target]");
											break;	
											case "clientX":
											case "clientY":
											case "screenX":
											case "screenY":
												if(e[i][j]){
													val = e[i][j][s];
													t["touches["+j+"]["+s+"]"] = val + '';
												}
											break;
											default:
												//console.log("Skipping: ", i);
											break;
										}
									}
								}
							}
						break;
					case "clientX":
					case "clientY":
					case "screenX":
					case "screenY":
						if(e[i]){
							val = e[i];
							t[i] = val + '';
						}
						break;
					default:
						//console.log("Skipping: ", i);
						break;
				}
			}
			return t;
		};
	})());
});
