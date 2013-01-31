define(["dojo/_base/lang","../_base", "dojo/_base/config", "dojo/_base/window", "dojo/on"
], function(lang, dxa, config, window, on){

	// window startup data
	return (dxa.plugins.mouseClick = new (function(){
		this.addData = lang.hitch(dxa, "addData", "mouseClick");
		this.targetProps = config["targetProps"] || ["id","className","nodeName", "localName","href", "spellcheck", "lang"];
		this.textContentMaxChars = config["textContentMaxChars"] || 50;

		this.onClick = function(e){
			this.addData(this.trimEvent(e));
		};
		on(window.doc, "click", lang.hitch(this, "onClick"));

		this.trimEvent = function(e){
			var t = {};
			for(var i in e){
				switch(i){
					case "target":
					case "originalTarget":
					case "explicitOriginalTarget":
						//var props = ["id","className","nodeName", "localName","href", "spellcheck", "lang"];
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
					case "pageX":
					case "pageY":
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
