if(!dojo._hasResource["dojox.analytics.plugins.dojo"]){ //_hasResource checks added by build. Do not use _hasResource directly in your code.
dojo._hasResource["dojox.analytics.plugins.dojo"] = true;
dojo.require("dojox.analytics._base");
dojo.provide("dojox.analytics.plugins.dojo");

dojox.analytics.plugins.dojo = new (function(){
	// summary:
	//	plugin to have analyitcs return the base info dojo collects
	this.addData = dojo.hitch(dojox.analytics, "addData", "dojo");
	dojo.addOnLoad(dojo.hitch(this, function(){
		var data = {};
		for(var i in dojo){
			if ((i=="version") || ((!dojo.isObject(dojo[i]))&&(i[0]!="_"))){
				data[i]=dojo[i];
			}
		}

		if (dojo.config){data.djConfig=dojo.config}
		this.addData(data);
	}));
})();

}
