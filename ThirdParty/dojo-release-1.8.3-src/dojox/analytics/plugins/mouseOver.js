define(["dojo/_base/lang", "../_base", "dojo/_base/config", "dojo/_base/window", "dojo/on"
], function(lang, dxa, config, window, on){

	return (dxa.plugins.mouseOver = new (function(){
		this.watchMouse = config["watchMouseOver"] || true;
		this.mouseSampleDelay = config["sampleDelay"] || 2500;
		this.addData = lang.hitch(dxa, "addData", "mouseOver");
		this.targetProps = config["targetProps"] || ["id","className","localName","href", "spellcheck", "lang", "textContent", "value" ];
		this.textContentMaxChars = config["textContentMaxChars"] || 50;

		this.toggleWatchMouse = function(){
			if(this._watchingMouse){
				this._watchingMouse.remove();
				delete this._watchingMouse;
				return;
			}
			on(window.doc, "mousemove", lang.hitch(this, "sampleMouse"));
		};

		if(this.watchMouse){
			on(window.doc, "mouseover", lang.hitch(this, "toggleWatchMouse"));
			on(window.doc, "mouseout", lang.hitch(this, "toggleWatchMouse"));
		}

		this.sampleMouse = function(e){
			if(!this._rateLimited){
				this.addData("sample",this.trimMouseEvent(e));
				this._rateLimited = true;
				setTimeout(lang.hitch(this, function(){
					if(this._rateLimited){
						//this.addData("sample", this.trimMouseEvent(this._lastMouseEvent));
						this.trimMouseEvent(this._lastMouseEvent);
						delete this._lastMouseEvent;
						delete this._rateLimited;
					}
				}), this.mouseSampleDelay);
			}
			this._lastMouseEvent = e;
			return e;
		};

		this.trimMouseEvent = function(e){
			var t = {};
			for(var i in e){
				switch(i){
					//case "currentTarget":  //currentTarget caused an error
					case "target":
					//case "originalTarget":
					//case "explicitOriginalTarget":
						var props = this.targetProps;
						t[i] = {};
						//console.log(e, i, e[i]);
						for(var j = 0;j < props.length;j++){
							if((typeof e[i] == "object" || typeof e[i] == "function") && props[j] in e[i]){
								 
								if(props[j] == "text" || props[j] == "textContent"){
									if(e[i]["localName"] && (e[i]["localName"] != "HTML") && (e[i]["localName"] != "BODY")){
										t[i][props[j]] = e[i][props[j]].substr(0,this.textContentMaxChars);
									}
								}else{
									t[i][props[j]] = e[i][props[j]];
								}
							}
						}
						break;
					// clientX, pageX and x are usually the same so no need to show all 3, same for y
					//case "clientX":
					//case "clientY":
					//case "pageX":
					//case "pageY":
					case "screenX":
					case "screenY":
					case "x":
					case "y":
						if(e[i]){
							//console.log("Attempting: " + i);
							var val = e[i];
							//console.log("val: " +  val); console.log(i + "e of i: " + val);
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
