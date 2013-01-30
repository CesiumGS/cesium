define(["dojo/_base/lang","../_base", "dojo/_base/config", "dojo/_base/window", "dojo/on", "dojo/touch"
], function(lang, dxa, config, window, on, touch){

	// window startup data
	return (dxa.plugins.touchPress = new (function(){
		if(config["showTouchesDetails"] !== undefined && !config["showTouchesDetails"]){
			this.showTouchesDetails = false;			
		}else{
			this.showTouchesDetails = true;
		}
		this.targetProps = config["targetProps"] || ["id","className","nodeName", "localName","href", "spellcheck", "lang"];
		this.textContentMaxChars = config["textContentMaxChars"] || 50;

		this.addData = lang.hitch(dxa, "addData", "touch.press");
		this.onTouchPress = function(e){
			this.addData(this.trimEvent(e));
		};

		this.addDataRelease = lang.hitch(dxa, "addData", "touch.release");
		this.onTouchRelease = function(e){
			this.addDataRelease(this.trimEvent(e));
		};

		on(window.doc, touch.press, lang.hitch(this, "onTouchPress"));
		on(window.doc, touch.release, lang.hitch(this, "onTouchRelease"));

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
		

		this.trimEvent = function(e){
			var t = {};
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
													var val = e[i][j][s];
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
						t[i] = e[i];
						break;
				}
			}
			return t;
		};
	})());
});
