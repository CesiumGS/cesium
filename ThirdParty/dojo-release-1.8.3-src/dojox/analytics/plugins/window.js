define(["dojo/_base/lang","../_base", "dojo/ready", "dojo/_base/config", "dojo/aspect"
], function(lang, dxa, ready, config, aspect){

	// window startup data
	return (dxa.plugins.window = new (function(){
		this.addData = lang.hitch(dxa, "addData", "window");
		this.windowConnects = config["windowConnects"] || ["open", "onerror"];

		for(var i = 0; i < this.windowConnects.length;i++){
			aspect.after(window, this.windowConnects[i], lang.hitch(this, "addData", this.windowConnects[i]),true);
		}

		ready(lang.hitch(this, function(){
			var data = {};
			for(var i in window){
				if(typeof window[i] == "object" || typeof window[i] == "function"){
					switch(i){
						case "location":
						case "console":
							data[i] = window[i];
							break;
						default:
							break;
					}
				}else{
					data[i] = window[i];
				}
			}
			this.addData(data);
		}));
	})());
});
