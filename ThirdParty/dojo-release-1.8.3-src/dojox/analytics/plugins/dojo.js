define(["dojo/_base/lang","../_base", "dojo/_base/config", "dojo/ready"
], function(lang, dxa, config, ready){
	var plugins = lang.getObject("dojox.analytics.plugins", true);

	return (plugins.dojo = new (function(){
		// summary:
		//		plugin to have analyitcs return the base info dojo collects
		this.addData = lang.hitch(dxa, "addData", "dojo");
		ready(lang.hitch(this, function(){
			var data = {};
			for(var i in dojo){
				if((i == "version") || ((!(typeof dojo[i] == "object" || typeof dojo[i] == "function")) && (i[0] != "_"))){
					data[i] = dojo[i];
				}
			}

			if(config){data.djConfig = config}
			this.addData(data);
		}));
	})());
});
