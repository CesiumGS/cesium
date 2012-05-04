define(["dojo/_base/lang","../_base", "dojo/_base/config", "dojo/aspect"
], function(lang, dxa, config, aspect){
	/*=====
		dxa = dojox.analytics;
		aspect = dojo.aspect;
	=====*/
	consoleMessages = lang.getObject("dojox.analytics.plugins.consoleMessages", true);

		// summary:
		//	plugin to have analyitcs return the base info dojo collects
		this.addData = lang.hitch(dxa, "addData", "consoleMessages");

		var lvls = config["consoleLogFuncs"] || ["error", "warn", "info", "rlog"];
		if(!console){
			console = {};
		}

		for(var i=0; i < lvls.length; i++){
			if(console[lvls[i]]){
				aspect.after(console, lvls[i], lang.hitch(this, "addData", lvls[i]),true);
			}else{
				console[lvls[i]] = lang.hitch(this, "addData", lvls[i]);
			}
		}
	return consoleMessages;
});
